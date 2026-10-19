"""ImageStorage: what is accepted and how it is stored."""

import io
from pathlib import Path

import pytest
from PIL import Image

from app.repositories.image_storage import (
    MAX_IMAGE_SIDE,
    ImageStorage,
    InvalidImageError,
)
from tests.fake_store import make_image_bytes


def _stored_image(path: Path) -> Image.Image:
    """Open a stored file and return the decoded image."""
    image = Image.open(io.BytesIO(path.read_bytes()))
    image.load()
    return image


def test_image_is_stored_as_webp_with_its_size(tmp_path: Path) -> None:
    """A small image keeps its size; the format becomes WebP."""
    storage = ImageStorage(tmp_path)

    file_name = storage.save(7, make_image_bytes(40, 30), "image/png")

    assert file_name == "7.webp"
    image = _stored_image(tmp_path / file_name)
    assert image.format == "WEBP"
    assert image.size == (40, 30)


def test_large_image_is_shrunk_keeping_its_proportions(
    tmp_path: Path,
) -> None:
    """The longest side becomes MAX_IMAGE_SIDE; nothing is cropped."""
    storage = ImageStorage(tmp_path)

    storage.save(1, make_image_bytes(2000, 1000), "image/jpeg")

    image = _stored_image(tmp_path / "1.webp")
    assert image.size == (MAX_IMAGE_SIDE, MAX_IMAGE_SIDE // 2)


def test_content_that_is_not_an_image_is_rejected(tmp_path: Path) -> None:
    """The content type alone is not trusted: the bytes are decoded."""
    storage = ImageStorage(tmp_path)

    with pytest.raises(InvalidImageError):
        storage.save(1, b"<script>alert(1)</script>", "image/png")
    assert list(tmp_path.iterdir()) == []


def test_unsupported_type_is_rejected(tmp_path: Path) -> None:
    """SVG can carry scripts and is never stored."""
    storage = ImageStorage(tmp_path)

    with pytest.raises(InvalidImageError):
        storage.save(1, b"<svg/>", "image/svg+xml")
