---
name: 企业AI成熟度评估
id: ai-maturity
kind: 计算
credits: 20
version: 2.2.0
suite: 薯片AI智能体 2026.09
updated: 2026-09-20
triggers: [AI成熟度, 成熟度评估, 数字化程度, 我们公司适合上AI吗, AI基础, 同行水平, 六维, AI诊断, 该从哪一步开始]
inputs: [profile, answers]
data_files: 9
datasets: 4
actions: 4
llm_calls: 1
llm_timeout_ms: 8000
offline: true
deterministic: true
delivers: [chat, print, wechat]
report_pages: 28
brief_pages: 6
universal: dus-1
---

# 企业AI成熟度评估

用 36 道题给企业的 AI 成熟度打分：六个维度（战略、数据、流程、人员、预算、合规）各三个子维度，每个子维度两题，每题四选项对应 0–3 分。子维度 0–6 分、维度 0–18 分、总分 0–108 分，换算成百分比后映射到 L0–L4 五级；与同行业同规模的参考带比较，估算同行百分位；输出 12 个月九项行动、90 天清单、五个推荐场景、投入档位与风险提示，另出距下一级的逐维补分计划、推进这件事的三个角色分工、以及什么情况下值得重评。同一份输出既能在对话里三句话讲完，也能直接排成 28 页咨询报告（速览 6 页）。

## 何时调用

- 用户想知道自己公司「适不适合上 AI」「在同行里处于什么位置」「该从哪一步开始」「先投多少」
- 用户刚接触薯片AI智能体，还没选定场景。本 skill 是三个体验版的第一步，输出的六维得分与短板维度会作为「企业AI高价值场景排序」的痛点提示
- 顶呱呱销售或 FDE 在入企诊断前做快速摸底，或在展台上现场出一份可打印的报告

## 输入补全

输入只有两样：`profile`（企业画像，13 项，其中 9 项必填）和 `answers`（36 题作答）。按下面的顺序追问，缺什么问什么；会话里已有的企业画像一律不再问，只复述一遍让用户确认。

### 企业画像（字段定义见 `_shared/profile-fields.json`，取值见 `_shared/company-profile.schema.json`）

| # | 字段 | 必填 | 取值 | 追问时的处理 |
|---|---|---|---|---|
| 1 | `name` 企业名称 | 否 | 文本 | 为空时所有输出用「本企业」 |
| 2 | `industry` 所属行业 | 是 | 54 个细分行业 slug（14 个大类） | 先问大类再问细分。用户只说「制造」「财税」这类顶栏 6 行业时，按 `industries.json` 的 `display[].default` 落到默认细分，复述让用户确认；用户说的行业不在表内时，选最接近的细分，实在没有用 `other-general` |
| 3 | `size` 人员规模 | 是 | `1_20` / `21_50` / `51_100` / `101_300` / `300_plus` | 用户说具体人数时直接归档 |
| 4 | `revenue` 上年营收 | 是 | `lt5m` / `5m_20m` / `20m_100m` / `100m_500m` / `gt500m` | 用户说「几千万」时归到对应档；不愿说时提示「选一个大致区间即可」 |
| 5 | `province` 所在地 | 是 | 省级行政区简称，如「浙江」 | 「浙江省」「杭州」都归到「浙江」 |
| 6 | `years` 成立年限 | 是 | `lt1` / `1_3` / `3_5` / `5_10` / `10_plus` | 用户说成立年份时按今年换算 |
| 7 | `ownership` 企业性质 | 是 | `private` / `soe` / `foreign` / `individual` | |
| 8 | `customers` 主要客户类型 | 是 | `b2b` / `b2c` / `b2g` / `mixed` | |
| 9 | `systems` 现有业务系统 | 是 | 多选：`erp` / `finance` / `crm` / `oa` / `mes` / `shop` / `hr` / `none` | `none`（无）只能单独出现；用户说「用金蝶」归 `finance`，「有钉钉」归 `oa` |
| 10 | `itStaff` 数字化专职人员 | 是 | `none` / `1_2` / `3_10` / `10_plus` | |
| 11 | `branches` 分支机构 / 门店 | 否 | `single` / `2_5` / `6_20` / `20_plus` | 不问也可，默认单一经营地 |
| 12 | `overseas` 海外业务 | 否 | `no` / `yes` | 不问也可，默认无 |
| 13 | `role` 填表人 | 否 | `owner` / `dept` / `it` / `other` | 不问也可 |

