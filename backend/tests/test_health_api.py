"""GET /health: database state and whether the catalogue is imported."""

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.dependencies import get_product_repository
from app.main import app
from tests.factories import create_products


class UnreachableRepository:
    """A repository whose database does not answer."""

    def count(self) -> int:
        """Fail like SQLAlchemy does when the connection is refused."""
        raise OperationalError("SELECT 1", {}, Exception("refused"))


def test_health_reports_an_imported_catalogue(
    client: TestClient, session: Session
) -> None:
    """With products the catalogue is seeded."""
    create_products(session, 3)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "ok",
        "catalogue_seeded": True,
        "product_count": 3,
    }


def test_health_is_ok_when_the_catalogue_is_empty(client: TestClient) -> None:
    """A failed import is visible but does not make the API unhealthy."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "ok",
        "catalogue_seeded": False,
        "product_count": 0,
    }


def test_health_is_503_when_the_database_is_down(client: TestClient) -> None:
    """A database error is reported, not raised."""
    app.dependency_overrides[get_product_repository] = UnreachableRepository

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "database": "unavailable",
        "catalogue_seeded": False,
        "product_count": 0,
    }
