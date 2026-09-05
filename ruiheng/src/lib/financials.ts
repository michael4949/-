/// <reference types="vite/client" />
/**
 * 宁桂精密机械 2023–2025 三年三表（单位：万元）
 * 全部数据为虚构、手工编制且自洽：
 *   资产 = 负债 + 所有者权益；期末现金 = 期初 + 经营 + 投资 + 筹资；净利润由利润表逐行推导；
 *   现金流量表期末现金 = 资产负债表货币资金；未分配利润(t) = 未分配利润(t-1) + 净利润(t)。
 * 所有比率、异常与预测均由前端确定性计算，AI 仅生成解释文字。
 */

export type Year = 2023 | 2024 | 2025;
export const YEARS: readonly Year[] = [2023, 2024, 2025] as const;
export type StmtId = 'bs' | 'is' | 'cf';
export type YearMap = Record<Year, number>;

export interface RowDef {
  key: string;
  name: string;
  kind: 'input' | 'total';
  level?: 0 | 1;
  /** 其中项：只展示、不参与合计 */
  memo?: boolean;
  /** 分组标题，出现在该行之前 */
  section?: string;
  /** 合计行计算：v(key) 取同表同年数值 */
  calc?: (v: (k: string) => number) => number;
}
export interface StmtDef { id: StmtId; name: string; short: string; rows: RowDef[] }

export type Inputs = Record<StmtId, Record<string, YearMap>>;
export type Computed = Record<StmtId, Record<string, YearMap>>;

const sum = (v: (k: string) => number, keys: string[]) => keys.reduce((s, k) => s + v(k), 0);

