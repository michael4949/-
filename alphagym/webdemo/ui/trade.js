/* ══════════════════════════════════════════════════════════════════
   决策训练台 · 双盲测试 · 交易分析

   ── 这个模块要对齐的产品内核 ──
   复盘软件真正卖的不是图表、不是数据，是「决策重复」：
   一个交易者一年只能做几百次真实决策，在这里一个下午就能做几百次。
   所以这一页的每一个设计取舍，都服务于同一件事 —— **把单次决策的成本压到最低**：

     · 下单动作贴着图表，不藏进右侧表单（少两次视线转移、少三次点击）
     · 全流程可纯键盘完成：空格推进、↑做多、↓做空、X 平仓
     · 成交点、持仓成本线、止损线直接画在图上 —— 交易者是看着图做决策的
     · 大小周期同屏同步推进 —— 真实盘面上没人只看一个周期
     · 「跳到下一波动」跳过无事发生的横盘，别让人把时间花在空点鼠标上
     · 顶部第一个指标是「本轮决策次数」，因为它才是这个产品的产出量纲
   ══════════════════════════════════════════════════════════════════ */

const SEG_LEN = 900, WARMUP = 140, INITIAL_CASH = 200000;
const QTY_PRESETS = [10, 20, 50, 100, 200];
/** 副图周期倍数：日线→周线(5)/月线(21)，小时线→4小时(4)/日线(24) */
const MTF_OPTIONS = {
  '1d': [[5, '周线'], [21, '月线']],
  '1h': [[4, '4小时'], [24, '日线']],
};

/* ── 开局 ───────────────────────────────────────────────────────── */
function pickSegment(sym) {
  const bars = barsOf(sym);
  const len = Math.min(SEG_LEN, bars.length - 10);
  const start = Math.floor(Math.random() * (bars.length - len));
  return bars.slice(start, start + len);
}

