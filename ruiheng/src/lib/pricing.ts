/**
 * 定价 / 额度 / 集中度 —— 全部为确定性示例函数（示例参数，非行内真实参数）。
 * 单位约定：金额「亿」用于额度展示，「万」用于收益与成本计算；比率用百分数（%）。
 */
export const LPR_1Y = 3.0; // 示例：1 年期 LPR（%）
export const LPR_5Y = 3.5; // 示例：5 年期以上 LPR（%）

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round = (v: number, d = 0) => { const p = 10 ** d; return Math.round(v * p) / p; };

/* ---------------- 供应链保理：核心企业确权比例 → 额度 / 收益 ---------------- */
export interface FactoringPlan {
  ratio: number;        // 核心企业确权比例 0..1
  confirmed: number;    // 确权部分（明保理·无追索）可用额度（亿）
  unconfirmed: number;  // 未确权部分（暗保理·有追索，按 35% 折算）可用额度（亿）
  limit: number;        // 保理可用额度合计（亿）
  spreadBp: number;     // 加权加点（bp）
  blendedPd: number;    // 组合 PD（小数）
  balance: number;      // 预计日均余额（万，按 70% 用信）
  el: number;           // 预期损失（万/年）
  income: number;       // 保理条线综合收益（万/年）
}
export function factoringPlan(ratio: number, cap = 1.2): FactoringPlan {
  const r = clamp(ratio, 0, 1);
  const confirmed = cap * r;
  const unconfirmed = cap * (1 - r) * 0.35;
  const limit = confirmed + unconfirmed;
  const w = limit > 0 ? confirmed / limit : 0;
  const spreadBp = Math.round(85 * w + 160 * (1 - w));
  const blendedPd = 0.012 * w + 0.035 * (1 - w);
  const balance = limit * 0.7 * 10000;
  const rate = (LPR_1Y + spreadBp / 100) / 100;
  const ftp = 0.0235;           // 内部资金转移价格
  const fee = 0.003;            // 保理手续费率
  const derived = 0.15 * 0.016; // 派生存款沉淀 15% × 存款利差 1.6%
  const lgd = 0.45;
  const el = balance * blendedPd * lgd;
  const income = balance * (rate - ftp + fee + derived) - el;
  return { ratio: r, confirmed: round(confirmed, 3), unconfirmed: round(unconfirmed, 3), limit: round(limit, 3), spreadBp, blendedPd, balance: round(balance), el: round(el), income: round(income) };
}

/** 统一授信方案中其他条线的示例年收益（万），与保理收益相加得到方案综合收益 */
export const PACKAGE_BASE_INCOME = {
  bankAcceptance: 53, // 银承 1 亿：手续费 + 30% 保证金存款利差
  fixedAsset: 46,     // 固定资产贷款 0.8 亿：LPR5Y+30bp − FTP − EL
  intl: 38,           // 付汇 + 远期购汇锁汇：结售汇价差与手续费
  deposit: 96,        // 3 家未开户子公司存款潜力 1.2 亿 × 沉淀 50% × 1.6%
};
export const packageIncome = (f: FactoringPlan) =>
  Object.values(PACKAGE_BASE_INCOME).reduce((a, b) => a + b, 0) + f.income;

/* ---------------- RAROC 定价（LPR + bp） ---------------- */
export interface RarocInput {
  amount: number;        // 授信金额（亿）
  lpr: number;           // LPR（%）
  bp: number;            // 加点（bp）
  ftp: number;           // FTP（%）
  opex: number;          // 运营成本率（%）
  pd: number;            // 违约概率（%）
  lgd: number;           // 违约损失率（%）
  capitalRatio: number;  // 经济资本占用率（%）
  capitalCost: number;   // 资本成本率（%）
  targetMargin: number;  // 目标利润率（%）
  deposit: number;       // 综合贡献：派生存款（万）
  depositSpread: number; // 存款利差（%）
  settlementFee: number; // 综合贡献：结算与中收（万/年）
  intlIncome: number;    // 综合贡献：国际业务收益（万/年）
  hurdle: number;        // 行内 RAROC 门槛（%）
}
export interface RarocOutput {
  ead: number; rate: number; interest: number; ftpCost: number; nii: number; opexCost: number;
  el: number; ec: number; ecCost: number; targetProfit: number; contribution: number;
  netProfit: number; raroc: number; pass: boolean; breakevenBp: number; eva: number;
}
export const DEFAULT_RAROC: RarocInput = {
  amount: 3.0, lpr: LPR_1Y, bp: 45, ftp: 2.35, opex: 0.35, pd: 1.2, lgd: 45,
  capitalRatio: 8, capitalCost: 12, targetMargin: 0.3, deposit: 12000, depositSpread: 1.6,
  settlementFee: 85, intlIncome: 60, hurdle: 15,
};
export function raroc(i: RarocInput): RarocOutput {
  const ead = i.amount * 10000;
  const rate = i.lpr + i.bp / 100;
  const interest = ead * rate / 100;
  const ftpCost = ead * i.ftp / 100;
  const nii = interest - ftpCost;
  const opexCost = ead * i.opex / 100;
  const el = ead * (i.pd / 100) * (i.lgd / 100);
  const ec = ead * i.capitalRatio / 100;
  const ecCost = ec * i.capitalCost / 100;
  const targetProfit = ead * i.targetMargin / 100;
  const contribution = i.deposit * i.depositSpread / 100 + i.settlementFee + i.intlIncome;
  const netProfit = nii + contribution - opexCost - el;
  const rarocPct = ec > 0 ? netProfit / ec * 100 : 0;
  const breakevenBp = Math.round(((ftpCost + opexCost + el + ecCost + targetProfit - contribution) / ead * 100 - i.lpr) * 100);
  return {
    ead, rate: round(rate, 2), interest: round(interest), ftpCost: round(ftpCost), nii: round(nii), opexCost: round(opexCost),
    el: round(el), ec: round(ec), ecCost: round(ecCost), targetProfit: round(targetProfit), contribution: round(contribution),
    netProfit: round(netProfit), raroc: round(rarocPct, 1), pass: rarocPct >= i.hurdle, breakevenBp, eva: round(netProfit - ecCost),
  };
}

/* ---------------- 单一集团客户集中度 ---------------- */
export interface Concentration { limit: number; existing: number; guarantee: number; proposed: number; total: number; pct: number; headroom: number }
export function concentration(existing = 0.2, guarantee = 0.05, proposed = 3.0, tier1Capital = 40, limitRatio = 0.15): Concentration {
  const limit = tier1Capital * limitRatio;
  const total = existing + guarantee + proposed;
  return { limit: round(limit, 2), existing, guarantee, proposed, total: round(total, 2), pct: round(total / limit * 100, 1), headroom: round(limit - total, 2) };
}

export const fmtWan = (n: number) => `${Math.round(n).toLocaleString('zh-CN')} 万`;
export const fmtYi = (n: number, d = 2) => `${n.toFixed(d)} 亿`;
