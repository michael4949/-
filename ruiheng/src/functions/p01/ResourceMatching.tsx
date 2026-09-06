import { useEffect, useMemo, useState } from 'react';
import {
  Network, Sparkles, Check, RotateCcw, Search, Handshake, ShieldCheck, ChevronRight, Download, History, Link2, Coins, Receipt,
  Banknote, Layers, PhoneCall, ClipboardList, ArrowRight, X, TrendingUp, Building2, Users, Workflow, BadgeCheck, AlertTriangle,
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COMPANIES } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng, fmtWan } from '../../lib/rng';

/* ------------------------------------------------------------------ 页面样式（仅本页，前缀 rm-） */
const CSS = `
.rm-crumb{font-size:12.5px;color:var(--ink-3);margin-bottom:2px;display:flex;align-items:center;gap:4px}
.rm-crumb b{color:var(--ink)}
.rm-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
.rm-top h1{font-size:24px;font-weight:900;display:flex;align-items:center;gap:8px;letter-spacing:.01em}
.rm-top p{color:var(--ink-3);font-size:13px;margin-top:4px}
.rm-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0}
.rm-note{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.rm-mt{margin-top:16px}
.rm-muted{color:var(--ink-3);font-size:12px}
.rm-g21{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:16px;align-items:start}
.rm-g12{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);gap:16px;align-items:start}
@media(max-width:1100px){.rm-g21,.rm-g12{grid-template-columns:1fr}}
.rm-sec{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.14em;color:var(--gold-3);margin:14px 0 8px}
.rm-sec:first-child{margin-top:0}
.rm-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(201,162,77,.45),rgba(61,187,134,.25),rgba(255,255,255,0))}
.rm-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.rm-in{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3);font-size:12.5px}
.rm-in input,.rm-in select{border:0;outline:0;background:transparent;font-family:inherit;font-size:12.5px;color:var(--ink);min-width:0;width:150px}
.rm-tg{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;user-select:none;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.25);color:var(--ink-3)}
.rm-tg i{width:18px;height:0;border-top:3px solid;border-radius:2px;opacity:.35}
.rm-tg.on{color:var(--ink);background:var(--g-gold-soft)}
.rm-tg.on i{opacity:1}
.rm-svg{border-radius:14px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);padding:6px;overflow:hidden}
.rm-svg svg{width:100%;height:auto;display:block}
.rm-node{cursor:pointer}
.rm-node text{pointer-events:none}
.rm-legend{display:flex;gap:10px;flex-wrap:wrap;font-size:11.5px;color:var(--ink-2);margin-top:8px}
.rm-legend .sw{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px;margin-right:4px}
.rm-nb{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.16);margin-bottom:6px;font-size:12px;cursor:pointer}
.rm-nb:hover{box-shadow:inset 0 0 0 1px rgba(201,162,77,.45)}
.rm-nb .sw{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.rm-nb .nm{font-weight:800;flex:1;min-width:0}
.rm-nb .ty{font-size:11px;color:var(--ink-3);white-space:nowrap}
.rm-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}
.rm-kv .k{padding:8px 10px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);font-size:11.5px;color:var(--ink-3)}
.rm-kv .k b{display:block;font-size:14px;color:var(--ink)}
.rm-empty{min-height:220px;display:grid;place-items:center;text-align:center;color:var(--ink-3);font-size:13px}
.rm-empty .ring{width:54px;height:54px;border-radius:50%;background:var(--g-iris-soft);display:grid;place-items:center;margin:0 auto 10px;box-shadow:inset 0 0 0 1px rgba(201,162,77,.3)}
.rm-step.active{box-shadow:inset 0 0 0 1px rgba(195,39,43,.45),var(--shadow-sm)}
.rm-step.done .n{background:var(--g-green)}
.rm-step .bd{flex:1;min-width:0}
.rm-step .hd{display:flex;align-items:center;gap:8px}
.rm-opp{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;margin-bottom:8px;background:linear-gradient(90deg,rgba(255,255,255,.75),rgba(255,247,236,.6) 60%,rgba(236,248,243,.55));box-shadow:inset 0 0 0 1px rgba(201,162,77,.16);transition:transform .15s}
.rm-opp:hover{transform:translateX(2px);box-shadow:inset 0 0 0 1px rgba(201,162,77,.45),var(--shadow-sm)}
.rm-opp.done{background:var(--g-green-soft)}
.rm-opp .pair{display:flex;align-items:center;gap:8px;font-weight:900;font-size:13.5px;flex-wrap:wrap}
.rm-opp .pair .x{color:var(--gold-3);font-weight:900}
.rm-opp .why{font-size:12px;color:var(--ink-2);margin-top:3px}
.rm-opp .meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center}
.rm-opp .rt{text-align:right;min-width:120px}
.rm-opp .rt b{display:block;font-size:20px;font-weight:900}
.rm-opp .rt span{font-size:11px;color:var(--ink-3)}
.rm-opp .rt .bar{margin:4px 0 8px;height:6px}
.rm-tk{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:12px;margin-bottom:6px;cursor:pointer;background:linear-gradient(90deg,rgba(255,255,255,.7),rgba(255,247,236,.55) 60%,rgba(236,248,243,.5));box-shadow:inset 0 0 0 1px rgba(201,162,77,.14);font-size:12.5px}
.rm-tk.sel{box-shadow:inset 0 0 0 2px rgba(195,39,43,.5),var(--shadow-sm)}
.rm-tk .id{font-weight:800;color:var(--ink-3);font-size:11px;width:84px;flex-shrink:0}
.rm-tk .nm{flex:1;min-width:0;font-weight:700}
.rm-stat{display:flex;gap:4px;margin:10px 0}
.rm-stat .s{flex:1;padding:7px 6px;border-radius:9px;text-align:center;font-size:11px;font-weight:800;color:var(--ink-3);background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.16)}
.rm-stat .s.done{background:var(--g-green-soft);color:var(--green-3)}
.rm-stat .s.cur{background:var(--g-red-soft);color:var(--red-3);box-shadow:inset 0 0 0 1px rgba(195,39,43,.3)}
.rm-ct{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.rm-ct .c{padding:10px 12px;border-radius:12px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);font-size:12.5px}
.rm-ct .c b{display:block;font-size:13px}
.rm-ct .c span{display:block;font-size:11.5px;color:var(--ink-3)}
.rm-ct .c.a{background:var(--g-blue-soft)} .rm-ct .c.b{background:var(--g-purple-soft)}
.rm-plan{padding:10px 12px;border-radius:12px;background:var(--g-gold-soft);font-size:12.5px;line-height:1.7;margin-top:8px}
.rm-log{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.rm-log .l{display:flex;gap:8px;font-size:11.5px;color:var(--ink-2);padding:5px 8px;border-radius:8px;background:var(--g-holo-2)}
.rm-log .l span{color:var(--ink-3);white-space:nowrap}
.rm-ul{list-style:none;display:flex;flex-direction:column;gap:5px}
.rm-ul li{position:relative;padding-left:14px;font-size:12.5px;color:var(--ink-2)}
.rm-ul li::before{content:"";position:absolute;left:0;top:8px;width:7px;height:7px;border-radius:50%;background:var(--g-iris)}
.rm-toast{position:fixed;left:50%;bottom:46px;transform:translateX(-50%);z-index:60;padding:10px 18px;border-radius:999px;background:var(--g-green);color:#fff;font-weight:700;font-size:13px;box-shadow:0 12px 30px rgba(31,138,90,.3);display:inline-flex;align-items:center;gap:8px}
.rm-tip{padding:8px 11px;border-radius:10px;background:var(--g-holo);box-shadow:var(--shadow),inset 0 0 0 1px rgba(201,162,77,.3);font-size:12px;min-width:140px}
.rm-tip b{display:block;margin-bottom:3px}
.rm-tip div{display:flex;justify-content:space-between;gap:10px;color:var(--ink-2)}
.rm-hist .li{align-items:flex-start}
.rm-hist .li .tm{margin-left:auto;font-size:11px;color:var(--ink-3);white-space:nowrap}
`;

