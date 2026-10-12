"""Pydantic models that validate the records sent by Fake Store."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

# The largest value that fits in the NUMERIC(10, 2) price column.
MAX_PRICE = Decimal("99999999.99")


class FakeStoreRating(BaseModel):
    """The rating object nested in a Fake Store product."""

    rate: Decimal = Field(ge=0, le=5)
    count: int = Field(ge=0)


class FakeStoreProduct(BaseModel):
    """One product as Fake Store sends it.

    ``id``, ``title``, ``price`` and ``category`` are required. A record
    that fails this validation is skipped by the import. The bounds
    match the columns of the products table.
    """

    # Surrounding spaces are removed before the length checks, so a
    # title made only of spaces is rejected as empty.
    model_config = ConfigDict(str_strip_whitespace=True)

    id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    price: Decimal = Field(ge=0, le=MAX_PRICE)
    category: str = Field(min_length=1, max_length=100)
    description: str = ""
    image: str | None = None
    rating: FakeStoreRating | None = None
