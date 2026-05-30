"""Dependency-free text embedding for semantic recall (memory Layer 3).

A real deployment can swap in sentence-transformers or an embeddings API. The
default :class:`HashingEmbedder` needs *no* downloads: it hashes word tokens and
character n-grams into a fixed-width vector (the "hashing trick"), TF-weights and
L2-normalizes them, so cosine similarity ≈ dot product. It captures surface and
sub-word overlap well enough for short notes and session summaries, and it is
deterministic — which keeps tests honest.
"""

from __future__ import annotations

import hashlib
import math
import re
from abc import ABC, abstractmethod

_TOKEN = re.compile(r"[a-z0-9]+|[一-鿿]", re.IGNORECASE)


class Embedder(ABC):
    dim: int

    @abstractmethod
    def embed(self, text: str) -> list[float]:
        ...

    @staticmethod
    def cosine(a: list[float], b: list[float]) -> float:
        # Inputs are L2-normalized, so cosine is just the dot product.
        return sum(x * y for x, y in zip(a, b))


def _tokens(text: str) -> list[str]:
    return _TOKEN.findall(text.lower())


def _features(text: str):
    """Yield (feature, weight) pairs: unigrams, bigrams, and char 3-grams."""
    toks = _tokens(text)
    for t in toks:
        yield t, 1.0
    for i in range(len(toks) - 1):
        yield f"{toks[i]}_{toks[i + 1]}", 0.6  # bigram (a little context)
    # character tri-grams over the collapsed token stream (sub-word robustness)
    joined = " ".join(toks)
    for i in range(len(joined) - 2):
        yield "#" + joined[i : i + 3], 0.3


class HashingEmbedder(Embedder):
    def __init__(self, dim: int = 512):
        self.dim = dim

    def _bucket(self, feature: str) -> tuple[int, float]:
        h = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(h[:4], "big") % self.dim
        sign = 1.0 if (h[4] & 1) else -1.0  # signed hashing reduces collisions
        return idx, sign

    def embed(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for feature, weight in _features(text):
            idx, sign = self._bucket(feature)
            vec[idx] += sign * weight
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec
