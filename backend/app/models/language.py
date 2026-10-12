"""The languages in which the product text can be returned."""

from enum import StrEnum


class Language(StrEnum):
    """A language of the product titles and descriptions.

    The values are the ones the API accepts in its ``lang`` parameter
    and the ones stored in ``product_translations.language``.
    """

    EN = "en"
    ES = "es"


# The language of the text imported from Fake Store. It is stored in the
# products table itself, so it never has a row in product_translations.
SOURCE_LANGUAGE = Language.EN
