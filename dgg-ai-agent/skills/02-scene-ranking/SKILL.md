---
name: 企业AI高价值场景排序
id: scene-ranking
kind: 计算
credits: 20
version: 1.1.1
suite: 薯片AI智能体 2026.09
updated: 2026-09-21
triggers: [场景排序, 高价值场景, 先做哪个场景, 从哪开始, AI能干什么, 哪个场景最值, 优先级, 场景优先级排序台, 痛点]
inputs: [profile, pains, conditions, weights]
data_files: 17
datasets: 4
actions: 6
llm_calls: 1
llm_timeout_ms: 8000
offline: true
deterministic: true
delivers: [chat, board, print, wechat]
report_pages: 28
brief_pages: 6
universal: dus-1
---

# 企业AI高价值场景排序

从本行业 13 个候选场景里排出优先级，告诉企业先做哪一个。评分用 DM 定稿的四维公式：痛点强度、数据可得、见效周期、实施门槛，四维各 1–5 分加权后换算百分制。输出前 8 个场景的排序表、三步走组合（先做 1 个、再做 2 个、储备 2 个）、首选场景的一页纸方案、数据补齐清单、12 个月排期、投入档位与三档推进情景。

这个模块的特点是**排序会随企业现状变化**：勾了「没有 ERP」，排产类场景的数据可得直接降为 1 分，自动排到后面；补上一个数据源，相关场景的排名会明显上移。四维权重可以在现场调，调完立即重排。

## 何时调用

- 用户问「AI 能给我们干什么」「先做哪个场景」「从哪开始」「哪个最值」
- 用户刚做完「企业AI成熟度评估」，会话里已有企业画像与短板维度，接着问下一步做什么
- 顶呱呱销售或 FDE 在入企诊断中帮企业定首个落地场景
- 企服同行帮自己的客户排序

## 输入补全

输入四样：`profile`（企业画像，13 项，会话里有就不再问）、`pains`（勾 3–8 项痛点并给严重度）、`conditions`（四项现状与目标）、`weights`（可选，默认标准权重）。

### 1. 企业画像

与「企业AI成熟度评估」共用 `_shared/company-profile.schema.json`，13 项、9 项必填，追问顺序与取值见该 schema 与 `_shared/profile-fields.json`。**会话里已有就直接复用，只复述一遍让用户确认。**

其中两项对本模块影响最大：

- `industry` 决定用哪个行业大类的场景库与痛点库（14 个大类，每个 13 个场景 + 16 条痛点）
- `systems` 决定数据可得这一维（占 30% 权重），关键数据源缺失时该场景直接计 1 分

### 2. 痛点（3–8 项，每项 1–5 严重度）

- 候选来自 `data/sectors/<sector>.json` 的 `pains`，每个行业大类 16 条，分四组各 4 条：获客与销售 / 交付与生产 / 成本与财务 / 组织与管理
- 按组念给用户听，一次念一组四条，让用户挑「说中了的」；每条都是老板自己会说出口的原话
- 每勾一条追问严重度：1 偶尔遇到 / 2 时常遇到 / 3 明显影响经营 / 4 每周都在处理 / 5 当前头等问题。用户不给就记 3
- 少于 3 项不计算，提示「再挑一两条，排序才分得开」；超过 8 项提示「挑最困扰的 8 条以内，选太多反而拉不开差距」
- 用户说的痛点不在库里，选语义最接近的一条并复述确认，不新增标签

### 3. 现状与目标（四项，全部必填，取值见 `data/conditions.json`）

| 字段 | 问法 | 取值 | 影响 |
|---|---|---|---|
| `dataState` | 数据现在放在哪 | `paper` 纸质与手工为主 / `excel` 主要在 Excel / `system` 大部分在业务系统 / `scattered` 多系统未打通 | 依赖系统的场景，数据可得分调整 −1 / −0.5 / 0 / −0.5 |
| `objective` | 接下来半年最想改善 | `cost` 降成本 / `revenue` 增收入 / `efficiency` 提效率 / `compliance` 控风险 | 同分场景优先排与该目标相关的 |
| `window` | 希望多久看见结果 | `m3` / `m6` / `m12` | 3 个月内：见效 < 4 分的场景下调 1 分；12 个月：见效 ≤ 2 分的回调 0.5 分 |
| `capacity` | 能投入的人 | `none` 暂无专人 / `part` 现有人员兼职 / `one` 1 名专职 / `team` 一个小团队 | 实施门槛分调整 +1 / +0.5 / 0 / −0.5 |

