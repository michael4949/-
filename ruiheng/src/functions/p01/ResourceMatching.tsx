import { useMemo, useRef, useState } from 'react';
import {
  Network, Sparkles, Check, RotateCcw, Search, Handshake, ShieldCheck, ChevronRight, History, Link2, Coins, PhoneCall, ClipboardList, ArrowRight,
  TrendingUp, Building2, Users, BadgeCheck, AlertTriangle, SlidersHorizontal, Ban, Columns2, Scale, X,
} from 'lucide-react';
import { COMPANIES } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng, fmtWan } from '../../lib/rng';
import UploadDocs, { type UDoc } from '../../components/UploadDocs';
import DocActions from '../../components/DocActions';
import AiConclusion from '../../components/AiConclusion';
import { AI_CSS } from './ai/styles';
import type { Answer, ApplyAction, Chain, Constraint, Evidence, Phase, Version } from './ai/types';
import { VERSION_LABEL, hashStr } from './ai/types';
import { parseIntent, isOn, valueOf } from './ai/parse';
import { docEvidence, relevanceWith } from './ai/evidence';
import IntentBox from './ai/IntentBox';
import EvidencePanel from './ai/EvidencePanel';
import ReasoningChain, { EvRefs } from './ai/ReasoningChain';
import AskAi from './ai/AskAi';

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
.rm-g21{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:16px;align-items:start}
.rm-g12{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:16px;align-items:start}
@media(max-width:1100px){.rm-g21,.rm-g12{grid-template-columns:1fr}}
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
.rm-opp{padding:12px 14px;border-radius:14px;margin-bottom:10px;background:linear-gradient(90deg,rgba(255,255,255,.8),rgba(255,247,236,.6) 60%,rgba(236,248,243,.55));box-shadow:inset 0 0 0 1px rgba(201,162,77,.16);transition:box-shadow .15s}
.rm-opp:hover{box-shadow:inset 0 0 0 1px rgba(201,162,77,.45)}
.rm-opp.sel{box-shadow:inset 0 0 0 2px rgba(195,39,43,.45),var(--shadow-sm)}
.rm-opp.alt{box-shadow:inset 0 0 0 1px rgba(155,93,229,.45)}
.rm-opp .top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}
.rm-opp .pair{display:flex;align-items:center;gap:8px;font-weight:900;font-size:13.5px;flex-wrap:wrap;cursor:pointer}
.rm-opp .pair .x{color:var(--gold-3);font-weight:900}
.rm-opp .why{font-size:12px;color:var(--ink-2);margin-top:4px}
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
.rm-hist .li{align-items:flex-start}
.rm-hist .li .tm{margin-left:auto;font-size:11px;color:var(--ink-3);white-space:nowrap}
.rm-ex{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}
.rm-ex .chip{cursor:pointer}
.rm-formula{font-size:12px;color:var(--ink-2);padding:8px 10px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);margin-top:8px;font-variant-numeric:tabular-nums}
.rm-live{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--green-3);padding:3px 9px;border-radius:999px;background:var(--g-green-soft)}
.rm-flag{font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:999px;background:var(--g-red-soft);color:var(--red-3)}
`;

/* ------------------------------------------------------------------ 数据：节点、关系边、供需画像 */
type EdgeType = '上下游' | '采购销售' | '产能互补' | '资金互补';
interface Node { id: string; name: string; industry: string; district: string; relation: string; settlement: number; deposit: number; tags: string[]; note: string; owner: string; auth: boolean; risk: 'red' | 'orange' | 'yellow' | 'green' }
interface Edge { a: string; b: string; type: EdgeType; label: string; potential?: boolean }

const EXTRA: Node[] = [
  { id: 'xintai', name: '鑫泰铝业', industry: '有色加工', district: '临港区', relation: '结算户', settlement: 1900, deposit: 210, tags: ['铝型材', '闲置产能 30%'], note: '铝型材挤压产线闲置产能约 30%，已登记寻求新客户', owner: 'zhou', auth: true, risk: 'green' },
  { id: 'hengda', name: '恒达包装', industry: '包装印刷', district: '经开区', relation: '结算户', settlement: 1500, deposit: 180, tags: ['晟禾供应商', '账期 60 天'], note: '为晟禾供应纸箱与标签，应收账期 60 天', owner: 'lin', auth: true, risk: 'green' },
  { id: 'jileng', name: '极冷冷链', industry: '冷链物流', district: '临港区', relation: '贷款客户', settlement: 2300, deposit: 320, tags: ['冷库 3 座', '医药冷链资质'], note: '冷库利用率 62%，寻求食品与医药客户', owner: 'zhou', auth: true, risk: 'green' },
  { id: 'jinggong', name: '精工模具', industry: '模具制造', district: '高新区', relation: '结算户', settlement: 1100, deposit: 140, tags: ['宁桂供应商'], note: '为宁桂提供精密模具，采购铝材', owner: 'wang', auth: false, risk: 'green' },
  { id: 'liyuan', name: '锂源材料', industry: '电池材料', district: '临港区', relation: '贷款客户', settlement: 4200, deposit: 520, tags: ['东岭供应商', '备货资金需求'], note: '为东岭供应组件辅材，旺季备货资金缺口约 2,000 万', owner: 'zhou', auth: true, risk: 'green' },
  { id: 'wanjia', name: '万家商超', industry: '零售连锁', district: '城南区', relation: '结算户', settlement: 6200, deposit: 900, tags: ['32 家门店', '生鲜直采'], note: '计划扩大本地生鲜直采比例至 40%', owner: 'lin', auth: true, risk: 'green' },
  { id: 'huasu', name: '华塑制品', industry: '塑料制品', district: '经开区', relation: '结算户', settlement: 980, deposit: 120, tags: ['食品级包材'], note: '食品级塑料包材，客户集中于食品与建材', owner: 'lin', auth: false, risk: 'green' },
  { id: 'yunrui', name: '云锐机械', industry: '机械加工', district: '高新区', relation: '结算户', settlement: 760, deposit: 90, tags: ['外协产能', 'CNC 40 台'], note: 'CNC 加工中心 40 台，可承接外协加工', owner: 'wang', auth: true, risk: 'green' },
];
const AUTH_BASE: Record<string, boolean> = { ninggui: true, shenghe: true, caisheng: false, beiling: false, c05: true, c06: true, c07: true, c08: true, c09: true, c10: true, c11: true, c12: true };
const NODES: Node[] = [
  ...COMPANIES.map((c) => ({ id: c.id, name: c.name, industry: c.industry, district: c.district, relation: c.relation, settlement: c.settlement, deposit: c.deposit, tags: c.tags, note: c.note, owner: c.owner, auth: AUTH_BASE[c.id] ?? false, risk: c.risk })),
  ...EXTRA,
];
const nodeOf = (id: string) => NODES.find((n) => n.id === id)!;

const EDGES: Edge[] = [
  { a: 'beiling', b: 'ninggui', type: '上下游', label: '铝材供应' }, { a: 'xintai', b: 'ninggui', type: '采购销售', label: '候选第二供应商', potential: true },
  { a: 'jinggong', b: 'ninggui', type: '上下游', label: '精密模具' }, { a: 'beiling', b: 'jinggong', type: '采购销售', label: '铝材' },
  { a: 'yunrui', b: 'ninggui', type: '产能互补', label: '外协加工', potential: true }, { a: 'c08', b: 'ninggui', type: '采购销售', label: 'MES 系统' },
  { a: 'shenghe', b: 'caisheng', type: '上下游', label: '华南经销' }, { a: 'hengda', b: 'shenghe', type: '上下游', label: '纸箱标签' },
  { a: 'huasu', b: 'shenghe', type: '采购销售', label: '塑料包材' }, { a: 'c12', b: 'shenghe', type: '上下游', label: '农产品原料' },
  { a: 'shenghe', b: 'wanjia', type: '采购销售', label: '商超供货' }, { a: 'c12', b: 'wanjia', type: '采购销售', label: '生鲜直供', potential: true },
  { a: 'shenghe', b: 'c09', type: '采购销售', label: '餐饮原料直采', potential: true }, { a: 'jileng', b: 'shenghe', type: '上下游', label: '冷链仓储' },
  { a: 'jileng', b: 'c09', type: '采购销售', label: '门店冷链配送' }, { a: 'jileng', b: 'c06', type: '采购销售', label: '医药冷链', potential: true },
  { a: 'c11', b: 'shenghe', type: '上下游', label: '干线物流' }, { a: 'c11', b: 'c10', type: '采购销售', label: '组件运输' },
  { a: 'liyuan', b: 'c10', type: '上下游', label: '组件辅材' }, { a: 'c10', b: 'liyuan', type: '资金互补', label: '核心企业信用 → 供应商融资', potential: true },
  { a: 'shenghe', b: 'hengda', type: '资金互补', label: '集团信用 → 供应商保理', potential: true }, { a: 'huasu', b: 'c05', type: '采购销售', label: '出口塑料制品' },
  { a: 'c12', b: 'c05', type: '采购销售', label: '农产品出口' }, { a: 'huasu', b: 'c07', type: '采购销售', label: '塑料建材' },
  { a: 'c07', b: 'c10', type: '采购销售', label: '产线扩建建材', potential: true }, { a: 'c08', b: 'shenghe', type: '采购销售', label: '集团财务系统', potential: true },
  { a: 'c11', b: 'jileng', type: '产能互补', label: '干线 + 冷链联运', potential: true }, { a: 'c08', b: 'c06', type: '采购销售', label: '医药流通系统' },
  { a: 'xintai', b: 'beiling', type: '产能互补', label: '铝材产能调剂' },
];
/** 供需画像：supply = 可供给（产能 / 产品 / 信用），demand = 公开采购需求或登记需求 */
const PROFILE: Record<string, { supply: string[]; demand: string[] }> = {
  ninggui: { supply: ['精密零部件'], demand: ['铝型材', '模具', '外协加工', 'MES'] },
  shenghe: { supply: ['食品', '原料直采', '核心企业信用'], demand: ['纸箱标签', '塑料包材', '农产品', '冷链仓储', '财务共享', '干线运输'] },
  caisheng: { supply: ['经销渠道'], demand: ['食品'] },
  beiling: { supply: ['铝材'], demand: [] },
  c05: { supply: ['跨境渠道'], demand: ['塑料制品', '农产品'] },
  c06: { supply: ['医药'], demand: ['医药冷链', '流通系统'] },
  c07: { supply: ['建材', '支架'], demand: [] },
  c08: { supply: ['MES', '财务共享', '流通系统'], demand: [] },
  c09: { supply: ['餐饮渠道'], demand: ['原料直采', '冷链配送'] },
  c10: { supply: ['组件', '核心企业信用'], demand: ['辅材', '建材', '支架', '干线运输'] },
  c11: { supply: ['干线运输'], demand: ['冷链仓储'] },
  c12: { supply: ['农产品', '生鲜直采'], demand: [] },
  xintai: { supply: ['铝型材', '铝材'], demand: [] },
  hengda: { supply: ['纸箱标签'], demand: ['应收融资'] },
  jileng: { supply: ['冷链仓储', '冷链配送', '医药冷链'], demand: ['干线运输'] },
  jinggong: { supply: ['模具'], demand: ['铝材'] },
  liyuan: { supply: ['辅材'], demand: ['备货资金'] },
  wanjia: { supply: ['商超渠道'], demand: ['生鲜直采', '农产品'] },
  huasu: { supply: ['塑料包材', '塑料制品'], demand: [] },
  yunrui: { supply: ['外协加工'], demand: [] },
};
const GROUPS = [
  { g: '装备制造', color: '#3a86ff', inds: ['精密制造', '机械加工', '模具制造'] }, { g: '食品消费', color: '#f4b942', inds: ['食品加工', '连锁餐饮', '零售连锁', '现代农业'] },
  { g: '商贸流通', color: '#ff5da2', inds: ['商贸流通', '建材贸易', '跨境电商'] }, { g: '材料包装', color: '#9b5de5', inds: ['有色加工', '电池材料', '塑料制品', '包装印刷'] },
  { g: '医药健康', color: '#2dc48d', inds: ['医药流通'] }, { g: '数字服务', color: '#00b4d8', inds: ['软件服务'] },
  { g: '物流仓储', color: '#e63946', inds: ['物流仓储', '冷链物流'] }, { g: '新能源', color: '#ff8c42', inds: ['新能源'] },
];
const groupOf = (ind: string) => GROUPS.find((g) => g.inds.includes(ind)) ?? GROUPS[0];
const COMPLEMENT = new Set(['材料包装|装备制造', '材料包装|食品消费', '材料包装|新能源', '材料包装|商贸流通', '食品消费|商贸流通', '物流仓储|食品消费', '物流仓储|医药健康', '物流仓储|新能源', '物流仓储|物流仓储', '数字服务|装备制造', '数字服务|食品消费', '数字服务|医药健康', '商贸流通|新能源', '食品消费|食品消费']);
const ADJ = new Set(['临港区|保税区', '高新区|城北区', '高新区|城东区', '城东区|城北区', '城东区|保税区', '经开区|城南区', '经开区|高新区', '城南区|城北区']);
const EDGE_STYLE: Record<EdgeType, { color: string; dash?: string; tone: string }> = { 上下游: { color: '#3a86ff', tone: 'blue' }, 采购销售: { color: '#d9a52a', tone: '' }, 产能互补: { color: '#9b5de5', dash: '6 4', tone: 'purple' }, 资金互补: { color: '#1f8a5a', dash: '6 4', tone: 'green' } };
const lighten = (hex: string, t: number) => { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; const mix = (c: number) => Math.round(c + (255 - c) * t); return `rgb(${mix(r)},${mix(g)},${mix(b)})`; };
const P = (id: string) => PERSONAS.find((p) => p.id === id)!;
const radiusOf = (n: Node) => 13 + Math.sqrt(n.settlement) / 9;

/* 力导向布局：确定性（固定种子） */
function layout(nodes: Node[], edges: Edge[], W: number, H: number, seed: number) {
  const r = rng(seed);
  const pos = nodes.map(() => ({ x: (r() - 0.5) * W * 0.7, y: (r() - 0.5) * H * 0.7 }));
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const k = Math.sqrt((W * H) / nodes.length) * 0.62;
  let temp = W / 9;
  for (let it = 0; it < 320; it++) {
    const disp = nodes.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y; const d = Math.max(0.01, Math.hypot(dx, dy)); const f = (k * k) / d; disp[i].x += (dx / d) * f; disp[i].y += (dy / d) * f; disp[j].x -= (dx / d) * f; disp[j].y -= (dy / d) * f; }
    for (const e of edges) { const i = idx.get(e.a)!, j = idx.get(e.b)!; const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y; const d = Math.max(0.01, Math.hypot(dx, dy)); const f = (d * d) / k; disp[i].x -= (dx / d) * f; disp[i].y -= (dy / d) * f; disp[j].x += (dx / d) * f; disp[j].y += (dy / d) * f; }
    for (let i = 0; i < nodes.length; i++) { disp[i].x -= pos[i].x * 0.08; disp[i].y -= pos[i].y * 0.12; const len = Math.max(0.01, Math.hypot(disp[i].x, disp[i].y)); const m = Math.min(len, temp); pos[i].x = Math.max(-W / 2 + 60, Math.min(W / 2 - 60, pos[i].x + (disp[i].x / len) * m)); pos[i].y = Math.max(-H / 2 + 40, Math.min(H / 2 - 40, pos[i].y + (disp[i].y / len) * m)); }
    temp = Math.max(1.5, temp * 0.975);
  }
  for (let pass = 0; pass < 40; pass++) for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const min = radiusOf(nodes[i]) + radiusOf(nodes[j]) + 30; const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y; const d = Math.max(0.01, Math.hypot(dx, dy)); if (d < min) { const push = (min - d) / 2; pos[i].x -= (dx / d) * push; pos[i].y -= (dy / d) * push; pos[j].x += (dx / d) * push; pos[j].y += (dy / d) * push; } }
  const xs = pos.map((p) => p.x), ys = pos.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = 78, padY = 44;
  return pos.map((p) => ({ x: padX + ((p.x - minX) / Math.max(1, maxX - minX)) * (W - padX * 2), y: padY + ((p.y - minY) / Math.max(1, maxY - minY)) * (H - padY * 2) }));
}

/* ------------------------------------------------------------------ 证据库：公开信息 + 客户授权登记 */
const BASE_EV: Array<Omit<Evidence, 'id' | 'relevance'> & { base: number }> = [
  { source: '招投标公告', entity: 'wanjia', title: '万家商超 · 2026 年生鲜直采供应商招募公告', time: '2026-08-12', excerpt: '本地直采比例提升至 40%，招募蔬果、肉禽、水产供应商，要求冷链交付与 30 天账期', tags: ['生鲜直采', '农产品', '冷链', '账期', '需求'], base: 88, detail: '公告载明品类、交付与付款条款，可直接对应青原农业的供给。' },
  { source: '招投标公告', entity: 'c10', title: '东岭新能源 · 组件二期辅材与支架采购公告', time: '2026-07-30', excerpt: '二期产线辅材（背板、胶膜）与安装支架年度采购，预算约 1.8 亿，付款方式为 6 个月银行承兑', tags: ['辅材', '建材', '支架', '票据', '需求'], base: 86, detail: '票据付款条款意味着供应商有贴现 / 融资需求。' },
  { source: '招投标公告', entity: 'shenghe', title: '晟禾食品集团 · 包装材料年度集采', time: '2026-08-20', excerpt: '纸箱、标签与食品级塑料包材集采，账期 60 天，鼓励供应商接受核心企业确权的反向保理', tags: ['纸箱标签', '塑料包材', '账期', '保理', '核心企业信用', '需求'], base: 84 },
  { source: '招投标公告', entity: 'c06', title: '衡瑞医药流通 · 医药冷链运输服务采购', time: '2026-08-05', excerpt: '需具备药品冷链运输资质的服务商，覆盖城北与临港仓，年运输量约 1.2 万吨', tags: ['医药冷链', '冷链', '需求'], base: 80 },
  { source: '招投标公告', entity: 'ninggui', title: '宁桂精密机械 · 铝型材第二供应商询价', time: '2026-08-28', excerpt: '因现有供应商交付不稳，公开询价铝型材第二供应商，月需求约 180 吨，接受票据结算', tags: ['铝型材', '铝材', '票据', '需求'], base: 90 },
  { source: '招投标公告', entity: 'c09', title: '嘉禾连锁餐饮 · 中央厨房原料集采', time: '2026-08-15', excerpt: '中央厨房年度原料集采，优先本地食品加工企业直供，票据付款，需冷链配送', tags: ['原料直采', '食品', '票据', '冷链配送', '需求'], base: 82 },
  { source: '工商变更', entity: 'jileng', title: '极冷冷链 · 经营范围变更', time: '2026-06-18', excerpt: '经营范围新增「药品冷链运输」，注册资本增至 3,000 万', tags: ['医药冷链', '冷链仓储', '变更'], base: 74 },
  { source: '工商变更', entity: 'xintai', title: '鑫泰铝业 · 新增分支机构', time: '2026-05-22', excerpt: '新设高新区销售分公司，经营范围含铝型材销售', tags: ['铝型材', '铝材', '变更', '高新'], base: 66 },
  { source: '工商变更', entity: 'c10', title: '东岭新能源 · 新设子公司', time: '2026-04-10', excerpt: '新设储能子公司（100% 持股），注册资本 5,000 万', tags: ['新能源', '子公司', '核心企业信用'], base: 58 },
  { source: '年报', entity: 'shenghe', title: '晟禾食品集团 · 2025 年度报告', time: '2026-04-28', excerpt: '营收 18 亿，应付账款周转 58 天，前五大供应商含恒达包装、华塑制品', tags: ['食品', '纸箱标签', '账期', '核心企业信用', '应收融资'], base: 78 },
  { source: '年报', entity: 'c10', title: '东岭新能源 · 2025 年度报告', time: '2026-04-25', excerpt: '组件产能 3GW，二期扩建总投资 6 亿，辅材采购占成本 31%，主要供应商锂源材料', tags: ['组件', '辅材', '扩产', '核心企业信用', '备货资金'], base: 76 },
  { source: '年报', entity: 'wanjia', title: '万家商超 · 经营简报', time: '2026-07-08', excerpt: '32 家门店，生鲜销售占比 28%，本地直采比例目前 22%', tags: ['生鲜直采', '农产品', '零售'], base: 70 },
  { source: '舆情', entity: 'caisheng', title: '彩晟商贸 · 被执行信息', time: '2026-08-02', excerpt: '被执行金额 860 万，结算量环比下降 62%', tags: ['被执行', '预警', '风险', '食品'], base: 72, detail: '公开裁判文书网信息；涉及主体的撮合须先风险审查。' },
  { source: '舆情', entity: 'beiling', title: '北岭铝材 · 票据逾期', time: '2026-08-19', excerpt: '1 笔商业承兑逾期，下游客户宁桂精密启动第二供应商询价', tags: ['逾期', '铝材', '预警', '铝型材'], base: 75 },
  { source: '舆情', entity: 'c11', title: '汇源物流 · 行业运价', time: '2026-08-26', excerpt: '干线运价同比下行 12%，同业物流企业转向冷链与联运寻找增量', tags: ['干线运输', '冷链仓储', '运价'], base: 62 },
  { source: '舆情', entity: 'c07', title: '澄宇建材贸易 · 经营动态', time: '2026-08-30', excerpt: '传统地产客户回款放缓，转向新能源产线建材与支架供应', tags: ['建材', '支架', '新能源'], base: 64 },
  { source: '行内合作记录', entity: 'xintai', title: '鑫泰铝业 · 供需登记（已授权）', time: '2026-08-11', excerpt: '铝型材挤压产线闲置产能约 30%，可承接月 200 吨新订单，接受票据结算', tags: ['铝型材', '产能', '闲置', '票据', '授权', '供给'], base: 86, detail: '客户在本行供需登记表中主动填报并签署共享授权。' },
  { source: '行内合作记录', entity: 'liyuan', title: '锂源材料 · 供需登记（已授权）', time: '2026-08-09', excerpt: '旺季备货资金缺口约 2,000 万，愿以东岭确权应收申请供应商融资', tags: ['备货资金', '供应链融资', '辅材', '授权'], base: 84 },
  { source: '行内合作记录', entity: 'jileng', title: '极冷冷链 · 供需登记（已授权）', time: '2026-07-29', excerpt: '3 座冷库利用率 62%，寻求食品与医药客户；可与干线物流联运', tags: ['冷链仓储', '冷链配送', '医药冷链', '产能', '利用率', '干线运输', '授权', '供给'], base: 82 },
  { source: '行内合作记录', entity: 'hengda', title: '恒达包装 · 供需登记（已授权）', time: '2026-08-14', excerpt: '对晟禾应收账期 60 天，希望接入反向保理', tags: ['应收融资', '保理', '账期', '纸箱标签', '授权'], base: 80 },
  { source: '行内合作记录', entity: 'c12', title: '青原农业科技 · 供需登记（已授权）', time: '2026-08-21', excerpt: '蔬果基地 1,200 亩，具备冷链交付能力，寻求商超 / 餐饮直供渠道', tags: ['农产品', '生鲜直采', '冷链', '授权', '供给'], base: 78 },
  { source: '行内合作记录', entity: 'yunrui', title: '云锐机械 · 供需登记（已授权）', time: '2026-08-06', excerpt: 'CNC 加工中心 40 台，可承接精密零部件外协加工，产能利用率 55%', tags: ['外协加工', '产能', '利用率', '授权', '供给'], base: 76 },
  { source: '行内合作记录', entity: 'c09', title: '嘉禾连锁餐饮 · 账户动态', time: '2026-08-31', excerpt: '结算量环比上升 28%，新开 6 家门店，采购付款以票据为主', tags: ['结算', '票据', '原料直采', '需求'], base: 70 },
  { source: '行内合作记录', entity: 'c07', title: '澄宇建材贸易 · 账户动态', time: '2026-08-31', excerpt: '结算量环比下降 35%，客户经理已确认其寻求新客户并授权共享供需', tags: ['结算', '建材', '支架', '授权', '供给'], base: 68 },
  { source: '行内合作记录', entity: 'c08', title: '融岚软件 · 产品目录（已授权）', time: '2026-07-15', excerpt: '集团财务共享、MES 与医药流通系统，可与本行现金管理直联', tags: ['财务共享', 'MES', '流通系统', '授权', '供给', '结算'], base: 66 },
];
function buildEvidence(docs: UDoc[], cons: Constraint[]): Evidence[] {
  const out: Evidence[] = BASE_EV.map(({ base, ...e }, i) => ({ ...e, id: `E${i + 1}`, relevance: relevanceWith(base, e.tags, cons) }));
  docs.filter((d) => d.status === 'done').forEach((d, i) => out.push(docEvidence(d, `U${i + 1}`, '本行客户', cons)));
  return out;
}

/* ------------------------------------------------------------------ 匹配规则：需求×产能 / 行业互补 / 地理距离 / 结算关系 */
type Product = '结算' | '供应链融资' | '保理' | '票据' | '订单融资' | '流动资金';
interface Weights { fit: number; ind: number; geo: number; settle: number }
const W_LABEL: Record<keyof Weights, string> = { fit: '公开采购需求 × 产能', ind: '行业互补', geo: '地理距离', settle: '结算关系' };
interface Basis { fit: number; ind: number; geo: number; settle: number; matched: string[]; notes: Record<keyof Weights, string> }
interface Opp { id: string; a: string; b: string; type: EdgeType; basis: Basis; score: number; rate: number; volume: number; products: Product[]; why: string; benefit: string; chain: Chain; flags: string[]; path: string; variants: number }
interface Excl { inds: string[]; ids: string[]; unauth: boolean; risk: boolean }
const PRODUCT_TONE: Record<Product, string> = { 结算: 'blue', 供应链融资: 'green', 保理: 'purple', 票据: '', 订单融资: 'orange', 流动资金: 'red' };
const FIN_TAGS = ['核心企业信用', '应收融资', '备货资金'];
const CAP_TAGS = ['外协加工', '冷链仓储', '冷链配送', '产能', '干线运输', '医药冷链'];

function matchAll(w: Weights, cons: Constraint[], ev: Evidence[], excluded: Set<string>, excl: Excl, version: Version, alt: Record<string, number>): Opp[] {
  const inc = ev.filter((e) => !excluded.has(e.id));
  const B = version === 'B';
  const on = (k: string) => isOn(cons, k);
  const evFor = (id: string, tags: string[]) => inc.filter((e) => e.entity === id && e.tags.some((t) => tags.includes(t) || t === '需求' || t === '供给' || t === '授权'));
  const up = inc.filter((e) => e.source === '上传材料');
  const nodeOk = (n: Node) => !excl.ids.includes(n.id) && !excl.inds.some((x) => n.industry.includes(x)) && !cons.some((c) => c.on && c.key.startsWith('exclude:') && n.industry.includes(String(c.value)))
    && !(!n.auth && (excl.unauth || on('authOnly') || version === 'A')) && !((excl.risk || on('excludeRisk')) && (n.risk === 'red' || n.risk === 'orange')) && !(version === 'A' && n.risk === 'red');
  const eff: Weights = { fit: w.fit, ind: w.ind, geo: w.geo + (on('geoNear') ? 2 : 0), settle: w.settle + (on('settlementFirst') ? 1 : 0) };
  const sumW = eff.fit + eff.ind + eff.geo + eff.settle || 1;
  const threshold = (B ? 50 : 62) + (on('conservative') ? 5 : 0) - (on('fast') ? 4 : 0);
  const out: Opp[] = [];
  const seen = new Set<string>();
  for (const a of NODES) for (const b of NODES) {
    if (a.id === b.id || !nodeOk(a) || !nodeOk(b)) continue;
    const pa = PROFILE[a.id], pb = PROFILE[b.id]; if (!pa || !pb) continue;
    const edge = EDGES.find((e) => (e.a === a.id && e.b === b.id) || (e.a === b.id && e.b === a.id));
    const existing = edge && !edge.potential && edge.type !== '资金互补';
    let matched = pa.supply.filter((s) => pb.demand.includes(s));
    let type: EdgeType = '采购销售';
    if (pa.supply.includes('核心企业信用') && pb.demand.some((d) => FIN_TAGS.includes(d)) && edge) { matched = [`核心企业信用 × ${pb.demand.find((d) => FIN_TAGS.includes(d))}`]; type = '资金互补'; }
    else if (!matched.length) continue;
    else if (existing) continue;
    else if (matched.some((m) => CAP_TAGS.includes(m))) type = '产能互补';
    const key = [a.id, b.id].sort().join('|'); if (seen.has(key)) continue;
    const bidEv = inc.filter((e) => e.entity === b.id && e.source === '招投标公告' && e.tags.some((t) => matched.some((m) => m.includes(t) || t.includes(m))));
    const regEv = evFor(a.id, [...matched, ...pa.supply]).filter((e) => e.source === '行内合作记录' || e.source === '年报' || e.source === '工商变更');
    const otherEv = inc.filter((e) => (e.entity === a.id || e.entity === b.id) && !bidEv.includes(e) && !regEv.includes(e) && e.source !== '舆情').slice(0, 1);
    const upEv = up.filter((e) => e.tags.some((t) => matched.some((m) => m.includes(t) || t.includes(m)) || ['招标', '采购', '产能', '供需', '合同'].includes(t))).slice(0, 1);
    const negEv = inc.filter((e) => (e.entity === a.id || e.entity === b.id) && e.tags.some((t) => ['被执行', '逾期', '预警'].includes(t)));
    const fit = Math.min(100, (type === '资金互补' ? 70 : 45 + 20 * matched.length) + (bidEv.length ? 15 : 0) + (regEv.length ? 8 : 0) + (upEv.length ? 10 : 0));
    const ga = groupOf(a.industry).g, gb = groupOf(b.industry).g;
    const ind = ga === gb ? (COMPLEMENT.has(`${ga}|${gb}`) ? 70 : 45) : COMPLEMENT.has(`${ga}|${gb}`) || COMPLEMENT.has(`${gb}|${ga}`) ? 85 : 55;
    const geo = a.district === b.district ? 100 : ADJ.has(`${a.district}|${b.district}`) || ADJ.has(`${b.district}|${a.district}`) ? 70 : 40;
    const rs = (n: Node) => (n.relation.includes('贷款') ? 95 : n.relation.includes('结算') ? 80 : 60) - (n.auth ? 0 : 15);
    const settle = Math.round((rs(a) + rs(b)) / 2);
    let score = Math.round((eff.fit * fit + eff.ind * ind + eff.geo * geo + eff.settle * settle) / sumW);
    const district = valueOf(cons, 'district');
    if (district && (a.district === district || b.district === district)) score += 5;
    if (on('scf') && type === '资金互补') score += 5;
    if (on('credit') && type === '资金互补') score += 5;
    if (negEv.length) score -= 12;
    if (score < threshold) continue;
    seen.add(key);
    const flags: string[] = [];
    if (!a.auth) flags.push(`${a.name} 待授权`); if (!b.auth) flags.push(`${b.name} 待授权`);
    if (a.risk === 'orange' || b.risk === 'orange') flags.push('关注类客户');
    if (negEv.length) flags.push('有负面信息');
    const seed = hashStr(key);
    const r = rng(seed)();
    const volume = Math.round((Math.min(a.settlement, b.settlement) * (0.25 + r * 0.35) * (B ? 1.2 : 1)) / 10) * 10;
    const prodSets: Product[][] = type === '资金互补' ? (on('noCredit') ? [['结算'], ['结算', '票据']] : [['保理', '结算'], ['供应链融资', '票据']]) : type === '产能互补' ? (on('noCredit') ? [['结算'], ['结算', '票据']] : [['结算', '流动资金'], ['结算', '票据']]) : on('noCredit') ? [['结算', '票据'], ['结算']] : B ? [['结算', '票据', '订单融资'], ['结算', '保理']] : [['结算', '票据'], ['结算', '订单融资']];
    const ai = alt[key] ?? 0;
    const products = prodSets[ai % prodSets.length];
    const owners = `${P(b.owner).name}（${b.name} 客户经理）与 ${P(a.owner).name}（${a.name} 客户经理）`;
    const leader = (on('leaderVisit') || B) && (pa.supply.includes('核心企业信用') || pb.demand.length >= 3);
    const paths = [`${owners}联合拜访，先分别确认供需意向与授权范围，再安排双方会面${leader ? `；由 ${P('huang').name}（支行行长）协访 ${pa.supply.includes('核心企业信用') ? a.name : b.name}` : ''}`, `由本行牵头组织「${ga === gb ? ga : `${ga} × ${gb}`}」行业撮合会，邀请双方与另 2–3 家同类客户共同参加，降低单次撮合成本`, `先由 ${P(b.owner).name} 向 ${b.name} 递交供应商推荐函（含 ${a.name} 产能 / 资质摘要），取得书面同意后再联系 ${a.name}`];
    const path = paths[ai % paths.length];
    const evIds = [...bidEv, ...regEv, ...upEv, ...otherEv].map((e) => e.id).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 4);
    const rate = Math.max(20, Math.min(92, Math.round(score * 0.7 + (a.auth && b.auth ? 15 : 5) + (edge?.potential ? 5 : 0) + Math.min(8, evIds.length * 2) + (B ? 3 : 0) - (negEv.length ? 8 : 0))));
    const why = type === '资金互补' ? `${a.name} 具备核心企业信用，${b.name} 登记「${pb.demand.find((d) => FIN_TAGS.includes(d))}」需求；${edge?.label ?? ''}` : `${b.name} 有「${matched.join('、')}」需求（${bidEv.length ? bidEv[0].source : '登记 / 公开信息'}），${a.name} 具备对应供给：${a.note}`;
    const benefit = `${products.includes('结算') ? `归集结算量约 ${fmtWan(volume)}/年` : ''}${products.some((p) => ['保理', '供应链融资', '订单融资', '流动资金'].includes(p)) ? `；${products.find((p) => p !== '结算' && p !== '票据')} 约 ${fmtWan(Math.round(volume * 0.45 / 10) * 10)}` : ''}${products.includes('票据') ? `；开票 / 贴现约 ${fmtWan(Math.round(volume * 0.3 / 10) * 10)}` : ''}`;
    const counter = negEv.length ? `${nodeOf(negEv[0].entity!).name} 有负面公开信息（${negEv[0].excerpt.slice(0, 18)}…），撮合前须风险审查` : !a.auth || !b.auth ? `${!a.auth ? a.name : b.name} 尚未授权共享供需信息，不得向对方披露其在本行的账户与交易数据` : bidEv.length ? `若 ${b.name} 已通过公告锁定供应商，撮合价值有限；反例：公告可能仅为比价` : `需求来自登记 / 推断而非公开公告，双方意向需先电话核实`;
    out.push({ id: `op-${key}`, a: a.id, b: b.id, type, basis: { fit, ind, geo, settle, matched, notes: { fit: `${matched.length} 项匹配${bidEv.length ? ' + 公开公告' : ''}${regEv.length ? ' + 登记' : ''}${upEv.length ? ' + 上传材料' : ''}`, ind: ga === gb ? `同链（${ga}）` : `${ga} × ${gb}`, geo: a.district === b.district ? `同区（${a.district}）` : `${a.district} / ${b.district}`, settle: `${a.relation.split(' · ')[0]} / ${b.relation.split(' · ')[0]}` } }, score, rate, volume, products, why, benefit, flags, path, variants: Math.max(paths.length, prodSets.length),
      chain: { evidence: evIds, judgement: `${b.name} 存在「${matched[0]}」需求，${a.name} 有对应供给；四项匹配得分 ${score}（阈值 ${threshold}）`, suggestion: path, confidence: Math.min(0.95, (score / 100) * (evIds.length ? 1 : 0.8) + (bidEv.length ? 0.05 : 0)), counter } });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 9);
}

/* ------------------------------------------------------------------ 工单 */
const STATUS = ['待授权确认', '已联系甲方', '已联系乙方', '双方会面', '达成意向', '转化落地'];
interface Ticket { id: string; opp: string; a: string; b: string; products: Product[]; status: number; log: { t: string; s: string }[]; contacts: { a: { name: string; title: string; tel: string }; b: { name: string; title: string; tel: string } }; plan: string; created: string }
const SUR = ['陈', '沈', '吴', '何', '赵', '钱', '孙', '郑', '冯', '许', '苏', '程', '韩', '曹', '袁', '邓', '傅', '钟'];
const GIV = ['国栋', '雅琴', '建平', '晓菲', '立群', '文静', '海涛', '敏华', '志强', '丽娟', '俊杰', '一鸣', '思远', '慧兰', '振华', '美玲'];
const TITLES = ['采购总监', '财务总监', '总经理', '供应链经理', '销售总监', '财务经理'];
function contactOf(seed: number) { const r = rng(seed); const mk = () => ({ name: SUR[Math.floor(r() * SUR.length)] + GIV[Math.floor(r() * GIV.length)], title: TITLES[Math.floor(r() * TITLES.length)], tel: `13${Math.floor(r() * 9)}****${String(Math.floor(r() * 9000) + 1000)}` }); return { a: mk(), b: mk() }; }
const planText = (a: Node, b: Node, products: Product[], volume: number, path: string) => `撮合路径：${path}。本行角色：仅提供撮合与配套金融方案，不代表任一方谈判价格。配套产品：${products.join(' / ')}，由产品部出具方案；预计业务量 ${fmtWan(volume)}/年。合规：不向任一方披露另一方在本行的账户、授信与交易数据；征信不用于营销。`;
const TICKETS0: Ticket[] = [
  { id: 'MT-2608-07', opp: 'op-c09|shenghe', a: 'shenghe', b: 'c09', products: ['结算', '票据'], status: 4, created: '08-21', contacts: contactOf(7101), plan: planText(nodeOf('shenghe'), nodeOf('c09'), ['结算', '票据'], 2400, '林小雨与周慧敏联合拜访，先分别确认意向再安排会面'), log: [{ t: '08-21', s: '工单创建，双方授权确认' }, { t: '08-25', s: '林小雨联系嘉禾采购总监，确认直采意向' }, { t: '09-02', s: '双方在本行会议室会面，达成年度直采意向 2,400 万' }] },
  { id: 'MT-2608-04', opp: 'op-c10|liyuan', a: 'c10', b: 'liyuan', products: ['供应链融资', '票据'], status: 5, created: '08-12', contacts: contactOf(7102), plan: planText(nodeOf('c10'), nodeOf('liyuan'), ['供应链融资', '票据'], 8500, '周慧敏牵头，东岭确权后为锂源申请供应商融资'), log: [{ t: '08-12', s: '工单创建' }, { t: '08-19', s: '双方会面，东岭同意确权' }, { t: '09-01', s: '供应商融资 2,000 万审批通过，首笔放款 800 万' }] },
];
const HIST0 = [
  { time: '09-02 17:10', text: '晟禾食品集团 × 嘉禾连锁餐饮 双方会面，达成直采意向', tone: 'green' },
  { time: '09-01 11:30', text: '东岭新能源 × 锂源材料 供应商融资首笔放款 800 万', tone: 'blue' },
  { time: '08-21 15:20', text: '新建撮合工单 MT-2608-07', tone: 'orange' },
];
const EXAMPLES = ['优先同城、已授权的客户', '不做授信，只做结算撮合', '排除物流行业', '排除风险预警客户', '聚焦临港区', '需要行长协访核心企业'];
const PRESET_Q = ['预算有限怎么撮合？', '最快能落地的是哪条？', '同业会不会已经介入？', '集团董事长要不要见？', '把结算关系权重调高', '不做授信还能做什么？', '有风险的机会怎么处理？', '下一步先做什么？'];
const MANUAL_CONS: Record<string, { label: string; group: Constraint['group'] }> = {
  noCredit: { label: '不做授信：本轮不涉及授信 / 融资类产品', group: '约束' }, excludeRisk: { label: '排除风险预警客户', group: '约束' }, authOnly: { label: '仅使用客户已授权共享的信息', group: '约束' },
  geoNear: { label: '优先地理邻近对象', group: '范围' }, leaderVisit: { label: '需要行领导协访', group: '资源' }, settlementFirst: { label: '以结算 / 账户类业务切入', group: '目标' }, lowCost: { label: '预算有限：优先低成本触达（撮合会）', group: '资源' },
};

/* ------------------------------------------------------------------ 页面 */
export default function ResourceMatching() {
  const W = 900, H = 520;
  const [types, setTypes] = useState<Record<EdgeType, boolean>>({ 上下游: true, 采购销售: true, 产能互补: true, 资金互补: true });
  const [q, setQ] = useState('');
  const [sel, setSel] = useState('ninggui');
  const [intent, setIntent] = useState('');
  const [manual, setManual] = useState<Constraint[]>([]);
  const [offKeys, setOffKeys] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [weights, setWeights] = useState<Weights>({ fit: 4, ind: 2, geo: 1, settle: 2 });
  const [excl, setExcl] = useState<Excl>({ inds: [], ids: [], unauth: false, risk: false });
  const [docs, setDocs] = useState<UDoc[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [token, setToken] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [alt, setAlt] = useState<Record<string, number>>({});
  const [version, setVersion] = useState<Version>('A');
  const [compare, setCompare] = useState(false);
  const [keep, setKeep] = useState<Record<Version, boolean>>({ A: true, B: false });
  const [oppSel, setOppSel] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS0);
  const [tk, setTk] = useState(TICKETS0[0].id);
  const [logText, setLogText] = useState('');
  const [editing, setEditing] = useState(false);
  const [hl, setHl] = useState('');
  const [askReq, setAskReq] = useState<{ q: string; n: number } | null>(null);
  const [toast, setToast] = useState('');
  const [hist, setHist] = useState(HIST0);
  const tkRef = useRef<HTMLDivElement>(null);

  const pos = useMemo(() => layout(NODES, EDGES, W, H, 20260906), []);
  const pmap = useMemo(() => new Map(NODES.map((n, i) => [n.id, pos[i]])), [pos]);
  const constraints = useMemo(() => { const parsed = parseIntent(intent); const all = [...parsed, ...manual.filter((m) => !parsed.some((x) => x.key === m.key))]; return all.filter((c) => !removed.has(c.key)).map((c) => ({ ...c, on: !offKeys.has(c.key) })); }, [intent, manual, offKeys, removed]);
  const evidence = useMemo(() => buildEvidence(docs, constraints), [docs, constraints]);
  const oppsA = useMemo(() => matchAll(weights, constraints, evidence, excluded, excl, 'A', alt), [weights, constraints, evidence, excluded, excl, alt]);
  const oppsB = useMemo(() => matchAll(weights, constraints, evidence, excluded, excl, 'B', alt), [weights, constraints, evidence, excluded, excl, alt]);
  const opps = version === 'A' ? oppsA : oppsB;
  const done = phase === 'done';
  const incN = evidence.filter((e) => !excluded.has(e.id)).length;
  const exN = evidence.length - incN;
  const node = nodeOf(sel);
  const visEdges = EDGES.filter((e) => types[e.type]);
  const neighbors = visEdges.filter((e) => e.a === sel || e.b === sel);
  const nbIds = new Set(neighbors.flatMap((e) => [e.a, e.b]));
  const matchQ = (x: Node) => q && (x.name.includes(q) || x.industry.includes(q));
  const ticket = tickets.find((t) => t.id === tk);
  const oppCur = opps.find((o) => o.id === oppSel);
  const sumW = weights.fit + weights.ind + weights.geo + weights.settle || 1;
  const industries = useMemo(() => Array.from(new Set(NODES.map((n) => n.industry))), []);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2600); };
  const flashHl = (k: string) => { setHl(k); window.setTimeout(() => setHl(''), 2600); };
  const now = () => '09-06 ' + new Date().toTimeString().slice(0, 5);
  const HL = (k: string) => (hl === k ? ' ai-hl' : '');
  const discover = () => { setPhase('retrieving'); setToken((x) => x + 1); setOppSel(''); setHist((h) => [{ time: now(), text: `发现撮合机会：权重 ${weights.fit}/${weights.ind}/${weights.geo}/${weights.settle} · 约束 ${constraints.filter((c) => c.on).length} 项 · 材料 ${docs.length} 份`, tone: 'purple' }, ...h]); };
  const toggleEv = (id: string) => { setExcluded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); flashHl('opps'); };
  const addCons = (key: string) => { const m = MANUAL_CONS[key]; if (!m) return; setRemoved((s) => { const n = new Set(s); n.delete(key); return n; }); setOffKeys((s) => { const n = new Set(s); n.delete(key); return n; }); setManual((ms) => (ms.some((x) => x.key === key) ? ms : [...ms, { key, label: m.label, group: m.group, from: '追问对话', on: true }])); flashHl('intent'); };
  const startMatch = (o: Opp) => {
    const exist = tickets.find((t) => t.opp === o.id); if (exist) { setTk(exist.id); flash(`已存在工单 ${exist.id}`); tkRef.current?.scrollIntoView({ behavior: 'smooth' }); return; }
    const a = nodeOf(o.a), b = nodeOf(o.b); const both = a.auth && b.auth;
    const id = `MT-2609-${String(tickets.length + 3).padStart(2, '0')}`;
    const t: Ticket = { id, opp: o.id, a: o.a, b: o.b, products: o.products, status: both ? 1 : 0, created: '09-06', contacts: contactOf(hashStr(o.id) % 5000), plan: planText(a, b, o.products, o.volume, o.path), log: [{ t: '09-06', s: both ? `由机会一键生成；依据证据 ${o.chain.evidence.join('、') || '规则推断'}；双方授权已确认` : `由机会一键生成；${!a.auth ? a.name : b.name} 尚未授权共享供需信息，待客户经理取得授权` }] };
    setTickets((ts) => [t, ...ts]); setTk(id); setHist((h) => [{ time: now(), text: `发起撮合 ${a.name} × ${b.name}，工单 ${id}`, tone: 'orange' }, ...h]); flash(`撮合工单 ${id} 已生成`);
    window.setTimeout(() => tkRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  const advance = () => { if (!ticket || ticket.status >= STATUS.length - 1) return; const next = ticket.status + 1; setTickets((ts) => ts.map((t) => (t.id === ticket.id ? { ...t, status: next, log: [...t.log, { t: '09-06', s: `状态推进：${STATUS[next]}` }] } : t))); if (next === STATUS.length - 1) setHist((h) => [{ time: now(), text: `${nodeOf(ticket.a).name} × ${nodeOf(ticket.b).name} 转化落地`, tone: 'green' }, ...h]); };
  const addLog = () => { if (!ticket || !logText.trim()) return; setTickets((ts) => ts.map((t) => (t.id === ticket.id ? { ...t, log: [...t.log, { t: '09-06', s: logText.trim() }] } : t))); setLogText(''); };
  const onApply = (a: ApplyAction) => {
    if (a.id === 'addCons' && a.payload) { addCons(a.payload); flash(`已应用：${a.label}`); }
    else if (a.id === 'removeCons' && a.payload) { const k = a.payload; setRemoved((s) => new Set(s).add(k)); setManual((ms) => ms.filter((x) => x.key !== k)); flashHl('intent'); flash(`已应用：${a.label}`); }
    else if (a.id === 'weight' && a.payload) { const [k, v] = a.payload.split('='); setWeights((w) => ({ ...w, [k]: Number(v) })); flashHl('weights'); flash(`已应用：${a.label}`); }
    else if (a.id === 'exclRisk') { setExcl((e) => ({ ...e, risk: true })); flashHl('weights'); flash(`已应用：${a.label}`); }
    else if (a.id === 'exclUnauth') { setExcl((e) => ({ ...e, unauth: true })); flashHl('weights'); flash(`已应用：${a.label}`); }
    else if (a.id === 'altAll') { setAlt((x) => { const n = { ...x }; for (const o of opps) n[o.id.slice(3)] = 1; return n; }); flashHl('opps'); flash(`已应用：${a.label}`); }
    else if (a.id === 'setVersion' && a.payload) { setVersion(a.payload as Version); setKeep((k) => ({ ...k, [a.payload as Version]: true })); flashHl('opps'); flash(`已应用：${a.label}`); }
    else if (a.id === 'ticket' && a.payload) { const o = opps.find((x) => x.id === a.payload); if (o) startMatch(o); }
  };
  const answer = (qs: string): Answer => {
    const inc = evidence.filter((e) => !excluded.has(e.id));
    const byTag = (...tags: string[]) => inc.filter((e) => tags.some((tg) => e.tags.some((x) => x.includes(tg)))).sort((a, b) => b.relevance - a.relevance).slice(0, 3).map((e) => e.id);
    const top = opps[0];
    const nm = (o: Opp) => `${nodeOf(o.a).name} × ${nodeOf(o.b).name}`;
    const hit = opps.find((o) => qs.includes(nodeOf(o.a).name) || qs.includes(nodeOf(o.b).name));
    if (hit && /证据|依据|为什么|反例|支持/.test(qs)) return { text: `「${nm(hit)}」：${hit.chain.judgement}。匹配依据：需求×产能 ${hit.basis.fit}（${hit.basis.notes.fit}）、行业互补 ${hit.basis.ind}（${hit.basis.notes.ind}）、地理 ${hit.basis.geo}（${hit.basis.notes.geo}）、结算关系 ${hit.basis.settle}。反例 / 风险：${hit.chain.counter}`, evidence: hit.chain.evidence };
    if (/预算|成本|费用|便宜/.test(qs)) return { text: `预算有限时，把逐对联合拜访改为行内撮合会：一次活动覆盖 ${opps.length} 条机会中的同链条客户（如${opps.slice(0, 2).map(nm).join('、')}），边际成本最低；产品部集中出方案。`, evidence: byTag('授权', '需求'), apply: { id: 'altAll', label: '把撮合路径统一改为行内撮合会' } };
    if (/最快|时间|多久|落地|快/.test(qs)) { const fast = opps.filter((o) => !o.flags.length).sort((a, b) => b.basis.geo - a.basis.geo || b.rate - a.rate)[0] ?? top; return fast ? { text: `最快可落地的是「${nm(fast)}」：双方${fast.flags.length ? '' : '均已授权、'}${fast.basis.notes.geo}，成功率 ${fast.rate}%，配套 ${fast.products.join(' / ')}。建议本周内由 ${P(nodeOf(fast.b).owner).name} 先电话核实需求。`, evidence: fast.chain.evidence, apply: { id: 'ticket', label: `为 ${nm(fast)} 生成撮合工单`, payload: fast.id } } : { text: '当前条件下没有可落地的机会，请放宽阈值或切换到进取型版本。', apply: { id: 'setVersion', label: '切换到进取型版本', payload: 'B' } }; }
    if (/同业|他行|竞品|介入|对手/.test(qs)) return { text: `公开公告类需求（${inc.filter((e) => e.source === '招投标公告').length} 条）对所有银行可见，同业可能已介入；本行优势在于双方都是本行客户、且乙方在本行登记了产能 / 资金需求（行内合作记录，同业看不到）。建议提高「结算关系」权重，优先撮合双方都在本行结算的组合。`, evidence: byTag('授权', '结算'), apply: weights.settle >= 4 ? undefined : { id: 'weight', label: '结算关系权重调为 4', payload: 'settle=4' } };
    if (/董事长|老板|集团|行长|协访/.test(qs)) return { text: `涉及核心企业（晟禾食品集团、东岭新能源）的资金互补类撮合，决策在集团层面：建议由 ${P('huang').name}（支行行长）协访集团 CFO / 董事长，客户经理负责供应商侧。加入「需要行领导协访」后，相关机会的撮合路径会自动改写。`, evidence: byTag('核心企业信用'), apply: isOn(constraints, 'leaderVisit') ? undefined : { id: 'addCons', label: '加入约束「需要行领导协访」', payload: 'leaderVisit' } };
    if (/结算|账户|归集|权重/.test(qs) && /结算/.test(qs)) return { text: `当前权重：需求×产能 ${weights.fit} / 行业互补 ${weights.ind} / 地理 ${weights.geo} / 结算关系 ${weights.settle}。把结算关系调高后，双方都是本行贷款 / 结算客户的组合排名上升，未授权客户排名下降。`, evidence: byTag('结算'), apply: { id: 'weight', label: '结算关系权重调为 5', payload: 'settle=5' } };
    if (/授信|贷款|融资|保理/.test(qs)) return isOn(constraints, 'noCredit')
      ? { text: `当前约束「不做授信」：资金互补类机会的配套产品已改为结算 / 票据，不含保理与供应商融资。若客户主动提出融资需求，可解除约束，我会恢复保理与供应链融资建议。`, evidence: byTag('保理', '备货资金'), apply: { id: 'removeCons', label: '解除「不做授信」约束', payload: 'noCredit' } }
      : { text: `不做授信时仍可做：结算归集、票据开立 / 贴现、代发与现金管理直联；资金互补类机会会降级为结算撮合。`, evidence: byTag('结算', '票据'), apply: { id: 'addCons', label: '加入约束「不做授信」', payload: 'noCredit' } };
    if (/风险|预警|被执行|逾期|负面/.test(qs)) { const risky = opps.filter((o) => o.flags.length); return { text: `${risky.length ? `带风险标记的机会 ${risky.length} 条：${risky.map((o) => `${nm(o)}（${o.flags.join('、')}）`).join('；')}。` : '当前机会均无风险标记。'}负面舆情（彩晟商贸被执行、北岭铝材票据逾期）已在证据面板，可标记「不采信」后重算；也可直接开启「排除风险预警客户」。`, evidence: byTag('被执行', '逾期'), apply: excl.risk || isOn(constraints, 'excludeRisk') ? undefined : { id: 'exclRisk', label: '排除风险预警客户' } }; }
    if (/距离|同城|同区|就近|地理/.test(qs)) return { text: `地理距离目前权重 ${weights.geo}。同区 100 分、相邻区 70 分、其他 40 分；调高后同区组合（如临港区的鑫泰铝业、极冷冷链、锂源材料）排名上升。`, evidence: byTag('临港', '高新'), apply: weights.geo >= 4 ? undefined : { id: 'weight', label: '地理距离权重调为 4', payload: 'geo=4' } };
    if (/怎么算|得分|规则|算法|依据/.test(qs)) return { text: `匹配得分 = (需求×产能 × ${weights.fit} + 行业互补 × ${weights.ind} + 地理距离 × ${weights.geo} + 结算关系 × ${weights.settle}) ÷ ${sumW}。需求×产能：匹配项数 + 公开公告 +15 + 行内登记 +8 + 上传材料 +10；行业互补：跨链互补 85 / 同链 45–70；地理：同区 100 / 相邻 70；结算关系：贷款客户 95 / 结算户 80，未授权 −15。阈值 ${version === 'A' ? 62 : 50}（${VERSION_LABEL[version]}）。`, evidence: inc.slice(0, 2).map((e) => e.id) };
    if (/下一步|怎么做|先做|开始/.test(qs)) return top ? { text: `建议先推进「${nm(top)}」（得分 ${top.score}，成功率 ${top.rate}%）：① ${P(nodeOf(top.b).owner).name} 电话核实 ${nodeOf(top.b).name} 的需求与授权；② ${P(nodeOf(top.a).owner).name} 确认 ${nodeOf(top.a).name} 产能与报价意愿；③ 一周内安排会面。可一键生成工单。`, evidence: top.chain.evidence, apply: { id: 'ticket', label: `为 ${nm(top)} 生成撮合工单`, payload: top.id } } : { text: '当前无机会，请先点击「检索证据并匹配」。' };
    if (/材料|上传|招标|产能/.test(qs)) return { text: `已读取上传材料 ${inc.filter((e) => e.source === '上传材料').length} 份。招标公告 / 采购需求清单会提高对应甲方的「需求×产能」得分（+10），产能登记表会提高乙方供给可信度。`, evidence: inc.filter((e) => e.source === '上传材料').map((e) => e.id).slice(0, 3) };
    return { text: `我在 ${inc.length} 条证据里没有找到与「${qs}」直接相关的内容。可以上传招标公告 / 采购清单 / 产能登记表，或在「我的目标 / 约束」里写明（如「排除物流行业」「优先同城」），我会重新匹配。`, evidence: inc.slice(0, 2).map((e) => e.id) };
  };
  const vsum = (v: Version) => { const os = v === 'A' ? oppsA : oppsB; return { n: os.length, avg: os.length ? Math.round(os.reduce((s, o) => s + o.rate, 0) / os.length) : 0, vol: os.reduce((s, o) => s + o.volume, 0), flags: os.filter((o) => o.flags.length).length, top: os[0] }; };
  const exclInds = [...excl.inds, ...constraints.filter((c) => c.on && c.key.startsWith('exclude:')).map((c) => String(c.value))];

  return (
    <div className="rm">
      <style>{AI_CSS}{CSS}</style>
      <div className="rm-crumb">智慧获客引擎 <ChevronRight size={12} /> <b>客户资源整合与撮合</b></div>
      <div className="rm-top">
        <div>
          <h1><Network size={22} color="var(--green)" />客户资源整合与撮合</h1>
          <p>在本行客户之间按「公开采购需求 × 产能 / 行业互补 / 地理距离 / 结算关系」规则匹配撮合机会；权重、排除条件、约束与证据都可调整，结果实时重算。</p>
        </div>
        <div className="rm-acts">
          <button className="btn gold" onClick={() => tkRef.current?.scrollIntoView({ behavior: 'smooth' })}><ClipboardList size={14} />撮合工单（{tickets.length}）</button>
          <button className="btn" onClick={discover} disabled={phase === 'retrieving'}>{phase === 'retrieving' ? <><Search size={14} />检索证据中…</> : done ? <><RotateCcw size={14} />重新检索并匹配</> : <><Sparkles size={14} />检索证据并匹配机会</>}</button>
        </div>
      </div>
      <div className="rm-note">
        <span className="chip green"><ShieldCheck size={12} />仅用公开信息与客户明确授权共享的供需信息 · 不向任一方披露另一方账户与交易数据 · 征信不用于营销</span>
        <span className="chip blue"><i />证据 {evidence.length} 条{exN ? ` · 已排除 ${exN} 条` : ''}</span>
        <span className="chip purple"><i />生效约束 {constraints.filter((c) => c.on).length} 项</span>
      </div>

      <div className="grid g4">
        <div className="tile"><b className="num">{NODES.length} <small style={{ fontSize: 13 }}>户</small></b><span>关系网络节点 · 本行客户</span></div>
        <div className="tile"><b className="num">{NODES.filter((n) => n.auth).length} <small style={{ fontSize: 13 }}>户</small></b><span>已授权共享供需信息</span></div>
        <div className="tile"><b className="num">{evidence.filter((e) => e.source === '招投标公告').length} <small style={{ fontSize: 13 }}>条</small></b><span>公开采购需求（招投标公告）</span></div>
        <div className="tile"><b className="num">{done ? opps.length : '—'}</b><span>当前版本匹配机会 · {VERSION_LABEL[version]}</span></div>
      </div>

      {/* 关系网络图 + 节点详情 */}
      <div className="rm-g21 rm-mt">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />本行客户关系网络图</div><span className="card-s">节点大小 = 年结算量 · 颜色 = 行业 · 点击节点查看{oppCur ? ' · 高亮为选中机会' : ''}</span></div>
          <div className="rm-tools">
            <div className="rm-in"><Search size={13} color="var(--ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索企业 / 行业" /></div>
            {(Object.keys(types) as EdgeType[]).map((t) => <span key={t} className={`rm-tg${types[t] ? ' on' : ''}`} onClick={() => setTypes({ ...types, [t]: !types[t] })}><i style={{ borderColor: EDGE_STYLE[t].color, borderTopStyle: EDGE_STYLE[t].dash ? 'dashed' : 'solid' }} />{t}</span>)}
          </div>
          <div className="rm-svg">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="客户关系网络图">
              <defs>
                {GROUPS.map((g) => <radialGradient key={g.g} id={`rm-n-${g.color.slice(1)}`} cx=".35" cy=".3" r=".9"><stop offset="0" stopColor={lighten(g.color, 0.55)} /><stop offset="1" stopColor={g.color} /></radialGradient>)}
                <linearGradient id="rm-opp-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e63946" /><stop offset="1" stopColor="#f4b942" /></linearGradient>
                {(Object.keys(EDGE_STYLE) as EdgeType[]).map((t) => <marker key={t} id={`rm-arr-${EDGE_STYLE[t].tone || 'gold'}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={EDGE_STYLE[t].color} /></marker>)}
              </defs>
              {visEdges.map((e, i) => {
                const a = pmap.get(e.a)!, b = pmap.get(e.b)!; const st = EDGE_STYLE[e.type]; const hot = e.a === sel || e.b === sel;
                const ra = radiusOf(nodeOf(e.a)), rb = radiusOf(nodeOf(e.b)); const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
                const x0 = a.x + (dx / d) * ra, y0 = a.y + (dy / d) * ra, x1 = b.x - (dx / d) * (rb + 4), y1 = b.y - (dy / d) * (rb + 4);
                return (
                  <g key={i} opacity={sel && !hot ? 0.28 : 1}>
                    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={st.color} strokeWidth={hot ? 3 : 2} strokeDasharray={st.dash} markerEnd={`url(#rm-arr-${st.tone || 'gold'})`} opacity={e.potential ? 0.7 : 1} />
                    {hot && <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill={st.color}>{e.label}{e.potential ? '（潜在）' : ''}</text>}
                  </g>
                );
              })}
              {oppCur && (() => { const a = pmap.get(oppCur.a)!, b = pmap.get(oppCur.b)!; return <g><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="url(#rm-opp-line)" strokeWidth="4" strokeDasharray="8 5" opacity=".9" /><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} textAnchor="middle" fontSize="11" fontWeight="800" fill="#c3272b">撮合机会 · 得分 {oppCur.score}</text></g>; })()}
              {NODES.map((nd) => {
                const p = pmap.get(nd.id)!; const g = groupOf(nd.industry); const r = radiusOf(nd);
                const isSel = nd.id === sel; const inOpp = oppCur && (oppCur.a === nd.id || oppCur.b === nd.id);
                const dim = (sel && !isSel && !nbIds.has(nd.id) && !inOpp) || (q && !matchQ(nd)) || !(!exclInds.some((x) => nd.industry.includes(x)) && !excl.ids.includes(nd.id));
                return (
                  <g key={nd.id} className="rm-node" transform={`translate(${p.x},${p.y})`} onClick={() => setSel(nd.id)} opacity={dim ? 0.3 : 1}>
                    {(isSel || inOpp) && <circle r={r + 7} fill="none" stroke={inOpp ? '#c3272b' : g.color} strokeWidth="2" strokeDasharray="4 3" />}
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
            <span className="ai-muted">◦ 右上小标：尚未授权共享供需信息 · 被排除的节点淡出</span>
          </div>
        </div>
        <div className="card blue fade-in">
          <div className="card-h"><div className="card-t"><Building2 size={14} />{node.name}</div><span className={`chip ${node.auth ? 'green' : 'red'}`}><i />{node.auth ? '已授权共享供需' : '未授权共享供需'}</span></div>
          <div className="ai-muted">{node.industry} · {node.district} · {node.relation} · 客户经理 {P(node.owner).name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{node.tags.map((t) => <span key={t} className="chip"><i />{t}</span>)}</div>
          <div className="rm-kv">
            <div className="k">年结算量<b className="num">{fmtWan(node.settlement)}</b></div><div className="k">存款<b className="num">{fmtWan(node.deposit)}</b></div>
            <div className="k">可供给<b style={{ fontSize: 12 }}>{PROFILE[node.id]?.supply.join('、') || '—'}</b></div><div className="k">需求（公开 / 登记）<b style={{ fontSize: 12 }}>{PROFILE[node.id]?.demand.join('、') || '—'}</b></div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 8 }}>{node.note}</p>
          <div className="ai-sec"><Link2 size={12} />关联企业</div>
          {neighbors.map((e, i) => { const other = nodeOf(e.a === sel ? e.b : e.a); const g = groupOf(other.industry); return <div className="rm-nb" key={i} onClick={() => setSel(other.id)}><span className="sw" style={{ background: `linear-gradient(135deg,${lighten(g.color, 0.5)},${g.color})` }} /><span className="nm">{other.name}</span><span className={`chip ${EDGE_STYLE[e.type].tone}`} style={{ padding: '2px 8px' }}><i />{e.type}</span><span className="ty">{e.a === sel ? '→' : '←'} {e.label}</span></div>; })}
          {neighbors.length === 0 && <div className="ai-muted">当前筛选下无关系边</div>}
          <div className="ai-sec"><Search size={12} />相关证据</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}><EvRefs ids={evidence.filter((e) => e.entity === node.id).map((e) => e.id)} evidence={evidence} excluded={excluded} />{evidence.filter((e) => e.entity === node.id).length === 0 && <span className="ai-muted">无</span>}</div>
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setExcl((e) => ({ ...e, ids: e.ids.includes(node.id) ? e.ids.filter((x) => x !== node.id) : [...e.ids, node.id] }))}><Ban size={12} />{excl.ids.includes(node.id) ? '取消排除该客户' : '从撮合中排除该客户'}</button>
        </div>
      </div>

      {/* 输入：目标约束 + 权重 + 排除 + 上传 */}
      <div className="rm-g12 rm-mt">
        <div className="card gold fade-in">
          <div className={HL('intent')} style={{ borderRadius: 12 }}>
            <IntentBox value={intent} onChange={setIntent} constraints={constraints} examples={EXAMPLES} placeholder="例：优先同城、已授权的客户；不做授信；排除物流行业；需要行长协访核心企业"
              onToggle={(k) => setOffKeys((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
              onRemove={(k) => { setRemoved((s) => new Set(s).add(k)); setManual((ms) => ms.filter((x) => x.key !== k)); }} />
          </div>
          <div className="rm-mt">
            <UploadDocs label="上传材料（招标公告 / 采购需求清单 / 产能登记表 / 供货合同）" hint="识别后进入证据面板并提高对应甲方 / 乙方的匹配得分" types={['招标公告', '采购需求清单', '产能登记表', '供货合同']} presets={['万家商超_生鲜直采招标公告.pdf', '鑫泰铝业_产能登记表.xlsx', '东岭新能源_辅材采购需求清单.xlsx', '晟禾集团_供货合同样本.docx']} onChange={setDocs} />
          </div>
        </div>
        <div className={`card fade-in${HL('weights')}`}>
          <div className="card-h"><div className="card-t"><SlidersHorizontal size={14} />匹配权重与排除条件</div><span className="rm-live"><Check size={11} />调整后实时重算</span></div>
          {(Object.keys(W_LABEL) as (keyof Weights)[]).map((k) => (
            <div className="ai-w" key={k}>
              <span className="l">{W_LABEL[k]}{k === 'geo' && isOn(constraints, 'geoNear') && <span className="chip green" style={{ marginLeft: 6, padding: '0 6px', fontSize: 10 }}><i />约束 +2</span>}{k === 'settle' && isOn(constraints, 'settlementFirst') && <span className="chip green" style={{ marginLeft: 6, padding: '0 6px', fontSize: 10 }}><i />约束 +1</span>}</span>
              <input type="range" min={0} max={5} step={1} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} />
              <b className="num">{weights[k]}</b><span className="pct">{Math.round((weights[k] / sumW) * 100)}%</span>
            </div>
          ))}
          <div className="rm-formula">得分 = (需求×产能 × {weights.fit} + 行业互补 × {weights.ind} + 地理 × {weights.geo} + 结算关系 × {weights.settle}) ÷ {sumW}；入选阈值 {version === 'A' ? 62 : 50}（{VERSION_LABEL[version]}）{isOn(constraints, 'conservative') ? ' +5（稳健）' : ''}{isOn(constraints, 'fast') ? ' −4（加快）' : ''}</div>
          <div className="ai-sec"><Ban size={12} />排除条件</div>
          <div className="rm-ex">
            <span className={`chip${excl.unauth ? ' red' : ''}`} onClick={() => setExcl({ ...excl, unauth: !excl.unauth })}><i />排除未授权客户{version === 'A' && <small style={{ marginLeft: 4, fontWeight: 600 }}>（稳健型默认）</small>}</span>
            <span className={`chip${excl.risk || isOn(constraints, 'excludeRisk') ? ' red' : ''}`} onClick={() => setExcl({ ...excl, risk: !excl.risk })}><i />排除风险预警（红 / 橙）</span>
          </div>
          <div className="rm-ex">
            <span className="ai-muted">排除行业：</span>
            {industries.map((ind) => <span key={ind} className={`chip${exclInds.includes(ind) ? ' red' : ''}`} style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setExcl({ ...excl, inds: excl.inds.includes(ind) ? excl.inds.filter((x) => x !== ind) : [...excl.inds, ind] })}><i />{ind}</span>)}
          </div>
          {excl.ids.length > 0 && <div className="rm-ex"><span className="ai-muted">排除客户：</span>{excl.ids.map((id) => <span key={id} className="chip red" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setExcl({ ...excl, ids: excl.ids.filter((x) => x !== id) })}><i />{nodeOf(id).name} <X size={10} /></span>)}</div>}
        </div>
      </div>

      {/* 证据检索 */}
      <div className="card rm-mt fade-in"><EvidencePanel evidence={evidence} phase={phase} token={token} excluded={excluded} onToggle={toggleEv} onDone={() => setPhase('done')} title="证据检索 · 公开采购需求 / 工商 / 年报 / 舆情 / 行内登记 / 上传材料" /></div>

      {/* 结果 */}
      {done && (
        <div className="fade-in">
          <div className="rm-mt">
            {opps[0] ? (
              <AiConclusion tone={opps[0].rate >= 60 ? 'green' : 'gold'} confidence={Math.min(0.95, opps[0].rate / 100)}
                headline={`按当前权重（需求×产能 ${weights.fit} / 行业互补 ${weights.ind} / 地理 ${weights.geo} / 结算关系 ${weights.settle}）匹配出 ${opps.length} 条机会；首推 ${nodeOf(opps[0].a).name} × ${nodeOf(opps[0].b).name}（得分 ${opps[0].score}，成功率 ${opps[0].rate}%）`}
                points={[`证据 ${incN} 条采信${exN ? `，已排除 ${exN} 条` : ''}；公开采购需求 ${evidence.filter((e) => e.source === '招投标公告' && !excluded.has(e.id)).length} 条`, `配套产品：${opps[0].products.join(' / ')}，预计业务量 ${fmtWan(opps[0].volume)}/年`, `带风险 / 授权标记 ${opps.filter((o) => o.flags.length).length} 条`, `版本：${VERSION_LABEL[version]}（阈值 ${version === 'A' ? 62 : 50}）`]}
                evidence={opps[0].chain.evidence.map((id) => { const e = evidence.find((x) => x.id === id); return e ? `${e.id} ${e.title}` : id; })}
                actions={['scf', 'visit', 'followup']} onSystem={(_, label) => flash(`已${label}`)} />
            ) : <div className="card red"><div className="card-t"><AlertTriangle size={14} />当前条件下没有达到阈值的机会</div><div className="ai-muted" style={{ marginTop: 6 }}>可放宽排除条件、调整权重、恢复被排除的证据，或切换到进取型版本（阈值 50）。</div><button className="btn sm gold" style={{ marginTop: 8 }} onClick={() => setVersion('B')}>切换到进取型</button></div>}
          </div>

          <div className={`card rm-mt${HL('opps')}`}>
            <div className="card-h">
              <div className="card-t"><Handshake size={14} />撮合机会 · 由匹配规则 + 证据生成</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="ai-seg">{(['A', 'B'] as Version[]).map((v) => <button key={v} className={version === v ? `on${v === 'B' ? ' gold' : ''}` : ''} onClick={() => setVersion(v)}>{v} · {VERSION_LABEL[v]}</button>)}</div>
                <button className={`btn sm ${compare ? 'gold' : 'ghost'}`} onClick={() => setCompare((c) => !c)}><Columns2 size={12} />{compare ? '收起对比' : '并排对比'}</button>
                <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>
              </div>
            </div>
            {compare && (
              <div className="ai-vers fade-in" style={{ marginBottom: 12 }}>
                {(['A', 'B'] as Version[]).map((v) => { const s = vsum(v); return (
                  <div key={v} className={`ai-ver ${v}${version === v ? ' on' : ''}`} onClick={() => setVersion(v)}>
                    <div className="vh"><b>{v} · {VERSION_LABEL[v]}</b><span className={`chip ${v === 'A' ? 'green' : 'orange'}`}><i />{v === 'A' ? '阈值 62 · 双方授权 · 排除红色风险' : '阈值 50 · 允许待授权 · 产品全量'}</span><label className="keep" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={keep[v]} onChange={(e) => setKeep({ ...keep, [v]: e.target.checked })} />保留</label></div>
                    <div className="vk"><div>机会数<b className="num">{s.n}</b></div><div>平均成功率<b className="num">{s.avg}%</b></div><div>预计业务量<b className="num" style={{ fontSize: 12.5 }}>{fmtWan(s.vol)}</b></div></div>
                    <ul className="ai-ul vl"><li>首推：{s.top ? `${nodeOf(s.top.a).name} × ${nodeOf(s.top.b).name}（${s.top.score} 分）` : '无'}</li><li>带风险 / 授权标记：{s.flags} 条</li></ul>
                  </div>
                ); })}
                <div className="ai-muted" style={{ gridColumn: '1/-1' }}>已保留：{(['A', 'B'] as Version[]).filter((v) => keep[v]).map((v) => `${v} ${VERSION_LABEL[v]}`).join('、') || '无'} · 保留的版本随工单一并转呈</div>
              </div>
            )}
            {opps.map((o, i) => {
              const a = nodeOf(o.a), b = nodeOf(o.b); const t = tickets.find((x) => x.opp === o.id); const key = o.id.slice(3);
              return (
                <div key={o.id} className={`rm-opp fade-in${oppSel === o.id ? ' sel' : ''}${(alt[key] ?? 0) > 0 ? ' alt' : ''}`}>
                  <div className="top">
                    <div>
                      <div className="pair" onClick={() => setOppSel(oppSel === o.id ? '' : o.id)}>
                        <span className="hd-badge" style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: 'var(--g-iris-soft)' }}>#{i + 1}</span>
                        <span>{a.name}</span><span className="x">×</span><span>{b.name}</span>
                        <span className={`chip ${EDGE_STYLE[o.type].tone}`}><i />{o.type}</span>
                        {o.flags.map((f) => <span key={f} className="rm-flag">{f}</span>)}
                        {t && <span className="chip green"><i />{t.id} · {STATUS[t.status]}</span>}
                      </div>
                      <div className="why">{o.why}</div>
                      <div className="ai-basis">
                        {(Object.keys(W_LABEL) as (keyof Weights)[]).map((k) => <div className="b" key={k}>{W_LABEL[k]} × {weights[k]}<b className="num">{o.basis[k]}</b><div className="bar"><i style={{ width: `${o.basis[k]}%` }} /></div><small>{o.basis.notes[k]}</small></div>)}
                      </div>
                      <div className="meta">
                        <span className="ai-muted">预计业务量</span><b className="num">{fmtWan(o.volume)}/年</b>
                        <span className="ai-muted" style={{ marginLeft: 6 }}>可转化产品</span>{o.products.map((p) => <span key={p} className={`chip ${PRODUCT_TONE[p]}`} style={{ padding: '2px 8px' }}><i />{p}</span>)}
                      </div>
                      <div className="ai-muted" style={{ marginTop: 4 }}><TrendingUp size={11} style={{ verticalAlign: -2 }} /> 协同效益：{o.benefit}</div>
                    </div>
                    <div className="rt">
                      <span>撮合成功率</span><b className="num">{o.rate}%</b><div className="bar"><i style={{ width: `${o.rate}%` }} /></div>
                      <span>匹配得分 <b className="num" style={{ display: 'inline', fontSize: 13 }}>{o.score}</b></span>
                      <div style={{ marginTop: 8 }}>{t ? <button className="btn sm ghost" onClick={() => { setTk(t.id); tkRef.current?.scrollIntoView({ behavior: 'smooth' }); }}><ClipboardList size={12} />查看工单</button> : <button className="btn sm" onClick={() => startMatch(o)}><Handshake size={12} />一键生成工单</button>}</div>
                    </div>
                  </div>
                  <ReasoningChain chain={o.chain} evidence={evidence} excluded={excluded} altIndex={alt[key] ?? 0} onAlt={() => { setAlt((x) => ({ ...x, [key]: (x[key] ?? 0) + 1 })); flashHl('opps'); }} onAsk={() => setAskReq({ q: `${a.name} × ${b.name} 这条机会的证据和反例是什么？`, n: Date.now() })} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 撮合工单 + 历史 */}
      <div className="rm-g21 rm-mt" ref={tkRef}>
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><ClipboardList size={14} />撮合工单</div><span className="card-s">{tickets.length} 个 · 落地 {tickets.filter((t) => t.status === STATUS.length - 1).length} 个</span></div>
          {tickets.map((t) => <div key={t.id} className={`rm-tk${t.id === tk ? ' sel' : ''}`} onClick={() => setTk(t.id)}><span className="id">{t.id}</span><span className="nm">{nodeOf(t.a).name} × {nodeOf(t.b).name}</span><span className={`chip ${t.status === STATUS.length - 1 ? 'green' : t.status === 0 ? 'red' : 'blue'}`} style={{ padding: '2px 8px' }}><i />{STATUS[t.status]}</span><span className="ai-muted">{t.created}</span></div>)}
          {ticket && (() => { const a = nodeOf(ticket.a), b = nodeOf(ticket.b); const o = opps.find((x) => x.id === ticket.opp); return (
            <div className="fade-in" key={ticket.id}>
              <div className="card-h" style={{ marginTop: 10 }}><div className="ai-sec" style={{ margin: 0 }}><BadgeCheck size={12} />工单 {ticket.id}</div><DocActions title={`撮合工单_${ticket.id}`} compact editing={editing} onEdit={() => { setEditing((e) => !e); flash(editing ? '已保存编辑' : '进入编辑：可直接修改撮合方案'); }} getHtml={() => document.getElementById(`rm-tk-${ticket.id}`)?.innerHTML ?? ''} onToast={flash} /></div>
              <div id={`rm-tk-${ticket.id}`} className="ai-editable" contentEditable={editing} suppressContentEditableWarning>
                <div className="rm-stat">{STATUS.map((s, i) => <div key={s} className={`s${i < ticket.status ? ' done' : i === ticket.status ? ' cur' : ''}`}>{s}</div>)}</div>
                <div className="ai-sec"><Users size={12} />双方联系人（客户授权提供）</div>
                <div className="rm-ct">
                  <div className="c a"><b>甲方 · {b.name}（需求方）</b>{ticket.contacts.b.name} · {ticket.contacts.b.title}<span><PhoneCall size={10} style={{ verticalAlign: -1 }} /> {ticket.contacts.b.tel} · 客户经理 {P(b.owner).name}</span></div>
                  <div className="c b"><b>乙方 · {a.name}（供给方）</b>{ticket.contacts.a.name} · {ticket.contacts.a.title}<span><PhoneCall size={10} style={{ verticalAlign: -1 }} /> {ticket.contacts.a.tel} · 客户经理 {P(a.owner).name}</span></div>
                </div>
                <div className="ai-sec"><Scale size={12} />匹配依据与证据</div>
                <div className="ai-muted">{o ? <>需求×产能 {o.basis.fit} / 行业互补 {o.basis.ind} / 地理 {o.basis.geo} / 结算关系 {o.basis.settle}，得分 {o.score}；证据：<EvRefs ids={o.chain.evidence} evidence={evidence} excluded={excluded} /></> : '工单创建时的匹配依据已归档'}</div>
                <div className="ai-sec"><Sparkles size={12} />撮合方案 <span className="ai-tag">AI 生成 · 需人工复核</span></div>
                <div className="rm-plan">{ticket.plan}</div>
              </div>
              <div className="ai-sec"><History size={12} />跟进记录</div>
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
        <div className="card fade-in rm-hist">
          <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近 {hist.length} 条</span></div>
          {hist.slice(0, 8).map((h, i) => <div className="li" key={i}><span className={`chip ${h.tone}`} style={{ padding: '2px 8px' }}><i /></span><div style={{ flex: 1, minWidth: 0 }} className="t">{h.text}</div><span className="tm">{h.time}</span></div>)}
          <div className="ai-sec"><Handshake size={12} />如何让结果更可靠</div>
          <ul className="ai-ul">
            <li>上传甲方招标公告 / 采购清单、乙方产能登记表：对应机会的「需求×产能」得分上升。</li>
            <li>调整四项权重或加入排除条件（行业 / 客户 / 未授权 / 风险）：机会列表即时重排。</li>
            <li>对不认可的证据点「不采信」：得分、成功率与推理链随之重算并注明排除数量。</li>
            <li>对任一条机会点「换一种思路」（路径 / 产品）或「追问」，回复可一键应用。</li>
          </ul>
        </div>
      </div>

      <AskAi presets={PRESET_Q} answer={answer} evidence={evidence} excluded={excluded} onApply={onApply} request={askReq} evidenceCount={incN}
        intro="我是客户资源撮合的 AI 助手。我会基于证据面板中的公开采购需求、行内登记与上传材料回答，并在可以时给出「应用到方案」按钮。你可以问：预算、时间、同业、董事长、结算权重、授信、风险、下一步。" />
      {toast && <div className="ai-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
