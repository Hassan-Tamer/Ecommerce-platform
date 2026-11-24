from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(None, max_length=100)
    body: str | None = None


class ReviewOut(BaseModel):
    id: int
    author: str
    rating: int
    title: str | None
    body: str | None
    created_at: datetime


class ReviewListPage(BaseModel):
    average: float
    count: int
    items: list[ReviewOut]
    next_cursor: str | None = None