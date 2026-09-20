# 通用 Skill 规范 · DUS-1

**DUS = DGG Universal Skill。** 一个 DUS 包是一份**自带数据、无第三方依赖、确定性、可离线**的能力单元，同一份包可以直接跑在 Node、浏览器、命令行、HTTP 服务、MCP 客户端以及自研 agent 平台（AI OS）上。

本规范只约定「包长什么样」与「怎么调用」，不约定宿主平台如何编排。把 11 个模块按本规范产出后，迁移到任何平台只需要写一个薄适配层（本仓库已内置四种）。

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
