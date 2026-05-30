"""The tool system: registry + built-ins + skill/memory tools.

Tools are how the agent acts. The interesting ones for a learning agent are the
*skill* tools (so it can read and write its own procedural memory) and the
*memory* tools (so it can remember and recall across sessions).
"""

from .base import Tool, ToolContext, ToolRegistry
from .builtin import register_builtins
from .memory_tools import register_memory_tools
from .skill_tools import register_skill_tools


def default_registry(context: ToolContext) -> ToolRegistry:
    """Assemble the standard tool belt."""
    reg = ToolRegistry()
    register_builtins(reg)
    register_skill_tools(reg)
    register_memory_tools(reg)
    return reg


__all__ = [
    "Tool", "ToolContext", "ToolRegistry", "default_registry",
    "register_builtins", "register_skill_tools", "register_memory_tools",
]
