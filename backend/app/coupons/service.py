from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.cart import service as cart_service
from app.db.models import Coupon, User
from app.enums import DiscountType

from .schemas import CouponBrief, CouponCreate, CouponOut, CouponPricingOut, CouponUpdate


def normalize_code(code: str) -> str:
    return code.strip().upper()


def _to_out(row: Coupon) -> CouponOut:
    return CouponOut.model_validate(row)


def _validate_merged_coupon(
    *,
    discount_type: str,
    discount_value: Decimal,
    max_discount: Decimal | None,
    starts_at: datetime | None,
    ends_at: datetime | None,
) -> None:
    if discount_type == DiscountType.PERCENT.value and discount_value > Decimal("100"):
        raise HTTPException(status_code=400, detail="percent discount_value must be <= 100")
    if discount_type == DiscountType.FIXED.value and max_discount is not None:
        raise HTTPException(status_code=400, detail="max_discount applies only to percent coupons")
    if starts_at is not None and ends_at is not None and starts_at > ends_at:
        raise HTTPException(status_code=400, detail="starts_at must be <= ends_at")


def list_coupons(db: Session) -> list[CouponOut]:
    rows = db.scalars(select(Coupon).order_by(Coupon.code)).all()
    return [_to_out(row) for row in rows]


def get_coupon(db: Session, coupon_id: int) -> CouponOut:
    row = db.get(Coupon, coupon_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return _to_out(row)


def create_coupon(db: Session, data: CouponCreate) -> CouponOut:
    code = normalize_code(data.code)
    exists = db.scalar(select(Coupon.id).where(Coupon.code == code))
    if exists is not None:
        raise HTTPException(status_code=409, detail="Coupon code already exists")

    row = Coupon(
        code=code,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_subtotal=data.min_subtotal,
        max_discount=data.max_discount,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        is_active=data.is_active,
        usage_limit=data.usage_limit,
        per_user_limit=data.per_user_limit,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


def update_coupon(db: Session, coupon_id: int, data: CouponUpdate) -> CouponOut:
    row = db.get(Coupon, coupon_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Coupon not found")

    payload = data.model_dump(exclude_unset=True)
    if "code" in payload and payload["code"] is not None:
        code = normalize_code(payload["code"])
        taken = db.scalar(
            select(Coupon.id).where(Coupon.code == code, Coupon.id != coupon_id)
        )
        if taken is not None:
            raise HTTPException(status_code=409, detail="Coupon code already exists")
        row.code = code
        payload.pop("code")

    for key, value in payload.items():
        setattr(row, key, value)

    _validate_merged_coupon(
        discount_type=row.discount_type,
        discount_value=row.discount_value,
        max_discount=row.max_discount,
        starts_at=row.starts_at,
        ends_at=row.ends_at,
    )

    db.commit()
    db.refresh(row)
    return _to_out(row)


def delete_coupon(db: Session, coupon_id: int) -> None:
    row = db.get(Coupon, coupon_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(row)
    db.commit()


def compute_discount(subtotal: Decimal, coupon: Coupon) -> Decimal:
    if subtotal <= 0:
        return Decimal("0")

    if coupon.discount_type == DiscountType.PERCENT.value:
        raw = (subtotal * coupon.discount_value / Decimal("100")).quantize(Decimal("0.01"))
        if coupon.max_discount is not None:
            raw = min(raw, coupon.max_discount)
        return min(raw, subtotal)

    return min(coupon.discount_value, subtotal)


def coupon_brief(coupon: Coupon) -> CouponBrief:
    return CouponBrief(
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
    )


def validate_coupon_for_cart(
    *,
    coupon: Coupon,
    subtotal: Decimal,
) -> None:
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is not active")

    now = datetime.now(timezone.utc)
    if coupon.starts_at is not None and coupon.starts_at > now:
        raise HTTPException(status_code=400, detail="Coupon is not active yet")
    if coupon.ends_at is not None and coupon.ends_at < now:
        raise HTTPException(status_code=400, detail="Coupon has expired")

    if coupon.min_subtotal is not None and subtotal < coupon.min_subtotal:
        raise HTTPException(
            status_code=400,
            detail=f"Order subtotal must be at least {coupon.min_subtotal}",
        )


def find_coupon_by_code(db: Session, code: str) -> Coupon:
    normalized = normalize_code(code)
    coupon = db.scalar(select(Coupon).where(func.upper(Coupon.code) == normalized))
    if coupon is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon


def apply_to_cart(db: Session, *, user: User, code: str) -> CouponPricingOut:
    cart = cart_service.list_cart(db, user=user)
    if cart.item_count == 0:
        raise HTTPException(status_code=400, detail="Cart is empty")

    coupon = find_coupon_by_code(db, code)
    validate_coupon_for_cart(coupon=coupon, subtotal=cart.subtotal)
    discount = compute_discount(cart.subtotal, coupon)
    total = cart.subtotal - discount
    return CouponPricingOut(
        subtotal=cart.subtotal,
        discount=discount,
        total=total,
        coupon=coupon_brief(coupon),
    )