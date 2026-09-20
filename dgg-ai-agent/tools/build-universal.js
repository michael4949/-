/*
 * 通用 Skill 生成器 · DUS-1
 * ------------------------------------------------------------
 * 读 tools/skills.map.json（11 个 skill 的动作映射表）+ skills/<dir>（唯一真相），
 * 产出 dist-universal/<id>/ 一个自带数据、零依赖、可跨平台运行的通用包。
 *
 *   node tools/build-universal.js            全部 11 个
 *   node tools/build-universal.js ai-erp     只做一个
 *
 * 规范见 universal/SPEC.md。生成物不进仓库（.gitignore），随时可重建。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'skills');
const UNI = path.join(ROOT, 'universal');
const OUT = path.join(ROOT, 'dist-universal');
const MAP = require(path.join(__dirname, 'skills.map.json'));
const PA = require(path.join(__dirname, 'platform-artifacts.js'));   /* 跨平台适配物：Agent Skills / OpenAI / Anthropic / MCP / OpenAPI */
const SUITE = { name: '薯片AI智能体', version: '2026.09' };

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const R = (p) => fs.readFileSync(p, 'utf8');
const W = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const WJ = (p, o) => W(p, JSON.stringify(o, null, 2) + '\n');

function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  let n = 0;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) n += copyDir(a, b);
    else { fs.copyFileSync(a, b); n++; }
  }
  return n;
}

/* ---------- 依赖内核探测：有的内核要把兄弟内核当参数（如 AI流程提效 用 AI ERP 排程引擎）
 *            JSON 数据包装不下函数，所以要把那份内核也放进包里并在入口注入 ---------- */
function kernelDeps(srcDir) {
  const dir = path.join(srcDir, 'scripts');
  if (!fs.existsSync(dir)) return [];
  const re = /lib\.(\w+)\s*=\s*require\(path\.join\(__dirname,\s*'\.\.',\s*'\.\.',\s*'([0-9a-z-]+)',\s*'core',\s*'([a-z0-9.]+)'\)\)/g;
  const seen = {}, out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = R(path.join(dir, f));
    let m;
    while ((m = re.exec(src))) {
      if (seen[m[1]]) continue;
      seen[m[1]] = 1;
      out.push({ key: m[1], fromDir: m[2], file: m[3] });
    }
  }
  return out;
}

function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (v !== '' && !isNaN(Number(v))) v = Number(v);
    else if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
    out[k] = v;
  }
  return out;
}

/* ---------- 示例归一化：JSON 装不下的引用换成 $action / $file ---------- */
function normalizeExample(v, ctx) {
  if (Array.isArray(v)) return v.map((x) => normalizeExample(x, ctx));
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (v.$action || v.$dataset || v.$file) return v;      // 结构化引用原样带进清单，跑用例时再展开
    if (keys.length === 1 && keys[0] === '$ref') {
      const ref = String(v.$ref).replace(/^\.?\//, '');
      const abs = ref.indexOf('skills/') === 0 ? path.join(ROOT, ref) : path.join(ctx.srcDir, ref);
      const base = path.basename(abs);
      const m = base.match(/^(.+)\.output\.json$/);
      if (m) {
        const hit = (ctx.datasets || []).filter((d) => d.source === 'examples/' + m[1] + '.input.json')[0];
        if (hit) return { $action: 'run', input: { dataset: hit.key } };
      }
      if (fs.existsSync(abs)) {
        const rel = path.join('examples', '_fixtures', base);
        fs.mkdirSync(path.dirname(path.join(ctx.out, rel)), { recursive: true });
        fs.copyFileSync(abs, path.join(ctx.out, rel));
        return { $file: rel.split(path.sep).join('/') };
      }
      return null;
    }
    const o = {};
    keys.forEach((k) => { o[k] = normalizeExample(v[k], ctx); });
    return o;
  }
  return v;
}

/* ---------- 动作 → JSON Schema ---------- */
function inputSchema(a, datasets, kind) {
  const props = {}, required = [];
  (a.inputProps || []).forEach((p) => {
    props[p.name] = { type: p.type, description: p.description || '' };
    if (p.required) required.push(p.name);
  });
  const needsData = (a.args || []).some((x) => x.from === '$data');
  if (needsData) {
    props.data = { type: 'object', description: '当前业务数据（上一次调用返回的副本）。首次调用可改用 dataset' };
    props.dataset = { type: 'string', description: '预置数据集：' + datasets.map((d) => d.key).join(' / '), enum: datasets.map((d) => d.key) };
  } else if (kind === 'compute' && datasets.length) {
    props.dataset = { type: 'string', description: '预置样例输入：' + datasets.map((d) => d.key).join(' / '), enum: datasets.map((d) => d.key) };
  }
  return { type: 'object', properties: props, required, additionalProperties: true };
}

function hasIngest(m) { return (m.actions || []).some((a) => a.name === 'ingest'); }

function buildManifest(m, fm, datasets, exCtx) {
  const acts = (m.actions || []).map((a) => ({
    name: a.name,
    title: a.title,
    kind: a.kind,
    mutates: !!a.mutates,
    description: a.description,
    input: inputSchema(a, datasets, fm.kind === '计算' ? 'compute' : 'product'),
    returns: a.returns,
    fn: a.fn,
    args: a.args,
    inputProps: a.inputProps || [],
    example: normalizeExample(a.exampleInput || {}, exCtx)
  }));
  /* 摄入能力齐了就把共用解析挂成 parse-document：实现不在内核里，所以动作定义由生成器补 */
  if (hasIngest(m)) acts.push(parseDocumentAction(m));
  return {
    spec: 'dus-1',
    id: m.id,
    name: fm.name || m.moduleName,
    version: fm.version || m.version,      /* 版本以 SKILL.md 前言为准，内核 VERSION 与它一致（自检里会比对） */
    suite: SUITE,
    summary: m.summary,
    kind: fm.kind === '计算' ? 'compute' : 'product',
    credits: m.credits,
    tags: Array.isArray(fm.triggers) ? fm.triggers.slice(0, 12) : [],
    capabilities: {
      offline: true,
      deterministic: true,
      network: false,
      filesystem: false,
      llm: Number(fm.llm_calls) > 0 ? 'optional' : 'none',
      sideEffects: false
    },
    runtime: {
      engine: 'js',
      ecma: 'es5',
      entry: { require: 'index.js', import: 'dist/' + m.id + '.mjs', browser: 'dist/' + m.id + '.umd.js' },
      globalName: 'DGG.skills[\'' + m.id + '\']'
    },
    i18n: { default: 'zh-CN', available: ['zh-CN'] },
    datasets: datasets.map((d) => ({ key: d.key, label: d.label, note: d.note || '' })),
    actions: acts,
    legacy: { browserGlobal: m.legacyGlobal, sourceDir: 'skills/' + m.dir },
    agentSkill: { skillMd: 'SKILL.md', engineering: 'references/engineering.md', references: 'references/', entry: 'scripts/skill.js' },
    build: { spec: 'dus-1', generator: 'tools/build-universal.js' }
  };
}

