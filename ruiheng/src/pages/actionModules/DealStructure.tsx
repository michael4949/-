import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { COMPANIES, companyById } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';
import DocActions, { DEPTS } from '../../components/DocActions';
import { type ActionModule, type ModuleCtx, hashStr, iso, addDays, cnDate, fmtWan, Sec, AiCard, Field, Check, ChipPick, ChipMulti, NumInput, Empty, Score } from './shared';

/* ====================================================================== 复杂交易结构设计（F-ZY-013） */
type TxType = '并购' | '银团' | '结构化融资' | '租赁';
type Tone = 'red' | 'gold' | 'green' | 'blue' | 'purple' | 'dark';
interface Node { id: string; label: string; x: number; y: number; tone: Tone }
interface Flow { from: string; to: string; label: string; kind: 'fund' | 'repay' | 'credit' }
interface Cand { key: 'A' | 'B' | 'C'; name: string; brief: string; nodes: Node[]; flows: Flow[]; spread: number; termFit: number; capital: number; regulatory: number; complexity: number; pros: string; cons: string; grace: number; balloon: number }
const TX_TYPES: TxType[] = ['并购', '银团', '结构化融资', '租赁'];
const PARTIES = ['本行（牵头 / 代理行）', '联合牵头行', '参加行', '租赁公司', '信托 / SPV', '标的公司', '母公司', '担保公司', '夹层投资人'];
const GUARANTEES = ['标的股权质押', '固定资产抵押', '母公司保证', '应收账款质押', '差额补足', '保证金', '在建工程抵押'];
const GOALS = ['降低综合成本', '匹配项目现金流期限', '降低资本占用', '表外化 / 不并表', '缩短审批时间', '分散单一集中度'];
const N = (id: string, label: string, x: number, y: number, tone: Tone = 'blue'): Node => ({ id, label, x, y, tone });
const F = (from: string, to: string, label: string, kind: Flow['kind'] = 'fund'): Flow => ({ from, to, label, kind });
const TEMPLATES: Record<TxType, Cand[]> = {
  并购: [
    { key: 'A', name: '并购贷款直贷', brief: '本行直接向并购方发放并购贷款，标的股权质押 + 母公司保证', spread: 0.55, termFit: 3, capital: 4, regulatory: 3, complexity: 2, grace: 0, balloon: 0, pros: '审批路径最短，主体与增信清晰', cons: '资本占用高，期限受并购贷款上限约束',
      nodes: [N('bank', '本行', 40, 100, 'red'), N('buyer', '并购方', 160, 100, 'gold'), N('seller', '转让方', 280, 40, 'blue'), N('target', '标的公司', 280, 160, 'green'), N('parent', '母公司', 160, 25, 'purple')],
      flows: [F('bank', 'buyer', '并购贷款 ≤ 60%'), F('buyer', 'seller', '交易价款'), F('seller', 'target', '股权交割', 'credit'), F('target', 'bank', '标的股权质押', 'credit'), F('parent', 'bank', '母公司保证', 'credit'), F('buyer', 'bank', '还本付息', 'repay')] },
    { key: 'B', name: 'SPV 结构化并购', brief: '并购方设立 SPV 承接贷款与股权，以标的现金流偿还，资产抵押 + SPV 股权质押', spread: 0.35, termFit: 5, capital: 3, regulatory: 4, complexity: 4, grace: 1, balloon: 0, pros: '与标的现金流匹配最好，风险隔离', cons: '监管核对项多，需穿透管理 SPV',
      nodes: [N('bank', '本行', 40, 60, 'red'), N('buyer', '并购方', 40, 150, 'gold'), N('spv', 'SPV', 160, 105, 'purple'), N('seller', '转让方', 280, 60, 'blue'), N('target', '标的公司', 280, 150, 'green')],
      flows: [F('bank', 'spv', '并购贷款'), F('buyer', 'spv', '资本金 ≥ 40%'), F('spv', 'seller', '交易价款'), F('target', 'spv', '分红 / 经营现金流', 'repay'), F('spv', 'bank', '还本付息', 'repay'), F('target', 'bank', '资产抵押', 'credit'), F('spv', 'bank', 'SPV 股权质押', 'credit')] },
    { key: 'C', name: '并购银团 + 夹层', brief: '本行牵头组建并购银团，引入夹层投资人分担，股权质押 + 差额补足', spread: 0.85, termFit: 4, capital: 2, regulatory: 3, complexity: 5, grace: 1, balloon: 0.3, pros: '资本占用与集中度最低', cons: '综合成本最高，组团与谈判周期长',
      nodes: [N('bank', '本行 · 牵头', 40, 40, 'red'), N('p', '参加行', 40, 105, 'blue'), N('mez', '夹层投资人', 40, 170, 'purple'), N('buyer', '并购方', 170, 105, 'gold'), N('seller', '转让方', 290, 50, 'blue'), N('target', '标的公司', 290, 160, 'green')],
      flows: [F('bank', 'buyer', '银团份额 40%'), F('p', 'buyer', '银团份额 60%'), F('mez', 'buyer', '夹层资金'), F('buyer', 'seller', '交易价款'), F('target', 'bank', '股权质押 + 差额补足', 'credit'), F('buyer', 'bank', '还本付息', 'repay')] },
  ],
  银团: [
    { key: 'A', name: '本行牵头银团', brief: '本行任牵头行与代理行，统一合同与担保，按份额分配本息', spread: 0.4, termFit: 4, capital: 3, regulatory: 3, complexity: 3, grace: 1, balloon: 0, pros: '主办行地位与牵头费收入', cons: '组团周期与代理行责任',
      nodes: [N('bank', '本行 · 牵头', 40, 45, 'red'), N('a', '参加行 A', 40, 105, 'blue'), N('b', '参加行 B', 40, 165, 'blue'), N('bor', '借款人', 170, 105, 'gold'), N('asset', '项目资产', 290, 105, 'green')],
      flows: [F('bank', 'bor', '份额 40%'), F('a', 'bor', '份额 35%'), F('b', 'bor', '份额 25%'), F('bor', 'asset', '项目投入'), F('asset', 'bank', '项目资产抵押（代理行持有）', 'credit'), F('bor', 'bank', '统一还本付息 · 代理行分配', 'repay')] },
    { key: 'B', name: '俱乐部贷款', brief: '各行分别签署双边合同、各自审批，母公司保证 + 资产抵押', spread: 0.5, termFit: 3, capital: 3, regulatory: 2, complexity: 2, grace: 0, balloon: 0, pros: '审批独立、落地快', cons: '担保共享需协议安排，份额协调难',
      nodes: [N('bank', '本行', 40, 45, 'red'), N('a', '参加行 A', 40, 105, 'blue'), N('b', '参加行 B', 40, 165, 'blue'), N('bor', '借款人', 170, 105, 'gold'), N('parent', '母公司', 290, 45, 'purple'), N('asset', '项目资产', 290, 165, 'green')],
      flows: [F('bank', 'bor', '双边合同 · 份额'), F('a', 'bor', '双边合同 · 份额'), F('b', 'bor', '双边合同 · 份额'), F('parent', 'bank', '母公司保证', 'credit'), F('asset', 'bank', '资产抵押（共享）', 'credit'), F('bor', 'bank', '还本付息', 'repay')] },
    { key: 'C', name: '银团 + 融资租赁', brief: '银团覆盖建设投入，设备部分由租赁公司以融资租赁承接', spread: 0.65, termFit: 5, capital: 2, regulatory: 3, complexity: 4, grace: 1, balloon: 0, pros: '期限最匹配，设备部分不占贷款额度', cons: '两套法律关系，租赁公司资质要求',
      nodes: [N('syn', '银团 · 本行牵头', 40, 60, 'red'), N('les', '租赁公司', 40, 150, 'purple'), N('bor', '借款人', 170, 105, 'gold'), N('sup', '设备供应商', 290, 150, 'blue'), N('asset', '项目资产', 290, 60, 'green')],
      flows: [F('syn', 'bor', '银团贷款 70%'), F('les', 'sup', '购买设备'), F('les', 'bor', '融资租赁 30%'), F('bor', 'les', '租金', 'repay'), F('bor', 'syn', '还本付息', 'repay'), F('asset', 'syn', '资产抵押', 'credit')] },
  ],
  结构化融资: [
    { key: 'A', name: '应收账款保理', brief: '客户将对核心企业应收转让本行，本行发放保理融资，买方到期回款', spread: 0.9, termFit: 2, capital: 3, regulatory: 2, complexity: 2, grace: 0, balloon: 0, pros: '操作简单、放款快', cons: '期限短、成本高，依赖买方确权',
      nodes: [N('bank', '本行', 40, 105, 'red'), N('cli', '客户 · 卖方', 170, 50, 'gold'), N('buy', '买方 · 核心企业', 290, 150, 'green')],
      flows: [F('cli', 'bank', '应收账款转让', 'credit'), F('bank', 'cli', '保理融资款'), F('buy', 'bank', '到期回款', 'repay'), F('buy', 'cli', '确权 / 付款承诺', 'credit')] },
    { key: 'B', name: '资产支持融资（SPV）', brief: '基础资产真实出售至 SPV，本行认购优先级，次级自留 + 差额补足', spread: 0.3, termFit: 4, capital: 1, regulatory: 5, complexity: 5, grace: 0, balloon: 0, pros: '成本与资本占用最低', cons: '真实出售与破产隔离认定复杂，周期长',
      nodes: [N('cli', '客户 · 原始权益人', 40, 105, 'gold'), N('spv', 'SPV', 170, 105, 'purple'), N('bank', '本行 · 优先级', 290, 50, 'red'), N('sub', '次级投资人', 290, 160, 'blue')],
      flows: [F('cli', 'spv', '基础资产转让', 'credit'), F('spv', 'cli', '转让对价'), F('bank', 'spv', '认购优先级'), F('sub', 'spv', '认购次级 · 自留 ≥ 5%'), F('spv', 'bank', '本息分配', 'repay'), F('cli', 'bank', '差额补足', 'credit')] },
    { key: 'C', name: '供应链票据 + 贴现', brief: '核心企业签发供应链票据，供应商持票到本行贴现，核心企业到期兑付', spread: 0.45, termFit: 3, capital: 2, regulatory: 3, complexity: 3, grace: 0, balloon: 1, pros: '依托核心企业信用，可拆分流转', cons: '受票据期限上限约束，需贸易背景',
      nodes: [N('core', '核心企业', 40, 105, 'green'), N('sup', '一级供应商', 170, 50, 'gold'), N('bank', '本行', 290, 105, 'red'), N('sup2', '二级供应商', 170, 160, 'blue')],
      flows: [F('core', 'sup', '签发供应链票据', 'credit'), F('sup', 'bank', '票据贴现', 'credit'), F('bank', 'sup', '贴现款'), F('core', 'bank', '到期兑付', 'repay'), F('sup', 'sup2', '票据拆分转让', 'credit')] },
  ],
  租赁: [
    { key: 'A', name: '直接融资租赁 + 租赁保理', brief: '租赁公司购买设备出租给客户，本行对租赁公司做租赁保理，设备所有权作增信', spread: 0.7, termFit: 4, capital: 2, regulatory: 2, complexity: 3, grace: 0, balloon: 0, pros: '设备所有权清晰，期限与设备寿命匹配', cons: '两层法律关系，综合成本高于直贷',
      nodes: [N('bank', '本行', 40, 105, 'red'), N('les', '租赁公司', 170, 105, 'purple'), N('sup', '设备供应商', 290, 50, 'blue'), N('cli', '客户 · 承租人', 290, 160, 'gold')],
      flows: [F('les', 'sup', '购买设备'), F('les', 'cli', '出租设备', 'credit'), F('cli', 'les', '租金', 'repay'), F('bank', 'les', '租赁保理'), F('les', 'bank', '租金债权转让 + 设备所有权', 'credit'), F('les', 'bank', '还本付息', 'repay')] },
    { key: 'B', name: '售后回租', brief: '客户将自有设备出售给租赁公司再回租，本行做租赁资产保理，保证 + 保证金', spread: 0.6, termFit: 4, capital: 2, regulatory: 3, complexity: 3, grace: 0, balloon: 0, pros: '盘活存量设备，放款快', cons: '设备价值需评估，租赁物权属登记',
      nodes: [N('bank', '本行', 40, 105, 'red'), N('les', '租赁公司', 170, 105, 'purple'), N('cli', '客户 · 承租人', 290, 120, 'gold'), N('g', '保证人', 290, 35, 'green')],
      flows: [F('cli', 'les', '出售设备 · 所有权转移', 'credit'), F('les', 'cli', '设备价款'), F('cli', 'les', '租金', 'repay'), F('bank', 'les', '租赁资产保理'), F('les', 'bank', '租金债权质押', 'credit'), F('les', 'bank', '还本付息', 'repay'), F('g', 'bank', '保证 + 保证金 10%', 'credit')] },
    { key: 'C', name: '经营租赁 + 流动资金贷款', brief: '设备走经营租赁（表外），营运资金由本行流动资金贷款覆盖，应收账款质押', spread: 0.5, termFit: 3, capital: 3, regulatory: 2, complexity: 2, grace: 0, balloon: 0, pros: '结构最简单，客户不并表', cons: '期限偏短，经营租赁成本由租赁公司定价',
      nodes: [N('bank', '本行', 40, 60, 'red'), N('les', '租赁公司', 40, 150, 'purple'), N('cli', '客户', 170, 105, 'gold'), N('sup', '设备供应商', 290, 150, 'blue'), N('down', '下游买方', 290, 60, 'green')],
      flows: [F('les', 'cli', '经营租赁（表外）', 'credit'), F('les', 'sup', '采购设备'), F('bank', 'cli', '流动资金贷款'), F('cli', 'bank', '还本付息', 'repay'), F('cli', 'les', '租金', 'repay'), F('down', 'bank', '应收账款质押 / 回款监管', 'credit')] },
  ],
};
const REG: Record<TxType, Array<{ text: string; basis: string }>> = {
  并购: [{ text: '并购贷款占并购交易价款比例 ≤ 60%', basis: '并购贷款风险管理指引' }, { text: '并购贷款期限 ≤ 7 年', basis: '并购贷款风险管理指引' }, { text: '并购方自有资金比例 ≥ 40%', basis: '并购贷款风险管理指引' }, { text: '并购方与标的具有较高产业相关度', basis: '并购贷款风险管理指引' }, { text: '单一借款人并购贷款集中度符合行内限额', basis: '行内授信集中度管理办法' }, { text: '关联交易识别与信息披露', basis: '关联交易管理办法' }, { text: '资本计量：按 100% 风险权重计提', basis: '商业银行资本管理办法' }],
  银团: [{ text: '牵头行承贷份额 ≥ 20%', basis: '银团贷款业务指引' }, { text: '单家银行份额不超过大额风险暴露限额', basis: '大额风险暴露管理办法' }, { text: '银团合同与担保文件统一、代理行职责明确', basis: '银团贷款业务指引' }, { text: '项目资本金比例符合国家规定', basis: '固定资产投资项目资本金制度' }, { text: '同业授信与内部审批一致', basis: '行内同业授信管理办法' }, { text: '牵头费、代理费收取符合收费规范', basis: '银行服务收费管理规定' }],
  结构化融资: [{ text: '基础资产真实、可转让且权属清晰', basis: '信贷资产证券化管理办法' }, { text: '真实出售与破产隔离认定', basis: '资产证券化会计与法律意见' }, { text: '风险自留比例 ≥ 5%', basis: '风险自留监管要求' }, { text: '信息披露与投资者适当性', basis: '资产支持证券信息披露规则' }, { text: '资本计量按证券化风险暴露处理', basis: '商业银行资本管理办法' }, { text: '关联方与循环购买限制', basis: '行内结构化融资管理办法' }],
  租赁: [{ text: '租赁物权属清晰且完成登记', basis: '融资租赁公司监督管理办法' }, { text: '租赁保理需基于真实租赁关系', basis: '商业银行保理业务管理办法' }, { text: '租赁公司资质与监管要求', basis: '融资租赁公司监督管理办法' }, { text: '承租人融资租赁计入有息负债口径', basis: '行内授信管理办法' }, { text: '资本计量：按对租赁公司或承租人风险暴露', basis: '商业银行资本管理办法' }, { text: '售后回租租赁物价值不高于评估值', basis: '融资租赁公司监督管理办法' }],
};
const TONE_GRAD: Record<Tone, [string, string]> = { red: ['#ff7a70', '#c3272b'], gold: ['#f7e2a5', '#c9a24d'], green: ['#6ee3ad', '#1f8a5a'], blue: ['#7fb0ff', '#3a86ff'], purple: ['#c7a4ff', '#9b5de5'], dark: ['#3a2a14', '#14342a'] };
const NW = 84, NH = 30;
function edge(cx: number, cy: number, dx: number, dy: number) { const tx = dx !== 0 ? NW / 2 / Math.abs(dx) : Infinity; const ty = dy !== 0 ? NH / 2 / Math.abs(dy) : Infinity; const t = Math.min(tx, ty); return [cx + dx * t, cy + dy * t]; }

