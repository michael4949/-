/* 回答质量（一级）→ 复核详情（二级）→ 改写对比（三级） */
import { useState } from 'react'
import { Panel, Bars, Progress } from '../ui'
import { REVIEWS, TREND_A } from './data'
import { useNav, StatusTag, Typewriter, AreaChart } from './nav'

export function QualityView() {
  const { push, toast } = useNav()
  const [st, setSt] = useState('')
  const list = REVIEWS.filter(r => !st || r.status === st)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">{[['满意度', '4.62 / 5', '较上月 +0.08'], ['知识命中率', '94.2%', '数据类 96.8%'], ['出处准确率', '98.1%', '抽检 1,200 条'], ['低分回答', '2.3%', '已全部进入复核'], ['敏感拦截', '38 次', '本月，0 泄露']].map(([k, v, d], i) => <div key={k} className={`hkpi ${i % 2 ? 'gold' : ''}`}><div className="k">{k}</div><div className="v num">{v}</div><div className="d">{d}</div></div>)}</div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_360px] gap-3">
        <Panel title={`复核队列　${list.length}`} extra={<div className="seg"><button className={!st ? 'on' : ''} onClick={() => setSt('')}>全部</button>{['待复核', '已改写', '已确认'].map(s => <button key={s} className={st === s ? 'on' : ''} onClick={() => setSt(s)}>{s}</button>)}</div>} bodyClass="overflow-auto scroll">
          <table className="grid"><thead><tr><th>时间</th><th>问题</th><th>身份 / 单位</th><th>渠道</th><th>评分</th><th>问题类型</th><th>状态</th><th></th></tr></thead><tbody>{list.map(r => <tr key={r.id} className="tbl-row" onClick={() => push({ v: 'reviewItem', id: r.id })}><td className="num text-slate-500 whitespace-nowrap">{r.when}</td><td className="font-medium">{r.q}</td><td className="text-[11.5px] text-slate-600">{r.role} · {r.unit}</td><td className="text-[11.5px]">{r.channel}</td><td><span className="text-[var(--gold)]">{'★'.repeat(r.score)}</span><span className="text-slate-300">{'★'.repeat(5 - r.score)}</span></td><td><span className={`tag ${r.issue === '敏感信息' ? 'tag-bad' : 'tag-warn'}`}>{r.issue}</span></td><td><StatusTag s={r.status} /></td><td><span className="text-[var(--gold)]">›</span></td></tr>)}</tbody></table>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="命中率与满意度　近 26 周"><div className="px-2 pt-2"><AreaChart data={[TREND_A.map(t => t.hit), TREND_A.map(t => t.sat * 20)]} keys={['命中率 %', '满意度（×20）']} colors={['#2f6df6', '#b08a3e']} labels={TREND_A.map(t => t.w)} h={140} /></div></Panel>
          <Panel title="问题类型分布" className="flex-1"><div className="p-3"><Bars data={[{ label: '口径不一致', v: 34 }, { label: '出处不准', v: 22 }, { label: '未理解意图', v: 19 }, { label: '表述过长', v: 17 }, { label: '敏感信息', v: 8, note: '拦截' }]} /><div className="mt-3 space-y-1.5"><div className="flex items-center gap-2 text-[11.5px]"><span className="w-[80px] text-slate-500">复核完成</span><div className="flex-1"><Progress v={67} /></div><span className="num">67%</span></div><button className="btn btn-primary w-full" onClick={() => toast('已把本月质量报告推送给知识运营')}>生成质量报告</button></div></div></Panel>
        </div>
      </div>
    </div>
  )
}

export function ReviewItem({ id }: { id: string }) {
  const { push, toast, jump, back } = useNav()
  const r = REVIEWS.find(x => x.id === id)
  if (!r) return null
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className={`tag ${r.issue === '敏感信息' ? 'tag-bad' : 'tag-warn'}`}>{r.issue}</span><StatusTag s={r.status} /><span className="ml-auto text-[11px] text-slate-500">{r.role} · {r.unit} · {r.channel} · {r.when}</span></div><div className="text-[17px] font-semibold serif mt-1">{r.q}</div></div>
        <Panel title="原回答" className="flex-1"><div className="p-4"><div className="text-[13px] leading-relaxed p-3 rounded-xl" style={{ background: '#fdf1ef', border: '1px solid rgba(194,64,47,.25)' }}>{r.a}</div><div className="mt-3 text-[11.5px] text-slate-500">评分 <span className="text-[var(--gold)]">{'★'.repeat(r.score)}</span>{r.refs.length ? ` · 引用 ${r.refs.join('、')}` : ' · 无出处'}</div></div></Panel>
      </div>
      <Panel title="AI 诊断与改写建议" extra={<button className="btn btn-sm" onClick={() => push({ v: 'rewrite', id: r.id })}>对比 ›</button>}><div className="p-4"><div className="ai-out"><Typewriter text={`【诊断】${r.issue}：${r.issue === '出处不准' ? '回答未引用现行条款，且结论与条款相反。' : r.issue === '口径不一致' ? '回答混用了两个口径，未附口径卡。' : r.issue === '表述过长' ? '回答包含整段原文引用，关键信息被淹没。' : r.issue === '敏感信息' ? '回答暴露了敏感分级为"敏感"的内容。' : '意图识别失败，未拆解为可回答的子问题。'}\n\n【改写】${r.fix}\n\n【回流】改写后写入标准回答库；相似提问 ${12 + r.q.length} 条自动采用新回答。`} speed={7} /></div></div></Panel>
      <div className="flex flex-col gap-3"><Panel title="处理"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => { toast('已采纳改写并回流标准回答库'); back() }}>采纳改写</button>{r.refs[0] && <button className="btn w-full" onClick={() => jump('hub', 'catalog', { v: 'asset', id: r.refs[0] })}>查看引用条目</button>}<button className="btn w-full" onClick={() => { toast('已通知提问人查看更新后的回答'); }}>通知提问人</button><button className="btn w-full" onClick={() => toast('已标记为无需处理')}>无需处理</button></div></Panel></div>
    </div>
  )
}

export function RewriteView({ id }: { id: string }) {
  const { toast, back } = useNav()
  const r = REVIEWS.find(x => x.id === id)
  if (!r) return null
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title="改写前"><div className="p-4 text-[13px] leading-relaxed"><span className="diff-old">{r.a}</span></div></Panel>
      <Panel title="改写后"><div className="p-4 text-[13px] leading-relaxed"><span className="diff-new">{r.fix}</span>{r.refs.length > 0 && <div className="mt-3 chips-row">{r.refs.map(x => <span key={x} className="cite"><b>{x}</b></span>)}</div>}</div></Panel>
      <div className="flex flex-col gap-3"><Panel title="校验"><div className="p-3 space-y-1.5 text-[12px]">{[['出处为现行版本', true], ['口径卡已附', r.issue !== '口径不一致' || true], ['长度 ≤ 200 字', true], ['敏感信息', true]].map(([k, ok]) => <div key={k as string} className="flex items-center gap-2"><span className={`tag ${ok ? 'tag-ok' : 'tag-warn'}`}>{ok ? '通过' : '注意'}</span>{k as string}</div>)}</div></Panel><Panel title="动作" className="flex-1"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => { toast('已发布改写后的回答'); back() }}>发布</button><button className="btn w-full" onClick={back}>返回</button></div></Panel></div>
    </div>
  )
}
