"""Helpers shared by the import tests."""

from collections.abc import Sequence
from pathlib import Path

import httpx
from sqlalchemy import Row, select
from sqlalchemy.orm import Session

from app.clients.fakestore_client import FakeStoreClient
from app.models import Product
from app.repositories.image_storage import ImageStorage
from app.repositories.product_repository import ProductRepository
from app.services.import_service import CatalogueImportService
from tests.fake_store import BASE_URL, FakeStoreStub


def make_import_service(
    session: Session,
    stub: FakeStoreStub,
    images_dir: Path,
    max_retries: int = 0,
) -> CatalogueImportService:
    """Build the import service on the stub and a temporary directory."""
    client = FakeStoreClient(
        base_url=BASE_URL,
        timeout_seconds=1,
        max_retries=max_retries,
        # No waiting between retries: the tests stay fast.
        backoff_seconds=0,
        transport=httpx.MockTransport(stub.handle),
    )
    return CatalogueImportService(
        client=client,
        repository=ProductRepository(session),
        image_storage=ImageStorage(images_dir),
    )


def read_products(session: Session) -> Sequence[Row]:
    """Return every product row as stored now, ordered by external_id.

    Columns are selected, not ORM objects, so the values always come
    from the database and never from objects the session loaded before.
    """
    statement = select(Product.__table__).order_by(Product.external_id)
    return session.execute(statement).all()
