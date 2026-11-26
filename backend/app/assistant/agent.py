import os

import app.env  # noqa: F401
from google.adk import Agent
from google.adk.models.lite_llm import LiteLlm

from .prompts import SHOP_ASSISTANT_INSTRUCTION

ASSISTANT_APP_NAME = "ecommerce-shop-assistant"
ASSISTANT_MODEL = os.getenv("ASSISTANT_MODEL", "groq/qwen/qwen3.8-27b").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
if GROQ_API_KEY:
    os.environ["GROQ_API_KEY"] = GROQ_API_KEY


qwen3_32b_groq = LiteLlm(
    model=ASSISTANT_MODEL,
    api_key=GROQ_API_KEY,
    extra_body={"reasoning_effort": "none"},
)

root_agent = Agent(
    name="shop_assistant",
    model=qwen3_32b_groq,
    description="A conversational shop assistant for the storefront.",
    instruction=SHOP_ASSISTANT_INSTRUCTION,
)