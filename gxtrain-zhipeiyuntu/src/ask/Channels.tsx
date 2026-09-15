/* 渠道与嵌入（一级）→ 渠道详情（二级）→ 单位使用明细（三级） */
import { useState } from 'react'
import { Panel, Bars, Progress } from '../ui'
import { CHANNELS, channelById, HOURS } from './data'
import { useNav, Spark } from './nav'

export function ChannelsView() {
  const { push, toast } = useNav()
  const [on, setOn] = useState<Record<string, boolean>>(Object.fromEntries(CHANNELS.map(c => [c.id, c.on])))
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title={`接入渠道　${CHANNELS.length}`} bodyClass="overflow-auto scroll">
        <div className="p-3 grid grid-cols-2 gap-3">{CHANNELS.map((c, i) => <button key={c.id} onClick={() => push({ v: 'channel', id: c.id })} className="a-card text-left row-in" style={{ animationDelay: `${i * .05}s` }}><div className="flex items-center gap-2"><span className={`tag ${on[c.id] ? 'tag-ok' : ''}`}>{on[c.id] ? '已开启' : '已关闭'}</span><span className="text-[13.5px] font-semibold">{c.name}</span><span className="ml-auto"><Spark v={c.trend} /></span></div><div className="text-[11.5px] text-slate-600 mt-1">{c.desc}</div><div className="grid grid-cols-4 gap-2 mt-2.5 text-center">{[['日均', c.daily.toLocaleString()], ['占比', `${c.share}%`], ['命中率', `${c.hit}%`], ['满意度', c.sat.toFixed(1)]].map(([k, v]) => <div key={k}><div className="num text-[15px] font-semibold num-grad">{v}</div><div className="text-[10px] text-slate-500">{k}</div></div>)}</div><div className="flex items-center gap-2 mt-2.5"><span className="text-[10.5px] text-slate-500">身份</span>{c.roles.map(r => <span key={r} className="tag">{r}</span>)}<label className="ml-auto flex items-center gap-1 text-[11px]" onClick={e => e.stopPropagation()}><input type="checkbox" checked={on[c.id]} onChange={() => { setOn(s => ({ ...s, [c.id]: !s[c.id] })); toast(`${c.name}已${on[c.id] ? '关闭' : '开启'}`) }} className="accent-[var(--ai)]" />开启</label></div><span className="go">›</span></button>)}</div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="渠道占比"><div className="p-3"><Bars data={CHANNELS.map(c => ({ label: c.name, v: c.share }))} unit="%" max={40} /></div></Panel>
        <Panel title="时段分布" className="flex-1"><div className="p-3"><Bars data={HOURS} unit="%" /><button className="btn btn-primary w-full mt-3" onClick={() => toast('已生成嵌入说明与接入清单')}>新增渠道接入</button></div></Panel>
      </div>
    </div>
  )
}

export function ChannelView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const c = channelById(id)
  if (!c) return null
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className={`tag ${c.on ? 'tag-ok' : ''}`}>{c.on ? '已开启' : '已关闭'}</span><span className="ml-auto text-[11px] text-slate-500">日均 {c.daily.toLocaleString()} · 占比 {c.share}% · 命中率 {c.hit}% · 满意度 {c.sat}</span></div><div className="text-[18px] font-semibold serif mt-1">{c.name}</div><div className="text-[12px] text-slate-600 mt-1">{c.desc}</div></div>
        <Panel title="近 12 周提问量"><div className="p-3"><Bars data={c.trend.map((v, i) => ({ label: `第 ${26 + i} 周`, v }))} /></div></Panel>
        <Panel title="本渠道热问" className="flex-1"><div className="p-2 space-y-1">{c.top.map(q => <button key={q} className="w-full text-left px-2.5 py-2 hairline text-[12px] hover:border-[var(--ai)]" onClick={() => push({ v: 'chat', q })}>{q}</button>)}</div></Panel>
      </div>
      <Panel title="按单位使用" bodyClass="overflow-auto scroll"><div className="p-3 space-y-2">{c.units.map(u => <button key={u.name} className="w-full text-left" onClick={() => push({ v: 'channelUnit', id: c.id, unit: u.name })}><div className="flex items-center gap-2 text-[12px] mb-1"><span className="font-medium">{u.name}</span><span className="ml-auto num text-slate-500">{u.n} / 日</span><span className="text-[var(--gold)]">›</span></div><Progress v={u.n / Math.max(...c.units.map(x => x.n)) * 100} /></button>)}</div></Panel>
      <div className="flex flex-col gap-3 min-h-0"><Panel title="配置"><div className="p-3 space-y-1.5 text-[12px]">{c.cfg.map(x => <div key={x.k} className="flex justify-between"><span className="text-slate-500">{x.k}</span><span>{x.v}</span></div>)}<button className="btn btn-sm w-full mt-1" onClick={() => toast('配置已保存')}>保存配置</button></div></Panel><Panel title="嵌入" className="flex-1"><div className="p-3 text-[12px] space-y-2"><div className="text-slate-600 leading-relaxed">按身份与场景嵌入：{c.roles.join('、')}。答案带出处与口径卡，敏感条目按分级脱敏。</div><button className="btn btn-primary w-full" onClick={() => toast('嵌入说明已复制')}>复制嵌入说明</button></div></Panel></div>
    </div>
  )
}

export function ChannelUnit({ id, unit }: { id: string; unit: string }) {
  const { push, toast } = useNav()
  const c = channelById(id)
  if (!c) return null
  const u = c.units.find(x => x.name === unit) ?? c.units[0]
  const qs = [...c.top, '安规复训什么时候开班', '我的年度学时完成了多少？'].slice(0, 5)
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title={`${unit} · ${c.name}`}><div className="p-4"><div className="grid grid-cols-3 gap-2 mb-3">{[['日均提问', u.n], ['活跃人数', Math.round(u.n * 2.3)], ['命中率', `${c.hit}%`]].map(([k, v], i) => <div key={k as string} className="hairline py-2 text-center"><div className={`num text-[19px] font-semibold ${i % 2 ? 'gold-grad' : 'num-grad'}`}>{v as never}</div><div className="text-[10.5px] text-slate-500">{k as string}</div></div>)}</div><Bars title="近 8 周" data={Array.from({ length: 8 }).map((_, i) => ({ label: `第 ${30 + i} 周`, v: Math.round(u.n * 7 * (0.8 + (i * 7 % 10) / 20)) }))} /></div></Panel>
      <Panel title="本单位热问" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1">{qs.map((q, i) => <button key={q} className="w-full text-left px-2.5 py-2 hairline text-[12px] hover:border-[var(--ai)] flex items-center gap-2" onClick={() => push({ v: 'chat', q })}><span className="num text-[10.5px] text-slate-400 w-[14px]">{i + 1}</span><span className="flex-1">{q}</span><span className="num text-[10.5px] text-slate-400">{Math.round(u.n * (0.3 - i * .04))} 次</span></button>)}</div></Panel>
      <div className="flex flex-col gap-3"><Panel title="动作"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => toast(`已给 ${unit} 推送使用指引`)}>推送使用指引</button><button className="btn w-full" onClick={() => toast('已导出明细')}>导出明细</button></div></Panel></div>
    </div>
  )
}
