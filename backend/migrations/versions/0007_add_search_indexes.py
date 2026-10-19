"""Index the searched text with trigrams.

Revision ID: 0007_search_indexes
Revises: 0006_specification_taxonomy
Create Date: 2026-10-19

"""

from alembic import op

# Shorter than the file name: alembic_version.version_num holds at most
# 32 characters.
revision: str = "0007_search_indexes"
down_revision: str | None = "0006_specification_taxonomy"
branch_labels: str | None = None
depends_on: str | None = None

# The four texts the search reads: (index name, table, column).
SEARCHED_COLUMNS = (
    ("ix_products_title_trgm", "products", "title"),
    ("ix_products_description_trgm", "products", "description"),
    ("ix_product_translations_title_trgm", "product_translations", "title"),
    (
        "ix_product_translations_description_trgm",
        "product_translations",
        "description",
    ),
)


def upgrade() -> None:
    """Add trigram indexes on the searched text without its accents.

    A search for text anywhere in a column ("%cotton%") cannot use a
    normal index. A trigram index (pg_trgm) can. The search compares the
    text without accents, so the index is built on that same expression.
    unaccent() itself cannot be indexed: PostgreSQL only indexes
    functions declared IMMUTABLE, and unaccent depends on a dictionary
    that could change. immutable_unaccent() names the dictionary
    explicitly and makes that promise; it is the usual way to do it.
    """
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION immutable_unaccent(text)
        RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$
        """
    )
    for name, table, column in SEARCHED_COLUMNS:
        op.execute(
            f"CREATE INDEX {name} ON {table} "
            f"USING gin (immutable_unaccent({column}) gin_trgm_ops)"
        )


def downgrade() -> None:
    """Drop the indexes, the function and the extension."""
    for name, _, _ in SEARCHED_COLUMNS:
        op.execute(f"DROP INDEX IF EXISTS {name}")
    op.execute("DROP FUNCTION IF EXISTS immutable_unaccent(text)")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
