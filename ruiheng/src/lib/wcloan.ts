/**
 * 授信智能工作台 · 流动资金贷款额度测算与演示内容
 * 额度测算依据《流动资金贷款管理办法》附件"流动资金贷款需求量测算参考"：
 *   营运资金量 = 上年销售收入 × (1 − 销售利润率) × (1 + 预计销售收入年增长率) ÷ 营运资金周转次数
 *   营运资金周转次数 = 360 ÷ (存货周转天数 + 应收账款周转天数 − 应付账款周转天数)
 *   新增流动资金贷款额度 = 营运资金量 − 借款人自有资金 − 现有流动资金贷款 − 其他渠道提供的营运资金
 * 全部数据虚构、自洽；比率来自 financials.ts 前端复算。
 */
import { type Computed, type Forecast, type Ref, type Year, ratioValue, fmtMoney } from './financials';

export interface WcParams {
  revenue: number;        // 上年销售收入（万元）
  profitMargin: number;   // 销售利润率（%）
  growth: number;         // 预计销售收入年增长率（%）
  invDays: number;        // 存货周转天数
  arDays: number;         // 应收账款周转天数
  apDays: number;         // 应付账款周转天数
  ownFunds: number;       // 借款人自有资金（万元）
  existingLoans: number;  // 现有流动资金贷款（万元）
  otherChannels: number;  // 其他渠道提供的营运资金（万元）
}
export interface WcParamMeta { key: keyof WcParams; label: string; unit: '万元' | '%' | '天'; ref?: Ref; refLabel: string; note: string; step: number }

export const WC_PARAM_META: WcParamMeta[] = [
  { key: 'revenue', label: '上年销售收入', unit: '万元', ref: { stmt: 'is', key: 'revenue', year: 2025 }, refLabel: '利润表 / 营业收入 / 2025', note: '取 2025 年营业收入（不含税）', step: 100 },
  { key: 'profitMargin', label: '销售利润率', unit: '%', ref: { stmt: 'is', key: 'netProfit', year: 2025 }, refLabel: '利润表 / 净利润 ÷ 营业收入 / 2025', note: '按净利率口径；若按营业利润率约 0.5%', step: 0.1 },
  { key: 'growth', label: '预计销售收入年增长率', unit: '%', refLabel: '访谈纪要 / 定点项目 SOP 排产（非报表）', note: '定点项目达产后年供货 1.2 亿，按 2026 年释放 40% 估算；可与客户经理判断校准', step: 1 },
  { key: 'invDays', label: '存货周转天数', unit: '天', ref: { stmt: 'bs', key: 'inventory', year: 2025 }, refLabel: '资产负债表 / 存货 ÷ 利润表 / 营业成本 × 360 / 2025', note: '期末余额口径', step: 1 },
  { key: 'arDays', label: '应收账款周转天数', unit: '天', ref: { stmt: 'bs', key: 'ar', year: 2025 }, refLabel: '资产负债表 / 应收账款 ÷ 利润表 / 营业收入 × 360 / 2025', note: '期末余额口径，未做价税调整', step: 1 },
  { key: 'apDays', label: '应付账款周转天数', unit: '天', ref: { stmt: 'bs', key: 'ap', year: 2025 }, refLabel: '资产负债表 / 应付账款 ÷ 利润表 / 营业成本 × 360 / 2025', note: '不含应付票据（保守）', step: 1 },
  { key: 'ownFunds', label: '借款人自有资金', unit: '万元', ref: { stmt: 'bs', key: 'equity', year: 2025 }, refLabel: '资产负债表 / 所有者权益 − 非流动资产 + 长期借款 / 2025', note: '按"长期资金来源 − 长期资金占用"估算的营运资本自有部分', step: 50 },
  { key: 'existingLoans', label: '现有流动资金贷款', unit: '万元', ref: { stmt: 'bs', key: 'stLoans', year: 2025 }, refLabel: '资产负债表 / 短期借款 / 2025（与征信一致）', note: '4 家银行合计，其中他行 2,000 万 2026-05 到期拟不续', step: 100 },
  { key: 'otherChannels', label: '其他渠道提供的营运资金', unit: '万元', refLabel: '征信 / 无融资租赁、保理等（非报表）', note: '未发现其他融资渠道', step: 50 },
];

