"""JSON logging built on the standard logging module."""

import json
import logging
import sys
from datetime import UTC, datetime

# Attributes that every LogRecord has. Anything else on a record was
# passed by the caller through ``extra=`` and is added to the JSON line.
_STANDARD_ATTRIBUTES = set(vars(logging.makeLogRecord({}))) | {
    "message",
    "asctime",
}


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

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())

    # httpx logs every request at INFO. The client logs its own attempts.
    logging.getLogger("httpx").setLevel(logging.WARNING)
