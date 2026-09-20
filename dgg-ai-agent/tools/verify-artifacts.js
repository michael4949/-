#!/usr/bin/env node
/*
 * 七项跨平台产物的一致性自测（DUS-1.1 · SPEC §13.9）
 * ------------------------------------------------------------
 *   node tools/build-universal.js      先生成
 *   node tools/verify-artifacts.js     再自测（可带一个包 id 只测一个）
 *
 * 逐包检查：
 *   1  七项产物齐全：SKILL.md · references/*.md · tools.openai.json · tools.anthropic.json
 *      · manifest.mcp.json · openapi.json · llms.txt（外加老路径别名 tools/openai-tools.json）
 *   2  动作集合与顺序与 manifest 一致（四份产物各查一遍）
 *   3  tools.openai / tools.anthropic / openapi 三者动作集合相同，工具名口径一致
 *   4  manifest.mcp.json 的 tools 与 adapters/mcp.js 的 tools/list **实际返回**相同（真起一次 mcp 进程去问）
 *   5  SKILL.md 前言 name === manifest.id === 包目录名，metadata.version === manifest.version
 *   6  SKILL.md 前言 name 匹配 ^[a-z0-9-]{1,64}$，description 非空且 ≤ 1024 字符
 *   7  llms.txt ≤ 8 KB，动作数与 manifest.actions.length 一致
 *   8  SKILL.md 正文 ≤ 200 行
 *
 * 套件级再查两项（§13.9 的「工具名四处一致」）：
 *   9  套件 tools.*.json 的工具名 = 各包 tools.*.json 的工具名（同一个 <id>_<action> 口径）
 *   10 拿套件工具表里的第一个名字真打一次 gateway.js 的 /tools/call，不许 404
 *
 * 任一项不符都会打印「哪个包 · 哪一项 · 差在哪」，并以退出码 1 结束。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist-universal');
const PA = require(path.join(__dirname, 'platform-artifacts.js'));

const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const R = (p) => fs.readFileSync(p, 'utf8');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const list = (a) => (a.length > 8 ? a.slice(0, 8).join(' / ') + ' …（共 ' + a.length + '）' : a.join(' / ') || '（空）');
/* 两个数组差在哪：给出第一处不同，比整段贴出来好读 */
function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return '第 ' + (i + 1) + ' 项：' + JSON.stringify(a[i]) + ' ≠ ' + JSON.stringify(b[i]);
  return '长度 ' + a.length + ' ≠ ' + b.length;
}

/* ---------- 前言：只认本生成器写出来的那几种形态（纯量 / JSON 双引号 / 两格缩进的 metadata） ---------- */
function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { ok: false, data: {}, bodyLines: md.split('\n').length };
  const out = {};
  let cur = out;
  m[1].split('\n').forEach((line) => {
    if (!line.trim() || /^\s*#/.test(line)) return;
    const indented = /^\s\s+\S/.test(line);
    const i = line.indexOf(':');
    if (i < 0) return;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (!indented) cur = out;
    const target = indented ? cur : out;
    if (v === '') { out[k] = {}; cur = out[k]; return; }
    if (v.charAt(0) === '"') { try { v = JSON.parse(v); } catch (e) { /* 原样 */ } }
    else if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (v !== '' && !isNaN(Number(v)) && !/^\d+\.\d+\.\d+$/.test(v)) v = Number(v);
    target[k] = v;
  });
  const body = md.slice(m[0].length);
  return { ok: true, data: out, bodyLines: body.replace(/\n+$/, '').split('\n').length };
}

/* ---------- 真起一次 mcp 进程，问它 tools/list ---------- */
function mcpToolsList(pkgDir) {
  const req = [
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  ].join('\n') + '\n';
  const r = spawnSync(process.execPath, [path.join(pkgDir, 'adapters', 'mcp.js')], {
    cwd: pkgDir, input: req, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  });
  if (r.error) return { err: 'mcp 进程起不来：' + r.error.message };
  if (r.status !== 0) return { err: 'mcp 进程退出码 ' + r.status + '：' + String(r.stderr || '').slice(0, 300) };
  const lines = String(r.stdout || '').split('\n').filter((x) => x.trim());
  for (const line of lines) {
    let msg;
    try { msg = JSON.parse(line); } catch (e) { continue; }
    if (msg.id === 2 && msg.result && Array.isArray(msg.result.tools)) return { tools: msg.result.tools };
  }
  return { err: 'mcp 没有回 tools/list：' + String(r.stdout || '').slice(0, 300) };
}

