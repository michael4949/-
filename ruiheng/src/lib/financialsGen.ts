/**
 * 按客户生成三年三表与诊断素材（全部前端确定性计算，固定种子，无网络）。
 *  - 宁桂精密沿用 financials.ts 的手工三表；其他客户由 genStatements(companyId, industry, scale) 生成：
 *    资产 = 负债 + 权益；期末现金 = 期初 + 经营 + 投资 + 筹资；净利润逐行推导；未分配利润(t) = (t-1) + 净利润(t)。
 *    做法：先定营运资本、非流动资产、长期借款与权益，短期借款作为资金缺口的配平项；
 *    经营现金流按间接法（净利润 + 折旧摊销 + 利息 − Δ经营资产 + Δ经营负债）推导后再拆成直接法科目，勾稽必然成立。
 *  - 行业中位数、预测情景、追问模板按行业给定；结论与追问文字由规则拼装（AI 生成 · 需人工复核）。
 */
import { rng } from './rng';
import { COMPANIES, type Company } from '../data/companies';
import {
  BASE_INPUTS, DEFAULT_BENCH, DEFAULT_MULTIPLES, NINGGUI_SCENARIO, cloneInputs, fmtMoney, fmtRatio, ratioById, ratioValue,
  type Anomaly, type BenchMap, type Computed, type Forecast, type ForecastScenario, type Inputs, type QualityScore, type Ref, type StmtId, type ValMultiples, type Valuation, type Year,
} from './financials';
import type { UDoc } from '../components/UploadDocs';

const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const R = Math.round;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
type Tri = [number, number, number];

