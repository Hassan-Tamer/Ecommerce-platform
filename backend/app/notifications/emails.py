"""Per-intent email senders (templates + subjects). Add new types here."""

from __future__ import annotations

import logging
from pathlib import Path

from .email_logic import send_email

logger = logging.getLogger(__name__)

_TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


# --- register hello ---


def _render_register_hello(*, name: str) -> str:
    html = (_TEMPLATES_DIR / "register_hello.html").read_text(encoding="utf-8")
    return html.replace("{{ name }}", name)


def send_register_hello(*, to: str, name: str) -> None:
    send_email(
        to=to,
        subject="Hello!",
        body_html=_render_register_hello(name=name),
    )


def send_register_hello_background(*, to: str, name: str) -> None:
    try:
        send_register_hello(to=to, name=name)
    except Exception:
        logger.exception("Register hello email failed for %s", to)