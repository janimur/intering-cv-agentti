"""
Jaetut fixturet FastAPI TestClient -testeille.
"""
import asyncio
import importlib
import pytest
import httpx
import time
from uuid import uuid4
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from backend.app.main import app
from tests._fixtures import sample_positioning, sample_cv, sample_linkedin, sample_intering


class WorkflowTestClient(TestClient):
    """Existing workflow tests assert completed domain outcomes.

    Exercise the real 202 + GET protocol here; protocol/concurrency tests use
    client.request directly to observe the initial response without waiting.
    """
    def post(self, url, **kwargs):
        is_model = str(url) in {"/api/positioning", "/api/positioning/answers"} or str(url).startswith("/api/writers/")
        if is_model:
            kwargs["headers"] = {**kwargs.get("headers", {}), "Idempotency-Key": str(uuid4())}
        response = super().post(url, **kwargs)
        if not is_model or response.status_code != 202:
            return response
        for _ in range(200):
            op = self.get("/api/operations/" + response.json()["id"], headers=kwargs["headers"]).json()
            if op["status"] == "succeeded":
                return httpx.Response(200, json=op["result"], request=response.request)
            if op["status"] == "failed":
                return httpx.Response(op["error"]["status"], json={"detail": op["error"]["detail"]}, request=response.request)
            time.sleep(0.005)
        raise AssertionError("Mocked operation did not finish")


@pytest.fixture(autouse=True)
def _patch_to_thread(monkeypatch):
    """Korvaa asyncio.to_thread no-op-async-funktiolla. Mockattujen
    kirjoittaja-funktioiden ajoaika on mikrosekunteja, joten threadpoolin
    käyttö on tarpeetonta yleiskuormaa (kymmeniä sekunteja per testi muuten).
    Pidetään patchaus monkeypatchillä jotta se säilyy koko testifunktion ajan
    asynkronisen FastAPI-pyynnönkäsittelyn yli."""
    async def no_thread(func, /, *args, **kwargs):
        return func(*args, **kwargs)
    monkeypatch.setattr(asyncio, "to_thread", no_thread)


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

    with patch("backend.app.main.start_browser", new=AsyncMock(return_value=(MagicMock(), MagicMock()))), \
         patch("backend.app.main.stop_browser", new=AsyncMock(return_value=None)):
        with WorkflowTestClient(app) as c:
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
    from src.schemas import Assessment, MemberProfile
    assessment = Assessment(positioning=sample_positioning(), profile=MemberProfile(), next_question=None)
    with patch("backend.app.api.positioning.run_initial_assessment", return_value=assessment):
        response = client.post(
            "/api/positioning",
            json={"revision": 0},
            headers={"X-Session-ID": session_with_upload},
        )
    assert response.status_code == 200
    response = client.post("/api/positioning/approve", json={"revision": response.json()["revision"]}, headers={"X-Session-ID": session_with_upload})
    assert response.status_code == 200
    return session_with_upload
