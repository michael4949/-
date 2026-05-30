"""Tool, ToolRegistry, ToolContext — the plumbing for agent actions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable, Optional

from ..types import Message, ToolResult

if TYPE_CHECKING:  # avoid import cycles at runtime
    from ..config import MnemoConfig
    from ..memory.manager import MemoryManager
    from ..skills.manager import SkillManager


@dataclass
class ToolContext:
    """Everything a tool might need: config + the memory/skill subsystems +
    a handle on the live session so tools (e.g. session_search) work in context."""

    config: "MnemoConfig"
    memory: "MemoryManager"
    skills: "SkillManager"
    session_id: Optional[str] = None
    transcript: list[Message] = field(default_factory=list)
    workdir: str = "."


# A handler takes (arguments, context) and returns a string or ToolResult.
Handler = Callable[[dict[str, Any], ToolContext], Any]


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]   # JSON schema for the arguments
    handler: Handler
    dangerous: bool = False      # surfaced to permission/guard layers

    def schema(self) -> dict[str, Any]:
        return {"name": self.name, "description": self.description, "parameters": self.parameters}

    def run(self, arguments: dict[str, Any], context: ToolContext) -> ToolResult:
        try:
            out = self.handler(arguments or {}, context)
        except Exception as exc:  # tools never crash the loop
            return ToolResult(tool_call_id="", content=f"ERROR running {self.name}: {exc}", is_error=True)
        if isinstance(out, ToolResult):
            return out
        return ToolResult(tool_call_id="", content="" if out is None else str(out))


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def add(self, name: str, description: str, parameters: dict, handler: Handler, *, dangerous: bool = False) -> None:
        self.register(Tool(name=name, description=description, parameters=parameters, handler=handler, dangerous=dangerous))

    def get(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def __contains__(self, name: str) -> bool:
        return name in self._tools

    def names(self) -> list[str]:
        return sorted(self._tools)

    def schemas(self) -> list[dict[str, Any]]:
        return [t.schema() for t in self._tools.values()]

    def execute(self, name: str, arguments: dict[str, Any], context: ToolContext) -> ToolResult:
        tool = self.get(name)
        if tool is None:
            return ToolResult(tool_call_id="", content=f"ERROR: unknown tool '{name}'", is_error=True)
        return tool.run(arguments, context)
