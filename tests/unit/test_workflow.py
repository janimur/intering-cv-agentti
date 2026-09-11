import pytest
from fastapi import HTTPException

from backend.app.sessions import SessionStore
from backend.app.workflow import apply_assessment, approve, finish
from src.schemas import Assessment, MemberProfile
from tests._fixtures import sample_positioning


def test_snapshot_and_failed_mutation_are_isolated():
    store = SessionStore()
    sid = store.create("CV").session_id
    snapshot = store.get(sid)
    snapshot.cv_text = "Changed outside store"
    assert store.get(sid).cv_text == "CV"
    def fail(session):
        session.cv_text = "partially changed"
        raise ValueError("abort")
    with pytest.raises(ValueError):
        store.update(sid, 0, fail)
    assert store.get(sid).cv_text == "CV"


def test_mutations_use_compare_and_swap():
    store = SessionStore()
    sid = store.create("CV").session_id
    result = Assessment(positioning=sample_positioning(), profile=MemberProfile(), next_question=None)
    store.update(sid, 0, lambda s: apply_assessment(s, result, "hash"))
    with pytest.raises(HTTPException) as err:
        store.update(sid, 0, finish)
    assert err.value.status_code == 409
    state = store.update(sid, 1, approve).workflow
    assert state.status == "approved" and state.approved_revision == 2
