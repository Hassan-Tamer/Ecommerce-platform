from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.enums import DiscountType


class CouponOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    discount_type: str
    discount_value: Decimal = Field(json_schema_extra={"type": "number"})
    min_subtotal: Decimal | None = Field(default=None, json_schema_extra={"type": "number"})
    max_discount: Decimal | None = Field(default=None, json_schema_extra={"type": "number"})
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool
    usage_limit: int | None = None
    per_user_limit: int | None = None
    created_at: datetime


class CouponBrief(BaseModel):
    code: str
    discount_type: str
    discount_value: Decimal = Field(json_schema_extra={"type": "number"})


class CouponApplyIn(BaseModel):
    code: str = Field(min_length=1, max_length=64)


class CouponPricingOut(BaseModel):
    subtotal: Decimal = Field(json_schema_extra={"type": "number"})
    discount: Decimal = Field(json_schema_extra={"type": "number"})
    total: Decimal = Field(json_schema_extra={"type": "number"})
    coupon: CouponBrief


class _CouponWriteBase(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    discount_type: Literal["percent", "fixed"]
    discount_value: Decimal = Field(ge=0, json_schema_extra={"type": "number"})
    min_subtotal: Decimal | None = Field(default=None, ge=0, json_schema_extra={"type": "number"})
    max_discount: Decimal | None = Field(default=None, ge=0, json_schema_extra={"type": "number"})
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True
    usage_limit: int | None = Field(default=None, ge=1)
    per_user_limit: int | None = Field(default=None, ge=1)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("code must not be empty")
        return normalized.upper()

    @model_validator(mode="after")
    def validate_discount_rules(self) -> "_CouponWriteBase":
        if self.discount_type == DiscountType.PERCENT.value and self.discount_value > Decimal("100"):
            raise ValueError("percent discount_value must be <= 100")
        if self.discount_type == DiscountType.FIXED.value and self.max_discount is not None:
            raise ValueError("max_discount applies only to percent coupons")
        if self.starts_at is not None and self.ends_at is not None and self.starts_at > self.ends_at:
            raise ValueError("starts_at must be <= ends_at")
        return self


class CouponCreate(_CouponWriteBase):
    pass


class CouponUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=64)
    discount_type: Literal["percent", "fixed"] | None = None
    discount_value: Decimal | None = Field(default=None, ge=0, json_schema_extra={"type": "number"})
    min_subtotal: Decimal | None = Field(default=None, ge=0, json_schema_extra={"type": "number"})
    max_discount: Decimal | None = Field(default=None, ge=0, json_schema_extra={"type": "number"})
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None
    usage_limit: int | None = Field(default=None, ge=1)
    per_user_limit: int | None = Field(default=None, ge=1)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("code must not be empty")
        return normalized.upper()