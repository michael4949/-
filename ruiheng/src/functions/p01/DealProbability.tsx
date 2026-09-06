import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, ReferenceLine, LabelList,
} from 'recharts';
import {
  TrendingUp, Sparkles, Check, Plus, RefreshCw, Download, X, ArrowRight, Clock, MessageSquare, Target, ShieldCheck, History,
  Landmark, Wallet, CalendarCheck, Hourglass, ChevronRight, Flag, Send, ThumbsUp, ThumbsDown, Lightbulb,
} from 'lucide-react';
import { rng } from '../../lib/rng';

/* ============================================================ 样式（页面私有，前缀 dp-） */
const CSS = `
.dp-crumb { font-size: 12.5px; color: var(--ink-3); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.dp-crumb a { color: var(--gold-3); font-weight: 700; } .dp-crumb b { color: var(--ink); }
.dp-kpi { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 16px; }
.dp-kpi .tile b small { font-size: 12px; color: var(--ink-3); margin-left: 3px; font-weight: 700; }
.dp-kpi .tile .ico { position: absolute; right: 12px; top: 12px; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--g-iris-soft); color: var(--ink-2); }
.dp-kpi .tile.gold::before { background: var(--g-gold); } .dp-kpi .tile.green::before { background: var(--g-green); } .dp-kpi .tile.red::before { background: var(--g-red); }
.dp-layout { display: grid; grid-template-columns: minmax(0,1fr) 400px; gap: 16px; align-items: start; }
@media (max-width: 1300px) { .dp-layout { grid-template-columns: 1fr; } }
.dp-board { display: grid; grid-template-columns: repeat(6, minmax(186px, 1fr)); gap: 10px; overflow-x: auto; padding-bottom: 6px; }
.dp-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.dp-colh { padding: 9px 11px; border-radius: 11px; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 6px; box-shadow: var(--shadow-sm); }
.dp-colh b { font-size: 13px; font-weight: 900; } .dp-colh small { font-size: 10.5px; opacity: .9; display: block; font-weight: 700; }
.dp-colh .cnt { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.25); font-size: 11px; font-weight: 900; }
.dp-colh.s0 { background: linear-gradient(135deg,#7fb0ff,#3a86ff); } .dp-colh.s1 { background: linear-gradient(135deg,#c7a4ff,#9b5de5); } .dp-colh.s2 { background: linear-gradient(135deg,#ffb27a,#d9781b); }
.dp-colh.s3 { background: var(--g-gold); color: #3a2a08; } .dp-colh.s3 .cnt { background: rgba(58,42,8,.15); } .dp-colh.s4 { background: var(--g-red); } .dp-colh.s5 { background: var(--g-green); }
.dp-card { padding: 10px 11px; border-radius: 12px; cursor: pointer; background: linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,247,236,.7) 60%, rgba(236,248,243,.65)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16), var(--shadow-sm); transition: transform .12s ease, box-shadow .12s ease; }
.dp-card:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px rgba(201,162,77,.4), var(--shadow); }
.dp-card.on { box-shadow: inset 0 0 0 2px rgba(195,39,43,.5), var(--shadow); background: var(--g-gold-soft); }
.dp-card.lost { opacity: .55; }
.dp-card .co { font-weight: 900; font-size: 13px; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.dp-card .co small { font-weight: 700; color: var(--ink-3); font-size: 10.5px; }
.dp-card .pr { font-size: 11.5px; color: var(--ink-2); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dp-card .amt { font-size: 15px; font-weight: 900; margin-top: 4px; }
.dp-card .amt small { font-size: 10.5px; color: var(--ink-3); font-weight: 700; margin-left: 2px; }
.dp-prob { display: flex; align-items: center; gap: 7px; margin-top: 6px; }
.dp-prob .bar { flex: 1; height: 7px; } .dp-prob b { width: 34px; text-align: right; font-size: 12.5px; }
.dp-prob.hi .bar i { background: var(--g-green); } .dp-prob.mid .bar i { background: var(--g-gold); } .dp-prob.lo .bar i { background: var(--g-red); }
.dp-card .nx { margin-top: 7px; font-size: 11.5px; padding: 6px 8px; border-radius: 8px; background: var(--g-gold-soft); display: flex; gap: 5px; align-items: flex-start; }
.dp-card .nx b { color: var(--gold-3); flex-shrink: 0; font-size: 11px; }
.dp-card .lf { margin-top: 6px; font-size: 11px; color: var(--ink-3); display: flex; gap: 5px; align-items: flex-start; }
.dp-card .lf span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dp-card .due { font-weight: 800; color: var(--red-3); }
.dp-panel { position: sticky; top: 74px; display: flex; flex-direction: column; gap: 14px; }
.dp-big { display: flex; align-items: flex-end; gap: 14px; }
.dp-big b { font-size: 44px; font-weight: 900; line-height: 1; letter-spacing: -.02em; }
.dp-big .rg { font-size: 12px; color: var(--ink-3); padding-bottom: 6px; }
.dp-big .rg em { font-style: normal; font-weight: 800; color: var(--ink); }
.dp-rangebar { position: relative; height: 10px; border-radius: 6px; background: linear-gradient(90deg, rgba(201,162,77,.12), rgba(61,187,134,.12)); margin: 10px 0 4px; overflow: hidden; }
.dp-rangebar .rg { position: absolute; top: 0; bottom: 0; background: var(--g-iris); opacity: .35; border-radius: 6px; }
.dp-rangebar .pt { position: absolute; top: 0; bottom: 0; width: 4px; background: var(--g-red); border-radius: 2px; transform: translateX(-2px); }
.dp-sec { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 800; letter-spacing: .12em; color: var(--gold-3); margin: 12px 0 7px; }
.dp-sec::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(201,162,77,.45), rgba(61,187,134,.25), rgba(255,255,255,0)); }
.dp-fac { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 0; border-bottom: 1px dashed var(--line); }
.dp-fac .lab { flex: 1; min-width: 0; } .dp-fac .lab small { display: block; color: var(--ink-3); font-size: 11px; }
.dp-fac .v { font-weight: 900; width: 36px; text-align: right; }
.dp-fac .v.p { color: var(--green-3); } .dp-fac .v.n { color: var(--red-3); }
.dp-tip { padding: 8px 11px; border-radius: 10px; background: var(--g-holo); box-shadow: var(--shadow), inset 0 0 0 1px rgba(201,162,77,.3); font-size: 12px; }
.dp-tip b { display: block; }
.dp-act { padding: 10px 12px; border-radius: 11px; background: var(--g-green-soft); font-size: 12.5px; line-height: 1.65; }
.dp-act b { display: block; margin-bottom: 2px; }
.dp-talk { display: flex; gap: 8px; align-items: flex-start; padding: 7px 10px; border-radius: 10px; background: var(--g-blue-soft); font-size: 12px; margin-bottom: 5px; }
.dp-talk .n { width: 18px; height: 18px; border-radius: 6px; background: linear-gradient(135deg,#7fb0ff,#3a86ff); color: #fff; font-weight: 900; font-size: 10.5px; display: grid; place-items: center; flex-shrink: 0; }
.dp-ta { width: 100%; min-height: 66px; resize: vertical; padding: 9px 11px; border-radius: 10px; border: 0; outline: none; font: inherit; font-size: 12.5px; color: var(--ink); background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); }
.dp-ta:focus { box-shadow: inset 0 0 0 2px rgba(195,39,43,.4); }
.dp-quick { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 8px; }
.dp-quick button { border: 0; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--ink-2); background: linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,247,236,.7)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.25); }
.dp-quick button:hover { background: var(--g-gold-soft); }
.dp-log { display: flex; gap: 8px; align-items: flex-start; padding: 7px 9px; border-radius: 9px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.14); font-size: 11.5px; margin-bottom: 5px; }
.dp-log .d { font-weight: 800; color: var(--ink-3); flex-shrink: 0; width: 40px; }
.dp-log .delta { margin-left: auto; font-weight: 900; flex-shrink: 0; }
.dp-log .delta.up { color: var(--green-3); } .dp-log .delta.down { color: var(--red-3); }
.dp-empty { min-height: 240px; display: grid; place-items: center; text-align: center; color: var(--ink-3); font-size: 13px; }
.dp-empty .ring { width: 54px; height: 54px; border-radius: 50%; background: var(--g-iris-soft); display: grid; place-items: center; margin: 0 auto 10px; box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); color: var(--red); }
.dp-hist { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px 12px; }
@media (max-width: 900px) { .dp-hist { grid-template-columns: 1fr; } }
.dp-hist .h { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px; background: linear-gradient(90deg, rgba(255,255,255,.7), rgba(255,247,236,.55) 60%, rgba(236,248,243,.5)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.14); font-size: 12px; cursor: pointer; }
.dp-hist .h:hover { box-shadow: inset 0 0 0 1px rgba(201,162,77,.45); }
.dp-hist .h .d { font-weight: 800; color: var(--ink-3); width: 44px; flex-shrink: 0; font-size: 11.5px; }
.dp-hist .h .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dp-hist .h .t b { font-weight: 800; }
.dp-note { font-size: 11.5px; color: var(--ink-3); display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.dp-toast { position: fixed; left: 50%; bottom: 46px; transform: translateX(-50%); z-index: 60; padding: 10px 18px; border-radius: 999px; background: var(--g-green); color: #fff; font-weight: 700; font-size: 13px; box-shadow: 0 12px 30px rgba(31,138,90,.3); display: inline-flex; align-items: center; gap: 8px; }
.dp-stagebtns { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
`;

