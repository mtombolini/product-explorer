"""Reading of the data files shipped with the code.

The translations and the values of the specifications are JSON objects
keyed by the Fake Store id of the product. The translations have one
file per language, named after it ("es.json"). Their two loaders share
the functions of this module.
"""

import json
import logging
from pathlib import Path
from typing import Any

from app.models import Language

logger = logging.getLogger(__name__)


def language_of(path: Path) -> Language | None:
    """Return the language a file is named after, or None to skip it."""
    try:
        return Language(path.stem)
    except ValueError:
        logger.warning(
            "Skipped a bundled file: unsupported language",
            extra={"file": str(path)},
        )
        return None


def read_entries(path: Path) -> dict[str, Any]:
    """Return the entries of a file. A broken file gives none."""
    try:
        content = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        logger.warning(
            "Skipped a bundled file: it cannot be read",
            extra={"file": str(path), "reason": str(error)},
        )
        return {}
    if not isinstance(content, dict):
        logger.warning(
            "Skipped a bundled file: it is not a JSON object",
            extra={"file": str(path)},
        )
        return {}
    return content


def find_product_id(key: str, product_ids: dict[int, int]) -> int | None:
    """Return the id of the product an entry is for, or None.

    ``key`` is the Fake Store id as text and ``product_ids`` maps every
    Fake Store id in the database to the id of its product. A key that
    is not a number cannot be the id of a product.
    """
    if not key.isdecimal():
        return None
    return product_ids.get(int(key))
