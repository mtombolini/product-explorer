"""Database engine, session factory and the session dependency."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Base class of every ORM model."""


# pool_pre_ping checks a pooled connection before using it, so the
# application recovers by itself after the database restarts.
engine = create_engine(get_settings().database_url, pool_pre_ping=True)

SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """Yield a session for one request and close it afterwards."""
    session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
