"""Mnemo — a self-evolving agent core (a Hermes-class learning runtime).

The differentiation, like Hermes, is the *closed learning loop*:
  - Layer 1  short-term reasoning memory (context window + compression)
  - Layer 2  procedural skill memory (SKILL.md, progressive disclosure, self-evolution)
  - Layer 3  semantic memory (vector recall over notes + session summaries)
  - Layer 4  durable prompt memory (MEMORY.md / USER.md, frozen injection, char caps)
  - Layer 5  episodic logs (SQLite + FTS5 full-text search, on-demand retrieval)

The whole core runs on the Python standard library so it works offline. A real
Claude provider plugs in when an Anthropic key is available.
"""

__version__ = "0.1.0"

__all__ = ["__version__"]
