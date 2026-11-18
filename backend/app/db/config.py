import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Set DATABASE_URL (e.g. postgresql+psycopg://user:pass@localhost:5432/ecommerce)")
    return url