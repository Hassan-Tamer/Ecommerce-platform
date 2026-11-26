"""Load backend/.env once; overrides stale shell exports (e.g. old GROQ_API_KEY)."""

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)