from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.deps import get_db
from app.db.models import User

from . import service
from .pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from .schemas import ReviewCreate, ReviewListPage, ReviewOut

router = APIRouter(prefix="/products", tags=["reviews"])


@router.get("/slug/{slug}/reviews", response_model=ReviewListPage)
def list_product_reviews(
    slug: str,
    db: Session = Depends(get_db),
    cursor: Annotated[
        str | None,
        Query(min_length=1, description="Opaque cursor from a previous page"),
    ] = None,
    limit: Annotated[
        int,
        Query(ge=1, le=MAX_PAGE_SIZE, description="Page size"),
    ] = DEFAULT_PAGE_SIZE,
) -> ReviewListPage:
    return service.list_reviews_for_product(db, slug=slug, cursor=cursor, limit=limit)


@router.post("/slug/{slug}/reviews", response_model=ReviewOut)
def post_product_review(
    slug: str,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewOut:
    return service.create_or_update_review(db, user=current_user, slug=slug, data=data)