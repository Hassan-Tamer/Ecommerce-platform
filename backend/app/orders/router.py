from typing import Annotated

from fastapi import APIRouter, Depends, Header, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.deps import get_db
from app.db.models import User

from . import service
from .schemas import OrderCreate, OrderListOut, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=OrderListOut)
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderListOut:
    return service.list_orders(db, user=current_user)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderOut:
    return service.get_order(db, user=current_user, order_id=order_id)


@router.post("", response_model=OrderOut)
def create_order(
    body: OrderCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> OrderOut:
    out, created = service.create_order_from_cart(
        db,
        user=current_user,
        data=body,
        idempotency_key=idempotency_key,
    )
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return out