"""HTTP client of the Fake Store API, the source of the import."""

import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger(__name__)

USER_AGENT = "product-explorer/1.0 (catalogue import)"


class FakeStoreUnavailableError(Exception):
    """Fake Store did not give a usable answer."""


class ImageDownloadError(Exception):
    """One product image could not be downloaded."""


@dataclass(frozen=True)
class DownloadedImage:
    """The body of an image response and its declared content type."""

    content: bytes
    content_type: str


class FakeStoreClient:
    """Read products and images from Fake Store. Only GET is used."""

    def __init__(
        self,
        base_url: str,
        timeout_seconds: float,
        max_retries: int,
        backoff_seconds: float = 0.5,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        """Create the client.

        ``transport`` lets the tests replace the network with
        ``httpx.MockTransport``. ``backoff_seconds`` is the wait before
        the first retry; it doubles on every further retry.
        """
        self._base_url = httpx.URL(base_url.rstrip("/"))
        self._max_retries = max_retries
        self._backoff_seconds = backoff_seconds
        # Redirects are not followed (the httpx default), so a response
        # always comes from the host that was requested.
        self._http = httpx.Client(
            timeout=timeout_seconds,
            headers={"User-Agent": USER_AGENT},
            transport=transport,
        )

    def close(self) -> None:
        """Release the network connections."""
        self._http.close()

    def fetch_products(self) -> list[Any]:
        """Return the raw product records, not validated yet."""
        response = self._get(f"{self._base_url}/products")
        if response.status_code != httpx.codes.OK:
            raise FakeStoreUnavailableError(
                f"Fake Store answered HTTP {response.status_code}"
            )
        try:
            records = response.json()
        except ValueError as error:
            raise FakeStoreUnavailableError(
                "Fake Store did not answer with JSON"
            ) from error
        if not isinstance(records, list):
            raise FakeStoreUnavailableError(
                "Fake Store did not answer with a JSON list"
            )
        return records

    def download_image(self, url: str) -> DownloadedImage:
        """Download one image from the same host as the products."""
        if httpx.URL(url).host != self._base_url.host:
            raise ImageDownloadError(f"Image is on another host: {url}")
        try:
            response = self._get(url)
        except FakeStoreUnavailableError as error:
            raise ImageDownloadError(str(error)) from error
        if response.status_code != httpx.codes.OK:
            raise ImageDownloadError(
                f"Image answered HTTP {response.status_code}: {url}"
            )
        return DownloadedImage(
            content=response.content,
            content_type=response.headers.get("content-type", ""),
        )

    def _get(self, url: str) -> httpx.Response:
        """Send a GET, retrying transport errors and HTTP 5xx."""
        attempts = self._max_retries + 1
        for attempt in range(1, attempts + 1):
            try:
                response = self._http.get(url)
            except httpx.TransportError as error:
                failure = f"{type(error).__name__}: {error}"
            else:
                if not response.is_server_error:
                    return response
                failure = f"HTTP {response.status_code}"

            logger.warning(
                "Fake Store request failed",
                extra={"url": url, "attempt": attempt, "failure": failure},
            )
            if attempt < attempts:
                # Exponential backoff: 0.5 s, 1 s, 2 s, ...
                time.sleep(self._backoff_seconds * 2 ** (attempt - 1))

        raise FakeStoreUnavailableError(
            f"GET {url} failed after {attempts} attempts ({failure})"
        )
