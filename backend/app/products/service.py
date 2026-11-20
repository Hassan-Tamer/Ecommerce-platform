from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Category, Product
from app.products.schemas import CategoryBrief, ProductImageOut, ProductOut, image_url_from_object_key


def _product_to_out(product: Product, *, include_stock: bool) -> ProductOut:
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
    )


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
) -> list[ProductOut]:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=400, detail="min_price must be <= max_price")

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

    order_by = {
        "id": Product.id.asc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name": Product.name.asc(),
    }.get(sort, Product.id.asc())
    stmt = stmt.order_by(order_by)

    products = db.scalars(stmt).all()
    return [_product_to_out(p, include_stock=include_stock) for p in products]


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
    product = db.scalar(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.images))
        .where(Product.slug == slug, Product.is_active.is_(True))
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_to_out(product, include_stock=include_stock)