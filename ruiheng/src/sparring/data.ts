/**
 * 企金智脑 · AI 智能陪练底座 —— 数据与规则层
 * 流程票 / 五拍闭环计分 / 分级提示 / 红线一票否决 / 扣分规则 / 成就 / 成长地图 / 学员与团队统计 / 回写记录。
 * 全部本地固定种子，无网络请求；复用 src/data/sparring.ts 的剧本引擎、情绪模型与十维评估。
 */
import { rng } from '../lib/rng';
import { TEAM } from '../data/team';
import { PERSONAS } from '../data/personas';
import { EVAL_DIMS, evaluate, nextMood, moodLabel, pickBranch, COACH_TIPS, KNOWLEDGE, OBJECTION_LABEL } from '../data/sparring';
import type { SparScene, Turn, Branch, ObjectionType, Report } from '../data/sparring';

export { evaluate, nextMood, moodLabel, pickBranch, COACH_TIPS, KNOWLEDGE, OBJECTION_LABEL };
export type { SparScene, Turn, Branch, ObjectionType, Report };

/* ---------------- 基础枚举 ---------------- */
export type Mode = 'teach' | 'drill' | 'exam';
export interface ModeDef { id: Mode; name: string; short: string; desc: string; hintLevels: number; hintCost: number; tone: string }
export const MODES: ModeDef[] = [
  { id: 'teach', name: '教学模式', short: '教学', desc: '逐项引导 · 三级提示 · 成绩仅供自我参考', hintLevels: 3, hintCost: 0, tone: 'green' },
  { id: 'drill', name: '演练模式', short: '演练', desc: '少量提示 · 每次提示扣 1 分 · 记入练习时长', hintLevels: 1, hintCost: 1, tone: 'gold' },
  { id: 'exam', name: '考核模式', short: '考核', desc: '无提示 · 全程计分 · 结果回写学习平台', hintLevels: 0, hintCost: 0, tone: 'red' },
];
export const modeById = (m: Mode) => MODES.find((x) => x.id === m)!;

/** 十维能力（与 data/sparring.ts 评估函数一致） */
export const DIMS = EVAL_DIMS;
/** 五拍闭环 */
export const BEATS = ['想清楚', '复述确认', '提问 / 陈述', '核对回应', '记录'];
export const BEAT_DESC = ['先想清楚本项要拿到什么信息或达成什么共识', '复述客户上一句，确认理解一致', '提出具体问题或陈述本行立场', '对客户回应进行核对、要求佐证', '当场记录，形成可追溯的纪要'];

/* ---------------- 流程票 ---------------- */
export interface TicketItem {
  id: string; name: string; points: string[]; errors: string[]; score: number; redline?: boolean;
  /** 命中即视为覆盖本项 */
  keywords: string[];
  /** 第三级提示 · 参考话术 */
  script: string;
  /** 本项被覆盖后客户的回应 */
  reply: string;
  /** 覆盖不充分（闭环拍数 < 3）时客户的回应 */
  evasive?: string;
}
export interface TicketStage { id: string; name: string; items: TicketItem[] }
export const ticketItems = (stages: TicketStage[]) => stages.flatMap((s) => s.items.map((it) => ({ ...it, stage: s.name, stageId: s.id })));
export const ticketMax = (stages: TicketStage[]) => stages.reduce((a, s) => a + s.items.reduce((b, it) => b + it.score, 0), 0);

