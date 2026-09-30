// 生成三套账套样本（制造主样本沿用 AI ERP 的杭州锐合；贸易与服务为变体）
// 账套由驱动参数推出：收入序列 × 毛利率 → 成本；应收 / 存货 / 应付按目标路径反推回款、采购、付款；
// 现金按各项流量累计；未分配利润按净利润累计——所以三表天然平衡。
// 五处勾稽异常做在「外部来源」与账面的差异上：银行流水、ERP 库存、发票数据、固定资产台账、租赁合同。
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'data', 'samples');
const W = (n, o) => fs.writeFileSync(path.join(out, n), JSON.stringify(o, null, 2) + '\n');
const r0 = (n) => Math.round(n);
const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];

function build(p) {
  const n = 12, vat = p.vatRate;
  const rev = p.rev, gm = p.gm;
  const cogs = rev.map((r, i) => r0(r * (1 - gm[i])));
  const sellExp = rev.map((r, i) => r0(r * p.sellRate + p.sellFixed));
  const rent = months.map(() => p.rent);
  const rentBooked = rent.slice(); rentBooked[11] += p.anomalies.rentPrepaid;      // 异常 5：下月租金预付计入本期费用
  const entertain = rev.map((r, i) => r0(r * p.entertainRate[i]));
  const dep = p.depSeries.slice();                                                  // 账面折旧（异常 4：新增设备未启用折旧）
  const wages = p.wages;
  const social = wages.map((w) => r0(w * p.socialBaseRatio * p.socialRate));
  const adminOther = rev.map((r) => r0(r * p.adminRate));
  const adminExp = months.map((_, i) => rentBooked[i] + entertain[i] + adminOther[i] + r0(wages[i] * p.adminWageShare) + r0(social[i] * p.adminWageShare) + r0(dep[i] * 0.2));
  const rdExp = rev.map((r, i) => r0(r * p.rdRate) + r0((wages[i] + social[i]) * p.rdWageShare));
  const interest = months.map(() => r0(p.shortLoan * p.shortRate / 12 + p.longLoan * p.longRate / 12));
  const fees = months.map(() => p.bankFees);
  const finExp = months.map((_, i) => interest[i] + fees[i]);
  finExp[11] -= p.anomalies.bankFeesUnbooked;                                       // 异常 2：本月银行手续费未入账
  const otherIncome = p.otherIncome;
  const taxSurcharge = rev.map((r) => r0(r * p.surchargeRate));
  const ebt = months.map((_, i) => rev[i] - cogs[i] - sellExp[i] - adminExp[i] - rdExp[i] - finExp[i] - taxSurcharge[i] + otherIncome[i]);
  const incomeTax = ebt.map((e) => r0(Math.max(0, e) * p.citRate));
  const netProfit = ebt.map((e, i) => e - incomeTax[i]);
  // 资产负债路径
  const ar = [p.ar0].concat(p.arPath), inv = [p.inv0].concat(p.invPath), ap = [p.ap0].concat(p.apPath);
  ar[12] += p.anomalies.collectionUnbooked;                                          // 异常 1：银行已到账回款未冲应收
  const collectionsBank = months.map((_, i) => r0(ar[i] + rev[i] * (1 + vat) - (i === 11 ? ar[12] - p.anomalies.collectionUnbooked : ar[i + 1])));
  const collectionsLedger = collectionsBank.slice(); collectionsLedger[11] -= p.anomalies.collectionUnbooked;
  // 销售成本 = 材料采购 + 生产人工（工资社保中管理与研发以外的部分）+ 折旧的 80%；材料采购按存货路径反推
  const prodLabor = months.map((_, i) => r0((wages[i] + social[i]) * (1 - p.adminWageShare - p.rdWageShare)));
  const purchases = months.map((_, i) => r0(cogs[i] + inv[i + 1] - inv[i] - dep[i] * 0.8 - prodLabor[i]));
  const paymentsBank = months.map((_, i) => r0(ap[i] + purchases[i] * (1 + vat) - ap[i + 1]));
  const prepaid = new Array(13).fill(p.prepaid0);      // 异常 5 的账面做法是预付租金直接进了费用，预付账款没有变化
  const wagesPayable = [p.wagesPayable0].concat(wages.map((w, i) => w + social[i]));           // 月末应付本月工资社保，次月 10 日发
  const wagesPaid = months.map((_, i) => wagesPayable[i]);
  const vatPayable = months.map((_, i) => r0(rev[i] * vat - purchases[i] * vat * p.inputVatShare));
  const taxesPayable = [p.taxesPayable0].concat(months.map((_, i) => vatPayable[i] + taxSurcharge[i] + incomeTax[i]));
  const taxPaid = months.map((_, i) => taxesPayable[i]);
  const capex = p.capex, loanDraw = p.loanDraw, loanRepay = p.loanRepay, dividends = p.dividends;
  const fixedGross = [p.fixedGross0]; capex.forEach((c) => fixedGross.push(fixedGross[fixedGross.length - 1] + c));
  const accumDep = [p.accumDep0]; dep.forEach((d) => accumDep.push(accumDep[accumDep.length - 1] + d));
  const shortLoan = [p.shortLoan], longLoan = [p.longLoan];
  months.forEach((_, i) => { shortLoan.push(shortLoan[i] + loanDraw[i] - loanRepay[i]); longLoan.push(longLoan[i]); });
  const opexCash = months.map((_, i) => sellExp[i] + (adminExp[i] - rentBooked[i] - r0(wages[i] * p.adminWageShare) - r0(social[i] * p.adminWageShare) - r0(dep[i] * 0.2)) + rentBooked[i] + (rdExp[i] - r0((wages[i] + social[i]) * p.rdWageShare)));
  const cashLedger = [p.cash0];
  months.forEach((_, i) => {
    const c = cashLedger[i] + collectionsLedger[i] - paymentsBank[i] - wagesPaid[i] - taxPaid[i] - opexCash[i] - finExp[i] + otherIncome[i] - capex[i] + loanDraw[i] - loanRepay[i] - dividends[i];
    cashLedger.push(r0(c));
  });
  const bankBalance = cashLedger.map((c, i) => c + (i === 12 ? p.anomalies.collectionUnbooked - p.anomalies.bankFeesUnbooked : 0));
  const paidIn = p.paidIn;
  const retained = [p.retained0]; netProfit.forEach((np, i) => retained.push(retained[i] + np - dividends[i]));
  // 资产负债表平衡校验：期初权益按期初资产负债反推，之后按流量累计天然平衡
  const assets = (i) => cashLedger[i] + ar[i] + inv[i] + prepaid[i] + fixedGross[i] - accumDep[i];
  const liab = (i) => ap[i] + wagesPayable[i] + taxesPayable[i] + shortLoan[i] + longLoan[i];
  const eq0 = assets(0) - liab(0);
  retained[0] = eq0 - paidIn; for (let i = 1; i <= 12; i++) retained[i] = retained[i - 1] + netProfit[i - 1] - dividends[i - 1];
  const ledger = {
    months, pl: { rev, cogs, sellExp, adminExp, rdExp, finExp, otherIncome, taxSurcharge, incomeTax, detail: { rent: rentBooked, entertain, dep, interest, fees: fees.map((f, i) => i === 11 ? f - p.anomalies.bankFeesUnbooked : f), wages, social, prodLabor, material: purchases } },
    bs: { cash: cashLedger, ar, inventory: inv, prepaid, fixedGross, accumDep, ap, wagesPayable, taxesPayable, shortLoan, longLoan, paidIn: months.map(() => paidIn).concat([paidIn]), retained },
    flows: { collections: collectionsLedger, purchases, payments: paymentsBank, wagesPaid, taxPaid, opexCash, capex, loanDraw, loanRepay, dividends, vatPayable }
  };
  const external = {
    bank: { collections: collectionsBank, payments: paymentsBank, fees: fees, balance: bankBalance, unmatched: p.bankUnmatched },
    erp: { inventoryValue: inv.map((v, i) => i === 12 ? v - p.anomalies.inventoryGap : v), inventoryByCat: p.inventoryByCat, purchases },
    invoice: { salesInvoiced: rev.map((r, i) => i === 11 ? r - p.anomalies.uninvoiced : r), uninvoicedItems: p.uninvoicedItems, inputVat: purchases.map((q) => r0(q * vat * p.inputVatShare)), vatCredit: 0 },
    assetRegister: p.assetRegister,
    contracts: { rentMonthly: p.rent, rentVouchers: p.rentVouchers },
    payroll: { gross: wages, social, socialBase: wages.map((w) => r0(w * p.socialBaseRatio)), headcount: p.headcount },
    loans: p.loans
  };
  return { ledger, external };
}