function newRound() {
  stopPlay();
  S.ds = $('#dsSel').value;
  S.ins = INSTRUMENTS[S.ds];
  S.segBars = pickSegment(S.ds);
  S.decisions = 0;
  S.seed = (Math.random() * 1e9) | 0;
  S.atrSeries = atr(S.segBars, 14);
  buildSession();

  const d = DATASETS[S.ds];
  $('#rTitle').textContent = `${d.display} · ${d.symbol}`;
  $('#rSub').textContent = `${TF_LABEL[d.timeframe]} · 本轮 ${S.segBars.length} 根 · 红涨绿跌`;

  const opts = MTF_OPTIONS[d.timeframe] || MTF_OPTIONS['1d'];
  S.mtf = opts[0][0];
  $('#mtfSeg').innerHTML = opts.map(([f, label], i) =>
    `<button data-f="${f}" class="${i === 0 ? 'on' : ''}">${label}</button>`).join('');
  $$('#mtfSeg button').forEach(b => b.onclick = () => {
    $$('#mtfSeg button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    S.mtf = +b.dataset.f;
    $('#mtfLabel').textContent = b.textContent;
    drawMtf();
  });
  $('#mtfLabel').textContent = opts[0][1];

  const c = getChart('chart', { ma: true, vol: true });
  c.applyNewData(S.session.visibleBars().map(toK));
  c.setPriceVolumePrecision(dec(S.ds), 0);
  drawMtf();
  refreshReplay();
  toast('新一轮已开始 · 空格推进，↑做多 ↓做空');
}

/** 用同一 seed 重建会话，可选地重放一段操作日志（后退功能靠它实现） */
function buildSession(replayOps = null, upTo = Infinity) {
  S.session = new ReplaySession({
    bars: S.segBars, instrument: S.ins,
    rules: { t1: false, allowShort: true, marginRate: 1, maintenanceRate: 0 },
    initialCash: INITIAL_CASH, startAt: WARMUP, blind: false, seed: S.seed,
  });
  if (!replayOps) return;
  const byBar = new Map();
  for (const op of replayOps) {
    if (op.at > upTo) continue;
    if (!byBar.has(op.at)) byBar.set(op.at, []);
    byBar.get(op.at).push(op);
  }
  while (S.session.cursor < upTo && !S.session.finished) {
    for (const op of byBar.get(S.session.cursor) || []) {
      if (op.op === 'submit') S.session.engine.submit(op.order);
    }
    if (!S.session.step()) break;
  }
}

/* ── 图上的持仓可视化 ────────────────────────────────────────────
   交易者是看着图做决策的。成交点、成本线、止损线不画在图上，
   就等于让他一边看图一边在脑子里记「我在 3860 进的多，止损 3810」——
   这正是原型里最伤体验的一处缺失。 */
function redrawOverlays() {
  const c = charts.chart; if (!c || !S.session) return;
  try { c.removeOverlay(); } catch (e) {}
  const e = S.session.engine, D = dec(S.ds);

  for (const t of e.closedTrades.slice(-40)) {
    addMark(c, S.segBars[t.entry], t.dir > 0 ? '多' : '空', t.dir > 0 ? cssv('--up') : cssv('--dn'));
    addMark(c, S.segBars[t.exit], '平', cssv('--mut'));
  }
  if (e.position !== 0 && e.openBarIndex >= 0) {
    addMark(c, S.segBars[e.openBarIndex], e.position > 0 ? '多' : '空',
      e.position > 0 ? cssv('--up') : cssv('--dn'));
    addLine(c, e.avgPrice, cssv('--brand'), `成本 ${fx(e.avgPrice, D)}`);
    const sl = currentStopPrice();
    if (sl) addLine(c, sl, cssv('--warn'), `止损 ${fx(sl, D)}`);
  }
}
function addMark(c, bar, text, color) {
  if (!bar) return;
  try {
    c.createOverlay({
      name: 'simpleAnnotation', points: [{ timestamp: bar.t, value: bar.l }],
      extendData: text,
      styles: { polygon: { color }, text: { color, size: 11 } },
    });
  } catch (err) {}
}
function addLine(c, price, color, text) {
  try {
    c.createOverlay({
      name: 'priceLine', points: [{ value: price }],
      styles: { line: { color, style: 'dashed', size: 1 }, text: { color, backgroundColor: color + '22' } },
      extendData: text,
    });
  } catch (err) {}
}
/** 当前挂着的止损价（取减仓方向的停损单） */
function currentStopPrice() {
  const e = S.session?.engine; if (!e || e.position === 0) return null;
  const o = e.orders.find(x => x.status === 'pending' && x.type === 'stop' && x.reduceOnly);
  return o ? o.price : null;
}

/** 副图：更大周期，只用已揭晓的数据合成，最后一根是未完成的 */
function drawMtf() {
  const s = S.session; if (!s) return;
  const c = getChart('chartMtf', { ma: false });
  if (!c) return;
  const agg = resampledUpTo(S.segBars, S.mtf, s.cursor);
  c.applyNewData(agg.slice(-90).map(toK));
  c.setPriceVolumePrecision(dec(S.ds), 0);
  c.setStyles({ candle: { tooltip: { showRule: 'none' } }, xAxis: { show: false } });
}

/* ── 状态刷新 ───────────────────────────────────────────────────── */
function refreshReplay() {
  const s = S.session; if (!s) return;
  const e = s.engine, vis = s.visibleBars();
  const px = vis.length ? vis[vis.length - 1].c : 0;
  const eq = e.equityAt(px);
  const flt = e.position * (px - e.avgPrice) * S.ins.multiplier;
  const D = dec(S.ds);

  $('#tDec').textContent = S.decisions;
  $('#tDecD').textContent = S.decisions === 0 ? '每一次开仓 / 平仓算一次'
    : `已成交 ${e.closedTrades.length} 笔 · 平均 ${(s.cursor - WARMUP + 1) / Math.max(1, S.decisions) | 0} 根一次决策`;

  $('#tEq').textContent = fx(eq, 0);
  $('#tEq').className = 'v num ' + (eq >= INITIAL_CASH ? 'up' : 'dn');
  $('#tEqD').textContent = `${sg(eq - INITIAL_CASH, 0)} · ${sg((eq / INITIAL_CASH - 1) * 100)}%`;
  $('#tEqD').className = 'd ' + (eq >= INITIAL_CASH ? 'up' : 'dn');

  const posTxt = e.position === 0 ? '空仓' : `${e.position > 0 ? '多' : '空'} ${Math.abs(e.position)}`;
  $('#tPos').textContent = posTxt;
  $('#tPos').className = 'v num ' + (e.position > 0 ? 'up' : e.position < 0 ? 'dn' : '');
  $('#tPosD').textContent = e.position ? `均价 ${fx(e.avgPrice, D)}` : '—';
  $('#posSub').textContent = posTxt;

  const pr = s.progress;
  $('#tPrg').textContent = (pr * 100).toFixed(0) + '%';
  $('#tPrgD').textContent = `${s.cursor + 1} / ${s.totalBars} 根 · ${ymd(S.segBars[s.cursor].t)}`;
  $('#prgBar').style.width = (pr * 100) + '%';

  $('#sFloat').textContent = e.position ? sg(flt, 0) : '—';
  $('#sFloat').className = 'num ' + (flt > 0 ? 'up' : flt < 0 ? 'dn' : '');
  $('#sAvg').textContent = e.position ? fx(e.avgPrice, D) : '—';
  const sl = currentStopPrice();
  $('#sSL').textContent = sl ? fx(sl, D) : '—';
  $('#sLast').textContent = fx(px, D);
  $('#sCash').textContent = fx(e.cash, 0);
  $('#sPend').textContent = e.orders.filter(o => o.status === 'pending').length;

  $('#hud').innerHTML = [
    `<span class="h"><b>${fx(px, D)}</b></span>`,
    e.position ? `<span class="h ${e.position > 0 ? 'long' : 'short'}">${posTxt} @ ${fx(e.avgPrice, D)}
      <b>${sg(flt, 0)}</b></span>` : '',
    sl ? `<span class="h">止损 <b>${fx(sl, D)}</b></span>` : '',
    `<span class="h">决策 <b>${S.decisions}</b></span>`,
  ].filter(Boolean).join('');

  const ct = e.closedTrades;
  $('#fillCount').textContent = `${ct.length} 笔`;
  $('#fills').innerHTML = ct.length
    ? ct.slice(-40).reverse().map(t => `<div class="fill">
        <span class="${t.dir > 0 ? 'up' : 'dn'}">${t.dir > 0 ? '多' : '空'}${t.size}</span>
        <span class="mut">${fx(t.entryPrice, D)} → ${fx(t.exitPrice, D)}</span>
        <span class="${t.pnl >= 0 ? 'up' : 'dn'}">${sg(t.pnl, 0)}</span></div>`).join('')
    : '<div class="mut" style="font-size:13px">还没有成交</div>';

  $('#aFlat').disabled = e.position === 0;
  $('#endBtn').disabled = ct.length === 0 && e.position === 0;
  redrawOverlays();
}

/* ── 推进 / 后退 ────────────────────────────────────────────────── */
function stepOnce() {
  const s = S.session;
  if (!s || s.finished) { stopPlay(); return false; }
  if (!s.step()) { stopPlay(); toast('本轮行情已播放完毕，可以结束并评估了'); return false; }
  const bar = s.visibleBars()[s.cursor];
  if (bar) charts.chart?.updateData(toK(bar));
  drawMtf();
  refreshReplay();
  return true;
}

/** 后退一根：用同 seed 重建会话并重放操作日志。
 *  会话内核本身只能前进（这是防未来数据的一部分），后退只能靠确定性重放实现。 */
function stepBack() {
  const s = S.session; if (!s) return;
  const target = s.cursor - 1;
  if (target < WARMUP) { toast('已经在起点了'); return; }
  stopPlay();
  const ops = s.opLog.filter(o => o.op === 'submit' && o.at < target);
  buildSession(ops, target);
  charts.chart?.applyNewData(S.session.visibleBars().map(toK));
  drawMtf();
  refreshReplay();
}

/** 跳到下一段明显波动：别让人把时间花在横盘里空点鼠标 */
function jumpToAction() {
  const s = S.session; if (!s || s.finished) return;
  stopPlay();
  const a = S.atrSeries;
  let moved = 0;
  while (moved < 200 && !s.finished) {
    if (!s.step()) break;
    moved++;
    const i = s.cursor, b = S.segBars[i];
    const swing = Math.abs(b.c - S.segBars[i - 1].c) > 1.6 * a[i];
    let breakout = false;
    if (i > 21) {
      let hi = -Infinity, lo = Infinity;
      for (let k = i - 20; k < i; k++) { hi = Math.max(hi, S.segBars[k].h); lo = Math.min(lo, S.segBars[k].l); }
      breakout = b.c > hi || b.c < lo;
    }
    if (moved >= 3 && (swing || breakout)) break;
  }
  charts.chart?.applyNewData(s.visibleBars().map(toK));
  drawMtf();
  refreshReplay();
  toast(`推进 ${moved} 根，到了一处明显波动`);
}

function startPlay() {
  if (!S.session || S.session.finished) return;
  S.playing = true; $('#playBtn').textContent = '❚❚';
  S.timer = setInterval(() => { if (!stepOnce()) stopPlay(); }, Math.max(14, 420 / S.speed));
}
function stopPlay() {
  S.playing = false;
  const b = $('#playBtn'); if (b) b.textContent = '▶';
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
}

/* ── 决策动作 ───────────────────────────────────────────────────── */
function qty() { return Math.max(1, parseInt($('#oQty').value) || 20); }

/**
 * 一键开仓。自动止损按入场 ATR 的固定倍数挂出 ——
 * 让「带止损进场」成为默认动作而不是额外操作，是这个训练台最该有的默认值。
 */
function act(dir) {
  const s = S.session;
  if (!s || s.finished) { toast('本轮已结束，按「新一轮」重开'); return; }
  const e = s.engine;
  if (e.position !== 0 && Math.sign(e.position) !== dir) {
    // 反手：先平掉再反向开，两个动作都算决策
    s.submitOrder({ type: 'market', dir: -Math.sign(e.position), qty: Math.abs(e.position), reduceOnly: true });
    S.decisions++;
  }
  const order = { type: 'market', dir, qty: qty() };
  if ($('#autoSL').checked) {
    const i = s.cursor;
    const mult = parseFloat($('#slRange').value) || 2;
    const px = S.segBars[i].c;
    order.stopLoss = dir > 0 ? px - mult * S.atrSeries[i] : px + mult * S.atrSeries[i];
  }
  const o = s.submitOrder(order);
  if (o.status === 'rejected') { toast('已拒绝：' + o.reason); return; }
  S.decisions++;
  toast(`${dir > 0 ? '做多' : '做空'} ${qty()} 手已挂出 · 下一根开盘成交`);
  refreshReplay();
  if (S.autoAdvance !== false) stepOnce();
}

function flatten() {
  const s = S.session, e = s?.engine;
  if (!e || e.position === 0) { toast('当前没有持仓'); return; }
  s.submitOrder({ type: 'market', dir: -Math.sign(e.position), qty: Math.abs(e.position), reduceOnly: true });
  S.decisions++;
  toast('平仓单已挂出 · 下一根开盘成交');
  refreshReplay();
  stepOnce();
}

/** 机械策略代跑：只读 visibleBars()，偷看未来会抛 FutureDataError */
function autoRun() {
  stopPlay();
  const s = S.session; if (!s || s.finished) { toast('本轮已结束，请先开新一轮'); return; }
  let pos = s.engine.position, guard = 0;
  while (!s.finished && guard++ < 20000) {
    const vis = s.visibleBars();
    if (vis.length >= 35) {
      const ma = (p) => { let t = 0; for (let i = vis.length - p; i < vis.length; i++) t += vis[i].c; return t / p; };
      const want = ma(10) > ma(30) ? 1 : -1;
      if (want !== pos) {
        if (pos !== 0) { s.submitOrder({ type: 'market', dir: -pos, qty: Math.abs(s.engine.position), reduceOnly: true }); S.decisions++; }
        s.submitOrder({ type: 'market', dir: want, qty: qty() });
        S.decisions++;
        pos = want;
      }
    }
    if (!s.step()) break;
  }
  charts.chart?.applyNewData(s.visibleBars().map(toK));
  drawMtf();
  refreshReplay();
  toast(`代跑完成，成交 ${s.engine.closedTrades.length} 笔`);
}

function endRound() {
  stopPlay();
  const s = S.session; if (!s) return;
  const res = s.finish();
  if (!res.trades.length) { toast('本轮没有完成任何一笔交易'); return; }
  S.lastTrades = res.trades;
  S.lastBars = res.bars;
  S.lastIns = S.ins;
  S.lastLabel = `行情回放 · ${DATASETS[S.ds].display}`;
  S.report = null;
  toast(`本轮 ${res.trades.length} 笔交易 · ${S.decisions} 次决策`);
  location.hash = '#app/analysis';
}

/* ══ 双盲测试 ══ */
const BLIND_HISTORY = 130;

function newBlind() {
  const sym = $('#dsSel').value in DATASETS ? $('#dsSel').value : 'SPX';
  const bars = barsOf(sym);
  const n = parseInt($('#bCount')?.value) || 10;
  const horizon = parseInt($('#bHorizon')?.value) || 20;
  const lo = BLIND_HISTORY + 5, hi = bars.length - horizon - 5;
  const picks = [];
  let guard = 0;
  while (picks.length < n && guard++ < 6000) {
    const i = lo + Math.floor(Math.random() * (hi - lo));
    if (picks.every(p => Math.abs(p - i) > horizon + 8)) picks.push(i);
  }
  picks.sort((a, b) => a - b);
  S.blind = {
    sym, bars, ins: INSTRUMENTS[sym], horizon,
    qs: picks.map(i => ({
      i, scale: 0.3 + Math.random() * 3,
      // 时间戳同步平移：只遮品种名不够，横轴上的真实年月同样会暴露是哪段行情
      tShift: Math.floor((Math.random() - 0.5) * 7300) * 86400000,
      ans: null, correct: null, fwd: null,
    })),
    idx: 0, right: 0, answered: 0,
  };
  renderBlind();
  toast(`已出 ${picks.length} 题 · ↑看多 ↓看空`);
}

function renderBlind() {
  const B = S.blind; if (!B) return;
  const q = B.qs[B.idx];
  const seg = B.bars.slice(q.i - BLIND_HISTORY, q.i + 1).map(b => ({
    t: b.t + q.tShift, o: b.o * q.scale, h: b.h * q.scale,
    l: b.l * q.scale, c: b.c * q.scale, v: b.v,
  }));
  const c = getChart('bChart', { ma: true });
  if (c) { c.applyNewData(seg.map(toK)); c.setPriceVolumePrecision(4, 0); }

  $('#bSub').textContent = `第 ${B.idx + 1} / ${B.qs.length} 题 · 判定周期 ${B.horizon} 根`;
  $('#bMask').textContent = q.ans === null
    ? '品种 ██████ · 日期 ████-██-██' : `${DATASETS[B.sym].display} · ${ymd(B.bars[q.i].t)}`;
  $('#bDone').textContent = `${B.answered} / ${B.qs.length}`;
  $('#bRight').textContent = B.right;
  const graded = B.qs.filter(x => x.correct !== null).length;
  $('#bRate').textContent = graded ? ((B.right / graded) * 100).toFixed(0) + '%' : '—';
  $('#bDots').innerHTML = B.qs.map((x, k) =>
    `<span class="qdot ${x.ans === null ? '' : x.correct === true ? 'ok' : x.correct === false ? 'no' : ''} ${k === B.idx ? 'cur' : ''}">${k + 1}</span>`).join('');
  $$('#v-blind .act').forEach(b => b.disabled = q.ans !== null);
  $('#bEval').disabled = blindTrades().length < 3;
  if (q.ans === null) $('#bReveal').innerHTML = '作答后揭晓品种与日期，并用真实后续行情计算这一题的结果。';
}

function answerBlind(a) {
  const B = S.blind; if (!B) return;
  const q = B.qs[B.idx];
  if (q.ans !== null) return;
  const b0 = B.bars[q.i], b1 = B.bars[q.i + B.horizon];
  const fwd = (b1.c - b0.c) / b0.c;
  q.ans = a; q.fwd = fwd; B.answered++;

  if (a === 0) {
    q.correct = null;
    $('#bReveal').innerHTML = `<b>揭晓：</b>${DATASETS[B.sym].display} · ${ymd(b0.t)}。
      后 ${B.horizon} 根实际 <b class="${fwd >= 0 ? 'up' : 'dn'}">${sg(fwd * 100)}%</b>。
      <br>你选择观望，本题不计入命中率，也不产生交易记录。`;
  } else {
    const ok = Math.sign(fwd) === a;
    q.correct = ok;
    if (ok) B.right++;
    $('#bReveal').innerHTML = `<b>揭晓：</b>${DATASETS[B.sym].display} · ${ymd(b0.t)}。
      后 ${B.horizon} 根实际 <b class="${fwd >= 0 ? 'up' : 'dn'}">${sg(fwd * 100)}%</b>，
      你的判断 <b>${a > 0 ? '看多' : '看空'}</b> —— <b class="${ok ? 'dn' : 'up'}">${ok ? '正确 ✓' : '错误 ✗'}</b>。`;
    toast(ok ? '方向正确' : '方向错误');
  }
  const trades = blindTrades();
  if (trades.length) {
    const ctx = makeContext(B.bars, B.ins, { refSize: 1 });
    $('#bR').textContent = sg(evalTrades(ctx, trades).totalR);
  }
  renderBlind();
  setTimeout(() => {
    if (B.idx < B.qs.length - 1) { B.idx++; renderBlind(); }
    else toast('本组题已答完，可以评估了');
  }, 1500);
}

function blindTrades() {
  const B = S.blind; if (!B) return [];
  return B.qs.filter(q => q.ans === 1 || q.ans === -1)
    .map(q => ({ entry: q.i, exit: q.i + B.horizon, dir: q.ans, size: 1 }));
}

function evalBlind() {
  const B = S.blind; if (!B) return;
  const trades = blindTrades();
  if (trades.length < 3) { toast('至少要有 3 笔方向判断才能评估'); return; }
  S.lastTrades = trades;
  S.lastBars = B.bars;
  S.lastIns = B.ins;
  S.lastLabel = `双盲测试 · ${DATASETS[B.sym].display}`;
  S.report = null;
  location.hash = '#app/eval';
  runReport();
}

/* ══ 交易分析 ══ */
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function renderAnalysis() {
  const host = $('#v-analysis');
  if (!S.lastTrades?.length) {
    host.innerHTML = `<div class="empty"><h3>还没有交易记录</h3>
      <p>去「行情回放」跑一轮，或在「双盲测试」里答完一组题。</p>
      <div style="margin-top:18px;display:flex;gap:10px;justify-content:center">
        <button class="btn btn-p" onclick="location.hash='#app/replay'">去行情回放</button>
        <button class="btn btn-g" onclick="location.hash='#app/blind'">去双盲测试</button></div></div>`;
    return;
  }
  const ctx = makeContext(S.lastBars, S.lastIns, { refSize: medianSize(S.lastTrades) });
  const ev = evalTrades(ctx, S.lastTrades);
  const { equity, maxDrawdownR } = equityCurveR(ev.rows);
  const beh = detectBehaviors(ev, S.lastBars);
  const isDaily = (S.lastBars[1].t - S.lastBars[0].t) > 20 * 3600 * 1000;

  const byDir = [1, -1].map(d => {
    const rows = ev.rows.filter(r => r.dir === d);
    return { label: d > 0 ? '多头' : '空头', n: rows.length,
      r: rows.reduce((a, x) => a + x.r, 0),
      win: rows.length ? rows.filter(x => x.net > 0).length / rows.length : 0 };
  }).filter(x => x.n);

  const buckets = new Map();
  for (const r of ev.rows) {
    const d = new Date(S.lastBars[r.entry].t);
    const key = isDaily ? WEEK[d.getUTCDay()] : `${String(d.getUTCHours()).padStart(2, '0')}:00`;
    const b = buckets.get(key) || { label: key, n: 0, r: 0, win: 0 };
    b.n++; b.r += r.r; if (r.net > 0) b.win++;
    buckets.set(key, b);
  }
  const byTime = [...buckets.values()].map(b => ({ ...b, win: b.win / b.n }))
    .sort((a, b) => (isDaily ? WEEK.indexOf(a.label) - WEEK.indexOf(b.label) : a.label.localeCompare(b.label)));

  const byDur = [[0, 3, '≤3 根'], [3, 10, '4–10 根'], [10, 30, '11–30 根'], [30, 1e9, '>30 根']]
    .map(([lo, hi, label]) => {
      const rows = ev.rows.filter(r => r.holdBars > lo && r.holdBars <= hi);
      return { label, n: rows.length, r: rows.reduce((a, x) => a + x.r, 0),
        win: rows.length ? rows.filter(x => x.net > 0).length / rows.length : 0 };
    }).filter(x => x.n);

  const rBands = [[-1e9, -2, '< −2R'], [-2, -1, '−2 ~ −1R'], [-1, 0, '−1 ~ 0R'],
    [0, 1, '0 ~ 1R'], [1, 2, '1 ~ 2R'], [2, 1e9, '> 2R']];
  const rHist = rBands.map(([lo, hi, label]) => ({ label, n: ev.rows.filter(r => r.r > lo && r.r <= hi).length }));
  const maxHist = Math.max(1, ...rHist.map(h => h.n));
  const grade = accountGrade(ev, maxDrawdownR);

  host.innerHTML = `
  <div class="tiles">
    <div class="tile"><div class="l">总收益</div>
      <div class="v num ${ev.totalR >= 0 ? 'up' : 'dn'}">${sg(ev.totalR)} R</div>
      <div class="d">${sg(ev.net, 0)} 元</div></div>
    <div class="tile"><div class="l">胜率</div><div class="v num">${pc1(ev.winRate)}</div>
      <div class="d">${ev.count} 笔交易</div></div>
    <div class="tile"><div class="l">盈亏比</div>
      <div class="v num">${isFinite(ev.profitFactor) ? ev.profitFactor.toFixed(2) : '—'}</div>
      <div class="d">每笔均值 ${sg(ev.avgR)} R</div></div>
    <div class="tile"><div class="l">最大回撤</div><div class="v num dn">${maxDrawdownR.toFixed(2)} R</div>
      <div class="d">账户评级 <b style="color:var(--brand)">${grade.letter}</b></div></div>
  </div>
  <div class="grid g2">
    <div class="panel"><div class="ph"><h3>资金权益曲线</h3><span class="sub">按笔累计 · 单位 R</span></div>
      <div class="pb">${equitySvg(equity)}</div></div>
    <div class="panel"><div class="ph"><h3>账户评级</h3><span class="sub">${esc(S.lastLabel)}</span></div>
      <div class="pb">${grade.rows.map(([k, v, s]) => `
        <div class="kv"><span>${k}</span><span>${v} <span class="pill ${s}">${s === 'good' ? '优' : s === 'mid' ? '中' : '弱'}</span></span></div>`).join('')}
      </div></div>
  </div>
  <div class="grid g3" style="margin-top:16px">
    ${breakdownPanel('多空盈亏分析', byDir)}
    ${breakdownPanel(isDaily ? '分星期盈亏分析' : '分时段盈亏分析', byTime)}
    ${breakdownPanel('持仓时长分析', byDur)}
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="panel"><div class="ph"><h3>R 倍数分布</h3><span class="sub">单笔盈亏的分布形态</span></div>
      <div class="pb"><div class="histo">${rHist.map(h => `
        <i class="${h.label.includes('−') || h.label.includes('<') ? 'neg' : 'pos'}"
           style="height:${(h.n / maxHist * 100).toFixed(1)}%" title="${h.label}: ${h.n} 笔"></i>`).join('')}</div>
        <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:10.5px;color:var(--mut)">
          ${rHist.map(h => `<span style="flex:1;text-align:center">${h.label}</span>`).join('')}</div></div></div>
    <div class="panel"><div class="ph"><h3>行为特征</h3><span class="sub">由交易记录直接计算</span></div>
      <div class="pb"><div class="blist">${behaviorItems(beh)}</div></div></div>
  </div>
  <div class="panel" style="margin-top:16px"><div class="pb"
    style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
    <div><b>想知道这个成绩里有多少是运气？</b>
      <div class="mut" style="font-size:13.5px">交易分析告诉你「发生了什么」，能力评估回答「这能不能用运气解释」。</div></div>
    <button class="btn btn-p" style="margin-left:auto" onclick="location.hash='#app/eval'">去做能力评估 →</button>
  </div></div>`;
}

function breakdownPanel(title, rows) {
  if (!rows.length) return '';
  const max = Math.max(...rows.map(r => Math.abs(r.r)), 0.001);
  return `<div class="panel"><div class="ph"><h3>${title}</h3></div><div class="pb"><div class="bench">
    ${rows.map(r => {
      const w = Math.abs(r.r) / max * 50;
      const col = r.r >= 0 ? 'var(--up)' : 'var(--dn)';
      return `<div class="brow" style="grid-template-columns:74px 1fr 74px">
        <span>${r.label}<div class="mut" style="font-size:11px">${r.n} 笔 · ${pc1(r.win)}</div></span>
        <div class="btrack"><i style="left:${r.r >= 0 ? 50 : 50 - w}%;width:${w}%;background:${col}"></i>
          <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line2)"></div></div>
        <span class="mono" style="text-align:right;color:${col}">${sg(r.r)} R</span></div>`;
    }).join('')}
  </div></div></div>`;
}

