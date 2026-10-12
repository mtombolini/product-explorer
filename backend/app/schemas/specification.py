"""Pydantic models that validate the bundled product specifications."""

from pydantic import BaseModel, ConfigDict, Field, RootModel

from app.schemas.fakestore import NO_NUL_PATTERN

# A product page shows a short list. More lines than this is a mistake
# in the file, not a real product.
MAX_SPECIFICATIONS = 20


class SpecificationItem(BaseModel):
    """One line of a specification list, as a file provides it.

    The bounds match the columns of the product_specifications table.
    """

    # Surrounding spaces are removed before the length checks, so a
    # label made only of spaces is rejected as empty.
    model_config = ConfigDict(str_strip_whitespace=True)

    label: str = Field(min_length=1, max_length=100, pattern=NO_NUL_PATTERN)
    value: str = Field(min_length=1, max_length=255, pattern=NO_NUL_PATTERN)


class SpecificationList(RootModel[list[SpecificationItem]]):
    """The specifications of one product in one language, in order.

    The entry of a product is validated as a whole: one invalid line
    makes the loader skip the product, so a list is never stored with
    a line missing.
    """

    root: list[SpecificationItem] = Field(
        min_length=1, max_length=MAX_SPECIFICATIONS
    )