/* ---------- 单文件打包（内核 + 运行时 + 数据 内联） ---------- */
/* ---------- parse-document 的边界闸门（SPEC §11.2 大小上限 / §11.3 截断表）----------
 * 共用件 skills/_shared/docparse.js 本身不做大小判断也不截断 —— 那会改变展台原型对大文件的行为，
 * 所以闸门只加在通用包的 parse-document 动作边界上，解析器一个字不动。
 * 产物写进包内 shared/doc-gate.js，Node 入口与浏览器单文件共用同一份。 */
function docGateSrc() {
  return `/*
 * parse-document 边界闸门 · 生成物，勿手改（tools/build-universal.js）
 * ------------------------------------------------------------------
 * 1) 大小上限：原始字节 > 8 MB 时不进解析，直接返回 { ok:false, note:'文件 x MB，超过 8 MB 上限' }。
 *    这不是调用失败，是业务事实；字节数只按 base64 字符数算，不先解码。
 * 2) 截断表：解析结果按 SPEC §11.3 的上限裁一遍，裁过的在 doc.truncated 上标出来
 *    （text / paragraphs / rows 三个键，只出现被裁的那几个）。
 * 3) 现行运行时（DUS-1.0）对任何带 ok:false 的内核返回值都翻成 E_KERNEL 信封、data 置 null，
 *    note 传不出去。所以失败的 Doc 这里多挂一个 errors 数组，让原因至少能从信封的 errors 里读到；
 *    运行时按 family 分家族透传之后（SPEC §14.1 第 9 条），这一处可以去掉。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.docGate = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_BYTES = 8 * 1024 * 1024;
  var LIM = { text: 200000, paragraphs: 5000, paragraph: 2000,
    sheets: 20, sheetRows: 2000, cells: 64, cell: 512,
    tables: 200, tableRows: 500, slides: 200, slideLines: 200, attaches: 50 };

  /* base64 字符数 → 原始字节数：每 4 个有效字符 3 字节，空白与 = 不计 */
  function b64size(s) {
    var body = /^data:/.test(s) ? s.slice(s.indexOf(',') + 1) : s;
    var n = 0, i, c;
    for (i = 0; i < body.length; i++) {
      c = body.charCodeAt(i);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47 || c === 45 || c === 95) n++;
    }
    return { body: body, size: Math.floor(n * 3 / 4) };
  }
  function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) : s; }

  function truncate(doc) {
    var t = {}, i, j, rows, row;
    if (typeof doc.text === 'string' && doc.text.length > LIM.text) { doc.text = doc.text.slice(0, LIM.text); t.text = true; }
    if (doc.paragraphs && doc.paragraphs.length) {
      if (doc.paragraphs.length > LIM.paragraphs) { doc.paragraphs = doc.paragraphs.slice(0, LIM.paragraphs); t.paragraphs = true; }
      for (i = 0; i < doc.paragraphs.length; i++) {
        if (String(doc.paragraphs[i]).length > LIM.paragraph) { doc.paragraphs[i] = clip(doc.paragraphs[i], LIM.paragraph); t.paragraphs = true; }
      }
    }
    if (doc.sheets && doc.sheets.length) {
      if (doc.sheets.length > LIM.sheets) { doc.sheets = doc.sheets.slice(0, LIM.sheets); t.rows = true; }
      for (i = 0; i < doc.sheets.length; i++) {
        rows = doc.sheets[i].rows || [];
        if (rows.length > LIM.sheetRows) { rows = rows.slice(0, LIM.sheetRows); t.rows = true; }
        for (j = 0; j < rows.length; j++) {
          row = rows[j] || [];
          if (row.length > LIM.cells) { row = row.slice(0, LIM.cells); t.rows = true; }
          for (var c0 = 0; c0 < row.length; c0++) if (String(row[c0]).length > LIM.cell) { row[c0] = clip(row[c0], LIM.cell); t.rows = true; }
          rows[j] = row;
        }
        doc.sheets[i].rows = rows;
      }
    }
    if (doc.tables && doc.tables.length) {
      if (doc.tables.length > LIM.tables) { doc.tables = doc.tables.slice(0, LIM.tables); t.rows = true; }
      for (i = 0; i < doc.tables.length; i++) {
        if ((doc.tables[i] || []).length > LIM.tableRows) { doc.tables[i] = doc.tables[i].slice(0, LIM.tableRows); t.rows = true; }
      }
    }
    if (doc.slides && doc.slides.length) {
      if (doc.slides.length > LIM.slides) { doc.slides = doc.slides.slice(0, LIM.slides); t.rows = true; }
      for (i = 0; i < doc.slides.length; i++) {
        if ((doc.slides[i].lines || []).length > LIM.slideLines) { doc.slides[i].lines = doc.slides[i].lines.slice(0, LIM.slideLines); t.rows = true; }
      }
    }
    if (doc.mail && doc.mail.attaches && doc.mail.attaches.length > LIM.attaches) { doc.mail.attaches = doc.mail.attaches.slice(0, LIM.attaches); t.rows = true; }
    for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) { doc.truncated = t; break; }
    return doc;
  }

  return function (docparse) {
    return function parseDocument(name, base64) {
      var nm = String(name == null ? '' : name);
      var m0 = /\\.([A-Za-z0-9]+)$/.exec(nm), ext = m0 ? m0[1].toLowerCase() : '';
      var b = b64size(String(base64 == null ? '' : base64));
      if (b.size > MAX_BYTES) {
        var note = '文件 ' + docparse.sizeText(b.size) + '，超过 8 MB 上限';
        return { ok: false, note: note, name: nm, size: b.size, sizeText: docparse.sizeText(b.size), ext: ext,
          kind: docparse.kindOf(nm), text: '', paragraphs: [], tables: [], sheets: [], slides: [], mail: null, stats: {},
          errors: [{ code: 'E_DOC', message: note }] };
      }
      var doc = docparse.parse({ name: nm, bytes: b.body });
      if (!doc.ok) doc.errors = [{ code: 'E_DOC', message: doc.note || '解析失败' }];
      return truncate(doc);
    };
  };
});
`;
}

