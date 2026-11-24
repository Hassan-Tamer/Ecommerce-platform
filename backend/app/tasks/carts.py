import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from app.db.models import CartItem
from app.db.session import SessionLocal
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

STALE_CART_DAYS = 7


def purge_stale_carts(*, now: datetime | None = None) -> int:
    """Delete every line of carts whose newest updated_at is older than 7 days."""
    current = now if now is not None else datetime.now(timezone.utc)
    cutoff = current - timedelta(days=STALE_CART_DAYS)
    stale_user_ids = (
        select(CartItem.user_id)
        .group_by(CartItem.user_id)
        .having(func.max(CartItem.updated_at) < cutoff)
    )
    with SessionLocal() as db:
        result = db.execute(delete(CartItem).where(CartItem.user_id.in_(stale_user_ids)))
        db.commit()
        return int(result.rowcount or 0)


@celery_app.task(name="tasks.delete_stale_carts")
def delete_stale_carts() -> int:
    deleted = purge_stale_carts()
    logger.info(
        "Deleted %s cart items from carts last updated more than %s days ago",
        deleted,
        STALE_CART_DAYS,
    )
    return deleted
