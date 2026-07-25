/* ══════════════════════════════════════════════════════════════════
   行情回放 · 模拟交易 · 双盲测试 · 交易分析
   全部走 src/replay.js + src/matching.js + src/trades.js 的真实内核。
   ══════════════════════════════════════════════════════════════════ */

const SEG_LEN = 1000, WARMUP = 120, INITIAL_CASH = 200000;

/* ── 行情回放 ───────────────────────────────────────────────────── */
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
  S.session = new ReplaySession({
    bars: S.segBars, instrument: S.ins,
    rules: { t1: false, allowShort: true, marginRate: 1, maintenanceRate: 0 },
    initialCash: INITIAL_CASH, startAt: WARMUP, blind: false,
    seed: (Math.random() * 1e9) | 0,
  });
  const d = DATASETS[S.ds];
  $('#rTitle').textContent = `${d.display} · ${d.symbol}`;
  $('#rSub').textContent = `${TF_LABEL[d.timeframe]} · 本轮 ${S.segBars.length} 根 · 红涨绿跌`;

  const c = getChart('chart', { ma: true, vol: true });
  c.applyNewData(S.session.visibleBars().map(toK));
  c.setPriceVolumePrecision(dec(S.ds), 0);
  refreshReplay();
  toast('新一轮已开始');
}

function refreshReplay() {
  const s = S.session; if (!s) return;
  const e = s.engine, vis = s.visibleBars();
  const px = vis.length ? vis[vis.length - 1].c : 0;
  const eq = e.equityAt(px);
  const flt = e.position * (px - e.avgPrice) * S.ins.multiplier;
  const D = dec(S.ds);

  $('#tEq').textContent = fx(eq, 0);
  $('#tEq').className = 'v num ' + (eq >= INITIAL_CASH ? 'up' : 'dn');
  $('#tEqD').textContent = `${sg(eq - INITIAL_CASH, 0)} · ${sg((eq / INITIAL_CASH - 1) * 100)}%`;
  $('#tEqD').className = 'd ' + (eq >= INITIAL_CASH ? 'up' : 'dn');

  $('#tPos').textContent = e.position === 0 ? '空仓' : `${e.position > 0 ? '多' : '空'} ${Math.abs(e.position)}`;
  $('#tPos').className = 'v num ' + (e.position > 0 ? 'up' : e.position < 0 ? 'dn' : '');
  $('#tPosD').textContent = e.position ? `均价 ${fx(e.avgPrice, D)}` : '—';

  $('#tFlt').textContent = e.position ? sg(flt, 0) : '—';
  $('#tFlt').className = 'v num ' + (flt > 0 ? 'up' : flt < 0 ? 'dn' : '');
  $('#tFltD').textContent = e.position ? `现价 ${fx(px, D)}` : '—';

  const pr = s.progress;
  $('#tPrg').textContent = (pr * 100).toFixed(0) + '%';
  $('#tPrgD').textContent = `${s.cursor + 1} / ${s.totalBars} 根`;
  $('#prgBar').style.width = (pr * 100) + '%';

  $('#sCash').textContent = fx(e.cash, 0);
  $('#sAvg').textContent = e.position ? fx(e.avgPrice, D) : '—';
  $('#sLast').textContent = fx(px, D);
  $('#sPend').textContent = e.orders.filter(o => o.status === 'pending').length;

  const ct = e.closedTrades;
  $('#fillCount').textContent = `${ct.length} 笔`;
  $('#fills').innerHTML = ct.length
    ? ct.slice(-40).reverse().map(t => `<div class="fill">
        <span class="${t.dir > 0 ? 'up' : 'dn'}">${t.dir > 0 ? '多' : '空'}${t.size}</span>
        <span class="mut">${fx(t.entryPrice, D)} → ${fx(t.exitPrice, D)}</span>
        <span class="${t.pnl >= 0 ? 'up' : 'dn'}">${sg(t.pnl, 0)}</span></div>`).join('')
    : '<div class="mut" style="font-size:13px">还没有成交</div>';

  $('#endBtn').disabled = ct.length === 0 && e.position === 0;
}

