import { BidRunState, CompanyProfile, OutlineNode, SectionDraft, WriteProgress } from "../../bidTypes";
import { genText, BID_FAST_MODEL, runPool, throwIfAborted } from "./llm";
import { LAYOUTS, flattenLeaves, countChars, estimatePagesFromChars, headingNo } from "./budget";
import { tenderBrief } from "./tenderService";

/**
 * 工作流阶段③：分章并发撰写正文。
 *  - 每个叶子小节一个写作任务；产出不足目标字数的 88% 时自动“续写”（最多 5 轮）；
 *  - 全部写完后若估算页数仍不足目标的 97%，挑缺口最大的小节自动“扩写”补足；
 *  - 每节完成即回调 onSectionDone（外层落盘 IndexedDB），刷新/中断后可跳过已完成小节续跑。
 */

export interface WriteEvents {
  onProgress?: (p: WriteProgress) => void;
  onLog?: (m: string) => void;
  onSectionDone?: (draft: SectionDraft) => void | Promise<void>;
}

const CONTINUE_THRESHOLD = 0.88;
const MAX_ROUNDS = 5;

function companyFacts(c: CompanyProfile): string {
  const line = (label: string, v: string) => (v?.trim() ? `${label}：${v.trim()}` : "");
  return [
    line("投标人全称", c.name),
    line("统一社会信用代码", c.creditCode),
    line("注册资本", c.regCapital),
    line("成立时间", c.founded),
    line("注册地址", c.address),
    line("法定代表人", c.legalPerson),
    line("联系人及电话", c.contact),
    line("资质证书", c.qualifications),
    line("类似业绩", c.achievements),
    line("拟投入主要人员", c.keyStaff),
    line("获奖/信用情况", c.honors),
    line("财务概况", c.financial),
    line("其他补充", c.extra),
  ].filter(Boolean).join("\n") || "（投标人未提供详细资料）";
}

/** 大纲地图：全部章标题 + 当前章内各级小节标题，用于避免内容重复、保持衔接 */
function outlineMap(outline: OutlineNode[], chapterIdx: number): string {
  const chapters = outline.map((c, i) => `${headingNo(0, i + 1)}${c.title}`).join("；");
  const lines: string[] = [];
  const walk = (n: OutlineNode, depth: number) => {
    lines.push(`${"  ".repeat(depth)}- ${n.title}`);
    n.children.forEach((ch) => walk(ch, depth + 1));
  };
  outline[chapterIdx]?.children.forEach((n) => walk(n, 0));
  return `全文章节：${chapters}\n当前章《${outline[chapterIdx]?.title}》结构：\n${lines.join("\n")}`;
}

function chapterIndexOf(id: string): number {
  return parseInt(id.split(".")[0], 10) - 1;
}

const KIND_RULES: Record<string, string> = {
  prose: "以论述性正文为主，可穿插少量要点列表或小型表格。",
  table: "以表格为主：用 Markdown 表格（| 列 | 列 |）逐条列出，配少量说明文字。",
  form: "按规范函件/表单格式撰写：称谓（致：招标人全称）、正文承诺条款、落款（投标人全称、法定代表人或授权代表签字处、日期“____年____月____日”留空待签）。",
};

function buildPrompt(state: BidRunState, leaf: OutlineNode, extra: string): string {
  const tender = state.tender!;
  const chIdx = chapterIndexOf(leaf.id);
  const isResponseTable = leaf.kind === "table" && /偏差|响应|对照/.test(leaf.title);
  const mandatoryCtx = isResponseTable
    ? `\n# 招标文件实质性（★）条款（须逐条响应，响应一律为“完全响应/无偏差”并写明依据）\n${tender.mandatory.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n`
    : "";

  return `你是国内一流的投标文件撰写专家，正在为下述项目编写投标文件中的一个小节。

# 项目信息
${tenderBrief(tender)}

# 投标人事实表（所有表述必须与此一致；表中没有的证书编号、合同金额、人名等具体信息一律不得编造，用稳妥的通用表述代替）
${companyFacts(state.company!)}
${mandatoryCtx}
# 大纲位置（其他小节会单独撰写，严禁写入它们的内容）
${outlineMap(state.outline!, chIdx)}

# 本次任务：撰写小节《${leaf.title}》
写作要点：${leaf.brief || "围绕标题展开"}
目标篇幅：约 ${leaf.targetChars} 个汉字（不得低于 ${Math.round(leaf.targetChars * 0.9)} 字）
内容形态：${KIND_RULES[leaf.kind] || KIND_RULES.prose}

# 写作规范（必须遵守）
1. 直接输出正文，**不要**输出本小节标题，**不要**用 #、## 等 Markdown 标题。
2. 小节内部层次依次用「1.」「(1)」「①」编号；要点列表可用「- 」；表格用 Markdown 表格；关键承诺可用 **加粗**。
3. 庄重的书面语，符合国内招投标行文习惯；针对本项目具体展开（结合项目概况、地点、工期），拒绝放之四海而皆准的空话。
4. **严禁出现任何占位符**：如“XXX”“××公司”“【】”“（待补充）”“某某”等。信息不足时用“我方”“本项目”等指代。
5. 数字、工期、质保期、报价相关表述必须与项目信息和投标人事实表一致，不得自相矛盾。
${extra}`;
}

