"""招标需求智能抽取。

策略：规则引擎（正则 + 关键词）作为稳定基线，LLM（若可用）做增强与补全。
即便没有大模型，也能产出可用的《招标需求摘要》与《投标注意事项清单》。
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from ..infra.llm import BaseLLM
from ..logging_utils import get_logger
from ..models import (
    MandatoryItem,
    ParsedDocument,
    RequirementSummary,
    RiskItem,
    ScoringItem,
    Severity,
    TechParam,
)

log = get_logger("extraction")

# 金额：123,456.78 万元 / 元
_AMOUNT = r"(?:人民币)?\s*([0-9][0-9,，]*(?:\.[0-9]+)?\s*(?:万元|万|元))"
# 日期时间：2026年6月8日 9:30 / 2026-06-08 09:30
_DATETIME = (
    r"((?:20\d{2})\s*[年\-/.]\s*\d{1,2}\s*[月\-/.]\s*\d{1,2}\s*[日号]?"
    r"(?:\s*(?:上午|下午)?\s*\d{1,2}[:：]\d{2}(?:[:：]\d{2})?)?)"
)

# 废标 / 实质性触发词
_REJECT_PAT = re.compile(
    r"(否则.{0,12}(?:废标|拒绝|无效|否决)|"
    r"(?:按|作|视为|属于).{0,6}(?:废标|无效标?|否决投标?|无效投标)|"
    r"(?:将被|予以).{0,4}(?:拒绝|否决|废标)|"
    r"实质性(?:要求|响应|条款|偏离)|"
    r"未(?:能)?(?:实质性)?(?:响应|满足|提供|按.{0,6}).{0,12}(?:否决|废标|无效)|"
    r"不(?:得|予)(?:接受|受理))"
)
_STAR_MARKERS = "★☆▲△※●◆◇✦"
_TECH_OP = re.compile(r"(≥|≤|＞|＜|>|<|不\s*(?:小于|低于|大于|高于|少于|超过)|不\s*得\s*(?:低|高)于|应\s*(?:不低于|不高于|达到))")


class RequirementExtractor:
    def __init__(self, llm: Optional[BaseLLM] = None):
        self.llm = llm

    # ============ 入口 ============
    def extract(self, parsed: ParsedDocument) -> RequirementSummary:
        text = parsed.full_text
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

        summary = RequirementSummary()
        self._extract_basic(text, summary)
        summary.mandatory_items = self._extract_mandatory(lines)
        summary.scoring_items = self._extract_scoring(parsed, lines)
        summary.tech_params = self._extract_tech_params(lines)
        summary.risks = self._extract_risks(lines)
        summary.qualification = self._extract_qualification(lines)
        summary.bid_doc_outline = self._extract_bid_outline(lines)

        # LLM 增强（可选，失败不影响主流程）
        if self.llm and self.llm.available:
            try:
                self._llm_enhance(text, summary)
            except Exception as e:
                log.warning("LLM 增强抽取失败，沿用规则结果：%s", e)

        # 兜底备注
        summary.notes.append(
            f"共识别废标/实质性条款 {len(summary.mandatory_items)} 条、"
            f"评分项 {len(summary.scoring_items)} 条、技术参数 {len(summary.tech_params)} 条。"
        )
        return summary

    # ============ 基础字段 ============
    def _first(self, pattern: str, text: str, group: int = 1, flags=re.MULTILINE) -> str:
        m = re.search(pattern, text, flags)
        return m.group(group).strip(" ：:　") if m else ""

    def _extract_basic(self, text: str, s: RequirementSummary) -> None:
        s.project_name = self._first(r"(?:项目名称|招标项目名称|采购项目名称)[:：\s]*([^\n，。；]{2,60})", text)
        s.project_no = self._first(r"(?:项目编号|招标编号|采购编号|招标文件编号)[:：\s]*([A-Za-z0-9\-—－（）()\[\]]{4,40})", text)
        s.purchaser = self._first(r"(?:采购人|招标人|采购单位|建设单位)(?:名称)?[:：\s]*([^\n，。；]{2,40})", text)
        s.agent_org = self._first(r"(?:采购代理机构|招标代理(?:机构)?|代理机构)(?:名称)?[:：\s]*([^\n，。；]{2,40})", text)

        # 预算 / 最高限价
        m = re.search(r"(?:预算金额|采购预算|最高限价|招标控制价|预算价)[:：\s]*" + _AMOUNT, text)
        if m:
            s.budget = m.group(1).replace(" ", "")
        # 投标保证金
        m = re.search(r"投标保证金[^0-9]{0,12}" + _AMOUNT, text)
        if m:
            s.bid_bond = m.group(1).replace(" ", "")
        # 截止时间
        m = re.search(r"(?:投标(?:文件)?截止时间|递交投标文件截止时间|投标截止)[:：\s（(]*" + _DATETIME, text)
        if m:
            s.deadline = re.sub(r"\s+", " ", m.group(1)).strip()
        # 开标时间
        m = re.search(r"开标时间[:：\s（(]*" + _DATETIME, text)
        if m:
            s.bid_open_time = re.sub(r"\s+", " ", m.group(1)).strip()
        # 交货 / 工期
        s.delivery = self._first(r"(?:交货期|交货时间|供货周期|工期|交付期限|交货期限)[:：\s]*([^\n，。；]{2,40})", text)

    # ============ 废标项 / 实质性要求 ============
    def _extract_mandatory(self, lines: List[str]) -> List[MandatoryItem]:
        items: List[MandatoryItem] = []
        seen: set[str] = set()
        for ln in lines:
            # 跳过标题行（Markdown # 或 第X章/节）
            if re.match(r"^#{1,6}\s|^第[一二三四五六七八九十百]+[章节]", ln):
                continue
            starred = any(ch in ln for ch in _STAR_MARKERS)
            hit = _REJECT_PAT.search(ln)
            if not (starred or hit):
                continue
            # 去除前导编号与标记：★ ▲ / 3. / 3.1 / （1） / 一、
            clean = ln.lstrip("".join(_STAR_MARKERS) + " 　•·-")
            clean = re.sub(r"^(?:\d+(?:\.\d+)*[.、)）]?\s*|[（(][一二三四五六七八九十\d][)）]\s*|[一二三四五六七八九十]、\s*)", "", clean)
            clean = clean.lstrip("".join(_STAR_MARKERS) + " 　")
            if len(clean) < 6:
                continue
            key = clean[:30]
            if key in seen:
                continue
            seen.add(key)
            items.append(
                MandatoryItem(
                    title=clean[:24] + ("…" if len(clean) > 24 else ""),
                    requirement=clean[:300],
                    category=self._classify_mandatory(clean),
                    is_starred=starred,
                    severity=Severity.HIGH.value if (starred or hit) else Severity.MEDIUM.value,
                )
            )
        return items

    def _classify_mandatory(self, text: str) -> str:
        if re.search(r"资质|资格|营业执照|许可证|认证|业绩|注册资本|信誉", text):
            return "资格资质"
        if re.search(r"截止|时间|日期|有效期", text):
            return "时间要求"
        if re.search(r"格式|签字|盖章|签署|装订|份数|密封|法定代表人", text):
            return "格式要求"
        if re.search(r"报价|价格|总价|单价|费用", text):
            return "报价要求"
        return "实质性要求"

    # ============ 评分细则 ============
    def _extract_scoring(self, parsed: ParsedDocument, lines: List[str]) -> List[ScoringItem]:
        items: List[ScoringItem] = []
        # 1) 表格：表头包含「评分/分值/分数」
        for el in parsed.elements:
            if el.kind != "table" or not el.rows:
                continue
            header = " ".join(el.rows[0])
            if not re.search(r"评分|分值|分数|得分|评审因素", header):
                continue
            for row in el.rows[1:]:
                if not any(c.strip() for c in row):
                    continue
                score = None
                for c in row:
                    mm = re.search(r"(\d+(?:\.\d+)?)\s*分?", c)
                    if mm and ("分" in c or float(mm.group(1)) <= 100):
                        score = float(mm.group(1))
                items.append(
                    ScoringItem(
                        category=self._scoring_category(" ".join(row)),
                        item=row[0][:60] if row else "",
                        max_score=score,
                        criteria=" | ".join(c for c in row if c.strip())[:200],
                    )
                )
        # 2) Markdown / 竖线表格（适用于纯文本招标文件）
        if not items:
            items.extend(self._scoring_from_pipe_table(lines))
        # 3) 文本：「……（10分）」
        if not items:
            for ln in lines:
                m = re.search(r"(.{4,40})[（(]\s*(\d+(?:\.\d+)?)\s*分\s*[）)]", ln)
                if m:
                    items.append(
                        ScoringItem(
                            category=self._scoring_category(ln),
                            item=m.group(1).strip("：: 　"),
                            max_score=float(m.group(2)),
                            criteria=ln[:200],
                        )
                    )
        return items

    def _scoring_from_pipe_table(self, lines: List[str]) -> List[ScoringItem]:
        """解析以 | 分隔的评分表（Markdown 风格）。"""
        items: List[ScoringItem] = []
        in_table = False
        for ln in lines:
            if "|" not in ln:
                in_table = False
                continue
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            if re.search(r"评分|分值|分数|评审因素|得分", ln) and not in_table:
                in_table = True  # 表头
                continue
            if not in_table:
                continue
            if all(set(c) <= set("-—: ") for c in cells):  # 分隔行
                continue
            if not any(c for c in cells):
                continue
            score = None
            for c in cells:
                mm = re.fullmatch(r"(\d+(?:\.\d+)?)\s*分?", c)
                if mm:
                    score = float(mm.group(1))
                    break
            items.append(
                ScoringItem(
                    category=self._scoring_category(" ".join(cells)),
                    item=cells[0][:60],
                    max_score=score,
                    criteria=" | ".join(c for c in cells if c)[:200],
                )
            )
        return items

    def _scoring_category(self, text: str) -> str:
        if re.search(r"技术|方案|参数|性能|服务", text):
            return "技术"
        if re.search(r"价格|报价|单价|总价", text):
            return "价格"
        return "商务"

    # ============ 技术参数 ============
    def _extract_tech_params(self, lines: List[str]) -> List[TechParam]:
        params: List[TechParam] = []
        in_tech = False
        seen: set[str] = set()
        for ln in lines:
            if re.search(r"技术(?:参数|要求|规格|规范|指标)|主要技术", ln):
                in_tech = True
            if re.search(r"^(?:第[一二三四五六七八九十]+[章节]|[一二三四五六七八九十]+[、.]|附件)", ln) and "技术" not in ln:
                in_tech = False
            if _TECH_OP.search(ln) and len(ln) <= 120:
                key = ln[:30]
                if key in seen:
                    continue
                seen.add(key)
                name = re.split(r"[:：]|不(?:小于|低于|大于|高于)|[≥≤><＞＜]", ln)[0].strip(" •·-、　")
                params.append(
                    TechParam(
                        name=name[:40] or ln[:40],
                        requirement=ln[:120],
                        is_mandatory=any(ch in ln for ch in _STAR_MARKERS) or bool(_REJECT_PAT.search(ln)),
                    )
                )
            if len(params) >= 60:
                break
        return params

    # ============ 合同风险 ============
    def _extract_risks(self, lines: List[str]) -> List[RiskItem]:
        risks: List[RiskItem] = []
        seen: set[str] = set()
        rules = [
            (r"逾期|延期|延误", "逾期交付/履约风险", "明确不可抗力免责，评估自身交期能力，约定合理的逾期梯度。"),
            (r"违约金|罚款|扣款|扣罚", "违约金/罚款风险", "测算违约金上限对成本的影响，必要时在澄清阶段提出异议。"),
            (r"赔偿|连带责任|无限责任", "赔偿责任风险", "界定赔偿范围与上限，避免承担超出合同额的连带/无限责任。"),
            (r"质保金|履约保证金|质量保证金", "保证金占用风险", "关注保证金比例、退还条件与周期，纳入资金成本测算。"),
            (r"付款|结算|账期|质保期满后支付", "付款账期风险", "核算账期对现金流的占用，评估垫资压力。"),
            (r"知识产权|专利|侵权", "知识产权风险", "确保所供产品/方案不侵犯第三方知识产权并提供保证。"),
        ]
        for ln in lines:
            for pat, name, sugg in rules:
                if re.search(pat, ln):
                    key = name
                    if key in seen:
                        break
                    seen.add(key)
                    level = Severity.HIGH.value if re.search(r"无限|连带|废标|拒绝", ln) else Severity.MEDIUM.value
                    risks.append(
                        RiskItem(clause=ln[:160], risk_level=level, description=name, suggestion=sugg)
                    )
                    break
        return risks

    # ============ 资格要求 ============
    def _extract_qualification(self, lines: List[str]) -> List[str]:
        quals: List[str] = []
        capture = False
        for ln in lines:
            if re.search(r"投标人(?:资格|的资格)?要求|资格(?:要求|条件)|供应商资格", ln):
                capture = True
                continue
            if capture:
                if re.search(r"^(?:第[一二三四五六七八九十]+[章节]|[一二三四五六七八九十]+[、.]\s*[^0-9])", ln):
                    if not re.search(r"营业执照|资质|资格|业绩|认证|许可", ln):
                        capture = False
                        continue
                if re.match(r"^(?:[（(]?\d+[)）.、]|[（(][一二三四五六七八九十][)）])", ln) or re.search(r"营业执照|资质|认证|许可证|注册资本|业绩", ln):
                    quals.append(ln[:160])
                if len(quals) >= 15:
                    break
        return quals

    # ============ 投标文件组成 ============
    def _extract_bid_outline(self, lines: List[str]) -> List[str]:
        outline: List[str] = []
        capture = False
        for ln in lines:
            if re.search(r"投标文件(?:的)?(?:组成|构成|格式|内容|编制)", ln):
                capture = True
                continue
            if capture:
                m = re.match(r"^(?:[（(]?\d+[)）.、]\s*|[（(][一二三四五六七八九十][)）]\s*|[一二三四五六七八九十][、.]\s*)(.{2,40})", ln)
                if m:
                    outline.append(m.group(1).strip())
                elif outline and not re.match(r"^.{0,2}(?:投标|应|须|包括)", ln):
                    if len(outline) >= 3:
                        break
            if len(outline) >= 20:
                break
        return outline

    # ============ LLM 增强 ============
    def _llm_enhance(self, text: str, s: RequirementSummary) -> None:
        # 大文本截断：取首部（含项目信息）与含废标/评分关键词的片段
        head = text[:6000]
        system = "你是资深招投标专家，擅长从招标文件中精确抽取关键信息。"
        prompt = f"""请从下面的招标文件节选中抽取关键信息，输出 JSON，字段：
