/* 共用图表：折线（含预测带与目标线）、热力矩阵、散点九宫格、梯队金字塔、流向图、柱图、环形进度、甘特、迷你线
   全部按容器真实像素绘制，文字不随容器缩放变形 */
import { useWidth } from './drill'
import { heatColor } from './ui'

export const heat = heatColor
export const fmtN = (v: number, dec = 1) => (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(dec))

export type Series = { name: string; color: string; data: (number | null)[]; dash?: boolean; area?: boolean }
export function LineChart({ series, labels, h = 160, band, target, yMin, yMax, unit = '', every }:
  { series: Series[]; labels: string[]; h?: number; band?: { lo: number[]; hi: number[]; from: number; color?: string }; target?: { v: number; label: string }; yMin?: number; yMax?: number; unit?: string; every?: number }) {
  const [ref, w0] = useWidth<HTMLDivElement>()
  const w = Math.max(320, w0), pad = 34, top = 18, bottom = 22
  const all = series.flatMap(s => s.data.filter((x): x is number => x != null)).concat(band ? [...band.lo, ...band.hi] : []).concat(target ? [target.v] : [])
  const mn = yMin ?? Math.min(...all) - (Math.max(...all) - Math.min(...all)) * .15, mx = yMax ?? Math.max(...all) + (Math.max(...all) - Math.min(...all)) * .12
  const n = labels.length
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (w - pad * 2)
  const y = (v: number) => top + (1 - (v - mn) / Math.max(.001, mx - mn)) * (h - top - bottom)
  const ev = every ?? Math.max(1, Math.ceil(n / Math.max(4, Math.floor((w - pad * 2) / 60))))
  return (
    <div ref={ref} className="w-full">{w0 > 0 && (
      <svg width={w} height={h}>
        {[0, .25, .5, .75, 1].map(g => <line key={g} x1={pad} x2={w - pad} y1={y(mn + (mx - mn) * g)} y2={y(mn + (mx - mn) * g)} stroke="#e8edf5" />)}
        {[0, .5, 1].map(g => <text key={'t' + g} x={pad - 6} y={y(mn + (mx - mn) * g) + 3} fontSize="9.5" fill="#8a94a6" textAnchor="end">{fmtN(mn + (mx - mn) * g, 0)}{unit}</text>)}
        {band && <polygon points={[...band.lo.map((v, i) => `${x(band.from + i)},${y(v)}`), ...band.hi.map((v, i) => `${x(band.from + i)},${y(v)}`).reverse()].join(' ')} fill={band.color ?? 'rgba(47,109,246,.12)'} />}
        {band && <line x1={x(band.from)} x2={x(band.from)} y1={top} y2={h - bottom} stroke="#94a3b8" strokeDasharray="3 3" />}
        {band && <text x={x(band.from) + 4} y={top + 9} fontSize="9.5" fill="#64748b">预测</text>}
        {target && <><line x1={pad} x2={w - pad} y1={y(target.v)} y2={y(target.v)} stroke="var(--gold)" strokeDasharray="5 4" /><text x={w - pad} y={y(target.v) - 4} fontSize="9.5" fill="var(--gold)" textAnchor="end">{target.label}</text></>}
        {series.map((s, k) => {
          const pts = s.data.map((v, i) => v == null ? null : `${x(i)},${y(v)}`).filter(Boolean).join(' ')
          const first = s.data.findIndex(v => v != null), last = s.data.length - 1 - [...s.data].reverse().findIndex(v => v != null)
          return <g key={s.name}>
            {s.area && <polygon points={`${x(first)},${y(mn)} ${pts} ${x(last)},${y(mn)}`} fill={s.color} opacity=".08" />}
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinejoin="round" strokeDasharray={s.dash ? '5 4' : '2400'} strokeDashoffset={s.dash ? 0 : 2400} style={s.dash ? {} : { animation: 'dash-draw 1.6s ease-out forwards', animationDelay: `${k * .2}s` }} />
            {s.data.map((v, i) => v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={s.color} />)}
          </g>
        })}
        {labels.map((l, i) => (i % ev === 0 || i === n - 1) && <text key={l + i} x={x(i)} y={h - 5} fontSize="9.5" fill="#8a94a6" textAnchor="middle">{l}</text>)}
        {series.map((s, i) => <g key={'l' + s.name}><rect x={pad + i * 110} y={3} width="10" height="3" rx="1.5" fill={s.color} /><text x={pad + i * 110 + 14} y={7} fontSize="9.5" fill="#64748b">{s.name}</text></g>)}
        <style>{`@keyframes dash-draw { to { stroke-dashoffset: 0 } }`}</style>
      </svg>)}
    </div>
  )
}

