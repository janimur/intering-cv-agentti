import json
from anthropic import Anthropic
from src.prompts import compose_prompt
from src.schemas import Assessment, WorkflowState, PositioningDocument, to_tool_input_schema


def run_kartoittaja(
    cv_text: str,
    linkedin_text: str | None = None,
    baseline_text: str | None = None,
    system_prompt: str | None = None,
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
    system_prompt = system_prompt or compose_prompt("kartoittaja_system")

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
            "Tarkista mallin vastaussopimus."
        )

    tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
    if not tool_use_blocks:
        raise RuntimeError("Vastauksesta ei löytynyt tool_use-blokkia")

    raw_dict = tool_use_blocks[0].input
    return PositioningDocument.model_validate(raw_dict)


def run_clarification(cv_text: str, linkedin_text: str | None, state: WorkflowState,
                      system_prompt: str | None = None) -> Assessment:
    """Update the proposed profile and choose at most one unanswered topic."""
    response = Anthropic().messages.create(
        model="claude-opus-4-7", max_tokens=8000,
        system=system_prompt or compose_prompt("kartoittaja_system"),
        messages=[{"role": "user", "content": json.dumps({
            "cv": cv_text, "linkedin": linkedin_text,
            "kartoitus": state.model_dump(),
        }, ensure_ascii=False)}],
        tools=[{"name": "save_assessment", "description": "Päivitä kartoitus ja seuraava tarpeellinen kysymys tai null.",
                "input_schema": to_tool_input_schema(Assessment)}],
        tool_choice={"type": "tool", "name": "save_assessment"},
    )
    blocks = [b for b in response.content if b.type == "tool_use" and b.name == "save_assessment"]
    if response.stop_reason != "tool_use" or len(blocks) != 1:
        raise RuntimeError("Kartoituksen vastaus ei vastannut työkalusopimusta")
    return Assessment.model_validate(blocks[0].input)
