"""The loading of the bundled product specifications into the database."""

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from app.models import Language
from app.repositories.product_repository import ProductRepository
from app.schemas.specification import ProductValues, Taxonomy
from app.services.bundled_files import find_product_id, read_entries

logger = logging.getLogger(__name__)

# The folder shipped with the code. Fake Store has no specifications,
# so both files are written for this project:
#   taxonomy.json  the attributes of every product ("general"), the
#                  extra attributes of each family, and their names in
#                  every language
#   products.json  an object keyed by the Fake Store id: the family of
#                  the product and the values of its attributes
SPECIFICATIONS_DIR = (
    Path(__file__).resolve().parents[1] / "data/specifications"
)
TAXONOMY_FILE = "taxonomy.json"
PRODUCTS_FILE = "products.json"


@dataclass(frozen=True)
class SpecificationSummary:
    """The counters of one load of the specifications, in products."""

    stored: int
    skipped: int


class SpecificationLoadService:
    """Build the lines of product_specifications from the two files.

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
        """Load the files: validate, find each product, replace its lines.

        Every product gets one line per attribute of its family, in the
        order of the taxonomy and in every language. The lines of a
        product replace the ones stored for it. Running it again writes
        the same rows.
        """
        taxonomy = self._read_taxonomy()
        if taxonomy is None:
            return SpecificationSummary(stored=0, skipped=0)
        product_ids = self._repository.get_ids_by_external_id()
        # The values of each product to store, by product id. Two keys
        # can name the same product ("1" and "01"): the first is kept.
        products: dict[int, ProductValues] = {}
        skipped = 0
        path = self._specifications_dir / PRODUCTS_FILE
        for key, entry in read_entries(path).items():
            values = self._validate(key, entry, taxonomy)
            product_id = find_product_id(key, product_ids)
            if values is None:
                skipped += 1
            elif product_id is None or product_id in products:
                logger.warning(
                    "Skipped specifications: their product does not "
                    "exist or has another entry",
                    extra={"external_id": key},
                )
                skipped += 1
            else:
                products[product_id] = values
        for language in Language:
            rows = [
                row
                for product_id, values in products.items()
                for row in _build_rows(product_id, values, taxonomy, language)
            ]
            self._repository.replace_specifications(language, rows)
        summary = SpecificationSummary(stored=len(products), skipped=skipped)
        logger.info("Specifications loaded", extra=asdict(summary))
        return summary

    def _read_taxonomy(self) -> Taxonomy | None:
        """Return the taxonomy, or None when its file is not usable."""
        path = self._specifications_dir / TAXONOMY_FILE
        try:
            content = json.loads(path.read_text(encoding="utf-8"))
            return Taxonomy.model_validate(content)
        except (OSError, ValueError) as error:
            # ValueError covers broken JSON and a failed validation.
            logger.warning(
                "Specifications not loaded: the taxonomy is not usable",
                extra={"file": str(path), "reason": str(error)},
            )
            return None

    def _validate(
        self, key: str, entry: Any, taxonomy: Taxonomy
    ) -> ProductValues | None:
        """Return the values of one product, or None to skip it.

        ``key`` is the Fake Store id of the product, as text. A family
        or an attribute that the taxonomy does not have is a mistake in
        the file: the product is skipped as a whole, so it is never
        stored with a line missing.
        """
        context = {"external_id": key}
        try:
            values = ProductValues.model_validate(entry)
        except ValidationError as error:
            logger.warning(
                "Skipped invalid specifications",
                extra=context | {"errors": error.errors(include_input=False)},
            )
            return None
        if values.family not in taxonomy.families:
            logger.warning(
                "Skipped specifications: unknown family",
                extra=context | {"family": values.family},
            )
            return None
        known = {key for _, key in taxonomy.attributes_of(values.family)}
        unknown = sorted(set(values.values) - known)
        if unknown:
            logger.warning(
                "Skipped specifications: attributes outside the family",
                extra=context | {"attributes": unknown},
            )
            return None
        return values


def _build_rows(
    product_id: int,
    values: ProductValues,
    taxonomy: Taxonomy,
    language: Language,
) -> list[dict[str, Any]]:
    """Return the table rows of one product in one language.

    One row per attribute of the family, with or without a value. The
    position is the place in the taxonomy, starting at 1.
    """
    labels = taxonomy.labels[language]
    return [
        {
            "product_id": product_id,
            "language": language.value,
            "position": position,
            "attribute": attribute,
            "group_label": labels[group],
            "label": labels[attribute],
            "value": values.value_in(attribute, language),
        }
        for position, (group, attribute) in enumerate(
            taxonomy.attributes_of(values.family), start=1
        )
    ]
