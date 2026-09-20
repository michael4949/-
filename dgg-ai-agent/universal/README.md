# 薯片AI智能体 · 11 个通用 Skill（DUS-1.1）迁移说明

这一层把 11 个能力从「Claude skill」改造成**平台无关的通用 skill**：同一份包可以直接跑在 Node、浏览器、命令行、HTTP 服务、MCP 宿主以及自研 agent 平台（AI OS）上。业务逻辑一行没动 —— 内核仍是 `skills/<模块>/core/*.js` 那一份，通用层只是在外面加了清单、统一调用契约和六种适配器。

**规范当前是 DUS-1.1**（见 `SPEC.md`）：在 1.0 之上增补了对话能力、文档摄入、声明式动作词表和七项跨平台产物，全部是加法 —— 信封里的 `spec` 仍是 `"dus-1"`，现有 11 个包、127 个动作继续合法，老调用方一行不用改。

## 目录分工

| 位置 | 是什么 | 谁改 |
|---|---|---|
| `skills/<模块>/` | **唯一真相**：内核、数据表、schema、golden 样例、SKILL.md | 业务迭代改这里 |
| `universal/SPEC.md` | 通用规范 DUS-1.1：包结构、清单字段、调用契约、错误码（§1–§8）+ 对话 / 摄入 / act 词表 / 跨平台产物（§9–§14） | 规范升级时改 |
| `universal/runtime/invoke.js` | 统一调用层，11 包共用同一份 | 规范升级时改 |
| `universal/adapters/*.js` | cli / http / mcp / aios 四个适配器模板 | 接平台时改 `aios.js` |
| `skills/_shared/docparse.js` | 共用件：离线文档解析（同步、ES5、自带解压与解码），8 个产品包各内联一份 | 解析能力迭代时改 |
| `skills/<模块>/core/chat.js` | 各包的对话内核：`screens / brief / suggest / ask / ingestDocument`，纯规则、从内核结果里算真数据（**待建**，8 个产品包各一份） | 业务迭代改这里 |
| `tools/skills.map.json` | 11 个 skill 的动作映射表（动作名 → 内核函数 → 入参；1.1 起带 `on` / `family` / `mutatesPath`） | 加动作时改 |
| `tools/build-universal.js` | 生成器：一条命令产出 11 个通用包 | 很少改 |
| `dist-universal/<id>/` | **生成物**，交付给平台的东西（不进仓库，随时可重建） | 不手改 |

## 一条命令重建

```bash
node tools/build-universal.js            # 产出 11 个包 + 套件索引
node tools/build-universal.js ai-erp     # 只重建一个
cd dist-universal && node register-all.js  # 自检：逐包打印版本 / 动作数 / 数据集
```

## 平台接入（AI OS）

```js
const { registerAll, descriptors, registry } = require('<路径>/dist-universal/register-all.js');

registerAll(host);          // host 提供 registerSkill / register / addSkill / use 任一方法
// 或者自己读描述符
descriptors().forEach((d) => platform.load(d));
```

每个描述符长这样（已经是平台常见形态，`tools` 可直接喂给大模型做 function calling）：

```jsonc
{
  "id": "ai-erp", "name": "AI ERP", "version": "1.1.0", "kind": "product", "credits": 100,
  "capabilities": { "offline": true, "deterministic": true, "network": false, "filesystem": false, "llm": "none" },
  "datasets": [{ "key": "make", "label": "制造型样本" }],
  "tools": [{ "name": "run", "title": "一次成型", "parameters": { /* JSON Schema */ }, "readOnly": true, "statefulOutput": false }],
  "invoke": "(action, input, ctx) => Envelope"
}
```

只有 `adapters/aios.js` 需要按贵司平台改写，改的也只是字段名映射；其余文件平台无关。

## 三条必须知道的约定

**1 · 调用契约统一。** 任何动作都是 `invoke(action, input, ctx)`，同步返回信封，永不抛异常：

```jsonc
{ "ok": true, "spec": "dus-1", "specVersion": "1.1", "skill": { "id", "name", "version" }, "action": "run",
  "data": { }, "errors": [], "meta": { "credits", "kind", "mutates", "deterministic", "offline" } }
```

失败时 `ok:false`、`errors` 非空，错误码固定五种：`E_ACTION` / `E_INPUT` / `E_DATASET` / `E_KERNEL` / `E_RUNTIME`。

**2 · 状态在平台手里，包本身无状态。** 产品类（AI ERP / AI CFO 等）的动作分两种：只读的返回结果，标了 `mutates` 的**返回一份新的业务数据副本**。平台把它存进会话状态，下一次调用作为 `input.data` 传回来；第一次调用用 `input.dataset` 指定预置数据集开场。这样同一个包可以同时服务成百上千个会话，互不干扰。

**3 · 确定性。** 内核不碰时间、随机、网络、文件，同一输入永远同一输出，平台可以放心缓存、重放、对账。`examples/` 是 golden 基线，`tests/conformance.js` 会把 CJS / ESM / 浏览器 UMD / CLI 四条路径的输出逐字节比对。

## DUS-1.1 新增了什么（索引）

