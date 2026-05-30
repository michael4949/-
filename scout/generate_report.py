#!/usr/bin/env python3
"""GitHub AI 雷达 · 报告生成器（每个项目一个独立 HTML）

输入：一份「已确认」JSON（你确认要纳入的仓库 + 我写的「厉害在哪」分析）
输出（发布到仓库根 docs/，供 GitHub Pages 托管）：
  docs/<日期>/<owner>__<repo>.html   每个项目一个自包含、可离线、可下载的 HTML
  docs/index.html                     全部项目的归档画廊（按日期分组，站点首页）
  docs/manifest.json                  归档索引数据

已确认 JSON 结构见 scout/README.md。用法：
  python3 scout/generate_report.py                          # 读 data/confirmed-<今天>.json
  python3 scout/generate_report.py path/to/confirmed.json   # 指定文件
"""

from __future__ import annotations

import datetime as dt
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
DATA_DIR = os.path.join(HERE, "data")
# 发布站点放在仓库根 docs/（GitHub Pages 经典模式只支持根目录或 /docs）
REPORTS_DIR = os.path.join(REPO_ROOT, "docs")
MANIFEST_PATH = os.path.join(REPORTS_DIR, "manifest.json")

LANE_LABEL = {"rising": "🆕 新星", "active": "🔥 热推"}


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


def safe_name(full_name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", full_name.replace("/", "__")).strip("-")


# --- 极简 Markdown → HTML（用于「厉害在哪」分析文本）------------------------

def _inline(text: str) -> str:
    text = esc(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)",
                  r'<a href="\2" target="_blank" rel="noopener">\1</a>', text)
    return text


