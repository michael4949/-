"""GitHub 访问助手（仅依赖标准库）。

设计要点：
- 搜索走 api.github.com（带 User-Agent；若环境有 GITHUB_TOKEN/GH_TOKEN 则自动用上以提速率）。
- README 走 raw.githubusercontent.com（CDN，不计入 API 速率限制）。
- 自动处理搜索接口的速率限制：剩余为 0 时按 reset 时间等待后重试一次。
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.github.com"
RAW = "https://raw.githubusercontent.com"
UA = "claude-code-ai-radar"

README_CANDIDATE_PATHS = [
    "README.md", "readme.md", "Readme.md", "README.MD",
    "README.rst", "README", "README.txt", "docs/README.md", ".github/README.md",
]


def _token() -> str | None:
    for var in ("GITHUB_TOKEN", "GH_TOKEN", "GITHUB_PAT"):
        v = os.environ.get(var)
        if v:
            return v.strip()
    return None


def _request(url: str, accept: str = "application/vnd.github+json", timeout: int = 20):
    req = urllib.request.Request(url)
    req.add_header("User-Agent", UA)
    req.add_header("Accept", accept)
    tok = _token()
    if tok:
        req.add_header("Authorization", f"Bearer {tok}")
    return urllib.request.urlopen(req, timeout=timeout)


def api_get(url: str, accept: str = "application/vnd.github+json", _retried: bool = False):
    """GET a GitHub API URL → parsed JSON. Handles search rate-limit with one wait+retry."""
    try:
        with _request(url, accept=accept) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        remaining = e.headers.get("X-RateLimit-Remaining")
        reset = e.headers.get("X-RateLimit-Reset")
        if e.code in (403, 429) and remaining == "0" and reset and not _retried:
            wait = max(0, int(reset) - int(time.time())) + 2
            wait = min(wait, 75)  # 搜索窗口约 60s，封顶等待
            print(f"  · 触发速率限制，等待 {wait}s 后重试…", flush=True)
            time.sleep(wait)
            return api_get(url, accept=accept, _retried=True)
        body = ""
        try:
            body = e.read().decode("utf-8")[:300]
        except Exception:
            pass
        raise RuntimeError(f"GitHub API {e.code} for {url}\n{body}") from e


def search_repositories(q: str, sort: str = "stars", order: str = "desc", per_page: int = 40) -> list[dict]:
    params = urllib.parse.urlencode({"q": q, "sort": sort, "order": order, "per_page": per_page})
    data = api_get(f"{API}/search/repositories?{params}")
    return data.get("items", [])


# --- README via raw CDN（免速率限制）---------------------------------------

_BADGE_LINE = re.compile(r"^\s*\[!\[.*?\]\(.*?\)\]\(.*?\)\s*$")
_IMG_LINE = re.compile(r"^\s*!\[.*?\]\(.*?\)\s*$")
_HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_HTML_TAG = re.compile(r"<[^>]+>")
_MULTI_BLANK = re.compile(r"\n{3,}")


def clean_readme(text: str) -> str:
    text = _HTML_COMMENT.sub("", text)
    out_lines = []
    for line in text.splitlines():
        if _BADGE_LINE.match(line) or _IMG_LINE.match(line):
            continue
        line = _HTML_TAG.sub("", line)  # 去掉 <p align> 等标签，保留文字
        out_lines.append(line.rstrip())
    text = "\n".join(out_lines)
    text = _MULTI_BLANK.sub("\n\n", text)
    return text.strip()


def fetch_readme(full_name: str, default_branch: str, max_chars: int = 4200) -> str | None:
    branch = default_branch or "main"
    for path in README_CANDIDATE_PATHS:
        url = f"{RAW}/{full_name}/{branch}/{urllib.parse.quote(path)}"
        try:
            with _request(url, accept="text/plain", timeout=12) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
        except Exception:
            continue
        if raw and raw.strip():
            cleaned = clean_readme(raw)
            if len(cleaned) > max_chars:
                cleaned = cleaned[:max_chars].rstrip() + " …"
            return cleaned
    return None
