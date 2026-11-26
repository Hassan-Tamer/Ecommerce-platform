#!/usr/bin/env python3
"""Smoke-test GROQ_API_KEY against Groq's Qwen model (same setup as shop assistant)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))
import app.env  # noqa: E402

MODEL = os.getenv("ASSISTANT_MODEL", "groq/qwen/qwen3.8-27b").strip()


def _normalize_key(raw: str) -> str:
    key = raw.strip().strip('"').strip("'")
    return key


def main() -> int:
    key = _normalize_key(os.getenv("GROQ_API_KEY", ""))
    if not key:
        print("FAIL: GROQ_API_KEY is missing in backend/.env", file=sys.stderr)
        return 1

    if not MODEL.startswith("groq/"):
        print(
            f"FAIL: ASSISTANT_MODEL must use groq/ prefix for Groq (got {MODEL!r})",
            file=sys.stderr,
        )
        return 1

    print(f"Key loaded: yes (gsk_…, {len(key)} chars)")
    print(f"Model: {MODEL}")

    try:
        import litellm
    except ImportError:
        print("FAIL: install litellm (pip install -r requirements.txt)", file=sys.stderr)
        return 1

    try:
        response = litellm.completion(
            model=MODEL,
            api_key=key,
            messages=[{"role": "user", "content": "Reply with exactly: ok"}],
            max_tokens=16,
            extra_body={"reasoning_effort": "none"},
        )
    except Exception as exc:
        print("FAIL: Groq / Qwen request failed")
        print(str(exc))
        return 1

    text = (response.choices[0].message.content or "").strip()
    print("OK: Groq accepted the key")
    print("Model reply:", text[:200] or "(empty)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())