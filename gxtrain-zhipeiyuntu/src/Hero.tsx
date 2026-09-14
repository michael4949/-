import { useEffect, useState } from 'react'
import { OVERVIEW, PHOTO, PHOTO_ALT, NODES } from './data'
import { UNIT_GROUPS, unitsOf, UNIT_TOTAL_PEOPLE } from './units'
import { AIBrain, GuangxiMap, TalentLadder, Tower, GridMark } from './deco'
import { PowerCorridor, CultureBlock, NeuralBlock } from './scenes'
import { Ambient } from './Ambient'

function useCountUp(target: number, dur = 1500, dec = 0) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0, t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / dur)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, dur])
  return dec ? v.toFixed(dec) : Math.round(v).toLocaleString()
}

function Metric({ o, i }: { o: typeof OVERVIEW[number]; i: number }) {
  const raw = parseFloat(o.v.replace(/,/g, ''))
  const v = useCountUp(raw, 1400 + i * 120, o.v.includes('.') ? 1 : 0)
  return (
    <div className="flex-1 px-5 py-3 an-rise relative" style={{ animationDelay: `${0.55 + i * 0.08}s`, borderLeft: i ? '1px solid rgba(30,58,110,.10)' : undefined }}>
      <div className="text-[11.5px] text-slate-600">{o.k}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={`num text-[27px] leading-none font-semibold ${i % 2 ? 'gold-grad' : 'num-grad'}`}>{v}</span>
        <span className="text-[11px] text-slate-500">{o.u}</span>
      </div>
      <div className="text-[10.5px] text-slate-500 mt-1">{o.d}</div>
    </div>
  )
}

