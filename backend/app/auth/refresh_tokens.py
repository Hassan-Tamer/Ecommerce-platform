import hashlib
from datetime import datetime, timezone

from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import refresh_token_expires_at
from app.db.models import RefreshToken


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def store_refresh_token(db: Session, *, user_id: int, token: str) -> None:
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_refresh_token(token),
            expires_at=refresh_token_expires_at(),
        )
    )


def find_refresh_token(db: Session, *, token: str) -> Optional[RefreshToken]:
    return db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(token))
    )


def assert_refresh_token_active(db: Session, *, token: str, user_id: int) -> RefreshToken:
    row = find_refresh_token(db, token=token)
    now = datetime.now(timezone.utc)

    if (
        row is None
        or row.user_id != user_id
        or row.revoked_at is not None
        or row.expires_at <= now
    ):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return row


def revoke_refresh_token_row(db: Session, row: RefreshToken) -> None:
    row.revoked_at = datetime.now(timezone.utc)