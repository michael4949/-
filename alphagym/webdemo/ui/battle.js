/* ══════════════════════════════════════════════════════════════════
   K 线对战

   你和一个陪练在**同一段行情、同一时点、同一套成本**下同时做决策，
   逐根推进，权益曲线并排走。它不是花活，是把「我到底比机械策略强在哪」
   这个问题压缩成一屏能看完的东西。

   公平性上有三条硬约束：
     · 同一段 K 线、同一个起点、同一个初始资金
     · 双方走同一个撮合引擎、同一套手续费滑点
     · 陪练只能读到和你一样的可见区间，读不到未来
   对手用的是 src/contest.js 里那批策略，逐根即时决策，
   而不是先跑完全程再回放 —— 后者会让它带着「已经知道结局」的优势。
   ══════════════════════════════════════════════════════════════════ */

const BATTLE_LEN = 260, BATTLE_WARMUP = 120, BATTLE_CASH = 200000;

function startBattle(botId) {
  const bot = ROSTER.find(b => b.id === botId) || ROSTER[0];
  const syms = Object.keys(DATASETS);
  const sym = syms[Math.floor(Math.random() * syms.length)];
  const bars = barsOf(sym);
  const start = Math.floor(Math.random() * Math.max(1, bars.length - BATTLE_LEN - 5));
  const seg = bars.slice(start, start + BATTLE_LEN);
  const ins = INSTRUMENTS[sym];

  const mk = () => new MatchingEngine({
    bars: seg, instrument: ins,
    rules: { t1: false, allowShort: true, marginRate: 1, maintenanceRate: 0 },
    initialCash: BATTLE_CASH,
  });

  S.battle = {
    bot, sym, seg, ins,
    me: mk(), ai: mk(),
    cursor: BATTLE_WARMUP,
    rng: makeRng((Math.random() * 1e9) | 0).next,
    aiWant: 0,
    meCurve: [], aiCurve: [],
    decisions: 0, over: false,
  };
  stepBattleTo(BATTLE_WARMUP);
  renderBattle();
}

/** 双方都推进到第 i 根（撮合发生在这一根） */
function stepBattleTo(i) {
  const B = S.battle;
  B.me.step(i);
  B.ai.step(i);
  B.cursor = i;
  const px = B.seg[i].c;
  B.meCurve.push(B.me.equityAt(px) - BATTLE_CASH);
  B.aiCurve.push(B.ai.equityAt(px) - BATTLE_CASH);
}

/** 陪练在第 i 根收盘后做决策 —— 只看得到 seg[0..i]，和你一样 */
function aiDecide(i) {
  const B = S.battle;
  const visible = B.seg.slice(0, i + 1);
  const d = botDecide(B.bot, visible, i, B.rng);
  if (d === null || d === B.aiWant) return;
  const pos = B.ai.position;
  if (pos !== 0) B.ai.submit({ type: OrderType.MARKET, dir: -Math.sign(pos), qty: Math.abs(pos), reduceOnly: true });
  if (d !== 0) B.ai.submit({ type: OrderType.MARKET, dir: d, qty: 20 });
  B.aiWant = d;
}

function battleAct(dir) {
  const B = S.battle;
  if (!B || B.over) return;
  const e = B.me;
  if (dir === 0) {
    if (e.position === 0) { toast('你当前是空仓'); return; }
    B.me.submit({ type: OrderType.MARKET, dir: -Math.sign(e.position), qty: Math.abs(e.position), reduceOnly: true });
  } else {
    if (e.position !== 0 && Math.sign(e.position) !== dir) {
      B.me.submit({ type: OrderType.MARKET, dir: -Math.sign(e.position), qty: Math.abs(e.position), reduceOnly: true });
    }
    B.me.submit({ type: OrderType.MARKET, dir, qty: 20 });
  }
  B.decisions++;
  battleStep();
}

function battleStep() {
  const B = S.battle;
  if (!B || B.over) return;
  aiDecide(B.cursor);                 // 陪练在同一根收盘后决策
  const next = B.cursor + 1;
  if (next >= B.seg.length - 1) { endBattle(); return; }
  stepBattleTo(next);
  renderBattle();
}

