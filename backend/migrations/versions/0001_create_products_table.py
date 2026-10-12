"""Create the products table.

Revision ID: 0001_create_products
Revises:
Create Date: 2026-10-12

"""

import sqlalchemy as sa
from alembic import op

revision: str = "0001_create_products"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Create the products table and its category index."""
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("image_path", sa.String(255), nullable=True),
        sa.Column("rating_rate", sa.Numeric(2, 1), nullable=True),
        sa.Column("rating_count", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("external_id", name="uq_products_external_id"),
        sa.CheckConstraint("price >= 0", name="ck_products_price"),
        sa.CheckConstraint(
            "rating_rate >= 0 AND rating_rate <= 5",
            name="ck_products_rating_rate",
        ),
        sa.CheckConstraint(
            "rating_count >= 0", name="ck_products_rating_count"
        ),
    )
    op.create_index("ix_products_category", "products", ["category"])


def downgrade() -> None:
    """Drop the products table."""
    op.drop_index("ix_products_category", table_name="products")
    op.drop_table("products")