### 4. 权重（可选）

不传就用标准权重。四个预设见 `data/axes.json` 的 `presets`：

| 预设 | 痛点 | 数据 | 见效 | 门槛 | 用在什么时候 |
|---|---|---|---|---|---|
| `dm` 标准权重 | 0.35 | 0.30 | 0.20 | 0.15 | 默认，DM 定稿口径 |
| `quick` 先要见效 | 0.30 | 0.25 | 0.35 | 0.10 | 用户强调「三个月内要看到结果」 |
| `ready` 先看条件 | 0.25 | 0.45 | 0.15 | 0.15 | 用户强调「先做能马上做的」 |
| `painful` 先解痛点 | 0.50 | 0.25 | 0.15 | 0.10 | 用户有一个压倒性的头等问题 |

用户自己给权重时按和为 1 归一化，`weights.preset` 记为 `custom`。

## 步骤

### 1. compute（`core/compute.js`，确定性、离线、无网络）

评分公式（DM 定稿，一字不改）：

```
总分 = 痛点强度 × 0.35 + 数据可得 × 0.30 + 见效周期 × 0.20 + (6 − 实施门槛) × 0.15
```

四维各 1–5 分。数据可得、实施门槛与见效周期三轴在按 `dataState` / `capacity` / `window` 调整后都可能落到 0.5 档（内核用 `clamp(round1(...), 1, 5)` 保留一位小数），所以单轴分数可能是 4.5、2.5 这样的值。加权后除以 5 再乘 100 换算为百分制。

| 维度 | 怎么算 |
|---|---|
| 痛点强度 | 场景的 `painTags` 与用户勾选痛点求交集，命中项的严重度求和除以 `painTags.length × 5` 得比值，映射到 1–5 分：0 → 1；≤0.25 → 2；≤0.5 → 3；≤0.8 → 4；>0.8 → 5 |
| 数据可得 | 场景 `dataDeps` 为空 → **5 分且不再调整**（无需接入系统，`dataState` 对它不起作用）；与 `profile.systems` 交集为空 → **直接 1 分且不再调整**；其余按覆盖比例定基分：全部具备 → 5 分，具备比例 ≥ 半数 → 4 分（正好半数也算），否则 3 分；只有这三档基分会再按 `dataState` 调整（−1 / −0.5 / 0 / −0.5） |
| 见效周期 | 取场景库预设 `cycle`，再按 `window` 调整 |
| 实施门槛 | 取场景库预设 `barrier`，再按 `capacity` 调整；计分时取（6 − 门槛） |

排序：总分降序 → 契合 `objective` 者优先 → 价值高者优先 → id 升序。前 8 个进排序表，其余 5 个进「未入选」并给出原因。

| 派生项 | 规则 |
|---|---|
| 三步走组合 | 先做：排名最高且 `startable`（数据可得 ≥ 3 且门槛 ≤ 4）的 1 个；再做：接下来 2 个 `startable` 的；储备：价值 ≥ 4 且关键数据源缺失的 2 个，不足时按排名续取 |
| 数据就绪度 | 13 场景 × 7 系统的就绪矩阵（0 不需要 / 1 需要但缺 / 2 需要且已有）、补齐清单（按解锁场景数降序）、就绪百分比与档位 |
| 筛选漏斗 | 场景库全量 182 → 本行业 13 → 命中所选痛点 → 数据条件具备 → 进入排序表 8 → 首批启动 1 |
| 12 个月排期 | 三批次映射到 1–3 / 4–8 / 9–12 月，每个场景按 `weeks` 画条，储备批次标虚线 |
| 投入档 | 取前两批场景里最高的一档；四档说明见 `data/report-text.json` |
| 三档情景 | 保守 1 个场景 / 中性 3 个 / 积极 5 个，各带范围、人力、预期与注意事项 |
| 角色分工 | 牵头人、业务对接人（取首选场景的使用岗位）、数据对接人（按 `itStaff` 生成） |
| 何时重跑 | 5 条触发条件，结合本次缺失数据源与首批场景生成补充说明 |
| 90 天清单 | 首选场景的第一步、数据整理、前置条件、配置试运行、验收，再加第二批准备与数据补齐评估 |
| 风险提示 | 共 7 条规则：由 `dataState`、`systems`、`capacity`、缺失数据源、周期与期望窗口的差距，以及「`itStaff` 为无 × 投入档为重」触发（七条全未命中时输出一条兜底「提示」，见「降级」表），**按规则书写顺序输出，不做级别排序**；壳层若要按 高 > 中 > 提示 呈现，自己排 |

