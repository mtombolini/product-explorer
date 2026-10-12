"""Data access of the products table."""

from typing import Any

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Product, ProductSort

# The columns that an import run overwrites when the product already
# exists. image_path is not in the list: it belongs to the image step.
UPSERT_UPDATED_COLUMNS = (
    "title",
    "description",
    "price",
    "category",
    "rating_rate",
    "rating_count",
)


class ProductRepository:
    """Queries and writes of products. The only SQL of the application."""

    def __init__(self, session: Session) -> None:
        """Create the repository on an open session."""
        self._session = session

    def count(self) -> int:
        """Return the number of products."""
        statement = select(func.count()).select_from(Product)
        return self._session.scalar(statement) or 0

    def list_page(
        self,
        search: str | None,
        category: str | None,
        limit: int,
        offset: int,
        sort: ProductSort | None = None,
    ) -> tuple[list[Product], int]:
        """Return one page of products and the total that match.

        ``search`` is matched anywhere in the title or the description,
        ignoring case. ``category`` must match exactly. Without ``sort``
        products are ordered by id.
        """
        filters = []
        if search:
            # autoescape: a % or _ typed by the user is matched as that
            # character, not as a LIKE wildcard.
            filters.append(
                or_(
                    Product.title.icontains(search, autoescape=True),
                    Product.description.icontains(search, autoescape=True),
                )
            )
        if category:
            filters.append(Product.category == category)

        count_statement = (
            select(func.count()).select_from(Product).where(*filters)
        )
        total = self._session.scalar(count_statement) or 0

        # The id is always the last sort key. Products with the same
        # price then keep a fixed order, so two pages never show the same
        # product and none is skipped.
        if sort is ProductSort.PRICE_ASC:
            order = (Product.price.asc(), Product.id)
        elif sort is ProductSort.PRICE_DESC:
            order = (Product.price.desc(), Product.id)
        else:
            order = (Product.id,)

        page_statement = (
            select(Product)
            .where(*filters)
            .order_by(*order)
            .limit(limit)
            .offset(offset)
        )
        products = list(self._session.scalars(page_statement))
        return products, total

    def get_by_id(self, product_id: int) -> Product | None:
        """Return one product, or None when the id does not exist."""
        return self._session.get(Product, product_id)

    def list_categories(self) -> list[str]:
        """Return the distinct categories, sorted by name."""
        statement = (
            select(Product.category).distinct().order_by(Product.category)
        )
        return list(self._session.scalars(statement))

    def upsert_many(self, rows: list[dict[str, Any]]) -> None:
        """Insert or update products by external_id in one transaction.

        Each row is a dictionary of column values that must include
        ``external_id``. An existing product keeps its id, created_at
        and image_path.
        """
        if not rows:
            return
        statement = insert(Product).values(rows)
        new_values = {
            column: statement.excluded[column]
            for column in UPSERT_UPDATED_COLUMNS
        }
        new_values["updated_at"] = func.now()
        statement = statement.on_conflict_do_update(
            index_elements=[Product.external_id], set_=new_values
        )
        self._session.execute(statement)
        self._session.commit()

    def get_image_paths(self) -> dict[int, str | None]:
        """Return the image_path of every product, by external_id."""
        statement = select(Product.external_id, Product.image_path)
        rows = self._session.execute(statement).all()
        return {row.external_id: row.image_path for row in rows}

    def set_image_path(self, external_id: int, image_path: str) -> None:
        """Record the stored image file of one product."""
        statement = (
            update(Product)
            .where(Product.external_id == external_id)
            .values(image_path=image_path)
        )
        self._session.execute(statement)
        self._session.commit()
