from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

GDPR_PATH = Path(__file__).parent.parent.parent / "static" / "gdpr.md"


@router.get("/api/gdpr")
async def get_gdpr() -> dict:
    """Palauttaa GDPR-selosteen markdown-muodossa."""
    return {"content": GDPR_PATH.read_text(encoding="utf-8")}
