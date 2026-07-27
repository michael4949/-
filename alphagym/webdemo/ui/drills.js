/* ══════════════════════════════════════════════════════════════════
   专项训练
   —— 「AI 说我哪里差」和「我去练哪里」之间，本来隔着一条鸿沟。这一页就是那座桥。

   设计的出发点只有一句：**训练项必须和评估维度一一对应**。
   能力评估把成绩拆成入场时机 / 方向 / 出场时机 / 仓位四维，
   那训练也就应该是这四项，而不是另起一套听起来很酷但没法验证的关卡。
   这样报告里那句「你的出场时机劣于随机」才有下文 —— 点一下就能去练它。

   四个训练各自把**其它三个维度固定住**，只让一个维度可变：
     · 入场时机：方向与持有根数由系统固定，你只决定「哪一根进」
     · 出场时机：入场点与方向由系统固定，你只决定「哪一根出」
     · 仓位：入场、出场、方向全部固定，你只决定「下多重」
     · 方向：即双盲测试 —— 品种日期全遮，你只判涨跌
   这不是为了好看，是统计上的必要条件：不控制住其它维度，
   那一维的零模型检验就没有意义。

   出完题之后，成绩走的是与主流程**完全相同**的 analyzeSession，
   只是把对应那一维单独拎出来显示。没有第二套打分逻辑。
   ══════════════════════════════════════════════════════════════════ */

const DRILL_SPECS = {
  entry: {
    key: 'entryTiming', title: '入场时机训练', icon: '⤓',
    dim: '入场时机',
    lede: '方向和持有根数由系统固定，你只决定<b>哪一根进场</b>。',
    how: '每题给你一个最多 30 根的窗口。看着行情逐根推进，觉得是时候就按「进场」；' +
         '按下之后按固定根数持有到期。窗口走完还没进，会在最后一根强制进场。',
    grades: '把你选的进场点，和在同样窗口里随机撞进去做比较。',
    qs: 8, window: 30, hold: 20,
  },
  exit: {
    key: 'exitTiming', title: '出场时机训练', icon: '⤒',
    dim: '出场时机',
    lede: '入场点和方向由系统固定，你只决定<b>哪一根出场</b>。',
    how: '每题开局你已经持有一笔仓位，成本线画在图上。逐根推进，' +
         '想走就按「平仓」。最多持有 30 根，到期强制平仓。',
    grades: '把你选的离场点，和在同样窗口里随便平掉做比较。',
    qs: 8, window: 30,
  },
  sizing: {
    key: 'sizing', title: '仓位管理训练', icon: '◧',
    dim: '仓位',
    lede: '进场、出场、方向全部由系统固定，你只决定<b>这一笔下多重</b>。',
    how: '每题给你一个形态和已经定好的交易计划，你只挑手数。' +
         '这一项练的是「把重仓押在好机会上」的能力，与看不看得准方向无关。',
    grades: '把你的仓位分配，和把同一组手数随机重排做比较。',
    qs: 10, hold: 20, sizes: [10, 20, 50, 100, 200],
  },
};

const DRILL_HISTORY = 120;

/* ── 出题 ───────────────────────────────────────────────────────── */
function drillPick(bars, n, need) {
  const lo = DRILL_HISTORY + 5, hi = bars.length - need - 5;
  const picks = [];
  let guard = 0;
  while (picks.length < n && guard++ < 8000) {
    const i = lo + Math.floor(Math.random() * (hi - lo));
    if (picks.every(p => Math.abs(p - i) > need + 12)) picks.push(i);
  }
  return picks.sort((a, b) => a - b);
}