/* parse-document：动作定义由生成器补，不进 skills.map.json ——
 * 它的实现不在各包内核里，而是共用解析件，各包内联一份（SPEC §11.1）。 */
function parseDocumentAction(m) {
  /* 例子直接用本包 ingest 例子里的那份文档：先 parse-document 拿 Doc，再喂给 ingest，两条例子首尾相接 */
  const dex = ((m.actions || []).filter((a) => a.name === 'ingest')[0] || {}).exampleInput || {};
  const d0 = dex.doc || {};
  const exName = typeof d0.name === 'string' && d0.name ? d0.name : '往来函件.txt';
  const exText = typeof d0.text === 'string' && d0.text ? d0.text : '甲方：\n乙方：\n事由：\n';
  return {
    name: 'parse-document',
    title: '解析文档',
    kind: 'compute',
    mutates: false,
    description: '把一份文件的字节解析成平台中立的 Doc：Word / Excel / PPT / PDF / 邮件 / 纯文本六类，全同步、零依赖、不碰网络与时钟。入参平铺成 { name, base64 }，name 只用扩展名判类型。原始字节超过 8 MB 或解析不成功时返回 { ok:false, note }（业务事实，不是调用失败）；超限与过大内容按上限表裁剪，裁过的在 truncated 上标出。产出的 Doc 直接喂给 ingest。',
    input: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '文件名，只用扩展名判类型：docx / xlsx / pptx / pdf / eml / txt / csv / md / json' },
        base64: { type: 'string', description: '文件字节的 base64（RFC 4648，可带换行，不带 data: 前缀），原始字节 ≤ 8 MB' }
      },
      required: ['name', 'base64'],
      additionalProperties: false
    },
    returns: '{ok, kind, name, ext, size, sizeText, text, paragraphs, tables, sheets, slides, mail, stats, note, truncated?}',
    fn: 'parseDocument',
    args: [{ from: 'name', required: true, note: '文件名' }, { from: 'base64', required: true, note: '文件字节的 base64' }],
    inputProps: [
      { name: 'name', type: 'string', required: true, description: '文件名，只用扩展名判类型' },
      { name: 'base64', type: 'string', required: true, description: '文件字节的 base64' }
    ],
    example: { name: exName, base64: Buffer.from(exText, 'utf8').toString('base64') }
  };
}

function singleFile(m, manifest, kernelSrc, runtimeSrc, lintSrc, data, datasets, format, deps, mods) {
  mods = mods || {};
  const body = [
    "  'use strict';",
    '  function _mod(fn) { var module = { exports: {} }; fn(module, module.exports); return module.exports; }',
    '  var core = _mod(function (module, exports) {',
    kernelSrc,
    '  });',
    ...(mods.docSrc ? [
      '  var docparse = _mod(function (module, exports) {',
      mods.docSrc,
      '  });',
      '  var makeGate = _mod(function (module, exports) {',
      mods.gateSrc,
      '  });',
      '  var kernel = {}; for (var _k in core) if (Object.prototype.hasOwnProperty.call(core, _k)) kernel[_k] = core[_k];',
      '  kernel.parseDocument = makeGate(docparse);'
    ] : ['  var kernel = core;']),
    '  var createSkill = _mod(function (module, exports) {',
    runtimeSrc,
    '  });',
    '  var makeLint = _mod(function (module, exports) {',
    lintSrc,
    '  });',
    '  var data = ' + JSON.stringify(data) + ';',
    '  var datasets = ' + JSON.stringify(datasets) + ';',
    '  var manifest = ' + JSON.stringify(manifest) + ';',
    ...(deps || []).map((d, i) => '  data.' + d.key + ' = _mod(function (module, exports) {\n' + d.src + '\n  });'),
    '  var helpers = data.lintWords ? { lint: makeLint(data.lintWords).hit } : {};',
    '  return createSkill({ manifest: manifest, kernel: kernel, data: data, datasets: datasets, helpers: helpers });'
  ].join('\n');

  const head = '/* ' + manifest.name + ' · ' + manifest.id + ' v' + manifest.version + ' · DUS-1 单文件包\n'
    + ' * 内核 + 数据 + 运行时全部内联；零依赖、离线、确定性。生成物，勿手改。\n'
    + ' * 浏览器： <script src="' + manifest.id + '.umd.js"></script> → DGG.skills[\'' + manifest.id + '\'].invoke(\'run\', { … })\n'
    + ' */\n';

  if (format === 'umd') {
    return head + [
      '(function (root, factory) {',
      "  if (typeof module === 'object' && module.exports) module.exports = factory();",
      "  else if (typeof define === 'function' && define.amd) define([], factory);",
      '  else { root.DGG = root.DGG || {}; root.DGG.skills = root.DGG.skills || {};',
      "    root.DGG.skills['" + manifest.id + "'] = factory(); }",
      "})(typeof self !== 'undefined' ? self : this, function () {",
      body,
      '});',
      ''
    ].join('\n');
  }
  return head + [
    'const skill = (function () {',
    body,
    '})();',
    'export default skill;',
    'export const manifest = skill.manifest;',
    'export const invoke = (action, input, ctx) => skill.invoke(action, input, ctx);',
    'export const listActions = () => skill.listActions();',
    'export const health = () => skill.health();',
    ''
  ].join('\n');
}

