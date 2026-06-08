"""标书目录构建。

优先采用招标文件规定的「投标文件组成」；否则使用管道行业通用标书结构。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional

from ..models import RequirementSummary


@dataclass
class SectionSpec:
    """章节规格：检索查询模板 + 生成指令 + 降级模板键。"""

    key: str
    title: str
    order: int
    query: str = ""  # 知识库检索查询
    instruction: str = ""  # 给 LLM 的写作要求
    fallback: str = "generic"  # 降级模板键
    needs_kb: bool = True


# 管道行业通用标书结构
DEFAULT_SPECS: List[SectionSpec] = [
    SectionSpec(
        key="bid_letter", title="投标函", order=10, needs_kb=False, fallback="bid_letter",
        instruction="撰写正式投标函，包含响应招标编号/项目名称、投标报价口径、承诺投标有效期、遵守招标文件等内容。",
    ),
    SectionSpec(
        key="authorization", title="法定代表人身份证明及授权委托书", order=20, needs_kb=False,
        fallback="authorization",
        instruction="生成法定代表人身份证明与授权委托书模板，预留签字盖章位。",
    ),
    SectionSpec(
        key="company_profile", title="公司简介", order=30,
        query="公司简介 企业概况 成立时间 注册资本 主营业务 管道",
        instruction="基于企业资料撰写公司简介，突出在管道行业的实力、规模与核心竞争力。",
        fallback="company_profile",
    ),
    SectionSpec(
        key="qualification", title="资格及资信证明", order=40,
        query="资质证书 营业执照 资格 认证 ISO 安全生产许可",
        instruction="列示并说明本公司具备的资质、认证与资信证明，呼应招标资格要求。",
        fallback="qualification",
    ),
    SectionSpec(
        key="performance", title="类似项目业绩", order=50,
        query="类似业绩 项目案例 合同 管道 供货 施工 中标 业主",
        instruction="罗列与本项目类似的代表性业绩，包含项目名称、业主、规模、时间与合同金额。",
        fallback="performance",
    ),
    SectionSpec(
        key="tech_solution", title="技术方案", order=60,
        query="技术方案 管材 管件 产品 技术参数 材质 标准 性能 工艺",
        instruction="围绕招标技术参数要求编写技术方案，逐条响应关键技术指标，说明产品选型、材质、执行标准与性能优势。",
        fallback="tech_solution",
    ),
    SectionSpec(
        key="implementation", title="项目实施方案", order=70,
        query="项目实施 进度计划 组织机构 质量保证 安全文明施工 供货计划",
        instruction="编写项目实施方案，覆盖组织机构、进度计划、质量保证体系、安全文明施工、供货与运输等。",
        fallback="implementation",
    ),
    SectionSpec(
        key="after_sales", title="售后服务承诺", order=80,
        query="售后服务 质保 质量保证期 服务响应 维修 培训 备品备件",
        instruction="编写售后服务方案与承诺，包含质保期、响应时间、服务网络、备品备件与培训。",
        fallback="after_sales",
    ),
    SectionSpec(
        key="pricing", title="投标报价", order=90, needs_kb=False,
        instruction="给出投标报价说明与报价一览表（含分项），报价口径与招标要求一致。",
        fallback="pricing",
    ),
    SectionSpec(
        key="compliance", title="实质性要求响应/偏离表", order=100, needs_kb=False,
        instruction="对招标文件中的废标项与实质性要求逐条作出响应，注明是否满足。",
        fallback="compliance",
    ),
]


def build_outline(req: RequirementSummary) -> List[SectionSpec]:
    """根据需求摘要构建章节列表。"""
    specs = list(DEFAULT_SPECS)

    # 招标文件明确规定的投标文件组成 -> 追加未覆盖的章节
    known_titles = {s.title for s in specs}
    extra_order = 110
    for title in req.bid_doc_outline:
        t = title.strip()
        if not t or len(t) > 30:
            continue
        if any(_similar(t, kt) for kt in known_titles):
            continue
        specs.append(
            SectionSpec(
                key=f"extra_{extra_order}", title=t, order=extra_order,
                query=t, instruction=f"按招标文件要求编写「{t}」部分。", fallback="generic",
            )
        )
        known_titles.add(t)
        extra_order += 10

    return sorted(specs, key=lambda s: s.order)


def _similar(a: str, b: str) -> bool:
    a2 = a.replace("及", "").replace(" ", "")
    b2 = b.replace("及", "").replace(" ", "")
    return a2 in b2 or b2 in a2 or len(set(a2) & set(b2)) >= max(2, min(len(a2), len(b2)) // 2)
