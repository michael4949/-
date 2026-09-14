import type { JSX } from 'react'

/* 主题动效场景：每个模块页配一条与其业务对应的动态链路带
   元素构成：南方电网（铁塔·导线·变电构架·断路器·地刀）
            广西（铜鼓太阳纹·壮锦·喀斯特峰林·绣球）
            人力资源（人才阶梯·师带徒·证书·组织树）
            AI（点阵脑·神经网络·数据粒子） */

const IND = '#1e3a6e', IND2 = '#2b4e92', GOLD = '#a8823a', GOLD2 = '#d4af63'
const HOT = '#c0392b', SOFT = '#93a7c4'

/* ============ 广西：铜鼓太阳纹 ============ */
export function BronzeDrum({ cx, cy, r = 46, o = 1 }: { cx: number; cy: number; r?: number; o?: number }) {
  return (
    <g opacity={o}>
      <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="60s" repeatCount="indefinite" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6
          return <path key={i} d={`M${cx + Math.cos(a) * r * .34} ${cy + Math.sin(a) * r * .34}
            L${cx + Math.cos(a - .08) * r * .8} ${cy + Math.sin(a - .08) * r * .8}
            L${cx + Math.cos(a + .08) * r * .8} ${cy + Math.sin(a + .08) * r * .8} Z`} fill={GOLD} opacity=".55" />
        })}
        {Array.from({ length: 20 }).map((_, i) => {
          const a = (i * Math.PI) / 10
          return <circle key={'d' + i} cx={cx + Math.cos(a) * r * .93} cy={cy + Math.sin(a) * r * .93} r="1.6" fill={GOLD} opacity=".5" />
        })}
      </g>
      <circle cx={cx} cy={cy} r={r * .3} fill="none" stroke={GOLD} strokeWidth="1.4" opacity=".7" />
      <circle cx={cx} cy={cy} r={r * .86} fill="none" stroke={GOLD} strokeWidth="1" opacity=".45" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={GOLD} strokeWidth="1.6" opacity=".6">
        <animate attributeName="r" values={`${r};${r + 5};${r}`} dur="4.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".6;.18;.6" dur="4.2s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

/* ============ 广西：喀斯特峰林 ============ */
export function Karst({ x, y, w = 260, h = 70, o = .34 }: { x: number; y: number; w?: number; h?: number; o?: number }) {
  const peaks = [.18, .42, .66, .88]
  return (
    <g opacity={o} fill={SOFT}>
      {peaks.map((p, i) => {
        const px = x + w * p, ph = h * (0.62 + ((i * 37) % 40) / 100)
        return <path key={i} d={`M${px - w * .16} ${y} Q ${px - w * .07} ${y - ph} ${px} ${y - ph + 6} Q ${px + w * .08} ${y - ph} ${px + w * .17} ${y} Z`} />
      })}
    </g>
  )
}

/* ============ 广西：壮锦纹样条 ============ */
export function BrocadeLine({ y, w = 1600 }: { y: number; w?: number }) {
  return (
    <g opacity=".5">
      {Array.from({ length: Math.ceil(w / 26) }).map((_, i) => (
        <path key={i} d={`M${i * 26} ${y} l7 -7 l7 7 l-7 7 z`} fill="none" stroke={GOLD} strokeWidth=".9" />
      ))}
      {Array.from({ length: Math.ceil(w / 26) }).map((_, i) => (
        <path key={'f' + i} d={`M${i * 26 + 14} ${y} l6 -6 l6 6 l-6 6 z`} fill={GOLD} opacity=".22" />
      ))}
    </g>
  )
}

