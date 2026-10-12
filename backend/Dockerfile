FROM python:3.13-slim

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
# here so that the named volume mounted on it starts owned by that user.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /data/images \
    && chown -R app:app /data

COPY --chown=app:app app ./app

USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