/* ---------- README ---------- */
function readme(m, manifest, datasets) {
  const id = m.id;
  const acts = manifest.actions.map((a) => '| `' + a.name + '` | ' + a.title + ' | ' + (a.mutates ? '是' : '否') + ' | ' + a.description + ' |').join('\n');
  const dsList = datasets.length ? datasets.map((d) => '`' + d.key + '`（' + d.label + '）').join('、') : '无';
  const runExample = JSON.stringify(manifest.actions.find((a) => a.name === 'run').example || {});
  return `# ${manifest.name} · 通用 Skill 包（DUS-1）

${manifest.summary}

| | |
|---|---|
| 包标识 | \`${id}\` |
| 版本 | ${manifest.version}（套件 ${SUITE.name} ${SUITE.version}） |
| 类型 | ${manifest.kind === 'compute' ? '计算类（一次算一份结果）' : '产品类（多屏交互，动作返回新数据副本）'} |
| 计费口径 | ${manifest.credits} 积分 / 次 |
| 依赖 | 无（零第三方依赖，ES5，离线可用，确定性） |
| 预置数据集 | ${dsList} |

## 动作

| 动作 | 名称 | 改数据 | 说明 |
|---|---|---|---|
${acts}

每个动作的参数表在 \`manifest.json\` 的 \`actions[].input\`（标准 JSON Schema），可直接转成表单或 function-calling 参数。

## 六种接入方式

**1 · Node（CommonJS）**
\`\`\`js
const skill = require('./${id}');
const env = skill.invoke('run', ${runExample});
console.log(env.ok, env.data);
\`\`\`

**2 · Node / 打包器（ESM）**
\`\`\`js
import skill, { invoke } from './${id}/dist/${id}.mjs';
const env = invoke('run', ${runExample});
\`\`\`

**3 · 浏览器（单文件，可 file:// 直接打开）**
\`\`\`html
<script src="dist/${id}.umd.js"></script>
<script>
  const env = DGG.skills['${id}'].invoke('run', ${runExample});
</script>
\`\`\`

**4 · 命令行（任何语言都能调）**
\`\`\`bash
node adapters/cli.js list
node adapters/cli.js run ${datasets.length ? '--dataset ' + datasets[0].key + ' ' : ''}--pretty
node adapters/cli.js run --input in.json --out out.json
\`\`\`

**5 · HTTP（Python / Java / Go 走这条）**
\`\`\`bash
PORT=8711 node adapters/http.js
curl -s localhost:8711/actions
curl -s -XPOST localhost:8711/actions/run -H 'content-type: application/json' -d '${runExample}'
\`\`\`

**6 · MCP（对话式宿主）**
\`\`\`json
{ "mcpServers": { "${id}": { "command": "node", "args": ["<包路径>/adapters/mcp.js"] } } }
\`\`\`

**自研平台（AI OS）**
\`\`\`js
const { register, descriptor } = require('./${id}/adapters/aios.js');
register(host);           // 或 platform.load(descriptor())
\`\`\`
\`adapters/aios.js\` 是唯一需要按平台改写的文件，改的只是字段名映射。

## 调用契约

\`invoke(action, input, ctx)\` 同步返回信封，永不抛异常：

\`\`\`jsonc
{ "ok": true, "spec": "dus-1",
  "skill": { "id": "${id}", "name": "${manifest.name}", "version": "${manifest.version}" },
  "action": "run", "data": { }, "errors": [],
  "meta": { "credits": ${manifest.credits}, "kind": "compute", "mutates": false, "deterministic": true, "offline": true } }
\`\`\`

${manifest.kind === 'product' ? `业务数据由调用方持有：带「改数据」标记的动作返回**新的数据副本**，平台需存回会话状态，下次调用作为 \`input.data\` 传回；首次调用用 \`input.dataset\` 指定预置数据集。\n` : ''}
错误码：\`E_ACTION\`（无此动作）· \`E_INPUT\`（输入不合法）· \`E_DATASET\`（数据集不存在）· \`E_KERNEL\`（内核判定不合法）· \`E_RUNTIME\`（内核异常）。

## 自测

\`\`\`bash
node tests/conformance.js      # CJS / ESM / 浏览器 UMD / CLI 四条路径同输入同输出，逐字节比对
\`\`\`

## 目录

\`\`\`
manifest.json        机器可读清单（平台读这一份）
index.js             Node 入口
core/                能力内核（唯一真相，与 skills/${m.dir} 逐字一致）
data/                规则表与样本（原样，便于人工核对）
bundle/data.json     预合并数据包（运行期用）
dist/                浏览器 UMD / ESM 单文件
adapters/            cli · http · mcp · aios
runtime/invoke.js    统一调用层（11 包同一份）
schema/              输入输出 JSON Schema
examples/            golden 基线
tests/conformance.js 跨形态一致性自测
SKILL.md             原 Claude Agent Skill 说明书（保留）
\`\`\`
`;
}

