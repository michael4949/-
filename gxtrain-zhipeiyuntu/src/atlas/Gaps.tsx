/* 缺口与预警（一级）→ 缺口详情（二级）→ 人员清单（三级） */
import { useMemo, useState } from 'react'
import { Panel, CountUp, Bars } from '../ui'
import { LineChart, Scatter, Columns, Ring, Sparkline, Heatmap, heat } from '../charts'
import { GAPS, ALERTS, gapById, BUREAUS, BUREAU_UNIT, unitOf, short, teamPersons, teamsOf, postOfTeam, isFunc } from './data'
import type { Gap } from './data'
import { useNav, Typewriter, Kpi, PriTag, Delta } from './nav'

const KIND_IC: Record<string, string> = { 课程: '课', 陪练: '练', 集训: '训', 带教: '带' }
const unitShare = (g: Gap) => g.units.map((u, i) => ({ label: u.replace(/供电局$/, ''), v: Math.round(g.people * [.36, .27, .2, .17][i % 4] / g.units.slice(0, 4).reduce((s, _, j) => s + [.36, .27, .2, .17][j], 0)), full: u }))

export function GapsView() {
  const { push, toast, jump } = useNav()
  const [sel, setSel] = useState<string>()
  const [pri, setPri] = useState('全部')
  const list = GAPS.filter(g => pri === '全部' || g.priority === pri)
  const pts = GAPS.map(g => ({ id: g.id, label: g.ability, x: g.people, y: 100 - g.ready, r: 6 + g.cost / 3, color: g.priority === 'P1' ? '#c2402f' : g.priority === 'P2' ? '#b08a3e' : '#2f6df6' }))
  const cities = BUREAUS.slice(0, 10)
  const cells = GAPS.map(g => cities.map((c, i) => { const hit = g.units.includes(c); return hit ? g.ready - 4 + ((i * 3 + g.people) % 7) : Math.min(96, g.ready + 14 + ((i * 5 + g.people) % 9)) }))
  const total = GAPS.reduce((s, g) => s + g.people, 0)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="结构性缺口" v={<CountUp to={GAPS.length} />} d="按人数 × 差距深度排序" />
        <Kpi k="涉及人员" v={<CountUp to={total} />} d="去重后 · 占建档 6.1%" gold />
        <Kpi k="P1 缺口" v={<CountUp to={GAPS.filter(g => g.priority === 'P1').length} />} d="本季必须启动补齐" onClick={() => setPri('P1')} />
        <Kpi k="补齐预算" v={<><CountUp to={Math.round(GAPS.reduce((s, g) => s + g.cost, 0) * 10) / 10} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">万元</span></>} d="课程 + 陪练 + 集训 + 带教" gold />
        <Kpi k="预警" v={<CountUp to={ALERTS.length} />} d={`${ALERTS.filter(a => a.sev === 'bad').length} 项需本月处置`} />
        <Kpi k="预计全部补齐" v="16 周" d="按方案并行推进" gold onClick={() => { toast('已生成全部缺口的补齐计划草案'); jump('plan', 'agg') }} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_340px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="缺口九宫格　人数 × 差距深度" extra={<span className="text-[10.5px] text-slate-500">气泡大小 = 补齐成本</span>}>
            <div className="px-2 pt-1"><Scatter points={pts} xLabel="涉及人数" yLabel="距要求线差距（分）" h={230} xMin={0} xMax={1300} yMin={20} yMax={50} quadrants quadLabels={['专项带教', '集中攻坚', '优先攻坚', '观察', '分批补课', '线上覆盖', '自然改善', '纳入年度', '面上巩固']} sel={sel} onPoint={p => { setSel(p.id); push({ v: 'gapDetail', id: p.id! }) }} /></div>
          </Panel>
          <Panel title="缺口 × 地市局热力" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-3"><Heatmap rows={GAPS.map(g => g.ability)} cols={cities.map(c => c.replace(/供电局$/, ''))} cells={cells} cellH={26} rowW={90} colorOf={v => heat(v)} onCell={r => push({ v: 'gapDetail', id: GAPS[r].id })} /></div>
          </Panel>
        </div>
        <Panel title={`缺口清单　${list.length} 项`} bodyClass="overflow-auto scroll" extra={<div className="seg">{['全部', 'P1', 'P2', 'P3'].map(p => <button key={p} className={pri === p ? 'on' : ''} onClick={() => setPri(p)}>{p}</button>)}</div>}>
          <div className="p-2 space-y-1.5">{list.map(g => <button key={g.id} onClick={() => push({ v: 'gapDetail', id: g.id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><PriTag p={g.priority} /><span className="text-[12.5px] font-medium">{g.ability}</span><span className="tag">{g.line}</span><span className="ml-auto num text-[12px]" style={{ color: 'var(--bad)' }}>{g.people} 人</span></div><div className="flex items-center gap-3 text-[10.5px] text-slate-500 mt-1"><span>达标 <b className="num">{g.ready}%</b></span><Sparkline v={g.trend} color={g.trend[7] > g.trend[0] ? 'var(--ok)' : 'var(--bad)'} /><span>{g.weeks} 周 · {g.cost} 万元</span><span className="ml-auto truncate">{g.units.slice(0, 3).join(' · ')}</span></div><span className="go">›</span></button>)}</div>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="预警" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--bad)' }} />}>
            <div className="p-2 space-y-1.5">{ALERTS.map((a, i) => <button key={a.id} onClick={() => a.go === 'talent' ? push({ v: 'talent' }) : push({ v: 'gapDetail', id: GAPS[i % GAPS.length].id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className={`tag tag-${a.sev}`}>{a.kind}</span><span className="text-[12px] font-medium truncate flex-1">{a.title}</span><span className="num text-[13px] font-semibold" style={{ color: 'var(--indigo)' }}>{a.n}</span></div><div className="text-[10.5px] text-slate-500 mt-1 leading-snug">{a.d}</div><div className="text-[10px] text-slate-400 mt-0.5">{a.unit} · 截止 {a.due}</div><span className="go">›</span></button>)}</div>
          </Panel>
          <Panel title="AI 排序说明" extra={<span className="ai-badge">每周重算</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`按「人数 × 差距深度 × 业务影响」排序，${GAPS[0].ability}居首（${GAPS[0].people} 人、差 ${100 - GAPS[0].ready} 分）；${GAPS[2].ability}人数最多但属新增能力项，课程刚发布，预计 12 周内自然收敛。全部补齐预算 ${Math.round(GAPS.reduce((s, g) => s + g.cost, 0) * 10) / 10} 万元。`} speed={7} /></div><button className="btn btn-primary w-full mt-2" onClick={() => { toast('已生成 8 项缺口的补齐计划并推送至千人千面'); jump('plan', 'agg') }}>一键生成补齐计划</button></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：缺口详情 ---------- */
export function GapDetail({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const g = gapById(id) ?? GAPS[0]
  const labels = [...Array.from({ length: 8 }).map((_, i) => `第 ${i + 1} 周`), ...Array.from({ length: g.weeks }).map((_, i) => `+${i + 1}`)]
  const proj = Array.from({ length: g.weeks }).map((_, i) => Math.min(92, Math.round(g.ready + (i + 1) * (82 - g.ready) / g.weeks * 1.05)))
  const noFix = Array.from({ length: g.weeks }).map((_, i) => Math.min(80, Math.round(g.ready + (i + 1) * .35)))
  const shares = unitShare(g)
  return (
    <div className="h-full grid grid-cols-[300px_1fr_340px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><PriTag p={g.priority} /><span className="tag">{g.line}</span></div><div className="text-[18px] font-semibold serif mt-1">{g.ability}</div>
          <div className="flex items-center gap-3 mt-2"><Ring v={g.ready} size={64} stroke={7} color="var(--bad)" sub="达标" /><div className="text-[11.5px] text-slate-600 leading-relaxed">涉及 <b className="num">{g.people}</b> 人 · {g.units.length} 个单位<br />补齐 <b className="num">{g.weeks}</b> 周 · <b className="num">{g.cost}</b> 万元<br />趋势 <Delta v={g.trend[7] - g.trend[0]} unit="pt" /></div></div></div>
        <Panel title="单位分布"><div className="p-3"><Columns h={110} data={shares.map(s => ({ label: s.label, v: s.v }))} /><div className="mt-2 space-y-0.5">{shares.map(s => <button key={s.full} onClick={() => { if (BUREAUS.includes(s.full)) push({ v: 'teamDetail', unit: BUREAU_UNIT.name, team: s.full }); else { const u = unitOf(s.full); if (u) push({ v: 'unitDetail', name: u.name }) } }} className="w-full flex items-center text-[11.5px] px-1 py-0.5 hover:bg-slate-50 rounded"><span>{s.full}</span><span className="ml-auto num">{s.v} 人 ›</span></button>)}</div></div></Panel>
        <Panel title="人员" className="flex-1"><div className="p-3"><button className="btn btn-primary w-full" onClick={() => push({ v: 'gapPeople', id: g.id })}>查看人员清单 ›</button><div className="text-[11px] text-slate-500 mt-2 leading-relaxed">按差距从大到小排列，可逐人进入成长地图。</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="达标率走势与补齐预测" extra={<span className="ai-badge">预测</span>}><div className="px-3 pt-2"><LineChart labels={labels} h={180} unit="%" series={[{ name: '实际', color: '#1e3a6e', area: true, data: [...g.trend, ...Array(g.weeks).fill(null)] }, { name: '执行方案', color: '#178a54', dash: true, data: [...Array(7).fill(null), g.trend[7], ...proj] }, { name: '不干预', color: '#c2402f', dash: true, data: [...Array(7).fill(null), g.trend[7], ...noFix] }]} target={{ v: 80, label: '要求线 80%' }} yMin={40} yMax={100} /></div></Panel>
        <Panel title="根因" extra={<span className="ai-badge">AI 归因</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={g.rootCause} speed={7} /></div></div></Panel>
        <Panel title="补齐方案" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1.5">{g.fix.map((f, i) => <button key={i} className={`act-btn ${i % 2 ? 'gold' : ''}`} onClick={() => { if (f.kind === '课程') jump('factory', 'lib', f.id ? { v: 'course', id: f.id } : undefined); else if (f.kind === '陪练') jump('coach', 'plaza', f.id ? { v: 'plaza', id: f.id } as never : undefined); else if (f.kind === '集训') jump('factory', 'system'); else toast(`已向 ${f.n.split(' ')[0]} 发起带教安排`) }}><span className="ic">{KIND_IC[f.kind]}</span>{f.n}<small>{f.kind} · {f.hours} 学时</small></button>)}
          <div className="hair-t pt-2 px-1 text-[11px] text-slate-500">合计 {g.fix.reduce((s, f) => s + f.hours, 0)} 学时 / 人 · 预算 {g.cost} 万元 · 预计 {g.weeks} 周达到要求线</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 行动" extra={<span className="ai-badge">一键</span>}><div className="p-3 space-y-1.5">
          <button className="act-btn" onClick={() => { toast(`已为 ${g.people} 人生成补齐计划并写入 IDP`); jump('plan', 'agg') }}><span className="ic">划</span>生成补齐计划<small>写入 {g.people} 人 IDP</small></button>
          <button className="act-btn gold" onClick={() => { toast('已生成开班需求'); jump('factory', 'system') }}><span className="ic">班</span>生成开班需求<small>{Math.ceil(g.people / 40)} 期 · 每期 40 人</small></button>
          <button className="act-btn" onClick={() => { toast('已向相关单位培训专责推送'); }}><span className="ic">推</span>推送至 {g.units.length} 个单位<small>培训专责</small></button>
          <button className="act-btn gold" onClick={() => jump('hub', 'search', { v: 'search', q: g.ability })}><span className="ic">搜</span>关联规程与条款<small>知识中枢</small></button>
        </div></Panel>
        <Panel title="投入与收益" className="flex-1"><div className="p-3"><Bars data={[{ label: '课程', v: Math.round(g.cost * .35 * 10) / 10 }, { label: '陪练', v: Math.round(g.cost * .2 * 10) / 10 }, { label: '集训 / 带教', v: Math.round(g.cost * .45 * 10) / 10 }]} unit=" 万" /><div className="grid grid-cols-2 gap-2 mt-3 text-center">{[['达标率提升', `+${82 - g.ready} pt`], ['每人成本', `${Math.round(g.cost * 10000 / g.people)} 元`]].map(([k, v], i) => <div key={k} className="hairline py-2"><div className={`num text-[17px] font-semibold ${i ? 'num-grad' : 'gold-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>)}</div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：人员清单 ---------- */
export function GapPeople({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const g = gapById(id) ?? GAPS[0]
  const people = useMemo(() => g.units.slice(0, 3).flatMap(un => { const isB = BUREAUS.includes(un); const u = isB ? BUREAU_UNIT : unitOf(un); if (!u) return []; const key = g.line === '客户服务' ? '客户' : g.line === '职能' || g.line === '法律合规' ? '安全' : g.line; const base = isFunc(u) ? teamsOf(u)[0] : (['变电管理一所', '变电管理二所', '配电管理所', '输电管理所', '营销部', '调度控制中心', '客户服务中心', '安全监管部'].find(t => t.includes(key)) ?? '变电管理一所'); const team = isB ? `${un} · ${base}` : base; return teamPersons(u.name, team, postOfTeam(team)).slice(0, 6).map(p => { const a = p.abilities.find(x => x.k === g.ability) ?? p.abilities[3]; return { p, a, gap: a.need - a.v } }) }).sort((a, b) => b.gap - a.gap), [g])
  const bins = ['差 > 15', '差 10–15', '差 5–10', '差 < 5', '已达标'].map((label, i) => ({ label, v: people.filter(x => i === 0 ? x.gap > 15 : i === 1 ? x.gap > 10 && x.gap <= 15 : i === 2 ? x.gap > 5 && x.gap <= 10 : i === 3 ? x.gap > 0 && x.gap <= 5 : x.gap <= 0).length, color: i < 2 ? 'var(--bad)' : i === 4 ? 'var(--ok)' : undefined }))
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`${g.ability} · 人员清单　样本 ${people.length} 人 / 共 ${g.people} 人`} bodyClass="overflow-auto scroll">
        <table className="grid"><thead><tr><th>姓名</th><th>单位 · 班组</th><th>岗位</th><th>等级</th><th>{g.ability}</th><th>要求</th><th>差距</th><th>预计达标</th><th>建议</th></tr></thead>
          <tbody>{people.map(({ p, a, gap }) => <tr key={p.id} className="cursor-pointer row-in" onClick={() => push({ v: 'person', id: p.id, unit: p.unit, team: p.team })}><td className="font-medium">{p.name}</td><td className="text-slate-600">{short(p.unit)} · {p.team.replace(/^.*· /, '')}</td><td>{p.post}</td><td>{p.grade}</td><td className="num font-semibold" style={{ color: gap > 0 ? 'var(--bad)' : 'var(--ok)' }}>{a.v}</td><td className="num">{a.need}</td><td className="num">{gap > 0 ? `-${gap}` : '达标'}</td><td className="num">{gap > 0 ? `${Math.max(1, Math.round(gap * .6))} 个月` : '—'}</td><td><span className="tag">{gap > 12 ? '集训 + 带教' : gap > 5 ? '课程 + 陪练' : gap > 0 ? '专项陪练' : '维持'}</span></td></tr>)}</tbody></table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="差距分布"><div className="p-3"><Columns h={110} data={bins} /></div></Panel>
        <Panel title="批量处置" className="flex-1" extra={<span className="ai-badge">AI 分组</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`已按差距自动分为三组：差 10 分以上 ${bins[0].v + bins[1].v} 人安排集训与带教；差 5–10 分 ${bins[2].v} 人安排课程加专项陪练；差 5 分以内 ${bins[3].v} 人仅安排专项陪练。全部写入个人 IDP 后，班组长在班组看板可见。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast(`已为 ${people.length} 人写入学习计划`); jump('plan', 'idp') }}><span className="ic">划</span>全部写入 IDP<small>千人千面</small></button><button className="act-btn gold" onClick={() => { toast('已下发专项陪练任务'); jump('coach', 'company') }}><span className="ic">练</span>下发专项陪练<small>{people.filter(x => x.gap > 0).length} 人</small></button><button className="act-btn" onClick={() => toast('已导出人员清单（xlsx）')}><span className="ic">出</span>导出清单<small>xlsx</small></button></div></div></Panel>
      </div>
    </div>
  )
}