function StructureSvg({ c, id }: { c: Cand; id: string }) {
  const byId = Object.fromEntries(c.nodes.map((n) => [n.id, n]));
  const color = (k: Flow['kind']) => (k === 'fund' ? '#c3272b' : k === 'repay' ? '#1f8a5a' : '#c9a24d');
  return (
    <div className="af-svg">
      <svg viewBox="0 0 330 200">
        <defs>
          {(Object.keys(TONE_GRAD) as Tone[]).map((t) => <linearGradient key={t} id={`${id}-${t}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={TONE_GRAD[t][0]} /><stop offset="1" stopColor={TONE_GRAD[t][1]} /></linearGradient>)}
          {(['fund', 'repay', 'credit'] as const).map((k) => <marker key={k} id={`${id}-m-${k}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={color(k)} /></marker>)}
          <linearGradient id={`${id}-lbl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#fff7ec" /></linearGradient>
        </defs>
        {c.flows.map((f, i) => {
          const a = byId[f.from], b = byId[f.to]; if (!a || !b) return null;
          const rev = c.flows.some((g) => g.from === f.to && g.to === f.from);
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const ox = rev ? (-dy / len) * 7 : 0, oy = rev ? (dx / len) * 7 : 0;
          const [x1, y1] = edge(a.x + ox, a.y + oy, dx, dy); const [x2, y2] = edge(b.x + ox, b.y + oy, -dx, -dy);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const w = Math.min(120, f.label.length * 7.2 + 8);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color(f.kind)} strokeWidth={f.kind === 'credit' ? 1.4 : 1.8} strokeDasharray={f.kind === 'credit' ? '4 3' : undefined} markerEnd={`url(#${id}-m-${f.kind})`} />
              <rect x={mx - w / 2} y={my - 7} width={w} height={13} rx={4} fill={`url(#${id}-lbl)`} stroke={color(f.kind)} strokeOpacity=".35" strokeWidth=".6" />
              <text x={mx} y={my + 3} textAnchor="middle" fontSize="7.2" fontWeight="700" fill="#5f5850">{f.label}</text>
            </g>
          );
        })}
        {c.nodes.map((n) => (
          <g key={n.id}>
            <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx={8} fill={`url(#${id}-${n.tone})`} stroke="#fff" strokeWidth="1.5" />
            <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="800" fill={n.tone === 'gold' ? '#3a2a08' : '#fff'}>{n.label}</text>
          </g>
        ))}
      </svg>
      <div className="af-legend"><span><i style={{ background: 'linear-gradient(90deg,#ff7a70,#c3272b)' }} />资金流</span><span><i style={{ background: 'linear-gradient(90deg,#6ee3ad,#1f8a5a)' }} />还款 / 回款</span><span><i style={{ background: 'linear-gradient(90deg,#f7e2a5,#c9a24d)', borderTop: '1px dashed #c9a24d', height: 0 }} />增信 / 权属</span></div>
    </div>
  );
}

