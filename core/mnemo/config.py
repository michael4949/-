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

import json
import os
import stat
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

    @property
    def config_path(self) -> Path:
        """Persisted preferences (provider, model) — shared across profiles."""
        return self.home / "config.json"

    @property
    def credentials_path(self) -> Path:
        """API keys — never committed (lives under ~/.mnemo)."""
        return self.home / "credentials.json"

    def ensure_dirs(self) -> "MnemoConfig":
        self.skills_dir.mkdir(parents=True, exist_ok=True)
        return self

    # ----- persisted preferences & secrets ------------------------------
    def save_preferences(self, *, provider: str | None = None, model: str | None = None) -> None:
        data = _read_json(self.config_path)
        if provider is not None:
            data["provider"] = provider
            self.provider = provider
        if model is not None:
            data["model"] = model
            self.model = model
        self.home.mkdir(parents=True, exist_ok=True)
        self.config_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def get_anthropic_key(self) -> str | None:
        """Resolve the key: env first (sandbox/CI honest), then credentials.json."""
        env = os.environ.get("ANTHROPIC_API_KEY")
        if env:
            return env
        return _read_json(self.credentials_path).get("anthropic_api_key")

    def set_anthropic_key(self, key: str) -> None:
        self.home.mkdir(parents=True, exist_ok=True)
        data = _read_json(self.credentials_path)
        data["anthropic_api_key"] = key.strip()
        self.credentials_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        try:  # best-effort tighten perms (no-op on Windows)
            self.credentials_path.chmod(stat.S_IRUSR | stat.S_IWUSR)
        except OSError:
            pass

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
        saved = _read_json(cfg.config_path)  # persisted preferences from `mnemo setup`
        # Precedence: explicit arg > env var > config.json > built-in default.
        cfg.profile = profile or os.environ.get("MNEMO_PROFILE") or saved.get("profile", cfg.profile)
        cfg.provider = provider or os.environ.get("MNEMO_PROVIDER") or saved.get("provider", cfg.provider)
        cfg.model = model or os.environ.get("MNEMO_MODEL") or saved.get("model", cfg.model)
        return cfg.ensure_dirs()


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
