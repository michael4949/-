# 通用 Skill 规范 · DUS-1.1

**DUS = DGG Universal Skill。** 一个 DUS 包是一份**自带数据、无第三方依赖、确定性、可离线**的能力单元，同一份包可以直接跑在 Node、浏览器、命令行、HTTP 服务、MCP 客户端以及自研 agent 平台（AI OS）上。

本规范只约定「包长什么样」与「怎么调用」，不约定宿主平台如何编排。把 11 个模块按本规范产出后，迁移到任何平台只需要写一个薄适配层（本仓库已内置四种）。

> **当前版本：DUS-1.1（2026.09）。** §1–§8 是 1.0 的既有契约，一字未改 —— 现有 11 个包、127 个动作继续合法，老调用方一行不用改。
> §9–§14 是 1.1 的增补：版本与能力声明、对话能力、文档摄入、声明式动作词表、跨平台产物清单，以及「1.0 怎么升到 1.1」的改动清单。
> 1.1 全部是**加法**：信封里的 `spec` 仍然是 `"dus-1"`（理由见 §9.1），新增字段一律可选，平台读不懂就忽略。

---

## 1. 设计约束

| 约束 | 含义 | 为什么 |
|---|---|---|
| **纯函数内核** | 内核不碰 DOM、网络、文件、时间、随机 | 同一输入永远同一输出，平台可缓存、可重放、可对账 |
| **数据随包走** | 规则表与样本数据打进包内，运行期不读文件系统 | 浏览器、边缘运行时、沙箱里都能跑 |
| **零运行时依赖** | 不依赖任何 npm 包 | 任何 JS 运行时直接加载，不用装环境 |
| **离线可用** | 断网可跑完整流程 | 展台、内网、私有化部署 |
| **UMD 双形态** | 同一份文件 `require` 与 `<script>` 都能用 | 不为多平台维护两套代码 |
| **调用契约统一** | 11 个包对外都是 `listActions / describe / invoke / health` | 平台一次接入，11 个能力全通 |

## 2. 包结构

```
<skill-id>/
  manifest.json           机器可读清单（平台读这一份就够）
  package.json            Node 包描述 + exports 映射（require / import / browser）
  README.md               接入说明（六种平台各一段可复制的代码）
  SKILL.md                原 Claude Agent Skill 说明书（保留，供对话式平台使用）
  core/<kernel>.js        能力内核（UMD，唯一真相，与 skills/ 源码逐字一致）
  data/**/*.json          规则表与样本（原样复制，便于人工核对与二次开发）
  bundle/data.json        预合并数据包（= load-data.js 的返回值，运行期用这一份）
  schema/*.json           输入 / 输出 JSON Schema（有则复制）
  runtime/invoke.js       统一调用层（UMD，11 包同一份）
  dist/<id>.umd.js        浏览器 / 边缘单文件（内核 + 数据 + 运行时，一个 script 标签即可）
  dist/<id>.mjs           ESM 单文件（同上，import 即用）
  adapters/cli.js         命令行适配
  adapters/http.js        HTTP 适配（Node http 与 fetch Request/Response 双签名）
  adapters/mcp.js         MCP stdio 适配（把动作暴露成 MCP tools）
  adapters/aios.js        自研平台（AI OS）适配骨架
  tools/openai-tools.json function-calling 工具定义（OpenAI / 兼容协议）
  examples/*.json         golden 输入输出（回归基线）
  tests/conformance.js    跨形态一致性自测（CJS / ESM / UMD / CLI 同输入同输出）
```

## 3. manifest.json

```jsonc
{
  "spec": "dus-1",                  // 规范版本，固定
  "id": "ai-erp",                   // 全局唯一，kebab-case
  "name": "AI ERP",                 // 展示名
  "version": "1.1.0",               // 包版本 = 内核 VERSION
  "suite": { "name": "薯片AI智能体", "version": "2026.09" },
  "summary": "一句话说明",
  "kind": "product",                // compute（算一份结果）| product（多屏交互）
  "credits": 100,                   // 计费口径，平台自行决定是否使用
  "capabilities": {
    "offline": true,                // 断网可用
    "deterministic": true,          // 同输入同输出
    "network": false,               // 不发网络请求
    "filesystem": false,            // 运行期不读文件
    "llm": "optional",              // none | optional | required
    "sideEffects": false            // 不改外部世界
  },
  "runtime": { "engine": "js", "ecma": "es5", "entry": { "require": "dist/<id>.umd.js", "import": "dist/<id>.mjs", "browser": "dist/<id>.umd.js" } },
  "i18n": { "default": "zh-CN", "available": ["zh-CN"] },
  "datasets": [                     // 预置数据集：product 类用它开场，compute 类用 examples
    { "key": "make", "label": "制造型样本", "note": "杭州锐合精密五金" }
  ],
  "actions": [                      // 见 §4
    { "name": "run", "title": "一次成型", "kind": "compute", "mutates": false,
      "description": "…", "input": { "type": "object", "properties": {}, "required": [] }, "returns": "…" }
  ],
  "legacy": { "browserGlobal": "DGG.coreM10", "claudeSkill": "SKILL.md" }
}
```

## 4. 动作（action）

- 动作名 **kebab-case**，平台无关；每个包**必须**有 `run`（一次调用拿到完整结果）。
- 三类 `kind`：`compute` 纯算、`query` 只读查询、`mutate` 返回**新的业务数据副本**。
- `mutates: true` 的动作，返回值就是新数据，平台**必须**把它存回会话状态，下一次调用再传回来。业务数据永远由调用方持有，包本身不存状态。
- 每个动作自带 JSON Schema 形态的 `input`，平台可直接转成表单或 function-calling 参数表。

内置动作（11 包都有）：

| 动作 | 作用 |
|---|---|
| `describe` | 返回 manifest |
| `health` | 自检：内核版本、数据包键、动作数 |
| `run` | 一次成型的完整结果 |

## 5. 调用契约

```js
invoke(action, input, ctx) -> Envelope           // 同步，不返回 Promise
```

**输入约定**

| 字段 | 说明 |
|---|---|
| `input.data` | 当前业务数据（product 类）。对象，或省略 |
| `input.dataset` | 预置数据集 key；未给 `data` 时用它初始化（深拷贝，不污染包内样本） |
| 其余字段 | 按 `manifest.actions[].input` 定义 |

`ctx` 可选：`{ locale, logger, llm }`。内核不依赖 `ctx`，给了也只用于日志与可选润色。

**返回信封（Envelope）**

```jsonc
{
  "ok": true,
  "spec": "dus-1",
  "skill": { "id": "ai-erp", "name": "AI ERP", "version": "1.1.0" },
  "action": "simulate-insert",
  "data": { },                       // 成功时的结果；mutate 动作里就是新的业务数据
  "errors": [],                      // 失败时 [{ code, message, path? }]
  "meta": { "credits": 100, "kind": "compute", "mutates": false, "deterministic": true, "offline": true }
}
```

**错误码**

