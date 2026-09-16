/* 陪练舱引擎：拟票 → 上岗前准备 → 五防模拟 → 逐项执行（五拍闭环）→ 评估报告
   状态集中在 S，所有改动后 bump() 通知 React 重绘；数字人台词经 speak() 按字数计时。 */
import { STEPS, LOC, RISKS, WUFANG, KNOW, PREVIEW, STEPKP } from './script'
import type { Step, Loc } from './script'
import {
  CHARACTERS, MODES, PLANS, DIMN, CUT, AUDIT, DRESS, FHEAD, SEGNAME, devName, NUMREAD, LS, lsSet, lsGet,
  STATION, DISPATCH, DISPATCHER, TASK_TEXT, HOME_USER, wrongSteps,
} from './data'
import type { CharKey, ModeKey, Session, Line, Vio } from './data'

/* ---------------- 类型 ---------------- */
export type Stage = 'idle' | 'fill' | 'prep' | 'wufang' | 'run' | 'end'
export type Pose = 'idle' | 'call' | 'confirm' | 'point' | 'explain' | 'stop' | 'correct' | 'listen' | 'nod'
export type ChatMsg = { who: 'j' | 'o' | 's' | 'd' | 'z'; text: string; cls?: string; id: number }
export type Violation = { level: 'red' | 'major' | 'minor'; dim: string; title: string; detail: string; rule?: string; cut: number; dimn: string; step: string; t: string }
export type Praise = { dim: string; title: string; detail: string; cut: number; dimn: string; t: string }
export type Instr = { i: string; pic: string; t: string; h: string; sel?: string; go?: Loc; n?: string }
export type InspectRow = { k: string; v: string; cls?: string; big?: boolean }
export type RedlineInfo = { title: string; where: string; why: string[]; rule: string; right: string; chain: [string, string][] }
export type FillErr = { g: string; t: string; right: string; why: string; rule: string }
export type FillResult = { total: number; hs: number; ps: number; os: number; errs: FillErr[] }
export type Dlg =
  | { kind: 'entry'; pre: string | null; plan: string; fill: boolean }
  | { kind: 'interlock'; item: string; why: string; rule: string }
  | { kind: 'remote'; st: Step; chosen: 'open' | 'close' | null; ready: boolean; running: boolean; err: string }
  | { kind: 'inspect'; st: Step; title: string; rows: InspectRow[]; lamps?: { names: string[]; on: boolean; color: string }; chks: string[]; on: boolean[]; okTxt: string; after?: () => void }
  | { kind: 'redline'; o: RedlineInfo }
  | { kind: 'abnormal'; cur: number }
  | { kind: 'stop' }
  | { kind: 'know'; cur: string }
  | { kind: 'preview'; phase: number; done: () => void }
  | { kind: 'report' }
  | { kind: 'ask'; q: string; out: { q: string; text: string; src: string; topic: string | null } | null; busy: boolean }
  | { kind: 'demo'; st: Step; i: number }
  | { kind: 'rule'; st: Step }
  | { kind: 'fillAudit'; r: FillResult }

export const S = {
  stage: 'idle' as Stage,
  idx: 0, beat: 0,
  loc: 'phone' as Loc,
  sel: null as string | null,
  gis: {} as Record<string, boolean>,
  dev: { CB1163: 'close', DS11634: 'close', DS11632: 'close', ES116340: 'open', K1QK: '远控', KZK: '远控', M1DK: 'on', M2DK: 'on', M4DK: 'on', M1K2: 'on', M1K1: 'on', M1ZKK: 'on' } as Record<string, string>,
  wfdev: null as Record<string, string> | null,
  tags: {} as Record<string, boolean>,
  verify: { v1: false, v2: false },
  bay: null as string | null,
  key: { down: false },
  prep: { audit: [false, false, false], dress: [false, false, false], mind: false, risks: RISKS.map(() => false) },
  wf: 0,
  msgs: [] as { t: string; x: string; k: string }[],
  chat: [] as ChatMsg[],
  vio: [] as Violation[],
  praise: [] as Praise[],
  score: { rule: 0, order: 0, dual: 0, state: 0, risk: 0, term: 0 } as Record<string, number>,
  fill: { rows: [] as string[], head: {} as Record<string, string>, tries: 0, done: false, score: null as number | null, no: '' },
  fillErr: [] as { g: string; t: string; right: string; rule: string }[],
  filled: false, fillOn: true,
  ord: { unit: '', from: '', to: HOME_USER.name, time: '', issued: '', cur: '' },
  ph: { ring: false, conn: false, cmp: null as null | 'wait' | 'ok' | 'no', pending: '', log: [] as { no: string; phase: number; recv: string; unit: string; from: string; order: string; issued: string; reported: string }[] },
  lastChg: null as string | null, moving: null as string | null,
  abn: { armed: true, fired: false, handled: false },
  trap: { armed: true, fired: false, passed: null as boolean | null },
  t0: 0, stepT0: 0, ended: false, lock: false,
  mode: 'teach' as ModeKey, hintLv: {} as Record<string, number>, hints: [] as { step: string; lv: number; t: string }[], hintCut: 0,
  kpOpen: false, kpSeen: {} as Record<string, boolean>, kpAuto: null as string | null,
  toured: false, warned: {} as Record<string, boolean>, previewed: {} as Record<number, boolean>,
  plan: null as null | { id: string; name: string; steps: number[] },
  lines: [] as Line[], asks: [] as { q: string; t: string; step: string }[], cleanRun: 0,
  /* 界面层 */
  dlg: [] as Dlg[],
  toasts: [] as { id: number; t: string; k: string }[],
  dhKey: 'jianhu' as CharKey,
  dh: { pose: 'idle' as Pose, speaking: false, text: '', who: '', t0: 0, dur: 0, nodAt: 0, shakeAt: 0 },
  sub: { who: '', text: '', live: false },
  sheet: { manual: null as null | 'open' | 'closed' },
  tour: null as null | number,
  peek: null as null | { k: string; nm: string; anomaly: boolean; want: string },
  ticking: null as string | null,
  rinSet: { v: '', seq: 0 },
  demoOpen: false, speed: 1,
  arenaEntered: false, planPre: null as string | null,
}
export type EngineState = typeof S

/* ---------------- 订阅 ---------------- */
let ver = 0
const listeners = new Set<() => void>()
export function bump() { ver++; listeners.forEach(f => f()) }
export function subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
export function getVer() { return ver }

