import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Legend,
} from 'recharts';
import {
  Megaphone, Sparkles, Check, RotateCcw, Users, Building2, Layers, Send, Download, Save, FileCheck2, ShieldCheck, History,
  Target, MessageSquare, Wallet, Gauge, BarChart3, ClipboardCheck, ArrowRight, Phone, MapPin, MessageCircle, Mail, Presentation, CalendarRange, Lightbulb,
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
  const [tab, setTab] = useState<'doc' | 'eff' | 'retro'>('doc');
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
  const generate = () => { applyBaseline(); setTab('doc'); setRun((r) => r + 1); };

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
          <div className="card fade-in" style={{ animationDelay: '80ms' }}>
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
            <div className="card fade-in">
              <div className="mp-tabs">
                <button className={tab === 'doc' ? 'on' : ''} onClick={() => setTab('doc')}><Layers size={13} />方案文档</button>
                <button className={tab === 'eff' ? 'on' : ''} onClick={() => setTab('eff')}><Gauge size={13} />效果预测</button>
                <button className={tab === 'retro' ? 'on' : ''} onClick={() => setTab('retro')}><ClipboardCheck size={13} />执行后回评</button>
              </div>

              {/* ---------- 方案文档 ---------- */}
              {tab === 'doc' && (
                <div className="fade-in" style={{ marginTop: 14 }}>
                  <div className="mp-hero">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div><h3>「{targetName}」营销方案</h3><p>场景：{scenario.t} · 目标：{scenario.goal} · 周期 {cycle} 周 · 预算 {budget} 万</p></div>
                      <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>
                    </div>
                  </div>
                  <div className="mp-sec"><Target size={12} />目标客群</div>
                  <div className="kv mp-kv">
                    <div className="row"><span>对象</span><span>{mode === 'cohort' ? `${coh.name} · ${coh.n} 户` : `${single.name} · ${single.industry}`}</span></div>
                    <div className="row"><span>特征</span><span>{mode === 'cohort' ? coh.s : `${single.exporter ? '出口收汇 · ' : ''}${SCENARIOS.find((s) => s.k === single.event)?.s}`}</span></div>
                    <div className="row"><span>场景触发</span><span>{scenario.s}</span></div>
                    <div className="row"><span>营销目标</span><span>{scenario.goal} · 预计落地 {eff.land} 户</span></div>
                  </div>
                  <div className="mp-sec"><Layers size={12} />产品组合</div>
                  <div className="mp-pc">
                    {prods.map((p) => { const r = roleOf(p); return <div key={p} className={`p ${r === '主打' ? 'main' : r === '搭配' ? 'pair' : r === '沉淀' ? 'dep' : ''}`}><span className="r">{r ?? '补充'}</span><b>{p}</b><span style={{ color: 'var(--ink-2)' }}>{r === '主打' ? '解决核心资金需求，首触卖点' : r === '搭配' ? '与主打产品打包，提升综合收益' : r === '沉淀' ? '形成结算与存款沉淀' : '按客户需求选配'}</span></div>; })}
                  </div>
                  <div className="mp-sec"><CalendarRange size={12} />触达节奏时间线 · {FREQS.find((f) => f.k === freq)?.t} · {time}</div>
                  <div className="mp-svgwrap">
                    {(() => {
                      const left = 110, top = 34, cw = Math.max(52, 560 / cycle), rh = 30;
                      const W = left + cw * cycle + 16, H = top + rh * Math.max(1, timeline.cells.length) + 14;
                      const phase = (w: number) => (w === 1 ? '预热' : w <= 3 ? '首触' : w <= cycle - 2 ? '深化' : '收口');
                      const phaseColor: Record<string, string> = { 预热: '#3a86ff', 首触: '#e63946', 深化: '#f4b942', 收口: '#2dc48d' };
                      return (
                        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="触达节奏时间线">
                          <defs>
                            {PAL.map((c, i) => <linearGradient key={i} id={`mp-tl${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={PAL2[i]} /></linearGradient>)}
                            <linearGradient id="mp-row" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(201,162,77,.14)" /><stop offset="1" stopColor="rgba(61,187,134,.10)" /></linearGradient>
                          </defs>
                          {Array.from({ length: cycle }, (_, i) => i + 1).map((w) => (
                            <g key={w}>
                              <rect x={left + (w - 1) * cw + 2} y={6} width={cw - 4} height={18} rx={6} fill={phaseColor[phase(w)]} opacity={.16} />
                              <text x={left + (w - 1) * cw + cw / 2} y={19} textAnchor="middle" fontSize="10" fontWeight="800" fill="#4a3f2e">W{w} · {phase(w)}</text>
                            </g>
                          ))}
                          {timeline.cells.map((cell, ri) => {
                            const ci = CHANNELS.findIndex((c) => c.k === cell.c.k);
                            return (
                              <g key={cell.c.k}>
                                <rect x={4} y={top + ri * rh} width={W - 8} height={rh - 4} rx={8} fill="url(#mp-row)" />
                                <text x={12} y={top + ri * rh + 17} fontSize="11" fontWeight="800" fill="#1e1b16">{cell.c.t}</text>
                                {cell.weeks.map((w) => <circle key={w} cx={left + (w - 1) * cw + cw / 2} cy={top + ri * rh + 13} r={7} fill={`url(#mp-tl${ci % PAL.length})`} stroke="#fff" strokeWidth="2" />)}
                                {cell.weeks.length > 1 && <line x1={left + (cell.weeks[0] - 1) * cw + cw / 2} y1={top + ri * rh + 13} x2={left + (cell.weeks[cell.weeks.length - 1] - 1) * cw + cw / 2} y2={top + ri * rh + 13} stroke={PAL[ci % PAL.length]} strokeWidth="2" strokeDasharray="3 4" opacity=".6" />}
                              </g>
                            );
                          })}
                          {timeline.cells.length === 0 && <text x={W / 2} y={top + 18} textAnchor="middle" fontSize="12" fill="#8c8478">请至少选择一个渠道</text>}
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="mp-sec"><MessageSquare size={12} />话术要点</div>
                  {TALKS[scn].map((t, i) => <div key={t} className="mp-talk"><span className="n">{i + 1}</span><span>{t}</span></div>)}
                  <div className="mp-sec"><Wallet size={12} />预算明细 · 合计 {budget} 万</div>
                  <table className="tbl mp-budget">
                    <thead><tr><th>项目</th><th>说明</th><th>金额（万）</th></tr></thead>
                    <tbody>{budgetRows.map((r) => <tr key={r.k}><td style={{ fontWeight: 700 }}>{r.k}</td><td style={{ color: 'var(--ink-2)' }}>{r.s}</td><td className="num" style={{ fontWeight: 800 }}>{r.v.toFixed(1)}</td></tr>)}</tbody>
                  </table>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="mp-note" style={{ marginTop: 0 }}><ShieldCheck size={12} /> 触达遵守客户联系偏好；话术不评价同业、不承诺利率与审批结果。</div>
                    <div style={{ display: 'flex', gap: 8 }}><button className="btn sm gold" onClick={() => setTab('eff')}><Gauge size={12} />查看效果预测</button><button className="btn sm" onClick={() => setToast('方案已推送给团队成员并加入执行清单')}><Send size={12} />下发执行</button></div>
                  </div>
                </div>
              )}

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
                        <button className="btn sm gold" onClick={() => { const s = SCENARIOS.find((x) => x.k === camp.scn)!; pickScn(s.k); setTab('doc'); setToast('已将优化建议应用到新方案的场景与产品组合'); }}><ArrowRight size={12} />应用到新方案</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card fade-in" style={{ animationDelay: '160ms' }}>
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
