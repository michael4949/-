"""SQLite persistence: sessions, messages (FTS5), and semantic vectors.

This is memory Layer 5 (episodic logs, full-text searchable) plus the storage
backing Layer 3 (vectors). Everything is plain ``sqlite3`` — FTS5 ships with the
stdlib build, so there are no external dependencies.
"""

from __future__ import annotations

import array
import json
import sqlite3
from pathlib import Path
from typing import Iterable, Optional

from ..types import Message, Role, ToolCall, new_id, now

_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id                TEXT PRIMARY KEY,
    profile           TEXT NOT NULL,
    parent_session_id TEXT,
    channel           TEXT DEFAULT 'cli',
    title             TEXT DEFAULT '',
    summary           TEXT DEFAULT '',
    created_at        REAL NOT NULL,
    updated_at        REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    tool_name  TEXT,
    tool_calls TEXT,                       -- JSON for assistant tool_use blocks
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);

-- Full-text index over message content (Layer 5 episodic recall).
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    session_id UNINDEXED,
    message_id UNINDEXED,
    role UNINDEXED,
    tokenize = 'unicode61'
);

-- Semantic vectors over notes + session summaries (Layer 3).
CREATE TABLE IF NOT EXISTS vectors (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,              -- 'session' | 'note' | 'skill'
    ref_id     TEXT NOT NULL,
    text       TEXT NOT NULL,
    vector     BLOB NOT NULL,              -- packed float32
    created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vectors_kind ON vectors(kind);
"""


def _pack(vec: list[float]) -> bytes:
    return array.array("f", vec).tobytes()


def _unpack(blob: bytes) -> list[float]:
    a = array.array("f")
    a.frombytes(blob)
    return list(a)


class MemoryStore:
    def __init__(self, db_path: str | Path):
        self.path = str(db_path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    # ----- sessions -----------------------------------------------------
    def create_session(
        self,
        profile: str,
        *,
        channel: str = "cli",
        parent_session_id: Optional[str] = None,
        title: str = "",
    ) -> str:
        sid = new_id("sess_")
        ts = now()
        self._conn.execute(
            "INSERT INTO sessions(id, profile, parent_session_id, channel, title, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (sid, profile, parent_session_id, channel, title, ts, ts),
        )
        self._conn.commit()
        return sid

    def update_session(self, session_id: str, *, title: Optional[str] = None, summary: Optional[str] = None) -> None:
        sets, args = [], []
        if title is not None:
            sets.append("title=?"); args.append(title)
        if summary is not None:
            sets.append("summary=?"); args.append(summary)
        if not sets:
            return
        sets.append("updated_at=?"); args.append(now())
        args.append(session_id)
        self._conn.execute(f"UPDATE sessions SET {', '.join(sets)} WHERE id=?", args)
        self._conn.commit()

    def recent_sessions(self, profile: str, limit: int = 20) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM sessions WHERE profile=? ORDER BY updated_at DESC LIMIT ?",
            (profile, limit),
        ).fetchall()
        return [dict(r) for r in rows]

    # ----- messages -----------------------------------------------------
    def add_message(self, session_id: str, message: Message) -> str:
        mid = new_id("msg_")
        tool_calls_json = (
            json.dumps([{"id": tc.id, "name": tc.name, "arguments": tc.arguments} for tc in message.tool_calls])
            if message.tool_calls
            else None
        )
        self._conn.execute(
            "INSERT INTO messages(id, session_id, role, content, tool_name, tool_calls, created_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (mid, session_id, message.role.value, message.content, message.name, tool_calls_json, message.created_at),
        )
        # Index user/assistant prose for episodic search; skip tool noise.
        if message.role in (Role.USER, Role.ASSISTANT) and message.content.strip():
            self._conn.execute(
                "INSERT INTO messages_fts(content, session_id, message_id, role) VALUES (?,?,?,?)",
                (message.content, session_id, mid, message.role.value),
            )
        self._conn.execute("UPDATE sessions SET updated_at=? WHERE id=?", (now(), session_id))
        self._conn.commit()
        return mid

    def get_messages(self, session_id: str) -> list[Message]:
        rows = self._conn.execute(
            "SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC", (session_id,)
        ).fetchall()
        out: list[Message] = []
        for r in rows:
            tcs = []
            if r["tool_calls"]:
                tcs = [ToolCall(id=t["id"], name=t["name"], arguments=t["arguments"]) for t in json.loads(r["tool_calls"])]
            out.append(
                Message(
                    role=Role(r["role"]),
                    content=r["content"],
                    tool_calls=tcs,
                    name=r["tool_name"],
                    created_at=r["created_at"],
                )
            )
        return out

    def search_fts(self, query: str, *, profile: Optional[str] = None, limit: int = 8) -> list[dict]:
        """Full-text episodic search (Layer 5). Returns snippets with session ids."""
        q = _fts_query(query)
        if not q:
            return []
        sql = (
            "SELECT f.message_id, f.session_id, f.role, "
            "       snippet(messages_fts, 0, '[', ']', ' … ', 12) AS snippet, "
            "       bm25(messages_fts) AS score "
            "FROM messages_fts f "
        )
        args: list = [q]
        if profile:
            sql += "JOIN sessions s ON s.id = f.session_id WHERE messages_fts MATCH ? AND s.profile = ? "
            args.append(profile)
        else:
            sql += "WHERE messages_fts MATCH ? "
        sql += "ORDER BY score LIMIT ?"
        args.append(limit)
        try:
            rows = self._conn.execute(sql, args).fetchall()
        except sqlite3.OperationalError:
            return []
        return [dict(r) for r in rows]

    # ----- vectors (Layer 3) -------------------------------------------
    def upsert_vector(self, kind: str, ref_id: str, text: str, vector: list[float]) -> str:
        existing = self._conn.execute(
            "SELECT id FROM vectors WHERE kind=? AND ref_id=?", (kind, ref_id)
        ).fetchone()
        if existing:
            self._conn.execute(
                "UPDATE vectors SET text=?, vector=?, created_at=? WHERE id=?",
                (text, _pack(vector), now(), existing["id"]),
            )
            self._conn.commit()
            return existing["id"]
        vid = new_id("vec_")
        self._conn.execute(
            "INSERT INTO vectors(id, kind, ref_id, text, vector, created_at) VALUES (?,?,?,?,?,?)",
            (vid, kind, ref_id, text, _pack(vector), now()),
        )
        self._conn.commit()
        return vid

    def iter_vectors(self, kinds: Optional[Iterable[str]] = None):
        if kinds:
            placeholders = ",".join("?" for _ in kinds)
            rows = self._conn.execute(
                f"SELECT id, kind, ref_id, text, vector FROM vectors WHERE kind IN ({placeholders})",
                tuple(kinds),
            )
        else:
            rows = self._conn.execute("SELECT id, kind, ref_id, text, vector FROM vectors")
        for r in rows:
            yield {"id": r["id"], "kind": r["kind"], "ref_id": r["ref_id"], "text": r["text"], "vector": _unpack(r["vector"])}

    def count(self, table: str) -> int:
        if table not in {"sessions", "messages", "vectors"}:
            raise ValueError(table)
        return self._conn.execute(f"SELECT COUNT(*) AS c FROM {table}").fetchone()["c"]


def _fts_query(text: str) -> str:
    """Turn free text into a safe FTS5 OR-query of bare terms."""
    terms = [t for t in __import__("re").findall(r"[\w一-鿿]+", text) if len(t) > 1]
    if not terms:
        return ""
    # Quote each term to neutralize FTS5 operators, OR them for recall.
    return " OR ".join(f'"{t}"' for t in terms[:12])
