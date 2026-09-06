import type { UDoc } from '../../../components/UploadDocs';
import { rng } from '../../../lib/rng';
import type { Constraint, Evidence, EvSource } from './types';
import { hashStr } from './types';

export const SOURCE_TONE: Record<EvSource, string> = { 工商变更: 'purple', 招投标公告: 'orange', 年报: 'blue', 舆情: 'red', 行内合作记录: 'green', 上传材料: '' };
export const SOURCE_NOTE: Record<EvSource, string> = {
  工商变更: '国家企业信用信息公示系统 · 公开信息', 招投标公告: '公共资源交易平台 / 企业官网 · 公开信息', 年报: '交易所 / 企业年度报告 · 公开信息',
  舆情: '公开媒体与行业资讯 · 公开信息', 行内合作记录: '本行 CRM 与账户系统 · 客户已建立业务关系', 上传材料: '客户经理上传 · 客户授权提供',
};

/** 约束 → 命中标签：证据带这些标签时相关度提高 */
export const CONSTRAINT_TAGS: Record<string, string[]> = {
  settlementFirst: ['结算', '账户', '归集', '代发', '收单'], deposit: ['存款', '沉淀'], fx: ['出口', '跨境', '结汇', '付汇', '海外', '进口'],
  scf: ['供应', '经销', '供应链', '账期', '上游', '下游'], ipo: ['上市', '辅导', '募集', '定增', '受理'], guarantee: ['中标', '保函', '项目', '投标'],
  mainBank: ['主办行', '份额'], chairTech: ['董事长', '技术', '研发', '产线'], chairFocus: ['董事长'], cfoFocus: ['CFO', '财务'], credit: ['授信', '贷款', '融资'],
  lowCost: ['沙龙', '引荐', '协会'], leaderVisit: ['行长', '管委会'], competitor: ['主办行', '份额', '他行'], geoNear: ['同区', '临港', '经开', '高新'],
  excludeRisk: ['被执行', '逾期', '预警'], authOnly: ['授权'],
};

/** 相关度 = 基础值 + 约束命中加成（每命中一个开启的约束 +6，封顶 98） */
export function relevanceWith(base: number, tags: string[], cons: Constraint[]) {
  let r = base;
  for (const c of cons) {
    if (!c.on) continue;
    const kw = CONSTRAINT_TAGS[c.key] ?? [];
    if (kw.some((k) => tags.some((t) => t.includes(k)))) r += 6;
  }
  return Math.min(98, Math.round(r));
}

/** 由种子生成一个近 8 个月内的日期 */
export function dateOf(seed: number, monthsBack = 8) {
  const r = rng(seed)();
  const d = new Date(2026, 8, 5);
  d.setDate(d.getDate() - Math.floor(r * monthsBack * 30));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 上传材料 → 证据卡：按文件名判断材料类型，摘录识别到的关键字段 */
export function docEvidence(doc: UDoc, id: string, entity: string, cons: Constraint[]): Evidence {
  const n = doc.name;
  const h = hashStr(n);
  let excerpt = `已提取 ${doc.fields} 个字段（${doc.pages} 页），${doc.lowConf ? `${doc.lowConf} 处待人工确认` : '无低置信字段'}`;
  let tags: string[] = ['上传'];
  let detail = '材料脱敏后进入本次任务上下文，不留存原件；识别结果需客户经理复核。';
  if (/年报|年度报告|财报|审计/.test(n)) { excerpt = `识别到营业收入、净利润、经营性现金流、前五大客户、银行借款明细与主要在建项目（${doc.pages} 页）`; tags = ['年报', '营收', '银行借款', '项目', '客户']; detail = `表格重建 ${Math.max(2, Math.round(doc.fields / 40))} 张：资产负债、利润、现金流、借款明细。银行借款明细可用于判断主办行与他行份额。`; }
  else if (/名片/.test(n)) { excerpt = `名片识别：姓名、职务、部门、直线电话与邮箱已结构化；职务字段含「${['董事长', '总经理', 'CFO', '财务总监', '董秘'][h % 5]}」`; tags = ['名片', '联系人', '董事长', 'CFO']; detail = '联系人信息属客户主动提供（名片交换），可作为授权联系人；不与征信数据关联。'; }
  else if (/邮件|往来|沟通|会谈|纪要/.test(n)) { excerpt = `邮件 / 会谈记录 ${3 + (h % 9)} 条：提及「结算账户」「付款周期」「保函」「协访」等 ${4 + (h % 4)} 个业务关键词`; tags = ['邮件', '结算', '保函', '账期', '协访']; detail = '按时间排序抽取客户表述的诉求与顾虑，作为方案中"客户原话"依据。'; }
  else if (/招标|采购|中标|公告|询价|招募/.test(n)) { excerpt = `公告识别：项目名称、预算金额约 ${(1 + (h % 30)) / 10} 亿、投标截止日、资格条件与付款条款已提取`; tags = ['招标', '采购', '保函', '项目', '中标', '需求']; detail = '公告文本可直接对应保函 / 履约融资 / 供应商匹配需求，并给出时间点。'; }
  else if (/合同|订单|协议/.test(n)) { excerpt = `合同 / 订单识别：合同金额、账期 ${30 + 30 * (h % 3)} 天、交付节点、结算方式已提取`; tags = ['合同', '订单', '账期', '结算', '供应链']; detail = '账期与结算方式是应收融资 / 反向保理的直接依据。'; }
  else if (/产能|供需|登记|产品目录|资质/.test(n)) { excerpt = `产能 / 供需登记：设备台数、利用率约 ${55 + (h % 30)}%、主要产品与可承接订单类型已提取`; tags = ['产能', '供需', '利用率', '产品']; detail = '闲置产能与需求方公告可做撮合匹配。'; }
  else if (/流水|对账|账单/.test(n)) { excerpt = `账户流水识别：月均收付 ${(200 + (h % 900))} 万，主要往来对手 ${5 + (h % 12)} 家，结算集中度较高`; tags = ['流水', '结算', '往来对手', '归集']; detail = '仅用于本任务分析，往来对手信息不向第三方披露。'; }
  else if (/组织|架构|股权|章程/.test(n)) { excerpt = `组织架构 / 股权结构识别：${2 + (h % 8)} 家子公司、实际控制人与决策层名单已提取`; tags = ['架构', '子公司', '董事长', '决策链']; detail = '决策链信息用于接触路径规划。'; }
  return { id, source: '上传材料', title: `${entity} · ${n}`, time: '2026-09-06', excerpt, tags, entity, detail, relevance: relevanceWith(Math.min(90, doc.confidence - 8), tags, cons) };
}