/* ---------------- 红线（一票否决） ---------------- */
export interface RedRule { id: string; label: string; hint: string; pattern: RegExp; contextual?: 'credit-auth' }
export const RED_RULES: RedRule[] = [
  { id: 'promise', label: '承诺审批结果或利率', hint: '审批结果与最终定价由授信审批部门与定价委员会决定，客户经理不得作任何承诺性表述。', pattern: /保证.{0,4}(批|放款|通过)|一定能批|肯定能批|包批|包过|百分之百|绝对没问题|(利率|价格|定价).{0,6}(一定|肯定|保证|没问题|我做主)|我(做主|拍板).{0,6}(批|利率|额度)/ },
  { id: 'disparage', label: '贬损同业', hint: '不得诋毁、贬低其他金融机构，只陈述本行方案的事实与价值。', pattern: /(他行|别的银行|其他银行|X\s?行|那家银行|同业).{0,8}(不靠谱|坑|垃圾|骗|不如我们|没我们|差远了|不行|烂)|比.{0,6}(行|银行).{0,4}(差|烂|不行|垃圾)/ },
  { id: 'leak', label: '泄露他行 / 他客信息', hint: '不得向客户透露其他客户的财务、授信、定价信息或其他银行的内部报价与审批情况。', pattern: /(别的|其他|另一家|隔壁|某)(公司|客户|企业|集团|老板).{0,12}(流水|报表|授信|利率|额度|批了|放了|做到|逾期|被拒)|(他行|X\s?行|别的银行|其他银行).{0,8}(内部|审批|报价|底价|给.{0,4}(他们|那家)).{0,6}(是|为|才|只有|\d)|我们给.{0,6}(某|别的|另一家|其他)(公司|客户|企业).{0,8}(利率|额度|是|做到)/ },
  { id: 'credit-auth', label: '未取得授权即查询征信', hint: '查询企业或个人征信必须先取得书面授权，未授权查询属违规操作。', pattern: /(先|直接|已经|马上|顺手|提前|昨天|刚).{0,4}(查|拉|调).{0,3}(征信|人行报告|信用报告)|(征信|信用报告).{0,6}(不用|无需|先不).{0,4}(授权|签)/, contextual: 'credit-auth' },
  { id: 'fake', label: '诱导客户虚增流水或粉饰报表', hint: '严禁诱导或协助客户虚增流水、粉饰报表、提供不真实的申请材料。', pattern: /(做高|做大|冲一下|冲冲|走一走|走一下|包装|美化|粉饰|调一调|做平|做漂亮|做好看).{0,6}(流水|报表|收入|利润|数据|销售)|(流水|报表|收入|利润).{0,6}(做高|做大|冲一下|冲冲|走一走|走一下|包装|美化|粉饰|调一调|做平|做漂亮|做好看)|随便填|帮你做材料|材料我来编/ },
  { id: 'written', label: '未核实即出具书面承诺', hint: '任何书面承诺函、意向函、证明须经核实与行内审批后出具，客户经理不得当场承诺出具。', pattern: /(今天|现在|马上|当场|先|立刻).{0,4}(出|给|写|开|盖).{0,3}(书面|承诺函|意向函|保函|授信函|证明|函件)|我先(出|开)个(函|承诺|证明)|盖个章.{0,4}(先|就行)/ },
];
export const redById = (id: string) => RED_RULES.find((r) => r.id === id)!;
/** 检查红线：查询征信规则仅在"征信授权"项尚未完成时触发 */
export function checkRed(text: string, ctx: { authDone: boolean; enabled: string[] }): RedRule[] {
  return RED_RULES.filter((r) => ctx.enabled.includes(r.id)).filter((r) => {
    if (!r.pattern.test(text)) {
      if (r.contextual === 'credit-auth' && !ctx.authDone && /(查|拉|调).{0,3}(征信|信用报告)/.test(text)) return true;
      return false;
    }
    if (r.contextual === 'credit-auth') return !ctx.authDone;
    return true;
  });
}

/* ---------------- 五拍闭环计分 ---------------- */
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
const BEAT_RE = [
  /您(刚才|刚|前面|提到|说的|说到|讲的)|我理解|也就是说|确认一下|我复述|我总结|您的意思是|换句话说|我们对齐一下|您是说/,
  /[？?]|请问|能否|方便|想了解|想请教|介绍一下|说明一下|我们建议|我们可以|我来说明|我先介绍/,
  /核对|核实|对一下|以.{1,6}为准|请提供|明细|凭证|流水|合同|台账|发票|清单|对账|查验|现场|材料|佐证|订单|报表|回单/,
  /记录|记下|记一下|备注|整理|会后|写进|纪要|归档|我记|登记|留痕/,
];
export const matchItem = (text: string, item: TicketItem) => item.keywords.filter((k) => norm(text).includes(norm(k))).length;
export function scoreBeats(text: string, item: TicketItem): boolean[] {
  const t = norm(text);
  const hits = matchItem(text, item);
  return [hits >= 1 && t.length >= 18, ...BEAT_RE.map((re) => re.test(t))];
}
export const beatScore = (beats: boolean[], max: number) => Math.round((beats.filter(Boolean).length / BEATS.length) * max);

