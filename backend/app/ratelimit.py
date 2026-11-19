import os
from pathlib import Path

from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=REDIS_URL,
    storage_options={"protocol": 2},  # RESP2 for redis-server 5.x (no HELLO)
    headers_enabled=True,
)