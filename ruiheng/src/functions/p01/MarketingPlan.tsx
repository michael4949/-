import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AiConclusion from '../../components/AiConclusion';
import DocActions from '../../components/DocActions';
import ProposalDoc, { type ProposalDocHandle, type ProposalSections } from '../../components/ProposalDoc';
import { PERSONAS } from '../../data/personas';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Legend,
} from 'recharts';
import {
  Megaphone, Sparkles, Check, RotateCcw, Users, Building2, Download, Save, FileCheck2, ShieldCheck, History, FileText,
  Gauge, BarChart3, ClipboardCheck, ArrowRight, Phone, MapPin, MessageCircle, Mail, Presentation, Lightbulb,
} from 'lucide-react';
import { COMPANIES } from '../../data/companies';
import { rng } from '../../lib/rng';

/* ============================================================ 样式（页面私有，前缀 mp-） */
const CSS = `
.mp-crumb { font-size: 12.5px; color: var(--ink-3); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.mp-crumb a { color: var(--gold-3); font-weight: 700; } .mp-crumb b { color: var(--ink); }
.mp-layout { display: grid; grid-template-columns: 350px minmax(0,1fr); gap: 16px; align-items: start; }
@media (max-width: 1100px) { .mp-layout { grid-template-columns: 1fr; } }
.mp-left { display: flex; flex-direction: column; gap: 14px; }
.mp-stepn { width: 24px; height: 24px; border-radius: 8px; background: var(--g-iris); color: #fff; font-weight: 900; font-size: 12px; display: grid; place-items: center; flex-shrink: 0; }
.mp-stepn.ok { background: var(--g-green); }
.mp-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px var(--line); gap: 2px; }
.mp-seg button { border: 0; background: linear-gradient(135deg, rgba(255,255,255,.6), rgba(255,255,255,.2)); color: var(--ink-2); font: inherit; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 8px; cursor: pointer; }
.mp-seg button.on { background: var(--g-red); color: #fff; box-shadow: 0 6px 14px rgba(195,39,43,.22); }
.mp-coh { padding: 10px 12px; border-radius: 12px; cursor: pointer; margin-bottom: 7px; background: linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,247,236,.7) 60%, rgba(236,248,243,.65)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); transition: box-shadow .12s ease, transform .12s ease; }
.mp-coh:hover { transform: translateX(2px); box-shadow: inset 0 0 0 1px rgba(201,162,77,.45); }
.mp-coh.on { background: var(--g-gold-soft); box-shadow: inset 0 0 0 2px rgba(195,39,43,.5); }
.mp-coh .t { font-weight: 800; font-size: 12.5px; display: flex; justify-content: space-between; gap: 6px; align-items: center; }
.mp-coh .t b { font-size: 12px; color: var(--red-3); white-space: nowrap; }
.mp-coh .s { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }
.mp-sel { width: 100%; padding: 9px 11px; border-radius: 10px; border: 0; outline: none; font: inherit; font-size: 12.5px; color: var(--ink); background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); }
.mp-scn { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; }
.mp-sc { padding: 9px 10px; border-radius: 11px; cursor: pointer; font-size: 12px; background: linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,247,236,.7) 60%, rgba(236,248,243,.65)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); }
.mp-sc b { display: block; font-size: 12.5px; margin-bottom: 2px; }
.mp-sc span { color: var(--ink-3); font-size: 11px; }
.mp-sc.on { background: var(--g-red-soft); box-shadow: inset 0 0 0 2px rgba(195,39,43,.5); }
.mp-sc.rec { box-shadow: inset 0 0 0 1px rgba(31,138,90,.45); }
.mp-prods { display: flex; flex-wrap: wrap; gap: 6px; }
.mp-prod { border: 0; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; padding: 6px 10px; border-radius: 10px; color: var(--ink-2); display: inline-flex; align-items: center; gap: 5px; background: linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,247,236,.7)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.22); }
.mp-prod.on { background: var(--g-red); color: #fff; box-shadow: 0 6px 14px rgba(195,39,43,.22); }
.mp-prod .role { font-size: 10px; padding: 0 5px; border-radius: 999px; background: rgba(255,255,255,.35); font-weight: 800; }
.mp-prod:not(.on) .role { background: var(--g-green-soft); color: var(--green-3); }
.mp-lbl { font-size: 11.5px; font-weight: 800; letter-spacing: .12em; color: var(--gold-3); margin: 12px 0 6px; display: flex; align-items: center; justify-content: space-between; }
.mp-lbl:first-of-type { margin-top: 0; }
.mp-lbl small { font-weight: 700; letter-spacing: 0; color: var(--ink-3); }
.mp-ch { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
.mp-chb { border: 0; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; padding: 7px 9px; border-radius: 10px; color: var(--ink-2); display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,247,236,.7)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.22); text-align: left; }
.mp-chb.on { background: linear-gradient(135deg,#7fb0ff,#3a86ff); color: #fff; box-shadow: 0 6px 14px rgba(58,134,255,.22); }
.mp-opts { display: flex; flex-wrap: wrap; gap: 5px; }
.mp-opt { border: 0; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; color: var(--ink-2); background: linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,247,236,.7)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.22); }
.mp-opt.on { background: var(--g-green); color: #fff; box-shadow: 0 6px 14px rgba(31,138,90,.22); }
.mp-inp { width: 100%; padding: 8px 11px; border-radius: 10px; border: 0; outline: none; font: inherit; font-size: 12.5px; color: var(--ink); background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); }
.mp-tabs { display: flex; gap: 4px; padding: 3px; border-radius: 12px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px var(--line); }
.mp-tabs button { flex: 1; border: 0; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 800; padding: 8px 12px; border-radius: 9px; color: var(--ink-2); background: linear-gradient(135deg, rgba(255,255,255,.6), rgba(255,255,255,.2)); display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.mp-tabs button.on { background: var(--g-red); color: #fff; box-shadow: 0 6px 14px rgba(195,39,43,.22); }
.mp-empty { min-height: 260px; display: grid; place-items: center; text-align: center; color: var(--ink-3); font-size: 13px; }
.mp-empty .ring { width: 56px; height: 56px; border-radius: 50%; background: var(--g-iris-soft); display: grid; place-items: center; margin: 0 auto 10px; box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); color: var(--red); }
.mp-sec { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 800; letter-spacing: .12em; color: var(--gold-3); margin: 14px 0 8px; }
.mp-sec::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(201,162,77,.45), rgba(61,187,134,.25), rgba(255,255,255,0)); }
.mp-hero { border-radius: 14px; padding: 16px 18px; background: linear-gradient(120deg, rgba(195,39,43,.12), rgba(227,169,60,.16) 35%, rgba(239,212,138,.22) 55%, rgba(61,187,134,.16) 80%, rgba(31,107,72,.12)); }
.mp-hero h3 { font-size: 17px; font-weight: 900; margin-bottom: 4px; }
.mp-hero p { font-size: 12.5px; color: var(--ink-2); }
.mp-pc { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
@media (max-width: 900px) { .mp-pc { grid-template-columns: 1fr; } }
.mp-pc .p { padding: 10px 12px; border-radius: 12px; font-size: 12px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); }
.mp-pc .p.main { background: var(--g-red-soft); } .mp-pc .p.pair { background: var(--g-gold-soft); } .mp-pc .p.dep { background: var(--g-green-soft); }
.mp-pc .p b { display: block; font-size: 13px; } .mp-pc .p .r { font-size: 10.5px; font-weight: 800; color: var(--ink-3); letter-spacing: .1em; }
.mp-svgwrap { border-radius: 12px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.18); padding: 8px; overflow-x: auto; }
.mp-svgwrap svg { width: 100%; height: auto; display: block; min-width: 520px; }
.mp-talk { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 10px; background: var(--g-blue-soft); font-size: 12px; margin-bottom: 6px; }
.mp-talk .n { width: 20px; height: 20px; border-radius: 6px; background: linear-gradient(135deg,#7fb0ff,#3a86ff); color: #fff; font-weight: 900; font-size: 11px; display: grid; place-items: center; flex-shrink: 0; }
.mp-tiles { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
@media (max-width: 900px) { .mp-tiles { grid-template-columns: repeat(2, minmax(0,1fr)); } }
.mp-tiles .tile b small { font-size: 12px; color: var(--ink-3); margin-left: 3px; font-weight: 700; }
.mp-tiles .tile.gold::before { background: var(--g-gold); } .mp-tiles .tile.green::before { background: var(--g-green); } .mp-tiles .tile.red::before { background: var(--g-red); }
.mp-params { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px 14px; }
.mp-pr { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.mp-pr span { width: 96px; color: var(--ink-3); font-weight: 700; flex-shrink: 0; }
.mp-pr input[type=range] { flex: 1; accent-color: #c3272b; min-width: 0; }
.mp-pr input[type=number] { width: 64px; padding: 4px 6px; border-radius: 7px; border: 0; font: inherit; font-size: 12px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); outline: none; text-align: right; }
.mp-gauges { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
.mp-g { text-align: center; padding: 8px 6px 4px; border-radius: 12px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); }
.mp-g svg { width: 100%; max-width: 150px; height: auto; display: block; margin: 0 auto; }
.mp-g b { display: block; font-size: 12px; margin-top: -4px; } .mp-g span { font-size: 11px; color: var(--ink-3); }
.mp-eff { display: grid; grid-template-columns: 1.1fr 1fr; gap: 14px; }
@media (max-width: 1100px) { .mp-eff { grid-template-columns: 1fr; } }
.mp-tip { padding: 8px 11px; border-radius: 10px; background: var(--g-holo); box-shadow: var(--shadow), inset 0 0 0 1px rgba(201,162,77,.3); font-size: 12px; }
.mp-tip b { display: block; }
.mp-tip .r { display: flex; justify-content: space-between; gap: 12px; }
.mp-camp { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 11px; cursor: pointer; margin-bottom: 6px; background: linear-gradient(90deg, rgba(255,255,255,.75), rgba(255,247,236,.6) 60%, rgba(236,248,243,.55)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); font-size: 12px; }
.mp-camp.on { background: var(--g-gold-soft); box-shadow: inset 0 0 0 2px rgba(195,39,43,.45); }
.mp-camp b { font-size: 12.5px; display: block; } .mp-camp span { color: var(--ink-3); }
.mp-camp .roi { margin-left: auto; text-align: right; flex-shrink: 0; } .mp-camp .roi b { font-size: 15px; color: var(--green-3); }
.mp-cmp { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; }
@media (max-width: 1100px) { .mp-cmp { grid-template-columns: 1fr; } }
.mp-react { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 10px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.14); margin-bottom: 5px; font-size: 12px; }
.mp-react .nm { flex: 1; font-weight: 700; }
.mp-react .ch { color: var(--ink-3); font-size: 11px; }
.mp-sug { display: flex; gap: 10px; align-items: flex-start; padding: 9px 11px; border-radius: 11px; background: var(--g-gold-soft); box-shadow: inset 0 0 0 1px rgba(201,162,77,.2); margin-bottom: 7px; font-size: 12.5px; }
.mp-sug .n { width: 22px; height: 22px; border-radius: 7px; background: var(--g-iris); color: #fff; display: grid; place-items: center; font-weight: 900; font-size: 11px; flex-shrink: 0; }
.mp-sug p { color: var(--ink-2); font-size: 12px; margin-top: 2px; }
.mp-hist { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px 12px; }
@media (max-width: 900px) { .mp-hist { grid-template-columns: 1fr; } }
.mp-hist .h { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px; background: linear-gradient(90deg, rgba(255,255,255,.7), rgba(255,247,236,.55) 60%, rgba(236,248,243,.5)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.14); font-size: 12px; cursor: pointer; }
.mp-hist .h:hover { box-shadow: inset 0 0 0 1px rgba(201,162,77,.45); }
.mp-hist .h .d { font-weight: 800; color: var(--ink-3); width: 44px; flex-shrink: 0; font-size: 11.5px; }
.mp-hist .h .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }
.mp-note { font-size: 11.5px; color: var(--ink-3); display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.mp-toast { position: fixed; left: 50%; bottom: 46px; transform: translateX(-50%); z-index: 60; padding: 10px 18px; border-radius: 999px; background: var(--g-green); color: #fff; font-weight: 700; font-size: 13px; box-shadow: 0 12px 30px rgba(31,138,90,.3); display: inline-flex; align-items: center; gap: 8px; }
.mp-kv .row span:first-child { color: var(--ink-3); }
.mp-budget td:last-child, .mp-budget th:last-child { text-align: right; }
.mp-dockbar { position: sticky; top: 64px; z-index: 15; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 8px 12px; border-radius: 12px; background: var(--g-holo); box-shadow: var(--shadow-sm), inset 0 0 0 1px rgba(201,162,77,.28); }
.mp-dockbar .lab { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: var(--gold-3); letter-spacing: .06em; }
@media print { .mp-left, .mp-crumb, .page-h, .mp-dockbar, .aic, .mp-toast, .mp-noprint { display: none !important; } .mp-layout { display: block; } }
`;

