"""Enable the unaccent extension, used by the search.

Revision ID: 0005_enable_unaccent
Revises: 0004_create_specifications
Create Date: 2026-10-12

"""

from alembic import op

# Shorter than the file name: alembic_version.version_num holds at most
# 32 characters.
revision: str = "0005_enable_unaccent"
down_revision: str | None = "0004_create_specifications"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Install unaccent, which removes accents from text inside SQL.

    It ships with PostgreSQL and is a trusted extension: the owner of
    the database can install it, no superuser is needed.
    """
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")


def downgrade() -> None:
    """Remove the extension."""
    op.execute("DROP EXTENSION IF EXISTS unaccent")