const now = () => new Date().toTimeString().slice(0, 8)
const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toTimeString().slice(0, 5)}` }
export const STEP = (): Step | undefined => STEPS[S.idx]
const tms = (ms: number) => Math.max(20, ms * S.speed)
export const sleepMs = (ms: number) => new Promise<void>(r => setTimeout(r, tms(ms)))
let msgId = 0

/* ---------------- 文本工具 ---------------- */
export function norm(s: string) { return (s || '').replace(/[\s，。、；：？！,.;:?!（）()"'“”‘’·]/g, '') }
function lcs(a: string, b: string) {
  const m = a.length, n = b.length; if (!m || !n) return 0
  let prev = new Array<number>(n + 1).fill(0), cur = new Array<number>(n + 1).fill(0)
  for (let i = 1; i <= m; i++) { for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); [prev, cur] = [cur, prev] }
  return prev[n]
}
export function sim(a: string, b: string) { a = norm(a); b = norm(b); if (!a || !b) return 0; return lcs(a, b) / Math.max(a.length, b.length) }
export function missingSegs(mine: string, std: string) {
  const a = Array.from(mine || ''), b = Array.from(std || '')
  const n = a.length, m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  let i = 0, j = 0, cur = ''; const out: string[] = []
  const flush = () => { if (cur.length >= 2) out.push(cur); cur = '' }
  while (i < n && j < m) { if (a[i] === b[j]) { flush(); i++; j++ } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else { cur += b[j]; j++ } }
  while (j < m) cur += b[j++]
  flush(); return out
}

/* ---------------- 提示 / 对话 / 报文 ---------------- */
export function toast(t: string, k = '') {
  const id = ++msgId; S.toasts.push({ id, t, k }); bump()
  setTimeout(() => { S.toasts = S.toasts.filter(x => x.id !== id); bump() }, 2200)
}
export function say(who: ChatMsg['who'], text: string, cls = '') { S.chat.push({ who, text, cls, id: ++msgId }); if (S.chat.length > 80) S.chat.shift(); bump() }
export function pushMsg(x: string, k = '') { S.msgs.unshift({ t: now(), x, k }); if (S.msgs.length > 40) S.msgs.pop(); bump() }
export function openDlg(d: Dlg) { S.dlg.push(d); bump() }
export function closeDlg(kind?: Dlg['kind']) { S.dlg = kind ? S.dlg.filter(d => d.kind !== kind) : S.dlg.slice(0, -1); bump() }
export function topDlg() { return S.dlg[S.dlg.length - 1] }
export function dlgOf<K extends Dlg['kind']>(kind: K) { return S.dlg.find(d => d.kind === kind) as Extract<Dlg, { kind: K }> | undefined }

/* ---------------- 数字人 ---------------- */
export function pickChar(k: CharKey) {
  if (S.dhKey === k) return
  S.dhKey = k; S.dh.pose = 'idle'; S.dh.speaking = false; bump()
}
let speakTimer: ReturnType<typeof setTimeout> | null = null
export function speak(text: string, opt: { pose?: Pose; nod?: number; shake?: boolean; who?: string; show?: string; rest?: boolean } = {}): Promise<void> {
  if (speakTimer) { clearTimeout(speakTimer); speakTimer = null }
  const who = opt.who || `${CHARACTERS[S.dhKey].role} ${CHARACTERS[S.dhKey].name}`
  const shown = opt.show || text
  const dur = Math.min(6500, Math.max(650, Array.from(text).length * 88)) * S.speed
  S.sub = { who, text: shown, live: true }
  if (opt.pose) S.dh.pose = opt.pose
  if (opt.nod) S.dh.nodAt = Date.now()
  if (opt.shake) S.dh.shakeAt = Date.now()
  S.dh = { ...S.dh, speaking: true, text, who, t0: Date.now(), dur }
  bump()
  return new Promise(res => {
    speakTimer = setTimeout(() => {
      speakTimer = null
      S.dh.speaking = false; S.sub.live = false
      if (opt.pose && opt.rest !== false) S.dh.pose = 'idle'
      bump(); res()
    }, dur)
  })
}
export function stopSpeak() { if (speakTimer) { clearTimeout(speakTimer); speakTimer = null } S.dh.speaking = false; S.sub.live = false; bump() }

/* ---------------- 评分 ---------------- */
export function estScore() {
  const keys = ['rule', 'order', 'dual', 'state', 'risk', 'term']
  if (S.vio.some(v => v.level === 'red')) return 0
  const vals = keys.map(k => Math.max(4, Math.min(100, 100 + Math.min(0, (S.score[k] || 0) * 1.2) + (S.praise.some(p => p.dim === k) ? 6 : 0))))
  return Math.round(vals.reduce((a, b) => a + b, 0) / 6)
}
export function stepRef(st?: Step) { if (!st) return 45; return ({ recv: 60, report: 40, gis: 90, verify: 60, closeE: 70, tag: 40 } as Record<string, number>)[st.act] || 45 }
export function violation(level: 'red' | 'major' | 'minor', dim: string, title: string, detail: string, rule?: string) {
  const cut = CUT[level] || 5
  S.vio.push({ level, dim, title, detail, rule, cut, dimn: DIMN[dim] || dim, step: STEP() ? STEP()!.no : '-', t: now() })
  S.score[dim] = (S.score[dim] || 0) - cut
  const cutTxt = level === 'red' ? `${DIMN[dim]}　一票否决，综合得分记 0` : `${DIMN[dim]} −${cut} 分`
  say('s', `<span class="ctag ${level === 'red' ? 'rl' : 'wn'}">${level === 'red' ? '红线' : level === 'major' ? '严重' : '扣分'}</span>${title}：${detail}<div class="cutln"><b>${cutTxt}</b>${rule ? `<span>依据　${rule}</span>` : ''}</div>`, 'err')
  toast(`${title}　${level === 'red' ? '一票否决' : DIMN[dim] + ' −' + cut}`, 'bad')
}
export function praise(dim: string, title: string, detail: string) {
  S.praise.push({ dim, title, detail, cut: 8, dimn: DIMN[dim] || dim, t: now() })
  S.score[dim] = (S.score[dim] || 0) + 8
  say('s', `<span class="ctag ok">加分</span>${title}：${detail}<div class="cutln ok"><b>${DIMN[dim] || dim} +8 分</b></div>`, 'ok')
}
function lenient(kind: string) { if (S.mode !== 'teach') return false; if (S.warned[kind]) return false; S.warned[kind] = true; return true }

/* ---------------- 指令条 ---------------- */
export function guideSteps() {
  const st = STEP(); if (!st) return [] as { t: string; ok: boolean }[]
  const atLoc = S.loc === st.loc; const g: { t: string; ok: boolean }[] = []
  if (st.act === 'recv') {
    g.push({ t: `前往 ${LOC[st.loc].name}`, ok: atLoc })
    g.push({ t: `监护人接令并与${DISPATCH}互报单位姓名`, ok: !S.ph.ring && S.beat >= 1 })
    g.push({ t: '记录发令单位与发令人', ok: !!(S.ord.unit && S.ord.from) && S.beat >= 1 })
    g.push({ t: '复诵调度下令', ok: S.beat > 1 })
    g.push({ t: '核对票令一致', ok: S.beat > 2 })
  } else if (st.act === 'report') {
    g.push({ t: `前往 ${LOC[st.loc].name}`, ok: atLoc })
    g.push({ t: '复诵向调度汇报的内容', ok: S.beat > 1 })
    g.push({ t: `监护人拨通${DISPATCH}汇报`, ok: S.beat > 3 })
  } else {
    g.push({ t: `前往 ${LOC[st.loc].name}`, ok: atLoc })
    g.push({ t: `手指「${devName(st.target || '')}」`, ok: !!S.sel })
    g.push({ t: '完整复诵票面内容', ok: S.beat > 2 })
    if (st.act === 'gis') { const n = ['hui', 'mech', 'arm', 'line'].filter(k => S.gis[k]).length; g.push({ t: `执行并核对四项位置指示（${n}/4）`, ok: S.beat > 3 && n >= 4 }) }
    else g.push({ t: '监护人发令后执行', ok: S.beat > 3 })
    g.push({ t: '检查设备状态并回报', ok: S.beat > 4 })
  }
  return g
}
export function instrNow(): Instr | null {
  const st = STEP()
  if (S.stage === 'fill') {
    const miss = FHEAD.find(f => !S.fill.head[f.k])
    if (miss) return { i: 'act', pic: 'tick', t: `票头：选择「${miss.n}」`, h: '票头四项要素都要填全', sel: `#pw [data-fh="${miss.k}"]`, n: `先把票头填全，现在选${miss.n}` }
    if (!S.fill.rows.length) return { i: 'act', pic: 'tick', t: '从备选项目里点「＋」写入第一项', h: '只写本次调度令范围内的项目', sel: '#pw [data-fadd]', n: '票面还是空的，从左边把本段项目写进来' }
    return { i: 'act', pic: 'tick', t: '排好顺序后点「提交审核」', h: `已写入 ${S.fill.rows.length} 项`, sel: '#f_go', n: '顺序排好了就点「提交审核」' }
  }
  if (S.stage === 'prep') {
    const ai = S.prep.audit.findIndex(x => !x)
    if (ai >= 0) return { i: 'check', pic: 'tick', t: `三审：点击勾选「${AUDIT[ai].slice(0, 22)}…」`, h: `三审第 ${ai + 1}/3 项`, sel: `.chk[data-p="audit"][data-i="${ai}"]`, n: `先做操作票三审，点第 ${ai + 1} 项打勾` }
    const di = S.prep.dress.findIndex(x => !x)
    if (di >= 0) return { i: 'check', pic: 'tick', t: `着装互检：点击勾选「${DRESS[di].slice(0, 22)}…」`, h: `互检第 ${di + 1}/3 项`, sel: `.chk[data-p="dress"][data-i="${di}"]`, n: `着装互检，点第 ${di + 1} 项打勾` }
    if (!S.prep.mind) return { i: 'speak', pic: 'speak', t: '点击「操作人应答：精神状态良好」', h: '监护人问询，操作人应答', sel: '.chk[data-p="mind"]', n: '回应我的问询，点「精神状态良好」' }
    const ri = S.prep.risks.findIndex(x => !x)
    if (ri >= 0) return { i: 'check', pic: 'tick', t: `风险分析：点击第 ${ri + 1} 条「${RISKS[ri][0]}」展开确认`, h: `已确认 ${S.prep.risks.filter(Boolean).length}/12 条`, sel: `.rk[data-r="${ri}"]`, n: `风险要逐条确认，现在点第 ${ri + 1} 条` }
    return { i: 'act', pic: 'tick', t: '点击「准备完毕，进入五防模拟」', h: '准备项已全部确认', sel: '#p_go', n: '准备项都确认了，点「准备完毕，进入五防模拟」' }
  }
  if (S.stage === 'wufang') {
    if (S.wf < 4) return { i: 'point', pic: 'point', t: `五防模拟第 ${S.wf + 1}/4 步：在模拟接线图上点击「${devName(WUFANG[S.wf][0])}」`, h: WUFANG[S.wf][1] + ' · 顺序错会被闭锁', sel: `#pw [data-dev="${WUFANG[S.wf][0]}"]`, n: `五防模拟按顺序来，现在在接线图上点${devName(WUFANG[S.wf][0])}` }
    return { i: 'listen', pic: 'listen', t: '五防模拟完毕，听监护人核对', h: '' }
  }
  if (S.stage !== 'run' || !st || S.ended) return null
  const teach = S.mode === 'teach'; const away = st.loc !== S.loc
  const tgt = st.target || ''
  if (S.beat === 0) {
    if (st.act === 'recv' && S.ph.ring) return away ? { i: 'walk', pic: 'walk', t: `调度来电：前往${LOC[st.loc].name}`, h: '点「前往」或位置栏闪烁按钮', go: st.loc, n: `${DISPATCH}来电，先到${LOC[st.loc].name}` } : { i: 'act', pic: 'press', sel: '#pw [data-ph="answer"]', t: `${DISPATCH}来电：由监护人接令`, h: '点「监护人接听」，接令与复诵由监护人完成', n: `${DISPATCH}来电，我来接令，你记录并复诵` }
    return { i: 'listen', pic: 'listen', t: '听监护人唱票', h: '唱票完成后进入手指口述', n: '注意听我唱票，准备手指口述' }
  }
  if (S.beat === 1) {
    if (st.act === 'recv') { if (!(S.ord.unit && S.ord.from)) return { i: 'act', pic: 'tick', sel: '#o_unit', t: '在记录簿填写发令单位与发令人', h: `这次下令的是${DISPATCH} ${DISPATCHER}`, n: '把发令单位、发令人记进记录簿' }; return { i: 'speak', pic: 'speak', sel: '#rin', t: '复诵调度下令', h: '设备编号按位念：1163 读"一一六三"，不读"一千一百六十三"', n: '复诵调度下令' } }
    if (st.act === 'report') return { i: 'speak', pic: 'speak', sel: '#rin', t: '复诵本段向调度汇报的内容', h: '复诵后点「复诵」，再由监护人拨号', n: `先复诵汇报内容，我来跟${DISPATCH}联系` }
    if (away) return { i: 'walk', pic: 'walk', t: `前往${LOC[st.loc].name}`, h: '点「前往」或位置栏闪烁按钮', go: st.loc, n: `先到${LOC[st.loc].name}去` }
    if (!S.sel) return { i: 'point', pic: teach ? 'point' : 'press', sel: `#pw [data-dev="${tgt}"]`, t: `手指「${devName(tgt)}」并口述`, h: teach ? '点击设备完成手指口述' : '长按设备完成手指口述', n: `手指${devName(tgt)}，核对设备双重名称` }
    return { i: 'speak', pic: 'speak', sel: '#rin', t: '完整复诵票面内容', h: '复诵后点「复诵」或回车', n: '完整复诵票面内容' }
  }
  if (S.beat === 3 && st.act === 'report') return { i: 'act', pic: 'press', sel: '#pw [data-ph="dial"]', t: `请监护人拨通${DISPATCH}汇报`, h: '点受令席上的「请监护人向调度汇报」', n: `点一下，我来向${DISPATCH}汇报` }
  if (S.beat === 2) {
    if (st.act === 'recv' && S.ph.cmp === 'wait') return { i: 'check', pic: 'tick', sel: '#pw [data-ph="cmp"]', t: '核对操作票任务与调度下令是否一致', h: '一致点「票令一致，接令」；不一致点「中止汇报」', n: '核对票令是不是一致' }
    return { i: 'listen', pic: 'listen', t: '等待监护人核对发令', h: '听到「对，执行」后再操作', n: '等我核对发令后再操作' }
  }
  if (S.beat === 3) {
    const sel = tgt ? `#pw [data-dev="${tgt}"]` : undefined
    if (st.act === 'key') return { i: 'act', pic: teach ? 'act' : 'press', sel, t: '把模拟通过的操作票下传到电脑钥匙', h: '点五防主机右边的电脑钥匙', n: '下传五防钥匙，汇控柜的锁才开得了' }
    if (S.loc === 'hmi' && (st.act === 'open' || st.act === 'pull')) return { i: 'act', pic: teach ? 'act' : 'press', sel, t: `在一次接线图上点击「${devName(tgt)}」，遥控预置、返校后执行`, h: teach ? '点击设备弹出遥控操作' : '长按设备弹出遥控操作', n: '在接线图上遥控' + devName(tgt) }
    if (st.act === 'gis') return { i: 'act', pic: teach ? 'act' : 'press', sel, t: `点击「${devName(tgt)}」查看后台位置，再到现场核对四项指示`, h: teach ? '点击设备查看' : '长按设备查看', n: '先看后台位置，再去现场核对四项指示' }
    if (st.act === 'check' || st.act === 'verify') return { i: 'act', pic: teach ? 'point' : 'press', sel, t: `点击「${devName(tgt)}」，逐项核对后确认`, h: teach ? '点击弹出核对内容' : '长按弹出核对内容', n: '点开' + devName(tgt) + '逐项核对' }
    return { i: 'act', pic: teach ? 'act' : 'press', sel, t: tgt ? `在设备图上执行：${devName(tgt)}` : '按监护人发令执行操作', h: teach ? '点击设备执行' : '长按设备执行', n: '执行操作' }
  }
  if (S.beat === 4) {
    if (st.act === 'gis') { const need: [string, string][] = [['hui', '汇控柜电气指示'], ['mech', '机构箱机械指示'], ['arm', '刀闸拐臂指示'], ['line', '转轴划线标识']]; const nx = need.find(k => !S.gis[k[0]]); if (nx) return { i: 'point', pic: 'point', sel: `#pw [data-dev="gis_${nx[0]}"]`, t: `逐项核对：${nx[1]}（${need.filter(k => S.gis[k[0]]).length}/4）`, h: '点该指示放大查看，自动打钩', n: '核对' + nx[1] } }
    return { i: 'speak', pic: 'report', sel: '#rin', t: '检查设备状态并回报', h: '回报后点「回报」', n: '检查设备状态，向我回报' }
  }
  return { i: 'check', pic: 'tick', t: '本项完成，监护人标"√"', h: '' }
}

/* ---------------- 三级提示 / 知识地图 / 预习 ---------------- */
export async function useHint() {
  const st = STEP(); if (!st) return
  const lv = (S.hintLv[st.no] || 0) + 1
  if (lv > 3) { toast('本项提示已用完'); return }
  S.hintLv[st.no] = lv; S.hints.push({ step: st.no, lv, t: now() })
  const kp = STEPKP[st.no] || { hints: [] as string[] }
  const txt = kp.hints[lv - 1] || ''
  const label = ['方向提示', '要点提示', '标准答案'][lv - 1]
  say('s', `<span class="ctag wn">${label}</span>${txt}`)
  if (lv === 3 && S.beat === 1) setRin(st.recite)
  const hc = lv === 3 ? 4 : lv === 2 ? 2 : 1
  S.score.rule -= hc; S.hintCut += hc; bump()
  await speak(txt, { pose: lv === 3 ? 'correct' : 'explain' })
}
export function setRin(v: string) { S.rinSet = { v, seq: S.rinSet.seq + 1 }; bump() }
export function openKnow(focus?: string) {
  const st = STEP(); const rel = (st && STEPKP[st.no] && STEPKP[st.no].k) || []
  openDlg({ kind: 'know', cur: focus || rel[0] || KNOW[0].id })
}
export function knowRel() { const st = STEP(); return (st && STEPKP[st.no] && STEPKP[st.no].k) || [] }
export function setKnow(id: string) { const d = dlgOf('know'); if (d) { d.cur = id; bump() } }
function openPreview(phase: number, done: () => void) {
  if (!PREVIEW[String(phase)] || S.mode === 'exam') { done(); return }
  openDlg({ kind: 'preview', phase, done })
}
export function previewGo() { const d = dlgOf('preview'); if (!d) return; closeDlg('preview'); d.done() }
export function toggleKp() { const st = STEP(); S.kpOpen = !S.kpOpen; if (st) S.kpAuto = st.no; bump() }
export function kpState() {
  const st = STEP(); if (S.stage !== 'run' || !st || S.mode === 'exam') return null
  const kp = STEPKP[st.no] || { k: [], pts: [], errs: [], hints: [] }
  const fresh = kp.k.filter(id => !S.kpSeen[id])
  if (S.kpAuto !== st.no) { S.kpAuto = st.no; S.kpOpen = S.mode === 'teach' && fresh.length > 0; kp.k.forEach(id => { S.kpSeen[id] = true }) }
  return { kp, fresh, topics: kp.k.map(id => KNOW.find(x => x.id === id)).filter(Boolean) as typeof KNOW, open: S.kpOpen }
}
export function setMode(m: ModeKey) { S.mode = m; toast(MODES[m].n + '：' + MODES[m].d); bump() }

