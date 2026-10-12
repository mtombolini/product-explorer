"""Unit tests of ProductService with a repository that needs no database.

The service only talks to its repository, so its rules (pagination
maths, filter clean-up, not found) can be checked in memory.
"""

import pytest

from app.models import Product, ProductSort
from app.services.exceptions import ProductNotFoundError
from app.services.product_service import ProductService


class FakeProductRepository:
    """Stand-in for ProductRepository that records what it is asked."""

    def __init__(self, total: int = 0, product: Product | None = None) -> None:
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
        sort: ProductSort | None = None,
    ) -> tuple[list[Product], int]:
        """Remember the arguments and return no rows with the total."""
        self.received = {
            "search": search,
            "category": category,
            "limit": limit,
            "offset": offset,
            "sort": sort,
        }
        return [], self.total

    def get_by_id(self, product_id: int) -> Product | None:
        """Return the configured product, whatever the id."""
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


def test_get_product_returns_the_product() -> None:
    """An existing product is passed through."""
    product = Product(id=5, title="Backpack")

    service = ProductService(FakeProductRepository(product=product))

    found = service.get_product(5)

    assert found is product


def test_get_product_raises_when_it_does_not_exist() -> None:
    """A missing product becomes a domain error with the id."""
    service = ProductService(FakeProductRepository(product=None))

    with pytest.raises(ProductNotFoundError) as raised:
        service.get_product(42)

    assert raised.value.product_id == 42
    assert str(raised.value) == "Product 42 was not found."
