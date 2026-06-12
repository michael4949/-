import { Type, Schema } from "@google/genai";
import { TenderProfile, BidOptions } from "../../bidTypes";
import { genJson, BID_FAST_MODEL, BID_SMART_MODEL, throwIfAborted } from "./llm";

/**
 * 工作流阶段①：解析招标文件。
 * 招标文件常有上百页：按 9 万字分块抽取，再本地合并（数组拼接去重、标量择优）。
 */

const profileSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING, description: "项目名称（完整）" },
    tenderNo: { type: Type.STRING, description: "招标编号/采购编号" },
    purchaser: { type: Type.STRING, description: "招标人/采购人名称" },
    agent: { type: Type.STRING, description: "招标代理机构名称" },
    budget: { type: Type.STRING, description: "预算金额或最高限价（含单位）" },
    duration: { type: Type.STRING, description: "工期/交货期/服务期要求" },
    location: { type: Type.STRING, description: "项目实施地点" },
    industry: { type: Type.STRING, description: "项目类型：工程/货物/服务，及所属行业" },
    overview: { type: Type.STRING, description: "项目概况与建设（采购）内容，200-500字" },
    techRequirements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "技术需求/采购需求要点，逐条" },
    scoring: {
      type: Type.ARRAY,
      description: "评分办法逐项（商务分/技术分/价格分各子项）",
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: "评分项名称" },
          score: { type: Type.STRING, description: "分值" },
          requirement: { type: Type.STRING, description: "评分标准原文要点" },
        },
        required: ["item", "score", "requirement"],
      },
    },
    mandatory: { type: Type.ARRAY, items: { type: Type.STRING }, description: "实质性（★）要求与否决（废标）条款，逐条原意保留" },
    formatRules: { type: Type.ARRAY, items: { type: Type.STRING }, description: "投标文件编制、组成、格式、装订、签字盖章要求" },
    docRequirements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "要求随投标文件提供的证明材料清单" },
  },
  required: ["projectName", "overview", "scoring", "mandatory"],
};

const CHUNK = 90_000;
const OVERLAP = 2_000;

function chunkText(text: string): string[] {
  if (text.length <= CHUNK) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK - OVERLAP) chunks.push(text.slice(i, i + CHUNK));
  return chunks;
}

function dedupe(arr: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const s = (raw || "").trim();
    if (!s) continue;
    const key = s.replace(/\s/g, "").slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function mergeProfiles(parts: TenderProfile[]): TenderProfile {
  const scalar = (k: keyof TenderProfile) => {
    const vals = parts.map((p) => (p[k] as string) || "").filter((v) => v.trim());
    return vals.sort((a, b) => b.length - a.length)[0] || "";
  };
  const scoringSeen = new Set<string>();
  const scoring = parts.flatMap((p) => p.scoring || []).filter((s) => {
    const key = `${s.item}|${s.score}`.replace(/\s/g, "");
    if (scoringSeen.has(key)) return false;
    scoringSeen.add(key);
    return true;
  });
  return {
    projectName: scalar("projectName"),
    tenderNo: scalar("tenderNo"),
    purchaser: scalar("purchaser"),
    agent: scalar("agent"),
    budget: scalar("budget"),
    duration: scalar("duration"),
    location: scalar("location"),
    industry: scalar("industry"),
    overview: scalar("overview"),
    techRequirements: dedupe(parts.flatMap((p) => p.techRequirements || [])),
    scoring,
    mandatory: dedupe(parts.flatMap((p) => p.mandatory || [])),
    formatRules: dedupe(parts.flatMap((p) => p.formatRules || [])),
    docRequirements: dedupe(parts.flatMap((p) => p.docRequirements || [])),
  };
}

export async function parseTender(
  tenderText: string,
  options: BidOptions,
  onLog?: (m: string) => void,
  signal?: AbortSignal
): Promise<TenderProfile> {
  const model = options.smartModel ? BID_SMART_MODEL : BID_FAST_MODEL;
  const chunks = chunkText(tenderText.trim());
  onLog?.(`招标文件共 ${tenderText.length.toLocaleString()} 字，分 ${chunks.length} 段解析（${model}）…`);

  const parts: TenderProfile[] = [];
  for (let i = 0; i < chunks.length; i++) {
    throwIfAborted(signal);
    const part = await genJson<TenderProfile>({
      model,
      signal,
      temperature: 0.2,
      maxOutputTokens: 32768, // pro 的思考 token 也计入上限，留足余量
      jsonSchema: profileSchema,
      prompt: `你是资深招投标专家。请从下面这份招标文件${chunks.length > 1 ? `的第 ${i + 1}/${chunks.length} 段` : ""}中，严格按 JSON Schema 抽取关键信息。

要求：
- 只抽取原文中确实存在的信息，绝不编造；本段没有的字段留空字符串/空数组。
- 「实质性（★）要求与否决条款」务必逐条完整收录——漏一条就可能废标。
- 「评分办法」逐子项收录，分值照抄原文。

招标文件内容：
"""
${chunks[i]}
"""`,
    });
    parts.push(part);
    onLog?.(`第 ${i + 1}/${chunks.length} 段解析完成`);
  }

  const merged = chunks.length === 1 ? parts[0] : mergeProfiles(parts);
  // 容错：保证数组字段存在
  merged.techRequirements ||= [];
  merged.scoring ||= [];
  merged.mandatory ||= [];
  merged.formatRules ||= [];
  merged.docRequirements ||= [];
  onLog?.(
    `解析完成：《${merged.projectName || "未识别项目名"}》· 评分项 ${merged.scoring.length} 条 · 实质性条款 ${merged.mandatory.length} 条`
  );
  return merged;
}

/** 事实表（给每个写作 prompt 用的紧凑上下文） */
export function tenderBrief(t: TenderProfile): string {
  const lines = [
    `项目名称：${t.projectName || "（以招标文件为准）"}`,
    t.tenderNo && `招标编号：${t.tenderNo}`,
    t.purchaser && `招标人/采购人：${t.purchaser}`,
    t.agent && `招标代理：${t.agent}`,
    t.budget && `预算/最高限价：${t.budget}`,
    t.duration && `工期/服务期：${t.duration}`,
    t.location && `项目地点：${t.location}`,
    t.industry && `项目类型：${t.industry}`,
    t.overview && `项目概况：${t.overview}`,
  ].filter(Boolean);
  return lines.join("\n");
}