选填三项在对话里可以一句带过（「有没有分支机构或海外业务？」），用户不答就留空。

### 36 题

- 题库 `data/questions.json`，顺序固定 q01–q36：q01–q06 战略，q07–q12 数据，q13–q18 流程，q19–q24 人员，q25–q30 预算，q31–q36 合规
- 一次只问一题，给出四个选项，用户点选即记分（选项下标即得分 0–3）；每题带一句 `explain`，用户问「这题什么意思」时用它回答
- 用户一次答了多题，按题号对应记录；用户要改前面的答案，直接改对应下标
- 36 题必须答全才计算；用户中途想停，告诉他「已答 n / 36 题，随时可以继续」，不出半份结果
- 进入题目前先报一句「共 36 题，六个维度各六题，大约 6–8 分钟」

## 步骤

### 1. compute（`core/compute.js`，确定性、离线、无网络）

| 计算项 | 规则 |
|---|---|
| 子维度得分 | 两题得分之和（0–6）→ 分档：0–2 待加强 `low` / 3–4 基本具备 `mid` / 5–6 已建立 `high`；诊断段落按「子维度 × 分档」从 `data/diagnostics.json` 取 |
| 维度得分 | 三个子维度之和（0–18）→ 百分比；维度自身等级按同一套 `minPct` 判定，用于挑该维度的行动 |
| 总分与等级 | 六维之和（0–108）→ 百分比 → `data/levels.json` 按 `minPct` 取最高满足的等级：L0 起步 0% / L1 尝试 25% / L2 场景 44.4% / L3 流程 66.7% / L4 经营 86.1% |
| 距下一级 | `gapPts` = 下一级门槛分 − 当前总分（向上取整，至少 1）；已是 L4 时 `nextLevel = null` |
| 同行参考带 | `data/benchmark.json` 取「细分行业-规模」格（`basis = exact`）；缺格取同行业最近规模格（`nearest-size`）；行业无格则 `none`，参考带相关字段为 null |
| 维度位置 | 低于参考带下限 = `below`，高于上限 = `above`，其余 = `within`；无参考带 = `unknown` |
| 同行百分位 | 用参考格的均值与标准差做正态估算，取 1–99 之间的整数；无参考带为 null |
| 短板维度 | 六维按「本维百分比 − 参考带下限」升序（参考带也是百分制；无参考带时直接按百分比），同值再按百分比兜底；前三个为 `weakDims`，后三个为 `strongDims`。注意比的是百分比不是 0–18 的原始得分，两者量纲不同 |
| 九项行动 | 每个维度按「维度 × 该维度自身等级」从 `data/actions.json`（60 条）取模板：短板三维各取第 1 条进「第 1–3 个月 · 打基础」，各取第 2 条进「第 4–6 个月 · 见成效」，优势三维各取第 1 条进「第 7–12 个月 · 扩规模」；每条带负责人、三步做法、交付物、周期、投入档、验收指标、对应服务与模块 |
| 90 天清单 | 打基础三项行动的三步做法，按第 1–4 / 5–8 / 9–12 周落位，共 9 条 |
| 推荐场景 | `data/scenes.json` 取本行业大类的场景（每个大类 5 个，`other` 大类为通用场景），按 价值×0.4 + (6−难度)×0.25 + 数据条件×0.35 + 拉动短板维度数（至多 2）×0.3 打分排序，取前 5；数据条件由 `profile.systems` 是否覆盖场景的 `dataDeps` 决定，并写明「需先补齐：…」 |
| 投入档 | 由 q27（可接受投入区间）的选项直接映射：暂不考虑 = 零 / 5 万以内 = 轻 / 5–20 万 = 中 / 20 万以上 = 重；四档说明见 `data/report-text.json` |
| 风险提示 | `data/risks.json` 16 条规则，条件为「某子维度处于某分档」或「画像某字段等于某值」，命中即列出，按 高 > 中 > 提示 排序；可能为空 |
| 逐维补分计划 | `gapPlan`：`needPts` = ⌈下一级门槛百分比 × 108⌉ − 当前总分；逐维缺口 = max(0, 下一级门槛百分比 − 本维百分比) 折算成分，按缺口占比把 `needPts` 摊成每维的 `alloc`；`gapPct` 为「门槛 − 本维百分比」，本维已过门槛时为负数且 `reached = true`、`alloc = 0`。已是 L4 时整个 `gapPlan = null` |
| 角色分工 | `roles`：三条模板取 `data/report-text.json` 的 `roles`，`who` 按画像与最弱维度改写（牵头人 / 业务对接人 / 数据对接人），各带职责与每月投入时间 |
| 何时重评 | `retrigger`：五条模板取 `data/report-text.json` 的 `retrigger`，`extra` 结合本次结果补一句（如本次的三件事、当前已有系统、当前 IT 人数），无补充时为空串 |
| 结论速览 | `quickView` 六问六答（阶段 / 同行位置 / 最强 / 短板 / 先做什么 / 投多少）、`verdict` 总体判断横幅、`directions` 六维标 优先 / 次批 / 保持、`keyNumbers` 六个关键数字、`summary` 四段摘要与 `summaryText` |