async function writeLeaf(
  state: BidRunState,
  leaf: OutlineNode,
  onCall: () => void,
  signal?: AbortSignal
): Promise<string> {
  let content = "";
  let rounds = 0;
  while (rounds < MAX_ROUNDS) {
    throwIfAborted(signal);
    const written = countChars(content);
    const remain = leaf.targetChars - written;
    const extra = content
      ? `\n# 续写说明\n你已写出 ${written} 字，还差约 ${remain} 字。下面是已写内容的结尾，请**紧接着续写新的内容**（不要重复、不要总结收尾、不要重新开头）：\n"""${content.slice(-600)}"""`
      : "";
    onCall();
    const piece = await genText({
      model: BID_FAST_MODEL,
      prompt: buildPrompt(state, leaf, extra),
      temperature: 0.55,
      maxOutputTokens: 8192,
      signal,
    });
    content = content ? `${content}\n\n${piece.trim()}` : piece.trim();
    rounds++;
    if (countChars(content) >= leaf.targetChars * CONTINUE_THRESHOLD) break;
  }
  return content;
}

function makeProgress(state: BidRunState, leaves: OutlineNode[], active: Set<string>, calls: number): WriteProgress {
  const layout = LAYOUTS[state.options.layout];
  const drafts = Object.values(state.sections).filter((s) => s.status === "done");
  const totalChars = drafts.reduce((s, d) => s + d.chars, 0);
  return {
    totalLeaves: leaves.length,
    doneLeaves: drafts.length,
    totalChars,
    targetChars: leaves.reduce((s, l) => s + l.targetChars, 0),
    estPages: estimatePagesFromChars(totalChars, state.outline!, layout),
    targetPages: state.options.targetPages,
    activeTitles: leaves.filter((l) => active.has(l.id)).map((l) => l.title),
    calls,
  };
}

export async function writeAllSections(state: BidRunState, events: WriteEvents, signal?: AbortSignal): Promise<number> {
  const leaves = flattenLeaves(state.outline!);
  const active = new Set<string>();
  let calls = state.stats?.calls || 0;
  const emit = () => events.onProgress?.(makeProgress(state, leaves, active, calls));
  const onCall = () => { calls++; };

  const pending = leaves.filter((l) => state.sections[l.id]?.status !== "done");
  events.onLog?.(`共 ${leaves.length} 个小节，待写 ${pending.length} 个（并发 ${state.options.concurrency} 路）…`);
  emit();

  await runPool(
    pending,
    state.options.concurrency,
    async (leaf) => {
      active.add(leaf.id);
      state.sections[leaf.id] = { id: leaf.id, status: "writing", content: "", chars: 0, rounds: 0 };
      emit();
      try {
        const content = await writeLeaf(state, leaf, onCall, signal);
        const draft: SectionDraft = { id: leaf.id, status: "done", content, chars: countChars(content), rounds: 1 };
        state.sections[leaf.id] = draft;
        await events.onSectionDone?.(draft);
      } catch (e) {
        state.sections[leaf.id] = {
          id: leaf.id, status: "error", content: "", chars: 0, rounds: 0,
          error: e instanceof Error ? e.message : String(e),
        };
        throw e;
      } finally {
        active.delete(leaf.id);
        emit();
      }
    },
    signal
  );

  // —— 页数兜底：估算页数不足时，对缺口最大的小节自动扩写 ——
  const layout = LAYOUTS[state.options.layout];
  for (let round = 0; round < 2; round++) {
    const totalChars = Object.values(state.sections).reduce((s, d) => s + d.chars, 0);
    const estPages = estimatePagesFromChars(totalChars, state.outline!, layout);
    if (estPages >= state.options.targetPages * 0.97) break;
    const deficitChars = Math.round((state.options.targetPages - estPages) * layout.charsPerPageEffective);
    const worst = leaves
      .map((l) => ({ l, gap: l.targetChars - (state.sections[l.id]?.chars || 0) }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, Math.max(3, Math.ceil(deficitChars / 1800)));
    events.onLog?.(`当前约 ${estPages} 页，距目标差约 ${deficitChars.toLocaleString()} 字，自动扩写 ${worst.length} 个小节…`);

    await runPool(
      worst,
      state.options.concurrency,
      async ({ l }) => {
        const draft = state.sections[l.id];
        if (!draft) return;
        active.add(l.id);
        emit();
        try {
          onCall();
          const addition = await genText({
            model: BID_FAST_MODEL,
            temperature: 0.6,
            maxOutputTokens: 8192,
            signal,
            prompt: buildPrompt(
              state, l,
              `\n# 扩写说明\n该小节已有约 ${draft.chars} 字（结尾如下），请在**不重复**的前提下补充约 ${Math.min(2500, Math.max(800, l.targetChars))} 字的新内容：增加落地细节、量化指标、本项目针对性措施或必要表格。直接输出新增正文。\n"""${draft.content.slice(-600)}"""`
            ),
          });
          draft.content = `${draft.content}\n\n${addition.trim()}`;
          draft.chars = countChars(draft.content);
          draft.rounds++;
          await events.onSectionDone?.(draft);
        } finally {
          active.delete(l.id);
          emit();
        }
      },
      signal
    );
  }

  emit();
  return calls;
}