/* ============================================================ 数据与模型 */
const STAGES = ['线索', '初访', '方案', '谈判', '审批', '落地'] as const;
type Stage = typeof STAGES[number];
const BASE: Record<Stage, number> = { 线索: 15, 初访: 30, 方案: 48, 谈判: 60, 审批: 75, 落地: 100 };
const RANGE: Record<Stage, number> = { 线索: 12, 初访: 10, 方案: 8, 谈判: 7, 审批: 4, 落地: 0 };
const STAGE_DAYS: Record<Stage, number> = { 线索: 7, 初访: 14, 方案: 21, 谈判: 14, 审批: 18, 落地: 0 };

interface Factors {
  mainBank: boolean;      // 本行为结算主办行（份额 ≥ 50%）
  meetings: number;       // 决策人会面次数
  needClear: boolean;     // 资金需求明确（事件驱动）
  materials: number;      // 材料齐备度 0..100
  histConv: number;       // 行内同类商机历史转化加分 0..6
  products: number;       // 持有产品数
  competitors: number;    // 竞争行报价数
  firstLoan: boolean;     // 首次融资 · 对审批时长敏感
  priceObjection: boolean;
  delayed: boolean;       // 客户推迟 / 14 天无回应
  riskWatch: boolean;     // 公开负面 / 关联风险关注
}
interface Opp {
  id: string; co: string; product: string; amount: number; kind: '贷款' | '存款' | '结汇' | '租赁';
  stage: Stage; lost?: boolean; next: string; due: string; last: { d: string; t: string }; created: string;
  f: Factors; hist: { w: string; p: number }[]; logs: { d: string; t: string; delta: number }[];
}
const F = (p: Partial<Factors>): Factors => ({ mainBank: false, meetings: 0, needClear: false, materials: 0, histConv: 3, products: 1, competitors: 0, firstLoan: false, priceObjection: false, delayed: false, riskWatch: false, ...p });

