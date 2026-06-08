"""应用服务门面：聚合知识库、编排器与任务存储，供 Web / CLI 复用。"""
from __future__ import annotations

import shutil
import threading
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from .config import Config, get_config
from .infra.llm import get_llm
from .logging_utils import get_logger
from .textutil import stable_id
from .management.store import TaskStore, audit_log
from .models import BidTask, StageEvent, TaskStatus
from .agents.orchestrator import BidOrchestrator
from .agents.state import WorkflowState
from .rag.knowledge_base import KnowledgeBase

log = get_logger("service")


class BidService:
    def __init__(self, config: Optional[Config] = None):
        self.cfg = config or get_config()
        self.llm = get_llm(self.cfg)
        self.kb = KnowledgeBase(self.cfg)
        self.store = TaskStore(self.cfg)
        self.orchestrator = BidOrchestrator(self.cfg, llm=self.llm, kb=self.kb)
        self._running: Dict[str, threading.Thread] = {}

    # ---------------- 运行环境信息 ----------------
    def info(self) -> Dict[str, Any]:
        return {
            "llm": {"name": self.llm.name, "available": self.llm.available, "mode": self.cfg.llm_mode},
            "embedder": self.kb.embedder.name,
            "offline_engine": not self.llm.available,
            "kb": self.kb.stats(),
            "vector_backend": self.cfg.vector_backend,
            "config": {
                "ollama_base_url": self.cfg.ollama_base_url,
                "llm_model": self.cfg.llm_model,
                "embed_model": self.cfg.embed_model,
                "chunk_size": self.cfg.chunk_size,
                "retrieve_top_k": self.cfg.retrieve_top_k,
            },
        }

    # ---------------- 知识库 ----------------
    def kb_add_file(self, src_path: Path, filename: str, category: str = "其他") -> Dict[str, Any]:
        # 拷贝进知识库原始目录留存
        kb_raw = self.cfg.data_dir / "knowledge_base"
        kb_raw.mkdir(parents=True, exist_ok=True)
        dest = kb_raw / filename
        if Path(src_path) != dest:
            shutil.copyfile(src_path, dest)
        doc_id = stable_id(filename, "kb_")
        n = self.kb.add_file(dest, category=category, doc_id=doc_id)
        audit_log("kb_add", {"file": filename, "chunks": n, "category": category}, self.cfg)
        return {"doc_id": doc_id, "source": filename, "chunks": n, "category": category}

    def kb_add_text(self, title: str, text: str, category: str = "其他") -> Dict[str, Any]:
        doc_id = stable_id(title, "kb_")
        n = self.kb.add_document(doc_id, text, source=title, metadata={"category": category})
        audit_log("kb_add_text", {"title": title, "chunks": n}, self.cfg)
        return {"doc_id": doc_id, "source": title, "chunks": n, "category": category}

    def kb_list(self) -> List[Dict[str, Any]]:
        return self.kb.list_documents()

    def kb_delete(self, doc_id: str) -> bool:
        ok = self.kb.delete_document(doc_id)
        audit_log("kb_delete", {"doc_id": doc_id, "ok": ok}, self.cfg)
        return ok

    def kb_search(self, query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        return [c.to_dict() for c in self.kb.search(query, top_k=top_k)]

    def kb_stats(self) -> Dict[str, Any]:
        return self.kb.stats()

    # ---------------- 任务 ----------------
    def create_task(self, tender_src: Path, filename: str, company: str = "我公司", name: str = "") -> BidTask:
        uploads = self.cfg.uploads_dir
        task = BidTask(name=name or filename, tender_filename=filename, company=company or "我公司")
        dest = uploads / f"{task.id}_{filename}"
        shutil.copyfile(tender_src, dest)
        task.tender_path = str(dest)
        self.store.save(task)
        audit_log("task_create", {"task_id": task.id, "file": filename}, self.cfg)
        return task

    def get_task(self, task_id: str) -> Optional[BidTask]:
        return self.store.get(task_id)

    def list_tasks(self, limit: int = 100) -> List[BidTask]:
        return self.store.list(limit)

    def delete_task(self, task_id: str) -> bool:
        return self.store.delete(task_id)

    def run_task(self, task_id: str) -> BidTask:
        """同步执行一个任务（阻塞）。"""
        task = self.store.get(task_id)
        if not task:
            raise ValueError(f"任务不存在：{task_id}")
        task.status = TaskStatus.RUNNING.value
        task.events = []
        task.error = ""
        self.store.save(task)

        def _cb(ev: StageEvent):
            task.events.append(ev)
            task.progress = ev.progress
            self.store.save(task)

        state = WorkflowState(
            tender_path=Path(task.tender_path),
            company=task.company,
            task_id=task.id,
            llm=self.llm,
            kb=self.kb,
            config=self.cfg,
            progress_cb=_cb,
        )
        t0 = time.time()
        state = self.orchestrator.run(state)

        if state.error:
            task.status = TaskStatus.FAILED.value
            task.error = state.error
        else:
            task.status = TaskStatus.DONE.value
            task.requirement = state.requirement.to_dict() if state.requirement else None
            task.bid = state.bid.to_dict() if state.bid else None
            task.review = state.review.to_dict() if state.review else None
            task.output_docx = state.output_docx
            task.parse_meta = (
                {
                    "filename": state.parsed.filename,
                    "page_count": state.parsed.page_count,
                    "char_count": state.parsed.char_count,
                    "table_count": state.parsed.table_count,
                    "file_type": state.parsed.file_type,
                    "warnings": state.parsed.warnings,
                }
                if state.parsed
                else None
            )
            task.progress = 100
        task.updated_at = time.time()
        self.store.save(task)
        audit_log(
            "task_run",
            {"task_id": task.id, "status": task.status, "elapsed_sec": round(time.time() - t0, 1)},
            self.cfg,
        )
        return task

    def run_task_async(self, task_id: str) -> None:
        if task_id in self._running and self._running[task_id].is_alive():
            return

        def _worker():
            try:
                self.run_task(task_id)
            except Exception as e:
                log.exception("任务执行异常：%s", e)
                task = self.store.get(task_id)
                if task:
                    task.status = TaskStatus.FAILED.value
                    task.error = str(e)
                    self.store.save(task)

        th = threading.Thread(target=_worker, daemon=True, name=f"task-{task_id}")
        th.start()
        self._running[task_id] = th


# 进程级单例
_SERVICE: Optional[BidService] = None
_SVC_LOCK = threading.Lock()


def get_service() -> BidService:
    global _SERVICE
    if _SERVICE is None:
        with _SVC_LOCK:
            if _SERVICE is None:
                _SERVICE = BidService()
    return _SERVICE
