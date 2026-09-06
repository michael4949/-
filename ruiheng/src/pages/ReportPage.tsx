import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line,
} from 'recharts';
import catalogJson from '../data/capabilities.json';
import type { Catalog, ProductFunction } from '../data/types';
import { specOf, type FnSpec } from '../data/fnspec';
import { productById } from '../data/products';
import { COMPANIES, type Company } from '../data/companies';
import { rng } from '../lib/rng';
import { Icon } from '../components/Shell';
import UploadDocs, { type UDoc } from '../components/UploadDocs';
import DocActions from '../components/DocActions';
import AiConclusion from '../components/AiConclusion';
import './report.css';

/* ====================================================================== 常量 */
const CATALOG = catalogJson as unknown as Catalog;
const STEP_MS = 500;
const BANK = '远山银行 城东支行';
const AUTHOR = '王志远';
const REVIEWERS = [
  { role: '编制人 · 主办客户经理', name: '王志远', auto: true },
  { role: '复核人 · 团队负责人', name: '周慧敏', auto: false },
  { role: '审定人 · 支行行长', name: '黄建国', auto: false },
];
const PURPOSES = ['授信申报', '客户汇报', '内部研判', '高层会谈'] as const;
type Purpose = (typeof PURPOSES)[number];
const GRADS: Array<[string, string]> = [
  ['#ff7a70', '#c3272b'], ['#f7e2a5', '#c9a24d'], ['#6ee3ad', '#1f8a5a'], ['#7fb0ff', '#3a86ff'],
  ['#c7a4ff', '#9b5de5'], ['#ffb570', '#d9781b'], ['#7ae0f0', '#00b4d8'], ['#ff9ec9', '#ff5da2'],
];
const gradCss = (i: number) => `linear-gradient(135deg,${GRADS[i % GRADS.length][0]},${GRADS[i % GRADS.length][1]})`;
const TONE_GRAD: Record<string, string> = {
  red: 'linear-gradient(135deg,#ff7a70,#c3272b)', orange: 'linear-gradient(135deg,#ffb570,#d9781b)',
  gold: 'linear-gradient(135deg,#f7e2a5,#c9a24d)', green: 'linear-gradient(135deg,#6ee3ad,#1f8a5a)',
  blue: 'linear-gradient(135deg,#7fb0ff,#3a86ff)', purple: 'linear-gradient(135deg,#c7a4ff,#9b5de5)',
};

/* ====================================================================== 工具 */
const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const ym = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const cn = (d: Date) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
const hm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const fmtN = (n: number, d = 0) => n.toLocaleString('zh-CN', { maximumFractionDigits: d, minimumFractionDigits: d });
const wan = (n: number) => `${fmtN(Math.round(n))} 万元`;
const yi = (n: number) => `${(n / 10000).toFixed(2)} 亿元`;
const money = (n: number) => (Math.abs(n) >= 10000 ? yi(n) : wan(n));
const pc = (n: number, d = 1) => `${n.toFixed(d)}%`;
const uniq = <T,>(a: T[]) => Array.from(new Set(a));
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/* 措辞净化：统一为行内工作用语，不携带来源与试用语义 */
const CLEAN_RULES: Array<[RegExp, string]> = [
  [/示范/g, '标准'], [/演示/g, '展示'], [/demo/gi, '展示'], [/原型/g, '平台'], [/虚构/g, '参考'],
  [/初级/g, '基础'], [/中级/g, '进阶'], [/资深/g, '骨干'], [/课时/g, '时长'], [/课程/g, '内容'],
  [/（示例[^）]*）/g, ''], [/示例数据/g, '参考数据'], [/示例/g, '参考'], [/LLM\s*/g, 'AI 引擎'],
];
const clean = (s: string) => CLEAN_RULES.reduce((t, [re, rep]) => t.replace(re, rep), s || '').replace(/\s{2,}/g, ' ').trim();
function sanitizeFn(fn: ProductFunction): ProductFunction {
  return {
    ...fn, name: clean(fn.name), summary: clean(fn.summary), input: clean(fn.input), process: clean(fn.process),
    panels: fn.panels.map(clean), output: clean(fn.output), dataSources: (fn.dataSources ?? []).map(clean),
    compliance: clean(fn.compliance), demoSample: clean(fn.demoSample), sources: [],
  };
}
const sentences = (t: string) => (t || '').split(/(?<=[。；;！？])|\n+/).map((s) => s.trim().replace(/^[：:，,]/, '')).filter((s) => s.length > 3);
const clauses = (t: string) => (t || '').split(/[；;。：:\n]/).map((s) => s.trim().replace(/^[—\-–\s]+/, '')).filter((s) => s.length >= 6);
const endDot = (s: string) => (/[。！？]$/.test(s) ? s : s.replace(/[；;，,]$/, '') + '。');
const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/[，,；;：:、]$/, '') + '…');

function defaultCompany(fn: ProductFunction): Company {
  let best: Company | null = null; let pos = Infinity;
  for (const c of COMPANIES) { const i = fn.demoSample.indexOf(c.name); if (i >= 0 && i < pos) { pos = i; best = c; } }
  return best ?? COMPANIES[0];
}
/** 将目录文本中的样本企业替换为当前客户 */
function localize(text: string, from: Company, to: Company) {
  if (from.id === to.id) return text;
  return text.split(from.name).join(to.name).split(from.name.slice(0, 2)).join(to.name.slice(0, 2));
}
function extFor(type: string) {
  if (/excel|xlsx|清单|明细|数据|流水|持仓|名单|预算/i.test(type)) return 'xlsx';
  if (/word|纪要|说明|方案|计划|问卷|文本|规划/i.test(type)) return 'docx';
  if (/ppt|介绍|宣传/i.test(type)) return 'pptx';
  if (/影像|照片|扫描|证书|权证/.test(type)) return 'jpg';
  return 'pdf';
}
function buildPresets(spec: FnSpec, co: Company, year: number): string[] {
  const types = spec.uploads?.length ? spec.uploads : ['近期访谈纪要', '客户基本资料', '经营数据'];
  const short = (t: string) => t.replace(/\s*[（(].*?[）)]/g, '').replace(/\s*\/.*$/, '').trim();
  const out = types.slice(0, 4).map((t, i) => `${co.name}_${year - (i === 0 ? 1 : 0)}${/报告|报表|报|表/.test(t) ? '年' : ''}${short(t)}.${extFor(t)}`);
  const pad = [`${co.name}_${year}年上半年经营情况说明.docx`, `${co.name}_访谈纪要_${year}${pad2(new Date().getMonth() + 1)}.docx`, `${co.name}_${year - 1}年审计报告.pdf`];
  for (const p of pad) if (out.length < 3 && !out.includes(p)) out.push(p);
  return uniq(out);
}
const reportNo = (fid: string, d: Date, run: number) => `QJ-${d.getFullYear()}-${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2((hashStr(fid) + run * 13) % 90 + 10).padStart(3, '0')}`;

/* ====================================================================== 数据模型 */
interface Tile { label: string; value: string; delta?: string; tone?: string }
interface Table { title: string; cols: string[]; rows: string[][]; heat?: number[][]; note?: string; total?: boolean }
type ChartMode = 'bar' | 'area' | 'line' | 'donut' | 'radar' | 'waterfall' | 'range' | 'stack' | 'hbar';
interface ChartData { title: string; mode: ChartMode; unit?: string; data: Array<Record<string, string | number | null>>; keys: string[]; names?: string[]; note?: string }
type Block =
  | { kind: 'tiles'; title: string; items: Tile[] }
  | { kind: 'table'; table: Table }
  | { kind: 'chart'; chart: ChartData }
  | { kind: 'timeline'; title: string; items: Array<{ when: string; text: string; tone: string; src: string }> }
  | { kind: 'chain'; title: string; stages: Array<{ name: string; nodes: Array<{ label: string; sub: string; tone: string }> }> }
  | { kind: 'roadmap'; title: string; phases: Array<{ name: string; when: string; owner: string; items: string[]; start: number; len: number }> }
  | { kind: 'canvas'; title: string; cells: Array<{ k: string; v: string; tone: string }> };
interface Chapter { id: string; no: number; title: string; paras: string[]; blocks: Block[]; focus: boolean }
interface Ctx { r: () => number; ri: (a: number, b: number) => number; co: Company; fn: ProductFunction; base: Company; spec: FnSpec; purpose: Purpose; from: string; to: string; rev: number; amt: number; year: number }
interface BuildOut { blocks: Block[]; facts: string[]; intro: string }

/* ====================================================================== 章节内容生成器 */
type BlockKind = 'summary' | 'valuation' | 'heat' | 'waterfall' | 'raroc' | 'pricing' | 'chain' | 'quota' | 'timeline' | 'funnel' | 'radar' | 'roadmap' | 'canvas' | 'matrix' | 'alerts' | 'trend' | 'donut' | 'sources' | 'checklist' | 'raci' | 'benefit' | 'scenario' | 'kpi' | 'kv' | 'policy' | 'actions';
const KIND_RULES: Array<[RegExp, BlockKind]> = [
  [/数据来源|口径说明|与口径|参数说明|参数与|假设|限制|附件|附录|引用来源|适当性/, 'sources'],
  [/结论|摘要|总评|要点/, 'summary'],
  [/价值区间|估值区间|收益法|市场法|资产基础法|企业价值/, 'valuation'],
  [/敏感性|溢价/, 'heat'],
  [/瀑布|定价构成|成本构成/, 'waterfall'],
  [/RAROC|门槛/, 'raroc'],
  [/参考利率|定价建议|谈判口径|定价与|定价/, 'pricing'],
  [/链条|产业链|供应链结构|上游|中游|下游|链图|图谱|路径图|架构图|联动路径/, 'chain'],
  [/额度测算|额度安排|出资与分层|分层与现金流|配置比例|产品与额度|产品组合明细|产品与服务明细|产品明细|产品要素|组合结构|交易结构|融资模式|融资方案|避险方案|投贷联动|资金配置架构|各环节金融方案|金融配套|配套/, 'quota'],
  [/时间线|事件/, 'timeline'],
  [/漏斗|转化/, 'funnel'],
  [/雷达|成熟度|竞争力评分|韧性评分|战略诊断|评分/, 'radar'],
  [/时间表|里程碑|实施|路线|路径|计划|步骤|安排|监测|下月关注|退出方案|审批路径|再平衡/, 'roadmap'],
  [/画布/, 'canvas'],
  [/政策/, 'policy'],
  [/核实|回应|事实/, 'checklist'],
  [/矩阵|对比|对标|同业|竞品|方案对比|增信/, 'matrix'],
  [/情景|测试|影响测算|影响评估|核心企业影响/, 'scenario'],
  [/预警|风险清单|风险识别|风险提示|风险与|风险总评|风险表|节点|信号|传导|异常|痛点|瓶颈|问题/, 'alerts'],
  [/策略|建议|改进|创新|优化|应对|提升|需求清单|机会/, 'actions'],
  [/合规|准入|预检|披露|制裁|复核/, 'checklist'],
  [/分工|责任|资源|团队|机构/, 'raci'],
  [/效益|收益|ROI|效果|价值评估|服务价值|协同|贡献/, 'benefit'],
  [/看板|指标|量化|扫描/, 'kpi'],
  [/现金流|资金链|流动性|到期分布|归因|趋势|收入模式|盈利|偿债|资产质量|负债结构|经营质量|财务基础|环境|货币|需求/, 'trend'],
  [/分布|结构|占比|情绪|国别|来源|细分|覆盖|概况|现状|模式|组合/, 'donut'],
];
const FALLBACK: BlockKind[] = ['radar', 'benefit', 'roadmap', 'donut', 'actions', 'scenario', 'matrix', 'checklist', 'trend', 'kpi', 'kv'];
function pickKind(title: string, idx: number, total: number): BlockKind {
  if (idx === 0) return 'summary';
  if (idx === total - 1 && /来源|附件|附录|说明|口径/.test(title)) return 'sources';
  for (const [re, k] of KIND_RULES) if (re.test(title)) return k;
  return 'kv';
}

/* 从样本文本抽取「标签 + 数值」 */
const UNIT_RE = '亿元|万元|亿|万|美元|%|％|个百分点|bp|BP|天|家|户|项|条|笔|次|倍|分|个月|年|月|人';
function extractPairs(raw: string, max = 4): Tile[] {
  const text = COMPANIES.reduce((t, c) => t.split(c.name).join(''), raw);
  const re = new RegExp(`(-?\\d[\\d,]*(?:\\.\\d+)?)\\s*(${UNIT_RE})`, 'g');
  const out: Tile[] = []; const seen = new Set<string>(); let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && out.length < max) {
    const lm = /([一-龥A-Za-z]{2,10})\s*$/.exec(text.slice(0, m.index).replace(/[（(约为达至的共计近其中合计即与和及并对由从按向将给于是已]+$/, ''));
    if (!lm) continue;
    const label = lm[1].replace(new RegExp(`^(?:${UNIT_RE})+`), '').replace(/^(?:较|约|为|达|至|的|共|计|近|前|后|其中|合计|即|与|和|及|并|对|由|从|按|向|将|给|于|是|已|年|占|中|口|天|家|条|万|亿)+/, '').replace(/(?:约|为|达|至|共|计|合计|是|有|的|即|到|在|由|占)+$/, '');
    if (label.length < 2 || seen.has(label)) continue;
    seen.add(label); out.push({ label, value: `${m[1]} ${m[2]}` });
  }
  return out;
}

const RATING = ['AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BB+', 'BB'];
const LV = (risk: Company['risk']) => (risk === 'red' ? '高危' : risk === 'orange' ? '预警' : risk === 'yellow' ? '关注' : '正常');
const TONE = (risk: Company['risk']) => (risk === 'red' ? 'red' : risk === 'orange' ? 'orange' : risk === 'yellow' ? 'gold' : 'green');