function stepOnce() {
  const s = S.session;
  if (!s || s.finished) { stopPlay(); return false; }
  if (!s.step()) { stopPlay(); toast('本轮行情已播放完毕'); return false; }
  const bar = s.visibleBars()[s.cursor];
  if (bar) charts.chart?.updateData(toK(bar));
  refreshReplay();
  return true;
}
function startPlay() {
  if (!S.session || S.session.finished) return;
  S.playing = true; $('#playBtn').textContent = '❚❚';
  S.timer = setInterval(() => { if (!stepOnce()) stopPlay(); }, Math.max(16, 420 / S.speed));
}
function stopPlay() {
  S.playing = false;
  const b = $('#playBtn'); if (b) b.textContent = '▶';
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
}

/** 机械策略代跑：只能读 visibleBars()，想偷看未来会抛 FutureDataError */
function autoRun() {
  stopPlay();
  const s = S.session; if (!s || s.finished) { toast('本轮已结束，请先开新一轮'); return; }
  const qty = Math.max(1, parseInt($('#oQty').value) || 20);
  let pos = s.engine.position, guard = 0;
  while (!s.finished && guard++ < 20000) {
    const vis = s.visibleBars();
    if (vis.length >= 35) {
      const ma = (p) => { let t = 0; for (let i = vis.length - p; i < vis.length; i++) t += vis[i].c; return t / p; };
      const want = ma(10) > ma(30) ? 1 : -1;
      if (want !== pos) {
        if (pos !== 0) s.submitOrder({ type: 'market', dir: -pos, qty: Math.abs(s.engine.position), reduceOnly: true });
        s.submitOrder({ type: 'market', dir: want, qty });
        pos = want;
      }
    }
    if (!s.step()) break;
  }
  charts.chart?.applyNewData(s.visibleBars().map(toK));
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
  toast(`本轮 ${res.trades.length} 笔交易已记录`);
  location.hash = '#app/analysis';
}

function submitOrder() {
  const s = S.session;
  if (!s || s.finished) { toast('本轮已结束'); return; }
  const qty = parseInt($('#oQty').value);
  if (!(qty > 0)) { toast('手数必须为正整数'); return; }
  const type = $('#oType').value;
  const order = { type, dir: S.dir, qty };
  if (type !== 'market') {
    const p = parseFloat($('#oPrice').value);
    if (!isFinite(p)) { toast('请填写委托价 / 触发价'); return; }
    order.price = p;
  }
  const sl = parseFloat($('#oSL').value), tp = parseFloat($('#oTP').value);
  if (isFinite(sl)) order.stopLoss = sl;
  if (isFinite(tp)) order.takeProfit = tp;
  const o = s.submitOrder(order);
  toast(o.status === 'rejected' ? '已拒绝：' + o.reason
    : type === 'market' ? '已挂单 · 下一根开盘成交' : '已挂单 · 价格触及后成交');
  refreshReplay();
}

/* ── 双盲测试 ───────────────────────────────────────────────────── */
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
      i,
      scale: 0.3 + Math.random() * 3,
      // 时间戳同步平移：只遮住品种名不够，横轴上的真实年月同样会暴露是哪一段行情
      tShift: Math.floor((Math.random() - 0.5) * 7300) * 86400000,
      ans: null, correct: null, fwd: null,
    })),
    idx: 0, right: 0, answered: 0,
  };
  renderBlind();
  toast(`已出 ${picks.length} 题`);
}