/* ------------------------------------------------------------------ 行业画像 */
export interface IndustryProfile {
  vat: number; taxRate: number; rate: number;
  bench: BenchMap; note: string; mult: ValMultiples; costDriver: string;
  gm: number; sell: number; adm: number; rd: number; staff: number;
  arDays: number; invDays: number; apDays: number;
  notesRecv: number; prepaid: number; otherRecv: number; notesPay: number; contract: number; otherPay: number;
  fa: number; intangShare: number; cip: number; capex: number; cash: number; lt: number; minSt: number; paidIn: number; retained0: number; impair: number; nonOp: number;
  growth: number; season: number[];
  qbank: { q: string; why: string; refs: Ref[] }[];
}
const RF = (stmt: StmtId, key: string, year: Year = 2025): Ref => ({ stmt, key, year });
const B = (o: BenchMap): BenchMap => ({ ...DEFAULT_BENCH, ...o });
const base: Omit<IndustryProfile, 'bench' | 'note' | 'season' | 'qbank' | 'costDriver'> = {
  vat: 0.13, taxRate: 0.25, rate: 0.05, mult: DEFAULT_MULTIPLES,
  gm: 0.2, sell: 0.03, adm: 0.045, rd: 0.02, staff: 0.12, arDays: 70, invDays: 65, apDays: 55,
  notesRecv: 0.04, prepaid: 0.025, otherRecv: 0.01, notesPay: 0.05, contract: 0.015, otherPay: 0.02,
  fa: 0.4, intangShare: 0.1, cip: 0.08, capex: 0.06, cash: 0.06, lt: 0.06, minSt: 0.04, paidIn: 0.2, retained0: 0.12, impair: 0.015, nonOp: 0.002, growth: 0.1,
};
export const INDUSTRY: Record<string, IndustryProfile> = {
  '精密制造': { ...base, bench: DEFAULT_BENCH, note: '精密制造（汽车零部件）行业中位数 · 行业公开数据估算，非本行内评口径', costDriver: '铝材', season: NINGGUI_SCENARIO.season,
    qbank: [
      { q: '定点项目 SOP 后的结算条款（账期 / 票据比例）是什么？首年排产与爬坡节奏？', why: '预测回款节奏、设定受托支付', refs: [RF('cf', 'recvSales')] },
      { q: '主机厂年降幅度与原材料价格联动机制？模具投入由谁承担、能否分摊回收？', why: '判断毛利率下行是否可逆', refs: [RF('is', 'cogs')] },
    ] },
  '食品加工': { ...base, gm: 0.235, sell: 0.085, adm: 0.05, rd: 0.005, staff: 0.09, arDays: 32, invDays: 54, apDays: 44, notesRecv: 0.01, contract: 0.03, fa: 0.36, cip: 0.06, capex: 0.05, paidIn: 0.15, retained0: 0.14, impair: 0.012, growth: 0.08,
    bench: B({ grossMargin: 0.24, netMargin: 0.05, roe: 0.09, debtRatio: 0.5, currentRatio: 1.4, quickRatio: 0.9, interestCover: 5, arDays: 35, invDays: 55, apDays: 45, cfoToNi: 1.1, cashCollect: 1.1, revGrowth: 0.08 }),
    note: '食品加工行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 6, ebitdaHigh: 8, salesLow: 0.6, salesHigh: 0.9 }, costDriver: '原料与包材',
    season: [1.25, 0.8, 0.9, 0.95, 1.0, 0.95, 0.95, 1.05, 1.1, 1.0, 1.0, 1.05],
    qbank: [
      { q: '经销商信用政策与回款账期？前十大经销商中是否有逾期或被执行的？对应应收与担保金额？', why: '识别经销商风险向集团传导的路径', refs: [RF('bs', 'ar')] },
      { q: '原料（粮油 / 肉类）采购的季节性与春节备货资金峰值多少？备货资金来源？', why: '匹配授信期限与用款节奏', refs: [RF('bs', 'inventory')] },
      { q: '食品安全追溯体系投入与近三年监管检查记录？', why: '评估经营合规风险', refs: [RF('is', 'admin')] },
    ] },
  '商贸流通': { ...base, gm: 0.11, sell: 0.04, adm: 0.035, rd: 0, staff: 0.04, arDays: 45, invDays: 40, apDays: 40, notesRecv: 0.03, prepaid: 0.03, notesPay: 0.04, contract: 0.01, fa: 0.06, cip: 0, capex: 0.01, cash: 0.04, lt: 0, minSt: 0.15, paidIn: 0.12, retained0: 0.12, impair: 0.02, growth: 0.06,
    bench: B({ grossMargin: 0.1, netMargin: 0.02, roe: 0.08, debtRatio: 0.62, currentRatio: 1.2, quickRatio: 0.8, interestCover: 3, arDays: 45, invDays: 40, apDays: 40, cfoToNi: 0.8, cashCollect: 1.1, revGrowth: 0.06 }),
    note: '商贸流通行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 4, ebitdaHigh: 6, salesLow: 0.15, salesHigh: 0.3 }, costDriver: '进货价',
    season: [0.9, 0.8, 1.0, 1.0, 1.05, 1.05, 0.95, 0.95, 1.05, 1.1, 1.1, 1.05],
    qbank: [
      { q: '上游账期与下游账期各多少天？两头账期错配的资金缺口靠什么补？', why: '判断流贷用途真实性', refs: [RF('bs', 'ap'), RF('bs', 'ar')] },
      { q: '与核心上游的供货协议、担保条款及被执行事项的处理进展？', why: '评估传导风险与经营持续性', refs: [RF('bs', 'otherPay')] },
      { q: '是否有商票 / 银承结算？贴现成本与逾期情况？', why: '核实结算真实性与隐性负债', refs: [RF('bs', 'notesPay')] },
    ] },
  '有色加工': { ...base, gm: 0.12, sell: 0.02, adm: 0.03, rd: 0.01, staff: 0.07, arDays: 45, invDays: 50, apDays: 35, notesRecv: 0.05, prepaid: 0.03, notesPay: 0.06, contract: 0.01, fa: 0.32, cip: 0.06, capex: 0.06, cash: 0.04, lt: 0.06, minSt: 0.05, paidIn: 0.12, retained0: 0.14, rate: 0.055, growth: 0.08,
    bench: B({ grossMargin: 0.11, netMargin: 0.03, roe: 0.07, debtRatio: 0.58, currentRatio: 1.2, quickRatio: 0.8, interestCover: 3, arDays: 45, invDays: 50, apDays: 35, cfoToNi: 0.9, cashCollect: 1.1, revGrowth: 0.08 }),
    note: '有色金属加工行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 4.5, ebitdaHigh: 6.5, salesLow: 0.3, salesHigh: 0.45 }, costDriver: '铝锭与电费',
    season: [0.85, 0.8, 1.0, 1.05, 1.05, 1.05, 1.0, 0.95, 1.05, 1.1, 1.1, 1.0],
    qbank: [
      { q: '铝锭采购定价方式（长单 / 现货 / 套保）？加工费能否随铝价调整？', why: '判断毛利率能否修复', refs: [RF('is', 'cogs')] },
      { q: '票据逾期的原因、兑付情况与开票行反馈？当前在途票据余额？', why: '核实流动性压力与信用记录', refs: [RF('bs', 'notesPay')] },
      { q: '新产线达产率与订单覆盖率？下游宁桂精密等客户的定点情况？', why: '评估扩产回报与销售确定性', refs: [RF('bs', 'cip')] },
    ] },
  '跨境电商': { ...base, vat: 0.0, gm: 0.32, sell: 0.14, adm: 0.06, rd: 0.02, staff: 0.08, arDays: 18, invDays: 60, apDays: 36, notesRecv: 0, prepaid: 0.04, notesPay: 0, contract: 0.01, fa: 0.08, cip: 0.02, capex: 0.02, cash: 0.12, lt: 0, minSt: 0.03, paidIn: 0.2, retained0: 0.12, growth: 0.18,
    bench: B({ grossMargin: 0.32, netMargin: 0.05, roe: 0.12, debtRatio: 0.48, currentRatio: 1.5, quickRatio: 1.0, interestCover: 6, arDays: 20, invDays: 60, apDays: 35, cfoToNi: 1.0, cashCollect: 1.02, revGrowth: 0.18 }),
    note: '跨境电商行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 6, ebitdaHigh: 9, salesLow: 0.5, salesHigh: 0.8 }, costDriver: '海运与平台费用',
    season: [0.8, 0.75, 0.9, 0.95, 1.0, 1.05, 1.0, 0.95, 1.0, 1.1, 1.35, 1.15],
    qbank: [
      { q: '平台回款周期与结汇币种结构？是否使用远期锁汇，敞口多大？', why: '切入结汇与套期保值', refs: [RF('cf', 'recvSales')] },
      { q: '海外仓库存占存货比例与滞销处理政策？', why: '判断存货变现能力', refs: [RF('bs', 'inventory')] },
      { q: '出口退税周转的资金占用与到账周期？', why: '设计退税账户质押融资', refs: [RF('bs', 'otherRecv')] },
    ] },
  '医药流通': { ...base, gm: 0.09, sell: 0.035, adm: 0.025, rd: 0, staff: 0.035, arDays: 95, invDays: 44, apDays: 90, notesRecv: 0.02, prepaid: 0.03, notesPay: 0.03, contract: 0.005, fa: 0.07, cip: 0.02, capex: 0.015, cash: 0.05, lt: 0.02, minSt: 0.06, paidIn: 0.1, retained0: 0.08, growth: 0.08,
    bench: B({ grossMargin: 0.09, netMargin: 0.02, roe: 0.09, debtRatio: 0.68, currentRatio: 1.2, quickRatio: 0.9, interestCover: 3, arDays: 95, invDays: 45, apDays: 90, cfoToNi: 0.7, cashCollect: 1.1, revGrowth: 0.08 }),
    note: '医药流通行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 5, ebitdaHigh: 7, salesLow: 0.15, salesHigh: 0.3 }, costDriver: '集采降价',
    season: [1.0, 0.9, 1.0, 1.0, 1.0, 1.0, 0.95, 0.95, 1.0, 1.05, 1.05, 1.1],
    qbank: [
      { q: '三甲医院回款周期与集采品种占比？医保直接结算比例？', why: '判断应收质量与保理可行性', refs: [RF('bs', 'ar')] },
      { q: '上游药企预付政策是否收紧？预付款项占用峰值？', why: '匹配续贷额度', refs: [RF('bs', 'prepaid')] },
      { q: '续贷到期前的回款安排？是否需要无还本续贷？', why: '设计续贷方案', refs: [RF('bs', 'stLoans')] },
    ] },
  '建材贸易': { ...base, gm: 0.09, sell: 0.03, adm: 0.03, rd: 0, staff: 0.03, arDays: 58, invDays: 36, apDays: 40, notesRecv: 0.04, prepaid: 0.05, notesPay: 0.03, contract: 0.01, fa: 0.04, cip: 0, capex: 0.005, cash: 0.03, lt: 0, minSt: 0.12, paidIn: 0.12, retained0: 0.1, impair: 0.03, growth: 0.04,
    bench: B({ grossMargin: 0.09, netMargin: 0.02, roe: 0.07, debtRatio: 0.62, currentRatio: 1.2, quickRatio: 0.8, interestCover: 3, arDays: 60, invDays: 35, apDays: 40, cfoToNi: 0.8, cashCollect: 1.1, revGrowth: 0.04 }),
    note: '建材贸易行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 4, ebitdaHigh: 6, salesLow: 0.15, salesHigh: 0.3 }, costDriver: '水泥、钢材进货价',
    season: [0.6, 0.6, 0.95, 1.1, 1.15, 1.15, 1.1, 1.1, 1.15, 1.15, 1.05, 0.9],
    qbank: [
      { q: '下游房建项目占比与商票结算比例？商票承兑方信用如何？', why: '识别应收隐性风险', refs: [RF('bs', 'ar')] },
      { q: '本行结算量下降 35% 是他行分流还是业务收缩？主要结算行变化？', why: '判断客户关系与结算真实性', refs: [RF('cf', 'recvSales')] },
      { q: '供应商预付比例与授信占用情况？', why: '核实营运资金缺口', refs: [RF('bs', 'prepaid')] },
    ] },
  '软件服务': { ...base, vat: 0.06, taxRate: 0.15, gm: 0.56, sell: 0.12, adm: 0.1, rd: 0.18, staff: 0.45, arDays: 88, invDays: 4, apDays: 40, notesRecv: 0, prepaid: 0.02, notesPay: 0, contract: 0.12, otherPay: 0.015, fa: 0.06, intangShare: 0.55, cip: 0, capex: 0.03, cash: 0.2, lt: 0, minSt: 0, paidIn: 0.2, retained0: 0.1, growth: 0.16,
    bench: B({ grossMargin: 0.55, netMargin: 0.12, roe: 0.12, debtRatio: 0.35, currentRatio: 2.0, quickRatio: 1.9, interestCover: 8, arDays: 90, invDays: 5, apDays: 40, cfoToNi: 1.0, cashCollect: 1.03, revGrowth: 0.15 }),
    note: '软件与信息服务行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 10, ebitdaHigh: 15, salesLow: 2.0, salesHigh: 3.5 }, costDriver: '人力成本',
    season: [0.7, 0.7, 0.9, 0.95, 1.0, 1.15, 0.95, 0.95, 1.05, 1.0, 1.15, 1.5],
    qbank: [
      { q: '合同负债对应的续费率与客户流失率？前五大客户占比？', why: '判断收入可持续性', refs: [RF('bs', 'contractLiab')] },
      { q: '研发费用是否资本化？无形资产中软件著作权的评估依据？', why: '评估知识产权质押物价值', refs: [RF('bs', 'intangible')] },
      { q: '年末验收集中回款的合同清单？逾期 90 天以上应收多少？', why: '核实应收质量', refs: [RF('bs', 'ar')] },
    ] },
  '连锁餐饮': { ...base, vat: 0.06, gm: 0.6, sell: 0.38, adm: 0.13, rd: 0, staff: 0.28, arDays: 4, invDays: 15, apDays: 40, notesRecv: 0, prepaid: 0.05, otherRecv: 0.01, notesPay: 0, contract: 0.06, otherPay: 0.02, fa: 0.35, cip: 0.03, capex: 0.08, cash: 0.06, lt: 0.05, minSt: 0.02, paidIn: 0.12, retained0: 0.1, impair: 0, growth: 0.12,
    bench: B({ grossMargin: 0.6, netMargin: 0.06, roe: 0.15, debtRatio: 0.55, currentRatio: 0.9, quickRatio: 0.8, interestCover: 6, arDays: 5, invDays: 15, apDays: 40, cfoToNi: 1.6, cashCollect: 1.06, revGrowth: 0.12 }),
    note: '连锁餐饮行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 6, ebitdaHigh: 9, salesLow: 0.6, salesHigh: 1.0 }, costDriver: '食材与租金',
    season: [1.15, 1.2, 0.9, 0.95, 1.05, 0.95, 1.0, 1.05, 0.95, 1.1, 0.9, 0.8],
    qbank: [
      { q: '新开门店单店投资与回收期？2026 年拟新开门店数量与资金安排？', why: '判断扩张节奏与融资需求', refs: [RF('bs', 'fixedAssets')] },
      { q: '会员储值余额与使用规则？储值资金是否存管？', why: '识别合同负债风险与存款机会', refs: [RF('bs', 'contractLiab')] },
      { q: '门店租约到期分布与续租涨幅？', why: '评估租金刚性支出', refs: [RF('is', 'selling')] },
    ] },
  '新能源': { ...base, gm: 0.18, sell: 0.025, adm: 0.035, rd: 0.04, staff: 0.08, arDays: 80, invDays: 63, apDays: 90, notesRecv: 0.06, prepaid: 0.04, notesPay: 0.1, contract: 0.03, fa: 0.5, cip: 0.15, capex: 0.14, cash: 0.04, lt: 0.12, minSt: 0.06, paidIn: 0.15, retained0: 0.12, nonOp: 0.01, growth: 0.2,
    bench: B({ grossMargin: 0.18, netMargin: 0.06, roe: 0.08, debtRatio: 0.6, currentRatio: 1.1, quickRatio: 0.8, interestCover: 3.5, arDays: 80, invDays: 65, apDays: 90, cfoToNi: 0.9, cashCollect: 1.08, revGrowth: 0.2 }),
    note: '新能源（光伏组件）行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 6, ebitdaHigh: 8, salesLow: 0.5, salesHigh: 0.8 }, costDriver: '硅片与辅材',
    season: [0.7, 0.7, 0.9, 1.0, 1.05, 1.1, 1.05, 1.05, 1.1, 1.1, 1.15, 1.1],
    qbank: [
      { q: '组件价格下行对毛利的影响？在手订单是否锁价、锁量？', why: '判断盈利稳定性', refs: [RF('is', 'cogs')] },
      { q: '新产线投产进度与产能利用率目标？投产后的爬坡期资金需求？', why: '匹配固定资产贷款与流贷期限', refs: [RF('bs', 'cip')] },
      { q: '应收票据的承兑行结构与贴现安排？', why: '评估票据融资空间', refs: [RF('bs', 'notesRecv')] },
    ] },
  '物流仓储': { ...base, vat: 0.09, gm: 0.14, sell: 0.02, adm: 0.05, rd: 0, staff: 0.22, arDays: 55, invDays: 5, apDays: 46, notesRecv: 0.01, prepaid: 0.02, notesPay: 0.01, contract: 0.02, fa: 0.6, intangShare: 0.08, cip: 0.04, capex: 0.08, cash: 0.05, lt: 0.11, minSt: 0.04, paidIn: 0.2, retained0: 0.12, growth: 0.08,
    bench: B({ grossMargin: 0.14, netMargin: 0.04, roe: 0.08, debtRatio: 0.55, currentRatio: 1.1, quickRatio: 1.0, interestCover: 4, arDays: 55, invDays: 5, apDays: 45, cfoToNi: 1.3, cashCollect: 1.06, revGrowth: 0.08 }),
    note: '物流仓储行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 5, ebitdaHigh: 7, salesLow: 0.4, salesHigh: 0.7 }, costDriver: '燃油与人工',
    season: [0.85, 0.8, 0.95, 1.0, 1.0, 1.05, 0.95, 0.95, 1.05, 1.1, 1.25, 1.05],
    qbank: [
      { q: '运价下行下的合同定价机制？是否有燃油联动条款？', why: '判断毛利率能否企稳', refs: [RF('is', 'cogs')] },
      { q: '车辆更新计划与融资租赁余额？租赁负债是否在表内？', why: '识别表外债务', refs: [RF('bs', 'fixedAssets')] },
      { q: '仓储客户集中度与合同期限？', why: '评估收入稳定性', refs: [RF('bs', 'ar')] },
    ] },
  '现代农业': { ...base, vat: 0.03, taxRate: 0.02, gm: 0.215, sell: 0.04, adm: 0.05, rd: 0.01, staff: 0.15, arDays: 24, invDays: 88, apDays: 31, notesRecv: 0, prepaid: 0.03, notesPay: 0, contract: 0.02, fa: 0.4, cip: 0.05, capex: 0.09, cash: 0.05, lt: 0.08, minSt: 0.03, paidIn: 0.2, retained0: 0.1, impair: 0.01, nonOp: 0.02, growth: 0.09,
    bench: B({ grossMargin: 0.2, netMargin: 0.06, roe: 0.07, debtRatio: 0.45, currentRatio: 1.3, quickRatio: 0.7, interestCover: 4, arDays: 25, invDays: 90, apDays: 30, cfoToNi: 1.0, cashCollect: 1.02, revGrowth: 0.08 }),
    note: '现代农业行业中位数 · 行业公开数据估算，非本行内评口径', mult: { ebitdaLow: 5, ebitdaHigh: 7, salesLow: 0.5, salesHigh: 0.8 }, costDriver: '种苗与饲料',
    season: [0.7, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.5, 1.2, 0.9],
    qbank: [
      { q: '生物资产与在田作物的计量方式与盘点频次？存货中可即时变现的比例？', why: '判断存货质押可行性', refs: [RF('bs', 'inventory')] },
      { q: '秋收集中变现的销售渠道与订单合同？是否有保底收购协议？', why: '评估回款确定性', refs: [RF('cf', 'recvSales')] },
      { q: '农业补贴到账时间与政策延续性？', why: '判断营业外收入可持续性', refs: [RF('is', 'nonOp')] },
    ] },
};
export const profileOf = (industry: string): IndustryProfile => INDUSTRY[industry] ?? INDUSTRY['精密制造'];
export const benchFor = (industry: string): BenchMap => profileOf(industry).bench;
export const benchNoteFor = (industry: string): string => profileOf(industry).note;

