from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_optional_current_user
from app.db.deps import get_db
from app.db.models import User
from app.enums import UserRole
from . import service
from .pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from .schemas import CategoryBrief, ProductListPage, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListPage, response_model_exclude_none=True)
def list_products(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
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
) -> ProductListPage:
    include_stock = (
        current_user is not None and current_user.role == UserRole.ADMIN.value
    )
    return service.list_products(
        db,
        category_slug=category_slug,
        q=q,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
        include_stock=include_stock,
        cursor=cursor,
        limit=limit,
    )


@router.get("/categories", response_model=list[CategoryBrief])
def list_categories(db: Session = Depends(get_db)) -> list[CategoryBrief]:
    return service.list_categories(db)


@router.get("/slug/{slug}", response_model=ProductOut)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)) -> ProductOut:
    return service.get_product_by_slug(db, slug=slug)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)) -> ProductOut:
    return service.get_product_by_id(db, product_id=product_id)