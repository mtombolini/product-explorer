"""Category endpoint: the values of the catalogue filter."""

from fastapi import APIRouter

from app.api.dependencies import ProductServiceDependency
from app.schemas.product import CategoryListResponse

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", summary="List categories")
def list_categories(
    service: ProductServiceDependency,
) -> CategoryListResponse:
    """Return the distinct product categories, sorted by name."""
    return CategoryListResponse(items=service.list_categories())
