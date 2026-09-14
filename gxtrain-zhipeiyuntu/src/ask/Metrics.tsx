/* 数据口径中心（一级）→ 指标详情与血缘（二级）→ 血缘节点（三级） */
import { useState } from 'react'
import { Panel, Bars } from '../ui'
import { METRICS, metricById, unitRows, unitShort } from './data'
import { useNav, Field, Typewriter } from './nav'

export function MetricsView() {
  const { push } = useNav()
  const [q, setQ] = useState('')
  const list = METRICS.filter(m => !q || m.name.includes(q) || m.aliases.some(a => a.includes(q)))
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`指标字典　${list.length} 项`} extra={<input value={q} onChange={e => setQ(e.target.value)} placeholder="搜指标或别名" className="hairline px-2 py-1 text-[12px] w-[170px] outline-none" />} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>指标</th><th>别名</th><th>公式</th><th>来源</th><th>更新</th><th>责任</th><th>提问次数</th><th></th></tr></thead>
          <tbody>{list.map(m => <tr key={m.id} className="tbl-row" onClick={() => push({ v: 'metric', id: m.id })}><td className="font-medium">{m.name}</td><td className="text-[11px]">{m.aliases.map(a => <span key={a} className="tag mr-1">{a}</span>)}</td><td className="text-[11.5px] text-slate-600 max-w-[260px]">{m.formula}</td><td className="text-[11.5px]">{m.src}</td><td className="text-[11.5px] text-slate-500">{m.freq}</td><td className="text-[11.5px]">{m.owner}</td><td className="num">{m.uses.toLocaleString()}</td><td><span className="text-[var(--gold)]">›</span></td></tr>)}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="口径治理"><div className="p-3 text-[12px] space-y-1.5">{[['指标数', '12'], ['本月口径变更', '2'], ['历史回答重算', '4,380'], ['口径冲突', '0']].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="num font-medium">{v}</span></div>)}<div className="text-[11px] text-slate-500 pt-1 hair-t">所有数据回答均附口径卡；口径变更后历史回答按新口径重算并标注。</div></div></Panel>
        <Panel title="提问最多的指标" className="flex-1"><div className="p-3"><Bars data={[...METRICS].sort((a, b) => b.uses - a.uses).slice(0, 8).map(m => ({ label: m.name, v: m.uses }))} /></div></Panel>
      </div>
    </div>
  )
}

export function MetricView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const m = metricById(id)
  if (!m) return null
  const rows = unitRows(m).slice(0, 8)
  const nodes = [{ id: 'sys', x: 14, y: 30, cls: 'sys', label: m.src }, ...m.tables.map((t, i) => ({ id: t, x: 186, y: 10 + i * 42, cls: '', label: t })), { id: 'metric', x: 356, y: 30 + (m.tables.length - 1) * 21, cls: 'metric', label: m.name }, { id: 'ask', x: 486, y: 10 + (m.tables.length - 1) * 21, cls: '', label: '助手回答' }, { id: 'report', x: 486, y: 52 + (m.tables.length - 1) * 21, cls: '', label: '培训科月报' }]
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2">{m.aliases.map(a => <span key={a} className="tag">{a}</span>)}<span className="ml-auto text-[11px] text-slate-500">提问 {m.uses.toLocaleString()} 次</span></div><div className="text-[18px] font-semibold serif mt-1">{m.name}</div><div className="text-[12px] text-slate-600 mt-1">{m.def}</div></div>
        <Panel title="血缘" className="flex-1" extra={<span className="text-[10.5px] text-slate-500">点击节点进入三级</span>}>
          <div className="p-3 lineage" style={{ height: 40 + Math.max(3, m.tables.length) * 42 }}>
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>{m.tables.map((t, i) => <line key={'a' + t} x1={150} y1={30 + 24} x2={186} y2={10 + i * 42 + 24} stroke="rgba(47,109,246,.35)" strokeDasharray="4 4" className="gedge" />)}{m.tables.map((t, i) => <line key={t} x1={330} y1={10 + i * 42 + 24} x2={356} y2={30 + (m.tables.length - 1) * 21 + 24} stroke="rgba(47,109,246,.35)" strokeDasharray="4 4" className="gedge" />)}<line x1={470} y1={30 + (m.tables.length - 1) * 21 + 24} x2={486} y2={10 + (m.tables.length - 1) * 21 + 24} stroke="rgba(176,138,62,.5)" strokeDasharray="4 4" className="gedge" /><line x1={470} y1={30 + (m.tables.length - 1) * 21 + 24} x2={486} y2={52 + (m.tables.length - 1) * 21 + 24} stroke="rgba(176,138,62,.5)" strokeDasharray="4 4" className="gedge" /></svg>
            {nodes.map(n => <button key={n.id} className={`lnode ${n.cls}`} style={{ left: n.x, top: n.y + 12 }} onClick={() => push({ v: 'lineage', id: m.id, node: n.label })}>{n.label}</button>)}
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="口径"><div className="p-3"><Field k="公式" v={m.formula} /><div className="grid grid-cols-2 gap-2 text-[12px]"><div><div className="text-[11px] text-slate-500">更新频率</div>{m.freq}</div><div><div className="text-[11px] text-slate-500">责任部门</div>{m.owner}</div><div><div className="text-[11px] text-slate-500">可用维度</div>{m.dims.join(' / ')}</div><div><div className="text-[11px] text-slate-500">单位</div>{m.unit}</div></div></div></Panel>
        <Panel title="口径变更记录" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-3 space-y-2">{m.history.length ? m.history.map(h => <div key={h.date} className="hairline px-2.5 py-2 text-[12px]"><div className="flex items-center gap-2"><span className="num text-[10.5px] text-slate-400">{h.date}</span><span className="tag ml-auto">{h.by}</span></div><div className="mt-0.5">{h.note}</div></div>) : <div className="text-[12px] text-slate-400">口径自发布以来未变更</div>}<button className="btn btn-sm w-full" onClick={() => toast('已提交口径变更申请，待培训科审批')}>申请口径变更</button></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="当前值 · 前 8 单位"><div className="p-3"><Bars data={rows.map(r => ({ label: unitShort(r.name), v: Math.round(r.v * 10) / 10 }))} unit={m.unit === '%' ? '%' : ''} /></div></Panel>
        <Panel title="常见问法" className="flex-1"><div className="p-2 space-y-1">{m.questions.map(q => <button key={q} className="w-full text-left px-2.5 py-2 hairline text-[12px] hover:border-[var(--ai)]" onClick={() => push({ v: 'chat', q })}>{q}</button>)}</div></Panel>
      </div>
    </div>
  )
}

