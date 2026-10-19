"""GET /api/products?sort=...: ordering by price."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models import Product
from tests.factories import create_product


def _titles(client: TestClient, **params: object) -> list[str]:
    """Return the titles of one page, in the order the API sends them."""
    body = client.get("/api/products", params=params).json()
    return [item["title"] for item in body["items"]]


def test_sort_by_price_ascending(client: TestClient, session: Session) -> None:
    """The cheapest product comes first."""
    create_product(session, title="Middle", price=Decimal("20.00"))
    create_product(session, title="Cheap", price=Decimal("5.50"))
    create_product(session, title="Expensive", price=Decimal("100.00"))

    titles = _titles(client, sort="price_asc")

    assert titles == ["Cheap", "Middle", "Expensive"]


def test_sort_by_price_descending(
    client: TestClient, session: Session
) -> None:
    """The most expensive product comes first."""
    create_product(session, title="Middle", price=Decimal("20.00"))
    create_product(session, title="Cheap", price=Decimal("5.50"))
    create_product(session, title="Expensive", price=Decimal("100.00"))

    titles = _titles(client, sort="price_desc")

    assert titles == ["Expensive", "Middle", "Cheap"]


def test_without_sort_products_are_ordered_by_id(
    client: TestClient, session: Session
) -> None:
    """The default order does not depend on the price."""
    create_product(session, title="First", price=Decimal("30.00"))
    create_product(session, title="Second", price=Decimal("10.00"))

    assert _titles(client) == ["First", "Second"]


def _move_to_the_end_of_the_table(session: Session, product_id: int) -> None:
    """Rewrite one row, so PostgreSQL stores it after all the others.

    An UPDATE writes a new version of the row at the end of the table.
    Rows read without an ORDER BY then no longer come in id order, as
    they happen to do right after being inserted, and a test of the
    order cannot pass by accident.
    """
    session.execute(
        update(Product)
        .where(Product.id == product_id)
        .values(rating_count=Product.rating_count + 1)
    )
    session.commit()


def test_equal_prices_keep_the_order_of_their_ids(
    client: TestClient, session: Session
) -> None:
    """The id breaks ties, in both directions, so pages are stable."""
    first = create_product(session, title="A", price=Decimal("10.00"))
    create_product(session, title="B", price=Decimal("10.00"))
    create_product(session, title="C", price=Decimal("5.00"))
    _move_to_the_end_of_the_table(session, first.id)

    assert _titles(client, sort="price_asc") == ["C", "A", "B"]
    assert _titles(client, sort="price_desc") == ["A", "B", "C"]


def test_sorted_pages_do_not_repeat_or_skip_products(
    client: TestClient, session: Session
) -> None:
    """Paging through a sorted list shows every product exactly once."""
    for price in ("3.00", "1.00", "3.00", "2.00", "1.00"):
        create_product(session, title=f"Price {price}", price=Decimal(price))
    # Ids 1 and 2 are the first of their prices: without the id as the
    # last sort key they would now come after ids 3 and 5.
    _move_to_the_end_of_the_table(session, 1)
    _move_to_the_end_of_the_table(session, 2)

    seen: list[int] = []
    for page in (1, 2, 3):
        body = client.get(
            "/api/products",
            params={"sort": "price_asc", "page": page, "page_size": 2},
        ).json()
        seen.extend(item["id"] for item in body["items"])

    # Ids by price, then by id: 1.00 (2, 5), 2.00 (4), 3.00 (1, 3).
    assert seen == [2, 5, 4, 1, 3]


def test_sort_applies_to_the_filtered_list(
    client: TestClient, session: Session
) -> None:
    """Sorting and filtering work together."""
    create_product(session, title="Ring", category="jewelery", price=30)
    create_product(session, title="Phone", category="electronics", price=10)
    create_product(session, title="Chain", category="jewelery", price=20)

    titles = _titles(client, sort="price_asc", category="jewelery")

    assert titles == ["Chain", "Ring"]


def test_sort_by_rating_puts_the_best_rated_first(
    client: TestClient, session: Session
) -> None:
    """Higher score first; on a tie more ratings first; none last."""
    create_product(session, title="Unrated", rating_rate=None)
    create_product(
        session, title="Good, few", rating_rate=Decimal("4.5"), rating_count=3
    )
    create_product(session, title="Poor", rating_rate=Decimal("2.0"))
    create_product(
        session,
        title="Good, many",
        rating_rate=Decimal("4.5"),
        rating_count=300,
    )

    titles = _titles(client, sort="rating_desc")

    assert titles == ["Good, many", "Good, few", "Poor", "Unrated"]
