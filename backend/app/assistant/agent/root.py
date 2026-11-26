import os

import app.env  # noqa: F401
from google.adk import Agent
from google.adk.models._capabilities import LlmCapabilities
from google.adk.models.lite_llm import LiteLlm

from ..schemas import AssistantOutput
from ..tools import shop_toolsets
from .prompts import SHOP_ASSISTANT_INSTRUCTION

ASSISTANT_APP_NAME = "ecommerce-shop-assistant"
ASSISTANT_MODEL = os.getenv("ASSISTANT_MODEL", "groq/qwen/qwen3.8-27b").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
if GROQ_API_KEY:
    os.environ["GROQ_API_KEY"] = GROQ_API_KEY


class _GroqShopLlm(LiteLlm):
    """Groq rejects LiteLLM's json_tool_call workaround for structured output.

    Reporting that tools and a response schema cannot be combined makes ADK
    collect the final answer through the set_model_response tool instead.
    """

    @property
    def capabilities(self) -> LlmCapabilities:
        return LlmCapabilities(output_schema_and_tools=False)


_llm = _GroqShopLlm(
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
    output_schema=AssistantOutput,
)