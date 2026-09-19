// 内核自检：对三套样本做结构与逻辑断言（源码确定性、词典、对象库、流程模板、预置句、确定性与不改原样本、世界一致性、运行时守卫、用例、追加需求、发布流水、文案禁词、examples 一致）。
// 改内核或样本后先跑 run-examples 再跑这里。若某条断言因内核缺陷不成立：写成 TODO 注释跳过并在结果里报告，不削弱断言、不改内核。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const K = require('../core/build.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schema', 'data.json'), 'utf8'));
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const AVOID = /刀|承诺|必须|姓名/;
const lintText = (t, where) => { const s = String(t == null ? '' : t); const hits = lint.hard(s); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); ok(!AVOID.test(s), where + ' 含回避词 ' + s.slice(0, 80)); };
const clean = (t, where) => { const s = String(t == null ? '' : t); ok(!/\{\w+\}|undefined|NaN/.test(s), where + ' 文本异常 ' + s.slice(0, 120)); lintText(s, where); };
const multiset = (a) => a.slice().sort().join(',');
const J = (x) => JSON.stringify(x);
const containsAll = (big, small) => { const pool = big.slice(); return small.every((x) => { const i = pool.indexOf(x); if (i < 0) return false; pool.splice(i, 1); return true; }); };
// 深度检查：状态里不得有函数 / undefined（保证可 JSON 序列化）
const unserializable = (v, p, out) => { out = out || []; if (v === undefined || typeof v === 'function') out.push(p + ':' + typeof v); else if (v && typeof v === 'object') Object.keys(v).forEach((k) => unserializable(v[k], p + '.' + k, out)); return out; };
const serializable = (d, where) => { const top = Object.keys(d.state).filter((k) => d.state[k] === undefined || typeof d.state[k] === 'function'); ok(top.length === 0, where + ' 状态顶层有函数 / undefined: ' + top.join(',')); const deep = unserializable(d.state, 'state'); ok(deep.length === 0, where + ' 状态不可序列化: ' + deep.slice(0, 3).join(',')); ok(J(JSON.parse(J(d.state))) === J(d.state), where + ' 状态序列化往返不一致'); };

// ---------- 简单 JSON Schema 检查（只做 required / type / enum / pattern / additionalProperties / items / minItems，不引第三方库） ----------
function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v; }
function checkSchema(sc, v, where, errs) {
  if (sc.$ref) sc = schema.definitions[sc.$ref.replace('#/definitions/', '')];
  if (sc.type) { const ts = [].concat(sc.type), t = typeOf(v); if (ts.indexOf(t) < 0 && !(t === 'number' && ts.indexOf('integer') >= 0 && Number.isInteger(v))) { errs.push(where + ' 类型应为 ' + ts.join('|') + '，实为 ' + t); return; } }
  if (sc.enum && sc.enum.indexOf(v) < 0) errs.push(where + ' 取值 ' + v + ' 不在 ' + sc.enum.join('/'));
  if (sc.pattern && typeof v === 'string' && !new RegExp(sc.pattern).test(v)) errs.push(where + ' 不匹配 ' + sc.pattern);
  if (sc.minimum != null && typeof v === 'number' && v < sc.minimum) errs.push(where + ' 小于 ' + sc.minimum);
  if (sc.maximum != null && typeof v === 'number' && v > sc.maximum) errs.push(where + ' 大于 ' + sc.maximum);
  if (typeOf(v) === 'object') {
    (sc.required || []).forEach((k) => { if (!(k in v)) errs.push(where + ' 缺 ' + k); });
    Object.keys(v).forEach((k) => { if (sc.properties && sc.properties[k]) checkSchema(sc.properties[k], v[k], where + '.' + k, errs); else if (sc.additionalProperties && typeof sc.additionalProperties === 'object') checkSchema(sc.additionalProperties, v[k], where + '.' + k, errs); else if (sc.additionalProperties === false) errs.push(where + ' 多余字段 ' + k); });
  }
  if (typeOf(v) === 'array') { if (sc.minItems != null && v.length < sc.minItems) errs.push(where + ' 少于 ' + sc.minItems + ' 项'); if (sc.maxItems != null && v.length > sc.maxItems) errs.push(where + ' 多于 ' + sc.maxItems + ' 项'); if (sc.items) v.forEach((x, i) => checkSchema(sc.items, x, where + '[' + i + ']', errs)); }
}

const ARCHES = ['make', 'flow', 'service'];
const ctxOf = (d) => ({ arche: d.archetype, company: d.company, systems: d.systems || [] });
const empTable = (arche) => arche === 'flow' ? lib.procSamples.flow.employees : lib.hrSamples[arche].employees;
const KNOWN_ACTIONS = ['submit', 'approve', 'reject', 'accept', 'assign', 'process', 'complete', 'lend', 'return', 'rate', 'issue', 'fix', 'recheck', 'close', 'view', 'remind', 'stat'];

