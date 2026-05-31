import { Type, Schema } from "@google/genai";
import { getClient, TEXT_MODEL, parseJsonLoose } from "./genai";
import { SourceMaterial, VideoOptions, VideoPlan, Scene } from "../types";

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    // —— 先做内容分析（神 > 形）：把这几项想透，再写分镜 ——
    angle: { type: Type.STRING, description: "选题判断：一句话说清‘这是什么级别的东西、解决了谁的什么痛点、最佳切入角度’，中文" },
    audience: { type: Type.STRING, description: "目标观众画像 + 他最关心的点，中文" },
    nuggets: {
      type: Type.ARRAY,
      description: "3-6个‘金块’：具体、可验证、有冲击力的点，必须来自原料真实信息，禁止编造数字。不足就少给。",
      items: {
        type: Type.OBJECT,
        properties: {
          point: { type: Type.STRING, description: "金块本身，一句话，要具体带事实/数字/对比，中文" },
          evidence: { type: Type.STRING, description: "支撑它的真实事实/数据，来自原料原文。拿不准写‘原文未给具体数值’" },
        },
        required: ["point", "evidence"],
      },
    },
    title: { type: Type.STRING, description: "抖音视频标题，6-18字，有钩子，中文" },
    bannerTitle: { type: Type.STRING, description: "顶部固定大横幅标题，全程不变，来自最强金块，10-22字，可断成两行（用\\n），中文" },
    hook: { type: Type.STRING, description: "前3秒口播钩子=最强金块，一句话制造好奇/冲突，中文" },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5-8个抖音话题标签，不带#" },
    douyinCaption: { type: Type.STRING, description: "可直接粘贴到抖音的文案，含1句引导+话题，中文" },
    scenes: {
      type: Type.ARRAY,
      description: "分镜场景，按播放顺序。每镜口播=展开一个金块，必须有据可依、禁止编造。",
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING, enum: ["hook", "body", "cta"] },
          narration: { type: Type.STRING, description: "这一镜口播：展开某个金块，口语、含具体事实/数字，用于配音和字幕，中文" },
          evidence: { type: Type.STRING, description: "本镜口播依据的真实事实（来自原料，可追溯）。CTA镜可留空" },
          caption: { type: Type.STRING, description: "屏幕大字标题，极短（4-12字），中文" },
          cursorHint: { type: Type.STRING, description: "本镜鼠标该指/点的页面元素（要和口播对上，如‘star数字’‘安装命令’‘那行性能数据’），中文" },
          cursorRegion: { type: Type.STRING, enum: ["tl","tc","tr","cl","cc","cr","bl","bc","br"], description: "该元素在画面九宫格的大致位置：t上/c中/b下 × l左/c中/r右。如GitHub星数常在右上=tr" },
          emphasis: { type: Type.STRING, description: "本镜需要高亮强调的一个词或短语（中文），可为空" },
          bgKeyword: { type: Type.STRING, description: "1个英文关键词，描述画面意象" },
        },
        required: ["role", "narration", "caption", "bgKeyword", "cursorRegion"],
      },
    },
  },
  required: ["angle", "nuggets", "title", "bannerTitle", "hook", "hashtags", "douyinCaption", "scenes"],
};

/**
 * 根据“原料”和目标时长，写一条对标抖音/TikTok/YouTube 爆款结构的脚本。
 */
