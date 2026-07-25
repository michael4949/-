/* ══════════════════════════════════════════════════════════════════
   能力评估 · 相似行情 · 智能助手
   三者的计算内核分别是 src/engine.js、src/similar.js、src/query.js，
   与 Node 端跑测试的是同一份代码。
   ══════════════════════════════════════════════════════════════════ */

/* ── 能力评估 ───────────────────────────────────────────────────── */
const LVL = {
  strong: ['good', '证据充分'], moderate: ['good', '达到显著'], weak: ['mid', '方向向好'],
  none: ['na', '与随机无异'], negative: ['bad', '未跑赢随机'],
  insufficient: ['mid', '样本不足'], unknown: ['na', '无法判断'],
};

function runReport() {
  if (!S.lastTrades?.length) return;
  S.reportPending = true;
  $('#evalEmpty').classList.add('hide');
  $('#evalBody').classList.remove('hide');
  $('#evalBody').innerHTML = `<div class="empty"><h3><span class="spin"></span> 正在计算</h3>
    <p>${S.lastTrades.length} 笔交易 × 5 个零模型 × 2000 次蒙特卡洛</p></div>`;
  setTimeout(() => {
    const t0 = performance.now();
    const rep = analyzeSession({
      bars: S.lastBars, trades: S.lastTrades, instrument: S.lastIns,
      seed: (Math.random() * 1e9) | 0, iterations: 2000,
    });
    S.report = rep;
    S.reportPending = false;
    $('#evalEmpty').classList.add('hide');
    $('#evalBody').classList.remove('hide');
    renderEval(rep, Math.round(performance.now() - t0));
  }, 50);
}