输入不合法时返回 `{ ok: false, errors: [...] }`，不扣积分，把 `errors` 翻译成一句追问（如「行业没识别出来，是机械五金还是电子电器？」）。

### 2. llm（可选，至多一次，8 秒超时）

- 提示词 `prompts/polish.md`，由 `buildPrompt(result, data)` 填充；只润色**打基础三项行动**（`actions[0..2]`）的 `title` 与 `why`，其余六项与所有服务名、模块名、数字一律不动
- 返回先剥离代码围栏再解析 JSON；解析失败、条数不是 3、标题超 14 字、正文超 60 字、命中禁忌词，任一发生即整体放弃润色，保留模板
- 润色成功的条目 `source = "llm"`，否则 `source = "template"`（`mergePolish(result, llmText, lint)`）

### 3. 输出前

全部文本字段过 `_shared/lint-words.json` 的 hard 项（`_shared/lint.js`），命中即回落模板。数据表在构建期已扫过（`scripts/lint.js`），运行期只需扫 LLM 返回。

## 输出

严格按 `schema/output.json`（成功 / 失败两种形态）。

### 对话回复（`delivers: chat`）

1. 第一段用 `summaryText`（四段摘要拼成的一段话）
2. 然后按 `quickView` 六问六答列出，每问一行：`问 → 答（一句说明）`
3. 然后「未来三个月先做三件事」：`actions[0..2]` 各一行，格式 `维度 · 标题 · 负责人 / 周数 / 投入档 · 对应服务`
4. 末尾积分行，再接转化句（见下）
5. 用户追问某个维度时，用该维度的 `summary` + 三个子维度 `diagnosis` + `recommendations` 回答；追问场景时用 `scenes`；追问风险时用 `risks`；追问「投多少」时用 `investment`；追问「离下一级还差多少」「差在哪一维」时用 `gapPlan`；追问「谁来做」时用 `roles`；追问「多久再评一次」时用 `retrigger`

### 结构化呈现（有渲染能力的壳按 `render` 顺序）

| render.type | 数据 | 呈现 |
|---|---|---|
| `summary` | `summary` | 四段摘要 |
| `radar` | `dimensions` | 六维雷达，`band = true` 时叠加同行参考带 |
| `level-scale` | `level` | 等级刻度 + 当前位置 + 距下一级（同时取用 `levels` 与 `nextLevel`） |
| `distribution` | `distribution` | 同行分布曲线与本企业位置（同时取用 `percentile`；无参考带时两者均为 null，本项不渲染） |
| `dimension-detail` | `dimensions[]` | 每维：得分 / 位置 / 三个子维度诊断 / 两条建议 |
| `ranked-bars` | `subdims` | 十八项子维度排序条 |
| `roadmap` | `roadmap` / `actions` | 12 个月三阶段九项行动 |
| `action-list` | `actions` | 行动卡：三步做法 · 负责人 · 交付物 · 周期 · 投入档 · 验收指标 · 服务 · 模块 |
| `scene-matrix` | `scenes` | 价值 × 难度矩阵 + 五个场景卡 |
| `risk-list` | `risks` | 风险提示，按级别 |
| `checklist` | `checklist` | 90 天可勾选清单 |

`gapPlan`、`roles`、`retrigger` 不进 `render` 序列（与「企业AI高价值场景排序」同口径）：它们是报告页与追问的内容，由报告第 07 / 11 / 13 章消费，对话里按上面第 5 条按需引用。`gapPlan` 在已是 L4 经营级时为 `null`，此时报告第 07 章改述「已在最高一级，重点是保持」。

### 报告（`delivers: print / wechat`，原型 `prototype/src/module-01.js` 为参考实现）

完整版 28 页，A4 逐页不溢出；速览版 6 页（带 `brief` 标记的页：1 / 3 / 4 / 6 / 17 / 19）。

