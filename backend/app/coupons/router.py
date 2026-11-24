from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.deps import get_db
from app.db.models import User

from . import service
from .schemas import CouponApplyIn, CouponPricingOut

router = APIRouter(tags=["coupons"])


@router.post("/cart/coupon", response_model=CouponPricingOut)
def apply_cart_coupon(
    body: CouponApplyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CouponPricingOut:
    return service.apply_to_cart(db, user=current_user, code=body.code)