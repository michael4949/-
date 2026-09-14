/* 陪练舱：对练区（场景 + 数字人 + 现场对练）、作业面板抽屉、右栏（指令条 + 知识点卡 + 操作票）、底部操作条与五拍 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { S, subscribe, getVer, STEP, STEPS, LOC, KNOW, PREVIEW, WUFANG, goLoc, guideSteps, instrNow, useHint, openKnow, knowRel, setKnow, kpState, toggleKp, setMode,
  jumpTo, submitInput, clickStop, openRule, askCoach, askRun, askSuggest, openDemo, demoGo, demoClose, demoSteps, demoKind, estScore, elapsedText, stepRef, sim, missingSegs,
  sheetOpen, sheetSet, sheetWant, tourStep, tourEnd, TOUR, closeDlg, entrySet, entryGo, planHasWrong, rcChoose, rcExec, inspToggle, inspOk, redlineClose, ABN_STEPS, abnormalNext, abnormalDone,
  stopConfirm, previewGo, finishFill, fillRight, reportData, genReview, openReport, resetEngine, demoInjectRed, demoInjectAbn, demoSkip, autoStep, setSpeed, toggleDemo, touch, startIdleWatch, ensureEntry } from './engine'
import type { Dlg } from './engine'
import { CHARACTERS, MODES, PLANS, BEATS, DIMN, CUT, DIMS6, devName, STATION_FULL, TASK_TEXT, HOME_USER, HOME_TASK } from './data'
import type { ModeKey } from './data'
import { SceneBg, Panelwrap, panelTitle, FigSVG, Knob, Mcb, Hook, PushBtn } from './svx'
import { DigitalHuman } from './DigitalHuman'
import { LOCSHORT } from './data'

export function useEngine() { return useSyncExternalStore(subscribe, getVer, getVer) }

/* ---------- 弹层壳 ---------- */
function Mask({ children, lite, onClose, wide }: { children: React.ReactNode; lite?: boolean; onClose?: () => void; wide?: number }) {
  return <div className={`cmask ${lite ? 'lite' : ''}`} onClick={e => { if (e.target === e.currentTarget && onClose) onClose() }}><div className="cdlg" style={{ width: `min(${wide || 640}px,96vw)` }}>{children}</div></div>
}
const DH_ = ({ t, sub, onClose }: { t: string; sub?: string; onClose?: () => void }) => <div className="cdh"><b>{t}</b>{sub && <span>{sub}</span>}{onClose && <i className="cls" onClick={onClose}>×</i>}</div>
const Sec = ({ t, children, cls }: { t: string; children: React.ReactNode; cls?: string }) => <div className="csec"><div className="cst">{t}</div><div className={`csc ${cls || ''}`}>{children}</div></div>

/* ---------- 顶栏 ---------- */
function Top({ onHome }: { onHome: () => void }) {
  const st = STEP(); const done = STEPS.filter(s => s._done).length; const total = S.plan ? S.plan.steps.length : STEPS.length
  const est = estScore(); const ph = st ? st.phase : 3
  const curIdx = S.stage === 'end' ? 3 : Math.max(0, ph - 1)
  return (
    <div className="atop">
      <button className="btn btn-sm" onClick={onHome}>工作台</button>
      <div className="atask"><div className="t1">110kV培训三线1163线路由运行转检修</div><div className="t2">{STATION_FULL} · 变电运行 · {S.plan ? S.plan.name : '倒闸操作陪练'} · 操作人视角 · {MODES[S.mode].n}</div></div>
      <div className="spacer" />
      <div className="astates">{['运行', '热备用', '冷备用', '检修'].map((n, i) => <div key={n} className={`stp ${i < curIdx || S.stage === 'end' ? 'done' : ''} ${i === curIdx && S.stage !== 'end' ? 'cur' : ''}`}><i /><span>{n}</span></div>)}</div>
      <div className="akpis">
        <div className="kpi"><b>{S.stage === 'wufang' || S.stage === 'run' || S.stage === 'end' ? elapsedText() : '00:00'}</b><span>用时</span></div>
        <div className="kpi"><b>{done}/{total}</b><span>操作项</span></div>
        <div className={`kpi ${S.vio.length ? 'bad' : 'good'}`}><b>{S.vio.length}</b><span>违规</span></div>
        <div className="kpi"><b>{S.abn.handled ? 1 : 0}</b><span>中止上报</span></div>
        <div className={`kpi est ${est >= 85 ? 'good' : est >= 70 ? 'warn' : 'bad'}`} title="按当前扣分与加分实时测算，最终以评估报告为准"><b>{est}</b><span>预估得分</span></div>
      </div>
    </div>)
}