function endBattle() {
  const B = S.battle;
  if (!B || B.over) return;
  // 双方都收尾平仓，浮盈浮亏必须落袋，否则成绩不可比
  for (const eng of [B.me, B.ai]) {
    if (eng.position !== 0) {
      eng.submit({ type: OrderType.MARKET, dir: -Math.sign(eng.position), qty: Math.abs(eng.position), reduceOnly: true });
    }
  }
  const last = B.seg.length - 1;
  B.me.step(last); B.ai.step(last);
  const px = B.seg[last].c;
  B.meCurve.push(B.me.equityAt(px) - BATTLE_CASH);
  B.aiCurve.push(B.ai.equityAt(px) - BATTLE_CASH);
  B.cursor = last;
  B.over = true;

  // 战绩记进账户，同时可以拿去做能力评估
  const trades = B.me.closedTrades.map(t => ({ entry: t.entry, exit: t.exit, dir: t.dir, size: t.size }));
  if (trades.length) {
    S.lastTrades = trades;
    S.lastBars = B.seg;
    S.lastIns = B.ins;
    S.lastLabel = `K 线对战 · ${DATASETS[B.sym].display}`;
    S.report = null;
  }
  renderBattle();
}

function renderBattle() {
  const B = S.battle;
  const host = $('#v-battle');
  if (!B) { host.innerHTML = battleLanding(); bindBattleLanding(); return; }

  const px = B.seg[B.cursor].c;
  const meEq = B.me.equityAt(px) - BATTLE_CASH;
  const aiEq = B.ai.equityAt(px) - BATTLE_CASH;
  const lead = meEq - aiEq;
  const D = dec(B.sym);
  const posTxt = (e) => e.position === 0 ? '空仓' : `${e.position > 0 ? '多' : '空'} ${Math.abs(e.position)}`;

  host.innerHTML = `
  <div class="tiles">
    <div class="tile hero-tile"><div class="l">领先 / 落后</div>
      <div class="v num ${lead >= 0 ? 'up' : 'dn'}">${sg(lead, 0)}</div>
      <div class="d">你 ${sg(meEq, 0)} · 对手 ${sg(aiEq, 0)}</div></div>
    <div class="tile"><div class="l">你的持仓</div>
      <div class="v num ${B.me.position > 0 ? 'up' : B.me.position < 0 ? 'dn' : ''}">${posTxt(B.me)}</div>
      <div class="d">决策 ${B.decisions} 次</div></div>
    <div class="tile"><div class="l">对手持仓</div>
      <div class="v num ${B.ai.position > 0 ? 'up' : B.ai.position < 0 ? 'dn' : ''}">${posTxt(B.ai)}</div>
      <div class="d">${B.bot.name} · ${B.bot.tag}</div></div>
    <div class="tile"><div class="l">进度</div>
      <div class="v num">${B.cursor - BATTLE_WARMUP + 1} / ${B.seg.length - BATTLE_WARMUP - 1}</div>
      <div class="d">${B.over ? '本局已结束' : '逐根推进'}</div></div>
  </div>

  <div class="row2">
    <div>
      <div class="panel deck">
        <div class="ph"><h3>${DATASETS[B.sym].display}</h3>
          <span class="sub">对手只看得到和你一样的区间</span>
          <button class="btn btn-g btn-sm" id="btlQuit" style="margin-left:auto">← 换对手</button></div>
        <div class="chartwrap"><div id="btlChart" style="width:100%;height:330px"></div>
          <div class="hud" id="btlHud"></div></div>
        <div class="mtf"><div class="mtf-label">权益对比 · 你 vs ${B.bot.name}</div>
          <div id="btlEquity" style="width:100%;height:130px;position:relative"></div></div>
        <div class="deckbar">
          ${B.over ? `<button class="stepbig" id="btlAgain" style="margin:0 auto"><b>再战一局</b></button>`
          : `<div class="acts three">
              <button class="act buy" id="btlBuy"><b>做多</b><kbd>↑</kbd></button>
              <button class="act sell" id="btlSell"><b>做空</b><kbd>↓</kbd></button>
              <button class="act flat" id="btlFlat"><b>平仓</b><kbd>X</kbd></button>
            </div>
            <button class="stepbig" id="btlPass"><b>不动，推进一根</b><kbd>空格</kbd></button>`}
        </div>
      </div>
    </div>

    <div class="side">
      <div class="panel coach">
        <div class="ph"><span class="aidot">✦</span><h3>${B.over ? '本局结果' : '对局中'}</h3></div>
        <div class="pb" id="btlPanel"></div>
      </div>
    </div>
  </div>`;

  $('#btlQuit').onclick = () => { S.battle = null; renderBattle(); };
  if (B.over) { $('#btlAgain').onclick = () => startBattle(B.bot.id); }
  else {
    $('#btlBuy').onclick = () => battleAct(1);
    $('#btlSell').onclick = () => battleAct(-1);
    $('#btlFlat').onclick = () => battleAct(0);
    $('#btlPass').onclick = battleStep;
  }

  drawBattleChart();
  drawBattleEquity();
  renderBattlePanel(meEq, aiEq, lead, D);
}