| code | 含义 |
|---|---|
| `E_ACTION` | 动作不存在 |
| `E_INPUT` | 输入缺字段或类型不对 |
| `E_DATASET` | 指定的数据集不存在 |
| `E_KERNEL` | 内核判定输入不合法（内核自己的 `ok:false` 原样透传） |
| `E_RUNTIME` | 内核抛异常（带原始 message，不吞错） |

**不变量**：任何一次 `invoke` 都返回信封，不抛异常；`ok:false` 时 `errors` 非空；`ok:true` 时 `errors` 为空。

## 6. 六种接入形态

| 形态 | 入口 | 一句话 |
|---|---|---|
| Node CommonJS | `require('<id>')` | `skill.invoke('run', { dataset: 'make' })` |
| Node ESM | `import skill from '<id>/dist/<id>.mjs'` | 同上 |
| 浏览器 | `<script src="dist/<id>.umd.js">` | `DGG.skills['<id>'].invoke(...)` |
| 命令行 | `node adapters/cli.js run --dataset make` | 结果走 stdout，便于任何语言调用 |
| HTTP | `node adapters/http.js` → `POST /actions/<name>` | 任何语言（含 Python）用一次 HTTP 即可 |
| MCP | `node adapters/mcp.js` | 动作自动变成 MCP tools |

自研平台（AI OS）：读 `manifest.json` 注册能力，调用 `adapters/aios.js` 暴露的 `register(host)`；宿主只需提供 `host.registerSkill(descriptor)`，其余按 §5 契约走。

## 7. 确定性与回归

- 内核内**禁止** `Date.now()` / `new Date()` / `Math.random()`；「今天」是数据包里的常量。
- `examples/` 是 golden 基线：`tests/conformance.js` 用同一批输入跑 CJS / ESM / UMD / CLI 四条路径，要求 `JSON.stringify` **逐字节相同**。
- 任何一次内核改动都要重跑 golden；输出变化必须是有意的。

## 8. 版本

- 包版本 = 内核 `VERSION`；套件版本 `suite.version` 按发布月份（如 `2026.09`）。
- 动作名与信封字段遵循语义化：删动作 / 改动作语义 = major；加动作 / 加字段 = minor；修 bug = patch。

---

# DUS-1.1 增补（§9–§14）

1.1 只解决一件事：**把展台原型上验证过的两项能力下沉到 skill 层，让别的 agent 平台也能用**。
一是每屏的「对话大脑」（进屏一条真数据发现、几条能答上的建议问句、问什么答什么），二是离线文档解析（观众直接选自己的 Word / Excel / PPT / PDF / 邮件，全部在本机解析）。
两项能力都必须守住 §1 的硬口径：纯规则、确定性、可离线、同步返回、不碰网络 / 时间 / 随机 / 存储。

## 9. 版本与能力声明

### 9.1 `spec` 字段怎么办（结论：不动）

**`spec` 是协议族标识，不是版本号；1.1 里它仍然是 `"dus-1"`，版本改由新增的 `specVersion` 表达。**

理由是现成的：仓库里至少有 5 处把 `'dus-1'` 写死，平台侧大概率还有一处 `env.spec === 'dus-1'` 的断言。

| 位置 | 写死的是什么 | 改成 `dus-1.1` 会怎样 |
|---|---|---|
| `universal/runtime/invoke.js:55` | 每一个信封的 `spec` | 所有调用方的协议判定同时失配 |
| `universal/runtime/invoke.js:184` | skill 对象上的 `spec` | 注册期的能力判定失配 |
| `universal/adapters/http.js:44` | 404 响应体的 `spec` | HTTP 侧错误体不一致 |
| `tools/build-universal.js`（`skills.json` / `gateway.js` / `manifest.build`） | 套件索引与网关 | 索引与包内清单对不上 |
| 平台侧（不在本仓库） | `if (env.spec !== 'dus-1') reject()` | 升级当天全线拒收 |

所以：

```jsonc
{ "spec": "dus-1", "specVersion": "1.1" }     // 协议族不变，版本单列
```

- `specVersion` 缺省视为 `"1.0"`；它只是自述，**不参与任何判定的否决**。
- 平台判定能力一律走 `features`（§9.2），不要靠 `specVersion` 做 `>=` 比较，更不要靠动作名去猜。
- 什么时候才会出现 `spec: "dus-2"`：删动作、改动作语义、改信封既有字段含义 —— 也就是 §8 说的 major。1.1 一条都没碰。

### 9.2 manifest 新增字段（全部可选）

```jsonc
{
  "spec": "dus-1",
  "specVersion": "1.1",
  "features": {
    "conversation": true,                       // 实现了 screens / brief / suggest / ask
    "ingest": true,                             // 实现了 parse-document / ingest-document
    "act": ["goto", "focus", "open", "apply", "set"],     // 本包会吐出的 act 类型
    "blocks": ["kv", "table", "tags", "list", "metric", "text"]   // 本包会吐出的 block 类型
  },
  "screens": [                                  // = screens 动作的返回值，静态登记一份，平台不调用也能读到
    { "key": "connect", "label": "接入" },
    { "key": "room",    "label": "指挥室" }
  ],
  "actions": [
    { "name": "ask", "title": "问答", "kind": "query", "mutates": false,
      "on": "chat",                             // 函数宿主：kernel（默认）| chat | docparse
      "family": "conversation",                 // core（默认）| conversation | ingest
      "input": { "type": "object", "properties": { } }, "returns": "Answer 或 null" },
    { "name": "ingest-document", "kind": "mutate", "mutates": true,
      "mutatesPath": "data",                    // 新业务数据在返回值的哪个字段；缺省 = 整个返回值就是新数据（1.0 语义）
      "on": "chat", "family": "ingest" }
  ]
}
```

三个新的动作字段，都是可选、都只影响新能力：

| 字段 | 取值 | 缺省 | 作用 |
|---|---|---|---|
| `on` | `kernel` / `chat` / `docparse` | `kernel` | 这个动作的函数挂在哪个模块上。1.0 的 127 个动作全是 `kernel`，不写就是原样 |
| `family` | `core` / `conversation` / `ingest` | `core` | 平台按家族决定要不要把它暴露给大模型（例如 `ask` 通常不进函数调用表，`run` 要进） |
| `mutatesPath` | 点号路径 | 无 | 有它 = 新业务数据在返回值的这个字段里（可能不存在，表示这次没改数据）；没它 = §4 原语义 |

`features` 缺失即视为「只有 1.0 能力」。老包不加这一段也完全合法。

### 9.3 信封新增字段

```jsonc
{
  "ok": true,
  "spec": "dus-1",
  "specVersion": "1.1",                         // 新增
  "skill": { "id": "ai-erp", "name": "AI ERP", "version": "1.1.0" },
  "action": "ask",
  "data": { "text": "…", "blocks": [], "act": { } },
  "errors": [],
  "meta": { "credits": 100, "kind": "query", "mutates": false, "deterministic": true, "offline": true,
            "family": "conversation", "mutatesPath": null }
}
```

§5 的不变量原样有效，另补一条 1.1 专属的：

> **`ask` / `brief` 答不上时返回 `ok:true` + `data:null`。** 「没接住」是业务事实，不是调用失败，`errors` 仍为空。平台以 `data === null` 判定要不要走自己的兜底。

