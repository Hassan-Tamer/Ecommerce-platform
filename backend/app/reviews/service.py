from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import Product, Review, User
from .pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, encode_review_cursor
from .schemas import ReviewCreate, ReviewListPage, ReviewOut


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _review_to_out(review: Review) -> ReviewOut:
    return ReviewOut(
        id=review.id,
        author=review.user.name,
        rating=review.rating,
        title=review.title,
        body=review.body,
        created_at=review.created_at,
    )


def _product_id_for_slug(db: Session, *, slug: str) -> int:
    product = db.scalar(
        select(Product.id).where(Product.slug == slug.strip(), Product.is_active.is_(True))
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def review_summaries_for_products(
    db: Session,
    product_ids: list[int],
) -> dict[int, tuple[float, int]]:
    if not product_ids:
        return {}
    rows = db.execute(
        select(
            Review.product_id,
            func.avg(Review.rating),
            func.count(Review.id),
        )
        .where(Review.product_id.in_(product_ids))
        .group_by(Review.product_id)
    ).all()
    summaries: dict[int, tuple[float, int]] = {}
    for product_id, average_raw, count in rows:
        count_int = int(count or 0)
        average = float(average_raw) if count_int else 0.0
        summaries[int(product_id)] = (average, count_int)
    return summaries


def _review_stats(db: Session, *, product_id: int) -> tuple[float, int]:
    average_raw, count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.product_id == product_id
        )
    ).one()
    count_int = int(count or 0)
    if count_int == 0:
        return 0.0, 0
    return float(average_raw), count_int


def list_reviews_for_product(
    db: Session,
    *,
    slug: str,
    cursor: str | None = None,
    limit: int = DEFAULT_PAGE_SIZE,
) -> ReviewListPage:
    if limit < 1 or limit > MAX_PAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"limit must be between 1 and {MAX_PAGE_SIZE}",
        )

    product_id = _product_id_for_slug(db, slug=slug)
    average, count = _review_stats(db, product_id=product_id)

    stmt = (
        select(Review)
        .where(Review.product_id == product_id)
        .options(joinedload(Review.user))
        .order_by(Review.created_at.desc(), Review.id.desc())
    )

    if cursor is not None:
        from .pagination import decode_review_cursor

        cursor_at, cursor_id = decode_review_cursor(cursor)
        stmt = stmt.where(
            or_(
                Review.created_at < cursor_at,
                and_(Review.created_at == cursor_at, Review.id < cursor_id),
            )
        )

    rows = db.scalars(stmt.limit(limit + 1)).all()
    has_more = len(rows) > limit
    page = rows[:limit]

    next_cursor: str | None = None
    if has_more and page:
        last = page[-1]
        next_cursor = encode_review_cursor(created_at=last.created_at, review_id=last.id)

    return ReviewListPage(
        average=average,
        count=count,
        items=[_review_to_out(row) for row in page],
        next_cursor=next_cursor,
    )


def create_or_update_review(
    db: Session,
    *,
    user: User,
    slug: str,
    data: ReviewCreate,
) -> ReviewOut:
    product_id = _product_id_for_slug(db, slug=slug)

    title = _optional_text(data.title)
    body = _optional_text(data.body)
    rating = data.rating

    existing = db.scalar(
        select(Review)
        .options(joinedload(Review.user))
        .where(Review.user_id == user.id, Review.product_id == product_id)
    )
    if existing is not None:
        existing.rating = rating
        existing.title = title
        existing.body = body
        db.commit()
        db.refresh(existing)
        db.refresh(existing, attribute_names=["user"])
        return _review_to_out(existing)

    review = Review(
        user_id=user.id,
        product_id=product_id,
        rating=rating,
        title=title,
        body=body,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    review = db.scalar(
        select(Review).options(joinedload(Review.user)).where(Review.id == review.id)
    )
    assert review is not None
    return _review_to_out(review)


def delete_review(db: Session, *, review_id: int) -> None:
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()