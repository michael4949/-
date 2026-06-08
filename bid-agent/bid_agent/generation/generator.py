"""标书生成编排：多 Agent 并行生成各章节。"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, List, Optional

from ..config import Config, get_config
from ..infra.llm import BaseLLM
from ..logging_utils import get_logger
from ..models import BidDocument, BidSection, RequirementSummary
from .outline import build_outline
from .section_agents import GenContext, SectionAgent

log = get_logger("generation")

ProgressCb = Callable[[str, int, int], None]  # (section_title, done, total)


class BidGenerator:
    def __init__(self, llm: BaseLLM, kb: Optional[object] = None, config: Optional[Config] = None):
        self.llm = llm
        self.kb = kb
        self.cfg = config or get_config()

    def generate(
        self,
        req: RequirementSummary,
        company: str = "我公司",
        progress_cb: Optional[ProgressCb] = None,
    ) -> BidDocument:
        specs = build_outline(req)
        ctx = GenContext(req=req, llm=self.llm, kb=self.kb, company=company, top_k=self.cfg.retrieve_top_k)
        total = len(specs)
        sections: List[BidSection] = []
        done = 0

        workers = max(1, min(self.cfg.max_parallel_sections, total))
        log.info("开始生成 %d 个章节（并发 %d，LLM=%s）", total, workers, self.llm.name)

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(SectionAgent(spec).generate, ctx): spec for spec in specs}
            for fut in as_completed(futures):
                spec = futures[fut]
                try:
                    section = fut.result()
                except Exception as e:
                    log.error("章节 %s 生成异常：%s", spec.key, e)
                    section = BidSection(
                        key=spec.key, title=spec.title, order=spec.order,
                        content=f"【生成失败，请人工补写：{e}】", status="failed",
                    )
                sections.append(section)
                done += 1
                if progress_cb:
                    try:
                        progress_cb(section.title, done, total)
                    except Exception:
                        pass

        sections.sort(key=lambda s: s.order)
        return BidDocument(project_name=req.project_name, company=company, sections=sections)
