from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import Response

from backend.app.dependencies import get_session_store
from backend.app.metrics import measure
from backend.app.pdf_renderer import render_cv_pdf
from backend.app.sessions import SessionStore

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

    browser = request.app.state.browser
    with measure("pdf"):
        pdf_bytes = await render_cv_pdf(browser, session.cv_output)

    safe_name = session.cv_output.header.name.replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_CV.pdf"'
        },
    )
