/* ===== 陪练关卡 · 场景设备图（SVG，按现场实拍重绘；9/13 六次口径：只画与本关操作 / 检查相关的部件，无关面板与装饰一律不画） =====
   所有画面 16:9（viewBox 0 0 960 540）。热区：<g class="hs" data-hs="id"><rect class="hsr" …/></g>，由 exam.js 统一处理点击、完成标记与提示。 */

const SC = {
  W: 960, H: 540,
  hs(id, x, y, w, h, r) { return `<g class="hs" data-hs="${id}"><rect class="hsr" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r == null ? 8 : r}"/></g>`; },
  lamp(x, y, on, c, r) { r = r || 7; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${on ? c : '#e3e5da'}" stroke="${on ? c : '#b9bfae'}" stroke-width="1.4"/>${on ? `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="${c}" opacity=".16"><animate attributeName="opacity" values=".16;.04;.16" dur="1.5s" repeatCount="indefinite"/></circle>` : ''}<circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .3}" fill="#fff" opacity=".5"/>`; },
  t(x, y, s, o) { o = o || {}; return `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" font-size="${o.fs || 10}" fill="${o.c || '#3c4a40'}" ${o.b ? 'font-weight="700"' : ''} ${o.m ? 'font-family="monospace"' : ''}>${s}</text>`; },
  plate(x, y, w, h, s, fs) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#fff" stroke="#7a1f16" stroke-width="2"/>${this.t(x + w / 2, y + h / 2 + (fs || 12) * .36, s, { fs: fs || 12, c: '#b3271b', b: 1 })}`; },
  knob(x, y, left, right, pos) { const on = pos === right; return `<rect x="${x - 26}" y="${y - 26}" width="52" height="52" rx="6" fill="#eef0e6" stroke="#b9bfae"/><circle cx="${x}" cy="${y}" r="16" fill="#f8f9f3" stroke="#9aa392" stroke-width="2"/><g transform="rotate(${on ? 35 : -35} ${x} ${y})"><rect x="${x - 3}" y="${y - 18}" width="6" height="20" rx="2" fill="#2c3a31"/></g>${this.t(x - 30, y - 30, left, { fs: 8, a: 'end', c: on ? '#98a69c' : '#a8821b', b: !on })}${this.t(x + 30, y - 30, right, { fs: 8, a: 'start', c: on ? '#a8821b' : '#98a69c', b: on })}`; },
  opBtn(op, x, y, c, s) { return `<g class="op" data-op="${op}" style="cursor:pointer">${this.btn(x, y, c, s)}</g>`; },
  btn(x, y, c, s) { return `<circle cx="${x}" cy="${y}" r="15" fill="#e9ebe0" stroke="#b9bfae" stroke-width="2"/><circle cx="${x}" cy="${y}" r="10" fill="${c}"/><circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#fff" opacity=".45"/>${s ? this.t(x, y + 28, s, { fs: 8.5 }) : ''}`; },
  mcbRow(x, y, n, labels) { return labels.slice(0, n).map((l, i) => `<rect x="${x + i * 22}" y="${y}" width="18" height="34" rx="2" fill="#f3f4ee" stroke="#b9bfae"/><rect x="${x + i * 22 + 5}" y="${y + 4}" width="8" height="12" rx="1.5" fill="#2f6fd6"/><text x="${x + i * 22 + 9}" y="${y + 46}" text-anchor="middle" font-size="6" fill="#5c6b5f">${l}</text>`).join(''); },
  check(x, y) { return `<g class="hsdone" transform="translate(${x},${y})"><circle r="10" fill="#0e8f5a"/><path d="M -4.5 0 l 3 3.4 6 -6.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>`; },
  frame(title, sub, dark) { return `<rect x="0" y="0" width="960" height="540" fill="${dark ? '#eceee6' : '#f2f3ea'}"/><rect x="0" y="0" width="960" height="34" fill="${dark ? '#243329' : '#e4e7db'}"/>${this.t(16, 22, title, { a: 'start', fs: 12.5, c: dark ? '#e6efe8' : '#243329', b: 1 })}${sub ? this.t(944, 22, sub, { a: 'end', fs: 10, c: dark ? '#9ab3a2' : '#7a8478', m: 1 }) : ''}`; },
  /* 表盘：v 指针角度百分比（0–100）；ok 区间绿、低压区红 */
  gauge(cx, cy, R, pct, label, unit, ok) {
    const a0 = -220, a1 = 40, ang = a0 + (a1 - a0) * pct / 100;
    const arc = (s, e, c, w) => { const p = t => [cx + Math.cos(t * Math.PI / 180) * (R - 8), cy + Math.sin(t * Math.PI / 180) * (R - 8)]; const A = p(s), Bp = p(e); return `<path d="M ${A[0]} ${A[1]} A ${R - 8} ${R - 8} 0 ${e - s > 180 ? 1 : 0} 1 ${Bp[0]} ${Bp[1]}" fill="none" stroke="${c}" stroke-width="${w}"/>`; };
    return `<circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="#2b2f2c"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#fbfbf6" stroke="#8a8f86" stroke-width="2"/>
      ${arc(a0, a0 + 70, '#d43a2f', 6)}${arc(a0 + 70, a1, '#2aa66a', 6)}
      ${Array.from({ length: 14 }, (_, i) => { const t = (a0 + (a1 - a0) * i / 13) * Math.PI / 180; return `<line x1="${cx + Math.cos(t) * (R - 14)}" y1="${cy + Math.sin(t) * (R - 14)}" x2="${cx + Math.cos(t) * (R - 20)}" y2="${cy + Math.sin(t) * (R - 20)}" stroke="#5c6b5f" stroke-width="1.6"/><text x="${cx + Math.cos(t) * (R - 30)}" y="${cy + Math.sin(t) * (R - 30) + 3}" text-anchor="middle" font-size="${R > 60 ? 9 : 6}" fill="#5c6b5f">${(i * 0.1).toFixed(1).replace(/\.0$/, '')}</text>`; }).join('')}
      <g transform="rotate(${ang} ${cx} ${cy})"><polygon points="${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy - R + 12}" fill="#c8372d"/></g><circle cx="${cx}" cy="${cy}" r="4" fill="#2b2f2c"/>
      ${this.t(cx, cy + R * .55, label, { fs: R > 60 ? 10 : 7, c: '#243329' })}${this.t(cx, cy + R * .55 + (R > 60 ? 13 : 9), unit, { fs: R > 60 ? 9 : 6, c: '#7a8478' })}
      ${ok === false ? `<circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="none" stroke="#d43a2f" stroke-width="2" stroke-dasharray="4 3"/>` : ''}`;
  }
};

/* ---------- 1163：监控后台分图（一次小图 · 本关要看的遥测 · 动作信号） ---------- */
function svgHmi1163(st, o) {
  o = o || {};
  const cb = st.cb === 'open', es = st.es === 'close', d4 = st.d4 === 'open', d2 = st.d2 === 'open';
  const LIVE = '#e23b2e', DEAD = '#23b26a', GND = '#e8b22a';
  const cur = cb ? ['0.00', '0.00', '0.00'] : ['312.4', '308.1', '315.6'];
  const vol = d4 ? ['0.00', '0.00', '0.00'] : ['113.9', '114.1', '113.6'];
  const row = (y, k, v, u, hi) => `<rect x="258" y="${y - 15}" width="264" height="22" fill="${hi ? '#3b4a2a' : (y / 26 | 0) % 2 ? '#1a221d' : '#141b17'}"/>${SC.t(268, y, k, { a: 'start', fs: 11, c: '#bfcbc3', m: 1 })}${SC.t(470, y, v, { a: 'end', fs: 12.5, c: hi ? '#ffd76a' : '#7ee0a8', m: 1, b: 1 })}${SC.t(502, y, u, { fs: 9, c: '#8fa397', m: 1 })}`;
  const sig = (y, t, alm) => `<rect x="580" y="${y - 15}" width="330" height="22" fill="${alm ? '#8c2b22' : '#1b2420'}" stroke="#2f3b34"/>${SC.t(590, y, t, { a: 'start', fs: 10, c: alm ? '#ffd9d4' : '#9fb2a6' })}${alm ? `<circle cx="896" cy="${y - 4}" r="4" fill="#ff5a4a"/>` : ''}`;
  return `<rect x="0" y="0" width="960" height="540" fill="#0f1512"/>
    <rect x="0" y="0" width="960" height="26" fill="#1b2420"/>${SC.t(10, 17, '主接线图 · 保护分图', { a: 'start', fs: 9, c: '#9fb2a6' })}${SC.t(950, 17, '110kV仿真站 · 监控后台 · 用户：任玲玲', { a: 'end', fs: 9, c: '#9fb2a6', m: 1 })}
    ${SC.t(480, 56, '110kV培训三线1163分图', { fs: 20, c: '#e9f1ec', b: 1 })}
    <!-- 一次小图 -->
    ${SC.t(120, 88, '110kV 2M', { a: 'start', fs: 9, c: '#e58a80', m: 1 })}<line x1="40" y1="94" x2="210" y2="94" stroke="${LIVE}" stroke-width="4"/>
    <line x1="125" y1="94" x2="125" y2="132" stroke="${d2 ? DEAD : LIVE}" stroke-width="2"/>
    <g transform="translate(125,146)"><line x1="0" y1="-14" x2="0" y2="-6" stroke="${d2 ? DEAD : LIVE}" stroke-width="2"/><line x1="0" y1="${d2 ? -6 : -8}" x2="${d2 ? 9 : 0}" y2="${d2 ? -1 : 8}" stroke="${d2 ? DEAD : LIVE}" stroke-width="2.4" stroke-linecap="round"/><line x1="0" y1="8" x2="0" y2="14" stroke="${d2 ? DEAD : LIVE}" stroke-width="2"/></g>${SC.t(140, 150, '11632', { a: 'start', fs: 9, c: '#c9d3cc', m: 1 })}
    <line x1="125" y1="160" x2="125" y2="196" stroke="${(d2 || cb) ? DEAD : LIVE}" stroke-width="2"/>
    <g data-part="cb"><rect x="113" y="196" width="24" height="24" fill="${cb ? '#0f1512' : LIVE}" stroke="${cb ? DEAD : LIVE}" stroke-width="2.6"/></g>${SC.t(144, 213, '1163', { a: 'start', fs: 10, c: '#e9f1ec', m: 1, b: 1 })}
    <line x1="125" y1="220" x2="125" y2="256" stroke="${(d2 || cb) ? DEAD : LIVE}" stroke-width="2"/>
    <g transform="translate(125,270)"><line x1="0" y1="-14" x2="0" y2="-6" stroke="${(d2 || cb || d4) ? DEAD : LIVE}" stroke-width="2"/><line x1="0" y1="${d4 ? -6 : -8}" x2="${d4 ? 9 : 0}" y2="${d4 ? -1 : 8}" stroke="${(d2 || cb || d4) ? DEAD : LIVE}" stroke-width="2.4" stroke-linecap="round"/><line x1="0" y1="8" x2="0" y2="14" stroke="${(d2 || cb || d4) ? DEAD : LIVE}" stroke-width="2"/></g>${SC.t(140, 274, '11634', { a: 'start', fs: 9, c: '#c9d3cc', m: 1 })}
    <line x1="125" y1="284" x2="125" y2="330" stroke="${(d2 || cb || d4) ? DEAD : LIVE}" stroke-width="2"/>
    <line x1="125" y1="306" x2="96" y2="306" stroke="${es ? GND : DEAD}" stroke-width="2"/><g transform="translate(96,306)"><line x1="0" y1="0" x2="${es ? -14 : -9}" y2="${es ? 0 : -10}" stroke="${es ? GND : DEAD}" stroke-width="2.4" stroke-linecap="round"/><line x1="-16" y1="-6" x2="-16" y2="6" stroke="${es ? GND : DEAD}" stroke-width="2.4"/><line x1="-20" y1="-3.5" x2="-20" y2="3.5" stroke="${es ? GND : DEAD}" stroke-width="2"/><line x1="-24" y1="-1.5" x2="-24" y2="1.5" stroke="${es ? GND : DEAD}" stroke-width="2"/></g>${SC.t(30, 326, '116340', { a: 'start', fs: 9, c: es ? '#ffd76a' : '#c9d3cc', m: 1 })}
    <polygon points="118,330 132,330 125,342" fill="${(d2 || cb || d4) ? DEAD : LIVE}"/>${SC.t(125, 358, '培训三线', { fs: 9, c: '#c9d3cc' })}
    ${SC.t(125, 400, '红＝带电 · 绿＝停电 · 黄＝接地', { fs: 8, c: '#5c6b5f' })}
    <!-- 遥测信息（只列本关要看的：线路二次电压 · 三相电流） -->
    <rect x="250" y="80" width="280" height="240" fill="#141b17" stroke="#2f3b34"/>${SC.t(390, 98, '遥测信息', { fs: 11, c: '#e9f1ec', b: 1 })}${SC.t(390, 112, 'PT变比 1100/1 · CT变比 1200/1', { fs: 8, c: '#e58a80', m: 1 })}
    ${[['Uab', vol[0], 'kV'], ['Ubc', vol[1], 'kV'], ['Uca', vol[2], 'kV'], ['Ia', cur[0], 'A'], ['Ib', cur[1], 'A'], ['Ic', cur[2], 'A']].map((r, i) => row(140 + i * 26, r[0], r[1], r[2], (o.hiV && i < 3) || (o.hiI && i >= 3))).join('')}
    ${SC.t(390, 306, '线路二次电压 ↑ · 三相电流 ↓', { fs: 8, c: '#5c6b5f' })}
    <!-- 信号 · 报文 -->
    <rect x="570" y="80" width="350" height="240" fill="#141b17" stroke="#2f3b34"/>${SC.t(745, 98, '信号 · 报文（110kV培训三线智能终端）', { fs: 11, c: '#e9f1ec', b: 1 })}
    ${[['1163 开关分闸', cb], ['116340 地刀合闸', es], ['开关就地控制', st.loc === '就地'], ['线路 PT 断线', d4], ['预告总信号', d4 || cb]].map((r, i) => sig(140 + i * 30, r[0], r[1])).join('')}
    ${SC.t(745, 306, '红底＝当前动作信号', { fs: 8, c: '#5c6b5f' })}
    ${SC.hs('cb', 100, 186, 90, 44)}${SC.hs('es', 22, 288, 108, 46)}${SC.hs('volt', 256, 122, 268, 80)}${SC.hs('cur', 256, 202, 268, 80)}${SC.hs('sig', 578, 122, 334, 154)}`;
}
/* 后台放大：开关位置遥信 */
function zoomHmiCb(st) {
  const cb = st.cb === 'open';
  return `<svg viewBox="0 0 420 260" class="zsvg"><rect width="420" height="260" fill="#0f1512"/>${SC.t(210, 24, '培训三线1163开关 · 位置遥信与遥控操作', { fs: 12, c: '#e9f1ec', b: 1 })}
    <rect x="30" y="44" width="150" height="150" rx="6" fill="#141b17" stroke="#2f3b34"/><rect x="85" y="99" width="40" height="40" fill="${cb ? '#0f1512' : '#e23b2e'}" stroke="${cb ? '#23b26a' : '#e23b2e'}" stroke-width="4"/>
    ${SC.t(105, 214, cb ? '分闸位置 · 报文：1163 开关 分闸 变位' : '合闸位置 · 报文：无', { fs: 10, c: cb ? '#7ee0a8' : '#ff9a90', m: 1 })}
    <rect x="210" y="44" width="180" height="150" rx="6" fill="#141b17" stroke="#2f3b34"/>${SC.t(300, 64, '遥控操作 · 按住执行', { fs: 10, c: '#9fb2a6' })}
    <g>${SC.opBtn('cb:open', 260, 118, '#23b26a')}<text x="260" y="152" text-anchor="middle" font-size="10" fill="#c9d3cc">分闸</text></g>
    <g>${SC.opBtn('cb:close', 340, 118, '#e23b2e')}<text x="340" y="152" text-anchor="middle" font-size="10" fill="#c9d3cc">合闸</text></g>
    ${SC.t(300, 184, '预置 → 返校 → 执行', { fs: 8.5, c: '#5c6b5f', m: 1 })}
    ${SC.t(210, 246, '看清位置后，把你看到的说出来', { fs: 9, c: '#5c6b5f' })}</svg>`;
}
function zoomHmiRows(st, kind) {
  const cb = st.cb === 'open', d4 = st.d4 === 'open';
  const rows = kind === 'cur' ? [['Ia', cb ? '0.00' : '312.4', 'A'], ['Ib', cb ? '0.00' : '308.1', 'A'], ['Ic', cb ? '0.00' : '315.6', 'A']] : [['Uab', d4 ? '0.00' : '113.9', 'kV'], ['Ubc', d4 ? '0.00' : '114.1', 'kV'], ['Uca', d4 ? '0.00' : '113.6', 'kV']];
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#0f1512"/>${SC.t(210, 26, kind === 'cur' ? '遥测 · 1163 开关三相电流' : '遥测 · 培训三线 1163 线路二次电压', { fs: 12, c: '#e9f1ec', b: 1 })}
    ${rows.map((r, i) => `<rect x="60" y="${52 + i * 46}" width="300" height="38" fill="#141b17" stroke="#2f3b34"/>${SC.t(80, 77 + i * 46, r[0], { a: 'start', fs: 15, c: '#bfcbc3', m: 1 })}${SC.t(300, 77 + i * 46, r[1], { a: 'end', fs: 20, c: '#7ee0a8', m: 1, b: 1 })}${SC.t(340, 77 + i * 46, r[2], { fs: 11, c: '#8fa397', m: 1 })}`).join('')}
    ${SC.t(210, 206, kind === 'cur' ? 'CT 变比 1200/1 · 刷新 2s' : 'PT 变比 1100/1 · 刷新 2s', { fs: 9, c: '#5c6b5f', m: 1 })}</svg>`;
}

/* ---------- 1163：开关机构箱内部（分、合闸指示 · 手动操作按钮只看不动） ---------- */
function svgMechBox(st) {
  const cb = st.cb === 'open';
  return `${SC.frame('110kV 培训三线 1163 开关 · 机构箱（门已打开）', 'GIS 断路器 弹簧操动机构')}
    <rect x="240" y="70" width="480" height="400" rx="10" fill="#cfd4c8" stroke="#9aa392" stroke-width="3"/>
    <rect x="256" y="86" width="448" height="368" rx="6" fill="#dfe3d8" stroke="#b9bfae"/>
    <rect x="280" y="104" width="400" height="52" rx="4" fill="#eef0e6" stroke="#b9bfae"/>${SC.t(480, 126, '110kV 培训三线 1163 断路器 操动机构', { fs: 12, b: 1 })}${SC.t(480, 144, '额定操作电压 DC 220V', { fs: 8.5, c: '#7a8478', m: 1 })}
    <!-- 分合闸指示窗（本关要看的） -->
    <g transform="translate(380,270)"><rect x="-80" y="-56" width="160" height="112" rx="8" fill="#b9bfae" stroke="#7a8478"/><rect x="-60" y="-40" width="120" height="80" rx="5" fill="#1f2d24"/><text y="16" text-anchor="middle" font-size="46" font-weight="700" fill="${cb ? '#3ad487' : '#ff5a4a'}" font-family="monospace">${cb ? '分' : '合'}</text>${SC.t(0, 78, '分、合闸指示', { fs: 11, b: 1 })}</g>
    <!-- 手动操作按钮（检查项只看不动） -->
    <g transform="translate(600,270)"><rect x="-80" y="-56" width="160" height="112" rx="8" fill="#eef0e6" stroke="#b9bfae"/><rect x="-66" y="-46" width="132" height="18" rx="3" fill="#fff" stroke="#7a8478"/>${SC.t(0, -33, '手动操作（就地）', { fs: 8.5 })}${SC.btn(-32, 14, '#23b26a', '手动分闸')}${SC.btn(32, 14, '#e23b2e', '手动合闸')}${SC.t(0, 78, '检查项只看不动', { fs: 9, c: '#b3372c' })}</g>
    ${SC.hs('ind', 296, 210, 168, 130)}${SC.hs('manual', 516, 210, 168, 130)}`;
}
function zoomMech(st) {
  const cb = st.cb === 'open';
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#dfe3d8"/><rect x="110" y="30" width="200" height="140" rx="8" fill="#b9bfae" stroke="#7a8478"/><rect x="130" y="50" width="160" height="100" rx="6" fill="#1f2d24"/><text x="210" y="122" text-anchor="middle" font-size="64" font-weight="700" fill="${cb ? '#3ad487' : '#ff5a4a'}" font-family="monospace">${cb ? '分' : '合'}</text>${SC.t(210, 200, '机构箱 · 分、合闸机械指示', { fs: 11 })}</svg>`;
}

/* ---------- 1163：就地控制柜柜面（模拟接线面板位置指示 · 高压带电显示装置） ---------- */
function svgCabFace(st, o) {
  o = o || {};
  const cb = st.cb === 'open', es = st.es === 'close', d4 = st.d4 === 'open', d2 = st.d2 === 'open', live = !d4;
  const LIVE = '#e23b2e', DEAD = '#23b26a', GND = '#e8b22a';
  const lamps = (x, y, on, c) => `${SC.lamp(x, y, on, c, 6)}${SC.lamp(x + 22, y, !on, '#23b26a', 6)}`;
  return `${SC.frame('110kV 培训三线 1163 间隔就地控制柜', '柜门关闭 · 柜面')}
    <rect x="200" y="44" width="560" height="480" rx="8" fill="#d9dccf" stroke="#9aa392" stroke-width="3"/>
    ${SC.plate(330, 56, 300, 26, '110kV培训三线1163间隔就地控制柜', 12)}
    <!-- 模拟接线面板：本间隔设备位置指示 -->
    <rect x="220" y="100" width="320" height="400" rx="4" fill="#e9ebe0" stroke="#b9bfae"/>
    ${SC.t(400, 122, '110kV 2M', { a: 'end', fs: 9, c: '#c25549', m: 1 })}<line x1="250" y1="130" x2="410" y2="130" stroke="${LIVE}" stroke-width="4"/>
    <line x1="330" y1="130" x2="330" y2="470" stroke="#7a8478" stroke-width="2.4"/>
    <g transform="translate(330,176)"><line x1="0" y1="-12" x2="${d2 ? 9 : 0}" y2="${d2 ? -4 : 12}" stroke="${d2 ? DEAD : LIVE}" stroke-width="3" stroke-linecap="round"/>${SC.t(-14, 4, '11632', { a: 'end', fs: 9, m: 1 })}${lamps(50, 0, !d2, LIVE)}</g>
    <g transform="translate(330,250)"><rect x="-13" y="-13" width="26" height="26" fill="${cb ? '#e9ebe0' : LIVE}" stroke="${cb ? DEAD : LIVE}" stroke-width="3"/>${SC.t(-20, 4, '1163', { a: 'end', fs: 9.5, m: 1, b: 1 })}${lamps(50, 0, !cb, LIVE)}</g>
    <g transform="translate(330,324)"><line x1="0" y1="-12" x2="${d4 ? 9 : 0}" y2="${d4 ? -4 : 12}" stroke="${d4 ? DEAD : LIVE}" stroke-width="3" stroke-linecap="round"/>${SC.t(-14, 4, '11634', { a: 'end', fs: 9, m: 1 })}${lamps(50, 0, !d4, LIVE)}</g>
    <g transform="translate(330,400)"><line x1="0" y1="0" x2="-28" y2="0" stroke="${es ? GND : '#7a8478'}" stroke-width="2.4"/><line x1="-28" y1="0" x2="${es ? -44 : -38}" y2="${es ? 0 : -12}" stroke="${es ? GND : DEAD}" stroke-width="3" stroke-linecap="round"/><line x1="-46" y1="-7" x2="-46" y2="7" stroke="${es ? GND : DEAD}" stroke-width="2.6"/><line x1="-50" y1="-4" x2="-50" y2="4" stroke="${es ? GND : DEAD}" stroke-width="2.2"/>${SC.t(-56, 20, '116340', { fs: 9.5, m: 1, b: 1, c: es ? '#a8821b' : '#3c4a40' })}${lamps(50, 0, es, GND)}${SC.t(50, 22, '合', { fs: 8 })}${SC.t(72, 22, '分', { fs: 8 })}</g>
    <polygon points="322,470 338,470 330,482" fill="${live ? LIVE : DEAD}"/>${SC.t(330, 494, '培训三线', { fs: 9 })}
    ${SC.t(470, 150, '位置指示', { fs: 9, c: '#7a8478' })}${SC.t(470, 164, '红=合 绿=分', { fs: 7.5, c: '#98a69c' })}
    <!-- 高压带电显示装置：本关要看的 -->
    <g transform="translate(560,200)"><rect x="0" y="0" width="180" height="110" rx="5" fill="#eef0e6" stroke="#b9bfae"/>${SC.t(90, 20, '高压带电显示装置 · 线路侧', { fs: 10, b: 1 })}${['A', 'B', 'C'].map((p, i) => `${SC.lamp(36 + i * 54, 58, live, '#e23b2e', 12)}${SC.t(36 + i * 54, 92, p + ' 相', { fs: 9 })}`).join('')}</g>
    ${SC.hs('esInd', 254, 374, 180, 56)}${SC.hs('cbInd', 254, 226, 200, 48)}${SC.hs('hv', 560, 200, 180, 110)}`;
}
function zoomEsInd(st) {
  const es = st.es === 'close';
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#e9ebe0"/>${SC.t(210, 30, '就地控制柜 · 116340 地刀位置指示', { fs: 12, b: 1 })}
    <g transform="translate(150,110)"><line x1="0" y1="0" x2="-40" y2="0" stroke="${es ? '#e8b22a' : '#7a8478'}" stroke-width="4"/><line x1="-40" y1="0" x2="${es ? -70 : -60}" y2="${es ? 0 : -22}" stroke="${es ? '#e8b22a' : '#23b26a'}" stroke-width="5" stroke-linecap="round"/><line x1="-74" y1="-14" x2="-74" y2="14" stroke="${es ? '#e8b22a' : '#23b26a'}" stroke-width="4"/><line x1="-82" y1="-8" x2="-82" y2="8" stroke="${es ? '#e8b22a' : '#23b26a'}" stroke-width="3"/></g>
    ${SC.lamp(250, 110, es, '#e8b22a', 18)}${SC.t(250, 148, '合', { fs: 12 })}${SC.lamp(320, 110, !es, '#23b26a', 18)}${SC.t(320, 148, '分', { fs: 12 })}
    ${SC.t(210, 200, es ? '电气位置指示：合闸' : '电气位置指示：分闸', { fs: 11, c: es ? '#a8821b' : '#0e8f5a', m: 1 })}</svg>`;
}
function zoomHv(st) {
  const live = st.d4 !== 'open';
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#e9ebe0"/><rect x="60" y="40" width="300" height="140" rx="8" fill="#eef0e6" stroke="#b9bfae" stroke-width="2"/>${SC.t(210, 66, '高压带电显示装置 · 线路侧', { fs: 12, b: 1 })}${['A', 'B', 'C'].map((p, i) => `${SC.lamp(120 + i * 90, 116, live, '#e23b2e', 20)}${SC.t(120 + i * 90, 156, p + ' 相', { fs: 11 })}`).join('')}${SC.t(210, 206, live ? '三相指示灯亮 · 有电压' : '三相指示灯灭', { fs: 11, c: live ? '#b3372c' : '#5c6b5f', m: 1 })}</svg>`;
}

/* ---------- 1163：地刀操作面板（合 / 分闸按钮 · 一次模拟 · 当前位置） ---------- */
function svgGroundPanel(st) {
  const es = st.es === 'close';
  return `${SC.frame('110kV 培训三线 1163 间隔 · 116340 地刀操作面板', '就地控制柜 侧门')}
    <rect x="240" y="50" width="480" height="470" rx="8" fill="#cfd3c9" stroke="#8f978c" stroke-width="3"/><rect x="256" y="66" width="448" height="438" rx="6" fill="#dde0d5" stroke="#b9bfae"/>
    ${SC.plate(330, 84, 300, 26, '116340 培训三线线路侧地刀 操作', 12)}
    <!-- 合闸 / 分闸按钮：本关要做的 -->
    <g transform="translate(400,200)"><rect x="-90" y="-24" width="180" height="18" rx="2" fill="#fbe98a" stroke="#a8821b"/>${SC.t(0, -11, '15HA 116340 地刀 合闸按钮', { fs: 8.5, c: '#5c4a10' })}${SC.opBtn('gnd:close', 0, 30, '#23b26a')}${SC.t(0, 60, '按住执行', { fs: 8, c: '#7a8478' })}</g>
    <g transform="translate(400,320)"><rect x="-90" y="-24" width="180" height="18" rx="2" fill="#fbe98a" stroke="#a8821b"/>${SC.t(0, -11, '15FA 116340 地刀 分闸按钮', { fs: 8.5, c: '#5c4a10' })}${SC.opBtn('gnd:open', 0, 30, '#e23b2e')}</g>
    <!-- 一次模拟 -->
    <g transform="translate(620,120)"><line x1="0" y1="0" x2="0" y2="300" stroke="#c8372d" stroke-width="4"/><line x1="0" y1="200" x2="-28" y2="200" stroke="${es ? '#e8b22a' : '#c8372d'}" stroke-width="3"/><line x1="-28" y1="200" x2="${es ? -48 : -44}" y2="${es ? 200 : 182}" stroke="${es ? '#e8b22a' : '#c8372d'}" stroke-width="4" stroke-linecap="round"/><line x1="-52" y1="190" x2="-52" y2="210" stroke="${es ? '#e8b22a' : '#c8372d'}" stroke-width="3"/><line x1="-58" y1="195" x2="-58" y2="205" stroke="${es ? '#e8b22a' : '#c8372d'}" stroke-width="3"/>${SC.t(-30, 236, '116340', { fs: 9, m: 1, c: '#8a2a20' })}${SC.t(0, 320, '线路侧', { fs: 9, c: '#8a2a20' })}</g>
    <rect x="256" y="420" width="448" height="70" rx="4" fill="#eef0e6" stroke="#b9bfae"/>${SC.t(480, 444, `116340 地刀当前位置：${es ? '合闸' : '分闸'}`, { fs: 11, b: 1, c: es ? '#a8821b' : '#0e8f5a' })}${SC.t(480, 466, st.moving ? '地刀正在合闸 · 电机运行中' : '操作前：确认后台二次电压与高压带电显示装置均已确无电压', { fs: 8.5, c: '#7a8478' })}`;
}

/* ---------- 1163：现场全景（就地控制柜 · 地刀机构箱 · 连杆 三个检查点） ---------- */
function svgBayPanorama(st, o) {
  o = o || {};
  const es = st.es === 'close';
  const mechClosed = st.esCase === 'mech' ? false : es;               // 情况二：控制柜合、机构箱分
  const rodOk = st.esCase === 'rod' ? false : true;                     // 情况三：机构箱合、连杆未到位
  return `<defs><linearGradient id="gisg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e9e2"/><stop offset=".5" stop-color="#bfc6bd"/><stop offset="1" stop-color="#8f978c"/></linearGradient><linearGradient id="gisv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f978c"/><stop offset=".5" stop-color="#e6e9e2"/><stop offset="1" stop-color="#8f978c"/></linearGradient></defs>
    <rect width="960" height="540" fill="#eef0ea"/><rect x="0" y="420" width="960" height="120" fill="#d9dccf"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 60}" y="420" width="60" height="120" fill="none" stroke="#c9cdbf"/>`).join('')}
    <rect x="0" y="0" width="960" height="30" fill="#e4e7db"/>${SC.t(16, 20, '110kV GIS 室 · 培训三线 1163 间隔 · 116340 地刀', { a: 'start', fs: 12.5, b: 1 })}${SC.t(944, 20, '合闸后三处检查：就地控制柜 · 机构箱 · 连杆', { a: 'end', fs: 10, c: '#7a8478', m: 1 })}
    <!-- 出线气室（地刀所在） -->
    <rect x="560" y="180" width="70" height="140" fill="url(#gisv)" stroke="#8f978c"/>${SC.t(595, 170, '11634 出线气室', { fs: 9, c: '#7a8478' })}
    <rect x="600" y="300" width="330" height="46" rx="23" fill="url(#gisg)" stroke="#8f978c"/><circle cx="930" cy="323" r="30" fill="url(#gisg)" stroke="#8f978c"/>${SC.t(765, 372, '出线套管方向 · 培训三线 · 116340 地刀装于此段', { fs: 9, c: '#7a8478' })}
    <!-- 地刀机构箱与连杆 -->
    <g transform="translate(700,380)"><rect x="0" y="0" width="90" height="70" rx="4" fill="#d9dccf" stroke="#7a8478" stroke-width="2"/><rect x="10" y="10" width="70" height="30" rx="3" fill="#1f2d24"/><text x="45" y="32" text-anchor="middle" font-size="18" font-weight="700" font-family="monospace" fill="${mechClosed ? '#ff5a4a' : '#3ad487'}">${mechClosed ? '合' : '分'}</text>${SC.t(45, 58, '116340 机构箱', { fs: 8 })}</g>
    <g transform="translate(800,392)"><circle r="9" fill="#9aa392" stroke="#5c6b5f"/><g transform="rotate(${es ? (rodOk ? 0 : -28) : -70})"><rect x="0" y="-5" width="86" height="10" rx="4" fill="#6b746b" stroke="#3c4a40"/><circle cx="86" r="6" fill="#c9a227" stroke="#8a6f18"/></g><line x1="0" y1="14" x2="86" y2="14" stroke="#b3372c" stroke-width="1.5" stroke-dasharray="3 2"/>${SC.t(92, 18, '合', { fs: 8, a: 'start', c: '#b3372c' })}<line x1="0" y1="-14" x2="30" y2="-80" stroke="#23b26a" stroke-width="1.5" stroke-dasharray="3 2"/>${SC.t(36, -84, '分', { fs: 8, a: 'start', c: '#0e8f5a' })}${SC.t(40, 34, '地刀连杆', { fs: 8 })}</g>
    <!-- 就地控制柜（只画 116340 位置指示） -->
    <g transform="translate(160,150)"><rect x="0" y="0" width="200" height="280" rx="6" fill="#d9dccf" stroke="#8f978c" stroke-width="2.5"/><rect x="12" y="12" width="176" height="256" rx="4" fill="#e6e9e0" stroke="#b9bfae"/>${SC.plate(30, 24, 140, 18, '1163间隔就地控制柜', 8)}
      <line x1="100" y1="70" x2="100" y2="232" stroke="#7a8478" stroke-width="2"/><rect x="92" y="110" width="16" height="16" fill="#e9ebe0" stroke="#23b26a" stroke-width="2"/>${SC.t(112, 122, '1163', { a: 'start', fs: 7, m: 1 })}
      <line x1="100" y1="200" x2="82" y2="200" stroke="#e8b22a" stroke-width="2"/>${SC.lamp(126, 200, es, '#e8b22a', 7)}${SC.lamp(146, 200, !es, '#23b26a', 7)}${SC.t(70, 214, '116340', { fs: 7.5, m: 1, c: '#a8821b' })}${SC.t(126, 222, '合', { fs: 7 })}${SC.t(146, 222, '分', { fs: 7 })}</g>
    ${SC.t(260, 450, '就地控制柜', { fs: 10, b: 1 })}${SC.t(745, 470, '刀闸机构箱', { fs: 10, b: 1 })}${SC.t(850, 470, '刀闸连杆', { fs: 10, b: 1 })}
    ${SC.hs('cab', 150, 140, 220, 300)}${SC.hs('mech', 690, 370, 110, 90)}${SC.hs('rod', 795, 300, 150, 120)}`;
}
function zoomRod(st) {
  const es = st.es === 'close', rodOk = st.esCase !== 'rod';
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#eef0ea"/>${SC.t(210, 26, '116340 地刀 · 操作机构连杆位置', { fs: 12, b: 1 })}
    <g transform="translate(120,130)"><circle r="16" fill="#9aa392" stroke="#5c6b5f" stroke-width="2"/><line x1="0" y1="26" x2="200" y2="26" stroke="#b3372c" stroke-width="2" stroke-dasharray="5 3"/>${SC.t(212, 30, '合闸限位', { fs: 9, a: 'start', c: '#b3372c' })}<line x1="0" y1="-26" x2="70" y2="-140" stroke="#23b26a" stroke-width="2" stroke-dasharray="5 3"/>${SC.t(76, -136, '分闸限位', { fs: 9, a: 'start', c: '#0e8f5a' })}<g transform="rotate(${es ? (rodOk ? 0 : -28) : -70})"><rect x="0" y="-9" width="190" height="18" rx="7" fill="#6b746b" stroke="#3c4a40" stroke-width="2"/><circle cx="190" r="11" fill="#c9a227" stroke="#8a6f18" stroke-width="2"/></g></g>
    ${SC.t(210, 206, es ? (rodOk ? '连杆已转到合闸限位，销钉入槽' : '连杆停在中途，未到合闸限位') : '连杆在分闸限位', { fs: 11, c: es && !rodOk ? '#b3372c' : '#3c4a40', m: 1 })}</svg>`;
}
function zoomMechEs(st) {
  const es = st.es === 'close', mechClosed = st.esCase === 'mech' ? false : es;
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#dfe3d8"/>${SC.t(210, 26, '116340 地刀机构箱 · 分、合闸机械指示', { fs: 12, b: 1 })}<rect x="110" y="44" width="200" height="130" rx="8" fill="#b9bfae" stroke="#7a8478"/><rect x="130" y="62" width="160" height="94" rx="6" fill="#1f2d24"/><text x="210" y="130" text-anchor="middle" font-size="60" font-weight="700" fill="${mechClosed ? '#ff5a4a' : '#3ad487'}" font-family="monospace">${mechClosed ? '合' : '分'}</text>${SC.t(210, 204, mechClosed ? '机械指示：合闸' : '机械指示：分闸', { fs: 11, m: 1, c: mechClosed ? '#b3372c' : '#0e8f5a' })}</svg>`;
}

