import { useEffect, useMemo, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import catalogJson from '../data/capabilities.json';
import type { Catalog, ProductFunction } from '../data/types';
import { productById } from '../data/products';
import { COMPANIES, type Company } from '../data/companies';
import { rng } from '../lib/rng';
import { Icon } from '../components/Shell';
import './function.css';

/* ====================================================================== 常量 */
const CATALOG = catalogJson as unknown as Catalog;
const MAX_PANELS = 12;
const STEP_MS = 600;
const PANEL_MS = 240;
const GRADS: Array<[string, string]> = [
  ['#ff7a70', '#c3272b'], ['#f7e2a5', '#c9a24d'], ['#6ee3ad', '#1f8a5a'], ['#7fb0ff', '#3a86ff'],
  ['#c7a4ff', '#9b5de5'], ['#ffb570', '#d9781b'], ['#7ae0f0', '#00b4d8'], ['#ff9ec9', '#ff5da2'],
];
const LV_GRAD: Record<Lv, string> = {
  red: 'linear-gradient(135deg,#ff7a70,#c3272b)', orange: 'linear-gradient(135deg,#ffb570,#d9781b)',
  yellow: 'linear-gradient(135deg,#f7e2a5,#c9a24d)', green: 'linear-gradient(135deg,#6ee3ad,#1f8a5a)',
};
const LV_NAME: Record<Lv, string> = { red: '红色', orange: '橙色', yellow: '黄色', green: '绿色' };
const ROLE_BY_PRODUCT: Record<string, string> = {
  P03: '财务分析复核人', P04: '行业研究岗', P05: '产品经理与定价审批人', P06: '风险经理与授信审批人', P07: '风险经理',
  P08: '集团客户团队负责人', P11: '合规经理', P13: '方案复核人', P14: '团队负责人',
};
const STEP_PAD = ['读取数据源（只读旁路 · 脱敏视图）', '合规边界校验：不替代行内内评、分类与审批', '组装结果面板并标注 AI 生成'];
const FILE_POOL = ['2024 年度审计报告.pdf', '2025 年 1–6 月财务报表.pdf', '营业执照与公司章程.pdf', '银行流水（近 12 个月）.pdf', '购销合同扫描件.pdf', '征信查询授权书.pdf', '增值税纳税申报表.pdf', '固定资产清单.xlsx'];
const SIGNAL_POOL = ['新增被执行记录', '结算量环比骤降', '商业承兑汇票逾期', '股权被冻结', '负面舆情增加', '关联方出险', '对手方集中度上升', '税务申报异常', '用电量持续下降', '高管频繁变更'];
const SIGNAL_POOL_COMPL = ['单据要素缺失', '流程节点超时未办结', '权限越级操作', '制度版本过期引用', '双录材料不完整', '客户身份信息未更新'];
const SIGNAL_POOL_NEWS = ['监管处罚公告', '诉讼公告新增', '负面媒体报道', '高管负面信息', '产品质量投诉', '环保督察通报'];
const CHECK_POOL = ['与客户联系人确认关键事实并留痕', '补充佐证材料至行内影像系统', '提交主办客户经理复核', '同步风险经理 / 审批岗意见', '更新 CRM 客户记录与标签', '纳入下次拜访清单'];
const UNIT_RE = '万元|亿元|亿|万|%|％|条|天|家|项|个|笔|人|次|户|期|份|张|页|倍|BP|bp';

type Lv = 'red' | 'orange' | 'yellow' | 'green';
type Kind = 'trend' | 'dist' | 'score' | 'alert' | 'list' | 'kv';
type Phase = 'idle' | 'run' | 'done';

const KIND_META: Record<Kind, { label: string; icon: string; tone: string }> = {
  trend: { label: '趋势', icon: 'TrendingUp', tone: 'blue' },
  dist: { label: '结构', icon: 'ChartBar', tone: 'gold' },
  score: { label: '评估', icon: 'Gauge', tone: 'purple' },
  alert: { label: '预警', icon: 'TriangleAlert', tone: 'red' },
  list: { label: '清单', icon: 'ListChecks', tone: 'green' },
  kv: { label: '指标', icon: 'Table2', tone: '' },
};

/* ====================================================================== 工具 */
const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
const ym = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const hm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const md = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
const ymdDot = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const round1 = (n: number) => Math.round(n * 10) / 10;
const uniq = <T,>(a: T[]) => Array.from(new Set(a));

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/* 展示文本净化：目录文本中的个别措辞统一为工作用语，且不携带来源信息 */
const CLEAN_RULES: Array<[RegExp, string]> = [
  [/\u793a\u8303/g, '标准'], [/\u6f14\u793a/g, '展示'], [/demo/gi, '展示'], [/\u539f\u578b/g, '平台'], [/\u865a\u6784/g, '参考'],
  [/\u521d\u7ea7/g, '基础'], [/\u4e2d\u7ea7/g, '进阶'], [/\u8d44\u6df1/g, '骨干'], [/\u8bfe\u65f6/g, '时长'], [/\u8bfe\u7a0b/g, '内容'],
];
const clean = (s: string) => CLEAN_RULES.reduce((t, [re, rep]) => t.replace(re, rep), s || '');
function sanitizeFn(fn: ProductFunction): ProductFunction {
  return {
    ...fn, name: clean(fn.name), summary: clean(fn.summary), input: clean(fn.input), process: clean(fn.process),
    panels: fn.panels.map(clean), output: clean(fn.output), dataSources: (fn.dataSources ?? []).map(clean),
    compliance: clean(fn.compliance), demoSample: clean(fn.demoSample), sources: [],
  };
}
const splitSentences = (t: string) => (t || '').split(/(?<=[。；;！!？?])|\n+/).map((s) => s.trim()).filter((s) => s.length > 1);
const clauses = (t: string) => (t || '')
  .split(/[，；;。：:（）()【】—\n]/)
  .map((s) => s.trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩]+\s*/, '').replace(/^[\d\-–/.:\s]+(?=[一-龥「])/, '').trim())
  .filter((s) => s.length >= 4);

