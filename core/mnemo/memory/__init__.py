"""The five-layer memory system.

  store.py         SQLite: sessions + messages(FTS5) + vectors        (L1 log, L5 episodic)
  embedding.py     dependency-free hashing embedder                   (enables L3)
  search.py        unifies lexical (FTS5) + semantic (vector) recall  (L3 + L5)
  prompt_memory.py MEMORY.md / USER.md frozen injection w/ char caps  (L4 durable)
  manager.py       MemoryManager — the façade the agent talks to
"""

from .embedding import Embedder, HashingEmbedder
from .manager import MemoryManager
from .prompt_memory import PromptMemory
from .store import MemoryStore

__all__ = ["MemoryManager", "MemoryStore", "PromptMemory", "Embedder", "HashingEmbedder"]
