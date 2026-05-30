#!/usr/bin/env python3
"""GitHub AI 雷达 · 报告生成器

输入：一份「已确认」JSON（你确认要纳入的仓库 + 我写的「厉害在哪」分析）
输出：自包含、可离线查看、可下载的 HTML 报告 + 归档画廊。

  scout/reports/ai-radar-YYYY-MM-DD.html   单日报告（自包含，可直接下载/双击打开）
  scout/reports/index.html                 全部报告的归档画廊
  scout/reports/manifest.json              归档索引数据

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
DATA_DIR = os.path.join(HERE, "data")
REPORTS_DIR = os.path.join(HERE, "reports")
MANIFEST_PATH = os.path.join(REPORTS_DIR, "manifest.json")

LANE_LABEL = {"rising": "🆕 新星", "active": "🔥 热推"}


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


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
    """支持段落、- 列表、1. 列表、**粗体**、*斜体*、`代码`、[链接]()。"""
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
  color:var(--ink);background:var(--light);line-height:1.65;-webkit-font-smoothing:antialiased}
h1,h2,h3,.serif{font-family:'Playfair Display',Georgia,'Songti SC',serif}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
code{background:#f1f5f9;border:1px solid var(--line);border-radius:5px;padding:.08em .4em;font-size:.86em;
  font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace}
.wrap{max-width:1080px;margin:0 auto;padding:0 22px}

.hero{background:linear-gradient(135deg,var(--c900),var(--c800) 55%,#243042);color:#fff;
  padding:54px 0 60px;border-bottom:3px solid var(--gold)}
.hero .kicker{letter-spacing:.32em;text-transform:uppercase;font-size:12px;color:var(--gold-soft);font-weight:600}
.hero h1{font-size:clamp(30px,5vw,50px);margin:.28em 0 .12em;font-weight:700}
.hero .date{color:#cbd5e1;font-size:15px}
.hero .intro{margin-top:20px;max-width:760px;color:#e2e8f0;font-size:16.5px}
.stats{display:flex;gap:30px;margin-top:26px;flex-wrap:wrap}
.stat .n{font-size:30px;font-weight:700;color:#fff;font-family:'Playfair Display',serif}
.stat .l{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em}

.toc{display:flex;flex-wrap:wrap;gap:8px;margin:30px 0 6px}
.toc a{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);
  border-radius:999px;padding:7px 14px;font-size:13.5px;color:var(--c700);font-weight:500}
.toc a:hover{border-color:var(--gold);text-decoration:none;box-shadow:0 2px 10px rgba(202,138,4,.12)}
.toc a .r{color:var(--gold);font-weight:700}

.card{background:var(--card);border:1px solid var(--line);border-radius:16px;margin:24px 0;
  padding:26px 28px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 12px 30px -18px rgba(15,23,42,.25);scroll-margin-top:18px}
.card .top{display:flex;align-items:flex-start;gap:14px}
.avatar{width:46px;height:46px;border-radius:11px;border:1px solid var(--line);flex:none;background:#f1f5f9}
.rankbubble{flex:none;width:30px;height:30px;border-radius:50%;background:var(--c900);color:var(--gold-soft);
  font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;margin-top:6px;font-family:'Playfair Display',serif}
.namewrap{flex:1;min-width:0}
.namewrap h2{font-size:23px;margin:0 0 3px;line-height:1.25;word-break:break-word}
.namewrap h2 a{color:var(--ink)}.namewrap h2 a:hover{color:var(--gold)}
.owner{color:var(--muted);font-size:13.5px}
.badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}
.badge{font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:999px;letter-spacing:.02em}
.badge.cat{background:#eef2ff;color:#4338ca;border:1px solid #e0e7ff}
.badge.rising{background:#ecfdf5;color:#047857;border:1px solid #d1fae5}
.badge.active{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
.badge.new{background:var(--gold);color:#3b2f00}

.meta{display:flex;flex-wrap:wrap;gap:16px 22px;margin:18px 0 4px;padding:14px 0;
  border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.meta .m{display:flex;flex-direction:column;gap:1px}
.meta .m .v{font-weight:700;font-size:15px;color:var(--ink)}
.meta .m .k{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.chips{margin:14px 0 2px;display:flex;flex-wrap:wrap;gap:6px}
.chip{font-size:12px;color:var(--c700);background:#f1f5f9;border:1px solid var(--line);border-radius:6px;padding:2px 9px}
.desc{margin:14px 0 0;color:var(--c700);border-left:3px solid var(--gold);padding:2px 0 2px 14px;font-size:15.5px}

.why{margin-top:20px;background:linear-gradient(180deg,#fffdf5,#fff);border:1px solid #f5e6b8;
  border-radius:12px;padding:18px 20px}
.why h3{margin:0 0 8px;font-size:17px;color:#92660a;display:flex;align-items:center;gap:8px}
.why p{margin:.5em 0}.why ul,.why ol{margin:.4em 0;padding-left:1.3em}.why li{margin:.25em 0}
.highlights{margin-top:14px;display:grid;gap:8px}
.hl{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:9px;padding:10px 13px}
.hl .dot{color:var(--gold);font-weight:700;margin-top:1px}

details.readme{margin-top:16px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fcfcfd}
details.readme summary{cursor:pointer;padding:11px 16px;font-weight:600;font-size:14px;color:var(--c700);
  background:#f8fafc;user-select:none;list-style:none}
details.readme summary::-webkit-details-marker{display:none}
details.readme summary::before{content:'▸ ';color:var(--gold)}
details.readme[open] summary::before{content:'▾ '}
details.readme pre{margin:0;padding:16px;white-space:pre-wrap;word-break:break-word;font-size:12.8px;line-height:1.6;
  max-height:440px;overflow:auto;font-family:ui-monospace,Menlo,Consolas,monospace;color:#334155}
.links{margin-top:16px;display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;padding:9px 16px;border-radius:9px;border:1px solid var(--line)}
.btn.primary{background:var(--c900);color:#fff;border-color:var(--c900)}.btn.primary:hover{background:var(--c800);text-decoration:none}
.btn.ghost{background:#fff;color:var(--c700)}.btn.ghost:hover{border-color:var(--gold);color:var(--gold);text-decoration:none}

.foot{color:var(--muted);font-size:13px;text-align:center;padding:40px 0 56px;line-height:1.9}
.foot .sep{color:var(--line)}
@media(max-width:560px){.card{padding:20px 16px}.hero{padding:40px 0 44px}.meta{gap:12px 16px}}
"""

