from .toolsets import catalog_toolset, orders_toolset
from .transport import AUTH_HEADER_STATE_KEY

__all__ = ["AUTH_HEADER_STATE_KEY", "catalog_toolset", "orders_toolset", "shop_toolsets"]


def shop_toolsets():
    return [orders_toolset(), catalog_toolset()]