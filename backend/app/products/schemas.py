from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


def image_url_from_object_key(object_key: str) -> str:
    prefix = "external:"
    if object_key.startswith(prefix):
        return object_key[len(prefix) :]
    return object_key


class CategoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class ProductImageOut(BaseModel):
    id: int
    url: str
    position: int


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None
    price: Decimal = Field(json_schema_extra={"type": "number"})
    stock_quantity: int | None = None
    is_active: bool
    category: CategoryBrief
    images: list[ProductImageOut]


class ProductListPage(BaseModel):
    items: list[ProductOut]
    next_cursor: str | None = None