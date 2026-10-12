#!/bin/sh
# Start sequence of the backend container:
#   1. apply the database migrations
#   2. import the catalogue when the products table is empty, then load
#      the bundled translations (every start, no network)
#   3. start the API
set -e

# A failed migration stops the container: the API must not run on an
# outdated schema.
alembic upgrade head

# A failed import must never block the start. The command logs the reason,
# /health reports that the catalogue is not seeded, and the import can be
# run again later with "python -m app.commands.seed".
python -m app.commands.seed --if-empty \
    || echo "entrypoint: the catalogue import failed, starting the API anyway"

# exec replaces the shell, so uvicorn receives the stop signal directly.
# --no-access-log: the request middleware already writes one JSON line
# per request, with the request id.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