export function Heatmap({ rows, cols, cells, fmt = v => String(v), colorOf = v => heat(v), onCell, cellH = 30, rowW = 110, sel }:
  { rows: string[]; cols: string[]; cells: number[][]; fmt?: (v: number) => string; colorOf?: (v: number) => string; onCell?: (r: number, c: number) => void; cellH?: number; rowW?: number; sel?: [number, number] | null }) {
  return (
    <div className="overflow-auto scroll">
      <div className="grid" style={{ gridTemplateColumns: `${rowW}px repeat(${cols.length}, minmax(52px, 1fr))` }}>
        <div />
        {cols.map(c => <div key={c} className="text-[10.5px] text-center pb-1.5 font-medium text-slate-600 truncate px-1">{c}</div>)}
        {rows.map((r, ri) => <div key={r} className="contents">
          <div className="text-[11.5px] pr-2 flex items-center justify-end font-medium truncate">{r}</div>
          {cols.map((c, ci) => { const v = cells[ri][ci]; const dark = colorOf(v).startsWith('rgb(') && parseInt(colorOf(v).slice(4)) < 120; return (
            <button key={c} onClick={() => onCell?.(ri, ci)} className="m-[2px] rounded-md cell-in transition-transform hover:scale-[1.05] text-center" style={{ height: cellH, background: colorOf(v), animationDelay: `${(ri * cols.length + ci) * .012}s`, outline: sel && sel[0] === ri && sel[1] === ci ? '2px solid var(--gold)' : 'none' }}>
              <span className="num text-[11px] font-semibold" style={{ color: dark ? '#fff' : 'var(--ink)' }}>{fmt(v)}</span>
            </button>) })}
        </div>)}
      </div>
    </div>
  )
}

export type Pt = { x: number; y: number; r?: number; label: string; color?: string; grp?: string; id?: string }
export function Scatter({ points, xLabel, yLabel, h = 260, quadrants, onPoint, xMin = 0, xMax = 100, yMin = 0, yMax = 100, sel, quadLabels }:
  { points: Pt[]; xLabel: string; yLabel: string; h?: number; quadrants?: boolean; onPoint?: (p: Pt) => void; xMin?: number; xMax?: number; yMin?: number; yMax?: number; sel?: string; quadLabels?: string[] }) {
  const [ref, w0] = useWidth<HTMLDivElement>()
  const w = Math.max(320, w0), pad = 36
  const x = (v: number) => pad + (v - xMin) / (xMax - xMin) * (w - pad * 2)
  const y = (v: number) => h - pad + 6 - (v - yMin) / (yMax - yMin) * (h - pad * 2)
  const thirds = [1 / 3, 2 / 3]
  return (
    <div ref={ref} className="w-full">{w0 > 0 && (
      <svg width={w} height={h}>
        <rect x={pad} y={pad - 6} width={w - pad * 2} height={h - pad * 2} fill="rgba(255,255,255,.4)" stroke="#e8edf5" />
        {quadrants && thirds.map(t => <g key={t}><line x1={x(xMin + (xMax - xMin) * t)} x2={x(xMin + (xMax - xMin) * t)} y1={pad - 6} y2={h - pad} stroke="#dfe5ee" strokeDasharray="4 4" /><line x1={pad} x2={w - pad} y1={y(yMin + (yMax - yMin) * t)} y2={y(yMin + (yMax - yMin) * t)} stroke="#dfe5ee" strokeDasharray="4 4" /></g>)}
        {quadrants && quadLabels && quadLabels.map((l, i) => { const cx = x(xMin + (xMax - xMin) * ((i % 3) + .5) / 3), cy = y(yMin + (yMax - yMin) * (2 - Math.floor(i / 3) + .5) / 3); return <text key={i} x={cx} y={cy - (h - pad * 2) / 6 + 12} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{l}</text> })}
        {points.map((p, i) => <g key={p.id ?? p.label} className="gnode pop-in" style={{ transformOrigin: `${x(p.x)}px ${y(p.y)}px`, animationDelay: `${i * .02}s` }} onClick={() => onPoint?.(p)}>
          {sel === (p.id ?? p.label) && <circle cx={x(p.x)} cy={y(p.y)} r={(p.r ?? 6) + 5} fill="none" stroke="var(--gold)" strokeWidth="2" />}
          <circle cx={x(p.x)} cy={y(p.y)} r={p.r ?? 6} fill={p.color ?? 'var(--ai)'} opacity=".85" stroke="#fff" strokeWidth="1.2" />
          {(p.r ?? 6) >= 7 && <text x={x(p.x)} y={y(p.y) - (p.r ?? 6) - 3} fontSize="9.5" fill="#4d5f7d" textAnchor="middle">{p.label}</text>}
        </g>)}
        <text x={w / 2} y={h - 4} fontSize="10" fill="#64748b" textAnchor="middle">{xLabel}</text>
        <text x={12} y={h / 2} fontSize="10" fill="#64748b" textAnchor="middle" transform={`rotate(-90 12 ${h / 2})`}>{yLabel}</text>
      </svg>)}
    </div>
  )
}

