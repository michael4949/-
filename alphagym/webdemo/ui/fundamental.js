/* ══════════════════════════════════════════════════════════════════
   财务选股 · 财报时光机

   两个功能共用一份数据、共用一个入口，因为它们其实是同一件事的两面：
     · 财务选股：**在某个时点**，按当时看得见的报表筛股票
     · 财报时光机：回到某个时点，看当时看得见的是什么

   共同的地基只有一条：**披露日**。
   2023 年年报要到 2024 年 4 月底才公布，拿它去解释 2024 年 1 月的股价
   就是未来函数 —— 不报错、不崩溃，只会让历史表现好得不真实。
   所有取数都走 src/fundamentals.js 的 visibleAt()，没有第二条路径。
   ══════════════════════════════════════════════════════════════════ */

const FUND_UNITS = { revenue: '万元', netProfit: '万元', equity: '万元', assets: '万元' };

function fundState() {
  if (!S.fund) {
    const items = FUNDAMENTALS?.items || {};
    S.fund = {
      tab: 'screen',
      asOf: Date.UTC(2022, 0, 4),
      rules: [{ field: 'roe', op: '>=', value: 0.10 }, { field: 'debtRatio', op: '<=', value: 0.68 }],
      code: Object.keys(items)[0] || null,
      revealed: false,
      result: null,
    };
  }
  return S.fund;
}

const fundItems = () => FUNDAMENTALS?.items || {};
const fundBars = (code) => (DATASETS[code] ? barsOf(code) : null);
const fundPrice = (code, ts) => { const b = fundBars(code); return b ? priceAt(b, ts) : null; };

/** 数据区间：时点滑块的上下界 */
function fundRange() {
  const any = Object.keys(fundItems())[0];
  const b = any ? fundBars(any) : null;
  if (!b || !b.length) return [Date.UTC(2019, 0, 1), Date.UTC(2023, 0, 1)];
  return [b[0].t, b[b.length - 1].t];
}

function renderFundamental() {
  const st = fundState();
  const host = $('#v-fund');
  if (!FUNDAMENTALS) {
    host.innerHTML = `<div class="empty" style="padding:60px 20px"><h3>没有财务数据</h3>
      <p>运行 <code>python3 tools/gen_demo_data.py</code> 生成演示数据后重新构建。</p></div>`;
    return;
  }
  const [lo, hi] = fundRange();

  host.innerHTML = `
  ${demoBanner()}
  <div class="seg fundtabs" style="margin-bottom:16px">
    <button data-ft="screen" class="${st.tab === 'screen' ? 'on' : ''}">财务选股</button>
    <button data-ft="time" class="${st.tab === 'time' ? 'on' : ''}">财报时光机</button>
  </div>

  <div class="asofbar">
    <span class="lbl">选股时点</span>
    <input type="range" id="fdAsOf" min="${lo}" max="${hi}" step="86400000" value="${st.asOf}">
    <b class="num" id="fdAsOfTxt">${ymd(st.asOf)}</b>
    <span class="mut">只使用这一天<b>之前已经公布</b>的报表</span>
  </div>

  <div id="fdBody"></div>`;

  $$('#v-fund [data-ft]').forEach(b => b.onclick = () => {
    st.tab = b.dataset.ft; st.revealed = false; renderFundamental();
  });
  const slider = $('#fdAsOf');
  slider.oninput = () => {
    st.asOf = +slider.value;
    $('#fdAsOfTxt').textContent = ymd(st.asOf);
  };
  slider.onchange = () => { st.revealed = false; renderFundBody(); };

  renderFundBody();
}

/** 演示数据横幅：这一条不许被去掉 */
function demoBanner() {
  const m = typeof CN_META !== 'undefined' && CN_META;
  return `<div class="demobar">
    <span class="tag">演示数据</span>
    <span>A 股与国内期货行情、以及全部财务报表，均由 <code>tools/gen_demo_data.py</code>
      合成，<b>不是真实市场数据</b>${m ? `（区间 ${m.from} → ${m.to}）` : ''}。
      公司名称、财务数字均为虚构。接入真实数据源后按同一 schema 替换即可，功能一行不用改。</span>
  </div>`;
}

