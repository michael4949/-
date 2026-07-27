/* ══════════════════════════════════════════════════════════════════
   自定义指标公式

   写公式 → 实时校验 → 画到图上 → 直接拿去筛历史。三步在同一页完成。

   两件事在实现上是刻意的：
   1）解析器是自己写的（src/formula.js），不用 eval。用户输入的字符串
      如果交给 eval，一句 fetch 就能把页面上的东西发出去。
   2）算不出来的位置留 NaN 不补 0。补 0 会让均线从零开始爬，
      画出来是一条根本不存在的上升趋势。
   ══════════════════════════════════════════════════════════════════ */

const FORMULA_KEY = 'ag-formulas';

function fmlState() {
  if (!S.fml) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(FORMULA_KEY) || 'null'); } catch (e) {}
    S.fml = {
      sym: 'SPX',
      src: saved?.src || FORMULA_PRESETS[1].src,
      list: Array.isArray(saved?.list) ? saved.list : [],
      err: null,
    };
  }
  return S.fml;
}
function fmlSave() {
  const st = fmlState();
  try { localStorage.setItem(FORMULA_KEY, JSON.stringify({ src: st.src, list: st.list })); } catch (e) {}
}

function renderFormula() {
  const st = fmlState();
  $('#v-formula').innerHTML = `
  <div class="row2" style="grid-template-columns:minmax(0,1fr) 360px">
    <div>
      <div class="panel">
        <div class="ph"><h3>公式编辑器</h3><span class="sub" id="fmlStatus">—</span>
          <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
            <select id="fmlSym" style="width:auto"></select>
            <button class="btn btn-g btn-sm" id="fmlSaveBtn">保存</button>
            <button class="btn btn-p btn-sm" id="fmlRun">计算并画图</button>
          </div></div>
        <div class="pb">
          <textarea id="fmlSrc" class="fmlbox" spellcheck="false"
            placeholder="每行一条，写法：名字: 表达式">${st.src}</textarea>
          <div id="fmlErr"></div>
        </div>
      </div>

      <div class="panel" style="margin-top:16px">
        <div class="ph"><h3 id="fmlChartTitle">指标图</h3>
          <span class="sub" id="fmlChartSub">计算后显示</span></div>
        <div style="padding:8px">
          <div id="fmlMain" style="width:100%;height:260px"></div>
          <div id="fmlSub" style="width:100%;height:170px;margin-top:6px"></div>
        </div>
      </div>

      <div class="panel" style="margin-top:16px" id="fmlScreenPanel">
        <div class="ph"><h3>拿它去筛历史</h3>
          <span class="sub">把最后一行当成条件，非 0 即命中</span>
          <button class="btn btn-s btn-sm" id="fmlScreen" style="margin-left:auto">在全部品种上筛一遍</button></div>
        <div class="pb" id="fmlScreenOut">
          <div class="mut" style="font-size:13px">
            公式最后一行如果是个条件（比如 <code>CROSS(MA(CLOSE,5),MA(CLOSE,20))</code>），
            点右上角就能筛出历史上所有命中的时点。</div>
        </div>
      </div>
    </div>

    <div class="side">
      <div class="panel">
        <div class="ph"><h3>示例</h3><span class="sub">点一下就填进去</span></div>
        <div class="pb"><div class="presets">${FORMULA_PRESETS.map((p, i) =>
          `<button class="preset" data-fp="${i}"><b>${p.name}</b><span>${p.desc}</span></button>`).join('')}</div></div>
      </div>

      <div class="panel" id="fmlMinePanel">
        <div class="ph"><h3>我保存的</h3><span class="sub" id="fmlMineCount">${st.list.length} 条</span></div>
        <div class="pb" id="fmlMine"></div>
      </div>

      <div class="panel">
        <div class="ph"><h3>函数速查</h3></div>
        <div class="pb"><div class="funcs">
          ${Object.entries(FUNCS).map(([k, v]) =>
            `<div class="fn"><code>${k}</code><span>${v.doc.replace(/^[A-Z]+\([^)]*\)\s*/, '')}</span></div>`).join('')}
          <div class="fn" style="border-top:1px dashed var(--line);padding-top:8px;margin-top:4px">
            <code>变量</code><span>OPEN HIGH LOW CLOSE VOL AMOUNT</span></div>
          <div class="fn"><code>运算</code><span>+ − × ÷ ^ &gt; &lt; ≥ ≤ = &lt;&gt; AND OR NOT</span></div>
        </div></div>
      </div>
    </div>
  </div>`;

  const sel = $('#fmlSym');
  sel.innerHTML = Object.entries(DATASETS).map(([k, d]) =>
    `<option value="${k}">${d.display}</option>`).join('');
  sel.value = st.sym;
  sel.onchange = () => { st.sym = sel.value; runFormula(); };

  const ta = $('#fmlSrc');
  ta.oninput = () => { st.src = ta.value; validateFormula(); };
  ta.onkeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runFormula(); }
  };
  $('#fmlRun').onclick = runFormula;
  $('#fmlSaveBtn').onclick = saveFormula;
  $('#fmlScreen').onclick = screenByFormula;
  $$('#v-formula [data-fp]').forEach(b => b.onclick = () => {
    st.src = FORMULA_PRESETS[+b.dataset.fp].src;
    ta.value = st.src;
    runFormula();
  });

  renderMyFormulas();
  validateFormula();
  runFormula();
}

