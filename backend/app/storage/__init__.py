from .minio_storage import (
    delete_object,
    media_url_from_stored,
    upload_user_avatar,
    user_avatar_prefix,
)

__all__ = [
    "delete_object",
    "media_url_from_stored",
    "upload_user_avatar",
    "user_avatar_prefix",
]