/* ============ 南网：输电铁塔 ============ */
export function PylonS({ x, base, h = 88, o = .6 }: { x: number; base: number; h?: number; o?: number }) {
  const w = h * 0.4
  return (
    <g stroke={IND2} strokeWidth="1.5" fill="none" opacity={o}>
      <path d={`M${x} ${base} L${x - w / 2} ${base - h * .78} M${x} ${base} L${x + w / 2} ${base - h * .78}`} />
      <path d={`M${x - w / 2} ${base - h * .78} L${x + w / 2} ${base - h * .78}`} />
      <path d={`M${x - w * .36} ${base - h * .36} L${x + w * .36} ${base - h * .36}
                M${x - w * .28} ${base - h * .56} L${x + w * .28} ${base - h * .56}`} />
      <path d={`M${x - w / 2} ${base - h * .78} L${x} ${base - h * .56} L${x + w / 2} ${base - h * .78}
                M${x - w * .36} ${base - h * .36} L${x} ${base - h * .56}`} />
      <path d={`M${x - w * .86} ${base - h * .82} L${x + w * .86} ${base - h * .82}`} strokeWidth="2" />
      <path d={`M${x - w * .66} ${base - h * .95} L${x + w * .66} ${base - h * .95}`} strokeWidth="2" />
      <path d={`M${x - w * .86} ${base - h * .82} l3 7 M${x + w * .86} ${base - h * .82} l-3 7
                M${x - w * .66} ${base - h * .95} l3 7 M${x + w * .66} ${base - h * .95} l-3 7`} />
      <path d={`M${x} ${base - h * .78} L${x} ${base - h}`} />
    </g>
  )
}

/* ============ 人力资源：人形 ============ */
export function Person({ x, y, s = 1, fill = IND2, o = 1 }: { x: number; y: number; s?: number; fill?: string; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={o}>
      <circle cx="0" cy="-11" r="5.2" />
      <path d="M-7.4 0 a7.4 8.6 0 0 1 14.8 0 z" />
    </g>
  )
}

