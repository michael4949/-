/**
 * 远山市（虚构）行政区地图生成器。
 * 无外网、无瓦片：用 d3-delaunay 在固定种子下生成 Voronoi 行政区，
 * 裁剪在一个有机的城市轮廓内，并叠加河流 / 主干道 / 产业集群。
 * 所有坐标均为 viewBox 像素坐标（MAP_W × MAP_H）。
 */
import { Delaunay } from 'd3-delaunay';
import { rng } from './rng';
import { COMPANIES } from '../data/companies';

export const MAP_W = 1000;
export const MAP_H = 800;
export type Pt = [number, number];

/** 图表鲜亮色板（与 theme.css 的 --c1..--c8 保持一致） */
export const PAL = {
  c1: '#e63946', c2: '#f4b942', c3: '#2dc48d', c4: '#3a86ff',
  c5: '#9b5de5', c6: '#ff8c42', c7: '#00b4d8', c8: '#ff5da2',
} as const;

export interface District {
  id: string; name: string; seed: Pt; label: Pt; polygon: Pt[]; path: string;
  exposure: number; deposit: number; customers: number; heat: number; // heat 0..1
}

/** 客户标记半径（按年结算量） */
export const markerR = (c: { settlement: number }) => 7 + Math.sqrt(c.settlement) / 22;

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
function inPoly([px, py]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export interface Cluster { id: string; name: string; cx: number; cy: number; r: number; color: string; note: string }
export interface Road { id: string; name: string; path: string; major: boolean }
export interface CityMap {
  outline: string; outlinePts: Pt[]; districts: District[]; river: string; roads: Road[]; clusters: Cluster[]; maxExposure: number;
}

/** 0..1 相对坐标 → 像素 */
export const toPx = (x: number, y: number): Pt => [x * MAP_W, y * MAP_H];

// ---------- 行政区种子（companies.ts 出现的区 + 补充） ----------
const DISTRICT_SEEDS: { name: string; seed: Pt; baseExposure: number; baseDeposit: number; baseCustomers: number }[] = [
  { name: '城北区', seed: [0.50, 0.17], baseExposure: 400, baseDeposit: 900, baseCustomers: 4 },
  { name: '高新区', seed: [0.62, 0.34], baseExposure: 1800, baseDeposit: 2100, baseCustomers: 6 },
  { name: '保税区', seed: [0.84, 0.40], baseExposure: 700, baseDeposit: 800, baseCustomers: 3 },
  { name: '城东区', seed: [0.74, 0.66], baseExposure: 900, baseDeposit: 1300, baseCustomers: 7 },
  { name: '经开区', seed: [0.42, 0.56], baseExposure: 1200, baseDeposit: 1600, baseCustomers: 5 },
  { name: '临港区', seed: [0.22, 0.52], baseExposure: 600, baseDeposit: 700, baseCustomers: 3 },
  { name: '城南区', seed: [0.44, 0.84], baseExposure: 500, baseDeposit: 600, baseCustomers: 4 },
  { name: '老城区', seed: [0.54, 0.50], baseExposure: 2600, baseDeposit: 3800, baseCustomers: 9 },
  { name: '西山区', seed: [0.19, 0.34], baseExposure: 300, baseDeposit: 350, baseCustomers: 2 },
  { name: '江畔新区', seed: [0.32, 0.22], baseExposure: 900, baseDeposit: 1200, baseCustomers: 3 },
  { name: '东湖区', seed: [0.70, 0.20], baseExposure: 1100, baseDeposit: 1500, baseCustomers: 4 },
  { name: '空港区', seed: [0.62, 0.80], baseExposure: 1500, baseDeposit: 1100, baseCustomers: 3 },
];

// ---------- 产业集群（半透明渐变气泡） ----------
const CLUSTERS: Cluster[] = [
  { id: 'prec', name: '精密制造', cx: 0.60, cy: 0.35, r: 72, color: PAL.c4, note: '高新区 · 新能源车零部件配套' },
  { id: 'food', name: '食品加工', cx: 0.41, cy: 0.57, r: 62, color: PAL.c2, note: '经开区 · 晟禾集团为链主' },
  { id: 'metal', name: '有色加工', cx: 0.25, cy: 0.70, r: 52, color: PAL.c6, note: '临港区 · 铝材 / 铜材' },
  { id: 'cbec', name: '跨境电商', cx: 0.81, cy: 0.42, r: 56, color: PAL.c7, note: '保税区 · 东盟出口' },
  { id: 'ne', name: '新能源', cx: 0.19, cy: 0.55, r: 60, color: PAL.c3, note: '临港区 · 光伏组件' },
  { id: 'logi', name: '物流仓储', cx: 0.31, cy: 0.42, r: 50, color: PAL.c5, note: '江畔 / 临港 · 港口物流' },
  { id: 'trade', name: '商贸流通', cx: 0.72, cy: 0.66, r: 58, color: PAL.c8, note: '城东区 · 批发市场' },
];

// ---------- 曲线工具 ----------
function catmullRom(pts: Pt[], closed: boolean): string {
  const n = pts.length;
  if (n < 2) return '';
  const get = (i: number): Pt => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return closed ? d + ' Z' : d;
}

const rel = (pts: Pt[]): Pt[] => pts.map(([x, y]) => toPx(x, y));

// ---------- 构建 ----------
function build(): CityMap {
  const r = rng(20260905);

  // 1. 有机城市轮廓：椭圆 + 多频正弦扰动 + 微噪声
  const CX = 500, CY = 410, RX = 470, RY = 372;
  const a = r() * Math.PI * 2, b = r() * Math.PI * 2, c = r() * Math.PI * 2;
  const N = 44;
  const outlinePts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(3 * t + a) + 0.045 * Math.sin(5 * t + b) + 0.025 * Math.sin(7 * t + c) + (r() - 0.5) * 0.03;
    outlinePts.push([CX + RX * k * Math.cos(t), CY + RY * k * Math.sin(t)]);
  }
  const outline = catmullRom(outlinePts, true);

  // 2. 行政区种子（固定位置 + 小抖动），并保证每家客户落在其 district 内
  const seeds: Pt[] = DISTRICT_SEEDS.map((d) => {
    const [x, y] = toPx(d.seed[0], d.seed[1]);
    return [x + (r() - 0.5) * 18, y + (r() - 0.5) * 18];
  });
  const nameIdx = new Map(DISTRICT_SEEDS.map((d, i) => [d.name, i]));
  let delaunay = Delaunay.from(seeds);
  for (let iter = 0; iter < 30; iter++) {
    let moved = false;
    for (const co of COMPANIES) {
      const want = nameIdx.get(co.district);
      if (want === undefined) continue;
      const [px, py] = toPx(co.x, co.y);
      const got = delaunay.find(px, py);
      if (got !== want) {
        seeds[want] = [seeds[want][0] + (px - seeds[want][0]) * 0.3, seeds[want][1] + (py - seeds[want][1]) * 0.3];
        moved = true;
      }
    }
    if (!moved) break;
    delaunay = Delaunay.from(seeds);
  }
  const voronoi = delaunay.voronoi([-80, -80, MAP_W + 80, MAP_H + 80]);

  // 3. 行政区聚合：本行敞口 / 存款 / 客户数（基础值 + companies 汇总）
  const agg = DISTRICT_SEEDS.map((d) => ({ exposure: d.baseExposure, deposit: d.baseDeposit, customers: d.baseCustomers }));
  for (const co of COMPANIES) {
    const i = nameIdx.get(co.district);
    if (i === undefined) continue;
    agg[i].exposure += co.exposure; agg[i].deposit += co.deposit; agg[i].customers += 1;
  }
  const maxExposure = Math.max(...agg.map((x) => x.exposure));

  const clusters = CLUSTERS.map((cl) => { const [cx, cy] = toPx(cl.cx, cl.cy); return { ...cl, cx, cy }; });

  // 行政区名标签避让：避开客户标记（含名称）与集群标签，并保持在本区多边形与城市轮廓内
  const obstacles: Box[] = [
    ...COMPANIES.map((co) => { const [x, y] = toPx(co.x, co.y); const rr = markerR(co); return { x1: x - rr - 4, y1: y - 13, x2: x + rr + 8 + co.name.length * 11.5, y2: y + 13 }; }),
    ...clusters.map((cl) => ({ x1: cl.cx - cl.name.length * 6.5, y1: cl.cy + cl.r + 2, x2: cl.cx + cl.name.length * 6.5, y2: cl.cy + cl.r + 17 })),
  ];
  const OFFS: Pt[] = [[0, 0], [0, -46], [0, 46], [-66, 0], [66, 0], [-54, -42], [54, -42], [-54, 42], [54, 42], [0, -86], [0, 86], [-100, 0], [100, 0]];
  const placed: Box[] = [];

  const districts: District[] = DISTRICT_SEEDS.map((d, i) => {
    const poly = (voronoi.cellPolygon(i) ?? []) as Pt[];
    const path = poly.length ? `M${poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} Z` : '';
    const w = d.name.length * 13.5 + 14;
    let best: { p: Pt; box: Box; score: number } | null = null;
    for (const [ox, oy] of OFFS) {
      const p: Pt = [seeds[i][0] + ox, seeds[i][1] + oy];
      const box: Box = { x1: p[0] - w / 2, y1: p[1] - 14, x2: p[0] + w / 2, y2: p[1] + 18 };
      const corners: Pt[] = [[box.x1, box.y1], [box.x2, box.y1], [box.x1, box.y2], [box.x2, box.y2]];
      if (!inPoly(p, poly) || !corners.every((c) => inPoly(c, outlinePts))) continue;
      const ov = [...obstacles, ...placed].reduce((s, o) => s + overlap(box, o), 0);
      const score = ov + Math.hypot(ox, oy) * 0.6;
      if (!best || score < best.score) best = { p, box, score };
    }
    const label = best?.p ?? seeds[i];
    placed.push(best?.box ?? { x1: label[0] - w / 2, y1: label[1] - 14, x2: label[0] + w / 2, y2: label[1] + 18 });
    return {
      id: `d${i}`, name: d.name, seed: seeds[i], label, polygon: poly, path,
      exposure: agg[i].exposure, deposit: agg[i].deposit, customers: agg[i].customers,
      heat: Math.pow(agg[i].exposure / maxExposure, 0.7),
    };
  });

  // 4. 河流（衡江）：西北入、东南出，带轻微随机摆动
  const riverPts: Pt[] = rel([
    [-0.03, 0.30], [0.12, 0.36], [0.24, 0.48], [0.34, 0.60], [0.46, 0.68], [0.58, 0.76], [0.70, 0.80], [0.84, 0.78], [1.03, 0.74],
  ]).map(([x, y], i, arr) => (i === 0 || i === arr.length - 1 ? [x, y] : [x + (r() - 0.5) * 10, y + (r() - 0.5) * 12]));
  const river = catmullRom(riverPts, false);

  // 5. 主干道
  const roadDefs: { id: string; name: string; major: boolean; pts: Pt[] }[] = [
    { id: 'r1', name: '衡山大道', major: true, pts: [[-0.03, 0.30], [0.20, 0.33], [0.45, 0.36], [0.62, 0.36], [0.80, 0.34], [1.03, 0.30]] },
    { id: 'r2', name: '远山路', major: true, pts: [[0.42, -0.03], [0.44, 0.20], [0.48, 0.42], [0.54, 0.60], [0.56, 0.78], [0.55, 1.03]] },
    { id: 'r3', name: '临港快速路', major: false, pts: [[0.03, 0.76], [0.22, 0.62], [0.40, 0.50], [0.60, 0.50], [0.78, 0.56], [0.97, 0.63]] },
  ];
  const roads: Road[] = roadDefs.map((rd) => ({
    id: rd.id, name: rd.name, major: rd.major,
    path: catmullRom(rel(rd.pts).map(([x, y], i, arr) => (i === 0 || i === arr.length - 1 ? [x, y] : [x + (r() - 0.5) * 8, y + (r() - 0.5) * 8])), false),
  }));

  return { outline, outlinePts, districts, river, roads, clusters, maxExposure };
}

export const CITY: CityMap = build();

/** 敞口热力：浅金 → 深红（单色系渐进，越深敞口越大） */
const hex2rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function mixHex(a: string, b: string, t: number): string {
  const A = hex2rgb(a), B = hex2rgb(b);
  const m = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
export function heatStops(t: number): { c1: string; c2: string; o1: number; o2: number } {
  return { c1: mixHex('#fbe9b6', '#e0463f', t), c2: mixHex('#efd48a', '#8e1b1b', t), o1: 0.28 + 0.5 * t, o2: 0.22 + 0.55 * t };
}

export const RISK_GRAD: Record<'red' | 'orange' | 'yellow' | 'green', [string, string]> = {
  red: ['#ff7a70', '#8e1b1b'], orange: ['#ffb27a', '#d9781b'], yellow: ['#ffe08a', '#c9a24d'], green: ['#6ee3ad', '#155e3e'],
};
export const RISK_LABEL: Record<'red' | 'orange' | 'yellow' | 'green', string> = { red: '高风险', orange: '关注', yellow: '提示', green: '正常' };
