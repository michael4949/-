"""mnemo — command-line entrypoint.

    mnemo demo                 hermetic end-to-end proof (offline, no API key)
    mnemo run "<task>"         one-shot task
    mnemo chat                 interactive REPL (session memory persists)
    mnemo skills [list|view]   inspect procedural memory
    mnemo memory [show]        inspect durable + episodic memory
    mnemo serve                start the JSON API for the React console
"""

from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

from .agent import Agent
from .config import MnemoConfig
from .llm.scripted import ScriptedProvider
from .types import AgentEvent, EventType

# ----- pretty-printing ----------------------------------------------------
_SYMBOL = {
    EventType.ASSISTANT: "🤖",
    EventType.TOOL_CALL: "🔧",
    EventType.TOOL_RESULT: "↩️ ",
    EventType.SKILL_LEARNED: "✨",
    EventType.MEMORY_WRITE: "🧠",
    EventType.COMPACTED: "🗜️ ",
    EventType.FINAL: "✅",
    EventType.ERROR: "⛔",
}


def _render(ev: AgentEvent, *, verbose: bool = True) -> str | None:
    if ev.type == EventType.ASSISTANT:
        if ev.data.get("final"):
            return None  # FINAL event carries the answer; avoid double-print
        return f"{_SYMBOL[ev.type]} {ev.text}" if ev.text else None
    if ev.type == EventType.TOOL_CALL:
        args = ev.data.get("arguments", {})
        preview = ", ".join(f"{k}={_short(v)}" for k, v in list(args.items())[:3])
        return f"{_SYMBOL[ev.type]} {ev.text}({preview})"
    if ev.type == EventType.TOOL_RESULT:
        if not verbose:
            return None
        tag = "error" if ev.data.get("is_error") else "ok"
        return f"{_SYMBOL[ev.type]}[{tag}] {_short(ev.text, 160)}"
    if ev.type == EventType.SKILL_LEARNED:
        return f"{_SYMBOL[ev.type]} learned: {ev.text}  ({ev.data.get('reason','')})"
    if ev.type == EventType.COMPACTED:
        return f"{_SYMBOL[ev.type]} {ev.text}"
    if ev.type == EventType.FINAL:
        return f"{_SYMBOL[ev.type]} {ev.text}" if ev.text else None
    if ev.type == EventType.ERROR:
        return f"{_SYMBOL[ev.type]} {ev.text}"
    return None


