/* ===== 手绘 SVG 图表库（零依赖，全部返回 HTML 字符串，交互经 data-* 委托） ===== */

/* ① 六维雷达：本月实线 vs 上月虚线，顶点可点击下钻 */
function chRadar(dims, now, prev, opt) {
  const W = (opt && opt.w) || 330, H = (opt && opt.h) || 250, cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) / 2 - 44;
  const pt = (vals, k) => dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length, r = R * vals[i] / 100 * (k || 1); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const ring = k => `<polygon points="${dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length; return `${cx + Math.cos(a) * R * k},${cy + Math.sin(a) * R * k}`; }).join(' ')}" fill="none" stroke="#17293f"/>`;
  const P1 = pt(now), P0 = pt(prev);
  return `<svg viewBox="0 0 ${W} ${H}" class="chsvg">
    ${[.33, .66, 1].map(ring).join('')}
    ${dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length; return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}" stroke="#17293f"/>`; }).join('')}
    <polygon points="${P0.map(p => p.join(',')).join(' ')}" fill="none" stroke="#5f7794" stroke-width="1.4" stroke-dasharray="4 4"/>
    <polygon class="anim-poly" points="${P1.map(p => p.join(',')).join(' ')}" fill="rgba(77,151,232,.25)" stroke="#4d97e8" stroke-width="2"/>
    ${dims.map((n, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length, lr = R + 26;
      const lx = cx + Math.cos(a) * lr, ly = cy + Math.sin(a) * lr;
      const diff = now[i] - prev[i];
      return `<g class="hitv" data-dim="${i}" data-tip="${n} ${now[i]} 分 · 较上月${diff >= 0 ? '+' : ''}${diff}">
        <circle cx="${P1[i][0]}" cy="${P1[i][1]}" r="9" fill="transparent"/>
        <circle cx="${P1[i][0]}" cy="${P1[i][1]}" r="3.2" fill="#9ecbff"/>
        <text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" fill="#93a9c4">${n}</text>
        <text x="${lx}" y="${ly + 12}" text-anchor="middle" font-size="10.5" font-family="var(--mono)" fill="${now[i] < 70 ? '#ffcf7a' : '#9ecbff'}">${now[i]}</text></g>`;
    }).join('')}
    <g font-size="10" fill="#5f7794"><rect x="${W - 92}" y="8" width="10" height="3" fill="#4d97e8"/><text x="${W - 78}" y="13">本月</text>
    <rect x="${W - 46}" y="8" width="10" height="3" fill="#5f7794"/><text x="${W - 32}" y="13">上月</text></g></svg>`;
}

/* ② 近30天 双轴柱线：柱=时长(min) 线=次数，某日可点击下钻 */
function chCombo(byDay, opt) {
  const W = 340, H = 240, pl = 34, pr = 30, pt2 = 18, pb = 26, iw = W - pl - pr, ih = H - pt2 - pb;
  const days = []; for (let d = 29; d >= 0; d--) days.push({ d, m: (byDay[d] || {}).min || 0, c: (byDay[d] || {}).cnt || 0 });
  const mMax = Math.max(60, ...days.map(x => x.m)), cMax = Math.max(2, ...days.map(x => x.c));
  const bw = iw / 30 * .58;
  const X = i => pl + iw / 30 * (i + .5);
  const line = days.map((x, i) => x.c ? `${X(i)},${pt2 + ih - ih * x.c / cMax}` : null).filter(Boolean).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="chsvg">
    ${[0, .5, 1].map(k => `<line x1="${pl}" y1="${pt2 + ih * k}" x2="${W - pr}" y2="${pt2 + ih * k}" stroke="#17293f"/>
      <text x="${pl - 5}" y="${pt2 + ih * k + 3}" text-anchor="end" font-size="9" fill="#5f7794">${Math.round(mMax * (1 - k))}</text>
      <text x="${W - pr + 5}" y="${pt2 + ih * k + 3}" font-size="9" fill="#5f7794">${(cMax * (1 - k)).toFixed(0)}</text>`).join('')}
    ${days.map((x, i) => x.m ? `<rect class="hitv anim-bar" data-day="${x.d}" data-tip="${dayLabel(x.d)} · ${x.m} 分钟 · ${x.c} 场" x="${X(i) - bw / 2}" y="${pt2 + ih - ih * x.m / mMax}" width="${bw}" height="${ih * x.m / mMax}" rx="1.5" fill="url(#gbar)" style="animation-delay:${i * 14}ms"/>` : '').join('')}
    <polyline class="anim-line" points="${line}" fill="none" stroke="#2fd08a" stroke-width="1.6"/>
    ${days.map((x, i) => x.c ? `<circle class="hitv" data-day="${x.d}" data-tip="${dayLabel(x.d)} · ${x.c} 场" cx="${X(i)}" cy="${pt2 + ih - ih * x.c / cMax}" r="2.6" fill="#2fd08a"/>` : '').join('')}
    ${days.map((x, i) => i % 6 === 0 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#5f7794">${dayLabel(x.d)}</text>` : '').join('')}
    <defs><linearGradient id="gbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d97e8"/><stop offset="1" stop-color="#1e63b8"/></linearGradient></defs>
    <g font-size="10" fill="#5f7794"><rect x="${pl}" y="4" width="10" height="5" fill="#4d97e8"/><text x="${pl + 14}" y="9">时长(分钟)</text>
    <circle cx="${pl + 84}" cy="6.5" r="3" fill="#2fd08a"/><text x="${pl + 91}" y="9">次数</text></g></svg>`;
}

/* ③ 练习方式分布 环形：分段可点击 */
function chDonut(cnt) {
  const W = 330, H = 240, cx = W / 2 - 44, cy = H / 2, R = 74, sw = 26;
  const CLR = { '完整操作票': '#4d97e8', '分段练习': '#2fd08a', '专项练习': '#e8b22a', '错题重练': '#c3a8e8' };
  const keys = Object.keys(cnt), total = keys.reduce((a, k) => a + cnt[k], 0);
  const C = 2 * Math.PI * R; let acc = 0;
  const segs = keys.map(k => {
    const frac = cnt[k] / total, off = acc; acc += frac;
    return `<circle class="hitv anim-seg" data-plan="${k}" data-tip="${k} · ${cnt[k]} 场 · ${Math.round(frac * 100)}%"
      cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${CLR[k]}" stroke-width="${sw}"
      stroke-dasharray="${(frac * C - 2.5).toFixed(1)} ${(C - frac * C + 2.5).toFixed(1)}"
      stroke-dashoffset="${(-off * C).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chsvg">${segs}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="26" font-family="var(--mono)" fill="#e6edf6">${total}</text>
    <text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="10" fill="#5f7794">近30天场次</text>
    ${keys.map((k, i) => `<g class="hitv" data-plan="${k}" data-tip="点击查看${k}场次明细">
      <rect x="${W - 108}" y="${62 + i * 30}" width="9" height="9" rx="2" fill="${CLR[k]}"/>
      <text x="${W - 93}" y="${70 + i * 30}" font-size="11" fill="#93a9c4">${k}</text>
      <text x="${W - 93}" y="${82 + i * 30}" font-size="10" font-family="var(--mono)" fill="#5f7794">${cnt[k]} 场</text></g>`).join('')}</svg>`;
}

/* ④ 扣分与红线趋势 面积图：周点可点击 */
function chArea(weeks, reds) {
  const W = 340, H = 240, pl = 34, pr = 14, pt2 = 20, pb = 30, iw = W - pl - pr, ih = H - pt2 - pb;
  const vMax = Math.max(10, ...weeks);
  const X = i => pl + iw * (4 - i) / 4, Y = v => pt2 + ih - ih * v / vMax;
  const pts = [4, 3, 2, 1, 0].map(i => `${X(i)},${Y(weeks[i])}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="chsvg">
    ${[0, .5, 1].map(k => `<line x1="${pl}" y1="${pt2 + ih * k}" x2="${W - pr}" y2="${pt2 + ih * k}" stroke="#17293f"/>
      <text x="${pl - 5}" y="${pt2 + ih * k + 3}" text-anchor="end" font-size="9" fill="#5f7794">${Math.round(vMax * (1 - k))}</text>`).join('')}
    <polygon class="anim-poly" points="${pl},${pt2 + ih} ${pts} ${W - pr},${pt2 + ih}" fill="url(#garea)" stroke="none"/>
    <polyline class="anim-line" points="${pts}" fill="none" stroke="#ff8a3d" stroke-width="2"/>
    ${[4, 3, 2, 1, 0].map(i => `<g class="hitv" data-week="${i}" data-tip="${i === 0 ? '本周' : i + ' 周前'} · 扣分 ${weeks[i]}${reds[i] ? ' · 红线 ' + reds[i] + ' 次' : ''}">
      <circle cx="${X(i)}" cy="${Y(weeks[i])}" r="8" fill="transparent"/>
      <circle cx="${X(i)}" cy="${Y(weeks[i])}" r="3.4" fill="#ff8a3d"/>
      ${reds[i] ? `<path d="M ${X(i) - 5} ${Y(weeks[i]) - 10} l 5 -8 l 5 8 z" fill="#ff3b52"/>` : ''}
      <text x="${X(i)}" y="${H - 10}" text-anchor="middle" font-size="9.5" fill="#5f7794">${i === 0 ? '本周' : i + '周前'}</text></g>`).join('')}
    <defs><linearGradient id="garea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,138,61,.34)"/><stop offset="1" stop-color="rgba(255,138,61,.02)"/></linearGradient></defs>
    <g font-size="10" fill="#5f7794"><path d="M ${pl} 6 l 4 -7 l 4 7 z" fill="#ff3b52"/><text x="${pl + 12}" y="8">红线触发</text>
    <rect x="${pl + 70}" y="2" width="10" height="4" fill="#ff8a3d"/><text x="${pl + 84}" y="8">周扣分合计</text></g></svg>`;
}

/* ⑤ 能力对标热力矩阵（CSS Grid）：格可点击 */
function chHeat(dims, mine, team) {
  const cell = (v, extra) => {
    const t = Math.max(0, Math.min(1, (v - 40) / 60));
    const bg = `rgba(${Math.round(30 + (77 - 30) * t)},${Math.round(80 + (151 - 80) * t)},${Math.round(150 + (232 - 150) * t)},${(.25 + t * .65).toFixed(2)})`;
    return `<div class="heatc hitv" data-tip="${extra}" style="background:${bg}">${v}</div>`;
  };
  return `<div class="heatg">
    <div class="heath"></div><div class="heath">我</div><div class="heath">班组均值</div><div class="heath">差距</div>
    ${dims.map((n, i) => {
      const d = mine[i] - team[i];
      return `<div class="heatn hitv" data-hdim="${i}" data-tip="点击查看「${n}」明细">${n}</div>
        ${cell(mine[i], `我的「${n}」 ${mine[i]} 分`)}
        ${cell(team[i], `班组均值 ${team[i]} 分（组织级口径）`)}
        <div class="heatc hitv ${d < 0 ? 'neg' : 'pos'}" data-hdim="${i}" data-tip="点击查看「${n}」明细与练习建议">${d >= 0 ? '+' + d : d}</div>`;
    }).join('')}</div>`;
}

/* ⑥ 岗位胜任度 仪表盘：整体可点击 */
function chGauge(f) {
  const W = 330, H = 240, cx = W / 2, cy = H / 2 + 36, R = 92;
  const a0 = Math.PI * 1.17, a1 = -Math.PI * .17;                 // 起止角
  const arc = (r, f0, f1, col, w2, cls) => {
    const s = a0 + (a1 - a0) * f0, e = a0 + (a1 - a0) * f1;
    const large = Math.abs(e - s) > Math.PI ? 1 : 0;
    return `<path class="${cls || ''}" d="M ${cx + Math.cos(s) * r} ${cy - Math.sin(s) * r} A ${r} ${r} 0 ${large} 1 ${cx + Math.cos(e) * r} ${cy - Math.sin(e) * r}" fill="none" stroke="${col}" stroke-width="${w2}" stroke-linecap="round"/>`;
  };
  const na = a0 + (a1 - a0) * f.pct / 100;
  return `<svg viewBox="0 0 ${W} ${H}" class="chsvg hitv" data-gauge="1" data-tip="点击查看胜任度构成与差距项">
    ${arc(R, 0, 1, '#132840', 15)}
    ${arc(R, 0, f.pct / 100, 'url(#ggau)', 15, 'anim-line')}
    ${[0, 25, 50, 75, 100].map(v => { const a = a0 + (a1 - a0) * v / 100; return `<text x="${cx + Math.cos(a) * (R + 20)}" y="${cy - Math.sin(a) * (R + 20) + 3}" text-anchor="middle" font-size="9" fill="#5f7794">${v}</text>`; }).join('')}
    <line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(na) * (R - 24)}" y2="${cy - Math.sin(na) * (R - 24)}" stroke="#e6edf6" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="5" fill="#e6edf6"/>
    <text x="${cx}" y="${cy + 34}" text-anchor="middle" font-size="34" font-family="var(--mono)" fill="#8fe8c0">${f.pct}<tspan font-size="15" fill="#5f7794">%</tspan></text>
    <text x="${cx}" y="${cy + 52}" text-anchor="middle" font-size="10.5" fill="#93a9c4">${f.post} · 胜任度测算</text>
    <text x="${cx}" y="${cy + 68}" text-anchor="middle" font-size="9" fill="#5f7794">测算供参考，任职评定以人工审核为准</text>
    <defs><linearGradient id="ggau" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e63b8"/><stop offset="1" stop-color="#2fd08a"/></linearGradient></defs></svg>`;
}

/* 小型六维条（复盘页展开行用） */
function miniBars(vals) {
  return `<div class="mbars">${DIMS6.map((n, i) => `<div class="mbar"><span>${n}</span>
    <div class="mtrk"><div class="mfill" style="width:${vals[i]}%;background:${vals[i] < 70 ? '#e8b22a' : '#4d97e8'}"></div></div>
    <b>${vals[i]}</b></div>`).join('')}</div>`;
}
