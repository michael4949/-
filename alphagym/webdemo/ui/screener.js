/* ══════════════════════════════════════════════════════════════════
   条件筛选

   一句话说清它和「智能问数」的关系：**同一个引擎，两个入口**。
   问数是自然语言 → AST → 执行；这里是表单 → 同一个 AST → 同一个执行器。
   所以两边的口径永远一致，不会出现「聊天说 37 条、筛选说 41 条」这种事。

   当前版本只内置四个品种的真实历史，所以筛的是**时点**而不是标的 ——
   「历史上哪些天满足这些条件」。界面上如实写明，不含糊过去。
   ══════════════════════════════════════════════════════════════════ */

/** 表单能选的字段：从引擎的 FIELDS 里挑出适合做条件的那些 */
const SCREEN_FIELDS = ['chg', 'amp', 'gap', 'volRatio', 'drawdown', 'rv20', 'streak', 'maDist20'];

const SCREEN_PRESETS = [
  { name: '暴跌日', desc: '单日跌超 4%，且放量',
    rules: [{ field: 'chg', op: '<=', value: -0.04 }, { field: 'volRatio', op: '>=', value: 1.5 }] },
  { name: '深度回撤', desc: '距历史高点回撤超过 30%',
    rules: [{ field: 'drawdown', op: '<=', value: -0.30 }] },
  { name: '连涨透支', desc: '连涨 5 天以上，且偏离 20 日线 5% 以上',
    rules: [{ field: 'streak', op: '>=', value: 5 }, { field: 'maDist20', op: '>=', value: 0.05 }] },
  { name: '恐慌波动', desc: '20 日年化波动率超过 40%',
    rules: [{ field: 'rv20', op: '>=', value: 0.40 }] },
  { name: '跳空缺口', desc: '跳空幅度绝对值超过 2%',
    rules: [{ field: 'gap', op: '>=', value: 0.02 }] },
];

function screenState() {
  if (!S.screen) {
    S.screen = {
      syms: Object.keys(DATASETS),
      rules: [{ field: 'chg', op: '<=', value: -0.04 }],
      from: '', to: '', hits: null, busy: false,
    };
  }
  return S.screen;
}

function renderScreener() {
  const st = screenState();
  const host = $('#v-screen');
  host.innerHTML = `
  <div class="row2" style="grid-template-columns:340px minmax(0,1fr)">
    <div class="side">
      <div class="panel">
        <div class="ph"><h3>筛选条件</h3><span class="sub">同一个查询引擎</span></div>
        <div class="pb">
          <div class="field"><label>品种（可多选）</label>
            <div class="symchips" id="scSyms">${Object.entries(DATASETS).map(([k, d]) =>
              `<button class="chip2 ${st.syms.includes(k) ? 'on' : ''}" data-s="${k}">${d.display}</button>`).join('')}</div>
          </div>

          <div style="margin-top:13px"><label style="font-size:12px;color:var(--mut)">条件</label>
            <div id="scRules"></div>
            <button class="btn btn-g btn-sm" id="scAdd" style="width:100%;margin-top:8px">＋ 加一条</button>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px">
            <div class="field"><label>起始年份</label>
              <input type="number" id="scFrom" placeholder="不限" value="${st.from}"></div>
            <div class="field"><label>结束年份</label>
              <input type="number" id="scTo" placeholder="不限" value="${st.to}"></div>
          </div>

          <button class="btn btn-p" style="width:100%;margin-top:14px" id="scGo">开始筛选</button>

          <div style="margin-top:14px;padding-top:13px;border-top:1px dashed var(--line)">
            <label style="font-size:12px;color:var(--mut)">常用条件</label>
            <div class="presets">${SCREEN_PRESETS.map((p, i) =>
              `<button class="preset" data-p="${i}"><b>${p.name}</b><span>${p.desc}</span></button>`).join('')}</div>
          </div>
        </div>
      </div>

      <div class="panel coach">
        <div class="ph"><span class="aidot">✦</span><h3>不想填表？</h3></div>
        <div class="pb">
          <p style="font-size:13.5px;color:var(--ink2);line-height:1.65">
            直接用一句话说，比如「2008 年跌幅超过 5% 且放量的日子」。
            助手会把它翻译成和左边完全一样的条件，再交给<b>同一个执行器</b>取数。</p>
          <button class="btn btn-s" style="width:100%;margin-top:11px" id="scAsk">用一句话筛 →</button>
        </div>
      </div>
    </div>

    <div>
      <div class="panel">
        <div class="ph"><h3>筛选结果</h3><span class="sub" id="scSub">还没有开始</span>
          <button class="btn btn-g btn-sm" id="scExport" style="margin-left:auto" disabled>导出 CSV</button></div>
        <div class="pb" id="scOut">
          <div class="empty" style="padding:50px 20px">
            <h3>选好条件，点「开始筛选」</h3>
            <p>会在四个品种共 ${Object.values(DATASETS).reduce((a, d) => a + d.count, 0).toLocaleString()} 根真实 K 线上逐根扫描。<br>
              筛出来的是<b>历史上的时点</b>：哪些天出现过你描述的这种情况。</p>
          </div>
        </div>
      </div>
      <div class="panel" id="scChartPanel" style="margin-top:16px;display:none">
        <div class="ph"><h3 id="scChartTitle">—</h3><span class="sub" id="scChartSub"></span></div>
        <div style="padding:8px"><div id="scChart" style="width:100%;height:300px"></div></div>
      </div>
    </div>
  </div>`;

  renderRules();
  $$('#scSyms .chip2').forEach(b => b.onclick = () => {
    const k = b.dataset.s;
    const i = st.syms.indexOf(k);
    if (i >= 0) { if (st.syms.length > 1) st.syms.splice(i, 1); }
    else st.syms.push(k);
    b.classList.toggle('on', st.syms.includes(k));
  });
  $('#scAdd').onclick = () => { st.rules.push({ field: 'volRatio', op: '>=', value: 1.5 }); renderRules(); };
  $('#scGo').onclick = runScreen;
  $('#scAsk').onclick = () => { openChat(); };
  $$('#v-screen .preset').forEach(b => b.onclick = () => {
    const p = SCREEN_PRESETS[+b.dataset.p];
    st.rules = p.rules.map(r => ({ ...r }));
    renderRules();
    runScreen();
  });
}

