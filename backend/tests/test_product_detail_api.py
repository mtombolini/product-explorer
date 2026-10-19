"""GET /api/products/{id} and GET /api/categories."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.factories import create_product


def test_product_is_returned_with_the_public_fields_only(
    client: TestClient, session: Session
) -> None:
    """The response has the contract fields and hides the internal ones."""
    product = create_product(
        session,
        external_id=77,
        title="Backpack",
        description="Fits a laptop",
        price=Decimal("109.95"),
        category="men's clothing",
        image_path="77.png",
        rating_rate=Decimal("3.9"),
        rating_count=120,
    )

    response = client.get(f"/api/products/{product.id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": product.id,
        "title": "Backpack",
        "description": "Fits a laptop",
        "language": "en",
        "price": 109.95,
        "category": "men's clothing",
        "image_url": "/images/77.png",
        "rating_rate": 3.9,
        "rating_count": 120,
        "specifications": [],
        "specifications_language": "en",
    }


def test_product_without_image_or_rating_has_null_fields(
    client: TestClient, session: Session
) -> None:
    """Missing optional data is null, so the client shows a placeholder."""
    product = create_product(
        session, image_path=None, rating_rate=None, rating_count=None
    )

    body = client.get(f"/api/products/{product.id}").json()

    assert body["image_url"] is None
    assert body["rating_rate"] is None
    assert body["rating_count"] is None


def test_unknown_product_is_404_with_the_error_envelope(
    client: TestClient,
) -> None:
    """A valid id that does not exist answers 404 product_not_found."""
    response = client.get("/api/products/999")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "product_not_found",
            "message": "Product 999 was not found.",
            "details": [],
        }
    }


def test_categories_are_distinct_and_sorted(
    client: TestClient, session: Session
) -> None:
    """Each category appears once, in alphabetical order."""
    create_product(session, category="jewelery")
    create_product(session, category="electronics")
    create_product(session, category="jewelery")

    response = client.get("/api/categories")

    assert response.status_code == 200
    assert response.json() == {"items": ["electronics", "jewelery"]}


def test_categories_of_an_empty_catalogue(client: TestClient) -> None:
    """Before the import there are no categories."""
    assert client.get("/api/categories").json() == {"items": []}