/* ============================================================ 数据 */
type ScnKey = 'first' | 'deposit' | 'renew' | 'fx' | 'tech' | 'sub';
interface Scenario { k: ScnKey; t: string; s: string; goal: string }
const SCENARIOS: Scenario[] = [
  { k: 'first', t: '定点 / 中标订单落地 → 首贷', s: '备货与设备投入形成资金缺口', goal: '新增授信' },
  { k: 'deposit', t: '结算量上升 → 存款沉淀', s: '收单 + 代发形成结算闭环', goal: '新增存款 / 结算' },
  { k: 'renew', t: '授信到期 → 续贷 + 交叉', s: '无缝续贷并叠加供应链产品', goal: '续贷 / 交叉销售' },
  { k: 'fx', t: '出口收汇 → 结汇避险', s: '锁定汇率成本，配套出口融资', goal: '结汇量 / 中间业务' },
  { k: 'tech', t: '专精特新 → 科创信用', s: '信用方式解决研发投入', goal: '新增授信' },
  { k: 'sub', t: '新设子公司 → 开户与集团结算', s: '以开户切入，做集团现金管理', goal: '新增开户 / 结算' },
];
type Role = '主打' | '搭配' | '沉淀';
const PRODUCTS = ['流动资金贷款', '供应链票据贴现', '代发工资', '远期结汇', '出口押汇', '结算套餐', '收单聚合支付', '固定资产贷款', '供应链保理', '科创信用贷', '知识产权质押', '票据池', '基本户开立', '集团现金管理', '续贷'];
const REC: Record<ScnKey, { p: string; r: Role }[]> = {
  first: [{ p: '流动资金贷款', r: '主打' }, { p: '供应链票据贴现', r: '搭配' }, { p: '代发工资', r: '沉淀' }],
  deposit: [{ p: '结算套餐', r: '主打' }, { p: '收单聚合支付', r: '搭配' }, { p: '代发工资', r: '沉淀' }],
  renew: [{ p: '续贷', r: '主打' }, { p: '供应链保理', r: '搭配' }, { p: '代发工资', r: '沉淀' }],
  fx: [{ p: '远期结汇', r: '主打' }, { p: '出口押汇', r: '搭配' }, { p: '结算套餐', r: '沉淀' }],
  tech: [{ p: '科创信用贷', r: '主打' }, { p: '知识产权质押', r: '搭配' }, { p: '代发工资', r: '沉淀' }],
  sub: [{ p: '基本户开立', r: '主打' }, { p: '集团现金管理', r: '搭配' }, { p: '代发工资', r: '沉淀' }],
};
interface Cohort { id: string; name: string; n: number; s: string; scn: ScnKey; tags: string[]; resp: number; appt: number; land: number; loan: number; dep: number; cost: number }
const COHORTS: Cohort[] = [
  { id: 'coh1', name: '新能源供应链定点企业首贷', n: 37, s: '有结算无授信 · 近一年定点 / 中标公告', scn: 'first', tags: ['精密制造', '汽车零部件', '高新区 / 经开区'], resp: 75, appt: 80, land: 41, loan: 2333, dep: 533, cost: 38 },
  { id: 'coh2', name: '结算量上升的连锁与零售', n: 18, s: '近 3 个月结算量环比 ≥ 20%', scn: 'deposit', tags: ['连锁餐饮', '商贸流通', '城南区'], resp: 70, appt: 75, land: 50, loan: 0, dep: 350, cost: 12 },
  { id: 'coh3', name: '授信 90 天内到期客户', n: 12, s: '存量贷款客户 · 续贷窗口', scn: 'renew', tags: ['医药流通', '物流仓储', '全市'], resp: 90, appt: 85, land: 75, loan: 1800, dep: 400, cost: 8 },
  { id: 'coh4', name: '出口收汇企业结汇避险', n: 15, s: '出口收汇占比 ≥ 20% · 美元结算', scn: 'fx', tags: ['跨境电商', '轻工制造', '保税区'], resp: 60, appt: 70, land: 40, loan: 500, dep: 300, cost: 10 },
  { id: 'coh5', name: '专精特新首贷', n: 21, s: '专精特新名录 · 无授信', scn: 'tech', tags: ['软件服务', '生物医药', '高新区 / 东湖区'], resp: 65, appt: 70, land: 38, loan: 600, dep: 200, cost: 15 },
];
const SINGLES = [
  ...COMPANIES.filter((c) => c.risk !== 'red').map((c) => ({ id: c.id, name: c.name, industry: c.industry, exporter: c.id === 'c05' || c.id === 'ninggui', event: c.id === 'ninggui' ? 'first' : c.id === 'c05' ? 'fx' : c.id === 'c06' ? 'renew' : c.id === 'c09' ? 'deposit' : c.id === 'c08' ? 'tech' : c.id === 'shenghe' ? 'sub' : 'first' as ScnKey })),
  { id: 'x04', name: '岭南精工模具', industry: '精密制造', exporter: false, event: 'first' as ScnKey },
  { id: 'x01', name: '澜科汽车零部件', industry: '汽车零部件', exporter: true, event: 'first' as ScnKey },
  { id: 'x10', name: '蓝湾生物医药', industry: '生物医药', exporter: false, event: 'tech' as ScnKey },
];
interface Channel { k: string; t: string; icon: React.ReactNode; share: number; cadence: (w: number, total: number, freq: number) => boolean }
const CHANNELS: Channel[] = [
  { k: 'visit', t: '客户经理上门', icon: <MapPin size={13} />, share: 30, cadence: (w, total, f) => w >= 2 && w < total && (f >= 2 ? true : w % 2 === 0) },
  { k: 'call', t: '电话', icon: <Phone size={13} />, share: 5, cadence: (w, _t, f) => (f >= 2 ? true : w % 2 === 1) },
  { k: 'wechat', t: '企业微信', icon: <MessageCircle size={13} />, share: 5, cadence: () => true },
  { k: 'msg', t: '短信 / 邮件', icon: <Mail size={13} />, share: 5, cadence: (w, total) => w === 1 || w === Math.ceil(total / 2) },
  { k: 'salon', t: '行内沙龙', icon: <Users size={13} />, share: 35, cadence: (w) => w === 4 },
  { k: 'brief', t: '产品说明会', icon: <Presentation size={13} />, share: 20, cadence: (w, total) => w === 2 || w === total - 1 },
];
const FREQS = [{ k: 1, t: '每周 1 次' }, { k: 2, t: '每周 2 次' }, { k: 0.5, t: '双周 1 次' }];
const TIMES = ['工作日上午', '工作日下午', '月初', '月末'];
const CYCLES = [4, 6, 8, 12];
const TALKS: Record<ScnKey, string[]> = {
  first: ['首次接触先讲审批时效与资金到位节奏，不先谈利率。', '以供应链票据贴现价格作为首触卖点，配合流贷解决备货缺口。', '代发工资作为结算沉淀的自然延伸，在方案落地后提出。', '不评价同业，只谈本行能为客户做什么。'],
  deposit: ['从门店对账与发薪的工作量切入，讲一体化结算带来的省事。', '收单费率与到账时效一起谈，用综合方案替代单点比价。', '代发工资强调员工端便利，为存款沉淀打基础。'],
  renew: ['续贷提前 60 天启动，承诺无缝衔接，避免客户临时转他行。', '应收账款保理作为续贷补充，解决账期拉长的现金流压力。', '结算集中度提升可换取综合定价空间，明确说清条件。'],
  fx: ['先算汇率波动对利润的影响，再讲远期结汇锁定成本。', '出口押汇解决收汇账期内的资金占用，与结汇打包。', '价格以当日报价为准，不承诺具体价格。'],
  tech: ['信用方式解决研发投入，强调审批看研发能力与订单而非抵押。', '知识产权质押作为增额路径，配合政府贴息政策说明。', '代发工资在放款后提出，形成结算与存款沉淀。'],
  sub: ['以开户便利与线上服务切入，先建立往来。', '集团现金管理解决母子公司资金归集与可视化。', '代发与结算套餐作为后续沉淀动作。'],
};
interface Camp { id: string; name: string; period: string; scn: ScnKey; pred: number[]; act: number[]; react: { co: string; ch: string; r: '已落地' | '已预约' | '愿意接洽' | '无回应' }[]; sug: { t: string; p: string }[]; why: string[] }
const METRICS = ['触达', '响应', '预约拜访', '落地'];
const CAMPS: Camp[] = [
  { id: 'cp1', name: '结算量上升的连锁与零售 · 收单 + 代发', period: '2026-07-01 至 08-15', scn: 'deposit', pred: [18, 13, 10, 5, 92, 12], act: [18, 14, 11, 6, 108, 13.5],
    react: [{ co: '嘉禾连锁餐饮', ch: '上门', r: '已落地' }, { co: '悦禾生鲜连锁', ch: '上门', r: '已预约' }, { co: '青原农业科技', ch: '电话', r: '愿意接洽' }, { co: '盛世酒店管理', ch: '短信', r: '无回应' }, { co: '川野户外用品', ch: '企业微信', r: '愿意接洽' }],
    sug: [{ t: '收单费率报价前置到首触', p: '6 户落地中有 4 户在首访即拿到费率报价，比预测转化提高 9 个百分点。' }, { t: '短信触达无效，改用企业微信', p: '短信渠道 0 回应，企业微信回应率 40%。' }],
    why: ['实际响应 14 户高于预测 13 户：新开门店的对账痛点比预期更强。', '成本高出 1.5 万：沙龙场地临时升级。', 'ROI 8.0，高于预测 7.7。'] },
  { id: 'cp2', name: '授信到期客户 · 续贷 + 供应链保理', period: '2026-06-01 至 07-15', scn: 'renew', pred: [12, 11, 9, 7, 310, 8], act: [12, 11, 10, 6, 265, 9],
    react: [{ co: '汇源物流', ch: '上门', r: '已落地' }, { co: '华驰智能装备', ch: '上门', r: '已落地' }, { co: '衡瑞医药流通', ch: '上门', r: '已预约' }, { co: '恒益商业地产', ch: '电话', r: '无回应' }, { co: '北岭铝材', ch: '上门', r: '愿意接洽' }],
    sug: [{ t: '续贷启动提前到 90 天', p: '1 户因审批时间不足转他行，续贷启动时间需再提前。' }, { t: '保理搭配率不足', p: '6 户落地仅 2 户叠加保理，话术需从账期痛点切入。' }],
    why: ['落地 6 户低于预测 7 户：1 户因行业下行转入贷后关注，暂缓续作。', '收益 265 万低于预测：保理搭配率低于假设。', 'ROI 29.4，仍显著高于其他客群。'] },
  { id: 'cp3', name: '出口收汇企业 · 结汇避险', period: '2026-05-06 至 06-30', scn: 'fx', pred: [15, 9, 6, 3, 45, 10], act: [15, 10, 7, 4, 58, 9.5],
    react: [{ co: '锦程国际货运', ch: '说明会', r: '已落地' }, { co: '澜科汽车零部件', ch: '上门', r: '已落地' }, { co: '桂澜跨境电商', ch: '上门', r: '愿意接洽' }, { co: '川野户外用品', ch: '说明会', r: '已预约' }, { co: '泰和纺织', ch: '电话', r: '无回应' }],
    sug: [{ t: '产品说明会效果好，可复制', p: '说明会到场 9 户，2 户当场预约，是本次转化的主要来源。' }, { t: '汇率波动期是最佳触达窗口', p: '5 月中旬汇率波动加大后响应率明显上升，后续活动可对齐市场窗口。' }],
    why: ['实际响应 10 户高于预测：汇率波动放大了避险需求。', '收益 58 万高于预测：结汇量高于假设。', 'ROI 6.1，高于预测 4.5。'] },
];
const HISTORY = [
  { d: '09-05', t: '新能源供应链定点企业首贷 · 方案 v2', s: '待复核' },
  { d: '09-02', t: '结算量上升的连锁与零售 · 回评报告', s: '已归档' },
  { d: '08-28', t: '专精特新首贷 · 沙龙方案', s: '执行中' },
  { d: '08-21', t: '出口收汇企业结汇避险 · 回评报告', s: '已归档' },
  { d: '08-14', t: '授信 90 天内到期客户 · 续贷方案', s: '执行中' },
  { d: '08-07', t: '宁桂精密机械 · 单户首贷方案', s: '已复核' },
];
const GEN_STEPS = [
  { t: '营销场景匹配', p: '按客群标签与经营事件匹配场景规则（如「定点订单落地 → 流贷 + 票据」），读取 CRM 客群标签与历史活动数据（只读）。' },
  { t: '产品组合推荐', p: '按场景确定主打 / 搭配 / 沉淀三层产品，读取产品目录与定价参数，校验合规口径。' },
  { t: '触达节奏生成', p: '按渠道、频次、时间偏好与周期编排触达节奏，遵守客户联系偏好与行内营销合规要求。' },
  { t: '效果测算与 ROI', p: '按历史转化率、客单贡献与成本确定性计算触达、响应、转化、收益与 ROI，参数可调实时重算。' },
];
/* 正式方案书：需求分析（按场景）与产品要素（按产品） */
const NEEDS: Record<ScnKey, { t: string; p: string }[]> = {
  first: [
    { t: '核心资金需求', p: '定点 / 中标订单落地后，模具设备投入与首批备货形成阶段性资金缺口，需要在 SOP 前到位、与订单排产周期匹配的流动资金安排。' },
    { t: '结算与沉淀需求', p: '订单回款与向上游付款将形成稳定的结算流，需配套供应链票据与代发工资，使结算路径与资金沉淀落在本行。' },
    { t: '服务与效率需求', p: '客户为首次融资，最关注审批时效与资金到位节奏；需明确材料清单与审批时限，减少往返。' },
  ],
  deposit: [
    { t: '核心资金需求', p: '门店 / 渠道收款分散、对账工作量大，结算量近 3 个月环比明显上升，需要一体化收单与结算安排，把回款归集到本行。' },
    { t: '结算与沉淀需求', p: '收单资金到账后形成日均沉淀，配套代发工资与结算套餐可进一步提高本行结算份额。' },
    { t: '服务与效率需求', p: '客户关注到账时效、费率透明与对账便利，需以综合方案替代单点比价。' },
  ],
  renew: [
    { t: '核心资金需求', p: '授信 90 天内到期，客户需要无缝续作以避免临时资金缺口；应收账期拉长带来的周转压力可由应收账款保理补充。' },
    { t: '结算与沉淀需求', p: '续贷同时提升结算集中度，以结算贡献换取综合定价空间，并叠加代发形成沉淀。' },
    { t: '服务与效率需求', p: '客户最关注续贷时效与条件稳定，需提前 60 天启动并一次性明确材料清单。' },
  ],
  fx: [
    { t: '核心资金需求', p: '出口收汇账期 60–90 天，发货后至收汇前存在资金占用，需要出口押汇解决账期内周转。' },
    { t: '避险与结算需求', p: '美元结算占比高，汇率波动直接影响利润，需以远期结汇分批锁定成本，并将收汇路径迁至本行。' },
    { t: '服务与效率需求', p: '客户关注结汇价格与融资额度联动、单据处理效率与外汇政策辅导。' },
  ],
  tech: [
    { t: '核心资金需求', p: '研发投入大、抵押物不足，需要以信用方式解决研发与订单资金，审批依据为研发能力与订单而非抵押。' },
    { t: '结算与沉淀需求', p: '放款后配套代发工资与结算，形成存款沉淀；知识产权质押作为后续增额路径。' },
    { t: '服务与效率需求', p: '客户关注审批口径与政府贴息政策的对接，需一并给出申报辅导。' },
  ],
  sub: [
    { t: '核心资金需求', p: '新设子公司注册资本实缴与开户为首要事项，初期运营资金可由母公司担保或信用方式解决。' },
    { t: '结算与沉淀需求', p: '母子公司资金往来频繁，需以集团现金管理实现归集与可视化，减少来回划转。' },
    { t: '服务与效率需求', p: '客户关注开户时效与线上服务，代发与结算套餐作为后续沉淀动作。' },
  ],
};
const PRODUCT_META: Record<string, { amount: string; term: string; pricing: string; access: string; dept: string }> = {
  流动资金贷款: { amount: '单户 500–3,000 万元', term: '1 年（可循环）', pricing: 'LPR(1Y) + 30–80BP', access: '定点通知 / 中标合同、近 12 个月流水、无重大涉诉', dept: '支行公司业务 · 授信审批部' },
  供应链票据贴现: { amount: '按票面，单户 ≤ 2,000 万元', term: '≤ 6 个月', pricing: '贴现率按当日报价', access: '核心企业为白名单客户，贸易背景真实', dept: '支行公司业务 · 票据中心' },
  代发工资: { amount: '按员工人数', term: '持续', pricing: '免收手续费', access: '开立基本户或一般户', dept: '支行 · 运营管理部' },
  远期结汇: { amount: '名义金额 ≤ 年收汇 60%', term: '3–12 个月', pricing: '按当日远期报价', access: '出口收汇真实，外汇账户在行', dept: '国际业务部' },
  出口押汇: { amount: '单笔 ≤ 发票金额 90%', term: '≤ 90 天', pricing: 'LPR(1Y) + 50–100BP', access: '出口单据齐全，买方信用可查', dept: '国际业务部 · 授信审批部' },
  结算套餐: { amount: '按结算量', term: '1 年', pricing: '结算费率按套餐价目', access: '基本户或一般户开立', dept: '支行 · 运营管理部' },
  收单聚合支付: { amount: '按门店数', term: '持续', pricing: '收单费率按行内价目', access: '经营场所真实，营业执照有效', dept: '支行 · 产品创新部' },
  固定资产贷款: { amount: '≤ 项目总投 70%', term: '3–5 年', pricing: 'LPR(5Y) + 20–60BP', access: '项目立项 / 设备合同，自筹资金到位', dept: '支行公司业务 · 授信审批部' },
  供应链保理: { amount: '≤ 应收账款 80%', term: '≤ 1 年', pricing: 'LPR(1Y) + 40–90BP', access: '买方为核心企业或政府平台，应收账款确权', dept: '支行公司业务 · 产品创新部' },
  科创信用贷: { amount: '单户 ≤ 1,000 万元', term: '1–3 年', pricing: 'LPR(1Y) + 30–60BP（可对接贴息）', access: '专精特新 / 高新认定，研发投入占比达标', dept: '支行公司业务 · 授信审批部' },
  知识产权质押: { amount: '≤ 评估值 50%', term: '1–3 年', pricing: 'LPR(1Y) + 40–80BP', access: '专利权属清晰，评估机构在册', dept: '支行公司业务 · 授信审批部' },
  票据池: { amount: '按入池票据面额', term: '1 年', pricing: '质押率与费率按行内价目', access: '票据真实，背书连续', dept: '票据中心' },
  基本户开立: { amount: '—', term: '即时', pricing: '免收账户管理费', access: '营业执照、法定代表人身份核验', dept: '支行 · 运营管理部' },
  集团现金管理: { amount: '按成员单位数', term: '1 年（自动续期）', pricing: '按现金管理服务协议', access: '母子公司账户在行，授权书齐全', dept: '产品创新部 · 运营管理部' },
  续贷: { amount: '不高于原授信额度', term: '1 年', pricing: '不高于原合同定价', access: '到期前 60 天启动，贷后检查无异常', dept: '支行公司业务 · 授信审批部' },
};
const ME = PERSONAS[1];
const ME_ORG = ME.org.replace(/\s*·\s*/, ' · ');
const DATE_STR = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmtW = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(2)} 亿` : `${Math.round(n).toLocaleString('zh-CN')} 万`);
const PAL = ['#e63946', '#f4b942', '#2dc48d', '#3a86ff', '#9b5de5', '#ff8c42', '#00b4d8', '#ff5da2'];
const PAL2 = ['#8e1b1b', '#c9a24d', '#1f8a5a', '#1d4ed8', '#6d28d9', '#d9781b', '#0077b6', '#c2185b'];

function useSteps(total: number, running: boolean, token: number, gap = 780) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!running) return;
    const timers: number[] = [];
    for (let i = 1; i <= total + 1; i++) timers.push(window.setTimeout(() => setN(i), gap * i));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [running, token, total, gap]);
  return n;
}
type TipItem = { name?: string | number; value?: number | string | ReadonlyArray<number | string>; payload?: unknown; color?: string };
function Tip({ active, payload, label, unit }: { active?: boolean; payload?: ReadonlyArray<TipItem>; label?: unknown; unit?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="mp-tip"><b>{String(label ?? '')}</b>{payload.map((p, i) => <div key={i} className="r"><span>{String(p.name ?? '')}</span><b style={{ display: 'inline' }}>{String(p.value)}{unit}</b></div>)}</div>;
}
function GaugeSvg({ v, max, label, sub, id, fmt }: { v: number; max: number; label: string; sub: string; id: string; fmt: (v: number) => string }) {
  const r = 52, cx = 70, cy = 66;
  const pct = clamp(v / max, 0, 1);
  const a0 = Math.PI, a1 = Math.PI + Math.PI * pct;
  const arc = (a: number, b: number) => { const x0 = cx + r * Math.cos(a), y0 = cy + r * Math.sin(a), x1 = cx + r * Math.cos(b), y1 = cy + r * Math.sin(b); return `M${x0},${y0} A${r},${r} 0 ${b - a > Math.PI ? 1 : 0} 1 ${x1},${y1}`; };
  return (
    <div className="mp-g">
      <svg viewBox="0 0 140 84">
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3272b" /><stop offset=".5" stopColor="#e3a93c" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient></defs>
        <path d={arc(a0, 2 * Math.PI)} fill="none" stroke="rgba(201,162,77,.18)" strokeWidth="11" strokeLinecap="round" />
        {pct > 0.005 && <path d={arc(a0, a1)} fill="none" stroke={`url(#${id})`} strokeWidth="11" strokeLinecap="round" />}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="19" fontWeight="900" fill="#1e1b16">{fmt(v)}</text>
      </svg>
      <b>{label}</b><span>{sub}</span>
    </div>
  );
}