export const STATEMENTS: StmtDef[] = [
  {
    id: 'bs', name: '资产负债表', short: '资产负债表',
    rows: [
      { key: 'cash', name: '货币资金', kind: 'input', section: '流动资产' },
      { key: 'notesRecv', name: '应收票据', kind: 'input' },
      { key: 'ar', name: '应收账款', kind: 'input' },
      { key: 'prepaid', name: '预付款项', kind: 'input' },
      { key: 'otherRecv', name: '其他应收款', kind: 'input' },
      { key: 'inventory', name: '存货', kind: 'input' },
      { key: 'currentAssets', name: '流动资产合计', kind: 'total', calc: (v) => sum(v, ['cash', 'notesRecv', 'ar', 'prepaid', 'otherRecv', 'inventory']) },
      { key: 'fixedAssets', name: '固定资产', kind: 'input', section: '非流动资产' },
      { key: 'cip', name: '在建工程', kind: 'input' },
      { key: 'intangible', name: '无形资产', kind: 'input' },
      { key: 'nonCurrentAssets', name: '非流动资产合计', kind: 'total', calc: (v) => sum(v, ['fixedAssets', 'cip', 'intangible']) },
      { key: 'totalAssets', name: '资产总计', kind: 'total', calc: (v) => v('currentAssets') + v('nonCurrentAssets') },
      { key: 'stLoans', name: '短期借款', kind: 'input', section: '流动负债' },
      { key: 'notesPay', name: '应付票据', kind: 'input' },
      { key: 'ap', name: '应付账款', kind: 'input' },
      { key: 'contractLiab', name: '合同负债', kind: 'input' },
      { key: 'payroll', name: '应付职工薪酬', kind: 'input' },
      { key: 'taxPay', name: '应交税费', kind: 'input' },
      { key: 'otherPay', name: '其他应付款', kind: 'input' },
      { key: 'currentLiab', name: '流动负债合计', kind: 'total', calc: (v) => sum(v, ['stLoans', 'notesPay', 'ap', 'contractLiab', 'payroll', 'taxPay', 'otherPay']) },
      { key: 'ltLoans', name: '长期借款', kind: 'input', section: '非流动负债' },
      { key: 'totalLiab', name: '负债合计', kind: 'total', calc: (v) => v('currentLiab') + v('ltLoans') },
      { key: 'paidIn', name: '实收资本', kind: 'input', section: '所有者权益' },
      { key: 'capReserve', name: '资本公积', kind: 'input' },
      { key: 'retained', name: '盈余公积及未分配利润', kind: 'input' },
      { key: 'equity', name: '所有者权益合计', kind: 'total', calc: (v) => sum(v, ['paidIn', 'capReserve', 'retained']) },
      { key: 'totalLE', name: '负债和所有者权益总计', kind: 'total', calc: (v) => v('totalLiab') + v('equity') },
    ],
  },
  {
    id: 'is', name: '利润表', short: '利润表',
    rows: [
      { key: 'revenue', name: '营业收入', kind: 'input' },
      { key: 'cogs', name: '营业成本', kind: 'input' },
      { key: 'taxSurcharge', name: '税金及附加', kind: 'input' },
      { key: 'selling', name: '销售费用', kind: 'input' },
      { key: 'admin', name: '管理费用', kind: 'input' },
      { key: 'rd', name: '研发费用', kind: 'input' },
      { key: 'finExp', name: '财务费用', kind: 'input' },
      { key: 'interest', name: '其中：利息费用', kind: 'input', level: 1, memo: true },
      { key: 'impairment', name: '信用减值损失', kind: 'input' },
      { key: 'opProfit', name: '营业利润', kind: 'total', calc: (v) => v('revenue') - sum(v, ['cogs', 'taxSurcharge', 'selling', 'admin', 'rd', 'finExp', 'impairment']) },
      { key: 'nonOp', name: '营业外收支净额', kind: 'input' },
      { key: 'ebt', name: '利润总额', kind: 'total', calc: (v) => v('opProfit') + v('nonOp') },
      { key: 'tax', name: '所得税费用', kind: 'input' },
      { key: 'netProfit', name: '净利润', kind: 'total', calc: (v) => v('ebt') - v('tax') },
    ],
  },
  {
    id: 'cf', name: '现金流量表', short: '现金流量表',
    rows: [
      { key: 'recvSales', name: '销售商品、提供劳务收到的现金', kind: 'input', section: '经营活动' },
      { key: 'paySupplier', name: '购买商品、接受劳务支付的现金', kind: 'input' },
      { key: 'payStaff', name: '支付给职工以及为职工支付的现金', kind: 'input' },
      { key: 'payTax', name: '支付的各项税费', kind: 'input' },
      { key: 'payOther', name: '支付其他与经营活动有关的现金', kind: 'input' },
      { key: 'cfo', name: '经营活动现金流量净额', kind: 'total', calc: (v) => v('recvSales') - sum(v, ['paySupplier', 'payStaff', 'payTax', 'payOther']) },
      { key: 'capex', name: '购建固定资产、无形资产支付的现金', kind: 'input', section: '投资活动' },
      { key: 'cfi', name: '投资活动现金流量净额', kind: 'total', calc: (v) => -v('capex') },
      { key: 'borrow', name: '取得借款收到的现金', kind: 'input', section: '筹资活动' },
      { key: 'repay', name: '偿还债务支付的现金', kind: 'input' },
      { key: 'payInterestDiv', name: '分配股利、利润或偿付利息支付的现金', kind: 'input' },
      { key: 'cff', name: '筹资活动现金流量净额', kind: 'total', calc: (v) => v('borrow') - v('repay') - v('payInterestDiv') },
      { key: 'netChange', name: '现金及现金等价物净增加额', kind: 'total', calc: (v) => v('cfo') + v('cfi') + v('cff') },
      { key: 'openCash', name: '期初现金及现金等价物余额', kind: 'input' },
      { key: 'endCash', name: '期末现金及现金等价物余额', kind: 'total', calc: (v) => v('openCash') + v('netChange') },
    ],
  },
];

export const stmtById = (id: StmtId) => STATEMENTS.find((s) => s.id === id)!;
export const rowDef = (stmt: StmtId, key: string) => stmtById(stmt).rows.find((r) => r.key === key);
export const rowName = (stmt: StmtId, key: string) => rowDef(stmt, key)?.name ?? key;

const ym = (a: number, b: number, c: number): YearMap => ({ 2023: a, 2024: b, 2025: c });

