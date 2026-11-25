import re
from decimal import Decimal

from fastapi import HTTPException, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Category, Product, ProductImage
from app.storage.minio_storage import content_type_from_filename, upload_product_image
from app.reviews.service import review_summaries_for_products
from app.products.pagination import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    _decode_cursor,
    apply_cursor_filter,
    encode_next_cursor,
    order_by_for_sort,
)
from app.products.catalog_cache import (
    get_product_by_slug_cached,
    invalidate_product_by_slug,
    set_product_by_slug_cached,
)
from app.products.schemas import (
    CategoryBrief,
    ProductImageOut,
    ProductListPage,
    ProductOut,
    ProductStockPatch,
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
        stock_alert_at=product.stock_alert_at if include_stock else None,
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


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(text: str) -> str:
    slug = _SLUG_RE.sub("-", text.lower().strip()).strip("-")
    return slug or "product"


def _unique_product_slug(db: Session, base: str, *, exclude_id: int | None = None) -> str:
    root = _slugify(base)
    slug = root
    index = 2
    while True:
        stmt = select(Product.id).where(Product.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        taken = db.scalar(stmt)
        if taken is None:
            return slug
        slug = f"{root}-{index}"
        index += 1


def _parse_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_image_content_type(upload: UploadFile) -> str:
    content_type = (upload.content_type or "").split(";", 1)[0].strip().lower()
    if content_type in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        return content_type
    guessed = content_type_from_filename(upload.filename)
    if guessed:
        return guessed
    raise HTTPException(status_code=400, detail="Images must be JPEG, PNG, WebP, or GIF")


async def _read_product_images(uploads: list[UploadFile]) -> list[tuple[bytes, str, str | None]]:
    if len(uploads) > 12:
        raise HTTPException(status_code=400, detail="At most 12 images per request")
    payloads: list[tuple[bytes, str, str | None]] = []
    for upload in uploads:
        if upload.filename is None and upload.file is None:
            continue
        content_type = _resolve_image_content_type(upload)
        if upload.file is None:
            raise HTTPException(status_code=400, detail="Image file is required")
        data = await upload.read()
        if not data:
            continue
        payloads.append((data, content_type, upload.filename))
    return payloads


def _attach_images(
    db: Session,
    *,
    product: Product,
    image_payloads: list[tuple[bytes, str, str | None]],
) -> None:
    if not image_payloads:
        return
    next_position = max((image.position for image in product.images), default=-1) + 1
    for offset, (data, content_type, filename) in enumerate(image_payloads):
        object_key = upload_product_image(
            product_id=product.id,
            data=data,
            content_type=content_type,
            filename=filename,
        )
        db.add(
            ProductImage(
                product_id=product.id,
                object_key=object_key,
                position=next_position + offset,
            )
        )


def _invalidate_product_cache(product: Product) -> None:
    invalidate_product_by_slug(product.slug)


def _load_product_or_404(db: Session, product_id: int) -> Product:
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.id == product_id)
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


async def create_product(
    db: Session,
    *,
    category_id: int,
    name: str,
    price: Decimal,
    description: str | None,
    stock_quantity: int,
    stock_alert_at: int,
    is_active: bool,
    images: list[UploadFile],
) -> ProductOut:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    image_payloads = await _read_product_images(images)
    slug = _unique_product_slug(db, name)

    product = Product(
        category_id=category_id,
        name=name,
        slug=slug,
        description=description.strip() if description else None,
        price=price,
        stock_quantity=stock_quantity,
        stock_alert_at=stock_alert_at,
        is_active=is_active,
    )
    db.add(product)
    db.flush()

    _attach_images(db, product=product, image_payloads=image_payloads)
    db.commit()
    db.refresh(product)
    loaded = _load_product_or_404(db, product.id)
    _invalidate_product_cache(loaded)
    return _product_to_out(loaded, include_stock=True)


async def update_product(
    db: Session,
    *,
    product_id: int,
    category_id: int | None,
    name: str | None,
    price: Decimal | None,
    description: str | None,
    stock_quantity: int | None,
    stock_alert_at: int | None,
    is_active: bool | None,
    images: list[UploadFile],
) -> ProductOut:
    product = _load_product_or_404(db, product_id)
    old_slug = product.slug

    if category_id is not None:
        category = db.get(Category, category_id)
        if category is None:
            raise HTTPException(status_code=404, detail="Category not found")
        product.category_id = category_id

    if name is not None:
        clean = name.strip()
        if not clean:
            raise HTTPException(status_code=400, detail="Name is required")
        if clean != product.name:
            product.name = clean
            product.slug = _unique_product_slug(db, clean, exclude_id=product.id)

    if price is not None:
        product.price = price
    if description is not None:
        product.description = description.strip() or None
    if stock_quantity is not None:
        product.stock_quantity = stock_quantity
    if stock_alert_at is not None:
        product.stock_alert_at = stock_alert_at
    if is_active is not None:
        product.is_active = is_active

    image_payloads = await _read_product_images(images)
    _attach_images(db, product=product, image_payloads=image_payloads)

    db.commit()
    db.refresh(product)
    loaded = _load_product_or_404(db, product.id)
    if old_slug != loaded.slug:
        invalidate_product_by_slug(old_slug)
    _invalidate_product_cache(loaded)
    return _product_to_out(loaded, include_stock=True)


def patch_product_stock(db: Session, *, product_id: int, data: ProductStockPatch) -> ProductOut:
    product = _load_product_or_404(db, product_id)
    if data.add_stock:
        product.stock_quantity += data.add_stock
    if data.stock_alert_at is not None:
        product.stock_alert_at = data.stock_alert_at
    db.commit()
    db.refresh(product)
    loaded = _load_product_or_404(db, product.id)
    _invalidate_product_cache(loaded)
    return _product_to_out(loaded, include_stock=True)


def deactivate_product(db: Session, *, product_id: int) -> ProductOut:
    product = _load_product_or_404(db, product_id)
    product.is_active = False
    db.commit()
    db.refresh(product)
    loaded = _load_product_or_404(db, product.id)
    _invalidate_product_cache(loaded)
    return _product_to_out(loaded, include_stock=True)