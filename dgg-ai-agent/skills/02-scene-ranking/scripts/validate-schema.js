// 契约校验：schema/input.json · schema/output.json 与内核、数据表、golden 样例是否一致
//   1) 四套样例的 input / output 分别通过 input.json / output.json，且 golden 与当前内核逐字一致
//   2) 契约枚举与数据表一致：四维、痛点分组、投入档、业务系统、模块名、权重预设、场景与痛点条数
//   3) 契约常量（积分、版本、公式）与内核、credits.json、SKILL.md 一致
//   4) 反例必须被拒绝：痛点过少 / 严重度越界 / 痛点跨行业 / 缺 conditions / 权重非法 / 多出字段
// 校验器只实现 draft-07 的一个子集（本包用到的关键字），不依赖第三方包。
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const core = require('../core/compute.js');
const data = require('./load-data.js')();

// ---------- 最小 JSON Schema 校验器 ----------
const cache = {};
function loadSchema(file) { file = path.resolve(file); if (!cache[file]) cache[file] = { doc: J(file), file }; return cache[file]; }
function resolveRef(ref, ctx) {
  if (ref.startsWith('#')) { let node = ctx.doc; for (const seg of ref.slice(2).split('/')) node = node[seg]; return { schema: node, ctx }; }
  const [file, frag] = ref.split('#');
  const c = loadSchema(path.join(path.dirname(ctx.file), file));
  return frag ? resolveRef('#' + frag, c) : { schema: c.doc, ctx: c };
}
const typeOf = (v) => Array.isArray(v) ? 'array' : v === null ? 'null' : Number.isInteger(v) ? 'integer' : typeof v;
const typeOk = (t, v) => t === 'number' ? typeof v === 'number' : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function validate(schema, value, ctx, at, errs) {
  if (schema === true) return; if (schema === false) { errs.push(`${at}: 不允许`); return; }
  if (schema.$ref) { const r = resolveRef(schema.$ref, ctx); validate(r.schema, value, r.ctx, at, errs); return; }
  if (schema.type) { const ts = [].concat(schema.type); if (!ts.some((t) => typeOk(t, value))) { errs.push(`${at}: 类型应为 ${ts.join('|')}，实为 ${typeOf(value)}`); return; } }
  if ('const' in schema && !eq(value, schema.const)) errs.push(`${at}: 应为常量 ${JSON.stringify(schema.const)}，实为 ${JSON.stringify(value)}`);
  if (schema.enum && !schema.enum.some((e) => eq(e, value))) errs.push(`${at}: ${JSON.stringify(value)} 不在枚举内`);
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) errs.push(`${at}: 长度 < ${schema.minLength}`);
    if (schema.maxLength != null && value.length > schema.maxLength) errs.push(`${at}: 长度 ${value.length} > ${schema.maxLength}「${value}」`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${at}: 「${value}」不匹配 ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) errs.push(`${at}: ${value} < ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errs.push(`${at}: ${value} > ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errs.push(`${at}: 项数 ${value.length} < ${schema.minItems}`);
    if (schema.maxItems != null && value.length > schema.maxItems) errs.push(`${at}: 项数 ${value.length} > ${schema.maxItems}`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) errs.push(`${at}: 存在重复项`);
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, ctx, `${at}[${i}]`, errs));
    if (schema.contains && !value.some((v) => { const e = []; validate(schema.contains, v, ctx, at, e); return !e.length; })) errs.push(`${at}: 没有任何一项满足 contains`);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    (schema.required || []).forEach((k) => { if (!(k in value)) errs.push(`${at}: 缺少必填字段 ${k}`); });
    if (schema.properties) Object.keys(schema.properties).forEach((k) => { if (k in value) validate(schema.properties[k], value[k], ctx, `${at}.${k}`, errs); });
    if (schema.additionalProperties === false) Object.keys(value).forEach((k) => { if (!schema.properties || !(k in schema.properties)) errs.push(`${at}: 多出字段 ${k}`); });
    else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') Object.keys(value).forEach((k) => { if (!schema.properties || !(k in schema.properties)) validate(schema.additionalProperties, value[k], ctx, `${at}.${k}`, errs); });
  }
  const sub = (s) => { const e = []; validate(s, value, ctx, at, e); return e; };
  if (schema.allOf) schema.allOf.forEach((s) => errs.push(...sub(s)));
  if (schema.anyOf && !schema.anyOf.some((s) => !sub(s).length)) errs.push(`${at}: anyOf 无一满足`);
  if (schema.oneOf) { const n = schema.oneOf.filter((s) => !sub(s).length).length; if (n !== 1) errs.push(`${at}: oneOf 满足 ${n} 个分支（应恰好 1 个）` + (n === 0 ? '；各分支首个错误：' + schema.oneOf.map((s) => sub(s)[0]).join(' ‖ ') : '')); }
  if (schema.not && !sub(schema.not).length) errs.push(`${at}: 命中 not 分支`);
}
function check(schemaFile, value, label) {
  const c = loadSchema(schemaFile); const errs = [];
  validate(c.doc, value, c, '$', errs);
  return { ok: !errs.length, errs, label };
}

