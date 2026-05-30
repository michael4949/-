"""A tiny zero-dependency JSON API exposing the agent to the React console.

Uses only ``http.server`` so it runs in the sandbox without FastAPI. Endpoints:

    GET  /api/health
    GET  /api/skills                  -> [{name, category, description, ...}]
    GET  /api/skills/<name>           -> {markdown}
    GET  /api/memory                  -> stats + prompt-memory bullets
    GET  /api/sessions                -> recent sessions
    POST /api/chat {message,session}  -> {session, answer, events[]}

CORS is wide-open for local dev (the Vite console on :5173 calls :8765).
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .agent import Agent
from .config import MnemoConfig
from .llm import build_provider
from .types import EventType


def _agent(profile=None, provider=None) -> Agent:
    cfg = MnemoConfig.load(profile=profile, provider=provider)
    return Agent(cfg)


def friendly_error(err: str) -> str:
    """Map a raw exception string to actionable, localized guidance."""
    low = err.lower()
    if "anthropic" in low and ("包" in err or "install" in low or "module" in low):
        return "Claude 依赖没装好。请在终端运行  pip install anthropic  后重启，或先用离线模式。"
    if "还没配置" in err or "api key" in low or "api_key" in low:
        return "还没配好 Claude 的 key。请运行  mnemo setup，或改用离线模式（mnemo serve --provider scripted）。"
    if "401" in err or "authentication" in low or "x-api-key" in low:
        return "Claude 的 key 无效或已失效。请去 console.anthropic.com 重新生成，再运行 mnemo setup。"
    return f"出错了：{err}"


class _Handler(BaseHTTPRequestHandler):
    profile = None
    provider = None

    def log_message(self, *a):  # quiet by default
        pass

    # ----- helpers -----
    def _send(self, code: int, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):  # CORS preflight
        self._send(204, {})

    def do_GET(self):
        path = self.path.split("?", 1)[0].rstrip("/")
        try:
            if path == "/api/health":
                cfg = MnemoConfig.load(profile=self.profile, provider=self.provider)
                # Probe the provider so the console can report the *real* status,
                # instead of showing "connected" while chat is actually broken.
                provider_ok, provider_error = True, None
                try:
                    build_provider(cfg)
                except Exception as e:
                    provider_ok, provider_error = False, friendly_error(str(e))
                return self._send(200, {
                    "ok": True,
                    "service": "mnemo",
                    "profile": cfg.profile,
                    "provider": cfg.provider,
                    "model": cfg.model,
                    "claude_configured": bool(cfg.get_anthropic_key()),
                    "provider_ok": provider_ok,
                    "provider_error": provider_error,
                })
            if path == "/api/skills":
                agent = _agent(self.profile, self.provider)
                return self._send(200, [m.__dict__ for m in agent.skills.list_meta()])
            if path.startswith("/api/skills/"):
                name = path[len("/api/skills/"):]
                agent = _agent(self.profile, self.provider)
                return self._send(200, {"markdown": agent.skills.view(name)})
            if path == "/api/memory":
                agent = _agent(self.profile, self.provider)
                stats = agent.memory.stats()
                stats["bullets"] = {
                    "memory": agent.memory.prompt.bullets("memory"),
                    "user": agent.memory.prompt.bullets("user"),
                }
                return self._send(200, stats)
            if path == "/api/sessions":
                agent = _agent(self.profile, self.provider)
                return self._send(200, agent.memory.store.recent_sessions(agent.config.profile))
            return self._send(404, {"error": "not found"})
        except Exception as e:
            return self._send(500, {"error": str(e)})

    def do_POST(self):
        path = self.path.split("?", 1)[0].rstrip("/")
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "invalid JSON"})

        if path == "/api/chat":
            message = data.get("message", "")
            session = data.get("session")
            try:
                agent = _agent(self.profile, self.provider)
                events, answer, sid = [], "", session
                for ev in agent.run(message, session_id=session, channel="web"):
                    events.append(ev.to_dict())
                    if ev.type == EventType.FINAL:
                        answer = ev.text
                        sid = ev.data.get("session_id", sid)
                return self._send(200, {"session": sid, "answer": answer, "events": events})
            except Exception as e:
                # Never surface a raw 500 to the chat UI — explain what to do.
                msg = friendly_error(str(e))
                return self._send(200, {"session": session, "answer": f"⛔ {msg}", "events": [], "error": msg})
        return self._send(404, {"error": "not found"})


def serve(host: str = "127.0.0.1", port: int = 8765, *, profile=None, provider=None) -> None:
    _Handler.profile = profile
    _Handler.provider = provider
    httpd = ThreadingHTTPServer((host, port), _Handler)
    print(f"mnemo API on http://{host}:{port}  (profile={profile or 'default'}, provider={provider or 'scripted'})")
    print("endpoints: /api/health /api/skills /api/memory /api/sessions  POST /api/chat")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nshutting down.")
        httpd.shutdown()
