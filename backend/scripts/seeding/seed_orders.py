#!/usr/bin/env python3
"""Seed sample orders with line-item snapshots (deterministic demo data)."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.models import Order, OrderItem, Product, User
from app.db.session import SessionLocal
from app.enums import UserRole

SHIPPING_FLAT = Decimal("9.99")

SAMPLE_ADDRESSES: list[dict[str, str | None]] = [
    {
        "name": "Maya Chen",
        "street": "42 Cedar Lane",
        "city": "Portland",
        "apartment_number": "3B",
        "floor": "3",
        "phone": "+1-555-0101",
    },
    {
        "name": "Omar Ali",
        "street": "18 Market Street",
        "city": "Austin",
        "apartment_number": None,
        "floor": None,
        "phone": "+1-555-0102",
    },
    {
        "name": "Lina Park",
        "street": "7 Riverside Drive",
        "city": "Seattle",
        "apartment_number": "12",
        "floor": "1",
        "phone": "+1-555-0103",
    },
]


def _line_total(unit_price: Decimal, quantity: int) -> Decimal:
    return (unit_price * quantity).quantize(Decimal("0.01"))


def seed_orders(session: Session, *, reset: bool, orders_per_user: int) -> None:
    if reset:
        session.execute(delete(Order))
        session.flush()

    existing = session.scalar(select(func.count()).select_from(Order)) or 0
    if existing > 0 and not reset:
        print(f"Orders table already has {existing} rows. Use --reset to replace.")
        return

    users = session.scalars(
        select(User)
        .where(User.role == UserRole.CUSTOMER.value)
        .order_by(User.id)
        .limit(5)
    ).all()
    if not users:
        print("No customer users found. Register customers or run seed_catalog / seed_reviews first.")
        return

    products = session.scalars(
        select(Product).where(Product.is_active.is_(True)).order_by(Product.id).limit(40)
    ).all()
    if len(products) < 2:
        print("Need at least 2 active products. Run seed_catalog.py first.")
        return

    now = datetime.now(timezone.utc)
    statuses = ["pending", "paid", "shipped", "delivered", "cancelled"]
    created_orders = 0

    for user_index, user in enumerate(users):
        address = SAMPLE_ADDRESSES[user_index % len(SAMPLE_ADDRESSES)]
        if not address.get("name") and user.name:
            address = {**address, "name": user.name}

        for order_num in range(orders_per_user):
            product_a = products[(user_index * orders_per_user + order_num) % len(products)]
            product_b = products[(user_index * orders_per_user + order_num + 3) % len(products)]
            if product_b.id == product_a.id:
                product_b = products[(user_index + order_num + 5) % len(products)]

            qty_a = 1 + ((user.id + order_num) % 2)
            qty_b = 1 + ((user.id + order_num) % 3)
            subtotal = _line_total(product_a.price, qty_a) + _line_total(product_b.price, qty_b)

            use_coupon = order_num == 0 and user_index % 2 == 0
            discount = Decimal("0.00")
            coupon_code = None
            if use_coupon:
                coupon_code = "WELCOME10"
                discount = (subtotal * Decimal("0.10")).quantize(Decimal("0.01"))

            shipping = SHIPPING_FLAT if order_num % 3 != 2 else Decimal("0.00")
            total = (subtotal - discount + shipping).quantize(Decimal("0.01"))
            status = statuses[(user_index + order_num) % len(statuses)]
            if status == "cancelled":
                total = max(total, Decimal("0.00"))

            days_ago = 5 + user_index * 7 + order_num * 3
            created_at = now - timedelta(days=days_ago, hours=order_num * 4)

            idempotency_key = None
            if order_num == 0:
                idempotency_key = f"seed-order-{user.id}"

            order = Order(
                user_id=user.id,
                status=status,
                subtotal=subtotal,
                discount_amount=discount,
                shipping_amount=shipping,
                total=total,
                coupon_code=coupon_code,
                shipping_address=address,
                idempotency_key=idempotency_key,
                created_at=created_at,
                updated_at=created_at,
                items=[
                    OrderItem(
                        product_id=product_a.id,
                        product_name=product_a.name[:200],
                        unit_price=product_a.price,
                        quantity=qty_a,
                    ),
                    OrderItem(
                        product_id=product_b.id,
                        product_name=product_b.name[:200],
                        unit_price=product_b.price,
                        quantity=qty_b,
                    ),
                ],
            )
            session.add(order)
            created_orders += 1

    session.commit()
    total = session.scalar(select(func.count()).select_from(Order))
    item_count = session.scalar(select(func.count()).select_from(OrderItem))
    print(
        f"Seeded {created_orders} orders ({item_count} line items; "
        f"{total} rows in orders table)."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed sample orders")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing orders (and items) before seeding",
    )
    parser.add_argument(
        "--per-user",
        type=int,
        default=2,
        help="Orders to create per customer user (default 2, max 5 users)",
    )
    args = parser.parse_args()

    if args.per_user < 1:
        raise SystemExit("--per-user must be at least 1")

    with SessionLocal() as session:
        seed_orders(session, reset=args.reset, orders_per_user=args.per_user)


if __name__ == "__main__":
    main()