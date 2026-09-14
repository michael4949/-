import React from 'react'

export function Panel({ title, extra, children, className = '', bodyClass = '' }:
  { title?: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <div className={`panel flex flex-col min-h-0 ${className}`}>
      {title && (
        <div className="panel-head shrink-0">
          <span className="w-[3px] h-[13px]" style={{ background: 'var(--gold)' }} />
          <span className="text-[13px] font-semibold tracking-wide">{title}</span>
          <span className="ml-auto flex items-center gap-2">{extra}</span>
        </div>
      )}
      <div className={`flex-1 min-h-0 ${bodyClass}`}>{children}</div>
    </div>
  )
}

export function Stat({ k, v, u, d, accent }: { k: string; v: string; u?: string; d?: string; accent?: boolean }) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[11px] text-slate-500 mb-1">{k}</div>
      <div className="flex items-baseline gap-1">
        <span className="num text-[26px] leading-none font-semibold"
          style={{ color: accent ? 'var(--gold)' : 'var(--indigo)' }}>{v}</span>
        {u && <span className="text-[11px] text-slate-500">{u}</span>}
      </div>
      {d && <div className="text-[11px] text-slate-400 mt-1.5 leading-snug">{d}</div>}
    </div>
  )
}

export function Bars({ data, title, unit = '', max, color = 'var(--indigo-2)' }:
  { data: { label: string; v: number; note?: string }[]; title?: string; unit?: string; max?: number; color?: string }) {
  const m = max ?? Math.max(...data.map(d => d.v)) * 1.12
  return (
    <div>
      {title && <div className="text-[12px] text-slate-600 mb-2.5">{title}</div>}
      <div className="space-y-[7px]">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2.5">
            <div className="w-[104px] shrink-0 text-[11.5px] text-slate-600 text-right truncate">{d.label}</div>
            <div className="flex-1 h-[15px] bg-slate-100 relative overflow-hidden">
              <div className="h-full bar-grow"
                style={{ width: `${(d.v / m) * 100}%`, background: d.note ? 'var(--gold)' : color, animationDelay: `${i * 0.07}s` }} />
            </div>
            <div className="w-[76px] shrink-0 text-[11.5px] num" style={{ color: 'var(--ink)' }}>
              {d.v}{unit}{d.note && <span className="ml-1 text-[10px]" style={{ color: 'var(--gold)' }}>{d.note}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Radar({ data, size = 250 }: { data: { k: string; v: number; need: number }[]; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 42
  const n = data.length
  const pt = (i: number, val: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r * (val / 100), cy + Math.sin(a) * r * (val / 100)]
  }
  const poly = (key: 'v' | 'need') => data.map((d, i) => pt(i, d[key]).join(',')).join(' ')
  return (
    <svg width={size} height={size}>
      {[25, 50, 75, 100].map(g => (
        <polygon key={g} fill="none" stroke="#e6eaf1" strokeWidth={1}
          points={data.map((_, i) => pt(i, g).join(',')).join(' ')} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e6eaf1" strokeWidth={1} />
      })}
      <polygon points={poly('need')} fill="none" stroke="var(--gold)" strokeWidth={1.4} strokeDasharray="4 3"
        className="pop-in" style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: '.15s' }} />
      <polygon points={poly('v')} fill="rgba(43,78,146,.16)" stroke="var(--indigo-2)" strokeWidth={1.8}
        className="pop-in" style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: '.3s' }}>
        <animate attributeName="fill-opacity" values="1;.62;1" dur="4.2s" repeatCount="indefinite" />
      </polygon>
      {data.map((d, i) => {
        const [x, y] = pt(i, 116)
        return (
          <text key={d.k} x={x} y={y} fontSize={10.5} textAnchor="middle" dominantBaseline="middle"
            fill={d.v >= d.need ? '#4a5568' : 'var(--bad)'}>{d.k}</text>
        )
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, d.v)
        return <circle key={i} cx={x} cy={y} r={2.6} fill="var(--indigo-2)">
          <animate attributeName="r" values="2.6;4.2;2.6" dur="2.8s" begin={`${i * 0.32}s`} repeatCount="indefinite" />
        </circle>
      })}
    </svg>
  )
}

export function Donut({ data, size = 160 }: { data: { k: string; n: number; c: string }[]; size?: number }) {
  const total = data.reduce((a, b) => a + b.n, 0)
  const R = size / 2, r0 = R - 26
  let acc = 0
  const arcs = data.map(d => {
    const s = (acc / total) * Math.PI * 2 - Math.PI / 2
    acc += d.n
    const e = (acc / total) * Math.PI * 2 - Math.PI / 2
    const large = e - s > Math.PI ? 1 : 0
    const p = (ang: number, rr: number) => [R + Math.cos(ang) * rr, R + Math.sin(ang) * rr]
    const [x1, y1] = p(s, R - 4), [x2, y2] = p(e, R - 4)
    const [x3, y3] = p(e, r0), [x4, y4] = p(s, r0)
    return { d: `M${x1},${y1} A${R - 4},${R - 4} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 ${large} 0 ${x4},${y4} Z`, c: d.c, k: d.k }
  })
  return (
    <svg width={size} height={size}>
      {arcs.map((a, i) => <path key={a.k} d={a.d} fill={a.c} className="pop-in"
        style={{ animationDelay: `${i * 0.09}s`, transformOrigin: `${R}px ${R}px` }} />)}
      <text x={R} y={R - 6} textAnchor="middle" fontSize={19} className="num" fill="var(--ink)" fontWeight={600}>
        {(total / 1000).toFixed(1)}k</text>
      <text x={R} y={R + 12} textAnchor="middle" fontSize={10} fill="#7b8798">资产总量</text>
    </svg>
  )
}

export function Progress({ v, color }: { v: number; color?: string }) {
  return (
    <div className="h-[7px] bg-slate-100 w-full overflow-hidden">
      <div className="h-full bar-grow"
        style={{ width: `${v}%`, background: color ?? (v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--indigo-2)' : 'var(--gold)') }} />
    </div>
  )
}

export function Empty({ t }: { t: string }) {
  return <div className="h-full flex items-center justify-center text-[12px] text-slate-400">{t}</div>
}

export function heatColor(v: number) {
  const t = Math.max(0, Math.min(1, (v - 60) / 40))
  const r = Math.round(247 - t * 217), g = Math.round(241 - t * 183), b = Math.round(226 - t * 116)
  return `rgb(${r},${g},${b})`
}


export function CountUp({ to, dec = 0, dur = 1200, suffix = '' }: { to: number; dec?: number; dur?: number; suffix?: string }) {
  const [v, setV] = React.useState(0)
  React.useEffect(() => {
    let raf = 0, t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / dur)
      setV(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, dur])
  return <>{dec ? v.toFixed(dec) : Math.round(v).toLocaleString()}{suffix}</>
}
