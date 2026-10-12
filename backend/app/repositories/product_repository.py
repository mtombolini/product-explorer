"""Data access of the products, translations and specifications."""

import unicodedata
from typing import Any

from sqlalchemy import (
    ColumnElement,
    and_,
    delete,
    func,
    or_,
    select,
    update,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import (
    SOURCE_LANGUAGE,
    Language,
    LocalizedProduct,
    Product,
    ProductSort,
    ProductSpecification,
    ProductTranslation,
)

# The columns that an import run overwrites when the product already
# exists. image_path is not in the list: it belongs to the image step.
UPSERT_UPDATED_COLUMNS = (
    "title",
    "description",
    "price",
    "category",
    "image_source_url",
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
        language: Language,
        sort: ProductSort | None = None,
    ) -> tuple[list[LocalizedProduct], int]:
        """Return one page of products and the total that match.

        Each product comes with its translation into ``language``, or
        with None when it has none, and with its specifications (see
        ``_specifications_by_product``). ``search`` is matched anywhere in
        the title or the description of that language, ignoring case and
        accents, and in the original text of a product without a
        translation.
        ``category`` must match exactly. Without ``sort`` products are
        ordered by id.
        """
        translation_join = _translation_join(language)
        filters = []
        if search:
            # COALESCE: the translated text when the join found a row,
            # otherwise the original.
            title = func.coalesce(ProductTranslation.title, Product.title)
            description = func.coalesce(
                ProductTranslation.description, Product.description
            )
            filters.append(
                or_(_contains(title, search), _contains(description, search))
            )
        if category:
            filters.append(Product.category == category)

        # The join never repeats a product: a product has at most one
        # translation per language, so the count stays correct.
        count_statement = (
            select(func.count())
            .select_from(Product)
            .outerjoin(ProductTranslation, translation_join)
            .where(*filters)
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
            select(Product, ProductTranslation)
            .outerjoin(ProductTranslation, translation_join)
            .where(*filters)
            .order_by(*order)
            .limit(limit)
            .offset(offset)
        )
        rows = self._session.execute(page_statement).all()
        # One more query for the whole page, not one per product.
        specifications = self._specifications_by_product(
            [product.id for product, _ in rows], language
        )
        products = [
            LocalizedProduct(
                product=product,
                translation=translation,
                specifications=specifications.get(product.id, []),
            )
            for product, translation in rows
        ]
        return products, total

    def get_by_id(
        self, product_id: int, language: Language
    ) -> LocalizedProduct | None:
        """Return one product with its text in ``language``.

        It comes with its translation and its specifications, like the
        products of ``list_page``. Return None when the id does not
        exist.
        """
        statement = (
            select(Product, ProductTranslation)
            .outerjoin(ProductTranslation, _translation_join(language))
            .where(Product.id == product_id)
        )
        row = self._session.execute(statement).first()
        if row is None:
            return None
        product, translation = row
        specifications = self._specifications_by_product(
            [product.id], language
        )
        return LocalizedProduct(
            product=product,
            translation=translation,
            specifications=specifications.get(product.id, []),
        )

    def _specifications_by_product(
        self, product_ids: list[int], language: Language
    ) -> dict[int, list[ProductSpecification]]:
        """Return the specifications of the given products, by product id.

        One query reads the lines in ``language`` and in the source
        language. For each product the lines in ``language`` are kept
        when it has any, otherwise the ones in the source language. A
        product without specifications is not in the result.
        """
        if not product_ids:
            return {}
        statement = (
            select(ProductSpecification)
            .where(
                ProductSpecification.product_id.in_(product_ids),
                ProductSpecification.language.in_(
                    {language.value, SOURCE_LANGUAGE.value}
                ),
            )
            .order_by(
                ProductSpecification.product_id,
                ProductSpecification.position,
            )
        )
        requested: dict[int, list[ProductSpecification]] = {}
        source: dict[int, list[ProductSpecification]] = {}
        for specification in self._session.scalars(statement):
            if specification.language == language.value:
                lists = requested
            else:
                lists = source
            lists.setdefault(specification.product_id, []).append(
                specification
            )
        # The union keeps the right-hand value for a repeated key: the
        # requested language wins over the source language.
        return source | requested

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

    def get_ids_by_external_id(self) -> dict[int, int]:
        """Return the id of every product, by external_id."""
        statement = select(Product.external_id, Product.id)
        rows = self._session.execute(statement).all()
        return {row.external_id: row.id for row in rows}

    def upsert_translations(self, rows: list[dict[str, Any]]) -> None:
        """Insert or update translations in one transaction.

        Each row is a dictionary with ``product_id``, ``language``,
        ``title`` and ``description``. The pair (product_id, language)
        decides whether a row is inserted or updated.
        """
        if not rows:
            return
        statement = insert(ProductTranslation).values(rows)
        statement = statement.on_conflict_do_update(
            index_elements=[
                ProductTranslation.product_id,
                ProductTranslation.language,
            ],
            set_={
                "title": statement.excluded.title,
                "description": statement.excluded.description,
            },
        )
        self._session.execute(statement)
        self._session.commit()

    def replace_specifications(
        self, language: Language, rows: list[dict[str, Any]]
    ) -> None:
        """Replace the specifications of some products in one language.

        Each row is a dictionary with ``product_id``, ``language``,
        ``position``, ``attribute``, ``group_label``, ``label`` and
        ``value``. For every product in the
        rows, its old lines in ``language`` are deleted and the new ones
        inserted, in one transaction, so a shorter list leaves no old
        line behind. The other products are not touched.
        """
        if not rows:
            return
        product_ids = {row["product_id"] for row in rows}
        self._session.execute(
            delete(ProductSpecification).where(
                ProductSpecification.language == language.value,
                ProductSpecification.product_id.in_(product_ids),
            )
        )
        self._session.execute(insert(ProductSpecification).values(rows))
        self._session.commit()


def _contains(text: ColumnElement[str], search: str) -> ColumnElement[bool]:
    """Match ``search`` anywhere in ``text``, ignoring case and accents.

    The accents are removed on both sides: from the stored text with the
    unaccent function of PostgreSQL, and from the search with
    ``_without_accents``. "algodon" therefore finds "algodón".
    """
    # autoescape: a % or _ typed by the user is matched as that
    # character, not as a LIKE wildcard.
    return func.unaccent(text).icontains(
        _without_accents(search), autoescape=True
    )


def _without_accents(text: str) -> str:
    """Return the text with its accents removed: "algodón" -> "algodon".

    NFD separates each letter from its accent ("ó" becomes "o" plus a
    combining mark), and the combining marks are then left out.
    """
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(
        character
        for character in decomposed
        if not unicodedata.combining(character)
    )


def _translation_join(language: Language) -> ColumnElement[bool]:
    """Return the condition that joins a product with its translation.

    The language is part of the join and not of the WHERE: with a left
    join a product without a translation is then kept, with NULLs.
    """
    return and_(
        ProductTranslation.product_id == Product.id,
        ProductTranslation.language == language.value,
    )
