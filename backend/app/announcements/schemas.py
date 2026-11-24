from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    active: bool
    starts_at: datetime | None
    ends_at: datetime | None
    sort_order: int
    created_at: datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    sort_order: int | None = Field(
        default=None,
        ge=0,
        description="Display index; omit to append at the end",
    )


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    sort_order: int | None = Field(default=None, ge=0)