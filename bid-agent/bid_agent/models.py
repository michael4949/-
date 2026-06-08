"""贯穿全流程的数据模型。

采用 dataclass 以便 JSON 序列化与跨层传递，不绑定具体 pydantic 版本。
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict, List, Optional


def _uid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def _now() -> float:
    return time.time()


# ===================== 模块一：解析 =====================
@dataclass
class DocElement:
    """文档中的一个结构元素（段落 / 标题 / 表格）。"""

    kind: str  # paragraph | heading | table
    text: str = ""
    level: int = 0  # 标题层级
    page: int = 0
    rows: List[List[str]] = field(default_factory=list)  # 表格内容

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ParsedDocument:
    """招标文件解析结果（结构化原始文本）。"""

    filename: str
    file_type: str
    full_text: str = ""
    elements: List[DocElement] = field(default_factory=list)
    page_count: int = 0
    char_count: int = 0
    table_count: int = 0
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # full_text 可能很大，元数据接口里可按需裁剪
        return d


# ===================== 模块二：需求抽取 =====================
class Severity(str, Enum):
    HIGH = "高"
    MEDIUM = "中"
    LOW = "低"


@dataclass
class MandatoryItem:
    """废标项 / 实质性要求（投标注意事项清单的条目）。"""

    id: str = field(default_factory=lambda: _uid("m_"))
    title: str = ""
    requirement: str = ""  # 具体要求原文 / 摘要
    category: str = "实质性要求"  # 资格 / 实质性要求 / 格式 / 时间 等
    is_starred: bool = False  # 是否带 ★ / ▲ 等废标标记
    severity: str = Severity.HIGH.value
    source: str = ""  # 出处（页码 / 章节）

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ScoringItem:
    """评分细则条目。"""

    category: str = ""  # 商务 / 技术 / 价格
    item: str = ""
    max_score: Optional[float] = None
    criteria: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TechParam:
    """技术参数要求。"""

    name: str = ""
    requirement: str = ""
    is_mandatory: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RiskItem:
    """合同条款风险。"""

    clause: str = ""
    risk_level: str = Severity.MEDIUM.value
    description: str = ""
    suggestion: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RequirementSummary:
    """招标需求摘要（结构化 JSON）。"""

    project_name: str = ""
    project_no: str = ""
    purchaser: str = ""  # 采购人 / 招标人
    agent_org: str = ""  # 招标代理机构
    budget: str = ""  # 预算 / 最高限价
    bid_bond: str = ""  # 投标保证金
    deadline: str = ""  # 投标截止时间
    bid_open_time: str = ""  # 开标时间
    delivery: str = ""  # 交货 / 工期要求
    qualification: List[str] = field(default_factory=list)  # 资格要求
    mandatory_items: List[MandatoryItem] = field(default_factory=list)
    scoring_items: List[ScoringItem] = field(default_factory=list)
    tech_params: List[TechParam] = field(default_factory=list)
    risks: List[RiskItem] = field(default_factory=list)
    bid_doc_outline: List[str] = field(default_factory=list)  # 招标文件规定的投标文件组成
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


# ===================== 模块三：知识库检索 =====================
@dataclass
class RetrievedChunk:
    """检索命中的知识库片段。"""

    doc_id: str
    source: str
    text: str
    score: float = 0.0
    vector_score: float = 0.0
    keyword_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ===================== 模块四：标书生成 =====================
@dataclass
class BidSection:
    """标书的一个章节。"""

    key: str
    title: str
    content: str = ""
    order: int = 0
    agent: str = ""
    sources: List[str] = field(default_factory=list)  # 引用的知识库来源
    table: List[List[str]] = field(default_factory=list)  # 可选表格（如报价表）
    status: str = "pending"  # pending | done | failed
    char_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BidDocument:
    """完整标书。"""

    project_name: str = ""
    company: str = ""
    sections: List[BidSection] = field(default_factory=list)
    generated_at: float = field(default_factory=_now)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ===================== 模块五：审核 =====================
@dataclass
class ReviewIssue:
    severity: str = Severity.MEDIUM.value
    category: str = ""  # 合规 / 格式 / 语言 / 完整性
    location: str = ""  # 所在章节
    issue: str = ""
    suggestion: str = ""
    requirement_ref: str = ""  # 关联的废标项

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ReviewReport:
    passed: bool = False
    score: float = 0.0  # 合规度 0~100
    issues: List[ReviewIssue] = field(default_factory=list)
    checked_mandatory: int = 0
    responded_mandatory: int = 0
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ===================== 任务编排 =====================
class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


@dataclass
class StageEvent:
    """一次工作流阶段的进度事件。"""

    stage: str
    status: str  # start | done | error
    message: str = ""
    progress: int = 0  # 0~100
    ts: float = field(default_factory=_now)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BidTask:
    """一次完整的标书生成任务。"""

    id: str = field(default_factory=lambda: _uid("task_"))
    name: str = ""
    tender_filename: str = ""
    tender_path: str = ""
    company: str = ""
    status: str = TaskStatus.PENDING.value
    created_at: float = field(default_factory=_now)
    updated_at: float = field(default_factory=_now)
    progress: int = 0
    events: List[StageEvent] = field(default_factory=list)
    error: str = ""

    # 结果
    requirement: Optional[Dict[str, Any]] = None  # RequirementSummary.to_dict()
    bid: Optional[Dict[str, Any]] = None  # BidDocument.to_dict()
    review: Optional[Dict[str, Any]] = None  # ReviewReport.to_dict()
    output_docx: str = ""
    parse_meta: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def public_dict(self) -> Dict[str, Any]:
        """给前端的精简视图（不含大文本）。"""
        d = self.to_dict()
        return d
