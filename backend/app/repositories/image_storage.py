"""File system access of the product images."""

import os
from pathlib import Path

MAX_IMAGE_BYTES = 5 * 1024 * 1024

# The accepted image types and the extension each one is stored with.
# SVG is left out on purpose: it can carry scripts.
EXTENSIONS_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


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
        """Check and store one image. Return its file name.

        The file is named ``{external_id}{extension}``.
        """
        # "image/png; charset=binary" -> "image/png"
        media_type = content_type.split(";")[0].strip().lower()
        extension = EXTENSIONS_BY_CONTENT_TYPE.get(media_type)
        if extension is None:
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

        file_name = f"{external_id}{extension}"
        # Atomic write: the content goes to a temporary file that is then
        # renamed, so a reader never sees a half-written image.
        temporary_path = self._images_dir / f"{file_name}.tmp"
        temporary_path.write_bytes(content)
        os.replace(temporary_path, self._images_dir / file_name)
        return file_name
