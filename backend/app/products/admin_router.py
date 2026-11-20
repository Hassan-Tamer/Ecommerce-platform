from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db.deps import get_db
from . import service
from .schemas import ProductOut

router = APIRouter(
    prefix="/admin/products",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=list[ProductOut])
def admin_list_products(
    db: Session = Depends(get_db),
    category_slug: Annotated[str | None, Query(description="Filter by category slug")] = None,
    q: Annotated[
        str | None,
        Query(min_length=1, max_length=200, description="Search name and description"),
    ] = None,
    min_price: Annotated[Decimal | None, Query(ge=0, description="Minimum price (inclusive)")] = None,
    max_price: Annotated[Decimal | None, Query(ge=0, description="Maximum price (inclusive)")] = None,
    sort: Annotated[
        Literal["id", "price_asc", "price_desc", "name"],
        Query(description="Sort order"),
    ] = "id",
    is_active: Annotated[
        bool | None,
        Query(description="Filter by active flag; omit to include all"),
    ] = None,
) -> list[ProductOut]:
    return service.list_products(
        db,
        category_slug=category_slug,
        q=q,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        active_only=False,
        is_active=is_active,
    )


@router.get("/{product_id}", response_model=ProductOut)
def admin_get_product(
    product_id: int,
    db: Session = Depends(get_db),
) -> ProductOut:
    return service.get_product_by_id(db, product_id=product_id, active_only=False)