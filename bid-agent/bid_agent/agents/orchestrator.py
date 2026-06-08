"""标书生成工作流编排。

工作流：文件解析 → 需求抽取 → 知识库检索（章节内） → 分模块生成 → 校验审核 → 导出。
每个阶段是图中的一个节点，由对应模块/Agent 执行。
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from ..config import Config, get_config
from ..extraction import RequirementExtractor
from ..generation import BidGenerator
from ..generation.docx_writer import write_bid_docx
from ..infra.llm import BaseLLM, get_llm
from ..logging_utils import get_logger
from ..parsing import parse_document
from ..review import Reviewer
from ..review.reviewer import write_review_docx
from .graph import END, StateGraph
from .state import WorkflowState

log = get_logger("orchestrator")


class BidOrchestrator:
    def __init__(self, config: Optional[Config] = None, llm: Optional[BaseLLM] = None, kb=None):
        self.cfg = config or get_config()
        self.llm = llm or get_llm(self.cfg)
        self.kb = kb
        self.graph = self._build()

    # ---------------- 构图 ----------------
    def _build(self):
        g = StateGraph()
        g.add_node("parse", self._n_parse)
        g.add_node("extract", self._n_extract)
        g.add_node("generate", self._n_generate)
        g.add_node("review", self._n_review)
        g.add_node("export", self._n_export)
        g.set_entry("parse")
        g.add_edge("parse", "extract")
        g.add_edge("extract", "generate")
        g.add_edge("generate", "review")
        g.add_edge("review", "export")
        g.add_edge("export", END)
        return g.compile()

    def run(self, state: WorkflowState) -> WorkflowState:
        state.llm = state.llm or self.llm
        state.kb = state.kb if state.kb is not None else self.kb
        state.config = state.config or self.cfg
        try:
            return self.graph.invoke(state)
        except Exception as e:
            log.exception("工作流失败")
            state.error = str(e)
            state.emit("workflow", "error", f"工作流失败：{e}", 100)
            return state

    # ---------------- 节点实现 ----------------
    def _n_parse(self, state: WorkflowState) -> WorkflowState:
        state.emit("parse", "start", "正在解析招标文件…", 5)
        parsed = parse_document(Path(state.tender_path))
        state.parsed = parsed
        msg = f"解析完成：约 {parsed.page_count} 页、{parsed.char_count} 字、{parsed.table_count} 张表格。"
        state.emit("parse", "done", msg, 20)
        return state

    def _n_extract(self, state: WorkflowState) -> WorkflowState:
        state.emit("extract", "start", "正在抽取招标需求与废标项…", 25)
        extractor = RequirementExtractor(llm=state.llm)
        req = extractor.extract(state.parsed)
        state.requirement = req
        msg = (
            f"抽取完成：废标项 {len(req.mandatory_items)} 条、评分项 {len(req.scoring_items)} 条、"
            f"技术参数 {len(req.tech_params)} 条、风险 {len(req.risks)} 条。"
        )
        state.emit("extract", "done", msg, 40)
        return state

    def _n_generate(self, state: WorkflowState) -> WorkflowState:
        state.emit("generate", "start", "多 Agent 正在分模块生成标书…", 45)
        generator = BidGenerator(llm=state.llm, kb=state.kb, config=state.config)

        def _progress(title: str, done: int, total: int):
            pct = 45 + int(40 * done / max(1, total))
            state.emit("generate", "progress", f"已生成「{title}」（{done}/{total}）", pct)

        bid = generator.generate(state.requirement, company=state.company, progress_cb=_progress)
        state.bid = bid
        state.emit("generate", "done", f"标书初稿生成完成，共 {len(bid.sections)} 个章节。", 85)
        return state

    def _n_review(self, state: WorkflowState) -> WorkflowState:
        state.emit("review", "start", "正在进行合规与完整性审核…", 88)
        reviewer = Reviewer(llm=state.llm)
        report = reviewer.review(state.bid, state.requirement)
        state.review = report
        state.emit("review", "done", report.summary, 92)
        return state

    def _n_export(self, state: WorkflowState) -> WorkflowState:
        state.emit("export", "start", "正在导出 Word 文件…", 95)
        out_dir = Path(state.config.outputs_dir) / (state.task_id or f"task_{int(time.time())}")
        out_dir.mkdir(parents=True, exist_ok=True)
        safe = (state.requirement.project_name or "投标文件").strip().replace("/", "_")[:40] or "投标文件"
        bid_path = out_dir / f"{safe}-投标文件.docx"
        review_path = out_dir / f"{safe}-审核报告.docx"
        write_bid_docx(state.bid, bid_path, req=state.requirement)
        write_review_docx(state.review, review_path, project_name=state.requirement.project_name)
        state.output_docx = str(bid_path)
        state.review_docx = str(review_path)
        state.emit("export", "done", "标书与审核报告已生成。", 100)
        return state