/* ---------- 逐包 ---------- */
function checkPackage(id) {
  const dir = path.join(OUT, id);
  const bad = [];
  const fail = (item, msg) => bad.push({ id: id, item: item, msg: msg });

  if (!fs.existsSync(path.join(dir, 'manifest.json'))) { fail('1 产物齐全', '没有 manifest.json，包都不完整'); return bad; }
  const mf = J(path.join(dir, 'manifest.json'));
  const names = (mf.actions || []).map((a) => a.name);
  const ft = PA.featuresOf(mf);
  const wantRefs = PA.referenceFiles(mf);

  /* 1 七项产物齐全 */
  const need = ['SKILL.md', 'tools.openai.json', 'tools.anthropic.json', 'manifest.mcp.json', 'openapi.json', 'llms.txt',
    'tools/openai-tools.json', 'scripts/skill.js'];
  let missing = 0;
  need.forEach((f) => { if (!fs.existsSync(path.join(dir, f))) { fail('1 产物齐全', '缺 ' + f); missing++; } });
  const refDir = path.join(dir, 'references');
  if (!fs.existsSync(refDir)) { fail('1 产物齐全', '缺 references/ 整个目录'); missing++; }
  else {
    const got = fs.readdirSync(refDir).filter((f) => f.endsWith('.md')).sort();
    if (!eq(got, wantRefs.slice().sort())) {
      fail('1 产物齐全', 'references/ 对不上：应有 ' + list(wantRefs.slice().sort()) + '；实有 ' + list(got)
        + '（本包 conversation=' + ft.conversation + ' ingest=' + ft.ingest + '）');
    }
    got.forEach((f) => {
      const s = R(path.join(refDir, f));
      if (!s.trim()) fail('1 产物齐全', 'references/' + f + ' 是空文件');
      /* engineering.md 是源 SKILL.md 原样搬运（含它的工程契约前言，开头是 ---），其余每篇都要自带标题 */
      else if (f !== 'engineering.md' && s.charAt(0) !== '#') fail('1 产物齐全', 'references/' + f + ' 开头不是标题行');
      else if (f === 'engineering.md' && s.indexOf('---') !== 0) fail('1 产物齐全', 'references/engineering.md 不是源 SKILL.md 的原样搬运（开头没有工程契约前言）');
    });
  }
  /* 要读的文件本身就缺了，后面的比对没法做；references 少一篇不影响其余各项，照查不误 */
  if (missing) return bad;

  const oa = J(path.join(dir, 'tools.openai.json'));
  const an = J(path.join(dir, 'tools.anthropic.json'));
  const mcpj = J(path.join(dir, 'manifest.mcp.json'));
  const api = J(path.join(dir, 'openapi.json'));
  const alias = J(path.join(dir, 'tools/openai-tools.json'));
  const llms = R(path.join(dir, 'llms.txt'));
  const md = R(path.join(dir, 'SKILL.md'));
  const wantTools = names.map((n) => PA.toolName(id, n));

  /* 2 动作集合与顺序与 manifest 一致 */
  const oaNames = oa.map((t) => t.function && t.function.name);
  const anNames = an.map((t) => t.name);
  const mcpNames = (mcpj.tools || []).map((t) => t.name);
  const apiPaths = Object.keys(api.paths).filter((p) => p.indexOf('/actions/') === 0).map((p) => p.slice('/actions/'.length));
  const apiOps = apiPaths.map((n) => api.paths['/actions/' + n].post.operationId);
  if (!eq(oaNames, wantTools)) fail('2 动作与 manifest 一致', 'tools.openai.json 的工具名对不上：' + firstDiff(oaNames, wantTools));
  if (!eq(anNames, wantTools)) fail('2 动作与 manifest 一致', 'tools.anthropic.json 的工具名对不上：' + firstDiff(anNames, wantTools));
  if (!eq(mcpNames, names)) fail('2 动作与 manifest 一致', 'manifest.mcp.json 的 tools[].name 应当是裸动作名：' + firstDiff(mcpNames, names));
  if (!eq(apiPaths, names)) fail('2 动作与 manifest 一致', 'openapi.json 的 /actions/<name> 对不上：' + firstDiff(apiPaths, names));
  if (!eq(alias, oa)) fail('2 动作与 manifest 一致', 'tools/openai-tools.json 与 tools.openai.json 内容不一致（§14.2 第 8 条要求逐字一致）');
  /* 入参 schema 也要一字不改地取自 manifest.actions[].input */
  (mf.actions || []).forEach((a, i) => {
    const want = a.input && a.input.type ? a.input : { type: 'object', properties: {}, additionalProperties: true };
    if (oa[i] && !eq(oa[i].function.parameters, want)) fail('2 动作与 manifest 一致', 'tools.openai.json 的 ' + a.name + ' 入参 schema 与 manifest 不一致');
    if (an[i] && !eq(an[i].input_schema, want)) fail('2 动作与 manifest 一致', 'tools.anthropic.json 的 ' + a.name + ' 入参 schema 与 manifest 不一致');
    const rb = api.paths['/actions/' + a.name];
    if (rb && !eq(rb.post.requestBody.content['application/json'].schema, want)) fail('2 动作与 manifest 一致', 'openapi.json 的 ' + a.name + ' requestBody 与 manifest 不一致');
    /* 描述也得取自清单：§13.4 定的是「title：description」，改数据的再追一句 */
    const head = a.title ? a.title + '：' : '';
    if (head && oa[i] && String(oa[i].function.description).indexOf(head) !== 0) fail('2 动作与 manifest 一致', 'tools.openai.json 的 ' + a.name + ' description 开头不是 manifest 的 title（应为「' + head + '…」）');
    if (head && an[i] && String(an[i].description).indexOf(head) !== 0) fail('2 动作与 manifest 一致', 'tools.anthropic.json 的 ' + a.name + ' description 开头不是 manifest 的 title');
    if (head && mcpj.tools[i] && String(mcpj.tools[i].description).indexOf(head) !== 0) fail('2 动作与 manifest 一致', 'manifest.mcp.json 的 ' + a.name + ' description 开头不是 manifest 的 title');
  });

  /* 3 三者动作集合相同，openapi 的 operationId = tools.openai.json 的函数名 */
  if (!eq(oaNames.slice().sort(), anNames.slice().sort())) fail('3 三份产物集合相同', 'tools.openai 与 tools.anthropic 的动作集合不同');
  if (!eq(apiOps, oaNames)) fail('3 三份产物集合相同', 'openapi.json 的 operationId 与 tools.openai.json 的函数名对不上：' + firstDiff(apiOps, oaNames));
  oaNames.forEach((n) => { if (!/^[a-zA-Z0-9_-]{1,64}$/.test(String(n))) fail('3 三份产物集合相同', '工具名不合法（^[a-zA-Z0-9_-]{1,64}$）：' + n); });

  /* 3.5 §13.6 / §13.7 的形态要求 */
  if (!mcpj.transport || typeof mcpj.transport !== 'object' || mcpj.transport.type !== 'stdio') {
    fail('3 三份产物集合相同', 'manifest.mcp.json 的 transport 要是对象形态 { type:"stdio", command, args }，实际是 ' + JSON.stringify(mcpj.transport));
  }
  const srv = (mcpj.mcpServers || {})[id];
  if (!srv || !Array.isArray(srv.args) || String(srv.args[0]).indexOf('<包的绝对路径>') !== 0) {
    fail('3 三份产物集合相同', 'manifest.mcp.json 的 mcpServers.' + id + '.args 要用绝对路径占位符 <包的绝对路径>/adapters/mcp.js，实际是 ' + JSON.stringify(srv && srv.args));
  }
  if (!api.servers || !api.servers[0] || api.servers[0].url !== 'http://127.0.0.1:8711') {
    fail('3 三份产物集合相同', 'openapi.json 的 servers[0].url 应为 http://127.0.0.1:8711（http.js 只认 PORT，默认 8711），实际是 ' + JSON.stringify(api.servers && api.servers[0] && api.servers[0].url));
  }
  const envProps = ((api.components || {}).schemas || {}).Envelope;
  if (!envProps || !envProps.properties || !envProps.properties.specVersion) fail('3 三份产物集合相同', 'openapi.json 的 Envelope 缺 specVersion');
  if (ft.conversation || ft.ingest) {
    ['Answer', 'Block', 'Act'].forEach((k) => { if (!api.components.schemas[k]) fail('3 三份产物集合相同', 'openapi.json 缺 ' + k + ' schema（本包实现了对话 / 摄入）'); });
    if (ft.ingest && !api.components.schemas.Doc) fail('3 三份产物集合相同', 'openapi.json 缺 Doc schema（本包实现了摄入）');
  }

  /* 4 manifest.mcp.json 的 tools 与 adapters/mcp.js 的 tools/list 实际返回相同 */
  const got = mcpToolsList(dir);
  if (got.err) fail('4 MCP tools/list 一致', got.err);
  else if (!eq(got.tools, mcpj.tools)) {
    const a = got.tools.map((t) => t.name), b = mcpNames;
    fail('4 MCP tools/list 一致', !eq(a, b)
      ? '工具名对不上：' + firstDiff(a, b)
      : '工具名一致但内容不同（description 或 inputSchema），第一处：' + (function () {
        for (let i = 0; i < got.tools.length; i++) if (!eq(got.tools[i], mcpj.tools[i])) return got.tools[i].name;
        return '?';
      })());
  }

  /* 5 / 6 SKILL.md 前言 */
  const fm = frontmatter(md);
  if (!fm.ok) fail('5 SKILL.md 前言', '没有 YAML 前言');
  else {
    const f = fm.data;
    if (f.name !== mf.id) fail('5 SKILL.md 前言', 'name（' + f.name + '）≠ manifest.id（' + mf.id + '）');
    if (f.name !== id) fail('5 SKILL.md 前言', 'name（' + f.name + '）≠ 包目录名（' + id + '）');
    if (f.metadata && f.metadata.version !== mf.version) fail('5 SKILL.md 前言', 'metadata.version（' + f.metadata.version + '）≠ manifest.version（' + mf.version + '）');
    if (!f.metadata) fail('5 SKILL.md 前言', '缺 metadata（§13.1 决定写，§13.9 的 metadata.version 就必查）');
    if (!f.license) fail('5 SKILL.md 前言', '缺 license');
    if (!/^[a-z0-9-]{1,64}$/.test(String(f.name || ''))) fail('6 SKILL.md name/description', 'name 不匹配 ^[a-z0-9-]{1,64}$：' + f.name);
    const d = String(f.description == null ? '' : f.description);
    if (!d.trim()) fail('6 SKILL.md name/description', 'description 是空的');
    if (d.length > 1024) fail('6 SKILL.md name/description', 'description ' + d.length + ' 字符，超过 1024');
    if (/<[^>]+>/.test(d)) fail('6 SKILL.md name/description', 'description 里有 XML / HTML 标签');
    /* 8 正文 ≤ 200 行 */
    if (fm.bodyLines > 200) fail('8 SKILL.md 正文 ≤ 200 行', '正文 ' + fm.bodyLines + ' 行');
  }

  /* 7 llms.txt ≤ 8 KB，动作数一致 */
  const bytes = Buffer.byteLength(llms, 'utf8');
  if (bytes > PA.LLMS_MAX) fail('7 llms.txt', bytes + ' 字节，超过 ' + PA.LLMS_MAX + '（8 KB）');
  const head = llms.match(/^##\s*动作（(\d+)）\s*$/m);
  if (!head) fail('7 llms.txt', '找不到「## 动作（N）」这一段');
  else {
    if (Number(head[1]) !== names.length) fail('7 llms.txt', '动作数写的是 ' + head[1] + '，manifest.actions.length 是 ' + names.length);
    const lines = llms.split('\n');
    const start = lines.indexOf(head[0]) + 1;
    let n = 0;
    for (let i = start; i < lines.length && lines[i].trim() && lines[i].indexOf('## ') !== 0; i++) n++;
    if (n !== names.length) fail('7 llms.txt', '动作段实际列了 ' + n + ' 行，manifest.actions.length 是 ' + names.length);
  }

  return bad;
}

/* ---------- 套件级：工具名四处一致 + gateway 真打一次 ---------- */
function checkSuite(ids) {
  const bad = [];
  const fail = (item, msg) => bad.push({ id: '（套件）', item: item, msg: msg });
  const sOA = path.join(OUT, 'tools.openai.json');
  const sAN = path.join(OUT, 'tools.anthropic.json');
  if (!fs.existsSync(sOA) || !fs.existsSync(sAN)) { fail('9 工具名四处一致', '套件级 tools.*.json 还没生成'); return bad; }
  const want = [];
  ids.forEach((id) => {
    const mf = J(path.join(OUT, id, 'manifest.json'));
    (mf.actions || []).forEach((a) => want.push(PA.toolName(id, a.name)));
  });
  const gotOA = J(sOA).map((t) => t.function.name);
  const gotAN = J(sAN).map((t) => t.name);
  if (!eq(gotOA, want)) fail('9 工具名四处一致', '套件 tools.openai.json 与各包对不上：' + firstDiff(gotOA, want));
  if (!eq(gotAN, want)) fail('9 工具名四处一致', '套件 tools.anthropic.json 与各包对不上：' + firstDiff(gotAN, want));

  /* 10 拿第一个工具名真打一次 gateway 的 /tools/call：PORT=0 让它挑个空闲端口，免得撞上别人 */
  if (want.length) {
    const code = 'const g=require(' + JSON.stringify(path.join(OUT, 'gateway.js')) + ');'
      + 'const r=g.route("POST","/tools/call",{name:' + JSON.stringify(want[0]) + ',arguments:{}});'
      + 'process.stdout.write(JSON.stringify({status:r.status,ok:!!(r.body&&r.body.ok),err:(r.body&&r.body.errors&&r.body.errors[0])||null}));'
      + 'process.exit(0);';
    const r = spawnSync(process.execPath, ['-e', code], { cwd: OUT, encoding: 'utf8', env: Object.assign({}, process.env, { PORT: '0' }), maxBuffer: 64 * 1024 * 1024 });
    let res = null;
    try { res = JSON.parse(String(r.stdout || '').trim()); } catch (e) { /* 下面统一报 */ }
    if (!res) fail('10 gateway /tools/call', 'gateway.js 调不起来：' + String(r.stderr || r.stdout || '').slice(-400));
    else if (res.status === 404) fail('10 gateway /tools/call', '工具名 ' + want[0] + ' 被网关判成 404：' + JSON.stringify(res.err));
  }
  return bad;
}

/* ---------- 跑 ---------- */
const only = process.argv[2];
if (!fs.existsSync(OUT)) { console.error('没有 dist-universal/，先跑 node tools/build-universal.js'); process.exit(2); }
const ids = fs.readdirSync(OUT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(OUT, e.name, 'manifest.json')))
  .map((e) => e.name);
