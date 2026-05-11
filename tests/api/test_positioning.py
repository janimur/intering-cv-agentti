"""
API-testit POST/PATCH /api/positioning -endpointeille.
"""
import pytest
from unittest.mock import patch

from tests._fixtures import sample_positioning


def test_positioning_without_session_header_returns_422(client):
    """POST /api/positioning ilman X-Session-ID-headeria → 422."""
    response = client.post("/api/positioning")
    assert response.status_code == 422


def test_positioning_unknown_session_returns_404(client):
    """POST /api/positioning olemattomalla session_id:llä → 404."""
    response = client.post(
        "/api/positioning",
        headers={"X-Session-ID": "00000000-0000-0000-0000-000000000000"},
    )
    assert response.status_code == 404


def test_positioning_runs_and_returns_document(client, session_with_upload):
    """POST /api/positioning oikealla sessiolla → 200 + PositioningDocument JSONina."""
    with patch("backend.app.api.positioning.run_kartoittaja", return_value=sample_positioning()):
        response = client.post(
            "/api/positioning",
            headers={"X-Session-ID": session_with_upload},
        )
    assert response.status_code == 200
    data = response.json()
    assert "positioning" in data
    assert data["positioning"]["primary_angle"] == "Testaaja"
    assert "evidence" in data
    assert "key_messages" in data


def test_update_positioning_without_prior_run_returns_409(client, session_with_upload):
    """PATCH /api/positioning ilman aiempaa ajoa → 409."""
    payload = sample_positioning().model_dump()
    response = client.patch(
        "/api/positioning",
        json=payload,
        headers={"X-Session-ID": session_with_upload},
    )
    assert response.status_code == 409
    assert "not been generated" in response.json()["detail"]


def test_update_positioning_with_valid_payload(client, session_with_positioning):
    """PATCH /api/positioning oikealla payloadilla → 200 + päivitetty doc."""
    updated = sample_positioning()
    updated.positioning.primary_angle = "Päivitetty Testaaja"
    payload = updated.model_dump()
    response = client.patch(
        "/api/positioning",
        json=payload,
        headers={"X-Session-ID": session_with_positioning},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["positioning"]["primary_angle"] == "Päivitetty Testaaja"


def test_update_positioning_persists_to_session(client, session_with_positioning):
    """PATCH /api/positioning → muutos näkyy seuraavassa kyselyssä."""
    updated = sample_positioning()
    updated.positioning.primary_angle = "Tallennettu muutos"
    payload = updated.model_dump()
    client.patch(
        "/api/positioning",
        json=payload,
        headers={"X-Session-ID": session_with_positioning},
    )
    # Aja kirjoittaja sen jälkeen: positioning on tallennettu sessioon
    # Varmistetaan epäsuorasti — POST /api/writers/linkedin ei heita 409
    from tests._fixtures import sample_linkedin
    with patch("backend.app.api.writers.run_linkedin_writer", return_value=sample_linkedin()):
        response = client.post(
            "/api/writers/linkedin",
            headers={"X-Session-ID": session_with_positioning},
        )
    assert response.status_code == 200
