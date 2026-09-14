/* 一级：工厂驾驶舱 */
import { Panel, CountUp } from '../ui'
import { COURSES, TOTAL_COURSES, TOTAL_QUESTIONS, TREND_F, F_INSIGHTS, unitCourseDist, REVIEW_QUEUE, MICROS, TRAINERS, allCourses } from './data'
import { useNav, Kpi, KindTag, StatusTag, AreaChart } from './nav'
import type { Route } from './nav'

export default function Board() {
  const { push } = useNav()
  const dist = unitCourseDist().slice(0, 12)
  const max = dist[0].n
  const hot = [...COURSES].filter(c => c.status === '已发布').sort((a, b) => b.stats.learners - a.stats.learners).slice(0, 8)
  const kinds = ['必修课', '专题课', '岗位入门', '复训课', '微课'] as const
  const kindN: Record<string, number> = { 必修课: 186, 专题课: 512, 岗位入门: 214, 复训课: 168, 微课: 206 }
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="累计成课" v={<CountUp to={TOTAL_COURSES} />} d="本年新增 342 门 · 内训师自主 71%" onClick={() => push({ v: 'lib' })} spark={TREND_F.map(t => t.made)} />
        <Kpi k="题库题量" v={<CountUp to={TOTAL_QUESTIONS} />} d="逐题挂接规程锚点" gold onClick={() => push({ v: 'bank' })} />
        <Kpi k="平均开发周期" v={<><CountUp to={2.4} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">天</span></>} d="原料入库到发布，含两级审核" onClick={() => push({ v: 'gen' })} />
        <Kpi k="待审核课程" v={<CountUp to={REVIEW_QUEUE.length + 9} />} d="内训师审核 · 专业部门审核" gold onClick={() => push({ v: 'review' })} />
        <Kpi k="本周学习人次" v={<CountUp to={TREND_F[25].learners} />} d={`通过率 ${TREND_F[25].pass}%`} onClick={() => push({ v: 'analytics' })} spark={TREND_F.map(t => t.learners)} />
        <Kpi k="微课与内训师" v={<><CountUp to={MICROS.length + 182} /><span className="text-[12px] font-normal text-slate-500 ml-1">/ {TRAINERS.length + 154}</span></>} d="数字人微课 · 认证内训师" gold onClick={() => push({ v: 'media' })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="课程构成" extra={<button className="btn btn-sm" onClick={() => push({ v: 'lib' })}>课程库</button>}>
            <div className="p-3 space-y-2">
              {kinds.map((k, i) => (
                <button key={k} onClick={() => push({ v: 'lib', kind: k })} className="w-full text-left group">
                  <div className="flex items-center text-[11.5px] mb-1"><KindTag k={k} /><span className="ml-auto num text-slate-600 group-hover:text-[var(--ai)]">{kindN[k]}</span></div>
                  <div className="h-[6px] bg-slate-100 rounded"><div className="h-full bar-grow" style={{ width: `${kindN[k] / 5.4}%`, background: ['#1e3a6e', '#2f6df6', '#19b8d8', '#b08a3e', '#7b5cf5'][i], animationDelay: `${i * .06}s` }} /></div>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="产线状态" extra={<span className="text-[10.5px] text-slate-500">实时</span>}>
            <div className="p-3 space-y-1.5">
              {[['生成中', allCourses().filter(c => c.status === '生成中').length + 3, { v: 'gen' } as Route], ['内训师审核中', allCourses().filter(c => c.status === '内训师审核中').length, { v: 'review' } as Route], ['专业部门审核中', allCourses().filter(c => c.status === '专业部门审核中').length, { v: 'review' } as Route], ['微课渲染中', MICROS.filter(m => m.status === '渲染中').length, { v: 'media' } as Route], ['规程更新待处理', 26, { v: 'review' } as Route]].map(([k, n, r]) => (
                <button key={k as string} onClick={() => push(r as Route)} className="w-full flex items-center gap-2 hairline px-2.5 py-2 text-[12px] hover:border-[var(--ai)]">
                  <span className="w-1.5 h-1.5 pulse-dot" style={{ background: 'var(--ai)' }} /><span>{k as string}</span>
                  <span className="ml-auto num font-semibold" style={{ color: 'var(--indigo)' }}>{n as number}</span><span className="text-[var(--gold)]">›</span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="AI 洞察" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1.5">
              {F_INSIGHTS.map(x => (
                <button key={x.k} onClick={() => push(x.go as Route)} className="a-card w-full text-left">
                  <div className="flex items-center gap-2"><span className={`tag tag-${x.tag}`}>{x.k}</span><span className="num text-[12px] font-semibold" style={{ color: 'var(--indigo)' }}>{x.v}</span></div>
                  <div className="text-[11px] text-slate-600 leading-snug mt-1">{x.d}</div><span className="go">›</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="成课、学习与通过率趋势　近 26 周">
            <div className="px-3 pt-2 pb-1"><AreaChart data={[TREND_F.map(t => t.made * 30), TREND_F.map(t => t.learners), TREND_F.map(t => t.pass * 20)]} keys={['新成课（×30）', '学习人次', '通过率（×20）']} colors={['#1e3a6e', '#2f6df6', '#b08a3e']} labels={TREND_F.map(t => t.w)} h={170} /></div>
          </Panel>
          <Panel title="按一级单位分布　课程数" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'lib' })}>全部 28 个单位</button>}>
            <div className="p-3 space-y-[6px]">
              {dist.map((d, i) => (
                <button key={d.u.id} onClick={() => push({ v: 'lib', unit: d.u.name })} className="w-full flex items-center gap-2.5 group">
                  <span className="w-[150px] shrink-0 text-[11.5px] text-right truncate text-slate-600 group-hover:text-[var(--ai)]">{d.u.name}</span>
                  <span className="flex-1 h-[14px] bg-slate-100 rounded relative overflow-hidden"><span className="absolute inset-y-0 left-0 bar-grow" style={{ width: `${d.n / max * 100}%`, background: d.u.grp === '本部职能部门' ? 'linear-gradient(90deg,var(--gold),var(--gold-2))' : d.u.grp === '直属机构' ? '#6a86b8' : 'linear-gradient(90deg,var(--indigo),var(--ai))', animationDelay: `${i * .05}s` }} /></span>
                  <span className="w-[48px] num text-[11.5px] text-slate-600">{d.n}</span>
                  <span className="text-[10px] text-slate-400 w-[70px] text-left">{d.u.grp}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="待办">
            <div className="p-2 space-y-1.5">
              {[['我提交的课程待审核', 3, { v: 'review' } as Route], ['本周到期的内训师任务', TRAINERS.flatMap(t => t.tasks).filter(t => t.st !== '已完成').length, { v: 'trainer' } as Route], ['通过率偏低待修订', 3, { v: 'analytics' } as Route], ['微课脚本待审', MICROS.filter(m => m.status === '脚本待审').length, { v: 'media' } as Route]].map(([k, n, r]) => (
                <button key={k as string} onClick={() => push(r as Route)} className="w-full flex items-center gap-2 hairline px-2.5 py-2 text-[12px] hover:border-[var(--ai)]">
                  <span className="w-1.5 h-1.5 pulse-dot" style={{ background: 'var(--gold)' }} /><span>{k as string}</span>
                  <span className="ml-auto num font-semibold" style={{ color: 'var(--indigo)' }}>{n as number}</span><span className="text-[var(--gold)]">›</span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="热门课程　学习人数" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1">
              {hot.map((c, i) => (
                <button key={c.id} onClick={() => push({ v: 'course', id: c.id })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg row-in" style={{ animationDelay: `${i * .05}s` }}>
                  <span className="num text-[11px] w-[14px]" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</span>
                  <KindTag k={c.kind} /><span className="text-[12px] truncate flex-1">{c.name}</span>
                  <span className="num text-[11px] text-slate-500">{c.stats.learners.toLocaleString()}</span><StatusTag s={c.status} />
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