/** 输入时实时校验：只解析不求值，所以再长的公式也不卡 */
function validateFormula() {
  const st = fmlState();
  const box = $('#fmlErr'), status = $('#fmlStatus');
  try {
    const lines = st.src.split(/[\n;]/).map(s => s.trim()).filter(Boolean);
    const defined = new Set();
    for (const line of lines) {
      const m = /^([A-Za-z_一-龥][A-Za-z0-9_一-龥]*)\s*:(?!=)\s*(.+)$/.exec(line);
      compile(m ? m[2] : line, defined);
      if (m) defined.add(m[1].toUpperCase());
    }
    box.innerHTML = '';
    status.textContent = `语法正确 · ${lines.length} 行`;
    status.style.color = 'var(--dn)';
    st.err = null;
    return true;
  } catch (e) {
    st.err = e;
    box.innerHTML = `<div class="fmlerr"><b>✕ ${e.message}</b>
      ${e.at >= 0 ? `<span>第 ${e.at + 1} 个字符附近</span>` : ''}</div>`;
    status.textContent = '有语法错误';
    status.style.color = 'var(--up)';
    return false;
  }
}

function runFormula() {
  const st = fmlState();
  if (!validateFormula()) return;
  const bars = barsOf(st.sym);
  let res;
  try {
    res = evaluateScript(st.src, bars);
  } catch (e) {
    $('#fmlErr').innerHTML = `<div class="fmlerr"><b>✕ ${e.message}</b></div>`;
    return;
  }

  // 主图：K 线 + 与价格同量纲的输出（值域和收盘价接近的，画在主图上）
  const view = bars.slice(-320);
  const off = bars.length - view.length;
  const c = getChart('fmlMain', { ma: false });
  if (!c) return;
  c.applyNewData(view.map(toK));
  c.setPriceVolumePrecision(dec(st.sym), 0);
  c.setStyles({ candle: { tooltip: { showRule: 'follow_cross' } } });
  try { c.removeOverlay(); } catch (e) {}

  const closeMed = median(view.map(b => b.c));
  const onPrice = [], onSub = [];
  res.names.forEach((nm, k) => {
    const s = res.series[k];
    const vals = [...s.slice(off)].filter(Number.isFinite);
    if (!vals.length) return;
    const med = median(vals.map(Math.abs));
    // 量纲接近收盘价的画主图，否则进副图
    (med > closeMed * 0.2 && med < closeMed * 5 ? onPrice : onSub).push({ nm, s, vals });
  });

  const COLORS = [cssv('--brand'), cssv('--teal'), cssv('--warn'), cssv('--gold'), cssv('--up')];
  // KLineCharts 没有直接画任意折线的 API，这里用自定义指标注入
  drawSeriesLines('fmlMain', view, off, onPrice, COLORS);
  drawSubPanel('fmlSub', view, off, onSub, COLORS);

  $('#fmlChartTitle').textContent = `${DATASETS[st.sym].display} · 最近 ${view.length} 根`;
  $('#fmlChartSub').textContent = onSub.length
    ? `主图 ${onPrice.length} 条 · 副图 ${onSub.length} 条`
    : `${onPrice.length} 条曲线`;
  $('#fmlSub').style.display = onSub.length ? '' : 'none';
}

