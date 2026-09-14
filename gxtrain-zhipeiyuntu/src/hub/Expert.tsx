/* 专家经验萃取（一级）→ 专家档案（二级）→ 诀窍条目（三级，复用条目详情） */
import { useState } from 'react'
import { Panel, Progress } from '../ui'
import { UNIT_GROUPS } from '../units'
import { EXPERTS_ALL, EXTRACT_STAGES, stageIdx, outlineFor, assetById, ASSETS } from './data'
import type { Expert } from './data'
import { useNav, KindTag, StatusTag, Typewriter } from './nav'

export function ExpertView() {
  const { push, toast } = useNav()
  const [grp, setGrp] = useState('')
  const [st, setSt] = useState('')
  const list = EXPERTS_ALL.filter(e => (!grp || e.grp === grp) && (!st || e.status === st))
  const total = EXPERTS_ALL.reduce((a, b) => a + b.items, 0)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title="在采专家" extra={
        <div className="flex gap-1 items-center">
          <button className={`dim-tab ${!grp ? 'on' : ''}`} onClick={() => setGrp('')}>全部</button>
          {UNIT_GROUPS.filter(g => EXPERTS_ALL.some(e => e.grp === g)).map(g => <button key={g} className={`dim-tab ${grp === g ? 'on' : ''}`} onClick={() => setGrp(g)}>{g}</button>)}
          <select value={st} onChange={e => setSt(e.target.value)} className="hairline px-2 py-0.5 text-[11px] ml-2"><option value="">全部状态</option>{['待启动', '访谈中', '整理中', '已完成'].map(s => <option key={s}>{s}</option>)}</select>
        </div>} bodyClass="overflow-auto scroll">
        <div className="p-3 grid grid-cols-3 gap-3">
          {list.map((e, i) => (
            <button key={e.id} onClick={() => push({ v: 'expertDetail', id: e.id })} className="a-card text-left row-in" style={{ animationDelay: `${i * .04}s` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center text-[15px] font-semibold text-white serif" style={{ background: e.grp === '本部职能部门' ? 'var(--gold)' : e.grp === '直属机构' ? '#6a86b8' : 'var(--indigo)' }}>{e.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-[13.5px] font-semibold">{e.name}</span><StatusTag s={e.status} /></div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5">{e.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">{e.unit} · {e.dept}</div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">{e.topics.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}</div>
                  <div className="mt-2 flex items-center gap-2"><div className="flex-1"><Progress v={Math.min(100, (e.items / 80) * 100)} /></div><span className="num text-[11.5px]" style={{ color: 'var(--gold)' }}>{e.items} 条</span></div>
                </div>
              </div>
              <span className="go">›</span>
            </button>
          ))}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="萃取总览">
          <div className="p-3 grid grid-cols-2 gap-2">
            {[['在采专家', `${EXPERTS_ALL.length} 位`], ['已沉淀诀窍', `${total} 条`], ['已成课', `${EXPERTS_ALL.reduce((a, b) => a + b.courses, 0)} 门`], ['覆盖单位', `${new Set(EXPERTS_ALL.map(e => e.unit)).size} 个`]].map(([k, v], i) => (
              <div key={k} className="hairline py-2 text-center"><div className="num text-[17px] font-semibold" style={{ color: i % 2 ? 'var(--gold)' : 'var(--indigo)' }}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>
            ))}
          </div>
          <div className="px-3 pb-3 text-[11.5px] text-slate-500 leading-relaxed">萃取对象覆盖生产一线、本部职能部门与直属机构，人力资源部自身的培训开发经验亦纳入萃取。</div>
        </Panel>
        <Panel title="退休与流失预警" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1.5">
            {[...EXPERTS_ALL].filter(e => e.retire < '2031').sort((a, b) => a.retire.localeCompare(b.retire)).map(e => (
              <button key={e.id} onClick={() => push({ v: 'expertDetail', id: e.id })} className="w-full flex items-center gap-2 text-[12px] hairline px-2.5 py-2 hover:border-[var(--indigo-2)]">
                <span className={`tag ${e.retire < '2027-06' ? 'tag-bad' : e.retire < '2029' ? 'tag-warn' : ''}`}>{e.retire}</span>
                <span className="font-medium">{e.name}</span><span className="text-slate-500 text-[11px] truncate">{e.title.split(' · ')[1]}</span>
                <span className="ml-auto num text-[11.5px]" style={{ color: e.items > 40 ? 'var(--ok)' : 'var(--bad)' }}>已沉淀 {e.items}</span>
              </button>
            ))}
            <button className="btn btn-sm w-full mt-1" onClick={() => toast('已按退休时间与沉淀条数重排萃取优先级，并推送给各单位培训专责')}>重排萃取优先级</button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function ExpertDetail({ id }: { id: string }) {
  const { push, toast } = useNav()
  const e = EXPERTS_ALL.find(x => x.id === id) as Expert
  const [gen, setGen] = useState(false)
  if (!e) return null
  const si = stageIdx(e.status)
  const tips = [...e.tips.map(t => assetById(t)).filter(Boolean), ...ASSETS.filter(a => a.kind === '岗位诀窍' && a.unit === e.unit && !e.tips.includes(a.id)).slice(0, 6)]
  return (
    <div className="h-full grid grid-cols-[300px_1fr_340px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="专家档案">
          <div className="p-3.5">
            <div className="flex items-center gap-3 mb-2"><div className="w-12 h-12 flex items-center justify-center text-[18px] font-semibold text-white serif" style={{ background: 'var(--indigo)' }}>{e.name[0]}</div>
              <div><div className="text-[15px] font-semibold">{e.name}</div><div className="text-[11.5px] text-slate-500">{e.title}</div></div></div>
            <div className="text-[11.5px] text-slate-500">{e.unit}</div><div className="text-[11.5px] text-slate-500 mb-2">{e.dept} · 从业 {e.years} 年 · 计划退休 {e.retire}</div>
            <div className="gold-rule mb-2" />
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['访谈轮次', String(e.interviews.filter(i => i.done).length)], ['已沉淀', String(e.items)], ['已成课', String(e.courses)]].map(([k, v]) => <div key={k} className="hairline py-2"><div className="num text-[17px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>)}
            </div>
            <div className="flex gap-1 mt-2.5 flex-wrap">{e.topics.map(t => <span key={t} className="tag tag-gold">{t}</span>)}</div>
          </div>
        </Panel>
        <Panel title="萃取流程" className="flex-1">
          <div className="p-3">
            {EXTRACT_STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-2 py-1.5">
                <span className="w-4 h-4 shrink-0 text-[10px] flex items-center justify-center text-white" style={{ background: i < si ? 'var(--ok)' : i === si ? 'var(--indigo)' : '#cbd3de' }}>{i < si ? '✓' : i + 1}</span>
                <span className={`text-[12px] ${i < si ? '' : i === si ? 'font-semibold' : 'text-slate-400'}`}>{s}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 访谈提纲" extra={<button className="btn btn-sm btn-primary" onClick={() => setGen(true)}>{gen ? '重新生成' : '生成提纲'}</button>}>
          <div className="p-3">
            {!gen ? <div className="text-[12px] text-slate-400 py-3 text-center">按专家主题、岗位高频问题与已有资产缺口生成结构化提纲</div> : (
              <div className="space-y-1.5">{outlineFor(e).map((q, i) => <div key={q} className="flex gap-2 text-[12.5px] leading-relaxed fade-in" style={{ animationDelay: `${i * .35}s` }}><span className="num text-[11px] text-slate-400 shrink-0 mt-[3px]">{i + 1}</span><span><Typewriter text={q} speed={6} /></span></div>)}
                <div className="flex gap-2 pt-2"><button className="btn btn-sm" onClick={() => toast('提纲已发送给访谈员与专家本人')}>发送提纲</button><button className="btn btn-sm" onClick={() => toast('已预约访谈室与录音设备')}>预约访谈</button></div></div>
            )}
          </div>
        </Panel>
        <Panel title="访谈轮次" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3">
            {e.interviews.map((it, i) => (
              <div key={i} className="flex gap-2.5 pb-3 relative">
                <div className="shrink-0 relative"><span className="w-4 h-4 block rounded-full" style={{ background: it.done ? 'var(--ok)' : '#d5dce6' }} />{i < e.interviews.length - 1 && <span className="absolute left-1/2 top-4 bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div>
                <div className="flex-1"><div className="flex items-center gap-2"><span className="text-[12.5px] font-medium">第 {i + 1} 轮 · {it.stage}</span><StatusTag s={it.done ? '已完成' : '待进行'} /><span className="ml-auto num text-[11px] text-slate-400">{it.date} · {it.len}</span></div>
                  {it.done && <div className="text-[11px] text-slate-500 mt-0.5">转写 {(((m: RegExpMatchArray | null) => (parseInt(m?.[1] ?? '0') * 60 + parseInt(m?.[2] ?? '0')) * 140)(it.len.match(/(?:(\d+)h)?(?:(\d+)m)?/))).toLocaleString()} 字 · 抽取候选条目 {8 + i * 5} 条 · 专家确认 {6 + i * 4} 条</div>}
                  {it.done && <button className="text-[11px] underline mt-0.5" style={{ color: 'var(--indigo)' }} onClick={() => push({ v: 'batch', id: e.id === 'e10' ? 'b2' : 'b1' })}>查看抽取批次 ›</button>}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`已沉淀诀窍　${e.items} 条`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入三级条目页</span>}>
          <div className="p-2 space-y-1">
            {tips.map((a, i) => (
              <button key={a!.id} onClick={() => push({ v: 'asset', id: a!.id })} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 hairline row-in" style={{ animationDelay: `${i * .04}s` }}>
                <div className="flex items-center gap-1.5"><KindTag k={a!.kind} /><span className="num text-[10.5px] text-slate-400">{a!.id}</span><span className="num text-[10.5px] text-slate-400 ml-auto">引用 {a!.use}</span></div>
                <div className="text-[12px] leading-snug mt-0.5">{a!.title}</div>
              </button>
            ))}
            {e.items === 0 && <div className="text-[12px] text-slate-400 py-4 text-center">访谈启动后自动出现</div>}
          </div>
        </Panel>
        <Panel title="回流去向">
          <div className="p-3 grid grid-cols-4 gap-1.5 text-center">
            {[['课件', e.courses], ['题目', e.items * 3], ['陪练', Math.round(e.items / 12)], ['助手', e.items * 2]].map(([k, v]) => <div key={k as string} className="hairline py-1.5"><div className="num text-[15px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div><div className="text-[10px] text-slate-500">{k}</div></div>)}
          </div>
        </Panel>
      </div>
    </div>
  )
}
