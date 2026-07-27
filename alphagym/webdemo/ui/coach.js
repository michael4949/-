/* ══════════════════════════════════════════════════════════════════
   AI 教练栏
   —— 回放页右上角那一栏，是这个产品「AI 赋能」的正面入口。

   两条产品原则写死在这里：

   1）练习中静默。
      教练栏在你练的时候只显示决策次数、累计 R 这类计数，
      **不做任何评价**。理由很实在：一边做决策一边被点评，
      练出来的是「迎合点评」，不是判断力。真正的归因在一轮结束后
      一次性给足 —— 那时样本才够，统计检验才有意义。

   2）决策前的形态提示只许用「当下之前」的历史。
      这是产品的地基。提示面板检索历史相似形态，但任何一个
      时间戳晚于当前回放日期的片段都会被剔除 —— 否则就是拿
      2015 年的走势去提示 2008 年的决策，等于用未来数据作弊。
      过滤条件写在 coachHint() 里，并在界面上明说。
   ══════════════════════════════════════════════════════════════════ */

const COACH = { hints: 0, log: [], expanded: false, index: null, busy: false };

function coachReset() {
  COACH.hints = 0;
  COACH.log = [];
  COACH.expanded = false;
  const rail = $('#coach');
  if (rail) rail.classList.remove('expanded');
  $('#v-replay .row2')?.classList.remove('reporting');
  $('#coachReport').innerHTML = '';
  $('#coachHintBox').innerHTML = '';
  coachRefresh();
}

/** 练习中的静默态：只有计数，没有评价 */
function coachRefresh() {
  const s = S.session;
  if (!s || COACH.expanded) return;
  const e = s.engine;
  const ctx = makeContext(S.segBars, S.ins, { atrPeriod: 14, refSize: 20 });
  const done = e.closedTrades.length
    ? evalTrades(ctx, e.closedTrades.map(t => ({ entry: t.entry, exit: t.exit, dir: t.dir, size: t.size })))
    : null;

  $('#cDecisions').textContent = S.decisions;
  $('#cTrades').textContent = e.closedTrades.length;
  $('#cR').textContent = done ? sg(done.totalR) : '—';
  $('#cR').className = 'num ' + (done ? (done.totalR > 0 ? 'up' : done.totalR < 0 ? 'dn' : '') : '');
  $('#cHints').textContent = COACH.hints;
  $('#cHintRow').classList.toggle('hide', COACH.hints === 0);

  // 样本量是这一栏唯一「有指导性」的信息，因为它不评价你，只说明还差多少
  const need = MIN_TRADES_FOR_VERDICT - e.closedTrades.length;
  $('#cProgress').textContent = need > 0
    ? `再完成 ${need} 笔可出统计结论`
    : '样本已够，随时可以结束本轮';
  $('#cProgBar').style.width =
    Math.min(100, (e.closedTrades.length / MIN_TRADES_FOR_VERDICT) * 100) + '%';
}

/* ── 决策前的形态提示 ─────────────────────────────────────────────
   用 src/similar.js 检索历史相似形态，给出它们之后的**条件分布**。
   注意它给的是分布，不是方向结论 —— 「后 20 根中位 +0.8%，上涨占 56%」
   和「建议做多」是两回事，后者这个产品永远不会说。 */
