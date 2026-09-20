---
name: AI CFO
id: ai-cfo
kind: 产品
credits: 50
version: 1.2.0
suite: 薯片AI智能体 2026.09
updated: 2026-09-20
triggers: [三表, 勾稽, 对账, 财务风险, 现金流, 资金缺口, 回款, 应收, 税负, 政策, 补贴, 加计扣除, 小微, 月报]
inputs: [data]
data_files: 7
datasets: 3
actions: 16
llm_calls: 0
offline: true
deterministic: true
delivers: [screen, wechat]
report_pages: 0
universal: dus-1
---

# AI CFO · 财务副驾驶

接企业已有的账（财务软件科目余额、银行流水、发票数据、ERP 库存与应收应付、固定资产台账、租赁与借款合同、工资表），回答四个问题：**账对不对**（三表勾稽）、**险在哪**（风险预警）、**钱够不够**（13 周现金预测）、**能省多少**（政策匹配）。全部纯预制、无 LLM、断网可用；调整分录、风险处置、现金方案、政策清单都写进同一份账套副本，各屏按副本重算。

## 引擎 `core/fin.js`

| 函数 | 作用 |
|---|---|
| `run(data, lib)` | 一次算全：三表、勾稽、风险、13 周现金、政策、KPI、月报 |
| `ensure(raw)` | 取账套副本并补齐 `adjustments` / `actions` / `log` / `policyList` / `cashScenario` 五个可写字段，原数据不动 |
| `normalize(raw)` | 在副本上把已登记的调整分录落到当期账面，计算类函数都先走它 |
| `statements(d)` | 由科目余额生成利润表 / 资产负债表 / 现金流量表（间接法） |
| `reconcile(d, st, lib)` | 逐条核对 `data/rules.json` 的 14 条勾稽关系：本期数、勾稽值、差异、容差、判断（正常 / 差异 / 异常）、下钻明细、调整分录模板 |
| `applyFix(d, ruleId, lib)` | 把该条的调整分录写进副本并重算（补记回款、盘亏调整、计提销项、补提折旧、预付转待摊、补记手续费） |
| `risks(d, st, lib)` | `data/risk-rules.json` 的 10 条风险：指标值、参考带、发生概率、影响金额、矩阵等级、证据、处置动作 |
| `arAging(d)` | 应收逐笔按到期日分账龄桶（未到期、逾期 1–30 / 31–90 / 91–180 / 180 天以上），风险与现金两处共用 |
| `applyRiskAction(d, riskId, key, lib)` | 处置写回，`data/risk-rules.json` 共 12 个动作 key：催收 / 计提坏账 / 处置呆滞 / 申报未开票收入 / 压缩招待 / 协商付款 / 优先付关键供应商 / 短贷置换 / 调整社保基数，改账面或现金情景；列入经营会议（K02 `note`）、看 13 周现金预测（K05 `gotoCash`）、复核成本结转（K07 `reviewCost`）属提示类，只记处置与日志、不改数据口径 |
| `forecast(d, scenario)` | 13 周现金日历：应收按账期 + 历史延迟、逾期按账龄折扣，在产订单交付后按账期，应付按到期，固定支出与贷款按日历，窗口内新业务按月均与账期；情景开关叠加 |
| `cashOptions(d, lib)` | 缺口三方案 A 催收 / B 延付 / C 融资，各算一遍，推荐规则：先看能否回到安全线，再看资金成本；单独都不行时给叠加结果 |
| `applyCashOption(raw, key, lib)` | 把选中方案的情景开关写进副本并记日志，13 周现金预测按新开关重排（原型第 5 屏的「执行」） |
| `policies(d, st, lib)` | `data/policies.json` 12 条政策：条件核对（满足 / 待补材料 / 不符）、按账套估的预计金额、申报窗口、材料清单 |
| `togglePolicy(raw, id)` | 把一条政策加入申报清单，已在清单则移出；政策汇总与月报按清单重算（原型第 6 屏） |
| `kpi(d, st, rec, rk, fc, po)` | 驾驶舱 KPI：收入与环比、毛利率 / 净利率、经营现金流、货币资金与现金月数、逾期应收、异常与已调整条数、高中风险条数、13 周现金低点与缺口、政策金额 |
| `report(...)` | 财务月报（结构 + 可发送文本） |
| `screens()` | 六个环节登记 `[{key,label}]`：`connect` 接入 / `board` 财务驾驶舱 / `recon` 三表勾稽 / `risk` 风险预警 / `cash` 现金预测 / `policy` 政策与月报 |
| `brief(step, data, lib, result)` | 进这一屏先说的一条发现，字符串或 `{text, blocks?, act?, ref?}`；未知屏返回 null |
| `suggest(step, data, lib, result)` | 该屏的快捷问句 3–4 条，条条都能被 `ask` 答上 |
| `ask(question, step, data, lib, result)` | 问答：`{text, blocks?, act?, ref?}`；认不出的问法返回 null，交给平台兜底，不编数 |
| `ingest(doc, step, data, lib, result)` | 文档摄入：`{text, blocks?, act?, data?}`；写回业务数据时 `data` 是新副本，入参不动 |

