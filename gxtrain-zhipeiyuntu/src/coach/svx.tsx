/* 作业面板：每个作业位置都是一张可操作的设备图，学员在图上动手，图上看到变化。
   调度电话 / 五防电脑 / 监控后台 / 间隔现场 / 8P 测控屏 / 20P 保护屏 / 就地控制柜，外加拟票与上岗前准备。 */
import React, { useRef, useState } from 'react'
import type { Loc } from './script'
import { S, STEP, devClick, needHold, targetDev, toast, touch, WUFANG, RISKS, LOC, answerPhone, dialPhone, cmpResult, setOrd, pickBay,
  fillRight, fillWrong, fillHead, fillAdd, fillMove, fillDel, auditFill, ticketNo, prepToggle, riskConfirm, prepAll, prepOk, enterWufang, peekStop } from './engine'
import { FLOW, FHEAD, AUDIT, DRESS, devName, DISPATCH, DISPATCHER, TASK_TEXT, STATION, HOME_USER } from './data'

const LIVE = '#b03a2e', DEAD = '#1d7a4f', GND = '#b8791d'

/* ---------- 可操作设备包装：目标高亮、已手指、长按执行 ---------- */
export function Dev({ id, x = 0, y = 0, hit, children, extra }: { id: string; x?: number; y?: number; hit: [number, number, number, number]; children: React.ReactNode; extra?: React.ReactNode }) {
  const tgt = targetDev() === id, sel = S.sel === id, chg = S.lastChg === id
  const [holding, setHolding] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout> | null>(null); const t0 = useRef(0)
  const fire = () => devClick(id)
  const clean = () => { if (t.current) { clearTimeout(t.current); t.current = null } setHolding(false) }
  const st = STEP()
  const verb = S.beat === 1 ? '手指口述' : (st && (st.ticket.match(/^(拉开|合上|断开|检查|核对|悬挂|切换|将|取下|投入|退出)/) || ['执行'])[0]) || '执行'
  const label = tgt && st ? `第${st.no}项 · ${verb === '将' ? '切换' : verb}` : ''
  const w = label.length * 11 + 18
  return (
    <g className={`dev ${tgt ? 'tgt' : ''} ${sel ? 'sel' : ''} ${chg ? 'chg' : ''} ${holding ? 'holding' : ''}`} data-dev={id} transform={`translate(${x},${y})`}
      onClick={e => { e.stopPropagation(); touch(); if (!needHold()) fire() }}
      onPointerDown={e => { if (!needHold()) return; e.stopPropagation(); t0.current = performance.now(); setHolding(true); t.current = setTimeout(() => { clean(); fire() }, S.beat === 3 ? 700 : 500) }}
      onPointerUp={() => { if (!t.current) return; const held = performance.now() - t0.current; clean(); if (held > 140) toast(S.beat === 3 ? '长按设备完成执行' : '长按设备完成手指口述') }}
      onPointerLeave={() => { if (t.current) clean() }}>
      <rect className="hit" x={hit[0]} y={hit[1]} width={hit[2]} height={hit[3]} rx={6} />
      {children}
      {extra}
      {label && (
        <g className="arlabg" pointerEvents="none">
          <rect x={hit[0] + hit[2] / 2 - w / 2} y={hit[1] - 30} width={w} height={22} rx={11} fill="#14213d" />
          <path d={`M ${hit[0] + hit[2] / 2 - 5} ${hit[1] - 8} l 5 6 5 -6 z`} fill="#14213d" />
          <text x={hit[0] + hit[2] / 2} y={hit[1] - 15} textAnchor="middle" fontSize={11.5} fill="#fff">{label}</text>
        </g>
      )}
      {sel && S.beat === 1 && (
        <g className="finger" pointerEvents="none" transform={`translate(${hit[0] + hit[2] - 10},${hit[1] + hit[3] - 6})`}>
          <path d="M0 0 c-3 -6 -4 -12 -1 -14 2.4 -1.6 5 0 6 4 l2 6 c4 -1.4 12 -1 13 4 1 6 -3 12 -10 13 -6 1 -9 -3 -10 -13 z" fill="#e8c8a8" stroke="#b98d5e" strokeWidth={1.4} />
          <text x={22} y={4} fontSize={9} fill="#a8823a" fontWeight={700}>已手指</text>
        </g>
      )}
    </g>
  )
}

/* ---------- 元件库 ---------- */
export const Lamp = ({ x, y, on, color, lbl, r = 9 }: { x: number; y: number; on: boolean; color: string; lbl?: string; r?: number }) => (
  <g transform={`translate(${x},${y})`}>
    {on && <circle r={r + 6} fill={color} opacity={.18}><animate attributeName="opacity" values=".18;.05;.18" dur="1.6s" repeatCount="indefinite" /></circle>}
    <circle r={r} fill={on ? color : '#e9ecf1'} stroke={on ? color : '#c8d0dc'} strokeWidth={1.6} />
    <circle cx={-r * .3} cy={-r * .3} r={r * .32} fill="#fff" opacity={on ? .55 : .35} />
    {lbl && <text y={r + 14} textAnchor="middle" className="svl">{lbl}</text>}
  </g>
)
export function Knob({ id, x, y, opts, val, name, desc }: { id: string; x: number; y: number; opts: [string, string]; val: string; name: string; desc?: string }) {
  const on = val === opts[1]
  const mark = (i: number, txt: string) => { const act = (i === 1) === on; const dx = i ? 40 : -40; return (
    <g key={i}><text x={dx} y={-30} textAnchor={i ? 'start' : 'end'} fontSize={act ? 11.5 : 10} fontWeight={act ? 700 : 400} fill={act ? '#a8823a' : '#8a94a6'}>{txt}</text>
      {act && <rect x={i ? 36 : -40 - txt.length * 12} y={-42} width={txt.length * 12 + 8} height={16} rx={4} fill="none" stroke="#a8823a" strokeWidth={1.4} />}</g>) }
  return (
    <Dev id={id} x={x} y={y} hit={[-58, -50, 116, 114]}>
      <rect x={-38} y={-38} width={76} height={76} rx={8} fill="#eef1f6" stroke="#c8d0dc" />
      <circle r={24} fill="#fbfbf9" stroke="#b9c3d2" strokeWidth={2} />
      <path d="M -17 -17 A 24 24 0 0 1 17 -17" fill="none" stroke="#c8d0dc" strokeWidth={1.2} strokeDasharray="2 3" />
      <g className="ptr" transform={`rotate(${on ? 40 : -40})`}><rect x={-4} y={-25} width={8} height={26} rx={3} fill={on ? '#b8791d' : '#2b4e92'} /><circle r={6} fill="#d5dce6" /></g>
      {mark(0, opts[0])}{mark(1, opts[1])}
      <text y={52} textAnchor="middle" className="svn">{name}</text>
      {desc && <text y={64} textAnchor="middle" className="svd">{desc}</text>}
    </Dev>)
}
export const Mcb = ({ id, x, y, name, desc, off }: { id: string; x: number; y: number; name: string; desc: string; off: boolean }) => (
  <Dev id={id} x={x} y={y} hit={[-34, -46, 68, 108]}>
    <rect x={-18} y={-36} width={36} height={72} rx={4} fill="#e2e7ef" stroke="#c8d0dc" />
    <rect x={-12} y={-30} width={24} height={60} rx={3} fill="#eef1f6" />
    <rect className="lever" x={-9} y={off ? 4 : -26} width={18} height={22} rx={3} fill={off ? DEAD : LIVE} />
    <text y={-40} textAnchor="middle" className="svn">{name}</text>
    <text y={50} textAnchor="middle" className="svd">{desc}</text>
    <text y={62} textAnchor="middle" className={`svs ${off ? 'b' : 'a'}`}>{off ? '断开' : '合闸'}</text>
  </Dev>)
export const PushBtn = ({ id, x, y, color, lbl, pressed }: { id: string; x: number; y: number; color: string; lbl: string; pressed: boolean }) => (
  <Dev id={id} x={x} y={y} hit={[-30, -30, 60, 74]}>
    <circle r={22} fill="#eef1f6" stroke="#c8d0dc" strokeWidth={2} />
    <circle r={15} fill={color} stroke={pressed ? '#fff' : color} strokeWidth={2} />
    <circle cx={-5} cy={-5} r={4} fill="#fff" opacity={.45} />
    <text y={38} textAnchor="middle" className="svn">{lbl}</text>
  </Dev>)
const TagCard = ({ x, y }: { x: number; y: number }) => (
  <g className="tagcard2" transform={`translate(${x},${y})`}>
    <line x1={0} y1={0} x2={0} y2={8} stroke="#7a8478" strokeWidth={1.5} />
    <rect x={-34} y={8} width={68} height={46} rx={3} fill="#fff8e6" stroke="#b03a2e" strokeWidth={2.4} />
    <text x={0} y={28} textAnchor="middle" fontSize={11} fontWeight={700} fill="#7a1414">禁止合闸</text>
    <text x={0} y={44} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#7a1414">线路有人工作！</text>
  </g>)
export const Hook = ({ id, x, y, hung, lbl }: { id: string; x: number; y: number; hung: boolean; lbl: string }) => (
  <Dev id={id} x={x} y={y} hit={[-40, -12, 80, hung ? 78 : 30]}>
    <path d="M -6 0 a 6 6 0 1 1 12 0 v 6" fill="none" stroke="#7a8478" strokeWidth={2.4} strokeLinecap="round" />
    {hung ? <TagCard x={0} y={10} /> : <text y={26} textAnchor="middle" className="svd" fill="#a8823a">{lbl}</text>}
  </Dev>)
export const Plate = ({ x, y, w, t1, t2 }: { x: number; y: number; w: number; t1: string; t2: string }) => (
  <g transform={`translate(${x},${y})`}><rect x={0} y={0} width={w} height={34} rx={3} fill="#fff" stroke="#6b7a90" strokeWidth={1.6} />
    <text x={w / 2} y={14} textAnchor="middle" fontSize={10.5} fill="#14213d" fontWeight={700}>{t1}</text>
    <text x={w / 2} y={27} textAnchor="middle" fontSize={9.5} fill="#5c6b7f">{t2}</text></g>)
