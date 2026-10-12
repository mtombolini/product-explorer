"""Health check of the database and the imported catalogue."""

import logging
from dataclasses import dataclass

from sqlalchemy.exc import SQLAlchemyError

from app.repositories.product_repository import ProductRepository

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class HealthStatus:
    """What the health check found."""

    database_available: bool
    product_count: int

    @property
    def catalogue_seeded(self) -> bool:
        """Tell whether the import has stored at least one product."""
        return self.product_count > 0


class HealthService:
    """Check that the database answers and count the products."""

    def __init__(self, repository: ProductRepository) -> None:
        """Create the service on a product repository."""
        self._repository = repository

    def check(self) -> HealthStatus:
        """Count the products. A database error means "unavailable"."""
        try:
            product_count = self._repository.count()
        except SQLAlchemyError:
            logger.exception("Health check: the database is unavailable")
            return HealthStatus(database_available=False, product_count=0)
        return HealthStatus(
            database_available=True, product_count=product_count
        )
