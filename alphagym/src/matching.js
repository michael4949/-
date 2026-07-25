/**
 * K 线级撮合引擎。
 *
 * ── 为什么这个模块必须存在 ──
 * 没有撮合引擎，「交易分析」里的每一个数字都是编的，反事实引擎就没有输入，
 * 整条产品链路是断的。原型里那个 `onclick="toast('已模拟下单')"` 不是「还没接」，
 * 是把最难的部分整个跳过了。
 *
 * ── 三条贯穿全模块的原则 ──
 *
 * 1. **一根 K 线内的成交次序不可知，因此一律做最不利假设。**
 *    如果同一根 K 线里止损和止盈都可能触发，判定为止损先成交。
 *    任何「乐观假设」都会系统性地高估用户水平 —— 而训练系统一旦开始
 *    高估用户，它就从工具退化成了娱乐产品。
 *
 * 2. **决策与成交严格错开一根 K 线。**
 *    第 i 根收盘时下的单，最早在第 i+1 根成交。结构上杜绝未来函数。
 *
 * 3. **成本、保证金、涨跌停、T+1 全部按真实规则执行。**
 *    在没有摩擦的世界里练出来的手感，到实盘会被摩擦全部吃掉。
 */

/** @typedef {import('./bars.js').Bar} Bar */

export const OrderType = {
  MARKET: 'market',      // 市价：下一根开盘成交
  LIMIT: 'limit',        // 限价：价格触及才成交，不吃滑点
  STOP: 'stop',          // 停损触发：突破触发价后按市价成交，吃滑点
};

export const OrderStatus = {
  PENDING: 'pending', FILLED: 'filled', CANCELLED: 'cancelled', REJECTED: 'rejected',
};

/**
 * 交易规则集。默认是国内商品期货的近似规则。
 * @typedef {Object} Rules
 * @property {boolean} t1              是否 T+1（股票 true，期货 false）
 * @property {boolean} allowShort      是否允许做空
 * @property {number} marginRate       保证金比例（期货），股票为 1
 * @property {number} maintenanceRate  维持保证金比例，低于此触发强平
 */

/** @type {Rules} */
export const RULES_FUTURES = { t1: false, allowShort: true, marginRate: 0.12, maintenanceRate: 0.08 };
/** @type {Rules} */
export const RULES_STOCK = { t1: true, allowShort: false, marginRate: 1, maintenanceRate: 0 };

let _oid = 0;

export class MatchingEngine {
  /**
   * @param {Object} opts
   * @param {Bar[]} opts.bars
   * @param {import('./trades.js').Instrument} opts.instrument
   * @param {Rules} [opts.rules]
   * @param {number} [opts.initialCash]
   */
  constructor({ bars, instrument, rules = RULES_FUTURES, initialCash = 1000000 }) {
    this.bars = bars;
    this.ins = instrument;
    this.rules = rules;
    this.initialCash = initialCash;

    this.cash = initialCash;
    /** 净持仓：正数为多，负数为空 */
    this.position = 0;
    this.avgPrice = 0;
    this.openBarIndex = -1;
    this.openTradingDay = null;

    /** @type {Array} 挂单簿 */
    this.orders = [];
    /** @type {Array} 已完成的进出场配对，供反事实引擎消费 */
    this.closedTrades = [];
    /** @type {Array} 逐根权益快照 */
    this.equityCurve = [];
    /** @type {Array} 事件日志，用于审计与复现 */
    this.log = [];

    this._trailPeak = null;
    this._pendingEntryBar = -1;
  }

  /** 把毫秒时间戳归到自然日，用于 T+1 判定 */
  static tradingDay(t) { return Math.floor(t / 86400000); }

  /**
   * 提交订单。注意：提交发生在「第 i 根已收盘」的时刻，
   * 引擎会在 step(i+1) 时才尝试撮合。
   */
  submit(order) {
    const o = {
      id: ++_oid,
      type: order.type || OrderType.MARKET,
      dir: order.dir,                       // 1 买 / -1 卖
      qty: Math.max(0, Math.floor(order.qty || 0)),
      price: order.price ?? null,           // 限价 / 触发价
      reduceOnly: !!order.reduceOnly,
      tag: order.tag || '',
      status: OrderStatus.PENDING,
      submittedAt: this._cursor ?? -1,
      // 附加的止损止盈，成交后自动挂出
      stopLoss: order.stopLoss ?? null,
      takeProfit: order.takeProfit ?? null,
      trailing: order.trailing ?? null,
    };
    if (o.qty <= 0) { o.status = OrderStatus.REJECTED; o.reason = '数量必须为正'; return o; }
    if (o.dir === -1 && !this.rules.allowShort && this.position <= 0 && !o.reduceOnly) {
      o.status = OrderStatus.REJECTED; o.reason = '该品种不允许做空';
      this.log.push({ bar: this._cursor, ev: 'reject', reason: o.reason });
      return o;
    }
    if ((o.type === OrderType.LIMIT || o.type === OrderType.STOP) && !Number.isFinite(o.price)) {
      o.status = OrderStatus.REJECTED; o.reason = '限价/触发单必须给出价格'; return o;
    }
    this.orders.push(o);
    return o;
  }

