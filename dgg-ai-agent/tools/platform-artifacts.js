/*
 * 跨平台产物生成器（DUS-1.1 · SPEC §13）
 * ------------------------------------------------------------
 * 通用包除了六种接入路径（Node CJS / Node ESM / 浏览器 UMD / CLI / HTTP / MCP），
 * 还要能被各家 agent 平台直接认出来。这里为每个包生成 SPEC §13 定死的七项产物：
 *
 *   SKILL.md               Agent Skills 标准形态（前言 name/description/license/metadata，正文 ≤ 200 行、只四段）
 *   references/*.md        第二层细节，agent 要的时候才读（§13.3 的七个文件名，后三个按能力产）
 *   tools.openai.json      OpenAI 及兼容协议的函数调用 schema 数组
 *   tools.anthropic.json   Anthropic tools 格式
 *   manifest.mcp.json      MCP 服务器声明（含工具清单，与 adapters/mcp.js 的 tools/list 逐项一致）
 *   openapi.json           HTTP 形态的 OpenAPI 3.1，描述 adapters/http.js 已有的路由
 *   llms.txt               给模型看的一页速览（≤ 8 KB）
 *
 * 另产两件配套物（不在七项之内，§13 的「现状」框里列着）：
 *   scripts/skill.js       给 agent 用 bash 直接跑的一行入口
 *   tools/openai-tools.json  1.0 就有的老路径，保留为 tools.openai.json 的别名，内容逐字一致（§14.2 第 8 条）
 *
 * 七项全部由 manifest.json 一份真相生成，**不得手改**；一致性自测见 tools/verify-artifacts.js（§13.9）。
 *
 * 工具名口径（§13.4）：`<id>_<action>`，连字符换下划线。四处共用下面这一个 toolName()：
 *   包级 tools.*.json · 包级 openapi.json 的 operationId · 套件级 tools.*.json · gateway.js 的 /tools/call 解析。
 *
 * 注意：源 skill 的 SKILL.md 前言（name / id / credits / actions …）是本仓库的工程契约，
 * 与通用包里这份给 agent 平台读的 SKILL.md 不是一回事（§13.2），
 * 工程口径原文整份搬到 references/engineering.md。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const W = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const WJ = (p, o) => W(p, JSON.stringify(o, null, 2) + '\n');

/* 协议族固定是 dus-1（§9.1：spec 是协议族标识，不是版本号），版本单列在 specVersion */
const SPEC = 'dus-1';
const DEFAULT_SPEC_VERSION = '1.1';
const specVersionOf = (m) => String(m.specVersion || DEFAULT_SPEC_VERSION);

/* ---------- Agent Skills 字段合法化 ---------- */
const RESERVED = ['anthropic', 'claude'];
function safeName(id) {
  let n = String(id).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  RESERVED.forEach((w) => { n = n.split(w).join('').replace(/--+/g, '-').replace(/^-+|-+$/g, ''); });
  return n || 'skill';
}
function safeText(s, max) {
  let t = String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (t.length > max) t = t.slice(0, max - 1) + '…';
  return t;
}
/* 句末去重：summary 自带句号时不要再补一个（§14.2 第 13 条） */
const noDot = (s) => String(s == null ? '' : s).replace(/[。\s]+$/, '');

