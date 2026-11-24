from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from . import service
from .schemas import AnnouncementOut

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db)) -> list[AnnouncementOut]:
    """Shop-visible announcements: active and within starts_at / ends_at when set."""
    return service.list_for_shop(db)