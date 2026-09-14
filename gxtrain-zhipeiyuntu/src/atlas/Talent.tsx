/* 人才梯队（一级）→ 人才池 / 继任（二级） */
import { useMemo, useState } from 'react'
import { Panel, Radar, CountUp } from '../ui'
import { Scatter, Pyramid, Columns, Gantt, Ring } from '../charts'
import { TALENTS, KEY_POSTS, PYRAMID, ALL_PEOPLE, personById, short } from './data'
import { useNav, Typewriter, Kpi } from './nav'

const BOXES = [['低能力·高潜力', '中能力·高潜力', '高能力·高潜力'], ['低能力·中潜力', '中能力·中潜力', '高能力·中潜力'], ['低能力·低潜力', '中能力·低潜力', '高能力·低潜力']]
const BOX_NAME: Record<string, string> = { '高能力·高潜力': '明星', '中能力·高潜力': '高潜骨干', '低能力·高潜力': '潜力型', '高能力·中潜力': '专家型', '中能力·中潜力': '中坚', '低能力·中潜力': '待观察', '高能力·低潜力': '技术能手', '中能力·低潜力': '稳定执行', '低能力·低潜力': '待改进' }
const BOX_COLOR: Record<string, string> = { '高能力·高潜力': '#b08a3e', '中能力·高潜力': '#2f6df6', '低能力·高潜力': '#19b8d8', '高能力·中潜力': '#7b5cf5', '中能力·中潜力': '#1e3a6e', '低能力·中潜力': '#94a3b8', '高能力·低潜力': '#178a54', '中能力·低潜力': '#94a3b8', '低能力·低潜力': '#c2402f' }
const SCALE = 45694 / TALENTS.length

