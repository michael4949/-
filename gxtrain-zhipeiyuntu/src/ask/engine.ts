/* 问答引擎：意图识别 → 范围与口径 → 取数或检索 → 生成回答、图表、下钻、动作与追问
   数据问答对任意单位、班组、个人与任一指标即时生效；知识问答走知识资产中枢的语义检索 */
import { ASK_BANK, BUREAUS } from '../data'
import type { AskQA } from '../data'
import { ASSETS, searchAssets, assetById } from '../hub/data'
import { UNITS } from '../units'
import { METRICS, findMetric, metricValue, unitRows, bureauRows, teamRows, personRows, monthSeries, roleById, unitShort, SKILLS } from './data'
import type { Metric, Skill } from './data'

export type Cite = { id?: string; t: string; s: string; m?: string }
export type ChartSpec = { type: 'bar' | 'line' | 'donut'; title: string; unit?: string; data: { label: string; v: number; note?: string }[] }
export type DrillRow = { name: string; short: string; grp: string; n: number; v: number; trend: number }
export type Drill = { metric: string; dim: '单位' | '地市局' | '班组' | '个人' | '科室' | '月份'; key: string; rows: DrillRow[]; note: string }
export type Action = { k: string; d: string; node: string; tab: string; route?: { v: string; [k: string]: unknown }; skill?: string }
export type Answer = {
  id: string; q: string; kind: '知识' | '数据' | '混合' | '动作' | '未命中'; text: string; think: string[]; refs: Cite[]; chart?: ChartSpec; drill?: Drill; follow: string[]; actions: Action[]
  metric?: string; caliber?: { name: string; formula: string; src: string; freq: string; scope: string; owner: string }; skill?: string; confidence: number; scope: string
  retrieved?: { id: string; title: string; score: number; why: string; kind: string }[]; exec?: { steps: string[]; result: string; params: { k: string; v: string }[] }; ms: number
}
export type Ctx = { metric?: string; key?: string; dim?: Drill['dim'] }

