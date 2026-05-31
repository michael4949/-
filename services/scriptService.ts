import { Type, Schema } from "@google/genai";
import { getClient, TEXT_MODEL, parseJsonLoose } from "./genai";
import { SourceMaterial, VideoOptions, VideoPlan, Scene } from "../types";

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "抖音视频标题，6-18字，有钩子，中文" },
    bannerTitle: { type: Type.STRING, description: "顶部固定大横幅标题，全程不变，最抓人的一句钩子，10-22字，可断成两行（用\\n），中文。例：'国内也有能媲美Claude Code的国产神器了'" },
    hook: { type: Type.STRING, description: "前3秒口播钩子，一句话制造好奇/冲突，中文" },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5-8个抖音话题标签，不带#" },
    douyinCaption: { type: Type.STRING, description: "可直接粘贴到抖音的文案，含1句引导+话题，中文" },
    scenes: {
      type: Type.ARRAY,
      description: "分镜场景，按播放顺序",
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING, enum: ["hook", "body", "cta"] },
          narration: { type: Type.STRING, description: "这一镜的口播文案（中文，口语、有感染力，用于配音和字幕）" },
          caption: { type: Type.STRING, description: "屏幕大字标题，极短（4-12字），中文" },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING }, description: "0-3条要点短句（中文），可为空" },
          emphasis: { type: Type.STRING, description: "本镜需要高亮强调的一个词或短语（中文），可为空" },
          bgKeyword: { type: Type.STRING, description: "1个英文关键词，描述画面意象（如 'rocket','data','brain'）" },
        },
        required: ["role", "narration", "caption", "bgKeyword"],
      },
    },
  },
  required: ["title", "bannerTitle", "hook", "hashtags", "douyinCaption", "scenes"],
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

  onLog?.(`正在撰写约 ${options.durationTarget}s（${sceneCount} 个分镜）的爆款脚本…`);

  const prompt = `你是顶级的短视频编导，专做抖音/TikTok/YouTube Shorts 爆款。你的任务：把下面这份「内容原料」改写成一条**讲解“它厉害在哪”**的竖屏短视频脚本。

# 内容原料
标题：${material.title}
摘要：${material.summary}
关键信息点：
${material.keyPoints.map((k, i) => `${i + 1}. ${k}`).join("\n")}
正文细节（节选）：
"""${material.fullText.slice(0, 6000)}"""

# 硬性要求
- 全程**简体中文**口播，语气${options.voiceStyleHint || "兴奋、有感染力、像跟朋友安利"}。
- 目标总时长约 **${options.durationTarget} 秒**，全部口播加起来约 **${totalChars} 个汉字**，请严格控制别超太多。
- 一共 **${sceneCount} 个场景**（scenes），第1个必须是 role="hook"，最后1个必须是 role="cta"，中间是 role="body"。
- **只能基于原料里的真实信息**，可提炼、可通俗化，但不要编造数据或事实。
- **bannerTitle**：一句全程固定在视频顶部的大钩子标题，要最抓人、点明"这是什么级别的东西"，10-22字，可用\\n断成两行。

# 爆款方法论（务必照做）
1. **前3秒钩子(hook)**：用反差/悬念/利益点/数字制造"必须看下去"的冲动。
2. **黄金结构**：钩子 → 这是什么(一句话讲清) → 为什么炸裂(逐点拆解"厉害在哪"，每个 body 镜讲一个最猛的点) → 具体能干嘛(场景/收益/数据) → CTA 引导。
3. **每一镜口播 = 一个信息钩子**，句子短、有节奏、口语化，多用"你"，避免书面语和长难句。${tech ? "\n   ⚡本视频信息密度要高：每镜口播控制在 10-16 字，像样板那样快节奏、一句一个点、紧凑不拖。" : ""}
4. **caption** 是屏幕大字，要比口播更短更爆，像热搜词。
5. **情绪递进**：越往后越燃，CTA 给出明确动作（"感兴趣的赶紧去试试/点赞收藏关注"）。
6. hashtags 用与内容强相关的高流量话题。${tech ? "\n7. 多用具体**数字/对比**（star数、速度、价格、百分比等）做 body 镜的爆点。" : ""}

请输出符合给定 JSON Schema 的脚本。`;

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
    title: string;
    bannerTitle: string;
    hook: string;
    hashtags: string[];
    douyinCaption: string;
    scenes: Omit<Scene, "id">[];
  }>(text);

  const scenes: Scene[] = (raw.scenes || []).map((s, i) => ({
    id: i,
    role: (s.role as Scene["role"]) || (i === 0 ? "hook" : "body"),
    narration: (s.narration || "").trim(),
    caption: (s.caption || "").trim(),
    bullets: (s.bullets || []).filter(Boolean).slice(0, 3),
    emphasis: (s.emphasis || "").trim(),
    bgKeyword: (s.bgKeyword || "abstract").trim(),
  })).filter((s) => s.narration);

  if (!scenes.length) throw new Error("脚本为空，请重试或更换内容。");

  const plan: VideoPlan = {
    title: raw.title?.trim() || material.title,
    bannerTitle: (raw.bannerTitle || raw.title || material.title).trim(),
    hook: raw.hook?.trim() || scenes[0]?.narration || "",
    hashtags: (raw.hashtags || []).map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
    douyinCaption: raw.douyinCaption?.trim() || "",
    voiceName: options.voiceName,
    voiceStyleHint: options.voiceStyleHint,
    scenes,
  };

  onLog?.(`脚本完成：《${plan.title}》，共 ${plan.scenes.length} 镜。`);
  return plan;
}
