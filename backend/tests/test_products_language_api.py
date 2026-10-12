"""The ``lang`` parameter: product text in the requested language."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import Product, ProductTranslation
from tests.factories import create_product, create_translation


def _titles(client: TestClient, **params: object) -> list[str]:
    """Return the titles of one page, in the order the API sends them."""
    body = client.get("/api/products", params=params).json()
    return [item["title"] for item in body["items"]]


def test_list_returns_the_translated_text(
    client: TestClient, session: Session
) -> None:
    """lang=es gives the Spanish title and description, marked "es"."""
    product = create_product(session, title="Backpack", description="Big")
    create_translation(session, product, "Mochila", "Grande")

    body = client.get("/api/products", params={"lang": "es"}).json()

    (item,) = body["items"]
    assert item["id"] == product.id
    assert item["title"] == "Mochila"
    assert item["description"] == "Grande"
    assert item["language"] == "es"


def test_product_without_translation_falls_back_to_the_original(
    client: TestClient, session: Session
) -> None:
    """The fallback is per product and says which language was sent."""
    translated = create_product(session, title="Backpack")
    create_product(session, title="Gold ring", description="Shiny")
    create_translation(session, translated, "Mochila")

    body = client.get("/api/products", params={"lang": "es"}).json()

    first, second = body["items"]
    assert (first["title"], first["language"]) == ("Mochila", "es")
    assert (second["title"], second["language"]) == ("Gold ring", "en")
    assert second["description"] == "Shiny"
    assert body["total"] == 2


def test_source_language_returns_the_original_text(
    client: TestClient, session: Session
) -> None:
    """lang=en, and no lang at all, ignore an existing translation."""
    product = create_product(session, title="Backpack", description="Big")
    create_translation(session, product, "Mochila", "Grande")

    explicit = client.get("/api/products", params={"lang": "en"}).json()
    default = client.get("/api/products").json()

    for body in (explicit, default):
        (item,) = body["items"]
        assert item["title"] == "Backpack"
        assert item["description"] == "Big"
        assert item["language"] == "en"


def test_product_endpoint_returns_the_requested_language(
    client: TestClient, session: Session
) -> None:
    """One product: translated with lang=es, original otherwise."""
    product = create_product(session, title="Backpack", description="Big")
    create_translation(session, product, "Mochila", "Grande")
    url = f"/api/products/{product.id}"

    spanish = client.get(url, params={"lang": "es"}).json()
    english = client.get(url, params={"lang": "en"}).json()
    default = client.get(url).json()

    assert spanish["title"] == "Mochila"
    assert spanish["description"] == "Grande"
    assert spanish["language"] == "es"
    assert english["title"] == "Backpack"
    assert english["language"] == "en"
    assert default == english
    # Only the text changes with the language.
    for field in ("id", "price", "category", "image_url", "rating_rate"):
        assert spanish[field] == english[field]


def test_product_endpoint_falls_back_to_the_original(
    client: TestClient, session: Session
) -> None:
    """One product without a translation is sent in the source language."""
    product = create_product(session, title="Backpack")

    response = client.get(f"/api/products/{product.id}?lang=es")

    assert response.status_code == 200
    assert response.json()["title"] == "Backpack"
    assert response.json()["language"] == "en"


def test_unknown_product_is_404_in_any_language(client: TestClient) -> None:
    """The language does not change the not-found rule."""
    response = client.get("/api/products/999?lang=es")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "product_not_found"


def test_search_reads_the_text_of_the_requested_language(
    client: TestClient, session: Session
) -> None:
    """A Spanish word is found with lang=es and not with lang=en."""
    product = create_product(session, title="Backpack", description="Big")
    create_translation(session, product, "Mochila", "Muy grande")
    create_product(session, title="Gold ring")

    by_title = client.get(
        "/api/products", params={"lang": "es", "search": "MOCHILA"}
    ).json()
    by_description = _titles(client, lang="es", search="grande")
    in_english = client.get(
        "/api/products", params={"lang": "en", "search": "mochila"}
    ).json()

    assert [item["id"] for item in by_title["items"]] == [product.id]
    assert by_title["total"] == 1
    assert by_description == ["Mochila"]
    assert in_english["items"] == []
    assert in_english["total"] == 0


def test_search_does_not_read_the_original_of_a_translated_product(
    client: TestClient, session: Session
) -> None:
    """With lang=es a translated product is found by what is shown."""
    product = create_product(session, title="Backpack")
    create_translation(session, product, "Mochila")

    assert _titles(client, lang="es", search="backpack") == []
    assert _titles(client, lang="en", search="backpack") == ["Backpack"]


def test_search_finds_untranslated_products_by_their_original_text(
    client: TestClient, session: Session
) -> None:
    """With lang=es a product without a translation is still searchable."""
    translated = create_product(session, title="Backpack")
    create_translation(session, translated, "Mochila")
    create_product(session, title="Gold ring", description="Shiny")

    body = client.get(
        "/api/products", params={"lang": "es", "search": "shiny"}
    ).json()

    assert [item["title"] for item in body["items"]] == ["Gold ring"]
    assert body["items"][0]["language"] == "en"
    assert body["total"] == 1


def test_sort_and_pagination_work_with_a_language(
    client: TestClient, session: Session
) -> None:
    """Translations do not repeat, drop or reorder products."""
    for number, price in enumerate(("30.00", "10.00", "20.00"), start=1):
        product = create_product(
            session, title=f"Product {number}", price=Decimal(price)
        )
        create_translation(session, product, f"Producto {number}")
    create_product(session, title="Product 4", price=Decimal("5.00"))

    pages = [
        client.get(
            "/api/products",
            params={
                "lang": "es",
                "sort": "price_asc",
                "page": page,
                "page_size": 3,
            },
        ).json()
        for page in (1, 2)
    ]

    assert [item["title"] for item in pages[0]["items"]] == [
        "Product 4",
        "Producto 2",
        "Producto 3",
    ]
    assert [item["title"] for item in pages[1]["items"]] == ["Producto 1"]
    assert pages[0]["total"] == 4
    assert pages[0]["total_pages"] == 2


def test_category_filter_keeps_the_original_value(
    client: TestClient, session: Session
) -> None:
    """Categories are keys: they are not translated by the API."""
    product = create_product(session, category="jewelery")
    create_translation(session, product, "Anillo")
    create_product(session, category="electronics")

    body = client.get(
        "/api/products", params={"lang": "es", "category": "jewelery"}
    ).json()

    (item,) = body["items"]
    assert item["title"] == "Anillo"
    assert item["category"] == "jewelery"


def test_deleting_a_product_removes_its_translations(
    session: Session,
) -> None:
    """ON DELETE CASCADE: no translation is left without its product."""
    product = create_product(session)
    other = create_product(session)
    create_translation(session, product, "Mochila")
    create_translation(session, other, "Anillo")

    session.execute(delete(Product).where(Product.id == product.id))
    session.commit()

    remaining = session.scalars(select(ProductTranslation.product_id)).all()
    assert remaining == [other.id]
    assert session.scalar(select(func.count()).select_from(Product)) == 1


def test_search_ignores_accents_in_both_directions(
    client: TestClient, session: Session
) -> None:
    """A search without the accent finds the accented text, and back."""
    create_product(session, title="Camiseta de algodón")
    create_product(session, title="Cotton shirt")
    create_product(session, title="Pantalon de lino")

    without_accent = client.get("/api/products", params={"search": "algodon"})
    upper_case = client.get("/api/products", params={"search": "ALGODÓN"})
    with_accent = client.get("/api/products", params={"search": "pantalón"})

    assert [p["title"] for p in without_accent.json()["items"]] == [
        "Camiseta de algodón"
    ]
    assert upper_case.json()["total"] == 1
    assert [p["title"] for p in with_accent.json()["items"]] == [
        "Pantalon de lino"
    ]


def test_search_without_accents_reads_the_translation(
    client: TestClient, session: Session
) -> None:
    """The accent rule applies to the translated text as well."""
    product = create_product(session, title="Cotton jacket")
    create_translation(
        session, product, title="Chaqueta de algodón", description=""
    )

    spanish = client.get(
        "/api/products", params={"lang": "es", "search": "algodon"}
    )
    english = client.get(
        "/api/products", params={"lang": "en", "search": "algodon"}
    )

    assert spanish.json()["total"] == 1
    assert english.json()["total"] == 0
