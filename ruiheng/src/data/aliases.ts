/**
 * 业务口语 → 课程 / 能力点用语 的别名映射，供能力地图搜索使用。
 * 客户经理习惯说"票据 / 存款 / 开户"，而客户 xlsx 的能力点用的是"供应链金融 / 客户价值评估 / 目标客户"等说法。
 */
export const ALIASES: Record<string, string[]> = {
  票据: ['供应链金融', '银承', '授信建议'],
  存款: ['客户价值评估', '交叉销售', '联动策略'],
  开户: ['目标客户', '客户开发'],
  结算: ['客户行为分析', '交叉销售'],
  尽调: ['智能尽职调查'],
  流贷: ['授信建议生成', '额度测算'],
  固贷: ['授信建议生成', '额度测算'],
  续贷: ['贷后监控', '授信审查'],
  外汇: ['跨境金融'],
  结汇: ['跨境金融'],
  保理: ['供应链金融'],
  反洗钱: ['合规（由行内系统承担）'],
};

export interface AliasHit { alias: string; targets: string[] }
export interface ExpandedQuery { raw: string[]; terms: string[]; hits: AliasHit[] }

/** 去掉"（…）"备注，得到可用于全文匹配的检索词 */
const core = (s: string) => s.replace(/（.*?）/g, '').trim();

/** 把用户输入拆词并按别名表展开；返回原词、全部检索词与命中的别名说明 */
export function expandQuery(q: string): ExpandedQuery {
  const raw = q.split(/[\s,，、/／;；|]+/).map((s) => s.trim()).filter(Boolean);
  const terms = new Set<string>();
  const hits: AliasHit[] = [];
  for (const r of raw) {
    terms.add(r);
    for (const [alias, targets] of Object.entries(ALIASES)) {
      const matched = r.includes(alias) || (r.length >= 2 && alias.includes(r));
      if (!matched) continue;
      if (!hits.some((h) => h.alias === alias)) hits.push({ alias, targets });
      for (const t of targets) { const c = core(t); if (c) terms.add(c); }
    }
  }
  return { raw, terms: [...terms], hits };
}
