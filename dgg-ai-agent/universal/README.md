# 薯片AI智能体 · 11 个通用 Skill（DUS-1）迁移说明

这一层把 11 个能力从「Claude skill」改造成**平台无关的通用 skill**：同一份包可以直接跑在 Node、浏览器、命令行、HTTP 服务、MCP 宿主以及自研 agent 平台（AI OS）上。业务逻辑一行没动 —— 内核仍是 `skills/<模块>/core/*.js` 那一份，通用层只是在外面加了清单、统一调用契约和六种适配器。

## 目录分工

| 位置 | 是什么 | 谁改 |
|---|---|---|
| `skills/<模块>/` | **唯一真相**：内核、数据表、schema、golden 样例、SKILL.md | 业务迭代改这里 |
| `universal/SPEC.md` | 通用规范 DUS-1：包结构、清单字段、调用契约、错误码 | 规范升级时改 |
| `universal/runtime/invoke.js` | 统一调用层，11 包共用同一份 | 规范升级时改 |
| `universal/adapters/*.js` | cli / http / mcp / aios 四个适配器模板 | 接平台时改 `aios.js` |
| `tools/skills.map.json` | 11 个 skill 的动作映射表（动作名 → 内核函数 → 入参） | 加动作时改 |
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
{ "ok": true, "spec": "dus-1", "skill": { "id", "name", "version" }, "action": "run",
  "data": { }, "errors": [], "meta": { "credits", "kind", "mutates", "deterministic", "offline" } }
```

失败时 `ok:false`、`errors` 非空，错误码固定五种：`E_ACTION` / `E_INPUT` / `E_DATASET` / `E_KERNEL` / `E_RUNTIME`。

**2 · 状态在平台手里，包本身无状态。** 产品类（AI ERP / AI CFO 等）的动作分两种：只读的返回结果，标了 `mutates` 的**返回一份新的业务数据副本**。平台把它存进会话状态，下一次调用作为 `input.data` 传回来；第一次调用用 `input.dataset` 指定预置数据集开场。这样同一个包可以同时服务成百上千个会话，互不干扰。

**3 · 确定性。** 内核不碰时间、随机、网络、文件，同一输入永远同一输出，平台可以放心缓存、重放、对账。`examples/` 是 golden 基线，`tests/conformance.js` 会把 CJS / ESM / 浏览器 UMD / CLI 四条路径的输出逐字节比对。

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
