"""Loader tests: the taxonomy, the product values and what is stored."""

import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Language, ProductSpecification
from app.repositories.product_repository import ProductRepository
from app.schemas.specification import ProductValues, Taxonomy
from app.services.specification_service import (
    PRODUCTS_FILE,
    SPECIFICATIONS_DIR,
    TAXONOMY_FILE,
    SpecificationLoadService,
)
from tests.factories import create_product

TAXONOMY = {
    "general": ["brand"],
    "families": {"storage": ["capacity", "interface"], "tops": ["material"]},
    "labels": {
        "en": {
            "general": "General",
            "storage": "Storage",
            "tops": "Tops",
            "brand": "Brand",
            "capacity": "Capacity",
            "interface": "Interface",
            "material": "Material",
        },
        "es": {
            "general": "General",
            "storage": "Almacenamiento",
            "tops": "Camisetas",
            "brand": "Marca",
            "capacity": "Capacidad",
            "interface": "Interfaz",
            "material": "Material",
        },
    },
}
DRIVE = {"family": "storage", "values": {"brand": "WD", "capacity": "2 TB"}}
SHIRT = {
    "family": "tops",
    "values": {"material": {"en": "Cotton", "es": "Algodón"}},
}


def _write_files(
    directory: Path, products: Any, taxonomy: Any = TAXONOMY
) -> None:
    """Write the taxonomy and the product values as JSON."""
    for name, content in (
        (TAXONOMY_FILE, taxonomy),
        (PRODUCTS_FILE, products),
    ):
        path = directory / name
        path.write_text(json.dumps(content), encoding="utf-8")


def _make_service(
    session: Session, directory: Path
) -> SpecificationLoadService:
    """Build the loader on the test database and a temporary folder."""
    return SpecificationLoadService(ProductRepository(session), directory)


def _read_specifications(
    session: Session, language: str | None = None
) -> list[tuple[Any, ...]]:
    """Return the specification rows as stored now, in a fixed order.

    Each row is (product_id, language, position, attribute,
    group_label, label, value).
    """
    table = ProductSpecification.__table__
    statement = select(
        table.c.product_id,
        table.c.language,
        table.c.position,
        table.c.attribute,
        table.c.group_label,
        table.c.label,
        table.c.value,
    ).order_by(table.c.product_id, table.c.language, table.c.position)
    if language is not None:
        statement = statement.where(table.c.language == language)
    return [tuple(row) for row in session.execute(statement)]


def test_load_stores_one_line_per_attribute_of_the_family(
    session: Session, tmp_path: Path
) -> None:
    """General lines first, then the family; no value gives None."""
    drive = create_product(session, external_id=10)
    shirt = create_product(session, external_id=20)
    _write_files(tmp_path, {"10": DRIVE, "20": SHIRT})

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 2
    assert summary.skipped == 0
    assert _read_specifications(session, "es") == [
        (drive.id, "es", 1, "brand", "General", "Marca", "WD"),
        (drive.id, "es", 2, "capacity", "Almacenamiento", "Capacidad", "2 TB"),
        (drive.id, "es", 3, "interface", "Almacenamiento", "Interfaz", None),
        (shirt.id, "es", 1, "brand", "General", "Marca", None),
        (shirt.id, "es", 2, "material", "Camisetas", "Material", "Algodón"),
    ]
    assert _read_specifications(session, "en")[-1] == (
        shirt.id,
        "en",
        2,
        "material",
        "Tops",
        "Material",
        "Cotton",
    )


def test_products_of_one_family_have_the_same_lines(
    session: Session, tmp_path: Path
) -> None:
    """Same attributes in the same order, whatever values are known."""
    create_product(session, external_id=1)
    create_product(session, external_id=2)
    other = {"family": "storage", "values": {"interface": "USB 3.0"}}
    _write_files(tmp_path, {"1": DRIVE, "2": other})

    _make_service(session, tmp_path).run()

    rows = _read_specifications(session, "en")
    first = [row[3] for row in rows[:3]]
    second = [row[3] for row in rows[3:]]
    assert first == second == ["brand", "capacity", "interface"]


def test_load_twice_gives_the_same_rows(
    session: Session, tmp_path: Path
) -> None:
    """Idempotency: a second run adds nothing and changes nothing."""
    create_product(session, external_id=1)
    create_product(session, external_id=2)
    _write_files(tmp_path, {"1": DRIVE, "2": SHIRT})
    service = _make_service(session, tmp_path)

    service.run()
    rows_after_first_run = _read_specifications(session)
    second_summary = service.run()
    rows_after_second_run = _read_specifications(session)

    # 3 + 2 lines, in two languages.
    assert len(rows_after_second_run) == 10
    assert rows_after_second_run == rows_after_first_run
    assert second_summary.stored == 2
    assert second_summary.skipped == 0


