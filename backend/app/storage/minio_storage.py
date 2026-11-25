from __future__ import annotations

import io
import os
import uuid
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import HTTPException
from minio import Minio
from minio.error import S3Error

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

ALLOWED_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp", "image/gif"})
MAX_AVATAR_BYTES = 5 * 1024 * 1024
MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024

_CONTENT_TYPE_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}


def _endpoint_host() -> str:
    raw = os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:9001")
    parsed = urlparse(raw if "://" in raw else f"http://{raw}")
    host = parsed.hostname or "127.0.0.1"
    if parsed.port:
        return f"{host}:{parsed.port}"
    return host


def _bucket() -> str:
    return os.getenv("MINIO_BUCKET", "product-images")


def _use_ssl() -> bool:
    return os.getenv("MINIO_USE_SSL", "false").lower() in {"1", "true", "yes"}


def public_object_url(object_key: str) -> str:
    explicit = os.getenv("MINIO_PUBLIC_BASE")
    if explicit:
        base = explicit.rstrip("/")
    else:
        endpoint = os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:9001").rstrip("/")
        base = f"{endpoint}/{_bucket()}"
    return f"{base}/{object_key.lstrip('/')}"


def media_url_from_stored(stored: str | None) -> str | None:
    if not stored:
        return None
    prefix = "external:"
    if stored.startswith(prefix):
        return stored[len(prefix) :]
    if stored.startswith(("http://", "https://")):
        return stored
    return public_object_url(stored)


@lru_cache(maxsize=1)
def get_minio_client() -> Minio:
    return Minio(
        _endpoint_host(),
        access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
        secure=_use_ssl(),
    )


def user_avatar_prefix(user_id: int) -> str:
    return f"avatars/{user_id}/"


def product_image_prefix(product_id: int) -> str:
    return f"products/{product_id}/"


def content_type_from_filename(filename: str | None) -> str | None:
    if not filename:
        return None
    suffix = Path(filename).suffix.lower()
    mapping = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    return mapping.get(suffix)


def _extension(*, content_type: str, filename: str | None) -> str:
    ext = _CONTENT_TYPE_EXT.get(content_type)
    if ext:
        return ext
    if filename:
        suffix = Path(filename).suffix.lstrip(".").lower()
        if suffix in {"jpg", "jpeg", "png", "webp", "gif"}:
            return "jpg" if suffix == "jpeg" else suffix
    return "jpg"


def upload_user_avatar(
    *,
    user_id: int,
    data: bytes,
    content_type: str,
    filename: str | None,
) -> str:
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Photo must be JPEG, PNG, WebP, or GIF")
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be 5 MB or smaller")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Photo file is empty")

    bucket = _bucket()
    client = get_minio_client()
    if not client.bucket_exists(bucket):
        raise HTTPException(
            status_code=503,
            detail=f"Storage bucket {bucket!r} is not available",
        )

    ext = _extension(content_type=content_type, filename=filename)
    object_key = f"{user_avatar_prefix(user_id)}{uuid.uuid4().hex}.{ext}"
    try:
        client.put_object(
            bucket,
            object_key,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
    except S3Error as exc:
        raise HTTPException(status_code=503, detail="Could not save photo to storage") from exc
    return object_key


def upload_product_image(
    *,
    product_id: int,
    data: bytes,
    content_type: str,
    filename: str | None,
) -> str:
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Image must be JPEG, PNG, WebP, or GIF")
    if len(data) > MAX_PRODUCT_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 8 MB or smaller")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Image file is empty")

    bucket = _bucket()
    client = get_minio_client()
    if not client.bucket_exists(bucket):
        raise HTTPException(
            status_code=503,
            detail=f"Storage bucket {bucket!r} is not available",
        )

    ext = _extension(content_type=content_type, filename=filename)
    object_key = f"{product_image_prefix(product_id)}{uuid.uuid4().hex}.{ext}"
    try:
        client.put_object(
            bucket,
            object_key,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
    except S3Error as exc:
        raise HTTPException(status_code=503, detail="Could not save image to storage") from exc
    return object_key


def delete_object(object_key: str) -> None:
    client = get_minio_client()
    try:
        client.remove_object(_bucket(), object_key)
    except S3Error:
        pass