function renderEval(r, ms) {
  const o = r.observed, h = r.headline;
  const [cls, txt] = LVL[r.verdict.level] || LVL.unknown;

  let dist = '';
  if (h?.available) {
    const lo = Math.min(h.nullP05R, h.observedR), hi = Math.max(h.nullP95R, h.observedR);
    const span = (hi - lo) || 1;
    const P = v => ((v - lo) / span * 100).toFixed(1);
    dist = `<div class="dist">
      <div class="distbar">
        <div class="band" style="left:${P(h.nullP05R)}%;width:${(P(h.nullP95R) - P(h.nullP05R)).toFixed(1)}%"></div>
        <div class="med" style="left:${P(h.nullMedianR)}%"></div>
        <div class="you" style="left:${P(h.observedR)}%"></div></div>
      <div class="distlbl"><span>对照组 5% 分位 ${sg(h.nullP05R)}R</span>
        <span>中位 ${sg(h.nullMedianR)}R</span><span>95% 分位 ${sg(h.nullP95R)}R</span></div>
      <div style="margin-top:9px;font-size:13.5px;color:var(--mut)">
        <span style="display:inline-block;width:10px;height:3px;background:var(--brand);vertical-align:middle"></span>
        你 = <b class="mono" style="color:var(--ink)">${sg(h.observedR)} R</b>，
        位于第 <b class="mono" style="color:var(--brand)">${(h.percentile * 100).toFixed(0)}</b> 百分位 ·
        p = <b class="mono" style="color:var(--ink)">${h.pValue.toFixed(4)}</b>
        <span class="mut">± ${h.pValueStdErr.toFixed(4)}</span></div></div>`;
  }

  const dims = [...r.attribution].sort((a, b) => (a.available ? a.edgeR : 1e9) - (b.available ? b.edgeR : 1e9))
    .map(a => {
      if (!a.available) return `<tr><td><b>${a.label}</b></td>
        <td colspan="4" class="txt mut" style="text-align:left">${md(a.reason)}</td>
        <td class="txt"><span class="pill na">无从评估</span></td></tr>`;
      const pa = a.pValueAdjusted ?? a.pValue;
      const [c, t] = pa <= 0.05 ? ['good', '明显优于随机'] : pa <= 0.2 ? ['mid', '略优，未达显著']
        : a.percentile < 0.35 ? ['bad', '劣于随机 ← 优先训练'] : ['na', '与随机无异'];
      return `<tr><td><b>${a.label}</b><div class="mut" style="font-size:11.5px;font-weight:400">${a.question}</div></td>
        <td class="${a.edgeR >= 0 ? 'up' : 'dn'}">${sg(a.edgeR)} R</td><td>${sg(a.effectZ)}</td>
        <td class="mut">${a.pValue.toFixed(3)}</td><td><b>${pa.toFixed(3)}</b></td>
        <td class="txt"><span class="pill ${c}">${t}</span></td></tr>`;
    }).join('');

  const bench = [...r.benchmarks, { label: '你', totalR: o.totalR, count: o.trades, me: true }];
  const bmax = Math.max(...bench.map(b => Math.abs(b.totalR)), 1);
  const benchHtml = bench.map(b => {
    const w = Math.abs(b.totalR) / bmax * 50;
    const col = b.me ? 'var(--brand)' : b.totalR >= 0 ? 'var(--up)' : 'var(--dn)';
    return `<div class="brow"><span style="${b.me ? 'font-weight:700;color:var(--brand)' : ''}">${b.label}</span>
      <div class="btrack"><i style="left:${b.totalR >= 0 ? 50 : 50 - w}%;width:${w}%;background:${col}"></i>
        <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line2)"></div></div>
      <span class="mono" style="text-align:right;color:${col}">${sg(b.totalR)} R</span></div>`;
  }).join('');

  $('#evalBody').innerHTML = `
  <div class="verdict">
    <span class="pill ${cls}" style="margin-bottom:11px;display:inline-block">${txt}</span>
    <h2>这一轮，有多少能用运气解释？</h2>
    <p>${md(r.verdict.text)}</p>
    <p style="margin-top:7px;font-size:13.5px;color:var(--mut)">
      对照组：<b style="color:var(--ink2)">${h?.label || '—'}</b> —— ${h?.question || ''}</p>
    ${dist}</div>

  <div class="grid g3">
    ${[['净收益', sg(o.totalR) + ' R', `${sg(o.netCurrency, 0)} 元 · 已扣 ${fx(o.costCurrency, 0)} 成本`, o.totalR >= 0],
       ['胜率 / 盈亏比', pc1(o.winRate) + ' / ' + (isFinite(o.profitFactor) ? o.profitFactor.toFixed(2) : '—'), `${o.trades} 笔交易`, null],
       ['夏普为正的概率', pc1(o.probabilisticSharpe), `每笔夏普 ${o.perTradeSharpe.toFixed(3)}`, o.probabilisticSharpe >= 0.5]]
      .map(([l, v, d, good]) => `<div class="panel"><div class="pb">
        <div class="mut" style="font-size:12px">${l}</div>
        <div class="num ${good === null ? '' : good ? 'up' : 'dn'}" style="font-size:25px;font-weight:800;margin:4px 0">${v}</div>
        <div class="mut" style="font-size:12px">${d}</div></div></div>`).join('')}</div>

  <div class="panel"><div class="ph"><h3>四个决策维度，哪一块在拖后腿</h3>
    <span class="sub">判读以 Holm 校正后 p 值为准</span></div>
    <div class="pb scrollx" style="padding:0 6px">
      <table class="dt"><thead><tr><th>维度</th><th>边际贡献</th><th>效应量 Z</th><th>原始 p</th><th>校正 p</th><th style="text-align:left">判读</th></tr></thead>
      <tbody>${dims}</tbody></table></div>
    <div class="pb" style="padding-top:0"><div class="note"><span>⚠</span>
      <span>四项<b>不可相加</b>。各维度的随机化互不正交，只能读<b>相对排序</b>，
      不存在「总收益 = 方向 + 时机 + 仓位」这样的分解。</span></div></div></div>

  <div class="grid g2">
    <div class="panel"><div class="ph"><h3>参照标尺</h3><span class="sub">同段行情</span></div>
      <div class="pb"><div class="bench">${benchHtml}</div></div></div>
    <div class="panel"><div class="ph"><h3>还需要多少样本才能下结论</h3></div><div class="pb">
      <div class="kv"><span>当前笔数</span><span class="num">${r.power.currentTrades}</span></div>
      <div class="kv"><span>每笔效应量</span><span class="num">${r.power.effectSizePerTrade.toFixed(3)}</span></div>
      <div class="kv"><span>95% 置信 / 80% 检验力所需</span><span class="num">${isFinite(r.power.requiredTrades) ? r.power.requiredTrades : '∞'}</span></div>
      <div class="kv"><span>还差</span><span class="num ${r.power.shortfall > 0 ? 'up' : 'dn'}">${isFinite(r.power.shortfall) ? r.power.shortfall : '∞'}</span></div>
      <div style="margin-top:11px;font-size:13px;color:var(--mut)">${isFinite(r.power.requiredTrades)
        ? '这个数字由当前每笔收益的信噪比反推——信噪比越低，需要的样本越多。'
        : '当前效应量约等于零，无论积累多少样本都无法证明存在优势。'}</div></div></div></div>

  <div class="grid g2">
    <div class="panel"><div class="ph"><h3>行为特征</h3><span class="sub">确定性计算 · 无模型推测</span></div>
      <div class="pb"><div class="blist">${behaviorItems(r.behavior)}</div></div></div>
    <div class="panel"><div class="ph"><h3>必须知道的局限</h3><span class="sub">随报告强制下发</span></div>
      <div class="pb"><ol class="cav">${r.caveats.map(c => `<li>${md(c)}</li>`).join('')}</ol></div></div></div>

  <div class="panel"><div class="ph"><h3>数据来源与复现</h3>
    <span class="sub">${S.lastLabel} · 引擎 v${r.meta.engineVersion} · seed ${r.meta.seed} · ${ms} ms</span>
    <button class="btn btn-g btn-sm" id="askAboutReport" style="margin-left:auto">让助手解读这份报告</button></div>
    <div class="pb"><div class="kv"><span>随机种子</span><span class="num">${r.meta.seed}</span></div>
      <div class="kv"><span>蒙特卡洛次数</span><span class="num">${r.meta.iterations} × 5 个零模型</span></div>
      <div class="kv"><span>结果可复现</span><span>同一份记录 + 同一 seed，任何机器上逐字节一致</span></div></div></div>`;

  $('#askAboutReport').onclick = () => {
    openChat();
    setTimeout(() => handleUserMessage('解读一下我这份能力评估报告'), 160);
  };
}

