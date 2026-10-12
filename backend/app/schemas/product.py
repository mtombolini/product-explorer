"""Pydantic models of the product responses of the API."""

from pydantic import BaseModel, Field

from app.models import Product

# The public path under which the stored image files are served.
IMAGES_URL_PREFIX = "/images"


class ProductResponse(BaseModel):
    """One product as the API returns it.

    The Fake Store id and the timestamps are internal and not exposed.
    """

    id: int
    title: str
    description: str
    price: float
    category: str
    image_url: str | None = Field(
        description="Path of the image on this server, or null when the "
        "product has no image and the client shows a placeholder."
    )
    rating_rate: float | None
    rating_count: int | None

    @classmethod
    def from_product(cls, product: Product) -> "ProductResponse":
        """Build the response from a database row."""
        image_url = None
        if product.image_path:
            image_url = f"{IMAGES_URL_PREFIX}/{product.image_path}"
        return cls(
            id=product.id,
            title=product.title,
            description=product.description,
            price=product.price,
            category=product.category,
            image_url=image_url,
            rating_rate=product.rating_rate,
            rating_count=product.rating_count,
        )


class ProductListResponse(BaseModel):
    """One page of products with the pagination metadata."""

    items: list[ProductResponse]
    total: int = Field(description="Products that match the filters.")
    page: int
    page_size: int
    total_pages: int


class CategoryListResponse(BaseModel):
    """The distinct categories of the catalogue, sorted by name."""

    items: list[str]