/* ---------- 一致性自测（模板，11 包通用） ---------- */
function conformance(id) {
  return `/* ${id} · 跨形态一致性自测（DUS-1）
 * 同一批输入分别经 CJS / ESM / 浏览器 UMD / CLI 调用，JSON 逐字节比对。
 *   node tests/conformance.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const ID = '${id}';

(async () => {
  const cjs = require(path.join(ROOT, 'index.js'));
  const esm = await import('file://' + path.join(ROOT, 'dist', ID + '.mjs'));
  const umdSrc = fs.readFileSync(path.join(ROOT, 'dist', ID + '.umd.js'), 'utf8');
  const fakeSelf = {};
  new Function('self', 'window', umdSrc).call(fakeSelf, fakeSelf, fakeSelf);
  const umd = fakeSelf.DGG.skills[ID];

  /* 示例里的 $action（用另一个动作的输出当入参）与 $file（大对象走文件）在这里展开 */
  function resolveEx(v) {
    if (Array.isArray(v)) return v.map(resolveEx);
    if (v && typeof v === 'object') {
      const ks = Object.keys(v);
      const pick = (o, p) => (p ? String(p).split('.').reduce((x, k) => (x == null ? x : x[k]), o) : o);
      if (v.$action) { const env = cjs.invoke(v.$action, resolveEx(v.input || {})); if (!env.ok) throw new Error('示例前置动作失败 ' + v.$action + ' ' + JSON.stringify(env.errors)); return pick(env.data, v.path); }
      if (v.$dataset) {
        let base = JSON.parse(JSON.stringify(cjs.datasets[v.$dataset]));
        if (v.ensure && cjs.kernel && typeof cjs.kernel.ensure === 'function') base = cjs.kernel.ensure(base, cjs.data);
        return pick(base, v.path);
      }
      if (ks.length === 1 && v.$file) return JSON.parse(fs.readFileSync(path.join(ROOT, v.$file), 'utf8'));
      const o = {}; ks.forEach((k) => { o[k] = resolveEx(v[k]); }); return o;
    }
    return v;
  }
  const cases = cjs.manifest.actions.map((a) => ({ action: a.name, input: resolveEx(a.example || {}) }));
  cases.unshift({ action: 'health', input: {} });
  let fail = 0, n = 0;
  for (const c of cases) {
    const a = JSON.stringify(cjs.invoke(c.action, JSON.parse(JSON.stringify(c.input))));
    const b = JSON.stringify(esm.invoke(c.action, JSON.parse(JSON.stringify(c.input))));
    const d = JSON.stringify(umd.invoke(c.action, JSON.parse(JSON.stringify(c.input))));
    const tmp = path.join(require('os').tmpdir(), ID + '-' + c.action.replace(/[^a-z0-9-]/gi, '') + '.json');
    fs.writeFileSync(tmp, JSON.stringify(c.input));
    let e;
    try { e = execFileSync(process.execPath, [path.join(ROOT, 'adapters', 'cli.js'), c.action, '--input', tmp], { encoding: 'utf8' }).trim(); }
    catch (err) { e = (err.stdout || '').trim(); }
    fs.unlinkSync(tmp);
    const okAll = a === b && a === d && a === e;
    n++;
    if (!okAll) {
      fail++;
      console.error('✘ ' + c.action + '  CJS=ESM ' + (a === b) + ' · CJS=UMD ' + (a === d) + ' · CJS=CLI ' + (a === e));
      if (a !== e) console.error('   CLI 首 200 字: ' + e.slice(0, 200) + '\\n   CJS 首 200 字: ' + a.slice(0, 200));
    } else {
      const env = JSON.parse(a);
      console.log('✔ ' + c.action.padEnd(22) + (env.ok ? 'ok' : 'FAILED ' + JSON.stringify(env.errors)) + '  ' + a.length + ' 字节');
      if (!env.ok) fail++;
    }
  }
  /* 产品类另查状态流转：run(dataset) → 改数据的动作 → 把新副本传回 run；并确认包内样本没被污染 */
  /* 只对「吃业务数据、吐新业务数据」的动作查状态流转；计算类的 merge-polish 改的是结果不是业务数据，不适用 */
  const mut = cjs.manifest.actions.filter((a) => a.mutates && a.example && Object.keys(a.example).length
    && (a.args || []).some((x) => String(x.from).indexOf('$data') === 0))[0];
  if (mut) {
    n++;
    try {
      const first = (cjs.manifest.datasets[0] || {}).key;
      const base = first ? cjs.invoke('run', { dataset: first }) : null;
      const step = cjs.invoke(mut.name, resolveEx(mut.example));
      const back = step.ok && step.data && typeof step.data === 'object' ? cjs.invoke('run', { data: step.data }) : { ok: false, errors: [{ message: '改数据的动作没返回数据副本' }] };
      const clean = first ? JSON.stringify(cjs.invoke('run', { dataset: first })) === JSON.stringify(base) : true;
      if (step.ok && back.ok && clean) console.log('✔ 状态流转            ' + mut.name + ' → 新副本回传 run 正常，包内样本未被污染');
      else { fail++; console.error('✘ 状态流转            ' + mut.name + ' step=' + step.ok + ' back=' + back.ok + ' 样本干净=' + clean); }
    } catch (e) { fail++; console.error('✘ 状态流转            ' + e.message); }
  }

  console.log((fail ? '✘ ' : '✔ ') + ID + '：' + (n - fail) + '/' + n + ' 项通过（四条路径逐字节一致' + (mut ? ' + 状态流转' : '') + '）');
  process.exit(fail ? 1 : 0);
})();
`;
}