export function LineageView({ id, node }: { id: string; node: string }) {
  const { toast, back } = useNav()
  const m = metricById(id)
  if (!m) return null
  const isTable = m.tables.includes(node)
  const isSys = node === m.src
  const kind = isTable ? '数据表' : isSys ? '源系统' : node === m.name ? '指标' : '下游'
  const text = isTable ? `表 ${node}：${m.src.split(' · ')[0]}的业务明细表，${m.freq}同步到数据仓库。主键：人员编号 + 记录日期；关键字段：单位、班组、岗位、${m.name.includes('学时') ? '学时' : '结果'}、更新时间。近 30 天记录 ${(1200000 + node.length * 91713).toLocaleString()} 条，质量校验通过率 99.6%。` : isSys ? `${node}：${m.name}的源系统。通过管理信息大区数据接口按 ${m.freq} 抽取，抽取延迟 ≤ 15 分钟；接口负责人为数字化部数据管理专责。` : node === m.name ? `指标 ${m.name} 由 ${m.tables.length} 张表聚合而来，按 ${m.dims.join('、')} 维度预计算，回答时按提问身份的数据范围过滤。` : `${node}：消费 ${m.name} 的下游。${node.includes('助手') ? '每次回答附口径卡，口径变更后历史回答自动重算并标注。' : '每月 3 日按模板自动生成，指标口径与助手一致。'}`
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`${kind} · ${node}`}><div className="p-4"><div className="ai-out"><Typewriter text={text} speed={7} /></div>{isTable && <table className="grid mt-4"><thead><tr><th>字段</th><th>类型</th><th>说明</th></tr></thead><tbody>{[['person_id', 'string', '人员编号'], ['unit_id', 'string', '一级单位'], ['team_id', 'string', '班组'], ['post', 'string', '岗位'], ['value', 'number', m.name.includes('学时') ? '学时' : '结果值'], ['updated_at', 'datetime', '更新时间']].map(([f, t, d]) => <tr key={f}><td className="num">{f}</td><td className="text-slate-500">{t}</td><td>{d}</td></tr>)}</tbody></table>}</div></Panel>
      <div className="flex flex-col gap-3"><Panel title="质量"><div className="p-3 text-[12px] space-y-1.5">{[['最近同步', '今日 02:00'], ['同步耗时', '4 分 12 秒'], ['校验通过率', '99.6%'], ['异常记录', '128 条（已隔离）']].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="num">{v}</span></div>)}</div></Panel><Panel title="动作" className="flex-1"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => toast('已发起数据质量核查工单')}>发起质量核查</button><button className="btn w-full" onClick={back}>返回指标</button></div></Panel></div>
    </div>
  )
}
