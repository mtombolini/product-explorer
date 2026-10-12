"""Health endpoint used by the container health check."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def read_health() -> dict[str, str]:
    """Report that the application process is up."""
    return {"status": "ok"}
