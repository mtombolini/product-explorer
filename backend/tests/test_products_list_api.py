"""GET /api/products: pagination, category filter and search."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.factories import create_product, create_products


def test_first_page_uses_the_default_page_size(
    client: TestClient, session: Session
) -> None:
    """Pagination: 20 products give 12 on page 1 and 2 pages."""
    create_products(session, 20)

    body = client.get("/api/products").json()

    assert [item["id"] for item in body["items"]] == list(range(1, 13))
    assert body["total"] == 20
    assert body["page"] == 1
    assert body["page_size"] == 12
    assert body["total_pages"] == 2


def test_last_page_holds_the_remaining_products(
    client: TestClient, session: Session
) -> None:
    """Pagination: the last page is partial."""
    create_products(session, 20)

    body = client.get("/api/products", params={"page": 2}).json()

    assert [item["id"] for item in body["items"]] == list(range(13, 21))
    assert body["page"] == 2
    assert body["total_pages"] == 2


def test_page_after_the_last_is_empty_but_keeps_the_totals(
    client: TestClient, session: Session
) -> None:
    """An out-of-range page is 200 with no items, not an error."""
    create_products(session, 5)

    response = client.get("/api/products", params={"page": 9})

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 5
    assert body["total_pages"] == 1


def test_page_size_changes_the_number_of_pages(
    client: TestClient, session: Session
) -> None:
    """total_pages is the total divided by page_size, rounded up."""
    create_products(session, 5)

    body = client.get("/api/products", params={"page_size": 2}).json()

    assert len(body["items"]) == 2
    assert body["page_size"] == 2
    assert body["total_pages"] == 3


def test_empty_catalogue_has_no_pages(client: TestClient) -> None:
    """Before the import: no items, zero pages."""
    body = client.get("/api/products").json()

    assert body["items"] == []
    assert body["total"] == 0
    assert body["total_pages"] == 0


def test_category_filter_matches_the_exact_name(
    client: TestClient, session: Session
) -> None:
    """Filtering: only the products of the category, in id order."""
    create_product(session, title="Shirt", category="men's clothing")
    create_product(session, title="Dress", category="women's clothing")
    create_product(session, title="Jacket", category="men's clothing")

    body = client.get(
        "/api/products", params={"category": "men's clothing"}
    ).json()

    assert [item["title"] for item in body["items"]] == ["Shirt", "Jacket"]
    assert body["total"] == 2


def test_unknown_category_gives_an_empty_page(
    client: TestClient, session: Session
) -> None:
    """A category nobody has is 200 with no items."""
    create_product(session)

    response = client.get("/api/products", params={"category": "toys"})

    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_search_ignores_case_and_reads_title_and_description(
    client: TestClient, session: Session
) -> None:
    """Search finds the text in the title or the description."""
    create_product(session, title="Cotton Jacket", description="Warm")
    create_product(session, title="Backpack", description="Made of COTTON")
    create_product(session, title="Gold ring", description="Shiny")

    body = client.get("/api/products", params={"search": "cotton"}).json()

    assert [item["title"] for item in body["items"]] == [
        "Cotton Jacket",
        "Backpack",
    ]


def test_blank_search_is_ignored(client: TestClient, session: Session) -> None:
    """A search made of spaces means no search."""
    create_products(session, 3)

    body = client.get("/api/products", params={"search": "   "}).json()

    assert body["total"] == 3


def test_search_matches_percent_and_underscore_literally(
    client: TestClient, session: Session
) -> None:
    """The LIKE wildcards typed by a user are ordinary characters."""
    create_product(session, title="100% cotton shirt")
    create_product(session, title="Cotton_blend shirt")
    create_product(session, title="Plain shirt")

    percent = client.get("/api/products", params={"search": "%"}).json()
    underscore = client.get("/api/products", params={"search": "_"}).json()

    assert [item["title"] for item in percent["items"]] == [
        "100% cotton shirt"
    ]
    assert [item["title"] for item in underscore["items"]] == [
        "Cotton_blend shirt"
    ]


def test_search_and_category_are_combined(
    client: TestClient, session: Session
) -> None:
    """Both filters must match."""
    create_product(session, title="Slim shirt", category="men's clothing")
    create_product(session, title="Silk shirt", category="women's clothing")
    create_product(session, title="Rain jacket", category="men's clothing")

    body = client.get(
        "/api/products",
        params={"search": "shirt", "category": "men's clothing"},
    ).json()

    assert [item["title"] for item in body["items"]] == ["Slim shirt"]
    assert body["total"] == 1
