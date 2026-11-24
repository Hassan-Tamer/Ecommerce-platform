from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.deps import get_db
from app.db.models import User
from app.products.schemas import ProductOut

from . import service
from .schemas import WishlistOut

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=WishlistOut, response_model_exclude_none=True)
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WishlistOut:
    return WishlistOut(items=service.list_wishlist(db, user=current_user))


@router.put("/{product_id}", response_model=ProductOut, response_model_exclude_none=True)
def add_wishlist_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductOut:
    return service.add_to_wishlist(db, user=current_user, product_id=product_id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_wishlist_item(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.remove_from_wishlist(db, user=current_user, product_id=product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)