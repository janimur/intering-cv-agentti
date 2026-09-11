import json
from anthropic import Anthropic

from src.model_calls import validated_call
from src.prompts import compose_prompt
from src.schemas import Assessment, AssessmentUpdate, WorkflowState, PositioningDocument, to_tool_input_schema


def run_initial_assessment(cv_text: str, linkedin_text: str | None = None,
                           system_prompt: str | None = None,
                           baseline_text: str | None = None) -> Assessment:
    """Analyze once, returning positioning, profile, and the first useful question."""
    return validated_call(
        Anthropic(max_retries=0, timeout=280), role="initial_assessment", schema=Assessment,
        tool_name="save_assessment", retry_max_tokens=16000,
        model="claude-opus-4-7", max_tokens=8000,
        thinking={"type": "adaptive"}, output_config={"effort": "high"},
        system=system_prompt or compose_prompt("kartoittaja_system"),
        messages=[{"role": "user", "content": json.dumps({
            "cv": cv_text, "linkedin": linkedin_text, "baseline": baseline_text,
            "task": "Analysoi aineisto ja palauta koko Assessment sekä ensimmäinen tarpeellinen tarkennuskysymys.",
        }, ensure_ascii=False)}],
        tools=[{"name": "save_assessment", "description": "Tallenna alkuanalyysi, profiili ja seuraava kysymys.",
                "input_schema": to_tool_input_schema(Assessment)}],
        tool_choice={"type": "auto"},
    )


def run_kartoittaja(cv_text: str, linkedin_text: str | None = None,
                    baseline_text: str | None = None,
                    system_prompt: str | None = None) -> PositioningDocument:
    """Compatibility entrypoint for the standalone evaluation script."""
    return run_initial_assessment(cv_text, linkedin_text, system_prompt, baseline_text).positioning


def run_clarification(cv_text: str, linkedin_text: str | None, state: WorkflowState,
                      system_prompt: str | None = None) -> AssessmentUpdate:
    """Return only changed typed sections/profile fields, never rewrite the whole assessment."""
    return validated_call(
        Anthropic(max_retries=0, timeout=280), role="clarification", schema=AssessmentUpdate,
        tool_name="save_assessment_update", retry_max_tokens=8000,
        model="claude-opus-4-7", max_tokens=4000,
        system=system_prompt or compose_prompt("kartoittaja_system"),
        messages=[{"role": "user", "content": json.dumps({
            "cv": cv_text, "linkedin": linkedin_text, "kartoitus": state.model_dump(),
            "task": "Palauta vain viimeisen vastauksen muuttamat osiot/kentät ja seuraava tarpeellinen kysymys. Muut tiedot säilytetään backendissä.",
        }, ensure_ascii=False)}],
        tools=[{"name": "save_assessment_update", "description": "Muuttuneet osiot ja profiilikentät sekä seuraava kysymys.",
                "input_schema": to_tool_input_schema(AssessmentUpdate)}],
        tool_choice={"type": "tool", "name": "save_assessment_update"},
    )