/* ---------------- 分级提示 ---------------- */
export const HINT_LEVELS = ['第一级 · 方向提示', '第二级 · 要点提示', '第三级 · 参考话术'];
export function hintText(item: TicketItem, level: number): string {
  if (level === 0) return `围绕「${item.name}」推进：先复述客户上一句，再提出一个具体问题；本项共 ${item.points.length} 个要点，常见错误是「${item.errors[0]}」。`;
  if (level === 1) return `要点：${item.points.join('；')}。`;
  return item.script;
}

/* ---------------- 扣分规则 ---------------- */
export type DeductKind = 'skip' | 'hint' | 'filler' | 'tone' | 'short' | 'redline' | 'mood' | 'unverified';
export interface Deduction { turn: number; kind: DeductKind; label: string; points: number }
export const DEDUCT_RULES: { kind: DeductKind; label: string; points: number; desc: string }[] = [
  { kind: 'redline', label: '触发红线', points: 20, desc: '一票否决，本场判定不通过' },
  { kind: 'skip', label: '跳过流程项', points: 0, desc: '扣除该项全部分值' },
  { kind: 'filler', label: '填充词过多', points: 2, desc: '单句"然后 / 这个 / 那个 / 嗯"≥ 3 次' },
  { kind: 'tone', label: '命令式语气', points: 3, desc: '"你们必须 / 你得"等命令式表述' },
  { kind: 'short', label: '表述过短', points: 1, desc: '单句不足 10 字，未形成有效沟通' },
  { kind: 'hint', label: '使用提示', points: 1, desc: '演练模式每次提示扣 1 分' },
  { kind: 'mood', label: '客户情绪明显恶化', points: 2, desc: '单轮情绪值下降 ≥ 8' },
  { kind: 'unverified', label: '未核对即采信', points: 2, desc: '客户陈述关键数据后，下一句未要求佐证' },
];
export function textDeductions(text: string, turn: number): Deduction[] {
  const out: Deduction[] = [];
  const t = text.replace(/\s/g, '');
  const filler = (t.match(/然后|这个|那个|嗯|呃/g) ?? []).length;
  if (filler >= 3) out.push({ turn, kind: 'filler', label: `填充词 ${filler} 次`, points: 2 });
  if (/你们必须|你必须|你们得|必须先|你得/.test(t)) out.push({ turn, kind: 'tone', label: '命令式语气', points: 3 });
  if (t.length < 10) out.push({ turn, kind: 'short', label: '表述过短', points: 1 });
  return out;
}

/* ---------------- 本场结果 ---------------- */
export interface ItemResult { id: string; name: string; stage: string; score: number; max: number; beats: boolean[]; skipped: boolean; covered: boolean; redline?: boolean }
export interface LineReview { original: string; comment: string; better: string; flag: 'red' | 'gold' | 'green'; item?: string }
export interface SessionResult {
  id: string; coachId: string; coachName: string; mode: Mode; date: string;
  score: number; passLine: number; examLine: number; passed: boolean; vetoed: boolean; redlines: string[];
  durationSec: number; hintsUsed: number; deductions: Deduction[]; deductTotal: number;
  dims: { dim: string; score: number; team: number }[];
  items: ItemResult[]; ticketScore: number; ticketMax: number;
  reviews: LineReview[]; strengths: string[]; improves: string[]; compliance: { label: string; tone: 'green' | 'red' | 'gold' }[];
  summary: string; turns: Turn[]; retryItems: string[];
  writeback: { empNo: string; method: string; score: number; taskDone: boolean; at: string };
}

