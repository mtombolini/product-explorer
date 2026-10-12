"""A product together with its text in the requested language."""

from dataclasses import dataclass

from app.models.product import Product
from app.models.product_specification import ProductSpecification
from app.models.product_translation import ProductTranslation


@dataclass(frozen=True)
class LocalizedProduct:
    """One product with its translation and its specifications.

    ``translation`` is None when the product has no text in the
    requested language. The original text of ``product`` is used then.

    ``specifications`` are the lines of one language, in display order:
    the requested language when the product has lines in it, otherwise
    the source language. The list is empty when it has none at all.
    """

    product: Product
    translation: ProductTranslation | None
    specifications: list[ProductSpecification]