const Check = ({ x, y }: { x: number; y: number }) => <g><circle cx={x} cy={y} r={7} fill="#1d7a4f" /><path d={`M ${x - 3.5} ${y} l 2.4 2.6 4 -5`} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" /></g>
export const Win = ({ id, x, y, txt, color, lbl }: { id: string; x: number; y: number; txt: string; color: string; lbl: string }) => (
  <Dev id={id} x={x} y={y} hit={[-40, -30, 80, 76]}>
    <rect x={-30} y={-22} width={60} height={44} rx={4} fill="#e2e7ef" stroke="#b9c3d2" />
    <rect x={-18} y={-14} width={36} height={28} rx={3} fill="#1f2d3d" />
    <text y={6} textAnchor="middle" fontSize={16} fontWeight={700} fill={color} fontFamily="monospace">{txt}</text>
    <text y={38} textAnchor="middle" className="svd">{lbl}</text>
    {S.gis[id.replace('gis_', '')] && <Check x={28} y={-22} />}
  </Dev>)
export const Arm = ({ id, x, y, open, lbl }: { id: string; x: number; y: number; open: boolean; lbl: string }) => {
  const a = open ? -52 : 14
  return (
    <Dev id={id} x={x} y={y} hit={[-44, -40, 88, 84]}>
      <rect x={-30} y={-30} width={60} height={60} rx={5} fill="#e6eaf1" stroke="#b9c3d2" />
      <path d="M -20 -20 A 28 28 0 0 1 20 -8" fill="none" stroke="#c8d0dc" strokeWidth={7} strokeLinecap="round" />
      <rect x={-24} y={-25} width={7} height={7} rx={1.5} fill="#8b98a8" /><text x={-27} y={-27} textAnchor="end" className="svl">分</text>
      <rect x={17} y={-12} width={7} height={7} rx={1.5} fill="#8b98a8" /><text x={27} y={-6} className="svl">合</text>
      <g transform={`rotate(${a})`} style={{ transition: 'transform .9s' }}>
        <rect x={-5.5} y={-25} width={11} height={27} rx={3} fill="#7f8a98" stroke="#5c6b7f" strokeWidth={1.2} />
        <circle cy={-25} r={4.6} fill="#a8823a" stroke="#6f561f" strokeWidth={1.2} /><circle cy={-25} r={1.6} fill="#5c4a10" />
      </g>
      <circle r={8.5} fill="#b9c3d2" stroke="#7a8490" strokeWidth={1.6} /><circle r={3} fill="#8b98a8" />
      <text y={42} textAnchor="middle" className="svd">{lbl}</text>
      {S.gis[id.replace('gis_', '')] && <Check x={30} y={-28} />}
    </Dev>)
}
export const Shaft = ({ id, x, y, open, lbl }: { id: string; x: number; y: number; open: boolean; lbl: string }) => {
  const a = open ? -34 : 34
  return (
    <Dev id={id} x={x} y={y} hit={[-46, -34, 92, 80]}>
      <rect x={-34} y={-7} width={20} height={14} rx={2} fill="#b9c3d2" stroke="#7a8490" />
      <rect x={14} y={-7} width={20} height={14} rx={2} fill="#b9c3d2" stroke="#7a8490" />
      <circle r={17} fill="#cfd6e1" stroke="#7a8490" strokeWidth={1.6} /><circle r={12} fill="#e2e7ef" />
      <line x1={-13} y1={-13} x2={-8} y2={-8} stroke="#5c6b7f" strokeWidth={2} /><text x={-17} y={-16} textAnchor="end" className="svl">分</text>
      <line x1={13} y1={-13} x2={8} y2={-8} stroke="#5c6b7f" strokeWidth={2} /><text x={17} y={-16} className="svl">合</text>
      <g transform={`rotate(${a})`} style={{ transition: 'transform .9s' }}><rect x={-2} y={-17} width={4} height={17} rx={1} fill="#fbfbf9" stroke="#8b98a8" strokeWidth={.8} /></g>
      <circle r={3.4} fill="#8b98a8" />
      <text y={40} textAnchor="middle" className="svd">{lbl}</text>
      <text y={30} textAnchor="middle" className="svl">漆线对准「{open ? '分' : '合'}」</text>
      {S.gis[id.replace('gis_', '')] && <Check x={32} y={-24} />}
    </Dev>)
}
export const Face = ({ w, h, title, sub }: { w: number; h: number; title: string; sub?: string }) => (
  <g><rect x={8} y={8} width={w - 16} height={h - 16} rx={6} fill="#eef1f6" stroke="#c8d0dc" strokeWidth={2} />
    <rect x={8} y={8} width={w - 16} height={30} rx={6} fill="#e2e7ef" />
    <text x={w / 2} y={28} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#14213d" letterSpacing={1}>{title}</text>
    {sub && <text x={w - 20} y={28} textAnchor="end" fontSize={10} fill="#5c6b7f" fontFamily="monospace">{sub}</text>}</g>)

