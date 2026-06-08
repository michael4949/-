"""向量库。

默认 ``LocalVectorStore``：纯 Python + numpy 余弦检索，JSON 持久化，
零外部服务依赖、数据全在本地。可替换为 Chroma/Qdrant/Milvus（见 README）。
"""
from __future__ import annotations

import json
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


@dataclass
class VectorRecord:
    id: str
    doc_id: str
    source: str
    text: str
    vector: List[float]
    metadata: Dict[str, Any] = field(default_factory=dict)


class LocalVectorStore:
    """本地向量库（内存索引 + JSON 落盘）。"""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._records: List[VectorRecord] = []
        self._matrix: Optional[np.ndarray] = None  # 归一化后的向量矩阵
        self._dirty = True
        self.load()

    # ---------------- 持久化 ----------------
    def load(self) -> None:
        with self._lock:
            self._records = []
            if self.path.exists():
                with open(self.path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for r in data.get("records", []):
                    self._records.append(VectorRecord(**r))
            self._dirty = True

    def save(self) -> None:
        with self._lock:
            tmp = self.path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(
                    {"records": [r.__dict__ for r in self._records]},
                    f,
                    ensure_ascii=False,
                )
            tmp.replace(self.path)

    # ---------------- 写入 ----------------
    def add(self, records: List[VectorRecord]) -> None:
        with self._lock:
            self._records.extend(records)
            self._dirty = True

    def delete_by_doc(self, doc_id: str) -> int:
        with self._lock:
            before = len(self._records)
            self._records = [r for r in self._records if r.doc_id != doc_id]
            self._dirty = True
            return before - len(self._records)

    def clear(self) -> None:
        with self._lock:
            self._records = []
            self._dirty = True

    def count(self) -> int:
        return len(self._records)

    def doc_ids(self) -> List[str]:
        return sorted({r.doc_id for r in self._records})

    # ---------------- 检索 ----------------
    def _rebuild_matrix(self) -> None:
        if not self._records:
            self._matrix = None
            self._dirty = False
            return
        mat = np.array([r.vector for r in self._records], dtype=np.float32)
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self._matrix = mat / norms
        self._dirty = False

    def search(self, query_vec: List[float], top_k: int = 6) -> List[Tuple[VectorRecord, float]]:
        with self._lock:
            if self._dirty:
                self._rebuild_matrix()
            if self._matrix is None or not self._records:
                return []
            q = np.array(query_vec, dtype=np.float32)
            qn = np.linalg.norm(q) or 1.0
            q = q / qn
            sims = self._matrix @ q  # 余弦相似度
            k = min(top_k, len(self._records))
            idx = np.argpartition(-sims, k - 1)[:k]
            idx = idx[np.argsort(-sims[idx])]
            return [(self._records[i], float(sims[i])) for i in idx]

    def all_records(self) -> List[VectorRecord]:
        return list(self._records)
