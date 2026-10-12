"""Shared fixtures: a migrated test database, emptied before each test.

The tests run against PostgreSQL, like the application, but only in a
database whose name ends in ``_test``.
"""

from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import URL, create_engine, make_url, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionFactory, engine
from app.main import app


def _create_database_if_missing(url: URL) -> None:
    """Create the test database through the "postgres" database."""
    # CREATE DATABASE cannot run inside a transaction, hence AUTOCOMMIT.
    admin_engine = create_engine(
        url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    with admin_engine.connect() as connection:
        exists = connection.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": url.database},
        )
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def prepare_database() -> None:
    """Once per test run: check the name, create and migrate the database."""
    url = make_url(get_settings().database_url)
    if not (url.database or "").endswith("_test"):
        pytest.exit(
            "Refusing to run: the tests empty the products table, so "
            f"the database name must end in _test (got {url.database!r}).",
            returncode=1,
        )
    _create_database_if_missing(url)
    # Run from the backend directory, where alembic.ini is.
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(autouse=True)
def empty_products_table() -> None:
    """Before each test: remove every product and restart the ids.

    CASCADE also empties product_translations and
    product_specifications, which reference it.
    """
    with engine.begin() as connection:
        connection.execute(
            text("TRUNCATE TABLE products RESTART IDENTITY CASCADE")
        )


@pytest.fixture
def session() -> Iterator[Session]:
    """Yield a database session and close it after the test."""
    with SessionFactory() as session:
        yield session


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Yield an HTTP client that calls the application in-process.

    Dependency overrides set by a test are removed afterwards, so one
    test can never change the behaviour of another.
    """
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
