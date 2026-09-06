/**
 * 分析 / 混合类功能页的内容生成：AI 结论、面板联动目标、行动计划任务、上传预置文件名、建议 → 动作映射。
 * 所有数字与文字由 rng(功能 id + 客户 id) 种子确定性生成，客户切换即全部变化。
 */
import type { ProductFunction } from '../../data/types';
import type { FnSpec } from '../../data/fnspec';
import type { Company } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { ACTIONS } from '../../lib/actions';
import { rng } from '../../lib/rng';
import { addDays, clauses, fmtInt, localize, splitSentences, trimTo, ymdDot } from './text';

/* ====================================================================== AI 结论 */
export interface Conclusion { headline: string; points: string[]; evidence: string[]; confidence: number; tone: 'gold' | 'red' | 'green' }

const RISK_PRODUCTS = new Set(['P06', 'P07', 'P11']);

export function buildConclusion(fn: ProductFunction, spec: FnSpec, co: Company, docNames: string[], seed: number): Conclusion {
  const r = rng((seed ^ 0xc0c1) >>> 0);
  const sents = splitSentences(fn.demoSample).map((s) => localize(s, fn, co, seed));
  // 标题：样例第一句提炼；过短时并入下一句；必须出现所选客户名
  let head = sents[0] ?? '';
  let k = 1;
  while (head.length < 24 && k < sents.length) head = `${head.replace(/[。；;，,]+$/, '')}；${sents[k++]}`;
  head = trimTo(head, 84);
  if (!head) head = `${co.name}：${trimTo(fn.summary, 40)}`;
  if (!head.includes(co.name)) head = `${co.name} · ${head}`;
  // 要点：样例后续句子 + 本行合作事实
  const points: string[] = [];
  for (const s of sents.slice(k)) {
    const p = trimTo(s, 64);
    if (p.length >= 8 && !points.includes(p)) points.push(p);
    if (points.length >= 3) break;
  }
  if (points.length < 2) {
    for (const s of [...splitSentences(fn.output), ...splitSentences(fn.summary)]) {
      const p = trimTo(s, 56); if (p.length >= 8 && !points.includes(p)) points.push(p); if (points.length >= 2) break;
    }
  }
  points.push(co.exposure > 0
    ? `本行敞口 ${fmtInt(co.exposure)} 万元、日均存款 ${fmtInt(co.deposit)} 万元、年结算量 ${fmtInt(co.settlement)} 万元（${co.relation}）`
    : `本行日均存款 ${fmtInt(co.deposit)} 万元、年结算量 ${fmtInt(co.settlement)} 万元，暂无授信敞口（${co.relation}）`);
  // 依据：已上传文件 + 数据源
  const ds = fn.dataSources?.length ? fn.dataSources : ['行内业务系统（只读）'];
  const evidence = [...docNames.slice(0, 3), ...ds.slice(0, docNames.length ? 2 : 3)];
  if (spec.uploads?.length && !docNames.length) evidence.push('行内影像系统 · 客户资料库');
  const risky = co.risk === 'red' || co.risk === 'orange';
  const tone: Conclusion['tone'] = RISK_PRODUCTS.has(fn.product) || /风险|预警|流失|异常|法律|争议/.test(fn.name)
    ? (risky ? 'red' : 'gold')
    : (co.risk === 'green' ? 'green' : 'gold');
  return { headline: head, points: points.slice(0, 4), evidence, confidence: Math.round((0.78 + r() * 0.16) * 100) / 100, tone };
}