/* ---------------- 界面导览 ---------------- */
export const TOUR: [string, string, string][] = [
  ['#stage', 'AI 数字人陪练教练', '监护人黄志远在这里唱票、发令、纠错。三个角色会随场景自动切换：接令时是南宁地调值班调度员，异常上报时是值班负责人。'],
  ['#beats', '五拍动作闭环', '每一项操作都走这五拍：唱票 → 手指口述 → 对，执行 → 执行 → 检查回报 → 标√。当前进行到哪一拍，这里会亮。'],
  ['#taskbar', '任务指令条', '你现在该做什么，这里永远有答案。做完一步打一个勾。卡住了点「提示」，分三级给到标准答案。'],
  ['#kpbox', '知识点卡', '每一项自动展开：这一项在做什么、常见错在哪、为什么这么做、依据哪一条规程。教学模式下还会直接给出标准话术。'],
  ['#locbar', '七个作业位置', '调度电话、五防电脑、监控后台、间隔现场、屏柜、就地控制柜。需要去哪里，按钮会闪。走错间隔会被判违规。'],
  ['#trows', '现场电气操作票', '30 项票面原文，执行一项标一个"√"。可以点任意一项跳过去，但跳项会被判定。'],
  ['#actbar', '复诵与回报', '手指设备后在这里复诵票面内容，点麦克风可以语音输入。发现异常随时点「中止操作并上报」。'],
]
export function startTour() { S.tour = 0; bump() }
export function tourStep(d: number) { if (S.tour == null) return; const n = S.tour + d; if (n < 0) return; if (n >= TOUR.length) { S.tour = null; S.toured = true } else S.tour = n; bump() }
export function tourEnd() { S.tour = null; S.toured = true; bump() }

/* ---------------- 位置 ---------------- */
export function goLoc(k: Loc) {
  if (S.stage === 'fill') return toast('拟票阶段先把操作票写完并提交审核，签发后再到现场')
  if (S.loc === k) return
  if (k === 'bay') S.bay = null
  S.loc = k; S.sel = null; bump()
  if (k === 'bay' && S.stage === 'run') say('s', 'GIS 现场三个间隔外观一样，先看间隔名称牌，确认是培训三线1163间隔再进去。')
  else if (S.stage === 'run' && STEP() && STEP()!.loc === k && S.beat === 1) say('s', `已到达${LOC[k].name}。请核对间隔名称与设备双重名称后，手指操作对象并复诵。`)
}
export function pickBay(b: string) {
  if (b !== '1163' && S.stage === 'run') {
    violation('major', 'state', '走错间隔', `本项操作对象在培训三线1163间隔，实际站位为培训${b === '1161' ? '一' : '二'}线${b}间隔`, '风险7：到达每一操作地点后，先核对间隔名称和待操作设备双重名称，同时确认图实一致、标实一致。')
    speak('停。你站错间隔了。这里是培训' + (b === '1161' ? '一' : '二') + '线' + b + '间隔，仍在运行中。到每一个操作地点，先核对间隔名称和设备双重名称。', { pose: 'stop', shake: true })
  } else if (b === '1163' && S.stage === 'run') { praise('state', '间隔核对正确', '进入 GIS 现场后先核对间隔名称牌，正确选择培训三线1163间隔'); speak('对，是这个间隔。进去先核对设备双重名称。', { pose: 'confirm', nod: 1 }) }
  S.bay = b; bump()
}
export function targetDev() { const st = STEP(); return (st && S.stage === 'run' && st.loc === S.loc && (S.beat === 1 || S.beat === 3)) ? st.target || null : null }
export function needHold() { return S.stage === 'run' && (S.beat === 1 || S.beat === 3) && S.mode !== 'teach' }

/* ---------------- 调度电话 ---------------- */
export function setOrd(k: 'unit' | 'from', v: string) { S.ord[k] = v; bump() }
export async function answerPhone() {
  if (!S.ph.ring) return
  const st = STEP()!; const call = S.ph.pending
  S.ph.ring = false; S.ph.conn = true; S.ord.time = stamp(); S.ord.issued = ''
  const order = call.replace(/^现在调度下令：/, '').replace(/。$/, '')
  S.ph.log.push({ no: st.no, phase: st.phase, recv: S.ord.time.slice(11), unit: '', from: '', order, issued: '', reported: '' })
  bump()
  pickChar('jianhu'); say('j', `${STATION}，黄志远。`)
  await speak(`${STATION}，黄志远。`, { pose: 'explain', who: '监护人 黄志远' })
  pickChar('diaodu'); say('d', `${DISPATCH}，${DISPATCHER}。` + call)
  await speak(`${DISPATCH}，${DISPATCHER}。` + call, { pose: 'explain', who: `值班调度员 ${DISPATCHER}` })
  S.ord.cur = order; bump()
  pickChar('jianhu'); say('j', order + '。')
  await speak(order + '。', { pose: 'call', who: '监护人 黄志远' })
  pickChar('diaodu'); say('d', '复诵正确。')
  await speak('复诵正确。', { pose: 'explain', nod: 1, who: `值班调度员 ${DISPATCHER}` })
  S.ord.issued = now().slice(0, 5); const lg = S.ph.log[S.ph.log.length - 1]; if (lg) lg.issued = S.ord.issued
  S.ph.conn = false; bump()
  pickChar('jianhu'); say('j', `${HOME_USER.name}，` + call)
  await speak(`${HOME_USER.name}，` + call, { pose: 'call', who: '监护人 黄志远' })
  setBeat(1)
  say('s', '把发令单位、发令人记进记录簿，然后复诵调度下令。')
}
export async function dialPhone() {
  if (S.ph.conn) return
  const st = STEP()!
  S.ph.conn = true; bump()
  pickChar('jianhu'); say('j', `${DISPATCH}，${STATION}黄志远。`)
  await speak(`${DISPATCH}，${STATION}黄志远。`, { pose: 'call', who: '监护人 黄志远' })
  pickChar('diaodu'); say('d', `${DISPATCH}，${DISPATCHER}。`)
  await speak(`${DISPATCH}，${DISPATCHER}。`, { pose: 'explain', who: `值班调度员 ${DISPATCHER}` })
  pickChar('jianhu'); say('j', st.recite + '。')
  await speak(st.recite + '。', { pose: 'call', who: '监护人 黄志远' })
  await doPhone(st)
}
export async function cmpResult(ok: boolean) {
  if (S.ph.cmp !== 'wait' || S.lock) return
  const st = STEP()!
  S.ph.cmp = ok ? 'ok' : 'no'; bump()
  if (st.trap === 'order' && S.trap.fired && S.trap.passed === null) {
    if (!ok) {
      S.trap.passed = true
      praise('rule', '票令不一致识别正确', '调度下令为"由运行转冷备用"，操作票任务为"由热备用转冷备用"，接令时核出并中止汇报')
      say('o', '票令不一致：调度令是"由运行转冷备用"，操作票本段是"由热备用转冷备用"。中止，汇报值班长。')
      pickChar('jianhu')
      await speak('对，票令不一致，不能执行。中止并汇报值班长，请调度核实后重新下令。', { pose: 'confirm', nod: 1, who: '监护人 黄志远' })
    } else {
      S.trap.passed = false
      violation('major', 'rule', '票令不一致未发现', '调度下令为"由运行转冷备用"，操作票任务为"由热备用转冷备用"，票令核对时判为一致', '细则第十八条：接到调度正式指令后，应再次"三审"，核实操作票内容是否与调度正式指令一致。')
      pickChar('jianhu')
      await speak('等一下。刚才调度下的令是"由运行转冷备用"，我们的操作票这一段是"由热备用转冷备用"。票令不一致，必须中止并汇报值班长。这一项你没有核出来。', { pose: 'stop', shake: true, who: '监护人 黄志远' })
    }
    await reissueOrder(); return
  }
  if (!ok) {
    S.ph.cmp = 'wait'; bump()
    if (lenient('cmp')) say('s', '<span class="ctag wn">提醒</span>再对一遍：调度下令与操作票任务是一致的。教学模式下这一次不计违规。')
    else violation('minor', 'rule', '票令核对误判', '调度下令与操作票任务一致，却判为不一致并中止', '细则第十八条：核实操作票内容是否与调度正式指令一致。')
    pickChar('jianhu'); await speak('你再对一遍，调度令和操作票任务是一致的。', { pose: 'correct' }); return
  }
  say('o', '操作票操作任务与调度下令内容一致。')
  pickChar('jianhu'); say('j', '收到。')
  await speak('收到。', { pose: 'confirm', nod: 1, who: '监护人 黄志远' })
  setBeat(3); doPhone(st)
}
async function reissueOrder() {
  S.ord.cur = ''; S.ph.cmp = null; S.ord.issued = ''; S.ph.conn = true
  const lg = S.ph.log[S.ph.log.length - 1]; if (lg) { lg.order = '（作废）' + lg.order; lg.issued = '' }
  bump()
  const fixed = '将110kV培训三线1163线路由热备用转冷备用'
  pickChar('diaodu'); say('d', `${DISPATCH}，${DISPATCHER}。更正：现在调度下令，` + fixed + '。')
  await speak(`${DISPATCH}，${DISPATCHER}。更正：现在调度下令，` + fixed + '。', { pose: 'explain', who: `值班调度员 ${DISPATCHER}` })
  S.ord.cur = fixed; S.ph.log.push({ no: STEP()!.no, phase: STEP()!.phase, recv: now().slice(0, 5), unit: DISPATCH, from: DISPATCHER, order: fixed + '（更正）', issued: '', reported: '' }); bump()
  pickChar('jianhu'); say('j', fixed + '。')
  await speak(fixed + '。', { pose: 'call', who: '监护人 黄志远' })
  pickChar('diaodu'); say('d', '复诵正确。')
  await speak('复诵正确。', { pose: 'explain', nod: 1, who: `值班调度员 ${DISPATCHER}` })
  S.ord.issued = now().slice(0, 5); const lg2 = S.ph.log[S.ph.log.length - 1]; if (lg2) lg2.issued = S.ord.issued
  S.ph.conn = false; bump()
  pickChar('jianhu'); say('j', `${HOME_USER.name}，现在调度下令：` + fixed + '。')
  await speak(`${HOME_USER.name}，现在调度下令：` + fixed + '。', { pose: 'call', who: '监护人 黄志远' })
  setBeat(1); say('s', '记录簿改成更正后的下令，然后重新复诵。')
}
async function doPhone(st: Step) {
  const lg = S.ph.log[S.ph.log.length - 1]
  if (st.act === 'recv') {
    const u = (S.ord.unit || '').trim(), f = (S.ord.from || '').trim()
    if (!u || !f) violation('minor', 'term', '调度记录不完整', '发令单位或发令人未填写', '附录F 2.4／2.5／2.7：发令单位、发令人、受令时间应完整记录在调度操作指令记录簿及操作票相应栏。')
    else if (!/地调/.test(u) || !new RegExp(DISPATCHER).test(f)) violation('minor', 'term', '调度记录有误', `记录簿发令单位"${u}"、发令人"${f}"与来电不符（${DISPATCH} · ${DISPATCHER}）`, '附录F 2.4／2.5：发令单位、发令人应按调度实际下令人如实记录。')
    if (lg) { lg.unit = u; lg.from = f }
    say('o', '调度令已记录：' + (u || '—') + ' ' + (f || '—') + '，受令时间 ' + (S.ord.time || '').slice(11) + '。')
    setBeat(4); await tickStep()
  } else {
    pickChar('diaodu'); say('d', st.report || '收到。')
    await speak('收到。', { pose: 'explain', who: `值班调度员 ${DISPATCHER}`, nod: 1 })
    if (lg) lg.reported = now().slice(0, 5)
    S.ph.conn = false; pickChar('jianhu'); setBeat(4); await tickStep()
  }
}

