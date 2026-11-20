"""FastAPI dependencies for auth (e.g. current user)."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.enums import TokenType, UserRole
from .jwt import decode_token
from app.db.deps import get_db
from app.db.models import User

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials, expected_type=TokenType.ACCESS)
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials, expected_type=TokenType.ACCESS)

    token_role = payload.get("role")
    if token_role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")

    user = get_current_user(credentials=credentials, db=db)
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")

    return user