/* YAML 标量：普通情况原样写，含 ": " / 首字符是 YAML 记号等情况退回双引号（JSON 字符串是合法的 YAML 双引号标量） */
function yamlStr(s) {
  const t = String(s == null ? '' : s);
  if (!t) return "''";
  if (t.indexOf('\n') < 0 && !/^[\s"'&*?|>%@`#[\]{},!-]/.test(t) && !/:(\s|$)/.test(t) && !/\s#/.test(t) && !/[\s]$/.test(t)) return t;
  return JSON.stringify(t);
}

/* 工具名（§13.4）：<id>_<action>，连字符换下划线，匹配 ^[a-zA-Z0-9_-]{1,64}$ */
function toolName(id, action) {
  const n = (id ? String(id) + '_' + String(action) : String(action)).replace(/-/g, '_');
  return n.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/* ---------- 能力判定（§9.2 features；清单没写就按动作名兜底，免得生成器与映射表落地不同步） ---------- */
function featuresOf(manifest) {
  const f = manifest.features || {};
  const has = {};
  (manifest.actions || []).forEach((a) => { has[a.name] = true; });
  const conversation = f.conversation === true || !!(has.brief && has.suggest && has.ask);
  const ingest = f.ingest === true || !!(has['parse-document'] || has['ingest-document']);
  return { conversation: conversation, ingest: ingest };
}
/* 动作按家族分组：core 是业务动作，conversation / ingest 是 1.1 新增的两族 */
function familyOf(a) {
  if (a.family) return a.family;
  if (a.name === 'screens' || a.name === 'brief' || a.name === 'suggest' || a.name === 'ask') return 'conversation';
  if (a.name === 'parse-document' || a.name === 'ingest-document' || a.name === 'ingest') return 'ingest';
  return 'core';
}
/* 本包实际产出哪几篇 references（§13.3） */
function referenceFiles(manifest) {
  const ft = featuresOf(manifest);
  const out = ['actions.md', 'data.md', 'platforms.md', 'engineering.md', 'conventions.md'];
  if (ft.conversation) out.push('conversation.md');
  if (ft.ingest) out.push('documents.md');
  return out;
}

/* 第一个能当例子的业务动作与它的入参 */
function demoAction(manifest) {
  const acts = manifest.actions || [];
  const run = acts.filter((a) => a.name === 'run')[0];
  const a = run || acts.filter((x) => familyOf(x) === 'core')[0] || acts[0] || { name: 'describe' };
  const ds = manifest.datasets || [];
  const input = a.example && Object.keys(a.example).length ? a.example : (ds.length ? { dataset: ds[0].key } : {});
  return { name: a.name, input: input, json: JSON.stringify(input) };
}

/* 例子里的 $action / $dataset / $file 是自测展开用的指令，不是字面量：
 * 带它们的例子照抄进正文是跑不通的（运行时会把 {"$action":…} 当成一个普通对象传给内核） */
function hasDirective(ex) { return /"\$(action|dataset|file)"/.test(JSON.stringify(ex == null ? {} : ex)); }

/* ask 的可运行例子：优先用清单里那一份（它带 step），带展开指令或没有就按首屏拼一份。
 * step 虽然不是必填（§10.4：不传 = 没有屏上下文），但正文教的命令要教「站在某一屏问」的正常用法 */
function askExample(manifest) {
  const a = (manifest.actions || []).filter((x) => x.name === 'ask')[0];
  const ds = manifest.datasets || [];
  const sc = manifest.screens || [];
  const src = a && a.example ? a.example : {};
  if (src.question && !hasDirective(src)) return src;
  const ex = { question: src.question || '怎么回事' };
  if (src.step) ex.step = src.step; else if (sc.length) ex.step = sc[0].key;
  if (ds.length) ex.dataset = ds[0].key;
  return ex;
}

/* ---------- description：做什么 + 什么时候用 ---------- */
function describeFor(manifest) {
  const acts = manifest.actions || [];
  const ft = featuresOf(manifest);
  const titles = acts.filter((a) => familyOf(a) === 'core').slice(0, 6).map((a) => a.title || a.name).join('、');
  const tags = (manifest.tags || []).slice(0, 10).join('、');
  const parts = [];
  parts.push(manifest.summary || manifest.name);
  parts.push('共 ' + acts.length + ' 个动作，含' + titles + '等');
  if (ft.conversation || ft.ingest) {
    const cap = [];
    if (ft.conversation) cap.push('对话（brief 进屏一条真数据发现 / suggest 建议问句 / ask 问什么答什么）');
    if (ft.ingest) cap.push('文档摄入（本机解析 Word/Excel/PPT/PDF/邮件再用到业务上）');
    parts.push('另带' + cap.join('与'));
  }
  if (tags) parts.push('当用户提到' + tags + '这类话题，或要对这些数据做测算、核对、排期、出报告时使用');
  parts.push('纯规则计算，结果确定、可离线、零网络请求；写回类动作返回新的业务数据副本，请存回会话状态再传给下一次调用');
  return safeText(parts.map(noDot).filter(Boolean).join('。') + '。', 1024);
}

/* ---------- SKILL.md（§13.1：前言四字段，正文 ≤ 200 行、只四段） ---------- */
function skillMd(manifest, opt) {
  const id = manifest.id;
  const acts = manifest.actions || [];
  const ds = manifest.datasets || [];
  const ft = featuresOf(manifest);
  const mut = acts.filter((a) => a.mutates || a.mutatesPath);
  const core = acts.filter((a) => familyOf(a) === 'core');
  const demo = demoAction(manifest);
  const suite = manifest.suite || {};
  const L = [];

  /* 前言：name / description 必填，license / metadata 可选（§13.1 的表） */
  L.push('---');
  L.push('name: ' + safeName(id));
  L.push('description: ' + yamlStr(describeFor(manifest)));
  L.push('license: ' + ((manifest.license && yamlStr(manifest.license)) || 'UNLICENSED'));
  L.push('metadata:');
  L.push('  id: ' + yamlStr(id));
  L.push('  version: ' + yamlStr(manifest.version));
  L.push('  spec: ' + SPEC);
  L.push('  specVersion: ' + JSON.stringify(specVersionOf(manifest)));
  L.push('  suite: ' + yamlStr([suite.name, suite.version].filter(Boolean).join(' ')));
  L.push('  kind: ' + yamlStr(manifest.kind || 'product'));
  L.push('  credits: ' + (manifest.credits == null ? 0 : manifest.credits));
  L.push('  offline: true');
  L.push('  deterministic: true');
  L.push('---');
  L.push('');

  /* 一段：能力一句话 */
  L.push('# ' + manifest.name);
  L.push('');
  L.push(noDot(manifest.summary || '') + '。');
  L.push('');
  L.push('本包自带全部规则表与样例数据，**不联网、不读写外部文件、不依赖任何第三方库**，同一组入参永远得到同一份结果。');
  L.push('');

  /* 二段：怎么调（三行代码） */
  L.push('## 怎么调');
  L.push('');
  L.push('```bash');
  L.push('node scripts/skill.js ' + demo.name + " '" + demo.json + "'" + (ds.length ? '   # 用预置数据集跑一遍' : ''));
  L.push('node scripts/skill.js describe            # 看全部动作与入参');
  if (ft.conversation) {
    L.push('node scripts/skill.js ask \'' + JSON.stringify(askExample(manifest)) + '\'   # 问什么答什么，答不上返回 null');
  }
  L.push('```');
  L.push('');
  L.push('Node：`require(\'./index.js\').invoke(\'' + demo.name + '\', ' + JSON.stringify(demo.input) + ')`，**同步**返回信封：');
  L.push('`{ ok, spec: "' + SPEC + '", specVersion: "' + specVersionOf(manifest) + '", skill, action, data, errors, meta }`。');
  if (ds.length) {
    L.push('');
    L.push('预置数据集 ' + ds.length + ' 套：' + ds.map((d) => '`' + d.key + '`').join(' · ')
      + '。首次调用传 `{"dataset":"' + ds[0].key + '"}`，之后把上一次返回里的业务数据原样回传成 `{"data": …}`。');
  }
  L.push('');

  /* 三段：有哪些动作（指向 references/actions.md，不抄参数表） */
  L.push('## 有哪些动作');
  L.push('');
  const famNames = (fam) => acts.filter((a) => familyOf(a) === fam).map((a) => '`' + a.name + '`').join(' / ');
  const seg = [core.length + ' 个业务动作'];
  if (ft.conversation) seg.push(acts.filter((a) => familyOf(a) === 'conversation').length + ' 个对话动作（' + famNames('conversation') + '）');
  if (ft.ingest) seg.push(acts.filter((a) => familyOf(a) === 'ingest').length + ' 个文档动作（' + famNames('ingest') + '）');
  L.push('共 ' + acts.length + ' 个：' + seg.join(' + ') + '。');
  L.push('');
  L.push('常用的几个：' + core.slice(0, 6).map((a) => '`' + a.name + '`（' + safeText(a.title || a.name, 12) + '）').join('、') + '。');
  if (mut.length) {
    L.push('');
    L.push('其中 ' + mut.length + ' 个会**返回新的业务数据副本**（'
      + mut.slice(0, 8).map((a) => '`' + a.name + '`').join(' · ') + (mut.length > 8 ? ' …' : '')
      + '），请把副本存回会话状态，下一次传 `data` 而不是 `dataset`，否则改动会丢。');
  }
  L.push('');
  L.push('完整清单（入参 JSON Schema、返回结构、可复制的例子）见 [references/actions.md](references/actions.md)；机器可读的一份在 `manifest.json`。');
  L.push('');

  /* 四段：口径与边界（指向 references/） */
  L.push('## 口径与边界');
  L.push('');
  L.push('- 「今天」是数据包里的常量，不取系统时间；同一输入永远同一输出。');
  L.push('- 业务数据由调用方持有：带「改数据」标记的动作返回新副本，存回会话状态下次传回。');
  L.push('- 金额类结果一律是「预计」口径，按公开规则简化计算，不作为申报或对外承诺的依据；参考区间来自常见范围，不是统计调查数据；结果里的企业与人员都用代号。');
  L.push('- 出错只有五个码：`E_ACTION` 动作名不对 · `E_INPUT` 入参缺或类型不对 · `E_DATASET` 数据集名不对 · `E_KERNEL` 规则判定不通过 · `E_RUNTIME` 执行出错。');
  if (ft.conversation) L.push('- `brief` / `ask` 答不上时返回 `ok:true` + `data:null`，**这不是错误**，请走平台自己的兜底。');
  if (ft.ingest) L.push('- 文档解析不成功（老格式、超限、没有文字层）时信封仍是 `ok:true`，失败写在 `data.ok:false` 与 `data.note` 里。');
  L.push('');
  L.push('细节分篇放在 `references/`，要用的时候再读：');
  L.push('');
  L.push('- [references/conventions.md](references/conventions.md) — 算法口径、单位与取整、状态由谁持有、错误码、积分');
  L.push('- [references/data.md](references/data.md) — 自带的规则表与样例数据字典');
  L.push('- [references/platforms.md](references/platforms.md) — 六种接入路径与各家 agent 平台怎么接');
  if (ft.conversation) L.push('- [references/conversation.md](references/conversation.md) — 有哪几屏、每屏说什么、能答上哪些问题');
  if (ft.ingest) L.push('- [references/documents.md](references/documents.md) — 支持哪些文件、Doc 结构、本模块从文档里找什么');
  L.push('- [references/engineering.md](references/engineering.md) — 工程口径原文：算法、参数、判定阈值、样本怎么来的');
  if (opt && opt.note) { L.push(''); L.push(opt.note); }
  L.push('');
  return L.join('\n');
}

/* ---------- references/actions.md ---------- */
function actionsMd(manifest) {
  const acts = manifest.actions || [];
  const lines = ['# ' + manifest.name + ' · 动作清单', '',
    '这篇讲每个动作怎么调：类型、会不会改数据、入参 JSON Schema、返回什么、一个可复制的例子。',
    '共 ' + acts.length + ' 个动作。入参一律是一个 JSON 对象；返回是 DUS 信封，业务结果在 `data` 里。', ''];
  acts.forEach((a) => {
    const fam = familyOf(a);
    lines.push('## `' + a.name + '`　' + (a.title || ''));
    lines.push('');
    lines.push('- 类型：' + (a.kind || 'compute') + '　家族：' + fam
      + (a.mutates ? '　**会返回新的业务数据副本，请存回会话状态**' : '')
      + (a.mutatesPath ? '　**新业务数据在返回值的 `' + a.mutatesPath + '` 字段里，请存回会话状态**' : ''));
    lines.push('- 说明：' + (a.description || ''));
    lines.push('- 返回：`' + (a.returns || '') + '`');
    lines.push('');
    lines.push('入参 JSON Schema：');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(a.input || { type: 'object' }, null, 2));
    lines.push('```');
    lines.push('');
    if (a.example && Object.keys(a.example).length && !hasDirective(a.example)) {
      lines.push('可运行样例（原样复制就能跑）：');
      lines.push('');
      lines.push('```bash');
      lines.push('node scripts/skill.js ' + a.name + " '" + JSON.stringify(a.example) + "'");
      lines.push('```');
      lines.push('');
    } else if (a.example && Object.keys(a.example).length) {
      /* 这一类入参要先取别的动作的返回值，照抄跑不通，如实说明怎么填 */
      lines.push('入参样例（**不是字面量**：`{"$action":"run"}` = 先调一次 `run`、把它返回的 `data` 填到这里；'
        + '`{"$dataset":"make"}` = 取这套预置数据集；`{"$file":"…"}` = 读包内那个文件）：');
      lines.push('');
      lines.push('```jsonc');
      lines.push(JSON.stringify(a.example, null, 2));
      lines.push('```');
      lines.push('');
      lines.push('填好后存成 `in.json` 再跑：`node scripts/skill.js ' + a.name + ' --input in.json`（`--input -` 从标准输入读）。');
      lines.push('');
    }
  });
  return lines.join('\n');
}

/* ---------- references/data.md ---------- */
function dataMd(manifest, info) {
  const lines = ['# ' + manifest.name + ' · 数据字典', '',
    '这篇讲本包自带哪些数据：规则表与参数的键、预置数据集、依赖的兄弟引擎。',
    '全部数据都在 `bundle/` 下，运行时不读任何外部文件。', '',
    '## 规则表与参数（bundle/data.json）', ''];
  (info.dataKeys || []).forEach((k) => lines.push('- `' + k + '`'));
  lines.push('');
  lines.push('原始文件在 `data/` 下，共 ' + (info.dataFiles || 0) + ' 个；JSON Schema 在 `schema/` 下。');
  lines.push('');
  lines.push('## 预置数据集（bundle/datasets.json）');
  lines.push('');
  (manifest.datasets || []).forEach((d) => lines.push('- `' + d.key + '` — ' + d.label + (d.note ? '（' + d.note + '）' : '')));
  lines.push('');
  lines.push('调用时二选一：`{"dataset":"<key>"}` 从预置数据集起步，或 `{"data":{…}}` 传上一次返回的副本。');
  lines.push('');
  if (((manifest.runtime && manifest.runtime.kernelDeps) || []).length) {
    lines.push('## 依赖的兄弟引擎');
    lines.push('');
    manifest.runtime.kernelDeps.forEach((d) => lines.push('- `' + d.key + '` ← `' + d.from + '`，已随包内联到 `' + d.path + '`'));
    lines.push('');
  }
  return lines.join('\n');
}

/* ---------- references/platforms.md ---------- */
function platformsMd(manifest) {
  const id = manifest.id;
  const demo = demoAction(manifest);
  return [
    '# ' + manifest.name + ' · 接入路径',
    '',
    '这篇讲怎么把这个包接进各种宿主：六种接入形态的代码，以及各家 agent 平台各用哪一份产物。',
    '同一份内核，六种接法，结果逐字节一致（`tests/conformance.js` 每次构建都会比对）。',
    '',
    '## 1. Node（CommonJS）',
    '',
    '```js',
    "const skill = require('./index.js');",
    "const env = skill.invoke('describe');",
    '```',
    '',
    '## 2. Node（ESM）',
    '',
    '```js',
    "import { invoke, manifest } from './dist/" + id + ".mjs';",
    '```',
    '',
    '## 3. 浏览器（UMD，可 file:// 直接开）',
    '',
    '```html',
    '<script src="dist/' + id + '.umd.js"></script>',
    '<script>',
    "  const env = DGG.skills['" + id + "'].invoke('describe');",
    '</script>',
    '```',
    '',
    '## 4. 命令行',
    '',
    '```bash',
    'node adapters/cli.js <动作名> \'<JSON>\'      # 或 --input - 从标准输入读',
    'node scripts/skill.js <动作名> \'<JSON>\'     # 同一个入口的短名',
    '```',
    '',
    '## 5. HTTP',
    '',
    '```bash',
    'node adapters/http.js                        # 端口取 PORT，默认 8711；它不读命令行参数',
    'PORT=9000 node adapters/http.js              # 换端口只能用环境变量',
    "curl -s 127.0.0.1:8711/actions/" + demo.name + " -d '" + demo.json + "'",
    '```',
    '',
    '接口定义见同目录的 `openapi.json`（OpenAPI 3.1，`servers[0].url` 就是 `http://127.0.0.1:8711`），可直接导进网关或 SDK 生成器。',
    '',
    '## 6. MCP（stdio）',
    '',
    '```json',
    JSON.stringify({ mcpServers: { [id]: { command: 'node', args: ['<包的绝对路径>/adapters/mcp.js'] } } }, null, 2),
    '```',
    '',
    '完整声明见 `manifest.mcp.json`（`tools[].name` 就是动作名本身，MCP 服务器已经按 skill 分好了）。',
    '',
    '## 接进各家 agent 平台',
    '',
    '| 平台 | 怎么接 | 注意 |',
    '|---|---|---|',
    '| Claude Code | 整个目录放进 `~/.claude/skills/` 或项目的 `.claude/skills/` | 目录名即技能名，改名请同步改 `SKILL.md` 的 `name` |',
    '| claude.ai | 打成 zip 从「设置 → 功能」上传 | 需要账号开启代码执行 |',
    '| Claude API | 走 `/v1/skills` 上传，配合代码执行工具使用 | 沙箱无网络、不能装包；本包零依赖、纯离线，正好满足；需要容器内有 Node 18+ |',
    '| OpenAI 兼容的函数调用 | 直接用 `tools.openai.json` | 工具名是 `' + toolName(id, '<动作>') + '`（连字符换下划线），与 `openapi.json` 的 `operationId` 同一个口径 |',
    '| Anthropic Messages API | 直接用 `tools.anthropic.json` | 同上 |',
    '| 任意 MCP 宿主 | 用 `manifest.mcp.json` | 不依赖任何 MCP SDK |',
    '| 自研 agent 平台 | `adapters/aios.js` 的 `descriptor()` / `register(host)` | 或直接用 `index.js` 的 `invoke` |',
    '',
    '> 如果目标容器里没有 Node，就在容器外起 HTTP 网关或 MCP 服务，容器内只发请求。',
    '',
  ].join('\n');
}

/* ---------- references/conventions.md（§13.3：口径说明） ---------- */
function conventionsMd(manifest) {
  const acts = manifest.actions || [];
  const ft = featuresOf(manifest);
  const mut = acts.filter((a) => a.mutates);
  const mutPath = acts.filter((a) => a.mutatesPath);
  const ds = manifest.datasets || [];
  const L = ['# ' + manifest.name + ' · 口径与边界', '',
    '这篇讲这个包按什么口径算、结果怎么读、状态归谁管、出错怎么认。动作参数看 `actions.md`，字段含义看 `data.md`。', '',
    '## 算法口径', '',
    '- **纯规则、确定性、可离线**：不发网络请求、不读系统时间、不取随机数、不碰任何存储 API，也不调用大模型。',
    '- 同一组入参永远得到同一份结果，`tests/conformance.js` 每次构建都拿 golden 逐字节比对。',
    '- 「今天」是数据包里的常量（`bundle/data.json`），不取系统时间；换一套样本就换了一个「今天」。',
    '- 一切判定阈值、系数、区间都写在 `data/` 的规则表里，算法只读表不猜数；表的键见 `data.md`，原文见 `engineering.md`。', '',
    '## 单位与取整', '',
    '- 金额一律「预计」口径，按公开规则简化计算，**不作为申报或对外承诺的依据**。',
    '- 千分位、百分号、日期这类格式化由本包做完再返回，平台不要再加工一次。',
    '- 参考区间来自政企服务中接触到的常见范围，不是统计调查数据。',
    '- 结果里的企业、客户、员工一律用代号，不含真实个人信息。', ''];

  L.push('## 状态由调用方持有');
  L.push('');
  L.push('包本身**不存任何状态**。业务数据在调用方手里，每次调用二选一传进来：');
  L.push('');
  L.push('- `{"dataset":"<key>"}` —— 从预置数据集起步' + (ds.length ? '（' + ds.map((d) => '`' + d.key + '`').join(' / ') + '）' : ''));
  L.push('- `{"data":{…}}` —— 传上一次返回的业务数据副本');
  L.push('');
  if (mut.length) {
    L.push('这些动作 `mutates: true`，**整个 `data` 就是新的业务数据**，平台必须存回会话状态：');
    L.push('');
    mut.forEach((a) => L.push('- `' + a.name + '` — ' + safeText(a.title || a.description, 60)));
    L.push('');
  }
  if (mutPath.length) {
    L.push('这些动作按 `mutatesPath` 局部写回：`mutates` 是 `false`，新业务数据在返回值的指定字段里，该字段不存在就表示这次没改数：');
    L.push('');
    mutPath.forEach((a) => L.push('- `' + a.name + '` — 新数据在 `data.' + a.mutatesPath + '`'));
    L.push('');
    L.push('只认 1.0 的平台读到 `mutates: false`，会退化成「这次不写回」—— 用户最多白传一次，不会把整份回答错存成业务数据。');
    L.push('');
  }
  L.push('- 写回的永远是**新副本**，传进去的那份不会被改动。');
  L.push('- 不把文档原文、渲染结果塞进业务数据，只落结构化结果。');
  L.push('');

  L.push('## 错误码');
  L.push('');
  L.push('| 码 | 什么时候出 |');
  L.push('|---|---|');
  L.push('| `E_ACTION` | 动作名不在清单里 |');
  L.push('| `E_INPUT` | 必填入参缺失或类型不对 |');
  L.push('| `E_DATASET` | 预置数据集名不对 |');
  L.push('| `E_KERNEL` | 规则判定不通过（内核自己说 `ok:false`） |');
  L.push('| `E_RUNTIME` | 执行出错（函数不存在、内核抛异常） |');
  L.push('');
  L.push('错误信封形如 `{ ok:false, data:null, errors:[{ code, message, path? }] }`。');
  if (ft.conversation || ft.ingest) {
    L.push('');
    L.push('**「答不上」与「解析不成功」都不是错误**：');
    L.push('');
    if (ft.conversation) L.push('- `brief` / `ask` 接不住时返回 `ok:true` + `data:null`，`errors` 仍为空，平台按 `data === null` 走自己的兜底。');
    if (ft.ingest) L.push('- 文档解析失败或超限时信封仍是 `ok:true`，失败写在 Doc 自己身上：`data.ok:false` + `data.note`。只有缺 `name` / `base64` 才是 `E_INPUT`。');
  }
  L.push('');

  L.push('## 积分');
  L.push('');
  L.push('每次调用计 **' + (manifest.credits == null ? 0 : manifest.credits) + ' 积分**（信封 `meta.credits`），与动作无关，失败的调用也会带这个字段，是否真的扣费由平台决定。');
  L.push('');

  L.push('## 信封');
  L.push('');
  L.push('```jsonc');
  L.push('{ "ok": true, "spec": "' + SPEC + '", "specVersion": "' + specVersionOf(manifest) + '",   // spec 是协议族标识，不是版本号');
  L.push('  "skill": { "id": "' + manifest.id + '", "name": "' + manifest.name + '", "version": "' + manifest.version + '" },');
  L.push('  "action": "<动作名>", "data": {}, "errors": [],');
  L.push('  "meta": { "credits": ' + (manifest.credits == null ? 0 : manifest.credits) + ', "kind": "compute", "mutates": false,');
  L.push('            "deterministic": true, "offline": true, "family": "core", "mutatesPath": null } }');
  L.push('```');
  L.push('');
  L.push('- `spec` 永远是 `"' + SPEC + '"`；版本单列在 `specVersion`，缺省视为 `"1.0"`，它只自述、不参与任何判定的否决。');
  L.push('- 能力探测一律读 `manifest.features`，不要拿 `specVersion` 做大小比较，更不要靠动作名去猜。');
  L.push('');
  return L.join('\n');
}

/* ---------- references/conversation.md（§13.3：实现了对话的包才产） ---------- */
function conversationMd(manifest) {
  const acts = manifest.actions || [];
  const byName = {};
  acts.forEach((a) => { byName[a.name] = a; });
  const screens = manifest.screens || [];
  const L = ['# ' + manifest.name + ' · 对话怎么接', '',
    '这篇讲四个对话动作：有哪几屏、进屏主动说什么、建议用户问什么、能答上哪些问题。',
    '四个动作全是只读（`kind: query`、`mutates: false`）、**同步返回**、**纯规则**——不调用大模型，`ctx.llm` 给了也不用。', '',
    '## 屏 / 环节', ''];
  if (screens.length) {
    /* note 是可选的（§10.1）：一条都没有就不摆那一列空格子 */
    const hasNote = screens.some((s) => s.note);
    L.push(hasNote ? '| key | 名称 | 这屏干嘛 |' : '| key | 名称 |');
    L.push(hasNote ? '|---|---|---|' : '|---|---|');
    screens.forEach((s) => L.push('| `' + s.key + '` | ' + s.label + (hasNote ? ' | ' + (s.note || '') + ' |' : ' |')));
    L.push('');
    L.push('`screens` 动作的返回值与 `manifest.screens` 逐字节一致：读清单和调动作两条路结果一样。');
  } else {
    L.push('调 `screens` 动作拿屏清单：`[{ key, label, note? }]`。`key` 一旦发布就不改，平台拿它做路由、埋点与 `act.goto` 的目标。');
  }
  L.push('');
  L.push('所有带 `step` 入参的动作，`step` 的合法取值就是这些 `key`；传了不认识的 `step` **不报错**，按「没有屏上下文」处理。');
  L.push('');
  L.push('**`step` 是选填**（`manifest.actions[].input.required` 里没有它）：`brief` / `suggest` 不传就按**首屏**'
    + (screens.length ? '（`' + screens[0].key + '`）' : '') + '答，`ask` 不传就是没有屏上下文、只由全局分支接，`ingest-document` 不传照样摄入。');
  L.push('');

  const one = (name, title, body) => {
    const a = byName[name];
    L.push('## `' + name + '` —— ' + title);
    L.push('');
    if (a && a.description) L.push('- 本包的口径：' + a.description);
    body.forEach((x) => L.push(x));
    L.push('');
  };
  one('brief', '进屏时的一条真数据发现', [
    '- 入参：`{ step?, data | dataset }`；不传 `step` 按首屏。',
    '- 返回 Answer：`{ text, blocks?, act?, ref?, step? }`，**一句话、≤ 60 汉字**，至少含一个数字或一个业务 id，数字在 `run` 的结果里能找到出处。',
    '- 不讲解（「本屏可以查看订单详情」这类空话不算），答不上返回 `null`（信封 `ok:true` + `data:null`）。',
    '- 同一 `(step, data)` 必须给同一句。'
  ]);
  one('suggest', '2–4 条建议问句', [
    '- 入参：`{ step?, data | dataset }`，返回字符串数组，每条 ≤ 20 汉字，顺序固定。',
    '- **每一条都保证能被同包的 `ask` 答上**（回灌 `ask` 不返回 `null`），这是自测项。',
    '- 没有可建议的返回 `[]`，不返回 `null`。'
  ]);
  one('ask', '问什么答什么', [
    '- 入参：`{ question, step?, data | dataset }`；`question` 是用户原话，不做预处理。',
    '- **屏内问句先由本屏分支接**：站在下钻屏问「为什么」，答的是当前这一条，不跳走。',
    '- 匹配只用规则：关键词、业务 id、数字、屏内分支。**答不上就返回 `null`**，交平台兜底，不编数、不占位。',
    '- 同一 `(question, step, data)` 必须同一答。'
  ]);

  L.push('## Answer 长什么样');
  L.push('');
  L.push('```jsonc');
  L.push('{ "text": "必填，纯文本，\\n 分段；不含 HTML / Markdown 表格 / 颜色样式",');
  L.push('  "blocks": [],          // 可选，≤ 3 块');
  L.push('  "act": { },            // 可选，≤ 1 个');
  L.push('  "ref": "业务 id",      // 可选，本条指向哪条业务记录');
  L.push('  "step": "屏 key",      // 可选');
  L.push('  "source": ["取数出处"] // 可选，便于对账');
  L.push('}');
  L.push('```');
  L.push('');
  L.push('平台只渲染 `text` 也必须读得通 —— 这是底线，表格一律走 `blocks`。');
  L.push('');
  L.push('## blocks：六种，纯数据');
  L.push('');
  L.push('| type | 字段 | 上限 |');
  L.push('|---|---|---|');
  L.push('| `kv` | `rows: [[键, 值], …]`，`title?` | rows ≤ 8 |');
  L.push('| `table` | `head`，`rows`，`align?`，`title?` | head ≤ 5，rows ≤ 6 |');
  L.push('| `tags` | `items`，`tone?` | items ≤ 6 |');
  L.push('| `list` | `items`，`ordered?`，`title?` | items ≤ 8 |');
  L.push('| `metric` | `items: [{ label, value, unit?, sub?, tone? }]` | items ≤ 4 |');
  L.push('| `text` | `text` | ≤ 200 字 |');
  L.push('');
  L.push('单元格一律是字符串或数字，不是对象；`tone` 只有 `ok` / `warn` / `bad` / `info`；**未知 type 一律忽略且不得报错**（厂商扩展用 `x-` 前缀）。');
  L.push('');
  L.push('## act：五个词，纯数据');
  L.push('');
  L.push('| type | 字段 | 平台最小实现 |');
  L.push('|---|---|---|');
  L.push('| `goto` | `step` | 路由到该屏；`step` 不在屏清单里就忽略 |');
  L.push('| `focus` | `ref`，`step?` | 滚动到该记录并高亮；做不到就忽略 |');
  L.push('| `open` | `panel`，`ref?`，`step?` | 打开下钻面板；不认识就退化成 `focus` 或忽略 |');
  L.push('| `apply` | `action`，`input?` | 按 §5 调一次本 skill 的动作 |');
  L.push('| `set` | `path`，`value` | 按点号路径改业务数据后重算 |');
  L.push('');
  L.push('- 一条回答最多一个 `act`；`ref` 必须是业务 id，不是数组下标、不是 DOM 选择器。');
  L.push('- **防递归：由 `act` 触发的那次调用，其返回里的 `act` 只许呈现给用户，不许自动再执行**（深度上限固定为 1）。');
  L.push('- 平台执行 `apply` 前校验三条：动作在清单里、`family` 是 `core`、不是当前这次调用的动作名。任一不过就当未知 `act` 忽略。');
  L.push('- `act` 永远是**建议**不是命令，`apply` / `set` 这两种会改数的尤其应当先问用户。');
  L.push('');
  L.push('## 一次完整的对话');
  L.push('');
  L.push('```bash');
  L.push("node scripts/skill.js screens '{}'");
  L.push('node scripts/skill.js brief \'{"step":"' + (screens[0] ? screens[0].key : '<屏 key>') + '","dataset":"' + ((manifest.datasets || [])[0] ? manifest.datasets[0].key : '<数据集>') + '"}\'');
  L.push('node scripts/skill.js suggest \'{"step":"' + (screens[0] ? screens[0].key : '<屏 key>') + '","dataset":"' + ((manifest.datasets || [])[0] ? manifest.datasets[0].key : '<数据集>') + '"}\'');
  L.push('node scripts/skill.js ask \'{"question":"<把上一步的某一条原样抄进来>","step":"' + (screens[0] ? screens[0].key : '<屏 key>') + '","dataset":"' + ((manifest.datasets || [])[0] ? manifest.datasets[0].key : '<数据集>') + '"}\'');
  L.push('```');
  L.push('');
  return L.join('\n');
}

/* ---------- references/documents.md（§13.3：实现了摄入的包才产） ---------- */
function documentsMd(manifest) {
  const byName = {};
  (manifest.actions || []).forEach((a) => { byName[a.name] = a; });
  const ing = byName['ingest-document'] || byName.ingest;
  const ingName = ing ? ing.name : 'ingest-document';
  const ds = (manifest.datasets || [])[0];
  const L = ['# ' + manifest.name + ' · 文档摄入怎么接', '',
    '这篇讲两个文档动作：`parse-document` 把文件字节解析成平台中立的 Doc，`' + ingName + '` 把 Doc 用到本模块的业务上。',
    '解析全在本机同步完成：包内自带 RFC 1951 inflate 与 base64 / UTF-8 解码，不碰网络、不依赖 `FileReader` / `DecompressionStream`。', '',
    '## 支持的文件类型', '',
    '| kind | 扩展名 | 解出来的是 |',
    '|---|---|---|',
    '| `word` | `.docx` | `paragraphs` 逐段文字 + `tables` 正文表 |',
    '| `excel` | `.xlsx` / `.csv` | `sheets: [{ name, rows }]` |',
    '| `ppt` | `.pptx` | `slides: [{ no, title, lines }]` |',
    '| `pdf` | `.pdf` | `paragraphs` 文本块（扫描件没有文字层时 `text` 为空，`note` 会说明） |',
    '| `eml` | `.eml` | `mail: { from, to, cc, subject, date, attaches }` + 正文 |',
    '| `text` | 其它（含没有扩展名） | 按纯文本读 |', '',
    '- **只看扩展名**决定 kind，不嗅探内容。',
    '- `.doc` / `.xls` / `.ppt` 这些 Office 97 老格式解不了：返回 `ok:false` + `note` 让用户另存为新格式再传。', '',
    '## 怎么调（两步）', '',
    '```bash',
    '# 1 解析：入参平铺成 { name, base64 }，不要写成 { input: { … } }',
    'node scripts/skill.js parse-document \'{"name":"9月采购计划.xlsx","base64":"UEsDBB…"}\'',
    '# 2 摄入：把上一步的 Doc 原样传进来',
    'node scripts/skill.js ' + ingName + ' \'{"doc":{…},"step":"<屏 key>"' + (ds ? ',"dataset":"' + ds.key + '"' : '') + '}\'',
    '```', '',
    '- `base64` 是标准 RFC 4648 字母表、`=` 补齐，**不带 `data:` 前缀**，允许含换行与空白。',
    '- 平台也可以只解析不摄入（只想拿 `doc.text` 自己处理）。',
    '- `' + ingName + '` **只读 Doc 的字段，拿不到也不该拿原始字节**。', '',
    '## Doc 结构（摘要）', '',
    '```jsonc',
    '{ "ok": true, "kind": "excel", "name": "9月采购计划.xlsx", "ext": "xlsx",',
    '  "size": 20481, "sizeText": "20.0 KB",',
    '  "text": "全文纯文本，永远有，可能为空串",',
    '  "paragraphs": [], "tables": [], "sheets": [], "slides": [],   // 四个容器字段永远存在，用不上时是空数组',
    '  "mail": null,                                                 // 只有邮件才有，其余为 null',
    '  "stats": { "工作表": 2, "行": 186, "非空单元格": 903 },        // 中文键，键序按 kind 固定',
    '  "note": "" }                                                  // 解析说明 / 失败原因，正常时空串',
    '```', '',
    '- `tables` 是二维数组的数组（`string[][][]`），与 `sheets` / `slides` 的对象形态不一致，这是为了与共用件现行实现逐字一致。',
    '- **失败不抛异常**：返回 `{ ok:false, note:"原因" }`，其余字段给空值，**信封仍然是 `ok:true`** —— 解析不成功是业务事实，不是调用失败。', '',
    '## 大小上限与截断', '',
    '| 项 | 上限 |',
    '|---|---|',
    '| 原始字节 | 8 MB（base64 约 10.9 MB 字符）；超限不进解析，返回 `ok:false` + `note` |',
    '| `text` | 200,000 字符 |',
    '| `paragraphs` | 5,000 条，每条 2,000 字符 |',
    '| `sheets` | 20 张表；每表 2,000 行；每行 64 格；每格 512 字符 |',
    '| `tables` | 200 张；每表 500 行 |',
    '| `slides` | 200 页；每页 200 行 |',
    '| `mail.attaches` | 50 个文件名 |', '',
    '- 解析器本身跑全量、不截断；上限只加在 `parse-document` **动作的边界**上：超出的部分在返回前裁掉，并在 Doc 上置 `truncated` 标记说明哪些字段被裁过。',
    '- **超限与解析失败都不是调用失败**：信封仍然是 `ok:true`，失败写在 `data.ok:false` 与 `data.note` 里。只有缺 `name` / `base64` 才是 `E_INPUT`。', '',
    '## 本模块从文档里找什么', ''];
  if (ing && ing.description) { L.push(ing.description); L.push(''); }
  L.push('**认不出内容也必须有回应**：返回一句「这份文件里没有本模块用得上的数据：没有读到…」，说清读到了什么、为什么用不上，');
  L.push('**不返回 `null`** —— 用户刚上传了文件，沉默是最差的回应。');
  L.push('');
  if (ing && ing.mutatesPath) {
    L.push('摄入认出数据时会写回业务数据：`mutates` 是 `false`，新数据在返回值的 `' + ing.mutatesPath + '` 字段里（没有这个字段 = 这次没改数），平台取出来存回会话状态。');
    L.push('写回的是新副本，且只落结构化结果（识别出的行、金额、日期），**不把文档原文塞进业务数据**。');
    L.push('');
  }
  L.push('确定性：同一 `(doc, step, data)` 必须同一答。');
  L.push('');
  return L.join('\n');
}

/* ---------- 工具 schema（§13.4 / §13.5） ---------- */
const toolDesc = (a) => safeText((a.title ? a.title + '：' : '') + (a.description || '')
  + (a.mutates ? '（返回新的业务数据副本，请存回会话状态）' : '')
  + (a.mutatesPath ? '（新的业务数据在返回值的 ' + a.mutatesPath + ' 字段里，请存回会话状态）' : ''), 1024);
const inputSchema = (a) => (a.input && a.input.type ? a.input : { type: 'object', properties: {}, additionalProperties: true });

function openaiTools(manifest, prefix) {
  const id = prefix === undefined ? manifest.id : prefix;
  return (manifest.actions || []).map((a) => ({
    type: 'function',
    function: { name: toolName(id, a.name), description: toolDesc(a), parameters: inputSchema(a) }
  }));
}
function anthropicTools(manifest, prefix) {
  const id = prefix === undefined ? manifest.id : prefix;
  return (manifest.actions || []).map((a) => ({
    name: toolName(id, a.name), description: toolDesc(a), input_schema: inputSchema(a)
  }));
}

/* ---------- manifest.mcp.json（§13.6） ----------
 * tools[] 必须与 adapters/mcp.js 的 tools/list 返回值逐项一致 —— 那边是
 *   (a.title ? a.title + '：' : '') + a.description + (a.mutates ? '（…）' : '')
 * 不走 safeText，这里照抄同一个表达式，免得两边差一个空格就对不上。 */
function mcpManifest(manifest) {
  const id = manifest.id;
  return {
    name: id,
    version: manifest.version,
    description: describeFor(manifest),
    protocolVersion: '2024-11-05',
    transport: { type: 'stdio', command: 'node', args: ['adapters/mcp.js'] },
    capabilities: { tools: { listChanged: false } },
    tools: (manifest.actions || []).map((a) => ({
      name: a.name,
      description: (a.title ? a.title + '：' : '') + a.description + (a.mutates ? '（返回新的业务数据副本，请存回会话状态）' : ''),
      inputSchema: inputSchema(a)
    })),
    /* 给人直接粘进客户端配置的一段，路径留占位符 */
    mcpServers: { [id]: { command: 'node', args: ['<包的绝对路径>/adapters/mcp.js'], env: {} } }
  };
}

/* ---------- openapi.json（§13.7） ---------- */
function answerSchemas(manifest) {
  const ft = featuresOf(manifest);
  const out = {};
  if (!ft.conversation && !ft.ingest) return out;
  out.Block = {
    type: 'object',
    description: '平台中立的展示块（SPEC §10.6）：纯数据，七种 type，未知 type 一律忽略且不得报错（厂商扩展用 x- 前缀）。',
    required: ['type'],
    properties: {
      type: { enum: ['kv', 'table', 'tags', 'list', 'metric', 'text', 'chart'] },
      title: { type: 'string' },
      head: { type: 'array', maxItems: 5, items: { type: 'string' } },
      align: { type: 'array', items: { enum: ['l', 'c', 'r'] } },
      rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number'] } } },
      items: { type: 'array', description: 'tags / list 是字符串数组；metric 是 { label, value, unit?, sub?, tone? } 数组' },
      text: { type: 'string' },
      ordered: { type: 'boolean' },
      tone: { enum: ['ok', 'warn', 'bad', 'info'] },
      chart: { enum: ['column', 'bar', 'stack', 'line', 'area', 'donut', 'pie', 'funnel', 'gauge', 'radar', 'waterfall', 'progress', 'heat', 'scatter'], description: 'chart：图型（SPEC §10.6.1）；未知值按未知块型忽略' },
      unit: { type: 'string', description: 'chart：数值单位，跟在数字后面' },
      labels: { type: 'array', maxItems: 13, items: { type: 'string' }, description: 'chart：分类轴标签' },
      series: { type: 'array', maxItems: 3, description: 'chart：[{ name, data: [数…] }]；scatter 用 points: [[x, y]…]' },
      matrix: { type: 'array', description: 'chart heat：matrix[i][j] 对应 rows[i] × labels[j]' },
      total: { type: 'number', description: 'chart donut：环心数' },
      target: { type: 'number', description: 'chart gauge：目标线' },
      max: { type: 'number', description: 'chart gauge / radar / progress：轴上限' },
      value: { type: 'number', description: 'chart gauge：单值' },
      xLabel: { type: 'string' },
      yLabel: { type: 'string' },
      note: { type: 'string', description: 'chart：一句脚注，≤ 10 字' }
    }
  };
  out.Act = {
    type: 'object',
    description: '声明式动作词表（SPEC §12）：纯数据的建议，不是命令。平台可以只实现子集，未知 type 一律忽略。',
    required: ['type'],
    properties: {
      type: { enum: ['goto', 'focus', 'open', 'apply', 'set', 'click'] },
      step: { type: 'string', description: 'goto / focus / open：目标屏的 key' },
      ref: { type: 'string', description: 'focus / open：业务 id，不是数组下标' },
      panel: { type: 'string', description: 'open：面板名' },
      action: { type: 'string', description: 'apply：本 skill 的动作名，必须在 manifest.actions 里且 family 为 core' },
      input: { type: 'object', description: 'apply：调用入参' },
      path: { type: 'string', description: 'set：业务数据上的点号路径' },
      value: { description: 'set：JSON 标量或小对象（≤ 1 KB）' },
      aim: { type: 'string', description: 'click：按钮上写的字（前缀匹配）；没有界面的平台忽略' },
      note: { type: 'string', description: '给平台做 toast 或按钮文案，≤ 20 字' }
    }
  };
  out.Answer = {
    type: 'object',
    description: 'brief / ask / ingest-document 共用的回答结构（SPEC §10.5）。brief / ask 答不上时整个 data 为 null，信封仍是 ok:true。',
    required: ['text'],
    properties: {
      text: { type: 'string', description: '纯文本，\\n 分段；不含 HTML、Markdown 表格、颜色与样式' },
      blocks: { type: 'array', maxItems: 3, items: { $ref: '#/components/schemas/Block' } },
      act: { $ref: '#/components/schemas/Act' },
      ref: { type: 'string', description: '本条指向的业务记录 id' },
      step: { type: 'string', description: '本条属于哪一屏' },
      source: { type: 'array', items: { type: 'string' }, description: '取数出处，便于对账' },
      data: { type: 'object', description: '只有 ingest-document 会给：新的业务数据副本（见动作的 mutatesPath）；没有这个字段 = 这次没改数' }
    }
  };
  if (ft.ingest) {
    out.Doc = {
      type: 'object',
      description: 'parse-document 的返回（SPEC §11.3）：平台中立、可 JSON 序列化。解析不成功时 ok 为 false、note 写原因，信封仍是 ok:true。',
      required: ['ok', 'kind', 'name', 'ext', 'size', 'sizeText', 'text', 'paragraphs', 'tables', 'sheets', 'slides', 'mail', 'stats', 'note'],
      properties: {
        ok: { type: 'boolean' },
        kind: { enum: ['word', 'excel', 'ppt', 'pdf', 'eml', 'text'], description: '只由扩展名决定' },
        name: { type: 'string' },
        ext: { type: 'string' },
        size: { type: 'integer', description: '原始字节数' },
        sizeText: { type: 'string', description: '已格式化，平台直接显示' },
        text: { type: 'string', description: '全文纯文本，永远有，可能为空串' },
        paragraphs: { type: 'array', items: { type: 'string' } },
        tables: { type: 'array', description: '二维数组的数组：一张表一格', items: { type: 'array', items: { type: 'array', items: { type: 'string' } } } },
        sheets: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } } } } },
        slides: { type: 'array', items: { type: 'object', properties: { no: { type: 'integer' }, title: { type: 'string' }, lines: { type: 'array', items: { type: 'string' } } } } },
        mail: { type: ['object', 'null'], properties: { from: { type: 'string' }, to: { type: 'string' }, cc: { type: 'string' }, subject: { type: 'string' }, date: { type: 'string' }, attaches: { type: 'array', items: { type: 'string' } } } },
        stats: { type: 'object', description: '中文键，键序按 kind 固定' },
        note: { type: 'string', description: '解析说明 / 失败原因；正常时空串' },
        truncated: { type: 'object', description: '可选：哪些字段按上限裁过（SPEC §11.3 的上限表）' }
      }
    };
  }
  return out;
}

