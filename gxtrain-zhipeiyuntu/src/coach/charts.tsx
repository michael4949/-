/* 手绘 SVG 图表库：雷达 / 柱线 / 环形 / 面积 / 热力 / 仪表 / 成长曲线 / 成长地图 */
import { DIMS6 } from './data'

export const dayLabel = (d: number) => { const t = new Date(Date.now() - d * 864e5); return `${t.getMonth() + 1}/${t.getDate()}` }
export const dateAfter = (days: number) => { const t = new Date(Date.now() + days * 864e5); return `${t.getMonth() + 1}月${t.getDate()}日` }
const MONO = '"DIN Alternate", Arial, monospace'

export function Radar({ dims, now, prev, w = 330, h = 250, l1 = '本月', l2 = '上月', target, c2 = '#b3bfcf', onDim }:
  { dims: string[]; now: number[]; prev: number[]; w?: number; h?: number; l1?: string; l2?: string; target?: number[] | null; c2?: string; onDim?: (i: number) => void }) {
  const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 - 44, fs = dims.length > 8 ? 9.5 : 10
  const pt = (vals: number[]) => dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length, r = R * vals[i] / 100; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] })
  const ring = (k: number) => dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length; return `${cx + Math.cos(a) * R * k},${cy + Math.sin(a) * R * k}` }).join(' ')
  const P1 = pt(now), P0 = pt(prev)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chsvg">
      {[.33, .66, 1].map(k => <polygon key={k} points={ring(k)} fill="none" stroke="#e6eaf1" />)}
      {dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length; return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke="#e6eaf1" /> })}
      <polygon points={P0.map(p => p.join(',')).join(' ')} fill="none" stroke={c2} strokeWidth={1.4} strokeDasharray="4 4" />
      {target && <polygon points={pt(target).map(p => p.join(',')).join(' ')} fill="rgba(168,130,58,.08)" stroke="#a8823a" strokeWidth={1.6} strokeDasharray="2 5" strokeLinecap="round" />}
      <polygon className="anim-poly" points={P1.map(p => p.join(',')).join(' ')} fill="rgba(43,78,146,.16)" stroke="#2b4e92" strokeWidth={2} style={{ transformOrigin: `${cx}px ${cy}px` }} />
      {dims.map((n, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / dims.length, lr = R + 26; const lx = cx + Math.cos(a) * lr, ly = cy + Math.sin(a) * lr; const diff = now[i] - prev[i]
        return <g key={n} className="hitv" onClick={() => onDim && onDim(i)}><title>{`${n} ${now[i]} 分 · 较${l2}${diff >= 0 ? '+' : ''}${diff}${target ? ' · 目标 ' + target[i] : ''}`}</title>
          <circle cx={P1[i][0]} cy={P1[i][1]} r={9} fill="transparent" /><circle cx={P1[i][0]} cy={P1[i][1]} r={3.2} fill="#2b4e92" />
          <text x={lx} y={ly} textAnchor="middle" fontSize={fs} fill="#6b7a90">{n}</text><text x={lx} y={ly + 12} textAnchor="middle" fontSize={10.5} fontFamily={MONO} fill={now[i] < 70 ? '#b8791d' : '#1e3a6e'}>{now[i]}</text></g> })}
      <g fontSize={10} fill="#8a94a6"><rect x={w - 104} y={8} width={10} height={3} fill="#2b4e92" /><text x={w - 90} y={13}>{l1}</text><rect x={w - 52} y={8} width={10} height={3} fill={c2} /><text x={w - 38} y={13}>{l2}</text>{target && <><rect x={8} y={8} width={10} height={3} fill="#a8823a" /><text x={22} y={13}>目标</text></>}</g>
    </svg>)
}

