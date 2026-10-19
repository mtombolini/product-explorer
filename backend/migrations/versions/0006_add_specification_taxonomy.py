"""Give the specification lines an attribute key and a group.

Revision ID: 0006_specification_taxonomy
Revises: 0005_enable_unaccent
Create Date: 2026-10-12

"""

import sqlalchemy as sa
from alembic import op

# Shorter than the file name: alembic_version.version_num holds at most
# 32 characters.
revision: str = "0006_specification_taxonomy"
down_revision: str | None = "0005_enable_unaccent"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Add the taxonomy columns and allow a line without a value.

    The old lines have no attribute key and cannot get one, so they are
    deleted. Nothing is lost: the lines are bundled content, and the
    seed command writes them again on the next start.
    """
    op.execute("DELETE FROM product_specifications")
    op.add_column(
        "product_specifications",
        sa.Column("attribute", sa.String(50), nullable=False),
    )
    op.add_column(
        "product_specifications",
        sa.Column("group_label", sa.String(100), nullable=False),
    )
    op.alter_column(
        "product_specifications",
        "value",
        existing_type=sa.String(255),
        nullable=True,
    )


def downgrade() -> None:
    """Remove the taxonomy columns and the lines without a value."""
    op.execute("DELETE FROM product_specifications WHERE value IS NULL")
    op.alter_column(
        "product_specifications",
        "value",
        existing_type=sa.String(255),
        nullable=False,
    )
    op.drop_column("product_specifications", "group_label")
    op.drop_column("product_specifications", "attribute")