/* ====================================================================== 面板联动目标 */
export interface PanelLink { label: string; to: string }
const LINK_RULES: Array<[RegExp, string, string]> = [
  [/预警|风险|信号|异常|舆情|传导|逾期/, '推送风险预警', '/f/F-FX-001'],
  [/需求|机会|偏好|升级|潜力|场景/, '生成场景化方案', '/f/F-YX-002'],
  [/定价|成本|收益|利率|价格|贡献|RAROC/, '综合定价测算', '/f/F-YX-008'],
  [/组合|产品|匹配|推荐/, '产品组合顾问', '/f/F-YX-003'],
  [/融资|额度|情景|沙盘|结构|现金流/, '融资方案沙盘', '/f/F-YX-004'],
  [/授信|评分|评级|等级|校验|押品|担保/, '发起授信方案', '/f/F-FX-004'],
  [/集团|关联|图谱|穿透|成员/, '打开集团图谱', '/f/F-KH-021'],
  [/拜访|关系|维护|互动|健康度|生命周期/, '加入拜访计划', '/f/F-KH-002'],
  [/话术|沟通|谈判|异议|表达|开场/, '生成沟通话术', '/f/F-SY-015'],
  [/合同|法律|条款|争议|案例/, '合同审核', '/f/F-ZY-016'],
  [/财务|指标|报表|盈利|偿债|趋势/, '财务诊断报告', '/f/F-ZY-010'],
  [/政策|行业|区域|宏观|市场|周期/, '圈定目标客群', '/f/F-KH-001'],
  [/画像|特征|标签|价值|周期|忠诚|满意/, '客户价值评估', '/f/F-KH-014'],
  [/策略|路径|计划|方案|建议|清单|任务/, '加入工作计划', '/f/F-SY-004'],
];
export function panelLink(title: string, kind: string, fid: string, spec: FnSpec): PanelLink {
  const byKind: Record<string, PanelLink> = {
    alert: { label: '推送风险预警', to: '/f/F-FX-001' }, list: { label: '加入工作计划', to: '/f/F-SY-004' },
    score: { label: '发起授信方案', to: '/f/F-FX-004' }, trend: { label: '财务诊断报告', to: '/f/F-ZY-010' },
    dist: { label: '圈定目标客群', to: '/f/F-KH-001' }, kv: { label: '客户 360 画像', to: '/f/F-KH-007' },
  };
  const cands: PanelLink[] = [];
  for (const [re, label, to] of LINK_RULES) if (re.test(title)) cands.push({ label, to });
  cands.push(byKind[kind] ?? byKind.kv);
  for (const id of spec.actions) { const a = ACTIONS[id]; if (a?.to) cands.push({ label: a.label, to: a.to }); }
  cands.push({ label: '客户 360 画像', to: '/f/F-KH-007' }, { label: '加入拜访计划', to: '/f/F-KH-002' });
  return cands.find((c) => c.to !== `/f/${fid}`) ?? cands[0];
}

/* ====================================================================== 建议 → 动作 */
/** 结论卡里每条文字建议对应的动作 id（保证纯文字建议都带可点击动作） */
export function adviceActions(spec: FnSpec, i: number): string[] {
  const acts = spec.actions.filter((a) => ACTIONS[a]);
  const pools: string[][] = [
    [acts[0] ?? 'visit', acts[1] ?? 'followup'],
    ['visit', 'crm'],
    ['forward', 'oa'],
    [acts[2] ?? 'alert', 'plan'],
  ];
  const chosen = pools[i % pools.length];
  return Array.from(new Set(chosen.filter((a) => ACTIONS[a]))).slice(0, 2);
}

/* ====================================================================== 行动计划 */
export type Pri = 'P1' | 'P2' | 'P3';
export interface PlanTask { id: string; title: string; owner: string; due: string; pri: Pri; action?: string; done: boolean }

const ME = PERSONAS[1];
export const CURRENT_USER = ME.name;