### 9.4 平台侧能力探测（三行）

```js
const m = skill.describe();
const canChat = !!(m.features && m.features.conversation);   // 能不能接对话
const canDoc  = !!(m.features && m.features.ingest);         // 能不能收文档
```

## 10. 对话能力（conversation）

一个登记动作 + 三个对话动作。**8 个产品包必须四件齐全**；3 个计算包可选（不做就不要写 `features.conversation`）。
四个动作全是只读（`kind: 'query'`、`mutates: false`），全部同步返回，全部纯规则 —— **不得调用 LLM**，`ctx.llm` 给了也不许用。

### 10.1 `screens` —— 屏 / 环节由 skill 自己登记

```jsonc
// invoke('screens', {})
[ { "key": "connect", "label": "接入",     "note": "数据来源与同步概况" },
  { "key": "room",    "label": "指挥室",   "note": "全局排程与按期率" },
  { "key": "order",   "label": "订单下钻", "note": "单张订单的归因与处置" } ]
```

| 字段 | 必填 | 约定 |
|---|---|---|
| `key` | 是 | `^[a-z][a-z0-9-]{0,23}$`，同包唯一，**一旦发布不得改**（平台拿它做路由、埋点、`act.goto` 的目标） |
| `label` | 是 | 中文短名，≤ 6 字 |
| `note` | 否 | 一句话说明这屏是干嘛的，≤ 20 字 |
| `order` | 否 | 整数，默认按数组顺序 |

约定三条：

- 返回值与 `manifest.screens` **必须逐字节一致**；平台可以读清单，也可以调动作，两条路结果一样。
- 不吃业务数据：给了 `data` / `dataset` 也不得影响返回值。
- 计算类包可以只有一屏（如 `[{ "key": "result", "label": "结果" }]`），也可以没有这个动作。
- 所有带 `step` 入参的动作，`step` 的合法取值就是这里的 `key`；收到不认识的 `step` **不报错**，按「没有屏上下文」处理（等价于不传）。

### 10.2 `brief` —— 进屏时主动报的一条真数据发现

```jsonc
// invoke('brief', { step: 'room', data: <业务数据> })
{ "text": "按期率 82%，SO-2609-0129 晚 3 天、延期天数居首；冲压一线 7 日负荷 106% 已满负荷。",
  "act": { "type": "focus", "ref": "SO-2609-0129" },
  "ref": "SO-2609-0129",
  "step": "room" }
```

| 入参 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `step` | string | 否 | `screens()` 的 key；不传 = 首屏 |
| `data` / `dataset` | object / string | 见 §5 | 产品包必须其一 |

硬口径：

- **一句话**，≤ 60 汉字，最多两句；超了自己裁。
- **必须是从内核算出来的真数据**：至少含一个数字或一个业务 id，并且这个数字能在 `run` 的结果里找到出处。
- **不许讲解**：「本屏可以查看订单详情」「这里展示了物料情况」这类空话一律不算 brief，宁可返回 `null`。
- 同一 `(step, data)` 必须给同一句（确定性，golden 要逐字节比）。
- 答不上返回 `null`（信封 `ok:true` + `data:null`）。

### 10.3 `suggest` —— 2–4 条建议问句

```jsonc
// invoke('suggest', { step: 'stock', data: … })
["今天哪几项要下单", "采购单一共多少钱", "呆滞占了多少钱", "生成采购单"]
```

- 返回字符串数组，**2–4 条**，每条 ≤ 20 汉字，不带问号也行（展台上是按钮）。
- **硬要求：每一条都必须能被同包的 `ask` 答上**（`ask` 返回非 `null`）。这是 1.1 的自测项之一：把 `suggest` 的每一条回灌 `ask`，有一条落空就算不通过。
- 顺序固定（确定性）。没有可建议的就返回 `[]`，不要返回 `null`。

### 10.4 `ask` —— 问什么答什么

```jsonc
// invoke('ask', { question: '为什么晚', step: 'order', data: … })
{ "text": "SO-2609-0129 晚 3 天：热处理外协回厂比计划迟 2 天，后续装配被顺推。\n齐套 78%，当前「装配」在二线。",
  "blocks": [ { "type": "kv", "rows": [["交期", "09-26"], ["预计完工", "09-29"], ["余量", "-3 天"], ["齐套", "78%"]] } ],
  "act": { "type": "open", "panel": "order-detail", "ref": "SO-2609-0129" },
  "ref": "SO-2609-0129" }
```

| 入参 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `question` | string | 是 | 用户原话，不做预处理 |
| `step` | string | 否 | 当前屏。**屏内问句先由本屏分支接**：站在订单下钻屏问「为什么晚」，答的是当前这一张单，不要跳走 |
| `data` / `dataset` | | 见 §5 | |

- 匹配只用规则：关键词、业务 id（如 `SO-2609-0129`、`R03`）、数字、屏内分支。禁止正则以外的任何「智能」。
- **答不上就返回 `null`**，交平台兜底（平台通常会用自己的通用问答或大模型）。**不要硬编一句「我不知道」占位**。
- 同一 `(question, step, data)` 必须同一答（确定性）。

### 10.5 Answer 结构（`brief` / `ask` / `ingest-document` 共用）

```jsonc
{
  "text": "必填。纯文本，\n 分段。不含 HTML、不含 Markdown 表格、不含颜色与样式。",
  "blocks": [ ],                       // 可选，≤ 3 块，见 §10.6
  "act": { "type": "goto", "step": "order" },   // 可选，≤ 1 个，见 §12
  "ref": "SO-2609-0129",               // 可选，本条指向的业务记录 id（业务 id，不是数组下标）
  "step": "order",                     // 可选，本条属于哪一屏
  "source": ["orders[id=SO-2609-0129].lateDays", "kpi.onTimeRate"]   // 可选，取数出处，便于对账
}
```

`text` 里不要塞表格 —— 表格走 `blocks`。平台只渲染 `text` 也必须读得通，这是底线。

### 10.6 blocks 的平台中立表示

**blocks 是纯数据，不许出现 DOM 节点、函数、HTML 字符串。** 原型里 `blocks` 是 `<table>` 元素，下沉时必须翻译成下面六种之一。

| `type` | 字段 | 上限 | 平台怎么渲染 |
|---|---|---|---|
| `kv` | `rows: [[键, 值], …]`，`title?` | rows ≤ 8 | 两列键值网格 |
| `table` | `head: [列名…]`，`rows: [[单元格…], …]`，`align?: ['l'\|'c'\|'r', …]`，`title?` | head ≤ 5，rows ≤ 6 | 小表格 |
| `tags` | `items: [文字…]`，`tone?` | items ≤ 6 | 标签行 |
| `list` | `items: [文字…]`，`ordered?: false`，`title?` | items ≤ 8 | 列表 |
| `metric` | `items: [{ label, value, unit?, sub?, tone? }]` | items ≤ 4 | 指标块 |
| `text` | `text: "…"` | ≤ 200 字 | 补充段落 |

