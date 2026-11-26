from .transport import openapi_toolset

_ORDER_OPS = ("list_my_orders", "get_order_by_id")
_CATALOG_OPS = (
    "list_product_categories",
    "search_products",
    "get_product_by_slug",
)


def orders_toolset():
    return openapi_toolset("orders.json", _ORDER_OPS)


def catalog_toolset():
    return openapi_toolset("products.json", _CATALOG_OPS)