export function defaultWcParams(c: Computed): WcParams {
  const y: Year = 2025;
  const pct = (v: number | null) => Math.round((v ?? 0) * 10000) / 100;
  const d = (v: number | null) => Math.round(v ?? 0);
  return {
    revenue: c.is.revenue[y],
    profitMargin: pct(ratioValue(c, 'netMargin', y)),
    growth: 15,
    invDays: d(ratioValue(c, 'invDays', y)),
    arDays: d(ratioValue(c, 'arDays', y)),
    apDays: d(ratioValue(c, 'apDays', y)),
    ownFunds: Math.round(c.bs.equity[y] - c.bs.nonCurrentAssets[y] + c.bs.ltLoans[y]),
    existingLoans: c.bs.stLoans[y],
    otherChannels: 0,
  };
}

export interface WcStep { label: string; expr: string; value: string }
export interface WcResult { cycleDays: number; turnover: number; wcNeed: number; newLoan: number; steps: WcStep[] }
export function calcWcLoan(p: WcParams): WcResult {
  const cycleDays = p.invDays + p.arDays - p.apDays;
  const turnover = cycleDays > 0 ? 360 / cycleDays : 0;
  const wcNeed = turnover > 0 ? (p.revenue * (1 - p.profitMargin / 100) * (1 + p.growth / 100)) / turnover : 0;
  const newLoan = wcNeed - p.ownFunds - p.existingLoans - p.otherChannels;
  const steps: WcStep[] = [
    { label: '营运资金周转次数', expr: `360 ÷ (${p.invDays} + ${p.arDays} − ${p.apDays}) = 360 ÷ ${cycleDays}`, value: `${turnover.toFixed(2)} 次/年` },
    { label: '营运资金量', expr: `${fmtMoney(p.revenue)} × (1 − ${p.profitMargin}%) × (1 + ${p.growth}%) ÷ ${turnover.toFixed(2)}`, value: `${fmtMoney(wcNeed)} 万` },
    { label: '新增流动资金贷款额度', expr: `${fmtMoney(wcNeed)} − ${fmtMoney(p.ownFunds)} − ${fmtMoney(p.existingLoans)} − ${fmtMoney(p.otherChannels)}`, value: `${fmtMoney(newLoan)} 万` },
  ];
  return { cycleDays, turnover, wcNeed, newLoan, steps };
}

/* ------------------------------------------------------------------ 演示内容 */
export interface Material { name: string; detail: string; status: 'ok' | 'warn'; chip: string }
export const MATERIALS: Material[] = [
  { name: '财务报表（2023–2025）', detail: '审计报告 2 份 + 2025 年未审报表 · PDF 扫描件 42 页 · OCR 已人工确认', status: 'ok', chip: '已归档' },
  { name: '企业与实控人征信', detail: '已授权 · 授权书编号 SQ-2025-1107-0083（示例）· 查询日 2025-11-07 · 4 家银行信贷记录无逾期', status: 'ok', chip: '已授权' },
  { name: '银行流水（12 个月）', detail: '4 家银行 · 解析 1,284 笔 · 前五大往来对手已聚合', status: 'ok', chip: '已解析' },
  { name: '上午访谈纪要', detail: '11-07 09:30 厂区访谈 · 语音转写 46 分钟 · 结构化要点 18 条 · 王志远 / 林小雨', status: 'ok', chip: '已结构化' },
  { name: '厂房抵押评估报告', detail: '××资产评估公司 · 2025-03-18 出具 · 评估值 6,800 万 · 已超 6 个月有效期', status: 'warn', chip: '需重估' },
];

export interface ThinkStep { title: string; detail: string }
export const THINK_STEPS: ThinkStep[] = [
  { title: '逐章起草', detail: '从材料库抽取事实，按七章模板起草，每段标注来源（财报 / 征信 / 流水 / 访谈 / 评估）' },
  { title: '交叉核对', detail: '财报 × 流水 × 访谈 × 征信两两比对 → 生成 3 处核实标注' },
  { title: '额度测算', detail: '《流动资金贷款管理办法》公式测算 + 12 个月现金流缺口交叉印证' },
  { title: '制度与准入校验', detail: '行业准入 / 负面清单 / 单一客户集中度 / 抵押评估报告有效期' },
  { title: '审批人预演', detail: '模拟审查会提问 5 条，逐条定位到章节锚点' },
];

