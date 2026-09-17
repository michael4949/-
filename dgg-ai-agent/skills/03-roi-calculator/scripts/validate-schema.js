// 契约校验：schema/input.json · schema/output.json 与内核、数据表、golden 样例是否一致
//   1) 四套样例的 input / output 分别通过 input.json / output.json，且 golden 与当前内核逐字一致
//   2) 契约枚举与数据表一致：杠杆 key、订阅档、私域档、投入档、置信度分档、场景映射条数
//   3) 契约常量（积分、版本、DM 价目）与内核、credits.json、SKILL.md 一致
//   4) 反例必须被拒绝：版本非法 / 套数越界 / 私域取了 DM 上没有的值 / 缺投入方案 / 多出字段
//   5) 口径纪律：主杠杆核心量不得有默认值；省下的工时不得计入现金口径
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
const ex = path.join(here, 'examples');
const C = data.constants, LV = data.levers;

console.log('1) 四套样例过 schema，且 golden 与当前内核逐字一致');
['S1', 'S2', 'S3', 'S4'].forEach((k) => {
  const input = J(path.join(ex, k + '.input.json'));
  const golden = J(path.join(ex, k + '.output.json'));
  const ri = check(path.join(here, 'schema', 'input.json'), input, k);
  pass(ri.ok, `${k}.input.json 符合 schema/input.json`, ri.errs);
  const fresh = core.compute(input, data);
  pass(eq(fresh, golden), `${k}.output.json 与当前内核输出逐字一致（否则先跑 run-examples.js）`);
  const ro = check(path.join(here, 'schema', 'output.json'), golden, k);
  pass(ro.ok, `${k}.output.json 符合 schema/output.json`, ro.errs);
});

console.log('2) 契约枚举与数据表一致');
const outS = J(path.join(here, 'schema', 'output.json'));
const inS = J(path.join(here, 'schema', 'input.json'));
pass(eq(outS.definitions.leverKey.enum.slice().sort(), LV.items.map((x) => x.key).sort()),
  `杠杆枚举 = levers.json 的 ${LV.items.length} 条`);
pass(eq(inS.properties.plan.properties.tier.enum, C.prices.subscription.map((x) => x.key)),
  `订阅档枚举 = constants.json 的 ${C.prices.subscription.length} 档`);
pass(eq(inS.properties.plan.properties.privateDeploy.enum, C.prices.privateDeploy.map((x) => x.key)),
  '私域档枚举 = constants.json 的两个 DM 锚点');
pass(eq(outS.definitions.success.properties.confidence.properties.band.enum, C.confidence.bands.map((b) => b.key)),
  '置信度分档枚举 = constants.json');
pass(Object.keys(data.sceneLevers.map).length === 182, `场景映射 ${Object.keys(data.sceneLevers.map).length} 条 = 场景库 182 个`);
const inputFields = Object.keys(inS.properties.gain.properties).sort();
const leverFields = [...new Set(LV.items.flatMap((x) => x.fields.map((f) => f.key)))].sort();
pass(eq(inputFields, leverFields), `gain 字段 ${inputFields.length} 个 = 七条杠杆声明的字段并集`);

console.log('3) 契约常量与内核、credits.json、SKILL.md 一致');
pass(outS.definitions.success.properties.meta.properties.credits.const === core.CREDITS
  && core.CREDITS === data.credits.perRun[core.MODULE_NAME], `积分 ${core.CREDITS} = credits.json[${core.MODULE_NAME}]`);
pass(new RegExp(outS.definitions.success.properties.meta.properties.version.pattern).test(core.VERSION),
  `内核版本 ${core.VERSION} 匹配契约版本约束`);
pass(outS.definitions.success.properties.meta.properties.horizon.const === C.horizonMonths,
  `测算期 ${C.horizonMonths} 个月 = constants.json`);
const skill = fs.readFileSync(path.join(here, 'SKILL.md'), 'utf8');
pass(new RegExp('^version: ' + core.VERSION.replace(/\./g, '\\.') + '$', 'm').test(skill), `SKILL.md 头部 version = ${core.VERSION}`);
pass(new RegExp('^credits: ' + core.CREDITS + '$', 'm').test(skill), `SKILL.md 头部 credits = ${core.CREDITS}`);
const dmPrices = [0, 1280, 2280, 3280];
pass(eq(C.prices.subscription.map((x) => x.yearly), dmPrices), 'DM 订阅价目 0 / 1280 / 2280 / 3280 一字不改');
pass(C.prices.diagnosisPerDay === 1980, 'DM 入企诊断 1980 元一字不改');
pass(eq(C.prices.privateDeploy.map((x) => x.yearly), [12800, 33800]),
  '私域部署只取 DM 的两个锚点 12800 / 33800，不取区间中间值');

console.log('4) 反例被拒绝');
const base = J(path.join(ex, 'S1.input.json'));
const bad = (mut, label, expectField) => {
  const v = JSON.parse(JSON.stringify(base)); mut(v);
  const r = check(path.join(here, 'schema', 'input.json'), v, '');
  pass(!r.ok, `${label} → schema 拒绝` + (r.errs[0] ? `（${r.errs[0]}）` : ''));
  const c = core.compute(v, data);
  const hit = !c.ok && (!expectField || c.errors.some((e) => e.field === expectField));
  pass(hit, `${label} → 内核返回 ok=false` + (c.ok ? '（实际通过了）' : `（${c.errors[0].msg}）`));
};
bad((v) => { v.plan.tier = 'pro'; }, '订阅档不在 DM 四档内', 'plan.tier');
bad((v) => { v.plan.seats = 0; }, '套数为 0', 'plan.seats');
bad((v) => { v.plan.privateDeploy = 'mid'; }, '私域取了 DM 上没有的中间档', 'plan.privateDeploy');
bad((v) => { v.plan.setupSalary = 100; }, '推进人月薪越界', 'plan.setupSalary');
{
  const v = JSON.parse(JSON.stringify(base)); delete v.plan;
  pass(!check(path.join(here, 'schema', 'input.json'), v, '').ok, '缺 plan → schema 拒绝');
  pass(!core.compute(v, data).ok, '缺 plan → 内核拒绝');
}
{
  const v = JSON.parse(JSON.stringify(base)); v.extra = 1;
  pass(!check(path.join(here, 'schema', 'input.json'), v, '').ok, '多出字段 → schema 拒绝');
  pass(core.compute(v, data).ok, '多出字段 → 内核忽略多余字段照常计算（由输入补全层拦截）');
}

