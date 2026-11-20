#!/usr/bin/env python3
"""Seed categories, products, and image placeholders (100 products by default)."""

from __future__ import annotations

import argparse
import json
import re
from decimal import Decimal
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.db.models import Category, Product, ProductImage
from app.db.session import SessionLocal

SEED_DIR = Path(__file__).resolve().parent
SEED_JSON = SEED_DIR / "seed_products.json"
DEFAULT_COUNT = 100

EXTRA_CATEGORIES = (
    "home & decor",
    "sports & outdoors",
    "beauty",
    "books",
)

SYNTH_NAMES: dict[str, list[str]] = {
    "men's clothing": [
        "Classic Fit Oxford Shirt",
        "Slim Chino Trousers",
        "Merino Wool Crew Sweater",
        "Stretch Denim Jeans",
        "Performance Running Tee",
        "Insulated Puffer Vest",
        "Linen Summer Blazer",
        "Fleece Zip Hoodie",
        "Cargo Utility Pants",
        "Moisture-Wick Polo",
    ],
    "women's clothing": [
        "Midi Wrap Dress",
        "High-Rise Wide Leg Jeans",
        "Cashmere Blend Cardigan",
        "Silk Blend Camisole",
        "Pleated Tennis Skirt",
        "Relaxed Linen Trousers",
        "Ribbed Knit Tank Top",
        "Belted Trench Coat",
        "Floral Maxi Dress",
        "Cropped Moto Jacket",
    ],
    "jewelery": [
        "Sterling Silver Pendant",
        "Rose Gold Hoop Earrings",
        "Minimalist Signet Ring",
        "Pearl Strand Necklace",
        "Tennis Bracelet",
        "Layered Chain Set",
        "Stud Earring Trio",
        "Vintage-Inspired Brooch",
        "Gemstone Solitaire Ring",
        "Charm Bracelet",
    ],
    "electronics": [
        "Wireless Noise-Cancelling Headphones",
        "4K Action Camera",
        "Bluetooth Speaker Pro",
        "USB-C Hub Adapter",
        "Mechanical Gaming Keyboard",
        "Portable Power Bank 20000mAh",
        "Smart Home Voice Assistant",
        "Ergonomic Wireless Mouse",
        "LED Desk Lamp with USB",
        "Wi-Fi 6 Mesh Router",
    ],
    "home & decor": [
        "Ceramic Table Vase Set",
        "Weighted Throw Blanket",
        "Scented Soy Candle Trio",
        "Bamboo Storage Baskets",
        "Abstract Canvas Print",
        "Memory Foam Bath Mat",
        "Stainless Kettle",
        "Cordless Stick Vacuum",
        "Glass Meal Prep Containers",
        "Adjustable Floor Lamp",
    ],
    "sports & outdoors": [
        "Insulated Hiking Backpack",
        "Trail Running Shoes",
        "Yoga Mat with Strap",
        "Collapsible Camping Chair",
        "Stainless Water Bottle 32oz",
        "Resistance Band Set",
        "Polarized Sport Sunglasses",
        "Foam Roller",
        "Quick-Dry Athletic Shorts",
        "Compact Sleeping Bag",
    ],
    "beauty": [
        "Hydrating Face Serum",
        "SPF 50 Daily Moisturizer",
        "Cream Blush Palette",
        "Gentle Gel Cleanser",
        "Volumizing Mascara",
        "Argan Oil Hair Mask",
        "Vitamin C Brightening Toner",
        "Matte Lip Color Set",
        "Bamboo Hair Brush",
        "Overnight Repair Cream",
    ],
    "books": [
        "Modern Web Development Guide",
        "Weeknight One-Pan Recipes",
        "Mindfulness for Busy Lives",
        "Intro to Data Science",
        "Travel Photography Handbook",
        "Home Organization Workbook",
        "Classic Short Stories Collection",
        "Personal Finance Essentials",
        "Creative Writing Prompts",
        "World History Atlas",
    ],
}


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s)
    return s.strip("-") or "item"


def unique_slug(base: str, used: set[str]) -> str:
    slug = slugify(base)
    if slug not in used:
        used.add(slug)
        return slug
    i = 2
    while True:
        candidate = f"{slug}-{i}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        i += 1


def load_fakestore_rows() -> list[dict]:
    with SEED_JSON.open(encoding="utf-8") as f:
        return json.load(f)


def placeholder_image_url(slug: str, width: int = 600, height: int = 600) -> str:
    """Stable placeholder image (picsum) keyed by product slug."""
    return f"https://picsum.photos/seed/{slugify(slug)}/{width}/{height}"


