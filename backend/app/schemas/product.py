"""Pydantic models of the product responses of the API."""

from pydantic import BaseModel, Field

from app.models import SOURCE_LANGUAGE, Language, LocalizedProduct

# The public path under which the stored image files are served.
IMAGES_URL_PREFIX = "/images"


class SpecificationResponse(BaseModel):
    """One line of the specifications of a product: "label: value".

    The products of one family have the same lines in the same order.
    """

    key: str = Field(
        description="Key of the attribute, the same in every language."
    )
    group: str = Field(
        description='Name of the group of the attribute: "General" or '
        "the family of the product."
    )
    label: str
    value: str | None = Field(
        description="Null when the source says nothing about it."
    )


class ProductResponse(BaseModel):
    """One product as the API returns it.

    The Fake Store id and the timestamps are internal and not exposed.
    """

    id: int
    title: str
    description: str
    language: Language = Field(
        description="Language of the title and the description: the "
        "requested one, or the source language when the product has no "
        "translation."
    )
    price: float
    category: str
    image_url: str | None = Field(
        description="Path of the image on this server, or null when the "
        "product has no image and the client shows a placeholder."
    )
    rating_rate: float | None
    rating_count: int | None
    specifications: list[SpecificationResponse] = Field(
        description="The attributes of the family of the product, in "
        "display order. Empty when the product has none."
    )
    specifications_language: Language = Field(
        description="Language of the specifications: the requested one, "
        "or the source language when the product has none in it."
    )

    @classmethod
    def from_product(cls, localized: LocalizedProduct) -> "ProductResponse":
        """Build the response from a product and its localized parts.

        The translated text is used when there is one, otherwise the
        original, and ``language`` says which of the two was returned.
        The specifications arrive already chosen (see
        ``LocalizedProduct``): ``specifications_language`` is the
        language of those lines, read from the first one.
        """
        product = localized.product
        translation = localized.translation
        if translation is None:
            title = product.title
            description = product.description
            language = SOURCE_LANGUAGE
        else:
            title = translation.title
            description = translation.description
            language = Language(translation.language)
        specifications = localized.specifications
        specifications_language = SOURCE_LANGUAGE
        if specifications:
            specifications_language = Language(specifications[0].language)
        image_url = None
        if product.image_path:
            image_url = f"{IMAGES_URL_PREFIX}/{product.image_path}"
        return cls(
            id=product.id,
            title=title,
            description=description,
            language=language,
            price=product.price,
            category=product.category,
            image_url=image_url,
            rating_rate=product.rating_rate,
            rating_count=product.rating_count,
            specifications=[
                SpecificationResponse(
                    key=item.attribute,
                    group=item.group_label,
                    label=item.label,
                    value=item.value,
                )
                for item in specifications
            ],
            specifications_language=specifications_language,
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