function drawBattleChart() {
  const B = S.battle;
  const c = getChart('btlChart', { ma: true });
  if (!c) return;
  const from = Math.max(0, B.cursor - 150);
  c.applyNewData(B.seg.slice(from, B.cursor + 1).map(toK));
  c.setPriceVolumePrecision(dec(B.sym), 0);
  c.setStyles({ candle: { tooltip: { showRule: 'follow_cross' } },
    indicator: { tooltip: { showRule: 'follow_cross' } } });
  try { c.removeOverlay(); } catch (e) {}
  const D = dec(B.sym);
  if (B.me.position !== 0 && B.me.openBarIndex >= 0) {
    addLine(c, B.me.avgPrice, cssv('--brand'), `你的成本 ${fx(B.me.avgPrice, D)}`);
  }
  if (B.ai.position !== 0 && B.ai.openBarIndex >= 0) {
    addLine(c, B.ai.avgPrice, cssv('--warn'), `对手成本 ${fx(B.ai.avgPrice, D)}`);
  }
  $('#btlHud').innerHTML = `<span class="h"><b>${fx(B.seg[B.cursor].c, D)}</b></span>`
    + (B.me.position ? `<span class="h ${B.me.position > 0 ? 'long' : 'short'}">你 ${B.me.position > 0 ? '多' : '空'} ${Math.abs(B.me.position)}</span>` : '')
    + (B.ai.position ? `<span class="h">对手 ${B.ai.position > 0 ? '多' : '空'} ${Math.abs(B.ai.position)}</span>` : '');
}

function drawBattleEquity() {
  const B = S.battle;
  const host = $('#btlEquity');
  if (!host) return;
  const w = host.clientWidth || 600, h = host.clientHeight || 130;
  const all = [...B.meCurve, ...B.aiCurve, 0];
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = (hi - lo) || 1;
  const n = B.meCurve.length;
  const X = i => 8 + (i / Math.max(1, n - 1)) * (w - 70);
  const Y = v => h - 10 - ((v - lo) / span) * (h - 20);
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');

  host.innerHTML = `<svg width="${w}" height="${h}" style="position:absolute;inset:0">
    <line x1="8" x2="${w - 62}" y1="${Y(0)}" y2="${Y(0)}" stroke="${cssv('--line2')}" stroke-dasharray="3 3"></line>
    <path d="${path(B.aiCurve)}" fill="none" stroke="${cssv('--warn')}" stroke-width="1.6"></path>
    <path d="${path(B.meCurve)}" fill="none" stroke="${cssv('--brand')}" stroke-width="2"></path>
    <text x="12" y="14" fill="${cssv('--brand')}" font-size="11">你 ${sg(B.meCurve[n - 1] || 0, 0)}</text>
    <text x="12" y="28" fill="${cssv('--warn')}" font-size="11">${B.bot.name} ${sg(B.aiCurve[n - 1] || 0, 0)}</text>
  </svg>`;
}

