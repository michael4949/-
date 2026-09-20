---
name: AI获客
id: ai-lead
kind: 产品
credits: 30
version: 1.1.0
suite: 薯片AI智能体 2026.09
updated: 2026-09-20
triggers: [获客, 客户画像, 话术, 脚本, 线索, 跟进, 询盘, 转化, 分派, 成交预测, 周报]
inputs: [data]
data_files: 7
datasets: 3
actions: 15
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