/* ---------- 雨淋阀：隔膜式雨淋报警阀组（两只压力表 · 进出水蝶阀 · 紧急启动阀盒） ---------- */
function svgValveGroup(st, o) {
  o = o || {};
  const R = '#c8372d', RD = '#8f1f16', RL = '#e8635a';
  const pg1 = st.pg1 !== 'low', pg2 = st.pg2 !== 'low', vIn = st.vIn !== 'closed', vOut = st.vOut !== 'closed';
  const pipe = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="url(#pipeg)" stroke="${RD}" stroke-width="1.2"/>`;
  const flange = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="10" rx="2" fill="${RD}"/>`;
  const wheel = (x, y, open, r) => `<g transform="translate(${x},${y}) rotate(${open ? 0 : 90})"><rect x="${-r}" y="-4" width="${r * 2}" height="8" rx="4" fill="#2b2f2c"/><circle r="6" fill="#4a4f4a"/></g>`;
  return `<defs><linearGradient id="pipeg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${RD}"/><stop offset=".35" stop-color="${RL}"/><stop offset=".7" stop-color="${R}"/><stop offset="1" stop-color="${RD}"/></linearGradient></defs>
    <rect width="960" height="540" fill="${o.fire ? '#f3e9de' : '#eef0ea'}"/><rect x="0" y="440" width="960" height="100" fill="#cfd3c9"/>${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 80}" y1="440" x2="${i * 80}" y2="540" stroke="#bfc6bd"/>`).join('')}
    <rect x="0" y="0" width="960" height="30" fill="#e4e7db"/>${SC.t(16, 20, o.title || '#3主变雨淋阀组 · 消防泵房外阀室', { a: 'start', fs: 12.5, b: 1 })}${SC.t(944, 20, '隔膜式雨淋报警阀组', { a: 'end', fs: 10, c: '#7a8478', m: 1 })}
    ${SC.plate(60, 46, 180, 26, '#3主变雨淋阀', 13)}
    <!-- 供水干管（下）与出水管（上） -->
    ${pipe(430, 400, 56, 60)}${flange(424, 396, 68)}${SC.t(458, 478, '来自消防供水管网', { fs: 8.5, c: '#7a8478' })}
    <!-- 进水蝶阀 -->
    <g transform="translate(458,350)"><rect x="-34" y="-30" width="68" height="60" rx="8" fill="#2b2f2c" stroke="#111"/><circle r="20" fill="${R}" stroke="${RD}" stroke-width="3"/>${wheel(0, 0, vIn, 26)}<rect x="-30" y="34" width="60" height="12" rx="2" fill="#fff" stroke="#7a8478"/>${SC.t(0, 43, vIn ? '开 OPEN' : '关 SHUT', { fs: 7.5, c: vIn ? '#0e8f5a' : '#b3372c', b: 1 })}${SC.t(70, 4, '进水蝶阀', { a: 'start', fs: 8.5, c: '#7a8478' })}</g>
    ${pipe(430, 262, 56, 60)}${flange(424, 318, 68)}
    <!-- 雨淋阀本体（隔膜式） -->
    <g transform="translate(458,208)"><ellipse rx="70" ry="58" fill="url(#pipeg)" stroke="${RD}" stroke-width="2"/><ellipse cx="-40" cy="-6" rx="26" ry="30" fill="${RL}" stroke="${RD}" stroke-width="1.5"/>${SC.t(-40, -2, '控制腔', { fs: 7, c: '#fff' })}<circle cx="0" cy="6" r="28" fill="${R}" stroke="${RD}" stroke-width="2"/>${SC.t(0, 4, '隔膜式', { fs: 8, c: '#fff' })}${SC.t(0, 16, '雨淋阀', { fs: 8, c: '#fff' })}</g>
    ${flange(424, 152, 68)}${pipe(430, 96, 56, 56)}
    <!-- 出水蝶阀（最上方） -->
    <g transform="translate(458,86)"><rect x="-34" y="-30" width="68" height="60" rx="8" fill="#2b2f2c" stroke="#111"/><circle r="20" fill="${R}" stroke="${RD}" stroke-width="3"/>${wheel(0, 0, vOut, 26)}<rect x="-30" y="-46" width="60" height="12" rx="2" fill="#fff" stroke="#7a8478"/>${SC.t(0, -37, vOut ? '开 OPEN' : '关 SHUT', { fs: 7.5, c: vOut ? '#0e8f5a' : '#b3372c', b: 1 })}${SC.t(70, 4, '出水蝶阀', { a: 'start', fs: 8.5, c: '#7a8478' })}</g>
    <rect x="430" y="36" width="56" height="22" rx="4" fill="url(#pipeg)"/>${SC.t(560, 50, '→ 至 #3主变水喷雾管网', { a: 'start', fs: 8.5, c: '#7a8478' })}
    <!-- 管网/供水侧压力表（下） -->
    <g transform="translate(300,380)"><line x1="0" y1="30" x2="120" y2="30" stroke="${RD}" stroke-width="5"/>${SC.gauge(0, 0, 40, pg1 ? 62 : 14, '供水侧', 'MPa', pg1)}${SC.t(0, 64, '管网/供水侧压力表', { fs: 8.5 })}</g>
    <!-- 隔膜/控制腔压力表（上） -->
    <g transform="translate(300,180)"><line x1="40" y1="10" x2="100" y2="22" stroke="${RD}" stroke-width="4"/>${SC.gauge(0, 0, 40, pg2 ? 58 : 10, '控制腔', 'MPa', pg2)}${SC.t(0, 64, '隔膜/控制腔压力表', { fs: 8.5 })}</g>
    <!-- 紧急启动阀盒 -->
    <g transform="translate(640,250)"><line x1="-110" y1="0" x2="-40" y2="0" stroke="${RD}" stroke-width="4"/><rect x="-40" y="-36" width="80" height="72" rx="6" fill="#cfd3c9" stroke="#5c6b5f" stroke-width="2"/><rect x="-32" y="-28" width="64" height="56" rx="4" fill="#e6e9e0" stroke="#9aa392"/>${st.boxOpen ? `<rect x="-32" y="-28" width="64" height="56" rx="4" fill="#3a3f3a"/><g transform="translate(0,4) rotate(${st.handle != null ? -st.handle * .9 : 0})"><rect x="-4" y="-30" width="8" height="34" rx="3" fill="#e8b22a" stroke="#8a6f18"/></g><circle r="7" fill="#7a8478"/>` : `<rect x="-6" y="-8" width="12" height="16" rx="2" fill="#5c6b5f"/>${SC.t(0, 22, '紧急启动', { fs: 7, c: '#5c6b5f' })}`}<rect x="-38" y="-52" width="76" height="14" rx="2" fill="#fbe98a" stroke="#a8821b"/>${SC.t(0, -42, '手动应急启动', { fs: 7, c: '#5c4a10' })}${SC.t(0, 56, '紧急启动阀盒', { fs: 8.5, c: '#7a8478' })}</g>
    ${o.fire ? `<g transform="translate(840,80)"><circle r="26" fill="#e23b2e"><animate attributeName="opacity" values="1;.3;1" dur=".8s" repeatCount="indefinite"/></circle>${SC.t(0, 4, '火警', { fs: 12, c: '#fff', b: 1 })}${SC.t(0, 44, '#3主变防护区 火灾', { fs: 9, c: '#b3372c', b: 1 })}${SC.t(0, 58, '消防报警主机 故障', { fs: 9, c: '#b3372c' })}</g>` : ''}
    ${SC.hs('pg1', 252, 332, 100, 100)}${SC.hs('pg2', 252, 132, 100, 100)}${SC.hs('vOut', 418, 32, 82, 90)}${SC.hs('vIn', 418, 314, 82, 84)}${SC.hs('box', 594, 194, 96, 116)}`;
}
function zoomGauge(st, k) {
  const ok = st[k] !== 'low';
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#eef0ea"/>${SC.gauge(210, 112, 86, ok ? (k === 'pg1' ? 62 : 58) : (k === 'pg1' ? 14 : 10), k === 'pg1' ? '供水侧' : '控制腔', 'MPa', ok)}${SC.t(210, 212, k === 'pg1' ? '管网/供水侧压力表' : '隔膜/控制腔压力表', { fs: 11 })}</svg>`;
}
function zoomValve(st, k) {
  const open = st[k] !== 'closed';
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#eef0ea"/><rect x="180" y="20" width="60" height="180" rx="30" fill="#c8372d"/><g transform="translate(210,110)"><rect x="-50" y="-44" width="100" height="88" rx="10" fill="#2b2f2c"/><circle r="30" fill="#c8372d" stroke="#8f1f16" stroke-width="4"/><g transform="rotate(${open ? 0 : 90})"><rect x="-40" y="-6" width="80" height="12" rx="6" fill="#2b2f2c"/><circle r="8" fill="#4a4f4a"/></g></g><rect x="290" y="80" width="100" height="60" rx="6" fill="#fff" stroke="#7a8478"/>${SC.t(340, 104, '阀位指示', { fs: 9, c: '#7a8478' })}${SC.t(340, 126, open ? '开 OPEN' : '关 SHUT', { fs: 14, b: 1, c: open ? '#0e8f5a' : '#b3372c' })}${SC.t(100, 110, '手柄与管道平行 = 开', { fs: 9, c: '#7a8478' })}${SC.t(100, 124, '手柄与管道垂直 = 关', { fs: 9, c: '#7a8478' })}${SC.t(210, 212, k === 'vOut' ? '最上方出水蝶阀' : '进水蝶阀', { fs: 11 })}</svg>`;
}