function startDrill(kind) {
  const spec = DRILL_SPECS[kind];
  const syms = Object.keys(DATASETS);
  const sym = syms[Math.floor(Math.random() * syms.length)];
  const bars = barsOf(sym);
  const need = (spec.window || 0) + (spec.hold || 0) + 5;
  const picks = drillPick(bars, spec.qs, need);

  S.drill = {
    kind, spec, sym, bars, ins: INSTRUMENTS[sym],
    qs: picks.map(i => ({
      i0: i,              // 题目起点
      cursor: i,          // 当前已揭晓到哪一根
      dir: Math.random() < 0.5 ? 1 : -1,
      entry: null, exit: null, size: null,
      done: false,
    })),
    idx: 0, report: null,
  };
  // 出场训练：开局就已经在场内，入场点即题目起点
  if (kind === 'exit') for (const q of S.drill.qs) q.entry = q.i0;
  // 仓位训练：整条计划都由系统给定，你只挑手数
  if (kind === 'sizing') {
    for (const q of S.drill.qs) {
      q.entry = q.i0;
      q.exit = q.i0 + spec.hold;
      q.cursor = q.i0;
    }
  }
  renderDrill();
}

/* ── 渲染 ───────────────────────────────────────────────────────── */
function renderDrill() {
  const D = S.drill;
  const host = $('#v-drills');
  if (!D) { host.innerHTML = drillLanding(); bindLanding(); return; }

  const spec = D.spec, q = D.qs[D.idx];
  const answered = D.qs.filter(x => x.done).length;

  host.innerHTML = `
  <div class="tiles">
    <div class="tile hero-tile"><div class="l">训练维度</div>
      <div class="v">${spec.dim}</div><div class="d">${spec.grades}</div></div>
    <div class="tile"><div class="l">进度</div>
      <div class="v num" id="drillDone">${answered} / ${D.qs.length}</div>
      <div class="d" id="drillIdx">第 ${D.idx + 1} 题</div></div>
    <div class="tile"><div class="l">品种</div>
      <div class="v" style="font-size:16px">${DATASETS[D.sym].display}</div>
      <div class="d">题目时点已隐去</div></div>
    <div class="tile"><div class="l">本题方向</div>
      <div class="v num ${q.dir > 0 ? 'up' : 'dn'}">${q.dir > 0 ? '做多' : '做空'}</div>
      <div class="d">由系统固定，不是你的判断项</div></div>
  </div>

  <div class="row2">
    <div>
      <div class="panel deck">
        <div class="ph"><h3>${spec.title}</h3>
          <span class="sub" id="drillSub"></span>
          <button class="btn btn-g btn-sm" id="drillQuit" style="margin-left:auto">← 返回训练场</button></div>
        <div class="chartwrap"><div id="drillChart" style="width:100%;height:380px"></div>
          <div class="hud" id="drillHud"></div></div>
        <div class="deckbar" id="drillBar"></div>
        <div class="deckfoot">
          <div class="prog"><i id="drillProg"></i></div>
          <div class="qdots" id="drillDots"></div>
        </div>
      </div>
    </div>
    <div class="side">
      <div class="panel coach">
        <div class="ph"><span class="aidot">✦</span><h3>AI 教练</h3>
          <span class="sub">只练一个维度</span></div>
        <div class="pb">
          <p style="font-size:13.5px;color:var(--ink2);line-height:1.65">${spec.lede}</p>
          <div class="note info" style="margin-top:12px;font-size:12.5px">
            <span>◎</span><span>${spec.how}</span></div>
          <div id="drillReveal"></div>
        </div>
      </div>
      <div class="panel" id="drillResultPanel" style="display:none">
        <div class="ph"><h3>本组结果</h3></div>
        <div class="pb" id="drillResult"></div>
      </div>
    </div>
  </div>`;

  $('#drillQuit').onclick = () => { S.drill = null; renderDrill(); };
  drawDrillChart();
  renderDrillBar();
  renderDrillDots();
}

