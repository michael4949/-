"""工作流共享状态。"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, List, Optional

from ..models import (
    BidDocument,
    ParsedDocument,
    RequirementSummary,
    ReviewReport,
    StageEvent,
)

ProgressCb = Callable[[StageEvent], None]


@dataclass
class WorkflowState:
    # 输入
    tender_path: Path
    company: str = "我公司"
    task_id: str = ""

    # 依赖（注入）
    llm: Any = None
    kb: Any = None
    config: Any = None
    progress_cb: Optional[ProgressCb] = None

    # 中间产物
    parsed: Optional[ParsedDocument] = None
    requirement: Optional[RequirementSummary] = None
    bid: Optional[BidDocument] = None
    review: Optional[ReviewReport] = None

    # 输出
    output_docx: str = ""
    review_docx: str = ""
    error: str = ""

    def emit(self, stage: str, status: str, message: str = "", progress: int = 0) -> None:
        if self.progress_cb:
            try:
                self.progress_cb(StageEvent(stage=stage, status=status, message=message, progress=progress))
            except Exception:
                pass