/* ---------------- 五防模拟 ---------------- */
const WF_LOCK: Record<string, (d: Record<string, string>) => [string, string] | null> = {
  DS11634: d => d.CB1163 !== 'open' ? ['培训三线1163开关在合闸位置，此时拉开11634刀闸属于带负荷拉刀闸', '刀闸没有灭弧能力，必须先断开开关切断负荷电流，再拉刀闸'] : null,
  DS11632: d => d.CB1163 !== 'open' ? ['培训三线1163开关在合闸位置，此时拉开11632刀闸属于带负荷拉刀闸', '刀闸没有灭弧能力，必须先断开开关切断负荷电流，再拉刀闸'] : d.DS11634 !== 'open' ? ['线路侧11634刀闸尚未拉开，先拉开母线侧刀闸，顺序错误', '停电应先拉开线路侧刀闸、再拉开母线侧刀闸，使检修段两侧依次形成明显断开点'] : null,
  ES116340: d => (d.DS11634 !== 'open' || d.DS11632 !== 'open' || d.CB1163 !== 'open') ? ['11634、11632刀闸未全部拉开，线路可能带电，禁止合上116340地刀', '防止带电合接地刀闸'] : null,
}
function wfDev(id: string) {
  const idx = WUFANG.findIndex(x => x[0] === id)
  if (idx < 0) { if (/^(CB|DS|ES)/.test(id)) toast('该设备不在本次操作票内'); return }
  if (idx < S.wf) { toast('该项已模拟完成'); return }
  if (idx === S.wf) { wfClick(idx); return }
  const lk = WF_LOCK[id] ? WF_LOCK[id](S.wfdev || S.dev) : null
  openInterlock(WUFANG[idx][1], lk ? lk[0] : `须先模拟第 ${S.wf + 1} 步「${WUFANG[S.wf][1]}」`, lk ? lk[1] : '按操作票顺序逐项模拟')
}
function openInterlock(item: string, why: string, rule: string) {
  if (dlgOf('interlock')) return
  openDlg({ kind: 'interlock', item, why, rule })
  say('s', `<span class="ctag wn">五防闭锁</span>${item}：${why}。`)
  speak('五防闭锁了。按操作票的顺序来。', { pose: 'correct', shake: true, show: '五防闭锁了。' + why + '。按操作票的顺序来。' })
}
async function wfClick(i: number) {
  if (i !== S.wf) { toast(`须按顺序模拟：请先在接线图上点「${devName(WUFANG[S.wf][0])}」`, 'bad'); return }
  const x = WUFANG[i]
  say('j', x[1] + '（监护人根据操作票操作步骤完整念出）')
  await speak(x[1] + '。', { pose: 'call' })
  say('o', `（移动鼠标至五防电脑屏幕${x[1].replace(/^(断开|拉开|合上)/, '')}处并手指）${x[1]}。`)
  await speak('对，执行。', { pose: 'confirm', nod: 1 })
  if (!S.wfdev) S.wfdev = { ...S.dev }
  S.wfdev[x[0]] = x[0] === 'ES116340' ? 'close' : 'open'; S.lastChg = x[0]; setTimeout(() => { if (S.lastChg === x[0]) { S.lastChg = null; bump() } }, 1800)
  S.wf = i + 1; bump()
  if (S.wf >= 4) {
    say('j', '模拟完毕，检查模拟步骤。')
    await speak('模拟完毕，检查模拟步骤。', { pose: 'explain' })
    say('o', '先断开1163开关，再依次拉开11634、11632刀闸；后合上116340地刀，模拟顺序正确。')
    await speak('正确。前几项操作均在后台执行，暂不下传电脑钥匙，保持后台操作准备。现在开始执行操作票。', { pose: 'explain', nod: 1 })
    startRun()
  }
}

/* ---------------- 遥控 / 核对弹层 ---------------- */
function openRemoteCtl(st: Step) {
  if (dlgOf('remote')) return
  openDlg({ kind: 'remote', st, chosen: null, ready: false, running: false, err: '' })
}
export async function rcChoose(op: 'open' | 'close') {
  const d = dlgOf('remote'); if (!d || d.chosen) return
  const want = d.st.act === 'closeE' ? 'close' : 'open'
  if (op !== want) {
    violation('major', 'order', '遥控操作性质错误', `本项应${want === 'open' ? '分闸' : '合闸'}${devName(d.st.target!)}，选择了${op === 'open' ? '分闸' : '合闸'}`, '附录F 2.11.3：按操作票项目的操作性质执行，遥控操作前核对设备双重名称与操作性质。')
    d.err = '操作性质与票面不符，已拒绝'; bump()
    speak('操作性质选错了。再核对一遍票面。', { pose: 'correct', shake: true }); return
  }
  d.chosen = op; d.err = ''; bump()
  await sleepMs(700)
  if (!dlgOf('remote')) return
  d.ready = true; bump()
}
export async function rcExec() {
  const d = dlgOf('remote'); if (!d || !d.ready || d.running) return
  d.running = true; bump(); await sleepMs(500)
  closeDlg('remote'); doExecute(d.st)
}
function openInspect(st: Step) {
  if (dlgOf('inspect')) return
  const id = st.target || '', d = S.dev
  let title = '', rows: InspectRow[] = [], chks: string[] = [], okTxt = '核对无误', after: (() => void) | undefined
  let lamps: { names: string[]; on: boolean; color: string } | undefined
  if (id === 'hmi_mode') { title = '光字牌 · 运行方式'; rows = [{ k: '母线方式', v: '110kV 1M、2M 并列运行' }, { k: '培训三线1163', v: `开关${d.CB1163 === 'open' ? '分闸' : '合闸'}，11632、11634刀闸${d.DS11634 === 'open' ? '拉开' : '合上'}` }, { k: '告警', v: '无影响本次操作的光字、告警与报文' }]; chks = ['母线运行方式', '1163间隔设备位置', '光字与告警'] }
  else if (id === 'CB1163') { title = '设备详情 · 培训三线1163开关'; rows = [{ k: '位置遥信', v: d.CB1163 === 'open' ? '分闸' : '合闸', cls: d.CB1163 === 'open' ? 'off' : 'on' }, { k: '最近报文', v: (S.msgs[0] || {}).x || '—' }, { k: '三相电流', v: d.CB1163 === 'open' ? 'Ia 0.0 Ib 0.0 Ic 0.0 A' : 'Ia 312 Ib 308 Ic 315 A' }]; chks = ['位置遥信', '变位报文'] }
  else if (id === 'hmi_current') { title = '遥测 · 1163开关三相电流'; const z = d.CB1163 === 'open'; rows = [{ k: 'Ia', v: (z ? '0.0' : '312') + ' A', big: true }, { k: 'Ib', v: (z ? '0.0' : '308') + ' A', big: true }, { k: 'Ic', v: (z ? '0.0' : '315') + ' A', big: true }]; chks = ['A 相', 'B 相', 'C 相'] }
  else if (id === 'hmi_volt') { title = '遥测 · 培训三线线路二次电压'; const z = d.DS11634 === 'open'; rows = [{ k: 'Uab', v: (z ? '0.0' : '99.6') + ' V', big: true }, { k: 'Uo', v: (z ? '0.0' : '0.1') + ' V', big: true }, { k: '结论', v: z ? '二次确无电压（第一种原理）' : '二次有电压' }]; chks = ['Uab', 'Uo'] }
  else if (id === 'bay_plate') { title = '间隔名称牌 · 图实、标实核对'; rows = [{ k: '间隔名称牌', v: '110kV培训三线1163 · 双重名称：培训三线 · 1163', big: true }, { k: '接线图 ↔ 现场实物', v: '汇控柜模拟图与现场设备布置一致' }, { k: '设备标签', v: '11632 · 1163 · 11634 · 116340 标签清晰准确' }]; chks = ['间隔名称牌双重名称', '图实一致', '标实一致']; okTxt = '核对完毕'; after = () => { S.gis.plate = S.gis.draw = S.gis.label = true } }
  else if (id === 'bay_hvdisp') { title = '高压带电显示装置 · 培训三线1163间隔'; lamps = { names: ['A 相', 'B 相', 'C 相'], on: d.DS11634 !== 'open', color: '#b03a2e' }; rows = [{ k: '显示', v: d.DS11634 !== 'open' ? '三相确有电压' : '三相无电压' }]; chks = ['A 相', 'B 相', 'C 相']; okTxt = '核对完毕：三相确有电压'; after = () => { S.gis.hv = true } }
  else if (id === 'cab_hvdisp') { title = '高压带电显示装置 · 间接验电（第二种原理）'; lamps = { names: ['A 相', 'B 相', 'C 相'], on: d.DS11634 !== 'open', color: '#b03a2e' }; rows = [{ k: '显示', v: d.DS11634 === 'open' ? '三相确无电压' : '三相有电压' }, { k: '与后台二次电压', v: S.verify.v1 ? '已核对：两种原理指示均已变化' : '后台二次电压尚未核对', cls: S.verify.v1 ? '' : 'bad' }]; chks = ['A 相', 'B 相', 'C 相']; okTxt = '核对完毕：三相确无电压'; after = () => { S.gis.hvA = S.gis.hvB = S.gis.hvC = true } }
  else if (st.act === 'gis') { title = `${devName(id)} · 后台位置`; rows = [{ k: '后台位置', v: id === 'ES116340' ? '合上' : '拉开', cls: id === 'ES116340' ? 'gnd' : 'off' }, { k: '报文', v: (S.msgs[0] || {}).x || '—' }, { k: '下一步', v: '到现场按设备结构核对汇控柜电气指示、机构箱机械指示、拐臂指示、转轴划线标识' }]; chks = ['后台位置', '报文']; okTxt = '后台已核对，去现场核对四项指示' }
  else { title = devName(id); rows = [{ k: '状态', v: d[id] || '—' }]; chks = ['状态'] }
  openDlg({ kind: 'inspect', st, title, rows, lamps, chks, on: chks.map(() => false), okTxt, after })
}
export function inspToggle(i: number) { const d = dlgOf('inspect'); if (!d) return; d.on[i] = !d.on[i]; bump() }
export function inspOk() { const d = dlgOf('inspect'); if (!d || !d.on.every(Boolean)) return; closeDlg('inspect'); if (d.after) d.after(); doExecute(d.st) }
function gisInspect(k: string) {
  const st = STEP(); const id = (st && st.act === 'gis') ? st.target : 'DS11634'
  S.gis[k] = true
  const anomaly = S.abn.fired && !S.abn.handled && id === 'DS11634' && k === 'mech'
  const want = id === 'ES116340' ? '合上位置' : '拉开位置'
  const nm = ({ hui: '汇控柜电气指示', mech: '机构箱机械指示', arm: '刀闸拐臂指示', line: '转轴划线标识' } as Record<string, string>)[k]
  S.peek = { k, nm, anomaly, want }; bump()
  if (!anomaly) setTimeout(() => { if (S.peek && S.peek.k === k && !S.peek.anomaly) { S.peek = null; bump() } }, tms(2600))
}
export function peekStop() { S.peek = null; bump(); clickStop() }

/* ---------------- 设备点击 ---------------- */
export function devClick(id: string) {
  if (!id) return
  if (S.stage === 'wufang') { wfDev(id); return }
  if (S.stage !== 'run' || S.ended) return
  const st = STEP()!
  if (id.startsWith('gis_')) { if (S.beat >= 3) gisInspect(id.slice(4)); else toast('先手指本项设备并复诵，执行后再逐项核对指示'); return }
  if (id.startsWith('cab_hvdisp_')) { if (S.beat === 4) { S.gis['hv' + id.slice(11)] = true; bump(); return } id = 'cab_hvdisp' }
  if (id === 'bay_draw' || id === 'bay_label') { S.gis[id === 'bay_draw' ? 'draw' : 'label'] = true; bump(); return }
  if (S.beat === 3) {
    if (id !== st.target) {
      violation('major', 'dual', '操作对象错误', `发令对象为 ${devName(st.target || '')}，实际操作 ${devName(id)}`, '风险7：走错间隔、图实不符或标识错误风险。')
      speak('你操作的不是本项设备。请核对双重名称后重新确认。', { pose: 'stop', shake: true }); return
    }
    if (st.act === 'closeE' && !S.key.down) {
      violation('major', 'rule', '未下传电脑钥匙即就地操作', '汇控柜与机构箱的锁具需用电脑钥匙解锁，本次尚未把模拟票下传至电脑钥匙', '附录G-2：就地操作应使用与五防模拟一致的电脑钥匙解锁，严禁未经审批私自解锁。')
      speak('钥匙还没下传，这把锁开不了。回五防电脑把模拟票下传到电脑钥匙，再回来操作。', { pose: 'stop', shake: true }); return
    }
    if (S.loc === 'hmi' && (st.act === 'open' || st.act === 'pull')) { openRemoteCtl(st); return }
    if (st.act === 'check' || st.act === 'verify' || st.act === 'gis') { openInspect(st); return }
    doExecute(st); return
  }
  if (S.beat === 1) {
    if (st.loc !== S.loc) { toast('请先到达 ' + LOC[st.loc].name, 'bad'); return }
    if (id === st.target) {
      S.sel = id
      if (id === 'bay_plate') S.gis.plate = true
      if (id === 'bay_hvdisp') S.gis.hv = true
      bump(); say('o', `（手指${devName(id)}）`); toast('已手指操作对象，请复诵票面内容', 'ok')
    } else if (lenient('point')) {
      say('s', `<span class="ctag wn">提醒</span>手指的不是本项设备。本项要手指的是「${devName(st.target || '')}」。教学模式下这一次不计违规。`)
      speak(`手指的不是本项设备。本项要手指的是${devName(st.target || '')}。口到、眼到、手到，三者必须落在同一个对象上。`, { pose: 'correct' })
    } else {
      violation('minor', 'dual', '手指对象与票面不符', `票面对象为 ${devName(st.target || '')}，手指对象为 ${devName(id)}`, '附录E 变电电气操作行为规范：遵守"手指口述"原则规范唱票复诵，做到口到、眼到、手到。')
      speak('手指的不是本项设备。口到、眼到、手到，三者必须落在同一个对象上。', { pose: 'correct', shake: true })
    }
    return
  }
  if (S.beat === 2 && id === st.target) {
    if (lenient('order')) { say('s', '<span class="ctag wn">提醒</span>监护人还没有发出"对，执行"，此刻不能动设备。教学模式下这一次不计违规。'); speak('等一下，我还没有发令。监护人确认"对，执行"之后你才可以操作。', { pose: 'stop' }); return }
    violation('major', 'dual', '未发出执行令即操作', '监护人尚未确认"对，执行"，操作人已动作设备', '风险4：每一项均执行监护人完整唱票、操作人手指操作对象并复诵、监护人确认"对，执行"后方可操作。')
    speak('本项我还没有发出执行令，不得操作。等我确认"对，执行"。', { pose: 'stop', shake: true }); return
  }
  if (S.beat >= 4) toast('本项已执行，请完成检查回报')
}

