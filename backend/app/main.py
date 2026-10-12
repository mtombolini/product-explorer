"""Application factory for the Product Explorer API."""

from fastapi import FastAPI

from app.api import health, hello


def create_app() -> FastAPI:
    """Build the FastAPI application and register its routers."""
    app = FastAPI(title="Product Explorer API")
    app.include_router(health.router)
    app.include_router(hello.router)
    return app


app = create_app()
