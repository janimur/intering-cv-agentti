from fastapi import APIRouter

from backend.app.metrics import summary

router = APIRouter()


@router.get("/api/metrics")
async def get_metrics() -> dict:
    """Palauttaa anonyymit suoritusmetriikat."""
    return summary()
