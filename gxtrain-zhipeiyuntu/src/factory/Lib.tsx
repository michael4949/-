/* 课程库（一级）→ 课程详情（二级）→ 学习数据（三级） */
import { useMemo, useState } from 'react'
import { Panel, Progress, Bars } from '../ui'
import { UNITS, UNIT_GROUPS } from '../units'
import { allCourses, OUTPUTS, QUESTIONS, unitLabels } from './data'
import type { CourseKind } from './data'
import { findCourse } from './store'
import { useNav, KindTag, StatusTag, QTag } from './nav'
import type { Route } from './nav'
import { ProgressRow } from './Gen'

const KINDS: CourseKind[] = ['必修课', '专题课', '岗位入门', '复训课', '微课']
const STATUSES = ['已发布', '内训师审核中', '专业部门审核中', '生成中', '草稿', '已下线']

export function LibView({ r }: { r: Extract<Route, { v: 'lib' }> }) {
  const { push } = useNav()
  const [grp, setGrp] = useState<string>(r.unit ? (UNITS.find(u => u.name === r.unit)?.grp ?? '') : '')
  const [unit, setUnit] = useState(r.unit ?? '')
  const [kind, setKind] = useState<string>(r.kind ?? '')
  const [status, setStatus] = useState(r.status ?? '')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'card' | 'list'>('card')
  const [sort, setSort] = useState<'updated' | 'learners' | 'pass'>('updated')
  const rows = useMemo(() => {
    let l = allCourses().filter(c => (!unit || c.unit === unit) && (!grp || unit || c.grp === grp || c.grp === '公司通用') && (!kind || c.kind === kind) && (!status || c.status === status) && (!q || c.name.includes(q) || c.post.includes(q) || c.tags.some(t => t.includes(q))))
    l = [...l].sort((a, b) => sort === 'updated' ? b.updated.localeCompare(a.updated) : sort === 'learners' ? b.stats.learners - a.stats.learners : a.stats.pass - b.stats.pass)
    return l
  }, [unit, grp, kind, status, q, sort])
  return (
    <div className="h-full grid grid-cols-[240px_1fr] gap-3 p-3 min-h-0">
      <Panel title="筛选" bodyClass="overflow-auto scroll" extra={<button className="text-[11px] underline text-slate-500" onClick={() => { setGrp(''); setUnit(''); setKind(''); setStatus(''); setQ('') }}>清除</button>}>
        <div className="p-2">
          <div className="text-[10.5px] text-slate-400 px-2 pt-1 pb-1">组织</div>
          <button className={`tree-node ${!grp && !unit ? 'on' : ''}`} onClick={() => { setGrp(''); setUnit('') }}>全公司<span className="n">{allCourses().length}</span></button>
          {UNIT_GROUPS.map(g => (
            <div key={g}>
              <button className={`tree-node ${grp === g && !unit ? 'on' : ''}`} onClick={() => { setGrp(grp === g && !unit ? '' : g); setUnit('') }}><span className="arrow">{grp === g ? '▾' : '▸'}</span>{g}<span className="n">{allCourses().filter(c => c.grp === g).length}</span></button>
              {grp === g && UNITS.filter(u => u.grp === g).map(u => <button key={u.id} className={`tree-node pl-6 ${unit === u.name ? 'on' : ''}`} onClick={() => setUnit(unit === u.name ? '' : u.name)}><span className="truncate">{u.name}</span><span className="n">{allCourses().filter(c => c.unit === u.name).length}</span></button>)}
            </div>
          ))}
          <div className="text-[10.5px] text-slate-400 px-2 pt-3 pb-1">类型</div>
          <div className="flex flex-wrap gap-1 px-1">{KINDS.map(k => <button key={k} className={`dim-tab ${kind === k ? 'on' : ''}`} onClick={() => setKind(kind === k ? '' : k)}>{k}</button>)}</div>
          <div className="text-[10.5px] text-slate-400 px-2 pt-3 pb-1">状态</div>
          <div className="flex flex-wrap gap-1 px-1">{STATUSES.map(s => <button key={s} className={`dim-tab ${status === s ? 'on' : ''}`} onClick={() => setStatus(status === s ? '' : s)}>{s}</button>)}</div>
        </div>
      </Panel>
      <Panel title={<span>课程　<span className="num text-[11.5px] font-normal text-slate-500">{rows.length} 门 · 全库 1,286 门</span></span>} extra={
        <>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜课程、岗位、标签" className="hairline px-2 py-1 text-[12px] w-[170px] outline-none" />
          <select value={sort} onChange={e => setSort(e.target.value as never)} className="hairline px-2 py-1 text-[12px] outline-none"><option value="updated">按更新时间</option><option value="learners">按学习人数</option><option value="pass">按通过率（低→高）</option></select>
          <div className="seg"><button className={view === 'card' ? 'on' : ''} onClick={() => setView('card')}>卡片</button><button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>列表</button></div>
          <button className="btn btn-sm btn-primary" onClick={() => push({ v: 'gen' })}>新建课程</button>
        </>} bodyClass="overflow-auto scroll">
        {view === 'card' ? (
          <div className="p-3 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
            {rows.slice(0, 60).map((c, i) => (
              <button key={c.id} onClick={() => push({ v: 'course', id: c.id })} className="a-card text-left row-in flex flex-col" style={{ animationDelay: `${Math.min(i, 16) * .03}s` }}>
                <div className="flex items-center gap-1.5"><KindTag k={c.kind} /><StatusTag s={c.status} />{c.core && <span className="tag tag-gold">精选</span>}<span className="ml-auto num text-[10.5px] text-slate-400">{c.ver}</span></div>
                <div className="text-[13.5px] font-semibold mt-1.5 leading-snug">{c.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{c.unit.replace(/（.*）/, '')} · {c.post} · {c.hours} 学时 · {c.owner}</div>
                <div className="text-[11.5px] text-slate-600 leading-snug mt-1.5 line-clamp-2">{c.summary}</div>
                <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-500">
                  <span><b className="num text-[13px]" style={{ color: 'var(--indigo)' }}>{c.stats.learners.toLocaleString()}</b> 人学习</span>
                  <span><b className="num text-[13px]" style={{ color: c.stats.pass >= 80 ? 'var(--ok)' : c.stats.pass ? 'var(--warn)' : '#94a3b8' }}>{c.stats.pass || '—'}</b>{c.stats.pass ? '% 通过' : ''}</span>
                  <span className="ml-auto">{c.chapters.length} 章 · {c.outputs.配套试题} 题</span>
                </div><span className="go">›</span>
              </button>
            ))}
          </div>
        ) : (
          <table className="grid">
            <thead><tr><th>编号</th><th>类型</th><th>课程</th><th>单位 / 岗位</th><th>学时</th><th>学习</th><th>通过率</th><th>状态</th><th>更新</th></tr></thead>
            <tbody>{rows.slice(0, 80).map(c => (
              <tr key={c.id} className="cursor-pointer" onClick={() => push({ v: 'course', id: c.id })}>
                <td className="num text-slate-500">{c.id}</td><td><KindTag k={c.kind} /></td><td className="font-medium">{c.name}</td><td className="text-[11.5px] text-slate-600">{c.unit.replace(/（.*）/, '')} · {c.post}</td>
                <td className="num">{c.hours}</td><td className="num">{c.stats.learners.toLocaleString()}</td><td className="w-[100px]"><div className="flex items-center gap-1.5"><div className="flex-1"><Progress v={c.stats.pass} /></div><span className="num text-[11px]">{c.stats.pass || '—'}</span></div></td>
                <td><StatusTag s={c.status} /></td><td className="num text-[11px] text-slate-400">{c.updated}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {rows.length > 60 && <div className="p-3 text-[11.5px] text-slate-500 text-center hair-t">已显示前 {view === 'card' ? 60 : 80} 门，继续缩小筛选</div>}
      </Panel>
    </div>
  )
}

/* ---------- 二级：课程详情 ---------- */
export function CourseView({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const c = findCourse(id)
  if (!c) return <div className="p-6 text-slate-400">课程不存在</div>
  const idx = c.reviews.findIndex(r => r.result === '进行中')
  const notes = c.reviews.flatMap(r => r.notes)
  const qs = QUESTIONS.filter(q => c.src.includes(q.anchor)).slice(0, 5)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0">
          <div className="flex items-center gap-2 mb-1"><KindTag k={c.kind} /><span className="num text-[11px] text-slate-400">{c.id}</span><StatusTag s={c.status} /><span className="tag">{c.ver}</span>{c.tags.map(t => <span key={t} className="tag tag-gold">{t}</span>)}<span className="ml-auto text-[11px] text-slate-500">更新 {c.updated} · 内训师 {c.owner} · 开发周期 {c.period} 天</span></div>
          <div className="text-[19px] font-semibold serif">{c.name}</div>
          <div className="text-[12.5px] text-slate-600 mt-1">{c.summary}</div>
          <div className="grid grid-cols-6 gap-2 mt-3">
            {[['学习人数', c.stats.learners.toLocaleString()], ['完成率', c.stats.done ? c.stats.done + '%' : '—'], ['通过率', c.stats.pass ? c.stats.pass + '%' : '—'], ['平均分', c.stats.score ? c.stats.score.toFixed(1) : '—'], ['评价', c.stats.rating ? c.stats.rating.toFixed(1) : '—'], ['反馈', String(c.stats.feedback)]].map(([k, v], i) => (
              <button key={k} onClick={() => push({ v: 'learn', id: c.id })} className="hairline py-2 text-center hover:border-[var(--ai)]"><div className={`num text-[19px] font-semibold ${i % 2 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr] gap-3">
          <Panel title={`章节　${c.chapters.length} 章 · ${c.hours} 学时`} bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1.5">
              {c.chapters.map((ch, i) => (
                <button key={ch.no} onClick={() => push({ v: 'chapter', course: c.id, no: i })} className="a-card w-full text-left row-in" style={{ animationDelay: `${i * .05}s` }}>
                  <div className="flex items-center gap-2"><span className="text-[var(--gold)] font-semibold text-[11.5px]">{ch.no}</span><span className="text-[12.5px] font-medium">{ch.title}</span><span className="ml-auto num text-[10.5px] text-slate-400">{ch.minutes} 分钟 · {ch.pages} 页</span></div>
                  <div className="flex items-center gap-2 mt-1.5"><div className="flex-1"><Progress v={100 - ch.drop} color={ch.drop > 20 ? 'var(--warn)' : undefined} /></div><span className="num text-[10.5px] text-slate-500">留存 {100 - ch.drop}%</span></div><span className="go">›</span>
                </button>
              ))}
            </div>
          </Panel>
          <div className="flex flex-col gap-3 min-h-0">
            <Panel title="产出物" extra={<button className="btn btn-sm" onClick={() => push({ v: 'output', course: c.id, kind: '课件' })}>全部预览 ›</button>}>
              <div className="p-2 grid grid-cols-5 gap-1.5">{OUTPUTS.map(o => <button key={o} className="hairline py-2 text-center hover:border-[var(--ai)]" onClick={() => push({ v: 'output', course: c.id, kind: o })}><div className="num text-[17px] font-semibold num-grad">{c.outputs[o]}</div><div className="text-[10px] text-slate-500">{o}</div></button>)}</div>
            </Panel>
            <Panel title="审核流" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'reviewDetail', id: c.id })}>审核详情 ›</button>}>
              <div className="p-3">
                {c.reviews.map((r, i) => (
                  <div key={r.stage} className="flex gap-2.5 pb-3 relative">
                    <div className="shrink-0 relative"><div className={`stage-dot ${r.result === '通过' ? 'done' : i === idx ? 'cur' : ''}`}>{r.result === '通过' ? '✓' : i + 1}</div>{i < 2 && <span className="absolute left-1/2 top-[26px] bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div>
                    <div className="min-w-0 pt-0.5"><div className="flex items-center gap-2"><span className="text-[12.5px] font-medium">{r.stage}</span><StatusTag s={r.result} /></div><div className="text-[11px] text-slate-500">{r.who} · {r.when}{r.notes.length > 0 && ` · 批注 ${r.notes.length} 条`}</div></div>
                  </div>
                ))}
                {notes.filter(n => n.st === '待处理').length > 0 && <div className="text-[11.5px] px-2.5 py-2 rounded-lg" style={{ background: '#fdf6ea', color: 'var(--warn)' }}>待处理批注 {notes.filter(n => n.st === '待处理').length} 条，其中 AI 自检 {notes.filter(n => n.st === '待处理' && n.kind === 'AI 自检').length} 条可一键采纳</div>}
              </div>
            </Panel>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 动作">
          <div className="p-2 space-y-1.5">
            {[['改编到其他岗位', '同课换岗位口径', 'draft'], ['生成复训版', '压缩为 1 学时', 'draft'], ['按规程新版更新', '自动替换引用', 'draft'], ['生成数字人微课', '推送微课工作室', 'media'], ['生成陪练剧本', '推送教练编辑器', 'coach']].map(([k, d, go], i) => (
              <button key={k} className={`act-btn ${i % 2 ? 'gold' : ''}`} onClick={() => go === 'media' ? push({ v: 'media' }) : go === 'coach' ? (toast('已推送到教练编辑器'), jump('coach', 'editor')) : push({ v: 'output', course: c.id, kind: '讲义' })}><span className="ic">{['改', '复', '新', '微', '练'][i]}</span>{k}<small>{d}</small></button>
            ))}
          </div>
        </Panel>
        <Panel title="原料与出处" extra={<span className="text-[10.5px] text-slate-500">来自知识资产中枢</span>}>
          <div className="p-2 space-y-1">
            {c.src.map(a => <button key={a} onClick={() => jump('hub', 'catalog', { v: 'asset', id: a })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px]"><span className="tag tag-gold">{a}</span><span className="truncate flex-1 text-slate-600">{QUESTIONS.find(q => q.anchor === a)?.anchorText.split('（')[0] ?? '知识资产条目'}</span><span className="text-[var(--gold)]">›</span></button>)}
          </div>
        </Panel>
        <Panel title="配套试题" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'bank', post: c.post })}>题库 ›</button>}>
          <div className="p-2 space-y-1">{qs.map(q => <button key={q.id} onClick={() => push({ v: 'question', id: q.id })} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px] flex items-center gap-2"><QTag k={q.kind} /><span className="truncate flex-1">{q.stem}</span><span className="num text-[10.5px] text-slate-400">{q.stats.correct}%</span></button>)}</div>
        </Panel>
        <Panel title="版本"><div className="p-3 space-y-1.5">{c.history.map(h => <div key={h.ver} className="text-[11.5px]"><b>{h.ver}</b> <span className="num text-slate-400">{h.date}</span> · {h.by} <div className="text-slate-500">{h.note}</div></div>)}</div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：学习数据 ---------- */
export function LearnView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const c = findCourse(id)
  if (!c) return null
  const units = unitLabels(8).map((label, i) => ({ label, v: Math.max(40, Math.min(99, c.stats.pass + ((i * 7) % 15) - 7)) }))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <Panel title="学习漏斗" bodyClass="overflow-auto scroll">
        <div className="p-4 funnel">
          {[['报名', 100, c.stats.learners], ['开始学习', 94, Math.round(c.stats.learners * .94)], ['完成课程', c.stats.done, Math.round(c.stats.learners * c.stats.done / 100)], ['参加考试', Math.round(c.stats.done * .92), Math.round(c.stats.learners * c.stats.done / 100 * .92)], ['考试通过', Math.round(c.stats.done * .92 * c.stats.pass / 100), Math.round(c.stats.learners * c.stats.done / 100 * .92 * c.stats.pass / 100)]].map(([k, w, n], i) => (
            <div key={k as string} className="fr" style={{ width: `${Math.max(18, w as number)}%`, background: `linear-gradient(90deg, var(--indigo), ${i > 2 ? 'var(--gold-2)' : 'var(--ai)'})`, animationDelay: `${i * .08}s` }}>{k as string} · {(n as number).toLocaleString()} 人 · {w as number}%</div>
          ))}
          <div className="hair-t mt-4 pt-3"><Bars title="各单位通过率（%）" data={units} unit="%" max={100} /></div>
        </div>
      </Panel>
      <Panel title="章节留存与失分点" bodyClass="overflow-auto scroll">
        <div className="p-4 space-y-2">
          {c.chapters.map(ch => <div key={ch.no}><ProgressRow k={ch.no} v={100 - ch.drop} /><div className="text-[10.5px] text-slate-500 pl-[68px]">{ch.title} · 流失 {ch.drop}%{ch.drop > 15 && <span className="tag tag-warn ml-2">建议拆分</span>}</div></div>)}
          <div className="hair-t pt-3 mt-3 text-[11px] text-slate-500 mb-1.5">错题率最高的题目</div>
          {QUESTIONS.filter(q => c.src.includes(q.anchor)).sort((a, b) => a.stats.correct - b.stats.correct).slice(0, 4).map(q => <button key={q.id} onClick={() => push({ v: 'question', id: q.id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><QTag k={q.kind} /><span className="text-[12px] truncate flex-1">{q.stem}</span><span className="num text-[11px]" style={{ color: 'var(--bad)' }}>正确率 {q.stats.correct}%</span></div><span className="go">›</span></button>)}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="学员反馈" extra={<span className="num text-[11px] text-slate-500">{c.stats.feedback} 条</span>}>
          <div className="p-3 space-y-2 text-[11.5px]">
            {['案例贴近现场，第五章验电的部分最实用。', '第四章内容偏密，建议拆成两讲。', '希望补充一个夜间操作的实拍。'].map((t, i) => <div key={i} className="hairline px-2.5 py-2"><span className="text-[var(--gold)] mr-1">{'★★★★★'.slice(0, 5 - (i % 2))}</span>{t}</div>)}
          </div>
        </Panel>
        <Panel title="AI 修订建议" className="flex-1">
          <div className="p-3 space-y-2 text-[12px]">
            <div className="ai-out text-[12px]">{`第${['一', '二', '三', '四', '五', '六'][c.chapters.reduce((m, ch, i, arr) => ch.drop > arr[m].drop ? i : m, 0)]}章流失最高，建议拆分并前置示意图；错题集中的知识点已生成 3 道变式题；引用条款 ${c.src[0] ?? ''} 的表述建议与助手条目对齐。`}</div>
            <button className="btn btn-primary w-full" onClick={() => push({ v: 'revision', id: c.id })}>生成修订任务</button>
            <button className="btn w-full" onClick={() => toast('已导出学习数据')}>导出数据</button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