export interface VerifyNote {
  id: string; no: string; title: string; detail: string; action: string; chapter: string;
  policy?: { title: string; article: string; text: string; source: string };
}
export const VERIFY_NOTES: VerifyNote[] = [
  { id: 'v1', no: '①', title: '其他应收款 1,900 万疑似关联方占用', chapter: 'c4',
    detail: '资产负债表其他应收款由 480 万突增至 1,900 万，同期"支付其他与经营活动有关的现金"2,400 万；征信显示实控人配偶控制的桂盛铝业为供应商，存在资金往来通道。',
    action: '需客户提供往来明细（对手方 / 用途 / 归还计划）；建议"收回或出具还款承诺"作为放款前置条件。' },
  { id: 'v2', no: '②', title: '前五大客户占比：流水 38% vs 访谈 80%', chapter: 'c3',
    detail: '12 个月流水聚合显示前五大往来对手占收入 38%；上午访谈客户口径为 80%（主机厂 T 占 55%）。可能原因：经 Tier-1 结算、票据贴现未入流水、或访谈夸大集中度。',
    action: '要求提供主机厂 T 对账单与票据台账；核对后修正第三章客户结构描述及应收质押可行性。' },
  { id: 'v3', no: '③', title: '抵押厂房评估报告已超 6 个月', chapter: 'c5',
    detail: '评估报告 2025-03-18 出具，至报告日已超 6 个月；评估值 6,800 万不能直接用于抵押率测算。',
    action: '放款前重新评估；担保合同抵押物价值条款按新评估值填写。',
    policy: { title: '示例制度（虚构）《公司授信管理办法（演示版）》', article: '第 X 条', text: '抵押评估报告有效期为 6 个月；超过有效期的，应当在授信审批前重新评估，评估机构须在本行合作名单内。', source: '合规与政策中枢 · 制度库检索（离线样例）' } },
];