/* ---------- 场景背景 ---------- */
export function SceneBg({ loc }: { loc: Loc }) {
  const wall = '#eef2f7', wall2 = '#f2f5f9', floor = '#f5f7fa', edge = '#d8dfe9'
  const Lamp0 = ({ x, w }: { x: number; w: number }) => <g><ellipse cx={x} cy={18} rx={w} ry={7} fill="#3d4f6b" opacity={.5} /><path d={`M ${x - w} 18 L ${x - w * 3.4} 300 L ${x + w * 3.4} 300 L ${x + w} 18 Z`} fill="url(#gl)" opacity={.16} /></g>
  const CabRow = ({ y, n, w, h, c }: { y: number; n: number; w: number; h: number; c: string }) => <g>{Array.from({ length: n }).map((_, i) => { const x = 14 + i * (w + 5); return <g key={i}><rect x={x} y={y} width={w} height={h} rx={2} fill={c} stroke={edge} /><rect x={x + 3} y={y + 5} width={w - 6} height={h * .18} fill="#e8edf4" /><circle cx={x + w - 8} cy={y + h * .34} r={2} fill={DEAD} opacity={.8} /><circle cx={x + w - 8} cy={y + h * .42} r={2} fill={LIVE} opacity={.55} /><rect x={x + 4} y={y + h - 16} width={w - 8} height={9} rx={1} fill="#e2e7ef" /></g> })}</g>
  let inner: React.ReactNode
  if (loc === 'phone') inner = <g><Lamp0 x={90} w={26} /><Lamp0 x={300} w={26} /><rect width={420} height={330} fill={wall} /><rect y={330} width={420} height={290} fill={floor} />
    <path d="M0 330 L120 620 M420 330 L300 620 M0 400 L420 400" stroke={edge} strokeWidth={1} opacity={.5} />
    <rect x={24} y={120} width={150} height={96} rx={3} fill="#f2f5f9" stroke={edge} /><text x={34} y={140} fontSize={9} fill="#8a94a6" fontFamily="monospace">调度操作指令记录簿</text>
    {[150, 162, 174, 186].map(y => <rect key={y} x={34} y={y} width={130} height={1} fill="#d8dfe9" />)}
    <rect x={256} y={150} width={128} height={70} rx={4} fill="#eef2f7" stroke={edge} /><rect x={266} y={160} width={60} height={30} rx={3} fill="#dfe5ee" />
    <circle cx={352} cy={172} r={9} fill="#dfe9f5" /><text x={352} y={176} fontSize={9} fill="#1e3a6e" textAnchor="middle" fontFamily="monospace">DIAL</text>
    <rect x={266} y={196} width={108} height={14} rx={2} fill="#e8edf4" /><rect y={300} width={420} height={30} fill="#e8edf4" opacity={.7} /></g>
  else if (loc === 'hmi') inner = <g><Lamp0 x={210} w={40} /><rect width={420} height={360} fill={wall2} /><rect y={360} width={420} height={260} fill={floor} />
    <rect x={20} y={40} width={380} height={180} rx={4} fill="#f5f7fa" stroke={edge} strokeWidth={2} />
    <g opacity={.55}><path d="M40 90 H380 M40 140 H380" stroke={DEAD} strokeWidth={1.6} /><path d="M110 90 V140 M210 90 V140 M310 90 V140" stroke={LIVE} strokeWidth={1.4} />
      <rect x={104} y={106} width={12} height={12} fill={LIVE} /><rect x={204} y={106} width={12} height={12} fill={LIVE} /><rect x={304} y={106} width={12} height={12} fill={DEAD} />
      <path d="M40 160 H380" stroke="#b3bfcf" strokeWidth={1} /><rect x={40} y={170} width={120} height={6} fill="#d8dfe9" /><rect x={40} y={182} width={90} height={6} fill="#d8dfe9" /><rect x={240} y={170} width={140} height={6} fill="#d8dfe9" /><rect x={240} y={182} width={110} height={6} fill="#d8dfe9" /></g>
    <rect x={60} y={250} width={300} height={12} rx={3} fill="#f2f5f9" stroke={edge} /><rect x={150} y={262} width={120} height={60} fill="#e8edf4" stroke={edge} /><rect x={30} y={330} width={360} height={14} rx={3} fill="#f2f5f9" stroke={edge} />
    <path d="M0 360 L110 620 M420 360 L310 620" stroke={edge} opacity={.5} /></g>
  else if (loc === 'wufang') inner = <g><Lamp0 x={210} w={34} /><rect width={420} height={350} fill={wall} /><rect y={350} width={420} height={270} fill={floor} />
    <rect x={120} y={120} width={180} height={120} rx={4} fill="#f5f7fa" stroke={edge} strokeWidth={2} />
    <g opacity={.6}><path d="M136 160 H284 M136 200 H284" stroke={DEAD} strokeWidth={1.4} /><path d="M190 160 V200 M240 160 V200" stroke={LIVE} strokeWidth={1.2} /></g>
    <rect x={150} y={248} width={120} height={10} rx={2} fill="#f2f5f9" stroke={edge} /><rect x={100} y={270} width={220} height={14} rx={3} fill="#f2f5f9" stroke={edge} />
    <rect x={316} y={240} width={52} height={44} rx={3} fill="#eef2f7" stroke={edge} /><text x={342} y={266} fontSize={8} fill="#8a94a6" textAnchor="middle" fontFamily="monospace">电脑钥匙</text>
    <path d="M0 350 L120 620 M420 350 L300 620" stroke={edge} opacity={.5} /></g>
  else if (loc === 'bay') inner = <g><Lamp0 x={120} w={22} /><Lamp0 x={300} w={22} /><rect width={420} height={300} fill="#f6f8fb" /><rect y={300} width={420} height={320} fill="#f2f5f9" />
    <g stroke={edge} fill="none"><path d="M0 300 H420 M0 380 H420" /></g>
    <rect x={30} y={150} width={360} height={34} rx={17} fill="#dfe5ee" stroke="#d3d9e3" /><rect x={30} y={150} width={360} height={12} rx={6} fill="#c8d0dc" opacity={.7} />
    {[86, 196, 306].map(x => <rect key={x} x={x} y={184} width={34} height={120} rx={8} fill="#dfe5ee" stroke="#d3d9e3" />)}
    {[103, 213, 323].map(x => <circle key={x} cx={x} cy={140} r={9} fill="#f2f5f9" stroke="#d3d9e3" />)}
    <rect x={60} y={304} width={86} height={76} rx={3} fill="#e6eaf1" stroke="#d3d9e3" /><text x={103} y={322} fontSize={8.5} fill="#8b98a8" textAnchor="middle" fontFamily="monospace">1161</text>
    <rect x={170} y={304} width={86} height={76} rx={3} fill="#e6eaf1" stroke="#d3d9e3" /><text x={213} y={322} fontSize={8.5} fill="#8b98a8" textAnchor="middle" fontFamily="monospace">1162</text>
    <rect x={280} y={304} width={86} height={76} rx={3} fill="#dfe5ee" stroke="#8fa3c2" /><text x={323} y={322} fontSize={8.5} fill="#1e3a6e" textAnchor="middle" fontFamily="monospace">1163</text>
    <circle cx={299} cy={340} r={3.4} fill={LIVE} /><circle cx={311} cy={340} r={3.4} fill={GND} /><circle cx={323} cy={340} r={3.4} fill={DEAD} />
    <rect y={382} width={420} height={8} fill={GND} opacity={.18} /><path d="M0 390 L60 620 M420 390 L360 620" stroke={edge} opacity={.4} /></g>
  else if (loc === 'p8' || loc === 'p20') inner = <g><Lamp0 x={120} w={24} /><Lamp0 x={300} w={24} /><rect width={420} height={340} fill={wall2} /><rect y={340} width={420} height={280} fill={floor} />
    <CabRow y={60} n={5} w={74} h={280} c={loc === 'p8' ? '#e6eaf1' : '#e2e7ef'} /><rect y={340} width={420} height={6} fill="#d8dfe9" /><path d="M0 346 L100 620 M420 346 L320 620" stroke={edge} opacity={.45} /></g>
  else inner = <g><Lamp0 x={210} w={30} /><rect width={420} height={330} fill={wall} /><rect y={330} width={420} height={290} fill={floor} />
    <rect x={96} y={70} width={228} height={290} rx={4} fill="#e6eaf1" stroke="#d3d9e3" strokeWidth={2} /><rect x={104} y={80} width={212} height={42} rx={2} fill="#eef2f7" />
    <text x={210} y={106} fontSize={10} fill="#8b98a8" textAnchor="middle" fontFamily="monospace">1163 就地控制柜</text>
    <circle cx={140} cy={150} r={9} fill={LIVE} opacity={.85} /><circle cx={168} cy={150} r={9} fill={GND} opacity={.85} /><circle cx={196} cy={150} r={9} fill={DEAD} opacity={.85} />
    <rect x={120} y={180} width={180} height={44} rx={3} fill="#eef2f7" stroke="#d3d9e3" /><rect x={120} y={234} width={84} height={34} rx={3} fill="#eef2f7" stroke="#d3d9e3" /><rect x={216} y={234} width={84} height={34} rx={3} fill="#eef2f7" stroke="#d3d9e3" /><rect x={120} y={278} width={180} height={54} rx={3} fill="#eef2f7" stroke="#d3d9e3" />
    <path d="M0 330 L110 620 M420 330 L310 620" stroke={edge} opacity={.45} /></g>
  return (
    <svg viewBox="0 0 420 620" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
      <defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d4f6b" /><stop offset="100%" stopColor="#3d4f6b" stopOpacity={0} /></linearGradient>
        <radialGradient id="vg" cx="50%" cy="45%" r="72%"><stop offset="55%" stopColor="#000" stopOpacity={0} /><stop offset="100%" stopColor="#0a1c38" stopOpacity={.5} /></radialGradient></defs>
      {inner}<rect width={420} height={620} fill="url(#vg)" />
    </svg>)
}

