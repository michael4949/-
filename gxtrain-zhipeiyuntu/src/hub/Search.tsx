/* 语义检索：意图解析、综合回答、分类结果 */
import { useEffect, useState } from 'react'
import { Panel } from '../ui'
import { ASSETS, parseIntent, searchAssets, answerFor, SEARCH_PRESETS, KINDS } from './data'
import type { AssetKind } from './data'
import { useNav, KindTag, Typewriter, StatusTag } from './nav'

export function SearchView({ q0 }: { q0?: string }) {
  const { push, replace, toast } = useNav()
  const [input, setInput] = useState(q0 ?? '')
  const [q, setQ] = useState(q0 ?? '')
  const [kind, setKind] = useState<AssetKind | ''>('')
  const [phase, setPhase] = useState<'idle' | 'think' | 'out'>(q0 ? 'think' : 'idle')
  useEffect(() => { if (phase !== 'think') return; const t = setTimeout(() => setPhase('out'), 900); return () => clearTimeout(t) }, [phase])
  const go = (s: string) => { if (!s.trim()) return; setInput(s); setQ(s); setPhase('think'); replace({ v: 'search', q: s }) }
  const hits = q ? searchAssets(q) : []
  const it = q ? parseIntent(q) : {}
  const shown = kind ? hits.filter(h => h.asset.kind === kind) : hits
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="shrink-0">
        <div className="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M16 16l5 5" /></svg>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && go(input)} placeholder="用一句话描述问题：不能直接验电时怎么确认无电？培训费报销要附哪些材料？" />
          <button className="btn btn-primary" onClick={() => go(input)}>检索</button>
        </div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[11px] text-slate-500">试试：</span>
          {SEARCH_PRESETS.map(p => <button key={p} className="chip" onClick={() => go(p)}>{p}</button>)}
        </div>
      </div>
      {phase === 'idle' ? (
        <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
          <Panel title="最近检索" bodyClass="overflow-auto scroll"><div className="p-2 space-y-0.5">{SEARCH_PRESETS.map((x, i2) => <button key={x} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px] flex items-center gap-2" onClick={() => go(x)}><span className="num text-[10.5px] text-slate-400 w-[34px]">09-{String(15 - i2).padStart(2, '0')}</span><span className="truncate flex-1">{x}</span><span className="text-[var(--gold)]">›</span></button>)}</div></Panel>
          <Panel title="常被引用的条目" bodyClass="overflow-auto scroll"><div className="p-2 space-y-0.5">{[...ASSETS].sort((a, b) => b.use - a.use).slice(0, 9).map(a => <button key={a.id} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg" onClick={() => push({ v: 'asset', id: a.id })}><div className="flex items-center gap-1.5"><KindTag k={a.kind} /><span className="text-[12px] truncate flex-1">{a.title}</span><span className="num text-[11px] text-slate-500">{a.use}</span></div></button>)}</div></Panel>
          <Panel title="本周更新" bodyClass="overflow-auto scroll"><div className="p-2 space-y-0.5">{[...ASSETS].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 9).map(a => <button key={a.id} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg" onClick={() => push({ v: 'asset', id: a.id })}><div className="flex items-center gap-1.5"><span className="num text-[10.5px] text-slate-400 w-[46px]">{a.updated.slice(5)}</span><span className="text-[12px] truncate flex-1">{a.title}</span><StatusTag s={a.status} /></div></button>)}</div></Panel>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr] gap-3">
          <div className="flex flex-col gap-3 min-h-0">
            <Panel title="意图解析">
              <div className="p-3 space-y-1.5 text-[12px]">
                {[['岗位', it.post], ['单位', it.unit?.replace(/（.*）/, '')], ['类型', it.kind], ['主题', it.topic]].map(([k, v]) => (
                  <div key={k as string} className="flex items-center gap-2"><span className="text-slate-500 w-[32px]">{k}</span>{v ? <span className="intent"><b>{v}</b></span> : <span className="text-slate-300">未指定</span>}</div>
                ))}
                
              </div>
            </Panel>
            <Panel title="按类型" className="flex-1">
              <div className="p-2 space-y-1">
                <button className={`tree-node ${!kind ? 'on' : ''}`} onClick={() => setKind('')}>全部<span className="n">{hits.length}</span></button>
                {KINDS.map(k => <button key={k} className={`tree-node ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}><KindTag k={k} /><span className="n">{hits.filter(h => h.asset.kind === k).length}</span></button>)}
              </div>
            </Panel>
          </div>
          <Panel title={`结果　${shown.length} 条`} bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => toast('已把本次检索结果生成学习包')}>生成学习包</button>}>
            <div className="p-3">
              {phase === 'think' ? <div>{['解析意图与身份范围…', '语义向量召回…', '关键词与图谱召回…', '融合排序并生成综合回答…'].map((s, i) => <div key={s} className="ai-think"><i style={{ animationDelay: `${i * .2}s` }} />{s}</div>)}</div> : (
                <div className="fade-in">
                  <div className="ai-out mb-3">
                    <div className="text-[11px] text-slate-500 mb-1">AI 综合回答</div>
                    <Typewriter text={answerFor(hits)} speed={7} />
                    {hits.length > 0 && <div className="flex gap-1.5 mt-2 flex-wrap">{hits.slice(0, 3).map(h => <button key={h.asset.id} className="chip" style={{ borderColor: '#e3d2ac', background: 'var(--gold-soft)' }} onClick={() => push({ v: 'asset', id: h.asset.id })}><b style={{ color: 'var(--gold)' }}>{h.asset.anchor !== '—' ? h.asset.anchor : h.asset.id}</b><span className="text-slate-500 ml-1.5">{h.asset.title.slice(0, 18)}</span></button>)}</div>}
                  </div>
                  <div className="space-y-1.5">
                    {shown.map((h, i) => (
                      <button key={h.asset.id} onClick={() => push({ v: 'asset', id: h.asset.id })} className="a-card w-full text-left row-in" style={{ animationDelay: `${Math.min(i, 12) * .04}s` }}>
                        <div className="flex items-center gap-2"><KindTag k={h.asset.kind} /><span className="num text-[10.5px] text-slate-400">{h.asset.id}</span><StatusTag s={h.asset.status} /><span className="ml-auto text-[10.5px] text-slate-400">{h.why || '语义相近'} · 相关度 {Math.min(99, Math.round(60 + h.score * 6))}%</span></div>
                        <div className="text-[13px] font-medium mt-1">{h.asset.title}</div>
                        <div className="text-[11.5px] text-slate-600 leading-snug mt-0.5">{h.asset.summary}</div>
                        <div className="text-[10.5px] text-slate-400 mt-1">{h.asset.unit.replace(/（.*）/, '')} · {h.asset.post} · {h.asset.src}</div><span className="go">›</span>
                      </button>
                    ))}
                    {shown.length === 0 && <div className="text-[12px] text-slate-400 text-center py-6">无匹配条目，本次提问已记入未命中队列</div>}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