/* ------------------------------------------------------------------ 数据 */
type EdgeType = '上下游' | '采购销售' | '产能互补' | '资金互补';
interface Node { id: string; name: string; industry: string; district: string; relation: string; settlement: number; deposit: number; tags: string[]; note: string; owner: string; auth: boolean }
interface Edge { a: string; b: string; type: EdgeType; label: string; potential?: boolean }

const EXTRA: Node[] = [
  { id: 'xintai', name: '鑫泰铝业', industry: '有色加工', district: '临港区', relation: '结算户', settlement: 1900, deposit: 210, tags: ['铝型材', '闲置产能 30%'], note: '铝型材挤压产线闲置产能约 30%，已登记寻求新客户', owner: 'zhou', auth: true },
  { id: 'hengda', name: '恒达包装', industry: '包装印刷', district: '经开区', relation: '结算户', settlement: 1500, deposit: 180, tags: ['晟禾供应商', '账期 60 天'], note: '为晟禾供应纸箱与标签，应收账期 60 天', owner: 'lin', auth: true },
  { id: 'jileng', name: '极冷冷链', industry: '冷链物流', district: '临港区', relation: '贷款客户', settlement: 2300, deposit: 320, tags: ['冷库 3 座', '医药冷链资质'], note: '冷库利用率 62%，寻求食品与医药客户', owner: 'zhou', auth: true },
  { id: 'jinggong', name: '精工模具', industry: '模具制造', district: '高新区', relation: '结算户', settlement: 1100, deposit: 140, tags: ['宁桂供应商'], note: '为宁桂提供精密模具，采购铝材', owner: 'wang', auth: false },
  { id: 'liyuan', name: '锂源材料', industry: '电池材料', district: '临港区', relation: '贷款客户', settlement: 4200, deposit: 520, tags: ['东岭供应商', '备货资金需求'], note: '为东岭供应组件辅材，旺季备货资金缺口约 2,000 万', owner: 'zhou', auth: true },
  { id: 'wanjia', name: '万家商超', industry: '零售连锁', district: '城南区', relation: '结算户', settlement: 6200, deposit: 900, tags: ['32 家门店', '生鲜直采'], note: '计划扩大本地生鲜直采比例至 40%', owner: 'lin', auth: true },
  { id: 'huasu', name: '华塑制品', industry: '塑料制品', district: '经开区', relation: '结算户', settlement: 980, deposit: 120, tags: ['食品级包材'], note: '食品级塑料包材，客户集中于食品与建材', owner: 'lin', auth: false },
  { id: 'yunrui', name: '云锐机械', industry: '机械加工', district: '高新区', relation: '结算户', settlement: 760, deposit: 90, tags: ['外协产能', 'CNC 40 台'], note: 'CNC 加工中心 40 台，可承接外协加工', owner: 'wang', auth: true },
];
const AUTH_BASE: Record<string, boolean> = { ninggui: true, shenghe: true, caisheng: false, beiling: false, c05: true, c06: true, c07: true, c08: true, c09: true, c10: true, c11: true, c12: true };
const NODES: Node[] = [
  ...COMPANIES.map((c) => ({ id: c.id, name: c.name, industry: c.industry, district: c.district, relation: c.relation, settlement: c.settlement, deposit: c.deposit, tags: c.tags, note: c.note, owner: c.owner, auth: AUTH_BASE[c.id] ?? false })),
  ...EXTRA,
];
const nodeOf = (id: string) => NODES.find((n) => n.id === id)!;

