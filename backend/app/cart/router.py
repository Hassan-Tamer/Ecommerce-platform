from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.deps import get_db
from app.db.models import User

from . import service
from .schemas import CartItemCreate, CartItemUpdate, CartLineOut, CartOut

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartOut, response_model_exclude_none=True)
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CartOut:
    return service.list_cart(db, user=current_user)


@router.post("/items", response_model=CartLineOut, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    body: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CartLineOut:
    return service.add_cart_item(
        db,
        user=current_user,
        product_id=body.product_id,
        quantity=body.quantity,
    )


@router.patch("/items/{product_id}", response_model=CartLineOut)
def update_cart_item(
    product_id: int,
    body: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CartLineOut:
    return service.update_cart_item(
        db,
        user=current_user,
        product_id=product_id,
        quantity=body.quantity,
    )


@router.delete("/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.remove_cart_item(db, user=current_user, product_id=product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)