function median(a) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1];
}

/** 用 SVG 覆盖层画折线：比往图表库里塞自定义指标简单，也更好控制 NaN 断点 */
function drawSeriesLines(hostId, view, off, list, colors) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.querySelectorAll('.fmlsvg').forEach(e => e.remove());
  if (!list.length) return;
  const w = host.clientWidth, h = host.clientHeight;
  const all = list.flatMap(x => [...x.s.slice(off)].filter(Number.isFinite))
    .concat(view.map(b => b.l), view.map(b => b.h));
  const lo = Math.min(...all), hi = Math.max(...all);
  host.appendChild(buildSvg(view, off, list, colors, w, h, lo, hi));
}

function drawSubPanel(hostId, view, off, list, colors) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = '';
  if (!list.length) return;
  const w = host.clientWidth, h = host.clientHeight;
  const all = list.flatMap(x => [...x.s.slice(off)].filter(Number.isFinite));
  if (!all.length) return;
  const lo = Math.min(...all, 0), hi = Math.max(...all, 0);
  host.appendChild(buildSvg(view, off, list, colors, w, h, lo, hi, true));
}

function buildSvg(view, off, list, colors, w, h, lo, hi, withZero = false) {
  const span = (hi - lo) || 1;
  const PADX = 8, PADR = 62, PADY = 10;
  const X = i => PADX + (i / Math.max(1, view.length - 1)) * (w - PADX - PADR);
  const Y = v => h - PADY - ((v - lo) / span) * (h - PADY * 2);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'fmlsvg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:3';

  if (withZero && lo < 0 && hi > 0) {
    const z = document.createElementNS(ns, 'line');
    z.setAttribute('x1', PADX); z.setAttribute('x2', w - PADR);
    z.setAttribute('y1', Y(0)); z.setAttribute('y2', Y(0));
    z.setAttribute('stroke', cssv('--line2'));
    z.setAttribute('stroke-dasharray', '3 3');
    svg.appendChild(z);
  }

  list.forEach((item, k) => {
    // NaN 处断开，不要连成一条穿过去的直线
    let d = '', pen = false;
    for (let i = 0; i < view.length; i++) {
      const v = item.s[off + i];
      if (!Number.isFinite(v)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
      pen = true;
    }
    if (!d) return;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', colors[k % colors.length]);
    path.setAttribute('stroke-width', '1.6');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);

    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', PADX + 4);
    label.setAttribute('y', 14 + k * 15);
    label.setAttribute('fill', colors[k % colors.length]);
    label.setAttribute('font-size', '11');
    label.setAttribute('font-family', 'var(--f-mono)');
    const lastVal = [...item.s.slice(off)].reverse().find(Number.isFinite);
    label.textContent = `${item.nm} ${Number.isFinite(lastVal) ? lastVal.toFixed(3) : '—'}`;
    svg.appendChild(label);
  });
  return svg;
}

function saveFormula() {
  const st = fmlState();
  if (!validateFormula()) { toast('公式还有语法错误，先改对再保存'); return; }
  const name = prompt('给这条公式起个名字', `我的指标 ${st.list.length + 1}`);
  if (!name) return;
  st.list.push({ name: name.slice(0, 24), src: st.src });
  fmlSave();
  renderMyFormulas();
  toast(`已保存「${name}」`);
}

function renderMyFormulas() {
  const st = fmlState();
  $('#fmlMineCount').textContent = `${st.list.length} 条`;
  $('#fmlMine').innerHTML = st.list.length
    ? st.list.map((f, i) => `<div class="myfml">
        <button class="ld" data-ld="${i}">${f.name}</button>
        <button class="rm" data-rm="${i}" title="删除">×</button></div>`).join('')
    : '<div class="mut" style="font-size:12.5px">还没有保存过。改好公式后点右上角「保存」。</div>';
  $$('#fmlMine [data-ld]').forEach(b => b.onclick = () => {
    st.src = st.list[+b.dataset.ld].src;
    $('#fmlSrc').value = st.src;
    runFormula();
  });
  $$('#fmlMine [data-rm]').forEach(b => b.onclick = () => {
    st.list.splice(+b.dataset.rm, 1); fmlSave(); renderMyFormulas();
  });
}

