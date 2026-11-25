from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class ShippingAddressIn(BaseModel):
    street: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=128)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    apartment_number: str | None = Field(default=None, max_length=32)
    floor: str | None = Field(default=None, max_length=16)


class OrderCreate(BaseModel):
    shipping_address: ShippingAddressIn
    coupon_code: str | None = Field(default=None, max_length=50)
    shipping_amount: Decimal = Field(default=Decimal("0"), ge=0)


class OrderItemOut(BaseModel):
    id: int
    product_id: int | None
    product_name: str
    unit_price: Decimal = Field(json_schema_extra={"type": "number"})
    quantity: int
    line_total: Decimal = Field(json_schema_extra={"type": "number"})


class OrderSummaryOut(BaseModel):
    id: int
    status: str
    total: Decimal = Field(json_schema_extra={"type": "number"})
    item_count: int
    created_at: datetime


class OrderOut(BaseModel):
    id: int
    status: str
    subtotal: Decimal = Field(json_schema_extra={"type": "number"})
    discount_amount: Decimal = Field(json_schema_extra={"type": "number"})
    shipping_amount: Decimal = Field(json_schema_extra={"type": "number"})
    total: Decimal = Field(json_schema_extra={"type": "number"})
    coupon_code: str | None
    shipping_address: dict[str, Any]
    items: list[OrderItemOut]
    created_at: datetime
    updated_at: datetime


class OrderListOut(BaseModel):
    items: list[OrderSummaryOut]


class AdminLowStockOut(BaseModel):
    id: int
    name: str
    stock_quantity: int
    stock_alert_at: int


class AdminSummaryOut(BaseModel):
    orders_today: int
    revenue_today: Decimal = Field(json_schema_extra={"type": "number"})
    revenue_this_month: Decimal = Field(json_schema_extra={"type": "number"})
    product_count: int
    low_stock_count: int
    low_stock_threshold: int
    low_stock_items: list[AdminLowStockOut]


class AdminOrderRowOut(BaseModel):
    id: int
    customer_name: str
    total: Decimal = Field(json_schema_extra={"type": "number"})
    status: str
    created_at: datetime


class AdminOrderListOut(BaseModel):
    items: list[AdminOrderRowOut]