function drawDrillChart() {
  const D = S.drill, q = D.qs[D.idx];
  const c = getChart('drillChart', { ma: true });
  if (!c) return;
  const from = Math.max(0, q.i0 - DRILL_HISTORY);
  const rows = D.bars.slice(from, q.cursor + 1);
  c.applyNewData(rows.map(toK));
  c.setPriceVolumePrecision(dec(D.sym), 0);
  c.setStyles({
    candle: { tooltip: { showRule: 'follow_cross' } },
    indicator: { tooltip: { showRule: 'follow_cross' } },
    // 题目时点必须遮住：横轴上的真实年月会让人回忆起「那年是什么行情」
    xAxis: { tickText: { show: false }, tickLine: { show: false } },
  });
  try { c.removeOverlay(); } catch (e) {}

  const D2 = dec(D.sym);
  if (q.entry != null) {
    const px = D.bars[q.entry + 1]?.o ?? D.bars[q.entry].c;
    addLine(c, px, cssv('--brand'), `成本 ${fx(px, D2)}`);
    addMark(c, D.bars[q.entry], q.dir > 0 ? '多' : '空',
      q.dir > 0 ? cssv('--up') : cssv('--dn'));
  }
  if (q.exit != null) addMark(c, D.bars[q.exit], '平', cssv('--mut'));

  const last = D.bars[q.cursor];
  const hud = [`<span class="h"><b>${fx(last.c, D2)}</b></span>`];
  if (q.entry != null && q.exit == null) {
    const px = D.bars[q.entry + 1]?.o ?? D.bars[q.entry].c;
    const pnl = q.dir * (last.c - px) / px * 100;
    hud.push(`<span class="h ${q.dir > 0 ? 'long' : 'short'}">
      ${q.dir > 0 ? '多' : '空'} @ ${fx(px, D2)} <b>${sg(pnl)}%</b></span>`);
    hud.push(`<span class="h">已持有 <b>${q.cursor - q.entry}</b> 根</span>`);
  }
  $('#drillHud').innerHTML = hud.join('');
}

function renderDrillBar() {
  const D = S.drill, spec = D.spec, q = D.qs[D.idx];
  const bar = $('#drillBar');
  const sub = $('#drillSub');

  if (q.done) {
    bar.innerHTML = `<button class="stepbig" id="drillNext" style="margin:0 auto">
      <b>${D.idx < D.qs.length - 1 ? '下一题' : '看本组结果'}</b><kbd>空格</kbd></button>`;
    $('#drillNext').onclick = drillNext;
    sub.textContent = '已作答';
    return;
  }

  if (D.kind === 'sizing') {
    sub.textContent = `计划：${q.dir > 0 ? '做多' : '做空'} · 持有 ${spec.hold} 根 · 只选手数`;
    bar.innerHTML = `<div class="sizes">${spec.sizes.map(v =>
      `<button class="szbtn" data-v="${v}"><b>${v}</b><span>手</span></button>`).join('')}</div>`;
    $$('#drillBar .szbtn').forEach(b => b.onclick = () => answerSizing(+b.dataset.v));
    return;
  }

  const used = D.kind === 'entry' ? q.cursor - q.i0 : q.cursor - q.entry;
  sub.textContent = `窗口 ${used} / ${spec.window} 根`;
  const actLabel = D.kind === 'entry' ? '进场' : '平仓';
  bar.innerHTML = `
    <div class="acts three">
      <button class="act ${D.kind === 'entry' ? (q.dir > 0 ? 'buy' : 'sell') : 'flat'}" id="drillAct">
        <b>${actLabel}</b><kbd>↑</kbd></button>
      <button class="act" id="drillWait"><b>再等一根</b><kbd>空格</kbd></button>
      <button class="act" id="drillSkip"><b>快进 5 根</b><kbd>Tab</kbd></button>
    </div>`;
  $('#drillAct').onclick = () => drillCommit();
  $('#drillWait').onclick = () => drillStep(1);
  $('#drillSkip').onclick = () => drillStep(5);
}

function renderDrillDots() {
  const D = S.drill;
  $('#drillDots').innerHTML = D.qs.map((x, k) =>
    `<span class="qdot ${x.done ? (x.r > 0 ? 'ok' : 'no') : ''} ${k === D.idx ? 'cur' : ''}">${k + 1}</span>`).join('');
  $('#drillProg').style.width = (D.qs.filter(x => x.done).length / D.qs.length * 100) + '%';
}

/* ── 作答 ───────────────────────────────────────────────────────── */
function drillStep(n) {
  const D = S.drill, spec = D.spec, q = D.qs[D.idx];
  if (q.done) return;
  const base = D.kind === 'entry' ? q.i0 : q.entry;
  const limit = base + spec.window;
  q.cursor = Math.min(q.cursor + n, limit, D.bars.length - 2);
  drawDrillChart();
  renderDrillBar();
  // 走到窗口尽头就强制成交，别让「一直不动」变成一种躲避策略
  if (q.cursor >= limit) drillCommit(true);
}