/** 基础输入（仅叶子科目；合计行由 compute 推导） */
export const BASE_INPUTS: Inputs = {
  bs: {
    cash: ym(2600, 1860, 1340),
    notesRecv: ym(1200, 1400, 1300),
    ar: ym(4720, 7125, 9956),
    prepaid: ym(450, 520, 610),
    otherRecv: ym(320, 480, 1900),
    inventory: ym(4270, 5420, 6650),
    fixedAssets: ym(9800, 10867, 11300),
    cip: ym(1200, 1400, 1700),
    intangible: ym(1600, 1550, 1500),
    stLoans: ym(4000, 6000, 8000),
    notesPay: ym(1500, 1900, 3100),
    ap: ym(3130, 3835, 4685),
    contractLiab: ym(600, 520, 480),
    payroll: ym(380, 420, 470),
    taxPay: ym(260, 210, 180),
    otherPay: ym(700, 780, 1674),
    ltLoans: ym(2300, 3100, 3600),
    paidIn: ym(8000, 8000, 8000),
    capReserve: ym(1200, 1200, 1200),
    retained: ym(4090, 4657, 4867),
  },
  is: {
    revenue: ym(25000, 28500, 32000),
    cogs: ym(20500, 23798, 27200),
    taxSurcharge: ym(120, 135, 150),
    selling: ym(700, 830, 960),
    admin: ym(1250, 1420, 1520),
    rd: ym(900, 1050, 1100),
    finExp: ym(380, 520, 680),
    interest: ym(400, 540, 720),
    impairment: ym(80, 160, 230),
    nonOp: ym(60, 80, 90),
    tax: ym(170, 100, 40),
  },
  cf: {
    recvSales: ym(27800, 29600, 33000),
    paySupplier: ym(21600, 24700, 26200),
    payStaff: ym(3200, 3700, 4100),
    payTax: ym(900, 1050, 1100),
    payOther: ym(600, 1350, 2400),
    capex: ym(2400, 1800, 1500),
    borrow: ym(5000, 6300, 7000),
    repay: ym(3200, 3500, 4500),
    payInterestDiv: ym(400, 540, 720),
    openCash: ym(2100, 2600, 1860),
  },
};

export function cloneInputs(i: Inputs): Inputs {
  const out = {} as Inputs;
  (Object.keys(i) as StmtId[]).forEach((s) => {
    out[s] = {};
    Object.keys(i[s]).forEach((k) => { out[s][k] = { ...i[s][k] }; });
  });
  return out;
}

/** 由叶子科目推导全部合计行 */
export function compute(inputs: Inputs): Computed {
  const out = {} as Computed;
  for (const st of STATEMENTS) {
    const table: Record<string, YearMap> = {};
    for (const y of YEARS) {
      const v = (k: string) => table[k]?.[y] ?? inputs[st.id][k]?.[y] ?? 0;
      for (const r of st.rows) {
        if (!table[r.key]) table[r.key] = { 2023: 0, 2024: 0, 2025: 0 };
        table[r.key][y] = r.kind === 'total' && r.calc ? r.calc(v) : inputs[st.id][r.key]?.[y] ?? 0;
      }
    }
    out[st.id] = table;
  }
  return out;
}

/* ------------------------------------------------------------------ 勾稽 */
export interface LedgerCheck { name: string; year: Year | '跨年'; lhs: number; rhs: number; ok: boolean }
export function checkLedger(c: Computed): LedgerCheck[] {
  const mk = (name: string, year: Year | '跨年', lhs: number, rhs: number): LedgerCheck => ({ name, year, lhs, rhs, ok: Math.abs(lhs - rhs) < 0.5 });
  const list: LedgerCheck[] = [];
  for (const y of YEARS) {
    list.push(mk('资产 = 负债 + 所有者权益', y, c.bs.totalAssets[y], c.bs.totalLE[y]));
    list.push(mk('期末现金 = 期初 + 经营 + 投资 + 筹资', y, c.cf.endCash[y], c.cf.openCash[y] + c.cf.cfo[y] + c.cf.cfi[y] + c.cf.cff[y]));
    list.push(mk('现金流量表期末现金 = 资产负债表货币资金', y, c.cf.endCash[y], c.bs.cash[y]));
    list.push(mk('净利润 = 利润总额 − 所得税', y, c.is.netProfit[y], c.is.ebt[y] - c.is.tax[y]));
  }
  list.push(mk('2024 期初现金 = 2023 期末现金', '跨年', c.cf.openCash[2024], c.cf.endCash[2023]));
  list.push(mk('2025 期初现金 = 2024 期末现金', '跨年', c.cf.openCash[2025], c.cf.endCash[2024]));
  list.push(mk('2024 未分配利润 = 2023 + 2024 净利润', '跨年', c.bs.retained[2024], c.bs.retained[2023] + c.is.netProfit[2024]));
  list.push(mk('2025 未分配利润 = 2024 + 2025 净利润', '跨年', c.bs.retained[2025], c.bs.retained[2024] + c.is.netProfit[2025]));
  return list;
}

/** 开发期断言：基础数据勾稽必须成立 */
export function verify(c: Computed = compute(BASE_INPUTS)): boolean {
  const checks = checkLedger(c);
  let ok = true;
  for (const ck of checks) {
    console.assert(ck.ok, `[financials] 勾稽失败 ${ck.year} ${ck.name}: ${ck.lhs} ≠ ${ck.rhs}`);
    ok = ok && ck.ok;
  }
  return ok;
}
if (import.meta.env?.DEV) verify();

