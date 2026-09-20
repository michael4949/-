---
name: AI ERP
id: ai-erp
kind: 产品
credits: 100
version: 1.1.0
suite: 薯片AI智能体 2026.09
updated: 2026-09-20
triggers: [ERP, 排产, 交期, 延期, 插单, 缺料, 齐套, 产能, 安全库存, 采购建议, 交付日报, 订单交付]
inputs: [data]
data_files: 5
datasets: 4
actions: 11
llm_calls: 0
offline: true
deterministic: true
delivers: [screen, wechat]
report_pages: 0
universal: dus-1
---

# AI ERP · 订单交付指挥室

把企业在手订单沿各自的工序路线在产线日历上向前排，得到每道工序的开工与完工、每张订单的预计完工与延期归因，并在同一套排程上做四件事：**处置动作**（催料 / 调线 / 加班 / 改期，整体重排后逐单对比）、**插单模拟**（同一张加急单按三种策略各排一遍，比较对在手订单的拖累与代价）、**采购建议**（按排程推算每种物料的库存走势，倒推缺口日、建议量与最晚下单日）、**交付日报**（今日交付、风险订单、已处置、明日提醒）。

纯预制、无 LLM 调用、断网可用。同一个引擎按四种业态原型换对象名与核心交互，指挥室结构不变。

## 业态原型

| 行业大类 | 原型 | 订单叫法 | 工序叫法 | 产线叫法 | 物料叫法 | 第 4 屏核心交互 |
|---|---|---|---|---|---|---|
| 制造 / 农业 / 能源 | make | 生产订单 | 工序 | 产线 | 物料 | 插单模拟：优先插队 / 末尾排队 / 拆分并行 + 加班 |
| 批发零售 / 物流 / 生活服务 / 医药 | flow | 订单 | 环节 | 作业区 | 商品 | 加急与调拨：优先发运 / 顺序排队 / 跨仓调拨 + 加班 |
| 建筑 / 科技 / 传媒 | project | 项目 | 节点 | 班组 | 资源 | 插项目与资源调配：优先投入 / 顺序排队 / 拆分并行 + 增员 |
| 教育 / 金融 / 其他 | service | 服务单 | 环节 | 小组 | 资源 | 改约与重排：优先安排 / 顺序排队 / 拆分并行 + 增派 |

映射与词表在 `data/archetypes.json`。四套样本在 `data/samples/`，制造业样本 `mfg.json` 为手写主样本（15 张订单、8 条产线、6 条工艺路线、20 种物料），其余三套由 `scripts/gen-samples.js` 生成。

## 排程规则

- 订单按（优先级、交期、接单日、单号）排序；在制工序先占位，不让位。
- 每道工序从前道完工与物料齐备两者的较晚者起，在产线日历上找空档向后排，允许跨天分段；休息日产能为 0，加班按天加小时。
- 物料按排序逐单分配：先用库存，再按到货日用在途；仍不够时按「今日下单、按提前期到货」推算齐备日，并在采购建议里给出对应的下单项。
- 延期归因取三类之一：**缺料**（齐备日晚于可开工日）、**产能不足**（在产线上排队等待 ≥ 0.5 个工作日）、**前道拖后**（既不等料也不排队，剩余工时按日历排完仍超过交期）。
- 风险有三种：交期余量不足 1 天；所需物料尚无在途，排程靠今日下单撑住；等料后仍可按期。
- 处置动作各在数据副本上应用并整体重排，给出本单完工变化、拖累的订单数、新增延期数与费用；推荐序为能否赶上交期 → 提前天数 → 拖累张数 → 费用，改期垫底。
- 加班费 = 小时数 × 工作日数 × 班组人数 × 综合时薪 × 1.3；综合时薪来自企业月薪 × 综合用工系数 1.3 ÷ 21.75 天 ÷ 8 小时。
- 呆滞 = 库存可用天数 > 90 天且排程窗口内无需求。

## 目录

```
core/sim.js              排程引擎（UMD，Node 与浏览器共用）
data/archetypes.json     业态映射与词表
data/samples/*.json      四种业态样本
schema/data.json         数据包契约
scripts/load-data.js     组装数据包
scripts/gen-samples.js   生成 flow / project / service 样本
scripts/run-examples.js  跑四套样本 → examples/*.output.json
scripts/validate.js      内核自检（确定性、工序顺序、产能不超、归因一致、处置与插单闭环、采购与日报、禁词）
examples/*.output.json   四套样本的指挥室摘要
```

## 引擎接口

对外只收一份数据包 `data`。`S`（排程结果）与 `plan`（采购建议）分别由 `schedule` 与 `purchasePlan` 产出后回传给下游函数，不需要外部另行准备；各入口内部自带 `normalize`，原始样本可直传。

| 函数 | 作用 |
|---|---|
| `schedule(data)` | 全量排程 → `{ version, today, horizon, days, orders, byId, lines, materials, kpi, data }`；其中 `data` 是规范化后的完整数据副本，`explain` / `actions` 下游直接取 `S.data` |
| `explain(S, orderId)` | 一张订单的「看了哪些数据 / 判断依据」 |
| `actions(data, S, orderId)` | 处置候选，每项带预演效果与费用，已排序 |
| `applyAction(data, orderId, key, params, dry)` | 把动作写进数据副本并记日志（不改原数据）；`dry=true` 时只做重排预演，不记日志、不标已处置，`actions()` 的效果预演走的就是这条路 |
| `simulateInsert(data, req)` | 三方案对比 + 推荐与理由 |
| `applyInsert(data, req, strategy)` | 按所选方案落单 |
| `purchasePlan(data, S)` | 采购建议、呆滞、按供应商归集的采购单草稿 → `{ items, slow, po, summary }` |
| `applyPurchase(data, plan, ids)` | 把选中的下单项落成在途，按供应商各成一张采购单并记日志 → `{ data, pos }`；第 5 屏「生成采购单」的入口 |
| `daily(data, S, plan)` | 交付日报（结构 + 可发送文本） |
| `diff(S0, S1)` | 两次排程逐单对比，按完工变化排序；处置与插单的拖累账由它算出 |
| `overtimeCost(data, lineId, hours, days)` | 按加班费公式算一笔加班费用 |

内核没有一次拿到完整结果的聚合入口：指挥室的完整结果按 `schedule` → `purchasePlan` → `daily` 三步取（`scripts/run-examples.js` 即按此拼装，通用包里的 `run` 等同 `schedule`）。

`normalize`、`nextOrderId`、`dayIdx`、`dateOf`、`short`、`isRest`、`weekday`、`fmtN` 以及常量 `VERSION`、`MODULE_NAME`、`CREDITS`、`CAUSES`、`HZ` 同样从内核导出，属内部工具，不作为对外接口。

## 原型流程（六屏）

接入（企业画像、已开通能力、数据源状态）→ 指挥室（KPI、订单全景、交付预警榜、物料缺口、产线负荷）→ 订单下钻（工序甘特、齐套率、AI 判断、处置动作）→ 插单模拟（三方案对比 → 落单 → 甘特重排）→ 物料与库存（安全库存预警、呆滞、采购建议、生成采购单）→ 交付日报（发送到微信）。第 3、4、5 屏的动作都会写回第 2 屏。进入指挥室时扣 100 积分，一次。

## 口径纪律

- 屏幕上只出现真实系统会出现的字：单号、客户代号、产品、工序、日期、数量、金额。
- 数据明显虚构但结构真实：客户一律「K-编号 · 行业」，单号「SO-年月-流水」。
- 不出现任何数据源厂商名；不使用禁词表中的词与句式（构建期与自检都扫）。
