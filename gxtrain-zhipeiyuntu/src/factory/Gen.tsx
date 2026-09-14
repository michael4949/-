/* 课件生成工作台（一级）→ 生成结果（二级）→ 章节页 / 产出预览（三级） */
import { useEffect, useMemo, useState } from 'react'
import { Panel, Progress } from '../ui'
import { UNITS, UNIT_GROUPS } from '../units'
import { ASSETS } from '../hub/data'
import { buildDraft, OUTPUTS, lectureText, taskbookText, slidesFor, QUESTIONS, COACH_FOR } from './data'
import type { Course, CourseKind, OutputKind, Chapter } from './data'
import { addDraft, findCourse, submitDraft, DRAFTS } from './store'
import { useNav, KindTag, Typewriter, StatusTag, QTag, Field } from './nav'
import { KindTag as AssetKindTag } from '../hub/nav'

const STEPS = [['解析原料', '拆分条款、步骤、案例与诀窍，建立引用锚点'], ['匹配能力项', '对齐岗位能力矩阵与评估表场景'], ['生成大纲', '按课时切分章节，排布知识点'], ['生成讲义与课件', '每章讲义、课件页与讲解词'], ['生成微课脚本', '分镜、口播与画面提示'], ['生成实训任务书与试题', '任务、评分要点与配套试题'], ['自检与校审清单', '术语、时效、敏感信息、答案一致性']]
let seq = 0

