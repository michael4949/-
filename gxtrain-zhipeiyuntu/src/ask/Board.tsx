/* 一级：助手驾驶舱 */
import { Panel, Bars, CountUp } from '../ui'
import { TREND_A, HOURS, ROLE_DIST, A_INSIGHTS, unitAskDist, GAPS, REVIEWS, HOTS, CHANNELS, SKILLS } from './data'
import { useNav, Kpi, AreaChart, KindTag } from './nav'
import type { Route } from './nav'

export default function Board() {
  const { push } = useNav()
  const dist = unitAskDist().slice(0, 12)
  const max = dist[0].n
  const last = TREND_A[25]
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="本周提问" v={<CountUp to={last.q} />} d={`日均 ${Math.round(last.q / 7).toLocaleString()} · 较上周 ${Math.round((last.q / TREND_A[24].q - 1) * 100) >= 0 ? '+' : ''}${Math.round((last.q / TREND_A[24].q - 1) * 100)}%`} onClick={() => push({ v: 'chat' })} spark={TREND_A.map(t => t.q)} />
        <Kpi k="知识命中率" v={<><CountUp to={last.hit} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="回答带出处或口径卡" gold onClick={() => push({ v: 'quality' })} spark={TREND_A.map(t => t.hit)} />
        <Kpi k="满意度" v={<><CountUp to={last.sat} dec={2} /><span className="text-[12px] font-normal text-slate-500 ml-1">/ 5</span></>} d="12,840 条反馈" onClick={() => push({ v: 'quality' })} spark={TREND_A.map(t => t.sat)} />
        <Kpi k="数据问答占比" v={<><CountUp to={38} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="知识 54% · 动作 8%" gold onClick={() => push({ v: 'metrics' })} />
        <Kpi k="覆盖单位 / 岗位" v={<><CountUp to={28} /><span className="text-[12px] font-normal text-slate-500 ml-1">/ 176</span></>} d="人力资源部自身在内" onClick={() => push({ v: 'channels' })} />
        <Kpi k="技能与渠道" v={<><CountUp to={SKILLS.filter(s => s.status === '已上线').length} /><span className="text-[12px] font-normal text-slate-500 ml-1">/ {CHANNELS.length}</span></>} d="已上线技能 · 接入渠道" gold onClick={() => push({ v: 'skills' })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="提问身份构成"><div className="p-3"><Bars data={ROLE_DIST.map(r => ({ label: r.k, v: r.v }))} unit="%" max={60} /></div></Panel>
          <Panel title="提问时段分布"><div className="p-3"><Bars data={HOURS} unit="%" /><div className="text-[11px] text-slate-500 leading-relaxed mt-2 hair-t pt-2">高峰在班前与作业时段，助手已进入真实作业流程。</div></div></Panel>
          <Panel title="待办" className="flex-1"><div className="p-2 space-y-1.5">
            {[['低分回答待复核', REVIEWS.filter(r => r.status === '待复核').length, { v: 'quality' } as Route], ['知识缺口待认领', GAPS.filter(g => g.status === '待认领').length, { v: 'gaps' } as Route], ['技能待审批', SKILLS.filter(s => s.status !== '已上线').length, { v: 'skills' } as Route], ['热点待触发动作', HOTS.flatMap(h => h.actions).filter(a => a.st === '待启动').length, { v: 'hot' } as Route]].map(([k, n, r]) => (
              <button key={k as string} onClick={() => push(r as Route)} className="w-full flex items-center gap-2 hairline px-2.5 py-2 text-[12px] hover:border-[var(--ai)]"><span className="w-1.5 h-1.5 pulse-dot" style={{ background: 'var(--gold)' }} /><span>{k as string}</span><span className="ml-auto num font-semibold" style={{ color: 'var(--indigo)' }}>{n as number}</span><span className="text-[var(--gold)]">›</span></button>
            ))}
          </div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="提问量、命中率与满意度　近 26 周"><div className="px-3 pt-2 pb-1"><AreaChart data={[TREND_A.map(t => t.q / 200), TREND_A.map(t => t.hit), TREND_A.map(t => t.sat * 20)]} keys={['提问量（÷200）', '命中率 %', '满意度（×20）']} colors={['#2f6df6', '#1e3a6e', '#b08a3e']} labels={TREND_A.map(t => t.w)} h={170} /></div></Panel>
          <Panel title="按一级单位分布　本周提问" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'channels' })}>渠道分布</button>}>
            <div className="p-3 space-y-[6px]">{dist.map((d, i) => (
              <button key={d.u.id} onClick={() => push({ v: 'chat', q: `${d.u.name.replace(/（.*）/, '')}今年人均学时多少？` })} className="w-full flex items-center gap-2.5 group">
                <span className="w-[150px] shrink-0 text-[11.5px] text-right truncate text-slate-600 group-hover:text-[var(--ai)]">{d.u.name}</span>
                <span className="flex-1 h-[14px] bg-slate-100 rounded relative overflow-hidden"><span className="absolute inset-y-0 left-0 bar-grow" style={{ width: `${d.n / max * 100}%`, background: d.u.grp === '本部职能部门' ? 'linear-gradient(90deg,var(--gold),var(--gold-2))' : d.u.grp === '直属机构' ? '#6a86b8' : 'linear-gradient(90deg,var(--indigo),var(--ai))', animationDelay: `${i * .05}s` }} /></span>
                <span className="w-[56px] num text-[11.5px] text-slate-600">{d.n.toLocaleString()}</span><span className="text-[10px] text-slate-400 w-[70px] text-left">{d.u.grp}</span>
              </button>))}</div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 洞察" extra={<span className="text-[10.5px] text-slate-500">每小时刷新</span>}><div className="p-2 space-y-1.5">{A_INSIGHTS.map(x => <button key={x.k} onClick={() => push(x.go as Route)} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className={`tag tag-${x.tag}`}>{x.k}</span><span className="num text-[12px] font-semibold" style={{ color: 'var(--indigo)' }}>{x.v}</span></div><div className="text-[11px] text-slate-600 leading-snug mt-1">{x.d}</div><span className="go">›</span></button>)}</div></Panel>
          <Panel title="今日热问" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'hot' })}>热度榜 ›</button>}>
            <div className="p-2 space-y-1">{HOTS.slice(0, 6).map((h, i) => <button key={h.q} onClick={() => push({ v: 'chat', q: h.q })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg row-in" style={{ animationDelay: `${i * .05}s` }}><span className="num text-[11px] w-[14px]" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</span><KindTag k={i === 6 ? '数据' : '知识'} /><span className="text-[12px] truncate flex-1">{h.q}</span><span className="num text-[11px] text-slate-500">{h.n}</span></button>)}</div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