export function Combo({ byDay, w = 340, h = 240, onDay }: { byDay: Record<number, { min: number; cnt: number }>; w?: number; h?: number; onDay?: (d: number) => void }) {
  const pl = 34, pr = 30, pt2 = 18, pb = 26, iw = w - pl - pr, ih = h - pt2 - pb
  const days: { d: number; m: number; c: number }[] = []; for (let d = 29; d >= 0; d--) days.push({ d, m: (byDay[d] || { min: 0 }).min || 0, c: (byDay[d] || { cnt: 0 }).cnt || 0 })
  const mMax = Math.max(60, ...days.map(x => x.m)), cMax = Math.max(2, ...days.map(x => x.c)); const bw = iw / 30 * .58; const X = (i: number) => pl + iw / 30 * (i + .5)
  const line = days.map((x, i) => x.c ? `${X(i)},${pt2 + ih - ih * x.c / cMax}` : null).filter(Boolean).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chsvg">
      <defs><linearGradient id="gbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d4af63" /><stop offset="1" stopColor="#a8823a" /></linearGradient></defs>
      {[0, .5, 1].map(k => <g key={k}><line x1={pl} y1={pt2 + ih * k} x2={w - pr} y2={pt2 + ih * k} stroke="#e6eaf1" /><text x={pl - 5} y={pt2 + ih * k + 3} textAnchor="end" fontSize={9} fill="#8a94a6">{Math.round(mMax * (1 - k))}</text><text x={w - pr + 5} y={pt2 + ih * k + 3} fontSize={9} fill="#8a94a6">{(cMax * (1 - k)).toFixed(0)}</text></g>)}
      {days.map((x, i) => x.m ? <rect key={i} className="hitv anim-bar" onClick={() => onDay && onDay(x.d)} x={X(i) - bw / 2} y={pt2 + ih - ih * x.m / mMax} width={bw} height={ih * x.m / mMax} rx={1.5} fill="url(#gbar)" style={{ animationDelay: `${i * 14}ms` }}><title>{`${dayLabel(x.d)} · ${x.m} 分钟 · ${x.c} 场`}</title></rect> : null)}
      <polyline className="anim-line" points={line} fill="none" stroke="#2b4e92" strokeWidth={1.6} />
      {days.map((x, i) => x.c ? <circle key={'c' + i} className="hitv" onClick={() => onDay && onDay(x.d)} cx={X(i)} cy={pt2 + ih - ih * x.c / cMax} r={2.6} fill="#2b4e92" /> : null)}
      {days.map((x, i) => i % 6 === 0 ? <text key={'t' + i} x={X(i)} y={h - 8} textAnchor="middle" fontSize={9} fill="#8a94a6">{dayLabel(x.d)}</text> : null)}
      <g fontSize={10} fill="#8a94a6"><rect x={pl} y={4} width={10} height={5} fill="#a8823a" /><text x={pl + 14} y={9}>时长(分钟)</text><circle cx={pl + 84} cy={6.5} r={3} fill="#2b4e92" /><text x={pl + 91} y={9}>次数</text></g>
    </svg>)
}

export function Donut({ cnt, onPlan }: { cnt: Record<string, number>; onPlan?: (k: string) => void }) {
  const W = 330, H = 240, cx = W / 2 - 44, cy = H / 2, R = 74, sw = 26
  const CLR: Record<string, string> = { 完整操作票: '#1e3a6e', 分段练习: '#2b4e92', 专项练习: '#a8823a', 错题重练: '#8fa3c2' }
  const keys = Object.keys(cnt), total = keys.reduce((a, k) => a + cnt[k], 0); const C = 2 * Math.PI * R; let acc = 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chsvg">
      {keys.map(k => { const frac = cnt[k] / total, off = acc; acc += frac; return <circle key={k} className="hitv" onClick={() => onPlan && onPlan(k)} cx={cx} cy={cy} r={R} fill="none" stroke={CLR[k] || '#8fa3c2'} strokeWidth={sw} strokeDasharray={`${(frac * C - 2.5).toFixed(1)} ${(C - frac * C + 2.5).toFixed(1)}`} strokeDashoffset={(-off * C).toFixed(1)} transform={`rotate(-90 ${cx} ${cy})`}><title>{`${k} · ${cnt[k]} 场 · ${Math.round(frac * 100)}%`}</title></circle> })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={26} fontFamily={MONO} fill="#14213d">{total}</text><text x={cx} y={cy + 15} textAnchor="middle" fontSize={10} fill="#8a94a6">近30天场次</text>
      {keys.map((k, i) => <g key={k} className="hitv" onClick={() => onPlan && onPlan(k)}><rect x={W - 108} y={62 + i * 30} width={9} height={9} rx={2} fill={CLR[k] || '#8fa3c2'} /><text x={W - 93} y={70 + i * 30} fontSize={11} fill="#6b7a90">{k}</text><text x={W - 93} y={82 + i * 30} fontSize={10} fontFamily={MONO} fill="#8a94a6">{cnt[k]} 场</text></g>)}
    </svg>)
}

