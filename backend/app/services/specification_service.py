"""The loading of the bundled product specifications into the database."""

import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from app.models import Language
from app.repositories.product_repository import ProductRepository
from app.schemas.specification import SpecificationList
from app.services.bundled_files import (
    find_product_id,
    language_of,
    read_entries,
)

logger = logging.getLogger(__name__)

# The folder shipped with the code: one file per language, named after
# it ("es.json"). Each file is an object keyed by the Fake Store id, and
# each value is the list of {"label", "value"} of that product, in
# display order. Fake Store has no specifications, so the source
# language has a file too.
SPECIFICATIONS_DIR = (
    Path(__file__).resolve().parents[1] / "data/specifications"
)


@dataclass(frozen=True)
class SpecificationSummary:
    """The counters of one load of the specifications, in products.

    A product is counted once per language file.
    """

    stored: int
    skipped: int


class SpecificationLoadService:
    """Copy the specification files into product_specifications.

    It needs no network, so it can run on every start.
    """

    def __init__(
        self,
        repository: ProductRepository,
        specifications_dir: Path = SPECIFICATIONS_DIR,
    ) -> None:
        """Create the service on a repository and a folder of files."""
        self._repository = repository
        self._specifications_dir = specifications_dir

    def run(self) -> SpecificationSummary:
        """Load every language file: validate, find the product, replace.

        The list of a product replaces the one stored for that product
        and language. Running it again writes the same rows.
        """
        product_ids = self._repository.get_ids_by_external_id()
        stored = 0
        skipped = 0
        # Sorted, so the files are always read in the same order.
        for path in sorted(self._specifications_dir.glob("*.json")):
            language = language_of(path)
            if language is None:
                continue
            rows: list[dict[str, Any]] = []
            # The products already built from this file. Two keys can
            # name the same product ("1" and "01"): the first is kept.
            seen: set[int] = set()
            for key, value in read_entries(path).items():
                product_rows = self._build_rows(
                    language, key, value, product_ids
                )
                if product_rows is None:
                    skipped += 1
                    continue
                product_id = product_rows[0]["product_id"]
                if product_id in seen:
                    logger.warning(
                        "Skipped specifications: their product has "
                        "another list",
                        extra={
                            "language": language.value,
                            "external_id": key,
                        },
                    )
                    skipped += 1
                    continue
                seen.add(product_id)
                rows.extend(product_rows)
            self._repository.replace_specifications(language, rows)
            stored += len(seen)
        summary = SpecificationSummary(stored=stored, skipped=skipped)
        logger.info("Specifications loaded", extra=asdict(summary))
        return summary

    def _build_rows(
        self,
        language: Language,
        key: str,
        value: Any,
        product_ids: dict[int, int],
    ) -> list[dict[str, Any]] | None:
        """Return the table rows of one product, or None to skip it.

        ``key`` is the Fake Store id of the product, as text. The list
        is never empty: the validation requires at least one line.
        """
        context = {"language": language.value, "external_id": key}
        try:
            items = SpecificationList.model_validate(value).root
        except ValidationError as error:
            logger.warning(
                "Skipped invalid specifications",
                extra=context | {"errors": error.errors(include_input=False)},
            )
            return None
        product_id = find_product_id(key, product_ids)
        if product_id is None:
            logger.warning(
                "Skipped specifications: their product does not exist",
                extra=context,
            )
            return None
        # The position is the place in the file, starting at 1.
        return [
            {
                "product_id": product_id,
                "language": language.value,
                "position": position,
                "label": item.label,
                "value": item.value,
            }
            for position, item in enumerate(items, start=1)
        ]
