"""标书审核与校验。

  - 合规审核：对照《投标注意事项清单》逐条核验废标项是否已响应。
  - 完整性审核：检测空章节、未填占位符【】。
  - 基础审核：语言/格式提示。
  - 产出：审核报告（结构化）+ 审核报告 Word。
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import List

from docx import Document
from docx.shared import Pt, RGBColor

from ..infra.llm import BaseLLM
from ..logging_utils import get_logger
from ..models import (
    BidDocument,
    RequirementSummary,
    ReviewIssue,
    ReviewReport,
    Severity,
)
from ..textutil import tokenize

log = get_logger("review")

_PLACEHOLDER = re.compile(r"【[^】]*】")


class Reviewer:
    def __init__(self, llm: BaseLLM = None):
        self.llm = llm

    def review(self, bid: BidDocument, req: RequirementSummary) -> ReviewReport:
        report = ReviewReport()
        full_text = "\n".join(s.content for s in bid.sections)
        full_tokens = set(tokenize(full_text))

        # 1) 合规审核：废标项逐条
        responded = 0
        for m in req.mandatory_items:
            ok = self._is_responded(m.requirement, full_text, full_tokens)
            if ok:
                responded += 1
            else:
                report.issues.append(
                    ReviewIssue(
                        severity=Severity.HIGH.value,
                        category="合规",
                        location="实质性要求响应/偏离表",
                        issue=f"废标项/实质性要求可能未充分响应：{m.requirement[:60]}",
                        suggestion="请在相关章节明确逐条响应该要求，并提供证明材料，避免废标。",
                        requirement_ref=m.requirement[:80],
                    )
                )
        report.checked_mandatory = len(req.mandatory_items)
        report.responded_mandatory = responded

        # 2) 完整性 + 占位符
        for s in bid.sections:
            if not s.content.strip() or s.status == "failed":
                report.issues.append(
                    ReviewIssue(
                        severity=Severity.HIGH.value, category="完整性", location=s.title,
                        issue="章节内容为空或生成失败。", suggestion="请补充该章节内容。",
                    )
                )
                continue
            holes = _PLACEHOLDER.findall(s.content)
            holes += [c for row in s.table for c in row if "【" in c]
            if holes:
                uniq = list(dict.fromkeys(holes))[:8]
                report.issues.append(
                    ReviewIssue(
                        severity=Severity.MEDIUM.value, category="完整性", location=s.title,
                        issue=f"存在 {len(holes)} 处待填写占位符，如：{ '、'.join(uniq) }",
                        suggestion="请补充企业实际数据（业绩、参数、报价等）后再定稿。",
                    )
                )
            if len(s.content) < 60 and s.key not in {"authorization"}:
                report.issues.append(
                    ReviewIssue(
                        severity=Severity.LOW.value, category="完整性", location=s.title,
                        issue="章节内容过短。", suggestion="建议结合项目实际充实内容。",
                    )
                )

        # 3) 关键信息检查
        if not req.deadline:
            report.issues.append(
                ReviewIssue(severity=Severity.MEDIUM.value, category="基础", location="全局",
                            issue="未能从招标文件中识别投标截止时间。", suggestion="请人工确认投标截止时间，避免逾期。")
            )
        if any("报价" in s.title for s in bid.sections):
            pricing = next((s for s in bid.sections if "报价" in s.title), None)
            if pricing and "￥______" in pricing.content or (pricing and _PLACEHOLDER.search(pricing.content)):
                report.issues.append(
                    ReviewIssue(severity=Severity.HIGH.value, category="完整性", location="投标报价",
                                issue="投标报价尚未填写具体金额。", suggestion="定稿前必须填写投标总报价及分项报价。")
                )

        # 4) 评分
        mand_ratio = (responded / report.checked_mandatory) if report.checked_mandatory else 1.0
        high = sum(1 for i in report.issues if i.severity == Severity.HIGH.value)
        med = sum(1 for i in report.issues if i.severity == Severity.MEDIUM.value)
        score = 100.0 * mand_ratio - high * 8 - med * 3
        report.score = round(max(0.0, min(100.0, score)), 1)
        report.passed = high == 0 and report.score >= 75
        report.summary = (
            f"合规度 {report.score} 分；废标项响应 {responded}/{report.checked_mandatory}；"
            f"高风险问题 {high} 项、需关注 {med} 项。"
            + ("初步通过，建议人工终审后定稿。" if report.passed else "存在需处理的问题，请按建议修改后再定稿。")
        )
        return report

    def _is_responded(self, requirement: str, full_text: str, full_tokens: set) -> bool:
        req_tokens = [t for t in tokenize(requirement) if len(t) >= 2]
        if not req_tokens:
            return True
        hit = sum(1 for t in set(req_tokens) if t in full_tokens)
        coverage = hit / len(set(req_tokens))
        # 关键名词命中率达到阈值即视为已响应（响应表通常会回填要求原文）
        return coverage >= 0.5


def write_review_docx(report: ReviewReport, out_path: Path, project_name: str = "") -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    h = doc.add_heading("标书审核报告", level=0)
    if project_name:
        p = doc.add_paragraph()
        p.add_run(f"项目：{project_name}").font.size = Pt(12)

    doc.add_heading("一、审核结论", level=1)
    concl = doc.add_paragraph()
    run = concl.add_run(("通过（建议人工终审）" if report.passed else "未通过，请按建议修改"))
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x1F, 0x7A, 0x1F) if report.passed else RGBColor(0xC0, 0x00, 0x00)
    doc.add_paragraph(report.summary)

    doc.add_heading("二、问题清单", level=1)
    if not report.issues:
        doc.add_paragraph("未发现明显问题。")
    else:
        table = doc.add_table(rows=1, cols=5)
        table.style = "Table Grid"
        hdr = table.rows[0].cells
        for i, t in enumerate(["级别", "类别", "位置", "问题", "建议"]):
            hdr[i].text = t
            for pp in hdr[i].paragraphs:
                for rr in pp.runs:
                    rr.font.bold = True
        for issue in sorted(report.issues, key=lambda x: {"高": 0, "中": 1, "低": 2}.get(x.severity, 3)):
            cells = table.add_row().cells
            cells[0].text = issue.severity
            cells[1].text = issue.category
            cells[2].text = issue.location
            cells[3].text = issue.issue
            cells[4].text = issue.suggestion

    doc.save(str(out_path))
    return out_path
