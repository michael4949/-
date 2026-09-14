import type { ReactElement } from 'react'

/* 装饰元素：南网 / 广西 / 人力资源 / AI */

export const CSG_GREEN = '#00a651'
export const CSG_BLUE = '#0b63b0'

/* ---------- 南网风格标识 ---------- */
export function GridMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" fill="none" stroke={CSG_BLUE} strokeWidth="2" />
      <path d="M20 8 L30 14 V26 L20 32 L10 26 V14 Z" fill="none" stroke={CSG_GREEN} strokeWidth="1.6" opacity=".85" />
      <path d="M22 12 L15 21 h5 l-2 8 7-10 h-5 z" fill="var(--gold)" />
    </svg>
  )
}

/* ---------- 广西轮廓 + 14 地市局 ---------- */
export const GX_CITIES = [
  { n: '百色', x: 95, y: 175 }, { n: '河池', x: 150, y: 138 }, { n: '崇左', x: 113, y: 226 },
  { n: '南宁', x: 166, y: 214, hq: true }, { n: '柳州', x: 201, y: 130 }, { n: '来宾', x: 206, y: 176 },
  { n: '桂林', x: 256, y: 86 }, { n: '贺州', x: 314, y: 106 }, { n: '梧州', x: 326, y: 160 },
  { n: '贵港', x: 251, y: 190 }, { n: '玉林', x: 296, y: 206 }, { n: '钦州', x: 171, y: 249 },
  { n: '防城港', x: 139, y: 262 }, { n: '北海', x: 211, y: 247 },
]

const GX_PATH = 'M60 120 L95 85 L140 95 L175 70 L215 80 L255 62 L300 78 L330 70 L355 95 L348 130 ' +
  'L360 160 L340 195 L315 205 L300 235 L265 245 L240 232 L205 248 L175 238 L150 252 L120 240 ' +
  'L95 250 L70 225 L52 190 L62 155 Z'

export function GuangxiMap({ w = 380, labels = true, opacity = 1 }: { w?: number; labels?: boolean; opacity?: number }) {
  return (
    <svg width={w} height={w * 0.78} viewBox="0 0 400 310" style={{ opacity }}>
      <defs>
        <linearGradient id="gxf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a6e" stopOpacity=".10" />
          <stop offset="100%" stopColor="#00a651" stopOpacity=".14" />
        </linearGradient>
      </defs>
      <path d={GX_PATH} fill="url(#gxf)" stroke="#2b4e92" strokeWidth="1.6" />
      {/* 骨干输电通道 */}
      <g stroke="var(--gold)" strokeWidth="1.3" fill="none" opacity=".8">
        <path className="flow-line" d="M166 214 L201 130 L256 86" />
        <path className="flow-line" d="M166 214 L206 176 L251 190 L326 160" />
        <path className="flow-line" d="M166 214 L113 226 M166 214 L171 249 L211 247" />
        <path className="flow-line" d="M150 138 L95 175 M201 130 L314 106" />
      </g>
      {GX_CITIES.map((c, i) => (
        <g key={c.n}>
          {c.hq && <circle cx={c.x} cy={c.y} r="6" fill="none" stroke="var(--gold)" strokeWidth="1.4" className="ring-out" style={{ animationDelay: `${i * .2}s` }} />}
          <circle cx={c.x} cy={c.y} r={c.hq ? 4.6 : 3} fill={c.hq ? 'var(--gold)' : '#2b4e92'} className="an-glow" style={{ animationDelay: `${i * .28}s` }} />
          {labels && <text x={c.x + 7} y={c.y + 3.5} fontSize="9.5" fill="#4a5a75">{c.n}</text>}
        </g>
      ))}
    </svg>
  )
}

/* ---------- AI 点阵脑 ---------- */
export function AIBrain({ size = 250, flip = false, color = '#2b8fd6' }: { size?: number; flip?: boolean; color?: string }) {
  const id = flip ? 'br2' : 'br1'
  const brain = 'M96 34 C64 34 42 54 42 78 C26 86 22 108 32 124 C26 142 38 160 58 164 ' +
    'C66 182 92 190 110 178 L110 34 Z M124 34 C156 34 178 54 178 78 C194 86 198 108 188 124 ' +
    'C194 142 182 160 162 164 C154 182 128 190 110 178 L110 34 Z'
  return (
    <svg width={size} height={size * 0.92} viewBox="0 0 220 200" style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
      <defs>
        <pattern id={id + 'p'} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.5" cy="3.5" r="1.5" fill={color} />
        </pattern>
        <clipPath id={id + 'c'}><path d={brain} /></clipPath>
        <radialGradient id={id + 'g'}>
          <stop offset="0%" stopColor={color} stopOpacity=".28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="106" r="98" fill={`url(#${id}g)`} className="an-glow" />
      <g clipPath={`url(#${id}c)`}><rect width="220" height="200" fill={`url(#${id}p)`} opacity=".9" /></g>
      <path d={brain} fill="none" stroke={color} strokeWidth="1.4" opacity=".65" />
      <g stroke={color} strokeWidth=".9" opacity=".55" fill="none">
        <path className="flow-line" d="M70 78 L96 96 L78 128 L112 146" />
        <path className="flow-line" d="M150 74 L128 100 L152 126 L120 150" />
      </g>
      {[[70, 78], [96, 96], [78, 128], [150, 74], [128, 100], [152, 126], [112, 146]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={color} className="an-glow" style={{ animationDelay: `${i * .35}s` }} />
      ))}
      <text x="110" y="118" textAnchor="middle" fontSize="42" fontWeight="700" fill={color} opacity=".92"
        style={{ transform: flip ? 'scaleX(-1)' : undefined, transformOrigin: '110px 106px', fontFamily: 'Helvetica Neue, Arial' }}>AI</text>
    </svg>
  )
}

