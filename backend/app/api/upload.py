import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from backend.app.dependencies import get_session_store
from backend.app.sessions import SessionStore
from src.pdf_reader import extract_text_from_pdf

router = APIRouter()


class UploadResponse(BaseModel):
    session_id: str
    cv_text_preview: str
    linkedin_available: bool


def _read_pdf_upload(upload: UploadFile) -> str:
    """Tallenna upload tilapäiseen tiedostoon, lue pdfplumberillä, siivoa."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        content = upload.file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)
    try:
        return extract_text_from_pdf(str(tmp_path))
    finally:
        tmp_path.unlink(missing_ok=True)


@router.post("/api/upload", response_model=UploadResponse)
async def upload(
    cv_pdf: UploadFile = File(...),
    linkedin_pdf: UploadFile | None = File(None),
    linkedin_text: str | None = Form(None),
    store: SessionStore = Depends(get_session_store),
) -> UploadResponse:
    # Validoi CV-tiedosto
    if not cv_pdf.filename or not cv_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "CV must be a PDF file")

    cv_text = _read_pdf_upload(cv_pdf)

    # LinkedIn: tekstisyöte on etusijalla, PDF on vaihtoehto
    final_linkedin: str | None = None
    if linkedin_text and linkedin_text.strip():
        final_linkedin = linkedin_text.strip()
    elif linkedin_pdf and linkedin_pdf.filename:
        if not linkedin_pdf.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "LinkedIn upload must be a PDF file")
        final_linkedin = _read_pdf_upload(linkedin_pdf)

    session = store.create(cv_text=cv_text, linkedin_text=final_linkedin)

    return UploadResponse(
        session_id=session.session_id,
        cv_text_preview=cv_text[:200],
        linkedin_available=final_linkedin is not None,
    )
