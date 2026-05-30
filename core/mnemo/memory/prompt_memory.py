"""Durable prompt memory: MEMORY.md (agent) and USER.md (user model).

These two files are the *only* memory injected verbatim into the system prompt,
as a frozen snapshot taken when a session starts. They have hard character caps
(Hermes: 2200 / 1375) precisely so the system prompt stays small and cache-stable
— everything larger is recalled on demand via FTS5/vectors.

Writes mid-session land on disk immediately but only enter the prompt next session
(the "frozen snapshot" rule). When a file approaches its cap we compact it:
dedupe, then drop the oldest bullets, leaving a marker.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

Scope = Literal["memory", "user"]


class PromptMemory:
    def __init__(self, memory_path: Path, user_path: Path, *, memory_cap: int, user_cap: int):
        self.paths: dict[str, Path] = {"memory": Path(memory_path), "user": Path(user_path)}
        self.caps: dict[str, int] = {"memory": memory_cap, "user": user_cap}
        self.headers = {
            "memory": "# MEMORY.md — durable agent memory\n",
            "user": "# USER.md — what I know about the user\n",
        }

    # ----- read ---------------------------------------------------------
    def read(self, scope: Scope) -> str:
        p = self.paths[scope]
        return p.read_text(encoding="utf-8") if p.exists() else ""

    def bullets(self, scope: Scope) -> list[str]:
        out = []
        for line in self.read(scope).splitlines():
            s = line.strip()
            if s.startswith("- "):
                out.append(s[2:].strip())
        return out

    def frozen_snapshot(self) -> str:
        """The exact text injected into the system prompt at session start."""
        parts = []
        for scope in ("memory", "user"):
            body = self.read(scope).strip()
            if body:
                parts.append(body)
        return "\n\n".join(parts)

    # ----- write --------------------------------------------------------
    def append(self, scope: Scope, text: str) -> bool:
        """Add a bullet. Returns True if the store changed (i.e. not a duplicate)."""
        text = " ".join(text.split()).strip().lstrip("-").strip()
        if not text:
            return False
        existing = self.bullets(scope)
        if _is_duplicate(text, existing):
            return False
        existing.append(text)
        self._write_bullets(scope, existing)
        self._enforce_cap(scope)
        return True

    def _write_bullets(self, scope: Scope, bullets: list[str]) -> None:
        p = self.paths[scope]
        p.parent.mkdir(parents=True, exist_ok=True)
        content = self.headers[scope] + "\n" + "\n".join(f"- {b}" for b in bullets) + "\n"
        p.write_text(content, encoding="utf-8")

    def _enforce_cap(self, scope: Scope) -> None:
        """Compact toward the cap: dedupe (kept) then evict oldest bullets."""
        cap = self.caps[scope]
        # 80% soft threshold mirrors Hermes' "merge when ~80% full" behavior.
        soft = int(cap * 0.8)
        bullets = self.bullets(scope)
        while bullets and len(self._render(scope, bullets)) > cap:
            bullets.pop(0)  # drop oldest first
        rendered = self._render(scope, bullets)
        if len(rendered) > soft and bullets:
            # Leave a breadcrumb so it's observable that compaction happened.
            note = "[older notes compacted to respect the prompt-memory cap]"
            if note not in bullets:
                bullets.insert(0, note)
            while bullets and len(self._render(scope, bullets)) > cap:
                # never evict the breadcrumb itself
                if len(bullets) > 1:
                    bullets.pop(1)
                else:
                    break
        self._write_bullets(scope, bullets)

    def _render(self, scope: Scope, bullets: list[str]) -> str:
        return self.headers[scope] + "\n" + "\n".join(f"- {b}" for b in bullets) + "\n"

    def stats(self) -> dict:
        return {
            scope: {"chars": len(self.read(scope)), "cap": self.caps[scope], "bullets": len(self.bullets(scope))}
            for scope in ("memory", "user")
        }


def _is_duplicate(text: str, existing: list[str], threshold: float = 0.85) -> bool:
    t = _norm(text)
    for e in existing:
        e2 = _norm(e)
        if t == e2:
            return True
        if _jaccard(t, e2) >= threshold:
            return True
    return False


def _norm(s: str) -> str:
    return " ".join(s.lower().split())


def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a.split()), set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)
