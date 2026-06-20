"""命题工作流中流转的数据结构。所有 Agent 之间的输入输出都用这些 schema。"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Optional


class Subject(str, Enum):
    CHINESE = "语文"
    MATH = "数学"
    ENGLISH = "英语"
    PHYSICS = "物理"
    CHEMISTRY = "化学"
    BIOLOGY = "生物"
    POLITICS = "道德与法治"
    HISTORY = "历史"
    GEOGRAPHY = "地理"


class Stage(str, Enum):
    PRIMARY = "小学"
    JUNIOR = "初中"
    SENIOR = "高中"


class QuestionType(str, Enum):
    SINGLE_CHOICE = "单项选择"
    MULTI_CHOICE = "多项选择"
    FILL_BLANK = "填空"
    SHORT_ANSWER = "简答"
    CALCULATION = "计算"
    PROOF = "证明"
    READING = "阅读理解"
    COMPOSITION = "作文"
    EXPERIMENT = "实验"
    APPLICATION = "应用题"


@dataclass
class QuestionBlueprint:
    """单题命题蓝图。Planner 产出,Composer 消费。"""

    number: int
    question_type: str
    knowledge_points: list[str]
    expected_difficulty: float
    expected_discrimination: float
    score: int
    context_hint: str = ""
    notes: str = ""


@dataclass
class PaperBlueprint:
    """整卷蓝图。Planner 产出。"""

    subject: str
    stage: str
    grade: str
    total_score: int
    duration_minutes: int
    target_audience: str
    overall_difficulty: float
    design_rationale: str
    knowledge_coverage: list[str]
    questions: list[QuestionBlueprint]

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "PaperBlueprint":
        questions = [QuestionBlueprint(**q) for q in d["questions"]]
        return cls(
            subject=d["subject"],
            stage=d["stage"],
            grade=d["grade"],
            total_score=int(d["total_score"]),
            duration_minutes=int(d["duration_minutes"]),
            target_audience=d["target_audience"],
            overall_difficulty=float(d["overall_difficulty"]),
            design_rationale=d["design_rationale"],
            knowledge_coverage=list(d["knowledge_coverage"]),
            questions=questions,
        )


@dataclass
class StyleReport:
    """单题真题风格分析报告。Analyst 产出,Composer 消费。"""

    common_context_types: list[str]
    common_traps: list[str]
    expression_style: str
    sample_real_questions: list[str]
    notes: str = ""

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "StyleReport":
        return cls(
            common_context_types=list(d.get("common_context_types", [])),
            common_traps=list(d.get("common_traps", [])),
            expression_style=d.get("expression_style", ""),
            sample_real_questions=list(d.get("sample_real_questions", [])),
            notes=d.get("notes", ""),
        )


@dataclass
class QuestionDraft:
    """命题执笔产出的题目原稿。"""

    stem: str
    options: Optional[list[str]] = None
    diagram_description: str = ""
    creative_rationale: str = ""

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "QuestionDraft":
        return cls(
            stem=d["stem"],
            options=d.get("options"),
            diagram_description=d.get("diagram_description", ""),
            creative_rationale=d.get("creative_rationale", ""),
        )


@dataclass
class SolutionDraft:
    """解析撰写产出。"""

    answer: str
    solution: str
    key_points: list[str] = field(default_factory=list)
    common_mistakes: list[str] = field(default_factory=list)
    extension: str = ""

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "SolutionDraft":
        return cls(
            answer=d["answer"],
            solution=d["solution"],
            key_points=list(d.get("key_points", [])),
            common_mistakes=list(d.get("common_mistakes", [])),
            extension=d.get("extension", ""),
        )


@dataclass
class ReviewReport:
    """质检报告。Reviewer 产出。"""

    difficulty_score: float
    discrimination_score: float
    knowledge_coverage_match: bool
    expression_quality: float
    answer_correctness: bool
    political_safety: bool
    issues: list[str]
    suggestions: list[str]
    verdict: str
    verdict_rationale: str = ""

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ReviewReport":
        return cls(
            difficulty_score=float(d["difficulty_score"]),
            discrimination_score=float(d["discrimination_score"]),
            knowledge_coverage_match=bool(d["knowledge_coverage_match"]),
            expression_quality=float(d["expression_quality"]),
            answer_correctness=bool(d["answer_correctness"]),
            political_safety=bool(d["political_safety"]),
            issues=list(d.get("issues", [])),
            suggestions=list(d.get("suggestions", [])),
            verdict=d["verdict"],
            verdict_rationale=d.get("verdict_rationale", ""),
        )


@dataclass
class FinalizedQuestion:
    """单题最终定稿(蓝图+原稿+解析+质检全部齐全)。"""

    blueprint: QuestionBlueprint
    draft: QuestionDraft
    solution: SolutionDraft
    review: ReviewReport
    revision_rounds: int = 0


@dataclass
class ChiefReview:
    """整卷主审报告。"""

    overall_quality_score: float
    balance_issues: list[str]
    style_consistency_issues: list[str]
    final_adjustments: list[dict[str, Any]]
    publishable: bool
    executive_summary: str

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ChiefReview":
        return cls(
            overall_quality_score=float(d["overall_quality_score"]),
            balance_issues=list(d.get("balance_issues", [])),
            style_consistency_issues=list(d.get("style_consistency_issues", [])),
            final_adjustments=list(d.get("final_adjustments", [])),
            publishable=bool(d["publishable"]),
            executive_summary=d["executive_summary"],
        )


@dataclass
class FinalPaper:
    """最终成卷。"""

    blueprint: PaperBlueprint
    questions: list[FinalizedQuestion]
    chief_review: ChiefReview
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
