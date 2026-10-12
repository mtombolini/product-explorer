"""Pydantic models that validate the records sent by Fake Store."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

# The largest value that fits in the NUMERIC(10, 2) price column.
MAX_PRICE = Decimal("99999999.99")
# The largest value that fits in an INTEGER column.
MAX_INTEGER = 2_147_483_647
# PostgreSQL text cannot hold the NUL character.
NO_NUL_PATTERN = r"^[^\x00]*$"


class FakeStoreRating(BaseModel):
    """The rating object nested in a Fake Store product."""

    rate: Decimal = Field(ge=0, le=5)
    count: int = Field(ge=0, le=MAX_INTEGER)


class FakeStoreProduct(BaseModel):
    """One product as Fake Store sends it.

    ``id``, ``title``, ``price`` and ``category`` are required. A record
    that fails this validation is skipped by the import. The bounds
    match the columns of the products table.
    """

    # Surrounding spaces are removed before the length checks, so a
    # title made only of spaces is rejected as empty.
    model_config = ConfigDict(str_strip_whitespace=True)

    id: int = Field(gt=0, le=MAX_INTEGER)
    title: str = Field(min_length=1, max_length=255, pattern=NO_NUL_PATTERN)
    price: Decimal = Field(ge=0, le=MAX_PRICE)
    category: str = Field(min_length=1, max_length=100, pattern=NO_NUL_PATTERN)
    description: str = Field(default="", pattern=NO_NUL_PATTERN)
    image: str | None = None
    rating: FakeStoreRating | None = None
