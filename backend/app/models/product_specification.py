"""ORM model of the product_specifications table."""

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProductSpecification(Base):
    """One line of the specifications of a product in one language.

    A line is one attribute of the taxonomy with the value this product
    has for it, for example "Capacity: 2 TB". Every product of a family
    has the same lines in the same order, so ``value`` is None when the
    source says nothing about that attribute. The primary key is
    (product, language, position): the position is the place of the
    line in the list of that language, starting at 1.
    """

    __tablename__ = "product_specifications"

    # ON DELETE CASCADE: the specifications disappear with their product.
    product_id: Mapped[int] = mapped_column(
        ForeignKey(
            "products.id",
            name="fk_product_specifications_product_id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    # A value of the Language enum. Unlike the translations, the source
    # language has rows here too: Fake Store sends no specifications.
    language: Mapped[str] = mapped_column(String(8), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
    # The key of the attribute in the taxonomy, the same in every
    # language ("capacity").
    attribute: Mapped[str] = mapped_column(String(50))
    # The name of the group the attribute belongs to, in this language:
    # "General" or the family of the product ("Storage").
    group_label: Mapped[str] = mapped_column(String(100))
    label: Mapped[str] = mapped_column(String(100))
    value: Mapped[str | None] = mapped_column(String(255))
