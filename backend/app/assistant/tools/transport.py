"""HTTP / ASGI client wiring for OpenAPIToolset."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.tools.openapi_tool import OpenAPIToolset
from google.adk.tools.openapi_tool.openapi_spec_parser.rest_api_tool import (
    HttpxClientFactory,
)

_SPECS_DIR = Path(__file__).resolve().parents[1] / "specs"
_INTERNAL_BASE_URL = "http://internal"

AUTH_HEADER_STATE_KEY = "auth_header"


def _use_asgi_transport() -> bool:
    mode = os.getenv("ASSISTANT_API_TRANSPORT", "asgi").strip().lower()
    return mode != "http"


def _api_base_url() -> str:
    if _use_asgi_transport():
        return _INTERNAL_BASE_URL
    return os.getenv("ASSISTANT_API_BASE_URL", "http://127.0.0.1:3000").rstrip("/")


def _asgi_httpx_factory() -> HttpxClientFactory:
    def factory() -> httpx.AsyncClient:
        from app.main import app

        return httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url=_INTERNAL_BASE_URL,
        )

    return factory


def _load_spec(filename: str) -> dict[str, Any]:
    spec = json.loads((_SPECS_DIR / filename).read_text(encoding="utf-8"))
    spec["servers"] = [{"url": _api_base_url()}]
    return spec


def _request_headers(ctx: ReadonlyContext) -> dict[str, str]:
    auth = ctx.state.get(AUTH_HEADER_STATE_KEY)
    if not auth:
        return {}
    return {"Authorization": str(auth)}


@lru_cache
def openapi_toolset(spec_file: str, tool_names: tuple[str, ...]) -> OpenAPIToolset:
    kwargs: dict[str, Any] = {
        "spec_dict": _load_spec(spec_file),
        "tool_filter": list(tool_names),
        "header_provider": _request_headers,
    }
    if _use_asgi_transport():
        kwargs["httpx_client_factory"] = _asgi_httpx_factory()
    return OpenAPIToolset(**kwargs)