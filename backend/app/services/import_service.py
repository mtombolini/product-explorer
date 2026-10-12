"""The import of the catalogue from Fake Store."""

import logging
from dataclasses import asdict, dataclass
from typing import Any

from pydantic import ValidationError

from app.clients.fakestore_client import FakeStoreClient, ImageDownloadError
from app.repositories.image_storage import ImageStorage, InvalidImageError
from app.repositories.product_repository import ProductRepository
from app.schemas.fakestore import FakeStoreProduct

logger = logging.getLogger(__name__)

# After this many image failures in a row the image host is considered
# down and the remaining images are left for the next run.
MAX_CONSECUTIVE_IMAGE_FAILURES = 3


@dataclass(frozen=True)
class ImportSummary:
    """The counters of one import run."""

    fetched: int
    imported: int
    skipped: int
    images_downloaded: int
    images_failed: int


class CatalogueImportService:
    """Copy the Fake Store catalogue into the database and image folder."""

    def __init__(
        self,
        client: FakeStoreClient,
        repository: ProductRepository,
        image_storage: ImageStorage,
    ) -> None:
        """Create the service with its collaborators."""
        self._client = client
        self._repository = repository
        self._image_storage = image_storage

    def run(self) -> ImportSummary:
        """Run one import: fetch, validate, upsert, images, report.

        Raises ``FakeStoreUnavailableError`` when the product list cannot
        be fetched. Nothing is written in that case.
        """
        records = self._client.fetch_products()
        products = self._validate(records)
        self._upsert(products)
        images_downloaded, images_failed = self._download_missing_images(
            products
        )
        summary = ImportSummary(
            fetched=len(records),
            imported=len(products),
            skipped=len(records) - len(products),
            images_downloaded=images_downloaded,
            images_failed=images_failed,
        )
        logger.info("Catalogue import finished", extra=asdict(summary))
        return summary

    def _validate(self, records: list[Any]) -> list[FakeStoreProduct]:
        """Return the valid records. Invalid ones are logged and skipped."""
        products: list[FakeStoreProduct] = []
        seen_ids: set[int] = set()
        for record in records:
            try:
                product = FakeStoreProduct.model_validate(record)
            except ValidationError as error:
                logger.warning(
                    "Skipped an invalid Fake Store record",
                    extra={"errors": error.errors(include_input=False)},
                )
                continue
            # The upsert cannot write the same external_id twice in one
            # statement, so only the first record with an id is kept.
            if product.id in seen_ids:
                logger.warning(
                    "Skipped a repeated Fake Store record",
                    extra={"external_id": product.id},
                )
                continue
            seen_ids.add(product.id)
            products.append(product)
        return products

    def _upsert(self, products: list[FakeStoreProduct]) -> None:
        """Write the products, inserting new ones and updating the rest."""
        rows = [
            {
                "external_id": product.id,
                "title": product.title,
                "description": product.description,
                "price": product.price,
                "category": product.category,
                # An empty URL is stored as NULL, like a missing one.
                "image_source_url": product.image or None,
                "rating_rate": product.rating.rate if product.rating else None,
                "rating_count": (
                    product.rating.count if product.rating else None
                ),
            }
            for product in products
        ]
        self._repository.upsert_many(rows)

    def _download_missing_images(
        self, products: list[FakeStoreProduct]
    ) -> tuple[int, int]:
        """Download the images that are not stored yet.

        Return how many downloads succeeded and how many failed.
        """
        stored_paths = self._repository.get_image_paths()
        downloaded = 0
        failed = 0
        consecutive_failures = 0
        for product in products:
            if not product.image:
                continue
            stored_path = stored_paths.get(product.id)
            if stored_path and self._image_storage.exists(stored_path):
                continue
            if consecutive_failures >= MAX_CONSECUTIVE_IMAGE_FAILURES:
                logger.warning(
                    "Too many image failures in a row, "
                    "the remaining images are skipped for this run"
                )
                break
            if self._download_image(product.id, product.image):
                downloaded += 1
                consecutive_failures = 0
            else:
                failed += 1
                consecutive_failures += 1
        return downloaded, failed

    def _download_image(self, external_id: int, url: str) -> bool:
        """Download and store one image. Return whether it worked.

        On failure the product keeps its current image_path, so the API
        serves the placeholder until a later run succeeds.
        """
        try:
            image = self._client.download_image(url)
            file_name = self._image_storage.save(
                external_id, image.content, image.content_type
            )
        except (ImageDownloadError, InvalidImageError) as error:
            logger.warning(
                "Image download failed",
                extra={"external_id": external_id, "reason": str(error)},
            )
            return False
        self._repository.set_image_path(external_id, file_name)
        return True