function openapi(manifest) {
  const id = manifest.id;
  const sv = specVersionOf(manifest);
  /* operationId 只给动作端点：它必须与 tools.openai.json 的函数名逐个对得上（§13.4 / §13.9），
   * 多给 /health 之类的端点安一个就会让两边的集合对不上。 */
  const paths = {
    '/health': { get: { summary: '自检', responses: { 200: { description: '信封', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } } } } } },
    '/manifest': { get: { summary: '机器可读清单', responses: { 200: { description: 'manifest.json' } } } },
    '/actions': { get: { summary: '动作列表', responses: { 200: { description: '动作数组' } } } }
  };
  (manifest.actions || []).forEach((a) => {
    paths['/actions/' + a.name] = {
      post: {
        summary: a.title || a.name,
        description: safeText(a.description || '', 600)
          + (a.mutates ? '　返回新的业务数据副本，请存回会话状态。' : '')
          + (a.mutatesPath ? '　新的业务数据在返回值的 ' + a.mutatesPath + ' 字段里，请存回会话状态。' : ''),
        operationId: toolName(id, a.name),
        requestBody: { required: false, content: { 'application/json': { schema: inputSchema(a) } } },
        responses: {
          200: { description: '信封', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } } },
          400: { description: 'ok:false 的信封', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } } }
        }
      }
    };
  });
  paths['/invoke'] = {
    post: {
      summary: '通用调用',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { action: { type: 'string' }, input: { type: 'object' } }, required: ['action'] } } } },
      responses: { 200: { description: '信封', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } } } }
    }
  };
  const schemas = {
    Envelope: {
      type: 'object',
      required: ['ok', 'spec', 'skill', 'action', 'data', 'errors', 'meta'],
      properties: {
        ok: { type: 'boolean' },
        spec: { const: SPEC, description: '协议族标识，不是版本号' },
        specVersion: { const: sv, description: '协议版本，缺省视为 1.0；只自述，不参与任何判定的否决' },
        skill: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, version: { type: 'string' } } },
        action: { type: 'string' },
        data: { description: '业务结果；ok 为 false 时为 null；答不上时为 null 但 ok 仍为 true' },
        errors: { type: 'array', items: { $ref: '#/components/schemas/Error' } },
        meta: {
          type: 'object',
          properties: {
            credits: { type: 'number' }, kind: { type: 'string' }, mutates: { type: 'boolean' },
            deterministic: { type: 'boolean' }, offline: { type: 'boolean' },
            family: { enum: ['core', 'conversation', 'ingest'] },
            mutatesPath: { type: ['string', 'null'], description: '有它 = 新业务数据在返回值的这个点号路径下' }
          }
        }
      }
    },
    Error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { enum: ['E_ACTION', 'E_INPUT', 'E_DATASET', 'E_KERNEL', 'E_RUNTIME'] },
        message: { type: 'string' },
        path: { type: 'string' }
      }
    }
  };
  const extra = answerSchemas(manifest);
  Object.keys(extra).forEach((k) => { schemas[k] = extra[k]; });
  return {
    openapi: '3.1.0',
    info: {
      title: manifest.name + ' · DUS-' + sv,
      version: manifest.version,
      description: safeText(noDot(manifest.summary) + '。纯规则、确定性、可离线。信封见 components.schemas.Envelope。', 900)
    },
    servers: [{ url: 'http://127.0.0.1:8711', description: 'node adapters/http.js（端口取 PORT，默认 8711，不读命令行参数）' }],
    paths: paths,
    components: { schemas: schemas }
  };
}

