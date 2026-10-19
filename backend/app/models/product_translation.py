"""ORM model of the product_translations table."""

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProductTranslation(Base):
    """The title and description of one product in one language.

    The primary key is the pair (product, language): a product has at
    most one translation per language.
    """

    __tablename__ = "product_translations"

    # ON DELETE CASCADE: the translations disappear with their product.
    product_id: Mapped[int] = mapped_column(
        ForeignKey(
            "products.id",
            name="fk_product_translations_product_id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    # A value of the Language enum, for example "es".
    language: Mapped[str] = mapped_column(String(8), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, server_default="")
