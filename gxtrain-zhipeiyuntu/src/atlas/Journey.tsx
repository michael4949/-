/* 成长轨迹（一级）→ 批次（二级）→ 节点（三级） */
import { Panel, CountUp } from '../ui'
import { LineChart, Flow, Columns, Ring, Gantt } from '../charts'
import { COHORTS, JOURNEY, BUREAUS } from './data'
import { useNav, Typewriter, Kpi, Delta } from './nav'

const CC = ['#1e3a6e', '#2f6df6', '#b08a3e']
const MONTHS18 = Array.from({ length: 18 }).map((_, i) => `第 ${i + 1} 月`)

export function JourneyView() {
  const { push, toast, jump } = useNav()
  const total = COHORTS.reduce((s, c) => s + c.n, 0)
  const nodes = [...COHORTS.map((c, i) => ({ id: c.id, label: `${c.name.slice(0, 6)} ${c.n}`, col: 0, color: CC[i] })), { id: 'pre', label: '岗前培训', col: 1, color: '#1e3a6e' }, { id: 'exam', label: '安规考试', col: 2, color: '#2f6df6' }, { id: 'coach', label: '首次陪练通过', col: 3, color: '#19b8d8' }, { id: 'mid', label: '中级工认定', col: 4, color: '#7b5cf5' }, { id: 'solo', label: '独立值班', col: 5, color: '#b08a3e' }]
  const links = [...COHORTS.map(c => ({ from: c.id, to: 'pre', v: c.n })), { from: 'pre', to: 'exam', v: COHORTS.reduce((s, c) => s + Math.round(c.n * c.milestones[1].done / 100), 0) }, { from: 'exam', to: 'coach', v: COHORTS.reduce((s, c) => s + Math.round(c.n * c.milestones[2].done / 100), 0) }, { from: 'coach', to: 'mid', v: COHORTS.reduce((s, c) => s + Math.round(c.n * c.milestones[3].done / 100), 0) }, { from: 'mid', to: 'solo', v: COHORTS.reduce((s, c) => s + Math.round(c.n * c.milestones[4].done / 100), 0) }]
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k="在培新员工" v={<CountUp to={total} />} d="2024 · 2025 · 2026 三届" />
        <Kpi k="平均达标周期" v={<><CountUp to={11.4} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">月</span></>} d="2025 届较 2024 届快 1.8 个月" gold />
        <Kpi k="首次陪练通过率" v={<><CountUp to={94} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="2025 届 · 6 月节点" />
        <Kpi k="2026 届安规考试" v={<><CountUp to={62} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="3 月节点进行中 · 截止 10-15" gold onClick={() => push({ v: 'cohortStage', id: 'c2026', m: 3 })} />
        <Kpi k="师带徒结对" v={<><CountUp to={96} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="2026 届已结对 512 人" />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="新员工成长流向　入职 → 独立值班" extra={<span className="text-[10.5px] text-slate-500">点击届次进入批次</span>}>
            <div className="px-3 pt-2 pb-1"><Flow nodes={nodes} links={links} h={190} onNode={n => { if (COHORTS.some(c => c.id === n.id)) push({ v: 'cohort', id: n.id }); else push({ v: 'cohortStage', id: 'c2025', m: n.id === 'pre' ? 1 : n.id === 'exam' ? 3 : n.id === 'coach' ? 6 : n.id === 'mid' ? 12 : 18 }) }} /></div>
          </Panel>
          <Panel title="三届成长曲线　达标率 × 入职月数" className="flex-1" extra={<span className="ai-badge">曲线比对</span>}>
            <div className="px-3 pt-2"><LineChart labels={MONTHS18} h={190} unit="%" series={COHORTS.map((c, i) => ({ name: c.name, color: CC[i], data: [...c.curve, ...Array(18 - c.curve.length).fill(null)], area: i === 1 }))} target={{ v: 85, label: '18 月达标目标 85%' }} yMin={0} yMax={100} /></div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="成长阶段" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1.5">{JOURNEY.map((j, i) => <button key={j.k} onClick={() => push({ v: 'cohortStage', id: 'c2026', m: [1, 6, 12][i] })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className="tag tag-gold">{j.months}</span><span className="text-[12.5px] font-medium">{j.k}</span></div><div className="flex flex-wrap gap-1 mt-1.5">{j.items.map(it => <span key={it} className="chip">{it}</span>)}</div><span className="go">›</span></button>)}</div></Panel>
          <Panel title="批次" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1.5">{COHORTS.map((c, i) => <button key={c.id} onClick={() => push({ v: 'cohort', id: c.id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: CC[i] }} /><span className="text-[12.5px] font-medium">{c.name}</span><span className="ml-auto num text-[12px] font-semibold" style={{ color: 'var(--indigo)' }}>{c.ready}%</span></div><div className="text-[10.5px] text-slate-500 mt-0.5">{c.n} 人 · 入职 {c.joined}{c.avgMonths ? ` · 平均达标 ${c.avgMonths} 个月` : ' · 第 3 月'}</div><span className="go">›</span></button>)}</div></Panel>
          <Panel title="AI 判读" className="flex-1"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text="2025 届曲线整体高于 2024 届，第 6 月首次陪练通过率 94%（+3 pt），达标周期缩短 1.8 个月，主要贡献来自陪练前置与师带徒结对率提升。2026 届第 3 月安规考试完成 62%，落后于往届同期 8 个百分点，建议本周催办。" speed={7} /></div><button className="btn btn-sm w-full mt-2" onClick={() => { toast('已向 14 个地市局培训专责发出催办'); jump('ask', 'chat', { v: 'chat', q: '2026 届新员工安规考试完成情况' } as never) }}>催办安规考试</button></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：批次 ---------- */
export function CohortView({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const c = COHORTS.find(x => x.id === id) ?? COHORTS[0]
  const base = COHORTS[0]
  const cur = c.curve.length
  const units = BUREAUS.slice(0, 8).map((b, i) => ({ label: b.replace(/供电局$/, ''), v: Math.round(c.n * [.14, .12, .1, .09, .08, .07, .06, .06][i]) }))
  const rows = JOURNEY.map((j, i) => ({ name: j.k, sub: j.months, spans: [{ from: [0, 6, 18][i], to: [6, 18, 24][i], color: CC[i], label: j.items.join(' · '), st: cur >= [6, 18, 24][i] ? '已完成' : undefined }] }))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="text-[17px] font-semibold serif">{c.name}</div><div className="text-[11.5px] text-slate-500">{c.n} 人 · 入职 {c.joined} · 第 {cur} 月</div><div className="flex items-center gap-3 mt-3"><Ring v={c.ready} size={64} stroke={7} sub="达标率" /><div className="text-[11.5px] text-slate-600 leading-relaxed">同期 2024 届 <b className="num">{base.curve[cur - 1]}%</b><br />领先 <Delta v={c.ready - base.curve[cur - 1]} unit="pt" /><br />{c.avgMonths ? `平均达标 ${c.avgMonths} 个月` : '预计 11 个月达标'}</div></div></div>
        <Panel title="里程碑" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入三级</span>}><div className="p-2 space-y-1.5">{c.milestones.map(m => { const st = m.m > cur ? '未到' : m.done >= 95 ? '已完成' : m.done > 0 ? '进行中' : '待开始'; return <button key={m.m} onClick={() => push({ v: 'cohortStage', id: c.id, m: m.m })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className={`tag ${st === '已完成' ? 'tag-ok' : st === '进行中' ? 'tag-warn' : ''}`}>{st}</span><span className="text-[12px] font-medium">{m.k}</span><span className="ml-auto num text-[11px] text-slate-500">第 {m.m} 月</span></div><div className="h-[5px] bg-slate-100 rounded mt-1.5 overflow-hidden"><div className="h-full bar-grow" style={{ width: `${m.done}%`, background: st === '已完成' ? 'var(--ok)' : 'var(--ai)' }} /></div><div className="num text-[10.5px] text-slate-500 mt-0.5">{m.done}% · {Math.round(c.n * m.done / 100)} 人</div><span className="go">›</span></button> })}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="成长曲线　与 2024 届对照"><div className="px-3 pt-2"><LineChart labels={MONTHS18} h={170} unit="%" series={[{ name: c.name, color: '#2f6df6', area: true, data: [...c.curve, ...Array(18 - c.curve.length).fill(null)] }, { name: '2024 届', color: '#94a3b8', dash: true, data: base.curve }, ...(cur < 18 ? [{ name: '预测', color: '#b08a3e', dash: true, data: [...Array(cur - 1).fill(null), c.curve[cur - 1], ...Array.from({ length: 18 - cur }).map((_, i) => Math.min(92, Math.round(c.curve[cur - 1] + (i + 1) * (88 - c.curve[cur - 1]) / (18 - cur) * 1.05)))] }] : [])]} target={{ v: 85, label: '目标 85%' }} yMin={0} yMax={100} /></div></Panel>
        <Panel title="阶段进度" className="flex-1"><div className="p-3"><Gantt rows={rows} cols={24} colLabel={i => `${i + 1}`} now={cur} onSpan={(r) => push({ v: 'cohortStage', id: c.id, m: r.name === JOURNEY[0].k ? 1 : r.name === JOURNEY[1].k ? 6 : 18 })} /><div className="text-[10.5px] text-slate-500 mt-1">横轴为入职月数，金线为当前</div></div></Panel>
        <Panel title="单位分布　前 8"><div className="p-3"><Columns h={100} data={units} /></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 预测" extra={<span className="ai-badge">批次</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={cur >= 18 ? `${c.name}已进入胜任晋升期，达标率 ${c.ready}%；${c.milestones[4].k}完成 ${c.milestones[4].done}%，未完成人员集中在配电专业，建议安排独立值班前的专项陪练。` : `${c.name}第 ${cur} 月达标率 ${c.ready}%，领先 2024 届同期 ${c.ready - base.curve[cur - 1]} 个百分点。按当前速度，预计第 ${Math.max(cur + 1, Math.round(18 - (c.ready - base.curve[cur - 1]) / 2))} 月达到 85%。${c.milestones.find(m => m.m <= cur && m.done < 95)?.k ?? '各节点'}完成率偏低，建议本周催办。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast('已生成批次培养计划'); jump('plan', 'agg') }}><span className="ic">划</span>生成批次培养计划<small>{c.n} 人</small></button><button className="act-btn gold" onClick={() => { toast('已下发首次陪练任务'); jump('coach', 'company') }}><span className="ic">练</span>下发陪练任务<small>陪练中心</small></button><button className="act-btn" onClick={() => jump('factory', 'system')}><span className="ic">班</span>查看新员工开班<small>课程体系</small></button></div></div></Panel>
        <Panel title="其他批次" className="flex-1"><div className="p-2 space-y-0.5">{COHORTS.filter(x => x.id !== c.id).map(x => <button key={x.id} onClick={() => push({ v: 'cohort', id: x.id })} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="flex-1 text-left">{x.name}</span><span className="num font-semibold" style={{ color: 'var(--indigo)' }}>{x.ready}%</span></button>)}</div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：节点 ---------- */
export function CohortStage({ id, m }: { id: string; m: number }) {
  const { toast, jump } = useNav()
  const c = COHORTS.find(x => x.id === id) ?? COHORTS[0]
  const ms = c.milestones.find(x => x.m === m) ?? c.milestones[0]
  const cur = c.curve.length
  const cities = BUREAUS.slice(0, 10)
  const per = cities.map((b, i) => ({ label: b.replace(/供电局$/, ''), v: Math.max(0, Math.min(100, ms.done + ((i * 37 + m * 11) % 21) - 10)), color: undefined as string | undefined }))
  per.forEach(p => { p.color = p.v < ms.done - 5 ? 'var(--bad)' : undefined })
  const lag = per.filter(p => p.v < ms.done - 5)
  const st = ms.m > cur ? '未到' : ms.done >= 95 ? '已完成' : ms.done > 0 ? '进行中' : '待开始'
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className={`tag ${st === '已完成' ? 'tag-ok' : st === '进行中' ? 'tag-warn' : ''}`}>{st}</span><div className="text-[17px] font-semibold serif mt-1">{ms.k}</div><div className="text-[11.5px] text-slate-500">{c.name} · 第 {ms.m} 月节点</div><div className="flex items-center gap-3 mt-3"><Ring v={ms.done} size={64} stroke={7} color={ms.done >= 95 ? 'var(--ok)' : 'var(--ai)'} sub="完成" /><div className="text-[11.5px] text-slate-600 leading-relaxed">已完成 <b className="num">{Math.round(c.n * ms.done / 100)}</b> 人<br />未完成 <b className="num" style={{ color: 'var(--bad)' }}>{c.n - Math.round(c.n * ms.done / 100)}</b> 人<br />往届同期 <b className="num">{COHORTS[0].milestones.find(x => x.m === m)?.done ?? 0}%</b></div></div></div>
        <Panel title="节点要求" className="flex-1"><div className="p-3 text-[12px] leading-relaxed space-y-2">{(m === 1 ? ['完成岗前培训 40 学时', '通过入职安全教育考核', '完成师带徒结对'] : m === 3 ? ['安规相关章节考试 ≥ 80 分', '两票基础知识考核', '首次陪练体验'] : m === 6 ? ['首次分段陪练通过', '完成岗位入门课', '独立完成班组交办任务'] : m === 12 ? ['中级工理论与实操认定', '必修课完成率 100%', '陪练累计 ≥ 6 场'] : ['独立值班评估通过', '异常处置陪练通过', '班组长与师傅双签']).map(t => <div key={t} className="flex gap-2"><span className="w-1.5 h-1.5 mt-[7px] shrink-0 rounded-full" style={{ background: 'var(--gold)' }} />{t}</div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="各地市局完成率" extra={<span className="text-[10.5px] text-slate-500">红色为落后 5 个百分点以上</span>}><div className="p-3"><Columns h={150} data={per} max={100} unit="%" /></div></Panel>
        <Panel title="落后单位与原因" className="flex-1" bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>单位</th><th>完成率</th><th>未完成</th><th>主要原因</th><th>建议</th></tr></thead><tbody>{(lag.length ? lag : per.slice(0, 3)).map((p, i) => <tr key={p.label}><td className="font-medium">{p.label}</td><td className="num" style={{ color: 'var(--bad)' }}>{p.v}%</td><td className="num">{Math.round(c.n * .1 * (100 - p.v) / 100)} 人</td><td className="text-slate-600">{['迎峰度夏保供占用班组时间', '考试场次安排偏少', '师傅结对未及时完成', '新员工分散在县域供电所'][i % 4]}</td><td><span className="tag">{['加开线上考试', '增加周末场次', '补结对', '线上补课'][i % 4]}</span></td></tr>)}</tbody></table></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 处置" extra={<span className="ai-badge">催办</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${ms.k}完成 ${ms.done}%，${lag.length ? `${lag.map(l => l.label).join('、')}落后 5 个百分点以上` : '各单位进度均衡'}。${st === '进行中' ? `距节点截止还有 ${Math.max(1, (ms.m + 1) * 4 - cur * 4)} 周，建议对未完成的 ${c.n - Math.round(c.n * ms.done / 100)} 人加开一场线上考试并同步推送到移动端。` : st === '已完成' ? '节点已关闭，未完成人员已转入下一节点跟踪。' : '节点尚未开始，已按往届数据预留场次。'}`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast(`已向 ${lag.length || 3} 个单位发出催办`)}><span className="ic">催</span>一键催办<small>培训专责 · 班组长</small></button><button className="act-btn gold" onClick={() => { toast('已加开线上考试场次'); jump('factory', 'bank') }}><span className="ic">考</span>加开考试场次<small>题库工作台</small></button><button className="act-btn" onClick={() => { toast('已下发首次陪练任务'); jump('coach', 'company') }}><span className="ic">练</span>安排陪练<small>陪练中心</small></button><button className="act-btn gold" onClick={() => { toast('已写入未完成人员的学习计划'); jump('plan', 'track') }}><span className="ic">划</span>写入学习计划<small>千人千面 · 跟踪</small></button></div></div></Panel>
      </div>
    </div>
  )
}