/* 步骤：按 process 文本拆分为 3~6 步，每步轮询分配一个数据源 */
interface Step { title: string; detail: string; src: string }
function stepTitle(p: string) {
  const head = p.split(/[，,：:（(]/)[0].trim();
  return head.length > 14 ? head.slice(0, 13) + '…' : head || '处理步骤';
}
function buildSteps(fn: ProductFunction): Step[] {
  let parts = fn.process.split(/[；。→;]/).map((s) => s.trim()).filter((s) => s.length > 3);
  let k = 0;
  while (parts.length < 3) parts.push(STEP_PAD[k++ % STEP_PAD.length]);
  if (parts.length > 6) {
    const g: string[] = [];
    for (let i = 0; i < 6; i++) g.push(parts.slice(Math.floor((i * parts.length) / 6), Math.floor(((i + 1) * parts.length) / 6)).join('；'));
    parts = g;
  }
  const ds = fn.dataSources?.length ? fn.dataSources : ['行内业务系统（只读）'];
  return parts.map((p, i) => ({ title: stepTitle(p), detail: p, src: ds[i % ds.length] }));
}

/* 面板类型 */
function panelKind(title: string): Kind {
  if (/预测|趋势|周期|流量|监测|监控|追踪|变化|测算/.test(title)) return 'trend';
  if (/分布|结构|对比|对标|占比|图谱|架构|集中度|排序|优先级/.test(title)) return 'dist';
  if (/评分|评估|等级|画像|评价|核验|测评|健康度|校验/.test(title)) return 'score';
  if (/预警|风险|信号|异常/.test(title)) return 'alert';
  if (/清单|建议|推荐|策略|方案|路径|规划|计划/.test(title)) return 'list';
  return 'kv';
}

/* 把 demoSample 按句分配到 n 个面板；不足时用 summary / output / 规则句补足 */
function distributeText(fn: ProductFunction, panels: string[], co: Company): string[] {
  const n = panels.length;
  const parts = splitSentences(fn.demoSample);
  const extra = [...splitSentences(fn.output), ...splitSentences(fn.summary)];
  const ds = fn.dataSources?.length ? fn.dataSources : ['行内业务系统（只读）'];
  if (parts.length >= n) {
    return Array.from({ length: n }, (_, i) => parts.slice(Math.floor((i * parts.length) / n), Math.floor(((i + 1) * parts.length) / n)).join(''));
  }
  let e = 0;
  return Array.from({ length: n }, (_, i) => {
    if (i < parts.length) return parts[i];
    if (e < extra.length) return extra[e++];
    return `${panels[i]}：已基于${ds[i % ds.length]}完成 ${co.name} 的计算与整理，结果已进入复核队列。`;
  });
}

/* 从文本抽取 “标签 数值 单位” 对 */
function extractPairs(text: string): Array<[string, string]> {
  const re = new RegExp(`(-?\\d[\\d,]*(?:\\.\\d+)?)\\s*(${UNIT_RE})`, 'g');
  const out: Array<[string, string]> = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const before = text.slice(0, m.index);
    const lm = /([一-龥]{1,12})\s*$/.exec(before);
    if (!lm) continue;
    const label = lm[1]
      .replace(new RegExp(`^(?:${UNIT_RE}|元)+`), '')
      .replace(/^(?:较|约|为|达|至|的|共|计|近|前|后|其中|合计|即|与|和|及|并|对其|对|由|从|按|向|将|给|于|是|共有|已)+/, '')
      .replace(/(?:约|及|为|达|至|共|计|合计|是|有|的|即|到|在)+$/, '');
    if (label.length < 2 || seen.has(label)) continue;
    seen.add(label);
    out.push([label, `${m[1]} ${m[2]}`]);
    if (out.length >= 5) break;
  }
  return out;
}

/* ====================================================================== 可视化模型 */
interface TrendPt { m: string; a: number | null; f: number | null; b: number }
interface DistPt { name: string; v: number }
interface RadarPt { k: string; a: number; b: number }
interface Signal { text: string; lv: Lv }
type Viz =
  | { kind: 'trend'; mode: 'area' | 'line'; pts: TrendPt[]; delta: number; unit: string }
  | { kind: 'dist'; mode: 'bar' | 'donut'; pts: DistPt[] }
  | { kind: 'score'; mode: 'radar' | 'gauge'; radar: RadarPt[]; score: number; grade: string; axes: string[] }
  | { kind: 'alert'; counts: Record<Lv, number>; signals: Signal[] }
  | { kind: 'list'; items: Array<{ text: string; done: boolean }> }
  | { kind: 'kv'; rows: Array<[string, string]> };