function renderRules() {
  const st = screenState();
  const box = $('#scRules');
  box.innerHTML = st.rules.map((r, i) => {
    const f = FIELDS[r.field];
    const shown = f.pct ? (r.value * 100) : r.value;
    return `<div class="rule">
      <select data-i="${i}" data-k="field">${SCREEN_FIELDS.map(k =>
        `<option value="${k}" ${k === r.field ? 'selected' : ''}>${FIELDS[k].label}</option>`).join('')}</select>
      <select data-i="${i}" data-k="op">
        <option value=">=" ${r.op === '>=' ? 'selected' : ''}>≥</option>
        <option value="<=" ${r.op === '<=' ? 'selected' : ''}>≤</option></select>
      <input type="number" step="any" data-i="${i}" data-k="value" value="${(+shown).toFixed(f.pct ? 2 : 2)}">
      <span class="unit">${f.unit || ''}</span>
      <button class="rmrule" data-i="${i}" ${st.rules.length < 2 ? 'disabled' : ''}>×</button>
    </div>`;
  }).join('');

  box.querySelectorAll('select,input').forEach(el => {
    el.onchange = () => {
      const i = +el.dataset.i, k = el.dataset.k;
      if (k === 'value') {
        const f = FIELDS[st.rules[i].field];
        st.rules[i].value = f.pct ? (parseFloat(el.value) || 0) / 100 : (parseFloat(el.value) || 0);
      } else {
        st.rules[i][k] = el.value;
        if (k === 'field') renderRules();          // 单位可能变了，重画
      }
    };
  });
  box.querySelectorAll('.rmrule').forEach(b => b.onclick = () => {
    st.rules.splice(+b.dataset.i, 1); renderRules();
  });
}

