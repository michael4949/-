/*
 * 跨平台适配物生成器
 * ------------------------------------------------------------
 * 通用包除了六种接入路径（Node CJS / Node ESM / 浏览器 UMD / CLI / HTTP / MCP），
 * 还要能被各家 agent 平台直接认出来。这里为每个包再生成一组「平台适配物」：
 *
 *   SKILL.md               Agent Skills 标准形态（YAML 前言只要 name + description，正文渐进披露）
 *   references/*.md        动作清单 / 数据字典 / 接入路径 / 工程口径原文（按需加载，不进上下文）
 *   scripts/skill.js       给 agent 用 bash 直接跑的一行入口
 *   tools.openai.json      OpenAI 函数调用 schema 数组
 *   tools.anthropic.json   Anthropic tools 格式
 *   manifest.mcp.json      MCP 服务器声明（含工具清单）
 *   openapi.json           HTTP 形态的 OpenAPI 3.1
 *   llms.txt               给模型看的一页速览
 *
 * Agent Skills 的字段约束（按官方规范）：
 *   name        ≤ 64 字符，只能小写字母 / 数字 / 连字符，不得含 XML 标签，不得含保留词
 *   description 非空、≤ 1024 字符，不得含 XML 标签，必须同时写清「做什么」和「什么时候用」
 *   正文        建议 5k token 以内，细节放 references/，由 agent 按需读
 *
 * 注意：源 skill 的 SKILL.md 前言（name / id / credits / actions …）是本仓库的工程契约，
 * 与通用包里这份给 agent 平台读的 SKILL.md 不是一回事，后者只留 name + description 两个字段，
 * 工程口径原文整份搬到 references/engineering.md。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const W = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const WJ = (p, o) => W(p, JSON.stringify(o, null, 2) + '\n');

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
/* 工具名：OpenAI / Anthropic 都要求 ^[a-zA-Z0-9_-]{1,64}$ */
function toolName(prefix, action) {
  const n = (prefix ? prefix + '__' : '') + action;
  return n.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/* ---------- description：做什么 + 什么时候用 ---------- */
function describeFor(manifest) {
  const acts = manifest.actions || [];
  const titles = acts.slice(0, 6).map((a) => a.title || a.name).join('、');
  const tags = (manifest.tags || []).slice(0, 10).join('、');
  const parts = [];
  parts.push(manifest.summary || manifest.name);
  parts.push('共 ' + acts.length + ' 个动作，含' + titles + '等');
  if (tags) parts.push('当用户提到' + tags + '这类话题，或要对这些数据做测算、核对、排期、出报告时使用');
  parts.push('纯规则计算，结果确定、可离线、零网络请求；写回类动作返回新的业务数据副本，请存回会话状态再传给下一次调用');
  return safeText(parts.join('。') + '。', 1024);
}

/* ---------- SKILL.md（Agent Skills 形态） ---------- */
function skillMd(manifest, opt) {
  const id = manifest.id;
  const acts = manifest.actions || [];
  const ds = manifest.datasets || [];
  const mut = acts.filter((a) => a.mutates);
  const lines = [];
  lines.push('---');
  lines.push('name: ' + safeName(id));
  lines.push('description: ' + describeFor(manifest));
  lines.push('---');
  lines.push('');
  lines.push('# ' + manifest.name);
  lines.push('');
  lines.push(manifest.summary || '');
  lines.push('');
  lines.push('本包自带全部规则表与样例数据，**不联网、不读写外部文件、不依赖任何第三方库**，同一组入参永远得到同一份结果。');
  lines.push('');
  lines.push('## 怎么调');
  lines.push('');
  lines.push('装了 Node 18+ 时，一行就能跑：');
  lines.push('');
  lines.push('```bash');
  lines.push('node scripts/skill.js <动作名> \'<JSON 入参>\'');
  lines.push('node scripts/skill.js describe            # 看全部动作与入参');
  if (ds.length) lines.push("node scripts/skill.js run '{\"dataset\":\"" + ds[0].key + "\"}'   # 用预置数据集跑一遍");
  lines.push('```');
  lines.push('');
  lines.push('结果是一个信封：`{ ok, spec, skill, action, data, errors, meta }`。`ok` 为 false 时看 `errors[].code`：');
  lines.push('`E_ACTION` 动作名不对 · `E_INPUT` 入参缺或类型不对 · `E_DATASET` 数据集名不对 · `E_KERNEL` 规则判定不通过 · `E_RUNTIME` 执行出错。');
  lines.push('');
  if (ds.length) {
    lines.push('## 预置数据集');
    lines.push('');
    ds.forEach((d) => lines.push('- `' + d.key + '` — ' + safeText(d.label, 160)));
    lines.push('');
    lines.push('首次调用传 `{"dataset":"' + ds[0].key + '"}`；之后把上一次返回里的业务数据原样回传成 `{"data": …}`。');
    lines.push('');
  }
  if (mut.length) {
    lines.push('## 会改数据的动作');
    lines.push('');
    lines.push('这些动作返回**新的业务数据副本**，不会改你传进去的那份。请把副本存回会话状态，下一次调用传 `data` 而不是 `dataset`，否则改动会丢：');
    lines.push('');
    mut.forEach((a) => lines.push('- `' + a.name + '` — ' + safeText(a.title || a.description, 80)));
    lines.push('');
  }
  lines.push('## 动作一览');
  lines.push('');
  lines.push('| 动作 | 作用 | 会改数据 |');
  lines.push('|---|---|---|');
  acts.forEach((a) => lines.push('| `' + a.name + '` | ' + safeText(a.title || a.description, 60) + ' | ' + (a.mutates ? '是' : '否') + ' |'));
  lines.push('');
  lines.push('每个动作的完整入参与返回见 [references/actions.md](references/actions.md)，要用的时候再读。');
  lines.push('');
  lines.push('## 还有这些可以查');
  lines.push('');
  lines.push('- [references/actions.md](references/actions.md) — 每个动作的入参 JSON Schema、返回结构、可运行样例');
  lines.push('- [references/data.md](references/data.md) — 自带的规则表与样例数据字典');
  lines.push('- [references/platforms.md](references/platforms.md) — 六种接入路径（Node / 浏览器 / CLI / HTTP / MCP / 自研平台）怎么接');
  lines.push('- [references/engineering.md](references/engineering.md) — 工程口径原文：算法、参数、判定阈值、样本怎么来的');
  lines.push('');
  lines.push('## 用的时候注意');
  lines.push('');
  lines.push('- 金额类结果一律是「预计」口径，按公开规则简化计算，不作为申报或对外承诺的依据。');
  lines.push('- 参考区间来自政企服务中接触到的常见范围，不是统计调查数据。');
  lines.push('- 结果里的企业、客户、员工都用代号，不含真实个人信息。');
  if (opt && opt.note) { lines.push(''); lines.push(opt.note); }
  lines.push('');
  return lines.join('\n');
}

/* ---------- references ---------- */
function actionsMd(manifest) {
  const lines = ['# ' + manifest.name + ' · 动作清单', '',
    '共 ' + (manifest.actions || []).length + ' 个动作。入参一律是一个 JSON 对象；返回是 DUS 信封，业务结果在 `data` 里。', ''];
  (manifest.actions || []).forEach((a) => {
    lines.push('## `' + a.name + '`　' + (a.title || ''));
    lines.push('');
    lines.push('- 类型：' + (a.kind || 'compute') + (a.mutates ? '　**会返回新的业务数据副本，请存回会话状态**' : ''));
    lines.push('- 说明：' + (a.description || ''));
    lines.push('- 返回：`' + (a.returns || '') + '`');
    lines.push('');
    lines.push('入参 JSON Schema：');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(a.input || { type: 'object' }, null, 2));
    lines.push('```');
    lines.push('');
    if (a.example && Object.keys(a.example).length) {
      lines.push('可运行样例：');
      lines.push('');
      lines.push('```bash');
      lines.push("node scripts/skill.js " + a.name + " '" + JSON.stringify(a.example) + "'");
      lines.push('```');
      lines.push('');
    }
  });
  return lines.join('\n');
}