/* ---------- llms.txt（§13.8，≤ 8 KB） ---------- */
const LLMS_MAX = 8 * 1024;
function llmsTxt(manifest) {
  const acts = manifest.actions || [];
  const ds = manifest.datasets || [];
  const ft = featuresOf(manifest);
  const suite = manifest.suite || {};
  const sv = specVersionOf(manifest);
  const demo = demoAction(manifest);
  const pad = acts.reduce((n, a) => Math.max(n, a.name.length), 0) + 2;

  /* 动作行的说明会随包大小收紧，但**行数永远等于 actions.length**（§13.9 的自测要对得上） */
  function build(width) {
    const L = [];
    L.push('# ' + manifest.name + ' (' + manifest.id + ') v' + manifest.version
      + ' · ' + [suite.name, suite.version].filter(Boolean).join(' ') + ' · DUS-' + sv);
    L.push('');
    L.push(noDot(manifest.summary || '') + '。');
    L.push('纯规则 · 确定性（同输入同输出）· 可离线 · 不发网络请求 · 不读时间与随机数 · '
      + (manifest.credits == null ? 0 : manifest.credits) + ' 积分/次');
    L.push('');
    L.push('## 怎么调');
    L.push("CLI : node scripts/skill.js " + demo.name + " '" + demo.json + "'");
    L.push('Node: require(\'./index.js\').invoke(\'' + demo.name + '\', ' + JSON.stringify(demo.input) + ')');
    L.push('HTTP: POST http://127.0.0.1:8711/actions/' + demo.name + '  ' + demo.json);
    L.push('MCP : node adapters/mcp.js（stdio，工具名即动作名）');
    L.push('返回统一信封：{ ok, spec:"' + SPEC + '", specVersion:"' + sv + '", skill, action, data, errors, meta }');
    L.push('');
    L.push('## 动作（' + acts.length + '）');
    acts.forEach((a) => {
      let n = a.name; while (n.length < pad) n += ' ';
      L.push(n + safeText(a.title || a.description || '', width)
        + (a.mutates ? ' ← 返回新业务数据副本，存回会话状态' : '')
        + (a.mutatesPath ? ' ← 新业务数据在 data.' + a.mutatesPath + '，存回会话状态' : ''));
    });
    L.push('');
    if (ds.length) {
      L.push('## 预置数据集（' + ds.length + '）');
      ds.forEach((d) => L.push(d.key + ' ' + safeText(d.label, Math.max(20, width))));
      L.push('');
    }
    L.push('## 三条口径');
    L.push('1 业务数据由调用方持有：带 mutates / mutatesPath 的动作返回新副本，下次作为 data 传回。');
    L.push('2 「今天」是数据包里的常量，不取系统时间；同一输入永远同一输出。');
    L.push('3 错误只有 E_ACTION / E_INPUT / E_DATASET / E_KERNEL / E_RUNTIME；'
      + (ft.conversation ? '答不上返回 data:null 不是错误；' : '') + '失败也会带 meta.credits。');
    L.push('');
    L.push('## 细节');
    L.push('manifest.json · ' + referenceFiles(manifest).map((f) => 'references/' + f).join(' · '));
    L.push('');
    return L.join('\n');
  }

  let out = build(70);
  /* 超 8 KB 就收紧说明长度，动作一行都不少 */
  for (let w = 60; Buffer.byteLength(out, 'utf8') > LLMS_MAX && w >= 10; w -= 10) out = build(w);
  return out;
}

