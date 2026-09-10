#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AI 会议雷达 · 聚合爬虫

把多个来源的「AI 相关会议 / 展会 / 峰会」抓下来，归一化成统一结构，与人工种子库
合并去重，产出 aiconf/data/events.json（页面直接读它）。

设计要点
  · 浏览器有 CORS，抓取必须在服务端做 —— 本脚本设计为跑在 GitHub Actions runner 上。
  · 每个源是一个独立适配器，抛异常只影响自己，不会拖垮整轮抓取。
  · 站点改版是常态，所以「抓到 0 条」不算失败，只记警告；种子库保证页面永远有内容。
  · gemini 适配器用 Google Search grounding 联网检索，是站点改版时最稳的兜底路径。

用法
  python3 aiconf/crawl.py                  # 全量抓取并写入 data/events.json
  python3 aiconf/crawl.py --only gemini    # 只跑某个源（调试用）
  python3 aiconf/crawl.py --skip gemini    # 跳过某个源
  python3 aiconf/crawl.py --dry-run        # 只打印，不写文件
  python3 aiconf/crawl.py --seed-only      # 不联网，仅用种子库重建 events.json

环境变量
  GEMINI_API_KEY   gemini 适配器需要；缺失时该源自动跳过（其余源照跑）
"""

from __future__ import annotations

import argparse
import datetime as dt
import gzip
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
CONFIG_PATH = os.path.join(HERE, "config.json")
SEED_PATH = os.path.join(DATA_DIR, "seed.json")
OUT_PATH = os.path.join(DATA_DIR, "events.json")

TODAY = dt.date.today()


def log(msg: str) -> None:
    print(msg, flush=True)


# ---------------------------------------------------------------- HTTP

def http_get(url: str, cfg: dict, headers: dict | None = None) -> str:
    """带重试与 gzip 解压的 GET。失败抛 RuntimeError。"""
    hdrs = {
        "User-Agent": cfg["user_agent"],
        "Accept": "text/html,application/json,*/*",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "gzip",
    }
    hdrs.update(headers or {})
    last = None
    for attempt in range(cfg["request_retries"] + 1):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=cfg["request_timeout"]) as resp:
                raw = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
                charset = resp.headers.get_content_charset() or "utf-8"
                return raw.decode(charset, errors="replace")
        except Exception as e:  # noqa: BLE001 - 网络层什么都可能抛
            last = e
            if attempt < cfg["request_retries"]:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"{type(last).__name__}: {last}")


def http_post_json(url: str, payload: dict, cfg: dict, headers: dict | None = None) -> dict:
    hdrs = {"Content-Type": "application/json", "User-Agent": cfg["user_agent"]}
    hdrs.update(headers or {})
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
    with urllib.request.urlopen(req, timeout=max(cfg["request_timeout"], 60)) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


# ---------------------------------------------------------------- 文本归一化

TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def strip_html(s: str) -> str:
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
    s = TAG_RE.sub(" ", s)
    for a, b in (("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")):
        s = s.replace(a, b)
    return WS_RE.sub(" ", s).strip()


def norm_key(name: str) -> str:
    """用于去重的名称键：去掉年份、届次、空白与标点，只留可比对的核心词。"""
    s = name.lower()
    s = re.sub(r"20\d{2}", "", s)
    s = re.sub(r"第[〇零一二三四五六七八九十百\d]+届", "", s)
    s = re.sub(r"[\s\-—·・.,，。、（）()【】\[\]:：|/\\'\"!！?？+&]", "", s)
    return s


# ---------------------------------------------------------------- 日期解析

CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12}

DATE_PATTERNS = [
    # 2026年9月24日 - 2026年9月26日 / 2026年9月24日-26日 / 2026年9月24日
    re.compile(r"(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*日?"
               r"(?:\s*[~—–\-至到]\s*(?:(20\d{2})\s*[年./-]\s*)?(?:(\d{1,2})\s*[月./-]\s*)?(\d{1,2})\s*日?)?"),
    # 9月24日-26日（无年份，按就近推断）
    re.compile(r"(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日"
               r"(?:\s*[~—–\-至到]\s*(?:(\d{1,2})\s*月\s*)?(\d{1,2})\s*日)?"),
]


def _mk(y: int, m: int, d: int) -> dt.date | None:
    try:
        return dt.date(y, m, d)
    except ValueError:
        return None


def parse_date_range(text: str) -> tuple[str | None, str | None]:
    """从任意文本里抽出首个日期区间，返回 (start_iso, end_iso)。抽不到返回 (None, None)。"""
    if not text:
        return None, None

    m = DATE_PATTERNS[0].search(text)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        start = _mk(y, mo, d)
        if not start:
            return None, None
        end = start
        if m.group(6):
            ey = int(m.group(4)) if m.group(4) else y
            em = int(m.group(5)) if m.group(5) else mo
            cand = _mk(ey, em, int(m.group(6)))
            if cand and cand >= start:
                end = cand
        return start.isoformat(), end.isoformat()

    m = DATE_PATTERNS[1].search(text)
    if m:
        mo, d = int(m.group(1)), int(m.group(2))
        # 无年份：优先当年；若已过去超过 60 天，认为说的是明年
        y = TODAY.year
        start = _mk(y, mo, d)
        if start and (TODAY - start).days > 60:
            start = _mk(y + 1, mo, d)
            y += 1
        if not start:
            return None, None
        end = start
        if m.group(4):
            em = int(m.group(3)) if m.group(3) else mo
            cand = _mk(y, em, int(m.group(4)))
            if cand and cand >= start:
                end = cand
        return start.isoformat(), end.isoformat()

    return None, None


def from_epoch(v) -> str | None:
    """票务站常用毫秒/秒级时间戳。"""
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    if n > 1e12:
        n /= 1000.0
    if not (9e8 < n < 4e9):
        return None
    return dt.datetime.utcfromtimestamp(n).date().isoformat()


# ---------------------------------------------------------------- 分类打标

def matches_any(text: str, words: list[str]) -> bool:
    t = text.lower()
    return any(w.lower() in t for w in words)


def is_ai_event(text: str, cfg: dict) -> bool:
    if matches_any(text, cfg["exclude_keywords"]):
        return False
    return matches_any(text, cfg["ai_keywords"]) and matches_any(text, cfg["event_keywords"])


def guess_type(text: str, cfg: dict) -> str:
    for rule in cfg["type_rules"]:
        if matches_any(text, rule["any"]):
            return rule["type"]
    return "summit"


def guess_topics(text: str, cfg: dict) -> list[str]:
    hits = [r["topic"] for r in cfg["topic_rules"] if matches_any(text, r["any"])]
    return hits[:6] or ["大模型"]


def guess_city(text: str, cfg: dict) -> str:
    if re.search(r"线上|直播|云端|online|远程", text, re.I):
        return "线上"
    for c in cfg["cities"]:
        if c in text:
            return c
    return "待定"


def guess_fee(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ("闭门", "受邀", "邀请制", "invite")):
        return "invite"
    if any(w in t for w in ("免费", "free", "0 元", "0元")):
        return "free"
    if any(w in t for w in ("元", "票价", "购票", "付费", "早鸟")):
        return "paid"
    return "mixed"


# ---------------------------------------------------------------- 适配器

def adapter_huodongxing(spec: dict, cfg: dict) -> list[dict]:
    """活动行：列表页搜索。站点改版频繁，用「页内嵌 JSON → 锚点正则」两级兜底。"""
    out = []
    for q in spec.get("queries", []):
        url = "https://www.huodongxing.com/eventlist?tag=" + urllib.parse.quote(q)
        try:
            html = http_get(url, cfg)
        except RuntimeError as e:
            log(f"    · 查询「{q}」失败：{e}")
            continue
        time.sleep(cfg["request_spacing_seconds"])

        found = 0
        for m in re.finditer(r'href="(https?://www\.huodongxing\.com/event/[^"#?]+)"[^>]*>(.{0,400}?)</a>', html, re.S):
            link, inner = m.group(1), strip_html(m.group(2))
            if len(inner) < 6:
                continue
            out.append({"name": inner[:120], "url": link, "raw": inner, "source": "crawler:huodongxing"})
            found += 1
            if found >= cfg["per_source_limit"]:
                break
        log(f"    · 查询「{q}」→ {found} 条原始条目")
    return out


def adapter_bagevent(spec: dict, cfg: dict) -> list[dict]:
    """百格活动（会议桶）：同样两级兜底。"""
    out = []
    for q in spec.get("queries", []):
        url = "https://www.bagevent.com/eventList?keyword=" + urllib.parse.quote(q)
        try:
            html = http_get(url, cfg)
        except RuntimeError as e:
            log(f"    · 查询「{q}」失败：{e}")
            continue
        time.sleep(cfg["request_spacing_seconds"])

        found = 0
        for m in re.finditer(r'href="(https?://www\.bagevent\.com/event/\d+[^"#?]*)"[^>]*>(.{0,400}?)</a>', html, re.S):
            link, inner = m.group(1), strip_html(m.group(2))
            if len(inner) < 6:
                continue
            out.append({"name": inner[:120], "url": link, "raw": inner, "source": "crawler:bagevent"})
            found += 1
            if found >= cfg["per_source_limit"]:
                break
        log(f"    · 查询「{q}」→ {found} 条原始条目")
    return out


def adapter_infoq(spec: dict, cfg: dict) -> list[dict]:
    """极客邦科技：AICon / QCon 等自办大会的站点导航。"""
    out = []
    for url in ("https://aicon.infoq.cn/", "https://qcon.infoq.cn/"):
        try:
            html = http_get(url, cfg)
        except RuntimeError as e:
            log(f"    · {url} 失败：{e}")
            continue
        time.sleep(cfg["request_spacing_seconds"])
        text = strip_html(html)
        title = re.search(r"<title>(.{0,160}?)</title>", html, re.S | re.I)
        name = strip_html(title.group(1)) if title else url
        out.append({"name": name[:120], "url": url, "raw": text[:2000], "source": "crawler:infoq"})
        log(f"    · {url} → 抓到站点概览")
    return out


def adapter_ccf(spec: dict, cfg: dict) -> list[dict]:
    """中国计算机学会：会议预告列表。"""
    out = []
    url = "https://www.ccf.org.cn/Focus/Conference_Notice/"
    try:
        html = http_get(url, cfg)
    except RuntimeError as e:
        log(f"    · {url} 失败：{e}")
        return out
    for m in re.finditer(r'href="([^"#]*?/(?:Media|Focus|conf)[^"#]*?)"[^>]*>(.{0,300}?)</a>', html, re.S | re.I):
        link, inner = m.group(1), strip_html(m.group(2))
        if len(inner) < 8:
            continue
        if not link.startswith("http"):
            link = urllib.parse.urljoin(url, link)
        out.append({"name": inner[:120], "url": link, "raw": inner, "source": "crawler:ccf"})
        if len(out) >= cfg["per_source_limit"]:
            break
    log(f"    · CCF 会议预告 → {len(out)} 条原始条目")
    return out


GEMINI_SCHEMA_HINT = """严格只输出一个 JSON 数组，不要任何解释文字、不要 markdown 代码块以外的内容。
数组每个元素形如：
{"name":"会议全称","org":"主办方","city":"举办城市（线上填「线上」，未定填「待定」）",
 "venue":"场馆（未知填空字符串）","start":"YYYY-MM-DD","end":"YYYY-MM-DD",
 "url":"官网或报名页链接（没有就填空字符串）","desc":"一句话说明这个会值得去的理由",
 "confirmed":true}