console.log('5) 口径纪律');
{
  // 主杠杆核心量不给默认值：把收益端清空，必须走 insufficient，而不是编一个数出来
  const v = JSON.parse(JSON.stringify(base)); v.gain = {};
  const r = core.compute(v, data);
  pass(r.ok && r.insufficient === true, '收益端全空 → insufficient=true，只出投入侧');
  pass(r.ok && r.payback === null && r.paybackAll === null, '收益端全空 → 不给回收期');
  pass(r.ok && r.missing.length > 0, `收益端全空 → 列出缺哪几项（${r.ok ? r.missing.length : 0} 项）`);
  pass(r.ok && r.benefit.fullMonthly === 0, '收益端全空 → 月收益为 0，不拿参考值顶上');
}
{
  const s3 = J(path.join(ex, 'S3.output.json'));
  const hoursLever = s3.benefit.levers.filter((x) => x.key === 'hours')[0];
  pass(hoursLever && hoursLever.cash === false, '省下的工时标记为非现金');
  pass(s3.benefit.cashMonthly === 0 && s3.benefit.hoursMonthly > 0, 'S3 是纯工时场景：现金收益 0、工时收益单列');
  pass(s3.payback === null, 'S3 现金口径 24 期内不转正');
  pass(/不产生可确认的现金效益/.test(s3.verdict.headline),
    'S3 纯工时场景：结论说明现金口径不可能转正的成因，并给出合并立项的建议，不含糊带过');
}
{
  // 投报率失真护栏：用一组极小投入的合成输入直接验证，不依赖某个样例恰好落在该区间
  const tiny = { profile: J(path.join(ex, 'S2.input.json')).profile,
                 plan: { sceneId: 'trade-s01', tier: 'std', seats: 1, diagnosisDays: 0, customBudget: 0,
                         dataState: 'system', setupPeople: 1, setupSalary: 6000 },
                 gain: { dealsMonthly: 200, dealValue: 20000, grossMargin: 0.3, opsPeople: 3, opsHoursPerDay: 3, opsSalary: 6000 } };
  const tr = core.compute(tiny, data);
  pass(tr.ok && tr.roi.meaningful === false && tr.roi.note.length > 0,
    `投入基数极小（${tr.ok ? tr.roi.inv12 : '?'} 元）、回报率 ${tr.ok ? tr.roi.roi12 : '?'}% → 标记为失去参考意义并给出说明`);
}
{
  // 投入侧的规模推导：不填套数与另议项时按参考值取值，且明细与合计始终对得上
  const s1 = J(path.join(ex, 'S1.output.json'));
  pass(s1.invest.seatsSource === 'benchmark' && s1.invest.seats > 3,
    `S1 未填套数 → 按规模推导表取 ${s1.invest.seats} 套并标为参考值`);
  pass(s1.inputSource.seats === 'benchmark' && s1.inputSource.customBudget === 'benchmark',
    'S1 的套数与另议项在 inputSource 里标为 benchmark，报告逐处可追溯');
  const sumCustom = s1.invest.customItems.reduce((a, b) => a + b.amount, 0);
  const customLine = s1.invest.cashItems.filter((x) => x.key === 'custom')[0];
  pass(customLine && sumCustom === customLine.amount,
    `另议项四个科目合计 ${sumCustom} 元 = 计列总额 ${customLine ? customLine.amount : '?'} 元`);
  pass(s1.invest.shareVerdict === 'in',
    `S1 首年投入占营收 ${s1.invest.revenueShare}%，落在常见区间 ${s1.invest.shareBandLow}–${s1.invest.shareBandHigh}% 之内`);
  const s4 = J(path.join(ex, 'S4.output.json'));
  const pdLine = s4.invest.cashItems.filter((x) => x.key === 'pd')[0];
  const pdPrices = data.constants.prices.privateDeploy.map((x) => x.yearly);
  pass(pdLine && pdPrices.indexOf(pdLine.amount) >= 0,
    `私域部署按一套部署计列 ${pdLine ? pdLine.amount : '?'} 元，取 DM 区间端点 ${pdPrices.join(' / ')}，不乘套数`);
}
{
  // 多杠杆的主次由算出的金额决定，与 roiBasis 的行文顺序无关
  const s1 = J(path.join(ex, 'S1.output.json'));
  const ls = s1.benefit.levers;
  pass(ls.length < 2 || ls[0].monthly >= ls[1].monthly, '多条杠杆按算出的金额降序，第一条全额、其余按 35%');
  pass(ls.every((x, i) => x.weight === (i === 0 ? 1 : 0.35)), '合并权重只有 1 与 0.35 两种');
}

console.log(failed ? `\n校验失败 ${failed} 项` : '\n契约校验全部通过');
process.exit(failed ? 1 : 0);