project_name, project_no, purchaser, agent_org, budget, bid_bond, deadline, delivery,
mandatory（数组，每项含 title 与 requirement，指必须满足/否则废标的实质性条款），
qualification（数组，资格要求）。
只输出 JSON。

招标文件节选：
{head}
"""
        data = self.llm.generate_json(prompt, system=system)
        if not isinstance(data, dict):
            return
        # 用 LLM 结果补全空白字段
        for f in ("project_name", "project_no", "purchaser", "agent_org", "budget", "bid_bond", "deadline", "delivery"):
            if not getattr(s, f, "") and data.get(f):
                setattr(s, f, str(data[f]).strip())
        # 合并废标项（去重）
        existing = {m.requirement[:20] for m in s.mandatory_items}
        for it in data.get("mandatory", []) or []:
            req = (it.get("requirement") or it.get("title") or "").strip() if isinstance(it, dict) else str(it)
            if req and req[:20] not in existing:
                s.mandatory_items.append(
                    MandatoryItem(
                        title=(it.get("title") if isinstance(it, dict) else req)[:24],
                        requirement=req[:300],
                        category=self._classify_mandatory(req),
                        severity=Severity.HIGH.value,
                    )
                )
                existing.add(req[:20])
        for q in data.get("qualification", []) or []:
            if isinstance(q, str) and q not in s.qualification:
                s.qualification.append(q[:160])
        s.notes.append("（已通过本地大模型增强抽取结果）")
