from unittest.mock import patch

import pytest

from src.schemas import Assessment, AssessmentUpdate, MemberProfile, QuestionProposal
from tests._fixtures import sample_positioning


def assessment(topic=None, profile=None):
    return AssessmentUpdate(profile_updates=(profile or MemberProfile()).model_dump(),
                      next_question=QuestionProposal(topic=topic, text="Miten toimit?") if topic else None)


def start(client, sid, topic="voice"):
    with patch("backend.app.api.positioning.run_initial_assessment", return_value=Assessment(
            positioning=sample_positioning(), profile=MemberProfile(), next_question=assessment(topic).next_question)):
        response = client.post("/api/positioning", json={"revision": 0}, headers={"X-Session-ID": sid})
    assert response.status_code == 200
    return response.json()


def test_positioning_requires_session_and_revision(client):
    assert client.post("/api/positioning").status_code == 422
    assert client.post("/api/positioning", json={"revision": 0}, headers={"X-Session-ID": "missing"}).status_code == 404


def test_initial_analysis_then_one_question(client, session_with_upload):
    headers = {"X-Session-ID": session_with_upload}
    assert client.get("/api/positioning", headers=headers).json()["status"] == "uploaded"
    state = start(client, session_with_upload)
    assert state["status"] == "clarifying"
    assert state["revision"] == 1
    assert state["positioning"]["positioning"]["primary_angle"] == "Testaaja"
    assert state["current_question"]["id"]
    assert len(state["prompt_checksums"]["kartoitus"]) == 64
    assert client.post("/api/positioning/approve", headers=headers, json={"revision": 1}).status_code == 409
    assert client.post("/api/writers/cv", headers=headers, json={"revision": 1}).status_code == 409


@pytest.mark.parametrize("disposition", ["answered", "skipped", "confidential"])
def test_answers_and_skips_update_context(client, session_with_upload, disposition):
    state = start(client, session_with_upload)
    with patch("backend.app.api.positioning.run_clarification", return_value=assessment()) as run:
        response = client.post("/api/positioning/answers", headers={"X-Session-ID": session_with_upload}, json={
            "revision": 1, "question_id": state["current_question"]["id"], "text": "Otan ihmiset mukaan", "disposition": disposition})
    assert response.status_code == 200
    answer = run.call_args.args[2].answers[0]
    assert answer.text == ("Otan ihmiset mukaan" if disposition == "answered" else "")
    assert response.json()["status"] == "review"
    assert response.json()["answers"][0]["disposition"] == disposition


def test_finish_approve_edit_invalidates(client, session_with_upload):
    sid = session_with_upload
    headers = {"X-Session-ID": sid}
    state = start(client, sid)
    state = client.post("/api/positioning/finish", headers=headers, json={"revision": 1}).json()
    state = client.post("/api/positioning/approve", headers=headers, json={"revision": state["revision"]}).json()
    assert state["approved_revision"] == state["revision"]
    state["positioning"]["positioning"]["primary_angle"] = "Korjattu kulma"
    response = client.patch("/api/positioning", headers=headers, json={"revision": state["revision"],
        "positioning": state["positioning"], "profile": {"corrections": ["Vuosi oli 2025"]}})
    assert response.status_code == 200
    updated = response.json()
    assert updated["status"] == "review" and updated["approved_revision"] is None
    assert client.get("/api/positioning", headers=headers).json() == updated
    assert client.post("/api/writers/cv", headers=headers, json={"revision": updated["revision"]}).status_code == 409


def test_stale_revision_and_question_rejected(client, session_with_upload):
    state = start(client, session_with_upload)
    headers = {"X-Session-ID": session_with_upload}
    assert client.post("/api/positioning/finish", headers=headers, json={"revision": 0}).status_code == 409
    assert client.post("/api/positioning/answers", headers=headers, json={"revision": 1, "question_id": "old", "text": "a"}).status_code == 409
    assert client.post("/api/positioning/answers", headers=headers, json={"revision": 1, "question_id": state["current_question"]["id"], "text": " "}).status_code == 422