function renderFundBody() {
  const st = fundState();
  if (st.tab === 'screen') renderFundScreen(); else renderTimeMachine();
}

/* ══════════════ 财务选股 ══════════════ */

function renderFundScreen() {
  const st = fundState();
  $('#fdBody').innerHTML = `
  <div class="row2" style="grid-template-columns:330px minmax(0,1fr)">
    <div class="side">
      <div class="panel">
        <div class="ph"><h3>选股条件</h3><span class="sub">按时点可见报表</span></div>
        <div class="pb">
          <div id="fdRules"></div>
          <button class="btn btn-g btn-sm" id="fdAdd" style="width:100%;margin-top:8px">＋ 加一条</button>
          <button class="btn btn-p" style="width:100%;margin-top:12px" id="fdGo">开始选股</button>
          <div style="margin-top:14px;padding-top:13px;border-top:1px dashed var(--line)">
            <label style="font-size:12px;color:var(--mut)">常用方案</label>
            <div class="presets">${FUND_PRESETS.map((p, i) =>
              `<button class="preset" data-fp2="${i}"><b>${p.name}</b><span>${p.desc}</span></button>`).join('')}</div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <div class="panel">
        <div class="ph"><h3>选股结果</h3><span class="sub" id="fdSub">还没有开始</span></div>
        <div class="pb" id="fdOut">
          <div class="empty" style="padding:44px 20px"><h3>选好条件，点「开始选股」</h3>
            <p>会在 ${Object.keys(fundItems()).length} 家公司里，
              用 <b>${ymd(st.asOf)}</b> 那天已经公布的报表来筛。</p></div>
        </div>
      </div>
    </div>
  </div>`;

  renderFundRules();
  $('#fdAdd').onclick = () => { st.rules.push({ field: 'netMargin', op: '>=', value: 0.10 }); renderFundRules(); };
  $('#fdGo').onclick = runFundScreen;
  $$('#v-fund [data-fp2]').forEach(b => b.onclick = () => {
    st.rules = FUND_PRESETS[+b.dataset.fp2].rules.map(r => ({ ...r }));
    renderFundRules(); runFundScreen();
  });
}

function renderFundRules() {
  const st = fundState();
  const keys = Object.keys(FUND_FIELDS);
  $('#fdRules').innerHTML = st.rules.map((r, i) => {
    const f = FUND_FIELDS[r.field];
    const shown = f.pct ? r.value * 100 : r.value;
    return `<div class="rule">
      <select data-i="${i}" data-k="field">${keys.map(k =>
        `<option value="${k}" ${k === r.field ? 'selected' : ''}>${FUND_FIELDS[k].label}</option>`).join('')}</select>
      <select data-i="${i}" data-k="op">
        <option value=">=" ${r.op === '>=' ? 'selected' : ''}>≥</option>
        <option value="<=" ${r.op === '<=' ? 'selected' : ''}>≤</option></select>
      <input type="number" step="any" data-i="${i}" data-k="value" value="${(+shown).toFixed(2)}">
      <span class="unit">${f.unit}</span>
      <button class="rmrule" data-i="${i}" ${st.rules.length < 2 ? 'disabled' : ''}>×</button>
    </div>`;
  }).join('');

  $('#fdRules').querySelectorAll('select,input').forEach(el => {
    el.onchange = () => {
      const i = +el.dataset.i, k = el.dataset.k;
      if (k === 'value') {
        const f = FUND_FIELDS[st.rules[i].field];
        st.rules[i].value = f.pct ? (parseFloat(el.value) || 0) / 100 : (parseFloat(el.value) || 0);
      } else {
        st.rules[i][k] = el.value;
        if (k === 'field') renderFundRules();
      }
    };
  });
  $('#fdRules').querySelectorAll('.rmrule').forEach(b => b.onclick = () => {
    st.rules.splice(+b.dataset.i, 1); renderFundRules();
  });
}