// ---------- 执行 ----------
let failed = 0;
const pass = (ok, msg, detail) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) { failed++; (detail || []).slice(0, 8).forEach((d) => console.log('      ' + d)); } };
const inputSchema = path.join(here, 'schema', 'input.json');
const outputSchema = path.join(here, 'schema', 'output.json');

console.log('1) 样例通过契约');
const exDir = path.join(here, 'examples');
for (const f of fs.readdirSync(exDir).filter((x) => x.endsWith('.input.json')).sort()) {
  const input = J(path.join(exDir, f));
  const r = check(inputSchema, input, f); pass(r.ok, `${f} 符合 schema/input.json`, r.errs);
  const golden = J(path.join(exDir, f.replace('.input.', '.output.')));
  const fresh = core.compute(input, data);
  pass(eq(fresh, golden), `${f.replace('.input.', '.output.')} 与当前内核输出逐字一致（否则先跑 run-examples.js）`);
  const o = check(outputSchema, golden, f); pass(o.ok, `${f.replace('.input.', '.output.')} 符合 schema/output.json`, o.errs);
}

console.log('2) 契约枚举与数据表一致');
const inS = J(inputSchema), outS = J(outputSchema);
const D = outS.definitions;
const SECTORS = Object.keys(data.sectors);
pass(eq(D.axisKey.enum, data.axes.items.map((a) => a.key)), '四维 key 枚举 = axes.json');
pass(eq(D.groupKey.enum, data.conditions.groups.map((g) => g.key)), '痛点分组枚举 = conditions.json');
pass(eq(D.cost.enum, data.reportText.investment.tiers.map((t) => t.key)), '投入档枚举 = report-text.json 四档');
pass(eq(D.module.enum, Object.keys(data.credits.perRun)), '模块名枚举 = credits.json 的 11 个模块');
const sysField = data.fields.filter((f) => f.key === 'systems')[0];
pass(eq(D.system.enum, sysField.options.filter((o) => o.v !== 'none').map((o) => o.v)), '业务系统枚举 = 画像字段表（不含「无」）');
const presetKeys = data.axes.presets.map((p) => p.key).concat(['custom']);
pass(eq(D.success.properties.weights.properties.preset.enum, presetKeys), `权重预设枚举 = axes.json 的 ${data.axes.presets.length} 个预设 + custom`);
data.conditions.fields.forEach((f) => {
  pass(eq(inS.properties.conditions.properties[f.key].enum, f.options.map((o) => o.v)), `conditions.${f.key} 枚举 = conditions.json（${f.options.length} 项）`);
});
const rng = data.conditions.painRange;
pass(inS.properties.pains.minItems === rng.min && inS.properties.pains.maxItems === rng.max, `pains 项数 ${rng.min}–${rng.max} = conditions.json 的 painRange`);
const sceneCounts = SECTORS.map((k) => data.sectors[k].scenes.length);
const painCounts = SECTORS.map((k) => data.sectors[k].pains.length);
pass(sceneCounts.every((n) => n === outS.definitions.success.properties.meta.properties.sceneCount.const), `每个大类 ${sceneCounts[0]} 个场景，与契约一致（${SECTORS.length} 个大类）`);
pass(painCounts.every((n) => n === outS.definitions.success.properties.meta.properties.painCount.const), `每个大类 ${painCounts[0]} 条痛点，与契约一致`);
pass(D.success.properties.painLibrary.minItems === painCounts[0], 'painLibrary 项数 = 痛点库条数');
pass(D.success.properties.ranked.minItems === 8 && D.success.properties.excluded.minItems === sceneCounts[0] - 8, `排序表 8 个 + 未入选 ${sceneCounts[0] - 8} 个 = 候选 ${sceneCounts[0]} 个`);
pass(eq(D.success.properties.readiness.properties.systems.minItems, D.system.enum.length), '就绪度矩阵列数 = 业务系统数');