/* ── 相似行情 ───────────────────────────────────────────────────── */
function ensureSimIndex(win) {
  if (S.simIndex && S.simIndex.window === win) return S.simIndex;
  S.simIndex = buildIndex(datasetsAll(), { window: win, stride: 3, dim: 24, horizon: 20 });
  return S.simIndex;
}

function simRandomQuery() {
  const sym = $('#simDs').value;
  const bars = barsOf(sym);
  const win = parseInt($('#simWin').value);
  const end = win + 20 + Math.floor(Math.random() * (bars.length - win - 60));
  S.simQuery = { sym, end, win };
  drawSimQuery();
}

function drawSimQuery() {
  const q = S.simQuery; if (!q) return;
  const bars = barsOf(q.sym);
  const c = getChart('simChart', { ma: true });
  c.applyNewData(bars.slice(q.end - q.win + 1, q.end + 1).map(toK));
  c.setPriceVolumePrecision(dec(q.sym), 0);
  $('#simQLabel').textContent = `${DATASETS[q.sym].display} · ${ymd(bars[q.end].t)} 往前 ${q.win} 根`;
}

function runSimilar() {
  const q = S.simQuery; if (!q) { simRandomQuery(); }
  const win = parseInt($('#simWin').value);
  const k = parseInt($('#simK').value);
  $('#simOut').innerHTML = `<div class="empty"><h3><span class="spin"></span> 正在检索</h3>
    <p>把形态编码成向量，在全部历史片段中比对</p></div>`;
  setTimeout(() => {
    const t0 = performance.now();
    const idx = ensureSimIndex(win);
    const ds = datasetsAll();
    const r = findSimilar(ds, S.simQuery.sym, S.simQuery.end, idx, { k });
    const ms = Math.round(performance.now() - t0);
    if (!r.ok) { $('#simOut').innerHTML = `<div class="empty"><h3>无法检索</h3><p>${r.reason}</p></div>`; return; }
    renderSimilar(r, idx, ms);
  }, 40);
}

