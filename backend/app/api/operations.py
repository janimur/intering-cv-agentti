from fastapi import APIRouter, Depends, Header

from backend.app.dependencies import get_operation_store, get_session_store
from backend.app.operations import OperationStatus, OperationStore
from backend.app.sessions import SessionStore

router = APIRouter()


@router.get("/api/operations/{operation_id}", response_model=OperationStatus)
async def get_operation(operation_id: str,
                        x_session_id: str = Header(..., alias="X-Session-ID"),
                        store: SessionStore = Depends(get_session_store),
                        operations: OperationStore = Depends(get_operation_store)):
    store.get(x_session_id)
    return operations.get(x_session_id, operation_id)
