from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db.deps import get_db

from . import service
from .schemas import AdminOrderListOut, AdminSummaryOut

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/summary", response_model=AdminSummaryOut)
def admin_summary(db: Session = Depends(get_db)) -> AdminSummaryOut:
    return service.admin_summary(db)


@router.get("/orders", response_model=AdminOrderListOut)
def admin_list_orders(
    db: Session = Depends(get_db),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> AdminOrderListOut:
    return service.list_admin_orders(db, limit=limit)