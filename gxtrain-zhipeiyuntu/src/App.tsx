import { useEffect, useState } from 'react'
import { NODES } from './data'
import { GridMark } from './deco'
import { Ambient } from './Ambient'
import Hero from './Hero'
import Hub from './modules/Hub'
import Factory from './modules/Factory'
import Coach from './modules/Coach'
import Ask from './modules/Ask'
import Atlas from './modules/Atlas'
import Plan from './modules/Plan'

const SHORT: Record<string, string> = {
  hub: '知识资产中枢', factory: 'AI 课程工厂', coach: 'AI 智能陪练', ask: '智能问数助手',
  map: '学习成长地图', plan: '千人千面计划',
}
const byId = (id: string) => NODES.find(n => n.id === id)!

export default function App() {
  const [page, setPage] = useState<{ node: string; tab: string; route?: { v: string }; nonce?: number } | null>(null)
  const [now, setNow] = useState('')
  const [gq, setGq] = useState('')

  useEffect(() => {
    const f = () => {
      const d = new Date()
      const w = '日一二三四五六'[d.getDay()]
      setNow(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}　周${w}　${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    }
    f(); const t = setInterval(f, 30000); return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setPage(null) }
    const go = (e: Event) => { const d = (e as CustomEvent<{ node: string; tab: string; route?: { v: string } }>).detail; if (d?.node) setPage({ node: d.node, tab: d.tab, route: d.route }) }
    window.addEventListener('keydown', k); window.addEventListener('app:go', go)
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('app:go', go) }
  }, [])

  const n = page ? byId(page.node) : null

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* 第一行：标识栏 */}
      <div className="shrink-0 flex items-center px-6 h-[56px] relative z-[60]"
        style={{ background: 'rgba(255,255,255,.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(30,58,110,.08)' }}>
        <button onClick={() => setPage(null)} className="flex items-center gap-3">
          <GridMark size={30} />
          <span className="serif text-[22px] font-semibold tracking-[.12em]" style={{ color: 'var(--indigo)' }}>智培云图</span>
          <span className="text-[12px] text-slate-500 pl-3" style={{ borderLeft: '1px solid var(--line)' }}>
            南方电网广西电网有限责任公司 · 人才培养数智平台
          </span>
        </button>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ border: '1px solid rgba(30,58,110,.12)', background: 'rgba(255,255,255,.85)', boxShadow: 'inset 0 1px 2px rgba(20,33,61,.04)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa6b8" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="M16 16l5 5" /></svg>
            <input value={gq} onChange={e => setGq(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && gq.trim()) { setPage({ node: 'ask', tab: 'chat', route: { v: 'chat', q: gq.trim() } as never, nonce: Date.now() }); setGq('') } }} placeholder="问助手：规程、数据、开班…" className="text-[12px] outline-none w-[210px] bg-transparent" style={{ boxShadow: 'none', border: 'none' }} />
          </div>
          <span className="num text-[11.5px] text-slate-500">{now}</span>
          <div className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] text-white" style={{ background: 'linear-gradient(135deg,#1e3a6e,#2f6df6)', boxShadow: '0 6px 14px -6px rgba(47,109,246,.8)' }}>陈</div>
            <span className="text-[12px]">陈科长<span className="text-slate-500"> · 人力资源部培训科</span></span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-[260px]" style={{ background: 'linear-gradient(90deg,var(--gold-2),var(--ai-2),transparent)' }} />
      </div>

      {/* 第二行：横版菜单 */}
      <div className="shrink-0 flex items-stretch px-5 h-[44px] relative z-50"
        style={{ background: 'linear-gradient(90deg,#0f2a57 0%,#1e3a6e 42%,#0b4f8f 100%)', boxShadow: '0 10px 30px -14px rgba(15,42,87,.6)' }}>
        <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)' }} />
        <MenuItem active={!page} onClick={() => setPage(null)} label="云图首页" />
        {NODES.map(nd => (
          <div key={nd.id} className="nav-item flex">
            <MenuItem active={page?.node === nd.id} label={SHORT[nd.id]} caret
              onClick={() => setPage({ node: nd.id, tab: nd.features[0].id })} />
            <div className="dd">
              <div className="px-3 py-2" style={{ background: '#f7f9fc', borderBottom: '1px solid var(--line-2)' }}>
                <div className="text-[12px] font-semibold">{nd.title}</div>
                <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{nd.tagline}</div>
              </div>
              {nd.features.map(f => (
                <button key={f.id} onClick={() => setPage({ node: nd.id, tab: f.id, nonce: Date.now() })}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2"
                  style={{ borderBottom: '1px solid var(--line-2)' }}>
                  <span className="w-1 h-1 mt-[7px] shrink-0" style={{ background: 'var(--gold)' }} />
                  <span>
                    <span className="block text-[12.5px] font-medium">{f.name}</span>
                    <span className="block text-[10.5px] text-slate-500 mt-0.5">{f.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3 text-white/75 text-[11.5px]">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />管理信息大区 · 运行正常
          </span>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 relative">
        {!page || !n ? <Hero onOpen={(node, tab) => setPage({ node, tab })} /> : (
          <div className="h-full flex flex-col relative">
            <Ambient />
            <div className="shrink-0 flex items-center px-5 h-[48px] relative z-[5]" style={{ background: 'rgba(255,255,255,.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(30,58,110,.08)' }}>
              <div className="w-[4px] h-[18px] mr-3 rounded-full" style={{ background: n.accent === 'gold' ? 'linear-gradient(180deg,var(--gold-2),var(--gold))' : 'linear-gradient(180deg,var(--ai),var(--indigo))' }} />
              <span className="text-[15px] font-semibold tracking-wide">{n.title}</span>
              <span className="num text-[10px] text-slate-400 ml-2.5 tracking-[.16em]">{n.sub}</span>
              <div className="seg ml-6">
                {n.features.map(f => (
                  <button key={f.id} onClick={() => setPage({ node: n.id, tab: f.id, nonce: Date.now() })} className={page.tab === f.id ? 'on' : ''}>{f.name}</button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2 text-[11.5px] text-slate-500">
                <span className="hidden 2xl:inline">云图首页</span><span className="text-slate-300 hidden 2xl:inline">/</span>
                <span className="hidden 2xl:inline">{n.title}</span><span className="text-slate-300 hidden 2xl:inline">/</span>
                <span style={{ color: 'var(--gold)' }}>{n.features.find(f => f.id === page.tab)?.name}</span>
                <button className="btn btn-sm ml-2" onClick={() => setPage(null)}>返回首页</button>
              </div>
            </div>
            <div className="flowband shrink-0 relative z-[5]" />
            <div className="flex-1 min-h-0 relative z-[1]">
              {n.id === 'hub' && <Hub tab={page.tab} init={page.route as never} nonce={page.nonce} />}
              {n.id === 'factory' && <Factory tab={page.tab} init={page.route as never} nonce={page.nonce} />}
              {n.id === 'coach' && <Coach tab={page.tab} goTab={t => setPage({ node: 'coach', tab: t })} />}
              {n.id === 'ask' && <Ask tab={page.tab} init={page.route as never} nonce={page.nonce} />}
              {n.id === 'map' && <Atlas tab={page.tab} init={page.route as never} nonce={page.nonce} />}
              {n.id === 'plan' && <Plan tab={page.tab} init={page.route as never} nonce={page.nonce} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItem({ label, active, onClick, caret }: { label: string; active?: boolean; onClick: () => void; caret?: boolean }) {
  return (
    <button onClick={onClick} className={`menu-btn ${active ? 'on' : ''}`}>
      {label}
      {caret && <span className="text-[8px] opacity-60">▼</span>}
    </button>
  )
}
