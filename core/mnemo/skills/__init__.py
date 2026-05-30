"""Procedural skill memory (Layer 2) — the self-evolution engine.

  model.py      Skill dataclass + SKILL.md (de)serialization, frontmatter parsing
  manager.py    discovery, progressive disclosure (L0/L1/L2), CRUD (skill_manage)
  evolution.py  turn a session transcript into a reusable SKILL.md (the learning loop)
"""

from .evolution import EvolutionResult, SkillEvolver
from .manager import SkillManager
from .model import Skill, SkillMeta

__all__ = ["Skill", "SkillMeta", "SkillManager", "SkillEvolver", "EvolutionResult"]
