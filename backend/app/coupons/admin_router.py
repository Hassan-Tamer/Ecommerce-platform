from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db.deps import get_db

from . import service
from .schemas import CouponCreate, CouponOut, CouponUpdate

router = APIRouter(
    prefix="/admin/coupons",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=list[CouponOut])
def admin_list_coupons(db: Session = Depends(get_db)) -> list[CouponOut]:
    return service.list_coupons(db)


@router.get("/{coupon_id}", response_model=CouponOut)
def admin_get_coupon(coupon_id: int, db: Session = Depends(get_db)) -> CouponOut:
    return service.get_coupon(db, coupon_id)


@router.post("", response_model=CouponOut, status_code=status.HTTP_201_CREATED)
def admin_create_coupon(
    data: CouponCreate,
    db: Session = Depends(get_db),
) -> CouponOut:
    return service.create_coupon(db, data)


@router.patch("/{coupon_id}", response_model=CouponOut)
def admin_update_coupon(
    coupon_id: int,
    data: CouponUpdate,
    db: Session = Depends(get_db),
) -> CouponOut:
    return service.update_coupon(db, coupon_id, data)


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
) -> Response:
    service.delete_coupon(db, coupon_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)