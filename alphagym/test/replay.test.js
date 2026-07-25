/**
 * 回放内核测试。
 *
 * 第一组测试（防泄露）是整个训练系统的信任基础：
 * 只要未来数据能被客户端拿到，双盲测试、成绩、排行榜、机构选拔全部作废。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ReplaySession, GuardedBarSource, FutureDataError, replayFromLog } from '../src/replay.js';
import { OrderType, RULES_FUTURES } from '../src/matching.js';
import { GOOG } from '../src/fixture.js';
import { analyzeSession } from '../src/engine.js';

const INS = { symbol: 'GOOG', multiplier: 1, tickSize: 0.01, feeRate: 0.0003, feePerUnit: 0, slippageTicks: 1 };
const { bars } = GOOG();

test('越过游标读取未来数据必须抛错，而不是返回数据', () => {
  const src = new GuardedBarSource(bars);
  src.advance(10);                       // 游标从 -1 起步，揭晓 10 根后停在索引 9
  assert.equal(src.cursor, 9);
  assert.equal(src.visible().length, 10);
  assert.doesNotThrow(() => src.range(0, 9));
  assert.throws(() => src.range(0, 10), FutureDataError);
  assert.throws(() => src.barAt(10), FutureDataError);
  assert.throws(() => src.range(0, bars.length - 1), FutureDataError);
});

test('K 线数据对外完全不可达（私有字段，无绕行入口）', () => {
  const src = new GuardedBarSource(bars);
  src.advance(5);
  // 枚举所有自有属性与原型链方法，确认没有任何一条能拿到完整数组
  const exposed = [...Object.keys(src), ...Object.getOwnPropertyNames(Object.getPrototypeOf(src))];
  for (const k of exposed) {
    const v = src[k];
    assert.ok(!(Array.isArray(v) && v.length > 5),
      `属性 ${k} 泄露了 ${Array.isArray(v) ? v.length : ''} 根 K 线`);
  }
  assert.equal(src.visible().length, 5);
  assert.throws(() => src.revealAll('猜一个密钥'), /结算密钥/);
});

test('visibleBars 长度始终等于游标 + 1', () => {
  const s = new ReplaySession({ bars, instrument: INS, startAt: 60 });
  assert.equal(s.visibleBars().length, 60);
  s.stepN(25);
  assert.equal(s.visibleBars().length, 85);
  assert.equal(s.cursor, 84);
});

test('双盲模式：隐藏品种与日期，但严格保持全部涨跌幅', () => {
  const plain = new ReplaySession({ bars, instrument: INS, startAt: 200, blind: false, seed: 7 });
  const blind = new ReplaySession({ bars, instrument: INS, startAt: 200, blind: true, seed: 7 });

  assert.equal(blind.meta().symbol, '██████');
  assert.equal(blind.meta().period, '████-██-██');
  assert.equal(plain.meta().symbol, 'GOOG');

  const a = plain.visibleBars(), b = blind.visibleBars();
  assert.equal(a.length, b.length);
  // 价格水平必须被改变，否则凭价位就能认出品种
  assert.ok(Math.abs(a[0].c - b[0].c) > 1e-9, '双盲模式下价格水平未被改变');
  // 但每一根的涨跌幅必须逐一相等 —— 否则练出来的手感对应的是一段不存在的行情
  for (let i = 1; i < a.length; i++) {
    const ra = a[i].c / a[i - 1].c, rb = b[i].c / b[i - 1].c;
    assert.ok(Math.abs(ra - rb) < 1e-12, `第 ${i} 根涨跌幅被扭曲: ${ra} vs ${rb}`);
  }
});

test('提交的订单最早在下一根成交（回放层同样不允许未来函数）', () => {
  const s = new ReplaySession({ bars, instrument: INS, startAt: 100 });
  const cursorAtSubmit = s.cursor;
  const o = s.submitOrder({ type: OrderType.MARKET, dir: 1, qty: 10 });
  assert.equal(o.status, 'pending');
  assert.equal(s.engine.position, 0, '下单当根就成交了');
  s.step();
  assert.equal(o.status, 'filled');
  assert.equal(o.fillBar, cursorAtSubmit + 1);
});

test('操作日志可完整复现整场会话（成绩可审计、可申诉）', () => {
  const run = () => {
    const s = new ReplaySession({ bars, instrument: INS, startAt: 100, seed: 424242 });
    for (let k = 0; k < 30; k++) {
      s.stepN(12);
      if (s.finished) break;
      const dir = /** @type {1|-1} */ (k % 3 === 0 ? -1 : 1);
      s.submitOrder({ type: OrderType.MARKET, dir, qty: 5, reduceOnly: s.engine.position !== 0 && k % 2 === 1 });
    }
    s.stepN(50);
    return s.finish();
  };

  const first = run();
  const replayed = replayFromLog({
    bars, instrument: INS, rules: RULES_FUTURES, initialCash: 1000000,
    startAt: 100, blind: false, seed: 424242, opLog: first.opLog,
  });

  assert.ok(Math.abs(first.finalEquity - replayed.finalEquity) < 1e-6,
    `复现的最终权益不一致: ${first.finalEquity} vs ${replayed.finalEquity}`);
  assert.equal(first.trades.length, replayed.trades.length);
  assert.deepEqual(first.trades, replayed.trades);
});

test('全链路：回放 → 撮合 → 反事实评估，不需要任何人工构造的交易记录', () => {
  const s = new ReplaySession({ bars, instrument: INS, startAt: 60, seed: 20260725 });

  // 一个机械策略：用**仅可见**的 K 线算均线，结构上不可能偷看未来
  let pos = 0;
  while (!s.finished) {
    const vis = s.visibleBars();
    if (vis.length < 35) { if (!s.step()) break; continue; }
    const ma = (p) => {
      let sum = 0;
      for (let i = vis.length - p; i < vis.length; i++) sum += vis[i].c;
      return sum / p;
    };
    const want = ma(10) > ma(30) ? 1 : -1;
    if (want !== pos) {
      if (pos !== 0) s.submitOrder({ type: OrderType.MARKET, dir: /** @type {1|-1} */ (-pos), qty: 10, reduceOnly: true });
      s.submitOrder({ type: OrderType.MARKET, dir: /** @type {1|-1} */ (want), qty: 10 });
      pos = want;
    }
    if (!s.step()) break;
  }
  const result = s.finish();

  assert.ok(result.trades.length >= 10, `策略只产生了 ${result.trades.length} 笔交易，样本过少`);

  const report = analyzeSession({
    bars: result.bars, trades: result.trades, instrument: INS,
    seed: 20260725, iterations: 500,
  });
  assert.ok(report.observed);
  assert.equal(report.observed.trades, result.trades.length);
  assert.ok(report.headline.available);
  assert.ok(report.headline.pValue > 0 && report.headline.pValue <= 1);
  assert.ok(report.caveats.length >= 3);
});
