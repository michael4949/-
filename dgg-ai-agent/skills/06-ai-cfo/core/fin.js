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

  var VERSION = '1.1.0';
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

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS,
    ensure: ensure, normalize: normalize, statements: statements, metrics: metrics, reconcile: reconcile, applyFix: applyFix,
    risks: risks, applyRiskAction: applyRiskAction, arAging: arAging,
    forecast: forecast, cashOptions: cashOptions, applyCashOption: applyCashOption,
    policies: policies, togglePolicy: togglePolicy, kpi: kpi, report: report, run: run,
    fmtN: fmtN, fmtW: fmtW, short: short, dateOf: dateOf, monthLabel: monthLabel, evalExpr: evalExpr
  };
});
