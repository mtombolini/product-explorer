"""Create the product_translations table.

Revision ID: 0002_create_product_translations
Revises: 0001_create_products
Create Date: 2026-10-12

"""

import sqlalchemy as sa
from alembic import op

revision: str = "0002_create_product_translations"
down_revision: str | None = "0001_create_products"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Create the table of product texts in other languages."""
    op.create_table(
        "product_translations",
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(8), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.PrimaryKeyConstraint(
            "product_id", "language", name="pk_product_translations"
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name="fk_product_translations_product_id",
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    """Drop the product_translations table."""
    op.drop_table("product_translations")
