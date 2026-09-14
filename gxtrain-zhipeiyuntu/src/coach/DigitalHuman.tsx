/* 数字人形象卡：以教练形象图为本体，呼吸、说话节奏、视线跟随、点头摇头、姿态前倾、光环与声波 */
import { useEffect, useRef, useState } from 'react'
import { coachImg } from './images'
import { POSE_LABEL } from './data'

export type DHState = { pose: string; speaking: boolean; nodAt: number; shakeAt: number }
export function DigitalHuman({ name, role, img, tint, dh, size = 'lg', gaze = true }:
  { name: string; role?: string; img: string; tint: string; dh: DHState; size?: 'lg' | 'sm'; gaze?: boolean }) {
  const card = useRef<HTMLDivElement>(null)
  const [look, setLook] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (!gaze) return
    const f = (e: PointerEvent) => {
      const r = card.current?.getBoundingClientRect(); if (!r || !r.width) return
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(200, innerWidth * .5)
      const dy = (e.clientY - (r.top + r.height * .4)) / Math.max(200, innerHeight * .5)
      setLook({ x: Math.max(-1, Math.min(1, dx)) * 6, y: Math.max(-1, Math.min(1, dy)) * 3 })
    }
    document.addEventListener('pointermove', f, { passive: true }); return () => document.removeEventListener('pointermove', f)
  }, [gaze])
  const src = coachImg(img, size === 'lg')
  const label = dh.speaking ? '正在说话' : (POSE_LABEL[dh.pose] || dh.pose)
  const lean = ({ call: 1.5, confirm: 2, point: 2.5, explain: .5, stop: 5, correct: 1, listen: -1 } as Record<string, number>)[dh.pose] || 0
  const yaw = ({ point: -8, explain: 3, correct: -3, listen: 4 } as Record<string, number>)[dh.pose] || 0
  const pitch = ({ call: -1, confirm: 1, explain: -1, stop: -3, correct: 1, listen: 2, nod: 6 } as Record<string, number>)[dh.pose] || 0
  return (
    <div className={`pav ${size} ${dh.speaking ? 'talk' : ''}`} data-pose={dh.pose} style={{ ['--tint' as string]: tint }}>
      <div className="pav-halo" /><div className="pav-glow" />
      <div ref={card} key={`${dh.nodAt}-${dh.shakeAt}`} className={`pav-card ${Date.now() - dh.nodAt < 1500 ? 'nod' : ''} ${Date.now() - dh.shakeAt < 1500 ? 'shake' : ''}`}
        style={{ transform: `translate3d(${(yaw + look.x) * .35}px,0,0) rotateY(${(yaw + look.x) * .9}deg) rotateX(${-(pitch + look.y) * .7}deg) scale(${1 + lean * .012})` }}>
        {src ? <img className="pav-img" src={src} alt={name} draggable={false} style={{ transform: `translate3d(${-(yaw + look.x) * .5}px,${-(pitch + look.y) * .5}px,0) scale(${1.04 + lean * .006})` }} />
          : <div className="pav-img pav-fallback">{name.slice(0, 1)}</div>}
        <div className="pav-shade" /><div className="pav-sheen" />
      </div>
      <div className={`pav-wave ${dh.speaking ? 'on' : ''}`}>{Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ animationDelay: `${i * .11}s` }} />)}</div>
      <div className={`pav-state ${dh.speaking ? 'talk' : ''}`}><em /><span>{label}</span></div>
      {role && <div className="pav-role"><b>{name}</b><span>{role}</span></div>}
    </div>
  )
}