function behaviorItems(beh) {
  const usable = beh.filter(b => b.severity !== 'insufficient' && !(b.kind === 'problem' && b.severity === 'none'));
  if (!usable.length) return '<div class="mut" style="font-size:13.5px">样本量还不足以给出行为结论。</div>';
  const MAP = { problem: 'bad', strength: 'good', profile: 'na' };
  const SEV = { mild: '轻微', notable: '明显', severe: '严重' };
  return usable.map(b => {
    const tag = b.kind === 'problem' ? `问题·${SEV[b.severity] || ''}` : b.kind === 'strength' ? '优势' : '画像';
    return `<div class="bitem"><span class="pill ${MAP[b.kind] || 'bad'}">${tag}</span>
      <span><b>${b.label}</b><br><span class="mut">${md(b.evidence)}</span></span></div>`;
  }).join('');
}

function accountGrade(ev, maxDd) {
  const enough = ev.count >= 20;
  const score = (v, lo, hi) => !enough ? 'mid' : v >= hi ? 'good' : v <= lo ? 'bad' : 'mid';
  const rows = [
    ['盈利能力', `${sg(ev.avgR)} R / 笔`, score(ev.avgR, -0.05, 0.15)],
    ['胜率', pc1(ev.winRate), score(ev.winRate, 0.35, 0.55)],
    ['盈亏比', isFinite(ev.profitFactor) ? ev.profitFactor.toFixed(2) : '—', score(ev.profitFactor, 1.0, 1.6)],
    ['回撤控制', `${maxDd.toFixed(1)} R`, !enough ? 'mid' : maxDd < 8 ? 'good' : maxDd > 20 ? 'bad' : 'mid'],
    ['样本量', `${ev.count} 笔`, ev.count >= 40 ? 'good' : ev.count >= 20 ? 'mid' : 'bad'],
  ];
  const good = rows.filter(r => r[2] === 'good').length;
  const bad = rows.filter(r => r[2] === 'bad').length;
  const letter = !enough ? 'N/A' : good >= 4 ? 'A' : good >= 3 ? 'B+' : bad >= 3 ? 'C' : 'B';
  return { letter, rows };
}

