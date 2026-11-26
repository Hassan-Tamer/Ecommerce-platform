from .toolsets import cart_toolset, catalog_toolset, orders_toolset, wishlist_toolset
from .transport import AUTH_HEADER_STATE_KEY

__all__ = [
    "AUTH_HEADER_STATE_KEY",
    "cart_toolset",
    "catalog_toolset",
    "orders_toolset",
    "shop_toolsets",
    "wishlist_toolset",
]


def shop_toolsets():
    return [
        orders_toolset(),
        catalog_toolset(),
        wishlist_toolset(),
        cart_toolset(),
    ]