from pydantic import BaseModel

from app.products.schemas import ProductOut


class WishlistOut(BaseModel):
    items: list[ProductOut]