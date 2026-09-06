import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, LabelList,
} from 'recharts';
import {
  Radar, Sparkles, Check, RotateCcw, Filter, Play, ChevronUp, ChevronDown, CalendarPlus, UserSearch, Download, Save,
  ShieldCheck, History, Target, TrendingUp, Building2, MapPin, Wallet, Bookmark, ArrowRight, X, ListChecks,
} from 'lucide-react';
import { COMPANIES } from '../../data/companies';
import { rng } from '../../lib/rng';

/* ============================================================ 样式（页面私有，前缀 ts-） */
const CSS = `
.ts-crumb { font-size: 12.5px; color: var(--ink-3); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.ts-crumb a { color: var(--gold-3); font-weight: 700; } .ts-crumb b { color: var(--ink); }
.ts-layout { display: grid; grid-template-columns: 286px minmax(0,1fr) 312px; gap: 16px; align-items: start; }
@media (max-width: 1400px) { .ts-layout { grid-template-columns: 270px minmax(0,1fr); } .ts-layout > .ts-right { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; } }
@media (max-width: 980px) { .ts-layout { grid-template-columns: 1fr; } .ts-layout > .ts-right { grid-template-columns: 1fr; } }
.ts-right { display: flex; flex-direction: column; gap: 16px; }
.ts-lbl { font-size: 11.5px; font-weight: 800; letter-spacing: .12em; color: var(--gold-3); margin: 14px 0 7px; display: flex; align-items: center; justify-content: space-between; }
.ts-lbl:first-of-type { margin-top: 0; }
.ts-lbl small { font-weight: 700; letter-spacing: 0; color: var(--ink-3); }
.ts-ta { width: 100%; min-height: 64px; resize: vertical; padding: 9px 11px; border-radius: 10px; border: 0; outline: none; font: inherit; font-size: 12.5px; color: var(--ink); background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); }
.ts-ta:focus { box-shadow: inset 0 0 0 2px rgba(195,39,43,.4); }
.ts-opts { display: flex; flex-wrap: wrap; gap: 5px; }
.ts-opt { border: 0; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; padding: 4px 9px; border-radius: 999px; color: var(--ink-2); background: linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,247,236,.7)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.22); transition: all .12s ease; }
.ts-opt:hover { box-shadow: inset 0 0 0 1px rgba(201,162,77,.5); }
.ts-opt.on { background: var(--g-red); color: #fff; box-shadow: 0 6px 14px rgba(195,39,43,.22); }
.ts-opt.on.g { background: var(--g-green); box-shadow: 0 6px 14px rgba(31,138,90,.22); }
.ts-opt.on.b { background: linear-gradient(135deg,#7fb0ff,#3a86ff); box-shadow: 0 6px 14px rgba(58,134,255,.22); }
.ts-seg { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 5px; }
.ts-seg .ts-opt { text-align: center; border-radius: 9px; padding: 6px 8px; }
.ts-range { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.ts-range input[type=range] { flex: 1; accent-color: #c3272b; }
.ts-range b { min-width: 46px; text-align: right; }
.ts-w { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 4px; }
.ts-w span { width: 52px; color: var(--ink-3); font-weight: 700; }
.ts-w input { flex: 1; accent-color: #c9a24d; }
.ts-w b { width: 30px; text-align: right; }
.ts-btns { display: flex; gap: 8px; margin-top: 16px; }
.ts-btns .btn { flex: 1; justify-content: center; }
.ts-empty { min-height: 320px; display: grid; place-items: center; text-align: center; color: var(--ink-3); font-size: 13px; }
.ts-empty .ring { width: 58px; height: 58px; border-radius: 50%; background: var(--g-iris-soft); display: grid; place-items: center; margin: 0 auto 10px; box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); color: var(--red); }
.ts-tiles { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
.ts-tiles .tile b small { font-size: 12px; color: var(--ink-3); margin-left: 3px; font-weight: 700; }
.ts-tiles .tile.gold::before { background: var(--g-gold); } .ts-tiles .tile.green::before { background: var(--g-green); } .ts-tiles .tile.red::before { background: var(--g-red); }
.ts-charts { display: grid; grid-template-columns: 1.15fr 1fr; gap: 16px; }
@media (max-width: 1100px) { .ts-charts { grid-template-columns: 1fr; } }
.ts-donut { position: relative; }
.ts-donut .c { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; pointer-events: none; line-height: 1.1; }
.ts-donut .c b { font-size: 22px; font-weight: 900; display: block; } .ts-donut .c span { font-size: 11px; color: var(--ink-3); }
.ts-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 11.5px; color: var(--ink-2); margin-top: 4px; }
.ts-legend span { display: inline-flex; align-items: center; gap: 5px; } .ts-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.ts-tip { padding: 8px 11px; border-radius: 10px; background: var(--g-holo); box-shadow: var(--shadow), inset 0 0 0 1px rgba(201,162,77,.3); font-size: 12px; }
.ts-tip b { display: block; margin-bottom: 2px; }
.ts-tblwrap { overflow-x: auto; margin-top: 4px; }
.ts-tbl th { cursor: pointer; user-select: none; white-space: nowrap; }
.ts-tbl th .sk { display: inline-flex; align-items: center; gap: 3px; }
.ts-tbl th.on { color: var(--red-3); }
.ts-tbl td { vertical-align: middle; white-space: nowrap; }
.ts-tbl tr.sel td { background: var(--g-gold-soft); }
.ts-tbl tr.hold td { opacity: .72; }
.ts-name { font-weight: 800; display: flex; align-items: center; gap: 6px; }
.ts-name small { font-weight: 600; color: var(--ink-3); }
.ts-score { display: flex; align-items: center; gap: 7px; min-width: 96px; }
.ts-score .bar { flex: 1; height: 6px; } .ts-score b { width: 24px; text-align: right; font-size: 12.5px; }
.ts-score.v .bar i { background: var(--g-gold); } .ts-score.p .bar i { background: var(--g-green); }
.ts-pri { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; font-weight: 900; font-size: 12.5px; color: #fff; }
.ts-pri.A { background: var(--g-red); } .ts-pri.B { background: var(--g-gold); color: #3a2a08; } .ts-pri.C { background: linear-gradient(135deg,#7fb0ff,#3a86ff); } .ts-pri.H { background: linear-gradient(135deg,#d8d2c6,#9d9484); }
.ts-chk { width: 16px; height: 16px; border-radius: 5px; background: var(--g-gold-soft); box-shadow: inset 0 0 0 1px rgba(201,162,77,.5); display: grid; place-items: center; color: #fff; cursor: pointer; }
.ts-chk.on { background: var(--g-red); box-shadow: none; }
.ts-act { display: flex; gap: 5px; }
.ts-bulk { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; background: var(--g-red-soft); font-size: 12.5px; margin-top: 8px; }
.ts-feat { display: flex; flex-direction: column; gap: 6px; }
.ts-feat .f { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 10px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); font-size: 12px; }
.ts-feat .f .ico { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: var(--g-iris-soft); flex-shrink: 0; color: var(--red-3); }
.ts-feat .f b { display: block; font-size: 12.5px; }
.ts-feat .f span { color: var(--ink-2); }
.ts-sug { display: flex; gap: 10px; align-items: flex-start; padding: 9px 11px; border-radius: 11px; background: var(--g-gold-soft); box-shadow: inset 0 0 0 1px rgba(201,162,77,.2); margin-bottom: 7px; font-size: 12.5px; }
.ts-sug .n { width: 22px; height: 22px; border-radius: 7px; background: var(--g-iris); color: #fff; display: grid; place-items: center; font-weight: 900; font-size: 11px; flex-shrink: 0; }
.ts-sug p { color: var(--ink-2); font-size: 12px; margin-top: 2px; }
.ts-hist { display: flex; flex-direction: column; gap: 6px; }
.ts-hist .h { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px; background: linear-gradient(90deg, rgba(255,255,255,.7), rgba(255,247,236,.55) 60%, rgba(236,248,243,.5)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.14); font-size: 12px; cursor: pointer; }
.ts-hist .h:hover { box-shadow: inset 0 0 0 1px rgba(201,162,77,.45); }
.ts-hist .h .d { font-weight: 800; color: var(--ink-3); width: 44px; flex-shrink: 0; font-size: 11.5px; }
.ts-hist .h .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }
.ts-port .kv .row span:first-child { color: var(--ink-3); }
.ts-reason { padding: 9px 11px; border-radius: 10px; background: var(--g-green-soft); font-size: 12.5px; line-height: 1.65; margin-top: 8px; }
.ts-talk { padding: 9px 11px; border-radius: 10px; background: var(--g-blue-soft); font-size: 12.5px; line-height: 1.65; margin-top: 8px; }
.ts-toast { position: fixed; left: 50%; bottom: 46px; transform: translateX(-50%); z-index: 60; padding: 10px 18px; border-radius: 999px; background: var(--g-green); color: #fff; font-weight: 700; font-size: 13px; box-shadow: 0 12px 30px rgba(31,138,90,.3); display: inline-flex; align-items: center; gap: 8px; }
.ts-step-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.ts-note { font-size: 11.5px; color: var(--ink-3); display: flex; align-items: center; gap: 6px; margin-top: 8px; }
`;