/* ---------- 主流程 ---------- */
function build(m) {
  const srcDir = path.join(SRC, m.dir);
  const out = path.join(OUT, m.id);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const md = R(path.join(srcDir, 'SKILL.md'));
  const fm = frontmatter(md);

  // 1 内核 / 数据 / schema / 样例 / 说明书
  const kernelRel = m.kernelPath.replace(/^\.\//, '');
  fs.mkdirSync(path.join(out, 'core'), { recursive: true });
  fs.copyFileSync(path.join(srcDir, kernelRel), path.join(out, kernelRel));
  const nData = copyDir(path.join(srcDir, 'data'), path.join(out, 'data'));
  copyDir(path.join(srcDir, 'schema'), path.join(out, 'schema'));
  copyDir(path.join(srcDir, 'examples'), path.join(out, 'examples'));
  copyDir(path.join(srcDir, 'prompts'), path.join(out, 'prompts'));
  /* 根目录的 SKILL.md 由 platform-artifacts 换成 Agent Skills 形态，工程原文进 references/engineering.md */

  // 2 数据包：跑源包的 load-data.js，把装配结果固化进 bundle
  delete require.cache[require.resolve(path.join(srcDir, 'scripts', 'load-data.js'))];
  const data = require(path.join(srcDir, 'scripts', 'load-data.js'))();
  WJ(path.join(out, 'bundle', 'data.json'), data);

  // 3 数据集：manifest.datasets → bundle/datasets.json
  const datasets = [];
  const dsMap = {};
  (m.datasets || []).forEach((d) => {
    let v;
    if (d.source.indexOf('examples/') === 0) v = J(path.join(srcDir, d.source));
    else {
      const parts = d.source.split('.');
      let cur = data;
      for (let i = 1; i < parts.length; i++) cur = cur && cur[parts[i]];
      v = cur;
    }
    if (v === undefined) { console.warn('  ! 数据集 ' + d.key + ' 解析不到：' + d.source); return; }
    dsMap[d.key] = v;
    datasets.push(d);
  });
  WJ(path.join(out, 'bundle', 'datasets.json'), dsMap);

  // 3.5 依赖内核（函数，JSON 装不下，入口与单文件都要注入）
  const deps = kernelDeps(srcDir);
  deps.forEach((d) => {
    const from = path.join(SRC, d.fromDir, 'core', d.file);
    d.dest = 'core/_deps/' + d.file;
    W(path.join(out, d.dest), R(from));
    d.src = R(from);
  });

  // 4 清单
  const manifest = buildManifest(m, fm, datasets, { srcDir, out, datasets });
  manifest.runtime.kernelDeps = deps.map((d) => ({ key: d.key, path: d.dest, from: 'skills/' + d.fromDir + '/core/' + d.file, note: '内核依赖的兄弟引擎，入口注入到数据包的 ' + d.key + ' 字段' }));
  WJ(path.join(out, 'manifest.json'), manifest);
  WJ(path.join(out, 'manifest.json'), manifest);

  // 5 运行时 + 入口
  fs.mkdirSync(path.join(out, 'runtime'), { recursive: true });
  const runtimeSrc = R(path.join(UNI, 'runtime', 'invoke.js'));
  W(path.join(out, 'runtime', 'invoke.js'), runtimeSrc);
  const ingest = hasIngest(m);
  W(path.join(out, 'index.js'), [
    '/* ' + manifest.name + ' · ' + m.id + ' · DUS-1 Node 入口（生成物） */',
    "'use strict';",
    "const createSkill = require('./runtime/invoke.js');",
    "const core = require('./" + kernelRel + "');",
    ...(ingest ? [
      "const docparse = require('./shared/docparse.js');",
      "const makeGate = require('./shared/doc-gate.js');",
      '/* parse-document 的实现不在内核里：共用解析件 + 8 MB 上限与截断闸门，挂成内核的一个函数 */',
      "const kernel = Object.assign({}, core, { parseDocument: makeGate(docparse) });"
    ] : ['const kernel = core;']),
    "const data = require('./bundle/data.json');",
    "const datasets = require('./bundle/datasets.json');",
    "const manifest = require('./manifest.json');",
    "const makeLint = require('./shared/lint.js');",
    ...deps.map((d) => "data." + d.key + " = require('./" + d.dest + "');   /* 依赖内核：JSON 数据包装不下函数，这里注入 */"),
    '/* 禁忌词判定函数：JSON 传不了函数，由入口注入（见 SPEC.md §5 $lint） */',
    'const helpers = data.lintWords ? { lint: makeLint(data.lintWords).hit } : {};',
    'const skill = createSkill({ manifest, kernel, data, datasets, helpers });',
    '/* skill 自带 invoke / listActions / describe / health，直接导出即可（不要再往它身上挂同名包装，会自递归） */',
    'module.exports = skill;',
    ''
  ].join('\n'));

  // 6 单文件（浏览器 UMD / ESM）
  const kernelSrc = R(path.join(srcDir, kernelRel));
  const lintSrc = R(path.join(SRC, '_shared', 'lint.js'));
  W(path.join(out, 'shared', 'lint.js'), lintSrc);
  /* 共用解析件与它的边界闸门：与 lint.js 同法进包；浏览器单文件也必须自带，否则 file:// 打开就没有解析 */
  let docSrc = null, gateSrc = null;
  if (ingest) {
    docSrc = R(path.join(SRC, '_shared', 'docparse.js'));
    gateSrc = docGateSrc();
    W(path.join(out, 'shared', 'docparse.js'), docSrc);
    W(path.join(out, 'shared', 'doc-gate.js'), gateSrc);
  }
  const mods = { docSrc, gateSrc };
  W(path.join(out, 'dist', m.id + '.umd.js'), singleFile(m, manifest, kernelSrc, runtimeSrc, lintSrc, data, dsMap, 'umd', deps, mods));
  W(path.join(out, 'dist', m.id + '.mjs'), singleFile(m, manifest, kernelSrc, runtimeSrc, lintSrc, data, dsMap, 'esm', deps, mods));

  // 7 适配器
  ['cli.js', 'http.js', 'mcp.js', 'aios.js'].forEach((f) => W(path.join(out, 'adapters', f), R(path.join(UNI, 'adapters', f))));
  fs.chmodSync(path.join(out, 'adapters', 'cli.js'), 0o755);
  fs.chmodSync(path.join(out, 'adapters', 'mcp.js'), 0o755);

  // 8 function-calling 工具定义
  WJ(path.join(out, 'tools', 'openai-tools.json'), manifest.actions.map((a) => ({
    type: 'function',
    function: { name: (m.id + '_' + a.name).replace(/-/g, '_'), description: a.title + '：' + a.description, parameters: a.input }
  })));

  // 9 自测 + 包描述 + 说明
  W(path.join(out, 'tests', 'conformance.js'), conformance(m.id));
  WJ(path.join(out, 'package.json'), {
    name: '@dgg/skill-' + m.id,
    version: manifest.version,
    description: manifest.name + ' · ' + manifest.summary,
    license: 'UNLICENSED',
    private: true,
    type: 'commonjs',
    main: 'index.js',
    browser: 'dist/' + m.id + '.umd.js',
    exports: {
      '.': { require: './index.js', import: './dist/' + m.id + '.mjs', browser: './dist/' + m.id + '.umd.js', default: './index.js' },
      './manifest': './manifest.json',
      './adapters/*': './adapters/*',
      './package.json': './package.json'
    },
    bin: { ['dgg-' + m.id]: 'adapters/cli.js' },
    scripts: { test: 'node tests/conformance.js', serve: 'node adapters/http.js', mcp: 'node adapters/mcp.js' },
    files: ['manifest.json', 'index.js', 'core', 'data', 'bundle', 'dist', 'adapters', 'runtime', 'shared', 'schema', 'examples', 'tools', 'tests', 'scripts', 'references', 'SKILL.md', 'README.md', 'llms.txt', 'tools.openai.json', 'tools.anthropic.json', 'manifest.mcp.json', 'openapi.json'],
    dependencies: {},
    engines: { node: '>=14' }
  });
  W(path.join(out, 'README.md'), readme(m, manifest, datasets));

  // 10 跨平台适配物：Agent Skills 形态 SKILL.md + references/ + 各家工具 schema
  const pa = PA.emit(out, manifest, { sourceMd: md, dataKeys: m.dataKeys || [], dataFiles: nData });

  const files = (function count(d) { let n = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) n += e.isDirectory() ? count(path.join(d, e.name)) : 1; return n; })(out);
  console.log('✔ ' + m.id.padEnd(15) + 'v' + manifest.version.padEnd(7) + manifest.actions.length + ' 动作 · ' + datasets.length + ' 数据集 · data ' + nData + ' 个 · 产出 ' + files + ' 个文件' + (deps.length ? ' · 依赖内核 ' + deps.map((d) => d.key).join('/') : ''));
  return { id: m.id, actions: manifest.actions.length, files, agentSkillName: pa.skillName };
}

