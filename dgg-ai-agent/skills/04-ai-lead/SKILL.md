---
name: AI获客
id: ai-lead
kind: 产品
credits: 30
version: 1.2.0
suite: 薯片AI智能体 2026.09
updated: 2026-09-20
triggers: [获客, 客户画像, 话术, 脚本, 线索, 跟进, 询盘, 转化, 分派, 成交预测, 周报]
inputs: [data]
data_files: 7
datasets: 3
actions: 20
llm_calls: 0
offline: true
deterministic: true
delivers: [screen, wechat]
report_pages: 0
universal: dus-1
---

# AI获客 · 画像 脚本 线索 一次出

接企业自己的成交记录与线索来源（CRM、订单、展会扫码、平台询盘、官网留资、公众号、老客户转介绍、名录导入），一次跑出三样东西并串成闭环：**画像**（从成交客户反推谁是好客户）、**脚本**（按画像与渠道分阶段的话术）、**线索**（按画像打分排序、解释、分派）、**跟进**（本周计划、逾期、成交预测、周报）。纯预制、无 LLM、断网可用；画像权重、脚本采用、分派、计划都写进同一份数据副本，各屏按副本重算。

## 引擎 `core/lead.js`

| 函数 | 作用 |
|---|---|
| `run(data, lib)` | 一次算全：画像、线索评分、漏斗、渠道、预测、本周计划、团队负载、KPI、周报 |
| `profile(d, lib)` | 对成交客户按行业大类 / 决策人 / 规模 / 区域统计分布，用客单价 × 复购加权；维度权重按分布集中度（HHI 归一）再乘用户调整系数；按（行业大类 × 决策人）取加权价值前三为三个细分，每个细分绑定模块 2 痛点库里的痛点、按职务选的价值点与匹配行业的案例 |
| `leadsScored(d, P, lib)` | 匹配分 = Σ 维度权重 × 线索取值在重点细分成交客户中的占比；信号分 = 各类行为信号满分按天数线性衰减求和；综合 = 0.7 匹配 + 0.3 信号；A/B/C/D 按阈值；建议动作按阶段、最近动作与沉睡判断；逾期按等级的跟进节奏 |
| `explain(lead, P, d, lib)` | 看了哪些字段与信号 / 匹配了画像哪几条 / 综合判断 |
| `script(d, P, lib, {segId, channel, stage, variant})` | 从 `data/scripts.json` 的段落块拼装五段正文（开场、痛点、价值、案例、行动）与三条异议应答；占位符由细分与企业数据填充；variant 轮换版本 |
| `assign / assignAll` | 单条分派；一键分派按行业熟悉度与负载（贪心平衡），不超各组上限 |
| `addPlan / advance / logAction / markDormant / setFocus / setWeight / adoptScript` | 写回动作 |
| `plan / funnel / forecast / report`（不导出，仅 `run()` 内部计算） | 本周计划（今天起 5 个工作日，每组每天 ≤ 5 条）、五级漏斗与渠道投入产出、按阶段概率加权的成交预测、周报文本；外部从 `run()` 返回值的同名字段取结果 |
| `screens()` | 本 skill 六个环节的登记：`[{key,label}]`，顺序即原型左侧标签顺序 |
| `brief(step, data, lib, result?)` | 进某一屏时先说的一句发现，返回字符串 / `{text, blocks?, act?, ref?}` / `null`；`result` 是 `run()` 的结果，传了就用，没传自己算一次 |
| `suggest(step, data, lib, result?)` | 该屏的 2–4 条快捷问句，条数与口径随数据变 |
| `ask(question, step, data, lib, result?)` | 按问法作答，返回 `{text, blocks?, act?, ref?}`；答不上返回 `null`，不编造 |
| `ingest(doc, step, data, lib, result?)` | 收 `_shared/docparse.js` 解析出的文档，按本模块业务用起来；写回业务数据时另返回 `data`（新副本） |
| `ensure / recommendTeam / teamLoad` | `ensure` 规范化数据副本（补齐 `weights / adopted / planned / log` 与每条线索的信号、沉睡标记），`run()` 首步调用，原型接样本时也先过一遍；`recommendTeam` 按行业熟悉度与负载率给单条线索推荐承接小组（无空位返回 null）；`teamLoad` 给各组的在跟条数、上限与剩余空位 |

## 口径

- 线索来源用企业自有渠道，另加两个不带厂商名的来源：「平台询盘」与「名录导入」；`data/channels.json` 共 6 个渠道，全文不出现任何数据源厂商名。
- 客户代号沿用「K-编号 · 行业」，线索代号「L-年月-流水」，联系人只出现职务。
- 制造主样本沿用杭州锐合精密五金：成交客户就是 AI ERP 与 AI CFO 里的那批，线索里的储能设备厂就是 ERP 插单预置里的新客户。
- 痛点文本直接取自模块 2 场景库（`02-scene-ranking/data/sectors`），按客户行业大类与标签选取。

## 目录

```
core/lead.js             引擎（UMD）
data/channels.json       渠道           data/signals.json      行为信号与衰减
data/stages.json         阶段概率、等级阈值、跟进节奏、沉睡天数、综合权重
data/scripts.json        脚本段落块库（开场 4 渠道 × 4 阶段 × 2 版、痛点框架按职务、价值、案例、行动、异议按职务）
data/samples/*.json      三套样本（gen-samples 生成）    schema/data.json   数据包契约
scripts/load-data.js · gen-samples.js · run-examples.js · validate.js
examples/*.output.json   三套样本的驾驶舱摘要
```

