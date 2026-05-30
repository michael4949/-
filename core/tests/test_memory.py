from mnemo.config import MnemoConfig
from mnemo.memory.manager import MemoryManager
from mnemo.memory.prompt_memory import PromptMemory
from mnemo.memory.store import MemoryStore
from mnemo.types import Message, Role


def _cfg(tmp_path):
    return MnemoConfig(home=tmp_path, provider="scripted").ensure_dirs()


def test_store_fts_search(tmp_path):
    store = MemoryStore(tmp_path / "state.db")
    sid = store.create_session("default")
    store.add_message(sid, Message(role=Role.USER, content="the authentication service threw a token error"))
    store.add_message(sid, Message(role=Role.ASSISTANT, content="I restarted the auth pod and it recovered"))
    hits = store.search_fts("authentication")
    assert hits and any("authentication" in h["snippet"].lower() for h in hits)
    # tool/noise rows are not indexed
    assert store.count("messages") == 2


def test_prompt_memory_dedupe_and_cap(tmp_path):
    pm = PromptMemory(tmp_path / "MEMORY.md", tmp_path / "USER.md", memory_cap=200, user_cap=200)
    assert pm.append("memory", "Build with npm run build") is True
    # near-duplicate is rejected
    assert pm.append("memory", "build with npm run build") is False
    # cap is enforced: pile on long notes, file stays within cap
    for i in range(40):
        pm.append("memory", f"note number {i} with some padding text to grow the file")
    assert len(pm.read("memory")) <= 200 + len(pm.headers["memory"]) + 8


def test_manager_remember_and_recall(tmp_path):
    mem = MemoryManager(_cfg(tmp_path))
    assert mem.remember("The deploy token lives at vault path secret/deploy", scope="memory")
    hits = mem.recall("where is the deployment token stored")
    assert hits
    assert "deploy" in hits[0].text.lower()


def test_session_summary_indexed_for_recall(tmp_path):
    mem = MemoryManager(_cfg(tmp_path))
    sid = mem.start_session()
    mem.index_session(sid, "Goal: configure the CI pipeline | Tools: write_file | Outcome: added github actions")
    # The default embedder is lexical/sub-word (no model download), so recall
    # works on shared surface terms; a real embeddings provider adds synonymy.
    hits = mem.recall("how did we configure the CI pipeline")
    assert any(h.kind == "session" for h in hits)
