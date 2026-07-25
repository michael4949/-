/**
 * 撮合引擎测试。
 *
 * 重点不在「能不能成交」，而在**成交假设是否始终偏向保守**。
 * 任何乐观的成交假设都会系统性高估用户水平，而这种错误不会让产品变难看，
 * 只会让用户更高兴 —— 因此必须逐条钉死。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchingEngine, OrderType, RULES_FUTURES, RULES_STOCK } from '../src/matching.js';

const DAY = 86400000;
/** 造一段可控的 K 线 */
function mk(specs) {
  return specs.map((s, i) => ({
    t: (s.day ?? i) * DAY, o: s.o, h: s.h, l: s.l, c: s.c, v: 1,
    ...(s.limitUp ? { limitUp: true } : {}), ...(s.limitDown ? { limitDown: true } : {}),
  }));
}
const INS = { symbol: 'T', multiplier: 10, tickSize: 1, feeRate: 0, feePerUnit: 0, slippageTicks: 0 };
const INS_COST = { symbol: 'T', multiplier: 10, tickSize: 1, feeRate: 0.001, feePerUnit: 2, slippageTicks: 1 };

function eng(bars, opts = {}) {
  return new MatchingEngine({ bars, instrument: INS, rules: RULES_FUTURES, initialCash: 100000, ...opts });
}

test('市价单在下一根开盘成交，绝不在提交当根成交', () => {
  const bars = mk([
    { o: 100, h: 102, l: 99, c: 101 },
    { o: 105, h: 107, l: 104, c: 106 },
  ]);
  const e = eng(bars);
  e.step(0);                                     // 先走完第 0 根，游标 = 0
  const o = e.submit({ type: OrderType.MARKET, dir: 1, qty: 1 });
  assert.equal(o.submittedAt, 0);
  e.step(1);
  assert.equal(o.fillPrice, 105, '应在第 1 根开盘价成交，而不是第 0 根的任何价格');
  assert.equal(e.position, 1);
});

test('限价买单：只在最低价触及时成交；开盘跳空更低则按更优的开盘价成交', () => {
  const bars = mk([
    { o: 100, h: 101, l: 99, c: 100 },
    { o: 98, h: 99, l: 95, c: 96 },     // 开盘 98 已低于限价 99
  ]);
  const e = eng(bars);
  e.step(0);
  const o = e.submit({ type: OrderType.LIMIT, dir: 1, qty: 1, price: 99 });
  e.step(1);
  assert.equal(o.fillPrice, 98, '跳空低开时应拿到更优的开盘价');
});

test('限价买单：价格未触及则不成交', () => {
  const bars = mk([
    { o: 100, h: 101, l: 99, c: 100 },
    { o: 102, h: 105, l: 101, c: 104 },
  ]);
  const e = eng(bars);
  e.step(0);
  const o = e.submit({ type: OrderType.LIMIT, dir: 1, qty: 1, price: 95 });
  e.step(1);
  assert.equal(o.status, 'pending');
  assert.equal(e.position, 0);
});

test('停损单触发后吃滑点（止损滑点必须体现）', () => {
  const bars = mk([
    { o: 100, h: 101, l: 99, c: 100 },
    { o: 100, h: 106, l: 99, c: 105 },
  ]);
  const e = new MatchingEngine({ bars, instrument: INS_COST, rules: RULES_FUTURES, initialCash: 100000 });
  e.step(0);
  const o = e.submit({ type: OrderType.STOP, dir: 1, qty: 1, price: 103 });
  e.step(1);
  assert.equal(o.fillPrice, 104, '触发价 103 + 1 tick 滑点 = 104');
});

test('同一根内止损与止盈都可能触发时，判定为止损先成交（最不利假设）', () => {
  const bars = mk([
    { o: 100, h: 101, l: 99, c: 100 },
    { o: 100, h: 100, l: 100, c: 100 },   // 建仓根
    { o: 100, h: 120, l: 80, c: 110 },    // 巨幅波动，止损止盈同时可及
  ]);
  const e = eng(bars);
  e.step(0);
  e.submit({ type: OrderType.MARKET, dir: 1, qty: 1, stopLoss: 90, takeProfit: 110 });
  e.step(1);
  assert.equal(e.position, 1);
  e.step(2);
  assert.equal(e.position, 0, '仓位应已了结');
  const t = e.closedTrades[0];
  assert.ok(t.exitPrice <= 90, `应按止损价 90 出场，实际 ${t.exitPrice} —— 乐观假设会系统性高估用户`);
  assert.ok(t.pnl < 0);
});

test('盈亏计算正确：含合约乘数、手续费与滑点', () => {
  const bars = mk([
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 110, h: 110, l: 110, c: 110 },
  ]);
  const e = new MatchingEngine({ bars, instrument: INS_COST, rules: RULES_FUTURES, initialCash: 100000 });
  e.step(0);
  e.submit({ type: OrderType.MARKET, dir: 1, qty: 2 });
  e.step(1);   // 买入：100 + 1 tick 滑点 = 101
  e.submit({ type: OrderType.MARKET, dir: -1, qty: 2, reduceOnly: true });
  e.step(2);   // 卖出：110 - 1 = 109

  const t = e.closedTrades[0];
  assert.equal(t.entryPrice, 101);
  assert.equal(t.exitPrice, 109);
  assert.equal(t.pnl, (109 - 101) * 2 * 10);          // 乘数 10 × 2 手 = 160
  // 手续费双边：0.001 × 名义 + 2 元/手
  const feeIn = 0.001 * 101 * 2 * 10 + 2 * 2;
  const feeOut = 0.001 * 109 * 2 * 10 + 2 * 2;
  assert.ok(Math.abs(e.cash - (100000 + 160 - feeIn - feeOut)) < 1e-9,
    `现金结算不符：${e.cash}`);
});

