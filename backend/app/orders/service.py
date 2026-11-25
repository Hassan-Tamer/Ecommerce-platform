from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.cart import service as cart_service
from app.coupons import service as coupon_service
from app.db.models import CartItem, Order, OrderItem, Product, User

from .schemas import (
    AdminLowStockOut,
    AdminOrderListOut,
    AdminOrderRowOut,
    AdminSummaryOut,
    OrderCreate,
    OrderItemOut,
    OrderListOut,
    OrderOut,
    OrderSummaryOut,
    ShippingAddressIn,
)

LOW_STOCK_THRESHOLD = 5

_ORDER_LOAD = (selectinload(Order.items),)


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def _address_snapshot(user: User, addr: ShippingAddressIn) -> dict[str, Any]:
    return {
        "name": addr.name or user.name,
        "phone": addr.phone or user.phone,
        "street": addr.street,
        "city": addr.city,
        "apartment_number": addr.apartment_number or user.apartment_number,
        "floor": addr.floor or user.floor,
    }


def _item_out(row: OrderItem) -> OrderItemOut:
    return OrderItemOut(
        id=row.id,
        product_id=row.product_id,
        product_name=row.product_name,
        unit_price=row.unit_price,
        quantity=row.quantity,
        line_total=_money(row.unit_price * row.quantity),
    )


