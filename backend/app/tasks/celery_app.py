import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import app.tasks.redis_compat  # noqa: F401
from celery import Celery
from celery.schedules import crontab

from app.cache.redis_client import REDIS_URL


def _redis_db(url: str, db: int) -> str:
    parts = urlsplit(url)
    return urlunsplit(parts._replace(path=f"/{db}"))


def broker_url() -> str:
    explicit = os.getenv("CELERY_BROKER_URL")
    if explicit:
        return explicit
    return _redis_db(REDIS_URL, 1)


def result_backend() -> str:
    explicit = os.getenv("CELERY_RESULT_BACKEND")
    if not explicit:
        raise RuntimeError("Set CELERY_RESULT_BACKEND (e.g. redis://127.0.0.1:6379/2)")
    return explicit


def schedule_timezone() -> str:
    configured = os.getenv("CELERY_TIMEZONE")
    if configured:
        return configured
    if os.environ.get("TZ"):
        return os.environ["TZ"]
    tz_file = Path("/etc/timezone")
    if tz_file.is_file():
        name = tz_file.read_text(encoding="utf-8").strip()
        if name:
            return name
    return "UTC"


celery_app = Celery("ecommerce")
celery_app.conf.update(
    broker_url=broker_url(),
    result_backend=result_backend(),
    task_ignore_result=False,
    timezone=schedule_timezone(),
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "delete-stale-carts": {
            "task": "tasks.delete_stale_carts",
            "schedule": crontab(hour=1, minute=30),
        },
    },
)

import app.tasks.carts  # noqa: E402,F401