输入不合法时返回 `{ ok: false, errors: [...] }`，不扣积分，把 `errors` 翻译成一句追问。

### 2. llm（可选，至多一次，8 秒超时）

- 提示词 `prompts/polish.md`，由 `buildPrompt(result, data)` 填充；只润色**前三个场景的「为什么排这里」**，四维得分、场景名、模块名、数字一律不动
- 返回先剥离代码围栏再解析 JSON；解析失败、条数不是 3、单句超 80 字、命中禁忌词，任一发生即整体放弃润色
- 润色成功的条目 `source = "llm"`（`mergePolish(result, llmText, lint)`）

### 3. 输出前

全部文本字段过 `_shared/lint-words.json` 的 hard 项。数据表在构建期已扫过（`scripts/lint.js`），运行期只需扫 LLM 返回。

## 输出

严格按 `schema/output.json`（成功 / 失败两种形态）。

### 对话回复（`delivers: chat`）

1. 第一段用 `summaryText`（四段摘要：所属行业与痛点分布 → 排第一的是什么 → 三步走 → 第一步）
2. 然后按 `quickView` 六问六答列出，每问一行
3. 然后「排序表」：`ranked` 前 5 行，格式 `排名 · 场景名 · 四维得分 · 总分 · 对应模块`
4. 末尾积分行，再接转化句
5. 用户追问某个场景时用该场景的 `why`（四维依据）+ `dataList` + `firstStep` + `precondition` 回答；追问「数据够不够」用 `readiness`；追问「投多少」用 `investment` 与 `scenarios`；追问「谁来做」用 `roles`

### 排序台（`delivers: board`，有交互能力的壳）

现场可调的四维权重滑块 + 四个预设按钮，调整后立即重算重排。排序表与场景详情联动（点行即切换右栏详情）；气泡矩阵只随权重与「看全部 / 只看前 8 个」整体重画，本身不可点选。这是本模块在展台上的主形态，演示脚本：勾痛点 40 秒 → 读 Top1 的「为什么排这里」30 秒 → 展开 Top1 指出第一步与所需数据 40 秒 → 说明对应模块 10 秒。

### 结构化呈现（按 `render` 顺序）

| render.type | 数据 | 呈现 |
|---|---|---|
| `summary` | `summary` | 四段摘要 |
| `rank-table` | `ranked` | 排序表：排名 / 场景 / 四维 / 总分 / 模块 |
| `bubble-matrix` | `scenes` | 价值 × 门槛四象限，气泡大小为投入档 |
| `axis-bars` | `axes` | 四维权重条与得分构成 |
| `funnel` | `funnel` | 六层筛选漏斗 |
| `sankey` | `sankey` | 痛点分组 → 场景 → 模块 |
| `scene-card` | `top1` | 首选场景一页纸 |
| `heatmap` | `readiness` | 场景 × 数据源就绪矩阵 |
| `gantt` | `roadmap` | 12 个月三批次排期 |
| `invest-tiers` | `investment` | 四档投入与本次建议 |
| `risk-list` | `risks` | 风险提示 |
| `checklist` | `checklist` | 90 天启动清单 |

### 报告（`delivers: print / wechat`，原型 `prototype/src/module-02.js` 为参考实现）

完整版 28 页，A4 逐页不溢出；速览版 6 页（带 `brief` 标记的页：1 / 3 / 4 / 10 / 13 / 20）。