// ---------- 制造主样本：杭州锐合精密五金 ----------
const mfg = {
  archetype: 'make', sector: 'mfg', company: '杭州锐合精密五金有限公司', period: '2026-08', today: '2026-09-17', vatRate: 0.13, citRate: 0.25,
  profile: { industry: 'mfg-machinery', size: '101_300', employees: 168, rdStaff: 19, province: '浙江', highTech: false, exportRev12: 0, unionFee12: 118000, insuredStable: true, trainingCert: 0 },
  sources: [
    { id: 'finance', name: '财务软件 · 科目余额与凭证', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 1284 },
    { id: 'bank', name: '银行流水 · 3 个账户', mode: 'import', lastSync: '2026-09-17 07:00', rows: 412 },
    { id: 'invoice', name: '发票数据 · 进销项', mode: 'direct', lastSync: '2026-09-16 23:30', rows: 356 },
    { id: 'erp', name: 'ERP · 库存 / 应收应付 / 订单', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 620 },
    { id: 'payroll', name: '工资表与社保', mode: 'import', lastSync: '2026-09-11 18:00', rows: 168 }
  ],
  rev: [4180000, 4420000, 4650000, 4380000, 3520000, 2960000, 4310000, 4560000, 4720000, 4480000, 4390000, 4260000],
  gm: [0.271, 0.273, 0.275, 0.270, 0.262, 0.255, 0.268, 0.272, 0.275, 0.261, 0.253, 0.248],
  sellRate: 0.032, sellFixed: 42000, adminRate: 0.021, rent: 45000, entertainRate: [0.004, 0.0042, 0.0045, 0.0055, 0.0038, 0.0034, 0.0046, 0.0051, 0.0058, 0.0063, 0.0066, 0.0071],
  depSeries: [112000, 112000, 112000, 112000, 112000, 112000, 118000, 118000, 118000, 118000, 118000, 118000],
  wages: [1120000, 1120000, 1135000, 1135000, 1180000, 1180000, 1150000, 1150000, 1150000, 1150000, 1150000, 1150000],
  socialBaseRatio: 0.68, socialRate: 0.26, adminWageShare: 0.18, rdWageShare: 0.11, rdRate: 0.012,
  shortLoan: 3000000, shortRate: 0.05, longLoan: 2400000, longRate: 0.046, bankFees: 3200,
  otherIncome: [0, 0, 86000, 0, 0, 0, 0, 0, 0, 120000, 0, 0], surchargeRate: 0.006,
  ar0: 10850000, arPath: [10920000, 11080000, 11260000, 11150000, 10680000, 10120000, 10560000, 10980000, 11420000, 11560000, 11780000, 11740000],
  inv0: 8620000, invPath: [8700000, 8810000, 8950000, 9060000, 9120000, 9080000, 9240000, 9480000, 9720000, 9910000, 10080000, 10240000],
  ap0: 5960000, apPath: [6010000, 6120000, 6280000, 6150000, 5720000, 5380000, 5860000, 6120000, 6340000, 6410000, 6520000, 6580000],
  prepaid0: 260000, wagesPayable0: 1408000, taxesPayable0: 398000, cash0: 2400000, fixedGross0: 16800000, accumDep0: 7420000, paidIn: 10000000, retained0: 0,
  capex: [0, 0, 0, 0, 0, 0, 1180000, 0, 620000, 0, 0, 0], loanDraw: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], loanRepay: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], dividends: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  inputVatShare: 1,
  anomalies: { collectionUnbooked: 180000, bankFeesUnbooked: 35000, inventoryGap: 62000, uninvoiced: 240000, rentPrepaid: 45000, depShort: 8600 },
  bankUnmatched: [{ date: '2026-08-27', counterparty: 'K-017 · 汽配一级供应商', amount: 180000, memo: '货款 SO-2607-0098', account: '基本户 ****3316' }, { date: '2026-08-31', counterparty: '银行', amount: -35000, memo: '承兑手续费 + 账户管理费', account: '基本户 ****3316' }],
  inventoryByCat: [{ cat: '原材料', ledger: 5180000, erp: 5142000 }, { cat: '在制品', ledger: 2360000, erp: 2360000 }, { cat: '库存商品', ledger: 2700000, erp: 2676000 }],
  uninvoicedItems: [{ customer: 'K-031 · 出口贸易公司', order: 'SO-2608-0121', amount: 240000, shipped: '2026-08-29', note: '已发货，客户要求 9 月开票' }],
  assetRegister: [{ cls: '机器设备', gross: 12600000, years: 10, salvage: 0.05, monthly: 99750 }, { cls: '新增 CNC 设备（2026-05 启用）', gross: 620000, years: 10, salvage: 0.05, monthly: 4908 }, { cls: '新增冲压线（2026-03 启用）', gross: 1180000, years: 10, salvage: 0.05, monthly: 9342 }, { cls: '运输工具', gross: 860000, years: 5, salvage: 0.05, monthly: 13617 }, { cls: '办公与电子设备', gross: 1340000, years: 3, salvage: 0.05, monthly: 0 }],
  rentVouchers: [{ no: '记-0812', date: '2026-08-05', text: '8 月厂房租金', amount: 45000 }, { no: '记-0836', date: '2026-08-28', text: '9 月厂房租金（预付）', amount: 45000 }],
  headcount: 168,
  loans: [{ id: 'L-2601', bank: '城商行', type: '流动资金贷款', principal: 1800000, rate: 0.05, due: '2026-11-20', interestDay: 20 }, { id: 'L-2604', bank: '城商行', type: '流动资金贷款', principal: 1200000, rate: 0.05, due: '2027-02-20', interestDay: 20 }, { id: 'L-2409', bank: '国有行', type: '中长期贷款', principal: 2400000, rate: 0.046, due: '2028-09-20', interestDay: 20, installment: { amount: 200000, months: [12, 6] } }],
  // 现金预测输入
  cash: {
    safety: 600000, weekStart: '2026-09-14', weeks: 13,
    arItems: [
      { id: 'AR-0812', customer: 'K-017 · 汽配一级供应商', amount: 1260000, invoiced: '2026-07-10', due: '2026-09-08', histDelay: 25 },
      { id: 'AR-0819', customer: 'K-017 · 汽配一级供应商', amount: 980000, invoiced: '2026-08-12', due: '2026-10-11', histDelay: 25 },
      { id: 'AR-0803', customer: 'K-003 · 家电整机厂', amount: 1420000, invoiced: '2026-07-28', due: '2026-09-26', histDelay: 20 },
      { id: 'AR-0821', customer: 'K-003 · 家电整机厂', amount: 860000, invoiced: '2026-08-25', due: '2026-10-24', histDelay: 20 },
      { id: 'AR-0716', customer: 'K-031 · 出口贸易公司', amount: 560000, invoiced: '2026-04-18', due: '2026-05-18', histDelay: 60 },
      { id: 'AR-0805', customer: 'K-031 · 出口贸易公司', amount: 390000, invoiced: '2026-07-30', due: '2026-08-29', histDelay: 60 },
      { id: 'AR-0722', customer: 'K-012 · 新能源电池壳体厂', amount: 480000, invoiced: '2026-05-06', due: '2026-06-05', histDelay: 45 },
      { id: 'AR-0809', customer: 'K-022 · 电动工具制造商', amount: 720000, invoiced: '2026-08-06', due: '2026-10-05', histDelay: 30 },
      { id: 'AR-0801', customer: 'K-009 · 医疗器械配件商', amount: 640000, invoiced: '2026-07-22', due: '2026-09-20', histDelay: 3 },
      { id: 'AR-0824', customer: 'K-009 · 医疗器械配件商', amount: 410000, invoiced: '2026-08-28', due: '2026-10-27', histDelay: 3 },
      { id: 'AR-0731', customer: 'K-026 · 电机制造商', amount: 200000, invoiced: '2026-05-20', due: '2026-06-19', histDelay: 40 },
      { id: 'AR-0815', customer: 'K-026 · 电机制造商', amount: 330000, invoiced: '2026-08-14', due: '2026-10-13', htDelay: 40, histDelay: 40 },
      { id: 'AR-0807', customer: 'K-005 · 卫浴五金品牌', amount: 590000, invoiced: '2026-08-03', due: '2026-09-17', histDelay: 25 },
      { id: 'AR-0826', customer: 'K-005 · 卫浴五金品牌', amount: 470000, invoiced: '2026-08-30', due: '2026-10-14', histDelay: 25 },
      { id: 'AR-0818', customer: 'K-018 · 智能门锁厂商', amount: 680000, invoiced: '2026-08-11', due: '2026-10-10', histDelay: 35 },
      { id: 'AR-0729', customer: 'K-018 · 智能门锁厂商', amount: 520000, invoiced: '2026-07-14', due: '2026-09-12', histDelay: 35 },
      { id: 'AR-0723', customer: 'K-040 · 储能设备厂', amount: 310000, invoiced: '2026-07-16', due: '2026-08-15', histDelay: 30 },
      { id: 'AR-0828', customer: 'K-022 · 电动工具制造商', amount: 920000, invoiced: '2026-08-31', due: '2026-10-30', histDelay: 30 }
    ],
    apItems: [
      { id: 'AP-0806', supplier: '宁波钢材贸易', amount: 640000, due: '2026-08-10', critical: true },
      { id: 'AP-0818', supplier: '宁波钢材贸易', amount: 520000, due: '2026-09-22', critical: true },
      { id: 'AP-0811', supplier: '无锡不锈钢材料', amount: 780000, due: '2026-09-28', critical: true },
      { id: 'AP-0803', supplier: '无锡不锈钢材料', amount: 460000, due: '2026-08-28', critical: true },
      { id: 'AP-0820', supplier: '杭州铝业', amount: 380000, due: '2026-10-08', critical: true },
      { id: 'AP-0814', supplier: '绍兴表面处理材料', amount: 210000, due: '2026-10-02', critical: true },
      { id: 'AP-0809', supplier: '东莞模具', amount: 330000, due: '2026-10-15', critical: false },
      { id: 'AP-0822', supplier: '萧山纸箱厂', amount: 96000, due: '2026-09-30', critical: false },
      { id: 'AP-0817', supplier: '温州紧固件', amount: 128000, due: '2026-10-12', critical: false },
      { id: 'AP-0825', supplier: '上海工业油品', amount: 84000, due: '2026-10-20', critical: false },
      { id: 'AP-0827', supplier: '设备商 · CNC 尾款', amount: 320000, due: '2026-10-30', critical: false },
      { id: 'AP-0829', supplier: '物流公司', amount: 142000, due: '2026-10-05', critical: false },
      { id: 'AP-0830', supplier: '宁波铜材', amount: 260000, due: '2026-11-06', critical: true },
      { id: 'AP-0831', supplier: '宁波橡塑', amount: 72000, due: '2026-11-12', critical: false },
      { id: 'AP-0902', supplier: '无锡不锈钢材料', amount: 620000, due: '2026-10-18', critical: true },
      { id: 'AP-0905', supplier: '宁波钢材贸易', amount: 540000, due: '2026-10-25', critical: true },
      { id: 'AP-0908', supplier: '杭州铝业', amount: 290000, due: '2026-11-02', critical: true },
      { id: 'AP-0910', supplier: '绍兴表面处理材料', amount: 160000, due: '2026-11-08', critical: false }
    ],
    orders: [
      { order: 'SO-2609-0142', customer: 'K-017 · 汽配一级供应商', amount: 456000, delivery: '2026-09-26', termDays: 60 },
      { order: 'SO-2609-0138', customer: 'K-003 · 家电整机厂', amount: 396000, delivery: '2026-09-21', termDays: 45 },
      { order: 'SO-2609-0129', customer: 'K-009 · 医疗器械配件商', amount: 510000, delivery: '2026-09-25', termDays: 30 },
      { order: 'SO-2609-0151', customer: 'K-022 · 电动工具制造商', amount: 312000, delivery: '2026-09-22', termDays: 45 },
      { order: 'SO-2609-0156', customer: 'K-026 · 电机制造商', amount: 288000, delivery: '2026-09-30', termDays: 30 },
      { order: 'SO-2609-0149', customer: 'K-018 · 智能门锁厂商', amount: 420000, delivery: '2026-09-25', termDays: 45 },
      { order: 'SO-2609-0153', customer: 'K-003 · 家电整机厂', amount: 336000, delivery: '2026-10-07', termDays: 45 },
      { order: 'SO-2609-0155', customer: 'K-017 · 汽配一级供应商', amount: 540000, delivery: '2026-09-29', termDays: 60 }
    ],
    rushOrder: { order: 'SO-2609-0162', customer: 'K-017 · 汽配一级供应商', amount: 168000, delivery: '2026-09-24', termDays: 30 },
    fixed: [
      { key: 'payroll', label: '工资 + 社保', day: 10, amount: 1449000 },
      { key: 'vat', label: '增值税及附加', day: 15, amount: 262000 },
      { key: 'cit', label: '企业所得税季度预缴', dates: ['2026-10-15'], amount: 224000 },
      { key: 'rent', label: '厂房租金（季付）', dates: ['2026-10-01'], amount: 135000 },
      { key: 'utility', label: '水电气', day: 25, amount: 118000 },
      { key: 'opex', label: '日常费用', day: 28, amount: 236000 }
    ],
    creditLine: { bank: '城商行', limit: 2000000, rate: 0.05 },
    recurring: { purchasesMonthly: 2600000, dpoDays: 55, salesMonthly: 4800000, dsoDays: 50, ordersUntil: '2026-10-07' }
  },
  entertain12: null
};

