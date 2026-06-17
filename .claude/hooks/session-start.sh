#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Prepares both subsystems in this repo so a fresh container is ready to work:
#   • AI 爆款工厂 (frontend, React/Vite/TS) -> install npm dependencies
#   • scout/ (GitHub AI 雷达, Python)        -> verify python3 (stdlib-only, no pip install)
#
# Synchronous by design: the session waits until deps are installed, so Claude
# never tries to build/run before the project is ready. Switch to async mode
# (echo '{"async": true, "asyncTimeout": 300000}' as the first line) if you'd
# rather trade that guarantee for faster session startup.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment.
# Local sessions manage their own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "[session-start] Installing frontend npm dependencies…"
# npm install (not ci) so the cached container state can be reused across sessions.
npm install --no-fund --no-audit

# scout/ imports only the Python standard library, so there is nothing to pip install.
# Just make sure the interpreter the crawler/report generator need is available.
if command -v python3 >/dev/null 2>&1; then
  echo "[session-start] python3 present: $(python3 --version 2>&1) — scout/ is stdlib-only, nothing to install."
else
  echo "[session-start] WARNING: python3 not found — the scout/ crawler will not run." >&2
fi

echo "[session-start] Setup complete."
