"""Import tests: what is written when Fake Store answers."""

from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.fake_store import BASE_URL, FakeStoreStub, make_record
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
    assert first.image_path == "1.webp"
    assert second.image_path == "2.webp"
    assert sorted(path.name for path in tmp_path.iterdir()) == [
        "1.webp",
        "2.webp",
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
    assert after.image_path == "1.webp"
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
            # Values PostgreSQL would refuse: too large, or with a NUL.
            make_record(2**31),
            make_record(6, rating={"rate": 4.1, "count": 2**31}),
            make_record(7, title="a\x00b"),
            make_record(8, image="https://host/a\x00b.png"),
        ]
    )

    summary = make_import_service(session, stub, tmp_path).run()

    assert summary.fetched == 9
    assert summary.imported == 2
    assert summary.skipped == 7
    rows = read_products(session)
    assert [row.external_id for row in rows] == [1, 5]
    assert rows[1].rating_rate is None
    assert rows[1].image_path is None


def test_import_stores_the_image_source_url(
    session: Session, tmp_path: Path
) -> None:
    """The URL is kept as sent, and is NULL for a record without image."""
    stub = FakeStoreStub([make_record(1), make_record(2, image=None)])

    make_import_service(session, stub, tmp_path).run()

    first, second = read_products(session)
    assert first.image_source_url == f"{BASE_URL}/img/1.png"
    assert first.image_path == "1.webp"
    assert second.image_source_url is None
    assert second.image_path is None


def test_second_import_follows_a_changed_image_url(
    session: Session, tmp_path: Path
) -> None:
    """Upsert: the stored URL is the one of the last import."""
    stub = FakeStoreStub([make_record(1), make_record(2)])
    service = make_import_service(session, stub, tmp_path)
    service.run()

    new_url = f"{BASE_URL}/img/new-1.png"
    stub.records = [make_record(1, image=new_url), make_record(2, image="")]
    service.run()

    first, second = read_products(session)
    assert first.image_source_url == new_url
    assert second.image_source_url is None


def test_image_source_url_is_not_in_the_api_response(
    client: TestClient, session: Session, tmp_path: Path
) -> None:
    """The source URL is internal: the API only sends its own path."""
    stub = FakeStoreStub([make_record(1)])
    make_import_service(session, stub, tmp_path).run()
    (row,) = read_products(session)

    one = client.get(f"/api/products/{row.id}")
    page = client.get("/api/products")

    assert "image_source_url" not in one.json()
    assert "image_source_url" not in page.json()["items"][0]
    assert one.json()["image_url"] == "/images/1.webp"
    assert BASE_URL not in one.text
    assert BASE_URL not in page.text
