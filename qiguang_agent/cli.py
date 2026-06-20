"""CLI 入口。

用法:
    python -m qiguang_agent.cli --request examples/request_math.json
    python -m qiguang_agent.cli --request examples/request_math.json --count 3 --verbose

支持环境变量配置(详见 .env.example):
    ANTHROPIC_API_KEY        必填
    QIGUANG_OPUS_MODEL       默认 claude-opus-4-8
    QIGUANG_SONNET_MODEL     默认 claude-sonnet-4-6
    QIGUANG_OUTPUT_DIR       默认 outputs
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .config import load_config
from .workflow import QiguangWorkflow


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="qiguang_agent",
        description="启光命题教辅研发智能体 - 端到端原创试题命题流水线",
    )
    parser.add_argument(
        "--request",
        type=str,
        required=True,
        help="命题需求 JSON 文件路径(参考 examples/request_math.json)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=None,
        help="覆写 request 中的 question_count,用于控制本次生成的题数",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="安静模式:只输出关键信息",
    )
    args = parser.parse_args()

    request_path = Path(args.request)
    if not request_path.exists():
        print(f"错误:命题需求文件 {request_path} 不存在。", file=sys.stderr)
        return 2

    try:
        request = json.loads(request_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"错误:命题需求 JSON 解析失败:{e}", file=sys.stderr)
        return 2

    if args.count is not None:
        request["question_count"] = args.count

    try:
        config = load_config()
    except RuntimeError as e:
        print(f"错误:{e}", file=sys.stderr)
        return 2

    if args.quiet:
        config = config.__class__(**{**config.__dict__, "verbose": False})

    workflow = QiguangWorkflow(config)

    try:
        paper = workflow.run_paper(request)
    except Exception as e:
        print(f"\n命题流水线异常:{e}", file=sys.stderr)
        return 1

    print()
    print(f"✓ 已完成。结果存放在 {config.output_dir}/ 下。")
    print(f"  - 整卷质量评分:{paper.chief_review.overall_quality_score:.2f}")
    print(f"  - 是否可发布:{'是' if paper.chief_review.publishable else '否'}")
    print(f"  - 实际定稿题数:{len(paper.questions)}/{len(paper.blueprint.questions)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