/* ---------------- 学员 ---------------- */
export type StudentId = 'lin' | 'wang';
export interface Student {
  id: StudentId; name: string; avatar: string; title: string; branch: string; empNo: string; sequence: string; years: string;
  kpi: { sessions30: number; minutes: number; avg: number; dimsOk: number };
  radarNow: number[]; radarLast: number[];
  weekly: { w: string; red: number; deduct: number; sessions: number; minutes: number }[];
  methods: { name: string; value: number }[];
  hours: { target: number; done: number; detail: { name: string; hours: number }[] };
  map: ('done' | 'doing' | 'todo' | 'plan')[];
  competency: number; competencyGate: number;
  certs: { name: string; org: string; date: string; status: '有效' | '待复训' }[];
  tags: string[];
  history: { d: string; s: number; coach: string; mode: Mode; red: number }[];
  bestByCoach: Record<string, number>;
  achievements: string[];
  writebacks: { at: string; method: string; score: number; taskDone: boolean }[];
}
const P = (id: string) => PERSONAS.find((p) => p.id === id)!;
export const STUDENTS: Record<StudentId, Student> = {
  lin: {
    id: 'lin', name: P('lin').name, avatar: P('lin').avatar, title: '企金客户经理', branch: '城东支行', empNo: 'YS-2026-0417', sequence: '公司业务序列 · 客户经理', years: P('lin').years,
    kpi: { sessions30: 14, minutes: 386, avg: 71, dimsOk: 6 },
    radarNow: [72, 66, 63, 68, 58, 70, 86, 74, 57, 78], radarLast: [64, 60, 58, 61, 52, 63, 84, 70, 50, 74],
    weekly: [{ w: '8/4', red: 2, deduct: 31, sessions: 3, minutes: 78 }, { w: '8/11', red: 1, deduct: 24, sessions: 4, minutes: 102 }, { w: '8/18', red: 1, deduct: 19, sessions: 3, minutes: 88 }, { w: '8/25', red: 0, deduct: 14, sessions: 4, minutes: 110 }, { w: '9/1', red: 0, deduct: 9, sessions: 3, minutes: 84 }],
    methods: [{ name: '分段练习', value: 9 }, { name: '专项练习', value: 7 }, { name: '完整流程', value: 5 }, { name: '错题重练', value: 4 }],
    hours: { target: 40, done: 26.5, detail: [{ name: '尽调访谈', hours: 7.5 }, { name: '异议与谈判', hours: 6 }, { name: '首访开场', hours: 4 }, { name: '合规与投诉', hours: 4.5 }, { name: '审贷会与协调', hours: 2.5 }, { name: '错题重练', hours: 2 }] },
    map: ['done', 'done', 'done', 'doing', 'doing', 'todo', 'todo', 'plan'],
    competency: 68, competencyGate: 80,
    certs: [{ name: '对公客户经理上岗证', org: '总行公司业务部', date: '2026-02', status: '有效' }, { name: '信贷从业资格', org: '总行授信审批部', date: '2026-03', status: '有效' }, { name: '反洗钱合规培训', org: '总行合规部', date: '2026-01', status: '有效' }, { name: '消费者权益保护培训', org: '总行消保办', date: '2025-12', status: '待复训' }],
    tags: ['尽调访谈进步快', '合规意识强', '需求挖掘待加强', '成交推进偏弱', '共情表达自然'],
    history: [
      { d: '08/06', s: 58, coach: 'first-visit', mode: 'teach', red: 1 }, { d: '08/09', s: 62, coach: 'dd-interview', mode: 'teach', red: 1 }, { d: '08/13', s: 64, coach: 'objection', mode: 'drill', red: 0 },
      { d: '08/16', s: 67, coach: 'dd-interview', mode: 'drill', red: 0 }, { d: '08/20', s: 66, coach: 'renewal', mode: 'drill', red: 1 }, { d: '08/23', s: 71, coach: 'complaint', mode: 'drill', red: 0 },
      { d: '08/27', s: 73, coach: 'dd-interview', mode: 'drill', red: 0 }, { d: '08/30', s: 74, coach: 'collection', mode: 'drill', red: 0 }, { d: '09/02', s: 77, coach: 'objection', mode: 'exam', red: 0 }, { d: '09/04', s: 79, coach: 'dd-interview', mode: 'drill', red: 0 },
    ],
    bestByCoach: { 'first-visit': 74, 'dd-interview': 79, objection: 77, renewal: 66, complaint: 71, collection: 74, 'cross-dept': 63, etiquette: 70, speech: 72 },
    achievements: ['zero-red-5', 'no-hint-3'],
    writebacks: [{ at: '09/04 17:42', method: '完整流程 · 演练', score: 79, taskDone: true }, { at: '09/02 11:20', method: '专项 · 异议处理 · 考核', score: 77, taskDone: true }, { at: '08/30 16:05', method: '分段 · 催收沟通 · 演练', score: 74, taskDone: false }, { at: '08/27 10:12', method: '完整流程 · 演练', score: 73, taskDone: true }],
  },
  wang: {
    id: 'wang', name: P('wang').name, avatar: P('wang').avatar, title: '企金客户经理', branch: '城东支行', empNo: 'YS-2021-0088', sequence: '公司业务序列 · 客户经理', years: P('wang').years,
    kpi: { sessions30: 9, minutes: 268, avg: 83, dimsOk: 9 },
    radarNow: [86, 82, 80, 78, 81, 84, 90, 76, 82, 84], radarLast: [84, 80, 78, 74, 77, 82, 90, 74, 79, 83],
    weekly: [{ w: '8/4', red: 0, deduct: 12, sessions: 2, minutes: 60 }, { w: '8/11', red: 1, deduct: 16, sessions: 2, minutes: 58 }, { w: '8/18', red: 0, deduct: 8, sessions: 2, minutes: 62 }, { w: '8/25', red: 0, deduct: 6, sessions: 2, minutes: 55 }, { w: '9/1', red: 0, deduct: 5, sessions: 1, minutes: 33 }],
    methods: [{ name: '分段练习', value: 3 }, { name: '专项练习', value: 8 }, { name: '完整流程', value: 6 }, { name: '错题重练', value: 2 }],
    hours: { target: 40, done: 33, detail: [{ name: '授信与续贷谈判', hours: 9 }, { name: '集团高管会谈', hours: 7 }, { name: '审贷会答辩', hours: 6 }, { name: '跨部门协调', hours: 4 }, { name: '舆情与投诉', hours: 4 }, { name: '错题重练', hours: 3 }] },
    map: ['done', 'done', 'done', 'done', 'done', 'done', 'doing', 'todo'],
    competency: 84, competencyGate: 80,
    certs: [{ name: '对公客户经理上岗证', org: '总行公司业务部', date: '2021-09', status: '有效' }, { name: '信贷从业资格', org: '总行授信审批部', date: '2021-11', status: '有效' }, { name: '反洗钱合规培训', org: '总行合规部', date: '2026-01', status: '有效' }, { name: '消费者权益保护培训', org: '总行消保办', date: '2026-03', status: '有效' }, { name: '外汇业务展业资格', org: '总行国际业务部', date: '2024-06', status: '有效' }],
    tags: ['谈判节奏稳', '数据驱动', '审贷会答辩清晰', '共情倾听可提升', '带教 2 名新人'],
    history: [
      { d: '08/05', s: 80, coach: 'negotiation', mode: 'drill', red: 0 }, { d: '08/08', s: 82, coach: 'exec', mode: 'drill', red: 0 }, { d: '08/13', s: 78, coach: 'committee', mode: 'exam', red: 1 },
      { d: '08/19', s: 84, coach: 'renewal', mode: 'exam', red: 0 }, { d: '08/22', s: 85, coach: 'cross-dept', mode: 'drill', red: 0 }, { d: '08/27', s: 86, coach: 'crisis', mode: 'exam', red: 0 },
      { d: '08/29', s: 83, coach: 'postloan', mode: 'drill', red: 0 }, { d: '09/03', s: 88, coach: 'negotiation', mode: 'exam', red: 0 },
    ],
    bestByCoach: { negotiation: 88, exec: 82, committee: 78, renewal: 84, 'cross-dept': 85, crisis: 86, postloan: 83, 'dd-interview': 86, 'first-visit': 81, scf: 80, fx: 79, speech: 84, etiquette: 83, objection: 85, complaint: 80, collection: 82 },
    achievements: ['score-90', 'zero-red-5', 'full-85', 'no-hint-3', 'fraud-detect'],
    writebacks: [{ at: '09/03 15:30', method: '完整流程 · 考核', score: 88, taskDone: true }, { at: '08/29 09:48', method: '专项 · 贷后风险沟通 · 演练', score: 83, taskDone: true }, { at: '08/27 14:16', method: '专项 · 舆情应对 · 考核', score: 86, taskDone: true }],
  },
};

