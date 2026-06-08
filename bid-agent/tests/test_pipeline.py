"""端到端冒烟测试（离线降级引擎下应全程跑通）。

运行：
    python -m pytest tests/ -v
    python tests/test_pipeline.py
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from bid_agent.config import Config, set_config  # noqa: E402


def _fresh_service():
    """使用独立临时数据目录，避免污染真实运行数据。"""
    tmp = Path(tempfile.mkdtemp(prefix="bidtest_"))
    cfg = Config(data_dir=tmp, llm_mode="off")
    # 复制示例知识库与招标文件到临时目录
    import shutil

    (tmp / "knowledge_base").mkdir(parents=True, exist_ok=True)
    (tmp / "samples").mkdir(parents=True, exist_ok=True)
    for p in (ROOT / "data" / "knowledge_base").glob("*.md"):
        shutil.copy(p, tmp / "knowledge_base" / p.name)
    shutil.copy(ROOT / "data" / "samples" / "示例招标文件.md", tmp / "samples" / "示例招标文件.md")
    set_config(cfg)
    # 重新构造 service 单例
    import bid_agent.service as svc_mod

    svc_mod._SERVICE = None
    return svc_mod.get_service(), cfg


def test_parsing():
    from bid_agent.parsing import parse_document

    _, cfg = _fresh_service()
    parsed = parse_document(cfg.data_dir / "samples" / "示例招标文件.md")
    assert parsed.char_count > 500
    assert "球墨铸铁管" in parsed.full_text
    print("✓ 解析：%d 字" % parsed.char_count)


def test_extraction():
    from bid_agent.extraction import RequirementExtractor
    from bid_agent.parsing import parse_document

    _, cfg = _fresh_service()
    parsed = parse_document(cfg.data_dir / "samples" / "示例招标文件.md")
    req = RequirementExtractor(llm=None).extract(parsed)
    assert req.project_no == "HYZB-2026-DN0612", req.project_no
    assert "980" in req.budget, req.budget
    assert req.deadline, "未抽取到投标截止时间"
    assert len(req.mandatory_items) >= 4, len(req.mandatory_items)
    assert len(req.scoring_items) >= 3, len(req.scoring_items)
    assert len(req.tech_params) >= 5, len(req.tech_params)
    assert len(req.risks) >= 2, len(req.risks)
    print("✓ 抽取：废标项%d 评分%d 技参%d 风险%d" % (
        len(req.mandatory_items), len(req.scoring_items), len(req.tech_params), len(req.risks)))


def test_kb_retrieval():
    svc, cfg = _fresh_service()
    for p in (cfg.data_dir / "knowledge_base").glob("*.md"):
        svc.kb_add_file(p, p.name, category="测试")
    assert svc.kb_stats()["documents"] == 6
    hits = svc.kb_search("球墨铸铁管 技术参数 球化率", top_k=3)
    assert hits, "检索无结果"
    assert any("球墨铸铁" in h["text"] or "球化率" in h["text"] for h in hits)
    print("✓ 检索：top1 来源 = %s（score=%.3f）" % (hits[0]["source"], hits[0]["score"]))


def test_end_to_end():
    svc, cfg = _fresh_service()
    for p in (cfg.data_dir / "knowledge_base").glob("*.md"):
        svc.kb_add_file(p, p.name, category="测试")
    tender = cfg.data_dir / "samples" / "示例招标文件.md"
    task = svc.create_task(tender, tender.name, company="鸿源管道科技有限公司")
    task = svc.run_task(task.id)
    assert task.status == "done", task.error
    assert task.output_docx and Path(task.output_docx).exists()
    assert len(task.bid["sections"]) >= 8
    # 关键章节非空
    titles = {s["title"]: s for s in task.bid["sections"]}
    assert any("公司简介" in t for t in titles)
    assert any("技术方案" in t for t in titles)
    # 审核产出
    assert task.review["checked_mandatory"] >= 4
    # 公司简介应引用了知识库资料
    profile = next(s for t, s in titles.items() if "公司简介" in t)
    assert profile["sources"], "公司简介未引用知识库资料"
    print("✓ 端到端：%d 章节，合规度 %.1f，文件 %s" % (
        len(task.bid["sections"]), task.review["score"], Path(task.output_docx).name))


def _run_all():
    fns = [test_parsing, test_extraction, test_kb_retrieval, test_end_to_end]
    failed = 0
    for fn in fns:
        try:
            fn()
        except Exception as e:
            failed += 1
            print(f"✗ {fn.__name__} 失败：{e}")
    print("\n%d/%d 通过" % (len(fns) - failed, len(fns)))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(_run_all())