def test_change_of_family_replaces_the_old_lines(
    session: Session, tmp_path: Path
) -> None:
    """Replace: no line of the longer old list is left behind."""
    product = create_product(session, external_id=1)
    service = _make_service(session, tmp_path)
    _write_files(tmp_path, {"1": DRIVE})
    service.run()

    _write_files(tmp_path, {"1": SHIRT})
    service.run()

    assert _read_specifications(session, "en") == [
        (product.id, "en", 1, "brand", "General", "Brand", None),
        (product.id, "en", 2, "material", "Tops", "Material", "Cotton"),
    ]


def test_invalid_product_is_skipped_as_a_whole(
    session: Session, tmp_path: Path
) -> None:
    """One bad value skips the product and keeps what it had stored."""
    product = create_product(session, external_id=1)
    for external_id in range(2, 10):
        create_product(session, external_id=external_id)
    service = _make_service(session, tmp_path)
    _write_files(tmp_path, {"1": DRIVE})
    service.run()

    _write_files(
        tmp_path,
        {
            # A good value and an empty one: nothing new is stored.
            "1": {
                "family": "storage",
                "values": {"brand": "SanDisk", "capacity": "   "},
            },
            # Invalid: unknown family, attribute of another family, a
            # value missing in one language, a NUL character, a text
            # longer than the column, no family, not an object.
            "2": {"family": "furniture", "values": {}},
            "3": {"family": "storage", "values": {"material": "Steel"}},
            "4": {"family": "tops", "values": {"material": {"en": "Wool"}}},
            "5": {"family": "tops", "values": {"material": "a\x00b"}},
            "6": {"family": "tops", "values": {"material": "x" * 256}},
            "7": {"values": {"brand": "WD"}},
            "8": ["storage"],
            "9": SHIRT,
        },
    )
    summary = service.run()

    assert summary.stored == 1
    assert summary.skipped == 8
    rows = _read_specifications(session, "en")
    assert rows[0] == (product.id, "en", 1, "brand", "General", "Brand", "WD")
    assert [row[3] for row in rows] == [
        "brand",
        "capacity",
        "interface",
        "brand",
        "material",
    ]


def test_unknown_and_repeated_products_are_skipped(
    session: Session, tmp_path: Path
) -> None:
    """No such product, or a second key for one: skipped, the load goes on."""
    product = create_product(session, external_id=1)
    other = create_product(session, external_id=2)
    _write_files(
        tmp_path,
        {
            "99": SHIRT,
            "not a number": SHIRT,
            "1": DRIVE,
            # "1" and "01" are one product: the first is kept.
            "01": SHIRT,
            "2": SHIRT,
        },
    )

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 2
    assert summary.skipped == 3
    stored = {(row[0], row[3]) for row in _read_specifications(session)}
    assert stored == {
        (product.id, "brand"),
        (product.id, "capacity"),
        (product.id, "interface"),
        (other.id, "brand"),
        (other.id, "material"),
    }


def test_unusable_taxonomy_stores_nothing(
    session: Session, tmp_path: Path
) -> None:
    """Missing, broken or incomplete taxonomy: the load does nothing."""
    create_product(session, external_id=1)
    service = _make_service(session, tmp_path)
    without_spanish = TAXONOMY | {"labels": {"en": TAXONOMY["labels"]["en"]}}

    # No file at all.
    assert service.run().stored == 0
    (tmp_path / TAXONOMY_FILE).write_text("{ this is not JSON")
    assert service.run().stored == 0
    _write_files(tmp_path, {"1": DRIVE}, without_spanish)
    assert service.run().stored == 0

    assert _read_specifications(session) == []


def test_broken_products_file_stores_nothing(
    session: Session, tmp_path: Path
) -> None:
    """A products file that is not a JSON object is skipped as a whole."""
    create_product(session, external_id=1)
    _write_files(tmp_path, {})
    (tmp_path / PRODUCTS_FILE).write_text("{ this is not JSON")

    summary = _make_service(session, tmp_path).run()

    assert summary.stored == 0
    assert _read_specifications(session) == []


def test_bundled_files_are_complete_and_valid() -> None:
    """The shipped files describe the 20 products within the taxonomy."""
    taxonomy = Taxonomy.model_validate(
        json.loads((SPECIFICATIONS_DIR / TAXONOMY_FILE).read_text("utf-8"))
    )
    products = json.loads(
        (SPECIFICATIONS_DIR / PRODUCTS_FILE).read_text("utf-8")
    )

    assert sorted(products, key=int) == [str(n) for n in range(1, 21)]
    used_families = set()
    for entry in products.values():
        values = ProductValues.model_validate(entry)
        allowed = {key for _, key in taxonomy.attributes_of(values.family)}
        assert set(values.values) <= allowed
        # No product is a list of empty lines.
        assert values.values
        for language in Language:
            for key in values.values:
                assert values.value_in(key, language)
        used_families.add(values.family)
    # No family without a product.
    assert used_families == set(taxonomy.families)
