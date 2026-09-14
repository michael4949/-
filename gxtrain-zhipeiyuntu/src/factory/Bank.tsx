/* 题库工作台（一级）→ 题目详情 / 试卷（二级）→ 作答分析（三级） */
import { useMemo, useState } from 'react'
import { Panel, Bars, Progress } from '../ui'
import { QUESTIONS, POSTS_ALL, TOTAL_QUESTIONS, buildPaper, Q_KINDS, unitLabels } from './data'
import type { QKind } from './data'
import { addPaper, PAPERS, questionById, findCourse } from './store'
import { useNav, QTag, Diff, StatusTag, Typewriter, KindTag } from './nav'
import type { Route } from './nav'

export function BankView({ r }: { r: Extract<Route, { v: 'bank' }> }) {
  const { push, toast } = useNav()
  const [post, setPost] = useState(r.post ?? '变电值班员')
  const [kind, setKind] = useState<QKind | ''>('')
  const [src, setSrc] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [level, setLevel] = useState('技师')
  const [n, setN] = useState(40)
  const [mix, setMix] = useState<Record<QKind, number>>({ 单选: 40, 多选: 20, 判断: 25, 情景: 15 })
  const [gen, setGen] = useState<'idle' | 'run' | 'done'>('idle')
  const [pid, setPid] = useState('')
  const rows = useMemo(() => QUESTIONS.filter(x => (!post || x.post === post) && (!kind || x.kind === kind) && (!src || x.src === src) && (!status || x.status === status) && (!q || x.stem.includes(q) || x.kp.includes(q) || x.anchor.includes(q))).slice(0, 80), [post, kind, src, status, q])
  const postN = (p: string) => QUESTIONS.filter(x => x.post === p).length
  const runPaper = () => { setGen('run'); setTimeout(() => { const p = buildPaper(post, level, n, mix, Object.keys(PAPERS).length + 1); addPaper(p); setPid(p.id); setGen('done') }, 1500) }
  return (
    <div className="h-full grid grid-cols-[230px_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title="岗位" bodyClass="overflow-auto scroll" extra={<span className="num text-[10.5px] text-slate-500">{TOTAL_QUESTIONS.toLocaleString()} 道</span>}>
        <div className="p-2">
          <button className={`tree-node ${!post ? 'on' : ''}`} onClick={() => setPost('')}>全部岗位<span className="n">{QUESTIONS.length}</span></button>
          {POSTS_ALL.filter(p => postN(p) >= 3).slice(0, 60).map(p => <button key={p} className={`tree-node ${post === p ? 'on' : ''}`} onClick={() => setPost(p)}>{p}<span className="n">{postN(p) * 12}</span></button>)}
        </div>
      </Panel>
      <Panel title={<span>题目　<span className="num text-[11.5px] font-normal text-slate-500">显示 {rows.length} 道</span></span>} extra={
        <>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜题干、知识点、锚点" className="hairline px-2 py-1 text-[12px] w-[160px] outline-none" />
          <div className="seg"><button className={!kind ? 'on' : ''} onClick={() => setKind('')}>全部</button>{Q_KINDS.map(k => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}</div>
          <select value={src} onChange={e => setSrc(e.target.value)} className="hairline px-2 py-1 text-[12px] outline-none"><option value="">全部来源</option>{['AI 生成', '内训师编写', '规程解析'].map(s => <option key={s}>{s}</option>)}</select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="hairline px-2 py-1 text-[12px] outline-none"><option value="">全部状态</option>{['已发布', '待审核', '已停用'].map(s => <option key={s}>{s}</option>)}</select>
        </>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>编号</th><th>题型</th><th>题干</th><th>知识点 / 锚点</th><th>难度</th><th>区分度</th><th>正确率</th><th>来源</th><th>状态</th></tr></thead>
          <tbody>{rows.map(x => (
            <tr key={x.id} className="cursor-pointer" onClick={() => push({ v: 'question', id: x.id })}>
              <td className="num text-slate-500 whitespace-nowrap">{x.id}</td><td><QTag k={x.kind} /></td><td className="font-medium">{x.stem}</td>
              <td className="text-[11px]"><span className="tag">{x.kp}</span> <span className="tag tag-gold">{x.anchor}</span></td>
              <td><Diff d={x.diff} /></td><td className="num">{x.disc.toFixed(2)}</td>
              <td className="w-[90px]"><div className="flex items-center gap-1.5"><div className="flex-1"><Progress v={x.stats.correct} /></div><span className="num text-[11px]">{x.stats.correct}%</span></div></td>
              <td className="text-[11px] text-slate-600 whitespace-nowrap">{x.src}</td><td><StatusTag s={x.status} /></td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="智能组卷" extra={<span className="ai-badge">三项校验</span>}>
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-[11px] text-slate-500 mb-1">岗位</div><select value={post} onChange={e => setPost(e.target.value)} className="hairline px-2 py-1 text-[12px] w-full outline-none">{POSTS_ALL.filter(p => postN(p) >= 3).map(p => <option key={p}>{p}</option>)}</select></div>
              <div><div className="text-[11px] text-slate-500 mb-1">等级</div><select value={level} onChange={e => setLevel(e.target.value)} className="hairline px-2 py-1 text-[12px] w-full outline-none">{['中级工', '高级工', '技师', '高级技师', '中级', '高级', '资深'].map(l => <option key={l}>{l}</option>)}</select></div>
            </div>
            <div><div className="flex items-center justify-between text-[11px] text-slate-500 mb-1"><span>题量</span><span className="num">{n} 道</span></div><input type="range" min={10} max={80} step={5} value={n} onChange={e => setN(+e.target.value)} className="w-full accent-[var(--ai)]" /></div>
            {Q_KINDS.map(k => <div key={k} className="flex items-center gap-2 text-[11.5px]"><QTag k={k} /><input type="range" min={0} max={60} step={5} value={mix[k]} onChange={e => setMix(m => ({ ...m, [k]: +e.target.value }))} className="flex-1 accent-[var(--indigo)]" /><span className="num w-[30px] text-right">{mix[k]}%</span></div>)}
            <button className="btn btn-primary w-full" disabled={gen === 'run'} onClick={runPaper}>{gen === 'run' ? '组卷中…' : '生成试卷'}</button>
            {gen === 'run' && <div className="ai-think text-[11.5px]"><i />按能力项权重抽题，校验难度、时效与重复率…</div>}
            {gen === 'done' && pid && <div className="fade-in space-y-1.5"><div className="text-[12px]" style={{ color: 'var(--ok)' }}>✓ 已生成 {PAPERS[pid].name}（{PAPERS[pid].n} 道）</div><button className="btn btn-gold w-full" onClick={() => push({ v: 'paper', id: pid })}>查看试卷 ›</button></div>}
          </div>
        </Panel>
        <Panel title="题库健康" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3">
            <Bars title="题型分布（道）" data={Q_KINDS.map(k => ({ label: k, v: rows.filter(x => x.kind === k).length * 12 }))} />
            <div className="hair-t mt-3 pt-2 space-y-1 text-[11.5px]">
              {[['引用旧版条款', 96, 'warn'], ['区分度 < 0.2', 214, 'warn'], ['近半年零作答', 1_120, ''], ['待审核', QUESTIONS.filter(x => x.status === '待审核').length * 6, 'gold']].map(([k, v, t]) => <button key={k as string} onClick={() => toast(`已筛选：${k}`)} className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-lg"><span className={`tag tag-${t || 'ok'}`}>{k as string}</span><span className="num">{(v as number).toLocaleString()}</span></button>)}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function QuestionView({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const q = questionById(id)
  const [ai, setAi] = useState<string | null>(null)
  if (!q) return <div className="p-6 text-slate-400">题目不存在</div>
  const course = q.course ? findCourse(q.course) : undefined
  const related = QUESTIONS.filter(x => x.anchor === q.anchor && x.id !== q.id).slice(0, 4)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0 relative">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="题目" extra={<div className="flex items-center gap-2"><QTag k={q.kind} /><StatusTag s={q.status} /><span className="tag">{q.src}</span></div>}>
          <div className="p-4">
            <div className="text-[15px] font-medium leading-relaxed">{q.stem}</div>
            <div className="mt-3 space-y-1.5">
              {q.options.map((o, i) => <div key={i} className={`opt ${q.answer.includes(i) ? 'ok' : i === q.wrongOpt ? 'wrong' : ''}`}><span className="k">{String.fromCharCode(65 + i)}</span><span className="flex-1">{o}</span>{q.answer.includes(i) && <span className="tag tag-ok">答案</span>}{i === q.wrongOpt && <span className="tag tag-bad">高频错选 {Math.round((100 - q.stats.correct) * .62)}%</span>}</div>)}
            </div>
            <div className="mt-3 ai-out"><span className="text-[10.5px] text-slate-500 mr-2">解析</span>{q.analysis}</div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-[12px]">
              <div><div className="text-[11px] text-slate-500 mb-0.5">知识点</div><span className="tag tag-gold">{q.kp}</span> <span className="tag">{q.level}</span> <span className="tag">{q.post}</span></div>
              <div><div className="text-[11px] text-slate-500 mb-0.5">规程锚点</div><button className="underline text-[var(--indigo)]" onClick={() => jump('hub', 'catalog', { v: 'asset', id: q.anchor })}>{q.anchor} · {q.anchorText} ›</button></div>
            </div>
          </div>
        </Panel>
        <Panel title="质量指标" className="flex-1">
          <div className="p-4 grid grid-cols-4 gap-3">
            {[['难度', <Diff d={q.diff} key="d" />, `${q.diff} / 5`], ['区分度', q.disc.toFixed(2), q.disc >= .3 ? '良好' : q.disc >= .2 ? '一般' : '偏低，建议修订'], ['作答次数', q.stats.n.toLocaleString(), '近 12 个月'], ['正确率', q.stats.correct + '%', q.stats.correct < 60 ? '偏低' : '正常']].map(([k, v, d]) => (
              <button key={k as string} onClick={() => push({ v: 'answers', id: q.id })} className="hairline p-3 text-left hover:border-[var(--ai)]"><div className="text-[11px] text-slate-500">{k as string}</div><div className="num text-[20px] font-semibold num-grad mt-1">{v as never}</div><div className="text-[10.5px] text-slate-500 mt-1">{d as string}</div></button>
            ))}
            <div className="col-span-4 text-[11.5px] text-slate-500">点击任一指标进入三级作答分析。</div>
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 动作">
          <div className="p-2 space-y-1.5">
            {[['改写题干', '去歧义、贴近现场'], ['生成变式题', '同知识点 3 道'], ['调整难度', '按目标等级'], ['更新到新版条款', '锚点自动替换']].map(([k, d], i) => <button key={k} className={`act-btn ${i % 2 ? 'gold' : ''}`} onClick={() => setAi(k)}><span className="ic">{['改', '变', '难', '新'][i]}</span>{k}<small>{d}</small></button>)}
          </div>
        </Panel>
        {course && <Panel title="所属课程"><div className="p-3"><KindTag k={course.kind} /><div className="text-[12.5px] font-medium mt-1">{course.name}</div><button className="btn btn-sm mt-2 w-full" onClick={() => push({ v: 'course', id: course.id })}>课程详情</button></div></Panel>}
        <Panel title="同锚点题目" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1">{related.map(x => <button key={x.id} onClick={() => push({ v: 'question', id: x.id })} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px] flex items-center gap-2"><QTag k={x.kind} /><span className="truncate flex-1">{x.stem}</span><span className="text-[var(--gold)]">›</span></button>)}{related.length === 0 && <div className="text-[11.5px] text-slate-400 p-2">暂无</div>}</div>
        </Panel>
        <Panel title="状态"><div className="p-3 flex gap-2"><button className="btn btn-sm btn-primary flex-1" onClick={() => toast('已审核通过')}>审核通过</button><button className="btn btn-sm flex-1" onClick={() => toast('已停用，引用试卷自动替换')}>停用</button></div></Panel>
      </div>
      {ai && (
        <div className="ai-mask" onClick={() => setAi(null)}><div className="ai-dlg" onClick={e => e.stopPropagation()}>
          <div className="hd"><span className="w-[3px] h-[13px]" style={{ background: 'var(--gold)' }} /><span className="text-[13px] font-semibold">AI · {ai}</span><span className="text-[11px] text-slate-500">{q.id}</span><button className="ml-auto text-slate-400" onClick={() => setAi(null)}>✕</button></div>
          <div className="bd"><div className="ai-out"><Typewriter text={ai === '改写题干' ? `【改写题干】\n\n原题：${q.stem}\n\n改写：${q.post}在现场处理"${q.kp}"相关事项时，以下哪一项做法符合${q.anchorText.split('（')[0]}的要求？\n\n改动说明：把抽象表述换成现场情境，去掉"以上均可"类干扰项，选项长度对齐。` : ai === '生成变式题' ? `【变式题 · 同知识点 ${q.kp}】\n\n1. 判断题：${q.analysis.slice(0, 40)}…（　）　答案：√\n2. 单选题：下列关于"${q.kp}"的表述，错误的是（　）\n   A. ${q.analysis.slice(0, 22)}…　B. 凭经验处理即可　C. 关键项须双人核对　D. 异常先上报\n   答案：B\n3. 情景题：${q.post}发现${q.kp}相关记录与现场不一致，应当如何处理？\n   参考答案：中止、核对、上报、按规程处置。\n\n锚点：${q.anchor}` : ai === '调整难度' ? `【难度调整】\n\n当前难度 ${q.diff}/5，正确率 ${q.stats.correct}%。\n目标等级：技师 → 建议难度 4：把选项 B 改为"部分正确"的干扰项，增加一个需要结合条款判断的细节。\n目标等级：中级工 → 建议难度 2：保留核心判断，去掉细节干扰项。` : `【更新到新版条款】\n\n锚点 ${q.anchor} 对应的条款已于新版修订。\n题干与解析中的"${q.kp}"表述保持，新增新版要求一句：${q.analysis.slice(0, 36)}…\n更新后自动进入待审核，历史作答数据保留并标注版本。`} speed={7} /></div></div>
          <div className="ft"><button className="btn" onClick={() => setAi(null)}>关闭</button><button className="btn btn-primary" onClick={() => { toast(`${ai}已写入待审核`); setAi(null) }}>写入题库</button></div>
        </div></div>
      )}
    </div>
  )
}

export function AnswersView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const q = questionById(id)
  if (!q) return null
  const units = unitLabels(10).map((label, i) => ({ label, v: Math.max(30, Math.min(98, q.stats.correct + ((i * 11) % 21) - 10)) }))
  const opts = q.options.map((_, i) => ({ label: `${String.fromCharCode(65 + i)}`, v: q.answer.includes(i) ? q.stats.correct : i === q.wrongOpt ? Math.round((100 - q.stats.correct) * .62) : Math.round((100 - q.stats.correct) * .38 / Math.max(1, q.options.length - 2)), note: q.answer.includes(i) ? '答案' : undefined }))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title="选项分布（%）"><div className="p-4"><Bars data={opts} unit="%" max={100} /><div className="text-[11.5px] text-slate-500 mt-3 leading-relaxed">{q.wrongOpt !== undefined ? `错选集中在 ${String.fromCharCode(65 + q.wrongOpt)}，说明学员对"${q.kp}"的边界理解不足，建议在课件中补充对照示例。` : '判断题错误率与作答时长呈正相关，建议在课件中前置本条要求。'}</div></div></Panel>
      <Panel title="各单位正确率（%）" bodyClass="overflow-auto scroll"><div className="p-4"><Bars data={units} unit="%" max={100} /></div></Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="时间趋势"><div className="p-3 text-[12px] space-y-1">{['第 33 周', '第 34 周', '第 35 周', '第 36 周', '第 37 周'].map((w, i) => <div key={w} className="flex items-center gap-2"><span className="w-[52px] text-slate-500">{w}</span><div className="flex-1"><Progress v={Math.min(99, q.stats.correct - 8 + i * 4)} /></div><span className="num w-[34px] text-right">{Math.min(99, q.stats.correct - 8 + i * 4)}%</span></div>)}</div></Panel>
        <Panel title="动作" className="flex-1"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => toast('已生成针对性微课任务并推送到微课工作室')}>生成针对性微课</button><button className="btn w-full" onClick={() => push({ v: 'question', id })}>返回题目</button></div></Panel>
      </div>
    </div>
  )
}

export function PaperView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const p = PAPERS[id]
  if (!p) return <div className="p-6 text-slate-400">试卷不存在，请重新组卷</div>
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`${p.name}　${p.n} 道`} bodyClass="overflow-auto scroll" extra={<div className="flex gap-1.5"><button className="btn btn-sm" onClick={() => toast('已导出试卷与答案')}>导出</button><button className="btn btn-sm btn-primary" onClick={() => toast('已发布到考试系统，开考日历已更新')}>发布考试</button></div>}>
        <div className="p-4 space-y-2">
          {p.qs.map((qid, i) => { const q = questionById(qid); return q && (
            <button key={qid} onClick={() => push({ v: 'question', id: qid })} className="a-card w-full text-left row-in" style={{ animationDelay: `${Math.min(i, 15) * .04}s` }}>
              <div className="flex items-center gap-2"><span className="num text-[11px] text-slate-400 w-[22px]">{i + 1}.</span><QTag k={q.kind} /><span className="text-[12.5px] flex-1">{q.stem}</span><Diff d={q.diff} /><span className="tag tag-gold">{q.anchor}</span></div><span className="go">›</span>
            </button>) })}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="校验结果"><div className="p-3 space-y-2">{p.checks.map(c => <div key={c.k} className="flex gap-2 text-[12px]"><span className={`tag ${c.ok ? 'tag-ok' : 'tag-warn'}`}>{c.ok ? '通过' : '注意'}</span><div><div className="font-medium">{c.k}</div><div className="text-[11px] text-slate-500">{c.d}</div></div></div>)}</div></Panel>
        <Panel title="题型构成" className="flex-1"><div className="p-3"><Bars data={Q_KINDS.map(k => ({ label: k, v: p.qs.filter(x => questionById(x)?.kind === k).length }))} /><div className="text-[11.5px] text-slate-500 mt-3">平均难度 {p.diff} · 生成于 {p.created}</div></div></Panel>
      </div>
    </div>
  )
}
