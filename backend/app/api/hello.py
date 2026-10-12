"""Temporary endpoint that proves the Nginx proxy reaches the API.

It is removed when the product endpoints are added.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["hello"])


@router.get("/hello")
def read_hello() -> dict[str, str]:
    """Return a fixed greeting."""
    return {"message": "Hello from the Product Explorer API"}
