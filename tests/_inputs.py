"""
Testiapufunktiot syötteen lataamiseen.

Tuotannossa LinkedIn-input tulee frontendin tekstikentästä TAI
LinkedIn-PDF-latauksesta. Testissä simuloidaan molempia:
  - tests/fixtures/jani_linkedin.md = paste-tekstin simulaatio (gitignored)
  - tmp/linkedin/*.pdf              = PDF-latauksen simulaatio (gitignored *.pdf)
Jos molempia on, paste-teksti voittaa.
"""
from pathlib import Path

from src.pdf_reader import extract_text_from_pdf

ROOT = Path(__file__).parent.parent
LINKEDIN_TEXT_PATH = ROOT / "tests" / "fixtures" / "jani_linkedin.md"
LINKEDIN_PDF_DIR = ROOT / "tmp" / "linkedin"


def load_linkedin_text() -> str | None:
    if LINKEDIN_TEXT_PATH.exists():
        return LINKEDIN_TEXT_PATH.read_text(encoding="utf-8")
    if LINKEDIN_PDF_DIR.exists():
        pdfs = sorted(LINKEDIN_PDF_DIR.glob("*.pdf"))
        if pdfs:
            return extract_text_from_pdf(str(pdfs[0]))
    return None
