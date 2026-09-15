/* 内训师工作台（一级）→ 内训师档案（二级）→ 课程（三级，复用课程详情） */
import { useState } from 'react'
import { Panel, Progress } from '../ui'
import { UNIT_GROUPS } from '../units'
import { TRAINERS } from './data'
import { trainerById, findCourse } from './store'
import { useNav, KindTag, StatusTag, Typewriter } from './nav'

export function TrainerView() {
  const { push, toast } = useNav()
  const [grp, setGrp] = useState('')
  const [cert, setCert] = useState('')
  const list = TRAINERS.filter(t => (!grp || t.grp === grp) && (!cert || t.cert === cert)).sort((a, b) => b.score - a.score)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`内训师　${list.length} 位（展示）· 认证 178 位`} extra={<div className="flex gap-1 items-center"><button className={`dim-tab ${!grp ? 'on' : ''}`} onClick={() => setGrp('')}>全部</button>{UNIT_GROUPS.filter(g => TRAINERS.some(t => t.grp === g)).map(g => <button key={g} className={`dim-tab ${grp === g ? 'on' : ''}`} onClick={() => setGrp(g)}>{g}</button>)}<select value={cert} onChange={e => setCert(e.target.value)} className="hairline px-2 py-0.5 text-[11px] ml-2"><option value="">全部状态</option>{['已认证', '培训中', '待认证'].map(s => <option key={s}>{s}</option>)}</select></div>} bodyClass="overflow-auto scroll">
        <div className="p-3 grid grid-cols-3 gap-3">
          {list.map((t, i) => (
            <button key={t.id} onClick={() => push({ v: 'trainerDetail', id: t.id })} className="a-card text-left row-in" style={{ animationDelay: `${i * .04}s` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-[15px] font-semibold text-white serif" style={{ background: t.grp === '本部职能部门' ? 'linear-gradient(135deg,var(--gold),var(--gold-2))' : t.grp === '直属机构' ? '#6a86b8' : 'linear-gradient(135deg,var(--indigo),var(--ai))' }}>{t.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-[13.5px] font-semibold">{t.name}</span><StatusTag s={t.cert} /><span className="num text-[10.5px] text-slate-400 ml-auto">{t.batch}</span></div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5">{t.title} · {t.unit.replace(/（.*）/, '')}</div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">{t.topics.map(x => <span key={x} className="tag">{x}</span>)}</div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500"><span>课程 <b className="num text-[12.5px]" style={{ color: 'var(--indigo)' }}>{t.courses.length}</b></span><span>题目 <b className="num text-[12.5px]" style={{ color: 'var(--indigo)' }}>{t.questions}</b></span><span>微课 <b className="num text-[12.5px]" style={{ color: 'var(--indigo)' }}>{t.micro}</b></span><span className="ml-auto">课程评分 <b className="num" style={{ color: 'var(--gold)' }}>{t.score || '—'}</b></span></div>
                </div>
              </div><span className="go">›</span>
            </button>
          ))}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="训战营与认证">
          <div className="p-3 grid grid-cols-2 gap-2">
            {[['已办期数', '6 期'], ['结业人数', '178 人'], ['自主成课占比', '71%'], ['第 7 期在训', '24 人']].map(([k, v], i) => <div key={k} className="hairline py-2 text-center"><div className={`num text-[17px] font-semibold ${i % 2 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>)}
          </div>
          <div className="px-3 pb-3 text-[11.5px] text-slate-500 leading-relaxed">认证条件：完成训战营、交付一门通过两级审核的课程、课程评分不低于 4.2。</div>
        </Panel>
        <Panel title="协作任务　本周到期" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1">
            {TRAINERS.flatMap(t => t.tasks.filter(x => x.st !== '已完成').map(x => ({ t, x }))).slice(0, 10).map(({ t, x }, i) => { const c = findCourse(x.course); return (
              <button key={t.id + i} onClick={() => push({ v: 'trainerDetail', id: t.id })} className="w-full text-left hairline px-2.5 py-2 hover:border-[var(--ai)]"><div className="flex items-center gap-2 text-[11.5px]"><span className="font-medium">{t.name}</span><StatusTag s={x.st} /><span className="num text-[10.5px] text-slate-400 ml-auto">截止 {x.due}</span></div><div className="text-[11.5px] text-slate-600 mt-0.5 truncate">{x.stage} · {c?.name ?? x.course}</div></button>) })}
            <button className="btn btn-sm w-full mt-1" onClick={() => toast('已按主题与单位匹配推荐内训师')}>AI 匹配内训师</button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function TrainerDetail({ id }: { id: string }) {
  const { push, toast } = useNav()
  const t = trainerById(id)
  const [ai, setAi] = useState(false)
  if (!t) return null
  const courses = t.courses.map(findCourse).filter(Boolean)
  return (
    <div className="h-full grid grid-cols-[300px_1fr_340px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="内训师档案">
          <div className="p-3.5">
            <div className="flex items-center gap-3 mb-2"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[18px] font-semibold text-white serif" style={{ background: 'linear-gradient(135deg,var(--indigo),var(--ai))' }}>{t.name[0]}</div><div><div className="text-[15px] font-semibold">{t.name}</div><div className="text-[11.5px] text-slate-500">{t.title}</div></div></div>
            <div className="text-[11.5px] text-slate-500">{t.unit} · {t.dept}</div>
            <div className="flex items-center gap-2 mt-2"><StatusTag s={t.cert} /><span className="tag">{t.batch}</span></div>
            <div className="gold-rule my-3" />
            <div className="grid grid-cols-3 gap-2 text-center">{[['课程', courses.length], ['题目', t.questions], ['微课', t.micro]].map(([k, v]) => <div key={k as string} className="hairline py-2"><div className="num text-[17px] font-semibold num-grad">{v as number}</div><div className="text-[10.5px] text-slate-500">{k as string}</div></div>)}</div>
            <div className="flex gap-1 mt-2.5 flex-wrap">{t.topics.map(x => <span key={x} className="tag tag-gold">{x}</span>)}</div>
          </div>
        </Panel>
        <Panel title="认证进度" className="flex-1">
          <div className="p-3">
            {[['完成训战营', t.cert !== '待认证'], ['交付一门通过两级审核的课程', courses.some(c => c!.status === '已发布')], ['课程评分 ≥ 4.2', t.score >= 84], ['年度复训', t.cert === '已认证']].map(([k, ok], i) => <div key={k as string} className="flex items-center gap-2 py-1.5 text-[12px]"><span className="w-4 h-4 rounded-md text-[10px] flex items-center justify-center text-white" style={{ background: ok ? 'var(--ok)' : '#cbd3de' }}>{ok ? '✓' : i + 1}</span><span className={ok ? '' : 'text-slate-400'}>{k as string}</span></div>)}
          </div>
        </Panel>
      </div>
      <Panel title={`产出课程　${courses.length} 门`} bodyClass="overflow-auto scroll">
        <div className="p-2 space-y-1.5">
          {courses.map((c, i) => (
            <button key={c!.id} onClick={() => push({ v: 'course', id: c!.id })} className="a-card w-full text-left row-in" style={{ animationDelay: `${i * .05}s` }}>
              <div className="flex items-center gap-2"><KindTag k={c!.kind} /><span className="text-[13px] font-medium">{c!.name}</span><StatusTag s={c!.status} /><span className="ml-auto num text-[11px] text-slate-500">{c!.stats.learners.toLocaleString()} 人 · 评分 {c!.stats.rating || '—'}</span></div>
              <div className="flex items-center gap-2 mt-1.5"><div className="flex-1"><Progress v={c!.stats.pass} /></div><span className="num text-[10.5px] text-slate-500">通过率 {c!.stats.pass || '—'}%</span></div><span className="go">›</span>
            </button>
          ))}
          {courses.length === 0 && <div className="text-[12px] text-slate-400 py-6 text-center">训战营结业后交付首门课程</div>}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="协作任务" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1">{t.tasks.map((x, i) => { const c = findCourse(x.course); return <div key={i} className="hairline px-2.5 py-2 text-[11.5px]"><div className="flex items-center gap-2"><StatusTag s={x.st} /><span className="num text-[10.5px] text-slate-400 ml-auto">截止 {x.due}</span></div><div className="mt-0.5">{x.stage} · <button className="underline text-[var(--indigo)]" onClick={() => push({ v: 'course', id: x.course })}>{c?.name ?? x.course}</button></div></div> })}{t.tasks.length === 0 && <div className="text-[11.5px] text-slate-400 p-2">暂无</div>}</div>
        </Panel>
        <Panel title="AI 协作建议" className="flex-1">
          <div className="p-3">{ai ? <div className="ai-out"><Typewriter text={`【给 ${t.name} 的下一门课建议】\n\n主题：${t.topics[0]} 的进阶版（成长地图显示 ${t.unit.replace(/（.*）/, '')} 该能力项未达标 ${120 + (t.id.length * 37) % 300} 人）\n原料：中枢已有相关条目 ${6 + t.topics.length * 3} 条，含专家诀窍 ${2 + t.topics.length} 条\n形式：3 学时专题课 + 2 讲微课\n预计周期：AI 生成 0.6 天，校对 0.5 天，审核 1.2 天`} speed={7} /></div> : <div className="text-[12px] text-slate-400 py-4 text-center">根据成长地图缺口与中枢原料，推荐下一门课</div>}
            <div className="flex gap-2 mt-3"><button className="btn btn-primary flex-1" onClick={() => setAi(true)}>生成建议</button><button className="btn flex-1" onClick={() => { toast('已派发协作任务'); push({ v: 'gen' }) }}>去生成</button></div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