**版式身份**——与「企业AI高价值场景排序」明确区分：章节标题为整条 3D 彩色凸浮条配六边形序号徽章，章节栏右端带刻度装饰；内容卡走左侧色轨（档案感）；小节标题为粗体黑字加拉丁副题加双细线；页脚为六色渐变条；封面主视觉为「企业经营现状 → 六维雷达加 AI 核心 → 等级阶梯」三段式；封底深墨蓝满版。样式 `prototype/src/report-m1.css`、图表 `prototype/src/charts-m1.js`：这两个文件与模块 2 的 `report-m2.css` / `charts-m2.js` 作用域分别是 `.page.m1` 与 `.page.m2`，互不复用。两个模块仍共用三个底座文件——`report.css`（A4 页盒 `.report` / `.pages` / `.page`）、`charts.js`（调色板与通用图元）、`tokens.css`（设计变量）。

| 页 | 章节 | 数据 | 图表 |
|---|---|---|---|
| 1 | 封面（速览） | `profile` · `level` · `pct` · `percentile` · `total` · `nextLevel` · `positions` · `investment` · `summary.position` | `heroM1` · `scoreArc` |
| 2 | 本报告导航 | `levels` · `benchmark` · `distribution` | — |
| 3 | 01 诊断结论速览（速览） | `quickView` · `verdict` · `dimensions` · `strongDims` · `weakDims` · `investment` | — |
| 4 | 01 诊断结论速览 · 续（速览）〔页内标题「未来三个月先做三件事」〕 | `actions[0..2]` · `directions` · `summary.next` | — |
| 5 | 02 企业画像 | `profile` · `sectorInsight` · `benchmark` · `level` | — |
| 6 | 03 总体成熟度（速览） | `pct` · `total` · `level` · `levels` · `nextLevel` | `scoreArc` · `levelLadder` |
| 7 | 03 总体成熟度 · 续〔页内标题「六维形状与同行参考带」〕 | `dimensions` · `positions` · `summary.dims` | `radarPro` · `dimBullet` |
| 8 | 03 总体成熟度 · 续〔页内标题「同行位置与作答分布」〕 | `percentile` · `distribution` · `answers` · `answerDistribution` | `distCurve` · `gauge6` · `answerGrid` |
| 9–14 | 04.1–04.6 六维逐项诊断（战略 / 数据 / 流程 / 人员 / 预算 / 合规，每维一页） | `dimensions[i]`（含 `subdims` 的 `diagnosis` 与 `recommendations`）· `answers` 本维六题 | — |
| 15 | 05 优势与短板 | `subdims` 排序 · `strengths` · `weaknesses` · `summary.subs` | `subHeat` |
| 16 | 06 AI 优先方向 | `directions` · `dimensions` | `dimDiverge` |
| 17 | 07 距下一级的差距（速览） | `gapPlan`（`needPts` · `needPct` · `focus` · 六维 `items`）· `level` · `directions` | `gapBars` |
| 18 | 08 推荐场景 | `scenes` | `matrix` |
| 19 | 09 升级路线图（速览） | `roadmap` · `actions` | `actionFlow` |
| 20 | 09 升级路线图 · 续〔页内标题「九项行动明细」〕 | `actions` | — |
| 21 | 10 投入与回报 | `investment`（含四档 `tiers`）· `reportText.services` | — |
| 22 | 11 风险与合规 | `risks` · `roles` | — |
| 23 | 12 90 天行动清单 | `checklist` · `actions[0].kpi` | — |
| 24 | 13 何时重评 | `retrigger` | — |
| 25–26 | 附录 A 评分明细 | `answers` · `dimensions` · `subdims` | — |
| 27 | 附录 B 方法与来源 | `benchmark` · `reportText.method` · `reportText.glossary` | — |
| 28 | 封底 | `reportText.contact` · `reportText.closing` | — |

标题为 L4 经营级时没有下一级，`gapPlan` 为 `null`，第 17 页改述「已在最高一级」，页数不变。

报告标题、出具方、阅读指引、方法说明、术语、联系方式、结语全部取 `data/report-text.json`，界面上不出现「演示环境」「样例企业」等非正式系统文案。

### 打印与 PDF

报告的立体感全部由 **blur = 0** 的硬边明暗层次做出，屏幕与 PDF 是同一套视觉，不设「打印时降级」的分支样式。这条纪律不能松：Chromium 导出 PDF 时会把带模糊的效果栅格化成带 `/SMask` 的位图，在纸面上表现为灰色方块。

