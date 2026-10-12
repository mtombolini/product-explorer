"""Request middleware: request id, access log and the last-resort 500."""

import logging
import re
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response

from app.api.errors import internal_error_response
from app.core.logging import request_id_context

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"

# An incoming id is reused only when it is short and made of safe
# characters, so a client cannot inject arbitrary text into the logs or
# the response headers.
VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9-]{1,64}")


def choose_request_id(incoming: str | None) -> str:
    """Reuse a valid incoming request id or create a new one."""
    if incoming and VALID_REQUEST_ID.fullmatch(incoming):
        return incoming
    return uuid.uuid4().hex


async def request_context_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Wrap one request.

    * Give the request an id, visible in every log line written while it
      is handled and returned in the ``X-Request-ID`` header.
    * Turn any error that nothing else handled into the generic 500
      answer, after logging it once with its traceback.
    * Write one access log line with method, path, status and duration.
    """
    request_id = choose_request_id(request.headers.get(REQUEST_ID_HEADER))
    token = request_id_context.set(request_id)
    started = time.perf_counter()
    try:
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled error")
            response = internal_error_response()

        response.headers[REQUEST_ID_HEADER] = request_id
        logger.info(
            "Request handled",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(
                    (time.perf_counter() - started) * 1000, 1
                ),
            },
        )
        return response
    finally:
        request_id_context.reset(token)
