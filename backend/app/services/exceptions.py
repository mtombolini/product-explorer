"""Errors raised by the services. The API layer turns them into HTTP."""


class ProductNotFoundError(Exception):
    """There is no product with the requested id."""

    def __init__(self, product_id: int) -> None:
        """Remember the id that was not found."""
        super().__init__(f"Product {product_id} was not found.")
        self.product_id = product_id
