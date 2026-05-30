"""AnthropicProvider — real Claude reasoning with native tool use + prompt caching.

The SDK is imported lazily so the rest of Mnemo runs with zero third-party deps.
Install with ``pip install anthropic`` and provide ``ANTHROPIC_API_KEY`` (or an
``ANTHROPIC_BASE_URL`` gateway) to switch the same agent core onto Claude.
"""

from __future__ import annotations

import os

from ..types import LLMResponse, Message, Role, ToolCall
from .base import LLMProvider


def _to_anthropic_messages(messages: list[Message]) -> list[dict]:
    """Translate our transcript into the Anthropic Messages format."""
    out: list[dict] = []
    for m in messages:
        if m.role == Role.USER:
            out.append({"role": "user", "content": m.content})
        elif m.role == Role.ASSISTANT:
            blocks: list[dict] = []
            if m.content:
                blocks.append({"type": "text", "text": m.content})
            for tc in m.tool_calls:
                blocks.append({"type": "tool_use", "id": tc.id, "name": tc.name, "input": tc.arguments})
            out.append({"role": "assistant", "content": blocks or m.content})
        elif m.role == Role.TOOL:
            out.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "tool_result", "tool_use_id": m.tool_call_id, "content": m.content}
                    ],
                }
            )
    return out


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, model: str = "claude-opus-4-8", max_tokens: int = 4096):
        try:
            import anthropic  # noqa: F401
        except ImportError as exc:  # pragma: no cover - depends on env
            raise RuntimeError(
                "The 'anthropic' package is required for the Claude provider. "
                "Install it with `pip install anthropic`, or use provider='scripted'."
            ) from exc
        from anthropic import Anthropic

        self.model = model
        self.max_tokens = max_tokens
        # Honors ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL from the environment.
        self._client = Anthropic()

    def complete(self, messages: list[Message], *, system: str = "", tools: list[dict] | None = None) -> LLMResponse:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": _to_anthropic_messages(messages),
        }
        if system:
            # Cache the (large, stable) system prompt — skills L0 + frozen memory.
            kwargs["system"] = [
                {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}
            ]
        if tools:
            kwargs["tools"] = [
                {
                    "name": t["name"],
                    "description": t.get("description", ""),
                    "input_schema": t.get("parameters", {"type": "object", "properties": {}}),
                }
                for t in tools
            ]

        resp = self._client.messages.create(**kwargs)

        text_parts: list[str] = []
        tool_calls: list[ToolCall] = []
        for block in resp.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(ToolCall(id=block.id, name=block.name, arguments=dict(block.input)))

        usage = {}
        if getattr(resp, "usage", None):
            usage = {
                "input_tokens": getattr(resp.usage, "input_tokens", 0),
                "output_tokens": getattr(resp.usage, "output_tokens", 0),
            }
        return LLMResponse(text="".join(text_parts), tool_calls=tool_calls, usage=usage, raw=resp)

    def summarize(self, text: str, *, max_chars: int = 600) -> str:
        if len(text.strip()) <= max_chars:
            return text.strip()
        try:  # pragma: no cover - network dependent
            resp = self._client.messages.create(
                model=self.model,
                max_tokens=512,
                system="Summarize the text faithfully and concisely. Output only the summary.",
                messages=[{"role": "user", "content": text}],
            )
            return "".join(b.text for b in resp.content if b.type == "text").strip()
        except Exception:
            return super().summarize(text, max_chars=max_chars)


def has_anthropic_credentials() -> bool:
    """True when a real Claude call is plausible in this environment."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return True
    return False
