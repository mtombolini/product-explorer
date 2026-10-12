"""Pydantic model that validates the bundled product translations."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.fakestore import NO_NUL_PATTERN


class TranslationEntry(BaseModel):
    """The text of one product in one language, as a file provides it.

    The rules are the ones of the imported text (see
    ``FakeStoreProduct``) and match the product_translations columns.
    An entry that fails this validation is skipped by the loader.
    """

    # Surrounding spaces are removed before the length checks, so a
    # title made only of spaces is rejected as empty.
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=255, pattern=NO_NUL_PATTERN)
    description: str = Field(default="", pattern=NO_NUL_PATTERN)
