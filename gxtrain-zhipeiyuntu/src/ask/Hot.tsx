/* 提问热度榜（一级）→ 提问明细（二级）→ 触发动作（三级） */
import { Panel, Bars, Progress } from '../ui'
import { HOTS } from './data'
import { useNav, Spark, StatusTag, Typewriter } from './nav'

export function HotView() {
  const { push, toast } = useNav()
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title="提问热度榜　本月" extra={<span className="text-[10.5px] text-slate-500">员工反复问什么，下一轮就重点训什么</span>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>排名</th><th>提问</th><th>次数</th><th>近 8 周</th><th>集中单位</th><th>满意度</th><th>已触发动作</th><th></th></tr></thead>
          <tbody>{HOTS.map(h => (
            <tr key={h.q} className="tbl-row" onClick={() => push({ v: 'hotDetail', rank: h.rank })}>
              <td className="num" style={{ color: h.rank <= 3 ? 'var(--gold)' : undefined }}>{h.rank}</td><td className="font-medium">{h.q}</td><td className="num">{h.n.toLocaleString()}</td>
              <td><Spark v={h.trend} color={h.up ? 'var(--warn)' : 'var(--ai)'} /></td><td className="text-[11.5px] text-slate-600">{h.units.join('、')}</td>
              <td className="num">{h.sat.toFixed(1)}</td><td className="text-[11.5px] text-slate-600">{h.act}</td><td><span className="text-[var(--gold)]">›</span></td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="热度 → 动作闭环"><div className="p-3 text-[12px] space-y-1.5">{[['触发课程立项', 3], ['新增陪练分支', 4], ['补充题库', 6], ['纳入班组周课', 2], ['接入开班日历', 1]].map(([k, v]) => <div key={k as string} className="flex items-center gap-2"><span className="flex-1">{k as string}</span><div className="w-[90px]"><Progress v={(v as number) * 15} /></div><span className="num w-[14px] text-right">{v as number}</span></div>)}<div className="text-[11px] text-slate-500 pt-1 hair-t">每条热点都能定位到岗位与班组，动作执行后热度回落即为闭环。</div></div></Panel>
        <Panel title="本月热度分布" className="flex-1"><div className="p-3"><Bars data={HOTS.slice(0, 8).map(h => ({ label: h.q.slice(0, 10), v: h.n, note: h.up ? '↑' : undefined }))} /><button className="btn btn-sm w-full mt-3" onClick={() => toast('已把热度榜推送到培训科周会材料')}>推送到周会材料</button></div></Panel>
      </div>
    </div>
  )
}

export function HotDetail({ rank }: { rank: number }) {
  const { push, toast, jump } = useNav()
  const h = HOTS.find(x => x.rank === rank)
  if (!h) return null
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className="tag tag-gold">第 {h.rank} 名</span><span className={`tag ${h.up ? 'tag-warn' : ''}`}>{h.up ? '↑ 上升' : '— 持平'}</span><span className="ml-auto num text-[11px] text-slate-500">本月 {h.n.toLocaleString()} 次 · 满意度 {h.sat.toFixed(1)}</span></div><div className="text-[17px] font-semibold serif mt-1">{h.q}</div></div>
        <Panel title="近 8 周提问量"><div className="p-3"><Bars data={h.trend.map((v, i) => ({ label: `第 ${30 + i} 周`, v }))} /></div></Panel>
        <Panel title="典型问法" className="flex-1"><div className="p-2 space-y-1">{h.samples.map(s => <button key={s} className="w-full text-left px-2.5 py-2 hairline text-[12px] hover:border-[var(--ai)]" onClick={() => push({ v: 'chat', q: s })}>“{s}”<span className="text-[10.5px] text-slate-400 ml-2">去问答工作台复现 ›</span></button>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="提问来源"><div className="p-3"><Bars title="集中单位（次）" data={h.units.map((u, i) => ({ label: u, v: Math.round(h.n * ([.42, .31, .27][i] ?? .2)) }))} /><div className="mt-3 hair-t pt-2 flex flex-wrap gap-1.5"><span className="text-[11px] text-slate-500">身份</span>{h.roles.map(r => <span key={r} className="tag">{r}</span>)}</div></div></Panel>
        <Panel title="标准回答" className="flex-1"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${h.q}：${h.assetId ? '已挂接中枢条目 ' + h.assetId + '，回答带出处与锚点。' : '已由知识运营整理为标准回答，纳入助手示例库。'}高频问法已归并为 ${h.samples.length} 种表述，命中率 ${h.assetId ? '98.4' : '95.1'}%。`} speed={8} /></div>{h.assetId && <button className="btn btn-sm w-full mt-3" onClick={() => jump('hub', 'catalog', { v: 'asset', id: h.assetId })}>查看中枢条目 {h.assetId} ›</button>}</div></Panel>
      </div>
      <Panel title="触发动作" bodyClass="overflow-auto scroll">
        <div className="p-2 space-y-1.5">{h.actions.map((a, i) => <button key={a.k} className="a-card w-full text-left" onClick={() => push({ v: 'hotAction', rank: h.rank, idx: i })}><div className="flex items-center gap-2"><StatusTag s={a.st} /><span className="text-[12.5px] font-medium">{a.k}</span></div><div className="text-[11px] text-slate-500 mt-0.5">{a.d}</div><span className="go">›</span></button>)}<button className="btn btn-primary w-full mt-1" onClick={() => toast('已创建课程需求工单并推送到课程工厂')}>再生成一个动作</button></div>
      </Panel>
    </div>
  )
}

export function HotAction({ rank, idx }: { rank: number; idx: number }) {
  const { toast, jump, back } = useNav()
  const h = HOTS.find(x => x.rank === rank)
  const a = h?.actions[idx]
  if (!h || !a) return null
  const steps = a.k.includes('课') || a.k.includes('立项') ? ['归并 3 种问法为课程主题', '检索中枢原料并生成需求单', '推送课程工厂生成工作台', '内训师认领并生成'] : a.k.includes('陪练') || a.k.includes('分支') ? ['定位对应陪练步骤', '生成分支剧本与知识点卡', '推送教练编辑器', '培训科审核发布'] : a.k.includes('条目') ? ['整理标准回答', '提交中枢入库流水线', '审核发布并回流助手'] : ['汇总提问集中的班组', '生成一页知识卡', '推送班组看板']
  const done = a.st === '已完成' ? steps.length : a.st === '进行中' ? 2 : 0
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`${a.k}　${h.q}`} extra={<StatusTag s={a.st} />}>
        <div className="p-4">
          {steps.map((s, i) => <div key={s} className="flex gap-2.5 pb-3 relative"><div className="shrink-0 relative"><div className={`stage-dot ${i < done ? 'done' : i === done ? 'cur' : ''}`}>{i < done ? '✓' : i + 1}</div>{i < steps.length - 1 && <span className="absolute left-1/2 top-[26px] bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div><div className="pt-0.5 text-[12.5px]">{s}</div></div>)}
          <div className="ai-out mt-2 text-[12px]">{a.st === '已完成' ? `动作完成后该提问热度由峰值回落 ${28 + rank * 3}%，满意度升至 ${h.sat.toFixed(1)}。` : `预计完成后热度回落 ${20 + rank * 2}% 以上；影响 ${h.units.length} 个单位、${h.roles.join('与')}。`}</div>
        </div>
      </Panel>
      <div className="flex flex-col gap-3"><Panel title="动作"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => { toast(`已打开 ${a.k}`); jump(a.go.node, a.go.tab, a.go.route) }}>打开执行页面</button>{a.st !== '已完成' && <button className="btn w-full" onClick={() => { toast('已推进到下一步'); back() }}>推进到下一步</button>}<button className="btn w-full" onClick={back}>返回明细</button></div></Panel></div>
    </div>
  )
}
