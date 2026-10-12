"""Alembic environment: connects to the database and runs migrations."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings
from app.core.database import Base
from app.models import Product  # noqa: F401  (registers the table)

config = context.config

if config.config_file_name is not None:
    # disable_existing_loggers=False: loading alembic.ini must not switch
    # off loggers that were created before (the tests run migrations
    # inside the pytest process).
    fileConfig(config.config_file_name, disable_existing_loggers=False)

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
