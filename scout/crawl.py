#!/usr/bin/env python3
"""GitHub AI 雷达 · 爬虫

抓取「最新 + 高 star」的 AI 相关仓库，产出当日候选清单：
  scout/data/candidates-YYYY-MM-DD.json

两条赛道：
  · rising（新星）：最近 N 天内创建、却已积累一定 star 的新项目 —— 抓“最新且窜升”
  · active（热推）：star 量大且最近几天有推送的活跃项目 —— 抓“仍在高速迭代的明星项目”

只用 GitHub 搜索接口（带 User-Agent；有 token 自动用），README 走 raw CDN。
跨天去重：之前日子出现过的仓库默认不再重复出现（见 data/seen.json）。

用法：
  python3 scout/crawl.py                 # 正常抓取
  python3 scout/crawl.py --show-seen     # 不去重，连之前出现过的也显示
  python3 scout/crawl.py --no-readme     # 跳过 README 抓取（更快）
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys
import time

import gh

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
CONFIG_PATH = os.path.join(HERE, "config.json")
SEEN_PATH = os.path.join(DATA_DIR, "seen.json")


def load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_seen() -> dict:
    if os.path.exists(SEEN_PATH):
        try:
            with open(SEEN_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_seen(seen: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(SEEN_PATH, "w", encoding="utf-8") as f:
        json.dump(seen, f, ensure_ascii=False, indent=2, sort_keys=True)


def is_ai_related(repo: dict, cfg: dict) -> bool:
    topics = set(t.lower() for t in (repo.get("topics") or []))
    if topics & set(cfg["ai_topics"]):
        return True
    text = f"{repo.get('name','')} {repo.get('description','') or ''}".lower()
    return any(k in text for k in cfg["ai_keywords"])


def looks_like_list(repo: dict) -> bool:
    name = (repo.get("name") or "").lower()
    topics = set(t.lower() for t in (repo.get("topics") or []))
    desc = (repo.get("description") or "").lower()
    if name.startswith("awesome") or "awesome" in topics:
        return True
    bad = {"roadmap", "interview", "cheatsheet", "book", "books", "course", "tutorials-list"}
    return bool(topics & bad) or "awesome list" in desc


def slim(repo: dict, lane: str, label: str) -> dict:
    return {
        "full_name": repo["full_name"],
        "name": repo["name"],
        "owner": repo["owner"]["login"],
        "owner_avatar": repo["owner"]["avatar_url"],
        "html_url": repo["html_url"],
        "description": repo.get("description") or "",
        "stars": repo.get("stargazers_count", 0),
        "forks": repo.get("forks_count", 0),
        "open_issues": repo.get("open_issues_count", 0),
        "language": repo.get("language"),
        "topics": repo.get("topics") or [],
        "license": (repo.get("license") or {}).get("spdx_id"),
        "homepage": (repo.get("homepage") or "").strip() or None,
        "default_branch": repo.get("default_branch") or "main",
        "created_at": repo.get("created_at"),
        "pushed_at": repo.get("pushed_at"),
        "lane": lane,
        "lane_label": label,
        "readme_excerpt": None,
    }


def run_queries(cfg: dict, today: dt.date) -> dict:
    rising_date = (today - dt.timedelta(days=cfg["rising_window_days"])).isoformat()
    active_date = (today - dt.timedelta(days=cfg["active_pushed_window_days"])).isoformat()
    fills = {
        "rising_date": rising_date,
        "active_date": active_date,
        "min_rising": cfg["min_rising"],
        "min_active": cfg["min_active"],
    }
    merged: dict[str, dict] = {}
    for spec in cfg["queries"]:
        q = spec["q"].format(**fills)
        if cfg.get("exclude_archived", True):
            q += " archived:false"
        print(f"· 查询 [{spec['label']}] sort={spec['sort']}  →  {q}", flush=True)
        try:
            items = gh.search_repositories(q, sort=spec["sort"], per_page=cfg["per_query_fetch"])
        except RuntimeError as e:
            print(f"  ! 查询失败，跳过：{e}", flush=True)
            continue
        print(f"  收到 {len(items)} 条", flush=True)
        for repo in items:
            fn = repo["full_name"]
            if fn in merged:
                continue  # 已被靠前的赛道（rising 优先）收录
            merged[fn] = slim(repo, spec["lane"], spec["label"])
        time.sleep(cfg.get("query_spacing_seconds", 1.0))
    return merged


def enrich_readmes(candidates: list[dict], cfg: dict) -> None:
    top = candidates[: cfg["enrich_readme_top"]]
    max_chars = cfg["readme_excerpt_chars"]
    print(f"· 抓取 README（raw CDN，免速率限制）共 {len(top)} 个…", flush=True)

    def work(c):
        c["readme_excerpt"] = gh.fetch_readme(c["full_name"], c["default_branch"], max_chars)
        return c["full_name"], bool(c["readme_excerpt"])

    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for fn, ok in ex.map(work, top):
            print(f"    {'✓' if ok else '·'} {fn}", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--show-seen", action="store_true", help="不去重，连之前出现过的也显示")
    ap.add_argument("--no-readme", action="store_true", help="跳过 README 抓取")
    ap.add_argument("--date", help="覆盖日期 YYYY-MM-DD（默认今天，UTC）")
    args = ap.parse_args()

    cfg = load_config()
    today = dt.date.fromisoformat(args.date) if args.date else dt.datetime.utcnow().date()
    today_str = today.isoformat()
    os.makedirs(DATA_DIR, exist_ok=True)

    print(f"=== GitHub AI 雷达 · 爬取 {today_str} (UTC) ===", flush=True)
    merged = run_queries(cfg, today)
    print(f"· 合并去重后共 {len(merged)} 个仓库", flush=True)

    seen = load_seen()
    candidates = []
    for c in merged.values():
        if cfg.get("exclude_awesome_lists", True) and looks_like_list(c):
            continue
        if not is_ai_related(c, cfg):
            continue
        first_seen = seen.get(c["full_name"])
        if cfg.get("exclude_seen_before_today", True) and not args.show_seen:
            if first_seen and first_seen < today_str:
                continue  # 之前的日子已经给你看过
        c["first_seen"] = first_seen or today_str
        c["is_new_to_you"] = not (first_seen and first_seen < today_str)
        candidates.append(c)

    # 排序：先 rising 后 active，组内按 star 降序
    lane_rank = {"rising": 0, "active": 1}
    candidates.sort(key=lambda c: (lane_rank.get(c["lane"], 9), -c["stars"]))
    candidates = candidates[: cfg["max_candidates"]]
    for i, c in enumerate(candidates, 1):
        c["rank"] = i

    if not args.no_readme and candidates:
        enrich_readmes(candidates, cfg)

    # 更新 seen（今天展示的都记下，跨天去重用）
    for c in candidates:
        seen.setdefault(c["full_name"], today_str)
    save_seen(seen)

    out = {
        "date": today_str,
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "config_summary": {
            "rising_window_days": cfg["rising_window_days"],
            "min_rising": cfg["min_rising"],
            "active_pushed_window_days": cfg["active_pushed_window_days"],
            "min_active": cfg["min_active"],
        },
        "count": len(candidates),
        "candidates": candidates,
    }
    out_path = os.path.join(DATA_DIR, f"candidates-{today_str}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print_summary(candidates)
    print(f"\n✅ 候选已写入: {os.path.relpath(out_path, os.path.dirname(HERE))}", flush=True)
    print("下一步：把候选清单给用户确认 → 写 confirmed JSON → python3 scout/generate_report.py", flush=True)
    return 0


def print_summary(candidates: list[dict]) -> None:
    print("\n========== 今日候选 ==========", flush=True)
    if not candidates:
        print("（无候选，可放宽 config.json 的阈值或用 --show-seen）", flush=True)
        return
    for c in candidates:
        new = "🆕" if c.get("is_new_to_you") else "  "
        created = (c["created_at"] or "")[:10]
        desc = (c["description"] or "").replace("\n", " ")
        if len(desc) > 96:
            desc = desc[:96] + "…"
        print(f"{c['rank']:>2}. {new} ⭐{c['stars']:<6} [{c['lane_label']}] "
              f"{c['full_name']}  ({c['language'] or '—'}, 建于 {created})", flush=True)
        print(f"      {desc}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
