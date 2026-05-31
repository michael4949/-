export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MaturityDimension {
  dimension: string;
  score: number; // 0-100
  description: string;
}

export interface Scenario {
  name: string;
  impact: number; // 0-100
  feasibility: number; // 0-100
  description: string;
}

export interface Methodology {
  title: string;
  iconType: 'chart' | 'process' | 'target' | 'puzzle';
  content: string;
}

export interface RoadmapPhase {
  phase: string;
  timeframe: string;
  title: string;
  items: string[];
}

export interface ReportData {
  companyName: string;
  reportTitle: string;
  executiveSummary: string;
  backgroundImageKeyword: string; // Used to fetch a relevant placeholder
  maturityModel: {
    title: string;
    description: string;
    data: MaturityDimension[];
  };
  highValueScenarios: {
    title: string;
    description: string;
    data: Scenario[];
  };
  methodologies: Methodology[];
  roadmap: RoadmapPhase[];
  conclusion: string;
}

export interface ReportResponse {
  report: ReportData;
  sources: GroundingSource[];
}

// New types for the Refinement Step
export interface RefinementOption {
  label: string;
  value: string;
}

export interface RefinementQuestion {
  id: string;
  question: string;
  allowMultiple: boolean;
  options: RefinementOption[];
}

export interface RefinementResponse {
  questions: RefinementQuestion[];
}

// =====================================================================
//  视频生成器 (网页内容 → 抖音爆款视频) 相关类型
// =====================================================================

export type AspectRatio = '9:16' | '1:1' | '16:9';

export interface VideoOptions {
  durationTarget: number;   // 目标总时长（秒）
  voiceName: string;        // Gemini 预置音色名
  voiceStyleHint: string;   // 配音风格/语气提示
  useAiImages: boolean;     // 是否为每个场景生成 AI 配图
  bgm: boolean;             // 是否叠加轻量背景音乐床
  aspect: AspectRatio;      // 画幅
  theme: ThemeId;           // 视觉主题
  brand: string;            // 右下角小水印/账号名（留空则不显示）
  template: TemplateId;     // 视觉模板：tech=科技解说(对标爆款) / classic=渐变卡片
}

export type ThemeId = 'midnight' | 'sunset' | 'ocean' | 'mono' | 'candy';
export type TemplateId = 'tech' | 'classic';

/** 从网页/文字中抽取出的“原料” */
export interface SourceMaterial {
  title: string;
  summary: string;
  keyPoints: string[];
  fullText: string;
  links: GroundingSource[];   // 实际读取过的页内关键子链接
  sources: GroundingSource[]; // grounding 来源
  pageUrls: string[];         // 用户输入里出现的原始网页链接（用于截图）
  images: string[];           // 从网页抓到的真实配图 URL（og:image / 正文图）
}

/** 网页“真实画面”素材：实拍截图 + 页面配图，均已转成可直接绘制的位图 */
export interface VisualAsset {
  kind: 'screenshot' | 'image';
  url: string;            // 原始/代理后的图片地址
  bitmap: ImageBitmap;    // 已解码、可用于 canvas 绘制（已解决跨域）
  w: number;
  h: number;
}

export interface Scene {
  id: number;
  role: 'hook' | 'body' | 'cta';
  narration: string;  // 口播文案（用于 TTS + 字幕）
  caption: string;    // 屏幕大字标题（短）
  bullets: string[];  // 可选要点
  emphasis: string;   // 需要高亮的词/短语
  bgKeyword: string;  // 英文关键词（用于配图 / 渐变种子）
  visualHint?: 'screenshot' | 'image' | 'auto'; // 这一镜倾向用哪种真实画面
  evidence?: string;  // 这一镜口播所依据的真实事实（来自原文，防编造、可追溯）
  cursorHint?: string; // 鼠标该指/点的元素（语义化，如”star数字””安装命令”）
  cursorRegion?: CursorRegion; // 该元素在画面中的大致区域，驱动模拟鼠标落点
  // —— 把”要义”变成画面：图卡讲点、截图作证据 ——
  visualKind?: VisualKind; // shot=真实截图(证据) / stat=数据卡 / quote=金句卡 / flow=流程卡
  cardValue?: string;      // stat 卡的大字数字/关键词（如 “14.1k ★”）
  cardLabel?: string;      // 卡片下方小标签/出处
  cardText?: string;       // quote 卡的引语正文
  cardSteps?: string[];    // flow 卡的 2-4 个步骤
}

// 画面九宫格区域（左/中/右 × 上/中/下），让鼠标指向”正在讲的那个元素”
export type CursorRegion = 'tl' | 'tc' | 'tr' | 'cl' | 'cc' | 'cr' | 'bl' | 'bc' | 'br';
// 画面类型：把分析出的要义做成图卡，真实截图只作证据
export type VisualKind = 'shot' | 'stat' | 'quote' | 'flow';

/** 含金量产出：一个具体、可验证、有冲击力的“金块” */
export interface GoldNugget {
  point: string;     // 金块本身（一句话）
  evidence: string;  // 支撑数据/事实（来自原文）
}

export interface VideoPlan {
  title: string;          // 视频标题
  bannerTitle: string;    // 顶部固定钩子横幅（全程不变，对标爆款样板）
  hook: string;           // 前 3 秒钩子
  hashtags: string[];     // 抖音话题
  douyinCaption: string;  // 可直接粘贴的文案
  voiceName: string;
  voiceStyleHint: string;
  scenes: Scene[];
  // —— 选题/含金量产出（先想透内容，再做视频）——
  angle?: string;         // 选题判断：这是什么级别、最佳切入角度
  audience?: string;      // 目标观众
  nuggets?: GoldNugget[]; // 金块清单（口播据此展开，可追溯、防编造）
}

/** 单个场景合成出的音频（24kHz 单声道 PCM） */
export interface SceneAudio {
  sceneId: number;
  pcm: Float32Array;
  sampleRate: number;
  durationSec: number;
  estimated: boolean; // 是否为 TTS 失败后的静音占位
}

export type StageId = 'read' | 'script' | 'voice' | 'images' | 'render' | 'done';

export interface StageState {
  id: StageId;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

export interface RenderResult {
  blob: Blob;
  url: string;
  mime: string;
  ext: 'mp4' | 'webm';
  srt: string;
  durationSec: number;
}

export interface SubtitleCue {
  start: number; // 秒（全片绝对时间）
  end: number;
  text: string;
}
