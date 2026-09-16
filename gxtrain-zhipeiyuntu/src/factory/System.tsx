/* 课程体系（一级）→ 主干项目 / 专题课 / 班次（二级）→ 期次（三级） */
import { Panel, Bars, Progress, CountUp } from '../ui'
import { LineChart, Columns, Ring, Gantt } from '../charts'
import { MAIN_PROGRAMS, TOPIC_COURSES, CLASS_CAL, BUREAUS } from '../data'
import { UNITS } from '../units'
import { COURSES } from './data'
import { useNav, Typewriter, Kpi, Field } from './nav'

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const shortUnit = (n: string) => n.replace(/（.*）/, '')
/* 评估表 180 个高价值场景，作为骨干层提交场景与场景开发训战营交付的来源 */
export const EVAL_SCENES = UNITS.flatMap(u => u.scenes.map(x => ({ ...x, unit: shortUnit(u.name) }))).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
const TOP_SCENES = EVAL_SCENES.slice(0, Math.round(EVAL_SCENES.length * .55))
const scenesOf = (seed: number, k: number) => Array.from({ length: k })
  .map((_, i) => TOP_SCENES[(seed * 7 + i * 13) % TOP_SCENES.length])
  .map(x => ({ ...x, unit: x.unit === '地市供电局' ? BUREAUS[(hash(x.name) >>> 2) % BUREAUS.length] : x.unit }))
  .sort((a, b) => b.score - a.score)
/* 场景开发训战营历期交付，ProgramView 的表与 ProgramBatch 的产出共用一份 */
const P3_DELIVERY = [
  { no: 4, dept: '市场营销部', n: '高损台区线损归因辅助', k: '智能体', st: '已上线' },
  { no: 4, dept: '生产技术部', n: '配网缺陷工单自动归类', k: '工作流', st: '已上线' },
  { no: 3, dept: '广西电力交易中心', n: '月度市场分析报告辅助编制', k: '智能体', st: '已上线' },
  { no: 3, dept: '安全监管部', n: '两票常见错项自动校核', k: '智能体', st: '试运行' },
  { no: 2, dept: '物资部', n: '技术规范书草稿生成', k: '智能体', st: '已上线' },
  { no: 2, dept: '人力资源部', n: '培训需求缺口测算', k: '工作流', st: '已上线' },
  { no: 1, dept: '数字化部', n: '培训课件素材智能检索', k: '工作流', st: '已上线' },
  { no: 1, dept: '客户服务中心', n: '停电投诉工单智能归类', k: '智能体', st: '已上线' },
]
const PRI_TAG: Record<string, string> = { P1: 'tag-bad', P2: 'tag-warn', P3: '', P4: '' }
const batchesOf = (id: string) => { const n = id === 'p1' ? 6 : id === 'p3' ? 4 : 12; return Array.from({ length: n + 1 }).map((_, i) => { const h = hash(id + i); return { no: i + 1, d: `2026-${String(i < n ? 1 + Math.floor(i * 9 / n) : 10).padStart(2, '0')}-${String(6 + (h % 20)).padStart(2, '0')}`, n: id === 'p2' ? 1800 + (h % 900) : 24 + (h % 8), venue: id === 'p2' ? '线上 + 地市局' : ['培训评价中心', '广西电科院', '数字化部实训室'][h % 3], pass: 86 + (h % 12), score: 4.4 + (h % 6) / 10, done: i < n } }) }

