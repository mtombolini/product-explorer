"""Pydantic models of the error envelope shared by every error."""

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """One problem with one field of the request."""

    field: str
    message: str


class ErrorBody(BaseModel):
    """What went wrong, for programs (code) and for people (message)."""

    code: str
    message: str
    details: list[ErrorDetail]


class ErrorResponse(BaseModel):
    """The body of every error response: ``{"error": {...}}``."""

    error: ErrorBody
