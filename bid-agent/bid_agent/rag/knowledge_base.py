"""模块三：企业知识库构建与检索。

  构建：文档 -> 清洗 -> 分块 -> 嵌入 -> 向量库 + 文档登记表
  检索：向量检索 + 关键词检索（BM25-lite）混合，再做轻量重排序
"""
from __future__ import annotations

import json
import math
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..config import Config, get_config
from ..infra.embedding import BaseEmbedder, get_embedder
from ..logging_utils import get_logger
from ..models import RetrievedChunk
from ..textutil import tokenize, normalize_ws
from .chunking import chunk_text
from .vectorstore import LocalVectorStore, VectorRecord

log = get_logger("rag.kb")


class KnowledgeBase:
    """企业私有知识库。"""

    def __init__(self, config: Optional[Config] = None, embedder: Optional[BaseEmbedder] = None):
        self.cfg = config or get_config()
        self.embedder = embedder or get_embedder(self.cfg)
        self.store = LocalVectorStore(self.cfg.kb_dir / "vectors.json")
        self.registry_path = self.cfg.kb_dir / "docs.json"
        self._lock = threading.RLock()
        self._registry: Dict[str, Dict[str, Any]] = self._load_registry()
        # 关键词索引缓存
        self._kw_dirty = True
        self._rec_tokens: List[Dict[str, int]] = []
        self._df: Dict[str, int] = {}
        self._avg_len = 1.0

    # ---------------- 文档登记表 ----------------
    def _load_registry(self) -> Dict[str, Dict[str, Any]]:
        if self.registry_path.exists():
            with open(self.registry_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_registry(self) -> None:
        tmp = self.registry_path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._registry, f, ensure_ascii=False, indent=2)
        tmp.replace(self.registry_path)

    # ---------------- 构建 ----------------
    def add_document(
        self,
        doc_id: str,
        text: str,
        *,
        source: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """加入/更新一篇文档，返回切块数。"""
        text = normalize_ws(text)
        if not text:
            return 0
        with self._lock:
            # 覆盖更新：先删旧
            if doc_id in self._registry:
                self.store.delete_by_doc(doc_id)
            chunks = chunk_text(text, self.cfg.chunk_size, self.cfg.chunk_overlap)
            vectors = self.embedder.embed(chunks)
            records = [
                VectorRecord(
                    id=f"{doc_id}::{i}",
                    doc_id=doc_id,
                    source=source,
                    text=chunk,
                    vector=vec,
                    metadata={**(metadata or {}), "chunk_index": i},
                )
                for i, (chunk, vec) in enumerate(zip(chunks, vectors))
            ]
            self.store.add(records)
            self.store.save()
            self._registry[doc_id] = {
                "doc_id": doc_id,
                "source": source,
                "category": (metadata or {}).get("category", "其他"),
                "n_chunks": len(chunks),
                "chars": len(text),
                "embedder": self.embedder.name,
                "added_at": time.time(),
            }
            self._save_registry()
            self._kw_dirty = True
            log.info("知识库已加入文档 %s（%d 块）", source, len(chunks))
            return len(chunks)

    def add_file(self, path: Path, *, category: str = "其他", doc_id: Optional[str] = None) -> int:
        """从文件导入（惰性依赖解析模块）。"""
        from ..parsing.document_parser import parse_document

        from ..textutil import stable_id

        path = Path(path)
        parsed = parse_document(path)
        did = doc_id or stable_id(path.name, "doc_")
        return self.add_document(
            did, parsed.full_text, source=path.name, metadata={"category": category}
        )

    def delete_document(self, doc_id: str) -> bool:
        with self._lock:
            if doc_id not in self._registry:
                return False
            self.store.delete_by_doc(doc_id)
            self.store.save()
            del self._registry[doc_id]
            self._save_registry()
            self._kw_dirty = True
            return True

    def list_documents(self) -> List[Dict[str, Any]]:
        return sorted(self._registry.values(), key=lambda d: d.get("added_at", 0), reverse=True)

    def stats(self) -> Dict[str, Any]:
        return {
            "documents": len(self._registry),
            "chunks": self.store.count(),
            "embedder": self.embedder.name,
            "embedder_offline": self.embedder.name.startswith("hashing"),
        }

    # ---------------- 关键词索引 ----------------
    def _ensure_kw_index(self) -> None:
        if not self._kw_dirty:
            return
        recs = self.store.all_records()
        self._rec_tokens = []
        df: Dict[str, int] = {}
        total_len = 0
        for r in recs:
            counts: Dict[str, int] = {}
            for t in tokenize(r.text):
                counts[t] = counts.get(t, 0) + 1
            self._rec_tokens.append(counts)
            total_len += sum(counts.values())
            for t in counts:
                df[t] = df.get(t, 0) + 1
        self._df = df
        self._avg_len = (total_len / len(recs)) if recs else 1.0
        self._kw_dirty = False

    def _bm25_scores(self, query: str) -> List[float]:
        """对所有记录计算 BM25-lite 得分。"""
        self._ensure_kw_index()
        recs = self.store.all_records()
        n = len(recs)
        if n == 0:
            return []
        q_tokens = set(tokenize(query))
        k1, b = 1.5, 0.75
        scores = [0.0] * n
        for i, counts in enumerate(self._rec_tokens):
            dl = sum(counts.values()) or 1
            s = 0.0
            for t in q_tokens:
                tf = counts.get(t, 0)
                if tf == 0:
                    continue
                df = self._df.get(t, 1)
                idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
                s += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / self._avg_len))
            scores[i] = s
        return scores

    # ---------------- 混合检索 + 重排序 ----------------
    def search(self, query: str, top_k: Optional[int] = None) -> List[RetrievedChunk]:
        top_k = top_k or self.cfg.retrieve_top_k
        if self.store.count() == 0 or not query.strip():
            return []
        recs = self.store.all_records()
        index = {r.id: i for i, r in enumerate(recs)}

        # 1) 向量检索
        q_vec = self.embedder.embed_one(query)
        vec_hits = self.store.search(q_vec, top_k=min(len(recs), top_k * 4))
        vec_score = {r.id: s for r, s in vec_hits}

        # 2) 关键词检索（BM25-lite）
        bm = self._bm25_scores(query)
        max_bm = max(bm) if bm else 0.0
        kw_score = {recs[i].id: (bm[i] / max_bm if max_bm > 0 else 0.0) for i in range(len(recs))}

        # 候选集合：向量命中 ∪ 关键词 top
        kw_top_ids = sorted(kw_score, key=lambda k: kw_score[k], reverse=True)[: top_k * 4]
        candidate_ids = set(vec_score) | set(kw_top_ids)

        # 3) 混合打分
        alpha = self.cfg.hybrid_alpha
        scored: List[Tuple[str, float, float, float]] = []
        for cid in candidate_ids:
            v = vec_score.get(cid, 0.0)
            kw = kw_score.get(cid, 0.0)
            combined = alpha * v + (1 - alpha) * kw
            scored.append((cid, combined, v, kw))

        # 4) 轻量重排序：对覆盖更多查询词 / 命中查询短语的片段加成
        q_tokens = [t for t in tokenize(query) if len(t) >= 2]
        reranked: List[Tuple[str, float, float, float]] = []
        for cid, combined, v, kw in scored:
            rec = recs[index[cid]]
            text = rec.text
            coverage = sum(1 for t in set(q_tokens) if t in text)
            cov_ratio = coverage / (len(set(q_tokens)) or 1)
            boost = 0.15 * cov_ratio
            reranked.append((cid, combined + boost, v, kw))

        reranked.sort(key=lambda x: x[1], reverse=True)
        results: List[RetrievedChunk] = []
        for cid, score, v, kw in reranked[:top_k]:
            rec = recs[index[cid]]
            results.append(
                RetrievedChunk(
                    doc_id=rec.doc_id,
                    source=rec.source,
                    text=rec.text,
                    score=round(score, 4),
                    vector_score=round(v, 4),
                    keyword_score=round(kw, 4),
                    metadata=rec.metadata,
                )
            )
        return results
