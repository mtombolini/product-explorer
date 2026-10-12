"""Loader tests: the specification files and what is stored from them."""

import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Language, ProductSpecification
from app.repositories.product_repository import ProductRepository
from app.schemas.specification import SpecificationList
from app.services.specification_service import (
    SPECIFICATIONS_DIR,
    SpecificationLoadService,
)
from tests.factories import create_product

CAPACITY = {"label": "Capacity", "value": "2 TB"}
INTERFACE = {"label": "Interface", "value": "USB 3.0"}
MATERIAL = {"label": "Material", "value": "Cotton"}


def _write_file(directory: Path, name: str, content: Any) -> None:
    """Write one specification file as JSON."""
    path = directory / name
    path.write_text(json.dumps(content), encoding="utf-8")


def _make_service(
    session: Session, directory: Path
) -> SpecificationLoadService:
    """Build the loader on the test database and a temporary folder."""
    return SpecificationLoadService(ProductRepository(session), directory)


def _read_specifications(session: Session) -> list[tuple[Any, ...]]:
    """Return every specification row as stored now, in a fixed order.

    Each row is (product_id, language, position, label, value).
    """
    table = ProductSpecification.__table__
    statement = select(table).order_by(
        table.c.product_id, table.c.language, table.c.position
    )
    return [tuple(row) for row in session.execute(statement)]


def test_load_stores_the_lists_in_order(
    session: Session, tmp_path: Path
) -> None:
    """Each line becomes a row, with its place in the file as position."""
    drive = create_product(session, external_id=10)
    shirt = create_product(session, external_id=20)
    _write_file(
        tmp_path,
        "es.json",
        {
            "10": [
                {"label": "  Capacidad  ", "value": " 2 TB "},
                {"label": "Interfaz", "value": "USB 3.0"},
            ],
            "20": [{"label": "Material", "value": "Algodón"}],
        },
    )

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 2
    assert summary.skipped == 0
    assert _read_specifications(session) == [
        (drive.id, "es", 1, "Capacidad", "2 TB"),
        (drive.id, "es", 2, "Interfaz", "USB 3.0"),
        (shirt.id, "es", 1, "Material", "Algodón"),
    ]


def test_load_twice_gives_the_same_rows(
    session: Session, tmp_path: Path
) -> None:
    """Idempotency: a second run adds nothing and changes nothing."""
    create_product(session, external_id=1)
    create_product(session, external_id=2)
    _write_file(
        tmp_path, "en.json", {"1": [CAPACITY, INTERFACE], "2": [MATERIAL]}
    )
    service = _make_service(session, tmp_path)

    service.run()
    rows_after_first_run = _read_specifications(session)
    second_summary = service.run()
    rows_after_second_run = _read_specifications(session)

    assert len(rows_after_second_run) == 3
    assert rows_after_second_run == rows_after_first_run
    assert second_summary.stored == 2
    assert second_summary.skipped == 0


def test_shorter_list_replaces_the_old_one(
    session: Session, tmp_path: Path
) -> None:
    """Replace: a line removed from the file is removed from the table."""
    product = create_product(session, external_id=1)
    other = create_product(session, external_id=2)
    _write_file(
        tmp_path,
        "en.json",
        {"1": [CAPACITY, INTERFACE, MATERIAL], "2": [MATERIAL]},
    )
    _write_file(tmp_path, "es.json", {"1": [CAPACITY, INTERFACE]})
    service = _make_service(session, tmp_path)
    service.run()

    # Product 2 is no longer in the file: its rows are left as they are.
    _write_file(tmp_path, "en.json", {"1": [INTERFACE]})
    service.run()

    assert _read_specifications(session) == [
        (product.id, "en", 1, "Interface", "USB 3.0"),
        # The other language of the same product is not touched.
        (product.id, "es", 1, "Capacity", "2 TB"),
        (product.id, "es", 2, "Interface", "USB 3.0"),
        (other.id, "en", 1, "Material", "Cotton"),
    ]


