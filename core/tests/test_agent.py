from pathlib import Path

from mnemo.agent import Agent
from mnemo.config import MnemoConfig
from mnemo.llm.scripted import ScriptedProvider
from mnemo.types import EventType


def _cfg(tmp_path):
    return MnemoConfig(home=tmp_path / "home", provider="scripted").ensure_dirs()


def test_agent_runs_tools_and_writes_memory(tmp_path):
    work = tmp_path / "work"
    work.mkdir()
    provider = ScriptedProvider(turns=[
        [{"name": "write_file", "arguments": {"path": "out.txt", "content": "hello world"}}],
        [{"name": "remember", "arguments": {"text": "The greeting file out.txt says hello world.", "scope": "memory"}}],
        "Created out.txt and remembered its contents.",
    ])
    agent = Agent(_cfg(tmp_path), provider=provider, workdir=str(work))
    answer, events = agent.run_collect("make a greeting file and remember it")

    assert "Created out.txt" in answer
    assert (work / "out.txt").read_text() == "hello world"
    kinds = [e.type for e in events]
    assert EventType.TOOL_CALL in kinds and EventType.TOOL_RESULT in kinds
    # durable memory was written and is recallable
    hits = agent.memory.recall("what does the greeting file say")
    assert any("hello world" in h.text.lower() for h in hits)


def test_agent_learns_a_skill_after_complex_task(tmp_path):
    work = tmp_path / "work"
    work.mkdir()
    body = "# setup\nbuild: npm run build\n"
    provider = ScriptedProvider(turns=[
        [{"name": "skills_list", "arguments": {}}],
        [{"name": "write_file", "arguments": {"path": "notes/setup.md", "content": body}}],
        [{"name": "run_shell", "arguments": {"command": "ls notes"}}],
        [{"name": "read_file", "arguments": {"path": "notes/setup.md"}}],
        [{"name": "remember", "arguments": {"text": "Build command is npm run build.", "scope": "memory"}}],
        "All set.",
    ])
    agent = Agent(_cfg(tmp_path), provider=provider, workdir=str(work))
    _, events = agent.run_collect("document setup, verify it, remember the build command")

    learned = [e for e in events if e.type == EventType.SKILL_LEARNED]
    assert learned, "a 5-tool-call task should trigger skill evolution"
    metas = agent.skills.list_meta()
    assert len(metas) == 1
    md = agent.skills.view(metas[0].name)
    assert "Procedure" in md and "write_file" in md


def test_cross_session_recall(tmp_path):
    cfg = _cfg(tmp_path)
    work = tmp_path / "work"
    work.mkdir()

    # Session A: learn a durable fact.
    a = Agent(cfg, provider=ScriptedProvider(turns=[
        [{"name": "remember", "arguments": {"text": "The staging DB host is db.staging.internal.", "scope": "memory"}}],
        "Noted the staging DB host.",
    ]), workdir=str(work))
    a.run_collect("remember the staging database host")

    # Session B: a brand-new Agent over the same home recalls it.
    b = Agent(cfg, provider=ScriptedProvider(), workdir=str(work))
    hits = b.memory.recall("what is the staging database hostname")
    assert any("db.staging.internal" in h.text for h in hits)
    # and the frozen prompt memory carries it into B's system prompt
    assert "db.staging.internal" in b.build_system_prompt()
    # episodic full-text search finds the earlier turn too
    assert b.memory.session_search("staging")


def test_context_compaction_triggers(tmp_path):
    cfg = _cfg(tmp_path)
    cfg.compact_threshold = 6
    work = tmp_path / "work"
    work.mkdir()
    # Many small tool steps to grow the transcript past the threshold.
    turns = [[{"name": "list_dir", "arguments": {"path": "."}}] for _ in range(8)]
    turns.append("done exploring")
    agent = Agent(cfg, provider=ScriptedProvider(turns=turns), workdir=str(work))
    _, events = agent.run_collect("explore repeatedly")
    assert any(e.type == EventType.COMPACTED for e in events)
