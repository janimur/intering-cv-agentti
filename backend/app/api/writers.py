import asyncio
from anthropic import APIError
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import Field, ValidationError

from backend.app.dependencies import get_session_store
from backend.app.metrics import measure
from backend.app.sessions import IterationEntry, SessionStore, WriterType
from backend.app.workflow import approved_context, expect_revision, require_approved
from src.kirjoittajat import (_run_writer_with_history, run_cv_writer, run_intering_writer,
                             run_linkedin_writer, _WRITER_CONFIG)
from src.prompts import compose_prompt, prompt_checksum
from src.schemas import RevisionRequest

router = APIRouter()
MAX_ITERATIONS = 3


def _get_runner(writer_type: WriterType):
    return {"linkedin": run_linkedin_writer, "cv": run_cv_writer, "intering": run_intering_writer}[writer_type]


class IterateRequest(RevisionRequest):
    note: str = Field(min_length=1, max_length=10000)
    target_field: str | None = None


def _save_output(store, session, writer_type, output, checksum, note=None):
    def change(current):
        require_approved(current)
        if current.writer_generations.get(writer_type, 0) != session.writer_generations.get(writer_type, 0):
            raise HTTPException(409, "Tuotos muuttui ajon aikana. Yritä uudelleen nykyisestä versiosta.")
        setattr(current, f"{writer_type}_output", output)
        current.writer_generations[writer_type] = current.writer_generations.get(writer_type, 0) + 1
        current.workflow.output_revisions[writer_type] = current.workflow.revision
        current.workflow.prompt_checksums[writer_type] = checksum
        if note is None:
            current.iteration_history[writer_type] = []
        else:
            current.iteration_history[writer_type].append(IterationEntry(
                user_note=note, output_json=output.model_dump_json(), timestamp=datetime.utcnow()))
            current.iteration_history[writer_type] = current.iteration_history[writer_type][-MAX_ITERATIONS:]
    store.update(session.session_id, session.workflow.revision, change)
    return {**output.model_dump(), "source_revision": session.workflow.revision}


@router.post("/api/writers/{writer_type}")
async def run_writer(writer_type: WriterType, payload: RevisionRequest,
                     x_session_id: str = Header(..., alias="X-Session-ID"),
                     store: SessionStore = Depends(get_session_store)) -> dict:
    session = store.get(x_session_id)
    expect_revision(session, payload.revision)
    context = approved_context(session)
    prompt = compose_prompt(_WRITER_CONFIG[writer_type]["prompt_file"])
    try:
        with measure(writer_type):
            output = await asyncio.to_thread(_get_runner(writer_type), session.positioning,
                session.cv_text, session.linkedin_text, approved_context=context, system_prompt=prompt)
            output = _WRITER_CONFIG[writer_type]["schema"].model_validate(output)
    except (APIError, RuntimeError, ValidationError) as exc:
        raise HTTPException(502, "Kirjoittajan vastaus oli virheellinen. Yritä uudelleen.") from exc
    return _save_output(store, session, writer_type, output, prompt_checksum(prompt))


@router.post("/api/writers/{writer_type}/iterate")
async def iterate_writer(writer_type: WriterType, payload: IterateRequest,
                         x_session_id: str = Header(..., alias="X-Session-ID"),
                         store: SessionStore = Depends(get_session_store)) -> dict:
    session = store.get(x_session_id)
    expect_revision(session, payload.revision)
    context = approved_context(session)
    current_output = getattr(session, f"{writer_type}_output")
    if current_output is None:
        raise HTTPException(409, f"Run /api/writers/{writer_type} first")
    if session.workflow.output_revisions.get(writer_type) != session.workflow.revision:
        raise HTTPException(409, "Tuotos on vanhentunut. Aja kirjoittaja uudelleen.")
    history = [(entry.user_note, entry.output_json) for entry in session.iteration_history[writer_type]]
    prompt = compose_prompt(_WRITER_CONFIG[writer_type]["prompt_file"])
    note = f"Kohdekenttä: {payload.target_field}\n{payload.note}" if payload.target_field else payload.note
    try:
        with measure(f"{writer_type}_iterate"):
            output = await asyncio.to_thread(_run_writer_with_history, writer_type, session.positioning,
                session.cv_text, session.linkedin_text, history, note, approved_context=context,
                current_output=current_output.model_dump_json(), system_prompt=prompt)
            output = _WRITER_CONFIG[writer_type]["schema"].model_validate(output)
    except (APIError, RuntimeError, ValidationError) as exc:
        raise HTTPException(502, "Kirjoittajan vastaus oli virheellinen. Yritä uudelleen.") from exc
    return _save_output(store, session, writer_type, output, prompt_checksum(prompt), note)