interface FactorRow { name: string; v: number; note: string }
function factorRows(f: Factors, stage: Stage): FactorRow[] {
  const rows: FactorRow[] = [];
  if (stage === '落地') return rows;
  if (f.mainBank) rows.push({ name: '本行为结算主办行', v: 10, note: '结算份额 ≥ 50%' });
  if (f.meetings > 0) rows.push({ name: '决策人已会面', v: Math.min(12, f.meetings * 4), note: `${f.meetings} 次` });
  if (f.needClear) rows.push({ name: '资金需求明确', v: 8, note: '事件驱动的资金缺口' });
  if (f.materials > 0) rows.push({ name: '材料齐备度', v: Math.round(f.materials * 0.08), note: `${f.materials}%` });
  if (f.histConv > 0) rows.push({ name: '同类商机历史转化', v: f.histConv, note: '行内历史数据' });
  if (f.products >= 3) rows.push({ name: '多产品持有', v: 4, note: `${f.products} 项` });
  if (f.competitors > 0) rows.push({ name: '竞争行已报价', v: -Math.min(12, f.competitors * 6), note: `${f.competitors} 家` });
  if (f.firstLoan) rows.push({ name: '首次融资 · 审批时长敏感', v: -5, note: '需时效承诺' });
  if (f.priceObjection) rows.push({ name: '价格异议', v: -6, note: '利率 / 费率' });
  if (f.delayed) rows.push({ name: '客户推迟或超 14 天未回应', v: -8, note: '需换切入点' });
  if (f.riskWatch) rows.push({ name: '公开负面 / 关联风险关注', v: -8, note: '公开信息' });
  return rows;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function probOf(o: Opp) {
  if (o.lost) return 0;
  if (o.stage === '落地') return 100;
  const s = factorRows(o.f, o.stage).reduce((a, r) => a + r.v, 0);
  return clamp(Math.round(BASE[o.stage] + s), 3, 97);
}
const WEEKS = ['7 周前', '6 周前', '5 周前', '4 周前', '3 周前', '2 周前', '上周', '本周'];
function mkHist(id: string, cur: number, start: number) {
  const r = rng(id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) * 7 + 2026);
  return WEEKS.map((w, i) => {
    const t = i / (WEEKS.length - 1);
    const v = i === WEEKS.length - 1 ? cur : start + (cur - start) * t + (r() - 0.5) * 6;
    return { w, p: clamp(Math.round(v), 2, 99) };
  });
}
type OppSeed = Omit<Opp, 'hist' | 'logs'> & { start: number; logs: { d: string; t: string; delta: number }[] };
const SEEDS: OppSeed[] = [
  { id: 'o01', co: '宁桂精密机械', product: '流动资金贷款 + 供应链票据贴现', amount: 3000, kind: '贷款', stage: '方案', next: '收齐定点通知书与近两年审计报告，反馈预审要点', due: '09-11', last: { d: '09-04', t: '财务总监第二次会面，确认定点订单 SOP 在 11 月，备货缺口约 1,500 万' }, created: '08-05', start: 38,
    f: F({ mainBank: true, meetings: 2, needClear: true, materials: 55, histConv: 6, products: 3, competitors: 2, firstLoan: true }),
    logs: [{ d: '09-04', t: '财务总监二次会面，确认 SOP 与资金缺口', delta: 6 }, { d: '08-28', t: '客户告知同城两家银行已报价', delta: -12 }, { d: '08-20', t: '首次会面，介绍首贷流程', delta: 8 }] },
  { id: 'o02', co: '衡瑞医药流通', product: '续贷 1,500 万 + 应收账款保理 500 万', amount: 2000, kind: '贷款', stage: '审批', next: '跟进审批进度，补充医院配送合同复印件', due: '09-12', last: { d: '09-03', t: '材料已提交审批，风险经理提出补充 2 份配送合同' }, created: '07-22', start: 60,
    f: F({ meetings: 2, needClear: true, materials: 85, histConv: 3, products: 4, competitors: 1 }),
    logs: [{ d: '09-03', t: '进入审批，补充配送合同', delta: 15 }, { d: '08-25', t: '续贷材料收齐', delta: 6 }] },
  { id: 'o03', co: '嘉禾连锁餐饮', product: '代发工资 + 收单聚合支付', amount: 800, kind: '存款', stage: '谈判', next: '两天内给出收单费率报价，附对账便利说明', due: '09-09', last: { d: '09-05', t: '运营总监认可代发方案，对收单费率有异议（现用 0.6%）' }, created: '08-12', start: 30,
    f: F({ meetings: 2, needClear: true, materials: 70, histConv: 3, products: 2, competitors: 1, priceObjection: true }),
    logs: [{ d: '09-05', t: '代发方案获认可，收单费率有异议', delta: -6 }, { d: '08-28', t: '运营总监会面', delta: 8 }] },
  { id: 'o04', co: '桂澜跨境电商', product: '远期结汇 + 出口押汇', amount: 14000, kind: '结汇', stage: '方案', next: '安排结汇操作培训，提供近 3 个月报价对比', due: '09-15', last: { d: '08-29', t: '外贸经理咨询结汇价格，现通过第三方平台结汇' }, created: '08-15', start: 28,
    f: F({ meetings: 1, needClear: false, materials: 40, histConv: 3, products: 2, competitors: 1 }),
    logs: [{ d: '08-29', t: '外贸经理咨询结汇价格', delta: 4 }] },
  { id: 'o05', co: '岭南精工模具', product: '流动资金贷款', amount: 2000, kind: '贷款', stage: '初访', next: '约见总经理，了解模具设备投入与排产', due: '09-10', last: { d: '09-02', t: '电话联系，客户对首贷流程感兴趣，约本周上门' }, created: '08-26', start: 22,
    f: F({ meetings: 1, needClear: true, materials: 10, histConv: 3, products: 3, firstLoan: true }),
    logs: [{ d: '09-02', t: '电话约访', delta: 4 }] },
  { id: 'o06', co: '澜科汽车零部件', product: '流动资金贷款 + 票据贴现', amount: 1500, kind: '贷款', stage: '线索', next: '首访摸底：定点订单规模与备货周期', due: '09-11', last: { d: '09-01', t: '公开定点公告命中筛选，尚未接触' }, created: '09-01', start: 20,
    f: F({ needClear: true, materials: 0, histConv: 3, products: 2 }),
    logs: [{ d: '09-01', t: '由客群筛选转入商机', delta: 0 }] },
  { id: 'o07', co: '东岭新能源', product: '固定资产贷款（二期产线）', amount: 8000, kind: '贷款', stage: '谈判', next: '与分行审批部预沟通期限与担保结构', due: '09-16', last: { d: '09-04', t: '董事长会面，二期投资 2.1 亿，希望 8 年期；两家银行竞争' }, created: '07-10', start: 45,
    f: F({ meetings: 3, needClear: true, materials: 80, histConv: 3, products: 4, competitors: 2 }),
    logs: [{ d: '09-04', t: '董事长会面，明确期限诉求', delta: 4 }, { d: '08-22', t: '两家银行报价', delta: -12 }] },
  { id: 'o08', co: '融岚软件', product: '知识产权质押续作 + 代发工资', amount: 500, kind: '贷款', stage: '审批', next: '审批通过后当天安排签约与代发开户', due: '09-10', last: { d: '09-05', t: '审批流程进入终审，评估报告已出' }, created: '08-01', start: 70,
    f: F({ mainBank: true, meetings: 2, needClear: true, materials: 95, histConv: 3, products: 3 }),
    logs: [{ d: '09-05', t: '进入终审', delta: 5 }] },
  { id: 'o09', co: '晟禾食品集团', product: '集团授信份额提升', amount: 5000, kind: '贷款', stage: '方案', next: '出具集团综合方案，说明关联客户风险隔离安排', due: '09-18', last: { d: '09-01', t: '集团财务总监会面，关注本行综合服务；彩晟传导风险需在方案中说明' }, created: '07-28', start: 40,
    f: F({ meetings: 2, needClear: false, materials: 50, histConv: 3, products: 5, competitors: 3, riskWatch: true }),
    logs: [{ d: '09-01', t: '集团财务总监会面', delta: 4 }, { d: '08-18', t: '三家银行竞争份额', delta: -12 }] },
  { id: 'o10', co: '蓝湾生物医药', product: '科创信用贷', amount: 800, kind: '贷款', stage: '初访', next: '收集专精特新证书与研发投入明细', due: '09-14', last: { d: '09-03', t: '联合创始人会面，研发投入大，希望信用方式' }, created: '08-27', start: 25,
    f: F({ meetings: 1, needClear: true, materials: 20, histConv: 3, products: 2 }),
    logs: [{ d: '09-03', t: '联合创始人会面', delta: 4 }] },
  { id: 'o11', co: '中远冷链物流', product: '结算套餐 + 代发工资', amount: 300, kind: '存款', stage: '线索', next: '换切入点：先做新设子公司开户', due: '09-19', last: { d: '08-18', t: '客户表示年底再谈，18 天未回应' }, created: '08-10', start: 18,
    f: F({ meetings: 0, materials: 0, histConv: 3, products: 2, delayed: true }),
    logs: [{ d: '08-18', t: '客户推迟至年底', delta: -8 }] },
  { id: 'o12', co: '昊辰电子科技', product: '流动资金贷款', amount: 1200, kind: '贷款', stage: '方案', next: '按综合收益重新测算定价，谈结算集中度', due: '09-12', last: { d: '09-04', t: '财务负责人认为利率偏高，他行报价低 20BP' }, created: '08-14', start: 35,
    f: F({ meetings: 2, needClear: true, materials: 60, histConv: 3, products: 2, competitors: 1, priceObjection: true }),
    logs: [{ d: '09-04', t: '利率异议，他行低 20BP', delta: -12 }, { d: '08-26', t: '财务负责人会面', delta: 8 }] },
  { id: 'o13', co: '汇源物流', product: '车辆融资租赁', amount: 2500, kind: '租赁', stage: '谈判', next: '与租赁公司确认残值方案，回应价格异议', due: '09-13', last: { d: '09-02', t: '客户比较两家租赁方案，行业运价下行' }, created: '07-30', start: 40,
    f: F({ meetings: 2, needClear: true, materials: 75, histConv: 3, products: 3, competitors: 2, priceObjection: true, riskWatch: true }),
    logs: [{ d: '09-02', t: '两家租赁方案比较', delta: -6 }] },
  { id: 'o14', co: '华驰智能装备', product: '供应链保理', amount: 1000, kind: '贷款', stage: '落地', next: '已放款，转入贷后', due: '09-03', last: { d: '09-03', t: '放款 1,000 万，首笔保理款到账' }, created: '07-05', start: 55,
    f: F({ meetings: 3, needClear: true, materials: 100, histConv: 3, products: 4 }),
    logs: [{ d: '09-03', t: '放款落地', delta: 25 }] },
  { id: 'o15', co: '星桥数据服务', product: '科创信用贷', amount: 300, kind: '贷款', stage: '落地', next: '已放款，转入贷后', due: '08-27', last: { d: '08-27', t: '放款 300 万' }, created: '07-15', start: 45,
    f: F({ mainBank: true, meetings: 2, needClear: true, materials: 100, histConv: 3, products: 1 }),
    logs: [{ d: '08-27', t: '放款落地', delta: 20 }] },
  { id: 'o16', co: '安泰医疗器械', product: '流动资金贷款', amount: 600, kind: '贷款', stage: '初访', next: '了解中标项目回款节奏，约财务会面', due: '09-15', last: { d: '09-01', t: '首访，总经理介绍中标情况，财务未在场' }, created: '08-29', start: 24,
    f: F({ meetings: 1, needClear: true, materials: 15, histConv: 3, products: 2, competitors: 1 }),
    logs: [{ d: '09-01', t: '首访总经理', delta: 4 }] },
];
const INIT: Opp[] = SEEDS.map((s) => {
  const o: Opp = { ...s, hist: [], logs: s.logs };
  o.hist = mkHist(s.id, probOf(o), s.start);
  return o;
});

