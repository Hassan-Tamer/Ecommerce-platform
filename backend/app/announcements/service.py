from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models import Announcement

from .schemas import AnnouncementCreate, AnnouncementOut, AnnouncementUpdate
from .sort_keys import ordered_rows, sort_key_for_position


def _validate_window(
    *,
    starts_at: datetime | None,
    ends_at: datetime | None,
) -> None:
    if starts_at is not None and ends_at is not None and starts_at > ends_at:
        raise HTTPException(status_code=400, detail="starts_at must be <= ends_at")


def _ordered(stmt):
    return stmt.order_by(Announcement.sort_key, Announcement.id)


def _shop_visible_now(now: datetime):
    return (
        Announcement.active.is_(True),
        or_(Announcement.starts_at.is_(None), Announcement.starts_at <= now),
        or_(Announcement.ends_at.is_(None), Announcement.ends_at >= now),
    )


def _global_sort_index(db: Session) -> dict[int, int]:
    rows = ordered_rows(db)
    return {row.id: index for index, row in enumerate(rows)}


def _to_out(row: Announcement, sort_order: int) -> AnnouncementOut:
    return AnnouncementOut(
        id=row.id,
        title=row.title,
        description=row.description,
        active=row.active,
        starts_at=row.starts_at,
        ends_at=row.ends_at,
        sort_order=sort_order,
        created_at=row.created_at,
    )


def _outs_for_rows(db: Session, rows: list[Announcement]) -> list[AnnouncementOut]:
    index_by_id = _global_sort_index(db)
    return [_to_out(row, index_by_id.get(row.id, 0)) for row in rows]


def _validate_sort_position(db: Session, position: int, *, exclude_id: int | None = None) -> int:
    limit = len(ordered_rows(db, exclude_id=exclude_id))
    if position < 0 or position > limit:
        raise HTTPException(
            status_code=400,
            detail=f"sort_order must be between 0 and {limit}",
        )
    return position


def list_for_shop(db: Session) -> list[AnnouncementOut]:
    now = datetime.now(timezone.utc)
    stmt = _ordered(select(Announcement).where(*_shop_visible_now(now)))
    rows = db.scalars(stmt).all()
    return [_to_out(row, index) for index, row in enumerate(rows)]


def list_for_admin(db: Session, *, active: bool | None = None) -> list[AnnouncementOut]:
    stmt = select(Announcement)
    if active is not None:
        stmt = stmt.where(Announcement.active.is_(active))
    rows = db.scalars(_ordered(stmt)).all()
    return _outs_for_rows(db, rows)


def get_announcement(db: Session, announcement_id: int) -> Announcement:
    row = db.get(Announcement, announcement_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return row


def get_announcement_out(db: Session, announcement_id: int) -> AnnouncementOut:
    row = get_announcement(db, announcement_id)
    index_by_id = _global_sort_index(db)
    return _to_out(row, index_by_id[row.id])


def create_announcement(db: Session, data: AnnouncementCreate) -> AnnouncementOut:
    _validate_window(starts_at=data.starts_at, ends_at=data.ends_at)

    position = data.sort_order
    if position is None:
        position = len(ordered_rows(db))
    else:
        position = _validate_sort_position(db, position)

    sort_key = sort_key_for_position(db, position)
    row = Announcement(
        title=data.title,
        description=data.description,
        active=data.active,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        sort_key=sort_key,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    index_by_id = _global_sort_index(db)
    return _to_out(row, index_by_id[row.id])


def update_announcement(
    db: Session,
    announcement_id: int,
    data: AnnouncementUpdate,
) -> AnnouncementOut:
    row = get_announcement(db, announcement_id)
    fields = data.model_dump(exclude_unset=True)
    if not fields:
        index_by_id = _global_sort_index(db)
        return _to_out(row, index_by_id[row.id])

    starts_at = fields.get("starts_at", row.starts_at)
    ends_at = fields.get("ends_at", row.ends_at)
    _validate_window(starts_at=starts_at, ends_at=ends_at)

    if "sort_order" in fields:
        position = _validate_sort_position(db, fields.pop("sort_order"), exclude_id=row.id)
        row.sort_key = sort_key_for_position(db, position, exclude_id=row.id)

    for key, value in fields.items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)
    index_by_id = _global_sort_index(db)
    return _to_out(row, index_by_id[row.id])


def delete_announcement(db: Session, announcement_id: int) -> None:
    row = get_announcement(db, announcement_id)
    db.delete(row)
    db.commit()