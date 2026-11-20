"""Public auth API — import from ``app.auth`` outside this package; use relative imports inside."""

from app.enums import TokenType, UserRole
from .schemas import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RegisterRequest,
    UserOut,
)
from .dependencies import get_current_admin, get_current_user
from . import service
from .router import router

__all__ = [
    "LoginRequest",
    "LoginResponse",
    "LogoutResponse",
    "RegisterRequest",
    "TokenType",
    "UserOut",
    "UserRole",
    "get_current_admin",
    "get_current_user",
    "router",
    "service",
]