function renderSimilar(r, idx, ms) {
  const s = r.stats;
  const ds = datasetsAll();
  const bins = 11;
  const lo = Math.min(s.p05, -0.01), hi = Math.max(s.p95, 0.01);
  const hist = new Array(bins).fill(0);
  for (const v of s.returns) {
    const b = Math.max(0, Math.min(bins - 1, Math.floor((v - lo) / ((hi - lo) || 1) * bins)));
    hist[b]++;
  }
  const hmax = Math.max(1, ...hist);

  $('#simOut').innerHTML = `
  <div class="grid g2">
    <div class="panel"><div class="ph"><h3>这些形态之后发生了什么</h3>
      <span class="sub">${s.n} 个样本 · 后 ${s.horizon} 根</span></div>
      <div class="pb">
        <div class="histo">${hist.map((n, i) => {
          const mid = lo + (i + 0.5) * (hi - lo) / bins;
          return `<i class="${mid >= 0 ? 'pos' : 'neg'}" style="height:${(n / hmax * 100).toFixed(1)}%"
            title="${pc1(mid)} 附近：${n} 个"></i>`;
        }).join('')}</div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--mut)"
          class="mono"><span>${pc1(lo)}</span><span>0</span><span>${pc1(hi)}</span></div>
        <div style="margin-top:14px">
          <div class="kv"><span>上涨占比</span><span>${pc1(s.upRate)}</span></div>
          <div class="kv"><span>中位涨跌</span><span class="${s.median >= 0 ? 'up' : 'dn'}">${sg(s.median * 100)}%</span></div>
          <div class="kv"><span>25% ~ 75% 分位</span><span>${sg(s.p25 * 100)}% ~ ${sg(s.p75 * 100)}%</span></div>
          <div class="kv"><span>5% 分位（左尾）</span><span class="dn">${sg(s.p05 * 100)}%</span></div>
          <div class="kv"><span>95% 分位（右尾）</span><span class="up">${sg(s.p95 * 100)}%</span></div>
        </div>
      </div></div>
    <div class="panel"><div class="ph"><h3>怎么读这张图</h3></div><div class="pb">
      <div class="note info"><span>◎</span><span>这里给出的是<b>条件分布</b>，不是方向判断。
      「历史上长得像的片段之后涨的占 ${pc1(s.upRate)}」和「接下来会涨」是两回事——
      前者是对历史的统计，后者是对未来的预测。</span></div>
      <div style="margin-top:12px" class="kv"><span>索引规模</span><span class="num">${idx.size} 个片段</span></div>
      <div class="kv"><span>形态窗口</span><span class="num">${idx.window} 根</span></div>
      <div class="kv"><span>向量维度</span><span class="num">${idx.dim}</span></div>
      <div class="kv"><span>检索耗时</span><span class="num">${ms} ms</span></div>
      <div style="margin-top:12px;font-size:13px;color:var(--mut)">
        编码方式：窗口内累积对数收益 → z-score 标准化 → 分段聚合降维。
        标准化让不同价位、不同波动率的品种落在同一空间，检索到的是<b>形态</b>而不是价位。
        查询窗口自身及其邻居已被排除。</div>
    </div></div>
  </div>

  <div class="panel" style="margin-top:16px"><div class="ph"><h3>最相似的历史片段</h3>
    <span class="sub">按形态距离升序</span></div>
    <div class="pb"><div class="simgrid">${r.matches.map((m, i) => `
      <div class="simcard" data-sym="${m.symbol}" data-end="${m.end}">
        <div class="sh"><b>${m.display}</b><span class="mut">${ymd(m.t)}</span>
          <span class="match">${(m.similarity * 100).toFixed(0)}%</span></div>
        <div class="sc" id="simc${i}"></div>
        <div class="sf ${fwdOf(ds, m, s.horizon) >= 0 ? 'up' : 'dn'}">后 ${s.horizon} 根 ${sg(fwdOf(ds, m, s.horizon) * 100)}%</div>
      </div>`).join('')}</div></div></div>`;

  requestAnimationFrame(() => {
    r.matches.forEach((m, i) => {
      const el = $('#simc' + i); if (!el) return;
      const bars = ds[m.symbol].bars;
      const c = getChart('simc' + i, { ma: false });
      c.applyNewData(bars.slice(m.end - idx.window + 1, m.end + 1).map(toK));
      c.setStyles({ candle: { priceMark: { last: { show: false }, high: { show: false }, low: { show: false } },
        tooltip: { showRule: 'none' } }, xAxis: { show: false }, yAxis: { show: false } });
    });
    $$('.simcard').forEach(el => el.onclick = () => {
      S.simQuery = { sym: el.dataset.sym, end: +el.dataset.end, win: idx.window };
      drawSimQuery(); runSimilar();
      toast('已切换到该片段');
    });
  });
}
function fwdOf(ds, m, horizon) {
  const bars = ds[m.symbol].bars;
  const a = bars[m.end], b = bars[m.end + horizon];
  return a && b ? (b.c - a.c) / a.c : 0;
}
