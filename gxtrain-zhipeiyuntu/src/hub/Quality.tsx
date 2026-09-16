/* 质量与权限（一级）→ 问题清单（二级）→ 条目（三级，复用条目详情） */
import { useState } from 'react'
import { Panel } from '../ui'
import { Q_CATS, issuesOf, SENS_LEVELS, PERM_ROLES, PERM_ACTS, PERM, AUDIT } from './data'
import { useNav, KindTag, StatusTag, SensTag } from './nav'

export function QualityView() {
  const { push, toast } = useNav()
  const [perm, setPerm] = useState(PERM)
  const score = 91.6
  return (
    <div className="h-full grid grid-cols-[320px_1fr_360px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="资产健康度">
          <div className="p-3 flex items-center gap-4">
            <svg width="120" height="120" viewBox="0 0 120 120" className="gauge-ring">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#eef1f6" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--ok)" strokeWidth="10" strokeDasharray={`${score / 100 * 314} 314`} strokeLinecap="butt" transform="rotate(-90 60 60)" />
              <text x="60" y="57" textAnchor="middle" fontSize="24" fontWeight="600" fill="var(--indigo)" className="num">{score}</text>
              <text x="60" y="74" textAnchor="middle" fontSize="10" fill="#94a3b8">较上月 +1.2</text>
            </svg>
            <div className="text-[11.5px] text-slate-600 leading-relaxed">由时效、来源、引用、一致性四项加权。本月复核 1,203 条，配电与营销两个专业的 2024 年入库条目集中到期。</div>
          </div>
        </Panel>
        <Panel title="问题分类" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1.5">
            {Q_CATS.map(c => (
              <button key={c.id} onClick={() => push({ v: 'issues', cat: c.id })} className="a-card w-full text-left">
                <div className="flex items-center gap-2"><span className={`tag tag-${c.sev}`}>{c.name}</span><span className="ml-auto num text-[15px] font-semibold" style={{ color: 'var(--indigo)' }}>{c.n.toLocaleString()}</span></div>
                <div className="text-[11px] text-slate-500 leading-snug mt-1">{c.desc}</div><span className="go">›</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="敏感分级" extra={<span className="text-[10.5px] text-slate-500">分级依据评估表的数据敏感维度</span>}>
          <div className="p-3 grid grid-cols-3 gap-2">
            {SENS_LEVELS.map(s => (
              <div key={s.lvl} className="hairline p-2.5" style={{ borderTop: `3px solid ${s.c}` }}>
                <div className="flex items-center gap-2"><SensTag s={s.lvl} /><span className="ml-auto num text-[16px] font-semibold" style={{ color: s.c }}>{s.n.toLocaleString()}</span></div>
                <div className="text-[11px] text-slate-600 mt-1 leading-snug">{s.desc}</div>
                <div className="text-[10.5px] text-slate-400 mt-1">可见：{s.who}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="权限矩阵　角色 × 操作" className="flex-1" extra={<button className="btn btn-sm" onClick={() => toast('权限配置已保存并记入审计日志')}>保存</button>}>
          <div className="p-3 overflow-auto scroll">
            <table className="text-[11.5px]">
              <thead><tr><th className="text-left pr-3 pb-2 text-slate-500 font-normal">角色</th>{PERM_ACTS.map(a => <th key={a} className="pb-2 px-1 font-normal text-slate-500 whitespace-nowrap">{a}</th>)}</tr></thead>
              <tbody>{PERM_ROLES.map(r => (
                <tr key={r}><td className="pr-3 py-1 font-medium whitespace-nowrap">{r}</td>
                  {PERM_ACTS.map((a, j) => <td key={a} className="text-center px-1 py-1"><span className={`perm-cell ${perm[r][j] ? 'on' : ''}`} onClick={() => setPerm(p => ({ ...p, [r]: p[r].map((v, k) => k === j ? !v : v) }))}>{perm[r][j] ? '✓' : ''}</span></td>)}
                </tr>
              ))}</tbody>
            </table>
            
          </div>
        </Panel>
      </div>
      <Panel title="审计日志" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => toast('已导出近 30 天审计日志')}>导出</button>}>
        <div className="p-2 space-y-1">
          {AUDIT.map((l, i) => (
            <div key={i} className="hairline px-2.5 py-2 row-in" style={{ animationDelay: `${i * .04}s` }}>
              <div className="flex items-center gap-2 text-[11px]"><span className="num text-slate-400">{l.t}</span><span className={`tag ${l.what.includes('回滚') || l.what.includes('敏感') ? 'tag-warn' : ''} ml-auto`}>{l.what}</span></div>
              <div className="text-[12px] mt-0.5">{l.obj}</div>
              <div className="text-[10.5px] text-slate-500">{l.who} · {l.ip}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function IssuesView({ cat }: { cat: string }) {
  const { push, toast } = useNav()
  const c = Q_CATS.find(x => x.id === cat)!
  const [rows, setRows] = useState(issuesOf(cat))
  const act = (id: string, what: string) => { setRows(r => r.filter(x => x.id !== id)); toast(`${id} ${what}`) }
  return (
    <div className="h-full grid grid-cols-[1fr_300px] gap-3 p-3 min-h-0">
      <Panel title={<span>{c.name}　<span className="num text-[11.5px] font-normal text-slate-500">展示 {rows.length} 条 / 共 {c.n.toLocaleString()} 条</span></span>} extra={<div className="flex gap-1.5"><button className="btn btn-sm btn-primary" onClick={() => { setRows([]); toast('已批量派发复核任务') }}>批量派发复核</button></div>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>编号</th><th>类型</th><th>标题</th><th>单位</th><th>问题</th><th>健康度</th><th>动作</th></tr></thead>
          <tbody>{rows.map((a, i) => (
            <tr key={a.id} className="row-in" style={{ animationDelay: `${Math.min(i, 20) * .03}s` }}>
              <td className="num text-slate-500">{a.id}</td><td><KindTag k={a.kind} /></td>
              <td><button className="font-medium text-left hover:text-[var(--indigo)]" onClick={() => push({ v: 'asset', id: a.id })}>{a.title} <span className="text-[var(--gold)]">›</span></button></td>
              <td className="text-[11.5px] text-slate-600">{a.unit.replace(/（.*）/, '')}</td>
              <td className="text-[11px]">{a.quality.issues.map(x => <span key={x} className="tag tag-warn mr-1">{x}</span>)}</td>
              <td className="num" style={{ color: a.quality.score < 70 ? 'var(--bad)' : 'var(--warn)' }}>{a.quality.score}</td>
              <td className="whitespace-nowrap"><span className="flex gap-1"><button className="btn btn-sm" onClick={() => act(a.id, '复核通过')}>复核通过</button><button className="btn btn-sm" onClick={() => act(a.id, '已下线')}>下线</button></span></td>
            </tr>
          ))}</tbody>
          {rows.length === 0 && <tbody><tr><td colSpan={7} className="text-center text-slate-400 py-8">本页问题已全部处理</td></tr></tbody>}
        </table>
      </Panel>
      <div className="flex flex-col gap-3">
        <Panel title="处置说明"><div className="p-3 text-[12px] text-slate-600 leading-relaxed">{c.desc}。复核通过后有效期顺延 12 个月；下线的条目保留版本历史，下游引用自动切换到替代条目。</div></Panel>
        <Panel title="其他分类" className="flex-1"><div className="p-2 space-y-1">{Q_CATS.filter(x => x.id !== cat).map(x => <button key={x.id} onClick={() => push({ v: 'issues', cat: x.id })} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] hover:bg-slate-50 hairline"><StatusTag s={x.name} /><span className="ml-auto num text-slate-500">{x.n.toLocaleString()}</span></button>)}</div></Panel>
      </div>
    </div>
  )
}
