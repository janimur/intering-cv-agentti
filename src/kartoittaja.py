import os
from anthropic import Anthropic
from src.prompts import load_prompt
from src.schemas import PositioningDocument, to_tool_input_schema


def run_kartoittaja(
    cv_text: str,
    linkedin_text: str | None = None,
    baseline_text: str | None = None,
) -> PositioningDocument:
    """
    Ajaa kartoittaja-agentin Claude Opus 4.7:llä adaptive thinking päällä.
    Palauttaa validoidun PositioningDocument-objektin.

    Tuotannossa input on cv_text + (mahdollisesti) linkedin_text.
    baseline_text on testikäyttöä varten, jossa lisämateriaali on käsin koottua.
    Jos lähteet ovat ristiriidassa, prompti ohjaa luottamaan CV:hen.

    Huomio: Opus 4.7 käyttää adaptive thinkingiä ja output_config.effort -kontrollia.
    Temperature=1 koska thinking vaatii sen.
    """
    client = Anthropic()
    system_prompt = load_prompt("kartoittaja_system")

    sections = [f"## CV-teksti\n\n{cv_text}"]
    if linkedin_text:
        sections.append(f"## LinkedIn-profiilin teksti (nykyinen)\n\n{linkedin_text}")
    if baseline_text:
        sections.append(f"## Lisämateriaali (perustiedot)\n\n{baseline_text}")
    user_content = "\n\n".join(sections)

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=8000,
        temperature=1,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        system=system_prompt,
        messages=[{"role": "user", "content": user_content}],
        tools=[
            {
                "name": "save_positioning_document",
                "description": "Tallenna positiointidokumentti strukturoituna JSON:na",
                "input_schema": to_tool_input_schema(PositioningDocument),
            }
        ],
        tool_choice={"type": "auto"},
    )

    if response.stop_reason != "tool_use":
        raise RuntimeError(
            f"Kartoittaja ei kutsunut työkalua. stop_reason={response.stop_reason}, "
            f"content={response.content}"
        )

    tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
    if not tool_use_blocks:
        raise RuntimeError("Vastauksesta ei löytynyt tool_use-blokkia")

    raw_dict = tool_use_blocks[0].input
    return PositioningDocument.model_validate(raw_dict)
