/**
 * 回放内核。
 *
 * ── 这个模块存在的首要理由是「防未来数据泄露」，而不是「播放 K 线」──
 *
 * 原型里的写法是：
 *     let replayFull = genCandles(180, ...), replayShown = 70;
 * 全量数据在客户端内存里，`replayShown` 只是个显示游标。
 * 这意味着按一下 F12 就能看到后面怎么走。后果不是「体验瑕疵」：
 *
 *   · 双盲测试直接失效 —— 它的全部价值就建立在看不到答案上；
 *   · 成绩、排行榜、任何形式的选拔全部作废；
 *   · 而且这是**架构问题**，不是以后能优化的细节：
 *     数据一旦下发到客户端就收不回来了。
 *
 * 因此这里把「不可见性」做成了类型层面的约束：K 线数据由 GuardedBarSource 私有持有，
 * 任何越过游标的读取**抛异常**，而不是返回数据。
 * 生产环境中 GuardedBarSource 位于服务端，客户端只能拿到已推送的分片。
 */

import { MatchingEngine, OrderType, RULES_FUTURES } from './matching.js';
import { makeRng } from './rng.js';

/** 越界读取时抛出的错误，测试据此断言 */
export class FutureDataError extends Error {
  constructor(requested, cursor) {
    super(`拒绝读取未来数据：请求到第 ${requested} 根，当前游标在第 ${cursor} 根`);
    this.name = 'FutureDataError';
    this.requested = requested;
    this.cursor = cursor;
  }
}

/**
 * 受控行情源。数据私有，只按游标下发。
 * 用 #private 字段而非约定俗成的下划线 —— 外部连绕过的入口都没有。
 */
export class GuardedBarSource {
  #bars;
  #cursor = -1;
  #transform;

  /**
   * @param {import('./bars.js').Bar[]} bars
   * @param {{scale:number}} [transform] 双盲模式下的价格仿射变换
   */
  constructor(bars, transform = null) {
    this.#bars = bars;
    this.#transform = transform;
  }

