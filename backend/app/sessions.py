import uuid
from copy import deepcopy
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from typing import Literal

from src.schemas import (
    PositioningDocument,
    WorkflowState,
    LinkedInOutput,
    CVDocument,
    InteringOutput,
)

WriterType = Literal["linkedin", "cv", "intering"]


@dataclass
class IterationEntry:
    user_note: str
    output_json: str  # json-stringinä, ei Pydantic-objektia (yksinkertaisempi)
    timestamp: datetime


@dataclass
class Session:
    session_id: str
    created_at: datetime
    cv_text: str
    linkedin_text: str | None = None
    positioning: PositioningDocument | None = None
    workflow: WorkflowState = field(default_factory=WorkflowState)
    writer_generations: dict[str, int] = field(default_factory=dict)
    linkedin_output: LinkedInOutput | None = None
    cv_output: CVDocument | None = None
    intering_output: InteringOutput | None = None
    iteration_history: dict[WriterType, list[IterationEntry]] = field(
        default_factory=lambda: {"linkedin": [], "cv": [], "intering": []}
    )


class SessionStore:
    """In-memory sessiovarasto. Ei TTL:ää eikä siivousta vaiheessa 2.1."""

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = Lock()

    def create(self, cv_text: str, linkedin_text: str | None = None) -> Session:
        sid = str(uuid.uuid4())
        session = Session(
            session_id=sid,
            created_at=datetime.utcnow(),
            cv_text=cv_text,
            linkedin_text=linkedin_text,
        )
        with self._lock:
            self._sessions[sid] = session
        return deepcopy(session)

    def get(self, session_id: str) -> Session:
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Session not found")
        return deepcopy(session)

    def update(self, session_id: str, revision: int, change: Callable[[Session], None]) -> Session:
        """Apply one mutation atomically; failed callbacks cannot partially update state."""
        from fastapi import HTTPException
        with self._lock:
            current = self._sessions.get(session_id)
            if current is None:
                raise HTTPException(404, "Session not found")
            if current.workflow.revision != revision:
                raise HTTPException(409, "Tiedot ovat muuttuneet. Päivitä kartoitus ja yritä uudelleen.")
            updated = deepcopy(current)
            change(updated)
            self._sessions[session_id] = updated
            return deepcopy(updated)

    def all_ids(self) -> list[str]:
        with self._lock:
            return list(self._sessions.keys())
