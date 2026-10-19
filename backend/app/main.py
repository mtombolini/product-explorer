"""Application factory for the Product Explorer API."""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.errors import register_error_handlers
from app.api.middleware import request_context_middleware
from app.api.routes import categories, health, products
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.schemas.product import IMAGES_URL_PREFIX

DESCRIPTION = """
Read-only catalogue API. The products are imported from Fake Store API
into PostgreSQL by a seed command; this API only serves the stored data.

Every error uses the same body:
`{"error": {"code": "...", "message": "...", "details": [...]}}`.
Every response carries an `X-Request-ID` header that also appears in the
server logs.
"""


def create_app() -> FastAPI:
    """Build the FastAPI application: logging, errors, routes, images."""
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="Product Explorer API",
        description=DESCRIPTION,
        version="1.0.0",
    )

    app.add_middleware(BaseHTTPMiddleware, dispatch=request_context_middleware)
    register_error_handlers(app)

    app.include_router(products.router)
    app.include_router(categories.router)
    app.include_router(health.router)

    # The images downloaded by the import, served as static files. The
    # directory is created here so the mount also works before the first
    # import; a missing file then answers 404 like any unknown route.
    settings.images_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        IMAGES_URL_PREFIX,
        StaticFiles(directory=settings.images_dir),
        name="images",
    )
    return app


app = create_app()
