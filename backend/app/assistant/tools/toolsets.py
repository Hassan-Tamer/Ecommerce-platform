from .transport import openapi_toolset

_ORDER_OPS = ("list_my_orders", "get_order_by_id")
_CATALOG_OPS = (
    "list_product_categories",
    "search_products",
    "get_product_by_slug",
)
_WISHLIST_OPS = ("get_wishlist", "add_to_wishlist", "remove_from_wishlist")
_CART_OPS = ("get_cart", "add_to_cart", "remove_from_cart")


def orders_toolset():
    return openapi_toolset("orders.json", _ORDER_OPS)


def catalog_toolset():
    return openapi_toolset("products.json", _CATALOG_OPS)


def wishlist_toolset():
    return openapi_toolset("wishlist.json", _WISHLIST_OPS)


def cart_toolset():
    return openapi_toolset("cart.json", _CART_OPS)