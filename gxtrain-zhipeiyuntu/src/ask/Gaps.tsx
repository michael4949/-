/* 知识缺口（一级）→ 缺口详情（二级）→ 条目草稿（三级） */
import { useState } from 'react'
import { Panel, Bars } from '../ui'
import { GAPS } from './data'
import { useNav, StatusTag, Typewriter, KindTag } from './nav'

export function GapsView() {
  const { push, toast } = useNav()
  const [st, setSt] = useState('')
  const list = GAPS.filter(g => !st || g.status === st)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`未命中聚类　${list.length} 类 · ${list.reduce((a, g) => a + g.n, 0)} 条提问`} extra={<div className="seg"><button className={!st ? 'on' : ''} onClick={() => setSt('')}>全部</button>{['待认领', '补充中', '已回流'].map(s => <button key={s} className={st === s ? 'on' : ''} onClick={() => setSt(s)}>{s}</button>)}</div>} bodyClass="overflow-auto scroll">
        <div className="p-3 grid grid-cols-2 gap-3">{list.map((g, i) => <button key={g.id} onClick={() => push({ v: 'gap', id: g.id })} className="a-card text-left row-in" style={{ animationDelay: `${i * .05}s` }}><div className="flex items-center gap-2"><StatusTag s={g.status} /><KindTag k={g.kind} /><span className="ml-auto num text-[11px] text-slate-500">{g.n} 条 · 连续 {g.weeks} 周</span></div><div className="text-[13.5px] font-semibold mt-1.5">{g.topic}</div><div className="text-[11px] text-slate-500 mt-1">{g.units.slice(0, 3).join('、')}{g.units.length > 3 ? ' 等' : ''} · {g.roles.join('、')}</div><div className="text-[11.5px] text-slate-600 mt-1.5 line-clamp-2">“{g.samples[0]}” / “{g.samples[1]}”</div><div className="text-[10.5px] mt-2" style={{ color: 'var(--gold)' }}>责任单位：{g.owner}</div><span className="go">›</span></button>)}</div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="缺口 → 条目 → 回流"><div className="p-3 text-[12px] space-y-1.5">{['未命中提问按语义聚类', 'AI 生成条目草稿并建议出处', '责任单位认领与确认', '入库流水线审核发布', '助手自动回流并通知提问人'].map((s, i) => <div key={s} className="flex items-center gap-2"><span className="w-4 h-4 rounded-md text-[10px] flex items-center justify-center text-white" style={{ background: 'var(--ai)' }}>{i + 1}</span>{s}</div>)}</div></Panel>
        <Panel title="本月" className="flex-1"><div className="p-3"><Bars data={[{ label: '新增缺口', v: 14 }, { label: '已认领', v: 9 }, { label: '已回流', v: 6 }, { label: '平均回流天数', v: 4.2 }]} /><button className="btn btn-primary w-full mt-3" onClick={() => toast('已向责任单位发送认领提醒')}>催办待认领</button></div></Panel>
      </div>
    </div>
  )
}

export function GapView({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const g = GAPS.find(x => x.id === id)
  if (!g) return null
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><StatusTag s={g.status} /><KindTag k={g.kind} /><span className="ml-auto text-[11px] text-slate-500">{g.n} 条提问 · 连续 {g.weeks} 周 · 责任 {g.owner}</span></div><div className="text-[17px] font-semibold serif mt-1">{g.topic}</div></div>
        <Panel title="相似提问" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1">{g.samples.map(s => <button key={s} className="w-full text-left px-2.5 py-2 hairline text-[12px] hover:border-[var(--ai)]" onClick={() => push({ v: 'chat', q: s })}>“{s}”</button>)}<div className="px-2 pt-2 text-[11px] text-slate-500">来源单位：{g.units.join('、')}；身份：{g.roles.join('、')}</div></div></Panel>
      </div>
      <Panel title="AI 条目草稿" extra={<button className="btn btn-sm" onClick={() => push({ v: 'gapDraft', id: g.id })}>编辑草稿 ›</button>} bodyClass="overflow-auto scroll"><div className="p-4"><div className="text-[14px] font-semibold mb-2">{g.draft.title}</div><div className="ai-out"><Typewriter text={g.draft.body.map((b, i) => `${i + 1}. ${b}`).join('\n') + `\n\n建议出处：${g.draft.src}`} speed={8} /></div></div></Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="处理"><div className="p-3 space-y-2">{g.status === '待认领' && <button className="btn btn-primary w-full" onClick={() => toast(`已由 ${g.owner} 认领`)}>认领</button>}<button className="btn w-full" onClick={() => { toast('草稿已提交中枢入库流水线'); jump('hub', 'ingest') }}>提交中枢入库</button><button className="btn w-full" onClick={() => { toast('已推送课程工厂生成微课'); jump('factory', 'gen') }}>做成一讲微课</button><button className="btn w-full" onClick={() => toast('已通知 41 位提问人待回流')}>通知提问人</button></div></Panel>
        <Panel title="影响" className="flex-1"><div className="p-3 text-[12px] space-y-1.5"><div className="flex justify-between"><span className="text-slate-500">回流后预计命中</span><span className="num">+{g.n} 条 / 周</span></div><div className="flex justify-between"><span className="text-slate-500">涉及单位</span><span className="num">{g.units.length}</span></div><div className="flex justify-between"><span className="text-slate-500">建议同步</span><span>课件 · 助手条目</span></div></div></Panel>
      </div>
    </div>
  )
}

export function GapDraft({ id }: { id: string }) {
  const { toast, back, jump } = useNav()
  const g = GAPS.find(x => x.id === id)
  const [title, setTitle] = useState(g?.draft.title ?? '')
  const [body, setBody] = useState(g?.draft.body.join('\n') ?? '')
  if (!g) return null
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title="条目草稿" extra={<KindTag k={g.kind} />}><div className="p-4 space-y-3"><div><div className="text-[11px] text-slate-500 mb-1">标题</div><input value={title} onChange={e => setTitle(e.target.value)} className="hairline w-full px-3 py-2 text-[13px] outline-none" /></div><div><div className="text-[11px] text-slate-500 mb-1">正文（每行一条）</div><textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="hairline w-full px-3 py-2 text-[12.5px] outline-none leading-relaxed" /></div><div><div className="text-[11px] text-slate-500 mb-1">出处</div><input defaultValue={g.draft.src} className="hairline w-full px-3 py-2 text-[12.5px] outline-none" /></div><div className="flex gap-2"><button className="btn btn-primary" onClick={() => { toast('草稿已提交中枢入库流水线，待责任单位审核'); jump('hub', 'ingest') }}>提交入库</button><button className="btn" onClick={() => toast('已按规程口吻改写')}>AI 改写为规程口吻</button><button className="btn" onClick={back}>取消</button></div></div></Panel>
      <div className="flex flex-col gap-3"><Panel title="校验"><div className="p-3 space-y-1.5 text-[12px]">{[['术语一致', true], ['出处可追溯', true], ['与现有条目无冲突', true], ['敏感信息', true]].map(([k, ok]) => <div key={k as string} className="flex items-center gap-2"><span className={`tag ${ok ? 'tag-ok' : 'tag-warn'}`}>{ok ? '通过' : '注意'}</span>{k as string}</div>)}</div></Panel><Panel title="将回流到" className="flex-1"><div className="p-3 text-[12px] space-y-1">{['问数助手标准回答', '相关课程课件片段', '班组周课知识卡'].map(s => <div key={s} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ai)' }} />{s}</div>)}</div></Panel></div>
    </div>
  )
}