function drillCommit(forced = false) {
  const D = S.drill, spec = D.spec, q = D.qs[D.idx];
  if (q.done) return;
  if (D.kind === 'entry') {
    q.entry = q.cursor;
    q.exit = Math.min(q.entry + spec.hold, D.bars.length - 2);
    q.size = 1;
  } else {
    q.exit = Math.max(q.cursor, q.entry + 1);
    q.size = 1;
  }
  gradeQuestion(forced);
}

function answerSizing(v) {
  const q = S.drill.qs[S.drill.idx];
  if (q.done) return;
  q.size = v;
  gradeQuestion(false);
}

/** 用真实后续行情结算这一题，并把 AI 的解读一并给出 */
function gradeQuestion(forced) {
  const D = S.drill, q = D.qs[D.idx];
  q.done = true;
  q.cursor = Math.min(q.exit, D.bars.length - 2);

  const ctx = makeContext(D.bars, D.ins, { refSize: 20 });
  const ev = evalTrades(ctx, [{ entry: q.entry, exit: q.exit, dir: q.dir, size: q.size }]);
  q.r = ev.rows.length ? ev.rows[0].r : 0;
  q.mae = ev.rows.length ? ev.rows[0].mae : 0;
  q.mfe = ev.rows.length ? ev.rows[0].mfe : 0;

  drawDrillChart();
  renderDrillBar();
  renderDrillDots();
  $('#drillDone').textContent = `${D.qs.filter(x => x.done).length} / ${D.qs.length}`;
  revealQuestion(forced);
}

/** 每题给一次即时反馈 —— 单题反馈只讲事实，不下能力判语，
 *  能力判语要等整组做完、样本够了才给。 */
function revealQuestion(forced) {
  const D = S.drill, q = D.qs[D.idx];
  const box = $('#drillReveal');
  const good = q.r > 0;

  let extra = '';
  if (D.kind === 'entry' || D.kind === 'exit') {
    // 把「同窗口里随便选一根」的结果分布摆出来，让人当场看到自己排第几
    const spec = D.spec;
    const base = D.kind === 'entry' ? q.i0 : q.entry;
    const alt = [];
    for (let k = base; k <= base + spec.window && k < D.bars.length - 2; k++) {
      const t = D.kind === 'entry'
        ? { entry: k, exit: Math.min(k + spec.hold, D.bars.length - 2), dir: q.dir, size: 1 }
        : { entry: q.entry, exit: Math.max(k, q.entry + 1), dir: q.dir, size: 1 };
      if (t.exit <= t.entry) continue;
      const e = evalTrades(makeContext(D.bars, D.ins, { refSize: 20 }), [t]);
      if (e.rows.length) alt.push(e.rows[0].r);
    }
    if (alt.length > 3) {
      const sorted = [...alt].sort((a, b) => a - b);
      const rank = sorted.filter(x => x < q.r).length / sorted.length;
      const best = sorted[sorted.length - 1], med = sorted[Math.floor(sorted.length / 2)];
      extra = `<div class="kv"><span>同窗口所有选择里排名</span>
          <span class="num ${rank >= 0.5 ? 'dn' : 'up'}">前 ${((1 - rank) * 100).toFixed(0)}%</span></div>
        <div class="kv"><span>随便选一根的中位结果</span><span class="num">${sg(med)} R</span></div>
        <div class="kv"><span>这个窗口的最优解</span><span class="num">${sg(best)} R</span></div>`;
    }
  }
  if (D.kind === 'sizing') {
    extra = `<div class="kv"><span>本题手数</span><span class="num">${q.size}</span></div>
      <div class="kv"><span>单位收益</span><span class="num ${good ? 'dn' : 'up'}">${sg(q.r / (q.size / 20))} R / 20 手</span></div>`;
  }

  box.innerHTML = `
    <div class="reveal" style="margin-top:12px">
      <b class="${good ? 'dn' : 'up'}">本题结果 ${sg(q.r)} R</b>
      ${forced ? '<span class="mut">（窗口走完，强制成交）</span>' : ''}
      <div class="kv" style="margin-top:8px"><span>最大浮亏 MAE</span><span class="num">${sg(q.mae)} R</span></div>
      <div class="kv"><span>最大浮盈 MFE</span><span class="num">${sg(q.mfe)} R</span></div>
      ${extra}
      <p class="mut" style="font-size:11.5px;margin-top:9px;line-height:1.6">
        单题结果几乎全是噪声，别据此调整打法。整组做完后才有统计结论。</p>
    </div>`;
}