FONT_LINK = ('<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&'
             'family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">')


def render_card(it: dict) -> str:
    lane = it.get("lane", "rising")
    anchor = "repo-" + re.sub(r"[^a-zA-Z0-9]+", "-", it["full_name"]).strip("-").lower()
    badges = []
    if it.get("category"):
        badges.append(f'<span class="badge cat">{esc(it["category"])}</span>')
    badges.append(f'<span class="badge {esc(lane)}">{LANE_LABEL.get(lane, esc(lane))}</span>')
    if it.get("is_new_to_you"):
        badges.append('<span class="badge new">今日新出现</span>')

    meta_cells = [
        ("⭐ Stars", fmt_num(it.get("stars"))),
        ("🍴 Forks", fmt_num(it.get("forks"))),
        ("💬 Issues", fmt_num(it.get("open_issues"))),
        ("🧩 语言", esc(it.get("language") or "—")),
        ("⚖️ 许可证", esc(it.get("license") or "—")),
        ("🌱 创建于", esc((it.get("created_at") or "—")[:10])),
        ("🔄 最近推送", days_ago(it.get("pushed_at"))),
    ]
    meta = "".join(
        f'<div class="m"><span class="v">{v}</span><span class="k">{k}</span></div>'
        for k, v in meta_cells
    )

    chips = "".join(f'<span class="chip">#{esc(t)}</span>' for t in (it.get("topics") or [])[:12])
    chips_html = f'<div class="chips">{chips}</div>' if chips else ""

    highlights = it.get("highlights") or []
    hl_html = ""
    if highlights:
        rows = "".join(
            f'<div class="hl"><span class="dot">◆</span><span>{_inline(h)}</span></div>'
            for h in highlights
        )
        hl_html = f'<div class="highlights">{rows}</div>'

    why = it.get("why_impressive") or ""
    why_html = (f'<div class="why"><h3>💡 厉害在哪</h3>{md_to_html(why)}{hl_html}</div>'
                if why or highlights else "")

    readme = it.get("readme_excerpt")
    readme_html = ""
    if readme:
        readme_html = (
            '<details class="readme"><summary>展开 README 摘录（原始内容）</summary>'
            f'<pre>{esc(readme)}</pre></details>'
        )

    homepage = it.get("homepage")
    home_btn = (f'<a class="btn ghost" href="{esc(homepage)}" target="_blank" rel="noopener">🌐 项目主页</a>'
                if homepage else "")

    desc = f'<p class="desc">{esc(it.get("description"))}</p>' if it.get("description") else ""

    return f"""
<section class="card" id="{anchor}">
  <div class="top">
    <span class="rankbubble">{it.get("rank","")}</span>
    <img class="avatar" src="{esc(it.get("owner_avatar"))}" alt="{esc(it.get("owner"))}" loading="lazy">
    <div class="namewrap">
      <h2><a href="{esc(it.get("html_url"))}" target="_blank" rel="noopener">{esc(it.get("full_name"))}</a></h2>
      <div class="owner">by {esc(it.get("owner"))}</div>
      <div class="badges">{''.join(badges)}</div>
    </div>
  </div>
  {desc}
  <div class="meta">{meta}</div>
  {chips_html}
  {why_html}
  {readme_html}
  <div class="links">
    <a class="btn primary" href="{esc(it.get("html_url"))}" target="_blank" rel="noopener">↗ 在 GitHub 打开</a>
    {home_btn}
  </div>
</section>"""


