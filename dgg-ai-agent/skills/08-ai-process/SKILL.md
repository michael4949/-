---
name: AI流程提效
id: ai-process
kind: 产品
credits: 50
version: 1.1.0
suite: 薯片AI智能体 2026.09
updated: 2026-09-20
triggers: [流程提效, 工序流, 瓶颈, 约束工序, 在制品, 报工, 报工核验, 换型, 合批, 投料, 派工, 排队等待, 有效利用率, 标准工时, 保养窗口, 增效账, 提效周报]
inputs: [data]
data_files: 6
datasets: 3
actions: 15
llm_calls: 0
offline: true
deterministic: true
delivers: [screen, wechat]
report_pages: 0
universal: dus-1
---

# AI流程提效 · 识别约束 挖尽 迁就 提升 核验

只围绕生产部门的生产环节：产线 / 工序 / 路线 / 标准工时从 AI ERP 样本里取，本模块只放报工、时间损失、设备、排班、技能与今日批次。AI 主线是 **识别约束 → 挖尽 → 迁就 → 提升 → 核验**：先从负荷最高的线里认出约束线，推 7 天在制曲线；把约束线的时间损失拆成换型、停机、四类等待、速度、返工，用换型合批、错峰午休与首件检查前移把约束线的时间挖尽；投料按约束线节拍放行、明日派工把多能工调去支援，让其他环节迁就约束；改善预演在 AI ERP 排程引擎上重算四张卡与组合，立项后按节点推进；增效账按来源去重记账，周报把有效利用率、排队等待、周产能、加班的前后对比发给四个岗位核验。纯规则 / 统计、无 LLM、断网可用；所有客户动作返回新副本并写日志，原样本与 AI ERP 样本不动。

## 引擎 `core/flow.js`

对外函数签名统一为 `(data, lib, ...)`：`data` 是本模块样本副本，`lib` 由 `scripts/load-data.js` 装配（vocab、rules、improveLib、samples、erpSamples 与三份 `_shared`）。`lib` 还需由调用方注入 `lib.erp = skills/10-ai-erp/core/sim.js`，内核靠 `lib.erp.schedule` 重算排程，缺这一注入 `run` 无法执行；`scripts/run-examples.js` 与 `scripts/validate.js` 都在取到 `lib` 后先注入再调用。

| 函数 | 作用 |
|---|---|
| `run(data, lib)` | 一次算全，返回 24 个键：version、data（ensure 后的数据副本，原型与 invoke 层都用它做下一步入参）、es（采纳标准工时后的 ERP 副本）、S（排程）、vocab（当前业态词表）、bottleneck、metrics、flow、verify、sequence、loss、calibration、buffer、skills、alerts、preview、committed、dispatch、maintenance、planHit、ledger、weekly、kpi、improveCards |
| `bottleneck / wipCurve / queueDaysOf` | 约束线 = 负荷最高的线（并列取排队最长）；瓶颈前在制按前道完工与本道未开工推 7 天，上限 = capDays × 日可用小时；平衡率 = 各线负荷均值 / 最高负荷 |
| `flowCards` | 工序流分段卡：按路线顺序把工序集合相同的产线并成一格（服务业按环节分），每格给标准 / 实际单件工时、在制、等待、一次合格率、可用率 |
| `verifyReports / confirmReport / confirmAllReports` | 报工核验五条规则只标记不改数：工时偏离、重复报工、漏报、数量守恒、时段重叠；确认后写 verified 与日志 |
| `alerts / handleException` | 异常六条规则各命中一条根因并指到岗位：R1 在制超限、R2 单批等待超时、R3 一次合格率判异（12 周均值做 3σ 下限）、R4 单件工时判异、R5 设备频繁停机、R6 交接班首小时落后；处置置 doing，savedH > 0 才进增效账 |
| `lossWaterfall` | 时间损失瀑布守恒：计划 − 换型 − 停机 − 等待 − 速度 − 返工 = 有效；可用率 = (T−S−D−W)/T，性能率 = (R−V)/R，有效利用率 = 有效/T；12 周序列与可回收工时 |
| `calibrateStd / adoptStd` | 标准工时校准：\|偏差\| ≥ 15% 且稳定（n ≥ 8、IQR/中位 < 0.25）才「过期」，建议值 = 中位向上取到 0.0001；采纳写到本模块副本的路线上并重算排程 |
| `buffer / applyRelease` | 按瓶颈节拍投料：投料许可 = max(0, 上限 − (明日在制 − 日产出)) / 单件工时；放行线明日批次按交期从松到紧暂缓；下发后释放的工时进增效账 |
| `sequenceJobs / applySequence / seqCost` | 换型合批：枚举 n ≤ 9 的全排列，交期 ≤ 1 天的批次必须在前半段，Σ换型不劣于原序；停机换型时间可调；下发后按工作日折成每周节省 |
| `improveCards / preview / commitProject / setMilestone` | 改善预演四卡（A 换型合批、B 多能工支援开备用线第二班、C 错峰午休 + 首件检查前移、D 约束线加班）与 A+B+C 组合：在 AI ERP 样本副本上改参数后调 `lib.erp.schedule` 重算；推荐 = 不加班优先 → 排队天最小 → 周产能最大；费用只在 D 出现且标预计；立项生成 IMP-年月-流水与节点 |
| `skillMatrix / addTraining` | 技能等级 0..3 由 12 周件数与效率折算；覆盖率 = 2 级以上人数 / 需求；约束线单点工序配带教对 |
| `dispatch / applyDispatch` | 明日派工两遍：本线 2 级以上 → 1 级副手 → 缺口由低负荷线多能工补 → 备用线第二班只用支援人员；同一人同一班次只出现一次；加班超限人数与本周加班前后 |
| `maintenance / scheduleMaint` | 保养到期（运行小时 ≥ 90%、工装寿命 ≥ 90%、近两周停机 > 1.5 × 周均）与保养窗口（避开约束线在制高峰，取负荷最低日或休息日）；排入后按 12 周停机均值折算进账 |
| `planHit` | 小时节拍：班次计划按小时切分，落后 15% 标红，首小时低于 60% 触发 R6 |
| `ledger` | 增效账按 source 去重：瓶颈工时折成件数，其他工时、加班减少分列，计数器文案 |
| `weekly / kpi` | 提效周报六段（工序流、异常、已下发、改善项目、增效账、下周提醒）以「【」开头、收件人只写职务；KPI 汇总 |