/**
 * 同一套条件，在历史上**每个季度初**都重跑一遍。
 *
 * 只给一个时点的超额收益是没有意义的：挑对日子谁都能做出 +20%，
 * 挑错日子同一套条件就变成 -2%。真正该问的是「这套条件在多数时点上站得住吗」。
 * 所以这里把每个时点的超额都摆出来，让人自己看散布，而不是替他下结论。
 */
function fundRobustness(rules) {
  const [lo, hi] = fundRange();
  const codes = Object.keys(fundItems());
  const pts = [];
  for (let y = new Date(lo).getUTCFullYear(); y <= new Date(hi).getUTCFullYear(); y++) {
    for (const m of [0, 3, 6, 9]) {
      const ts = Date.UTC(y, m, 5);
      if (ts < lo || ts > hi) continue;
      const res = screenFundamentals(fundItems(), fundPrice, rules, ts, { sortBy: 'roe' });
      if (!res.rows.length) continue;
      const p = forwardReturn(res.rows.map(r => r.code), fundBars, ts, 120);
      const a = forwardReturn(codes, fundBars, ts, 120);
      if (!p || !a) continue;
      pts.push({ ts, n: res.rows.length, excess: p.median - a.median });
    }
  }
  if (pts.length < 3) return null;
  const ex = pts.map(p => p.excess).sort((x, y) => x - y);
  return {
    pts,
    median: ex[ex.length >> 1],
    winRate: ex.filter(v => v > 0).length / ex.length,
    worst: ex[0],
    best: ex[ex.length - 1],
  };
}

function robustStrip(rb, asOf) {
  if (!rb) return '';
  const cap = Math.max(0.05, ...rb.pts.map(p => Math.abs(p.excess)));
  const bars = rb.pts.map(p => {
    const h = Math.round(Math.abs(p.excess) / cap * 34);
    const cur = Math.abs(p.ts - asOf) < 100 * 86400000;
    return `<div class="rbcol" title="${ymd(p.ts)} · 选中 ${p.n} 只 · 超额 ${sg(p.excess * 100)}%">
      <div class="rbup">${p.excess >= 0 ? `<i style="height:${h}px" class="up"></i>` : ''}</div>
      <div class="rbmid"></div>
      <div class="rbdn">${p.excess < 0 ? `<i style="height:${h}px" class="dn"></i>` : ''}</div>
      <div class="rblab${cur ? ' on' : ''}">${ymd(p.ts).slice(2, 7)}</div></div>`;
  }).join('');
  return `<div class="card" style="padding:14px;margin-bottom:14px">
    <div class="ph" style="margin-bottom:8px"><h3>同一套条件，换个时点还成立吗</h3>
      <span class="mut" style="font-size:12px">${rb.pts.length} 个季度初各跑一次 · 每次都只用当时看得见的报表</span></div>
    <div class="rbstrip">${bars}</div>
    <div class="mut" style="font-size:12px;margin-top:8px">
      跑赢全市场的时点占 <b>${(rb.winRate * 100).toFixed(0)}%</b>　·
      超额中位 <b class="${rb.median >= 0 ? 'up' : 'dn'}">${sg(rb.median * 100)}%</b>　·
      最好 <b class="up">${sg(rb.best * 100)}%</b>　最差 <b class="dn">${sg(rb.worst * 100)}%</b>
    </div>
    <div class="cap" style="margin-top:6px">下面那一行大字只是<b>其中一个时点</b>的结果，
      正负都可能纯属偶然。这条散布才是这套条件的真实样子。</div>
  </div>`;
}

