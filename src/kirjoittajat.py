from pathlib import Path
from typing import Any, Literal
from anthropic import Anthropic
from pydantic import BaseModel

from src.schemas import (
    PositioningDocument,
    LinkedInOutput,
    CVDocument,
    InteringOutput,
    to_tool_input_schema,
)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

WriterType = Literal["linkedin", "cv", "intering"]

_WRITER_CONFIG = {
    "linkedin": {
        "prompt_file": "kirjoittaja_linkedin_system.md",
        "model": "claude-opus-4-7",
        "tool_name": "save_linkedin_output",
        "tool_description": "Tallenna LinkedIn-profiilitekstit strukturoituna JSON:na",
        "schema": LinkedInOutput,
    },
    "cv": {
        "prompt_file": "kirjoittaja_cv_system.md",
        "model": "claude-opus-4-7",
        "tool_name": "save_cv_document",
        "tool_description": "Tallenna CV strukturoituna JSON:na",
        "schema": CVDocument,
    },
    "intering": {
        "prompt_file": "kirjoittaja_intering_system.md",
        "model": "claude-opus-4-7",
        "tool_name": "save_intering_output",
        "tool_description": "Tallenna intering.fi-profiilitekstit strukturoituna JSON:na",
        "schema": InteringOutput,
    },
}


def _run_writer(
    writer_type: WriterType,
    positioning: PositioningDocument,
    cv_text: str,
) -> BaseModel:
    """Yhteinen ajologiikka kaikille kolmelle kirjoittajalle."""
    config = _WRITER_CONFIG[writer_type]
    client = Anthropic()
    system_prompt = (PROMPTS_DIR / config["prompt_file"]).read_text(encoding="utf-8")
    schema_cls: type[BaseModel] = config["schema"]

    user_content = (
        "## Positiointidokumentti\n\n"
        f"{positioning.model_dump_json(indent=2)}\n\n"
        "## CV-teksti\n\n"
        f"{cv_text}"
    )

    # Opus 4.7 käyttää adaptive thinkingiä eikä hyväksy temperature-parametria
    create_kwargs: dict[str, Any] = {
        "model": config["model"],
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_content}],
        "tools": [
            {
                "name": config["tool_name"],
                "description": config["tool_description"],
                "input_schema": to_tool_input_schema(schema_cls),
            }
        ],
        "tool_choice": {"type": "any"},
    }
    if config["model"] != "claude-opus-4-7":
        create_kwargs["temperature"] = 0.7

    response = client.messages.create(**create_kwargs)

    if response.stop_reason != "tool_use":
        raise RuntimeError(
            f"Kirjoittaja '{writer_type}' ei kutsunut työkalua. "
            f"stop_reason={response.stop_reason}, content={response.content}"
        )

    tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
    if not tool_use_blocks:
        raise RuntimeError(f"Kirjoittajan '{writer_type}' vastauksesta puuttuu tool_use-blokki")

    return schema_cls.model_validate(tool_use_blocks[0].input)


def run_linkedin_writer(positioning: PositioningDocument, cv_text: str) -> LinkedInOutput:
    return _run_writer("linkedin", positioning, cv_text)  # type: ignore[return-value]


def run_cv_writer(positioning: PositioningDocument, cv_text: str) -> CVDocument:
    return _run_writer("cv", positioning, cv_text)  # type: ignore[return-value]


def run_intering_writer(positioning: PositioningDocument, cv_text: str) -> InteringOutput:
    return _run_writer("intering", positioning, cv_text)  # type: ignore[return-value]
