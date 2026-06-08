"""分模块生成 Agent。

每个标书章节由一个 SectionAgent 负责：
  1. 依据章节查询，从企业知识库检索相关资料（RAG）。
  2. 若本地大模型可用：带「仅依据企业资料、不得虚构」的约束生成。
  3. 否则：使用领域模板 + 检索内容的确定性合成器（fallback composer）。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple

from ..infra.llm import BaseLLM
from ..logging_utils import get_logger
from ..models import BidSection, RequirementSummary, RetrievedChunk
from .outline import SectionSpec

log = get_logger("generation.agent")


@dataclass
class GenContext:
    """生成上下文（在各 Agent 间共享）。"""

    req: RequirementSummary
    llm: BaseLLM
    kb: Optional[object] = None  # KnowledgeBase（惰性，避免循环依赖）
    company: str = "我公司"
    top_k: int = 5


class SectionAgent:
    """单章节生成 Agent。"""

    def __init__(self, spec: SectionSpec):
        self.spec = spec

    def generate(self, ctx: GenContext) -> BidSection:
        spec = self.spec
        section = BidSection(key=spec.key, title=spec.title, order=spec.order, agent=f"agent::{spec.key}")

        chunks: List[RetrievedChunk] = []
        if spec.needs_kb and ctx.kb is not None and spec.query:
            try:
                chunks = ctx.kb.search(self._expand_query(spec, ctx), top_k=ctx.top_k)
            except Exception as e:
                log.warning("章节 %s 检索失败：%s", spec.key, e)
        section.sources = sorted({c.source for c in chunks})

        try:
            if ctx.llm and ctx.llm.available:
                section.content = self._generate_llm(ctx, chunks)
            else:
                content, table = _compose(spec.fallback, spec, ctx, chunks)
                section.content = content
                section.table = table
            section.status = "done"
        except Exception as e:
            log.warning("章节 %s 生成失败，回退模板：%s", spec.key, e)
            content, table = _compose(spec.fallback, spec, ctx, chunks)
            section.content = content
            section.table = table
            section.status = "done"

        # 价格/响应表即便走了 LLM，也补充结构化表格
        if spec.fallback in {"pricing", "compliance"} and not section.table:
            _, table = _compose(spec.fallback, spec, ctx, chunks)
            section.table = table

        section.char_count = len(section.content)
        return section

    # ---------------- 检索查询扩展 ----------------
    def _expand_query(self, spec: SectionSpec, ctx: GenContext) -> str:
        extra = " ".join(p.name for p in ctx.req.tech_params[:5]) if spec.key == "tech_solution" else ""
        return f"{spec.query} {ctx.req.project_name} {extra}".strip()

    # ---------------- LLM 生成 ----------------
    def _generate_llm(self, ctx: GenContext, chunks: List[RetrievedChunk]) -> str:
        req = ctx.req
        context = "\n\n".join(f"[资料·{c.source}] {c.text}" for c in chunks) or "（无可用企业资料，请基于通用专业表述撰写，并标注需补充的具体数据）"
        tech_lines = "\n".join(f"- {p.requirement}" for p in req.tech_params[:20])
        mand_lines = "\n".join(f"- {m.requirement}" for m in req.mandatory_items[:15])
        system = (
            "你是资深标书撰写专家，服务于管道行业投标。写作要求：专业、严谨、条理清晰；"
            "严格依据【企业资料】，不得虚构企业不具备的资质、业绩或数据；缺数据处用【】占位提示补充。"
        )
        prompt = f"""请撰写投标文件中的「{self.spec.title}」章节。

【项目信息】
项目名称：{req.project_name or '（见招标文件）'}
采购人：{req.purchaser or '—'}
预算/限价：{req.budget or '—'}
投标人：{ctx.company}

【写作要求】
{self.spec.instruction}

【需重点响应的技术参数】
{tech_lines or '（无）'}

【需满足的实质性要求】
{mand_lines or '（无）'}

【企业资料（仅可依据以下内容，不得编造）】
{context}

