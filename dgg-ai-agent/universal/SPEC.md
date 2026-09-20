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
  SKILL.md                Agent Skills 形态说明书（1.1 起是生成物，不再是源文件原样；见 §13.1 / §13.2）
  core/<kernel>.js        能力内核（UMD，唯一真相，与 skills/ 源码逐字一致）
  data/**/*.json          规则表与样本（原样复制，便于人工核对与二次开发）
  bundle/data.json        预合并数据包（= load-data.js 的返回值，运行期用这一份）
  schema/*.json           输入 / 输出 JSON Schema（有则复制）
  runtime/invoke.js       统一调用层（UMD，11 包同一份）
  shared/lint.js          共用件：表述禁忌判定（11 包同一份）
  shared/docparse.js      共用件：离线文档解析（1.1 新增，实现了摄入的包才有，与 skills/_shared/ 逐字一致）
  shared/doc-gate.js      parse-document 的边界闸门（1.1 新增，8 MB 上限与 §11.3 截断表，生成物）
  dist/<id>.umd.js        浏览器 / 边缘单文件（内核 + 数据 + 运行时 + 解析件，一个 script 标签即可）
  dist/<id>.mjs           ESM 单文件（同上，import 即用）
  adapters/cli.js         命令行适配
  adapters/http.js        HTTP 适配（Node http 与 fetch Request/Response 双签名）
  adapters/mcp.js         MCP stdio 适配（把动作暴露成 MCP tools）
  adapters/aios.js        自研平台（AI OS）适配骨架
  scripts/skill.js        一行入口（1.1 新增，等价于 adapters/cli.js，给 agent 用 bash 直接跑）
  references/*.md         说明书的第二层（1.1 新增：actions / data / platforms / engineering / conventions，
                          实现了新能力的包另有 conversation / documents；见 §13.3）
  llms.txt                给模型看的一页速览（1.1 新增，≤ 8 KB，见 §13.8）
  openapi.json            HTTP 形态的 OpenAPI 3.1（1.1 新增，见 §13.7）
  manifest.mcp.json       MCP 宿主可直接粘贴的服务器声明（1.1 新增，见 §13.6）
  tools.openai.json       function-calling 工具定义（OpenAI / 兼容协议，见 §13.4）
  tools.anthropic.json    Anthropic tools 形态（1.1 新增，见 §13.5）
  tools/openai-tools.json 1.0 的老路径，保留为 tools.openai.json 的别名，内容逐字一致
  examples/*.json         golden 输入输出（回归基线）
  tests/conformance.js    跨形态一致性自测（CJS / ESM / UMD / CLI 同输入同输出）
```

> 这棵树是 1.1 的实际产出（`node tools/build-universal.js` 当场可核）。1.0 时 `SKILL.md` 是源文件原样保留，
> 1.1 起改成生成物、源文件搬到 `references/engineering.md`，其余 1.1 新增项已逐行标出（§13 开头的「现状」框说的是同一件事）。

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
| 命令行 | `node adapters/cli.js run --dataset make`，或 `node adapters/cli.js run '{"dataset":"make"}'` | 结果走 stdout，便于任何语言调用。两种写法等价：动作名之后跟一段以 `{` / `[` 开头的 JSON 就整包当入参，`--字段 值` 覆盖它 |
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
                                                // 不写 on = 挂在内核上（对话四件与业务算法同一个文件，见 §14.2 第 2 条）
      "family": "conversation",                 // core（默认）| conversation | ingest
      "input": { "type": "object", "properties": { } }, "returns": "Answer 或 null" },
    { "name": "parse-document", "kind": "compute", "mutates": false,
      "on": "docparse", "family": "ingest" },   // 唯一一个不在内核上的动作：实现是共用解析件
    { "name": "ingest-document", "kind": "mutate", "mutates": false,
      "mutatesPath": "data",                    // 新业务数据在返回值的这个字段里；缺省 = 整个返回值就是新数据（1.0 语义）
      "family": "ingest" }                      // 注意 mutates 是 false，理由见下
  ]
}
```

三个新的动作字段，都是可选、都只影响新能力：

| 字段 | 取值 | 缺省 | 作用 |
|---|---|---|---|
| `on` | `kernel` / `docparse` | `kernel` | 这个动作的函数挂在哪个模块上。1.0 的 127 个动作全是 `kernel`，不写就是原样。1.1 实际只用到这两个宿主：对话四件写在各自的主内核里，只有 `parse-document` 挂在共用解析件上（理由见 §14.2 第 2 条）。运行时的 `modules` 机制不限名字，将来要加别的宿主直接加即可 |
| `family` | `core` / `conversation` / `ingest` | `core` | 平台按家族决定要不要把它暴露给大模型（例如 `ask` 通常不进函数调用表，`run` 要进） |
| `mutatesPath` | 点号路径 | 无 | 有它 = 新业务数据在返回值的这个字段里（可能不存在，表示这次没改数据）；没它 = §4 原语义 |

`features` 缺失即视为「只有 1.0 能力」。老包不加这一段也完全合法。

> **带 `mutatesPath` 的动作一律写 `mutates: false`。**
> §4 把 `mutates: true` 定死成「返回值就是新数据，平台**必须**把它存回会话状态」。只认 1.0 的平台看不懂 `mutatesPath`，
> 会照 §4 把整份 Answer（`{ text, blocks, act, data }`）当业务数据存回去 —— 会话状态当场被污染，下一次 `run` 直接崩。
> 所以 1.1 里 `mutates` 的语义一个字不动，「局部写回」只由 `mutatesPath` 表达：认得 1.1 的平台按路径取新数据；
> 只认 1.0 的平台读到 `mutates: false`，退化成「这次不写回」—— 用户最多白传一次文档，不会存错东西。
> `kind` 仍可写 `mutate` 表意（`kind` 只是分类，存回判定只看 `mutates` 与 `mutatesPath`）。
>
> 顺带说明：`actions[]` 里的 `fn` / `args` / `inputProps` 是生成器从 `tools/skills.map.json` 透传进清单的实现字段（§3 的 1.0 原文没列，但 11 个包的 `manifest.json` 里一直都有）。`on` 是它们的同伴 —— 它决定 `fn` 到哪个模块上去找。

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
  **回灌是同屏口径**：`ask` 要带上取 `suggest` 时那个 `step`。两个动作对「不传 `step`」的退化不一样 —— `suggest` 按 §10.2 退成首屏（给的是首屏那几条），
  `ask` 按 §10.4 退成「没有屏上下文」（只有全局分支接），所以不传 `step` 时这一条不成立，自测只在带 `step` 的那一路上查（`tests/conformance.js` 就是这么写的）。
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
| `step` | string | 否 | 当前屏。**屏内问句先由本屏分支接**：站在订单下钻屏问「为什么晚」，答的是当前这一张单，不要跳走。**不传 = 没有屏上下文**（与 §10.1 的「不认识的 step」同一条退化路径），屏内分支一律不接，只由全局分支答，答不上按 §10.4 返回 `null` —— 注意这里与 `brief` / `suggest` 的「不传 = 首屏」不同 |
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
- **`blocks` 的每一项都必须是带 `type` 的对象。** 「未知 type 忽略」只覆盖不认识的 `type`，**不覆盖 `null`**：平台按 `b.type` 渲染，数组里留一个 `null` 就是当场抛异常。所以 skill 侧不许写 `[kvB(…), cond ? tableB(…) : null]` 这种条件项，要么先 `push` 再 `concat`，要么返回前 `.filter(Boolean)`。**已收口（1.1）**：ai法务 `ingestMail`、AI CFO 合同摄入两处改成 `concat`，`tests/conformance.js` 另加了一条断言（所有 Answer 的 blocks 逐项查 type）。
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
| `parse-document` | `{ name, base64 }` | Doc（§11.3） | `ingest` | `docparse` | 纯解析，不碰业务数据。由共用件 `skills/_shared/docparse.js` 提供，**8 个产品包各内联一份，逐字一致** |
| `ingest-document` | `{ doc, step?, data \| dataset }` | `{ text, blocks?, act?, data? }` | `ingest` | `kernel`（不写 `on`） | 按各自业务把文档用起来，可写回业务数据（`mutates: false` + `mutatesPath: "data"`，理由见 §9.2）。它是各包自己的业务逻辑，与对话四件同在主内核里（§14.2 第 2 条） |

拆成两个动作而不是一个的理由：解析是所有包共用的同一份代码（改一次全体受益），用法是各包各自的业务（AI CFO 看到的是科目余额表，AI ERP 看到的是采购计划）。平台也可以只解析不摄入（比如只想拿 `doc.text` 自己处理）。

**入参一律平铺**：`{ "name": "9月采购计划.xlsx", "base64": "UEsDBB…" }`，**不要**写成 `{ input: { name, base64 } }`。
点号路径在 `args[].from` 与 `inputProps[].name` 上虽然取得到值（运行时的 `get()` 会拆点号），但生成器 `tools/build-universal.js`
的 `inputSchema()` 是拿 `inputProps[].name` **当 JSON Schema 的属性名**直接写进 `actions[].input` 的 —— 写 `input.base64`
就会生成一个字面量叫 `"input.base64"` 的属性，这份 schema 再原样进 `tools.openai.json` / `tools.anthropic.json` / `openapi.json`，
模型照着回传 `{"input.base64": "…"}`，运行时又按点号去 `input → base64` 里找，找不到 → `E_INPUT`。
平铺没有这个坑，而且运行时与生成器一行都不用改。`name` / `base64` 与 §5 的控制字段 `data` / `dataset` 不撞名，平铺是安全的。

**怎么接到共用件**：共用件对外是 `parse({ name, bytes })`，也接受两参形态 `parse(name, bytes)`，其中 `bytes` 允许是 `Uint8Array` / Node `Buffer` / **base64 串** / 普通数组 / `ArrayBuffer`。所以动作映射直接写成两参即可，运行时不需要任何新机制：

```jsonc
{ "name": "parse-document", "on": "docparse", "fn": "parse", "kind": "compute", "family": "ingest",
  "args": [ { "from": "name", "required": true }, { "from": "base64", "required": true } ],
  "inputProps": [ { "name": "name", "type": "string", "required": true, "description": "文件名，只用扩展名判类型" },
                  { "name": "base64", "type": "string", "required": true, "description": "文件字节的 base64" } ] }
```

共用件另导出 `VERSION` / `ACCEPT` / `kindOf` / `label` / `sizeText` 与一组低层件（`toBytes` / `utf8` / `utf8self` / `latin1` / `b64bytes` / `inflateRaw` / `inflateZlib` / `zipEntries` / `zipRead` / `zipText`），自测与别的 skill 可以直接用；它们不是动作，不进 `manifest.actions`。

### 11.2 base64 入参约定与大小上限

| 约定 | 要求 |
|---|---|
| 正文 | 标准 RFC 4648 字母表，`=` 补齐；**不带 `data:` 前缀**；允许含换行与空白（解码前自行剔除） |
| 文件名 | `name` 必填，解析**只看扩展名**决定 kind；没有扩展名按 `text` 处理 |
| 大小上限 | 原始字节 **≤ 8 MB**（base64 约 10.9 MB 字符）。超限**不算调用失败**：返回 `{ ok:false, note:"文件 12.4 MB，超过 8 MB 上限" }`，信封仍是 `ok:true`。只有缺 `name` / `base64` 才是 `E_INPUT`。**已落地（1.1）：闸门做在通用包 `parse-document` 动作的边界上（包内 `shared/doc-gate.js`），不在共用件里** —— 共用件一截断、一设限，展台原型对大文件的行为就被改掉了（现场 2 MB / 55000 行的 xlsx 必须解全），所以 `skills/_shared/docparse.js` 一个字不动。字节数按 base64 的有效字符数算（每 4 字符 3 字节），超限的那一份连解压都不进 |
| 平台建议 | 在 5 MB 处提示用户「文件较大，解析会慢」；展台现场实际文件多在 1 MB 以内 |
| 解码实现 | base64 与 UTF-8 解码**包内各自带一份**，宿主没有 `atob` / `TextDecoder` / `FileReader` / `DecompressionStream` 照样跑；Node `Buffer`、`Uint8Array`、`ArrayBuffer` 只是允许的入参形态，不是依赖。共用件对 >4 KB 的 UTF-8 块会借宿主 `TextDecoder` 提速 —— 这是允许的，因为包内实现已逐字对齐 WHATWG 口径、两条路在任意字节串上结果相同。**借宿主 API 只许发生在可证明等价的地方** |
| 字符集 | 只保证 UTF-8 与 Latin-1 逐字确定。**唯一例外**：`.eml` 正文声明成 GBK / Big5 等非 UTF-8 字符集时，共用件借宿主 `TextDecoder`，宿主没有就退回 latin1 —— 这一处**结果会随宿主而异**，违反「同一份字节 → 同一份 Doc」。落地时二选一：固定成一种行为（如一律 latin1 + `note` 如实说明），或把这类样本排除出 golden。见 §14.3 第 3 条 |
| 解压实现 | ZIP 的 `deflate-raw` 与 PDF 的 `FlateDecode`（zlib 包装或裸流）都用包内自带的**同步** inflate |

> **为什么必须自带同步解压：** 浏览器的 `DecompressionStream` 是异步且浏览器专用的，一旦用它，`parse-document` 就得返回 Promise —— 那就违反了 §5「invoke 同步返回信封，不返回 Promise」，六种接入形态里的 CLI / HTTP / MCP 全要改。原型里用它是对的（浏览器现场、零体积）；下沉到 skill 层必须换成包内的同步实现。
>
> 同理，字符解码必须**自带一份**：宿主可以没有 `TextDecoder`（老引擎、严格沙箱），而 GBK / Big5 这类码表几百 KB，零依赖实现不了。
> 所以口径是：UTF-8 / Latin-1 自己解，逐字确定；非 UTF-8 字符集只可能出现在 `.eml` 正文里，是全规范**唯一**一处允许「随宿主而异」的解码，必须在 `note` 里如实说明，并且不进 golden。

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
- `tables` 是**二维数组的数组**（`string[][][]`），与 `sheets` / `slides` 的对象形态不一致 —— 这是为了与共用件现行实现逐字一致。要统一成 `{ name, rows }` 得同时改共用件与 8 个包内核里的摄入分支，留给 1.2。
- **失败不抛异常**：返回 `{ ok:false, note:'原因' }`，其余字段给空值。**信封仍然是 `ok:true`** —— 解析不成功是业务事实，不是调用失败（入参不合法才是 `E_INPUT`）。

  > **这条在现行运行时上落不了地，必须先改运行时。** `universal/runtime/invoke.js:166` 有一条 1.0 的规矩：内核返回的对象只要带 `ok:false`，就整条翻成 `E_KERNEL` 错误信封、`data` 置 `null`。
  > Doc 正好把 `ok` 挂在自己身上，于是「文件解析失败 / 超限」会被当成「调用失败」，`note` 传不出去，平台只拿到一条 `E_KERNEL`。改法见 §14.1 第 9 条（按 `family` 分家族跳过这条透传）。

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

体积上限（用来保证确定性与信封大小可控）。**已落地（1.1）**：与 8 MB 闸门同一个位置 —— 通用包 `parse-document` 动作的边界（包内 `shared/doc-gate.js`），
解析照常跑全量，**返回前**按下表裁一遍，裁过的在 Doc 上标一个 `truncated: { text?, paragraphs?, rows? }`（只出现被裁的那几个键，一个都没裁就整个字段不出现）。
`sheets` / `tables` / `slides` / `mail.attaches` 四类被裁都记在 `rows` 这一个键上。共用件 `skills/_shared/docparse.js` **仍然不截断**，直接调它拿到的永远是全量 Doc：

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
- **吃的是裁剪后的那份 Doc（1.1 定，原先没写明）。** `parse-document` 返回前已按 §11.3 的上限表裁过，
  平台拿到什么就原样传给 `ingest-document`，两边看到的是同一份 Doc —— 口径一致，`truncated` 标记也一并传到，
  摄入逻辑要是在意「是不是被裁过」（例如提示用户「表太长，只读了前 2000 行」），直接读 `doc.truncated` 即可。
  规范不提供「未裁剪的 Doc」这条通路：要全量就直接调共用件 `skills/_shared/docparse.js`，那是包内自测与别的 skill 的用法，不是动作契约的一部分。

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
- **写的是动作名，不是内核导出名。** 两者常常不同形（内核 `applyFix` / `offer` / `handleException` ↔ 动作 `apply-fix` / `make-offer` / `handle-exception`），
  平台手上只有 `manifest.actions`，拿导出名去比一定落空。**已收口（1.1）**：8 个产品内核里 36 处 `act.apply.action` 改成映射表 `tools/skills.map.json` 里的动作名，
  另有 12 处「`ingest-document` 吐出指回自己的 `apply`」按下一条改成 `focus` / `goto`（实跑复核：1688 条回答里 act 违规 0）；展台原型的 `act` 分发也跟着改成动作名（原型是宿主，按同一张词表认）。
  不另做「导出名 → 动作名」的运行时映射层：那等于允许两套名字并存，平台侧的三道校验反而更难写。
- `set.path` 是业务数据上的点号路径，`value` 是 JSON 标量或小对象（≤ 1 KB）。平台改完应重算。
- `act` 永远是**建议**，不是命令：平台可以先问用户再执行，尤其是 `apply` 与 `set` 这两种会改数的。

**防递归（`apply` / `set` 必读）。** 执行 `apply` 或 `set` 之后会再拿到一份返回，那份返回里**可能又带一个 `act`** —— 不拦就是一个死循环。两头各担一半：

- **平台侧：只展开一跳。** 由 `act` 触发的那次调用，其返回里的 `act` 只许呈现给用户（按钮 / toast），**不许自动再执行**。深度上限固定为 1，不可配置。
- **平台侧执行 `apply` 前的三道校验：** ① `action` 在 `manifest.actions` 里；② 它的 `family` 是 `core`；③ 它不是当前这次调用的动作名。任一不过就按「未知 act」忽略，不报错、不中断渲染。
- **skill 侧：** `apply.action` 不得指向 `ask` / `brief` / `suggest` / `ingest-document`（`family` 不是 `core` 的一律不许），也不得指回吐出这个 `act` 的动作自己。
- `set` 同理：平台改完数据重算一次即可，重算结果里的 `act` 不自动执行。

上面几条加起来，「skill 吐 act → 平台调动作 → 又吐 act → 再调」的环闭不上。

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

1.0 已有的 `tools/openai-tools.json` **保留**为别名，免得已经接进去的平台断链。**已收口（1.1）**：两份由 `tools/platform-artifacts.js` 的 `emit()` 同一次写出，内容逐字一致，工具名都是 §13.4 的 `<id>_<action>`。

> **现状（2026.09，读这一节之前先看）：这七项已经在仓库里了。**
> `tools/platform-artifacts.js`（约 400 行）由 `tools/build-universal.js` 第 10 步调用，`node tools/build-universal.js ai-erp` 当场产出
> `SKILL.md` · `references/` · `scripts/skill.js` · `tools.openai.json` · `tools.anthropic.json` · `manifest.mcp.json` · `openapi.json` · `llms.txt`。
> 所以 §13 不是「从零新增」，是「把已产出的东西定死口径」。原先与条文对不上的五处 —— 工具名（§13.4）、references 篇目（§13.3）、
> MCP `transport` 形态（§13.6）、OpenAPI 的 server 与 `operationId`（§13.7）、`SKILL.md` 前言的 `metadata`（§13.1）—— **1.1 已逐条收口**（§14.2 第 12 条）。
> 收没收口不靠眼睛看：`node tools/build-universal.js && node tools/verify-artifacts.js` 把 §13.9 的十项一致性逐包跑一遍，不符会指明是哪个包哪一项。
>
> 另外，§2 的包结构树原先是 1.0 原文，**1.1 已同步改过**（§14.2 第 11 条）：① 包根 `SKILL.md` 不再是「源文件原样保留」，而是生成物（§13.2）；
> ② `references/` · `scripts/skill.js` · `shared/` · `llms.txt` · `openapi.json` · `manifest.mcp.json` · `tools.*.json` 都已逐行列进树里。两处现在对得上，改了一处记得改另一处。
>
> 套件级（`dist-universal/` 根）另有一套同名产物：`SKILL.md`（总入口）· `tools.openai.json` · `tools.anthropic.json` · `mcp.json` · `llms.txt` · `INSTALL.md` · `skills.json` · `gateway.js`。
> 本节只约束包级；套件级跟着包级走，工具名等口径必须一致（§13.9）。

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
node scripts/skill.js run '{"dataset":"make"}'                                  # 一次成型
node scripts/skill.js ask '{"question":"为什么晚","step":"order","dataset":"make"}'  # 问什么答什么
node adapters/cli.js run --dataset make --pretty                                 # 同一件事的 --字段 写法
```

Node：`require('./ai-erp').invoke('run', { dataset: 'make' })`，同步返回信封。

## 有哪些动作

11 个业务动作 + 6 个对话与文档动作。完整清单见 `references/actions.md`，机器可读的一份在 `manifest.json`。

## 口径与边界

- 「今天」是数据包里的常量，不取系统时间；同一输入永远同一输出。
- 业务数据由调用方持有：带「改数据」标记的动作返回新副本，存回会话状态下次传回。
- 详细口径见 `references/conventions.md`，字段含义见 `references/data.md`。
````

| 前言字段 | 必填 | 约定 |
|---|---|---|
| `name` | 是 | `^[a-z0-9-]{1,64}$`，**等于 `manifest.id`**（不是中文展示名） |
| `description` | 是 | ≤ 1024 字符，必须写清**做什么 + 什么时候用**（触发条件）。平台就是靠这一句决定要不要加载这个 skill |
| `license` | 否 | 默认 `UNLICENSED` |
| `metadata` | 否 | 自由字典，平台忽略也不影响。放 id / version / spec / specVersion / suite / kind / credits / offline / deterministic |

两条补充：

- **目录名即技能名。** Claude Code / claude.ai 的装载器按目录名找 skill，前言 `name` 必须与**包目录名**一致。本套件里三者同一个值：目录名 = `manifest.id` = `name`（`dist-universal/ai-erp/` → `ai-erp`）。改目录名就要同步改前言。
- **`license` 与 `metadata` 1.1 起必写**（§14.2 第 12 条⑤的决定）。生成器 `tools/platform-artifacts.js` 的 `skillMd()` 按上表四个字段全写，`metadata` 里那几项全部取自 `manifest.json`，所以 §13.9 的 `metadata.version` 是**必查项**，不再是「有才查」。

> **正文里的 bash 命令必须原样复制就能跑。** 生成器教的是位置参 JSON（`node scripts/skill.js <动作> '<JSON>'`），
> `universal/adapters/cli.js` 的 `parse()` 认这种写法：动作名之后第一个以 `{` / `[` 开头的实参 `JSON.parse` 后并进入参，解析失败按用法错误退 2，`--字段 值` 仍可覆盖。
> **已收口（1.1）**：1.0 的 `parse()` 把位置参整个 `continue` 丢掉，246 条正文命令的入参全是空对象 —— 现已改好，`ask` 的例子也补上了 `step`。
> 例子里带 `{"$action":…}` / `{"$dataset":…}` / `{"$file":…}` 的动作（入参要先取别的动作的返回值）**不冒充可运行**：
> `references/actions.md` 对这一类改印 `jsonc` 入参样例 + 一句「填好存成 in.json 再 `--input in.json`」。自测办法见 §13.9 末条。

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

**两者的桥**：生成器把源 `SKILL.md`（连同它的工程契约前言）**原样搬到 `references/engineering.md`**，再按 §13.1 另生成包根的 `SKILL.md`。所以信息一条不丢，两份各就各位：

- 想知道「这个能力怎么做出来的」→ 读 `references/engineering.md`。
- 想让 agent 平台把这个能力挂上去 → 用包根 `SKILL.md`。
- 机器要精确参数 → 只认 `manifest.json`。

源前言里的 `universal: dus-1` 是「本 skill 已纳入通用层」的标记，**不是** `specVersion`；纳入 1.1 后可写 `universal: dus-1.1`，它只给仓库内的人看。

### 13.3 `references/*.md`

| 文件 | 必产 | 内容 |
|---|---|---|
| `references/actions.md` | 全部包 | 动作清单：动作 / 类型 / 改数据 / 必填入参 / 返回 / 一个可复制的例子。每个动作一段 |
| `references/data.md` | 全部包 | 数据字典：规则表与样本的键、预置数据集清单、依赖的兄弟引擎 |
| `references/platforms.md` | 全部包 | 六种接入路径 + 各家 agent 平台怎么接（生成器一直在产，1.0 规范漏写了） |
| `references/engineering.md` | 全部包 | 源 `SKILL.md` 原样搬运（含它的工程契约前言）—— **这就是 §13.2 说的那一份** |
| `references/conventions.md` | 全部包 | 口径说明：算法口径、单位与取整、「今天」是常量、状态由调用方持有、错误码、积分口径 |
| `references/conversation.md` | 实现了 conversation 的包 | 屏清单、每屏 brief 说什么、suggest 的问句、ask 能接住的问题类型、blocks 与 act 词表 |
| `references/documents.md` | 实现了 ingest 的包 | 支持的文件类型、本模块从文档里找什么、找不到时怎么说、Doc 结构摘要、上限与截断 |

每篇独立可读（agent 只会加载其中一篇），开头一句说明「这篇讲什么」。

**文件名以现行生成器为准**（1.1 已按本表落地：前四篇不动、后三篇新增，`platforms.md` 不并进 `conventions.md`）：草稿里的 `data-dictionary.md` / `skill-source.md` 一律按 `data.md` / `engineering.md` 理解 —— `manifest.agentSkill.engineering`、包根 `SKILL.md` 的「还有这些可以查」、`llms.txt` 的「细节」段都已经指着这两个名字，改名要同时改清单、三份生成物与已发出去的包，不值当。

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

- `name` = `<id>_<action>`，`-` 换 `_`（`ai-erp` + `simulate-insert` → `ai_erp_simulate_insert`），匹配 `^[a-zA-Z0-9_-]{1,64}$`。
  **四处必须同一个口径**：包级 `tools.openai.json` / `tools.anthropic.json`、包级 `openapi.json` 的 `operationId`、套件级 `dist-universal/tools.*.json`、以及 `gateway.js` 的 `/tools/call` 解析。
  **已收口（1.1）**：四处共用 `tools/platform-artifacts.js` 的 `toolName(id, action)`（`gateway.js` 里内联的那份逐字同源），
  套件工具表喂给模型后，模型回传的名字网关认得出来 —— `tools/verify-artifacts.js` 第 9、10 项就是拿套件表里的第一个名字真打一次 `/tools/call`。
  单包场景不加前缀也能用，但 11 个包一起喂给模型时 11 个 `run` 会撞名，所以统一加前缀。
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
- `protocolVersion` 与 `adapters/mcp.js` 里的 `PROTOCOL` 常量同源（现在两边都是 `2024-11-05`，对得上）。
- **已收口（1.1）**：`transport` 是上面的对象形态，`mcpServers.<id>.args` 是 `<包的绝对路径>/adapters/mcp.js`。
  `tools[].description` 与 `adapters/mcp.js` 的 `tools/list` 用**同一个表达式**拼（`title：description` + 写回提示），`tools/verify-artifacts.js` 第 4 项真起一次 mcp 进程逐项对比。

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

- 每个动作一条 `POST /actions/<name>`，`operationId` = `tools.openai.json` 里的函数名（两边对得上，便于代码生成）。**已收口（1.1）**：两边都是 `<id>_<action>`；`operationId` **只给动作端点**，`/health` / `/manifest` / `/actions` / `/invoke` 不安，否则两边的集合对不上。
- `servers[0].url` 用 `http://127.0.0.1:8711`：`adapters/http.js` 的端口取 `PORT || 8711`，**它不读命令行参数**。**已收口（1.1）**：`openapi.json` 写 `http://127.0.0.1:8711`，`references/platforms.md` 改教 `node adapters/http.js` / `PORT=9000 node adapters/http.js`。
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
manifest.json · references/actions.md · references/data.md · references/conventions.md
```

### 13.9 七项产物的一致性要求（自测）

- 全部生成自 `manifest.json`：动作集合、顺序、描述、参数 schema 必须逐项对得上。
- `tools.openai.json` / `tools.anthropic.json` / `openapi.json` 的动作集合相同。
- `manifest.mcp.json` 的 `tools` 与 `adapters/mcp.js` 的 `tools/list` 返回值相同。
- `SKILL.md` 前言的 `name` = `manifest.id`（且 = 包目录名）、匹配 `^[a-z0-9-]{1,64}$`，`description` 非空且 ≤ 1024 字符；`metadata.version` = `manifest.version`（1.1 起 `metadata` 必写，见 §13.1）。正文 ≤ 200 行。
- `llms.txt` ≤ 8 KB，动作数与 `manifest.actions.length` 一致。
- **工具名四处一致**：包级 `tools.*.json` = 包级 `openapi.json` 的 `operationId` = 套件级 `tools.*.json`，并且拿套件工具表里的第一个名字打一次 `gateway.js` 的 `/tools/call`，**不许 404**。
- `manifest.mcp.json` 的 `transport` 是对象形态，`mcpServers.<id>.args` 指向 `adapters/mcp.js` 的绝对路径占位符。
- **正文命令逐条真跑**：把 `SKILL.md` / `references/*.md` / `llms.txt` 里所有以 `node scripts/skill.js` 或 `node adapters/cli.js` 开头的命令，
  在包目录下实跑一遍，退出码必须是 0、stdout 必须是 `ok:true` 的信封；带 `<占位符>` / `…` 的模板行跳过（它们本来就是要用户自己填的）。
  2026.09 实测：11 个包共 207 条可运行命令全过，47 条模板行跳过。
- 以上任一项不符 = 生成器有 bug，不是文档问题。

**自测脚本：`tools/verify-artifacts.js`**。先 `node tools/build-universal.js` 生成，再 `node tools/verify-artifacts.js`（带一个包 id 就只测那一个）。
它逐包跑八项、套件再跑两项，任一项不符都打印「哪个包 · 哪一项 · 差在哪」并以退出码 1 结束；第 4 项真起一次 `adapters/mcp.js` 进程问 `tools/list`，第 10 项真调一次 `gateway.js` 的 `/tools/call`（`PORT=0`，不占端口）。

## 14. 从 1.0 升到 1.1 要做什么

**这一节只列清单，不写代码。** 逐条做完、`tests/conformance.js` 全绿，才算 1.1。

### 14.1 运行时 `universal/runtime/invoke.js`

1. `envelope()` 里加 `specVersion: '1.1'`（`spec` 仍是 `'dus-1'`，不动）。
2. `createSkill(opts)` 增收 `opts.modules`（形如 `{ docparse }`），并挂到返回对象上。**已做**：机制不限宿主名字，1.1 实际只装了 `docparse` 一个（对话四件写在主内核里，见 §14.2 第 2 条）。
3. 动作函数解析从 `kernel[a.fn]` 改成「按 `a.on` 选宿主」：`kernel`（默认）/ `modules[a.on]`（1.1 实际只有 `docparse`）；宿主或函数不存在仍返回 `E_RUNTIME`，message 里带上 `on` 的值。
4. `meta` 增 `family`（取 `a.family`，默认 `'core'`）与 `mutatesPath`（取 `a.mutatesPath`，没有就 `null`）。
5. 内置动作增 `screens`：**skill 没有声明同名动作时**，直接返回 `manifest.screens || []`；声明了就走声明的那条（两者结果必须一致，见 §10.1）。
6. `listActions()` 的每一项增 `on` / `family` / `mutatesPath`，供适配器按家族过滤。
7. `health()` 增 `specVersion` / `features` / `screens` 条数 / `modules` 的键名，便于自检一眼看出 1.1 能力是否装上。
8. **不必改**的一处，先确认再动手：`$data:ensure` / `$lib` / `$input` / `$lint` / `$helper:` / `$ctx` 这套实参装配一律沿用，对话与摄入动作不需要新的 `from` 动词。
   （`checkInput` 确实支持点号路径，但 `parse-document` **不要**用点号 —— 生成器会把 `inputProps[].name` 当 JSON Schema 属性名，点号会生成一个叫 `"input.base64"` 的字面量属性，见 §11.1。入参平铺成 `{ name, base64 }`。）
9. **`ok:false` 透传要分家族**（不改则 §11.3 落不了地）：`invoke()` 现在对任何 `isObj(out) && out.ok === false` 都翻成 `E_KERNEL` 错误信封、`data` 置 `null`（`invoke.js:166`）。Doc 把 `ok` 挂在自己身上，解析失败与超限会被误判成调用失败。
   改成：`a.family === 'ingest'`（或动作上显式标一个 `rawResult: true`）时跳过这条透传，直接 `envelope(action, true, out)`。`family` 不写默认 `core`，所以 127 个老动作行为一字不变。
10. `screens` 走内置兜底时 `byName['screens']` 是空的，`envelope()` 会把 `meta.kind` 写成默认的 `'compute'`、`meta.family` 写成 `'core'`，与 §10 说的 `kind:'query'` / `family:'conversation'` 对不上。内置分支要自带一份 `extraMeta`。

### 14.2 生成器 `tools/build-universal.js`

1. 复制共用件 `skills/_shared/docparse.js` → 包内 `shared/docparse.js`（与现有 `shared/lint.js` 同法）。**已做**：`build()` 第 6 步，与 `lint.js` 同一段；另写出 `shared/doc-gate.js`（§11.2 的 8 MB 闸门 + §11.3 的截断表，生成物）。要不要拷按「有没有动作写 `on: 'docparse'`」判 —— 1.0 时这里认的是动作名 `ingest`，改名成 `ingest-document` 之后再按名字判会全盘落空，解析件不进包、单文件不内联，`parse-document` 当场没实现。
2. ~~复制各包的对话内核 `skills/<模块>/core/chat.js` → 包内 `core/chat.js`。~~ **不做，1.1 的实际做法是：对话五个函数（`screens` / `brief` / `suggest` / `ask` / `ingest`）写在各自的主内核文件里**（如 `skills/06-ai-cfo/core/fin.js`），**没有** `core/chat.js` 这个文件。
   理由：对话逻辑与业务算法共用大量内部函数（`run` 的中间结果、各种格式化与查找件），拆成两个文件要么重复实现一遍，要么互相 `require`；而内核是 UMD、要能被 `singleFile()` 原样内联进浏览器单文件，跨文件依赖还得靠生成器再做一次内联，得不偿失。
   连带的两条：动作条目**不写 `on`**（默认宿主就是 kernel），生成器也不必为对话复制任何文件。`modules` 机制照旧实现，但 1.1 只有 `docparse` 这一个宿主用到。
3. `index.js` 模板：`require` 包内 `shared/docparse.js` 与 `shared/doc-gate.js`，装配成 `modules = { docparse }` 传给 `createSkill`。**已做**。对话四件与 `ingest-document` 都在内核上，`kernel = core` 一行不变，不再往内核上挂任何合成函数。
4. `singleFile()`（UMD / ESM 两种）：把 `docparse.js` 与闸门一并 `_mod()` 内联，与内核、运行时、数据同一份文件 —— 浏览器单文件必须自带解析，否则 `file://` 打开就残废。**已做**，并在真浏览器里验过：8 个产品包各 10 次调用（对话四件 + 文档两件 + xlsx / pdf / eml / `.doc` 老格式四份真文件）与 Node 逐字节一致，页面报错 0、对外请求 0。
5. `buildManifest()`：写出 `specVersion` / `features` / `screens`，动作条目透传 `on` / `family` / `mutatesPath`。**已做**。三个动作字段是「有才写」：映射表里没写的就不写进清单，所以 1.0 的老动作条目一个字节不变，运行时按缺省值照旧走内核。
   `features.conversation` / `features.ingest` 由动作名推出来；`features.act` / `features.blocks` 生成器推不出来（那是内核跑起来才知道吐什么），由映射表的包级 `features` 登记，值是实跑 + 内核构造点双向核过的。
6. 新增七项跨平台产物（§13）：`SKILL.md`（重写，不再直接拷源文件）、`references/*.md`、`tools.openai.json`、`tools.anthropic.json`、`manifest.mcp.json`、`openapi.json`、`llms.txt`。**已做**：全部由 `tools/platform-artifacts.js` 的 `emit()` 一次写出（第 10 步调用），另附 `scripts/skill.js` 与老路径别名 `tools/openai-tools.json`。
7. 源 `SKILL.md` 搬到 `references/engineering.md`（原样，含前言）—— **生成器已经这么做了**，这一条只是确认，不用改代码。**已确认**：`build()` 把源 `md` 经 `opt.sourceMd` 交给 `emit()`，`emit()` 原样写出（`manifest.agentSkill.engineering` 也指着这个名字）；`tools/verify-artifacts.js` 会检查它开头仍是源前言的 `---`。
8. `tools/openai-tools.json` 保留为 `tools.openai.json` 的别名，内容一致。**已做**：`build()` 原先第 8 步那段自己拼工具名的代码删掉，改由 `emit()` 把同一个数组写两遍（自测第 2 项逐字比对两份文件）。
9. `package.json` 的 `files` 数组补上新增文件与目录（`references`、`llms.txt`、`openapi.json`、`manifest.mcp.json`、`tools.*.json`、`shared`）。**已做**，另补了一直在拷却没进数组的 `prompts`。
10. `writeSuite()`：`skills.json` 增 `specVersion` 与每包的 `features`；`gateway.js` 的 `/tools` 增一条可选的 `?format=anthropic`，并在 404 体里补 `specVersion`。**已做**：`skills.json` 顶层 `specVersion: "1.1"`、每条 skill 多一个 `features`（没有新能力的包是 `null`）；`gateway.js` 的 `route()` 多收一个解析好的查询串参数（不传照旧），`/tools` 不带 `format` 仍是 OpenAI 形态、`?format=anthropic` 给 `{ name, description, input_schema }`，两种形态工具名逐条相同；`/nope` 与 `/tools/call` 找不到工具这两个 404 体都带上了 `spec` + `specVersion`。
11. §2 的包结构树同步补上新增文件（本 SPEC 的 §2 是 1.0 原文，1.1 的新增项在 §13 表与 §13 开头的「现状」框里，两处都要对得上）。**已做**：§2 的树已改成 1.1 的实际产出，`SKILL.md` 那一行也改掉了（1.1 起是生成物）。
12. `tools/platform-artifacts.js`（**已存在，不是新写**，第 6 条说的七项产物它已经在产）按 §13 收口，五处，**五处全部已做**：
    ① `toolName(id, action)` = `<id>_<action>`、`-` 换 `_`，包级 `tools.*.json`、套件级 `tools.*.json`、`openapi.operationId`、`gateway.js` 的 `/tools/call` **四处共用同一个函数**（`gateway.js` 里那份是内联的同源实现，自测第 9、10 项拿套件表里的第一个名字真打一次 `/tools/call` 验它认得出来）；
    ② `references/` 补了 `conventions.md`，实现了新能力的包补 `conversation.md` / `documents.md`（`actions.md` / `data.md` / `platforms.md` / `engineering.md` 四个现有文件名不动）。
      能力判定优先读 `manifest.features`（§9.2）；清单还没写 `features` 时按动作名兜底（有 `brief`+`suggest`+`ask` 算对话，有 `parse-document`/`ingest-document` 算摄入），免得生成器与映射表落地不同步时少产两篇；
    ③ `mcpManifest()` 的 `transport` 是对象形态，`mcpServers.<id>.args` 用 `<包的绝对路径>/adapters/mcp.js`；`tools[].description` 与 `adapters/mcp.js` 的 `tools()` 用同一个拼法，两边逐项对得上；
    ④ `openapi()` 的 `servers[0].url` 改 `http://127.0.0.1:8711`，`platformsMd()` 改教 `node adapters/http.js`（换端口只能 `PORT=9000 node adapters/http.js`，它不读命令行参数）；
      另：`Envelope` 补 `specVersion` 与 `meta.family` / `meta.mutatesPath`，`Error` 单列成 schema，实现了对话 / 摄入的包再给 `Answer` / `Block` / `Act`（摄入的另给 `Doc`）；
    ⑤ **决定：写**。`license`（默认 `UNLICENSED`）与 `metadata`（id / version / spec / specVersion / suite / kind / credits / offline / deterministic，全部取自 `manifest.json`）都由 `skillMd()` 生成，
      §13.9 的 `metadata.version` 随之改回**必查**（§13.1 同步改了）。理由：这几项本来就在 `manifest.json` 里，写进前言零成本，平台不读也不受影响，读了就能在装载期一眼看出版本与积分口径。
    此外 `SKILL.md` 正文按 §13.1 收成四段（能力一句话 / 怎么调 / 有哪些动作 / 口径与边界），原先的动作全表、数据集段、注意事项段一律并进 `references/`，正文从 ~60 行降到 ~47 行，远在 200 行以内。
13. `describeFor()` 拼出来的 description 现在会出现连着两个句号（`summary` 自带句号，模板又补一个），生成物里肉眼可见，顺手修。**已修**：拼之前逐段走一遍 `noDot()` 去掉句末的句号与空白，再统一补一个。

14. 各包 `README.md`（模板在生成器里）：目录树补齐 1.1 的新增项，六种接入形态后面补一段「对话与文档怎么接」，调用契约的信封示例补 `specVersion` 与 `meta.family` / `meta.mutatesPath`。**已做**（与 §14.4 第 4 条是同一件事）。

### 14.3 映射表与源 skill

1. `tools/skills.map.json`：**8 个产品包**各补 6 个动作条目 —— `screens` / `brief` / `suggest` / `ask` / `parse-document` / `ingest-document`。3 个计算包按需，可先不补。**已做。**
   动作总数：127 → **176**。原先写的是 175（127 + 8 × 6），少算了一条 —— 1.1 期间 AI法务 另补了一条真业务动作 `apply-all-high`（批量采纳高风险项），它不属于对话也不属于摄入，所以是 127 + 48 + 1 = **176**。**原有 127 个一个不动**（实测：与 1.0 的产物逐动作比 `data`，两边都有的 143 条逐字节相同，0 处不一致）。
   `parse-document` 也**写进映射表**，不由生成器合成：§11.1 给的就是一段 map 条目原文（`on: 'docparse'` / `fn: 'parse'` / 平铺的 `name` · `base64`），动作名、描述、schema、示例都在一处，`tools/unify-skills.js` 回写 SKILL.md 前言的 `actions` 计数才对得上。生成器 1.0 时那段自己合成同名条目的代码已删（不删清单里会出现两条同名动作）。
   `ingest` 改名成 `ingest-document`（它不在冻结的 127 条里，是 1.1 期间新增的三条）：实测改名前后返回值逐字节相同。
2. 每个产品包新增 `screens` 静态清单（写进 map，生成器透传进 manifest）。**已做**，并在自测里断言 `manifest.screens` 与 `screens` 动作的返回值逐字节一致（§10.1）。
   另外每个产品包在 map 上登记一段包级 `features`（`act` / `blocks` 两张表），生成器合进 `manifest.features`（§9.2）——
   这两张表是「本包实际会吐出哪几种」，生成器从源码推不出来，值由实跑扫一遍 + 内核里的 block 构造点核一遍，双向确认。
3. 共用件 `skills/_shared/docparse.js`（**已落地**：ES5、UMD、全同步、自带 RFC 1951 inflate 与 base64 / UTF-8 解码，不碰 `File` / `FileReader` / `DecompressionStream`）。
   **§11.2 的 8 MB 闸门与 §11.3 的截断表已落地，但不在共用件里，在通用包 `parse-document` 动作的边界上**（生成物 `shared/doc-gate.js`，Node 入口与浏览器单文件共用同一份）：
   解析器一截断、一设限，展台原型对大文件的行为就被改掉了（现场 2 MB / 55000 行的 xlsx 必须解全），所以共用件一个字不动 —— 直接调它拿到的永远是全量 Doc。
   闸门做三件事：按 base64 的有效字符数换算原始字节，超 8 MB 直接回 `{ ok:false, note }`（不进解析，信封仍是 `ok:true`）；解析照常跑全量，返回前按 §11.3 的上限表裁一遍并标 `truncated`；其余原样透传。
   还差两件：补一组文档 golden（形态见 §14.4 第 2 条）；`.eml` 非 UTF-8 正文那处借宿主 `TextDecoder` 的分支要么固定成一种行为，要么明确排除出 golden（§11.2「字符集」一行 —— 现有样本已刻意避开这一支）。
4. ~~每个产品包新增 `skills/<模块>/core/chat.js`~~：**不做。对话五个函数（`screens` / `brief` / `suggest` / `ask` / `ingest`）直接写在各自的主内核文件里**（如 `skills/06-ai-cfo/core/fin.js`），从 `prototype/src/module-04..11.js` 的对话大脑下沉，`blocks` 改纯数据、`act` 改声明式、`onDoc` 改 `ingest`。**8 个产品包已全部落地。**
   理由与 §14.2 第 2 条是同一条：对话逻辑与业务算法共用大量内部函数，拆成两个文件要么重复实现一遍要么互相 `require`；而内核是 UMD、要能被 `singleFile()` 原样内联进浏览器单文件，跨文件依赖还得靠生成器再内联一次，得不偿失。
   连带：这五个动作条目都不写 `on`（默认宿主就是 kernel），`modules` 机制照旧实现，但 1.1 只有 `docparse` 一个宿主在用。
5. 源 `SKILL.md` 前言：`universal: dus-1` → `universal: dus-1.1`，`actions` 数字更新（8 个产品包落地后是 lead 21 / hr 22 / cfo 17 / legal 22 / process 21 / decision 19 / erp 17 / dev 22；3 个计算包 4 / 6 / 5 不变）；正文补一节「对话与文档」。
6. `tools/verify-skills.js` / `tools/unify-skills.js`：认得 `dus-1.1` 与新增的动作家族。
7. **`step` 按 §10 一律选填（1.1 收口）。** 映射表里 8 个产品包 × 4 个动作（`brief` / `suggest` / `ask` / `ingest-document`）原先把 `step` 标成 `required: true`，
   与 §10.2 / §10.3 / §10.4 / §11.4 的「必填：否」「不传 = 首屏」直接冲突，还顺着 `manifest.input.required` 进了 `tools.openai.json` / `tools.anthropic.json` / `openapi.json`，
   等于逼模型每次猜一个 `step`。现已把 `args[].required` 与 `inputProps[].required` 两边共 64 处去掉；内核补的是退化路径而不是报错：
   `brief` / `suggest` 头上一行 `if (!step) step = SCREENS[0]…`（不传 = 首屏），`ask` 保持「没有屏上下文」（AI ERP / AI决策那两处 `!isStep(step) → null` 的硬闸门改成只挡「给了不认识的屏」）。
   实测：8 个包各跑一次不传 `step` 的 `brief` / `suggest` / `ask` / `ingest-document`，32 次全是 `ok:true`，`manifest.input.required` 里也不再有 `step`。
8. **包级 `features.act` 跟着实跑改（1.1 收口）。** 它是「本包实际会吐出哪几种」，改了内核就要跟着核一遍：
   AI获客的两处 `apply` 都是指回 `ingest` 自己的，按 §12 改掉之后本包已不产 `apply` → `act` 去掉 `apply`；
   ai法务的合同摄入改吐 `focus` → `act` 补上 `focus`。核法：实跑扫一遍所有对话 / 摄入返回值 + 内核里的 `type: '…'` 构造点静态数一遍，两头对齐。
9. **源 `SKILL.md` 的 act 表跟着 §12 改口径（1.1 收口）。** 8 份源说明书里 `{type:'apply', action, input}` 那一行原先写的是内核导出名、并注明「动作名用内核导出名」，
   现在一律改成通用包动作名，并写清「平台执行前按清单名比，三道校验任一不过就整条忽略」；摄入那一段也改成「`data` 按 `mutatesPath` 存回，`act` 是 `focus` / `goto`」。

### 14.4 自测与文档

1. `tests/conformance.js` 模板增四项：
   - 对话 golden：固定 `(step, question, dataset)` 跑 `brief` / `suggest` / `ask`，四条路径逐字节一致。
   - **suggest 回灌**：`suggest` 的每一条丢给 `ask`，必须都不为 `null`。
   - 文档 golden：`examples/docs/*.b64`（每种 kind 一份小样本）跑 `parse-document`，Doc 逐字节一致。
   - 摄入状态流转：`parse-document` → `ingest-document` → 按 `mutatesPath` 从返回值里取出新业务数据，回传 `run`，且包内样本未被污染。
     **现有那条状态流转用例挑不到它**：它按 `a.mutates && args 里有 $data` 选动作，而 `ingest-document` 按 §9.2 写 `mutates:false`。要另写一条按 `mutatesPath` 取数的用例。

   **已落地（1.1）的一项：「对话与摄入合规」**（生成器 `tools/build-universal.js` 的 `conformance()` 模板，实现了对话的包自动带上）。
   一次把四件事扫完 —— 逐数据集 × 逐屏（外加「不传 step」一轮）跑 `brief` / `suggest` / 每条 suggest 回灌 `ask`，再拿清单里的例子跑两次 `ingest-document`：

   - `blocks` 每一项必须是带合法 `type` 的对象（§10.6，专治数组里留 `null`）；
   - `act` 必须是词表里的五种之一，`apply.action` 必须在 `manifest.actions` 里、`family` 是 `core`、且不等于当前这个动作名（§12 的平台三道校验，skill 侧先自查）；
   - `suggest` 回灌 `ask` 不得为 `null`（带 `step` 的那一路，同屏口径见 §10.3）；
   - 不传 `step` 时 `brief` / `suggest` / `ask` / `ingest-document` 仍是 `ok:true`，且 `input.required` 里没有 `step`（§10.2）。

   实测（2026.09）：8 个产品包共 662 条回答逐条查过，blocks / act 违规 0；suggest 回灌 `ask` 676 条全接住；负向验过两次（故意把 `apply-fix` 写回导出名、故意让 `kvB` 返回 `null`，两次都当场报出来）。
2. `examples/docs/` 新增六份小样本（word / excel / ppt / pdf / eml / text），每份 ≤ 64 KB。
   **存成 `.json`（`{ "name": "…", "base64": "…" }`），不要存成裸 `.b64`** —— 自测里展开样例的 `resolveEx()` 对 `$file` 是 `JSON.parse(readFileSync(...))`，裸 base64 文本会当场抛 JSON 解析错。
   `.eml` 那份别用非 UTF-8 字符集（§11.2「字符集」一行：那一处结果随宿主而异，进不了逐字节比对）。
3. `universal/README.md`：目录分工表补共用件与对话内核，迁移检查清单补 1.1 的几项（**本次已改**）。
4. 各包 `README.md` 模板：六种接入形态后面补一段「对话与文档怎么接」。
5. 回归门槛（不达标不发版）：
   - 现有 127 个动作的 golden **逐字节不变**。这里的 golden 指内核输出 `examples/*.output.json`，不是信封 —— 信封会多出新字段，见下一条。
   - `node dist-universal/register-all.js` 11 行全部版本一致。
   - 老调用方（只认 `spec === 'dus-1'`、不认 `specVersion`）跑一遍 `run` / `health`：**老字段一个不少、值一模一样**。
     注意这不是「整份信封逐字节不变」—— §14.1 第 1、4、7 条会让信封多出 `specVersion` 与 `meta.family` / `meta.mutatesPath`，`health()` 多出 `specVersion` / `features` / `screens` / `modules`。
     1.1 的兼容承诺是**只增不改**：新增字段一律可选、老字段值不变、`spec` 仍是 `"dus-1"`。要求「逐字节不变」与 §14.1 直接冲突，做不到。
