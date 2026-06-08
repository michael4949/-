"""任务持久化与审计日志（JSON 文件存储，本地、可审计）。"""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..config import Config, get_config
from ..logging_utils import get_logger
from ..models import BidTask

log = get_logger("management")


class TaskStore:
    """以「每任务一文件 + 内存索引」方式持久化标书任务。"""

    def __init__(self, config: Optional[Config] = None):
        self.cfg = config or get_config()
        self.dir = self.cfg.store_dir / "tasks"
        self.dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._cache: Dict[str, BidTask] = {}
        self._load_all()

    def _path(self, task_id: str) -> Path:
        return self.dir / f"{task_id}.json"

    def _load_all(self) -> None:
        for p in self.dir.glob("*.json"):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._cache[data["id"]] = _task_from_dict(data)
            except Exception as e:
                log.warning("加载任务 %s 失败：%s", p.name, e)

    def save(self, task: BidTask) -> None:
        with self._lock:
            task.updated_at = time.time()
            self._cache[task.id] = task
            tmp = self._path(task.id).with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(task.to_dict(), f, ensure_ascii=False)
            tmp.replace(self._path(task.id))

    def get(self, task_id: str) -> Optional[BidTask]:
        return self._cache.get(task_id)

    def list(self, limit: int = 100) -> List[BidTask]:
        items = sorted(self._cache.values(), key=lambda t: t.created_at, reverse=True)
        return items[:limit]

    def delete(self, task_id: str) -> bool:
        with self._lock:
            self._cache.pop(task_id, None)
            p = self._path(task_id)
            if p.exists():
                p.unlink()
                return True
            return False


def _task_from_dict(data: Dict[str, Any]) -> BidTask:
    from ..models import StageEvent

    events = [StageEvent(**e) for e in data.get("events", [])]
    data = dict(data)
    data["events"] = events
    # 只保留 BidTask 已知字段
    known = {k: v for k, v in data.items() if k in BidTask.__dataclass_fields__}
    return BidTask(**known)


# ---------------- 审计日志 ----------------
def audit_log(action: str, detail: Dict[str, Any], config: Optional[Config] = None) -> None:
    cfg = config or get_config()
    rec = {"ts": time.time(), "action": action, **detail}
    path = cfg.logs_dir / "audit.log"
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception as e:
        log.warning("写审计日志失败：%s", e)