/* ---------- 一次接线图 ---------- */
export function Sld({ dev, sim, target, done, scada = true, chg }: { dev?: Record<string, string>; sim?: boolean; target?: string | null; done?: string[]; scada?: boolean; chg?: string | null }) {
  const d = dev || S.dev
  const cbOpen = d.CB1163 === 'open', d4 = d.DS11634 === 'open', d2 = d.DS11632 === 'open', es = d.ES116340 === 'close'
  const segA = d2 ? DEAD : LIVE, segB = (d2 || cbOpen) ? DEAD : LIVE, segC = (d2 || cbOpen || d4) ? DEAD : LIVE
  const tgt = target !== undefined ? target : targetDev()
  const X = 404
  const cls = (id: string) => `dev ${tgt === id ? 'tgt' : ''} ${chg === id ? 'chg' : ''} ${sim && done && done.includes(id) ? 'simdone' : ''}`
  const dsSym = (open: boolean, color: string) => <g>
    <line x1={0} y1={-22} x2={0} y2={-13} stroke={color} strokeWidth={2.6} /><line x1={-8} y1={-13} x2={8} y2={-13} stroke={color} strokeWidth={3} /><line x1={-8} y1={13} x2={8} y2={13} stroke={color} strokeWidth={3} /><line x1={0} y1={13} x2={0} y2={22} stroke={color} strokeWidth={2.6} />
    <line className="blade" x1={0} y1={13} x2={0} y2={-13} stroke={color} strokeWidth={3.4} strokeLinecap="round" transform={`rotate(${open ? -38 : 0} 0 13)`} style={{ transition: 'transform .8s' }} /></g>
  const esC = es ? GND : DEAD
  const esSym = <g><line x1={0} y1={0} x2={10} y2={0} stroke={esC} strokeWidth={2.6} /><line x1={10} y1={-9} x2={10} y2={9} stroke={esC} strokeWidth={3} />
    <line className="blade" x1={10} y1={0} x2={30} y2={0} stroke={esC} strokeWidth={3.4} strokeLinecap="round" transform={`rotate(${es ? 0 : -38} 10 0)`} style={{ transition: 'transform .8s' }} />
    <line x1={30} y1={-10} x2={30} y2={10} stroke={esC} strokeWidth={2.8} /><line x1={34} y1={-6} x2={34} y2={6} stroke={esC} strokeWidth={2.4} /><line x1={38} y1={-2.8} x2={38} y2={2.8} stroke={esC} strokeWidth={2.2} /></g>
  const stub = (x: number, name: string, no: string, up: boolean) => <g key={no}>
    <line x1={x} y1={up ? 54 : 100} x2={x} y2={up ? 30 : 124} stroke={LIVE} strokeWidth={2} /><rect x={x - 7} y={up ? 16 : 124} width={14} height={14} fill={LIVE} />
    <text x={x} y={up ? 8 : 152} className="devlbl" textAnchor="middle">{no}</text><text x={x} y={up ? -4 : 164} className="devlbl" textAnchor="middle" fill="#8a94a6">{name}</text></g>
  const DevG = ({ id, x, y, w, h, sym, no, name }: { id: string; x: number; y: number; w: number; h: number; sym: React.ReactNode; no: string; name: string }) => (
    <g className={cls(id)} data-dev={id} transform={`translate(${x},${y})`} onClick={e => { e.stopPropagation(); touch(); devClick(id) }} style={{ cursor: 'pointer' }}>
      <rect className="hit" x={-w / 2} y={-h / 2} width={w} height={h} rx={4} />{sym}
      <text className="devlbl" x={w / 2 + 6} y={-1}>{no}</text><text className="devnm" x={w / 2 + 6} y={12}>{name}</text>
      {sim && done && done.includes(id) && <Check x={w / 2 + 2} y={-h / 2 + 2} />}
      {tgt === id && S.stage === 'run' && STEP() && <g pointerEvents="none"><rect x={-w / 2 - 6} y={-h / 2 - 30} width={112} height={20} rx={10} fill="#14213d" /><text x={-w / 2 + 50} y={-h / 2 - 16} textAnchor="middle" fontSize={10.5} fill="#fff">第{STEP()!.no}项 · {S.beat === 1 ? '手指口述' : '执行'}</text></g>}
    </g>)
  const cur = cbOpen ? ['0.0', '0.0', '0.0'] : ['312', '308', '315']
  return (
    <svg viewBox="0 -38 764 412" className={`sldsvg ${sim ? 'sim' : ''}`}>
      <text x={20} y={-22} fontSize={11} fill={sim ? '#a8823a' : '#1e3a6e'} fontFamily="monospace" letterSpacing={2}>{sim ? '五防模拟接线图 · 模拟态' : `${STATION} · 培训三线1163开关间隔分图`}</text>
      <line x1={20} y1={54} x2={470} y2={54} stroke={LIVE} strokeWidth={5} /><text x={476} y={58} className="devlbl" fill="#b03a2e">110kV 1M</text>
      <line x1={20} y1={100} x2={470} y2={100} stroke={LIVE} strokeWidth={5} /><text x={476} y={104} className="devlbl" fill="#b03a2e">110kV 2M</text>
      {stub(70, '培训一线', '1161', true)}{stub(160, '#1主变变高', '1101', true)}{stub(250, '110kV 1M PT', '111PT', true)}
      {stub(70, '培训二线', '1162', false)}{stub(160, '#2主变变高', '1102', false)}{stub(250, '#3主变变高', '1103', false)}{stub(312, '110kV 2M PT', '112PT', false)}
      {!cbOpen && <circle r={3} fill="#ff8a65"><animateMotion dur="2.6s" repeatCount="indefinite" path={`M20 100 H ${X} V 352`} /></circle>}
      <rect x={X - 56} y={112} width={282} height={262} rx={6} fill="rgba(30,58,110,.05)" stroke="#d8dfe9" strokeDasharray="4 4" />
      <text x={X - 48} y={128} className="devlbl" fill="#1e3a6e">培训三线1163开关间隔分图</text>
      <line x1={X} y1={100} x2={X} y2={152} stroke={d2 ? DEAD : LIVE} strokeWidth={2.6} />
      <DevG id="DS11632" x={X} y={172} w={44} h={46} sym={dsSym(d2, segA)} no="11632" name="培训三线2M侧刀闸" />
      <line x1={X} y1={195} x2={X} y2={216} stroke={segA} strokeWidth={2.6} />
      <DevG id="CB1163" x={X} y={238} w={44} h={44} sym={<rect className="cbbox" x={-11} y={-11} width={22} height={22} fill={cbOpen ? 'none' : segB} stroke={segB} strokeWidth={2.6} />} no="1163" name="培训三线开关" />
      <line x1={X} y1={260} x2={X} y2={280} stroke={segB} strokeWidth={2.6} />
      <DevG id="DS11634" x={X} y={302} w={44} h={46} sym={dsSym(d4, segC)} no="11634" name="培训三线线路侧刀闸" />
      <line x1={X} y1={325} x2={X} y2={352} stroke={segC} strokeWidth={2.6} /><path d={`M ${X - 7} 352 L ${X + 7} 352 L ${X} 364 Z`} fill={segC} />
      <line x1={X} y1={336} x2={X - 12} y2={336} stroke={segC} strokeWidth={2} />
      <g className={cls('ES116340')} data-dev="ES116340" transform={`translate(${X - 12},336)`} onClick={e => { e.stopPropagation(); touch(); devClick('ES116340') }} style={{ cursor: 'pointer' }}>
        <rect className="hit" x={-52} y={-20} width={60} height={52} rx={4} /><g transform="rotate(180)">{esSym}</g>
        <text className="devlbl" x={-30} y={22} textAnchor="middle">116340</text><text className="devnm" x={-30} y={34} textAnchor="middle">线路侧地刀</text>
        {sim && done && done.includes('ES116340') && <Check x={4} y={-16} />}
      </g>
      {scada ? <g>
        <g className={cls('hmi_mode')} data-dev="hmi_mode" transform="translate(560,44)" onClick={e => { e.stopPropagation(); touch(); devClick('hmi_mode') }} style={{ cursor: 'pointer' }}>
          <rect className="hit" x={-10} y={-30} width={196} height={76} rx={5} /><text y={-14} className="devlbl">光字牌 · 运行方式</text>
          {([['110kV 1M·2M 并列运行', true], ['培训三线1163 ' + (cbOpen ? '开关分闸' : '开关合闸'), cbOpen], ['无未复归告警', false]] as [string, boolean][]).map(([t, on], i) => <g key={i}>
            <rect y={-4 + i * 17} width={176} height={14} rx={2} fill={on ? '#fcf1ef' : '#eef2f7'} stroke={on ? '#eec9c3' : '#d8dfe9'} /><circle cx={8} cy={3 + i * 17} r={3} fill={on ? LIVE : '#b9c3d2'} /><text x={16} y={7 + i * 17} fontFamily="monospace" fontSize={10} fill={on ? '#b03a2e' : '#5c6b7f'}>{t}</text></g>)}
        </g>
        <g className={cls('hmi_current')} data-dev="hmi_current" transform="translate(560,150)" onClick={e => { e.stopPropagation(); touch(); devClick('hmi_current') }} style={{ cursor: 'pointer' }}>
          <rect className="hit" x={-10} y={-30} width={196} height={98} rx={5} /><text y={-14} className="devlbl">遥测 · 1163开关 三相电流 (A)</text>
          {cur.map((c, i) => <text key={i} y={8 + i * 24} fontFamily="monospace" fontSize={17} fill={cbOpen ? '#8a94a6' : '#1d7a4f'}>{['Ia', 'Ib', 'Ic'][i]} {c}</text>)}
          <text x={100} y={8} fontFamily="monospace" fontSize={11} fill="#8a94a6">P {cbOpen ? '0.0' : '58.6'} MW</text><text x={100} y={32} fontFamily="monospace" fontSize={11} fill="#8a94a6">Q {cbOpen ? '0.0' : '11.2'} Mvar</text>
        </g>
        <g className={cls('hmi_volt')} data-dev="hmi_volt" transform="translate(560,262)" onClick={e => { e.stopPropagation(); touch(); devClick('hmi_volt') }} style={{ cursor: 'pointer' }}>
          <rect className="hit" x={-10} y={-26} width={196} height={54} rx={5} /><text y={-10} className="devlbl">遥测 · 培训三线 线路二次电压 (V)</text>
          <text y={14} fontFamily="monospace" fontSize={16} fill={d4 ? '#8a94a6' : '#1d7a4f'}>Uab {d4 ? '0.0' : '99.6'}</text><text x={112} y={14} fontFamily="monospace" fontSize={16} fill={d4 ? '#8a94a6' : '#1d7a4f'}>Uo {d4 ? '0.0' : '0.1'}</text>
        </g>
        <g transform="translate(560,330)"><text className="devlbl" fill="#8a94a6">图例</text>
          <line x1={0} y1={16} x2={18} y2={16} stroke={LIVE} strokeWidth={3} /><text x={24} y={20} className="devlbl">带电</text><line x1={66} y1={16} x2={84} y2={16} stroke={DEAD} strokeWidth={3} /><text x={90} y={20} className="devlbl">停电</text><line x1={132} y1={16} x2={150} y2={16} stroke={GND} strokeWidth={3} /><text x={156} y={20} className="devlbl">接地</text></g>
      </g> : <g>
        <g transform="translate(560,44)"><rect x={-10} y={-30} width={196} height={150} rx={5} fill="#f6f8fb" stroke="#d8dfe9" /><text y={-14} className="devlbl">五防主机 · 模拟操作票</text>
          {WUFANG.map((w, i) => { const dn = done && done.includes(w[0]); const curi = done && done.length === i; return <g key={w[0]}><circle cx={6} cy={4 + i * 24} r={6} fill={dn ? '#1d7a4f' : curi ? '#a8823a' : '#d8dfe9'} /><text x={6} y={7.5 + i * 24} textAnchor="middle" fontSize={9} fill="#fff" fontFamily="monospace">{dn ? '√' : i + 1}</text><text x={18} y={8 + i * 24} fontSize={10.5} fill={dn ? '#1d7a4f' : curi ? '#14213d' : '#8a94a6'}>{w[1]}</text></g> })}
          <text y={112} fontSize={10} fill="#8a94a6" fontFamily="monospace">电脑钥匙 · 在线 · 未传票</text></g>
        <g transform="translate(560,210)"><rect x={-10} y={-14} width={196} height={56} rx={5} fill="#fbf7e6" stroke="#e3d49e" />
          <text y={2} fontSize={10.5} fill="#a8823a">模拟预演：在接线图上按操作票顺序</text><text y={18} fontSize={10.5} fill="#a8823a">点击设备，五防主机逐项记录；</text><text y={34} fontSize={10.5} fill="#a8823a">顺序错误会被防误逻辑闭锁。</text></g>
      </g>}
    </svg>)
}

/* ---------- 面板外壳 ---------- */
export const Pnl = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="pnl"><h4>{title}{right && <span className="r">{right}</span>}</h4>{children}</div>)