**版式身份**——与「企业AI成熟度评估」明确区分：章节标题为整条 3D 彩色凸浮条配圆角方序号徽章，条面带一道横贯整条的斜向光泽；小节标题为粗体黑字加灰色拉丁副题；内容卡为顶部凸浮帽条（模块 1 走左侧色轨）；页脚为贯穿全宽的五色渐变条（模块 1 为六色）；封面为「企服 → AI → 排序结果」主视觉；封底为深墨蓝满版。样式 `prototype/src/report-m2.css`、图表 `prototype/src/charts-m2.js`：这两个文件与模块 1 的 `report-m1.css` / `charts-m1.js` 作用域分别是 `.page.m2` 与 `.page.m1`，互不复用。两个模块仍共用三个底座文件——`report.css`（A4 页盒）、`charts.js`（调色板与通用图元）、`tokens.css`（设计变量）；排序台另有本模块专属的 `module-02.css`。

图表库共 15 种：`heroM2`（封面主视觉）· `dial` · `ladder` · `painBars` · `painBubbles` · `sankey` · `funnel` · `axisStack` · `waterfall` · `bubbleMatrix` · `radarCompare` · `heatmap` · `depArc` · `gantt` · `cover2`（封面备选主视觉，保留未启用，全仓库无调用点，封面实际用 `heroM2`）。

| 页 | 章节 | 数据 |
|---|---|---|
| 1 | 封面（速览） | `profile` · `ranked[0]` · `keyNumbers`（六项：候选场景 / 进入排序 / 首选场景 / 数据就绪 / 起步投入 / 首批见效） |
| 2 | 本报告导航 | `reportText.readingGuide` · `weights` · `axes` |
| 3–4 | 01 排序结论速览（速览） | `quickView` · `verdict` · `combo` · `ranked[0..2]` |
| 5 | 02 企业画像与现状 | `profile` · `conditions` · `readiness.systems` · `sectorInsight` |
| 6–7 | 03 痛点画像 | `pains` · `painProfile` · `sankey` · `painLibrary` |
| 8–9 | 04 评分方法 | `axes` · `formula` · `funnel` |
| 10–11 | 05 场景排序总表（第 10 页速览） | `ranked` · `scenes` · `contrib` |
| 12 | 06 价值与门槛 | `ranked` · `axes` |
| 13–17 | 07–11 前五个场景各一页（第 13 页速览） | `ranked[0..4]` |
| 18–19 | 12 数据就绪度 | `readiness` · `blocked` |
| 20 | 13 12 个月排期（速览） | `roadmap` · `combo` |
| 21–22 | 14 投入与回报 | `investment` · `scenarios` · `reportText.services` |
| 23 | 15 风险与前置条件 | `risks` · `ranked[].precondition` · `roles` |
| 24 | 16 90 天启动清单 | `checklist` |
| 25 | 17 未入选与复盘 | `excluded` · `retrigger` |
| 26–27 | 附录 A–B | `scenes` · `reportText.glossary` · `reportText.method` |
| 28 | 封底 | `reportText.contact` · `reportText.closing` |

### 打印与 PDF

与「企业AI成熟度评估」同一套纪律：报告的立体感全部由 **blur = 0** 的硬边明暗层次做出，屏幕与 PDF 是同一套视觉，不设「打印时降级」的分支样式。Chromium 导出 PDF 时会把带模糊的效果栅格化成带 `/SMask` 的位图，在纸面上表现为灰色方块。

| 绝对不能用（实测会产生位图） | 改用 |
|---|---|
| `box-shadow` 的 blur > 0 | 多层 blur = 0 的外阴影逐级变淡 |
| `text-shadow` 的 blur > 0 | `text-shadow: 0 1px 0 <不透明色>` |
| 任何 `filter`——`blur` / `drop-shadow` 自不必说，`brightness` / `saturate` / `opacity(1)` 实测同样栅格化 | 用 `background` 层或 `box-shadow` 的 `inset` 表达 |
| 半透明 `border`（`rgba` / 八位 hex / `color-mix` 带 `transparent`）叠在渐变背景上 | 不透明实色描边 |
| 被圆角裁剪的表格单元格上堆多层 `background` | 单层渐变加 `inset` 阴影 |

矢量安全、可放心使用：`border-radius`、`overflow: hidden` 裁剪、`clip-path`、`opacity`、单层渐变、`box-shadow` 的 `inset` 与 blur = 0 外阴影。