/* ---------- 指令条 ---------- */
const AICON: Record<string, React.ReactNode> = {
  listen: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 12v-2a7 7 0 0 1 14 0v2" /><rect x="2" y="11.5" width="4" height="6" rx="1.6" /><rect x="14" y="11.5" width="4" height="6" rx="1.6" /></svg>,
  speak: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="7" y="2.5" width="6" height="10" rx="3" /><path d="M4.5 10a5.5 5.5 0 0 0 11 0M10 15.5v2.4" /></svg>,
  point: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9V3.6a1.4 1.4 0 0 1 2.8 0V9m0-1.2a1.3 1.3 0 0 1 2.6 0V9m0 .3a1.25 1.25 0 0 1 2.5 0V12a5.4 5.4 0 0 1-5.4 5.4H9.7A5 5 0 0 1 5.6 15L3.8 12.4a1.3 1.3 0 0 1 2-1.6L8 12.4" /></svg>,
  walk: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="3.4" r="1.6" /><path d="M8.2 18l1.6-4.6L8 11.2l.9-4.4 2.6-.8 2 2.3 2.3.9M8.9 6.8 6.4 8.5 5.6 11m6.1 1.7 1 1.8 1.9 3.5" /></svg>,
  act: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M11.5 2 4.5 11.5h4L8 18l7.5-9.5h-4z" /></svg>,
  check: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 10.5 8 15 16.5 5.5" /></svg>,
}
function Taskbar() {
  const st = STEP(); const ins = instrNow()
  const modes = <span className="modesw">{(Object.keys(MODES) as ModeKey[]).map(k => <button key={k} className={S.mode === k ? 'on' : ''} title={MODES[k].d} onClick={() => setMode(k)}>{MODES[k].n}</button>)}</span>
  if (S.stage !== 'run' || !st) return (
    <div className="taskbar" id="taskbar">
      <div className="tb1"><span className="tbno">{S.stage === 'fill' ? '拟票' : S.stage === 'prep' ? '准备' : S.stage === 'wufang' ? '五防' : '—'}</span>
        <span className="tbtx">{S.stage === 'fill' ? '填写操作票 · 票头要素 / 本段项目 / 执行顺序' : S.stage === 'prep' ? '上岗前准备 · 三审 / 着装互检 / 风险分析' : S.stage === 'wufang' ? '五防模拟预演 · 按操作票顺序逐项模拟' : S.stage === 'end' ? '本次陪练已结束' : '选择练习方式后开始'}</span>{modes}</div>
      {ins && <div className="tbfoc"><span className="tbpic">{AICON[ins.i]}</span><div className="tbnow"><b>{ins.t}</b>{ins.h && <span>{ins.h}</span>}</div></div>}
    </div>)
  const g = guideSteps(); const cur = g.findIndex(x => !x.ok); const lv = S.hintLv[st.no] || 0
  return (
    <div className="taskbar" id="taskbar">
      <div className="tb1"><span className="tbno">第 {st.no} 项</span><span className="tbtx">{st.ticket}</span>{modes}</div>
      {ins && <div className="tbfoc"><span className="tbpic">{AICON[ins.i]}</span><div className="tbnow"><b>{ins.t}</b>{ins.h && <span>{ins.h}</span>}</div>
        {ins.go && <button className="tbgo" onClick={() => goLoc(ins.go!)}>前往 {LOC[ins.go].name} →</button>}
        <button className="tbhint" onClick={useHint}>我该做什么<i>提示 {lv}/3</i></button></div>}
      <div className="tb2">{g.map((x, i) => <span key={i} className={`gs ${x.ok ? 'ok' : i === cur ? 'now' : ''}`}><i>{x.ok ? '✓' : i + 1}</i>{x.t}</span>).reduce<React.ReactNode[]>((a, c, i) => a.concat(i ? [<b key={'a' + i} className="ar">›</b>, c] : [c]), [])}
        <span className="tbsp" /><button className="hintbtn" onClick={() => openKnow()}>知识地图</button></div>
    </div>)
}
function KpBox() {
  const k = kpState(); const st = STEP()
  if (!k || !st) return <div id="kpbox" />
  return (
    <div id="kpbox"><div className={`kp ${k.open ? 'open' : ''}`}>
      <div className="kph" onClick={toggleKp}><span className="ctag2">知识点</span><b>{k.topics.map(t => t.t).join(' · ') || '本项要点'}</b><span className="kpsp" />{k.fresh.length > 0 && <span className="kpnew">新知识点</span>}<span className="kpfold">{k.open ? '收起' : '展开'}</span></div>
      <div className="kpb">
        <div className="kprow"><div className="kpc"><div className="kpt">这一项要做什么</div><ul>{k.kp.pts.map(p => <li key={p}>{p}</li>)}</ul></div><div className="kpc"><div className="kpt warn">常见错误</div><ul className="err">{k.kp.errs.map(p => <li key={p}>{p}</li>)}</ul></div></div>
        <div className="kpc"><div className="kpt">为什么这样做</div><p>{st.why}</p></div>
        <div className="kpc"><div className="kpt">依据条款</div><p className="rule">{st.rule}</p></div>
        {S.mode === 'teach' && st.recite && <div className="kpc say"><div className="kpt">标准话术</div><p className="stdsay">{st.recite}</p></div>}
        {k.topics.length > 0 && <div className="kplink">相关主题：{k.topics.map(t => <a key={t.id} onClick={() => openKnow(t.id)}>{t.t}</a>)}</div>}
      </div></div></div>)
}
function Ticket() {
  const segs: Record<number, string> = { 1: '接调度令：运行 → 热备用', 2: '再经调度令：热备用 → 冷备用', 3: '再经调度令：冷备用 → 检修' }
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const c = ref.current?.querySelector('.trow.cur'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [S.idx, S.stage])
  let last = 0
  return (
    <div className="ticket"><div className="thead"><div className="ttl">{STATION_FULL.split(' · ')[1]} 现场电气操作票</div>
      <div className="meta"><div>票号 <b>{S.stage === 'fill' || S.stage === 'idle' ? '待签发' : (S.fill.no || '2026-变电运行-0217')}</b></div><div>类型 <b>根据调度令进行的操作</b></div><div>操作人 <b>{HOME_USER.name}</b></div><div>监护人 <b>黄志远</b></div></div></div>
      <div className="trows" id="trows" ref={ref}>
        {S.stage === 'fill' ? <div className="tfill">操作票尚未拟写。<br />在作业面板按调度预令写第一段，提交审核后签发。</div> : STEPS.map((s, i) => {
          const seg = s.phase !== last; last = s.phase
          return <div key={s.no}>{seg && <div className="trow seg"><div className="no" /><div className="tx">{segs[s.phase]}</div><div className="ck" /></div>}
            <div className={`trow ${i === S.idx && S.stage === 'run' ? 'cur' : ''} ${s._done ? 'done' : ''} ${s._bad ? 'bad' : ''} ${s._skip ? 'skip' : ''} ${S.ticking === s.no ? 'ticking' : ''}`} onClick={() => { touch(); jumpTo(i) }}>
              <div className="no">{s.no}</div><div className="tx">{s.ticket}</div><div className="ck">{s._done ? '√' : s._bad ? '×' : ''}</div></div></div>
        })}
      </div></div>)
}

