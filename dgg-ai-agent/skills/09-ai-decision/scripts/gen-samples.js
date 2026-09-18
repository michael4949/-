// 生成三套样本：指标序列直接从 AI CFO 账套、AI ERP、AI获客、AI人力官、AI法务 的样本与内核结果里取；
// 只有各模块没有月度历史的指标（准时率、线索、在编、加班超限、合规敞口等）按当前值向前铺出 12 个月序列，末月与对应模块屏上的数一致。
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'data', 'samples');
const skills = path.join(__dirname, '..', '..');
const W = (n, o) => fs.writeFileSync(path.join(out, n), JSON.stringify(o, null, 2) + '\n');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const CFO = require(path.join(skills, '06-ai-cfo', 'core', 'fin.js')), cfoLib = require(path.join(skills, '06-ai-cfo', 'scripts', 'load-data.js'))();
const ERP = require(path.join(skills, '10-ai-erp', 'core', 'sim.js')), erpLib = require(path.join(skills, '10-ai-erp', 'scripts', 'load-data.js'))();
const LEAD = require(path.join(skills, '04-ai-lead', 'core', 'lead.js')), leadLib = require(path.join(skills, '04-ai-lead', 'scripts', 'load-data.js'))();
const HR = require(path.join(skills, '05-ai-hr', 'core', 'hr.js')), hrLib = require(path.join(skills, '05-ai-hr', 'scripts', 'load-data.js'))();
const LEGAL = require(path.join(skills, '07-ai-legal', 'core', 'legal.js')), legalLib = require(path.join(skills, '07-ai-legal', 'scripts', 'load-data.js'))();
const fmtW = (n) => (Math.round(n / 1000) / 10) + ' 万元';
// 把当前值向前铺成 12 个月：按给定的相对走势（最后一个为 1）
const back = (cur, shape, round) => shape.map((s) => round ? Math.round(cur * s) : Math.round(cur * s * 1000) / 1000);