export function Pyramid({ levels, h = 190 }: { levels: { k: string; n: number; c?: string; note?: string }[]; h?: number }) {
  const [ref, w0] = useWidth<HTMLDivElement>()
  const w = Math.max(280, w0), rowH = (h - 10) / levels.length, max = Math.max(...levels.map(l => l.n))
  return (
    <div ref={ref} className="w-full">{w0 > 0 && (
      <svg width={w} height={h}>
        {levels.map((l, i) => { const bw = 130 + (l.n / max) * (w - 270); const x0 = (w - 90 - bw) / 2; return <g key={l.k} className="pop-in" style={{ transformOrigin: `${w / 2}px ${5 + i * rowH + rowH / 2}px`, animationDelay: `${i * .08}s` }}>
          <rect x={x0} y={5 + i * rowH + 2} width={bw} height={rowH - 4} rx="6" fill={l.c ?? (i % 2 ? 'var(--indigo-2)' : 'var(--indigo)')} opacity=".9" />
          <text x={x0 + bw / 2} y={5 + i * rowH + rowH / 2 + 4} fontSize="11" fill="#fff" textAnchor="middle" fontWeight="600">{l.k} · {l.n.toLocaleString()}</text>
          {l.note && <text x={w - 6} y={5 + i * rowH + rowH / 2 + 4} fontSize="10" fill={l.note.startsWith('-') ? 'var(--bad)' : 'var(--ok)'} textAnchor="end">{l.note}</text>}
        </g> })}
      </svg>)}
    </div>
  )
}

