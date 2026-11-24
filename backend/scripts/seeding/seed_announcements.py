#!/usr/bin/env python3
"""Seed shop announcements (10 rows by default)."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.announcements.sort_keys import initial_keys_for_count
from app.db.models import Announcement
from app.db.session import SessionLocal

ANNOUNCEMENT_ROWS: list[dict] = [
    {
        "title": "Ships in two days",
        "description": (
            "In-stock orders leave the warehouse within two business days, "
            "and tracking arrives by email."
        ),
        "active": True,
        "starts_at": None,
        "ends_at": None,
    },
    {
        "title": "Weekend sale",
        "description": (
            "Marked housewares are fifteen percent off from Friday morning "
            "through Sunday night."
        ),
        "active": True,
        "starts_at": None,
        "ends_at": None,
    },
    {
        "title": "New cedar tray",
        "description": "A hand-finished cedar tray is now in the catalog in small and large.",
        "active": True,
        "starts_at": None,
        "ends_at": None,
    },
    {
        "title": "Free shipping over fifty",
        "description": "Domestic orders above fifty dollars ship free through the end of the month.",
        "active": True,
        "starts_at": None,
        "ends_at": None,
    },
    {
        "title": "Holiday hours",
        "description": "The warehouse closes early on public holidays; cutoffs move up by one day.",
        "active": True,
        "starts_at": None,
        "ends_at": None,
    },
    {
        "title": "Loyalty preview",
        "description": "Repeat customers will soon earn points on every order. Watch this space.",
        "active": False,
        "starts_at": None,
        "ends_at": None,
    },
    {
        "title": "Flash fifteen off electronics",
        "description": "Select electronics are fifteen percent off for forty-eight hours only.",
        "active": True,
        "starts_at": datetime.now(timezone.utc) - timedelta(days=1),
        "ends_at": datetime.now(timezone.utc) + timedelta(days=2),
    },
    {
        "title": "Archived spring promo",
        "description": "Past-season linens promotion. Kept for admin desk samples.",
        "active": False,
        "starts_at": datetime.now(timezone.utc) - timedelta(days=120),
        "ends_at": datetime.now(timezone.utc) - timedelta(days=90),
    },
    {
        "title": "Customer support",
        "description": "Live chat is available weekdays nine to five in your local time zone.",
        "active": True,
        "starts_at": None,
        "ends_at": None,
    },
    {
        "title": "Sustainable packaging",
        "description": "Orders now ship in recyclable mailers made from post-consumer paper.",
        "active": True,
        "starts_at": None,
        "ends_at": None,
    },
]


def seed_announcements(session: Session, *, reset: bool) -> None:
    if reset:
        session.execute(delete(Announcement))
        session.flush()

    existing = session.scalar(select(func.count()).select_from(Announcement)) or 0
    if existing > 0 and not reset:
        print(f"Announcements table already has {existing} rows. Use --reset to replace.")
        return

    keys = initial_keys_for_count(len(ANNOUNCEMENT_ROWS))
    for row, sort_key in zip(ANNOUNCEMENT_ROWS, keys):
        session.add(Announcement(**row, sort_key=sort_key))

    session.commit()
    count = session.scalar(select(func.count()).select_from(Announcement))
    print(f"Seeded {count} announcements.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed shop announcements")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing announcements before seeding",
    )
    args = parser.parse_args()

    with SessionLocal() as session:
        seed_announcements(session, reset=args.reset)


if __name__ == "__main__":
    main()