const order = fs.existsSync(path.join(OUT, 'skills.json')) ? J(path.join(OUT, 'skills.json')).skills.map((s) => s.id) : ids;
const todo = (only ? order.filter((x) => x === only) : order).filter((x) => ids.indexOf(x) >= 0);
if (!todo.length) { console.error('没有这个包：' + only); process.exit(2); }

let bad = [];
todo.forEach((id) => {
  const b = checkPackage(id);
  bad = bad.concat(b);
  console.log((b.length ? '✘ ' : '✔ ') + id.padEnd(15) + (b.length ? b.length + ' 项不符' : '七项产物一致'));
});
if (!only) {
  const b = checkSuite(todo);
  bad = bad.concat(b);
  console.log((b.length ? '✘ ' : '✔ ') + '（套件）'.padEnd(13) + (b.length ? b.length + ' 项不符' : '工具名四处一致 · gateway /tools/call 通'));
}

if (bad.length) {
  console.error('\n不符项（' + bad.length + '）：');
  bad.forEach((x) => console.error('  ' + x.id + ' · ' + x.item + ' · ' + x.msg));
  console.error('\n以上任一项不符 = 生成器有 bug，不是文档问题（SPEC §13.9）。');
  process.exit(1);
}
console.log('\n共 ' + todo.length + ' 个包 · 七项产物全部一致（SPEC §13.9）');
