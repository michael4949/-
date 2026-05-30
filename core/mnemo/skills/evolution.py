"""SkillEvolver — turn lived experience into a reusable SKILL.md.

This is the closed learning loop that differentiates a Hermes-class agent. After
a run, the evolver decides whether the task was *skill-worthy* and, if so,
synthesizes (or patches) a skill from the transcript.

Trigger conditions (mirroring Hermes):
  1. a complex task — >= N successful tool calls (default 5)
  2. a recovery — a tool errored, then a later step succeeded
  3. a correction — the user pushed back and the agent adjusted

The synthesis here is deterministic and offline (no LLM needed) so the loop
always works in the sandbox; an optional LLM pass can refine the prose.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from ..types import Message, Role
from .manager import SkillManager, slugify
from .model import Skill

_STOP = {
    "the", "a", "an", "to", "of", "and", "or", "for", "in", "on", "with", "please",
    "can", "you", "i", "me", "my", "it", "this", "that", "then", "create", "make",
    "了", "的", "一个", "请", "帮我", "我", "你", "把", "和", "并",
}
_CORRECTION = ("no,", "not ", "actually", "instead", "wrong", "不对", "不是", "错了", "应该", "重来")
_ERROR_MARKERS = ("error", "failed", "exception", "traceback", "not found", "denied", "报错", "失败")

# Map a tool name to a coarse skill category.
_CATEGORY = {
    "write_file": "filesystem", "read_file": "filesystem", "list_dir": "filesystem",
    "run_shell": "automation", "grep": "research", "session_search": "research",
    "recall": "memory", "remember": "memory",
}


@dataclass
class EvolutionResult:
    action: str               # "created" | "updated" | "skipped"
    reason: str
    skill_name: Optional[str] = None
    skill: Optional[Skill] = None


class SkillEvolver:
    def __init__(self, manager: SkillManager, *, toolcall_threshold: int = 5):
        self.manager = manager
        self.threshold = toolcall_threshold

    # ----- trigger ------------------------------------------------------
    def assess(self, transcript: list[Message]) -> tuple[bool, str]:
        tool_results = [m for m in transcript if m.role == Role.TOOL]
        n_calls = len(tool_results)
        errored = any(_looks_error(m.content) for m in tool_results)
        succeeded_after_error = errored and tool_results and not _looks_error(tool_results[-1].content)
        corrected = _has_correction(transcript)

        if n_calls >= self.threshold:
            return True, f"complex task: {n_calls} tool calls (>= {self.threshold})"
        if succeeded_after_error:
            return True, "recovered from an error into a working path"
        if corrected and n_calls >= 2:
            return True, "user corrected the approach; capturing the right way"
        return False, f"not skill-worthy ({n_calls} tool calls, no recovery/correction)"

    # ----- synthesis ----------------------------------------------------
    def propose(self, transcript: list[Message]) -> Optional[Skill]:
        goal = _first_user_goal(transcript)
        if not goal:
            return None
        steps = _tool_steps(transcript)
        if not steps:
            return None

        name = _derive_name(goal, steps)
        used_tools = _unique([s["name"] for s in steps])
        category = _infer_category(used_tools)

        procedure = "\n".join(f"{i + 1}. {s['desc']}" for i, s in enumerate(steps))
        quick = "Tools used, in order: " + " → ".join(used_tools)
        pitfalls = _collect_pitfalls(transcript)
        verification = _derive_verification(transcript)

        sections = {
            "When to Use": f"When the user wants to: {goal}",
            "Quick Reference": quick,
            "Procedure": procedure,
            "Pitfalls": pitfalls or "None observed in this run; watch for tool errors and re-check inputs.",
            "Verification": verification,
        }
        return Skill(
            name=name,
            description=_one_line(goal),
            category=category,
            tags=used_tools,
            sections=sections,
        )

    # ----- apply --------------------------------------------------------
    def evolve(self, transcript: list[Message], *, force: bool = False) -> EvolutionResult:
        worthy, reason = (True, "forced") if force else self.assess(transcript)
        if not worthy:
            return EvolutionResult(action="skipped", reason=reason)
        skill = self.propose(transcript)
        if skill is None:
            return EvolutionResult(action="skipped", reason="could not derive a skill from the transcript")

        if self.manager.exists(skill.name):
            # Reinforce the existing skill: refresh Procedure, accumulate Pitfalls.
            updated = self.manager.edit(
                skill.name,
                sections={"Procedure": skill.sections["Procedure"], "Quick Reference": skill.sections["Quick Reference"]},
            )
            new_pitfalls = skill.sections.get("Pitfalls", "").strip()
            if new_pitfalls and "None observed" not in new_pitfalls:
                updated = self.manager.patch(skill.name, section="Pitfalls", content=new_pitfalls, append=True)
            return EvolutionResult(action="updated", reason=reason, skill_name=updated.name, skill=updated)

        created = self.manager.create(skill)
        return EvolutionResult(action="created", reason=reason, skill_name=created.name, skill=created)


# --------------------------------------------------------------------------
# transcript analysis helpers
# --------------------------------------------------------------------------

def _first_user_goal(transcript: list[Message]) -> str:
    for m in transcript:
        if m.role == Role.USER and m.content.strip():
            return " ".join(m.content.split())
    return ""


def _tool_steps(transcript: list[Message]) -> list[dict]:
    """Pair each assistant tool_call with its result for a readable procedure."""
    results: dict[str, Message] = {}
    for m in transcript:
        if m.role == Role.TOOL and m.tool_call_id:
            results[m.tool_call_id] = m
    steps: list[dict] = []
    for m in transcript:
        if m.role == Role.ASSISTANT and m.tool_calls:
            for tc in m.tool_calls:
                res = results.get(tc.id)
                arg_preview = _preview_args(tc.arguments)
                outcome = ""
                if res is not None:
                    outcome = " — error" if _looks_error(res.content) else ""
                steps.append({
                    "name": tc.name,
                    "desc": f"`{tc.name}({arg_preview})`{outcome}",
                })
    return steps


def _collect_pitfalls(transcript: list[Message]) -> str:
    lines = []
    for m in transcript:
        if m.role == Role.TOOL and _looks_error(m.content):
            snippet = " ".join(m.content.split())[:140]
            lines.append(f"- `{m.name}` failed → {snippet}. Verify inputs/permissions before retrying.")
    return "\n".join(_unique(lines))


def _derive_verification(transcript: list[Message]) -> str:
    for m in reversed(transcript):
        if m.role == Role.ASSISTANT and m.content.strip() and not m.tool_calls:
            return f"Done when: {_one_line(m.content)}"
        if m.role == Role.TOOL and not _looks_error(m.content) and m.content.strip():
            return f"Confirm the final tool output matches the goal (last seen: {_one_line(m.content)[:120]})."
    return "Confirm the user's stated goal is satisfied."


def _has_correction(transcript: list[Message]) -> bool:
    for i, m in enumerate(transcript):
        if m.role == Role.USER and i > 0:
            low = m.content.lower()
            if any(c in low for c in _CORRECTION):
                return True
    return False


def _looks_error(text: str) -> bool:
    low = (text or "").lower()
    return any(k in low for k in _ERROR_MARKERS)


def _derive_name(goal: str, steps: list[dict]) -> str:
    tokens = re.findall(r"[a-z0-9]+|[一-鿿]+", goal.lower())
    keywords = [t for t in tokens if t not in _STOP and len(t) > 1][:4]
    if not keywords:
        keywords = [steps[0]["name"]] if steps else ["task"]
    return slugify("-".join(keywords))


def _infer_category(tools: list[str]) -> str:
    for t in tools:
        if t in _CATEGORY:
            return _CATEGORY[t]
    return "general"


def _preview_args(args: dict) -> str:
    parts = []
    for k, v in list(args.items())[:3]:
        sv = str(v)
        if len(sv) > 32:
            sv = sv[:29] + "…"
        parts.append(f"{k}={sv!r}")
    return ", ".join(parts)


def _one_line(text: str) -> str:
    return " ".join(text.split())[:160]


def _unique(items: list[str]) -> list[str]:
    seen, out = set(), []
    for it in items:
        if it not in seen:
            seen.add(it)
            out.append(it)
    return out