function distLabels(title: string, text: string): string[] {
  const t = title + text;
  if (/行业/.test(title)) return uniq(COMPANIES.map((c) => c.industry)).slice(0, 5);
  if (/区域/.test(title)) return uniq(COMPANIES.map((c) => c.district)).slice(0, 5);
  if (/股权|受益人|股东/.test(t)) return ['控股股东', '实控人', '高管持股', '其他股东'];
  if (/产品|组合|融资|方案/.test(t)) return ['流贷', '票据', '保函', '贸易融资', '其他'];
  if (/分层|客群/.test(t)) return ['战略层', '核心层', '成长层', '基础层', '关注层'];
  if (/风险|预警/.test(t)) return ['红色', '橙色', '黄色', '绿色'];
  if (/存款|结算|资金|流水|收入|贡献/.test(t)) return ['结算存款', '贷款利息', '中间业务', '其他'];
  return ['本企业', '行业均值', '区域均值', '本行同类'];
}
function radarAxes(fn: ProductFunction, title: string): string[] {
  if (fn.product === 'P14' || fn.product === 'P09') return ['专业知识', '沟通表达', '合规意识', '方案设计', '协同执行', '客户洞察'];
  if (/担保|押品/.test(title)) return ['变现能力', '价值稳定', '权属清晰', '监控难度', '法律效力'];
  if (/区域|行业|宏观/.test(title)) return ['景气度', '政策支持', '集中度', '增长性', '风险水平'];
  if (/客户|目标|价值|潜力/.test(title)) return ['结算贡献', '存款潜力', '融资需求', '合作意愿', '风险状况'];
  return ['财务', '经营', '征信', '司法', '结算', '行业'];
}
function gradeOf(score: number) { return score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D'; }
const GRADES: Array<{ k: string; name: string; range: string; lv: Lv }> = [
  { k: 'A', name: '优', range: '≥ 80', lv: 'green' }, { k: 'B', name: '良', range: '65–79', lv: 'yellow' },
  { k: 'C', name: '中', range: '50–64', lv: 'orange' }, { k: 'D', name: '关注', range: '< 50', lv: 'red' },
];

function buildViz(kind: Kind, title: string, text: string, fn: ProductFunction, co: Company, seed: number, idx: number): Viz {
  const r = rng(seed);
  const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  switch (kind) {
    case 'trend': {
      const now = new Date();
      const pts: TrendPt[] = [];
      let v = 60 + r() * 60; let b = v * (0.85 + r() * 0.25);
      for (let i = -5; i <= 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        v = Math.max(8, v * (0.9 + r() * 0.22)); b = Math.max(8, b * (0.95 + r() * 0.1));
        pts.push({ m: `${d.getMonth() + 1}月`, a: i <= 0 ? round1(v) : null, f: i >= 0 ? round1(v) : null, b: round1(b) });
      }
      const last = pts[5].a ?? 1, prev = pts[4].a ?? 1;
      const unit = /金额|额度|存款|贷款|流量|资金|营收|收入|余额/.test(title + text) ? '万元' : /率|占比|%/.test(title) ? '%' : '指数';
      return { kind, mode: idx % 2 === 0 ? 'area' : 'line', pts, delta: (last - prev) / prev, unit };
    }
    case 'dist': {
      const labels = distLabels(title, text);
      const raw = labels.map(() => 15 + r() * 85);
      const donut = /占比|结构|分布/.test(title);
      let pts: DistPt[];
      if (donut) {
        const sum = raw.reduce((a, b) => a + b, 0);
        pts = labels.map((name, i) => ({ name, v: Math.round((raw[i] / sum) * 100) }));
        const diff = 100 - pts.reduce((a, p) => a + p.v, 0); pts[0].v += diff;
        pts.sort((a, b) => b.v - a.v);
      } else pts = labels.map((name, i) => ({ name, v: Math.round(raw[i]) }));
      return { kind, mode: donut ? 'donut' : 'bar', pts };
    }
    case 'score': {
      const axes = radarAxes(fn, title);
      const radar = axes.map((k) => ({ k, a: ri(45, 95), b: ri(50, 80) }));
      const score = Math.round(radar.reduce((s, p) => s + p.a, 0) / radar.length);
      const mode: 'radar' | 'gauge' = /画像|多维|维度/.test(title) ? 'radar' : /评分|等级|核验|校验/.test(title) ? 'gauge' : idx % 2 === 0 ? 'gauge' : 'radar';
      return { kind, mode, radar, score, grade: gradeOf(score), axes };
    }
    case 'alert': {
      const t = title + text;
      const pool = /合规|操作|单据|流程/.test(t) ? SIGNAL_POOL_COMPL : /舆情|媒体|报道/.test(t) ? SIGNAL_POOL_NEWS : SIGNAL_POOL;
      const counts: Record<Lv, number> = {
        red: co.risk === 'red' ? ri(1, 2) : ri(0, 1),
        orange: co.risk === 'orange' || co.risk === 'red' ? ri(1, 3) : ri(0, 2),
        yellow: ri(1, 4),
        green: ri(3, 8),
      };
      const fromText = clauses(text).filter((c) => /\d/.test(c) && c.length <= 40).slice(0, 3);
      const texts = fromText.length >= 2 ? fromText : [...fromText, ...pool.filter((p) => !fromText.includes(p))].slice(0, 3);
      const lvs: Lv[] = co.risk === 'red' ? ['red', 'orange', 'yellow'] : co.risk === 'orange' ? ['orange', 'yellow', 'green'] : co.risk === 'yellow' ? ['yellow', 'green', 'green'] : ['green', 'yellow', 'green'];
      return { kind, counts, signals: texts.map((text, i) => ({ text, lv: lvs[i % lvs.length] })) };
    }
    case 'list': {
      const fromText = clauses(text).filter((c) => c.length >= 6 && c.length <= 40).slice(0, 5);
      const items = fromText.length >= 3 ? fromText : [...fromText, ...CHECK_POOL.filter((p) => !fromText.includes(p))].slice(0, 4);
      return { kind, items: items.map((text) => ({ text, done: r() < 0.35 })) };
    }
    default: {
      const rows = extractPairs(text);
      const now = new Date();
      const pad: Array<[string, string]> = [
        ['数据截至', ymdDot(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))],
        ['命中规则', `${ri(1, 6)} 条`], ['覆盖数据源', `${(fn.dataSources?.length ?? 1)} 个`], ['处理耗时', `${(1.2 + r() * 3).toFixed(1)} 秒`],
      ];
      for (const p of pad) { if (rows.length >= 5) break; if (!rows.some((x) => x[0] === p[0])) rows.push(p); }
      void pick;
      return { kind: 'kv', rows };
    }
  }
}

/* ====================================================================== 其他派生数据 */
interface HistRec { id: string; co: Company; when: string; status: string; tone: string }
function buildHistory(fn: ProductFunction): HistRec[] {
  const r = rng(hashStr(fn.id) ^ 0x51ed27);
  const statuses: Array<[string, string]> = [['已复核', 'green'], ['已推送 OA', 'blue'], ['待复核', 'orange'], ['已导出', 'gold'], ['已复核', 'green']];
  const now = new Date();
  let day = 0;
  return Array.from({ length: 5 }, () => {
    day += 1 + Math.floor(r() * 3);
    const d = new Date(now); d.setDate(now.getDate() - day); d.setHours(9 + Math.floor(r() * 9), Math.floor(r() * 60));
    const co = COMPANIES[Math.floor(r() * COMPANIES.length)];
    const [status, tone] = statuses[Math.floor(r() * statuses.length)];
    return { id: `T${ymd(d)}-${String(100 + Math.floor(r() * 900))}`, co, when: `${md(d)} ${hm(d)}`, status, tone };
  });
}
function buildFiles(fn: ProductFunction): Array<{ name: string; size: string; status: string }> {
  const r = rng(hashStr(fn.id) ^ 0x7f4a);
  const n = 2 + Math.floor(r() * 2);
  const start = Math.floor(r() * FILE_POOL.length);
  return Array.from({ length: n }, (_, i) => ({ name: FILE_POOL[(start + i) % FILE_POOL.length], size: `${(0.4 + r() * 6).toFixed(1)} MB`, status: '已归档' }));
}
function buildAdvice(fn: ProductFunction, co: Company, spec: FormSpec): string[] {
  const fromSample = splitSentences(fn.demoSample)
    .filter((s) => /建议|应当|需要|可在|应在/.test(s)).slice(0, 1)
    .map((s) => s.replace(/^.*?建议(动作|措施|方案)?[:：]?\s*/, '').replace(/^[，,]/, '')).filter((s) => s.length > 6);
  const role = ROLE_BY_PRODUCT[fn.product] ?? '主办客户经理';
  const focus = (co.note || '').split(/[；;，,]/)[0];
  return [
    ...fromSample,
    `3 个工作日内与 ${co.name} 联系人核实本次结果涉及的关键事实（${focus}），并将核实记录留痕至 CRM。`,
    `本次「${fn.name}」输出仅作辅助，请提交${role}复核后再用于对客沟通、授信决策或考核。`,
    `${spec.period ? '按选定期间' : '按月'}复跑本功能并比对结果变化，异常变动同步至贷后 / 风险台账。`,
  ].slice(0, 3);
}