  get length() { return this.#bars.length; }
  get cursor() { return this.#cursor; }

  advance(n = 1) {
    this.#cursor = Math.min(this.#bars.length - 1, this.#cursor + n);
    return this.#cursor;
  }

  #apply(b) {
    if (!this.#transform) return b;
    const k = this.#transform.scale;
    // 乘法变换：**严格保持所有百分比涨跌幅与形态**，只改变价格绝对水平。
    // 用乘法而不是加法，是因为加法会扭曲收益率分布，让双盲题目的统计性质
    // 与真实行情不同 —— 那样练出来的手感是错的。
    return { t: b.t, o: b.o * k, h: b.h * k, l: b.l * k, c: b.c * k, v: b.v };
  }

  /** 已揭晓的全部 K 线 */
  visible() {
    if (this.#cursor < 0) return [];
    return this.#bars.slice(0, this.#cursor + 1).map(b => this.#apply(b));
  }

  /** 读取指定区间；越过游标一律抛错 */
  range(from, to) {
    if (to > this.#cursor) throw new FutureDataError(to, this.#cursor);
    if (from < 0) from = 0;
    return this.#bars.slice(from, to + 1).map(b => this.#apply(b));
  }

  /** 仅供撮合引擎内部使用：撮合必须能看到当前这一根的 OHLC */
  barAt(i) {
    if (i > this.#cursor) throw new FutureDataError(i, this.#cursor);
    return this.#apply(this.#bars[i]);
  }

  /** 结算与判分用，只在会话结束后调用 */
  revealAll(key) {
    if (key !== REVEAL_KEY) throw new Error('revealAll 需要结算密钥，不可从客户端调用');
    return this.#bars.map(b => this.#apply(b));
  }
}

const REVEAL_KEY = Symbol('reveal');

/**
 * 一次回放训练会话。
 *
 * 全部操作记入 opLog，配合固定 seed 可以**逐字节复现**整场会话 ——
 * 这是成绩可审计、可申诉的前提，也是这套系统能用于机构选拔的必要条件。
 */
export class ReplaySession {
  /**
   * @param {Object} opts
   * @param {import('./bars.js').Bar[]} opts.bars
   * @param {import('./trades.js').Instrument} opts.instrument
   * @param {number} [opts.startAt] 起始揭晓根数（给用户一段可看的历史）
   * @param {boolean} [opts.blind] 双盲模式：隐藏品种与日期，并对价格做保形变换
   * @param {number} [opts.seed]
   */
  constructor({ bars, instrument, rules = RULES_FUTURES, initialCash = 1000000,
    startAt = 60, blind = false, seed = 20260725 } = {}) {
    const rng = makeRng(seed);
    // 双盲：价格整体缩放到一个随机水平，使用户无法凭价位认出品种
    const transform = blind ? { scale: (0.3 + rng.next() * 3) } : null;

    this.source = new GuardedBarSource(bars, transform);
    this.blind = blind;
    this.seed = seed;
    this.instrument = instrument;
    this.totalBars = bars.length;

    // 撮合引擎拿到的是变换后的行情，与用户所见完全一致
    this._allTransformed = transform
      ? bars.map(b => ({ t: b.t, o: b.o * transform.scale, h: b.h * transform.scale, l: b.l * transform.scale, c: b.c * transform.scale, v: b.v }))
      : bars;
    this.engine = new MatchingEngine({ bars: this._allTransformed, instrument, rules, initialCash });

    this.opLog = [];
    this.finished = false;

    // 预热：揭晓起始段，但不撮合（此时还没有任何订单）
    for (let i = 0; i < Math.min(startAt, bars.length); i++) this.source.advance();
    this.engine._cursor = this.source.cursor;
  }

  /** 用户可见的行情。这是客户端唯一的数据来源。 */
  visibleBars() { return this.source.visible(); }

  get cursor() { return this.source.cursor; }
  get progress() { return (this.source.cursor + 1) / this.totalBars; }

  /** 双盲模式下对外暴露的元信息 —— 品种与日期一律打码 */
  meta() {
    return this.blind
      ? { symbol: '██████', period: '████-██-██', bars: this.totalBars, blind: true }
      : { symbol: this.instrument.symbol, bars: this.totalBars, blind: false };
  }

  /** 下单。提交时点记录为当前游标，撮合最早发生在下一根。 */
  submitOrder(order) {
    if (this.finished) throw new Error('会话已结束');
    this.opLog.push({ at: this.source.cursor, op: 'submit', order: { ...order } });
    return this.engine.submit(order);
  }

  cancelOrder(id) {
    this.opLog.push({ at: this.source.cursor, op: 'cancel', id });
    return this.engine.cancel(id);
  }

  /** 推进一根：先揭晓，再撮合 */
  step() {
    if (this.finished) return null;
    const prev = this.source.cursor;
    const next = this.source.advance();
    if (next === prev) { this.finished = true; return null; }
    return this.engine.step(next);
  }

  stepN(n) {
    const out = [];
    for (let i = 0; i < n; i++) { const r = this.step(); if (!r) break; out.push(r); }
    return out;
  }

  /** 结束会话：强制平掉剩余持仓，返回可供反事实引擎消费的结果 */
  finish() {
    // 「会话在哪一根结束」本身就是必须入账的信息。
    // 少了它，复现方不知道该在哪里收手，会一路跑到行情末尾，
    // 算出一个和原会话完全不同的权益 —— 复核就失去意义了。
    if (!this.opLog.some(o => o.op === 'end')) {
      this.opLog.push({ at: this.source.cursor, op: 'end' });
    }
    if (this.engine.position !== 0 && this.source.cursor < this.totalBars - 1) {
      this.engine.submit({
        type: OrderType.MARKET, dir: /** @type {1|-1} */ (-Math.sign(this.engine.position)),
        qty: Math.abs(this.engine.position), reduceOnly: true, tag: 'SESSION_END',
      });
      this.step();
    }
    this.finished = true;
    return {
      trades: this.engine.toTrades(),
      closedTrades: this.engine.closedTrades,
      equityCurve: this.engine.equityCurve,
      finalEquity: this.engine.equityCurve.length
        ? this.engine.equityCurve[this.engine.equityCurve.length - 1].equity
        : this.engine.initialCash,
      bars: this.source.revealAll(REVEAL_KEY),
      opLog: this.opLog,
      seed: this.seed,
    };
  }
}

/**
 * 从操作日志重放整场会话，用于成绩复核。
 * 若复现出的最终权益与原会话不一致，说明存在不确定性来源（或有人改过日志）。
 */
export function replayFromLog({ bars, instrument, rules, initialCash, startAt, blind, seed, opLog }) {
  const s = new ReplaySession({ bars, instrument, rules, initialCash, startAt, blind, seed });
  const byBar = new Map();
  for (const op of opLog) {
    if (!byBar.has(op.at)) byBar.set(op.at, []);
    byBar.get(op.at).push(op);
  }
  while (!s.finished) {
    let ended = false;
    for (const op of byBar.get(s.cursor) || []) {
      if (op.op === 'submit') s.engine.submit(op.order);
      else if (op.op === 'cancel') s.engine.cancel(op.id);
      else if (op.op === 'end') ended = true;
    }
    if (ended) break;                 // 在原会话收手的那一根收手
    if (!s.step()) break;
  }
  return s.finish();
}
