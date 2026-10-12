"""Loader tests: the translation files and what is stored from them."""

import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from sqlalchemy import Row, select
from sqlalchemy.orm import Session

from app.models import ProductTranslation
from app.repositories.product_repository import ProductRepository
from app.schemas.translation import TranslationEntry
from app.services.translation_service import (
    TRANSLATIONS_DIR,
    TranslationLoadService,
)
from tests.factories import create_product


def _write_file(directory: Path, name: str, content: Any) -> None:
    """Write one translation file as JSON."""
    path = directory / name
    path.write_text(json.dumps(content), encoding="utf-8")


def _make_service(session: Session, directory: Path) -> TranslationLoadService:
    """Build the loader on the test database and a temporary folder."""
    return TranslationLoadService(ProductRepository(session), directory)


def _read_translations(session: Session) -> Sequence[Row]:
    """Return every translation row as stored now, in a fixed order."""
    table = ProductTranslation.__table__
    statement = select(table).order_by(table.c.product_id, table.c.language)
    return session.execute(statement).all()


def test_load_stores_the_entries(session: Session, tmp_path: Path) -> None:
    """Each entry becomes a row of the product with that external id."""
    backpack = create_product(session, external_id=10)
    ring = create_product(session, external_id=20)
    _write_file(
        tmp_path,
        "es.json",
        {
            "10": {"title": "Mochila", "description": "Grande"},
            "20": {"title": "  Anillo  "},
        },
    )

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 2
    assert summary.skipped == 0
    first, second = _read_translations(session)
    assert first.product_id == backpack.id
    assert first.language == "es"
    assert first.title == "Mochila"
    assert first.description == "Grande"
    assert second.product_id == ring.id
    assert second.title == "Anillo"
    assert second.description == ""


def test_load_twice_gives_the_same_rows(
    session: Session, tmp_path: Path
) -> None:
    """Idempotency: a second run adds nothing and changes nothing."""
    create_product(session, external_id=1)
    create_product(session, external_id=2)
    _write_file(
        tmp_path,
        "es.json",
        {"1": {"title": "Mochila"}, "2": {"title": "Anillo"}},
    )
    service = _make_service(session, tmp_path)

    service.run()
    rows_after_first_run = _read_translations(session)
    second_summary = service.run()
    rows_after_second_run = _read_translations(session)

    assert len(rows_after_second_run) == 2
    assert rows_after_second_run == rows_after_first_run
    assert second_summary.stored == 2
    assert second_summary.skipped == 0


def test_second_load_updates_changed_text(
    session: Session, tmp_path: Path
) -> None:
    """Upsert: a corrected translation replaces the old one in place."""
    create_product(session, external_id=1)
    _write_file(tmp_path, "es.json", {"1": {"title": "Mochila"}})
    service = _make_service(session, tmp_path)
    service.run()

    _write_file(
        tmp_path,
        "es.json",
        {"1": {"title": "Mochila nueva", "description": "Mejor"}},
    )
    service.run()

    (row,) = _read_translations(session)
    assert row.title == "Mochila nueva"
    assert row.description == "Mejor"


def test_bad_entries_are_skipped_without_stopping(
    session: Session, tmp_path: Path
) -> None:
    """An unknown product or an invalid entry does not stop the others."""
    product = create_product(session, external_id=1)
    _write_file(
        tmp_path,
        "es.json",
        {
            # No product has this external id.
            "99": {"title": "Sin producto"},
            "not a number": {"title": "Sin producto"},
            # Invalid: empty title, missing title, not an object, a NUL
            # character, a title longer than the column.
            "2": {"title": "   "},
            "3": {"description": "Sin título"},
            "4": "not an object",
            "5": {"title": "a\x00b"},
            "6": {"title": "a" * 256},
            "1": {"title": "Mochila"},
        },
    )

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 1
    assert summary.skipped == 7
    (row,) = _read_translations(session)
    assert row.product_id == product.id
    assert row.title == "Mochila"


def test_second_key_of_the_same_product_is_skipped(
    session: Session, tmp_path: Path
) -> None:
    """ "1" and "01" are one product: the first is kept, the load goes on."""
    create_product(session, external_id=1)
    create_product(session, external_id=2)
    _write_file(
        tmp_path,
        "es.json",
        {
            "1": {"title": "Mochila"},
            "01": {"title": "Repetida"},
            "2": {"title": "Anillo"},
        },
    )

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 2
    assert summary.skipped == 1
    first, second = _read_translations(session)
    assert first.title == "Mochila"
    assert second.title == "Anillo"


def test_files_of_other_languages_are_ignored(
    session: Session, tmp_path: Path
) -> None:
    """Only a supported language that is not the source is loaded."""
    create_product(session, external_id=1)
    # Not a value of Language.
    _write_file(tmp_path, "fr.json", {"1": {"title": "Sac à dos"}})
    # The source language: its text is the one of the products table.
    _write_file(tmp_path, "en.json", {"1": {"title": "Backpack"}})
    # Not a JSON file at all.
    (tmp_path / "notes.txt").write_text("not a translation file")

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 0
    assert summary.skipped == 0
    assert _read_translations(session) == []


def test_broken_file_does_not_stop_the_other_files(
    session: Session, tmp_path: Path
) -> None:
    """A file that is not a JSON object is skipped as a whole."""
    create_product(session, external_id=1)
    (tmp_path / "es.json").write_text("{ this is not JSON")

    broken_summary = _make_service(session, tmp_path).run()
    _write_file(tmp_path, "es.json", ["a list, not an object"])
    list_summary = _make_service(session, tmp_path).run()

    assert broken_summary.stored == 0
    assert list_summary.stored == 0
    assert _read_translations(session) == []


def test_empty_folder_stores_nothing(session: Session, tmp_path: Path) -> None:
    """No files is not an error."""
    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 0
    assert summary.skipped == 0


def test_bundled_spanish_file_is_complete_and_valid() -> None:
    """The shipped es.json has the 20 Fake Store products, all valid."""
    path = TRANSLATIONS_DIR / "es.json"
    content = json.loads(path.read_text(encoding="utf-8"))

    assert sorted(content, key=int) == [str(n) for n in range(1, 21)]
    for value in content.values():
        entry = TranslationEntry.model_validate(value)
        assert entry.title
        assert entry.description