function build(cfg) {
  const cfo = cfoLib.samples[cfg.arche], L = cfo.ledger, R6 = CFO.run(cfo, cfoLib);
  const erp = erpLib.samples[cfg.erpArche], S10 = ERP.schedule(erp), K10 = S10.kpi;
  const lead = leadLib.samples[cfg.arche], R4 = LEAD.run(lead, leadLib);
  const hr = hrLib.samples[cfg.arche], R5 = HR.run(hr, hrLib);
  const legal = legalLib.samples[cfg.arche], R7 = LEGAL.run(legal, legalLib);
  const months = L.months, n = months.length, last = n - 1;
  const D = L.pl.detail;
  const labor = D.prodLabor.map((x) => Math.round(x * (cfg.laborShare || 0.78)));   // 直接人工占生产工资的比例（其余为间接人工，计入制造费用）
  const overhead = L.pl.cogs.map((c, i) => c - D.material[i] - labor[i]);
  const deals = months.map((m) => lead.deals.filter((x) => x.closedAt.slice(0, 7) === m).length);
  const leadsMonth = lead.leads.filter((x) => x.createdAt.slice(0, 7) === months[last]).length;
  const hi = R7.contracts.filter((c) => c.level === 'high');
  const contractExposure = Math.round(hi.reduce((t, c) => t + (c.amount || 0), 0) * 0.05);
  const h05 = R5.compliance.items.filter((i) => i.id === 'H05')[0];
  const socialDeltaMonth = Math.round(hr.employees.reduce((t, e) => t + Math.max(0, e.wage - e.socialBase), 0) * hrLib.costParams.regions[hr.profile.province].socialEmployer);
  const complianceNow = R5.kpi.complianceImpact + contractExposure;
  const series = {
    rev: L.pl.rev, cogs: L.pl.cogs, material: D.material, prodLabor: D.prodLabor, labor: labor, overhead: overhead,
    sellExp: L.pl.sellExp, adminExp: L.pl.adminExp, rdExp: L.pl.rdExp, finExp: L.pl.finExp,
    orders: cfg.orders, ar: L.bs.ar.slice(-n), inventory: L.bs.inventory.slice(-n), ap: L.bs.ap.slice(-n), purchases: L.flows.purchases.slice(-n), cash: L.bs.cash.slice(-n),
    arOverdue: back(R6.kpi.arOverdue, cfg.shapes.arOverdue, true),
    onTimeRate: back(K10.onTimeRate / 100, cfg.shapes.onTimeRate), lateOrders: cfg.lateOrders.concat([K10.late]), load: cfg.load,
    leads: cfg.leads.concat([leadsMonth]), deals: deals, winRate: back(R4.kpi.conversion / 100, cfg.shapes.winRate),
    headcount: cfg.headcount.concat([R5.kpi.headcount]), turnover: back(R5.kpi.turnover / 100, cfg.shapes.turnover), overtimeOver: cfg.overtime.concat([R5.kpi.overtimeOver]),
    complianceExposure: back(complianceNow, cfg.shapes.compliance, true), highRiskContracts: cfg.highRisk.concat([hi.length])
  };
  Object.keys(series).forEach((k) => { if (series[k].length !== n) throw new Error(cfg.arche + ' 序列长度 ' + k + ' ' + series[k].length); });
  const facts = Object.assign({
    revMonth: L.pl.rev[last], cogsMonth: L.pl.cogs[last], cash: L.bs.cash[last], loanBalance: (L.bs.shortLoan ? L.bs.shortLoan[last] : 0) + (L.bs.longLoan ? L.bs.longLoan[last] : 0),
    socialDeltaMonth: socialDeltaMonth, socialExposure: h05 ? h05.impact : 0, socialExposureText: fmtW(h05 ? h05.impact : 0), contractExposure: contractExposure,
    arOverdue: fmtW(R6.kpi.arOverdue), lateOrders: K10.late, onTimeRate: K10.onTimeRate, lateDaysTotal: K10.lateDaysTotal, load: Math.round(cfg.load[last] * 100),
    dealsMonth: deals[last], leadsMonth: leadsMonth, ordersMonth: cfg.orders[last], leadOverdue: R4.kpi.overdue, leadUnassigned: R4.kpi.unassigned,
    leavers12: R5.org.leavers12, leaveReasons: R5.org.reasons.slice(0, 2).map((r) => r.label).join('与'), socialBaseRatio: R5.kpi.socialBaseRatio,
    highRiskContracts: hi.length, worstContract: hi.length ? hi[0].id + ' ' + hi[0].score + ' 分' : '—', rdStaff: cfo.profile.rdStaff || 0,
    cncOvertime: R5.kpi.overtimeOver, cncNeed: hr.needs[0].id, cncNeedCount: hr.needs[0].count, needJob: hrLib.jobs.jobs[hr.needs[0].job].title
  }, cfg.facts);
  return {
    archetype: cfg.arche, sector: cfg.sector, company: cfo.company, co: cfg.co, today: '2026-09-17', period: months[last], months: months, budgetYear: 2026,
    profile: cfg.profile, sources: cfg.sources,
    series, budget: cfg.budget, facts, decisions: cfg.decisions, approvals: [], log: []
  };
}
const M12 = (arr) => arr;

