import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { companyById } from '../data/companies';
import { PERSONAS } from '../data/personas';
import AiConclusion from '../components/AiConclusion';
import { factoringPlan, packageIncome, raroc, DEFAULT_RAROC, concentration, fmtWan, fmtYi, LPR_1Y, clamp } from '../lib/pricing';
import type { RarocInput } from '../lib/pricing';
import './group.css';

/* ========================= 集团关系图谱数据 ========================= */
type NodeKind = 'parent' | 'open' | 'new' | 'hidden' | 'risk' | 'person' | 'cluster';
interface GNode { id: string; name: string; x: number; y: number; kind: NodeKind; sub: string; info: string[] }
interface GEdge { from: string; to: string; kind: 'own' | 'hidden' | 'visible' | 'infer' | 'cluster'; label?: string; note?: string }

const NODES: GNode[] = [
  { id: 'chair', name: '陈晟', x: 480, y: 42, kind: 'person', sub: '董事长 · 实际控制人', info: ['直接持股母公司 32%，通过禾丰投资间接持股 9%', '配偶李蕴、胞弟陈晟豪为自然人股东', '关联穿透：禾丰投资 / 晟盛置业'] },
  { id: 'hf', name: '禾丰投资', x: 200, y: 60, kind: 'hidden', sub: '隐性关联 · 配偶持股 60%', info: ['未纳入集团合并报表', '与晟禾粮油存在关联采购 1,150 万/年', '识别依据：自然人股东穿透 + 关联交易披露'] },
  { id: 'ss', name: '晟盛置业', x: 760, y: 60, kind: 'hidden', sub: '隐性关联 · 胞弟持股 45%', info: ['房地产开发 · 他行授信 1.8 亿', '2025 年与母公司资金往来 2,300 万', '识别依据：自然人股东穿透 + 关联交易披露'] },
  { id: 'parent', name: '晟禾食品集团', x: 480, y: 152, kind: 'parent', sub: '母公司 · 本行贷款客户', info: ['营收 18 亿 · 全行业授信 4.5 亿 · 本行份额 4%', '本行敞口 2,000 万 · 存款 800 万', '结算量 1.8 亿/年 · 6 家子公司 · 3 家未开户'] },
  { id: 'cs', name: '彩晟商贸', x: 880, y: 162, kind: 'risk', sub: '经销商 · 今晨预警', info: ['被执行 860 万 · 本行结算量降 62%', '晟禾对其应收 1,800 万 · 担保 500 万', '风险向集团传导：担保计入敞口'] },
  { id: 'ly', name: '晟禾粮油', x: 100, y: 300, kind: 'open', sub: '持股 100% · 已开户', info: ['存款 1,100 万 · 结算 5,200 万/年', '上游 30 家供应商 · 反向保理切入点'] },
  { id: 'll', name: '晟禾冷链物流', x: 250, y: 300, kind: 'open', sub: '持股 100% · 已开户', info: ['存款 900 万 · 新建冷链仓承贷主体', '固定资产贷款 8,000 万 · 项目资本金 30% 已到位'] },
  { id: 'sw', name: '晟禾生物科技', x: 400, y: 300, kind: 'open', sub: '持股 75% · 已开户', info: ['存款 600 万 · 高新技术企业', '研发加计扣除 · 科技贷贴息机会'] },
  { id: 'yz', name: '晟禾预制菜', x: 550, y: 300, kind: 'new', sub: '持股 100% · 未开户', info: ['年营收 2.6 亿 · 目前他行结算', '存款潜力约 5,000 万 · 可开发'] },
  { id: 'ny', name: '晟禾农业发展', x: 700, y: 300, kind: 'new', sub: '持股 60% · 未开户', info: ['种植基地 · 涉农贴息机会', '存款潜力约 3,000 万 · 可开发'] },
  { id: 'vn', name: '晟禾（越南）贸易', x: 850, y: 300, kind: 'new', sub: '持股 51% · 未开户', info: ['东南亚采购主体 · 年付汇 4,200 万美元', '远期购汇锁汇需求 · 存款潜力约 4,000 万'] },
  { id: 'sup', name: '上游供应商 ×30', x: 100, y: 405, kind: 'cluster', sub: '反向保理目标群', info: ['年采购 3.6 亿 · 账期 60~90 天', '首批 12 家已在本行开户'] },
  { id: 'sea', name: '东南亚供应商', x: 850, y: 405, kind: 'cluster', sub: '越南 / 泰国原料', info: ['年付汇 4,200 万美元', '付汇 + 远期购汇锁汇'] },
];
const EDGES: GEdge[] = [
  { from: 'chair', to: 'parent', kind: 'own', label: '实控 32%' },
  { from: 'chair', to: 'hf', kind: 'hidden', label: '配偶持股 60%' },
  { from: 'chair', to: 'ss', kind: 'hidden', label: '胞弟持股 45%' },
  { from: 'parent', to: 'ly', kind: 'own', label: '100%' },
  { from: 'parent', to: 'll', kind: 'own', label: '100%' },
  { from: 'parent', to: 'sw', kind: 'own', label: '75%' },
  { from: 'parent', to: 'yz', kind: 'own', label: '100%' },
  { from: 'parent', to: 'ny', kind: 'own', label: '60%' },
  { from: 'parent', to: 'vn', kind: 'own', label: '51%' },
  { from: 'hf', to: 'parent', kind: 'infer', label: '关联采购 1,150 万', note: '推断：依据关联交易披露' },
  { from: 'ss', to: 'parent', kind: 'infer', label: '资金往来 2,300 万', note: '推断：依据关联交易披露' },
  { from: 'parent', to: 'cs', kind: 'visible', label: '担保 500 万 · 应收 1,800 万', note: '本行账户可见：回款 ↓62%' },
  { from: 'ly', to: 'sup', kind: 'cluster', label: '反向保理' },
  { from: 'vn', to: 'sea', kind: 'cluster', label: '付汇 · 锁汇' },
];
const NODE_R: Record<NodeKind, number> = { parent: 34, open: 26, new: 26, hidden: 24, risk: 26, person: 16, cluster: 20 };
const NODE_FILL: Record<NodeKind, string> = { parent: 'url(#gwGold)', open: 'url(#gwGold)', new: 'url(#gwGreen)', hidden: 'url(#gwPurple)', risk: 'url(#gwRed)', person: 'url(#gwIris)', cluster: 'url(#gwHolo)' };
const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