/* ============================================================ 数据 */
type Relation = '有结算无授信' | '有授信' | '公开名录';
type EventTag = '定点公告' | '中标公告' | '产能扩建' | '新设子公司' | '结算量上升' | '专精特新' | '招聘扩张';
interface Co {
  id: string; name: string; industry: string; district: string; relation: Relation; relationText: string;
  exposure: number; deposit: number; settlement: number; revenue: number; growth: number; founded: number;
  products: number; events: EventTag[]; share: number; exporter: boolean; hold: boolean; holdReason?: string;
}
const EVENT_W: Record<EventTag, number> = { 定点公告: 22, 中标公告: 14, 产能扩建: 10, 新设子公司: 6, 结算量上升: 10, 专精特新: 8, 招聘扩张: 5 };
const BOOM: Record<string, number> = { 新能源: 88, 汽车零部件: 82, 精密制造: 78, 电子信息: 76, 生物医药: 74, 医疗器械: 72, 新材料: 80, 软件服务: 75, 跨境电商: 70, 医药流通: 68, 食品加工: 62, 现代农业: 60, 物流仓储: 52, 连锁餐饮: 64, 商贸流通: 55, 建材贸易: 42, 有色加工: 58, 包装印刷: 50, 建筑工程: 45, 纺织服装: 40, 商业地产: 35, 轻工制造: 56, 酒店餐饮: 58 };