/* ---------- 跟进记录 → 因素重算（关键词规则） */
function applyFollowUp(f: Factors, text: string): { f: Factors; tags: string[] } {
  const t = text;
  const n: Factors = { ...f };
  const tags: string[] = [];
  const has = (...ks: string[]) => ks.some((k) => t.includes(k));
  if (has('会面', '见面', '拜访', '决策人', '总经理', '财务总监', '董事长', '面谈')) { n.meetings = Math.min(3, n.meetings + 1); tags.push('决策人会面 +1'); }
  if (has('材料', '报表', '审计', '合同', '证书', '收齐', '收到')) { n.materials = Math.min(100, n.materials + 25); tags.push('材料齐备度 +25%'); }
  if (has('报价', '竞争', '他行', '其他银行', '另一家')) { n.competitors = Math.min(3, n.competitors + 1); tags.push('竞争行 +1'); }
  if (has('利率高', '价格', '费率', '成本高', '偏高', 'BP', '太贵')) { n.priceObjection = true; tags.push('价格异议'); }
  if (has('推迟', '延后', '暂缓', '再等', '年底', '未回应', '没回')) { n.delayed = true; tags.push('客户推迟'); }
  if (has('回复', '回应', '愿意', '同意', '接受', '认可', '确认')) { if (n.delayed) { n.delayed = false; tags.push('恢复响应'); } }
  if (has('缺口', '需求明确', '排产', '订单', '定点', '中标', '扩产')) { n.needClear = true; tags.push('需求明确'); }
  if (has('主办', '归集', '结算集中')) { n.mainBank = true; tags.push('结算主办行'); }
  if (has('接受价格', '同意价格', '价格没问题', '认可定价')) { n.priceObjection = false; tags.push('价格异议消除'); }
  if (has('被执行', '逾期', '负面', '诉讼')) { n.riskWatch = true; tags.push('公开负面信息'); }
  return { f: n, tags };
}

