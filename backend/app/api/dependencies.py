"""How a request gets its collaborators: session, repository, services.

FastAPI builds this chain for each request. The tests replace one link
with ``app.dependency_overrides`` to simulate failures.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.repositories.product_repository import ProductRepository
from app.services.health_service import HealthService
from app.services.product_service import ProductService


def get_product_repository(
    session: Annotated[Session, Depends(get_session)],
) -> ProductRepository:
    """Build the product repository on the session of the request."""
    return ProductRepository(session)


RepositoryDependency = Annotated[
    ProductRepository, Depends(get_product_repository)
]


def get_product_service(repository: RepositoryDependency) -> ProductService:
    """Build the service that reads the catalogue."""
    return ProductService(repository)


def get_health_service(repository: RepositoryDependency) -> HealthService:
    """Build the service that checks the database and the catalogue."""
    return HealthService(repository)


ProductServiceDependency = Annotated[
    ProductService, Depends(get_product_service)
]
HealthServiceDependency = Annotated[HealthService, Depends(get_health_service)]