/* ---------- 调度电话 ---------- */
export function PanelPhone() {
  const st = STEP(); const run = S.stage === 'run' && st && !S.ended
  const isRep = !!(run && st!.act === 'report'); const ring = S.ph.ring, conn = S.ph.conn
  const stateTxt = ring ? `来电 · ${DISPATCH}` : conn ? `通话中 · ${DISPATCH} ${DISPATCHER}` : '通话空闲'
  const btn = ring ? <button className="btn btn-primary phbtn" data-ph="answer" onClick={() => { touch(); answerPhone() }}>监护人接听</button>
    : (isRep && !conn && S.beat >= 3) ? <button className="btn btn-primary phbtn" data-ph="dial" onClick={() => { touch(); dialPhone() }}>请监护人向调度汇报</button>
      : <button className="btn phbtn" disabled>{conn ? '通话中' : '听筒空闲'}</button>
  const talk = S.chat.filter(c => c.who === 'd' || (c.who === 'o' && /仿真站|复诵|汇报|已由|已断开|已转/.test(c.text))).slice(-4)
  const log = S.ph.log
  return (<>
    <Pnl title="调度电话 · 受令席" right={`${STATION} · 与${DISPATCH}的联系由监护人负责`}>
      <div className="ph2">
        <div className={`handset ${ring ? 'ringing' : ''} ${conn ? 'conn' : ''}`}>
          <div className="ring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={conn ? '#fff' : '#1e3a6e'} strokeWidth="1.8"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z" /></svg></div>
          <div className="nm">{ring ? `${DISPATCH} 来电` : conn ? `${DISPATCH} · ${DISPATCHER}` : DISPATCH}</div>
          <div className="de">{stateTxt}</div>
          <div className="phact">{btn}</div>
          <div className="phrule">接令规范：先互报单位和姓名。调度报「{DISPATCH} {DISPATCHER}」，本站报「{STATION} 黄志远」。设备编号按位报读：1163 读「一一六三」。</div>
        </div>
        <div className="reclog">
          <div className="row"><div className="k">发令单位</div><div className="v"><select id="o_unit" value={S.ord.unit} disabled={ring} onChange={e => setOrd('unit', e.target.value)}><option value="">听令时记录</option>{[DISPATCH, '广西中调', '本站值班负责人'].map(x => <option key={x}>{x}</option>)}</select></div></div>
          <div className="row"><div className="k">发令人</div><div className="v"><input id="o_from" value={S.ord.from} placeholder="调度员姓名" disabled={ring} onChange={e => setOrd('from', e.target.value)} /></div></div>
          <div className="row"><div className="k">受令人</div><div className="v">{S.ord.to}</div></div>
          <div className="row"><div className="k">受令时间</div><div className="v">{S.ord.time || '—'}</div></div>
          <div className="row"><div className="k">发令时间</div><div className="v">{S.ord.issued || '—'}</div></div>
          <div className="row"><div className="k">操作任务</div><div className="v">{TASK_TEXT}</div></div>
          <div className="row"><div className="k">当前下令</div><div className="v" style={{ color: '#a8823a' }}>{S.ord.cur || '—'}</div></div>
        </div>
        <div className="phr">
          {S.ph.cmp === 'wait' && st ? (
            <div className="cmpcard" data-ph="cmp"><div className="cmph">票令核对 · 第 {st.no} 项</div>
              <div className="cmprow"><span>操作票任务</span><b>{st.recite || TASK_TEXT}</b></div>
              <div className="cmprow"><span>调度下令</span><b style={{ color: '#a8823a' }}>{S.ord.cur || '—'}</b></div>
              <div className="cmpbt"><button className="btn btn-primary" onClick={() => { touch(); cmpResult(true) }}>票令一致，接令</button><button className="btn dan" onClick={() => { touch(); cmpResult(false) }}>不一致，中止汇报</button></div></div>
          ) : (
            <div className="phtalk"><div className="pht">通话记录 · 与{DISPATCH}</div>{talk.length ? talk.map(c => <div key={c.id} className={`ptl ${c.who}`}><i>{c.who === 'd' ? '调' : '站'}</i><span>{c.text}</span></div>) : <div className="ptl"><span style={{ color: '#8a94a6' }}>—</span></div>}</div>
          )}
        </div>
      </div>
    </Pnl>
    <Pnl title="调度操作指令记录簿" right={`${log.length} 条 · 每次接令、汇报都记在这里`}>
      <table className="logtb"><thead><tr><th>序号</th><th>受令时间</th><th>发令单位 · 发令人</th><th>指令内容</th><th>发令时间</th><th>汇报时间</th></tr></thead>
        <tbody>{log.length ? log.map((r, i) => <tr key={i} className={i === log.length - 1 ? 'cur' : ''}><td>{i + 1}</td><td>{r.recv || '—'}</td><td>{r.unit || '—'} · {r.from || '—'}</td><td>{r.order}</td><td>{r.issued || '—'}</td><td>{r.reported || '—'}</td></tr>) : <tr><td colSpan={6} style={{ color: '#8a94a6', textAlign: 'center' }}>尚无记录 · 接到第一次调度令后自动登记</td></tr>}</tbody></table>
    </Pnl>
  </>)
}

/* ---------- 五防电脑 ---------- */
export function PanelWufang() {
  if (S.stage === 'run') return <PanelWfKey />
  const done = WUFANG.slice(0, S.wf).map(x => x[0]); const target = S.wf < 4 ? WUFANG[S.wf][0] : null
  return (
    <Pnl title="五防主机 · 模拟预演" right={`已模拟 ${S.wf}/4 · 电脑钥匙在线`}>
      <div className="wfhead">操作任务已输入：<b>{TASK_TEXT.replace('110kV仿真站', '')}</b><span className="r">{S.wf >= 4 ? <b style={{ color: '#1d7a4f' }}>模拟顺序正确 · 操作票已生成</b> : `第 ${S.wf + 1} 步：在模拟接线图上点击「${devName(target!)}」`}</span></div>
      <div className="sld"><Sld dev={S.wfdev || S.dev} sim target={target} done={done} scada={false} chg={S.lastChg} /></div>
      {S.wf >= 4 && <div className="wfok">模拟顺序正确：先断开1163开关，再依次拉开11634、11632刀闸；后合上116340地刀。前几项操作均在后台执行，暂不下传电脑钥匙。</div>}
    </Pnl>)
}
function PanelWfKey() {
  const down = S.key.down
  return (
    <Pnl title="五防主机 · 电脑钥匙" right={down ? '已下传 · 钥匙在监护人手上' : '模拟已通过 · 未下传'}>
      <div className="scene"><svg viewBox="0 0 760 250">
        <Face w={760} h={250} title="五防主机 · 微机防误装置" sub="PPS-2000" />
        <g transform="translate(40,58)"><rect width={330} height={164} rx={5} fill="#22314a" stroke="#1a2740" /><text x={16} y={24} fontSize={11} fill="#8fd0e0" fontFamily="monospace">模拟操作票 · 已通过</text>
          {WUFANG.map((x, i) => <text key={x[0]} x={16} y={46 + i * 22} fontSize={10.5} fill="#7ec3d6" fontFamily="monospace">√ {i + 1}. {x[1]}</text>)}
          <text x={16} y={146} fontSize={10.5} fill={down ? '#8fd0e0' : '#e2b23a'} fontFamily="monospace">{down ? '● 已下传至电脑钥匙，钥匙按此顺序解锁' : '○ 尚未下传，汇控柜与机构箱无法解锁'}</text></g>
        <Dev id="WFKEY" x={500} y={120} hit={[-90, -66, 250, 132]}>
          <rect x={-70} y={-40} width={120} height={80} rx={6} fill="#e2e7ef" stroke="#b9c3d2" strokeWidth={1.6} /><text x={-10} y={-22} textAnchor="middle" className="svn">电脑钥匙</text>
          <rect x={-52} y={-12} width={84} height={30} rx={4} fill={down ? '#0f1a2c' : '#eef1f6'} stroke="#b9c3d2" /><text x={-10} y={8} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={down ? '#8fd0e0' : '#8a94a6'}>{down ? '票已下传' : '空 票'}</text>
          <Lamp x={-10} y={30} on={down} color={DEAD} r={5} /><path d="M 58 0 h 26" stroke="#8b98a8" strokeWidth={2} strokeDasharray={down ? '0' : '4 3'} />
          <rect x={86} y={-16} width={20} height={32} rx={3} fill="#c8d0dc" stroke="#7a8490" /><rect x={100} y={-6} width={18} height={12} rx={2} fill="#c8d0dc" stroke="#7a8490" /><text x={100} y={34} textAnchor="middle" className="svd">钥匙口</text>
          <text x={-10} y={58} textAnchor="middle" className={`svs ${down ? 'b' : 'a'}`}>{down ? '已下传 · 监护人保管' : '待下传'}</text>
        </Dev>
      </svg></div>
      <div className="baytip">汇控柜与机构箱的锁具由电脑钥匙解锁。钥匙里只有下传过的这份票，按模拟顺序逐把开锁，顺序不对开不了，这是防误的最后一道关口。</div>
    </Pnl>)
}

/* ---------- 监控后台 ---------- */
export function PanelHmi() {
  return (<>
    <Pnl title="监控后台 · 一次接线图" right="点击设备：遥控操作 / 查看详情"><div className="sld"><Sld scada chg={S.lastChg} /></div></Pnl>
    <Pnl title="操作报文与告警" right="SOE"><div className="msgs">{S.msgs.map((x, i) => <div key={i} className={`${i === 0 ? 'new ' : ''}${x.k}`}><span className="ts">{x.t}</span>{x.x}</div>)}</div></Pnl>
  </>)
}

