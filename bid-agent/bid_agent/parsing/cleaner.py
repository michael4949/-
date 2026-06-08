"""文本清洗：统一空白、去除跨页重复的页眉页脚、合并断行。"""
from __future__ import annotations

import re
from collections import Counter
from typing import List


def merge_broken_lines(text: str) -> str:
    """合并被 PDF 提取硬切断的行（行尾非标点且下一行接续）。"""
    lines = text.split("\n")
    out: List[str] = []
    for line in lines:
        s = line.rstrip()
        if out and s and not re.search(r"[。！？；：，、,.!?;:)\]》”’]\s*$", out[-1]) \
                and not re.match(r"^\s*(第[一二三四五六七八九十0-9]+|[0-9]+[.、)）]|[（(])", s):
            # 中文一般无需空格连接
            if re.search(r"[一-鿿]$", out[-1]) and re.match(r"^[一-鿿]", s):
                out[-1] = out[-1] + s
            else:
                out[-1] = out[-1] + " " + s
        else:
            out.append(s)
    return "\n".join(out)


def remove_repeated_headers(pages: List[str]) -> List[str]:
    """识别在多数页面重复出现的短行（页眉/页脚），剔除。"""
    if len(pages) < 3:
        return pages
    line_pages: Counter = Counter()
    for p in pages:
        seen = set()
        for line in p.split("\n"):
            s = line.strip()
            if 0 < len(s) <= 40:
                seen.add(s)
        for s in seen:
            line_pages[s] += 1
    threshold = max(3, int(len(pages) * 0.6))
    repeated = {s for s, c in line_pages.items() if c >= threshold}
    if not repeated:
        return pages
    cleaned = []
    for p in pages:
        kept = [ln for ln in p.split("\n") if ln.strip() not in repeated]
        cleaned.append("\n".join(kept))
    return cleaned


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("　", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
