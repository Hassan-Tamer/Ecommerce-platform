import base64
import json
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import and_, or_

from app.db.models import Product

DEFAULT_PAGE_SIZE = 24
MAX_PAGE_SIZE = 100


def _encode_cursor(sort: str, product: Product) -> str:
    data: dict[str, object] = {"sort": sort, "id": product.id}
    if sort in ("price_asc", "price_desc"):
        data["price"] = str(product.price)
    elif sort == "name":
        data["name"] = product.name
    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str, *, expected_sort: str) -> dict[str, object]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid cursor") from None

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid cursor")

    if data.get("sort") != expected_sort:
        raise HTTPException(status_code=400, detail="Cursor does not match sort order")

    if "id" not in data:
        raise HTTPException(status_code=400, detail="Invalid cursor")

    return data


def apply_cursor_filter(stmt, *, sort: str, cursor: dict[str, object]):
    product_id = int(cursor["id"])

    if sort == "id":
        return stmt.where(Product.id > product_id)

    if sort in ("price_asc", "price_desc"):
        try:
            price = Decimal(str(cursor["price"]))
        except (KeyError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid cursor") from None
        if sort == "price_asc":
            return stmt.where(
                or_(
                    Product.price > price,
                    and_(Product.price == price, Product.id > product_id),
                )
            )
        return stmt.where(
            or_(
                Product.price < price,
                and_(Product.price == price, Product.id > product_id),
            )
        )

    if sort == "name":
        try:
            name = str(cursor["name"])
        except KeyError:
            raise HTTPException(status_code=400, detail="Invalid cursor") from None
        return stmt.where(
            or_(
                Product.name > name,
                and_(Product.name == name, Product.id > product_id),
            )
        )

    return stmt.where(Product.id > product_id)


def order_by_for_sort(sort: str) -> list:
    order_by = {
        "id": [Product.id.asc()],
        "price_asc": [Product.price.asc(), Product.id.asc()],
        "price_desc": [Product.price.desc(), Product.id.asc()],
        "name": [Product.name.asc(), Product.id.asc()],
    }
    return order_by.get(sort, [Product.id.asc()])


def encode_next_cursor(sort: str, product: Product | None) -> str | None:
    if product is None:
        return None
    return _encode_cursor(sort, product)