function GroupGraph() {
  const [hover, setHover] = useState<string | null>(null);
  const hn = hover ? nodeById(hover) : null;
  const tipX = hn ? clamp(hn.x - 120, 8, 960 - 248) : 0;
  const tipY = hn ? (hn.y < 120 ? hn.y + NODE_R[hn.kind] + 10 : hn.y - NODE_R[hn.kind] - 96) : 0;
  return (
    <svg viewBox="0 0 960 440" className="gw-graph" role="img" aria-label="晟禾集团关系图谱">
      <defs>
        <linearGradient id="gwGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset=".5" stopColor="#d9b45e" /><stop offset="1" stopColor="#a9843a" /></linearGradient>
        <linearGradient id="gwGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5fd3a0" /><stop offset=".55" stopColor="#1f8a5a" /><stop offset="1" stopColor="#155e3e" /></linearGradient>
        <linearGradient id="gwPurple" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d7bfff" /><stop offset=".6" stopColor="#9b5de5" /><stop offset="1" stopColor="#6d28d9" /></linearGradient>
        <linearGradient id="gwRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e85d55" /><stop offset=".55" stopColor="#c3272b" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
        <linearGradient id="gwIris" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c3272b" /><stop offset=".45" stopColor="#efd48a" /><stop offset="1" stopColor="#1f6b48" /></linearGradient>
        <linearGradient id="gwHolo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#fff1e4" /><stop offset="1" stopColor="#ecf8f3" /></linearGradient>
        <linearGradient id="gwTip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffdf7" /><stop offset=".6" stopColor="#fff4e2" /><stop offset="1" stopColor="#f2ecff" /></linearGradient>
        <marker id="gwArrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c3272b" /></marker>
        <marker id="gwArrowPurple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6d28d9" /></marker>
      </defs>
      {EDGES.map((e, i) => {
        const a = nodeById(e.from), b = nodeById(e.to);
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const x1 = a.x + ux * (NODE_R[a.kind] + 3), y1 = a.y + uy * (NODE_R[a.kind] + 3);
        const x2 = b.x - ux * (NODE_R[b.kind] + 5), y2 = b.y - uy * (NODE_R[b.kind] + 5);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const style = e.kind === 'own' ? { stroke: '#b8964a', sw: 1.6, dash: undefined as string | undefined, marker: undefined as string | undefined }
          : e.kind === 'hidden' ? { stroke: '#8b5cf6', sw: 1.6, dash: '6 4', marker: undefined }
          : e.kind === 'infer' ? { stroke: '#7c3aed', sw: 1.8, dash: '7 5', marker: 'url(#gwArrowPurple)' }
          : e.kind === 'visible' ? { stroke: '#c3272b', sw: 2.6, dash: undefined, marker: 'url(#gwArrowRed)' }
          : { stroke: '#2f9e6e', sw: 1.4, dash: '2 4', marker: undefined };
        const lift = e.kind === 'visible' ? -14 : e.kind === 'infer' ? -8 : -5;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={style.stroke} strokeWidth={style.sw} strokeDasharray={style.dash} markerEnd={style.marker} strokeLinecap="round" opacity={hover && hover !== e.from && hover !== e.to ? 0.35 : 0.95} />
            {e.label && <text x={mx} y={my + lift} textAnchor="middle" className="gw-edge-label">{e.label}</text>}
            {e.note && <text x={mx} y={my + lift + 12} textAnchor="middle" className={e.kind === 'visible' ? 'gw-edge-note' : 'gw-edge-infer'}>{e.note}</text>}
          </g>
        );
      })}
      {NODES.map((n) => {
        const r = NODE_R[n.kind];
        const dim = hover && hover !== n.id && !EDGES.some((e) => (e.from === hover && e.to === n.id) || (e.to === hover && e.from === n.id));
        return (
          <g key={n.id} className="gw-node" onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} opacity={dim ? 0.45 : 1}>
            {n.kind === 'risk' && <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke="#e63946" strokeWidth={3} className="gw-pulse" />}
            <circle className="gw-ring" cx={n.x} cy={n.y} r={r + 6} fill="none" stroke="#c9a24d" strokeWidth={2} strokeDasharray="3 3" />
            {n.kind === 'cluster'
              ? <rect x={n.x - 58} y={n.y - 16} width={116} height={32} rx={16} fill={NODE_FILL[n.kind]} stroke="#2f9e6e" strokeWidth={1.4} strokeDasharray="4 3" />
              : <circle cx={n.x} cy={n.y} r={r} fill={NODE_FILL[n.kind]} stroke={n.kind === 'hidden' ? '#6d28d9' : '#fff'} strokeWidth={n.kind === 'hidden' ? 2 : 3} strokeDasharray={n.kind === 'hidden' ? '5 3' : undefined} style={{ filter: 'drop-shadow(0 4px 8px rgba(92,64,20,.22))' }} />}
            {n.kind === 'person' && <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">{n.name}</text>}
            {n.kind === 'parent' && <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#3a2a08">集团</text>}
            {n.kind === 'cluster' && <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#155e3e">{n.name}</text>}
            {n.kind !== 'person' && n.kind !== 'cluster' && <>
              <text x={n.x} y={n.y + r + 14} textAnchor="middle" fontSize={11.5} fontWeight={800} fill="#1e1b16">{n.name}</text>
              <text x={n.x} y={n.y + r + 26} textAnchor="middle" fontSize={9.5} fill="#8c8478">{n.sub}</text>
            </>}
            {n.kind === 'person' && <text x={n.x} y={n.y - r - 6} textAnchor="middle" fontSize={9.5} fill="#8c8478">{n.sub}</text>}
            {n.kind === 'cluster' && <text x={n.x} y={n.y + 28} textAnchor="middle" fontSize={9.5} fill="#8c8478">{n.sub}</text>}
          </g>
        );
      })}
      {hn && (
        <g style={{ pointerEvents: 'none' }}>
          <rect x={tipX} y={tipY} width={240} height={86} rx={12} fill="url(#gwTip)" stroke="#c9a24d" strokeWidth={1} style={{ filter: 'drop-shadow(0 8px 16px rgba(92,64,20,.25))' }} />
          <text x={tipX + 12} y={tipY + 20} fontSize={12} fontWeight={900} fill="#1e1b16">{hn.name}<tspan fontSize={10} fontWeight={700} fill="#8c8478"> · {hn.sub}</tspan></text>
          {hn.info.map((s, i) => <text key={i} x={tipX + 12} y={tipY + 38 + i * 15} fontSize={10} fill="#5f5850">{s}</text>)}
        </g>
      )}
    </svg>
  );
}

/* ========================= 行业周期半环仪表 ========================= */
function CycleGauge({ value }: { value: number }) {
  const cx = 130, cy = 118, R = 96;
  const ang = Math.PI - Math.PI * clamp(value, 0, 100) / 100;
  const nx = cx + Math.cos(ang) * (R - 14), ny = cy - Math.sin(ang) * (R - 14);
  const phases = ['衰退', '触底', '复苏', '扩张', '过热'];
  return (
    <svg viewBox="0 0 260 132" className="gw-gauge" role="img" aria-label="食品加工行业周期位置">
      <defs>
        <linearGradient id="gwGauge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e63946" /><stop offset=".3" stopColor="#ff8c42" /><stop offset=".55" stopColor="#f4b942" /><stop offset=".8" stopColor="#2dc48d" /><stop offset="1" stopColor="#3a86ff" /></linearGradient>
        <linearGradient id="gwNeedle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e85d55" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
      </defs>
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="url(#gwGauge)" strokeWidth={18} strokeLinecap="round" opacity={0.95} />
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="1 28" opacity={.8} />
      {phases.map((p, i) => {
        const a = Math.PI - Math.PI * (i + 0.5) / phases.length;
        const x = cx + Math.cos(a) * (R + 20), y = cy - Math.sin(a) * (R + 20);
        return <text key={p} x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight={800} fill="#5f5850">{p}</text>;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="url(#gwNeedle)" strokeWidth={4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={8} fill="url(#gwNeedle)" stroke="#fff" strokeWidth={2} />
      <text x={cx} y={cy - 24} textAnchor="middle" fontSize={20} fontWeight={900} fill="#1e1b16">{value}</text>
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9.5} fill="#8c8478">周期指数（0~100）</text>
    </svg>
  );
}

/* ========================= 数据 ========================= */
const MEMBERS = (limit: number, ratio: number) => [
  { m: '晟禾食品集团（母公司）', p: '银行承兑汇票', a: '6,000 万', c: '30% 保证金 · 集团互保', s: '拟批', tone: 'gold' },
  { m: '晟禾粮油', p: '银行承兑汇票', a: '4,000 万', c: '30% 保证金', s: '拟批', tone: 'gold' },
  { m: '晟禾冷链物流', p: '固定资产贷款（新建冷链仓）', a: '8,000 万', c: '在建工程抵押 · 资本金 30% 已到位', s: '项目评估', tone: 'blue' },
  { m: '上游供应商 ×30（反向保理池）', p: '供应链保理', a: `${fmtYi(limit)}（确权 ${Math.round(ratio * 100)}%）`, c: '核心企业确权 · 确权部分无追索', s: '随确权比例', tone: 'green' },
  { m: '晟禾预制菜 / 农业发展 / 越南贸易', p: '预留调剂额度', a: '0（开户后调剂）', c: '先开户 · 后调剂', s: '待开户', tone: 'purple' },
];
const EXPOSURE = [
  { n: '晟禾食品集团', v: 2000 }, { n: '三禾包装', v: 3600 }, { n: '鲁源饲料', v: 2900 },
  { n: '澜海水产', v: 2200 }, { n: '凯冷制冷设备', v: 1600 }, { n: '汇源物流', v: 1200 },
];
const THINK_STEPS = [
  ['读取集团关系图谱与 6 家成员财务摘要', '母公司 + 3 家已开户子公司近 12 个月流水、3 家未开户子公司工商与纳税数据'],
  ['匹配行业研究：食品加工三条增长线', '冷链物流、预制菜、东南亚原料采购的行业景气与竞品动向'],
  ['识别供应链痛点', '上游账期 60~90 天、经销商回款波动（含今晨彩晟预警）、跨境采购汇率敞口'],
  ['生成数字化建议', '订单—仓储—结算一体化、银企直联、供应链金融平台对接、集团资金归集'],
  ['合规校验与脱敏', '不含承诺性表述 · 不含他行客户信息 · 敏感字段脱敏完成'],
];
const DOC_TOC = [
  '集团经营与产业链位置概览', '供应链协同现状诊断（上游账期 / 经销商回款 / 东南亚采购）',
  '核心企业确权反向保理方案：供应商融资成本下降约 120bp', '冷链仓项目资金安排与固定资产贷款结构（资本金 30%）',
  '跨境采购付汇 + 远期购汇锁汇的成本对冲', '数字化路径：订单—仓储—结算一体化与银企直联',
  '集团资金归集与成员单位账户体系', '实施路线图与 90 天里程碑',
];

/* ========================= 页面 ========================= */
export default function GroupWarRoom() {
  const me = PERSONAS.find((p) => p.id === 'zhou')!;
  const co = companyById('shenghe');
  const [ratio, setRatio] = useState(0.6);
  const plan = useMemo(() => factoringPlan(ratio), [ratio]);
  const total = useMemo(() => packageIncome(plan), [plan]);
  const conc = useMemo(() => concentration(0.2, 0.05, 3.0), []);

  const [ri, setRi] = useState<RarocInput>(DEFAULT_RAROC);
  const ro = useMemo(() => raroc(ri), [ri]);
  const [open, setOpen] = useState(false);
  const setNum = (k: keyof RarocInput) => (e: React.ChangeEvent<HTMLInputElement>) => setRi((s) => ({ ...s, [k]: Number(e.target.value) || 0 }));

  const [gen, setGen] = useState<'idle' | 'thinking' | 'done'>('idle');
  const [stepN, setStepN] = useState(0);
  const timer = useRef<number[]>([]);
  useEffect(() => () => timer.current.forEach(clearTimeout), []);
  const generate = () => {
    if (gen === 'thinking') return;
    timer.current.forEach(clearTimeout); timer.current = [];
    setGen('thinking'); setStepN(0);
    THINK_STEPS.forEach((_, i) => timer.current.push(window.setTimeout(() => setStepN(i + 1), 550 * (i + 1))));
    timer.current.push(window.setTimeout(() => setGen('done'), 550 * THINK_STEPS.length + 500));
  };

  const cycle = 62;
  const expoTotal = EXPOSURE.reduce((a, b) => a + b.v, 0);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(t); }, [toast]);

  return (
    <div className="fade-in">
      <div className="page-h">
        <div>
          <h1><span className="iris-text">集团客户作战室</span> · {co.name}</h1>
          <p>关系图谱 → 联动机会 → 统一授信 → 定价 → 增值方案，一屏作战 · 主视角：{me.name}（{me.title}）</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="gw-persona"><div className="av">{me.avatar}</div><div><b>{me.name}</b><span>{me.org.split('·')[1]} · {me.years}</span></div></div>
          <span className="chip red"><i />今晨 08:40 彩晟商贸预警已联动至本作战室</span>
          <span className="ai-tag"><span className="pulse" />本机模型 · 无外联</span>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="tile"><b className="gold-text">18.0 亿</b><span>集团合并营收 · 全行业授信 4.5 亿</span></div>
        <div className="tile"><b>{fmtYi(co.exposure / 10000)}<span className="delta down">份额 4%</span></b><span>本行敞口 · 存款 {fmtWan(co.deposit)} · 结算 1.8 亿/年</span></div>
        <div className="tile"><b className="green-text">1.2 亿</b><span>联动存款潜力（3 家未开户子公司）</span></div>
        <div className="tile"><b className="red-text">3.0 亿</b><span>拟集团统一授信 · 集中度占用 {conc.pct}%</span></div>
      </div>

      <AiConclusion tone="gold" confidence={0.85} actions={['scf', 'fx', 'forward']}
        headline="晟禾集团建议以 3.0 亿统一授信为抓手：先落地反向保理与 3 家未开户子公司开户，再推进冷链仓固定资产贷款与越南付汇锁汇；彩晟商贸 500 万经销商融资暂缓"
        points={[
          '联动存款潜力约 1.2 亿（预制菜 / 农业发展 / 越南贸易 3 家未开户子公司）',
          `反向保理确权 ${Math.round(ratio * 100)}% → 可用额度 ${fmtYi(plan.limit)}，方案综合收益 ≈ ${fmtWan(total)}/年`,
          `RAROC ${ro.raroc}%（门槛 ${ri.hurdle}%）· ${ro.pass ? '达标' : '未达标，需调整加点或派生存款'}`,
          `集团集中度占用 ${conc.pct}%，余量 ${fmtYi(conc.headroom)}；彩晟担保 500 万已计入敞口`,
        ]}
        evidence={['股权穿透 + 关联交易披露', '本行账户资金流', `行业周期指数 ${cycle} · 复苏中后期`, '今晨彩晟预警联动']}
        onSystem={(_, label) => setToast(`已执行：${label}（发起人 ${me.name}）`)} />

      {/* 行 1：图谱 + 联动机会 */}
      <div className="gw-grid">
        <div className="card">
          <div className="card-h">
            <div className="card-t"><span className="dot" />集团关系图谱 · 股权穿透 + 资金流</div>
            <div style={{ display: 'flex', gap: 6 }}><span className="chip purple"><i />隐性关联 2 家</span><span className="chip green"><i />可开发 3 家</span><span className="chip red"><i />风险 1 家</span></div>
          </div>
          <GroupGraph />
          <div className="gw-legend">
            <span><i className="gold" />已开户（母公司 / 子公司）</span>
            <span><i className="green" />未开户 · 可开发</span>
            <span><i className="purple" />隐性关联（自然人股东穿透）</span>
            <span><i className="red" />风险（今晨预警）</span>
            <span><em />本行账户可见的异常资金流</span>
            <span><em className="dash" />他行推断 · 依据关联交易披露</span>
          </div>
          <div className="gw-note">悬停节点查看持股、账户与备注 · 隐性关联识别依据：自然人股东穿透（配偶 / 胞弟）+ 年报关联交易披露；他行资金流仅为推断，需尽调核实。</div>
        </div>

        <div className="card purple">
          <div className="card-h"><div className="card-t"><span className="dot" />联动机会</div><span className="chip"><i />3 条 · 合计价值 ≈ {fmtWan(total)}/年</span></div>
          <div className="gw-opp">
            <div className="ico gold"><Icons.Landmark size={18} /></div>
            <div style={{ flex: 1 }}>
              <b>3 家子公司未开户 → 存款联动</b>
              <p>晟禾预制菜（5,000 万）· 农业发展（3,000 万）· 越南贸易（4,000 万），随统一授信附带开户条款。</p>
              <span className="val gold-text">≈ 1.2 亿</span> <span className="card-s">存款潜力</span>
            </div>
          </div>
          <div className="gw-opp">
            <div className="ico"><Icons.Workflow size={18} /></div>
            <div style={{ flex: 1 }}>
              <b>上游 30 家供应商 → 反向保理</b>
              <p>以晟禾粮油为核心企业确权，供应商融资成本下降约 120bp，集团账期可延长至 90 天；首批 12 家已在本行开户。</p>
              <span className="val green-text">≈ 2.4 亿</span> <span className="card-s">年融资量</span>
            </div>
          </div>
          <div className="gw-opp">
            <div className="ico blue"><Icons.Globe2 size={18} /></div>
            <div style={{ flex: 1 }}>
              <b>东南亚采购付汇 + 远期购汇锁汇</b>
              <p>越南贸易公司年付汇 4,200 万美元，汇率波动敞口未对冲；远期购汇锁汇 + 付汇集中办理。</p>
              <span className="val" style={{ color: '#1d4ed8' }}>≈ 38 万</span> <span className="card-s">年国际业务收益</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn sm gold"><Icons.ListChecks size={13} />生成开户联动清单</button>
            <button className="btn sm ghost"><Icons.Send size={13} />推送至国际业务部</button>
          </div>
        </div>
      </div>

      {/* 行 2：统一授信方案 + 定价 */}
      <div className="gw-grid">
        <div className="card gold">
          <div className="card-h">
            <div className="card-t"><span className="dot" />集团统一授信方案 · 总额度 3.0 亿</div>
            <span className="chip red"><i />含额度扣减 / 暂缓项 1 条</span>
          </div>
          <div className="gw-stack">
            <i className="a" style={{ width: '33.3%' }}>银承 1.0 亿</i>
            <i className="b" style={{ width: '40%' }}>供应链保理 1.2 亿</i>
            <i className="c" style={{ width: '26.7%' }}>固定资产贷款 0.8 亿</i>
          </div>
          <div className="card-s">固定资产贷款用于新建冷链仓：项目总投资 1.15 亿，项目资本金 30%（3,450 万）已到位，贷款覆盖 70% 以内。</div>

          <div className="gw-slider">
            <div className="row">
              <span><Icons.SlidersHorizontal size={14} style={{ verticalAlign: -2 }} /> 核心企业确权比例</span>
              <span className="red-text" style={{ fontSize: 18 }}>{Math.round(ratio * 100)}%</span>
            </div>
            <input className="gw-range" type="range" min={0} max={100} step={5} value={Math.round(ratio * 100)} onChange={(e) => setRatio(Number(e.target.value) / 100)} aria-label="核心企业确权比例" />
            <div className="card-s">确权部分按明保理（无追索）足额计入；未确权部分按暗保理（有追索）35% 折算。拖动即刻重算保理额度与综合收益。</div>
            <div className="gw-mini num">
              <div><b className="green-text">{fmtYi(plan.limit)}</b><span>保理可用额度</span></div>
              <div><b>LPR+{plan.spreadBp}bp</b><span>加权加点 · PD {(plan.blendedPd * 100).toFixed(2)}%</span></div>
              <div><b className="gold-text">{fmtWan(plan.income)}</b><span>保理年综合收益</span></div>
              <div><b className="red-text">{fmtWan(total)}</b><span>方案综合收益 / 年</span></div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>成员单位</th><th>品种</th><th>额度</th><th>担保 / 条件</th><th>状态</th></tr></thead>
              <tbody>
                {MEMBERS(plan.limit, ratio).map((r) => (
                  <tr key={r.m}><td><b>{r.m}</b></td><td>{r.p}</td><td className="num">{r.a}</td><td>{r.c}</td><td><span className={`chip ${r.tone}`}><i />{r.s}</span></td></tr>
                ))}
                <tr className="gw-warn-row">
                  <td><b>彩晟商贸（经销商）</b></td><td>额度扣减 / 暂缓项</td><td className="num">−500 万 暂缓</td>
                  <td>经销商融资 500 万暂缓；母公司对其担保 500 万计入集团敞口</td>
                  <td><span className="chip red"><i />今晨预警 · 暂缓</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
              <span>单一集团客户集中度 · 限额 {fmtYi(conc.limit, 1)}（一级资本净额 40 亿 × 15%，示例）</span>
              <span className={conc.pct > 80 ? 'red-text' : 'green-text'}>授信后占用 {conc.pct}% · 余量 {fmtYi(conc.headroom)}</span>
            </div>
            <div className="gw-conc">
              <i style={{ width: `${conc.total / conc.limit * 100}%` }} />
              <i className="guar" style={{ width: `${(conc.existing + conc.guarantee) / conc.limit * 100}%` }} />
              <i className="exist" style={{ width: `${conc.existing / conc.limit * 100}%` }} />
              <em style={{ left: '80%' }} data-l="内部预警线 80%" />
            </div>
            <div className="card-s">存量敞口 {fmtYi(conc.existing)}（金）+ 彩晟担保计入 {fmtYi(conc.guarantee)}（红）+ 拟新增 {fmtYi(conc.proposed, 1)}（幻彩）= {fmtYi(conc.total)}。</div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />智能定价 · RAROC</div><span className="chip orange"><i />示例参数</span></div>
          <div className="gw-price-big">
            <b className="red-text">{ro.rate.toFixed(2)}%</b>
            <span>= LPR 1Y {LPR_1Y.toFixed(2)}% + <b>{ri.bp}bp</b> · 授信 {fmtYi(ri.amount, 1)}</span>
          </div>
          <div className="gw-inputs">
            <label>加点（bp）<input type="number" value={ri.bp} onChange={setNum('bp')} step={5} /></label>
            <label>PD 违约概率（%）<input type="number" value={ri.pd} onChange={setNum('pd')} step={0.1} /></label>
            <label>LGD 违约损失率（%）<input type="number" value={ri.lgd} onChange={setNum('lgd')} step={5} /></label>
            <label>派生存款（万）<input type="number" value={ri.deposit} onChange={setNum('deposit')} step={1000} /></label>
          </div>
          <div className={`gw-raroc ${ro.pass ? '' : 'fail'}`}>
            <div><div className="card-s">RAROC</div><b className={ro.pass ? 'green-text' : 'red-text'}>{ro.raroc}%</b></div>
            <div className="bar"><i style={{ width: `${clamp(ro.raroc / 30 * 100, 2, 100)}%` }} /></div>
            <div style={{ textAlign: 'right' }}><div className="card-s">行内门槛</div><b style={{ fontSize: 16 }}>{ri.hurdle}%</b></div>
            <span className={`chip ${ro.pass ? 'green' : 'red'}`}><i />{ro.pass ? '达标' : '未达标'}</span>
          </div>
          <div className="card-s" style={{ marginTop: 6 }}>保本加点 {ro.breakevenBp}bp · 经济增加值（EVA）{fmtWan(ro.eva)}/年 · 综合贡献回馈 {fmtWan(ro.contribution)}/年</div>
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setOpen((o) => !o)}>
            {open ? <Icons.ChevronUp size={13} /> : <Icons.ChevronDown size={13} />}{open ? '收起定价明细' : '展开定价明细（FTP / 成本 / EL / 资本）'}
          </button>
          {open && (
            <div className="kv gw-detail fade-in num">
              <div className="row"><span>利息收入（EAD {fmtWan(ro.ead)} × {ro.rate.toFixed(2)}%）</span><span>{fmtWan(ro.interest)}</span></div>
              <div className="row"><span>− FTP 内部资金成本（{ri.ftp}%）</span><span>−{fmtWan(ro.ftpCost)}</span></div>
              <div className="row"><span>− 运营成本（{ri.opex}%）</span><span>−{fmtWan(ro.opexCost)}</span></div>
              <div className="row"><span>− 预期损失 EL（PD {ri.pd}% × LGD {ri.lgd}% × EAD）</span><span>−{fmtWan(ro.el)}</span></div>
              <div className="row"><span>经济资本占用（{ri.capitalRatio}%）/ 资本成本（{ri.capitalCost}%）</span><span>{fmtWan(ro.ec)} / {fmtWan(ro.ecCost)}</span></div>
              <div className="row"><span>目标利润（{ri.targetMargin}%）</span><span>{fmtWan(ro.targetProfit)}</span></div>
              <div className="row"><span>+ 综合贡献回馈：存款 {fmtWan(ri.deposit * ri.depositSpread / 100)} · 结算 {fmtWan(ri.settlementFee)} · 国际 {fmtWan(ri.intlIncome)}</span><span>+{fmtWan(ro.contribution)}</span></div>
              <div className="row sum"><span>风险调整后收益 ÷ 经济资本 = RAROC</span><span>{fmtWan(ro.netProfit)} ÷ {fmtWan(ro.ec)} = {ro.raroc}%</span></div>
            </div>
          )}
          <div className="gw-note">以上 FTP、PD/LGD、资本占用率、门槛均为示例参数，正式定价以行内定价系统与授信审批为准。</div>
        </div>
      </div>

      {/* 行 3：增值方案工坊 + 行业周期 */}
      <div className="gw-grid">
        <div className="card green">
          <div className="card-h"><div className="card-t"><span className="dot" />增值方案工坊 · 为客户出具建议书</div><span className="ai-tag"><Icons.Sparkles size={12} />AI 起草</span></div>
          <p className="card-s" style={{ marginBottom: 10 }}>把作战室里的图谱、供应链痛点与方案结构，整理成一份可与董事长当面交流的建议书；同时为下周高管会谈做一次预演。</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={generate} disabled={gen === 'thinking'}>
              <Icons.FileText size={14} />{gen === 'thinking' ? '起草中…' : '一键出具《晟禾集团供应链协同与数字化建议书》'}
            </button>
            <Link className="btn gold" to="/scene/sparring?scene=exec"><Icons.MessagesSquare size={14} />预演下周高管会谈</Link>
          </div>
          {gen !== 'idle' && (
            <div className="think fade-in" style={{ marginTop: 12 }}>
              {THINK_STEPS.slice(0, Math.max(stepN, 1)).map(([t, d], i) => (
                <div className="step fade-in" key={t}>
                  <span className="n">{i + 1}</span>
                  <div><b>{t}{i === stepN - 1 && gen === 'thinking' ? ' …' : ''}</b><p>{d}</p></div>
                  {i < stepN && <Icons.CheckCircle2 size={16} color="#1f8a5a" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          )}
          {gen === 'done' && (
            <div className="gw-doc fade-in">
              <h4 className="serif">《晟禾集团供应链协同与数字化建议书》 · 目录</h4>
              <ol>{DOC_TOC.map((t, i) => <li key={i}><b>{t.split('：')[0].split('（')[0]}</b>{t.includes('：') ? '：' + t.split('：')[1] : t.includes('（') ? '（' + t.split('（')[1] : ''}</li>)}</ol>
              <p><b>摘要：</b>晟禾集团处于食品加工行业复苏中后期，冷链、预制菜与东南亚原料采购构成三条增长线。当前供应链的主要摩擦在于上游账期 60~90 天带来的供应商资金压力、经销商回款波动（含近期个别经销商被执行事项）以及跨境采购的汇率敞口。建议以晟禾粮油为核心企业建立确权反向保理机制，使供应商融资成本下降约 120bp、集团账期延至 90 天；冷链仓项目按 30% 资本金、70% 以内固定资产贷款安排；越南贸易公司通过远期购汇锁定采购成本；同步推进订单—仓储—结算一体化与集团资金归集，实现成员单位账户体系统一与资金可视化。</p>
              <div className="foot"><span>AI 起草，供交流参考 · 不构成任何授信承诺</span><span>本机模型生成 · 2026-09-05 · 起草人：{me.name}</span></div>
            </div>
          )}
        </div>

        <div className="card blue">
          <div className="card-h"><div className="card-t"><span className="dot" />行业周期仪表盘 · 食品加工</div><span className="chip blue"><i />复苏中后期</span></div>
          <CycleGauge value={cycle} />
          <div className="gw-cycle-tags">
            <span className="chip green"><i />原料成本 ↓8%</span>
            <span className="chip"><i />食品 CPI +1.9%</span>
            <span className="chip blue"><i />产能利用率 76.4%</span>
            <span className="chip purple"><i />预制菜赛道 +18%</span>
            <span className="chip orange"><i />经销商回款波动 ↑</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 800 }}>
            <span>本行该链条 6 家客户敞口</span><span className="gold-text">{fmtYi(expoTotal / 10000)}</span>
          </div>
          <div className="gw-exposure num">
            {EXPOSURE.map((e) => (
              <div className="r" key={e.n}><span>{e.n}</span><div className="bar"><i style={{ width: `${e.v / 4000 * 100}%` }} /></div><b>{fmtWan(e.v)}</b></div>
            ))}
          </div>
          <div className="gw-impact">
            <b>上午预警影响评估：</b>彩晟商贸仅占晟禾销售约 6%，对集团现金流影响有限；但母公司担保 500 万须计入敞口并暂缓经销商融资，链条其余 5 家客户暂无直接传导。
          </div>
        </div>
      </div>
      {toast && <div className="toast fade-in"><Icons.CheckCircle2 size={14} />{toast}</div>}
    </div>
  );
}
