"""Product reviews API."""

from .admin_router import router as admin_router
from .router import router

__all__ = ["admin_router", "router"]