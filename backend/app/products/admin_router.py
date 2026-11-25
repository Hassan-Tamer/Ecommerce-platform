from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db.deps import get_db
from . import service
from .pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from .schemas import ProductListPage, ProductOut, ProductStockPatch

router = APIRouter(
    prefix="/admin/products",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=ProductListPage)
def admin_list_products(
    db: Session = Depends(get_db),
    cursor: Annotated[
        str | None,
        Query(min_length=1, description="Opaque cursor from a previous page"),
    ] = None,
    limit: Annotated[
        int,
        Query(ge=1, le=MAX_PAGE_SIZE, description="Page size"),
    ] = DEFAULT_PAGE_SIZE,
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
) -> ProductListPage:
    return service.list_products(
        db,
        category_slug=category_slug,
        q=q,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        active_only=False,
        is_active=is_active,
        include_stock=True,
        cursor=cursor,
        limit=limit,
    )


@router.get("/{product_id}", response_model=ProductOut)
def admin_get_product(
    product_id: int,
    db: Session = Depends(get_db),
) -> ProductOut:
    return service.get_product_by_id(
        db,
        product_id=product_id,
        active_only=False,
        include_stock=True,
    )


@router.post("", response_model=ProductOut)
async def admin_create_product(
    category_id: Annotated[int, Form()],
    name: Annotated[str, Form(min_length=1, max_length=255)],
    price: Annotated[Decimal, Form(ge=0)],
    description: Annotated[str | None, Form()] = None,
    stock_quantity: Annotated[int, Form(ge=0)] = 0,
    stock_alert_at: Annotated[int, Form(ge=0)] = 5,
    is_active: Annotated[str, Form()] = "true",
    images: Annotated[list[UploadFile], File()] = [],
    db: Session = Depends(get_db),
) -> ProductOut:
    return await service.create_product(
        db,
        category_id=category_id,
        name=name,
        price=price,
        description=description,
        stock_quantity=stock_quantity,
        stock_alert_at=stock_alert_at,
        is_active=service._parse_bool(is_active, default=True),
        images=images,
    )


@router.patch("/{product_id}", response_model=ProductOut)
async def admin_update_product(
    product_id: int,
    category_id: Annotated[int | None, Form()] = None,
    name: Annotated[str | None, Form()] = None,
    price: Annotated[Decimal | None, Form(ge=0)] = None,
    description: Annotated[str | None, Form()] = None,
    stock_quantity: Annotated[int | None, Form(ge=0)] = None,
    stock_alert_at: Annotated[int | None, Form(ge=0)] = None,
    is_active: Annotated[str | None, Form()] = None,
    images: Annotated[list[UploadFile], File()] = [],
    db: Session = Depends(get_db),
) -> ProductOut:
    active = service._parse_bool(is_active, default=True) if is_active is not None else None
    return await service.update_product(
        db,
        product_id=product_id,
        category_id=category_id,
        name=name,
        price=price,
        description=description,
        stock_quantity=stock_quantity,
        stock_alert_at=stock_alert_at,
        is_active=active,
        images=images,
    )


@router.patch("/{product_id}/stock", response_model=ProductOut)
def admin_patch_product_stock(
    product_id: int,
    body: ProductStockPatch,
    db: Session = Depends(get_db),
) -> ProductOut:
    return service.patch_product_stock(db, product_id=product_id, data=body)


@router.delete("/{product_id}", response_model=ProductOut)
def admin_deactivate_product(
    product_id: int,
    db: Session = Depends(get_db),
) -> ProductOut:
    return service.deactivate_product(db, product_id=product_id)