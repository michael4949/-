/* 排期与冲突（一级）→ 班次（二级）→ 冲突处置（三级） */
import { useState } from 'react'
import { Panel, CountUp } from '../ui'
import { Heatmap, Gantt, Columns, Ring } from '../charts'
import { CLASSES, CONFLICTS, CAL_HEAT, VENUES, MONTHS, NOW_M, classById, RESOLVE, demandById } from './data'
import { useNav, Typewriter, Kpi, StTag } from './nav'

export function ScheduleView() {
  const { push, toast } = useNav()
  const [venue, setVenue] = useState('全部')
  const list = CLASSES.filter(c => venue === '全部' || c.venue === venue)
  const rows = VENUES.map(v => ({ name: v, sub: `${CLASSES.filter(c => c.venue === v).length} 期`, spans: CLASSES.filter(c => c.venue === v).map(c => ({ from: c.m - 1 + (c.w - 1) / 4, to: c.m - 1 + (c.w - 1) / 4 + Math.max(.25, c.days / 28), color: c.conflict ? '#c2402f' : c.st === '已完成' ? '#94a3b8' : c.venue === '线上' ? '#19b8d8' : '#2f6df6', label: c.name.replace(/（.*）/, ''), st: c.st })) }))
  const cap = list.reduce((s, c) => s + c.cap, 0), sign = list.reduce((s, c) => s + c.sign, 0)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="全年班次" v={<CountUp to={CLASSES.length} />} d={`已完成 ${CLASSES.filter(c => c.st === '已完成').length} · 进行中 ${CLASSES.filter(c => c.st === '进行中').length}`} />
        <Kpi k="待排期" v={<CountUp to={CLASSES.filter(c => c.st === '待排期').length} />} d="AI 已给出候选时间" gold />
        <Kpi k="冲突" v={<CountUp to={CONFLICTS.length} />} d="迎峰度夏 · 检修 · 场地 · 讲师" onClick={() => CONFLICTS[0] && push({ v: 'schedConflict', id: CONFLICTS[0].id })} />
        <Kpi k="报名率" v={<><CountUp to={Math.round(sign / cap * 100)} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`${sign.toLocaleString()} / ${cap.toLocaleString()} 席`} gold />
        <Kpi k="第四季度班次" v={<CountUp to={CLASSES.filter(c => c.m >= 10).length} />} d="全年最密集" />
        <Kpi k="场地利用率" v={<><CountUp to={71} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="培训评价中心 88% · 电科院 54%" gold />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="场地 × 月 排班甘特" extra={<span className="flex items-center gap-3 text-[10.5px] text-slate-500"><span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#2f6df6' }} />线下</span><span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#19b8d8' }} />线上</span><span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#c2402f' }} />冲突</span><span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#94a3b8' }} />已完成</span></span>}><div className="p-3"><Gantt rows={rows} cols={12} colLabel={i => MONTHS[i]} now={NOW_M - .5} onSpan={(r, i) => { const c = CLASSES.filter(x => x.venue === r.name)[i]; if (c) push({ v: 'schedClass', id: c.id }) }} /></div></Panel>
          <Panel title="班次清单" className="flex-1" bodyClass="overflow-auto scroll" extra={<div className="seg">{['全部', ...VENUES].map(v => <button key={v} className={venue === v ? 'on' : ''} onClick={() => setVenue(v)}>{v}</button>)}</div>}>
            <table className="grid"><thead><tr><th>日期</th><th>班次</th><th>地点</th><th>讲师</th><th>容量</th><th>报名</th><th>状态</th><th>冲突</th></tr></thead><tbody>{list.map(c => <tr key={c.id} className="cursor-pointer row-in" onClick={() => push({ v: 'schedClass', id: c.id })}><td className="num whitespace-nowrap">{c.d}</td><td className="font-medium">{c.name}</td><td>{c.venue}</td><td>{c.trainer}</td><td className="num">{c.cap}</td><td className="num">{c.sign}</td><td><StTag s={c.st} /></td><td>{c.conflict ? <span className="tag tag-bad">{c.conflict}</span> : <span className="text-slate-300">—</span>}</td></tr>)}</tbody></table>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="月 × 周 班次密度"><div className="p-3"><Heatmap rows={MONTHS} cols={['第 1 周', '第 2 周', '第 3 周', '第 4 周']} cells={CAL_HEAT} cellH={20} rowW={44} colorOf={v => v === 0 ? '#f1f5f9' : v <= 1 ? '#dbe7fb' : v <= 2 ? '#9dbcf3' : v <= 3 ? '#4f86e6' : '#1e3a6e'} fmt={v => v ? String(v) : ''} onCell={(r, c) => { const k = CLASSES.find(x => x.m === r + 1 && x.w === c + 1); if (k) push({ v: 'schedClass', id: k.id }) }} /></div></Panel>
          <Panel title="待处理冲突" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="ai-badge">AI 已给方案</span>}><div className="p-2 space-y-1.5">{CONFLICTS.map(c => <button key={c.id} onClick={() => push({ v: 'schedConflict', id: c.id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className="tag tag-bad">{c.conflict}</span><span className="num text-[10.5px] text-slate-400 ml-auto">{c.d}</span></div><div className="text-[11.5px] leading-snug mt-1">{c.name}</div><div className="text-[10.5px] text-slate-500 mt-0.5">建议：{RESOLVE[c.conflict!][0]}</div><span className="go">›</span></button>)}<button className="btn btn-primary btn-sm w-full mt-1" onClick={() => toast(`已按 AI 首选方案处置 ${CONFLICTS.length} 个冲突`)}>一键按首选方案处置</button></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：班次 ---------- */
export function SchedClass({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const c = classById(id) ?? CLASSES[0]
  const d = c.demand ? demandById(c.demand) : undefined
  const roster = c.units.map((u, i) => ({ label: u.replace(/供电局$/, ''), v: Math.round(c.sign * [.45, .33, .22][i]) }))
  const same = CLASSES.filter(x => x.venue === c.venue && x.m === c.m && x.id !== c.id)
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><StTag s={c.st} />{c.conflict && <span className="tag tag-bad">{c.conflict}</span>}</div><div className="text-[16px] font-semibold serif mt-1 leading-snug">{c.name}</div><div className="text-[11px] text-slate-500 mt-1">{c.d} 开班 · {c.days} 天 · {c.venue} · 讲师 {c.trainer}</div><div className="flex items-center gap-3 mt-3"><Ring v={Math.round(c.sign / c.cap * 100)} size={64} stroke={7} color={c.sign >= c.cap ? 'var(--gold)' : 'var(--ai)'} sub="报名率" /><div className="text-[11.5px] text-slate-600 leading-relaxed">容量 <b className="num">{c.cap}</b> · 已报 <b className="num">{c.sign}</b><br />{d ? `需求 ${d.n.toLocaleString()} 人次 · ${d.per}` : '课程体系班次'}<br />来源 {c.units.length} 个单位</div></div></div>
        <Panel title="报名来源"><div className="p-3"><Columns h={100} data={roster} /></div></Panel>
        <Panel title="同场地同月" className="flex-1"><div className="p-2 space-y-0.5">{same.length ? same.map(x => <button key={x.id} onClick={() => push({ v: 'schedClass', id: x.id })} className="w-full flex items-center gap-2 text-[11.5px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="num text-slate-500">{x.d}</span><span className="flex-1 truncate text-left">{x.name}</span><StTag s={x.st} /></button>) : <div className="text-[11.5px] text-slate-400 p-2">同场地当月无其他班次</div>}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="日程" className="flex-1"><div className="p-3"><Gantt rows={Array.from({ length: c.days }).map((_, i) => ({ name: `第 ${i + 1} 天`, spans: [{ from: 0, to: 4, color: '#2f6df6', label: i === 0 ? '开班 · 理论' : i === c.days - 1 ? '实操 · 结业考核' : '案例 · 实训' }, { from: 4.2, to: 6, color: '#b08a3e', label: '答疑' }] }))} cols={6} colLabel={i => ['08:30', '10:00', '11:30', '14:00', '15:30', '17:00'][i]} /><div className="text-[10.5px] text-slate-500 mt-1">课程后 2 周内学员自动收到专项陪练任务</div></div></Panel>
        <Panel title="校验" ><div className="p-3 grid grid-cols-4 gap-2 text-center">{[['讲师', c.conflict?.includes('讲师') ? '冲突' : '通过'], ['场地', c.conflict?.includes('场地') ? '冲突' : '通过'], ['检修计划', c.conflict?.includes('检修') ? '冲突' : '通过'], ['迎峰度夏', c.conflict?.includes('迎峰') ? '冲突' : '通过']].map(([k, v]) => <div key={k} className="hairline py-2"><div className="text-[12px] font-semibold" style={{ color: v === '通过' ? 'var(--ok)' : 'var(--bad)' }}>{v}</div><div className="text-[10px] text-slate-500">{k}</div></div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 排期判读" extra={<span className="ai-badge">班次</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={c.conflict ? `本期${c.conflict}，首选方案：${RESOLVE[c.conflict][0]}；改期后 ${c.sign} 名学员自动收到通知，讲师与场地重新校验。` : `本期四项校验全部通过，报名 ${c.sign} / ${c.cap}${c.sign >= c.cap ? '，已满员，候补建议加开一期' : '，预计开班前可满员'}。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5">{c.conflict ? <button className="act-btn" onClick={() => push({ v: 'schedConflict', id: c.id })}><span className="ic">冲</span>处置冲突<small>三级</small></button> : <button className="act-btn" onClick={() => toast('已发布报名并通知学员')}><span className="ic">发</span>发布报名<small>移动端通知</small></button>}<button className="act-btn gold" onClick={() => toast('已加开一期')}><span className="ic">加</span>加开一期<small>复制本期配置</small></button><button className="act-btn" onClick={() => jump('factory', 'system')}><span className="ic">历</span>开班日历<small>课程体系</small></button></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：冲突处置 ---------- */
export function SchedConflict({ id }: { id: string }) {
  const { toast, back } = useNav()
  const c = classById(id) ?? CONFLICTS[0] ?? CLASSES[0]
  const kind = c.conflict ?? '场地已被占用'
  const opts = RESOLVE[kind]
  const [sel, setSel] = useState(0)
  const eff = [{ delay: 1, cost: 0, cover: 100 }, { delay: 0, cost: -1.2, cover: 96 }, { delay: 2, cost: .8, cover: 100 }]
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag tag-bad">{kind}</span><div className="text-[16px] font-semibold serif mt-1 leading-snug">{c.name}</div><div className="text-[11px] text-slate-500 mt-1">{c.d} · {c.venue} · 讲师 {c.trainer} · 已报 {c.sign} 人</div></div>
        <Panel title="冲突详情" className="flex-1"><div className="p-3 text-[12px] leading-relaxed space-y-2">{kind === '与迎峰度夏保供重叠' && <><div>开班日期落在迎峰度夏保供期（7 月 1 日至 9 月 30 日），{c.units.join('、')}生产班组停止脱产培训。</div><div>受影响学员 {c.sign} 人，其中一线生产岗位 {Math.round(c.sign * .7)} 人。</div></>}{kind === '与检修计划冲突' && <><div>{c.units[0]}同期有 220 千伏变电站年度检修，检修计划已锁定 {c.units[0]} 变电、继保班组。</div><div>受影响学员 {Math.round(c.sign * .4)} 人。</div></>}{kind === '场地已被占用' && <><div>{c.venue}当周已被「{CLASSES.find(x => x.venue === c.venue && x.id !== c.id)?.name ?? '内训师 AI 造课训战营'}」占用。</div><div>可用替代场地：广西电科院教室（60 席）、线上直播。</div></>}{kind === '讲师同期已排班' && <><div>讲师 {c.trainer} 当周已在「{CLASSES.find(x => x.trainer === c.trainer && x.id !== c.id)?.name ?? '技术比武集训'}」授课。</div><div>可用替代：数字人讲师（微课工作室已生成本课程口播）、第二讲师。</div></>}</div></Panel>
      </div>
      <Panel title="处置方案　AI 推荐三选一" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1.5">{opts.map((o, i) => <label key={o} className={`mat ${sel === i ? 'on' : ''}`}><input type="radio" checked={sel === i} onChange={() => setSel(i)} className="accent-[var(--ai)] mt-[3px]" /><div className="flex-1"><div className="flex items-center gap-2 text-[12.5px]"><span className={`tag ${i === 0 ? 'tag-gold' : ''}`}>{i === 0 ? '首选' : `方案 ${i + 1}`}</span>{o}</div><div className="grid grid-cols-3 gap-1.5 mt-2 text-center">{[['延期', `${eff[i].delay} 周`], ['成本', `${eff[i].cost >= 0 ? '+' : ''}${eff[i].cost} 万`], ['覆盖', `${eff[i].cover}%`]].map(([k, v]) => <div key={k} className="hairline py-1"><div className="num text-[12px] font-semibold num-grad">{v}</div><div className="text-[9.5px] text-slate-500">{k}</div></div>)}</div></div></label>)}</div></Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 说明"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`推荐「${opts[0]}」：不改变学员范围，延期 1 周内，讲师与场地重新校验通过。${opts[1]}可零延期但覆盖降至 96%；${opts[2]}成本略增。`} speed={7} /></div><button className="btn btn-primary w-full mt-3" onClick={() => { toast(`已采用「${opts[sel]}」并通知 ${c.sign} 名学员`); back() }}>采用方案并通知学员</button><button className="btn w-full mt-2" onClick={() => toast('已转人工排期')}>转人工处理</button></div></Panel>
      </div>
    </div>
  )
}
