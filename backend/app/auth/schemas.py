import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

_PHONE_RE = re.compile(r"^\+?[0-9][0-9 ]{6,30}$")
_OPTIONAL_TEXT_FIELDS = ("phone", "street", "city", "apartment_number", "floor")


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class RegisterResponse(BaseModel):
    message: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None
    photo: str | None = None
    street: str | None = None
    city: str | None = None
    apartment_number: str | None = None
    floor: str | None = None


class MeUpdate(BaseModel):
    """Partial profile update. Email is intentionally absent and rejected if sent."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    street: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=128)
    apartment_number: str | None = Field(default=None, max_length=32)
    floor: str | None = Field(default=None, max_length=16)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Name is required")
        return stripped

    @field_validator(*_OPTIONAL_TEXT_FIELDS)
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not _PHONE_RE.fullmatch(value):
            raise ValueError("Phone must contain digits, spaces, and an optional leading +")
        return value

    @model_validator(mode="after")
    def name_cannot_be_cleared(self) -> "MeUpdate":
        if "name" in self.model_fields_set and not self.name:
            raise ValueError("Name is required")
        return self


class LoginResponse(BaseModel):
    token: str
    user: UserOut


class LogoutResponse(BaseModel):
    message: str