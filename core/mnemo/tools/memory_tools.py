"""Memory tools — durable write + semantic/episodic recall.

  remember        write a durable fact to MEMORY.md (agent) or USER.md (user model)
  recall          semantic (vector) search across notes + session summaries  (L3)
  session_search  full-text (FTS5) search across past messages               (L5)

The split is deliberate: ``remember`` keeps the *frozen* prompt memory tiny, while
``recall`` / ``session_search`` pull larger context only when the agent asks.
"""

from __future__ import annotations

from .base import ToolContext, ToolRegistry


def register_memory_tools(reg: ToolRegistry) -> None:
    def remember(args, ctx: ToolContext):
        scope = args.get("scope", "memory")
        if scope not in ("memory", "user"):
            scope = "memory"
        changed = ctx.memory.remember(args["text"], scope=scope)  # type: ignore[arg-type]
        if not changed:
            return f"already known (no change to {scope.upper()}.md)"
        return f"remembered in {scope.upper()}.md: {args['text'].strip()[:120]}"

    def recall(args, ctx: ToolContext):
        hits = ctx.memory.recall(args["query"], k=int(args.get("k", 5)))
        if not hits:
            return "(nothing relevant in memory yet)"
        lines = [f"[{h.kind} · {h.score:.2f}] {h.text}" for h in hits]
        return "\n".join(lines)

    def session_search(args, ctx: ToolContext):
        rows = ctx.memory.session_search(args["query"], limit=int(args.get("limit", 8)))
        if not rows:
            return "(no matching past messages)"
        lines = [f"[{r['role']} · {r['session_id'][:12]}] {r['snippet']}" for r in rows]
        return "\n".join(lines)

    reg.add("remember", "Persist a durable fact. scope='memory' (about the task/world) or 'user' (about the user).",
            {"type": "object", "properties": {"text": {"type": "string"},
                                              "scope": {"type": "string", "enum": ["memory", "user"]}},
             "required": ["text"]}, remember)
    reg.add("recall", "Semantic search over durable notes and past session summaries.",
            {"type": "object", "properties": {"query": {"type": "string"}, "k": {"type": "integer"}},
             "required": ["query"]}, recall)
    reg.add("session_search", "Full-text search across past conversation messages (episodic recall).",
            {"type": "object", "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}},
             "required": ["query"]}, session_search)
