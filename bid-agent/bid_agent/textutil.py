"""轻量中英文分词与文本工具（零依赖）。

无 jieba 等分词库时，对中文采用「单字 + 相邻двух字 bigram」混合切分，
对英文 / 数字按单词切分。足以支撑关键词检索与降级 Embedding。
"""
from __future__ import annotations

import hashlib
import re
from typing import List


def stable_id(text: str, prefix: str = "") -> str:
    """跨进程稳定的短 ID（builtin hash() 默认随机化，不可用于持久标识）。"""
    return prefix + hashlib.md5(text.encode("utf-8")).hexdigest()[:12]

_CJK = r"一-鿿㐀-䶿"
_ASCII_TOKEN = re.compile(r"[A-Za-z0-9][A-Za-z0-9_\-./%]*")
_CJK_CHAR = re.compile(f"[{_CJK}]")

# 常见停用词 / 标点噪声（精简版）
_STOP = set(
    "的 了 和 与 及 或 在 是 为 对 等 中 上 下 a an the of to and or in on for is are be"
    .split()
)


def tokenize(text: str) -> List[str]:
    """返回用于检索 / 嵌入的 token 列表。"""
    if not text:
        return []
    text = text.lower()
    tokens: List[str] = []

    # 英文 / 数字词
    for m in _ASCII_TOKEN.findall(text):
        if m not in _STOP and len(m) >= 1:
            tokens.append(m)

    # 中文：单字 + bigram
    cjk_chars = _CJK_CHAR.findall(text)
    # 连续的 CJK 片段才组 bigram，简化处理：对全体单字组相邻 bigram
    runs = re.findall(f"[{_CJK}]+", text)
    for run in runs:
        chars = list(run)
        for ch in chars:
            if ch not in _STOP:
                tokens.append(ch)
        for i in range(len(chars) - 1):
            tokens.append(chars[i] + chars[i + 1])
    return tokens


def normalize_ws(text: str) -> str:
    """压缩空白。"""
    text = text.replace("　", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