export interface Chapter { id: string; no: string; title: string; text: string }
/** 章节初稿由报表复算值动态生成，保证与三表口径一致 */
export function buildChapters(c: Computed, f: Forecast, wc: WcResult): Chapter[] {
  const y: Year = 2025;
  const p = (id: string, yy: Year, d = 1) => `${((ratioValue(c, id, yy) ?? 0) * 100).toFixed(d)}%`;
  const dd = (id: string, yy: Year) => (ratioValue(c, id, yy) ?? 0).toFixed(0);
  const x = (id: string, yy: Year) => (ratioValue(c, id, yy) ?? 0).toFixed(2);
  const yi = (n: number) => (n / 10000).toFixed(2);
  return [
    { id: 'c1', no: '一', title: '企业概况', text: `宁桂精密机械有限公司成立于 2011 年，注册资本 8,000 万元（实缴到位），位于高新区精密制造产业园，主营新能源汽车电机壳体、减速器壳体等铝合金精密压铸与机加工件。现有员工 386 人，自有厂房 2.4 万㎡。${y} 年营业收入 ${yi(c.is.revenue[y])} 亿元，较 2023 年增长 ${(((c.is.revenue[y] / c.is.revenue[2023]) - 1) * 100).toFixed(0)}%。2025 年 9 月取得某新能源车企 A 平台减速器壳体定点，预计 2026 年 Q2 SOP，达产后年供货约 1.2 亿元。公司为本行存量结算户（2019 年开户，年结算量 4,200 万元），本次为首次申请授信：流动资金贷款 3,000 万元 / 12 个月。` },
    { id: 'c2', no: '二', title: '股权与关联', text: `实际控制人陈某直接持股 68%，并通过宁桂投资合伙企业持股 12%，合计 80%；其余 20% 为 2 名创始团队成员。关联企业：宁桂投资合伙企业（持股平台）；桂盛铝业贸易有限公司（实控人配偶持股 100%，为公司铝锭供应商之一，2025 年采购占比 14%）。征信（授权书编号 SQ-2025-1107-0083）显示企业在 4 家银行有信贷记录、无逾期；实控人个人经营性贷款 800 万元（他行、抵押），无不良。需核实：其他应收款 ${fmtMoney(c.bs.otherRecv[y])} 万元的对手方是否为桂盛铝业或实控人（见第四章标注①）。` },
    { id: 'c3', no: '三', title: '经营分析', text: `客户结构：按访谈口径前五大客户 2025 年销售占比 80%（主机厂 T 占 55%），但 12 个月流水显示前五大往来对手占收入 38%，口径差异待核实（标注②）。供应商：铝锭采购集中于北岭铝材、桂盛铝业等 3 家（合计 62%），北岭铝材近期票据逾期 1 笔，需关注供应稳定性。产能：现有 6 条压铸线，利用率约 82%；定点项目 SOP 需新增 2 套模具（约 1,800 万元）。毛利率由 ${p('grossMargin', 2023)} 降至 ${p('grossMargin', y)}，主要来自主机厂年降约 3% 与铝价上涨；销售收现率 ${p('cashCollect', y, 0)}，低于制造业正常区间。` },
    { id: 'c4', no: '四', title: '财务分析', text: `2023–2025 年营业收入 ${yi(c.is.revenue[2023])} / ${yi(c.is.revenue[2024])} / ${yi(c.is.revenue[y])} 亿元，净利润 ${fmtMoney(c.is.netProfit[2023])} / ${fmtMoney(c.is.netProfit[2024])} / ${fmtMoney(c.is.netProfit[y])} 万元，盈利逐年收窄。资产负债率 ${p('debtRatio', 2023)} → ${p('debtRatio', 2024)} → ${p('debtRatio', y)}，流动比率 ${x('currentRatio', y)}、速动比率 ${x('quickRatio', y)}，利息保障倍数 ${x('interestCover', y)}，短期偿债压力上升。应收账款周转天数 ${dd('arDays', 2023)} → ${dd('arDays', 2024)} → ${dd('arDays', y)} 天，应收增速（${p('arGrowth', y)}）远超收入增速（${p('revGrowth', y)}）。经营活动现金流 2024 年 ${fmtMoney(c.cf.cfo[2024])} 万、2025 年 ${fmtMoney(c.cf.cfo[y])} 万，连续两年为负，主要靠新增借款维持。其他应收款由 ${fmtMoney(c.bs.otherRecv[2024])} 万突增至 ${fmtMoney(c.bs.otherRecv[y])} 万（标注①）。12 个月现金流预测显示 2026 年 ${f.gapQuarter}（${f.minMonth}）存在约 ${fmtMoney(f.gap)} 万元资金缺口。以上指标由前端按报表复算。` },
    { id: 'c5', no: '五', title: '担保分析', text: `拟担保方式：(1) 厂房及土地抵押：高新区工业厂房 2.4 万㎡及土地使用权，评估报告（2025-03-18 出具）评估值 6,800 万元，按 60% 抵押率可覆盖 4,080 万元；该报告已超 6 个月，按制度需重新评估（标注③）。(2) 应收账款质押：对主机厂 T 及定点项目应收，须在中登网登记并办理回款账户监管。(3) 实际控制人陈某及配偶连带责任保证；实控人名下另有房产 2 套（已抵押他行）。按建议额度 1,000 万元测算，抵押 4,080 万 + 质押应收（按 50% 折扣）约 2,000 万，担保覆盖倍数约 6.1×；若重估值下降 20%，覆盖倍数仍约 5.3×。` },
    { id: 'c6', no: '六', title: '授信方案', text: `申请：流动资金贷款 3,000 万元，期限 12 个月，用途为采购铝锭及定点项目备货。按《流动资金贷款管理办法》测算，新增流贷需求约 ${fmtMoney(wc.newLoan)} 万元，与 12 个月现金流预测缺口 ${fmtMoney(f.gap)} 万元交叉印证。考虑其他应收款 ${fmtMoney(c.bs.otherRecv[y])} 万元疑似关联占用尚未收回、经营现金流连续为负，建议：(1) 额度压至 1,000 万元，期限 12 个月，利率 LPR + 60BP，分两次提用（首笔 600 万，第二笔凭 SOP 交付单）；(2) 受托支付比例 100%，仅限支付备案供应商；(3) 放款前置条件：其他应收款收回或提供往来明细并出具还款承诺；厂房重新评估并办妥抵押登记；(4) 主机厂 T 回款账户开立于本行并监管，回款归行率不低于 60%。` },
    { id: 'c7', no: '七', title: '风险与缓释', text: `①关联资金占用风险——其他应收款 ${fmtMoney(c.bs.otherRecv[y])} 万去向不明；缓释：放款前置条件 + 受托支付 + 季度往来明细报送。②应收质量与集中度风险——应收周转 ${dd('arDays', y)} 天、前五大占比口径不一致；缓释：应收质押登记 + 回款账户监管 + 账龄季度核对。③定点项目不及预期风险——SOP 若延期至 Q3，Q2 缺口扩大；缓释：额度分次提用。④担保有效性风险——评估超期；缓释：放款前重估。⑤行业风险——主机厂年降与铝价波动；缓释：毛利率低于 13% 触发贷后检查。评级提示：行内客户评级 BBB+（内评系统 2025-Q3）；AI 提示该评级财务模块假设经营现金流为正，与实际不一致，建议评级复核（结论以内评系统为准）。` },
  ];
}