| 绝对不能用（实测会产生位图） | 改用 |
|---|---|
| `box-shadow` 的 blur > 0 | 多层 blur = 0 的外阴影逐级变淡 |
| `text-shadow` 的 blur > 0 | `text-shadow: 0 1px 0 <不透明色>` |
| 任何 `filter`——`blur` / `drop-shadow` 自不必说，`brightness` / `saturate` / `opacity(1)` 实测同样栅格化 | 用 `background` 层或 `box-shadow` 的 `inset` 表达 |
| 半透明 `border`（`rgba` / 八位 hex / `color-mix` 带 `transparent`）叠在渐变背景上 | 不透明实色描边 |
| 被圆角裁剪的表格单元格上堆多层 `background` | 单层渐变加 `inset` 阴影 |

矢量安全、可放心使用：`border-radius`、`overflow: hidden` 裁剪、`clip-path`、`opacity`、单层渐变、`box-shadow` 的 `inset` 与 blur = 0 外阴影。

章节标题栏的凸浮结构自上而下六层：顶棱硬高光 → 柱面连续衰减（白与黑的 alpha 叠层，不换色，保住 `--mc → --mc2` 的彩色流动）→ 左右棱受光与背光 → `inset` 压暗的底部侧壁（厚度）→ 1px 转折暗线 → 三级 blur = 0 落影（浮）。侧壁厚度由 `--wall` 控制，取无单位数值，`calc()` 里乘 `1px` 使用。

自查办法：导出后统计 PDF 里的 `/Subtype /Image` 对象数，以及 **`/SMask <对象号> <代号> R` 这种引用形式**的出现次数。注意不能裸数 `/SMask`——压缩流里有大量同名字面量，完整版裸数会得到 201，只有按引用形式数才是 3。当前基准：完整版 8 张位图、速览版 7 张，带蒙版的各 3 张，来自封面主视觉与 logo，属正常内容。位图数量级跳到几十上百，说明有模糊效果漏进来了。

会话内保存 `profile` 与 `dimensions` / `weakDims`，供「企业AI高价值场景排序」读取最弱两维作为痛点提示，「企业AI投入ROI测算器」读取 `investment.tier` 作为默认投入档。

## 积分

每次成功输出（`ok = true`）扣 20 积分（`_shared/credits.json`）。回复末尾带一行：`本次消耗 20 积分 · 剩余 {remaining}`。输入不合法、用户中途放弃，不扣。

## 转化

结果给出后，一句收尾：「完整评估报告与改进路线在专家入企 AI 诊断里出，1980 元，1 天入企。」用户提到「先做哪个场景」时，直接进入「企业AI高价值场景排序」，不再重复问企业信息；提到「要花多少钱」时进入「企业AI投入ROI测算器」。

## 结论词纪律

- 只写肯定句与做法；等级判断用 `levels.json` 的 `verdict` 原文，不另写评价
- 位置表述固定为「高于同行参考带 / 处于同行参考带内 / 低于同行参考带」，不用「落后」「差距大」
- 参考带在业务侧抽样到位前为估算值（`benchmark._meta.basis = estimated`）：对外一律说「同行参考带」「估算超过 n% 的同行」，不说「行业平均」「行业数据」「排名」
- 子维度分档只用「待加强 / 基本具备 / 已建立」三个词
- 服务名与模块名以 DM 为准，原文引用；不写价格以外的承诺
- 禁止：「不是…而是…」句式、「手术」「骨架」「刀」「裁员」「减员」、任何数据源厂商名、绝对化用语（`_shared/lint-words.json`）

## 降级

| 情况 | 处理 |
|---|---|
| LLM 超时 / 解析失败 / 命中禁忌 | 用模板行动，`source = template`；界面标「初稿」 |
| 参考带缺格 | 取同行业最近规模格，`benchmark.basis = nearest-size`，附录 B 注明（当前 270 格齐全，只在业务侧替换参考带后可能出现） |
| 行业无任何参考带 | `basis = none`：雷达不画参考带，位置全部 `unknown`，`percentile` / `distribution` 为 null，速览第 2 问答「参考带待补」，摘要不写位置句，报告第 8 页不画分布曲线 |
| 无风险规则命中 | `risks = []`，第 22 页的风险卡片区为空，只保留该页的角色分工块；壳层若需要空态文案，自行补一句「合规维度各项均已基本建立，当前无需特别提示」——内核与原型都不产出这句 |
| 输入不合法 | `ok = false` + `errors`，翻译成追问，不扣积分 |
| 网络不可用 | 全流程照常，本 skill 无任何必需的网络调用 |

