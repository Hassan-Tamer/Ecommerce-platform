from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.cart.schemas import CartLineOut, CartOut
from app.db.models import CartItem, Product, User
from app.products.service import _product_to_out
from fastapi import HTTPException

_CART_ITEM_LOAD = (
    selectinload(CartItem.product).selectinload(Product.category),
    selectinload(CartItem.product).selectinload(Product.images),
)


def _cart_line(row: CartItem) -> CartLineOut:
    unit_price = row.product.price
    return CartLineOut(
        quantity=row.quantity,
        unit_price=unit_price,
        line_total=unit_price * row.quantity,
        product=_product_to_out(row.product, include_stock=True),
    )


def _get_product(db: Session, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.id == product_id)
    )
    if product is None or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def _get_cart_row(db: Session, *, user: User, product_id: int) -> CartItem | None:
    return db.scalar(
        select(CartItem)
        .where(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .options(*_CART_ITEM_LOAD)
    )


def list_cart(db: Session, *, user: User) -> CartOut:
    rows = db.scalars(
        select(CartItem)
        .where(CartItem.user_id == user.id)
        .options(*_CART_ITEM_LOAD)
        .order_by(CartItem.updated_at.desc())
    ).all()

    lines: list[CartLineOut] = []
    subtotal = Decimal("0")
    item_count = 0

    for row in rows:
        line = _cart_line(row)
        lines.append(line)
        subtotal += line.line_total
        item_count += row.quantity

    return CartOut(items=lines, subtotal=subtotal, item_count=item_count)


def add_cart_item(db: Session, *, user: User, product_id: int, quantity: int) -> CartLineOut:
    product = _get_product(db, product_id)
    row = db.get(CartItem, (user.id, product_id))
    new_quantity = quantity if row is None else row.quantity + quantity

    if new_quantity > product.stock_quantity:
        raise HTTPException(status_code=409, detail="Insufficient stock")

    if row is None:
        row = CartItem(user_id=user.id, product_id=product_id, quantity=new_quantity)
        db.add(row)
    else:
        row.quantity = new_quantity

    db.commit()
    loaded = _get_cart_row(db, user=user, product_id=product_id)
    assert loaded is not None
    return _cart_line(loaded)


def update_cart_item(db: Session, *, user: User, product_id: int, quantity: int) -> CartLineOut:
    row = _get_cart_row(db, user=user, product_id=product_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if quantity > row.product.stock_quantity:
        raise HTTPException(status_code=409, detail="Insufficient stock")

    row.quantity = quantity
    db.commit()
    loaded = _get_cart_row(db, user=user, product_id=product_id)
    assert loaded is not None
    return _cart_line(loaded)


def remove_cart_item(db: Session, *, user: User, product_id: int) -> None:
    row = db.get(CartItem, (user.id, product_id))
    if row is not None:
        db.delete(row)
        db.commit()