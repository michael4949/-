import { Type, Schema } from "@google/genai";
import { BidRunState, OutlineNode, ReviewIssue } from "../../bidTypes";
import { genJson, genText, BID_FAST_MODEL, runPool } from "./llm";
import { flattenLeaves, countChars } from "./budget";

/**
 * 工作流阶段④：合规审查。
 *  - 本地扫描：占位符（直接废标风险）、篇幅严重不足、生成失败的小节；
 *  - LLM 核对：实质性（★）条款是否都有承载小节（漏项 = 废标）；
 *  - 占位符问题自动改写修复；其余输出为“人工核实清单”。
 */

// “年 月 日”签署留空是规范格式，不算占位符
const PLACEHOLDER_RE = /XXX+|×××|\*\*\*+|【\s*】|［\s*］|（待[填补定]\S*）|\(待[填补定]\S*\)|待补充|待填写|某某(?:公司|单位|项目)|＿{3,}公司/;

const coverageSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    uncovered: {
      type: Type.ARRAY,
      description: "在大纲中找不到承载小节的实质性条款",
      items: {
        type: Type.OBJECT,
        properties: {
          clause: { type: Type.STRING, description: "条款原文" },
          reason: { type: Type.STRING, description: "为何判定未覆盖，以及建议补在哪一章" },
        },
        required: ["clause", "reason"],
      },
    },
  },
  required: ["uncovered"],
};

function leafTitleOf(outline: OutlineNode[], id: string): string {
  let found = "";
  const walk = (n: OutlineNode) => {
    if (n.id === id) found = n.title;
    n.children.forEach(walk);
  };
  outline.forEach(walk);
  return found || id;
}

export async function reviewBid(
  state: BidRunState,
  onLog?: (m: string) => void,
  signal?: AbortSignal
): Promise<ReviewIssue[]> {
  const issues: ReviewIssue[] = [];
  const leaves = flattenLeaves(state.outline!);

  // —— 本地扫描 ——
  for (const leaf of leaves) {
    const d = state.sections[leaf.id];
    if (!d || d.status !== "done" || !d.content.trim()) {
      issues.push({ sectionId: leaf.id, type: "short", detail: `《${leaf.title}》缺少内容` });
      continue;
    }
    const m = d.content.match(PLACEHOLDER_RE);
    if (m && leaf.kind !== "form") {
      issues.push({ sectionId: leaf.id, type: "placeholder", detail: `《${leaf.title}》出现占位符“${m[0]}”（直接废标风险）` });
    }
    if (d.chars < leaf.targetChars * 0.6) {
      issues.push({ sectionId: leaf.id, type: "short", detail: `《${leaf.title}》仅 ${d.chars} 字，不足目标（${leaf.targetChars} 字）的 60%` });
    }
  }
  onLog?.(`本地扫描完成：${issues.length} 个问题。正在核对实质性条款覆盖…`);

  // —— 实质性条款覆盖核对（一次调用，基于大纲标题与要点） ——
  if (state.tender!.mandatory.length) {
    const outlineDigest = leaves.map((l) => `${l.id} ${l.title}｜${l.brief}`).join("\n");
    try {
      const { uncovered } = await genJson<{ uncovered: Array<{ clause: string; reason: string }> }>({
        model: BID_FAST_MODEL,
        signal,
        temperature: 0.2,
        maxOutputTokens: 8192,
        jsonSchema: coverageSchema,
        prompt: `你是评标专家，正在做投标文件响应性检查。下面是招标文件的实质性（★）条款清单和投标文件的小节清单（编号 标题｜写作要点）。请找出**没有任何小节承载**的条款；能合理对应上的不要报。

# 实质性条款
${state.tender!.mandatory.map((m, i) => `${i + 1}. ${m}`).join("\n")}

# 投标文件小节清单
${outlineDigest}`,
      });
      for (const u of uncovered || []) {
        issues.push({ sectionId: "", type: "uncovered", detail: `实质性条款未覆盖：${u.clause}（${u.reason}）` });
      }
    } catch {
      issues.push({ sectionId: "", type: "manual", detail: "实质性条款覆盖核对调用失败，请人工对照招标文件逐条检查。" });
    }
  }

  // —— 固定的人工核实提醒（AI 无法替代的环节） ——
  issues.push(
    { sectionId: "", type: "manual", detail: "报价、资质证书、业绩合同、人员证书等须以真实扫描件替换/附后，并人工核对金额与编号。" },
    { sectionId: "", type: "manual", detail: "投标函、承诺函等须法定代表人（或授权代表）签字并加盖公章后方可生效。" }
  );

  onLog?.(`审查完成：共 ${issues.length} 项（含人工核实提醒）。`);
  return issues;
}

/** 自动修复占位符问题：改写对应小节中含占位符的表述 */
export async function autofixIssues(
  state: BidRunState,
  issues: ReviewIssue[],
  onLog?: (m: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const fixable = issues.filter((i) => i.type === "placeholder" && i.sectionId);
  if (!fixable.length) return;
  onLog?.(`自动修复 ${fixable.length} 个占位符问题…`);
  await runPool(
    fixable,
    Math.min(3, state.options.concurrency),
    async (issue) => {
      const d = state.sections[issue.sectionId];
      if (!d) return;
      const fixed = await genText({
        model: BID_FAST_MODEL,
        signal,
        temperature: 0.3,
        maxOutputTokens: 16384,
        prompt: `下面是投标文件小节《${leafTitleOf(state.outline!, issue.sectionId)}》的内容，其中含有占位符（如 XXX、【】、待补充、某某公司等），这在评标中会被认定为重大缺陷。

请输出**修改后的完整正文**：把所有占位符改为稳妥表述——投标人一律称“我方”或“我公司”，项目称“本项目”，不确定的具体数字改为符合行业惯例的合理承诺表述。除此之外不要改动其他内容，保持原有格式（编号、表格、加粗）。

"""
${d.content}
"""`,
      });
      d.content = fixed.trim();
      d.chars = countChars(d.content);
      issue.fixed = !PLACEHOLDER_RE.test(d.content);
    },
    signal
  );
  onLog?.("占位符修复完成。");
}
