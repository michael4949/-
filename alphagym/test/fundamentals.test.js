import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  toReport, visibleAt, latestAt, metricsAt, screenFundamentals,
  timeMachine, priceAt, forwardReturn, FUND_PRESETS,
} from '../src/fundamentals.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUND = JSON.parse(readFileSync(join(ROOT, 'data/cn_fundamentals.json'), 'utf8'));
const STOCKS = JSON.parse(readFileSync(join(ROOT, 'data/cn_stocks.json'), 'utf8'));

const fund = FUND.items;
const codes = Object.keys(fund);
const barsByCode = Object.fromEntries(STOCKS.items.map(s =>
  [s.symbol, s.rows.map(r => ({ t: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] }))]));
const barsOf = (c) => barsByCode[c];
const priceOf = (c, ts) => (barsByCode[c] ? priceAt(barsByCode[c], ts) : null);

const DAY = 86400000;

test('数据自带「合成数据」标记，消费方不可能误当真实行情', () => {
  assert.equal(FUND.synthetic, true);
  assert.equal(STOCKS.synthetic, true);
  assert.match(FUND.disclaimer, /非真实行情/);
});

test('每只股票都有财报，字段顺序与生成器一致', () => {
  assert.ok(codes.length >= 20, `只有 ${codes.length} 只`);
  assert.deepEqual(FUND.fields, ['period', 'endTs', 'disclTs', 'revenue', 'netProfit',
    'equity', 'assets', 'liabilities', 'cashFlow', 'shares']);
  for (const c of codes) {
    assert.ok(fund[c].reports.length >= 4, c);
    const r = toReport(fund[c].reports[0]);
    assert.ok(r.revenue > 0 && r.equity > 0, c);
  }
});

/* ══════════════════════════════════════════════════════════════
   这一组是整个模块存在的理由：披露日必须严格生效。
   拿一份当时还没公布的报表去解释当时的股价，是回测里最致命的
   未来函数 —— 它不报错、不崩溃，只让历史表现好得不真实。
   ══════════════════════════════════════════════════════════════ */

test('披露日晚于报告期末 —— 数据本身就必须满足这个前提', () => {
  for (const c of codes) {
    for (const row of fund[c].reports) {
      const r = toReport(row);
      assert.ok(r.disclTs > r.endTs, `${c} ${r.period} 披露日不晚于报告期末`);
    }
  }
});

test('visibleAt 绝不返回尚未披露的报告', () => {
  const c = codes[0];
  const all = fund[c].reports.map(toReport);
  for (const r of all) {
    // 披露前一天：这一期必须看不见
    const before = visibleAt(fund, c, r.disclTs - DAY);
    assert.ok(!before.some(x => x.period === r.period),
      `${r.period} 在披露日前一天就能看到 —— 未来函数`);
    // 披露当天：必须看得见
    const after = visibleAt(fund, c, r.disclTs);
    assert.ok(after.some(x => x.period === r.period), `${r.period} 披露当天却看不到`);
  }
});

test('在报告期末当天，那一期还看不见（这正是最容易踩的坑）', () => {
  let checked = 0;
  for (const c of codes.slice(0, 8)) {
    for (const row of fund[c].reports) {
      const r = toReport(row);
      const seen = visibleAt(fund, c, r.endTs);
      assert.ok(!seen.some(x => x.period === r.period),
        `${c} 的 ${r.period} 在报告期末当天就可见了 —— 它要一个多月后才公布`);
      checked++;
    }
  }
  assert.ok(checked > 50);
});

test('metricsAt 的每个指标都只用得到当时看得见的报表', () => {
  const c = codes[0];
  const all = fund[c].reports.map(toReport);
  const target = all[6];
  const m = metricsAt(fund, c, target.disclTs);
  assert.equal(m.period, target.period, '最新一期应当正好是刚披露的那一期');
  // 往前挪一天，最新一期必须回退
  const m2 = metricsAt(fund, c, target.disclTs - DAY);
  assert.notEqual(m2.period, target.period);
});

