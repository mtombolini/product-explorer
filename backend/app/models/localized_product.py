"""A product together with its text in the requested language."""

from dataclasses import dataclass

from app.models.product import Product
from app.models.product_translation import ProductTranslation


@dataclass(frozen=True)
class LocalizedProduct:
    """One product and its translation, as the repository reads them.

    ``translation`` is None when the product has no text in the
    requested language. The original text of ``product`` is used then.
    """

    product: Product
    translation: ProductTranslation | None
