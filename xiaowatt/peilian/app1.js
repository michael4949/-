/* ================= 小瓦特·练 · 倒闸操作陪练舱 ================= */
const S = {
  stage: 'prep',          // prep | wufang | run | end
  idx: 0, beat: 0,
  loc: 'phone',
  sel: null,              // 已手指口述选中的设备
  spoke: false,           // 本项已通过复诵
  gis: {},                // 本项已核对的现场指示
  dev: {
    CB1163: 'close', DS11634: 'close', DS11632: 'close', ES116340: 'open',
    K1QK: '远控', KZK: '远控',
    M1DK: 'on', M2DK: 'on', M4DK: 'on', M1K2: 'on', M1K1: 'on', M1ZKK: 'on'
  },
  tags: {},               // 已挂标志牌
  verify: { v1: false, v2: false },
  bay: '1163',
  prep: { audit: [false, false, false], dress: [false, false, false], mind: false, risks: [] },
  wf: 0,
  msgs: [], chat: [],
  vio: [],                // 违规记录
  praise: [],
  score: { rule: 0, order: 0, dual: 0, state: 0, risk: 0, term: 0 },
  ord: { unit: '', from: '', to: '任玲玲', time: '' },
  abn: { armed: true, fired: false, handled: false },
  trap: { armed: true, fired: false, passed: null },
  t0: 0, timer: null, muted: false, ended: false,
  mode: 'teach', hintLv: {}, hints: [], kpOpen: false, kpSeen: {}, kpAuto: null, toured: false, warned: {}, previewed: {}
};
for (let i = 0; i < 12; i++) S.prep.risks.push(false);

