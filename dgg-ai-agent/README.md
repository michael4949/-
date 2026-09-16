# 薯片AI智能体 · 能力内核（skill）+ 展台高保真原型

一个内核，两个壳：每个模块只写一次「输入 → 离线计算 → 一处 LLM → 结构化输出」，
skill 是这份定义加一个面向 AI OS 的清单，原型是这份定义加一层界面。

```
skills/
  _shared/                 企业画像字段表 + 生成的 JSON Schema · 14 大类 / 54 细分行业表 · 积分表 · 禁忌词表 · lint
  01-ai-maturity/          企业AI成熟度评估（SKILL.md · schema · data · core · prompts · examples · scripts）
  02-scene-ranking/        企业AI高价值场景排序（SKILL.md · schema · data/sectors 14 个大类场景库 · core · prompts · examples · scripts）
prototype/
  src/                     外壳（tokens.css · shell.css · shell.js）+ 模块视图（module-01.js · module-02.js）+ 报告版式（report.css · report-m1.css · report-m2.css）+ 图表（charts.js · charts-m1.js · charts-m2.js）+ 模板
  build.js                 全部内联 → dist/index.html（file:// 双击即开，零外部请求）
  test/screenshot.js       模块 1 全流程：横屏 / 竖屏 / 打印，并把屏上数字与内核 golden 输出比对
  test/screenshot-m2.js    模块 2 全流程：含权重拖动重排、预设切换、行详情联动、28 页报告与 PDF
  dist/index.html          交付物
```

## 常用命令

```bash
cd skills/02-scene-ranking
node scripts/validate-data.js     # 场景库校验：字段、取值、标签闭环、覆盖度、14 个大类齐全
node scripts/run-examples.js      # 四套样例企业跑内核，写 examples/*.output.json
node scripts/validate-schema.js   # 契约校验：样例过 schema · 枚举与数据表一致 · 常量与内核一致 · 反例被拒
node scripts/lint.js              # 禁忌词扫描

cd ../01-ai-maturity
node scripts/run-examples.js      # 四套样例企业跑内核，写 examples/*.output.json
node scripts/lint.js              # 禁忌词扫描
node scripts/validate-schema.js   # 契约校验：样例过 schema · 画像 schema 与数据表一致 · 常量与内核一致 · 反例被拒
node scripts/gen-profile-schema.js  # 画像字段或行业表改动后重新生成 _shared/company-profile.schema.json
node scripts/gen-benchmark.js     # 重新生成参考带（业务侧抽样到位后改为直接替换 data/benchmark.json）

cd ../../prototype
node build.js                     # 构建 dist/index.html
NODE_PATH=$(npm root -g) node test/screenshot.js   # 需要 playwright + chromium：走完整流程、截图、比对内核、导出 PDF
NODE_PATH=$(npm root -g) node test/screenshot-m2.js   # 模块 2 全流程
NODE_PATH=$(npm root -g) node test/measure.js      # 模块 1 打印模拟下量每页高度
NODE_PATH=$(npm root -g) node test/measure-m2.js S1   # 模块 2 逐页量高（S1–S4）
```

## 原型的 URL 参数

| 参数 | 作用 |
|---|---|
| `?station=1` | 左端竖屏一体机：直接落到体验版输入页，字号档放大 |
| `?station=2` | 中央大横屏：开机即待机页 |
| `?station=3`（默认） | 右侧横屏一体机：首页 11 宫格 |
| `&wx=<url>` | 「结果发送到微信」二维码内容（承接方式定下来后改默认值） |
| `&llm=<endpoint>&model=<id>` | 可选：LLM 薄代理，`POST {model, prompt} → {text}`；不填则全程模板 |

## PDF 导出规则（两套版式共用）

逐项渲染 A4 PDF 数位图对象实测得出：Chromium **只会把「模糊」栅格化**成带 `/SMask` 的位图，部分阅读器不合成蒙版，这些位图就在纸面上显示为灰色方块。除此之外的立体手段全部保持矢量。

绝对不能用（实测会产生位图）：

| 写法 | 改用 |
|---|---|
| `box-shadow` 的 blur > 0 | 多层 blur = 0 的外阴影逐级变淡 |
| `text-shadow` 的 blur > 0 | `text-shadow: 0 1px 0 <不透明色>` |
| 任何 `filter`——`blur` / `drop-shadow` 自不必说，`brightness` / `saturate` / `opacity(1)` 实测同样栅格化 | `background` 层或 `box-shadow` 的 `inset` |
| 半透明 `border`（`rgba` / 八位 hex / `color-mix` 带 `transparent`）叠在渐变背景上 | 不透明实色描边 |
| 被圆角裁剪的表格单元格上堆多层 `background` | 单层渐变 + `inset` 阴影 |