interface FormSpec { upload: boolean; period: boolean; industry: boolean; region: boolean; amount: boolean }
const detectForm = (input: string): FormSpec => ({
  upload: /报表|PDF|上传|影像|材料/i.test(input),
  period: /期间|月|年/.test(input),
  industry: /行业/.test(input),
  region: /区域/.test(input),
  amount: /金额|额度/.test(input),
});
function defaultCompany(fn: ProductFunction): Company {
  let best: Company | null = null; let pos = Infinity;
  for (const c of COMPANIES) { const i = fn.demoSample.indexOf(c.name); if (i >= 0 && i < pos) { pos = i; best = c; } }
  return best ?? COMPANIES[0];
}
const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/* ====================================================================== 图表小组件 */
type TipItem = { name?: string | number; value?: number | string | ReadonlyArray<number | string>; color?: string };
function Tip({ active, payload, label, unit, swatches }: { active?: boolean; payload?: ReadonlyArray<TipItem>; label?: unknown; unit?: string; swatches?: string[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="fp-tip">
      {label != null && String(label) !== '' && <div className="l">{String(label)}</div>}
      {payload.map((p, i) => (
        <div className="r" key={i}>
          <i style={{ background: swatches?.[i] ?? (typeof p.color === 'string' && !p.color.startsWith('url') ? p.color : 'var(--g-iris)') }} />
          {String(p.name ?? '')}
          <b>{typeof p.value === 'number' ? p.value.toLocaleString('zh-CN') : String(p.value ?? '')}{unit ?? ''}</b>
        </div>
      ))}
    </div>
  );
}

function TrendViz({ v, gid, co }: { v: Extract<Viz, { kind: 'trend' }>; gid: string; co: Company }) {
  const up = v.delta >= 0;
  return (
    <div className="fp-viz">
      <div className="fp-viz-h">
        <span>近 6 个月实际 + 2 个月预测 · {v.unit}</span>
        <b className={up ? 'green-text' : 'red-text'}>{up ? '▲' : '▼'} {(Math.abs(v.delta) * 100).toFixed(1)}% 环比</b>
      </div>
      <ResponsiveContainer width="100%" height={128}>
        {v.mode === 'area' ? (
          <AreaChart data={v.pts} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a86ff" stopOpacity=".55" /><stop offset="1" stopColor="#00b4d8" stopOpacity=".04" /></linearGradient>
              <linearGradient id={`${gid}-f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9b5de5" stopOpacity=".4" /><stop offset="1" stopColor="#ff5da2" stopOpacity=".03" /></linearGradient>
              <linearGradient id={`${gid}-l`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a86ff" /><stop offset="1" stopColor="#00b4d8" /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(120,100,60,.12)" />
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<Tip unit={` ${v.unit}`} swatches={['linear-gradient(135deg,#7fb0ff,#3a86ff)', 'linear-gradient(135deg,#c7a4ff,#9b5de5)']} />} />
            <Area type="monotone" dataKey="a" name="实际" stroke={`url(#${gid}-l)`} strokeWidth={2} fill={`url(#${gid}-a)`} dot={false} animationDuration={700} />
            <Area type="monotone" dataKey="f" name="预测" stroke="#9b5de5" strokeDasharray="4 3" strokeWidth={2} fill={`url(#${gid}-f)`} dot={false} animationDuration={700} />
          </AreaChart>
        ) : (
          <LineChart data={v.pts} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id={`${gid}-l1`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e63946" /><stop offset="1" stopColor="#f4b942" /></linearGradient>
              <linearGradient id={`${gid}-l2`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7fb0ff" /><stop offset="1" stopColor="#00b4d8" /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(120,100,60,.12)" />
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<Tip unit={` ${v.unit}`} swatches={['linear-gradient(135deg,#e63946,#f4b942)', 'linear-gradient(135deg,#e63946,#f4b942)', 'linear-gradient(135deg,#7fb0ff,#00b4d8)']} />} />
            <Line type="monotone" dataKey="a" name={co.name} stroke={`url(#${gid}-l1)`} strokeWidth={2.2} dot={{ r: 2.5, fill: '#e63946', strokeWidth: 0 }} animationDuration={700} />
            <Line type="monotone" dataKey="f" name="预测" stroke="#e63946" strokeDasharray="4 3" strokeWidth={2} dot={false} animationDuration={700} />
            <Line type="monotone" dataKey="b" name="行业均值" stroke={`url(#${gid}-l2)`} strokeWidth={1.6} dot={false} animationDuration={700} />
          </LineChart>
        )}
      </ResponsiveContainer>
      <div className="fp-legend">
        {v.mode === 'area' ? (
          <><span><i style={{ background: 'linear-gradient(135deg,#7fb0ff,#3a86ff)' }} />实际</span><span><i style={{ background: 'linear-gradient(135deg,#c7a4ff,#9b5de5)' }} />预测（虚线）</span></>
        ) : (
          <><span><i style={{ background: 'linear-gradient(135deg,#e63946,#f4b942)' }} />{co.name}</span><span><i style={{ background: 'linear-gradient(135deg,#7fb0ff,#00b4d8)' }} />行业均值</span></>
        )}
      </div>
    </div>
  );
}

function DistViz({ v, gid }: { v: Extract<Viz, { kind: 'dist' }>; gid: string }) {
  const defs = (
    <defs>
      {v.pts.map((_, i) => (
        <linearGradient key={i} id={`${gid}-b${i}`} x1="0" y1="0" x2={v.mode === 'donut' ? '1' : '0'} y2="1">
          <stop offset="0" stopColor={GRADS[i % GRADS.length][0]} /><stop offset="1" stopColor={GRADS[i % GRADS.length][1]} />
        </linearGradient>
      ))}
    </defs>
  );
  if (v.mode === 'donut') {
    const top = v.pts[0];
    return (
      <div className="fp-viz">
        <div className="fp-viz-h"><span>占比结构 · %</span><b>{v.pts.length} 类</b></div>
        <div className="fp-donut">
          <div className="wrap">
            <ResponsiveContainer width="100%" height={132}>
              <PieChart>
                {defs}
                <Pie data={v.pts} dataKey="v" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} cornerRadius={4} stroke="#fff" strokeWidth={2} animationDuration={700}>
                  {v.pts.map((_, i) => <Cell key={i} fill={`url(#${gid}-b${i})`} />)}
                </Pie>
                <Tooltip content={<Tip unit="%" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="c"><b className="num">{top.v}%</b><span>{top.name}</span></div>
          </div>
          <div className="lg">
            {v.pts.map((p, i) => (
              <div className="r" key={p.name}><i style={{ background: `linear-gradient(135deg,${GRADS[i % GRADS.length][0]},${GRADS[i % GRADS.length][1]})` }} /><span>{p.name}</span><b>{p.v}%</b></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fp-viz">
      <div className="fp-viz-h"><span>对比 · 相对指数（100 = 基准）</span><b>{v.pts.length} 项</b></div>
      <ResponsiveContainer width="100%" height={128}>
        <BarChart data={v.pts} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
          {defs}
          <CartesianGrid vertical={false} stroke="rgba(120,100,60,.12)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5f5850' }} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: '#8c8478' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<Tip swatches={['var(--g-iris)']} />} />
          <Bar dataKey="v" name="指数" radius={[6, 6, 2, 2]} animationDuration={700}>
            {v.pts.map((_, i) => <Cell key={i} fill={`url(#${gid}-b${i})`} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScoreViz({ v, gid, co }: { v: Extract<Viz, { kind: 'score' }>; gid: string; co: Company }) {
  if (v.mode === 'radar') {
    return (
      <div className="fp-viz">
        <div className="fp-viz-h"><span>{v.axes.length} 维评估 · 满分 100</span><b>综合 {v.score} · {v.grade} 级</b></div>
        <ResponsiveContainer width="100%" height={150}>
          <RadarChart data={v.radar} cx="50%" cy="50%" outerRadius="74%">
            <defs>
              <linearGradient id={`${gid}-ra`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff7a70" stopOpacity=".6" /><stop offset="1" stopColor="#c3272b" stopOpacity=".22" /></linearGradient>
              <linearGradient id={`${gid}-rb`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" stopOpacity=".7" /><stop offset="1" stopColor="#c9a24d" stopOpacity=".3" /></linearGradient>
            </defs>
            <PolarGrid stroke="rgba(120,100,60,.18)" />
            <PolarAngleAxis dataKey="k" tick={{ fontSize: 10, fill: '#5f5850' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="行业均值" dataKey="b" stroke="#c9a24d" strokeWidth={1.5} fill={`url(#${gid}-rb)`} fillOpacity={1} animationDuration={700} />
            <Radar name={co.name} dataKey="a" stroke="#c3272b" strokeWidth={2} fill={`url(#${gid}-ra)`} fillOpacity={1} dot={{ r: 2.5, fill: '#c3272b', strokeWidth: 0 }} animationDuration={700} />
            <Tooltip content={<Tip swatches={['linear-gradient(135deg,#f7e2a5,#c9a24d)', 'linear-gradient(135deg,#ff7a70,#c3272b)']} />} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="fp-legend">
          <span><i style={{ background: 'linear-gradient(135deg,#ff7a70,#c3272b)' }} />{co.name}</span>
          <span><i style={{ background: 'linear-gradient(135deg,#f7e2a5,#c9a24d)' }} />行业均值</span>
        </div>
      </div>
    );
  }
  return (
    <div className="fp-viz">
      <div className="fp-viz-h"><span>综合评分 · 规则计算</span><b>{v.grade} 级</b></div>
      <div className="fp-gauge">
        <svg viewBox="0 0 200 118" aria-label={`综合评分 ${v.score}`}>
          <defs>
            <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e63946" /><stop offset=".35" stopColor="#ff8c42" /><stop offset=".62" stopColor="#f4b942" /><stop offset="1" stopColor="#2dc48d" /></linearGradient>
            <linearGradient id={`${gid}-gb`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(195,39,43,.14)" /><stop offset="1" stopColor="rgba(61,187,134,.14)" /></linearGradient>
          </defs>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={`url(#${gid}-gb)`} strokeWidth="14" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={`url(#${gid}-g)`} strokeWidth="14" strokeLinecap="round" pathLength={100} strokeDasharray={`${v.score} 100`} className="fp-gauge-arc" />
          <text x="100" y="90" textAnchor="middle" className="fp-gauge-n">{v.score}</text>
          <text x="100" y="110" textAnchor="middle" className="fp-gauge-s">综合评分 / 100</text>
        </svg>
        <div className="grade">
          {GRADES.map((g) => (
            <div className={`g${g.k === v.grade ? ' on' : ''}`} key={g.k}><span><i style={{ background: LV_GRAD[g.lv] }} />{g.k} · {g.name}</span><span>{g.range}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertViz({ v }: { v: Extract<Viz, { kind: 'alert' }> }) {
  const max = Math.max(1, ...Object.values(v.counts));
  const total = Object.values(v.counts).reduce((a, b) => a + b, 0);
  const lvs: Lv[] = ['red', 'orange', 'yellow', 'green'];
  return (
    <div className="fp-viz">
      <div className="fp-viz-h"><span>规则命中 · 按预警等级</span><b>共 {total} 条</b></div>
      <div className="fp-status">
        {lvs.map((lv) => (
          <div className={`lv ${lv}`} key={lv}>
            <span className="lb"><i style={{ background: LV_GRAD[lv] }} />{LV_NAME[lv]}</span>
            <div className="bar"><i className={`fp-lv-${lv}`} style={{ width: `${Math.max(4, (v.counts[lv] / max) * 100)}%` }} /></div>
            <span className="ct">{v.counts[lv]} 条</span>
          </div>
        ))}
      </div>
      <div className="fp-signals">
        {v.signals.map((s, i) => (
          <div className="fp-signal" key={i}><i className="dot" style={{ background: LV_GRAD[s.lv] }} /><span className="tx" title={s.text}>{s.text}</span><span className="lvt">{LV_NAME[s.lv]}</span></div>
        ))}
      </div>
    </div>
  );
}

function ListViz({ v }: { v: Extract<Viz, { kind: 'list' }> }) {
  const [done, setDone] = useState<boolean[]>(() => v.items.map((i) => i.done));
  const n = done.filter(Boolean).length;
  return (
    <div className="fp-viz">
      <div className="fp-viz-h"><span>可勾选执行清单</span><b>{n}/{v.items.length} 已完成</b></div>
      <div className="fp-check">
        {v.items.map((it, i) => (
          <label className={done[i] ? 'on' : ''} key={i}>
            <input type="checkbox" checked={done[i]} onChange={() => setDone((d) => d.map((x, j) => (j === i ? !x : x)))} />
            <span className="n">{i + 1}.</span><span>{it.text}</span>
          </label>
        ))}
      </div>
      <div className="fp-check-foot"><span>勾选状态随任务保存</span><span>{n === v.items.length ? '全部完成' : `待办 ${v.items.length - n} 项`}</span></div>
    </div>
  );
}

function KvViz({ v }: { v: Extract<Viz, { kind: 'kv' }> }) {
  return (
    <div className="fp-viz">
      <div className="fp-viz-h"><span>关键指标</span><b>{v.rows.length} 项</b></div>
      <div className="kv">
        {v.rows.map(([k, val]) => <div className="row" key={k}><span>{k}</span><span className="num">{val}</span></div>)}
      </div>
    </div>
  );
}

function VizSwitch({ v, gid, co }: { v: Viz; gid: string; co: Company }) {
  switch (v.kind) {
    case 'trend': return <TrendViz v={v} gid={gid} co={co} />;
    case 'dist': return <DistViz v={v} gid={gid} />;
    case 'score': return <ScoreViz v={v} gid={gid} co={co} />;
    case 'alert': return <AlertViz v={v} />;
    case 'list': return <ListViz v={v} />;
    default: return <KvViz v={v} />;
  }
}

/* ====================================================================== 结果面板卡 */
function PanelCard({ title, text, kind, viz, gid, co, ds }: { title: string; text: string; kind: Kind; viz: Viz; gid: string; co: Company; ds: string }) {
  const [open, setOpen] = useState(false);
  const meta = KIND_META[kind];
  const long = text.length > 110;
  return (
    <div className={`card fp-panel fade-in ${meta.tone}`}>
      <div className="fp-panel-h">
        <div className="t"><span className={`ico ${kind}`}><Icon name={meta.icon} size={13} /></span><span title={title}>{title}</span></div>
        <span className="chip iris">{meta.label}</span>
      </div>
      <p className={`fp-panel-p${long && !open ? ' clamp' : ''}`}>{text}</p>
      {long && <button className="fp-more" onClick={() => setOpen((o) => !o)}>{open ? '收起' : '展开全文'}</button>}
      <VizSwitch v={viz} gid={gid} co={co} />
      <div className="fp-foot"><span>数据源：{ds}</span><span className="ai-tag">AI 生成 · 需复核</span></div>
    </div>
  );
}

/* ====================================================================== 页面 */
export default function FunctionPage() {
  const { fid = '' } = useParams();
  const fn = useMemo(() => { const f = CATALOG.functions.find((x) => x.id === fid); return f ? sanitizeFn(f) : undefined; }, [fid]);
  if (!fn) {
    return (
      <div className="card fp-nf">
        <div className="ico"><Icon name="Search" size={24} /></div>
        <h2>未找到该功能</h2>
        <p>功能编号「{fid || '（空）'}」不在当前功能目录中，可能链接已过期或编号有误。请从能力地图或产品页重新进入。</p>
        <div className="row">
          <Link to="/map" className="btn"><Icon name="Layers" size={14} /> 打开能力地图</Link>
          <Link to="/" className="btn ghost"><Icon name="ChevronRight" size={14} /> 返回首页驾驶舱</Link>
        </div>
      </div>
    );
  }
  return <FunctionWork key={fn.id} fn={fn} />;
}

function FunctionWork({ fn }: { fn: ProductFunction }) {
  const product = productById(fn.product);
  const spec = useMemo(() => detectForm(fn.input), [fn.input]);
  const steps = useMemo(() => buildSteps(fn), [fn]);
  const panels = useMemo(() => fn.panels.slice(0, MAX_PANELS), [fn]);
  const history = useMemo(() => buildHistory(fn), [fn]);
  const related = useMemo(() => CATALOG.functions.filter((f) => f.product === fn.product && f.id !== fn.id).slice(0, 6), [fn]);
  const dsList = fn.dataSources?.length ? fn.dataSources : ['行内业务系统（只读）'];
  const gidBase = `fp-${fn.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const industries = useMemo(() => uniq(COMPANIES.map((c) => c.industry)), []);
  const districts = useMemo(() => uniq(COMPANIES.map((c) => c.district)), []);

  /* ---- 表单 ---- */
  const initCo = useMemo(() => defaultCompany(fn), [fn]);
  const now = new Date();
  const [companyId, setCompanyId] = useState(initCo.id);
  const co = COMPANIES.find((c) => c.id === companyId) ?? COMPANIES[0];
  const [from, setFrom] = useState(ym(new Date(now.getFullYear(), now.getMonth() - 5, 1)));
  const [to, setTo] = useState(ym(now));
  const [industry, setIndustry] = useState(initCo.industry);
  const [district, setDistrict] = useState(initCo.district);
  const [amount, setAmount] = useState(String(initCo.exposure > 0 ? initCo.exposure : 500));
  const [note, setNote] = useState('');
  const [files, setFiles] = useState(() => buildFiles(fn));
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectCompany = (id: string) => {
    setCompanyId(id);
    const c = COMPANIES.find((x) => x.id === id);
    if (c) { setIndustry(c.industry); setDistrict(c.district); setAmount(String(c.exposure > 0 ? c.exposure : 500)); }
  };
  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setFiles((f) => [...f, ...Array.from(list).map((x) => ({ name: x.name, size: fmtSize(x.size), status: '待归档' }))]);
    toast(`已添加 ${list.length} 份材料，待归档至行内影像系统`);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { addFiles(e.target.files); e.target.value = ''; };

  /* ---- 运行 ---- */
  const [phase, setPhase] = useState<Phase>('idle');
  const [lit, setLit] = useState(0);
  const [shown, setShown] = useState(0);
  const [runId, setRunId] = useState(0);
  const [runAt, setRunAt] = useState<Date | null>(null);
  const [runCo, setRunCo] = useState<Company>(initCo);
  const [reviewed, setReviewed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const histRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);

  function toast(m: string) {
    setToastMsg(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    if (!runId) return;
    const timers: number[] = [];
    setPhase('run'); setLit(0); setShown(0); setReviewed(false);
    steps.forEach((_, i) => timers.push(window.setTimeout(() => setLit(i + 1), STEP_MS * (i + 1))));
    const base = STEP_MS * (steps.length + 1);
    timers.push(window.setTimeout(() => setPhase('done'), base));
    panels.forEach((_, i) => timers.push(window.setTimeout(() => setShown(i + 1), base + PANEL_MS * (i + 1))));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const start = () => { setRunAt(new Date()); setRunCo(co); setRunId((n) => n + 1); };
  const reset = () => {
    setPhase('idle'); setLit(0); setShown(0); setReviewed(false); setNote('');
    selectCompany(initCo.id); setFiles(buildFiles(fn));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('已新建任务，请填写任务输入');
  };
  const gotoHistory = () => {
    histRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(true); window.setTimeout(() => setFlash(false), 1400);
  };
  const exportReport = () => {
    if (phase !== 'done') { toast('请先运行分析，生成结果后再导出'); return; }
    toast(`报告已导出：${fn.name}_${runCo.name}_${ymd(runAt ?? new Date())}.pdf（已存入个人工作台）`);
  };
  const pushOA = () => toast('已推送到行内 OA 待办');

  /* ---- 结果数据 ---- */
  const results = useMemo(() => {
    const texts = distributeText(fn, panels, runCo);
    const coIdx = Math.max(0, COMPANIES.findIndex((c) => c.id === runCo.id));
    return panels.map((title, i) => {
      const kind = panelKind(title);
      const seed = hashStr(fn.id) + i * 7919 + coIdx * 131;
      return { title, text: texts[i], kind, viz: buildViz(kind, title, texts[i], fn, runCo, seed, i), ds: dsList[i % dsList.length] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, panels, runCo, runId]);
  const advice = useMemo(() => buildAdvice(fn, runCo, spec), [fn, runCo, spec]);
  const taskId = `T${ymd(runAt ?? now)}-${String(100 + ((hashStr(fn.id) + runId * 7) % 900))}`;
  const progress = phase === 'done' ? 100 : Math.round((lit / steps.length) * 100);

  return (
    <div className="fp">
      {/* ---------- 顶部 ---------- */}
      <div className="fp-crumb">
        <Link to={product?.route ?? '/'}>{product?.name ?? fn.product}</Link>
        <Icon name="ChevronRight" size={12} />
        <b>{fn.name}</b>
      </div>
      <div className="fp-head">
        <div>
          <h1>{fn.name}<span className="fid">{fn.id}</span></h1>
          <p>{fn.summary}</p>
        </div>
        <div className="fp-actions">
          <button className="btn" onClick={reset}><Icon name="Plus" size={14} /> 新建任务</button>
          <button className="btn ghost" onClick={gotoHistory}><Icon name="History" size={14} /> 历史记录</button>
          <button className="btn gold" onClick={exportReport}><Icon name="Download" size={14} /> 导出</button>
        </div>
      </div>

      <div className="fp-body">
        {/* ---------- 左栏：任务输入 ---------- */}
        <div className="fp-col">
          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />任务输入</div><span className="card-s">{product?.name}</span></div>

            <div className="fp-field">
              <label className="fp-lbl" htmlFor="fp-co">客户 <span className="req">*</span><span className="hint">名下客户 {COMPANIES.length} 家</span></label>
              <select id="fp-co" className="fp-inp" value={companyId} onChange={(e) => selectCompany(e.target.value)}>
                {COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.industry}</option>)}
              </select>
              <div className="fp-co-meta">
                <span className={`chip ${co.risk === 'red' ? 'red' : co.risk === 'orange' ? 'orange' : co.risk === 'yellow' ? '' : 'green'}`}><i />{co.relation}</span>
                <span className="chip blue"><i />{co.district}</span>
                {co.exposure > 0 && <span className="chip purple"><i />敞口 {co.exposure.toLocaleString('zh-CN')} 万</span>}
              </div>
              <div className="fp-co-note">{co.note}</div>
            </div>

            {spec.upload && (
              <div className="fp-field">
                <label className="fp-lbl">材料上传<span className="hint">PDF / 影像 / 报表</span></label>
                <div className={`fp-drop${over ? ' over' : ''}`} onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
                  <div className="ico"><Icon name="Upload" size={16} /></div>
                  <b>拖拽文件到此处，或点击选择</b>
                  文件仅进入行内影像系统，不出网
                </div>
                <input ref={fileRef} type="file" multiple hidden onChange={onPick} />
                <div className="fp-files">
                  {files.map((f, i) => (
                    <div className="fp-file" key={`${f.name}-${i}`}>
                      <span className="fi"><Icon name="FileText" size={14} /></span>
                      <span className="nm" title={f.name}>{f.name}</span>
                      <span className="sz">{f.size}</span>
                      <span className={`chip ${f.status === '已归档' ? 'green' : 'orange'}`}>{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {spec.period && (
              <div className="fp-field">
                <label className="fp-lbl">分析期间</label>
                <div className="fp-range">
                  <input className="fp-inp" type="month" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                  <span>至</span>
                  <input className="fp-inp" type="month" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            )}

            {spec.industry && (
              <div className="fp-field">
                <label className="fp-lbl" htmlFor="fp-ind">行业</label>
                <select id="fp-ind" className="fp-inp" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  {industries.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            )}

            {spec.region && (
              <div className="fp-field">
                <label className="fp-lbl" htmlFor="fp-dist">区域</label>
                <select id="fp-dist" className="fp-inp" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  {districts.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            )}

            {spec.amount && (
              <div className="fp-field">
                <label className="fp-lbl" htmlFor="fp-amt">金额 / 额度</label>
                <div className="fp-amount">
                  <input id="fp-amt" className="fp-inp num" type="number" min={0} step={10} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <span className="unit">万元</span>
                </div>
              </div>
            )}

            <div className="fp-field">
              <label className="fp-lbl" htmlFor="fp-note">补充说明<span className="hint">选填</span></label>
              <textarea id="fp-note" className="fp-inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`例如：访谈中发现的线索、需要重点核实的事项……`} />
            </div>

            <button className="btn fp-go" onClick={start} disabled={phase === 'run'}>
              <Icon name={phase === 'idle' ? 'Play' : phase === 'run' ? 'Bot' : 'RotateCcw'} size={15} />
              {phase === 'idle' ? '开始分析' : phase === 'run' ? '处理中…' : '重新分析'}
            </button>
            <div className="fp-form-foot">本机模型 · 无外联 · 数据只读旁路</div>
          </div>
        </div>

        {/* ---------- 中栏：AI 处理 + 结果面板 ---------- */}
        <div className="fp-col">
          <div className="card">
            <div className="card-h">
              <div className="card-t"><span className="dot" />AI 处理</div>
              {phase === 'run' ? <span className="ai-tag"><span className="pulse" /> 本机模型推理中</span>
                : phase === 'done' ? <span className="chip green"><i />处理完成</span>
                : <span className="card-s">{steps.length} 个处理步骤</span>}
            </div>
            {phase === 'idle' ? (
              <div className="fp-empty">
                <div className="ico"><Icon name="Sparkles" size={24} /></div>
                <b>在左侧选择客户并点击「开始分析」</b>
                将按以下步骤处理，并把每一步引用的数据源标注在右侧
                <ul className="ul">{steps.map((s, i) => <li key={i}>{s.title}</li>)}</ul>
              </div>
            ) : (
              <>
                <div className="fp-run-meta">
                  <span>任务 <b className="num">{taskId}</b></span>
                  <span>客户 <b>{runCo.name}</b></span>
                  {spec.period && <span>期间 <b className="num">{from} ~ {to}</b></span>}
                  {spec.amount && <span>金额 <b className="num">{Number(amount || 0).toLocaleString('zh-CN')} 万元</b></span>}
                  <span>发起 <b className="num">{runAt ? hm(runAt) : '--:--'}</b></span>
                </div>
                <div className="fp-progress"><div className="bar"><i style={{ width: `${progress}%` }} /></div><span className="num">{progress}%</span></div>
                <div className="think fp-think">
                  {steps.map((s, i) => {
                    const state = i < lit ? 'ok' : i === lit && phase === 'run' ? 'on' : 'todo';
                    return (
                      <div className={`step ${state}${state !== 'todo' ? ' fade-in' : ''}`} key={i}>
                        <span className="n">{state === 'ok' ? <Icon name="Check" size={12} /> : i + 1}</span>
                        <div className="body">
                          <b>{s.title}{state === 'on' && <span className="pulse" />}</b>
                          <p>{s.detail}</p>
                        </div>
                        <div className="src"><small>数据源</small><span className="chip blue"><i /><span>{s.src}</span></span></div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {phase === 'done' && (
            <div>
              <div className="fp-results-h">
                <h2><Icon name="Layers" size={16} /> 结果面板</h2>
                <div className="meta">
                  <span>{panels.length} 个面板</span><span>·</span><span>{runCo.name}</span><span>·</span>
                  <span className="ai-tag">AI 生成 · 辅助建议 · 需人工复核</span>
                </div>
              </div>
              <div className="fp-results">
                {results.slice(0, shown).map((p, i) => (
                  <PanelCard key={`${p.title}-${i}`} title={p.title} text={p.text} kind={p.kind} viz={p.viz} gid={`${gidBase}-${i}`} co={runCo} ds={p.ds} />
                ))}
                {shown >= panels.length && (
                  <div className="card dark fp-panel wide fp-concl fade-in">
                    <div className="fp-panel-h">
                      <div className="t"><span className="ico"><Icon name="ClipboardCheck" size={13} /></span><span>结论与建议</span></div>
                      <span className="chip"><i />AI 生成 · 需人工复核</span>
                    </div>
                    <div className="ribbon" />
                    <div className="fp-concl-grid">
                      <div>
                        <h3><Icon name="FileOutput" size={12} /> 输出</h3>
                        <p>{fn.output}</p>
                        <h3 style={{ marginTop: 12 }}><Icon name="Database" size={12} /> 引用数据源</h3>
                        <div className="row" style={{ gap: 6 }}>{dsList.map((d) => <span className="chip" key={d}><i />{d}</span>)}</div>
                      </div>
                      <div>
                        <h3><Icon name="Sparkles" size={12} /> AI 建议</h3>
                        <div className="fp-advice">
                          {advice.map((a, i) => <div className="a" key={i}><span className="n">{i + 1}</span><span>{a}</span></div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ---------- 右栏 ---------- */}
        <div className="fp-col fp-right">
          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />数据来源</div><span className="card-s">{dsList.length} 个 · 只读</span></div>
            <div className="fp-chips">{dsList.map((d) => <span className="chip blue" key={d}><i />{d}</span>)}</div>
          </div>

          <div className="card red">
            <div className="card-h"><div className="card-t"><span className="dot" />合规边界</div></div>
            <div className="fp-comp">
              <div className="ico"><Icon name="ShieldCheck" size={18} /></div>
              <p>{fn.compliance}</p>
            </div>
          </div>

          <div className={`card fp-hist${flash ? ' fp-flash' : ''}`} ref={histRef}>
            <div className="card-h"><div className="card-t"><span className="dot" />历史记录</div><span className="card-s">近 {history.length} 次</span></div>
            {history.map((h) => (
              <div className="li" key={h.id} onClick={() => { selectCompany(h.co.id); toast(`已载入任务 ${h.id} 的参数（${h.co.name}）`); }} title="点击载入该任务的参数">
                <div className="av">{h.co.name.slice(0, 1)}</div>
                <div className="grow"><div className="t">{h.co.name}</div><div className="s num">{h.when} · {h.id}</div></div>
                <span className={`chip ${h.tone}`}>{h.status}</span>
              </div>
            ))}
          </div>

          {related.length > 0 && (
            <div className="card fp-rel">
              <div className="card-h"><div className="card-t"><span className="dot" />相关功能</div><span className="card-s">{product?.name}</span></div>
              {related.map((f) => (
                <Link to={`/f/${f.id}`} key={f.id} title={clean(f.summary)}>
                  <span className="ico"><Icon name={product?.icon ?? 'Workflow'} size={13} /></span>
                  <span>{clean(f.name)}</span>
                  <small>{f.id}</small>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- 底部固定操作条 ---------- */}
      <div className="fp-bar">
        <span className="ai-tag"><Icon name="Bot" size={12} /> AI 生成 · 辅助建议 · 需人工复核</span>
        <span className="status">
          {phase === 'done' ? <><Icon name="CircleCheck" size={13} /> 结果已生成，复核后可导出或推送</> : phase === 'run' ? <><span className="pulse" /> 处理中</> : '尚未运行分析'}
        </span>
        <span className="spacer" />
        <label className={reviewed ? 'on' : phase !== 'done' ? 'off' : ''}>
          <input type="checkbox" checked={reviewed} disabled={phase !== 'done'} onChange={(e) => setReviewed(e.target.checked)} />
          复核确认：我已阅读并复核上述 AI 输出
        </label>
        <button className="btn gold" disabled={!reviewed} onClick={exportReport}><Icon name="Download" size={14} /> 导出报告</button>
        <button className="btn green" disabled={!reviewed} onClick={pushOA}><Icon name="Send" size={14} /> 推送至系统</button>
      </div>

      {toastMsg && <div className="fp-toast"><span className="ico"><Icon name="CircleCheck" size={15} /></span>{toastMsg}</div>}
    </div>
  );
}
