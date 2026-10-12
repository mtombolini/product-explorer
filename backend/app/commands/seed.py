"""Import the catalogue from Fake Store and load its translations.

Usage::

    python -m app.commands.seed              # always import
    python -m app.commands.seed --if-empty   # only when there are no rows

The bundled translations need no network and are loaded after the
import, and also when the import was skipped because of ``--if-empty``.

Exit code 0 on success, 1 when Fake Store is unavailable. A problem
with the translations is logged and does not change the exit code.
"""

import argparse
import logging
import sys

from app.clients.fakestore_client import (
    FakeStoreClient,
    FakeStoreUnavailableError,
)
from app.core.config import Settings, get_settings
from app.core.database import SessionFactory
from app.core.logging import configure_logging
from app.repositories.image_storage import ImageStorage
from app.repositories.product_repository import ProductRepository
from app.services.import_service import CatalogueImportService
from app.services.translation_service import TranslationLoadService

# A fixed name: with "python -m" this module's __name__ is "__main__",
# which would say nothing in the log lines.
logger = logging.getLogger("app.commands.seed")


def main() -> int:
    """Run the command and return the exit code of the process."""
    parser = argparse.ArgumentParser(description="Import the catalogue.")
    parser.add_argument(
        "--if-empty",
        action="store_true",
        help="do not import when the products table already has rows",
    )
    arguments = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level)

    with SessionFactory() as session:
        repository = ProductRepository(session)

        if arguments.if_empty and _has_products(repository):
            catalogue_ready = True
        else:
            catalogue_ready = _import_catalogue(repository, settings)

        # After a failed import there may be nothing to translate: the
        # next run that imports the products loads the translations too.
        if catalogue_ready:
            _load_translations(repository)

    return 0 if catalogue_ready else 1


def _has_products(repository: ProductRepository) -> bool:
    """Say whether the catalogue was already imported, and log it."""
    product_count = repository.count()
    if product_count == 0:
        return False
    logger.info(
        "Import skipped: the catalogue already has products",
        extra={"product_count": product_count},
    )
    return True


def _import_catalogue(
    repository: ProductRepository, settings: Settings
) -> bool:
    """Import the products from Fake Store. Return whether it worked."""
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
        return False
    finally:
        client.close()
    return True


def _load_translations(repository: ProductRepository) -> None:
    """Load the bundled translations. A failure is only logged."""
    try:
        TranslationLoadService(repository).run()
    except Exception:
        # Every error is caught on purpose: the catalogue works without
        # translations, in the source language, so this step must never
        # turn a good import into a failed command.
        logger.exception("Translations could not be loaded")


if __name__ == "__main__":
    sys.exit(main())
