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
          visualKind: { type: Type.STRING, enum: ["shot", "stat", "quote", "flow"], description: "本镜画面类型：stat=数据卡(讲数字/星数/价格) / quote=金句卡(讲原话/标语/定位) / flow=流程卡(讲机制或2-4步) / shot=真实网页截图(作证据，展示页面里看得到的东西)。一条片子要图卡和截图交替，别全是截图。" },
          cardValue: { type: Type.STRING, description: "当 visualKind=stat：超大字的数字/关键词，如‘14.1k ★’‘≈1000 行’。其它类型留空" },
          cardLabel: { type: Type.STRING, description: "stat/quote/flow 卡下方的小标签或出处（如‘GitHub Star’‘作者原话’），中文或原文短语" },
          cardText: { type: Type.STRING, description: "当 visualKind=quote：引语正文（一句金句/标语，可中文或带原文），≤24字" },
          cardSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "当 visualKind=flow：2-4个步骤短语（每个≤8字），如[‘缺代码’,‘自动补全’,‘越跑越强’]" },
          cursorHint: { type: Type.STRING, description: "当 visualKind=shot：鼠标该指的页面元素（和口播对上，如‘star数字’‘安装命令’），中文" },
          cursorRegion: { type: Type.STRING, enum: ["tl","tc","tr","cl","cc","cr","bl","bc","br"], description: "shot 镜里该元素在九宫格位置：t上/c中/b下 × l左/c中/r右。如GitHub星数常在右上=tr" },
          emphasis: { type: Type.STRING, description: "本镜需要高亮强调的一个词或短语（中文），可为空" },
          bgKeyword: { type: Type.STRING, description: "1个英文关键词，描述画面意象" },
        },
        required: ["role", "narration", "caption", "bgKeyword", "visualKind"],
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

# 第三步：把"要义"做成画面（关键！别只会放网页+鼠标）
专业解说视频是在**「图卡(讲要义)」和「真实截图(作证据)」之间来回切**，不是干瞪着一个网页晃鼠标。
每镜选一个 visualKind：
- **stat（数据卡）**：讲数字/星数/价格/占比时用，cardValue 放超大字（如"14.1k ★""≈1000 行"），cardLabel 放小标签。
- **quote（金句卡）**：讲原话/标语/定位时用，cardText 放那句金句（≤24字），cardLabel 放出处。
- **flow（流程卡）**：讲机制/步骤时用，cardSteps 放2-4个短语（如["缺代码","自动补全","越跑越强"]）。
- **shot（真实截图）**：当页面里真有可看的东西、需要"眼见为实"作证据时用，并填 cursorHint+cursorRegion 让鼠标指向它。
要求：**图卡和截图交替**，至少一半镜用图卡把要义可视化；hook 用最有冲击力的 stat 或 quote 卡开场。

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
    scenes: (Omit<Scene, "id"> & { cursorRegion?: string; visualKind?: string })[];
  }>(text);

  const REGIONS = new Set(["tl","tc","tr","cl","cc","cr","bl","bc","br"]);
  const KINDS = new Set(["shot","stat","quote","flow"]);
  const scenes: Scene[] = (raw.scenes || []).map((s, i) => {
    const kind = (KINDS.has(s.visualKind as string) ? s.visualKind : "shot") as Scene["visualKind"];
    return {
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
      visualKind: kind,
      cardValue: (s.cardValue || "").trim() || undefined,
      cardLabel: (s.cardLabel || "").trim() || undefined,
      cardText: (s.cardText || "").trim() || undefined,
      cardSteps: (s.cardSteps || []).map((x) => (x || "").trim()).filter(Boolean).slice(0, 4),
    };
  }).filter((s) => s.narration);

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
