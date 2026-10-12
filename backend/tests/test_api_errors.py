"""Input validation, the error envelope and the request id."""

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_product_service
from app.main import app


class BrokenProductService:
    """A product service whose every call fails unexpectedly."""

    def list_products(self, **_: object) -> None:
        """Raise an error that no handler knows about."""
        raise RuntimeError("secret internal detail")


@pytest.mark.parametrize(
    ("url", "field"),
    [
        ("/api/products?page=0", "page"),
        ("/api/products?page=abc", "page"),
        ("/api/products?page=1000001", "page"),
        ("/api/products?page_size=0", "page_size"),
        ("/api/products?page_size=49", "page_size"),
        ("/api/products?search=" + "a" * 101, "search"),
        ("/api/products?category=" + "a" * 101, "category"),
        ("/api/products?search=a%00b", "search"),
        ("/api/products?category=a%00b", "category"),
        ("/api/products/0", "product_id"),
        ("/api/products/-1", "product_id"),
        ("/api/products/abc", "product_id"),
        ("/api/products/2147483648", "product_id"),
    ],
)
def test_invalid_input_is_422_and_names_the_field(
    client: TestClient, url: str, field: str
) -> None:
    """The input validation rule: bad parameters never reach the query."""
    response = client.get(url)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["message"] == "The request is not valid."
    assert [detail["field"] for detail in error["details"]] == [field]
    assert error["details"][0]["message"]


def test_every_invalid_parameter_is_reported(client: TestClient) -> None:
    """Two bad parameters give two details."""
    response = client.get("/api/products?page=0&page_size=500")

    fields = [d["field"] for d in response.json()["error"]["details"]]
    assert fields == ["page", "page_size"]


def test_limits_are_accepted(client: TestClient) -> None:
    """The largest allowed values are valid."""
    url = "/api/products?page_size=48&search=" + "a" * 100

    assert client.get(url).status_code == 200


def test_unknown_route_is_404_with_the_error_envelope(
    client: TestClient,
) -> None:
    """The framework's own 404 uses our envelope too."""
    response = client.get("/api/nothing-here")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "The requested resource was not found.",
            "details": [],
        }
    }


def test_wrong_method_is_405_with_the_error_envelope(
    client: TestClient,
) -> None:
    """The API is read-only: writing answers method_not_allowed."""
    response = client.post("/api/products")

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"


def test_missing_image_is_404_with_the_error_envelope(
    client: TestClient,
) -> None:
    """A file that is not in the images directory is a normal 404."""
    response = client.get("/images/does-not-exist.png")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_unexpected_error_is_500_without_internals(
    client: TestClient,
) -> None:
    """An unhandled error gives the generic answer and a request id."""
    app.dependency_overrides[get_product_service] = BrokenProductService

    response = client.get("/api/products")

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "internal_error",
            "message": "An unexpected error occurred.",
            "details": [],
        }
    }
    assert "secret" not in response.text
    assert response.headers["X-Request-ID"]


def test_request_id_is_generated_when_missing(client: TestClient) -> None:
    """Every response carries an id, different for each request."""
    first = client.get("/api/categories").headers["X-Request-ID"]
    second = client.get("/api/categories").headers["X-Request-ID"]

    assert len(first) == 32
    assert first != second


def test_valid_incoming_request_id_is_reused(client: TestClient) -> None:
    """The id sent by the proxy is kept, so logs can be correlated."""
    response = client.get(
        "/api/categories", headers={"X-Request-ID": "abc-123"}
    )

    assert response.headers["X-Request-ID"] == "abc-123"


@pytest.mark.parametrize("incoming", ["has spaces", "a" * 65, "semi;colon"])
def test_invalid_incoming_request_id_is_replaced(
    client: TestClient, incoming: str
) -> None:
    """Unsafe or oversized ids are not echoed back or logged."""
    response = client.get(
        "/api/categories", headers={"X-Request-ID": incoming}
    )

    assert response.headers["X-Request-ID"] != incoming
    assert len(response.headers["X-Request-ID"]) == 32