/* ---------------- 制造 · 杭州锐合 ---------------- */
W('mfg.json', build({
  arche: 'make', erpArche: 'make', sector: 'mfg', co: '锐合',
  profile: { industry: 'mfg-machinery', size: '101_300', province: '浙江', city: '杭州', product: '精密五金件与冲压件' },
  sources: [
    { id: 'm6', name: 'AI CFO · 账套三表与现金', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 12 }, { id: 'm10', name: 'AI ERP · 订单交付与物料', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 15 },
    { id: 'm4', name: 'AI获客 · 线索与成交', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 60 }, { id: 'm5', name: 'AI人力官 · 花名册与合规', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 168 },
    { id: 'm7', name: 'AI法务 · 合同与台账', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 12 }
  ],
  orders: M12([49, 51, 53, 51, 44, 38, 50, 52, 54, 51, 50, 49]),
  shapes: { arOverdue: [0.62, 0.66, 0.7, 0.7, 0.74, 0.78, 0.8, 0.84, 0.88, 0.9, 0.95, 1], onTimeRate: [1.275, 1.26, 1.245, 1.23, 1.215, 1.245, 1.2, 1.16, 1.13, 1.087, 1.043, 1], winRate: [0.9, 0.92, 0.93, 0.95, 0.95, 0.96, 0.97, 0.98, 0.99, 1.0, 1.0, 1], turnover: [0.88, 0.88, 0.9, 0.9, 0.92, 0.94, 0.94, 0.96, 0.96, 0.98, 1, 1], compliance: [0.84, 0.85, 0.86, 0.87, 0.88, 0.9, 0.91, 0.93, 0.95, 0.97, 0.99, 1] },
  lateOrders: [1, 1, 1, 2, 2, 1, 2, 3, 3, 3, 4], load: [0.78, 0.8, 0.82, 0.8, 0.72, 0.66, 0.84, 0.86, 0.88, 0.9, 0.91, 0.92],
  leads: [12, 14, 13, 11, 9, 8, 13, 15, 16, 14, 15], headcount: [162, 163, 164, 165, 166, 166, 167, 167, 168, 168, 168], overtime: [3, 3, 4, 4, 2, 2, 5, 6, 8, 9, 10], highRisk: [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3],
  budget: { rev: [4300000, 4400000, 4500000, 4400000, 4100000, 3800000, 4400000, 4600000, 4700000, 4600000, 4600000, 4500000], gm: 0.26, opex: 840000, onTimeRate: 0.9, ccc: 95, deals: 3, turnover: 0.15 },
  facts: { steelName: '冷轧钢带与不锈钢棒', materialPriceDelta: '−0.8%', frameworkContract: 'HT-2608-009', urgentPurchaseNote: '本月紧急采购 3 笔，均价高于框架价 6%', overheadNote: '8 月新增设备折旧 6,000 元 / 月，外协加工费 2.1 万元', orderMixNote: '本月 5,000 件以下小批量订单占 38%，上月 31%', k017Contract: 'HT-2609-018', k017Name: 'K-017 · 汽配一级供应商', k017TermDays: 120, priceReviewDate: '12-15', k017Overdue: '126 万元', sellExpNote: '展会与渠道投入较上月持平，销售费用 17.8 万元', adminExpNote: '8 月管理费用 47.7 万元，含一次性房租 4.5 万元', finExpNote: '8 月冲回利息收入 3.5 万元', inventoryNote: '存货 1,024 万元，较上月 +1.6%，原材料 518 万元', inventoryDiffNote: '账面存货比 ERP 库存多 6.2 万元', apNote: '应付 658 万元，账期 60 天，无逾期', oneOff: { adminExp: 45000 }, bottleneck: 'CNC 车铣中心', lossName: '工艺改善降低材料损耗', lossNote: '冲压排样优化与 CNC 余量收紧，损耗率目标从 6% 降到 4.5%' },
  decisions: [
    { id: 'D-2604-01', title: '冲压线 B 增开二班', cause: 'onTimeRate', option: '增开二班', owner: '生产负责人', approvedAt: '2026-04-18', status: 'done', invest: 45000, expected: '准时交付率三个月内回到 85%', milestones: [{ title: '招聘二班操作工 6 人', due: '2026-05-10', status: 'done' }, { title: '二班排产上线', due: '2026-05-20', status: 'done' }, { title: '复盘：准时率', due: '2026-08-15', status: 'done' }], tracking: { metric: 'onTimeRate', months: ['2026-05', '2026-06', '2026-07', '2026-08'], target: [0.82, 0.85, 0.85, 0.85], actual: [0.78, 0.75, 0.72, 0.69] }, review: { result: 'miss', text: '冲压产能缓解后瓶颈转移到 CNC 车铣中心，准时率未达标且继续下滑；教训是产能决策要看整条工艺路线的瓶颈，下一步解除 CNC 瓶颈', reviewedAt: '2026-08-15' } },
    { id: 'D-2606-02', title: '短贷 200 万元置换为一年期', cause: 'opex', option: '短贷置换与利息压降', owner: '财务负责人', approvedAt: '2026-06-12', status: 'executing', invest: 0, expected: '财务费用每月下降 3,000 元以上', milestones: [{ title: '银行审批与放款', due: '2026-07-05', status: 'done' }, { title: '原短贷归还', due: '2026-07-10', status: 'done' }, { title: '利率复核', due: '2026-10-15', status: 'doing' }, { title: '复盘：财务费用', due: '2026-12-15', status: 'todo' }], tracking: { metric: 'finExp', months: ['2026-07', '2026-08'], target: [22000, 19000], actual: [24900, -10100] }, review: null },
    { id: 'D-2607-03', title: '华南子公司设立', cause: 'orders', option: '华南就近仓储与加工', owner: '总经理', approvedAt: '2026-07-20', status: 'executing', invest: 5000000, expected: '华南客户交期缩短 5 天，年采购额再增 30%', milestones: [{ title: '设立方案确认（AI法务）', due: '2026-09-30', status: 'doing' }, { title: '名称申报与登记', due: '2026-10-20', status: 'todo' }, { title: '驻地销售到岗（AI人力官）', due: '2026-11-30', status: 'todo' }, { title: '复盘：华南订单', due: '2027-03-31', status: 'todo' }], tracking: null, review: null }
  ]
}));

