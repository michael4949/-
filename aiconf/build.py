#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 data/events.json 内联进 index.html 的快照数据块。

这样 index.html 就是一个真正的单文件成品：
  · 双击用 file:// 打开 —— 直接读内联快照（此时 fetch 同源 JSON 会失败，但不影响使用）
  · 部署到 Pages / Vercel —— 内联快照先渲染，随后后台拉 data/events.json 静默更新

用法：
  python3 aiconf/build.py            # 内联并就地更新 index.html
  python3 aiconf/build.py --check    # 只校验，不写文件（CI 用）
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HTML_PATH = os.path.join(HERE, "index.html")
JSON_PATH = os.path.join(HERE, "data", "events.json")

BLOCK_RE = re.compile(
    r'(<script id="seed-data" type="application/json">)(.*?)(</script>)',
    re.S,
)


def main() -> int:
    ap = argparse.ArgumentParser(description="把会议数据内联进 index.html")
    ap.add_argument("--check", action="store_true", help="只校验不写入")
    args = ap.parse_args()

    if not os.path.exists(JSON_PATH):
        print(f"找不到 {JSON_PATH}，请先运行 crawl.py", file=sys.stderr)
        return 1

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    with open(HTML_PATH, encoding="utf-8") as f:
        html = f.read()

    m = BLOCK_RE.search(html)
    if not m:
        print("index.html 里找不到 <script id=\"seed-data\"> 数据块", file=sys.stderr)
        return 1

    # 内联快照只保留页面用得到的字段，避免 HTML 无谓变大
    snapshot = {
        "generatedAt": data.get("generatedAt"),
        "sources": data.get("sources", []),
        "events": data.get("events", []),
    }
    # </script> 会提前闭合脚本块；JSON 里出现该串时必须打断它
    payload = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    if args.check:
        cur = m.group(2)
        same = cur == payload
        print("内联快照已是最新" if same else "内联快照与 data/events.json 不一致，需要运行 build.py")
        return 0 if same else 2

    out = html[:m.start(2)] + payload + html[m.end(2):]
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(out)

    kb = len(payload.encode("utf-8")) / 1024
    print(f"已内联 {len(snapshot['events'])} 场会议（{kb:.1f} KB）→ index.html")
    print(f"index.html 现在 {os.path.getsize(HTML_PATH)/1024:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
