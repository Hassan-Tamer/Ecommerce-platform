#!/usr/bin/env python3
"""Seed shop coupons (5 rows by default)."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.models import Coupon
from app.db.session import SessionLocal
from app.enums import DiscountType

COUPON_ROWS: list[dict] = [
    {
        "code": "WELCOME10",
        "discount_type": DiscountType.PERCENT.value,
        "discount_value": Decimal("10.00"),
        "min_subtotal": None,
        "max_discount": None,
        "starts_at": None,
        "ends_at": None,
        "is_active": True,
        "usage_limit": None,
        "per_user_limit": None,
    },
    {
        "code": "SAVE15",
        "discount_type": DiscountType.PERCENT.value,
        "discount_value": Decimal("15.00"),
        "min_subtotal": Decimal("25.00"),
        "max_discount": Decimal("30.00"),
        "starts_at": None,
        "ends_at": None,
        "is_active": True,
        "usage_limit": None,
        "per_user_limit": None,
    },
    {
        "code": "FLAT20",
        "discount_type": DiscountType.FIXED.value,
        "discount_value": Decimal("20.00"),
        "min_subtotal": Decimal("75.00"),
        "max_discount": None,
        "starts_at": None,
        "ends_at": None,
        "is_active": True,
        "usage_limit": None,
        "per_user_limit": None,
    },
    {
        "code": "WEEKEND25",
        "discount_type": DiscountType.PERCENT.value,
        "discount_value": Decimal("25.00"),
        "min_subtotal": Decimal("50.00"),
        "max_discount": Decimal("50.00"),
        "starts_at": datetime.now(timezone.utc) - timedelta(days=1),
        "ends_at": datetime.now(timezone.utc) + timedelta(days=7),
        "is_active": True,
        "usage_limit": 100,
        "per_user_limit": 1,
    },
    {
        "code": "LABOR5",
        "discount_type": DiscountType.FIXED.value,
        "discount_value": Decimal("5.00"),
        "min_subtotal": None,
        "max_discount": None,
        "starts_at": None,
        "ends_at": None,
        "is_active": False,
        "usage_limit": None,
        "per_user_limit": None,
    },
]


def seed_coupons(session: Session, *, reset: bool) -> None:
    if reset:
        session.execute(delete(Coupon))
        session.flush()

    existing = session.scalar(select(func.count()).select_from(Coupon)) or 0
    if existing > 0 and not reset:
        print(f"Coupons table already has {existing} rows. Use --reset to replace.")
        return

    for row in COUPON_ROWS:
        session.add(Coupon(**row))

    session.commit()
    count = session.scalar(select(func.count()).select_from(Coupon))
    print(f"Seeded {count} coupons.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed shop coupons")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing coupons before seeding",
    )
    args = parser.parse_args()

    with SessionLocal() as session:
        seed_coupons(session, reset=args.reset)


if __name__ == "__main__":
    main()