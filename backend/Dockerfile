# Three stages:
#   base     dependencies and code shared by the other two
#   test     base plus the development dependencies and the tests
#   runtime  what "docker compose up" runs. It is the last stage, so it is
#            also what a plain "docker build" produces.

FROM python:3.13-slim AS base

# PYTHONUNBUFFERED: log lines reach "docker compose logs" immediately.
# PYTHONDONTWRITEBYTECODE: no .pyc files inside the container.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies are installed before the code is copied, so this layer is
# reused from the build cache until requirements.txt changes.
COPY requirements.txt .
RUN pip install -r requirements.txt

# The application runs as an unprivileged user. /data/images is created
# and given to that user here: an empty named volume mounted on it copies
# the ownership of the directory in the image, so the user can write to it.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /data/images \
    && chown -R app:app /data

COPY alembic.ini entrypoint.sh ./
COPY migrations ./migrations
COPY app ./app


FROM base AS test

COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt

COPY pyproject.toml .
COPY tests ./tests

USER app

# /app is read-only for this user, so the caches of ruff and pytest are
# switched off.
ENV RUFF_NO_CACHE=true
CMD ["pytest", "-p", "no:cacheprovider"]


FROM base AS runtime

USER app

EXPOSE 8000

# The entry point takes a subcommand: serve (the default below), migrate
# or seed, so "docker compose run --rm backend migrate" runs a one-off
# job with the same image. See entrypoint.sh.
ENTRYPOINT ["./entrypoint.sh"]
CMD ["serve"]
