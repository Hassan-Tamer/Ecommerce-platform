import os

from fastapi import Response

from .jwt import REFRESH_TOKEN_EXPIRE_MINUTES

REFRESH_COOKIE = "refresh_token"
_COOKIE_PATH = "/auth"


def _secure() -> bool:
    return os.getenv("COOKIE_SECURE", "false").lower() == "true"


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=_secure(),
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        path=_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE,
        path=_COOKIE_PATH,
        httponly=True,
        secure=_secure(),
        samesite="lax",
    )