function runFundScreen() {
  const st = fundState();
  const out = $('#fdOut');
  out.innerHTML = `<div class="empty" style="padding:34px"><span class="spin"></span> 正在按时点取数…</div>`;

  setTimeout(() => {
    const res = screenFundamentals(fundItems(), fundPrice, st.rules, st.asOf, { sortBy: 'roe' });
    $('#fdSub').textContent = `${res.rows.length} / ${res.universe} 家 · 截至 ${ymd(st.asOf)}`;

    if (!res.rows.length) {
      out.innerHTML = `<div class="empty" style="padding:40px"><h3>没有一家满足条件</h3>
        <p>把阈值放宽一点，或者换个时点试试。</p></div>`;
      return;
    }

    // 这一段才是财务选股的意义：选完之后到底涨没涨
    const picked = forwardReturn(res.rows.map(r => r.code), fundBars, st.asOf, 120);
    const all = forwardReturn(Object.keys(fundItems()), fundBars, st.asOf, 120);
    const cols = [...new Set(st.rules.map(r => r.field))];

    // 稳健性放在单时点成绩**前面**是有意的：
    // 单个时点的超额随便都能出现 +0.00% 或 +20%，看它得出的任何结论都是运气。
    // 先给散布、再给这一次，读的人才不会把一次结果当成能力。
    out.innerHTML = `
      ${robustStrip(fundRobustness(st.rules), st.asOf)}

      ${picked && all ? `<div class="grid g4" style="gap:10px;margin-bottom:14px">
        <div class="tile hero-tile"><div class="l">这一个时点 · 选中组合之后 120 日</div>
          <div class="v num ${picked.median >= 0 ? 'up' : 'dn'}">${sg(picked.median * 100)}%</div>
          <div class="d">中位收益 · ${picked.n} 只</div></div>
        <div class="tile"><div class="l">全市场同期</div>
          <div class="v num ${all.median >= 0 ? 'up' : 'dn'}">${sg(all.median * 100)}%</div>
          <div class="d">中位收益 · ${all.n} 只</div></div>
        <div class="tile"><div class="l">这一次的超额</div>
          <div class="v num ${picked.median - all.median >= 0 ? 'up' : 'dn'}">${sg((picked.median - all.median) * 100)}%</div>
          <div class="d">${picked.n} 只的中位数，样本很小，别当结论</div></div>
        <div class="tile"><div class="l">上涨占比</div>
          <div class="v num">${(picked.upRate * 100).toFixed(0)}%</div>
          <div class="d">全市场 ${(all.upRate * 100).toFixed(0)}%</div></div>
      </div>` : ''}

      <div class="scrollx"><table class="dt"><thead><tr>
        <th>公司</th><th>板块</th><th>最新报告期</th><th>披露日</th><th>股价</th>
        ${cols.map(c => `<th>${FUND_FIELDS[c].label}</th>`).join('')}
        <th>ROE</th><th>之后 120 日</th></tr></thead>
        <tbody>${res.rows.map(r => {
          const f = picked?.detail.find(d => d.code === r.code);
          return `<tr>
            <td class="txt"><b>${r.display}</b> <span class="mut" style="font-size:11px">${r.code}</span></td>
            <td class="txt">${r.sector}</td>
            <td>${r.period}</td>
            <td class="mut">${ymd(r.disclTs)}</td>
            <td>${r.price != null ? fx(r.price, 2) : '—'}</td>
            ${cols.map(c => `<td>${fmtFund(c, r[c])}</td>`).join('')}
            <td>${fmtFund('roe', r.roe)}</td>
            <td class="${f && f.ret >= 0 ? 'up' : 'dn'}">${f ? sg(f.ret * 100) + '%' : '—'}</td></tr>`;
        }).join('')}
        </tbody></table></div>

      <div class="note" style="margin-top:14px"><span>⚠</span><span>
        <b>「之后 120 日」这一列是揭晓，不是选股依据。</b>
        选股只用了 ${ymd(st.asOf)} 之前已经披露的报表 ——
        最新报告期那一列的披露日全部早于这一天，可以逐行核对。
        另外这是<b>演示数据</b>，其中基本面与股价的关联是生成时设定的，
        不代表真实市场里高 ROE 就一定跑赢。</span></div>`;
  }, 30);
}

function fmtFund(key, v) {
  if (v == null || !Number.isFinite(v)) return '—';
  const f = FUND_FIELDS[key];
  if (!f) return (+v).toFixed(2);
  if (f.pct) return sg(v * 100) + '%';
  if (f.unit === '万元') return (v / 10000).toFixed(1) + ' 亿';
  return (+v).toFixed(2);
}

