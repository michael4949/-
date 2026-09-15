---
name: 企业AI成熟度评估
id: ai-maturity
kind: 计算
credits: 20
version: 1.0.0
triggers: [AI成熟度, 成熟度评估, 数字化程度, 我们公司适合上AI吗, AI基础, 同行水平, 六维]
inputs: [company, answers]
llm_calls: 1
llm_timeout_ms: 8000
offline: true
delivers: [print, wechat]
---

# 企业AI成熟度评估

用 12 道题给企业的 AI 成熟度打分：六个维度（战略、数据、流程、人员、预算、合规）各两题，每题四选项对应 0–3 分，总分 0–36 映射到 L0–L4 五级；与同行业同规模的参考带比较；给出升到下一级要做的三件事，每件事对应顶呱呱一项具体服务。

## 何时调用

- 用户想知道自己公司「适不适合上 AI」「在同行里处于什么位置」「该从哪一步开始」
- 用户刚接触薯片AI智能体，还没选定场景——本 skill 是三个体验版的第一步，输出的六维得分会作为「企业AI高价值场景排序」的痛点提示
- 顶呱呱销售或 FDE 在入企诊断前做快速摸底

## 输入补全

按此顺序追问，缺什么问什么，能从会话里的企业画像取到的一律不再问：

1. **行业**（12 选 1）：制造（离散）/ 制造（流程）/ 贸易与批发 / 电商与跨境 / 餐饮与零售连锁 / 专业服务（代账/法务/咨询）/ 建筑与工程 / 医疗与大健康 / 教育与培训 / 物流与仓储 / 科技与软件 / 农业与食品
   - 用户若只说了「制造」「财税」这类粗分类，按 `_shared/industry-map.json` 的 display→default 落到内部行业，并复述一遍让用户确认
2. **规模**：1–20 人 / 21–50 / 51–100 / 101–300 / 300 人以上
3. **所在地**：省级行政区
4. **成立年限**：1 年内 / 1–3 年 / 3–5 年 / 5–10 年 / 10 年以上
5. **企业名称**：选填，为空时所有输出用「本企业」
6. **12 道题**：按 `data/questions.json` 顺序逐题给出四个选项，用户点选即记分（选项下标即得分）。一次只问一题；用户若一次答了多题，按题号对应记录

## 步骤

1. **compute**（`core/compute.js`，确定性、离线）
   - 六维得分 = 该维两题得分之和（0–6）
   - 总分 = 六维之和（0–36）→ 按 `data/levels.json` 定等级
   - 参考带：`data/benchmark.json` 取「行业-规模」格；缺格时取同行业最近规模格（`benchmark.basis` 标 `nearest-size`）
   - 每维位置：低于参考带下限 = below，高于上限 = above，其余 = within
   - 升级三件事：按「得分 − 参考带下限」升序取最弱三维，各按「维度 + 当前等级」从 `data/upgrade-actions.json` 取一条模板
2. **llm**（可选，至多一次，8 秒超时）
   - 提示词：`prompts/polish.md`，只润色三件事的标题与正文；服务名与模块名禁止改动
   - 返回先剥离代码围栏再解析 JSON；解析失败、条数不对、超长、命中禁忌词，任一发生即整体放弃润色，保留模板
   - 润色成功的条目 `source = "llm"`，否则 `source = "template"`
3. **输出前**：全部文本字段过 `_shared/lint-words.json` 的 hard 项，命中即回落模板

## 输出

严格按 `schema/output.json`。面向用户的回复用 `summary` 一句话开头，然后按 `render` 顺序呈现：

| render.type | 呈现 |
|---|---|
| `radar` | 六维雷达，叠加同行参考带（有 band 时） |
| `level-badge` | 等级徽章 + 总分 + 一句判断 + 距下一级差几分 |
| `action-list` | 三件事：维度标签 · 标题 · 做法 · 对应服务 · 可先试的模块 |

会话内保存 `company` 与 `dimensions`，供「企业AI高价值场景排序」读取最弱两维作为痛点提示。

## 积分

每次成功输出扣 20 积分。回复末尾带一行：`本次消耗 20 积分 · 剩余 {remaining}`。

## 转化

结果给出后，一句收尾：「完整评估报告与改进路线在专家入企 AI 诊断里出，1980 元 / 1 天。」用户提到「先做哪个场景」时，直接进入「企业AI高价值场景排序」，不再重复问企业信息。

## 结论词纪律

- 只写肯定句与做法；等级判断用 `levels.json` 原文，不另写评价
- 位置表述固定为「高于同行参考带 / 参考带内 / 低于参考带」，不用「落后」「差距大」
- 参考带来源在业务侧抽样到位前为估算值（`benchmark._meta.basis = estimated`）：对外表述一律用「同行参考带」，不写「行业平均」「行业数据」
- 禁止：「不是…而是…」句式、「手术」「骨架」「刀」、任何数据源厂商名、绝对化用语

## 降级

| 情况 | 处理 |
|---|---|
| LLM 超时 / 解析失败 / 命中禁忌 | 用模板三件事，`source = template`；界面标「初稿」 |
| 参考带缺格 | 取同行业最近规模格，`benchmark.basis = nearest-size` |
| 行业无任何参考带 | 雷达不画参考带，位置全部 `unknown`，summary 不写位置句 |
| 网络不可用 | 全流程照常，本 skill 无任何必需的网络调用 |

## 文件

```
SKILL.md                 本文件
schema/input.json        输入结构（company 引用 _shared/company-profile.schema.json）
schema/output.json       输出结构
data/dimensions.json     六维
data/questions.json      12 题四选项（docs/03 原文）
data/levels.json         L0–L4 分数段与一句判断（docs/03 原文）
data/labels.json         规模 / 年限 / 省份 显示文案
data/benchmark.json      同行参考带 60 格（v0 估算，业务侧抽样后替换）
data/upgrade-actions.json 升级三件事模板 30 条（六维 × 五级）
core/compute.js          内核：compute / buildPrompt / mergePolish（UMD，Node 与浏览器共用）
prompts/polish.md        润色提示词
examples/S1–S4.*.json    四套样例企业的输入与 golden 输出
scripts/run-examples.js  跑样例、写 golden、打印摘要
scripts/lint.js          禁忌词扫描
scripts/gen-benchmark.js 参考带生成器
```

## 与 AI OS 的对应

| 本包 | 平台概念 |
|---|---|
| 本文件 | 智能体指令 |
| `core/compute.js` + `schema/*` | 代码节点 / 工具（有代码执行能力时）；否则把「步骤」一节的规则表交给模型照表执行 |
| `data/*.json` | 知识库 / 数据表 |
| `prompts/polish.md` | LLM 节点提示词 |
| `_shared/company-profile` | 会话变量 |
| `credits` | 计费钩子 |