/* ---------- 入口：为一个包生成全部产物 ---------- */
function emit(out, manifest, opt) {
  opt = opt || {};
  const id = manifest.id;
  const ft = featuresOf(manifest);
  const files = [];
  const put = (rel, s) => { W(path.join(out, rel), s); files.push(rel); };
  const putJ = (rel, o) => { put(rel, JSON.stringify(o, null, 2) + '\n'); };

  /* 1 SKILL.md（§13.1）+ references（§13.3）。源 SKILL.md 原样搬到 references/engineering.md（§13.2） */
  put('SKILL.md', skillMd(manifest, opt));
  if (opt.sourceMd) put('references/engineering.md', opt.sourceMd);
  put('references/actions.md', actionsMd(manifest));
  put('references/data.md', dataMd(manifest, opt));
  put('references/platforms.md', platformsMd(manifest));
  put('references/conventions.md', conventionsMd(manifest));
  if (ft.conversation) put('references/conversation.md', conversationMd(manifest));
  if (ft.ingest) put('references/documents.md', documentsMd(manifest));

  /* 2 给 agent 用 bash 直接跑的一行入口 */
  put('scripts/skill.js', [
    '#!/usr/bin/env node',
    '/* ' + manifest.name + ' · 一行入口：node scripts/skill.js <动作名> \'<JSON>\'（等价于 adapters/cli.js） */',
    "'use strict';",
    "require(require('path').join(__dirname, '..', 'adapters', 'cli.js'));",
    ''
  ].join('\n'));
  try { fs.chmodSync(path.join(out, 'scripts', 'skill.js'), 0o755); } catch (e) { /* 忽略 */ }

  /* 3 四份机器可读产物 + 老路径别名（§14.2 第 8 条：内容逐字一致） */
  const oa = openaiTools(manifest, id);
  putJ('tools.openai.json', oa);
  putJ('tools/openai-tools.json', oa);
  putJ('tools.anthropic.json', anthropicTools(manifest, id));
  putJ('manifest.mcp.json', mcpManifest(manifest));
  putJ('openapi.json', openapi(manifest));
  put('llms.txt', llmsTxt(manifest));

  return { skillName: safeName(id), features: ft, files: files };
}

module.exports = {
  emit, openaiTools, anthropicTools, mcpManifest, openapi, llmsTxt, skillMd,
  actionsMd, dataMd, platformsMd, conventionsMd, conversationMd, documentsMd,
  safeName, safeText, toolName, describeFor, featuresOf, familyOf, referenceFiles,
  specVersionOf, SPEC, LLMS_MAX
};