const cls = (v: number, lowGood: boolean) => (lowGood ? (v <= 2 ? 'good' : v === 3 ? 'mid' : 'bad') : v >= 4 ? 'good' : v === 3 ? 'mid' : 'bad');
const lv = (v: number) => (v <= 2 ? '低' : v === 3 ? '中' : '高');
const lvReg = (v: number) => (v <= 2 ? '少' : v === 3 ? '中' : '多');

function DealStructure({ ctx }: { ctx: ModuleCtx }) {
  const { step, setStep, tasks, cols, selected, select, addTask, moveTask, addLog, toast, docs } = ctx;
  const [coId, setCoId] = useState(selected?.coId ?? 'shenghe');
  const co = companyById(coId);
  const [tx, setTx] = useState<TxType>('并购');
  const [amount, setAmount] = useState(18000);
  const [price, setPrice] = useState(30000);
  const [term, setTerm] = useState(60);
  const [parties, setParties] = useState<string[]>(['本行（牵头 / 代理行）', '标的公司', '母公司']);
  const [guar, setGuar] = useState<string[]>(['标的股权质押', '母公司保证']);
  const [goals, setGoals] = useState<string[]>(['匹配项目现金流期限', '降低资本占用']);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [pick, setPick] = useState<'A' | 'B' | 'C'>('B');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [doc, setDoc] = useState('');
  const [editing, setEditing] = useState(false);
  const [depts, setDepts] = useState<string[]>(['投资银行部', '授信审批部']);
  const [when, setWhen] = useState(iso(addDays(ctx.today, 3)));
  const [submitted, setSubmitted] = useState(false);
  const task = tasks.find((t) => t.id === taskId);
  const years = Math.max(1, Math.ceil(term / 12));
  const base = term <= 12 ? 3.0 : 3.5;
  const cands = useMemo(() => TEMPLATES[tx].map((c) => ({ ...c, cost: +(base + c.spread + (amount >= 50000 ? -0.1 : 0)).toFixed(2) })), [tx, base, amount]);
  const cand = cands.find((c) => c.key === pick) ?? cands[0];
  const cash = useMemo(() => {
    const r = rng(hashStr(co.id + tx) + amount);
    return cands.map((c) => Array.from({ length: years }, (_, y) => {
      const proj = Math.round(amount * (0.14 + 0.035 * y) * (0.9 + r() * 0.25));
      const repayYears = Math.max(1, years - c.grace);
      const principal = y < c.grace ? 0 : Math.round((amount * (1 - c.balloon)) / repayYears) + (y === years - 1 ? Math.round(amount * c.balloon) : 0);
      const outstanding = amount - Math.max(0, y - c.grace) * ((amount * (1 - c.balloon)) / repayYears);
      const interest = Math.round(outstanding * (c.cost / 100));
      return { y: `第 ${y + 1} 年`, 项目现金流: proj, 还本付息: principal + interest, dscr: +(proj / Math.max(1, principal + interest)).toFixed(2) };
    }));
  }, [cands, years, amount, co.id, tx]);
  const minDscr = (i: number) => Math.min(...cash[i].map((x) => x.dscr));
  const regs = useMemo(() => REG[tx].map((r, i) => {
    let auto: 'ok' | 'chk' = 'ok';
    if (tx === '并购') { if (i === 0 && amount / Math.max(1, price) > 0.6) auto = 'chk'; if (i === 1 && term > 84) auto = 'chk'; if (i === 2 && 1 - amount / Math.max(1, price) < 0.4) auto = 'chk'; if (i === 5) auto = 'chk'; }
    else { const rr = rng(hashStr(tx + r.text)); if (rr() < 0.28) auto = 'chk'; }
    return { ...r, auto };
  }), [tx, amount, price, term]);
  const bestCost = Math.min(...cands.map((c) => c.cost));
  const genDoc = (c: typeof cand) => [
    `${co.name} · ${tx}交易结构说明书（推荐结构 ${c.key}：${c.name}）`, '',
    '一、交易概述', `交易类型：${tx}；金额：${fmtWan(amount)} 万元${tx === '并购' ? `（交易价款 ${fmtWan(price)} 万元，并购贷款占比 ${Math.round((amount / Math.max(1, price)) * 100)}%）` : ''}；期限：${term} 个月；参与方：${parties.join('、')}；担保资源：${guar.join('、')}；交易目标：${goals.join('、')}。`, '',
    '二、推荐结构', `${c.brief}。主要主体：${c.nodes.map((n) => n.label).join('、')}。资金流与增信安排见结构图。`, '',
    '三、现金流匹配', `按项目现金流测算，${years} 年内最低偿债覆盖率（DSCR）${minDscr(cands.indexOf(c)).toFixed(2)}${c.grace ? `，含 ${c.grace} 年宽限期` : ''}${c.balloon ? `，末期一次偿还 ${Math.round(c.balloon * 100)}%` : ''}。综合成本约 ${c.cost.toFixed(2)}%（参考 LPR 加点）。`, '',
    '四、比选结论', `候选结构：${cands.map((x) => `${x.key} ${x.name}（成本 ${x.cost.toFixed(2)}% / 期限匹配 ${x.termFit} 分 / 资本占用${lv(x.capital)} / 监管约束${lvReg(x.regulatory)} / 复杂度${lv(x.complexity)}）`).join('；')}。推荐 ${c.key}：${c.pros}；需关注：${c.cons}。`, '',
    '五、风险与增信', `增信安排：${guar.join('、')}；${c.flows.filter((f) => f.kind === 'credit').map((f) => f.label).join('、')}。建议设置交叉违约、资金监管账户与按季财务报送条款。`, '',
    '六、监管约束核对', regs.map((r) => `${r.auto === 'ok' ? '符合' : '待确认'} · ${r.text}（${r.basis}）`).join('\n'), '',
    '七、后续安排', `提交内部评审（${depts.join('、')}），评审通过后转综合定价测算与合同起草。本说明书含 AI 生成段落，已由客户经理复核。`,
  ].join('\n');
  const ensureTask = () => {
    if (task) return task;
    const exist = tasks.find((t) => t.coId === co.id && t.col < cols.length - 1);
    const t = exist ?? addTask({ title: `${co.name} ${tx}交易结构`, coId: co.id, due: iso(addDays(ctx.today, 7)), priority: 'P1', aiNext: '已生成 3 个候选结构，建议进入比选' });
    setTaskId(t.id); select(t.id); return t;
  };
  const generate = () => { const t = ensureTask(); moveTask(t.id, 1, `录入交易要素：${tx} · ${fmtWan(amount)} 万 · ${term} 个月`); addLog(t.id, `生成 3 个候选结构：${cands.map((c) => `${c.key} ${c.name}`).join('、')}`, 'ai'); toast('已生成 3 个候选结构'); setStep(1); };
  const goCompare = () => { if (task) moveTask(task.id, 2, `选定主方案 ${cand.key} ${cand.name}，进入比选`); setStep(2); };
  const finalize = () => { setDoc(genDoc(cand)); if (task) addLog(task.id, `生成推荐结构说明书：${cand.key} ${cand.name}`, 'ai'); setStep(4); };
  const submit = () => { const t = ensureTask(); moveTask(t.id, 3, `提交内部评审：${depts.join('、')}，评审时间 ${cnDate(when)}`); setSubmitted(true); toast(`已提交内部评审（${depts.join('、')}），OA 待办已生成`); };
  const docHtml = () => `<pre style="font-family:serif;white-space:pre-wrap">${(doc || genDoc(cand)).replace(/</g, '&lt;')}</pre>`;

  if (step === 0) return (
    <>
      <AiCard text={tx === '并购' ? `并购类交易请补充交易价款与自有资金比例：当前并购贷款占比 ${Math.round((amount / Math.max(1, price)) * 100)}%${amount / Math.max(1, price) > 0.6 ? '，超过 60% 上限，生成结构时将提示引入夹层或提高自有资金' : '，符合 60% 上限'}。` : `${tx}交易建议明确参与方分工与担保资源，系统据此生成 3 个候选结构并核对监管约束。`} />
      <div className="af-grid2">
        <Field label="客户" req><select className="af-inp" value={coId} onChange={(e) => setCoId(e.target.value)}>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.industry}</option>)}</select></Field>
        <Field label="交易类型" req><ChipPick options={TX_TYPES} value={tx} onChange={(v) => { setTx(v); setPick('B'); setChecked({}); }} /></Field>
      </div>
      <div className="af-grid3">
        <Field label={tx === '并购' ? '并购贷款金额' : '融资金额'} req><NumInput value={amount} onChange={setAmount} unit="万元" step={500} min={500} /></Field>
        {tx === '并购' ? <Field label="交易价款"><NumInput value={price} onChange={setPrice} unit="万元" step={500} min={500} /></Field> : <Field label="项目总投资"><NumInput value={price} onChange={setPrice} unit="万元" step={500} min={500} /></Field>}
        <Field label="期限" req><NumInput value={term} onChange={setTerm} unit="个月" step={6} min={6} max={180} /></Field>
      </div>
      <Field label="参与方"><ChipMulti options={PARTIES} value={parties} onChange={setParties} tone="blue" /></Field>
      <Field label="担保资源"><ChipMulti options={GUARANTEES} value={guar} onChange={setGuar} tone="orange" /></Field>
      <Field label="交易目标"><ChipMulti options={GOALS} value={goals} onChange={setGoals} /></Field>
      <div className="af-row end"><span className="af-mini">{docs.length ? `已关联 ${docs.length} 份背景材料` : '可在上方上传交易背景材料与意向书'}</span><button className="btn" onClick={generate}><Icons.Workflow size={13} />生成候选结构</button></div>
    </>
  );

  if (step === 1) return (
    <>
      <AiCard text={`基于要素生成 3 个候选结构，差异主要在增信安排与资金流路径。${cands.find((c) => c.cost === bestCost)?.key} 综合成本最低（${bestCost.toFixed(2)}%），${[...cands].sort((a, b) => b.termFit - a.termFit)[0].key} 期限匹配最好。点击选定主方案后进入比选。`} />
      <div className="af-grid3">
        {cands.map((c) => (
          <div key={c.key} className={`af-cand${pick === c.key ? ' on' : ''}`} onClick={() => setPick(c.key)}>
            <div className="h"><span className="k">{c.key}</span><b>{c.name}</b>{pick === c.key && <span className="chip red"><i />主方案</span>}</div>
            <StructureSvg c={c} id={`sv-${tx}-${c.key}`} />
            <div className="p">{c.brief}</div>
            <div className="kv"><span className="chip"><i />成本 {c.cost.toFixed(2)}%</span><span className="chip green"><i />期限匹配 {c.termFit}/5</span><span className="chip blue"><i />资本占用{lv(c.capital)}</span><span className="chip purple"><i />复杂度{lv(c.complexity)}</span></div>
          </div>
        ))}
      </div>
      <div className="af-row end" style={{ marginTop: 10 }}><button className="btn" onClick={goCompare}><Icons.GitCompare size={13} />以 {pick} 为主方案进入比选</button></div>
    </>
  );

  if (step === 2) return (
    <>
      <AiCard text={`结构 ${cand.key}（${cand.name}）${years} 年内最低 DSCR ${minDscr(cands.indexOf(cand)).toFixed(2)}${minDscr(cands.indexOf(cand)) < 1.2 ? '，低于 1.2，建议增加宽限期或延长期限' : '，满足 ≥ 1.2 的偿债覆盖要求'}。${cand.pros}；需关注：${cand.cons}。`} adopted={pick === [...cands].sort((a, b) => (b.termFit - b.capital - b.complexity * 0.5 - b.cost) - (a.termFit - a.capital - a.complexity * 0.5 - a.cost))[0].key} onAdopt={() => { const best = [...cands].sort((a, b) => (b.termFit - b.capital - b.complexity * 0.5 - b.cost) - (a.termFit - a.capital - a.complexity * 0.5 - a.cost))[0]; setPick(best.key); toast(`已采用 AI 比选结论：${best.key} ${best.name}`); }} adoptLabel="采用 AI 比选结论" />
      <Sec>对比矩阵</Sec>
      <div className="af-table-wrap">
        <table className="tbl af-matrix">
          <thead><tr><th>维度</th>{cands.map((c) => <th key={c.key} className={pick === c.key ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => setPick(c.key)}>{c.key} · {c.name}</th>)}</tr></thead>
          <tbody>
            <tr><td>综合成本</td>{cands.map((c) => <td key={c.key} className={pick === c.key ? 'on' : ''}><span className={`sc ${c.cost === bestCost ? 'good' : c.cost - bestCost <= 0.3 ? 'mid' : 'bad'}`}>{c.cost.toFixed(2)}%</span></td>)}</tr>
            <tr><td>期限匹配</td>{cands.map((c) => <td key={c.key} className={pick === c.key ? 'on' : ''}><span className={`sc ${cls(c.termFit, false)}`}><Score v={c.termFit} /></span></td>)}</tr>
            <tr><td>资本占用</td>{cands.map((c) => <td key={c.key} className={pick === c.key ? 'on' : ''}><span className={`sc ${cls(c.capital, true)}`}>{lv(c.capital)}</span></td>)}</tr>
            <tr><td>监管约束</td>{cands.map((c) => <td key={c.key} className={pick === c.key ? 'on' : ''}><span className={`sc ${cls(c.regulatory, true)}`}>{lvReg(c.regulatory)}</span></td>)}</tr>
            <tr><td>复杂度</td>{cands.map((c) => <td key={c.key} className={pick === c.key ? 'on' : ''}><span className={`sc ${cls(c.complexity, true)}`}>{lv(c.complexity)}</span></td>)}</tr>
            <tr><td>最低 DSCR</td>{cands.map((c, i) => <td key={c.key} className={pick === c.key ? 'on' : ''}><span className={`sc ${minDscr(i) >= 1.3 ? 'good' : minDscr(i) >= 1.2 ? 'mid' : 'bad'}`}>{minDscr(i).toFixed(2)}</span></td>)}</tr>
          </tbody>
        </table>
      </div>
      <Sec extra={`结构 ${cand.key} · 万元`}>现金流匹配</Sec>
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cash[cands.indexOf(cand)]} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
            <defs><linearGradient id="dsG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3dbb86" /><stop offset="1" stopColor="#1f8a5a" stopOpacity=".6" /></linearGradient><linearGradient id="dsG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3a93c" /><stop offset="1" stopColor="#c3272b" stopOpacity=".6" /></linearGradient></defs>
            <CartesianGrid stroke="rgba(120,100,60,.12)" vertical={false} />
            <XAxis dataKey="y" tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="af-tip"><b>{label}</b>{payload.map((p) => <div key={String(p.name)}>{p.name}：{Number(p.value).toLocaleString('zh-CN')} 万</div>)}<div>DSCR：{payload[0].payload.dscr}</div></div> : null} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="项目现金流" fill="url(#dsG1)" radius={[5, 5, 0, 0]} /><Bar dataKey="还本付息" fill="url(#dsG2)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="af-row end" style={{ marginTop: 8 }}><button className="btn" onClick={() => { if (task) addLog(task.id, `比选结论：推荐 ${cand.key} ${cand.name}，最低 DSCR ${minDscr(cands.indexOf(cand)).toFixed(2)}`, 'user'); setStep(3); }}><Icons.ShieldCheck size={13} />核对监管约束</button></div>
    </>
  );

  if (step === 3) return (
    <>
      <AiCard tone={regs.some((r) => r.auto === 'chk') ? 'red' : 'green'} text={`${regs.filter((r) => r.auto === 'ok').length} 项自动核对符合，${regs.filter((r) => r.auto === 'chk').length} 项需人工确认${regs.filter((r) => r.auto === 'chk').length ? `（${regs.filter((r) => r.auto === 'chk').map((r) => r.text).join('；')}）` : ''}。全部勾选后生成推荐结构说明书。`} />
      <Sec extra={`${regs.filter((r) => checked[r.text]).length}/${regs.length} 已核对`}>监管约束核对表 · {tx}</Sec>
      <div className="af-reg">{regs.map((r) => <Check key={r.text} on={!!checked[r.text]} label={r.text} sub={`依据：${r.basis}`} onClick={() => setChecked((c) => ({ ...c, [r.text]: !c[r.text] }))} right={<span className={`st ${r.auto}`}>{r.auto === 'ok' ? '自动核对符合' : '需人工确认'}</span>} />)}</div>
      <div className="af-row end"><button className="btn ghost sm" onClick={() => setChecked(Object.fromEntries(regs.map((r) => [r.text, true])))}><Icons.ListChecks size={12} />全部勾选</button><button className="btn" disabled={regs.some((r) => !checked[r.text])} onClick={finalize}><Icons.FileText size={13} />生成推荐结构说明书</button></div>
    </>
  );

  if (step === 4) return (
    <>
      <AiCard text={`推荐结构说明书已生成（${cand.key} ${cand.name}），包含交易概述、结构图、现金流匹配、比选结论、风险与增信、监管核对与后续安排。可编辑后保存版本、导出或转呈。`} />
      <div className="af-doc-h"><b>{co.name} · {tx}交易结构说明书</b><DocActions title={`${co.name}_${tx}交易结构说明书`} editing={editing} onEdit={() => setEditing((v) => !v)} getHtml={docHtml} onToast={toast} compact /></div>
      {editing ? <textarea className="af-inp doc" value={doc || genDoc(cand)} onChange={(e) => setDoc(e.target.value)} /> : <div className="af-doc-v">{doc || genDoc(cand)}</div>}
      <div className="af-grid2" style={{ marginTop: 10 }}><div><Sec tight>结构图（附件一）</Sec><StructureSvg c={cand} id={`doc-${cand.key}`} /></div><div><Sec tight>比选摘要</Sec><div className="af-kv">{cands.map((c) => <div key={c.key} className="row"><span>{c.key} {c.name}</span><span>{c.cost.toFixed(2)}% · 期限匹配 {c.termFit}/5 · DSCR {minDscr(cands.indexOf(c)).toFixed(2)}</span></div>)}</div></div></div>
      <div className="af-row end" style={{ marginTop: 10 }}><button className="btn ghost sm" onClick={() => { setDoc(genDoc(cand)); toast('已按当前要素重新生成说明书'); }}><Icons.RotateCcw size={12} />重新生成</button><button className="btn" onClick={() => setStep(5)}><Icons.Send size={13} />提交内部评审</button></div>
    </>
  );

  return (
    <>
      <AiCard tone="green" text={`提交前请确认：说明书版本、附件（${docs.length} 份背景材料 + 结构图 + 现金流测算）与会签部门。建议评审时间 ${cnDate(when)}，投资银行部与授信审批部联合评审。`} />
      <div className="af-grid2">
        <Field label="评审部门"><ChipMulti options={DEPTS.filter((d) => /投资银行|授信审批|风险管理|法律合规|公司业务/.test(d))} value={depts} onChange={setDepts} tone="red" /></Field>
        <Field label="评审时间"><input className="af-inp" type="date" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
      </div>
      <Sec>提交清单</Sec>
      <div className="af-kv">
        <div className="row"><span>推荐结构</span><span>{cand.key} · {cand.name}</span></div>
        <div className="row"><span>说明书</span><span>{doc ? '已编辑 · v1.1' : '系统生成 · v1.0'}</span></div>
        <div className="row"><span>附件</span><span>{docs.length ? docs.map((d) => d.name).join('、') : '结构图、现金流测算、监管核对表'}</span></div>
        <div className="row"><span>监管核对</span><span>{regs.filter((r) => checked[r.text]).length}/{regs.length} 已核对</span></div>
        <div className="row"><span>经办 / 复核</span><span>{PERSONAS[1].name} / {PERSONAS[2].name}</span></div>
      </div>
      <div className="af-row between" style={{ marginTop: 12 }}>
        <DocActions title={`${co.name}_${tx}交易结构说明书`} getHtml={docHtml} onToast={toast} compact />
        {submitted ? <button className="btn green" onClick={() => { if (task) moveTask(task.id, cols.length - 1, '评审通过，结构定稿'); toast('评审通过，结构已定稿并同步至授信方案'); }}><Icons.CheckCheck size={13} />评审通过并定稿</button> : <button className="btn" disabled={!depts.length} onClick={submit}><Icons.Send size={13} />提交内部评审</button>}
      </div>
      {submitted && <div className="af-check on" style={{ marginTop: 10, cursor: 'default' }}><span className="bx"><Icons.Check size={11} /></span><div className="bd"><b>已提交 {depts.join('、')} 评审</b><span>评审时间 {cnDate(when)} · OA 待办已生成 · 事项已流转至「{cols[3]}」</span></div></div>}
      {!task && <Empty icon="Info" title="尚未绑定看板事项" sub="提交评审时将自动创建事项并流转" />}
    </>
  );
}

export const DealStructureModule: ActionModule = { Component: DealStructure, wide: (s) => s >= 1 };
