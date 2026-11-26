"""Assistant HTTP payloads and the agent's structured output."""

from __future__ import annotations

import json
import logging
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

logger = logging.getLogger(__name__)

ActionType = Literal[
    "navigate",
    "view_product",
    "add_to_cart",
    "remove_from_cart",
    "add_to_wishlist",
    "remove_from_wishlist",
]
ShopPage = Literal["orders", "wishlist", "shop", "profile"]
_CONFIRM = {
    "add_to_cart",
    "remove_from_cart",
    "add_to_wishlist",
    "remove_from_wishlist",
}
_MAX_ACTIONS = 9
_SLUG = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,120}")


class AssistantMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class AssistantAction(BaseModel):
    """One UI action. Unused fields are empty string or 0 so the schema stays strict."""

    model_config = ConfigDict(extra="ignore")

    type: ActionType = Field(
        description=(
            "navigate opens orders, wishlist, shop, or profile. "
            "view_product opens one product. "
            "add_to_cart, remove_from_cart, add_to_wishlist, and remove_from_wishlist are buttons."
        )
    )
    label: str = Field(description="Short button text, such as 'Add to wishlist' or 'View product'.")
    page: Literal["orders", "wishlist", "shop", "profile", ""] = Field(
        default="",
        description="Page for navigate: orders, wishlist, shop, or profile. Empty otherwise.",
    )
    slug: str = Field(
        default="",
        description="Product slug for view_product, from tool data. Empty otherwise.",
    )
    product_id: int = Field(
        default=0,
        description="Catalog product id for product buttons, including view_product. 0 for navigate.",
    )
    quantity: int = Field(
        default=0,
        description="Units to add for add_to_cart. 0 otherwise.",
    )

    @model_validator(mode="before")
    @classmethod
    def _coerce_empty(cls, data):
        if not isinstance(data, dict):
            return data
        data = dict(data)
        if data.get("page") is None:
            data["page"] = ""
        if data.get("slug") is None:
            data["slug"] = ""
        if data.get("product_id") in (None, ""):
            data["product_id"] = 0
        if data.get("quantity") in (None, ""):
            data["quantity"] = 0
        if isinstance(data.get("label"), str):
            data["label"] = " ".join(data["label"].split())
        return data

    @model_validator(mode="after")
    def _normalize(self):
        if not self.label:
            raise ValueError("label is required")
        self.label = self.label[:80]
        if self.type == "navigate":
            if self.page not in {"orders", "wishlist", "shop", "profile"}:
                raise ValueError("navigate requires a page")
            self.slug = ""
            self.product_id = 0
            self.quantity = 0
            return self
        if self.type == "view_product":
            slug = self.slug.strip().strip("/")
            if _SLUG.fullmatch(slug) is None or self.product_id < 1:
                raise ValueError("view_product requires a slug and product_id")
            self.slug = slug
            self.page = ""
            self.quantity = 0
            return self
        if self.type not in _CONFIRM or self.product_id < 1:
            raise ValueError("cart and wishlist actions require product_id")
        self.page = ""
        self.slug = ""
        if self.type == "add_to_cart":
            self.quantity = min(self.quantity, 99) if self.quantity >= 1 else 1
        else:
            self.quantity = 0
        return self


class AssistantOutput(BaseModel):
    """Fixed agent output: shopper-facing markdown plus optional actions."""

    model_config = ConfigDict(extra="ignore")

    reply: str = Field(
        description=(
            "Markdown shown in the chat. One short sentence. "
            "No images, no links, and no /products/ paths. "
            "The app draws the product photo from the buttons. "
            "Do not claim a cart or wishlist change already happened."
        )
    )
    actions: list[AssistantAction] = Field(
        default_factory=list,
        description=(
            "Empty when nothing should happen. navigate is performed by the app. "
            "Cart and wishlist types are confirm buttons."
        ),
    )


AssistantMessageOut = AssistantOutput


def _load_json_object(text: str) -> dict | None:
    raw = text.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fenced:
        raw = fenced.group(1).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            data = json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


def parse_assistant_output(text: str) -> AssistantOutput:
    """Accept schema JSON, or plain text when the model skips the schema."""
    payload = _load_json_object(text)
    if payload is None:
        visible = text.strip()
        if not visible:
            raise ValueError("empty assistant output")
        return AssistantOutput(reply=visible)

    reply = payload.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        visible = text.strip()
        if not visible or visible.startswith("{") or visible.startswith("```"):
            raise ValueError("assistant output missing reply")
        return AssistantOutput(reply=visible)

    actions: list[AssistantAction] = []
    raw_actions = payload.get("actions") or []
    if isinstance(raw_actions, list):
        for item in raw_actions:
            if len(actions) >= _MAX_ACTIONS:
                break
            if not isinstance(item, dict):
                continue
            try:
                actions.append(AssistantAction.model_validate(item))
            except ValidationError:
                logger.debug("Skipping invalid assistant action", exc_info=True)
    return AssistantOutput(reply=reply.strip(), actions=actions)
