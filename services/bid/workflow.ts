import { BidOptions, BidRunState, BidStage, BidStageId, CompanyProfile, WriteProgress } from "../../bidTypes";
import { parseTender } from "./tenderService";
import { buildOutline } from "./outlineService";
import { writeAllSections } from "./writerService";
import { reviewBid, autofixIssues } from "./reviewService";
import { renderToBlob } from "./docxRender";
import { LAYOUTS, estimatePagesFromChars, flattenLeaves } from "./budget";
import { saveRun, saveRunThrottled } from "./store";

/**
 * 标书生成工作流（编排器）。五个阶段，两段执行：
 *
 *   ① parse 解析招标文件 ─→ ② outline 编制大纲 ─→ 〔人工审阅大纲〕
 *      ─→ ③ write 分章并发撰写 ─→ ④ review 合规审查(+自动修复) ─→ ⑤ render 国标板式排版
 *
 * 人工审阅是两段之间的强制闸口：大纲（章节/篇幅）确认后才进入大批量生成。
 * 全程每个小节完成即落盘，可随时暂停/刷新后断点续跑。
 */

export const STAGE_DEFS: Array<{ id: BidStageId; label: string }> = [
  { id: "parse", label: "解析招标文件（项目信息 / 评分办法 / 实质性条款）" },
  { id: "outline", label: "编制大纲并分配页数预算（人工可调整）" },
  { id: "write", label: "分章并发撰写正文（自动续写直至达到目标页数）" },
  { id: "review", label: "合规审查（占位符 / 漏项 / 实质性条款响应）" },
  { id: "render", label: "按国标板式排版生成 Word 投标文件" },
];

export function initialStages(): BidStage[] {
  return STAGE_DEFS.map((s) => ({ ...s, status: "pending" }));
}

export interface WorkflowEvents {
  onStage?: (id: BidStageId, status: BidStage["status"], detail?: string) => void;
  onLog?: (m: string) => void;
  onProgress?: (p: WriteProgress) => void;
}

export function newRunState(tenderText: string, company: CompanyProfile, options: BidOptions): BidRunState {
  return {
    id: `run-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    stage: "parse",
    options,
    company,
    // 原文超长时只保留前 60 万字用于断点恢复（解析阶段仍用完整文本）
    tenderText: tenderText.slice(0, 600_000),
    sections: {},
  };
}

/** 第一段：解析 + 大纲（结束后进入人工审阅闸口） */
export async function runPrepare(
  state: BidRunState,
  fullTenderText: string,
  ev: WorkflowEvents,
  signal?: AbortSignal
): Promise<void> {
  ev.onStage?.("parse", "active");
  state.stage = "parse";
  state.tender = await parseTender(fullTenderText, state.options, ev.onLog, signal);
  await saveRun(state);
  ev.onStage?.("parse", "done", `评分项 ${state.tender.scoring.length} 条 · 实质性条款 ${state.tender.mandatory.length} 条`);

  ev.onStage?.("outline", "active");
  state.stage = "outline";
  state.outline = await buildOutline(state.tender, state.company!, state.options, ev.onLog, signal);
  state.stage = "outline-review";
  await saveRun(state);
  const leaves = flattenLeaves(state.outline);
  ev.onStage?.("outline", "done", `${state.outline.length} 章 · ${leaves.length} 个小节`);
}

/** 第二段：大纲确认后 → 撰写 → 审查 → 排版。支持断点续跑（跳过已完成小节）。 */
export async function runProduce(
  state: BidRunState,
  ev: WorkflowEvents,
  signal?: AbortSignal
): Promise<{ blob: Blob; fileName: string }> {
  const started = Date.now();
  const prevMs = state.stats?.ms || 0; // 断点续跑时累计之前的耗时
  const layout = LAYOUTS[state.options.layout];

  ev.onStage?.("write", "active");
  state.stage = "write";
  await saveRun(state);
  const calls = await writeAllSections(
    state,
    {
      onLog: ev.onLog,
      onProgress: ev.onProgress,
      onSectionDone: () => saveRunThrottled(state),
    },
    signal
  );

  const chars = Object.values(state.sections).reduce((s, d) => s + d.chars, 0);
  const estPages = estimatePagesFromChars(chars, state.outline!, layout);
  state.stats = { chars, estPages, calls, ms: prevMs + (Date.now() - started) };
  ev.onStage?.("write", "done", `${chars.toLocaleString()} 字 · 约 ${estPages} 页`);

  ev.onStage?.("review", "active");
  state.stage = "review";
  state.issues = await reviewBid(state, ev.onLog, signal);
  await autofixIssues(state, state.issues, ev.onLog, signal);
  await saveRun(state);
  const remainIssues = state.issues.filter((i) => !i.fixed).length;
  ev.onStage?.("review", "done", `${remainIssues} 项待人工核实`);

  ev.onStage?.("render", "active");
  state.stage = "render";
  ev.onLog?.("正在按板式排版生成 .docx（大文件需要十几秒）…");
  const artifact = await renderToBlob(state);
  state.stage = "done";
  const finalChars = Object.values(state.sections).reduce((s, d) => s + d.chars, 0);
  state.stats = {
    chars: finalChars,
    estPages: estimatePagesFromChars(finalChars, state.outline!, layout),
    calls: state.stats?.calls || 0,
    ms: prevMs + (Date.now() - started),
  };
  await saveRun(state);
  ev.onStage?.("render", "done", artifact.fileName);
  return artifact;
}