let DH, DHkey = 'jianhu';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const now = () => { const d = new Date(); return d.toTimeString().slice(0, 8); };
const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toTimeString().slice(0, 5)}`; };

const STEP = () => STEPS[S.idx];

/* ---------------- 场景背景 ---------------- */
function sceneSVG(loc) {
  const wall = '#0d1b2c', wall2 = '#0a1524', floor = '#08111d', edge = '#162b45', glow = '#1a4b80';
  const lamp = (x, w) => `<ellipse cx="${x}" cy="18" rx="${w}" ry="7" fill="#cfe6ff" opacity=".5"/>
    <path d="M ${x - w} 18 L ${x - w * 3.4} 300 L ${x + w * 3.4} 300 L ${x + w} 18 Z" fill="url(#gl)" opacity=".16"/>`;
  const cabRow = (y, n, w, h, c) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = 14 + i * (w + 5);
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}" stroke="${edge}"/>
            <rect x="${x + 3}" y="${y + 5}" width="${w - 6}" height="${h * .18}" fill="#0b1a2b"/>
            <circle cx="${x + w - 8}" cy="${y + h * .34}" r="2" fill="#23b26a" opacity=".8"/>
            <circle cx="${x + w - 8}" cy="${y + h * .42}" r="2" fill="#e23b2e" opacity=".55"/>
            <rect x="${x + 4}" y="${y + h - 16}" width="${w - 8}" height="9" rx="1" fill="#0c1c2e"/>`;
    }
    return s;
  };
  let inner = '';
  if (loc === 'phone') {
    inner = `${lamp(90, 26)}${lamp(300, 26)}
    <rect x="0" y="0" width="420" height="330" fill="${wall}"/>
    <rect x="0" y="330" width="420" height="290" fill="${floor}"/>
    <path d="M0 330 L120 620 M420 330 L300 620 M0 400 L420 400" stroke="${edge}" stroke-width="1" opacity=".5"/>
    <rect x="24" y="120" width="150" height="96" rx="3" fill="#0a1728" stroke="${edge}"/>
    <text x="34" y="140" font-size="9" fill="#5f7794" font-family="monospace">调度操作指令记录簿</text>
    <rect x="34" y="150" width="130" height="1" fill="#1d3350"/><rect x="34" y="162" width="130" height="1" fill="#1d3350"/>
    <rect x="34" y="174" width="130" height="1" fill="#1d3350"/><rect x="34" y="186" width="130" height="1" fill="#1d3350"/>
    <rect x="256" y="150" width="128" height="70" rx="4" fill="#101f33" stroke="${edge}"/>
    <rect x="266" y="160" width="60" height="30" rx="3" fill="#16283f"/>
    <circle cx="352" cy="172" r="9" fill="#123763"/><text x="352" y="176" font-size="9" fill="#9ecbff" text-anchor="middle" font-family="monospace">DIAL</text>
    <rect x="266" y="196" width="108" height="14" rx="2" fill="#0b1a2b"/>
    <rect x="0" y="300" width="420" height="30" fill="#0b1a2b" opacity=".7"/>`;
  } else if (loc === 'hmi') {
    inner = `${lamp(210, 40)}
    <rect x="0" y="0" width="420" height="360" fill="${wall2}"/>
    <rect x="0" y="360" width="420" height="260" fill="${floor}"/>
    <rect x="20" y="40" width="380" height="180" rx="4" fill="#071322" stroke="${edge}" stroke-width="2"/>
    <g opacity=".55">
      <path d="M40 90 H380 M40 140 H380" stroke="#1e63b8" stroke-width="1.6"/>
      <path d="M110 90 V140 M210 90 V140 M310 90 V140" stroke="#e23b2e" stroke-width="1.4"/>
      <rect x="104" y="106" width="12" height="12" fill="#e23b2e"/><rect x="204" y="106" width="12" height="12" fill="#e23b2e"/>
      <rect x="304" y="106" width="12" height="12" fill="#23b26a"/>
      <path d="M40 160 H380" stroke="#20406a" stroke-width="1"/>
      <rect x="40" y="170" width="120" height="6" fill="#16324f"/><rect x="40" y="182" width="90" height="6" fill="#16324f"/>
      <rect x="240" y="170" width="140" height="6" fill="#16324f"/><rect x="240" y="182" width="110" height="6" fill="#16324f"/>
    </g>
    <rect x="20" y="40" width="380" height="180" rx="4" fill="url(#gl)" opacity=".10"/>
    <rect x="60" y="250" width="300" height="12" rx="3" fill="#12233a" stroke="${edge}"/>
    <rect x="150" y="262" width="120" height="60" fill="#0d1c2e" stroke="${edge}"/>
    <rect x="30" y="330" width="360" height="14" rx="3" fill="#12233a" stroke="${edge}"/>
    <path d="M0 360 L110 620 M420 360 L310 620" stroke="${edge}" opacity=".5"/>`;
  } else if (loc === 'wufang') {
    inner = `${lamp(210, 34)}
    <rect x="0" y="0" width="420" height="350" fill="${wall}"/>
    <rect x="0" y="350" width="420" height="270" fill="${floor}"/>
    <rect x="120" y="120" width="180" height="120" rx="4" fill="#071322" stroke="${edge}" stroke-width="2"/>
    <g opacity=".6"><path d="M136 160 H284 M136 200 H284" stroke="#1e63b8" stroke-width="1.4"/>
    <path d="M190 160 V200 M240 160 V200" stroke="#e23b2e" stroke-width="1.2"/></g>
    <rect x="150" y="248" width="120" height="10" rx="2" fill="#12233a" stroke="${edge}"/>
    <rect x="100" y="270" width="220" height="14" rx="3" fill="#12233a" stroke="${edge}"/>
    <rect x="316" y="240" width="52" height="44" rx="3" fill="#0f1f33" stroke="${edge}"/>
    <text x="342" y="266" font-size="8" fill="#5f7794" text-anchor="middle" font-family="monospace">电脑钥匙</text>
    <path d="M0 350 L120 620 M420 350 L300 620" stroke="${edge}" opacity=".5"/>`;
  } else if (loc === 'bay') {
    inner = `${lamp(120, 22)}${lamp(300, 22)}
    <rect x="0" y="0" width="420" height="300" fill="#0a1626"/>
    <rect x="0" y="300" width="420" height="320" fill="#091420"/>
    <g stroke="${edge}" fill="none"><path d="M0 300 H420 M0 380 H420"/></g>
    <!-- GIS 筒体 -->
    <g>
      <rect x="30" y="150" width="360" height="34" rx="17" fill="#1a2e46" stroke="#27466b"/>
      <rect x="30" y="150" width="360" height="12" rx="6" fill="#26456b" opacity=".7"/>
      <rect x="86" y="184" width="34" height="120" rx="8" fill="#1a2e46" stroke="#27466b"/>
      <rect x="196" y="184" width="34" height="120" rx="8" fill="#1a2e46" stroke="#27466b"/>
      <rect x="306" y="184" width="34" height="120" rx="8" fill="#1a2e46" stroke="#27466b"/>
      <circle cx="103" cy="140" r="9" fill="#12233a" stroke="#27466b"/>
      <circle cx="213" cy="140" r="9" fill="#12233a" stroke="#27466b"/>
      <circle cx="323" cy="140" r="9" fill="#12233a" stroke="#27466b"/>
      <rect x="60" y="304" width="86" height="76" rx="3" fill="#132539" stroke="#27466b"/>
      <text x="103" y="322" font-size="8.5" fill="#7f9cbb" text-anchor="middle" font-family="monospace">1161</text>
      <rect x="170" y="304" width="86" height="76" rx="3" fill="#132539" stroke="#27466b"/>
      <text x="213" y="322" font-size="8.5" fill="#7f9cbb" text-anchor="middle" font-family="monospace">1162</text>
      <rect x="280" y="304" width="86" height="76" rx="3" fill="#16324f" stroke="#3b6ea3"/>
      <text x="323" y="322" font-size="8.5" fill="#9ecbff" text-anchor="middle" font-family="monospace">1163</text>
      <circle cx="299" cy="340" r="3.4" fill="#e23b2e"/><circle cx="311" cy="340" r="3.4" fill="#e8b22a"/>
      <circle cx="323" cy="340" r="3.4" fill="#23b26a"/>
    </g>
    <rect x="0" y="382" width="420" height="8" fill="#e8b22a" opacity=".18"/>
    <path d="M0 390 L60 620 M420 390 L360 620" stroke="${edge}" opacity=".4"/>`;
  } else if (loc === 'p8' || loc === 'p20') {
    inner = `${lamp(120, 24)}${lamp(300, 24)}
    <rect x="0" y="0" width="420" height="340" fill="${wall2}"/>
    <rect x="0" y="340" width="420" height="280" fill="${floor}"/>
    ${cabRow(60, 5, 74, 280, loc === 'p8' ? '#132539' : '#152036')}
    <rect x="0" y="340" width="420" height="6" fill="#16324f"/>
    <path d="M0 346 L100 620 M420 346 L320 620" stroke="${edge}" opacity=".45"/>`;
  } else {
    inner = `${lamp(210, 30)}
    <rect x="0" y="0" width="420" height="330" fill="${wall}"/>
    <rect x="0" y="330" width="420" height="290" fill="${floor}"/>
    <rect x="96" y="70" width="228" height="290" rx="4" fill="#132539" stroke="#27466b" stroke-width="2"/>
    <rect x="104" y="80" width="212" height="42" rx="2" fill="#0b1a2b"/>
    <text x="210" y="106" font-size="10" fill="#7f9cbb" text-anchor="middle" font-family="monospace">1163 就地控制柜</text>
    <g>
      <circle cx="140" cy="150" r="9" fill="#e23b2e" opacity=".85"/>
      <circle cx="168" cy="150" r="9" fill="#e8b22a" opacity=".85"/>
      <circle cx="196" cy="150" r="9" fill="#23b26a" opacity=".85"/>
      <rect x="120" y="180" width="180" height="44" rx="3" fill="#0e1f33" stroke="#27466b"/>
      <rect x="120" y="234" width="84" height="34" rx="3" fill="#0e1f33" stroke="#27466b"/>
      <rect x="216" y="234" width="84" height="34" rx="3" fill="#0e1f33" stroke="#27466b"/>
      <rect x="120" y="278" width="180" height="54" rx="3" fill="#0e1f33" stroke="#27466b"/>
    </g>
    <path d="M0 330 L110 620 M420 330 L310 620" stroke="${edge}" opacity=".45"/>`;
  }
  return `<svg viewBox="0 0 420 620" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
    <defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cfe6ff"/><stop offset="100%" stop-color="#cfe6ff" stop-opacity="0"/></linearGradient></defs>
    ${inner}
    <rect x="0" y="0" width="420" height="620" fill="url(#vg)"/>
    <defs><radialGradient id="vg" cx="50%" cy="45%" r="72%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".62"/>
    </radialGradient></defs>
  </svg>`;
}