/* ============ AI：神经网络 ============ */
function NeuralNet({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const layers = [4, 6, 6, 3]
  const pts = layers.map((n, li) =>
    Array.from({ length: n }).map((_, i) => ({
      x: x + (w / (layers.length - 1)) * li,
      y: y + (h / (n + 1)) * (i + 1),
    })))
  return (
    <g>
      {pts.slice(0, -1).map((L, li) =>
        L.map((a, ai) => pts[li + 1].map((b, bi) => (
          <line key={`${li}-${ai}-${bi}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={IND2} strokeWidth=".5" opacity=".16" />
        ))))}
      {pts.slice(0, -1).map((L, li) =>
        L.map((a, ai) => {
          const b = pts[li + 1][(ai * 2) % pts[li + 1].length]
          return (
            <circle key={`p${li}-${ai}`} r="2.4" fill={GOLD2}>
              <animateMotion dur="2.4s" begin={`${(li * 0.6 + ai * 0.18)}s`} repeatCount="indefinite"
                path={`M${a.x},${a.y} L${b.x},${b.y}`} />
              <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin={`${(li * 0.6 + ai * 0.18)}s`} repeatCount="indefinite" />
            </circle>
          )
        }))}
      {pts.map((L, li) => L.map((p, i) => (
        <circle key={`n${li}-${i}`} cx={p.x} cy={p.y} r="4" fill={li === layers.length - 1 ? GOLD : IND2} opacity=".55">
          <animate attributeName="opacity" values=".35;.95;.35" dur="2.6s" begin={`${li * 0.4 + i * 0.14}s`} repeatCount="indefinite" />
        </circle>
      )))}
    </g>
  )
}

/* ============ 通用外壳 ============ */
function Band({ children }: { children: React.ReactNode }) {
  return (
    <svg width="100%" height="126" viewBox="0 0 1600 126" preserveAspectRatio="xMidYMid meet">
      <rect width="1600" height="126" fill="#f6f9fc" />
      <BrocadeLine y={9} />
      <Karst x={40} y={112} w={230} h={62} />
      <Karst x={1330} y={112} w={230} h={58} />
      <BronzeDrum cx={74} cy={64} r={30} o={.55} />
      <BronzeDrum cx={1528} cy={64} r={30} o={.55} />
      <line x1="0" y1="112" x2="1600" y2="112" stroke={SOFT} strokeWidth=".8" opacity=".4" />
      {children}
    </svg>
  )
}

function Label({ x, y, t }: { x: number; y: number; t: string }) {
  return <text x={x} y={y} fontSize="10" textAnchor="middle" fill="#6b7a91">{t}</text>
}

function Hex({ cx, cy, r, fill, stroke }: { cx: number; cy: number; r: number; fill?: string; stroke?: string }) {
  const p = Array.from({ length: 6 }).map((_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
  }).join(' ')
  return <polygon points={p} fill={fill ?? 'none'} stroke={stroke ?? IND} strokeWidth="1.6" />
}

/* ============ 1. 知识资产中枢：四源汇聚 → 中枢 → 四路分发 ============ */
function HubScene() {
  const src = [['规程条款', 26], ['作业步骤', 52], ['典型案例', 78], ['岗位诀窍', 104]]
  const out = [['课件', 26], ['题库', 52], ['陪练剧本', 78], ['助手回答', 104]]
  return (
    <Band>
      {src.map(([t, y], i) => (
        <g key={t as string}>
          <rect x="210" y={(y as number) - 9} width="96" height="18" fill="#fff" stroke={SOFT} strokeWidth=".8" />
          <text x="258" y={(y as number) + 4} fontSize="10.5" textAnchor="middle" fill={IND}>{t}</text>
          <path d={`M306 ${y} Q 500 ${y} 700 63`} stroke={SOFT} strokeWidth=".9" fill="none" strokeDasharray="5 5" opacity=".7" />
          <circle r="3" fill={IND2}>
            <animateMotion dur="3.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" path={`M306 ${y} Q 500 ${y} 700 63`} />
          </circle>
        </g>
      ))}
      <Hex cx={760} cy={63} r={40} fill="#eef3fb" stroke={GOLD} />
      <Hex cx={760} cy={63} r={27} stroke={IND2} />
      <text x="760" y="60" fontSize="12" textAnchor="middle" fill={IND} fontWeight="600">知识</text>
      <text x="760" y="74" fontSize="12" textAnchor="middle" fill={IND} fontWeight="600">中枢</text>
      <circle cx="760" cy="63" r="48" fill="none" stroke={GOLD} strokeWidth="1" opacity=".5">
        <animate attributeName="r" values="42;58;42" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".55;0;.55" dur="3.6s" repeatCount="indefinite" />
      </circle>
      {out.map(([t, y], i) => (
        <g key={t as string}>
          <path d={`M820 63 Q 1000 ${y} 1180 ${y}`} stroke={GOLD} strokeWidth=".9" fill="none" strokeDasharray="5 5" opacity=".7" />
          <circle r="3" fill={GOLD}>
            <animateMotion dur="3.2s" begin={`${1.6 + i * 0.5}s`} repeatCount="indefinite" path={`M820 63 Q 1000 ${y} 1180 ${y}`} />
          </circle>
          <rect x="1180" y={(y as number) - 9} width="94" height="18" fill="#fff" stroke={GOLD2} strokeWidth=".8" />
          <text x="1227" y={(y as number) + 4} fontSize="10.5" textAnchor="middle" fill={GOLD}>{t}</text>
        </g>
      ))}
      <PylonS x={1330} base={112} h={72} o={.4} />
      <PylonS x={1420} base={112} h={60} o={.3} />
      <path d="M1330 70 Q 1375 84 1420 76" stroke={IND2} strokeWidth=".9" fill="none" opacity=".4" />
    </Band>
  )
}

/* ============ 2. 课程工厂：流水线 ============ */
function FactoryScene() {
  return (
    <Band>
      <rect x="240" y="76" width="1120" height="12" fill="#e3eaf3" />
      <g>
        {Array.from({ length: 56 }).map((_, i) => (
          <path key={i} d={`M${246 + i * 20} 88 l8 -12`} stroke="#c3d0e0" strokeWidth="1.6">
            <animate attributeName="d" values={`M${246 + i * 20} 88 l8 -12;M${266 + i * 20} 88 l8 -12`} dur="1.4s" repeatCount="indefinite" />
          </path>
        ))}
      </g>
      {[['原料', 300], ['解析', 520], ['成课', 760], ['出题', 1000], ['交付', 1250]].map(([t, x], i) => (
        <g key={t as string}>
          <Label x={x as number} y={106} t={t as string} />
          {i > 0 && i < 4 && (
            <g style={{ transformOrigin: `${x}px 48px` }}>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${x} 48`} to={`360 ${x} 48`} dur={`${7 + i}s`} repeatCount="indefinite" />
              <circle cx={x as number} cy="48" r="17" fill="none" stroke={IND2} strokeWidth="2" />
              {Array.from({ length: 8 }).map((_, k) => {
                const a = (k * Math.PI) / 4
                return <rect key={k} x={(x as number) + Math.cos(a) * 20 - 2.4} y={48 + Math.sin(a) * 20 - 2.4} width="4.8" height="4.8" fill={IND2} />
              })}
            </g>
          )}
        </g>
      ))}
      <g>
        <rect x="268" y="36" width="26" height="32" fill="#fff" stroke={SOFT} />
        <path d="M274 44h14M274 51h14M274 58h9" stroke={SOFT} strokeWidth="1.2" />
      </g>
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect width="22" height="26" y="-13" fill="#fff" stroke={GOLD2} strokeWidth="1.2">
            <animateMotion dur="7s" begin={`${i * 2.33}s`} repeatCount="indefinite" path="M300,64 H1240" />
          </rect>
        </g>
      ))}
      <g>
        <rect x="1210" y="34" width="34" height="26" fill="#fff" stroke={GOLD} />
        <path d="M1216 42h22M1216 48h16" stroke={GOLD} strokeWidth="1.2" />
        <rect x="1252" y="34" width="34" height="26" fill="#fff" stroke={IND2} />
        <circle cx="1262" cy="44" r="3" fill="none" stroke={IND2} /><path d="M1270 42h12M1270 50h8" stroke={IND2} strokeWidth="1.2" />
      </g>
      <NeuralNet x={1096} y={22} w={92} h={82} />
    </Band>
  )
}

