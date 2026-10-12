"""Import tests: what is written when Fake Store answers."""

from decimal import Decimal
from pathlib import Path

from sqlalchemy.orm import Session

from tests.fake_store import FakeStoreStub, make_record
from tests.helpers import make_import_service, read_products


def test_import_stores_products_and_images(
    session: Session, tmp_path: Path
) -> None:
    """One run writes every record and downloads its image."""
    stub = FakeStoreStub([make_record(1), make_record(2)])

    summary = make_import_service(session, stub, tmp_path).run()

    assert summary.fetched == 2
    assert summary.imported == 2
    assert summary.skipped == 0
    assert summary.images_downloaded == 2
    assert summary.images_failed == 0

    first, second = read_products(session)
    assert first.external_id == 1
    assert first.title == "Product 1"
    assert first.price == Decimal("10.50")
    assert first.category == "electronics"
    assert first.rating_rate == Decimal("4.1")
    assert first.rating_count == 25
    assert first.image_path == "1.png"
    assert second.image_path == "2.png"
    assert sorted(path.name for path in tmp_path.iterdir()) == [
        "1.png",
        "2.png",
    ]


def test_import_twice_gives_the_same_rows(
    session: Session, tmp_path: Path
) -> None:
    """Idempotency: a second run adds nothing and downloads nothing."""
    stub = FakeStoreStub([make_record(1), make_record(2)])
    service = make_import_service(session, stub, tmp_path)

    service.run()
    rows_after_first_run = read_products(session)
    second_summary = service.run()
    rows_after_second_run = read_products(session)

    assert len(rows_after_second_run) == 2
    for before, after in zip(
        rows_after_first_run, rows_after_second_run, strict=True
    ):
        assert after.id == before.id
        assert after.external_id == before.external_id
        assert after.title == before.title
        assert after.image_path == before.image_path
        assert after.created_at == before.created_at
    assert second_summary.imported == 2
    assert second_summary.images_downloaded == 0
    assert len(stub.image_requests()) == 2
    assert len(list(tmp_path.iterdir())) == 2


def test_second_import_updates_products_in_place(
    session: Session, tmp_path: Path
) -> None:
    """Upsert: changed data replaces the old values in the same row."""
    stub = FakeStoreStub([make_record(1)])
    service = make_import_service(session, stub, tmp_path)
    service.run()
    (before,) = read_products(session)

    stub.records = [make_record(1, title="New title", price=99.99)]
    service.run()
    (after,) = read_products(session)

    assert after.id == before.id
    assert after.title == "New title"
    assert after.price == Decimal("99.99")
    assert after.image_path == "1.png"
    assert after.created_at == before.created_at
    assert after.updated_at > before.updated_at


def test_invalid_records_are_skipped(session: Session, tmp_path: Path) -> None:
    """Validation: bad records are left out, the good ones are imported."""
    without_title = make_record(2)
    del without_title["title"]
    stub = FakeStoreStub(
        [
            make_record(1),
            without_title,
            make_record(3, price=-1),
            "not an object",
            make_record(5, rating=None, description="", image=None),
        ]
    )

    summary = make_import_service(session, stub, tmp_path).run()

    assert summary.fetched == 5
    assert summary.imported == 2
    assert summary.skipped == 3
    rows = read_products(session)
    assert [row.external_id for row in rows] == [1, 5]
    assert rows[1].rating_rate is None
    assert rows[1].image_path is None
