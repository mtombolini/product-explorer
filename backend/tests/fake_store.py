"""A stand-in for Fake Store used by the import tests.

The tests never touch the network: ``FakeStoreStub.handle`` is given to
``httpx.MockTransport`` and answers the requests of the client.
"""

from typing import Any

import httpx

BASE_URL = "https://fakestore.test"

# The content does not have to be a real picture: the import checks the
# content type and the size, not the pixels.
IMAGE_BYTES = b"fake image content"


def make_record(external_id: int, **overrides: Any) -> dict[str, Any]:
    """Return one product as Fake Store sends it."""
    record = {
        "id": external_id,
        "title": f"Product {external_id}",
        "price": 10.5,
        "description": f"Description of product {external_id}",
        "category": "electronics",
        "image": f"{BASE_URL}/img/{external_id}.png",
        "rating": {"rate": 4.1, "count": 25},
    }
    record.update(overrides)
    return record


class FakeStoreStub:
    """Answer ``/products`` and ``/img/{id}.png`` like Fake Store.

    The public attributes are set by each test to describe the situation
    it needs.
    """

    def __init__(self, records: Any) -> None:
        """Create a healthy source that serves the given records."""
        # The JSON body of /products. Normally a list of records.
        self.records = records
        # How many times /products answers HTTP 503 before it works.
        self.product_failures_left = 0
        # Paths of the images that answer HTTP 404.
        self.broken_image_paths: set[str] = set()
        # The path of every request received, in order.
        self.requested_paths: list[str] = []

    def handle(self, request: httpx.Request) -> httpx.Response:
        """Answer one request."""
        path = request.url.path
        self.requested_paths.append(path)

        if path == "/products":
            if self.product_failures_left > 0:
                self.product_failures_left -= 1
                return httpx.Response(503)
            return httpx.Response(200, json=self.records)

        if path in self.broken_image_paths:
            return httpx.Response(404)
        return httpx.Response(
            200, content=IMAGE_BYTES, headers={"Content-Type": "image/png"}
        )

    def image_requests(self) -> list[str]:
        """Return the paths of the image requests received."""
        return [path for path in self.requested_paths if path != "/products"]