/* ══════════════ 财报时光机 ══════════════ */

function renderTimeMachine() {
  const st = fundState();
  const items = fundItems();
  const codes = Object.keys(items);
  if (!st.code) st.code = codes[0];

  const tm = timeMachine(items, st.code, st.asOf, fundBars(st.code));
  const m = tm.metrics;

  $('#fdBody').innerHTML = `
  <div class="row2" style="grid-template-columns:minmax(0,1fr) 340px">
    <div>
      <div class="panel">
        <div class="ph"><h3>${tm.display}</h3>
          <span class="sub">${st.code} · ${tm.sector}</span>
          <select id="fdCode" style="width:auto;margin-left:auto">${codes.map(c =>
            `<option value="${c}" ${c === st.code ? 'selected' : ''}>${items[c].display}</option>`).join('')}</select>
        </div>
        <div style="padding:8px"><div id="fdChart" style="width:100%;height:280px"></div></div>
      </div>

      <div class="panel" style="margin-top:16px">
        <div class="ph"><h3>${ymd(st.asOf)} 这一天，你能看到的报表</h3>
          <span class="sub">${tm.seen.length} 期已披露</span></div>
        <div class="pb scrollx">
          ${tm.seen.length ? `<table class="dt"><thead><tr>
            <th>报告期</th><th>披露日</th><th>营业收入</th><th>净利润</th><th>净资产</th><th>负债率</th></tr></thead>
            <tbody>${tm.seen.slice(-8).reverse().map(r => `<tr>
              <td>${r.period}</td><td class="mut">${ymd(r.disclTs)}</td>
              <td>${(r.revenue / 10000).toFixed(1)} 亿</td>
              <td class="${r.netProfit >= 0 ? 'up' : 'dn'}">${(r.netProfit / 10000).toFixed(2)} 亿</td>
              <td>${(r.equity / 10000).toFixed(1)} 亿</td>
              <td>${(r.liabilities / r.assets * 100).toFixed(1)}%</td></tr>`).join('')}
            </tbody></table>` : '<div class="mut">这一天之前，这家公司还没有公布过任何报表。</div>'}
        </div>
      </div>
    </div>

    <div class="side">
      <div class="panel coach">
        <div class="ph"><span class="aidot">✦</span><h3>当时的画像</h3></div>
        <div class="pb">
          ${m ? `
            <div class="kv"><span>最新报告期</span><span class="num">${m.period}</span></div>
            <div class="kv"><span>披露于</span><span class="num">${ymd(m.disclTs)}</span></div>
            <div class="kv"><span>股价</span><span class="num">${tm.price != null ? fx(tm.price, 2) : '—'}</span></div>
            <div class="kv"><span>ROE（TTM）</span><span class="num">${fmtFund('roe', m.roe)}</span></div>
            <div class="kv"><span>净利率</span><span class="num">${fmtFund('netMargin', m.netMargin)}</span></div>
            <div class="kv"><span>营收同比</span><span class="num">${fmtFund('revYoY', m.revYoY)}</span></div>
            <div class="kv"><span>净利同比</span><span class="num">${fmtFund('profitYoY', m.profitYoY)}</span></div>
            <div class="kv"><span>资产负债率</span><span class="num">${fmtFund('debtRatio', m.debtRatio)}</span></div>
            <div class="kv"><span>PE / PB</span><span class="num">${m.pe ? m.pe.toFixed(1) : '—'} / ${m.pb ? m.pb.toFixed(2) : '—'}</span></div>
          ` : '<div class="mut" style="font-size:13px">这一天还没有任何已披露的报表。</div>'}
        </div>
      </div>

      <div class="panel">
        <div class="ph"><h3>下一期什么时候来</h3></div>
        <div class="pb" id="tmNext">
          ${tm.next ? `
            <div class="kv"><span>报告期</span><span class="num">${tm.next.period}</span></div>
            <div class="kv"><span>报告期结束</span><span class="num">${ymd(tm.next.endTs)}</span></div>
            <div class="kv"><span>预计披露</span><span class="num">${ymd(tm.next.disclTs)}</span></div>
            <div class="kv"><span>还有</span><span class="num">${tm.next.daysAway} 天</span></div>
            <div class="note info" style="margin-top:11px;font-size:12px"><span>◎</span><span>
              这一期的<b>数字现在还不存在</b>。注意报告期已经结束
              （${ymd(tm.next.endTs)}），但要等到 ${ymd(tm.next.disclTs)} 才公布 ——
              中间这 ${tm.next.daysAway} 天，任何人都看不到它。</span></div>
            ${st.revealed ? renderReveal(tm) : `
              <button class="btn btn-p" style="width:100%;margin-top:12px" id="fdReveal">
                快进到披露日，看看是什么</button>`}
          ` : '<div class="mut" style="font-size:13px">这已经是最后一期了。</div>'}
        </div>
      </div>
    </div>
  </div>`;

  $('#fdCode').onchange = (e) => { st.code = e.target.value; st.revealed = false; renderFundBody(); };
  const rev = $('#fdReveal');
  if (rev) rev.onclick = () => { st.revealed = true; renderFundBody(); };
  requestAnimationFrame(() => drawTimeMachineChart(tm));
}