def render_report(data: dict, default_title: str) -> str:
    date = data.get("date") or dt.datetime.utcnow().date().isoformat()
    title = data.get("title") or default_title
    intro = data.get("intro") or ""
    items = data.get("items") or []
    total_stars = sum(int(i.get("stars") or 0) for i in items)

    toc = "".join(
        f'<a href="#repo-{re.sub(r"[^a-zA-Z0-9]+","-",i["full_name"]).strip("-").lower()}">'
        f'<span class="r">{i.get("rank","")}</span>{esc(i["full_name"].split("/")[-1])}</a>'
        for i in items
    )
    cards = "\n".join(render_card(i) for i in items)
    gen = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    intro_html = f'<p class="intro">{esc(intro)}</p>' if intro else ""

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)} · {esc(date)}</title>
{FONT_LINK}
<style>{STYLE}</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <div class="kicker">GitHub · AI Radar</div>
    <h1>{esc(title)}</h1>
    <div class="date">📅 {esc(date)} · 经你确认留存的精选</div>
    {intro_html}
    <div class="stats">
      <div class="stat"><div class="n">{len(items)}</div><div class="l">入选项目</div></div>
      <div class="stat"><div class="n">{fmt_num(total_stars)}</div><div class="l">Star 合计</div></div>
      <div class="stat"><div class="n">{esc(date)}</div><div class="l">采集日期</div></div>
    </div>
  </div>
</header>
<main class="wrap">
  <nav class="toc">{toc}</nav>
  {cards}
</main>
<footer class="foot">
  <div class="wrap">
    本报告由 <strong>GitHub AI 雷达</strong> 自动采集候选、经你确认后生成。<br>
    数据来源：GitHub 搜索 API（star/创建/推送时间）<span class="sep"> · </span>「厉害在哪」为 AI 分析<br>
    生成时间 {gen}<span class="sep"> · </span>自包含单文件 · 可离线查看 · 可下载留存
  </div>
</footer>
</body>
</html>"""


# --- 归档画廊 ---------------------------------------------------------------

def update_manifest(entry: dict) -> list[dict]:
    manifest = []
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = []
    manifest = [m for m in manifest if m.get("date") != entry["date"]]
    manifest.append(entry)
    manifest.sort(key=lambda m: m.get("date", ""), reverse=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return manifest


def render_index(manifest: list[dict]) -> str:
    rows = []
    for m in manifest:
        names = "、".join(m.get("top_names", [])[:5])
        rows.append(f"""
    <a class="g-card" href="{esc(m['file'])}">
      <div class="g-date">{esc(m['date'])}</div>
      <div class="g-title">{esc(m.get('title',''))}</div>
      <div class="g-meta">{m.get('count',0)} 个项目 · ⭐{fmt_num(m.get('total_stars',0))} 合计</div>
      <div class="g-names">{esc(names)}</div>
    </a>""")
    cards = "\n".join(rows) or '<p style="color:#64748b">还没有报告。运行爬虫并确认后即可生成。</p>'
    gen = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GitHub AI 雷达 · 报告归档</title>
{FONT_LINK}
<style>{STYLE}
.g-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;margin:30px 0}}
.g-card{{display:block;background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px 22px;color:var(--ink);
  box-shadow:0 10px 26px -20px rgba(15,23,42,.4);transition:.15s}}
.g-card:hover{{border-color:var(--gold);transform:translateY(-2px);text-decoration:none;box-shadow:0 16px 30px -18px rgba(202,138,4,.4)}}
.g-date{{color:var(--gold);font-weight:700;font-size:13px;letter-spacing:.08em}}
.g-title{{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin:4px 0 8px}}
.g-meta{{color:var(--c700);font-size:13.5px}}
.g-names{{color:var(--muted);font-size:12.5px;margin-top:8px;line-height:1.6}}
</style>
</head>
<body>
<header class="hero"><div class="wrap">
  <div class="kicker">GitHub · AI Radar</div>
  <h1>报告归档</h1>
  <div class="date">每日精选的留存档案 · 共 {len(manifest)} 期</div>
</div></header>
<main class="wrap">
  <div class="g-grid">{cards}</div>
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

    os.makedirs(REPORTS_DIR, exist_ok=True)
    date = data.get("date") or today
    html_out = render_report(data, default_title)
    report_file = f"ai-radar-{date}.html"
    report_path = os.path.join(REPORTS_DIR, report_file)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html_out)

    manifest = update_manifest({
        "date": date,
        "title": data.get("title") or default_title,
        "file": report_file,
        "count": len(items),
        "total_stars": sum(int(i.get("stars") or 0) for i in items),
        "top_names": [i["full_name"].split("/")[-1] for i in items[:5]],
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
    })
    with open(os.path.join(REPORTS_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(render_index(manifest))

    rel = os.path.relpath(report_path, os.path.dirname(HERE))
    print(f"✅ 报告已生成: {rel}")
    print(f"✅ 归档画廊已更新: {os.path.relpath(os.path.join(REPORTS_DIR, 'index.html'), os.path.dirname(HERE))}")
    print(f"   含 {len(items)} 个项目 · ⭐{fmt_num(sum(int(i.get('stars') or 0) for i in items))} 合计")
    return 0


if __name__ == "__main__":
    sys.exit(main())
