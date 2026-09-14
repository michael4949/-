/* 一级：地图驾驶舱 */
import { Panel, Bars, CountUp, Donut } from '../ui'
import { LineChart, Heatmap, heat } from '../charts'
import { UNIT_MATRIX } from '../data'
import { UNITS, GRADES, READY_TREND, READY_FORECAST, AT_INSIGHTS, GAPS, ALERTS, unitReady, short, PYRAMID } from './data'
import { useNav, Kpi, PriTag } from './nav'
import type { Route } from './nav'

export default function Board() {
  const { push } = useNav()
  const labels = [...Array.from({ length: 26 }).map((_, i) => `第 ${12 + i} 周`), ...Array.from({ length: 12 }).map((_, i) => `+${i + 1}`)]
  const units = [...UNITS].sort((a, b) => unitReady(b) - unitReady(a))
  const dist = [{ k: '已全部达标', n: 39_990, c: '#178a54' }, { k: '缺 1–2 项', n: 3_140, c: '#2f6df6' }, { k: '缺 3–5 项', n: 1_770, c: '#b08a3e' }, { k: '缺 6 项以上', n: 794, c: '#c2402f' }]
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="已建能力档案" v={<CountUp to={45694} />} d="28 个一级单位 · 176 个岗位" onClick={() => push({ v: 'unit' })} />
        <Kpi k="岗位能力达标率" v={<><CountUp to={87.4} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="较年初 +6.2 个百分点" gold onClick={() => push({ v: 'insight' })} spark={READY_TREND} />
        <Kpi k="能力项" v={<CountUp to={486} />} d="9 个专业与领域 · 本年新增 18 项" onClick={() => push({ v: 'matrix' })} />
        <Kpi k="缺口人次" v={<CountUp to={GAPS.reduce((a, g) => a + g.people, 0) * 3} />} d={`P1 缺口 ${GAPS.filter(g => g.priority === 'P1').length} 项`} gold onClick={() => push({ v: 'gaps' })} />
        <Kpi k="预测明年可达技师" v={<CountUp to={412} />} d="128 人仅差一项能力" onClick={() => push({ v: 'talent' })} />
        <Kpi k="预警" v={<CountUp to={ALERTS.length} />} d={`${ALERTS.filter(a => a.sev === 'bad').length} 项需本月处置`} gold onClick={() => push({ v: 'gaps' })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="达标构成" extra={<button className="btn btn-sm" onClick={() => push({ v: 'gaps' })}>缺口 ›</button>}>
            <div className="p-2 flex items-center gap-3"><Donut data={dist} size={126} label="已建档" /><div className="flex-1 space-y-1">{dist.map(d => <div key={d.k} className="flex items-center gap-2 text-[11.5px]"><span className="w-2 h-2 rounded-sm" style={{ background: d.c }} /><span className="text-slate-600">{d.k}</span><span className="ml-auto num text-slate-500">{d.n.toLocaleString()}</span></div>)}</div></div>
          </Panel>
          <Panel title="等级结构" extra={<button className="btn btn-sm" onClick={() => push({ v: 'talent' })}>梯队 ›</button>}><div className="p-3"><Bars data={PYRAMID.map(p => ({ label: p.k, v: p.n }))} /></div></Panel>
          <Panel title="预警" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1.5">{ALERTS.slice(0, 4).map(a => <button key={a.id} onClick={() => push({ v: a.go as 'gaps' | 'talent' })} className="w-full flex items-center gap-2 hairline px-2.5 py-2 text-[12px] hover:border-[var(--ai)]"><span className={`tag tag-${a.sev}`}>{a.kind}</span><span className="truncate flex-1 text-left">{a.title}</span><span className="num font-semibold" style={{ color: 'var(--indigo)' }}>{a.n}</span><span className="text-[var(--gold)]">›</span></button>)}</div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="达标率趋势与预测　近 26 周 + 未来 12 周" extra={<span className="ai-badge">AI 预测</span>}>
            <div className="px-3 pt-2 pb-1"><LineChart labels={labels} h={170} unit="%" series={[{ name: '达标率', color: '#1e3a6e', data: [...READY_TREND, ...Array(12).fill(null)], area: true }, { name: '预测', color: '#2f6df6', dash: true, data: [...Array(25).fill(null), READY_TREND[25], ...READY_FORECAST.base] }]} band={{ lo: READY_FORECAST.lo, hi: READY_FORECAST.hi, from: 26 }} target={{ v: 90, label: '年度目标 90%' }} /></div>
          </Panel>
          <Panel title="专业 × 等级达标率" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'unit' })}>单位全景 ›</button>}>
            <div className="p-3"><Heatmap rows={UNIT_MATRIX.map(r => r.line)} cols={GRADES} cells={UNIT_MATRIX.map(r => r.cells.map(c => c.v))} fmt={v => `${v}`} colorOf={v => heat(v)} onCell={() => push({ v: 'unit' })} cellH={30} rowW={80} /></div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 洞察" extra={<span className="text-[10.5px] text-slate-500">每周一 06:00</span>}><div className="p-2 space-y-1.5">{AT_INSIGHTS.map(x => <button key={x.k} onClick={() => push({ v: x.go } as Route)} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className={`tag tag-${x.tag}`}>{x.k}</span><span className="num text-[12px] font-semibold" style={{ color: 'var(--indigo)' }}>{x.v}</span></div><div className="text-[11px] text-slate-600 leading-snug mt-1">{x.d}</div><span className="go">›</span></button>)}</div></Panel>
          <Panel title="单位达标率　前 8 / 后 4" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1">{[...units.slice(0, 8), ...units.slice(-4)].map((u, i) => <button key={u.id} onClick={() => push({ v: 'unitDetail', name: u.name })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="num text-[11px] w-[16px]" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i < 8 ? i + 1 : 28 - (11 - i)}</span><span className="text-[12px] truncate flex-1">{short(u.name)}</span><span className="num text-[12px] font-semibold" style={{ color: unitReady(u) >= 85 ? 'var(--ok)' : unitReady(u) >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{unitReady(u)}%</span></button>)}</div>
          </Panel>
          <Panel title="P1 缺口"><div className="p-2 space-y-1">{GAPS.filter(g => g.priority === 'P1').map(g => <button key={g.id} onClick={() => push({ v: 'gapDetail', id: g.id })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px]"><PriTag p={g.priority} /><span className="flex-1 truncate">{g.ability} · {g.line}</span><span className="num text-slate-500">{g.people} 人</span></button>)}</div></Panel>
        </div>
      </div>
    </div>
  )
}
