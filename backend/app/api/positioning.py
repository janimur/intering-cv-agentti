import asyncio

from fastapi import APIRouter, Depends, Header, HTTPException

from backend.app.dependencies import get_session_store
from backend.app.metrics import measure
from backend.app.sessions import SessionStore
from src.kartoittaja import run_kartoittaja
from src.schemas import PositioningDocument

router = APIRouter()


@router.post("/api/positioning", response_model=PositioningDocument)
async def run_positioning(
    x_session_id: str = Header(..., alias="X-Session-ID"),
    store: SessionStore = Depends(get_session_store),
) -> PositioningDocument:
    """Ajaa kartoittajan sessiossa olevalle CV-tekstille."""
    session = store.get(x_session_id)
    with measure("kartoittaja"):
        positioning = await asyncio.to_thread(
            run_kartoittaja,
            cv_text=session.cv_text,
            linkedin_text=session.linkedin_text,
        )
    session.positioning = positioning
    return positioning


@router.patch("/api/positioning", response_model=PositioningDocument)
async def update_positioning(
    payload: PositioningDocument,
    x_session_id: str = Header(..., alias="X-Session-ID"),
    store: SessionStore = Depends(get_session_store),
) -> PositioningDocument:
    """Päivittää session positiointidokumentin käsin (käyttäjän muokkaus)."""
    session = store.get(x_session_id)
    if session.positioning is None:
        raise HTTPException(409, "Positioning has not been generated yet")
    session.positioning = payload
    return payload