- 所有单元格、标签、指标值都是**字符串或数字**，不是对象。数字的格式化（千分位、百分号）由 skill 做完，平台不再加工。
- `tone` 取值固定四种：`ok` / `warn` / `bad` / `info`。平台可以只认颜色，也可以完全忽略。
- **未知 `type` 一律忽略且不得报错**；厂商扩展用 `x-` 前缀（如 `x-gantt`），不认识就当没有。
- 一条回答 ≤ 3 块。要给更多，请改成 `act: {type:'open'}` 让用户下钻。

```jsonc
// 一条完整的 blocks 示例
[ { "type": "metric", "items": [ { "label": "按期率", "value": 82, "unit": "%", "tone": "warn" },
                                 { "label": "延期", "value": 4, "unit": "单", "sub": "合计晚 11 天", "tone": "bad" } ] },
  { "type": "table", "head": ["物料", "建议", "截止"], "align": ["l", "r", "c"],
    "rows": [ ["45# 圆钢 φ60", "1,200 kg", "09-21"], ["电镀外协", "—", "09-23"] ] } ]
```

### 10.7 与展台原型的对应关系（给移植的人）

| 原型（`prototype/src/module-04..11.js`） | 通用包动作 | 下沉时必须改的 |
|---|---|---|
| `brain.opener(step, api)` | `brief` | 返回值从「字符串或 {text, blocks(DOM)}」改成 Answer；blocks 变纯数据 |
| `brain.suggest(step)` | `suggest` | 基本照搬；但要保证每条都能被 `ask` 接住 |
| `brain.answer(q, step)` | `ask` | `act` 从**函数**改成 §12 的**纯数据**；`focus` 从 DOM 元素改成 `act:{type:'focus', ref}` |
| `brain.onDoc(doc, step)` | `ingest-document` | `doc` 改由 `parse-document` 给（§11），不再依赖浏览器 |
| `api.go / api.focus / api.say` | 不下沉 | 这些是宿主能力，规范只到 `act` 为止 |

> **命名提醒：** 动作 `brief` 与源 skill 前言里的 `brief_pages`（报告速览页数）没有任何关系。前者是对话里的一句发现，后者是打印件的页数，别混。

## 11. 文档摄入（ingest）

### 11.1 两个动作

| 动作 | 入参 | 返回 | `family` | `on` | 说明 |
|---|---|---|---|---|---|
| `parse-document` | `{ input: { name, base64 } }` | Doc（§11.3） | `ingest` | `docparse` | 纯解析，不碰业务数据。由共用件 `skills/_shared/docparse.js` 提供，**8 个产品包各内联一份，逐字一致** |
| `ingest-document` | `{ doc, step?, data \| dataset }` | `{ text, blocks?, act?, data? }` | `ingest` | `chat` | 按各自业务把文档用起来，可写回业务数据（`mutates: true` + `mutatesPath: "data"`） |

拆成两个动作而不是一个的理由：解析是所有包共用的同一份代码（改一次全体受益），用法是各包各自的业务（AI CFO 看到的是科目余额表，AI ERP 看到的是采购计划）。平台也可以只解析不摄入（比如只想拿 `doc.text` 自己处理）。

兼容形态：`parse-document` 也接受平铺的 `{ name, base64 }`；两种写法结果一致。

**怎么接到共用件**：共用件对外是 `parse({ name, bytes })`，也接受两参形态 `parse(name, bytes)`，其中 `bytes` 允许是 `Uint8Array` / Node `Buffer` / **base64 串** / 普通数组 / `ArrayBuffer`。所以动作映射直接写成两参即可，运行时不需要任何新机制：

```jsonc
{ "name": "parse-document", "on": "docparse", "fn": "parse", "kind": "compute", "family": "ingest",
  "args": [ { "from": "input.name", "required": true }, { "from": "input.base64", "required": true } ],
  "inputProps": [ { "name": "input.name", "type": "string", "required": true },
                  { "name": "input.base64", "type": "string", "required": true } ] }
```

共用件另导出 `VERSION` / `kindOf` / `label` / `sizeText` 与一组低层件（`toBytes` / `utf8` / `b64bytes` / `inflateRaw` / `inflateZlib` / `zipEntries` / `zipRead` / `zipText`），自测与别的 skill 可以直接用；它们不是动作，不进 `manifest.actions`。

### 11.2 base64 入参约定与大小上限

| 约定 | 要求 |
|---|---|
| 正文 | 标准 RFC 4648 字母表，`=` 补齐；**不带 `data:` 前缀**；允许含换行与空白（解码前自行剔除） |
| 文件名 | `name` 必填，解析**只看扩展名**决定 kind；没有扩展名按 `text` 处理 |
| 大小上限 | 原始字节 **≤ 8 MB**（base64 约 10.9 MB 字符）。超限**不算调用失败**：共用件在 `parse` 入口直接返回 `{ ok:false, note:"文件 12.4 MB，超过 8 MB 上限" }`，信封仍是 `ok:true`。只有缺 `name` / `base64` 才是 `E_INPUT` |
| 平台建议 | 在 5 MB 处提示用户「文件较大，解析会慢」；展台现场实际文件多在 1 MB 以内 |
| 解码实现 | 包内**自实现** ES5 解码，**不依赖**宿主的 `atob` / `TextDecoder` / `FileReader` / `DecompressionStream`；Node `Buffer`、`Uint8Array`、`ArrayBuffer` 只是允许的入参形态，不是依赖 |
| 解压实现 | ZIP 的 `deflate-raw` 与 PDF 的 `FlateDecode`（zlib 包装或裸流）都用包内自带的**同步** inflate |

> **为什么必须自带同步解压：** 浏览器的 `DecompressionStream` 是异步且浏览器专用的，一旦用它，`parse-document` 就得返回 Promise —— 那就违反了 §5「invoke 同步返回信封，不返回 Promise」，六种接入形态里的 CLI / HTTP / MCP 全要改。原型里用它是对的（浏览器现场、零体积）；下沉到 skill 层必须换成包内的同步实现。
>
> 同理，字符解码也要自实现：`TextDecoder` 在 Node 与浏览器上对**非法字节序列**的替换行为可能不一致，会破坏「同一份字节 → 同一份 Doc」的确定性。字符集只保证 UTF-8 与 Latin-1，其余按 UTF-8 尽力解码并在 `note` 里说明。

### 11.3 Doc 结构（平台中立，可 JSON 序列化）

```jsonc
{
  "ok": true,
  "kind": "excel",                  // word | excel | ppt | pdf | eml | text —— 只由扩展名决定
  "name": "9月采购计划.xlsx",
  "ext": "xlsx",
  "size": 20481,                    // 原始字节数
  "sizeText": "20.0 KB",            // 已格式化，平台直接显示
  "text": "料号\t数量\n…",           // 全文纯文本（各形态拼出来的那一份），永远有，可能为空串
  "paragraphs": ["…"],              // word / pdf / eml / text：逐段文字
  "tables": [ [["料号","数量"],["S-01","1200"]] ],   // word 正文里的表：二维数组的数组，一张表一格
  "sheets": [ { "name": "Sheet1", "rows": [["料号","数量"],["S-01","1200"]] } ], // excel / csv
  "slides": [ { "no": 1, "title": "三季度产能", "lines": ["三季度产能", "冲压 106%"] } ], // ppt
  "mail": { "from": "", "to": "", "cc": "", "subject": "", "date": "", "attaches": [] },  // eml；非邮件时为 null
  "stats": { "工作表": 2, "行": 186, "非空单元格": 903 },   // 中文键，键序固定（见下）
  "note": ""                        // 解析说明 / 失败原因；正常时空串
}
```

