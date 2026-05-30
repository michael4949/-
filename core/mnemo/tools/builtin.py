"""Built-in action tools: filesystem + a guarded shell.

The shell guard refuses obviously destructive commands (``rm -rf /``, ``curl | sh``,
fork bombs, …) before execution — a lightweight echo of Hermes' danger-command
gate. It is a safety net, not a sandbox; container/OS isolation is layered above.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

from ..types import ToolResult
from .base import ToolContext, ToolRegistry

_DANGER = [
    re.compile(r"\brm\s+-rf?\s+(/|~|\$HOME|\*)\s*$"),
    re.compile(r"\brm\s+-rf?\s+(/|~)\b"),
    re.compile(r":\(\)\s*\{.*\|.*&.*\}"),                 # fork bomb
    re.compile(r"\b(curl|wget)\b.*\|\s*(sudo\s+)?(ba)?sh\b"),  # curl | sh
    re.compile(r"\bmkfs\b|\bdd\s+if=.*of=/dev/"),
    re.compile(r">\s*/dev/sd[a-z]"),
    re.compile(r"\bchmod\s+-R\s+777\s+/"),
]


def _resolve(ctx: ToolContext, path: str) -> Path:
    p = Path(path)
    if not p.is_absolute():
        p = Path(ctx.workdir) / p
    return p


def register_builtins(reg: ToolRegistry) -> None:
    def read_file(args, ctx: ToolContext):
        p = _resolve(ctx, args["path"])
        if not p.exists():
            return ToolResult(tool_call_id="", content=f"ERROR: file not found: {p}", is_error=True)
        text = p.read_text(encoding="utf-8", errors="replace")
        max_chars = int(args.get("max_chars", 8000))
        if len(text) > max_chars:
            text = text[:max_chars] + f"\n…[truncated {len(text) - max_chars} chars]"
        return text

    def write_file(args, ctx: ToolContext):
        p = _resolve(ctx, args["path"])
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(args["content"], encoding="utf-8")
        return f"wrote {len(args['content'])} chars to {p}"

    def list_dir(args, ctx: ToolContext):
        p = _resolve(ctx, args.get("path", "."))
        if not p.exists():
            return ToolResult(tool_call_id="", content=f"ERROR: not found: {p}", is_error=True)
        entries = sorted(e.name + ("/" if e.is_dir() else "") for e in p.iterdir())
        return "\n".join(entries) if entries else "(empty)"

    def grep(args, ctx: ToolContext):
        pattern = args["pattern"]
        root = _resolve(ctx, args.get("path", "."))
        try:
            rx = re.compile(pattern)
        except re.error as e:
            return ToolResult(tool_call_id="", content=f"ERROR: bad regex: {e}", is_error=True)
        hits, limit = [], int(args.get("limit", 40))
        targets = [root] if root.is_file() else [p for p in root.rglob("*") if p.is_file()]
        for f in targets:
            try:
                for n, line in enumerate(f.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                    if rx.search(line):
                        hits.append(f"{f}:{n}: {line.strip()[:200]}")
                        if len(hits) >= limit:
                            return "\n".join(hits)
            except Exception:
                continue
        return "\n".join(hits) if hits else "(no matches)"

    def run_shell(args, ctx: ToolContext):
        cmd = args["command"]
        for rx in _DANGER:
            if rx.search(cmd):
                return ToolResult(
                    tool_call_id="",
                    content=f"BLOCKED by danger-command guard: {cmd!r}. Refuse destructive commands.",
                    is_error=True,
                )
        timeout = int(args.get("timeout", 30))
        try:
            proc = subprocess.run(
                cmd, shell=True, cwd=ctx.workdir, capture_output=True, text=True, timeout=timeout
            )
        except subprocess.TimeoutExpired:
            return ToolResult(tool_call_id="", content=f"ERROR: command timed out after {timeout}s", is_error=True)
        out = (proc.stdout or "") + (("\n[stderr]\n" + proc.stderr) if proc.stderr else "")
        out = out.strip() or "(no output)"
        if proc.returncode != 0:
            return ToolResult(tool_call_id="", content=f"[exit {proc.returncode}]\n{out}", is_error=True)
        return out[:8000]

    reg.add("read_file", "Read a UTF-8 text file.",
            {"type": "object", "properties": {"path": {"type": "string"}, "max_chars": {"type": "integer"}},
             "required": ["path"]}, read_file)
    reg.add("write_file", "Create or overwrite a text file.",
            {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
             "required": ["path", "content"]}, write_file)
    reg.add("list_dir", "List the entries of a directory.",
            {"type": "object", "properties": {"path": {"type": "string"}}}, list_dir)
    reg.add("grep", "Regex-search files under a path.",
            {"type": "object", "properties": {"pattern": {"type": "string"}, "path": {"type": "string"},
                                              "limit": {"type": "integer"}}, "required": ["pattern"]}, grep)
    reg.add("run_shell", "Run a shell command (guarded against destructive patterns).",
            {"type": "object", "properties": {"command": {"type": "string"}, "timeout": {"type": "integer"}},
             "required": ["command"]}, run_shell, dangerous=True)