const EDGES: Edge[] = [
  { a: 'beiling', b: 'ninggui', type: '上下游', label: '铝材供应' },
  { a: 'xintai', b: 'ninggui', type: '采购销售', label: '候选第二供应商', potential: true },
  { a: 'jinggong', b: 'ninggui', type: '上下游', label: '精密模具' },
  { a: 'beiling', b: 'jinggong', type: '采购销售', label: '铝材' },
  { a: 'yunrui', b: 'ninggui', type: '产能互补', label: '外协加工' },
  { a: 'c08', b: 'ninggui', type: '采购销售', label: 'MES 系统' },
  { a: 'shenghe', b: 'caisheng', type: '上下游', label: '华南经销' },
  { a: 'hengda', b: 'shenghe', type: '上下游', label: '纸箱标签' },
  { a: 'huasu', b: 'shenghe', type: '采购销售', label: '塑料包材' },
  { a: 'c12', b: 'shenghe', type: '上下游', label: '农产品原料' },
  { a: 'shenghe', b: 'wanjia', type: '采购销售', label: '商超供货' },
  { a: 'c12', b: 'wanjia', type: '采购销售', label: '生鲜直供', potential: true },
  { a: 'shenghe', b: 'c09', type: '采购销售', label: '餐饮原料直采', potential: true },
  { a: 'jileng', b: 'shenghe', type: '上下游', label: '冷链仓储' },
  { a: 'jileng', b: 'c09', type: '采购销售', label: '门店冷链配送' },
  { a: 'jileng', b: 'c06', type: '采购销售', label: '医药冷链', potential: true },
  { a: 'c11', b: 'shenghe', type: '上下游', label: '干线物流' },
  { a: 'c11', b: 'c10', type: '采购销售', label: '组件运输' },
  { a: 'liyuan', b: 'c10', type: '上下游', label: '组件辅材' },
  { a: 'c10', b: 'liyuan', type: '资金互补', label: '核心企业信用 → 供应商融资' },
  { a: 'shenghe', b: 'hengda', type: '资金互补', label: '集团信用 → 供应商保理' },
  { a: 'huasu', b: 'c05', type: '采购销售', label: '出口塑料制品' },
  { a: 'c12', b: 'c05', type: '采购销售', label: '农产品出口' },
  { a: 'huasu', b: 'c07', type: '采购销售', label: '塑料建材' },
  { a: 'c07', b: 'c10', type: '采购销售', label: '产线扩建建材', potential: true },
  { a: 'c08', b: 'shenghe', type: '采购销售', label: '集团财务系统', potential: true },
  { a: 'c11', b: 'jileng', type: '产能互补', label: '干线 + 冷链联运', potential: true },
  { a: 'c08', b: 'c06', type: '采购销售', label: '医药流通系统' },
  { a: 'xintai', b: 'beiling', type: '产能互补', label: '铝材产能调剂' },
];

const GROUPS = [
  { g: '装备制造', color: '#3a86ff', inds: ['精密制造', '机械加工', '模具制造'] },
  { g: '食品消费', color: '#f4b942', inds: ['食品加工', '连锁餐饮', '零售连锁', '现代农业'] },
  { g: '商贸流通', color: '#ff5da2', inds: ['商贸流通', '建材贸易', '跨境电商'] },
  { g: '材料包装', color: '#9b5de5', inds: ['有色加工', '电池材料', '塑料制品', '包装印刷'] },
  { g: '医药健康', color: '#2dc48d', inds: ['医药流通'] },
  { g: '数字服务', color: '#00b4d8', inds: ['软件服务'] },
  { g: '物流仓储', color: '#e63946', inds: ['物流仓储', '冷链物流'] },
  { g: '新能源', color: '#ff8c42', inds: ['新能源'] },
];
const groupOf = (ind: string) => GROUPS.find((g) => g.inds.includes(ind)) ?? GROUPS[0];
const EDGE_STYLE: Record<EdgeType, { color: string; dash?: string; tone: string }> = {
  上下游: { color: '#3a86ff', tone: 'blue' },
  采购销售: { color: '#d9a52a', tone: '' },
  产能互补: { color: '#9b5de5', dash: '6 4', tone: 'purple' },
  资金互补: { color: '#1f8a5a', dash: '6 4', tone: 'green' },
};
const lighten = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};
const P = (id: string) => PERSONAS.find((p) => p.id === id)!;
const radiusOf = (n: Node) => 13 + Math.sqrt(n.settlement) / 9;

/* 力导向布局：确定性（固定种子），在 useMemo 中一次计算 */
function layout(nodes: Node[], edges: Edge[], W: number, H: number, seed: number) {
  const r = rng(seed);
  const pos = nodes.map(() => ({ x: (r() - 0.5) * W * 0.7, y: (r() - 0.5) * H * 0.7 }));
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const k = Math.sqrt((W * H) / nodes.length) * 0.62;
  let temp = W / 9;
  for (let it = 0; it < 320; it++) {
    const disp = nodes.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y; const d = Math.max(0.01, Math.hypot(dx, dy)); const f = (k * k) / d;
      disp[i].x += (dx / d) * f; disp[i].y += (dy / d) * f; disp[j].x -= (dx / d) * f; disp[j].y -= (dy / d) * f;
    }
    for (const e of edges) {
      const i = idx.get(e.a)!, j = idx.get(e.b)!;
      const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y; const d = Math.max(0.01, Math.hypot(dx, dy)); const f = (d * d) / k;
      disp[i].x -= (dx / d) * f; disp[i].y -= (dy / d) * f; disp[j].x += (dx / d) * f; disp[j].y += (dy / d) * f;
    }
    for (let i = 0; i < nodes.length; i++) {
      disp[i].x -= pos[i].x * 0.08; disp[i].y -= pos[i].y * 0.12;
      const len = Math.max(0.01, Math.hypot(disp[i].x, disp[i].y)); const m = Math.min(len, temp);
      pos[i].x = Math.max(-W / 2 + 60, Math.min(W / 2 - 60, pos[i].x + (disp[i].x / len) * m));
      pos[i].y = Math.max(-H / 2 + 40, Math.min(H / 2 - 40, pos[i].y + (disp[i].y / len) * m));
    }
    temp = Math.max(1.5, temp * 0.975);
  }
  for (let pass = 0; pass < 40; pass++) for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const min = radiusOf(nodes[i]) + radiusOf(nodes[j]) + 30;
    const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y; const d = Math.max(0.01, Math.hypot(dx, dy));
    if (d < min) { const push = (min - d) / 2; pos[i].x -= (dx / d) * push; pos[i].y -= (dy / d) * push; pos[j].x += (dx / d) * push; pos[j].y += (dy / d) * push; }
  }
  const xs = pos.map((p) => p.x), ys = pos.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = 78, padY = 44;
  return pos.map((p) => ({ x: padX + ((p.x - minX) / Math.max(1, maxX - minX)) * (W - padX * 2), y: padY + ((p.y - minY) / Math.max(1, maxY - minY)) * (H - padY * 2) }));
}

