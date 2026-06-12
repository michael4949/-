/**
 * 标书工厂离线冒烟测试（不调用任何模型）：
 *   预算分配 → Markdown-lite 解析 → 国标板式 docx 渲染 → 用自研 zip 读取器回读校验。
 * 运行：npm run smoke:bid
 */
import { LAYOUTS, allocateBudgets, estimatePagesFromChars, flattenLeaves, headingNo, toCn } from "../services/bid/budget";
import { parseBlocks, splitBoldRuns } from "../services/bid/blocks";
import { renderToBuffer } from "../services/bid/docxRender";
import { documentXmlToText, extractDocxText } from "../services/bid/docxText";
import { BidRunState, OutlineNode } from "../bidTypes";

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

function leaf(id: string, title: string, level: number, weight = 3): OutlineNode {
  return { id, title, brief: `${title}写作要点`, level, kind: "prose", targetChars: weight, children: [] };
}

// —— 1. 中文编号 ——
check("中文数字", toCn(1) === "一" && toCn(12) === "十二" && toCn(23) === "二十三");
check("标题编号", headingNo(0, 2) === "第二章　" && headingNo(2, 1) === "（一）");

// —— 2. 预算分配：500 页目标 ——
const outline: OutlineNode[] = [
  { ...leaf("1", "投标函", 0), children: [leaf("1.1", "投标函正文", 1, 1), leaf("1.2", "投标函附录", 1, 1)] },
  { ...leaf("2", "技术方案", 0), children: Array.from({ length: 100 }, (_, i) => leaf(`2.${i + 1}`, `技术小节${i + 1}`, 1, 5)) },
  { ...leaf("3", "售后服务", 0), children: [leaf("3.1", "服务承诺", 1, 3), leaf("3.2", "应急预案", 1, 3)] },
];
const layout = LAYOUTS.gbGov;
const total = allocateBudgets(outline, 500, layout);
const leaves = flattenLeaves(outline);
const expect = 500 * layout.charsPerPageEffective;
check("预算总量贴近目标", Math.abs(total - expect) / expect < 0.12, `${total.toLocaleString()} 字 vs 目标 ${expect.toLocaleString()} 字`);
check("叶子预算有上下限", leaves.every((l) => l.targetChars >= 600 && l.targetChars <= 6000));
const est = estimatePagesFromChars(total, outline, layout);
check("写满预算后页数达标", est >= 500 * 0.95, `估算 ${est} 页`);

// 极端情况：审阅时删得只剩少量小节，仍应通过取消上限保住页数目标
const tiny: OutlineNode[] = [{ ...leaf("1", "技术方案", 0), children: [leaf("1.1", "方案一", 1, 1), leaf("1.2", "方案二", 1, 1)] }];
const tinyTotal = allocateBudgets(tiny, 100, layout);
check("叶子过少时取消上限保页数", tinyTotal >= 100 * layout.charsPerPageEffective * 0.95, `${tinyTotal.toLocaleString()} 字`);

// —— 3. Markdown-lite 解析 ——
const md = `本项目采用**三级质量保证体系**进行管控。

| 阶段 | 控制要点 | 责任人 |
| --- | --- | --- |
| 事前 | 图纸会审 | 项目总工 |
| 事中 | 工序验收 | 质检员 |

- 落实样板引路制度
- 实行首件验收

#### 不该出现的标题
1. 第一项措施内容。`;
const blocks = parseBlocks(md);
check("解析出段落/表格/列表", JSON.stringify(blocks.map((b) => b.t)) === JSON.stringify(["p", "table", "li", "li", "p", "p"]));
const table = blocks[1] as Extract<(typeof blocks)[0], { t: "table" }>;
check("表格 3 行（分隔行剔除）且表头标记", table.rows.length === 3 && table.headerRows === 1);
check("# 标题被降级为加粗段", (blocks[4] as { bold?: boolean }).bold === true);
check("加粗内联切分", splitBoldRuns("含**重点**承诺").map((r) => `${r.text}:${r.bold}`).join("|") === "含:false|重点:true|承诺:false");

// —— 4. docx 渲染 + 自研 zip 读取器回读 ——
const sections: BidRunState["sections"] = {};
for (const l of leaves) {
  sections[l.id] = { id: l.id, status: "done", content: `${l.title}的正文内容。\n\n${md}`, chars: 200, rounds: 1 };
}
const state: BidRunState = {
  id: "smoke", createdAt: 0, updatedAt: 0, stage: "render",
  options: { targetPages: 500, layout: "gbGov", smartModel: false, concurrency: 3, includeDeviationTables: true },
  tenderText: "",
  tender: {
    projectName: "XX市智慧水务管理平台建设项目", tenderNo: "ZB-2026-0612", purchaser: "XX市水务局",
    agent: "", budget: "1860万元", duration: "12个月", location: "XX市", industry: "信息化工程",
    overview: "建设智慧水务平台。", techRequirements: [], scoring: [], mandatory: [], formatRules: [], docRequirements: [],
  },
  company: {
    name: "测试建设集团有限公司", creditCode: "", regCapital: "", founded: "", address: "", legalPerson: "",
    contact: "", qualifications: "", achievements: "", keyStaff: "", honors: "", financial: "", extra: "",
  },
  outline, sections,
};

const buf = await renderToBuffer(state);
check("docx 文件生成", buf.length > 15_000, `${(buf.length / 1024).toFixed(0)} KB · ${leaves.length} 节`);

const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
const text = await extractDocxText(ab);
check("zip 读取器抽出正文", text.includes("三级质量保证体系") && text.includes("投标函"), `${text.length.toLocaleString()} 字`);
check("封面信息在正文中", text.includes("XX市智慧水务管理平台建设项目") && text.includes("测试建设集团有限公司"));
check("章节编号渲染", text.includes("第一章") && text.includes("第二章"));
check("documentXmlToText 实体解码", documentXmlToText("<w:p><w:t>A&amp;B&lt;C</w:t></w:p>") === "A&B<C");

if (failures) {
  console.error(`\n${failures} 项未通过`);
  process.exit(1);
}
console.log("\n全部通过 🎉");
