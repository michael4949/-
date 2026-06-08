"""Embedding 抽象。

  - ``OllamaEmbedder``：调用本地 Ollama 嵌入模型（如 nomic-embed-text）。
  - ``HashingEmbedder``：纯 Python 的 hashing-trick 词袋向量，确定性、零依赖，
    在无嵌入模型时提供可用的语义/词法检索能力。
"""
from __future__ import annotations

import hashlib
import math
from typing import List, Optional

import requests

from ..config import Config, get_config
from ..logging_utils import get_logger
from ..textutil import tokenize

log = get_logger("infra.embedding")


class BaseEmbedder:
    name: str = "base"
    dim: int = 0
    available: bool = True

    def embed(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError

    def embed_one(self, text: str) -> List[float]:
        return self.embed([text])[0]


class HashingEmbedder(BaseEmbedder):
    """Hashing trick 词袋向量（带 IDF-lite 衰减），L2 归一化。"""

    def __init__(self, dim: int = 1024):
        self.dim = dim
        self.name = f"hashing-{dim}"
        self.available = True

    def _hash(self, token: str) -> int:
        h = hashlib.md5(token.encode("utf-8")).digest()
        return int.from_bytes(h[:4], "little") % self.dim

    def embed(self, texts: List[str]) -> List[List[float]]:
        out: List[List[float]] = []
        for text in texts:
            vec = [0.0] * self.dim
            toks = tokenize(text)
            if not toks:
                out.append(vec)
                continue
            # 词频 + 对高频长度的轻微抑制
            counts: dict[int, float] = {}
            for t in toks:
                idx = self._hash(t)
                # bigram（长度 2 的中文）权重更高，单字权重更低
                w = 1.3 if len(t) >= 2 else 0.7
                counts[idx] = counts.get(idx, 0.0) + w
            norm = math.sqrt(sum(v * v for v in counts.values())) or 1.0
            for idx, v in counts.items():
                vec[idx] = v / norm
            out.append(vec)
        return out


class OllamaEmbedder(BaseEmbedder):
    def __init__(self, config: Optional[Config] = None):
        self.cfg = config or get_config()
        self.base_url = self.cfg.ollama_base_url.rstrip("/")
        self.name = self.cfg.embed_model
        self.dim = 0
        self.available = self._probe()

    def _probe(self) -> bool:
        try:
            v = self._embed_call("探测")
            self.dim = len(v)
            return self.dim > 0
        except Exception as e:
            log.info("Ollama 嵌入不可用（降级到 HashingEmbedder）：%s", e)
            return False

    def _embed_call(self, text: str) -> List[float]:
        r = requests.post(
            f"{self.base_url}/api/embeddings",
            json={"model": self.cfg.embed_model, "prompt": text},
            timeout=self.cfg.request_timeout,
        )
        r.raise_for_status()
        return r.json().get("embedding", [])

    def embed(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_call(t) for t in texts]


def get_embedder(config: Optional[Config] = None) -> BaseEmbedder:
    cfg = config or get_config()
    if (cfg.llm_mode or "auto").lower() != "off":
        emb = OllamaEmbedder(cfg)
        if emb.available:
            log.info("已连接 Ollama 嵌入模型 %s（dim=%d）", emb.name, emb.dim)
            return emb
    log.info("使用内置 HashingEmbedder（离线降级）")
    return HashingEmbedder()