function equitySvg(eq) {
  const w = 560, h = 190, pad = { l: 6, r: 6, t: 10, b: 16 };
  const n = eq.length;
  if (n < 2) return '<div class="mut">数据不足</div>';
  const hi = Math.max(...eq), lo = Math.min(...eq), span = (hi - lo) || 1;
  const X = i => pad.l + i / (n - 1) * (w - pad.l - pad.r);
  const Y = v => pad.t + (hi - v) / span * (h - pad.t - pad.b);
  const pts = eq.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const zeroY = Y(0), last = eq[n - 1];
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:190px;display:block" role="img"
      aria-label="资金权益曲线，期末 ${sg(last)} R">
    <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--brand)" stop-opacity=".26"/>
      <stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75].map(f => `<line x1="${pad.l}" x2="${w - pad.r}"
      y1="${(pad.t + f * (h - pad.t - pad.b)).toFixed(1)}" y2="${(pad.t + f * (h - pad.t - pad.b)).toFixed(1)}"
      stroke="var(--line)" stroke-width="1"/>`).join('')}
    ${zeroY > pad.t && zeroY < h - pad.b ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${zeroY.toFixed(1)}"
      y2="${zeroY.toFixed(1)}" stroke="var(--line2)" stroke-dasharray="4 3" stroke-width="1"/>` : ''}
    <polygon points="${pts} ${X(n - 1).toFixed(1)},${h - pad.b} ${X(0).toFixed(1)},${h - pad.b}" fill="url(#eqg)"/>
    <polyline points="${pts}" fill="none" stroke="var(--brand)" stroke-width="2"
      stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(n - 1).toFixed(1)}" cy="${Y(last).toFixed(1)}" r="3.5" fill="var(--brand)"/>
  </svg>
  <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--mut);margin-top:4px"
    class="mono"><span>起点 0.00 R</span><span>最高 ${sg(hi)} R</span><span>期末 ${sg(last)} R</span></div>`;
}
