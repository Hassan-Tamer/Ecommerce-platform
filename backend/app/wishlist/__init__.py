"""Wishlist API — per-user saved products."""

from .router import router
from .schemas import WishlistOut

__all__ = ["WishlistOut", "router"]