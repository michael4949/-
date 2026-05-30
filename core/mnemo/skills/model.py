"""The Skill data model and SKILL.md (de)serialization.

Format matches the agentskills.io convention Hermes and Claude Code share: YAML
frontmatter + Markdown body with a fixed section order. We parse frontmatter with
a tiny stdlib-only YAML subset (flat scalars + simple lists + one nested level)
so there is no PyYAML dependency.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# Canonical section order (Hermes' SKILL.md anatomy).
SECTION_ORDER = [
    "When to Use",
    "Prerequisites",
    "Quick Reference",
    "Procedure",
    "Pitfalls",
    "Verification",
]


@dataclass
class SkillMeta:
    """Cheap, frontmatter-only view used for Level-0 progressive disclosure."""

    name: str
    description: str = ""
    category: str = "general"
    version: str = "0.1.0"
    tags: list[str] = field(default_factory=list)
    path: str = ""

    def l0_line(self) -> str:
        tag = f" #{','.join(self.tags)}" if self.tags else ""
        return f"- {self.name} [{self.category}]: {self.description}{tag}"


@dataclass
class Skill:
    name: str
    description: str = ""
    category: str = "general"
    version: str = "0.1.0"
    author: str = "mnemo"
    tags: list[str] = field(default_factory=list)
    sections: dict[str, str] = field(default_factory=dict)  # title -> markdown body
    path: str = ""

    # ----- serialization ------------------------------------------------
    def to_markdown(self) -> str:
        fm = ["---", f"name: {self.name}", f"description: {self._esc(self.description)}",
              f"version: {self.version}", f"author: {self.author}", f"category: {self.category}"]
        if self.tags:
            fm.append("tags:")
            fm.extend(f"  - {t}" for t in self.tags)
        fm.append("---")
        body = ["", f"# {self.name}", ""]
        ordered = [s for s in SECTION_ORDER if s in self.sections]
        extra = [s for s in self.sections if s not in SECTION_ORDER]
        for title in ordered + extra:
            body.append(f"## {title}")
            body.append(self.sections[title].strip())
            body.append("")
        return "\n".join(fm + body).rstrip() + "\n"

    def meta(self) -> SkillMeta:
        return SkillMeta(
            name=self.name, description=self.description, category=self.category,
            version=self.version, tags=list(self.tags), path=self.path,
        )

    @staticmethod
    def _esc(s: str) -> str:
        s = " ".join(s.split())
        return s

    # ----- parsing ------------------------------------------------------
    @classmethod
    def from_markdown(cls, text: str, *, path: str = "") -> "Skill":
        fm, body = _split_frontmatter(text)
        meta = _parse_mini_yaml(fm)
        sections = _parse_sections(body)
        name = str(meta.get("name") or _first_heading(body) or "unnamed-skill")
        tags = meta.get("tags") or []
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        return cls(
            name=name,
            description=str(meta.get("description", "")),
            category=str(meta.get("category", "general")),
            version=str(meta.get("version", "0.1.0")),
            author=str(meta.get("author", "mnemo")),
            tags=list(tags),
            sections=sections,
            path=path,
        )

    @classmethod
    def parse_frontmatter_only(cls, text: str, *, path: str = "") -> SkillMeta:
        """Fast path for Level-0: read only the frontmatter, skip the body."""
        fm, _ = _split_frontmatter(text)
        meta = _parse_mini_yaml(fm)
        tags = meta.get("tags") or []
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        return SkillMeta(
            name=str(meta.get("name", "unnamed-skill")),
            description=str(meta.get("description", "")),
            category=str(meta.get("category", "general")),
            version=str(meta.get("version", "0.1.0")),
            tags=list(tags),
            path=path,
        )


# --------------------------------------------------------------------------
# Minimal parsers (stdlib only)
# --------------------------------------------------------------------------

_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)


def _split_frontmatter(text: str) -> tuple[str, str]:
    m = _FM_RE.match(text.lstrip("﻿"))
    if not m:
        return "", text
    return m.group(1), m.group(2)


def _parse_mini_yaml(fm: str) -> dict:
    """Handle ``key: value``, block lists (``  - item``) and inline ``[a, b]``."""
    out: dict = {}
    current_key: str | None = None
    for raw in fm.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if re.match(r"^\s+-\s+", raw) and current_key:  # block list item
            out.setdefault(current_key, [])
            if isinstance(out[current_key], list):
                out[current_key].append(raw.strip()[2:].strip())
            continue
        m = re.match(r"^([A-Za-z0-9_.]+):\s*(.*)$", raw)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        current_key = key
        if val == "":
            out[key] = []  # may be filled by following block list
        elif val.startswith("[") and val.endswith("]"):
            out[key] = [v.strip() for v in val[1:-1].split(",") if v.strip()]
        else:
            out[key] = val.strip().strip('"').strip("'")
    return out


def _parse_sections(body: str) -> dict[str, str]:
    """Split a Markdown body on ``##`` headings into {title: content}."""
    sections: dict[str, str] = {}
    current: str | None = None
    buf: list[str] = []
    for line in body.splitlines():
        h = re.match(r"^##\s+(.*)$", line)
        if h:
            if current is not None:
                sections[current] = "\n".join(buf).strip()
            current = h.group(1).strip()
            buf = []
        elif current is not None:
            buf.append(line)
    if current is not None:
        sections[current] = "\n".join(buf).strip()
    return sections


def _first_heading(body: str) -> str | None:
    m = re.search(r"^#\s+(.*)$", body, re.MULTILINE)
    return m.group(1).strip() if m else None