function coachHint() {
  const s = S.session;
  if (!s || s.finished) { toast('本轮已结束'); return; }
  if (COACH.busy) return;
  const box = $('#coachHintBox');
  COACH.busy = true;
  box.innerHTML = `<div class="hintcard loading"><span class="spin"></span> 正在检索历史相似形态…</div>`;

  setTimeout(() => {
    try {
      if (!COACH.index) COACH.index = buildIndex(datasetsAll(), { window: 60, stride: 3, dim: 24, horizon: 20 });
      const ds = datasetsAll();
      const nowT = S.segBars[s.cursor].t;

      // 当前形态取自本轮的可见区间；编码只用游标之前的数据
      const vis = s.visibleBars();
      const vec = encode(vis, vis.length - 1, COACH.index.window, COACH.index.dim);
      if (!vec) { box.innerHTML = hintErr('当前窗口无法编码（走势过于走平或数据不足）'); return; }

      // ⚠️ 地基条款：只保留发生在**当前回放日期之前**的片段。
      // 索引里含有全部四个品种的完整历史，其中相当一部分晚于此刻，
      // 拿它们来提示就是用未来数据作弊。
      const all = search(vec, COACH.index, { k: 400 });
      const past = all.filter(m => {
        const bars = ds[m.symbol]?.bars;
        const tail = bars?.[m.end + COACH.index.horizon];
        return tail && tail.t < nowT;          // 连它之后 20 根都必须已经发生
      }).slice(0, 24);

      if (past.length < 5) {
        box.innerHTML = hintErr(`此刻之前只找到 ${past.length} 段相似形态，样本太少，不给分布`);
        return;
      }
      const st = forwardStats(past, ds, COACH.index.horizon);
      COACH.hints++;
      COACH.log.push({ at: s.cursor, t: nowT, n: past.length });

      const bar = (lo, hi, v) => ((v - lo) / ((hi - lo) || 1) * 100).toFixed(1);
      const lo = Math.min(st.p05, 0), hi = Math.max(st.p95, 0);
      box.innerHTML = `
        <div class="hintcard">
          <div class="hh">
            <b>历史上 ${st.n} 段相似形态</b>
            <span class="mut">之后 ${st.horizon} 根的分布</span>
          </div>
          <div class="hbar">
            <i class="band" style="left:${bar(lo, hi, st.p25)}%;width:${(bar(lo, hi, st.p75) - bar(lo, hi, st.p25)).toFixed(1)}%"></i>
            <i class="zero" style="left:${bar(lo, hi, 0)}%"></i>
            <i class="med" style="left:${bar(lo, hi, st.median)}%"></i>
          </div>
          <div class="hlbl"><span>${sg(st.p05 * 100)}%</span><span>中位 ${sg(st.median * 100)}%</span><span>${sg(st.p95 * 100)}%</span></div>
          <div class="hrow">
            <span>上涨占比</span><b class="num">${(st.upRate * 100).toFixed(0)}%</b>
            <span>四分位区间</span><b class="num">${sg(st.p25 * 100)}% ~ ${sg(st.p75 * 100)}%</b>
          </div>
          <p class="hnote">这是<b>条件分布</b>，不是方向建议。样本全部来自
            <b>${ymd(nowT)} 之前</b>已经走完的行情 —— 之后的历史一段都没用。</p>
        </div>`;
      coachRefresh();
    } catch (err) {
      box.innerHTML = hintErr(String(err && err.message || err));
    } finally {
      COACH.busy = false;
    }
  }, 30);
}
function hintErr(msg) {
  COACH.busy = false;
  return `<div class="hintcard err"><b>没有给出提示</b><p>${msg}</p></div>`;
}

/* ── 结束本轮：同一栏原地展开完整评估 ───────────────────────────── */
function coachExpand() {
  COACH.expanded = true;
  $('#coach').classList.add('expanded');
  $('#v-replay .row2').classList.add('reporting');
  resizeCharts();
  const rep = $('#coachReport');
  rep.innerHTML = `<div class="empty" style="padding:40px 16px"><h3><span class="spin"></span> 正在计算</h3>
    <p>${S.lastTrades.length} 笔交易 × 5 个零模型 × 2000 次蒙特卡洛</p></div>`;

  setTimeout(() => {
    const t0 = performance.now();
    const r = analyzeSession({
      bars: S.lastBars, trades: S.lastTrades, instrument: S.lastIns,
      seed: (Math.random() * 1e9) | 0, iterations: 2000,
    });
    S.report = r;
    renderEval(r, Math.round(performance.now() - t0), rep, { compact: true, hints: COACH.hints });
    rep.scrollIntoView({ block: 'nearest' });
  }, 50);
}

function coachCollapse() {
  COACH.expanded = false;
  $('#coach').classList.remove('expanded');
  $('#v-replay .row2').classList.remove('reporting');
  $('#coachReport').innerHTML = '';
  resizeCharts();
  coachRefresh();
}
