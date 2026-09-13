/* ---------------- 一次接线图（110kV仿真站 · 培训三线1163间隔分图） ----------------
   sld(o)：o.dev 设备状态表（默认 S.dev；五防模拟传 S.wfdev）、o.sim 五防模拟样式、o.target 目标设备、o.chg 刚变位的设备、o.scada 显示光字牌与遥测 */
function sld(o) {
  o = o || {};
  const d = o.dev || S.dev;
  const cbOpen = d.CB1163 === 'open', d4 = d.DS11634 === 'open', d2 = d.DS11632 === 'open', es = d.ES116340 === 'close';
  const LIVE = '#e23b2e', DEAD = '#23b26a', GND = '#e8b22a', BUS = '#e23b2e';
  const segA = d2 ? DEAD : LIVE;                       // 11632 → 1163
  const segB = (d2 || cbOpen) ? DEAD : LIVE;           // 1163 → 11634
  const segC = (d2 || cbOpen || d4) ? DEAD : LIVE;     // 11634 → 线路
  const tgt = o.target !== undefined ? o.target : S.dev._t;
  const T = id => (tgt === id ? 'tgt ' : '') + (o.chg === id ? 'chg ' : '') + (o.sim && o.done && o.done.includes(id) ? 'simdone ' : '');

  const stubUp = (x, name, no) => `
    <line x1="${x}" y1="54" x2="${x}" y2="30" stroke="${LIVE}" stroke-width="2"/>
    <rect x="${x - 7}" y="16" width="14" height="14" fill="${LIVE}"/>
    <text x="${x}" y="8" class="devlbl" text-anchor="middle">${no}</text>
    <text x="${x}" y="-4" class="devlbl" text-anchor="middle" style="fill:#98a69c">${name}</text>`;
  const stubDn = (x, name, no) => `
    <line x1="${x}" y1="100" x2="${x}" y2="124" stroke="${LIVE}" stroke-width="2"/>
    <rect x="${x - 7}" y="124" width="14" height="14" fill="${LIVE}"/>
    <text x="${x}" y="152" class="devlbl" text-anchor="middle">${no}</text>
    <text x="${x}" y="164" class="devlbl" text-anchor="middle" style="fill:#98a69c">${name}</text>`;
  const dsSym = (open, color) => `
    <line x1="0" y1="-22" x2="0" y2="-13" stroke="${color}" stroke-width="2.6"/>
    <line x1="-8" y1="-13" x2="8" y2="-13" stroke="${color}" stroke-width="3"/>
    <line x1="-8" y1="13" x2="8" y2="13" stroke="${color}" stroke-width="3"/>
    <line x1="0" y1="13" x2="0" y2="22" stroke="${color}" stroke-width="2.6"/>
    <line class="blade" x1="0" y1="13" x2="0" y2="-13" stroke="${color}" stroke-width="3.4" stroke-linecap="round" transform="rotate(${open ? -38 : 0} 0 13)"/>`;

  const esSym = close => `
    <line x1="0" y1="0" x2="10" y2="0" stroke="${close ? GND : DEAD}" stroke-width="2.6"/>
    <line x1="10" y1="-9" x2="10" y2="9" stroke="${close ? GND : DEAD}" stroke-width="3"/>
    <line class="blade" x1="10" y1="0" x2="30" y2="0" stroke="${close ? GND : DEAD}" stroke-width="3.4" stroke-linecap="round" transform="rotate(${close ? 0 : -38} 10 0)"/>
    <line x1="30" y1="-10" x2="30" y2="10" stroke="${close ? GND : DEAD}" stroke-width="2.8"/>
    <line x1="34" y1="-6" x2="34" y2="6" stroke="${close ? GND : DEAD}" stroke-width="2.4"/>
    <line x1="38" y1="-2.8" x2="38" y2="2.8" stroke="${close ? GND : DEAD}" stroke-width="2.2"/>`;

  const dev = (id, x, y, w, h, sym, no, name, ali) => `
    <g class="dev ${T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      <rect class="hit" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4"/>
      ${sym}
      <text class="devlbl" x="${ali === 'l' ? -w / 2 - 6 : w / 2 + 6}" y="-1" ${ali === 'l' ? 'text-anchor="end"' : ''}>${no}</text>
      <text class="devnm" x="${ali === 'l' ? -w / 2 - 6 : w / 2 + 6}" y="12" ${ali === 'l' ? 'text-anchor="end"' : ''}>${name}</text>
      ${o.sim && o.done && o.done.includes(id) ? `<circle cx="${w / 2 + 2}" cy="${-h / 2 + 2}" r="7" fill="#0e8f5a"/><path d="M ${w / 2 - 1.5} ${-h / 2 + 2} l 2.4 2.6 4 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` : ''}
    </g>`;

  const cur = cbOpen ? ['0.0', '0.0', '0.0'] : ['312', '308', '315'];
  const X = 404;
  const soe = (S.msgs || []).slice(0, 3);

  const right = o.scada !== false ? `
    <!-- 光字牌与遥测（监控后台） -->
    <g class="dev ${T('hmi_mode')}" data-dev="hmi_mode" transform="translate(560,44)">
      <rect class="hit" x="-10" y="-30" width="196" height="76" rx="5"/>
      <text x="0" y="-14" class="devlbl">光字牌 · 运行方式</text>
      ${[['110kV 1M·2M 并列运行', true], ['培训三线1163 ' + (cbOpen ? '开关分闸' : '开关合闸'), cbOpen], ['无未复归告警', false]].map(([t, on], i) =>
    `<rect x="0" y="${-4 + i * 17}" width="176" height="14" rx="2" fill="${on ? '#fbe9e7' : '#eef2e6'}" stroke="${on ? '#e0a89f' : '#d7dccb'}"/><circle cx="8" cy="${3 + i * 17}" r="3" fill="${on ? '#e23b2e' : '#b9c3b2'}"/><text x="16" y="${7 + i * 17}" style="font-family:monospace;font-size:10px;fill:${on ? '#b3372c' : '#5c6b5f'}">${t}</text>`).join('')}
    </g>
    <g class="dev ${T('hmi_current')}" data-dev="hmi_current" transform="translate(560,150)">
      <rect class="hit" x="-10" y="-30" width="196" height="98" rx="5"/>
      <text x="0" y="-14" class="devlbl">遥测 · 1163开关 三相电流 (A)</text>
      <text x="0" y="8" style="font-family:monospace;font-size:17px;fill:${cbOpen ? '#98a69c' : '#0e8f5a'}">Ia ${cur[0]}</text>
      <text x="0" y="32" style="font-family:monospace;font-size:17px;fill:${cbOpen ? '#98a69c' : '#0e8f5a'}">Ib ${cur[1]}</text>
      <text x="0" y="56" style="font-family:monospace;font-size:17px;fill:${cbOpen ? '#98a69c' : '#0e8f5a'}">Ic ${cur[2]}</text>
      <text x="100" y="8" style="font-family:monospace;font-size:11px;fill:#98a69c">P ${cbOpen ? '0.0' : '58.6'} MW</text>
      <text x="100" y="32" style="font-family:monospace;font-size:11px;fill:#98a69c">Q ${cbOpen ? '0.0' : '11.2'} Mvar</text>
    </g>
    <g class="dev ${T('hmi_volt')}" data-dev="hmi_volt" transform="translate(560,262)">
      <rect class="hit" x="-10" y="-26" width="196" height="54" rx="5"/>
      <text x="0" y="-10" class="devlbl">遥测 · 培训三线 线路二次电压 (V)</text>
      <text x="0" y="14" style="font-family:monospace;font-size:16px;fill:${d4 ? '#98a69c' : '#0e8f5a'}">Uab ${d4 ? '0.0' : '99.6'}</text>
      <text x="112" y="14" style="font-family:monospace;font-size:16px;fill:${d4 ? '#98a69c' : '#0e8f5a'}">Uo ${d4 ? '0.0' : '0.1'}</text>
    </g>
    <g transform="translate(560,330)">
      <text x="0" y="0" class="devlbl" style="fill:#98a69c">图例</text>
      <line x1="0" y1="16" x2="18" y2="16" stroke="${LIVE}" stroke-width="3"/><text x="24" y="20" class="devlbl">带电</text>
      <line x1="66" y1="16" x2="84" y2="16" stroke="${DEAD}" stroke-width="3"/><text x="90" y="20" class="devlbl">停电</text>
      <line x1="132" y1="16" x2="150" y2="16" stroke="${GND}" stroke-width="3"/><text x="156" y="20" class="devlbl">接地</text>
    </g>` : `
    <g transform="translate(560,44)">
      <rect x="-10" y="-30" width="196" height="150" rx="5" fill="#f7f8f1" stroke="#dcd9c8"/>
      <text x="0" y="-14" class="devlbl">五防主机 · 模拟操作票</text>
      ${(WUFANG || []).map((w, i) => { const done = o.done && o.done.includes(w[0]); const curi = o.done && o.done.length === i; return `<circle cx="6" cy="${4 + i * 24}" r="6" fill="${done ? '#0e8f5a' : curi ? '#c9a227' : '#dcd9c8'}"/><text x="6" y="${7.5 + i * 24}" text-anchor="middle" style="font-size:9px;fill:#fff;font-family:monospace">${done ? '√' : i + 1}</text><text x="18" y="${8 + i * 24}" style="font-size:10.5px;fill:${done ? '#0a6b44' : curi ? '#1f2d24' : '#98a69c'}">${w[1]}</text>`; }).join('')}
      <text x="0" y="112" style="font-size:10px;fill:#98a69c;font-family:monospace">电脑钥匙 · 在线 · 未传票</text>
    </g>
    <g transform="translate(560,210)">
      <rect x="-10" y="-14" width="196" height="56" rx="5" fill="#fbf7e6" stroke="#e3d49e"/>
      <text x="0" y="2" style="font-size:10.5px;fill:#a8821b">模拟预演：在接线图上按操作票顺序</text>
      <text x="0" y="18" style="font-size:10.5px;fill:#a8821b">点击设备，五防主机逐项记录；</text>
      <text x="0" y="34" style="font-size:10.5px;fill:#a8821b">顺序错误会被防误逻辑闭锁。</text>
    </g>`;

  return `<svg viewBox="0 -38 764 412" class="${o.sim ? 'sim' : ''}">
    ${o.sim ? `<text x="20" y="-22" style="font-size:11px;fill:#a8821b;font-family:monospace;letter-spacing:2px">五防模拟接线图 · 模拟态</text>` : `<text x="20" y="-22" style="font-size:11px;fill:#0a6b44;font-family:monospace;letter-spacing:2px">110kV仿真站 · 培训三线1163开关间隔分图</text>`}
    <!-- 母线 -->
    <line x1="20" y1="54" x2="470" y2="54" stroke="${BUS}" stroke-width="5"/>
    <text x="476" y="58" class="devlbl" style="fill:#c25549">110kV 1M</text>
    <line x1="20" y1="100" x2="470" y2="100" stroke="${BUS}" stroke-width="5"/>
    <text x="476" y="104" class="devlbl" style="fill:#c25549">110kV 2M</text>
    <line x1="20" y1="54" x2="20" y2="100" stroke="${BUS}" stroke-width="2.4"/><rect x="13" y="70" width="14" height="14" fill="${BUS}"/><text x="30" y="81" class="devlbl">1012 分段</text>
    ${stubUp(70, '鲘元Ⅰ线', '1891')}${stubUp(160, '#1主变变高', '1101')}${stubUp(250, '110kV 1M PT', '111PT')}${stubUp(340, '备用间隔(1)', '')}
    ${stubDn(70, '鲘元Ⅱ线', '1892')}${stubDn(160, '#2主变变高', '1102')}${stubDn(250, '#3主变变高', '1103')}
    ${stubDn(312, '110kV 2M PT', '112PT')}

    <!-- 培训三线1163间隔 -->
    <rect x="${X - 56}" y="112" width="282" height="262" rx="6" fill="rgba(14,143,90,.07)" stroke="#e2dfd0" stroke-dasharray="4 4"/>
    <text x="${X - 48}" y="128" class="devlbl" style="fill:#0a6b44">培训三线1163开关间隔分图</text>
    <line x1="${X}" y1="100" x2="${X}" y2="152" stroke="${d2 ? DEAD : LIVE}" stroke-width="2.6"/>
    ${dev('DS11632', X, 172, 44, 46, dsSym(d2, segA), '11632', '培训三线2M侧刀闸')}
    <line x1="${X}" y1="195" x2="${X}" y2="216" stroke="${segA}" stroke-width="2.6"/>
    ${dev('CB1163', X, 238, 44, 44,
      `<rect class="cbbox" x="-11" y="-11" width="22" height="22" fill="${cbOpen ? 'none' : segB}" stroke="${segB}" stroke-width="2.6"/>`,
      '1163', '培训三线开关')}
    <line x1="${X}" y1="260" x2="${X}" y2="280" stroke="${segB}" stroke-width="2.6"/>
    ${dev('DS11634', X, 302, 44, 46, dsSym(d4, segC), '11634', '培训三线线路侧刀闸')}
    <line x1="${X}" y1="325" x2="${X}" y2="352" stroke="${segC}" stroke-width="2.6"/>
    <path d="M ${X - 7} 352 L ${X + 7} 352 L ${X} 364 Z" fill="${segC}"/>
    <!-- 地刀支路 -->
    <line x1="${X}" y1="336" x2="${X - 12}" y2="336" stroke="${segC}" stroke-width="2"/>
    <g class="dev ${T('ES116340')}" data-dev="ES116340" transform="translate(${X - 12},336)">
      <rect class="hit" x="-52" y="-20" width="60" height="52" rx="4"/>
      <g transform="rotate(180)">${esSym(es)}</g>
      <text class="devlbl" x="-30" y="22" text-anchor="middle">116340</text>
      <text class="devnm" x="-30" y="34" text-anchor="middle">线路侧地刀</text>
      ${o.sim && o.done && o.done.includes('ES116340') ? `<circle cx="4" cy="-16" r="7" fill="#0e8f5a"/><path d="M 0.5 -16 l 2.4 2.6 4 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` : ''}
    </g>
    ${right}
  </svg>`;
}