字段约定：

- **四个容器字段永远存在**：`paragraphs` / `tables` / `sheets` / `slides` 用不上时是**空数组**；`mail` 只有邮件才有，其余为 `null`，平台读之前判一下空。
- `tables` 是**二维数组的数组**（`string[][][]`），与 `sheets` / `slides` 的对象形态不一致 —— 这是为了与共用件现行实现逐字一致。要统一成 `{ name, rows }` 得同时改共用件与各包的 `chat.js`，留给 1.2。
- **失败不抛异常**：返回 `{ ok:false, note:'原因' }`，其余字段给空值。**信封仍然是 `ok:true`** —— 解析不成功是业务事实，不是调用失败（入参不合法才是 `E_INPUT`）。
- `.doc` / `.xls` / `.ppt` 等 Office 97 老格式：`ok:false` + `note:"这是 Office 97 的老格式（.doc），请另存为 .docx 再上传"`。
- 扫描件 PDF（无文字层）：`ok:true`、`text` 为空、`note` 如实说明「没有可提取的文字层」。
- `stats` 的键按 kind 固定，键序即下表顺序，不得随内容变动（否则 golden 不稳）：

| kind | `stats` 的键（按序） |
|---|---|
| `word` | 段落 / 表格 / 字数 |
| `excel` | 工作表 / 行 / 非空单元格 |
| `ppt` | 页 / 文本行 / 字数 |
| `pdf` | 页 / 文本块 / 字数 |
| `eml` | 正文行 / 附件 / 字数 |
| `text` | 行 / 字数 |

体积上限（**1.1 的建议值**，用来保证确定性与信封大小可控）。共用件当前未做截断，落地时按下表补上，并在 Doc 上加一个可选的 `truncated: { text?, rows?, paragraphs? }` 标记；未实现截断的实现里这个字段可以整个缺省：

| 字段 | 上限 |
|---|---|
| `text` | 200,000 字符 |
| `paragraphs` | 5,000 条，每条 2,000 字符 |
| `sheets` | 20 张表；每表 2,000 行；每行 64 格；每格 512 字符 |
| `tables` | 200 张；每表 500 行 |
| `slides` | 200 页；每页 200 行 |
| `mail.attaches` | 50 个文件名 |

### 11.4 `ingest-document` 的约定

```jsonc
// invoke('ingest-document', { doc: <上一步的 Doc>, step: 'stock', data: <业务数据> })
{ "text": "这份《9月采购计划》里 12 种物料对得上排程，其中 3 种的建议量比系统低：45# 圆钢差 400 kg。\n已把差异标在物料屏。",
  "blocks": [ { "type": "table", "head": ["物料", "表里", "排程需"], "rows": [["45# 圆钢 φ60", "800 kg", "1,200 kg"]] } ],
  "act": { "type": "goto", "step": "stock" },
  "data": { }        // 有它 = 业务数据被改了，平台必须存回会话状态；没有 = 这次没改数
}
```

- **只读 `doc` 的字段，不得再碰原始字节**；`ingest-document` 拿不到 base64，也不该拿。
- **认不出内容也必须有回应**：返回 `{ text: "这份文件里没有本模块用得上的数据：没有读到物料、数量或交期。" }`，**不要返回 `null`** —— 用户刚上传了文件，沉默是最差的回应。说清楚「读到了什么、为什么用不上」。
- 写回业务数据时，`data` 必须是**新副本**（§5 状态规则照旧，包本身不存状态）。
- **不得把文档原文塞进业务数据**：只落结构化结果（识别出的行、金额、日期），原文留在 Doc 里由平台自行保管。
- 确定性：同一 `(doc, step, data)` 必须同一答。

## 12. 声明式动作词表（act）

`act` 是**纯数据**，让对话接回动作层。原型里 `act` 是个函数（`act: function(api){ setStep('order'); }`），下沉时必须翻译成下面的词表。

| `type` | 字段 | 含义 | 平台最小实现 |
|---|---|---|---|
| `goto` | `step` | 切到某一屏 / 某个环节 | 路由到该屏；`step` 不在 `screens()` 里就忽略 |
| `focus` | `ref`，`step?` | 高亮某条业务记录 | 滚动到该记录并短暂高亮；做不到就忽略 |
| `open` | `panel`，`ref?`，`step?` | 打开下钻 / 抽屉 | 打开对应面板；不认识 `panel` 就退化成 `focus` 或忽略 |
| `apply` | `action`，`input?` | 调用**本 skill** 的某个动作（通常是写回类） | 按 §5 调一次 `invoke`，`mutates` 的返回值存回会话状态 |
| `set` | `path`，`value` | 改一个参数后重算 | 按点号路径改业务数据，然后重新 `run` |

共同的可选字段：`note`（一句话，给平台做 toast 或按钮文案，≤ 20 字）。

```jsonc
{ "type": "goto",  "step": "stock" }
{ "type": "focus", "ref": "SO-2609-0129", "step": "room" }
{ "type": "open",  "panel": "material-detail", "ref": "M-45-60", "note": "看这项的库存走势" }
{ "type": "apply", "action": "apply-purchase", "input": { "ids": ["M-45-60"] }, "note": "只下这一项" }
{ "type": "set",   "path": "params.safetyDays", "value": 7, "note": "安全库存改成 7 天" }
```

规则：

- **平台可以只实现子集**。只实现 `goto` 也是合格实现；一个都不实现，对话照样能用（退化成纯文字问答）。
- **未知 `type` 一律忽略，且不得报错、不得中断渲染**。厂商扩展用 `x-` 前缀（如 `x-print`）。
- 一条回答**最多一个** `act`。要连做两步，由平台在执行完 `apply` 后自行决定下一步。
- `ref` 必须是**业务 id**（`R03` / `L-2609-0001` / `SO-2609-0129`），不是数组下标、不是 DOM 选择器、不是行号。
- `apply.action` 只能是**本 skill** 的动作，且必须在 `manifest.actions` 里；平台执行前应当校验，不在清单里就忽略。**skill 不得靠 `act` 让平台去调别的 skill**。
- `set.path` 是业务数据上的点号路径，`value` 是 JSON 标量或小对象（≤ 1 KB）。平台改完应重算。
- `act` 永远是**建议**，不是命令：平台可以先问用户再执行，尤其是 `apply` 与 `set` 这两种会改数的。

## 13. 跨平台形态清单

§6 的六种接入形态说的是「怎么调」；这一节说的是「每个包必须产出哪些**给别的平台读**的文件」。七项全部是**生成物**，由 `manifest.json` 一份真相生成，**不得手改**。

