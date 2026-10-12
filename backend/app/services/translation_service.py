"""The loading of the bundled product translations into the database."""

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from app.models import SOURCE_LANGUAGE, Language
from app.repositories.product_repository import ProductRepository
from app.schemas.translation import TranslationEntry

logger = logging.getLogger(__name__)

# The folder shipped with the code: one file per language, named after
# it ("es.json"). Each file is an object keyed by the Fake Store id.
TRANSLATIONS_DIR = Path(__file__).resolve().parents[1] / "data/translations"


@dataclass(frozen=True)
class TranslationSummary:
    """The counters of one load of the translations."""

    stored: int
    skipped: int


class TranslationLoadService:
    """Copy the translation files into the product_translations table.

    It needs no network, so it can run on every start.
    """

    def __init__(
        self,
        repository: ProductRepository,
        translations_dir: Path = TRANSLATIONS_DIR,
    ) -> None:
        """Create the service on a repository and a folder of files."""
        self._repository = repository
        self._translations_dir = translations_dir

    def run(self) -> TranslationSummary:
        """Load every language file: validate, find the product, upsert.

        Running it again writes the same rows, so nothing changes.
        """
        product_ids = self._repository.get_ids_by_external_id()
        rows: list[dict[str, Any]] = []
        skipped = 0
        # The (product, language) pairs already built. Two keys can name
        # the same product ("1" and "01"), and one INSERT cannot write
        # the same row twice: the first entry is kept.
        seen: set[tuple[int, str]] = set()
        # Sorted, so the files are always read in the same order.
        for path in sorted(self._translations_dir.glob("*.json")):
            language = self._language_of(path)
            if language is None:
                continue
            for key, value in self._read_entries(path).items():
                row = self._build_row(language, key, value, product_ids)
                if row is None:
                    skipped += 1
                    continue
                pair = (row["product_id"], row["language"])
                if pair in seen:
                    logger.warning(
                        "Skipped a translation: its product has another",
                        extra={
                            "language": language.value,
                            "external_id": key,
                        },
                    )
                    skipped += 1
                    continue
                seen.add(pair)
                rows.append(row)
        self._repository.upsert_translations(rows)
        summary = TranslationSummary(stored=len(rows), skipped=skipped)
        logger.info("Translations loaded", extra=asdict(summary))
        return summary

    def _language_of(self, path: Path) -> Language | None:
        """Return the language a file is named after, or None to skip it."""
        try:
            language = Language(path.stem)
        except ValueError:
            logger.warning(
                "Skipped a translation file: unsupported language",
                extra={"file": path.name},
            )
            return None
        if language is SOURCE_LANGUAGE:
            # The source text is the one in the products table.
            logger.warning(
                "Skipped a translation file: it is the source language",
                extra={"file": path.name},
            )
            return None
        return language

    def _read_entries(self, path: Path) -> dict[str, Any]:
        """Return the entries of a file. A broken file gives none."""
        try:
            content = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            logger.warning(
                "Skipped a translation file: it cannot be read",
                extra={"file": path.name, "reason": str(error)},
            )
            return {}
        if not isinstance(content, dict):
            logger.warning(
                "Skipped a translation file: it is not a JSON object",
                extra={"file": path.name},
            )
            return {}
        return content

    def _build_row(
        self,
        language: Language,
        key: str,
        value: Any,
        product_ids: dict[int, int],
    ) -> dict[str, Any] | None:
        """Return the table row of one entry, or None to skip it.

        ``key`` is the Fake Store id of the product, as text.
        """
        try:
            entry = TranslationEntry.model_validate(value)
        except ValidationError as error:
            logger.warning(
                "Skipped an invalid translation",
                extra={
                    "language": language.value,
                    "external_id": key,
                    "errors": error.errors(include_input=False),
                },
            )
            return None
        # A key that is not a number cannot be the id of a product.
        product_id = product_ids.get(int(key)) if key.isdecimal() else None
        if product_id is None:
            logger.warning(
                "Skipped a translation: its product does not exist",
                extra={"language": language.value, "external_id": key},
            )
            return None
        return {
            "product_id": product_id,
            "language": language.value,
            "title": entry.title,
            "description": entry.description,
        }
