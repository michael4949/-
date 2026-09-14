/* 课程效果分析（一级）→ 课程效果（二级）→ 修订任务（三级） */
import { useState } from 'react'
import { Panel, Bars, Progress } from '../ui'
import { COURSES, TREND_F, QUESTIONS } from './data'
import { findCourse } from './store'
import { useNav, KindTag, StatusTag, AreaChart, Typewriter, QTag } from './nav'
import { LearnView } from './Lib'

export function AnalyticsView() {
  const { push, toast } = useNav()
  const pub = COURSES.filter(c => c.status === '已发布' && c.stats.learners > 0)
  const low = [...pub].sort((a, b) => a.stats.pass - b.stats.pass).slice(0, 6)
  const top = [...pub].sort((a, b) => b.stats.rating - a.stats.rating || b.stats.learners - a.stats.learners).slice(0, 6)
  const [tab, setTab] = useState<'low' | 'top'>('low')
  const lift = [['倒闸操作', 11], ['间接验电', 9], ['投诉处理', 8], ['票据审核', 7], ['公文规范', 6], ['采购合规', 6], ['反送电判断', 5]].map(([k, v]) => ({ label: k as string, v: v as number }))
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        {[['本周学习人次', TREND_F[25].learners.toLocaleString(), '较上周 +6.4%'], ['平均完成率', '86.3%', '较上月 +1.8 个百分点'], ['平均通过率', `${TREND_F[25].pass}%`, '一次通过'], ['平均评分', '4.5', '5 分制 · 12,840 条评价'], ['能力提升', '+7.4 分', '学完课程后能力项平均提升']].map(([k, v, d], i) => (
          <div key={k} className={`hkpi ${i % 2 ? 'gold' : ''}`}><div className="k">{k}</div><div className="v num">{v}</div><div className="d">{d}</div></div>
        ))}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_360px_340px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="学习人次与通过率趋势　近 26 周"><div className="px-3 pt-2 pb-1"><AreaChart data={[TREND_F.map(t => t.learners), TREND_F.map(t => t.pass * 20)]} keys={['学习人次', '通过率（×20）']} colors={['#2f6df6', '#b08a3e']} labels={TREND_F.map(t => t.w)} h={160} /></div></Panel>
          <Panel title={tab === 'low' ? '通过率偏低课程' : '评价最高课程'} className="flex-1" bodyClass="overflow-auto scroll" extra={<div className="seg"><button className={tab === 'low' ? 'on' : ''} onClick={() => setTab('low')}>待修订</button><button className={tab === 'top' ? 'on' : ''} onClick={() => setTab('top')}>口碑</button></div>}>
            <table className="grid">
              <thead><tr><th>课程</th><th>单位 / 岗位</th><th>学习</th><th>完成率</th><th>通过率</th><th>评分</th><th></th></tr></thead>
              <tbody>{(tab === 'low' ? low : top).map(c => (
                <tr key={c.id} className="cursor-pointer" onClick={() => push({ v: 'courseStats', id: c.id })}>
                  <td><div className="flex items-center gap-1.5"><KindTag k={c.kind} /><span className="font-medium">{c.name}</span></div></td><td className="text-[11.5px] text-slate-600">{c.unit.replace(/（.*）/, '')} · {c.post}</td>
                  <td className="num">{c.stats.learners.toLocaleString()}</td><td className="num">{c.stats.done}%</td>
                  <td className="w-[100px]"><div className="flex items-center gap-1.5"><div className="flex-1"><Progress v={c.stats.pass} /></div><span className="num text-[11px]" style={{ color: c.stats.pass < 75 ? 'var(--bad)' : undefined }}>{c.stats.pass}%</span></div></td>
                  <td className="num">{c.stats.rating.toFixed(1)}</td><td><button className="btn btn-sm">分析 ›</button></td>
                </tr>
              ))}</tbody>
            </table>
          </Panel>
        </div>
        <Panel title="课程 → 能力提升　分" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">来自成长地图</span>}>
          <div className="p-3"><Bars data={lift} max={14} /><div className="text-[11.5px] text-slate-500 leading-relaxed mt-3 hair-t pt-2">学完对应课程后 90 天内的能力项得分变化，与陪练成绩和考试成绩联动计算。</div></div>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 修订建议" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1.5">
              {low.slice(0, 4).map(c => <button key={c.id} onClick={() => push({ v: 'revision', id: c.id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className="tag tag-warn">通过率 {c.stats.pass}%</span><span className="text-[12px] font-medium truncate">{c.name}</span></div><div className="text-[11px] text-slate-600 mt-1 leading-snug">{`第${['一', '二', '三', '四', '五', '六'][c.chapters.reduce((m, ch, i, arr) => ch.drop > arr[m].drop ? i : m, 0)]}章流失 ${Math.max(...c.chapters.map(ch => ch.drop))}%，建议拆分并补充示意图；错题集中知识点已生成变式题。`}</div><span className="go">›</span></button>)}
              <button className="btn w-full" onClick={() => toast('已导出本月效果报告')}>导出效果报告</button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export function CourseStats({ id }: { id: string }) { return <LearnView id={id} /> }

export function RevisionView({ id }: { id: string }) {
  const { push, toast, back } = useNav()
  const c = findCourse(id)
  const [items, setItems] = useState<{ k: string; d: string; owner: string; on: boolean }[]>(() => c ? [
    { k: `拆分第${['一', '二', '三', '四', '五', '六'][c.chapters.reduce((m, ch, i, arr) => ch.drop > arr[m].drop ? i : m, 0)]}章`, d: '按知识点拆为两讲，前置示意图与现场实拍', owner: c.owner, on: true },
    { k: '替换错题率最高的 3 道题', d: '以变式题替换，保留历史作答数据', owner: '培训评价中心', on: true },
    { k: '更新引用条款', d: `${c.src[0] ?? ''} 已按新版修订，同步讲义与讲解词`, owner: c.owner, on: true },
    { k: '补充微课', d: '为流失最高章节生成 3 分钟数字人微课', owner: '微课工作室', on: false },
    { k: '推送陪练分支', d: '把错题知识点推送到教练编辑器生成分支', owner: '陪练剧本维护', on: false },
  ] : [])
  if (!c) return null
  const wrong = QUESTIONS.filter(q => c.src.includes(q.anchor)).sort((a, b) => a.stats.correct - b.stats.correct).slice(0, 3)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`修订任务　${c.name}`} extra={<StatusTag s={c.status} />} bodyClass="overflow-auto scroll">
        <div className="p-4">
          <div className="ai-out mb-4"><Typewriter text={`【修订依据】通过率 ${c.stats.pass}%，完成率 ${c.stats.done}%；流失最高章节 ${Math.max(...c.chapters.map(ch => ch.drop))}%；错题集中在 ${wrong.map(q => q.kp).filter((v, i, a) => a.indexOf(v) === i).join('、')}；学员反馈提到内容偏密与缺少实拍。以下任务按影响面排序，勾选后一键派发。`} speed={7} /></div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <label key={it.k} className={`a-card flex gap-3 items-start cursor-pointer ${it.on ? '' : 'opacity-70'}`}>
                <input type="checkbox" checked={it.on} onChange={() => setItems(s => s.map((x, j) => j === i ? { ...x, on: !x.on } : x))} className="mt-1 accent-[var(--ai)]" />
                <div className="flex-1"><div className="flex items-center gap-2"><span className="text-[13px] font-medium">{it.k}</span><span className="tag ml-auto">{it.owner}</span></div><div className="text-[11.5px] text-slate-600 mt-0.5">{it.d}</div></div>
              </label>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-3 mb-1.5">相关错题</div>
          {wrong.map(q => <button key={q.id} onClick={() => push({ v: 'question', id: q.id })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px]"><QTag k={q.kind} /><span className="truncate flex-1">{q.stem}</span><span className="num text-[11px]" style={{ color: 'var(--bad)' }}>{q.stats.correct}%</span></button>)}
        </div>
      </Panel>
      <div className="flex flex-col gap-3">
        <Panel title="派发"><div className="p-3 space-y-2"><div className="text-[12px] text-slate-600">已选 {items.filter(i => i.on).length} 项，涉及 {new Set(items.filter(i => i.on).map(i => i.owner)).size} 个责任方，预计 {(items.filter(i => i.on).length * 0.6 + 0.8).toFixed(1)} 天完成。</div><button className="btn btn-primary w-full" onClick={() => { toast('修订任务已派发，课程进入修订版本 ' + c.ver.replace(/\d+/, m => String(+m + 1))); back() }}>一键派发</button><button className="btn w-full" onClick={() => push({ v: 'course', id: c.id })}>返回课程</button></div></Panel>
        <Panel title="修订后预期" className="flex-1"><div className="p-3 space-y-1.5 text-[12px]">{[['通过率', `${c.stats.pass}% → ${Math.min(96, c.stats.pass + 9)}%`], ['完成率', `${c.stats.done}% → ${Math.min(98, c.stats.done + 5)}%`], ['流失最高章节', `${Math.max(...c.chapters.map(ch => ch.drop))}% → ${Math.max(4, Math.round(Math.max(...c.chapters.map(ch => ch.drop)) / 2))}%`]].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="num font-medium">{v}</span></div>)}<div className="text-[11px] text-slate-500 pt-2 hair-t">预期值来自同类课程修订后的实际变化。</div></div></Panel>
      </div>
    </div>
  )
}