| 产物 | 位置 | 给谁用 | 生成自 |
|---|---|---|---|
| `SKILL.md` | 包根 | Agent Skills 标准形态：对话式 agent 平台把它当说明书读 | manifest + 源 SKILL.md 正文 |
| `references/*.md` | 包根 | 上面那份说明书的「第二层」，agent 需要细节时才读 | manifest + 源 skill 的数据与口径 |
| `tools.openai.json` | 包根 | OpenAI 及兼容协议的函数调用 | `actions[].input` |
| `tools.anthropic.json` | 包根 | Anthropic tools 格式 | `actions[].input` |
| `manifest.mcp.json` | 包根 | MCP 宿主：一份可直接粘贴的服务器声明 | manifest + `adapters/mcp.js` |
| `openapi.json` | 包根 | HTTP 形态的 OpenAPI 3.1，可喂给任何语言的代码生成器 | manifest + `adapters/http.js` 的路由 |
| `llms.txt` | 包根 | 给模型看的一页速览（纯文本，≤ 8 KB） | manifest |

1.0 已有的 `tools/openai-tools.json` **保留**为别名（内容与 `tools.openai.json` 一致），免得已经接进去的平台断链。

### 13.1 `SKILL.md`（通用包版）

````markdown
---
name: ai-erp
description: AI ERP —— 把在手订单沿工序路线排到产线日历上，算出每单的预计完工、延期归因、插单代价、物料缺口与交付日报。纯规则、确定性、可离线，不发网络请求。什么时候用：用户问排产、交期、延期原因、加急插单、缺料齐套、采购建议、交付日报时。
license: UNLICENSED
metadata:
  id: ai-erp
  version: 1.1.0
  spec: dus-1
  specVersion: "1.1"
  suite: 薯片AI智能体 2026.09
  kind: product
  credits: 100
  offline: true
  deterministic: true
---

# AI ERP

把在手订单排到产线日历上，回答四件事：谁会延期、为什么、怎么救、要花多少。

## 怎么调

```bash
node adapters/cli.js run --dataset make --pretty      # 一次成型
node adapters/cli.js ask --question 为什么晚 --step order --data state.json
```

Node：`require('./ai-erp').invoke('run', { dataset: 'make' })`，同步返回信封。

## 有哪些动作

11 个业务动作 + 6 个对话与文档动作。完整清单见 `references/actions.md`，机器可读的一份在 `manifest.json`。

## 口径与边界

- 「今天」是数据包里的常量，不取系统时间；同一输入永远同一输出。
- 业务数据由调用方持有：带「改数据」标记的动作返回新副本，存回会话状态下次传回。
- 详细口径见 `references/conventions.md`，字段含义见 `references/data-dictionary.md`。
````

| 前言字段 | 必填 | 约定 |
|---|---|---|
| `name` | 是 | `^[a-z0-9-]{1,64}$`，**等于 `manifest.id`**（不是中文展示名） |
| `description` | 是 | ≤ 1024 字符，必须写清**做什么 + 什么时候用**（触发条件）。平台就是靠这一句决定要不要加载这个 skill |
| `license` | 否 | 默认 `UNLICENSED` |
| `metadata` | 否 | 自由字典，平台忽略也不影响。放 id / version / spec / specVersion / suite / kind / credits / offline / deterministic |

正文按**渐进披露**写：

- **一屏能读完，≤ 200 行。** 只放四段：能力一句话、怎么调（三行代码）、有哪些动作（指向 `references/actions.md`）、口径与边界（指向 `references/`）。
- 细节一律进 `references/`。动作参数表不抄进正文 —— 那是 `manifest.json` 与 `references/actions.md` 的事。
- 不放长表、不放完整数据字典、不放实现细节。

### 13.2 两种 `SKILL.md` 前言的关系（别搞混）

仓库里有两份 `SKILL.md`，前言字段完全不是一回事：

| | `skills/<模块>/SKILL.md`（源） | `dist-universal/<id>/SKILL.md`（通用包） |
|---|---|---|
| 是什么 | **工程契约**：人和生成器读的施工图 | **平台说明书**：agent 平台读的能力说明 |
| 谁维护 | 手写，业务迭代时改 | 生成物，`node tools/build-universal.js` 产出，不手改 |
| `name` | 中文展示名（`AI ERP`、`企业AI成熟度评估`） | 小写 kebab 的 id（`ai-erp`、`ai-maturity`） |
| 典型字段 | `id` `kind`（中文「产品」/「计算」）`credits` `version` `triggers` `inputs` `data_files` `datasets` `actions` `llm_calls` `llm_timeout_ms` `offline` `deterministic` `delivers` `report_pages` `brief_pages` `universal` | `name` `description` `license` `metadata` |
| 给谁看 | 仓库里的人、`tools/build-universal.js`、`tools/verify-skills.js` | Claude / 其它 agent 平台的 skill 装载器 |
| 正文 | 完整施工图：口径、字段、算法、验收 | 渐进披露的四段，细节指向 `references/` |

**两者的桥**：生成器把源 `SKILL.md`（连同它的工程契约前言）**原样搬到 `references/skill-source.md`**，再按 §13.1 另生成包根的 `SKILL.md`。所以信息一条不丢，两份各就各位：

- 想知道「这个能力怎么做出来的」→ 读 `references/skill-source.md`。
- 想让 agent 平台把这个能力挂上去 → 用包根 `SKILL.md`。
- 机器要精确参数 → 只认 `manifest.json`。

源前言里的 `universal: dus-1` 是「本 skill 已纳入通用层」的标记，**不是** `specVersion`；纳入 1.1 后可写 `universal: dus-1.1`，它只给仓库内的人看。

### 13.3 `references/*.md`

| 文件 | 必产 | 内容 |
|---|---|---|
| `references/actions.md` | 全部包 | 动作清单：动作 / 类型 / 改数据 / 必填入参 / 返回 / 一个可复制的例子。每个动作一段 |
| `references/data-dictionary.md` | 全部包 | 数据字典：业务数据与结果的字段 → 含义 → 取值范围 → 单位 → 出处；预置数据集清单 |
| `references/conventions.md` | 全部包 | 口径说明：算法口径、单位与取整、「今天」是常量、状态由调用方持有、错误码、积分口径 |
| `references/conversation.md` | 实现了 conversation 的包 | 屏清单、每屏 brief 说什么、suggest 的问句、ask 能接住的问题类型 |
| `references/documents.md` | 实现了 ingest 的包 | 支持的文件类型、本模块从文档里找什么、找不到时怎么说、Doc 结构摘要 |
| `references/skill-source.md` | 全部包 | 源 `SKILL.md` 原样搬运（含它的工程契约前言） |

每篇独立可读（agent 只会加载其中一篇），开头一句说明「这篇讲什么」。

### 13.4 `tools.openai.json`

数组，每项一个函数。