export async function writeViralScript(
  material: SourceMaterial,
  options: VideoOptions,
  onLog?: (msg: string) => void
): Promise<VideoPlan> {
  const ai = getClient();

  // 对标爆款样板实测：约 5.5 字/秒、信息密度高（34s 塞 ~12 镜）。
  const tech = options.template === "tech";
  const cps = tech ? 5.5 : 4.5;
  const totalChars = Math.round(options.durationTarget * cps);
  const perScene = tech ? 3 : 7;  // tech 模板每镜更短、切换更密
  const sceneCount = Math.min(tech ? 14 : 9, Math.max(4, Math.round(options.durationTarget / perScene)));

  onLog?.(`正在分析内容含金量、提炼金块，并撰写约 ${options.durationTarget}s（${sceneCount} 镜）的脚本…`);

  const prompt = `你是顶级短视频编导，但你信奉一条铁律：**内容 > 形式（神 > 形）**。
先想透"这条内容凭什么值得观众看完、看完记住什么"，**再**写分镜。绝不靠套话和情绪硬吹空内容。

# 内容原料
标题：${material.title}
摘要：${material.summary}
关键信息点：
${material.keyPoints.map((k, i) => `${i + 1}. ${k}`).join("\n")}
正文细节（节选）：
"""${material.fullText.slice(0, 6000)}"""

# 第一步：先做内容分析（务必先想清楚，体现在 angle/audience/nuggets 字段）
1. **含金量**：这东西新/猛/省/快/独家/可用在哪？据此写 angle（选题判断）和 audience（给谁看）。
2. **提炼金块(nuggets)**：挑 3-6 个**具体、可验证、有冲击力**的点。
   - 每个金块要具体带事实/数字/对比：❌"它很强大" → ✅"核心只有~1000行4个文件，却已14.1k star"。
   - **只能用原料里的真实信息，绝对禁止编造或夸大数字**。原料没有的硬数据就别编，宁可讲它真实的能力点；拿不准的 evidence 写"原文未给具体数值"。
   - 含金量不足时，金块可以少给，但每个都要有料。

# 第二步：用金块写分镜（scenes）
- 全程**简体中文**口播，语气${options.voiceStyleHint || "兴奋、有感染力、像跟朋友安利"}。
- 目标总时长约 **${options.durationTarget} 秒**，口播合计约 **${totalChars} 个汉字**，严格别超太多。
- 一共 **${sceneCount} 个场景**：第1个 role="hook"，最后1个 role="cta"，中间 role="body"。
- **每个 body 镜 = 展开一个金块**，narration 必须含具体事实/数字，并在 evidence 里写清依据（来自原料、可追溯）。
- **hook = 最强的那个金块**，制造"必须看下去"。bannerTitle 也来自最强金块。
- caption 是屏幕大字，比口播更短更爆。CTA 给明确动作。${tech ? "\n- ⚡信息密度高：每镜口播 10-16 字，快节奏、一句一个点、紧凑不拖。" : ""}

# 第三步：让画面跟着内容走（关键！每镜的 cursorHint + cursorRegion）
- 模拟鼠标要**指/点正在讲的那个元素**，让观众"耳朵听到啥、眼睛就被带到页面对应位置"。
- 每镜根据 narration 填 cursorHint（指哪个元素）+ cursorRegion（它在画面九宫格的大致位置）。
  例：讲star数→cursorHint"star数字"、region"tr"；讲安装命令→"安装命令"、"cc"；讲文件结构→"文件列表"、"cl"。

请输出符合给定 JSON Schema 的结果（先 angle/audience/nuggets，再 scenes）。`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: planSchema,
      temperature: 0.9,
    },
  });

  const text = response.text;
  if (!text) throw new Error("脚本生成失败，请重试。");

  const raw = parseJsonLoose<{
    angle: string;
    audience: string;
    nuggets: { point: string; evidence: string }[];
    title: string;
    bannerTitle: string;
    hook: string;
    hashtags: string[];
    douyinCaption: string;
    scenes: (Omit<Scene, "id"> & { cursorRegion?: string })[];
  }>(text);

  const REGIONS = new Set(["tl","tc","tr","cl","cc","cr","bl","bc","br"]);
  const scenes: Scene[] = (raw.scenes || []).map((s, i) => ({
    id: i,
    role: (s.role as Scene["role"]) || (i === 0 ? "hook" : "body"),
    narration: (s.narration || "").trim(),
    caption: (s.caption || "").trim(),
    bullets: (s.bullets || []).filter(Boolean).slice(0, 3),
    emphasis: (s.emphasis || "").trim(),
    bgKeyword: (s.bgKeyword || "abstract").trim(),
    evidence: (s.evidence || "").trim() || undefined,
    cursorHint: (s.cursorHint || "").trim() || undefined,
    cursorRegion: (REGIONS.has(s.cursorRegion as string) ? s.cursorRegion : "cc") as Scene["cursorRegion"],
  })).filter((s) => s.narration);

  if (!scenes.length) throw new Error("脚本为空，请重试或更换内容。");

  const nuggets = (raw.nuggets || [])
    .map((n) => ({ point: (n.point || "").trim(), evidence: (n.evidence || "").trim() }))
    .filter((n) => n.point);

  const plan: VideoPlan = {
    title: raw.title?.trim() || material.title,
    bannerTitle: (raw.bannerTitle || raw.title || material.title).trim(),
    hook: raw.hook?.trim() || scenes[0]?.narration || "",
    hashtags: (raw.hashtags || []).map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
    douyinCaption: raw.douyinCaption?.trim() || "",
    voiceName: options.voiceName,
    voiceStyleHint: options.voiceStyleHint,
    scenes,
    angle: raw.angle?.trim() || undefined,
    audience: raw.audience?.trim() || undefined,
    nuggets: nuggets.length ? nuggets : undefined,
  };

  onLog?.(`脚本完成：《${plan.title}》，提炼 ${nuggets.length} 个金块、共 ${plan.scenes.length} 镜。`);
  return plan;
}
