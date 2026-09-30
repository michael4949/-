// 契约校验：schema/input.json · schema/output.json · _shared/company-profile.schema.json 与内核、数据表、golden 样例是否一致
//   1) 四套样例的 input / output 分别通过 input.json / output.json
//   2) 画像 schema 是生成物：与 profile-fields.json、industries.json 逐项一致
//   3) 契约常量（题数、总分、积分、版本、模块名）与内核、数据表一致
//   4) 反例必须被拒绝：多一题、行业无效、systems 同时含「无」与其他项、答案越界；内核对反例返回的 ok=false 也要符合 failure 形态
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
const profileSchema = path.join(shared, 'company-profile.schema.json');

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

console.log('2) 画像 schema 与数据表一致');
const ps = J(profileSchema);
const pf = J(path.join(shared, 'profile-fields.json'));
const slugs = data.industries.sectors.flatMap((s) => s.industries.map((i) => i.slug));
pass(eq(ps.properties.industry.enum, slugs), `industry 枚举 = industries.json 的 ${slugs.length} 个细分 slug`);
pass(eq(Object.keys(ps.properties), pf.fields.map((f) => f.key)), '字段集合与顺序 = profile-fields.json');
pass(eq(ps.required, pf.fields.filter((f) => f.required).map((f) => f.key)), '必填集合 = profile-fields.json 的 required');
pf.fields.filter((f) => f.options).forEach((f) => {
  const en = f.type === 'multi' ? ps.properties[f.key].items.enum : ps.properties[f.key].enum;
  pass(eq(en, f.options.map((o) => o.v)), `${f.key} 枚举 = 选项表（${f.options.length} 项）`);
});
pass(eq(ps.properties.province.examples, pf.provinces), 'province 示例 = 省份表');

console.log('3) 契约常量与内核一致');
const inS = J(inputSchema), outS = J(outputSchema);
pass(inS.properties.answers.minItems === data.questions.length && inS.properties.answers.maxItems === data.questions.length, `answers 项数 = 题数 ${data.questions.length}`);
pass(outS.definitions.success.properties.max.const === data.questions.length * 3, `总分 = 题数 × 3 = ${data.questions.length * 3}`);
pass(outS.definitions.success.properties.meta.properties.credits.const === core.CREDITS && core.CREDITS === data.credits.perRun[core.MODULE_NAME], `积分 ${core.CREDITS} = credits.json[${core.MODULE_NAME}]`);
pass(new RegExp(outS.definitions.success.properties.meta.properties.version.pattern).test(core.VERSION), `内核版本 ${core.VERSION} 匹配契约版本约束`);
pass(eq(outS.definitions.module.enum, Object.keys(data.credits.perRun)), '模块名枚举 = credits.json 的 11 个模块');
pass(eq(outS.definitions.dimKey.enum, data.dimensions.map((d) => d.key)), '维度 key 枚举 = dimensions.json');
pass(eq(outS.definitions.levelCode.enum, data.levels.map((l) => l.code)) && eq(outS.definitions.levelName.enum, data.levels.map((l) => l.name)), '等级枚举 = levels.json');
pass(eq(outS.definitions.cost.enum, data.reportText.investment.tiers.map((t) => t.key)), '投入档枚举 = report-text.json 的四档');
const skill = fs.readFileSync(path.join(here, 'SKILL.md'), 'utf8');
pass(new RegExp('^version: ' + core.VERSION.replace(/\./g, '\\.') + '$', 'm').test(skill), `SKILL.md 头部 version = ${core.VERSION}`);
pass(new RegExp('^credits: ' + core.CREDITS + '$', 'm').test(skill), `SKILL.md 头部 credits = ${core.CREDITS}`);

console.log('4) 反例被拒绝');
const base = J(path.join(exDir, 'S1.input.json'));
const bad = [
  ['多一题', { ...base, answers: base.answers.concat(0) }],
  ['答案越界', { ...base, answers: base.answers.map((a, i) => (i === 0 ? 4 : a)) }],
  ['行业无效', { ...base, profile: { ...base.profile, industry: 'mfg' } }],
  ['systems 含「无」又含其他', { ...base, profile: { ...base.profile, systems: ['none', 'erp'] } }],
  ['缺必填 revenue', { ...base, profile: (({ revenue, ...rest }) => rest)(base.profile) }],
  ['多出字段', { ...base, profile: { ...base.profile, extra: 1 } }]
];
for (const [label, input] of bad) {
  const r = check(inputSchema, input, label);
  pass(!r.ok, `${label} → schema 拒绝（${r.errs[0] || ''}）`);
  const c = core.compute(input, data);
  const f = check(outputSchema, c, label);
  if (label === '多出字段') pass(c.ok === true, `${label} → 内核忽略多余字段照常计算（由输入补全层拦截）`);
  else pass(c.ok === false && f.ok, `${label} → 内核返回 ok=false 且符合 failure 形态（${(c.errors || []).join('；')}）`, f.errs);
}

console.log(failed ? `\n校验失败 ${failed} 项` : '\n契约校验全部通过');
process.exitCode = failed ? 1 : 0;