```json
[
  {
    "type": "function",
    "function": {
      "name": "ai_erp_run",
      "description": "一次成型：把在手订单排一遍，返回排程、KPI、延期归因与风险清单。",
      "parameters": { "type": "object",
        "properties": { "dataset": { "type": "string", "enum": ["make", "flow", "project", "service"], "description": "预置数据集" },
                        "data": { "type": "object", "description": "当前业务数据（上一次调用返回的副本）" } },
        "required": [], "additionalProperties": true }
    }
  }
]
```

- `name` = `<id>_<action>`，`-` 换 `_`，匹配 `^[a-zA-Z0-9_-]{1,64}$`。
- `description` = `title：description`，第一句说清楚「什么时候用」。改数据的动作在末尾追加「（返回新的业务数据副本，请存回会话状态）」。
- `parameters` 直接取 `manifest.actions[].input`，一字不改。
- 不设 `strict: true`：动作的 `input` 允许 `additionalProperties`，开严格模式会拒掉合法调用。

### 13.5 `tools.anthropic.json`

数组，字段名与 OpenAI 不同（`input_schema`，且没有 `function` 包裹）。

```json
[
  {
    "name": "ai_erp_run",
    "description": "一次成型：把在手订单排一遍，返回排程、KPI、延期归因与风险清单。",
    "input_schema": { "type": "object",
      "properties": { "dataset": { "type": "string", "enum": ["make", "flow", "project", "service"] },
                      "data": { "type": "object" } },
      "required": [] }
  }
]
```

命名与描述规则同 §13.4。两份文件的动作集合、顺序必须一致（自测项）。

### 13.6 `manifest.mcp.json`

```json
{
  "name": "ai-erp",
  "version": "1.1.0",
  "description": "AI ERP：排产、延期归因、插单模拟、物料缺口与交付日报。纯规则、确定性、可离线。",
  "protocolVersion": "2024-11-05",
  "transport": { "type": "stdio", "command": "node", "args": ["adapters/mcp.js"] },
  "capabilities": { "tools": { "listChanged": false } },
  "tools": [
    { "name": "run", "description": "一次成型：…", "inputSchema": { "type": "object", "properties": {}, "required": [] } }
  ],
  "mcpServers": { "ai-erp": { "command": "node", "args": ["<包的绝对路径>/adapters/mcp.js"] } }
}
```

- `tools[].name` 是**动作名本身**（不加 id 前缀）—— MCP 服务器本身已经按 skill 分好了。与 `adapters/mcp.js` 的 `tools/list` 返回值必须一致（自测项）。
- `mcpServers` 块是给人直接粘进客户端配置的，路径留占位符 `<包的绝对路径>`。
- `protocolVersion` 与 `adapters/mcp.js` 里的 `PROTOCOL` 常量同源。

### 13.7 `openapi.json`

OpenAPI 3.1，描述 `adapters/http.js` 已有的路由，不新增端点。

```json
{
  "openapi": "3.1.0",
  "info": { "title": "AI ERP · DUS-1.1", "version": "1.1.0",
            "description": "纯规则、确定性、可离线的订单交付能力。信封见 components.schemas.Envelope。" },
  "servers": [{ "url": "http://127.0.0.1:8711", "description": "node adapters/http.js" }],
  "paths": {
    "/health":  { "get":  { "summary": "自检", "responses": { "200": { "description": "信封",
                    "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Envelope" } } } } } } },
    "/manifest":{ "get":  { "summary": "机器可读清单", "responses": { "200": { "description": "manifest.json" } } } },
    "/actions": { "get":  { "summary": "动作列表", "responses": { "200": { "description": "动作数组" } } } },
    "/actions/run": { "post": { "summary": "一次成型", "operationId": "ai_erp_run",
      "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/RunInput" } } } },
      "responses": { "200": { "description": "信封", "content": { "application/json": {
        "schema": { "$ref": "#/components/schemas/Envelope" } } } },
                     "400": { "description": "ok:false 的信封" } } } },
    "/invoke": { "post": { "summary": "通用调用", "requestBody": { "content": { "application/json": { "schema": {
      "type": "object", "properties": { "action": { "type": "string" }, "input": { "type": "object" } },
      "required": ["action"] } } } }, "responses": { "200": { "description": "信封" } } } }
  },
  "components": { "schemas": {
    "Envelope": { "type": "object",
      "properties": { "ok": { "type": "boolean" }, "spec": { "const": "dus-1" }, "specVersion": { "const": "1.1" },
                      "skill": { "type": "object" }, "action": { "type": "string" },
                      "data": {}, "errors": { "type": "array", "items": { "$ref": "#/components/schemas/Error" } },
                      "meta": { "type": "object" } },
      "required": ["ok", "spec", "skill", "action", "data", "errors", "meta"] },
    "Error": { "type": "object", "properties": { "code": { "enum": ["E_ACTION","E_INPUT","E_DATASET","E_KERNEL","E_RUNTIME"] },
                                                 "message": { "type": "string" }, "path": { "type": "string" } },
               "required": ["code", "message"] },
    "RunInput": { "type": "object", "properties": { "dataset": { "type": "string" }, "data": { "type": "object" } } }
  } }
}
```

- 每个动作一条 `POST /actions/<name>`，`operationId` = `tools.openai.json` 里的函数名（两边对得上，便于代码生成）。
- `requestBody` 的 schema 直接取 `actions[].input`。
- 实现了 conversation / ingest 的包，另在 `components.schemas` 里给出 `Answer` / `Block` / `Act` / `Doc` 四个 schema（字段见 §10.5、§10.6、§12、§11.3）。

### 13.8 `llms.txt`

一页速览，纯文本 / 轻 Markdown，**≤ 8 KB**，给模型在没加载完整 skill 时快速判断「要不要用这个能力」。

```text
# AI ERP (ai-erp) v1.1.0 · 薯片AI智能体 2026.09 · DUS-1.1

把在手订单沿工序路线排到产线日历上：谁会延期、为什么、怎么救、要花多少。
纯规则 · 确定性（同输入同输出）· 可离线 · 不发网络请求 · 不读时间与随机数 · 100 积分/次

## 怎么调
CLI : node adapters/cli.js run --dataset make --pretty
Node: require('./ai-erp').invoke('run', { dataset: 'make' })
HTTP: POST http://127.0.0.1:8711/actions/run  {"dataset":"make"}
返回统一信封：{ ok, spec:"dus-1", specVersion:"1.1", skill, action, data, errors, meta }

## 动作（17）
run                  一次成型：排程 + KPI + 延期归因
explain              单张订单为什么延期
actions              可选处置动作与代价
apply-action         执行处置，返回新业务数据副本 ← 存回会话状态
simulate-insert      加急插单三策略对比
…
screens              有哪些屏 / 环节
brief                进某屏时的一条真数据发现
suggest              2–4 条能答上的问句
ask                  问什么答什么，答不上返回 null
parse-document       本机解析 Word/Excel/PPT/PDF/邮件（base64 入，Doc 出）
ingest-document      把解析结果用到业务上，可能写回业务数据

## 预置数据集
make 制造型 / flow 流程型 / project 项目型 / service 服务型

## 三条口径
1 业务数据由调用方持有：带 mutates 的动作返回新副本，下次作为 input.data 传回。
2 「今天」是数据包里的常量，不取系统时间。
3 答不上返回 data:null，不是错误；错误只有 E_ACTION / E_INPUT / E_DATASET / E_KERNEL / E_RUNTIME。

## 细节
manifest.json · references/actions.md · references/data-dictionary.md · references/conventions.md
```