// ---------- 贸易变体：义乌恒益日用品 ----------
const trade = JSON.parse(JSON.stringify(mfg));
Object.assign(trade, { archetype: 'flow', sector: 'trade', company: '义乌恒益日用品有限公司', vatRate: 0.13,
  profile: { industry: 'trade-wholesale', size: '51_100', employees: 62, rdStaff: 0, province: '浙江', highTech: false, exportRev12: 6800000, unionFee12: 41000, insuredStable: true, trainingCert: 0 },
  rev: [3120000, 3480000, 3960000, 4210000, 3860000, 2240000, 3060000, 3280000, 3410000, 3520000, 3390000, 3260000],
  gm: [0.186, 0.184, 0.181, 0.179, 0.176, 0.172, 0.178, 0.175, 0.173, 0.171, 0.168, 0.165],
  sellRate: 0.048, sellFixed: 28000, adminRate: 0.016, rent: 32000, entertainRate: [0.005, 0.0052, 0.0055, 0.006, 0.0048, 0.0042, 0.0058, 0.0061, 0.0064, 0.0068, 0.007, 0.0074],
  depSeries: months.map(() => 26000), wages: months.map(() => 430000), socialBaseRatio: 0.62, adminWageShare: 0.3, rdWageShare: 0, rdRate: 0,
  shortLoan: 1500000, longLoan: 0, otherIncome: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ar0: 5120000, arPath: [5180000, 5360000, 5620000, 5740000, 5580000, 5060000, 5180000, 5320000, 5410000, 5520000, 5580000, 5640000],
  inv0: 6210000, invPath: [6320000, 6480000, 6620000, 6510000, 6360000, 6280000, 6410000, 6560000, 6720000, 6860000, 6980000, 7120000],
  ap0: 3860000, apPath: [3920000, 4080000, 4260000, 4180000, 3940000, 3620000, 3810000, 3960000, 4040000, 4120000, 4180000, 4220000],
  prepaid0: 140000, wagesPayable0: 498000, taxesPayable0: 156000, cash0: 1650000, fixedGross0: 3200000, accumDep0: 1480000, paidIn: 5000000,
  capex: [0, 0, 0, 0, 0, 0, 0, 380000, 0, 0, 0, 0],
  anomalies: { collectionUnbooked: 96000, bankFeesUnbooked: 18000, inventoryGap: 154000, uninvoiced: 310000, rentPrepaid: 32000, depShort: 3000 },
  bankUnmatched: [{ date: '2026-08-26', counterparty: 'K-102 · 连锁便利店总部', amount: 96000, memo: '货款', account: '基本户 ****8021' }, { date: '2026-08-31', counterparty: '银行', amount: -18000, memo: '手续费 + 汇兑损失', account: '基本户 ****8021' }],
  inventoryByCat: [{ cat: '常温商品', ledger: 4120000, erp: 4038000 }, { cat: '冷链商品', ledger: 1460000, erp: 1388000 }, { cat: '进口与节庆', ledger: 1540000, erp: 1540000 }],
  uninvoicedItems: [{ customer: 'K-117 · 社区团购平台', order: 'SO-2608-0862', amount: 310000, shipped: '2026-08-30', note: '平台月结，次月开票' }],
  assetRegister: [{ cls: '仓储设备', gross: 1900000, years: 10, salvage: 0.05, monthly: 15042 }, { cls: '新增冷链设备（2026-04 启用）', gross: 380000, years: 10, salvage: 0.05, monthly: 3008 }, { cls: '运输车辆', gross: 720000, years: 5, salvage: 0.05, monthly: 11400 }, { cls: '办公设备', gross: 200000, years: 3, salvage: 0.05, monthly: 0 }],
  rentVouchers: [{ no: '记-0809', date: '2026-08-04', text: '8 月仓库租金', amount: 32000 }, { no: '记-0831', date: '2026-08-29', text: '9 月仓库租金（预付）', amount: 32000 }],
  headcount: 62,
  loans: [{ id: 'L-2602', bank: '股份行', type: '流动资金贷款', principal: 1500000, rate: 0.05, due: '2026-12-15', interestDay: 15 }]
});
trade.cash = JSON.parse(JSON.stringify(mfg.cash));
trade.cash.arItems = [
  { id: 'AR-0811', customer: 'K-102 · 连锁便利店总部', amount: 860000, invoiced: '2026-08-05', due: '2026-09-19', histDelay: 6 },
  { id: 'AR-0822', customer: 'K-102 · 连锁便利店总部', amount: 640000, invoiced: '2026-08-26', due: '2026-10-10', histDelay: 6 },
  { id: 'AR-0803', customer: 'K-088 · 区域商超', amount: 920000, invoiced: '2026-07-20', due: '2026-09-18', histDelay: 20 },
  { id: 'AR-0714', customer: 'K-088 · 区域商超', amount: 380000, invoiced: '2026-05-12', due: '2026-07-11', histDelay: 20 },
  { id: 'AR-0819', customer: 'K-117 · 社区团购平台', amount: 710000, invoiced: '2026-08-15', due: '2026-09-29', histDelay: 3 },
  { id: 'AR-0706', customer: 'K-131 · 餐饮连锁', amount: 260000, invoiced: '2026-04-28', due: '2026-05-28', histDelay: 55 },
  { id: 'AR-0816', customer: 'K-131 · 餐饮连锁', amount: 190000, invoiced: '2026-08-12', due: '2026-09-11', histDelay: 55 },
  { id: 'AR-0825', customer: 'K-063 · 学校食堂配送', amount: 340000, invoiced: '2026-08-28', due: '2026-10-27', histDelay: 10 },
  { id: 'AR-0808', customer: 'K-145 · 企业福利采购', amount: 420000, invoiced: '2026-08-03', due: '2026-09-02', histDelay: 25 },
  { id: 'AR-0829', customer: 'K-088 · 区域商超', amount: 560000, invoiced: '2026-08-31', due: '2026-10-30', histDelay: 20 },
  { id: 'AR-0723', customer: 'K-040 · 跨境电商公司', amount: 370000, invoiced: '2026-07-16', due: '2026-08-15', histDelay: 30 }
];
trade.cash.apItems = [
  { id: 'AP-0805', supplier: '品牌区域经销商', amount: 720000, due: '2026-09-20', critical: true },
  { id: 'AP-0730', supplier: '品牌区域经销商', amount: 460000, due: '2026-08-25', critical: true },
  { id: 'AP-0812', supplier: '华东食品分销', amount: 530000, due: '2026-10-02', critical: true },
  { id: 'AP-0818', supplier: '乳企直供', amount: 310000, due: '2026-09-24', critical: true },
  { id: 'AP-0803', supplier: '日化品牌总代', amount: 380000, due: '2026-10-10', critical: false },
  { id: 'AP-0821', supplier: '进口食品代理', amount: 260000, due: '2026-10-20', critical: false },
  { id: 'AP-0824', supplier: '本地纸箱厂', amount: 58000, due: '2026-09-30', critical: false },
  { id: 'AP-0826', supplier: '物流公司', amount: 96000, due: '2026-10-08', critical: false },
  { id: 'AP-0828', supplier: '冷链耗材', amount: 42000, due: '2026-10-15', critical: false }
];
trade.cash.orders = [
  { order: 'SO-2609-0871', customer: 'K-102 · 连锁便利店总部', amount: 172000, delivery: '2026-09-19', termDays: 45 },
  { order: 'SO-2609-0875', customer: 'K-117 · 社区团购平台', amount: 148000, delivery: '2026-09-22', termDays: 45 },
  { order: 'SO-2609-0878', customer: 'K-102 · 连锁便利店总部', amount: 121000, delivery: '2026-09-24', termDays: 45 },
  { order: 'SO-2609-0882', customer: 'K-088 · 区域商超', amount: 99000, delivery: '2026-09-26', termDays: 60 },
  { order: 'SO-2609-0885', customer: 'K-117 · 社区团购平台', amount: 144000, delivery: '2026-09-29', termDays: 45 }
];
trade.cash.rushOrder = { order: 'SO-2609-0887', customer: 'K-102 · 连锁便利店总部', amount: 74000, delivery: '2026-09-20', termDays: 30 };
trade.cash.fixed = [
  { key: 'payroll', label: '工资 + 社保', day: 10, amount: 499000 },
  { key: 'vat', label: '增值税及附加', day: 15, amount: 62000 },
  { key: 'cit', label: '企业所得税季度预缴', dates: ['2026-10-15'], amount: 68000 },
  { key: 'rent', label: '仓库租金（季付）', dates: ['2026-10-01'], amount: 96000 },
  { key: 'utility', label: '水电与冷库', day: 25, amount: 54000 },
  { key: 'opex', label: '日常费用', day: 28, amount: 76000 }
];
trade.cash.creditLine = { bank: '股份行', limit: 1000000, rate: 0.05 };
trade.cash.recurring = { purchasesMonthly: 3050000, dpoDays: 45, salesMonthly: 3700000, dsoDays: 40, ordersUntil: '2026-09-29' };