export const CREDIT_PLAN = {
  applied: 3000, proposed: 1000, term: '12 个月', price: 'LPR + 60BP', product: '流动资金贷款',
  guarantees: [
    { name: '厂房及土地抵押', note: '需重新评估（标注③）· 抵押率 ≤ 60%' },
    { name: '应收账款质押', note: '主机厂 T 及定点项目应收 · 中登网登记 · 回款账户监管' },
    { name: '实控人及配偶连带责任保证', note: '陈某及配偶 · 共同签署' },
  ],
  conditions: ['其他应收款 1,900 万收回或提供往来明细并出具还款承诺', '厂房重新评估并办妥抵押登记', '主机厂 T 回款账户开立于本行，归行率 ≥ 60%', '分两次提用：首笔 600 万，第二笔凭 SOP 交付单'],
  rating: {
    grade: 'BBB+', source: '内评系统 2025-Q3',
    mismatches: [
      '内评财务模块基于 2024 年报，经营现金流字段为模型默认正值，与 2024–2025 实际连续为负不一致',
      '内评"担保有效性"按评估值 6,800 万计算，该评估报告已超 6 个月有效期',
    ],
  },
  checks: [
    { name: '行业准入', result: 'pass' as const, detail: '新能源汽车关键零部件属行内鼓励类；不涉"两高一剩"' },
    { name: '负面清单', result: 'pass' as const, detail: '企业及实控人未命中黑名单 / 失信被执行人 / 重大涉诉；关联方桂盛铝业无不良' },
    { name: '单一客户集中度', result: 'pass' as const, detail: '建议额度 1,000 万占本行资本净额 0.08%，低于 10% 上限；北岭铝材为供应链关联、非集团，无需合并' },
  ],
};

export interface ApproverQ { q: string; chapter: string; chapterName: string; hint: string }
export const APPROVER_QUESTIONS: ApproverQ[] = [
  { q: '其他应收款 1,900 万去哪了？', chapter: 'c4', chapterName: '第四章 财务分析 · 标注①', hint: '回答要点：对手方、用途、归还计划；已列为放款前置条件' },
  { q: '前五大客户占比到底是 38% 还是 80%？主机厂 T 的账期条款是什么？', chapter: 'c3', chapterName: '第三章 经营分析 · 标注②', hint: '回答要点：Tier-1 结算路径、票据比例、对账单' },
  { q: '经营现金流连续两年为负，这 1,000 万会不会被拿去还他行？', chapter: 'c6', chapterName: '第六章 授信方案', hint: '回答要点：100% 受托支付、备案供应商、分次提用' },
  { q: '厂房评估超期，重估后抵押率还够不够？', chapter: 'c5', chapterName: '第五章 担保分析 · 标注③', hint: '回答要点：重估下降 20% 情景下覆盖倍数仍约 5.3×' },
  { q: '定点项目 SOP 延期怎么办？第二还款来源是什么？', chapter: 'c7', chapterName: '第七章 风险与缓释', hint: '回答要点：第二笔凭交付单提用；应收质押 + 实控人保证' },
];

