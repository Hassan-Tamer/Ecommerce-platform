from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import HTTPException
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.db.models import User

from .agent import ASSISTANT_APP_NAME, root_agent
from .schemas import AssistantMessageOut
from .tools import AUTH_HEADER_STATE_KEY

logger = logging.getLogger(__name__)

_sessions_ready: set[str] = set()


@lru_cache
def _runtime() -> tuple[Runner, InMemorySessionService]:
    session_service = InMemorySessionService()
    runner = Runner(
        agent=root_agent,
        app_name=ASSISTANT_APP_NAME,
        session_service=session_service,
    )
    return runner, session_service


async def _ensure_session(
    session_service: InMemorySessionService,
    *,
    user_id: str,
    session_id: str,
) -> None:
    key = f"{user_id}:{session_id}"
    if key in _sessions_ready:
        return
    try:
        await session_service.create_session(
            app_name=ASSISTANT_APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
    except Exception:
        logger.debug("Session may already exist for %s", key, exc_info=True)
    _sessions_ready.add(key)


def _text_from_event(event) -> str | None:
    if not event.is_final_response() or not event.content or not event.content.parts:
        return None
    for part in event.content.parts:
        if getattr(part, "text", None):
            return part.text.strip()
    return None


async def reply_for_user(
    user: User,
    message: str,
    *,
    authorization: str | None = None,
) -> AssistantMessageOut:
    text = message.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Message cannot be empty")

    runner, session_service = _runtime()
    user_id = str(user.id)
    session_id = f"shop-{user.id}"

    await _ensure_session(session_service, user_id=user_id, session_id=session_id)

    content = types.Content(role="user", parts=[types.Part(text=text)])

    state_delta: dict[str, str] | None = None
    if authorization and authorization.strip():
        state_delta = {AUTH_HEADER_STATE_KEY: authorization.strip()}

    try:
        reply: str | None = None
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content,
            state_delta=state_delta,
        ):
            maybe = _text_from_event(event)
            if maybe:
                reply = maybe
    except Exception as exc:
        logger.exception("Assistant request failed for user %s", user.id)
        raise HTTPException(status_code=502, detail="Assistant failed to respond") from exc

    if not reply:
        raise HTTPException(status_code=502, detail="Assistant returned an empty reply")

    return AssistantMessageOut(reply=reply)