/* ---------------- 贸易 · 义乌恒益 ---------------- */
W('trade.json', build({
  arche: 'flow', erpArche: 'flow', sector: 'trade', co: '恒益', laborShare: 0.5,
  profile: { industry: 'trade-wholesale', size: '51_100', province: '浙江', city: '义乌', product: '日用百货与进口日化的批发与电商零售' },
  sources: [
    { id: 'm6', name: 'AI CFO · 账套三表与现金', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 12 }, { id: 'm10', name: 'AI ERP · 订单履约与库存', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 15 },
    { id: 'm4', name: 'AI获客 · 线索与成交', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 31 }, { id: 'm5', name: 'AI人力官 · 花名册与合规', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 62 },
    { id: 'm7', name: 'AI法务 · 合同与台账', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 8 }
  ],
  orders: M12([1180, 1320, 1510, 1620, 1470, 860, 1160, 1250, 1300, 1350, 1290, 1240]),
  shapes: { arOverdue: [0.7, 0.72, 0.75, 0.8, 0.82, 0.85, 0.86, 0.88, 0.92, 0.95, 0.97, 1], onTimeRate: [1.12, 1.11, 1.1, 1.08, 1.08, 1.1, 1.07, 1.06, 1.05, 1.04, 1.02, 1], winRate: [0.9, 0.92, 0.94, 0.95, 0.95, 0.96, 0.97, 0.98, 0.99, 1.0, 1.0, 1], turnover: [0.9, 0.9, 0.92, 0.92, 0.94, 0.94, 0.96, 0.96, 0.98, 0.98, 1, 1], compliance: [0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98, 0.99, 1] },
  lateOrders: [2, 2, 3, 4, 3, 1, 2, 3, 3, 3, 3], load: [0.7, 0.74, 0.8, 0.86, 0.8, 0.5, 0.7, 0.74, 0.76, 0.8, 0.82, 0.84],
  leads: [9, 10, 12, 14, 12, 6, 9, 10, 11, 12, 11], headcount: [56, 57, 58, 60, 61, 60, 60, 61, 62, 62, 62], overtime: [2, 3, 5, 8, 6, 1, 2, 3, 3, 4, 5], highRisk: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  budget: { rev: [3200000, 3500000, 3900000, 4200000, 3800000, 2500000, 3200000, 3400000, 3500000, 3600000, 3500000, 3500000], gm: 0.19, opex: 380000, onTimeRate: 0.95, ccc: 60, deals: 3, turnover: 0.22 },
  facts: { steelName: '进口日化与纸品', materialPriceDelta: '+4.6%', frameworkContract: 'HT-2606-088', urgentPurchaseNote: '本月临时补货 5 笔，均价高于协议价 5%', overheadNote: '仓储租金与配送车辆折旧随中心仓扩容上升', orderMixNote: '社区团购小单占 46%，上月 40%', k017Contract: 'HT-2609-102', k017Name: 'K-102 · 连锁便利店总部', k017TermDays: 90, priceReviewDate: '11-30', k017Overdue: '58 万元', sellExpNote: '平台推广投放较上月增加 12%', adminExpNote: '管理费用含一次性新平台开店服务费 2 万元', finExpNote: '短贷 150 万元按月计息', inventoryNote: '存货 712 万元，进口日化占 41%', inventoryDiffNote: '账面存货与 WMS 差异 2.4 万元', apNote: '应付 422 万元，账期 45 天', oneOff: { adminExp: 20000 }, bottleneck: '分拣打包', lossName: '破损与退货损耗压降', lossNote: '包装与配送破损率从 1.8% 降到 1.2%，退货折价处置规范化' },
  decisions: [
    { id: 'D-2605-01', title: '中心仓扩容 1,000 ㎡', cause: 'onTimeRate', option: '仓储扩容', owner: '生产负责人', approvedAt: '2026-05-08', status: 'done', invest: 180000, expected: '大促期间次日达率不低于 95%', milestones: [{ title: '租赁与改造', due: '2026-06-15', status: 'done' }, { title: '货架与 WMS 上线', due: '2026-06-30', status: 'done' }, { title: '复盘：次日达率', due: '2026-08-15', status: 'done' }], tracking: { metric: 'onTimeRate', months: ['2026-06', '2026-07', '2026-08'], target: [0.93, 0.95, 0.95], actual: [0.9, 0.88, 0.86] }, review: { result: 'miss', text: '仓容不再是瓶颈，分拣打包人手成为新瓶颈，大促期加班超限；下一步补分拣人手并调整排班', reviewedAt: '2026-08-15' } },
    { id: 'D-2607-02', title: '华南分公司设立', cause: 'orders', option: '华南就近配送', owner: '总经理', approvedAt: '2026-07-22', status: 'executing', invest: 600000, expected: '华南门店配送时效缩短 2 天', milestones: [{ title: '设立方案确认（AI法务）', due: '2026-09-30', status: 'doing' }, { title: '分公司登记', due: '2026-10-25', status: 'todo' }, { title: '配送员到岗（AI人力官）', due: '2026-10-10', status: 'todo' }], tracking: null, review: null }
  ]
}));

