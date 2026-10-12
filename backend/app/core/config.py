"""Application settings read from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Backend configuration.

    Each field is read from the environment variable with the same name
    in upper case, for example ``DATABASE_URL``. Docker Compose provides
    the values (see ``docker-compose.yml`` and ``.env.example``).
    """

    # No default: starting without a database URL is a configuration
    # error and must fail loudly.
    database_url: str

    fakestore_base_url: str = "https://fakestoreapi.com"
    fakestore_timeout_seconds: float = Field(default=5, gt=0)
    fakestore_max_retries: int = Field(default=2, ge=0)

    images_dir: Path = Path("/data/images")
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Return the settings, read from the environment only once."""
    return Settings()