章节标题栏的凸浮结构自上而下六层：顶棱硬高光 → 柱面连续衰减（白与黑的 alpha 叠层，不换色，保住 `--mc → --mc2` 的彩色流动）→ 左右棱受光与背光 → `inset` 压暗的底部侧壁（厚度）→ 1px 转折暗线 → 三级 blur = 0 落影（浮）。侧壁厚度由 `--wall` 控制，取无单位数值，`calc()` 里乘 `1px` 使用。卡片顶部的凸浮帽条同口径：单层横向渐变加上下两道 `inset`，外加一层 blur = 0 落影。

自查办法：导出后统计 PDF 里 `/Subtype /Image` 与 `/SMask` 对象数。当前基准为完整版 22 张位图、速览版 6 张，其中带 `/SMask` 的各 3 张，来自封面主视觉与 logo，属正常内容。数量级跳到几十上百，说明有模糊效果漏进来了。

会话内保存 `profile`、`ranked[0]` 与 `investment.tier`，供「企业AI投入ROI测算器」读取首选场景与投入档作为默认值。

## 积分

每次成功输出（`ok = true`）扣 20 积分（`_shared/credits.json`）。回复末尾带一行：`本次消耗 20 积分 · 剩余 {remaining}`。输入不合法、用户中途放弃，不扣。

## 转化

结果给出后一句收尾：「排在第一的『{top1.name}』对应的是{top1.module}模块，轻享版 0 元现在就能开通。」用户问「具体能省多少钱」时进入「企业AI投入ROI测算器」；用户问「你们能不能帮我们做」时给「专家入企 AI 诊断 1980 元 / 1 天」。

## 结论词纪律

- 只写肯定句与做法；场景名、环节、替代对象、预期指标一律用场景库原文
- 排序理由固定为「命中了哪些痛点 + 数据条件如何 + 见效与门槛」三段式，不写「不适合」「做不了」
- 预期指标带区间，不给单点承诺；投入只给区间与档位，不给具体报价
- 金额、回收期、分月现金流一律指向「企业AI投入ROI测算器」，本模块不算
- 未入选场景写「本轮暂缓」「补齐后重新评估」，不写「价值低」
- 服务名与模块名以 DM 为准，原文引用
- 禁止：「不是…而是…」句式、「手术」「骨架」「刀」「裁员」「减员」、任何软件或数据源厂商名、绝对化用语（`_shared/lint-words.json`）

### 校验分两层

`schema/input.json` 能表达的在 schema 层拦，跨字段约束由内核 `validate()` 兜底。两层的报错文案一一对应。

| 检查项 | schema | 内核 |
|---|---|---|
| 痛点项数 3–8、严重度 1–5、id 格式 | ✔ | ✔ |
| conditions 四项必填与取值 | ✔ | ✔ |
| 权重 0–1、画像必填、systems「无」互斥 | ✔ | ✔ |
| 多出字段 | ✔ | ✘（内核忽略多余字段照常计算，由输入补全层拦截） |
| 痛点 id 是否属于本企业所在行业大类 | 表达不了（需跨字段比对 `profile.industry`） | ✔ |
| 痛点按 id 去重 | 表达不了（`uniqueItems` 比的是整个对象） | ✔ |
| 四维权重之和大于 0 | 表达不了（draft-07 无求和约束） | ✔ |

## 降级

| 情况 | 处理 |
|---|---|
| LLM 超时 / 解析失败 / 命中禁忌 | 用模板理由，不带 `source` 字段；界面标「初稿」 |
| 勾选痛点与所有场景都不匹配 | 全部场景痛点强度计 1 分，排序仍成立，由数据可得与见效周期拉开差距；速览第 2 问说明这一点 |
| 企业无任何业务系统 | 依赖系统的场景数据可得全部计 1 分，零依赖场景自动升到前列；触发「暂无业务系统」高风险提示 |
| 缺失数据源为 0 | `readiness.missing` 为空数组，第 19 页改为展示各场景数据来源 |
| 无风险规则命中 | `risks` 给一条「提示」级：本次作答未触发风险提示 |
| 行业大类没有场景库 | 返回 `ok = false`，提示「行业大类 {key} 没有场景库」；14 个大类当前均已覆盖，只在新增行业时可能出现 |
| 输入不合法 | `ok = false` + `errors`，翻译成追问，不扣积分 |
| 网络不可用 | 全流程照常，本 skill 无任何必需的网络调用 |

