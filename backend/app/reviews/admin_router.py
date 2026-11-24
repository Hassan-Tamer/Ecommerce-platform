from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db.deps import get_db

from . import service

router = APIRouter(
    prefix="/admin/reviews",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_review(
    review_id: int,
    db: Session = Depends(get_db),
) -> Response:
    service.delete_review(db, review_id=review_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)