function renderReveal(tm) {
  const r = tm.reveal.report;
  const prev = tm.seen.length ? tm.seen[tm.seen.length - 1] : null;
  const chg = (a, b) => (prev && b > 0) ? sg((a / b - 1) * 100) + '%' : '—';
  const pxChg = (tm.price && tm.reveal.priceAfter)
    ? (tm.reveal.priceAfter / tm.price - 1) : null;

  return `
    <div class="revealbox">
      <b>${r.period} 已于 ${ymd(r.disclTs)} 公布</b>
      <div class="kv"><span>营业收入</span><span class="num">${(r.revenue / 10000).toFixed(1)} 亿
        <i class="${prev && r.revenue >= prev.revenue ? 'up' : 'dn'}">${chg(r.revenue, prev?.revenue)}</i></span></div>
      <div class="kv"><span>净利润</span><span class="num">${(r.netProfit / 10000).toFixed(2)} 亿
        <i class="${prev && r.netProfit >= prev.netProfit ? 'up' : 'dn'}">${chg(r.netProfit, prev?.netProfit)}</i></span></div>
      <div class="kv"><span>披露日股价</span><span class="num">${tm.reveal.priceAfter != null ? fx(tm.reveal.priceAfter, 2) : '—'}</span></div>
      <div class="kv"><span>这段时间股价</span>
        <span class="num ${pxChg >= 0 ? 'up' : 'dn'}">${pxChg != null ? sg(pxChg * 100) + '%' : '—'}</span></div>
      <p class="mut" style="font-size:11.5px;margin-top:9px;line-height:1.6">
        股价在报告期结束到披露日之间已经走了这么多 —— 市场往往先动，
        报表只是把已经发生的事确认一遍。这正是「用财报解释当时股价」
        为什么是个陷阱。</p>
    </div>`;
}

function drawTimeMachineChart(tm) {
  const st = fundState();
  const bars = fundBars(st.code);
  if (!bars) return;
  const c = getChart('fdChart', { ma: true });
  if (!c) return;

  // 只画到 asOf —— 时光机就是「回到那一天」，右边不该有东西
  let end = bars.length - 1;
  while (end > 0 && bars[end].t > st.asOf) end--;
  const from = Math.max(0, end - 240);
  c.applyNewData(bars.slice(from, end + 1).map(toK));
  c.setPriceVolumePrecision(2, 0);
  c.setStyles({ candle: { tooltip: { showRule: 'follow_cross' } },
    indicator: { tooltip: { showRule: 'follow_cross' } } });
  try { c.removeOverlay(); } catch (e) {}

  // 把每一次财报披露标在图上：这是「信息何时到达市场」的可视化
  for (const r of tm.seen.slice(-6)) {
    let i = end;
    while (i > 0 && bars[i].t > r.disclTs) i--;
    if (i > from) addMark(c, bars[i], r.period, cssv('--teal'));
  }
  c.setOffsetRightDistance(90);
}