/** 把公式最后一行当条件，在全部品种上扫一遍 */
function screenByFormula() {
  const st = fmlState();
  if (!validateFormula()) { toast('公式还有语法错误'); return; }
  const out = $('#fmlScreenOut');
  out.innerHTML = `<div class="empty" style="padding:26px"><span class="spin"></span> 正在逐根扫描…</div>`;

  setTimeout(() => {
    const hits = [];
    let scanned = 0;
    for (const sym of Object.keys(DATASETS)) {
      const bars = barsOf(sym);
      let res;
      try { res = evaluateScript(st.src, bars); } catch (e) {
        out.innerHTML = `<div class="fmlerr"><b>✕ ${e.message}</b></div>`;
        return;
      }
      const cond = res.series[res.series.length - 1];
      for (let i = 20; i < bars.length - 21; i++) {
        scanned++;
        if (!Number.isFinite(cond[i]) || cond[i] === 0) continue;
        const fwd = (bars[i + 20].c - bars[i].c) / bars[i].c;
        hits.push({ sym, display: DATASETS[sym].display, i, t: bars[i].t, close: bars[i].c, val: cond[i], fwd });
      }
    }

    if (!hits.length) {
      out.innerHTML = `<div class="empty" style="padding:30px"><h3>没有命中</h3>
        <p>最后一行 <code>${escapeHtml(st.src.split('\n').pop().trim())}</code>
          在 ${scanned.toLocaleString()} 根里一次都没有成立。</p></div>`;
      return;
    }

    // 命中之后 20 根的分布 —— 这是条件分布，不是「这个指标能赚钱」
    const fwds = hits.map(h => h.fwd).sort((a, b) => a - b);
    const q = p => fwds[Math.min(fwds.length - 1, Math.floor(p * fwds.length))];
    const up = hits.filter(h => h.fwd > 0).length / hits.length;

    out.innerHTML = `
      <div class="grid g4" style="gap:10px;margin-bottom:14px">
        <div class="tile"><div class="l">命中时点</div><div class="v num">${hits.length.toLocaleString()}</div>
          <div class="d">扫描 ${scanned.toLocaleString()} 根</div></div>
        <div class="tile"><div class="l">之后 20 根中位</div>
          <div class="v num ${q(0.5) >= 0 ? 'up' : 'dn'}">${sg(q(0.5) * 100)}%</div><div class="d">条件分布</div></div>
        <div class="tile"><div class="l">上涨占比</div><div class="v num">${(up * 100).toFixed(0)}%</div>
          <div class="d">不是胜率</div></div>
        <div class="tile"><div class="l">四分位区间</div>
          <div class="v num" style="font-size:15px">${sg(q(0.25) * 100)}% ~ ${sg(q(0.75) * 100)}%</div>
          <div class="d">离散程度</div></div>
      </div>
      <div class="scrollx"><table class="dt"><thead><tr>
        <th>日期</th><th>品种</th><th>收盘</th><th>指标值</th><th>后 20 根</th></tr></thead>
        <tbody>${hits.slice(0, 60).map(h => `<tr>
          <td>${ymd(h.t)}</td><td class="txt">${h.display}</td>
          <td>${fx(h.close, dec(h.sym))}</td><td>${h.val.toFixed(3)}</td>
          <td class="${h.fwd >= 0 ? 'up' : 'dn'}">${sg(h.fwd * 100)}%</td></tr>`).join('')}
        </tbody></table></div>
      ${hits.length > 60 ? `<div class="mut" style="font-size:12px;margin-top:8px">
        共 ${hits.length.toLocaleString()} 条，只显示前 60 条。</div>` : ''}
      <div class="note" style="margin-top:12px"><span>⚠</span><span>
        这是<b>条件分布</b>，不是「用这个指标能赚钱」。它没有扣手续费滑点、
        没有考虑你实际拿不拿得住，也没有做多重比较校正。
        想知道按它交易到底行不行，去<a href="#app/replay" style="color:var(--brand);font-weight:600">训练场</a>
        跑一轮，让能力评估用随机对照检验它。</span></div>`;
  }, 30);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