function bSummary(c: Ctx, title: string, sample: string): BuildOut {
  const pairs = extractPairs(sample);
  const score = c.ri(55, 88);
  const tiles: Tile[] = pairs.length >= 3 ? pairs : [
    ...pairs, { label: '综合评分', value: `${score} 分` }, { label: '风险等级', value: LV(c.co.risk), tone: TONE(c.co.risk) },
    { label: '本行敞口', value: c.co.exposure ? wan(c.co.exposure) : '无' }, { label: '分析期间', value: `${c.from} ~ ${c.to}` },
  ].slice(0, 4);
  const rows = clauses(sample).filter((s) => s.length <= 60).slice(0, 4).map((s, i) => [String(i + 1), s, ['高', '高', '中', '中'][i], ['已核实', '已核实', '待补充佐证', '已核实'][i]]);
  const blocks: Block[] = [{ kind: 'tiles', title: `${title} · 关键指标`, items: tiles }];
  if (rows.length >= 2) blocks.push({ kind: 'table', table: { title: '主要发现与依据', cols: ['序号', '主要发现', '重要性', '核实状态'], rows } });
  return { blocks, intro: `本章汇总本次${c.fn.name}的核心结论，供${c.purpose}场景直接引用；结论由规则计算结果与 AI 引擎解释文字共同构成，所有数字均可追溯至附录列示的数据来源。`, facts: [`综合来看，${c.co.name}在分析期间（${c.from} 至 ${c.to}）的主要指标已列于上表，${tiles[0] ? `其中「${tiles[0].label}」为 ${tiles[0].value}，` : ''}作为后续各章展开分析的基准。`] };
}
function bValuation(c: Ctx, title: string): BuildOut {
  const ebitda = c.rev * (0.07 + c.r() * 0.05);
  const mult = 6.5 + c.r() * 2.5;
  const ev = ebitda * mult; const debt = c.rev * (0.18 + c.r() * 0.1); const cash = c.rev * (0.04 + c.r() * 0.03);
  const eq = ev - debt + cash;
  const dcfLo = eq * 0.92, dcfHi = eq * 1.08, nav = eq * (0.55 + c.r() * 0.15), ps = c.rev * (0.5 + c.r() * 0.3);
  const rows = [
    ['收益法（DCF）', `WACC ${(9 + c.r() * 2).toFixed(1)}%，永续增长 2.5%`, money(dcfLo), money((dcfLo + dcfHi) / 2), money(dcfHi), '40%'],
    ['市场法（EV/EBITDA）', `可比中位 ${mult.toFixed(1)} 倍，EBITDA ${money(ebitda)}`, money(eq * 0.9), money(eq), money(eq * 1.1), '35%'],
    ['市场法（P/S）', `可比 P/S ${(0.5 + c.r() * 0.3).toFixed(2)} 倍`, money(ps * 0.9), money(ps), money(ps * 1.1), '10%'],
    ['资产基础法', '账面净资产 + 评估增值', money(nav * 0.95), money(nav), money(nav * 1.05), '15%'],
  ];
  const mid = (dcfLo + dcfHi) / 2 * 0.4 + eq * 0.35 + ps * 0.1 + nav * 0.15;
  const data = [
    { name: 'DCF', lo: Math.round(dcfLo), span: Math.round(dcfHi - dcfLo) }, { name: 'EV/EBITDA', lo: Math.round(eq * 0.9), span: Math.round(eq * 0.2) },
    { name: 'P/S', lo: Math.round(ps * 0.9), span: Math.round(ps * 0.2) }, { name: '资产基础法', lo: Math.round(nav * 0.95), span: Math.round(nav * 0.1) },
  ];
  return {
    blocks: [
      { kind: 'table', table: { title: `${title} · 多方法估值对照`, cols: ['估值方法', '关键参数', '低值', '中值', '高值', '权重'], rows: [...rows, ['加权结论', '按适用性赋权', money(mid * 0.93), money(mid), money(mid * 1.07), '100%']], total: true } },
      { kind: 'chart', chart: { title: '各方法估值区间（万元）', mode: 'range', data, keys: ['lo', 'span'], names: ['区间下限', '区间跨度'], unit: '万元' } },
    ],
    intro: `本章对${c.co.name}并列采用收益法、市场法与资产基础法测算企业价值区间，参数取自 ${c.from} 至 ${c.to} 财务数据与行内数据终端可比样本，各方法结果按适用性赋权后形成结论区间。`,
    facts: [`按 EV/EBITDA 法，可比中位 ${mult.toFixed(1)} 倍对应企业价值约 ${money(ev)}，扣除有息负债 ${money(debt)}、加回货币资金 ${money(cash)}后股权价值约 ${money(eq)}；DCF 区间 ${money(dcfLo)}–${money(dcfHi)}，两种方法结果相互印证。`, `加权后股权价值结论区间 ${money(mid * 0.93)}–${money(mid * 1.07)}，中值 ${money(mid)}；资产基础法结果显著偏低，反映企业价值主要来自经营性获利能力而非账面资产。`],
  };
}
function bHeat(c: Ctx, title: string): BuildOut {
  const isPrem = /溢价/.test(title);
  const isRate = !isPrem && /定价|利率|贡献/.test(c.fn.name + title);
  if (isPrem) {
    const rl = ['A', 'BBB+', 'BBB', 'BB+', 'BB'], cl = ['无担保', '覆盖率 80%', '覆盖率 100%', '覆盖率 120%', '覆盖率 ≥ 140%'];
    const heat: number[][] = rl.map((_, i) => cl.map((__, j) => +(0.45 + i * 0.22 - j * 0.08 + c.r() * 0.04).toFixed(2)));
    const rows = rl.map((r, i) => [r, ...heat[i].map((v) => pc(v, 2))]);
    return {
      blocks: [{ kind: 'table', table: { title: `${title} · 参考等级 × 担保覆盖率`, cols: ['参考等级 \\ 担保', ...cl], rows, heat, note: '风险溢价 = 预期损失率 + 非预期损失资本占用成本，取自行内预期损失参数表；颜色越深表示溢价越高。' } }],
      intro: `本章按参考等级与担保覆盖率两个维度读取行内预期损失参数表，测算风险溢价并给出敏感性矩阵，说明担保安排对定价的抵减作用。`,
      facts: [`${c.co.name}参考等级 ${rl[3]}、担保覆盖率 ${cl[4]} 对应风险溢价 ${pc(heat[3][4], 2)}，较无担保情形的 ${pc(heat[3][0], 2)} 下调 ${Math.round((heat[3][0] - heat[3][4]) * 100)}bp；若追加担保使覆盖率提升一档，可再下调约 8bp。`],
    };
  }
  const rowsLab = isRate ? ['日均存款 100 万', '日均存款 300 万', '日均存款 500 万', '日均存款 800 万'] : ['WACC 8.5%', 'WACC 9.5%', 'WACC 10.5%', 'WACC 11.5%'];
  const colsLab = isRate ? ['LPR+50bp', 'LPR+70bp', 'LPR+90bp', 'LPR+110bp'] : ['g = 1.5%', 'g = 2.0%', 'g = 2.5%', 'g = 3.0%'];
  const base = isRate ? 12 + c.r() * 4 : c.rev * (0.55 + c.r() * 0.2);
  const heat: number[][] = []; const rows: string[][] = [];
  rowsLab.forEach((rl, i) => {
    const hr: number[] = []; const rr: string[] = [rl];
    colsLab.forEach((_, j) => {
      const v = isRate ? base + (j - 1.5) * 2.2 + (i - 1.5) * 1.1 : base * (1 - (i - 1.5) * 0.09 + (j - 1.5) * 0.06);
      hr.push(v); rr.push(isRate ? pc(v) : money(v));
    });
    heat.push(hr); rows.push(rr);
  });
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · ${isRate ? 'RAROC 敏感性（%）' : '股权价值敏感性'}`, cols: [isRate ? '综合贡献 \\ 定价' : 'WACC \\ 永续增长率', ...colsLab], rows, heat, note: isRate ? '色阶：绿色高于行内门槛 12%，红色低于门槛，需上报定价审批。' : '色阶：颜色越深表示估值越高；加粗单元格为基准情景。' } }],
    intro: `本章以${isRate ? '定价水平与客户综合贡献' : '折现率与永续增长率'}为双变量做敏感性测算，用于评估结论对关键假设的稳健程度。`,
    facts: [isRate ? `在日均存款 300 万元、LPR+90bp 的基准情景下 RAROC 约 ${pc(heat[1][2])}；若客户要求下调至 LPR+50bp，RAROC 降至 ${pc(heat[1][0])}，需以结算归行或代发落地作为让价条件。` : `基准情景（WACC 9.5%、g = 2.5%）下股权价值 ${money(heat[1][2])}；WACC 每上升 1 个百分点估值约下降 ${pc(9)}，永续增长率每上升 0.5 个百分点估值约上升 ${pc(6)}，结论对折现率更敏感。`],
  };
}
function bWaterfall(c: Ctx, title: string): BuildOut {
  const lpr = 3.0; const ftp = 2.1 + c.r() * 0.5, ops = 0.28 + c.r() * 0.1, pd = 0.8 + c.r() * 0.9, lgd = 35 + c.r() * 15, el = (pd * lgd) / 100, cap = (7 + c.r() * 3) * 0.12, profit = 0.3, back = 0.25 + c.r() * 0.2;
  const target = ftp + ops + el + cap + profit - back;
  const items = [['FTP 内部资金价格', ftp], ['运营成本', ops], [`预期损失（PD ${pd.toFixed(1)}% × LGD ${lgd.toFixed(0)}%）`, el], ['经济资本成本', cap], ['目标利润', profit], ['综合贡献回馈', -back]] as Array<[string, number]>;
  let acc = 0; const data = items.map(([name, v]) => { const start = v >= 0 ? acc : acc + v; acc += v; return { name: name.split('（')[0], base: +start.toFixed(2), v: +Math.abs(v).toFixed(2), neg: v < 0 ? 1 : 0 }; });
  data.push({ name: '目标价格', base: 0, v: +target.toFixed(2), neg: 2 });
  const rows = items.map(([n, v]) => [n, `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`, `${Math.round(Math.abs(v) * 100)} bp`, v < 0 ? '存款派生与中收折算' : '行内定价参数库']);
  rows.push(['目标价格', pc(target, 2), `LPR + ${Math.round((target - lpr) * 100)} bp`, `1 年期 LPR ${lpr.toFixed(2)}%`]);
  return {
    blocks: [
      { kind: 'chart', chart: { title: `${title} · 成本加成瀑布（%）`, mode: 'waterfall', data, keys: ['base', 'v'], unit: '%' } },
      { kind: 'table', table: { title: '定价构成明细', cols: ['构成项', '费率', '基点', '取数来源'], rows, total: true } },
    ],
    intro: `本章按行内成本加成公式逐项分解拟报价：目标价格 = FTP + 运营成本 + 预期损失 + 经济资本成本 + 目标利润 − 综合贡献回馈，各项参数由行内定价参数库读取，由前端确定性计算。`,
    facts: [`${c.co.name}本笔 ${money(c.amt)}业务测算目标价格 ${pc(target, 2)}，相当于 LPR + ${Math.round((target - lpr) * 100)}bp；其中预期损失 ${pc(el, 2)} 与经济资本成本 ${pc(cap, 2)} 合计占定价的 ${pc(((el + cap) / target) * 100, 0)}，是主要的风险成本来源。`, `综合贡献回馈 ${pc(back, 2)} 来自日均存款派生与结算、国际业务中收折算，若结算归行承诺未兑现，回馈项应予收回并按无贡献口径重新报价。`],
  };
}
function bRaroc(c: Ctx, title: string): BuildOut {
  const lpr = 3.0; const cap = 8 + c.r() * 2; const ftp = 2.2, ops = 0.3, el = 0.4 + c.r() * 0.25, back = 0.3 + c.r() * 0.15;
  const sc = [['建议价', 90], ['客户要求', 50], ['底线价', 60], ['含贡献条件价', 80]] as Array<[string, number]>;
  const rows = sc.map(([n, bp]) => { const rate = lpr + bp / 100; const raroc = ((rate + back - ftp - ops - el) / cap) * 100; return [n, `LPR + ${bp}bp（${pc(rate, 2)}）`, pc(back, 2), pc(ftp + ops + el, 2), `${cap.toFixed(0)}%`, pc(raroc), raroc >= 12 ? '达标' : '需上报']; });
  const data = sc.map(([n, bp], i) => ({ name: n, v: +rows[i][5].replace('%', ''), t: 12 }));
  return {
    blocks: [
      { kind: 'table', table: { title: `${title} · RAROC 情景对照`, cols: ['情景', '定价', '综合贡献', '成本合计', '经济资本占用', 'RAROC', '门槛比较'], rows, note: 'RAROC =（贷款收入 + 综合贡献 − FTP − 运营成本 − 预期损失）/ 经济资本；行内门槛 12%。' } },
      { kind: 'chart', chart: { title: 'RAROC 与门槛值（%）', mode: 'bar', data, keys: ['v'], names: ['RAROC'], unit: '%' } },
    ],
    intro: `本章按行内 RAROC 方法对不同定价情景做风险调整后收益比较，并与 12% 门槛值对照，识别需要上报定价审批的情形。`,
    facts: [`建议价 LPR+90bp 情景下 RAROC 为 ${rows[0][5]}，高于门槛无需上报；若按客户要求 LPR+50bp，RAROC 降至 ${rows[1][5]}，触发上报提示。`, `以远期结汇、代发工资落地为条件的 LPR+80bp 情景 RAROC 为 ${rows[3][5]}，是兼顾客户诉求与风险回报的可行区间。`],
  };
}
function bPricing(c: Ctx, title: string): BuildOut {
  const lo = 60 + c.ri(0, 20), hi = lo + 25 + c.ri(0, 15); const lpr = 3.0;
  const tiles: Tile[] = [{ label: '建议区间', value: `LPR+${lo}~${hi}bp` }, { label: '对应利率', value: `${pc(lpr + lo / 100, 2)}–${pc(lpr + hi / 100, 2)}` }, { label: '底线价', value: `LPR+${lo - 10}bp`, tone: 'red' }, { label: '同业挂牌中位', value: `LPR+${hi + 10}bp`, tone: 'blue' }];
  const rows = [
    ['基准报价', `LPR+${hi}bp`, '无附加条件', '客户经理权限内'],
    ['结算归行', `LPR+${hi - 10}bp`, '承诺结算量 ≥ 60% 归行', '客户经理权限内'],
    ['结算归行 + 代发', `LPR+${lo + 5}bp`, '代发工资落地、日均存款 ≥ 300 万元', '支行行长审批'],
    ['底线价', `LPR+${lo - 10}bp`, '需综合贡献覆盖，RAROC ≥ 12%', '分行定价审批'],
  ];
  return {
    blocks: [{ kind: 'tiles', title: `${title} · 定价要素`, items: tiles }, { kind: 'table', table: { title: '差异化定价阶梯与谈判口径', cols: ['阶梯', '定价', '附加条件', '审批层级'], rows } }],
    intro: `本章给出${c.co.name}本笔业务的参考利率区间与分层谈判口径，区间由成本加成测算与同业公开报价共同约束，最终以行内定价审批为准。`,
    facts: [`建议报价区间 LPR+${lo}~${hi}bp（${pc(lpr + lo / 100, 2)}–${pc(lpr + hi / 100, 2)}），低于同业挂牌中位 LPR+${hi + 10}bp 约 ${hi + 10 - hi} 至 ${hi + 10 - lo}bp，具备竞争力；底线价 LPR+${lo - 10}bp 须以综合贡献覆盖为前提。`, `谈判口径建议先报基准价，再以结算归行与代发落地作为让价条件逐级释放，避免一次性让至底线。`],
  };
}
function bChain(c: Ctx, title: string): BuildOut {
  const others = COMPANIES.filter((x) => x.id !== c.co.id);
  const up = [others[c.ri(0, 3)], others[c.ri(4, 7)]]; const down = [others[c.ri(8, 10)], others[c.ri(0, 5)]];
  const upShare = 40 + c.ri(0, 25), downShare = 18 + c.ri(0, 20), coverage = 15 + c.ri(0, 25);
  const stages = [
    { name: '上游供应商', nodes: [{ label: up[0].name, sub: `采购占比 ${upShare - 15}% · 本行客户`, tone: TONE(up[0].risk) }, { label: up[1].name, sub: `采购占比 ${Math.round(upShare * 0.4)}%`, tone: TONE(up[1].risk) }, { label: `其他 ${c.ri(8, 30)} 家`, sub: `采购占比 ${100 - upShare}%`, tone: 'blue' }] },
    { name: '核心企业', nodes: [{ label: c.co.name, sub: `${c.co.relation.split('·')[0].trim()} · 敞口 ${c.co.exposure ? wan(c.co.exposure) : '无'}`, tone: 'red' }] },
    { name: '下游客户 / 经销商', nodes: [{ label: down[0].name, sub: `销售占比 ${downShare}% · 应收占比 ${downShare + 12}%`, tone: TONE(down[0].risk) }, { label: down[1].name, sub: `销售占比 ${Math.round(downShare * 0.5)}%`, tone: TONE(down[1].risk) }, { label: `其他 ${c.ri(20, 60)} 家`, sub: `本行覆盖 ${coverage}%`, tone: 'purple' }] },
  ];
  const rows = [
    ['上游供应商', `${c.ri(10, 30)} 家`, `前三家 ${upShare}%`, `${c.ri(60, 95)} 天`, upShare > 55 ? '集中度偏高' : '可控'],
    ['核心企业', '1 家', '—', '—', LV(c.co.risk)],
    ['下游客户', `${c.ri(30, 80)} 家`, `前三家 ${downShare + 15}%`, `${c.ri(45, 112)} 天`, downShare > 30 ? '单一节点依赖' : '分散'],
  ];
  return {
    blocks: [{ kind: 'chain', title: `${title} · 链条结构与本行敞口`, stages }, { kind: 'table', table: { title: '链条集中度与账期', cols: ['环节', '参与主体', '集中度', '平均账期', '风险判断'], rows } }],
    intro: `本章依据购销明细、应收应付账龄与确权数据绘制以${c.co.name}为核心的链条结构，标注本行已覆盖客户与风险节点，作为额度设计与预警规则的基础。`,
    facts: [`上游前三家供应商采购占比 ${upShare}%，下游 ${down[0].name} 销售占比 ${downShare}%、应收占比 ${downShare + 12}%，属于链条中需重点监测的节点；本行对链条客户覆盖率 ${coverage}%，尚有较大延伸空间。`],
  };
}
function bQuota(c: Ctx, title: string): BuildOut {
  const fx = /跨境|汇率|外币|避险/.test(c.fn.name + title), fund = /基金|出资|分层/.test(c.fn.name + title), abs = /证券化|分层与现金流/.test(c.fn.name + title), alloc = /配置|理财|资金/.test(c.fn.name + title);
  const base = Math.max(3000, c.co.settlement * (1.5 + c.r()));
  let rows: string[][]; let cols: string[]; let sum = 0;
  if (fund) { cols = ['层级 / 出资方', '出资额', '占比', '目标回报', '退出顺序']; const t = Math.round(base / 1000) * 1000; rows = [['政府引导基金', money(t * 0.4), '40%', '让利 2 个百分点', '同劣后'], ['理财子优先级', money(t * 0.4), '40%', '固定 6%', '第一顺位'], ['产业方劣后', money(t * 0.2), '20%', '超额分成 20%', '最后']]; sum = t; }
  else if (abs) { cols = ['分层', '规模', '占比', '目标评级', '预期票面']; const t = Math.round(base * 1.2 / 1000) * 1000; rows = [['优先 A 级', money(t * 0.8), '80%', 'AAA', pc(2.9 + c.r() * 0.4, 2)], ['优先 B 级', money(t * 0.1), '10%', 'AA+', pc(3.6 + c.r() * 0.5, 2)], ['次级（发起人自持）', money(t * 0.1), '10%', '无评级', '剩余收益']]; sum = t; }
  else if (alloc) { cols = ['产品', '配置金额', '占比', '期限', '参考年化']; const t = Math.round(base / 100) * 100; rows = [['结构性存款', money(t * 0.4), '40%', '3 个月', pc(2.0 + c.r() * 0.4)], ['大额存单', money(t * 0.2), '20%', '3–6 个月', pc(1.9 + c.r() * 0.3)], ['现金管理类理财', money(t * 0.3), '30%', 'T+1', pc(1.8 + c.r() * 0.4)], ['活期备付', money(t * 0.1), '10%', '随时', '0.35%']]; sum = t; }
  else if (fx) { cols = ['产品', '额度 / 规模', '币种', '期限', '定价 / 说明']; const usd = Math.round(base / 720); rows = [['远期结汇（分季锁定 50%）', `USD ${fmtN(Math.round(usd * 0.5))} 万`, 'USD', '3–12 个月', '按当日远期报价'], ['出口发票融资', money(base * 0.35), 'CNY', '≤ 180 天', `LPR+${60 + c.ri(0, 30)}bp`], ['出口信保保单融资（备选）', money(base * 0.2), 'CNY', '≤ 120 天', '信保赔付转让'], ['跨境人民币结算', '按实际', 'CNY', '—', '减免手续费 30%']]; sum = base * 0.55; }
  else { cols = ['融资主体 / 产品', '测算基数', '比例 / 系数', '测算额度', '期限 · 定价']; const a = base * 0.6, b = base * 0.25, d = base * 0.15; rows = [['反向保理（核心企业确权）', `已确权应付 ${money(a / 0.8)}`, '80%', money(a), `≤ 180 天 · LPR+${50 + c.ri(0, 30)}bp`], ['经销商订单融资', `历史进货额 ${money(b / 0.5)}`, '周转系数 0.5', money(b), `≤ 90 天 · LPR+${80 + c.ri(0, 30)}bp`], ['存货 / 仓单质押', `库存均值 ${money(d / 0.6)}`, '质押率 60%', money(d), `≤ 120 天 · LPR+${90 + c.ri(0, 30)}bp`]]; sum = a + b + d; }
  rows.push(['合计', '—', '—', money(sum), '—']);
  const data = rows.slice(0, -1).map((r, i) => ({ name: r[0].split('（')[0].slice(0, 8), v: Math.round(parseFloat(r[fund || abs || alloc ? 1 : 3].replace(/[^\d.]/g, '')) * (r[fund || abs || alloc ? 1 : 3].includes('亿') ? 10000 : 1)), i })).filter((d) => Number.isFinite(d.v) && d.v > 0);
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 测算表`, cols, rows, total: true, note: '额度以核心企业确权 / 行内审批为前提，测算参数取自行内产品参数表。' } }, { kind: 'chart', chart: { title: '额度 / 规模构成（万元）', mode: 'donut', data, keys: ['v'], unit: '万元' } }],
    intro: `本章按行内产品规则由前端确定性测算${c.co.name}相关的额度与结构安排，列示测算基数、比例系数与结果，供方案定稿与审批引用。`,
    facts: [`测算合计 ${money(sum)}，其中「${rows[0][0]}」占比最高（${money(sum ? parseFloat(rows[0][fund || abs || alloc ? 1 : 3].replace(/[^\d.]/g, '')) * (rows[0][fund || abs || alloc ? 1 : 3].includes('亿') ? 10000 : 1) : 0)}），额度与核心企业授信占用联动校验后未超出集团统一授信上限。`],
  };
}
function bTimeline(c: Ctx, title: string): BuildOut {
  const now = new Date(); const items: Array<{ when: string; text: string; tone: string; src: string }> = [];
  const pool = c.co.risk === 'green'
    ? [['行业媒体报道产能扩建进展', 'green', '行业媒体'], ['取得新客户定点 / 中标公告', 'green', '公开公告'], ['工商变更：注册资本增加', 'blue', '工商公开信息'], ['本行贷后检查：经营正常', 'green', '行内贷后系统'], ['税务信用等级维持 A 级', 'green', '税务公开信息']]
    : [['票交所披露商票逾期 1 笔', 'red', '上海票据交易所'], ['裁判文书：买卖合同纠纷立案', 'orange', '裁判文书网'], ['行业媒体负面报道 2 条', 'orange', '行业媒体'], ['客户回应：已与对手方达成和解', 'blue', '客户经理核实'], ['本行现场核实并出具核查意见', 'green', '行内贷后系统'], ['结算量环比下降触发预警', 'orange', '行内核心系统']];
  let day = 28;
  for (const p of pool) { const d = new Date(now); d.setDate(now.getDate() - day); day -= c.ri(3, 7); items.push({ when: ymd(d), text: p[0], tone: p[1], src: p[2] }); }
  const neg = items.filter((i) => i.tone === 'red' || i.tone === 'orange').length;
  return {
    blocks: [{ kind: 'timeline', title: `${title} · 近 30 天`, items }],
    intro: `本章按时间顺序聚合与${c.co.name}相关的公开信息与行内事件，同一主题的多条信息合并为一个事件并关联本行敞口，来源权威性已逐条标注。`,
    facts: [`近 30 天共追踪 ${items.length} 个事件，其中负面 ${neg} 个${neg ? `，最早负面信息出现于 ${items.find((i) => i.tone === 'red' || i.tone === 'orange')?.when}` : ''}；${c.co.exposure ? `事件已关联本行 ${wan(c.co.exposure)}敞口。` : '本行暂无信贷敞口，影响集中于结算与存款。'}`],
  };
}
function bFunnel(c: Ctx, title: string): BuildOut {
  const n0 = c.ri(24, 40); const steps = ['触达', '首访', '提交申请', '落地', '用信']; const rates = [1, 0.78, 0.5, 0.36, 0.28];
  const data = steps.map((s, i) => ({ name: s, v: Math.round(n0 * rates[i] * (i ? 0.9 + c.r() * 0.2 : 1)) }));
  const rows = data.map((d, i) => [d.name, `${d.v} 家`, i ? pc((d.v / data[i - 1].v) * 100) : '—', i ? pc((d.v / n0) * 100) : '100%']);
  return {
    blocks: [{ kind: 'chart', chart: { title: `${title} · 营销漏斗（家）`, mode: 'hbar', data, keys: ['v'], names: ['客户数'], unit: '家' } }, { kind: 'table', table: { title: '各环节转化率', cols: ['环节', '客户数', '环节转化率', '累计转化率'], rows } }],
    intro: `本章以「触达 → 首访 → 申请 → 落地 → 用信」漏斗刻画活动各环节转化，转化率由 CRM 拜访记录与信贷系统数据由前端确定性计算。`,
    facts: [`触达 ${n0} 家、落地 ${data[3].v} 家，落地率 ${rows[3][3]}；首访到申请环节流失最大（转化 ${rows[2][2]}），主要异议集中于确权流程与材料清单，是下一阶段改进重点。`],
  };
}
function bRadar(c: Ctx, title: string): BuildOut {
  const t = c.fn.name + title;
  const axes = /数字化|成熟度/.test(t) ? ['生产', '财务', '供应链', '营销', '数据治理'] : /韧性|供应/.test(t) ? ['供应商替代性', '客户分散度', '库存覆盖', '回款稳定', '价格传导'] : /竞争|竞品/.test(t) ? ['产品力', '客户结构', '认证资质', '数字化', '渠道', '成本'] : /战略/.test(t) ? ['增长', '盈利', '结构', '竞争位置', '能力储备'] : ['财务', '经营', '征信', '结算', '行业', '治理'];
  const data = axes.map((k) => ({ k, a: c.ri(42, 92), b: c.ri(55, 78) }));
  const score = Math.round(data.reduce((s, d) => s + d.a, 0) / data.length);
  const rows = data.map((d) => [d.k, `${d.a}`, `${d.b}`, d.a - d.b >= 8 ? '领先' : d.a - d.b <= -8 ? '落后' : '持平']);
  return {
    blocks: [{ kind: 'chart', chart: { title: `${title} · 多维评分（满分 100）`, mode: 'radar', data, keys: ['a', 'b'], names: [c.co.name, '行业中位'] } }, { kind: 'table', table: { title: '分项得分与行业对照', cols: ['维度', c.co.name, '行业中位', '相对位置'], rows } }],
    intro: `本章按行内量表对${c.co.name}做 ${axes.length} 维评分并与行业中位对照，评分由规则逐项判定，权重与阈值可在配置页查看。`,
    facts: [`综合得分 ${score} 分，${rows.filter((r) => r[3] === '领先').map((r) => r[0]).join('、') || '各维度'}${rows.some((r) => r[3] === '领先') ? '领先行业中位' : '与行业中位持平'}；${rows.filter((r) => r[3] === '落后').map((r) => r[0]).join('、') || '暂无维度'}明显落后，是后续建议的着力点。`],
  };
}
function bRoadmap(c: Ctx, title: string): BuildOut {
  const t = c.fn.name + title;
  const tpl = /退出/.test(t) ? [['投后管理与里程碑核验', '投资机构 / 本行', ['季度经营数据报送', '多客户拓展里程碑']], ['申报辅导', '券商 / 本行投行部', ['股改与规范', '审计与评估']], ['IPO 申报与发行', '券商', ['创业板申报', '发行与减持安排']], ['并购退出（备选）', '产业方', ['产业方收购意向', '估值与对价谈判']]]
    : /监测|下月|关注/.test(t) ? [['日常监测', '主办客户经理', ['结算流水与用电量', '舆情与司法信息']], ['月度核查', '客户经理 + 风险经理', ['财务报表更新', '预警规则复跑']], ['季度复盘', '团队负责人', ['风险等级复评', '授信条件执行检查']], ['触发处置', '风险管理部', ['48 小时现场核实', '启动处置预案']]]
    : [['准备与准入', '主办客户经理', ['材料收集与核实', '内部立项']], ['方案定稿与审批', '支行 / 分行审批', ['方案评审', '合同与条件落实']], ['投放与落地', '运营 + 客户经理', ['首笔投放', '结算与账户配套']], ['复盘与扩面', '团队负责人', ['效果复盘', '扩大覆盖范围']]];
  let start = 0;
  const phases = tpl.map(([name, owner, items], i) => { const len = c.ri(1, 3); const p = { name: name as string, when: `第 ${start + 1}${len > 1 ? `–${start + len}` : ''} 个月`, owner: owner as string, items: items as string[], start, len }; start += len; void i; return p; });
  const rows = phases.map((p, i) => [`阶段 ${i + 1}`, p.name, p.when, p.owner, p.items.join('；')]);
  return {
    blocks: [{ kind: 'roadmap', title: `${title} · 分阶段安排`, phases }, { kind: 'table', table: { title: '里程碑与责任人', cols: ['阶段', '名称', '时间', '责任人', '关键事项'], rows } }],
    intro: `本章将建议事项拆解为可执行的分阶段安排，明确各阶段时间、责任人与关键事项，便于纳入工作计划与 OA 待办跟踪。`,
    facts: [`整体安排 ${start} 个月、${phases.length} 个阶段，${phases[0].name}由${phases[0].owner}牵头于${phases[0].when}完成；关键路径在「${phases[1].name}」，需提前与审批部门沟通条件。`],
  };
}
function bCanvas(c: Ctx, title: string): BuildOut {
  const ind = c.co.industry;
  const cells = [
    { k: '客户细分', v: `${ind}下游 ${c.ri(40, 300)} 家客户，前三大占 ${c.ri(30, 70)}%`, tone: 'red' }, { k: '价值主张', v: '稳定交付、账期服务与定制能力', tone: 'gold' }, { k: '渠道通路', v: '直销 + 区域经销商 + 线上平台', tone: 'green' },
    { k: '客户关系', v: '大客户专属团队、年度框架协议', tone: 'blue' }, { k: '收入来源', v: `主营收入约 ${money(c.rev)}，服务收入占比 ${c.ri(3, 12)}%`, tone: 'purple' }, { k: '核心资源', v: '定点资质、产线与技术团队', tone: 'orange' },
    { k: '关键业务', v: '采购—生产—交付—回款闭环', tone: 'green' }, { k: '重要合作', v: '核心供应商、物流与本行结算', tone: 'gold' }, { k: '成本结构', v: `原材料占成本 ${c.ri(55, 75)}%，人工 ${c.ri(8, 18)}%`, tone: 'red' },
  ];
  return {
    blocks: [{ kind: 'canvas', title: `${title} · 商业模式画布`, cells }],
    intro: `本章以商业模式画布九要素结构化${c.co.name}的现有模式，要素内容来自访谈记录、经营资料与财务数据，作为识别创新空间与优化点的基线。`,
    facts: [`画布显示收入高度依赖主营产品、客户集中度 ${c.ri(30, 70)}%，成本端原材料占比 ${c.ri(55, 75)}%，模式的主要脆弱点在议价能力与账期垫资，也是金融配套可以切入的位置。`],
  };
}
function bMatrix(c: Ctx, title: string): BuildOut {
  const t = c.fn.name + title;
  const opts = /增信/.test(t) ? ['差额补足', '外部担保', '超额覆盖', '优先/次级分层'] : /方案对比|结构/.test(t) ? ['方案 A', '方案 B', '方案 C'] : /竞品/.test(t) ? [`${c.co.name}`, '竞争者 A', '竞争者 B', '竞争者 C'] : ['本行方案', '同业 A', '同业 B', '同业 C'];
  const dims = /增信/.test(t) ? ['增信成本', '评级提升', '实施难度', '资本占用'] : /竞品/.test(t) ? ['产品覆盖', '认证资质', '数字化', '成本水平', '渠道'] : ['定价', '期限', '担保要求', '审批时效', '综合服务'];
  const rows = dims.map((d) => [d, ...opts.map(() => ['★★★★★', '★★★★', '★★★', '★★'][c.ri(0, 3)])]);
  const totals = opts.map((_, j) => rows.reduce((s, r) => s + r[j + 1].length, 0));
  rows.push(['综合得分', ...totals.map((x) => `${x * 4} 分`)]);
  const best = totals.indexOf(Math.max(...totals));
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 对比矩阵`, cols: ['维度', ...opts], rows, total: true, note: '★ 越多表示该维度越优；综合得分为各维度等权汇总。' } }],
    intro: `本章按统一维度对备选项做横向对比，评分依据公开信息与行内案例库，等权汇总形成综合得分。`,
    facts: [`综合得分最高的是「${opts[best]}」（${totals[best] * 4} 分），主要优势在${rows.filter((r) => r[best + 1].length >= 4).map((r) => r[0]).slice(0, 2).join('与') || '综合表现'}；建议以此为基础，在弱项维度补充条件。`],
  };
}
function bAlerts(c: Ctx, title: string): BuildOut {
  const fin = [['毛利率连续两期下降', `${c.ri(13, 17)}%`, '≥ 18%', 'orange'], ['应收周转天数', `${c.ri(95, 130)} 天`, '≤ 75 天', 'red'], ['其他应收款占流动资产', pc(c.ri(8, 18)), '≤ 5%', 'orange'], ['经营现金流 / 净利润', `${(c.r() * 0.8).toFixed(2)}`, '≥ 1.0', 'orange'], ['资产负债率', pc(c.ri(52, 68)), '≤ 60%', 'gold'], ['流动比率', `${(1 + c.r() * 0.6).toFixed(2)}`, '≥ 1.2', 'green']];
  const ops = [['单一客户 / 供应商依赖', pc(c.ri(35, 55)), '≤ 30%', 'orange'], ['确权覆盖率', pc(c.ri(62, 88)), '≥ 70%', 'gold'], ['结算量环比变动', pc(-c.ri(5, 40)), '≥ −20%', 'orange'], ['被执行 / 诉讼记录', `${c.ri(0, 2)} 条`, '0 条', 'gold'], ['商票逾期', `${c.ri(0, 1)} 笔`, '0 笔', 'green'], ['舆情负面条数（30 天）', `${c.ri(0, 5)} 条`, '≤ 2 条', 'gold']];
  const pool = /财务|盈利|偿债|现金流/.test(c.fn.name + title) ? fin : ops;
  const rows = pool.map((p) => [p[0], p[1], p[2], p[3] === 'red' ? '高' : p[3] === 'orange' ? '中' : p[3] === 'gold' ? '低' : '正常', p[3] === 'green' ? '未触发' : '已触发']);
  const hit = rows.filter((r) => r[4] === '已触发').length;
  const data = [{ name: '高', v: rows.filter((r) => r[3] === '高').length }, { name: '中', v: rows.filter((r) => r[3] === '中').length }, { name: '低', v: rows.filter((r) => r[3] === '低').length }, { name: '正常', v: rows.filter((r) => r[3] === '正常').length }];
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 规则命中明细`, cols: ['预警指标 / 信号', '当前值', '阈值', '等级', '状态'], rows, note: '阈值取自行内预警指标配置表；等级为辅助判定，不替代行内分类。' } }, { kind: 'chart', chart: { title: '触发信号按等级分布（条）', mode: 'bar', data, keys: ['v'], names: ['信号数'], unit: '条' } }],
    intro: `本章列示按行内预警规则逐项判定的信号，含当前值、阈值与等级；触发信号已同步至客户经理待办与贷后风险哨兵。`,
    facts: [`共扫描 ${rows.length} 项规则，触发 ${hit} 项，其中「${rows.find((r) => r[3] === '高')?.[0] ?? rows[0][0]}」等级最高；建议对触发项逐一取得佐证材料，并在授信条件中设置对应约束。`],
  };
}
function bTrend(c: Ctx, title: string): BuildOut {
  const years = [c.year - 2, c.year - 1, `${c.year}E`];
  const r0 = c.rev / (1 + 0.15 + c.r() * 0.2) / (1 + 0.1 + c.r() * 0.15);
  const rev = [r0, r0 * (1.1 + c.r() * 0.15), c.rev];
  const gm = [18 + c.r() * 4, 16 + c.r() * 3, 14 + c.r() * 3];
  const ocf = [rev[0] * (0.02 + c.r() * 0.05), -rev[1] * (0.02 + c.r() * 0.03), rev[2] * (c.co.risk === 'green' ? 0.03 : -0.015)];
  const data = years.map((y, i) => ({ name: String(y), rev: Math.round(rev[i]), ocf: Math.round(ocf[i]), gm: +gm[i].toFixed(1) }));
  const rows = [['营业收入', ...rev.map((v) => money(v))], ['收入增速', '—', pc(((rev[1] - rev[0]) / rev[0]) * 100), pc(((rev[2] - rev[1]) / rev[1]) * 100)], ['毛利率', ...gm.map((v) => pc(v))], ['经营活动现金流', ...ocf.map((v) => money(v))], ['应收周转天数', `${c.ri(60, 80)} 天`, `${c.ri(80, 100)} 天`, `${c.ri(95, 125)} 天`], ['资产负债率', pc(c.ri(45, 55)), pc(c.ri(52, 60)), pc(c.ri(56, 66))]];
  return {
    blocks: [{ kind: 'chart', chart: { title: `${title} · 收入与经营现金流（万元）`, mode: 'area', data, keys: ['rev', 'ocf'], names: ['营业收入', '经营现金流'], unit: '万元' } }, { kind: 'table', table: { title: '主要财务指标（三期）', cols: ['指标', ...years.map(String)], rows } }],
    intro: `本章以三期数据观察${c.co.name}的规模、盈利与现金流走势，指标由前端按统一口径复算，与客户报表口径差异已在附录说明。`,
    facts: [`营业收入由 ${money(rev[0])}增至 ${money(rev[2])}，毛利率由 ${pc(gm[0])} 回落至 ${pc(gm[2])}，收入扩张伴随盈利质量下滑；经营活动现金流 ${ocf[1] < 0 ? `${c.year - 1} 年转负（${money(ocf[1])}）` : `保持为正`}，应收账款占用是主要原因。`],
  };
}
function bDonut(c: Ctx, title: string): BuildOut {
  const t = c.fn.name + title;
  const labels = /情绪/.test(t) ? ['负面', '中性', '正面'] : /国别|区域/.test(t) ? ['越南', '德国', '泰国', '其他'] : /资金结构|资金/.test(t) ? ['经营性资金', '季节性闲置', '项目专项', '备付'] : /成本/.test(t) ? ['原材料', '人工', '制造费用', '销售与管理', '财务费用'] : /来源/.test(t) ? ['官方公告', '裁判文书', '行业媒体', '社交平台'] : /客户细分|覆盖|概况/.test(t) ? ['战略客户', '核心客户', '成长客户', '基础客户'] : ['本行', '同业 A', '同业 B', '其他'];
  const raw = labels.map(() => 10 + c.r() * 60); const s = raw.reduce((a, b) => a + b, 0);
  const data = labels.map((name, i) => ({ name, v: Math.round((raw[i] / s) * 100), i })).sort((a, b) => b.v - a.v);
  data[0].v += 100 - data.reduce((a, d) => a + d.v, 0);
  const rows = data.map((d) => [d.name, `${d.v}%`, d.v >= 40 ? '集中' : d.v >= 20 ? '主要' : '次要']);
  return {
    blocks: [{ kind: 'chart', chart: { title: `${title} · 构成占比（%）`, mode: 'donut', data, keys: ['v'], unit: '%' } }, { kind: 'table', table: { title: '构成明细', cols: ['类别', '占比', '判断'], rows } }],
    intro: `本章对${title.replace(/与.*$/, '')}做结构拆分，比例由行内数据与客户授权数据统计，用于判断集中度与结构性风险。`,
    facts: [`「${data[0].name}」占比 ${data[0].v}% 为最大构成项，${data[0].v >= 40 ? '集中度偏高，建议在方案中设置分散化安排' : '结构相对均衡'}；前两项合计 ${data[0].v + data[1].v}%。`],
  };
}
function bSources(c: Ctx, title: string): BuildOut {
  const ds = c.fn.dataSources.length ? c.fn.dataSources : ['行内业务系统（只读）'];
  const rows = ds.map((d, i) => [d, ['只读旁路', '客户授权', '公开渠道', '行内维护'][i % 4], `${c.from} ~ ${c.to}`, ['报表口径 · 万元', '按日均 · 万元', '按公开披露口径', '按行内参数版本'][i % 4]]);
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 数据来源与口径`, cols: ['数据来源', '获取方式', '数据期间', '口径说明'], rows } }],
    intro: `本章列示报告引用的全部数据来源、获取方式与统计口径；所有数据在行内环境处理，不出网、不留存原件。`,
    facts: [`报告共引用 ${ds.length} 类数据来源，金额单位除特别注明外均为人民币万元，比例指标保留一位小数；${c.purpose === '客户汇报' ? '客户汇报版已隐去行内内部评价语句与内评参数。' : '内部参数（PD/LGD、FTP）仅限行内使用。'}`],
  };
}
function bChecklist(c: Ctx, title: string): BuildOut {
  if (/核实|回应|事实/.test(title)) {
    const items: Array<[string, string, string, string]> = [['商票逾期 / 违约事实', '票交所披露 + 客户对账单', c.co.risk === 'green' ? '未发现' : '属实，已部分兑付', '资金临时周转，承诺 10 日内结清'], ['诉讼与被执行信息', '裁判文书网 + 执行信息公开网', c.co.risk === 'red' ? '属实' : '无新增', c.co.risk === 'red' ? '已与对方达成和解，正在履行' : '—'], ['经营场所与生产状态', '现场走访 + 用电量比对', '正常生产', '订单充足，8 月开工率 85%'], ['主要客户回款', '流水核对 + 客户访谈', '回款延迟 15–30 天', '已推进电子对账缩短账期'], ['实际控制人说明', '面谈 + 书面承诺', '已取得', '出具保证与资金归行承诺']];
    return {
      blocks: [{ kind: 'table', table: { title: `${title} · 核实记录`, cols: ['核实事项', '核实方式', '核实结果', '客户回应'], rows: items.map((i) => [...i]) } }],
      intro: `本章记录对舆情与预警事项的逐项核实过程，含核实方式、结果与客户正式回应；未经核实的信息不作为贷后处置依据。`,
      facts: [`共核实 ${items.length} 项，${items.filter((i) => /属实/.test(i[2])).length} 项属实、${items.filter((i) => /未发现|无新增/.test(i[2])).length} 项未发现异常；客户已就关键事项出具书面说明，后续以承诺履行情况作为监测触发点。`],
    };
  }
  const items = /跨境|汇率|外币/.test(c.fn.name + title) ? ['展业三原则：了解客户、了解业务、尽职审查', '汇率风险中性：仅套期保值，不引导投机', '远期结售汇与合同、发票逐笔对应', '外债 / 跨境担保登记需求核查', '交易对手制裁名单核查（行内系统）', '收汇与报关匹配率 ≥ 95%']
    : /证券化|基金|投资|投贷/.test(c.fn.name + title) ? ['持牌机构执行发行 / 投资，本行仅顾问角色', '资管新规与理财子参与规则符合性', '真实转让与破产隔离安排', '关联交易与信息披露要求', '不承诺回报、不承诺发行成功']
    : ['不替代行内内评、五级分类与审批结论', '客户信息使用在授权与权限范围内', '未引用未核实政策与承诺性表述', 'AI 生成段落已标识并经人工复核', '对外版本隐去行内内部评价语句', '数据脱敏并在行内环境处理'];
  const rows = items.map((it, i) => [it, i % 5 === 3 ? '待确认' : '通过', ['行内合规规则库', '监管规定', '行内制度', '本平台合规检查'][i % 4], i % 5 === 3 ? '需复核人确认后定稿' : '—']);
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 合规预检清单`, cols: ['检查项', '结果', '依据', '备注'], rows } }],
    intro: `本章列示报告输出前的合规检查项及结果，检查依据行内合规规则库与本平台措辞校验规则；「待确认」项须复核人处理后方可对外。`,
    facts: [`共 ${rows.length} 项检查，${rows.filter((r) => r[1] === '通过').length} 项通过、${rows.filter((r) => r[1] === '待确认').length} 项待确认；${c.fn.compliance}`],
  };
}
function bRaci(c: Ctx, title: string): BuildOut {
  const rows = [['分行公司业务部', '方案统筹、集团层面对接', '牵头', '周慧敏'], ['城东支行', '主办客户经理、日常维护', '执行', '王志远'], ['授信审批部', '授信条件与额度审批', '审批', '按授权'], ['风险管理部', '预警规则与贷后监测', '协同', '风险经理'], ['产品创新部', '产品参数与流程配置', '支持', '产品经理'], ['运营管理部', '账户、结算与系统对接', '支持', '运营主管']];
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 机构分工`, cols: ['机构 / 部门', '职责', '角色', '联系人'], rows } }],
    intro: `本章明确方案实施涉及的行内机构分工与责任，跨机构信息共享限于行内授权范围。`,
    facts: [`方案由分行公司业务部牵头、城东支行执行，涉及 ${rows.length} 个机构 / 部门；建议以季度例会机制跟踪进度，重大事项通过 OA 转呈。`],
  };
}
function bBenefit(c: Ctx, title: string): BuildOut {
  const dep = Math.round(c.co.settlement * (0.15 + c.r() * 0.2)), loan = Math.round(Math.max(1000, c.co.settlement * (0.5 + c.r() * 0.8))), fee = Math.round(loan * 0.004 + dep * 0.002), cost = Math.round(fee * (0.12 + c.r() * 0.1));
  const net = Math.round(dep * 0.018 + loan * 0.015 + fee);
  const rows = [['新增存款（日均）', wan(dep), `派生收益 ${wan(Math.round(dep * 0.018))}`], ['新增融资投放', wan(loan), `净利差 1.5% 收益 ${wan(Math.round(loan * 0.015))}`], ['结算与中间业务', wan(fee), '手续费与国际业务中收'], ['投入成本', wan(cost), '人力、系统与营销费用'], ['年新增综合贡献', wan(net), `投入产出比 ${(net / Math.max(1, cost)).toFixed(1)} 倍`]];
  const data = [{ name: '存款派生', v: Math.round(dep * 0.018) }, { name: '融资利差', v: Math.round(loan * 0.015) }, { name: '中间业务', v: fee }, { name: '投入成本', v: -cost }];
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 效益测算`, cols: ['项目', '规模', '说明'], rows, total: true, note: '收益为参考测算，用于方案比选，不作为绩效考核唯一依据。' } }, { kind: 'chart', chart: { title: '综合贡献构成（万元）', mode: 'bar', data, keys: ['v'], names: ['金额'], unit: '万元' } }],
    intro: `本章按行内综合收益规则测算方案实施后的存款、融资与中间业务贡献，并与投入成本比较，参数由前端确定性计算。`,
    facts: [`预计年新增综合贡献约 ${wan(net)}，其中融资利差贡献最大（${wan(Math.round(loan * 0.015))}）；投入成本约 ${wan(cost)}，投入产出比 ${(net / Math.max(1, cost)).toFixed(1)} 倍。`],
  };
}
function bScenario(c: Ctx, title: string): BuildOut {
  const base = Math.max(800, c.co.exposure || c.co.settlement * 0.3);
  const rows = [['基准情景', '回款按账期正常', money(base * 0.05), '正常', '维持现有条件'], ['轻度压力', '主要客户回款延迟 30 天', money(base * 0.18), '关注', '追加应收质押'], ['中度压力', '单一下游节点停摆', money(base * 0.42), '预警', '压降敞口 20%、受托支付'], ['重度压力', '节点出险叠加担保代偿', money(base * 0.75), '高危', '启动处置预案、追加担保']];
  const data = rows.map((r) => ({ name: r[0], v: Math.round(parseFloat(r[2].replace(/[^\d.]/g, '')) * (r[2].includes('亿') ? 10000 : 1)) }));
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 情景测试结果`, cols: ['情景', '假设', '现金流缺口', '等级', '应对'], rows } }, { kind: 'chart', chart: { title: '各情景现金流缺口（万元）', mode: 'bar', data, keys: ['v'], names: ['缺口'], unit: '万元' } }],
    intro: `本章按「节点停摆 → 回款 / 供应缺口 → 现金流缺口」规则链测算不同压力情景下的影响金额，情景以区间表达、不给概率。`,
    facts: [`中度压力情景下现金流缺口约 ${rows[2][2]}，${c.co.exposure ? `相当于本行敞口的 ${pc((data[2].v / c.co.exposure) * 100, 0)}` : '需关注对结算量的影响'}；重度情景缺口 ${rows[3][2]}，建议将对应处置预案写入授信条件。`],
  };
}
function bKpi(c: Ctx, title: string): BuildOut {
  const macro = /宏观|月报|PMI/.test(c.fn.name + title);
  const tiles: Tile[] = macro
    ? [{ label: '制造业 PMI', value: (49 + c.r() * 1.5).toFixed(1), delta: '连续 3 月 < 50', tone: 'red' }, { label: 'PPI 同比', value: pc(-(1 + c.r() * 1.5)), delta: '降幅收窄', tone: 'orange' }, { label: '1 年期 LPR', value: '3.00%', delta: '持平', tone: 'blue' }, { label: '社融增量', value: `${(2.5 + c.r() * 1.5).toFixed(1)} 万亿`, delta: '同比多增', tone: 'green' }, { label: 'USD/CNY', value: (7.1 + c.r() * 0.2).toFixed(3), delta: '区间波动', tone: 'gold' }, { label: '铝价（较 Q1 高点）', value: pc(-(8 + c.r() * 8)), delta: '回落', tone: 'orange' }]
    : [{ label: '池内应收余额', value: money(c.co.settlement * (0.8 + c.r() * 0.6)) }, { label: '历史回款天数', value: `${c.ri(45, 80)} 天` }, { label: '逾期 90 天以上占比', value: pc(1 + c.r() * 2.5), tone: 'orange' }, { label: '最大单户占比', value: pc(6 + c.r() * 8), tone: 'gold' }, { label: '确权覆盖率', value: pc(65 + c.r() * 25), tone: 'green' }, { label: '参考融资上限', value: money(c.co.settlement * (0.4 + c.r() * 0.3)), tone: 'red' }];
  const rows = tiles.map((t) => [t.label, t.value, t.delta ?? '—', macro ? '国家统计局 / 人民银行' : '客户应收明细 / 行内参数']);
  return {
    blocks: [{ kind: 'tiles', title: `${title} · 指标看板`, items: tiles }, { kind: 'table', table: { title: '指标明细与来源', cols: ['指标', '当前值', '变动 / 判断', '来源'], rows } }],
    intro: macro ? `本章汇总本月宏观与行业关键指标，同比 / 环比、连续期数与阈值交叉由前端计算，市场风险提示按规则命中表达。` : `本章列示方案涉及的量化指标，指标由前端按行内参数确定性计算并与阈值比较。`,
    facts: [macro ? `制造业 PMI ${tiles[0].value} 连续 3 个月低于荣枯线，PPI 同比 ${tiles[1].value}，工业品价格仍在下行通道；LPR 维持 ${tiles[2].value}，融资成本端保持稳定。` : `逾期 90 天以上占比 ${tiles[2].value}、最大单户占比 ${tiles[3].value}，均在行内参数允许范围内；确权覆盖率 ${tiles[4].value}，参考融资上限 ${tiles[5].value}。`],
  };
}
function bKv(c: Ctx, title: string, sample: string): BuildOut {
  const pairs = extractPairs(sample, 5);
  const rows = pairs.length >= 3 ? pairs.map((p) => [p.label, p.value, '样本数据', '已核对']) : [['分析期间', `${c.from} ~ ${c.to}`, '任务设置', '—'], ['本行敞口', c.co.exposure ? wan(c.co.exposure) : '无', '行内信贷系统', '已核对'], ['结算量（年）', wan(c.co.settlement), '行内核心系统', '已核对'], ['存款（日均）', wan(c.co.deposit), '行内核心系统', '已核对'], ['命中规则', `${c.ri(1, 5)} 条`, '规则引擎', '—']];
  const data = ['结算量', '存款', '敞口', '同业均值'].map((name, i) => ({ name, v: [c.co.settlement, c.co.deposit, c.co.exposure || c.co.settlement * 0.2, c.co.settlement * 0.7][i] }));
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 关键要素`, cols: ['要素', '取值', '来源', '状态'], rows } }, { kind: 'chart', chart: { title: '与本行合作规模（万元）', mode: 'bar', data, keys: ['v'], names: ['金额'], unit: '万元' } }],
    intro: `本章整理${title}相关的关键要素与取值，供后续章节引用。`,
    facts: [`${c.co.name}与本行年结算量 ${wan(c.co.settlement)}、日均存款 ${wan(c.co.deposit)}${c.co.exposure ? `、信贷敞口 ${wan(c.co.exposure)}` : '，暂无信贷敞口'}，${c.co.relation}。`],
  };
}
function bPolicy(c: Ctx, title: string): BuildOut {
  const pool: Array<[string, string, string, string]> = [['大规模设备更新与技术改造支持政策', '正向', '精密制造、新能源', '技改贷款需求上升，可配套绿色技改贷'], ['铝材出口退税取消', '负向', '有色加工', '出口利润承压，关注北岭铝材等客户毛利率'], ['1 年期 LPR 维持 3.0%', '中性', '全部行业', '融资成本稳定，定价谈判空间有限'], ['跨境贸易人民币结算便利化', '正向', '跨境电商、进出口制造', '推广跨境人民币结算与远期结汇'], ['食品安全监管趋严', '中性偏负', '食品加工', '合规成本上升，关注晟禾食品集团子公司资质'], ['涉农贷款贴息延续', '正向', '现代农业', '青原农业科技等客户融资成本下降']];
  const rows = pool.slice(0, 4 + c.ri(0, 2)).map((p) => [...p, COMPANIES.filter((x) => p[2].includes(x.industry.slice(0, 2))).map((x) => x.name).slice(0, 2).join('、') || '—']);
  const data = [{ name: '正向', v: rows.filter((r) => r[1] === '正向').length }, { name: '中性', v: rows.filter((r) => /中性/.test(r[1])).length }, { name: '负向', v: rows.filter((r) => r[1] === '负向').length }];
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 政策影响清单`, cols: ['政策 / 变化', '方向', '影响行业', '影响说明', '涉及客户'], rows, note: '方向为 AI 引擎依据政策文本做的方向性评估，映射到行业与客户；不构成单户授信结论。' } }, { kind: 'chart', chart: { title: '政策影响方向分布（项）', mode: 'bar', data, keys: ['v'], names: ['政策数'], unit: '项' } }],
    intro: `本章梳理分析期间内发布或生效的货币、财政与产业政策，按方向性评估映射至行业与名下客户，形成政策影响清单。`,
    facts: [`共纳入 ${rows.length} 项政策变化，正向 ${data[0].v} 项、负向 ${data[2].v} 项；其中「${rows[0][0]}」对${rows[0][4]}影响最直接，建议在下一次拜访中主动沟通配套方案。`],
  };
}
function bActions(c: Ctx, title: string): BuildOut {
  const t = c.fn.name + title;
  const pool: Array<[string, string, string, string]> = /竞品|创新|战略|模式|数字化|流程/.test(t)
    ? [['切入新能源 / 高附加值细分市场', '取得体系认证并对接整车厂二级供应体系', '客户管理层 · 本行协助对接', '12 个月'], ['推进渠道与终端数字化', '上线订货与收款小程序，沉淀交易数据', '客户 IT 与销售部门', '6 个月'], ['压缩账期、优化资金占用', '电子对账 + 保理回款，月结改为票据结算', '客户财务 · 本行结算团队', '3 个月'], ['引入供应链协同与集采', '与核心供应商共建仓配、争取账期', '客户采购部门', '9 个月'], ['配套金融方案落地', '技改贷款、保理与结算方案同步申报', '主办客户经理', '2 个月']]
    : [['授信条件设置', '新增授信以应收账款质押 + 受托支付为前提', '客户经理 · 审批部', '放款前'], ['非经营性占用清理', '要求其他应收款于放款前提供用途说明并设回收节点', '客户财务', '30 天'], ['账期压缩', '对前五大客户推行电子对账，账期压缩至 90 天', '客户销售 · 本行结算团队', '90 天'], ['产品替代', '以订单融资 / 保理替代一般流动资金贷款', '主办客户经理', '下次授信'], ['监测频率提升', '纳入月度贷后监测，结算量与用电量按月比对', '风险经理', '持续']];
  const rows = pool.slice(0, 4 + c.ri(0, 1)).map((p, i) => [String(i + 1), ...p, ['高', '高', '中', '中', '低'][i]]);
  return {
    blocks: [{ kind: 'table', table: { title: `${title} · 建议事项清单`, cols: ['序号', '建议事项', '具体措施', '责任方', '时限', '优先级'], rows } }],
    intro: `本章将分析结论转化为可执行的建议事项，逐项明确措施、责任方与时限，优先级按对风险缓释或价值提升的贡献排序。`,
    facts: [`共提出 ${rows.length} 项建议，其中高优先级 ${rows.filter((r) => r[5] === '高').length} 项；「${rows[0][1]}」建议在${rows[0][4]}内完成，并作为后续复盘的首要检查项。`],
  };
}
const BUILDERS: Record<BlockKind, (c: Ctx, t: string, s: string) => BuildOut> = {
  summary: bSummary, valuation: bValuation, heat: bHeat, waterfall: bWaterfall, raroc: bRaroc, pricing: bPricing, chain: bChain, quota: bQuota, timeline: bTimeline, funnel: bFunnel,
  radar: bRadar, roadmap: bRoadmap, canvas: bCanvas, matrix: bMatrix, alerts: bAlerts, trend: bTrend, donut: bDonut, sources: bSources, checklist: bChecklist, raci: bRaci, benefit: bBenefit, scenario: bScenario, kpi: bKpi, kv: bKv, policy: bPolicy, actions: bActions,
};

/* ====================================================================== 报告装配 */
const PURPOSE_CLOSE: Record<Purpose, string> = {
  授信申报: '本章结论已按授信调查报告格式整理，可直接引用至授信申报材料相应章节，引用时请保留数据来源标注。',
  客户汇报: '本章面向客户汇报的表述已隐去行内内部评价语句与内评参数，对客沟通时以建议与数据事实为主。',
  内部研判: '本章供行内研判使用，不对外提供；结论为辅助判断，最终以行内审批与授权为准。',
  高层会谈: '建议在高层会谈中以本章数据为切入点，先陈述事实与测算，再提出合作建议与条件。',
};
function buildChapters(c: Ctx, docs: UDoc[], focus: string[]): { chapters: Chapter[]; kinds: BlockKind[] } {
  const outline = c.spec.outline?.length ? c.spec.outline : ['结论摘要', '客户与业务概况', '分析与测算', '风险与合规', '建议与实施', '数据来源'];
  const sample = localize(c.fn.demoSample, c.base, c.co);
  const sents = sentences(sample);
  const extra = [...sentences(localize(c.fn.process, c.base, c.co)).map((s) => s.replace(/^(?:AI 引擎|规则|规则层|前端)\s*[:：]?\s*/, '')), ...sentences(localize(c.fn.output, c.base, c.co)).map((s) => `本报告的输出物包括：${s.replace(/^[《]|[》]$/g, '')}`), ...sentences(localize(c.fn.summary, c.base, c.co)).map((s) => `本报告${s}`)].filter((s) => s.length >= 14);
  const n = outline.length; let e = 0;
  const kinds = outline.map((t, i) => pickKind(t, i, n));
  const used = new Set<BlockKind>();
  const chapters = outline.map((title, i) => {
    let kind = kinds[i];
    if (used.has(kind) && kind !== 'sources') kind = KIND_RULES.find(([re, k]) => re.test(title) && !used.has(k))?.[1] ?? FALLBACK.find((k) => !used.has(k)) ?? 'kv';
    if (kind === 'kv') kind = FALLBACK.find((k) => !used.has(k)) ?? 'kv';
    used.add(kind); kinds[i] = kind;
    const share = sents.slice(Math.floor((i * sents.length) / n), Math.floor(((i + 1) * sents.length) / n)).join('');
    const out = BUILDERS[kind](c, title, share || sample);
    const paras = [out.intro];
    if (share) paras.push(endDot(share)); else if (e < extra.length) paras.push(endDot(extra[e++]));
    paras.push(...out.facts.map(endDot));
    if (i === 0 && docs.length) paras.push(`本次分析读取来源文件 ${docs.length} 份（${docs.map((d) => d.name).join('、')}），识别置信度 ${Math.round(docs.reduce((s, d) => s + d.confidence, 0) / docs.length)}%，低置信字段已在识别结果中标注并经人工确认。`);
    if (i === n - 1 || i === 0 || /建议|策略|应对|口径|结论/.test(title)) paras.push(PURPOSE_CLOSE[c.purpose]);
    return { id: `ch-${i + 1}`, no: i + 1, title, paras: paras.slice(0, 4), blocks: out.blocks, focus: focus.includes(title) };
  });
  return { chapters, kinds };
}
function buildConclusion(c: Ctx) {
  const sample = localize(c.fn.demoSample, c.base, c.co);
  const unq = (s: string) => ((s.match(/「/g)?.length ?? 0) === (s.match(/」/g)?.length ?? 0) ? s : s.replace(/[「」『』]/g, ''));
  const cl = clauses(sample).map((s) => unq(s.replace(/^[（(].*?[）)]/, '').trim())).filter((s) => s.length >= 8);
  const KW = /结论|等级|区间|建议|评分|价值|定价|预测|研判|缺口|贡献|机会|可行性|路径|优化|方案/;
  const good = (s: string) => /\d/.test(s) && s.length >= 14;
  const notSubj = (s: string) => !s.startsWith(c.co.name) && !/^[（(]/.test(s);
  const key = cl.find((s) => KW.test(s) && good(s) && notSubj(s)) ?? cl.find((s) => good(s) && notSubj(s)) ?? cl.find((s) => KW.test(s) && good(s)) ?? cl.find(good) ?? cl.find((s) => s.length >= 12) ?? cl[0] ?? `${c.spec.docType ?? c.fn.name}已完成，主要结论见正文各章`;
  const macro = /宏观|月报/.test(c.fn.name);
  const headline = cut(key.startsWith(c.co.name) || macro ? key : `${c.co.name}：${key}`, 78);
  const points = uniq(cl.filter((s) => s !== key && s.length >= 8 && s.length <= 64)).slice(0, 4).map((s) => cut(s, 56));
  while (points.length < 3) points.push([`${c.fn.output.split(/[（(，,]/)[0]}已按${c.purpose}用途排版，可直接编辑、打印与转呈`, `报告全部数字由前端确定性计算，AI 引擎仅负责解释与行文`, `${c.fn.compliance.split(/[；;。]/)[0]}`][points.length]);
  return { headline, points };
}
interface HistRec { no: string; co: Company; purpose: Purpose; when: string; status: string; tone: string; ver: string }
function buildHistory(fid: string): HistRec[] {
  const r = rng(hashStr(fid) ^ 0x2f1c9); const now = new Date(); let day = 0;
  const st: Array<[string, string]> = [['已复核', 'green'], ['已转呈', 'blue'], ['待复核', 'orange'], ['已导出', 'gold'], ['已归档', 'purple']];
  return Array.from({ length: 5 }, (_, i) => {
    day += 2 + Math.floor(r() * 6); const d = new Date(now); d.setDate(now.getDate() - day); d.setHours(9 + Math.floor(r() * 8), Math.floor(r() * 60));
    const [status, tone] = st[Math.floor(r() * st.length)];
    return { no: reportNo(fid, d, i + 3), co: COMPANIES[Math.floor(r() * COMPANIES.length)], purpose: PURPOSES[Math.floor(r() * PURPOSES.length)], when: `${ymd(d)} ${hm(d)}`, status, tone, ver: r() < 0.5 ? 'v1.1' : 'v1.0' };
  });
}

/* ====================================================================== 图表与图元 */
type TipItem = { name?: string | number; value?: number | string | ReadonlyArray<number | string>; color?: string; dataKey?: string | number };
function Tip({ active, payload, label, unit, hide }: { active?: boolean; payload?: ReadonlyArray<TipItem>; label?: unknown; unit?: string; hide?: string[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rp-tip">
      {label != null && String(label) !== '' && <div className="l">{String(label)}</div>}
      {payload.filter((p) => !hide?.includes(String(p.dataKey ?? ''))).map((p, i) => (
        <div className="r" key={i}><i style={{ background: typeof p.color === 'string' && !p.color.startsWith('url') ? p.color : 'var(--g-iris)' }} />{String(p.name ?? '')}<b>{typeof p.value === 'number' ? p.value.toLocaleString('zh-CN') : String(p.value ?? '')}{unit ? ` ${unit}` : ''}</b></div>
      ))}
    </div>
  );
}
const AX = { tick: { fontSize: 10.5, fill: '#8c8478' }, axisLine: false as const, tickLine: false as const };
function ChartView({ ch, gid }: { ch: ChartData; gid: string }) {
  const defs = (
    <defs>
      {GRADS.map((g, i) => <linearGradient key={i} id={`${gid}-g${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={g[0]} /><stop offset="1" stopColor={g[1]} /></linearGradient>)}
      {GRADS.map((g, i) => <linearGradient key={`h${i}`} id={`${gid}-h${i}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={g[0]} /><stop offset="1" stopColor={g[1]} /></linearGradient>)}
      <linearGradient id={`${gid}-a0`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a86ff" stopOpacity=".5" /><stop offset="1" stopColor="#00b4d8" stopOpacity=".05" /></linearGradient>
      <linearGradient id={`${gid}-a1`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2dc48d" stopOpacity=".5" /><stop offset="1" stopColor="#1f8a5a" stopOpacity=".04" /></linearGradient>
      <linearGradient id={`${gid}-r0`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7a70" stopOpacity=".6" /><stop offset="1" stopColor="#c3272b" stopOpacity=".2" /></linearGradient>
      <linearGradient id={`${gid}-r1`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" stopOpacity=".7" /><stop offset="1" stopColor="#c9a24d" stopOpacity=".25" /></linearGradient>
    </defs>
  );
  const grid = <CartesianGrid vertical={false} stroke="rgba(120,100,60,.12)" />;
  const names = ch.names ?? ch.keys;
  const h = 210;
  let body: React.ReactElement;
  switch (ch.mode) {
    case 'area': body = (
      <AreaChart data={ch.data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>{defs}{grid}<XAxis dataKey="name" {...AX} /><YAxis {...AX} width={56} /><Tooltip content={<Tip unit={ch.unit} />} />
        {ch.keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} name={names[i]} stroke={i === 0 ? '#3a86ff' : '#1f8a5a'} strokeWidth={2.2} fill={`url(#${gid}-a${i})`} dot={{ r: 3, strokeWidth: 0, fill: i === 0 ? '#3a86ff' : '#1f8a5a' }} animationDuration={700} />)}
      </AreaChart>); break;
    case 'line': body = (
      <LineChart data={ch.data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>{defs}{grid}<XAxis dataKey="name" {...AX} /><YAxis {...AX} width={56} /><Tooltip content={<Tip unit={ch.unit} />} />
        {ch.keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} name={names[i]} stroke={`url(#${gid}-h${i})`} strokeWidth={2.2} dot={{ r: 3, strokeWidth: 0, fill: GRADS[i][1] }} animationDuration={700} />)}
      </LineChart>); break;
    case 'hbar': body = (
      <BarChart data={ch.data} layout="vertical" margin={{ top: 4, right: 30, left: 10, bottom: 0 }} barCategoryGap="22%">{defs}<CartesianGrid horizontal={false} stroke="rgba(120,100,60,.12)" /><XAxis type="number" {...AX} /><YAxis type="category" dataKey="name" {...AX} width={64} /><Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit={ch.unit} />} />
        <Bar dataKey={ch.keys[0]} name={names[0]} radius={[2, 8, 8, 2]} animationDuration={700} label={{ position: 'right', fontSize: 11, fill: '#5f5850' }}>{ch.data.map((_, i) => <Cell key={i} fill={`url(#${gid}-h${i})`} />)}</Bar>
      </BarChart>); break;
    case 'range': body = (
      <BarChart data={ch.data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }} barCategoryGap="30%">{defs}{grid}<XAxis dataKey="name" {...AX} /><YAxis {...AX} width={62} /><Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit={ch.unit} hide={['lo']} />} />
        <Bar dataKey="lo" stackId="a" fill="transparent" name="下限" /><Bar dataKey="span" stackId="a" name="估值区间" radius={[6, 6, 6, 6]} animationDuration={700}>{ch.data.map((_, i) => <Cell key={i} fill={`url(#${gid}-g${i})`} />)}</Bar>
      </BarChart>); break;
    case 'waterfall': body = (
      <BarChart data={ch.data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }} barCategoryGap="26%">{defs}{grid}<XAxis dataKey="name" {...AX} interval={0} tick={{ fontSize: 9.5, fill: '#8c8478' }} /><YAxis {...AX} width={40} /><Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit={ch.unit} hide={['base']} />} />
        <Bar dataKey="base" stackId="w" fill="transparent" name="基线" /><Bar dataKey="v" stackId="w" name="费率" radius={[5, 5, 0, 0]} animationDuration={700}>{ch.data.map((d, i) => <Cell key={i} fill={d.neg === 1 ? `url(#${gid}-g2)` : d.neg === 2 ? `url(#${gid}-g0)` : `url(#${gid}-g${[1, 3, 4, 5, 6][i % 5]})`} />)}</Bar>
      </BarChart>); break;
    case 'donut': body = (
      <PieChart>{defs}<Pie data={ch.data} dataKey={ch.keys[0]} nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} cornerRadius={5} stroke="#fff" strokeWidth={2} animationDuration={700} label={({ name, value }) => `${name} ${typeof value === 'number' && ch.unit === '%' ? `${value}%` : ''}`} labelLine={false} fontSize={10.5}>
        {ch.data.map((_, i) => <Cell key={i} fill={`url(#${gid}-g${i})`} />)}</Pie><Tooltip content={<Tip unit={ch.unit} />} /></PieChart>); break;
    case 'radar': body = (
      <RadarChart data={ch.data} cx="50%" cy="50%" outerRadius="72%">{defs}<PolarGrid stroke="rgba(120,100,60,.18)" /><PolarAngleAxis dataKey="k" tick={{ fontSize: 10.5, fill: '#5f5850' }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name={names[1]} dataKey={ch.keys[1]} stroke="#c9a24d" strokeWidth={1.5} fill={`url(#${gid}-r1)`} fillOpacity={1} animationDuration={700} /><Radar name={names[0]} dataKey={ch.keys[0]} stroke="#c3272b" strokeWidth={2} fill={`url(#${gid}-r0)`} fillOpacity={1} dot={{ r: 2.5, fill: '#c3272b', strokeWidth: 0 }} animationDuration={700} /><Tooltip content={<Tip />} /></RadarChart>); break;
    default: body = (
      <BarChart data={ch.data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }} barCategoryGap="28%">{defs}{grid}<XAxis dataKey="name" {...AX} interval={0} /><YAxis {...AX} width={56} /><Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip unit={ch.unit} />} />
        {ch.keys.map((k, ki) => <Bar key={k} dataKey={k} name={names[ki]} radius={[6, 6, 2, 2]} animationDuration={700}>{ch.data.map((d, i) => <Cell key={i} fill={typeof d[k] === 'number' && (d[k] as number) < 0 ? `url(#${gid}-g0)` : `url(#${gid}-g${(i + ki) % GRADS.length})`} />)}</Bar>)}
      </BarChart>);
  }
  return (
    <div className="rp-chart">
      <ResponsiveContainer width="100%" height={h}>{body}</ResponsiveContainer>
      {(ch.mode === 'area' || ch.mode === 'line' || ch.mode === 'radar' || ch.mode === 'donut') && (
        <div className="rp-legend">{ch.mode === 'donut' ? ch.data.map((d, i) => <span key={i}><i style={{ background: gradCss(i) }} />{String(d.name)}</span>) : names.map((nm, i) => <span key={nm}><i style={{ background: ch.mode === 'radar' ? (i === 0 ? TONE_GRAD.red : TONE_GRAD.gold) : ch.mode === 'area' ? (i === 0 ? TONE_GRAD.blue : TONE_GRAD.green) : gradCss(i) }} />{nm}</span>)}</div>
      )}
    </div>
  );
}
function heatStyle(v: number, min: number, max: number, good: boolean) {
  const t = max === min ? 0.5 : (v - min) / (max - min);
  const a = 0.12 + t * 0.5;
  return { background: good ? `linear-gradient(135deg, rgba(61,187,134,${a}), rgba(31,138,90,${a * 0.8}))` : `linear-gradient(135deg, rgba(227,169,60,${a}), rgba(195,39,43,${a * 0.85}))` };
}
function TableView({ t, cno, idx, editable }: { t: Table; cno: number; idx: number; editable: boolean }) {
  const flat = t.heat?.flat() ?? []; const min = Math.min(...flat), max = Math.max(...flat);
  return (
    <div className="rp-fig">
      <div className="rp-cap"><b>表 {cno}-{idx}</b>{t.title}</div>
      <div className="rp-tbl-wrap">
        <table className="tbl rp-tbl">
          <thead><tr>{t.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i} className={t.total && i === t.rows.length - 1 ? 'total' : ''}>
                {r.map((cell, j) => {
                  const hv = t.heat?.[i]?.[j - 1];
                  const heat = hv != null ? heatStyle(hv, min, max, /RAROC/.test(t.title) ? hv >= 12 : true) : undefined;
                  const cls = [j > 0 && /^[-−+]?[\d,.]+/.test(cell) ? 'num' : '', /已触发|高危|需上报|落后|待确认|高$/.test(cell) ? 'bad' : /未触发|达标|通过|领先|正常$/.test(cell) ? 'good' : ''].join(' ').trim();
                  return <td key={j} className={cls || undefined} style={heat} contentEditable={editable} suppressContentEditableWarning data-ed={`t${cno}-${idx}-${i}-${j}`}>{cell}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.note && <div className="rp-note">注：{t.note}</div>}
    </div>
  );
}
function BlockView({ b, cno, idx, gid, editable }: { b: Block; cno: number; idx: number; gid: string; editable: boolean }) {
  switch (b.kind) {
    case 'table': return <TableView t={b.table} cno={cno} idx={idx} editable={editable} />;
    case 'chart': return <div className="rp-fig"><div className="rp-cap"><b>图 {cno}-{idx}</b>{b.chart.title}</div><ChartView ch={b.chart} gid={gid} />{b.chart.note && <div className="rp-note">注：{b.chart.note}</div>}</div>;
    case 'tiles': return (
      <div className="rp-fig"><div className="rp-cap"><b>指标 {cno}-{idx}</b>{b.title}</div>
        <div className="rp-tiles">{b.items.map((t, i) => <div className={`tile rp-tile ${t.tone ?? ''}`} key={i}><span>{t.label}</span><b className="num">{t.value}</b>{t.delta && <em>{t.delta}</em>}</div>)}</div></div>);
    case 'timeline': return (
      <div className="rp-fig"><div className="rp-cap"><b>图 {cno}-{idx}</b>{b.title}</div>
        <div className="rp-timeline">{b.items.map((it, i) => <div className="ev" key={i}><span className="when num">{it.when}</span><i style={{ background: TONE_GRAD[it.tone] ?? TONE_GRAD.blue }} /><div className="body"><b>{it.text}</b><small>来源：{it.src}</small></div></div>)}</div></div>);
    case 'chain': return (
      <div className="rp-fig"><div className="rp-cap"><b>图 {cno}-{idx}</b>{b.title}</div>
        <div className="rp-chain">{b.stages.map((s, i) => (
          <div className="stage" key={i}><div className="sh">{s.name}</div>{s.nodes.map((n, j) => <div className={`node ${n.tone}`} key={j}><b>{n.label}</b><span>{n.sub}</span></div>)}{i < b.stages.length - 1 && <div className="arrow"><Icon name="ChevronsRight" size={18} /></div>}</div>
        ))}</div></div>);
    case 'roadmap': { const total = b.phases.reduce((s, p) => Math.max(s, p.start + p.len), 0); return (
      <div className="rp-fig"><div className="rp-cap"><b>图 {cno}-{idx}</b>{b.title}</div>
        <div className="rp-gantt">{b.phases.map((p, i) => <div className="row" key={i}><span className="nm">{p.name}</span><div className="track"><i style={{ left: `${(p.start / total) * 100}%`, width: `${(p.len / total) * 100}%`, background: gradCss(i) }}>{p.when}</i></div><span className="ow">{p.owner}</span></div>)}</div></div>); }
    case 'canvas': return (
      <div className="rp-fig"><div className="rp-cap"><b>图 {cno}-{idx}</b>{b.title}</div>
        <div className="rp-canvas">{b.cells.map((c, i) => <div className={`cell ${c.tone}`} key={i}><b>{c.k}</b><span>{c.v}</span></div>)}</div></div>);
    default: return null;
  }
}

/* ====================================================================== 页面 */
export default function ReportPage() {
  const { fid = '' } = useParams();
  const fn = useMemo(() => { const f = CATALOG.functions.find((x) => x.id === fid); return f ? sanitizeFn(f) : undefined; }, [fid]);
  if (!fn) {
    return (
      <div className="card rp-nf">
        <div className="ico"><Icon name="Search" size={24} /></div>
        <h2>未找到该功能</h2>
        <p>功能编号「{fid || '（空）'}」不在当前功能目录中。请从产品页或全局搜索重新进入。</p>
        <Link to="/" className="btn"><Icon name="ChevronRight" size={14} /> 返回首页驾驶舱</Link>
      </div>
    );
  }
  return <ReportWork key={fn.id} fn={fn} />;
}

type Phase = 'setup' | 'gen' | 'report';
interface Version { v: string; label: string; who: string; when: string; note: string }

function ReportWork({ fn }: { fn: ProductFunction }) {
  const spec = useMemo(() => specOf(fn.id), [fn.id]);
  const product = productById(fn.product);
  const docType = spec.docType ?? `${fn.name}报告`;
  const outline = useMemo(() => (spec.outline?.length ? spec.outline : ['结论摘要', '客户与业务概况', '分析与测算', '风险与合规', '建议与实施', '数据来源']), [spec]);
  const base = useMemo(() => defaultCompany(fn), [fn]);
  const related = useMemo(() => CATALOG.functions.filter((f) => f.product === fn.product && f.id !== fn.id).slice(0, 5), [fn]);
  const history = useMemo(() => buildHistory(fn.id), [fn.id]);
  const now = useMemo(() => new Date(), []);
  const focusOptions = useMemo(() => uniq([...outline.slice(1, -1), ...fn.panels.map((p) => p.split(/[／/]/)[0])]).slice(0, 8), [outline, fn.panels]);

  /* ---- 任务设置 ---- */
  const [companyId, setCompanyId] = useState(base.id);
  const co = COMPANIES.find((c) => c.id === companyId) ?? COMPANIES[0];
  const [purpose, setPurpose] = useState<Purpose>('授信申报');
  const [from, setFrom] = useState(ym(new Date(now.getFullYear(), now.getMonth() - 12, 1)));
  const [to, setTo] = useState(ym(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const [focus, setFocus] = useState<string[]>(() => focusOptions.slice(0, 2));
  const [docs, setDocs] = useState<UDoc[]>([]);
  const [uploadKey, setUploadKey] = useState(0);
  const presets = useMemo(() => buildPresets(spec, co, now.getFullYear()), [spec, co, now]);
  const doneDocs = docs.filter((d) => d.status === 'done');
  const canRun = !spec.uploadRequired || doneDocs.length > 0;

  /* ---- 运行 ---- */
  const [phase, setPhase] = useState<Phase>('setup');
  const [lit, setLit] = useState(0);
  const [runId, setRunId] = useState(0);
  const [run, setRun] = useState<{ co: Company; purpose: Purpose; from: string; to: string; focus: string[]; docs: UDoc[]; at: Date }>({ co: base, purpose: '授信申报', from, to, focus: [], docs: [], at: now });
  const steps = useMemo(() => ['读取来源文件与行内数据源（只读旁路）', '数据核对与勾稽校验', ...outline.map((t) => `撰写「${t}」`), '生成图表与附表', '合规检查与措辞校验', '排版、编号与目录生成'], [outline]);
  useEffect(() => {
    if (!runId) return;
    const timers: number[] = [];
    setPhase('gen'); setLit(0);
    steps.forEach((_, i) => timers.push(window.setTimeout(() => setLit(i + 1), STEP_MS * (i + 1))));
    timers.push(window.setTimeout(() => { setPhase('report'); window.scrollTo({ top: 0, behavior: 'smooth' }); }, STEP_MS * (steps.length + 1)));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  /* ---- 报告状态 ---- */
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState(0);
  const editedRef = useRef<Set<string>>(new Set());
  const [versions, setVersions] = useState<Version[]>([]);
  const [reviewers, setReviewers] = useState<boolean[]>(REVIEWERS.map((r) => r.auto));
  const [reviewed, setReviewed] = useState(false);
  const [activeCh, setActiveCh] = useState('ch-1');
  const [showHist, setShowHist] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const toast = (m: string) => { setToastMsg(m); if (toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800); };
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  const start = () => {
    if (!canRun) { toast('请先上传并完成至少 1 份来源文件的识别'); return; }
    const at = new Date();
    setRun({ co, purpose, from, to, focus, docs: doneDocs, at });
    setEditing(false); setEdits(0); editedRef.current = new Set(); setReviewed(false); setReviewers(REVIEWERS.map((r) => r.auto));
    setVersions([{ v: 'v1.0', label: 'AI 初稿', who: '企金智脑', when: `${ymd(at)} ${hm(at)}`, note: '按任务设置自动起草' }]);
    setRunId((n) => n + 1);
  };
  const reset = () => { setPhase('setup'); setLit(0); setDocs([]); setUploadKey((k) => k + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); toast('已新建报告任务，请完成任务设置'); };

  /* ---- 报告数据 ---- */
  const gen = useMemo(() => {
    const coIdx = Math.max(0, COMPANIES.findIndex((c) => c.id === run.co.id));
    const r = rng((hashStr(fn.id) ^ (coIdx * 977) ^ (PURPOSES.indexOf(run.purpose) * 31)) >>> 0);
    const rev = run.co.settlement * (6 + r() * 4);
    const am = run.co.id === base.id ? /(?:贷款|融资|额度|业务|拟投|对价|投放|规模)[^\d]{0,6}(\d[\d,]*(?:\.\d+)?)\s*(万元|亿元)/.exec(fn.demoSample) : null;
    const amt = am ? Math.round(parseFloat(am[1].replace(/,/g, '')) * (am[2] === '亿元' ? 10000 : 1)) : run.co.exposure || Math.max(500, Math.round((run.co.settlement * 0.25) / 100) * 100);
    const ctx: Ctx = { r, ri: (a, b) => a + Math.floor(r() * (b - a + 1)), co: run.co, fn, base, spec, purpose: run.purpose, from: run.from, to: run.to, rev, amt, year: run.at.getFullYear() };
    const out = buildChapters(ctx, run.docs, run.focus);
    const hasCompliance = outline.some((t) => /合规|风险/.test(t)) && out.kinds.includes('checklist');
    if (!hasCompliance) {
      const c = BUILDERS.checklist(ctx, '风险提示与合规声明', '');
      out.chapters.push({ id: `ch-${out.chapters.length + 1}`, no: out.chapters.length + 1, title: '风险提示与合规声明', paras: [c.intro, endDot(fn.compliance), ...c.facts.map(endDot)].slice(0, 4), blocks: c.blocks, focus: false });
    }
    return { chapters: out.chapters, concl: buildConclusion(ctx) };
  }, [run, fn, base, spec, outline]);
  const chapters = gen.chapters;
  const concl = gen.concl;
  const no = reportNo(fn.id, run.at, runId);
  const paraCount = chapters.reduce((s, c) => s + c.paras.length, 0);
  const tblCount = chapters.reduce((s, c) => s + c.blocks.filter((b) => b.kind === 'table').length, 0);
  const figCount = chapters.reduce((s, c) => s + c.blocks.filter((b) => b.kind !== 'table').length, 0);
  const curVer = versions[versions.length - 1]?.v ?? 'v1.0';
  const dsList = fn.dataSources.length ? fn.dataSources : ['行内业务系统（只读）'];
  const evidence = uniq([...run.docs.map((d) => d.name), ...dsList.slice(0, 3)]);

  /* ---- 目录滚动联动 ---- */
  useEffect(() => {
    if (phase !== 'report') return;
    const onScroll = () => {
      let cur = chapters[0]?.id ?? 'ch-1';
      for (const c of chapters) { const el = document.getElementById(c.id); if (el && el.getBoundingClientRect().top <= 170) cur = c.id; }
      setActiveCh(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [phase, chapters]);
  const gotoCh = (id: string) => { const el = document.getElementById(id); if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 120; window.scrollTo({ top: y, behavior: 'smooth' }); } };

  /* ---- 编辑 ---- */
  const onInput = (e: FormEvent<HTMLDivElement>) => {
    const t = (e.target as HTMLElement).closest('[data-ed]') as HTMLElement | null;
    if (!t) return;
    t.classList.add('rp-edited'); editedRef.current.add(t.dataset.ed ?? ''); setEdits(editedRef.current.size);
  };
  const toggleEdit = () => {
    if (editing) {
      setEditing(false);
      if (edits > 0) {
        const at = new Date();
        setVersions((v) => [...v, { v: `v1.${v.length}`, label: '人工修订', who: AUTHOR, when: `${ymd(at)} ${hm(at)}`, note: `修改 ${edits} 处` }]);
        toast(`已完成编辑并保存版本，人工修改 ${edits} 处`);
      } else toast('未检测到修改，报告保持 AI 初稿');
    } else { setEditing(true); toast('已进入编辑模式：正文段落与表格单元格可直接修改，修改处标黄'); }
  };
  const getHtml = () => docRef.current?.innerHTML ?? '';
  const onSystem = (id: string, label: string) => toast(id === 'forward' ? `已将《${docType}》转呈相关部门，OA 待办已生成` : `已${label}：${docType} · ${run.co.name}`);
  const loadHist = (h: HistRec) => { setCompanyId(h.co.id); setPurpose(h.purpose); setShowHist(false); setPhase('setup'); toast(`已载入历史报告 ${h.no} 的任务参数（${h.co.name} · ${h.purpose}）`); };
  const progress = phase === 'report' ? 100 : Math.round((lit / steps.length) * 100);
  const gidBase = `rp-${fn.id.replace(/[^a-zA-Z0-9]/g, '')}-${runId}`;

  return (
    <div className={`rp${phase === 'report' ? ' rp-in-report' : ''}`}>
      {/* ---------- 顶部 ---------- */}
      <div className="rp-crumb"><Link to={product?.route ?? '/'}>{product?.name ?? fn.product}</Link><Icon name="ChevronRight" size={12} /><b>{fn.name}</b></div>
      <div className="rp-head">
        <div>
          <h1>{docType}<span className="fid">{fn.id}</span><span className="chip iris"><i />专业报告</span></h1>
          <p>{fn.summary}</p>
        </div>
        <div className="rp-actions">
          <button className="btn" onClick={reset}><Icon name="Plus" size={14} /> 新建报告</button>
          <button className="btn ghost" onClick={() => setShowHist(true)}><Icon name="History" size={14} /> 历史报告</button>
          {phase === 'report' && <button className="btn gold" onClick={start}><Icon name="RotateCcw" size={14} /> 重新生成</button>}
        </div>
      </div>

      <div className="rp-body">
        {/* ---------- 主栏 ---------- */}
        <div className="rp-main">
          {phase === 'setup' && (
            <>
              <div className="card rp-setup">
                <div className="card-h"><div className="card-t"><span className="dot" />任务设置</div><span className="card-s">{product?.name} · 生成《{docType}》</span></div>
                <div className="rp-form">
                  <div className="rp-field">
                    <label className="rp-lbl" htmlFor="rp-co">客户 <span className="req">*</span></label>
                    <select id="rp-co" className="rp-inp" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.industry}</option>)}</select>
                    <div className="rp-co-meta"><span className={`chip ${co.risk === 'red' ? 'red' : co.risk === 'orange' ? 'orange' : co.risk === 'yellow' ? '' : 'green'}`}><i />{co.relation}</span><span className="chip blue"><i />{co.district}</span>{co.exposure > 0 && <span className="chip purple"><i />敞口 {fmtN(co.exposure)} 万</span>}</div>
                    <div className="rp-co-note">{co.note}</div>
                  </div>
                  <div className="rp-field">
                    <label className="rp-lbl">报告用途 <span className="req">*</span></label>
                    <div className="rp-seg">{PURPOSES.map((p) => <button key={p} className={purpose === p ? 'on' : ''} onClick={() => setPurpose(p)}>{p}</button>)}</div>
                    <div className="rp-co-note">{purpose === '授信申报' ? '按授信调查报告格式组织章节，保留内评参数与内部评价。' : purpose === '客户汇报' ? '面向客户的对外版本，自动隐去行内内部评价语句。' : purpose === '内部研判' ? '供行内团队研判使用，附完整规则命中与参数。' : '面向企业高层的会谈版本，突出结论、数据与合作建议。'}</div>
                  </div>
                  <div className="rp-field">
                    <label className="rp-lbl">分析期间</label>
                    <div className="rp-range"><input className="rp-inp" type="month" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /><span>至</span><input className="rp-inp" type="month" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
                  </div>
                  <div className="rp-field">
                    <label className="rp-lbl">重点关注<span className="hint">多选 · 选中章节在报告中加重标注</span></label>
                    <div className="rp-chips">{focusOptions.map((f) => <button key={f} className={`chip${focus.includes(f) ? ' red' : ''}`} onClick={() => setFocus((x) => x.includes(f) ? x.filter((y) => y !== f) : [...x, f])}><i />{f}</button>)}</div>
                  </div>
                </div>
              </div>
              <UploadDocs key={uploadKey} label="来源文件" types={spec.uploads} presets={presets} required={!!spec.uploadRequired} onChange={setDocs}
                hint={spec.uploadRequired ? '本报告必须基于来源文件生成：请上传或从行内影像系统选取，至少 1 份识别完成后方可生成' : '可选：补充来源文件可提高报告数据完整度；支持 Word、Excel、PDF、PPT、影像与录音'} />
              <div className="card rp-go-card">
                <div>
                  <b>{canRun ? '任务设置完成，可以生成报告' : '尚未满足生成条件'}</b>
                  <div className="card-s">{spec.uploadRequired ? `已识别 ${doneDocs.length} 份来源文件（必需 ≥ 1）` : `已识别 ${doneDocs.length} 份来源文件（可选）`} · 客户 {co.name} · {purpose} · {from} ~ {to}</div>
                </div>
                <button className="btn rp-go" disabled={!canRun} onClick={start}><Icon name="Sparkles" size={15} /> 生成报告</button>
              </div>
            </>
          )}

          {phase === 'gen' && (
            <div className="card">
              <div className="card-h"><div className="card-t"><span className="dot" />生成中</div><span className="ai-tag"><span className="pulse" /> 本机模型推理中 · {progress}%</span></div>
              <div className="rp-run-meta"><span>报告 <b className="num">{no}</b></span><span>客户 <b>{run.co.name}</b></span><span>用途 <b>{run.purpose}</b></span><span>期间 <b className="num">{run.from} ~ {run.to}</b></span><span>来源文件 <b>{run.docs.length} 份</b></span></div>
              <div className="rp-progress"><div className="bar"><i style={{ width: `${progress}%` }} /></div></div>
              <div className="think rp-think">
                {steps.map((s, i) => { const st = i < lit ? 'ok' : i === lit ? 'on' : 'todo'; return (
                  <div className={`step ${st}`} key={i}><span className="n">{st === 'ok' ? <Icon name="Check" size={12} /> : i + 1}</span><div className="body"><b>{s}{st === 'on' && <span className="pulse" />}</b><p>{i === 0 ? `${run.docs.map((d) => d.name).join('、') || '行内数据源'} · ${dsList.slice(0, 2).join(' / ')}` : i === 1 ? '报表勾稽、口径统一、异常值标注' : i < steps.length - 3 ? '规则计算 → 引用数字 → AI 引擎行文 → 标注 AI 生成' : i === steps.length - 3 ? 'SVG 渐变图表、数据表格与指标瓦片' : i === steps.length - 2 ? '措辞校验、内部语句隐藏、不承诺性表述检查' : '封面、目录、章节编号、页眉页脚'}</p></div></div>); })}
              </div>
            </div>
          )}

          {phase === 'report' && (
            <>
              <AiConclusion headline={concl.headline} points={concl.points} evidence={evidence} confidence={0.84 + (hashStr(fn.id) % 9) / 100} actions={spec.actions} onSystem={onSystem} tone={run.co.risk === 'red' || run.co.risk === 'orange' ? 'red' : 'gold'} />
              <div className="rp-toolbar">
                <div className="l"><span className="chip"><i />{no}</span><span className="chip green"><i />{curVer} · {versions[versions.length - 1]?.label}</span>{editing && <span className="chip orange"><i />编辑中 · 已修改 {edits} 处</span>}</div>
                <DocActions title={`${docType} · ${run.co.name}`} editing={editing} onEdit={toggleEdit} getHtml={getHtml} onToast={toast} />
              </div>

              <div className={`rp-doc${editing ? ' editing' : ''}`} ref={docRef} onInput={onInput}>
                <div className="rp-print-head">企金智脑 · 内部文件 · {docType} · {no}</div>
                <div className="rp-print-foot">{BANK} · 密级：内部 · AI 生成 · 辅助建议 · 需人工复核</div>
                <div className="rp-cover">
                  <div className="ribbon" />
                  <div className="org">{BANK}</div>
                  <h1 className="serif">{docType}</h1>
                  <div className="sub">{run.co.name} · {run.purpose}版</div>
                  <div className="meta">
                    <div><span>报告编号</span><b className="num">{no}</b></div><div><span>客户名称</span><b>{run.co.name}</b></div><div><span>所属行业</span><b>{run.co.industry}</b></div>
                    <div><span>分析期间</span><b className="num">{run.from} ~ {run.to}</b></div><div><span>编制机构</span><b>{BANK}</b></div><div><span>编制人</span><b>{AUTHOR}</b></div>
                    <div><span>编制日期</span><b>{cn(run.at)}</b></div><div><span>密级</span><b>内部</b></div><div><span>版本</span><b className="num">{curVer}</b></div>
                  </div>
                  <div className="foot"><span className="ai-tag">AI 生成 · 辅助建议 · 需人工复核</span><span>{fn.name} · {fn.id}</span></div>
                </div>

                <div className="rp-toc">
                  <h2>目 录</h2>
                  <ol>{chapters.map((c) => <li key={c.id} onClick={() => gotoCh(c.id)}><span className="n">第 {c.no} 章</span><span className="t">{c.title}{c.focus && <em>重点</em>}</span><span className="dots" /><span className="pg num">{c.no + 1}</span></li>)}<li onClick={() => gotoCh('appendix')}><span className="n">附 录</span><span className="t">数据来源、口径与 AI 参与记录</span><span className="dots" /><span className="pg num">{chapters.length + 2}</span></li></ol>
                </div>

                {chapters.map((c) => (
                  <section className={`rp-chapter${c.focus ? ' focus' : ''}`} id={c.id} key={c.id}>
                    <h2><span className="cno">{c.no}</span>{c.title}{c.focus && <span className="chip red"><i />重点关注</span>}</h2>
                    {c.paras.map((p, i) => <p key={i} contentEditable={editing} suppressContentEditableWarning data-ed={`p${c.no}-${i}`}>{p}</p>)}
                    {c.blocks.map((b, i) => <BlockView b={b} cno={c.no} idx={i + 1} gid={`${gidBase}-${c.no}-${i}`} editable={editing} key={i} />)}
                  </section>
                ))}

                <section className="rp-chapter rp-appendix" id="appendix">
                  <h2><span className="cno">附</span>附录：数据来源、口径与 AI 参与记录</h2>
                  <p contentEditable={editing} suppressContentEditableWarning data-ed="ax-0">本报告引用的数据来源见下表；所有数据在行内环境处理，采用脱敏视图与只读旁路读取，不出网、不留存原件。金额单位除特别注明外均为人民币万元，比例指标保留一位小数，期间为 {run.from} 至 {run.to}。</p>
                  <div className="rp-fig"><div className="rp-cap"><b>附表 1</b>数据来源与口径</div><div className="rp-tbl-wrap"><table className="tbl rp-tbl"><thead><tr><th>数据来源</th><th>获取方式</th><th>用途</th></tr></thead><tbody>{dsList.map((d, i) => <tr key={d}><td>{d}</td><td>{['只读旁路', '客户授权', '公开渠道', '行内维护'][i % 4]}</td><td>{['指标计算与勾稽', '结构与集中度分析', '风险信号与核实', '参数与阈值'][i % 4]}</td></tr>)}{run.docs.map((d) => <tr key={d.id}><td>{d.name}</td><td>上传识别（置信度 {d.confidence}%）</td><td>提取 {d.fields} 个字段 · {d.pages} 页</td></tr>)}</tbody></table></div></div>
                  <div className="rp-fig"><div className="rp-cap"><b>附表 2</b>AI 参与记录</div><div className="rp-tbl-wrap"><table className="tbl rp-tbl"><thead><tr><th>项目</th><th>数量</th><th>说明</th></tr></thead><tbody>
                    <tr><td>AI 起草段落</td><td className="num">{paraCount} 段</td><td>由 AI 引擎依据规则计算结果组织行文，均已标注</td></tr>
                    <tr><td>人工修改</td><td className="num">{edits} 处</td><td>{edits ? `编制人 ${AUTHOR} 在编辑模式中修改，修改处标黄` : '暂无人工修改'}</td></tr>
                    <tr><td>数据表格 / 图表</td><td className="num">{tblCount} 张 / {figCount} 个</td><td>数字由前端确定性计算，图表为 SVG 渲染</td></tr>
                    <tr><td>版本</td><td className="num">{curVer}</td><td>{versions.map((v) => `${v.v} ${v.label}（${v.who}）`).join('；')}</td></tr>
                    <tr><td>复核状态</td><td>{reviewers.filter(Boolean).length}/{REVIEWERS.length}</td><td>{REVIEWERS.map((r, i) => `${r.name}${reviewers[i] ? '已确认' : '待确认'}`).join('；')}</td></tr>
                  </tbody></table></div></div>
                  <p contentEditable={editing} suppressContentEditableWarning data-ed="ax-1">声明：{fn.compliance} 本报告为{run.purpose}用途{run.purpose === '客户汇报' ? '，已隐去行内内部评价语句' : ''}，报告结论不构成对客户的承诺，最终以行内审批与授权为准。</p>
                  <div className="rp-sign"><div><span>编制人</span><b>{AUTHOR}</b></div><div><span>复核人</span><b>{reviewers[1] ? REVIEWERS[1].name : '（待签）'}</b></div><div><span>审定人</span><b>{reviewers[2] ? REVIEWERS[2].name : '（待签）'}</b></div><div><span>日期</span><b>{cn(run.at)}</b></div></div>
                </section>
              </div>
            </>
          )}
        </div>

        {/* ---------- 右侧固定栏 ---------- */}
        <aside className="rp-side">
          {phase === 'report' ? (
            <>
              <div className="card rp-nav">
                <div className="card-h"><div className="card-t"><span className="dot" />目录导航</div><span className="card-s">{chapters.length} 章</span></div>
                {chapters.map((c) => <button key={c.id} className={`it${activeCh === c.id ? ' on' : ''}`} onClick={() => gotoCh(c.id)}><span className="n">{c.no}</span><span className="t">{c.title}</span>{c.focus && <i />}</button>)}
                <button className="it" onClick={() => gotoCh('appendix')}><span className="n">附</span><span className="t">附录</span></button>
              </div>
              <div className="card rp-ver">
                <div className="card-h"><div className="card-t"><span className="dot" />版本历史</div><span className="card-s">{versions.length} 个版本</span></div>
                {versions.map((v) => <div className="v" key={v.v}><span className="tag num">{v.v}</span><div><b>{v.label}</b><small>{v.who} · {v.when} · {v.note}</small></div></div>)}
                {versions.length === 1 && <div className="card-s" style={{ marginTop: 6 }}>进入「编辑」修改正文后将自动生成 v1.1 人工修订版</div>}
              </div>
              <div className="card rp-review">
                <div className="card-h"><div className="card-t"><span className="dot" />复核状态</div><span className={`chip ${reviewers.every(Boolean) ? 'green' : 'orange'}`}><i />{reviewers.filter(Boolean).length}/{REVIEWERS.length}</span></div>
                {REVIEWERS.map((r, i) => <label key={r.name} className={reviewers[i] ? 'on' : ''}><input type="checkbox" checked={reviewers[i]} onChange={(e) => { setReviewers((x) => x.map((v, j) => (j === i ? e.target.checked : v))); if (e.target.checked) toast(`${r.name} 已确认复核`); }} /><div><b>{r.name}</b><small>{r.role}</small></div></label>)}
              </div>
              {related.length > 0 && (
                <div className="card rp-rel">
                  <div className="card-h"><div className="card-t"><span className="dot" />相关功能</div><span className="card-s">{product?.name}</span></div>
                  {related.map((f) => <Link to={`/f/${f.id}`} key={f.id}><span className="ico"><Icon name={product?.icon ?? 'Workflow'} size={13} /></span><span>{clean(f.name)}</span><small>{f.id}</small></Link>)}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card rp-outline">
                <div className="card-h"><div className="card-t"><span className="dot" />报告结构</div><span className="card-s">{outline.length} 章 + 附录</span></div>
                {outline.map((t, i) => <div className="it" key={t}><span className="n">{i + 1}</span><span className="t">{t}</span>{focus.includes(t) && <span className="chip red"><i />重点</span>}</div>)}
                <div className="it"><span className="n">附</span><span className="t">数据来源、口径与 AI 参与记录</span></div>
              </div>
              <div className="card"><div className="card-h"><div className="card-t"><span className="dot" />数据来源</div><span className="card-s">{dsList.length} 个 · 只读</span></div><div className="rp-chips">{dsList.map((d) => <span className="chip blue" key={d}><i />{d}</span>)}</div></div>
              <div className="card red"><div className="card-h"><div className="card-t"><span className="dot" />合规边界</div></div><div className="rp-comp"><div className="ico"><Icon name="ShieldCheck" size={18} /></div><p>{fn.compliance}</p></div></div>
            </>
          )}
        </aside>
      </div>

      {/* ---------- 底部固定条 ---------- */}
      <div className="rp-bar">
        <span className="ai-tag"><Icon name="Bot" size={12} /> AI 生成 · 辅助建议 · 需人工复核</span>
        <span className="status">{phase === 'report' ? <><Icon name="CircleCheck" size={13} /> 报告已生成 · {no} · {curVer}</> : phase === 'gen' ? <><span className="pulse" /> 生成中</> : '尚未生成报告'}</span>
        <span className="spacer" />
        <label className={reviewed ? 'on' : phase !== 'report' ? 'off' : ''}><input type="checkbox" checked={reviewed} disabled={phase !== 'report'} onChange={(e) => setReviewed(e.target.checked)} />复核确认：我已阅读并复核本报告</label>
        {phase === 'report' && !reviewed && <span className="hint">勾选复核确认后可导出 / 转呈</span>}
        {phase === 'report' && <div className={reviewed ? '' : 'rp-dim'}><DocActions title={`${docType} · ${run.co.name}`} getHtml={getHtml} onToast={toast} compact /></div>}
      </div>

      {showHist && (
        <div className="modal-mask" onClick={() => setShowHist(false)}>
          <div className="modal card fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="card-h"><div className="card-t"><span className="dot" />历史报告 · {docType}</div><button className="up-x" onClick={() => setShowHist(false)}><Icon name="X" size={14} /></button></div>
            <div className="card-s" style={{ marginBottom: 8 }}>近 5 份同类报告，点击载入其任务参数并重新生成。</div>
            {history.map((h) => <div className="li rp-hist" key={h.no} onClick={() => loadHist(h)}><div className="av">{h.co.name.slice(0, 1)}</div><div className="grow"><div className="t">{h.co.name} · {h.purpose}版</div><div className="s num">{h.no} · {h.when} · {h.ver}</div></div><span className={`chip ${h.tone}`}>{h.status}</span></div>)}
          </div>
        </div>
      )}
      {toastMsg && <div className="rp-toast"><span className="ico"><Icon name="CircleCheck" size={15} /></span>{toastMsg}</div>}
    </div>
  );
}
