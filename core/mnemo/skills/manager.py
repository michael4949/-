"""SkillManager — discovery, progressive disclosure, and CRUD.

Progressive disclosure (the token trick that makes many skills affordable):
  Level 0  skills_list()            names + descriptions + categories only
  Level 1  view(name)              one full SKILL.md, on demand
  Level 2  view(name, sub_path)    a reference file *inside* a skill dir

skill_manage actions (create / patch / edit / delete / write_file / remove_file)
are how the agent persists what it learns. The safety rule mirrors Hermes:
the agent may only create skills from its *own* experience; it never auto-installs
untrusted skills from a hub.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from typing import Optional

from .model import Skill, SkillMeta


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "skill"


class SkillError(Exception):
    pass


class SkillManager:
    def __init__(self, skills_dir: str | Path):
        self.dir = Path(skills_dir)
        self.dir.mkdir(parents=True, exist_ok=True)

    # ----- discovery / Level 0 -----------------------------------------
    def _skill_paths(self) -> list[Path]:
        return sorted(p for p in self.dir.glob("*/SKILL.md") if p.is_file())

    def list_meta(self) -> list[SkillMeta]:
        metas: list[SkillMeta] = []
        for p in self._skill_paths():
            try:
                metas.append(Skill.parse_frontmatter_only(p.read_text(encoding="utf-8"), path=str(p.parent)))
            except Exception:
                continue
        return metas

    def level0(self) -> str:
        """The compact catalog injected into the system prompt at session start."""
        metas = self.list_meta()
        if not metas:
            return "(no skills yet — I'll write SKILL.md files as I learn reusable procedures)"
        return "\n".join(m.l0_line() for m in metas)

    def exists(self, name: str) -> bool:
        return (self.dir / slugify(name) / "SKILL.md").exists()

    # ----- Level 1 / Level 2 -------------------------------------------
    def load(self, name: str) -> Skill:
        path = self.dir / slugify(name) / "SKILL.md"
        if not path.exists():
            raise SkillError(f"skill not found: {name}")
        return Skill.from_markdown(path.read_text(encoding="utf-8"), path=str(path.parent))

    def view(self, name: str, sub_path: Optional[str] = None) -> str:
        skill_dir = self.dir / slugify(name)
        if sub_path:  # Level 2: drill into a reference file
            target = (skill_dir / sub_path).resolve()
            if not str(target).startswith(str(skill_dir.resolve())):
                raise SkillError("path escapes skill directory")
            if not target.exists():
                raise SkillError(f"reference not found: {name}/{sub_path}")
            return target.read_text(encoding="utf-8")
        path = skill_dir / "SKILL.md"  # Level 1: the whole skill
        if not path.exists():
            raise SkillError(f"skill not found: {name}")
        return path.read_text(encoding="utf-8")

    # ----- CRUD (skill_manage) -----------------------------------------
    def create(self, skill: Skill, *, overwrite: bool = False) -> Skill:
        skill_dir = self.dir / slugify(skill.name)
        path = skill_dir / "SKILL.md"
        if path.exists() and not overwrite:
            raise SkillError(f"skill already exists: {skill.name} (use patch/edit)")
        skill_dir.mkdir(parents=True, exist_ok=True)
        skill.path = str(skill_dir)
        path.write_text(skill.to_markdown(), encoding="utf-8")
        return skill

    def patch(self, name: str, *, section: str, content: str, append: bool = False) -> Skill:
        """Token-cheap update of a single section — the preferred edit op."""
        skill = self.load(name)
        if append and section in skill.sections:
            skill.sections[section] = (skill.sections[section].rstrip() + "\n" + content.strip()).strip()
        else:
            skill.sections[section] = content.strip()
        skill.version = _bump(skill.version)
        (self.dir / slugify(name) / "SKILL.md").write_text(skill.to_markdown(), encoding="utf-8")
        return skill

    def edit(self, name: str, *, description: Optional[str] = None, category: Optional[str] = None,
             tags: Optional[list[str]] = None, sections: Optional[dict[str, str]] = None) -> Skill:
        skill = self.load(name)
        if description is not None:
            skill.description = description
        if category is not None:
            skill.category = category
        if tags is not None:
            skill.tags = tags
        if sections:
            skill.sections.update(sections)
        skill.version = _bump(skill.version)
        (self.dir / slugify(name) / "SKILL.md").write_text(skill.to_markdown(), encoding="utf-8")
        return skill

    def write_file(self, name: str, rel_path: str, content: str) -> str:
        skill_dir = self.dir / slugify(name)
        target = (skill_dir / rel_path).resolve()
        if not str(target).startswith(str(skill_dir.resolve())):
            raise SkillError("path escapes skill directory")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return str(target)

    def remove_file(self, name: str, rel_path: str) -> None:
        skill_dir = self.dir / slugify(name)
        target = (skill_dir / rel_path).resolve()
        if not str(target).startswith(str(skill_dir.resolve())):
            raise SkillError("path escapes skill directory")
        if target.exists():
            target.unlink()

    def delete(self, name: str) -> None:
        skill_dir = self.dir / slugify(name)
        if skill_dir.exists():
            shutil.rmtree(skill_dir)


def _bump(version: str) -> str:
    parts = version.split(".")
    try:
        parts[-1] = str(int(parts[-1]) + 1)
        return ".".join(parts)
    except (ValueError, IndexError):
        return version