## 文件

```
SKILL.md                          本文件
schema/input.json                 输入结构（profile 引用共用画像 + pains 3–8 + conditions 四项 + 可选 weights）
schema/output.json                输出结构（success / failure 两种形态，definitions 内含全部子结构）
core/compute.js                   内核：validate / compute / buildPrompt / mergePolish（UMD，Node 与浏览器共用）
prompts/polish.md                 润色提示词（只润色前三个场景的排位理由）
data/sectors/_SPEC.md             场景库与痛点库的数据规格
data/sectors/<sector>.json        14 个行业大类，各 16 条痛点 + 13 个场景（合计 224 + 182）
data/axes.json                    四维定义、DM 定稿公式、四个权重预设
data/conditions.json              痛点四分组、四项现状条件与调整幅度、严重度文案
data/report-text.json             报告固定文案：标题 · 阅读指引 · 方法 · 三批次 · 投入四档 · 三档情景 · 角色 · 重跑条件 · 服务 · 术语 · 联系方式
examples/S1–S4.*.json             四套样例企业的输入与 golden 输出
scripts/load-data.js              组装 compute() 的 data 包（data/ + _shared/）
scripts/run-examples.js           跑样例、写 golden、打印摘要
scripts/validate-data.js          场景库校验：字段取值、标签闭环、模块与投入档覆盖度、14 个大类齐全
scripts/validate-schema.js        契约校验：样例过 schema · 枚举与数据表一致 · 常量与内核一致 · 反例被拒
scripts/lint.js                   构建期禁忌词扫描
../../prototype/src/module-02.js  报告与排序台渲染参考实现（28 页 / 速览 6 页）
../../prototype/src/module-02.css 排序台样式（痛点矩阵 · 权重滑块 · 排序表 · 报告增补）
../../prototype/src/report-m2.css 模块 2 专属版式（3D 凸浮标题栏 · 圆角方徽章 · 卡片顶部帽条）
../../prototype/src/charts-m2.js  模块 2 专属图表库（14 种，含封面主视觉 heroM2）
../_shared/company-profile.schema.json  企业画像 JSON Schema（由模块 1 的生成脚本产出）
../_shared/profile-fields.json    企业画像 13 字段定义
../_shared/industries.json        14 大类 / 54 细分行业
../_shared/credits.json           积分表
../_shared/lint-words.json · lint.js  禁忌词表与扫描器
```

## 验证

```bash
node scripts/validate-data.js     # 场景库校验，14 / 14 个大类，问题 0 处
node scripts/run-examples.js      # 四套样例 → examples/*.output.json（改内核或数据后先跑）
node scripts/validate-schema.js   # 契约校验，全部 ✔ 才能交付
node scripts/lint.js              # 禁忌词扫描，硬命中为 0

# 报告版式改动后还要在原型里验分页（脚本在 prototype/ 下，需 NODE_PATH 指向全局 playwright）
cd ../../prototype && node build.js
NODE_PATH=$(npm root -g) node test/measure-m2.js      # 逐页量高，溢出须为 0 页
NODE_PATH=$(npm root -g) node test/screenshot-m2.js   # 全流程 + 屏幕与内核逐字比对 + 导出 PDF 核页数
```

## 与 AI OS 的对应

| 本包 | 平台概念 |
|---|---|
| 本文件 | 智能体指令 |
| `core/compute.js` + `schema/*` | 代码节点 / 工具（有代码执行能力时）；否则把「步骤」一节的规则表交给模型照表执行，并以 `examples/*.output.json` 为对照 |
| `data/sectors/*.json` | 知识库 / 数据表（182 个场景 + 224 条痛点） |
| `data/axes.json` · `data/conditions.json` | 评分配置（权重可做成运行时参数） |
| `prompts/polish.md` | LLM 节点提示词 |
| `_shared/company-profile.schema.json` | 会话变量 `profile`（11 个模块共用） |
| `credits` | 计费钩子 |
| `render` / 报告页表 | 卡片模板 / 打印模板 |