console.log('3) 契约常量与内核一致');
pass(outS.definitions.success.properties.meta.properties.credits.const === core.CREDITS && core.CREDITS === data.credits.perRun[core.MODULE_NAME], `积分 ${core.CREDITS} = credits.json[${core.MODULE_NAME}]`);
pass(new RegExp(outS.definitions.success.properties.meta.properties.version.pattern).test(core.VERSION), `内核版本 ${core.VERSION} 匹配契约版本约束`);
pass(outS.definitions.success.properties.meta.properties.module.const === core.MODULE_NAME, '模块名常量 = 内核 MODULE_NAME');
pass(eq(D.phaseKey.enum, core.PHASES.map((p) => p.key)), '批次 key 枚举 = 内核 PHASES');
const g1 = J(path.join(exDir, 'S1.output.json'));
pass(g1.formula === data.axes.formula, '输出的 formula = axes.json 的 DM 定稿公式');
const wsum = data.axes.items.reduce((t, a) => t + a.weight, 0);
pass(Math.abs(wsum - 1) < 1e-9, `四维默认权重之和 = 1（${data.axes.items.map((a) => a.weight).join(' + ')}）`);
const skill = fs.readFileSync(path.join(here, 'SKILL.md'), 'utf8');
pass(new RegExp('^version: ' + core.VERSION.replace(/\./g, '\\.') + '$', 'm').test(skill), `SKILL.md 头部 version = ${core.VERSION}`);
pass(new RegExp('^credits: ' + core.CREDITS + '$', 'm').test(skill), `SKILL.md 头部 credits = ${core.CREDITS}`);
pass(skill.includes(data.axes.formula), 'SKILL.md 正文写明 DM 定稿评分公式');

console.log('4) 反例被 schema 拒绝');
const base = J(path.join(exDir, 'S1.input.json'));
const bad = [
  ['痛点只勾 2 项', (i) => { i.pains = i.pains.slice(0, 2); }, 'pains 需为 3–8 项'],
  ['痛点勾 9 项', (i) => { while (i.pains.length < 9) i.pains.push({ id: 'mfg-p' + String(i.pains.length + 1).padStart(2, '0'), severity: 3 }); }, 'pains 需为 3–8 项'],
  ['严重度越界', (i) => { i.pains[0].severity = 6; }, 'pains[0].severity 需为 1–5'],
  ['痛点 id 格式非法', (i) => { i.pains[0].id = 'mfg-p99'; }, 'pains[0].id 不在本行业痛点库中'],
  ['缺 conditions.objective', (i) => { delete i.conditions.objective; }, 'conditions.objective 缺失或无效'],
  ['conditions 取值非法', (i) => { i.conditions.window = 'm24'; }, 'conditions.window 缺失或无效'],
  ['权重为负', (i) => { i.weights = { pain: -0.1, data: 0.4, cycle: 0.4, barrier: 0.3 }; }, 'weights 四项需为 0–1 的数值'],
  ['systems 含「无」又含其他', (i) => { i.profile.systems = ['none', 'erp']; }, 'profile.systems 选「无」时不能再选其他系统'],
  ['多出字段', (i) => { i.profile.extra = 1; }, null]
];
for (const [label, mod, kernelErr] of bad) {
  const input = JSON.parse(JSON.stringify(base)); mod(input);
  const r = check(inputSchema, input, label);
  pass(!r.ok, `${label} → schema 拒绝（${r.errs[0] || ''}）`);
  const c = core.compute(input, data);
  if (!kernelErr) { pass(c.ok === true, `${label} → 内核忽略多余字段照常计算（由输入补全层拦截）`); continue; }
  const fchk = check(outputSchema, c, label);
  pass(c.ok === false && fchk.ok && (c.errors || []).some((e) => e === kernelErr), `${label} → 内核同样拒绝：${kernelErr}`, fchk.errs.concat(c.errors || []));
}

console.log('5) 跨字段约束：schema 表达不了，由内核兜底');
const kernelOnly = [
  ['痛点不属于本行业', (i) => { i.pains[0].id = 'trade-p01'; }, 'pains[0].id 不在本行业痛点库中', 'id 是否属于 profile.industry 所在大类，需要跨字段比对'],
  ['痛点重复', (i) => { i.pains[1].id = i.pains[0].id; }, 'pains 存在重复项', 'uniqueItems 比的是整个对象，同 id 不同严重度不算重复'],
  ['权重全 0', (i) => { i.weights = { pain: 0, data: 0, cycle: 0, barrier: 0 }; }, 'weights 之和需大于 0', 'draft-07 无法表达四项之和的约束']
];
for (const [label, mod, kernelErr, why] of kernelOnly) {
  const input = JSON.parse(JSON.stringify(base)); mod(input);
  const r = check(inputSchema, input, label);
  pass(r.ok, `${label} → schema 按设计放行（${why}）`);
  const c = core.compute(input, data);
  const fchk = check(outputSchema, c, label);
  pass(c.ok === false && fchk.ok && (c.errors || []).some((e) => e === kernelErr), `${label} → 内核拦截：${kernelErr}`, fchk.errs.concat(c.errors || []));
}

console.log(failed ? `\n校验失败 ${failed} 项` : '\n契约校验全部通过');
process.exitCode = failed ? 1 : 0;