/* 撮合机会 */
type Product = '结算' | '供应链融资' | '保理' | '票据' | '订单融资' | '流动资金';
interface Opp { id: string; a: string; b: string; type: EdgeType; why: string; volume: number; products: Product[]; benefit: string; rate: number }
const OPPS: Opp[] = [
  { id: 'op1', a: 'ninggui', b: 'xintai', type: '采购销售', why: '宁桂现有上游北岭铝材票据逾期、供货不稳，需第二供应商；鑫泰铝型材产线闲置产能 30%，已登记供需信息', volume: 2200, products: ['结算', '票据'], benefit: '归集结算量 2,200 万；宁桂对北岭应付敞口 480 万逐步降至零；供应链票据贴现约 1,500 万', rate: 72 },
  { id: 'op2', a: 'shenghe', b: 'hengda', type: '资金互补', why: '晟禾集团信用可支持包装供应商恒达账期 60 天的应收融资，集团付款节奏稳定', volume: 3600, products: ['保理', '结算'], benefit: '反向保理 2,000 万；恒达结算主户迁入；晟禾应付管理集中', rate: 66 },
  { id: 'op3', a: 'c10', b: 'liyuan', type: '资金互补', why: '东岭扩产带动辅材采购放量，锂源旺季备货资金缺口约 2,000 万，可由核心企业确权后融资', volume: 8500, products: ['供应链融资', '票据'], benefit: '供应商融资 2,000 万；票据 3,000 万；两户结算归集', rate: 61 },
  { id: 'op4', a: 'c12', b: 'wanjia', type: '采购销售', why: '万家计划本地生鲜直采比例提至 40%；青原为本地规模化种植基地，具备冷链交付能力', volume: 1200, products: ['结算', '订单融资'], benefit: '订单融资 400 万；青原收款归集；万家采购付款走本行', rate: 58 },
  { id: 'op5', a: 'c11', b: 'jileng', type: '产能互补', why: '汇源干线运力充足但无冷链，极冷冷库利用率 62%，联运可共同承接食品与医药客户', volume: 1800, products: ['结算', '流动资金'], benefit: '联运结算走本行；极冷冷库利用率提升至 80%；汇源新增冷链货源', rate: 54 },
  { id: 'op6', a: 'shenghe', b: 'c09', type: '采购销售', why: '嘉禾中央厨房原料集中采购，晟禾可直供并缩短供应链；嘉禾结算量环比上升 28%', volume: 2400, products: ['结算', '票据'], benefit: '晟禾新增直采渠道；嘉禾以票据付款，本行开票 800 万', rate: 63 },
  { id: 'op7', a: 'c07', b: 'c10', type: '采购销售', why: '东岭光伏产线扩建需建材与支架，澄宇建材结算量下降 35% 亟需新客户', volume: 1500, products: ['结算', '保理'], benefit: '澄宇结算量回升；对东岭应收可做保理 600 万', rate: 47 },
  { id: 'op8', a: 'yunrui', b: 'ninggui', type: '产能互补', why: '宁桂定点放量后加工产能紧张，云锐 CNC 40 台可承接外协加工', volume: 900, products: ['结算'], benefit: '外协结算归集 900 万；宁桂交付保障', rate: 52 },
  { id: 'op9', a: 'c08', b: 'shenghe', type: '采购销售', why: '晟禾集团 6 家子公司财务系统不统一，融岚有集团财务共享产品，与本行现金管理可直联', volume: 480, products: ['结算'], benefit: '晟禾财务共享上线后账户归集配套；融岚新增订单', rate: 44 },
];
const PRODUCT_TONE: Record<Product, string> = { 结算: 'blue', 供应链融资: 'green', 保理: 'purple', 票据: '', 订单融资: 'orange', 流动资金: 'red' };
const STATUS = ['待授权确认', '已联系甲方', '已联系乙方', '双方会面', '达成意向', '转化落地'];
interface Ticket { id: string; opp: string; status: number; log: { t: string; s: string }[]; contacts: { a: { name: string; title: string; tel: string }; b: { name: string; title: string; tel: string } }; plan: string; created: string }
const SUR = ['陈', '沈', '吴', '何', '赵', '钱', '孙', '郑', '冯', '许', '苏', '程', '韩', '曹', '袁', '邓', '傅', '钟'];
const GIV = ['国栋', '雅琴', '建平', '晓菲', '立群', '文静', '海涛', '敏华', '志强', '丽娟', '俊杰', '一鸣', '思远', '慧兰', '振华', '美玲'];
const TITLES = ['采购总监', '财务总监', '总经理', '供应链经理', '销售总监', '财务经理'];
function contactOf(seed: number) {
  const r = rng(seed);
  const mk = () => ({ name: SUR[Math.floor(r() * SUR.length)] + GIV[Math.floor(r() * GIV.length)], title: TITLES[Math.floor(r() * TITLES.length)], tel: `13${Math.floor(r() * 9)}****${String(Math.floor(r() * 9000) + 1000)}` });
  return { a: mk(), b: mk() };
}
function planOf(o: Opp) {
  const a = nodeOf(o.a), b = nodeOf(o.b);
  const wa = P(a.owner).name, wb = P(b.owner).name;
  return `撮合路径：${wa}（${a.name} 客户经理）与 ${wb}（${b.name} 客户经理）联合拜访，先分别确认双方供需意向与授权范围，再安排双方会面。本行角色：仅提供撮合与配套金融方案，不代表任一方谈判价格。配套产品：${o.products.join(' / ')}，由产品部出具方案；预计业务量 ${fmtWan(o.volume)}/年。合规：不向任一方披露另一方在本行的账户、授信与交易数据。`;
}
const TICKETS0: Ticket[] = [
  { id: 'MT-2608-07', opp: 'op6', status: 4, created: '08-21', contacts: contactOf(7101), plan: planOf(OPPS[5]), log: [{ t: '08-21', s: '工单创建，双方授权确认' }, { t: '08-25', s: '林小雨联系嘉禾采购总监，确认直采意向' }, { t: '08-28', s: '周慧敏联系晟禾销售总监' }, { t: '09-02', s: '双方在本行会议室会面，达成年度直采意向 2,400 万' }] },
  { id: 'MT-2608-04', opp: 'op3', status: 5, created: '08-12', contacts: contactOf(7102), plan: planOf(OPPS[2]), log: [{ t: '08-12', s: '工单创建' }, { t: '08-19', s: '双方会面，东岭同意确权' }, { t: '09-01', s: '供应商融资 2,000 万审批通过，首笔放款 800 万' }] },
];
const HIST0 = [
  { time: '09-02 17:10', text: '晟禾食品集团 × 嘉禾连锁餐饮 双方会面，达成直采意向', tone: 'green' },
  { time: '09-01 11:30', text: '东岭新能源 × 锂源材料 供应商融资首笔放款 800 万', tone: 'blue' },
  { time: '08-28 09:45', text: '发现撮合机会 9 条（产业链：食品 / 装备 / 新能源）', tone: 'purple' },
  { time: '08-21 15:20', text: '新建撮合工单 MT-2608-07', tone: 'orange' },
];
const MONTHS = ['4 月', '5 月', '6 月', '7 月', '8 月', '9 月'];
const STATS = (() => { const r = rng(2026); return MONTHS.map((m, i) => ({ m, count: 2 + Math.floor(r() * 4) + (i >= 3 ? 2 : 0), settle: Math.round(900 + r() * 1400 + i * 260), fin: Math.round(500 + r() * 900 + i * 220) })); })();
const AI_TAG = <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>;

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
const STEPS = [
  { t: '读取供应链标签', p: `读取本行 ${NODES.length} 户客户的行业、上下游与供需登记标签（只读），其中 ${NODES.filter((n) => n.auth).length} 户已授权共享供需信息。` },
  { t: '匹配产业链关系', p: '按产业链上下游、区域与规模匹配候选对象：装备制造链（铝材 → 模具 → 精密制造）、食品消费链（原料 → 加工 → 经销 / 商超 / 餐饮）、新能源链（辅材 → 组件 → 物流）。' },
  { t: '校验产能与资金互补', p: '识别闲置产能（鑫泰铝业 30%、极冷冷链 38%、云锐机械外协）与资金缺口（锂源材料 2,000 万、恒达包装账期 60 天），并与核心企业信用匹配。' },
  { t: '计算协同效益', p: '前端确定性计算：撮合交易额、可归集结算量、潜在融资额；剔除未授权客户的非公开信息。' },
  { id: 5, t: '映射本行产品', p: '按互补类型映射：采购销售 → 结算 + 票据；资金互补 → 反向保理 / 供应商融资；产能互补 → 结算 + 流动资金。' },
  { t: '排序与资源配置', p: `按撮合成功率排序，生成 ${OPPS.length} 条机会；建议联合拜访分工与产品部支持。` },
];

