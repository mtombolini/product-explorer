"""The specifications of a product, in the requested language."""

from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import delete, event, select
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from app.core.database import engine
from app.models import Language, Product, ProductSpecification
from tests.factories import create_product, create_specifications

ENGLISH = [("Capacity", "2 TB"), ("Interface", "USB 3.0")]
SPANISH = [("Capacidad", "2 TB"), ("Interfaz", "USB 3.0")]


def _as_response(items: list[tuple[str, str]]) -> list[dict[str, str]]:
    """Return (label, value) pairs as the API sends them."""
    return [{"label": label, "value": value} for label, value in items]


def _count_statements(client: TestClient, **params: object) -> int:
    """Return how many SQL statements one list request executes."""
    statements: list[str] = []

    def record(
        connection: Connection, cursor: Any, statement: str, *rest: Any
    ) -> None:
        """Keep the text of every statement sent to the database."""
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        response = client.get("/api/products", params=params)
    finally:
        event.remove(engine, "before_cursor_execute", record)
    assert len(response.json()["items"]) == params["page_size"]
    return len(statements)


def test_specifications_come_in_order_in_the_requested_language(
    client: TestClient, session: Session
) -> None:
    """lang=es gives the Spanish lines by position, marked "es"."""
    product = create_product(session)
    create_specifications(session, product, ENGLISH, Language.EN)
    # Inserted last line first: the order comes from the position.
    session.add(
        ProductSpecification(
            product_id=product.id,
            language="es",
            position=2,
            label="Interfaz",
            value="USB 3.0",
        )
    )
    session.add(
        ProductSpecification(
            product_id=product.id,
            language="es",
            position=1,
            label="Capacidad",
            value="2 TB",
        )
    )
    session.commit()

    body = client.get(f"/api/products/{product.id}?lang=es").json()

    assert body["specifications"] == _as_response(SPANISH)
    assert body["specifications_language"] == "es"


def test_specifications_fall_back_to_the_source_language(
    client: TestClient, session: Session
) -> None:
    """A product with English lines only sends them, marked "en"."""
    product = create_product(session)
    create_specifications(session, product, ENGLISH, Language.EN)

    body = client.get(f"/api/products/{product.id}?lang=es").json()

    assert body["specifications"] == _as_response(ENGLISH)
    assert body["specifications_language"] == "en"


def test_product_without_specifications_has_an_empty_list(
    client: TestClient, session: Session
) -> None:
    """No lines at all: an empty list in the source language."""
    product = create_product(session)

    for lang in ("en", "es"):
        body = client.get(f"/api/products/{product.id}?lang={lang}").json()

        assert body["specifications"] == []
        assert body["specifications_language"] == "en"


def test_source_language_ignores_the_spanish_specifications(
    client: TestClient, session: Session
) -> None:
    """lang=en, and no lang at all, give the English lines only."""
    product = create_product(session)
    create_specifications(session, product, ENGLISH, Language.EN)
    create_specifications(session, product, SPANISH, Language.ES)
    url = f"/api/products/{product.id}"

    explicit = client.get(url, params={"lang": "en"}).json()
    default = client.get(url).json()

    for body in (explicit, default):
        assert body["specifications"] == _as_response(ENGLISH)
        assert body["specifications_language"] == "en"


def test_spanish_only_specifications_are_not_sent_in_english(
    client: TestClient, session: Session
) -> None:
    """The fallback goes to the source language, never away from it."""
    product = create_product(session)
    create_specifications(session, product, SPANISH, Language.ES)

    body = client.get(f"/api/products/{product.id}?lang=en").json()

    assert body["specifications"] == []
    assert body["specifications_language"] == "en"


def test_list_returns_the_specifications_of_every_product(
    client: TestClient, session: Session
) -> None:
    """Each item of a page has its own list, chosen per product."""
    both = create_product(session)
    create_specifications(session, both, ENGLISH, Language.EN)
    create_specifications(session, both, SPANISH, Language.ES)
    english_only = create_product(session)
    create_specifications(
        session, english_only, [("Material", "Cotton")], Language.EN
    )
    create_product(session)

    body = client.get("/api/products", params={"lang": "es"}).json()

    first, second, third = body["items"]
    assert first["id"] == both.id
    assert first["specifications"] == _as_response(SPANISH)
    assert first["specifications_language"] == "es"
    assert second["specifications"] == _as_response([("Material", "Cotton")])
    assert second["specifications_language"] == "en"
    assert third["specifications"] == []
    assert third["specifications_language"] == "en"
    assert body["total"] == 3


def test_list_does_not_run_one_query_per_product(
    client: TestClient, session: Session
) -> None:
    """A page of 6 products costs the same 3 statements as a page of 1."""
    for _ in range(6):
        product = create_product(session)
        create_specifications(session, product, ENGLISH, Language.EN)
        create_specifications(session, product, SPANISH, Language.ES)

    one_product = _count_statements(client, lang="es", page_size=1)
    six_products = _count_statements(client, lang="es", page_size=6)

    # The count, the page and the specifications of the page.
    assert one_product == 3
    assert six_products == one_product


def test_search_does_not_read_the_specifications(
    client: TestClient, session: Session
) -> None:
    """A word that is only in a specification finds nothing."""
    product = create_product(session, title="Hard drive")
    create_specifications(session, product, ENGLISH, Language.EN)

    body = client.get("/api/products", params={"search": "capacity"}).json()

    assert body["items"] == []
    assert body["total"] == 0


def test_deleting_a_product_removes_its_specifications(
    session: Session,
) -> None:
    """ON DELETE CASCADE: no line is left without its product."""
    product = create_product(session)
    other = create_product(session)
    create_specifications(session, product, ENGLISH, Language.EN)
    create_specifications(session, product, SPANISH, Language.ES)
    create_specifications(session, other, [("Material", "Oro")])

    session.execute(delete(Product).where(Product.id == product.id))
    session.commit()

    remaining = session.scalars(select(ProductSpecification.product_id)).all()
    assert remaining == [other.id]