/* ============================================================ 页面 */
export default function MarketingPlan() {
  const [mode, setMode] = useState<'cohort' | 'single'>('cohort');
  const [cohId, setCohId] = useState('coh1');
  const [singleId, setSingleId] = useState('ninggui');
  const [scn, setScn] = useState<ScnKey>('first');
  const [prods, setProds] = useState<string[]>(REC.first.map((x) => x.p));
  const [chans, setChans] = useState<string[]>(['visit', 'call', 'wechat', 'salon']);
  const [freq, setFreq] = useState(1);
  const [time, setTime] = useState('工作日上午');
  const [cycle, setCycle] = useState(8);
  const [budget, setBudget] = useState(38);
  const [run, setRun] = useState(0);
  const [tab, setTab] = useState<'eff' | 'retro'>('eff');
  const [editing, setEditing] = useState(false);
  const docRef = useRef<ProposalDocHandle>(null);
  const [campId, setCampId] = useState('cp1');
  const [toast, setToast] = useState<string | null>(null);
  // 效果预测参数
  const [pReach, setPReach] = useState(37);
  const [pResp, setPResp] = useState(75);
  const [pAppt, setPAppt] = useState(80);
  const [pLand, setPLand] = useState(41);
  const [pLoan, setPLoan] = useState(2333);
  const [pDep, setPDep] = useState(533);
  const [pYield, setPYield] = useState(2.0);
  const [pCost, setPCost] = useState(38);

  const n = useSteps(GEN_STEPS.length, run > 0, run);
  const finished = run > 0 && n > GEN_STEPS.length;
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const coh = COHORTS.find((c) => c.id === cohId)!;
  const single = SINGLES.find((s) => s.id === singleId)!;
  const targetName = mode === 'cohort' ? coh.name : single.name;
  const targetN = mode === 'cohort' ? coh.n : 1;
  const scenario = SCENARIOS.find((s) => s.k === scn)!;
  const recSet = new Set(REC[scn].map((x) => x.p));
  const roleOf = (p: string) => REC[scn].find((x) => x.p === p)?.r;

  const pickCohort = (c: Cohort) => { setCohId(c.id); setScn(c.scn); setProds(REC[c.scn].map((x) => x.p)); setBudget(c.cost); };
  const pickSingle = (id: string) => { const s = SINGLES.find((x) => x.id === id)!; setSingleId(id); setScn(s.event); setProds(REC[s.event].map((x) => x.p)); setBudget(3); };
  const pickScn = (k: ScnKey) => { setScn(k); setProds(REC[k].map((x) => x.p)); };
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const baseline = useMemo(() => {
    const src = mode === 'cohort' ? coh : (COHORTS.find((c) => c.scn === scn) ?? coh);
    const r = rng(singleId.split('').reduce((s, c) => s + c.charCodeAt(0), 0));
    const bump = mode === 'single' ? Math.round(r() * 10) : 0;
    return { reach: targetN, resp: clamp(src.resp + bump, 10, 95), appt: src.appt, land: clamp(src.land + bump, 10, 95), loan: src.loan, dep: src.dep, cost: budget };
  }, [mode, coh, scn, targetN, singleId, budget]);
  const applyBaseline = () => { setPReach(baseline.reach); setPResp(baseline.resp); setPAppt(baseline.appt); setPLand(baseline.land); setPLoan(baseline.loan); setPDep(baseline.dep); setPYield(2.0); setPCost(baseline.cost); };
  const generate = () => { applyBaseline(); setTab('eff'); setEditing(false); setRun((r) => r + 1); };

  const eff = useMemo(() => {
    const resp = Math.round(pReach * pResp / 100);
    const appt = Math.round(resp * pAppt / 100);
    const land = Math.round(appt * pLand / 100);
    const loan = land * pLoan;
    const dep = land * pDep;
    const income = loan * pYield / 100 + dep * 1.8 / 100 + land * 1.5;
    const roi = pCost > 0 ? income / pCost : 0;
    return { resp, appt, land, loan, dep, income, roi, net: income - pCost, funnel: [{ name: '触达', v: pReach }, { name: '响应', v: resp }, { name: '预约拜访', v: appt }, { name: '落地', v: land }] };
  }, [pReach, pResp, pAppt, pLand, pLoan, pDep, pYield, pCost]);

  const timeline = useMemo(() => {
    const chs = CHANNELS.filter((c) => chans.includes(c.k));
    const cells = chs.map((c) => ({ c, weeks: Array.from({ length: cycle }, (_, i) => i + 1).filter((w) => c.cadence(w, cycle, freq)) }));
    const touches = cells.reduce((s, x) => s + x.weeks.length, 0);
    return { cells, touches };
  }, [chans, cycle, freq]);
  const budgetRows = useMemo(() => {
    const chs = CHANNELS.filter((c) => chans.includes(c.k));
    const tot = chs.reduce((s, c) => s + c.share, 0) || 1;
    const material = Math.round(budget * 0.1 * 10) / 10;
    const rows = chs.map((c) => ({ k: c.t, v: Math.round((budget - material) * c.share / tot * 10) / 10, s: c.k === 'visit' ? '差旅与客户拜访' : c.k === 'salon' ? '场地、茶歇与讲师' : c.k === 'brief' ? '场地与物料' : c.k === 'call' ? '外呼坐席' : c.k === 'wechat' ? '内容制作' : '通道费用' }));
    rows.push({ k: '宣传物料', v: material, s: '折页、方案书打印' });
    return rows;
  }, [chans, budget]);
  const camp = CAMPS.find((c) => c.id === campId)!;
  const cmpData = METRICS.map((m, i) => ({ name: m, 预测: camp.pred[i], 实际: camp.act[i] }));

  /* ---------- 正式方案书：由左侧配置与效果测算生成 ---------- */
  const coRec = mode === 'single' ? COMPANIES.find((c) => c.id === singleId) : undefined;
  const mainProd = prods.find((p) => roleOf(p) === '主打') ?? prods[0] ?? '综合金融服务';
  const docTitle = mode === 'cohort' ? `「${coh.name}」客群营销方案` : `${single.name}营销方案`;
  const docNo = `YSYH-YX-2026-${String(100 + (targetName.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 900)).padStart(4, '0')}`;
  const docCustomer = mode === 'cohort' ? `${coh.name}（${coh.n} 户）` : `${single.name} · ${single.industry}`;
  const proposal = useMemo<ProposalSections>(() => {
    const phaseOf = (w: number) => (w === 1 ? '预热' : w <= 3 ? '首触' : w <= cycle - 2 ? '深化' : '收口');
    const weeksAll = Array.from({ length: cycle }, (_, i) => i + 1);
    const phases = (['预热', '首触', '深化', '收口'] as const).map((ph) => {
      const weeks = weeksAll.filter((w) => phaseOf(w) === ph);
      const chs = timeline.cells.filter((c) => c.weeks.some((w) => weeks.includes(w))).map((c) => c.c.t);
      return { ph, weeks, chs };
    }).filter((x) => x.weeks.length > 0);
    const PH_TARGET: Record<string, string> = { 预热: '客群全量 · 财务负责人', 首触: '响应客户 · 财务负责人 / 实际控制人', 深化: '预约客户 · 决策人（财务总监 / 总经理）', 收口: '意向客户 · 决策人，分行产品经理协访' };
    const PH_ACTION: Record<string, string> = { 预热: `${time}推送产品要点与政策解读，核对客户联系偏好`, 首触: TALKS[scn][0], 深化: TALKS[scn][1] ?? TALKS[scn][0], 收口: '出具正式方案，收集申请材料，进入审批流程并约定放款节奏' };
    const overview: { k: string; v: string }[] = mode === 'cohort'
      ? [
        { k: '目标客群', v: `${coh.name}（${coh.n} 户）` },
        { k: '筛选条件', v: coh.s },
        { k: '行业与区域', v: coh.tags.join('、') },
        { k: '经营事件', v: `${scenario.t}：${scenario.s}` },
        { k: '合作基础', v: scn === 'renew' ? '存量贷款客户，授信 90 天内到期，贷后检查无异常' : scn === 'sub' ? '母公司为本行客户，新设主体尚未开户' : '存量结算户为主，尚无授信或授信未在本行' },
        { k: '数据来源', v: 'CRM 客群标签、历史营销活动数据、本行结算 / 存款数据（只读），不使用征信数据' },
      ]
      : [
        { k: '企业名称', v: single.name },
        { k: '行业 / 区域', v: `${single.industry}${coRec ? ` · ${coRec.district}` : ''}` },
        { k: '与我行关系', v: coRec ? coRec.relation : '存量结算户' },
        ...(coRec ? [{ k: '存款 / 结算 / 敞口', v: `日均存款 ${fmtW(coRec.deposit)} · 年结算量 ${fmtW(coRec.settlement)} · 授信敞口 ${coRec.exposure ? fmtW(coRec.exposure) : '无'}` }] : []),
        { k: '经营事件', v: `${scenario.t}：${scenario.s}${coRec ? `；${coRec.note}` : ''}` },
        { k: '客户标签', v: coRec ? coRec.tags.join('、') : `${single.exporter ? '出口收汇 · ' : ''}${single.industry}` },
      ];
    const goals = [
      { k: '触达户数', v: `${pReach} 户`, note: mode === 'cohort' ? '客群全量触达' : '单户 · 决策链全覆盖' },
      { k: '响应 / 预约拜访', v: `${eff.resp} / ${eff.appt} 户`, note: `响应率 ${pResp}%，预约转化 ${pAppt}%` },
      { k: '方案落地', v: `${eff.land} 户`, note: `落地转化 ${pLand}%（${scenario.goal}）` },
      { k: '新增贷款', v: fmtW(eff.loan), note: `户均 ${fmtW(pLoan)}` },
      { k: '新增日均存款', v: fmtW(eff.dep), note: `户均 ${fmtW(pDep)}` },
      { k: '年综合收益 / ROI', v: `${eff.income.toFixed(0)} 万 / ${eff.roi.toFixed(1)}`, note: `营销成本 ${pCost} 万，周期 ${cycle} 周` },
    ];
    const products = prods.map((p) => { const m = PRODUCT_META[p]; return { name: p, role: roleOf(p) ?? '补充', amount: m?.amount ?? '按客户需求', term: m?.term ?? '按产品规定', pricing: m?.pricing ?? '按行内价目', access: m?.access ?? '按产品准入要求', dept: m?.dept ?? '支行公司业务' }; });
    const touch = phases.map((x) => ({ when: `第 ${x.weeks[0]}${x.weeks.length > 1 ? `–${x.weeks[x.weeks.length - 1]}` : ''} 周 · ${x.ph}`, channel: x.chs.length ? x.chs.join(' / ') : '—', target: PH_TARGET[x.ph], action: PH_ACTION[x.ph], owner: x.ph === '收口' ? `${ME.name} · 支行负责人` : ME.name }));
    const effect = {
      rows: [
        { k: '触达 → 响应 → 预约 → 落地', v: `${pReach} → ${eff.resp} → ${eff.appt} → ${eff.land} 户`, note: '按历史转化率逐级测算' },
        { k: '新增贷款', v: fmtW(eff.loan), note: `落地 ${eff.land} 户 × 户均 ${fmtW(pLoan)}` },
        { k: '新增日均存款', v: fmtW(eff.dep), note: `落地 ${eff.land} 户 × 户均 ${fmtW(pDep)}` },
        { k: '贷款利差收益', v: `${(eff.loan * pYield / 100).toFixed(0)} 万`, note: `净利差 ${pYield}%` },
        { k: '存款利差收益', v: `${(eff.dep * 1.8 / 100).toFixed(0)} 万`, note: '存款 FTP 利差 1.8%' },
        { k: '中间业务收入', v: `${(eff.land * 1.5).toFixed(0)} 万`, note: '户均 1.5 万' },
        { k: '年综合收益', v: `${eff.income.toFixed(0)} 万`, note: '三项合计' },
        { k: '营销成本 / 净收益', v: `${pCost} 万 / ${eff.net.toFixed(0)} 万`, note: `ROI ${eff.roi.toFixed(1)}` },
      ],
      chart: eff.funnel.map((f) => ({ name: f.name, v: f.v, label: `${f.v} 户` })),
      chartTitle: '转化漏斗（户）',
      note: `敏感性：响应率下降 10 个百分点时，预计落地约 ${Math.round(Math.round(pReach * Math.max(0, pResp - 10) / 100) * pAppt / 100 * pLand / 100)} 户。历史转化率来自本行历史营销活动数据，客单贡献按客群均值估算，测算结果不构成收益承诺。`,
    };
    const risks = [
      '营销触达遵守客户联系偏好与行内营销合规要求，不使用征信数据进行营销，不向客户泄露他行信息。',
      '话术不评价同业、不承诺利率与审批结果；产品额度、期限与定价以行内授信审批与产品准入为准。',
      `${scn === 'first' || scn === 'tech' ? '首次融资客户' : '目标客户'}信息以客户提供材料与公开信息为准，方案落地前须完成尽职调查、反洗钱与关联关系核查。`,
      ...TALKS[scn].slice(2).map((t) => `话术口径：${t}`),
      ...(coRec && (coRec.risk === 'orange' || coRec.risk === 'yellow') ? [`${coRec.name} 当前存在风险提示（${coRec.tags.join('、')}），营销推进前须核实风险信号并取得支行负责人意见。`] : []),
      'AI 生成内容为辅助建议，本方案须经人工复核并按权限审批后执行。',
    ];
    const resources = [
      ...budgetRows.map((r) => ({ item: `${r.k}：${r.v.toFixed(1)} 万（${r.s}）`, dept: '支行', owner: ME.name, due: `${cycle} 周内按进度使用` })),
      { item: `${mainProd}产品经理支持与方案出具`, dept: '分行产品创新部 / 公司业务部', owner: '产品经理', due: '首触后 3 个工作日' },
      { item: '授信审批时效承诺（材料齐全后 10 个工作日）', dept: '授信审批部', owner: '审批经理', due: '收口阶段' },
      ...(chans.includes('salon') || chans.includes('brief') ? [{ item: '沙龙 / 说明会场地、讲师与物料', dept: '支行 · 分行公司业务部', owner: '支行负责人', due: '第 2–4 周' }] : []),
    ];
    return {
      overview, needs: NEEDS[scn], goals, products, touch, effect, risks, resources,
      needsNote: `综合以上需求，本方案以「${mainProd}」为首触卖点，配套${products.filter((p) => p.role !== '主打').map((p) => p.name).join('、') || '结算类产品'}，形成融资、结算与沉淀的闭环。`,
      touchNote: `触达频次 ${FREQS.find((f) => f.k === freq)?.t ?? ''}，时间偏好 ${time}，合计 ${timeline.touches} 次触达；每次触达后 24 小时内在 CRM 记录反馈并更新客户反应度。`,
      attachments: [`目标客群清单（${targetN} 户，含联系偏好）`, '产品说明书与准入要点', '话术要点与异议应对', '效果测算明细表', '预算明细表', '历史同类活动回评报告'],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, coh, single, coRec, scn, scenario, prods, cycle, time, freq, timeline, eff, pReach, pResp, pAppt, pLand, pLoan, pDep, pYield, pCost, budgetRows, chans, targetN, mainProd]);
  const conclusion = {
    headline: `建议对「${targetName}」以「${mainProd}」为首触卖点，${cycle} 周内完成 ${eff.appt} 户预约拜访、${eff.land} 户方案落地，预计新增贷款 ${fmtW(eff.loan)}、年综合收益 ${eff.income.toFixed(0)} 万，ROI ${eff.roi.toFixed(1)}。`,
    points: [`场景「${scenario.t}」与客群标签匹配：${scenario.s}`, `产品组合 ${prods.length} 项：${prods.slice(0, 3).join(' + ')}${prods.length > 3 ? ' 等' : ''}`, `${chans.length} 个渠道、${timeline.touches} 次触达，遵守客户联系偏好`, `营销成本 ${pCost} 万，净收益 ${eff.net.toFixed(0)} 万`],
    evidence: ['CRM 客群标签', '历史营销活动数据', '产品目录与定价参数', '本行结算 / 存款数据'],
  };

  return (
    <div>
      <style>{CSS}</style>
      <div className="mp-crumb"><Link to="/p/P01">智慧获客引擎</Link><span>›</span><b>精准营销方案与效果预测</b></div>
      <div className="page-h">
        <div>
          <h1><Megaphone size={20} style={{ verticalAlign: -3, marginRight: 6 }} />精准营销方案与效果预测</h1>
          <p>针对客群或单户生成营销方案（场景、产品组合、触达策略），执行前测算预期效果与 ROI，执行后按实际数据回评。营销触达遵守客户联系偏好与行内合规要求，不使用征信数据。</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={() => setToast(finished ? '方案已保存到「我的方案」' : '请先生成方案')}><Save size={13} />保存方案</button>
          <button className="btn ghost sm" onClick={() => setToast(finished ? '方案书已导出（docx）' : '请先生成方案')}><Download size={13} />导出方案书</button>
          <button className="btn sm" onClick={() => setToast(finished ? '已提交支行负责人复核' : '请先生成方案')}><FileCheck2 size={13} />提交复核</button>
        </div>
      </div>

      <div className="mp-layout">
        {/* ---------------- 左：三步配置 ---------------- */}
        <div className="mp-left">
          <div className="card fade-in">
            <div className="card-h"><div className="card-t"><span className="mp-stepn ok">1</span>目标客群 / 单户</div>
              <div className="mp-seg"><button className={mode === 'cohort' ? 'on' : ''} onClick={() => setMode('cohort')}>客群</button><button className={mode === 'single' ? 'on' : ''} onClick={() => setMode('single')}>单户</button></div>
            </div>
            {mode === 'cohort' && COHORTS.map((c) => (
              <div key={c.id} className={`mp-coh${cohId === c.id ? ' on' : ''}`} onClick={() => pickCohort(c)}>
                <div className="t"><span>{c.name}</span><b>{c.n} 户</b></div>
                <div className="s">{c.s}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>{c.tags.map((t) => <span key={t} className="chip blue" style={{ padding: '1px 7px', fontSize: 10.5 }}><i />{t}</span>)}</div>
              </div>
            ))}
            {mode === 'single' && (
              <>
                <select className="mp-sel" value={singleId} onChange={(e) => pickSingle(e.target.value)}>
                  {SINGLES.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.industry}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  <span className="chip"><i />{single.industry}</span>
                  {single.exporter && <span className="chip purple"><i />出口收汇</span>}
                  <span className="chip green"><i />{SCENARIOS.find((s) => s.k === single.event)?.goal}</span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 6 }}>单户方案按该企业的经营事件自动匹配场景，可在下一步调整。</p>
              </>
            )}
          </div>

          <div className="card fade-in" style={{ animationDelay: '60ms' }}>
            <div className="card-h"><div className="card-t"><span className="mp-stepn ok">2</span>营销场景与产品组合</div><span className="card-s">{prods.length} 项</span></div>
            <div className="mp-lbl">营销场景 <small>绿框为 AI 推荐</small></div>
            <div className="mp-scn">{SCENARIOS.map((s) => <div key={s.k} className={`mp-sc${scn === s.k ? ' on' : ''}${(mode === 'cohort' ? coh.scn : single.event) === s.k ? ' rec' : ''}`} onClick={() => pickScn(s.k)}><b>{s.t}</b><span>{s.s}</span></div>)}</div>
            <div className="mp-lbl">产品组合 <small>多选 · 标注主打 / 搭配 / 沉淀</small></div>
            <div className="mp-prods">
              {PRODUCTS.map((p) => <button key={p} className={`mp-prod${prods.includes(p) ? ' on' : ''}`} onClick={() => setProds((a) => toggle(a, p))}>{p}{recSet.has(p) && <span className="role">{roleOf(p)}</span>}</button>)}
            </div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '120ms' }}>
            <div className="card-h"><div className="card-t"><span className="mp-stepn ok">3</span>触达策略</div><span className="card-s">{timeline.touches} 次触达 / {cycle} 周</span></div>
            <div className="mp-lbl">渠道 <small>{chans.length} 个</small></div>
            <div className="mp-ch">{CHANNELS.map((c) => <button key={c.k} className={`mp-chb${chans.includes(c.k) ? ' on' : ''}`} onClick={() => setChans((a) => toggle(a, c.k))}>{c.icon}{c.t}</button>)}</div>
            <div className="mp-lbl">频次</div>
            <div className="mp-opts">{FREQS.map((f) => <button key={f.k} className={`mp-opt${freq === f.k ? ' on' : ''}`} onClick={() => setFreq(f.k)}>{f.t}</button>)}</div>
            <div className="mp-lbl">时间偏好</div>
            <div className="mp-opts">{TIMES.map((t) => <button key={t} className={`mp-opt${time === t ? ' on' : ''}`} onClick={() => setTime(t)}>{t}</button>)}</div>
            <div className="mp-lbl">周期</div>
            <div className="mp-opts">{CYCLES.map((c) => <button key={c} className={`mp-opt${cycle === c ? ' on' : ''}`} onClick={() => setCycle(c)}>{c} 周</button>)}</div>
            <div className="mp-lbl">营销预算（万元）</div>
            <input className="mp-inp num" type="number" min={1} max={500} value={budget} onChange={(e) => setBudget(clamp(+e.target.value || 0, 0, 500))} />
            <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={generate}>{run > 0 ? <><RotateCcw size={14} />重新生成方案</> : <><Sparkles size={14} />生成方案</>}</button>
            <div className="mp-note"><ShieldCheck size={12} /> 遵守客户联系偏好 · 不使用征信数据</div>
          </div>
        </div>

        {/* ---------------- 右：思考流 + 方案 / 预测 / 回评 ---------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card fade-in mp-noprint" style={{ animationDelay: '80ms' }}>
            <div className="card-h"><div className="card-t"><span className="dot" />方案生成{run > 0 && !finished && <span className="pulse" />}</div><span className="card-s">场景匹配 → 产品组合 → 触达节奏 → 效果测算</span></div>
            {run === 0 && <div className="mp-empty" style={{ minHeight: 130 }}><div><div className="ring"><Megaphone size={22} /></div>完成左侧三步配置后点击「生成方案」。</div></div>}
            {run > 0 && (
              <div className="think">
                {GEN_STEPS.map((s, i) => {
                  const st = i < n - 1 ? 'done' : i === n - 1 && n <= GEN_STEPS.length ? 'active' : 'pending';
                  if (st === 'pending') return null;
                  return (
                    <div key={s.t} className={`step fade-in ${st}`}>
                      <div className="n" style={st === 'done' ? { background: 'var(--g-green)' } : undefined}>{st === 'done' ? <Check size={12} /> : i + 1}</div>
                      <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div>
                    </div>
                  );
                })}
                {finished && <div className="ai-tag fade-in"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</div>}
              </div>
            )}
          </div>

          {finished && (
            <>
              <AiConclusion headline={conclusion.headline} points={conclusion.points} evidence={conclusion.evidence} confidence={0.86} actions={['visit', 'talk', 'forward']} onSystem={(_id, label) => setToast(`${label}：已连同方案书推送行内 OA，待接收部门处理`)} />
              <div className="mp-dockbar">
                <span className="lab"><FileText size={13} />正式营销方案书 · {docNo} · {editing ? '编辑中' : '待复核'}</span>
                <DocActions title={docTitle} editing={editing} onEdit={() => setEditing((v) => !v)} getHtml={() => docRef.current?.getHtml() ?? ''} onToast={setToast} compact />
              </div>
              <ProposalDoc ref={docRef} title={docTitle} no={docNo} customer={docCustomer} org={ME_ORG} author={ME.name} date={DATE_STR} sections={proposal} editing={editing} />
            <div className="card fade-in mp-noprint">
              <div className="mp-tabs">
                <button className={tab === 'eff' ? 'on' : ''} onClick={() => setTab('eff')}><Gauge size={13} />效果预测</button>
                <button className={tab === 'retro' ? 'on' : ''} onClick={() => setTab('retro')}><ClipboardCheck size={13} />执行后回评</button>
              </div>

              {/* ---------- 效果预测 ---------- */}
              {tab === 'eff' && (
                <div className="fade-in" style={{ marginTop: 14 }}>
                  <div className="mp-tiles">
                    <div className="tile"><b className="num">{pReach}<small>户</small></b><span>预计触达 · 响应 {eff.resp} 户 · 预约 {eff.appt} 户</span></div>
                    <div className="tile red"><b className="num">{eff.land}<small>户</small></b><span>预计落地 · 综合转化 {pReach ? Math.round(eff.land / pReach * 100) : 0}%</span></div>
                    <div className="tile green"><b className="num">{fmtW(eff.loan)}</b><span>新增贷款 · 新增日均存款 {fmtW(eff.dep)}</span></div>
                    <div className="tile gold"><b className="num">{eff.income.toFixed(0)}<small>万 / 年</small></b><span>年综合收益 · 成本 {pCost} 万 · ROI {eff.roi.toFixed(1)}</span></div>
                  </div>
                  <div className="mp-eff" style={{ marginTop: 14 }}>
                    <div>
                      <div className="mp-sec"><BarChart3 size={12} />转化漏斗（户）</div>
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer>
                          <BarChart data={eff.funnel} margin={{ top: 18, right: 8, left: -18, bottom: 0 }} barCategoryGap="24%">
                            <defs>{PAL.map((c, i) => <linearGradient key={i} id={`mp-fb${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={PAL2[i]} /></linearGradient>)}</defs>
                            <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit=" 户" />} />
                            <Bar dataKey="v" name="户数" radius={[8, 8, 4, 4]} isAnimationActive={false}>
                              {eff.funnel.map((_, i) => <Cell key={i} fill={`url(#mp-fb${[3, 6, 1, 2][i]})`} />)}
                              <LabelList dataKey="v" position="top" fontSize={11} fontWeight={800} fill="#5f5850" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mp-sec"><Gauge size={12} />关键指标仪表</div>
                      <div className="mp-gauges">
                        <GaugeSvg id="mp-g1" v={pReach ? eff.resp / pReach * 100 : 0} max={100} label="响应率" sub="响应 / 触达" fmt={(v) => `${v.toFixed(0)}%`} />
                        <GaugeSvg id="mp-g2" v={pReach ? eff.land / pReach * 100 : 0} max={100} label="综合转化率" sub="落地 / 触达" fmt={(v) => `${v.toFixed(0)}%`} />
                        <GaugeSvg id="mp-g3" v={eff.roi} max={Math.max(20, Math.ceil(eff.roi / 10) * 10)} label="ROI" sub={`收益 ${eff.income.toFixed(0)} 万 / 成本 ${pCost} 万`} fmt={(v) => v.toFixed(1)} />
                      </div>
                    </div>
                    <div>
                      <div className="mp-sec" style={{ justifyContent: 'space-between' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Gauge size={12} />预测参数（可编辑，实时重算）</span></div>
                      <div className="mp-params">
                        <div className="mp-pr"><span>触达户数</span><input type="range" min={1} max={100} value={pReach} onChange={(e) => setPReach(+e.target.value)} /><input type="number" value={pReach} onChange={(e) => setPReach(clamp(+e.target.value || 0, 0, 500))} /></div>
                        <div className="mp-pr"><span>响应率 %</span><input type="range" min={5} max={100} value={pResp} onChange={(e) => setPResp(+e.target.value)} /><input type="number" value={pResp} onChange={(e) => setPResp(clamp(+e.target.value || 0, 0, 100))} /></div>
                        <div className="mp-pr"><span>预约转化 %</span><input type="range" min={5} max={100} value={pAppt} onChange={(e) => setPAppt(+e.target.value)} /><input type="number" value={pAppt} onChange={(e) => setPAppt(clamp(+e.target.value || 0, 0, 100))} /></div>
                        <div className="mp-pr"><span>落地转化 %</span><input type="range" min={5} max={100} value={pLand} onChange={(e) => setPLand(+e.target.value)} /><input type="number" value={pLand} onChange={(e) => setPLand(clamp(+e.target.value || 0, 0, 100))} /></div>
                        <div className="mp-pr"><span>户均贷款 万</span><input type="range" min={0} max={5000} step={50} value={pLoan} onChange={(e) => setPLoan(+e.target.value)} /><input type="number" value={pLoan} onChange={(e) => setPLoan(clamp(+e.target.value || 0, 0, 50000))} /></div>
                        <div className="mp-pr"><span>户均存款 万</span><input type="range" min={0} max={2000} step={10} value={pDep} onChange={(e) => setPDep(+e.target.value)} /><input type="number" value={pDep} onChange={(e) => setPDep(clamp(+e.target.value || 0, 0, 20000))} /></div>
                        <div className="mp-pr"><span>贷款净利差 %</span><input type="range" min={0.5} max={4} step={0.1} value={pYield} onChange={(e) => setPYield(+e.target.value)} /><input type="number" step={0.1} value={pYield} onChange={(e) => setPYield(clamp(+e.target.value || 0, 0, 10))} /></div>
                        <div className="mp-pr"><span>营销成本 万</span><input type="range" min={1} max={200} value={pCost} onChange={(e) => setPCost(+e.target.value)} /><input type="number" value={pCost} onChange={(e) => setPCost(clamp(+e.target.value || 0, 0, 1000))} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="btn sm ghost" onClick={applyBaseline}><RotateCcw size={12} />恢复 AI 预测值</button><span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span></div>
                      <div className="mp-sec"><Lightbulb size={12} />测算口径</div>
                      <div className="kv mp-kv">
                        <div className="row"><span>年综合收益</span><span className="num">贷款 × {pYield}% + 存款 × 1.8% + 落地户 × 1.5 万</span></div>
                        <div className="row"><span>贷款利差收益</span><span className="num">{(eff.loan * pYield / 100).toFixed(0)} 万</span></div>
                        <div className="row"><span>存款利差收益</span><span className="num">{(eff.dep * 1.8 / 100).toFixed(0)} 万</span></div>
                        <div className="row"><span>中间业务收入</span><span className="num">{(eff.land * 1.5).toFixed(0)} 万</span></div>
                        <div className="row"><span>净收益（收益 − 成本）</span><span className="num" style={{ color: eff.net >= 0 ? 'var(--green-3)' : 'var(--red-3)' }}>{eff.net.toFixed(0)} 万</span></div>
                        <div className="row"><span>敏感性：响应率 −10 pt</span><span className="num">落地约 {Math.round(Math.round(pReach * Math.max(0, pResp - 10) / 100) * pAppt / 100 * pLand / 100)} 户</span></div>
                      </div>
                      <div className="mp-note"><ShieldCheck size={12} /> 历史转化率来自本行历史营销活动数据，客单贡献按客群均值估算。</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- 执行后回评 ---------- */}
              {tab === 'retro' && (
                <div className="fade-in" style={{ marginTop: 14 }}>
                  <div className="mp-cmp">
                    <div>
                      <div className="mp-sec"><ClipboardCheck size={12} />已执行活动</div>
                      {CAMPS.map((c) => <div key={c.id} className={`mp-camp${campId === c.id ? ' on' : ''}`} onClick={() => setCampId(c.id)}><Building2 size={15} color="var(--ink-3)" /><div><b>{c.name}</b><span>{c.period} · {SCENARIOS.find((s) => s.k === c.scn)?.t}</span></div><div className="roi"><b className="num">ROI {(c.act[4] / c.act[5]).toFixed(1)}</b><span style={{ fontSize: 10.5 }}>预测 {(c.pred[4] / c.pred[5]).toFixed(1)}</span></div></div>)}
                      <div className="mp-sec"><BarChart3 size={12} />实际 vs 预测（户）</div>
                      <div style={{ height: 210 }}>
                        <ResponsiveContainer>
                          <BarChart data={cmpData} margin={{ top: 16, right: 8, left: -18, bottom: 0 }} barCategoryGap="26%" barGap={3}>
                            <defs>
                              <linearGradient id="mp-cp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#c9a24d" /></linearGradient>
                              <linearGradient id="mp-ca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ee3ad" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit=" 户" />} />
                            <Legend wrapperStyle={{ fontSize: 11.5 }} />
                            <Bar dataKey="预测" fill="url(#mp-cp)" radius={[6, 6, 3, 3]} isAnimationActive={false}><LabelList dataKey="预测" position="top" fontSize={10.5} fill="#8c8478" /></Bar>
                            <Bar dataKey="实际" fill="url(#mp-ca)" radius={[6, 6, 3, 3]} isAnimationActive={false}><LabelList dataKey="实际" position="top" fontSize={10.5} fontWeight={800} fill="#155e3e" /></Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mp-tiles" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', marginTop: 8 }}>
                        <div className="tile gold"><b className="num">{camp.act[4]}<small>万</small></b><span>实际年综合收益 · 预测 {camp.pred[4]} 万</span></div>
                        <div className="tile red"><b className="num">{camp.act[5]}<small>万</small></b><span>实际成本 · 预测 {camp.pred[5]} 万</span></div>
                        <div className="tile green"><b className="num">{(camp.act[4] / camp.act[5]).toFixed(1)}</b><span>实际 ROI · 预测 {(camp.pred[4] / camp.pred[5]).toFixed(1)}{camp.act[4] / camp.act[5] >= camp.pred[4] / camp.pred[5] ? ' · 达成' : ' · 未达成'}</span></div>
                      </div>
                    </div>
                    <div>
                      <div className="mp-sec"><Users size={12} />客户反应度</div>
                      {camp.react.map((r) => <div key={r.co} className="mp-react"><span className={`chip ${r.r === '已落地' ? 'green' : r.r === '已预约' ? 'blue' : r.r === '愿意接洽' ? '' : 'red'}`} style={{ padding: '2px 8px', fontSize: 10.5, width: 78, justifyContent: 'center' }}><i />{r.r}</span><span className="nm">{r.co}</span><span className="ch">{r.ch}</span></div>)}
                      <div className="mp-sec"><Lightbulb size={12} />偏差解释</div>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {camp.why.map((w) => <li key={w} style={{ fontSize: 12, color: 'var(--ink-2)', padding: '6px 10px', borderRadius: 9, background: 'var(--g-holo-2)', boxShadow: 'inset 0 0 0 1px rgba(201,162,77,.14)' }}>{w}</li>)}
                      </ul>
                      <div className="mp-sec"><Sparkles size={12} />优化建议</div>
                      {camp.sug.map((s, i) => <div key={s.t} className="mp-sug"><span className="n">{i + 1}</span><div><b>{s.t}</b><p>{s.p}</p></div></div>)}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                        <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>
                        <button className="btn sm ghost" onClick={() => setToast('回评报告已导出并归档')}><Download size={12} />导出回评报告</button>
                        <button className="btn sm gold" onClick={() => { const s = SCENARIOS.find((x) => x.k === camp.scn)!; pickScn(s.k); setTab('eff'); setToast('已将优化建议应用到新方案的场景与产品组合'); }}><ArrowRight size={12} />应用到新方案</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </>
          )}

          <div className="card fade-in mp-noprint" style={{ animationDelay: '160ms' }}>
            <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近方案与回评</span></div>
            <div className="mp-hist">
              {HISTORY.map((h) => <div key={h.d + h.t} className="h" onClick={() => setToast(`已打开「${h.t}」`)}><span className="d">{h.d}</span><span className="t">{h.t}</span><span className={`chip ${h.s === '已归档' ? '' : h.s === '执行中' ? 'blue' : h.s === '已复核' ? 'green' : 'orange'}`} style={{ padding: '1px 8px', fontSize: 11 }}><i />{h.s}</span><ArrowRight size={12} color="var(--ink-3)" /></div>)}
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="mp-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
