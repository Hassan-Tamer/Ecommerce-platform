import base64
import json
from datetime import datetime, timezone

from fastapi import HTTPException

DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 100


def encode_review_cursor(*, created_at: datetime, review_id: int) -> str:
    data = {"created_at": created_at.isoformat(), "id": review_id}
    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_review_cursor(cursor: str) -> tuple[datetime, int]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid cursor") from None

    if not isinstance(data, dict) or "created_at" not in data or "id" not in data:
        raise HTTPException(status_code=400, detail="Invalid cursor")

    try:
        created_at = datetime.fromisoformat(str(data["created_at"]))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        review_id = int(data["id"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid cursor") from None

    return created_at, review_id