const TASK_TPL: Record<string, (co: Company) => string> = {
  visit: (co) => `本周拜访 ${co.name}，与决策人当面确认本次结论并留痕`,
  prospect: (co) => `按 ${co.industry} 同类客群圈定 5 户目标客户`,
  marketing: (co) => `为 ${co.name} 生成精准营销方案书并送复核`,
  scenario: (co) => `生成 ${co.name} 场景化金融方案`,
  combo: (co) => `向 ${co.name} 推荐结算 + 融资产品组合`,
  finance: (co) => `完成 ${co.name} 融资结构沙盘测算`,
  pricing: (co) => `为 ${co.name} 申请综合定价优惠并提交定价审批`,
  scf: (co) => `设计 ${co.name} 供应链金融方案`,
  fx: (co) => `出具 ${co.name} 跨境结算与汇率避险方案`,
  invest: (co) => `评估 ${co.name} 投贷联动可行性`,
  credit: (co) => `发起 ${co.name} 授信方案与额度测算`,
  dd: (co) => `启动 ${co.name} 尽职调查并整理材料清单`,
  contract: (co) => `审核 ${co.name} 相关合同条款并出具意见`,
  report: (co) => `生成 ${co.name} 财务诊断报告`,
  alert: (co) => `将 ${co.name} 风险信号推送至风险经理`,
  risk: (co) => `制定 ${co.name} 风险处置与清收方案`,
  group: (co) => `更新 ${co.name} 集团关系图谱与成员清单`,
  followup: (co) => `设置 ${co.name} 关键节点跟进提醒`,
  talk: (co) => `生成 ${co.name} 沟通话术并试讲一次`,
  sparring: (co) => `围绕 ${co.name} 议题完成一次对练`,
  negotiation: (co) => `完成 ${co.name} 谈判预演与底线设定`,
  minutes: (co) => `整理 ${co.name} 会谈纪要并同步团队`,
  plan: (co) => `将 ${co.name} 相关事项加入本周工作计划`,
  oa: (co) => `推送 ${co.name} 待办至行内 OA`,
  crm: (co) => `将 ${co.name} 本次结论写回 CRM`,
  forward: (co) => `将 ${co.name} 结论转呈相关部门`,
};
const PAD_TASKS: Array<[string, string]> = [
  ['更新 {co} CRM 客户记录与标签', 'crm'], ['补充 {co} 佐证材料至行内影像系统', 'oa'],
  ['同步风险经理 / 审批岗对 {co} 的意见', 'forward'], ['安排 {co} 下次拜访并准备资料包', 'visit'],
];
const FID_TASKS: Record<string, Array<[string, string]>> = {
  'F-KH-014': [
    ['本周拜访 {co}，确认未开户子公司开户与资金归集意向', 'visit'],
    ['向 {co} 推荐结算产品：现金管理 + 票据池 + 代发扩面', 'combo'],
    ['为 {co} 申请定价优惠（以结算份额换价格）', 'pricing'],
    ['将 {co} 加入交叉销售名单并分配产品经理', 'marketing'],
    ['设置 {co} 季度价值复评提醒', 'followup'],
  ],
  'F-YX-003': [
    ['生成 {co} 产品组合方案书并送复核', 'marketing'],
    ['发起 {co} 组合定价测算与定价审批', 'pricing'],
    ['将 {co} 加入本周拜访计划，现场讲解推荐组合', 'visit'],
    ['转呈产品创新部复核组合可行性', 'forward'],
    ['设置 {co} 排产进度跟踪提醒（触发组合调整）', 'followup'],
  ],
  'F-YX-004': [
    ['按推荐情景发起 {co} 授信方案', 'credit'],
    ['完成 {co} 固定资产贷款综合定价测算', 'pricing'],
    ['转呈授信审批部预沟通 {co} 融资结构', 'forward'],
    ['向 {co} 讲解情景对比并确认自有资金到位安排', 'visit'],
    ['同步融资租赁合作渠道对 {co} 的备选报价', 'finance'],
  ],
};

