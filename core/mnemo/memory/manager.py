"""MemoryManager — the single façade the agent and tools talk to.

It composes the three storage mechanisms into the "five layer" experience:
  - durable prompt memory (L4)  via PromptMemory  -> frozen into system prompt
  - semantic recall      (L3)   via Embedder + vectors
  - episodic full-text   (L5)   via FTS5
Layers 1 (context window) and 2 (skills) live in the agent and skill modules.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Optional

from ..config import MnemoConfig
from ..types import Message, Role
from .embedding import Embedder, HashingEmbedder
from .prompt_memory import PromptMemory, Scope
from .store import MemoryStore


@dataclass
class RecallHit:
    text: str
    score: float
    kind: str
    ref_id: str


class MemoryManager:
    def __init__(self, config: MnemoConfig, *, store: Optional[MemoryStore] = None, embedder: Optional[Embedder] = None):
        self.config = config
        self.store = store or MemoryStore(config.db_path)
        self.embedder = embedder or HashingEmbedder()
        self.prompt = PromptMemory(
            config.memory_path,
            config.user_path,
            memory_cap=config.memory_max_chars,
            user_cap=config.user_max_chars,
        )

    # ----- durable prompt memory (L4) ----------------------------------
    def remember(self, text: str, scope: Scope = "memory") -> bool:
        """Persist a durable fact; also index it for semantic recall."""
        changed = self.prompt.append(scope, text)
        if changed:
            # Stable content hash → identical notes upsert instead of duplicating.
            digest = hashlib.blake2b(text.strip().lower().encode("utf-8"), digest_size=8).hexdigest()
            self.store.upsert_vector("note", f"{scope}:{digest}", text, self.embedder.embed(text))
        return changed

    def frozen_prompt_memory(self) -> str:
        return self.prompt.frozen_snapshot()

    # ----- semantic recall (L3) ----------------------------------------
    def recall(self, query: str, *, k: int = 5, kinds: Optional[list[str]] = None) -> list[RecallHit]:
        qv = self.embedder.embed(query)
        scored: list[RecallHit] = []
        for row in self.store.iter_vectors(kinds):
            score = Embedder.cosine(qv, row["vector"])
            if score > 0.0:
                scored.append(RecallHit(text=row["text"], score=score, kind=row["kind"], ref_id=row["ref_id"]))
        scored.sort(key=lambda h: h.score, reverse=True)
        return scored[:k]

    # ----- episodic full-text (L5) -------------------------------------
    def session_search(self, query: str, *, limit: int = 8) -> list[dict]:
        return self.store.search_fts(query, profile=self.config.profile, limit=limit)

    # ----- session lifecycle -------------------------------------------
    def start_session(self, *, channel: str = "cli", parent_session_id: Optional[str] = None) -> str:
        return self.store.create_session(self.config.profile, channel=channel, parent_session_id=parent_session_id)

    def record(self, session_id: str, message: Message) -> None:
        self.store.add_message(session_id, message)

    def load_transcript(self, session_id: str) -> list[Message]:
        return self.store.get_messages(session_id)

    def index_session(self, session_id: str, summary: str) -> None:
        """After a run, store a session summary and embed it for recall (L3/L5)."""
        self.store.update_session(session_id, summary=summary)
        if summary.strip():
            self.store.upsert_vector("session", session_id, summary, self.embedder.embed(summary))

    # ----- introspection ------------------------------------------------
    def stats(self) -> dict:
        return {
            "profile": self.config.profile,
            "sessions": self.store.count("sessions"),
            "messages": self.store.count("messages"),
            "vectors": self.store.count("vectors"),
            "prompt_memory": self.prompt.stats(),
        }