function renderBattlePanel(meEq, aiEq, lead, D) {
  const B = S.battle;
  const panel = $('#btlPanel');
  if (!B.over) {
    panel.innerHTML = `
      <p style="font-size:13.5px;color:var(--ink2);line-height:1.65">
        对手是<b>${B.bot.name}</b>（${B.bot.tag}）。它在每一根收盘后决策，
        看到的区间和你完全一样，读不到未来。</p>
      <div class="kv" style="margin-top:10px"><span>你的权益</span>
        <span class="num ${meEq >= 0 ? 'up' : 'dn'}">${sg(meEq, 0)}</span></div>
      <div class="kv"><span>对手权益</span>
        <span class="num ${aiEq >= 0 ? 'up' : 'dn'}">${sg(aiEq, 0)}</span></div>
      <div class="kv"><span>你已成交</span><span class="num">${B.me.closedTrades.length} 笔</span></div>
      <div class="kv"><span>对手已成交</span><span class="num">${B.ai.closedTrades.length} 笔</span></div>
      <div class="note info" style="margin-top:12px;font-size:12.5px"><span>◎</span>
        <span>不想动就按空格推进一根。一局 ${B.seg.length - BATTLE_WARMUP - 1} 根，
        走完自动结算。</span></div>`;
    return;
  }

  const won = lead > 0;
  const ctx = makeContext(B.seg, B.ins, { refSize: 20 });
  const meT = B.me.closedTrades.map(t => ({ entry: t.entry, exit: t.exit, dir: t.dir, size: t.size }));
  const aiT = B.ai.closedTrades.map(t => ({ entry: t.entry, exit: t.exit, dir: t.dir, size: t.size }));
  const meR = meT.length ? evalTrades(ctx, meT).totalR : 0;
  const aiR = aiT.length ? evalTrades(ctx, aiT).totalR : 0;

  panel.innerHTML = `
    <span class="pill ${won ? 'good' : lead === 0 ? 'na' : 'bad'}">
      ${won ? '你赢了这一局' : lead === 0 ? '打平' : `${B.bot.name} 赢了这一局`}</span>
    <div class="kv" style="margin-top:11px"><span>你</span>
      <span class="num ${meEq >= 0 ? 'up' : 'dn'}">${sg(meEq, 0)} · ${sg(meR)} R</span></div>
    <div class="kv"><span>${B.bot.name}</span>
      <span class="num ${aiEq >= 0 ? 'up' : 'dn'}">${sg(aiEq, 0)} · ${sg(aiR)} R</span></div>
    <div class="kv"><span>成交笔数</span><span class="num">${meT.length} vs ${aiT.length}</span></div>
    <div class="kv"><span>你的决策次数</span><span class="num">${B.decisions}</span></div>

    <div class="note" style="margin-top:12px;font-size:12.5px"><span>⚠</span><span>
      <b>一局说明不了什么。</b>${B.seg.length - BATTLE_WARMUP} 根、${meT.length} 笔交易的样本量，
      赢和输基本都在噪声范围内。想知道是不是真的比它强，
      要么多打几局，要么把这局记录拿去做<b>随机对照检验</b>。</span></div>

    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" id="btlAgain2">再战一局</button>
      ${meT.length >= 3 ? `<button class="btn btn-g btn-sm"
        onclick="location.hash='#app/eval'">评估这一局</button>` : ''}
    </div>`;
  $('#btlAgain2').onclick = () => startBattle(B.bot.id);
}

function battleLanding() {
  return `
  <div class="drill-head">
    <h2>挑一个对手，同一段行情上分个高下</h2>
    <p>你和对手在<b>同一段 K 线、同一时点、同一套手续费滑点</b>下同时决策，逐根推进。
      对手每一根收盘后才做判断，看到的区间和你完全一样 —— 它读不到未来。</p>
  </div>
  <div class="grid g3" style="margin-top:24px">
    ${ROSTER.map(b => `
      <div class="drillcard">
        <div class="dc-h"><span class="dc-ic">⚔</span>
          <div><h3>${b.name}</h3><span class="dc-dim">${b.tag}</span></div></div>
        <p>${BOT_BLURB[b.id] || ''}</p>
        <button class="btn btn-g" data-battle="${b.id}">向他挑战</button>
      </div>`).join('')}
  </div>
  <div class="note info" style="margin-top:20px;max-width:760px"><span>◎</span>
    <span>这些名字是化名，但打法是<b>真实可执行的策略</b>，
    跑的是和你完全相同的撮合引擎。赢它一局不代表什么，
    连续赢很多局才开始有统计意义 —— 这也正是能力评估要解决的问题。</span></div>`;
}

const BOT_BLURB = {
  'bot-trend': '10 日线上穿 30 日线做多，下穿做空。经典趋势跟随，震荡市会被反复打脸。',
  'bot-fast': '5 日线对 15 日线，换手极快。信号多，手续费也吃得多。',
  'bot-slow': '20 日线对 60 日线，很少动手。拿得住大趋势，转折点吃亏。',
  'bot-break': '突破 20 日高点做多，跌破 20 日低点做空。假突破是它的天敌。',
  'bot-rev': '偏离均线 1.5 个标准差就反向下注。趋势行情里会一路加错方向。',
  'bot-coin': '每根 4% 的概率随机翻方向。它存在的意义是：如果你赢不了它，就该重新想想。',
};

function bindBattleLanding() {
  $$('#v-battle [data-battle]').forEach(b => b.onclick = () => startBattle(b.dataset.battle));
}

/** 对战页的键盘流，和训练台保持同一套手感 */
function battleKey(e) {
  const B = S.battle;
  if (!B || B.over) return false;
  if (e.key === ' ') { e.preventDefault(); battleStep(); return true; }
  if (e.key === 'ArrowUp') { e.preventDefault(); battleAct(1); return true; }
  if (e.key === 'ArrowDown') { e.preventDefault(); battleAct(-1); return true; }
  if (e.key.toLowerCase() === 'x') { e.preventDefault(); battleAct(0); return true; }
  return false;
}
