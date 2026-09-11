"""Bounded process-local operations; HTTP disconnects do not cancel model work."""
import asyncio
import hashlib
import json
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel


class OperationError(BaseModel):
    status: int
    detail: str


class OperationStatus(BaseModel):
    id: str
    status: str
    kind: str
    revision: int
    result: dict | None = None
    error: OperationError | None = None


@dataclass
class _Operation:
    view: OperationStatus
    session_id: str
    scope: str
    fingerprint: str
    created: float
    finished: float | None = None
    keys: set[str] = field(default_factory=set)


class OperationStore:
    def __init__(self, *, ttl: float = 3600, max_records: int = 512,
                 per_session: int = 64, max_running: int = 32, timeout: float = 600):
        self.ttl, self.max_records, self.per_session = ttl, max_records, per_session
        self.max_running, self.timeout = max_running, timeout
        self._operations: dict[str, _Operation] = {}
        self._keys: dict[tuple[str, str], str] = {}
        self._tasks: set[asyncio.Task] = set()

    def _remove(self, op: _Operation):
        self._operations.pop(op.view.id, None)
        for key in op.keys:
            self._keys.pop((op.session_id, key), None)

    def _prune(self):
        now = time.monotonic()
        for op in list(self._operations.values()):
            if op.finished is not None and now - op.finished > self.ttl:
                self._remove(op)

    def get(self, session_id: str, operation_id: str) -> OperationStatus:
        self._prune()
        op = self._operations.get(operation_id)
        if not op or op.session_id != session_id:
            raise HTTPException(404, "Ajoa ei löytynyt. Istunto tai ajon säilytysaika on päättynyt.")
        return op.view.model_copy(deep=True)

    def submit(self, *, session_id: str, key: str, kind: str, scope: str, revision: int,
               payload: dict, prepare: Callable[[], Callable[[], Awaitable[dict]]]) -> OperationStatus:
        # Called on the event loop without awaits: reservation and task creation are atomic.
        self._prune()
        fingerprint = hashlib.sha256(json.dumps({"kind": kind, "payload": payload},
            sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
        existing_id = self._keys.get((session_id, key))
        if existing_id:
            existing = self._operations[existing_id]
            if existing.fingerprint != fingerprint:
                raise HTTPException(409, "Sama Idempotency-Key kuuluu eri pyyntöön.")
            return existing.view.model_copy(deep=True)
        active = next((op for op in self._operations.values()
            if op.session_id == session_id and op.scope == scope and op.view.status == "running"), None)
        if active:
            if active.fingerprint == fingerprint:
                if len(active.keys) >= 128:
                    raise HTTPException(429, "Liikaa saman ajon tunnisteita. Käytä alkuperäistä tunnistetta.")
                active.keys.add(key)
                self._keys[session_id, key] = active.view.id
                return active.view.model_copy(deep=True)
            raise HTTPException(409, "Toinen ajo on kesken. Odota nykyisen ajon valmistumista.",
                                headers={"X-Active-Operation-ID": active.view.id})
        if sum(op.view.status == "running" for op in self._operations.values()) >= self.max_running:
            raise HTTPException(503, "Palvelu on varattu. Yritä hetken kuluttua uudelleen.")
        for same_session in (True, False):
            limit = self.per_session if same_session else self.max_records
            candidates = [op for op in self._operations.values() if not same_session or op.session_id == session_id]
            if len(candidates) >= limit:
                terminal = sorted((op for op in candidates if op.finished is not None), key=lambda op: op.finished)
                if not terminal:
                    raise HTTPException(503, "Liikaa keskeneräisiä ajoja.")
                self._remove(terminal[0])
        job = prepare()  # All revision/approval validation happens after idempotency lookup.
        view = OperationStatus(id=str(uuid4()), status="running", kind=kind, revision=revision)
        op = _Operation(view, session_id, scope, fingerprint, time.monotonic(), keys={key})
        self._operations[view.id] = op
        self._keys[session_id, key] = view.id
        task = asyncio.create_task(self._run(op, job))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return view.model_copy(deep=True)

    async def _run(self, op: _Operation, job: Callable[[], Awaitable[dict]]):
        try:
            op.view.result = await asyncio.wait_for(job(), timeout=self.timeout)
            op.view.status = "succeeded"
        except HTTPException as exc:
            # Only our explicitly safe HTTP messages can become public operation errors.
            op.view.status = "failed"
            op.view.error = OperationError(status=exc.status_code, detail=str(exc.detail))
        except asyncio.TimeoutError:
            op.view.status = "failed"
            op.view.error = OperationError(status=504, detail="Ajon aikaraja ylittyi. Voit yrittää uudelleen.")
        except asyncio.CancelledError:
            op.view.status = "failed"
            op.view.error = OperationError(status=503, detail="Palvelu sulkeutui kesken ajon.")
        except Exception:
            op.view.status = "failed"
            op.view.error = OperationError(status=502, detail="Malliajo epäonnistui. Voit yrittää uudelleen.")
        finally:
            op.finished = time.monotonic()

    async def close(self):
        tasks = list(self._tasks)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        self._tasks.clear()
        self._operations.clear()
        self._keys.clear()