## 原型流程（六屏）

接入 → 获客驾驶舱（KPI、漏斗、渠道、画像卡、本周待跟进榜）→ 客户画像（分布、权重、三细分、痛点买点、最像的成交客户）→ 话术脚本（细分 × 渠道 × 阶段，换一版，采用）→ 线索池（评分表、AI 判断、分派 / 加入计划 / 记录跟进 / 标记沉睡、一键分派）→ 跟进与周报（本周日程、逾期、各组负载、成交预测、渠道投入产出、周报发送）。进入驾驶舱扣 30 积分，一次。

## 对话与文档摄入

`screens / brief / suggest / ask / ingest` 五个函数都是纯函数：不碰 DOM、网络、时钟、随机数与任何存储，同一组入参永远得到同一份输出。今天一律取 `data.today`。`result` 可选，传 `run()` 的结果就复用，不传就自己算一次。

**能答的问法**（命中关键词即答，答不上返回 `null`）

| 屏 | 问法 | 回答用到的数据 |
|---|---|---|
| 接入 | 哪个源同步落后 / 一共归集了多少条 / 直连和导入各几个 | `data.sources` 的同步日期与条数，按 `today` 算落后天数 |
| 驾驶舱 | 哪个渠道单条便宜 / 成交预测怎么算的 / 未分派的有哪几条 / 逾期为什么这么多 / A 级有几条 | `funnel.channels` 的元/条与元/单、`forecast.byStage`、`plan.overdue`、等级分布与预计金额 |
| 客户画像 | 某个维度权重为什么高 / S1 与 S2 差在哪 / 某个细分什么样 / 把某个维度权重调低或调高 / 匹配这个画像的线索 | `profile.dist` 分布与 HHI 权重、三个细分的家数客单周期复购、A 级线索清单 |
| 话术脚本 | 换成微信（电话 / 展会现场 / 邮件）怎么说 / 报价后（首触 / 二次跟进 / 沉睡唤醒）那版给我 / 异议怎么答 / 这版多少字 | `script()` 按当前视角重组的五段正文与三条异议，段落字数与口播秒数 |
| 线索池 | 某条线索代号 / 为什么它分这么高 / 这条分派给谁 / 未分派的有哪几条 / 逾期的是哪几条 | 该条的匹配分与信号分拆解、维度占比与权重、`recommendTeam` 与各组负载 |
| 跟进与周报 | 哪个组排得满 / 成交预测多少 / 周报里写了什么 / 本周做了什么动作 / 跟进中与本月成交 | `teams` 负载率、`plan.byTeam`、`forecast.byTeam`、`report.lines`、`data.log` |

**act 词表在本模块的落法**

| act | 本模块的落法 |
|---|---|
| `{type:'goto', step, filter?}` | 切到六屏之一；`filter` 取 `A / B / unassigned / overdue / dormant`，线索池按它筛一遍 |
| `{type:'focus', ref}` | `ref` 是线索代号就选中该条并切到线索池高亮；是渠道 id（`fair / inquiry / web / wechat / referral / list`）就高亮渠道表那一行；是数据源 id 就高亮接入屏那一行；`dim-sector / dim-role / dim-size / dim-region` 高亮画像屏对应维度块 |
| `{type:'open', panel, ref?, input?}` | `report` 开周报全文抽屉，`log` 开本周动作抽屉，`sheet` 用 `input.head / input.rows` 开表格抽屉，`drill` 等同 focus |
| `{type:'apply', action:'ingest', input:{doc}, ref?}` | 把同一份文档再交给 `ingest`，取它算好的 `data` 写回并重绘；宿主接 `data` 的话直接用返回值即可，不必走这一条 |
| `{type:'set', path, value}` | `params.weights.<维度>` 调权重后重算并切到画像屏；`params.script.channel / stage / segId / variant` 换脚本视角并切到脚本屏 |

平台可以只实现其中几条，不认识的 `type` 静默忽略。

**ingest 认哪些文档、写回什么**

入参是 `_shared/docparse.js` 的输出，六类都收：

- **合同 / 报价单（word、pdf）**：抽金额、交付期限、质保月数，认甲方是否本企业；按金额找在手线索里预计金额最接近的一条，把 `amountEst` 改成合同金额、`note` 记下交付期限，并记一次跟进（`logAction`）。返回 `data` 新副本，原入参不动。抽不到金额就只报读到的段数表数，不回填。
- **表格（excel）**：按列名认企业 / 行业 / 区域 / 规模 / 职务 / 来源 / 金额七类线索字段，认出几个就报几个，前几行可入池的列出来；认不出企业与行业就如实说没有入池。两种情况都把全表交给 `open sheet`。
- **来函（eml）**：抽发件、主题、日期与正文金额、期限；金额最接近的在手线索记一次来函跟进，返回 `data` 新副本。
- **幻灯片（ppt）**：把里面带数字的行与本模块口径（近 90 天成交、本月成交、在手线索）并排给出。
- **纯文本**：报行数与开头，说明没有识别到线索字段。

**视角字段**（都可选，宿主写进数据副本，内核只读）

- `focusLead`：线索池当前选中的那一条代号。「为什么它分这么高」「这条分派给谁」优先答它，没有就答分值最高的在手线索。
- `scriptView`：`{segId, channel, stage, variant}`，脚本屏当前视角。没有就按重点细分 + 电话 + 首触 + 第 1 版。
