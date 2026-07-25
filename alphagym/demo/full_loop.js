#!/usr/bin/env node
/**
 * 全链路演示：真实行情 → 回放（防泄露）→ 撮合（真成本）→ 反事实评估。
 *
 * 这里跑的策略只能看到 `session.visibleBars()`，也就是游标之前的数据。
 * 想偷看未来会直接抛 FutureDataError —— 不是靠自觉，是靠架构。
 *
 * 用法: node demo/full_loop.js [--blind]
 */
import { ReplaySession } from '../src/replay.js';
import { OrderType, RULES_FUTURES } from '../src/matching.js';
import { analyzeSession } from '../src/engine.js';
import { renderText } from '../src/report.js';
import { GOOG } from '../src/fixture.js';

const blind = process.argv.includes('--blind');
const fx = GOOG();
const INS = { symbol: fx.symbol, multiplier: 1, tickSize: 0.01, feeRate: 0.0003, feePerUnit: 0, slippageTicks: 1 };

const session = new ReplaySession({
  bars: fx.bars, instrument: INS, rules: { ...RULES_FUTURES, marginRate: 1, maintenanceRate: 0 },
  initialCash: 200000, startAt: 60, blind, seed: 20260725,
});

console.log(`数据：${fx.count} 根 ${fx.timeframe} · ${fx.source}`);
console.log(`会话元信息（客户端可见）：${JSON.stringify(session.meta())}`);
if (blind) console.log('双盲模式：品种与日期已打码，价格已做保形缩放（涨跌幅逐根不变）\n');

// 证明「偷看未来」在架构上被堵死
try {
  session.source.range(0, fx.count - 1);
  console.log('❌ 未来数据竟然读到了');
} catch (e) {
  console.log(`✅ 防泄露生效：${e.message}\n`);
}

// ── 一个只用可见数据的机械策略 ───────────────────────────────────────
const QTY = 20;
let pos = 0, bars = 0;
while (!session.finished) {
  const vis = session.visibleBars();
  if (vis.length >= 35) {
    const ma = (p) => {
      let s = 0;
      for (let i = vis.length - p; i < vis.length; i++) s += vis[i].c;
      return s / p;
    };
    const want = ma(10) > ma(30) ? 1 : -1;
    if (want !== pos) {
      if (pos !== 0) session.submitOrder({ type: OrderType.MARKET, dir: -pos, qty: QTY, reduceOnly: true });
      session.submitOrder({ type: OrderType.MARKET, dir: want, qty: QTY });
      pos = want;
    }
  }
  if (!session.step()) break;
  bars++;
}
const result = session.finish();

console.log(`回放完成：推进 ${bars} 根，成交 ${result.trades.length} 笔，`
  + `期末权益 ${result.finalEquity.toFixed(0)}（初始 200000）`);
console.log(`操作日志 ${result.opLog.length} 条 —— 可用 replayFromLog() 逐字节复核\n`);

const report = analyzeSession({
  bars: result.bars, trades: result.trades, instrument: INS,
  seed: 20260725, iterations: 2000,
});
console.log(renderText(report));