/* ---------- 底部操作条 ---------- */
function ActBar() {
  const [v, setV] = useState(''); const [rec, setRec] = useState(false)
  const st = STEP(); const seq = S.rinSet.seq
  useEffect(() => { setV(S.rinSet.v) }, [seq])
  useEffect(() => { setV('') }, [S.beat, S.idx])
  const canInput = S.stage === 'run' && (S.beat === 1 || S.beat === 4) && !S.ended
  const send = () => { if (!v.trim()) return; const t = v; setV(''); submitInput(t) }
  const mic = () => { if (!st || rec) return; const text = (S.beat === 1 ? st.recite : st.report) || ''; setRec(true); setV(''); let i = 0; const tm = setInterval(() => { i += 2; setV(text.slice(0, i)); if (i >= text.length) { clearInterval(tm); setRec(false) } }, 34) }
  const std = st ? (S.beat === 1 ? st.recite : st.report || '') : ''
  const sc = v && std ? Math.round(sim(v, std) * 100) : 0
  const miss = S.mode === 'exam' ? [] : missingSegs(v, std).slice(0, 4)
  const lvc = sc >= 86 ? 'ok' : sc >= 62 ? 'wn' : 'bad'
  if (S.stage === 'idle') return <div className="act"><div className="actrow"><div className="acttip">选择练习方式后，数字人监护人会带你从拟票、上岗前准备、五防模拟一直走到操作票执行。</div></div></div>
  if (S.stage !== 'run') return (
    <div className="act" id="actbar"><div className="actrow"><div className="acttip">{S.stage === 'fill' ? '拟票：把本次调度令范围内的项目按执行顺序写进票面，填全票头要素，提交后由系统按审票口径逐条判分。' : S.stage === 'prep' ? '上岗前准备：在作业面板完成三审与资格核对、着装互检、人员状态确认与 12 项风险分析后，进入五防模拟。' : S.stage === 'wufang' ? '五防模拟：在模拟接线图上按操作票顺序点击设备，监护人唱票、你复诵后五防主机逐项记录。顺序错误会被防误逻辑闭锁。' : ''}
      {S.stage === 'end' && <><button className="btn btn-primary" onClick={openReport}>查看本次陪练评估报告</button><button className="btn" style={{ marginLeft: 8 }} onClick={() => { resetEngine(); ensureEntry(null) }}>再练一次</button></>}</div>
      {S.stage !== 'end' && <button className="btn askbtn" onClick={askCoach}>问教练</button>}</div><Beats /></div>)
  const ph = [S.ph.ring ? '调度来电，先在受令席接听' : '等待监护人唱票…', st && st.act === 'recv' ? '记录发令单位与发令人后，复诵调度下令' : st && st.act === 'report' ? '复诵向调度汇报的内容' : '手指操作对象后，复诵票面内容', st && st.act === 'recv' ? '在受令席核对票令是否一致' : st && st.act === 'report' ? '请监护人拨通南宁地调汇报' : '等待监护人发出执行令…', '已发令，请在设备图上执行', '检查设备状态并回报', ''][S.beat]
  return (
    <div className="act" id="actbar">
      <div className="actrow">
        <button className={`mic ${rec ? 'rec' : ''}`} onClick={mic} title="语音复诵"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4" /></svg></button>
        <input id="rin" className="rin" value={v} disabled={!canInput} placeholder={rec ? '正在识别…' : S.beat === 1 ? '复诵票面内容…（点麦克风可语音复诵）' : S.beat === 4 ? '回报检查结果…' : ph} onChange={e => { touch(); setV(e.target.value) }} onKeyDown={e => { if (e.key === 'Enter') send() }} />
        <button className="btn btn-primary" disabled={!canInput} onClick={send}>{S.beat === 1 ? '复诵' : '回报'}</button>
        <button className="btn askbtn" onClick={askCoach}>问教练</button>
        <button className="btn" onClick={openDemo}>看现场示范</button>
        <button className="btn dan" onClick={clickStop}>中止操作并上报</button>
        <button className="btn" onClick={openRule}>规程依据</button>
      </div>
      <div className="hintrow livem">{canInput && v.trim() && <><span className="k">实时吻合度</span><span className="lmbar"><i className={lvc} style={{ width: `${sc}%` }} /></span><b className={lvc}>{sc}%</b>
        {S.mode === 'teach' && miss.length ? <span className="lmmiss">还缺：{miss.map(x => <em key={x}>{x}</em>)}</span> : S.mode === 'drill' && miss.length ? <span className="lmmiss">尚有 {miss.length} 处要素未念到</span> : sc >= 86 ? <span className="lmok">要素完整，可以提交</span> : null}</>}</div>
      <div className="hintrow"><span className="k">当前节拍</span>{BEATS[S.beat] ? BEATS[S.beat][0] : '—'}<span className="sep">|</span><span className="k">操作对象</span>{st && st.target ? devName(st.target) : '本项为调度联系'}<span className="sep">|</span><span className="k">所在位置</span>{LOC[S.loc].name}
        {S.beat === 1 && st && st.loc !== S.loc && <span style={{ color: '#a8823a' }}>→ 需前往 {LOC[st.loc].name}</span>}<span className="sep">|</span><span className="k">本项用时</span><StepClock /><span className="tk3">参考 {Math.floor(stepRef(st) / 60)}:{String(stepRef(st) % 60).padStart(2, '0')}</span></div>
      <Beats />
    </div>)
}
function StepClock() {
  const e = S.stepT0 ? Math.floor((Date.now() - S.stepT0) / 1000) : 0; const ref = stepRef(STEP())
  return <span className={`num ${e > ref * 1.5 ? 'wv' : e > ref ? 'mv' : 'gv'}`}>{Math.floor(e / 60)}:{String(e % 60).padStart(2, '0')}</span>
}
function Beats() {
  const pre = S.stage !== 'run'
  return <div className="beats" id="beats">{BEATS.map((b, i) => <div key={b[0]} className={`beat ${!pre && S.beat === i ? 'on' : ''} ${!pre && S.beat > i ? 'done' : ''} ${pre ? 'idle' : ''}`}><b>{b[0]}</b><i>{b[1]}</i></div>)}</div>
}

