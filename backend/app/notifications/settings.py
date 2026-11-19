from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def _env_bool(name: str, *, default: str = "false") -> bool:
    return os.getenv(name, default).lower() in ("1", "true", "yes")


SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@localhost")
SMTP_USE_TLS = _env_bool("SMTP_USE_TLS")
SMTP_USE_SSL = _env_bool("SMTP_USE_SSL")