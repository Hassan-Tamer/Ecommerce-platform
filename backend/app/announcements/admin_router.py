from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db.deps import get_db
from . import service
from .schemas import AnnouncementCreate, AnnouncementOut, AnnouncementUpdate

router = APIRouter(
    prefix="/admin/announcements",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=list[AnnouncementOut])
def admin_list_announcements(
    db: Session = Depends(get_db),
    active: Annotated[
        bool | None,
        Query(description="Filter by active flag; omit to include all"),
    ] = None,
) -> list[AnnouncementOut]:
    return service.list_for_admin(db, active=active)


@router.get("/{announcement_id}", response_model=AnnouncementOut)
def admin_get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    return service.get_announcement_out(db, announcement_id)


@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def admin_create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    return service.create_announcement(db, data)


@router.patch("/{announcement_id}", response_model=AnnouncementOut)
def admin_update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
) -> AnnouncementOut:
    return service.update_announcement(db, announcement_id, data)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
) -> Response:
    service.delete_announcement(db, announcement_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)