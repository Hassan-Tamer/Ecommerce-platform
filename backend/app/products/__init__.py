"""Public products API — import from ``app.products`` outside this package; use relative imports inside."""

from .schemas import (
    CategoryBrief,
    ProductImageOut,
    ProductOut,
    image_url_from_object_key,
)
from . import service
from .admin_router import router as admin_router
from .router import router

__all__ = [
    "CategoryBrief",
    "ProductImageOut",
    "ProductOut",
    "admin_router",
    "image_url_from_object_key",
    "router",
    "service",
]