function drillNext() {
  const D = S.drill;
  if (D.idx < D.qs.length - 1) { D.idx++; renderDrill(); return; }
  finishDrill();
}

/* ── 整组结算：走的是主流程同一个 analyzeSession ───────────────── */
function finishDrill() {
  const D = S.drill, spec = D.spec;
  const trades = D.qs.filter(q => q.done)
    .map(q => ({ entry: q.entry, exit: q.exit, dir: q.dir, size: q.size }));
  if (trades.length < 3) { toast('至少答完 3 题才能结算'); return; }

  // 这一组的记录同时进主评估流程，可以在「能力评估」里看完整报告
  S.lastTrades = trades;
  S.lastBars = D.bars;
  S.lastIns = D.ins;
  S.lastLabel = `${spec.title} · ${DATASETS[D.sym].display}`;
  S.report = null;

  const panel = $('#drillResultPanel');
  panel.style.display = '';
  $('#drillResult').innerHTML = `<div class="empty" style="padding:24px 8px">
    <span class="spin"></span> 正在做 ${spec.dim} 维度的随机化检验</div>`;

  setTimeout(() => {
    const r = analyzeSession({
      bars: D.bars, trades, instrument: D.ins,
      seed: (Math.random() * 1e9) | 0, iterations: 2000,
    });
    D.report = S.report = r;
    const dim = r.attribution.find(a => a.key === spec.key);
    const ctx = makeContext(D.bars, D.ins, { refSize: 20 });
    const ev = evalTrades(ctx, trades);

    let verdict, cls;
    if (!dim || !dim.available) {
      verdict = dim?.reason || '样本不足，这一组还判不了。';
      cls = 'na';
    } else {
      const pa = dim.pValueAdjusted ?? dim.pValue;
      if (pa <= 0.05) { verdict = `你的${spec.dim}明显优于随机。`; cls = 'good'; }
      else if (pa <= 0.2) { verdict = `方向向好，但还没到显著。`; cls = 'mid'; }
      else if (dim.percentile < 0.35) { verdict = `这一组里，你的${spec.dim}劣于随机 —— 值得继续练。`; cls = 'bad'; }
      else { verdict = `与随机无法区分。${trades.length} 题的样本量本来也很难分辨。`; cls = 'na'; }
    }

    $('#drillResult').innerHTML = `
      <span class="pill ${cls}">${spec.dim}</span>
      <p style="margin:10px 0 12px;font-weight:600;line-height:1.6">${verdict}</p>
      <div class="kv"><span>本组累计</span><span class="num ${ev.totalR >= 0 ? 'dn' : 'up'}">${sg(ev.totalR)} R</span></div>
      <div class="kv"><span>正收益题数</span><span class="num">${ev.rows.filter(x => x.r > 0).length} / ${ev.rows.length}</span></div>
      ${dim?.available ? `
        <div class="kv"><span>随机对照中位</span><span class="num">${sg(dim.nullMedianR)} R</span></div>
        <div class="kv"><span>你的百分位</span><span class="num">${(dim.percentile * 100).toFixed(0)}%</span></div>
        <div class="kv"><span>p 值（Holm 校正）</span><span class="num">${(dim.pValueAdjusted ?? dim.pValue).toFixed(3)}</span></div>` : ''}
      <div class="note" style="margin-top:12px;font-size:12px"><span>⚠</span>
        <span>${trades.length} 题只是一组热身。想让结论站得住，按当前信噪比还需要
        <b>${isFinite(r.power.requiredTrades) ? r.power.requiredTrades : '很多'}</b> 笔样本。</span></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-p btn-sm" id="drillAgain">再来一组</button>
        <button class="btn btn-g btn-sm" onclick="location.hash='#app/eval'">看完整报告</button>
      </div>`;
    $('#drillAgain').onclick = () => startDrill(D.kind);
  }, 50);
}