/* ---------------- 执行 ---------------- */
function doExecute(st: Step) {
  const d = S.dev; const tg = st.target || ''
  S.lastChg = tg; setTimeout(() => { if (S.lastChg === tg) { S.lastChg = null; bump() } }, 1800)
  switch (st.act) {
    case 'open': d[tg] = 'open'; pushMsg(`${STATION} 培训三线1163开关 分闸 变位`, 'new'); pushMsg(`${STATION} 培训三线1163开关 保护出口 复归`); break
    case 'pull': d[tg] = 'open'; pushMsg(`${STATION} ${tg.slice(2)}刀闸 分闸 变位`, 'new'); break
    case 'closeE':
      if (!(S.verify.v1 && S.verify.v2)) { redlineGround([]); return }
      d[tg] = 'close'; S.moving = 'ES116340'; setTimeout(() => { S.moving = null; bump() }, 2200)
      pushMsg(`${STATION} 培训三线线路侧116340地刀 合闸 变位`, 'new'); break
    case 'knob': d[tg] = d[tg] === '远控' ? '就地' : '远控'; pushMsg(`${STATION} ${devName(tg)} 切至${d[tg]}`); break
    case 'mcb': d[tg] = 'off'; pushMsg(`${STATION} ${devName(tg)} 断开`); break
    case 'tag': S.tags[tg] = true; break
    case 'key': S.key.down = true; pushMsg(`${STATION} 五防主机 模拟操作票下传至电脑钥匙`); break
    case 'check': case 'verify': case 'gis':
      if (st.vd === 1) S.verify.v1 = true
      if (st.vd === 2) S.verify.v2 = true
      break
  }
  if (st.act === 'gis' && tg === 'DS11634' && S.abn.armed && !S.abn.fired) { S.abn.fired = true; pushMsg(`${STATION} 培训三线11634刀闸 位置指示不一致 告警`, 'alm') }
  setBeat(4)
  say('o', st.act === 'check' || st.act === 'gis' ? `（核对${devName(tg)}）` : `（执行：${st.ticket}）`)
  if (st.act === 'gis') { speak('到现场按设备结构逐项核对四项位置指示，四项一致后再回报。', { pose: 'point' }); if (tg !== 'ES116340') goLoc('bay') }
  else speak('执行到位。请检查设备状态并回报。', { pose: 'explain' })
}
export function setBeat(b: number) { S.beat = b; bump() }

export async function enterStep(i: number) {
  const nst = STEPS[i]
  if (nst && !S.previewed[nst.phase]) { S.previewed[nst.phase] = true; if (nst.phase > 1) { openPreview(nst.phase, () => enterStep(i)); return } }
  S.idx = i; S.sel = null; S.gis = {}; S.beat = 0; S.stepT0 = Date.now(); S.kpAuto = null
  const st = STEP()!
  bump()
  if (st.act === 'recv' || st.act === 'report') pickChar(st.act === 'recv' ? 'diaodu' : 'jianhu'); else pickChar('jianhu')
  if (st.loc !== S.loc) {
    say('j', `去${LOC[st.loc].name}。`)
    await speak(`去${LOC[st.loc].name}。`, { pose: 'point' })
    if (S.mode === 'teach') { goLoc(st.loc); say('s', `教学模式：已跟随监护人到达${LOC[st.loc].name}。`) }
  }
  let call = st.call
  if (st.trap === 'order' && S.trap.armed && !S.trap.fired) { S.trap.fired = true; call = '现在调度下令：将110kV培训三线1163线路由运行转冷备用。' }
  S.ph.ring = false; S.ph.conn = false; S.ph.cmp = null
  if (st.act === 'recv') { S.ph.ring = true; S.ph.pending = call; S.ord.issued = ''; bump(); say('s', '调度电话来电。接听后先报出单位和姓名，再听令。'); return }
  say('j', call)
  await speak(call, { pose: 'call', who: '监护人 黄志远' })
  setBeat(1)
  if (st.act === 'report') say('s', `先向监护人复诵本项汇报内容，监护人核对无误后由监护人向${DISPATCH}汇报。`)
  else say('s', `请到 ${LOC[st.loc].name}，手指操作对象「${devName(st.target || '')}」并完整复诵票面内容。`)
}

function checkNumRead(v: string) {
  const r = NUMREAD.find(x => v.indexOf(x[0]) >= 0); if (!r) return
  violation('minor', 'term', '设备编号读法错误', `把 ${r[1]} 读成"${r[0]}"，设备编号应按位报读为"${r[2]}"`, '调度术语：设备编号按位报读，不按数值报读，便于与图纸、标签、五防票逐位核对，也避免与相邻间隔编号听混。')
  pickChar('jianhu'); speak('设备编号要按位报读。1163 念"一一六三"，不念"一千一百六十三"。再念一遍。', { pose: 'correct', shake: true, who: '监护人 黄志远' })
}

export async function submitInput(v: string) {
  if (S.lock) return; S.lock = true
  try { await _submitInput(v) } finally { S.lock = false }
}
async function _submitInput(v: string) {
  v = v.trim(); if (!v) return
  const st = STEP()!
  if (S.beat === 1 || S.beat === 4) S.lines.push({ step: st.no, beat: S.beat, t: st.ticket, mine: v, std: (S.beat === 1 ? st.recite : st.report) || '' })
  if (S.beat === 1) {
    if (st.act !== 'recv' && st.act !== 'report' && !S.sel) {
      say('o', v); violation('minor', 'dual', '只复诵未手指', '复诵前未手指操作对象', '附录E：遵守"手指口述"原则规范唱票复诵，做到口到、眼到、手到。')
      await speak('你只复诵了，没有手指操作对象。请手指设备后再复诵一次。', { pose: 'correct', shake: true }); return
    }
    say('o', v); checkNumRead(v)
    const sc = sim(v, st.recite)
    if (sc < 0.62 && lenient('recite')) {
      say('s', `<span class="ctag wn">提醒</span>复诵与票面不一致（吻合度 ${(sc * 100).toFixed(0)}%）。票面原文：${st.recite}。教学模式下这一次不计违规，请再念一遍。`)
      await speak('复诵与票面不一致。我再念一遍票面，你跟着复诵：' + st.recite, { pose: 'correct' }); return
    }
    if (sc < 0.62) { violation('minor', 'term', '复诵与票面不一致', `复诵内容与票面文字吻合度 ${(sc * 100).toFixed(0)}%`, '风险4：监护人完整唱票、操作人手指操作对象并复诵，监护人确认后方可操作。'); await speak('复诵与票面不一致，请按票面文字完整复诵一次。', { pose: 'correct', shake: true }); return }
    if (sc < 0.86) { violation('minor', 'term', '复诵不完整', '缺少设备双重名称或电压等级等要素', '附录F 2.10：必须注明设备的电压等级，操作项目中设备名称须填写双重称号。'); await speak('基本正确，但不够完整。设备双重名称要念全。本项先继续，记一次不规范。', { pose: 'correct' }) }
    if (st.act === 'recv') {
      pickChar('diaodu'); say('d', '复诵正确。')
      await speak('复诵正确。', { pose: 'explain', nod: 1, who: `值班调度员 ${DISPATCHER}` })
      S.ord.issued = now().slice(0, 5); const lg = S.ph.log[S.ph.log.length - 1]; if (lg) lg.issued = S.ord.issued
      S.ph.cmp = 'wait'; setBeat(2); pickChar('jianhu'); say('s', '请核对操作票任务与调度下令是否一致，在受令席上确认。'); return
    }
    if (st.act === 'report') { pickChar('jianhu'); say('j', '收到。'); await speak('收到。', { pose: 'confirm', nod: 1, who: '监护人 黄志远' }); setBeat(3); say('s', `汇报内容核对无误。请监护人拨通${DISPATCH}汇报。`); return }
    pickChar('jianhu'); say('j', '对，执行。')
    await speak('对，执行。', { pose: 'confirm', nod: 1, who: '监护人 黄志远' })
    setBeat(3); say('s', '已发出执行令。请在设备上执行本项操作。'); return
  }
  if (S.beat === 4) {
    say('o', v); checkNumRead(v)
    if (st.act === 'gis') {
      const got = ['hui', 'mech', 'arm', 'line'].filter(k => S.gis[k]).length
      if (S.abn.fired && !S.abn.handled && st.target === 'DS11634' && S.gis.mech) { redlineAbnormal(); return }
      if (got < 4) { violation('major', 'state', 'GIS位置确认不充分', `仅核对 ${got}/4 项位置指示即回报到位`, '附录G-5：GIS组合电器的刀闸、地刀操作后，应当检查监控后台刀闸位置显示、报文、汇控柜刀闸电气指示、刀闸机构箱机械指示、刀闸拐臂指示、转轴划线标识是否正确。'); await speak('不行。GIS刀闸位置不能只看一两项。汇控柜电气指示、机构箱机械指示、拐臂指示、转轴划线标识，四项都要核对到。', { pose: 'stop', shake: true }); return }
    }
    if (st.vd === 2 && !S.verify.v1) violation('major', 'rule', '验电顺序不完整', '未完成后台二次电压核对即进行第二种原理验电', '附录G-23：不能直接验电的，应有两个及以上非同样原理或非同源的指示且均已同时发生变化。')
    const sc = sim(v, st.report || '')
    if (sc < 0.28) { violation('minor', 'term', '回报要素不全', '未说明设备位置、信号或报文核对结果', '附录G-21.2：操作后应在监控后台核对运行方式与操作结果相符，核对报文与操作过程相符。'); await speak('回报太简单了。要说清楚设备位置、相关信号和报文的核对结果。本项先记一次不规范。', { pose: 'correct' }) }
    await tickStep()
  }
}
async function tickStep() {
  const st = STEP()!; if (st._done) return
  st._done = true
  say('j', '收到。'); await speak('收到。', { pose: 'confirm', nod: 1 })
  S.ticking = st.no; bump(); setTimeout(() => { if (S.ticking === st.no) { S.ticking = null; bump() } }, 1400)
  S.score.rule += 4; S.score.order += 3; S.score.dual += 3; S.score.state += 3; S.score.term += 3
  coachComment(st)
  const order = S.plan ? S.plan.steps : STEPS.map((_, i) => i)
  const nx = order.find(k => !STEPS[k]._done)
  if (nx === undefined) { finish(); return }
  setTimeout(() => enterStep(nx), 400)
}
function coachComment(st: Step) {
  if (S.mode === 'exam') return
  const used = Math.round((Date.now() - (S.stepT0 || Date.now())) / 1000), ref = stepRef(st)
  const vioHere = S.vio.filter(v => v.step === st.no)
  const line = S.lines.filter(l => l.step === st.no && l.beat === 1).pop()
  const sc = line ? sim(line.mine, line.std) : 1
  S.cleanRun = vioHere.length ? 0 : S.cleanRun + 1
  let txt = ''
  if (vioHere.length) txt = `本项记了 ${vioHere.length} 处：${vioHere.map(v => v.title).join('、')}。下一项先看指令卡再动手。`
  else if (sc < 0.86 && line) { const miss = missingSegs(line.mine, line.std); txt = `复诵吻合度 ${Math.round(sc * 100)}%${miss.length ? `，漏了「${miss.slice(0, 2).join('」「')}」` : ''}。设备双重名称与位置要念全。` }
  else if (used > ref * 1.5) txt = `本项用时 ${used} 秒，超出参考 ${ref} 秒较多。到位后先核对间隔名称，再找操作对象。`
  else if (S.cleanRun === 3 || S.cleanRun === 6 || S.cleanRun === 10) txt = `<span class="ctag ok">连续 ${S.cleanRun} 项零失误</span>节奏很稳，保持这个唱票复诵的完整度。`
  if (txt) say('s', `<span class="ctag2">教练点评</span>${txt}`)
}
export function jumpTo(i: number) {
  if (S.stage !== 'run' || S.ended || i === S.idx) return
  if (STEPS[i]._done) { toast('该项已执行完毕'); return }
  if (i < S.idx) { toast('操作票不得回退执行，已执行项不可重做', 'bad'); return }
  const skipped: string[] = []
  for (let k = S.idx; k < i; k++) if (!STEPS[k]._done) skipped.push(STEPS[k].no)
  const t = STEPS[i]
  if (t.redline === 'verify' && !(S.verify.v1 && S.verify.v2)) { S.idx = i; bump(); redlineGround(skipped); return }
  violation('major', 'order', '跳项执行', `跳过第 ${skipped.join('、')} 项，直接执行第 ${t.no} 项`, '附录J 1.4 操作项目有漏项；1.5 操作项目顺序原则错误。附录F 2.13：操作项目完成后由监护人立即标注"√"，不得补打勾或提前打勾。')
  speak('停一下。操作票必须按顺序逐项执行，你跳过了前面的项目。请回到第' + STEPS[S.idx].no + '项。', { pose: 'correct', shake: true })
}

