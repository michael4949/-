"""全局配置。环境变量优先,默认走最稳的设置。"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AgentModelConfig:
    """单个 Agent 的模型配置。"""

    model: str
    effort: str = "high"
    use_thinking: bool = True
    max_tokens: int = 16000


@dataclass(frozen=True)
class Config:
    """系统级配置。"""

    anthropic_api_key: str

    planner: AgentModelConfig
    analyst: AgentModelConfig
    composer: AgentModelConfig
    solution: AgentModelConfig
    reviewer: AgentModelConfig
    chief_editor: AgentModelConfig

    max_revision_rounds: int = 3
    output_dir: str = "outputs"
    enable_cache: bool = True
    verbose: bool = True


def load_config() -> Config:
    """从环境变量加载配置。"""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "未检测到 ANTHROPIC_API_KEY。请先在环境变量中设置,或复制 .env.example 为 .env 后填入。"
        )

    # 默认最佳实践:
    # - 命题/质检用 Opus 4.8(最强推理,关系到成卷质量)
    # - 解析、风格分析、主审用 Sonnet 4.6(性价比高,质量够用)
    # - 全部启用 adaptive thinking + high effort
    default_opus = os.environ.get("QIGUANG_OPUS_MODEL", "claude-opus-4-8")
    default_sonnet = os.environ.get("QIGUANG_SONNET_MODEL", "claude-sonnet-4-6")

    return Config(
        anthropic_api_key=api_key,
        planner=AgentModelConfig(model=default_opus, effort="high"),
        analyst=AgentModelConfig(model=default_sonnet, effort="medium"),
        composer=AgentModelConfig(model=default_opus, effort="high", max_tokens=20000),
        solution=AgentModelConfig(model=default_sonnet, effort="medium"),
        reviewer=AgentModelConfig(model=default_opus, effort="high"),
        chief_editor=AgentModelConfig(model=default_opus, effort="high"),
        max_revision_rounds=int(os.environ.get("QIGUANG_MAX_REVISION_ROUNDS", "3")),
        output_dir=os.environ.get("QIGUANG_OUTPUT_DIR", "outputs"),
        enable_cache=os.environ.get("QIGUANG_ENABLE_CACHE", "1") == "1",
        verbose=os.environ.get("QIGUANG_VERBOSE", "1") == "1",
    )