/* ---------- 弹层 ---------- */
function Radar6({ vals, size = 300 }: { vals: number[]; size?: number }) {
  const R = 74, cx = 152, cy = 112
  const pts = vals.map((v, i) => { const a = -Math.PI / 2 + i * Math.PI / 3, r = R * v / 100; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] })
  return (<svg width={size} height={size * 232 / 304} viewBox="0 0 304 232">
    {[1, .75, .5, .25].map(k => <polygon key={k} points={DIMS6.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return `${cx + Math.cos(a) * R * k},${cy + Math.sin(a) * R * k}` }).join(' ')} fill="none" stroke="#e6eaf1" />)}
    {DIMS6.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke="#e6eaf1" /> })}
    <polygon points={pts.map(p => p.join(',')).join(' ')} fill="rgba(43,78,146,.22)" stroke="#2b4e92" strokeWidth={2} className="pop-in" />
    {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#1e3a6e" />)}
    {DIMN && Object.values(DIMN).map((n, i) => { const a = -Math.PI / 2 + i * Math.PI / 3, r = R + 24; return <g key={n}><text x={cx + Math.cos(a) * r} y={cy + Math.sin(a) * r} textAnchor="middle" fontSize={10} fill="#5c6b7f">{n}</text><text x={cx + Math.cos(a) * r} y={cy + Math.sin(a) * r + 12} textAnchor="middle" fontSize={11} fontFamily="monospace" fill="#1e3a6e">{Math.round(vals[i])}</text></g> })}
  </svg>)
}
function ArcCanvas() {
  const ref = useRef<HTMLCanvasElement>(null); const [k, setK] = useState(0)
  useEffect(() => {
    const c = ref.current; if (!c) return; const g = c.getContext('2d')!; const W = c.width, H = c.height; let t = 0; let raf = 0
    const draw = () => {
      t += 1 / 60; g.clearRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
      g.strokeStyle = '#d8dfe9'; g.lineWidth = 2; g.beginPath(); g.moveTo(60, 40); g.lineTo(760, 40); g.stroke()
      g.fillStyle = '#8a94a6'; g.font = '12px monospace'; g.fillText('110kV 培训三线（线路侧仍带电）', 60, 30)
      g.strokeStyle = t > 1.1 ? '#b03a2e' : '#c8d0dc'; g.lineWidth = 3; g.beginPath(); g.moveTo(410, 40); g.lineTo(410, 120); g.stroke()
      const close = Math.min(1, Math.max(0, (t - .35) / .8)); g.save(); g.translate(410, 120); g.strokeStyle = close >= 1 ? '#b8791d' : '#1d7a4f'; g.lineWidth = 5; g.lineCap = 'round'; g.rotate((1 - close) * -.9); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 62); g.stroke(); g.restore()
      g.strokeStyle = '#a5b0bf'; g.lineWidth = 3; ;[[386, 434, 186], [394, 426, 194], [402, 418, 202]].forEach(([a, b, y]) => { g.beginPath(); g.moveTo(a, y); g.lineTo(b, y); g.stroke() })
      g.fillStyle = '#8a94a6'; g.font = '11px monospace'; g.fillText('116340 接地刀闸', 448, 158)
      if (t > 1.1 && t < 3.4) { const kk = Math.min(1, (t - 1.1) / .35); const flick = .55 + .45 * Math.sin(t * 47) * Math.sin(t * 13); const R = (70 + 130 * kk) * flick; const gr = g.createRadialGradient(410, 130, 4, 410, 130, R); gr.addColorStop(0, `rgba(255,255,255,${.95 * flick})`); gr.addColorStop(.16, `rgba(255,236,170,${.85 * flick})`); gr.addColorStop(.42, `rgba(255,140,60,${.45 * flick})`); gr.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(410, 130, R, 0, 7); g.fill(); g.strokeStyle = `rgba(255,255,255,${.85 * flick})`; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(410, 108); let x = 410, y = 108; for (let j = 0; j < 6; j++) { x += (Math.random() - .5) * 30; y += 12; g.lineTo(x, y) } g.stroke() } }
      if (t > 1.35) { g.fillStyle = '#b03a2e'; g.font = 'bold 15px sans-serif'; g.fillText('带电合接地刀闸 → 金属性短路', 520, 60); g.fillStyle = '#a8823a'; g.font = '12px monospace'; g.fillText('短路电流 ≈ 21.4 kA', 520, 84); g.fillText('电弧温度 > 6000 ℃', 520, 104) }
      if (t > 2.1) { g.fillStyle = '#b03a2e'; g.font = '12px monospace'; g.fillText('T+0.08s  线路保护动作', 60, 100); g.fillText('T+0.12s  母差保护动作', 60, 120); g.fillText('T+0.20s  110kV 2M 失压', 60, 140); g.fillText('后果      设备损坏 · 人身电弧灼伤 · 人为责任事件', 60, 160) }
      if (t < 4.6) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf)
  }, [k])
  return <><canvas ref={ref} width={820} height={230} style={{ width: '100%', border: '1px solid var(--line)' }} /><button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setK(k + 1)}>重放推演</button></>
}
function DemoScene({ st, i }: { st: Dlg & { kind: 'demo' } extends infer T ? T extends { st: infer U } ? U : never : never; i: number }) {
  const K = demoKind(st); const L = LOC[st.loc].name; const D = devName(st.target || '')
  const Back = ({ title }: { title: string }) => <g><rect width={300} height={210} rx={7} fill="#e6eaf1" stroke="#b9c3d2" strokeWidth={1.6} /><rect x={7} y={7} width={286} height={196} rx={5} fill="#f6f8fb" stroke="#cfd6e1" /><text x={150} y={19} textAnchor="middle" fontSize={11} fill="#5c6b7f" letterSpacing={1}>{title}</text></g>
  const Ar = ({ x, y, t }: { x: number; y: number; t: string }) => <g transform={`translate(${x},${y})`}><path d="M 0 14 l -5 -9 h 10 z" fill="#a8823a" /><rect x={-t.length * 5.6 - 7} y={-15} width={t.length * 11.2 + 14} height={20} rx={10} fill="#fff6da" stroke="#a8823a" /><text y={-1} textAnchor="middle" fontSize={10.5} fill="#8a6d15">{t}</text></g>
  let inner: React.ReactNode
  if (K === 'knob') inner = <><Back title={L} /><g transform="translate(150,110)"><Knob id={'demo_' + st.target} x={0} y={0} opts={['远控', '就地']} val={i >= 2 ? '就地' : '远控'} name={D} /></g>{i === 1 && <Ar x={150} y={46} t="手指这里" />}{i === 3 && <Ar x={214} y={62} t="看刻字档位" />}</>
  else if (K === 'mcb') inner = <><Back title={L} /><g transform="translate(150,105)"><Mcb id={'demo_' + st.target} x={0} y={0} name={D} desc="" off={i >= 2} /></g>{i === 1 && <Ar x={150} y={46} t="手指这里" />}{i === 3 && <Ar x={226} y={152} t="看手柄位置与状态字" />}</>
  else if (K === 'tag') inner = <><Back title={L} /><g transform="translate(150,72)"><Hook id={'demo_' + st.target} x={0} y={0} hung={i >= 2} lbl="挂牌位" /></g>{i === 1 && <Ar x={150} y={46} t="手指挂牌位" />}{i === 3 && <Ar x={150} y={178} t="文字朝外·不遮挡设备名称" />}</>
  else if (K === 'closeE') inner = <><Back title="110kV培训三线1163间隔就地控制柜" /><g transform="translate(88,96)"><PushBtn id="demo_close" x={0} y={0} color="#b03a2e" lbl="地刀合闸" pressed={i === 2} /></g>
    <g transform="translate(206,96)"><rect x={-34} y={-34} width={68} height={68} rx={5} fill="#f6f8fb" stroke="#c8d0dc" /><line x1={0} y1={24} x2={0} y2={8} stroke="#7a8490" strokeWidth={3} /><g transform={`rotate(${i >= 2 ? 0 : -62})`} style={{ transition: 'transform .9s' }}><line x1={0} y1={8} x2={0} y2={-22} stroke={i >= 2 ? '#b8791d' : '#1d7a4f'} strokeWidth={4.5} strokeLinecap="round" /></g><circle cy={-24} r={3.4} fill="#7a8490" /><text y={52} textAnchor="middle" className="svd">116340 地刀 · {i >= 2 ? '合上' : '拉开'}</text></g>
    {i === 1 && <Ar x={88} y={52} t="手指按钮" />}{i >= 2 && <Ar x={206} y={56} t="盯住运动方向" />}</>
  else if (K === 'gis') { const on = i >= 2; const Box = ({ y, n }: { y: number; n: string }) => <g transform={`translate(150,${y})`}><rect x={-68} y={-19} width={136} height={38} rx={5} fill="#f6f8fb" stroke={on ? '#8fbca7' : '#c8d0dc'} strokeWidth={on ? 1.8 : 1} /><circle cx={-54} r={5} fill={on ? '#1d7a4f' : '#c8d0dc'} /><text x={-44} y={4} fontSize={10.5} fill="#14213d">{n}</text>{on && <text x={60} y={4} textAnchor="end" fontSize={11} fill="#1d7a4f">√</text>}</g>
    inner = <><Back title="现场 · 汇控柜 / 机构箱 / 刀闸本体" /><Box y={60} n="汇控柜电气指示" /><Box y={102} n="机构箱机械指示" /><Box y={144} n="拐臂指示" /><Box y={186} n="转轴划线标识" /></> }
  else if (K === 'remote') inner = <><Back title="监控后台工作站" /><rect x={26} y={40} width={248} height={130} rx={4} fill="#1d2b3d" stroke="#7a8490" /><line x1={52} y1={70} x2={248} y2={70} stroke="#4a6180" strokeWidth={2} /><line x1={150} y1={70} x2={150} y2={i >= 2 ? 100 : 150} stroke={i >= 2 ? '#1d7a4f' : '#b03a2e'} strokeWidth={3} style={{ transition: 'all .8s' }} /><rect x={140} y={100} width={20} height={20} rx={2} fill="none" stroke={i >= 2 ? '#1d7a4f' : '#b03a2e'} strokeWidth={2.6} />{i >= 2 && <line x1={140} y1={100} x2={160} y2={120} stroke="#1d7a4f" strokeWidth={2.2} />}<text x={176} y={116} fontSize={10} fill="#a9c4d6">{D}</text><text x={52} y={160} fontSize={9.5} fill={i >= 3 ? '#8fd0e0' : '#4a6180'}>{i >= 3 ? '操作报文：' + D + ' 变位，与本次操作相符' : '操作报文：—'}</text>{i === 1 && <Ar x={150} y={88} t="手指屏上设备" />}{i === 3 && <Ar x={96} y={186} t="看报文与光字" />}</>
  else if (K === 'phone') inner = <><Back title="调度电话 · 受令席" /><g transform="translate(96,96)"><rect x={-34} y={-30} width={68} height={60} rx={6} fill="#f0f2f6" stroke="#c8d0dc" /><rect x={-26} y={-38} width={52} height={14} rx={6} fill={i >= 1 ? '#1e3a6e' : '#c8d0dc'} /><text y={6} textAnchor="middle" fontSize={10} fill="#5c6b7f">{i >= 1 ? '通话中' : '待接听'}</text><text y={46} textAnchor="middle" className="svd">南宁地调 · 韦岚</text></g><g transform="translate(206,96)"><rect x={-44} y={-34} width={88} height={68} rx={4} fill="#fff" stroke="#c8d0dc" />{[0, 1, 2].map(k => <line key={k} x1={-34} y1={-16 + k * 16} x2={i > k ? 34 : -34} y2={-16 + k * 16} stroke={i > k ? '#a8823a' : '#e6eaf1'} strokeWidth={2.2} style={{ transition: 'all .6s' }} />)}<text y={52} textAnchor="middle" className="svd">调度操作指令记录簿</text></g>{i === 2 && <Ar x={150} y={44} t="逐字复诵·按位报编号" />}</>
  else if (K === 'key') inner = <><Back title="五防电脑" /><g transform="translate(110,96)"><rect x={-44} y={-36} width={88} height={72} rx={4} fill="#1d2b3d" stroke="#7a8490" /><text y={-8} textAnchor="middle" fontSize={9.5} fill="#8fd0e0">五防主机</text><text y={10} textAnchor="middle" fontSize={9.5} fill={i >= 2 ? '#8fd0e0' : '#4a6180'}>{i >= 2 ? '写入成功' : '待下传'}</text><text y={52} textAnchor="middle" className="svd">模拟票已通过</text></g><g transform={`translate(212,96) rotate(${i >= 2 ? 0 : -14})`} style={{ transition: 'transform .7s' }}><rect x={-13} y={-30} width={26} height={52} rx={5} fill="#e2e7ef" stroke="#b9c3d2" /><rect x={-8} y={-24} width={16} height={14} rx={2} fill={i >= 2 ? '#1d7a4f' : '#7a8490'} /><rect x={-4} y={22} width={8} height={12} rx={2} fill="#a8b0be" /><text y={52} textAnchor="middle" className="svd">电脑钥匙</text></g>{i === 2 && <Ar x={160} y={46} t="插上·下传·等提示" />}</>
  else inner = <><Back title={L} /><g transform="translate(150,100)"><rect x={-92} y={-46} width={184} height={92} rx={6} fill="#f6f8fb" stroke="#c8d0dc" /><text y={-22} textAnchor="middle" fontSize={10.5} fill="#5c6b7f">{D || '核对对象'}</text><text y={4} textAnchor="middle" fontSize={13} fontFamily="monospace" fill={i >= 2 ? '#1d7a4f' : '#8a94a6'}>{i >= 2 ? '核对完成' : '待核对'}</text><text y={26} textAnchor="middle" fontSize={9.5} fill="#7b6a52">{i >= 3 ? '已按实际所见回报' : '逐项看清再回报'}</text></g>{i === 1 && <Ar x={150} y={46} t="手指对象" />}</>
  const steps = demoSteps(st)
  return <svg width={520} height={230} viewBox="0 0 520 230"><g transform="translate(190,10)">{inner}</g><FigSVG pose={steps[i].pose} x={92} y={214} s={1.28} /><text x={92} y={228} textAnchor="middle" fontSize={10} fill="#7b6a52">操作人 {HOME_USER.name}</text></svg>
}
function Dialogs({ onHome }: { onHome: () => void }) {
  const [askQ, setAskQ] = useState('')
  const suggest = useMemo(() => askSuggest(), [S.idx])
  return <>{S.dlg.map((d, di) => {
    const key = d.kind + di
    if (d.kind === 'entry') {
      const hasWrong = planHasWrong()
      return <Mask key={key} wide={820}><DH_ t="开始陪练 · 选择练习方式" sub="110kV培训三线1163线路由运行转检修" />
        <div className="cdb">
          <Sec t="你扮演"><div className="cfgrow"><label className="cfgopt on"><input type="radio" checked readOnly /><div><b>操作人</b><span>监护人由 AI 数字人担任：唱票、发令、纠错、标"√"。</span></div></label><label className="cfgopt dis"><input type="radio" disabled /><div><b>监护人</b><span>由你唱票与核对，AI 扮演操作人。进阶视角。</span></div></label></div></Sec>
          <Sec t="练习方式"><div className="plans">{PLANS.map(p => { const dis = p.id === 'wrong' && !hasWrong; return <label key={p.id} className={`cfgopt ${d.plan === p.id ? 'on' : ''} ${dis ? 'dis' : ''}`}><input type="radio" name="plan" checked={d.plan === p.id} disabled={dis} onChange={() => entrySet('plan', p.id)} /><div><b>{p.n}</b><span>{dis ? '暂无历史错题' : p.d}</span></div></label> })}</div></Sec>
          <Sec t="拟票练习"><label className={`cfgopt ${d.fill ? 'on' : ''}`} style={{ display: 'flex' }}><input type="checkbox" checked={d.fill} onChange={e => entrySet('fill', e.target.checked)} /><div><b>先练填写操作票</b><span>按调度预令拟写第一段操作项目并填全票头，提交后逐条给出漏项、多项、顺序错误的详解与依据；完成后按正确票面进入上岗前准备。</span></div></label></Sec>
          <Sec t="教学模式"><span className="modesw" style={{ display: 'inline-flex' }}>{(Object.keys(MODES) as ModeKey[]).map(k => <button key={k} className={S.mode === k ? 'on' : ''} onClick={() => setMode(k)}>{MODES[k].n}</button>)}</span><span className="tk3" style={{ marginLeft: 10 }}>{MODES[S.mode].d}</span></Sec>
        </div>
        <div className="cdf"><button className="btn" onClick={() => { closeDlg('entry'); onHome() }}>返回工作台</button><button className="btn btn-primary" onClick={entryGo}>进入陪练舱</button></div></Mask>
    }
    if (d.kind === 'interlock') return <Mask key={key} lite wide={520} onClose={() => closeDlg('interlock')}><div className="red"><DH_ t="五防闭锁" sub="微机防误 · 模拟预演" onClose={() => closeDlg('interlock')} />
      <div className="cdb"><Sec t="操作项目" cls="quote">{d.item}</Sec><Sec t="闭锁原因"><span style={{ color: '#b03a2e' }}>{d.why}</span></Sec><Sec t="防误规则"><span className="tk3">{d.rule}</span></Sec></div>
      <div className="cdf"><button className="btn btn-primary" onClick={() => closeDlg('interlock')}>知道了，按顺序模拟</button></div></div></Mask>
    if (d.kind === 'remote') { const cur = S.dev[d.st.target!]; return <Mask key={key} lite wide={540}><DH_ t="遥控操作" sub={`${STATION_FULL.split(' · ')[1]} · 监控后台`} onClose={() => closeDlg('remote')} />
      <div className="cdb"><div className="rcrow"><span>设备双重名称</span><b>{devName(d.st.target!)}</b></div><div className="rcrow"><span>当前位置</span><b className={cur === 'close' ? 'on' : 'off'}>{cur === 'close' ? '合闸' : '分闸'}</b></div>
        <div className="rcrow"><span>操作性质</span><span className="rcops"><label><input type="radio" name="rcop" disabled={!!d.chosen} checked={d.chosen === 'open'} onChange={() => rcChoose('open')} /> 分闸</label><label><input type="radio" name="rcop" disabled={!!d.chosen} checked={d.chosen === 'close'} onChange={() => rcChoose('close')} /> 合闸</label></span></div>
        <div className="rcst">{d.err ? <span style={{ color: '#b03a2e' }}>{d.err}</span> : d.running ? '执行中…' : d.ready ? <span style={{ color: '#1d7a4f' }}>预置完成，可以执行</span> : d.chosen ? `已选择${d.chosen === 'open' ? '分闸' : '合闸'}，正在预置…` : '核对设备双重名称与操作性质，选定后系统自动预置'}</div></div>
      <div className="cdf"><button className="btn" onClick={() => closeDlg('remote')}>取消</button><button className="btn btn-primary" disabled={!d.ready || d.running} onClick={rcExec}>执行</button></div></Mask> }
    if (d.kind === 'inspect') return <Mask key={key} lite wide={560}><DH_ t={d.title} sub={`第 ${d.st.no} 项 · 核对`} onClose={() => closeDlg('inspect')} />
      <div className="cdb">{d.lamps && <div className="lamprow">{d.lamps.names.map(p => <span key={p} className={`lp ${d.lamps!.on ? 'on' : ''}`} style={{ ['--c' as string]: d.lamps!.color }}><i />{p}</span>)}</div>}
        {d.rows.map(r => <div key={r.k} className={`kv ${r.big ? 'big' : ''}`}><span>{r.k}</span><b className={r.cls || ''}>{r.v}</b></div>)}
        <div className="chkl">{d.chks.map((c, i) => <span key={c} className={d.on[i] ? 'on' : ''} onClick={() => inspToggle(i)}><i />{c}</span>)}</div></div>
      <div className="cdf"><button className="btn" onClick={() => closeDlg('inspect')}>取消</button><button className="btn btn-primary" disabled={!d.on.every(Boolean)} onClick={inspOk}>{d.okTxt}</button></div></Mask>
    if (d.kind === 'redline') return <Mask key={key} wide={900}><div className="red"><DH_ t={d.o.title} sub="RED LINE · 一票否决" />
      <div className="cdb scrolly"><Sec t="错在哪" cls="quote">{d.o.where}<br />{d.o.why.map(x => <span key={x}>· {x}<br /></span>)}</Sec><Sec t="依据哪一条"><span className="tk3">{d.o.rule}</span></Sec><Sec t="正确做法">{d.o.right}</Sec>
        <Sec t="事故后果推演"><ArcCanvas /><div className="chain">{d.o.chain.map(c => <div key={c[0]} className="cn"><b>{c[0]}</b><span>{c[1]}</span></div>)}</div></Sec></div>
      <div className="cdf"><button className="btn btn-primary" onClick={redlineClose}>返回被中止的项目</button></div></div></Mask>
    if (d.kind === 'abnormal') return <Mask key={key} wide={680}><DH_ t="异常处置流程" sub="凡变化必上报 · 细则第十四条" />
      <div className="cdb"><Sec t="触发条件" cls="quote">培训三线线路侧11634刀闸：现场机构箱机械指示与监控后台位置显示不一致</Sec>
        {ABN_STEPS.map((s, i) => <div key={s[0]} className={`abst ${i < d.cur ? 'done' : i === d.cur ? 'cur' : ''}`}><div className="n">{i < d.cur ? '✓' : i + 1}</div><div><div className="t">{s[0]}</div><div className="d">{s[1]}</div></div></div>)}</div>
      <div className="cdf">{d.cur < ABN_STEPS.length ? <button className="btn btn-primary" onClick={abnormalNext}>{ABN_STEPS[d.cur][0]}</button> : <button className="btn btn-primary" onClick={abnormalDone}>返回被中止的操作项目</button>}</div></Mask>
    if (d.kind === 'stop') return <Mask key={key} wide={560}><DH_ t="中止操作并上报" onClose={() => closeDlg('stop')} />
      <div className="cdb"><Sec t="当前判断">当前未检出设备运动方向异常、五防锁具异常、后台与现场指示不一致等触发条件。</Sec><Sec t="说明"><span className="tk3">细则第十四条要求"凡变化必上报"；无依据地中止操作会打断作业连续性。中止判断本身也是被评价的能力项。</span></Sec></div>
      <div className="cdf"><button className="btn" onClick={() => closeDlg('stop')}>取消</button><button className="btn dan" onClick={stopConfirm}>仍然中止并上报</button></div></Mask>
    if (d.kind === 'know') { const k = KNOW.find(x => x.id === d.cur) || KNOW[0]; const rel = knowRel(); const st = STEP(); return <Mask key={key} wide={940} onClose={() => closeDlg('know')}><DH_ t="倒闸操作知识地图" sub={`当前第 ${st && S.stage === 'run' ? st.no : '—'} 项关联的主题已高亮`} onClose={() => closeDlg('know')} />
      <div className="cdb knowb"><div className="knav">{KNOW.map(x => <div key={x.id} className={`kn ${x.id === d.cur ? 'on' : ''} ${rel.includes(x.id) ? 'rel' : ''}`} onClick={() => setKnow(x.id)}><b>{x.t}</b><span>{x.sub}</span></div>)}</div>
        <div className="kbody"><h3>{k.t}<em>{k.sub}</em></h3>{k.body.map(b => <div key={b[0]} className="kb"><div className="kbt">{b[0]}</div><p style={{ whiteSpace: 'pre-line' }}>{b[1]}</p></div>)}</div></div></Mask> }
    if (d.kind === 'preview') { const P = PREVIEW[String(d.phase)]; return <Mask key={key} wide={660}><DH_ t={`开始前 · ${P.t}`} sub="本段必须掌握的三个知识点" />
      <div className="cdb">{P.pts.map((p, i) => <div key={p[0]} className="pvrow"><div className="pvn">{i + 1}</div><div><div className="pvt">{p[0]}</div><div className="pvd">{p[1]}</div></div></div>)}<div className="tk3" style={{ marginTop: 6 }}>相关主题：{P.k.map(id => { const k = KNOW.find(x => x.id === id); return k ? <a key={id} className="klink" onClick={() => openKnow(id)}>{k.t}</a> : null })}</div></div>
      <div className="cdf"><button className="btn btn-primary" onClick={previewGo}>明白了，开始本段</button></div></Mask> }
    if (d.kind === 'rule') return <Mask key={key} onClose={() => closeDlg('rule')}><DH_ t={`第 ${d.st.no} 项 · 规程依据`} onClose={() => closeDlg('rule')} /><div className="cdb"><Sec t="票面文字" cls="quote">{d.st.ticket}</Sec><Sec t="依据条款"><span className="tk3">{d.st.rule}</span></Sec><Sec t="为什么这样做">{d.st.why}</Sec></div></Mask>
    if (d.kind === 'ask') return <Mask key={key} wide={680} onClose={() => closeDlg('ask')}><DH_ t="问教练" sub="基于安规与操作票管理细则知识库" onClose={() => closeDlg('ask')} />
      <div className="cdb"><div style={{ display: 'flex', gap: 8, marginBottom: 12 }}><input className="rin" value={askQ} placeholder="例如：为什么要先拉线路侧刀闸？" autoFocus onChange={e => setAskQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') askRun(askQ) }} style={{ flex: 1 }} /><button className="btn btn-primary" onClick={() => askRun(askQ)}>提问</button></div>
        <div className="tk3" style={{ marginBottom: 8 }}>可以直接点：{suggest.map(q => <a key={q} className="klink" onClick={() => { setAskQ(q); askRun(q) }}>{q}</a>)}</div>
        {(d.busy || d.out) && <div><div className="msg o"><div className="av">问</div><div className="bd">{d.q}</div></div><div className="msg j"><div className="av">监</div><div className="bd">{d.busy ? '检索知识库…' : <><span style={{ whiteSpace: 'pre-line' }}>{d.out!.text}</span><div className="tk3" style={{ marginTop: 8 }}>依据：{d.out!.src}{d.out!.topic && <>　·　<a className="klink" onClick={() => openKnow(d.out!.topic!)}>查看主题</a></>}</div></>}</div></div></div>}</div></Mask>
    if (d.kind === 'demo') { const steps = demoSteps(d.st); const i = Math.max(0, d.i); return <Mask key={key} wide={760}><DH_ t={`第 ${d.st.no} 项 · 现场动作示范`} sub={`${LOC[d.st.loc].name}${d.st.target ? ' · ' + devName(d.st.target) : ''}`} onClose={demoClose} />
      <div className="cdb"><div className="dmsteps">{steps.map((s, k) => <span key={s.t} className={`dms ${k === i ? 'on' : ''}`} onClick={() => demoGo(k, false)}><i>{k + 1}</i>{s.t}</span>)}</div>
        <div className="dmstage"><DemoScene st={d.st} i={i} /></div><div className="dmcap"><b>{i + 1}. {steps[i].t}</b><span>{steps[i].say}</span></div><div className="dmtip">示范只演示动作要领，不代替你自己做。看完关掉，按票面自己走一遍五拍。</div></div>
      <div className="cdf"><button className="btn" disabled={i === 0} onClick={() => demoGo(i - 1, false)}>上一步</button><button className="btn" disabled={i === 3} onClick={() => demoGo(i + 1, false)}>下一步</button><button className="btn" onClick={() => demoGo(0)}>重放</button><button className="btn btn-primary" onClick={demoClose}>我来做一遍</button></div></Mask> }
    if (d.kind === 'fillAudit') { const r = d.r; const grp = ['票头', '漏项', '多项', '顺序']; return <Mask key={key} wide={880}><DH_ t={`拟票审核结果 · 第 ${S.fill.tries} 次提交`} onClose={() => closeDlg('fillAudit')} />
      <div className="cdb scrolly"><div className="fsc"><div className={`fscn ${r.total >= 85 ? 'good' : r.total >= 60 ? 'warn' : 'bad'}`}>{r.total}</div><div className="fscd"><div><b>票头要素</b><i>{r.hs}</i><span>/ 20 分 · 发令单位、发令人、受令人、操作任务各 5 分</span></div><div><b>项目完整性</b><i>{r.ps}</i><span>/ 50 分 · 漏一项或多一项各扣 7 分</span></div><div><b>执行顺序</b><i>{r.os}</i><span>/ 30 分 · 每处前后颠倒扣 6 分</span></div></div></div>
        {r.errs.length ? grp.map(g => { const es = r.errs.filter(e => e.g === g); if (!es.length) return null; return <Sec key={g} t={`${g} · ${es.length} 处`}>{es.map((e, i) => <div key={i} className="ferr"><div className="fet"><span className="ctag wn">{g}</span><b>{e.t}</b></div><div className="fex"><i>应为</i>{e.right}</div><div className="fex"><i>为什么</i>{e.why}</div><div className="fex rule"><i>依据</i>{e.rule}</div></div>)}</Sec> })
          : <Sec t="审核意见"><span style={{ color: '#1d7a4f' }}>票头要素完整，本段项目无漏项无多项，执行顺序正确。监护人复审通过。</span></Sec>}
        <Sec t="正确票面 · 第一段"><ol className="fok">{fillRight().map(s => <li key={s.no}>{s.ticket}<em>{s.rule}</em></li>)}</ol></Sec></div>
      <div className="cdf">{r.errs.length > 0 && <button className="btn" onClick={() => closeDlg('fillAudit')}>改一遍再交</button>}<button className="btn btn-primary" onClick={finishFill}>按正确票面签发，进入上岗前准备</button></div></Mask> }
    if (d.kind === 'report') { const R = reportData(); return <Mask key={key} wide={920}><DH_ t="本次陪练评估 · 摘要" sub="完整评分与复盘在「评分复盘」页" onClose={() => closeDlg('report')} />
      <div className="cdb scrolly"><div className="repgrid"><div style={{ textAlign: 'center' }}><Radar6 vals={R.vals} /><div className="repscore" style={{ color: R.red ? '#b03a2e' : '#1e3a6e' }}>{R.total}</div><div className="tk3">综合得分　{R.red ? '触发一票否决' : '本次评价'}</div></div>
        <div><Sec t="AI 复盘"><div className="airv">{genReview()}</div></Sec>
          <Sec t="本次过程">用时 {elapsedText()}　·　操作项 {STEPS.filter(s => s._done).length}/{S.plan ? S.plan.steps.length : STEPS.length} 项完成　·　违规 {S.vio.length} 项　·　主动中止上报 {S.abn.handled ? 1 : 0} 次</Sec>
          <Sec t="扣分与否决项 · 逐条扣分依据">{S.vio.length ? S.vio.map((v, i) => <div key={i} className="viorow"><span className={`ctag ${v.level === 'red' ? 'rl' : 'wn'}`}>{v.level === 'red' ? '一票否决' : v.level === 'major' ? '严重' : '不规范'}</span><b>第{v.step}项 {v.title}</b><b className={`viocut ${v.level === 'red' ? 'red' : ''}`}>{v.level === 'red' ? '综合得分记 0' : `${v.dimn} −${v.cut} 分`}</b><div className="tk3">{v.detail}</div>{v.rule && <div className="viorule">依据　{v.rule}</div>}</div>) : <span style={{ color: '#1d7a4f' }}>本次未触发扣分项。</span>}
            {S.hintCut > 0 && <div className="viorow"><span className="ctag wn">提示</span><b>使用教练提示 {S.hints.length} 次</b><b className="viocut">规程符合性 −{S.hintCut} 分</b><div className="tk3">一级提示每次 −1 分、二级 −2 分、三级（直接给答案）−4 分。</div></div>}</Sec>
          <Sec t="扣分标准"><div className="cutstd"><div><b>一票否决</b><span>触及红线（未验电即接地、带负荷拉合刀闸等），综合得分记 0，本次不计成绩</span></div><div><b>严重 −{CUT.major} 分</b><span>顺序错、状态判断错、越权操作等可能造成后果的违规</span></div><div><b>不规范 −{CUT.minor} 分</b><span>复诵不完整、记录漏填、未手指口述等过程不规范</span></div><div><b>教练提示 −1／−2／−4 分</b><span>按一级、二级、三级提示逐级递增，均计入规程符合性</span></div><div><b>主动识别 +8 分</b><span>自己核出票令不一致、异常中止上报等正确处置</span></div><div className="cutmath">维度得分 ＝ 100 ＋ 该维度扣分合计 × 1.2（下限 4 分，有加分项再 +6）；综合得分 ＝ 六个维度算术平均，触发一票否决时直接记 0。</div></div></Sec>
          {S.praise.length > 0 && <Sec t="加分项">{S.praise.map((p, i) => <div key={i} style={{ padding: '5px 0' }}><span className="ctag ok">加分</span><b>{p.title}</b><div className="tk3">{p.detail}</div></div>)}</Sec>}
          <Sec t="能力标签">{DIMS6.map((t, i) => <span key={t} className={`abtag ${R.vals[i] > 80 ? 'ok' : R.vals[i] > 55 ? 'wn' : 'bad'}`}>{t} {R.vals[i] > 80 ? '达标' : R.vals[i] > 55 ? '待提升' : '短板'}</span>)}</Sec></div></div></div>
      <div className="cdf"><button className="btn" onClick={() => closeDlg('report')}>关闭</button><button className="btn btn-primary" onClick={() => { closeDlg('report'); window.dispatchEvent(new CustomEvent('coach:go', { detail: 'review' })) }}>进入评分复盘</button></div></Mask> }
    return null
  })}</>
}

/* ---------- 导览 ---------- */
function Tour() {
  const [r, setR] = useState<DOMRect | null>(null)
  const i = S.tour
  useEffect(() => { if (i == null) return; const n = document.querySelector(TOUR[i][0]); if (!n) { tourStep(1); return } setR(n.getBoundingClientRect()) }, [i])
  if (i == null || !r) return null
  const [, t, d] = TOUR[i]; const bw = 330, bh = 180
  const tall = r.height > innerHeight * .5
  let bx: number, by: number
  if (tall) { bx = r.right + 16; by = r.top + Math.min(60, r.height * .2) } else if (r.top < innerHeight * .5) { bx = r.left + r.width / 2 - bw / 2; by = r.bottom + 14 } else { bx = r.left + r.width / 2 - bw / 2; by = r.top - bh - 14 }
  bx = Math.min(Math.max(12, bx), innerWidth - bw - 12); by = Math.min(Math.max(12, by), innerHeight - bh - 12)
  return <>
    <div className="tourring" style={{ left: r.left - 4, top: r.top - 4, width: r.width + 8, height: r.height + 8 }} />
    <div className="tourbox" style={{ left: bx, top: by, width: bw }}><div className="tourk">界面导览 {i + 1}/{TOUR.length}</div><div className="tourt">{t}</div><div className="tourd">{d}</div>
      <div className="tourbt"><button className="btn btn-sm" onClick={tourEnd}>跳过</button><span style={{ flex: 1 }} />{i > 0 && <button className="btn btn-sm" onClick={() => tourStep(-1)}>上一步</button>}<button className="btn btn-sm btn-primary" onClick={() => tourStep(1)}>{i === TOUR.length - 1 ? '开始陪练' : '下一步'}</button></div></div>
  </>
}

/* ---------- 主体 ---------- */
export default function Arena({ onHome, onGo, pre }: { onHome: () => void; onGo: (h: string) => void; pre: string | null }) {
  useEngine()
  const chatRef = useRef<HTMLDivElement>(null)
  useEffect(() => { chatRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [S.chat.length])
  useEffect(() => { ensureEntry(pre); startIdleWatch(() => !!document.getElementById('stage')) }, [])
  useEffect(() => { const f = (e: Event) => onGo((e as CustomEvent).detail); window.addEventListener('coach:go', f); return () => window.removeEventListener('coach:go', f) }, [onGo])
  const c = CHARACTERS[S.dhKey]; const open = sheetOpen()
  const map: Record<string, [string, string]> = { j: ['监', 'j'], o: ['操', 'o'], s: ['系', 's'], d: ['调', 'j'], z: ['值', 's'] }
  const lastCoach = [...S.chat].reverse().find(m => m.who === 'j' || m.who === 'd' || m.who === 'z')
  return (
    <div className="arena-root" onPointerDown={touch} onKeyDown={touch}>
      <Top onHome={onHome} />
      <div className="main2">
        <div className={`arena ${open ? 'sheetopen' : ''}`}>
          <div className="scenebg"><SceneBg loc={S.loc} /></div>
          <div className="arena-top">
            <div className="arena-l" id="stage">
              <DigitalHuman name={c.name} img={c.img} tint={c.tint} dh={S.dh} />
              <div className="stage-tag"><div className="loc">{LOC[S.loc].name}</div><div className="live"><i /><span>内置渲染</span></div></div>
              <div className="rolecard"><b>{c.name}</b><span>AI数字人陪练教练 · {c.role} · {c.org}</span></div>
              <div className={`sub ${S.sub.live ? 'live' : ''}`}>{S.sub.text && <><div className="subwho">{S.sub.who}</div><div className="subtxt">{S.sub.text}{S.sub.live && <span className="dh-wave"><i /><i /><i /><i /><i /></span>}</div></>}</div>
            </div>
            <div className="arena-r"><div className="chathead">现场对练<span>{MODES[S.mode].n}</span></div>
              <div className="cb" ref={chatRef}>{S.chat.map(m => <div key={m.id} className={`msg ${map[m.who][1]} ${m.cls || ''} ${lastCoach && lastCoach.id === m.id ? 'latest' : ''}`}><div className="av">{map[m.who][0]}</div><div className="bd" dangerouslySetInnerHTML={{ __html: m.text }} /></div>)}</div></div>
          </div>
          <div className={`sheet ${open ? '' : 'closed'}`} id="sheet">
            <div className="sheethead"><span className="sheettitle">{panelTitle()}</span>
              <div className="locbar" id="locbar">{(Object.keys(LOC) as (keyof typeof LOC)[]).map(k => { const st = STEP(); const need = S.stage === 'run' && st && st.loc === k && S.loc !== k; return <button key={k} className={`locbtn ${S.loc === k ? 'cur' : ''} ${need ? 'need' : ''}`} title={LOC[k].name} onClick={() => { touch(); goLoc(k) }}>{LOCSHORT[k]}</button> })}</div>
              <button className="sheetfold" onClick={() => sheetSet('closed')}>收起</button></div>
            <div className="panelwrap" id="pw"><Panelwrap /></div>
          </div>
          {!open && <button className={`sheetpeek ${S.stage === 'run' && !sheetWant() && S.beat === 1 ? 'need' : ''}`} onClick={() => sheetSet('open')}>展开作业面板</button>}
        </div>
        <div className="side"><Taskbar /><KpBox /><Ticket /></div>
      </div>
      <ActBar />
      <Dialogs onHome={onHome} />
      <div className="toasts">{S.toasts.map(t => <div key={t.id} className={`toast ${t.k}`}>{t.t}</div>)}</div>
      <Tour />
      <div className={`demo ${S.demoOpen ? 'open' : ''}`}><div className="bd"><div className="t">讲师演示台</div>
        <button onClick={autoStep}>自动执行当前节拍</button><button onClick={demoSkip}>跳过当前准备阶段</button><button onClick={demoInjectRed}>触发红线：未验电合地刀</button><button onClick={demoInjectAbn}>注入异常：刀闸位置指示不一致</button>
        <label className="spd">语速<select value={S.speed} onChange={e => setSpeed(+e.target.value)}><option value={1}>正常</option><option value={0.5}>快</option><option value={0.25}>极快</option></select></label></div>
        <button className="tg" onClick={toggleDemo}>讲师演示台</button></div>
    </div>)
}
export { HOME_TASK, TASK_TEXT, WUFANG }