/* ============ 3. 智能陪练：变电站一次系统 ============ */
function CoachScene() {
  return (
    <Band>
      <PylonS x={252} base={112} h={92} o={.75} />
      <PylonS x={392} base={112} h={92} o={.75} />
      <path d="M252 41 Q 322 58 392 41 M252 30 Q 322 47 392 30" stroke={IND2} strokeWidth="1" fill="none" opacity=".6" />
      <path d="M392 41 H 560" stroke={HOT} strokeWidth="2" fill="none" opacity=".8" />
      {[0, 1, 2].map(i => (
        <circle key={i} r="3.2" fill="#ff8a75">
          <animateMotion dur="3s" begin={`${i}s`} repeatCount="indefinite" path="M252,41 Q322,58 392,41 H560 V63 H700" />
        </circle>
      ))}
      {/* 变电构架与母线 */}
      <path d="M560 41 V63 H980" stroke={HOT} strokeWidth="2" fill="none" opacity=".8" />
      <line x1="600" y1="26" x2="980" y2="26" stroke={HOT} strokeWidth="5" opacity=".75" />
      <Label x={640} y={20} t="110kV 母线" />
      {/* 间隔：刀闸—开关—刀闸—地刀 */}
      <g stroke={HOT} strokeWidth="1.6" fill="none">
        <path d="M760 26 V40" />
        <circle cx="760" cy="40" r="2.4" fill={HOT} /><circle cx="760" cy="54" r="2.4" fill={HOT} />
        <path d="M760 40 L 760 54" />
        <rect x="750" y="56" width="20" height="22" fill={HOT} opacity=".85">
          <animate attributeName="opacity" values=".85;.45;.85" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <path d="M760 78 V88" />
        <circle cx="760" cy="88" r="2.4" fill={HOT} /><circle cx="760" cy="100" r="2.4" fill={HOT} />
        <path d="M760 88 L 760 100" />
      </g>
      <Label x={760} y={112} t="1163 间隔" />
      {/* 地刀 */}
      <g stroke={GOLD} strokeWidth="1.5" fill="none" opacity=".85">
        <path d="M760 94 H 712" />
        <path d="M712 94 L 700 84" />
        <path d="M690 94 V102 M680 102 H700 M684 106 H696 M688 110 H692" />
      </g>
      {/* 数字人教练与学员 */}
      <g>
        <circle cx="1090" cy="58" r="25" fill="#eef3fb" stroke={IND2} strokeWidth="1.2" />
        <Person x={1090} y={72} s={1.5} fill={IND} />
        <circle cx="1090" cy="58" r="31" fill="none" stroke={GOLD} strokeWidth="1.2" opacity=".6">
          <animate attributeName="r" values="27;38;27" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values=".7;0;.7" dur="3s" repeatCount="indefinite" />
        </circle>
        <Label x={1090} y={104} t="数字人教练" />
      </g>
      <path d="M1122 58 H 1180" stroke={GOLD} strokeWidth="1" strokeDasharray="4 4" opacity=".7" />
      {[0, 1].map(i => (
        <circle key={i} r="2.6" fill={GOLD}>
          <animateMotion dur="2s" begin={`${i}s`} repeatCount="indefinite" path="M1122,58 H1180" />
        </circle>
      ))}
      <g>
        <Person x={1210} y={72} s={1.4} fill={IND2} />
        <Label x={1210} y={104} t="学员" />
        <rect x="1246" y="40" width="66" height="42" fill="#fff" stroke={SOFT} />
        <path d="M1254 52h50M1254 60h38M1254 68h44" stroke={SOFT} strokeWidth="1.2" />
        <Label x={1279} y={104} t="操作票" />
      </g>
    </Band>
  )
}

