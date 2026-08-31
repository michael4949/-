/* ---------------- 一次接线图（110kV仿真站 · 培训三线1163间隔分图） ---------------- */
function sld() {
  const d = S.dev;
  const cbOpen = d.CB1163 === 'open', d4 = d.DS11634 === 'open', d2 = d.DS11632 === 'open', es = d.ES116340 === 'close';
  const LIVE = '#e23b2e', DEAD = '#23b26a', GND = '#e8b22a', BUS = '#e23b2e';
  const segA = d2 ? DEAD : LIVE;                       // 11632 → 1163
  const segB = (d2 || cbOpen) ? DEAD : LIVE;           // 1163 → 11634
  const segC = (d2 || cbOpen || d4) ? DEAD : LIVE;     // 11634 → 线路
  const T = id => S.dev._t === id ? 'tgt' : '';

  const stubUp = (x, name, no) => `
    <line x1="${x}" y1="54" x2="${x}" y2="30" stroke="${LIVE}" stroke-width="2"/>
    <rect x="${x - 7}" y="16" width="14" height="14" fill="${LIVE}"/>
    <text x="${x}" y="8" class="devlbl" text-anchor="middle">${no}</text>
    <text x="${x}" y="-4" class="devlbl" text-anchor="middle" style="fill:#5f7794">${name}</text>`;
  const stubDn = (x, name, no) => `
    <line x1="${x}" y1="100" x2="${x}" y2="124" stroke="${LIVE}" stroke-width="2"/>
    <rect x="${x - 7}" y="124" width="14" height="14" fill="${LIVE}"/>
    <text x="${x}" y="152" class="devlbl" text-anchor="middle">${no}</text>
    <text x="${x}" y="164" class="devlbl" text-anchor="middle" style="fill:#5f7794">${name}</text>`;
  const dsSym = (open, color) => `
    <line x1="0" y1="-22" x2="0" y2="-13" stroke="${color}" stroke-width="2.6"/>
    <line x1="-8" y1="-13" x2="8" y2="-13" stroke="${color}" stroke-width="3"/>
    <line x1="-8" y1="13" x2="8" y2="13" stroke="${color}" stroke-width="3"/>
    <line x1="0" y1="13" x2="0" y2="22" stroke="${color}" stroke-width="2.6"/>
    ${open
      ? `<line x1="0" y1="13" x2="15" y2="-6" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>`
      : `<line x1="0" y1="13" x2="0" y2="-13" stroke="${color}" stroke-width="3.4"/>`}`;

  const esSym = close => `
    <line x1="0" y1="0" x2="10" y2="0" stroke="${close ? GND : DEAD}" stroke-width="2.6"/>
    <line x1="10" y1="-9" x2="10" y2="9" stroke="${close ? GND : DEAD}" stroke-width="3"/>
    ${close
      ? `<line x1="10" y1="0" x2="30" y2="0" stroke="${GND}" stroke-width="3.4"/>`
      : `<line x1="10" y1="0" x2="27" y2="-13" stroke="${DEAD}" stroke-width="3.4" stroke-linecap="round"/>`}
    <line x1="30" y1="-10" x2="30" y2="10" stroke="${close ? GND : DEAD}" stroke-width="2.8"/>
    <line x1="34" y1="-6" x2="34" y2="6" stroke="${close ? GND : DEAD}" stroke-width="2.4"/>
    <line x1="38" y1="-2.8" x2="38" y2="2.8" stroke="${close ? GND : DEAD}" stroke-width="2.2"/>`;

  const dev = (id, x, y, w, h, sym, no, name, ali) => `
    <g class="dev ${T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      <rect class="hit" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4"/>
      ${sym}
      <text class="devlbl" x="${ali === 'l' ? -w / 2 - 6 : w / 2 + 6}" y="-1" ${ali === 'l' ? 'text-anchor="end"' : ''}>${no}</text>
      <text class="devnm" x="${ali === 'l' ? -w / 2 - 6 : w / 2 + 6}" y="12" ${ali === 'l' ? 'text-anchor="end"' : ''}>${name}</text>
    </g>`;

  const cur = cbOpen ? ['0.0', '0.0', '0.0'] : ['312', '308', '315'];
  const X = 404;

  return `<svg viewBox="0 -38 764 412">
    <!-- 母线 -->
    <line x1="20" y1="54" x2="470" y2="54" stroke="${BUS}" stroke-width="5"/>
    <text x="476" y="58" class="devlbl" style="fill:#ff9a90">110kV 1M</text>
    <line x1="20" y1="100" x2="470" y2="100" stroke="${BUS}" stroke-width="5"/>
    <text x="476" y="104" class="devlbl" style="fill:#ff9a90">110kV 2M</text>
    ${stubUp(70, '培训一线', '1161')}${stubUp(160, '#1主变变高', '1101')}${stubUp(250, '110kV 1M PT', '111PT')}
    ${stubDn(70, '培训二线', '1162')}${stubDn(160, '#2主变变高', '1102')}${stubDn(250, '#3主变变高', '1103')}
    ${stubDn(312, '110kV 2M PT', '112PT')}

    <!-- 培训三线1163间隔 -->
    <rect x="${X - 56}" y="112" width="282" height="262" rx="6" fill="rgba(30,99,184,.07)" stroke="#1c3350" stroke-dasharray="4 4"/>
    <text x="${X - 48}" y="128" class="devlbl" style="fill:#9ecbff">培训三线1163开关间隔分图</text>
    <line x1="${X}" y1="100" x2="${X}" y2="152" stroke="${d2 ? DEAD : LIVE}" stroke-width="2.6"/>
    ${dev('DS11632', X, 172, 44, 46, dsSym(d2, segA), '11632', '培训三线2M侧刀闸')}
    <line x1="${X}" y1="195" x2="${X}" y2="216" stroke="${segA}" stroke-width="2.6"/>
    ${dev('CB1163', X, 238, 44, 44,
      `<rect x="-11" y="-11" width="22" height="22" fill="${cbOpen ? 'none' : segB}" stroke="${segB}" stroke-width="2.6"/>`,
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
    </g>

    <!-- 遥测与运行方式 -->
    <g class="dev" data-dev="hmi_mode" transform="translate(560,44)">
      <rect class="hit" x="-10" y="-30" width="196" height="66" rx="5"/>
      <text x="0" y="-14" class="devlbl">运行方式 / 光字</text>
      <text x="0" y="6" style="font-family:monospace;font-size:12px;fill:#9ecbff">110kV 1M·2M 并列运行</text>
      <text x="0" y="24" style="font-family:monospace;font-size:12px;fill:#8fe8c0">无影响本次操作的光字</text>
    </g>
    <g class="dev" data-dev="hmi_current" transform="translate(560,150)">
      <rect class="hit" x="-10" y="-30" width="196" height="98" rx="5"/>
      <text x="0" y="-14" class="devlbl">1163开关 三相电流 (A)</text>
      <text x="0" y="8" style="font-family:monospace;font-size:17px;fill:${cbOpen ? '#5f7794' : '#8fe8c0'}">Ia ${cur[0]}</text>
      <text x="0" y="32" style="font-family:monospace;font-size:17px;fill:${cbOpen ? '#5f7794' : '#8fe8c0'}">Ib ${cur[1]}</text>
      <text x="0" y="56" style="font-family:monospace;font-size:17px;fill:${cbOpen ? '#5f7794' : '#8fe8c0'}">Ic ${cur[2]}</text>
    </g>
    <g class="dev" data-dev="hmi_volt" transform="translate(560,262)">
      <rect class="hit" x="-10" y="-26" width="196" height="54" rx="5"/>
      <text x="0" y="-10" class="devlbl">培训三线 线路二次电压 (V)</text>
      <text x="0" y="14" style="font-family:monospace;font-size:16px;fill:${d4 ? '#5f7794' : '#8fe8c0'}">Uab ${d4 ? '0.0' : '99.6'}</text>
      <text x="112" y="14" style="font-family:monospace;font-size:16px;fill:${d4 ? '#5f7794' : '#8fe8c0'}">Uo ${d4 ? '0.0' : '0.1'}</text>
    </g>
    <g transform="translate(560,330)">
      <text x="0" y="0" class="devlbl" style="fill:#5f7794">图例</text>
      <line x1="0" y1="16" x2="18" y2="16" stroke="${LIVE}" stroke-width="3"/><text x="24" y="20" class="devlbl">带电</text>
      <line x1="66" y1="16" x2="84" y2="16" stroke="${DEAD}" stroke-width="3"/><text x="90" y="20" class="devlbl">停电</text>
      <line x1="132" y1="16" x2="150" y2="16" stroke="${GND}" stroke-width="3"/><text x="156" y="20" class="devlbl">接地</text>
    </g>
  </svg>`;
}
