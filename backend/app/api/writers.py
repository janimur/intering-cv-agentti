import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from backend.app.dependencies import get_session_store
from backend.app.metrics import measure
from backend.app.sessions import IterationEntry, SessionStore, WriterType
from src.kirjoittajat import (
    _run_writer_with_history,
    run_cv_writer,
    run_intering_writer,
    run_linkedin_writer,
)

router = APIRouter()

# Sliding window: maksimi iteraatioita per writer
MAX_ITERATIONS = 3

_RUNNERS = {
    "linkedin": run_linkedin_writer,
    "cv": run_cv_writer,
    "intering": run_intering_writer,
}


class IterateRequest(BaseModel):
    note: str
    target_field: str | None = None


@router.post("/api/writers/{writer_type}")
async def run_writer(
    writer_type: WriterType,
    x_session_id: str = Header(..., alias="X-Session-ID"),
    store: SessionStore = Depends(get_session_store),
) -> dict:
    """Ajaa kirjoittajan sessiossa olevalle datalle."""
    session = store.get(x_session_id)
    if session.positioning is None:
        raise HTTPException(409, "Run /api/positioning first")

    runner = _RUNNERS[writer_type]
    with measure(writer_type):
        output = await asyncio.to_thread(
            runner,
            session.positioning,
            session.cv_text,
            session.linkedin_text,
        )

    setattr(session, f"{writer_type}_output", output)
    # Nollaa iteraatiohistoria kun kirjoittaja ajetaan uudelleen
    session.iteration_history[writer_type] = []

    return output.model_dump()


@router.post("/api/writers/{writer_type}/iterate")
async def iterate_writer(
    writer_type: WriterType,
    payload: IterateRequest,
    x_session_id: str = Header(..., alias="X-Session-ID"),
    store: SessionStore = Depends(get_session_store),
) -> dict:
    """
    Iteroi kirjoittajaa käyttäjän ohjeen perusteella.
    Sliding window: max 3 iteraatiota historiaa, vanhin poistetaan ennen 4:ttä.
    """
    session = store.get(x_session_id)
    if session.positioning is None:
        raise HTTPException(409, "Run /api/positioning first")

    current_output = getattr(session, f"{writer_type}_output")
    if current_output is None:
        raise HTTPException(409, f"Run /api/writers/{writer_type} first")

    history_entries = session.iteration_history[writer_type]

    # Rakenna historia (user_note, output_json)-pareina
    history_pairs: list[tuple[str, str]] = [
        (entry.user_note, entry.output_json)
        for entry in history_entries
    ]

    with measure(f"{writer_type}_iterate"):
        output = await asyncio.to_thread(
            _run_writer_with_history,
            writer_type,
            session.positioning,
            session.cv_text,
            session.linkedin_text,
            history_pairs,
            payload.note,
        )

    # Tallenna tämä iteraatio historiaan
    new_entry = IterationEntry(
        user_note=payload.note,
        output_json=output.model_dump_json(),
        timestamp=datetime.utcnow(),
    )
    history_entries.append(new_entry)

    # Sliding window: pidä vain max 3 viimeisintä
    if len(history_entries) > MAX_ITERATIONS:
        session.iteration_history[writer_type] = history_entries[-MAX_ITERATIONS:]

    # Päivitä session output uusimmaksi
    setattr(session, f"{writer_type}_output", output)

    return output.model_dump()
