from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Product, User, WishlistItem
from app.products.schemas import ProductOut
from app.products.service import _product_to_out


def list_wishlist(db: Session, *, user: User) -> list[ProductOut]:
    products = db.scalars(
        select(Product)
        .join(WishlistItem, WishlistItem.product_id == Product.id)
        .where(WishlistItem.user_id == user.id)
        .options(selectinload(Product.category), selectinload(Product.images))
        .order_by(WishlistItem.created_at.desc())
    ).all()
    return [_product_to_out(product, include_stock=False) for product in products]


def add_to_wishlist(db: Session, *, user: User, product_id: int) -> ProductOut:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.id == product_id)
    )
    if product is None or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.get(WishlistItem, (user.id, product_id))
    if existing is None:
        db.add(WishlistItem(user_id=user.id, product_id=product_id))
        db.commit()

    return _product_to_out(product, include_stock=False)


def remove_from_wishlist(db: Session, *, user: User, product_id: int) -> None:
    row = db.get(WishlistItem, (user.id, product_id))
    if row is not None:
        db.delete(row)
        db.commit()