/* ---------------- 成长地图 ---------------- */
export const MAP_NODES = ['岗前培训', '合规考试', '完整流程 · 教学模式', '分段与专项强化', '异议处理 · 专项', '完整流程 · 考核模式', '胜任度测算', '晋升通道'];
export const MAP_STATUS: Record<'done' | 'doing' | 'todo' | 'plan', { label: string; tone: string }> = { done: { label: '已完成', tone: 'green' }, doing: { label: '进行中', tone: 'gold' }, todo: { label: '待完成', tone: 'orange' }, plan: { label: '规划中', tone: 'purple' } };

/* ---------------- 成就徽章 ---------------- */
export interface Achievement { id: string; name: string; rule: string; icon: string; tone: string }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'score-90', name: '九十分场', rule: '任一场次得分 ≥ 90', icon: 'Trophy', tone: 'gold' },
  { id: 'zero-red-5', name: '零红线', rule: '零红线 · 连续 5 场', icon: 'ShieldCheck', tone: 'green' },
  { id: 'full-85', name: '全流程达标', rule: '完整流程得分 ≥ 85', icon: 'ListChecks', tone: 'blue' },
  { id: 'exam-90', name: '考核优异', rule: '考核模式得分 ≥ 90', icon: 'Award', tone: 'red' },
  { id: 'retry-90', name: '错题清零', rule: '错题重练得分 ≥ 90', icon: 'RotateCcw', tone: 'purple' },
  { id: 'no-hint-3', name: '独立作业', rule: '不用提示 · 3 场', icon: 'Lightbulb', tone: 'orange' },
  { id: 'fraud-detect', name: '火眼金睛', rule: '陪练中识别客户虚假陈述并正确处置', icon: 'ScanSearch', tone: 'iris' },
];

