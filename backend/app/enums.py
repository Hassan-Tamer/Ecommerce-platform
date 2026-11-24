from enum import Enum


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"


class DiscountType(str, Enum):
    PERCENT = "percent"
    FIXED = "fixed"