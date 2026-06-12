本仓库包含两个独立的浏览器本地 AI 工具（共用一套 Vite 工程与 Gemini Key 管理）：

| 入口 | 工具 | 干什么 |
|---|---|---|
| `/`（index.html） | **AI 爆款工厂** 🎬 | 网页链接 → 中文配音抖音竖屏视频 |
| `/bid.html` | **标书智能工厂** 📑 | 招标文件 → 500-1000 页国标板式 Word 投标文件 |

---

# 标书智能工厂 📑

把一份**招标文件**（.docx/.txt/粘贴文字）变成一整本**按国标板式排好版的 Word 投标文件**，目标页数 300-1200 页可调（覆盖国内常见的 500-1000 页标书体量），全程在浏览器本地用你自己的 Gemini Key 完成。

## 工作流（Workflow）

```
① 解析招标文件          ② 编制大纲(人工审阅闸口)       ③ 分章并发撰写
分块抽取:项目信息/评分   章骨架 → 逐章并行细化小节   →   2-4 路并发逐节生成
办法/实质性条款/格式  →  按目标页数分配字数预算          不足自动续写/扩写
                                                            ↓
⑤ 国标板式排版导出      ④ 合规审查
封面/目录域/页眉页码  ←  占位符扫描(废标风险)/实质性条款
仿宋三号·28磅行距        覆盖核对/占位符自动改写修复
```

- **页数有保障**：按板式的“有效字数/页”把目标页数换算成各小节字数预算；写完估算不足目标 97% 时自动挑缺口最大的小节扩写（最多两轮）。
- **断点续跑**：每写完一节即存入浏览器 IndexedDB，限流/断网/关页后回来点「继续」接着跑，已写内容不丢。
- **不编造事实**：投标人资料是“事实表”，全文与之保持一致；缺失的证书编号、合同金额一律用稳妥表述并列入“人工核实清单”，避免编造导致废标。
- **两种板式**（可生成后一键换板式重排）：
  - 国标公文式（GB/T 9704-2012 衍生）：A4，页边距上 3.7/下 3.5/左 2.8/右 2.6 cm，正文仿宋_GB2312 三号、28 磅固定行距，章标题黑体，页码“— 1 —”；
  - 通用标书式：宋体小四、1.5 倍行距、页码“第 X 页 共 N 页”。
  - 自动生成封面（投标人/盖章/签字位）、目录（Word 目录域，打开后“更新域”出页码）、页眉（项目名）、表格排版。

## 用法

打开 `/bid.html` → 填 Gemini Key → 上传/粘贴招标文件 → 填投标人资料（保存在本机，下次复用）→ 选目标页数与板式 → **审阅/修改 AI 生成的大纲** → 确认后开始整本撰写 → 下载 .docx（另可下载全文 Markdown 备份、解析结果+大纲 JSON）。

**独立单文件版**：`standalone/标书智能工厂.html` 是把整个智能体（React + 工作流 + docx 排版引擎）内联打包的单个 HTML——**双击用 Chrome/Edge 打开即可使用**，无需 Node、无需构建、无需服务器（仅样式 CDN 与 Gemini 调用需联网）。改代码后用 `npm run build:standalone` 重新生成。

> ⚠️ 生成 500-1000 页约需数百次模型调用、30-60 分钟，**强烈建议用已开通付费的 Gemini Key**（免费档限流会非常慢，但断点续跑也能磨完）。
> ⚠️ 合规提醒：产出是**编制底稿**。提交前必须人工逐章审校，替换真实证照/业绩/人员材料，按招标文件要求签字盖章；投标内容的真实性由使用者自行负责。

主要文件：`services/bid/workflow.ts`（工作流编排）、`tenderService` / `outlineService` / `writerService` / `reviewService`（四个阶段）、`docxRender.ts`（板式排版）、`budget.ts`（页数↔字数预算）、`docxText.ts`（零依赖 .docx 文本抽取）、`store.ts`（断点）。离线冒烟测试：`npm run smoke:bid`。

---

# AI 爆款工厂 🎬

把**一条网页链接**（或一段文字）一键变成**带中文配音 + 中文字幕**的**抖音/TikTok 竖屏短视频**，自动讲解「这玩意儿厉害在哪」，对标平台爆款结构，做好直接下载发布。

整条流水线**全部在你的浏览器本地完成**——无需服务器、无需 ffmpeg。

```
 ① 读内容            ② 写爆款脚本          ③ 中文配音           ④ 渲染导出
Gemini urlContext   Gemini 2.5 Flash      Gemini TTS           Canvas + WebCodecs
+ Google Search  →  3秒钩子/反转/CTA   →  中文 PCM 音频     →  真·MP4 (H.264+AAC)
读网页正文 & 页内链接   分镜 + 屏幕大字                            烧录动态字幕 + 导出 .srt
```

