/* 智能入库流水线（一级）→ 批次审核（二级）→ 条目审核（三级） */
import { useEffect, useState } from 'react'
import { Panel, Progress } from '../ui'
import { SOURCES, BATCHES, PIPE_STAGES, batchById, assetById } from './data'
import type { BatchItem } from './data'
import { useNav, KindTag, StatusTag, Field } from './nav'

function Pipe({ stage, counts }: { stage: number; counts?: number[] }) {
  return (
    <div className="pipe">
      {PIPE_STAGES.map((s, i) => (
        <div key={s} className={`st ${i < stage ? 'done' : i === stage ? 'cur' : ''}`}>
          <div className="dot">{i < stage ? '✓' : i + 1}</div>
          <div className="nm">{s}</div>
          {counts && <div className="ct num">{counts[i]}</div>}
        </div>
      ))}
    </div>
  )
}

export function IngestView() {
  const { push, toast } = useNav()
  const [src, setSrc] = useState(SOURCES[5])
  const [run, setRun] = useState(-1)
  const [file, setFile] = useState('')
  useEffect(() => {
    if (run < 0 || run >= PIPE_STAGES.length) return
    const t = setTimeout(() => setRun(r => r + 1), 620)
    return () => clearTimeout(t)
  }, [run])
  const done = run >= PIPE_STAGES.length
  return (
    <div className="h-full grid grid-cols-[280px_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="入库来源" extra={<span className="text-[10.5px] text-slate-500">本月</span>} bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1.5">
            {SOURCES.map(s => (
              <button key={s.id} onClick={() => setSrc(s)} className="a-card w-full text-left" style={src.id === s.id ? { borderColor: 'var(--indigo)', background: '#fafcff' } : {}}>
                <div className="flex items-center gap-2"><span className="text-[12.5px] font-semibold">{s.name}</span><span className={`tag ${s.auto ? 'tag-ok' : ''} ml-auto`}>{s.auto ? '自动' : '人工'}</span></div>
                <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{s.desc}</div>
                <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-400"><span>{s.kind}</span><span>·</span><span>{s.units}</span><span className="ml-auto num text-[12px] font-semibold" style={{ color: 'var(--gold)' }}>{s.month}</span></div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`新建入库 · ${src.name}`} extra={<span className="text-[10.5px] text-slate-500">解析 → 切分 → 抽取 → 打标 → 去重 → 审核 → 发布</span>}>
          <div className="p-3">
            <div className="flex gap-2 mb-3">
              <input value={file} onChange={e => setFile(e.target.value)} placeholder={src.kind === '音频' ? '选择访谈录音文件…' : src.kind === '工单' ? '选择工单导出范围…' : '拖入文档或粘贴制度库链接…'} className="hairline flex-1 px-3 py-1.5 text-[12.5px] outline-none focus:border-[var(--indigo-2)]" />
              <select className="hairline px-2 text-[12px]"><option>责任单位：{src.units}</option></select>
              <button className="btn btn-primary" disabled={run >= 0 && !done} onClick={() => { setRun(0); if (!file) setFile(src.kind === '音频' ? '陆峰访谈_第2轮_20260924.m4a' : src.kind === '工单' ? '95598 工单 · 2026-09 第 2 周' : '数字化部_智能体开发与运营规范_V1.2.docx') }}>{done ? '再次入库' : run >= 0 ? '流水线运行中…' : '开始入库'}</button>
            </div>
            <Pipe stage={run < 0 ? -1 : run} counts={run >= 0 ? [1, 46, 38, 38, 35, done ? 35 : 0, done ? 31 : 0].map((c, i) => i < run ? c : 0) : undefined} />
            {done && (
              <div className="fade-in hair-t mt-3 pt-3 grid grid-cols-4 gap-2">
                {[['解析段落', '46'], ['抽取条目', '38'], ['疑似重复拦截', '3'], ['进入审核', '35']].map(([k, v]) => (
                  <div key={k} className="hairline py-2 text-center"><div className="num text-[19px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>
                ))}
                <div className="col-span-4 flex gap-2"><button className="btn btn-primary btn-sm" onClick={() => push({ v: 'batch', id: 'b2' })}>进入批次审核</button><button className="btn btn-sm" onClick={() => toast('已通知责任单位审核人')}>通知审核人</button></div>
              </div>
            )}
          </div>
        </Panel>
        <Panel title="入库批次" className="flex-1" bodyClass="overflow-auto scroll">
          <table className="grid">
            <thead><tr><th>批次</th><th>来源</th><th>责任单位</th><th>条目</th><th>阶段</th><th>状态</th><th>时间</th></tr></thead>
            <tbody>{BATCHES.map((b, i) => (
              <tr key={b.id} className="cursor-pointer row-in" style={{ animationDelay: `${i * .04}s` }} onClick={() => push({ v: 'batch', id: b.id })}>
                <td className="font-medium">{b.name}</td><td className="text-slate-600 text-[11.5px]">{SOURCES.find(s => s.id === b.src)?.name}</td>
                <td className="text-slate-600 text-[11.5px]">{b.unit}</td><td className="num">{b.n}</td>
                <td className="w-[120px]"><div className="flex items-center gap-1.5"><div className="flex-1"><Progress v={(b.stage + 1) / 7 * 100} /></div><span className="text-[10.5px] text-slate-500 whitespace-nowrap">{PIPE_STAGES[b.stage]}</span></div></td>
                <td><StatusTag s={b.st} /></td><td className="num text-[11px] text-slate-400 whitespace-nowrap">{b.time}</td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="流水线统计　本月">
          <div className="p-3 grid grid-cols-2 gap-2">
            {[['入库条目', '1,203'], ['自动通过率', '71.4%'], ['平均耗时', '3.8 min'], ['重复拦截', '152']].map(([k, v], i) => (
              <div key={k} className="hairline py-2 text-center"><div className="num text-[17px] font-semibold" style={{ color: i % 2 ? 'var(--gold)' : 'var(--indigo)' }}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>
            ))}
          </div>
        </Panel>
        <Panel title="待审核队列" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1">
            {BATCHES.flatMap(b => b.items.filter(i => i.st === '待审').map(i => ({ b, i }))).map(({ b, i }) => (
              <button key={i.id} onClick={() => push({ v: 'item', batch: b.id, id: i.id })} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 hairline">
                <div className="flex items-center gap-1.5"><KindTag k={i.kind} /><span className="num text-[10.5px] text-slate-400 ml-auto">置信 {Math.round(i.conf * 100)}%</span></div>
                <div className="text-[11.5px] leading-snug mt-0.5 truncate">{i.title}</div>
                <div className="text-[10.5px] text-slate-400">{b.unit}</div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function BatchView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const b = batchById(id)
  const [items, setItems] = useState<BatchItem[]>(b?.items ?? [])
  if (!b) return null
  const set = (iid: string, st: BatchItem['st']) => { setItems(it => it.map(x => x.id === iid ? { ...x, st } : x)); toast(`${iid} 已${st}`) }
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="panel p-4 shrink-0">
        <div className="flex items-center gap-2 mb-2"><span className="text-[15px] font-semibold">{b.name}</span><StatusTag s={b.st} /><span className="text-[11.5px] text-slate-500 ml-auto">{SOURCES.find(s => s.id === b.src)?.name} · {b.unit} · {b.time} · 共 {b.n} 条（本页展示代表性条目）</span></div>
        <Pipe stage={b.stage} counts={[1, b.n + 12, b.n, b.n, b.n - 3, b.stage >= 5 ? b.n - 3 : 0, b.stage >= 6 ? b.n - 3 : 0]} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_300px] gap-3">
        <Panel title={`抽取条目　${items.length} 条`} extra={<div className="flex gap-1.5"><button className="btn btn-sm btn-primary" onClick={() => { setItems(it => it.map(x => x.st === '待审' ? { ...x, st: '通过' } : x)); toast('已全部通过并进入发布队列') }}>全部通过</button><button className="btn btn-sm" onClick={() => toast('已导出审核清单')}>导出</button></div>} bodyClass="overflow-auto scroll">
          <table className="grid">
            <thead><tr><th>类型</th><th>抽取标题</th><th>适用</th><th>置信度</th><th>疑似重复</th><th>状态</th><th>动作</th></tr></thead>
            <tbody>{items.map((it, i) => (
              <tr key={it.id} className="row-in" style={{ animationDelay: `${i * .05}s` }}>
                <td><KindTag k={it.kind} /></td>
                <td><button className="font-medium text-left hover:text-[var(--indigo)]" onClick={() => push({ v: 'item', batch: b.id, id: it.id })}>{it.title} <span className="text-[var(--gold)]">›</span></button><div className="flex gap-1 mt-1">{it.tags.map(t => <span key={t} className="tag">{t}</span>)}</div></td>
                <td className="text-[11.5px] text-slate-600">{it.unit.replace(/（.*）/, '')}<br />{it.post}</td>
                <td><span className="conf"><i style={{ width: `${it.conf * 100}%`, background: it.conf > .9 ? 'var(--ok)' : it.conf > .8 ? 'var(--indigo-2)' : 'var(--warn)' }} /></span><span className="num text-[11px] ml-1.5">{Math.round(it.conf * 100)}%</span></td>
                <td>{it.dup ? <button className="tag tag-warn" onClick={() => push({ v: 'asset', id: it.dup! })}>{it.dup} ›</button> : <span className="text-slate-300">—</span>}</td>
                <td><StatusTag s={it.st} /></td>
                <td className="whitespace-nowrap">{it.st === '待审' ? <span className="flex gap-1"><button className="btn btn-sm" onClick={() => set(it.id, '通过')}>通过</button>{it.dup && <button className="btn btn-sm" onClick={() => set(it.id, '合并')}>合并</button>}<button className="btn btn-sm" onClick={() => set(it.id, '退回')}>退回</button></span> : <span className="text-[11px] text-slate-400">已处理</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="批次画像">
            <div className="p-3 text-[12px] space-y-1.5">
              {[['自动打标准确率', '93%'], ['平均置信度', `${Math.round(items.reduce((s, x) => s + x.conf, 0) / items.length * 100)}%`], ['疑似重复', `${items.filter(x => x.dup).length} 条`], ['待审', `${items.filter(x => x.st === '待审').length} 条`]].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="num font-medium">{v}</span></div>)}
            </div>
          </Panel>
          <Panel title="发布去向" className="flex-1">
            <div className="p-3 text-[11.5px] text-slate-600 leading-relaxed space-y-2">
              <div>通过的条目发布后自动：写入资产目录并挂接规程锚点；推送到问数助手更新回答；题目类进入题库待审核；含"建议关联陪练"标记的推送到教练编辑器。</div>
              <button className="btn btn-primary w-full" disabled={items.some(x => x.st === '待审')} onClick={() => toast('批次已发布，下游 4 类引用已更新')}>发布本批次</button>
              <button className="btn w-full" onClick={() => push({ v: 'ingest' })}>返回流水线</button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export function ItemView({ batch, id }: { batch: string; id: string }) {
  const { push, toast, back } = useNav()
  const b = batchById(batch)
  const it = b?.items.find(x => x.id === id)
  const [title, setTitle] = useState(it?.title ?? '')
  const [tags, setTags] = useState(it?.tags.join('、') ?? '')
  if (!b || !it) return null
  const dup = it.dup ? assetById(it.dup) : null
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title="原文片段" extra={<span className="text-[10.5px] text-slate-500">{b.name}</span>} bodyClass="overflow-auto scroll">
        <div className="p-4">
          <div className="text-[13px] leading-[1.95] p-3" style={{ background: '#fffdf6', borderLeft: '3px solid var(--gold)' }}>{it.excerpt}</div>
          <div className="text-[11px] text-slate-400 mt-2">来源：{SOURCES.find(s => s.id === b.src)?.name} · {b.time}</div>
          {b.src === 's3' && <div className="mt-3 hair-t pt-3"><div className="text-[11px] text-slate-500 mb-1.5">录音片段</div><div className="flex items-center gap-2"><button className="btn btn-sm">▶ 播放 00:12:40</button><div className="flex-1 h-[22px] flex items-end gap-[2px]">{Array.from({ length: 48 }).map((_, i) => <span key={i} className="flex-1" style={{ height: `${30 + Math.abs(Math.sin(i * 1.3)) * 70}%`, background: i < 18 ? 'var(--indigo-2)' : '#d5dce6' }} />)}</div></div></div>}
        </div>
      </Panel>
      <Panel title="AI 抽取结果　可修改后入库" bodyClass="overflow-auto scroll">
        <div className="p-4">
          <Field k="类型" v={<div className="flex items-center gap-2"><KindTag k={it.kind} /><span className="text-[11px] text-slate-500">置信度 {Math.round(it.conf * 100)}%</span></div>} />
          <div className="mb-2.5"><div className="text-[11px] text-slate-500 mb-0.5">标题</div><input value={title} onChange={e => setTitle(e.target.value)} className="hairline w-full px-2 py-1.5 text-[12.5px] outline-none focus:border-[var(--indigo-2)]" /></div>
          <div className="mb-2.5"><div className="text-[11px] text-slate-500 mb-0.5">标签</div><input value={tags} onChange={e => setTags(e.target.value)} className="hairline w-full px-2 py-1.5 text-[12.5px] outline-none focus:border-[var(--indigo-2)]" /></div>
          <Field k="适用单位 / 岗位" v={`${it.unit} · ${it.post}`} />
          <div className="text-[11px] text-slate-500 mb-1">抽取说明</div>
          {it.extract.map(x => <div key={x} className="text-[12px] flex items-start gap-1.5 mb-1"><span className="w-1.5 h-1.5 mt-[6px] shrink-0" style={{ background: 'var(--indigo-2)' }} />{x}</div>)}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={dup ? '疑似重复 · 现有条目' : '重复检查'}>
          <div className="p-3">
            {dup ? <>
              <div className="flex items-center gap-2 mb-1"><KindTag k={dup.kind} /><span className="num text-[11px] text-slate-400">{dup.id}</span></div>
              <div className="text-[12.5px] font-medium leading-snug">{dup.title}</div>
              <div className="text-[11px] text-slate-500 mt-1">{dup.src} · 引用 {dup.use}</div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--warn)' }}>语义相似度 0.9{(it.conf * 10).toFixed(0).slice(-1)}，建议合并或建立引用</div>
              <button className="btn btn-sm mt-2 w-full" onClick={() => push({ v: 'asset', id: dup.id })}>查看现有条目</button>
            </> : <div className="text-[12px]" style={{ color: 'var(--ok)' }}>✓ 未发现相似度高于 0.92 的条目</div>}
          </div>
        </Panel>
        <Panel title="审核动作" className="flex-1">
          <div className="p-3 space-y-2">
            <button className="btn btn-primary w-full" onClick={() => { toast(`${it.id} 已通过并进入发布队列`); back() }}>通过并发布</button>
            {dup && <button className="btn w-full" onClick={() => { toast(`已合并到 ${dup.id}，作为其新版本待复核`); back() }}>合并到 {dup.id}</button>}
            <button className="btn w-full" onClick={() => { toast('已退回来源单位补充'); back() }}>退回补充</button>
            <div className="text-[10.5px] text-slate-400 leading-relaxed pt-1">审核记录写入审计日志；通过后由责任单位复核人二次确认。</div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
