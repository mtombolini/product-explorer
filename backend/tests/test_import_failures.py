"""Import tests: what happens when Fake Store or its images fail."""

from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.clients.fakestore_client import FakeStoreUnavailableError
from tests.fake_store import FakeStoreStub, make_record
from tests.helpers import make_import_service, read_products


def test_failed_image_keeps_the_placeholder(
    session: Session, tmp_path: Path
) -> None:
    """A product whose image fails is imported with an empty image_path."""
    stub = FakeStoreStub([make_record(1), make_record(2)])
    stub.broken_image_paths = {"/img/1.png"}

    summary = make_import_service(session, stub, tmp_path).run()

    assert summary.imported == 2
    assert summary.images_downloaded == 1
    assert summary.images_failed == 1
    first, second = read_products(session)
    assert first.image_path is None
    assert second.image_path == "2.png"
    assert [path.name for path in tmp_path.iterdir()] == ["2.png"]


def test_image_from_another_host_is_not_downloaded(
    session: Session, tmp_path: Path
) -> None:
    """Only images on the host of the source are requested."""
    stub = FakeStoreStub(
        [make_record(1, image="https://elsewhere.test/img/1.png")]
    )

    summary = make_import_service(session, stub, tmp_path).run()

    assert summary.images_failed == 1
    assert stub.image_requests() == []
    (product,) = read_products(session)
    assert product.image_path is None


def test_three_image_failures_in_a_row_stop_the_downloads(
    session: Session, tmp_path: Path
) -> None:
    """After 3 consecutive failures the remaining images are not tried."""
    stub = FakeStoreStub([make_record(number) for number in range(1, 6)])
    stub.broken_image_paths = {f"/img/{number}.png" for number in range(1, 6)}

    summary = make_import_service(session, stub, tmp_path).run()

    assert summary.imported == 5
    assert summary.images_downloaded == 0
    assert summary.images_failed == 3
    assert stub.image_requests() == ["/img/1.png", "/img/2.png", "/img/3.png"]
    assert len(read_products(session)) == 5


def test_source_unavailable_leaves_the_table_untouched(
    session: Session, tmp_path: Path
) -> None:
    """Resilience: a failed fetch raises and writes nothing."""
    stub = FakeStoreStub([make_record(1)])
    service = make_import_service(session, stub, tmp_path, max_retries=2)
    service.run()
    rows_before = read_products(session)

    stub.records = [make_record(1, title="Changed"), make_record(2)]
    stub.product_failures_left = 3
    with pytest.raises(FakeStoreUnavailableError):
        service.run()

    assert read_products(session) == rows_before
    # The first successful run, then one attempt and two retries.
    assert stub.requested_paths.count("/products") == 4


def test_body_that_is_not_a_list_counts_as_unavailable(
    session: Session, tmp_path: Path
) -> None:
    """A JSON object where a list is expected stops the run."""
    stub = FakeStoreStub({"message": "maintenance"})

    with pytest.raises(FakeStoreUnavailableError):
        make_import_service(session, stub, tmp_path).run()

    assert read_products(session) == []


def test_retries_succeed_after_transient_failures(
    session: Session, tmp_path: Path
) -> None:
    """Two failed attempts followed by a good answer still import."""
    stub = FakeStoreStub([make_record(1)])
    stub.product_failures_left = 2

    summary = make_import_service(session, stub, tmp_path, max_retries=2).run()

    assert summary.imported == 1
    assert stub.requested_paths.count("/products") == 3
    assert len(read_products(session)) == 1