function dataMd(manifest, info) {
  const lines = ['# ' + manifest.name + ' · 数据字典', '',
    '本包自带的全部数据都在 `bundle/` 下，运行时不读任何外部文件。', '',
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
  if ((manifest.runtime && manifest.runtime.kernelDeps || []).length) {
    lines.push('## 依赖的兄弟引擎');
    lines.push('');
    manifest.runtime.kernelDeps.forEach((d) => lines.push('- `' + d.key + '` ← `' + d.from + '`，已随包内联到 `' + d.path + '`'));
    lines.push('');
  }
  return lines.join('\n');
}

function platformsMd(manifest) {
  const id = manifest.id;
  return [
    '# ' + manifest.name + ' · 接入路径',
    '',
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
    'node adapters/http.js 8787',
    "curl -s localhost:8787/actions/describe -d '{}'",
    '```',
    '',
    '接口定义见同目录的 `openapi.json`（OpenAPI 3.1），可直接导进网关或 SDK 生成器。',
    '',
    '## 6. MCP（stdio）',
    '',
    '```json',
    JSON.stringify({ mcpServers: { [id]: { command: 'node', args: ['<包路径>/adapters/mcp.js'] } } }, null, 2),
    '```',
    '',
    '完整声明见 `manifest.mcp.json`。',
    '',
    '## 接进各家 agent 平台',
    '',
    '| 平台 | 怎么接 | 注意 |',
    '|---|---|---|',
    '| Claude Code | 整个目录放进 `~/.claude/skills/` 或项目的 `.claude/skills/` | 目录名即技能名，改名请同步改 `SKILL.md` 的 `name` |',
    '| claude.ai | 打成 zip 从「设置 → 功能」上传 | 需要账号开启代码执行 |',
    '| Claude API | 走 `/v1/skills` 上传，配合代码执行工具使用 | 沙箱无网络、不能装包；本包零依赖、纯离线，正好满足；需要容器内有 Node 18+ |',
    '| OpenAI 兼容的函数调用 | 直接用 `tools.openai.json` | 工具名已按 `^[a-zA-Z0-9_-]{1,64}$` 处理过 |',
    '| Anthropic Messages API | 直接用 `tools.anthropic.json` | 同上 |',
    '| 任意 MCP 宿主 | 用 `manifest.mcp.json` | 不依赖任何 MCP SDK |',
    '| 自研 agent 平台 | `adapters/aios.js` 的 `descriptor()` / `register(host)` | 或直接用 `index.js` 的 `invoke` |',
    '',
    '> 如果目标容器里没有 Node，就在容器外起 HTTP 网关或 MCP 服务，容器内只发请求。',
    '',
  ].join('\n');
}

/* ---------- 工具 schema ---------- */
function openaiTools(manifest, prefix) {
  return (manifest.actions || []).map((a) => ({
    type: 'function',
    function: {
      name: toolName(prefix, a.name),
      description: safeText((a.title ? a.title + '：' : '') + (a.description || '') + (a.mutates ? '（返回新的业务数据副本，请存回会话状态）' : ''), 1024),
      parameters: a.input && a.input.type ? a.input : { type: 'object', properties: {}, additionalProperties: true }
    }
  }));
}
function anthropicTools(manifest, prefix) {
  return (manifest.actions || []).map((a) => ({
    name: toolName(prefix, a.name),
    description: safeText((a.title ? a.title + '：' : '') + (a.description || '') + (a.mutates ? '（返回新的业务数据副本，请存回会话状态）' : ''), 1024),
    input_schema: a.input && a.input.type ? a.input : { type: 'object', properties: {}, additionalProperties: true }
  }));
}
function mcpManifest(manifest) {
  const id = manifest.id;
  return {
    name: id,
    version: manifest.version,
    description: describeFor(manifest),
    transport: 'stdio',
    mcpServers: { [id]: { command: 'node', args: ['adapters/mcp.js'], env: {} } },
    protocolVersion: '2024-11-05',
    capabilities: { tools: { listChanged: false } },
    tools: (manifest.actions || []).map((a) => ({
      name: a.name,
      description: safeText((a.title ? a.title + '：' : '') + (a.description || ''), 1024),
      inputSchema: a.input && a.input.type ? a.input : { type: 'object', properties: {}, additionalProperties: true }
    }))
  };
}
function openapi(manifest) {
  const paths = {
    '/health': { get: { summary: '自检', responses: { 200: { description: '信封', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } } } } } },
    '/manifest': { get: { summary: '取清单', responses: { 200: { description: '清单' } } } },
    '/actions': { get: { summary: '列动作', responses: { 200: { description: '动作数组' } } } },
    '/invoke': { post: { summary: '按名调动作', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { action: { type: 'string' }, input: { type: 'object' } }, required: ['action'] } } } }, responses: { 200: { description: '信封', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } } } } } }
  };
  (manifest.actions || []).forEach((a) => {
    paths['/actions/' + a.name] = {
      post: {
        summary: a.title || a.name,
        description: safeText(a.description || '', 600) + (a.mutates ? '　返回新的业务数据副本，请存回会话状态。' : ''),
        operationId: toolName('', a.name),
        requestBody: { required: false, content: { 'application/json': { schema: a.input && a.input.type ? a.input : { type: 'object' } } } },
        responses: { 200: { description: '信封', content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } } } }
      }
    };
  });
  return {
    openapi: '3.1.0',
    info: { title: manifest.name, version: manifest.version, description: safeText(manifest.summary, 900) },
    servers: [{ url: 'http://localhost:8787', description: 'node adapters/http.js 8787' }],
    paths,
    components: {
      schemas: {
        Envelope: {
          type: 'object',
          required: ['ok', 'spec', 'skill', 'action', 'data', 'errors', 'meta'],
          properties: {
            ok: { type: 'boolean' },
            spec: { type: 'string' },
            skill: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, version: { type: 'string' } } },
            action: { type: 'string' },
            data: { description: '业务结果；ok 为 false 时为 null' },
            errors: { type: 'array', items: { type: 'object', properties: { code: { type: 'string', enum: ['E_ACTION', 'E_INPUT', 'E_DATASET', 'E_KERNEL', 'E_RUNTIME'] }, message: { type: 'string' }, path: { type: 'string' } } } },
            meta: { type: 'object', properties: { credits: { type: 'number' }, kind: { type: 'string' }, mutates: { type: 'boolean' }, deterministic: { type: 'boolean' }, offline: { type: 'boolean' } } }
          }
        }
      }
    }
  };
}
function llmsTxt(manifest) {
  const acts = manifest.actions || [];
  const ds = manifest.datasets || [];
  return [
    '# ' + manifest.name + '（' + manifest.id + ' v' + manifest.version + '）',
    '',
    '> ' + (manifest.summary || ''),
    '',
    '纯规则计算，结果确定、可离线、零网络请求、零第三方依赖。属于「' + manifest.suite.name + ' ' + manifest.suite.version + '」套件。',
    '',
    '## 一行开跑',
    '',
    "node scripts/skill.js run '" + JSON.stringify(ds.length ? { dataset: ds[0].key } : {}) + "'",
    '',
    '## 动作（' + acts.length + '）',
    '',
    ...acts.map((a) => '- ' + a.name + (a.mutates ? '（写回）' : '') + '：' + safeText(a.title || a.description, 70)),
    '',
    '## 预置数据集（' + ds.length + '）',
    '',
    ...ds.map((d) => '- ' + d.key + '：' + safeText(d.label, 90)),
    '',
    '## 约定',
    '',
    '- 入参一律一个 JSON 对象；返回一律是信封 {ok, spec, skill, action, data, errors, meta}。',
    '- 写回类动作返回新的业务数据副本，要存回会话状态，下次传 data 而不是 dataset，否则改动会丢。',
    '- 金额一律「预计」口径；参考区间是常见范围而非统计调查；企业与人员均为代号。',
    '',
    '## 细节',
    '',
    '- SKILL.md：怎么用（Agent Skills 形态）',
    '- references/actions.md：每个动作的入参 Schema 与样例',
    '- references/data.md：数据字典',
    '- references/platforms.md：六种接入路径与各家 agent 平台怎么接',
    '- references/engineering.md：工程口径原文',
    '',
  ].join('\n');
}

