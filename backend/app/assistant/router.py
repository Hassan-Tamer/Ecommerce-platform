from fastapi import APIRouter, Depends, Request, Response

from app.auth.dependencies import get_current_user
from app.db.models import User
from app.ratelimit import limiter

from . import service
from .schemas import AssistantMessageIn, AssistantMessageOut

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/messages", response_model=AssistantMessageOut)
@limiter.limit("30/minute")
async def post_assistant_message(
    request: Request,
    response: Response,
    body: AssistantMessageIn,
    current_user: User = Depends(get_current_user),
) -> AssistantMessageOut:
    reply = await service.reply_for_user(current_user, body.message)
    return AssistantMessageOut(reply=reply)