import os
from pathlib import Path
from anthropic import Anthropic
from src.schemas import PositioningDocument, to_tool_input_schema

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "kartoittaja_system.md"


def run_kartoittaja(baseline_text: str, cv_text: str) -> PositioningDocument:
    """
    Ajaa kartoittaja-agentin Claude Opus 4.7:llä adaptive thinking päällä.
    Palauttaa validoidun PositioningDocument-objektin.

    Huomio: Opus 4.7 käyttää adaptive thinkingiä ja output_config.effort -kontrollia.
    Temperature=1 koska thinking vaatii sen.
    """
    client = Anthropic()
    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")

    user_content = (
        f"## Henkilön perustiedot\n\n{baseline_text}\n\n"
        f"## CV-teksti\n\n{cv_text}"
    )

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