/* ---------------- 服务 · 成都启元 ---------------- */
W('prof.json', build({
  arche: 'service', erpArche: 'service', sector: 'prof', co: '启元',
  profile: { industry: 'prof-accounting', size: '21_50', province: '四川', city: '成都', product: '代理记账、税务咨询与审计服务' },
  sources: [
    { id: 'm6', name: 'AI CFO · 账套三表与现金', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 12 }, { id: 'm10', name: 'AI ERP · 服务交付与工单', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 15 },
    { id: 'm4', name: 'AI获客 · 线索与成交', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 21 }, { id: 'm5', name: 'AI人力官 · 花名册与合规', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 46 },
    { id: 'm7', name: 'AI法务 · 合同与台账', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 8 }
  ],
  orders: M12([1080, 1090, 1100, 1120, 1140, 1130, 1140, 1150, 1160, 1170, 1170, 1180]),
  shapes: { arOverdue: [0.75, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.93, 0.96, 0.98, 1], onTimeRate: [1.08, 1.08, 1.07, 1.06, 1.05, 1.06, 1.05, 1.04, 1.03, 1.02, 1.01, 1], winRate: [0.92, 0.93, 0.94, 0.95, 0.96, 0.96, 0.97, 0.98, 0.99, 1.0, 1.0, 1], turnover: [0.86, 0.88, 0.88, 0.9, 0.92, 0.92, 0.94, 0.96, 0.98, 0.98, 1, 1], compliance: [0.82, 0.84, 0.85, 0.87, 0.88, 0.9, 0.92, 0.94, 0.96, 0.98, 0.99, 1] },
  lateOrders: [3, 3, 4, 5, 8, 2, 4, 6, 5, 4, 5], load: [0.8, 0.8, 0.82, 0.86, 0.94, 0.72, 0.84, 0.9, 0.9, 0.88, 0.9, 0.92],
  leads: [6, 7, 7, 8, 9, 5, 7, 8, 8, 8, 8], headcount: [41, 42, 42, 43, 44, 44, 45, 45, 46, 46, 46], overtime: [4, 4, 5, 6, 12, 2, 5, 8, 8, 7, 8], highRisk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  budget: { rev: [1300000, 1320000, 1340000, 1400000, 1600000, 1200000, 1400000, 1450000, 1500000, 1480000, 1450000, 1450000], gm: 0.46, opex: 480000, onTimeRate: 0.97, ccc: 45, deals: 3, turnover: 0.2 },
  facts: { steelName: '外购数据与软件工具', materialPriceDelta: '+6.0%', frameworkContract: 'HT-2603-172', urgentPurchaseNote: '申报期临时增购工具账号 8 个', overheadNote: '办公场地租金随高新分公司筹备增加', orderMixNote: '小微客户占 72%，上月 70%', k017Contract: 'HT-2609-211', k017Name: 'K-211 · 园区科技企业', k017TermDays: 60, priceReviewDate: '12-31', k017Overdue: '21 万元', sellExpNote: '园区活动与渠道返点较上月增加', adminExpNote: '管理费用含一次性分公司筹备开支 1.8 万元', finExpNote: '无借款，利息收入冲减', inventoryNote: '服务业无存货', inventoryDiffNote: '无', apNote: '应付 25 万元，主要为工具订阅', oneOff: { adminExp: 18000 }, bottleneck: '申报期作业', lossName: '工具与外购成本压降', lossNote: '外购数据与工具订阅按用量采购，人均工具成本下降' },
  decisions: [
    { id: 'D-2605-01', title: '代账流水线分班组作业', cause: 'onTimeRate', option: '流水线作业', owner: '生产负责人', approvedAt: '2026-05-12', status: 'done', invest: 30000, expected: '申报期按期完成率 97% 以上', milestones: [{ title: '四个班组与节点定义', due: '2026-06-01', status: 'done' }, { title: '系统流转上线', due: '2026-06-20', status: 'done' }, { title: '复盘：按期完成率', due: '2026-08-15', status: 'done' }], tracking: { metric: 'onTimeRate', months: ['2026-06', '2026-07', '2026-08'], target: [0.95, 0.97, 0.97], actual: [0.94, 0.93, 0.92] }, review: { result: 'miss', text: '流水线让节点清楚了，但人均 50 户以上、申报期加班超限，按期率仍下滑；下一步补代账会计并做高新分公司分流', reviewedAt: '2026-08-15' } },
    { id: 'D-2607-02', title: '高新分公司设立', cause: 'orders', option: '就近服务园区客户', owner: '总经理', approvedAt: '2026-07-25', status: 'executing', invest: 300000, expected: '园区客户续费率提升，新客每月 +2', milestones: [{ title: '设立方案确认（AI法务）', due: '2026-09-30', status: 'doing' }, { title: '分公司登记', due: '2026-10-30', status: 'todo' }, { title: '代账会计到岗（AI人力官）', due: '2026-10-25', status: 'todo' }], tracking: null, review: null }
  ]
}));
console.log('samples written: mfg / trade / prof');