要求：
· 只收录中国大陆举办（含线上中文场）的、与人工智能相关的会议/展会/峰会/开发者大会/沙龙。
· confirmed 字段：官方已正式公布确切日期填 true；只是按往年规律推测填 false。
· 日期必须是具体的 YYYY-MM-DD；只知道月份就填该月 1 日并把 confirmed 设为 false。
· 至多 25 条，优先近期且规模大的。没有可靠结果就输出 []。"""


def adapter_gemini(spec: dict, cfg: dict) -> list[dict]:
    """用 Gemini + Google Search grounding 联网检索。站点改版时最稳的兜底路径。"""
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        log("    · 未设置 GEMINI_API_KEY，跳过本源")
        return []

    model = spec.get("model", "gemini-2.5-flash")
    endpoint = (f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                f"?key={urllib.parse.quote(key)}")
    out = []
    for q in spec.get("queries", []):
        prompt = (f"今天是 {TODAY.isoformat()}。请用 Google 搜索查找：{q}\n\n{GEMINI_SCHEMA_HINT}")
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "tools": [{"google_search": {}}],
            "generationConfig": {"temperature": 0.2},
        }
        try:
            resp = http_post_json(endpoint, payload, cfg)
        except Exception as e:  # noqa: BLE001
            log(f"    · 检索「{q[:24]}…」失败：{type(e).__name__}: {e}")
            continue
        time.sleep(cfg["request_spacing_seconds"])

        try:
            text = "".join(p.get("text", "") for p in resp["candidates"][0]["content"]["parts"])
        except (KeyError, IndexError):
            log(f"    · 检索「{q[:24]}…」返回结构异常，跳过")
            continue

        rows = _extract_json_array(text)
        for r in rows:
            if not isinstance(r, dict) or not r.get("name"):
                continue
            out.append({
                "name": str(r["name"])[:120],
                "url": (str(r.get("url") or "").strip() or None),
                "org": str(r.get("org") or "").strip(),
                "city": str(r.get("city") or "").strip(),
                "venue": str(r.get("venue") or "").strip(),
                "start": str(r.get("start") or "").strip(),
                "end": str(r.get("end") or "").strip(),
                "desc": str(r.get("desc") or "").strip(),
                "confirmed": bool(r.get("confirmed")),
                "raw": f"{r.get('name','')} {r.get('org','')} {r.get('city','')} {r.get('desc','')}",
                "source": "crawler:gemini",
            })
        log(f"    · 检索「{q[:24]}…」→ {len(rows)} 条")
    return out


def _extract_json_array(text: str) -> list:
    """模型偶尔会裹一层 ```json，或在前后加话。抠出第一个合法 JSON 数组。"""
    fence = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.S)
    if fence:
        text = fence.group(1)
    start = text.find("[")
    if start < 0:
        return []
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                try:
                    val = json.loads(text[start:i + 1])
                    return val if isinstance(val, list) else []
                except json.JSONDecodeError:
                    return []
    return []


ADAPTERS = {
    "huodongxing": adapter_huodongxing,
    "bagevent": adapter_bagevent,
    "infoq": adapter_infoq,
    "ccf": adapter_ccf,
    "gemini": adapter_gemini,
}


# ---------------------------------------------------------------- 归一化

def normalize(raw: dict, cfg: dict) -> dict | None:
    """原始条目 → 统一结构。不合格（非 AI / 无日期 / 超出时间窗）返回 None。"""
    name = WS_RE.sub(" ", raw.get("name", "")).strip()
    if len(name) < 6:
        return None

    blob = f"{name} {raw.get('org','')} {raw.get('raw','')}"
    if not is_ai_event(blob, cfg):
        return None

    start = raw.get("start") or ""
    end = raw.get("end") or ""
    if not re.fullmatch(r"20\d{2}-\d{2}-\d{2}", start):
        start, end = parse_date_range(blob)
    if not start:
        return None
    if not re.fullmatch(r"20\d{2}-\d{2}-\d{2}", end or ""):
        end = start
    if end < start:
        end = start

    d0 = dt.date.fromisoformat(start)
    if d0 < TODAY - dt.timedelta(days=cfg["horizon_days_past"]):
        return None
    if d0 > TODAY + dt.timedelta(days=cfg["horizon_days_future"]):
        return None

    city = raw.get("city") or guess_city(blob, cfg)
    if city not in cfg["city_province"] and city not in cfg["cities"]:
        city = guess_city(blob, cfg)

    slug = re.sub(r"[^a-z0-9]+", "-", norm_key(name))[:40].strip("-") or "event"
    return {
        "id": f"{slug}-{start[:7]}",
        "name": name,
        "shortName": None,
        "type": guess_type(blob, cfg),
        "org": (raw.get("org") or "").strip() or "待补充",
        "city": city,
        "province": cfg["city_province"].get(city, "待定"),
        "venue": (raw.get("venue") or "").strip() or "待定",
        "start": start,
        "end": end,
        "dateStatus": "confirmed" if raw.get("confirmed") else "estimated",
        "topics": guess_topics(blob, cfg),
        "fee": guess_fee(blob),
        "scale": "待定",
        "url": raw.get("url"),
        "sourceNote": f"由 {raw['source'].split(':')[-1]} 自动采集于 {TODAY.isoformat()}",
        "desc": (raw.get("desc") or "").strip() or WS_RE.sub(" ", raw.get("raw", ""))[:120],
        "source": raw["source"],
        "regDeadline": None,
    }


def merge(seed: list[dict], fresh: list[dict]) -> tuple[list[dict], dict]:
    """种子库为基准，抓取结果补充新会议、并升级已有条目的档期可信度。"""
    by_key: dict[str, dict] = {}
    for e in seed:
        by_key[norm_key(e["name"])] = e
    # 短名也建索引，提高「智博会」vs「中国国际智能产业博览会」这类匹配率
    alias = {norm_key(e["shortName"]): e for e in seed if e.get("shortName")}

    stats = {"new": 0, "upgraded": 0, "duplicate": 0}
    for e in fresh:
        k = norm_key(e["name"])
        hit = by_key.get(k)
        if hit is None:
            hit = next((v for ak, v in alias.items() if ak and ak in k), None)
        if hit is None:
            by_key[k] = e
            stats["new"] += 1
            continue
        stats["duplicate"] += 1
        # 抓到官方确认的档期 → 升级种子条目
        if e["dateStatus"] == "confirmed" and hit["dateStatus"] != "confirmed":
            hit["start"], hit["end"] = e["start"], e["end"]
            hit["dateStatus"] = "confirmed"
            hit["sourceNote"] = e["sourceNote"]
            hit["source"] = e["source"]
            stats["upgraded"] += 1
        if not hit.get("url") and e.get("url"):
            hit["url"] = e["url"]
        if hit.get("venue") in (None, "", "待定") and e.get("venue") not in (None, "", "待定"):
            hit["venue"] = e["venue"]

    merged = sorted(by_key.values(), key=lambda x: (x["start"], x["id"]))
    return merged, stats


# ---------------------------------------------------------------- 主流程

def main() -> int:
    ap = argparse.ArgumentParser(description="AI 会议雷达聚合爬虫")
    ap.add_argument("--only", action="append", default=[], help="只跑指定源（可重复）")
    ap.add_argument("--skip", action="append", default=[], help="跳过指定源（可重复）")
    ap.add_argument("--dry-run", action="store_true", help="只打印结果，不写文件")
    ap.add_argument("--seed-only", action="store_true", help="不联网，仅用种子库重建 events.json")
    args = ap.parse_args()

    with open(CONFIG_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    with open(SEED_PATH, encoding="utf-8") as f:
        seed = json.load(f)["events"]

    log(f"AI 会议雷达 · 抓取 {TODAY.isoformat()}")
    log(f"种子库 {len(seed)} 条")

    fresh: list[dict] = []
    source_report = []

    if not args.seed_only:
        for spec in cfg["sources"]:
            sid = spec["id"]
            if not spec.get("enabled", True):
                continue
            if args.only and sid not in args.only:
                continue
            if sid in args.skip:
                continue
            log(f"\n▸ {spec['label']} ({sid})")
            t0 = time.time()
            try:
                raws = ADAPTERS[sid](spec, cfg)
            except Exception as e:  # noqa: BLE001 - 单源失败不影响整轮
                log(f"    ! 适配器异常，跳过：{type(e).__name__}: {e}")
                source_report.append({"id": sid, "label": spec["label"], "ok": False,
                                      "kept": 0, "error": f"{type(e).__name__}: {e}"})
                continue
            kept = [n for n in (normalize(r, cfg) for r in raws) if n]
            fresh.extend(kept)
            log(f"    ✓ 原始 {len(raws)} 条 → 归一化保留 {len(kept)} 条（{time.time() - t0:.1f}s）")
            source_report.append({"id": sid, "label": spec["label"], "ok": True,
                                  "raw": len(raws), "kept": len(kept), "error": None})

    merged, stats = merge([dict(e) for e in seed], fresh)

    log(f"\n合并结果：共 {len(merged)} 条"
        f"（新增 {stats['new']} · 档期升级 {stats['upgraded']} · 命中已有 {stats['duplicate']}）")

    payload = {
        "schemaVersion": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "totalEvents": len(merged),
        "sources": source_report,
        "events": merged,
    }

    if args.dry_run:
        log("\n--dry-run：未写文件。前 5 条：")
        for e in merged[:5]:
            log(f"  {e['start']}  {e['city']:<6} {e['name'][:44]}")
        return 0

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    log(f"已写入 {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
