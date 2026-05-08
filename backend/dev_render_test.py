"""
Itsenäinen testiskripti PDF-rendererille.
Käyttö: uv run python backend/dev_render_test.py

Lukee tests/output/cv.json:n, renderöi PDF:n /tmp/test_cv.pdf:ksi.
"""
import asyncio
import json
from pathlib import Path

from src.schemas import CVDocument
from backend.app.pdf_renderer import render_cv_pdf, start_browser, stop_browser


async def main() -> None:
    cv_json_path = Path(__file__).parent.parent / "tests" / "output" / "cv.json"
    if not cv_json_path.exists():
        raise SystemExit(f"{cv_json_path} puuttuu — aja ensin tests/test_kirjoittajat.py")

    doc = CVDocument.model_validate(json.loads(cv_json_path.read_text(encoding="utf-8")))

    print("Käynnistetään Chromium...")
    playwright, browser = await start_browser()
    try:
        print("Renderöidään PDF...")
        pdf_bytes = await render_cv_pdf(browser, doc)
    finally:
        await stop_browser(playwright, browser)

    out_path = Path("/tmp/test_cv.pdf")
    out_path.write_bytes(pdf_bytes)
    print(f"Tallennettu: {out_path} ({len(pdf_bytes):,} tavua)")


if __name__ == "__main__":
    asyncio.run(main())