  cancel(id) {
    const o = this.orders.find(x => x.id === id && x.status === OrderStatus.PENDING);
    if (o) { o.status = OrderStatus.CANCELLED; return true; }
    return false;
  }

  /** 单边成交成本 */
  _cost(price, qty) {
    const notional = price * qty * this.ins.multiplier;
    return this.ins.feeRate * notional + this.ins.feePerUnit * qty;
  }

  _slip(dir) { return dir * this.ins.slippageTicks * this.ins.tickSize; }

  /**
   * 判定一张挂单在给定 K 线上是否成交，以及成交价。
   * 涨跌停：一字涨停时买不到（没人卖），一字跌停时卖不掉。
   */
  _tryFill(o, bar) {
    const limitUp = bar.limitUp === true;
    const limitDown = bar.limitDown === true;
    if (o.dir === 1 && limitUp) return null;
    if (o.dir === -1 && limitDown) return null;

    switch (o.type) {
      case OrderType.MARKET:
        return bar.o + this._slip(o.dir);

      case OrderType.LIMIT:
        // 买限价：最低价触及才成交；若开盘已低于限价，按更优的开盘价成交
        if (o.dir === 1 && bar.l <= o.price) return Math.min(bar.o, o.price);
        if (o.dir === -1 && bar.h >= o.price) return Math.max(bar.o, o.price);
        return null;

      case OrderType.STOP:
        // 停损单触发后按市价走，必须吃滑点 —— 这正是止损滑点的来源
        if (o.dir === 1 && bar.h >= o.price) return Math.max(bar.o, o.price) + this._slip(1);
        if (o.dir === -1 && bar.l <= o.price) return Math.min(bar.o, o.price) + this._slip(-1);
        return null;

      default: return null;
    }
  }

  /** 执行成交，更新持仓与现金；持仓归零或反向时记一笔完整交易 */
  _execute(o, price, barIndex, bar) {
    const day = MatchingEngine.tradingDay(bar.t);

    // T+1：当日买入的股票当日不可卖出
    if (this.rules.t1 && o.dir === -1 && this.position > 0 && this.openTradingDay === day) {
      o.status = OrderStatus.REJECTED;
      o.reason = 'T+1：当日买入不可当日卖出';
      this.log.push({ bar: barIndex, ev: 'reject_t1', orderId: o.id });
      return;
    }

    const signed = o.dir * o.qty;
    const prevPos = this.position;
    const mult = this.ins.multiplier;

    // 平仓部分：结算已实现盈亏
    const closingQty = (prevPos !== 0 && Math.sign(signed) !== Math.sign(prevPos))
      ? Math.min(Math.abs(signed), Math.abs(prevPos)) : 0;
    if (closingQty > 0) {
      const pnl = Math.sign(prevPos) * (price - this.avgPrice) * closingQty * mult;
      this.cash += pnl;
      this.closedTrades.push({
        entry: this.openBarIndex,
        exit: barIndex,
        dir: /** @type {1|-1} */ (Math.sign(prevPos)),
        size: closingQty,
        entryPrice: this.avgPrice,
        exitPrice: price,
        pnl,
        tag: o.tag,
      });
    }

    // 开仓 / 加仓部分：更新持仓均价
    const openingQty = Math.abs(signed) - closingQty;
    const newPos = prevPos + signed;
    if (openingQty > 0) {
      if (Math.sign(newPos) === Math.sign(prevPos) && prevPos !== 0) {
        this.avgPrice = (this.avgPrice * Math.abs(prevPos) + price * openingQty) / Math.abs(newPos);
      } else {
        this.avgPrice = price;
        this.openBarIndex = barIndex;
        this.openTradingDay = day;
        this._trailPeak = price;
      }
    }
    this.position = newPos;
    if (newPos === 0) { this.avgPrice = 0; this.openBarIndex = -1; this._trailPeak = null; }

    this.cash -= this._cost(price, o.qty);
    o.status = OrderStatus.FILLED;
    o.fillPrice = price;
    o.fillBar = barIndex;
    this.log.push({ bar: barIndex, ev: 'fill', orderId: o.id, dir: o.dir, qty: o.qty, price, tag: o.tag });

    // 附加的止损止盈，在成交后自动挂出
    if (openingQty > 0 && newPos !== 0) {
      const exitDir = /** @type {1|-1} */ (-Math.sign(newPos));
      if (o.stopLoss != null) {
        this.submit({ type: OrderType.STOP, dir: exitDir, qty: Math.abs(newPos), price: o.stopLoss, reduceOnly: true, tag: 'SL' });
      }
      if (o.takeProfit != null) {
        this.submit({ type: OrderType.LIMIT, dir: exitDir, qty: Math.abs(newPos), price: o.takeProfit, reduceOnly: true, tag: 'TP' });
      }
      if (o.trailing != null) this._trailDistance = o.trailing;
    }
  }