export interface ContractItem { clause: string; level: 'high' | 'mid' | 'low'; issue: string; suggest: string }
export interface ContractReview { contract: string; items: ContractItem[] }
export const CONTRACT_REVIEW: ContractReview[] = [
  { contract: '流动资金借款合同（模板 v3.2）', items: [
    { clause: '第 3 条 贷款用途', level: 'mid', issue: '仅写"用于生产经营周转"，未排除关联往来与归还他行贷款', suggest: '明确"仅用于采购铝锭等原材料，不得用于归还他行贷款、对外投资或关联方往来"，并载明受托支付比例 100%' },
    { clause: '第 7 条 提款先决条件', level: 'high', issue: '未载入授信批复的放款前置条件', suggest: '增加：借款人已收回其他应收款 1,900 万元或提供往来明细及还款承诺；抵押物重新评估并办妥登记；回款账户已开立' },
    { clause: '第 9 条 资金监管', level: 'mid', issue: '无回款账户与归行率约定', suggest: '增加主机厂 T 回款账户开立于贷款人并接受监管，归行率不低于 60%，未达标贷款人有权暂停第二笔提用' },
    { clause: '第 12 条 财务承诺', level: 'mid', issue: '无财务约束条款', suggest: '增加：资产负债率不高于 65%；其他应收款不得新增关联方占用；毛利率低于 13% 触发贷后检查' },
    { clause: '第 15 条 违约事件', level: 'low', issue: '仅列逾期还本付息', suggest: '增加"关联方资金占用未按约收回""定点项目 SOP 延期超过 90 日""抵押物价值下降未补足"为加速到期事件' },
  ] },
  { contract: '担保合同（抵押 / 质押 / 保证）', items: [
    { clause: '抵押合同 第 2 条 抵押物价值', level: 'high', issue: '引用 2025-03-18 评估值 6,800 万，评估已超 6 个月', suggest: '以重新评估值填写，约定抵押率 ≤ 60%；评估机构须在本行合作名单内' },
    { clause: '应收账款质押合同 第 4 条 质押登记', level: 'mid', issue: '未约定中登网登记时限与查询授权', suggest: '约定签约后 3 个工作日内完成登记，展期前 30 日办理续展，并授权贷款人查询' },
    { clause: '应收账款质押合同 第 6 条 回款账户', level: 'high', issue: '未指定唯一回款账户', suggest: '指定本行账户为唯一回款账户，未经贷款人书面同意不得变更；应收债务人须书面确认' },
    { clause: '保证合同 第 1 条 保证范围', level: 'mid', issue: '仅覆盖本金', suggest: '扩展至利息、罚息、复利、违约金及实现债权费用；实控人配偶共同签署' },
  ] },
];

/* ------------------------------------------------------------------ 简易差异（按句段 LCS） */
export interface DiffSeg { kind: 'same' | 'del' | 'add'; text: string }
const splitSegs = (s: string) => s.split(/(?<=[。；！？\n])/).filter((x) => x.length > 0);
export function segDiff(a: string, b: string): DiffSeg[] {
  const A = splitSegs(a), B = splitSegs(b);
  const n = A.length, m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffSeg[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ kind: 'same', text: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ kind: 'del', text: A[i] }); i++; }
    else { out.push({ kind: 'add', text: B[j] }); j++; }
  }
  while (i < n) out.push({ kind: 'del', text: A[i++] });
  while (j < m) out.push({ kind: 'add', text: B[j++] });
  return out;
}
/** 修改处 = 连续的 del/add 片段块数 */
export function countHunks(segs: DiffSeg[]): number {
  let n = 0, inHunk = false;
  for (const s of segs) { if (s.kind === 'same') inHunk = false; else if (!inHunk) { inHunk = true; n++; } }
  return n;
}