/* ------------------------------------------------------------------ 客户经营故事（三年路径与情景） */
interface Story {
  scale: number; growth: Tri;
  gm?: Tri; arDays?: Tri; invDays?: Tri; apDays?: Tri; otherRecv?: Tri; capex?: Tri; lt?: Tri; cip?: Tri;
  cash?: number; minSt?: number; impair?: number; retained0?: number; fa?: number; rate?: number;
  facts: string[]; driver: string; fcGrowth: number; capexPlan?: number[]; debtDue?: number[]; events?: Record<number, string>; rigid: string; runoff?: number;
}
const Z12 = () => Array(12).fill(0) as number[];
const STORIES: Record<string, Story> = {
  shenghe: { scale: 180000, growth: [0.09, 0.07, 0.05], gm: [0.235, 0.228, 0.222], arDays: [30, 36, 52], otherRecv: [0.004, 0.005, 0.036], capex: [0.05, 0.06, 0.09], lt: [0.06, 0.07, 0.09], cip: [0.05, 0.08, 0.22], minSt: 0.12, retained0: 0.08, cash: 0.05,
    facts: ['集团 6 家子公司，3 家未在本行开户', '经销商彩晟商贸被执行 860 万，对其应收 1,800 万、担保 500 万', '与晟盛置业资金往来 2,300 万，另有对经销商与关联方的临时拆借', '新建冷链仓总投资 1.15 亿，资本金 30% 已到位'],
    driver: '来自预制菜新线投产与冷链仓（子公司并表）', fcGrowth: 0.08, capexPlan: [800, 800, 1200, 1200, 1200, 1200, 900, 900, 600, 600, 300, 300], debtDue: [0, 0, 0, 3000, 0, 0, 0, 0, 0, 0, 0, 0],
    events: { 0: '春节备货回款高峰', 3: '他行 3,000 万流贷到期', 5: '冷链仓主体封顶', 8: '预制菜新线投产' }, rigid: '冷链仓工程款约 1.0 亿（全年分期）；他行 3,000 万流贷 4 月到期待续' },
  caisheng: { scale: 9000, growth: [0.10, -0.12, -0.28], gm: [0.11, 0.095, 0.08], arDays: [45, 70, 120], invDays: [40, 60, 95], apDays: [38, 42, 55], otherRecv: [0.01, 0.012, 0.015], capex: [0.01, 0.01, 0.005], lt: [0, 0, 0], cash: 0.03, impair: 0.06, rate: 0.065,
    facts: ['被执行 860 万（上游供应商申请）', '本行结算量近三月下降 62%，对公存款降至 120 万', '晟禾食品集团对其应收 1,800 万并担保 500 万', '本地平台出现门店关停、员工讨薪帖 2 条'],
    driver: '无新增业务，按现有门店萎缩趋势测算', fcGrowth: -0.15, debtDue: [0, 500, 0, 860, 0, 0, 500, 0, 0, 0, 0, 0],
    events: { 1: '他行 500 万到期压降', 3: '执行款 860 万', 6: '他行第二笔 500 万压降', 9: '旺季进货' }, rigid: '执行款 860 万（4 月）；他行分两次压降 1,000 万', runoff: 0.7 },
  beiling: { scale: 42000, growth: [0.12, 0.06, 0.03], gm: [0.125, 0.105, 0.088], arDays: [42, 45, 49], invDays: [48, 50, 52], apDays: [35, 34, 33], capex: [0.06, 0.16, 0.10], lt: [0.06, 0.07, 0.07], cip: [0.06, 0.18, 0.10],
    facts: ['票据逾期 1 笔（逾期 6 天后兑付）', '为宁桂精密铝锭供应商，供货占其采购 30% 以上', '2024 年新增一条铝棒连铸线，投资约 6,500 万', '铝价上涨叠加下游年降，加工费承压'],
    driver: '来自新产线达产后铝棒销量提升', fcGrowth: 0.06, capexPlan: [200, 200, 300, 300, 300, 200, 0, 0, 0, 0, 0, 0], debtDue: [0, 0, 1500, 0, 0, 0, 0, 1500, 0, 0, 0, 0],
    events: { 2: '他行 1,500 万流贷到期', 5: '新产线达产验收', 7: '他行 1,500 万流贷到期', 9: '铝价季度定价调整' }, rigid: '产线尾款 1,500 万（上半年）；他行两笔 1,500 万流贷到期待续' },
  c05: { scale: 26000, growth: [0.22, 0.20, 0.18], gm: [0.31, 0.32, 0.33], arDays: [18, 18, 20], invDays: [58, 60, 62], apDays: [35, 36, 36], capex: [0.02, 0.02, 0.03],
    facts: ['东盟出口收汇稳定，美元 / 泰铢结汇需求', '海外仓备货占存货约 60%', '平台回款周期 15–20 天'],
    driver: '来自新增东南亚站点与海外仓扩容', fcGrowth: 0.18, capexPlan: [0, 0, 300, 300, 0, 0, 0, 0, 200, 200, 0, 0],
    events: { 1: '年货节备货结算', 3: '海外仓扩容', 9: '旺季备货', 10: '旺季回款高峰' }, rigid: '海外仓扩容 1,000 万（分两期）' },
  c06: { scale: 95000, growth: [0.10, 0.08, 0.07], gm: [0.088, 0.09, 0.092], arDays: [92, 95, 98], invDays: [42, 44, 45], apDays: [88, 90, 92], capex: [0.015, 0.015, 0.02],
    facts: ['本行授信 1,500 万，60 天后到期，启动续贷', '下游三甲医院回款 90–120 天，集采品种占比上升', '上游药企预付比例提高'],
    driver: '来自集采中标品种放量', fcGrowth: 0.07, capexPlan: [0, 0, 0, 400, 400, 0, 0, 0, 0, 0, 0, 0], debtDue: [0, 1500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    events: { 1: '本行 1,500 万到期（拟续贷）', 3: '医保结算回款集中到账', 8: '集采新标执行' }, rigid: '本行 1,500 万流贷 2 月到期（续贷前按到期偿还测算）；冷链仓改造 800 万' },
  c07: { scale: 12000, growth: [0.08, -0.05, -0.10], gm: [0.095, 0.09, 0.085], arDays: [55, 56, 84], invDays: [35, 36, 38], apDays: [40, 40, 45],
    facts: ['本行结算量环比下降 35%，疑似他行分流', '下游房建项目回款拖长，部分以商票结算', '主要供货为水泥、钢材，供应商要求 30 天预付'],
    driver: '来自市政项目订单补充地产下滑', fcGrowth: -0.05, debtDue: [0, 0, 0, 0, 0, 800, 0, 0, 0, 0, 0, 0],
    events: { 2: '开工季备货', 5: '他行 800 万流贷到期', 8: '房建项目集中结算', 11: '年底工程款回收' }, rigid: '他行 800 万流贷 6 月到期待续' },
  c08: { scale: 8500, growth: [0.20, 0.18, 0.16], gm: [0.54, 0.56, 0.57], arDays: [85, 88, 90], capex: [0.03, 0.03, 0.03], minSt: 0.06,
    facts: ['专精特新，高新技术企业（所得税 15%）', '本行知识产权质押贷款 500 万', '合同负债（预收）占收入 12%，续费率 88%'],
    driver: '来自标杆客户复购与新签', fcGrowth: 0.16, capexPlan: [0, 0, 0, 0, 0, 100, 100, 0, 0, 0, 0, 0], debtDue: [0, 0, 0, 0, 0, 0, 0, 0, 500, 0, 0, 0],
    events: { 0: '年度维保款集中到账', 5: '研发费用加计扣除申报', 8: '本行 500 万质押贷到期', 11: '四季度验收回款高峰' }, rigid: '本行 500 万知识产权质押贷 9 月到期（按到期偿还测算）' },
  c09: { scale: 21000, growth: [0.15, 0.12, 0.14], gm: [0.58, 0.60, 0.61], arDays: [4, 4, 5], invDays: [14, 15, 15], apDays: [38, 40, 42], capex: [0.08, 0.08, 0.08],
    facts: ['本行结算量环比上升 28%，收单与存款机会', '在营门店 38 家，2026 年拟新开 8 家', '会员储值余额约 1,260 万'],
    driver: '来自新开门店 8 家', fcGrowth: 0.14, capexPlan: [0, 0, 150, 150, 150, 150, 150, 150, 150, 150, 0, 0],
    events: { 0: '春节旺季', 2: '新店首批开业', 6: '暑期旺季', 9: '国庆旺季' }, rigid: '新开门店装修与设备约 1,200 万（3–10 月）' },
  c10: { scale: 120000, growth: [0.30, 0.22, 0.18], gm: [0.19, 0.18, 0.175], arDays: [75, 80, 84], invDays: [60, 62, 66], apDays: [88, 90, 90], capex: [0.12, 0.18, 0.18], cip: [0.10, 0.25, 0.30], lt: [0.10, 0.12, 0.13],
    facts: ['光伏组件产线扩建，本行固定资产贷款 3,000 万', '产能利用率 78%，组件价格下行', '应收票据占比高，多为 6 个月银承'],
    driver: '来自新产线 Q2 投产后出货增加', fcGrowth: 0.18, capexPlan: [1200, 1200, 1500, 1500, 900, 900, 500, 500, 300, 300, 200, 200], debtDue: [0, 0, 4000, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    events: { 2: '他行 4,000 万流贷到期', 4: '新产线投产', 6: '组件价格季度调整', 10: '年底组件集中交付' }, rigid: '产线设备尾款约 9,200 万（全年分期）；他行 4,000 万流贷 3 月到期待续' },
  c11: { scale: 38000, growth: [0.10, 0.04, -0.02], gm: [0.16, 0.135, 0.115], arDays: [52, 55, 58], invDays: [5, 5, 5], apDays: [45, 46, 48], capex: [0.10, 0.08, 0.06], lt: [0.12, 0.11, 0.10],
    facts: ['本行贷款 1,200 万（车辆抵押）', '运价指数同比下行，燃油与人工成本刚性', '仓储业务占比提升至 30%'],
    driver: '来自仓储与冷链业务增量', fcGrowth: 0.03, capexPlan: [0, 0, 400, 400, 0, 0, 0, 0, 400, 400, 0, 0], debtDue: [0, 0, 0, 0, 0, 0, 1200, 0, 0, 0, 0, 0],
    events: { 2: '车辆更新首批交付', 6: '本行 1,200 万贷款到期（拟续贷）', 10: '电商旺季运量高峰' }, rigid: '车辆更新 1,600 万（分两批）；本行 1,200 万贷款 7 月到期（按到期偿还测算）' },
  c12: { scale: 6800, growth: [0.12, 0.10, 0.09], gm: [0.21, 0.215, 0.22], arDays: [22, 24, 25], invDays: [85, 88, 90], apDays: [30, 30, 32], capex: [0.09, 0.09, 0.10],
    facts: ['涉农贷款需求 500 万（大棚扩建）', '存货以生物资产与在田作物为主，秋季集中变现', '农业补贴计入营业外收入'],
    driver: '来自大棚扩建后设施蔬菜增量', fcGrowth: 0.09, capexPlan: [0, 0, 200, 200, 200, 0, 0, 0, 0, 0, 0, 0],
    events: { 2: '春耕投入高峰', 4: '大棚扩建', 8: '秋收集中回款', 9: '秋收集中回款' }, rigid: '大棚扩建 600 万（3–5 月）' },
};
function storyOf(companyId: string, industry: string, scale: number): Story {
  if (STORIES[companyId]) return STORIES[companyId];
  const P = profileOf(industry); const co = COMPANIES.find((c) => c.id === companyId);
  const g = P.growth;
  return { scale, growth: [g + 0.02, g, g - 0.01], facts: co ? [co.note, ...co.tags] : [], driver: '来自现有客户订单自然增长', fcGrowth: g, rigid: '无重大资本开支；存量借款按到期续作测算' };
}
/** 客户规模（2025 年营业收入，万元） */
export function scaleFor(co: Company): number { return STORIES[co.id]?.scale ?? R(co.settlement * 6); }

/* ------------------------------------------------------------------ 三年三表生成 */
export function genStatements(companyId: string, industry: string, scale: number): Inputs {
  const P = profileOf(industry);
  const S = storyOf(companyId, industry, scale);
  const r = rng(hash(companyId) ^ 0x5bd1e995);
  const n = (amp = 0.03) => 1 + (r() * 2 - 1) * amp;
  const seq = (a: Tri | undefined, d: number) => (a ? [a[0], a[0], a[1], a[2]] : [d, d, d, d]);
  const vat = P.vat, taxRate = P.taxRate, rate = S.rate ?? P.rate;
  const rev = [0, 0, 0, 0];
  rev[3] = R(scale); rev[2] = R(rev[3] / (1 + S.growth[2])); rev[1] = R(rev[2] / (1 + S.growth[1])); rev[0] = R(rev[1] / (1 + S.growth[0]));
  const gmA = seq(S.gm, P.gm), arD = seq(S.arDays, P.arDays), invD = seq(S.invDays, P.invDays), apD = seq(S.apDays, P.apDays);
  const orS = seq(S.otherRecv, P.otherRecv), capS = seq(S.capex, P.capex), ltS = seq(S.lt, P.lt), cipS = seq(S.cip, P.cip);
  const cashS = S.cash ?? P.cash, minSt = S.minSt ?? P.minSt, impairR = S.impair ?? P.impair, faS = S.fa ?? P.fa;
  const paidIn = R(scale * P.paidIn), capRes = R(paidIn * 0.15);
  const k = (x: number) => R(x);
  const rows: Record<string, number>[] = [{}, {}, {}, {}];
  for (let i = 0; i < 4; i++) {
    const t = rows[i], p = rows[i - 1];
    t.rev = rev[i];
    t.cogs = k(rev[i] * (1 - gmA[i]));
    t.taxSur = k(rev[i] * 0.006 * n()); t.selling = k(rev[i] * P.sell * n()); t.admin = k(rev[i] * P.adm * n()); t.rd = k(rev[i] * P.rd * n(0.02));
    t.ar = k(rev[i] * arD[i] / 360); t.notesRecv = k(rev[i] * P.notesRecv * n()); t.prepaid = k(t.cogs * P.prepaid * n()); t.otherRecv = k(rev[i] * orS[i]); t.inventory = k(t.cogs * invD[i] / 360);
    t.ap = k(t.cogs * apD[i] / 360); t.notesPay = k(t.cogs * P.notesPay * n()); t.contractLiab = k(rev[i] * P.contract * n()); t.payroll = k(rev[i] * P.staff * 0.08 * n()); t.taxPay = k(rev[i] * 0.006 * n()); t.otherPay = k(rev[i] * P.otherPay * n());
    if (i === 0) { t.da = 0; t.capex = 0; t.nca = k(rev[0] * faS); }
    else { t.da = k(p.fa * 0.09 + p.intangible * 0.05); t.capex = k(rev[i] * capS[i]); t.nca = p.nca - t.da + t.capex; }
    t.intangible = k(t.nca * P.intangShare); t.cip = k(t.nca * cipS[i]); t.fa = t.nca - t.intangible - t.cip;
    t.lt = k(rev[i] * ltS[i]);
    const debtBase = i === 0 ? k(rev[0] * (ltS[0] + minSt + 0.08)) : p.st + p.lt;
    t.interest = k(debtBase * rate); t.finExp = k(t.interest * 0.92);
    t.impairment = k(t.ar * impairR); t.nonOp = k(rev[i] * P.nonOp);
    const opProfit = t.rev - (t.cogs + t.taxSur + t.selling + t.admin + t.rd + t.finExp + t.impairment);
    t.ebt = opProfit + t.nonOp; t.tax = t.ebt > 0 ? k(t.ebt * taxRate) : 0; t.np = t.ebt - t.tax;
    t.retained = i === 0 ? k(scale * (S.retained0 ?? P.retained0)) : p.retained + t.np;
    t.equity = paidIn + capRes + t.retained;
    t.awc = t.notesRecv + t.ar + t.prepaid + t.otherRecv + t.inventory;
    t.lwc = t.notesPay + t.ap + t.contractLiab + t.payroll + t.taxPay + t.otherPay;
    const stNeed = k(rev[i] * cashS) + t.awc + t.nca - t.lwc - t.lt - t.equity;
    t.st = Math.max(k(rev[i] * minSt), stNeed);
    t.cash = t.lwc + t.st + t.lt + t.equity - t.awc - t.nca;
    if (i > 0) {
      const d = (key: string) => t[key] - p[key];
      t.cfo = t.np + t.da + t.interest - d('awc') + d('lwc');
      const dDebt = d('st') + d('lt');
      let repay = k(p.st * 0.65 + p.lt * 0.12); let borrow = repay + dDebt;
      if (borrow < 0) { repay -= borrow; borrow = 0; }
      t.borrow = borrow; t.repay = repay; t.payInterestDiv = t.interest;
      let recvSales = k(t.rev * (1 + vat)) - (d('notesRecv') + d('ar')) + d('contractLiab');
      const payStaff = k(t.rev * P.staff) - d('payroll');
      const payTax = Math.max(0, t.tax + t.taxSur + k((t.rev - t.cogs) * vat * 0.55) - d('taxPay'));
      let paySupplier = k(Math.max(t.cogs * 0.3, t.cogs - t.rev * P.staff * 0.65) * (1 + vat)) + d('inventory') + d('prepaid') - d('ap') - d('notesPay');
      let payOther = recvSales - paySupplier - payStaff - payTax - t.cfo;
      const floor = k(t.rev * 0.015), ceil = k(t.rev * 0.12);
      if (payOther < floor) { paySupplier -= floor - payOther; payOther = floor; }
      else if (payOther > ceil) { paySupplier += payOther - ceil; payOther = ceil; }
      if (paySupplier < 0) { recvSales -= paySupplier; paySupplier = 0; }
      t.recvSales = recvSales; t.paySupplier = paySupplier; t.payStaff = payStaff; t.payTax = payTax; t.payOther = payOther; t.openCash = p.cash;
    }
  }
  const tri = (key: string) => ({ 2023: rows[1][key], 2024: rows[2][key], 2025: rows[3][key] });
  return {
    bs: {
      cash: tri('cash'), notesRecv: tri('notesRecv'), ar: tri('ar'), prepaid: tri('prepaid'), otherRecv: tri('otherRecv'), inventory: tri('inventory'),
      fixedAssets: tri('fa'), cip: tri('cip'), intangible: tri('intangible'),
      stLoans: tri('st'), notesPay: tri('notesPay'), ap: tri('ap'), contractLiab: tri('contractLiab'), payroll: tri('payroll'), taxPay: tri('taxPay'), otherPay: tri('otherPay'), ltLoans: tri('lt'),
      paidIn: { 2023: paidIn, 2024: paidIn, 2025: paidIn }, capReserve: { 2023: capRes, 2024: capRes, 2025: capRes }, retained: tri('retained'),
    },
    is: { revenue: tri('rev'), cogs: tri('cogs'), taxSurcharge: tri('taxSur'), selling: tri('selling'), admin: tri('admin'), rd: tri('rd'), finExp: tri('finExp'), interest: tri('interest'), impairment: tri('impairment'), nonOp: tri('nonOp'), tax: tri('tax') },
    cf: { recvSales: tri('recvSales'), paySupplier: tri('paySupplier'), payStaff: tri('payStaff'), payTax: tri('payTax'), payOther: tri('payOther'), capex: tri('capex'), borrow: tri('borrow'), repay: tri('repay'), payInterestDiv: tri('payInterestDiv'), openCash: tri('openCash') },
  };
}
/** 客户三表：宁桂精密为手工三表，其余按固定种子生成 */
export function inputsFor(co: Company): Inputs {
  return co.id === 'ninggui' ? cloneInputs(BASE_INPUTS) : genStatements(co.id, co.industry, scaleFor(co));
}
export const factsFor = (co: Company): string[] => storyOf(co.id, co.industry, scaleFor(co)).facts;
export const multiplesFor = (industry: string): ValMultiples => profileOf(industry).mult;

/* ------------------------------------------------------------------ 预测情景 */
export function forecastGrowthFor(co: Company): number { return co.id === 'ninggui' ? 0.15 : storyOf(co.id, co.industry, scaleFor(co)).fcGrowth; }
export function scenarioFor(co: Company, c: Computed): ForecastScenario {
  if (co.id === 'ninggui') return NINGGUI_SCENARIO;
  const P = profileOf(co.industry); const S = storyOf(co.id, co.industry, scaleFor(co));
  const season = P.season;
  const build = season.map((_, i) => 0.5 + 0.5 * season[(i + 1) % 12]);
  const capex = S.capexPlan ?? season.map(() => R(c.cf.capex[2025] * 0.9 / 12));
  const arDays = ratioValue(c, 'arDays', 2025) ?? 60;
  const safety = Math.max(200, R(c.is.revenue[2025] * 0.02 / 100) * 100);
  return {
    season, inc: [0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.09, 0.1, 0.1, 0.1, 0.11, 0.11], incLag: clamp(R(arDays / 40), 1, 3), build,
    capex, debtDue: S.debtDue ?? Z12(), events: S.events ?? {}, safety, runoff: S.runoff ?? 0.9,
    incLabel: `${S.driver}，按季节系数逐月释放`, rigidLabel: S.rigid,
  };
}

/* ------------------------------------------------------------------ 示例文件与识别结果 */
export function presetsFor(co: Company): string[] {
  const h = hash(co.id);
  const pool = [
    `${co.name}_2025年度审计报告.pdf`, `${co.name}_2023-2025三年报表.xlsx`, `${co.name}_2025年利润表扫描件.jpg`,
    `${co.name}_2024年度审计报告.pdf`, `${co.name}_2025年纳税申报表.pdf`, `${co.name}_资产负债表拍照件.png`, `${co.name}_现金流量表.docx`, `${co.name}_经营情况汇报.pptx`,
  ];
  const third = [2, 5, 6, 7, 4][h % 5];
  return [pool[0], pool[1], pool[third]];
}
export interface RecogStmt { id: string; doc: string; ext: string; name: string; year: string; pages: number; confidence: number; aux: boolean }
export interface LowField { id: string; ref: Ref; doc: string; recognized: number; suggested: number; reason: string }
export interface Recognition { stmts: RecogStmt[]; fields: LowField[]; docs: number; pages: number; fieldsTotal: number; years: Year[] }
const STMT_NAME: Record<StmtId, string> = { bs: '资产负债表', is: '利润表', cf: '现金流量表' };
const LOW_POOL: Record<StmtId, string[]> = {
  bs: ['otherRecv', 'notesPay', 'prepaid', 'otherPay', 'taxPay', 'inventory', 'cip', 'payroll'],
  is: ['finExp', 'impairment', 'nonOp', 'tax', 'taxSurcharge', 'rd', 'admin'],
  cf: ['payOther', 'payTax', 'repay', 'payInterestDiv', 'capex', 'payStaff'],
};
const REASONS = ['手写批注覆盖', '扫描件倾斜', '表格线断裂', '印章遮挡', '数字 1 / 7 形近', '合计行跨页', '拍照反光'];
export function recognitionOf(docs: UDoc[], truth: Inputs): Recognition {
  const stmts: RecogStmt[] = []; const fields: LowField[] = []; const used = new Set<string>(); const yearsSet = new Set<Year>();
  let pages = 0, fieldsTotal = 0;
  for (const d of docs.filter((x) => x.status === 'done')) {
    pages += d.pages; fieldsTotal += d.fields;
    const nm = d.name;
    const found = Array.from(new Set((nm.match(/202[3-5]/g) ?? []).map(Number))) as Year[];
    const years: Year[] = /三年|2023-2025|2023–2025/.test(nm) ? [2023, 2024, 2025] : found.length ? found : [2025];
    let ids: StmtId[] = ['bs', 'is', 'cf']; let auxName: string | null = null;
    if (/纳税申报/.test(nm)) { ids = []; auxName = '增值税 / 企业所得税申报表'; }
    else if (/汇报|说明|pptx?$/i.test(nm)) { ids = []; auxName = '经营情况材料（非报表）'; }
    else if (/资产负债/.test(nm)) ids = ['bs'];
    else if (/利润/.test(nm)) ids = ['is'];
    else if (/现金流/.test(nm)) ids = ['cf'];
    years.forEach((yr) => yearsSet.add(yr));
    const rowsN = Math.max(1, ids.length * years.length + (auxName ? 1 : 0));
    const per = Math.max(1, Math.floor(d.pages / rowsN));
    if (auxName) stmts.push({ id: `${d.id}-aux`, doc: d.name, ext: d.ext, name: auxName, year: String(years[years.length - 1]), pages: per, confidence: clamp(d.confidence - 2, 85, 99), aux: true });
    for (const s of ids) for (const yr of years) {
      const h = hash(`${d.id}|${s}|${yr}`);
      stmts.push({ id: `${d.id}-${s}-${yr}`, doc: d.name, ext: d.ext, name: STMT_NAME[s], year: String(yr), pages: per, confidence: clamp(d.confidence + (h % 7) - 3, 86, 99), aux: false });
    }
    if (ids.length === 0) continue;
    let want = Math.min(3, d.lowConf); let tries = 0;
    while (want > 0 && tries < 24 && fields.length < 6) {
      const h = hash(`${d.id}#${tries}`); tries++;
      const s = ids[h % ids.length]; const key = LOW_POOL[s][(h >>> 3) % LOW_POOL[s].length]; const yr = years[(h >>> 7) % years.length];
      const k = `${s}.${key}.${yr}`; const v = truth[s][key][yr];
      if (used.has(k) || v === 0) continue;
      used.add(k);
      const digits = String(Math.abs(v)).length; const unit = Math.pow(10, Math.max(0, digits - 2));
      let delta = (1 + ((h >>> 11) % 4)) * unit * (((h >>> 15) & 1) ? 1 : -1);
      if (v + delta <= 0) delta = Math.abs(delta);
      fields.push({ id: k, ref: { stmt: s, key, year: yr }, doc: d.name, recognized: v + delta, suggested: v, reason: REASONS[(h >>> 17) % REASONS.length] });
      want--;
    }
  }
  return { stmts, fields, docs: docs.filter((x) => x.status === 'done').length, pages, fieldsTotal, years: Array.from(yearsSet).sort() };
}

/* ------------------------------------------------------------------ 诊断思考流 */
export const DIAG_STEPS = ['表格重建', '科目映射', '勾稽校验', '指标计算', '同业对标', '异常扫描', '现金流预测', '生成追问'] as const;
export function diagDetails(x: { recog: Recognition; ledgerOk: number; ledgerTotal: number; better: number; worse: number; industry: string; anomalies: Anomaly[]; forecast: Forecast }): string[] {
  const { recog, forecast: f } = x;
  const tables = Math.max(recog.stmts.length, Math.round(recog.fieldsTotal / 40));
  const trig = x.anomalies.filter((a) => a.triggered).length;
  return [
    `${recog.docs} 份文件 · ${recog.pages} 页 · 重建表格 ${tables} 张、提取字段 ${recog.fieldsTotal} 个（含 ${recog.fields.length} 个人工确认字段）`,
    `原始科目映射到标准三表 41 个科目（资产负债表 20 / 利润表 11 / 现金流量表 10）· 覆盖年份 ${recog.years.join(' / ') || '2025'}`,
    `${x.ledgerTotal} 项勾稽关系：${x.ledgerOk} 项成立${x.ledgerOk < x.ledgerTotal ? `，${x.ledgerTotal - x.ledgerOk} 项存在差额（已标红）` : ' — 资产 = 负债 + 权益、期末现金 = 期初 + 三大净流量、净利润推导全部成立'}`,
    '14 项比率 × 3 年（盈利 / 偿债 / 营运 / 现金 / 成长），公式与口径可点开查看',
    `${x.industry}行业中位数（公开数据估算）：${x.better} 项优于 · ${x.worse} 项弱于`,
    `${x.anomalies.length} 条红字规则逐条判定：触发 ${trig} 条${trig ? `（${x.anomalies.filter((a) => a.triggered).map((a) => a.title.split('：')[0]).join('、')}）` : ''}`,
    `12 个月直接法预测：最低现金 ${fmtMoney(f.minCash)} 万（${f.minMonth}）${f.gap > 0 ? `，缺口约 ${fmtMoney(f.gap)} 万` : '，高于安全线'}`,
    `按 ${trig} 条异常 + ${x.industry}行业要点 + 预测结果生成 5 个追问，并标注原表坐标`,
  ];
}

/* ------------------------------------------------------------------ 追问（5 个） */
export interface Question { q: string; why: string; refs: Ref[]; tag: '异常' | '预测' | '行业' | '指标' }
export function genQuestions(co: Company, c: Computed, f: Forecast, anomalies: Anomaly[], bench: BenchMap): Question[] {
  const P = profileOf(co.industry);
  const m = (s: StmtId, k: string, y: Year = 2025) => fmtMoney(c[s][k][y]);
  const d = (id: string, y: Year) => (ratioValue(c, id, y) ?? 0).toFixed(0);
  const pc = (id: string, y: Year) => fmtRatio(ratioValue(c, id, y), 'pct');
  const out: Question[] = [];
  const byId: Record<string, () => Question> = {
    'ar-vs-rev': () => ({ tag: '异常', q: `应收账款从 ${m('bs', 'ar', 2024)} 万增至 ${m('bs', 'ar')} 万（周转 ${d('arDays', 2023)} → ${d('arDays', 2025)} 天）：是客户账期延长，还是存在已发货未验收 / 争议货款？前五大应收对象账龄？`, why: '判断收入质量与应收质押可行性', refs: [RF('bs', 'ar'), RF('is', 'revenue')] }),
    'cfo-neg': () => ({ tag: '异常', q: `经营现金流 2024、2025 年连续为负（${m('cf', 'cfo', 2024)} / ${m('cf', 'cfo')} 万），净利润 ${m('is', 'netProfit')} 万：差额去了哪里？若他行压降授信，日常周转靠什么？`, why: '识别"账面盈利、现金失血"的成因与第二还款来源', refs: [RF('cf', 'cfo'), RF('cf', 'cfo', 2024)] }),
    'other-recv': () => ({ tag: '异常', q: `其他应收款年末 ${m('bs', 'otherRecv')} 万的对手方是谁？是否为实控人或关联企业占用？归还时间表？`, why: '决定是否作为放款前置条件', refs: [RF('bs', 'otherRecv')] }),
    'gm-slide': () => ({ tag: '异常', q: `毛利率 ${pc('grossMargin', 2023)} → ${pc('grossMargin', 2025)}：是${P.costDriver}上涨、客户压价还是产品结构变化？有无价格联动 / 调价机制？`, why: '判断盈利下滑是否可逆', refs: [RF('is', 'cogs'), RF('is', 'revenue')] }),
    'st-long': () => ({ tag: '异常', q: `两年新增非流动资产 ${fmtMoney(c.bs.nonCurrentAssets[2025] - c.bs.nonCurrentAssets[2023])} 万，长期借款仅增 ${fmtMoney(c.bs.ltLoans[2025] - c.bs.ltLoans[2023])} 万，短期借款 ${m('bs', 'stLoans', 2023)} → ${m('bs', 'stLoans')} 万：扩产项目的中长期资金安排是什么？`, why: '评估短贷长用风险，判断是否需以中长期贷款置换', refs: [RF('bs', 'stLoans'), RF('bs', 'nonCurrentAssets')] }),
    'inv-pile': () => ({ tag: '异常', q: `存货周转 ${d('invDays', 2023)} → ${d('invDays', 2025)} 天、存货 ${m('bs', 'inventory')} 万：库龄超 6 个月的金额？是否计提跌价？去化安排？`, why: '判断存货变现能力与流贷用途真实性', refs: [RF('bs', 'inventory'), RF('is', 'cogs')] }),
    'collect-low': () => ({ tag: '异常', q: `销售收现率 ${pc('cashCollect', 2025)}，收入 ${m('is', 'revenue')} 万但收到现金 ${m('cf', 'recvSales')} 万：开票与回款是否匹配？是否存在提前确认收入？`, why: '核实收入真实性', refs: [RF('cf', 'recvSales'), RF('is', 'revenue')] }),
  };
  for (const a of anomalies.filter((x) => x.triggered).slice(0, 3)) out.push(byId[a.id]());
  const sc = scenarioFor(co, c);
  out.push(f.gap > 0
    ? { tag: '预测', q: `预测 ${f.gapQuarter}（${f.minMonth}）资金缺口约 ${fmtMoney(f.gap)} 万：${sc.rigidLabel.split('；')[0]} 的资金安排如何？股东是否有增资或借款计划？`, why: '确认第二还款来源与额度合理性', refs: [RF('bs', 'cash'), RF('bs', 'stLoans')] }
    : { tag: '预测', q: `预测全年现金最低 ${fmtMoney(f.minCash)} 万（${f.minMonth}），高于安全线 ${f.safety} 万：明年资本开支与分红计划？富余资金是否会沉淀在本行？`, why: '评估存款与结算沉淀，判断授信必要性', refs: [RF('bs', 'cash'), RF('cf', 'capex')] });
  for (const q of P.qbank) { if (out.length >= 5) break; out.push({ ...q, tag: '行业' }); }
  if (out.length < 5) {
    const cand = ['debtRatio', 'arDays', 'invDays', 'interestCover', 'cfoToNi', 'grossMargin'];
    for (const id of cand) {
      if (out.length >= 5) break;
      const r = ratioById(id); const v = ratioValue(c, id, 2025); const b = bench[id];
      if (v === null || b === undefined) continue;
      const tol = r.unit === 'pct' ? 0.01 : r.unit === 'days' ? 3 : 0.05;
      const bad = r.better === 'high' ? v < b - tol : v > b + tol;
      if (!bad) continue;
      out.push({ tag: '指标', q: `${r.name} ${fmtRatio(v, r.unit)} 弱于同业中位 ${fmtRatio(b, r.unit)}：管理层如何解释？未来一年的改善目标与措施？`, why: '判断与同业差距是否结构性', refs: r.refs(2025) });
    }
  }
  while (out.length < 5) out.push({ tag: '行业', q: '主要客户与供应商的合同期限、结算方式与集中度？', why: '评估经营稳定性', refs: [RF('is', 'revenue')] });
  return out.slice(0, 5);
}

/* ------------------------------------------------------------------ AI 结论 */
export interface Conclusion { headline: string; points: string[]; evidence: string[]; confidence: number; tone: 'gold' | 'red' | 'green' }
export function genConclusion(co: Company, c: Computed, anomalies: Anomaly[], f: Forecast, score: QualityScore, val: Valuation, bench: BenchMap, ledgerBad: number): Conclusion {
  const trig = anomalies.filter((a) => a.triggered);
  const gm = (y: Year) => fmtRatio(ratioValue(c, 'grossMargin', y), 'pct');
  const dr = ratioValue(c, 'debtRatio', 2025) ?? 0; const cfoNi = ratioValue(c, 'cfoToNi', 2025);
  const rg = ratioValue(c, 'revGrowth', 2025) ?? 0;
  const tone: Conclusion['tone'] = trig.length >= 3 || score.total < 40 ? 'red' : trig.length > 0 || score.total < 60 ? 'gold' : 'green';
  const drTxt = `资产负债率 ${fmtRatio(dr, 'pct')}（同业 ${fmtRatio(bench.debtRatio, 'pct')}）`;
  const headline = tone === 'red'
    ? `${co.name}报表质量存疑：${trig.length} 条红字异常待核实（${trig.map((a) => a.title.split('：')[0].replace(/，.*$/, '')).slice(0, 2).join('、')}），建议先核实再谈授信，任何新增额度以改善现金回收为条件`
    : tone === 'gold'
      ? (trig.length > 0
        ? `${co.name}经营总体${rg >= 0 ? '增长' : '收缩'}，但有 ${trig.length} 条异常需在拜访中核实：${trig.map((a) => a.title.split('：')[0]).join('、')}；${f.gap > 0 ? `预测 ${f.gapQuarter} 资金缺口约 ${fmtMoney(f.gap)} 万` : '预测全年现金高于安全线'}`
        : `${co.name}三表勾稽自洽、无红字异常，但${score.dims.filter((d) => d.score < 50).map((d) => d.name).slice(0, 2).join('与') || '偿债与现金'}评分偏低（综合 ${score.total}）；${f.gap > 0 ? `预测 ${f.gapQuarter} 资金缺口约 ${fmtMoney(f.gap)} 万` : '预测全年现金高于安全线'}`)
      : `${co.name}三表勾稽自洽、无红字异常，${co.industry}指标${score.total >= 75 ? '优于' : '接近'}同业中位（评分 ${score.total}）；${f.gap > 0 ? `预测 ${f.gapQuarter} 有约 ${fmtMoney(f.gap)} 万季节性缺口，适合以短期流贷 / 结算产品切入` : '预测全年现金高于安全线，适合以结算、存款与非信贷产品切入'}`;
  const points = [
    `盈利：毛利率 ${gm(2023)} → ${gm(2025)}，2025 年净利润 ${fmtMoney(c.is.netProfit[2025])} 万，收入同比 ${fmtRatio(rg, 'pct')}`,
    `现金：经营现金流 ${fmtMoney(c.cf.cfo[2025])} 万，经营现金流 / 净利润 ${fmtRatio(cfoNi, 'x')}（同业 ${fmtRatio(bench.cfoToNi, 'x')}）`,
    `偿债：${drTxt}，流动比率 ${fmtRatio(ratioValue(c, 'currentRatio', 2025), 'x')}，利息保障 ${fmtRatio(ratioValue(c, 'interestCover', 2025), 'x')}`,
    val.equityHigh < 500
      ? `价值：EBITDA ${fmtMoney(val.ebitda)} 万，净债务 ${fmtMoney(val.netDebt)} 万已接近或覆盖企业价值，股权价值接近于零`
      : `价值：EBITDA ${fmtMoney(val.ebitda)} 万，股权价值区间约 ${(val.equityLow / 10000).toFixed(1)}–${(val.equityHigh / 10000).toFixed(1)} 亿，净债务 ${fmtMoney(val.netDebt)} 万`,
  ];
  const evidence = [`2023–2025 三表 · 勾稽 ${ledgerBad === 0 ? '全部成立' : `${ledgerBad} 项差额`}`, `红字规则 ${anomalies.length} 条 · 触发 ${trig.length}`, `${co.industry}同业中位数 · 公开数据估算`, `12 个月预测 · 最低现金 ${fmtMoney(f.minCash)} 万`];
  const confidence = Math.round(clamp(0.92 - trig.length * 0.04 - ledgerBad * 0.06, 0.62, 0.92) * 100) / 100;
  return { headline, points, evidence, confidence, tone };
}

/* ------------------------------------------------------------------ 会谈纪要模板 */
export function minutesTemplate(co: Company, owner: string, questions: Question[], concl: Conclusion): string {
  const lines = [
    `${co.name} · 财务诊断后拜访会谈纪要（模板）`,
    `时间：____年__月__日    地点：客户现场 / 视频    本行参加：${owner}    客户参加：财务负责人、实际控制人`,
    '',
    '一、诊断结论（AI 生成，需人工复核）',
    concl.headline,
    ...concl.points.map((p) => `  · ${p}`),
    '',
    '二、需向客户核实的问题与客户答复',
    ...questions.flatMap((q, i) => [`${i + 1}. ${q.q}`, `   目的：${q.why}`, '   客户答复：________________________________', '   佐证材料：________________________________']),
    '',
    '三、后续事项',
    '  · 补充材料清单：________________________________',
    '  · 下一步动作（授信 / 续贷 / 产品切入）：________________________________',
    '  · 责任人与时限：________________________________',
    '',
    `记录人：${owner}    复核人：________    AI 参与：结论与问题由系统生成，数字来自三表复算`,
  ];
  return lines.join('\n');
}