/* ---------- 输电铁塔 ---------- */
export function Tower({ h = 150, color = '#1e3a6e', opacity = .5 }: { h?: number; color?: string; opacity?: number }) {
  return (
    <svg width={h * 0.52} height={h} viewBox="0 0 80 160" style={{ opacity }}>
      <g stroke={color} strokeWidth="1.8" fill="none">
        <path d="M40 156 L14 40 M40 156 L66 40 M14 40 L66 40" />
        <path d="M22 100 L58 100 M27 76 L53 76 M32 56 L48 56" />
        <path d="M14 40 L40 56 L66 40 M22 100 L40 76 L58 100 M27 76 L40 56" />
        <path d="M4 34 L76 34 M10 18 L70 18" strokeWidth="2.4" />
        <path d="M4 34 l4 9 M76 34 l-4 9 M10 18 l4 9 M70 18 l-4 9" />
        <path d="M40 40 L40 6 M28 6 L52 6" />
      </g>
    </svg>
  )
}

/* ---------- 人力资源：人才梯队 ---------- */
export function TalentLadder({ w = 210 }: { w?: number }) {
  const bars = [34, 52, 72, 92, 112]
  const names = ['初级工', '中级工', '高级工', '技师', '高级技师']
  return (
    <svg width={w} height={w * 0.62} viewBox="0 0 220 136">
      {bars.map((h, i) => (
        <g key={i}>
          <rect x={12 + i * 41} y={128 - h} width="30" height={h}
            fill={i === 4 ? 'var(--gold)' : '#2b4e92'} opacity={0.28 + i * 0.15}>
            <animate attributeName="height" from="0" to={h} dur="1.1s" begin={`${i * .14}s`} fill="freeze" />
            <animate attributeName="y" from="128" to={128 - h} dur="1.1s" begin={`${i * .14}s`} fill="freeze" />
          </rect>
          <circle cx={27 + i * 41} cy={128 - h - 13} r="5.4" fill={i === 4 ? 'var(--gold)' : '#2b4e92'} />
          <path d={`M${18 + i * 41} ${128 - h - 1} a9 9 0 0 1 18 0 z`} fill={i === 4 ? 'var(--gold)' : '#2b4e92'} />
          <text x={27 + i * 41} y={134} textAnchor="middle" fontSize="8" fill="#7b8798">{names[i]}</text>
        </g>
      ))}
    </svg>
  )
}

/* ---------- 壮锦纹样条 ---------- */
export function BrocadeStrip({ h = 10 }: { h?: number }) {
  return (
    <svg width="100%" height={h} preserveAspectRatio="none" viewBox="0 0 240 12">
      <defs>
        <pattern id="zj" width="24" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6 L6 0 L12 6 L6 12 Z" fill="none" stroke="var(--gold)" strokeWidth="1" opacity=".85" />
          <path d="M12 6 L18 0 L24 6 L18 12 Z" fill="var(--gold)" opacity=".22" />
          <path d="M6 6 h12" stroke="var(--gold)" strokeWidth=".7" opacity=".5" />
        </pattern>
      </defs>
      <rect width="240" height="12" fill="url(#zj)" />
    </svg>
  )
}

/* ---------- 小图标（悬浮气泡用） ---------- */
export function Bubble({ icon, size = 44, delay = 0, cls = '' }: { icon: string; size?: number; delay?: number; cls?: string }) {
  const paths: Record<string, ReactElement> = {
    cert: <><rect x="5" y="4" width="14" height="13" rx="1" /><path d="M8 8h8M8 11h5" /><circle cx="17" cy="18" r="3" /></>,
    user: <><circle cx="12" cy="8.5" r="3.4" /><path d="M5.5 19c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6" /></>,
    book: <><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" /></>,
    chip: <><rect x="7" y="7" width="10" height="10" rx="1" /><path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" /></>,
    bolt: <path d="M13 3 L7 13h4l-1 8 7-11h-4z" />,
    chart: <><path d="M4 20V9M10 20V5M16 20v-7M22 20H3" /></>,
    net: <><circle cx="12" cy="5" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" /><path d="M12 7 L6 16M12 7l6 9M7 18h10" /></>,
    cloud: <><path d="M7 18h10a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 7.6 11 3.5 3.5 0 0 0 7 18z" /></>,
    shield: <><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>,
    tower: <><path d="M12 21 L7 5M12 21 L17 5M7 5h10M9 13h6M10 9h4" /></>,
  }
  return (
    <div className={`rounded-full flex items-center justify-center ${cls}`}
      style={{
        width: size, height: size, animationDelay: `${delay}s`,
        background: 'rgba(255,255,255,.72)', border: '1px solid rgba(43,78,146,.22)',
        boxShadow: '0 6px 18px rgba(20,33,61,.10)', backdropFilter: 'blur(3px)',
      }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none"
        stroke="#2b4e92" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg>
    </div>
  )
}
