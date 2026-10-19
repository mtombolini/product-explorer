"""Unit tests of ProductService with a repository that needs no database.

The service only talks to its repository, so its rules (pagination
maths, filter clean-up, not found) can be checked in memory.
"""

from decimal import Decimal

import pytest

from app.models import Language, LocalizedProduct, Product, ProductSort
from app.services.exceptions import ProductNotFoundError
from app.services.product_service import ProductService


class FakeProductRepository:
    """Stand-in for ProductRepository that records what it is asked."""

    def __init__(
        self, total: int = 0, product: LocalizedProduct | None = None
    ) -> None:
        """Set what the repository will answer."""
        self.total = total
        self.product = product
        self.received: dict[str, object] = {}

    def list_page(
        self,
        search: str | None,
        category: str | None,
        limit: int,
        offset: int,
        language: Language,
        sort: ProductSort | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
    ) -> tuple[list[LocalizedProduct], int]:
        """Remember the arguments and return no rows with the total."""
        self.received = {
            "search": search,
            "category": category,
            "limit": limit,
            "offset": offset,
            "language": language,
            "sort": sort,
            "min_price": min_price,
            "max_price": max_price,
        }
        return [], self.total

    def get_by_id(
        self, product_id: int, language: Language
    ) -> LocalizedProduct | None:
        """Remember the language and return the configured product."""
        self.received = {"product_id": product_id, "language": language}
        return self.product


def test_page_and_page_size_become_limit_and_offset() -> None:
    """Page 3 of 10 skips the first 20 products."""
    repository = FakeProductRepository(total=25)

    page = ProductService(repository).list_products(page=3, page_size=10)

    assert repository.received["limit"] == 10
    assert repository.received["offset"] == 20
    assert page.total == 25
    assert page.total_pages == 3


@pytest.mark.parametrize(
    ("total", "page_size", "total_pages"),
    [(0, 12, 0), (1, 12, 1), (12, 12, 1), (13, 12, 2), (20, 12, 2)],
)
def test_total_pages_rounds_up(
    total: int, page_size: int, total_pages: int
) -> None:
    """A partial last page still counts as a page."""
    repository = FakeProductRepository(total=total)

    page = ProductService(repository).list_products(1, page_size)

    assert page.total_pages == total_pages


def test_filters_are_trimmed_and_blank_means_none() -> None:
    """Spaces around a filter are removed; only spaces is no filter."""
    repository = FakeProductRepository()

    ProductService(repository).list_products(
        page=1, page_size=12, search="  shirt ", category="   "
    )

    assert repository.received["search"] == "shirt"
    assert repository.received["category"] is None


def test_sort_is_passed_to_the_repository() -> None:
    """The service does not order anything itself."""
    repository = FakeProductRepository()
    service = ProductService(repository)

    service.list_products(page=1, page_size=12)
    assert repository.received["sort"] is None

    service.list_products(page=1, page_size=12, sort=ProductSort.PRICE_DESC)
    assert repository.received["sort"] is ProductSort.PRICE_DESC


def test_language_is_passed_to_the_repository() -> None:
    """The service does not translate: it asks for the source or for lang."""
    repository = FakeProductRepository()
    service = ProductService(repository)

    service.list_products(page=1, page_size=12)
    assert repository.received["language"] is Language.EN

    service.list_products(page=1, page_size=12, language=Language.ES)
    assert repository.received["language"] is Language.ES


def test_get_product_returns_the_product() -> None:
    """An existing product is passed through, in the language asked."""
    product = LocalizedProduct(
        product=Product(id=5, title="Backpack"),
        translation=None,
        specifications=[],
    )
    repository = FakeProductRepository(product=product)

    found = ProductService(repository).get_product(5, language=Language.ES)

    assert found is product
    assert repository.received == {"product_id": 5, "language": Language.ES}


def test_get_product_raises_when_it_does_not_exist() -> None:
    """A missing product becomes a domain error with the id."""
    service = ProductService(FakeProductRepository(product=None))

    with pytest.raises(ProductNotFoundError) as raised:
        service.get_product(42)

    assert raised.value.product_id == 42
    assert str(raised.value) == "Product 42 was not found."