/* ------------------------------------------------------------------ 比率 */
export interface Ref { stmt: StmtId; key: string; year: Year }
export type RatioUnit = 'pct' | 'x' | 'days';
export interface RatioDef {
  id: string; name: string; unit: RatioUnit; better: 'high' | 'low' | 'mid';
  formula: string; caliber: string;
  refs: (y: Year) => Ref[];
  calc: (c: Computed, y: Year) => number | null;
  /** 精密制造行业中位数（行业公开数据估算） */
  bench: number | null;
  group: '盈利' | '偿债' | '营运' | '现金' | '成长';
}
const R = (stmt: StmtId, key: string, year: Year): Ref => ({ stmt, key, year });
const prev = (y: Year): Year | null => (y === 2023 ? null : ((y - 1) as Year));
const growth = (c: Computed, stmt: StmtId, key: string, y: Year): number | null => {
  const p = prev(y); if (p === null) return null;
  const a = c[stmt][key][p]; return a === 0 ? null : c[stmt][key][y] / a - 1;
};
const safeDiv = (a: number, b: number) => (b === 0 ? null : a / b);

export const RATIOS: RatioDef[] = [
  { id: 'grossMargin', name: '毛利率', unit: 'pct', better: 'high', group: '盈利', bench: 0.22,
    formula: '(营业收入 − 营业成本) ÷ 营业收入',
    caliber: '当年发生额；营业收入为不含增值税口径',
    refs: (y) => [R('is', 'revenue', y), R('is', 'cogs', y)],
    calc: (c, y) => safeDiv(c.is.revenue[y] - c.is.cogs[y], c.is.revenue[y]) },
  { id: 'netMargin', name: '净利率', unit: 'pct', better: 'high', group: '盈利', bench: 0.06,
    formula: '净利润 ÷ 营业收入',
    caliber: '当年发生额；净利润为利润表推导值（利润总额 − 所得税费用）',
    refs: (y) => [R('is', 'netProfit', y), R('is', 'revenue', y)],
    calc: (c, y) => safeDiv(c.is.netProfit[y], c.is.revenue[y]) },
  { id: 'roe', name: '净资产收益率', unit: 'pct', better: 'high', group: '盈利', bench: 0.08,
    formula: '净利润 ÷ 所有者权益合计',
    caliber: '分母取期末数（非平均）；未剔除非经常性损益',
    refs: (y) => [R('is', 'netProfit', y), R('bs', 'equity', y)],
    calc: (c, y) => safeDiv(c.is.netProfit[y], c.bs.equity[y]) },
  { id: 'debtRatio', name: '资产负债率', unit: 'pct', better: 'low', group: '偿债', bench: 0.52,
    formula: '负债合计 ÷ 资产总计',
    caliber: '期末时点数；负债含合同负债与应付票据',
    refs: (y) => [R('bs', 'totalLiab', y), R('bs', 'totalAssets', y)],
    calc: (c, y) => safeDiv(c.bs.totalLiab[y], c.bs.totalAssets[y]) },
  { id: 'currentRatio', name: '流动比率', unit: 'x', better: 'high', group: '偿债', bench: 1.5,
    formula: '流动资产合计 ÷ 流动负债合计',
    caliber: '期末时点数',
    refs: (y) => [R('bs', 'currentAssets', y), R('bs', 'currentLiab', y)],
    calc: (c, y) => safeDiv(c.bs.currentAssets[y], c.bs.currentLiab[y]) },
  { id: 'quickRatio', name: '速动比率', unit: 'x', better: 'high', group: '偿债', bench: 1.1,
    formula: '(流动资产合计 − 存货) ÷ 流动负债合计',
    caliber: '期末时点数；未剔除预付款项与其他应收款（若剔除，2025 年将更低）',
    refs: (y) => [R('bs', 'currentAssets', y), R('bs', 'inventory', y), R('bs', 'currentLiab', y)],
    calc: (c, y) => safeDiv(c.bs.currentAssets[y] - c.bs.inventory[y], c.bs.currentLiab[y]) },
  { id: 'interestCover', name: '利息保障倍数', unit: 'x', better: 'high', group: '偿债', bench: 4.0,
    formula: '(利润总额 + 利息费用) ÷ 利息费用',
    caliber: 'EBIT 近似 = 利润总额 + 利息费用；利息费用取财务费用"其中"项，未含资本化利息',
    refs: (y) => [R('is', 'ebt', y), R('is', 'interest', y)],
    calc: (c, y) => safeDiv(c.is.ebt[y] + c.is.interest[y], c.is.interest[y]) },
  { id: 'arDays', name: '应收账款周转天数', unit: 'days', better: 'low', group: '营运', bench: 75,
    formula: '应收账款 ÷ 营业收入 × 360',
    caliber: '分子取期末余额（非平均）；应收账款为含税余额、营业收入不含税，未做价税调整（保守口径，天数略偏高）',
    refs: (y) => [R('bs', 'ar', y), R('is', 'revenue', y)],
    calc: (c, y) => { const d = safeDiv(c.bs.ar[y], c.is.revenue[y]); return d === null ? null : d * 360; } },
  { id: 'invDays', name: '存货周转天数', unit: 'days', better: 'low', group: '营运', bench: 70,
    formula: '存货 ÷ 营业成本 × 360',
    caliber: '分子取期末余额（非平均）；营业成本不含税',
    refs: (y) => [R('bs', 'inventory', y), R('is', 'cogs', y)],
    calc: (c, y) => { const d = safeDiv(c.bs.inventory[y], c.is.cogs[y]); return d === null ? null : d * 360; } },
  { id: 'apDays', name: '应付账款周转天数', unit: 'days', better: 'mid', group: '营运', bench: 60,
    formula: '应付账款 ÷ 营业成本 × 360',
    caliber: '分子取期末余额（非平均）；应付账款含税、营业成本不含税；未含应付票据（若含，2025 年约 103 天）',
    refs: (y) => [R('bs', 'ap', y), R('is', 'cogs', y)],
    calc: (c, y) => { const d = safeDiv(c.bs.ap[y], c.is.cogs[y]); return d === null ? null : d * 360; } },
  { id: 'cfoToNi', name: '经营现金流 / 净利润', unit: 'x', better: 'high', group: '现金', bench: 1.0,
    formula: '经营活动现金流量净额 ÷ 净利润',
    caliber: '当年发生额；净利润为正且经营现金流为负时倍数为负，表示"账面盈利、现金失血"',
    refs: (y) => [R('cf', 'cfo', y), R('is', 'netProfit', y)],
    calc: (c, y) => safeDiv(c.cf.cfo[y], c.is.netProfit[y]) },
  { id: 'cashCollect', name: '销售收现率', unit: 'pct', better: 'high', group: '现金', bench: 1.1,
    formula: '销售商品、提供劳务收到的现金 ÷ 营业收入',
    caliber: '分子含税、分母不含税；制造业正常区间约 105%–115%，低于 105% 通常意味着账期在拉长',
    refs: (y) => [R('cf', 'recvSales', y), R('is', 'revenue', y)],
    calc: (c, y) => safeDiv(c.cf.recvSales[y], c.is.revenue[y]) },
  { id: 'revGrowth', name: '营业收入增速', unit: 'pct', better: 'high', group: '成长', bench: 0.10,
    formula: '本年营业收入 ÷ 上年营业收入 − 1',
    caliber: '同比；2023 年无上年数据',
    refs: (y) => (prev(y) ? [R('is', 'revenue', y), R('is', 'revenue', prev(y)!)] : [R('is', 'revenue', y)]),
    calc: (c, y) => growth(c, 'is', 'revenue', y) },
  { id: 'arGrowth', name: '应收账款增速', unit: 'pct', better: 'low', group: '成长', bench: null,
    formula: '本年应收账款 ÷ 上年应收账款 − 1',
    caliber: '期末余额同比；与营业收入增速对照阅读',
    refs: (y) => (prev(y) ? [R('bs', 'ar', y), R('bs', 'ar', prev(y)!)] : [R('bs', 'ar', y)]),
    calc: (c, y) => growth(c, 'bs', 'ar', y) },
];
export const ratioById = (id: string) => RATIOS.find((r) => r.id === id)!;
export const ratioValue = (c: Computed, id: string, y: Year) => ratioById(id).calc(c, y);

