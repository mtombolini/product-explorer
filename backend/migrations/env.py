"""Alembic environment: connects to the database and runs migrations."""

import logging

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings
from app.core.database import Base
from app.core.logging import configure_logging
from app.models import Product  # noqa: F401  (registers the table)

# Run as a command ("alembic upgrade head" in entrypoint.sh) nothing has
# set up logging yet, so the migration lines get the JSON format of the
# application. Inside the tests logging is already set up and is left
# alone.
if not logging.getLogger().handlers:
    configure_logging(get_settings().log_level)

# The model metadata, used by "alembic check" and "--autogenerate".
target_metadata = Base.metadata


def run_migrations() -> None:
    """Apply the migrations using the URL of the application settings."""
    # NullPool: a migration run needs one short-lived connection.
    engine = create_engine(
        get_settings().database_url, poolclass=pool.NullPool
    )
    with engine.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


run_migrations()
