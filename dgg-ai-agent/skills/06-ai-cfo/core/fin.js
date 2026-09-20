/*
 * AI CFO · 内核
 * 输入：一家企业的账套（12 期科目余额与流量）+ 外部来源（银行流水、ERP 库存、发票数据、固定资产台账、租赁合同、工资表、借款合同）+ 现金预测输入
 * 计算：三表生成 → 勾稽规则逐条核对（差异、判断、下钻、调整分录）→ 风险规则打分落矩阵 → 13 周现金预测与情景 → 缺口三方案
 *       → 政策匹配与预计金额 → 财务月报
 * 调整分录、风险处置、现金方案、政策清单都写进同一份数据副本，各屏按副本重算。
 * 确定性、离线、无网络。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM6 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.2.0';
  var MODULE_NAME = 'AI CFO';
  var CREDITS = 50;
  var DAY = 86400000;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r0(n) { return Math.round(n); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function last(a) { return a[a.length - 1]; }
  function fmtN(n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtW(n) { return Math.abs(n) >= 10000 ? r1(n / 10000) + ' 万元' : fmtN(n) + ' 元'; }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dateOf(base, d) { var t = new Date(ms(base) + d * DAY); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); }
  function short(s) { var p = s.split('-'); return (+p[1]) + '-' + (+p[2]); }
  function monthLabel(m) { var p = m.split('-'); return (+p[1]) + '月'; }

  /* ---------------- 小型表达式求值（规则表里的算式） ---------------- */
  function evalExpr(expr, env) {
    var t = String(expr).match(/\d+\.?\d*|[A-Za-z_][A-Za-z0-9_]*|'[^']*'|&&|\|\||<=|>=|==|!=|[-+*/()<>!]/g) || [];
    var i = 0;
    function peek() { return t[i]; }
    function next() { return t[i++]; }
    function primary() {
      var x = next();
      if (x === '(') { var v = or(); next(); return v; }
      if (x === '!') return !primary();
      if (x === '-') return -primary();
      if (/^\d/.test(x)) return parseFloat(x);
      if (/^'/.test(x)) return x.slice(1, -1);
      if (x === 'true') return true; if (x === 'false') return false;
      var v2 = env[x]; return v2 == null ? 0 : v2;
    }
    function mul() { var v = primary(); while (peek() === '*' || peek() === '/') { var op = next(), r = primary(); v = op === '*' ? v * r : v / r; } return v; }
    function add() { var v = mul(); while (peek() === '+' || peek() === '-') { var op = next(), r = mul(); v = op === '+' ? v + r : v - r; } return v; }
    function cmp() { var v = add(); while (['<', '>', '<=', '>=', '==', '!='].indexOf(peek()) >= 0) { var op = next(), r = add(); v = op === '<' ? v < r : op === '>' ? v > r : op === '<=' ? v <= r : op === '>=' ? v >= r : op === '==' ? v == r : v != r; } return v; }
    function and() { var v = cmp(); while (peek() === '&&') { next(); var r = cmp(); v = v && r; } return v; }
    function or() { var v = and(); while (peek() === '||') { next(); var r = and(); v = v || r; } return v; }
    return or();
  }

  /* ---------------- 规范化 + 调整分录落账 ---------------- */
  // ensure：只补默认字段，不落账（写入类函数用它，返回的仍是原始账套 + 动作清单）
  function ensure(raw) {
    var d = clone(raw);
    d.adjustments = d.adjustments || []; d.actions = d.actions || []; d.log = d.log || []; d.policyList = d.policyList || []; d.cashScenario = d.cashScenario || {};
    return d;
  }
  // normalize：在副本上把调整分录落到当期账面（计算类函数用它）
  function normalize(raw) {
    var d = ensure(raw);
    d.hasInventory = last(d.ledger.bs.inventory) > 0 || d.ledger.bs.inventory[0] > 0;
    var L = d.ledger, P = L.months.length - 1, X = d.external;
    // 调整分录按 key 改当期账面（只动当期）
    d.adjustments.forEach(function (a) {
      var v = a.amount;
      if (a.key === 'bookCollection') { L.bs.cash[P + 1] += v; L.bs.ar[P + 1] -= v; L.flows.collections[P] += v; }
      else if (a.key === 'bookBankItems') { L.bs.cash[P + 1] -= v; L.pl.finExp[P] += v; L.pl.detail.fees[P] += v; L.bs.retained[P + 1] -= v; }
      else if (a.key === 'writeOffInventory') { L.bs.inventory[P + 1] -= v; L.pl.adminExp[P] += v; L.bs.retained[P + 1] -= v; }
      else if (a.key === 'declareUninvoiced') { X.invoice.salesInvoiced[P] += v; }   // 申报动作：销项税已在待转销项税额中，账面不再变动
      else if (a.key === 'accrueDepreciation') { L.bs.accumDep[P + 1] += v; L.pl.detail.dep[P] += v; L.pl.cogs[P] += v; L.bs.retained[P + 1] -= v; }
      else if (a.key === 'deferRent') { L.bs.prepaid[P + 1] += v; L.pl.adminExp[P] -= v; L.pl.detail.rent[P] -= v; L.bs.retained[P + 1] += v; }
      else if (a.key === 'provision') { L.pl.adminExp[P] += v; L.bs.ar[P + 1] -= v; L.bs.retained[P + 1] -= v; }
    });
    // 调整改变了利润总额，所得税按适用税率重新计提，差额进应交税费与未分配利润
    if (d.adjustments.length) {
      var pl = L.pl, ebt = pl.rev[P] - pl.cogs[P] - pl.sellExp[P] - pl.adminExp[P] - pl.rdExp[P] - pl.finExp[P] - pl.taxSurcharge[P] + pl.otherIncome[P];
      var tax = r0(Math.max(0, ebt) * d.citRate), delta = tax - pl.incomeTax[P];
      if (delta) { pl.incomeTax[P] = tax; L.bs.taxesPayable[P + 1] += delta; L.bs.retained[P + 1] -= delta; }
    }
    return d;
  }

  /* ---------------- 三表 ---------------- */
  function statements(d) {
    var L = d.ledger, n = L.months.length;
    var pl = L.months.map(function (m, i) {
      var p = L.pl;
      var gross = p.rev[i] - p.cogs[i];
      var op = gross - p.sellExp[i] - p.adminExp[i] - p.rdExp[i] - p.finExp[i] - p.taxSurcharge[i] + p.otherIncome[i];
      return { month: m, label: monthLabel(m), rev: p.rev[i], cogs: p.cogs[i], gross: gross, gm: p.rev[i] ? gross / p.rev[i] : 0, sellExp: p.sellExp[i], adminExp: p.adminExp[i], rdExp: p.rdExp[i], finExp: p.finExp[i], taxSurcharge: p.taxSurcharge[i], otherIncome: p.otherIncome[i], ebt: op, incomeTax: p.incomeTax[i], netProfit: op - p.incomeTax[i], nm: p.rev[i] ? (op - p.incomeTax[i]) / p.rev[i] : 0 };
    });
    var bs = [];
    for (var i = 0; i <= n; i++) {
      var b = L.bs;
      var fixedNet = b.fixedGross[i] - b.accumDep[i];
      var assets = b.cash[i] + b.ar[i] + b.inventory[i] + b.prepaid[i] + fixedNet;
      var liab = b.ap[i] + b.wagesPayable[i] + b.taxesPayable[i] + b.shortLoan[i] + b.longLoan[i];
      var equity = b.paidIn[i] + b.retained[i];
      bs.push({ month: i ? L.months[i - 1] : '期初', cash: b.cash[i], ar: b.ar[i], inventory: b.inventory[i], prepaid: b.prepaid[i], fixedGross: b.fixedGross[i], accumDep: b.accumDep[i], fixedNet: fixedNet, assets: assets, ap: b.ap[i], wagesPayable: b.wagesPayable[i], taxesPayable: b.taxesPayable[i], shortLoan: b.shortLoan[i], longLoan: b.longLoan[i], liabilities: liab, paidIn: b.paidIn[i], retained: b.retained[i], equity: equity, diff: assets - liab - equity });
    }
    var cf = L.months.map(function (m, i) {
      var f = L.flows, b0 = bs[i], b1 = bs[i + 1], p = pl[i];
      var dep = L.pl.detail.dep[i];
      var cfo = p.netProfit + dep - (b1.ar - b0.ar) - (b1.inventory - b0.inventory) - (b1.prepaid - b0.prepaid) + (b1.ap - b0.ap) + (b1.wagesPayable - b0.wagesPayable) + (b1.taxesPayable - b0.taxesPayable);
      var cfi = -f.capex[i];
      var cff = f.loanDraw[i] - f.loanRepay[i] - f.dividends[i];
      return { month: m, label: monthLabel(m), netProfit: p.netProfit, dep: dep, dAR: b1.ar - b0.ar, dInv: b1.inventory - b0.inventory, dPrepaid: b1.prepaid - b0.prepaid, dAP: b1.ap - b0.ap, dWages: b1.wagesPayable - b0.wagesPayable, dTax: b1.taxesPayable - b0.taxesPayable, cfo: cfo, cfi: cfi, cff: cff, net: cfo + cfi + cff, dCash: b1.cash - b0.cash, collections: f.collections[i], payments: f.payments[i], wagesPaid: f.wagesPaid[i], taxPaid: f.taxPaid[i], opexCash: f.opexCash[i], capex: f.capex[i] };
    });
    return { pl: pl, bs: bs, cf: cf };
  }

  /* ---------------- 当期指标（规则表的变量表） ---------------- */
  function metrics(d, st) {
    var L = d.ledger, X = d.external, P = L.months.length - 1;
    var p = st.pl[P], b0 = st.bs[P], b1 = st.bs[P + 1], c = st.cf[P];
    var m = {
      rev: p.rev, cogs: p.cogs, netProfit: p.netProfit, ebt: p.ebt, ebtTaxable: Math.max(0, p.ebt), incomeTax: p.incomeTax, vatRate: d.vatRate, citRate: d.citRate,
      assets: b1.assets, liabilities: b1.liabilities, equity: b1.equity,
      dRetained: b1.retained - b0.retained, dividends: L.flows.dividends[P],
      dAR: b1.ar - b0.ar, dInv: b1.inventory - b0.inventory, dAP: b1.ap - b0.ap, dCash: b1.cash - b0.cash,
      collectionsBank: X.bank.collections[P], paymentsBank: X.bank.payments[P], bankBalance: X.bank.balance[P + 1], cashLedger: b1.cash,
      purchases: L.flows.purchases[P], invLedger: b1.inventory, invErp: X.erp.inventoryValue[P + 1],
      cfoIndirect: c.cfo, cfoDirect: c.collections - c.payments - c.wagesPaid - c.taxPaid - c.opexCash - p.finExp + p.otherIncome, cfNet: c.net,
      invoiced: X.invoice.salesInvoiced[P], wagesBooked: L.pl.detail.wages[P] + L.pl.detail.social[P], wagesPayroll: X.payroll.gross[P] + X.payroll.social[P],
      depBooked: L.pl.detail.dep[P], depExpected: sum(X.assetRegister.map(function (a) { return a.monthly; })),
      interestBooked: L.pl.detail.interest[P], interestSched: sum(X.loans.map(function (l) { return r0(l.principal * l.rate / 12); })),
      rentBooked: L.pl.detail.rent[P], rentContract: X.contracts.rentMonthly,
      hasInventory: d.hasInventory ? 1 : 0, bankFeesUnbooked: 0
    };
    m.bankFees = X.bank.fees[P] - L.pl.detail.fees[P];
    return m;
  }

  /* ---------------- 三表勾稽 ---------------- */
  function reconcile(d, st, lib) {
    var m = metrics(d, st), L = d.ledger, X = d.external, P = L.months.length - 1;
    var applied = {}; d.adjustments.forEach(function (a) { applied[a.rule] = a; });
    var rows = lib.rules.rules.map(function (r) {
      if (r.applies && !evalExpr(r.applies, m)) return { id: r.id, name: r.name, pair: r.pair, status: 'na', lhs: null, rhs: null, diff: 0 };
      var lhs = evalExpr(r.lhs, m), rhs = evalExpr(r.rhs, m), diff = lhs - rhs, ad = Math.abs(diff);
      var tol = r.tol.abs != null ? r.tol.abs : Math.max(10, Math.abs(rhs) * r.tol.rel);
      var status = ad <= tol ? 'ok' : ad <= tol * 3 ? 'warn' : 'bad';
      var ctx = { diff: fmtN(ad), fees: fmtN(Math.abs(m.bankFees)), vat: fmtN(r0(ad * d.vatRate)) };
      var fill = function (s) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; }); };
      var out = { id: r.id, name: r.name, pair: r.pair, lhs: r0(lhs), rhs: r0(rhs), lhsLabel: r.lhsLabel, rhsLabel: r.rhsLabel, diff: r0(diff), absDiff: r0(ad), tol: r0(tol), status: status, fixed: !!applied[r.id],
        explain: status === 'ok' ? '差异 ' + fmtN(ad) + ' 元，在容差 ' + fmtN(tol) + ' 元内' : fill(r.explain), drill: drill(r.drill, d, st, m, diff) };
      if (r.fix && status !== 'ok') {
        var amount = r.id === 'R07' ? Math.abs(m.bankFees) : r0(ad);
        out.fix = { key: r.fix.key, label: r.fix.label, amount: amount, base: 0, entry: r.fix.entry.map(function (e) { return [e[0], e[1], fill(e[2])]; }), note: r.id === 'R07' ? '同源的 ' + fmtN(Math.abs(diff) - Math.abs(m.bankFees)) + ' 元回款未入账在 R03 处理' : r.id === 'R08' ? '申报动作不产生分录，销项税 ' + ctx.vat + ' 元已在待转销项税额中' : null };
        if (r.id === 'R07' && Math.abs(m.bankFees) < 1) out.fix = null;
      }
      return out;
    });
    var seen = [
      '科目余额表 ' + L.months[P].replace('-', ' 年 ') + ' 月 · ' + (X.sources ? '' : '') + '资产总计 ' + fmtW(m.assets),
      '银行流水 3 个账户 · 本期回款 ' + fmtW(m.collectionsBank) + ' · 对账单余额 ' + fmtW(m.bankBalance),
      'ERP 库存金额 ' + fmtW(m.invErp) + ' · 发票数据本期开票 ' + fmtW(m.invoiced),
      '固定资产台账 ' + X.assetRegister.length + ' 类 · 借款合同 ' + X.loans.length + ' 笔 · 租赁合同月租 ' + fmtN(m.rentContract) + ' 元 · 工资表 ' + X.payroll.headcount + ' 人'
    ];
    var bad = rows.filter(function (r) { return r.status === 'bad'; }), warn = rows.filter(function (r) { return r.status === 'warn'; });
    var reasons = bad.map(function (r) { return r.name + '：' + r.explain; });
    if (warn.length) reasons.push(warn.map(function (r) { return r.name; }).join('、') + ' 有差异但在 3 倍容差内，本期可不调');
    var same = rows.filter(function (r) { return r.id === 'R03' && r.status !== 'ok'; }).length && rows.filter(function (r) { return r.id === 'R07' && r.status !== 'ok'; }).length;
    if (same) reasons.push('R03 与 R07 同源：一笔到账货款未入账，同时抬高了应收与压低了账面现金');
    return { rows: rows, metrics: m, counts: { ok: rows.filter(function (r) { return r.status === 'ok'; }).length, warn: warn.length, bad: bad.length, na: rows.filter(function (r) { return r.status === 'na'; }).length, fixed: d.adjustments.length }, seen: seen, reasons: reasons };
  }
  function drill(kind, d, st, m, diff) {
    var L = d.ledger, X = d.external, P = L.months.length - 1, b1 = st.bs[P + 1];
    if (kind === 'bankUnmatched') return { type: 'table', title: '银行流水未匹配项', cols: ['日期', '对方', '金额', '摘要', '账户'], rows: X.bank.unmatched.filter(function (u) { return u.amount > 0; }).map(function (u) { return [u.date, u.counterparty, fmtN(u.amount), u.memo, u.account]; }) };
    if (kind === 'bankRecon') return { type: 'table', title: '银行未达账项', cols: ['日期', '对方', '金额', '摘要', '账户'], rows: X.bank.unmatched.map(function (u) { return [u.date, u.counterparty, fmtN(u.amount), u.memo, u.account]; }) };
    if (kind === 'inventory') return { type: 'table', title: '账面存货与 ERP 库存', cols: ['类别', '账面', 'ERP', '差异'], rows: X.erp.inventoryByCat.map(function (c) { return [c.cat, fmtN(c.ledger), fmtN(c.erp), fmtN(c.ledger - c.erp)]; }) };
    if (kind === 'invoice') return { type: 'table', title: '已确认收入未开票', cols: ['客户', '订单', '金额', '发货日', '备注'], rows: X.invoice.uninvoicedItems.map(function (u) { return [u.customer, u.order, fmtN(u.amount), u.shipped, u.note]; }) };
    if (kind === 'assets') return { type: 'table', title: '固定资产台账', cols: ['类别', '原值', '年限', '月折旧'], rows: X.assetRegister.map(function (a) { return [a.cls, fmtN(a.gross), a.years + ' 年', fmtN(a.monthly)]; }) };
    if (kind === 'vouchers') return { type: 'table', title: '本期房租凭证', cols: ['凭证', '日期', '摘要', '金额'], rows: X.contracts.rentVouchers.map(function (v) { return [v.no, v.date, v.text, fmtN(v.amount)]; }) };
    if (kind === 'loans') return { type: 'table', title: '借款合同', cols: ['编号', '银行', '类型', '本金', '利率', '到期'], rows: X.loans.map(function (l) { return [l.id, l.bank, l.type, fmtN(l.principal), (l.rate * 100).toFixed(1) + '%', l.due]; }) };
    if (kind === 'payroll') return { type: 'kv', title: '工资表', rows: [['应发合计', fmtN(X.payroll.gross[P])], ['社保单位部分', fmtN(X.payroll.social[P])], ['在册人数', X.payroll.headcount + ' 人']] };
    if (kind === 'ap') return { type: 'kv', title: '应付账款', rows: [['期初', fmtN(st.bs[P].ap)], ['含税采购', fmtN(r0(m.purchases * (1 + d.vatRate)))], ['银行付款', fmtN(m.paymentsBank)], ['期末', fmtN(b1.ap)]] };
    if (kind === 'cf') { var c = st.cf[P]; return { type: 'kv', title: '经营现金流', rows: [['净利润', fmtN(c.netProfit)], ['折旧', fmtN(c.dep)], ['应收变动', fmtN(-c.dAR)], ['存货变动', fmtN(-c.dInv)], ['应付变动', fmtN(c.dAP)], ['间接法合计', fmtN(c.cfo)]] }; }
    if (kind === 'pl') { var p = st.pl[P]; return { type: 'kv', title: '利润表', rows: [['利润总额', fmtN(p.ebt)], ['所得税费用', fmtN(p.incomeTax)], ['净利润', fmtN(p.netProfit)]] }; }
    return { type: 'kv', title: '资产负债表', rows: [['资产总计', fmtN(b1.assets)], ['负债合计', fmtN(b1.liabilities)], ['所有者权益', fmtN(b1.equity)]] };
  }
  function applyFix(raw, ruleId, lib) {
    var d = normalize(raw);
    var st = statements(d), rec = reconcile(d, st, lib);
    var row = rec.rows.filter(function (r) { return r.id === ruleId; })[0];
    var out = ensure(raw);
    if (!row || !row.fix || row.fixed) return out;
    out.adjustments.push({ rule: ruleId, key: row.fix.key, amount: row.fix.amount, base: row.fix.base, label: row.fix.label, entry: row.fix.entry, seq: out.adjustments.length + 1 });
    out.log.push({ seq: out.log.length + 1, kind: 'adjust', label: row.fix.label, detail: row.id + ' ' + row.name + '：' + row.fix.entry.map(function (e) { return e[0] + ' ' + e[1] + ' ' + e[2]; }).join('；') + '，待会计复核', amount: row.fix.amount });
    return out;
  }

  /* ---------------- 风险 ---------------- */
  function bandOf(lib, key, sector) { var b = lib.benchmarks.bands[key]; return { dir: b.dir, unit: b.unit, range: b.by[sector] || b.by.default }; }
  function probFrom(value, band) {
    var lo = band.range[0], hi = band.range[1];
    if (band.dir === 'high') { if (value <= hi) return 0.1; var over = hi > 0 ? (value - hi) / hi : value; return Math.min(0.95, 0.35 + over * 0.6); }
    if (value >= lo) return 0.1; var under = lo > 0 ? (lo - value) / lo : 1; return Math.min(0.95, 0.35 + under * 0.8);
  }
  function arAging(d) {
    var today = ms(d.today);
    return d.cash.arItems.map(function (a) { var days = Math.round((today - ms(a.due)) / DAY); return { id: a.id, customer: a.customer, amount: a.amount, due: a.due, overdueDays: days, bucket: days <= 0 ? '未到期' : days <= 30 ? '逾期 1–30 天' : days <= 90 ? '逾期 31–90 天' : days <= 180 ? '逾期 91–180 天' : '逾期 180 天以上' }; });
  }
  function risks(d, st, lib) {
    var L = d.ledger, X = d.external, P = L.months.length - 1, p = st.pl[P], b1 = st.bs[P + 1], sector = d.sector, bm = lib.benchmarks;
    var aging = arAging(d), arTotal = sum(aging.map(function (a) { return a.amount; }));
    var over90 = aging.filter(function (a) { return a.overdueDays > 90; }), over30 = aging.filter(function (a) { return a.overdueDays > 30; });
    var rev12 = sum(st.pl.map(function (x) { return x.rev; })), cogs12 = sum(st.pl.map(function (x) { return x.cogs; }));
    var custRev = {}; d.cash.arItems.forEach(function (a) { custRev[a.customer] = (custRev[a.customer] || 0) + a.amount; }); d.cash.orders.forEach(function (o) { custRev[o.customer] = (custRev[o.customer] || 0) + o.amount; });
    var top = Object.keys(custRev).sort(function (a, b) { return custRev[b] - custRev[a]; })[0];
    var topShare = top ? 100 * custRev[top] / Math.max(1, sum(Object.keys(custRev).map(function (k) { return custRev[k]; }))) : 0;
    var invDays = d.hasInventory ? b1.inventory / (cogs12 / 365) : 0;
    var vatPaid12 = sum(L.flows.vatPayable), vatBurden = 100 * vatPaid12 / rev12;
    var fixedOut = sum(d.cash.fixed.map(function (f) { return f.day ? f.amount : f.amount / 3; })) + sum(X.loans.map(function (l) { return r0(l.principal * l.rate / 12); }));
    var cashMonths = X.bank.balance[P + 1] / fixedOut;
    var entertain12 = sum(L.pl.detail.entertain), entertainShare = 1000 * entertain12 / rev12;
    var gms = st.pl.slice(-4).map(function (x) { return x.gm * 100; }), gmDrop3 = gms[0] - gms[3];
    var today = ms(d.today);
    var apOver = d.cash.apItems.filter(function (a) { return (today - ms(a.due)) / DAY > 30; }), apOverdue = sum(apOver.map(function (a) { return a.amount; }));
    var capex12 = sum(L.flows.capex), shortLoan = b1.shortLoan, shortRatio = shortLoan ? 100 * capex12 / shortLoan : 0;
    var socialRatio = 100 * X.payroll.socialBase[P] / X.payroll.gross[P];
    var vals = { arOverdue90Share: 100 * sum(over90.map(function (a) { return a.amount; })) / Math.max(1, arTotal), top1Share: topShare, inventoryDays: invDays, vatBurden: vatBurden, cashMonths: cashMonths, entertainShare: entertainShare, gmDrop3: gmDrop3, apOverdue: apOverdue, shortLoanCapexRatio: shortRatio, socialBaseRatio: socialRatio };
    var impacts = {
      K01: sum(over90.map(function (a) { return a.amount * (a.overdueDays > 180 ? bm.badDebtRate['180_plus'] : bm.badDebtRate['90_180']); })),
      K02: top ? custRev[top] * p.gm : 0,
      K03: d.hasInventory ? Math.max(0, invDays - bandOf(lib, 'inventoryDays', sector).range[1]) * (cogs12 / 365) * bm.capitalCost : 0,
      K04: Math.max(0, (bandOf(lib, 'vatBurden', sector).range[0] / 100) * rev12 - vatPaid12) * (1 + bm.lateFeeDaily * 180),
      K05: 0,
      K06: Math.max(0, entertain12 - rev12 * 0.005) * d.citRate,
      K07: Math.max(0, gmDrop3) / 100 * sum(st.pl.slice(-3).map(function (x) { return x.rev; })),
      K08: apOverdue,
      K09: X.loans.filter(function (l) { return l.type.indexOf('流动') >= 0; }).reduce(function (t, l) { return t + l.principal; }, 0),
      K10: Math.max(0, X.payroll.gross[P] - X.payroll.socialBase[P]) * bm.socialRate * 12
    };
    var evidence = {
      K01: [over90.length + ' 笔逾期 90 天以上，合计 ' + fmtW(sum(over90.map(function (a) { return a.amount; }))) + '，占应收 ' + r1(vals.arOverdue90Share) + '%'].concat(over90.slice(0, 3).map(function (a) { return a.customer + ' ' + a.id + ' ' + fmtW(a.amount) + ' 逾期 ' + a.overdueDays + ' 天'; })),
      K02: [top + ' 在手应收与在产订单合计 ' + fmtW(top ? custRev[top] : 0) + '，占 ' + r1(topShare) + '%'],
      K03: ['期末存货 ' + fmtW(b1.inventory) + '，按近 12 期成本折 ' + r0(invDays) + ' 天'].concat(X.erp.inventoryByCat.map(function (c) { return c.cat + ' ' + fmtW(c.erp); })),
      K04: ['近 12 期已缴增值税 ' + fmtW(vatPaid12) + '，税负率 ' + r2(vatBurden) + '%'].concat(X.invoice.uninvoicedItems.map(function (u) { return '本期未开票收入 ' + fmtW(u.amount) + '（' + u.customer + '）'; })),
      K05: ['银行对账单余额 ' + fmtW(X.bank.balance[P + 1]) + '，月均刚性支出 ' + fmtW(fixedOut) + '（工资社保、税费、租金、水电、贷款利息）'],
      K06: ['近 12 期业务招待费 ' + fmtW(entertain12) + '，占收入 ' + r2(entertainShare) + '‰，税前扣除限额为收入 5‰'],
      K07: ['近四期毛利率 ' + gms.map(function (g) { return r1(g) + '%'; }).join(' → ')],
      K08: apOver.length ? apOver.map(function (a) { return a.supplier + ' ' + a.id + ' ' + fmtW(a.amount) + ' 逾期 ' + Math.round((today - ms(a.due)) / DAY) + ' 天' + (a.critical ? '（有在途物料）' : ''); }) : ['应付账款无逾期 30 天以上项 · 14 天内到期 ' + d.cash.apItems.filter(function (a) { return (ms(a.due) - today) / DAY <= 14; }).length + ' 笔 ' + fmtW(sum(d.cash.apItems.filter(function (a) { return (ms(a.due) - today) / DAY <= 14; }).map(function (a) { return a.amount; })))],
      K09: ['近 12 期资本支出 ' + fmtW(capex12) + '，短期借款 ' + fmtW(shortLoan)].concat(X.loans.filter(function (l) { return l.type.indexOf('流动') >= 0; }).map(function (l) { return l.id + ' ' + l.bank + ' ' + fmtW(l.principal) + ' ' + l.due + ' 到期'; })),
      K10: ['社保缴费基数 ' + fmtW(X.payroll.socialBase[P]) + '，工资表应发 ' + fmtW(X.payroll.gross[P]) + '，比例 ' + r0(socialRatio) + '%']
    };
    var handled = {}; d.actions.forEach(function (a) { handled[a.risk] = (handled[a.risk] || []).concat([a]); });
    var rows = lib.riskRules.rules.map(function (r) {
      if (r.applies && !evalExpr(r.applies, { hasInventory: d.hasInventory ? 1 : 0 })) return null;
      var band = bandOf(lib, r.band, sector), v = vals[r.metric];
      var prob = probFrom(v, band), impact = r0(impacts[r.id]);
      if (r.id === 'K05') { prob = v < 1 ? 0.9 : v < band.range[0] ? 0.6 : 0.1; }
      if (r.id === 'K08') { prob = apOverdue > 0 ? 0.8 : 0.1; }
      var acted = handled[r.id] || [];
      if (acted.length) prob = Math.max(0.1, prob - 0.4);
      var score = prob * impact;
      var level = prob >= 0.6 && impact >= 200000 ? 'high' : prob >= 0.35 || impact >= 200000 ? 'mid' : 'low';
      if (prob <= 0.1) level = 'low';
      return { id: r.id, name: r.name, cat: r.cat, metric: r.metric, metricLabel: r.metricLabel, value: r2(v), unit: r.unit, band: band.range, dir: band.dir, inBand: band.dir === 'high' ? v <= band.range[1] : v >= band.range[0], prob: r2(prob), impact: impact, score: r0(score), level: level, evidence: evidence[r.id], impactNote: r.impactNote, actions: r.actions, handled: acted };
    }).filter(Boolean);
    rows.sort(function (a, b) { return b.score - a.score; });
    return { rows: rows, aging: aging, vals: vals, counts: { high: rows.filter(function (r) { return r.level === 'high'; }).length, mid: rows.filter(function (r) { return r.level === 'mid'; }).length, low: rows.filter(function (r) { return r.level === 'low'; }).length, handled: d.actions.length }, arTotal: arTotal, arOverdue: sum(over30.map(function (a) { return a.amount; })), arOverdue90: sum(over90.map(function (a) { return a.amount; })), cashMonths: r1(cashMonths), fixedOut: r0(fixedOut) };
  }
  function applyRiskAction(raw, riskId, key, lib) {
    var d = ensure(raw);
    var rule = lib.riskRules.rules.filter(function (r) { return r.id === riskId; })[0];
    var act = rule && rule.actions.filter(function (a) { return a.key === key; })[0];
    if (!act) return d;
    var detail = act.desc, amount = 0;
    if (key === 'collect') { d.cashScenario.collectAhead = true; detail = '逾期 30 天以上客户进入催收，现金预测按提前两周、80% 到账重排'; }
    else if (key === 'provision') { var over180 = arAging(d).filter(function (a) { return a.overdueDays > 180; }); amount = r0(sum(over180.map(function (a) { return a.amount; })) * 0.5); d.adjustments.push({ rule: 'K01', key: 'provision', amount: amount, label: '计提坏账准备', entry: [['借', '信用减值损失', fmtN(amount)], ['贷', '坏账准备', fmtN(amount)]], seq: d.adjustments.length + 1 }); detail = '逾期 180 天以上 ' + over180.length + ' 笔按 50% 计提 ' + fmtN(amount) + ' 元'; }
    else if (key === 'disposeSlow') { d.cashScenario.disposeSlow = true; detail = '呆滞物料折价处置，回笼资金计入现金预测第 4 周'; }
    else if (key === 'declareUninvoiced') { return applyFix(raw, 'R08', lib); }
    else if (key === 'cutEntertain') { d.cashScenario.cutEntertain = true; detail = '后四个月招待费按收入 5‰ 控制，日常费用支出相应下调'; }
    else if (key === 'negotiateAP') { d.cashScenario.delayAP = true; detail = '非关键供应商付款延后两周，现金预测已重排'; }
    else if (key === 'payCritical') { d.cashScenario.payCritical = true; detail = '有在途物料的供应商逾期款本周支付，其余按原到期日'; }
    else if (key === 'refinance') { d.cashScenario.refinance = true; detail = '到期短贷本金按中长期贷款置换，现金预测按新还款计划重排'; }
    else if (key === 'fixSocialBase') { d.cashScenario.fixSocialBase = true; detail = '下一缴费年度按工资表申报基数，每月社保支出增加'; }
    d.actions.push({ risk: riskId, key: key, label: act.label, detail: detail, amount: amount, seq: d.actions.length + 1 });
    d.log.push({ seq: d.log.length + 1, kind: 'risk', label: act.label, detail: rule.name + '：' + detail, amount: amount });
    return d;
  }

  /* ---------------- 13 周现金预测 ---------------- */
  function weekIndex(d, dateStr) { return Math.floor((ms(dateStr) - ms(d.cash.weekStart)) / DAY / 7); }
  function forecast(raw, scenario) {
    var d = normalize(raw), C = d.cash, X = d.external, L = d.ledger, P = L.months.length - 1;
    var sc = Object.assign({}, d.cashScenario, scenario || {});
    var N = C.weeks, today = ms(d.today), todayW = weekIndex(d, d.today);
    var weeks = []; for (var i = 0; i < N; i++) weeks.push({ w: i, start: dateOf(C.weekStart, i * 7), end: dateOf(C.weekStart, i * 7 + 6), label: short(dateOf(C.weekStart, i * 7)), inflow: 0, outflow: 0, items: [] });
    function put(w, amount, label, kind) { if (w < 0) w = todayW; if (w >= N) return; var k = weeks[w]; if (amount >= 0) k.inflow += amount; else k.outflow += -amount; k.items.push({ amount: r0(amount), label: label, kind: kind }); }
    // 应收回款
    C.arItems.forEach(function (a) {
      var due = ms(a.due), overdue = Math.round((today - due) / DAY);
      var w, amt = a.amount, note = '';
      if (overdue > 30) {
        if (sc.collectAhead) { w = todayW + 2; amt = a.amount * 0.8; note = '催收 · 80%'; }
        else if (overdue > 180) { w = todayW + 8; amt = a.amount * 0.4; note = '逾期 180 天以上 · 按 40% 预计'; }
        else if (overdue > 90) { w = todayW + 6; amt = a.amount * 0.6; note = '逾期 90 天以上 · 按 60% 预计'; }
        else { w = todayW + 3; amt = a.amount * 0.85; note = '逾期 · 按 85% 预计'; }
      } else { w = Math.max(todayW, weekIndex(d, dateOf(a.due, a.histDelay))); note = '账期 + 历史延迟 ' + a.histDelay + ' 天'; }
      put(w, amt, a.customer + ' ' + a.id + (note ? ' · ' + note : ''), 'ar');
    });
    // 在产订单交付后按账期回款
    C.orders.forEach(function (o) { put(weekIndex(d, dateOf(o.delivery, o.termDays)), o.amount, o.customer + ' ' + o.order + ' · 交付 ' + short(o.delivery) + ' 后 ' + o.termDays + ' 天', 'order'); });
    if (sc.rushOrder && C.rushOrder) put(weekIndex(d, dateOf(C.rushOrder.delivery, C.rushOrder.termDays)), C.rushOrder.amount, C.rushOrder.customer + ' ' + C.rushOrder.order + ' · 加急单', 'order');
    if (sc.disposeSlow) put(todayW + 4, 32000, '呆滞物料折价处置', 'other');
    // 窗口内新发生的业务：在产订单清单之后的交付按月均销售与账期回款；新采购按月均采购与付款账期付款
    if (C.recurring) {
      var rc = C.recurring, wk = 7 / 30.4;
      var firstSale = weekIndex(d, dateOf(rc.ordersUntil, rc.dsoDays));
      for (var ws = Math.max(todayW, firstSale); ws < N; ws++) put(ws, r0(rc.salesMonthly * wk), '后续交付按月均销售与账期预计回款', 'recur');
      var firstBuy = weekIndex(d, dateOf(d.today, rc.dpoDays));
      for (var wb = Math.max(todayW, firstBuy); wb < N; wb++) put(wb, -r0(rc.purchasesMonthly * wk), '新采购按月均采购与付款账期预计付款', 'recur');
    }
    // 应付
    C.apItems.forEach(function (a) {
      var w = weekIndex(d, a.due), overdue = (today - ms(a.due)) / DAY > 0;
      if (overdue) w = a.critical && sc.payCritical ? todayW : todayW + 1;
      if (sc.delayAP && !a.critical) w += 2;
      put(Math.max(todayW, w), -a.amount, a.supplier + ' ' + a.id + (overdue ? ' · 已逾期' : ' · 到期 ' + short(a.due)) + (sc.delayAP && !a.critical ? ' · 延后 2 周' : ''), 'ap');
    });
    // 固定支出
    C.fixed.forEach(function (f) {
      var amt = f.amount;
      if (f.key === 'opex' && sc.cutEntertain) amt = r0(amt * 0.9);
      if (f.key === 'payroll' && sc.fixSocialBase) amt = r0(amt + (X.payroll.gross[P] - X.payroll.socialBase[P]) * 0.26);
      if (f.dates) f.dates.forEach(function (dt) { put(weekIndex(d, dt), -amt, f.label + ' · ' + short(dt), 'fixed'); });
      else for (var mth = 0; mth < 4; mth++) { var base = d.today.slice(0, 7) + '-01'; var dt = dateOf(base, 0); var t = new Date(ms(dt)); t.setUTCMonth(t.getUTCMonth() + mth); t.setUTCDate(f.day); var ds = t.toISOString().slice(0, 10); if (ms(ds) >= today) put(weekIndex(d, ds), -amt, f.label + ' · ' + short(ds), 'fixed'); }
    });
    // 贷款
    X.loans.forEach(function (l) {
      for (var mth = 0; mth < 4; mth++) { var t = new Date(ms(d.today.slice(0, 7) + '-01')); t.setUTCMonth(t.getUTCMonth() + mth); t.setUTCDate(l.interestDay); var ds = t.toISOString().slice(0, 10); if (ms(ds) >= today) put(weekIndex(d, ds), -r0(l.principal * l.rate / 12), l.bank + ' ' + l.id + ' 利息 · ' + short(ds), 'loan'); }
      var dueW = weekIndex(d, l.due);
      if (dueW >= todayW && dueW < N) {
        if (sc.refinance && l.type.indexOf('流动') >= 0) put(dueW, 0, l.id + ' 本金 ' + fmtW(l.principal) + ' 以中长期贷款置换 · ' + short(l.due), 'loan');
        else put(dueW, -l.principal, l.bank + ' ' + l.id + ' 本金到期 · ' + short(l.due), 'loan');
      }
      if (l.installment) l.installment.months.forEach(function (mm) { var ds = (mm >= 9 ? '2026' : '2027') + '-' + String(mm).padStart(2, '0') + '-20'; var w = weekIndex(d, ds); if (w >= todayW && w < N) put(w, -l.installment.amount, l.bank + ' ' + l.id + ' 分期还本 · ' + short(ds), 'loan'); });
    });
    if (sc.loanDraw) { var lw = sc.loanDrawWeek != null ? sc.loanDrawWeek : todayW + 8; put(lw, sc.loanDraw, C.creditLine.bank + ' 授信提款 ' + fmtW(sc.loanDraw), 'loan'); for (var k = lw + 4; k < N; k += 4) put(k, -r0(sc.loanDraw * C.creditLine.rate / 12), '授信提款利息', 'loan'); }
    var bal = X.bank.balance[P + 1], minW = null, gapWeeks = [];
    weeks.forEach(function (w) { w.opening = r0(bal); bal += w.inflow - w.outflow; w.ending = r0(bal); w.inflow = r0(w.inflow); w.outflow = r0(w.outflow); w.net = w.inflow - w.outflow; if (minW == null || w.ending < weeks[minW].ending) minW = w.w; if (w.ending < C.safety) gapWeeks.push(w.w); w.items.sort(function (a, b) { return b.amount - a.amount; }); });
    var minEnd = weeks[minW].ending;
    return { weeks: weeks, opening: X.bank.balance[P + 1], safety: C.safety, minWeek: minW, minEnding: minEnd, gap: Math.max(0, C.safety - minEnd), gapWeeks: gapWeeks, scenario: sc, inflow: sum(weeks.map(function (w) { return w.inflow; })), outflow: sum(weeks.map(function (w) { return w.outflow; })), ending: last(weeks).ending };
  }
  function cashOptions(raw, lib) {
    var d = normalize(raw), C = d.cash;
    var base = forecast(d);
    var opts = [
      { key: 'A', name: '催收', desc: '逾期 30 天以上客户进入催收，按两周内 80% 到账预计', scenario: { collectAhead: true }, cost: 0, side: '客户关系承压，需销售配合' },
      { key: 'B', name: '延付', desc: '非关键供应商付款延后两周；有在途物料的供应商按期付', scenario: { delayAP: true }, cost: 0, side: '供应商信用记录，下次账期可能收紧' },
      { key: 'C', name: '融资', desc: C.creditLine.bank + ' 授信额度内提款，按需提用', scenario: { loanDraw: Math.min(C.creditLine.limit, Math.ceil(Math.max(base.gap, 100000) / 100000) * 100000), loanDrawWeek: Math.max(0, (base.gapWeeks[0] != null ? base.gapWeeks[0] : base.minWeek) - 1) }, side: '增加有息负债' }
    ];
    opts.forEach(function (o) {
      var f = forecast(d, o.scenario);
      if (o.key === 'C') { o.cost = r0(o.scenario.loanDraw * C.creditLine.rate / 12 * 3); o.desc = C.creditLine.bank + ' 授信提款 ' + fmtW(o.scenario.loanDraw) + '，缺口前一周提用，按 3 个月利息计'; }
      o.minEnding = f.minEnding; o.minWeek = f.minWeek; o.gap = f.gap; o.gapWeeks = f.gapWeeks.length; o.clears = f.gap === 0; o.ending = f.ending; o.forecast = f;
    });
    var ok = opts.filter(function (o) { return o.clears; });
    var pick, reason;
    if (base.gap === 0) { pick = opts.slice().sort(function (a, b) { return a.cost - b.cost || b.minEnding - a.minEnding; })[0]; reason = '当前 13 周最低现金 ' + fmtW(base.minEnding) + '（第 ' + (base.minWeek + 1) + ' 周）在安全线以上，暂不需要补缺；如需更多余量，' + pick.name + '可把最低点抬到 ' + fmtW(pick.minEnding) + (pick.cost ? '，利息成本 ' + fmtN(pick.cost) + ' 元' : '，不增加资金成本'); }
    else if (ok.length) { ok.sort(function (a, b) { return a.cost - b.cost || b.minEnding - a.minEnding; }); pick = ok[0]; reason = pick.name + '就能把 13 周内最低现金拉回安全线以上（最低 ' + fmtW(pick.minEnding) + '，第 ' + (pick.minWeek + 1) + ' 周）' + (pick.cost ? '，利息成本 ' + fmtN(pick.cost) + ' 元' : '，不增加资金成本') + '；' + pick.side; }
    else {
      var combo = forecast(d, { collectAhead: true, loanDraw: opts[2].scenario.loanDraw, loanDrawWeek: opts[2].scenario.loanDrawWeek });
      pick = opts.slice().sort(function (a, b) { return a.gap - b.gap; })[0];
      reason = '三个方案单独都填不平缺口，' + pick.name + '最接近（最低 ' + fmtW(pick.minEnding) + '）；催收与融资叠加后最低 ' + fmtW(combo.minEnding) + (combo.gap === 0 ? '，可回到安全线以上' : '，仍差 ' + fmtW(combo.gap));
      pick.combo = { minEnding: combo.minEnding, gap: combo.gap };
    }
    return { base: base, options: opts, recommend: pick.key, reason: reason };
  }
  function applyCashOption(raw, key, lib) {
    var d = ensure(raw), co = cashOptions(raw, lib);
    var o = co.options.filter(function (x) { return x.key === key; })[0]; if (!o) return d;
    Object.assign(d.cashScenario, o.scenario);
    d.log.push({ seq: d.log.length + 1, kind: 'cash', label: '现金方案 ' + o.key + ' · ' + o.name, detail: o.desc + '；执行后 13 周最低现金 ' + fmtW(o.minEnding), amount: o.cost || 0 });
    return d;
  }

  /* ---------------- 政策匹配 ---------------- */
  function policies(d, st, lib) {
    var L = d.ledger, X = d.external, pf = d.profile, P = L.months.length - 1, b1 = st.bs[P + 1];
    var rev12 = sum(st.pl.map(function (x) { return x.rev; })), ebt12 = sum(st.pl.map(function (x) { return x.ebt; })), rd12 = sum(L.pl.rdExp);
    var capex12 = sum(L.flows.capex);
    var env = { employees: pf.employees, assets: b1.assets, rev12: rev12, ebt12: ebt12, rdExp12: rd12, rdShare: 100 * rd12 / rev12, taxable12: ebt12 - rd12, capexEquip12: capex12, vatCredit: X.invoice.vatCredit || 0, highTech: !!pf.highTech, archetype: d.archetype, insuredStable: !!pf.insuredStable, exportRev12: pf.exportRev12 || 0, unionFee12: pf.unionFee12 || 0, trainingCert: pf.trainingCert || 0 };
    env.smallMicroOk = env.employees <= 300 && env.assets <= 50000000 && env.taxable12 <= 3000000;
    var citEff = env.smallMicroOk ? 0.05 : d.citRate;
    var sixTaxesBase = r0(rev12 * 0.0032);
    var amounts = {
      smallMicro: Math.max(0, env.taxable12) * (d.citRate - 0.05),
      rdDeduction: rd12 * 1.0 * citEff,
      highTech: Math.max(0, env.taxable12) * (d.citRate - 0.15),
      vatRefund: env.vatCredit,
      capexDeduction: capex12 * citEff,
      sixTaxes: sixTaxesBase * 0.5,
      stableJob: r0(X.payroll.gross[P] * 12 * 0.005 * 0.6),
      disability: 0,
      advancedMfg: r0(sum(X.invoice.inputVat) * 0.05),
      training: (env.trainingCert || 0) * 1500,
      exportRefund: r0(env.exportRev12 * 0.13 * 0.6),
      unionRefund: env.unionFee12
    };
    var listed = {}; d.policyList.forEach(function (id) { listed[id] = true; });
    var rows = lib.policies.policies.map(function (p) {
      var ok = !!evalExpr(p.cond, env);
      var status = ok ? (p.pending ? 'pending' : 'ok') : 'no';
      var amount = r0(amounts[p.amountKey] || 0);
      var reason;
      if (p.id === 'P01') reason = ok ? '从业 ' + env.employees + ' 人、资产 ' + fmtW(env.assets) + '、研发加计扣除后应纳税所得额 ' + fmtW(env.taxable12) + '，三项都在线内' : '应纳税所得额 ' + fmtW(env.taxable12) + ' 或资产、人数超出';
      else if (p.id === 'P02') reason = '近 12 期研发费用 ' + fmtW(rd12) + '，按 100% 加计、' + (citEff * 100) + '% 税率估';
      else if (p.id === 'P03') reason = '研发占比 ' + r1(env.rdShare) + '%' + (ok ? ' 达标，知识产权与审计报告待补' : ' 未达 3%');
      else if (p.id === 'P04') reason = ok ? '期末留抵 ' + fmtW(env.vatCredit) : '期末无留抵税额';
      else if (p.id === 'P05') reason = ok ? '本年度新购设备 ' + fmtW(capex12) + '，一次性扣除对应递延税额' : '本年度无新购设备';
      else if (p.id === 'P06') reason = ok ? '按房产税、土地使用税、印花税等年缴约 ' + fmtW(sixTaxesBase) + ' 的一半估' : '需先满足小型微利企业条件';
      else if (p.id === 'P07') reason = ok ? '参保人数稳定，按上年失业保险缴费 60% 估' : '参保人数有较大变化';
      else if (p.id === 'P08') reason = ok ? '在职 ' + env.employees + ' 人，免征' : '在职 ' + env.employees + ' 人，超过 30 人';
      else if (p.id === 'P09') reason = ok ? '按进项税额 5% 加计抵减估' : (env.highTech ? '制造业条件不符' : '需先取得高新技术企业资格');
      else if (p.id === 'P10') reason = env.trainingCert ? '已取证 ' + env.trainingCert + ' 人，按每人 1500 元估' : '本年度尚无取证记录，组织培训后可申报';
      else if (p.id === 'P11') reason = ok ? '出口收入 ' + fmtW(env.exportRev12) : '无自营出口，出口客户通过贸易公司结算';
      else reason = ok ? '已缴工会经费 ' + fmtW(env.unionFee12) + '，按全额返还估' : '未缴纳工会经费';
      return { id: p.id, name: p.name, level: p.level, status: status, amount: status === 'no' ? 0 : amount, reason: reason, condText: p.condText, window: p.window, need: p.need, cash: p.cash, deferred: !!p.deferred, listed: !!listed[p.id] };
    });
    var okRows = rows.filter(function (r) { return r.status === 'ok'; }), pend = rows.filter(function (r) { return r.status === 'pending'; });
    return { rows: rows, env: env, counts: { ok: okRows.length, pending: pend.length, no: rows.length - okRows.length - pend.length, listed: d.policyList.length }, amountOk: sum(okRows.map(function (r) { return r.amount; })), amountPending: sum(pend.map(function (r) { return r.amount; })), amountListed: sum(rows.filter(function (r) { return r.listed; }).map(function (r) { return r.amount; })) };
  }
  function togglePolicy(raw, id) { var d = ensure(raw); var i = d.policyList.indexOf(id); if (i >= 0) d.policyList.splice(i, 1); else d.policyList.push(id); return d; }

  /* ---------------- 驾驶舱 KPI 与月报 ---------------- */
  function kpi(d, st, rec, rk, fc, po) {
    var P = d.ledger.months.length - 1, p = st.pl[P], q = st.pl[P - 1], X = d.external;
    return { period: d.ledger.months[P], rev: p.rev, revMoM: q.rev ? r1(100 * (p.rev - q.rev) / q.rev) : 0, gm: r1(p.gm * 100), gmPrev: r1(q.gm * 100), nm: r1(p.nm * 100), netProfit: p.netProfit, cfo: st.cf[P].cfo, cash: X.bank.balance[P + 1], cashMonths: rk.cashMonths, arOverdue: rk.arOverdue, arOverdue90: rk.arOverdue90, anomalies: rec.counts.bad + rec.counts.warn, anomaliesBad: rec.counts.bad, fixed: rec.counts.fixed, risksHigh: rk.counts.high, risksMid: rk.counts.mid, minCash: fc.minEnding, minWeek: fc.minWeek, gap: fc.gap, policyAmount: po.amountOk, policyListed: po.amountListed, policyOk: po.counts.ok };
  }
  function report(d, st, rec, rk, fc, po) {
    var P = d.ledger.months.length - 1, p = st.pl[P], q = st.pl[P - 1], k = kpi(d, st, rec, rk, fc, po);
    var lines = [];
    lines.push('【财务月报】' + d.ledger.months[P].replace('-', ' 年 ') + ' 月 · ' + d.company);
    lines.push('收入 ' + fmtW(p.rev) + '（环比 ' + (k.revMoM >= 0 ? '+' : '') + k.revMoM + '%）· 毛利率 ' + k.gm + '%（上期 ' + k.gmPrev + '%）· 净利润 ' + fmtW(p.netProfit) + ' · 经营现金流 ' + fmtW(k.cfo));
    lines.push('三表勾稽：' + rec.counts.bad + ' 处异常 · ' + rec.counts.warn + ' 处差异 · 已调整 ' + rec.counts.fixed + ' 笔' + (rec.counts.bad ? '；待处理：' + rec.rows.filter(function (r) { return r.status === 'bad'; }).map(function (r) { return r.name; }).join('、') : ''));
    lines.push('风险：高 ' + rk.counts.high + ' 项 · 中 ' + rk.counts.mid + ' 项 · 已处置 ' + rk.counts.handled + ' 项；应收逾期 ' + fmtW(rk.arOverdue) + '，其中 90 天以上 ' + fmtW(rk.arOverdue90));
    lines.push('现金：账户余额 ' + fmtW(k.cash) + '，可用 ' + rk.cashMonths + ' 个月刚性支出；13 周最低点第 ' + (fc.minWeek + 1) + ' 周 ' + fmtW(fc.minEnding) + (fc.gap ? '，低于安全线 ' + fmtW(fc.gap) : '，在安全线以上'));
    lines.push('政策：可享 ' + po.counts.ok + ' 项 预计 ' + fmtW(po.amountOk) + ' · 待补材料 ' + po.counts.pending + ' 项' + (po.counts.listed ? ' · 已加入申报清单 ' + po.counts.listed + ' 项 ' + fmtW(po.amountListed) : ''));
    if (d.log.length) lines.push('本期处置：' + d.log.map(function (l) { return l.label; }).join('；'));
    var todo = [];
    rec.rows.filter(function (r) { return r.status === 'bad' && !r.fixed; }).forEach(function (r) { todo.push(r.name + '：' + (r.fix ? r.fix.label : '核实')); });
    rk.rows.filter(function (r) { return r.level === 'high' && !r.handled.length; }).slice(0, 3).forEach(function (r) { todo.push(r.name + '：' + r.actions[0].label); });
    po.rows.filter(function (r) { return r.status === 'pending'; }).slice(0, 2).forEach(function (r) { todo.push(r.name + '：补 ' + r.need[0]); });
    if (todo.length) lines.push('待办：' + todo.join('；'));
    return { lines: lines, text: lines.join('\n'), todo: todo, kpi: k };
  }

  /* ---------------- 一次算全 ---------------- */
  function run(raw, lib) {
    var d = normalize(raw);
    var st = statements(d);
    var rec = reconcile(d, st, lib);
    var rk = risks(d, st, lib);
    var fc = forecast(d);
    var po = policies(d, st, lib);
    var k = kpi(d, st, rec, rk, fc, po);
    var rep = report(d, st, rec, rk, fc, po);
    return { version: VERSION, data: d, statements: st, reconcile: rec, risks: rk, forecast: fc, policies: po, kpi: k, report: rep };
  }

  /* ---------------- 对话与文档摄入 ----------------
     screens / brief / suggest / ask / ingest 五个导出：纯函数，只认入参，不碰 DOM、window、时钟与随机数。
     result 是 run(data, lib) 的结果，可选：传了就用，没传自己算一次。答不上返回 null，不编数。
     回答里的 blocks 是平台中立的纯数据（kv / table / tags / text），act 是声明式动作（goto / focus / open / apply / set）。
     选中态（当前勾稽条 / 风险条 / 周）不在契约里，内核按数据默认取：勾稽取异常里排在前面的一条（都正常取头一条）、
     风险取按 概率 × 影响 排在前面的一条、周取头一个缺口周（无缺口取最低点那一周）。
     cashOptions 与 forecast 的第二遍测算都走入参 data（未落账的原副本），不走 result.data，避免调整分录二次落账。 */
  var SCREENS = [['connect', '接入'], ['board', '财务驾驶舱'], ['recon', '三表勾稽'], ['risk', '风险预警'], ['cash', '现金预测'], ['policy', '政策与月报']];
  var STAT_NAME = { ok: '正常', warn: '差异', bad: '异常', na: '不适用' };
  var PSTAT_NAME = { ok: '满足', pending: '待补材料', no: '不符' };
  var SRC_NAME = { finance: '科目余额', bank: '银行流水', invoice: '发票数据', erp: 'ERP 库存', payroll: '工资社保' };
  var CAP_NAMES = ['三表勾稽', '风险预警', '现金预测', '政策匹配'];
  /* 「够不够」这类疑问句只测算、只把方案卡点亮；「执行 / 按方案 X」才写回本期处置 */
  var RUN_WORDS = ['执行', '就按', '按方案', '照方案', '用方案', '采用', '落实', '写回', '照这个', '选这个'];
  var TB_MAP = [
    [/库存现金|银行存款|货币资金|其他货币/, 'cash', '货币资金'],
    [/应收账款/, 'ar', '应收账款'],
    [/库存商品|原材料|在产品|发出商品|存货/, 'inventory', '存货'],
    [/预付账款/, 'prepaid', '预付账款'],
    [/应付账款/, 'ap', '应付账款'],
    [/应付职工薪酬/, 'wagesPayable', '应付职工薪酬'],
    [/应交税费/, 'taxesPayable', '应交税费'],
    [/短期借款/, 'shortLoan', '短期借款'],
    [/长期借款/, 'longLoan', '长期借款']
  ];

  function ctxOf(data, lib, result) { return (result && result.kpi && result.data && result.reconcile && result.forecast && result.policies) ? result : run(data, lib); }
  /* 六屏只用 U+2212 一种减号：fmtW 的万元分支与百分数走的是 ASCII 短横，这里统一换成长横 */
  function neg(s) { return String(s).replace(/-/g, '−'); }
  /* 整段文本里只换负号，不碰 2026-09-17、K-017、SO-2607 这类带短横的编号与日期 */
  function negText(s) { return String(s == null ? '' : s).replace(/(^|[^0-9A-Za-z])-(?=[0-9.])/g, '$1−'); }
  function W(n) { return neg(fmtW(n)); }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function has(q, arr) { for (var i = 0; i < arr.length; i++) if (q.indexOf(arr[i]) >= 0) return true; return false; }
  function kvB(rows) { return { type: 'kv', rows: rows }; }
  function tableB(head, rows) { return { type: 'table', head: head, rows: rows }; }
  function tagsB(items) { return { type: 'tags', items: items }; }
  function textB(t) { return { type: 'text', text: t }; }
  function screens() { return SCREENS.map(function (s) { return { key: s[0], label: s[1] }; }); }
  function badRows(R) { return R.reconcile.rows.filter(function (r) { return r.status === 'bad'; }); }
  function curRule(R) { var b = badRows(R); return b.length ? b[0] : R.reconcile.rows[0]; }
  function curRisk(R) { return R.risks.rows[0]; }
  function curWeekIdx(R) { var f = R.forecast; return f.gapWeeks.length ? f.gapWeeks[0] : f.minWeek; }
  function rowById(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
  function optOf(list, key) { return list.filter(function (x) { return x.key === key; })[0] || null; }
  function rv(r) { return r.unit === '元' ? W(r.value) : neg(r.value) + r.unit; }
  function rband(r) { return r.unit === '元' ? W(r.band[0]) + ' – ' + W(r.band[1]) : neg(r.band[0]) + '–' + neg(r.band[1]) + r.unit; }
  function gapText(R) { var f = R.forecast; return f.gap ? '第 ' + (f.minWeek + 1) + ' 周现金 ' + W(f.minEnding) + '，低于安全线 ' + W(f.gap) : '13 周低点 ' + W(f.minEnding) + '，在安全线以上'; }
  function lastBS(R) { var bs = R.statements.bs; return bs[bs.length - 1]; }
  function askRun(q) { return has(q, RUN_WORDS); }
  /* 问句里点名了哪一项：按名字的二元组命中数打分，命中 2 组以上才算 */
  function byNameHit(q, list) {
    var best = null, bestN = 0;
    list.forEach(function (x) {
      var nm = String(x.name || ''), n = 0, i;
      for (i = 0; i + 1 < nm.length; i++) if (q.indexOf(nm.substr(i, 2)) >= 0) n++;
      if (n > bestN) { bestN = n; best = x; }
    });
    return bestN >= 2 ? { row: best, n: bestN } : null;
  }
  function byName(q, list) { var r = byNameHit(q, list); return r ? r.row : null; }
  function weekItems(w) { return tableB(['项目', '金额'], w.items.slice(0, 4).map(function (it) { return [cut(it.label, 16), (it.amount < 0 ? '−' : '+') + fmtN(Math.abs(it.amount))]; })); }

  /* 开场发现：进这一屏先说一条从数据里算出来的话 */
  function brief(step, data, lib, result) {
    var R = ctxOf(data, lib, result), k = R.kpi, rec = R.reconcile, rk = R.risks, f = R.forecast, po = R.policies, m = rec.metrics;
    if (step === 'connect') return '银行对账单余额 ' + W(m.bankBalance) + '，账面货币资金 ' + W(m.cashLedger) + '，差 ' + W(Math.abs(m.bankBalance - m.cashLedger)) + '，这笔要在勾稽里落账。';
    if (step === 'board') return gapText(R) + '；本期收入 ' + W(k.rev) + '（环比 ' + (k.revMoM >= 0 ? '+' : '') + neg(k.revMoM) + '%），经营现金流 ' + W(k.cfo) + '。';
    if (step === 'recon') {
      var b = badRows(R);
      if (!b.length) return rec.rows.length + ' 条勾稽关系全部在容差内，本期无需调整。';
      var r3 = rec.rows.filter(function (r) { return r.id === 'R03' && r.status !== 'ok'; })[0], r7 = rec.rows.filter(function (r) { return r.id === 'R07' && r.status !== 'ok'; })[0];
      if (r3 && r7) return '一笔到账货款 ' + W(Math.abs(r3.diff)) + '没入账，同时抬高应收、压低账面现金，R03 与 R07 是同一件事。';
      return b[0].id + ' ' + b[0].name + '差 ' + W(Math.abs(b[0].diff)) + '，容差 ' + fmtN(b[0].tol) + ' 元，' + b.length + ' 处异常里数额居前。';
    }
    if (step === 'risk') { var t = rk.rows[0]; return t.id + ' ' + t.name + '：概率 ' + Math.round(t.prob * 100) + '%，影响 ' + W(t.impact) + '；指标 ' + rv(t) + '，参考 ' + rband(t) + '。'; }
    if (step === 'cash') {
      var co = cashOptions(data, lib), pick = optOf(co.options, co.recommend);
      if (f.gap) return '第 ' + (f.minWeek + 1) + ' 周现金 ' + W(f.minEnding) + '，缺口 ' + W(f.gap) + '，' + f.gapWeeks.length + ' 周低于安全线；方案 ' + pick.key + ' ' + pick.name + '能拉回 ' + W(pick.minEnding) + '。';
      return '13 周低点 ' + W(f.minEnding) + '（第 ' + (f.minWeek + 1) + ' 周），高于安全线 ' + W(f.minEnding - f.safety) + '，窗口内无缺口周。';
    }
    if (step === 'policy') {
      var ok = po.rows.filter(function (p) { return p.status === 'ok'; }).sort(function (a, b2) { return b2.amount - a.amount; });
      if (!ok.length) return po.rows.length + ' 项政策按账套核对后暂无可享项，待补材料 ' + po.counts.pending + ' 项。';
      return '可享 ' + po.counts.ok + ' 项预计 ' + W(po.amountOk) + '，其中' + ok[0].name + '预计 ' + W(ok[0].amount) + '；待补材料 ' + po.counts.pending + ' 项。';
    }
    return null;
  }

  /* 快捷问句：每屏 3–4 条，条条都能被 ask 答上 */
  function suggest(step, data, lib, result) {
    if (step === 'connect') return ['哪些来源是直连的', '账面和银行差多少', '进财务驾驶舱'];
    if (step === 'board') return ['哪一周现金吃紧', '毛利率为什么降', '勾稽异常有几处', '先处理哪一件'];
    if (step === 'recon') return ['哪几条异常', 'R03 为什么差', '按建议调整', '看银行未达账项'];
    if (step === 'risk') return ['高风险有哪几项', 'K09 依据是什么', '影响一共多少钱', '处置这一条'];
    if (step === 'cash') return ['缺口多少', '哪一周吃紧', '催收够不够', '授信提款能补上吗'];
    if (step === 'policy') return ['可享多少钱', '待补什么材料', '加入研发费用加计扣除', '月报说了什么'];
    return [];
  }

  /* 勾稽 / 风险 / 政策三张卡片的统一措辞，本屏与全局点名共用 */
  function ruleCard(rr, step) {
    return { text: rr.id + ' ' + rr.name + '（' + rr.pair + '）：' + (rr.status === 'na' ? '本企业无此科目。' : rr.lhsLabel + ' ' + fmtN(rr.lhs) + ' 元，' + rr.rhsLabel + ' ' + fmtN(rr.rhs) + ' 元，差 ' + fmtN(rr.diff) + ' 元，容差 ' + fmtN(rr.tol) + ' 元。' + rr.explain + '。'),
      blocks: [kvB([['判断', STAT_NAME[rr.status]], ['差异', fmtN(rr.diff) + ' 元'], ['建议', rr.fixed ? '已调整' : rr.fix ? rr.fix.label + ' ' + fmtN(rr.fix.amount) + ' 元' : '核实原始凭证']])],
      ref: step === 'recon' ? rr.id : null, act: { type: 'open', panel: 'rule', ref: rr.id } };
  }
  /* 点名字问到的那一条：措辞比点编号短一截，不重复关系对，本屏问时不带小表 */
  function ruleCardNamed(nn, step, blocks) {
    var out = { text: nn.id + ' ' + nn.name + '：' + (nn.status === 'na' ? '本企业无此科目。' : nn.lhsLabel + ' ' + fmtN(nn.lhs) + ' 元，' + nn.rhsLabel + ' ' + fmtN(nn.rhs) + ' 元，差 ' + fmtN(nn.diff) + ' 元，' + STAT_NAME[nn.status] + '。' + nn.explain + '。'),
      ref: step === 'recon' ? nn.id : null, act: { type: 'open', panel: 'rule', ref: nn.id } };
    if (blocks) out.blocks = [kvB([['判断', STAT_NAME[nn.status]], ['差异', fmtN(nn.diff) + ' 元'], ['建议', nn.fixed ? '已调整' : nn.fix ? nn.fix.label + ' ' + fmtN(nn.fix.amount) + ' 元' : '核实原始凭证']])];
    return out;
  }
  function riskCard(kr, step) {
    return { text: kr.id + ' ' + kr.name + '：' + kr.metricLabel + ' ' + rv(kr) + '，参考 ' + rband(kr) + '，概率 ' + Math.round(kr.prob * 100) + '%，影响 ' + W(kr.impact) + '（' + kr.impactNote + '）。\n' + kr.evidence[0] + '。',
      blocks: [tagsB(kr.evidence.slice(1, 4).map(function (e) { return cut(e, 22); }))],
      ref: step === 'risk' ? kr.id : null, act: { type: 'open', panel: 'risk', ref: kr.id } };
  }
  function policyCard(pr, step) {
    return { text: pr.name + '（' + pr.level + '）：' + PSTAT_NAME[pr.status] + '。' + pr.reason + '。' + (pr.amount ? '预计 ' + W(pr.amount) + '，申报窗口 ' + pr.window + '。' : ''),
      blocks: [tagsB(pr.need.slice(0, 3))],
      ref: step === 'policy' ? pr.id : null, act: { type: 'open', panel: 'policy', ref: pr.id } };
  }
  function cashOption(co, i, q) {
    var o = co.options[i];
    var other = co.options.filter(function (x) { return x.clears && x.key !== o.key; })[0];
    var addon = o.clears || !other ? '' : '，补平要叠加方案 ' + other.key + ' ' + other.name;
    if (askRun(q)) return { text: '已按方案 ' + o.key + ' ' + o.name + '执行：13 周低点 ' + W(o.minEnding) + (o.clears ? '，回到安全线以上。' : '，仍差 ' + W(o.gap) + addon + '。'),
      act: { type: 'apply', action: 'applyCashOption', input: { key: o.key } } };
    return { text: '方案 ' + o.key + ' ' + o.name + '：13 周低点 ' + W(o.minEnding) + '，' + (o.clears ? '回到安全线以上' : '仍差 ' + W(o.gap) + '，单靠这一条补不平' + addon) + '；' + (o.cost ? '利息 ' + fmtN(o.cost) + ' 元' : '不增加资金成本') + '，' + o.side + '。这一步只做测算，本期处置未动。',
      act: { type: 'open', panel: 'option', ref: o.key } };
  }

  /* 问答：认得的问法逐条作答，答不上返回 null 交给平台兜底 */
  function ask(question, step, data, lib, result) {
    var R = ctxOf(data, lib, result), k = R.kpi, rec = R.reconcile, rk = R.risks, f = R.forecast, po = R.policies, d = R.data;
    var q = String(question == null ? '' : question), m, i;

    /* 点名某条勾稽关系 */
    m = q.match(/R\s*0?(\d{1,2})/i);
    if (m) {
      var rr = rowById(rec.rows, 'R' + (m[1].length < 2 ? '0' + m[1] : m[1]));
      if (rr) return ruleCard(rr, step);
    }
    /* 点名某条风险 */
    m = q.match(/K\s*0?(\d{1,2})/i);
    if (m) {
      var kr = rowById(rk.rows, 'K' + (m[1].length < 2 ? '0' + m[1] : m[1]));
      if (kr) return riskCard(kr, step);
    }
    /* 点名某项政策 */
    m = q.match(/P\s*0?(\d{1,2})/i);
    if (m) {
      var pr = rowById(po.rows, 'P' + (m[1].length < 2 ? '0' + m[1] : m[1]));
      if (pr) return policyCard(pr, step);
    }
    /* 点名某一周 */
    m = q.match(/第\s*(\d{1,2})\s*周/);
    if (m) {
      var wi = Math.max(0, Math.min(f.weeks.length - 1, (+m[1]) - 1)), ww = f.weeks[wi];
      return { text: '第 ' + (wi + 1) + ' 周（' + ww.label + ' 起）：期初 ' + W(ww.opening) + '，流入 ' + W(ww.inflow) + '，流出 ' + W(ww.outflow) + '，周末 ' + W(ww.ending) + (ww.ending < f.safety ? '，低于安全线 ' + W(f.safety - ww.ending) + '。' : '。'),
        blocks: [weekItems(ww)], act: { type: 'open', panel: 'week', ref: wi } };
    }
    /* 换屏 */
    if (has(q, ['进财务驾驶舱', '驾驶舱', '开始分析'])) return { text: '本期收入 ' + W(k.rev) + '，勾稽异常 ' + rec.counts.bad + ' 处，高风险 ' + rk.counts.high + ' 项，' + gapText(R) + '。', act: { type: 'goto', step: 'board' } };

    if (step === 'connect') {
      if (has(q, ['直连', '来源', '同步', '导入', '几个'])) {
        var dir = d.sources.filter(function (s) { return s.mode === 'direct'; });
        return { text: '共 ' + d.sources.length + ' 个来源，系统直连 ' + dir.length + ' 个，其余表格导入；合计 ' + fmtN(d.sources.reduce(function (t, s) { return t + s.rows; }, 0)) + ' 条。',
          blocks: [tableB(['来源', '方式', '条数'], d.sources.map(function (s) { return [SRC_NAME[s.id] || cut(s.name, 8), s.mode === 'direct' ? '直连' : '导入', fmtN(s.rows)]; }))] };
      }
      if (has(q, ['差多少', '对账单', '银行', '货币资金'])) {
        var mm = rec.metrics;
        return { text: '银行对账单 ' + fmtN(mm.bankBalance) + ' 元，账面货币资金 ' + fmtN(mm.cashLedger) + ' 元，差 ' + fmtN(mm.bankBalance - mm.cashLedger) + ' 元，落在 R07。',
          blocks: [kvB([['对账单余额', fmtN(mm.bankBalance) + ' 元'], ['账面货币资金', fmtN(mm.cashLedger) + ' 元'], ['差额', fmtN(mm.bankBalance - mm.cashLedger) + ' 元']])],
          act: { type: 'open', panel: 'rule', ref: 'R07' } };
      }
      if (has(q, ['能力', '开通', '能做'])) return { text: '已开通 4 项：' + CAP_NAMES.join('、') + '。' };
      if (has(q, ['账期', '几期', '期间'])) return { text: '账期 ' + d.period.replace('-', ' 年 ') + ' 月，取近 12 期科目余额与流量；' + d.ledger.months[0].replace('-', '.') + ' 至 ' + d.period.replace('-', '.') + '。' };
    }

    if (step === 'board') {
      if (has(q, ['最紧', '吃紧', '哪一周', '缺口', '现金'])) return { text: gapText(R) + (f.gapWeeks.length ? '，缺口周：' + f.gapWeeks.map(function (x) { return '第 ' + (x + 1) + ' 周'; }).join('、') : '') + '。',
        blocks: [tableB(['周', '周末余额'], f.weeks.slice(0, 6).map(function (x, idx) { return ['第 ' + (idx + 1) + ' 周', fmtN(x.ending)]; }))],
        act: { type: 'open', panel: 'week', ref: f.gapWeeks.length ? f.gapWeeks[0] : f.minWeek } };
      if (has(q, ['毛利', '为什么降', '收入'])) {
        var l3 = R.statements.pl.slice(-3);
        return { text: '本期收入 ' + W(k.rev) + '，环比 ' + (k.revMoM >= 0 ? '+' : '') + neg(k.revMoM) + '%；毛利率 ' + k.gm + '%，上期 ' + k.gmPrev + '%。近三期 ' + l3.map(function (p) { return (Math.round(p.gm * 1000) / 10) + '%'; }).join(' → ') + '。',
          blocks: [tableB(['期间', '收入', '毛利率'], l3.map(function (p) { return [p.label, fmtN(Math.round(p.rev / 10000)) + ' 万', (Math.round(p.gm * 1000) / 10) + '%']; }))] };
      }
      if (has(q, ['异常', '勾稽', '几处'])) return { text: '勾稽 ' + rec.rows.length + ' 条，异常 ' + rec.counts.bad + ' 处、正常 ' + rec.counts.ok + ' 条，已调整 ' + rec.counts.fixed + ' 笔。',
        blocks: [tableB(['编号', '关系', '差异'], badRows(R).slice(0, 5).map(function (r) { return [r.id, cut(r.name, 10), fmtN(r.diff)]; }))],
        act: { type: 'goto', step: 'recon' } };
      if (has(q, ['先处理', '建议', '哪一件', '怎么办', '优先'])) {
        var t2 = rk.rows[0], b2 = badRows(R)[0];
        return { text: '先看 ' + t2.id + ' ' + t2.name + '：概率 ' + Math.round(t2.prob * 100) + '%、影响 ' + W(t2.impact) + '，动作是' + t2.actions[0].label + '；勾稽这边先调 ' + (b2 ? b2.id + ' ' + b2.name : '无') + '。',
          act: { type: 'open', panel: 'risk', ref: t2.id } };
      }
      if (has(q, ['风险', '高风险'])) return { text: '高 ' + rk.counts.high + ' 项、中 ' + rk.counts.mid + ' 项、已处置 ' + rk.counts.handled + ' 项；影响合计 ' + W(rk.rows.reduce(function (t, r) { return t + r.impact; }, 0)) + '。',
        blocks: [tableB(['编号', '风险', '影响'], rk.rows.slice(0, 5).map(function (r) { return [r.id, cut(r.name, 8), W(r.impact)]; }))], act: { type: 'goto', step: 'risk' } };
      if (has(q, ['政策', '可享', '退税'])) return { text: '可享 ' + po.counts.ok + ' 项预计 ' + W(po.amountOk) + '，待补材料 ' + po.counts.pending + ' 项。', act: { type: 'goto', step: 'policy' } };
    }

    if (step === 'recon') {
      var cur = curRule(R);
      if (has(q, ['哪几条', '哪些异常', '异常', '几处'])) return { text: rec.counts.bad + ' 处异常：' + badRows(R).map(function (r) { return r.id + ' ' + r.name + ' 差 ' + fmtN(r.diff) + ' 元'; }).join('；') + '。',
        blocks: [tableB(['编号', '关系', '差异'], badRows(R).map(function (r) { return [r.id, cut(r.name, 10), fmtN(r.diff)]; }))],
        ref: badRows(R).length ? badRows(R)[0].id : null };
      if (has(q, ['为什么', '怎么回事', '原因', '依据'])) return { text: cur.id + ' ' + cur.name + '：' + cur.lhsLabel + ' ' + fmtN(cur.lhs) + ' 元，' + cur.rhsLabel + ' ' + fmtN(cur.rhs) + ' 元。' + cur.explain + '。' + (rec.reasons.filter(function (t) { return t.indexOf('同源') >= 0; }).length && (cur.id === 'R03' || cur.id === 'R07') ? '\n' + rec.reasons.filter(function (t) { return t.indexOf('同源') >= 0; })[0] + '。' : ''),
        ref: cur.id };
      if (has(q, ['调整', '分录', '按建议', '改过来', '落账'])) {
        if (cur.fixed) return { text: cur.id + ' 已生成调整分录，待会计复核。', ref: cur.id };
        if (!cur.fix) return { text: cur.id + ' ' + cur.name + '没有可自动生成的分录，需要会计核对原始凭证。', ref: cur.id };
        return { text: '已按建议生成分录：' + cur.fix.label + ' ' + fmtN(cur.fix.amount) + ' 元。' + cur.fix.entry.map(function (e) { return e.join(' '); }).join('；') + '，三表与月报已重算。',
          blocks: [tableB(['方向', '科目', '金额'], cur.fix.entry)],
          act: { type: 'apply', action: 'applyFix', input: { rule: cur.id } } };
      }
      if (has(q, ['下钻', '明细', '未达', '单据', '看看'])) {
        if (!cur.drill) return null;
        var dr2 = cur.drill;
        return { text: cur.id + ' 下钻：' + dr2.title + '，' + (dr2.type === 'table' ? dr2.rows.length + ' 条。' : (dr2.rows.length + ' 项。')),
          blocks: [dr2.type === 'table' ? tableB(dr2.cols.slice(0, 4), dr2.rows.slice(0, 5).map(function (r) { return r.slice(0, 4); })) : tableB(['项目', '金额'], dr2.rows)],
          ref: cur.id, act: { type: 'open', panel: 'drill', ref: cur.id } };
      }
      var nn = byName(q, rec.rows);
      if (nn) return ruleCardNamed(nn, step, false);
      if (has(q, ['资产', '负债', '权益', '平不平'])) return { text: '资产总计 ' + fmtN(rec.metrics.assets) + ' 元 = 负债 ' + fmtN(rec.metrics.liabilities) + ' 元 + 所有者权益 ' + fmtN(rec.metrics.equity) + ' 元，R01 ' + STAT_NAME[rec.rows[0].status] + '。' };
    }

    if (step === 'risk') {
      var cr = curRisk(R);
      if (has(q, ['高风险', '哪几项', '哪些风险'])) {
        var hi = rk.rows.filter(function (r) { return r.level === 'high'; });
        return { text: hi.length ? '高风险 ' + hi.length + ' 项：' + hi.map(function (r) { return r.id + ' ' + r.name + '（概率 ' + Math.round(r.prob * 100) + '%、影响 ' + W(r.impact) + '）'; }).join('；') + '。' : '当前无高风险项，中风险 ' + rk.counts.mid + ' 项。',
          blocks: [tableB(['编号', '风险', '概率', '影响'], rk.rows.slice(0, 5).map(function (r) { return [r.id, cut(r.name, 8), Math.round(r.prob * 100) + '%', W(r.impact)]; }))],
          ref: hi.length ? hi[0].id : null };
      }
      if (has(q, ['一共', '合计', '多少钱', '影响'])) return { text: '影响金额合计 ' + W(rk.rows.reduce(function (t, r) { return t + r.impact; }, 0)) + '，高风险占 ' + W(rk.rows.filter(function (r) { return r.level === 'high'; }).reduce(function (t, r) { return t + r.impact; }, 0)) + '；应收逾期 ' + W(rk.arOverdue) + '，其中 90 天以上 ' + W(rk.arOverdue90) + '。' };
      if (has(q, ['依据', '证据', '为什么', '怎么算'])) return { text: cr.id + ' ' + cr.name + '：' + cr.metricLabel + ' ' + rv(cr) + '，参考 ' + rband(cr) + (cr.inBand ? '，在参考带内，按影响金额列入关注。' : '，超出参考带。') + '\n' + cr.evidence.slice(0, 2).join('；') + '。',
        ref: cr.id };
      if (has(q, ['处置', '怎么办', '执行', '动作'])) {
        var todo = cr.actions.filter(function (a) { return !cr.handled.filter(function (x) { return x.key === a.key; }).length; });
        if (!todo.length) return { text: cr.id + ' ' + cr.name + ' 的处置动作都已执行，概率已下调到 ' + Math.round(cr.prob * 100) + '%。', ref: cr.id };
        var a0 = todo[0];
        return { text: '按 ' + cr.id + ' ' + cr.name + ' 执行「' + a0.label + '」：' + a0.desc + '。执行后概率下调，现金预测与月报一起重算。',
          act: { type: 'apply', action: 'applyRiskAction', input: { risk: cr.id, key: a0.key } } };
      }
      var nr = byName(q, rk.rows);
      if (nr && !has(q, ['逾期', '应收'])) return { text: nr.id + ' ' + nr.name + '：' + nr.metricLabel + ' ' + rv(nr) + '，参考 ' + rband(nr) + '，概率 ' + Math.round(nr.prob * 100) + '%，影响 ' + W(nr.impact) + '。\n' + nr.evidence[0] + '。',
        ref: nr.id, act: { type: 'open', panel: 'risk', ref: nr.id } };
      if (has(q, ['逾期', '应收', '客户'])) {
        var over = rk.aging.filter(function (a) { return a.overdueDays > 0; }).sort(function (a, b3) { return b3.overdueDays - a.overdueDays; });
        var k01 = rowById(rk.rows, 'K01') || rk.rows[0];
        return { text: '应收逾期 ' + W(rk.arOverdue) + '，90 天以上 ' + W(rk.arOverdue90) + '；逾期 ' + over.length + ' 笔。',
          blocks: [tableB(['单号', '客户', '金额', '逾期'], over.slice(0, 4).map(function (a) { return [a.id, cut(a.customer, 12), fmtN(a.amount), a.overdueDays + ' 天']; }))],
          act: { type: 'open', panel: 'risk', ref: k01.id } };
      }
    }

    if (step === 'cash') {
      var co = cashOptions(data, lib), wi2 = curWeekIdx(R), wkc = f.weeks[wi2];
      if (has(q, ['缺口', '差多少', '多少钱'])) return { text: f.gap ? '缺口 ' + W(f.gap) + '：13 周低点第 ' + (f.minWeek + 1) + ' 周 ' + W(f.minEnding) + '，安全线 ' + W(f.safety) + '，' + f.gapWeeks.length + ' 周低于安全线。' : '窗口内无缺口周，13 周低点 ' + W(f.minEnding) + '，高于安全线 ' + W(f.minEnding - f.safety) + '。',
        act: { type: 'open', panel: 'kpi', ref: 'gap' } };
      if (has(q, ['最紧', '吃紧', '哪一周', '哪周'])) return { text: '第 ' + (f.minWeek + 1) + ' 周（' + f.weeks[f.minWeek].label + ' 起）吃紧，周末 ' + W(f.minEnding) + '；当周流出 ' + W(f.weeks[f.minWeek].outflow) + '。',
        blocks: [weekItems(f.weeks[f.minWeek])],
        act: { type: 'open', panel: 'week', ref: f.minWeek } };
      if (has(q, ['催收', '方案 A', '方案A'])) return cashOption(co, 0, q);
      if (has(q, ['延付', '方案 B', '方案B'])) return cashOption(co, 1, q);
      if (has(q, ['授信', '提款', '100 万', '100万'])) {
        var lw = Math.max(0, (f.gapWeeks[0] != null ? f.gapWeeks[0] : f.minWeek) - 1);
        var f2 = forecast(data, { loanDraw: 1000000, loanDrawWeek: lw });
        var ic = Math.round(1000000 * d.cash.creditLine.rate / 12 * 3);
        return { text: '授信提款 100 万元（第 ' + (lw + 1) + ' 周提用）后：13 周低点 ' + W(f2.minEnding) + (f2.gap ? '，仍差 ' + W(f2.gap) : '，回到安全线以上') + '；按 ' + (d.cash.creditLine.rate * 100).toFixed(1) + '% 年化、用满三个月算利息 ' + fmtN(ic) + ' 元。已把这个开关打开重算。',
          act: { type: 'set', path: 'cashScenario.loanDraw', value: 1000000 } };
      }
      if (has(q, ['融资', '方案 C', '方案C', '贷款', '额度'])) {
        var oc = co.options[2], runC = askRun(q);
        return { text: '方案 C ' + oc.name + '：' + d.cash.creditLine.bank + '授信额度 ' + W(d.cash.creditLine.limit) + '，按缺口提用 ' + W(oc.scenario.loanDraw) + '（第 ' + (oc.scenario.loanDrawWeek + 1) + ' 周），13 周低点 ' + W(oc.minEnding) + '，利息 ' + fmtN(oc.cost) + ' 元。' + (runC ? '已写回本期处置。' : '本期处置未动。'),
          act: runC ? { type: 'apply', action: 'applyCashOption', input: { key: 'C' } } : { type: 'open', panel: 'option', ref: 'C' } };
      }
      if (has(q, ['推荐', '选哪个', '哪个方案', '怎么办'])) {
        var pk = optOf(co.options, co.recommend);
        return { text: '推荐方案 ' + pk.key + ' ' + pk.name + '：13 周低点 ' + W(pk.minEnding) + (pk.cost ? '，利息 ' + fmtN(pk.cost) + ' 元' : '，不增加资金成本') + '；' + pk.side + '。',
          blocks: [tableB(['方案', '低点', '缺口周', '成本'], co.options.map(function (o) { return [o.key + ' ' + o.name, W(o.minEnding), o.gapWeeks + ' 周', o.cost ? fmtN(o.cost) : '0']; }))],
          act: { type: 'apply', action: 'applyCashOption', input: { key: co.recommend } } };
      }
      if (has(q, ['本周', '这一周', '明细', '收付'])) return { text: '第 ' + (wi2 + 1) + ' 周流入 ' + W(wkc.inflow) + '、流出 ' + W(wkc.outflow) + '、净额 ' + W(wkc.net) + '，' + wkc.items.length + ' 笔。',
        blocks: [tableB(['项目', '金额'], wkc.items.slice(0, 5).map(function (it) { return [cut(it.label, 16), (it.amount < 0 ? '−' : '+') + fmtN(Math.abs(it.amount))]; }))],
        act: { type: 'open', panel: 'week', ref: wi2 } };
    }

    if (step === 'policy') {
      if (has(q, ['多少钱', '可享', '合计', '预计'])) return { text: '可享 ' + po.counts.ok + ' 项预计 ' + W(po.amountOk) + '，待补材料 ' + po.counts.pending + ' 项预计 ' + W(po.amountPending) + '，已加入清单 ' + po.counts.listed + ' 项。',
        blocks: [tableB(['政策', '核对', '预计金额'], po.rows.filter(function (p) { return p.status !== 'no'; }).slice(0, 5).map(function (p) { return [cut(p.name, 10), PSTAT_NAME[p.status], p.amount ? fmtN(p.amount) : '—']; }))] };
      if (has(q, ['待补', '材料', '缺什么'])) {
        var pend = po.rows.filter(function (p) { return p.status === 'pending'; });
        return { text: pend.length ? '待补材料 ' + pend.length + ' 项：' + pend.map(function (p) { return p.name + '（补 ' + p.need[0] + '）'; }).join('；') + '。' : '没有待补材料的政策。',
          blocks: pend.length ? [tableB(['政策', '需补', '窗口'], pend.map(function (p) { return [cut(p.name, 10), cut(p.need[0], 10), p.window]; }))] : null,
          ref: pend.length ? pend[0].id : null };
      }
      if (has(q, ['加入', '清单', '申报'])) {
        var cand = po.rows.filter(function (p) { return p.status === 'ok' && !p.listed; }).sort(function (a, b4) { return b4.amount - a.amount; });
        var target = byName(q, po.rows) || cand[0];
        if (!target) return { text: '可享政策都已在申报清单里，合计预计 ' + W(po.amountListed) + '。' };
        return { text: '已把' + target.name + (target.listed ? '移出' : '加入') + '申报清单，预计 ' + W(target.amount) + '；材料要 ' + target.need.slice(0, 2).join('、') + '。',
          act: { type: 'apply', action: 'togglePolicy', input: { id: target.id } } };
      }
      var np = byName(q, po.rows);
      if (np) return policyCard(np, step);
      if (has(q, ['月报', '报告', '说了什么', '发给'])) return { text: negText(R.report.lines.slice(1, 4).join('\n')),
        blocks: [tagsB(R.report.todo.slice(0, 3).map(function (t) { return cut(t, 18); }))] };
      if (has(q, ['研发', '加计'])) return { text: '近 12 期研发费用 ' + W(po.env.rdExp12) + '，占收入 ' + Math.round(po.env.rdShare * 10) / 10 + '%；按 100% 加计扣除，预计 ' + W((rowById(po.rows, 'P02') || { amount: 0 }).amount) + '。' };
    }

    /* 全局：点名字问某一条勾稽关系 / 某一项风险 / 某一项政策，不在本屏也能答并跳过去 */
    var gl = [byNameHit(q, rec.rows), byNameHit(q, rk.rows), byNameHit(q, po.rows)], gi = -1, gn = 0;
    for (i = 0; i < 3; i++) if (gl[i] && gl[i].n > gn) { gn = gl[i].n; gi = i; }
    if (gi === 0) return ruleCardNamed(gl[0].row, step, true);
    if (gi === 1) return riskCard(gl[1].row, step);
    if (gi === 2) return policyCard(gl[2].row, step);
    return null;
  }

  /* ---------------- 文档摄入 ----------------
     科目余额表 → 逐科目与账面比对；合同 → 首期款进 13 周现金预测；经营 PPT → 与账面口径比对；邮件 → 应付逾期口径比对 */
  function colIdx(head, res) {
    var i, j;
    for (j = 0; j < res.length; j++) for (i = 0; i < head.length; i++) if (res[j].test(head[i])) return i;
    return -1;
  }
  function numOf(s) { var v = parseFloat(String(s == null ? '' : s).replace(/[,，\s元]/g, '')); return isNaN(v) ? null : v; }
  function docTrialBalance(doc, R) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || s0.rows.length < 2) return null;
    var head = (s0.rows[0] || []).map(function (x) { return String(x).trim(); });
    var iName = colIdx(head, [/科目名称/, /科目$/, /名称/]);
    var iEnd = colIdx(head, [/期末余额/, /期末/, /余额$/]);
    var iBeg = colIdx(head, [/期初余额/, /期初/]);
    var iDr = colIdx(head, [/本期借方|借方发生|借方/]);
    var iCr = colIdx(head, [/本期贷方|贷方发生|贷方/]);
    if (iName < 0 || iEnd < 0) return null;
    var body = s0.rows.slice(1).filter(function (r) { return String(r[iName] || '').trim(); });
    if (!body.length) return null;
    var b = lastBS(R), agg = {}, checked = 0, off = [];
    body.forEach(function (r) {
      var name = String(r[iName]).trim(), end = numOf(r[iEnd]);
      if (end == null) return;
      if (iBeg >= 0 && iDr >= 0 && iCr >= 0) {
        var bg = numOf(r[iBeg]), dr = numOf(r[iDr]), cr = numOf(r[iCr]);
        if (bg != null && dr != null && cr != null) {
          checked++;
          if (Math.abs(bg + dr - cr - end) > 1 && Math.abs(bg - dr + cr - end) > 1) off.push(name);
        }
      }
      TB_MAP.forEach(function (mp) { if (mp[0].test(name)) { agg[mp[1]] = agg[mp[1]] || { key: mp[1], name: mp[2], doc: 0, items: [] }; agg[mp[1]].doc += end; agg[mp[1]].items.push(name); } });
    });
    var rows = Object.keys(agg).map(function (k2) { var a = agg[k2]; a.book = b[k2] || 0; a.diff = a.doc - a.book; return a; });
    if (!rows.length) return null;
    rows.sort(function (x, y) { return Math.abs(y.diff) - Math.abs(x.diff); });
    var top = rows[0];
    var lines = ['Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + body.length + ' 行科目，表头 ' + head.slice(0, 6).join(' / ') + '。'];
    if (checked) lines.push('逐行核对期初 ± 本期发生额 = 期末：' + checked + ' 行' + (off.length ? '，' + off.join('、') + ' 不平' : '全部相等') + '。');
    lines.push('与账面逐科目比对：' + rows.map(function (r) { return r.name + ' 导入 ' + fmtN(r.doc) + '、账面 ' + fmtN(r.book) + '、差 ' + fmtN(r.diff); }).slice(0, 3).join('；') + '。');
    lines.push('差额居前的是' + top.name + ' ' + fmtN(top.diff) + ' 元；这张表覆盖 ' + rows.length + ' 个科目，其余 ' + R.reconcile.rows.length + ' 条勾稽关系仍按原账面核对。');
    var cmp = tableB(['科目', '导入期末', '账面', '差异'], rows.map(function (r) { return [r.name, fmtN(r.doc), fmtN(r.book), fmtN(r.diff)]; }));
    return { text: lines.join('\n'), blocks: [cmp],
      act: { type: 'open', panel: 'trial', ref: 'R07', sheet: s0.name, file: doc.name, checked: checked, balanced: !off.length,
        rows: rows.map(function (r) { return { name: r.name, doc: r.doc, book: r.book, diff: r.diff }; }), blocks: [cmp] } };
  }
  function docSheet(doc) {
    var s0 = (doc.sheets || [])[0];
    return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + (s0 ? s0.rows.length : 0) + ' 行，表头 ' + ((s0 && s0.rows[0]) || []).slice(0, 6).join(' / ') + '。\n没有科目名称与期末余额两列，进不了逐科目核对；核对要的列是 科目编码 / 科目名称 / 期初余额 / 本期借方 / 本期贷方 / 期末余额。',
      blocks: s0 ? [tableB(s0.rows[0].slice(0, 4), s0.rows.slice(1, 5).map(function (r) { return r.slice(0, 4); }))] : null };
  }
  /* 付款期次：先读付款表，再退到正文的「首付 30%」；税率不当付款比例用 */
  function payFirst(doc, txt, total) {
    var tabs = doc.tables || [], i, j;
    for (i = 0; i < tabs.length; i++) for (j = 0; j < tabs[i].length; j++) {
      var r = (tabs[i][j] || []).map(function (x) { return String(x).trim(); });
      if (!/首付|首期|预付|定金|签约/.test(r[0] || '')) continue;
      var pct = null, amt = null;
      r.forEach(function (c) {
        var mp = c.match(/^(\d{1,3})\s*%$/);
        if (mp) { pct = +mp[1]; return; }
        var v = numOf(c);
        if (v != null && v >= 1000) amt = v;
      });
      if (amt || pct) return { amount: amt || Math.round(total * pct / 100), pct: pct, from: r[0] };
    }
    var m2 = txt.match(/(?:首付|首期|预付|定金)[^0-9]{0,6}(\d{1,3})\s*%/);
    if (m2) return { amount: Math.round(total * (+m2[1]) / 100), pct: +m2[1], from: '首付' };
    return null;
  }
  function docContract(doc, txt, R, data) {
    var amt = txt.match(/(?:合同金额|金额|价款|总价)[^0-9]{0,8}([\d][\d,，.]*)\s*元/) || txt.match(/(?:CNY|RMB|人民币)\s*([\d][\d,.]*)/i);
    var money = (txt.match(/[\d][\d,]{4,}(?:\.\d+)?\s*元/g) || []);
    var vat = txt.match(/含税\s*(\d{1,2})\s*%/) || txt.match(/Tax\s*(\d{1,2})\s*%/i);
    var due = txt.match(/(20\d{2})\s*[年\-]\s*(\d{1,2})\s*[月\-]\s*(\d{1,2})/);
    var total = amt ? numOf(amt[1]) : (money.length ? numOf(money[0]) : null);
    if (!total) return null;
    var pay = payFirst(doc, txt, total);
    var dueStr = due ? due[1] + '-' + String(+due[2]).padStart(2, '0') + '-' + String(+due[3]).padStart(2, '0') : null;
    var rate = vat ? +vat[1] : 13;
    var b = lastBS(R);
    var lines = [(doc.kind === 'pdf' ? 'PDF' : 'Word') + '《' + doc.name + '》读完：合同金额 ' + fmtN(total) + ' 元' + (vat ? '（含税 ' + vat[1] + '%）' : '') + (dueStr ? '，交付期限 ' + dueStr : '') + '。'];
    if (pay) lines.push(pay.from + ' ' + (pay.pct ? pay.pct + '% · ' : '') + fmtN(pay.amount) + ' 元，已按 2026-09-30 到期排进 13 周现金预测。');
    else lines.push('没读到付款期次，现金预测不动；下面只做账面比对。');
    lines.push('账面应付账款 ' + fmtN(b.ap) + ' 元，这笔合同占 ' + (Math.round(1000 * total / Math.max(1, b.ap)) / 10) + '%；不含税 ' + fmtN(Math.round(total / (1 + rate / 100))) + ' 元计入采购成本。');
    var kv = [['合同金额', fmtN(total) + ' 元']];
    if (vat) kv.push(['税率', vat[1] + '%']);
    if (dueStr) kv.push(['交付期限', dueStr]);
    if (pay) kv.push([pay.from, fmtN(pay.amount) + ' 元']);
    kv.push(['账面应付', fmtN(b.ap) + ' 元']);
    var blocks = [kvB(kv), money.length ? tagsB(money.slice(0, 4)) : null];
    if (!pay) return { text: lines.join('\n'), blocks: blocks,
      act: { type: 'open', panel: 'doc', ref: doc.name, title: '合同解析 · ' + doc.name, sub: fmtN(total) + ' 元 · ' + doc.sizeText,
        blocks: [kvB(kv), textB((doc.text || '').slice(0, 600))] } };
    var d2 = ensure(data);
    d2.cash.apItems.push({ id: 'AP-DOC1', supplier: '合同乙方', amount: pay.amount, due: '2026-09-30', critical: false });
    d2.log.push({ seq: d2.log.length + 1, kind: 'cash', label: '合同首期进预测', detail: '《' + doc.name + '》合同金额 ' + fmtN(total) + ' 元，' + pay.from + ' ' + fmtN(pay.amount) + ' 元按 2026-09-30 到期', amount: pay.amount });
    return { text: lines.join('\n'), blocks: blocks, data: d2,
      act: { type: 'apply', action: 'ingest', input: { doc: doc }, step: 'cash' } };
  }
  function docSlides(doc, R) {
    var txt = (doc.text || '').replace(/\s+/g, ' ');
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var mRev = txt.match(/收入[^0-9]{0,6}([\d,.]+)\s*万元/);
    var mGm = txt.match(/毛利率[^0-9]{0,4}([\d.]+)\s*%/);
    var mDso = txt.match(/(?:应收账款周转|周转)[^0-9]{0,4}(\d+)\s*天/);
    var k = R.kpi, st = R.statements;
    var rev12 = st.pl.reduce(function (t, p) { return t + p.rev; }, 0);
    if (!mRev && !mGm) return { text: 'PPT《' + doc.name + '》读完：' + (doc.slides || []).length + ' 页，标题「' + (titles[0] || '—') + '」。没读到收入或毛利率口径，账面数字不动。', blocks: [tagsB(titles.slice(0, 4))] };
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，首页「' + (titles[0] || '—') + '」。'];
    var kv = [];
    if (mRev) { var rev = Math.round(parseFloat(mRev[1].replace(/,/g, '')) * 10000); lines.push('文档收入 ' + mRev[1] + ' 万元，账面近 12 期 ' + W(rev12) + '，差 ' + W(rev - rev12) + '。'); kv.push(['文档收入', mRev[1] + ' 万元'], ['账面 12 期', W(rev12)]); }
    if (mGm) { lines.push('文档毛利率 ' + mGm[1] + '%，账面本期 ' + k.gm + '%，差 ' + neg(Math.round((parseFloat(mGm[1]) - k.gm) * 10) / 10) + ' 个百分点。'); kv.push(['文档毛利率', mGm[1] + '%'], ['账面毛利率', k.gm + '%']); }
    if (mDso) { var dso = Math.round(365 * lastBS(R).ar / Math.max(1, rev12)); lines.push('文档应收周转 ' + mDso[1] + ' 天，按账面应收与 12 期收入算 ' + dso + ' 天。'); kv.push(['文档周转', mDso[1] + ' 天'], ['账面周转', dso + ' 天']); }
    return { text: lines.join('\n'), blocks: [kvB(kv), tagsB(titles.slice(0, 3))],
      act: { type: 'open', panel: 'kpi', ref: 'gm' } };
  }
  function docMail(doc, R) {
    var ml = doc.mail || {}, txt = (doc.text || '').replace(/\s+/g, ' ');
    var wan = (txt.match(/([\d][\d,.]*)\s*万元/g) || []);
    var mAp = txt.match(/应付账款[^0-9]{0,6}([\d,.]+)\s*万元/);
    var mOver = txt.match(/(?:过期|逾期)[^0-9]{0,6}([\d,.]+)\s*万元/);
    var b = lastBS(R), k08 = rowById(R.risks.rows, 'K08');
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + (wan.length ? '，金额 ' + wan.join('、') : '') + '。'];
    var kv = [['发件', ml.from || '—'], ['主题', cut(ml.subject || '—', 14)], ['日期', ml.date || '—']];
    if (mAp) { var ap = Math.round(parseFloat(mAp[1].replace(/,/g, '')) * 10000); lines.push('邮件里本期应付 ' + mAp[1] + ' 万元，账面应付账款 ' + W(b.ap) + '，差 ' + W(b.ap - ap) + '。'); kv.push(['邮件应付', mAp[1] + ' 万元'], ['账面应付', W(b.ap)]); }
    if (mOver) { var ov = Math.round(parseFloat(mOver[1].replace(/,/g, '')) * 10000); lines.push('邮件里过期 ' + mOver[1] + ' 万元，K08 应付逾期口径 ' + W(k08 ? k08.value : 0) + '，差 ' + W((k08 ? k08.value : 0) - ov) + '。'); kv.push(['邮件过期', mOver[1] + ' 万元'], ['K08 逾期', W(k08 ? k08.value : 0)]); }
    if (!mAp && !mOver) lines.push('没读到应付或逾期金额，风险这一屏不动。');
    if (!mAp && !mOver) return { text: lines.join('\n'), blocks: [kvB(kv)],
      act: { type: 'open', panel: 'doc', ref: doc.name, title: ml.subject || doc.name, sub: (ml.from || '—') + ' · ' + (ml.date || '') + ' · ' + doc.sizeText, blocks: [textB(doc.text || '')] } };
    return { text: lines.join('\n'), blocks: [kvB(kv)],
      act: { type: 'open', panel: 'risk', ref: k08 ? k08.id : R.risks.rows[0].id } };
  }
  function ingest(doc, step, data, lib, result) {
    if (!doc || !doc.ok) return null;
    var R = ctxOf(data, lib, result), txt = (doc.text || '').replace(/\s+/g, ' ');
    if (doc.kind === 'excel') return docTrialBalance(doc, R) || docSheet(doc);
    if (doc.kind === 'ppt') return docSlides(doc, R);
    if (doc.kind === 'eml') return docMail(doc, R);
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') return docContract(doc, txt, R, data);
    return null;
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS,
    ensure: ensure, normalize: normalize, statements: statements, metrics: metrics, reconcile: reconcile, applyFix: applyFix,
    risks: risks, applyRiskAction: applyRiskAction, arAging: arAging,
    forecast: forecast, cashOptions: cashOptions, applyCashOption: applyCashOption,
    policies: policies, togglePolicy: togglePolicy, kpi: kpi, report: report, run: run,
    screens: screens, brief: brief, suggest: suggest, ask: ask, ingest: ingest,
    fmtN: fmtN, fmtW: fmtW, short: short, dateOf: dateOf, monthLabel: monthLabel, evalExpr: evalExpr
  };
});
