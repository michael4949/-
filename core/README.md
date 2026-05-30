# Mnemo — a self-evolving agent core

> A Hermes-class learning runtime, built to run on Claude.
> The differentiation isn't a feature list — it's the **closed learning loop**:
> the agent gets sharper over time by writing its own **skills** and **memory**.

Mnemo is the Python "brain" of the project. It reproduces the parts of
[Hermes](https://github.com/NousResearch) that actually matter — *self-evolving
skills* and *layered memory* — and is designed to surpass it on model quality
(Claude), governance, and observability.

The entire core runs on the **Python standard library**. No API key, no model
download, no third-party package is required to run it, the demo, or the tests.
Drop in an Anthropic key to switch the same machinery onto real Claude reasoning.

```
cd core
python3 -m mnemo.cli demo        # hermetic, offline, end-to-end proof
```

---

## What it does (in 30 seconds)

`mnemo demo` runs two sessions, fully offline:

1. **Session A** performs a 5-step task (list skills → write a file → verify via
   shell → read back → remember a fact). Because it crossed the "skill-worthy"
   threshold, the agent **auto-authors a `SKILL.md`** from the transcript.
2. **Session B** is a brand-new session that **recalls** the earlier fact via
   semantic search — proving cross-session memory.

You watch a skill get written from experience, and watch a later session use it.

---

## The five-layer memory model

| Layer | What | Where it lives | When it loads |
|------:|------|----------------|---------------|
| **L1** | Short-term reasoning | the context window + `_maybe_compact` | always; compresses the middle when long |
| **L2** | Procedural skills | `skills/*/SKILL.md` | **Level-0 catalog** always; full skill on demand |
| **L3** | Semantic memory | `vectors` table (hashing embedder) | on demand via `recall` |
| **L4** | Durable prompt memory | `MEMORY.md` / `USER.md` (char-capped) | **frozen snapshot** at session start |
| **L5** | Episodic logs | `messages` + FTS5 | on demand via `session_search` |

The design rule (straight from Hermes): **keep the frozen prompt tiny and
cache-stable; recall large context only when asked.** That's why `MEMORY.md` is
capped at 2200 chars and big retrieval goes through FTS5/vectors.

### Progressive disclosure (the token trick)

```
Level 0   skills_list()           name + category + description only  (cheap, always in prompt)
Level 1   skill_view(name)        one full SKILL.md                   (loaded on demand)
Level 2   skill_view(name, path)  a reference file inside the skill   (drill-down)
```

### The self-evolution loop

After every run, `SkillEvolver` decides if the task was worth remembering:

- a **complex task** — ≥ 5 tool calls, or
- a **recovery** — a tool errored, then a later step succeeded, or
- a **correction** — the user pushed back and the agent adjusted.

If so, it synthesizes a `SKILL.md` (When to Use / Quick Reference / Procedure /
Pitfalls / Verification) from the actual transcript — deterministically, with no
LLM required — or **patches** an existing skill to reinforce it.

---

## Architecture

```
core/mnemo/
  types.py            Message / ToolCall / ToolResult / AgentEvent
  config.py           ~/.mnemo home, per-profile isolation, caps & thresholds
  agent.py            the runtime loop that unifies all five layers
  llm/
    base.py           LLMProvider interface
    scripted.py       offline deterministic brain (drives demo + tests)
    anthropic_provider.py   real Claude: native tool use + prompt caching (lazy SDK)
  tools/
    base.py           Tool / ToolRegistry / ToolContext
    builtin.py        read_file, write_file, list_dir, grep, run_shell (guarded)
    skill_tools.py    skills_list, skill_view, skill_manage   ← writes procedural memory
    memory_tools.py   remember, recall, session_search        ← writes/reads memory
  skills/
    model.py          Skill + SKILL.md (de)serialization (stdlib frontmatter parser)
    manager.py        discovery, progressive disclosure, CRUD
    evolution.py      transcript → SKILL.md (the learning loop)
  memory/
    store.py          SQLite: sessions + messages(FTS5) + vectors
    embedding.py      dependency-free hashing embedder (cosine)
    prompt_memory.py  MEMORY.md / USER.md, caps + dedupe + compaction
    manager.py        MemoryManager façade
  server.py           zero-dependency JSON API for the React console
  cli.py              mnemo demo | run | chat | skills | memory | serve
```

---

## CLI

```bash
python3 -m mnemo.cli demo                       # offline end-to-end proof
python3 -m mnemo.cli run "remember X and do Y"  # one-shot task
python3 -m mnemo.cli chat                        # interactive REPL (memory persists)
python3 -m mnemo.cli skills list                 # inspect learned skills
python3 -m mnemo.cli skills view <name>          # read a SKILL.md
python3 -m mnemo.cli memory --query "deploy"     # memory stats + semantic recall
python3 -m mnemo.cli serve --port 8765           # JSON API for the console
```

Install as a real command (optional):

```bash
cd core && pip install -e .        # provides the `mnemo` entrypoint
```

## Switching onto real Claude

```bash
pip install -e ".[anthropic]"
export ANTHROPIC_API_KEY=sk-...
python3 -m mnemo.cli --provider anthropic chat
```

`AnthropicProvider` uses native tool use and marks the (large, stable) system
prompt with `cache_control` for prompt caching — the same skills + memory
machinery, now with Claude doing the reasoning.

## HTTP API (for the React console)

```
GET  /api/health
GET  /api/skills              GET /api/skills/<name>
GET  /api/memory              GET /api/sessions
POST /api/chat  {message, session?}  ->  {session, answer, events[]}
```

---

## Tests

```bash
cd core && python3 -m pytest      # 20 tests, ~0.5s, no network
```

Coverage: embedder similarity, SKILL.md round-trip + CRUD + path-escape guard,
FTS5 search, prompt-memory dedupe/caps, the evolution triggers (complex /
recovery / correction), the full agent loop, cross-session recall, and context
compaction.

---

## How this maps to Hermes (and where it aims to surpass)

| Hermes capability | Mnemo status |
|---|---|
| SKILL.md + progressive disclosure (L0/L1/L2) | ✅ implemented |
| Agent **auto-creates** skills after complex tasks | ✅ implemented (deterministic, offline) |
| Skill **patch** to reinforce | ✅ implemented |
| Durable prompt memory with char caps (MEMORY/USER) | ✅ implemented |
| Episodic FTS5 cross-session search | ✅ implemented |
| Semantic/vector recall (L3) | ✅ implemented (hashing embedder; pluggable to real embeddings) |
| Context compression (L1) | ✅ implemented |
| Danger-command guard | ✅ implemented |
| Multi-provider (Claude native + caching) | ✅ Claude; others via the provider interface |
| Single-process multi-IM gateway | ⏳ roadmap (provider/channel adapters) |
| Honcho-style dialectic user modeling (L4+) | ⏳ roadmap |
| Container/OS sandbox backends | ⏳ roadmap |

**The surpass thesis:** Claude model quality, plus the things Hermes' own
community flags as weak — *observability and governance of self-evolution*.
Here every learned skill is a plain `SKILL.md` on disk (diffable, reviewable,
Git-trackable), evolution is deterministic and explainable (it tells you *why*
it learned), and memory has hard caps. See `../ROADMAP.md`.
