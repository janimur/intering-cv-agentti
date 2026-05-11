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
        headers={"X-Session-ID": session_with_upload},
    )
    assert response.status_code == 409


def test_linkedin_writer_returns_200_with_output(client, session_with_positioning):
    """POST /api/writers/linkedin mockatulla writerillä → 200 + LinkedInOutput."""
    with patch("backend.app.api.writers.run_linkedin_writer", return_value=sample_linkedin()):
        response = client.post(
            "/api/writers/linkedin",
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
        headers={"X-Session-ID": session_with_positioning},
    )
    assert response.status_code == 422


def test_iterate_without_positioning_returns_409(client, session_with_upload):
    """POST /api/writers/linkedin/iterate ilman positioningia → 409."""
    response = client.post(
        "/api/writers/linkedin/iterate",
        json={"note": "Tee parempi"},
        headers={"X-Session-ID": session_with_upload},
    )
    assert response.status_code == 409


def test_iterate_without_prior_writer_run_returns_409(client, session_with_positioning):
    """POST /api/writers/linkedin/iterate ilman aiempaa kirjoittaja-ajoa → 409."""
    response = client.post(
        "/api/writers/linkedin/iterate",
        json={"note": "Tee parempi"},
        headers={"X-Session-ID": session_with_positioning},
    )
    assert response.status_code == 409


def test_iterate_returns_200_with_updated_output(client, session_with_positioning):
    """POST /api/writers/linkedin/iterate mockatulla writerillä → 200."""
    # Aja ensin perus-kirjoittaja
    with patch("backend.app.api.writers.run_linkedin_writer", return_value=sample_linkedin()):
        client.post(
            "/api/writers/linkedin",
            headers={"X-Session-ID": session_with_positioning},
        )
    # Sitten iteroi
    updated_linkedin = sample_linkedin()
    updated_linkedin.headline = "Päivitetty headline"
    with patch("backend.app.api.writers._run_writer_with_history", return_value=updated_linkedin):
        response = client.post(
            "/api/writers/linkedin/iterate",
            json={"note": "Tee tiivistetympi"},
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
            headers={"X-Session-ID": session_with_positioning},
        )
    # Ensimmäinen iteraatio
    with patch("backend.app.api.writers._run_writer_with_history", return_value=sample_linkedin()):
        client.post(
            "/api/writers/linkedin/iterate",
            json={"note": "Iteraatio 1"},
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
            headers={"X-Session-ID": session_with_positioning},
        )
    # Aja 4 iteraatiota
    for i in range(4):
        with patch("backend.app.api.writers._run_writer_with_history", return_value=sample_linkedin()):
            response = client.post(
                "/api/writers/linkedin/iterate",
                json={"note": f"Iteraatio {i + 1}"},
                headers={"X-Session-ID": session_with_positioning},
            )
        assert response.status_code == 200

    # Tarkista sliding window
    store = client.app.state.session_store
    session = store.get(session_with_positioning)
    assert len(session.iteration_history["linkedin"]) <= 3