export function GenView() {
  const { push, toast } = useNav()
  const [unit, setUnit] = useState('人力资源部')
  const u = UNITS.find(x => x.name === unit)!
  const posts = useMemo(() => Array.from(new Set(u.depts.flatMap(d => d.posts))), [u])
  const [post, setPost] = useState(posts[0])
  useEffect(() => { setPost(posts[0]) }, [posts])
  const [hours, setHours] = useState(4)
  const [kind, setKind] = useState<CourseKind>('专题课')
  const [outs, setOuts] = useState<OutputKind[]>([...OUTPUTS])
  const [q, setQ] = useState('')
  const pool = useMemo(() => ASSETS.filter(a => a.unit === unit || a.unit === '公司通用').filter(a => !q || a.title.includes(q)).sort((a, b) => (b.post === post ? 1 : 0) - (a.post === post ? 1 : 0) || b.use - a.use).slice(0, 14), [unit, post, q])
  const [sel, setSel] = useState<string[]>([])
  useEffect(() => { setSel(pool.filter(a => a.post === post).slice(0, 5).map(a => a.id)) }, [pool, post])
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle')
  const [step, setStep] = useState(-1)
  const [log, setLog] = useState<string[]>([])
  const [key, setKey] = useState('')
  useEffect(() => {
    if (phase !== 'run') return
    if (step >= STEPS.length) { const t = setTimeout(() => setPhase('done'), 300); return () => clearTimeout(t) }
    const t = setTimeout(() => {
      const c = DRAFTS[key]
      const lines = [`已解析 ${sel.length} 条原料，抽取条款 ${sel.length * 3} 处、案例 ${Math.max(1, Math.round(sel.length / 2))} 个`, `匹配 ${post} 能力项 ${6 + sel.length} 项，评估表场景「${u.scenes.find(s => s.post === post)?.name ?? u.top}」`, `大纲 ${c?.chapters.length ?? 5} 章，合计 ${hours} 学时`, `讲义 ${c?.outputs.讲义 ?? 0} 页 · 课件 ${c?.outputs.课件 ?? 0} 页，讲解词已生成`, `微课脚本 ${c?.chapters.length ?? 5} 段，建议数字人讲师：${c ? COACH_FOR(c).n.split(' · ')[1] ?? '黄志远' : '黄志远'}`, `实训任务书 ${c?.outputs.实训任务书 ?? 1} 份 · 试题 ${c?.outputs.配套试题 ?? 0} 道`, `自检 ${3 + (sel.length % 3)} 处待确认：术语 1 · 时效 1 · 敏感信息 ${sel.length % 2}`]
      setLog(l => [...l, lines[step] ?? '']); setStep(s => s + 1)
    }, 560)
    return () => clearTimeout(t)
  }, [phase, step, key, sel, post, hours, u])
  const start = () => {
    const k = `d${++seq}`
    addDraft(k, buildDraft({ unit, post, hours, kind, materials: sel, outputs: outs }))
    setKey(k); setLog([]); setStep(0); setPhase('run')
  }
  const draft = key ? DRAFTS[key] : null
  return (
    <div className="h-full grid grid-cols-[360px_1fr] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="第一步　设定对象" extra={<span className="ai-badge">AI 推荐原料</span>}>
          <div className="p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-[11px] text-slate-500 mb-1">单位</div>
                <select value={unit} onChange={e => setUnit(e.target.value)} className="hairline px-2 py-1.5 text-[12px] w-full outline-none">
                  {UNIT_GROUPS.map(g => <optgroup key={g} label={g}>{UNITS.filter(x => x.grp === g).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}</optgroup>)}
                </select></div>
              <div><div className="text-[11px] text-slate-500 mb-1">岗位</div>
                <select value={post} onChange={e => setPost(e.target.value)} className="hairline px-2 py-1.5 text-[12px] w-full outline-none">{posts.map(p => <option key={p}>{p}</option>)}</select></div>
              <div><div className="text-[11px] text-slate-500 mb-1">课时</div>
                <select value={hours} onChange={e => setHours(+e.target.value)} className="hairline px-2 py-1.5 text-[12px] w-full outline-none">{[0.5, 2, 3, 4, 6, 8].map(h => <option key={h} value={h}>{h} 学时</option>)}</select></div>
              <div><div className="text-[11px] text-slate-500 mb-1">课程类型</div>
                <select value={kind} onChange={e => setKind(e.target.value as CourseKind)} className="hairline px-2 py-1.5 text-[12px] w-full outline-none">{['专题课', '必修课', '岗位入门', '复训课', '微课'].map(k => <option key={k}>{k}</option>)}</select></div>
            </div>
            <div><div className="text-[11px] text-slate-500 mb-1">产出物</div>
              <div className="flex flex-wrap gap-1">{OUTPUTS.map(o => <button key={o} className={`chip ${outs.includes(o) ? 'on' : ''}`} style={outs.includes(o) ? { background: 'var(--indigo-soft)', borderColor: 'rgba(47,109,246,.5)', color: 'var(--indigo)' } : {}} onClick={() => setOuts(s => s.includes(o) ? s.filter(x => x !== o) : [...s, o])}>{o}</button>)}</div></div>
          </div>
        </Panel>
        <Panel title={`第二步　选择原料　已选 ${sel.length}`} className="flex-1" bodyClass="overflow-auto scroll" extra={<input value={q} onChange={e => setQ(e.target.value)} placeholder="搜中枢条目" className="hairline px-2 py-0.5 text-[11px] w-[110px] outline-none" />}>
          <div className="p-2 space-y-1.5">
            {pool.map(a => (
              <div key={a.id} className={`mat ${sel.includes(a.id) ? 'on' : ''}`} onClick={() => setSel(s => s.includes(a.id) ? s.filter(x => x !== a.id) : [...s, a.id])}>
                <span className="w-[16px] h-[16px] rounded-[5px] shrink-0 mt-[2px] flex items-center justify-center text-[10px] text-white" style={{ background: sel.includes(a.id) ? 'var(--ai)' : '#d5dce6' }}>{sel.includes(a.id) ? '✓' : ''}</span>
                <div className="min-w-0"><div className="flex items-center gap-1.5"><AssetKindTag k={a.kind} />{a.post === post && <span className="tag tag-gold">岗位匹配</span>}</div><div className="text-[12px] leading-snug mt-0.5">{a.title}</div><div className="text-[10.5px] text-slate-400 truncate">{a.src} · 引用 {a.use}</div></div>
              </div>
            ))}
            <div className="mat" onClick={() => toast('已打开上传，支持 docx / pdf / 录音')}><span className="w-[16px] h-[16px] rounded-[5px] shrink-0 flex items-center justify-center text-[12px]" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>+</span><div className="text-[12px] text-slate-600">上传部门文档、作业指导书或录音作为原料</div></div>
          </div>
        </Panel>
        <Panel title="第三步　生成">
          <div className="p-3">
            <button className="btn btn-primary w-full" disabled={phase === 'run' || !sel.length} onClick={start}>{phase === 'run' ? '生成中…' : phase === 'done' ? '重新生成' : `生成成套课程　${hours} 学时`}</button>
            {phase === 'done' && draft && <button className="btn btn-gold w-full mt-2" onClick={() => push({ v: 'draft', key })}>查看生成结果 ›</button>}
          </div>
        </Panel>
      </div>
      <Panel title={phase === 'idle' ? '产出预览' : draft ? `${draft.name}　${draft.hours} 学时` : '产出预览'} extra={phase !== 'idle' && draft ? <div className="flex items-center gap-2"><KindTag k={draft.kind} /><span className="text-[10.5px] text-slate-500">{draft.unit.replace(/（.*）/, '')} · {draft.post}</span></div> : undefined} bodyClass="overflow-auto scroll">
        {phase === 'idle' ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-[76px] h-[76px] rounded-2xl flex items-center justify-center glow-ring" style={{ background: 'rgba(255,255,255,.7)' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2f6df6" strokeWidth="1.4"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h6" /></svg></div>
            <div className="text-[12.5px]">左侧设定单位、岗位与课时，勾选中枢原料后生成成套课程</div>
            <div className="flex gap-2 text-[11px]">{OUTPUTS.map(o => <span key={o} className="tag">{o}</span>)}</div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-[1fr_1fr] gap-4">
              <div>
                {STEPS.map(([t, d], i) => (
                  <div key={t} className="flex gap-3 pb-3 relative">
                    <div className="shrink-0 relative"><div className={`stage-dot ${i < step ? 'done' : i === step && phase === 'run' ? 'cur' : ''}`}>{i < step ? '✓' : i + 1}</div>{i < STEPS.length - 1 && <span className="absolute left-1/2 top-[26px] bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div>
                    <div className="min-w-0 pt-1"><div className={`text-[12.5px] font-medium ${i > step ? 'text-slate-400' : ''}`}>{t}{i === step && phase === 'run' && <span className="typing" />}</div><div className="text-[11px] text-slate-500">{d}</div>{log[i] && <div className="text-[11.5px] mt-1 px-2 py-1 rounded-lg fade-in" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>{log[i]}</div>}</div>
                  </div>
                ))}
              </div>
              <div>
                {draft && (
                  <div className="fade-in">
                    <div className="text-[11px] text-slate-500 mb-1.5">大纲</div>
                    {draft.chapters.map((ch, i) => (
                      <div key={ch.no} className={`hairline px-3 py-2 mb-1.5 ${i * 1.2 <= step ? '' : 'opacity-30'}`} style={{ transition: 'opacity .4s' }}>
                        <div className="flex items-center gap-2 text-[12px]"><span className="text-[var(--gold)] font-semibold">{ch.no}</span><span className="font-medium">{ch.title}</span><span className="ml-auto num text-[10.5px] text-slate-400">{ch.minutes} 分钟 · {ch.pages} 页 · {ch.quiz} 题</span></div>
                        <div className="flex gap-1 mt-1 flex-wrap">{ch.kps.map(k => <span key={k} className="tag">{k}</span>)}</div>
                      </div>
                    ))}
                    {phase === 'done' && (
                      <div className="mt-3 grid grid-cols-5 gap-1.5">
                        {OUTPUTS.map(o => <button key={o} className="hairline py-2 text-center hover:border-[var(--ai)]" onClick={() => push({ v: 'output', course: draft.id, kind: o })}><div className="num text-[17px] font-semibold num-grad">{draft.outputs[o]}</div><div className="text-[10.5px] text-slate-500">{o}</div></button>)}
                      </div>
                    )}
                    {phase === 'done' && <div className="flex gap-2 mt-3"><button className="btn btn-primary flex-1" onClick={() => push({ v: 'draft', key })}>进入生成结果</button><button className="btn flex-1" onClick={() => { submitDraft(draft); toast('已提交内训师审核，课程库可见'); }}>提交审核</button></div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}

/* ---------- 二级：生成结果 / 课程产出（草稿与已发布课程共用） ---------- */
type Tab = '大纲' | '讲义' | '课件页' | '微课脚本' | '实训任务书' | '试题'
export function DraftView({ courseKey, courseId }: { courseKey?: string; courseId?: string }) {
  const { push, toast, jump } = useNav()
  const c = courseKey ? DRAFTS[courseKey] : findCourse(courseId!)
  const [tab, setTab] = useState<Tab>('大纲')
  const [ch, setCh] = useState(0)
  const [adapt, setAdapt] = useState<string | null>(null)
  if (!c) return <div className="p-6 text-slate-400">课程不存在</div>
  const chapter = c.chapters[ch]
  const qs = QUESTIONS.filter(q => c.src.includes(q.anchor)).slice(0, 6)
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0 relative">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0">
          <div className="flex items-center gap-2 mb-1"><KindTag k={c.kind} /><span className="num text-[11px] text-slate-400">{c.id}</span><StatusTag s={c.status} /><span className="tag">{c.ver}</span><span className="ml-auto text-[11px] text-slate-500">{c.unit.replace(/（.*）/, '')} · {c.post} · {c.hours} 学时 · {c.owner}</span></div>
          <div className="text-[18px] font-semibold serif">{c.name}</div>
          <div className="text-[12px] text-slate-600 mt-1">{c.summary}</div>
          <div className="flex items-center gap-2 mt-3">
            <div className="seg">{(['大纲', '讲义', '课件页', '微课脚本', '实训任务书', '试题'] as Tab[]).map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
            {tab !== '大纲' && tab !== '实训任务书' && tab !== '试题' && <select value={ch} onChange={e => setCh(+e.target.value)} className="hairline px-2 py-1 text-[12px] ml-2">{c.chapters.map((x, i) => <option key={x.no} value={i}>{x.no} {x.title}</option>)}</select>}
          </div>
        </div>
        <Panel title={tab === '大纲' ? `大纲　${c.chapters.length} 章` : tab === '试题' ? `配套试题　${c.outputs.配套试题} 道（展示 ${qs.length} 道）` : `${chapter.no} ${chapter.title} · ${tab}`} className="flex-1" bodyClass="overflow-auto scroll" extra={tab !== '大纲' && <button className="btn btn-sm" onClick={() => push({ v: 'chapter', course: c.id, no: ch })}>章节页 ›</button>}>
          <div className="p-4">
            {tab === '大纲' && c.chapters.map((x, i) => (
              <button key={x.no} onClick={() => push({ v: 'chapter', course: c.id, no: i })} className="a-card w-full text-left mb-2 row-in" style={{ animationDelay: `${i * .06}s` }}>
                <div className="flex items-center gap-2"><span className="text-[var(--gold)] font-semibold text-[12px]">{x.no}</span><span className="text-[13.5px] font-medium">{x.title}</span><span className="ml-auto num text-[11px] text-slate-400">{x.minutes} 分钟 · {x.pages} 页 · {x.quiz} 题</span></div>
                <div className="flex gap-1 mt-1.5 flex-wrap">{x.kps.map(k => <span key={k} className="tag tag-gold">{k}</span>)}{x.assets.map(a => <span key={a} className="tag">{a}</span>)}</div><span className="go">›</span>
              </button>
            ))}
            {tab === '讲义' && <div className="ai-out" key={ch}><Typewriter text={lectureText(c, chapter)} speed={5} /></div>}
            {tab === '课件页' && <div className="grid grid-cols-2 gap-3">{slidesFor(c, chapter).map((s, i) => <Slide key={i} s={s} i={i} c={c} onClick={() => push({ v: 'chapter', course: c.id, no: ch })} />)}</div>}
            {tab === '微课脚本' && <div className="ai-out" key={'m' + ch}><Typewriter text={`【微课脚本 · ${chapter.title}】\n\n镜头 1 · 字幕卡（12 秒）\n口播：这一讲用三分钟讲清楚"${chapter.title}"。\n\n镜头 2 · 数字人讲解（38 秒）\n口播：${lectureText(c, chapter).split('\n')[5] ?? c.summary}\n画面：右侧要点逐条浮现。\n\n镜头 3 · 示意图（42 秒）\n口播：先看 ${chapter.kps[0] ?? '关键判断'}，再看 ${chapter.kps[1] ?? '交叉核对'}。\n画面：流程示意。\n\n镜头 4 · 互动提问（20 秒）\n口播：缺一项能不能继续？三秒后公布答案。\n\n镜头 5 · 出处卡（14 秒）\n口播：记住出处，下一讲见。`} speed={5} /></div>}
            {tab === '实训任务书' && <div className="ai-out"><Typewriter text={taskbookText(c)} speed={5} /></div>}
            {tab === '试题' && <div className="space-y-2">{qs.map((q, i) => <button key={q.id} onClick={() => push({ v: 'question', id: q.id })} className="a-card w-full text-left row-in" style={{ animationDelay: `${i * .05}s` }}><div className="flex items-center gap-2"><QTag k={q.kind} /><span className="num text-[10.5px] text-slate-400">{q.id}</span><span className="tag tag-gold ml-auto">{q.anchor}</span></div><div className="text-[12.5px] mt-1">{q.stem}</div><span className="go">›</span></button>)}{qs.length === 0 && <div className="text-[12px] text-slate-400 py-4 text-center">题目按原料条目生成，进入题库工作台查看</div>}</div>}
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="产出物">
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {OUTPUTS.map(o => <button key={o} className="hairline py-2 text-center hover:border-[var(--ai)]" onClick={() => push({ v: 'output', course: c.id, kind: o })}><div className="num text-[18px] font-semibold num-grad">{c.outputs[o]}</div><div className="text-[10.5px] text-slate-500">{o}</div></button>)}
            <button className="hairline py-2 text-center hover:border-[var(--ai)]" onClick={() => jump('hub', 'catalog', { v: 'asset', id: c.src[0] })}><div className="num text-[18px] font-semibold gold-grad">{c.src.length}</div><div className="text-[10.5px] text-slate-500">原料条目</div></button>
          </div>
        </Panel>
        <Panel title="AI 动作">
          <div className="p-2 space-y-1.5">
            {[['改编到其他岗位', '同一课程换岗位口径'], ['生成复训版', '压缩为 1 学时要点课'], ['按规程新版更新', '自动替换引用条款'], ['生成数字人微课', '推送到微课工作室']].map(([k, d], i) => (
              <button key={k} className={`act-btn ${i % 2 ? 'gold' : ''}`} onClick={() => { if (i === 3) { toast('已推送到微课工作室渲染队列'); push({ v: 'media' }) } else setAdapt(k) }}><span className="ic">{['改', '复', '新', '微'][i]}</span>{k}<small>{d}</small></button>
            ))}
          </div>
        </Panel>
        <Panel title="流转" className="flex-1">
          <div className="p-3 space-y-2">
            {c.status === '草稿' ? <>
              <button className="btn btn-primary w-full" onClick={() => { submitDraft(c); toast('已提交内训师审核'); push({ v: 'review' }) }}>提交内训师审核</button>
              <button className="btn w-full" onClick={() => toast('已指派内训师 · 按单位与主题匹配')}>指派内训师</button>
            </> : <>
              <button className="btn btn-primary w-full" onClick={() => push({ v: 'course', id: c.id })}>课程详情</button>
              <button className="btn w-full" onClick={() => push({ v: 'courseStats', id: c.id })}>学习效果</button>
            </>}
            <button className="btn w-full" onClick={() => { toast('已推送到教练编辑器'); jump('coach', 'editor') }}>生成陪练剧本</button>
            <div className="text-[10.5px] text-slate-400 leading-relaxed pt-1">所有产出逐条回链知识资产中枢，规程修订后自动进入复核队列。</div>
          </div>
        </Panel>
      </div>
      {adapt && (
        <div className="ai-mask" onClick={() => setAdapt(null)}>
          <div className="ai-dlg" onClick={e => e.stopPropagation()}>
            <div className="hd"><span className="w-[3px] h-[13px]" style={{ background: 'var(--gold)' }} /><span className="text-[13px] font-semibold">AI · {adapt}</span><span className="text-[11px] text-slate-500">基于 {c.id}</span><button className="ml-auto text-slate-400" onClick={() => setAdapt(null)}>✕</button></div>
            <div className="bd"><div className="ai-out"><Typewriter text={adapt === '改编到其他岗位' ? `【改编建议 · ${c.name}】\n\n目标岗位：${c.post === '变电值班员' ? '配网运维员' : '新入职员工'}\n保留：${c.chapters.slice(0, 2).map(x => x.title).join('、')}（口径通用）\n改写：${c.chapters[2]?.title ?? '标准作业流程'} → 按目标岗位的作业场景替换案例与术语\n新增：目标岗位常见错项 3 条（来自中枢同主题诀窍）\n试题：保留 60%，按岗位重新生成 40%\n\n预计生成时间 1.2 天，内训师校对 0.5 天。` : adapt === '生成复训版' ? `【复训版 · ${c.name}】\n\n课时：1 学时　形式：线上 + 班前会 10 分钟\n要点页：${c.chapters.map(x => x.kps[0] ?? x.title).join(' / ')}\n近一年变化：${c.src.map(x => x).slice(0, 2).join('、')} 相关条款已按新版更新\n复训题：10 道，全部来自本课错题率最高的知识点\n通过线：80 分` : `【规程新版更新 · ${c.name}】\n\n检测到引用条款变化 ${Math.max(1, c.src.length - 2)} 处：\n· 第十八条 接令后核实操作票 → 新版扩展到操作顺序与安全措施\n· 附录G-5 位置核对 → 由两项扩展为四项\n\n将自动：更新讲义与课件页 ${Math.round(c.outputs.课件 * .3)} 页、替换题目 ${Math.round(c.outputs.配套试题 * .25)} 道、更新微课口播 2 段，并生成审核任务单。`} speed={7} /></div></div>
            <div className="ft"><button className="btn" onClick={() => setAdapt(null)}>关闭</button><button className="btn btn-primary" onClick={() => { toast(`已创建任务：${adapt}`); setAdapt(null) }}>创建任务</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function Slide({ s, i, c, mini, on, onClick }: { s: { title: string; bullets: string[]; note: string }; i: number; c: Course; mini?: boolean; on?: boolean; onClick?: () => void }) {
  return (
    <div className={`slide ${mini ? 'mini' : ''} ${on ? 'on' : ''}`} onClick={onClick}>
      <div className="bar" />
      <div className="bd">
        <h3>{s.title}</h3>
        <ul>{s.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
        <div className="ft"><span>{c.name}</span><span>智培云图 · AI 课程工厂 · {i + 1}</span></div>
      </div>
      <svg className="wm" viewBox="0 0 40 40"><path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" fill="none" stroke="#1e3a6e" strokeWidth="2" /></svg>
    </div>
  )
}

/* ---------- 三级：章节页 ---------- */
export function ChapterView({ course, no }: { course: string; no: number }) {
  const { push, toast, jump } = useNav()
  const c = findCourse(course)
  const [i, setI] = useState(0)
  if (!c) return null
  const ch: Chapter = c.chapters[no]
  const slides = slidesFor(c, ch)
  const s = slides[i]
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`${ch.no} ${ch.title}　课件页 ${i + 1} / ${slides.length}`} extra={<div className="flex gap-1"><button className="btn btn-sm" onClick={() => setI(x => Math.max(0, x - 1))}>‹ 上一页</button><button className="btn btn-sm" onClick={() => setI(x => Math.min(slides.length - 1, x + 1))}>下一页 ›</button></div>}>
          <div className="p-4"><div className="max-w-[820px] mx-auto"><Slide s={s} i={i} c={c} /></div>
            <div className="mt-3 rounded-xl px-3 py-2 text-[12px]" style={{ background: 'var(--indigo-soft)' }}><span className="text-[10.5px] text-slate-500 mr-2">讲解词</span>{s.note}</div>
            <div className="flex gap-2 mt-3">{slides.map((x, j) => <div key={j} className="w-[120px]"><Slide s={x} i={j} c={c} mini on={j === i} onClick={() => setI(j)} /></div>)}</div>
          </div>
        </Panel>
        <Panel title="讲义" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-4 text-[12.5px] leading-[1.9] whitespace-pre-wrap">{lectureText(c, ch)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="本章知识点与出处">
          <div className="p-3 space-y-1.5">
            {ch.assets.map(a => <button key={a} className="a-card w-full text-left" onClick={() => jump('hub', 'catalog', { v: 'asset', id: a })}><div className="num text-[10.5px] text-slate-400">{a}</div><div className="text-[12px]">{ASSETS.find(x => x.id === a)?.title ?? a}</div><span className="go">›</span></button>)}
            {ch.kps.map(k => <span key={k} className="tag tag-gold mr-1">{k}</span>)}
          </div>
        </Panel>
        <Panel title="本章小测" extra={<span className="num text-[11px] text-slate-500">{ch.quiz} 题</span>}>
          <div className="p-2 space-y-1">{QUESTIONS.filter(q => ch.assets.includes(q.anchor)).slice(0, 4).map(q => <button key={q.id} onClick={() => push({ v: 'question', id: q.id })} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px] flex items-center gap-2"><QTag k={q.kind} /><span className="truncate flex-1">{q.stem}</span><span className="text-[var(--gold)]">›</span></button>)}</div>
        </Panel>
        <Panel title="AI 动作" className="flex-1">
          <div className="p-2 space-y-1.5">
            <button className="act-btn" onClick={() => toast('已按讲解词重排本页要点')}><span className="ic">排</span>重排本页要点<small>密度优化</small></button>
            <button className="act-btn gold" onClick={() => toast('已生成本章 3 道变式题')}><span className="ic">题</span>补充本章试题<small>3 道</small></button>
            <button className="act-btn" onClick={() => { toast('已推送本章到微课工作室'); push({ v: 'media' }) }}><span className="ic">微</span>本章生成微课<small>3 分钟</small></button>
            <button className="act-btn gold" onClick={() => toast('已导出 PPTX')}><span className="ic">出</span>导出本章课件<small>PPTX</small></button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：产出预览 ---------- */
export function OutputView({ course, kind }: { course: string; kind: OutputKind }) {
  const { push, toast } = useNav()
  const c = findCourse(course)
  if (!c) return null
  const qs = QUESTIONS.filter(q => c.src.includes(q.anchor)).slice(0, 8)
  return (
    <div className="h-full grid grid-cols-[1fr_300px] gap-3 p-3 min-h-0">
      <Panel title={`${kind}　${c.outputs[kind]} ${kind === '配套试题' ? '道' : kind === '微课脚本' ? '段' : kind === '实训任务书' ? '份' : '页'}`} bodyClass="overflow-auto scroll" extra={<div className="flex gap-1">{OUTPUTS.map(o => <button key={o} className={`dim-tab ${o === kind ? 'on' : ''}`} onClick={() => push({ v: 'output', course, kind: o })}>{o}</button>)}</div>}>
        <div className="p-4">
          {kind === '课件' && <div className="grid grid-cols-3 gap-3">{c.chapters.flatMap((ch, ci) => slidesFor(c, ch).slice(0, 3).map((s, i) => <div key={ci + '-' + i}><Slide s={s} i={ci * 3 + i} c={c} mini onClick={() => push({ v: 'chapter', course, no: ci })} /></div>))}</div>}
          {kind === '讲义' && c.chapters.map(ch => <div key={ch.no} className="ai-out mb-3 whitespace-pre-wrap text-[12px]">{lectureText(c, ch)}</div>)}
          {kind === '微课脚本' && c.chapters.map(ch => <button key={ch.no} className="a-card w-full text-left mb-2" onClick={() => push({ v: 'media' })}><div className="text-[12.5px] font-medium">{ch.title} · 三分钟讲清楚</div><div className="text-[11px] text-slate-500 mt-0.5">6 个分镜 · 约 2.6 分钟 · 数字人讲师 {COACH_FOR(c).n.split(' · ')[1] ?? '黄志远'}</div><span className="go">›</span></button>)}
          {kind === '实训任务书' && <div className="ai-out whitespace-pre-wrap">{taskbookText(c)}</div>}
          {kind === '配套试题' && <div className="space-y-2">{qs.map(q => <button key={q.id} onClick={() => push({ v: 'question', id: q.id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><QTag k={q.kind} /><span className="num text-[10.5px] text-slate-400">{q.id}</span><span className="tag tag-gold ml-auto">{q.anchor}</span></div><div className="text-[12.5px] mt-1">{q.stem}</div><span className="go">›</span></button>)}</div>}
        </div>
      </Panel>
      <div className="flex flex-col gap-3">
        <Panel title="课程"><div className="p-3"><KindTag k={c.kind} /><div className="text-[13px] font-semibold mt-1">{c.name}</div><Field k="适用" v={`${c.unit.replace(/（.*）/, '')} · ${c.post} · ${c.hours} 学时`} /><button className="btn btn-sm w-full" onClick={() => push({ v: 'course', id: c.id })}>返回课程</button></div></Panel>
        <Panel title="导出与推送" className="flex-1"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => toast(`已导出${kind}`)}>导出{kind}</button><button className="btn w-full" onClick={() => toast('已推送到学习平台')}>推送到学习平台</button><button className="btn w-full" onClick={() => toast('已生成分享链接')}>生成分享链接</button></div></Panel>
      </div>
    </div>
  )
}
export { Slide }
export function ProgressRow({ k, v }: { k: string; v: number }) { return <div className="flex items-center gap-2 text-[11.5px]"><span className="w-[60px] text-slate-600">{k}</span><div className="flex-1"><Progress v={v} /></div><span className="num w-[34px] text-right">{v}%</span></div> }