/* ---------- 套件索引：一次注册 11 个能力 ---------- */
function writeSuite(ids) {
  const registry = ids.map((id) => {
    const mf = J(path.join(OUT, id, 'manifest.json'));
    return { id: mf.id, name: mf.name, version: mf.version, kind: mf.kind, credits: mf.credits, summary: mf.summary,
      entry: { require: id + '/index.js', import: id + '/dist/' + id + '.mjs', browser: id + '/dist/' + id + '.umd.js' },
      manifest: id + '/manifest.json', actions: mf.actions.map((a) => a.name), datasets: mf.datasets.map((d) => d.key) };
  });
  WJ(path.join(OUT, 'skills.json'), { spec: 'dus-1', suite: SUITE, count: registry.length, skills: registry });
  W(path.join(OUT, 'register-all.js'), [
    '/* ' + SUITE.name + ' ' + SUITE.version + ' · 一次把 11 个通用 skill 注册进宿主（生成物） */',
    "'use strict';",
    "const path = require('path');",
    "const registry = require('./skills.json');",
    'function loadAll() {',
    '  return registry.skills.map((s) => require(path.join(__dirname, s.id, \'index.js\')));',
    '}',
    'function descriptors() {',
    "  return registry.skills.map((s) => require(path.join(__dirname, s.id, 'adapters', 'aios.js')).descriptor());",
    '}',
    'function registerAll(host) {',
    "  return registry.skills.map((s) => require(path.join(__dirname, s.id, 'adapters', 'aios.js')).register(host));",
    '}',
    'module.exports = { registry, loadAll, descriptors, registerAll };',
    '',
    'if (require.main === module) {',
    '  const all = loadAll();',
    "  console.log(registry.suite.name + ' ' + registry.suite.version + ' · ' + all.length + ' 个通用 skill');",
    "  all.forEach((s) => { const h = s.health(); console.log('  ' + h.id.padEnd(16) + 'v' + h.version.padEnd(8) + h.actions + ' 动作 · 数据集 ' + (h.datasets.join('/') || '无') + ' · 内核 ' + (h.versionMatch ? '版本一致' : '版本不一致!')); });",
    '}',
    ''
  ].join('\n'));
  /* 统一网关：一个端口暴露 11 个 skill，平台侧只接一次 */
  W(path.join(OUT, 'gateway.js'), [
    '/* ' + SUITE.name + ' ' + SUITE.version + ' · 统一 HTTP 网关（生成物）',
    ' *   PORT=8710 node gateway.js',
    ' *   GET  /skills                      11 个能力清单',
    ' *   GET  /skills/<id>/manifest        单个清单',
    ' *   GET  /skills/<id>/actions         动作列表',
    ' *   POST /skills/<id>/actions/<name>  调用，body = JSON 输入，返回 DUS-1 信封',
    ' *   GET  /tools                       11 个包的 function-calling 工具表（合成一张）',
    ' *   POST /tools/call                  body = { name: "<id>_<action>", arguments: {} }',
    ' */',
    "'use strict';",
    "const http = require('http');",
    "const path = require('path');",
    "const registry = require('./skills.json');",
    "const skills = {};",
    "registry.skills.forEach((s) => { skills[s.id] = require(path.join(__dirname, s.id, 'index.js')); });",
    "const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };",
    'function toolName(id, action) { return (id + \'_\' + action).replace(/-/g, \'_\'); }',
    'function allTools() {',
    '  const out = [];',
    '  registry.skills.forEach((s) => skills[s.id].listActions().forEach((a) => out.push({ type: \'function\', function: { name: toolName(s.id, a.name), description: a.title + \'：\' + a.description, parameters: a.input } })));',
    '  return out;',
    '}',
    'function route(method, p, body) {',
    "  if (method === 'OPTIONS') return { status: 204, body: '' };",
    "  if (method === 'GET' && (p === '/' || p === '/skills')) return { status: 200, body: registry };",
    "  if (method === 'GET' && p === '/tools') return { status: 200, body: allTools() };",
    "  if (method === 'POST' && p === '/tools/call') {",
    '    const name = (body && body.name) || \'\';',
    '    for (const s of registry.skills) {',
    "      const pre = s.id.replace(/-/g, '_') + '_';",
    "      if (name.indexOf(pre) === 0) { const env = skills[s.id].invoke(name.slice(pre.length).replace(/_/g, '-'), (body && body.arguments) || {}); return { status: env.ok ? 200 : 400, body: env }; }",
    '    }',
    "    return { status: 404, body: { ok: false, errors: [{ code: 'E_ACTION', message: '没有这个工具：' + name }] } };",
    '  }',
    "  const m = p.match(/^\\/skills\\/([a-z0-9-]+)(\\/.*)?$/);",
    "  if (m && skills[m[1]]) {",
    '    const sk = skills[m[1]], rest = m[2] || \'\';',
    "    if (method === 'GET' && (rest === '' || rest === '/' || rest === '/manifest')) return { status: 200, body: sk.manifest };",
    "    if (method === 'GET' && rest === '/actions') return { status: 200, body: sk.listActions() };",
    "    if (method === 'GET' && rest === '/health') return { status: 200, body: sk.invoke('health', {}) };",
    "    if (method === 'POST' && rest.indexOf('/actions/') === 0) { const env = sk.invoke(decodeURIComponent(rest.slice(9)), body || {}); return { status: env.ok ? 200 : 400, body: env }; }",
    '  }',
    "  return { status: 404, body: { ok: false, spec: 'dus-1', errors: [{ code: 'E_ACTION', message: '无此路由：' + method + ' ' + p }] } };",
    '}',
    'const server = http.createServer((req, res) => {',
    '  const chunks = [];',
    "  req.on('data', (c) => chunks.push(c));",
    "  req.on('end', () => {",
    '    let body = null;',
    "    if (chunks.length) { try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { res.writeHead(400, H); return res.end(JSON.stringify({ ok: false, errors: [{ code: 'E_INPUT', message: 'body 不是合法 JSON' }] })); } }",
    "    const r = route(req.method.toUpperCase(), (req.url || '/').split('?')[0], body);",
    '    res.writeHead(r.status, H);',
    "    res.end(r.status === 204 ? '' : JSON.stringify(r.body));",
    '  });',
    '});',
    'const port = Number(process.env.PORT || 8710);',
    "server.listen(port, () => console.error(registry.suite.name + ' ' + registry.suite.version + ' · ' + registry.skills.length + ' 个 skill · ' + allTools().length + ' 个工具 → http://127.0.0.1:' + port + '/skills'));",
    'module.exports = { route, skills, registry, allTools };',
    ''
  ].join('\n'));
  /* 套件级跨平台适配物：11 个包合成一张工具表 / 一份 MCP 声明 / 一个总入口 skill */
  const mfs = ids.map((id) => J(path.join(OUT, id, 'manifest.json')));
  const oa = [], an = [], mcp = {};
  mfs.forEach((mf) => {
    PA.openaiTools(mf, mf.id).forEach((t) => oa.push(t));
    PA.anthropicTools(mf, mf.id).forEach((t) => an.push(t));
    mcp[mf.id] = { command: 'node', args: [mf.id + '/adapters/mcp.js'], env: {} };
  });
  WJ(path.join(OUT, 'tools.openai.json'), oa);
  WJ(path.join(OUT, 'tools.anthropic.json'), an);
  WJ(path.join(OUT, 'mcp.json'), { mcpServers: mcp });
  W(path.join(OUT, 'SKILL.md'), [
    '---',
    'name: dgg-ai-suite',
    'description: ' + PA.safeText(SUITE.name + ' ' + SUITE.version + '：' + mfs.length + ' 个企业经营智能体的总入口，覆盖'
      + mfs.map((x) => x.name).join('、')
      + '。当用户要做企业 AI 成熟度评估、场景价值排序、投入 ROI 测算，或要处理获客、人力、财务、法务、流程、决策、订单交付、软件需求这些经营事务时，先读本文件挑出合适的子技能，再读那个子技能目录下的 SKILL.md。全部纯规则计算，结果确定、可离线、零网络请求。', 1024),
    '---',
    '',
    '# ' + SUITE.name + ' ' + SUITE.version,
    '',
    '这是一个套件，下面 ' + mfs.length + ' 个子技能各管一摊。**先按下表挑出要用的那个，再读它目录下的 `SKILL.md`**，不要一次全读。',
    '',
    '| 子技能 | 管什么 | 动作数 | 积分/次 |',
    '|---|---|---|---|',
    ...mfs.map((x) => '| [`' + x.id + '`](' + x.id + '/SKILL.md) | ' + PA.safeText(x.summary, 46) + ' | ' + x.actions.length + ' | ' + x.credits + ' |'),
    '',
    '## 共同约定',
    '',
    '- 每个子技能都是一个独立目录，自带全部规则表与样例数据，互不依赖。',
    '- 一行开跑：`node <子技能>/scripts/skill.js <动作名> \'<JSON>\'`。',
    '- 返回一律是信封 `{ ok, spec, skill, action, data, errors, meta }`。',
    '- 带「写回」标记的动作返回**新的业务数据副本**，要存回会话状态，下一次传 `data` 而不是 `dataset`。',
    '- 金额一律「预计」口径；参考区间是常见范围而非统计调查；企业与人员一律用代号。',
    '',
    '## 整套一起用',
    '',
    '```bash',
    'node register-all.js                 # 列出全部子技能与自检结果',
    'PORT=8710 node gateway.js            # 一个端口暴露全部子技能（含 /tools 与 /tools/call）',
    '```',
    '',
    '- `tools.openai.json` / `tools.anthropic.json`：全套动作合成的函数调用工具表，工具名为 `<子技能>__<动作>`。',
    '- `mcp.json`：一次把全部子技能挂进任意 MCP 宿主。',
    '- `INSTALL.md`：各家平台怎么装。',
    ''
  ].join('\n'));
  W(path.join(OUT, 'llms.txt'), [
    '# ' + SUITE.name + ' ' + SUITE.version,
    '',
    '> ' + mfs.length + ' 个企业经营智能体，纯规则、结果确定、可离线、零依赖。',
    '',
    ...mfs.map((x) => '- ' + x.id + '（' + x.name + '，' + x.actions.length + ' 动作）：' + PA.safeText(x.summary, 80)),
    '',
    '入口：<子技能>/SKILL.md · <子技能>/llms.txt · 整套 gateway.js',
    ''
  ].join('\n'));
  W(path.join(OUT, 'INSTALL.md'), [
    '# 装到各家平台',
    '',
    '每个子技能都是一个自包含目录，没有任何第三方依赖，也不联网。',
    '',
    '## Claude Code',
    '',
    '```bash',
    'cp -r <子技能> ~/.claude/skills/          # 个人；或 .claude/skills/ 放进项目',
    '```',
    '目录名即技能名；改名请同步改该目录 `SKILL.md` 前言里的 `name`。',
    '',
    '## claude.ai',
    '',
    '把子技能目录打成 zip，从「设置 → 功能」上传（需要账号开启代码执行）。',
    '',
    '## Claude API',
    '',
    '走 `/v1/skills` 上传，配合代码执行工具使用。沙箱无网络、不能装包 —— 本包零依赖、纯离线，正好满足；',
    '需要容器内有 Node 18+，没有的话改用下面的 HTTP 或 MCP 方式从容器外调。',
    '',
    '## OpenAI 兼容的函数调用',
    '',
    '直接把 `tools.openai.json` 塞进 `tools`；收到 `<子技能>__<动作>` 的调用后，转给',
    '`node <子技能>/adapters/cli.js <动作> \'<arguments JSON>\'`，或 POST 给网关的 `/tools/call`。',
    '',
    '## Anthropic Messages API',
    '',
    '同上，用 `tools.anthropic.json`。',
    '',
    '## 任意 MCP 宿主',
    '',
    '把 `mcp.json` 的 `mcpServers` 合进宿主配置即可，不依赖任何 MCP SDK。',
    '',
    '## 自研 agent 平台',
    '',
    '```js',
    "const { descriptors, registerAll } = require('./register-all.js');",
    'registerAll(host);      // 或先看 descriptors() 再自行登记',
    '```',
    '',
    '## 浏览器 / 断网现场',
    '',
    '```html',
    '<script src="<子技能>/dist/<子技能>.umd.js"></script>',
    '```',
    '单文件、零外部请求，file:// 直接打开就能跑。',
    ''
  ].join('\n'));
  console.log('✔ 套件索引 → dist-universal/skills.json · register-all.js · gateway.js');
  console.log('✔ 套件跨平台 → SKILL.md · tools.openai.json（' + oa.length + ' 个工具）· tools.anthropic.json · mcp.json · llms.txt · INSTALL.md');
}

const only = process.argv[2];
const list = only ? MAP.filter((m) => m.id === only) : MAP;
if (!list.length) { console.error('没有这个 skill：' + only); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const done = list.map(build);
if (!only) writeSuite(done.map((x) => x.id));
console.log('\n共 ' + done.length + ' 个通用包 → dist-universal/  ·  动作合计 ' + done.reduce((n, x) => n + x.actions, 0));