export function fmtRatio(v: number | null, unit: RatioUnit, digits?: number): string {
  if (v === null || !Number.isFinite(v)) return '—';
  if (unit === 'pct') return `${(v * 100).toFixed(digits ?? 1)}%`;
  if (unit === 'days') return `${v.toFixed(digits ?? 0)} 天`;
  return `${v.toFixed(digits ?? 2)}×`;
}
export const fmtMoney = (n: number, digits = 0) => n.toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

/* ------------------------------------------------------------------ 红字异常 */
export interface Anomaly { id: string; title: string; detail: string; triggered: boolean; refs: Ref[]; ask: string }
export function detectAnomalies(c: Computed): Anomaly[] {
  const rg = growth(c, 'is', 'revenue', 2025) ?? 0;
  const ag = growth(c, 'bs', 'ar', 2025) ?? 0;
  const arDays = YEARS.map((y) => ratioValue(c, 'arDays', y) ?? 0);
  const orG = growth(c, 'bs', 'otherRecv', 2025);
  const orShare = safeDiv(c.bs.otherRecv[2025], c.bs.totalAssets[2025]) ?? 0;
  const p = (v: number) => `${(v * 100).toFixed(1)}%`;
  return [
    {
      id: 'ar-vs-rev', title: '应收账款增速远超收入增速', triggered: ag - rg > 0.15,
      detail: `2025 年应收账款同比 ${ag >= 0 ? '+' : ''}${p(ag)}，营业收入同比 ${rg >= 0 ? '+' : ''}${p(rg)}，差 ${((ag - rg) * 100).toFixed(1)} 个百分点；应收周转天数 ${arDays.map((d) => d.toFixed(0)).join(' → ')} 天。收入增长是用账期换来的。`,
      refs: [R('bs', 'ar', 2025), R('bs', 'ar', 2024), R('is', 'revenue', 2025), R('is', 'revenue', 2024)],
      ask: '前五大应收对象的账龄与合同账期条款',
    },
    {
      id: 'cfo-neg', title: '经营活动现金流连续两年为负', triggered: c.cf.cfo[2024] < 0 && c.cf.cfo[2025] < 0,
      detail: `经营活动现金流量净额 2024 年 ${fmtMoney(c.cf.cfo[2024])} 万、2025 年 ${fmtMoney(c.cf.cfo[2025])} 万，同期净利润为正（${fmtMoney(c.is.netProfit[2024])} / ${fmtMoney(c.is.netProfit[2025])} 万）；靠新增借款 ${fmtMoney(c.cf.borrow[2024] - c.cf.repay[2024])} / ${fmtMoney(c.cf.borrow[2025] - c.cf.repay[2025])} 万维持运转。`,
      refs: [R('cf', 'cfo', 2024), R('cf', 'cfo', 2025), R('is', 'netProfit', 2025)],
      ask: '若他行压降授信，日常周转靠什么',
    },
    {
      id: 'other-recv', title: '其他应收款突增，疑似关联方资金占用', triggered: (orG ?? 0) > 1 && orShare > 0.03,
      detail: `其他应收款 2024 年 ${fmtMoney(c.bs.otherRecv[2024])} 万 → 2025 年 ${fmtMoney(c.bs.otherRecv[2025])} 万（${orG === null ? '—' : `+${p(orG)}`}），占总资产 ${p(orShare)}；同期"支付其他与经营活动有关的现金" ${fmtMoney(c.cf.payOther[2025])} 万。需取得往来明细，核实是否为实控人或关联企业占用。`,
      refs: [R('bs', 'otherRecv', 2025), R('bs', 'otherRecv', 2024), R('cf', 'payOther', 2025)],
      ask: '其他应收款 1,900 万的对手方、用途与归还安排',
    },
  ];
}

