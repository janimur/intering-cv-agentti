"""
API-testit POST /api/writers/* -endpointeille.
"""
import pytest
from unittest.mock import patch

from tests._fixtures import sample_linkedin, sample_cv, sample_intering, sample_positioning


def test_linkedin_writer_without_positioning_returns_409(client, session_with_upload):
    """POST /api/writers/linkedin ilman positioningia → 409."""
    response = client.post(
        "/api/writers/linkedin",
        json={"revision": 0},
        headers={"X-Session-ID": session_with_upload},
    )
    assert response.status_code == 409


def test_linkedin_writer_returns_200_with_output(client, session_with_positioning):
    """POST /api/writers/linkedin mockatulla writerillä → 200 + LinkedInOutput."""
    with patch("backend.app.api.writers.run_linkedin_writer", return_value=sample_linkedin()):
        response = client.post(
            "/api/writers/linkedin",
            json={"revision": 2},
            headers={"X-Session-ID": session_with_positioning},
        )
    assert response.status_code == 200
    data = response.json()
    assert "headline" in data
    assert "about" in data
    assert "experience" in data


def test_cv_writer_returns_200_with_output(client, session_with_positioning):
    """POST /api/writers/cv mockatulla writerillä → 200 + CVDocument."""
    with patch("backend.app.api.writers.run_cv_writer", return_value=sample_cv()):
        response = client.post(
            "/api/writers/cv",
            json={"revision": 2},
            headers={"X-Session-ID": session_with_positioning},
        )
    assert response.status_code == 200
    data = response.json()
    assert "header" in data
    assert "experience" in data
    assert "key_results" in data


def test_intering_writer_returns_200_with_output(client, session_with_positioning):
    """POST /api/writers/intering mockatulla writerillä → 200 + InteringOutput."""
    with patch("backend.app.api.writers.run_intering_writer", return_value=sample_intering()):
        response = client.post(
            "/api/writers/intering",
            json={"revision": 2},
            headers={"X-Session-ID": session_with_positioning},
        )
    assert response.status_code == 200
    data = response.json()
    assert "hook" in data
    assert "product_cards" in data
    assert "profile_sections" in data


def test_invalid_writer_type_returns_422(client, session_with_positioning):
    """POST /api/writers/invalid → 422 (WriterType validointi)."""
    response = client.post(
        "/api/writers/invalid",
        json={"revision": 2},
        headers={"X-Session-ID": session_with_positioning},
    )
    assert response.status_code == 422


def test_iterate_without_positioning_returns_409(client, session_with_upload):
    """POST /api/writers/linkedin/iterate ilman positioningia → 409."""
    response = client.post(
        "/api/writers/linkedin/iterate",
        json={"revision": 0, "note": "Tee parempi"},
        headers={"X-Session-ID": session_with_upload},
    )
    assert response.status_code == 409


def test_iterate_without_prior_writer_run_returns_409(client, session_with_positioning):
    """POST /api/writers/linkedin/iterate ilman aiempaa kirjoittaja-ajoa → 409."""
    response = client.post(
        "/api/writers/linkedin/iterate",
        json={"revision": 2, "note": "Tee parempi"},
        headers={"X-Session-ID": session_with_positioning},
    )
    assert response.status_code == 409


