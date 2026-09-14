/* 页面背景漂浮动效层：柔光晕、缓升微粒、呼吸圆环与掠过的光带，铺在每个模块页与首页之下 */
import { useMemo } from 'react'

export function Ambient({ density = 1, orbs = true }: { density?: number; orbs?: boolean }) {
  const motes = useMemo(() => Array.from({ length: Math.round(30 * density) }).map((_, i) => ({
    id: i, left: (i * 37 + 9) % 100, size: 3 + ((i * 7) % 8), dur: 15 + ((i * 5) % 17), delay: -((i * 3.7) % 21),
    kind: i % 5, hue: i % 3, dx: ((i * 13) % 60) - 30,
  })), [density])
  const rings = useMemo(() => [{ l: 12, t: 22, s: 140, d: 0 }, { l: 78, t: 58, s: 200, d: -3 }, { l: 46, t: 74, s: 90, d: -6 }], [])
  return (
    <div className="ambient" aria-hidden>
      {orbs && <><div className="orb o1" /><div className="orb o2" /><div className="orb o3" /><div className="orb o4" /></>}
      <div className="grain" />
      {rings.map((r, i) => <span key={i} className="ring" style={{ left: `${r.l}%`, top: `${r.t}%`, width: r.s, height: r.s, animationDelay: `${r.d}s` }} />)}
      {[[8, 30], [88, 20], [64, 84]].map(([l, t], i) => (
        <svg key={i} className="hex" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${-i * 4}s` }} width="46" height="46" viewBox="0 0 40 40">
          <path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" fill="none" stroke="#2f6df6" strokeWidth="1.2" />
          <path d="M20 10 L29 15 V25 L20 30 L11 25 V15 Z" fill="none" stroke="#19b8d8" strokeWidth="1" />
        </svg>
      ))}
      {motes.map(m => (
        <span key={m.id} className={`mote k${m.kind} c${m.hue}`}
          style={{ left: `${m.left}%`, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s`, ['--dx' as string]: `${m.dx}px` }} />
      ))}
      <div className="streak s1" /><div className="streak s2" />
    </div>
  )
}
