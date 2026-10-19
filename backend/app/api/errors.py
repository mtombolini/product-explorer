"""The single error envelope and the handlers that produce it.

Every error response of the API has the same body::

    {"error": {"code": "...", "message": "...", "details": [...]}}
"""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.schemas.error import ErrorBody, ErrorDetail, ErrorResponse
from app.services.exceptions import ProductNotFoundError

# Code and message of the HTTP errors raised by the framework itself,
# such as an unknown route or a wrong method.
HTTP_ERRORS = {
    status.HTTP_404_NOT_FOUND: (
        "not_found",
        "The requested resource was not found.",
    ),
    status.HTTP_405_METHOD_NOT_ALLOWED: (
        "method_not_allowed",
        "This method is not allowed for the requested resource.",
    ),
}

# Documents the envelope in OpenAPI for the routes that can return it.
VALIDATION_ERROR_RESPONSE: dict[int | str, dict[str, Any]] = {
    status.HTTP_422_UNPROCESSABLE_CONTENT: {
        "model": ErrorResponse,
        "description": "A query or path parameter is not valid.",
    }
}
NOT_FOUND_RESPONSE: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "The product does not exist.",
    }
}


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: list[ErrorDetail] | None = None,
) -> JSONResponse:
    """Build an error response with the shared envelope."""
    body = ErrorResponse(
        error=ErrorBody(code=code, message=message, details=details or [])
    )
    return JSONResponse(status_code=status_code, content=body.model_dump())


def internal_error_response() -> JSONResponse:
    """Build the answer to an unexpected error. It reveals no internals."""
    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_error",
        "An unexpected error occurred.",
    )


async def handle_validation_error(
    request: Request, error: RequestValidationError
) -> JSONResponse:
    """Answer 422 and list each invalid parameter."""
    details = [
        ErrorDetail(
            # loc is ("query", "page_size") or ("path", "product_id"):
            # the first part is where the value came from.
            field=".".join(str(part) for part in item["loc"][1:]),
            message=item["msg"],
        )
        for item in error.errors()
    ]
    return error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "validation_error",
        "The request is not valid.",
        details,
    )


async def handle_product_not_found(
    request: Request, error: ProductNotFoundError
) -> JSONResponse:
    """Answer 404 when the requested product does not exist."""
    return error_response(
        status.HTTP_404_NOT_FOUND, "product_not_found", str(error)
    )


async def handle_http_error(
    request: Request, error: HTTPException
) -> JSONResponse:
    """Answer the HTTP errors raised by the framework with the envelope."""
    code, message = HTTP_ERRORS.get(
        error.status_code, ("http_error", "The request could not be handled.")
    )
    return error_response(error.status_code, code, message)


def register_error_handlers(app: FastAPI) -> None:
    """Attach the handlers to the application."""
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(ProductNotFoundError, handle_product_not_found)
    app.add_exception_handler(HTTPException, handle_http_error)
