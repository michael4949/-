/* 需求汇总（一级）→ 课程需求（二级）→ 班次（三级） */
import { useMemo, useState } from 'react'
import { Panel, Bars, CountUp } from '../ui'
import { Heatmap, Columns, Ring, heat } from '../charts'
import { UNIT_GROUPS } from '../units'
import { DEMANDS, demandById, CLASSES, BUREAUS } from './data'
import { useNav, Typewriter, Kpi, StTag } from './nav'

export function AggView() {
  const { push, toast, jump } = useNav()
  const [line, setLine] = useState('全部')
  const lines = ['全部', ...Array.from(new Set(DEMANDS.map(d => d.line)))]
  const list = useMemo(() => DEMANDS.filter(d => line === '全部' || d.line === line), [line])
  const top = DEMANDS.slice(0, 10)
  const byLine = lines.slice(1).map(l => ({ label: l, v: DEMANDS.filter(d => d.line === l).reduce((s, d) => s + d.n, 0) }))
  const totalN = DEMANDS.reduce((s, d) => s + d.n, 0), totalCls = DEMANDS.reduce((s, d) => s + d.cls, 0), totalCost = Math.round(DEMANDS.reduce((s, d) => s + d.cost, 0) * 10) / 10
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k="需求课程" v={<CountUp to={DEMANDS.length} />} d="由 45,694 份计划自动汇总" />
        <Kpi k="需求人次" v={<CountUp to={totalN} />} d={`高优先 ${DEMANDS.filter(d => d.pri === '高').reduce((s, d) => s + d.n, 0).toLocaleString()} 人次`} gold />
        <Kpi k="建议班次" v={<CountUp to={totalCls} />} d={`已排期 ${CLASSES.filter(c => c.demand).length} 期`} onClick={() => push({ v: 'schedule' })} />
        <Kpi k="预算需求" v={<><CountUp to={totalCost} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">万元</span></>} d="课程 + 场地 + 讲师" gold onClick={() => push({ v: 'budget' })} />
        <Kpi k="线上化比例" v={<><CountUp to={Math.round(DEMANDS.filter(d => d.online).reduce((s, d) => s + d.n, 0) / totalN * 100)} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="AI 建议提高到 45%" onClick={() => push({ v: 'insight' })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_420px] gap-3">
        <Panel title={`课程需求　${list.length} 门`} bodyClass="overflow-auto scroll" extra={<div className="flex flex-wrap gap-1">{lines.map(l => <button key={l} className={`dim-tab ${line === l ? 'on' : ''}`} onClick={() => setLine(l)}>{l}</button>)}</div>}>
          <table className="grid"><thead><tr><th>课程</th><th>专业线</th><th>来源</th><th>需求人次</th><th>建议班次</th><th>优先级</th><th>组织方式</th><th>学时</th><th>预算</th></tr></thead>
            <tbody>{list.map(d => <tr key={d.id} className="cursor-pointer row-in" onClick={() => push({ v: 'aggCourse', id: d.id })}><td className="font-medium">{d.c}</td><td><span className="tag">{d.line}</span></td><td className="text-[11px] text-slate-500">{d.src}</td><td className="num font-semibold">{d.n.toLocaleString()}</td><td className="num">{d.cls} 期</td><td><span className={`tag ${d.pri === '高' ? 'tag-bad' : d.pri === '中' ? 'tag-warn' : ''}`}>{d.pri}</span></td><td className="text-slate-600">{d.per}</td><td className="num">{d.hours}</td><td className="num">{d.cost} 万</td></tr>)}</tbody></table>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="课程 × 单位组需求热力　前 10" bodyClass="overflow-auto scroll"><div className="p-3"><Heatmap rows={top.map(d => d.c.length > 12 ? d.c.slice(0, 12) + '…' : d.c)} cols={UNIT_GROUPS.map(g => g.replace('本部', ''))} cells={top.map(d => d.byGrp)} cellH={24} rowW={120} colorOf={v => heat(60 + Math.min(40, v / 25))} onCell={r => push({ v: 'aggCourse', id: top[r].id })} /></div></Panel>
          <Panel title="按专业线"><div className="p-3"><Columns h={100} data={byLine} /></div></Panel>
          <Panel title="AI 开班建议" className="flex-1" extra={<span className="ai-badge">合并 · 线上化</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${DEMANDS[0].c}需求 ${DEMANDS[0].n.toLocaleString()} 人次居首，建议线上直播 + 回放；继电保护类 4 个地市局需求各 22–31 人，合并为省公司统一开班 3 期可覆盖；分布式接入需求集中在县域新电力，建议由集团分批组织。`} speed={7} /></div><div className="flex gap-2 mt-2"><button className="btn btn-primary btn-sm flex-1" onClick={() => { toast('已生成开班计划并写入排期'); push({ v: 'schedule' }) }}>生成开班计划</button><button className="btn btn-sm flex-1" onClick={() => jump('factory', 'system')}>课程体系 ›</button></div></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：课程需求 ---------- */
export function AggCourse({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const d = demandById(id) ?? DEMANDS[0]
  const cls = CLASSES.filter(c => c.demand === d.id)
  const covered = cls.reduce((s, c) => s + c.cap, 0)
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className={`tag ${d.pri === '高' ? 'tag-bad' : d.pri === '中' ? 'tag-warn' : ''}`}>优先级 {d.pri}</span><span className="tag">{d.line}</span></div><div className="text-[16px] font-semibold serif mt-1 leading-snug">{d.c}</div><div className="text-[11px] text-slate-500 mt-1">{d.src} · {d.hours} 学时 · {d.per}</div><div className="flex items-center gap-3 mt-3"><Ring v={Math.min(100, Math.round(covered / d.n * 100))} size={64} stroke={7} sub="已覆盖" /><div className="text-[11.5px] text-slate-600 leading-relaxed">需求 <b className="num">{d.n.toLocaleString()}</b> 人次<br />建议 <b className="num">{d.cls}</b> 期 · 已排 <b className="num">{cls.length}</b> 期<br />预算 <b className="num">{d.cost}</b> 万元</div></div></div>
        <Panel title="按单位组"><div className="p-3"><Bars data={UNIT_GROUPS.map((g, i) => ({ label: g, v: d.byGrp[i] }))} /></div></Panel>
        <Panel title="操作" className="flex-1"><div className="p-3 space-y-1.5"><button className="act-btn" onClick={() => { toast('已发布到开班日历'); jump('factory', 'system') }}><span className="ic">布</span>发布到开班日历<small>课程体系</small></button>{d.courseId ? <button className="act-btn gold" onClick={() => jump('factory', 'lib', { v: 'course', id: d.courseId } as never)}><span className="ic">课</span>打开课程<small>课程库</small></button> : <button className="act-btn gold" onClick={() => { toast('已发起课程生成任务'); jump('factory', 'gen') }}><span className="ic">生</span>生成课程<small>课程工厂</small></button>}<button className="act-btn" onClick={() => toast('已把线上化建议写入方案')}><span className="ic">线</span>{d.online ? '已线上化' : '建议线上化'}<small>{d.online ? '直播 + 回放' : `可省 ${Math.round(d.cost * .28 * 10) / 10} 万元`}</small></button></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="14 个地市局需求分布"><div className="p-3"><Columns h={130} data={BUREAUS.map((b, i) => ({ label: b.replace(/供电局$/, ''), v: d.byBureau[i], color: d.byBureau[i] >= 40 ? 'var(--gold)' : undefined }))} /><div className="text-[10.5px] text-slate-500 mt-1">金色为可单独开班（≥ 40 人）</div></div></Panel>
        <Panel title={`班次安排　${cls.length} 期`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入三级</span>}><table className="grid"><thead><tr><th>期次</th><th>日期</th><th>地点</th><th>容量</th><th>报名</th><th>讲师</th><th>状态</th></tr></thead><tbody>{cls.map(c => <tr key={c.id} className="cursor-pointer" onClick={() => push({ v: 'aggClass', id: d.id, no: c.no })}><td className="num">第 {c.no} 期</td><td className="num">{c.d}</td><td>{c.venue}</td><td className="num">{c.cap}</td><td className="num">{c.sign}</td><td>{c.trainer}</td><td><StTag s={c.st} /></td></tr>)}{cls.length < d.cls && Array.from({ length: Math.min(3, d.cls - cls.length) }).map((_, i) => <tr key={'t' + i} className="text-slate-400"><td className="num">第 {cls.length + i + 1} 期</td><td colSpan={5}>待排期 · AI 建议 {10 + i} 月</td><td><span className="tag">待排期</span></td></tr>)}</tbody></table></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 开班建议" extra={<span className="ai-badge">测算</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${d.c}需求 ${d.n.toLocaleString()} 人次，${d.byBureau.filter(x => x >= 40).length} 个地市局可单独开班，其余合并为区域班；已排 ${cls.length} 期覆盖 ${Math.min(100, Math.round(covered / d.n * 100))}%，还需 ${Math.max(0, d.cls - cls.length)} 期。${d.online ? '线上形式可一次覆盖全部需求。' : `若改为线上直播 + 回放，可省 ${Math.round(d.cost * .28 * 10) / 10} 万元并提前 6 周完成。`}`} speed={7} /></div><button className="btn btn-primary w-full mt-2" onClick={() => { toast(`已补排 ${Math.max(0, d.cls - cls.length)} 期班次`); push({ v: 'schedule' }) }}>补排剩余班次</button></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：班次 ---------- */
export function AggClass({ id, no }: { id: string; no: number }) {
  const { push, toast, jump } = useNav()
  const d = demandById(id) ?? DEMANDS[0]
  const c = CLASSES.find(x => x.demand === d.id && x.no === no) ?? CLASSES.find(x => x.demand === d.id) ?? CLASSES[0]
  const roster = c.units.map((u, i) => ({ label: u.replace(/供电局$/, ''), v: Math.round(c.sign * [.45, .33, .22][i]) }))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><StTag s={c.st} />{c.conflict && <span className="tag tag-bad">冲突</span>}</div><div className="text-[16px] font-semibold serif mt-1 leading-snug">{c.name}</div><div className="text-[11px] text-slate-500 mt-1">{c.d} 开班 · {c.days} 天 · {c.venue} · 讲师 {c.trainer}</div><div className="flex items-center gap-3 mt-3"><Ring v={Math.round(c.sign / c.cap * 100)} size={64} stroke={7} color={c.sign >= c.cap ? 'var(--gold)' : 'var(--ai)'} sub="报名率" /><div className="text-[11.5px] text-slate-600 leading-relaxed">容量 <b className="num">{c.cap}</b> · 已报 <b className="num">{c.sign}</b><br />候补 <b className="num">{c.sign >= c.cap ? 6 + (no * 5) % 12 : 0}</b> 人<br />来源 {c.units.length} 个单位</div></div></div>
        <Panel title="报名来源" className="flex-1"><div className="p-3"><Columns h={110} data={roster} /><div className="mt-2 text-[11px] text-slate-500">名单来自千人千面计划自动派发，学员与班组长无需重复填报。</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="学员名单　样本" className="flex-1" bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>姓名</th><th>单位</th><th>岗位</th><th>来源条目</th><th>报名状态</th></tr></thead><tbody>{['黄文杰', '周伟', '李明辉', '农小刚', '陈立', '蓝海', '覃丽', '梁雨桐', '陆泽宇', '莫晓萌'].map((n, i) => <tr key={n}><td className="font-medium">{n}</td><td>{c.units[i % c.units.length]}</td><td>{['变电值班员', '继电保护员', '配网运维员', '装表接电员'][i % 4]}</td><td className="text-[11px] text-slate-500">{d.src}</td><td><span className={`tag ${i < 8 ? 'tag-ok' : 'tag-warn'}`}>{i < 8 ? '已确认' : '候补'}</span></td></tr>)}</tbody></table></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 排期判读" extra={<span className="ai-badge">班次</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={c.conflict ? `本期${c.conflict}，建议${c.conflict.includes('讲师') ? '更换为数字人讲师或改期一周' : '改期至下月第 2 周或转线上'}；改期后 ${c.sign} 名学员将自动收到通知。` : `本期报名 ${c.sign} / ${c.cap}，${c.sign >= c.cap ? '已满员，候补人员建议加开一期' : '预计开班前可满员'}；讲师 ${c.trainer} 同期无冲突，场地已确认。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5">{c.conflict ? <button className="act-btn" onClick={() => push({ v: 'schedConflict', id: c.id })}><span className="ic">冲</span>处置冲突<small>排期与冲突</small></button> : <button className="act-btn" onClick={() => toast('已发布报名并通知学员')}><span className="ic">发</span>发布报名<small>移动端通知</small></button>}<button className="act-btn gold" onClick={() => toast('已加开一期并复制配置')}><span className="ic">加</span>加开一期<small>复制本期配置</small></button><button className="act-btn" onClick={() => jump('factory', 'system')}><span className="ic">历</span>查看开班日历<small>课程体系</small></button></div></div></Panel>
        <Panel title="其他期次" className="flex-1"><div className="p-2 space-y-0.5">{CLASSES.filter(x => x.demand === d.id && x.id !== c.id).map(x => <button key={x.id} onClick={() => push({ v: 'aggClass', id: d.id, no: x.no })} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="num">第 {x.no} 期</span><span className="num text-slate-500">{x.d}</span><span className="flex-1 truncate text-left text-slate-600">{x.venue}</span><StTag s={x.st} /></button>)}</div></Panel>
      </div>
    </div>
  )
}
