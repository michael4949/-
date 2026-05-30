"""ScriptedProvider — a deterministic, offline stand-in for a real LLM.

Two modes, combined:

1. **Scripted turns** — you hand it a list of pre-baked steps (final text or
   tool calls). Each ``complete()`` pops the next one. This drives the curated
   ``mnemo demo`` and the test-suite with perfect determinism.

2. **Heuristic fallback** — when the script is exhausted, a small rule engine
   handles a few real intents (remember / recall / search / skills / help) so
   interactive ``mnemo chat`` isn't dead offline.

It is *not* a language model. Real reasoning comes from :class:`AnthropicProvider`.
"""

from __future__ import annotations

import re
from typing import Any, Callable, Union

from ..types import LLMResponse, Message, Role, ToolCall
from .base import LLMProvider

# A scripted turn can be expressed several ways for ergonomics.
Turn = Union[LLMResponse, str, ToolCall, list, dict, Callable[[list[Message]], Any]]


def _coerce(turn: Turn, messages: list[Message]) -> LLMResponse:
    if callable(turn):
        turn = turn(messages)
    if isinstance(turn, LLMResponse):
        return turn
    if isinstance(turn, str):
        return LLMResponse(text=turn)
    if isinstance(turn, ToolCall):
        return LLMResponse(tool_calls=[turn])
    if isinstance(turn, list):
        calls = [t if isinstance(t, ToolCall) else ToolCall.create(t["name"], t.get("arguments", {})) for t in turn]
        return LLMResponse(tool_calls=calls)
    if isinstance(turn, dict):
        if "name" in turn:  # a single tool call spec
            return LLMResponse(tool_calls=[ToolCall.create(turn["name"], turn.get("arguments", {}))])
        return LLMResponse(text=turn.get("text", ""), tool_calls=turn.get("tool_calls", []))
    raise TypeError(f"Cannot coerce scripted turn: {turn!r}")


def _last_user_text(messages: list[Message]) -> str:
    for m in reversed(messages):
        if m.role == Role.USER:
            return m.content
    return ""


def _tools_since_last_user(messages: list[Message]) -> list[str]:
    names: list[str] = []
    for m in reversed(messages):
        if m.role == Role.USER:
            break
        if m.role == Role.TOOL and m.name:
            names.append(m.name)
    return names


_REMEMBER = ("remember", "记住", "记下", "note that", "keep in mind", "别忘了")
_RECALL = ("recall", "回忆", "想起", "之前", "上次", "what did i", "what did we", "do you remember")
_SEARCH = ("search history", "搜索历史", "find in past", "earlier session")
_SKILLS = ("what skills", "list skills", "你的技能", "有哪些技能", "show skills")


def default_heuristic_policy(messages: list[Message], tools: list[dict]) -> LLMResponse:
    """A tiny intent router — enough to be useful offline, honest about limits."""
    user = _last_user_text(messages)
    low = user.lower()
    done = _tools_since_last_user(messages)
    have = {t["name"] for t in tools} if tools else set()

    def can(name: str) -> bool:
        return name in have

    # remember -> write durable memory, then confirm
    if any(k in low for k in _REMEMBER) and can("remember") and "remember" not in done:
        fact = re.sub(r"^(please\s+)?(remember|记住|记下|note that|别忘了)[:：,，\s]*", "", user, flags=re.I).strip()
        return LLMResponse(tool_calls=[ToolCall.create("remember", {"text": fact or user, "scope": "memory"})])

    if any(k in low for k in _RECALL) and can("recall") and "recall" not in done:
        return LLMResponse(tool_calls=[ToolCall.create("recall", {"query": user})])

    if any(k in low for k in _SEARCH) and can("session_search") and "session_search" not in done:
        return LLMResponse(tool_calls=[ToolCall.create("session_search", {"query": user})])

    if any(k in low for k in _SKILLS) and can("skills_list") and "skills_list" not in done:
        return LLMResponse(tool_calls=[ToolCall.create("skills_list", {})])

    # Otherwise: compose a final answer that reflects any tool output we gathered.
    last_tool = next((m for m in reversed(messages) if m.role == Role.TOOL), None)
    if last_tool and last_tool.content.strip():
        return LLMResponse(text=f"{last_tool.content.strip()}")
    if not user:
        return LLMResponse(text="(offline) I'm the scripted brain. Plug in Claude for real reasoning.")
    return LLMResponse(
        text=(
            f"(offline heuristic) I noted: “{user.strip()}”. "
            "I can remember/recall/search history and run tools deterministically; "
            "set provider=anthropic for full reasoning."
        )
    )


class ScriptedProvider(LLMProvider):
    name = "scripted"

    def __init__(self, turns: list[Turn] | None = None, policy: Callable | None = None):
        self.turns: list[Turn] = list(turns or [])
        self.policy = policy or default_heuristic_policy
        self.calls = 0  # introspection for tests

    def push(self, *turns: Turn) -> "ScriptedProvider":
        """Append scripted turns (fluent)."""
        self.turns.extend(turns)
        return self

    def complete(self, messages: list[Message], *, system: str = "", tools: list[dict] | None = None) -> LLMResponse:
        self.calls += 1
        if self.turns:
            return _coerce(self.turns.pop(0), messages)
        return self.policy(messages, tools or [])
