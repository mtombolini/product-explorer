"""Health endpoint, used by the container health check and by people."""

from fastapi import APIRouter, Response, status

from app.api.dependencies import HealthServiceDependency
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Check the API, the database and the catalogue",
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": HealthResponse,
            "description": "The database cannot be reached.",
        }
    },
)
def read_health(
    service: HealthServiceDependency, response: Response
) -> HealthResponse:
    """Report whether the database answers and the catalogue is imported.

    An empty catalogue is not an error: the API is up and answers 200
    with ``catalogue_seeded`` false, and the import can be run again.
    """
    health = service.check()
    if not health.database_available:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(
            status="unavailable",
            database="unavailable",
            catalogue_seeded=False,
            product_count=0,
        )
    return HealthResponse(
        status="ok",
        database="ok",
        catalogue_seeded=health.catalogue_seeded,
        product_count=health.product_count,
    )
