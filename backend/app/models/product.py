"""ORM model of the products table."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Product(Base):
    """A product of the catalogue, imported from Fake Store."""

    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("external_id", name="uq_products_external_id"),
        CheckConstraint("price >= 0", name="ck_products_price"),
        CheckConstraint(
            "rating_rate >= 0 AND rating_rate <= 5",
            name="ck_products_rating_rate",
        ),
        CheckConstraint("rating_count >= 0", name="ck_products_rating_count"),
    )

    # The id exposed by our API.
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # The Fake Store id: the key of the import upsert.
    external_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, server_default="")
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    category: Mapped[str] = mapped_column(String(100), index=True)
    # File name inside IMAGES_DIR. NULL means "show the placeholder".
    image_path: Mapped[str | None] = mapped_column(String(255))
    rating_rate: Mapped[Decimal | None] = mapped_column(Numeric(2, 1))
    rating_count: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