/* ---------- 间隔现场 ---------- */
export function PanelBay() {
  const st = STEP(); const d = S.dev
  const gisId = st && st.act === 'gis' ? st.target! : 'DS11634'
  const open = gisId === 'ES116340' ? d.ES116340 === 'close' : d[gisId] === 'open'
  const anomaly = S.abn.fired && !S.abn.handled && gisId === 'DS11634'; const es = gisId === 'ES116340'
  const picked = !!S.bay, right = S.bay === '1163'
  const bays = ['1161', '1162', '1163'].map((n, i) => {
    const x = 28 + i * 246, cur = S.bay === n, live = n !== '1163' || d.CB1163 !== 'open'
    return (<g key={n} className={`bayg ${cur ? 'cur' : ''}`} style={{ cursor: 'pointer' }} transform={`translate(${x},4)`} onClick={() => { touch(); pickBay(n) }}>
      <rect x={0} y={0} width={222} height={150} rx={8} fill={cur ? 'rgba(30,58,110,.07)' : 'transparent'} stroke={cur ? '#1e3a6e' : '#d8dfe9'} strokeDasharray={cur ? '0' : '4 4'} />
      <rect y={26} width={222} height={22} rx={11} fill="#dfe5ee" stroke="#c8d0dc" /><rect y={26} width={222} height={8} rx={4} fill="#c8d0dc" opacity={.7} />
      <rect x={86} y={48} width={46} height={66} rx={9} fill="#e2e7ef" stroke="#c8d0dc" /><rect x={96} y={56} width={26} height={12} rx={3} fill="#eef1f6" /><circle cx={109} cy={16} r={9} fill="#f2f5f9" stroke="#c8d0dc" />
      <rect x={150} y={60} width={46} height={54} rx={4} fill="#e6eaf1" stroke="#c8d0dc" /><text x={173} y={76} textAnchor="middle" fontSize={8.5} fill="#5c6b7f" fontFamily="monospace">汇控柜</text>
      <Lamp x={163} y={94} on={live} color={live ? LIVE : DEAD} r={4} /><Lamp x={183} y={94} on={!live} color={DEAD} r={4} />
      <text x={109} y={12} textAnchor="middle" fontSize={9.5} fill={cur ? (n === '1163' ? '#1d7a4f' : '#b03a2e') : '#8a94a6'}>{cur ? (n === '1163' ? '当前站位' : '当前站位 · 走错间隔') : '点此走到该间隔'}</text>
      <Plate x={31} y={116} w={160} t1={`110kV培训${n === '1161' ? '一' : n === '1162' ? '二' : '三'}线 ${n}`} t2={`110kV ${n === '1161' ? '1M' : '2M'} 侧 · ${live ? '运行中' : '停电'}`} />
    </g>)
  })
  const Y = 172
  if (!right) return (
    <Pnl title="110kV GIS 间隔现场" right={picked ? `当前站位：培训${S.bay === '1161' ? '一' : '二'}线${S.bay}间隔 · 走错间隔` : '三个间隔外观一样 · 先看间隔名称牌，自己选要进的间隔'}>
      <div className="scene"><svg viewBox="0 0 760 172">{bays}</svg></div>
      <div className={`baytip ${picked ? 'bad' : ''}`}>{picked ? `这里是培训${S.bay === '1161' ? '一' : '二'}线${S.bay}间隔，仍在运行中。本项的操作对象在培训三线1163间隔，请重新核对间隔名称牌。` : '到达每一个操作地点，先核对间隔名称，再核对设备双重名称。选错间隔会被记为走错间隔。'}</div>
    </Pnl>)
  return (
    <Pnl title="110kV GIS 间隔现场 · 培训三线1163间隔" right="当前站位正确 · 先核对间隔名称与设备双重名称，再找操作对象">
      <div className="scene"><svg viewBox="0 0 760 412">{bays}
        <line x1={20} y1={Y - 6} x2={740} y2={Y - 6} stroke="#d8dfe9" strokeDasharray="4 4" /><text x={20} y={Y + 10} fontSize={10} fill="#5c6b7f" letterSpacing={1}>1163 间隔 · 现场核对</text>
        <Dev id="bay_plate" x={20} y={Y + 22} hit={[-4, -6, 178, 46]}><Plate x={0} y={0} w={170} t1="110kV培训三线1163" t2="间隔名称牌 · 双重名称" /></Dev>
        <Dev id="bay_label" x={20} y={Y + 78} hit={[-4, -6, 178, 40]}>
          {['11632', '1163', '11634', '116340'].map((t, i) => <g key={t}><rect x={i * 43} width={40} height={24} rx={2} fill="#fff" stroke="#7a8490" /><text x={i * 43 + 20} y={16} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#14213d">{t}</text></g>)}
          <text x={85} y={38} textAnchor="middle" className="svd">设备标签 · 标实一致</text>{S.gis.label && <Check x={170} y={-2} />}</Dev>
        <Dev id="bay_draw" x={20} y={Y + 130} hit={[-4, -6, 178, 104]}>
          <rect width={170} height={82} rx={4} fill="#f6f8fb" stroke="#7a8490" /><text x={85} y={14} textAnchor="middle" fontSize={9} fill="#5c6b7f">汇控柜模拟接线图</text><line x1={85} y1={20} x2={85} y2={74} stroke="#5c6b7f" strokeWidth={2} />
          {([['DS11632', 30], ['CB1163', 46], ['DS11634', 62]] as [string, number][]).map(([k, y]) => <g key={k}><circle cx={85} cy={y} r={5} fill={d[k] === 'open' ? DEAD : LIVE} /><text x={96} y={y + 3} fontSize={8} fontFamily="monospace" fill="#5c6b7f">{k.slice(2)}</text></g>)}
          <circle cx={60} cy={68} r={5} fill={d.ES116340 === 'close' ? GND : DEAD} /><text x={18} y={71} fontSize={8} fontFamily="monospace" fill="#5c6b7f">116340</text>
          <text x={85} y={96} textAnchor="middle" className="svd">接线图 ↔ 现场实物 · 图实一致</text>{S.gis.draw && <Check x={170} y={-2} />}</Dev>
        <Dev id="bay_hvdisp" x={228} y={Y + 22} hit={[-6, -6, 150, 96]}>
          <rect width={138} height={84} rx={5} fill="#eef1f6" stroke="#b9c3d2" /><text x={69} y={15} textAnchor="middle" fontSize={9.5} fill="#14213d">高压带电显示装置</text>
          {['A', 'B', 'C'].map((p, i) => <Lamp key={p} x={28 + i * 41} y={44} on={d.DS11634 !== 'open'} color={LIVE} lbl={p + ' 相'} r={9} />)}
          <text x={69} y={78} textAnchor="middle" className={`svs ${d.DS11634 !== 'open' ? 'a' : 'b'}`}>{d.DS11634 !== 'open' ? '确有电压' : '无电压'}</text></Dev>
        <g transform={`translate(228,${Y + 118})`}><rect width={138} height={114} rx={5} fill="#eef1f6" stroke="#b9c3d2" /><text x={69} y={15} textAnchor="middle" fontSize={9.5} fill="#14213d">汇控柜 · 电气位置指示</text>
          {([['DS11632', '11632'], ['CB1163', '1163'], ['DS11634', '11634'], ['ES116340', '116340']] as [string, string][]).map(([k, n], i) => { const on = k === 'ES116340' ? d[k] === 'close' : d[k] !== 'open'; return <g key={k}><text x={12} y={38 + i * 20} fontSize={9} fontFamily="monospace" fill="#5c6b7f">{n}</text><Lamp x={88} y={34 + i * 20} on={on} color={k === 'ES116340' ? GND : LIVE} r={5} /><Lamp x={112} y={34 + i * 20} on={!on} color={DEAD} r={5} /></g> })}
          <text x={88} y={108} textAnchor="middle" className="svl">合</text><text x={112} y={108} textAnchor="middle" className="svl">分</text>
          <Dev id="gis_hui" x={100} y={gisId === 'DS11632' ? 34 : gisId === 'DS11634' ? 74 : gisId === 'ES116340' ? 94 : 54} hit={[-30, -12, 60, 24]}>{S.gis.hui && <Check x={30} y={-10} />}</Dev></g>
        <text x={470} y={Y + 12} fontSize={10.5} fill="#14213d" fontWeight={700}>{devName(gisId)} · 机构与位置指示</text>
        <Win id="gis_mech" x={520} y={Y + 74} txt={anomaly ? '合' : (es ? '合' : '分')} color={anomaly ? LIVE : (es ? GND : DEAD)} lbl="机构箱机械指示" />
        <Arm id="gis_arm" x={640} y={Y + 74} open={es ? false : open} lbl="刀闸拐臂指示" />
        <Shaft id="gis_line" x={560} y={Y + 176} open={es ? false : open} lbl="转轴划线标识" />
        <text x={660} y={Y + 152} textAnchor="middle" fontSize={9.5} fill="#8a94a6">按设备结构逐项核对</text><text x={660} y={Y + 166} textAnchor="middle" fontSize={9.5} fill="#8a94a6">四项一致后回报</text>
        {anomaly && <g transform={`translate(470,${Y + 196})`}><rect width={276} height={34} rx={4} fill="#fcf1ef" stroke="#eec9c3" /><text x={138} y={14} textAnchor="middle" fontSize={9.5} fill="#b03a2e">现场机构箱机械指示与监控后台位置显示不一致</text><text x={138} y={27} textAnchor="middle" fontSize={9} fill="#b03a2e">细则第十四条：凡变化必上报，立即中止操作并上报</text></g>}
      </svg></div>
      {S.peek && <div className={`peek ${S.peek.anomaly ? 'bad' : 'ok'}`}><b>{S.peek.nm}</b><span>{S.peek.anomaly ? <>指示为「合上」，与后台「拉开」<em>不一致</em></> : `${S.peek.want} · 与后台一致`}</span>{S.peek.anomaly && <button className="btn dan btn-sm" onClick={peekStop}>中止操作并上报</button>}</div>}
    </Pnl>)
}

/* ---------- 8P 测控屏 ---------- */
export function PanelP8() {
  const d = S.dev; const cb = d.CB1163 !== 'open', loc = d.K1QK === '就地'
  return (
    <Pnl title="8P 110kV培训三线1163线路测控屏" right="屏柜名称已核对 · 把手会转、按钮会亮、标志牌挂在按钮上">
      <div className="scene"><svg viewBox="0 0 760 330">
        <Face w={760} h={330} title="8P 110kV培训三线1163线路测控屏" sub="CSI-200E" />
        <g transform="translate(40,60)"><rect width={270} height={132} rx={5} fill="#22314a" stroke="#1a2740" /><rect x={14} y={12} width={242} height={72} rx={3} fill="#0f1a2c" />
          <text x={24} y={32} fontSize={11} fill="#8fd0e0" fontFamily="monospace">培训三线1163  测控装置</text><text x={24} y={50} fontSize={11} fill="#8fd0e0" fontFamily="monospace">开关 {cb ? '合闸' : '分闸'}   1QK {d.K1QK}</text>
          <text x={24} y={68} fontSize={11} fill="#8fd0e0" fontFamily="monospace">Ia {cb ? '312' : '0.0'}  Ib {cb ? '308' : '0.0'}  Ic {cb ? '315' : '0.0'} A</text>
          <Lamp x={40} y={108} on color={DEAD} lbl="运行" r={6} /><Lamp x={90} y={108} on={cb} color={LIVE} lbl="合位" r={6} /><Lamp x={140} y={108} on={!cb} color={DEAD} lbl="分位" r={6} /><Lamp x={190} y={108} on={!loc} color={GND} lbl="远方" r={6} /><Lamp x={240} y={108} on={loc} color={GND} lbl="就地" r={6} /></g>
        <Knob id="K1QK" x={420} y={130} opts={['远控', '就地']} val={d.K1QK} name="1QK" desc="培训三线1163开关控制选择把手" />
        <PushBtn id="p8_open" x={560} y={130} color={DEAD} lbl="分闸按钮" pressed={false} />
        <Hook id="TCLOSE" x={662} y={66} hung={!!S.tags.TCLOSE} lbl="合闸按钮挂牌位" />
        <PushBtn id="p8_close" x={662} y={150} color={LIVE} lbl="1163 合闸按钮" pressed={false} />
        <text x={40} y={228} fontSize={10} fill="#5c6b7f">屏柜操作规则：远方 / 就地切换后，方可在屏上就地操作；检修状态下在合闸按钮悬挂"禁止合闸，线路有人工作！"标志牌。</text>
        <Plate x={40} y={262} w={160} t1="8P 测控屏" t2="110kV培训三线1163线路" />
      </svg></div>
    </Pnl>)
}

/* ---------- 20P 保护屏 ---------- */
export function PanelP20() {
  const d = S.dev
  return (
    <Pnl title="20P 110kV培训三线1163线路保护屏" right="RCS-943 · 空气开关在屏内右侧">
      <div className="scene"><svg viewBox="0 0 760 330">
        <Face w={760} h={330} title="20P 110kV培训三线1163线路保护屏" sub="RCS-943A" />
        <g transform="translate(40,60)"><rect width={330} height={150} rx={5} fill="#22314a" stroke="#1a2740" /><rect x={14} y={12} width={200} height={90} rx={3} fill="#0f1a2c" />
          <text x={24} y={32} fontSize={11} fill="#8fd0e0" fontFamily="monospace">RCS-943A 线路保护</text><text x={24} y={50} fontSize={11} fill="#8fd0e0" fontFamily="monospace">培训三线1163  {d.M1K1 === 'off' ? '装置失电' : '运行正常'}</text>
          <text x={24} y={68} fontSize={11} fill="#8fd0e0" fontFamily="monospace">控制回路 {d.M1K2 === 'off' ? '断线' : '正常'}</text><text x={24} y={86} fontSize={11} fill="#8fd0e0" fontFamily="monospace">PT 电压 {d.M1ZKK === 'off' ? '失压' : '正常'}</text>
          {([['运行', d.M1K1 !== 'off', DEAD], ['报警', d.M1K2 === 'off' || d.M1ZKK === 'off', GND], ['跳A', false, LIVE], ['跳B', false, LIVE], ['跳C', false, LIVE], ['重合闸', false, LIVE]] as [string, boolean, string][]).map((l, i) => <Lamp key={l[0]} x={240 + (i % 2) * 44} y={28 + Math.floor(i / 2) * 32} on={l[1]} color={l[2]} lbl={l[0]} r={6} />)}
          {['差动', '距离', '零序', '重合闸', '远跳'].map((t, i) => <g key={t}><rect x={16 + i * 40} y={114} width={30} height={22} rx={2} fill="#eef1f6" stroke="#b9c3d2" /><rect x={25 + i * 40} y={118} width={12} height={14} rx={1} fill={GND} /><text x={31 + i * 40} y={147} textAnchor="middle" fontSize={8} fill="#c8d0dc">{t}</text></g>)}</g>
        <text x={470} y={62} fontSize={10.5} fill="#14213d" fontWeight={700}>屏内空气开关</text>
        <Mcb id="M1K1" x={500} y={140} name="1K1" desc="保护装置电源" off={d.M1K1 === 'off'} /><Mcb id="M1K2" x={600} y={140} name="1K2" desc="控制电源" off={d.M1K2 === 'off'} /><Mcb id="M1ZKK" x={700} y={140} name="1ZKK" desc="保护电压" off={d.M1ZKK === 'off'} />
        <text x={40} y={236} fontSize={10} fill="#5c6b7f">仅涉及一次设备检修的停电操作：断开该一次设备的控制电源，保护装置电源与保护电压保持投入。</text>
        <Plate x={40} y={262} w={160} t1="20P 保护屏" t2="110kV培训三线1163线路" />
      </svg></div>
    </Pnl>)
}

/* ---------- 就地控制柜 ---------- */
export function PanelCab() {
  const d = S.dev; const esC = d.ES116340 === 'close', loc = d.KZK === '就地'
  return (
    <Pnl title="110kV培训三线1163间隔就地控制柜" right="设备双重名称已核对 · 柜内元件按实物布置">
      <div className="scene"><svg viewBox="0 0 760 430">
        <Face w={760} h={430} title="110kV培训三线1163间隔就地控制柜（LCP）" sub="柜门已打开" />
        <text x={40} y={60} fontSize={10.5} fill="#14213d" fontWeight={700}>设备位置指示</text>
        {([['DS11632', '11632', LIVE], ['CB1163', '1163', LIVE], ['DS11634', '11634', LIVE], ['ES116340', '116340', GND]] as [string, string, string][]).map(([k, n, c], i) => { const on = k === 'ES116340' ? d[k] === 'close' : d[k] !== 'open'; return <g key={k} transform={`translate(${64 + i * 84},92)`}>
          {k === 'ES116340' && <Dev id="gis_hui" hit={[-34, -22, 68, 60]}>{S.gis.hui && <Check x={30} y={-18} />}</Dev>}
          <Lamp x={-12} y={0} on={on} color={c} lbl="合" r={7} /><Lamp x={12} y={0} on={!on} color={DEAD} lbl="分" r={7} /><text y={-16} textAnchor="middle" className="svn">{n}</text></g> })}
        <Dev id="cab_hvdisp" x={560} y={50} hit={[-6, -6, 176, 96]}>
          <rect width={164} height={84} rx={5} fill="#eef1f6" stroke="#b9c3d2" /><text x={82} y={15} textAnchor="middle" fontSize={9.5} fill="#14213d">高压带电显示装置 · 间接验电</text>
          {['A', 'B', 'C'].map((p, i) => <Dev key={p} id={`cab_hvdisp_${p}`} x={34 + i * 48} y={44} hit={[-18, -14, 36, 40]}><Lamp x={0} y={0} on={d.DS11634 !== 'open'} color={LIVE} lbl={p + ' 相'} r={9} />{S.gis['hv' + p] && <Check x={14} y={-12} />}</Dev>)}
          <text x={82} y={78} textAnchor="middle" className={`svs ${d.DS11634 !== 'open' ? 'a' : 'b'}`}>{d.DS11634 !== 'open' ? '确有电压' : '确无电压'}</text></Dev>
        <Knob id="KZK" x={90} y={226} opts={['远控', '就地']} val={d.KZK} name="ZK" desc="远控／就地切换把手" />
        <g transform="translate(180,152)"><rect width={230} height={150} rx={5} fill="#eef1f6" stroke="#b9c3d2" /><text x={115} y={16} textAnchor="middle" fontSize={9.5} fill="#14213d">116340 培训三线线路侧接地刀闸 · 就地电动操作</text>
          <text x={115} y={30} textAnchor="middle" className={`svs ${esC ? 'g' : 'b'}`}>{esC ? '合上位置' : '拉开位置'}</text>
          <PushBtn id="ES116340" x={60} y={76} color={GND} lbl="合闸" pressed={esC} /><PushBtn id="ES116340_open" x={150} y={76} color={DEAD} lbl="分闸" pressed={!esC} />
          <Lamp x={210} y={52} on={loc} color={GND} lbl="就地允许" r={5} />
          <g transform="translate(115,124)"><text y={-4} textAnchor="middle" className="svl">地刀运动方向</text><line x1={-46} y1={6} x2={38} y2={6} stroke="#c8d0dc" strokeWidth={6} strokeLinecap="round" /><path d="M -46 6 h 84" stroke={esC ? GND : '#e2e7ef'} strokeWidth={6} strokeLinecap="round" /><polygon points="38,0 48,6 38,12" fill={esC ? GND : '#c8d0dc'} />
            <text x={-52} y={10} textAnchor="end" className="svl">分</text><text x={52} y={10} className="svl">合</text>
            {S.moving === 'ES116340' && <circle cx={-46} cy={6} r={4.5} fill={GND}><animate attributeName="cx" values="-46;38" dur="1.4s" repeatCount="indefinite" /></circle>}</g></g>
        <Hook id="T11634" x={520} y={168} hung={!!S.tags.T11634} lbl="操作把手挂牌位" />
        <Dev id="cab_handle" x={520} y={250} hit={[-60, -30, 120, 70]}><rect x={-50} y={-14} width={100} height={28} rx={4} fill="#e2e7ef" stroke="#b9c3d2" /><rect x={-40} y={-8} width={14} height={16} rx={2} fill="#5c6b7f" /><rect x={-20} y={-4} width={56} height={8} rx={4} fill="#7a8490" /><text y={32} textAnchor="middle" className="svn">11634 刀闸操作把手</text></Dev>
        <text x={40} y={318} fontSize={10.5} fill="#14213d" fontWeight={700}>柜内空气开关</text>
        <Hook id="T4DK" x={110} y={350} hung={!!S.tags.T4DK} lbl="4DK 挂牌位" />
        <Mcb id="M4DK" x={200} y={364} name="4DK" desc="线路抽取电压（去保护）" off={d.M4DK === 'off'} /><Mcb id="M1DK" x={300} y={364} name="1DK" desc="刀闸／地刀控制电源" off={d.M1DK === 'off'} /><Mcb id="M2DK" x={400} y={364} name="2DK" desc="刀闸／地刀电机电源" off={d.M2DK === 'off'} />
        <text x={470} y={318} fontSize={10.5} fill="#14213d" fontWeight={700}>116340 地刀机构 · 位置指示</text><text x={470} y={332} fontSize={9.5} fill="#8a94a6">合闸方向：拐臂由「分」向「合」转到限位块，转轴漆线随之对准「合」</text>
        <Win id="gis_mech" x={520} y={374} txt={esC ? '合' : '分'} color={esC ? GND : DEAD} lbl="机构箱机械指示" /><Arm id="gis_arm" x={616} y={374} open={!esC} lbl="拐臂指示" /><Shaft id="gis_line" x={704} y={374} open={!esC} lbl="转轴划线" />
      </svg></div>
      {S.peek && <div className={`peek ${S.peek.anomaly ? 'bad' : 'ok'}`}><b>{S.peek.nm}</b><span>{S.peek.want} · 与后台一致</span></div>}
    </Pnl>)
}

/* ---------- 拟票 ---------- */
export function PanelFill() {
  const pool = fillRight().concat(fillWrong()); const chosen = S.fill.rows; const rest = pool.filter(s => !chosen.includes(s.no))
  return (<>
    <Pnl title="倒闸操作作业全过程" right="当前环节：拟票">
      <div className="fflow">{FLOW.map((f, i) => <div key={f[0]} className={`ffs ${i === 1 ? 'cur' : i < 1 ? 'done' : ''}`}><i>{i + 1}</i><b>{f[0]}</b><span>{f[1]}</span></div>)}</div>
    </Pnl>
    <Pnl title={`${STATION} · 变电站倒闸操作票`} right={`编号 ${ticketNo()} · 拟票人 ${HOME_USER.name}`}>
      <div className="fhead">
        {FHEAD.map(f => <div key={f.k} className="fhr"><div className="k">{f.n}</div><div className="v"><select data-fh={f.k} value={S.fill.head[f.k] || ''} onChange={e => { touch(); fillHead(f.k, e.target.value) }}><option value="">请选择</option>{f.opt.map(o => <option key={o}>{o}</option>)}</select></div></div>)}
        <div className="fhr"><div className="k">操作开始时间</div><div className="v ro">执行第一项时填写</div></div>
        <div className="fhr"><div className="k">操作结束时间</div><div className="v ro">完成最后一项时填写</div></div>
      </div>
    </Pnl>
    <Pnl title="操作项目 · 第一段（本次调度令范围：运行 → 热备用）" right={`已写入 ${chosen.length} 项`}>
      <div className="fbody">
        <div className="fpool"><div className="fpt">备选项目　{rest.length} 项未写入</div>
          {rest.length ? rest.map(s => <div key={s.no} className="fpi" data-fadd={s.no} onClick={() => { touch(); fillAdd(s.no) }}><b>＋</b><span>{s.ticket}</span></div>) : <div className="fpe">备选项目已全部写入票面。多写的项目要移出去。</div>}</div>
        <div className="fsheet"><div className="fpt">操作票第一段　按执行顺序排列</div>
          {chosen.length ? chosen.map((no, i) => { const s = pool.find(x => x.no === no)!; return <div key={no} className="fsi"><div className="fsn">{i + 1}</div><div className="fst">{s.ticket}</div><div className="fsb"><button className="fbtn" onClick={() => fillMove(i, -1)} title="上移">↑</button><button className="fbtn" onClick={() => fillMove(i, 1)} title="下移">↓</button><button className="fbtn del" onClick={() => fillDel(i)} title="移出票面">×</button></div></div> }) : <div className="fpe">票面还是空的。从左边把本段应执行的项目按顺序写进来。</div>}</div>
      </div>
      <div className="ffoot"><div className="ffh">拟票要求：只写本次调度令范围内的项目；每一项一个动作；执行项与检查项分列；顺序按先断开关、后拉刀闸、先线路侧后母线侧的逻辑排列。</div><button className="btn btn-primary" id="f_go" onClick={() => { touch(); auditFill() }}>提交审核</button></div>
    </Pnl>
  </>)
}

/* ---------- 上岗前准备 ---------- */
export function PanelPrep() {
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const ok = prepOk()
  const Chk = ({ p, i, t }: { p: 'audit' | 'dress' | 'mind'; i: number; t: string }) => { const on = p === 'mind' ? S.prep.mind : S.prep[p][i]; return <div className={`chk ${on ? 'on' : ''}`} data-p={p} data-i={i} onClick={() => { touch(); prepToggle(p, i) }}><div className="bx">✓</div><div className="lb">{t}</div></div> }
  return (
    <div className="prep">
      <div className="prepgrid">
        <div className="pc"><h5>一、操作票三审与资格核对</h5><div className="sub2">接令前执行操作票三审程序</div><div className="chkrow">{AUDIT.map((t, i) => <Chk key={i} p="audit" i={i} t={t} />)}</div></div>
        <div className="pc"><h5>二、着装互检</h5><div className="sub2">监护人与操作人互相检查</div><div className="chkrow">{DRESS.map((t, i) => <Chk key={i} p="dress" i={i} t={t} />)}</div></div>
        <div className="pc"><h5>三、操作任务与人员状态确认</h5><div className="sub2">监护人问询，操作人应答</div>
          <div className="askbox">今天我们有一项操作任务：{TASK_TEXT}。你的精神状态是否良好？</div>
          <div style={{ marginTop: 10 }}><Chk p="mind" i={0} t="操作人应答：精神状态良好" /></div>
          <div className="tk3" style={{ marginTop: 10 }}>精神不集中、疲劳或身体不适会降低识别设备、复诵和执行操作票的准确性，容易引发误操作。</div></div>
      </div>
      <div className="risks"><h5>四、风险分析及管控措施（12 项）</h5>
        <div className="sub2">监护人逐条宣读，操作人逐条确认。点击条目展开管控措施与后果。已确认 <b style={{ color: '#1d7a4f' }}>{S.prep.risks.filter(Boolean).length}</b>/12</div>
        {RISKS.map((r, i) => <div key={i} className={`rk ${S.prep.risks[i] ? 'on' : ''} ${open[i] ? 'open' : ''}`} data-r={i}>
          <div className="rh" onClick={() => { touch(); if (!S.prep.risks[i]) { riskConfirm(i); setOpen(o => ({ ...o, [i]: true })) } else setOpen(o => ({ ...o, [i]: !o[i] })) }}><div className="n">{i + 1}</div><div className="t">{r[0]}</div><div className="s">{S.prep.risks[i] ? '已确认 ✓' : '待确认'}</div></div>
          <div className="rb"><b>管控措施：</b>{r[1]}<br /><b>原因及后果：</b>{r[2]}</div></div>)}
      </div>
      <div className="prepfoot"><button className="btn" onClick={() => { touch(); prepAll() }}>全部确认</button><div style={{ flex: 1 }} /><button className="btn btn-primary" id="p_go" disabled={!ok} onClick={() => { touch(); enterWufang() }}>准备完毕，进入五防模拟</button></div>
    </div>)
}

/* ---------- 面板路由 ---------- */
export function Panelwrap() {
  if (S.stage === 'fill') return <PanelFill />
  if (S.stage === 'prep') return <PanelPrep />
  const P: Record<Loc, React.ComponentType> = { phone: PanelPhone, wufang: PanelWufang, hmi: PanelHmi, bay: PanelBay, p8: PanelP8, p20: PanelP20, cab: PanelCab }
  const C = P[S.loc]; return <C />
}
export function panelTitle() { if (S.stage === 'fill') return '作业面板 · 填写操作票'; if (S.stage === 'prep') return '作业面板 · 上岗前准备'; return '作业面板 · ' + LOC[S.loc].name }

/* ---------- 示范人偶 ---------- */
export function FigSVG({ pose, x, y, s = 1 }: { pose: string; x: number; y: number; s?: number }) {
  const P = ({ stand: { arm: 8, fore: 12, lean: 0, head: 0 }, point: { arm: -62, fore: -78, lean: 2, head: -4 }, act: { arm: -48, fore: -20, lean: 6, head: -6 }, look: { arm: 4, fore: 26, lean: 10, head: -10 } } as Record<string, { arm: number; fore: number; lean: number; head: number }>)[pose] || { arm: 8, fore: 12, lean: 0, head: 0 }
  return (<g className="fig" transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cy={2} rx={20} ry={5} fill="#000" opacity={.07} />
    <g transform={`rotate(${P.lean}) translate(0,-2)`}>
      <path d="M -7 0 l -2 -34 h 6 l 1 34 z" fill="#33414f" /><path d="M 7 0 l 2 -34 h -6 l -1 34 z" fill="#3d4c5c" />
      <path d="M -12 -34 h 24 l 3 -34 q -15 -6 -30 0 z" fill="#2f6ea8" /><path d="M -12 -50 h 24" stroke="#c9dcee" strokeWidth={1.4} opacity={.6} /><rect x={-13} y={-56} width={26} height={5} rx={2} fill="#e8b22a" />
      <g transform={`translate(-10,-64) rotate(${P.arm})`}><rect x={-3.4} width={6.8} height={17} rx={3} fill="#2f6ea8" /><g transform={`translate(0,17) rotate(${P.fore})`}><rect x={-3} width={6} height={16} rx={3} fill="#e2c9a8" /><circle cy={18} r={3.6} fill="#e2c9a8" /></g></g>
      <g transform={`translate(10,-64) rotate(${-P.arm * .35 + 10})`}><rect x={-3.4} width={6.8} height={17} rx={3} fill="#2f6ea8" /><rect x={-3} y={16} width={6} height={15} rx={3} fill="#e2c9a8" /></g>
      <g transform={`translate(0,-70) rotate(${P.head})`}><circle cy={-6} r={9} fill="#e2c9a8" /><path d="M -12 -8 a 12 11 0 0 1 24 0 z" fill="#f0c419" /><path d="M -13 -8 h 26" stroke="#c99a12" strokeWidth={2.2} strokeLinecap="round" /><path d="M 0 -19 v 4" stroke="#c99a12" strokeWidth={2} /></g>
    </g></g>)
}
