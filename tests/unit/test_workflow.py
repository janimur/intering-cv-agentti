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


def test_partial_assessment_preserves_omitted_sections_and_explicitly_clears_list():
    from backend.app.sessions import SessionStore
    from backend.app.workflow import merge_assessment_update
    from src.schemas import AssessmentUpdate, MemberProfile, WorkflowState
    from tests._fixtures import sample_positioning
    session = SessionStore().create('CV')
    session.positioning = sample_positioning()
    session.workflow = WorkflowState(positioning=session.positioning, profile=MemberProfile(
        corrections=['Correct year: 2025'], exclusions=['No sales roles'], voice_examples=['I listen first.']))
    update = AssessmentUpdate.model_validate({'positioning_updates': {}, 'profile_updates': {'voice_examples': []}, 'next_question': None})
    merged = merge_assessment_update(session, update)
    assert merged.positioning == session.positioning
    assert merged.profile.corrections == ['Correct year: 2025']
    assert merged.profile.exclusions == ['No sales roles']
    assert merged.profile.voice_examples == []
    assert session.workflow.profile.voice_examples == ['I listen first.']


def test_evidence_replacement_requires_explicit_flagship_decision():
    import pytest
    from pydantic import ValidationError
    from src.schemas import AssessmentUpdate
    with pytest.raises(ValidationError):
        AssessmentUpdate.model_validate({'positioning_updates': {'evidence': {
            'supporting_results': [], 'expertise_areas': []}}, 'next_question': None})
    update = AssessmentUpdate.model_validate({'positioning_updates': {'evidence': {
        'flagship_story': None, 'supporting_results': [], 'expertise_areas': []}}, 'next_question': None})
    assert update.positioning_updates.evidence.flagship_story is None