export default function Hero({ onOpen }: { onOpen: (node: string, tab: string) => void }) {
  const [src, setSrc] = useState(0)
  const photos = [PHOTO, PHOTO_ALT]

  return (
    <div className="relative w-full h-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#e9f3fb 0%,#ddeaf6 40%,#cfe2f1 100%)' }}>

      {/* ===== 背景实景 ===== */}
      <div className="absolute inset-0 z-0">
        {src < photos.length ? (
          <img src={photos[src]} alt="" onError={() => setSrc(s => s + 1)}
            className="absolute left-0 bottom-0 w-full object-cover an-wipe"
            style={{ height: '78%', objectPosition: 'center 55%' }} />
        ) : <CityArt />}
        {/* 顶部融入天空，底部压深 */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg,' +
            'rgba(233,243,251,.97) 0%, rgba(233,243,251,.84) 15%, rgba(236,245,252,.40) 25%,' +
            'rgba(255,255,255,0) 36%, rgba(255,255,255,0) 62%,' +
            'rgba(10,28,56,.18) 78%, rgba(10,28,56,.48) 92%, rgba(8,24,50,.62) 100%)',
        }} />
        {/* 标题背光 */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{
          top: -30, width: 1120, height: 360,
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,.95) 0%, rgba(255,255,255,.6) 42%, transparent 72%)',
        }} />
        <div className="absolute inset-0 opacity-[.32]" style={{
          backgroundImage: 'linear-gradient(rgba(30,58,110,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(30,58,110,.07) 1px,transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
      </div>

      {/* ===== 南网：输电走廊（贯穿江面） ===== */}
      <div className="absolute left-0 right-0 z-[2] pointer-events-none" style={{ bottom: 96, height: 220 }}>
        <PowerCorridor />
      </div>

      {/* ===== 广西：铜鼓太阳纹 ===== */}
      <div className="absolute left-[42px] top-[54px] z-[2] pointer-events-none hidden lg:block opacity-90"><CultureBlock size={148} /></div>
      <div className="absolute right-[42px] top-[54px] z-[2] pointer-events-none hidden lg:block opacity-90"><CultureBlock size={148} /></div>

      {/* ===== AI：神经网络 ===== */}
      <div className="absolute left-1/2 -translate-x-1/2 z-[2] pointer-events-none hidden xl:block opacity-90" style={{ bottom: 138 }}>
        <NeuralBlock w={330} h={112} />
      </div>

      {/* 漂浮微粒与光晕 */}
      <div className="absolute inset-0 z-[3]"><Ambient density={.7} orbs={false} /></div>

      {/* 缓慢掠过的光带 */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-40%', left: 0, width: '32%', height: '180%',
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.38), transparent)',
          transform: 'rotate(8deg)', animation: 'sheen 13s ease-in-out infinite',
        }} />
      </div>

      {/* ===== 主体装饰：铁塔与 AI 点阵脑（贴合底图，不做漂浮） ===== */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute left-[4px] bottom-[150px] hidden 2xl:block"><Tower h={206} opacity={0.3} /></div>
        <div className="absolute right-[4px] bottom-[158px] hidden 2xl:block"><Tower h={184} opacity={0.26} /></div>
        <div className="absolute left-[46px] bottom-[176px] hidden xl:block"><AIBrain size={198} flip /></div>
        <div className="absolute right-[46px] bottom-[176px] hidden xl:block"><AIBrain size={198} /></div>
      </div>

      {/* ===== 内容层 ===== */}
      <div className="relative z-10 h-full flex flex-col">
        {/* 标题 */}
        <div className="shrink-0 text-center pt-6">
          <div className="an-rise" style={{ animationDelay: '.05s' }}>
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,.72)', border: '1px solid rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px -12px rgba(30,58,110,.35), inset 0 0 0 1px rgba(30,58,110,.08)' }}>
              <GridMark size={19} />
              <span className="text-[12px] tracking-[.24em]" style={{ color: 'var(--indigo)' }}>南方电网广西电网有限责任公司</span>
            </div>
          </div>
          <h1 className="serif font-semibold hero-title-glow an-rise mt-3"
            style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: '.16em', color: '#0c2950', animationDelay: '.15s' }}>智培云图</h1>
          <div className="an-rise mx-auto mt-2.5" style={{ animationDelay: '.25s', width: 480, height: 3, borderRadius: 3, background: 'linear-gradient(90deg,transparent,var(--gold-2) 30%,var(--ai-2) 70%,transparent)' }} />
          <div className="an-rise hero-title-glow mt-2.5" style={{ animationDelay: '.3s', fontSize: 23, letterSpacing: '.24em', color: '#153560', fontWeight: 600 }}>
            人才培养数智平台
          </div>
          <div className="an-rise mt-3.5 flex justify-center" style={{ animationDelay: '.4s' }}>
            <div className="sheen inline-flex items-center gap-3 px-7 py-2 text-white text-[15px] tracking-[.08em] rounded-full"
              style={{ background: 'linear-gradient(90deg,#16345e 0%,#2f6df6 45%,#19b8d8 75%,#00a651 100%)', boxShadow: '0 14px 30px -10px rgba(47,109,246,.6)' }}>
              <span>人才可视</span><Dot /><span>经验可传承</span><Dot /><span>能力可度量</span>
            </div>
          </div>
        </div>

        {/* 三栏 */}
        <div className="flex-1 min-h-0 flex items-start justify-center gap-6 pt-6 px-4">
          <div className="an-rise hidden xl:block" style={{ animationDelay: '.6s' }}>
            <Card title="覆盖范围" sub={`28 个一级单位 · ${UNIT_TOTAL_PEOPLE.toLocaleString()} 人`}>
              <GuangxiMap w={286} />
              <div className="grid grid-cols-5 gap-1 mt-1.5">
                {UNIT_GROUPS.map((g, i) => {
                  const us = unitsOf(g)
                  const n = g === '地市供电局' ? 14 : g === '县域新电力' ? 40 : us.length
                  const unit = g === '县域新电力' ? '家' : '个'
                  return (
                    <div key={g} className="text-center py-1 an-rise" style={{ background: 'rgba(30,58,110,.05)', animationDelay: `${.8 + i * .08}s` }}>
                      <div className="num text-[14px] leading-none font-semibold" style={{ color: i % 2 ? 'var(--gold)' : 'var(--indigo)' }}>{n}<span className="text-[9px] font-normal text-slate-500 ml-[1px]">{unit}</span></div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5 leading-none">{g === '本部职能部门' ? '本部部门' : g}</div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className="an-rise" style={{ animationDelay: '.5s', width: 452 }}>
            <div className="grid grid-cols-2 gap-2.5">
              {NODES.map((nd, i) => (
                <button key={nd.id} onClick={() => onOpen(nd.id, nd.features[0].id)}
                  className="group flex items-center gap-2.5 px-3 py-2.5 text-left transition-all hover:-translate-y-[2px] rounded-2xl relative overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,.78)', border: '1px solid rgba(255,255,255,.9)', backdropFilter: 'blur(14px)',
                    boxShadow: '0 12px 30px -14px rgba(30,58,110,.35), inset 0 0 0 1px rgba(30,58,110,.07)', gridColumn: i === 6 ? 'span 2' : undefined,
                  }}>
                  <span className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: nd.accent === 'gold' ? 'radial-gradient(circle, rgba(216,181,101,.35), transparent 70%)' : 'radial-gradient(circle, rgba(47,109,246,.28), transparent 70%)' }} />
                  <span className="shrink-0 w-[28px] h-[28px] rounded-[9px] flex items-center justify-center text-[12px] text-white serif"
                    style={{ background: nd.accent === 'gold' ? 'linear-gradient(135deg,var(--gold),var(--gold-2))' : 'linear-gradient(135deg,var(--indigo),var(--ai))', boxShadow: '0 6px 14px -6px rgba(30,58,110,.6)' }}>{nd.seq}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-tight truncate" style={{ color: '#14325c' }}>{nd.title}</span><span className="block text-[10px] text-slate-400 group-hover:text-[var(--ai)] transition-colors mt-0.5">{nd.features.length} 项功能 · {nd.features[0].name}</span></span>
                  <span className="text-[14px]" style={{ color: 'var(--gold)' }}>›</span>
                </button>
              ))}
            </div>
          </div>

          <div className="an-rise hidden xl:block" style={{ animationDelay: '.7s' }}>
            <Card title="技能等级结构" sub="45,694 人已建能力档案">
              <div className="flex justify-center"><TalentLadder w={286} /></div>
              <div className="flex items-center gap-1.5 mt-1 px-1">
                <span className="tag tag-gold">高级技师 1,204 人</span>
                <span className="tag">技师 6,880 人</span>
                <span className="ai-badge ml-auto">AI 画像</span>
              </div>
            </Card>
          </div>
        </div>

        {/* 指标条 */}
        <div className="shrink-0 px-6 pb-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(255,255,255,.9)', backdropFilter: 'blur(16px)', boxShadow: '0 24px 50px -22px rgba(20,33,61,.45), inset 0 0 0 1px rgba(30,58,110,.07)' }}>
            <div className="flowband" />
            <div className="flex">{OVERVIEW.map((o, i) => <Metric key={o.k} o={o} i={i} />)}</div>
            <div className="brocade" style={{ height: 5, opacity: .7 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Dot() { return <span className="w-1.5 h-1.5 rounded-full bg-white/70" /> }

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,.76)', border: '1px solid rgba(255,255,255,.9)', boxShadow: '0 20px 44px -18px rgba(20,33,61,.35), inset 0 0 0 1px rgba(30,58,110,.07)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(30,58,110,.08)', background: 'linear-gradient(180deg,rgba(255,255,255,.5),transparent)' }}>
        <span className="w-[3px] h-[12px] rounded-full" style={{ background: 'linear-gradient(180deg,var(--gold-2),var(--gold))' }} />
        <span className="text-[12.5px] font-semibold">{title}</span>
        <span className="ml-auto text-[10.5px] text-slate-500">{sub}</span>
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  )
}