请直接输出该章节正文（中文，可用小标题与分段），不要重复章节标题，不要输出解释。"""
        return ctx.llm.generate(prompt, system=system, max_tokens=2048).strip()


# ============================================================
#                     降级合成器（无 LLM）
# ============================================================
Composer = Callable[[SectionSpec, GenContext, List[RetrievedChunk]], Tuple[str, List[List[str]]]]
_COMPOSERS: Dict[str, Composer] = {}


def _register(name: str):
    def deco(fn: Composer):
        _COMPOSERS[name] = fn
        return fn

    return deco


def _compose(name: str, spec: SectionSpec, ctx: GenContext, chunks: List[RetrievedChunk]) -> Tuple[str, List[List[str]]]:
    fn = _COMPOSERS.get(name, _COMPOSERS["generic"])
    return fn(spec, ctx, chunks)


def _clean_md(text: str) -> str:
    """去除知识库片段中的 Markdown 标记，使其更适合放入正式标书。"""
    import re

    lines = []
    for ln in text.split("\n"):
        ln = re.sub(r"^\s*#{1,6}\s*", "", ln)  # 标题井号
        ln = re.sub(r"\*\*(.+?)\*\*", r"\1", ln)  # 粗体
        lines.append(ln)
    return "\n".join(lines).strip()


def _kb_text(chunks: List[RetrievedChunk], limit: int = 4) -> str:
    parts = []
    for c in chunks[:limit]:
        t = _clean_md(c.text)
        if t:
            parts.append(t)
    return "\n\n".join(parts)


@_register("generic")
def _c_generic(spec, ctx, chunks):
    body = _kb_text(chunks)
    if body:
        return (f"{body}\n\n（以上内容依据企业知识库资料整理，请投标人结合本项目实际进行核对与完善。）", [])
    return (
        f"本章节针对「{spec.title}」编写。【请补充与本项目相关的具体内容；当前企业知识库中未检索到直接匹配资料。】",
        [],
    )


@_register("bid_letter")
def _c_bid_letter(spec, ctx, chunks):
    req = ctx.req
    text = f"""致：{req.purchaser or '（采购人/招标人）'}

根据贵方招标编号为 {req.project_no or '【招标编号】'} 的《{req.project_name or '【项目名称】'}》招标文件，正式授权代表（全名）{ '【授权代表】' } 经审查上述招标文件及全部澄清、修改文件后，我方（投标人：{ctx.company}）愿就本项目进行投标，并郑重承诺如下：

一、我方已仔细阅读并完全理解招标文件的全部内容，自愿按招标文件的各项要求参加投标。
二、我方同意按招标文件规定的投标报价口径提交投标报价（投标报价详见《投标报价表》）；预算/最高限价为 {req.budget or '【见招标文件】'}。
三、我方承诺投标有效期为自投标截止之日起 90 日历天，在此期间本投标文件始终对我方具有约束力。
四、我方承诺如中标，将严格按照招标文件、投标文件及合同约定履行全部义务，按期保质完成供货/施工与服务。
五、我方已按招标文件要求提交投标保证金人民币 {req.bid_bond or '【见招标文件】'}。
六、我方完全响应招标文件中带★/▲及"否则按废标处理"的实质性要求，无任何实质性偏离。

投标人（盖章）：{ctx.company}
法定代表人或其授权代表（签字）：____________
日    期：______年____月____日
"""
    return (text, [])


@_register("authorization")
def _c_auth(spec, ctx, chunks):
    text = f"""（一）法定代表人身份证明

投标人名称：{ctx.company}
单位性质：____________
地址：____________
成立时间：____年__月__日
经营期限：____________

姓名：__________  性别：____  年龄：____  职务：____
系 {ctx.company} 的法定代表人。

特此证明。

投标人（盖章）：{ctx.company}
日期：____年__月__日


（二）授权委托书

本人（姓名）________系 {ctx.company} 的法定代表人，现授权委托（姓名）________为我方就《{ctx.req.project_name or '【项目名称】'}》（招标编号：{ctx.req.project_no or '【招标编号】'}）投标活动的合法代理人，以我方名义处理一切与之有关的事务。

代理人无转委托权。特此委托。