function ChartTip({ active, payload, label }: { active?: boolean; payload?: ReadonlyArray<{ name?: string | number; value?: number | string | ReadonlyArray<number | string> }>; label?: unknown }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rm-tip">
      <b>{String(label ?? '')}</b>
      {payload.map((p, i) => <div key={i}><span>{p.name}</span><b className="num" style={{ margin: 0 }}>{typeof p.value === 'number' ? (String(p.name).includes('数') ? `${p.value} 笔` : fmtWan(p.value)) : String(p.value ?? '')}</b></div>)}
    </div>
  );
}

/* ------------------------------------------------------------------ 页面 */
export default function ResourceMatching() {
  const W = 900, H = 520;
  const [types, setTypes] = useState<Record<EdgeType, boolean>>({ 上下游: true, 采购销售: true, 产能互补: true, 资金互补: true });
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string>('ninggui');
  const [run, setRun] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS0);
  const [tk, setTk] = useState<string>(TICKETS0[0].id);
  const [logText, setLogText] = useState('');
  const [toast, setToast] = useState('');
  const [hist, setHist] = useState(HIST0);

  const pos = useMemo(() => layout(NODES, EDGES, W, H, 20260906), []);
  const pmap = useMemo(() => new Map(NODES.map((n, i) => [n.id, pos[i]])), [pos]);
  const n = useSteps(STEPS.length, run > 0, run);
  const finished = run > 0 && n > STEPS.length;
  const node = nodeOf(sel);
  const visEdges = EDGES.filter((e) => types[e.type]);
  const neighbors = visEdges.filter((e) => e.a === sel || e.b === sel);
  const nbIds = new Set(neighbors.flatMap((e) => [e.a, e.b]));
  const matchQ = (x: Node) => q && (x.name.includes(q) || x.industry.includes(q));
  const ticket = tickets.find((t) => t.id === tk);
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2600); };
  const now = () => '09-06 ' + new Date().toTimeString().slice(0, 5);
  const startMatch = (o: Opp) => {
    const exist = tickets.find((t) => t.opp === o.id);
    if (exist) { setTk(exist.id); flash(`已存在工单 ${exist.id}`); return; }
    const a = nodeOf(o.a), b = nodeOf(o.b);
    const both = a.auth && b.auth;
    const id = `MT-2609-${String(tickets.length + 3).padStart(2, '0')}`;
    const t: Ticket = { id, opp: o.id, status: both ? 1 : 0, created: '09-06', contacts: contactOf(7200 + OPPS.indexOf(o)), plan: planOf(o), log: [{ t: '09-06', s: both ? '工单创建，双方供需信息共享授权已确认' : `工单创建，${!a.auth ? a.name : b.name} 尚未授权共享供需信息，待客户经理取得授权` }] };
    setTickets((ts) => [t, ...ts]); setTk(id);
    setHist((h) => [{ time: now(), text: `发起撮合 ${a.name} × ${b.name}，工单 ${id}`, tone: 'orange' }, ...h]);
    flash(`撮合工单 ${id} 已创建`);
  };
  const advance = () => {
    if (!ticket || ticket.status >= STATUS.length - 1) return;
    const next = ticket.status + 1;
    setTickets((ts) => ts.map((t) => (t.id === ticket.id ? { ...t, status: next, log: [...t.log, { t: '09-06', s: `状态推进：${STATUS[next]}` }] } : t)));
    if (next === STATUS.length - 1) setHist((h) => [{ time: now(), text: `${nodeOf(OPPS.find((o) => o.id === ticket.opp)!.a).name} × ${nodeOf(OPPS.find((o) => o.id === ticket.opp)!.b).name} 转化落地`, tone: 'green' }, ...h]);
  };
  const addLog = () => {
    if (!ticket || !logText.trim()) return;
    setTickets((ts) => ts.map((t) => (t.id === ticket.id ? { ...t, log: [...t.log, { t: '09-06', s: logText.trim() }] } : t)));
    setLogText('');
  };
  const discover = () => { setRun((r) => r + 1); setHist((h) => [{ time: now(), text: `发现撮合机会 ${OPPS.length} 条`, tone: 'purple' }, ...h]); };
  const stateOf = (i: number) => (i < n - 1 ? 'done' : i === n - 1 && n <= STEPS.length ? 'active' : 'pending');
  const q3 = STATS.slice(3);
  const totals = { count: q3.reduce((s, x) => s + x.count, 0), settle: q3.reduce((s, x) => s + x.settle, 0), fin: q3.reduce((s, x) => s + x.fin, 0) };
  const oppOf = (t: Ticket) => OPPS.find((o) => o.id === t.opp)!;

  return (
    <div className="rm">
      <style>{CSS}</style>
      <div className="rm-crumb">智慧获客引擎 <ChevronRight size={12} /> <b>客户资源整合与撮合</b></div>
      <div className="rm-top">
        <div>
          <h1><Network size={22} color="var(--green)" />客户资源整合与撮合</h1>
          <p>在本行客户之间发现上下游、采购销售、产能与资金互补关系，撮合业务合作，并把撮合转化为本行结算与融资机会。</p>
        </div>
        <div className="rm-acts">
          <button className="btn ghost" onClick={() => flash('撮合清单已导出（Excel）')}><Download size={14} />导出撮合清单</button>
          <button className="btn gold" onClick={() => { const el = document.getElementById('rm-tickets'); el?.scrollIntoView({ behavior: 'smooth' }); }}><ClipboardList size={14} />撮合工单（{tickets.length}）</button>
          <button className="btn" onClick={discover}>{run > 0 ? <><RotateCcw size={14} />重新发现</> : <><Sparkles size={14} />发现撮合机会</>}</button>
        </div>
      </div>
      <div className="rm-note">
        <span className="chip green"><ShieldCheck size={12} />仅用公开信息与客户明确授权共享的供需信息 · 不向任一方披露另一方账户与交易数据 · 征信不用于营销</span>
      </div>

      <div className="grid g4">
        <div className="tile"><b className="num">{NODES.length} <small style={{ fontSize: 13 }}>户</small></b><span>关系网络节点 · 本行客户</span></div>
        <div className="tile"><b className="num">{EDGES.length} <small style={{ fontSize: 13 }}>条</small></b><span>已识别关系边 · 其中潜在 {EDGES.filter((e) => e.potential).length} 条</span></div>
        <div className="tile"><b className="num">{totals.count} <small style={{ fontSize: 13 }}>笔</small></b><span>本季撮合数<span className="delta up">+{totals.count - STATS.slice(0, 3).reduce((s, x) => s + x.count, 0)}</span></span></div>
        <div className="tile"><b className="num">{fmtWan(totals.fin)}</b><span>本季转化融资额 · 结算 {fmtWan(totals.settle)}</span></div>
      </div>

      {/* 关系网络图 + 节点详情 */}
      <div className="rm-g21 rm-mt">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />本行客户关系网络图</div><span className="card-s">节点大小 = 年结算量 · 颜色 = 行业 · 点击节点查看</span></div>
          <div className="rm-tools">
            <div className="rm-in"><Search size={13} color="var(--ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索企业 / 行业" /></div>
            {(Object.keys(types) as EdgeType[]).map((t) => (
              <span key={t} className={`rm-tg${types[t] ? ' on' : ''}`} onClick={() => setTypes({ ...types, [t]: !types[t] })}>
                <i style={{ borderColor: EDGE_STYLE[t].color, borderTopStyle: EDGE_STYLE[t].dash ? 'dashed' : 'solid' }} />{t}
              </span>
            ))}
          </div>
          <div className="rm-svg">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="客户关系网络图">
              <defs>
                {GROUPS.map((g) => (
                  <radialGradient key={g.g} id={`rm-n-${g.color.slice(1)}`} cx=".35" cy=".3" r=".9">
                    <stop offset="0" stopColor={lighten(g.color, 0.55)} /><stop offset="1" stopColor={g.color} />
                  </radialGradient>
                ))}
                {(Object.keys(EDGE_STYLE) as EdgeType[]).map((t) => (
                  <marker key={t} id={`rm-arr-${EDGE_STYLE[t].tone || 'gold'}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={EDGE_STYLE[t].color} /></marker>
                ))}
              </defs>
              {visEdges.map((e, i) => {
                const a = pmap.get(e.a)!, b = pmap.get(e.b)!;
                const st = EDGE_STYLE[e.type];
                const hot = e.a === sel || e.b === sel;
                const ra = radiusOf(nodeOf(e.a)), rb = radiusOf(nodeOf(e.b));
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
                const x0 = a.x + (dx / d) * ra, y0 = a.y + (dy / d) * ra, x1 = b.x - (dx / d) * (rb + 4), y1 = b.y - (dy / d) * (rb + 4);
                return (
                  <g key={i} opacity={sel && !hot ? 0.28 : 1}>
                    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={st.color} strokeWidth={hot ? 3 : 2} strokeDasharray={st.dash} markerEnd={`url(#rm-arr-${st.tone || 'gold'})`} opacity={e.potential ? 0.7 : 1} />
                    {hot && <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill={st.color}>{e.label}{e.potential ? '（潜在）' : ''}</text>}
                  </g>
                );
              })}
              {NODES.map((nd) => {
                const p = pmap.get(nd.id)!; const g = groupOf(nd.industry); const r = radiusOf(nd);
                const isSel = nd.id === sel; const dim = (sel && !isSel && !nbIds.has(nd.id)) || (q && !matchQ(nd));
                return (
                  <g key={nd.id} className="rm-node" transform={`translate(${p.x},${p.y})`} onClick={() => setSel(nd.id)} opacity={dim ? 0.35 : 1}>
                    {isSel && <circle r={r + 7} fill="none" stroke={g.color} strokeWidth="2" strokeDasharray="4 3" />}
                    <circle r={r} fill={`url(#rm-n-${g.color.slice(1)})`} stroke="#fff" strokeWidth="2" />
                    {!nd.auth && <circle r={4} cx={r - 4} cy={-r + 4} fill="#fff" stroke="#c3272b" strokeWidth="1.5" />}
                    <text y={r + 13} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1e1b16">{nd.name}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="rm-legend">
            {GROUPS.map((g) => <span key={g.g}><span className="sw" style={{ background: `linear-gradient(135deg,${lighten(g.color, 0.5)},${g.color})` }} />{g.g}</span>)}
            <span className="rm-muted">◦ 右上小标：尚未授权共享供需信息</span>
          </div>
        </div>
        <div className="card blue fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><Building2 size={14} />{node.name}</div><span className={`chip ${node.auth ? 'green' : 'red'}`}><i />{node.auth ? '已授权共享供需' : '未授权共享供需'}</span></div>
          <div className="rm-muted">{node.industry} · {node.district} · {node.relation} · 客户经理 {P(node.owner).name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{node.tags.map((t) => <span key={t} className="chip"><i />{t}</span>)}</div>
          <div className="rm-kv">
            <div className="k">年结算量<b className="num">{fmtWan(node.settlement)}</b></div>
            <div className="k">存款<b className="num">{fmtWan(node.deposit)}</b></div>
            <div className="k">关系边<b className="num">{neighbors.length} 条</b></div>
            <div className="k">相关撮合机会<b className="num">{OPPS.filter((o) => o.a === sel || o.b === sel).length} 条</b></div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 8 }}>{node.note}</p>
          <div className="rm-sec"><Link2 size={12} />关联企业</div>
          {neighbors.map((e, i) => {
            const other = nodeOf(e.a === sel ? e.b : e.a); const g = groupOf(other.industry);
            return (
              <div className="rm-nb" key={i} onClick={() => setSel(other.id)}>
                <span className="sw" style={{ background: `linear-gradient(135deg,${lighten(g.color, 0.5)},${g.color})` }} />
                <span className="nm">{other.name}</span>
                <span className={`chip ${EDGE_STYLE[e.type].tone}`} style={{ padding: '2px 8px' }}><i />{e.type}</span>
                <span className="ty">{e.a === sel ? '→' : '←'} {e.label}</span>
              </div>
            );
          })}
          {neighbors.length === 0 && <div className="rm-muted">当前筛选下无关系边</div>}
        </div>
      </div>

      {/* 思考流 + 撮合机会 */}
      <div className="rm-g12 rm-mt">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />发现撮合机会 · 思考流{run > 0 && !finished && <span className="pulse" />}</div><span className="card-s">{STEPS.length} 步</span></div>
          {run === 0 && <div className="rm-empty"><div><div className="ring"><Workflow size={22} /></div>点击「发现撮合机会」<br />按「标签 → 产业链 → 互补校验 → 效益 → 产品 → 排序」推理。</div></div>}
          {run > 0 && (
            <div className="think">
              {STEPS.map((s, i) => {
                const st = stateOf(i);
                if (st === 'pending') return null;
                return (
                  <div key={s.t} className={`step rm-step fade-in ${st}`}>
                    <div className="n">{st === 'done' ? <Check size={12} /> : i + 1}</div>
                    <div className="bd"><div className="hd"><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div>
                  </div>
                );
              })}
              {finished && <div style={{ marginTop: 4 }}>{AI_TAG}</div>}
            </div>
          )}
          <div className="rm-sec"><Layers size={12} />资源配置建议</div>
          <ul className="rm-ul">
            <li>联合拜访：两户客户经理共同出面，先分别确认意向再安排会面。</li>
            <li>产品部：票据、保理与供应商融资方案由产品经理出具，额度以审批为准。</li>
            <li>分行资源：集团类撮合（晟禾、东岭）由 {P('zhou').name} 牵头，支行行长协访。</li>
          </ul>
        </div>
        <div className="card gold fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><Handshake size={14} />撮合机会列表</div>{finished ? AI_TAG : <span className="card-s">{run > 0 ? '生成中……' : `上次发现：08-28 · ${OPPS.length} 条`}</span>}</div>
          {run > 0 && !finished && <div className="rm-empty" style={{ minHeight: 160 }}><div>正在匹配产业链关系并计算协同效益……</div></div>}
          {(run === 0 || finished) && OPPS.map((o) => {
            const a = nodeOf(o.a), b = nodeOf(o.b); const t = tickets.find((x) => x.opp === o.id);
            return (
              <div key={o.id} className={`rm-opp fade-in${t && t.status === STATUS.length - 1 ? ' done' : ''}`}>
                <div>
                  <div className="pair">
                    <span>{a.name}</span><span className="x">×</span><span>{b.name}</span>
                    <span className={`chip ${EDGE_STYLE[o.type].tone}`}><i />{o.type}</span>
                    {t && <span className="chip green"><i />{t.id} · {STATUS[t.status]}</span>}
                  </div>
                  <div className="why">{o.why}</div>
                  <div className="meta">
                    <span className="rm-muted">预计业务量</span><b className="num">{fmtWan(o.volume)}/年</b>
                    <span className="rm-muted" style={{ marginLeft: 6 }}>可转化产品</span>
                    {o.products.map((p) => <span key={p} className={`chip ${PRODUCT_TONE[p]}`} style={{ padding: '2px 8px' }}><i />{p}</span>)}
                  </div>
                  <div className="rm-muted" style={{ marginTop: 4 }}><TrendingUp size={11} style={{ verticalAlign: -2 }} /> 协同效益：{o.benefit}</div>
                </div>
                <div className="rt">
                  <span>撮合成功率</span>
                  <b className="num">{o.rate}%</b>
                  <div className="bar"><i style={{ width: `${o.rate}%` }} /></div>
                  {t ? <button className="btn sm ghost" onClick={() => { setTk(t.id); document.getElementById('rm-tickets')?.scrollIntoView({ behavior: 'smooth' }); }}><ClipboardList size={12} />查看工单</button> : <button className="btn sm" onClick={() => startMatch(o)}><Handshake size={12} />发起撮合</button>}
                  {(!a.auth || !b.auth) && !t && <div className="rm-muted" style={{ marginTop: 4, fontSize: 10.5 }}><AlertTriangle size={10} style={{ verticalAlign: -1 }} /> {!a.auth ? a.name : b.name} 待授权</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 撮合工单 + 成果统计 */}
      <div className="rm-g21 rm-mt" id="rm-tickets">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><ClipboardList size={14} />撮合工单</div><span className="card-s">{tickets.length} 个 · 落地 {tickets.filter((t) => t.status === STATUS.length - 1).length} 个</span></div>
          {tickets.map((t) => { const o = oppOf(t); return (
            <div key={t.id} className={`rm-tk${t.id === tk ? ' sel' : ''}`} onClick={() => setTk(t.id)}>
              <span className="id">{t.id}</span>
              <span className="nm">{nodeOf(o.a).name} × {nodeOf(o.b).name}</span>
              <span className={`chip ${t.status === STATUS.length - 1 ? 'green' : t.status === 0 ? 'red' : 'blue'}`} style={{ padding: '2px 8px' }}><i />{STATUS[t.status]}</span>
              <span className="rm-muted">{t.created}</span>
            </div>
          ); })}
          {ticket && (() => { const o = oppOf(ticket); const a = nodeOf(o.a), b = nodeOf(o.b); return (
            <div className="fade-in" key={ticket.id}>
              <div className="rm-sec"><BadgeCheck size={12} />工单 {ticket.id} · 跟进状态</div>
              <div className="rm-stat">{STATUS.map((s, i) => <div key={s} className={`s${i < ticket.status ? ' done' : i === ticket.status ? ' cur' : ''}`}>{s}</div>)}</div>
              <div className="rm-sec"><Users size={12} />双方联系人（客户授权提供）</div>
              <div className="rm-ct">
                <div className="c a"><b>甲方 · {a.name}</b>{ticket.contacts.a.name} · {ticket.contacts.a.title}<span><PhoneCall size={10} style={{ verticalAlign: -1 }} /> {ticket.contacts.a.tel} · 客户经理 {P(a.owner).name}</span></div>
                <div className="c b"><b>乙方 · {b.name}</b>{ticket.contacts.b.name} · {ticket.contacts.b.title}<span><PhoneCall size={10} style={{ verticalAlign: -1 }} /> {ticket.contacts.b.tel} · 客户经理 {P(b.owner).name}</span></div>
              </div>
              <div className="rm-sec"><Sparkles size={12} />撮合方案 {AI_TAG}</div>
              <div className="rm-plan">{ticket.plan}</div>
              <div className="rm-sec"><History size={12} />跟进记录</div>
              <div className="rm-log">{ticket.log.map((l, i) => <div className="l" key={i}><span>{l.t}</span>{l.s}</div>)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="rm-in" style={{ flex: 1, minWidth: 200 }}><input style={{ width: '100%' }} value={logText} onChange={(e) => setLogText(e.target.value)} placeholder="记录跟进：联系了谁、结论、下一步" onKeyDown={(e) => e.key === 'Enter' && addLog()} /></div>
                <button className="btn sm ghost" onClick={addLog}>记录跟进</button>
                <button className="btn sm gold" disabled={ticket.status >= STATUS.length - 1} onClick={advance}><ArrowRight size={12} />{ticket.status >= STATUS.length - 1 ? '已落地' : `推进至「${STATUS[ticket.status + 1]}」`}</button>
                {ticket.status === STATUS.length - 1 && <button className="btn sm green" onClick={() => flash('已同步至产品部：出具配套方案')}><Coins size={12} />同步产品部出方案</button>}
              </div>
            </div>
          ); })()}
        </div>
        <div>
          <div className="card green fade-in" style={{ animationDelay: '80ms' }}>
            <div className="card-h"><div className="card-t"><TrendingUp size={14} />撮合成果统计</div><span className="card-s">本季（7–9 月）· 单位：万</span></div>
            <div className="grid g3" style={{ gap: 8 }}>
              <div className="tile"><b className="num">{totals.count}</b><span>本季撮合数</span></div>
              <div className="tile"><b className="num" style={{ fontSize: 20 }}>{fmtWan(totals.settle)}</b><span>转化结算量</span></div>
              <div className="tile"><b className="num" style={{ fontSize: 20 }}>{fmtWan(totals.fin)}</b><span>转化融资额</span></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={STATS} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="rm-b-settle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fb0ff" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
                    <linearGradient id="rm-b-fin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ee3ad" /><stop offset="1" stopColor="#155e3e" /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" strokeDasharray="3 3" />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="l" dataKey="settle" name="转化结算量" fill="url(#rm-b-settle)" radius={[6, 6, 0, 0]} barSize={16} isAnimationActive={false} />
                  <Bar yAxisId="l" dataKey="fin" name="转化融资额" fill="url(#rm-b-fin)" radius={[6, 6, 0, 0]} barSize={16} isAnimationActive={false} />
                  <Line yAxisId="r" type="monotone" dataKey="count" name="撮合数" stroke="#e63946" strokeWidth={2.5} dot={{ r: 3, fill: '#fff', stroke: '#e63946', strokeWidth: 2 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="rm-muted" style={{ marginTop: 6 }}><Receipt size={11} style={{ verticalAlign: -2 }} /> 结算量与融资额为撮合落地后 12 个月内在本行发生的业务口径。</div>
          </div>
          <div className="card fade-in rm-hist rm-mt" style={{ animationDelay: '160ms' }}>
            <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近 {hist.length} 条</span></div>
            {hist.slice(0, 6).map((h, i) => (
              <div className="li" key={i}>
                <span className={`chip ${h.tone}`} style={{ padding: '2px 8px' }}><i /><Banknote size={10} /></span>
                <div style={{ flex: 1, minWidth: 0 }} className="t">{h.text}</div>
                <span className="tm">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="rm-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
