import os
from functools import lru_cache
from pathlib import Path

import redis
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")


@lru_cache
def get_redis() -> redis.Redis:
    return redis.from_url(
        REDIS_URL,
        decode_responses=True,
        protocol=2,  # RESP2 — older redis-server has no HELLO (RESP3)
    )