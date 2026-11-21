import os
from pathlib import Path

import redis
from dotenv import load_dotenv

from app.cache.redis_client import get_redis
from app.products.schemas import ProductOut

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

PRODUCT_SLUG_TTL_SECONDS = int(os.getenv("CATALOG_PRODUCT_SLUG_TTL_SECONDS", "300"))


def _slug_key(slug: str) -> str:
    return f"catalog:product:slug:{slug.strip().lower()}"


def get_product_by_slug_cached(slug: str) -> ProductOut | None:
    try:
        raw = get_redis().get(_slug_key(slug))
    except redis.RedisError:
        return None
    if raw is None:
        return None
    try:
        return ProductOut.model_validate_json(raw)
    except ValueError:
        return None


def set_product_by_slug_cached(slug: str, product: ProductOut) -> None:
    """Store full product payload (always includes stock_quantity)."""
    try:
        get_redis().setex(
            _slug_key(slug),
            PRODUCT_SLUG_TTL_SECONDS,
            product.model_dump_json(),
        )
    except redis.RedisError:
        return


def invalidate_product_by_slug(slug: str) -> None:
    try:
        get_redis().delete(_slug_key(slug))
    except redis.RedisError:
        return