/* ---------------- 红线 / 异常 ---------------- */
function redlineGround(skipped: string[]) {
  violation('red', 'rule', '带电合接地刀闸（一票否决）', '在未完成两种非同源验电的情况下合上116340地刀', '细则第十三条（四）：所有接地操作前均应规范验电，确保"先验电再接地"。附录G-23：不能直接验电的，应有两个及以上非同样原理或非同源的指示且均已同时发生变化，才能确认该设备已无电。')
  STEPS[S.idx]._bad = true
  pickChar('jianhu'); speak('停！你还没有完成验电就要合地刀。这是红线。', { pose: 'stop', shake: true })
  openDlg({ kind: 'redline', o: {
    title: '红线触发 · 未验电即合接地刀闸',
    where: `第 ${STEP()!.no} 项：${STEP()!.ticket}${skipped.length ? `，并跳过了第 ${skipped.join('、')} 项` : ''}`,
    why: ['第17项「检查后台机显示培训三线1163线路二次确无电压」' + (S.verify.v1 ? '已执行' : '未执行'), '第18项「检查培训三线1163间隔高压带电显示装置显示确无电压」' + (S.verify.v2 ? '已执行' : '未执行')],
    rule: '《变电现场电气操作票管理细则》第十三条（四）：所有接地操作前均应规范验电，确保接地刀闸静触头得到安全有效的"先验电再接地"。附录G-23：严格落实"凡触碰必验电、接地后才许可"原则，对于不能直接验电的，按《安规》要求应有两个及以上非同样原理或非同源的指示且均已同时发生变化，才能确认该设备已无电。风险第10条管控措施：GIS设备不具备直接验电条件时，分别核对后台二次电压和高压带电显示装置，确认两种不同原理或非同源指示均已发生应有变化且同时显示无电压后，方可合上116340地刀。',
    right: '先执行第17项核对后台二次电压确无电压，再执行第18项逐相核对高压带电显示装置确无电压；两项交叉核对一致且变化逻辑正确后，方可将ZK切至就地并合上116340地刀。任一指示异常或两种结果不一致，立即中止操作并按变化管理要求上报。',
    chain: [['线路仍带电', '11634刀闸已拉开但线路侧仍有感应电压／对侧未断开时，线路带电'], ['带电合地刀', '接地刀闸在带电状态下合闸，触头间产生金属性短路'], ['相间／对地短路', '短路电流经接地回路入地，产生强烈电弧与冲击'], ['保护动作跳闸', '线路保护、母差保护动作，扩大停电范围'], ['人身与设备后果', '电弧灼伤、GIS设备损坏，构成人为责任事件']],
  } })
}
function redlineAbnormal() {
  violation('red', 'risk', '发现异常未中止操作（一票否决）', '现场机构箱机械指示与监控后台位置显示不一致，仍按后台位置回报到位并继续操作', '细则第十四条（一）：一旦发现设备运动方向异常、五防锁具无法正常开启等问题，应落实"凡变化必上报"要求，立即中止操作并上报至本单位运行部门负责人。')
  STEPS[S.idx]._bad = true
  speak('停！现场指示和后台不一致，你还要往下走？凡变化必上报，必须立即中止。', { pose: 'stop', shake: true })
  openDlg({ kind: 'redline', o: {
    title: '红线触发 · 发现异常未中止上报',
    where: `第 ${STEP()!.no} 项：${STEP()!.ticket}`,
    why: ['监控后台显示 11634 刀闸在拉开位置', '现场机构箱机械指示与后台不一致', '在指示不一致的情况下按后台位置回报"已到位"'],
    rule: '《变电现场电气操作票管理细则》第十四条（一）：一旦发现设备运动方向异常、五防锁具无法正常开启等问题，应落实"凡变化必上报"要求，立即中止操作并上报至本单位运行部门负责人，经综合研判重新核实处置完毕后方可恢复操作。第十四条（二）："五防锁具无法正常开启"应视同已发生"走错间隔"。附录G-21.1：当监控后台存在异常时，运行方式须以现场设备实际位置为准。',
    right: '立即中止操作，不得盲目重试；先汇报值班负责人，并按变化管理要求逐级上报至本单位运行部门负责人；经综合研判、重新核实处置完毕后，返回被中止的操作项目，重新核对后恢复操作。',
    chain: [['刀闸未真正到位', '机械指示与遥信不一致，说明刀闸可能卡涩或未分闸到位'], ['隔离措施不可靠', '检修工作面与带电部位之间未形成有效明显断开点'], ['继续接地操作', '在隔离不可靠的情况下合上接地刀闸'], ['短路与设备损坏', '带电合地刀，引发短路电弧、GIS设备损坏'], ['人身伤害', '检修人员在"已停电"设备上作业，存在触电风险']],
  } })
}
export function redlineClose() {
  closeDlg('redline')
  const st = STEP()!; st._bad = true; S.gis = {}; S.sel = null
  if (S.abn.fired && !S.abn.handled) { openAbnormal(); return }
  setBeat(1); say('s', '本项已记录一票否决。请回到被中止的操作项目，重新核对后按正确顺序执行。')
}
export const ABN_STEPS: [string, string, string][] = [
  ['立即中止操作', '不得盲目重试或强行操作。保持设备现状，不再进行任何操作。', 'stop'],
  ['汇报值班负责人', '向变电管理所当值值班负责人报告：11634刀闸现场机构箱机械指示与后台位置显示不一致。', 'zhiban'],
  ['逐级上报', '按变化管理要求，由值班负责人上报至本单位运行部门负责人。', 'zhiban'],
  ['综合研判与处置', '专业班组到场核实，确认刀闸实际位置并完成处置，出具可恢复操作的结论。', 'zhiban'],
  ['具备恢复条件', '重新核对后台位置、报文、汇控柜电气指示、机构箱机械指示、拐臂与转轴划线标识，全部一致。', 'jianhu'],
]
function openAbnormal() { openDlg({ kind: 'abnormal', cur: 0 }) }
export async function abnormalNext() {
  const d = dlgOf('abnormal'); if (!d) return
  const s = ABN_STEPS[d.cur]; const cur = d.cur
  if (s[2] === 'stop') { pickChar('jianhu'); await speak('立即中止操作，不得盲目重试。保持现状，我们先汇报。', { pose: 'stop', who: '监护人 黄志远' }) }
  else if (cur === 1) { pickChar('zhiban'); await speak('我是值班负责人覃建国。收到你们的汇报，11634刀闸机械指示与后台不一致，我立即按变化管理要求向运行部门负责人上报。', { pose: 'explain', who: '值班负责人 覃建国' }) }
  else if (cur === 3) { pickChar('zhiban'); await speak('专业班组已到场核实，刀闸实际在拉开位置，机构箱指示牌松动已处置完毕，具备恢复操作条件。', { pose: 'explain', who: '值班负责人 覃建国' }) }
  const d2 = dlgOf('abnormal'); if (d2) { d2.cur = cur + 1; bump() }
}
export async function abnormalDone() {
  closeDlg('abnormal'); S.abn.handled = true; S.gis = {}
  pickChar('jianhu'); praise('risk', '异常处置正确', '发现指示不一致后立即中止、汇报值班负责人并逐级上报，处置完毕后恢复操作')
  await speak('处置完毕，具备恢复条件。回到被中止的第11项，重新逐项核对四项位置指示。', { pose: 'explain' })
  setBeat(4); say('s', '异常已处置。请重新核对四项位置指示后回报。')
}
export function clickStop() {
  if (S.stage !== 'run') return
  if (S.abn.fired && !S.abn.handled) { praise('risk', '及时中止上报', '发现设备位置指示不一致，主动中止操作并启动上报流程'); openAbnormal(); return }
  openDlg({ kind: 'stop' })
}
export function stopConfirm() {
  closeDlg('stop')
  violation('minor', 'risk', '无依据中止操作', '当前不存在异常触发条件，中止操作打断作业连续性', '细则第十四条：发现设备运动方向异常、五防锁具无法正常开启等问题时立即中止；中止应有明确依据。')
  speak('这一处没有异常触发条件。中止是对的能力，但要有依据。', { pose: 'correct' })
}

/* ---------------- 准备 / 五防 / 开始 ---------------- */
export function prepToggle(p: 'audit' | 'dress' | 'mind', i: number) {
  if (p === 'mind') S.prep.mind = !S.prep.mind; else S.prep[p][i] = !S.prep[p][i]
  bump()
}
export function riskConfirm(i: number) { if (!S.prep.risks[i]) { S.prep.risks[i] = true; bump() } }
export function prepAll() { S.prep.audit = [true, true, true]; S.prep.dress = [true, true, true]; S.prep.mind = true; S.prep.risks = S.prep.risks.map(() => true); bump() }
export function prepOk() { return S.prep.audit.every(Boolean) && S.prep.dress.every(Boolean) && S.prep.mind && S.prep.risks.every(Boolean) }
async function enterPrep() {
  S.stage = 'prep'; goLoc('phone'); bump()
  say('j', `${HOME_USER.name}，今天我们有一项操作任务：${TASK_TEXT}。开始前先完成三审、着装互检和风险分析。`)
  await speak(`${HOME_USER.name}，今天我们有一项操作任务：${TASK_TEXT}。开始前先完成三审、着装互检和风险分析，逐条确认。`, { pose: 'explain' })
}
let clockTimer: ReturnType<typeof setInterval> | null = null
function startClock() { if (!clockTimer) clockTimer = setInterval(() => { if (S.t0 && ['wufang', 'run'].includes(S.stage)) bump() }, 1000) }
export async function enterWufang() {
  if (!prepOk()) return
  S.stage = 'wufang'; S.t0 = Date.now(); S.wfdev = { ...S.dev }; startClock()
  goLoc('wufang'); bump()
  say('j', '我们进行五防模拟，检查五防主机、电脑钥匙状态正常，并确认五防系统与后台监控设备状态一致。')
  await speak('我们进行五防模拟，检查五防主机、电脑钥匙状态正常，并确认五防系统与后台监控设备状态一致。', { pose: 'explain' })
  say('o', `收到，五防主机、电脑钥匙状态正常，与后台监控设备状态一致。已输入操作任务，${TASK_TEXT.replace('110kV仿真站', '')}。`)
  await speak('正确，开始模拟。请按操作票顺序逐项模拟。', { pose: 'point', nod: 1 })
}
function startRun() {
  S.stage = 'run'; bump()
  const go = () => { enterStep(0) }
  if (S.previewed[1]) return go()
  S.previewed[1] = true; openPreview(1, go)
}
export function openRule() { const st = STEP(); if (st) openDlg({ kind: 'rule', st }) }