test('选股结果随时点变化 —— 说明它真的按当时的信息在选', () => {
  const rules = [{ field: 'roe', op: '>=', value: 0.10 }];
  const early = screenFundamentals(fund, priceOf, rules, Date.UTC(2020, 5, 30));
  const late = screenFundamentals(fund, priceOf, rules, Date.UTC(2022, 5, 30));
  assert.ok(early.rows.length > 0 && late.rows.length > 0);
  const a = early.rows.map(r => `${r.code}:${r.period}`).join();
  const b = late.rows.map(r => `${r.code}:${r.period}`).join();
  assert.notEqual(a, b, '两个时点选出来完全一样，说明时点根本没生效');
});

test('时点早于任何披露日时，选不出任何东西（而不是报错）', () => {
  const r = screenFundamentals(fund, priceOf, [{ field: 'roe', op: '>=', value: 0 }], 0);
  assert.equal(r.rows.length, 0);
  assert.equal(r.skipped, r.universe);
});

/* ── 指标计算 ── */

test('ROE / 净利率 / 负债率 与手算一致', () => {
  const c = codes[0];
  const asOf = Date.UTC(2022, 0, 1);
  const rs = visibleAt(fund, c, asOf);
  const m = metricsAt(fund, c, asOf);
  const ttm = rs.slice(-4);
  const rev = ttm.reduce((a, r) => a + r.revenue, 0);
  const np = ttm.reduce((a, r) => a + r.netProfit, 0);
  const last = rs[rs.length - 1];
  assert.ok(Math.abs(m.roe - np / last.equity) < 1e-12);
  assert.ok(Math.abs(m.netMargin - np / rev) < 1e-12);
  assert.ok(Math.abs(m.debtRatio - last.liabilities / last.assets) < 1e-12);
});

test('用 TTM 而不是单季 —— 否则季节性会造出一堆假信号', () => {
  const c = codes[0];
  const asOf = Date.UTC(2022, 0, 1);
  const rs = visibleAt(fund, c, asOf);
  const m = metricsAt(fund, c, asOf);
  const single = rs[rs.length - 1].revenue;
  assert.ok(m.revenue > single * 3, 'TTM 营收应当约等于四个季度之和');
});

test('由亏转盈时不给同比增速，而不是给一个天文数字', () => {
  const fake = {
    X: { display: 'T', sector: 'T', reports: [
      ['2022Q1', Date.UTC(2022, 2, 31), Date.UTC(2022, 3, 30), 100, -50, 1000, 2000, 1000, -10, 100],
      ['2022Q2', Date.UTC(2022, 5, 30), Date.UTC(2022, 7, 30), 100, -50, 1000, 2000, 1000, -10, 100],
      ['2022Q3', Date.UTC(2022, 8, 30), Date.UTC(2022, 9, 31), 100, -50, 1000, 2000, 1000, -10, 100],
      ['2022Q4', Date.UTC(2022, 11, 31), Date.UTC(2023, 3, 30), 100, -50, 1000, 2000, 1000, -10, 100],
      ['2023Q1', Date.UTC(2023, 2, 31), Date.UTC(2023, 3, 30), 100, 50, 1000, 2000, 1000, 10, 100],
      ['2023Q2', Date.UTC(2023, 5, 30), Date.UTC(2023, 7, 30), 100, 50, 1000, 2000, 1000, 10, 100],
      ['2023Q3', Date.UTC(2023, 8, 30), Date.UTC(2023, 9, 31), 100, 50, 1000, 2000, 1000, 10, 100],
      ['2023Q4', Date.UTC(2023, 11, 31), Date.UTC(2024, 3, 30), 100, 50, 1000, 2000, 1000, 10, 100],
    ] },
  };
  const m = metricsAt(fake, 'X', Date.UTC(2024, 5, 1));
  assert.equal(m.profitYoY, null, '由亏转盈的同比增速没有意义，应当返回 null');
  assert.ok(Number.isFinite(m.revYoY));
});

test('PE / PB 需要价格；没有价格时为 null 而不是 NaN', () => {
  const c = codes[0];
  const asOf = Date.UTC(2022, 0, 1);
  const noPx = metricsAt(fund, c, asOf);
  assert.equal(noPx.pe, null);
  const withPx = metricsAt(fund, c, asOf, priceOf(c, asOf));
  assert.ok(withPx.pe === null || Number.isFinite(withPx.pe));
});

/* ── 财报时光机 ── */