test('T+1：当日买入的股票当日不可卖出，隔日方可', () => {
  // day1 内有两根盘中 K 线（bar1 建仓、bar2 同日试图卖出），bar3 已是次日
  const bars = mk([
    { day: 0, o: 10, h: 10, l: 10, c: 10 },
    { day: 1, o: 10, h: 11, l: 10, c: 11 },
    { day: 1, o: 11, h: 12, l: 11, c: 12 },
    { day: 2, o: 12, h: 13, l: 12, c: 13 },
  ]);
  const e = new MatchingEngine({
    bars, instrument: { ...INS, multiplier: 1 }, rules: RULES_STOCK, initialCash: 100000,
  });
  e.step(0);
  e.submit({ type: OrderType.MARKET, dir: 1, qty: 100 });
  e.step(1);
  assert.equal(e.position, 100);

  const sameDay = e.submit({ type: OrderType.MARKET, dir: -1, qty: 100, reduceOnly: true });
  e.step(2);
  assert.equal(sameDay.status, 'rejected');
  assert.match(sameDay.reason, /T\+1/);
  assert.equal(e.position, 100, '当日买入被当日卖出了 —— T+1 规则失效');

  const nextDay = e.submit({ type: OrderType.MARKET, dir: -1, qty: 100, reduceOnly: true });
  e.step(3);
  assert.equal(nextDay.status, 'filled', '次日仍不能卖出 —— T+1 判定过严');
  assert.equal(e.position, 0);
});

test('不允许做空的品种，开空单被拒', () => {
  const bars = mk([{ o: 10, h: 10, l: 10, c: 10 }, { o: 10, h: 10, l: 10, c: 10 }]);
  const e = new MatchingEngine({ bars, instrument: INS, rules: RULES_STOCK, initialCash: 100000 });
  const o = e.submit({ type: OrderType.MARKET, dir: -1, qty: 1 });
  assert.equal(o.status, 'rejected');
  assert.match(o.reason, /不允许做空/);
});

test('一字涨停买不进，一字跌停卖不出', () => {
  const up = mk([
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 110, h: 110, l: 110, c: 110, limitUp: true },
  ]);
  const e1 = eng(up);
  e1.step(0);
  const buy = e1.submit({ type: OrderType.MARKET, dir: 1, qty: 1 });
  e1.step(1);
  assert.equal(buy.status, 'pending', '一字涨停竟然买到了');
  assert.equal(e1.position, 0);

  const down = mk([
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 90, h: 90, l: 90, c: 90, limitDown: true },
  ]);
  const e2 = eng(down);
  e2.step(0);
  e2.submit({ type: OrderType.MARKET, dir: 1, qty: 1 });
  e2.step(1);
  assert.equal(e2.position, 1);
  const sell = e2.submit({ type: OrderType.MARKET, dir: -1, qty: 1, reduceOnly: true });
  e2.step(2);
  assert.equal(sell.status, 'pending', '一字跌停竟然卖出了');
  assert.equal(e2.position, 1);
});

test('权益跌破维持保证金触发强平', () => {
  const bars = mk([
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 60, h: 60, l: 60, c: 60 },     // 暴跌
    { o: 58, h: 58, l: 58, c: 58 },
  ]);
  const e = new MatchingEngine({
    bars, instrument: { ...INS, multiplier: 100 },
    rules: { t1: false, allowShort: true, marginRate: 0.1, maintenanceRate: 0.08 },
    initialCash: 20000,
  });
  e.step(0);
  e.submit({ type: OrderType.MARKET, dir: 1, qty: 5 });   // 名义 100×5×100 = 50000
  e.step(1);
  assert.equal(e.position, 5);
  e.step(2);   // 权益 = 20000 + (60-100)*5*100 = 0 → 低于维持保证金
  assert.ok(e.log.some(l => l.ev === 'margin_call'), '未触发强平');
  e.step(3);
  assert.equal(e.position, 0, '强平后仍有持仓');
});

test('持仓归零后，残留的止损止盈单自动作废（不会反向开仓）', () => {
  const bars = mk([
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 100, h: 115, l: 100, c: 112 },   // 触发止盈
    { o: 80, h: 85, l: 75, c: 78 },       // 若止损单还在，会在这里反手开空
  ]);
  const e = eng(bars);
  e.step(0);
  e.submit({ type: OrderType.MARKET, dir: 1, qty: 1, stopLoss: 90, takeProfit: 110 });
  e.step(1);
  e.step(2);
  assert.equal(e.position, 0);
  e.step(3);
  assert.equal(e.position, 0, '残留的止损单把仓位反手开成了空单');
});

test('toTrades 输出可直接喂给反事实引擎', () => {
  const bars = mk([
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 100, h: 100, l: 100, c: 100 },
    { o: 110, h: 110, l: 110, c: 110 },
  ]);
  const e = eng(bars);
  e.step(0);
  e.submit({ type: OrderType.MARKET, dir: 1, qty: 3 });
  e.step(1);
  e.submit({ type: OrderType.MARKET, dir: -1, qty: 3, reduceOnly: true });
  e.step(2);
  const trades = e.toTrades();
  assert.equal(trades.length, 1);
  assert.deepEqual(trades[0], { entry: 1, exit: 2, dir: 1, size: 3 });
});
