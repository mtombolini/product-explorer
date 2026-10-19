#!/bin/sh
# Entry point of the backend container. The first argument is a
# subcommand:
#   serve    (default) start the API. With RUN_STARTUP_TASKS=true, the
#            default, it first runs the migrations and the import when
#            the products table is empty, so "docker compose up" needs
#            no extra step on a laptop.
#   migrate  apply the database migrations and exit.
#   seed     import the catalogue and load the bundled translations and
#            specifications, then exit. Extra arguments are passed on,
#            for example "seed --if-empty".
# Any other command is run as is, for example "python -m ...".
#
# In production RUN_STARTUP_TASKS is false: migrate and seed run once as
# one-off jobs before the API starts, so several replicas never race on
# the same migration or import (see docker-compose.prod.yml).
set -e

# Migrations and import before the API, as on a laptop.
run_startup_tasks() {
    # A failed migration stops the container: the API must not run on an
    # outdated schema.
    alembic upgrade head

    # A failed import must never block the start. The command logs the
    # reason, /health reports that the catalogue is not seeded, and the
    # import can be run again later with the "seed" subcommand.
    python -m app.commands.seed --if-empty \
        || echo "entrypoint: the catalogue import failed, starting the API anyway"
}

case "${1:-serve}" in
    serve)
        # Only "true" and "false" are accepted: a typo fails loudly instead
        # of silently skipping (or running) the migrations.
        case "${RUN_STARTUP_TASKS:-true}" in
            true) run_startup_tasks ;;
            false) ;;
            *)
                echo "entrypoint: RUN_STARTUP_TASKS must be true or false, got '${RUN_STARTUP_TASKS}'" >&2
                exit 2
                ;;
        esac

        # exec replaces the shell, so uvicorn receives the stop signal
        # directly. --no-access-log: the request middleware already writes
        # one JSON line per request, with the request id.
        exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
        ;;
    migrate)
        exec alembic upgrade head
        ;;
    seed)
        shift
        # Exit code 1 when Fake Store is unavailable, so a failed job is
        # visible to whoever runs it.
        exec python -m app.commands.seed "$@"
        ;;
    *)
        exec "$@"
        ;;
esac
