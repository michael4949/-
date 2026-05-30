"""Configuration + home-directory resolution for Mnemo.

Mirrors Hermes' ``~/.hermes`` layout with per-profile isolation:

    ~/.mnemo/
      profiles/
        default/
          MEMORY.md          durable agent memory (frozen into the system prompt)
          USER.md            durable user model (frozen into the system prompt)
          skills/            <name>/SKILL.md procedural skills
          state.db           SQLite: sessions, messages (FTS5), vectors
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


# Durable prompt-memory caps (chars). These are intentionally small: the whole
# point is that the *frozen* memory stays tiny and cache-stable, while large
# recall happens on demand via FTS5 / vector search.
MEMORY_MAX_CHARS = 2200
USER_MAX_CHARS = 1375

# Context-window management.
COMPACT_THRESHOLD_MESSAGES = 40   # compress when transcript grows beyond this
KEEP_HEAD = 3                     # protect the first N turns
KEEP_TAIL = 4                     # protect the last N turns

# Self-evolution trigger: a task is "skill-worthy" once it crosses this many
# successful tool calls (Hermes uses ~5), or when a correction/recovery happens.
SKILL_TOOLCALL_THRESHOLD = 5


@dataclass
class MnemoConfig:
    home: Path
    profile: str = "default"
    provider: str = "scripted"          # "scripted" (offline) | "anthropic"
    model: str = "claude-opus-4-8"
    max_steps: int = 16                 # tool-use loop ceiling per run
    memory_max_chars: int = MEMORY_MAX_CHARS
    user_max_chars: int = USER_MAX_CHARS
    compact_threshold: int = COMPACT_THRESHOLD_MESSAGES
    skill_toolcall_threshold: int = SKILL_TOOLCALL_THRESHOLD
    auto_evolve: bool = True            # learn skills automatically after a run
    extra: dict = field(default_factory=dict)

    # ----- derived paths ------------------------------------------------
    @property
    def profile_dir(self) -> Path:
        return self.home / "profiles" / self.profile

    @property
    def skills_dir(self) -> Path:
        return self.profile_dir / "skills"

    @property
    def db_path(self) -> Path:
        return self.profile_dir / "state.db"

    @property
    def memory_path(self) -> Path:
        return self.profile_dir / "MEMORY.md"

    @property
    def user_path(self) -> Path:
        return self.profile_dir / "USER.md"

    def ensure_dirs(self) -> "MnemoConfig":
        self.skills_dir.mkdir(parents=True, exist_ok=True)
        return self

    # ----- construction -------------------------------------------------
    @staticmethod
    def resolve_home(explicit: str | os.PathLike | None = None) -> Path:
        if explicit:
            return Path(explicit).expanduser().resolve()
        env = os.environ.get("MNEMO_HOME")
        if env:
            return Path(env).expanduser().resolve()
        return (Path.home() / ".mnemo").resolve()

    @classmethod
    def load(
        cls,
        home: str | os.PathLike | None = None,
        profile: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> "MnemoConfig":
        cfg = cls(home=cls.resolve_home(home))
        if profile:
            cfg.profile = profile
        # Env overrides keep the sandbox/CI honest without editing files.
        cfg.profile = os.environ.get("MNEMO_PROFILE", cfg.profile)
        cfg.provider = provider or os.environ.get("MNEMO_PROVIDER", cfg.provider)
        cfg.model = model or os.environ.get("MNEMO_MODEL", cfg.model)
        return cfg.ensure_dirs()