/* ------------------------------------------------------------------ 12 个月现金流预测 */
export interface ForecastMonth { m: string; q: string; inflow: number; outflow: number; net: number; cash: number; event?: string }
export interface Forecast {
  months: ForecastMonth[]; minCash: number; minMonth: string; gapQuarter: string; safety: number; gap: number;
  growth: number; arLag: number; apLag: number; assumptions: string[];
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lagged = (series: number[], lag: number, opening: number) => series.map((_, i) => (i < lag ? opening / lag : series[i - lag]));

/**
 * 简化的月度直接法预测：以 2025 年报为基期，叠加定点项目 SOP 排产（Q2 备货）、专用模具投入与他行压降。
 * 所有系数确定性给定，随报表编辑实时重算。
 */
export function forecastCash(c: Computed, growth = 0.15): Forecast {
  const y: Year = 2025;
  const rev = c.is.revenue[y] * (1 + growth) / 12;
  const season = [0.80, 0.78, 0.92, 1.02, 1.08, 1.16, 1.06, 1.02, 1.06, 1.06, 1.04, 1.00];
  const build = [1.00, 1.00, 1.10, 1.24, 1.26, 1.14, 1.00, 1.00, 1.00, 1.00, 0.95, 0.95];
  const capex = [0, 0, 300, 600, 600, 300, 0, 0, 0, 0, 0, 0];
  const debtDue = [0, 0, 0, 0, 2000, 0, 0, 0, 0, 0, 0, 0];
  const events: Record<number, string> = { 2: '定点项目模具投入启动', 3: 'SOP 备货高峰', 4: '他行 2,000 万流贷到期不续', 5: 'SOP 首批交付', 8: '首批定点应收回款' };
  const arDays = ratioValue(c, 'arDays', y) ?? 90;
  const apDays = ratioValue(c, 'apDays', y) ?? 60;
  const arLag = clamp(Math.round(arDays / 30), 1, 4);
  const apLag = clamp(Math.round(apDays / 30), 1, 3);
  const cogsRatio = safeDiv(c.is.cogs[y], c.is.revenue[y]) ?? 0.85;
  const sales = season.map((s) => rev * s);
  const collections = lagged(sales, arLag, c.bs.ar[y] * 0.92);
  const purchases = sales.map((s, i) => s * cogsRatio * build[i]);
  const payments = lagged(purchases, apLag, c.bs.ap[y]);
  const opex = (c.is.selling[y] + c.is.admin[y] + c.is.rd[y] + c.is.taxSurcharge[y] + c.is.tax[y]) / 12 * (1 + growth * 0.6);
  const interest = (c.is.interest[y] / 12) * ((c.bs.stLoans[y] + c.bs.ltLoans[y]) / Math.max(1, c.bs.stLoans[2024] + c.bs.ltLoans[2024]));
  const safety = 600;
  let cash = c.bs.cash[y];
  let minCash = cash; let minIdx = 0;
  const months: ForecastMonth[] = season.map((_, i) => {
    const inflow = collections[i];
    const outflow = payments[i] + opex + interest + capex[i] + debtDue[i];
    const net = inflow - outflow;
    cash += net;
    if (cash < minCash) { minCash = cash; minIdx = i; }
    return { m: `${i + 1}月`, q: `Q${Math.floor(i / 3) + 1}`, inflow: Math.round(inflow), outflow: Math.round(outflow), net: Math.round(net), cash: Math.round(cash), event: events[i] };
  });
  return {
    months, minCash: Math.round(minCash), minMonth: months[minIdx].m, gapQuarter: months[minIdx].q, safety,
    gap: Math.max(0, Math.round(safety - minCash)), growth, arLag, apLag,
    assumptions: [
      `销售：2025 年营业收入 × (1 + ${(growth * 100).toFixed(0)}%) 按 SOP 排产季节分布`,
      `回款：按应收周转天数 ${arDays.toFixed(0)} 天 ≈ 滞后 ${arLag} 个月；期初应收按 92% 分期收回`,
      `付款：采购 = 销售 × 成本率 ${(cogsRatio * 100).toFixed(1)}% × Q2 备货系数；按应付周转 ${apDays.toFixed(0)} 天 ≈ 滞后 ${apLag} 个月`,
      `刚性支出：模具 1,800 万（3–6 月）；他行 2,000 万流贷 5 月到期拟不续；最低安全现金 ${safety} 万`,
    ],
  };
}

/* ------------------------------------------------------------------ 经营质量评分 */
export interface ScoreDim { name: string; score: number; note: string }
export interface QualityScore { total: number; grade: string; dims: ScoreDim[] }
const scoreVs = (v: number | null, bench: number, better: 'high' | 'low', span: number) => {
  if (v === null || !Number.isFinite(v)) return 0;
  const d = better === 'high' ? (v - bench) / span : (bench - v) / span;
  return Math.round(clamp(60 + d * 40, 0, 100));
};
export function qualityScore(c: Computed): QualityScore {
  const y: Year = 2025;
  const v = (id: string) => ratioValue(c, id, y);
  const an = detectAnomalies(c).filter((a) => a.triggered).length;
  const dims: ScoreDim[] = [
    { name: '盈利能力', score: Math.round((scoreVs(v('grossMargin'), 0.22, 'high', 0.08) + scoreVs(v('netMargin'), 0.06, 'high', 0.05)) / 2), note: '毛利率、净利率 vs 行业中位数' },
    { name: '营运效率', score: Math.round((scoreVs(v('arDays'), 75, 'low', 40) + scoreVs(v('invDays'), 70, 'low', 30)) / 2), note: '应收、存货周转天数' },
    { name: '偿债能力', score: Math.round((scoreVs(v('debtRatio'), 0.52, 'low', 0.15) + scoreVs(v('currentRatio'), 1.5, 'high', 0.5) + scoreVs(v('interestCover'), 4, 'high', 3)) / 3), note: '资产负债率、流动比率、利息保障' },
    { name: '现金质量', score: Math.round((scoreVs(v('cfoToNi'), 1, 'high', 2) + scoreVs(v('cashCollect'), 1.1, 'high', 0.1)) / 2), note: '经营现金流/净利润、销售收现率' },
    { name: '成长性', score: scoreVs(v('revGrowth'), 0.1, 'high', 0.15), note: '营业收入增速' },
    { name: '报表可信度', score: clamp(100 - an * 25, 0, 100), note: `${an} 条红字异常待核实` },
  ];
  const weights = [0.2, 0.2, 0.2, 0.2, 0.1, 0.1];
  const total = Math.round(dims.reduce((s, d, i) => s + d.score * weights[i], 0));
  const grade = total >= 80 ? 'A · 优良' : total >= 65 ? 'B · 稳健' : total >= 50 ? 'C · 关注' : 'D · 预警';
  return { total, grade, dims };
}

/* ------------------------------------------------------------------ 企业价值区间 */
export interface Valuation { ebitda: number; evLow: number; evHigh: number; evSalesLow: number; evSalesHigh: number; netDebt: number; equityLow: number; equityHigh: number }
export function valuation(c: Computed): Valuation {
  const y: Year = 2025;
  const da = c.bs.fixedAssets[y] * 0.09 + c.bs.intangible[y] * 0.05;
  const ebitda = c.is.ebt[y] + c.is.interest[y] + da;
  const evLow = ebitda * 5, evHigh = ebitda * 7;
  const evSalesLow = c.is.revenue[y] * 0.35, evSalesHigh = c.is.revenue[y] * 0.5;
  const netDebt = c.bs.stLoans[y] + c.bs.ltLoans[y] - c.bs.cash[y];
  const lo = Math.min(evLow, evSalesLow), hi = Math.max(evHigh, evSalesHigh);
  return { ebitda, evLow, evHigh, evSalesLow, evSalesHigh, netDebt, equityLow: Math.max(0, lo - netDebt), equityHigh: Math.max(0, hi - netDebt) };
}

/* ------------------------------------------------------------------ 同业对标（固定表） */
export const BENCHMARK_NOTE = '精密制造（汽车零部件）行业中位数 · 行业公开数据估算，非本行内评口径';
export const BENCHMARK_IDS = ['grossMargin', 'netMargin', 'debtRatio', 'currentRatio', 'quickRatio', 'arDays', 'invDays', 'apDays', 'cfoToNi', 'interestCover'];

/* ------------------------------------------------------------------ 你该问客户的 5 个问题（AI 生成文字） */
export function questionsToAsk(c: Computed, f: Forecast): { q: string; why: string; refs: Ref[] }[] {
  const arDays = YEARS.map((y) => (ratioValue(c, 'arDays', y) ?? 0).toFixed(0));
  const gm = YEARS.map((y) => ((ratioValue(c, 'grossMargin', y) ?? 0) * 100).toFixed(1));
  return [
    { q: `其他应收款年末 ${fmtMoney(c.bs.otherRecv[2025])} 万的对手方是谁？是否为实控人或关联企业占用？归还时间表？`, why: '决定是否作为放款前置条件', refs: [R('bs', 'otherRecv', 2025)] },
    { q: `应收周转从 ${arDays[0]} 天拉长到 ${arDays[2]} 天：是主机厂账期延长，还是存在已发货未验收 / 争议货款？前五大应收对象账龄？`, why: '判断收入质量与应收质押可行性', refs: [R('bs', 'ar', 2025), R('is', 'revenue', 2025)] },
    { q: `经营现金流连续两年为负而收入增长 ${(((c.is.revenue[2025] / c.is.revenue[2023]) - 1) * 100).toFixed(0)}%：定点项目 SOP 后的结算条款（账期 / 票据比例）是什么？`, why: '预测回款节奏、设定受托支付', refs: [R('cf', 'cfo', 2025), R('cf', 'cfo', 2024)] },
    { q: `毛利率 ${gm[0]}% → ${gm[2]}%：是铝材涨价、良品率还是主机厂年降？有无价格联动机制？`, why: '判断盈利下滑是否可逆', refs: [R('is', 'cogs', 2025), R('is', 'revenue', 2025)] },
    { q: `预测 ${f.gapQuarter}（${f.minMonth}）资金缺口约 ${fmtMoney(f.gap)} 万：他行 2,000 万到期是否续贷？股东是否有增资或借款计划？`, why: '确认第二还款来源与额度合理性', refs: [R('bs', 'stLoans', 2025), R('bs', 'cash', 2025)] },
  ];
}
