"""Fractional sort keys — API exposes integer sort_order only."""

from __future__ import annotations

from fractional_indexing import generate_key_between, generate_n_keys_between
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Announcement


def ordered_rows(db: Session, *, exclude_id: int | None = None) -> list[Announcement]:
    stmt = select(Announcement).order_by(Announcement.sort_key, Announcement.id)
    rows = list(db.scalars(stmt).all())
    if exclude_id is not None:
        rows = [row for row in rows if row.id != exclude_id]
    return rows


def sort_key_for_position(db: Session, position: int, *, exclude_id: int | None = None) -> str:
    rows = ordered_rows(db, exclude_id=exclude_id)
    position = max(0, min(position, len(rows)))

    if not rows:
        return generate_key_between(None, None)

    if position == 0:
        return generate_key_between(None, rows[0].sort_key)

    if position >= len(rows):
        return generate_key_between(rows[-1].sort_key, None)

    return generate_key_between(rows[position - 1].sort_key, rows[position].sort_key)


def initial_keys_for_count(count: int) -> list[str]:
    if count <= 0:
        return []
    return generate_n_keys_between(None, None, count)