type BaseExt = { revenue: number; growth: number; founded: number; products: number; events: EventTag[]; share: number; exporter: boolean; hold?: string };
const BASE_EXT: Record<string, BaseExt> = {
  ninggui: { revenue: 1.8, growth: 24, founded: 2012, products: 3, events: ['定点公告', '招聘扩张', '新设子公司'], share: 53, exporter: true },
  shenghe: { revenue: 18, growth: 9, founded: 2001, products: 5, events: ['新设子公司'], share: 4, exporter: false },
  caisheng: { revenue: 0.9, growth: -30, founded: 2013, products: 1, events: [], share: 20, exporter: false, hold: '公开信息显示被执行 860 万，暂缓主动营销' },
  beiling: { revenue: 3.1, growth: 4, founded: 2006, products: 3, events: [], share: 30, exporter: false, hold: '票据逾期 1 笔，贷后处置中' },
  c05: { revenue: 2.3, growth: 21, founded: 2016, products: 2, events: ['结算量上升'], share: 48, exporter: true },
  c06: { revenue: 5.6, growth: 11, founded: 2008, products: 4, events: [], share: 35, exporter: false },
  c07: { revenue: 0.6, growth: -12, founded: 2014, products: 1, events: [], share: 25, exporter: false },
  c08: { revenue: 0.7, growth: 35, founded: 2017, products: 3, events: ['专精特新', '中标公告'], share: 60, exporter: false },
  c09: { revenue: 1.5, growth: 28, founded: 2015, products: 2, events: ['结算量上升', '招聘扩张'], share: 45, exporter: false },
  c10: { revenue: 9.2, growth: 30, founded: 2010, products: 4, events: ['产能扩建', '中标公告'], share: 38, exporter: false },
  c11: { revenue: 4.0, growth: -3, founded: 2009, products: 3, events: [], share: 40, exporter: false },
  c12: { revenue: 0.5, growth: 12, founded: 2016, products: 1, events: [], share: 42, exporter: false },
};
type ExtraRow = [string, string, string, string, Relation, number, number, number, number, number, number, number, EventTag[], number, boolean];
const EXTRA: ExtraRow[] = [
  ['x01', '澜科汽车零部件', '汽车零部件', '高新区', '有结算无授信', 0, 520, 3600, 2.4, 19, 2014, 2, ['定点公告'], 41, true],
  ['x02', '昊辰电子科技', '电子信息', '高新区', '有结算无授信', 0, 380, 2900, 1.6, 31, 2017, 2, ['中标公告', '招聘扩张'], 46, false],
  ['x03', '恒晟包装印刷', '包装印刷', '经开区', '有结算无授信', 0, 140, 1100, 0.7, 6, 2009, 1, [], 33, false],
  ['x04', '岭南精工模具', '精密制造', '经开区', '有结算无授信', 0, 610, 4100, 2.1, 22, 2011, 3, ['定点公告', '产能扩建'], 50, false],
  ['x05', '远航储能科技', '新能源', '临港区', '公开名录', 0, 0, 0, 3.2, 45, 2019, 0, ['中标公告', '产能扩建'], 0, false],
  ['x06', '华驰智能装备', '精密制造', '高新区', '有授信', 900, 700, 5200, 3.5, 15, 2008, 4, ['专精特新'], 44, true],
  ['x07', '鑫源建筑工程', '建筑工程', '老城区', '有结算无授信', 0, 260, 2300, 4.8, 3, 2005, 2, ['中标公告'], 18, false],
  ['x08', '悦禾生鲜连锁', '商贸流通', '城南区', '有结算无授信', 0, 180, 2100, 1.1, 26, 2018, 2, ['结算量上升'], 52, false],
  ['x09', '泰和纺织', '纺织服装', '西山区', '公开名录', 0, 0, 0, 1.4, -4, 2003, 0, [], 0, true],
  ['x10', '蓝湾生物医药', '生物医药', '东湖区', '有结算无授信', 0, 450, 1700, 0.9, 38, 2016, 2, ['专精特新', '招聘扩张'], 47, false],
  ['x11', '中远冷链物流', '物流仓储', '保税区', '有结算无授信', 0, 300, 2600, 1.8, 12, 2013, 2, ['新设子公司'], 36, false],
  ['x12', '锦程国际货运', '跨境电商', '保税区', '有结算无授信', 0, 240, 2800, 2.0, 17, 2015, 2, ['结算量上升'], 39, true],
  ['x13', '宏达铝业', '有色加工', '临港区', '公开名录', 0, 0, 0, 2.6, 8, 2007, 0, ['定点公告'], 0, false],
  ['x14', '绿谷现代农业', '现代农业', '城南区', '有结算无授信', 0, 60, 520, 0.4, 10, 2015, 1, [], 38, false],
  ['x15', '星桥数据服务', '软件服务', '江畔新区', '有结算无授信', 0, 210, 900, 0.6, 42, 2020, 1, ['专精特新', '中标公告'], 55, false],
  ['x16', '恒益商业地产', '商业地产', '老城区', '有授信', 4500, 1200, 7600, 6.5, 2, 2004, 3, [], 28, false],
  ['x17', '川野户外用品', '轻工制造', '城东区', '有结算无授信', 0, 170, 1500, 1.2, 14, 2012, 2, [], 37, true],
  ['x18', '安泰医疗器械', '医疗器械', '东湖区', '有结算无授信', 0, 330, 2000, 1.3, 27, 2014, 2, ['中标公告'], 43, false],
  ['x19', '明辉新材料', '新材料', '经开区', '公开名录', 0, 0, 0, 2.2, 33, 2018, 0, ['产能扩建', '定点公告'], 0, false],
  ['x20', '盛世酒店管理', '酒店餐饮', '城北区', '有结算无授信', 0, 130, 1400, 0.8, 5, 2010, 1, [], 31, false],
];
const relationOf = (exposure: number, settlement: number): Relation => (exposure > 0 ? '有授信' : settlement > 0 ? '有结算无授信' : '公开名录');
const POOL: Co[] = [
  ...COMPANIES.map((c) => {
    const e = BASE_EXT[c.id];
    return {
      id: c.id, name: c.name, industry: c.industry, district: c.district, relation: relationOf(c.exposure, c.settlement), relationText: c.relation,
      exposure: c.exposure, deposit: c.deposit, settlement: c.settlement, revenue: e.revenue, growth: e.growth, founded: e.founded, products: e.products,
      events: e.events, share: e.share, exporter: e.exporter, hold: !!e.hold, holdReason: e.hold,
    };
  }),
  ...EXTRA.map(([id, name, industry, district, relation, exposure, deposit, settlement, revenue, growth, founded, products, events, share, exporter]) => ({
    id, name, industry, district, relation, relationText: relation === '有授信' ? '贷款客户' : relation === '有结算无授信' ? '结算户' : '公开名录 · 尚无往来',
    exposure, deposit, settlement, revenue, growth, founded, products, events, share, exporter, hold: false,
  })),
];
/** 最近联系天数（固定种子，公开名录客户为「尚未联系」） */
const LAST_CONTACT: Record<string, number> = (() => {
  const r = rng(20260906);
  const m: Record<string, number> = {};
  POOL.forEach((c) => { m[c.id] = c.relation === '公开名录' ? -1 : 3 + Math.floor(r() * 80); });
  return m;
})();
const INDUSTRIES = Array.from(new Set(POOL.map((c) => c.industry)));
const DISTRICTS = ['高新区', '经开区', '城东区', '临港区', '保税区', '城北区', '城南区', '老城区', '西山区', '江畔新区', '东湖区'];
const EVENTS: EventTag[] = ['定点公告', '中标公告', '产能扩建', '新设子公司', '结算量上升', '专精特新', '招聘扩张'];
const RELATIONS: { k: 'all' | Relation; t: string }[] = [{ k: 'all', t: '全部' }, { k: '有结算无授信', t: '有结算无授信' }, { k: '有授信', t: '有授信' }, { k: '公开名录', t: '公开名录（无往来）' }];
const AGES: { k: string; t: string; test: (y: number) => boolean }[] = [
  { k: 'all', t: '不限', test: () => true }, { k: 'lt3', t: '< 3 年', test: (y) => 2026 - y < 3 },
  { k: '3-10', t: '3–10 年', test: (y) => 2026 - y >= 3 && 2026 - y <= 10 }, { k: 'gt10', t: '> 10 年', test: (y) => 2026 - y > 10 },
];
const MANUFACTURING = new Set(['精密制造', '汽车零部件', '新能源', '电子信息', '有色加工', '新材料', '轻工制造', '包装印刷', '医疗器械', '生物医药']);

