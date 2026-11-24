"""Announcements API — shop list and admin CRUD."""

from .admin_router import router as admin_router
from .router import router
from .schemas import AnnouncementCreate, AnnouncementOut, AnnouncementUpdate

__all__ = [
    "AnnouncementCreate",
    "AnnouncementOut",
    "AnnouncementUpdate",
    "admin_router",
    "router",
]