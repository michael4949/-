"""主工作流编排:把 6 个 Agent 串成一条命题流水线。

核心是 `run_paper()`:输入一份命题需求,输出一份成卷。
中间会做 Composer → Reviewer → ChiefEditor 的反馈迭代。
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import asdict
from datetime import datetime
from typing import Any

from anthropic import Anthropic

from .agents import (
    AnalystAgent,
    ChiefEditorAgent,
    ComposerAgent,
    PlannerAgent,
    ReviewerAgent,
    SolutionAgent,
)
from .config import Config
from .knowledge.seeds import lookup_reference_questions
from .schemas import (
    ChiefReview,
    FinalizedQuestion,
    FinalPaper,
    PaperBlueprint,
    QuestionBlueprint,
    QuestionDraft,
    ReviewReport,
    SolutionDraft,
    StyleReport,
)


class QiguangWorkflow:
    """命题工作流编排器。"""

    def __init__(self, config: Config):
        self.config = config
        client = Anthropic(api_key=config.anthropic_api_key)

        self.planner = PlannerAgent(client, config.planner, config.enable_cache, config.verbose)
        self.analyst = AnalystAgent(client, config.analyst, config.enable_cache, config.verbose)
        self.composer = ComposerAgent(client, config.composer, config.enable_cache, config.verbose)
        self.solution = SolutionAgent(client, config.solution, config.enable_cache, config.verbose)
        self.reviewer = ReviewerAgent(client, config.reviewer, config.enable_cache, config.verbose)
        self.chief_editor = ChiefEditorAgent(client, config.chief_editor, config.enable_cache, config.verbose)

    # ---------------------------------------------------------------------
    # 公共入口
    # ---------------------------------------------------------------------

    def run_paper(self, request: dict[str, Any]) -> FinalPaper:
        """端到端跑完一份卷的命题。"""
        t0 = time.time()
        self._log_section("阶段 1/4 · 命题策划")
        blueprint = self.planner.run(request)

        # 控制成本:如果用户在 request 里指定了 question_count,且策划官产出的题数超过这个数,
        # 我们截取前 N 道做演示。生产环境可以去掉这段。
        if (qc := request.get("question_count")) and len(blueprint.questions) > qc:
            blueprint.questions = blueprint.questions[:qc]
            self._log(f"按 question_count={qc} 截取蓝图前 {qc} 道。")

        self._log_section("阶段 2/4 · 单题命题流水线")
        paper_meta = {
            "subject": blueprint.subject,
            "stage": blueprint.stage,
            "grade": blueprint.grade,
            "target_audience": blueprint.target_audience,
            "overall_difficulty": blueprint.overall_difficulty,
            "design_rationale": blueprint.design_rationale,
        }

        finalized: list[FinalizedQuestion] = []
        for q_bp in blueprint.questions:
            try:
                f = self._produce_single_question(paper_meta, blueprint, q_bp)
                finalized.append(f)
            except Exception as e:
                # 单题失败不应该让整卷崩。记下,继续后面。
                self._log(f"⚠️ 第 {q_bp.number} 题命题失败,跳过。原因:{e}")

        if not finalized:
            raise RuntimeError("所有题目命题都失败了。请检查日志。")

        self._log_section("阶段 3/4 · 主审定稿")
        chief_review = self.chief_editor.run(blueprint, finalized)

        self._log_section("阶段 4/4 · 输出存档")
        elapsed = time.time() - t0
        metadata = {
            "produced_at": datetime.now().isoformat(timespec="seconds"),
            "elapsed_seconds": round(elapsed, 1),
            "question_count_requested": len(blueprint.questions),
            "question_count_finalized": len(finalized),
        }
        final_paper = FinalPaper(
            blueprint=blueprint,
            questions=finalized,
            chief_review=chief_review,
            metadata=metadata,
        )
        self._save_artifacts(final_paper)
        self._log_section(f"全部完成,耗时 {elapsed:.1f}s")
        return final_paper

    # ---------------------------------------------------------------------
    # 单题流水线
    # ---------------------------------------------------------------------

    def _produce_single_question(
        self,
        paper_meta: dict[str, Any],
        blueprint: PaperBlueprint,
        q_bp: QuestionBlueprint,
    ) -> FinalizedQuestion:
        """单题:Analyst → Composer → SolutionWriter → Reviewer → (修订循环) → 入库"""

        ref_questions = lookup_reference_questions(
            subject=blueprint.subject,
            knowledge_points=q_bp.knowledge_points,
            limit=2,
        )

        # Step 1: 风格分析(只做一次,在多轮修订时复用)
        style = self.analyst.run(paper_meta, q_bp, ref_questions)

        revision_notes = ""
        draft: QuestionDraft | None = None
        solution: SolutionDraft | None = None
        review: ReviewReport | None = None
        rounds = 0

        max_rounds = self.config.max_revision_rounds
        for attempt in range(1, max_rounds + 1):
            rounds = attempt

            # Step 2: 命题
            draft = self.composer.run(paper_meta, q_bp, style, revision_notes=revision_notes)

            # Step 3: 解析
            solution = self.solution.run(q_bp, draft)

            # Step 4: 质检
            review = self.reviewer.run(q_bp, draft, solution)

            if review.verdict == "pass":
                self._log(f"第 {q_bp.number} 题第 {attempt} 轮通过质检。")
                break

            if review.verdict == "reject" and attempt == max_rounds:
                self._log(f"第 {q_bp.number} 题质检为 reject 且已达最大轮次,接受当前版本(后续主审会决定)。")
                break

            # 准备下一轮修订
            revision_notes = self._format_revision_notes(review)
            self._log(f"第 {q_bp.number} 题进入第 {attempt + 1} 轮修订:{review.verdict}")

        assert draft is not None and solution is not None and review is not None

        return FinalizedQuestion(
            blueprint=q_bp,
            draft=draft,
            solution=solution,
            review=review,
            revision_rounds=rounds,
        )

    # ---------------------------------------------------------------------
    # 工具方法
    # ---------------------------------------------------------------------

    @staticmethod
    def _format_revision_notes(review: ReviewReport) -> str:
        lines = [f"判定:{review.verdict}", f"评审理由:{review.verdict_rationale}", ""]
        if review.issues:
            lines.append("发现的问题:")
            for i, issue in enumerate(review.issues, 1):
                lines.append(f"  {i}. {issue}")
        if review.suggestions:
            lines.append("")
            lines.append("具体修改建议:")
            for i, s in enumerate(review.suggestions, 1):
                lines.append(f"  {i}. {s}")
        return "\n".join(lines)

    def _save_artifacts(self, paper: FinalPaper) -> None:
        out_dir = self.config.output_dir
        os.makedirs(out_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        json_path = os.path.join(out_dir, f"paper_{timestamp}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(paper.to_dict(), f, ensure_ascii=False, indent=2)
        self._log(f"已存档 JSON:{json_path}")

        md_path = os.path.join(out_dir, f"paper_{timestamp}.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(render_paper_markdown(paper))
        self._log(f"已存档 Markdown:{md_path}")

    def _log_section(self, title: str) -> None:
        if self.config.verbose:
            print("\n" + "=" * 60, flush=True)
            print(f"  {title}", flush=True)
            print("=" * 60 + "\n", flush=True)

    def _log(self, msg: str) -> None:
        if self.config.verbose:
            print(f"[Workflow] {msg}", flush=True)


# =============================================================================
# Markdown 渲染
# =============================================================================

def render_paper_markdown(paper: FinalPaper) -> str:
    """把成卷渲染成易读的 Markdown,方便教研老师审阅。"""
    bp = paper.blueprint
    out: list[str] = []
    out.append(f"# {bp.target_audience} · {bp.subject}模拟卷")
    out.append("")
    out.append(
        f"**学段**:{bp.stage} {bp.grade}  "
        f"**总分**:{bp.total_score}  "
        f"**时长**:{bp.duration_minutes} 分钟  "
        f"**预期难度**:{bp.overall_difficulty}"
    )
    out.append("")
    out.append("## 命题理念")
    out.append("")
    out.append(bp.design_rationale)
    out.append("")
    out.append("## 重点考查知识点")
    out.append("")
    out.append("- " + "\n- ".join(bp.knowledge_coverage))
    out.append("")
    out.append("---")
    out.append("")
    out.append("## 试题正文")
    out.append("")

    for fq in paper.questions:
        q_bp = fq.blueprint
        draft = fq.draft
        out.append(f"### 第 {q_bp.number} 题({q_bp.question_type}, {q_bp.score} 分)")
        out.append("")
        out.append(draft.stem)
        out.append("")
        if draft.options:
            for opt in draft.options:
                out.append(opt + "  ")
            out.append("")
        if draft.diagram_description:
            out.append(f"> 配图说明:{draft.diagram_description}")
            out.append("")

    out.append("---")
    out.append("")
    out.append("## 参考答案与解析")
    out.append("")
    for fq in paper.questions:
        sol = fq.solution
        out.append(f"### 第 {fq.blueprint.number} 题")
        out.append("")
        out.append(f"**答案**:{sol.answer}")
        out.append("")
        out.append(f"**解析**:")
        out.append("")
        out.append(sol.solution)
        out.append("")
        if sol.common_mistakes:
            out.append("**易错点**:")
            for m in sol.common_mistakes:
                out.append(f"- {m}")
            out.append("")
        if sol.extension:
            out.append(f"**拓展**:{sol.extension}")
            out.append("")

    out.append("---")
    out.append("")
    out.append("## 主审评语")
    out.append("")
    out.append(f"**整卷综合质量评分**:{paper.chief_review.overall_quality_score:.2f}")
    out.append("")
    out.append(f"**是否可发布**:{'是' if paper.chief_review.publishable else '否(需重做)'}")
    out.append("")
    out.append(paper.chief_review.executive_summary)
    out.append("")
    if paper.chief_review.balance_issues:
        out.append("**整卷平衡问题**:")
        for x in paper.chief_review.balance_issues:
            out.append(f"- {x}")
        out.append("")
    if paper.chief_review.final_adjustments:
        out.append("**最终调整建议**:")
        for adj in paper.chief_review.final_adjustments:
            out.append(f"- 第 {adj.get('question_number', '?')} 题:{adj.get('adjustment', '')}")
        out.append("")

    out.append("---")
    out.append("")
    out.append("## 元信息")
    out.append("")
    for k, v in paper.metadata.items():
        out.append(f"- {k}: {v}")
    out.append("")

    return "\n".join(out)
