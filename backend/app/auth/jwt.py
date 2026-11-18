import os
from datetime import datetime, timedelta, timezone

import jwt as pyjwt
from fastapi import HTTPException
from jwt.exceptions import PyJWTError

from app.auth.enums import TokenType

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))


def refresh_token_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)


def create_access_token(*, user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "type": TokenType.ACCESS,
    }
    return pyjwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(*, user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": TokenType.REFRESH,
    }
    return pyjwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str, *, expected_type: TokenType) -> dict:
    try:
        payload = pyjwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None

    if payload.get("type") != expected_type.value:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload