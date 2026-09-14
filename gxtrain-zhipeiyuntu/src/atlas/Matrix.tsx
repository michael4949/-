/* 岗位能力模型（一级）→ 岗位模型详情（二级）→ 能力项定义（三级） */
import { useMemo, useState } from 'react'
import { Panel, Bars, CountUp } from '../ui'
import { Heatmap, Columns, Ring, heat } from '../charts'
import { UNIT_GROUPS } from '../units'
import type { UnitGroup } from '../units'
import { POST_MODELS, postModelById, ABILITY_SETS, GRADE_LINE, FUNC_GRADES, PROD_GRADES, UNITS, short, unitOf } from './data'
import { useNav, Typewriter, Kpi, Field } from './nav'

export function MatrixView() {
  const { push, toast } = useNav()
  const [grp, setGrp] = useState<UnitGroup | '全部'>('全部')
  const [line, setLine] = useState('全部')
  const [q, setQ] = useState('')
  const lines = ['全部', ...Object.keys(ABILITY_SETS)]
  const list = useMemo(() => POST_MODELS.filter(m => (grp === '全部' || m.grp === grp) && (line === '全部' || m.line === line) && (!q || m.post.includes(q) || m.unit.includes(q) || m.dept.includes(q))), [grp, line, q])
  const byLine = Object.keys(ABILITY_SETS).map(l => { const ms = POST_MODELS.filter(m => m.line === l); return { label: l, v: ms.length ? Math.round(ms.reduce((s, m) => s + m.ready, 0) / ms.length) : 0, n: ms.length } })
  const stale = POST_MODELS.filter(m => m.updated < '2026-04')
  const withScene = POST_MODELS.filter(m => m.scene)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k="岗位模型" v={<CountUp to={POST_MODELS.length} />} d="28 个单位 · 全部科室岗位" />
        <Kpi k="能力项" v={<CountUp to={486} />} d="9 个专业与领域 · 本年新增 18 项" gold />
        <Kpi k="挂接 AI 场景" v={<CountUp to={withScene.length} />} d="评估表场景已转为能力项" onClick={() => setQ('')} />
        <Kpi k="半年未更新" v={<CountUp to={stale.length} />} d="建议按新规程复核" gold onClick={() => { setGrp('全部'); setLine('全部'); setQ('') }} />
        <Kpi k="模型平均达标" v={<><CountUp to={Math.round(POST_MODELS.reduce((s, m) => s + m.ready, 0) / POST_MODELS.length * 10) / 10} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="按岗位人数加权" />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_360px] gap-3">
        <Panel title={`岗位模型　${list.length} 个`} bodyClass="overflow-auto scroll" extra={<div className="flex items-center gap-2"><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜岗位 / 单位 / 科室" className="hairline px-2 py-0.5 text-[11px] w-[150px] outline-none" /><div className="seg">{(['全部', ...UNIT_GROUPS] as const).map(g => <button key={g} className={grp === g ? 'on' : ''} onClick={() => setGrp(g)}>{g}</button>)}</div></div>}>
          <div className="px-3 pt-2 flex flex-wrap gap-1">{lines.map(l => <button key={l} className={`dim-tab ${line === l ? 'on' : ''}`} onClick={() => setLine(l)}>{l}</button>)}</div>
          <table className="grid mt-1"><thead><tr><th>岗位</th><th>单位 · 科室</th><th>专业线</th><th>能力项</th><th>在岗人数</th><th>达标率</th><th>版本</th><th>更新</th><th>AI 场景</th></tr></thead>
            <tbody>{list.slice(0, 60).map(m => <tr key={m.id} className="cursor-pointer row-in" onClick={() => push({ v: 'postModel', id: m.id })}><td className="font-medium">{m.post}</td><td className="text-slate-600">{short(m.unit)} · {m.dept}</td><td><span className="tag">{m.line}</span></td><td className="num">{m.abilities.length}</td><td className="num">{m.people.toLocaleString()}</td><td className="num font-semibold" style={{ color: m.ready >= 85 ? 'var(--ok)' : m.ready >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{m.ready}%</td><td className="num">{m.ver}</td><td className="num text-slate-500" style={m.updated < '2026-04' ? { color: 'var(--bad)' } : {}}>{m.updated}</td><td>{m.scene ? <span className="tag tag-gold">已挂接</span> : <span className="text-slate-300">—</span>}</td></tr>)}</tbody></table>
          {list.length > 60 && <div className="text-[11px] text-slate-400 p-3">显示前 60 个，缩小筛选范围查看更多</div>}
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="各专业线模型达标率"><div className="p-3"><Columns h={120} data={byLine.map(b => ({ label: b.label, v: b.v, color: b.v < 80 ? 'var(--gold)' : undefined }))} max={100} unit="%" /></div></Panel>
          <Panel title="AI 模型体检" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="ai-badge">每周</span>}>
            <div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${stale.length} 个模型超过半年未更新，其中 ${stale.filter(m => m.line === '配电').length} 个配电岗位模型尚未纳入「分布式接入」能力项；${withScene.length} 个岗位已把评估表 AI 场景转为能力项。建议优先复核以下模型。`} speed={7} /></div>
              <div className="mt-2 space-y-1">{stale.slice(0, 5).map(m => <button key={m.id} onClick={() => push({ v: 'postModel', id: m.id })} className="a-card w-full text-left"><div className="flex items-center gap-2 text-[12px]"><span className="tag tag-warn">待复核</span><span className="font-medium truncate">{m.post}</span><span className="ml-auto num text-[10.5px] text-slate-400">{m.updated}</span></div><div className="text-[10.5px] text-slate-500 mt-0.5">{short(m.unit)} · {m.dept}</div><span className="go">›</span></button>)}</div>
              <button className="btn btn-primary btn-sm w-full mt-2" onClick={() => toast('已对 5 个模型发起复核任务，指派至各专业部门')}>发起批量复核</button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：岗位模型详情 ---------- */
export function PostModelView({ id }: { id: string }) {
  const { push, toast, jump } = useNav()
  const m = postModelById(id) ?? POST_MODELS[0]
  const u = unitOf(m.unit) ?? UNITS[0]
  const grades = FUNC_GRADES.includes(Object.keys(m.abilities[0].lines)[0]) ? FUNC_GRADES : PROD_GRADES
  const cells = m.abilities.map(a => grades.map(g => a.lines[g] ?? GRADE_LINE[g]))
  const gradeDist = grades.map((g, i) => ({ label: g, v: Math.round(m.people * [.14, .28, .31, .19, .08][i % 5] / [.14, .28, .31, .19, .08].slice(0, grades.length).reduce((a, b) => a + b, 0)) }))
  const scene = u.scenes.find(s => s.post === m.post) ?? u.scenes[0]
  const sameLine = POST_MODELS.filter(x => x.line === m.line && x.id !== m.id).slice(0, 6)
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className="tag">{m.line}</span><span className="tag">{m.ver}</span><span className="num text-[11px] text-slate-500 ml-auto">更新 {m.updated}</span></div><div className="text-[18px] font-semibold serif mt-1">{m.post}</div><div className="text-[11.5px] text-slate-500">{short(m.unit)} · {m.dept} · 在岗 {m.people.toLocaleString()} 人</div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">{[['达标率', `${m.ready}%`], ['能力项', `${m.abilities.length} 项`], ['关联课程', `${m.abilities.reduce((s, a) => s + a.courses, 0)} 门`]].map(([k, v], i) => <div key={k} className="hairline py-2"><div className={`num text-[17px] font-semibold ${i === 0 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>)}</div></div>
        <Panel title="能力项 × 等级要求线" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入能力项定义</span>}>
          <div className="p-3"><Heatmap rows={m.abilities.map(a => `${a.k} · ${a.w}%`)} cols={grades} cells={cells} cellH={30} rowW={130} colorOf={v => heat(v)} onCell={r => push({ v: 'abilityDef', id: m.id, k: m.abilities[r].k })} /></div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="能力项与关联资源" className="flex-1" bodyClass="overflow-auto scroll">
          <table className="grid"><thead><tr><th>能力项</th><th>权重</th><th>来源</th><th>课程</th><th>陪练</th><th>题目</th></tr></thead>
            <tbody>{m.abilities.map(a => <tr key={a.k} className="cursor-pointer" onClick={() => push({ v: 'abilityDef', id: m.id, k: a.k })}><td className="font-medium">{a.k}</td><td className="num">{a.w}%</td><td className="text-slate-500 text-[11px]">{a.src}</td><td className="num">{a.courses}</td><td className="num" style={a.coaches === 0 ? { color: 'var(--bad)' } : {}}>{a.coaches}</td><td className="num">{a.questions}</td></tr>)}</tbody></table>
          <div className="p-3 hair-t"><div className="text-[11px] text-slate-500 mb-1.5">在岗人员等级分布</div><Columns h={100} data={gradeDist} /></div>
        </Panel>
        <Panel title="同专业线其他岗位"><div className="p-2 flex flex-wrap gap-1">{sameLine.map(x => <button key={x.id} className="chip" onClick={() => push({ v: 'postModel', id: x.id })}>{x.post} · {short(x.unit)}</button>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 模型建议" extra={<span className="ai-badge">场景驱动</span>}>
          <div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={scene ? `评估表中「${scene.name}」（${scene.pri} · ${scene.score} 分）对应本岗位，建议新增能力项「${scene.tech.split(/[、，/]/)[0]}应用」，权重 8%，并把 ${m.abilities.filter(a => a.coaches === 0).map(a => a.k).join('、') || '现有能力项'} 补齐陪练科目。同专业线 ${sameLine.length} 个岗位可同步复用。` : `本模型 ${m.abilities.filter(a => a.coaches === 0).length} 个能力项尚无陪练科目，建议从操作票生成教练；要求线沿用公司标准。`} speed={7} /></div>
            <div className="mt-2 space-y-1.5">
              <button className="act-btn" onClick={() => toast('已新增能力项草案，待专业部门确认')}><span className="ic">增</span>采纳新增能力项<small>生成 {m.ver} → v{parseInt(m.ver.slice(1)) + 1}</small></button>
              <button className="act-btn gold" onClick={() => { toast('已按操作票生成教练草案'); jump('coach', 'editor') }}><span className="ic">练</span>为缺失项生成陪练<small>教练编辑器</small></button>
              <button className="act-btn" onClick={() => { toast('已发起课程生成任务'); jump('factory', 'gen') }}><span className="ic">课</span>为本岗位生成课程<small>课程工厂</small></button>
              <button className="act-btn gold" onClick={() => push({ v: 'unitDetail', name: m.unit })}><span className="ic">看</span>查看在岗人员达标<small>{short(m.unit)}</small></button>
            </div>
          </div>
        </Panel>
        <Panel title="版本记录" className="flex-1"><div className="p-3 space-y-2 text-[11.5px]">{[[m.ver, m.updated, '按新版规程复核要求线；新增 AI 场景能力项'], [`v${Math.max(1, parseInt(m.ver.slice(1)) - 1)}`, '2025-11-06', '年度复核，调整权重'], ['v1', '2024-06-18', '首版，来自岗位说明书与安规']].slice(0, parseInt(m.ver.slice(1))).map(([v, d, n]) => <div key={v} className="flex gap-2"><span className="tag shrink-0">{v}</span><div><div className="num text-[10.5px] text-slate-400">{d}</div><div>{n}</div></div></div>)}</div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：能力项定义 ---------- */
export function AbilityDef({ id, k }: { id: string; k: string }) {
  const { toast, jump } = useNav()
  const m = postModelById(id) ?? POST_MODELS[0]
  const a = m.abilities.find(x => x.k === k) ?? m.abilities[0]
  const grades = Object.keys(a.lines)
  const dist = ['< 60', '60–70', '70–80', '80–90', '≥ 90'].map((label, i) => ({ label, v: Math.round(m.people * [.06, .14, .3, .34, .16][i] * (i < 2 && m.ready < 75 ? 1.4 : 1)), color: i < 2 ? 'var(--bad)' : undefined }))
  const defs: Record<string, string> = { 倒闸操作: '按操作票逐项执行设备状态转换，含拟票、模拟预演、监护复诵与检查回报。', 异常处置: '在设备异常或事故信号出现时，正确判断、汇报、隔离并恢复，掌握中止操作的时机。', 继电保护: '理解保护配置与定值单，能校核定值单执行结果并分析保护动作报告。', 安全规程: '掌握安规相关章节，能在作业前正确辨识风险并落实安全措施。', 分布式接入: '掌握分布式光伏并网流程、反送电判断与台区电压越限处置。', 'AI 工具应用': '能在本岗位工作中使用知识助手、问数与陪练工具完成日常任务。' }
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className="tag">{m.post}</span><span className="tag tag-gold">权重 {a.w}%</span><span className="text-[11px] text-slate-500 ml-auto">{a.src}</span></div><div className="text-[18px] font-semibold serif mt-1">{a.k}</div><div className="text-[12.5px] leading-relaxed mt-2">{defs[a.k] ?? `${a.k}是${m.post}的核心能力项之一，依据${a.src}设定要求线，通过陪练、考试与带教评价综合评定。`}</div></div>
        <Panel title="各等级要求线"><div className="p-3"><Columns h={110} data={grades.map(g => ({ label: g, v: a.lines[g] }))} max={100} /></div></Panel>
        <Panel title="评价方式" className="flex-1"><div className="p-3 text-[12px] space-y-1.5"><Field k="证据来源与权重" v="陪练得分 40% · 考试 30% · 课程完成 15% · 带教评价 15%" /><Field k="有效期" v="陪练与考试证据 12 个月内有效，超期按 80% 折算" /><Field k="达标判定" v={`连续两次证据均达要求线，或最近一次 ≥ 要求线 + 5`} /></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`在岗人员得分分布　${m.people.toLocaleString()} 人`}><div className="p-3"><Columns h={120} data={dist} /><div className="text-[10.5px] text-slate-500 mt-1">红色为未达要求线区间</div></div></Panel>
        <Panel title="关联资源" className="flex-1"><div className="p-3"><Bars data={[{ label: '课程', v: a.courses }, { label: '陪练科目', v: a.coaches, note: a.coaches === 0 ? '缺失' : undefined }, { label: '题目', v: Math.round(a.questions / 10), note: undefined }]} unit="" /><div className="text-[10.5px] text-slate-500 mt-1">题目按 10 道折算 1 单位</div>
          <div className="mt-3 space-y-1.5">
            <button className="act-btn" onClick={() => jump('hub', 'search', { v: 'search', q: a.k })}><span className="ic">搜</span>检索规程条款<small>知识中枢</small></button>
            <button className="act-btn gold" onClick={() => jump('factory', 'lib')}><span className="ic">课</span>查看关联课程<small>课程库 · {a.courses} 门</small></button>
            <button className="act-btn" onClick={() => jump('factory', 'bank')}><span className="ic">题</span>查看题目<small>题库 · {a.questions} 道</small></button>
          </div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 生成" extra={<span className="ai-badge">一键</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${a.k}有 ${dist[0].v + dist[1].v} 人未达要求线。${a.coaches === 0 ? '尚无陪练科目，建议从操作票生成一个教练，情景覆盖失分最多的判断项。' : `已有 ${a.coaches} 个陪练科目，建议按未达标人员分布加排 2 期集训。`}`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast(`已生成 ${a.k} 情景题 20 道，待审核`); jump('factory', 'bank') }}><span className="ic">题</span>生成 20 道情景题<small>题库工作台</small></button><button className="act-btn gold" onClick={() => { toast('已生成陪练脚本草案'); jump('coach', 'editor') }}><span className="ic">练</span>生成陪练脚本<small>教练编辑器</small></button><button className="act-btn" onClick={() => { toast('已加入未达标人员的学习计划'); jump('plan', 'idp') }}><span className="ic">划</span>写入未达标人员计划<small>{dist[0].v + dist[1].v} 人</small></button></div></div></Panel>
        <Panel title="达标率" className="flex-1"><div className="p-4 flex flex-col items-center gap-1"><Ring v={Math.round(100 - (dist[0].v + dist[1].v) / m.people * 100)} size={110} color="var(--ai)" sub="本能力项" /><div className="text-[11px] text-slate-500">模型整体 {m.ready}%</div></div></Panel>
      </div>
    </div>
  )
}