def test_iterate_returns_200_with_updated_output(client, session_with_positioning):
    """POST /api/writers/linkedin/iterate mockatulla writerillä → 200."""
    # Aja ensin perus-kirjoittaja
    with patch("backend.app.api.writers.run_linkedin_writer", return_value=sample_linkedin()):
        client.post(
            "/api/writers/linkedin",
            json={"revision": 2},
            headers={"X-Session-ID": session_with_positioning},
        )
    # Sitten iteroi
    updated_linkedin = sample_linkedin()
    updated_linkedin.headline = "Päivitetty headline"
    with patch("backend.app.api.writers._run_writer_with_history", return_value=updated_linkedin):
        response = client.post(
            "/api/writers/linkedin/iterate",
            json={"revision": 2, "note": "Tee tiivistetympi"},
            headers={"X-Session-ID": session_with_positioning},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["headline"] == "Päivitetty headline"


def test_iterate_adds_entry_to_history(client, session_with_positioning):
    """iterate() lisää yhden merkinnän iteration_history:hin."""
    # Aja perus-kirjoittaja
    with patch("backend.app.api.writers.run_linkedin_writer", return_value=sample_linkedin()):
        client.post(
            "/api/writers/linkedin",
            json={"revision": 2},
            headers={"X-Session-ID": session_with_positioning},
        )
    # Ensimmäinen iteraatio
    with patch("backend.app.api.writers._run_writer_with_history", return_value=sample_linkedin()):
        client.post(
            "/api/writers/linkedin/iterate",
            json={"revision": 2, "note": "Iteraatio 1"},
            headers={"X-Session-ID": session_with_positioning},
        )

    # Tarkista session sisäisesti — hae session storesta
    store = client.app.state.session_store
    session = store.get(session_with_positioning)
    assert len(session.iteration_history["linkedin"]) == 1
    assert session.iteration_history["linkedin"][0].user_note == "Iteraatio 1"


def test_iterate_sliding_window_max_3(client, session_with_positioning):
    """4 iteraatiota → history-pituus pysyy <=3 (sliding window)."""
    # Aja perus-kirjoittaja
    with patch("backend.app.api.writers.run_linkedin_writer", return_value=sample_linkedin()):
        client.post(
            "/api/writers/linkedin",
            json={"revision": 2},
            headers={"X-Session-ID": session_with_positioning},
        )
    # Aja 4 iteraatiota
    for i in range(4):
        with patch("backend.app.api.writers._run_writer_with_history", return_value=sample_linkedin()):
            response = client.post(
                "/api/writers/linkedin/iterate",
                json={"revision": 2, "note": f"Iteraatio {i + 1}"},
                headers={"X-Session-ID": session_with_positioning},
            )
        assert response.status_code == 200

    # Tarkista sliding window
    store = client.app.state.session_store
    session = store.get(session_with_positioning)
    assert len(session.iteration_history["linkedin"]) <= 3


@pytest.mark.parametrize("writer,factory", [("linkedin", sample_linkedin), ("cv", sample_cv), ("intering", sample_intering)])
def test_all_writers_receive_profile_and_return_revision(client, session_with_positioning, writer, factory):
    from src.schemas import ClarificationAnswer
    sid = session_with_positioning
    store = client.app.state.session_store
    def enrich(s):
        s.workflow.profile.voice_examples = ["Käärin hihat"]
        s.workflow.profile.exclusions = ["Ei kriisijohtamista"]
        s.workflow.profile.corrections = ["Oikea vuosi 2025"]
        s.workflow.answers.append(ClarificationAnswer(question_id="secret", topic="evidence", question="Asiakkaan salainen tulos?", text="", disposition="confidential"))
        s.workflow.answers.append(ClarificationAnswer(question_id="q", topic="first_weeks", question="Miten?", text="Kuuntelen ensin", disposition="answered"))
    store.update(sid, 2, enrich)
    with patch(f"backend.app.api.writers.run_{writer}_writer", return_value=factory()) as run:
        response = client.post(f"/api/writers/{writer}", headers={"X-Session-ID": sid}, json={"revision": 2})
    assert response.status_code == 200 and response.json()["source_revision"] == 2
    context = run.call_args.kwargs["approved_context"]
    for text in ["Käärin hihat", "Ei kriisijohtamista", "Oikea vuosi 2025", "Kuuntelen ensin", "Asiakkaan salainen tulos?", "confidential"]:
        assert text in context
    assert store.get(sid).workflow.output_revisions[writer] == 2


def test_late_writer_result_is_discarded(client, session_with_positioning):
    from backend.app.workflow import finish
    sid = session_with_positioning
    def late(*args, **kwargs):
        client.app.state.session_store.update(sid, 2, finish)
        return sample_cv()
    with patch("backend.app.api.writers.run_cv_writer", side_effect=late):
        response = client.post("/api/writers/cv", headers={"X-Session-ID": sid}, json={"revision": 2})
    assert response.status_code == 409
    assert client.app.state.session_store.get(sid).cv_output is None


def test_edit_preserves_but_stales_output_and_blocks_pdf(client, session_with_positioning):
    sid = session_with_positioning
    headers = {"X-Session-ID": sid}
    with patch("backend.app.api.writers.run_cv_writer", return_value=sample_cv()):
        assert client.post("/api/writers/cv", headers=headers, json={"revision": 2}).status_code == 200
    response = client.patch("/api/positioning", headers=headers, json={"revision": 2, "positioning": sample_positioning().model_dump(), "profile": {"goals": ["Uusi tavoite"]}})
    state = response.json()
    assert state["output_revisions"]["cv"] == 2 and state["revision"] == 3
    assert client.app.state.session_store.get(sid).cv_output is not None
    assert client.get("/api/cv/pdf", headers=headers).status_code == 409
    client.post("/api/positioning/approve", headers=headers, json={"revision": 3})
    assert client.get("/api/cv/pdf", headers=headers).status_code == 409
    assert client.post("/api/writers/cv/iterate", headers=headers, json={"revision": 4, "note": "Lyhennä"}).status_code == 409


def test_iteration_passes_current_output_even_without_history(client, session_with_positioning):
    sid = session_with_positioning
    headers = {"X-Session-ID": sid}
    with patch("backend.app.api.writers.run_cv_writer", return_value=sample_cv()):
        client.post("/api/writers/cv", headers=headers, json={"revision": 2})
    with patch("backend.app.api.writers._run_writer_with_history", return_value=sample_cv()) as run:
        response = client.post("/api/writers/cv/iterate", headers=headers, json={"revision": 2, "note": "Lyhennä"})
    assert response.status_code == 200
    assert run.call_args.kwargs["current_output"] == sample_cv().model_dump_json()


def test_invalid_writer_output_does_not_replace_existing(client, session_with_positioning):
    sid = session_with_positioning
    with patch("backend.app.api.writers.run_cv_writer", return_value={}):
        response = client.post("/api/writers/cv", headers={"X-Session-ID": sid}, json={"revision": 2})
    assert response.status_code == 502
    assert client.app.state.session_store.get(sid).cv_output is None
