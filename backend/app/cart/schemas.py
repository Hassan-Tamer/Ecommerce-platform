from decimal import Decimal

from pydantic import BaseModel, Field

from app.products.schemas import ProductOut


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartLineOut(BaseModel):
    quantity: int
    unit_price: Decimal = Field(json_schema_extra={"type": "number"})
    line_total: Decimal = Field(json_schema_extra={"type": "number"})
    product: ProductOut


class CartOut(BaseModel):
    items: list[CartLineOut]
    subtotal: Decimal = Field(json_schema_extra={"type": "number"})
    item_count: int