def _order_out(row: Order) -> OrderOut:
    return OrderOut(
        id=row.id,
        status=row.status,
        subtotal=row.subtotal,
        discount_amount=row.discount_amount,
        shipping_amount=row.shipping_amount,
        total=row.total,
        coupon_code=row.coupon_code,
        shipping_address=row.shipping_address,
        items=[_item_out(item) for item in row.items],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _summary_out(row: Order) -> OrderSummaryOut:
    item_count = sum(item.quantity for item in row.items)
    return OrderSummaryOut(
        id=row.id,
        status=row.status,
        total=row.total,
        item_count=item_count,
        created_at=row.created_at,
    )


def _get_user_order(db: Session, *, user: User, order_id: int) -> Order:
    row = db.scalar(
        select(Order)
        .where(Order.id == order_id, Order.user_id == user.id)
        .options(*_ORDER_LOAD)
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return row


def _find_by_idempotency(db: Session, *, user_id: int, idempotency_key: str) -> Order | None:
    return db.scalar(
        select(Order)
        .where(Order.user_id == user_id, Order.idempotency_key == idempotency_key)
        .options(*_ORDER_LOAD)
    )


def list_orders(db: Session, *, user: User) -> OrderListOut:
    rows = db.scalars(
        select(Order)
        .where(Order.user_id == user.id)
        .options(*_ORDER_LOAD)
        .order_by(Order.created_at.desc())
    ).all()
    return OrderListOut(items=[_summary_out(row) for row in rows])


def get_order(db: Session, *, user: User, order_id: int) -> OrderOut:
    return _order_out(_get_user_order(db, user=user, order_id=order_id))


def create_order_from_cart(
    db: Session,
    *,
    user: User,
    data: OrderCreate,
    idempotency_key: str | None,
) -> tuple[OrderOut, bool]:
    if idempotency_key is not None:
        idempotency_key = idempotency_key.strip()
        if not idempotency_key:
            idempotency_key = None
        elif len(idempotency_key) > 64:
            raise HTTPException(status_code=400, detail="Idempotency-Key too long")

    if idempotency_key is not None:
        existing = _find_by_idempotency(db, user_id=user.id, idempotency_key=idempotency_key)
        if existing is not None:
            return _order_out(existing), False

    cart = cart_service.list_cart(db, user=user)
    if cart.item_count == 0:
        raise HTTPException(status_code=400, detail="Cart is empty")

    cart_rows = db.scalars(
        select(CartItem)
        .where(CartItem.user_id == user.id)
        .options(selectinload(CartItem.product))
    ).all()

    for row in cart_rows:
        product = row.product
        if product is None or not product.is_active:
            raise HTTPException(status_code=409, detail=f"Product {row.product_id} is unavailable")
        if row.quantity > product.stock_quantity:
            raise HTTPException(status_code=409, detail="Insufficient stock")

    subtotal = _money(cart.subtotal)
    discount = Decimal("0")
    coupon_code: str | None = None

    if data.coupon_code:
        coupon = coupon_service.find_coupon_by_code(db, data.coupon_code)
        coupon_service.validate_coupon_for_cart(coupon=coupon, subtotal=subtotal)
        discount = coupon_service.compute_discount(subtotal, coupon)
        coupon_code = coupon.code

    shipping_amount = _money(data.shipping_amount)
    total = _money(subtotal - discount + shipping_amount)
    if total < 0:
        total = Decimal("0.00")

    order_items: list[OrderItem] = []
    for row in cart_rows:
        product = row.product
        assert product is not None
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name[:200],
                unit_price=_money(product.price),
                quantity=row.quantity,
            )
        )

    order = Order(
        user_id=user.id,
        status="pending",
        subtotal=subtotal,
        discount_amount=discount,
        shipping_amount=shipping_amount,
        total=total,
        coupon_code=coupon_code,
        shipping_address=_address_snapshot(user, data.shipping_address),
        idempotency_key=idempotency_key,
        items=order_items,
    )
    db.add(order)

    for row in cart_rows:
        product = row.product
        assert product is not None
        product.stock_quantity -= row.quantity

    db.execute(delete(CartItem).where(CartItem.user_id == user.id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key is not None:
            replay = _find_by_idempotency(db, user_id=user.id, idempotency_key=idempotency_key)
            if replay is not None:
                return _order_out(replay), False
        raise HTTPException(status_code=409, detail="Could not place order") from None

    loaded = _get_user_order(db, user=user, order_id=order.id)
    return _order_out(loaded), True


def _today_start_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _month_start_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def admin_summary(db: Session) -> AdminSummaryOut:
    today_start = _today_start_utc()
    active_order = Order.status != "cancelled"

    orders_today = db.scalar(
        select(func.count())
        .select_from(Order)
        .where(Order.created_at >= today_start, active_order)
    ) or 0

    revenue_today = db.scalar(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.created_at >= today_start, active_order)
    ) or Decimal("0")

    month_start = _month_start_utc()
    revenue_this_month = db.scalar(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.created_at >= month_start, active_order)
    ) or Decimal("0")

    product_count = db.scalar(
        select(func.count()).select_from(Product).where(Product.is_active.is_(True))
    ) or 0

    low_stock_filters = (
        Product.is_active.is_(True),
        Product.stock_quantity <= LOW_STOCK_THRESHOLD,
    )
    low_stock_count = (
        db.scalar(select(func.count()).select_from(Product).where(*low_stock_filters)) or 0
    )
    low_stock_rows = db.scalars(
        select(Product)
        .where(*low_stock_filters)
        .order_by(Product.stock_quantity.asc(), Product.id.asc())
        .limit(10)
    ).all()

    return AdminSummaryOut(
        orders_today=orders_today,
        revenue_today=_money(Decimal(revenue_today)),
        revenue_this_month=_money(Decimal(revenue_this_month)),
        product_count=product_count,
        low_stock_count=low_stock_count,
        low_stock_threshold=LOW_STOCK_THRESHOLD,
        low_stock_items=[
            AdminLowStockOut(id=row.id, name=row.name, stock_quantity=row.stock_quantity)
            for row in low_stock_rows
        ],
    )


def list_admin_orders(db: Session, *, limit: int = 20) -> AdminOrderListOut:
    capped = min(max(limit, 1), 100)
    rows = db.scalars(
        select(Order)
        .options(selectinload(Order.user))
        .order_by(Order.created_at.desc())
        .limit(capped)
    ).all()
    items = [
        AdminOrderRowOut(
            id=row.id,
            customer_name=row.user.name,
            total=row.total,
            status=row.status,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return AdminOrderListOut(items=items)