function renderBlind() {
  const B = S.blind; if (!B) return;
  const q = B.qs[B.idx];
  const seg = B.bars.slice(q.i - BLIND_HISTORY, q.i + 1).map(b => ({
    t: b.t + q.tShift, o: b.o * q.scale, h: b.h * q.scale,
    l: b.l * q.scale, c: b.c * q.scale, v: b.v,
  }));
  const c = getChart('bChart', { ma: true });
  c.applyNewData(seg.map(toK));
  c.setPriceVolumePrecision(4, 0);

  $('#bSub').textContent = `第 ${B.idx + 1} / ${B.qs.length} 题 · 判定周期 ${B.horizon} 根`;
  $('#bMask').textContent = q.ans === null
    ? '品种 ██████ · 日期 ████-██-██'
    : `${DATASETS[B.sym].display} · ${ymd(B.bars[q.i].t)}`;
  $('#bDone').textContent = `${B.answered} / ${B.qs.length}`;
  $('#bRight').textContent = B.right;
  const graded = B.qs.filter(x => x.correct !== null).length;
  $('#bRate').textContent = graded ? ((B.right / graded) * 100).toFixed(0) + '%' : '—';
  $('#bDots').innerHTML = B.qs.map((x, k) =>
    `<span class="qdot ${x.ans === null ? '' : x.correct === true ? 'ok' : x.correct === false ? 'no' : ''} ${k === B.idx ? 'cur' : ''}">${k + 1}</span>`).join('');
  $$('.ans button').forEach(b => b.disabled = q.ans !== null);
  $('#bEval').disabled = blindTrades().length < 3;
  if (q.ans === null) $('#bReveal').innerHTML = '作答后揭晓品种与日期，并用真实后续行情计算这一题的结果。';
}

function answerBlind(a) {
  const B = S.blind; if (!B) return;
  const q = B.qs[B.idx];
  if (q.ans !== null) return;

  const b0 = B.bars[q.i], b1 = B.bars[q.i + B.horizon];
  const fwd = (b1.c - b0.c) / b0.c;
  q.ans = a; q.fwd = fwd;
  B.answered++;

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

/* ── 交易分析（复刻 TEx 的原生分析口径）──────────────────────────── */
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

  // 分方向
  const byDir = [1, -1].map(d => {
    const rows = ev.rows.filter(r => r.dir === d);
    return { label: d > 0 ? '多头' : '空头', n: rows.length,
      r: rows.reduce((a, x) => a + x.r, 0),
      win: rows.length ? rows.filter(x => x.net > 0).length / rows.length : 0 };
  }).filter(x => x.n);

  // 分时段：日线按星期几，日内按小时
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

  // 分持仓时长
  const durBands = [[0, 3, '≤3 根'], [3, 10, '4–10 根'], [10, 30, '11–30 根'], [30, 1e9, '>30 根']];
  const byDur = durBands.map(([lo, hi, label]) => {
    const rows = ev.rows.filter(r => r.holdBars > lo && r.holdBars <= hi);
    return { label, n: rows.length, r: rows.reduce((a, x) => a + x.r, 0),
      win: rows.length ? rows.filter(x => x.net > 0).length / rows.length : 0 };
  }).filter(x => x.n);

  // R 倍数分布
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
    <div class="panel"><div class="ph"><h3>账户评级</h3><span class="sub">${S.lastLabel}</span></div>
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

/** 账户评级：多维打分，刻意保守 —— 样本不足一律给「中」 */
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

/** 权益曲线：内联 SVG，随主题变色，不引第二个图表库 */
function equitySvg(eq) {
  const w = 560, h = 190, pad = { l: 6, r: 6, t: 10, b: 16 };
  const n = eq.length;
  if (n < 2) return '<div class="mut">数据不足</div>';
  const hi = Math.max(...eq), lo = Math.min(...eq), span = (hi - lo) || 1;
  const X = i => pad.l + i / (n - 1) * (w - pad.l - pad.r);
  const Y = v => pad.t + (hi - v) / span * (h - pad.t - pad.b);
  const pts = eq.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const zeroY = Y(0);
  const last = eq[n - 1];
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