/* ── 落地页 ─────────────────────────────────────────────────────── */
function drillLanding() {
  // 有报告就把最差的那一维标出来 —— 这一页存在的意义就是接住那句判语
  let weakest = null;
  if (S.report?.attribution) {
    const avail = S.report.attribution.filter(a => a.available);
    if (avail.length) weakest = [...avail].sort((a, b) => a.edgeR - b.edgeR)[0];
  }
  const mapKey = { entryTiming: 'entry', exitTiming: 'exit', sizing: 'sizing', direction: 'blind' };
  const weakKind = weakest ? mapKey[weakest.key] : null;

  const cards = [
    ...Object.entries(DRILL_SPECS).map(([kind, s]) => ({ kind, ...s })),
    { kind: 'blind', key: 'direction', title: '双盲测试', icon: '◫', dim: '方向',
      lede: '品种、日期、坐标轴全部隐去，你只判涨跌。',
      grades: '把你判的多空，和把同一组标签随机重排做比较。', qs: 10 },
  ];

  return `
  <div class="drill-head">
    <h2>四个维度，各练各的</h2>
    <p>能力评估把成绩拆成四个维度，训练也就是这四项 —— 报告里指出哪一维差，
      点进去练的就是那一维。每个训练都把其余三维固定住，
      这样那一维的随机化检验才成立。</p>
    ${weakest ? `<div class="note" style="margin-top:16px;max-width:660px">
      <span>✦</span><span>上一份报告里，<b>${weakest.label}</b>是你四维中最弱的一项
      （边际贡献 ${sg(weakest.edgeR)} R，百分位 ${(weakest.percentile * 100).toFixed(0)}%）。
      建议从它开始。</span></div>` : `<div class="note info" style="margin-top:16px;max-width:660px">
      <span>◎</span><span>还没有能力评估报告。先去
      <a href="#app/replay" style="color:var(--brand);font-weight:600">行情回放</a>
      跑一轮，AI 会告诉你四维里哪一维最该练。</span></div>`}
  </div>

  <div class="grid g2" style="margin-top:26px">
    ${cards.map(c => `
      <div class="drillcard ${c.kind === weakKind ? 'weak' : ''}">
        ${c.kind === weakKind ? '<span class="flag">AI 建议优先练</span>' : ''}
        <div class="dc-h"><span class="dc-ic">${c.icon}</span>
          <div><h3>${c.title}</h3><span class="dc-dim">评估维度 · ${c.dim}</span></div></div>
        <p>${c.lede}</p>
        <div class="dc-g"><b>怎么评分</b>${c.grades}</div>
        <button class="btn ${c.kind === weakKind ? 'btn-p' : 'btn-g'}" data-drill="${c.kind}">
          开始 ${c.qs} 题</button>
      </div>`).join('')}
  </div>`;
}

function bindLanding() {
  $$('#v-drills [data-drill]').forEach(b => b.onclick = () => {
    if (b.dataset.drill === 'blind') { location.hash = '#app/blind'; return; }
    startDrill(b.dataset.drill);
  });
}

/** 专项训练的键盘流：和主训练台保持同一套手感 */
function drillKey(e) {
  const D = S.drill; if (!D) return false;
  const q = D.qs[D.idx];
  if (e.key === ' ') {
    e.preventDefault();
    if (q.done) drillNext(); else if (D.kind !== 'sizing') drillStep(1);
    return true;
  }
  if (q.done) return false;
  if (e.key === 'ArrowUp' && D.kind !== 'sizing') { e.preventDefault(); drillCommit(); return true; }
  if (e.key === 'Tab' && D.kind !== 'sizing') { e.preventDefault(); drillStep(5); return true; }
  if (D.kind === 'sizing' && /^[1-5]$/.test(e.key)) {
    e.preventDefault(); answerSizing(D.spec.sizes[+e.key - 1]); return true;
  }
  return false;
}