def test_product_with_one_invalid_item_is_skipped_as_a_whole(
    session: Session, tmp_path: Path
) -> None:
    """One bad line skips the product and keeps what it had stored."""
    product = create_product(session, external_id=1)
    for external_id in range(2, 10):
        create_product(session, external_id=external_id)
    service = _make_service(session, tmp_path)
    _write_file(tmp_path, "en.json", {"1": [CAPACITY]})
    service.run()

    _write_file(
        tmp_path,
        "en.json",
        {
            # A good line and a bad one: nothing of the product is stored.
            "1": [INTERFACE, {"label": "   ", "value": "x"}],
            # Invalid: no value, a NUL character, texts longer than the
            # columns, an empty list, too many lines, not a list.
            "2": [{"label": "Capacity"}],
            "3": [{"label": "a\x00b", "value": "x"}],
            "4": [{"label": "a" * 101, "value": "x"}],
            "5": [{"label": "a", "value": "x" * 256}],
            "6": [],
            "7": [MATERIAL] * 21,
            "8": {"label": "Capacity", "value": "2 TB"},
            "9": [MATERIAL],
        },
    )
    summary = service.run()

    assert summary.stored == 1
    assert summary.skipped == 8
    rows = _read_specifications(session)
    assert rows[0] == (product.id, "en", 1, "Capacity", "2 TB")
    assert [row[3] for row in rows] == ["Capacity", "Material"]


def test_unknown_and_repeated_products_are_skipped(
    session: Session, tmp_path: Path
) -> None:
    """No such product, or a second key for one: skipped, the load goes on."""
    product = create_product(session, external_id=1)
    other = create_product(session, external_id=2)
    _write_file(
        tmp_path,
        "en.json",
        {
            "99": [MATERIAL],
            "not a number": [MATERIAL],
            "1": [CAPACITY],
            # "1" and "01" are one product: the first is kept.
            "01": [INTERFACE],
            "2": [MATERIAL],
        },
    )

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 2
    assert summary.skipped == 3
    assert _read_specifications(session) == [
        (product.id, "en", 1, "Capacity", "2 TB"),
        (other.id, "en", 1, "Material", "Cotton"),
    ]


def test_file_of_an_unsupported_language_is_ignored(
    session: Session, tmp_path: Path
) -> None:
    """Only the files named after a supported language are loaded."""
    create_product(session, external_id=1)
    # Not a value of Language.
    _write_file(tmp_path, "fr.json", {"1": [MATERIAL]})
    # Not a JSON file at all.
    (tmp_path / "notes.txt").write_text("not a specification file")

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 0
    assert summary.skipped == 0
    assert _read_specifications(session) == []


def test_source_language_file_is_loaded(
    session: Session, tmp_path: Path
) -> None:
    """Unlike the translations, en.json is a file like the others."""
    product = create_product(session, external_id=1)
    _write_file(tmp_path, "en.json", {"1": [CAPACITY]})
    _write_file(
        tmp_path, "es.json", {"1": [{"label": "Capacidad", "value": "2 TB"}]}
    )

    summary = _make_service(session, tmp_path).run()

    # One product, counted once per language file.
    assert summary.stored == 2
    assert _read_specifications(session) == [
        (product.id, "en", 1, "Capacity", "2 TB"),
        (product.id, "es", 1, "Capacidad", "2 TB"),
    ]


def test_broken_file_does_not_stop_the_other_files(
    session: Session, tmp_path: Path
) -> None:
    """A file that is not a JSON object is skipped as a whole."""
    product = create_product(session, external_id=1)
    (tmp_path / "en.json").write_text("{ this is not JSON")
    _write_file(tmp_path, "es.json", {"1": [MATERIAL]})

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 1
    assert _read_specifications(session) == [
        (product.id, "es", 1, "Material", "Cotton")
    ]


def test_bundled_files_are_complete_and_valid() -> None:
    """The shipped files have the same 20 products with lists of one size."""
    lists: dict[Language, dict[str, Any]] = {}
    for language in Language:
        path = SPECIFICATIONS_DIR / f"{language.value}.json"
        content = json.loads(path.read_text(encoding="utf-8"))
        assert sorted(content, key=int) == [str(n) for n in range(1, 21)]
        for value in content.values():
            SpecificationList.model_validate(value)
        lists[language] = content

    assert len(list(SPECIFICATIONS_DIR.glob("*.json"))) == len(Language)
    for key, english in lists[Language.EN].items():
        assert len(lists[Language.ES][key]) == len(english)