// ---------- 服务变体：成都启元财税服务 ----------
const service = JSON.parse(JSON.stringify(mfg));
Object.assign(service, { archetype: 'service', sector: 'prof', company: '成都启元财税服务有限公司', vatRate: 0.06,
  profile: { industry: 'prof-accounting', size: '21_50', employees: 46, rdStaff: 0, province: '四川', highTech: false, exportRev12: 0, unionFee12: 26000, insuredStable: true, trainingCert: 12 },
  rev: [1260000, 1310000, 1290000, 1420000, 1680000, 1120000, 1380000, 1460000, 1510000, 1440000, 1390000, 1360000],
  gm: [0.46, 0.462, 0.458, 0.455, 0.47, 0.42, 0.452, 0.455, 0.451, 0.446, 0.44, 0.436],
  sellRate: 0.06, sellFixed: 18000, adminRate: 0.03, rent: 28000, entertainRate: [0.006, 0.0062, 0.0065, 0.007, 0.0058, 0.005, 0.0068, 0.0071, 0.0074, 0.0078, 0.008, 0.0084],
  depSeries: months.map(() => 9000), wages: months.map(() => 520000), socialBaseRatio: 0.66, adminWageShare: 0.25, rdWageShare: 0, rdRate: 0,
  shortLoan: 500000, longLoan: 0, otherIncome: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ar0: 1860000, arPath: [1880000, 1920000, 1960000, 2010000, 2060000, 1980000, 2020000, 2080000, 2120000, 2160000, 2210000, 2260000],
  inv0: 0, invPath: months.map(() => 0),
  ap0: 210000, apPath: [214000, 220000, 226000, 230000, 236000, 228000, 232000, 238000, 242000, 246000, 250000, 254000],
  prepaid0: 60000, wagesPayable0: 609000, taxesPayable0: 52000, cash0: 980000, fixedGross0: 780000, accumDep0: 410000, paidIn: 2000000,
  capex: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  anomalies: { collectionUnbooked: 38000, bankFeesUnbooked: 6000, inventoryGap: 0, uninvoiced: 92000, rentPrepaid: 28000, depShort: 0 },
  bankUnmatched: [{ date: '2026-08-28', counterparty: 'K-311 · 餐饮管理公司', amount: 38000, memo: '服务费', account: '基本户 ****5502' }, { date: '2026-08-31', counterparty: '银行', amount: -6000, memo: '手续费', account: '基本户 ****5502' }],
  inventoryByCat: [],
  uninvoicedItems: [{ customer: 'K-342 · 电商公司', order: 'SV-2608-0198', amount: 92000, shipped: '2026-08-31', note: '年度服务费分期，客户要求 9 月开票' }],
  assetRegister: [{ cls: '办公与电子设备', gross: 780000, years: 5, salvage: 0.05, monthly: 9000 }],
  rentVouchers: [{ no: '记-0807', date: '2026-08-03', text: '8 月办公室租金', amount: 28000 }, { no: '记-0829', date: '2026-08-27', text: '9 月办公室租金（预付）', amount: 28000 }],
  headcount: 46,
  loans: [{ id: 'L-2603', bank: '城商行', type: '流动资金贷款', principal: 500000, rate: 0.048, due: '2027-03-20', interestDay: 20 }]
});
service.cash = JSON.parse(JSON.stringify(mfg.cash));
service.cash.safety = 150000;
service.cash.arItems = [
  { id: 'AR-0803', customer: 'K-311 · 餐饮管理公司', amount: 186000, invoiced: '2026-08-01', due: '2026-08-31', histDelay: 15 },
  { id: 'AR-0805', customer: 'K-287 · 贸易公司', amount: 96000, invoiced: '2026-08-02', due: '2026-09-01', histDelay: 10 },
  { id: 'AR-0612', customer: 'K-298 · 培训机构', amount: 240000, invoiced: '2026-05-10', due: '2026-06-09', histDelay: 60 },
  { id: 'AR-0810', customer: 'K-342 · 电商公司', amount: 320000, invoiced: '2026-08-08', due: '2026-10-07', histDelay: 5 },
  { id: 'AR-0815', customer: 'K-360 · 物流公司', amount: 142000, invoiced: '2026-08-14', due: '2026-09-13', histDelay: 20 },
  { id: 'AR-0714', customer: 'K-256 · 建材经销商', amount: 88000, invoiced: '2026-06-14', due: '2026-07-14', histDelay: 45 },
  { id: 'AR-0820', customer: 'K-330 · 设计工作室', amount: 64000, invoiced: '2026-08-18', due: '2026-09-17', histDelay: 8 },
  { id: 'AR-0824', customer: 'K-372 · 医疗器械公司', amount: 156000, invoiced: '2026-08-24', due: '2026-10-23', histDelay: 12 },
  { id: 'AR-0828', customer: 'K-351 · 咨询公司', amount: 72000, invoiced: '2026-08-28', due: '2026-09-27', histDelay: 30 },
  { id: 'AR-0830', customer: 'K-311 · 餐饮管理公司', amount: 210000, invoiced: '2026-08-30', due: '2026-10-29', histDelay: 15 }
];
service.cash.apItems = [
  { id: 'AP-0810', supplier: '合作事务所（外聘审核）', amount: 68000, due: '2026-09-25', critical: true },
  { id: 'AP-0814', supplier: '软件服务商', amount: 54000, due: '2026-10-05', critical: true },
  { id: 'AP-0818', supplier: '写字楼物业', amount: 36000, due: '2026-09-30', critical: false },
  { id: 'AP-0822', supplier: '培训机构', amount: 42000, due: '2026-10-15', critical: false },
  { id: 'AP-0826', supplier: '差旅平台', amount: 28000, due: '2026-10-10', critical: false }
];
service.cash.orders = [
  { order: 'SV-2609-0218', customer: 'K-342 · 电商公司', amount: 48000, delivery: '2026-09-25', termDays: 30 },
  { order: 'SV-2609-0219', customer: 'K-298 · 培训机构', amount: 86000, delivery: '2026-09-30', termDays: 30 },
  { order: 'SV-2609-0223', customer: 'K-311 · 餐饮管理公司', amount: 96000, delivery: '2026-10-08', termDays: 30 },
  { order: 'SV-2609-0224', customer: 'K-360 · 物流公司', amount: 52000, delivery: '2026-09-28', termDays: 30 }
];
service.cash.rushOrder = { order: 'SV-2609-0226', customer: 'K-380 · 软件公司', amount: 44000, delivery: '2026-09-24', termDays: 15 };
service.cash.fixed = [
  { key: 'payroll', label: '工资 + 社保', day: 10, amount: 609000 },
  { key: 'vat', label: '增值税及附加', day: 15, amount: 58000 },
  { key: 'cit', label: '企业所得税季度预缴', dates: ['2026-10-15'], amount: 96000 },
  { key: 'rent', label: '办公室租金（季付）', dates: ['2026-10-01'], amount: 84000 },
  { key: 'utility', label: '物业与水电', day: 25, amount: 18000 },
  { key: 'opex', label: '日常费用', day: 28, amount: 46000 }
];
service.cash.creditLine = { bank: '城商行', limit: 600000, rate: 0.048 };
service.cash.recurring = { purchasesMonthly: 330000, dpoDays: 30, salesMonthly: 1450000, dsoDays: 35, ordersUntil: '2026-10-08' };

[mfg, trade, service].forEach((p) => {
  const b = build(p);
  const sample = { archetype: p.archetype, sector: p.sector, company: p.company, period: p.period, today: p.today, vatRate: p.vatRate, citRate: p.citRate, profile: p.profile, sources: p.sources, ledger: b.ledger, external: b.external, cash: p.cash, adjustments: [], actions: [], log: [], policyList: [], cashScenario: {} };
  W(p.sector + '.json', sample);
});
console.log('samples written: mfg / trade / prof');