## 文件

```
SKILL.md                          本文件
schema/input.json                 输入结构（profile 引用 _shared/company-profile.schema.json，answers 36 × 0–3）
schema/output.json                输出结构（success / failure 两种形态，definitions 内含全部子结构）
core/compute.js                   内核：validate / compute / buildPrompt / mergePolish（UMD，Node 与浏览器共用）
prompts/polish.md                 润色提示词（只润色打基础三项行动的标题与理由）
data/dimensions.json              六维 · 十八个子维度 · 维度色
data/questions.json               36 题四选项，每题带 explain
data/levels.json                  L0–L4：minPct · 一句判断 · 描述 · 三个特征 · 重点 · 典型企业
data/diagnostics.json             18 子维度 × 3 分档 = 54 段诊断
data/actions.json                 60 条结构化行动（6 维 × 5 级 × 2）
data/scenes.json                  70 个行业场景（价值 / 难度 / 数据依赖 / 拉动维度 / 第一步 / 模块）
data/risks.json                   16 条风险规则
data/benchmark.json               同行参考带 270 格（54 细分 × 5 规模；v0 估算，业务侧抽样后替换）
data/report-text.json             报告固定文案：标题（中英）· 出具方 · 阅读指引 · 方法 · 投入四档 · 服务 · 术语 · 联系方式 · 结语，以及 roles（三条角色分工模板）与 retrigger（五条重评时机模板）
examples/S1–S4.*.json             四套样例企业的输入与 golden 输出
../../prototype/src/module-01.js  报告渲染参考实现（28 页 / 速览 6 页）
../../prototype/src/report-m1.css 模块 1 专属版式（3D 凸浮标题栏 · 六边形徽章 · 左侧色轨）
../../prototype/src/charts-m1.js  模块 1 专属图表库（12 种，含封面主视觉 heroM1）
scripts/load-data.js              组装 compute() 的 data 包（data/ + _shared/）
scripts/run-examples.js           跑样例、写 golden、打印摘要
scripts/validate-schema.js        契约校验：样例过 schema · 画像 schema 与数据表一致 · 常量与内核一致 · 反例被拒
scripts/gen-profile-schema.js     由 _shared/profile-fields.json + industries.json 生成 _shared/company-profile.schema.json
scripts/lint.js                   构建期禁忌词扫描
scripts/gen-benchmark.js          参考带生成器
../_shared/profile-fields.json    企业画像 13 字段定义（追问顺序 = 字段顺序）
../_shared/company-profile.schema.json  企业画像 JSON Schema（生成物）
../_shared/industries.json        14 大类 / 54 细分行业 · 顶栏 6 行业默认映射 · 行业洞察
../_shared/credits.json           积分表
../_shared/lint-words.json · lint.js  禁忌词表与扫描器
```

## 验证

```bash
node scripts/run-examples.js      # 四套样例 → examples/*.output.json（改内核或数据后先跑）
node scripts/validate-schema.js   # 契约校验，全部 ✔ 才能交付
node scripts/lint.js              # 禁忌词扫描，硬命中为 0
node scripts/gen-profile-schema.js  # 画像字段或行业表改动后重新生成 schema

# 报告版式改动后还要在原型里验分页（脚本在 prototype/ 下，需 NODE_PATH 指向全局 playwright）
cd ../../prototype && node build.js
NODE_PATH=$(npm root -g) node test/measure-m1.js     # 逐页量高，溢出须为 0 页
NODE_PATH=$(npm root -g) node test/screenshot.js     # 屏幕与内核逐字比对 + 导出 PDF 核页数
```

## 与 AI OS 的对应

| 本包 | 平台概念 |
|---|---|
| 本文件 | 智能体指令 |
| `core/compute.js` + `schema/*` | 代码节点 / 工具（有代码执行能力时）；否则把「步骤」一节的规则表交给模型照表执行，并以 `examples/*.output.json` 为对照 |
| `data/*.json` | 知识库 / 数据表 |
| `prompts/polish.md` | LLM 节点提示词 |
| `_shared/company-profile.schema.json` | 会话变量 `profile`（11 个模块共用） |
| `credits` | 计费钩子 |
| `render` / 报告页表 | 卡片模板 / 打印模板 |