/* ============ 4. 问数助手：提问 → 神经网络 → 出处与图表 ============ */
function AskScene() {
  return (
    <Band>
      {[['一线员工', 34], ['班组长', 63], ['培训专责', 92]].map(([t, y], i) => (
        <g key={t as string}>
          <Person x={250} y={(y as number) + 9} s={1.15} fill={IND2} o={.85} />
          <text x={268} y={(y as number) + 4} fontSize="10.5" fill="#6b7a91">{t}</text>
          <path d={`M340 ${y} H 470`} stroke={SOFT} strokeWidth=".9" strokeDasharray="4 4" opacity=".7" />
          <circle r="2.8" fill={IND2}>
            <animateMotion dur="2.6s" begin={`${i * 0.55}s`} repeatCount="indefinite" path={`M340 ${y} H470`} />
          </circle>
        </g>
      ))}
      <NeuralNet x={500} y={16} w={330} h={92} />
      <text x="665" y="120" fontSize="10" textAnchor="middle" fill="#6b7a91">检索 · 归因 · 生成</text>
      {[0, 1].map(i => (
        <g key={i}>
          <path d={`M860 ${48 + i * 30} H 1010`} stroke={GOLD} strokeWidth=".9" strokeDasharray="4 4" opacity=".7" />
          <circle r="2.8" fill={GOLD}>
            <animateMotion dur="2.6s" begin={`${1.2 + i * .6}s`} repeatCount="indefinite" path={`M860 ${48 + i * 30} H1010`} />
          </circle>
        </g>
      ))}
      <g>
        <rect x="1014" y="22" width="118" height="44" fill="#fff" stroke={GOLD2} />
        <text x="1024" y="38" fontSize="10" fill={GOLD}>附录 G-5</text>
        <path d="M1024 46h96M1024 55h70" stroke={GOLD2} strokeWidth="1.1" opacity=".7" />
        <Label x={1073} y={80} t="带出处" />
      </g>
      <g>
        <rect x="1160" y="22" width="118" height="62" fill="#fff" stroke={SOFT} />
        {[30, 22, 38, 16, 28].map((h, i) => (
          <rect key={i} x={1172 + i * 21} y={76 - h} width="13" height={h} fill={i === 2 ? GOLD : IND2} opacity=".8">
            <animate attributeName="height" values={`0;${h}`} dur="1.1s" begin={`${i * .12}s`} fill="freeze" />
            <animate attributeName="y" values={`76;${76 - h}`} dur="1.1s" begin={`${i * .12}s`} fill="freeze" />
          </rect>
        ))}
        <Label x={1219} y={98} t="带图表" />
      </g>
    </Band>
  )
}

