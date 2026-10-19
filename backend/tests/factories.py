"""Create product, translation and specification rows for the tests."""

from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Language,
    Product,
    ProductSpecification,
    ProductTranslation,
)


def create_product(session: Session, **overrides: Any) -> Product:
    """Insert one product and return it with its generated id.

    Every column has a default, so a test only passes what it cares
    about. ``external_id`` defaults to the next free number.
    """
    existing = session.scalar(select(func.count()).select_from(Product))
    next_number = (existing or 0) + 1
    values: dict[str, Any] = {
        "external_id": next_number,
        "title": f"Product {next_number}",
        "description": f"Description of product {next_number}",
        "price": Decimal("10.50"),
        "category": "electronics",
        "image_path": None,
        "rating_rate": Decimal("4.1"),
        "rating_count": 25,
    }
    values.update(overrides)
    product = Product(**values)
    session.add(product)
    session.commit()
    return product


def create_products(session: Session, count: int, **overrides: Any) -> None:
    """Insert ``count`` products that share the given column values."""
    for _ in range(count):
        create_product(session, **overrides)


def create_translation(
    session: Session,
    product: Product,
    title: str,
    description: str = "",
    language: Language = Language.ES,
) -> None:
    """Insert the text of one product in another language."""
    translation = ProductTranslation(
        product_id=product.id,
        language=language.value,
        title=title,
        description=description,
    )
    session.add(translation)
    session.commit()


def create_specifications(
    session: Session,
    product: Product,
    items: list[tuple[str, str | None]],
    language: Language = Language.ES,
    group: str = "General",
) -> None:
    """Insert the specification list of one product in one language.

    ``items`` are (label, value) pairs in display order. The attribute
    key is the label in lower case.
    """
    for position, (label, value) in enumerate(items, start=1):
        session.add(
            ProductSpecification(
                product_id=product.id,
                language=language.value,
                position=position,
                attribute=label.lower(),
                group_label=group,
                label=label,
                value=value,
            )
        )
    session.commit()