矢量安全、可放心使用：`border-radius`、`overflow: hidden` 裁剪、`clip-path`、`opacity`、单层渐变、`box-shadow` 的 `inset` 与 blur = 0 外阴影。

所以两套版式的立体感一律用 blur = 0 的硬边明暗层次做出，**屏幕与 PDF 是同一套视觉**，打印样式里不再抹平阴影与圆角。章节标题栏的凸浮结构自上而下六层：顶棱硬高光 → 柱面连续衰减（白与黑的 alpha 叠层，不换色，保住彩色流动）→ 左右棱 → `inset` 压暗的底部侧壁 → 1px 转折暗线 → 三级 blur = 0 落影。

效果：模块 1 完整报告的位图从 424 张降到 8 张，模块 2 从 563 张降到 22 张，其中带透明蒙版的各 3 张，来自封面主视觉与 logo。自查办法是导出后统计 PDF 里 `/Subtype /Image` 与 `/SMask` 对象数，数量级跳到几十上百就说明有模糊漏进来了。

`test/screenshot*.js` 会核对 PDF 页数是否等于屏上页数，`test/measure-m*.js` 在 A4 版心 703px 下逐页量高。

## 已完成模块

| # | 模块 | 内核 + 数据 | 原型 | SKILL.md 契约 | 状态 |
|---|---|---|---|---|---|
| 1 | 企业AI成熟度评估 | v2.1 | v4 | v2.1.0（已与内核、原型同步） | 屏幕与内核逐字一致；独立高端版式，报告 28 页 / 速览 6 页，四套样例 A4 均无溢出；契约校验全部通过 |
| 2 | 企业AI高价值场景排序 | v1.1 | v2 | v1.0.0（已与内核、原型同步） | 屏幕与内核逐字一致；交互式排序台（权重现场可调、实时重排）；报告 28 页 / 速览 6 页，独立版式，四套样例 A4 均无溢出；契约校验全部通过 |

### 模块 1 · v2 规模

- 企业画像 13 项（两级行业 14 大类 / 54 细分）
- 36 题 · 六维十八项 · 总分 108
- 内容库：60 条结构化行动（负责人 / 三步 / 交付物 / 周期 / 投入档 / 验收指标）· 54 段子维度诊断 · 70 个场景 · 16 条风险规则 · 270 格参考带
- 内核另出逐维差距计划（gapPlan）、角色分工、何时重评，供报告使用
- 契约 v2：`schema/input.json`（profile 13 项 + answers 36 × 0–3）· `schema/output.json`（success / failure 两种形态）· `_shared/company-profile.schema.json` 由字段表与行业表生成

### 模块 1 报告 · v4 版式（与模块 2 同档次，各有身份）

两套版式共用「3D 彩色凸浮标题栏 + 拉丁副题 + 贯穿全宽渐变页脚 + 企服 AI 主视觉」的语法，靠以下差异各自成立：

| 元素 | 模块 1 | 模块 2 |
|---|---|---|
| 序号徽章 | 六边形（呼应六维） | 圆角方 |
| 卡片 | 左侧色轨（档案感） | 顶部圆角渐变凸浮帽条 |
| 小节标题 | 粗体黑字 + 拉丁副题 + 双细线 | 粗体黑字 + 拉丁副题 |
| 标题栏右端 | 刻度装饰 | 无 |
| 列表符号 | 六边形 | 方块 |
| 封面主视觉 | 企服元素 → 六维雷达 + AI 核 → 等级阶梯，外加扫描环 | 企服元素 → AI 芯片节点网络 → 排序结果 |
| 章节配色 | 14 套，深蓝 / 青 / 金系为主 | 13 套，墨蓝 / 电光青系为主 |

- 报告 28 页 / 速览 6 页：封面 / 导航 / 01 结论速览 ×2 / 02 企业画像 / 03 总体成熟度 ×3 / 04 六维详解 ×6 / 05 优势与短板 / 06 AI 优先方向 / 07 距下一级的差距 / 08 推荐场景 / 09 升级路线图 ×2 / 10 投入与回报 / 11 风险与合规 / 12 90 天清单 / 13 何时重评 / 附录 A ×2 / 附录 B / 封底
- 12 种新图表（`charts-m1.js`）：企服 AI 封面主视觉 · 综合分大弧 · 等级阶梯 · 六维雷达（渐变填充 + 参考带 + 直标）· 六维对照条 · 相对参考带偏离（双向）· 十八项子维度热力网格 · 六维小仪表 · 36 题作答网格 · 逐维差距条 · 三阶段九项行动泳道 · 同行分布曲线
- 六维分类色板 #1157B5 #0FA3C7 #8A54DC #E0635C #C9A227 #0E9F6E 与子维度三档状态色 #E8A33D #1157B5 #0E9F6E 均已过色觉校验，且全部直接标名

