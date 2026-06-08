"""文本分块：按段落聚合到目标长度，带重叠，尽量不切断句子。"""
from __future__ import annotations

import re
from typing import List

_SENT_SPLIT = re.compile(r"(?<=[。！？；\n])")


def split_paragraphs(text: str) -> List[str]:
    parts = [p.strip() for p in re.split(r"\n\s*\n", text)]
    return [p for p in parts if p]


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 120) -> List[str]:
    """将长文本切分为带重叠的块（以字符数计，适配中文）。"""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    # 先按段落，再在段落内按句子聚合
    units: List[str] = []
    for para in split_paragraphs(text):
        if len(para) <= chunk_size:
            units.append(para)
        else:
            buf = ""
            for sent in _SENT_SPLIT.split(para):
                if not sent:
                    continue
                if len(buf) + len(sent) > chunk_size and buf:
                    units.append(buf)
                    buf = sent
                else:
                    buf += sent
            if buf:
                units.append(buf)

    # 把小单元打包到接近 chunk_size，并在块间加重叠
    chunks: List[str] = []
    buf = ""
    for u in units:
        if len(buf) + len(u) + 1 > chunk_size and buf:
            chunks.append(buf.strip())
            tail = buf[-overlap:] if overlap > 0 else ""
            buf = (tail + "\n" + u).strip()
        else:
            buf = (buf + "\n" + u).strip() if buf else u
    if buf:
        chunks.append(buf.strip())
    return chunks