### 13.9 七项产物的一致性要求（自测）

- 全部生成自 `manifest.json`：动作集合、顺序、描述、参数 schema 必须逐项对得上。
- `tools.openai.json` / `tools.anthropic.json` / `openapi.json` 的动作集合相同。
- `manifest.mcp.json` 的 `tools` 与 `adapters/mcp.js` 的 `tools/list` 返回值相同。
- `SKILL.md` 前言的 `name` = `manifest.id`，`metadata.version` = `manifest.version`。
- `llms.txt` ≤ 8 KB，动作数与 `manifest.actions.length` 一致。
- 以上任一项不符 = 生成器有 bug，不是文档问题。

## 14. 从 1.0 升到 1.1 要做什么

**这一节只列清单，不写代码。** 逐条做完、`tests/conformance.js` 全绿，才算 1.1。

### 14.1 运行时 `universal/runtime/invoke.js`

1. `envelope()` 里加 `specVersion: '1.1'`（`spec` 仍是 `'dus-1'`，不动）。
2. `createSkill(opts)` 增收 `opts.modules`（形如 `{ chat, docparse }`），并挂到返回对象上。
3. 动作函数解析从 `kernel[a.fn]` 改成「按 `a.on` 选宿主」：`kernel`（默认）/ `modules.chat` / `modules.docparse`；宿主或函数不存在仍返回 `E_RUNTIME`，message 里带上 `on` 的值。
4. `meta` 增 `family`（取 `a.family`，默认 `'core'`）与 `mutatesPath`（取 `a.mutatesPath`，没有就 `null`）。
5. 内置动作增 `screens`：**skill 没有声明同名动作时**，直接返回 `manifest.screens || []`；声明了就走声明的那条（两者结果必须一致，见 §10.1）。
6. `listActions()` 的每一项增 `on` / `family` / `mutatesPath`，供适配器按家族过滤。
7. `health()` 增 `specVersion` / `features` / `screens` 条数 / `modules` 的键名，便于自检一眼看出 1.1 能力是否装上。
8. **不必改**的两处，先确认再动手：`checkInput` 已经支持点号路径（`get(input,'input.base64')` 能取到），所以 `parse-document` 的必填校验直接用 `inputProps:[{name:'input.base64',required:true}]` 即可；`$data:ensure` / `$lib` 等实参装配一律沿用，对话动作不需要新的 `from` 动词。

### 14.2 生成器 `tools/build-universal.js`

1. 复制共用件 `skills/_shared/docparse.js` → 包内 `shared/docparse.js`（与现有 `shared/lint.js` 同法）。
2. 复制各包的对话内核 `skills/<模块>/core/chat.js` → 包内 `core/chat.js`。
3. `index.js` 模板：`require` 上面两份，装配成 `modules = { chat, docparse }` 传给 `createSkill`。
4. `singleFile()`（UMD / ESM 两种）：把 `chat.js` 与 `docparse.js` 一并 `_mod()` 内联，与内核、运行时、数据同一份文件 —— 浏览器单文件必须自带对话与解析，否则 `file://` 打开就残废。
5. `buildManifest()`：写出 `specVersion` / `features` / `screens`，动作条目透传 `on` / `family` / `mutatesPath`。
6. 新增七项跨平台产物（§13）：`SKILL.md`（重写，不再直接拷源文件）、`references/*.md`、`tools.openai.json`、`tools.anthropic.json`、`manifest.mcp.json`、`openapi.json`、`llms.txt`。
7. 源 `SKILL.md` 改为搬到 `references/skill-source.md`（原样，含前言）。
8. `tools/openai-tools.json` 保留为 `tools.openai.json` 的别名，内容一致。
9. `package.json` 的 `files` 数组补上新增文件与目录（`references`、`llms.txt`、`openapi.json`、`manifest.mcp.json`、`tools.*.json`、`shared`）。
10. `writeSuite()`：`skills.json` 增 `specVersion` 与每包的 `features`；`gateway.js` 的 `/tools` 增一条可选的 `?format=anthropic`，并在 404 体里补 `specVersion`。
11. §2 的包结构树同步补上新增文件（本 SPEC 的 §2 是 1.0 原文，1.1 的新增项在 §13 表里，两处都要对得上）。

### 14.3 映射表与源 skill

1. `tools/skills.map.json`：**8 个产品包**各补 6 个动作条目 —— `screens` / `brief` / `suggest` / `ask` / `parse-document` / `ingest-document`。3 个计算包按需，可先不补。
   动作总数：127 → **175**（127 + 8 × 6）。**原有 127 个一个不动。**
2. 每个产品包新增 `screens` 静态清单（写进 map，生成器透传进 manifest）。
3. 共用件 `skills/_shared/docparse.js`（**已落地**：ES5、UMD、全同步、自带 RFC 1951 inflate 与 base64 / UTF-8 解码，不碰 `File` / `FileReader` / `DecompressionStream`）。还差两件：按 §11.3 的上限表做截断并给出 `truncated` 标记；补一组 `examples/docs/*.b64` 的 golden。
4. 每个产品包新增 `skills/<模块>/core/chat.js`：从 `prototype/src/module-04..11.js` 的对话大脑下沉，`blocks` 改纯数据、`act` 改声明式、`onDoc` 改 `ingestDocument`。
5. 源 `SKILL.md` 前言：`universal: dus-1` → `universal: dus-1.1`，`actions` 数字更新；正文补一节「对话与文档」。
6. `tools/verify-skills.js` / `tools/unify-skills.js`：认得 `dus-1.1` 与新增的动作家族。

### 14.4 自测与文档

1. `tests/conformance.js` 模板增四项：
   - 对话 golden：固定 `(step, question, dataset)` 跑 `brief` / `suggest` / `ask`，四条路径逐字节一致。
   - **suggest 回灌**：`suggest` 的每一条丢给 `ask`，必须都不为 `null`。
   - 文档 golden：`examples/docs/*.b64`（每种 kind 一份小样本）跑 `parse-document`，Doc 逐字节一致。
   - 摄入状态流转：`parse-document` → `ingest-document` → 返回的 `data` 回传 `run`，且包内样本未被污染。
2. `examples/docs/` 新增六份小样本（word / excel / ppt / pdf / eml / text），每份 ≤ 64 KB，base64 存放。
3. `universal/README.md`：目录分工表补共用件与对话内核，迁移检查清单补 1.1 的几项（**本次已改**）。
4. 各包 `README.md` 模板：六种接入形态后面补一段「对话与文档怎么接」。
5. 回归门槛（不达标不发版）：
   - 现有 127 个动作的 golden **逐字节不变**。
   - `node dist-universal/register-all.js` 11 行全部版本一致。
   - 老调用方（只认 `spec === 'dus-1'`、不认 `specVersion`）跑一遍 `run` / `health`，结果与 1.0 完全一致。