  /** 权益 = 现金 + 浮动盈亏 */
  equityAt(price) {
    return this.cash + this.position * (price - this.avgPrice) * this.ins.multiplier;
  }

  /** 占用保证金 */
  marginUsed(price) {
    return Math.abs(this.position) * price * this.ins.multiplier * this.rules.marginRate;
  }

  /**
   * 推进一根 K 线：撮合 → 跟踪止损更新 → 盯市 → 强平检查。
   *
   * 撮合次序刻意固定为「停损单 → 限价单 → 市价单」：
   * 一根 K 线内谁先成交无从得知，一律按对用户最不利的次序处理。
   */
  step(barIndex) {
    this._cursor = barIndex;
    const bar = this.bars[barIndex];
    if (!bar) return null;

    const pending = this.orders.filter(o => o.status === OrderStatus.PENDING && o.submittedAt < barIndex);
    const byPriority = [
      ...pending.filter(o => o.type === OrderType.STOP),
      ...pending.filter(o => o.type === OrderType.LIMIT),
      ...pending.filter(o => o.type === OrderType.MARKET),
    ];

    for (const o of byPriority) {
      if (o.status !== OrderStatus.PENDING) continue;
      if (o.reduceOnly && this.position === 0) { o.status = OrderStatus.CANCELLED; continue; }
      const px = this._tryFill(o, bar);
      if (px == null) continue;
      this._execute(o, px, barIndex, bar);
      // 持仓归零后，其余的减仓单（止损/止盈）自动作废，避免反向开仓
      if (this.position === 0) {
        for (const q of this.orders) if (q.status === OrderStatus.PENDING && q.reduceOnly) q.status = OrderStatus.CANCELLED;
      }
    }

    // 跟踪止损：按最有利价格回撤固定距离
    if (this.position !== 0 && this._trailDistance != null) {
      const favorable = this.position > 0 ? bar.h : bar.l;
      if (this._trailPeak == null) this._trailPeak = favorable;
      this._trailPeak = this.position > 0 ? Math.max(this._trailPeak, favorable) : Math.min(this._trailPeak, favorable);
      const trigger = this._trailPeak - Math.sign(this.position) * this._trailDistance;
      const existing = this.orders.find(o => o.status === OrderStatus.PENDING && o.tag === 'TRAIL');
      if (existing) existing.price = trigger;
      else this.submit({
        type: OrderType.STOP, dir: /** @type {1|-1} */ (-Math.sign(this.position)),
        qty: Math.abs(this.position), price: trigger, reduceOnly: true, tag: 'TRAIL',
      });
    }

    const equity = this.equityAt(bar.c);
    this.equityCurve.push({ bar: barIndex, t: bar.t, equity, position: this.position });

    // 强平：权益低于维持保证金，下一根开盘市价平掉
    if (this.position !== 0 && this.rules.maintenanceRate > 0) {
      const maintain = Math.abs(this.position) * bar.c * this.ins.multiplier * this.rules.maintenanceRate;
      if (equity < maintain) {
        this.log.push({ bar: barIndex, ev: 'margin_call', equity, maintain });
        this.submit({
          type: OrderType.MARKET, dir: /** @type {1|-1} */ (-Math.sign(this.position)),
          qty: Math.abs(this.position), reduceOnly: true, tag: 'LIQUIDATION',
        });
      }
    }

    return { bar: barIndex, equity, position: this.position, cash: this.cash };
  }

  /** 转换成反事实引擎消费的 Trade[] */
  toTrades() {
    return this.closedTrades.map(t => ({
      entry: t.entry, exit: t.exit, dir: t.dir, size: t.size,
    })).filter(t => t.exit > t.entry);
  }

  /** 可序列化快照，供审计与断点续跑 */
  snapshot() {
    return {
      cash: this.cash, position: this.position, avgPrice: this.avgPrice,
      openBarIndex: this.openBarIndex, cursor: this._cursor,
      closedTrades: this.closedTrades.length,
      equity: this.equityCurve.length ? this.equityCurve[this.equityCurve.length - 1].equity : this.cash,
    };
  }
}