export function SystemView() {
  const { push, toast, jump } = useNav()
  const quarters = [{ label: 'Q1', v: 14 }, { label: 'Q2', v: 22 }, { label: 'Q3', v: 31 }, { label: 'Q4 计划', v: 19, color: 'var(--gold)' }]
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="主干项目" v={<CountUp to={3} />} d="训战营 · 分层培训 · 场景开发" onClick={() => push({ v: 'program', id: 'p1' })} />
        <Kpi k="分部门专题课" v={<CountUp to={TOPIC_COURSES.length} />} d="按部门岗位定制 · 全部用本业务例子" gold onClick={() => push({ v: 'topic', i: 0 })} />
        <Kpi k="本年开班" v={<CountUp to={86} />} d={`报名中 ${CLASS_CAL.filter(c => c.st === '报名中').length} 期 · 满员 ${CLASS_CAL.filter(c => c.st === '已满员').length} 期`} onClick={() => push({ v: 'classDetail', i: 0 })} />
        <Kpi k="结业人数" v={<CountUp to={2840} />} d="主干项目 + 专题课" gold />
        <Kpi k="平均满意度" v={<><CountUp to={4.7} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">/ 5</span></>} d="12,640 份评价" />
        <Kpi k="结业产出物" v={<CountUp to={1204} />} d="课件 · 智能体 · 场景 · 训练安排" gold />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[340px_1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="三个主干项目" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1.5">{MAIN_PROGRAMS.map(p => <button key={p.id} onClick={() => push({ v: 'program', id: p.id })} className="a-card w-full text-left"><span className="tag tag-gold">{p.badge}</span><div className="text-[12.5px] font-semibold leading-snug mt-1">{p.name}</div><div className="text-[10.5px] text-slate-500 mt-0.5">{p.days}</div><div className="grid grid-cols-3 gap-1 mt-2">{p.stat.map(s => <div key={s.k} className="text-center"><div className="num text-[13px] font-semibold" style={{ color: 'var(--indigo)' }}>{s.v}</div><div className="text-[9.5px] text-slate-500">{s.k}</div></div>)}</div><span className="go">›</span></button>)}</div></Panel>
          <Panel title="各季度开班　期" className="flex-1"><div className="p-3"><Columns h={100} data={quarters} /></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title={`分部门、分岗位业务 AI 专题课　${TOPIC_COURSES.length} 门`} className="flex-1" bodyClass="overflow-auto scroll">
            <table className="grid"><thead><tr><th>面向部门 / 岗位</th><th>课程名称</th><th>课时</th><th>本年参训</th><th>下期开班</th><th>状态</th></tr></thead><tbody>{TOPIC_COURSES.map((c, i) => <tr key={c.name} className="cursor-pointer row-in" onClick={() => push({ v: 'topic', i })}><td className="font-medium">{c.dept}</td><td>{c.name}</td><td className="num whitespace-nowrap">{c.h}</td><td className="num">{c.n}</td><td className="num text-slate-500">{c.next}</td><td><span className={`tag ${CLASS_CAL.some(k => k.n.startsWith(c.name.slice(0, 6)) && k.st === '已满员') ? 'tag-gold' : 'tag-ok'}`}>{CLASS_CAL.some(k => k.n.startsWith(c.name.slice(0, 6)) && k.st === '已满员') ? '已满员' : '报名中'}</span></td></tr>)}</tbody></table>
            <div className="p-3 hair-t"><Bars title="本年各专题课参训人数（人）" data={TOPIC_COURSES.map(c => ({ label: c.dept.length > 8 ? c.dept.slice(0, 8) + '…' : c.dept, v: c.n }))} /></div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="开班日历" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => jump('plan', 'schedule')}>排期 ›</button>}><div className="p-2 space-y-1">{CLASS_CAL.map((c, i) => <button key={c.d + c.n} onClick={() => push({ v: 'classDetail', i })} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg"><div className="flex items-center gap-2 text-[12px]"><span className="num text-slate-500">{c.d}</span><span className="flex-1 truncate">{c.n}</span><span className={`tag ${c.st === '已满员' ? 'tag-gold' : 'tag-ok'}`}>{c.st}</span></div><div className="flex items-center gap-2 mt-1"><div className="flex-1"><Progress v={c.sign / c.cap * 100} /></div><span className="num text-[10.5px] text-slate-500">{c.sign}/{c.cap}</span></div></button>)}</div></Panel>
          <Panel title="结业产出物构成　件" bodyClass="overflow-auto scroll"><div className="p-3"><Bars data={[{ label: '成套课件', v: 178 }, { label: '可用智能体', v: 96 }, { label: '岗位应用场景', v: 788 }, { label: '班组训练安排', v: 142 }]} /></div></Panel>
          <Panel title="AI 判读" className="flex-1 min-h-[172px]" bodyClass="overflow-auto scroll"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`全员 AI 素养覆盖 61.9%，一线层 56% 是缺口，按排期年底可达 92%；${CLASS_CAL.filter(c => c.st === '已满员').map(c => c.n.replace(/（.*）/, '')).join('、')}已满员，候补合计 38 人，建议各加开一期；专题课报名名单来自千人千面计划自动派发。`} speed={7} /></div><button className="btn btn-primary btn-sm w-full mt-2" onClick={() => toast('已为满员班次各加开一期')}>满员班次加开</button></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：主干项目 ---------- */
export function ProgramView({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const p = MAIN_PROGRAMS.find(x => x.id === id) ?? MAIN_PROGRAMS[0]
  const batches = batchesOf(p.id)
  const cover = [12, 21, 30, 38, 45, 52, 58, 61.9, null, null, null, null].map(v => v)
  const plan = [12, 21, 30, 38, 45, 52, 58, 62, 70, 78, 86, 92]
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag tag-gold">{p.badge}</span><div className="text-[18px] font-semibold serif mt-1 leading-snug">{p.name}</div><div className="text-[11.5px] text-slate-500 mt-1">{p.days}</div><div className="grid grid-cols-3 gap-2 mt-3 text-center">{p.stat.map((s, i) => <div key={s.k} className="hairline py-2"><div className={`num text-[18px] font-semibold ${i === 0 ? 'gold-grad' : 'num-grad'}`}>{s.v}</div><div className="text-[10.5px] text-slate-500">{s.k}</div></div>)}</div></div>
        <Panel title="面向谁 · 课程内容 · 结业产出" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-3 text-[12px]"><Field k="面向谁" v={p.who} /><Field k="课程内容" v={<div className="space-y-1.5 mt-1">{p.body.map((b, i) => <div key={b} className="flex gap-2.5 hairline p-2"><span className="num w-5 h-5 shrink-0 text-[11px] flex items-center justify-center text-white rounded" style={{ background: 'var(--indigo)' }}>{i + 1}</span><span className="leading-relaxed">{b}</span></div>)}</div>} /><Field k="结业产出" v={<ul className="space-y-1">{p.out.map(o => <li key={o} className="flex gap-2"><span className="w-1.5 h-1.5 mt-[7px] shrink-0" style={{ background: 'var(--gold)' }} />{o}</li>)}</ul>} /></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        {p.id === 'p2' && <Panel title="分层覆盖率　实际 vs 排期"><div className="px-3 pt-2"><LineChart labels={['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月']} h={140} unit="%" series={[{ name: '排期', color: '#94a3b8', dash: true, data: plan }, { name: '实际覆盖', color: '#2f6df6', area: true, data: cover }]} target={{ v: 90, label: '年底 90%' }} yMin={0} yMax={100} /></div><div className="p-3 hair-t"><Bars data={[{ label: '班子与中层', v: 100 }, { label: '专业骨干', v: 78.4 }, { label: '一线员工', v: 56.2, note: '推进中' }]} unit="%" max={100} /></div></Panel>}
        {p.id === 'p1' && <Panel title="对课程生产能力的影响"><div className="p-3 grid grid-cols-2 gap-3"><div className="hairline p-3"><div className="text-[11px] text-slate-500 mb-2">内训师自有课程占比</div><div className="flex items-center gap-2 mb-1"><span className="text-[11.5px] w-[52px]">训战营前</span><div className="flex-1"><Progress v={34} color="#94a3b8" /></div><span className="num text-[12px] w-[34px] text-right">34%</span></div><div className="flex items-center gap-2"><span className="text-[11.5px] w-[52px]">现在</span><div className="flex-1"><Progress v={71} color="var(--ok)" /></div><span className="num text-[12px] w-[34px] text-right">71%</span></div></div><div><Columns h={90} data={batches.map(b => ({ label: `第 ${b.no} 期`, v: b.n }))} /><div className="text-[10.5px] text-slate-500 mt-1">每期产出课件 = 结业人数</div></div></div></Panel>}
        {p.id === 'p3' && <Panel title="历期交付场景"><table className="grid"><thead><tr><th>期次</th><th>提出部门</th><th>场景</th><th>交付形态</th><th>状态</th></tr></thead><tbody>{P3_DELIVERY.map(r => <tr key={r.n} className="cursor-pointer" onClick={() => push({ v: 'programBatch', id: p.id, no: r.no })}><td className="num">第 {r.no} 期</td><td>{r.dept}</td><td className="font-medium">{r.n}</td><td>{r.k}</td><td><span className={`tag ${r.st === '已上线' ? 'tag-ok' : 'tag-warn'}`}>{r.st}</span></td></tr>)}</tbody></table></Panel>}
        <Panel title={`期次　${batches.length} 期`} className="flex-1" bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>期次</th><th>日期</th><th>地点</th><th>人数</th><th>通过率</th><th>满意度</th><th>状态</th></tr></thead><tbody>{batches.map(b => <tr key={b.no} className="cursor-pointer" onClick={() => push({ v: 'programBatch', id: p.id, no: b.no })}><td className="num">第 {b.no} 期</td><td className="num">{b.d}</td><td>{b.venue}</td><td className="num">{b.n.toLocaleString()}</td><td className="num">{b.done ? `${b.pass}%` : '—'}</td><td className="num">{b.done ? b.score.toFixed(1) : '—'}</td><td><span className={`tag ${b.done ? 'tag-ok' : 'tag-warn'}`}>{b.done ? '已结业' : '报名中'}</span></td></tr>)}</tbody></table></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 建议" extra={<span className="ai-badge">项目</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={p.id === 'p1' ? '六期结业 178 人，内训师自有课程占比由 34% 提高到 71%；第 7 期已满员，候补 12 人，建议 11 月加开一期，优先安排继电保护与配电专业内训师。' : p.id === 'p2' ? '覆盖 61.9%，一线层 56% 是缺口；按当前排期年底可达 92%。建议把一线层线上课与班前会知识卡结合，每周推送 2 期。' : '四期交付 96 个场景，61 个已上线；第 5 期需求已收集 34 个，其中 12 个来自评估表 P1 场景，建议优先纳入。'} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast(`已发起 ${p.name} 下一期报名`)}><span className="ic">报</span>发起下一期报名<small>移动端通知</small></button><button className="act-btn gold" onClick={() => push({ v: 'gen' })}><span className="ic">课</span>生成本期课件<small>生成工作台</small></button><button className="act-btn" onClick={() => jump('plan', 'agg')}><span className="ic">需</span>查看需求汇总<small>千人千面</small></button></div></div></Panel>
        <Panel title="其他主干项目" className="flex-1"><div className="p-2 space-y-0.5">{MAIN_PROGRAMS.filter(x => x.id !== p.id).map(x => <button key={x.id} onClick={() => push({ v: 'program', id: x.id })} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="tag tag-gold">{x.badge}</span><span className="flex-1 truncate text-left">{x.name}</span></button>)}</div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：期次 ---------- */
export function ProgramBatch({ id, no }: { id: string; no: number }) {
  const { toast, jump, push } = useNav()
  const p = MAIN_PROGRAMS.find(x => x.id === id) ?? MAIN_PROGRAMS[0]
  const all = batchesOf(p.id)
  const b = all.find(x => x.no === no) ?? all[0]
  const h = hash(p.id + no)
  const submitted = Math.round(b.n * .82)
  const scenes = scenesOf(h, p.id === 'p2' ? 10 : 6)
  const p3rows = P3_DELIVERY.filter(x => x.no === no)
  const composition = p.id === 'p2'
    ? [{ label: '班子与中层', v: Math.round(b.n * .06) }, { label: '专业骨干', v: Math.round(b.n * .28) }, { label: '一线员工', v: Math.round(b.n * .66) }]
    : BUREAUS.slice(h % 8, h % 8 + 5).map((u, i) => ({ label: u.replace(/供电局$/, ''), v: Math.round(b.n * [.3, .25, .2, .15, .1][i]) }))
  const outputs = p.id === 'p1'
    ? COURSES.slice(h % 30, h % 30 + 6).map(c => ({ n: c.name, k: '成套课件', st: b.done ? c.status : '待产出' }))
    : p.id === 'p3'
      ? [...p3rows, ...scenes.slice(0, Math.max(0, 6 - p3rows.length)).map((x, i) => ({ dept: x.unit, n: x.name, k: x.tech.includes('智能体') || x.pri === 'P1' ? '智能体' : '工作流', st: i < 2 ? '已上线' : '试运行' }))]
        .map(x => ({ n: x.n, k: x.k, st: b.done ? x.st : '待产出' }))
      : [
        { n: '分层结业考核成绩单', k: '成绩单', st: b.done ? `${b.n.toLocaleString()} 份` : '待产出' },
        { n: '分层覆盖率统计表（班子与中层 / 专业骨干 / 一线员工）', k: '统计表', st: b.done ? '已归档' : '待产出' },
        { n: '骨干层本岗位 AI 使用场景', k: '场景', st: b.done ? `${submitted.toLocaleString()} 份` : '待产出' },
        { n: '一线层岗位应用实操记录', k: '实操记录', st: b.done ? `${Math.round(b.n * .64).toLocaleString()} 份` : '待产出' },
        { n: '与评估表 P1 场景重合清单', k: '清单', st: b.done ? '12 个' : '待产出' },
      ]
  const doneBatches = all.filter(x => x.done)
  const avgScore = doneBatches.length ? doneBatches.reduce((a, x) => a + x.score, 0) / doneBatches.length : 4.6
  const evalBase = [{ label: '内容实用', v: 4.8 }, { label: '讲师', v: 4.7 }, { label: '工具易用', v: 4.5 }, { label: '产出可用', v: 4.6 }, { label: '组织', v: 4.7 }]
  const evalData = evalBase.map(x => ({ ...x, v: b.done ? x.v : Math.round(x.v * (avgScore / 4.66) * 10) / 10 }))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag tag-gold">{p.badge}</span><div className="text-[16px] font-semibold serif mt-1 leading-snug">{p.name} · 第 {b.no} 期</div><div className="text-[11px] text-slate-500 mt-1">{b.d} · {b.venue} · {b.n.toLocaleString()} 人</div><div className="flex items-center gap-3 mt-3"><Ring v={b.done ? b.pass : Math.round(b.n / (b.n + 6) * 100)} size={64} stroke={7} color={b.done ? 'var(--ok)' : 'var(--ai)'} sub={b.done ? '通过率' : '报名率'} /><div className="text-[11.5px] text-slate-600 leading-relaxed">{b.done ? <>满意度 <b className="num">{b.score.toFixed(1)}</b> / 5<br />产出 <b className="num">{outputs.length}</b> 类<br />结业 <b className="num">{Math.round(b.n * b.pass / 100).toLocaleString()}</b> 人</> : <>候补 <b className="num">{6 + (h % 10)}</b> 人<br />开班 <b className="num">{b.d}</b><br />讲师已确认</>}</div></div></div>
        <Panel title={p.id === 'p2' ? '分层构成' : '学员构成'} className="flex-1"><div className="p-3"><Columns h={110} data={composition} /><div className="mt-2 space-y-0.5 text-[11px]">{composition.map(c => <div key={c.label} className="flex"><span className="text-slate-600">{c.label}</span><span className="ml-auto num">{c.v.toLocaleString()} 人</span></div>)}</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="结业产出" className="flex-1" bodyClass="overflow-auto scroll">
          <table className="grid"><thead><tr><th>产出物</th><th>形态</th><th>状态</th></tr></thead><tbody>{outputs.map(o => <tr key={o.n} className="row-in"><td className="font-medium">{o.n}</td><td><span className="tag">{o.k}</span></td><td><span className={`tag ${o.st === '已上线' || o.st === '已发布' || o.st === '已归档' ? 'tag-ok' : o.st === '待产出' ? '' : 'tag-warn'}`}>{o.st}</span></td></tr>)}</tbody></table>
          {p.id === 'p1' && <div className="p-3 hair-t"><button className="btn btn-sm" onClick={() => push({ v: 'lib' })}>在课程库中查看本期课件 ›</button></div>}
          {p.id === 'p2' && <div className="hair-t mt-2 pt-2.5">
            <div className="flex items-center gap-2 px-3 mb-1.5"><span className="w-[3px] h-[12px]" style={{ background: 'var(--gold)' }} /><span className="text-[12px] font-semibold">骨干层提交场景　样本 {scenes.length} 个 / 本期 {submitted.toLocaleString()} 份</span></div>
            <table className="grid"><thead><tr><th>提交单位</th><th>岗位</th><th>本岗位 AI 使用场景</th><th>技术形态</th><th>加权分</th><th>优先级</th></tr></thead>
              <tbody>{scenes.map((x, i) => <tr key={x.unit + x.name + i} className="cursor-pointer row-in" onClick={() => { toast(`已把「${x.name}」转入生成工作台`); push({ v: 'gen' }) }}><td>{x.unit}</td><td>{x.post}</td><td className="font-medium">{x.name}</td><td className="text-slate-600">{x.tech}</td><td className="num">{x.score.toFixed(2)}</td><td><span className={`tag ${PRI_TAG[x.pri] ?? ''}`}>{x.pri}</span></td></tr>)}</tbody></table>
          </div>}
          {p.id === 'p3' && <div className="p-3 hair-t"><button className="btn btn-sm" onClick={() => jump('hub', 'expert')}>把交付场景沉淀为条目 ›</button></div>}
        </Panel>
        <Panel title={b.done ? '评价' : '历期平均评价'} extra={b.done ? undefined : <span className="text-[10.5px] text-slate-500">本期尚未结业，按已结业 {doneBatches.length} 期取平均</span>}><div className="p-3"><Columns h={90} data={evalData} max={5} /></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 评价" extra={<span className="ai-badge">期次</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={b.done ? `第 ${b.no} 期通过率 ${b.pass}%，满意度 ${b.score.toFixed(1)}；${p.id === 'p1' ? '产出课件已进入两级审核，其中 4 门已发布到课程库' : p.id === 'p3' ? `交付 ${outputs.length} 个场景，${outputs.filter(o => o.st === '已上线').length} 个已上线，建议把「两票常见错项自动校核」纳入安监陪练科目` : `骨干层提交场景 ${submitted.toLocaleString()} 份，其中 12 个与评估表 P1 场景重合，建议转入场景开发训战营；一线层实操记录已回写学时`}。` : `第 ${b.no} 期报名 ${b.n.toLocaleString()} 人，候补 ${6 + (h % 10)} 人；讲师与场地已确认，开班前 3 天推送预习材料。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast('已导出学员名单与产出清单')}><span className="ic">出</span>导出名单与产出<small>xlsx</small></button>{p.id === 'p2' && <button className="act-btn gold" onClick={() => { toast('已把 12 个 P1 重合场景转入场景开发训战营'); push({ v: 'program', id: 'p3' }) }}><span className="ic">转</span>P1 场景转入训战营<small>12 个</small></button>}<button className="act-btn gold" onClick={() => jump('plan', 'track')}><span className="ic">跟</span>查看学员后续计划<small>千人千面 · 跟踪</small></button></div></div></Panel>
        <Panel title="同项目其他期次" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-0.5">{all.filter(x => x.no !== b.no).map(x => <button key={x.no} onClick={() => push({ v: 'programBatch', id: p.id, no: x.no })} className="w-full flex items-center gap-2 text-[11.5px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="num">第 {x.no} 期</span><span className="num text-slate-500">{x.d}</span><span className="flex-1 truncate text-left text-slate-600">{x.venue}</span><span className={`tag ${x.done ? 'tag-ok' : 'tag-warn'}`}>{x.done ? '已结业' : '报名中'}</span></button>)}</div></Panel>
      </div>
    </div>
  )
}

/* ---------- 二级：专题课 ---------- */
export function TopicView({ i }: { i: number }) {
  const { push, toast, jump } = useNav()
  const c = TOPIC_COURSES[i] ?? TOPIC_COURSES[0]
  const h = hash(c.name)
  const dist = BUREAUS.slice(0, 10).map((b, k) => ({ label: b.replace(/供电局$/, ''), v: Math.round(c.n * (0.04 + ((h >>> k) % 9) / 100)) }))
  const cal = CLASS_CAL.findIndex(k => k.n.startsWith(c.name.slice(0, 6)))
  const hist = Array.from({ length: Math.ceil(c.n / 50) }).map((_, k) => ({ no: k + 1, d: `0${3 + Math.floor(k * 6 / Math.ceil(c.n / 50))}-${String(8 + (hash(c.name + k) % 18)).padStart(2, '0')}`, n: 40 + (hash(c.name + k) % 12), score: 4.4 + (hash(c.name + k) % 6) / 10 }))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag tag-gold">{c.dept}</span><div className="text-[17px] font-semibold serif mt-1 leading-snug">{c.name}</div><div className="text-[11.5px] text-slate-500 mt-1">{c.h} · 本年已办 {Math.ceil(c.n / 50)} 期 · 累计参训 {c.n} 人</div></div>
        <Panel title="核心内容" className="flex-1"><div className="p-3 text-[12.5px] leading-[1.9]">{c.body}</div><div className="p-3 hair-t"><Field k="结业产出" v={<div className="hairline p-2.5" style={{ background: 'var(--gold-soft)', borderColor: '#e3d2ac' }}>{c.out}</div>} /></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="参训分布　地市局"><div className="p-3"><Columns h={110} data={dist} /></div></Panel>
        <Panel title={`历期　${hist.length} 期`} className="flex-1" bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>期次</th><th>日期</th><th>人数</th><th>满意度</th><th>状态</th></tr></thead><tbody>{hist.map(x => <tr key={x.no}><td className="num">第 {x.no} 期</td><td className="num">{x.d}</td><td className="num">{x.n}</td><td className="num">{x.score.toFixed(1)}</td><td><span className="tag tag-ok">已结业</span></td></tr>)}<tr className="cursor-pointer" onClick={() => push({ v: 'classDetail', i: cal >= 0 ? cal : 0 })}><td className="num">第 {hist.length + 1} 期</td><td className="num">{c.next}</td><td className="num">50</td><td>—</td><td><span className="tag tag-warn">报名中 ›</span></td></tr></tbody></table></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="下期开班"><div className="p-3"><div className="flex items-center gap-2 mb-2"><span className="num text-[16px] font-semibold" style={{ color: 'var(--indigo)' }}>{c.next}</span><span className="tag tag-ok">报名中</span></div><button className="btn btn-primary btn-sm w-full" onClick={() => toast(`已向 ${c.dept} 发起报名`)}>发起报名</button></div></Panel>
        <Panel title="AI 建议" className="flex-1" extra={<span className="ai-badge">课程</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${c.name}累计 ${c.n} 人，${dist.slice().sort((a, b) => b.v - a.v)[0].label}参训最多；成长地图显示相关岗位模型尚未挂接本课程对应的能力项，建议在岗位能力模型中新增并把结业产出纳入证据。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => push({ v: 'gen' })}><span className="ic">课</span>生成成套课件<small>生成工作台</small></button><button className="act-btn gold" onClick={() => jump('map', 'matrix')}><span className="ic">模</span>挂接岗位能力模型<small>成长地图</small></button><button className="act-btn" onClick={() => jump('plan', 'agg')}><span className="ic">需</span>写入需求汇总<small>千人千面</small></button></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 二级：班次 ---------- */
export function ClassDetail({ i }: { i: number }) {
  const { push, toast, jump } = useNav()
  const c = CLASS_CAL[i] ?? CLASS_CAL[0]
  const h = hash(c.n)
  const units = BUREAUS.slice(h % 9, h % 9 + 4).map((u, k) => ({ label: u.replace(/供电局$/, ''), v: Math.round(c.sign * [.35, .3, .2, .15][k]) }))
  const days = c.n.includes('训战营') ? 3 : c.n.includes('一线层') ? 1 : 2
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className={`tag ${c.st === '已满员' ? 'tag-gold' : 'tag-ok'}`}>{c.st}</span><div className="text-[16px] font-semibold serif mt-1 leading-snug">{c.n}</div><div className="text-[11px] text-slate-500 mt-1">{c.d} 开班 · {days} 天 · {c.p}</div><div className="flex items-center gap-3 mt-3"><Ring v={Math.round(c.sign / c.cap * 100)} size={64} stroke={7} color={c.sign >= c.cap ? 'var(--gold)' : 'var(--ai)'} sub="报名率" /><div className="text-[11.5px] text-slate-600 leading-relaxed">容量 <b className="num">{c.cap}</b> · 已报 <b className="num">{c.sign}</b><br />候补 <b className="num">{c.sign >= c.cap ? 6 + (h % 12) : 0}</b> 人<br />来源 {units.length} 个单位</div></div></div>
        <Panel title="报名来源" className="flex-1"><div className="p-3"><Columns h={110} data={units} /><div className="text-[11px] text-slate-500 mt-2">名单来自千人千面计划自动派发。</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="日程" className="flex-1"><div className="p-3"><Gantt rows={Array.from({ length: days }).map((_, k) => ({ name: `第 ${k + 1} 天`, spans: [{ from: 0, to: 4, color: '#2f6df6', label: k === 0 ? '开班 · 方法与工具' : k === days - 1 ? '实操 · 结业产出评审' : '案例 · 实训' }, { from: 4.2, to: 6, color: '#b08a3e', label: '答疑' }] }))} cols={6} colLabel={k => ['08:30', '10:00', '11:30', '14:00', '15:30', '17:00'][k]} /></div></Panel>
        <Panel title="校验"><div className="p-3 grid grid-cols-4 gap-2 text-center">{['讲师', '场地', '检修计划', '迎峰度夏'].map(k => <div key={k} className="hairline py-2"><div className="text-[12px] font-semibold" style={{ color: 'var(--ok)' }}>通过</div><div className="text-[10px] text-slate-500">{k}</div></div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 判读" extra={<span className="ai-badge">班次</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={c.st === '已满员' ? `本期已满员，候补 ${6 + (h % 12)} 人；讲师与场地四项校验通过。建议复制本期配置加开一期，候补人员自动转入。` : `本期报名 ${c.sign} / ${c.cap}，预计开班前可满员；四项校验通过，开班前 3 天推送预习材料与陪练任务。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast(c.st === '已满员' ? '已加开一期并转入候补' : '已发布报名并通知学员')}><span className="ic">{c.st === '已满员' ? '加' : '发'}</span>{c.st === '已满员' ? '加开一期' : '发布报名'}<small>{c.st === '已满员' ? '复制配置' : '移动端通知'}</small></button><button className="act-btn gold" onClick={() => jump('plan', 'schedule')}><span className="ic">排</span>排期与冲突<small>千人千面</small></button><button className="act-btn" onClick={() => push({ v: 'system' })}><span className="ic">历</span>返回开班日历<small>课程体系</small></button></div></div></Panel>
        <Panel title="其他班次" className="flex-1"><div className="p-2 space-y-0.5">{CLASS_CAL.filter((_, k) => k !== i).slice(0, 6).map((x) => <button key={x.d + x.n} onClick={() => push({ v: 'classDetail', i: CLASS_CAL.indexOf(x) })} className="w-full flex items-center gap-2 text-[11.5px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="num text-slate-500">{x.d}</span><span className="flex-1 truncate text-left">{x.n}</span><span className={`tag ${x.st === '已满员' ? 'tag-gold' : 'tag-ok'}`}>{x.st}</span></button>)}</div></Panel>
      </div>
    </div>
  )
}