原型 v14 上验证过的两项能力下沉到了 skill 层，好在别的 agent 平台上也能用。规范条文见 `SPEC.md`，这里只给索引。

| 增补 | 是什么 | 规范 |
|---|---|---|
| 版本与能力声明 | `spec` 仍是 `"dus-1"`，版本走新增的 `specVersion: "1.1"`；平台靠 `manifest.features` 探测能力，不靠动作名猜 | §9 |
| 对话能力 | `screens`（屏 / 环节自己登记）· `brief`（进屏一条真数据发现）· `suggest`（2–4 条**必须答得上**的问句）· `ask`（答不上返回 `null`，平台兜底） | §10 |
| 文档摄入 | `parse-document`（base64 进，平台中立的 Doc 出，共用件 `skills/_shared/docparse.js`）· `ingest-document`（按各自业务用起来，可写回业务数据） | §11 |
| 声明式动作词表 | 回答可带一个纯数据 `act`：`goto` / `focus` / `open` / `apply` / `set`，平台可只实现子集，未知 type 一律忽略 | §12 |
| 跨平台产物 | 每个包另产出 `SKILL.md` · `references/*.md` · `tools.openai.json` · `tools.anthropic.json` · `manifest.mcp.json` · `openapi.json` · `llms.txt` | §13 |
| 升级清单 | 生成器与运行时各要改哪几处（只列清单，不含代码） | §14 |

两处最容易搞混的，规范里专门写了：

- **两份 `SKILL.md` 不是一回事。** `skills/<模块>/SKILL.md` 是工程契约（手写，`name` 是中文展示名）；通用包里的 `SKILL.md` 是给 agent 平台读的说明书（生成物，`name` 是小写 kebab 的 id）。源文件会原样搬到包内 `references/engineering.md`，信息一条不丢。见 §13.2。
- **动作 `brief` 与前言字段 `brief_pages` 无关。** 前者是对话里的一句发现，后者是打印报告的速览页数。见 §10.7。

## 11 个包

| 包 | 名称 | 类型 | 积分 | 一句话 |
|---|---|---|---|---|
| `ai-maturity` | 企业AI成熟度评估 | 计算 | 20 | 36 题打分，出六维等级与同行位置 |
| `scene-ranking` | 企业AI高价值场景排序 | 计算 | 20 | 四维加权给场景排序，先做哪个一目了然 |
| `roi-calculator` | 企业AI投入ROI测算器 | 计算 | 20 | 多场景组合算回收期与现金流 |
| `ai-lead` | AI获客 | 产品 | 30 | 画像反推、线索评分、话术与跟进计划 |
| `ai-hr` | AI人力官 | 产品 | 30 | JD、简历打分、面试、合规与编制成本 |
| `ai-cfo` | AI CFO | 产品 | 50 | 三表勾稽、风险预警、13 周现金与政策 |
| `ai-legal` | AI法务 | 产品 | 30 | 合同审查、新设主体、知产到期与台账 |
| `ai-process` | AI流程提效 | 产品 | 50 | 报工核验、约束识别、派工与增效账 |
| `ai-decision` | AI决策 | 产品 | 100 | 指标树归因、方案预演、会签与复盘 |
| `ai-erp` | AI ERP | 产品 | 100 | 排产、插单模拟、物料库存与交付日报 |
| `ai-dev` | AI软件开发 | 产品 | 100 | 一句需求生成可试用的小应用 |

每个包内的 `README.md` 给出该包六种接入方式的可复制代码，`manifest.json` 是机器读的那一份。

## 迁移检查清单

- [ ] `node tools/build-universal.js` 产出 11 个包，无告警
- [ ] `cd dist-universal && node register-all.js` 11 行全部「版本一致」
- [ ] 逐包 `node tests/conformance.js` 四条路径逐字节一致
- [ ] 平台侧实现 `adapters/aios.js` 要求的宿主方法，跑通一个 `run`
- [ ] 产品类确认会话状态回写：`mutates` 动作的返回值存回、下次作为 `input.data` 传入
- [ ] 计费接入 `meta.credits`（平台决定是否使用）

DUS-1.1 另加六项：

- [ ] 老调用方回归：只认 `spec === 'dus-1'`、不认 `specVersion` 的调用方跑 `run` / `health`，**老字段一个不少、值不变**（信封会多出 `specVersion` 与 `meta.family` / `meta.mutatesPath`，这是 1.1 的「只增不改」，不是「逐字节不变」）
- [ ] 现有 127 个动作的 golden 逐字节不变（1.1 只加动作，不改老动作）
- [ ] 8 个产品包各 6 个新动作到位（`screens` / `brief` / `suggest` / `ask` / `parse-document` / `ingest-document`），动作合计 175
- [ ] `suggest` 回灌 `ask`：每一条建议问句都答得上（无 `null`）
- [ ] `parse-document` 对 `examples/docs/*.json`（`{name, base64}`）六种文件类型的 Doc 逐字节一致，且全程无网络、无异步
- [ ] 七项跨平台产物齐全且与 `manifest.json` 对得上（§13.9）
