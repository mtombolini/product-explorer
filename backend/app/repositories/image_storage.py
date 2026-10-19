"""File system access of the product images."""

import io
import os
from pathlib import Path

from PIL import Image

MAX_IMAGE_BYTES = 5 * 1024 * 1024

# The image types accepted from the source. SVG is left out on purpose:
# it can carry scripts.
ACCEPTED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# Every image is stored as WebP, at most this many pixels on its longest
# side. The product page shows an image at about 650 CSS pixels at most;
# 1000 keeps it sharp on most high-density screens. The source images
# are PNG files of 100 to 460 kB; as WebP they are a fraction of that.
STORED_EXTENSION = ".webp"
MAX_IMAGE_SIDE = 1000
WEBP_QUALITY = 80


class InvalidImageError(Exception):
    """A downloaded file is not an image that can be stored."""


class ImageStorage:
    """Store product images as files inside one directory."""

    def __init__(self, images_dir: Path) -> None:
        """Create the storage on a directory, which is created if needed."""
        self._images_dir = images_dir
        self._images_dir.mkdir(parents=True, exist_ok=True)

    def exists(self, file_name: str) -> bool:
        """Tell whether an image file is stored."""
        return (self._images_dir / file_name).is_file()

    def save(self, external_id: int, content: bytes, content_type: str) -> str:
        """Check, convert and store one image. Return its file name.

        The file is named ``{external_id}.webp``. The content must really
        be an image: it is decoded, so a file that only claims to be one
        is rejected.
        """
        # "image/png; charset=binary" -> "image/png"
        media_type = content_type.split(";")[0].strip().lower()
        if media_type not in ACCEPTED_CONTENT_TYPES:
            raise InvalidImageError(
                f"Unsupported content type: {content_type!r}"
            )
        if not content:
            raise InvalidImageError("The image is empty")
        if len(content) > MAX_IMAGE_BYTES:
            raise InvalidImageError(
                f"The image has {len(content)} bytes, the limit is "
                f"{MAX_IMAGE_BYTES}"
            )
        webp = _to_webp(content)

        file_name = f"{external_id}{STORED_EXTENSION}"
        # Atomic write: the content goes to a temporary file that is then
        # renamed, so a reader never sees a half-written image.
        temporary_path = self._images_dir / f"{file_name}.tmp"
        temporary_path.write_bytes(webp)
        os.replace(temporary_path, self._images_dir / file_name)
        return file_name


def _to_webp(content: bytes) -> bytes:
    """Decode an image, shrink it if needed and encode it as WebP.

    Raise InvalidImageError when the bytes are not an image Pillow can
    read, or when it would be too large to decode safely (Pillow refuses
    images of more than about 89 million pixels).
    """
    try:
        with Image.open(io.BytesIO(content)) as image:
            image.load()
            has_alpha = image.mode in {"RGBA", "LA"} or (
                "transparency" in image.info
            )
            converted = image.convert("RGBA" if has_alpha else "RGB")
    except (OSError, Image.DecompressionBombError) as error:
        raise InvalidImageError(f"Not a readable image: {error}") from error
    # thumbnail() keeps the proportions and never enlarges.
    converted.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
    output = io.BytesIO()
    converted.save(output, format="WEBP", quality=WEBP_QUALITY)
    return output.getvalue()
