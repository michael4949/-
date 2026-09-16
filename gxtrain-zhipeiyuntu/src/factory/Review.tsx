/* 审核工作流（一级）→ 审核详情（二级）→ 页级批注（三级） */
import { useState } from 'react'
import { Panel, Progress } from '../ui'
import { REVIEW_QUEUE, allCourses, slidesFor } from './data'
import type { ReviewNote } from './data'
import { findCourse } from './store'
import { useNav, KindTag, StatusTag, Typewriter } from './nav'
import { Slide } from './Gen'

export function ReviewView() {
  const { push, toast } = useNav()
  const queue = [...REVIEW_QUEUE, ...allCourses().filter(c => c.status === '内训师审核中' && !REVIEW_QUEUE.includes(c))]
  const [stage, setStage] = useState('')
  const rows = queue.filter(c => !stage || c.status === stage)
  /* 在审队列按进入顺序计等待天数，最久不超过三周 */
  const days = (id: string) => 1 + (REVIEW_QUEUE.findIndex(c => c.id === id) % 18)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`待审核课程　${rows.length} 门`} extra={<div className="seg"><button className={!stage ? 'on' : ''} onClick={() => setStage('')}>全部</button><button className={stage === '内训师审核中' ? 'on' : ''} onClick={() => setStage('内训师审核中')}>内训师审核</button><button className={stage === '专业部门审核中' ? 'on' : ''} onClick={() => setStage('专业部门审核中')}>专业部门审核</button></div>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>课程</th><th>单位 / 岗位</th><th>提交人</th><th>阶段</th><th>AI 自检</th><th>等待</th><th>进度</th><th></th></tr></thead>
          <tbody>{rows.map(c => { const cur = c.reviews.find(r => r.result === '进行中'); const ai = cur?.notes.filter(n => n.kind === 'AI 自检') ?? []; const done = cur ? cur.notes.filter(n => n.st !== '待处理').length : 0; return (
            <tr key={c.id} className="cursor-pointer" onClick={() => push({ v: 'reviewDetail', id: c.id })}>
              <td><div className="flex items-center gap-1.5"><KindTag k={c.kind} /><span className="font-medium">{c.name}</span></div></td>
              <td className="text-[11.5px] text-slate-600">{c.unit.replace(/（.*）/, '')} · {c.post}</td><td className="text-[11.5px]">{c.owner}</td>
              <td><StatusTag s={c.status} /></td>
              <td className="text-[11px]"><span className={`tag ${ai.some(n => n.sev === 'bad') ? 'tag-bad' : ai.length ? 'tag-warn' : 'tag-ok'}`}>{ai.length} 项</span></td>
              <td className="num" style={{ color: days(c.id) > 5 ? 'var(--bad)' : undefined }}>{days(c.id)} 天</td>
              <td className="w-[110px]"><div className="flex items-center gap-1.5"><div className="flex-1"><Progress v={cur ? done / Math.max(1, cur.notes.length) * 100 : 0} /></div><span className="num text-[11px]">{done}/{cur?.notes.length ?? 0}</span></div></td>
              <td><button className="btn btn-sm">审核</button></td>
            </tr>) })}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="审核规则" extra={<span className="ai-badge">AI 自检先行</span>}>
          <div className="p-3 text-[12px] space-y-1.5">
            {['术语与公司标准用语一致', '引用条款为现行版本', '敏感信息脱敏（客户、供应商、纪检）', '题目答案与讲义一致', '页面密度与图文顺序'].map((r, i) => <div key={r} className="flex items-center gap-2"><span className="w-4 h-4 rounded-md text-[10px] flex items-center justify-center text-white" style={{ background: 'var(--ai)' }}>{i + 1}</span>{r}</div>)}
            <div className="text-[11px] text-slate-500 pt-1">两级审核：内训师审核 → 专业部门审核，培训科发布。AI 自检结果附在每页批注中，可一键采纳。</div>
          </div>
        </Panel>
        <Panel title="本月审核" className="flex-1">
          <div className="p-3 grid grid-cols-2 gap-2">
            {[['已审核', '84 门'], ['平均等待', `${REVIEW_QUEUE.length ? (REVIEW_QUEUE.reduce((a, c) => a + days(c.id), 0) / REVIEW_QUEUE.length).toFixed(1) : '0'} 天`], ['AI 自检采纳率', '78%'], ['退回率', '9%']].map(([k, v], i) => <div key={k} className="hairline py-2 text-center"><div className={`num text-[17px] font-semibold ${i % 2 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>)}
            <button className="col-span-2 btn w-full" onClick={() => toast('已通知等待超过 5 天的审核人')}>催办超期审核</button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function ReviewDetail({ id }: { id: string }) {
  const { push, toast, back } = useNav()
  const c = findCourse(id)
  const cur = c?.reviews.find(r => r.result === '进行中') ?? c?.reviews[0]
  const [notes, setNotes] = useState<ReviewNote[]>(cur?.notes ?? [])
  const [page, setPage] = useState(notes[0]?.page ?? 1)
  const [comment, setComment] = useState('')
  if (!c || !cur) return null
  const pages = c.chapters.flatMap((ch, ci) => slidesFor(c, ch).map((s, i) => ({ s, ch: ci, i })))
  const total = pages.length
  const pi = Math.min(total - 1, Math.max(0, page - 1))
  const cur_s = pages[pi]
  const act = (nid: string, st: ReviewNote['st']) => { setNotes(ns => ns.map(n => n.id === nid ? { ...n, st } : n)); toast(st === '已修改' ? '已采纳 AI 修改建议' : '已确认') }
  const pending = notes.filter(n => n.st === '待处理').length
  return (
    <div className="h-full grid grid-cols-[200px_1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`课件页　${total} 页`} bodyClass="overflow-auto scroll">
        <div className="p-2 space-y-2">
          {pages.map((p, i) => { const ns = notes.filter(n => n.page === i + 1); return (
            <div key={i} className="relative">
              <Slide s={p.s} i={i} c={c} mini on={i === pi} onClick={() => setPage(i + 1)} />
              {ns.map((n, j) => <span key={n.id} className="mark" style={{ right: 6 + j * 16, top: 6, background: n.st !== '待处理' ? 'var(--ok)' : n.sev === 'bad' ? 'var(--bad)' : 'var(--warn)' }}>{n.st !== '待处理' ? '✓' : '!'}</span>)}
            </div>) })}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-3 shrink-0 flex items-center gap-2"><KindTag k={c.kind} /><span className="text-[14px] font-semibold">{c.name}</span><StatusTag s={c.status} /><span className="text-[11px] text-slate-500 ml-auto">{cur.stage} · {cur.who} · 待处理 {pending} 条</span></div>
        <Panel title={`第 ${page} 页　${cur_s.s.title}`} className="flex-1" bodyClass="overflow-auto scroll" extra={<div className="flex gap-1"><button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button><button className="btn btn-sm" onClick={() => setPage(p => Math.min(total, p + 1))}>›</button></div>}>
          <div className="p-4"><div className="max-w-[760px] mx-auto"><Slide s={cur_s.s} i={pi} c={c} /></div>
            <div className="mt-3 rounded-xl px-3 py-2 text-[12px]" style={{ background: 'var(--indigo-soft)' }}><span className="text-[10.5px] text-slate-500 mr-2">讲解词</span>{cur_s.s.note}</div>
            <div className="mt-3 flex gap-2"><input value={comment} onChange={e => setComment(e.target.value)} placeholder="对本页添加人工批注…" className="hairline flex-1 px-3 py-1.5 text-[12px] outline-none" /><button className="btn" onClick={() => { if (!comment.trim()) return; setNotes(ns => [...ns, { id: 'h' + Date.now(), page, kind: '人工', sev: 'warn', text: comment, fix: '待内训师处理', st: '待处理' }]); setComment(''); toast('已添加批注') }}>添加批注</button></div>
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`批注　${notes.length} 条`} className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm btn-primary" onClick={() => { setNotes(ns => ns.map(n => n.kind === 'AI 自检' && n.st === '待处理' ? { ...n, st: '已修改' } : n)); toast('已一键采纳全部 AI 自检建议') }}>一键采纳 AI</button>}>
          <div className="p-2 space-y-1.5">
            {notes.map(n => (
              <div key={n.id} className={`note-card ${n.page === page ? 'on' : ''}`} onClick={() => setPage(n.page)}>
                <div className="flex items-center gap-1.5"><span className={`tag ${n.kind === 'AI 自检' ? '' : 'tag-gold'}`}>{n.kind}</span><span className={`tag tag-${n.sev === 'ok' ? 'ok' : n.sev}`}>{n.sev === 'bad' ? '必改' : n.sev === 'warn' ? '建议' : '提示'}</span><span className="num text-[10.5px] text-slate-400 ml-auto">第 {n.page} 页</span></div>
                <div className="text-[12px] mt-1 leading-snug">{n.text}</div>
                <div className="flex items-center gap-1.5 mt-1.5"><StatusTag s={n.st} />{n.st === '待处理' && <><button className="btn btn-sm ml-auto" onClick={e => { e.stopPropagation(); act(n.id, '已修改') }}>采纳修改</button><button className="btn btn-sm" onClick={e => { e.stopPropagation(); push({ v: 'note', course: c.id, id: n.id }) }}>详情 ›</button></>}{n.st !== '待处理' && <button className="btn btn-sm ml-auto" onClick={e => { e.stopPropagation(); push({ v: 'note', course: c.id, id: n.id }) }}>详情 ›</button>}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="审核结论">
          <div className="p-3 flex gap-2">
            <button className="btn btn-primary flex-1" disabled={pending > 0} onClick={() => { toast(`${cur.stage}通过，流转到下一级`); back() }}>通过</button>
            <button className="btn flex-1" onClick={() => { toast('已退回内训师修改，附全部批注'); back() }}>退回修改</button>
          </div>
          {pending > 0 && <div className="px-3 pb-3 text-[10.5px] text-slate-500">处理完 {pending} 条待处理批注后可通过。</div>}
        </Panel>
      </div>
    </div>
  )
}

export function NoteView({ course, id }: { course: string; id: string }) {
  const { toast, back } = useNav()
  const c = findCourse(course)
  const n = c?.reviews.flatMap(r => r.notes).find(x => x.id === id)
  if (!c || !n) return <div className="p-6 text-slate-400">批注不存在（人工新增批注在本次会话内处理）</div>
  const pages = c.chapters.flatMap(ch => slidesFor(c, ch))
  const s = pages[Math.min(pages.length - 1, n.page - 1)]
  return (
    <div className="h-full grid grid-cols-[1fr_360px] gap-3 p-3 min-h-0">
      <Panel title={`第 ${n.page} 页　${s.title}`}><div className="p-4"><div className="max-w-[820px] mx-auto"><Slide s={s} i={n.page - 1} c={c} /></div></div></Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="批注">
          <div className="p-3">
            <div className="flex items-center gap-1.5 mb-2"><span className={`tag ${n.kind === 'AI 自检' ? '' : 'tag-gold'}`}>{n.kind}</span><span className={`tag tag-${n.sev === 'ok' ? 'ok' : n.sev}`}>{n.sev === 'bad' ? '必改' : '建议'}</span><StatusTag s={n.st} /></div>
            <div className="text-[13px] leading-relaxed">{n.text}</div>
          </div>
        </Panel>
        <Panel title="AI 修改建议" className="flex-1">
          <div className="p-3">
            <div className="ai-out"><Typewriter text={`${n.fix}。\n\n修改后本页：\n· 标题保持"${s.title}"\n· ${s.bullets[0]}\n· ${s.bullets[1] ?? ''}\n· 补充出处：${c.src[0] ?? '相关条款'}\n\n影响：本页讲解词同步更新，关联题目 ${Math.max(1, n.page % 4)} 道进入复核。`} speed={7} /></div>
            <div className="flex gap-2 mt-3"><button className="btn btn-primary flex-1" onClick={() => { toast('已采纳并更新本页'); back() }}>采纳修改</button><button className="btn flex-1" onClick={() => { toast('已标记为已确认，无需修改'); back() }}>无需修改</button></div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