/* ---------- 入口：为一个包生成全部适配物 ---------- */
function emit(out, manifest, opt) {
  opt = opt || {};
  const id = manifest.id;

  /* 工程口径原文挪到 references/，根目录的 SKILL.md 换成 Agent Skills 形态 */
  if (opt.sourceMd) W(path.join(out, 'references', 'engineering.md'), opt.sourceMd);
  W(path.join(out, 'SKILL.md'), skillMd(manifest, opt));
  W(path.join(out, 'references', 'actions.md'), actionsMd(manifest));
  W(path.join(out, 'references', 'data.md'), dataMd(manifest, opt));
  W(path.join(out, 'references', 'platforms.md'), platformsMd(manifest));

  /* 给 agent 用 bash 直接跑的一行入口 */
  W(path.join(out, 'scripts', 'skill.js'), [
    '#!/usr/bin/env node',
    '/* ' + manifest.name + ' · 一行入口：node scripts/skill.js <动作名> \'<JSON>\'（等价于 adapters/cli.js） */',
    "'use strict';",
    "require(require('path').join(__dirname, '..', 'adapters', 'cli.js'));",
    ''
  ].join('\n'));
  try { fs.chmodSync(path.join(out, 'scripts', 'skill.js'), 0o755); } catch (e) { /* 忽略 */ }

  WJ(path.join(out, 'tools.openai.json'), openaiTools(manifest, ''));
  WJ(path.join(out, 'tools.anthropic.json'), anthropicTools(manifest, ''));
  WJ(path.join(out, 'manifest.mcp.json'), mcpManifest(manifest));
  WJ(path.join(out, 'openapi.json'), openapi(manifest));
  W(path.join(out, 'llms.txt'), llmsTxt(manifest));

  return {
    skillName: safeName(id),
    files: ['SKILL.md', 'references/engineering.md', 'references/actions.md', 'references/data.md',
      'references/platforms.md', 'scripts/skill.js', 'tools.openai.json', 'tools.anthropic.json',
      'manifest.mcp.json', 'openapi.json', 'llms.txt']
  };
}

module.exports = { emit, openaiTools, anthropicTools, mcpManifest, openapi, llmsTxt, skillMd, safeName, safeText, toolName, describeFor };