export function buildTasks(fn: ProductFunction, spec: FnSpec, co: Company, seed: number): PlanTask[] {
  const r = rng((seed ^ 0x7a5c) >>> 0);
  const base: Array<[string, string]> = FID_TASKS[fn.id]
    ? FID_TASKS[fn.id].map(([t, a]) => [t.split('{co}').join(co.name), a])
    : spec.actions.filter((a) => TASK_TPL[a]).map((a) => [TASK_TPL[a](co), a] as [string, string]);
  const n = 4 + Math.floor(r() * 3);
  const list = [...base];
  for (const [t, a] of PAD_TASKS) { if (list.length >= n) break; if (!list.some((x) => x[1] === a)) list.push([t.split('{co}').join(co.name), a]); }
  const today = new Date();
  return list.slice(0, Math.max(4, n)).map(([title, action], i) => {
    const due = addDays(today, i === 0 ? 1 + Math.floor(r() * 3) : 2 + Math.floor(r() * 12));
    const pri: Pri = i === 0 ? 'P1' : r() < 0.35 ? 'P1' : r() < 0.7 ? 'P2' : 'P3';
    return { id: `${fn.id}-${co.id}-${i}`, title, owner: ME.name, due: ymdDot(due), pri, action, done: false };
  });
}

/* ====================================================================== 上传预置文件名 */
const PRESET_RULES: Array<[RegExp, (co: Company, t: string) => string]> = [
  [/资产负债表/, (co) => `${co.name}_2025年资产负债表.xlsx`],
  [/利润表/, (co) => `${co.name}_2025年利润表.xlsx`],
  [/现金流量表/, (co) => `${co.name}_2025年现金流量表.xlsx`],
  [/审计/, (co) => `${co.name}_2024年度审计报告.pdf`],
  [/纳税|税/, (co) => `${co.name}_增值税纳税申报表_2025.pdf`],
  [/流水|明细|收付/, (co) => `${co.name}_近12个月账户流水.xlsx`],
  [/合同|订单|协议/, (co) => `${co.name}_主要购销合同扫描件.pdf`],
  [/征信/, (co) => `${co.name}_企业征信报告.pdf`],
  [/章程|预算|办法/, (co) => `${co.name}_公司章程与资金管理办法.pdf`],
  [/纪要|访谈|回访/, (co) => `${co.name}_访谈纪要_2026-09.docx`],
  [/录音/, (co) => `${co.name}_会谈录音_2026-09-03.m4a`],
  [/照片|影像|凭证|权证|扫描/, (co) => `${co.name}_现场影像与凭证.jpg`],
  [/政策|法规|通知|原文/, (_co, t) => `${t}_2026年第3号.pdf`],
  [/Excel|数据|清单|持仓|问卷|工单|计划/, (co, t) => `${co.name}_${t}.xlsx`],
  [/Word|说明|材料|资料|方案|规划|年报|介绍|报告|稿/, (co, t) => `${co.name}_${t}.docx`],
];
export function uploadPresets(types: string[] | undefined, co: Company): string[] {
  if (!types?.length) return [];
  const out: string[] = [];
  for (const raw of types) {
    const t = raw.replace(/\s*[（(].*?[）)]\s*/g, '').replace(/\s*\/\s*/g, '或').trim();
    const rule = PRESET_RULES.find(([re]) => re.test(raw));
    let name = rule ? rule[1](co, t) : `${co.name}_${t}.pdf`;
    if (out.includes(name)) name = `${co.name}_${t}.pdf`;
    if (!out.includes(name)) out.push(name);
    if (out.length >= 3) break;
  }
  return out;
}

/* ====================================================================== 面板事实句 */
/** 把面板基础文本压成一句；客户绑定型功能在缺客户名时补上客户名 */
export function baseSentence(text: string, co: Company, bind = true): string {
  const first = splitSentences(text)[0] ?? text;
  const s = trimTo(clauses(first).length > 0 ? first : `${co.name} 相关结果已生成`, 72);
  return !bind || s.includes(co.name) || s.length > 56 ? `${s}。` : `${co.name}：${s}。`;
}
