from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.deps import get_db
from . import service
from .schemas import CategoryBrief, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(
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
) -> list[ProductOut]:
    return service.list_products(
        db,
        category_slug=category_slug,
        q=q,
        min_price=min_price,
        max_price=max_price,
        sort=sort,
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