let seq = 0
const norm = (s: string) => s.replace(/[？?，。、！!：:；;（）()\s"“”]/g, '')
const ANCHOR: Record<string, string> = { '附录G-5': 'KZ-2411', '附录G-23': 'GC-1244', '细则十八条': 'GC-0871', '细则 第十八条': 'GC-0871', '细则 第九条': 'GC-5102', '办法 第十五条': 'GC-5203', '办法 第十七条': 'GC-5203', '办法 第二十六条': 'AL-5108', '细则 第八条': 'BZ-5204', '规范 6.3': 'GC-5301', '规范 8.2': 'KZ-5320', '规范 附录 B': 'GC-5301', '规定 第三十二条': 'GC-5401', '规定 第四十五条': 'BZ-5408', '通报 2026-11 号': 'AL-0442', '风险条目 9': 'KZ-2411', '附录F 2.11.3 q）': 'BZ-1180', '岗位诀窍 KZ-2411': 'KZ-2411', '岗位诀窍 KZ-5106': 'KZ-5106', '岗位诀窍 KZ-5210': 'GC-5203', '岗位诀窍 KZ-5320': 'KZ-5320', '岗位诀窍 KZ-5410': 'GC-5401', '作业步骤 BZ-5204': 'BZ-5204', '作业步骤 BZ-5408': 'BZ-5408', '典型案例 AL-5108': 'AL-5108', '典型案例 AL-5312': 'AL-5312', '细则 附表二': 'GC-5102', '职教经费 4.2': 'GC-5102', '细则 附表一': 'GC-5401', '验电与接地': 'GC-1244' }
const citeOf = (t: string, s: string): Cite => {
  const id = ANCHOR[t] ?? ASSETS.find(a => a.src.includes(s) || a.anchor === t || a.title.includes(s.slice(0, 6)))?.id
  return { id, t, s }
}
/* 指标对应的制度依据，点出处进中枢看原文 */
const METRIC_SRC: Record<string, string[]> = {
  ready: ['GC-5120', 'GC-5121'], pass: ['GC-5121', 'BZ-5112'], coach: ['GC-5120', 'BZ-5112'],
  hours: ['BZ-5112', 'BZ-5110'], done: ['BZ-5112', 'GC-5120'], plan: ['BZ-5110', 'BZ-5112'],
  cert: ['GC-5122', 'GC-5120'], budget: ['GC-5102', 'KZ-5106'], rating: ['BZ-5110', 'BZ-5112'],
  trainer: ['BZ-5110', 'GC-5121'], ai: ['BZ-5110', 'BZ-5112'], hit: ['BZ-5110', 'GC-5120'],
}
/* 数据类回答的出处：指标口径条目（进数据口径中心看血缘）+ 中枢里对应的制度依据（进条目看原文） */
function dataCites(m: Metric, roleId: string): Cite[] {
  const out: Cite[] = [{ m: m.id, t: `指标口径 · ${m.name}`, s: `${m.src} · 更新 ${m.freq}` }]
  const ids = METRIC_SRC[m.id] ?? []
  ids.map(id => assetById(id)).filter((a): a is NonNullable<typeof a> => !!a)
    .filter(a => roleId === 'dept' || a.sens !== '敏感')
    .forEach(a => out.push({ id: a.id, t: a.anchor !== '—' ? a.anchor : a.id, s: a.src }))
  if (out.length === 1) {
    searchAssets(`${m.name} ${m.aliases.slice(0, 3).join(' ')}`)
      .filter(h => (roleId === 'dept' || h.asset.sens !== '敏感') && (h.asset.kind === '规程条款' || h.asset.kind === '作业步骤'))
      .slice(0, 2).forEach(h => out.push({ id: h.asset.id, t: h.asset.anchor !== '—' ? h.asset.anchor : h.asset.id, s: h.asset.src }))
  }
  return out
}
export const scopeOf = (roleId: string) => {
  const r = roleById(roleId)
  return { dept: '全公司 · 28 个一级单位', spec: '柳州供电局 · 本单位', lead: '南宁供电局 · 变电管理一所 · 本班组', staff: '本人 · 韦明', fin: '财务部 · 本部门', office: '办公室 · 本部门', cs: '客户服务中心 · 话务班', mat: '物资部 · 本部门' }[roleId] ?? r.scope
}
const ownUnit: Record<string, string> = { dept: '公司', spec: '柳州供电局', lead: '南宁供电局', staff: '南宁供电局', fin: '财务部', office: '办公室', cs: '客户服务中心（95598）', mat: '物资部（供应链管理）' }
const ownTeam: Record<string, string> = { lead: '南宁供电局 · 变电管理一所', staff: '南宁供电局 · 变电管理一所', cs: '客户服务中心 · 话务班' }

function fromBank(qa: AskQA, roleId: string, q: string): Answer {
  const m = findMetric(qa.q + (qa.chartTitle ?? ''))
  const data = qa.kind === '数据'
  const drill = data && m ? buildDrill(m, roleId, q, undefined) : undefined
  return {
    id: `a${++seq}`, q: qa.q, kind: qa.kind === '数据' ? (qa.refs ? '混合' : '数据') : '知识', text: qa.a,
    think: data ? [`识别意图：数据问答${m ? ` · 指标「${m.name}」` : ''}`, `确定范围：${roleById(roleId).name} · ${scopeOf(roleId)}`, `取数口径：${m ? `${m.src} · 更新 ${m.freq}` : '培训与人事数据（管理信息大区）'}`, '生成回答与图表，附口径卡与下钻'] : ['识别意图：知识问答 · 规程与制度', `检索范围：知识资产中枢 · ${roleById(roleId).name}可见分级`, `命中 ${qa.refs?.length ?? 1} 条出处，按锚点校验现行版本`, '按岗位语境组织回答，附出处与追问'],
    refs: qa.refs ? qa.refs.map(r => citeOf(r.t, r.s)) : (data && m ? dataCites(m, roleId) : []), chart: qa.chart ? { type: 'bar', title: qa.chartTitle ?? '', data: qa.chart } : undefined, drill, follow: qa.follow ?? (m ? [`按${drill?.dim === '单位' ? '班组' : '单位'}看`, '近 12 个月趋势', '导出成报表'] : ['相关的作业步骤是什么？', '有没有典型案例？']),
    actions: data ? [{ k: '导出报表', d: '按月报模板', node: 'ask', tab: 'chat', skill: 'gen_report' }, { k: '生成学习计划', d: '按缺口一键生成', node: 'plan', tab: 'engine', skill: 'gen_plan' }, ...(m && (m.id === 'pass' || m.id === 'coach' || m.id === 'ready') ? [{ k: '下发陪练任务', d: '推送到班组看板', node: 'coach', tab: 'team', skill: 'do_coach' }] : [])] : [{ k: '在中枢查看条目', d: '原文、版本与引用', node: 'hub', tab: 'catalog', route: qa.refs?.[0] ? { v: 'asset', id: citeOf(qa.refs[0].t, qa.refs[0].s).id ?? 'GC-0871' } : { v: 'catalog' } }, { k: '生成课件片段', d: '推送到课程工厂', node: 'factory', tab: 'gen', skill: 'do_course' }, { k: '生成陪练分支', d: '推送到教练编辑器', node: 'coach', tab: 'editor' }],
    metric: m?.id, caliber: m && data ? { name: m.name, formula: m.formula, src: m.src, freq: m.freq, scope: scopeOf(roleId), owner: m.owner } : undefined, confidence: data ? .93 : .96, scope: scopeOf(roleId), ms: 640 + (qa.q.length * 9) % 500,
    retrieved: qa.refs ? qa.refs.map((r, i) => { const c = citeOf(r.t, r.s); return { id: c.id ?? r.t, title: assetById(c.id ?? '')?.title ?? r.s, score: Math.round((.96 - i * .07) * 100) / 100, why: i === 0 ? '锚点直接命中' : '同主题相关条目', kind: assetById(c.id ?? '')?.kind ?? '规程条款' } }) : undefined,
  }
}

function buildDrill(m: Metric, roleId: string, q: string, ctx?: Ctx): Drill {
  const n = norm(q)
  const unitHit = UNITS.find(u => n.includes(unitShort(u.name)) && unitShort(u.name).length >= 3) ?? UNITS.find(u => n.includes(unitShort(u.name).slice(0, 3)) && u.grp !== '地市供电局')
  const bureauHit = BUREAUS.find(b => n.includes(b.slice(0, 2)))
  const wantsBureaus = /各地市局|14个地市局|各局|哪个局|地市局排名/.test(n)
  const wantsUnits = /各单位|所有单位|哪个单位|哪些单位|单位排名|排名|最低|最高|前[几0-9]|后[几0-9]|全公司/.test(n)
  const wantsTeams = /各班组|按班组|哪些班组|班组排名|各所|各科室|按科室/.test(n)
  const wantsPersons = /谁还没|哪些人|按人|每个人|各成员|本班组成员/.test(n)
  const wantsMonths = /趋势|按月|近12个月|逐月|变化/.test(n)
  const key = bureauHit ?? (unitHit ? unitHit.name : ctx?.key)
  if (/^我的|^我|本人/.test(n) && !wantsUnits && !wantsTeams && !wantsPersons) { const who = roleById(roleId).person; return { metric: m.id, dim: '月份', key: who, rows: monthSeries(m, who).map(x => ({ name: x.label, short: x.label, grp: '月份', n: 0, v: x.v, trend: 0 })), note: `本人 · ${who} · 近 12 个月` } }
  if (wantsMonths) { const k = key ?? ownUnit[roleId] ?? '公司'; return { metric: m.id, dim: '月份', key: k, rows: monthSeries(m, k).map(x => ({ name: x.label, short: x.label, grp: '月份', n: 0, v: x.v, trend: 0 })), note: `${unitShort(k)} · 近 12 个月` } }
  if (wantsPersons || roleId === 'lead' && !wantsUnits && !wantsTeams && !key) { const t = ownTeam[roleId] ?? `${unitShort(key ?? '南宁供电局')} · 变电管理一所`; return { metric: m.id, dim: '个人', key: t, rows: personRows(m, t), note: `${t} · 按成员` } }
  if (wantsTeams || (roleId === 'spec' && !wantsUnits && !bureauHit) || (['fin', 'office', 'mat', 'cs'].includes(roleId) && !wantsUnits)) { const u = key ?? ownUnit[roleId]; return { metric: m.id, dim: roleId === 'fin' || roleId === 'office' || roleId === 'mat' ? '科室' : '班组', key: u, rows: teamRows(m, u), note: `${unitShort(u)} · 按${roleId === 'fin' || roleId === 'office' || roleId === 'mat' ? '科室' : '班组'}` } }
  if (wantsBureaus || (bureauHit && /各|排名|对比/.test(n))) return { metric: m.id, dim: '地市局', key: '14 个地市局', rows: bureauRows(m), note: '14 个地市供电局' }
  if (bureauHit) return { metric: m.id, dim: '班组', key: bureauHit, rows: teamRows(m, bureauHit), note: `${bureauHit} · 按班组` }
  if (unitHit && !wantsUnits) return { metric: m.id, dim: unitHit.grp === '本部职能部门' ? '科室' : '班组', key: unitHit.name, rows: teamRows(m, unitHit.name), note: `${unitShort(unitHit.name)} · 按${unitHit.grp === '本部职能部门' ? '科室' : '班组'}` }
  if (roleId === 'staff') return { metric: m.id, dim: '月份', key: '韦明', rows: monthSeries(m, '韦明').map(x => ({ name: x.label, short: x.label, grp: '月份', n: 0, v: x.v, trend: 0 })), note: '本人 · 近 12 个月' }
  return { metric: m.id, dim: '单位', key: '全公司', rows: unitRows(m), note: '28 个一级单位' }
}

function dataAnswer(q: string, roleId: string, m: Metric, ctx?: Ctx): Answer {
  const d = buildDrill(m, roleId, q, ctx)
  const role = roleById(roleId)
  const n = norm(q)
  const outside = !['dept', 'spec'].includes(roleId) && (UNITS.some(u => n.includes(unitShort(u.name)) && unitShort(u.name) !== unitShort(ownUnit[roleId] ?? '')) || BUREAUS.some(b => n.includes(b.slice(0, 2)) && !(ownUnit[roleId] ?? '').startsWith(b.slice(0, 2))))
  if (outside) return { id: `a${++seq}`, q, kind: '数据', text: `这个问题涉及其他单位的数据，超出您当前的数据范围（${scopeOf(roleId)}）。已按您的范围回答：${d.note}的${m.name}为 ${m.fmt(d.rows.reduce((a, r) => a + r.v, 0) / d.rows.length)}${m.unit === '%' ? '' : ' ' + m.unit}。如需跨单位数据，可向培训专责申请授权。`, think: [`识别意图：数据问答 · 指标「${m.name}」`, `范围校验：请求范围超出 ${role.name} 的数据权限`, '按可见范围改写问题并取数', '生成回答，附申请授权入口'], refs: dataCites(m, roleId), drill: d, follow: [`本${d.dim}${m.name}趋势`, '申请跨单位查询权限'], actions: [{ k: '申请授权', d: '发送给培训专责', node: 'ask', tab: 'chat', skill: 'remind' }], metric: m.id, caliber: { name: m.name, formula: m.formula, src: m.src, freq: m.freq, scope: scopeOf(roleId), owner: m.owner }, confidence: .9, scope: scopeOf(roleId), ms: 520 }
  const rows = d.rows
  const avg = rows.reduce((a, r) => a + r.v, 0) / rows.length
  const best = rows[0], worst = rows[rows.length - 1]
  const company = metricValue(m, '公司')
  const single = d.dim === '月份'
  const cur = single ? rows[rows.length - 1].v : avg
  const prev = single ? rows[rows.length - 2].v : avg - (rows.reduce((a, r) => a + r.trend, 0) / rows.length) * .4
  const delta = cur - prev
  const low = rows.filter(r => m.higherBetter ? r.v < (m.id === 'rating' ? 4.2 : 75) : r.v > m.base * 1.4)
  const text = single
    ? `${d.note}的${m.name}为 ${m.fmt(cur)}${m.unit === '%' ? '' : ' ' + m.unit}，较上月${delta >= 0 ? '上升' : '下降'} ${Math.abs(delta).toFixed(1)}${m.unit === '%' ? ' 个百分点' : ' ' + m.unit}；近 12 个月最高 ${m.fmt(Math.max(...rows.map(r => r.v)))}，最低 ${m.fmt(Math.min(...rows.map(r => r.v)))}。${m.higherBetter ? (cur >= company ? '高于' : '低于') : (cur <= company ? '优于' : '弱于')}全公司同期水平（${m.fmt(company)}）。`
    : `${d.note}的${m.name}平均 ${m.fmt(avg)}${m.unit === '%' ? '' : ' ' + m.unit}，${m.higherBetter ? '最高' : '最少'}为${best.short}（${m.fmt(best.v)}），${m.higherBetter ? '最低' : '最多'}为${worst.short}（${m.fmt(worst.v)}）。${low.length ? `${low.length} 个${d.dim}${m.higherBetter ? '低于要求线' : '超出预警线'}：${low.slice(0, 3).map(r => r.short).join('、')}${low.length > 3 ? ' 等' : ''}。` : `全部${d.dim}均在要求线以上。`}${delta >= 0 ? '整体较上月上升' : '整体较上月下降'} ${Math.abs(delta).toFixed(1)}${m.unit === '%' ? ' 个百分点' : ' ' + m.unit}。`
  const chart: ChartSpec = single ? { type: 'line', title: `${m.name} · ${d.note}`, unit: m.unit, data: rows.map(r => ({ label: r.short, v: Math.round(r.v * 10) / 10 })) } : { type: 'bar', title: `${m.name} · ${d.note}（${m.unit}）`, unit: m.unit, data: rows.slice(0, 10).map(r => ({ label: r.short, v: Math.round(r.v * 10) / 10, note: low.includes(r) ? (m.higherBetter ? '待提升' : '预警') : undefined })) }
  const follow = single ? [`${unitShort(d.key)}按${roleId === 'dept' || roleId === 'spec' ? '班组' : '成员'}看`, `全公司${m.name}排名`, '导出成报表'] : d.dim === '单位' ? [`那${unitShort(rows[Math.floor(rows.length / 2)].name)}呢？`, `${worst.short}按班组看`, `${m.name}近 12 个月趋势`, m.higherBetter ? `哪些单位低于 75%` : '哪些单位超出预警'] : [`${worst.short}近 12 个月趋势`, '全公司排名', '导出成报表']
  const actions: Action[] = [{ k: '导出报表', d: '按培训科月报模板', node: 'ask', tab: 'chat', skill: 'gen_report' }]
  if (m.id === 'pass' || m.id === 'coach' || m.id === 'ready') actions.push({ k: `给${worst.short}下发陪练`, d: '推送到班组看板', node: 'coach', tab: 'team', skill: 'do_coach' })
  if (m.id === 'done' || m.id === 'plan' || m.id === 'hours') actions.push({ k: '生成补强学习计划', d: '千人千面计划引擎', node: 'plan', tab: 'engine', skill: 'gen_plan' })
  if (m.id === 'cert') actions.push({ k: '生成复审提醒', d: '推送到移动端', node: 'ask', tab: 'chat', skill: 'remind' })
  actions.push({ k: '看成长地图', d: '按单位能力全景', node: 'map', tab: 'unit' })
  return { id: `a${++seq}`, q, kind: '数据', text, think: [`识别意图：数据问答 · 指标「${m.name}」${ctx?.metric === m.id ? '（沿用上一轮指标）' : ''}`, `确定范围：${role.name} · ${d.note}`, `取数口径：${m.src} · ${m.freq}${m.history[0] ? ` · 最近口径变更 ${m.history[0].date}` : ''}`, `聚合 ${rows.length} 条记录，比对全公司同期与要求线`, '生成回答、图表与下钻，附口径卡'], refs: dataCites(m, roleId), chart, drill: d, follow, actions, metric: m.id, caliber: { name: m.name, formula: m.formula, src: m.src, freq: m.freq, scope: d.note, owner: m.owner }, confidence: .93, scope: scopeOf(roleId), ms: 480 + rows.length * 12 }
}

const SKILL_MATCH: [RegExp, string][] = [[/陪练|对练|重练/, 'do_coach'], [/立项|做成课|生成课程|课程需求|微课/, 'do_course'], [/报名|预约|开班/, 'do_class'], [/知识卡|班前会/, 'gen_card'], [/提醒|到期前/, 'remind'], [/导出|报表|月报|简报/, 'gen_report'], [/学习计划|补强计划|IDP/, 'gen_plan'], [/工单/, 'do_ticket']]
function actionAnswer(q: string, roleId: string, s: Skill): Answer {
  const n = norm(q)
  const unit = UNITS.find(u => n.includes(unitShort(u.name)))
  const who = /本班组|我们班|全班/.test(n) ? (ownTeam[roleId] ?? '本班组') : /给(\S{2,3})(安排|下发|生成)/.test(n) ? (n.match(/给(\S{2,3})(安排|下发|生成)/)?.[1] ?? '本班组') : unit ? unitShort(unit.name) : (ownTeam[roleId] ?? scopeOf(roleId))
  const due = /本周五/.test(n) ? '2026-09-18' : /下周/.test(n) ? '2026-09-25' : /月底/.test(n) ? '2026-09-30' : '2026-09-21'
  const subject = /GIS|四项核对/.test(n) ? 'GIS 四项核对 · 专项' : /验电|接地/.test(n) ? '验电接地 · 专项' : /票令|接令/.test(n) ? '接令与票令核对 · 专项' : /错题/.test(n) ? '错题重练' : /投诉/.test(n) ? '停电投诉受理 · 情景' : '倒闸操作 · 完整票'
  const params = s.id === 'do_coach' ? [{ k: '科目', v: subject }, { k: '对象', v: who }, { k: '截止', v: due }, { k: '模式', v: '考核模式' }] : s.id === 'do_course' ? [{ k: '主题', v: q.replace(/把|立项|做成课|生成课程|成课程|微课|一讲/g, '').replace(/[“”"]/g, '').trim() || '按提问主题' }, { k: '岗位', v: unit ? unit.depts[0]?.posts[0] ?? '相关岗位' : '按提问身份' }, { k: '课时', v: /微课/.test(n) ? '0.5 学时' : '2 学时' }] : s.id === 'do_class' ? [{ k: '课程', v: /AI 带班|班组长/.test(n) ? '用 AI 带班：班前会、考核与经验传承' : /安规/.test(n) ? '安规复训（变电部分）' : '岗位 AI 工具入门（第 7 期）' }, { k: '日期', v: /10-16|16 日/.test(n) ? '10-16' : '10-09' }, { k: '人数', v: '1' }] : s.id === 'gen_card' ? [{ k: '班组', v: who }, { k: '主题', v: /票令/.test(n) ? '票令核对' : '本周错题 + 规程变化' }] : s.id === 'remind' ? [{ k: '事项', v: /证/.test(n) ? '证照复审' : /看板/.test(n) ? '查看班组看板' : '待办提醒' }, { k: '时间', v: /30天/.test(n) ? '到期前 30 天' : /每周一/.test(n) ? '每周一 08:00' : due }] : s.id === 'gen_report' ? [{ k: '内容', v: '上一轮回答的数据与图表' }, { k: '格式', v: /docx|简报/.test(n) ? 'docx 简报' : 'xlsx 报表' }] : s.id === 'gen_plan' ? [{ k: '对象', v: who }, { k: '周期', v: /明年|2027/.test(n) ? '2027 年度' : '未来 12 个月' }] : [{ k: '类型', v: /题库/.test(n) ? '题库补充' : /规程/.test(n) ? '规程修订建议' : '课程立项' }, { k: '来源', v: '热点提问' }]
  const steps = s.id === 'do_coach' ? ['解析对象与科目，匹配教练目录', `校验权限：${roleById(roleId).name}可对${who}下发任务`, '创建任务并写入陪练工作台与班组看板', '推送移动端提醒'] : s.id === 'do_course' ? ['归并相似提问，确认主题与岗位', '检索中枢原料并推荐原料清单', '创建课程需求并推送到生成工作台'] : s.id === 'do_class' ? ['查询开班日历余量', '核对报名条件与冲突', '锁定名额并写入个人日程'] : s.id === 'gen_card' ? ['汇总本周错题与规程变化', '按班前会模板生成一页知识卡', '推送到班组看板'] : s.id === 'remind' ? ['解析事项与时间', '创建提醒并绑定移动端'] : s.id === 'gen_report' ? ['取上一轮回答的数据集', '按月报模板排版并生成文件'] : ['读取能力缺口与晋级目标', '生成学习项并写入 IDP']
  const result = s.id === 'do_coach' ? `已给${who}下发「${subject}」陪练任务，截止 ${due}，${/本班组|全班/.test(n) ? '12 人' : '1 人'}收到提醒。` : s.id === 'do_course' ? `已创建课程需求并推送到课程工厂生成工作台，推荐原料 ${5 + (n.length % 4)} 条。` : s.id === 'do_class' ? `已为您报名，名额已锁定；开班前一天提醒。` : s.id === 'gen_card' ? `已生成${who}本周班前会知识卡，含 3 条错题要点与 1 条规程变化，已推送到班组看板。` : s.id === 'remind' ? '提醒已创建，将推送到 i南网移动端。' : s.id === 'gen_report' ? '报表已生成，可在右侧下载或推送到培训科月报。' : s.id === 'gen_plan' ? `已为${who}生成学习计划，含 7 个学习项、46 学时，并同步写入 IDP。` : '工单已创建并进入培训科待办。'
  return { id: `a${++seq}`, q, kind: '动作', text: result, think: [`识别意图：执行动作 · 技能「${s.name}」`, `解析参数：${params.map(p => `${p.k}=${p.v}`).join('，')}`, `权限校验：${s.roles.join(' / ')}`, '执行并回写业务系统'], refs: [], follow: s.id === 'do_coach' ? ['看本班组陪练完成情况', '再下发一次错题重练'] : s.id === 'do_course' ? ['去生成工作台', '相关的中枢条目有哪些'] : ['查看我的待办', '取消这个动作'], actions: s.go ? [{ k: `打开${s.go.node === 'coach' ? '班组看板' : s.go.node === 'factory' ? '生成工作台' : s.go.node === 'plan' ? '计划引擎' : '开班日历'}`, d: '查看执行结果', node: s.go.node, tab: s.go.tab, skill: s.id }] : [{ k: '查看提醒', d: '待办列表', node: 'ask', tab: 'skills', skill: s.id }], skill: s.id, exec: { steps, result, params }, confidence: .95, scope: scopeOf(roleId), ms: 720 }
}

function knowledgeAnswer(q: string, roleId: string): Answer {
  const hits = searchAssets(q)
  const role = roleById(roleId)
  const visible = hits.filter(h => roleId === 'dept' || h.asset.sens !== '敏感')
  if (!visible.length) return { id: `a${++seq}`, q, kind: '未命中', text: '知识资产中枢暂无与该问题直接匹配的条目。这条提问已记入未命中队列，责任单位确认后会补充条目并回流到助手；您也可以换一种问法，或直接查看相关规程目录。', think: ['识别意图：知识问答', `检索范围：知识资产中枢 · ${role.name}可见分级`, '语义、关键词与图谱三路召回：无满足阈值的条目', '记入未命中队列并聚类'], refs: [], follow: ['相关规程有哪些？', '换个说法再问'], actions: [{ k: '查看知识缺口', d: '未命中聚类与认领', node: 'ask', tab: 'gaps' }, { k: '去中枢检索', d: '语义检索', node: 'hub', tab: 'search', route: { v: 'search', q } }], confidence: 0, scope: scopeOf(roleId), ms: 410, retrieved: [] }
  const top = visible[0].asset, second = visible[1]?.asset
  const text = `${top.summary} ${top.body[0]}${top.body[1] ? ' ' + top.body[1] : ''}${second ? ` 另可参考「${second.title}」：${second.summary}` : ''}`
  return { id: `a${++seq}`, q, kind: '知识', text, think: ['识别意图：知识问答 · 规程、步骤、案例与诀窍', `检索范围：知识资产中枢 · ${role.name}可见分级${hits.length !== visible.length ? ' · 已过滤敏感条目' : ''}`, `三路召回 ${hits.length} 条，融合排序后取前 ${Math.min(3, visible.length)} 条`, '校验出处为现行版本，按岗位语境组织回答'], refs: visible.slice(0, 3).map(h => ({ id: h.asset.id, t: h.asset.anchor !== '—' ? h.asset.anchor : h.asset.id, s: h.asset.src })), follow: [...new Set([...(top.rel.map(id => assetById(id)?.title).filter(Boolean).slice(0, 2).map(t => `${t}是什么要求？`)), '有没有相关的典型案例？', '这条对应的陪练科目是哪个？'])].slice(0, 3), actions: [{ k: '在中枢查看条目', d: '原文、版本与引用', node: 'hub', tab: 'catalog', route: { v: 'asset', id: top.id } }, { k: '生成课件片段', d: '推送到课程工厂', node: 'factory', tab: 'gen' }, { k: '生成陪练分支', d: '推送到教练编辑器', node: 'coach', tab: 'editor' }], confidence: Math.min(.97, .6 + visible[0].score * .05), scope: scopeOf(roleId), ms: 560 + hits.length * 9, retrieved: visible.slice(0, 5).map(h => ({ id: h.asset.id, title: h.asset.title, score: Math.min(.99, Math.round((.55 + h.score * .06) * 100) / 100), why: h.why || '语义相近', kind: h.asset.kind })) }
}

export function answer(q: string, roleId: string, ctx: Ctx): { a: Answer; ctx: Ctx } {
  const n = norm(q)
  const bank = ASK_BANK[roleId] ?? []
  const hit = bank.find(b => norm(b.q) === n) ?? bank.find(b => norm(b.q).includes(n) || n.includes(norm(b.q).slice(0, 6)))
  if (hit) { const a = fromBank(hit, roleId, q); return { a, ctx: a.metric ? { metric: a.metric, key: a.drill?.key, dim: a.drill?.dim } : ctx } }
  const skill = SKILL_MATCH.find(([re]) => re.test(n) && /帮我|给|下发|安排|生成|预约|报名|提醒|导出|做成|立项|创建/.test(n))?.[1]
  if (skill) { const s = SKILLS.find(x => x.id === skill)!; return { a: actionAnswer(q, roleId, s), ctx } }
  let m = findMetric(q)
  const followUp = !m && ctx.metric && (/^那|呢$|按(班组|单位|月|科室|成员|人)看|趋势|排名|哪些.*(低于|超出)|对比/.test(n) || UNITS.some(u => n === unitShort(u.name) || n === unitShort(u.name) + '呢') || BUREAUS.some(b => n.startsWith(b.slice(0, 2))))
  if (followUp) m = METRICS.find(x => x.id === ctx.metric)
  if (m) { const a = dataAnswer(q, roleId, m, followUp ? ctx : undefined); return { a, ctx: { metric: m.id, key: a.drill?.key, dim: a.drill?.dim } } }
  const a = knowledgeAnswer(q, roleId)
  return { a, ctx }
}

/* 输入联想：指标别名、单位名、技能示例与常问问题 */
export function suggest(q: string, roleId: string): string[] {
  const n = norm(q)
  if (!n) return []
  const out: string[] = []
  ;(ASK_BANK[roleId] ?? []).forEach(b => { if (norm(b.q).includes(n)) out.push(b.q) })
  METRICS.forEach(m => { if ([m.name, ...m.aliases].some(a => a.includes(n) || n.includes(a))) m.questions.forEach(x => out.push(x)) })
  UNITS.forEach(u => { const s = unitShort(u.name); if (s.includes(n) || n.includes(s.slice(0, 2))) out.push(`${s}今年人均学时多少？`, `${s}岗位能力达标率多少？`) })
  SKILLS.forEach(s => { if (s.example.includes(n)) out.push(s.example) })
  return [...new Set(out)].slice(0, 6)
}
