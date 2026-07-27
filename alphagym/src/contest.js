/**
 * 选拔赛 · 陪练机器人
 *
 * ⚠️ 关于「虚构选手」这件事，边界划在这里：
 *   · 名字是虚构的（这是个单机 demo，没有真实对手）
 *   · **成绩一个都不是编的** —— 每个陪练都是一条真实可执行的策略，
 *     在同一段真实历史行情、同一套成本模型下跑出来，
 *     用的是与用户完全相同的撮合引擎和结算口径。
 *
 * 换句话说：榜单上的名字是化名，数字是真账。
 * 如果哪天接了真实用户，把 ROSTER 换成真人即可，计算这一层不用动。
 */
import { MatchingEngine, OrderType } from './matching.js';
import { makeContext, evalTrades } from './trades.js';
import { medianSize } from './benchmarks.js';
import { makeRng } from './rng.js';

/** 陪练名单：名字是化名，strategy 决定它真实怎么交易 */
export const ROSTER = [
  { id: 'bot-trend', name: '林启明', tag: '趋势派', strategy: 'ma', params: { fast: 10, slow: 30 } },
  { id: 'bot-fast', name: '周夏', tag: '短线客', strategy: 'ma', params: { fast: 5, slow: 15 } },
  { id: 'bot-slow', name: '陈守拙', tag: '长线持有', strategy: 'ma', params: { fast: 20, slow: 60 } },
  { id: 'bot-break', name: '苏未然', tag: '突破交易', strategy: 'breakout', params: { look: 20 } },
  { id: 'bot-rev', name: '何知微', tag: '均值回归', strategy: 'revert', params: { look: 20, z: 1.5 } },
  { id: 'bot-coin', name: '掷币先生', tag: '纯随机', strategy: 'random', params: { p: 0.04 } },
];

/** 单根 K 线上的决策：返回 -1 / 0 / +1 表示希望持有的方向 */
function decide(strategy, params, bars, i, rng) {
  const c = (k) => bars[k].c;
  if (strategy === 'ma') {
    const { fast, slow } = params;
    if (i < slow) return 0;
    let f = 0, s = 0;
    for (let k = i - fast + 1; k <= i; k++) f += c(k);
    for (let k = i - slow + 1; k <= i; k++) s += c(k);
    return f / fast > s / slow ? 1 : -1;
  }
  if (strategy === 'breakout') {
    const { look } = params;
    if (i < look) return 0;
    let hi = -Infinity, lo = Infinity;
    for (let k = i - look; k < i; k++) { hi = Math.max(hi, bars[k].h); lo = Math.min(lo, bars[k].l); }
    if (c(i) > hi) return 1;
    if (c(i) < lo) return -1;
    return null;                        // null = 维持现状
  }
  if (strategy === 'revert') {
    const { look, z } = params;
    if (i < look) return 0;
    let m = 0;
    for (let k = i - look + 1; k <= i; k++) m += c(k);
    m /= look;
    let v = 0;
    for (let k = i - look + 1; k <= i; k++) v += (c(k) - m) ** 2;
    const sd = Math.sqrt(v / look);
    if (!(sd > 0)) return null;
    const dev = (c(i) - m) / sd;
    if (dev > z) return -1;
    if (dev < -z) return 1;
    return null;
  }
  if (strategy === 'random') {
    if (rng() > params.p) return null;
    return rng() > 0.5 ? 1 : -1;
  }
  return null;
}

/**
 * 让一个陪练把整段行情跑完，返回它的成交记录。
 * 只读 bars[0..i]，与用户端 GuardedBarSource 的约束一致 —— 不碰未来。
 */
export function runBot(bot, bars, instrument, { qty = 20, warmup = 140, seed = 12345 } = {}) {
  const eng = new MatchingEngine({
    bars,
    instrument,
    rules: { t1: false, allowShort: true, marginRate: 1, maintenanceRate: 0 },
    initialCash: 200000,
  });
  const rng = makeRng((seed ^ hashStr(bot.id)) >>> 0).next;
  let want = 0;

  // 与用户端同一时序：第 i 根收盘后下单，引擎在 step(i+1) 才撮合
  for (let i = warmup; i < bars.length - 1; i++) {
    eng.step(i);
    const d = decide(bot.strategy, bot.params, bars, i, rng);
    if (d !== null && d !== want) {
      const pos = eng.position;
      if (pos !== 0) eng.submit({ type: OrderType.MARKET, dir: -Math.sign(pos), qty: Math.abs(pos), reduceOnly: true });
      if (d !== 0) eng.submit({ type: OrderType.MARKET, dir: d, qty });
      want = d;
    }
  }
  // 收尾平仓，否则最后一笔浮盈浮亏没有落袋，成绩不可比
  if (eng.position !== 0) {
    eng.submit({ type: OrderType.MARKET, dir: -Math.sign(eng.position), qty: Math.abs(eng.position), reduceOnly: true });
    eng.step(bars.length - 1);
  }
  return eng.closedTrades.map(t => ({ entry: t.entry, exit: t.exit, dir: t.dir, size: t.size }));
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * 跑完整场比赛。所有选手跑同一段行情、同一套成本，因此 R 值可直接横比。
 * 额外给出两条参照线：买入持有，以及完美后视的理论上限。
 */
export function runContest(bars, instrument, { qty = 20, warmup = 140, seed = 12345 } = {}) {
  const entries = [];
  for (const bot of ROSTER) {
    const trades = runBot(bot, bars, instrument, { qty, warmup, seed });
    entries.push({ ...bot, kind: 'bot', ...score(bars, instrument, trades) });
  }

  // 买入持有：不是策略，是参照线
  const bh = [{ entry: warmup, exit: bars.length - 2, dir: 1, size: qty }];
  entries.push({
    id: 'ref-bh', name: '买入并持有', tag: '参照线', kind: 'ref',
    ...score(bars, instrument, bh),
  });

  entries.sort((a, b) => b.totalR - a.totalR);
  return entries;
}

function score(bars, instrument, trades) {
  if (!trades.length) return { trades: 0, totalR: 0, net: 0, winRate: 0 };
  const ctx = makeContext(bars, instrument, { refSize: medianSize(trades) });
  const ev = evalTrades(ctx, trades);
  return {
    trades: ev.rows.length,
    totalR: ev.totalR,
    net: ev.net,
    winRate: ev.rows.length ? ev.rows.filter(r => r.net > 0).length / ev.rows.length : 0,
  };
}
