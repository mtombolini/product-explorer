"""Product endpoints: the paginated list and one product."""

from typing import Annotated

from fastapi import APIRouter, Path, Query

from app.api.dependencies import ProductServiceDependency
from app.api.errors import NOT_FOUND_RESPONSE, VALIDATION_ERROR_RESPONSE
from app.schemas.product import ProductListResponse, ProductResponse

DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 48
# Upper bounds that keep the SQL OFFSET and the id inside the ranges
# PostgreSQL accepts, so a huge number is a 422 and not a database error.
MAX_PAGE = 1_000_000
MAX_PRODUCT_ID = 2_147_483_647
MAX_FILTER_LENGTH = 100

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get(
    "",
    summary="List products",
    responses=VALIDATION_ERROR_RESPONSE,
)
def list_products(
    service: ProductServiceDependency,
    page: Annotated[
        int, Query(ge=1, le=MAX_PAGE, description="Page number, from 1.")
    ] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=MAX_PAGE_SIZE, description="Products per page.")
    ] = DEFAULT_PAGE_SIZE,
    search: Annotated[
        str | None,
        Query(
            max_length=MAX_FILTER_LENGTH,
            description="Text to find in the title or the description, "
            "ignoring case. Blank means no search.",
        ),
    ] = None,
    category: Annotated[
        str | None,
        Query(
            max_length=MAX_FILTER_LENGTH,
            description="Exact category name, as returned by /api/categories.",
        ),
    ] = None,
) -> ProductListResponse:
    """Return one page of the catalogue, ordered by id.

    A page after the last one answers 200 with an empty list.
    """
    result = service.list_products(
        page=page, page_size=page_size, search=search, category=category
    )
    return ProductListResponse(
        items=[ProductResponse.from_product(item) for item in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        total_pages=result.total_pages,
    )


@router.get(
    "/{product_id}",
    summary="Get one product",
    responses=NOT_FOUND_RESPONSE | VALIDATION_ERROR_RESPONSE,
)
def read_product(
    service: ProductServiceDependency,
    product_id: Annotated[int, Path(ge=1, le=MAX_PRODUCT_ID)],
) -> ProductResponse:
    """Return the product with the given id, or 404."""
    return ProductResponse.from_product(service.get_product(product_id))
