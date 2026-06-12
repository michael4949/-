import { BidOptions, CompanyProfile, OutlineNode, TenderProfile, NodeKind } from "../../bidTypes";
import { genJson, runPool } from "./llm";
import { LAYOUTS, allocateBudgets } from "./budget";
import { tenderBrief } from "./tenderService";

/**
 * 工作流阶段②：编制投标文件大纲（Claude Fable 5 · effort=high）。
 * 两步：1) 一次调用生成章级骨架（含篇幅占比）；2) 并行把每章细化到叶子小节（≤3 级），
 * 最后按目标页数把字数预算分配到每个叶子。
 */

const KIND = { type: "string", enum: ["prose", "table", "form"], description: "内容形态：正文/表格为主/函件表单" };

const skeletonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    chapters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "章标题，不带编号，如“技术方案”" },
          brief: { type: "string", description: "本章定位与必须覆盖的评分点/实质性要求，60-150字" },
          sharePercent: { type: "number", description: "本章占全文篇幅百分比，所有章合计=100" },
          kind: KIND,
        },
        required: ["title", "brief", "sharePercent", "kind"],
      },
    },
  },
  required: ["chapters"],
};

interface RawLeaf { title: string; brief: string; weight: number; kind: NodeKind; children?: RawLeaf[] }

function sectionLevelSchema(depth: number): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      brief: { type: "string", description: "写作要点：必须覆盖的内容/对应评分点，30-100字" },
      weight: { type: "number", description: "篇幅权重1-5，5最长" },
      kind: KIND,
      ...(depth > 0 ? { children: { type: "array", items: sectionLevelSchema(depth - 1) } } : {}),
    },
    required: depth > 0 ? ["title", "brief", "weight", "kind", "children"] : ["title", "brief", "weight", "kind"],
  };
  return base;
}

const expandSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sections: {
      type: "array",
      description: "本章的小节树，最多再嵌套 2 层（即 章→节→小节→目）；无下级时 children 给空数组",
      items: sectionLevelSchema(2),
    },
  },
  required: ["sections"],
};

function scoringDigest(t: TenderProfile, max = 40): string {
  return t.scoring.slice(0, max).map((s) => `- ${s.item}（${s.score}）：${s.requirement}`).join("\n");
}

function toNodes(raw: RawLeaf[], parentId: string, level: number): OutlineNode[] {
  return (raw || []).filter((r) => r.title?.trim()).map((r, i) => {
    const id = parentId ? `${parentId}.${i + 1}` : String(i + 1);
    const children = level < 3 ? toNodes(r.children || [], id, level + 1) : [];
    return {
      id,
      title: r.title.trim().replace(/^[第（(一二三四五六七八九十\d章节部分、．.）)\s]+(?=\S)/, ""),
      brief: (r.brief || "").trim(),
      level,
      kind: (["prose", "table", "form"].includes(r.kind) ? r.kind : "prose") as NodeKind,
      targetChars: Math.max(1, Math.round(r.weight || 3)),
      children,
    };
  });
}

export async function buildOutline(
  tender: TenderProfile,
  company: CompanyProfile,
  options: BidOptions,
  onLog?: (m: string) => void,
  signal?: AbortSignal
): Promise<OutlineNode[]> {
  const layout = LAYOUTS[options.layout];
  onLog?.(`正在编制 ${options.targetPages} 页投标文件的章级框架…`);

  const baseCtx = `# 项目信息
${tenderBrief(tender)}

# 评分办法（投标文件必须逐项覆盖以拿满分）
${scoringDigest(tender)}

# 实质性（★）条款（漏一条即废标，框架必须保证全部有承载章节）
${tender.mandatory.slice(0, 40).map((m, i) => `${i + 1}. ${m}`).join("\n")}

# 招标文件对投标文件组成/格式的要求
${tender.formatRules.slice(0, 25).map((f) => `- ${f}`).join("\n") || "（招标文件未特别规定，按行业惯例编排）"}`;

  const { chapters } = await genJson<{ chapters: Array<{ title: string; brief: string; sharePercent: number; kind: NodeKind }> }>({
    signal,
    effort: "high",
    maxOutputTokens: 16000,
    jsonSchema: skeletonSchema,
    prompt: `你是国内资深投标文件（标书）编制专家。请为下述项目设计一份目标 ${options.targetPages} 页投标文件的章级框架（10-16 章）。

${baseCtx}

# 框架要求
1. 若招标文件规定了投标文件组成顺序，严格照其顺序；否则按惯例：投标函及投标函附录 → 法定代表人身份证明及授权委托书 → 商务部分（资格证明文件、类似业绩、财务状况）→ 技术部分（总体方案、实施/施工组织方案、人员与设备配置、质量保证、安全文明、进度计划、应急预案、售后服务与培训）→ ${options.includeDeviationTables ? "商务及技术偏差（响应）表 → " : ""}其他补充材料。
2. 技术部分是评分大头，合计篇幅占比应在 55%-70%。
3. 每一个评分子项、每一条实质性条款都必须能落到某一章；brief 里写明对应关系。
4. sharePercent 全部章节合计必须等于 100。`,
  });

  if (!chapters?.length) throw new Error("章级框架生成失败，请重试。");
  onLog?.(`框架完成：${chapters.length} 章。正在逐章细化小节（并行）…`);

  const outline: OutlineNode[] = chapters.map((c, i) => ({
    id: String(i + 1),
    title: c.title.trim(),
    brief: c.brief?.trim() || "",
    level: 0,
    kind: (["prose", "table", "form"].includes(c.kind) ? c.kind : "prose") as NodeKind,
    targetChars: 0,
    children: [],
  }));

  const totalChars = options.targetPages * layout.charsPerPageEffective;
  let doneCount = 0;

  await runPool(
    chapters.map((c, i) => ({ c, i })),
    3,
    async ({ c, i }) => {
      const chapterChars = Math.round((Math.max(1, c.sharePercent) / 100) * totalChars);
      const leafGuess = Math.min(70, Math.max(2, Math.round(chapterChars / 2200)));
      const { sections } = await genJson<{ sections: RawLeaf[] }>({
        signal,
        effort: "high",
        maxOutputTokens: 32000,
        jsonSchema: expandSchema,
        prompt: `你是国内资深投标文件编制专家。请细化投标文件第 ${i + 1} 章《${c.title}》的小节结构。

${baseCtx}

# 本章定位
${c.brief}

# 细化要求
1. 输出小节树（最多嵌套到 3 层），**叶子小节总数约 ${leafGuess} 个**（本章篇幅约 ${chapterChars.toLocaleString()} 字，每个叶子 1500-3500 字为宜；函件/表格类章节叶子可少而精）。
2. 每个叶子的 brief 写清楚要覆盖的具体内容点和对应的评分点/实质性条款，避免与兄弟小节重复。
3. 命中评分点的小节 weight 给 4-5；铺垫性内容给 1-2。
4. 标题用规范的标书语言，不要带任何编号。`,
      });
      outline[i].children = toNodes(sections || [], outline[i].id, 1);
      doneCount++;
      onLog?.(`第 ${i + 1} 章《${c.title}》细化完成（${doneCount}/${chapters.length}）`);
    },
    signal
  );

  // 章下若没细化出内容，把章自身当叶子兜底
  const total = allocateBudgets(outline, options.targetPages, layout);
  onLog?.(`大纲完成：预算正文约 ${total.toLocaleString()} 字（目标 ${options.targetPages} 页）。`);
  return outline;
}
