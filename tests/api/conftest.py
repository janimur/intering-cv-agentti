"""
Jaetut fixturet FastAPI TestClient -testeille.
"""
import importlib
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from backend.app.main import app
from tests._fixtures import sample_positioning, sample_cv, sample_linkedin, sample_intering


@pytest.fixture
def client(tmp_path, monkeypatch):
    """
    Tuottaa TestClientin jossa:
    - SessionStore on tuore (ei jaettu testien välillä)
    - metrics-DB on tmp-hakemistossa
    - Playwright-browser on mockattu (lifespan ei käynnistä oikeaa selainta)
    """
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    # Uudelleenlataa metrics-moduuli jotta DB_PATH päivittyy env-muuttujan mukaan
    from backend.app import metrics
    importlib.reload(metrics)

    with patch("backend.app.pdf_renderer.start_browser", new=AsyncMock(return_value=(MagicMock(), MagicMock()))), \
         patch("backend.app.pdf_renderer.stop_browser", new=AsyncMock(return_value=None)):
        with TestClient(app) as c:
            yield c

    # Palauta metrics normaalitilaansa
    monkeypatch.delenv("DATA_DIR", raising=False)
    importlib.reload(metrics)


@pytest.fixture
def session_with_upload(client, tmp_path):
    """Sessio jossa upload on tehty mutta positioning ei vielä ajettu."""
    fake_pdf = tmp_path / "fake.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4\nfake content\n%%EOF\n")
    with patch("backend.app.api.upload.extract_text_from_pdf", return_value="CV-teksti..."):
        response = client.post(
            "/api/upload",
            files={"cv_pdf": ("cv.pdf", open(fake_pdf, "rb"), "application/pdf")},
            data={"linkedin_text": "LinkedIn-teksti"},
        )
    assert response.status_code == 200
    return response.json()["session_id"]


@pytest.fixture
def session_with_positioning(client, session_with_upload):
    """Sessio jossa positioning on ajettu (mockattu)."""
    with patch("backend.app.api.positioning.run_kartoittaja", return_value=sample_positioning()):
        response = client.post(
            "/api/positioning",
            headers={"X-Session-ID": session_with_upload},
        )
    assert response.status_code == 200
    return session_with_upload
