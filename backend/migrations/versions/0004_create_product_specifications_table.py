"""Create the product_specifications table.

Revision ID: 0004_create_specifications
Revises: 0003_add_image_source_url
Create Date: 2026-10-12

"""

import sqlalchemy as sa
from alembic import op

# Shorter than the file name: alembic_version.version_num holds at most
# 32 characters.
revision: str = "0004_create_specifications"
down_revision: str | None = "0003_add_image_source_url"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Create the table of specification lines per product and language."""
    op.create_table(
        "product_specifications",
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(8), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(100), nullable=False),
        sa.Column("value", sa.String(255), nullable=False),
        sa.PrimaryKeyConstraint(
            "product_id",
            "language",
            "position",
            name="pk_product_specifications",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name="fk_product_specifications_product_id",
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    """Drop the product_specifications table."""
    op.drop_table("product_specifications")
