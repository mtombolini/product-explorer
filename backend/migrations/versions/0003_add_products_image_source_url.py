"""Add the image_source_url column to the products table.

Revision ID: 0003_add_image_source_url
Revises: 0002_create_product_translations
Create Date: 2026-10-12

"""

import sqlalchemy as sa
from alembic import op

# Shorter than the file name: alembic_version.version_num holds at most
# 32 characters.
revision: str = "0003_add_image_source_url"
down_revision: str | None = "0002_create_product_translations"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Add the column that keeps the image URL sent by Fake Store.

    Existing rows get NULL. The next import fills them.
    """
    op.add_column(
        "products",
        sa.Column("image_source_url", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Drop the image_source_url column."""
    op.drop_column("products", "image_source_url")