def md_to_html(text: str) -> str:
    if not text:
        return ""
    lines = text.strip().split("\n")
    out, i = [], 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            i += 1
            continue
        if re.match(r"^\s*[-*]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                items.append("<li>" + _inline(re.sub(r"^\s*[-*]\s+", "", lines[i])) + "</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue
        if re.match(r"^\s*\d+[.)]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\s*\d+[.)]\s+", lines[i]):
                items.append("<li>" + _inline(re.sub(r"^\s*\d+[.)]\s+", "", lines[i])) + "</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^\s*([-*]|\d+[.)])\s+", lines[i]):
            para.append(lines[i].rstrip())
            i += 1
        out.append("<p>" + "<br>".join(_inline(p) for p in para) + "</p>")
    return "\n".join(out)


def fmt_num(n) -> str:
    try:
        n = int(n)
    except (TypeError, ValueError):
        return "—"
    if n >= 1000:
        return f"{n/1000:.1f}k".replace(".0k", "k")
    return str(n)


def days_ago(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        d = dt.datetime.strptime(iso[:10], "%Y-%m-%d").date()
    except ValueError:
        return iso[:10]
    delta = (dt.datetime.utcnow().date() - d).days
    if delta <= 0:
        return "今天"
    if delta == 1:
        return "昨天"
    if delta < 30:
        return f"{delta} 天前"
    if delta < 365:
        return f"{delta // 30} 个月前"
    return f"{delta // 365} 年前"


STYLE = """
:root{
  --c900:#0f172a; --c800:#1e293b; --c700:#334155; --gold:#ca8a04; --gold-soft:#fde68a;
  --light:#f8fafc; --line:#e2e8f0; --muted:#64748b; --ink:#0f172a; --card:#ffffff;
}
*{box-sizing:border-box}
body{margin:0;font-family:'Inter',system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
  color:var(--ink);background:var(--light);line-height:1.68;-webkit-font-smoothing:antialiased}
h1,h2,h3,.serif{font-family:'Playfair Display',Georgia,'Songti SC',serif}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
code{background:#f1f5f9;border:1px solid var(--line);border-radius:5px;padding:.08em .4em;font-size:.86em;
  font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace}
.wrap{max-width:880px;margin:0 auto;padding:0 22px}

.hero{background:linear-gradient(135deg,var(--c900),var(--c800) 55%,#243042);color:#fff;
  padding:46px 0 40px;border-bottom:3px solid var(--gold)}
.hero .kicker{letter-spacing:.3em;text-transform:uppercase;font-size:11.5px;color:var(--gold-soft);font-weight:600}
.hero .toprow{display:flex;align-items:center;gap:16px;margin-top:16px}
.hero .avatar{width:62px;height:62px;border-radius:14px;border:1px solid rgba(255,255,255,.2);flex:none;background:#1e293b}
.hero h1{font-size:clamp(26px,4.4vw,42px);margin:.1em 0 .05em;font-weight:700;word-break:break-word}
.hero .owner{color:#cbd5e1;font-size:14.5px}
.hero .tagline{margin-top:16px;max-width:720px;color:#e8edf4;font-size:17px;line-height:1.6}
.badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.badge{font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px}
.badge.cat{background:rgba(99,102,241,.22);color:#c7d2fe;border:1px solid rgba(129,140,248,.4)}
.badge.rising{background:rgba(16,185,129,.18);color:#a7f3d0;border:1px solid rgba(16,185,129,.4)}
.badge.active{background:rgba(249,115,22,.18);color:#fed7aa;border:1px solid rgba(249,115,22,.4)}
.badge.new{background:var(--gold);color:#3b2f00}
.hero .acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}

.stats{display:flex;gap:10px;flex-wrap:wrap;margin:-22px auto 0;position:relative;max-width:880px;padding:0 22px}
.statbar{display:flex;flex-wrap:wrap;gap:0;background:#fff;border:1px solid var(--line);border-radius:14px;
  box-shadow:0 14px 30px -18px rgba(15,23,42,.4);overflow:hidden;width:100%}
.statbar .s{flex:1 1 110px;padding:14px 16px;border-right:1px solid var(--line)}
.statbar .s:last-child{border-right:none}
.statbar .s .v{font-weight:700;font-size:18px;font-family:'Playfair Display',serif}
.statbar .s .k{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-top:1px}

section.block{background:#fff;border:1px solid var(--line);border-radius:16px;margin:22px 0;padding:24px 26px;
  box-shadow:0 1px 2px rgba(15,23,42,.04)}
section.why{background:linear-gradient(180deg,#fffdf5,#fff);border:1px solid #f3e3ad}
h2.sec{font-size:21px;margin:0 0 12px;display:flex;align-items:center;gap:9px}
.why h2.sec{color:#92660a}
.why p{margin:.6em 0;font-size:15.8px;color:#3a3320}.why ul,.why ol{margin:.5em 0;padding-left:1.35em}
.why li{margin:.3em 0}
.highlights{margin-top:16px;display:grid;gap:9px}
.hl{display:flex;gap:11px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:10px;padding:11px 14px;font-size:15px}
.hl .dot{color:var(--gold);font-weight:700;margin-top:1px}
.desc{color:var(--c700);border-left:3px solid var(--gold);padding:2px 0 2px 14px;font-size:15.5px;margin:0}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}
.chip{font-size:12.5px;color:var(--c700);background:#f1f5f9;border:1px solid var(--line);border-radius:6px;padding:3px 10px}
details.readme{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fcfcfd;margin-top:4px}
details.readme summary{cursor:pointer;padding:13px 18px;font-weight:600;font-size:14.5px;color:var(--c700);
  background:#f8fafc;user-select:none;list-style:none}
details.readme summary::-webkit-details-marker{display:none}
details.readme summary::before{content:'▸ ';color:var(--gold)}
details.readme[open] summary::before{content:'▾ '}
details.readme pre{margin:0;padding:18px;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.65;
  max-height:520px;overflow:auto;font-family:ui-monospace,Menlo,Consolas,monospace;color:#334155}

.btn{display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px;border:1px solid var(--line)}
.btn.primary{background:#fff;color:var(--c900);border-color:#fff}.btn.primary:hover{background:#f1f5f9;text-decoration:none}
.btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.3)}.btn.ghost:hover{border-color:var(--gold);color:var(--gold-soft);text-decoration:none}
.btn.dark{background:var(--c900);color:#fff;border-color:var(--c900)}.btn.dark:hover{background:var(--c800);text-decoration:none}
.btn.line{background:#fff;color:var(--c700)}.btn.line:hover{border-color:var(--gold);color:var(--gold);text-decoration:none}

.foot{color:var(--muted);font-size:13px;text-align:center;padding:36px 0 56px;line-height:1.9}
.foot .sep{color:var(--line)}
.backlink{display:inline-block;margin:20px 0 0;font-size:13.5px}
@media(max-width:560px){section.block{padding:20px 16px}.hero{padding:36px 0 34px}.statbar .s{flex-basis:50%}}
"""

FONT_LINK = ('<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&'
             'family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">')


def render_project_page(it: dict, date: str, day_title: str) -> str:
    lane = it.get("lane", "rising")
    badges = []
    if it.get("category"):
        badges.append(f'<span class="badge cat">{esc(it["category"])}</span>')
    badges.append(f'<span class="badge {esc(lane)}">{LANE_LABEL.get(lane, esc(lane))}</span>')
    if it.get("is_new_to_you"):
        badges.append('<span class="badge new">今日新出现</span>')

    stat_cells = [
        ("⭐ Stars", fmt_num(it.get("stars"))),
        ("🍴 Forks", fmt_num(it.get("forks"))),
        ("💬 Issues", fmt_num(it.get("open_issues"))),
        ("🧩 语言", esc(it.get("language") or "—")),
        ("⚖️ 许可证", esc(it.get("license") or "—")),
        ("🌱 创建", esc((it.get("created_at") or "—")[:10])),
        ("🔄 推送", days_ago(it.get("pushed_at"))),
    ]
    statbar = "".join(
        f'<div class="s"><div class="v">{v}</div><div class="k">{k}</div></div>'
        for k, v in stat_cells
    )

    highlights = it.get("highlights") or []
    hl_html = ""
    if highlights:
        rows = "".join(
            f'<div class="hl"><span class="dot">◆</span><span>{_inline(h)}</span></div>'
            for h in highlights
        )
        hl_html = f'<div class="highlights">{rows}</div>'

    why = it.get("why_impressive") or ""
    why_block = (f'<section class="block why"><h2 class="sec">💡 厉害在哪</h2>{md_to_html(why)}{hl_html}</section>'
                 if (why or highlights) else "")

    topics = (it.get("topics") or [])
    chips = "".join(f'<span class="chip">#{esc(t)}</span>' for t in topics[:16])
    topics_block = (f'<section class="block"><h2 class="sec">🏷️ 主题标签</h2><div class="chips">{chips}</div></section>'
                    if chips else "")

    readme = it.get("readme_excerpt")
    readme_block = ""
    if readme:
        readme_block = (
            '<section class="block"><h2 class="sec">📄 README 摘录</h2>'
            '<details class="readme" open><summary>原始 README（节选）</summary>'
            f'<pre>{esc(readme)}</pre></details></section>'
        )

    homepage = it.get("homepage")
    home_btn = (f'<a class="btn ghost" href="{esc(homepage)}" target="_blank" rel="noopener">🌐 项目主页</a>'
                if homepage else "")
    tagline = f'<p class="tagline">{esc(it.get("description"))}</p>' if it.get("description") else ""

    title = f'{esc(it.get("full_name"))} · GitHub AI 雷达'
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
{FONT_LINK}
<style>{STYLE}</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <div class="kicker">GitHub · AI Radar · {esc(date)}</div>
    <div class="toprow">
      <img class="avatar" src="{esc(it.get('owner_avatar'))}" alt="{esc(it.get('owner'))}" loading="lazy">
      <div>
        <h1>{esc(it.get('name') or it.get('full_name'))}</h1>
        <div class="owner">{esc(it.get('full_name'))} · by {esc(it.get('owner'))}</div>
      </div>
    </div>
    {tagline}
    <div class="badges">{''.join(badges)}</div>
    <div class="acts">
      <a class="btn primary" href="{esc(it.get('html_url'))}" target="_blank" rel="noopener">↗ 在 GitHub 打开</a>
      {home_btn}
    </div>
  </div>
</header>
<div class="stats"><div class="statbar">{statbar}</div></div>
<main class="wrap">
  {why_block}
  {topics_block}
  {readme_block}
  <a class="backlink" href="../index.html">← 返回 AI 雷达归档</a>
</main>
<footer class="foot">
  <div class="wrap">
    《{esc(day_title)}》<span class="sep"> · </span>{esc(date)}<br>
    本页由 <strong>GitHub AI 雷达</strong> 自动采集、经你确认后生成。数据来源：GitHub 搜索 API；「厉害在哪」为 AI 分析。<br>
    自包含单文件 · 可离线查看 · 可下载留存
  </div>
</footer>
</body>
</html>"""


# --- 归档画廊（按日期分组）-------------------------------------------------

def update_manifest(entries_for_date: list[dict], date: str) -> list[dict]:
    manifest = []
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = []
    manifest = [m for m in manifest if m.get("date") != date]
    manifest.extend(entries_for_date)
    manifest.sort(key=lambda m: (m.get("date", ""), -int(m.get("stars") or 0)), reverse=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return manifest


def render_index(manifest: list[dict]) -> str:
    by_date: dict[str, list[dict]] = {}
    titles: dict[str, str] = {}
    for m in manifest:
        by_date.setdefault(m["date"], []).append(m)
        titles.setdefault(m["date"], m.get("day_title", "每日精选"))
    sections = []
    for date in sorted(by_date.keys(), reverse=True):
        items = sorted(by_date[date], key=lambda m: -int(m.get("stars") or 0))
        cards = []
        for m in items:
            cards.append(f"""
        <a class="g-card" href="{esc(m['file'])}">
          <div class="g-row"><span class="g-cat">{esc(m.get('category','') or '—')}</span><span class="g-star">⭐{fmt_num(m.get('stars',0))}</span></div>
          <div class="g-name">{esc(m['full_name'])}</div>
          <div class="g-desc">{esc((m.get('description') or '')[:84])}</div>
        </a>""")
        sections.append(f"""
    <div class="g-date-h"><span class="d">{esc(date)}</span><span class="t">{esc(titles[date])}</span><span class="c">{len(items)} 个项目</span></div>
    <div class="g-grid">{''.join(cards)}</div>""")
    body = "\n".join(sections) or '<p style="color:#64748b">还没有报告。运行爬虫并确认后即可生成。</p>'
    gen = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    total = len(manifest)
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitHub AI 雷达 · 报告归档</title>
{FONT_LINK}
<style>{STYLE}
.g-date-h{{display:flex;align-items:baseline;gap:14px;margin:34px 0 4px;border-bottom:2px solid var(--gold);padding-bottom:8px}}
.g-date-h .d{{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--c900)}}
.g-date-h .t{{color:var(--c700);font-size:15px}}
.g-date-h .c{{margin-left:auto;color:var(--muted);font-size:13px}}
.g-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:16px;margin:16px 0}}
.g-card{{display:block;background:#fff;border:1px solid var(--line);border-radius:13px;padding:16px 18px;color:var(--ink);
  box-shadow:0 10px 24px -20px rgba(15,23,42,.4);transition:.15s}}
.g-card:hover{{border-color:var(--gold);transform:translateY(-2px);text-decoration:none;box-shadow:0 16px 30px -18px rgba(202,138,4,.45)}}
.g-row{{display:flex;justify-content:space-between;align-items:center;font-size:12px}}
.g-cat{{color:#4338ca;background:#eef2ff;border:1px solid #e0e7ff;border-radius:999px;padding:2px 9px;font-weight:600}}
.g-star{{color:var(--gold);font-weight:700}}
.g-name{{font-weight:700;font-size:15.5px;margin:9px 0 5px;word-break:break-word}}
.g-desc{{color:var(--muted);font-size:13px;line-height:1.55}}
</style>
</head>
<body>
<header class="hero"><div class="wrap">
  <div class="kicker">GitHub · AI Radar</div>
  <h1>报告归档</h1>
  <div class="owner" style="margin-top:8px">每个项目一份独立报告 · 共 {total} 篇</div>
</div></header>
<main class="wrap">
  {body}
</main>
<footer class="foot"><div class="wrap">GitHub AI 雷达 · 归档更新于 {gen}</div></footer>
</body>
</html>"""


def main() -> int:
    cfg = {}
    cfg_path = os.path.join(HERE, "config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    default_title = cfg.get("report_title", "GitHub AI 雷达 · 每日精选")

    today = dt.datetime.utcnow().date().isoformat()
    in_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA_DIR, f"confirmed-{today}.json")
    if not os.path.exists(in_path):
        print(f"找不到已确认文件: {in_path}", file=sys.stderr)
        print("请先准备 confirmed JSON（结构见 scout/README.md）。", file=sys.stderr)
        return 1

    with open(in_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("items") or []
    if not items:
        print("已确认文件里没有 items，终止。", file=sys.stderr)
        return 1

    date = data.get("date") or today
    day_title = data.get("title") or default_title
    out_dir = os.path.join(REPORTS_DIR, date)
    os.makedirs(out_dir, exist_ok=True)

    entries = []
    written = []
    for it in items:
        fn = it["full_name"]
        fname = safe_name(fn) + ".html"
        with open(os.path.join(out_dir, fname), "w", encoding="utf-8") as f:
            f.write(render_project_page(it, date, day_title))
        written.append(os.path.join("docs", date, fname))
        entries.append({
            "date": date,
            "day_title": day_title,
            "full_name": fn,
            "name": it.get("name") or fn.split("/")[-1],
            "owner": it.get("owner"),
            "category": it.get("category"),
            "stars": int(it.get("stars") or 0),
            "lane": it.get("lane"),
            "description": it.get("description"),
            "file": f"{date}/{fname}",
            "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        })

    manifest = update_manifest(entries, date)
    with open(os.path.join(REPORTS_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(render_index(manifest))

    print(f"✅ 已为 {len(items)} 个项目各生成独立 HTML（{date}）：")
    for p in written:
        print(f"   · {p}")
    print(f"✅ 归档画廊（站点首页）已更新: docs/index.html（共 {len(manifest)} 篇）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
