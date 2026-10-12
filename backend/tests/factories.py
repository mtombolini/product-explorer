"""Create product rows for the API tests."""

from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Product


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