export type FlowNode = { id: string; label: string; col: number; color?: string }
export type FlowLink = { from: string; to: string; v: number }
export function Flow({ nodes, links, h = 260, onNode }: { nodes: FlowNode[]; links: FlowLink[]; h?: number; onNode?: (n: FlowNode) => void }) {
  const [ref, w0] = useWidth<HTMLDivElement>()
  const w = Math.max(360, w0)
  const cols = Math.max(...nodes.map(n => n.col)) + 1
  const colX = (c: number) => 20 + c * ((w - 40 - 120) / Math.max(1, cols - 1))
  const size: Record<string, number> = {}
  nodes.forEach(n => { size[n.id] = Math.max(links.filter(l => l.from === n.id).reduce((a, l) => a + l.v, 0), links.filter(l => l.to === n.id).reduce((a, l) => a + l.v, 0), 1) })
  const pos: Record<string, { y: number; h: number }> = {}
  for (let c = 0; c < cols; c++) { const ns = nodes.filter(n => n.col === c); const total = ns.reduce((a, n) => a + size[n.id], 0); const gap = 10; const avail = h - 20 - gap * (ns.length - 1); let y = 10; ns.forEach(n => { const hh = Math.max(14, size[n.id] / total * avail); pos[n.id] = { y, h: hh }; y += hh + gap }) }
  const off: Record<string, { out: number; in: number }> = {}; nodes.forEach(n => off[n.id] = { out: 0, in: 0 })
  return (
    <div ref={ref} className="w-full">{w0 > 0 && (
      <svg width={w} height={h}>
        {links.map((l, i) => { const a = nodes.find(n => n.id === l.from)!, b = nodes.find(n => n.id === l.to)!; const pa = pos[a.id], pb = pos[b.id]; const ha = l.v / size[a.id] * pa.h, hb = l.v / size[b.id] * pb.h; const y1 = pa.y + off[a.id].out, y2 = pb.y + off[b.id].in; off[a.id].out += ha; off[b.id].in += hb; const x1 = colX(a.col) + 120, x2 = colX(b.col); const mx = (x1 + x2) / 2; return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2} L${x2},${y2 + hb} C${mx},${y2 + hb} ${mx},${y1 + ha} ${x1},${y1 + ha} Z`} fill={a.color ?? 'var(--ai)'} opacity=".18" className="fade-in" style={{ animationDelay: `${i * .04}s` }} /> })}
        {nodes.map(n => <g key={n.id} className="gnode" onClick={() => onNode?.(n)}><rect x={colX(n.col)} y={pos[n.id].y} width="120" height={pos[n.id].h} rx="6" fill={n.color ?? 'var(--indigo)'} opacity=".92" /><text x={colX(n.col) + 60} y={pos[n.id].y + pos[n.id].h / 2 + 4} fontSize="10.5" fill="#fff" textAnchor="middle">{n.label}</text></g>)}
      </svg>)}
    </div>
  )
}

export function Columns({ data, h = 140, color = 'var(--indigo-2)', unit = '', max }: { data: { label: string; v: number; color?: string; note?: string }[]; h?: number; color?: string; unit?: string; max?: number }) {
  const m = max ?? Math.max(...data.map(d => d.v)) * 1.15
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height: h }}>
      {data.map((d, i) => <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
        <span className="num text-[10px] text-slate-500 mb-0.5">{fmtN(d.v)}{unit}</span>
        <div className="w-full rounded-t-md bar-grow" style={{ height: `${Math.max(3, d.v / m * (h - 34))}px`, background: d.color ?? (d.note ? 'var(--gold)' : color), transformOrigin: 'bottom', animation: 'col-grow .8s cubic-bezier(.2,.85,.25,1) both', animationDelay: `${i * .05}s` }} />
        <span className="text-[9.5px] text-slate-500 mt-1 truncate w-full text-center">{d.label}</span>
      </div>)}
      <style>{`@keyframes col-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }`}</style>
    </div>
  )
}

export function Ring({ v, size = 88, color = 'var(--ai)', label, sub, stroke = 9 }: { v: number; size?: number; color?: string; label?: string; sub?: string; stroke?: number }) {
  const r = size / 2 - stroke, c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="gauge-ring"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f6" strokeWidth={stroke} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * Math.min(1, v / 100)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .8s' }} /></svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="num font-semibold" style={{ fontSize: size * .24, color: 'var(--indigo)' }}>{label ?? `${Math.round(v)}%`}</span>{sub && <span className="text-[9.5px] text-slate-500">{sub}</span>}</div>
    </div>
  )
}

export type GanttRow = { name: string; sub?: string; spans: { from: number; to: number; color?: string; label?: string; st?: string }[] }
export function Gantt({ rows, cols = 12, colLabel = i => `${i + 1} 月`, now, onSpan }: { rows: GanttRow[]; cols?: number; colLabel?: (i: number) => string; now?: number; onSpan?: (r: GanttRow, i: number) => void }) {
  return (
    <div className="w-full">
      <div className="grid text-[10px] text-slate-500 mb-1" style={{ gridTemplateColumns: `150px repeat(${cols}, 1fr)` }}><div />{Array.from({ length: cols }).map((_, i) => <div key={i} className="text-center">{colLabel(i)}</div>)}</div>
      {rows.map((r, ri) => (
        <div key={r.name + ri} className="grid items-center relative" style={{ gridTemplateColumns: `150px repeat(${cols}, 1fr)`, minHeight: 30 }}>
          <div className="text-[11.5px] pr-2 truncate"><span className="font-medium">{r.name}</span>{r.sub && <span className="text-slate-400 text-[10px] ml-1">{r.sub}</span>}</div>
          <div className="relative h-[22px]" style={{ gridColumn: `2 / span ${cols}` }}>
            {Array.from({ length: cols }).map((_, i) => <span key={i} className="absolute top-0 bottom-0 border-l" style={{ left: `${i / cols * 100}%`, borderColor: 'var(--line-2)' }} />)}
            {now !== undefined && <span className="absolute top-[-3px] bottom-[-3px] w-[2px]" style={{ left: `${now / cols * 100}%`, background: 'var(--gold)' }} />}
            {r.spans.map((s, i) => <button key={i} onClick={() => onSpan?.(r, i)} className="absolute top-[3px] h-[16px] rounded-md text-[9.5px] text-white px-1.5 truncate text-left bar-grow" style={{ left: `${s.from / cols * 100}%`, width: `${Math.max(.6, s.to - s.from) / cols * 100}%`, background: s.color ?? 'var(--ai)', opacity: s.st === '已完成' ? .55 : 1, animationDelay: `${(ri * 3 + i) * .05}s` }}>{s.label}</button>)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Sparkline({ v, w = 64, h = 20, color = 'var(--ai)' }: { v: number[]; w?: number; h?: number; color?: string }) {
  const mn = Math.min(...v), mx = Math.max(...v)
  return <svg width={w} height={h}><polyline fill="none" stroke={color} strokeWidth="1.5" points={v.map((y, i) => `${(i / (v.length - 1)) * (w - 2) + 1},${h - 1 - (y - mn) / Math.max(1, mx - mn) * (h - 2)}`).join(' ')} /></svg>
}
