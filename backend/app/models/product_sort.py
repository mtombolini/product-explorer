"""The orders in which a list of products can be returned."""

from enum import StrEnum


class ProductSort(StrEnum):
    """How to order a product list.

    The values are the ones the API accepts in its ``sort`` parameter.
    Without a sort, products are listed by id.
    """

    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    # Best rated first; products without a rating go last.
    RATING_DESC = "rating_desc"