export function TalentView() {
  const { push, toast, jump } = useNav()
  const [sel, setSel] = useState<string>()
  const pts = TALENTS.map(t => ({ id: t.id, label: t.name, x: t.ability, y: t.potential, r: 6, color: BOX_COLOR[t.box] }))
  const count = (b: string) => TALENTS.filter(t => t.box === b).length
  const star = count('高能力·高潜力'), hp = count('中能力·高潜力') + star + count('低能力·高潜力')
  const nextYear = [{ label: '中级工', v: 1860 }, { label: '高级工', v: 1240 }, { label: '技师', v: 412, color: 'var(--gold)' }, { label: '高级技师', v: 96 }]
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k="高潜人才池" v={<CountUp to={Math.round(hp * SCALE)} />} d={`明星 ${Math.round(star * SCALE)} 人 · 占建档 ${Math.round(hp / TALENTS.length * 1000) / 10}%`} gold onClick={() => push({ v: 'pool', box: '高能力·高潜力' })} />
        <Kpi k="关键岗位" v={<CountUp to={KEY_POSTS.length} />} d={`${KEY_POSTS.filter(k => k.readyN < 2).length} 个继任储备不足`} onClick={() => push({ v: 'succession', post: KEY_POSTS[2].post })} />
        <Kpi k="继任就绪率" v={<><CountUp to={Math.round(KEY_POSTS.reduce((s, k) => s + k.readyN, 0) / KEY_POSTS.reduce((s, k) => s + k.poolN, 0) * 1000) / 10} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="储备池中已达标比例" gold />
        <Kpi k="预测明年晋级" v={<CountUp to={nextYear.reduce((s, n) => s + n.v, 0)} />} d="技师 412 人 · 高级技师 96 人" />
        <Kpi k="3 年内退休高技能" v={<CountUp to={186} />} d="其中技师及以上 64 人" gold onClick={() => push({ v: 'succession', post: KEY_POSTS[0].post })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_300px_360px] gap-3">
        <Panel title="能力 × 潜力九宫格　全公司样本" extra={<span className="text-[10.5px] text-slate-500">点击人员进入成长地图</span>}>
          <div className="px-2 pt-1"><Scatter points={pts} xLabel="能力得分" yLabel="潜力评估" h={300} xMin={58} xMax={94} yMin={46} yMax={94} quadrants quadLabels={['潜力型', '高潜骨干', '明星', '待观察', '中坚', '专家型', '待改进', '稳定执行', '技术能手']} sel={sel} onPoint={p => { setSel(p.id); const t = TALENTS.find(x => x.id === p.id); const pp = t && ALL_PEOPLE.find(x => x.id === t.id); if (pp) push({ v: 'person', id: pp.id, unit: pp.unit, team: pp.team }) }} /></div>
          <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">{BOXES.flat().map(b => <button key={b} onClick={() => push({ v: 'pool', box: b })} className="hairline px-2 py-1.5 text-left hover:border-[var(--ai)] flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: BOX_COLOR[b] }} /><span className="text-[11px]">{BOX_NAME[b]}</span><span className="ml-auto num text-[12px] font-semibold" style={{ color: 'var(--indigo)' }}>{Math.round(count(b) * SCALE).toLocaleString()}</span></button>)}</div>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="等级梯队"><div className="p-2"><Pyramid levels={PYRAMID.map((p, i) => ({ ...p, note: ['+8.4%', '+6.1%', '+2.3%', '-3.8%', '-4.6%'][i] }))} h={170} /><div className="text-[10.5px] text-slate-500 px-1">右侧为同比变化</div></div></Panel>
          <Panel title="预测明年晋级　按当前进度" className="flex-1" extra={<span className="ai-badge">预测</span>}><div className="p-3"><Columns h={120} data={nextYear} /><button className="btn btn-sm w-full mt-2" onClick={() => { toast('已把 128 名仅差一项的人员纳入第四季度专项陪练'); jump('coach', 'company') }}>安排 128 人专项陪练</button></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="关键岗位继任" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入继任视图</span>}>
            <div className="p-2 space-y-1.5">{KEY_POSTS.map(k => <button key={k.post} onClick={() => push({ v: 'succession', post: k.post })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className={`tag ${k.readyN < 2 ? 'tag-bad' : k.readyN < 3 ? 'tag-warn' : 'tag-ok'}`}>{k.readyN < 2 ? '储备不足' : k.readyN < 3 ? '待加强' : '充足'}</span><span className="text-[12px] font-medium truncate flex-1">{k.post}</span></div><div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-1"><span>{k.unit} · {k.holder}</span><span className="ml-auto num">退休 {k.retire}</span></div><div className="flex items-center gap-1 mt-1.5">{Array.from({ length: k.poolN }).map((_, i) => <span key={i} className="w-3 h-1.5 rounded-sm" style={{ background: i < k.readyN ? 'var(--ok)' : '#e2e8f0' }} />)}<span className="num text-[10px] text-slate-500 ml-1">{k.readyN} / {k.poolN} 就绪</span></div><span className="go">›</span></button>)}</div>
          </Panel>
          <Panel title="AI 判读"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`明星区 ${Math.round(star * SCALE)} 人，建议纳入内训师与带教师傅候选；${KEY_POSTS.filter(k => k.readyN < 2).map(k => k.post).join('、')}继任储备不足，需在 ${KEY_POSTS.filter(k => k.readyN < 2)[0]?.retire ?? '今年'} 前完成经验萃取。技师层同比 +6.1%，中级工层 -3.8%，说明晋级通道畅通。`} speed={7} /></div></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：人才池 ---------- */
export function PoolView({ box }: { box: string }) {
  const { push, toast, jump } = useNav()
  const list = TALENTS.filter(t => t.box === box).sort((a, b) => b.ability + b.potential - a.ability - a.potential)
  const persons = list.map(t => ALL_PEOPLE.find(p => p.id === t.id)!).filter(Boolean)
  const radar = useMemo(() => { const base = persons[0]?.abilities ?? []; return base.map((a, i) => ({ k: ['专业技能', '安全规程', '异常处置', '数字化与 AI', '管理协作', '合规风控'][i] ?? a.k, v: Math.round(persons.reduce((s, p) => s + (p.abilities[i]?.v ?? 0), 0) / Math.max(1, persons.length)), need: 80 })) }, [persons])
  const strategy: Record<string, string> = { '高能力·高潜力': '进入关键岗位继任池，安排跨单位轮岗与专家带教；优先推荐内训师认证与技术比武。', '中能力·高潜力': '加密陪练频次至每月 2 场，配备导师，12 个月内冲击下一等级。', '低能力·高潜力': '先补基础能力项，安排岗位入门课与分段陪练，半年后复评。', '高能力·中潜力': '发挥专家作用，承担带教与经验萃取；用萃取成果生成课程。', '中能力·中潜力': '按千人千面计划正常推进，重点补齐 1–2 项短板。', '低能力·中潜力': '纳入班组长重点关注名单，季度复评。', '高能力·低潜力': '稳定在关键操作岗位，作为班组技术把关人。', '中能力·低潜力': '维持必修课与年度复训，保证安全底线。', '低能力·低潜力': '安排岗位适配评估，必要时转岗培训。' }
  const units = Object.entries(list.reduce<Record<string, number>>((m, t) => { m[t.unit] = (m[t.unit] ?? 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8)
  return (
    <div className="h-full grid grid-cols-[1fr_300px_320px] gap-3 p-3 min-h-0">
      <Panel title={`${BOX_NAME[box]} · ${box}　样本 ${list.length} 人 / 推算 ${Math.round(list.length * SCALE).toLocaleString()} 人`} bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入个人成长地图</span>}>
        <table className="grid"><thead><tr><th>姓名</th><th>单位</th><th>岗位</th><th>等级</th><th>能力</th><th>潜力</th><th>建议动作</th></tr></thead>
          <tbody>{list.map(t => { const p = personById(t.id); return <tr key={t.id} className="cursor-pointer row-in" onClick={() => p && push({ v: 'person', id: p.id, unit: p.unit, team: p.team })}><td className="font-medium">{t.name}</td><td>{t.unit}</td><td>{t.post}</td><td>{t.grade}</td><td className="num font-semibold">{t.ability}</td><td className="num">{t.potential}</td><td><span className="tag">{box.startsWith('高') ? '继任 / 带教' : box.endsWith('高潜力') ? '导师 + 加密陪练' : '补短板'}</span></td></tr> })}</tbody></table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="能力均值雷达"><div className="p-2 flex justify-center">{radar.length ? <Radar data={radar} size={240} /> : <div className="text-[12px] text-slate-400 p-4">暂无样本</div>}</div></Panel>
        <Panel title="单位分布" className="flex-1"><div className="p-3"><Columns h={100} data={units.map(([k, v]) => ({ label: k.replace(/供电局$/, ''), v: Math.round(v * SCALE) }))} /></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 培养策略" extra={<span className="ai-badge">按区间</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={strategy[box] ?? ''} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast(`已为 ${list.length} 人生成培养计划`); jump('plan', 'idp') }}><span className="ic">划</span>生成培养计划<small>千人千面</small></button><button className="act-btn gold" onClick={() => { toast('已推荐进入内训师候选名单'); jump('factory', 'trainer') }}><span className="ic">师</span>推荐为内训师候选<small>{Math.min(list.length, 5)} 人</small></button><button className="act-btn" onClick={() => { toast('已发起导师匹配'); jump('coach', 'plaza') }}><span className="ic">导</span>匹配导师与陪练<small>陪练中心</small></button></div></div></Panel>
        <Panel title="其他区间" className="flex-1"><div className="p-2 grid grid-cols-3 gap-1">{BOXES.flat().filter(b => b !== box).map(b => <button key={b} className="chip text-left" onClick={() => push({ v: 'pool', box: b })}>{BOX_NAME[b]}</button>)}</div></Panel>
      </div>
    </div>
  )
}

/* ---------- 二级：继任视图 ---------- */
export function SuccessionView({ post }: { post: string }) {
  const { push, toast, jump } = useNav()
  const k = KEY_POSTS.find(x => x.post === post) ?? KEY_POSTS[0]
  const months = Math.max(6, Math.min(30, (parseInt(k.retire.slice(0, 4)) - 2026) * 12 + parseInt(k.retire.slice(5, 7)) - 9))
  const cands = Array.from({ length: k.poolN }).map((_, i) => { const nm = k.ready[i] ?? ['黄志强', '韦嘉怡', '陆文杰', '梁子涵', '莫欣怡', '覃浩宇', '农思琪'][i % 7]; const readiness = i < k.readyN ? 84 + (i * 7) % 12 : 52 + (i * 11) % 26; return { name: nm, readiness, gaps: i < k.readyN ? 0 : 1 + (i % 3), ready: i < k.readyN, eta: i < k.readyN ? 0 : Math.round((90 - readiness) * .5) } })
  const cols = Math.min(24, months)
  const rows = cands.map(c => ({ name: c.name, sub: c.ready ? '已就绪' : `差 ${c.gaps} 项`, spans: c.ready ? [{ from: 0, to: 6, color: 'var(--ok)', label: '带教接班' }, { from: 6, to: Math.min(cols, 10), color: 'var(--gold)', label: '独立履职' }] : [{ from: 0, to: Math.min(cols, 4 + c.gaps * 3), color: 'var(--ai)', label: '补齐能力项' }, { from: Math.min(cols, 4 + c.gaps * 3), to: Math.min(cols, 10 + c.gaps * 3), color: 'var(--violet)', label: '专家带教' }, { from: Math.min(cols, 10 + c.gaps * 3), to: Math.min(cols, 12 + c.gaps * 3), color: 'var(--gold)', label: '认定' }] }))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className={`tag ${k.readyN < 2 ? 'tag-bad' : k.readyN < 3 ? 'tag-warn' : 'tag-ok'}`}>{k.readyN < 2 ? '储备不足' : k.readyN < 3 ? '待加强' : '充足'}</span><div className="text-[17px] font-semibold serif mt-1">{k.post}</div><div className="text-[11.5px] text-slate-500">{k.unit} · 在任 {k.holder}</div>
          <div className="flex items-center gap-3 mt-3"><Ring v={Math.round(k.readyN / k.poolN * 100)} size={64} stroke={7} color={k.readyN < 2 ? 'var(--bad)' : 'var(--ok)'} sub="就绪率" /><div className="text-[11.5px] text-slate-600 leading-relaxed">退休 <b className="num">{k.retire}</b><br />距今 <b className="num">{months}</b> 个月<br />储备池 <b className="num">{k.poolN}</b> 人 · 就绪 <b className="num">{k.readyN}</b> 人</div></div></div>
        <Panel title="候选人" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1.5">{cands.map(c => <div key={c.name} className="hairline px-2.5 py-2"><div className="flex items-center gap-2 text-[12px]"><span className="font-medium">{c.name}</span><span className={`tag ${c.ready ? 'tag-ok' : 'tag-warn'}`}>{c.ready ? '就绪' : `${c.eta} 个月`}</span><span className="ml-auto num font-semibold" style={{ color: c.ready ? 'var(--ok)' : 'var(--indigo)' }}>{c.readiness}%</span></div><div className="h-[5px] bg-slate-100 rounded mt-1.5 overflow-hidden"><div className="h-full bar-grow" style={{ width: `${c.readiness}%`, background: c.ready ? 'var(--ok)' : 'var(--ai)' }} /></div></div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`继任培养时间线　至 ${k.retire} 退休`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">金线为退休节点</span>}>
          <div className="p-3"><Gantt rows={rows} cols={cols} colLabel={i => `+${i + 1}`} now={Math.min(cols, months) - .05} onSpan={(r, i) => toast(`${r.name} · ${r.spans[i].label}`)} /></div>
        </Panel>
        <Panel title="经验萃取与知识沉淀"><div className="p-3 grid grid-cols-3 gap-2 text-center">{[['已萃取诀窍', `${6 + k.post.length % 5} 条`], ['专家访谈', `${2 + k.post.length % 3} 次`], ['生成课程', `${1 + k.post.length % 3} 门`]].map(([kk, v], i) => <div key={kk} className="hairline py-2"><div className={`num text-[17px] font-semibold ${i === 0 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{kk}</div></div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 继任建议" extra={<span className="ai-badge">风险</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${k.holder}将于 ${k.retire} 退休，距今 ${months} 个月。${k.readyN >= 2 ? `${k.ready.slice(0, 2).join('、')}已就绪，建议 ${Math.max(1, months - 6)} 个月内完成带教接班；` : `就绪候选仅 ${k.readyN} 人，存在断层风险；建议立即启动 ${k.holder} 的经验萃取，并把 ${cands.filter(c => !c.ready)[0]?.name ?? '储备人员'} 的补齐周期压缩至 ${Math.max(4, months - 8)} 个月。`}萃取成果可直接生成课程与陪练脚本。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast(`已发起 ${k.holder} 经验萃取访谈`); jump('hub', 'expert') }}><span className="ic">萃</span>启动经验萃取<small>知识中枢 · 专家萃取</small></button><button className="act-btn gold" onClick={() => { toast('已建立带教结对'); jump('coach', 'plaza') }}><span className="ic">带</span>建立带教结对<small>{k.holder} 带 {cands[0].name}</small></button><button className="act-btn" onClick={() => { toast('已生成继任培养计划'); jump('plan', 'idp') }}><span className="ic">划</span>生成培养计划<small>{k.poolN} 人</small></button></div></div></Panel>
        <Panel title="其他关键岗位" className="flex-1"><div className="p-2 space-y-0.5">{KEY_POSTS.filter(x => x.post !== k.post).map(x => <button key={x.post} onClick={() => push({ v: 'succession', post: x.post })} className="w-full flex items-center gap-2 text-[11.5px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="truncate flex-1 text-left">{x.post}</span><span className="num text-slate-500">{x.readyN}/{x.poolN}</span><span className="text-[10px] text-slate-400">{short(x.unit)}</span></button>)}</div></Panel>
      </div>
    </div>
  )
}
