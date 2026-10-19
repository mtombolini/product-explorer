"""Pydantic models that validate the bundled product specifications."""

from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import Language
from app.schemas.fakestore import NO_NUL_PATTERN

# The key of the group of attributes that every product has.
GENERAL_GROUP = "general"

# Surrounding spaces are removed before the length checks, so a text
# made only of spaces is rejected as empty.
_STRIPPED = ConfigDict(str_strip_whitespace=True)

# The bounds match the columns of the product_specifications table.
Key = Annotated[str, Field(min_length=1, max_length=50, pattern=r"^[a-z_]+$")]
Label = Annotated[
    str, Field(min_length=1, max_length=100, pattern=NO_NUL_PATTERN)
]
Value = Annotated[
    str, Field(min_length=1, max_length=255, pattern=NO_NUL_PATTERN)
]


class Taxonomy(BaseModel):
    """The attributes a product can have, and their names.

    ``general`` are the attributes of every product. ``families`` gives
    the extra attributes of each family of products ("storage"). Both
    are in display order. ``labels`` gives, for every language, the
    name of the general group, of every family and of every attribute.
    """

    model_config = _STRIPPED

    general: list[Key] = Field(min_length=1)
    families: dict[Key, list[Key]]
    labels: dict[Language, dict[Key, Label]]

    @model_validator(mode="after")
    def _check_labels(self) -> Self:
        """Reject a taxonomy with a name missing in some language."""
        keys = {GENERAL_GROUP, *self.general, *self.families}
        for attributes in self.families.values():
            keys.update(attributes)
        for language in Language:
            missing = keys - set(self.labels.get(language, {}))
            if missing:
                raise ValueError(
                    f"labels without a name in {language.value}: "
                    f"{sorted(missing)}"
                )
        return self

    def attributes_of(self, family: str) -> list[tuple[str, str]]:
        """Return (group, attribute) for every line of a family.

        The general attributes come first, then the ones of the family.
        """
        return [(GENERAL_GROUP, key) for key in self.general] + [
            (family, key) for key in self.families[family]
        ]


class ProductValues(BaseModel):
    """The family of one product and the values of its attributes.

    A value is one text for every language ("2 TB") or one text per
    language. An attribute that is not listed has no value: the source
    says nothing about it.
    """

    model_config = _STRIPPED

    family: Key
    values: dict[Key, Value | dict[Language, Value]]

    @model_validator(mode="after")
    def _check_languages(self) -> Self:
        """Reject a value that is not written in every language."""
        for key, value in self.values.items():
            if isinstance(value, dict) and set(value) != set(Language):
                raise ValueError(f"{key} is not in every language")
        return self

    def value_in(self, key: str, language: Language) -> str | None:
        """Return the value of an attribute in a language, or None."""
        value = self.values.get(key)
        if isinstance(value, dict):
            return value[language]
        return value
