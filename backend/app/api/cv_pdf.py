from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import Response

from backend.app.dependencies import get_session_store
from backend.app.metrics import measure
from backend.app.pdf_renderer import render_cv_pdf
from backend.app.sessions import SessionStore
from backend.app.workflow import require_approved, expect_revision

router = APIRouter()


@router.get("/api/cv/pdf")
async def download_cv_pdf(
    request: Request,
    x_session_id: str = Header(..., alias="X-Session-ID"),
    store: SessionStore = Depends(get_session_store),
):
    session = store.get(x_session_id)
    if session.cv_output is None:
        raise HTTPException(409, "CV-kirjoittaja ei ole vielä ajettu")

    require_approved(session)
    if session.workflow.output_revisions.get("cv") != session.workflow.revision:
        raise HTTPException(409, "CV on vanhentunut. Aja CV-kirjoittaja uudelleen.")

    browser = request.app.state.browser
    with measure("pdf"):
        pdf_bytes = await render_cv_pdf(browser, session.cv_output)

    latest = store.get(x_session_id)
    expect_revision(latest, session.workflow.revision)
    if latest.writer_generations.get("cv") != session.writer_generations.get("cv"):
        raise HTTPException(409, "CV muuttui PDF:n luonnin aikana. Lataa uudelleen.")
    safe_name = session.cv_output.header.name.replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_CV.pdf"'
        },
    )
