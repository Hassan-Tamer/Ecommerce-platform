#!/usr/bin/env python3
"""Seed product reviews across the catalog (deterministic demo data)."""

from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.auth.service import hash_password
from app.db.models import Product, Review, User
from app.db.session import SessionLocal
from app.enums import UserRole

SEED_USER_PREFIX = "seed-reviewer-"
SEED_USER_DOMAIN = "reviews.example.local"
SEED_USER_PASSWORD = "seed-reviewer-pass"

AUTHORS = [
    "Maya Chen",
    "Omar Ali",
    "Lina Park",
    "Noah Kim",
    "Priya Shah",
    "Jonah Ellis",
    "Sofia Marin",
    "Helen Okonkwo",
    "Chris Adeyemi",
    "Amira Hassan",
    "Elena Voronova",
    "James Okoro",
    "Rui Tanaka",
    "Fatima Alami",
    "Leo Martinez",
    "Hannah Weiss",
    "Daniel Osei",
    "Yuki Sato",
    "Nina Bergstrom",
    "Marcus Flynn",
    "Alice Nguyen",
    "Tom Bradley",
    "Sara Colletti",
    "Kevin Lund",
    "Isabelle Moreau",
    "Ryan O'Brien",
    "Chloe Simmons",
    "Victor Popescu",
    "Mei Lin",
    "Sam Okada",
]

TITLES = [
    "Solid pick",
    "Worth it",
    "Pretty good",
    "Nice surprise",
    "Everyday favorite",
    None,
    None,
]

BODIES = [
    "Exactly what I wanted. The quality is better than I expected.",
    "Arrived quickly and looks just like the photos.",
    "Good for the price. I would buy this again.",
    "Nice finish, though the color is a little different in person.",
    "I use it often. Comfortable and well made.",
    "A solid everyday pick. Nothing flashy, just reliable.",
    "Gifted this and it went over well.",
    "Packaging was simple, and the product itself is great.",
    "Took a day to decide, and I am glad I kept it.",
    "Does what it should. I have already recommended it.",
]

RATINGS = [5, 5, 4, 4, 4, 5, 3, 4, 5, 4]


def ensure_seed_users(session: Session, *, count: int) -> list[User]:
    users: list[User] = []
    for index in range(1, count + 1):
        email = f"{SEED_USER_PREFIX}{index}@{SEED_USER_DOMAIN}"
        existing = session.scalar(select(User).where(User.email == email))
        if existing is not None:
            users.append(existing)
            continue
        name = AUTHORS[(index - 1) % len(AUTHORS)]
        user = User(
            name=name,
            email=email,
            password=hash_password(SEED_USER_PASSWORD),
            role=UserRole.CUSTOMER.value,
        )
        session.add(user)
        users.append(user)
    session.flush()
    return users


def seed_reviews(
    session: Session,
    *,
    reset: bool,
    min_per_product: int,
    max_per_product: int,
    reviewer_count: int,
) -> None:
    if reset:
        session.execute(delete(Review))
        session.flush()

    existing = session.scalar(select(func.count()).select_from(Review)) or 0
    if existing > 0 and not reset:
        print(f"Reviews table already has {existing} rows. Use --reset to replace.")
        return

    products = session.scalars(
        select(Product).where(Product.is_active.is_(True)).order_by(Product.id)
    ).all()
    if not products:
        print("No products found. Run seed_catalog.py first.")
        return

    users = ensure_seed_users(session, count=reviewer_count)
    now = datetime.now(timezone.utc)
    created = 0

    for product in products:
        rng = random.Random(product.id)
        review_count = rng.randint(min_per_product, max_per_product)
        if review_count > len(users):
            review_count = len(users)
        picked = rng.sample(users, review_count)

        for user in picked:
            days_ago = rng.randint(2, 365)
            created_at = now - timedelta(days=days_ago, hours=rng.randint(0, 12))
            rating = rng.choice(RATINGS)
            title = rng.choice(TITLES)
            body = rng.choice(BODIES)
            if rng.random() < 0.12:
                body = None
            if title is None and rng.random() < 0.3:
                title = None

            session.add(
                Review(
                    user_id=user.id,
                    product_id=product.id,
                    rating=rating,
                    title=title,
                    body=body,
                    created_at=created_at,
                    updated_at=created_at,
                )
            )
            created += 1

    session.commit()
    total = session.scalar(select(func.count()).select_from(Review))
    print(
        f"Seeded {created} reviews across {len(products)} products "
        f"({total} rows in reviews table)."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed product reviews")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing reviews before seeding",
    )
    parser.add_argument(
        "--min-per-product",
        type=int,
        default=3,
        help="Minimum reviews per product (default 3)",
    )
    parser.add_argument(
        "--max-per-product",
        type=int,
        default=8,
        help="Maximum reviews per product (default 8)",
    )
    parser.add_argument(
        "--reviewers",
        type=int,
        default=30,
        help="Number of seed reviewer accounts (default 30)",
    )
    args = parser.parse_args()

    if args.min_per_product < 1 or args.max_per_product < args.min_per_product:
        raise SystemExit("Invalid review count range")

    with SessionLocal() as session:
        seed_reviews(
            session,
            reset=args.reset,
            min_per_product=args.min_per_product,
            max_per_product=args.max_per_product,
            reviewer_count=args.reviewers,
        )


if __name__ == "__main__":
    main()