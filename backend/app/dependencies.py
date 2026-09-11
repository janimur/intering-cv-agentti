from fastapi import Request
from backend.app.sessions import SessionStore


def get_session_store(request: Request) -> SessionStore:
    """Palauttaa app.state:sta sessiovaraston — käytetään Depends-injektointiin."""
    return request.app.state.session_store


def get_operation_store(request: Request):
    return request.app.state.operation_store