/* 紧急启动阀盒：关闭时按住盒盖打开 */
function zoomBox(st) {
  return `<svg viewBox="0 0 420 240" class="zsvg"><rect width="420" height="240" fill="#eef0ea"/><line x1="40" y1="120" x2="120" y2="120" stroke="#8f1f16" stroke-width="8"/>
    <rect x="120" y="50" width="180" height="150" rx="10" fill="#cfd3c9" stroke="#5c6b5f" stroke-width="3"/>
    ${st.boxOpen ? `<rect x="134" y="64" width="152" height="122" rx="6" fill="#3a3f3a"/><g transform="translate(210,130)"><circle r="26" fill="#c8372d" stroke="#8f1f16" stroke-width="3"/><rect x="-6" y="-70" width="12" height="70" rx="5" fill="#e8b22a" stroke="#8a6f18" stroke-width="2"/></g>${SC.t(210, 222, '盒盖已打开 · 可见手动阀手柄', { fs: 10, c: '#0e8f5a' })}` : `<g class="op" data-op="box:open" style="cursor:pointer"><rect x="134" y="64" width="152" height="122" rx="6" fill="#e6e9e0" stroke="#9aa392"/><rect x="200" y="112" width="20" height="26" rx="3" fill="#5c6b5f"/><rect x="150" y="76" width="120" height="16" rx="2" fill="#fbe98a" stroke="#a8821b"/>${SC.t(210, 87, '手动应急启动', { fs: 8, c: '#5c4a10' })}${SC.t(210, 162, '按住盒盖打开', { fs: 9, c: '#5c6b5f' })}</g>${SC.t(210, 222, '紧急启动阀盒 · 盒盖关闭', { fs: 10, c: '#5c6b5f' })}`}
    <rect x="310" y="90" width="70" height="60" rx="4" fill="#dfe3d8" stroke="#b9bfae"/>${SC.t(345, 124, '铰链', { fs: 8, c: '#7a8478' })}</svg>`;
}
/* 阀组编号牌（走到某套阀组前看到的） */
function zoomPlate(st, n) {
  return `<svg viewBox="0 0 420 220" class="zsvg"><rect width="420" height="220" fill="#f3e9de"/><rect x="180" y="40" width="60" height="150" rx="30" fill="#c8372d"/><ellipse cx="210" cy="130" rx="46" ry="34" fill="#e8635a" stroke="#8f1f16"/>
    ${SC.plate(100, 56, 220, 40, `#${n}主变雨淋阀`, 18)}${n === 3 ? `<circle cx="360" cy="70" r="14" fill="#e23b2e"><animate attributeName="opacity" values="1;.3;1" dur=".8s" repeatCount="indefinite"/></circle>` : ''}
    ${SC.t(210, 208, '读一下编号牌，告诉我这是几号', { fs: 10, c: '#7a8478' })}</svg>`;
}

/* ---------- 雨淋阀：主变雨淋阀区域全景（#1–#4 四套阀组） ---------- */
function svgRainPanorama(st) {
  const one = (x, n, fire) => `<g transform="translate(${x},0)"><rect x="-70" y="120" width="140" height="300" rx="6" fill="#e6e9e0" stroke="#b9bfae"/><rect x="-16" y="150" width="32" height="250" rx="16" fill="url(#pipeg)" stroke="#8f1f16"/><ellipse cy="270" rx="40" ry="32" fill="url(#pipeg)" stroke="#8f1f16" stroke-width="1.5"/><circle cx="-40" cy="230" r="14" fill="#fbfbf6" stroke="#5c6b5f" stroke-width="2"/><circle cx="-40" cy="330" r="14" fill="#fbfbf6" stroke="#5c6b5f" stroke-width="2"/><rect x="24" y="250" width="30" height="30" rx="4" fill="#cfd3c9" stroke="#5c6b5f"/><g transform="translate(0,178)"><rect x="-20" y="-16" width="40" height="32" rx="6" fill="#2b2f2c"/><rect x="-14" y="-3" width="28" height="6" rx="3" fill="#6b746b"/></g><g transform="translate(0,372)"><rect x="-20" y="-16" width="40" height="32" rx="6" fill="#2b2f2c"/><rect x="-14" y="-3" width="28" height="6" rx="3" fill="#6b746b"/></g>${SC.plate(-56, 86, 112, 24, `#${n}主变雨淋阀`, 11)}${fire ? `<g transform="translate(60,100)"><circle r="14" fill="#e23b2e"><animate attributeName="opacity" values="1;.3;1" dur=".8s" repeatCount="indefinite"/></circle></g>` : ''}</g>`;
  return `<defs><linearGradient id="pipeg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f1f16"/><stop offset=".35" stop-color="#e8635a"/><stop offset=".7" stop-color="#c8372d"/><stop offset="1" stop-color="#8f1f16"/></linearGradient></defs>
    <rect width="960" height="540" fill="#f3e9de"/><rect x="0" y="420" width="960" height="120" fill="#cfd3c9"/>${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 80}" y1="420" x2="${i * 80}" y2="540" stroke="#bfc6bd"/>`).join('')}
    <rect x="0" y="0" width="960" height="30" fill="#e4e7db"/>${SC.t(16, 20, '主变雨淋阀区域 · 阀室', { a: 'start', fs: 12.5, b: 1 })}${SC.t(944, 20, '#1 · #2 · #3 · #4 主变雨淋阀组', { a: 'end', fs: 10, c: '#7a8478', m: 1 })}
    <rect x="20" y="40" width="920" height="26" rx="4" fill="#fbe9e7" stroke="#eac1bb"/>${SC.t(480, 58, '#3主变防护区 火灾 · 消防报警主机故障，无法远程启动 · 请到现场机械手动启动', { fs: 10.5, c: '#b3372c', b: 1 })}
    <line x1="60" y1="130" x2="900" y2="130" stroke="#8f1f16" stroke-width="10"/>${SC.t(480, 122, '消防供水环管', { fs: 9, c: '#7a8478' })}
    ${one(150, 1)}${one(370, 2)}${one(590, 3, true)}${one(810, 4)}
    ${SC.hs('v1', 78, 82, 144, 340)}${SC.hs('v2', 298, 82, 144, 340)}${SC.hs('v3', 518, 82, 144, 340)}${SC.hs('v4', 738, 82, 144, 340)}`;
}

/* ---------- 雨淋阀：紧急启动阀盒打开 · 拖动手柄至全开 ---------- */
function svgBoxOpen(st) {
  const h = st.handle || 0;                        // 0–100
  const ang = -90 * h / 100;
  return `${SC.frame('#3主变雨淋阀 · 紧急启动阀盒（已打开）', '拖动手柄：关闭 → 中间 → 全开')}
    <rect x="240" y="60" width="480" height="440" rx="10" fill="#cfd3c9" stroke="#5c6b5f" stroke-width="3"/>
    <rect x="256" y="76" width="448" height="408" rx="6" fill="#3a3f3a"/>
    <rect x="600" y="76" width="104" height="408" rx="6" fill="#e6e9e0" stroke="#9aa392"/>${SC.t(652, 280, '盒盖', { fs: 10, c: '#7a8478' })}
    <rect x="300" y="100" width="280" height="14" rx="2" fill="#fbe98a" stroke="#a8821b"/>${SC.t(440, 110, '#3主变雨淋阀 紧急启动手动阀 · 顺时针至全开', { fs: 8, c: '#5c4a10' })}
    <line x1="440" y1="440" x2="440" y2="300" stroke="#c8372d" stroke-width="16"/><line x1="440" y1="300" x2="440" y2="180" stroke="#c8372d" stroke-width="16" opacity=".6"/>
    <g transform="translate(440,300)"><circle r="46" fill="#8f1f16"/><circle r="38" fill="#c8372d" stroke="#e8635a" stroke-width="2"/>
      <path d="M 0 -60 A 60 60 0 0 1 60 0" fill="none" stroke="#e8b22a" stroke-width="3" stroke-dasharray="4 4"/>${SC.t(0, -70, '关闭', { fs: 9, c: '#e6e9e0' })}${SC.t(76, 4, '全开', { fs: 9, c: '#e6e9e0' })}${SC.t(52, -46, '中间', { fs: 8, c: '#9aa392' })}
      <g class="exhandle" data-handle="1" transform="rotate(${ang})"><rect x="-9" y="-150" width="18" height="150" rx="9" fill="#e8b22a" stroke="#8a6f18" stroke-width="2"/><circle cy="-140" r="14" fill="#f4d35e" stroke="#8a6f18" stroke-width="2"/></g><circle r="10" fill="#2b2f2c"/></g>
    <rect x="300" y="452" width="280" height="22" rx="4" fill="#1f2d24"/><rect id="exbar_fill" x="304" y="456" width="${272 * h / 100}" height="14" rx="3" fill="${h >= 90 ? '#23b26a' : '#e8b22a'}"/><text id="exbar_txt" x="440" y="467" text-anchor="middle" font-size="9" fill="#fff" font-family="monospace">${h >= 90 ? '全开位置' : h > 8 ? `开度 ${Math.round(h)}%` : '关闭位置'}</text>
    ${SC.t(480, 520, '按住手柄向右下方拖动，只有到达全开区域才判定成功', { fs: 9, c: '#7a8478' })}`;
}

/* ---------- 雨淋阀：#3主变本体与水喷雾（按 #1主变实拍与喷淋视频重绘） ---------- */
function svgTransformerSpray(st) {
  const on = !!st.spray;
  const jets = [];
  for (let k = 0; k < 14; k++) { const x = 150 + k * 48; jets.push(`<g transform="translate(${x},178)"><circle r="3" fill="#8f1f16"/>${on ? `<path d="M 0 0 q -22 40 -48 110 M 0 0 q 0 50 0 120 M 0 0 q 22 40 48 110" fill="none" stroke="#bfe3ef" stroke-width="3" stroke-linecap="round" opacity=".85"><animate attributeName="stroke-dasharray" values="0 160;120 40;0 160" dur="1.4s" repeatCount="indefinite"/></path><ellipse cy="118" rx="52" ry="12" fill="#cfe9f1" opacity=".55"><animate attributeName="rx" values="44;60;44" dur="1.6s" repeatCount="indefinite"/></ellipse>` : ''}</g>`); }
  return `<rect width="960" height="540" fill="${on ? '#e7eef0' : '#f3e9de'}"/><rect x="0" y="420" width="960" height="120" fill="#cfd3c9"/>
    <rect x="0" y="0" width="960" height="30" fill="#e4e7db"/>${SC.t(16, 20, '#3主变 本体 · 水喷雾系统', { a: 'start', fs: 12.5, b: 1 })}${SC.t(944, 20, on ? '雨淋阀已启动' : '雨淋阀启动中', { a: 'end', fs: 10, c: on ? '#0e8f5a' : '#a8821b', m: 1 })}
    <!-- 防火墙 -->
    <rect x="40" y="60" width="880" height="360" fill="#c9cdc3"/><rect x="60" y="80" width="840" height="320" fill="#dfe3d8"/>
    <!-- 散热器与本体 -->
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${170 + i * 78}" y="220" width="60" height="190" rx="3" fill="#a9b0a6" stroke="#7a8478"/>${Array.from({ length: 9 }, (_, j) => `<line x1="${176 + i * 78 + j * 6}" y1="226" x2="${176 + i * 78 + j * 6}" y2="404" stroke="#8f978c"/>`).join('')}<rect x="${178 + i * 78}" y="384" width="44" height="12" fill="#fff" stroke="#7a8478"/>${SC.t(200 + i * 78, 393, `散热器0${i + 1}`, { fs: 6.5 })}`).join('')}
    <rect x="300" y="240" width="360" height="170" rx="6" fill="#b3bab0" stroke="#7a8478" stroke-width="2"/><rect x="330" y="200" width="300" height="46" rx="4" fill="#a9b0a6" stroke="#7a8478"/>
    ${[380, 480, 580].map(x => `<rect x="${x - 12}" y="120" width="24" height="86" rx="4" fill="#cfd3c9" stroke="#7a8478"/>${[0, 1, 2, 3, 4].map(j => `<ellipse cx="${x}" cy="${130 + j * 16}" rx="16" ry="5" fill="#b3bab0" stroke="#7a8478"/>`).join('')}<circle cx="${x}" cy="108" r="6" fill="#7a8478"/>`).join('')}
    ${SC.plate(560, 250, 120, 24, '#3主变压器', 11)}
    <!-- 红色喷淋管网与喷头 -->
    <rect x="130" y="172" width="700" height="10" rx="5" fill="#c8372d" stroke="#8f1f16"/>${[130, 830].map(x => `<rect x="${x - 5}" y="172" width="10" height="240" fill="#c8372d" stroke="#8f1f16"/>`).join('')}
    ${[150, 470, 790].map(x => `<rect x="${x - 5}" y="260" width="10" height="150" fill="#c8372d" stroke="#8f1f16"/><rect x="${x - 40}" y="300" width="80" height="8" rx="4" fill="#c8372d"/>`).join('')}
    ${jets.join('')}
    ${on ? `<rect x="60" y="300" width="840" height="100" fill="#cfe9f1" opacity=".35"><animate attributeName="opacity" values=".25;.45;.25" dur="2s" repeatCount="indefinite"/></rect>` : ''}
    ${SC.hs('spray', 120, 150, 720, 260)}${SC.hs('body', 296, 236, 368, 178)}`;
}