export function Area({ weeks, reds, onWeek }: { weeks: number[]; reds: number[]; onWeek?: (w: number) => void }) {
  const W = 340, H = 240, pl = 34, pr = 14, pt2 = 20, pb = 30, iw = W - pl - pr, ih = H - pt2 - pb
  const vMax = Math.max(10, ...weeks); const X = (i: number) => pl + iw * (4 - i) / 4, Y = (v: number) => pt2 + ih - ih * v / vMax
  const pts = [4, 3, 2, 1, 0].map(i => `${X(i)},${Y(weeks[i])}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chsvg">
      <defs><linearGradient id="garea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(168,130,58,.30)" /><stop offset="1" stopColor="rgba(168,130,58,.02)" /></linearGradient></defs>
      {[0, .5, 1].map(k => <g key={k}><line x1={pl} y1={pt2 + ih * k} x2={W - pr} y2={pt2 + ih * k} stroke="#e6eaf1" /><text x={pl - 5} y={pt2 + ih * k + 3} textAnchor="end" fontSize={9} fill="#8a94a6">{Math.round(vMax * (1 - k))}</text></g>)}
      <polygon className="anim-poly" points={`${pl},${pt2 + ih} ${pts} ${W - pr},${pt2 + ih}`} fill="url(#garea)" />
      <polyline className="anim-line" points={pts} fill="none" stroke="#a8823a" strokeWidth={2} />
      {[4, 3, 2, 1, 0].map(i => <g key={i} className="hitv" onClick={() => onWeek && onWeek(i)}><title>{`${i === 0 ? '本周' : i + ' 周前'} · 扣分 ${weeks[i]}${reds[i] ? ' · 红线 ' + reds[i] + ' 次' : ''}`}</title><circle cx={X(i)} cy={Y(weeks[i])} r={8} fill="transparent" /><circle cx={X(i)} cy={Y(weeks[i])} r={3.4} fill="#a8823a" />{reds[i] > 0 && <path d={`M ${X(i) - 5} ${Y(weeks[i]) - 10} l 5 -8 l 5 8 z`} fill="#b03a2e" />}<text x={X(i)} y={H - 10} textAnchor="middle" fontSize={9.5} fill="#8a94a6">{i === 0 ? '本周' : i + '周前'}</text></g>)}
      <g fontSize={10} fill="#8a94a6"><path d={`M ${pl} 6 l 4 -7 l 4 7 z`} fill="#b03a2e" /><text x={pl + 12} y={8}>红线触发</text><rect x={pl + 70} y={2} width={10} height={4} fill="#a8823a" /><text x={pl + 84} y={8}>周扣分合计</text></g>
    </svg>)
}

export function heatBg(v: number) { const t = Math.max(0, Math.min(1, (v - 40) / 60)); return { background: `rgba(30,58,110,${(.08 + t * .75).toFixed(2)})`, color: t > .5 ? '#fff' : '#1e3a6e' } }
export function Heat({ dims, mine, team, onDim }: { dims: string[]; mine: number[]; team: number[]; onDim?: (i: number) => void }) {
  return (
    <div className="heatg"><div className="heath" /><div className="heath">我</div><div className="heath">班组均值</div><div className="heath">差距</div>
      {dims.map((n, i) => { const d = mine[i] - team[i]; return <span key={n} style={{ display: 'contents' }}>
        <div className="heatn hitv" onClick={() => onDim && onDim(i)}>{n}</div>
        <div className="heatc" style={heatBg(mine[i])} title={`我的「${n}」 ${mine[i]} 分`}>{mine[i]}</div>
        <div className="heatc" style={heatBg(team[i])} title={`班组均值 ${team[i]} 分（组织级口径）`}>{team[i]}</div>
        <div className={`heatc hitv ${d < 0 ? 'neg' : 'pos'}`} onClick={() => onDim && onDim(i)} title={`${n}明细与练习建议`}>{d >= 0 ? '+' + d : d}</div></span> })}
    </div>)
}

export function Gauge({ pct, post, onClick }: { pct: number; post: string; onClick?: () => void }) {
  const W = 330, H = 240, cx = W / 2, cy = H / 2 + 36, R = 92; const a0 = Math.PI * 1.17, a1 = -Math.PI * .17
  const arc = (r: number, f0: number, f1: number, col: string, w2: number, cls?: string) => { const s = a0 + (a1 - a0) * f0, e = a0 + (a1 - a0) * f1; const large = Math.abs(e - s) > Math.PI ? 1 : 0; return <path className={cls} d={`M ${cx + Math.cos(s) * r} ${cy - Math.sin(s) * r} A ${r} ${r} 0 ${large} 1 ${cx + Math.cos(e) * r} ${cy - Math.sin(e) * r}`} fill="none" stroke={col} strokeWidth={w2} strokeLinecap="round" /> }
  const na = a0 + (a1 - a0) * pct / 100
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chsvg hitv" onClick={onClick}>
      <defs><linearGradient id="ggau" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a8823a" /><stop offset="1" stopColor="#1e3a6e" /></linearGradient></defs>
      {arc(R, 0, 1, '#eef1f6', 15)}{arc(R, 0, pct / 100, 'url(#ggau)', 15, 'anim-line')}
      {[0, 25, 50, 75, 100].map(v => { const a = a0 + (a1 - a0) * v / 100; return <text key={v} x={cx + Math.cos(a) * (R + 20)} y={cy - Math.sin(a) * (R + 20) + 3} textAnchor="middle" fontSize={9} fill="#8a94a6">{v}</text> })}
      <line x1={cx} y1={cy} x2={cx + Math.cos(na) * (R - 24)} y2={cy - Math.sin(na) * (R - 24)} stroke="#14213d" strokeWidth={2.4} strokeLinecap="round" /><circle cx={cx} cy={cy} r={5} fill="#14213d" />
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize={34} fontFamily={MONO} fill="#1e3a6e">{pct}<tspan fontSize={15} fill="#8a94a6">%</tspan></text>
      <text x={cx} y={cy + 52} textAnchor="middle" fontSize={10.5} fill="#6b7a90">{post} · 胜任度测算</text><text x={cx} y={cy + 68} textAnchor="middle" fontSize={9} fill="#8a94a6">测算供参考，任职评定以人工审核为准</text>
    </svg>)
}

export type CurvePt = { id?: string; d: number; plan: string; mode: string; score: number; dur: number; vio: { lv: string }[]; hints?: unknown[] }
export function SessionCurve({ pts, show, w = 900, h = 250, onSess }: { pts: CurvePt[]; show: Record<string, boolean>; w?: number; h?: number; onSess?: (id: string) => void }) {
  const pl = 36, pr = 40, pt = 22, pb = 44, iw = w - pl - pr, ih = h - pt - pb; const n = pts.length
  const X = (i: number) => pl + iw * (n > 1 ? i / (n - 1) : .5), Y = (v: number) => pt + ih - ih * (v - 50) / 50
  const durMax = Math.max(30, ...pts.map(s => s.dur)); const YD = (v: number) => pt + ih - ih * v / durMax; const YC = (v: number) => pt + ih - ih * Math.min(4, v) / 4
  const line = pts.map((s, i) => `${X(i)},${Y(s.score)}`).join(' ')
  const avg7 = pts.map((s, i) => { const wdw = pts.filter((x, j) => j <= i && Math.abs(s.d - x.d) <= 7); return Math.round(wdw.reduce((a, x) => a + x.score, 0) / wdw.length) })
  const short = (s: CurvePt) => s.plan.replace('专项 · ', '').replace('分段 · ', '').replace('完整操作票', '完整票').replace(' → ', '→')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chsvg">
      {[50, 60, 70, 80, 90, 100].map(v => <g key={v}><line x1={pl} y1={Y(v)} x2={w - pr} y2={Y(v)} stroke="#eeece2" /><text x={pl - 6} y={Y(v) + 3} textAnchor="end" fontSize={9} fill="#8a94a6">{v}</text></g>)}
      {show.pass !== false && <><line x1={pl} y1={Y(80)} x2={w - pr} y2={Y(80)} stroke="#a8823a" strokeDasharray="6 5" strokeWidth={1.2} /><text x={w - pr + 4} y={Y(80) + 3} fontSize={9} fill="#a8823a">及格 80</text><line x1={pl} y1={Y(90)} x2={w - pr} y2={Y(90)} stroke="#1d7a4f" strokeDasharray="6 5" strokeWidth={1.2} /><text x={w - pr + 4} y={Y(90) + 3} fontSize={9} fill="#1d7a4f">考核 90</text></>}
      {show.dur && pts.map((s, i) => <rect key={'d' + i} className="anim-bar" x={X(i) - 7} y={YD(s.dur)} width={14} height={ih - (YD(s.dur) - pt)} rx={2} fill="rgba(168,130,58,.32)"><title>{`${dayLabel(s.d)} · 用时 ${s.dur} 分钟`}</title></rect>)}
      {show.vio && <><polyline points={pts.map((s, i) => `${X(i)},${YC(s.vio.length)}`).join(' ')} fill="none" stroke="#b03a2e" strokeWidth={1.4} strokeDasharray="3 3" />{pts.map((s, i) => <rect key={'v' + i} x={X(i) - 3} y={YC(s.vio.length) - 3} width={6} height={6} fill="#b03a2e" transform={`rotate(45 ${X(i)} ${YC(s.vio.length)})`} />)}</>}
      {show.hint && <><polyline points={pts.map((s, i) => `${X(i)},${YC((s.hints || []).length)}`).join(' ')} fill="none" stroke="#6b4fa0" strokeWidth={1.4} strokeDasharray="1 4" strokeLinecap="round" />{pts.map((s, i) => <circle key={'h' + i} cx={X(i)} cy={YC((s.hints || []).length)} r={2.6} fill="none" stroke="#6b4fa0" strokeWidth={1.4} />)}</>}
      {show.avg && <polyline points={pts.map((_, i) => `${X(i)},${Y(avg7[i])}`).join(' ')} fill="none" stroke="#8fa3c2" strokeWidth={2} strokeDasharray="8 5" opacity={.9} />}
      {show.score !== false && <><polygon points={`${pl},${Y(50)} ${line} ${X(n - 1)},${Y(50)}`} fill="rgba(43,78,146,.08)" /><polyline className="anim-line" points={line} fill="none" stroke="#2b4e92" strokeWidth={2.2} /></>}
      {pts.map((s, i) => { const red = s.vio.some(v => v.lv === 'red'); return <g key={'p' + i} className="hitv" onClick={() => onSess && s.id && onSess(s.id)}><title>{`${dayLabel(s.d)} · ${s.plan} · ${s.mode} · ${s.score} 分 · ${s.dur} 分钟 · 扣分 ${s.vio.length}${red ? ' · 红线' : ''}`}</title>
        <circle cx={X(i)} cy={Y(s.score)} r={10} fill="transparent" />{red && <circle cx={X(i)} cy={Y(s.score)} r={8} fill="none" stroke="#b03a2e" strokeWidth={1.5}><animate attributeName="r" values="6;10;6" dur="1.8s" repeatCount="indefinite" /></circle>}
        <circle cx={X(i)} cy={Y(s.score)} r={4} fill={red ? '#b03a2e' : s.mode === '考核模式' ? '#1e3a6e' : '#a8823a'} stroke="#fff" strokeWidth={1.5} />
        <text x={X(i)} y={Y(s.score) - 9} textAnchor="middle" fontSize={9.5} fontFamily={MONO} fill={s.score < 75 ? '#b8791d' : '#1e3a6e'}>{s.score}</text>
        <text x={X(i)} y={h - 28} textAnchor="middle" fontSize={9} fill="#8a94a6">{dayLabel(s.d)}</text><text x={X(i)} y={h - 16} textAnchor="middle" fontSize={8.5} fill="#b3bfcf">{short(s)}</text><text x={X(i)} y={h - 5} textAnchor="middle" fontSize={8.5} fill={s.mode === '考核模式' ? '#1e3a6e' : '#b3bfcf'}>{s.mode.slice(0, 2)}</text></g> })}
    </svg>)
}

export function MiniBars({ vals }: { vals: number[] }) {
  return <div className="mbars">{DIMS6.map((n, i) => <div key={n} className="mbar"><span>{n}</span><div className="mtrk"><div className="mfill" style={{ width: `${vals[i]}%`, background: vals[i] < 70 ? '#a8823a' : '#2b4e92' }} /></div><b>{vals[i]}</b></div>)}</div>
}

export type GNode = { id: string; x: number; y: number; s: string; t: string; v: string }
export type GEdge = { d: string; s: string; p?: number }
export function GrowthMap({ nodes, edges, onNode }: { nodes: GNode[]; edges: GEdge[]; onNode?: (id: string) => void }) {
  const NC: Record<string, string> = { done: '#1d7a4f', cur: '#a8823a', next: '#a8823a', ahead: '#1d7a4f', future: '#b9c4d2', feed: '#8fa3c2' }
  const EC: Record<string, string> = { done: 'gedge gdone', act: 'gedge gact', feed: 'gedge gfeed', future: 'gedge gfut' }
  return (
    <svg viewBox="0 0 880 600" className="chsvg gmap">
      <path d="M85,505 C230,430 340,360 465,285 C540,320 620,300 695,250 C760,205 812,142 818,88" fill="none" stroke="#eef1f6" strokeWidth={54} strokeLinecap="round" />
      <path d="M555,88 C640,98 725,125 795,158 M425,135 C550,143 675,150 793,162" fill="none" stroke="#f2f4f8" strokeWidth={30} strokeLinecap="round" />
      <g stroke="#dfe3ea" strokeDasharray="3 8"><line x1={315} y1={30} x2={315} y2={562} /><line x1={640} y1={30} x2={640} y2={562} /></g>
      <g fontSize={12.5} fill="#b3bfcf" letterSpacing={6} textAnchor="middle"><text x={165} y={582}>入职适应期</text><text x={478} y={582}>岗位强化期</text><text x={762} y={582}>胜任晋升期</text></g>
      {edges.map((e, i) => <path key={i} d={e.d} className={EC[e.s]} fill="none" />)}
      {edges.filter(e => e.p).map((e, i) => <circle key={'m' + i} r={3.4} fill={e.s === 'act' ? '#a8823a' : '#1d7a4f'} opacity={.9}><animateMotion dur={e.s === 'act' ? '2.2s' : '3.6s'} repeatCount="indefinite" path={e.d} /></circle>)}
      {nodes.map(n => { const c = NC[n.s], r = n.s === 'cur' ? 17 : n.s === 'next' ? 15 : n.s === 'future' ? 12 : 13; return <g key={n.id} className="hitv gnode" onClick={() => onNode && onNode(n.id)}><title>{`${n.t}${n.v ? ' · ' + n.v : ''}`}</title>
        {n.s === 'cur' && <circle cx={n.x} cy={n.y} r={26} fill="rgba(168,130,58,.2)"><animate attributeName="r" values="21;31;21" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values=".55;.1;.55" dur="2s" repeatCount="indefinite" /></circle>}
        <circle cx={n.x} cy={n.y} r={r} fill={n.s === 'done' || n.s === 'cur' ? c : '#fff'} stroke={c} strokeWidth={n.s === 'next' ? 2.6 : 2} strokeDasharray={n.s === 'next' ? '5 4' : undefined} />
        {n.s === 'done' && <path d={`M ${n.x - 6} ${n.y} l 4.2 5 l 8 -9.4`} stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" />}{n.s === 'cur' && <circle cx={n.x} cy={n.y} r={6} fill="#fff" />}{n.s === 'next' && <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize={14} fill="#a8823a" fontWeight={700}>!</text>}
        <text x={n.x} y={n.y + r + 19} textAnchor="middle" fontSize={13} fill="#14213d" fontWeight={600}>{n.t}</text>{n.v && <text x={n.x} y={n.y + r + 35} textAnchor="middle" fontSize={11.5} fontFamily={MONO} fill={n.s === 'cur' ? '#a8823a' : n.s === 'future' ? '#8a94a6' : '#1d7a4f'}>{n.v}</text>}</g> })}
      <g fontSize={11} fill="#8a94a6" transform="translate(26,26)"><circle cx={5} r={5} fill="#1d7a4f" /><text x={15} y={3}>已完成</text><circle cx={66} r={5} fill="#a8823a" /><text x={76} y={3}>进行中</text><circle cx={128} r={5} fill="#fff" stroke="#a8823a" strokeDasharray="3 3" /><text x={138} y={3}>待完成</text><circle cx={190} r={5} fill="#fff" stroke="#b9c4d2" /><text x={200} y={3}>规划中</text></g>
    </svg>)
}
