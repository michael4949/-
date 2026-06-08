"""将 data/knowledge_base 下的示例文档导入企业知识库。

用法：
    python -m scripts.seed_knowledge_base
    python scripts/seed_knowledge_base.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bid_agent.config import get_config  # noqa: E402
from bid_agent.service import get_service  # noqa: E402

CATEGORY_HINT = {
    "公司简介": "公司简介",
    "资质": "资质证书",
    "产品": "产品参数",
    "业绩": "项目业绩",
    "售后": "售后服务",
    "质量": "实施方案",
}


def guess_category(name: str) -> str:
    for k, v in CATEGORY_HINT.items():
        if k in name:
            return v
    return "其他"


def main() -> int:
    cfg = get_config()
    svc = get_service()
    kb_dir = cfg.data_dir / "knowledge_base"
    files = sorted(p for p in kb_dir.glob("*") if p.suffix.lower() in {".md", ".txt", ".docx", ".pdf"})
    if not files:
        print(f"未在 {kb_dir} 找到可导入的文档。")
        return 1
    print(f"开始导入 {len(files)} 个文档到知识库（嵌入器：{svc.kb.embedder.name}）…")
    for p in files:
        info = svc.kb_add_file(p, p.name, category=guess_category(p.name))
        print(f"  ✓ {p.name}  ->  {info['chunks']} 块  [{info['category']}]")
    stats = svc.kb_stats()
    print(f"完成。知识库现有文档 {stats['documents']} 篇、片段 {stats['chunks']} 个。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
