from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.enums import TokenType
from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.auth.refresh_tokens import (
    assert_refresh_token_active,
    revoke_refresh_token_row,
    store_refresh_token,
)
from app.auth.schemas import LoginResponse, UserOut
from app.db.models import User

_password_hasher = PasswordHasher()


def hash_password(plain: str) -> str:
    return _password_hasher.hash(plain)


def verify_password(stored_hash: str, plain: str) -> bool:
    try:
        _password_hasher.verify(stored_hash, plain)
        return True
    except VerifyMismatchError:
        return False


def _user_out(user: User) -> UserOut:
    return UserOut(id=user.id, name=user.name, email=user.email)


def _issue_tokens(db: Session, user: User) -> LoginResponse:
    refresh_token = create_refresh_token(user_id=user.id)
    store_refresh_token(db, user_id=user.id, token=refresh_token)
    db.commit()

    return LoginResponse(
        token=create_access_token(user_id=user.id, email=user.email),
        refresh_token=refresh_token,
        user=_user_out(user),
    )


def register_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
    confirm_password: str,
) -> None:
    name = name.strip()
    email = email.strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(name=name, email=email, password=hash_password(password))
    db.add(user)
    db.commit()


def login_user(db: Session, *, email: str, password: str) -> LoginResponse:
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))

    if user is None or not verify_password(user.password, password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return _issue_tokens(db, user)


def refresh_user(db: Session, *, refresh_token: str) -> LoginResponse:
    payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    row = assert_refresh_token_active(db, token=refresh_token, user_id=user.id)
    revoke_refresh_token_row(db, row)

    return _issue_tokens(db, user)


def logout_user(db: Session, *, refresh_token: str) -> None:
    payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None

    row = assert_refresh_token_active(db, token=refresh_token, user_id=user_id)
    revoke_refresh_token_row(db, row)
    db.commit()