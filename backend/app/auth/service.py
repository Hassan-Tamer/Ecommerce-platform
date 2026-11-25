from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import TokenType, UserRole
from .jwt import create_access_token, create_refresh_token, decode_token
from .refresh_tokens import (
    assert_refresh_token_active,
    revoke_refresh_token_row,
    store_refresh_token,
)
from .schemas import LoginResponse, MeUpdate, UserOut
from app.db.models import User
from app.storage import delete_object, media_url_from_stored, upload_user_avatar
from app.storage.minio_storage import content_type_from_filename

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
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        photo=media_url_from_stored(user.photo),
        street=user.street,
        city=user.city,
        apartment_number=user.apartment_number,
        floor=user.floor,
    )


def _issue_tokens(db: Session, user: User) -> tuple[LoginResponse, str]:
    refresh_token = create_refresh_token(user_id=user.id)
    store_refresh_token(db, user_id=user.id, token=refresh_token)
    db.commit()

    response = LoginResponse(
        token=create_access_token(user_id=user.id, email=user.email, role=user.role),
        user=_user_out(user),
    )
    return response, refresh_token


def register_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
    confirm_password: str,
) -> tuple[LoginResponse, str]:
    name = name.strip()
    email = email.strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role=UserRole.CUSTOMER.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_tokens(db, user)


def login_user(db: Session, *, email: str, password: str) -> tuple[LoginResponse, str]:
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))

    if user is None or not verify_password(user.password, password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return _issue_tokens(db, user)


def refresh_user(db: Session, *, refresh_token: str) -> tuple[LoginResponse, str]:
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


def get_me(user: User) -> UserOut:
    return _user_out(user)


_PROFILE_FIELDS = ("phone", "street", "city", "apartment_number", "floor")


def update_me(db: Session, *, user: User, data: MeUpdate) -> UserOut:
    changes = data.model_dump(exclude_unset=True)

    if "name" in changes:
        name = changes["name"]
        if not name:
            raise HTTPException(status_code=422, detail="Name is required")
        user.name = name

    for field in _PROFILE_FIELDS:
        if field in changes:
            setattr(user, field, changes[field])

    db.commit()
    db.refresh(user)
    return _user_out(user)


def _drop_stored_avatar(photo: str | None) -> None:
    if not photo or photo.startswith(("external:", "http://", "https://")):
        return
    delete_object(photo)


def upload_user_photo(db: Session, *, user: User, upload: UploadFile) -> UserOut:
    content_type = (upload.content_type or "").split(";", 1)[0].strip().lower()
    filename = upload.filename
    if upload.file is None:
        raise HTTPException(status_code=400, detail="Photo file is required")

    if content_type not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        guessed = content_type_from_filename(filename)
        if guessed:
            content_type = guessed
        else:
            raise HTTPException(status_code=400, detail="Photo must be JPEG, PNG, WebP, or GIF")

    data = upload.file.read()
    object_key = upload_user_avatar(
        user_id=user.id,
        data=data,
        content_type=content_type,
        filename=filename,
    )

    previous = user.photo
    user.photo = object_key
    db.commit()
    db.refresh(user)

    if previous and previous != object_key:
        _drop_stored_avatar(previous)

    return _user_out(user)


def logout_user(db: Session, *, refresh_token: str) -> None:
    payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None

    row = assert_refresh_token_active(db, token=refresh_token, user_id=user_id)
    revoke_refresh_token_row(db, row)
    db.commit()