`metrics(d, st)` 是上列函数共用的内部指标计算，不单独对外。前言 `inputs` 只列 `data`（一套账套）；另有一个固定注入的数据包 `lib`，即 `scripts/load-data.js` 返回的 `rules`、`riskRules`、`benchmarks`、`policies`、`samples`、`industries`、`credits`、`lintWords` 八个键，16 个动作里 `run` / `cashOptions` / `applyFix` / `applyRiskAction` / `applyCashOption` 与对话三件 `brief` / `ask` / `ingest` 共八个必须带上它（`screens` 与 `suggest` 只认屏名），生成 invoke 层时按 `$lib` 注入。对话五件的第四个参数 `result` 是 `run(data, lib)` 的结果，可选：传了就用，没传自己算一次；五件都是纯函数，不碰 DOM、window、时钟与随机数，同一组入参永远得到同一份输出。

## 勾稽与风险的口径

- 勾稽差异在 1 倍容差内为正常、3 倍内为差异、超过为异常；每条异常都能下钻到单据、凭证、台账或对方系统的数字。
- R03（回款未冲应收）与 R07（账面现金与银行对账单）常常同源，判断依据里会点明。
- 风险等级：概率 ≥ 0.6 且影响 ≥ 20 万为高；概率 ≥ 0.35 或影响 ≥ 20 万为中；其余低。处置后概率下调 0.4，并以 0.1 为下限；概率 ≤ 0.1 的一律判低，处置过的高风险因此会直接落到低档。
- 参考带（`data/benchmarks.json`）是顶呱呱在政企服务中接触到的常见区间，非统计调查数据。
- 政策金额一律「预计」，按公开口径简化；小型微利企业条件按研发加计扣除后的应纳税所得额判断，两项政策会连锁。

## 样本

`data/samples/` 三套账套由 `scripts/gen-samples.js` 生成：制造主样本沿用 AI ERP 的杭州锐合精密五金（应收明细里的客户代号与在产订单和 ERP 一致），贸易与服务为变体。账套由驱动参数推出，三表天然平衡；勾稽异常做在外部来源与账面的差异上，五个外部来源对应六条异常：银行流水（同时命中 R03 与 R07）、ERP 库存（R04）、发票数据（R08）、固定资产台账（R10）、租赁合同（R12）。制造与贸易账套实跑六条异常，服务账套无存货（存货一条判不适用）、折旧也与台账一致，实跑四条。

## 目录

```
core/fin.js              引擎（UMD）
data/rules.json          14 条勾稽规则        data/risk-rules.json   10 条风险规则
data/benchmarks.json     行业参考带           data/policies.json     12 条政策
data/samples/*.json      三套账套             schema/data.json       数据包契约
scripts/load-data.js · gen-samples.js · run-examples.js · validate.js
examples/*.output.json   三套样本的驾驶舱摘要
```

## 原型流程（六屏）

接入（企业画像、账套来源、账期）→ 财务驾驶舱（KPI、勾稽状态、风险榜、13 周现金缩略、12 期趋势、政策摘要）→ 三表勾稽（逐条核对、下钻、AI 判断、按建议调整）→ 风险预警（矩阵 + 清单 + 处置）→ 现金预测（周日历、情景开关、缺口三方案 → 执行）→ 政策与月报（匹配清单 → 加入申报清单；月报发送到微信）。进入驾驶舱扣 50 积分，一次。
