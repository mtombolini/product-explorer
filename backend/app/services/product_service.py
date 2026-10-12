"""Business rules for reading the catalogue."""

import math
from dataclasses import dataclass

from app.models import Product, ProductSort
from app.repositories.product_repository import ProductRepository
from app.services.exceptions import ProductNotFoundError


@dataclass(frozen=True)
class ProductPage:
    """One page of products with the pagination metadata."""

    items: list[Product]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductService:
    """Read products and categories for the API."""

    def __init__(self, repository: ProductRepository) -> None:
        """Create the service on a product repository."""
        self._repository = repository

    def list_products(
        self,
        page: int,
        page_size: int,
        search: str | None = None,
        category: str | None = None,
        sort: ProductSort | None = None,
    ) -> ProductPage:
        """Return the requested page of the filtered catalogue.

        A page after the last one is not an error: it has no items and
        keeps the real totals, so the client can offer a way back.
        """
        products, total = self._repository.list_page(
            search=_clean(search),
            category=_clean(category),
            limit=page_size,
            offset=(page - 1) * page_size,
            sort=sort,
        )
        return ProductPage(
            items=products,
            total=total,
            page=page,
            page_size=page_size,
            # 0 products -> 0 pages; 20 products of 12 -> 2 pages.
            total_pages=math.ceil(total / page_size),
        )

    def get_product(self, product_id: int) -> Product:
        """Return one product or raise ``ProductNotFoundError``."""
        product = self._repository.get_by_id(product_id)
        if product is None:
            raise ProductNotFoundError(product_id)
        return product

    def list_categories(self) -> list[str]:
        """Return the distinct categories, sorted by name."""
        return self._repository.list_categories()


def _clean(text: str | None) -> str | None:
    """Trim a filter value. A blank value means "no filter"."""
    if text is None:
        return None
    return text.strip() or None