### 模块 2 · v1 规模

- 场景库 14 个行业大类 × 13 个场景 = 182 个场景，覆盖各大类下的细分行业；痛点库 14 × 16 = 224 条
- 每个场景 18 个字段：环节 / 使用者 / 替代什么 / 痛点标签 / 数据依赖 / 所需数据清单 / 价值 / 见效 / 门槛 / 投入档 / 上线周数 / 对应模块 / 预期指标 / 第一步 / 前置条件 / 收益折算口径
- 评分按 DM 定稿公式：痛点强度 × 0.35 + 数据可得 × 0.30 + 见效周期 × 0.20 + (6 − 实施门槛) × 0.15，换算百分制
- 四项现状条件（数据现状 / 半年目标 / 见效窗口 / 可投入人力）各自改变对应维度的得分，排序随企业实际情况变化
- 四维权重现场可调：四个预设 + 四个滑块，拖动即重算重排；关键数据源缺失的场景数据可得直接计 1 分
- 交互式排序台：结论横幅 · 排序表（可切前 8 / 全部 13）· 紧凑气泡矩阵 · 场景详情联动 · 三步走阶梯 · 紧凑筛选漏斗
- 内核另出三档推进情景、角色分工、何时重跑、本行业痛点库全表，供报告使用
- 契约 v1.0.0：`schema/input.json`（profile + pains 3–8 带严重度 + conditions 四项 + 可选 weights）· `schema/output.json`（success / failure 两种形态）· `SKILL.md` 写明追问顺序、评分规则表、排序台形态、`render` 表与 28 页报告页表、降级表
- 校验分两层：schema 拦项数 / 取值 / 必填 / 多出字段，内核兜底三项 draft-07 表达不了的跨字段约束（痛点跨行业、按 id 去重、权重之和大于 0）

### 模块 2 报告 · v2 版式

模块 1 改到 v4 之后，两套版式已是同档次、各有身份，逐项差异见上面「模块 1 报告 · v4 版式」的对照表。模块 2 自己这一侧：

| 元素 | 做法 |
|---|---|
| 章节标题 | 整条 3D 彩色凸浮条：单层双色渐变 + 顶棱高光 + 柱面衰减 + `inset` 侧壁 + 三级硬边落影，配圆角方序号徽章，续页用细版 |
| 小节标题 | 粗体黑字 + 灰色拉丁副题（字距 2.6px） |
| 图表框 | 卡片 + 顶部凸浮帽条，发丝描边 |
| 页脚 | 贯穿全宽五色渐变条 |
| 页眉 | 章节色点 + 章节名，下方半段渐变线 |
| 封面 | 企服 + AI 主视觉：园区楼宇 / 证照公章 / 经营报表 → AI 芯片与节点网络 → 排序结果，流动渐变弧贯穿 |
| 封底 | 深墨蓝满版 |
| 章节配色 | 每章一对渐变端点，13 套 |

- 报告 28 页 / 速览 6 页，每页 3–4 个内容块：封面 / 导航 / 01 结论速览 ×2 / 02 企业画像 / 03 痛点画像 ×2 / 04 评分方法 ×2 / 05 排序总表 ×2 / 06 价值与门槛 / 07–11 前五场景各一页 / 12 数据就绪度 ×2 / 13 排期 / 14 投入与回报 ×2 / 15 风险与前置 / 16 90 天清单 / 17 未入选与复盘 / 附录 A–B / 封底
- 15 种图表：企服 AI 封面主视觉 · 气泡矩阵（含紧凑模式）· 桑基（痛点→场景→模块）· 数据就绪热力图 · 筛选漏斗 · 12 月甘特 · 四维贡献堆叠条 · 得分瀑布 · 四维雷达对比 · 痛点分组条 · 痛点严重度气泡 · 半环仪表 · 三步走阶梯 · 数据依赖弧 · 权重条
- 色板分域并通过色觉校验：四维轴 #E0635C / #1157B5 / #0E9F6E / #C9A227，痛点四组 #8A54DC / #0FA3C7 / #C4457E / #FF8A3D，两组不同图；模块名一律中性标签，不做颜色编码
