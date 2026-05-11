"""
API-testit POST /api/upload -endpointille.
"""
import pytest
from unittest.mock import patch


def test_upload_without_cv_pdf_returns_422(client):
    """POST /api/upload ilman cv_pdf:ää → 422 (pakollinen kenttä puuttuu)."""
    response = client.post("/api/upload")
    assert response.status_code == 422


def test_upload_non_pdf_file_returns_400(client, tmp_path):
    """POST /api/upload tiedostolla joka ei ole .pdf → 400."""
    fake_txt = tmp_path / "cv.txt"
    fake_txt.write_text("Not a PDF")
    response = client.post(
        "/api/upload",
        files={"cv_pdf": ("cv.txt", open(fake_txt, "rb"), "text/plain")},
    )
    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_upload_valid_pdf_returns_200_with_session_id(client, tmp_path):
    """POST /api/upload oikealla PDF:llä → 200 + session_id syntyy."""
    fake_pdf = tmp_path / "cv.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4\nfake\n%%EOF\n")
    with patch("backend.app.api.upload.extract_text_from_pdf", return_value="CV-teksti"):
        response = client.post(
            "/api/upload",
            files={"cv_pdf": ("cv.pdf", open(fake_pdf, "rb"), "application/pdf")},
        )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert len(data["session_id"]) == 36  # UUID4


def test_upload_with_linkedin_text_sets_linkedin_available(client, tmp_path):
    """POST /api/upload + linkedin_text → response.linkedin_available == True."""
    fake_pdf = tmp_path / "cv.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4\nfake\n%%EOF\n")
    with patch("backend.app.api.upload.extract_text_from_pdf", return_value="CV-teksti"):
        response = client.post(
            "/api/upload",
            files={"cv_pdf": ("cv.pdf", open(fake_pdf, "rb"), "application/pdf")},
            data={"linkedin_text": "LinkedIn-profiiliteksti"},
        )
    assert response.status_code == 200
    assert response.json()["linkedin_available"] is True


def test_upload_without_linkedin_text_sets_linkedin_not_available(client, tmp_path):
    """POST /api/upload ilman linkedin_text → linkedin_available == False."""
    fake_pdf = tmp_path / "cv.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4\nfake\n%%EOF\n")
    with patch("backend.app.api.upload.extract_text_from_pdf", return_value="CV-teksti"):
        response = client.post(
            "/api/upload",
            files={"cv_pdf": ("cv.pdf", open(fake_pdf, "rb"), "application/pdf")},
        )
    assert response.status_code == 200
    assert response.json()["linkedin_available"] is False


def test_upload_linkedin_pdf_non_pdf_returns_400(client, tmp_path):
    """POST /api/upload + linkedin_pdf joka ei ole .pdf → 400."""
    cv_pdf = tmp_path / "cv.pdf"
    cv_pdf.write_bytes(b"%PDF-1.4\nfake\n%%EOF\n")
    fake_txt = tmp_path / "linkedin.txt"
    fake_txt.write_text("Not a PDF")
    with patch("backend.app.api.upload.extract_text_from_pdf", return_value="CV-teksti"):
        response = client.post(
            "/api/upload",
            files={
                "cv_pdf": ("cv.pdf", open(cv_pdf, "rb"), "application/pdf"),
                "linkedin_pdf": ("linkedin.txt", open(fake_txt, "rb"), "text/plain"),
            },
        )
    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]