/* ---------- AI 建议（规则映射，文案生成） */
function advise(o: Opp, p: number) {
  const f = o.f;
  const acts: { t: string; why: string }[] = [];
  const talks: string[] = [];
  if (o.stage === '落地') return { acts: [{ t: '转入贷后管理，30 天内首次回访', why: '已放款' }], talks: ['「资金到账后有任何使用上的问题随时联系我，首月我会来看一次用款情况。」'], timing: '放款后 30 天内' };
  if (o.lost) return { acts: [{ t: '3 个月后回访，记录流失原因', why: '已流失' }], talks: [], timing: '—' };
  if (f.delayed) { acts.push({ t: '换切入点：先做结算 / 代发或开户等低门槛业务，保持每两周一次触达', why: '客户推迟，正面推进融资效果差' }); talks.push('「融资的事不着急，先把日常结算和发薪弄顺，等您那边时机合适我们再谈。」'); }
  if (f.competitors > 0 && (o.stage === '方案' || o.stage === '谈判')) { acts.push({ t: `3 个工作日内反馈预审要点，提出「审批时效承诺 + ${o.kind === '贷款' ? '供应链票据 / 结算' : '综合服务'}组合」`, why: `${f.competitors} 家竞争行已报价，拖延会失去窗口` }); talks.push('「我们不评价其他银行的方案，只谈本行能为您做什么：审批时效我们承诺 X 个工作日，组合方案综合成本更低。」'); }
  if (f.materials < 70 && o.stage !== '线索') { acts.push({ t: `${o.due} 前收齐关键材料（当前齐备 ${f.materials}%）`, why: '材料是进入审批的硬门槛' }); talks.push('「材料清单我按优先级标了 3 项必需件，先给这 3 项我们就能启动预审。」'); }
  if (f.meetings < 2 && o.stage !== '线索') { acts.push({ t: '约见财务负责人或决策人（当前会面 ' + f.meetings + ' 次）', why: '决策人触达是概率提升最大的单一因素' }); talks.push('「方案细节涉及资金安排，方便的话请财务负责人一起，我们一次把问题聊透。」'); }
  if (f.priceObjection) { acts.push({ t: '按综合收益重新测算定价，用结算集中度 / 代发换取价格空间', why: '价格异议需要用结构而非让利解决' }); talks.push('「利率只是综合成本的一部分，把结算和发薪放过来，我们能在综合定价上给出更好的安排。」'); }
  if (f.firstLoan) { acts.push({ t: '给出明确的审批时间表并每周同步进度', why: '首次融资客户对审批时长敏感' }); talks.push('「首次授信流程我给您列了时间表，每周五我同步一次进度，不会让您等得没底。」'); }
  if (f.riskWatch) { acts.push({ t: '方案中说明风险隔离与担保安排，与风险经理预沟通', why: '公开负面 / 关联风险会拉长审批' }); }
  if (o.stage === '线索') { acts.push({ t: '基于公开公告准备首访问题清单，本周内完成首访', why: '线索阶段以建立接触为目标' }); talks.push('「看到贵司近期的公告，恭喜。今天主要想了解一下项目推进上有没有资金安排方面我们能帮忙的。」'); }
  if (o.stage === '审批') { acts.push({ t: '每日跟进审批节点，提前准备签约与放款要件', why: '审批阶段时效决定客户体验' }); talks.push('「审批已到最后环节，签约要件我先发您准备，通过后当天就能安排。」'); }
  if (acts.length === 0) { acts.push({ t: '保持每周一次触达，推进到下一阶段', why: '无明显负向因素' }); talks.push('「按我们上次约定的节奏，这周把下一步定下来。」'); }
  const timing = p >= 70 ? '本周内推进' : p >= 45 ? '3 个工作日内' : '两周内换策略';
  return { acts: acts.slice(0, 4), talks: talks.slice(0, 3), timing };
}
const fmtW = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(2)} 亿` : `${n.toLocaleString('zh-CN')} 万`);
const QUICK = ['财务总监会面，确认资金缺口', '收到近两年审计报表', '他行报价低 20BP', '客户表示年底再谈', '客户认可方案，同意价格', '材料收齐，进入审批'];
interface HistRow { d: string; co: string; t: string }
const HIST_INIT: HistRow[] = [
  { d: '09-05', co: '融岚软件', t: '进入终审 · 概率 +5' }, { d: '09-05', co: '嘉禾连锁餐饮', t: '收单费率异议 · 概率 -6' },
  { d: '09-04', co: '宁桂精密机械', t: '财务总监二次会面 · 概率 +6' }, { d: '09-04', co: '昊辰电子科技', t: '利率异议 · 概率 -12' },
  { d: '09-03', co: '华驰智能装备', t: '放款落地 1,000 万' }, { d: '09-03', co: '衡瑞医药流通', t: '进入审批 · 概率 +15' },
];
type TipItem = { name?: string | number; value?: number | string | ReadonlyArray<number | string>; payload?: unknown };
function Tip({ active, payload, label, unit }: { active?: boolean; payload?: ReadonlyArray<TipItem>; label?: unknown; unit?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const d = p.payload as { note?: string } | undefined;
  return <div className="dp-tip"><b>{String(label ?? '')}</b>{String(p.value)}{unit}{d?.note ? ` · ${d.note}` : ''}</div>;
}
function useSteps(total: number, running: boolean, token: number, gap = 420) {
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
const CALC_STEPS = ['读取跟进记录与合作数据', '阶段模型 + 因素权重计算', '生成转化策略与话术'];

/* ============================================================ 页面 */
export default function DealProbability() {
  const [opps, setOpps] = useState<Opp[]>(INIT);
  const [selId, setSelId] = useState<string | null>('o01');
  const [note, setNote] = useState('');
  const [token, setToken] = useState(1);
  const [hist, setHist] = useState<HistRow[]>(HIST_INIT);
  const [toast, setToast] = useState<string | null>(null);
  const n = useSteps(CALC_STEPS.length, token > 0, token);
  const calcDone = n > CALC_STEPS.length;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const sel = opps.find((o) => o.id === selId) ?? null;
  const selP = sel ? probOf(sel) : 0;
  const kpi = useMemo(() => {
    const active = opps.filter((o) => o.stage !== '落地' && !o.lost);
    const weighted = active.reduce((s, o) => s + o.amount * probOf(o) / 100, 0);
    const month = active.filter((o) => (o.stage === '审批' || o.stage === '谈判') && probOf(o) >= 65).reduce((s, o) => s + o.amount, 0);
    const cycle = Math.round(opps.filter((o) => o.stage === '落地').reduce((s, o) => s + (new Date(`2026-${o.due}`).getTime() - new Date(`2026-${o.created}`).getTime()) / 86400000, 0) / Math.max(1, opps.filter((o) => o.stage === '落地').length));
    return { n: active.length, amount: active.reduce((s, o) => s + o.amount, 0), weighted, month, cycle, landed: opps.filter((o) => o.stage === '落地').length };
  }, [opps]);

  const pick = (id: string) => { setSelId(id); setToken((t) => t + 1); setNote(''); };
  const submit = () => {
    if (!sel || !note.trim()) return;
    const before = probOf(sel);
    const { f, tags } = applyFollowUp(sel.f, note);
    const updated: Opp = { ...sel, f, last: { d: '09-06', t: note.trim() } };
    const after = probOf(updated);
    updated.hist = [...sel.hist, { w: `更新 ${sel.hist.length - WEEKS.length + 1}`, p: after }];
    updated.logs = [{ d: '09-06', t: note.trim(), delta: after - before }, ...sel.logs];
    setOpps((os) => os.map((o) => (o.id === sel.id ? updated : o)));
    setHist((h) => [{ d: '09-06', co: sel.co, t: `${tags.length ? tags.join(' · ') : '跟进记录'} · 概率 ${after - before >= 0 ? '+' : ''}${after - before}` }, ...h].slice(0, 8));
    setToast(tags.length ? `已重算：${tags.join('、')}（${before}% → ${after}%）` : `跟进已记录，因素无变化（${after}%）`);
    setNote('');
    setToken((t) => t + 1);
  };
  const advance = () => {
    if (!sel || sel.stage === '落地') return;
    const idx = STAGES.indexOf(sel.stage);
    const next = STAGES[idx + 1];
    const before = probOf(sel);
    const updated: Opp = { ...sel, stage: next, lost: false };
    const after = probOf(updated);
    updated.hist = [...sel.hist, { w: `→${next}`, p: after }];
    updated.logs = [{ d: '09-06', t: `推进到「${next}」`, delta: after - before }, ...sel.logs];
    if (next === '落地') { updated.next = '已放款，转入贷后'; updated.due = '09-06'; }
    setOpps((os) => os.map((o) => (o.id === sel.id ? updated : o)));
    setHist((h) => [{ d: '09-06', co: sel.co, t: `推进到「${next}」 · 概率 +${after - before}` }, ...h].slice(0, 8));
    setToast(`${sel.co} 已推进到「${next}」`);
    setToken((t) => t + 1);
  };
  const lose = () => {
    if (!sel) return;
    setOpps((os) => os.map((o) => (o.id === sel.id ? { ...o, lost: true, logs: [{ d: '09-06', t: '标记流失', delta: -probOf(o) }, ...o.logs] } : o)));
    setHist((h) => [{ d: '09-06', co: sel.co, t: '标记流失' }, ...h].slice(0, 8));
    setToast(`${sel.co} 已标记流失，3 个月后提醒回访`);
  };

  const rows = sel ? factorRows(sel.f, sel.stage) : [];
  const adv = sel ? advise(sel, selP) : null;
  const rangeLo = sel ? clamp(selP - RANGE[sel.stage], 0, 100) : 0;
  const rangeHi = sel ? clamp(selP + RANGE[sel.stage], 0, 100) : 0;
  const cls = (p: number) => (p >= 65 ? 'hi' : p >= 40 ? 'mid' : 'lo');

  return (
    <div>
      <style>{CSS}</style>
      <div className="dp-crumb"><Link to="/p/P01">智慧获客引擎</Link><span>›</span><b>商机成交概率预测</b></div>
      <div className="page-h">
        <div>
          <h1><TrendingUp size={20} style={{ verticalAlign: -3, marginRight: 6 }} />商机成交概率预测</h1>
          <p>对每个在跟商机给出成交概率区间、关键影响因素与下一步转化动作；录入跟进记录后概率与因素即时重算。概率为营销排序参考，不构成授信预审结论。</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={() => setToast('已按最新跟进记录刷新全部商机预测')}><RefreshCw size={13} />刷新预测</button>
          <button className="btn ghost sm" onClick={() => setToast('商机看板已导出（xlsx）')}><Download size={13} />导出看板</button>
          <button className="btn sm" onClick={() => setToast('新建商机：请从客群筛选或客户画像中选择企业')}><Plus size={13} />新建商机</button>
        </div>
      </div>

      <div className="dp-kpi fade-in">
        <div className="tile"><span className="ico"><Target size={15} /></span><b className="num">{kpi.n}<small>个</small></b><span>在跟商机 · 合计 {fmtW(kpi.amount)}</span></div>
        <div className="tile gold"><span className="ico"><Wallet size={15} /></span><b className="num">{fmtW(Math.round(kpi.weighted))}</b><span>加权金额（金额 × 概率）</span></div>
        <div className="tile green"><span className="ico"><CalendarCheck size={15} /></span><b className="num">{fmtW(kpi.month)}</b><span>本月预计落地 · 谈判/审批且概率 ≥ 65%</span></div>
        <div className="tile red"><span className="ico"><Hourglass size={15} /></span><b className="num">{kpi.cycle}<small>天</small></b><span>平均成交周期 · 本季已落地 {kpi.landed} 个</span></div>
      </div>

      <div className="dp-layout">
        {/* ---------------- 看板 ---------------- */}
        <div className="card fade-in" style={{ animationDelay: '60ms', minWidth: 0 }}>
          <div className="card-h"><div className="card-t"><Landmark size={14} />商机看板</div><span className="card-s">点击卡片查看影响因素分析 · 概率随跟进记录更新</span></div>
          <div className="dp-board">
            {STAGES.map((st, si) => {
              const list = opps.filter((o) => o.stage === st);
              const sum = list.filter((o) => !o.lost).reduce((s, o) => s + o.amount, 0);
              return (
                <div key={st} className="dp-col">
                  <div className={`dp-colh s${si}`}><div><b>{st}</b><small>{sum ? fmtW(sum) : '—'} · 基准 {BASE[st]}%</small></div><span className="cnt">{list.length}</span></div>
                  {list.map((o) => {
                    const p = probOf(o);
                    return (
                      <div key={o.id} className={`dp-card${selId === o.id ? ' on' : ''}${o.lost ? ' lost' : ''}`} onClick={() => pick(o.id)}>
                        <div className="co"><span>{o.co}</span><small>{o.kind}</small></div>
                        <div className="pr">{o.product}</div>
                        <div className="amt num">{fmtW(o.amount)}{o.kind === '存款' && <small>预计日均</small>}{o.kind === '结汇' && <small>年结汇量</small>}</div>
                        <div className={`dp-prob ${cls(p)}`}><div className="bar"><i style={{ width: `${p}%` }} /></div><b className="num">{o.lost ? '流失' : `${p}%`}</b></div>
                        <div className="nx"><b><ChevronRight size={11} style={{ verticalAlign: -1 }} />下一步</b><span>{o.next}{o.stage !== '落地' && !o.lost && <> · <span className="due">{o.due} 前</span></>}</span></div>
                        <div className="lf"><Clock size={11} style={{ flexShrink: 0, marginTop: 2 }} /><span>{o.last.d} {o.last.t}</span></div>
                      </div>
                    );
                  })}
                  {list.length === 0 && <div className="dp-empty" style={{ minHeight: 80, fontSize: 12 }}><div>暂无</div></div>}
                </div>
              );
            })}
          </div>
          <div className="dp-note"><ShieldCheck size={12} /> 概率 = 阶段基准 + 因素加减分（主办行关系、决策人触达、需求明确、材料齐备、竞争报价、审批时限、价格异议、推迟、公开负面），区间按阶段给定。</div>
        </div>

        {/* ---------------- 影响因素分析 ---------------- */}
        <div className="dp-panel">
          <div className="card gold fade-in" style={{ animationDelay: '120ms' }}>
            {!sel && <div className="dp-empty"><div><div className="ring"><Target size={20} /></div>点击看板中的商机卡片<br />查看影响因素分析与转化建议。</div></div>}
            {sel && (
              <>
                <div className="card-h">
                  <div className="card-t"><Target size={14} />影响因素分析{!calcDone && <span className="pulse" />}</div>
                  <button className="btn sm ghost" onClick={() => setSelId(null)}><X size={12} /></button>
                </div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>{sel.co}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6 }}>{sel.product} · {fmtW(sel.amount)} · 阶段「{sel.stage}」 · 创建 {sel.created}</div>
                {!calcDone && (
                  <div className="think" style={{ marginBottom: 8 }}>
                    {CALC_STEPS.map((s, i) => {
                      const st = i < n - 1 ? 'done' : i === n - 1 ? 'active' : 'pending';
                      if (st === 'pending') return null;
                      return <div key={s} className={`step fade-in ${st}`}><div className="n" style={st === 'done' ? { background: 'var(--g-green)' } : undefined}>{st === 'done' ? <Check size={12} /> : i + 1}</div><div><b>{s}</b></div></div>;
                    })}
                  </div>
                )}
                {calcDone && (
                  <div className="fade-in">
                    <div className="dp-big">
                      <b className={selP >= 65 ? 'green-text' : selP >= 40 ? 'gold-text' : 'red-text'}>{sel.lost ? '流失' : `${selP}%`}</b>
                      {!sel.lost && sel.stage !== '落地' && <div className="rg">成交概率区间 <em>{rangeLo}%–{rangeHi}%</em><br />阶段基准 {BASE[sel.stage]}% · 因素净值 {selP - BASE[sel.stage] >= 0 ? '+' : ''}{selP - BASE[sel.stage]}</div>}
                      {sel.stage === '落地' && <div className="rg">已落地 · {sel.last.d}</div>}
                    </div>
                    {!sel.lost && sel.stage !== '落地' && <div className="dp-rangebar"><div className="rg" style={{ left: `${rangeLo}%`, width: `${rangeHi - rangeLo}%` }} /><div className="pt" style={{ left: `${selP}%` }} /></div>}
                    <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>

                    {rows.length > 0 && (
                      <>
                        <div className="dp-sec">正向 / 负向因素</div>
                        <div style={{ height: Math.max(120, rows.length * 26 + 20) }}>
                          <ResponsiveContainer>
                            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 0 }} barCategoryGap="28%">
                              <defs>
                                <linearGradient id="dp-gpos" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6ee3ad" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
                                <linearGradient id="dp-gneg" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#ff7a70" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
                              </defs>
                              <CartesianGrid horizontal={false} stroke="rgba(120,100,60,.14)" />
                              <XAxis type="number" domain={[-14, 14]} tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="name" width={128} tick={{ fontSize: 10.5, fill: '#5f5850' }} axisLine={false} tickLine={false} />
                              <ReferenceLine x={0} stroke="#8c8478" />
                              <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit=" 分" />} />
                              <Bar dataKey="v" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                                {rows.map((r) => <Cell key={r.name} fill={r.v >= 0 ? 'url(#dp-gpos)' : 'url(#dp-gneg)'} />)}
                                <LabelList dataKey="v" position="right" fontSize={10.5} fontWeight={800} fill="#5f5850" formatter={(v) => (Number(v) > 0 ? `+${v}` : String(v))} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}

                    <div className="dp-sec">概率随时间变化</div>
                    <div style={{ height: 130 }}>
                      <ResponsiveContainer>
                        <AreaChart data={sel.hist} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                          <defs>
                            <linearGradient id="dp-ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3a93c" stopOpacity=".55" /><stop offset="1" stopColor="#c3272b" stopOpacity=".04" /></linearGradient>
                            <linearGradient id="dp-gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3272b" /><stop offset=".5" stopColor="#e3a93c" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                          <XAxis dataKey="w" tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<Tip unit="%" />} />
                          <Area type="monotone" dataKey="p" stroke="url(#dp-gl)" strokeWidth={2.5} fill="url(#dp-ga)" dot={{ r: 3, fill: '#fff', stroke: '#c3272b', strokeWidth: 2 }} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {adv && (
                      <>
                        <div className="dp-sec"><Lightbulb size={12} />下一步转化动作 · {adv.timing}</div>
                        {adv.acts.map((a) => <div key={a.t} className="dp-act" style={{ marginBottom: 6 }}><b><ArrowRight size={12} style={{ verticalAlign: -2 }} /> {a.t}</b><span style={{ color: 'var(--ink-3)', fontSize: 11.5 }}>原因：{a.why}</span></div>)}
                        {adv.talks.length > 0 && <div className="dp-sec"><MessageSquare size={12} />话术要点</div>}
                        {adv.talks.map((t, i) => <div key={t} className="dp-talk"><span className="n">{i + 1}</span><span>{t}</span></div>)}
                      </>
                    )}

                    <div className="dp-sec"><Send size={12} />录入跟进记录（即时重算）</div>
                    <textarea className="dp-ta" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：财务总监会面，确认资金缺口 1,500 万；他行报价低 20BP……" />
                    <div className="dp-quick">{QUICK.map((q) => <button key={q} onClick={() => setNote((v) => (v ? `${v}；${q}` : q))}>{q}</button>)}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn sm" onClick={submit} disabled={!note.trim()} style={!note.trim() ? { opacity: .5, cursor: 'not-allowed' } : undefined}><Send size={12} />提交并重算</button>
                      {!sel.lost && sel.stage !== '落地' && <button className="btn sm green" onClick={advance}><ThumbsUp size={12} />推进到「{STAGES[STAGES.indexOf(sel.stage) + 1]}」</button>}
                      {!sel.lost && sel.stage !== '落地' && <button className="btn sm ghost" onClick={lose}><ThumbsDown size={12} />标记流失</button>}
                    </div>

                    <div className="dp-sec"><Flag size={12} />该商机跟进日志</div>
                    {sel.logs.slice(0, 5).map((l, i) => <div key={i} className="dp-log"><span className="d">{l.d}</span><span>{l.t}</span><span className={`delta ${l.delta >= 0 ? 'up' : 'down'}`}>{l.delta >= 0 ? '+' : ''}{l.delta}</span></div>)}
                    <div className="dp-note"><ShieldCheck size={12} /> 概率为营销排序参考，不构成授信预审结论。</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card fade-in" style={{ marginTop: 16, animationDelay: '180ms' }}>
        <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近更新 · 点击定位商机</span></div>
        <div className="dp-hist">
          {hist.map((h, i) => <div key={i} className="h" onClick={() => { const o = opps.find((x) => x.co === h.co); if (o) pick(o.id); }}><span className="d">{h.d}</span><span className="t"><b>{h.co}</b> {h.t}</span><ArrowRight size={12} color="var(--ink-3)" /></div>)}
        </div>
      </div>

      {toast && <div className="dp-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
