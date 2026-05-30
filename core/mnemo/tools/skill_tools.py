"""Skill tools — the agent's window into (and pen for) its procedural memory.

  skills_list   Level-0 catalog (names + descriptions)
  skill_view    Level-1 full SKILL.md, or Level-2 a reference file inside it
  skill_manage  create / patch / edit / delete / write_file / remove_file

skill_manage is what lets the agent deliberately author a skill mid-task — the
explicit counterpart to the automatic post-run evolution loop.
"""

from __future__ import annotations

from ..skills.model import Skill
from ..types import ToolResult
from .base import ToolContext, ToolRegistry


def register_skill_tools(reg: ToolRegistry) -> None:
    def skills_list(args, ctx: ToolContext):
        return ctx.skills.level0()

    def skill_view(args, ctx: ToolContext):
        name = args["name"]
        sub_path = args.get("path")
        try:
            return ctx.skills.view(name, sub_path)
        except Exception as e:
            return ToolResult(tool_call_id="", content=f"ERROR: {e}", is_error=True)

    def skill_manage(args, ctx: ToolContext):
        action = args.get("action")
        name = args.get("name", "")
        try:
            if action == "create":
                skill = Skill(
                    name=name,
                    description=args.get("description", ""),
                    category=args.get("category", "general"),
                    tags=args.get("tags", []) or [],
                    sections=args.get("sections", {}) or {},
                )
                created = ctx.skills.create(skill, overwrite=bool(args.get("overwrite")))
                return f"created skill '{created.name}' (v{created.version}) at {created.path}"
            if action == "patch":
                s = ctx.skills.patch(name, section=args["section"], content=args["content"],
                                     append=bool(args.get("append")))
                return f"patched '{s.name}' section '{args['section']}' → v{s.version}"
            if action == "edit":
                s = ctx.skills.edit(name, description=args.get("description"), category=args.get("category"),
                                    tags=args.get("tags"), sections=args.get("sections"))
                return f"edited '{s.name}' → v{s.version}"
            if action == "write_file":
                path = ctx.skills.write_file(name, args["rel_path"], args["content"])
                return f"wrote skill asset {path}"
            if action == "remove_file":
                ctx.skills.remove_file(name, args["rel_path"])
                return f"removed {name}/{args['rel_path']}"
            if action == "delete":
                ctx.skills.delete(name)
                return f"deleted skill '{name}'"
            return ToolResult(tool_call_id="", content=f"ERROR: unknown action '{action}'", is_error=True)
        except Exception as e:
            return ToolResult(tool_call_id="", content=f"ERROR: {e}", is_error=True)

    reg.add("skills_list", "List available skills (Level-0 catalog: name, category, description).",
            {"type": "object", "properties": {}}, skills_list)
    reg.add("skill_view", "View a full skill (Level-1) or a reference file inside it (Level-2).",
            {"type": "object", "properties": {"name": {"type": "string"}, "path": {"type": "string"}},
             "required": ["name"]}, skill_view)
    reg.add(
        "skill_manage",
        "Create or update a skill (procedural memory). actions: create|patch|edit|write_file|remove_file|delete.",
        {"type": "object", "properties": {
            "action": {"type": "string", "enum": ["create", "patch", "edit", "write_file", "remove_file", "delete"]},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "category": {"type": "string"},
            "tags": {"type": "array", "items": {"type": "string"}},
            "sections": {"type": "object"},
            "section": {"type": "string"},
            "content": {"type": "string"},
            "append": {"type": "boolean"},
            "rel_path": {"type": "string"},
            "overwrite": {"type": "boolean"},
        }, "required": ["action", "name"]},
        skill_manage,
    )