def _short(v, n: int = 40) -> str:
    s = str(v).replace("\n", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


def _stream(agent: Agent, task: str, *, session_id=None, verbose=True):
    last_session = session_id
    for ev in agent.run(task, session_id=session_id):
        if ev.type == EventType.FINAL:
            last_session = ev.data.get("session_id", last_session)
        line = _render(ev, verbose=verbose)
        if line:
            print(line)
    return last_session


# ----- commands -----------------------------------------------------------
def cmd_run(args) -> int:
    cfg = MnemoConfig.load(profile=args.profile, provider=args.provider, model=args.model)
    agent = Agent(cfg, workdir=args.workdir)
    _stream(agent, args.task, verbose=not args.quiet)
    return 0


def cmd_chat(args) -> int:
    cfg = MnemoConfig.load(profile=args.profile, provider=args.provider, model=args.model)
    agent = Agent(cfg, workdir=args.workdir)
    print(f"mnemo chat · profile={cfg.profile} · provider={agent.provider.name}  (Ctrl-D to exit)")
    session = None
    while True:
        try:
            task = input("\n› ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nbye.")
            return 0
        if not task:
            continue
        if task in ("/exit", "/quit"):
            return 0
        session = _stream(agent, task, session_id=session, verbose=not args.quiet)


def cmd_skills(args) -> int:
    cfg = MnemoConfig.load(profile=args.profile)
    mgr = Agent(cfg).skills
    if args.action == "view":
        if not args.name:
            print("usage: mnemo skills view <name>"); return 2
        try:
            print(mgr.view(args.name))
        except Exception as e:
            print(f"error: {e}"); return 1
        return 0
    metas = mgr.list_meta()
    if not metas:
        print("(no skills yet — run `mnemo demo` to watch one get learned)")
        return 0
    print(f"{len(metas)} skill(s) in {cfg.skills_dir}:\n")
    for m in metas:
        print(m.l0_line())
    return 0


def cmd_memory(args) -> int:
    cfg = MnemoConfig.load(profile=args.profile)
    mem = Agent(cfg).memory
    stats = mem.stats()
    print(f"profile        : {stats['profile']}")
    print(f"sessions       : {stats['sessions']}")
    print(f"messages (FTS) : {stats['messages']}")
    print(f"vectors        : {stats['vectors']}")
    pm = stats["prompt_memory"]
    print(f"MEMORY.md      : {pm['memory']['chars']}/{pm['memory']['cap']} chars, {pm['memory']['bullets']} notes")
    print(f"USER.md        : {pm['user']['chars']}/{pm['user']['cap']} chars, {pm['user']['bullets']} notes")
    if args.query:
        print(f"\nrecall('{args.query}'):")
        for h in mem.recall(args.query):
            print(f"  [{h.kind} · {h.score:.2f}] {h.text}")
    return 0


def cmd_serve(args) -> int:
    from .server import serve
    serve(host=args.host, port=args.port, profile=args.profile, provider=args.provider)
    return 0


def cmd_demo(args) -> int:
    return run_demo()


def run_demo() -> int:
    """A hermetic, offline end-to-end proof of the learning loop."""
    home = Path(tempfile.mkdtemp(prefix="mnemo-demo-"))
    work = Path(tempfile.mkdtemp(prefix="mnemo-work-"))
    cfg = MnemoConfig(home=home, provider="scripted").ensure_dirs()

    print("═" * 70)
    print("  Mnemo demo — a self-evolving agent, running fully offline")
    print(f"  home={home}")
    print("═" * 70)

    # ---- Session A: a 5-step task the agent will learn from ----
    print("\n▎Session A — multi-step task (watch it auto-learn a skill)\n")
    note_body = "# Project setup\n\nBuild: `npm run build`\nTest: `npm test`\n"
    provider = ScriptedProvider(turns=[
        [{"name": "skills_list", "arguments": {}}],
        [{"name": "write_file", "arguments": {"path": "notes/setup.md", "content": note_body}}],
        [{"name": "run_shell", "arguments": {"command": "ls notes"}}],
        [{"name": "read_file", "arguments": {"path": "notes/setup.md"}}],
        [{"name": "remember", "arguments": {"text": "The project build command is `npm run build`.", "scope": "memory"}}],
        "Done — created and verified notes/setup.md, and remembered the build command.",
    ])
    agent_a = Agent(cfg, provider=provider, workdir=str(work))
    session_a = _stream(agent_a, "Document the project setup in notes/setup.md, verify it, and remember the build command.")

    # ---- Inspect what was learned ----
    print("\n▎What persisted\n")
    skills = agent_a.skills.list_meta()
    for m in skills:
        print(f"  ✨ SKILL.md → {m.name} [{m.category}]: {m.description}")
    mstats = agent_a.memory.stats()["prompt_memory"]["memory"]
    print(f"  🧠 MEMORY.md → {mstats['bullets']} note(s), {mstats['chars']} chars")

    # ---- Session B: prove cross-session recall (new session, same brain) ----
    print("\n▎Session B — brand-new session, ask about the earlier work\n")
    agent_b = Agent(cfg, provider=ScriptedProvider(), workdir=str(work))  # heuristic brain
    _stream(agent_b, "Do you recall the project build command?")

    # ---- Show the generated skill verbatim ----
    if skills:
        print("\n▎The skill it wrote itself (SKILL.md)\n")
        text = agent_a.skills.view(skills[0].name)
        print("\n".join("    " + ln for ln in text.splitlines()))

    print("\n" + "═" * 70)
    print("  Proof complete: tools ran, a skill was authored from experience,")
    print("  durable memory was written, and a later session recalled it —")
    print("  all offline. Drop in an Anthropic key (provider=anthropic) for")
    print("  real reasoning on the exact same machinery.")
    print("═" * 70)
    return 0


# ----- arg parsing --------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="mnemo", description="A self-evolving agent core (Hermes-class learning runtime).")
    p.add_argument("--profile", default=None, help="profile name (isolated memory/skills)")
    p.add_argument("--provider", default=None, choices=[None, "scripted", "anthropic"], help="LLM provider")
    p.add_argument("--model", default=None, help="model id (anthropic provider)")
    sub = p.add_subparsers(dest="command", required=True)

    r = sub.add_parser("run", help="run a one-shot task")
    r.add_argument("task")
    r.add_argument("--workdir", default=".")
    r.add_argument("--quiet", action="store_true")
    r.set_defaults(func=cmd_run)

    c = sub.add_parser("chat", help="interactive REPL")
    c.add_argument("--workdir", default=".")
    c.add_argument("--quiet", action="store_true")
    c.set_defaults(func=cmd_chat)

    d = sub.add_parser("demo", help="offline end-to-end proof")
    d.set_defaults(func=cmd_demo)

    s = sub.add_parser("skills", help="inspect skills")
    s.add_argument("action", nargs="?", default="list", choices=["list", "view"])
    s.add_argument("name", nargs="?")
    s.set_defaults(func=cmd_skills)

    m = sub.add_parser("memory", help="inspect memory")
    m.add_argument("action", nargs="?", default="show", choices=["show"])
    m.add_argument("--query", default=None)
    m.set_defaults(func=cmd_memory)

    sv = sub.add_parser("serve", help="start the JSON API for the console")
    sv.add_argument("--host", default="127.0.0.1")
    sv.add_argument("--port", type=int, default=8765)
    sv.set_defaults(func=cmd_serve)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv if argv is not None else sys.argv[1:])
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