/* ============ 5. 成长地图：人才阶梯 ============ */
function MapScene() {
  const steps = ['初级工', '中级工', '高级工', '技师', '高级技师']
  const bx = 380, bw = 112
  return (
    <Band>
      {steps.map((t, i) => {
        const h = 14 + i * 14
        return (
          <g key={t}>
            <rect x={bx + i * bw} y={106 - h} width={bw - 8} height={h} fill={i === 4 ? GOLD : IND2} opacity={0.2 + i * 0.14}>
              <animate attributeName="height" values={`0;${h}`} dur="1s" begin={`${i * .14}s`} fill="freeze" />
              <animate attributeName="y" values={`106;${106 - h}`} dur="1s" begin={`${i * .14}s`} fill="freeze" />
            </rect>
            <Label x={bx + i * bw + (bw - 8) / 2} y={120} t={t} />
          </g>
        )
      })}
      {/* 沿阶梯上行的人 */}
      <g>
        <Person x={0} y={0} s={1.35} fill={IND} />
        <animateMotion dur="9s" repeatCount="indefinite" keyPoints="0;0.2;0.2;0.4;0.4;0.6;0.6;0.8;0.8;1;1"
          keyTimes="0;0.14;0.2;0.34;0.4;0.54;0.6;0.74;0.8;0.94;1" calcMode="linear"
          path={`M${bx + 52} 92 L${bx + 52} 92 L${bx + bw + 52} 78 L${bx + bw * 2 + 52} 64 L${bx + bw * 3 + 52} 50 L${bx + bw * 4 + 52} 36`} />
      </g>
      {/* 证书 */}
      <g opacity=".95">
        <rect x="986" y="34" width="52" height="34" fill="#fff" stroke={GOLD} strokeWidth="1.2" />
        <path d="M996 46h32M996 55h20" stroke={GOLD2} strokeWidth="1.2" />
        <circle cx="1028" cy="70" r="7" fill="none" stroke={GOLD} strokeWidth="1.2">
          <animate attributeName="r" values="6;9;6" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;.3;1" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <Label x={1012} y={92} t="技能等级证书" />
      </g>
      {/* 左侧能力雷达 */}
      <g transform="translate(258 63)">
        {[1, .68, .36].map((k, i) => (
          <polygon key={i} fill="none" stroke={SOFT} strokeWidth=".8" opacity=".7"
            points={Array.from({ length: 6 }).map((_, j) => {
              const a = (j * Math.PI) / 3 - Math.PI / 2
              return `${Math.cos(a) * 38 * k},${Math.sin(a) * 38 * k}`
            }).join(' ')} />
        ))}
        <polygon fill="rgba(43,78,146,.2)" stroke={IND2} strokeWidth="1.4"
          points={[.86, .62, .74, .9, .55, .8].map((v, j) => {
            const a = (j * Math.PI) / 3 - Math.PI / 2
            return `${Math.cos(a) * 38 * v},${Math.sin(a) * 38 * v}`
          }).join(' ')}>
          <animate attributeName="fill-opacity" values="1;.5;1" dur="4s" repeatCount="indefinite" />
        </polygon>
      </g>
      <Label x={258} y={116} t="岗位能力" />
      {/* 右侧组织树 */}
      <g stroke={SOFT} strokeWidth="1" fill="none" opacity=".8">
        <path d="M1210 30 V44 M1150 58 H1270 M1150 44 V58 M1210 44 V58 M1270 44 V58 M1150 44 H1270" />
      </g>
      <Person x={1210} y={28} s={1.1} fill={IND} />
      {[1150, 1210, 1270].map((x, i) => (
        <g key={x}>
          <Person x={x} y={76} s={1} fill={IND2} o={.8} />
          <circle cx={x} cy={58} r="3" fill={GOLD} opacity=".7">
            <animate attributeName="opacity" values=".3;1;.3" dur="2.4s" begin={`${i * .5}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      <Label x={1210} y={98} t="公司 · 地市局 · 班组" />
    </Band>
  )
}

/* ============ 6. 千人千面：人群分流 ============ */
function PlanScene() {
  const lanes = [['课程', 26], ['陪练', 54], ['集训', 82], ['认定', 108]]
  return (
    <Band>
      {[26, 50, 74, 98].map((y, i) => (
        <g key={y}>
          <Person x={248} y={y} s={1.15} fill={IND2} o={.75} />
          <path d={`M262 ${y - 6} Q 400 ${y - 6} 470 63`} stroke={SOFT} strokeWidth=".8" strokeDasharray="4 4" fill="none" opacity=".6" />
          <circle r="2.6" fill={IND2}>
            <animateMotion dur="3s" begin={`${i * .5}s`} repeatCount="indefinite" path={`M262 ${y - 6} Q 400 ${y - 6} 470 63`} />
          </circle>
        </g>
      ))}
      <Label x={248} y={120} t="在册员工" />
      <Hex cx={510} cy={63} r={34} fill="#eef3fb" stroke={GOLD} />
      <text x="510" y="60" fontSize="10.5" textAnchor="middle" fill={IND}>能力</text>
      <text x="510" y="72" fontSize="10.5" textAnchor="middle" fill={IND}>缺口</text>
      <NeuralNet x={578} y={22} w={150} h={82} />
      <Label x={653} y={120} t="计划生成" />
      {lanes.map(([t, y], i) => (
        <g key={t as string}>
          <path d={`M756 63 Q 900 ${y} 1080 ${y}`} stroke={GOLD} strokeWidth=".9" strokeDasharray="4 4" fill="none" opacity=".65" />
          <circle r="2.8" fill={GOLD}>
            <animateMotion dur="3s" begin={`${1.4 + i * .45}s`} repeatCount="indefinite" path={`M756 63 Q 900 ${y} 1080 ${y}`} />
          </circle>
          <rect x="1080" y={(y as number) - 9} width="66" height="18" fill="#fff" stroke={GOLD2} strokeWidth=".8" />
          <text x="1113" y={(y as number) + 4} fontSize="10.5" textAnchor="middle" fill={GOLD}>{t}</text>
          <Person x={1178 + i * 26} y={(y as number) + 8} s={.95} fill={IND2} o={.7} />
        </g>
      ))}
    </Band>
  )
}

/* ============ 7. 课程体系：课堂 ============ */
function CourseScene() {
  return (
    <Band>
      <rect x="240" y="20" width="150" height="74" fill="#fff" stroke={IND2} strokeWidth="1.2" />
      <g>
        <rect x="252" y="32" width="126" height="50" fill="#eef3fb" />
        {[0, 1, 2].map(i => (
          <g key={i}>
            <rect x="262" y="42" width="106" height="8" fill={IND2} opacity="0">
              <animate attributeName="opacity" values="0;.7;.7;0" dur="6s" begin={`${i * 2}s`} repeatCount="indefinite" />
            </rect>
            <rect x="262" y="56" width={76 - i * 16} height="6" fill={GOLD} opacity="0">
              <animate attributeName="opacity" values="0;.8;.8;0" dur="6s" begin={`${i * 2}s`} repeatCount="indefinite" />
            </rect>
            <rect x="262" y="68" width={92 - i * 10} height="6" fill={SOFT} opacity="0">
              <animate attributeName="opacity" values="0;.7;.7;0" dur="6s" begin={`${i * 2}s`} repeatCount="indefinite" />
            </rect>
          </g>
        ))}
      </g>
      <Label x={315} y={110} t="课件" />
      <Person x={430} y={90} s={1.6} fill={IND} />
      <Label x={430} y={110} t="内训师" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <g key={i}>
          <Person x={530 + (i % 4) * 46} y={i < 4 ? 62 : 96} s={1.2} fill={IND2} o={.75} />
          <circle cx={530 + (i % 4) * 46} cy={i < 4 ? 44 : 78} r="3" fill={GOLD} opacity=".5">
            <animate attributeName="opacity" values=".15;.9;.15" dur="3s" begin={`${i * .28}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      <Label x={599} y={120} t="学员" />
      {[0, 1, 2].map(i => (
        <g key={'c' + i}>
          <g>
            <rect x="-22" y="-13" width="44" height="26" fill="#fff" stroke={GOLD} strokeWidth="1.2" />
            <path d="M-13 -3h26M-13 5h16" stroke={GOLD2} strokeWidth="1.1" />
            <animateMotion dur="6s" begin={`${i * 2}s`} repeatCount="indefinite" path="M760,70 Q 900,20 1080,58" />
          </g>
        </g>
      ))}
      <g>
        <Hex cx={1150} cy={58} r={34} fill="#fdf7ec" stroke={GOLD} />
        <text x="1150" y="55" fontSize="10.5" textAnchor="middle" fill={GOLD}>结业</text>
        <text x="1150" y="68" fontSize="10.5" textAnchor="middle" fill={GOLD}>产出</text>
      </g>
      {[['成套课件', 30], ['智能体', 58], ['岗位场景', 86]].map(([t, y], i) => (
        <g key={t as string}>
          <path d={`M1186 58 Q 1220 ${y} 1252 ${y}`} stroke={GOLD2} strokeWidth=".9" strokeDasharray="4 4" fill="none" opacity=".7" />
          <circle r="2.6" fill={GOLD}>
            <animateMotion dur="2.8s" begin={`${i * .6}s`} repeatCount="indefinite" path={`M1186 58 Q 1220 ${y} 1252 ${y}`} />
          </circle>
          <text x="1258" y={(y as number) + 4} fontSize="10.5" fill={GOLD}>{t}</text>
        </g>
      ))}
    </Band>
  )
}

const SCENES: Record<string, () => JSX.Element> = {
  hub: HubScene, factory: FactoryScene, coach: CoachScene,
  ask: AskScene, map: MapScene, plan: PlanScene, course: CourseScene,
}

export function SceneRibbon({ id }: { id: string }) {
  const S = SCENES[id] ?? HubScene
  return (
    <div className="shrink-0 relative overflow-hidden" style={{ height: 126, borderTop: '1px solid var(--line)' }}>
      <S />
    </div>
  )
}

/* ============ 首页用：输电走廊 ============ */
export function PowerCorridor() {
  return (
    <svg className="w-full h-full" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice">
      {[160, 470, 780, 1090, 1400].map((x, i) => <PylonS key={x} x={x} base={286} h={150 - i % 2 * 18} o={.42} />)}
      <g stroke={IND2} strokeWidth="1.1" fill="none" opacity=".4">
        <path d="M160 164 Q 315 198 470 164 Q 625 198 780 164 Q 935 198 1090 164 Q 1245 198 1400 164" />
        <path d="M160 142 Q 315 176 470 142 Q 625 176 780 142 Q 935 176 1090 142 Q 1245 176 1400 142" />
      </g>
      {[0, 1, 2].map(i => (
        <circle key={i} r="4" fill={GOLD2} opacity=".95">
          <animateMotion dur="14s" begin={`${i * 4.6}s`} repeatCount="indefinite"
            path="M160 164 Q 315 198 470 164 Q 625 198 780 164 Q 935 198 1090 164 Q 1245 198 1400 164" />
        </circle>
      ))}
      {[0, 1].map(i => (
        <circle key={'b' + i} r="3.4" fill="#ffe6a8" opacity=".9">
          <animateMotion dur="14s" begin={`${2 + i * 7}s`} repeatCount="indefinite"
            path="M160 142 Q 315 176 470 142 Q 625 176 780 142 Q 935 176 1090 142 Q 1245 176 1400 142" />
        </circle>
      ))}
    </svg>
  )
}

/* ============ 首页用：AI 神经网络块 ============ */
export function NeuralBlock({ w = 240, h = 120 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 240 120">
      <NeuralNet x={22} y={12} w={196} h={96} />
    </svg>
  )
}

/* ============ 首页用：铜鼓 + 壮锦 文化块 ============ */
export function CultureBlock({ size = 130 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 130 130">
      <BronzeDrum cx={65} cy={65} r={52} o={.85} />
    </svg>
  )
}