test('时光机只给出当时可见的报表，下一期只给日期不给数字', () => {
  const c = codes[0];
  const asOf = Date.UTC(2021, 6, 15);
  const tm = timeMachine(fund, c, asOf, barsOf(c));
  assert.ok(tm.ok);
  for (const r of tm.seen) assert.ok(r.disclTs <= asOf);
  assert.ok(tm.next, '应当有下一期在路上');
  assert.ok(tm.next.disclTs > asOf);
  // next 里绝不能出现财务数字
  assert.deepEqual(Object.keys(tm.next).sort(), ['daysAway', 'disclTs', 'endTs', 'period']);
  assert.equal(tm.next.revenue, undefined);
  assert.equal(tm.next.netProfit, undefined);
});

test('时光机的「揭晓」是单独一块，不会混进当时可见的数据里', () => {
  const c = codes[0];
  const asOf = Date.UTC(2021, 6, 15);
  const tm = timeMachine(fund, c, asOf, barsOf(c));
  assert.ok(tm.reveal, '应当能揭晓');
  assert.equal(tm.reveal.report.period, tm.next.period);
  assert.ok(tm.reveal.report.disclTs > asOf, '揭晓的正是当时还看不到的那一期');
  assert.ok(!tm.seen.some(r => r.period === tm.reveal.report.period));
});

test('priceAt 取的是该时刻之前最后一根，绝不取未来', () => {
  const bars = barsOf(codes[0]);
  const i = 200;
  assert.equal(priceAt(bars, bars[i].t), bars[i].c);
  assert.equal(priceAt(bars, bars[i].t - 1), bars[i - 1].c);
  assert.equal(priceAt(bars, 0), null);
});

/* ── 选股有效性 ── */

test('每个内置方案都能选出东西', () => {
  const asOf = Date.UTC(2022, 0, 1);
  for (const p of FUND_PRESETS) {
    const r = screenFundamentals(fund, priceOf, p.rules, asOf);
    assert.ok(r.rows.length > 0, `方案「${p.name}」一只都选不出来`);
  }
});

test('筛出来的每一行都真的满足条件', () => {
  const asOf = Date.UTC(2022, 0, 1);
  const rules = [{ field: 'roe', op: '>=', value: 0.12 }, { field: 'debtRatio', op: '<=', value: 0.6 }];
  const r = screenFundamentals(fund, priceOf, rules, asOf);
  for (const row of r.rows) {
    assert.ok(row.roe >= 0.12, `${row.display} ROE ${row.roe} 不满足条件`);
    assert.ok(row.debtRatio <= 0.6, `${row.display} 负债率 ${row.debtRatio} 不满足条件`);
  }
});

test('forwardReturn 用的是选股时点之后的真实走势', () => {
  const asOf = Date.UTC(2021, 0, 4);
  const r = screenFundamentals(fund, priceOf, [{ field: 'roe', op: '>=', value: 0.10 }], asOf);
  const fwd = forwardReturn(r.rows.map(x => x.code), barsOf, asOf, 120);
  assert.ok(fwd && fwd.n > 0);
  assert.ok(Number.isFinite(fwd.mean) && Number.isFinite(fwd.median));
  assert.ok(fwd.upRate >= 0 && fwd.upRate <= 1);
  // 逐只核对一只
  const one = fwd.detail[0];
  const bars = barsOf(one.code);
  let i = -1;
  for (let k = 0; k < bars.length; k++) if (bars[k].t <= asOf) i = k; else break;
  assert.ok(Math.abs(one.ret - (bars[i + 120].c / bars[i].c - 1)) < 1e-12);
});

test('高 ROE 组合确实跑赢全市场 —— 否则财务选股演示不出任何东西', () => {
  const asOf = Date.UTC(2021, 0, 4);
  const good = screenFundamentals(fund, priceOf, [{ field: 'roe', op: '>=', value: 0.13 }], asOf);
  const all = screenFundamentals(fund, priceOf, [], asOf);
  const fGood = forwardReturn(good.rows.map(x => x.code), barsOf, asOf, 240);
  const fAll = forwardReturn(all.rows.map(x => x.code), barsOf, asOf, 240);
  assert.ok(fGood && fAll);
  assert.ok(fGood.n >= 3, `高 ROE 组只有 ${fGood.n} 只，样本太少`);
  assert.ok(fGood.median > fAll.median,
    `高 ROE 组中位收益 ${(fGood.median * 100).toFixed(1)}% 没跑赢全市场 ${(fAll.median * 100).toFixed(1)}%`);
});
