/**
 * 功能页文本工具：日期格式、哈希种子、展示文本净化、分句、客户本地化。
 * 本地化 = 把样例文本中的客户名替换为当前所选客户，并按客户规模与种子缩放文本中的数字，
 * 使同一功能在不同客户下的结论、面板与要点全部随客户变化。
 */
import type { ProductFunction } from '../../data/types';
import { COMPANIES, type Company } from '../../data/companies';
import { rng } from '../../lib/rng';

/* ---------- 日期与数字 ---------- */
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
export const ym = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
export const hm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
export const md = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
export const ymdDot = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const round1 = (n: number) => Math.round(n * 10) / 10;
export const uniq = <T,>(a: T[]) => Array.from(new Set(a));
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const fmtInt = (n: number) => Math.round(n).toLocaleString('zh-CN');
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };

/* ---------- 种子 ---------- */
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/** 功能 + 客户 的确定性种子：客户切换时所有数字与文字随之变化 */
export const seedOf = (fid: string, coId: string, salt = 0) => (hashStr(`${fid}|${coId}`) + salt * 7919) >>> 0;

/* ---------- 展示文本净化：目录文本中的个别措辞统一为工作用语 ---------- */
const CLEAN_RULES: Array<[RegExp, string]> = [
  [/示范/g, '标准'], [/演示/g, '展示'], [/demo/gi, '展示'], [/原型/g, '平台'], [/虚构/g, '参考'],
  [/初级/g, '基础'], [/中级/g, '进阶'], [/资深/g, '骨干'], [/课时/g, '时长'], [/课程/g, '内容'],
  [/示例/g, '参考'],
];
export const clean = (s: string) => CLEAN_RULES.reduce((t, [re, rep]) => t.replace(re, rep), s || '');
export function sanitizeFn(fn: ProductFunction): ProductFunction {
  return {
    ...fn, name: clean(fn.name), summary: clean(fn.summary), input: clean(fn.input), process: clean(fn.process),
    panels: fn.panels.map(clean), output: clean(fn.output), dataSources: (fn.dataSources ?? []).map(clean),
    compliance: clean(fn.compliance), demoSample: clean(fn.demoSample), sources: [],
  };
}

/* ---------- 分句 ---------- */
/** 分句：括号内的分号不切分，避免把「（…；…）」拆散 */
export function splitSentences(t: string): string[] {
  const out: string[] = []; let cur = ''; let depth = 0;
  for (const ch of t || '') {
    if (ch === '（' || ch === '(') depth++;
    else if ((ch === '）' || ch === ')') && depth > 0) depth--;
    cur += ch;
    if (depth === 0 && /[。；;！!？?\n]/.test(ch)) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out.map((s) => s.trim()).filter((s) => s.length > 1);
}
export const clauses = (t: string) => (t || '')
  .split(/[，；;。：:（）()【】—\n]/)
  .map((s) => s.trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩]+\s*/, '').replace(/^[\d\-–/.:\s]+(?=[一-龥「])/, '').trim())
  .filter((s) => s.length >= 4);
/** 截断到 n 字以内，尽量在标点处断开 */
export function trimTo(s: string, n: number): string {
  const t = (s || '').trim().replace(/[。；;，,]+$/, '');
  if (t.length <= n) return balanceParens(t);
  let cut = -1;
  for (let i = Math.min(n, t.length - 1); i > n * 0.45; i--) { if (/[，；、]/.test(t[i])) { cut = i; break; } }
  return balanceParens(cut > 0 ? t.slice(0, cut) : t.slice(0, n - 1) + '…');
}
/** 截断后若左括号未闭合：括号靠后则连同括号内容去掉，否则补右括号 */
function balanceParens(t: string): string {
  const open = (t.match(/（/g) ?? []).length, close = (t.match(/）/g) ?? []).length;
  if (open <= close) return t;
  const i = t.lastIndexOf('（');
  return i > t.length * 0.5 ? t.slice(0, i).replace(/[，；、,：:]+$/, '') : `${t}）`;
}

/* ---------- 客户 ---------- */
/** 样例文本中最先出现的客户（无则 null） */
export function sampleCompany(fn: ProductFunction): Company | null {
  let best: Company | null = null; let pos = Infinity;
  for (const c of COMPANIES) { const i = fn.demoSample.indexOf(c.name); if (i >= 0 && i < pos) { pos = i; best = c; } }
  return best;
}
export const defaultCompany = (fn: ProductFunction): Company => sampleCompany(fn) ?? COMPANIES[0];

/* ---------- 数字缩放：保留格式（千分位 / 小数位），跳过年份、日期、小数值、时间跨度 ---------- */
const NUM_RE = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
export function scaleNumbers(t: string, f: number, pf: number): string {
  return t.replace(NUM_RE, (m: string, off: number) => {
    const before = t.slice(Math.max(0, off - 6), off);
    const after = t.slice(off + m.length, off + m.length + 6);
    const hasComma = m.includes(',');
    const dec = (m.split('.')[1] ?? '').length;
    const v = parseFloat(m.replace(/,/g, ''));
    const isAmount = /^\s*(亿|万)/.test(after);
    if (!isFinite(v) || (v < 10 && !isAmount)) return m;
    if (dec === 0 && /^(19|20)\d\d$/.test(m)) return m;
    if (/[-/.:×xX*]\s*$/.test(before)) return m;
    if (/^\s*[-.:]\d/.test(after)) return m;
    if (/^\s*(月|日|号|季度)/.test(after) && v <= 31) return m;
    if (/(近|前|后|最近|连续|未来|每|满|不超过|超过)\s*$/.test(before) && /^\s*(天|日|个月|年|期|工作日|小时)/.test(after)) return m;
    const isPct = /^\s*(%|％|个百分点|分位|分(?!钟|行|公司)|\/)/.test(after) || /(评分|得分|分数|健康度|说服力|匹配度|相似度|指数|潜力)\s*$/.test(before);
    const nv = isPct ? clamp(v * pf, 1, 99) : Math.max(dec > 0 ? 0.1 : 1, v * f);
    let s: string;
    if (dec > 0) s = nv.toFixed(dec);
    else { let iv = Math.round(nv); if (iv >= 1000) iv = Math.round(iv / 10) * 10; s = String(iv); }
    if (hasComma || (dec === 0 && parseFloat(s) >= 1000)) {
      const [ip, dp] = s.split('.');
      s = Number(ip).toLocaleString('en-US') + (dp ? `.${dp}` : '');
    }
    return s;
  });
}

/** 把样例文本本地化到当前客户：客户名替换 + 数字按客户规模与种子缩放（样例客户本身则原样保留） */
export function localize(text: string, fn: ProductFunction, co: Company, seed: number): string {
  if (!text) return '';
  const sample = sampleCompany(fn);
  let t = text;
  if (sample && sample.id === co.id) return t;
  if (sample) t = t.split(sample.name).join(co.name);
  const r = rng((seed ^ 0x5eed) >>> 0);
  const ratio = sample ? co.settlement / Math.max(1, sample.settlement) : 0.7 + r() * 0.8;
  const f = clamp(Math.sqrt(ratio), 0.5, 2.2) * (0.85 + r() * 0.3);
  const pf = 0.82 + r() * 0.36;
  return scaleNumbers(t, f, pf);
}
