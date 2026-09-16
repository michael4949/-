/* 资产目录（一级）→ 条目详情（二级）→ 引用清单 / 规程原文 / 版本对比（三级） */
import { useEffect, useMemo, useState } from 'react'
import { Panel, Progress } from '../ui'
import { UNITS, UNIT_GROUPS } from '../units'
import { ASSETS, ASSET_TREE, KINDS, KIND_CODE, REF_KINDS, assetById, unitTotal, DOCS, TOTAL_ASSETS } from './data'
import type { Asset, AssetKind, RefKind } from './data'
import { useNav, KindTag, SensTag, StatusTag, Field, Typewriter } from './nav'
import { COURSES } from '../factory/data'
import type { Route } from './nav'

type Dim = 'org' | 'pro' | 'kind' | 'post'
const POSTS = Array.from(new Set(ASSETS.map(a => a.post))).sort()

export function CatalogView({ r }: { r: Extract<Route, { v: 'catalog' }> }) {
  const { push } = useNav()
  const [dim, setDim] = useState<Dim>(r.dim ?? (r.kind ? 'kind' : r.pro ? 'pro' : r.post ? 'post' : 'org'))
  const [unit, setUnit] = useState<string>(r.unit ?? '')
  const [grp, setGrp] = useState<string>(r.unit ? (UNITS.find(u => u.name === r.unit)?.grp ?? '') : '')
  const [pro, setPro] = useState<string>(r.pro ?? '')
  const [kind, setKind] = useState<AssetKind | ''>(r.kind ?? '')
  const [post, setPost] = useState<string>(r.post ?? '')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<'use' | 'updated' | 'score'>('use')
  const [openGrp, setOpenGrp] = useState<string>(grp || '本部职能部门')
  const [openPro, setOpenPro] = useState<string>('变电专业')

  const rows = useMemo(() => {
    let list = ASSETS.filter(a =>
      (!unit || a.unit === unit) && (!kind || a.kind === kind) && (!pro || a.pro === pro.replace('专业', '')) && (!post || a.post === post) && (!status || a.status === status) &&
      (!grp || unit || a.grp === grp || a.grp === '公司通用') &&
      (!q || a.title.includes(q) || a.id.includes(q) || a.tags.some(t => t.includes(q)) || a.summary.includes(q)))
    list = [...list].sort((a, b) => sort === 'use' ? b.use - a.use : sort === 'updated' ? b.updated.localeCompare(a.updated) : a.quality.score - b.quality.score)
    return list
  }, [unit, kind, pro, post, status, grp, q, sort])
  const totalHint = unit ? unitTotal(UNITS.find(u => u.name === unit)!) : kind ? (ASSETS.length && { 规程条款: 12486, 作业步骤: 3270, 典型案例: 1842, 岗位诀窍: 996, 题目: 28450 }[kind]) : pro ? (ASSET_TREE.find(t => t.name === pro)?.n ?? rows.length * 37) : TOTAL_ASSETS
  const clearAll = () => { setUnit(''); setGrp(''); setPro(''); setKind(''); setPost(''); setStatus(''); setQ('') }
  const crumbs = [unit && unit.replace(/（.*）/, ''), !unit && grp, pro, kind, post, status].filter(Boolean) as string[]

  return (
    <div className="h-full grid grid-cols-[250px_1fr] gap-3 p-3 min-h-0">
      <Panel title="四维标签树" extra={<span className="text-[10.5px] text-slate-500">{rows.length} 条命中</span>} bodyClass="overflow-auto scroll">
        <div className="p-2">
          <div className="flex gap-1 mb-2">
            {([['org', '组织'], ['pro', '专业'], ['kind', '类型'], ['post', '岗位']] as const).map(([k, n]) => (
              <button key={k} className={`dim-tab flex-1 ${dim === k ? 'on' : ''}`} onClick={() => setDim(k)}>{n}</button>
            ))}
          </div>
          {dim === 'org' && (
            <div>
              <button className={`tree-node ${!grp && !unit ? 'on' : ''}`} onClick={() => { setGrp(''); setUnit('') }}>全公司<span className="n">{TOTAL_ASSETS.toLocaleString()}</span></button>
              {UNIT_GROUPS.map(g => {
                const us = UNITS.filter(u => u.grp === g)
                return (
                  <div key={g}>
                    <button className={`tree-node ${grp === g && !unit ? 'on' : ''}`} onClick={() => { setOpenGrp(grp === g && !unit && openGrp === g ? '' : g); setGrp(g); setUnit('') }}>
                      <span className="arrow">{openGrp === g ? '▾' : '▸'}</span>{g}<span className="n">{us.reduce((a, u) => a + unitTotal(u), 0).toLocaleString()}</span>
                    </button>
                    {openGrp === g && us.map(u => (
                      <button key={u.id} className={`tree-node pl-6 ${unit === u.name ? 'on' : ''}`} onClick={() => { setUnit(u.name); setGrp(g) }}>
                        <span className="truncate">{u.name}</span><span className="n">{unitTotal(u).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
          {dim === 'pro' && (
            <div>
              <button className={`tree-node ${!pro ? 'on' : ''}`} onClick={() => setPro('')}>全部专业与领域<span className="n">{TOTAL_ASSETS.toLocaleString()}</span></button>
              {ASSET_TREE.map(t => (
                <div key={t.name}>
                  <button className={`tree-node ${pro === t.name ? 'on' : ''}`} onClick={() => { setOpenPro(pro === t.name && openPro === t.name ? '' : t.name); setPro(t.name) }}>
                    <span className="arrow">{openPro === t.name ? '▾' : '▸'}</span>{t.name}<span className="n">{t.n.toLocaleString()}</span>
                  </button>
                  {openPro === t.name && t.children.map(c => (
                    <button key={c.name} className="tree-node pl-6" onClick={() => { setPro(t.name); setQ(c.name.slice(0, 2)) }}>{c.name}<span className="n">{c.n.toLocaleString()}</span></button>
                  ))}
                </div>
              ))}
              <div className="hair-t mt-2 pt-2 text-[10.5px] text-slate-400 px-2 mb-1">职能与直属领域</div>
              {['人力资源', '财务', '行政', '物资', '客户服务', '法律合规', '数字化', '安监', '调度', '培训评价', '基建', '电力交易', '计量', '试验检测'].map(p => (
                <button key={p} className={`tree-node ${pro === p ? 'on' : ''}`} onClick={() => setPro(p)}>{p}<span className="n">{ASSETS.filter(a => a.pro === p).length * 23}</span></button>
              ))}
            </div>
          )}
          {dim === 'kind' && KINDS.map(k => (
            <button key={k} className={`tree-node ${kind === k ? 'on' : ''}`} onClick={() => setKind(kind === k ? '' : k)}><KindTag k={k} /><span className="ml-2 num text-[10.5px] text-slate-400">{KIND_CODE[k]}-</span><span className="n">{({ 规程条款: 12486, 作业步骤: 3270, 典型案例: 1842, 岗位诀窍: 996, 题目: 28450 } as Record<AssetKind, number>)[k].toLocaleString()}</span></button>
          ))}
          {dim === 'post' && (
            <div>
              <button className={`tree-node ${!post ? 'on' : ''}`} onClick={() => setPost('')}>全部岗位<span className="n">{POSTS.length} 个</span></button>
              {POSTS.map(p => <button key={p} className={`tree-node ${post === p ? 'on' : ''}`} onClick={() => setPost(post === p ? '' : p)}>{p}<span className="n">{ASSETS.filter(a => a.post === p).length}</span></button>)}
            </div>
          )}
        </div>
      </Panel>

      <Panel title={<span>资产条目　<span className="num text-[11.5px] font-normal text-slate-500">显示 {Math.min(rows.length, 80)} / 本视图约 {Number(totalHint).toLocaleString()} 条</span></span>} extra={
        <>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜标题、编号、标签、要点" className="hairline px-2 py-1 text-[12px] w-[190px] outline-none focus:border-[var(--indigo-2)]" />
          <select value={status} onChange={e => setStatus(e.target.value)} className="hairline px-2 py-1 text-[12px] outline-none">
            <option value="">全部状态</option>{['已发布', '待审核', '待复核', '已下线'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as never)} className="hairline px-2 py-1 text-[12px] outline-none">
            <option value="use">按引用次数</option><option value="updated">按更新时间</option><option value="score">按健康度（低→高）</option>
          </select>
        </>
      } bodyClass="overflow-auto scroll">
        {crumbs.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 text-[11.5px]" style={{ background: '#fbfbf9', borderBottom: '1px solid var(--line-2)' }}>
            <span className="text-slate-500">筛选：</span>
            {crumbs.map(c => <span key={c} className="tag tag-gold">{c}</span>)}
            <button className="text-[11px] text-slate-500 underline ml-1" onClick={clearAll}>清除</button>
            
          </div>
        )}
        <table className="grid">
          <thead><tr><th>编号</th><th>类型</th><th>标题</th><th>单位 / 岗位</th><th>引用</th><th>健康度</th><th>状态</th><th>更新</th></tr></thead>
          <tbody>
            {rows.slice(0, 80).map((a, i) => (
              <tr key={a.id} onClick={() => push({ v: 'asset', id: a.id })} className="cursor-pointer row-in" style={{ animationDelay: `${Math.min(i, 20) * .025}s` }}>
                <td className="num text-slate-500 whitespace-nowrap">{a.id}</td>
                <td><KindTag k={a.kind} /></td>
                <td className="font-medium">{a.title}{a.core && <span className="ml-1.5 tag tag-gold">精选</span>}</td>
                <td className="text-slate-600 text-[11.5px] whitespace-nowrap">{a.unit.replace(/（.*）/, '')} · {a.post}</td>
                <td className="num text-slate-500">{a.use}</td>
                <td className="w-[90px]"><div className="flex items-center gap-1.5"><div className="flex-1"><Progress v={a.quality.score} /></div><span className="num text-[11px] text-slate-500">{a.quality.score}</span></div></td>
                <td><StatusTag s={a.status} /></td>
                <td className="num text-slate-400 text-[11px] whitespace-nowrap">{a.updated}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8">当前筛选下暂无条目，可清除筛选或换一个维度</td></tr>}
          </tbody>
        </table>
        {rows.length > 80 && <div className="p-3 text-[11.5px] text-slate-500 text-center hair-t">已显示前 80 条，继续缩小筛选范围或使用语义检索</div>}
      </Panel>
    </div>
  )
}

/* ---------- 二级：条目详情 ---------- */
type AiKind = 'slide' | 'quiz' | 'branch' | 'brief' | 'plain'
const AI_LABEL: Record<AiKind, string> = { slide: '课件片段', quiz: '试题', branch: '陪练分支', brief: '一句话摘要', plain: '岗位口语版' }
function aiText(k: AiKind, a: Asset): string {
  const anchor = a.anchor !== '—' ? `（${a.anchor}）` : ''
  if (k === 'slide') return `【课件片段 · ${a.title}】\n\n页 1 标题：${a.title}\n要点：\n· ${a.body[0]}\n· ${a.body[1] ?? a.summary}\n· ${a.body[2] ?? '与相关条目联动查看'}\n\n讲解词：各位同事，这一页讲${a.topic}里最容易出偏差的一个点。${a.summary}请记住出处：${a.src}${anchor}。\n\n配图建议：现场实拍或流程示意 1 张；互动：请学员说出本条要求中最容易被忽略的一项。`
  if (k === 'quiz') return `【试题 · 挂接 ${a.id}${anchor}】\n\n1. 判断题：${a.summary.replace(/。$/, '')}。（　）\n   答案：√　解析：${a.body[0]}\n\n2. 单选题：关于"${a.title}"，下列做法正确的是（　）\n   A. 凭经验直接处理　B. ${a.body[1]?.slice(0, 22) ?? a.body[0].slice(0, 22)}…　C. 先执行后补记录　D. 以上都可以\n   答案：B　解析：${a.body[1] ?? a.body[0]}\n\n3. 情景题：${a.post}在${a.topic}环节遇到与本条要求不一致的情况，应当如何处理？\n   参考答案：${a.body[2] ?? a.body[0]}\n\n难度：中　能力项：${a.topic}　建议入库：岗位认证题库 · ${a.post}`
  if (k === 'branch') return `【陪练分支 · ${a.title}】\n\n触发条件：学员在"${a.topic}"步骤中未提及"${a.tags[0]}"。\n教练台词（数字人）：等一下，这一步先别往下走。${a.summary}你再说一遍要核对哪几项？\n期望应答：${a.body[0]}\n判分规则：完整说出 → 不扣分并给出知识点卡；漏一项 → 扣 2 分，教练补充；答错 → 扣 5 分，进入示范讲解。\n知识点卡：${a.src}${anchor}\n\n建议挂接教练：${a.unit === '公司通用' || a.unit.startsWith('地市') ? '倒闸操作 · 黄志远' : a.unit.replace(/（.*）/, '') + '业务教练'}`
  if (k === 'brief') return `${a.summary}${a.anchor !== '—' ? ` 依据${a.anchor}。` : ''}`
  return `【岗位口语版 · 给${a.post}看的说法】\n\n一句话：${a.summary}\n\n怎么做：\n① ${a.body[0]}\n② ${a.body[1] ?? '按标准步骤逐项执行，关键项双人核对。'}\n③ ${a.body[2] ?? '异常先上报再处理。'}\n\n记住出处：${a.src}${anchor}`
}

export function AssetDetail({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const a = assetById(id)
  const [ai, setAi] = useState<AiKind | null>(null)
  const [phase, setPhase] = useState<'think' | 'out' | 'done'>('think')
  useEffect(() => { if (!ai) return; setPhase('think'); const t = setTimeout(() => setPhase('out'), 1100); return () => clearTimeout(t) }, [ai])
  if (!a) return <div className="p-6 text-slate-400">条目不存在</div>
  const doc = DOCS.find(d => a.src.includes(d.name))
  const refTotal = a.refs.reduce((s, r) => s + r.items.length, 0)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0 relative">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0 fade-in">
          <div className="flex items-center gap-2 mb-1.5">
            <KindTag k={a.kind} /><span className="num text-[11px] text-slate-400">{a.id}</span><StatusTag s={a.status} /><SensTag s={a.sens} />
            <span className="tag">{a.ver}</span>
            <span className="ml-auto text-[11px] text-slate-500">更新 {a.updated} · 责任人 {a.owner} · 有效期至 {a.expires}</span>
          </div>
          <div className="text-[18px] font-semibold leading-snug serif">{a.title}</div>
          <div className="text-[12.5px] text-slate-600 mt-1.5">{a.summary}</div>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[11px] text-slate-500">标签</span>{a.tags.map(t => <span key={t} className="tag tag-gold">{t}</span>)}
            <span className="text-[11px] text-slate-500 ml-2">适用</span><span className="tag">{a.unit}</span><span className="tag">{a.dept}</span><span className="tag">{a.post}</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr] gap-3">
          <Panel title="正文" bodyClass="overflow-auto scroll">
            <div className="p-4">
              <div className="gold-rule mb-3" />
              {a.body.map((p, i) => <p key={i} className="text-[13px] leading-[1.9] mb-2.5 fade-in" style={{ animationDelay: `${i * .08}s` }}><span className="num text-[11px] text-slate-400 mr-2">{i + 1}.</span>{p}</p>)}
              <div className="hair-t mt-3 pt-3 grid grid-cols-2 gap-3">
                <Field k="来源" v={a.src} />
                <Field k="规程锚点" v={a.anchor === '—' ? <span className="text-slate-400">未挂接 <button className="underline text-[var(--indigo)]" onClick={() => toast('已把挂接锚点任务派给责任人 ' + a.owner)}>发起挂接</button></span> : <button className="text-[var(--indigo)] underline" onClick={() => push({ v: 'clause', id: a.id })}>{a.anchor} · 查看原文 ›</button>} />
              </div>
              <div className="flex gap-2 mt-1">
                <button className="btn btn-sm" onClick={() => push({ v: 'clause', id: a.id })}>规程原文</button>
                <button className="btn btn-sm" onClick={() => push({ v: 'diff', id: a.id })}>版本对比</button>
                <button className="btn btn-sm" onClick={() => push({ v: 'graph', id: a.id })}>知识图谱</button>
                {doc && <button className="btn btn-sm" onClick={() => push({ v: 'doc', id: doc.id })}>所属规程 · {doc.status}</button>}
              </div>
            </div>
          </Panel>
          <div className="flex flex-col gap-3 min-h-0">
            <Panel title="AI 加工">
              <div className="p-2 grid grid-cols-2 gap-1.5">
                {(['slide', 'quiz', 'branch', 'plain', 'brief'] as AiKind[]).map((k, i) => (
                  <button key={k} className={`act-btn ${i % 2 ? 'gold' : ''}`} onClick={() => setAi(k)}>
                    <span className="ic">{['件', '题', '练', '口', '摘'][i]}</span>生成{AI_LABEL[k]}
                    <small>{['课程工厂', '题库', '陪练', '助手', '检索'][i]}</small>
                  </button>
                ))}
                <button className="act-btn" onClick={() => jump('ask', 'chat')}><span className="ic" style={{ background: '#6a86b8' }}>问</span>去问数助手提问<small>带出处</small></button>
              </div>
            </Panel>
            <Panel title="版本历史" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'diff', id: a.id })}>对比 ›</button>}>
              <div className="p-3">
                {a.history.map((h, i) => (
                  <div key={h.ver} className="flex gap-2.5 pb-3 relative">
                    <div className="shrink-0 relative"><span className="w-4 h-4 flex items-center justify-center text-[9px] text-white num" style={{ background: i === 0 ? 'var(--gold)' : '#b8c2d0' }}>{h.ver.slice(1)}</span>
                      {i < a.history.length - 1 && <span className="absolute left-1/2 top-4 bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div>
                    <div className="min-w-0"><div className="text-[12px] font-medium">{h.ver} <span className="num text-[10.5px] text-slate-400 ml-1">{h.date}</span> <span className="text-[10.5px] text-slate-500">· {h.by}</span></div><div className="text-[11px] text-slate-500 leading-snug">{h.note}</div></div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`引用关系　共 ${refTotal} 处`}>
          <div className="p-2 space-y-1.5">
            {a.refs.map(r => (
              <button key={r.kind} onClick={() => push({ v: 'refs', id: a.id, kind: r.kind })} className="w-full flex items-center gap-2 hairline px-2.5 py-2 hover:border-[var(--indigo-2)] hover:bg-slate-50 text-[12px]">
                <span className="w-[54px] text-left text-slate-600">{r.kind}</span>
                <div className="flex-1"><Progress v={Math.min(100, r.items.length * 9)} /></div>
                <span className="num w-[26px] text-right font-semibold" style={{ color: 'var(--indigo)' }}>{r.items.length}</span><span className="text-[var(--gold)]">›</span>
              </button>
            ))}
            <div className="text-[10.5px] text-slate-400 px-1 pt-1">本条修订后，以上 {refTotal} 处引用自动进入复核队列。</div>
          </div>
        </Panel>
        <Panel title="相关资产">
          <div className="p-2 space-y-1">
            {a.rel.map(id => assetById(id)).filter(Boolean).map(x => (
              <button key={x!.id} onClick={() => push({ v: 'asset', id: x!.id })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50">
                <KindTag k={x!.kind} /><span className="text-[12px] truncate flex-1">{x!.title}</span><span className="text-[var(--gold)]">›</span>
              </button>
            ))}
            {a.rel.length === 0 && <div className="text-[11.5px] text-slate-400 px-2 py-2">暂无关联，可在知识图谱中查看语义近邻</div>}
          </div>
        </Panel>
        <Panel title="质量" className="flex-1">
          <div className="p-3">
            <div className="flex items-end gap-3 mb-2"><span className="num text-[30px] leading-none font-semibold" style={{ color: a.quality.score >= 85 ? 'var(--ok)' : a.quality.score >= 70 ? 'var(--warn)' : 'var(--bad)' }}>{a.quality.score}</span><span className="text-[11px] text-slate-500 mb-1">健康度</span></div>
            {a.quality.issues.length === 0 ? <div className="text-[11.5px]" style={{ color: 'var(--ok)' }}>✓ 无待处理问题</div> : a.quality.issues.map(i => <div key={i} className="text-[11.5px] flex items-center gap-1.5 mb-1"><span className="w-1.5 h-1.5" style={{ background: 'var(--warn)' }} />{i}</div>)}
            <div className="flex gap-2 mt-3">
              <button className="btn btn-sm btn-primary flex-1" onClick={() => toast(`${a.id} 已标记复核通过，有效期顺延 12 个月`)}>复核通过</button>
              <button className="btn btn-sm flex-1" onClick={() => push({ v: 'quality' })}>质量看板</button>
            </div>
          </div>
        </Panel>
      </div>

      {ai && (
        <div className="ai-mask" onClick={() => setAi(null)}>
          <div className="ai-dlg" onClick={e => e.stopPropagation()}>
            <div className="hd"><span className="w-[3px] h-[13px]" style={{ background: 'var(--gold)' }} /><span className="text-[13px] font-semibold">AI 生成 · {AI_LABEL[ai]}</span><span className="text-[11px] text-slate-500">基于 {a.id} 与其规程锚点</span><button className="ml-auto text-slate-400 hover:text-slate-600" onClick={() => setAi(null)}>✕</button></div>
            <div className="bd">
              {phase === 'think' ? (
                <div>{['读取条目正文与锚点条款…', '检索同主题的相关资产与案例…', `按${a.post}的岗位语境组织表述…`].map((s, i) => <div key={s} className="ai-think"><i style={{ animationDelay: `${i * .25}s` }} />{s}</div>)}</div>
              ) : (
                <div className="ai-out"><Typewriter text={aiText(ai, a)} speed={8} onDone={() => setPhase('done')} /></div>
              )}
            </div>
            <div className="ft">
              <button className="btn" onClick={() => setAi(null)}>关闭</button>
              {phase === 'done' && <>
                <button className="btn" onClick={() => { toast('已复制到剪贴板'); }}>复制</button>
                {ai === 'slide' && <button className="btn btn-primary" onClick={() => { toast('已推送到课程工厂 · 课件生成工作台'); jump('factory', 'gen') }}>推送到课程工厂</button>}
                {ai === 'quiz' && <button className="btn btn-primary" onClick={() => { toast('3 道题已写入题库待审核队列'); jump('factory', 'bank') }}>写入题库</button>}
                {ai === 'branch' && <button className="btn btn-primary" onClick={() => { toast('分支已推送到教练编辑器'); jump('coach', 'editor') }}>推送到教练编辑器</button>}
                {(ai === 'brief' || ai === 'plain') && <button className="btn btn-primary" onClick={() => { toast('已更新到助手条目'); setAi(null) }}>更新助手条目</button>}
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- 三级：引用清单 ---------- */
export function RefsView({ id, kind }: { id: string; kind: RefKind }) {
  const { toast, jump, back, replace } = useNav()
  const a = assetById(id)
  if (!a) return null
  const list = a.refs.find(r => r.kind === kind)?.items ?? []
  const target = kind === '课件' ? ['factory', 'lib'] : kind === '题目' ? ['factory', 'bank'] : kind === '陪练剧本' ? ['coach', 'plaza'] : ['ask', 'chat']
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`${kind}引用清单　${list.length} 处`} extra={<div className="flex gap-1">{REF_KINDS.map(k => <button key={k} className={`dim-tab ${k === kind ? 'on' : ''}`} onClick={() => { if (k !== kind) replace({ v: 'refs', id, kind: k }) }}>{k}</button>)}</div>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>编号</th><th>名称</th><th>引用位置</th><th>最近同步</th><th>状态</th><th></th></tr></thead>
          <tbody>{list.map((x, i) => (
            <tr key={x.id + i} className="row-in" style={{ animationDelay: `${i * .04}s` }}>
              <td className="num text-slate-500">{x.id}</td><td className="font-medium">{x.name}</td><td className="text-slate-600">{x.where}</td>
              <td className="num text-slate-400 text-[11px]">{x.when}</td>
              <td><StatusTag s={x.when >= a.updated ? '已同步' : '待复核'} /></td>
              <td><button className="btn btn-sm" onClick={() => { toast(`打开 ${x.name}`); if (kind === '课件') { const cc = COURSES.find(k => k.src.includes(a.id)) ?? COURSES.find(k => k.unit === a.unit); cc ? jump('factory', 'lib', { v: 'course', id: cc.id }) : jump('factory', 'lib') } else jump(target[0], target[1]) }}>打开</button></td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3">
        <Panel title="被引用条目">
          <div className="p-3"><div className="flex items-center gap-2 mb-1"><KindTag k={a.kind} /><span className="num text-[11px] text-slate-400">{a.id}</span></div><div className="text-[13px] font-semibold leading-snug">{a.title}</div><div className="text-[11.5px] text-slate-500 mt-1">{a.src}</div>
            <button className="btn btn-sm mt-2" onClick={() => back()}>返回条目详情</button></div>
        </Panel>
        <Panel title="同步动作" className="flex-1">
          <div className="p-3 space-y-2">
            <div className="text-[11.5px] text-slate-600 leading-relaxed">本条目 {a.updated} 更新到 {a.ver}，以上 {kind} 中 {list.filter(x => x.when < a.updated).length} 处早于该版本，建议批量复核。</div>
            <button className="btn btn-primary w-full" onClick={() => toast(`已生成 ${kind} 复核任务 ${list.length} 项，派发至责任人`)}>批量生成复核任务</button>
            <button className="btn w-full" onClick={() => toast('已导出引用清单')}>导出清单</button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：规程原文 ---------- */
export function ClauseView({ id }: { id: string }) {
  const { push, back } = useNav()
  const a = assetById(id)
  if (!a) return null
  const doc = DOCS.find(d => a.src.includes(d.name))
  const docName = doc?.name ?? a.src.split(' ')[0].replace(/[《》]/g, '')
  const clauses = doc ? doc.clauses.map(c => ({ no: c.no, title: c.title, text: c.now ?? c.old ?? `${c.title}的相关规定。`, hit: a.anchor.includes(c.no) || c.no.includes(a.anchor.replace(/细则|办法|规范|规定/g, '').trim()) })) :
    [{ no: '总则', title: '目的与适用范围', text: `为规范${a.topic}相关工作，依据公司相关规定制定本文件，适用于${a.unit.replace(/（.*）/, '')}及相关岗位。`, hit: false },
     { no: a.anchor === '—' ? '相关条款' : a.anchor, title: a.title, text: a.body.join(' '), hit: true },
     { no: '附则', title: '解释与生效', text: `本文件由${a.owner}负责解释，自发布之日起施行。`, hit: false }]
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`《${docName}》${doc ? ` · ${doc.ver}` : ''}`} extra={doc && <StatusTag s={doc.status} />} bodyClass="overflow-auto scroll">
        <div className="p-4">
          {clauses.map((c, i) => (
            <div key={c.no + i} className={`clause row-in ${c.hit ? 'hit' : ''}`} style={{ animationDelay: `${i * .06}s` }}>
              <div className="flex items-center gap-2 mb-1"><span className="no">{c.no}</span><span className="text-[12.5px] font-medium">{c.title}</span>{c.hit && <span className="tag tag-gold ml-auto">本条目锚点</span>}</div>
              <div className="text-[12.5px] leading-[1.85] text-slate-700">{c.text}</div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="flex flex-col gap-3">
        <Panel title="锚点条目"><div className="p-3"><div className="flex items-center gap-2 mb-1"><KindTag k={a.kind} /><span className="num text-[11px] text-slate-400">{a.id}</span></div><div className="text-[13px] font-semibold leading-snug">{a.title}</div><button className="btn btn-sm mt-2" onClick={() => back()}>返回条目详情</button></div></Panel>
        {doc && <Panel title="该规程的版本" className="flex-1"><div className="p-3 text-[12px] space-y-1.5">
          <div className="flex justify-between"><span className="text-slate-500">当前</span><span>{doc.ver}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">上一版</span><span>{doc.prev}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">生效</span><span className="num">{doc.effective}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">条款变化</span><span>{doc.clauses.filter(c => c.change !== '不变').length} 处</span></div>
          <button className="btn btn-primary btn-sm w-full mt-2" onClick={() => push({ v: 'doc', id: doc.id })}>查看版本与影响分析</button></div></Panel>}
      </div>
    </div>
  )
}

/* ---------- 三级：版本对比 ---------- */
function olderBody(a: Asset): string[] {
  return a.body.map((p, i) => i === 0 ? p.replace(/四项/g, '两项').replace(/30 分钟/g, '60 分钟').replace(/五类/g, '四类').replace(/再次核实/g, '核对').replace(/两个及以上/g, '两个') : p).slice(0, Math.max(1, a.body.length - 1))
}
function diffWords(oldS: string, newS: string) {
  const o = oldS.split(/(?<=[，。；：、])/), n = newS.split(/(?<=[，。；：、])/)
  return n.map((seg, i) => ({ seg, changed: o[i] !== seg }))
}
export function DiffView({ id }: { id: string }) {
  const { push, toast, back } = useNav()
  const a = assetById(id)
  const [pair, setPair] = useState<[number, number]>([1, 0])
  if (!a) return null
  const vers = a.history
  const oldB = olderBody(a), newB = a.body
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="panel px-4 py-2.5 flex items-center gap-3 shrink-0">
        <KindTag k={a.kind} /><span className="text-[13px] font-semibold">{a.title}</span>
        <span className="ml-auto text-[11.5px] text-slate-500">对比</span>
        <select value={pair[0]} onChange={e => setPair([+e.target.value, pair[1]])} className="hairline px-2 py-1 text-[12px]">{vers.map((v, i) => <option key={v.ver} value={i}>{v.ver} · {v.date}</option>)}</select>
        <span className="text-slate-400">→</span>
        <select value={pair[1]} onChange={e => setPair([pair[0], +e.target.value])} className="hairline px-2 py-1 text-[12px]">{vers.map((v, i) => <option key={v.ver} value={i}>{v.ver} · {v.date}</option>)}</select>
        <button className="btn btn-sm" onClick={() => back()}>返回详情</button>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_300px] gap-3">
        <Panel title={`${vers[Math.min(pair[0], vers.length - 1)]?.ver ?? '旧版'}　旧版`} bodyClass="overflow-auto scroll">
          <div className="p-4">{oldB.map((p, i) => <p key={i} className="text-[12.5px] leading-[1.9] mb-2.5"><span className="num text-[11px] text-slate-400 mr-2">{i + 1}.</span>{diffWords(newB[i] ?? '', p).map((d, j) => <span key={j} className={d.changed ? 'diff-old' : ''}>{d.seg}</span>)}</p>)}
            {newB.length > oldB.length && <p className="text-[11.5px] text-slate-400">（本段在新版中新增）</p>}</div>
        </Panel>
        <Panel title={`${vers[Math.min(pair[1], vers.length - 1)]?.ver ?? '新版'}　新版`} bodyClass="overflow-auto scroll">
          <div className="p-4">{newB.map((p, i) => <p key={i} className="text-[12.5px] leading-[1.9] mb-2.5"><span className="num text-[11px] text-slate-400 mr-2">{i + 1}.</span>{i >= oldB.length ? <span className="diff-new">{p}</span> : diffWords(oldB[i] ?? '', p).map((d, j) => <span key={j} className={d.changed ? 'diff-new' : ''}>{d.seg}</span>)}</p>)}</div>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="变更摘要">
            <div className="p-3 text-[12px] space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">变更段落</span><span className="num">{newB.filter((p, i) => oldB[i] !== p).length} 段</span></div>
              <div className="flex justify-between"><span className="text-slate-500">新增段落</span><span className="num">{Math.max(0, newB.length - oldB.length)} 段</span></div>
              <div className="flex justify-between"><span className="text-slate-500">受影响引用</span><span className="num">{a.refs.reduce((s, r) => s + r.items.length, 0)} 处</span></div>
              <div className="text-[11.5px] text-slate-500 leading-relaxed pt-1 hair-t">{vers[0]?.note}</div>
            </div>
          </Panel>
          <Panel title="动作" className="flex-1">
            <div className="p-3 space-y-2">
              <button className="btn btn-primary w-full" onClick={() => toast('已把变更摘要推送给全部引用方')}>推送变更摘要到引用方</button>
              <button className="btn w-full" onClick={() => toast(`已回滚到 ${vers[1]?.ver ?? '上一版'}，本操作已记入审计日志`)}>回滚到上一版</button>
              <button className="btn w-full" onClick={() => push({ v: 'refs', id, kind: '题目' })}>查看题目引用清单</button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