/* ============================================================ 评分（规则确定性） */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function valueScore(c: Co) {
  const S = 100 * Math.min(1, Math.sqrt(c.settlement / 8000));
  const D = 100 * Math.min(1, Math.sqrt(c.deposit / 1500));
  const P = Math.min(100, c.products * 20);
  return Math.round(0.4 * S + 0.25 * D + 0.2 * P + 0.15 * c.share);
}
function potentialScore(c: Co) {
  const G = clamp(c.growth * 2.2, 0, 100);
  const E = Math.min(40, c.events.reduce((s, e) => s + EVENT_W[e], 0));
  const B = BOOM[c.industry] ?? 50;
  return Math.round(0.35 * G + E + 0.2 * B);
}
function firstProduct(c: Co): string {
  if (c.hold) return '账户维护 · 暂不营销';
  if (c.relation === '公开名录') return c.events.includes('定点公告') || c.events.includes('中标公告') ? '基本户开立 + 订单融资' : '基本户开立 + 结算套餐';
  if (c.relation === '有授信') {
    if (c.events.includes('产能扩建')) return '固定资产贷款 + 供应链保理';
    if (c.exporter) return '远期结汇 + 出口押汇';
    return '供应链保理 + 代发工资';
  }
  if (c.events.includes('定点公告') || c.events.includes('中标公告')) return MANUFACTURING.has(c.industry) ? '流动资金贷款 + 供应链票据贴现' : '流动资金贷款 + 保函';
  if (c.exporter) return '远期结汇 + 出口押汇';
  if (c.events.includes('结算量上升')) return '结算套餐 + 代发工资 + 收单';
  if (c.events.includes('专精特新')) return '科创信用贷 + 知识产权质押';
  if (c.growth >= 15) return '流动资金贷款 + 代发工资';
  return '结算套餐 + 票据池';
}
function reasonOf(c: Co, v: number, p: number): string {
  const parts: string[] = [];
  if (c.relation === '有结算无授信') parts.push(`本行为结算${c.share >= 50 ? '主办行' : '合作行'}（份额约 ${c.share}%），年结算量 ${fmtW(c.settlement)}、日均存款 ${fmtW(c.deposit)}，尚无授信`);
  if (c.relation === '有授信') parts.push(`存量授信 ${fmtW(c.exposure)}，持有产品 ${c.products} 项，具备交叉销售基础`);
  if (c.relation === '公开名录') parts.push('公开名录企业，尚无往来，需以开户与结算切入');
  if (c.events.includes('定点公告')) parts.push('公开定点公告显示新增订单，配套备货与设备投入带来明确资金缺口');
  if (c.events.includes('中标公告')) parts.push('近期中标公告，项目履约期资金需求前置');
  if (c.events.includes('产能扩建')) parts.push('产能扩建投入，中长期融资窗口打开');
  if (c.events.includes('结算量上升')) parts.push('本行结算量环比上升，存款与收单沉淀机会');
  if (c.growth >= 20) parts.push(`营收增速 ${c.growth}%，成长性强`);
  parts.push(`价值分 ${v}、潜力分 ${p}`);
  return parts.join('；') + '。';
}
function talkOf(c: Co): string {
  if (c.hold) return '本次以了解经营与账户维护为主，不做主动营销；如客户主动提出融资需求，按流程转授信部门评估。';
  if (c.events.includes('定点公告')) return '从定点订单排产切入：确认 SOP 时间与备货周期，提出「审批时效承诺 + 供应链票据组合」，首次接触不谈利率，谈资金到位节奏。';
  if (c.exporter) return '从收汇币种与账期切入：了解汇率波动对利润的影响，用远期结汇锁定成本作为首触卖点。';
  if (c.events.includes('结算量上升')) return '从结算效率切入：对账、收单、代发一体化，用结算套餐减少财务人员工作量，再引出存款与融资。';
  if (c.relation === '公开名录') return '从开户便利切入：介绍线上开户与结算服务，先建立往来，再逐步了解融资需求。';
  return '从经营近况切入：了解上下游账期与季节性资金安排，结合本行结算数据提出针对性建议。';
}
const fmtW = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(2)} 亿` : `${n.toLocaleString('zh-CN')} 万`);

interface Scored extends Co { value: number; potential: number; composite: number; priority: 'A' | 'B' | 'C' | 'H'; product: string }
function scoreAll(list: Co[], wv: number, wp: number): Scored[] {
  const tot = wv + wp || 1;
  return list.map((c) => {
    const value = valueScore(c);
    const potential = potentialScore(c);
    const composite = Math.round((value * wv + potential * wp) / tot);
    const priority: Scored['priority'] = c.hold ? 'H' : composite >= 65 ? 'A' : composite >= 50 ? 'B' : 'C';
    return { ...c, value, potential, composite, priority, product: firstProduct(c) };
  });
}

/* ============================================================ 历史记录 */
const HISTORY = [
  { d: '09-05', t: '新能源汽车供应链 · 有结算无授信 · 定点/中标', n: 6 },
  { d: '09-02', t: '城南区 结算量上升的连锁与零售', n: 4 },
  { d: '08-28', t: '高新区 专精特新 · 成立 3–10 年', n: 5 },
  { d: '08-21', t: '保税区 出口收汇企业 · 结汇需求', n: 4 },
  { d: '08-14', t: '经开区 制造业 · 营收 1–5 亿', n: 7 },
];

/* ============================================================ 工具 */
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
type TipItem = { name?: string | number; value?: number | string | ReadonlyArray<number | string>; payload?: unknown };
function Tip({ active, payload, label, unit }: { active?: boolean; payload?: ReadonlyArray<TipItem>; label?: unknown; unit?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const d = p.payload as { name?: string; label?: string } | undefined;
  return <div className="ts-tip"><b>{String(label ?? d?.label ?? d?.name ?? '')}</b>{String(p.value)}{unit}</div>;
}
const PAL = ['#e63946', '#f4b942', '#2dc48d', '#3a86ff', '#9b5de5', '#ff8c42', '#00b4d8', '#ff5da2'];
const PAL2 = ['#8e1b1b', '#c9a24d', '#1f8a5a', '#1d4ed8', '#6d28d9', '#d9781b', '#0077b6', '#c2185b'];

type SortKey = 'name' | 'value' | 'potential' | 'composite' | 'settlement' | 'priority';
const PRI_ORDER: Record<Scored['priority'], number> = { A: 0, B: 1, C: 2, H: 3 };

/* ============================================================ 页面 */
export default function TargetScreening() {
  const [nl, setNl] = useState('本地新能源汽车供应链、有结算无授信的制造企业，近一年有定点或中标公告');
  const [inds, setInds] = useState<string[]>(['精密制造', '汽车零部件', '新能源', '电子信息', '有色加工', '新材料']);
  const [dists, setDists] = useState<string[]>([]);
  const [rev, setRev] = useState<[number, number]>([0.3, 20]);
  const [rel, setRel] = useState<'all' | Relation>('有结算无授信');
  const [age, setAge] = useState('all');
  const [evs, setEvs] = useState<EventTag[]>(['定点公告', '中标公告']);
  const [wv, setWv] = useState(50);
  const [wp, setWp] = useState(50);
  const [run, setRun] = useState(0);
  const [snap, setSnap] = useState<Scored[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [planned, setPlanned] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const STEPS = useMemo(() => [
    { t: '数据源接入', p: `读取行内 CRM 客户标签、结算/存款汇总（只读）与工商公开信息、招投标/定点公告、行业景气指数；候选池 ${POOL.length} 户。不调用征信。` },
    { t: '规则过滤与打分', p: `按行业（${inds.length || '不限'}）、区域（${dists.length || '不限'}）、营收 ${rev[0]}–${rev[1]} 亿、关系「${RELATIONS.find((r) => r.k === rel)?.t}」、经营事件（${evs.length ? evs.join('/') : '不限'}）过滤；价值分 = 结算量 40% + 日均存款 25% + 产品持有 20% + 主办份额 15%。` },
    { t: '潜力评分', p: '潜力分 = 营收增速 35% + 经营事件加分（定点 22 / 中标 14 / 扩建 10 / 结算上升 10 / 专精特新 8 / 新设子公司 6 / 招聘 5，封顶 40）+ 行业景气 20%。' },
    { t: '优先级排序与策略匹配', p: `综合分 = 价值 × ${wv}% + 潜力 × ${wp}%（归一化）；A ≥ 65、B ≥ 50、C < 50；存在被执行 / 逾期等公开负面信息的客户标记「暂缓」。按规则匹配首推产品与首触话术。` },
  ], [inds.length, dists.length, rev, rel, evs, wv, wp]);
  const n = useSteps(STEPS.length, run > 0, run);
  const finished = run > 0 && n > STEPS.length;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const doRun = () => {
    const ageT = AGES.find((a) => a.k === age)!.test;
    const hit = POOL.filter((c) =>
      (inds.length === 0 || inds.includes(c.industry)) &&
      (dists.length === 0 || dists.includes(c.district)) &&
      c.revenue >= rev[0] && c.revenue <= rev[1] &&
      (rel === 'all' || c.relation === rel) &&
      ageT(c.founded) &&
      (evs.length === 0 || evs.some((e) => c.events.includes(e))),
    );
    setSnap(scoreAll(hit, wv, wp));
    setChecked(new Set());
    setSelId(null);
    setRun((r) => r + 1);
  };
  const reset = () => { setInds([]); setDists([]); setRev([0.3, 20]); setRel('all'); setAge('all'); setEvs([]); setWv(50); setWp(50); setNl(''); };

  const rows = useMemo(() => {
    if (!snap) return [];
    const list = [...snap];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'zh-CN') * dir;
      if (sortKey === 'priority') return (PRI_ORDER[a.priority] - PRI_ORDER[b.priority]) * -dir || b.composite - a.composite;
      return (a[sortKey] - b[sortKey]) * dir;
    });
    return list;
  }, [snap, sortKey, sortDir]);
  const setSort = (k: SortKey) => { if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc'); } };

  const stats = useMemo(() => {
    if (!snap) return null;
    const active = snap.filter((c) => !c.hold);
    const a = active.filter((c) => c.priority === 'A').length;
    const b = active.filter((c) => c.priority === 'B').length;
    const settlement = snap.reduce((s, c) => s + c.settlement, 0);
    const deposit = snap.reduce((s, c) => s + c.deposit, 0);
    const credit = active.reduce((s, c) => s + (c.relation === '有授信' ? c.revenue * 0.08 : c.revenue * 0.16), 0);
    const buckets = [0, 20, 40, 60, 80].map((lo) => ({ label: `${lo}–${lo + 20}`, n: snap.filter((c) => c.value >= lo && (lo === 80 ? c.value <= 100 : c.value < lo + 20)).length }));
    const indMap = new Map<string, number>();
    snap.forEach((c) => indMap.set(c.industry, (indMap.get(c.industry) ?? 0) + 1));
    const inds = Array.from(indMap.entries()).sort((x, y) => y[1] - x[1]).map(([name, value]) => ({ name, value }));
    const avgV = Math.round(snap.reduce((s, c) => s + c.value, 0) / Math.max(1, snap.length));
    const avgP = Math.round(snap.reduce((s, c) => s + c.potential, 0) / Math.max(1, snap.length));
    const avgG = Math.round(snap.reduce((s, c) => s + c.growth, 0) / Math.max(1, snap.length));
    const evMap = new Map<string, number>();
    snap.forEach((c) => c.events.forEach((e) => evMap.set(e, (evMap.get(e) ?? 0) + 1)));
    const topEv = Array.from(evMap.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3);
    const distMap = new Map<string, number>();
    snap.forEach((c) => distMap.set(c.district, (distMap.get(c.district) ?? 0) + 1));
    const topDist = Array.from(distMap.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3);
    const exporters = snap.filter((c) => c.exporter).length;
    const noCredit = snap.filter((c) => c.relation === '有结算无授信').length;
    const prodMap = new Map<string, number>();
    active.forEach((c) => prodMap.set(c.product, (prodMap.get(c.product) ?? 0) + 1));
    const topProd = Array.from(prodMap.entries()).sort((x, y) => y[1] - x[1]).slice(0, 3);
    return { a, b, settlement, deposit, credit, buckets, inds, avgV, avgP, avgG, topEv, topDist, exporters, noCredit, topProd, hold: snap.length - active.length };
  }, [snap]);

  const sel = snap?.find((c) => c.id === selId) ?? null;
  const addPlan = (ids: string[]) => {
    setPlanned((p) => { const s = new Set(p); ids.forEach((i) => s.add(i)); return s; });
    setToast(`已加入拜访计划 ${ids.length} 户`);
    setChecked(new Set());
  };
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.id) || r.hold);

  return (
    <div>
      <style>{CSS}</style>
      <div className="ts-crumb"><Link to="/p/P01">智慧获客引擎</Link><span>›</span><b>目标客户筛选与客群定位</b></div>
      <div className="page-h">
        <div>
          <h1><Radar size={20} style={{ verticalAlign: -3, marginRight: 6 }} />目标客户筛选与客群定位</h1>
          <p>按行业、区域、规模、结算关系与经营事件圈出目标客群，给出价值分、潜力分与开发优先级，并匹配首触产品；名单为营销辅助，不等同于授信准入。</p>
        </div>
        <div className="row-wrap" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={() => setToast('客群条件已保存为「新能源供应链首贷」')}><Save size={13} />保存客群</button>
          <button className="btn ghost sm" onClick={() => setToast(snap ? `已导出清单 ${snap.length} 户（xlsx）` : '请先开始筛选')}><Download size={13} />导出清单</button>
          <button className="btn gold sm" onClick={() => (planned.size ? setToast(`拜访计划已同步 ${planned.size} 户`) : setToast('尚未加入拜访客户'))}><CalendarPlus size={13} />拜访计划 · {planned.size}</button>
        </div>
      </div>

      <div className="ts-layout">
        {/* ---------------- 左：筛选条件 ---------------- */}
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><Filter size={14} />筛选条件</div><span className="card-s">候选池 {POOL.length} 户</span></div>
          <div className="ts-lbl">自然语言描述</div>
          <textarea className="ts-ta" value={nl} onChange={(e) => setNl(e.target.value)} placeholder="例如：本地新能源汽车供应链、有结算无授信的制造企业" />
          <div className="ts-lbl">行业 <small>{inds.length ? `已选 ${inds.length}` : '不限'}</small></div>
          <div className="ts-opts">{INDUSTRIES.map((i) => <button key={i} className={`ts-opt${inds.includes(i) ? ' on' : ''}`} onClick={() => setInds((a) => toggle(a, i))}>{i}</button>)}</div>
          <div className="ts-lbl">区域 / 行政区 <small>{dists.length ? `已选 ${dists.length}` : '全市'}</small></div>
          <div className="ts-opts">{DISTRICTS.map((d) => <button key={d} className={`ts-opt${dists.includes(d) ? ' on b' : ''}`} onClick={() => setDists((a) => toggle(a, d))}>{d}</button>)}</div>
          <div className="ts-lbl">规模区间（年营收 · 亿）</div>
          <div className="ts-range"><span>下限</span><input type="range" min={0.3} max={20} step={0.1} value={rev[0]} onChange={(e) => setRev([Math.min(+e.target.value, rev[1]), rev[1]])} /><b className="num">{rev[0].toFixed(1)}</b></div>
          <div className="ts-range"><span>上限</span><input type="range" min={0.3} max={20} step={0.1} value={rev[1]} onChange={(e) => setRev([rev[0], Math.max(+e.target.value, rev[0])])} /><b className="num">{rev[1].toFixed(1)}</b></div>
          <div className="ts-lbl">与本行关系</div>
          <div className="ts-seg">{RELATIONS.map((r) => <button key={r.k} className={`ts-opt${rel === r.k ? ' on g' : ''}`} onClick={() => setRel(r.k)}>{r.t}</button>)}</div>
          <div className="ts-lbl">成立年限</div>
          <div className="ts-seg">{AGES.map((a) => <button key={a.k} className={`ts-opt${age === a.k ? ' on g' : ''}`} onClick={() => setAge(a.k)}>{a.t}</button>)}</div>
          <div className="ts-lbl">经营事件 <small>任一命中</small></div>
          <div className="ts-opts">{EVENTS.map((e) => <button key={e} className={`ts-opt${evs.includes(e) ? ' on' : ''}`} onClick={() => setEvs((a) => toggle(a, e))}>{e}</button>)}</div>
          <div className="ts-lbl">排序权重</div>
          <div className="ts-w"><span>价值分</span><input type="range" min={0} max={100} value={wv} onChange={(e) => setWv(+e.target.value)} /><b className="num">{wv}</b></div>
          <div className="ts-w"><span>潜力分</span><input type="range" min={0} max={100} value={wp} onChange={(e) => setWp(+e.target.value)} /><b className="num">{wp}</b></div>
          <div className="ts-btns">
            <button className="btn" onClick={doRun}>{run > 0 ? <><RotateCcw size={14} />重新筛选</> : <><Play size={14} />开始筛选</>}</button>
            <button className="btn ghost" onClick={reset}><X size={14} />重置</button>
          </div>
          <div className="ts-note"><ShieldCheck size={12} /> 仅用本行客户数据与公开信息，不调用征信</div>
        </div>

        {/* ---------------- 中：思考流 + 结果 ---------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card fade-in" style={{ animationDelay: '60ms' }}>
            <div className="card-h"><div className="card-t"><span className="dot" />筛选推理{run > 0 && !finished && <span className="pulse" />}</div><span className="card-s">数据源 → 规则打分 → 潜力评分 → 优先级排序</span></div>
            {run === 0 && <div className="ts-empty" style={{ minHeight: 150 }}><div><div className="ring"><Target size={22} /></div>设置左侧条件后点击「开始筛选」</div></div>}
            {run > 0 && (
              <div className="think">
                {STEPS.map((s, i) => {
                  const st = i < n - 1 ? 'done' : i === n - 1 && n <= STEPS.length ? 'active' : 'pending';
                  if (st === 'pending') return null;
                  return (
                    <div key={s.t} className={`step fade-in ${st}`}>
                      <div className="n" style={st === 'done' ? { background: 'var(--g-green)' } : undefined}>{st === 'done' ? <Check size={12} /> : i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div>
                    </div>
                  );
                })}
                {finished && <div className="ai-tag fade-in"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</div>}
              </div>
            )}
          </div>

          {finished && stats && snap && (
            <>
              <div className="ts-tiles fade-in">
                <div className="tile"><b className="num">{snap.length}<small>户</small></b><span>命中客户 · 暂缓 {stats.hold} 户</span></div>
                <div className="tile red"><b className="num">{stats.a}<small>户</small></b><span>A 级优先 · B 级 {stats.b} 户</span></div>
                <div className="tile green"><b className="num">{fmtW(stats.settlement)}</b><span>合计年结算量 · 日均存款 {fmtW(stats.deposit)}</span></div>
                <div className="tile gold"><b className="num">{stats.credit.toFixed(1)}<small>亿</small></b><span>预计可开发授信规模</span></div>
              </div>

              <div className="ts-charts fade-in" style={{ animationDelay: '80ms' }}>
                <div className="card">
                  <div className="card-h"><div className="card-t"><Wallet size={14} />价值分布</div><span className="card-s">按价值评分分段 · 户数</span></div>
                  <div style={{ height: 190 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.buckets} margin={{ top: 16, right: 8, left: -18, bottom: 0 }} barCategoryGap="22%">
                        <defs>{PAL.map((c, i) => <linearGradient key={i} id={`ts-gb${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={PAL2[i]} /></linearGradient>)}</defs>
                        <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit=" 户" />} />
                        <Bar dataKey="n" radius={[8, 8, 4, 4]} isAnimationActive={false}>
                          {stats.buckets.map((_, i) => <Cell key={i} fill={`url(#ts-gb${[3, 6, 1, 2, 0][i]})`} />)}
                          <LabelList dataKey="n" position="top" fontSize={11} fill="#5f5850" fontWeight={800} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="ts-legend"><span>平均价值分 <b>{stats.avgV}</b></span><span>平均潜力分 <b>{stats.avgP}</b></span><span>平均增速 <b>{stats.avgG}%</b></span></div>
                </div>
                <div className="card">
                  <div className="card-h"><div className="card-t"><Building2 size={14} />行业分布</div><span className="card-s">{stats.inds.length} 个行业</span></div>
                  <div className="ts-donut" style={{ height: 190 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <defs>{PAL.map((c, i) => <linearGradient key={i} id={`ts-gp${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={PAL2[i]} /></linearGradient>)}</defs>
                        <Tooltip content={<Tip unit=" 户" />} />
                        <Pie data={stats.inds} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} cornerRadius={5} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                          {stats.inds.map((_, i) => <Cell key={i} fill={`url(#ts-gp${i % PAL.length})`} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="c"><b className="num">{snap.length}</b><span>户</span></div>
                  </div>
                  <div className="ts-legend">{stats.inds.slice(0, 6).map((d, i) => <span key={d.name}><i style={{ background: `linear-gradient(135deg,${PAL[i % 8]},${PAL2[i % 8]})` }} />{d.name} <b>{d.value}</b></span>)}</div>
                </div>
              </div>

              <div className="card fade-in" style={{ animationDelay: '140ms' }}>
                <div className="card-h">
                  <div className="card-t"><ListChecks size={14} />目标客户清单</div>
                  <span className="card-s">点击列头排序 · 勾选后可批量加入拜访计划</span>
                </div>
                <div className="ts-tblwrap">
                  <table className="tbl ts-tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}><span className={`ts-chk${allChecked ? ' on' : ''}`} onClick={() => setChecked(allChecked ? new Set() : new Set(rows.filter((r) => !r.hold).map((r) => r.id)))}>{allChecked && <Check size={11} />}</span></th>
                        {([['name', '企业名'], ['priority', '优先级'], ['value', '价值评分'], ['potential', '潜力评分'], ['composite', '综合'], ['settlement', '年结算量']] as [SortKey, string][]).map(([k, t], idx) => (
                          <th key={k} className={sortKey === k ? 'on' : ''} onClick={() => setSort(k)} style={idx === 0 ? { minWidth: 150 } : undefined}>
                            <span className="sk">{t}{sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}</span>
                          </th>
                        ))}
                        <th>行业 / 区域</th><th>结算关系</th><th>推荐首推产品</th><th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className={`${selId === r.id ? 'sel' : ''}${r.hold ? ' hold' : ''}`}>
                          <td>{!r.hold && <span className={`ts-chk${checked.has(r.id) ? ' on' : ''}`} onClick={() => setChecked((s) => { const x = new Set(s); if (x.has(r.id)) x.delete(r.id); else x.add(r.id); return x; })}>{checked.has(r.id) && <Check size={11} />}</span>}</td>
                          <td><div className="ts-name">{r.name}{planned.has(r.id) && <span className="chip green" style={{ padding: '1px 7px', fontSize: 10.5 }}><i />已排访</span>}</div><small>{r.hold ? r.holdReason : `${r.events.slice(0, 2).join(' · ') || '成立 ' + r.founded} · ${LAST_CONTACT[r.id] < 0 ? '尚未联系' : `${LAST_CONTACT[r.id]} 天前联系`}`}</small></td>
                          <td><span className={`ts-pri ${r.priority}`}>{r.priority === 'H' ? '缓' : r.priority}</span></td>
                          <td><div className="ts-score v"><div className="bar"><i style={{ width: `${r.value}%` }} /></div><b className="num">{r.value}</b></div></td>
                          <td><div className="ts-score p"><div className="bar"><i style={{ width: `${r.potential}%` }} /></div><b className="num">{r.potential}</b></div></td>
                          <td><b className="num">{r.composite}</b></td>
                          <td className="num">{r.settlement ? fmtW(r.settlement) : '—'}</td>
                          <td>{r.industry}<br /><small style={{ color: 'var(--ink-3)' }}><MapPin size={10} style={{ verticalAlign: -1 }} /> {r.district}</small></td>
                          <td><span className={`chip ${r.relation === '有授信' ? 'green' : r.relation === '公开名录' ? 'blue' : ''}`} style={{ padding: '2px 8px', fontSize: 11 }}><i />{r.relationText}</span></td>
                          <td style={{ fontWeight: 700 }}>{r.product}</td>
                          <td>
                            <div className="ts-act">
                              <button className="btn sm gold" disabled={r.hold} style={r.hold ? { opacity: .45, cursor: 'not-allowed' } : undefined} onClick={() => addPlan([r.id])}><CalendarPlus size={12} />加入拜访</button>
                              <button className="btn sm ghost" onClick={() => setSelId(r.id)}><UserSearch size={12} />查看画像</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>当前条件下没有命中客户，请放宽筛选条件。</td></tr>}
                    </tbody>
                  </table>
                </div>
                {checked.size > 0 && (
                  <div className="ts-bulk fade-in"><Check size={14} /><b>已勾选 {checked.size} 户</b><span style={{ flex: 1 }} />
                    <button className="btn sm" onClick={() => addPlan(Array.from(checked))}><CalendarPlus size={12} />批量加入拜访计划</button>
                    <button className="btn sm ghost" onClick={() => setChecked(new Set())}>取消</button>
                  </div>
                )}
                <div className="ts-note"><ShieldCheck size={12} /> 名单为营销辅助，不等同于授信准入；被执行 / 逾期等公开负面信息客户标记「暂缓」，仅做账户维护。</div>
              </div>
            </>
          )}
        </div>

        {/* ---------------- 右：客群画像 / AI 建议 / 历史 ---------------- */}
        <div className="ts-right">
          {sel && (
            <div className="card gold fade-in ts-port">
              <div className="card-h"><div className="card-t"><UserSearch size={14} />企业画像 · {sel.name}</div><button className="btn sm ghost" onClick={() => setSelId(null)}><X size={12} /></button></div>
              <div className="row-wrap" style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className={`ts-pri ${sel.priority}`}>{sel.priority === 'H' ? '缓' : sel.priority}</span>
                <span className="chip"><i />{sel.industry}</span><span className="chip blue"><i />{sel.district}</span>
                {sel.events.map((e) => <span key={e} className="chip green"><i />{e}</span>)}
              </div>
              <div className="kv">
                <div className="row"><span>与本行关系</span><span>{sel.relationText}</span></div>
                <div className="row"><span>年结算量 / 日均存款</span><span className="num">{sel.settlement ? fmtW(sel.settlement) : '—'} / {sel.deposit ? fmtW(sel.deposit) : '—'}</span></div>
                <div className="row"><span>授信敞口 / 产品数</span><span className="num">{sel.exposure ? fmtW(sel.exposure) : '无'} / {sel.products} 项</span></div>
                <div className="row"><span>营收 / 近三年增速</span><span className="num">{sel.revenue} 亿 / {sel.growth}%</span></div>
                <div className="row"><span>成立 / 主办份额</span><span className="num">{sel.founded} 年 / {sel.share ? sel.share + '%' : '—'}</span></div>
                <div className="row"><span>价值 / 潜力 / 综合</span><span className="num">{sel.value} / {sel.potential} / {sel.composite}</span></div>
              </div>
              <div className="ts-reason"><b>开发理由：</b>{reasonOf(sel, sel.value, sel.potential)}</div>
              <div className="ts-talk"><b>首推产品：</b>{sel.product}<br /><b>首触话术要点：</b>{talkOf(sel)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>
                {!sel.hold && <button className="btn sm" onClick={() => addPlan([sel.id])}><CalendarPlus size={12} />加入拜访计划</button>}
              </div>
            </div>
          )}

          <div className="card fade-in" style={{ animationDelay: '100ms' }}>
            <div className="card-h"><div className="card-t"><Target size={14} />客群画像摘要</div>{finished && <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>}</div>
            {!finished || !stats || !snap ? (
              <div className="ts-empty" style={{ minHeight: 120 }}><div>筛选完成后自动生成客群特征。</div></div>
            ) : (
              <div className="ts-feat">
                <div className="f"><span className="ico"><Building2 size={13} /></span><div><b>行业构成</b><span>{stats.inds.slice(0, 3).map((d) => `${d.name} ${d.value} 户`).join('、')}{stats.inds.length > 3 ? ` 等 ${stats.inds.length} 个行业` : ''}，行业景气均值 {Math.round(snap.reduce((s, c) => s + (BOOM[c.industry] ?? 50), 0) / snap.length)}。</span></div></div>
                <div className="f"><span className="ico"><MapPin size={13} /></span><div><b>区域集中度</b><span>{stats.topDist.map(([d, k]) => `${d} ${k} 户`).join('、')}，便于按行政区聚类安排拜访路线。</span></div></div>
                <div className="f"><span className="ico"><Wallet size={13} /></span><div><b>与本行关系</b><span>有结算无授信 {stats.noCredit} 户，合计年结算量 {fmtW(stats.settlement)}；出口收汇企业 {stats.exporters} 户，存在结汇与汇率避险需求。</span></div></div>
                <div className="f"><span className="ico"><TrendingUp size={13} /></span><div><b>成长与事件</b><span>平均营收增速 {stats.avgG}%；{stats.topEv.length ? stats.topEv.map(([e, k]) => `${e} ${k} 户`).join('、') : '无显著经营事件'}，资金需求多集中于订单备货与设备投入。</span></div></div>
                <div className="f"><span className="ico"><Bookmark size={13} /></span><div><b>首推产品分布</b><span>{stats.topProd.map(([p, k]) => `${p}（${k}）`).join('、')}。</span></div></div>
              </div>
            )}
          </div>

          <div className="card fade-in" style={{ animationDelay: '160ms' }}>
            <div className="card-h"><div className="card-t"><Sparkles size={14} />AI 建议</div>{finished && <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>}</div>
            {!finished || !stats || !snap ? (
              <div className="ts-empty" style={{ minHeight: 100 }}><div>筛选完成后给出开发顺序与首触策略建议。</div></div>
            ) : (
              <>
                {[
                  { t: `优先开发 A 级 ${stats.a} 户`, p: `${rows.filter((r) => r.priority === 'A').slice(0, 3).map((r) => r.name).join('、') || '—'}：本周内完成首访，首次接触以资金到位节奏与审批时效为卖点，不先谈利率。` },
                  { t: '按行政区打包安排路线', p: `${stats.topDist.map(([d]) => d).join(' / ')} 客户集中，建议同一天同片区连访 2–3 户，减少路上时间。` },
                  { t: 'B 级客户用结算切入', p: `B 级 ${stats.b} 户先以结算套餐、代发与收单建立黏性，观察 1–2 个季度结算变化后再推融资。` },
                  { t: '暂缓客户只做账户维护', p: `${stats.hold} 户存在公开负面信息，本轮不做主动营销；如客户主动提出需求按流程转授信评估。` },
                ].map((s, i) => <div key={s.t} className="ts-sug"><span className="n">{i + 1}</span><div><b>{s.t}</b><p>{s.p}</p></div></div>)}
                <div className="ts-note"><ShieldCheck size={12} /> 线索仅来自公开信息与本行数据 · 征信不用于营销</div>
              </>
            )}
          </div>

          <div className="card fade-in" style={{ animationDelay: '220ms' }}>
            <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近 5 次</span></div>
            <div className="ts-hist">
              {HISTORY.map((h) => <div key={h.d + h.t} className="h" onClick={() => setToast(`已载入「${h.t}」筛选条件`)}><span className="d">{h.d}</span><span className="t">{h.t}</span><span className="chip" style={{ padding: '1px 8px', fontSize: 11 }}><i />{h.n} 户</span><ArrowRight size={12} color="var(--ink-3)" /></div>)}
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="ts-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