## 口径

- **数据来源与对齐**：产线、工序、路线、标准工时、订单与排程来自 AI ERP 样本（`erpKey`），本模块副本只改采纳后的标准工时、备用线产能与加班；员工来自 AI人力官花名册，只取 E-编号、岗位代码、本月加班小时；约束线名与加班超限人数与 AI决策样本的 facts 对齐。报工、12 周工时统计、时间损失、设备、排班、技能、今日批次、周指标由固定种子生成，所有数字都能被内核复算。
- **算法要点**：约束识别只看 7 天负荷与排队；在制曲线不做概率预测，只按排程的前道完工与本道开工推算；报工核验只标记不改数，采纳由客户确认；R3 用 12 周一次合格率均值做 p 图 3σ 下限，连续 3 批以下才报；瀑布各项按有效天数折成每日小时（今日按半天）；校准的建议值取 12 周中位数向上取到 0.0001；换型合批全排列枚举，超过 9 个批次保持原序；预演不建模型，直接在排程引擎上重算；派工不做优化求解，两遍贪心；增效账全部标「预计」，只在客户动作时记账。
- **词表三套**：`data/vocab.json` 的 make（制造：产线 / 工序 / 批次 / 换型 / 工装 / 首件）、flow（仓配：作业区 / 环节 / 波次 / 波次切换 / 包材 / 首箱）、service（服务：小组 / 环节 / 户次 / 账套切换 / 模板 / 首户），内核与原型所有可见文案经 `t(state, key)` 取词；责任岗位只有词表 roles 里的四个（主管、工程师 / 流程专员、班组长、设备员 / 系统管理员）；员工只出现 E-编号；费用一律标预计；禁词表见 `_shared/lint-words.json`。

## 目录

```
core/flow.js                内核（UMD），依赖注入 lib.erp = AI ERP 的 core/sim.js
data/vocab.json             三套业态词表（roles 四岗位、waitReasons、setupKinds、caps）
data/rules.json             异常六条规则、九条根因、阈值与 SPC 参数
data/improve-lib.json       改善方案库：四张卡、组合、KPI 目标、可回收系数
data/samples/{mfg,trade,prof}.json   三套样本（archetype = make / flow / service）   schema/data.json   数据包契约
scripts/load-data.js · gen-samples.js · run-examples.js · validate.js
examples/*.output.json      三套样本的看板摘要
```

## 原型流程（六屏）

接入（选样本或导入报工 / 设备 / 排班，四个数据源的同步时间与行数）→ 工序流看板（分段卡、约束线与 7 天在制曲线、平衡率、小时节拍、异常与报工待核计数）→ 工序诊断（报工核验逐条确认、异常根因与处置、时间损失瀑布与两率、标准工时校准采纳、按节拍投料下发、换型合批顺序表下发）→ 改善预演（四张卡调参数、组合、AI 推荐、立项）→ 执行与派工（项目节点推进、明日派工单与跨线支援、技能矩阵与带教、保养窗口排入）→ 提效周报（前后对比、增效账、效果核验、发微信给四个岗位）。进看板扣 50 积分，一次：扣分由原型外壳实现，内核只导出 `CREDITS = 50` 常量、不含任何计费代码，通用 invoke 层也不计费。
