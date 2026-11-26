import os

import app.env  # noqa: F401
from google.adk import Agent
from google.adk.models.lite_llm import LiteLlm

from ..tools import shop_toolsets
from .prompts import SHOP_ASSISTANT_INSTRUCTION

ASSISTANT_APP_NAME = "ecommerce-shop-assistant"
ASSISTANT_MODEL = os.getenv("ASSISTANT_MODEL", "groq/qwen/qwen3.8-27b").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
if GROQ_API_KEY:
    os.environ["GROQ_API_KEY"] = GROQ_API_KEY

_llm = LiteLlm(
    model=ASSISTANT_MODEL,
    api_key=GROQ_API_KEY,
    extra_body={"reasoning_effort": "none"},
)

root_agent = Agent(
    name="shop_assistant",
    model=_llm,
    description="A conversational shop assistant for the storefront.",
    instruction=SHOP_ASSISTANT_INSTRUCTION,
    tools=shop_toolsets(),
)