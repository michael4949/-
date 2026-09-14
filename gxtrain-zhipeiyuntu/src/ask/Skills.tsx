/* 助手技能（一级）→ 技能详情（二级）→ 调用日志（三级） */
import { useState } from 'react'
import { Panel, Bars, Progress } from '../ui'
import { SKILLS, skillById } from './data'
import { useNav, KindTag, StatusTag } from './nav'

export function SkillsView() {
  const { push, toast } = useNav()
  const [kind, setKind] = useState('')
  const list = SKILLS.filter(s => !kind || s.kind === kind)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`技能　${list.length} 项`} extra={<div className="seg"><button className={!kind ? 'on' : ''} onClick={() => setKind('')}>全部</button>{['查询', '生成', '执行', '提醒'].map(k => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}</div>} bodyClass="overflow-auto scroll">
        <div className="p-3 grid grid-cols-3 gap-3">{list.map((s, i) => <button key={s.id} onClick={() => push({ v: 'skill', id: s.id })} className="a-card text-left row-in" style={{ animationDelay: `${i * .04}s` }}><div className="flex items-center gap-2"><KindTag k={s.kind} /><StatusTag s={s.status} /><span className="ml-auto num text-[11px] text-slate-500">{s.uses.toLocaleString()} 次</span></div><div className="text-[13.5px] font-semibold mt-1.5">{s.name}</div><div className="text-[11.5px] text-slate-600 mt-1 line-clamp-2">{s.desc}</div><div className="flex items-center gap-2 mt-2"><div className="flex-1"><Progress v={s.ok} /></div><span className="num text-[10.5px] text-slate-500">成功 {s.ok}%</span></div><span className="go">›</span></button>)}</div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="调用量　本月"><div className="p-3"><Bars data={[...SKILLS].sort((a, b) => b.uses - a.uses).slice(0, 8).map(s => ({ label: s.name, v: s.uses }))} /></div></Panel>
        <Panel title="新增技能" className="flex-1"><div className="p-3 text-[12px] space-y-2"><div className="text-slate-600 leading-relaxed">技能由数字化部与培训科联合审批上线；灰度技能面向培训科与培训专责先行开放。</div><button className="btn btn-primary w-full" onClick={() => toast('已提交技能申请：查询开班余量')}>申请新技能</button></div></Panel>
      </div>
    </div>
  )
}

export function SkillView({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const s = skillById(id)
  if (!s) return null
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><KindTag k={s.kind} /><StatusTag s={s.status} /><span className="ml-auto text-[11px] text-slate-500">{s.uses.toLocaleString()} 次 · 成功率 {s.ok}%</span></div><div className="text-[18px] font-semibold serif mt-1">{s.name}</div><div className="text-[12px] text-slate-600 mt-1">{s.desc}</div></div>
        <Panel title="参数"><div className="p-3 space-y-1.5">{s.params.map(p => <div key={p.k} className="flex gap-3 text-[12px]"><span className="tag">{p.k}</span><span className="text-slate-600">{p.d || '—'}</span></div>)}</div></Panel>
        <Panel title="示例对话" className="flex-1"><div className="p-3"><div className="bub-q" style={{ alignSelf: 'auto', maxWidth: '100%' }}>{s.example}</div><div className="ai-out mt-3 text-[12px]">助手解析参数、校验权限后执行，并把结果写回业务系统；执行记录可在调用日志中追溯。</div><button className="btn btn-primary btn-sm mt-3" onClick={() => push({ v: 'chat', q: s.example })}>在问答工作台试一试</button></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="权限"><div className="p-3 text-[12px] space-y-1">{s.roles.map(r => <div key={r} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ok)' }} />{r}</div>)}<div className="text-[11px] text-slate-500 pt-2 hair-t">执行类技能须二次确认；涉及他人数据按身份范围收窄。</div></div></Panel>
        <Panel title="近期调用" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'skillLog', id: s.id })}>全部日志 ›</button>}><div className="p-2 space-y-1">{s.logs.slice(0, 5).map((l, i) => <div key={i} className="hairline px-2.5 py-2 text-[11.5px]"><div className="flex items-center gap-2"><span className="num text-[10.5px] text-slate-400">{l.t}</span><span className={`tag ${l.ok ? 'tag-ok' : 'tag-bad'} ml-auto`}>{l.ok ? '成功' : '失败'}</span></div><div className="mt-0.5 truncate">{l.who} · {l.unit}：{l.q}</div></div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3"><Panel title="动作"><div className="p-3 space-y-2">{s.go && <button className="btn btn-primary w-full" onClick={() => jump(s.go!.node, s.go!.tab)}>打开关联模块</button>}<button className="btn w-full" onClick={() => toast(s.status === '已上线' ? '已暂停该技能' : '已提交上线审批')}>{s.status === '已上线' ? '暂停技能' : '申请上线'}</button><button className="btn w-full" onClick={() => toast('已导出技能说明')}>导出说明</button></div></Panel><Panel title="成功率趋势" className="flex-1"><div className="p-3"><Bars data={['第 33 周', '第 34 周', '第 35 周', '第 36 周', '第 37 周'].map((w, i) => ({ label: w, v: Math.round(Math.min(100, s.ok - 2 + i * .6) * 10) / 10 }))} unit="%" max={100} /></div></Panel></div>
    </div>
  )
}

export function SkillLog({ id }: { id: string }) {
  const { toast } = useNav()
  const s = skillById(id)
  if (!s) return null
  return (
    <div className="h-full grid grid-cols-[1fr_300px] gap-3 p-3 min-h-0">
      <Panel title={`调用日志　${s.name}`} extra={<button className="btn btn-sm" onClick={() => toast('已导出日志')}>导出</button>} bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>时间</th><th>提问人</th><th>单位</th><th>问题</th><th>耗时</th><th>结果</th></tr></thead><tbody>{s.logs.map((l, i) => <tr key={i}><td className="num text-slate-500 whitespace-nowrap">{l.t}</td><td>{l.who}</td><td className="text-[11.5px] text-slate-600">{l.unit}</td><td className="font-medium">{l.q}</td><td className="num">{l.ms} ms</td><td><span className={`tag ${l.ok ? 'tag-ok' : 'tag-bad'}`}>{l.ok ? '成功' : '失败'}</span></td></tr>)}</tbody></table></Panel>
      <div className="flex flex-col gap-3"><Panel title="统计"><div className="p-3 text-[12px] space-y-1.5">{[['本月调用', s.uses.toLocaleString()], ['成功率', `${s.ok}%`], ['平均耗时', `${Math.round(s.logs.reduce((a, l) => a + l.ms, 0) / s.logs.length)} ms`], ['失败原因', '参数缺失 · 权限不足']].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="num">{v}</span></div>)}</div></Panel></div>
    </div>
  )
}
