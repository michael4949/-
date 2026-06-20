"""6 个专业 Agent 的实现。

每个 Agent 都是一个轻量类,核心方法是 `run()`——接收 schema 化的输入,
返回 schema 化的输出。底层通过 Anthropic Messages API 调用。
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict
from typing import Any

from anthropic import Anthropic, APIStatusError

from . import prompts
from .config import AgentModelConfig
from .schemas import (
    ChiefReview,
    FinalizedQuestion,
    PaperBlueprint,
    QuestionBlueprint,
    QuestionDraft,
    ReviewReport,
    SolutionDraft,
    StyleReport,
)


class AgentError(RuntimeError):
    """Agent 调用或输出解析错误。"""


def _extract_json(raw: str) -> dict[str, Any]:
    """从模型回复中抽取 JSON。容错处理 Markdown 代码块和前后多余文本。"""
    text = raw.strip()

    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1)

    if not text.startswith("{"):
        first = text.find("{")
        last = text.rfind("}")
        if first == -1 or last == -1 or last < first:
            raise AgentError(f"输出中未找到 JSON 对象:\n{raw[:500]}")
        text = text[first : last + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise AgentError(f"JSON 解析失败:{e}\n原始输出片段:\n{text[:500]}") from e


class _AgentBase:
    """所有专业 Agent 的基类。统一封装 Anthropic 调用、缓存、重试、JSON 解析。"""

    name: str = "BaseAgent"
    system_prompt: str = ""

    def __init__(
        self,
        client: Anthropic,
        model_config: AgentModelConfig,
        enable_cache: bool = True,
        verbose: bool = True,
    ):
        self.client = client
        self.model_config = model_config
        self.enable_cache = enable_cache
        self.verbose = verbose

    def _log(self, msg: str) -> None:
        if self.verbose:
            print(f"[{self.name}] {msg}", flush=True)

    def _call(self, user_message: str, system: str | None = None) -> str:
        """同步调用模型,返回文本响应。"""
        sys = system or self.system_prompt

        system_block: dict[str, Any] = {"type": "text", "text": sys}
        if self.enable_cache:
            system_block["cache_control"] = {"type": "ephemeral"}

        kwargs: dict[str, Any] = {
            "model": self.model_config.model,
            "max_tokens": self.model_config.max_tokens,
            "system": [system_block],
            "messages": [{"role": "user", "content": user_message}],
        }
        if self.model_config.use_thinking:
            kwargs["thinking"] = {"type": "adaptive"}
            kwargs["output_config"] = {"effort": self.model_config.effort}

        try:
            response = self.client.messages.create(**kwargs)
        except APIStatusError as e:
            raise AgentError(f"Anthropic API 调用失败({self.name}):{e}") from e

        text_parts: list[str] = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
        return "".join(text_parts).strip()

    def _call_json(self, user_message: str, system: str | None = None) -> dict[str, Any]:
        raw = self._call(user_message, system=system)
        return _extract_json(raw)


# =============================================================================
# Planner 命题策划官
# =============================================================================

class PlannerAgent(_AgentBase):
    name = "命题策划官"
    system_prompt = prompts.PLANNER_SYSTEM

    def run(self, request: dict[str, Any]) -> PaperBlueprint:
        """
        request 字段示例:
        {
          "subject": "数学", "stage": "初中", "grade": "九年级",
          "total_score": 120, "duration_minutes": 120,
          "target_audience": "河北省 2025 届初三第一次模拟考试",
          "knowledge_focus": ["实数运算", "一元二次方程", ...],
          "question_count": 5,  # 想生成几道题(用于演示时控制成本)
          "constraints": "..."  # 任意补充约束
        }
        """
        self._log("开始策划整卷蓝图 ...")

        user_message = (
            "请基于以下命题需求,产出整卷命题蓝图。\n\n"
            f"【需求 JSON】\n{json.dumps(request, ensure_ascii=False, indent=2)}\n\n"
            "请严格按照系统提示的输出格式,返回纯 JSON。"
        )
        data = self._call_json(user_message)
        blueprint = PaperBlueprint.from_dict(data)
        self._log(f"蓝图已生成。共 {len(blueprint.questions)} 道题,整卷难度 {blueprint.overall_difficulty}。")
        return blueprint


# =============================================================================
# Analyst 真题分析师
# =============================================================================

class AnalystAgent(_AgentBase):
    name = "真题分析师"
    system_prompt = prompts.ANALYST_SYSTEM

    def run(
        self,
        paper_meta: dict[str, Any],
        question_bp: QuestionBlueprint,
        reference_real_questions: list[str] | None = None,
    ) -> StyleReport:
        self._log(f"分析第 {question_bp.number} 题的真题命题风格 ...")

        refs = reference_real_questions or []
        user_message = (
            "请针对以下命题任务,产出真题命题风格指南。\n\n"
            f"【试卷背景】\n{json.dumps(paper_meta, ensure_ascii=False, indent=2)}\n\n"
            f"【单题命题任务】\n{json.dumps(asdict(question_bp), ensure_ascii=False, indent=2)}\n\n"
            f"【知识库中已有真题片段(参考)】\n{json.dumps(refs, ensure_ascii=False, indent=2) if refs else '无'}\n\n"
            "请严格按照系统提示的输出格式,返回纯 JSON。"
        )
        data = self._call_json(user_message)
        return StyleReport.from_dict(data)


# =============================================================================
# Composer 命题执笔
# =============================================================================

class ComposerAgent(_AgentBase):
    name = "命题执笔"
    system_prompt = prompts.COMPOSER_SYSTEM

    def run(
        self,
        paper_meta: dict[str, Any],
        question_bp: QuestionBlueprint,
        style: StyleReport,
        revision_notes: str = "",
    ) -> QuestionDraft:
        round_no = 1 if not revision_notes else 2
        self._log(f"撰写第 {question_bp.number} 题原稿(第 {round_no} 轮)...")

        user_message = (
            "请基于以下信息撰写题目原稿。\n\n"
            f"【试卷背景】\n{json.dumps(paper_meta, ensure_ascii=False, indent=2)}\n\n"
            f"【单题命题任务】\n{json.dumps(asdict(question_bp), ensure_ascii=False, indent=2)}\n\n"
            f"【真题风格指南】\n{json.dumps(asdict(style), ensure_ascii=False, indent=2)}\n\n"
        )
        if revision_notes:
            user_message += (
                f"【上一轮修订建议(本轮必须改进)】\n{revision_notes}\n\n"
            )
        user_message += "请严格按照系统提示的输出格式,返回纯 JSON。"

        data = self._call_json(user_message)
        return QuestionDraft.from_dict(data)


# =============================================================================
# SolutionWriter 解析撰写
# =============================================================================

class SolutionAgent(_AgentBase):
    name = "解析撰写"
    system_prompt = prompts.SOLUTION_SYSTEM

    def run(
        self,
        question_bp: QuestionBlueprint,
        draft: QuestionDraft,
    ) -> SolutionDraft:
        self._log(f"撰写第 {question_bp.number} 题的标准答案与解析 ...")

        user_message = (
            "请为以下题目撰写标准答案与详细解析。\n\n"
            f"【单题命题任务】\n{json.dumps(asdict(question_bp), ensure_ascii=False, indent=2)}\n\n"
            f"【题目原稿】\n{json.dumps(asdict(draft), ensure_ascii=False, indent=2)}\n\n"
            "请严格按照系统提示的输出格式,返回纯 JSON。"
        )
        data = self._call_json(user_message)
        return SolutionDraft.from_dict(data)


# =============================================================================
# Reviewer 质检审核
# =============================================================================

class ReviewerAgent(_AgentBase):
    name = "质检审核"
    system_prompt = prompts.REVIEWER_SYSTEM

    def run(
        self,
        question_bp: QuestionBlueprint,
        draft: QuestionDraft,
        solution: SolutionDraft,
    ) -> ReviewReport:
        self._log(f"对第 {question_bp.number} 题进行 6 维度质检 ...")

        user_message = (
            "请对以下题目进行全维度质检。\n\n"
            f"【单题命题任务】\n{json.dumps(asdict(question_bp), ensure_ascii=False, indent=2)}\n\n"
            f"【题目原稿】\n{json.dumps(asdict(draft), ensure_ascii=False, indent=2)}\n\n"
            f"【标准答案与解析】\n{json.dumps(asdict(solution), ensure_ascii=False, indent=2)}\n\n"
            "请严格按照系统提示的输出格式,返回纯 JSON。"
        )
        data = self._call_json(user_message)
        report = ReviewReport.from_dict(data)
        self._log(
            f"第 {question_bp.number} 题质检结果:{report.verdict}"
            f"(难度 {report.difficulty_score:.2f},区分度 {report.discrimination_score:.2f})"
        )
        return report


# =============================================================================
# ChiefEditor 主审定稿
# =============================================================================

class ChiefEditorAgent(_AgentBase):
    name = "主审定稿"
    system_prompt = prompts.CHIEF_EDITOR_SYSTEM

    def run(
        self,
        blueprint: PaperBlueprint,
        questions: list[FinalizedQuestion],
    ) -> ChiefReview:
        self._log("开始整卷整体平衡审查 ...")

        questions_payload = []
        for q in questions:
            questions_payload.append(
                {
                    "blueprint": asdict(q.blueprint),
                    "draft": asdict(q.draft),
                    "solution": asdict(q.solution),
                    "review": asdict(q.review),
                    "revision_rounds": q.revision_rounds,
                }
            )

        user_message = (
            "请对整卷做最终主审。\n\n"
            f"【整卷蓝图】\n{json.dumps(asdict(blueprint), ensure_ascii=False, indent=2)}\n\n"
            f"【整卷草稿(每题包含蓝图、原稿、解析、质检报告)】\n"
            f"{json.dumps(questions_payload, ensure_ascii=False, indent=2)}\n\n"
            "请严格按照系统提示的输出格式,返回纯 JSON。"
        )
        data = self._call_json(user_message)
        chief = ChiefReview.from_dict(data)
        self._log(
            f"主审完成。整卷质量评分 {chief.overall_quality_score:.2f},"
            f"{'可发布' if chief.publishable else '需重做'}。"
        )
        return chief