def image_object_key(*, external_url: str | None, slug: str, position: int) -> str:
    """
    object_key is normally a MinIO key; for seeded dev data we store external URLs
    prefixed with external: so a future media layer can distinguish them.
    """
    if external_url:
        return f"external:{external_url}"
    return f"external:{placeholder_image_url(f'{slug}-img-{position}')}"


def build_product_rows(target: int) -> list[dict]:
    rows: list[dict] = []
    used_slugs: set[str] = set()

    for item in load_fakestore_rows():
        title = item["title"].strip()
        slug = unique_slug(title, used_slugs)
        rows.append(
            {
                "name": title[:255],
                "slug": slug,
                "description": (item.get("description") or "").strip() or None,
                "price": Decimal(str(item["price"])),
                "category": item["category"].strip().lower(),
                "stock_quantity": max(5, int(item.get("rating", {}).get("count", 50) // 10)),
                "primary_image_url": item.get("image"),
                "extra_placeholder_image": True,
            }
        )

    categories_cycle = list(
        dict.fromkeys(
            [r["category"] for r in rows]
            + [c.lower() for c in EXTRA_CATEGORIES]
        )
    )
    synth_i = 0
    cat_i = 0

    while len(rows) < target:
        category = categories_cycle[cat_i % len(categories_cycle)]
        cat_i += 1
        names = SYNTH_NAMES.get(category, SYNTH_NAMES["books"])
        base_name = names[synth_i % len(names)]
        synth_i += 1
        edition = (len(rows) // len(names)) + 1
        name = f"{base_name} — Edition {edition}" if edition > 1 else base_name
        slug = unique_slug(name, used_slugs)
        price = Decimal(str(round(9.99 + (len(rows) * 3.17) % 290, 2)))
        rows.append(
            {
                "name": name[:255],
                "slug": slug,
                "description": (
                    f"Seeded catalog item in {category}. "
                    "High-quality everyday product with dependable materials and thoughtful design."
                ),
                "price": price,
                "category": category,
                "stock_quantity": 20 + (len(rows) % 80),
                "primary_image_url": None,
                "extra_placeholder_image": len(rows) % 3 == 0,
            }
        )

    return rows[:target]


def upsert_catalog(session: Session, rows: list[dict], *, reset: bool) -> None:
    if reset:
        session.execute(delete(ProductImage))
        session.execute(delete(Product))
        session.execute(delete(Category))
        session.commit()

    existing_products = session.scalar(select(func.count()).select_from(Product)) or 0
    if existing_products >= len(rows) and not reset:
        print(f"Catalog already has {existing_products} products; use --reset to replace.")
        return

    category_names = list(dict.fromkeys(r["category"] for r in rows))
    slug_by_cat: dict[str, str] = {}
    for name in category_names:
        slug_by_cat[name] = slugify(name)

    existing_cats = {
        c.slug: c for c in session.scalars(select(Category)).all()
    }
    cat_id_by_name: dict[str, int] = {}

    for name in category_names:
        slug = slug_by_cat[name]
        if slug in existing_cats:
            cat_id_by_name[name] = existing_cats[slug].id
            continue
        cat = Category(name=name.title(), slug=slug)
        session.add(cat)
        session.flush()
        cat_id_by_name[name] = cat.id

    for row in rows:
        product = Product(
            category_id=cat_id_by_name[row["category"]],
            name=row["name"],
            slug=row["slug"],
            description=row["description"],
            price=row["price"],
            stock_quantity=row["stock_quantity"],
            is_active=True,
        )
        session.add(product)
        session.flush()

        keys = [
            image_object_key(
                external_url=row.get("primary_image_url"),
                slug=row["slug"],
                position=0,
            )
        ]
        if row.get("extra_placeholder_image"):
            keys.append(
                image_object_key(
                    external_url=None,
                    slug=row["slug"],
                    position=1,
                )
            )

        for position, key in enumerate(keys):
            session.add(
                ProductImage(
                    product_id=product.id,
                    object_key=key,
                    position=position,
                )
            )

    session.commit()
    cats = session.scalar(select(func.count()).select_from(Category))
    prods = session.scalar(select(func.count()).select_from(Product))
    imgs = session.scalar(select(func.count()).select_from(ProductImage))
    print(f"Seeded {cats} categories, {prods} products, {imgs} images.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed product catalog")
    parser.add_argument(
        "-n",
        "--count",
        type=int,
        default=DEFAULT_COUNT,
        help=f"Number of products to seed (default {DEFAULT_COUNT})",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing catalog rows before seeding",
    )
    args = parser.parse_args()

    if args.count < 1:
        raise SystemExit("count must be at least 1")

    rows = build_product_rows(args.count)
    with SessionLocal() as session:
        upsert_catalog(session, rows, reset=args.reset)


if __name__ == "__main__":
    main()