/* 照片均不可用时的兜底实景插画：邕江两岸城市天际线 · 喀斯特峰林 · 输电通道 */
function CityArt() {
  const bld = Array.from({ length: 52 }).map((_, i) => {
    const x = 20 + i * 31
    const h = 110 + ((i * 149) % 260) + (i > 16 && i < 36 ? 90 : 0)
    return { x, h, w: 22 + ((i * 37) % 8) }
  })
  const BASE = 470
  return (
    <svg className="absolute left-0 bottom-0 w-full" style={{ height: '78%' }} viewBox="0 0 1600 720" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe3f4" /><stop offset="60%" stopColor="#e2eef8" /><stop offset="100%" stopColor="#edf4fa" />
        </linearGradient>
        <linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ec3dd" /><stop offset="40%" stopColor="#5595bd" /><stop offset="100%" stopColor="#2f6389" />
        </linearGradient>
        <linearGradient id="bdF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#aabfd6" /><stop offset="100%" stopColor="#6a82a2" />
        </linearGradient>
        <linearGradient id="bdB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8d7e7" /><stop offset="100%" stopColor="#94a9c4" />
        </linearGradient>
        <linearGradient id="grn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fae82" /><stop offset="100%" stopColor="#548a5f" />
        </linearGradient>
      </defs>
      <rect width="1600" height="720" fill="url(#sk)" />
      {/* 远山：喀斯特峰林 */}
      <g fill="#a9c2d4" opacity=".5">
        {[[60, 250], [180, 200], [292, 268], [1318, 240], [1448, 196], [1566, 256]].map(([x, h], i) => (
          <path key={i} d={`M${x - 100} ${BASE} Q ${x - 44} ${BASE - h} ${x} ${BASE - h + 14} Q ${x + 48} ${BASE - h} ${x + 104} ${BASE} Z`} />
        ))}
      </g>
      {/* 后排楼群 */}
      <g fill="url(#bdB)" opacity=".8">
        {bld.filter((_, i) => i % 2 === 0).map((b, i) => (
          <rect key={i} x={b.x + 13} y={BASE - b.h * 0.7} width={b.w + 4} height={b.h * 0.7} />
        ))}
      </g>
      {/* 前排楼群 */}
      <g fill="url(#bdF)">
        {bld.map((b, i) => <rect key={i} x={b.x} y={BASE - b.h} width={b.w} height={b.h} />)}
        <rect x="746" y="92" width="40" height={BASE - 92} />
        <path d="M746 92 L766 46 L786 92 Z" fill="#7e94b2" />
        <rect x="1042" y="168" width="32" height={BASE - 168} />
        <rect x="452" y="196" width="30" height={BASE - 196} />
      </g>
      {/* 窗格灯 */}
      <g fill="#ffffff" opacity=".38">
        {Array.from({ length: 520 }).map((_, i) => {
          const b = bld[i % bld.length]
          const row = Math.floor(i / bld.length)
          return <rect key={i} x={b.x + 4 + ((i * 11) % Math.max(6, b.w - 8))} y={BASE - b.h + 16 + row * 30 + ((i * 13) % 44)} width="3.2" height="5" />
        })}
      </g>
      {/* 滨江绿带 */}
      <path d={`M0 ${BASE} Q 300 ${BASE - 8} 640 ${BASE + 6} T 1600 ${BASE - 4} L1600 ${BASE + 34} L0 ${BASE + 34} Z`} fill="url(#grn)" opacity=".92" />
      {/* 邕江 */}
      <rect y={BASE + 30} width="1600" height={720 - BASE - 30} fill="url(#rv)" />
      <g stroke="#ffffff" strokeWidth="1.8" opacity=".2" fill="none">
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={i} d={`M${(i * 167) % 1600 - 120} ${540 + i * 13} q 46 -9 92 0 t 92 0 t 92 0`} />
        ))}
      </g>
      {/* 斜拉桥 */}
      <g>
        <rect x="0" y="572" width="1600" height="10" fill="#dfe8f2" opacity=".92" />
        <rect x="0" y="582" width="1600" height="4" fill="#aabbcf" opacity=".8" />
        <rect x="742" y="470" width="11" height="106" fill="#e6edf5" opacity=".9" />
        <g stroke="#e6edf5" strokeWidth="1.5" opacity=".55">
          {Array.from({ length: 7 }).map((_, i) => (
            <g key={i}>
              <path d={`M748 478 L${748 - 34 - i * 32} 572`} />
              <path d={`M748 478 L${748 + 34 + i * 32} 572`} />
            </g>
          ))}
        </g>
      </g>
      {/* 船 */}
      <g className="an-drift">
        <path d="M280 646 l62 0 l-11 17 l-40 0 z" fill="#eef3f8" opacity=".9" />
        <rect x="299" y="633" width="19" height="13" fill="#dfe8f1" opacity=".9" />
      </g>
      {/* 输电通道 */}
      <g stroke="#6f8cb4" strokeWidth="1.7" fill="none" opacity=".5">
        <path className="flow-line" d="M0 198 Q 400 250 800 198 T 1600 198" />
        <path className="flow-line" d="M0 234 Q 400 286 800 234 T 1600 234" />
      </g>
    </svg>
  )
}