## 它能做什么

- **完整读取网页**：把链接交给 Gemini 的 `urlContext` 工具，读取正文，并尽量顺着页面里的关键子链接继续读；配合 Google Search 补充背景（服务端抓取，**没有浏览器跨域问题**）。也支持直接粘贴文字。
- **写抖音爆款脚本**：内置短视频方法论——前 3 秒钩子、黄金结构（是什么 → 为什么炸裂 → 能干嘛 → CTA）、情绪递进、屏幕大字、话题标签。
- **中文配音 + 字幕**：用 Gemini TTS 生成中文语音（多音色可选），并把口播自动切成**逐句字幕**烧进画面，同时导出 `.srt` 字幕文件。
- **竖屏成片**：1080×1920（也支持 1:1 / 16:9），动态大字、Ken Burns 背景、进度条、CTA、可选账号水印与 AI 配图。
- **一键下载**：优先导出**真 MP4**（H.264 + AAC，抖音友好）；浏览器不支持时回退 WebM。附带可直接粘贴的抖音文案与话题。

## 运行

**前置**：Node.js，以及一个 Gemini API Key（<https://aistudio.google.com/apikey>）。

```bash
npm install
echo "GEMINI_API_KEY=你的密钥" > .env.local
npm run dev        # 打开 http://localhost:3000
```

> **强烈建议用 Chrome / Edge 打开**：它们支持 WebCodecs，能直接导出抖音友好的 **MP4**。
> Safari / Firefox 会回退到 WebM，可再用任意工具转成 MP4 后上传。

构建：`npm run build`（产物在 `dist/`）。

## 部署成公开链接（Vercel · 推荐）

应用是纯前端、密钥在网页里自填，所以**无需任何 Secrets** 即可公开托管。

1. 用 GitHub 登录 <https://vercel.com>（免费）。
2. **Add New → Project** → 导入本仓库 `michael4949/-`（仓库已含 `vercel.json`，框架自动识别为 Vite，无需改任何设置、无需填环境变量）。
3. 因为最新代码在分支 `claude/upbeat-ritchie-eqiF1`：进 **Project → Settings → Git → Production Branch** 改成该分支并 **Redeploy**；或把该分支合并到 `main` 再部署。
4. 部署完成得到 `https://xxx.vercel.app`。首次打开在页面顶部填入你的 Gemini API Key（<https://aistudio.google.com/apikey>，仅存浏览器本地）即可使用。

> 不影响仓库现有的 GitHub Pages（「GitHub AI 雷达」报告画廊）。
> 也可用 GitHub Pages 发布本应用（仓库已含手动触发的 `.github/workflows/deploy.yml`），但那会替换掉报告画廊的地址。

## 使用流程

1. 粘贴链接或文字 → 选时长 / 音色 /（可选）风格、主题、画幅、AI 配图。
2. AI 读取内容并生成脚本 → 进入**可编辑的脚本审阅**页，随意修改任意文案。
3. 点「配音并渲染」→ 浏览器本地合成配音、渲染画面、导出视频。
4. 下载 `.mp4` 和 `.srt`，复制抖音文案，发布。

## 技术要点 / 文件

| 文件 | 作用 |
|---|---|
| `services/contentService.ts` | 用 Gemini `urlContext` + `googleSearch` 读网页/文字 → 结构化「原料」 |
| `services/scriptService.ts` | 「原料」+ 爆款方法论 → 分镜脚本（结构化 JSON） |
| `services/ttsService.ts` | Gemini TTS → 24kHz PCM 中文配音（逐镜，失败自动静音占位） |
| `services/imageService.ts` | 可选：每镜生成 AI 背景图（失败回退渐变） |
| `services/subtitles.ts` | 口播切句 → 时间轴字幕 + `.srt` |
| `services/videoEngine.ts` | Canvas 绘制 + **WebCodecs→MP4**（`mp4-muxer`），回退 MediaRecorder→WebM |
| `components/video/*` | 输入表单 / 进度 / 脚本审阅 / 结果页 |

可在 `services/genai.ts` 切换模型（如 TTS 改用 `gemini-2.5-pro-preview-tts`）。

## 已知限制与提醒

- **请自行核对事实再发布**：脚本由 AI 基于读取到的内容撰写，可能有误读。
- 需要登录/强反爬/纯动态渲染的页面可能读不全，可改为**直接粘贴正文**。
- WebCodecs 渲染约为「接近实时～更快」，更长的视频会更慢；导出期间请保持页面在前台。
- AI 配图较慢且消耗额度，默认关闭。
- 背景音乐为本地合成的轻量和声床（无版权风险），默认关闭。

---

> 仓库里的 `scout/`（GitHub AI 雷达）是独立子系统，与本应用互不影响。