法定代表人（签字）：__________
授权代理人（签字）：__________
投标人（盖章）：{ctx.company}
日期：____年__月__日
"""
    return (text, [])


@_register("company_profile")
def _c_company(spec, ctx, chunks):
    body = _kb_text(chunks, limit=5)
    if body:
        intro = f"{ctx.company}是一家专注于管道及相关产品研发、生产、供应与工程服务的企业。现将公司基本情况介绍如下：\n\n"
        return (intro + body, [])
    return (
        f"{ctx.company}是一家专注于管道行业的专业企业，具备完善的生产/供应能力与质量管理体系。"
        "【请在企业知识库中补充公司成立时间、注册资本、主营业务、生产规模、技术力量与荣誉资质等资料。】",
        [],
    )


@_register("qualification")
def _c_qual(spec, ctx, chunks):
    body = _kb_text(chunks, limit=5)
    lines = ["本公司具备承担本项目所需的相应资质与资信，主要包括："]
    if ctx.req.qualification:
        lines.append("\n对照招标资格要求，我方逐项满足：")
        for i, q in enumerate(ctx.req.qualification[:12], 1):
            lines.append(f"{i}. {q} —— 满足（详见随附证明文件）。")
    if body:
        lines.append("\n相关资质与认证摘录：\n" + body)
    else:
        lines.append("\n【请补充营业执照、相关行业资质、质量/环境/职业健康管理体系认证、安全生产许可等扫描件。】")
    return ("\n".join(lines), [])


@_register("performance")
def _c_perf(spec, ctx, chunks):
    body = _kb_text(chunks, limit=6)
    head = "我方近年完成了大量与本项目类似的供货/施工业绩，具备丰富的项目经验。代表性业绩如下：\n\n"
    if body:
        return (head + body + "\n\n（上述业绩可提供中标通知书、合同及验收证明等佐证材料。）", [])
    return (
        head + "【请在企业知识库中补充类似项目业绩：项目名称、业主单位、合同金额、规模、起止时间及联系人等。】",
        [],
    )


@_register("tech_solution")
def _c_tech(spec, ctx, chunks):
    req = ctx.req
    parts = [f"针对《{req.project_name or '本项目'}》的技术要求，我方提供如下技术方案。\n"]
    body = _kb_text(chunks, limit=5)
    if body:
        parts.append("一、产品选型与技术说明\n" + body + "\n")
    else:
        parts.append("一、产品选型与技术说明\n【请补充拟供管材/管件的型号、材质、规格、执行标准与技术说明。】\n")

    if req.tech_params:
        parts.append("二、关键技术参数响应（逐条响应，确保实质性满足）：")
        for i, p in enumerate(req.tech_params[:25], 1):
            parts.append(f"{i}. 招标要求：{p.requirement}\n   我方响应：满足，并优先选用符合或优于该要求的产品（具体指标见技术规格书）。")
    else:
        parts.append("二、我方所供产品全部满足招标文件技术规格要求，无实质性偏离。")
    parts.append("\n三、质量与标准\n所供产品严格执行国家及行业标准（如 GB/T、CJ/T、SY/T 等），出厂均经检验合格并提供质保书。")
    return ("\n".join(parts), [])


@_register("implementation")
def _c_impl(spec, ctx, chunks):
    body = _kb_text(chunks, limit=4)
    parts = [
        "一、项目组织机构\n我方将组建专门的项目团队，配备项目经理、技术负责人、质量与安全管理人员，明确职责与协作流程。",
        "二、供货/进度计划\n根据招标文件交付要求" + (f"（{ctx.req.delivery}）" if ctx.req.delivery else "") + "，编制详细的供货与进度计划，确保按期、按质、按量交付。",
        "三、质量保证体系\n建立覆盖采购、生产、检验、运输、交付全过程的质量保证体系，关键环节设置质量控制点，确保产品合格率。",
        "四、安全文明施工/作业\n严格执行安全生产规章，落实安全技术交底与现场管理，做到安全、文明、环保作业。",
    ]
    if body:
        parts.append("五、实施保障措施（结合企业经验）\n" + body)
    return ("\n\n".join(parts), [])


@_register("after_sales")
def _c_after(spec, ctx, chunks):
    body = _kb_text(chunks, limit=4)
    parts = [
        "一、质量保证期\n我方对所供产品提供不低于招标文件要求的质保期，质保期内因产品质量问题免费维修或更换。",
        "二、服务响应\n设立专门售后服务团队，接到服务通知后在约定时限内响应，必要时派员赶赴现场处理。",
        "三、服务网络与备品备件\n依托区域服务网络，保障备品备件供应，缩短故障处理周期。",
        "四、技术培训\n根据需要为业主提供产品使用、维护等方面的技术培训。",
    ]
    if body:
        parts.append("五、服务承诺（企业既有承诺）\n" + body)
    return ("\n\n".join(parts), [])


@_register("pricing")
def _c_pricing(spec, ctx, chunks):
    req = ctx.req
    text = (
        f"我方对《{req.project_name or '本项目'}》的投标报价为人民币（大写）【______】元整（小写：￥______元），"
        f"该报价为完成招标范围内全部内容的总价，已包含产品、运输、装卸、税费、服务及合理利润等一切费用。"
        + (f"招标预算/最高限价为 {req.budget}，我方报价不超过该限价。" if req.budget else "")
        + "\n\n投标报价一览表（示例，请据实填报）："
    )
    rows: List[List[str]] = [["序号", "货物/服务名称", "规格型号", "单位", "数量", "单价(元)", "合计(元)", "备注"]]
    items = req.tech_params[:8] if req.tech_params else []
    if items:
        for i, p in enumerate(items, 1):
            rows.append([str(i), p.name[:24] or f"项目{i}", "【】", "【】", "【】", "【】", "【】", ""])
    else:
        rows.append(["1", "【货物/服务名称】", "【】", "【】", "【】", "【】", "【】", ""])
    rows.append(["", "投标总报价（合计）", "", "", "", "", "【】", "应≤最高限价"])
    return (text, rows)


@_register("compliance")
def _c_compliance(spec, ctx, chunks):
    req = ctx.req
    text = (
        "我方对招标文件中的废标项及实质性要求逐条响应如下，承诺完全满足、无实质性偏离。"
        "下表为实质性要求响应一览（详见对应章节）："
    )
    rows: List[List[str]] = [["序号", "招标实质性/废标要求", "类别", "响应情况", "说明"]]
    if req.mandatory_items:
        for i, m in enumerate(req.mandatory_items[:40], 1):
            rows.append([str(i), m.requirement[:80], m.category, "满足/响应", "见相应章节及证明材料"])
    else:
        rows.append(["1", "（未自动识别到明确的废标项，请人工核对招标文件）", "—", "—", "—"])
    return (text, rows)