/* ---------------- 拟票 ---------------- */
export const fillRight = () => STEPS.filter(s => s.phase === 1)
export const fillWrong = () => ['12', '20', '25', '22.1'].map(no => STEPS.find(s => s.no === no)).filter(Boolean) as Step[]
function wrongWhy(s: Step) {
  const base = `本项属于「${SEGNAME[s.phase]}」段，调度采用逐项令，须再经调度令后才能执行，不应写入本段操作票。`
  if (s.no === '20') return base + '并且接地操作必须在两种原理验电合格之后进行，写在本段等于把接地提到验电之前。'
  if (s.no === '25' || s.no === '22.1') return base + '安全措施（挂牌、断二次电源）属于转检修阶段，本段线路尚未隔离到位。'
  return base
}
export function ticketNo() { if (!S.fill.no) { const d = new Date(); S.fill.no = `${d.getFullYear()}-变电运行-0217` } return S.fill.no }
export function fillHead(k: string, v: string) { S.fill.head[k] = v; bump() }
export function fillAdd(no: string) { S.fill.rows.push(no); bump() }
export function fillMove(i: number, d: number) { const r = S.fill.rows; const j = i + d; if (j < 0 || j >= r.length) return; [r[i], r[j]] = [r[j], r[i]]; bump() }
export function fillDel(i: number) { S.fill.rows.splice(i, 1); bump() }
function fillScore(): FillResult {
  const right = fillRight().map(s => s.no); const rows = S.fill.rows.slice(); const errs: FillErr[] = []
  let hs = 20
  FHEAD.forEach(f => { const v = S.fill.head[f.k]; if (v !== f.ok) { hs -= 5; errs.push({ g: '票头', t: `${f.n}${v ? `填「${v}」` : '未填写'}`, right: f.ok, why: f.why, rule: '附录F 2.4／2.5／2.7：发令单位、发令人、受令人、受令时间应完整、如实记录在调度操作指令记录簿及操作票相应栏。' }) } })
  let ps = 50
  right.filter(no => !rows.includes(no)).forEach(no => { const s = STEPS.find(x => x.no === no)!; ps -= 7; errs.push({ g: '漏项', t: `漏写「${s.ticket}」`, right: `应写在本段第 ${right.indexOf(no) + 1} 项`, why: s.why, rule: s.rule }) })
  rows.filter(no => !right.includes(no)).forEach(no => { const s = STEPS.find(x => x.no === no)!; ps -= 7; errs.push({ g: '多项', t: `多写「${s.ticket}」`, right: '本段不应写入，移出票面', why: wrongWhy(s), rule: s.rule }) })
  ps = Math.max(0, ps)
  let os = 30
  const seq = rows.filter(no => right.includes(no))
  for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) if (right.indexOf(seq[i]) > right.indexOf(seq[j])) { os -= 6; const a = STEPS.find(x => x.no === seq[i])!, b = STEPS.find(x => x.no === seq[j])!; errs.push({ g: '顺序', t: `「${b.ticket}」被排在「${a.ticket}」之后`, right: `应先「${b.ticket}」，再「${a.ticket}」`, why: b.why, rule: b.rule }) }
  os = Math.max(0, os)
  return { total: Math.max(0, hs) + ps + os, hs: Math.max(0, hs), ps, os, errs }
}
export function auditFill() {
  if (!S.fill.rows.length) return toast('票面还是空的，先写入本段操作项目', 'bad')
  if (FHEAD.some(f => !S.fill.head[f.k])) return toast('票头还有未填项，先把发令单位、发令人、受令人、操作任务填完', 'bad')
  S.fill.tries++; const r = fillScore(); openDlg({ kind: 'fillAudit', r })
}
export function finishFill() {
  const d = dlgOf('fillAudit'); if (!d) return; closeDlg('fillAudit')
  S.fill.done = true; S.fill.score = d.r.total; S.ord.unit = ''; S.ord.from = ''
  d.r.errs.slice(0, 3).forEach(e => S.fillErr.push({ g: e.g, t: e.t, right: e.right, rule: e.rule }))
  enterPrep()
}
async function enterFill() {
  S.stage = 'fill'; S.loc = 'phone'; bump()
  say('j', `${HOME_USER.name}，${DISPATCH}预令：${TASK_TEXT}。调度采用逐项令，先拟写第一段——由运行转热备用。`)
  await speak(`${HOME_USER.name}，${DISPATCH}预令：${TASK_TEXT}。调度采用逐项令，你先拟写第一段，由运行转热备用。票头要素填全，项目按执行顺序排，不属于本段的不要写进来。`, { pose: 'explain', who: '监护人 黄志远' })
}

/* ---------------- 进入 / 练习方式 ---------------- */
function applyPreset(ph: number) {
  const d = S.dev
  if (ph >= 2) { d.CB1163 = 'open'; S.ord.cur = '将110kV仿真站110kV培训三线1163线路由运行转热备用' }
  if (ph >= 3) { d.DS11634 = 'open'; d.DS11632 = 'open'; d.K1QK = '就地'; S.ord.cur = '将110kV培训三线1163线路由热备用转冷备用' }
  STEPS.forEach((s, i) => { if (!S.plan!.steps.includes(i)) s._skip = true })
  S.ord.unit = ''; S.ord.from = ''; S.ph.log = []
  if (ph >= 2) S.ph.log.push({ no: '1', phase: 1, recv: '—', unit: DISPATCH, from: DISPATCHER, order: '将110kV仿真站110kV培训三线1163线路由运行转热备用', issued: '—', reported: '—' })
  if (ph >= 3) S.ph.log.push({ no: '9', phase: 2, recv: '—', unit: DISPATCH, from: DISPATCHER, order: '将110kV培训三线1163线路由热备用转冷备用', issued: '—', reported: '—' })
}
export function openEntry(pre: string | null) {
  if (dlgOf('entry')) return
  const plan = (pre && PLANS.some(p => p.id === pre)) ? pre : 'full'
  openDlg({ kind: 'entry', pre, plan, fill: true })
}
export function entrySet(k: 'plan' | 'fill', v: string | boolean) { const d = dlgOf('entry'); if (!d) return; if (k === 'plan') d.plan = v as string; else d.fill = v as boolean; bump() }
export function entryGo() {
  const d = dlgOf('entry'); if (!d) return
  const P = PLANS.find(p => p.id === d.plan)!
  S.fillOn = d.fill
  S.plan = { id: P.id, name: P.n, steps: P.steps() }
  if (P.trap) S.trap.armed = true
  if (P.preset === 'auto') { const ph = Math.min(...S.plan.steps.map(i => STEPS[i].phase)); applyPreset(ph) }
  else if (P.preset) applyPreset(P.preset)
  closeDlg('entry'); S.arenaEntered = true; bump()
  if (P.prep) { if (S.filled || !S.fillOn) enterPrep(); else enterFill() }
  else { S.stage = 'run'; S.t0 = Date.now(); startClock(); S.previewed[STEPS[S.plan.steps[0]].phase] = false; bump(); enterStep(S.plan.steps[0]);  }
}
export function planHasWrong() { return wrongSteps().length > 0 }

/* ---------------- 问教练 ---------------- */
export function retrieve(q: string) {
  const qs = norm(q); const grams = new Set<string>()
  for (let i = 0; i < qs.length - 1; i++) grams.add(qs.slice(i, i + 2))
  let best: { text: string; src: string; topic: string | null } | null = null, bs = 0
  const cur = STEP()
  for (const k of KNOW) k.body.forEach((b, bi) => {
    const tt = norm(k.t), th = norm(b[0]), tb = norm(b[1]); let sc = 0
    grams.forEach(g => { if (tt.includes(g)) sc += 3; if (th.includes(g)) sc += 2; if (tb.includes(g)) sc += 1 })
    if (bi === 0) sc += 2
    if (cur && STEPKP[cur.no] && STEPKP[cur.no].k.includes(k.id)) sc *= 1.25
    if (sc > bs) { bs = sc; best = { text: b[1], src: k.t + '（' + k.sub + '）', topic: k.id } }
  })
  if (cur && S.stage === 'run') { const t = norm(cur.ticket + cur.why + cur.rule); let sc = 0; grams.forEach(g => { if (t.includes(g)) sc++ }); if (sc * 2.2 > bs) best = { text: cur.why, src: cur.rule, topic: (STEPKP[cur.no].k || [])[0] || null } }
  if (!best || bs < 6) best = { text: '这个问题知识库里没有直接对应的条款。你可以问我关于设备状态、三审票令、五防、唱票复诵、验电接地、GIS 位置核对、二次隔离、异常处置、调度记录这九类内容。', src: '知识地图', topic: null }
  return best
}
export function askCoach() { openDlg({ kind: 'ask', q: '', out: null, busy: false }) }
export async function askRun(q: string) {
  const d = dlgOf('ask'); if (!d || !q.trim()) return
  d.q = q; d.busy = true; d.out = null; bump()
  const r = retrieve(q); const st = STEP()
  S.asks.push({ q, t: now(), step: st ? st.no : '-' })
  await sleepMs(420)
  const d2 = dlgOf('ask'); if (!d2) return
  d2.busy = false; d2.out = { q, ...r }; bump()
  speak(r.text.slice(0, 120), { pose: 'explain' })
}
export function askSuggest() {
  const rel = knowRel()
  return rel.length ? KNOW.filter(k => rel.includes(k.id)).flatMap(k => k.body.slice(0, 2).map(b => b[0])) : ['为什么要先验电再接地', 'GIS 刀闸要核对哪四项', '票令不一致怎么办']
}