def test_invalid_model_output_leaves_state_unchanged(client, session_with_upload):
    state = start(client, session_with_upload)
    headers = {"X-Session-ID": session_with_upload}
    with patch("backend.app.api.positioning.run_clarification", return_value={}):
        response = client.post("/api/positioning/answers", headers=headers, json={"revision": 1,
            "question_id": state["current_question"]["id"], "text": "Aito vastaus"})
    assert response.status_code == 502
    assert client.get("/api/positioning", headers=headers).json() == state


def test_late_model_response_cannot_overwrite_finish(client, session_with_upload):
    state = start(client, session_with_upload)
    from backend.app.workflow import finish
    def late(*args):
        client.app.state.session_store.update(session_with_upload, 1, finish)
        return assessment("goals")
    with patch("backend.app.api.positioning.run_clarification", side_effect=late):
        response = client.post("/api/positioning/answers", headers={"X-Session-ID": session_with_upload}, json={
            "revision": 1, "question_id": state["current_question"]["id"], "text": "Aito vastaus"})
    assert response.status_code == 409
    assert client.app.state.session_store.get(session_with_upload).workflow.status == "review"


def test_repeated_topic_does_not_reask(client, session_with_upload):
    state = start(client, session_with_upload)
    next_question = assessment("goals")
    next_question.next_question.text = "Mihin toimeksiantoon haluat?"
    with patch("backend.app.api.positioning.run_clarification", side_effect=[assessment("voice"), next_question]) as run:
        response = client.post("/api/positioning/answers", headers={"X-Session-ID": session_with_upload}, json={
            "revision": 1, "question_id": state["current_question"]["id"], "disposition": "skipped"})
    assert response.status_code == 200
    assert response.json()["current_question"]["topic"] == "goals"
    assert run.call_count == 2


def test_meaningful_followup_in_same_topic_is_allowed(client, session_with_upload):
    state = start(client, session_with_upload, "evidence")
    followup = assessment("evidence")
    followup.next_question.text = "Mikä konkreettinen tulos syntyi?"
    with patch("backend.app.api.positioning.run_clarification", return_value=followup) as run:
        response = client.post("/api/positioning/answers", headers={"X-Session-ID": session_with_upload}, json={
            "revision": 1, "question_id": state["current_question"]["id"], "text": "Johdin hankkeen"})
    assert response.status_code == 200
    assert response.json()["current_question"]["topic"] == "evidence"
    assert run.call_count == 1


@pytest.mark.parametrize("corrected", [True, False])
def test_exact_repeat_uses_corrective_call_or_preserves_state(client, session_with_upload, corrected):
    state = start(client, session_with_upload)
    repeated = assessment("voice")
    repeated.next_question.text = "  MITEN   TOIMIT?  "
    next_result = assessment("goals") if corrected else repeated
    if corrected:
        next_result.next_question.text = "Mihin toimeksiantoon haluat?"
    headers = {"X-Session-ID": session_with_upload}
    with patch("backend.app.api.positioning.run_clarification", side_effect=[repeated, next_result]) as run:
        response = client.post("/api/positioning/answers", headers=headers, json={
            "revision": 1, "question_id": state["current_question"]["id"], "text": "Kuuntelen ensin"})
    assert run.call_count == 2
    if corrected:
        assert response.status_code == 200
        assert response.json()["current_question"]["topic"] == "goals"
    else:
        assert response.status_code == 502
        assert client.get("/api/positioning", headers=headers).json() == state


@pytest.mark.parametrize("disposition", ["skipped", "confidential"])
def test_closed_topic_rejects_different_followup(client, session_with_upload, disposition):
    state = start(client, session_with_upload, "evidence")
    followup = assessment("evidence")
    followup.next_question.text = "Mikä oli tulos?"
    headers = {"X-Session-ID": session_with_upload}
    with patch("backend.app.api.positioning.run_clarification", return_value=followup) as run:
        response = client.post("/api/positioning/answers", headers=headers, json={
            "revision": 1, "question_id": state["current_question"]["id"], "disposition": disposition})
    assert response.status_code == 502 and run.call_count == 2
    assert client.get("/api/positioning", headers=headers).json() == state