// ---------- a. 内核源码：确定性、无浏览器 / 网络依赖 ----------
const srcRaw = fs.readFileSync(path.join(__dirname, '..', 'core', 'build.js'), 'utf8');
const src = srcRaw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); // 去掉注释只查代码（文件头注释本身写着「无 Date.now / Math.random」）
ok(srcRaw.length > src.length && src.indexOf('function parse(') > 0, '内核源码读取并去注释');
['Date.now', 'Math.random', 'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB', 'document.', 'innerHTML'].forEach((w) => ok(src.indexOf(w) < 0, '内核源码不得含 ' + w));
ok(typeof K.VERSION === 'string' && /^\d+\.\d+\.\d+$/.test(K.VERSION), '内核版本号');
ok(K.MODULE_NAME === 'AI软件开发' && K.CREDITS === 100, '内核模块名与积分');
ok(lib.credits.perRun[K.MODULE_NAME] === K.CREDITS && lib.credits.perRun['AI软件开发'] === 100, '积分表与内核一致');
ok(K.TODAY === '2026-09-17' && K.CLOCK0 === 540 && K.STEP_MIN === 15, '内核今日 / 时钟起点 / 步长');
ok(K.IDS.app === 'APP-001' && K.IDS.req === 'XQ-001' && K.IDS.spec === 'GG-001', '内核固定编号');
ok(/^https:\/\//.test(K.QR_BASE), '二维码地址 https');

// ---------- b. 词典 ----------
const LX = lib.lexicon, tplActionEns = {}; lib.flows.templates.forEach((tp) => tp.transitions.forEach((tr) => { tplActionEns[tr.actionEn] = 1; }));
ok(LX.negations.length > 0 && LX.connectors.length > 0 && LX.qtyUnits.length > 0, '词典否定词 / 连接词 / 数量单位非空');
LX.negations.concat(LX.connectors, LX.qtyUnits).forEach((w) => lintText(w, '词典辅助词 ' + w));
const seenSf = {}, dupSf = []; let nSurfaces = 0;
LX.terms.forEach((term) => {
  ok(term.key && term.type && Array.isArray(term.surfaces) && term.surfaces.length >= 1, '词条 ' + term.key + ' 结构');
  ok(['object', 'role', 'action', 'channel', 'field', 'stat', 'time', 'delta'].indexOf(term.type) >= 0, '词条 ' + term.key + ' 类型 ' + term.type);
  term.surfaces.forEach((s) => { nSurfaces++; const n = K.normalize(s); if (seenSf[n]) dupSf.push(n + '(' + seenSf[n] + '/' + term.key + ')'); seenSf[n] = term.key; lintText(s, '词典表面词 ' + term.key + ' ' + s); });
  const canons = typeof term.canon === 'object' ? Object.keys(term.canon).map((k) => term.canon[k]) : [term.canon];
  canons.forEach((c) => lintText(c, '词典规范名 ' + term.key));
  if (typeof term.canon === 'object') ok(ARCHES.every((a) => typeof term.canon[a] === 'string' && term.canon[a]), '词条 ' + term.key + ' 三业态规范名');
  if (term.type === 'object') ok(!!K.objOf(lib, term.key), '对象词 ' + term.key + ' 在对象库');
  if (term.type === 'action') ok(tplActionEns[term.key] || KNOWN_ACTIONS.indexOf(term.key) >= 0, '动作词 ' + term.key + ' 不在模板动作或解析器已知动作集');
  if (term.type === 'channel') ok(!!K.CHANNELS[term.key], '渠道词 ' + term.key);
  if (term.type === 'stat') ok(!!lib.deltas.statMetrics[term.key], '统计词 ' + term.key + ' 在 statMetrics');
  if (term.type === 'delta') ok(lib.deltas.types.some((t) => t.key === term.key), '变更词 ' + term.key + ' 在变更类型');
  if (term.type === 'time') ok(!!lib.deltas.timeStates[term.key], '时限词 ' + term.key + ' 在 timeStates');
});
ok(nSurfaces >= 200, '词典表面词 ≥ 200，实为 ' + nSurfaces);
ok(LX.terms.filter((t) => t.type === 'object').length === 30, '对象词 30 个');
ok(lib.objects.objects.every((o) => LX.terms.some((t) => t.type === 'object' && t.key === o.key)), '每个对象都有对象词');
ok(dupSf.length === 0, '词典表面词全局唯一: ' + dupSf.join(','));

// ---------- c. 对象库 ----------
const OBJS = lib.objects.objects, controls = Object.keys(lib.components.controls);
const KNOWN_TITLES = {}; [lib.roles.admin].forEach((t) => { KNOWN_TITLES[t] = 1; }); Object.keys(lib.roles.defaults).forEach((a) => Object.keys(lib.roles.defaults[a]).forEach((f) => Object.keys(lib.roles.defaults[a][f]).forEach((sl) => { KNOWN_TITLES[lib.roles.defaults[a][f][sl]] = 1; }))); Object.keys(lib.roles.external).forEach((t) => { KNOWN_TITLES[t] = 1; }); LX.terms.filter((t) => t.type === 'role').forEach((t) => (typeof t.canon === 'object' ? Object.keys(t.canon).map((a) => t.canon[a]) : [t.canon]).forEach((c) => { KNOWN_TITLES[c] = 1; }));
ok(OBJS.length === 30, '对象 30 个，实为 ' + OBJS.length);
ok(new Set(OBJS.map((o) => o.key)).size === 30 && new Set(OBJS.map((o) => o.prefix)).size === 30, '对象 key 与流水号前缀唯一');
ok(OBJS.filter((o) => o.arche === 'common').length === 9 && OBJS.filter((o) => o.arche === 'make').length === 8 && OBJS.filter((o) => o.arche === 'flow').length === 6 && OBJS.filter((o) => o.arche === 'service').length === 7, '对象分布 通用 9 · 制造 8 · 贸易 6 · 服务 7');
OBJS.forEach((o) => {
  const w = '对象 ' + o.key;
  ok(/^[A-Z]{2}$/.test(o.prefix) && o.name && o.verb && o.short, w + ' 前缀 / 名称 / 动词 / 简称');
  ok(!!K.tplOf(lib, o.flow), w + ' 模板 ' + o.flow + ' 存在');
  ok(['common'].concat(ARCHES).indexOf(o.arche) >= 0, w + ' 业态 ' + o.arche);
  ok(o.fields.length >= 5, w + ' 字段 ≥ 5，实为 ' + o.fields.length);
  ok(o.optional.length >= 2, w + ' 可选字段 ≥ 2，实为 ' + o.optional.length);
  ok(o.fields.some((f) => f.ref || f.type === 'member'), w + ' 至少一个主数据 / 成员字段');
  ok(new Set(o.fields.concat(o.optional).map((f) => f.key)).size === o.fields.length + o.optional.length, w + ' 字段 key 唯一');
  lintText(o.name + '|' + o.verb + '|' + o.short + '|' + (o.ruleText || ''), w + ' 名称');
  o.fields.concat(o.optional).forEach((f) => {
    ok(typeof f.label === 'string' && f.label && typeof f.type === 'string' && ('example' in f), w + ' 字段 ' + f.key + ' 缺 label / type / example');
    ok(controls.indexOf(f.type) >= 0, w + ' 字段 ' + f.key + ' 类型 ' + f.type + ' 不在控件表');
    lintText(f.label, w + ' 字段标签 ' + f.key);
    if (/元/.test(f.label)) ok(/预计/.test(f.label), w + ' 字段 ' + f.key + ' 含元须标预计: ' + f.label);
    if (f.ref) ok(!!lib.integrations.sources[f.ref], w + ' 字段 ' + f.key + ' 主数据来源 ' + f.ref);
    if (f.type === 'select') ok(Array.isArray(f.options) && f.options.length >= 2 && f.options.indexOf(f.example) >= 0, w + ' 字段 ' + f.key + ' 选项含示例');
    if (f.type === 'member' && !f.auto) ok(true, w + ' 成员字段 ' + f.key);
    if (f.type === 'member' && f.example && f.example.charAt(0) !== '@') ok(/^E-\d{3}$/.test(String(f.example)) || KNOWN_TITLES[f.example], w + ' 成员字段示例只用 E-编号或职务 ' + f.example);
  });
  if (o.secondLevel) ok(o.fields.some((f) => f.key === o.secondLevel.field) && typeof o.secondLevel.gte === 'number' && o.secondLevel.text, w + ' 二级审批阈值字段存在');
  if (o.initialRule) ok(o.fields.some((f) => f.key === o.initialRule.field) && o.flow === 'inspect', w + ' 初始规则字段存在');
  if (o.tail) ok(o.flow === 'approve' && o.tail.lent, w + ' 领用尾流程');
  if (o.roles) Object.keys(o.roles).forEach((a) => ok(ARCHES.indexOf(a) >= 0, w + ' 角色覆盖业态 ' + a));
});

// ---------- d. 流程模板 ----------
lib.flows.templates.forEach((tp) => {
  const w = '模板 ' + tp.key;
  ok(tp.states.filter((s) => s.initial).length === 1, w + ' 初始节点唯一');
  ok(tp.states.some((s) => s.terminal), w + ' 至少一个终止节点');
  ok(Array.isArray(tp.signature) && tp.signature.length >= 3 && tp.slots.join() === K.SLOT_ORDER.join(), w + ' 签名与槽位');
  const tk = {};
  tp.transitions.forEach((tr) => { ok(tr.by.length >= 1, w + ' 迁移 ' + tr.key + ' 执行角色非空'); const kk = tr.from + '|' + tr.actionEn + '|' + (tr.when || ''); ok(!tk[kk], w + ' 迁移 (from, actionEn, when) 重复 ' + kk); tk[kk] = 1; ok(tp.states.some((s) => s.key === tr.from) && tp.states.some((s) => s.key === tr.to), w + ' 迁移 ' + tr.key + ' 节点存在'); lintText(tr.action, w + ' 迁移文案 ' + tr.key); });
  tp.states.forEach((s) => lintText(s.label, w + ' 节点 ' + s.key));
  const sl = lib.flows.slotLabels[tp.key]; ok(sl && tp.slots.concat(['admin']).every((s) => sl[s]), w + ' slotLabels 齐全');
  tp.pages.forEach((p) => { ok(p.key && p.kind && p.name && p.device && p.roles.length, w + ' 页面 ' + p.key); ok(!!lib.components.pageKinds[p.kind], w + ' 页面种类 ' + p.kind); });
  ok(tp.pages.length >= 5 && tp.pages.some((p) => p.kind === 'form') && tp.pages.some((p) => p.kind === 'board') && tp.pages.some((p) => p.kind === 'admin'), w + ' 页面 ≥ 5 含表单 / 看板 / 管理');
  Object.keys(tp.actionSlots).forEach((a) => ok(tp.slots.indexOf(tp.actionSlots[a]) >= 0, w + ' actionSlots ' + a));
});

// ---------- e. 预置句 ----------
ok(Array.isArray(lib.presets.unrelated) && lib.presets.unrelated.length >= 3, '无关句 ≥ 3');
const fallbackAliases = [];
ARCHES.forEach((a) => {
  const ps = K.presetsOf(lib, a), fus = K.followUpsOf(lib, a);
  ok(ps.length === 4 && fus.length === 3, a + ' 预置 4 句 + 追加 3 句');
  ps.forEach((p, i) => {
    const w = a + ' 预置 ' + i;
    const q = K.parse(p.text, lib, a);
    ok(q.object === p.expect.object && q.flow === p.expect.flow, w + ' 解析 ' + q.object + '/' + q.flow + ' 期望 ' + J(p.expect));
    if (p.expect.mode) ok(q.flowMode === p.expect.mode, w + ' 模式 ' + q.flowMode + ' 期望 ' + p.expect.mode);
    ok(q.mode === 'exact' && q.preset === null && q.unknown === 0 && q.hits >= 5, w + ' exact / 未识别 0 / 命中 ≥ 5');
    ok(K.objOf(lib, p.key) && p.key === p.expect.object && p.script && Object.keys(p.script).length >= 3, w + ' key 与试用预填');
    lintText(p.text, w + ' 句子');
    (p.aliases || []).forEach((al) => { const r = K.parse(al, lib, a); ok(r.object === p.expect.object && r.flow === p.expect.flow, w + ' 同义句「' + al + '」→ ' + r.object + '/' + r.flow); if (r.mode !== 'exact') fallbackAliases.push(a + '/' + al); lintText(al, w + ' 同义句'); });
    ok((p.aliases || []).length >= 3, w + ' 同义句 ≥ 3');
  });
  lib.presets.unrelated.forEach((u) => { const un = K.parse(u, lib, a); ok(un.mode === 'fallback' && un.preset === 0 && un.object === ps[0].expect.object, a + ' 无关句「' + u + '」→ ' + un.mode + '/' + un.preset); });
  fus.forEach((f, j) => lintText(f.text + (f.aliases || []).join(''), a + ' 追加句 ' + j));
});
ok(fallbackAliases.length === 0, '所有同义句都靠对象词精确解析: ' + fallbackAliases.join('；'));
// 词替换变体：维修工 → 设备员，加「拍照」仍是报修 / 派单，照片字段在
{
  const v = K.parse('车间扫码提报设备故障并拍照，维修工接单处理，生产主管看停机与处理时效', lib, 'make');
  ok(v.object === 'repair' && v.flow === 'dispatch' && v.flowMode === 'accept' && v.mode === 'exact', 'make 变体句仍是 repair / dispatch');
  ok(v.roles.filter((r) => r.slot === 'handler')[0].title === '设备员' && v.roles.filter((r) => r.slot === 'handler')[0].hit === '设备员' && v.evidence.some((e) => e.type === 'role' && e.surface === '维修工' && e.canon === '设备员' && e.slot === 'handler'), 'make 变体句 维修工 → 设备员');
  ok(v.evidence.some((e) => e.type === 'field' && e.key === 'photo' && !e.neg), 'make 变体句识别到照片');
  const vs = K.plan(v, lib, { arche: 'make', company: '', systems: [] });
  ok(vs.fields.some((f) => f.key === 'photo' && f.type === 'photo') && vs.fields.some((f) => f.key === 'downtime'), 'make 变体句规格含照片与停机影响');
  const neg = K.parse('车间扫码报修，不要照片，设备员接单处理，生产主管看时效', lib, 'make');
  ok(neg.removedFields.indexOf('photo') >= 0 && K.plan(neg, lib, { arche: 'make' }).fields.every((f) => f.key !== 'photo'), 'make 否定句去掉照片');
}

// ---------- 各业态样本 ----------
const sibBefore = J([lib.erpSamples, lib.procSamples, lib.hrSamples]);
ARCHES.forEach((k) => {
  const raw = lib.samples[k];
  ok(!!raw, k + ' 样本存在');
  const before = J(raw);
  // 0. schema 与世界一致性（g）
  const errs = []; checkSchema(schema, raw, k, errs); ok(errs.length === 0, k + ' schema: ' + errs.slice(0, 5).join('；'));
  ok(!/企查查|天眼查|启信宝|爱企查/.test(before), k + ' 样本数据源厂商名');
  ok(lint.hard(before).length === 0, k + ' 样本全文禁词 ' + lint.hard(before).join(','));
  ok(raw.today === '2026-09-17' && raw.today === K.TODAY, k + ' 样本今日');
  ok(raw.today === lib.erpSamples[k].today && raw.today === lib.procSamples[k].today && raw.today === lib.hrSamples[k].today, k + ' 今日与 AI ERP / AI流程提效 / AI人力官 样本对齐');
  ok(raw.company === lib.erpSamples[k].company && raw.company === lib.procSamples[k].company, k + ' 公司名与 AI ERP / AI流程提效 样本一致');
  ok(raw.clockMin === K.CLOCK0 && J(raw.state) === '{}' && Array.isArray(raw.systems), k + ' 时钟起点 540、state 空、systems 数组');
  const emps = {}; empTable(k).forEach((e) => { emps[e.id] = e.job; });
  const custs = {}; lib.erpSamples[k].orders.forEach((o) => { custs[o.customer] = 1; });
  const machines = {}; lib.procSamples[k].machines.forEach((m) => { machines[m.id] = 1; });
  Object.keys(lib.roles.emps[k] || {}).forEach((title) => { lib.roles.emps[k][title].forEach((id) => { ok(/^E-\d{3}$/.test(id) && emps[id] != null, k + ' 岗位 ' + title + ' 员工 ' + id + ' 在来源花名册'); ok(emps[id] === lib.roles.empJobs[title], k + ' 岗位 ' + title + ' 员工 ' + id + ' 岗位代码 ' + emps[id] + ' ≠ ' + lib.roles.empJobs[title]); }); });
  const seedKeys = Object.keys(raw.seed.byObject);
  ok(seedKeys.length === K.objectsFor(lib, k).length && seedKeys.every((key) => K.objOf(lib, key) && (K.objOf(lib, key).arche === 'common' || K.objOf(lib, key).arche === k)), k + ' 预埋覆盖本业态全部对象');
  seedKeys.forEach((key) => {
    const o = K.objOf(lib, key), rows = raw.seed.byObject[key], ids = {};
    ok(rows.length === (K.presetFor(lib, k, key) ? 8 : 4), k + ' ' + key + ' 预埋条数');
    rows.forEach((r) => {
      ok(r.id.indexOf(o.prefix + '-') === 0 && !ids[r.id], k + ' ' + key + ' 流水号 ' + r.id + ' 前缀 / 唯一'); ids[r.id] = 1;
      ok(r.history[0].actionEn === 'submit' && r.history[0].from === null && r.history[0].to === r.history[0].to && r.history.every((h, i) => h.seq === i + 1) && r.history.every((h, i) => i === 0 || h.atMin >= r.history[i - 1].atMin), k + ' ' + key + ' ' + r.id + ' 历史首条提交、序号与时间递增');
      ok(r.createdAt === r.history[0].atMin && r.updatedAt === r.history[r.history.length - 1].atMin && r.version === r.history.length, k + ' ' + key + ' ' + r.id + ' 创建 / 更新时间与版本对齐历史');
      ok(r.history[r.history.length - 1].to === r.status, k + ' ' + key + ' ' + r.id + ' 状态 = 最后一条历史');
      ok(r.createdBy.id === r.history[0].by && r.createdBy.title === r.history[0].role, k + ' ' + key + ' ' + r.id + ' 创建人 = 提交人');
      [r.createdBy.id].concat(r.history.map((h) => h.by), r.assignee ? [r.assignee] : []).forEach((id) => { if (/^E-/.test(id)) ok(/^E-\d{3}$/.test(id) && emps[id] != null, k + ' ' + key + ' ' + r.id + ' 人员 ' + id + ' 在来源花名册'); if (/^K-/.test(id)) ok(/^K-\d{3} · /.test(id) && custs[id], k + ' ' + key + ' ' + r.id + ' 客户 ' + id + ' 在 ERP 订单'); });
      Object.keys(r.values).forEach((fk) => {
        const v = r.values[fk], s = String(v == null ? '' : v), f = o.fields.concat(o.optional).filter((x) => x.key === fk)[0];
        ok(!!f, k + ' ' + key + ' ' + r.id + ' 字段 ' + fk + ' 在对象库');
        if (/^E-\d{3}$/.test(s)) ok(emps[s] != null, k + ' ' + key + ' ' + r.id + ' 员工值 ' + s + ' 在来源花名册');
        if (/^K-/.test(s)) ok(/^K-\d{3} · /.test(s) && custs[s], k + ' ' + key + ' ' + r.id + ' 客户值 ' + s + ' 在 ERP 订单');
        if (f && f.ref === 'machines' && v != null) ok(machines[s], k + ' ' + key + ' ' + r.id + ' 设备 ' + s + ' 在设备台账');
        if (f && f.type === 'member' && v != null) ok(/^E-\d{3}$/.test(s) || !!lib.roles.external[s] || s.indexOf('K-') === 0 || lib.roles.emps[k][s] === undefined, k + ' ' + key + ' ' + r.id + ' 成员值 ' + s);
        if (f && f.type === 'select' && v != null) ok(f.options.indexOf(s) >= 0, k + ' ' + key + ' ' + r.id + ' 选项值 ' + s);
        ok(!/姓名|承诺/.test(s), k + ' ' + key + ' ' + r.id + ' 值含回避词 ' + s.slice(0, 40));
      });
    });
  });
  // 1. 未生成时的预览
  const d0 = K.ensure(raw), R0 = K.run(d0, lib);
  ok(R0.spec === null && R0.preview && R0.preview.pages >= 5 && R0.preview.fields >= 5 && R0.preview.tests >= 15, k + ' 未生成时给预览');
  ok(R0.presets.length === 4 && R0.presets[0].active === true && R0.presets.slice(1).every((p) => !p.active) && R0.presets.every((p) => p.summary.pages >= 5), k + ' 预置卡片与激活');
  ok(J(R0.kpi) === J({ pages: R0.preview.pages, fields: R0.preview.fields, roles: R0.preview.roles, states: R0.preview.states, apis: R0.preview.apis, tests: R0.preview.tests }), k + ' 未生成时 kpi = 预览');
  ok(['machines', 'employees', 'customers', 'products'].every((s) => R0.refs[s] && R0.refs[s].count > 0 && R0.refs[s].mode === 'import'), k + ' 主数据元信息（无现有系统 → 导入）');
  const dSys = K.ensure(Object.assign({}, raw, { systems: ['erp', 'hr', 'mes'] })); ok(K.run(dSys, lib).refs.employees.mode === 'direct' && K.run(dSys, lib).refs.customers.mode === 'direct', k + ' 有现有系统 → 直连');
  // 2. 每个对象：解析 → 规划 → 页面 / 字典 / 接口 / 用例 → 真实执行（c/d）
  K.objectsFor(lib, k).forEach((o) => {
    const w = k + ' 对象 ' + o.key;
    const pr = K.parse(o.name, lib, k);
    ok(pr.object === o.key && pr.mode === 'exact', w + ' 名称解析 → ' + pr.object + '/' + pr.mode);
    const s = K.plan(pr, lib, ctxOf(d0));
    ok(s.objectKey === o.key && s.flow.key === o.flow && s.prefix === o.prefix && s.title === o.name && s.status === 'draft' && s.specVer === 'v0.1' && s.version === 'V1.0.0' && s.id === 'APP-001', w + ' 规格头');
    ok(s.states.filter((x) => x.initial).length === 1 && s.states.some((x) => x.terminal), w + ' 规格初始唯一、有终止');
    const tk = {}; s.transitions.forEach((tr) => { const kk = tr.from + '|' + tr.actionEn + '|' + (tr.when || ''); ok(!tk[kk] && tr.by.length >= 1 && tr.by.every((sl) => K.roleOfSlot(s, sl)), w + ' 迁移 ' + tr.key + ' 唯一且角色可解析'); tk[kk] = 1; });
    s.states.forEach((st) => {
      const reach = K.pathTo(s, st.key) != null || (st.key === 'ok' && !!s.initialRule);
      ok(reach, w + ' 节点 ' + st.key + ' 不可达');
      const q = [st.key], seen = {}; seen[st.key] = 1; let hit = false;
      while (q.length && !hit) { const cur = q.shift(); if (s.states.filter((x) => x.key === cur)[0].terminal) { hit = true; break; } s.transitions.forEach((tr) => { if (tr.from === cur && !seen[tr.to]) { seen[tr.to] = 1; q.push(tr.to); } }); }
      ok(hit, w + ' 节点 ' + st.key + ' 到不了终止');
      lintText(st.label, w + ' 节点文案 ' + st.key);
    });
    ok(s.roles.length >= 3 && s.roles[s.roles.length - 1].admin && s.roles.every((r) => r.title && r.label && r.slots.length), w + ' 角色含管理员');
    ok(s.roles.every((r) => r.emp == null || /^E-\d{3}$/.test(r.emp)) && s.roles.every((r) => !/E-\d{3}/.test(r.title)), w + ' 角色只用 E-编号，职务不含编号');
    const pg = K.pages(s, lib), sc = K.schema(s, lib), ap = K.apis(s, lib), ts = K.tests(s, lib);
    ok(pg.length >= 5 && pg.every((p, i) => p.n === i + 1 && p.name && p.roles.length && p.components.length), w + ' 页面 ≥ 5 且齐全');
    ok(pg.filter((p) => p.kind === 'form')[0].fieldCount === K.formFields(s).length && pg.filter((p) => p.kind === 'detail')[0].fieldCount === s.fields.length, w + ' 表单 / 详情字段数');
    ok(sc.table === s.table && sc.columns.length === s.fields.length + lib.components.systemColumns.length && sc.columns[0].col === 'id' && sc.indexes[0].unique, w + ' 数据字典列数 = 字段 + 系统列');
    ok(sc.columns.every((c) => c.col && c.label && c.type && !/undefined|\{/.test(c.type)), w + ' 数据字典列类型');
    ok(ap.length >= 4 && ap[0].method === 'POST' && ap.every((x, i) => x.id === 'API-' + (i + 1 < 10 ? '0' : '') + (i + 1) && /^\/api\//.test(x.path) && x.roles.length >= 1), w + ' 接口编号 / 路径 / 角色');
    ok(new Set(ap.map((x) => x.method + ' ' + x.path)).size === ap.length, w + ' 接口方法 + 路径唯一');
    ok(ts.length >= 12 && ts.every((x, i) => x.id === 'TC-' + (i + 1 < 10 ? '0' : '') + (i + 1) && x.kindName && x.name && x.expect), w + ' 用例 ≥ 12 且编号连续（training 只有 2 个必填、无主数据字段 → 13 条）');
    ['required', 'boundary', 'transition', 'role', 'state'].forEach((x) => ok(ts.some((t) => t.kind === x), w + ' 用例种类缺 ' + x));
    const seed = K.seedRows(d0, o.key);
    ok(seed.every((r) => s.states.some((x) => x.key === r.status)), w + ' 预埋状态是规格节点');
    const tr = K.runTests(s, seed, lib);
    ok(tr.total === ts.length && tr.passed + tr.failed === tr.total && tr.passRate === Math.round(100 * tr.passed / tr.total), w + ' 用例统计自洽');
    const fails = tr.rows.filter((r) => !r.pass).map((r) => r.id + ' ' + r.name + ' → ' + r.actual);
    ok(tr.failed === 0, w + ' 用例全部通过: ' + fails.join('；'));
    if (s.secondLevel) ok(tr.rows.some((r) => r.kind === 'transition' && /待二级审批/.test(r.name) && r.pass), w + ' 二级审批条件迁移用例通过');
    ok(J(tr.rows) === J(K.runTests(s, seed, lib).rows), w + ' runTests 两次同序同果');
    const perms = K.derivePermissions(s, lib);
    ok(perms.rows.length === s.roles.length && s.roles.filter((r) => !r.admin).every((r) => s.pages.some((p) => K.can(perms, r.key, p.key, '查看'))), w + ' 每个角色至少能看一页');
    ok(K.checklist(s, lib, tr, perms).items.length === 5, w + ' 发布前检查 5 项');
    if (raw.expect[o.key]) { const e = raw.expect[o.key], p = K.presetFor(lib, k, o.key), sp = K.plan(K.parse(p.text, lib, k), lib, ctxOf(d0)), sm = K.summarize(sp, lib); ok(e.object === o.key && e.flow === sp.flow.key && e.mode === sp.flow.mode && e.pages === sm.pages && e.fields === sm.fields && e.roles === sm.roles && e.states === sm.states && e.apis === sm.apis && sm.tests >= e.testsMin && e.rows === seed.length, w + ' 样本 expect 与规划一致 ' + J(e) + ' vs ' + J(sm)); }
  });
  ok(Object.keys(raw.expect).length === 4 && Object.keys(raw.expect).join() === K.presetsOf(lib, k).map((p) => p.key).join(), k + ' expect 覆盖四条预置句');

  // 3. 四条预置句：生成 → 用例全过 → 检查全过（e）
  K.presetsOf(lib, k).forEach((p, i) => {
    const dp = K.generate(K.pickPreset(d0, lib, i), lib), Rp = K.run(dp, lib), e = raw.expect[p.key];
    ok(dp.state.text === p.text && dp.state.presetIndex === i && Rp.parsed.object === p.expect.object, k + ' 预置 ' + i + ' 选中并生成');
    ok(Rp.testResult.failed === 0 && Rp.testResult.total >= 15 && Rp.checklist.all, k + ' 预置 ' + i + ' 用例全过 ' + Rp.testResult.passed + '/' + Rp.testResult.total + ' 检查 ' + Rp.checklist.passed);
    ok(Rp.kpi.pages === e.pages && Rp.kpi.fields === e.fields && Rp.kpi.roles === e.roles && Rp.kpi.states === e.states && Rp.kpi.apis === e.apis && Rp.kpi.tests >= e.testsMin && Rp.kpi.rows === e.rows, k + ' 预置 ' + i + ' kpi 与 expect 一致');
    ok(Rp.stats.overdueN >= 1 && Rp.stats.open >= 1 && Rp.stats.done >= 1 && Rp.stats.avgAcceptMin > 0, k + ' 预置 ' + i + ' 预埋有超时 / 待办 / 完成');
    let dq = dp; for (let st = 0; st < Rp.script.length; st++) { dq = K.nextScript(dq, lib); ok(dq.state.lastResult.ok, k + ' 预置 ' + i + ' 脚本第 ' + (st + 1) + ' 步 ' + (dq.state.lastResult.error || '')); }
    ok(Rp.script.length === 3 && dq.state.script.step === 3 && Rp.script.every((s, n) => s.n === n + 1 && s.label && s.actor && s.actor.title), k + ' 预置 ' + i + ' 三步脚本');
    const rowQ = dq.state.rt.rows.filter((r) => r.id === dq.state.script.id)[0]; ok(rowQ && Rp.spec.states.filter((s) => s.key === rowQ.status)[0].terminal, k + ' 预置 ' + i + ' 脚本走完到终止');
    ok(K.run(dq, lib).checklist.all && K.publish(dq, lib).state.lastResult.ok, k + ' 预置 ' + i + ' 可发布');
  });

  // 4. 默认预置句：生成后的运行时（f/h）
  let d = K.generate(d0, lib); serializable(d, k + ' generate');
  const R = K.run(d, lib), spec = R.spec, init = K.initialState(spec), prefix = spec.prefix;
  ok(J(K.run(d, lib)) === J(R), k + ' run 两次相同');
  ok(J(raw) === before, k + ' generate / run 改动了原样本');
  ok(J([lib.erpSamples, lib.procSamples, lib.hrSamples]) === sibBefore, k + ' 改动了兄弟模块样本');
  { const g2 = K.generate(d, lib); ok(J(g2.state.spec) === J(d.state.spec) && J(g2.state.rt) === J(d.state.rt) && J(g2.state.releases) === J(d.state.releases) && J(g2.state.parsed) === J(d.state.parsed), k + ' generate 同一句幂等'); }
  ok(spec.status === 'confirmed' && spec.company === raw.company && spec.arche === k && spec.reqText === R.text, k + ' 规格已确认');
  ok(d.state.releases.length === 1 && d.state.releases[0].id === 'FB-001' && d.state.releases[0].env === 'staging' && d.state.env === 'staging' && d.state.testRuns === 1, k + ' 生成即发测试环境 FB-001');
  ok(d.state.log.length === 1 && d.state.log[0].kind === 'generate' && d.state.log[0].seq === 1, k + ' 生成日志');
  const seed = K.seedRows(d, spec.objectKey);
  ok(seed.length === 8 && seed.every((r) => spec.states.some((s) => s.key === r.status) && r.history[0].actionEn === 'submit'), k + ' 预埋状态合法、历史首条提交');
  ok(d.state.rt.rows.length === seed.length && d.state.rt.seq === seed.length && d.state.rt.clock === K.CLOCK0, k + ' 运行时以预埋起步');
  // 提交
  const ff = K.formFields(spec), ex = K.exampleValues(spec, ff, lib, 0);
  const dS = K.submitRow(d, lib, 'submitter', ex); serializable(dS, k + ' submitRow');
  ok(dS.state.lastResult.ok && dS.state.lastResult.id === prefix + '-2609-' + ('00' + (seed.length + 1)).slice(-3), k + ' 提交流水号递增 ' + J(dS.state.lastResult));
  ok(dS.state.rt.clock === d.state.rt.clock + 15 && dS.state.rt.rows.length === seed.length + 1 && dS.state.rt.rows[seed.length].status === init && dS.state.rt.rows[seed.length].version === 1, k + ' 提交后时钟 +15、状态初始、版本 1');
  ok(dS.state.log.length === 2 && dS.state.log[1].kind === 'submit' && /E-\d{3}|K-\d{3}|[一-龥]/.test(dS.state.log[1].label), k + ' 提交日志');
  const dS2 = K.submitRow(dS, lib, 'submitter', K.exampleValues(spec, ff, lib, 1)); ok(dS2.state.lastResult.id === prefix + '-2609-' + ('00' + (seed.length + 2)).slice(-3) && dS2.state.rt.clock === dS.state.rt.clock + 15, k + ' 第二次提交继续递增');
  const req = ff.filter((f) => f.required)[0], exR = Object.assign({}, ex); exR[req.key] = '';
  const dR = K.submitRow(d, lib, 'submitter', exR); ok(!dR.state.lastResult.ok && dR.state.lastResult.code === 'E_REQUIRED' && dR.state.lastResult.error.indexOf(req.label) >= 0 && dR.state.rt.rows.length === seed.length, k + ' 缺必填 → E_REQUIRED');
  const fr = ff.filter((f) => f.ref)[0]; ok(!!fr, k + ' 默认预置句有主数据字段');
  const exF = Object.assign({}, ex); exF[fr.key] = 'ZZ-999'; const dF = K.submitRow(d, lib, 'submitter', exF); ok(!dF.state.lastResult.ok && dF.state.lastResult.code === 'E_REF' && dF.state.lastResult.error.indexOf(fr.label) >= 0, k + ' 主数据外值 → E_REF');
  const fsel = ff.filter((f) => f.type === 'select')[0]; if (fsel) { const exE = Object.assign({}, ex); exE[fsel.key] = '未知选项'; ok(K.submitRow(d, lib, 'submitter', exE).state.lastResult.code === 'E_ENUM', k + ' 选项外值 → E_ENUM'); }
  // 流转守卫
  const acc = spec.transitions.filter((t) => t.from === init && t.sets && t.sets.assignee)[0]; ok(acc && acc.sla > 0 && acc.by[0] === 'handler', k + ' 初始迁移带接单 / 分配、约定时效');
  const openRow = d.state.rt.rows.filter((r) => r.status === init)[0]; ok(!!openRow, k + ' 有待办记录');
  const accVals = K.exampleValues(spec, K.stageFields(spec, acc.actionEn).filter((f) => !(f.type === 'member' && f.auto)), lib, 0);
  ok(K.roleTitle(spec, 'lead') !== K.roleTitle(spec, 'handler'), k + ' 主管与处理人是不同岗位');
  const dRole = K.doTransition(d, lib, 'lead', openRow.id, acc.actionEn, accVals, null); ok(!dRole.state.lastResult.ok && dRole.state.lastResult.code === 'E_ROLE' && dRole.state.rt.rows.filter((r) => r.id === openRow.id)[0].version === openRow.version, k + ' 越权 → E_ROLE');
  const dState = K.doTransition(d, lib, 'handler', openRow.id, 'complete', {}, null); ok(!dState.state.lastResult.ok && dState.state.lastResult.code === 'E_STATE', k + ' 非法迁移 → E_STATE');
  ok(K.doTransition(d, lib, 'handler', prefix + '-2609-999', acc.actionEn, accVals, null).state.lastResult.code === 'E_NOTFOUND', k + ' 不存在的单 → E_NOTFOUND');
  const a1 = K.actorOf(spec, acc.by[0], false, lib), a2 = K.actorOf(spec, acc.by[0], true, lib);
  const dA = K.doTransition(d, lib, acc.by[0], openRow.id, acc.actionEn, accVals, openRow.version); serializable(dA, k + ' doTransition');
  const rowA = dA.state.rt.rows.filter((r) => r.id === openRow.id)[0];
  ok(dA.state.lastResult.ok && rowA.status === acc.to && rowA.version === openRow.version + 1 && rowA.assignee != null && rowA.history[rowA.history.length - 1].by === a1.id && dA.state.rt.clock === d.state.rt.clock + 15, k + ' 接单成功、版本 +1、处理人落定');
  const dB = K.doTransition(dA, lib, acc.by[0], openRow.id, acc.actionEn, accVals, openRow.version, true);
  ok(!dB.state.lastResult.ok && dB.state.lastResult.code === 'E_VERSION' && dB.state.lastResult.error.indexOf(a1.id) >= 0 && dB.state.lastResult.error.indexOf(acc.action) >= 0, k + ' 第二人旧版本接单 → E_VERSION 且提示首个接单人 ' + J(dB.state.lastResult));
  ok(J(dB.state.rt) === J(dA.state.rt), k + ' 失败动作不改运行时');
  ok(K.doTransition(dA, lib, acc.by[0], openRow.id, acc.actionEn, accVals, rowA.version, true).state.lastResult.code === 'E_STATE', k + ' 已接单不能再接 → E_STATE');
  const nxt = spec.transitions.filter((t) => t.from === acc.to)[0];
  if (nxt && nxt.scope === 'assignee' && a1.id !== a2.id && nxt.by.indexOf(acc.by[0]) >= 0) { const dSc = K.doTransition(dA, lib, nxt.by[0], openRow.id, nxt.actionEn, {}, null, true); ok(dSc.state.lastResult.code === 'E_SCOPE', k + ' 非本人处理 → E_SCOPE ' + J(dSc.state.lastResult)); }
  // 超时
  ok(R.stats.slaHours === acc.sla && R.stats.overdueN >= 1 && R.stats.overdue.every((o) => /^[A-Z]{2}-\d{4}-\d{3}$/.test(o.id) && o.text), k + ' 预埋超时记录');
  const stAdv = K.stats(spec, K.advance(dS.state.rt, acc.sla + 1), lib);
  ok(stAdv.overdueN >= R.stats.overdueN + 1 && stAdv.overdue.some((o) => o.id === dS.state.lastResult.id) && stAdv.clock === dS.state.rt.clock + (acc.sla + 1) * 60, k + ' 推进 sla+1 小时后新单超时');
  ok(K.stats(spec, K.advance(dS.state.rt, 0.5), lib).overdue.every((o) => o.id !== dS.state.lastResult.id), k + ' 推进半小时不超时');
  ok(R.stats.open + R.stats.doing + R.stats.done === R.stats.total && R.stats.byStatus.reduce((n, s) => n + s.n, 0) === R.stats.total && R.stats.total === seed.length, k + ' 统计守恒');
  // 查询范围
  const sub = K.actorOf(spec, 'submitter', false, lib), han = K.actorOf(spec, 'handler', false, lib);
  const mine = K.query(spec, dA.state.rt, sub, 'mine'), lst = K.query(spec, dA.state.rt, han, 'list');
  ok(mine.length >= 1 && mine.every((r) => r.createdBy.id === sub.id) && mine.length === dA.state.rt.rows.filter((r) => r.createdBy.id === sub.id).length, k + ' 我的列表只有本人提交');
  ok(lst.length >= 1 && lst.every((r) => r.assignee === han.id || (!r.assignee && spec.transitions.some((tr) => tr.from === r.status && tr.by.indexOf('handler') >= 0))), k + ' 待办列表只有可处理或本人持有');
  const holderSlot = ['handler', 'handler2'].filter((sl) => K.roleOfSlot(spec, sl) && K.actorOf(spec, sl, false, lib).id === rowA.assignee)[0]; ok(!!holderSlot, k + ' 接单后有持有人槽位 ' + rowA.assignee);
  ok(K.query(spec, dA.state.rt, K.actorOf(spec, holderSlot, false, lib), 'list').some((r) => r.id === openRow.id) && K.query(spec, dA.state.rt, K.actorOf(spec, 'lead', false, lib), 'board').length === dA.state.rt.rows.length, k + ' 已接单在持有人列表、主管看全部');
  if (holderSlot === 'handler2') ok(!K.query(spec, dA.state.rt, han, 'list').some((r) => r.id === openRow.id), k + ' 分配后离开分配人列表');
  // 脚本三步 vs 手工三步
  let ds = d; for (let st = 0; st < 3; st++) { ds = K.nextScript(ds, lib); ok(ds.state.lastResult.ok && ds.state.lastResult.step === st + 1, k + ' 脚本第 ' + (st + 1) + ' 步'); }
  serializable(ds, k + ' nextScript');
  const rowS = ds.state.rt.rows.filter((r) => r.id === ds.state.script.id)[0];
  ok(rowS && spec.states.filter((s) => s.key === rowS.status)[0].terminal && rowS.id === prefix + '-2609-' + ('00' + (seed.length + 1)).slice(-3), k + ' 脚本走完到终止 ' + rowS.status);
  ok(K.nextScript(ds, lib).state.lastResult.code === 'E_DONE', k + ' 第四步 → E_DONE');
  let dm = K.submitRow(d, lib, 'submitter', R.script[0].values); const mid = dm.state.lastResult.id;
  R.script.slice(1).forEach((st) => st.actions.forEach((act) => { const row = dm.state.rt.rows.filter((r) => r.id === mid)[0]; const trs = spec.transitions.filter((t) => t.actionEn === act && t.from === row.status); if (!trs.length) return; const slot = trs[0].by.indexOf(st.actor.slot) >= 0 ? st.actor.slot : (st.actor2 && trs[0].by.indexOf(st.actor2.slot) >= 0 ? st.actor2.slot : trs[0].by[0]); dm = K.doTransition(dm, lib, slot, mid, act, st.values, null); ok(dm.state.lastResult.ok, k + ' 手工 ' + act + ' ' + (dm.state.lastResult.error || '')); }));
  const RS = K.run(ds, lib), RM = K.run(dm, lib);
  ok(J(RS.stats) === J(RM.stats) && J(ds.state.rt.rows) === J(dm.state.rt.rows) && ds.state.rt.clock === dm.state.rt.clock, k + ' 脚本三步 = 手工三步');
  ok(RS.stats.done === R.stats.done + 1 && RS.stats.total === R.stats.total + 1 && ds.state.log.length === 4, k + ' 脚本后完成 +1、日志 4 条');
  ok(J(raw) === before && J([lib.erpSamples, lib.procSamples, lib.hrSamples]) === sibBefore, k + ' 运行时动作不改原样本与兄弟样本');

  // 5. 用例（i）
  const T = R.testResult, kinds = T.byKind.map((b) => b.kind);
  ok(T.total >= 15 && T.failed === 0 && T.passed === T.total && T.passRate === 100, k + ' 默认用例 ' + T.passed + '/' + T.total);
  ['required', 'boundary', 'transition', 'role', 'state', 'version', 'ref', 'overdue'].forEach((x) => ok(kinds.indexOf(x) >= 0, k + ' 用例种类缺 ' + x));
  ok(T.roleBlocked === T.rows.filter((r) => r.kind === 'role').length && T.roleBlocked >= 1, k + ' 越权拦截数');
  ok(T.warnings.length === (spec.fields.some((f) => f.type === 'photo') ? 1 : 0) && T.warnings.every((w) => w.id && w.text), k + ' 照片字段给一条警告');
  ok(new Set(T.rows.map((r) => r.id)).size === T.rows.length && T.rows.every((r) => r.expect && r.actual && r.kindName), k + ' 用例行齐全');
  T.rows.forEach((r) => { if (r.kind === 'transition') ok(r.actual.indexOf('允许') === 0, k + ' 迁移用例 ' + r.id + ' ' + r.actual); if (r.kind === 'role' || r.kind === 'state' || r.kind === 'required' || r.kind === 'boundary' || r.kind === 'ref' || r.kind === 'version') ok(r.actual.indexOf('拒绝') === 0 && r.actual === r.expect, k + ' 拒绝类用例 ' + r.id + ' 实际 = 预期'); });
  const dT = K.runAllTests(ds, lib); ok(dT.state.testRuns === 2 && dT.state.log[dT.state.log.length - 1].kind === 'tests' && /CS-002/.test(dT.state.lastResult.msg) && K.run(dT, lib).deliverables.filter((x) => x.key === 'tests')[0].no === 'CS-002', k + ' 再跑用例 CS-002');
  // 推荐字段
  ok(R.recommended.length >= 1 && R.recommended.every((f) => !spec.fields.some((x) => x.key === f.key)), k + ' 推荐字段来自可选且未在规格');
  const rec = R.recommended[0], dAF = K.addField(ds, lib, rec.key), RAF = K.run(dAF, lib); serializable(dAF, k + ' addField');
  ok(RAF.kpi.fields === R.kpi.fields + 1 && RAF.schema.columns.length === R.schema.columns.length + 1 && RAF.spec.specVer === 'v0.2' && dAF.state.lastResult.ok, k + ' 加字段后字段 +1、字典列 +1、规格 v0.2');
  ok(RAF.pages.filter((p) => p.kind === 'form')[0].fieldCount === R.pages.filter((p) => p.kind === 'form')[0].fieldCount + (rec.at ? 0 : 1) && RAF.pages.filter((p) => p.kind === 'detail')[0].fieldCount === R.pages.filter((p) => p.kind === 'detail')[0].fieldCount + 1, k + ' 加字段后表单 / 详情字段数');
  ok(RAF.deliverables.filter((x) => x.key === 'dict')[0].count !== R.deliverables.filter((x) => x.key === 'dict')[0].count && RAF.deliverables.filter((x) => x.key === 'dict')[0].count.indexOf(String(R.kpi.fields + 1)) >= 0, k + ' 数据字典交付计数变化');
  ok(RAF.testResult.failed === 0 && RAF.testResult.total >= T.total && RAF.recommended.length === R.recommended.length - 1 && RAF.schema.columns.some((c) => c.fieldKey === rec.key && c.source === '需求追加'), k + ' 加字段后用例仍全过、推荐 -1、来源需求追加');
  ok(J(K.addField(dAF, lib, rec.key).state.spec) === J(dAF.state.spec) && K.addField(dAF, lib, rec.key).state.log.length === dAF.state.log.length, k + ' 重复加字段无副作用');
  ok(K.addField(ds, lib, 'no_such_field').state.log.length === ds.state.log.length, k + ' 未知字段不加');
  // 权限建议
  const sg = R.suggestion; ok(sg && sg.role === K.roleOfSlot(spec, 'handler').key && sg.page === 'board' && sg.done === false && sg.op === '查看' && sg.roleTitle === K.roleTitle(spec, 'handler'), k + ' 权限建议：处理人开看板');
  clean(sg.text + sg.reason, k + ' 权限建议文案');
  ok(!K.can(R.perms, sg.role, sg.page, '查看') && R.apis.filter((a) => a.path.endsWith('/stats'))[0].roles.indexOf(sg.roleTitle) < 0, k + ' 开放前处理人看不到看板');
  const dG = K.grantPermission(dAF, lib, sg.role, sg.page, '查看'), RG = K.run(dG, lib); serializable(dG, k + ' grantPermission');
  ok(RG.apis.filter((a) => a.path.endsWith('/stats'))[0].roles.indexOf(sg.roleTitle) >= 0 && K.can(RG.perms, sg.role, sg.page, '查看') && RG.pages.filter((p) => p.kind === 'board')[0].viewers.indexOf(sg.roleTitle) >= 0, k + ' 开放后看板接口 / 权限 / 页签含处理人');
  ok(RG.testResult.total === RAF.testResult.total + 1 && RG.testResult.failed === 0 && RG.testResult.rows.filter((r) => r.kind === 'perm').length === 1 && RG.testResult.rows.filter((r) => r.kind === 'perm')[0].pass, k + ' 开放后用例 +1（权限）且通过');
  ok(RG.suggestion.done === true && RG.spec.specVer === 'v0.3' && dG.state.log[dG.state.log.length - 1].kind === 'perm', k + ' 建议已落实、规格 v0.3');
  ok(K.grantPermission(dG, lib, sg.role, sg.page, '查看').state.log.length === dG.state.log.length, k + ' 重复开放无副作用');
  ok(RG.perms.rows.every((r) => Object.keys(r.pages).length === spec.pages.length && r.scope) && RG.perms.ops.length === 6, k + ' 权限矩阵角色 × 页面完整');

  // 6. 发布（k）
  ok(R.checklist.all && R.checklist.passed === 5 && R.checklist.total === 5, k + ' 发布前检查全过');
  { const dx = JSON.parse(J(dG)); dx.state.spec.integrations = []; const dRef = K.publish(dx, lib); ok(!dRef.state.lastResult.ok && dRef.state.lastResult.code === 'E_CHECK' && dRef.state.releases.length === dx.state.releases.length && dRef.state.env === 'staging' && /主数据/.test(dRef.state.lastResult.error), k + ' 检查未全过时拒绝发布 ' + J(dRef.state.lastResult)); ok(K.run(dx, lib).checklist.all === false, k + ' 构造的检查确实不全过'); }
  const dP = K.publish(dG, lib), RP = K.run(dP, lib); serializable(dP, k + ' publish');
  ok(dP.state.lastResult.ok && dP.state.env === 'live' && dP.state.releases.length === 2 && dP.state.releases[1].id === 'FB-002' && dP.state.releases[1].env === 'prod' && dP.state.releases[1].version === 'V1.0.0' && dP.state.releases[1].smoke === RG.testResult.passed + ' / ' + RG.testResult.total, k + ' 发布到正式 FB-002');
  ok(dP.state.releases.every((r, i) => r.id === 'FB-' + ('00' + (i + 1)).slice(-3) && r.publisher === lib.roles.admin && r.at && r.note && r.status === '已发布'), k + ' 发布流水编号递增');
  ok(!K.publish(dP, lib).state.lastResult.ok && K.publish(dP, lib).state.lastResult.code === 'E_DONE', k + ' 重复发布被拒');
  ok(/^https:\/\//.test(RP.qrText) && RP.qrText.indexOf('app=APP-001') >= 0 && RP.qrText.indexOf('v=V1.0.0') >= 0, k + ' 二维码文本 ' + RP.qrText);
  ok(RP.pipeline.length === 5 && RP.pipeline.filter((p) => p.state === 'on').length === 1 && RP.pipeline[4].state === 'on' && R.pipeline[1].state === 'on', k + ' 发布流水线阶段');
  ok(RP.kpi.releases === 2 && RP.kpi.versions === 1 && RP.kpi.env === 'live' && RP.deliverables.filter((x) => x.key === 'releases')[0].no === 'FB-002', k + ' 发布后 kpi');
  ok(dP.state.log[dP.state.log.length - 1].kind === 'publish', k + ' 发布日志');

  // 7. 追加需求（e/j）
  const fus = K.followUpsOf(lib, k);
  fus.forEach((f, j) => {
    const pv = K.previewDelta(spec, f.text, lib);
    ok(multiset(pv.delta.ops.map((o) => o.type)) === multiset(f.expectOps) && pv.delta.mode === 'exact' && pv.delta.unknown === 0, k + ' 追加 ' + j + ' 变更类型 ' + multiset(pv.delta.ops.map((o) => o.type)) + ' 期望 ' + multiset(f.expectOps));
    ok(pv.states === f.expect.states && pv.fields === f.expect.fields && pv.pages === f.expect.pages, k + ' 追加 ' + j + ' 预演 ' + pv.states + '/' + pv.fields + '/' + pv.pages + ' 期望 ' + J(f.expect));
    ok(pv.delta.effective.length === pv.delta.ops.length && pv.delta.noop === false && pv.delta.summary.length === pv.delta.ops.length && pv.tests >= 1, k + ' 追加 ' + j + ' 全部有效且用例增加');
    ok(pv.delta.types.every((t) => lib.deltas.types.some((x) => x.key === t)), k + ' 追加 ' + j + ' 只有六种变更');
    pv.delta.summary.forEach((s) => clean(s, k + ' 追加 ' + j + ' 摘要'));
    (f.aliases || []).forEach((al) => { const pa = K.previewDelta(spec, al, lib); ok(pa.delta.mode === 'exact' && containsAll(pa.delta.ops.map((o) => o.type), f.expectOps) && pa.states === f.expect.states && pa.fields === f.expect.fields && pa.pages === f.expect.pages, k + ' 追加同义句「' + al + '」→ ' + multiset(pa.delta.ops.map((o) => o.type))); });
    ok(J(R.followUps[j]) === J({ index: j, text: f.text, states: pv.states, fields: pv.fields, pages: pv.pages, apis: pv.apis, tests: pv.tests, rules: pv.rules, stats: pv.stats, types: pv.delta.types, applied: false }), k + ' run.followUps 与预演一致');
  });
  lib.presets.unrelated.forEach((u) => { const pu = K.previewDelta(spec, u, lib); ok(pu.delta.mode === 'fallback' && pu.delta.preset === 0, k + ' 无关追加句回落到第一条'); });
  const f0 = fus[0], pv0 = K.previewDelta(spec, f0.text, lib);
  ok(pv0.delta.ops.some((o) => o.type === 'addState' && o.state.key === 'rated'), k + ' 第一条追加是评价节点');
  const dD = K.applyDelta(dP, lib, f0.text), RD = K.run(dD, lib); serializable(dD, k + ' applyDelta');
  ok(dD.state.lastResult.ok && dD.state.spec.version === 'V1.1.0' && dD.state.prevSpec && dD.state.prevSpec.version === 'V1.0.0' && dD.state.spec.specVer !== dP.state.spec.specVer, k + ' 追加后 V1.1.0');
  ok(RD.diff && RD.diff.states.added.length === pv0.states && RD.diff.fields.added.length === pv0.fields && RD.diff.pages.added.length === pv0.pages && RD.diff.apis.added.length === pv0.apis && RD.diff.tests.added === pv0.tests, k + ' 追加差异 = 预演');
  ok(RD.diff.states.added.length + RD.diff.fields.added.length + RD.diff.pages.added.length > 0 && RD.diff.fields.removed.length === 0 && RD.diff.states.removed.length === 0, k + ' 追加只增不减');
  ok(RD.kpi.pages > RP.kpi.pages && RD.kpi.apis > RP.kpi.apis && RD.kpi.tests > RP.kpi.tests && RD.kpi.states === RP.kpi.states + 1 && RD.kpi.fields === RP.kpi.fields + 2, k + ' 评价追加后页 / 接口 / 用例增加');
  ok(RD.testResult.failed === 0 && RG.tests.every((t) => RD.tests.some((x) => x.id === t.id)) && RD.testResult.total === RG.testResult.total + pv0.tests, k + ' 追加后用例全过、旧用例编号都在');
  const ch = dD.state.changes[0];
  ok(dD.state.changes.length === 1 && ch.id === 'BG-001' && ch.from === 'V1.0.0' && ch.to === 'V1.1.0' && ch.text === f0.text && ch.mode === 'exact', k + ' 变更单 BG-001');
  ok(ch.items.length === pv0.delta.ops.length && ch.items.every((it, i) => it.n === i + 1 && it.typeName && it.content && Array.isArray(it.pages) && Array.isArray(it.apis) && typeof it.tests === 'number'), k + ' 变更项齐全');
  ok(ch.stock.rows === dD.state.rt.rows.length && ch.stock.newFields.length === pv0.fields && ch.stock.fillable <= ch.stock.rows && ch.oldTests === RG.testResult.total && ch.oldPassed === ch.oldTests && ch.tests === RD.testResult.total && ch.passed === ch.tests, k + ' 变更单存量 / 新旧用例');
  ok(dD.state.env === 'staging' && dD.state.releases.length === 3 && dD.state.releases[2].id === 'FB-003' && dD.state.releases[2].env === 'staging' && dD.state.releases[2].version === 'V1.1.0' && dD.state.testRuns === dP.state.testRuns + 1, k + ' 追加后回到测试环境 FB-003');
  ok(RD.followUps[0].applied === true && RD.followUps.slice(1).every((f) => !f.applied) && RD.kpi.changes === 1 && RD.kpi.versions === 2, k + ' 已应用标记与 kpi');
  ok(RD.deliverables.some((x) => x.key === 'changes' && x.no === 'BG-001') && RD.deliverables.length === 8, k + ' 交付清单含变更清单');
  ok(RD.spec.states.some((s) => s.key === 'rated' && s.terminal) && RD.spec.pages.some((p) => p.kind === 'rate') && RD.spec.transitions.some((t) => t.actionEn === 'rate' && t.by.indexOf('submitter') >= 0), k + ' 评价节点 / 页面 / 迁移');
  const dD2 = K.applyDelta(dD, lib, f0.text); ok(!dD2.state.lastResult.ok && dD2.state.lastResult.code === 'E_DONE' && dD2.state.changes.length === 1 && dD2.state.releases.length === 3 && dD2.state.spec.version === 'V1.1.0', k + ' 重复追加无副作用');
  ok(K.applyDelta(dD, lib, '').state.lastResult.code === 'E_DONE' && K.parseDelta(spec, '', lib).mode === 'fallback' && K.parseDelta(spec, '', lib).preset === 0, k + ' 空追加回落到第一条（已应用 → E_DONE）');
  ok(K.parseDelta(spec, '今天天气不错', lib, { noFallback: true }).ops.length === 0 && K.applyDelta(dP, lib, '今天天气不错').state.changes[0].mode === 'fallback', k + ' 无关追加不回落时无变更、回落时记 fallback');
  const dP2 = K.publish(dD, lib); ok(dP2.state.lastResult.ok && dP2.state.releases.length === 4 && dP2.state.releases[3].env === 'prod' && dP2.state.releases[3].version === 'V1.1.0' && K.run(dP2, lib).kpi.versions === 2, k + ' V1.1.0 发布正式 FB-004');
  ok(K.run(dP2, lib).qrText.indexOf('v=V1.1.0') >= 0, k + ' 二维码指向新版本');
  // 评价迁移在追加后可走
  { const done = dD.state.rt.rows.filter((r) => r.status === 'done')[0]; ok(!!done, k + ' 有已完成记录可评价'); const rv = K.exampleValues(RD.spec, K.stageFields(RD.spec, 'rate'), lib, 0); const dRt = K.doTransition(dD, lib, 'submitter', done.id, 'rate', rv, null); ok(dRt.state.lastResult.ok && dRt.state.rt.rows.filter((r) => r.id === done.id)[0].status === 'rated', k + ' 追加后可评价 ' + J(dRt.state.lastResult)); ok(K.doTransition(dD, lib, 'handler', done.id, 'rate', rv, null).state.lastResult.code === 'E_ROLE', k + ' 处理人不能评价'); }
  fus.slice(1).forEach((f, j) => { const dj = K.applyDelta(dP, lib, f.text); ok(dj.state.lastResult.ok && dj.state.spec.version === 'V1.1.0' && K.run(dj, lib).testResult.failed === 0 && K.run(dj, lib).testResult.total === RG.testResult.total + K.previewDelta(spec, f.text, lib).tests, k + ' 追加 ' + (j + 1) + ' 单独应用后用例全过'); ok(!K.applyDelta(dj, lib, f.text).state.lastResult.ok, k + ' 追加 ' + (j + 1) + ' 重复无副作用'); });
  // 发送报告
  const dSend = K.sendReport(dP2, lib); serializable(dSend, k + ' sendReport');
  ok(dSend.state.sent === true && dSend.state.log[dSend.state.log.length - 1].kind === 'send' && !/E-\d{3}/.test(dSend.state.log[dSend.state.log.length - 1].detail), k + ' 发送报告日志只写职务');

  // 8. 文案（l）
  [[R, '默认'], [RS, '脚本后'], [RG, '开放权限后'], [RP, '发布后'], [RD, '追加后']].forEach((pair) => {
    const RR = pair[0], w = k + ' ' + pair[1];
    RR.spec.fields.forEach((f) => clean(f.label, w + ' 字段 ' + f.key));
    RR.pages.forEach((p) => clean(p.name + '|' + p.kindName + '|' + p.deviceName + '|' + p.roles.join('/'), w + ' 页面 ' + p.key));
    RR.apis.forEach((a) => { clean(a.name + '|' + a.roles.join('/'), w + ' 接口 ' + a.id); ok(/^\/api\/[a-z0-9_\/]+(:id[a-z0-9_\/]*)?$/.test(a.path) && a.path.indexOf('{') < 0 && a.path.indexOf('undefined') < 0, w + ' 接口路径只允许 :id 占位、无模板残留 ' + a.path); });
    RR.testResult.rows.forEach((r) => clean(r.name + '|' + r.expect + '|' + r.actual, w + ' 用例 ' + r.id));
    RR.testResult.warnings.forEach((x) => clean(x.text, w + ' 警告'));
    RR.checklist.items.forEach((i) => clean(i.label + '|' + i.detail, w + ' 检查项 ' + i.key));
    RR.deliverables.forEach((x) => clean(x.name + '|' + x.no + '|' + x.count + '|' + x.status, w + ' 交付 ' + x.key));
    RR.changes.forEach((c) => c.items.forEach((it) => clean(it.typeName + ' ' + it.content, w + ' 变更项 ' + c.id)));
    RR.log.forEach((l) => clean(l.label + '|' + l.detail, w + ' 日志 ' + l.seq));
    RR.releases.forEach((r) => clean(r.note + '|' + r.envName, w + ' 发布 ' + r.id));
    RR.spec.states.forEach((s) => clean(s.label, w + ' 节点 ' + s.key)); RR.spec.transitions.forEach((t) => clean(t.action, w + ' 迁移 ' + t.key)); RR.spec.rules.forEach((r) => clean(r.text, w + ' 规则 ' + r.id));
    RR.spec.roles.forEach((r) => clean(r.title + '|' + r.label, w + ' 角色 ' + r.key));
    RR.stats.overdue.forEach((o) => clean(o.text, w + ' 超时文案'));
    clean(RR.report.text, w + ' 报告');
    ok(RR.report.lines.every((l) => l.charAt(0) === '【') && RR.report.title.charAt(0) === '【' && RR.report.text.split('\n').every((l) => l.charAt(0) === '【'), w + ' 报告每行以【开头');
    ok(RR.report.lines.length === 7 && RR.report.text.indexOf(raw.company) >= 0 && RR.report.text.indexOf(RR.spec.title) >= 0 && RR.report.text.indexOf(RR.spec.version) >= 0 && RR.report.no === 'JF-001', w + ' 报告七段、含公司 / 应用 / 版本');
    const titles = RR.spec.roles.map((r) => r.title);
    ok(RR.report.recipients.split(' · ').every((t) => titles.indexOf(t) >= 0) && !/E-\d{3}/.test(RR.report.recipients) && RR.report.recipients.indexOf(lib.roles.admin) >= 0, w + ' 报告收件只写职务');
    ok(!/E-\d{3}/.test(RR.report.text), w + ' 报告不出现员工编号');
    ok(RR.report.text.split('\n').some((l) => l.indexOf('【测试】') === 0 && l.indexOf(String(RR.testResult.total)) >= 0), w + ' 报告测试段含用例数');
    ok(RR.spec.fields.filter((f) => f.type === 'money').every((f) => /预计/.test(f.label)), w + ' 金额字段标预计');
  });
  ok(RP.report.text.indexOf('FB-002') < 0 && RP.report.text.indexOf('正式环境') >= 0 && RD.report.text.indexOf('BG-001') >= 0 && R.report.text.indexOf(lib.components.texts.report.noChange) >= 0, k + ' 报告发布 / 变更段');

  // 9. examples 一致（m）
  const exPath = path.join(__dirname, '..', 'examples', k + '.output.json'); ok(fs.existsSync(exPath), k + ' examples 缺失，先跑 run-examples');
  const exo = JSON.parse(fs.readFileSync(exPath, 'utf8'));
  ok(exo.version === K.VERSION && exo.archetype === k && exo.company === raw.company && exo.text === R.text, k + ' examples 头');
  ok(J(exo.kpi) === J(R.kpi) && exo.report.text === R.report.text && J(exo.stats) === J({ open: R.stats.open, doing: R.stats.doing, done: R.stats.done, avgAcceptMin: R.stats.avgAcceptMin, overdueN: R.stats.overdueN }), k + ' examples 与内核不一致，先跑 run-examples');
  ok(J(exo.pages.map((p) => p.name)) === J(R.pages.map((p) => p.name)) && J(exo.apis.map((a) => a.path)) === J(R.apis.map((a) => a.path)) && J(exo.states) === J(R.spec.states.map((s) => s.label)) && exo.tests.total === R.testResult.total && exo.tests.passed === R.testResult.passed && exo.checklist.all === R.checklist.all, k + ' examples 页面 / 接口 / 节点 / 用例一致');
  ok(exo.parsed.object === R.parsed.object && exo.parsed.flow === R.parsed.flow && exo.parsed.hits === R.parsed.hits && J(exo.followUps.map((f) => [f.states, f.fields, f.pages, f.tests])) === J(R.followUps.map((f) => [f.states, f.fields, f.pages, f.tests])), k + ' examples 解析与追加预演一致');
  lintText(J(exo), k + ' examples 全文');
  ok(!/E-\d{3}/.test(exo.report.text) && !/企查查|天眼查|启信宝|爱企查/.test(J(exo)), k + ' examples 无员工编号 / 厂商名');

  // 10. 全部动作后原样本与兄弟样本不变
  ok(J(raw) === before && J([lib.erpSamples, lib.procSamples, lib.hrSamples]) === sibBefore, k + ' 全部动作后原样本与兄弟模块样本不变');
  Object.keys(dSend).forEach((key) => ok(key in d0, k + ' 动作后无新增顶层键 ' + key));
  ok(Object.keys(dSend.state).sort().join() === Object.keys(d0.state).sort().join(), k + ' 动作后 state 键集合不变');
});

console.log('validate ok: 通过 ' + checks + ' 项断言');