function runScreen() {
  const st = screenState();
  if (st.busy) return;
  st.busy = true;
  st.from = $('#scFrom').value;
  st.to = $('#scTo').value;
  $('#scOut').innerHTML = `<div class="empty" style="padding:40px"><span class="spin"></span> 正在逐根扫描…</div>`;

  setTimeout(() => {
    try {
      // 组一个和 parse() 输出同构的 AST，交给同一个 execute()
      const time = (st.from || st.to) ? {
        from: st.from ? Date.UTC(+st.from, 0, 1) : -Infinity,
        to: st.to ? Date.UTC(+st.to + 1, 0, 1) : Infinity,
        label: `${st.from || '不限'}–${st.to || '不限'}`,
      } : null;
      // 字段名必须和 parse() 的输出严格一致（from / where / orderBy / select），
      // 否则 execute() 会静默筛出 0 条 —— 它只按 ast.from 遍历。
      const ast = {
        ok: true,
        from: st.syms,
        where: st.rules.map(r => ({ field: r.field, op: r.op, value: r.value })),
        time,
        orderBy: null,
        select: 'bars',
        limit: 400,
      };
      const ds = {};
      for (const k of st.syms) ds[k] = { display: DATASETS[k].display, bars: barsOf(k) };
      const res = execute(ast, ds);
      // execute 返回的行把字段装在 values 里，摊平一层方便渲染
      st.hits = res.rows.map(r => ({
        ...r, ...r.values, date: ymd(r.t),
      }));

      $('#scSub').textContent = `${res.total.toLocaleString()} 个时点 / 扫描 ${res.scanned.toLocaleString()} 根`;
      $('#scExport').disabled = !st.hits.length;
      $('#scExport').onclick = () => exportScreen(st.hits);

      if (!st.hits.length) {
        $('#scOut').innerHTML = `<div class="empty" style="padding:44px 20px">
          <h3>一个都没筛到</h3><p>条件太严了。把阈值放宽一点，或者去掉一条试试。</p></div>`;
        return;
      }

      const cols = [...new Set(st.rules.map(r => r.field))];
      $('#scOut').innerHTML = `
        <div class="note info" style="margin-bottom:12px;font-size:12.5px"><span>◎</span>
          <span>${explain(ast).replace(/\n/g, '<br>')}</span></div>
        <div class="scrollx"><table class="dt"><thead><tr>
          <th>日期</th><th>品种</th><th>收盘</th>
          ${cols.map(c => `<th>${FIELDS[c].label}</th>`).join('')}
          <th>后 20 根</th><th></th></tr></thead>
          <tbody>${st.hits.slice(0, 120).map((r, i) => `
            <tr><td>${r.date}</td><td class="txt">${r.display}</td><td>${fx(r.close, dec(r.symbol))}</td>
              ${cols.map(c => `<td class="${r[c] >= 0 ? 'up' : 'dn'}">${fmtField(c, r[c])}</td>`).join('')}
              <td class="${r.fwd20 >= 0 ? 'up' : 'dn'}">${r.fwd20 == null ? '—' : sg(r.fwd20 * 100) + '%'}</td>
              <td><button class="btn btn-g btn-sm scview" data-i="${i}">看图</button></td></tr>`).join('')}
          </tbody></table></div>
        ${st.hits.length > 120 ? `<div class="mut" style="font-size:12px;margin-top:9px">
          共 ${st.hits.length} 条，表格只显示前 120 条；导出 CSV 可拿到全部。</div>` : ''}`;

      $$('#v-screen .scview').forEach(b => b.onclick = () => showScreenHit(st.hits[+b.dataset.i]));
      showScreenHit(st.hits[0]);
    } catch (e) {
      $('#scOut').innerHTML = `<div class="empty" style="padding:40px"><h3>筛选出错</h3>
        <p>${String(e && e.message || e)}</p></div>`;
    } finally {
      st.busy = false;
    }
  }, 30);
}

function fmtField(key, v) {
  if (v == null) return '—';
  const f = FIELDS[key];
  return f.pct ? sg(v * 100) + '%' : (f.unit === '天' ? String(v) : (+v).toFixed(2));
}

function showScreenHit(row) {
  if (!row) return;
  $('#scChartPanel').style.display = '';
  $('#scChartTitle').textContent = `${row.display} · ${row.date}`;
  $('#scChartSub').textContent = '命中日以竖线标出，右侧是它之后真实走出来的行情';
  const bars = barsOf(row.symbol);
  const i = row.index;
  if (!(i >= 0) || !bars[i]) return;
  const c = getChart('scChart', { ma: true });
  if (!c) return;
  const from = Math.max(0, i - 80), to = Math.min(bars.length - 1, i + 40);
  c.applyNewData(bars.slice(from, to + 1).map(toK));
  c.setPriceVolumePrecision(dec(row.symbol), 0);
  c.setStyles({ candle: { tooltip: { showRule: 'follow_cross' } }, indicator: { tooltip: { showRule: 'follow_cross' } } });
  try { c.removeOverlay(); } catch (e) {}
  try {
    c.createOverlay({
      name: 'verticalStraightLine', lock: true,
      points: [{ timestamp: bars[i].t, value: bars[i].c }],
      styles: { line: { color: cssv('--warn'), style: 'dashed', size: 1.5 } },
    });
  } catch (e) {}
}

function exportScreen(rows) {
  const head = ['日期', '品种', '收盘', ...SCREEN_FIELDS.map(k => FIELDS[k].label), '后20根涨跌幅'];
  const lines = [head.join(',')];
  for (const r of rows) {
    lines.push([r.date, r.display, r.close,
      ...SCREEN_FIELDS.map(k => (r[k] == null ? '' : (FIELDS[k].pct ? (r[k] * 100).toFixed(3) : (+r[k]).toFixed(3)))),
      r.fwd20 == null ? '' : (r.fwd20 * 100).toFixed(3),
    ].join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `alphagym-screen-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`已导出 ${rows.length} 条命中记录`);
}
