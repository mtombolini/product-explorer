"""JSON logging built on the standard logging module."""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime

# The id of the request being handled, or None outside a request (for
# example in the seed command). The request middleware sets it; a context
# variable keeps one value per request even when requests overlap.
request_id_context: ContextVar[str | None] = ContextVar(
    "request_id", default=None
)

# Attributes that every LogRecord has. Anything else on a record was
# passed by the caller through ``extra=`` and is added to the JSON line.
_STANDARD_ATTRIBUTES = set(vars(logging.makeLogRecord({}))) | {
    "message",
    "asctime",
}


class RequestIdFilter(logging.Filter):
    """Add the current request id to every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Attach ``request_id`` when a request is in progress."""
        request_id = request_id_context.get()
        if request_id is not None:
            record.request_id = request_id
        return True


class JsonFormatter(logging.Formatter):
    """Format a log record as one line of JSON."""

    def format(self, record: logging.LogRecord) -> str:
        """Return the record as a JSON string."""
        timestamp = datetime.fromtimestamp(record.created, tz=UTC)
        entry = {
            "timestamp": timestamp.isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for name, value in vars(record).items():
            if name not in _STANDARD_ATTRIBUTES:
                entry[name] = value
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        # default=str: values such as Path or Decimal are written as text.
        return json.dumps(entry, default=str)


def configure_logging(level: str) -> None:
    """Send every log record to standard output as JSON."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())

    # httpx logs every request at INFO. The client logs its own attempts.
    logging.getLogger("httpx").setLevel(logging.WARNING)

    # uvicorn installs its own plain-text handlers. Removing them lets its
    # records reach the root handler, so every line has the same format.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
