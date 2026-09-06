import type { Constraint, CGroup } from './types';

/** 关键词规则：把"我的目标 / 约束"自由文本解析为结构化约束。规则顺序即优先级；excludes 用于否定句优先。 */
export interface IntentRule { re: RegExp; key: string | ((m: RegExpMatchArray) => string); label: string | ((m: RegExpMatchArray) => string); group: CGroup; value?: (m: RegExpMatchArray) => number | string; excludes?: string[] }

export const INTENT_RULES: IntentRule[] = [
  { re: /不(做|谈|涉及|上|要|考虑|申请|碰)授信|暂不授信|不放贷|不做贷款|不谈贷款|无需授信|不含授信/, key: 'noCredit', label: '不做授信：本轮不涉及授信 / 融资类产品', group: '约束' },
  { re: /授信|贷款|放款|融资|保理/, key: 'credit', label: '目标含授信 / 融资类产品', group: '目标', excludes: ['noCredit'] },
  { re: /结算|账户|归集|代发|现金管理|收单/, key: 'settlementFirst', label: '以结算 / 账户类业务切入', group: '目标' },
  { re: /存款|沉淀|理财/, key: 'deposit', label: '关注存款沉淀与理财', group: '目标' },
  { re: /跨境|外汇|结汇|购汇|汇率|付汇/, key: 'fx', label: '涉及跨境结算 / 汇率避险', group: '目标' },
  { re: /供应链|上下游|经销商|供应商/, key: 'scf', label: '关注供应链场景（上下游）', group: '目标' },
  { re: /上市|IPO|募集资金|辅导期/, key: 'ipo', label: '关注上市前后配套（专户 / 持股平台）', group: '目标' },
  { re: /保函|投标|中标|项目贷/, key: 'guarantee', label: '关注保函 / 项目类需求', group: '目标' },
  { re: /主办行|份额|主结算/, key: 'mainBank', label: '目标：提升份额至协办行 / 主办行', group: '目标' },
  { re: /半年|六个月|6\s*个月/, key: 'window', label: '时间窗：6 个月', group: '时间', value: () => 6 },
  { re: /一年|十二个月|12\s*个月|年内|全年/, key: 'window', label: '时间窗：12 个月', group: '时间', value: () => 12, excludes: ['window'] },
  { re: /一个季度|三个月|3\s*个月|季度内|季末/, key: 'window', label: '时间窗：3 个月', group: '时间', value: () => 3, excludes: ['window'] },
  { re: /(\d{1,2})\s*个月/, key: 'window', label: (m) => `时间窗：${m[1]} 个月`, group: '时间', value: (m) => Number(m[1]), excludes: ['window'] },
  { re: /董事长.{0,8}(技术|工程|研发|博士|专家)|技术出身|工程师出身|研发出身|技术型/, key: 'chairTech', label: '董事长技术出身：以技术 / 产业议题切入，少谈金融术语', group: '关键人' },
  { re: /董事长|实际控制人|老板|创始人/, key: 'chairFocus', label: '关键决策人：董事长', group: '关键人', excludes: ['chairTech'] },
  { re: /CFO|财务总监|财务负责人|资金部/, key: 'cfoFocus', label: '关键对接人：CFO / 财务总监', group: '关键人' },
  { re: /预算有限|低成本|成本低|不花钱|资源有限|少花钱|经费|费用有限|成本可控/, key: 'lowCost', label: '预算有限：优先低成本触达（引荐 / 沙龙 / 线上）', group: '资源' },
  { re: /行长|行领导|高层|领导(协访|出面|带队)|协访/, key: 'leaderVisit', label: '需要行领导协访', group: '资源' },
  { re: /不(打|要|搞|拼)价格战|不降价|不拼价格|不比价格|不靠价格/, key: 'noPriceWar', label: '不打价格战：以非价格因素竞争', group: '约束' },
  { re: /竞品|同业|他行|对手|竞争/, key: 'competitor', label: '需分析同业竞争态势', group: '范围' },
  { re: /稳妥|稳健|谨慎|不冒进|风险可控|合规优先|保守/, key: 'conservative', label: '风格：稳健，优先风险可控路径', group: '约束' },
  { re: /尽快|加急|抢|加快|速度|马上|越快越好/, key: 'fast', label: '节奏：加快推进', group: '时间' },
  { re: /授权|已授权/, key: 'authOnly', label: '仅使用客户已授权共享的信息', group: '约束' },
  { re: /同城|本地|就近|距离|同区|附近|周边/, key: 'geoNear', label: '优先地理邻近对象', group: '范围' },
  { re: /(排除|不要|不考虑|剔除|去掉|不含|避开)(.{0,6}?)(物流|冷链|食品|铝|建材|软件|医药|零售|农业|包装|塑料|电池|新能源|模具|机械|商贸|餐饮|跨境|地产)/, key: (m) => `exclude:${m[3]}`, label: (m) => `排除行业：${m[3]}`, group: '范围', value: (m) => m[3] },
  { re: /高风险|被执行|逾期|预警|红色/, key: 'excludeRisk', label: '排除风险预警客户', group: '约束' },
  { re: /(高新区|经开区|城东区|临港区|保税区|城北区|城南区)/, key: 'district', label: (m) => `聚焦区域：${m[1]}`, group: '范围', value: (m) => m[1] },
  { re: /只做|仅做|只考虑|聚焦/, key: 'focus', label: '范围收窄：只做明确聚焦的业务', group: '范围' },
];

/** 解析自由文本 → 约束列表（按出现顺序、按 key 去重；prev 用于保留用户已手动关闭的状态） */
export function parseIntent(text: string, prev: Constraint[] = [], rules: IntentRule[] = INTENT_RULES): Constraint[] {
  const out: Constraint[] = [];
  const has = (k: string) => out.some((c) => c.key === k);
  for (const r of rules) {
    const m = text.match(r.re);
    if (!m) continue;
    if (r.excludes?.some(has)) continue;
    const key = typeof r.key === 'function' ? r.key(m) : r.key;
    if (has(key)) continue;
    const old = prev.find((c) => c.key === key);
    out.push({ key, label: typeof r.label === 'function' ? r.label(m) : r.label, group: r.group, from: m[0], on: old ? old.on : true, value: r.value?.(m) });
  }
  return out;
}

export const isOn = (cons: Constraint[], key: string) => cons.some((c) => c.key === key && c.on);
export const valueOf = (cons: Constraint[], key: string) => cons.find((c) => c.key === key && c.on)?.value;