/* ---------------- 待练任务 ---------------- */
export interface Assignment { id: string; title: string; coachId: string; mode: Mode; from: string; due: string; done: boolean; target?: number }
export const ASSIGNMENTS: Record<StudentId, Assignment[]> = {
  lin: [
    { id: 'a1', title: '完整尽调访谈流程（考核模式）', coachId: 'dd-interview', mode: 'exam', from: '周慧敏 · 团队长下发', due: '2026-09-08', done: false, target: 75 },
    { id: 'a2', title: '异议处理 · 专项 3 场（≥ 70 分）', coachId: 'objection', mode: 'drill', from: '黄建国 · 支行行长', due: '2026-09-12', done: false, target: 70 },
    { id: 'a3', title: '催收沟通 · 合规话术复训', coachId: 'collection', mode: 'drill', from: '合规部', due: '2026-09-05', done: true },
  ],
  wang: [
    { id: 'b1', title: '集团高管会谈（考核模式）· 晟禾年度战略会谈前', coachId: 'exec', mode: 'exam', from: '周慧敏 · 团队长下发', due: '2026-09-10', done: false, target: 85 },
    { id: 'b2', title: '审贷会答辩 · 北岭铝材续贷', coachId: 'committee', mode: 'drill', from: '黄建国 · 支行行长', due: '2026-09-09', done: false, target: 80 },
  ],
};

/* ---------------- 团队 ---------------- */
export interface TeamRow { id: string; name: string; branch: string; avatar: string; sessions: number; avg: number; red: number; taskRate: number; practicedThisMonth: boolean; dims: number[] }
const tr = rng(20260906);
export const TEAM_ROWS: TeamRow[] = TEAM.map((m, i) => {
  const st = m.name === STUDENTS.lin.name ? STUDENTS.lin : m.name === STUDENTS.wang.name ? STUDENTS.wang : null;
  const base = 58 + Math.round(tr() * 30);
  const dims = st ? st.radarNow : Array.from({ length: 10 }, () => Math.min(96, Math.max(40, Math.round(base + (tr() - 0.5) * 22))));
  const avg = st ? st.kpi.avg : Math.round(dims.reduce((a, b) => a + b, 0) / 10);
  return {
    id: m.id, name: m.name, branch: m.branch, avatar: m.name[0],
    sessions: st ? st.kpi.sessions30 : Math.round(2 + tr() * 14), avg, red: st ? st.history.reduce((a, h) => a + h.red, 0) : Math.round(tr() * 3),
    taskRate: st ? (st.id === 'lin' ? 67 : 50) : Math.round(40 + tr() * 60), practicedThisMonth: st ? true : i % 5 !== 3 && tr() > 0.15, dims,
  };
});
export const TEAM_DIM_AVG = DIMS.map((_, i) => Math.round(TEAM_ROWS.reduce((a, r) => a + r.dims[i], 0) / TEAM_ROWS.length));
export const TEAM_PRACTICED = { n: TEAM_ROWS.filter((r) => r.practicedThisMonth).length, m: TEAM_ROWS.length };

/* ---------------- 工具 ---------------- */
export const greeting = (h = new Date().getHours()) => (h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好');
export const fmtDur = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
export const fmtMin = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} 小时 ${min % 60} 分` : `${min} 分`);
export const todayLabel = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const nowLabel = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
