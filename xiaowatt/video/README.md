# 小瓦特·班 介绍视频（8 分钟）· 生成脚本

成片：1920×1080 · 30 fps · H.264 + AAC，含录屏、中文配音、烧录字幕与外挂 .srt、背景音乐。
全部离线生成：页面用 Playwright 驱动并录屏，配音用本地 TTS，背景音乐用代码合成，最后用 ffmpeg 编码。

## 流程

| 步骤 | 脚本 | 产物 |
|---|---|---|
| 1 写脚本 | `script.json` | 每段：场景（title / bg / arch / banzu / end）、旁白、章节名、镜头步骤 |
| 2 配音 | `python3 tts_build.py` | `audio/sNN.wav` + `audio/timing.json`（每段真实时长） |
| 3 排时间轴 | `python3 plan.py 480` | `plan.json`：总长对齐 480 秒；步骤换成绝对时间；字幕按停顿分句 |
| 4 录屏 | `node record.cjs` | `frames/<段>/`：2 倍分辨率帧 + 光标、点击、镜头、红框事件 |
| 5 合成画面 | `python3 compose.py` | `out/video_only.mp4`：镜头推拉、红框、光标与点击涟漪、章节标签、字幕 |
| 6 音乐 | `python3 bgm.py` | `audio/bgm.wav`：C 大调 90 BPM 氛围曲，按段落编排 |
| 7 混音封装 | `python3 mix.py` | `out/小瓦特班_班组长AI助手_介绍视频.mp4` + `.srt`（人声处音乐自动压低，响度 -16 LUFS） |

质检：`python3 qa.py out/qa.png 95:167:4` 把指定时间点的成片画面拼成缩略图；`python3 compose.py 90 120` 只渲染 90–120 秒预览。
试跑某几段的页面操作：`DRY=1 SLOW=1 FROM=s21 TO=s27 node record.cjs banzu`。

## 镜头步骤写法（script.json）

`[时间, 类型, 参数…]`，时间是段内秒数，或 `"60%"` 表示旁白进行到 60%。

- `nav 页面键` 点左侧菜单；`hash "#页面/子页"` 点菜单再点页签；`role manager|leader` 切角色
- `click 选择器` 光标移过去再点；按钮还在小瓦特回答里流式输出时会先等它出现
- `scroll 选择器 y` 把元素顶部滚到视口 y 处；`cam 选择器 倍数` 镜头推到元素，`cam null` 拉回全屏
- `box 选择器 秒` 红框标注（跟随滚动）；`move 选择器` 光标悬停；`js 代码` 幻灯片里执行

## 依赖

- Node + Playwright（仓库根目录 `node_modules`），Chromium
- Python：numpy、scipy、Pillow、soundfile、sherpa-onnx
- ffmpeg（含 libx264）
- 中文字体：文泉驿正黑 `/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc`
- TTS 模型：sherpa-onnx 的 `kokoro-multi-lang-v1_1`（GitHub releases `tts-models`），用环境变量 `TTS_MODEL` 指目录；音色 sid 4（女声）

## 录屏说明

2 倍分辨率下 Chromium 截帧只有约 10 fps，所以 `record.cjs` 把页面时间放慢 2.5 倍录（计时器、时钟、requestAnimationFrame、CSS 动画一起放慢），
帧和事件按页面时间记，合成出来是正常速度、约 25 fps 的清晰画面。整段录制约 20 分钟。

## 人工录制脚本（docx）

`python3 gen_script_doc.py` → `高效班组管理助手_8分钟讲解视频_录制脚本.docx`：按客户发来的《小瓦特班_8分钟讲解视频_录制脚本》格式（录前准备 / 时间总览 / 逐拍脚本 时间·操作·解说 / 时长调节 / 交付要求核对），内容对应原型 v6.0（高效班组管理助手 · 大瓦特），时间点由解说字数（230 字/分钟）与实测固定动画时长推算（晨间简报 16 s、派工填单 23 s、周报排节点 13 s、排进班组计划 6 s、高风险排带教 6 s、发起调配 6 s）。改解说词后重跑即可。
