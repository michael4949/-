"""命令行端到端演示：导入知识库 -> 解析示例招标文件 -> 生成标书 -> 审核 -> 导出。

用法：
    python scripts/demo.py [招标文件路径] [--company 公司名]
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bid_agent.config import get_config  # noqa: E402
from bid_agent.models import StageEvent  # noqa: E402
from bid_agent.service import get_service  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="标书生成智能体 · 命令行演示")
    parser.add_argument("tender", nargs="?", help="招标文件路径（默认使用示例）")
    parser.add_argument("--company", default="鸿源管道科技有限公司", help="投标人名称")
    parser.add_argument("--no-seed", action="store_true", help="不重新导入示例知识库")
    args = parser.parse_args()

    cfg = get_config()
    svc = get_service()

    if not args.no_seed and svc.kb_stats()["documents"] == 0:
        print(">> 知识库为空，导入示例企业资料…")
        kb_dir = cfg.data_dir / "knowledge_base"
        for p in sorted(kb_dir.glob("*.md")):
            svc.kb_add_file(p, p.name, category="示例")
        print(f"   知识库：{svc.kb_stats()}")

    tender = Path(args.tender) if args.tender else cfg.data_dir / "samples" / "示例招标文件.md"
    if not tender.exists():
        print(f"招标文件不存在：{tender}")
        return 1

    print(f">> LLM 后端：{svc.llm.name}（available={svc.llm.available}），嵌入器：{svc.kb.embedder.name}")
    print(f">> 招标文件：{tender.name}")

    task = svc.create_task(tender, tender.name, company=args.company)
    print(f">> 任务已创建：{task.id}\n")

    t0 = time.time()
    task = svc.run_task(task.id)
    elapsed = time.time() - t0

    print("\n===== 阶段日志 =====")
    for ev in task.events:
        print(f"  [{ev.progress:3d}%] {ev.stage:<9} {ev.message}")

    if task.status != "done":
        print(f"\n任务失败：{task.error}")
        return 2

    req = task.requirement or {}
    print("\n===== 招标需求摘要 =====")
    print(f"  项目名称：{req.get('project_name')}")
    print(f"  项目编号：{req.get('project_no')}")
    print(f"  采购人：{req.get('purchaser')}")
    print(f"  预算/限价：{req.get('budget')}  保证金：{req.get('bid_bond')}")
    print(f"  投标截止：{req.get('deadline')}")
    print(f"  废标/实质性条款：{len(req.get('mandatory_items', []))} 条")
    for m in req.get("mandatory_items", [])[:5]:
        print(f"    - [{m['category']}] {m['requirement'][:50]}")
    print(f"  评分项：{len(req.get('scoring_items', []))}  技术参数：{len(req.get('tech_params', []))}  风险：{len(req.get('risks', []))}")

    review = task.review or {}
    print("\n===== 审核结论 =====")
    print(f"  {review.get('summary')}")

    print("\n===== 生成结果 =====")
    print(f"  章节数：{len(task.bid.get('sections', []))}")
    for s in task.bid.get("sections", []):
        print(f"    · {s['title']}（{s['char_count']} 字，引用 {len(s['sources'])} 份资料，{s['status']}）")
    print(f"\n  标书文件：{task.output_docx}")
    print(f"  用时：{elapsed:.1f} 秒")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
