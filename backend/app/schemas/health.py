"""Pydantic model of the health response."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """State of the API, its database and the imported catalogue."""

    status: Literal["ok", "unavailable"]
    database: Literal["ok", "unavailable"]
    catalogue_seeded: bool
    product_count: int
