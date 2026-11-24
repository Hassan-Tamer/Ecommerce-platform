from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Category, Product
from app.reviews.service import review_summaries_for_products
from app.products.pagination import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    _decode_cursor,
    apply_cursor_filter,
    encode_next_cursor,
    order_by_for_sort,
)
from app.products.catalog_cache import get_product_by_slug_cached, set_product_by_slug_cached
from app.products.schemas import (
    CategoryBrief,
    ProductImageOut,
    ProductListPage,
    ProductOut,
    image_url_from_object_key,
)


def _product_to_out(
    product: Product,
    *,
    include_stock: bool,
    review_average: float = 0.0,
    review_count: int = 0,
) -> ProductOut:
    return ProductOut(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        price=product.price,
        stock_quantity=product.stock_quantity if include_stock else None,
        is_active=product.is_active,
        category=product.category,
        images=[
            ProductImageOut(
                id=image.id,
                url=image_url_from_object_key(image.object_key),
                position=image.position,
            )
            for image in product.images
        ],
        review_average=review_average,
        review_count=review_count,
    )


def _product_out_for_view(product: ProductOut, *, include_stock: bool) -> ProductOut:
    if include_stock:
        return product
    return product.model_copy(update={"stock_quantity": None})


def list_categories(db: Session) -> list[CategoryBrief]:
    categories = db.scalars(select(Category).order_by(Category.name)).all()
    return [CategoryBrief.model_validate(c) for c in categories]


def list_products(
    db: Session,
    *,
    category_slug: str | None = None,
    q: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    sort: str = "id",
    active_only: bool = True,
    is_active: bool | None = None,
    include_stock: bool = False,
    cursor: str | None = None,
    limit: int = DEFAULT_PAGE_SIZE,
) -> ProductListPage:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=400, detail="min_price must be <= max_price")

    if limit < 1 or limit > MAX_PAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"limit must be between 1 and {MAX_PAGE_SIZE}",
        )

    stmt = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.images),
    )
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    elif is_active is not None:
        stmt = stmt.where(Product.is_active.is_(is_active))

    if category_slug:
        slug = category_slug.strip()
        stmt = stmt.join(Product.category).where(Category.slug == slug)

    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
            )
        )

    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)

    if cursor:
        decoded = _decode_cursor(cursor, expected_sort=sort)
        stmt = apply_cursor_filter(stmt, sort=sort, cursor=decoded)

    for clause in order_by_for_sort(sort):
        stmt = stmt.order_by(clause)

    rows = db.scalars(stmt.limit(limit + 1)).all()
    has_more = len(rows) > limit
    page = rows[:limit]

    summaries = review_summaries_for_products(db, [product.id for product in page])

    return ProductListPage(
        items=[
            _product_to_out(
                product,
                include_stock=include_stock,
                review_average=summaries.get(product.id, (0.0, 0))[0],
                review_count=summaries.get(product.id, (0.0, 0))[1],
            )
            for product in page
        ],
        next_cursor=encode_next_cursor(sort, page[-1]) if has_more else None,
    )


def get_product_by_id(
    db: Session,
    *,
    product_id: int,
    active_only: bool = True,
    include_stock: bool = False,
) -> ProductOut:
    stmt = (
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.id == product_id)
    )
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    product = db.scalar(stmt)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_to_out(product, include_stock=include_stock)


def get_product_by_slug(
    db: Session,
    *,
    slug: str,
    include_stock: bool = False,
) -> ProductOut:
    normalized = slug.strip()
    cached = get_product_by_slug_cached(normalized)
    if cached is not None:
        return _product_out_for_view(cached, include_stock=include_stock)

    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.slug == normalized, Product.is_active.is_(True))
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    stored = _product_to_out(product, include_stock=True)
    set_product_by_slug_cached(product.slug, stored)
    return _product_out_for_view(stored, include_stock=include_stock)