"""Shared data types for the Mnemo agent core.

Kept deliberately dependency-free (stdlib dataclasses only) so every other
module can import these without pulling in a provider SDK.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


def new_id(prefix: str = "") -> str:
    """Short, sortable-ish unique id."""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def now() -> float:
    return time.time()


class Role(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class ToolCall:
    """A request, made by the model, to invoke a tool."""

    id: str
    name: str
    arguments: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def create(name: str, arguments: dict[str, Any] | None = None) -> "ToolCall":
        return ToolCall(id=new_id("call_"), name=name, arguments=arguments or {})


@dataclass
class ToolResult:
    """The outcome of running a tool."""

    tool_call_id: str
    content: str
    is_error: bool = False


@dataclass
class Message:
    """One turn in the conversation transcript."""

    role: Role
    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    # For role == TOOL, which call this answers and what tool produced it.
    tool_call_id: Optional[str] = None
    name: Optional[str] = None
    created_at: float = field(default_factory=now)

    def short(self, width: int = 120) -> str:
        body = self.content.replace("\n", " ")
        if len(body) > width:
            body = body[: width - 1] + "…"
        if self.tool_calls:
            calls = ", ".join(tc.name for tc in self.tool_calls)
            body = (body + " " if body else "") + f"[tool_calls: {calls}]"
        return f"{self.role.value}: {body}"


@dataclass
class LLMResponse:
    """What a provider returns for one completion step."""

    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    usage: dict[str, int] = field(default_factory=dict)
    raw: Any = None

    @property
    def wants_tools(self) -> bool:
        return bool(self.tool_calls)


class EventType(str, Enum):
    ASSISTANT = "assistant"      # model produced visible text
    TOOL_CALL = "tool_call"      # model asked to call a tool
    TOOL_RESULT = "tool_result"  # a tool returned
    SKILL_LEARNED = "skill"      # the self-evolution loop produced/updated a skill
    MEMORY_WRITE = "memory"      # something was written to durable memory
    COMPACTED = "compacted"      # context window was compressed
    FINAL = "final"              # the run finished
    ERROR = "error"


@dataclass
class AgentEvent:
    """A streamed update from a running agent — consumed by the CLI/console."""

    type: EventType
    text: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=now)

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.type.value,
            "text": self.text,
            "data": self.data,
            "created_at": self.created_at,
        }
