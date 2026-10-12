"""Import the catalogue from Fake Store.

Usage::

    python -m app.commands.seed              # always import
    python -m app.commands.seed --if-empty   # only when there are no rows

Exit code 0 on success, 1 when Fake Store is unavailable.
"""

import argparse
import logging
import sys

from app.clients.fakestore_client import (
    FakeStoreClient,
    FakeStoreUnavailableError,
)
from app.core.config import get_settings
from app.core.database import SessionFactory
from app.core.logging import configure_logging
from app.repositories.image_storage import ImageStorage
from app.repositories.product_repository import ProductRepository
from app.services.import_service import CatalogueImportService

# A fixed name: with "python -m" this module's __name__ is "__main__",
# which would say nothing in the log lines.
logger = logging.getLogger("app.commands.seed")


def main() -> int:
    """Run the import and return the exit code of the process."""
    parser = argparse.ArgumentParser(description="Import the catalogue.")
    parser.add_argument(
        "--if-empty",
        action="store_true",
        help="do nothing when the products table already has rows",
    )
    arguments = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level)

    with SessionFactory() as session:
        repository = ProductRepository(session)

        if arguments.if_empty:
            product_count = repository.count()
            if product_count > 0:
                logger.info(
                    "Import skipped: the catalogue already has products",
                    extra={"product_count": product_count},
                )
                return 0

        client = FakeStoreClient(
            base_url=settings.fakestore_base_url,
            timeout_seconds=settings.fakestore_timeout_seconds,
            max_retries=settings.fakestore_max_retries,
        )
        service = CatalogueImportService(
            client=client,
            repository=repository,
            image_storage=ImageStorage(settings.images_dir),
        )
        try:
            service.run()
        except FakeStoreUnavailableError as error:
            logger.error(
                "Import failed: Fake Store is unavailable",
                extra={"reason": str(error)},
            )
            return 1
        finally:
            client.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
