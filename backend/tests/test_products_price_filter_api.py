"""GET /api/products?min_price=...&max_price=...: the price range."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.factories import create_product


def _titles(client: TestClient, **params: object) -> list[str]:
    """Return the titles of one page, in the order the API sends them."""
    response = client.get("/api/products", params=params)
    assert response.status_code == 200
    return [item["title"] for item in response.json()["items"]]


def _three_prices(session: Session) -> None:
    """Products at 5.00, 20.00 and 100.00."""
    create_product(session, title="Cheap", price=Decimal("5.00"))
    create_product(session, title="Middle", price=Decimal("20.00"))
    create_product(session, title="Expensive", price=Decimal("100.00"))


def test_both_bounds_are_inclusive(
    client: TestClient, session: Session
) -> None:
    """A product priced exactly at a bound is included."""
    _three_prices(session)

    assert _titles(client, min_price="5", max_price="20") == [
        "Cheap",
        "Middle",
    ]


def test_one_bound_alone(client: TestClient, session: Session) -> None:
    """Either bound can be used without the other."""
    _three_prices(session)

    assert _titles(client, min_price="20.01") == ["Expensive"]
    assert _titles(client, max_price="19.99") == ["Cheap"]


def test_range_combines_with_category_and_sort(
    client: TestClient, session: Session
) -> None:
    """The total counts only the products inside every filter."""
    _three_prices(session)
    create_product(
        session, title="Ring", price=Decimal("50.00"), category="jewelery"
    )

    body = client.get(
        "/api/products",
        params={
            "min_price": "10",
            "category": "electronics",
            "sort": "price_desc",
        },
    ).json()

    assert [item["title"] for item in body["items"]] == ["Expensive", "Middle"]
    assert body["total"] == 2


def test_min_greater_than_max_is_a_validation_error(
    client: TestClient,
) -> None:
    """An empty range is a mistake of the client, not an empty page."""
    response = client.get(
        "/api/products", params={"min_price": "50", "max_price": "10"}
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["details"][0]["field"] == "min_price"


def test_invalid_prices_are_validation_errors(client: TestClient) -> None:
    """Negative, too large or not a number: 422 with the field named."""
    for params in (
        {"min_price": "-1"},
        {"max_price": "100000000"},
        {"min_price": "cheap"},
    ):
        response = client.get("/api/products", params=params)

        assert response.status_code == 422
        field = response.json()["error"]["details"][0]["field"]
        assert field == next(iter(params))