/* ---------------- 示范 ---------------- */
export function openDemo() { const st = STEP(); if (!st || S.stage !== 'run') return toast('本项没有现场动作可示范'); openDlg({ kind: 'demo', st, i: -1 }); demoGo(0) }
let demoT: ReturnType<typeof setTimeout> | null = null
export function demoGo(k: number, auto = true) {
  const d = dlgOf('demo'); if (!d) return
  if (demoT) { clearTimeout(demoT); demoT = null }
  d.i = Math.max(0, Math.min(3, k)); bump()
  const say0 = demoSteps(d.st)[d.i]
  pickChar('jianhu'); speak(say0.say, { pose: d.i === 1 ? 'point' : 'explain', who: '监护人 黄志远' })
  if (auto && d.i < 3) demoT = setTimeout(() => { if (dlgOf('demo')) demoGo(d.i + 1) }, tms(3400))
}
export function demoClose() { if (demoT) { clearTimeout(demoT); demoT = null } closeDlg('demo') }
export function demoKind(st: Step) {
  if (st.act === 'recv' || st.act === 'report') return 'phone'
  if (st.act === 'open' || st.act === 'pull') return 'remote'
  if (st.act === 'check' || st.act === 'verify') return 'check'
  return ['knob', 'mcb', 'tag', 'closeE', 'gis', 'key'].includes(st.act) ? st.act : 'check'
}
export function demoSteps(st: Step): { pose: string; t: string; say: string }[] {
  const L = LOC[st.loc].name, D = devName(st.target || '')
  const K = demoKind(st)
  const M: Record<string, { pose: string; t: string; say: string }[]> = {
    knob: [
      { pose: 'stand', t: '站位与核对', say: `先站到${L}正面，核对屏柜名称和把手标签，确认是${D}，不是相邻屏上的同名把手。` },
      { pose: 'point', t: '手指口述', say: `伸手指向把手本体，眼睛看着刻字档位，完整念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '握住把手转到位，转到底再松手。把手是有档位的，转不到位会停在中间，回路既不通也不断。' },
      { pose: 'look', t: '检查回报', say: '看指针是不是落在票面要求的刻字上，再回报：把手已切换到位，指示与标识一致。' }],
    mcb: [
      { pose: 'stand', t: '站位与核对', say: `找到${D}，核对空开标签与票面一致，注意同一排空开标签很像，别拉错。` },
      { pose: 'point', t: '手指口述', say: `手指空开本体，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '手柄向下扳到底，听到"咔"一声到位。不要只扳一半，半档位置回路状态不确定。' },
      { pose: 'look', t: '检查回报', say: '看手柄位置和状态字是不是"断开"，再回报：空开已断开，位置与状态指示正确。' }],
    tag: [
      { pose: 'stand', t: '站位与核对', say: '先确认挂牌位置：要挂在可能导致送电的那个操作把手或按钮上，不是挂在柜门上。' },
      { pose: 'point', t: '手指口述', say: `手指挂牌位，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '把"禁止合闸，线路有人工作！"标志牌挂上挂钩，文字朝外。' },
      { pose: 'look', t: '检查回报', say: '检查挂牢、不晃动、不遮挡设备名称和位置指示，再回报挂牌完成。' }],
    closeE: [
      { pose: 'stand', t: '站位与核对', say: '合地刀前先确认两种验电都已完成、电脑钥匙已下传、ZK 把手在就地位置。条件不齐不能按。' },
      { pose: 'point', t: '手指口述', say: `手指合闸按钮，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '按下合闸按钮不松手，直到机构启动。按的同时人站在侧面，不要正对机构。' },
      { pose: 'look', t: '检查回报', say: '全程盯住地刀运动方向、声音和位置指示，走到合闸位置停稳，再回报已合上。' }],
    gis: [
      { pose: 'stand', t: '站位与核对', say: 'GIS 设备看不见触头，位置只能靠指示判断，单一遥信不算数，要核对四项。' },
      { pose: 'point', t: '手指口述', say: `手指设备，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '按顺序看四项：汇控柜电气指示、机构箱机械指示、拐臂指示、转轴划线标识，逐项对照。' },
      { pose: 'look', t: '检查回报', say: '四项一致才算到位。有一项对不上就停下来上报，不要自己判断"应该没问题"。' }],
    remote: [
      { pose: 'stand', t: '站位与核对', say: '先在一次接线图上找到本间隔，核对设备双重名称和当前状态，确认是要操作的那一台。' },
      { pose: 'point', t: '手指口述', say: `手指后台画面上的设备，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '在遥控操作框里先选操作性质，系统自动预置并返校，返校通过后再点执行。选错性质会被判违规。' },
      { pose: 'look', t: '检查回报', say: '看图上变位、光字牌和操作报文三处都刷新，确认与本次操作相符，再回报。' }],
    check: [
      { pose: 'stand', t: '站位与核对', say: `到${L}，先核对间隔名称和设备双重名称，确认站位没错。` },
      { pose: 'point', t: '手指口述', say: `手指要核对的对象，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '逐项看清楚：数值、位置、信号、报文，一项一项对，不要扫一眼就过。' },
      { pose: 'look', t: '检查回报', say: '按看到的实际情况回报，不照抄票面。核对项的价值就在于说出你真正看到了什么。' }],
    phone: [
      { pose: 'stand', t: '站位与核对', say: '受令席前站定，记录簿和操作票都摊开，笔在手上，准备边听边记。' },
      { pose: 'point', t: '手指口述', say: st.act === 'recv' ? '监护人接听后先互报单位姓名，再逐字听令，同时把发令单位、发令人、受令时间记进记录簿。' : `手指票面对应项，念出要汇报的内容：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: st.act === 'recv' ? '向调度逐字复诵下令内容，调度答"复诵正确"才算接令成功。设备编号按位念，1163 念"一一六三"。' : `监护人拨通${DISPATCH}，先互报单位姓名，再按票面内容汇报本段完成情况。` },
      { pose: 'look', t: '检查回报', say: st.act === 'recv' ? '接令后核对操作票任务与调度下令是否一致，不一致就中止并汇报值班长。' : '调度答"收到"后，把汇报时间记进记录簿，本段才算终结。' }],
    key: [
      { pose: 'stand', t: '站位与核对', say: '模拟通过之后，票面顺序才被五防主机认可。下传之前先确认模拟票与操作票一致。' },
      { pose: 'point', t: '手指口述', say: `手指电脑钥匙，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '把电脑钥匙插上主机接口，点下传，等主机提示写入成功再拔下来。' },
      { pose: 'look', t: '检查回报', say: '钥匙里只有这份模拟票的开锁顺序。到现场只有按这个顺序才能解锁，这就是防误的最后一道关口。' }],
  }
  return M[K] || M.check
}

/* ---------------- 收尾 / 报告 ---------------- */
async function finish() {
  S.stage = 'end'; S.ended = true; bump()
  say('j', '所有操作项目已逐项完成并复核正确，操作完毕，向调度汇报。')
  await speak('所有操作项目已逐项完成并复核正确，无跳项、漏项。操作完毕，向调度汇报，并填写操作结束时间。', { pose: 'explain', nod: 1 })
  say('j', '退出五防账号、监控后台账号。')
  await speak('最后一步，退出五防账号和监控后台账号，防止账号被他人继续使用。', { pose: 'point' })
  say('s', `本次陪练结束，用时 ${elapsedText()}，共 ${S.plan ? S.plan.steps.length : STEPS.length} 项，违规 ${S.vio.length} 项。正在生成评估报告。`)
  await speak('本次陪练结束，正在生成评估报告。', { pose: 'explain' })
  openReport()
}
export function elapsedText() { if (!S.t0) return '00:00'; const s = Math.floor((Date.now() - S.t0) / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') }
export function reportData() {
  const dims: [string, string][] = [['rule', '规程符合性'], ['order', '操作顺序与逻辑'], ['dual', '双人核对执行'], ['state', '设备状态核对'], ['risk', '风险辨识与异常处置'], ['term', '调度术语与记录规范']]
  const red = S.vio.some(v => v.level === 'red')
  const vals = dims.map(([k]) => Math.max(4, Math.min(100, 100 + Math.min(0, S.score[k] * 1.2) + (S.praise.some(p => p.dim === k) ? 6 : 0))))
  const total = red ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / 6)
  return { dims, vals, total, red }
}
let reported = false
export function openReport() {
  if (!reported) {
    reported = true
    lsSet(LS.lastvio, S.vio)
    const { vals, total } = reportData()
    const sess: Session = {
      ts: Date.now(), d: 0, plan: S.plan ? S.plan.name : '完整操作票', mode: MODES[S.mode].n,
      dur: Math.max(1, Math.round((Date.now() - (S.t0 || Date.now())) / 60000)), score: total,
      dims: [0, 2, 3, 1, 5, 4].map(i => Math.round(vals[i])),
      vio: S.vio.map(v => ({ lv: v.level, step: v.step, t: v.title, cut: v.cut, dimn: v.dimn, detail: v.detail, rule: v.rule, cite: (v.rule || v.detail || '').split('：')[0].slice(0, 24) } as Vio)),
      hints: S.hints.map(h => ['提示', `第${h.step}项 第${h.lv}级`] as [string, string]), lines: S.lines, praise: S.praise.map(p => ({ title: p.title })),
    }
    const list = lsGet<Session[]>(LS.sessions, []); list.unshift(sess); lsSet(LS.sessions, list.slice(0, 20))
  }
  openDlg({ kind: 'report' })
}
export function genReview() {
  const done = STEPS.filter(s => s._done).length
  const red = S.vio.filter(v => v.level === 'red'), major = S.vio.filter(v => v.level === 'major'), minor = S.vio.filter(v => v.level === 'minor')
  const hints = S.hints.length, asks = S.asks.length
  const p: string[] = []
  p.push(`本次以操作人视角完成「${S.plan ? S.plan.name : '完整操作票'}」，用时 ${elapsedText()}，执行 ${done} 项。`)
  if (red.length) p.push(`触发一票否决 ${red.length} 次：${red.map(v => `第${v.step}项${v.title.replace(/（.*?）/, '')}`).join('；')}。这类错误在现场对应的是人身、设备或电网事故，任何一次都不允许发生，本次评价按否决处理。`)
  else p.push('全程未触碰红线，验电接地顺序与异常处置判断均正确。')
  if (major.length) p.push(`严重扣分 ${major.length} 项，集中在${Array.from(new Set(major.map(v => ({ order: '操作顺序', dual: '双人核对', state: '设备状态核对', rule: '规程符合', risk: '风险辨识', term: '术语记录' } as Record<string, string>)[v.dim]))).join('、')}。${major[0] ? `例如第${major[0].step}项：${major[0].detail}。` : ''}`)
  if (minor.length) p.push(`不规范 ${minor.length} 处，主要是${Array.from(new Set(minor.map(v => v.title))).slice(0, 3).join('、')}，属于习惯问题，多练几次即可固化。`)
  if (S.praise.length) p.push(`值得肯定的是：${S.praise.map(x => x.title).join('、')}。`)
  if (hints || asks) p.push(`过程中使用提示 ${hints} 次、提问 ${asks} 次，说明对${hints > 2 ? '流程顺序' : '个别要点'}还不够熟练，建议在演练模式下再走一遍。`)
  if (S.abn.handled) p.push('发现指示不一致后按"凡变化必上报"处置，这是本次最有价值的表现。')
  return p.join('')
}

/* ---------------- 讲师演示台 ---------------- */
export function demoInjectRed() {
  if (S.stage !== 'run') return toast('请先进入操作票执行阶段', 'bad')
  const i = STEPS.findIndex(s => s.no === '20'); S.verify.v1 = false; S.verify.v2 = false; jumpTo(i)
}
export function demoInjectAbn() {
  S.abn.armed = true; S.abn.fired = true; S.abn.handled = false
  pushMsg(`${STATION} 培训三线11634刀闸 位置指示不一致 告警`, 'alm'); toast('已注入异常：11634刀闸机构箱机械指示与后台不一致', 'bad')
}
export function demoSkip() {
  if (S.stage === 'fill') { S.fill.head = { unit: DISPATCH, from: DISPATCHER, to: '黄志远', task: TASK_TEXT }; S.fill.rows = fillRight().map(x => x.no); bump(); auditFill() }
  else if (S.stage === 'prep') { prepAll(); enterWufang() }
  else if (S.stage === 'wufang') { S.wf = 4; S.wfdev = { ...S.dev, CB1163: 'open', DS11634: 'open', DS11632: 'open', ES116340: 'close' }; bump(); startRun() }
  else if (S.stage === 'run') toast('已在执行阶段')
  else toast('先选择练习方式进入陪练舱')
}
export async function autoStep() {
  if (S.stage !== 'run' || S.ended) return toast('请先进入操作票执行阶段', 'bad')
  const st = STEP()!; const zz = (ms: number) => new Promise(r => setTimeout(r, ms))
  if (S.beat === 0) { if (st.act === 'recv' && S.ph.ring) { if (st.loc !== S.loc) goLoc(st.loc); await answerPhone() } return }
  if (S.beat === 1) {
    if (st.loc !== S.loc) goLoc(st.loc)
    if (st.loc === 'bay' && S.bay !== '1163') { pickBay('1163'); await zz(200) }
    if (st.act !== 'recv' && st.act !== 'report' && st.target) { await zz(250); devClick(st.target) }
    if (st.act === 'recv' && !S.ord.unit) { S.ord.unit = DISPATCH; S.ord.from = DISPATCHER; bump() }
    setRin(st.recite); await zz(150); submitInput(st.recite)
  } else if (S.beat === 2) { if (st.act === 'recv' && S.ph.cmp === 'wait') cmpResult(true) }
  else if (S.beat === 3) {
    if (st.act === 'report') { await dialPhone(); return }
    if (st.target) { devClick(st.target); await autoDialog(st) }
  } else if (S.beat === 4) {
    if (st.act === 'gis') { ['hui', 'mech', 'arm', 'line'].forEach(k => { S.gis[k] = true }); bump() }
    setRin(st.report || ''); await zz(150); submitInput(st.report || '')
  }
}
async function autoDialog(st: Step) {
  const zz = (ms: number) => new Promise(r => setTimeout(r, ms))
  for (let k = 0; k < 14; k++) {
    await zz(120)
    const rc = dlgOf('remote')
    if (rc) { const want = st.act === 'closeE' ? 'close' : 'open'; if (!rc.chosen) { await rcChoose(want); continue } if (rc.ready && !rc.running) { await rcExec(); continue } continue }
    const ins = dlgOf('inspect')
    if (ins) { ins.on = ins.on.map(() => true); bump(); inspOk(); continue }
    break
  }
}
export function setSpeed(v: number) { S.speed = v; bump() }
export function toggleDemo() { S.demoOpen = !S.demoOpen; bump() }

/* ---------------- 道具层 ---------------- */
export function sheetWant() {
  if (S.stage === 'fill' || S.stage === 'prep' || S.stage === 'wufang') return true
  if (S.stage !== 'run') return false
  const st = STEP(); if (!st) return false
  if (st.act === 'recv' || st.act === 'report') return S.beat <= 4
  return S.beat === 1 || S.beat === 3 || S.beat === 4
}
export function sheetOpen() { if (S.sheet.manual === 'closed') return false; if (S.sheet.manual === 'open') return true; return sheetWant() }
export function sheetSet(m: 'open' | 'closed') { S.sheet.manual = m; bump() }

/* ---------------- 卡住提醒 ---------------- */
let lastAct = Date.now(); let idleTimer: ReturnType<typeof setInterval> | null = null
export function touch() { lastAct = Date.now() }
export function startIdleWatch(isVisible: () => boolean) {
  if (idleTimer) return
  idleTimer = setInterval(() => {
    if (!['fill', 'prep', 'wufang', 'run'].includes(S.stage) || S.ended) return
    if (S.stage === 'run' && S.mode === 'exam') return
    if (!isVisible() || S.dh.speaking || S.dlg.length || S.tour != null) return
    if (Date.now() - lastAct < 24000) return
    lastAct = Date.now()
    const g = instrNow(); if (!g || !g.n) return
    const txt = `${HOME_USER.name}，${g.n}。`; say('j', txt); speak(txt, { pose: 'point' })
  }, 5000)
}

/* ---------------- 初始化 / 重置 ---------------- */
export function resetEngine() {
  stopSpeak(); if (demoT) { clearTimeout(demoT); demoT = null }
  STEPS.forEach(s => { delete s._done; delete s._bad; delete s._skip })
  Object.assign(S, {
    stage: 'idle', idx: 0, beat: 0, loc: 'phone', sel: null, gis: {},
    dev: { CB1163: 'close', DS11634: 'close', DS11632: 'close', ES116340: 'open', K1QK: '远控', KZK: '远控', M1DK: 'on', M2DK: 'on', M4DK: 'on', M1K2: 'on', M1K1: 'on', M1ZKK: 'on' },
    wfdev: null, tags: {}, verify: { v1: false, v2: false }, bay: null, key: { down: false },
    prep: { audit: [false, false, false], dress: [false, false, false], mind: false, risks: RISKS.map(() => false) }, wf: 0,
    msgs: [], chat: [], vio: [], praise: [], score: { rule: 0, order: 0, dual: 0, state: 0, risk: 0, term: 0 },
    fill: { rows: [], head: {}, tries: 0, done: false, score: null, no: '' }, fillErr: [], filled: false, fillOn: true,
    ord: { unit: '', from: '', to: HOME_USER.name, time: '', issued: '', cur: '' },
    ph: { ring: false, conn: false, cmp: null, pending: '', log: [] }, lastChg: null, moving: null,
    abn: { armed: true, fired: false, handled: false }, trap: { armed: true, fired: false, passed: null },
    t0: 0, stepT0: 0, ended: false, lock: false, hintLv: {}, hints: [], hintCut: 0, kpOpen: false, kpSeen: {}, kpAuto: null,
    warned: {}, previewed: {}, plan: null, lines: [], asks: [], cleanRun: 0,
    dlg: [], toasts: [], dhKey: 'jianhu', dh: { pose: 'idle', speaking: false, text: '', who: '', t0: 0, dur: 0, nodAt: 0, shakeAt: 0 },
    sub: { who: '', text: '', live: false }, sheet: { manual: null }, tour: null, peek: null, ticking: null, rinSet: { v: '', seq: 0 }, arenaEntered: false, planPre: null,
  })
  reported = false
  pushMsg(`${STATION} 监控后台 登录成功 用户:${HOME_USER.name}`)
  pushMsg(`${STATION} 1M、2M 并列运行 方式正常`)
  pushMsg(`${STATION} 培训三线1163开关 合闸位置`)
  bump()
}
export function ensureEntry(pre: string | null) {
  if (S.stage === 'idle' && !dlgOf('entry')) { if (S.msgs.length === 0) resetEngine(); openEntry(pre) }
}
export { STEPS, LOC, RISKS, WUFANG, KNOW, PREVIEW, STEPKP }
