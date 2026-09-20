/*
 * AI软件开发 · 内核（与 skills/11-ai-dev 同一份，UMD）
 * 一句需求 → 两级词典解析（对象 / 角色 / 动作 / 渠道 / 字段 / 时限）→ 应用规格（字段 · 状态机 · 角色 · 页面 · 主数据关联）
 * → 页面模型 / 数据字典 / 接口清单 / 权限矩阵 → 内存运行时（提交 · 流转 · 守卫 · 统计 · 沙箱时钟）→ 用例枚举与真实执行
 * → 发布检查与发布流水 → 追加需求解析为六种变更并生成新版本 → 交付清单与微信报告
 * 纯规则、确定性（无 Date.now / Math.random）、无 LLM、断网可用；所有客户动作返回新副本并写日志，原样本与兄弟模块样本不动。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM11 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = '1.2.0', MODULE_NAME = 'AI软件开发', CREDITS = 100;
  var TODAY = '2026-09-17', CLOCK0 = 540, STEP_MIN = 15, QR_BASE = 'https://platform.dgg.cn';
  var IDS = { app: 'APP-001', req: 'XQ-001', spec: 'GG-001', report: 'JF-001' };
  var CHANNELS = { h5: '微信扫码 H5', pc: 'PC 后台' };
  var SLOT_ORDER = ['submitter', 'handler', 'handler2', 'lead'];

  // ---------- 工具 ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function pad3(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : String(n); }
  function addDays(iso, n) { var p = iso.split('-'); var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 86400000); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
  function dayOfMin(min) { return Math.floor(min / 1440); }
  function dateOfMin(min) { return addDays(TODAY, dayOfMin(min)); }
  function fmtMin(min, full) { var d = dayOfMin(min), rest = min - d * 1440, hh = Math.floor(rest / 60), mm = rest - hh * 60; var t = pad(hh) + ':' + pad(mm); if (d === 0 && !full) return t; return dateOfMin(min).slice(5) + ' ' + t; }
  function fmtDur(min) { if (min < 60) return min + ' 分'; var h = Math.floor(min / 60), m = min - h * 60; if (h >= 48) return Math.floor(h / 24) + ' 天' + (h % 24 ? ' ' + (h % 24) + ' 小时' : ''); return h + ' 小时' + (m ? ' ' + m + ' 分' : ''); }
  function fmtN(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function t(tpl, vars) { var s = String(tpl == null ? '' : tpl); for (var i = 0; i < 3; i++) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; }); return s; }
  function uniq(arr) { var seen = {}, out = []; arr.forEach(function (x) { var k = typeof x === 'object' ? JSON.stringify(x) : x; if (!seen[k]) { seen[k] = 1; out.push(x); } }); return out; }
  function find(arr, f) { for (var i = 0; i < arr.length; i++) if (f(arr[i], i)) return arr[i]; return null; }
  function snake(s) { return String(s).replace(/([A-Z])/g, function (m) { return '_' + m.toLowerCase(); }); }
  function isoToMin(s) { var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); if (!m) return null; var d = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(2026, 8, 17)) / 86400000); return d * 1440 + (m[4] ? (+m[4]) * 60 + (+m[5]) : 0); }
  function bump(ver, level) { var m = String(ver).match(/^V(\d+)\.(\d+)\.(\d+)$/); if (!m) return ver; var a = +m[1], b = +m[2], c = +m[3]; if (level === 'major') { a++; b = 0; c = 0; } else if (level === 'minor') { b++; c = 0; } else c++; return 'V' + a + '.' + b + '.' + c; }
  function specBump(v) { var m = String(v).match(/^v(\d+)\.(\d+)$/); return m ? 'v' + m[1] + '.' + (+m[2] + 1) : v; }
  function pushLog(state, kind, label, detail, clockMin) { state.log.push({ seq: state.log.length + 1, kind: kind, label: label, detail: detail || '', at: fmtMin(clockMin == null ? CLOCK0 : clockMin) }); }

  // ---------- 库访问 ----------
  function objOf(lib, key) { return find(lib.objects.objects, function (o) { return o.key === key; }); }
  function tplOf(lib, key) { return find(lib.flows.templates, function (x) { return x.key === key; }); }
  function objectsFor(lib, arche) { return lib.objects.objects.filter(function (o) { return o.arche === 'common' || o.arche === arche; }); }
  function presetsOf(lib, arche) { return lib.presets[arche] || lib.presets.make; }
  function followUpsOf(lib, arche) { return (lib.presets.followUps || {})[arche] || []; }
  function refTable(lib, arche, source) {
    var I = lib.integrations, cfg = I.sources[source]; if (!cfg) return null;
    if (cfg.alias) { var base = I.sources[cfg.alias]; cfg = Object.assign({}, base, { key: source }); }
    var over = (cfg.byArche || {})[arche] || {}; cfg = Object.assign({}, cfg, over);
    var pool = lib[cfg.from + 'Samples'] || {}, sKey = ((I.archeMap[arche] || {})[cfg.from]) || arche, sample = pool[sKey];
    var rows = [];
    if (sample && sample[cfg.path]) {
      var raw = sample[cfg.path], seen = {};
      raw.forEach(function (r) { var id = r[cfg.id]; if (id == null || seen[id]) return; seen[id] = 1; rows.push({ id: String(id), label: t(cfg.label, { id: id, name: r.name || '' }), name: r.name || '' }); });
    }
    return { source: source, name: cfg.name, system: cfg.system, unit: cfg.unit, rows: rows, count: rows.length, syncAt: cfg.syncAt, directIf: cfg.directIf || [] };
  }
  function refIds(lib, arche, source) { var tb = refTable(lib, arche, source); return tb ? tb.rows.map(function (r) { return r.id; }) : []; }
  function refLabels(lib, arche, source) { var tb = refTable(lib, arche, source); return tb ? tb.rows.map(function (r) { return r.label; }) : []; }
  function refKnown(lib, arche, source, v) { var tb = refTable(lib, arche, source); if (!tb || !tb.rows.length) return true; var s = String(v); return tb.rows.some(function (r) { return r.id === s || r.label === s; }); }
  function empsOf(lib, arche, title) { return ((lib.roles.emps[arche] || {})[title]) || []; }

  // ---------- 词典：正向最长匹配 ----------
  function normalize(s) {
    var out = '';
    String(s == null ? '' : s).split('').forEach(function (ch) { var c = ch.charCodeAt(0); if (c === 0x3000) ch = ' '; else if (c >= 0xFF01 && c <= 0xFF5E) ch = String.fromCharCode(c - 0xFEE0); out += ch; });
    return out.toLowerCase().replace(/\s+/g, '');
  }
  function lexIndex(lib) {
    if (lib._m11lex) return lib._m11lex;
    var map = {}, maxLen = 1;
    lib.lexicon.terms.forEach(function (term) { term.surfaces.forEach(function (sf) { var k = normalize(sf); map[k] = term; if (k.length > maxLen) maxLen = k.length; }); });
    var conn = lib.lexicon.connectors.slice().sort(function (a, b) { return b.length - a.length; });
    lib._m11lex = { map: map, maxLen: maxLen, splitter: new RegExp('[，,。.;；、！!？?\\n]|' + conn.join('|')), negations: lib.lexicon.negations, units: lib.lexicon.qtyUnits.slice().sort(function (a, b) { return b.length - a.length; }) };
    return lib._m11lex;
  }
  var CN_NUM = { '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  function cnNum(s) { if (/^\d+(\.\d+)?$/.test(s)) return +s; var n = 0, cur = 0; for (var i = 0; i < s.length; i++) { var v = CN_NUM[s[i]]; if (v == null) return null; if (v === 10) { n += (cur || 1) * 10; cur = 0; } else cur = v; } return n + cur; }
  function canonOf(term, arche) { return typeof term.canon === 'object' ? (term.canon[arche] || term.canon.make) : term.canon; }
  function tokenize(text, lib, arche) {
    var L = lexIndex(lib), clauses = normalize(text).split(L.splitter).filter(function (c) { return c.length; }), tokens = [];
    clauses.forEach(function (cl, ci) {
      var i = 0;
      while (i < cl.length) {
        var hit = null, len;
        for (len = Math.min(L.maxLen, cl.length - i); len >= 1; len--) { var sub = cl.substr(i, len); if (L.map[sub]) { hit = L.map[sub]; break; } }
        if (hit) { tokens.push({ type: hit.type, key: hit.key, canon: canonOf(hit, arche), surface: sub, clause: ci, pos: i, len: len }); i += len; }
        else i++;
      }
      // 数量 + 单位
      var re = new RegExp('(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十]+)个?(' + L.units.join('|') + ')', 'g'), m;
      while ((m = re.exec(cl))) { var n = cnNum(m[1]); if (n != null) tokens.push({ type: 'qty', key: 'qty', canon: n + ' ' + m[2], surface: m[0], clause: ci, pos: m.index, len: m[0].length, n: n, unit: m[2] }); }
      // 否定：否定词在同一子句、字段词之前 6 字内
      L.negations.forEach(function (ng) { var p = cl.indexOf(ng); while (p >= 0) { tokens.forEach(function (tk) { if (tk.clause === ci && tk.pos > p && tk.pos - p <= ng.length + 6 && (tk.type === 'field' || tk.type === 'action')) tk.neg = true; }); p = cl.indexOf(ng, p + 1); } });
    });
    tokens.sort(function (a, b) { return a.clause - b.clause || a.pos - b.pos; });
    return { clauses: clauses, tokens: tokens };
  }
  function bigrams(s) { var n = normalize(s), out = {}; for (var i = 0; i < n.length - 1; i++) { var g = n.substr(i, 2); out[g] = (out[g] || 0) + 1; } return out; }
  function similar(a, b) { var A = bigrams(a), B = bigrams(b), inter = 0, na = 0, nb = 0, k; for (k in A) { na += A[k]; if (B[k]) inter += Math.min(A[k], B[k]); } for (k in B) nb += B[k]; return na + nb ? 2 * inter / (na + nb) : 0; }
  function nearest(text, cands, textOf) { var best = null, bs = 0; cands.forEach(function (c, i) { [textOf(c)].concat(c.aliases || []).forEach(function (s) { var v = similar(text, s); if (v > bs) { bs = v; best = i; } }); }); return { index: best, score: Math.round(bs * 100) / 100 }; }
  function lcs(a, b) { var m = a.length, n = b.length, dp = []; for (var i = 0; i <= m; i++) { dp.push([]); for (var j = 0; j <= n; j++) dp[i].push(0); } for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]); return dp[m][n]; }

  // ---------- 解析 ----------
  function usedSlots(flowKey, mode, options) {
    var s = ['submitter', 'handler'];
    if (flowKey === 'approve') { if (options.secondLevel) s.push('handler2'); }
    else if (flowKey === 'dispatch') { if (mode === 'assign' || mode === 'dual') s.push('handler2'); }
    else s.push('handler2');
    s.push('lead');
    return s;
  }
  function parse(text, lib, arche, opts) {
    opts = opts || {};
    var presets = presetsOf(lib, arche), original = text == null ? '' : String(text), mode = 'exact', preset = null;
    var tk = tokenize(original, lib, arche), tokens = tk.tokens;
    var allowed = objectsFor(lib, arche).map(function (o) { return o.key; });
    var objTokens = tokens.filter(function (x) { return x.type === 'object' && !x.neg && allowed.indexOf(x.key) >= 0; });
    if (!objTokens.length) {
      var nr = nearest(original, presets, function (p) { return p.text; });
      preset = nr.score >= 0.18 && nr.index != null ? nr.index : 0;
      mode = 'fallback';
      tk = tokenize(presets[preset].text, lib, arche); tokens = tk.tokens;
      objTokens = tokens.filter(function (x) { return x.type === 'object' && allowed.indexOf(x.key) >= 0; });
    }
    // 对象打分：命中 × 3 + 业态优先 + 同子句字段数；并列取先出现的
    var score = {}, first = {};
    objTokens.forEach(function (x) { var o = objOf(lib, x.key); if (!o) return; if (score[x.key] == null) { score[x.key] = (o.arche === arche ? 2 : o.arche === 'common' ? 1 : 0); first[x.key] = x.clause * 1000 + x.pos; } score[x.key] += 3; tokens.forEach(function (f) { if (f.type === 'field' && f.clause === x.clause) score[x.key] += 1; }); });
    var objectKey = Object.keys(score).sort(function (a, b) { return score[b] - score[a] || first[a] - first[b]; })[0];
    var obj = objOf(lib, objectKey);
    // 模板：动作序列与三类签名的 LCS（只作证据；对象决定模板，除非对象声明 altFlows）
    var actionSeq = uniq(tokens.filter(function (x) { return x.type === 'action' && !x.neg; }).map(function (x) { return x.key; }));
    var lcsScores = lib.flows.templates.map(function (tp) { return { key: tp.key, name: tp.name, lcs: lcs(actionSeq, tp.signature) }; }).sort(function (a, b) { return b.lcs - a.lcs; });
    var flowKey = obj.flow;
    if (obj.altFlows && lcsScores[0].lcs >= 2 && obj.altFlows.indexOf(lcsScores[0].key) >= 0) flowKey = lcsScores[0].key;
    var tpl = tplOf(lib, flowKey);
    var flowMode = flowKey === 'dispatch' ? (obj.mode || 'accept') : null;
    if (flowKey === 'dispatch' && flowMode !== 'dual' && actionSeq.indexOf('assign') >= 0) flowMode = 'assign';
    var options = { secondLevel: !!obj.secondLevel, tail: !!obj.tail, tail2: !!(obj.tail && obj.tail.returned), rated: actionSeq.indexOf('rate') >= 0 && flowKey === 'dispatch', rejected: actionSeq.indexOf('reject') >= 0 && flowKey === 'dispatch', recheckFail: false };
    var slots = usedSlots(flowKey, flowMode, options);
    // 角色：默认岗位 ← 对象覆盖 ← 句中角色词（动作绑定 / 顺序）
    var titles = Object.assign({}, (lib.roles.defaults[arche] || lib.roles.defaults.make)[flowKey], (obj.roles && obj.roles[arche]) || {});
    var actionSlots = Object.assign({}, tpl.actionSlots, (tpl.modeActionSlots && tpl.modeActionSlots[flowMode]) || {});
    var bound = {}, roleTokens = tokens.filter(function (x) { return x.type === 'role'; });
    roleTokens.forEach(function (rt, idx) {
      var same = tokens.filter(function (x) { return x.clause === rt.clause; });
      var nextRole = find(same, function (x) { return x.type === 'role' && x.pos > rt.pos; }), prevRole = find(same.slice().reverse(), function (x) { return x.type === 'role' && x.pos < rt.pos; });
      var after = find(same, function (x) { return x.type === 'action' && x.pos > rt.pos && (!nextRole || x.pos < nextRole.pos); });
      var before = find(same.slice().reverse(), function (x) { return x.type === 'action' && x.pos < rt.pos && (!prevRole || x.pos > prevRole.pos); });
      var slot = null;
      if (before && before.key === 'assign' && flowKey === 'dispatch' && flowMode === 'assign') slot = 'handler2';
      else if (after && actionSlots[after.key]) slot = actionSlots[after.key];
      else if (before && before.key === 'view') slot = 'lead';
      if (slot && slots.indexOf(slot) < 0) slot = null;
      rt.slot = slot; rt.idx = idx;
    });
    var unbound = slots.filter(function (s) { return s !== 'lead' && !roleTokens.some(function (r) { return r.slot === s; }); });
    roleTokens.forEach(function (rt) { if (!rt.slot) { var s = unbound.shift(); if (s) rt.slot = s; } });
    roleTokens.forEach(function (rt) { if (rt.slot && !bound[rt.slot]) { bound[rt.slot] = rt.canon; titles[rt.slot] = rt.canon; } });
    if (slots.indexOf('handler2') >= 0 && bound.handler && !bound.handler2 && titles.handler === titles.handler2 && titles.lead !== titles.handler) titles.handler2 = titles.lead;
    var roles = slots.map(function (s) { var title = titles[s], emps = empsOf(lib, arche, title), ext = lib.roles.external[title]; return { slot: s, title: title, emp: emps[0] || null, emp2: emps[1] || null, external: ext || null, hit: bound[s] || null }; });
    // 渠道
    var channelHits = { h5: tokens.filter(function (x) { return x.type === 'channel' && x.key === 'h5'; }).map(function (x) { return x.surface; }), pc: tokens.filter(function (x) { return x.type === 'channel' && x.key === 'pc'; }).map(function (x) { return x.surface; }) };
    var channels = ['h5', 'pc'].map(function (k) { return { key: k, name: CHANNELS[k], hits: uniq(channelHits[k]) }; });
    // 字段：可选字段命中加入，否定的基础字段移除
    var optKeys = obj.optional.map(function (f) { return f.key; }), baseKeys = obj.fields.map(function (f) { return f.key; });
    var extra = [], removed = [];
    tokens.forEach(function (x) { if (x.type !== 'field') return; if (x.neg) { if (baseKeys.indexOf(x.key) >= 0 && !find(obj.fields, function (f) { return f.key === x.key && f.type === 'member'; }) && removed.indexOf(x.key) < 0) removed.push(x.key); } else if (optKeys.indexOf(x.key) >= 0 && extra.indexOf(x.key) < 0) extra.push(x.key); });
    // 时限：数量 + 单位 与 超时 / 未接单 同句
    var sla = null;
    tokens.forEach(function (x) { if (x.type !== 'qty') return; if (tokens.some(function (y) { return y.clause === x.clause && (y.type === 'time' || (y.type === 'action' && y.key === 'remind')); })) sla = { n: x.n, unit: x.unit, hours: x.unit === '分钟' ? x.n / 60 : x.unit === '小时' ? x.n : x.unit === '天' ? x.n * 24 : x.unit.indexOf('工作日') >= 0 ? x.n * 24 : null }; });
    var evidence = tokens.filter(function (x) { return x.type !== 'qty' || true; }).map(function (x) { return { type: x.type, key: x.key, canon: x.canon, surface: x.surface, clause: x.clause, neg: !!x.neg, slot: x.slot || null }; });
    var hitClauses = {}; tokens.forEach(function (x) { hitClauses[x.clause] = 1; });
    var unknown = tk.clauses.filter(function (c, i) { return !hitClauses[i]; }).length;
    return { text: original, mode: mode, preset: preset, object: obj.key, objectName: obj.name, objectHits: uniq(objTokens.filter(function (x) { return x.key === obj.key; }).map(function (x) { return x.surface; })),
      flow: flowKey, flowName: tpl.name, flowMode: flowMode, flowModeName: flowMode ? tpl.modes[flowMode].name : null, lcs: lcsScores, actionSeq: actionSeq,
      roles: roles, channels: channels, extraFields: extra, removedFields: removed, options: options, sla: sla,
      evidence: evidence, hits: uniq(tokens.map(function (x) { return x.surface; })).length, unknown: unknown, clauses: tk.clauses.length };
  }

  // ---------- 规格 ----------
  function stageFields(spec, stage, onlyRequired) { return spec.fields.filter(function (f) { return f.at === stage && (!onlyRequired || f.required); }); }
  function formFields(spec) { return spec.fields.filter(function (f) { return !f.at && !(f.type === 'member' && f.auto); }); }
  function assigneeField(spec) { return find(spec.fields, function (f) { return f.type === 'member' && (f.at === 'assign') && !f.auto; }); }
  function mainTerminal(spec) { var order = ['returned', 'lent', 'approved', 'done', 'closed']; for (var i = 0; i < order.length; i++) if (find(spec.states, function (s) { return s.key === order[i]; })) return order[i]; return find(spec.states, function (s) { return s.terminal; }).key; }
  function initialState(spec) { return find(spec.states, function (s) { return s.initial; }).key; }
  function stateLabel(spec, key) { var s = find(spec.states, function (x) { return x.key === key; }); return s ? s.label : key; }
  function roleOfSlot(spec, slot) { return find(spec.roles, function (r) { return r.slots.indexOf(slot) >= 0; }); }
  function roleTitle(spec, slot) { var r = roleOfSlot(spec, slot); return r ? r.title : slot; }
  function resolveRequire(spec, tr) { return (tr.require || []).reduce(function (acc, k) { if (k.charAt(0) === '@') return acc.concat(stageFields(spec, k.slice(1), true).map(function (f) { return f.key; })); return acc.concat([k]); }, []); }
  function buildRoles(parsedRoles, lib, tpl, mode) {
    var labels = Object.assign({}, lib.flows.slotLabels[tpl.key], (lib.flows.modeSlotLabels || {})[mode] || {});
    var roles = [];
    parsedRoles.forEach(function (r) { var ex = find(roles, function (x) { return x.title === r.title; }); if (ex) { ex.slots.push(r.slot); if (!ex.emp2 && r.emp2) ex.emp2 = r.emp2; return; } roles.push({ key: 'r' + (roles.length + 1), title: r.title, slots: [r.slot], label: labels[r.slot], emp: r.emp, emp2: r.emp2, external: r.external, admin: false }); });
    roles.forEach(function (r) { r.label = r.slots.map(function (s) { return labels[s]; }).join(' / '); });
    roles.push({ key: 'admin', title: lib.roles.admin, slots: ['admin'], label: labels.admin, emp: null, emp2: null, external: null, admin: true });
    return roles;
  }
  function pageName(tplName, obj) { return t(tplName, { verb: obj.verb, short: obj.short }); }
  function plan(parsed, lib, ctx) {
    ctx = ctx || {};
    var arche = ctx.arche || 'make', obj = objOf(lib, parsed.object), tpl = tplOf(lib, parsed.flow), mode = parsed.flowMode, opt = parsed.options;
    var modeCfg = (mode && tpl.modes && tpl.modes[mode]) || {};
    // 字段
    var fields = obj.fields.filter(function (f) { return parsed.removedFields.indexOf(f.key) < 0; }).map(function (f) { return Object.assign({}, f, { source: '对象库' }); });
    parsed.extraFields.forEach(function (k) { var f = find(obj.optional, function (x) { return x.key === k; }); if (f && !find(fields, function (x) { return x.key === k; })) fields.push(Object.assign({}, f, { source: '需求识别' })); });
    if (mode === 'assign' && !find(fields, function (f) { return f.type === 'member' && f.at === 'assign'; })) fields.push({ key: 'assignee', label: '处理人', type: 'member', ref: 'employees', required: true, at: 'assign', example: '@handler2', source: '对象库' });
    if (opt.rated) ['rating', 'comment'].forEach(function (k) { if (!find(fields, function (x) { return x.key === k; })) fields.push(Object.assign({}, lib.deltas.fieldLib[k], { source: '需求识别' })); });
    if (opt.rejected && !find(fields, function (x) { return x.key === 'rejectReason'; })) fields.push(Object.assign({}, lib.deltas.fieldLib.rejectReason, { source: '需求识别' }));
    // 状态
    var states = tpl.states.filter(function (s) { if (!s.optional) return true; return !!opt[s.optional]; }).filter(function (s) { if (tpl.key === 'inspect' && s.key === 'ok') return !!obj.initialRule; return true; }).map(function (s) { return { key: s.key, label: s.label, initial: !!s.initial, terminal: !!s.terminal }; });
    states.forEach(function (s) { if (modeCfg.labels && modeCfg.labels[s.key]) s.label = modeCfg.labels[s.key]; if (obj.stateLabels && obj.stateLabels[s.key]) s.label = obj.stateLabels[s.key]; if (obj.tail && s.key === 'lent') { s.label = obj.tail.lent; s.terminal = !obj.tail.returned; } if (obj.tail && s.key === 'returned') s.label = obj.tail.returned; });
    // 迁移
    var transitions = tpl.transitions.filter(function (x) { return !x.optional || opt[x.optional]; }).map(function (x) {
      var o = Object.assign({}, x, { by: x.by.slice(), require: (x.require || []).slice(), sets: x.sets ? Object.assign({}, x.sets) : null });
      var mo = modeCfg.transitions && modeCfg.transitions[x.key]; if (mo) Object.keys(mo).forEach(function (k) { o[k] = mo[k] == null ? null : (Array.isArray(mo[k]) ? mo[k].slice() : mo[k]); });
      if (obj.actionLabels && obj.actionLabels[o.actionEn]) o.action = obj.actionLabels[o.actionEn];
      if (obj.sla && obj.sla.accept != null && (o.actionEn === 'accept' || o.actionEn === 'assign')) o.sla = obj.sla.accept;
      if (obj.sla && obj.sla.fix != null && o.actionEn === 'fix') o.sla = obj.sla.fix;
      if (parsed.sla && parsed.sla.hours && o.from === initialKey(states)) o.sla = parsed.sla.hours;
      if (o.sets && o.sets.assignee === 'values.@assignee') { var af = find(fields, function (f) { return f.type === 'member' && f.at === 'assign'; }); o.sets.assignee = 'values.' + (af ? af.key : 'assignee'); }
      return o;
    });
    if (opt.secondLevel) transitions = transitions.filter(function (x) { return !(x.key === 'approve' && x.when == null) || true; });
    // 角色 / 页面
    var roles = buildRoles(parsed.roles, lib, tpl, mode);
    var pages = tpl.pages.map(function (p) { return Object.assign({}, p, { roles: p.roles.slice() }); });
    var mp = tpl.modePages && tpl.modePages[mode];
    if (mp) { if (mp.list) Object.assign(find(pages, function (p) { return p.key === 'list'; }), mp.list); (mp.extra || []).forEach(function (x) { var at = pages.map(function (p) { return p.key; }).indexOf(x.after); pages.splice(at + 1, 0, Object.assign({}, x, { roles: x.roles.slice() })); }); if (mp.detailRoles) find(pages, function (p) { return p.key === 'detail'; }).roles = mp.detailRoles.slice(); }
    if (opt.secondLevel && tpl.secondLevelPages) { tpl.secondLevelPages.forEach(function (x) { var at = pages.map(function (p) { return p.key; }).indexOf(x.after); pages.splice(at + 1, 0, Object.assign({}, x, { roles: x.roles.slice() })); }); find(pages, function (p) { return p.key === 'detail'; }).roles = uniq(find(pages, function (p) { return p.key === 'detail'; }).roles.concat(tpl.secondLevelDetailRoles || [])); }
    if (opt.rated) pages.push(Object.assign({}, lib.deltas.stateTemplates.rated.page, { roles: ['submitter'] }));
    pages.forEach(function (p) { p.name = pageName(p.name, obj); p.roleKeys = uniq(p.roles.map(function (s) { var r = s === 'admin' ? 'admin' : (roleOfSlot({ roles: roles }, s) || {}).key; return r; }).filter(Boolean)); });
    // 主数据关联
    var systems = ctx.systems || [], integrations = [];
    fields.forEach(function (f) { var src = f.ref || (f.type === 'member' ? 'employees' : null); if (!src || find(integrations, function (x) { return x.source === src; })) return; var tb = refTable(lib, arche, src); if (!tb) return; integrations.push({ source: src, name: tb.name, system: tb.system, rows: tb.count, unit: tb.unit, fields: [f.label], mode: tb.directIf.some(function (s) { return systems.indexOf(s) >= 0; }) ? 'direct' : 'import', syncAt: tb.syncAt }); });
    fields.forEach(function (f) { var src = f.ref || (f.type === 'member' ? 'employees' : null); var it = src && find(integrations, function (x) { return x.source === src; }); if (it && it.fields.indexOf(f.label) < 0) it.fields.push(f.label); });
    // 规则
    var rules = [];
    var addRule = function (text) { rules.push({ id: 'R' + (rules.length + 1), kind: 'base', text: text }); };
    var tr0 = find(transitions, function (x) { return x.from === initialKey(states) && x.sla; }); if (tr0) addRule(tr0.action + '约定时效 ' + tr0.sla + ' 小时，超过标记超时');
    if (obj.secondLevel) addRule(obj.secondLevel.text);
    var dueF = find(fields, function (f) { return f.due; }); if (dueF && obj.tail) addRule(dueF.label + '到期未' + String(obj.tail.returned || '办结').replace(/^已/, '') + '标记超期');
    if (obj.initialRule) addRule(find(fields, function (f) { return f.key === obj.initialRule.field; }).label + ' > ' + obj.initialRule.gt + ' 自动进入' + stateLabel({ states: states }, 'issue'));
    if (obj.ruleText && !rules.some(function (r) { return r.text === obj.ruleText || r.text.indexOf(obj.ruleText) >= 0 || obj.ruleText.indexOf(r.text) >= 0 || similar(r.text, obj.ruleText) >= 0.5 || (obj.secondLevel && obj.ruleText.indexOf('二级') >= 0 && r.text.indexOf('二级') >= 0); })) addRule(obj.ruleText);
    return { id: IDS.app, reqNo: IDS.req, specNo: IDS.spec, specVer: 'v0.1', status: 'draft', version: 'V1.0.0', arche: arche, company: ctx.company || '',
      title: obj.name, objectKey: obj.key, verb: obj.verb, short: obj.short, prefix: obj.prefix, table: obj.key + (tpl.key === 'dispatch' ? '_order' : tpl.key === 'approve' ? '_request' : '_record'),
      flow: { key: tpl.key, name: tpl.name, mode: mode, modeName: mode ? modeCfg.name : null }, options: clone(opt), secondLevel: obj.secondLevel ? clone(obj.secondLevel) : null, tail: obj.tail ? clone(obj.tail) : null, initialRule: obj.initialRule ? clone(obj.initialRule) : null,
      fields: fields, states: states, transitions: transitions, roles: roles, pages: pages, channels: parsed.channels.map(function (c) { return { key: c.key, name: c.name }; }), integrations: integrations, rules: rules, stats: [], permOverrides: [], validations: [], notifyChannel: lib.components.texts.notifyChannel, reqText: parsed.text };
  }
  function initialKey(states) { return find(states, function (s) { return s.initial; }).key; }

  // ---------- 规格改写（唯一入口） ----------
  function patch(spec, op, lib) {
    var s = clone(spec), changed = false, note = '';
    if (op.type === 'addField') {
      if (!find(s.fields, function (f) { return f.key === op.field.key; })) { s.fields.push(Object.assign({}, op.field, { source: op.source || '需求追加' })); changed = true; note = '新增字段 ' + op.field.label; }
    } else if (op.type === 'grantPermission') {
      if (!find(s.permOverrides, function (p) { return p.role === op.role && p.page === op.page && p.op === op.op; })) { s.permOverrides.push({ role: op.role, page: op.page, op: op.op }); changed = true; var r = find(s.roles, function (x) { return x.key === op.role; }), pg = find(s.pages, function (x) { return x.key === op.page; }); if (pg && r && pg.roleKeys.indexOf(r.key) < 0) pg.roleKeys.push(r.key); note = (r ? r.title : op.role) + ' × ' + (pg ? pg.name : op.page) + ' × ' + op.op; }
    } else if (op.type === 'addState') {
      if (!find(s.states, function (x) { return x.key === op.state.key; })) {
        var from = op.transition.from === '@terminal' ? mainTerminal(s) : op.transition.from === '@initial' ? initialState(s) : op.transition.from;
        var fromState = find(s.states, function (x) { return x.key === from; }); if (fromState && op.transition.from === '@terminal') fromState.terminal = false;
        s.states.push({ key: op.state.key, label: op.state.label, initial: false, terminal: op.state.terminal !== false });
        s.transitions.push(Object.assign({}, op.transition, { from: from, by: op.transition.by.slice(), require: (op.transition.require || []).slice(), sets: null }));
        (op.fields || []).forEach(function (f) { if (!find(s.fields, function (x) { return x.key === f.key; })) s.fields.push(Object.assign({}, f, { source: '需求追加' })); });
        if (op.page && !find(s.pages, function (p) { return p.key === op.page.key; })) { var pg2 = Object.assign({}, op.page, { roles: op.page.roles.slice() }); pg2.roleKeys = uniq(pg2.roles.map(function (sl) { var r = roleOfSlot(s, sl); return r ? r.key : null; }).filter(Boolean)); s.pages.push(pg2); }
        changed = true; note = '新增节点 ' + op.state.label;
      }
    } else if (op.type === 'addStat') {
      if (!find(s.stats, function (x) { return x.by === op.by && x.metric === op.metric; })) { s.stats.push({ id: 'ST' + (s.stats.length + 1), by: op.by, byLabel: op.byLabel, metric: op.metric, metricLabel: op.metricLabel, unit: op.unit }); changed = true; note = '看板按' + op.byLabel + '统计' + op.metricLabel; }
    } else if (op.type === 'addRule') {
      if (!find(s.rules, function (x) { return x.kind === 'overdueRemind' && x.state === op.rule.state && x.hours === op.rule.hours; })) { s.rules.push(Object.assign({ id: 'R' + (s.rules.length + 1), kind: 'overdueRemind' }, op.rule)); changed = true; note = op.rule.text; }
    } else if (op.type === 'addValidation') {
      var f = find(s.fields, function (x) { return x.key === op.field; });
      if (f) { var before = JSON.stringify([f.required, f.min, f.max]); if (op.kind === 'required') f.required = true; else if (op.kind === 'min') f.min = op.v; else if (op.kind === 'max') f.max = op.v; if (JSON.stringify([f.required, f.min, f.max]) !== before) { s.validations.push({ field: f.key, label: f.label, kind: op.kind, v: op.v == null ? null : op.v, text: op.text }); changed = true; note = op.text; } }
    } else if (op.type === 'addRole') {
      if (!find(s.roles, function (r) { return r.title === op.title; })) { s.roles.splice(s.roles.length - 1, 0, { key: 'r' + s.roles.length, title: op.title, slots: [op.slot || 'handler2'], label: op.label || '协办人', emp: null, emp2: null, external: null, admin: false }); changed = true; note = '新增角色 ' + op.title; }
    }
    if (changed) s.specVer = specBump(s.specVer);
    s._changed = changed; s._note = note;
    return s;
  }
  function confirmSpec(spec) { var s = clone(spec); s.status = 'confirmed'; return s; }

  // ---------- 权限 / 页面 / 数据字典 / 接口 ----------
  function derivePermissions(spec, lib) {
    var P = lib.roles.perms, ops = lib.roles.ops;
    var rows = spec.roles.map(function (r) {
      var pages = {};
      spec.pages.forEach(function (p) { var set = []; if (p.roleKeys.indexOf(r.key) >= 0) r.slots.forEach(function (sl) { ((P[p.kind] || {})[sl] || []).forEach(function (o) { if (set.indexOf(o) < 0) set.push(o); }); }); spec.permOverrides.forEach(function (o) { if (o.role === r.key && o.page === p.key && set.indexOf(o.op) < 0) set.push(o.op); }); pages[p.key] = ops.filter(function (o) { return set.indexOf(o) >= 0; }); });
      return { role: r.key, title: r.title, label: r.label, pages: pages, scope: lib.roles.scope[r.slots[0]] || '全部' };
    });
    return { rows: rows, ops: ops, pages: spec.pages.map(function (p) { return { key: p.key, name: p.name, device: p.device }; }) };
  }
  function can(perms, roleKey, pageKey, op) { var r = find(perms.rows, function (x) { return x.role === roleKey; }); return !!(r && r.pages[pageKey] && r.pages[pageKey].indexOf(op) >= 0); }
  function pages(spec, lib) {
    var C = lib.components, perms = derivePermissions(spec, lib);
    return spec.pages.map(function (p, i) {
      var kind = C.pageKinds[p.kind] || C.pageKinds.form, roleTitles = p.roleKeys.map(function (k) { var r = find(spec.roles, function (x) { return x.key === k; }); return r ? r.title : k; });
      var fields = p.kind === 'form' ? formFields(spec) : p.kind === 'rate' ? stageFields(spec, 'rate') : p.kind === 'detail' ? spec.fields : [];
      var actions = p.kind === 'detail' || p.kind === 'list' ? spec.transitions.filter(function (tr) { return tr.by.some(function (sl) { return p.roleKeys.indexOf((roleOfSlot(spec, sl) || {}).key) >= 0; }); }).map(function (tr) { return { actionEn: tr.actionEn, action: tr.action, from: tr.from }; }) : [];
      var viewers = spec.roles.filter(function (r) { return can(perms, r.key, p.key, '查看'); }).map(function (r) { return r.title; });
      return { n: i + 1, key: p.key, kind: p.kind, kindName: kind.name, name: p.name, device: p.device, deviceName: p.device === 'phone' ? '手机' : 'PC', roles: roleTitles, roleKeys: p.roleKeys.slice(), viewers: viewers, fields: fields.map(function (f) { return f.key; }), fieldCount: fields.length, actions: actions, components: (kind[p.device] || kind.phone).slice() };
    });
  }
  function schema(spec, lib) {
    var C = lib.components, cols = [], idx = [];
    var sys = C.systemColumns;
    cols.push({ col: sys[0].col, label: sys[0].label, type: sys[0].type, required: true, unique: true, example: spec.prefix + '-2609-001', source: C.texts.sources.system });
    spec.fields.forEach(function (f) { cols.push({ col: snake(f.key), label: f.label, type: t(C.columnTypes[f.type] || 'varchar(64)', { len: f.len || 64 }), required: !!f.required, unique: false, example: f.type === 'member' && f.auto ? (actorOf(spec, f.at ? (find(spec.transitions, function (x) { return x.actionEn === f.at; }) || { by: ['handler'] }).by[0] : 'submitter', false, lib) || { id: '' }).id : exampleOf(f, lib, spec, 0), source: f.source || '对象库', fieldKey: f.key, ref: f.ref || (f.type === 'member' ? 'employees' : null) }); if (f.ref) idx.push({ name: 'idx_' + snake(f.key), cols: [snake(f.key)], unique: false }); });
    sys.slice(1).forEach(function (c) { cols.push({ col: c.col, label: c.label, type: c.type, required: c.col !== 'assignee', unique: false, example: c.col === 'status' ? initialState(spec) : c.col === 'version' ? 1 : c.col === 'assignee' ? '' : TODAY + ' 09:00', source: C.texts.sources.system }); });
    idx.unshift({ name: 'uk_id', cols: ['id'], unique: true }); idx.splice(1, 0, { name: 'idx_status_created', cols: ['status', 'created_at'], unique: false });
    return { table: spec.table, name: spec.title, columns: cols, indexes: idx, fieldCount: spec.fields.length };
  }
  function apis(spec, lib, perms) {
    perms = perms || derivePermissions(spec, lib);
    var base = '/api/' + spec.table, list = [], n = 0;
    var rolesWith = function (pageKeys, op) { return spec.roles.filter(function (r) { return pageKeys.some(function (pk) { return can(perms, r.key, pk, op); }); }).map(function (r) { return r.title; }); };
    var add = function (name, method, path, roles, extra) { n++; list.push(Object.assign({ id: 'API-' + pad(n), name: name, method: method, path: path, roles: roles }, extra || {})); };
    var listPages = spec.pages.filter(function (p) { return p.kind === 'list' || p.kind === 'mine' || p.kind === 'board'; }).map(function (p) { return p.key; });
    add('新建' + spec.title, 'POST', base, rolesWith(['form'], '新建'), { body: formFields(spec).map(function (f) { return f.key; }) });
    add(spec.title + '列表', 'GET', base, rolesWith(listPages, '查看'), { query: ['status', 'mine', 'page'] });
    add(spec.title + '详情', 'GET', base + '/:id', rolesWith(['detail', 'mine', 'list', 'list2'], '查看'));
    uniq(spec.transitions.map(function (tr) { return tr.actionEn; })).forEach(function (a) { var trs = spec.transitions.filter(function (x) { return x.actionEn === a; }), tr = trs[0]; var by = uniq(trs.reduce(function (acc, x) { return acc.concat(x.by); }, []).map(function (sl) { return roleTitle(spec, sl); })); add(tr.action, 'POST', base + '/:id/actions/' + a, by, { body: uniq(trs.reduce(function (acc, x) { return acc.concat(resolveRequire(spec, x)); }, []).concat(['expected_version'])) }); });
    if (find(spec.pages, function (p) { return p.kind === 'board'; })) add('看板统计', 'GET', base + '/stats', rolesWith(['board'], '查看'), { query: ['from', 'to'] });
    uniq(spec.stats.map(function (s) { return s.by; })).forEach(function (by) { var st = find(spec.stats, function (s) { return s.by === by; }); add('按' + st.byLabel + '统计', 'GET', base + '/stats/by_' + snake(by), rolesWith(['board'], '查看'), { query: ['from', 'to'] }); });
    if (find(spec.pages, function (p) { return p.kind === 'rate'; })) add('评价详情', 'GET', base + '/:id/rating', rolesWith(['rate', 'detail'], '查看'));
    if (spec.integrations.length) add('状态变更回调', 'POST', '/api/webhooks/' + spec.table + '/status_changed', [spec.roles[spec.roles.length - 1].title], { body: ['id', 'status', 'assignee', 'version'] });
    if (spec.rules.some(function (r) { return r.kind === 'overdueRemind'; })) add('超时提醒', 'POST', '/api/notify/' + spec.table + '/overdue', [spec.roles[spec.roles.length - 1].title], { body: ['id', 'rule', 'to'] });
    return list;
  }
  function checklist(spec, lib, testResult, perms) {
    perms = perms || derivePermissions(spec, lib);
    var C = lib.components.texts.checklist, req = spec.fields.filter(function (f) { return f.required; });
    var vals = {
      pass: !!testResult && testResult.total > 0 && testResult.failed === 0,
      required: req.length > 0 && req.every(function (f) { return !!lib.components.controls[f.type]; }),
      rolePage: spec.roles.filter(function (r) { return !r.admin; }).every(function (r) { return spec.pages.some(function (p) { return can(perms, r.key, p.key, '查看'); }); }),
      notify: !!spec.notifyChannel,
      refs: spec.integrations.length > 0 && spec.integrations.every(function (i) { return i.rows > 0; })
    };
    var items = C.map(function (c) { return { key: c.key, label: c.label, ok: !!vals[c.key], detail: c.key === 'pass' ? (testResult ? testResult.passed + ' / ' + testResult.total : '未执行') : c.key === 'required' ? req.length + ' 个必填字段' : c.key === 'rolePage' ? spec.roles.filter(function (r) { return !r.admin; }).length + ' 个角色' : c.key === 'notify' ? spec.notifyChannel : spec.integrations.length + ' 项已映射' }; });
    return { items: items, passed: items.filter(function (i) { return i.ok; }).length, total: items.length, all: items.every(function (i) { return i.ok; }) };
  }

  // ---------- 运行时（内存 · 沙箱时钟） ----------
  function actorOf(spec, slot, alt, lib) {
    var r = roleOfSlot(spec, slot); if (!r) return null;
    var id = r.emp ? (alt ? (r.emp2 || r.emp) : r.emp) : r.title;
    if (r.external && lib) { var ids = refIds(lib, spec.arche, r.external); if (ids.length) id = alt ? (ids[1] || ids[0]) : ids[0]; }
    return { slot: slot, roleKey: r.key, title: r.title, emp: r.emp ? id : null, id: id, external: !!r.external };
  }
  function exampleOf(f, lib, spec, i) {
    i = i || 0;
    var ex = f.examples && f.examples.length ? f.examples[i % f.examples.length] : f.example;
    if (f.type === 'member' && !f.auto && f.at === 'assign') { var h2 = actorOf(spec, 'handler2', false, lib) || actorOf(spec, 'handler', false, lib); if (h2) return h2.id; }
    if (typeof ex === 'string' && ex.charAt(0) === '@') {
      var k = ex.slice(1);
      if (SLOT_ORDER.indexOf(k) >= 0) { var a = actorOf(spec, k, false, lib); return a ? a.id : ''; }
      var ls = refLabels(lib, spec.arche, k); return ls.length ? ls[i % ls.length] : '';
    }
    if (f.ref && ex != null && ex !== '' && !refKnown(lib, spec.arche, f.ref, ex)) { var ls2 = refLabels(lib, spec.arche, f.ref); if (ls2.length) return ls2[i % ls2.length]; }
    return ex == null ? '' : ex;
  }
  function exampleValues(spec, fields, lib, i) { var v = {}; fields.forEach(function (f) { v[f.key] = exampleOf(f, lib, spec, i); }); return v; }
  function errText(lib, code, vars) { return t(lib.tests.errors[code] || code, vars); }
  function validateValues(spec, fields, values, lib) {
    var errs = [];
    var err = function (f, code, vars) { errs.push({ field: f.key, label: f.label, code: code, msg: errText(lib, code, Object.assign({ field: f.label }, vars || {})) }); };
    fields.forEach(function (f) {
      var v = values[f.key], empty = v == null || v === '' || (f.type === 'photo' && !(Number(v) > 0));
      if (f.required && empty) return err(f, 'E_REQUIRED');
      if (empty) return;
      if (f.type === 'text' || f.type === 'textarea') { if (f.len && String(v).length > f.len) return err(f, 'E_LEN', { len: f.len }); }
      else if (f.type === 'number' || f.type === 'money' || f.type === 'rating') { var n = Number(v); if (isNaN(n)) return err(f, 'E_FORMAT'); if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) return err(f, 'E_RANGE', { min: f.min == null ? '' : f.min, max: f.max == null ? '' : f.max }); }
      else if (f.type === 'select') { if (f.options && f.options.indexOf(String(v)) < 0) return err(f, 'E_ENUM'); }
      else if (f.type === 'photo') { if (Number(v) > (f.max || 3)) return err(f, 'E_PHOTO', { max: f.max || 3 }); }
      else if (f.type === 'phone') { if (!/^1\d{2}\s?\d{4}\s?\d{4}$/.test(String(v))) return err(f, 'E_PHONE'); }
      else if (f.type === 'date' || f.type === 'datetime') { if (isoToMin(v) == null) return err(f, 'E_FORMAT'); if (f.after && values[f.after] != null && values[f.after] !== '' && isoToMin(values[f.after]) != null && isoToMin(v) <= isoToMin(values[f.after])) { var o = find(spec.fields, function (x) { return x.key === f.after; }); return err(f, 'E_DATE', { other: o ? o.label : f.after }); } }
      if (f.ref || (f.type === 'member' && !f.auto)) { if (f.type === 'member' && spec.roles.some(function (r) { return r.title === String(v); })) return; if (!refKnown(lib, spec.arche, f.ref || 'employees', v)) return err(f, 'E_REF'); }
    });
    return errs;
  }
  function newRuntime(spec, seedRows) { var rows = clone(seedRows || []); return { rows: rows, seq: rows.length, clock: CLOCK0, log: [] }; }
  function yymm(min) { var d = dateOfMin(min); return d.slice(2, 4) + d.slice(5, 7); }
  function submit(spec, rt, actor, values, lib) {
    var ff = formFields(spec), errs = validateValues(spec, ff, values || {}, lib);
    if (errs.length) return { ok: false, code: errs[0].code, error: errs[0].msg, errors: errs };
    var r = clone(rt), vals = {};
    ff.forEach(function (f) { var v = (values || {})[f.key]; vals[f.key] = v == null || v === '' ? null : v; });
    spec.fields.forEach(function (f) { if (f.type === 'member' && f.auto && !f.at) vals[f.key] = actor.id; });
    r.seq += 1;
    var id = spec.prefix + '-' + yymm(r.clock) + '-' + pad3(r.seq), init = initialState(spec);
    var status = spec.initialRule ? (Number(vals[spec.initialRule.field]) > spec.initialRule.gt ? init : 'ok') : init;
    var row = { id: id, status: status, values: vals, createdBy: { slot: actor.slot, title: actor.title, id: actor.id }, assignee: null, version: 1, createdAt: r.clock, updatedAt: r.clock, history: [{ seq: 1, actionEn: 'submit', action: '提交', by: actor.id, role: actor.title, atMin: r.clock, from: null, to: status }] };
    r.rows.push(row); r.log.push({ seq: r.log.length + 1, role: actor.title, by: actor.id, action: '提交', id: id, at: fmtMin(r.clock), to: stateLabel(spec, status) });
    r.clock += STEP_MIN;
    return { ok: true, rt: r, id: id, row: row };
  }
  function transition(spec, rt, actor, id, actionEn, values, expectedVersion, lib) {
    var row = find(rt.rows, function (x) { return x.id === id; });
    if (!row) return { ok: false, code: 'E_NOTFOUND', error: errText(lib, 'E_NOTFOUND') };
    var cands = spec.transitions.filter(function (x) { return x.from === row.status && x.actionEn === actionEn; });
    if (expectedVersion != null && expectedVersion !== row.version) { var last = row.history[row.history.length - 1]; return { ok: false, code: 'E_VERSION', error: errText(lib, 'E_VERSION', { emp: last.by, action: last.action }) }; }
    if (!cands.length) return { ok: false, code: 'E_STATE', error: errText(lib, 'E_STATE') };
    if (!actor) return { ok: false, code: 'E_ROLE', error: errText(lib, 'E_ROLE') };
    var tr = find(cands, function (x) { return x.when === 'threshold' && spec.secondLevel && Number(row.values[spec.secondLevel.field]) >= spec.secondLevel.gte; }) || find(cands, function (x) { return !x.when; }) || cands[0];
    if (tr.by.indexOf(actor.slot) < 0) return { ok: false, code: 'E_ROLE', error: errText(lib, 'E_ROLE') };
    if (tr.scope === 'assignee' && row.assignee && row.assignee !== actor.id) return { ok: false, code: 'E_SCOPE', error: errText(lib, 'E_SCOPE') };
    var sf = stageFields(spec, tr.actionEn).filter(function (f) { return !(f.type === 'member' && f.auto); }), errs = validateValues(spec, sf, values || {}, lib);
    if (errs.length) return { ok: false, code: errs[0].code, error: errs[0].msg, errors: errs };
    var r = clone(rt), row2 = find(r.rows, function (x) { return x.id === id; });
    sf.forEach(function (f) { var v = (values || {})[f.key]; if (v != null && v !== '') row2.values[f.key] = v; });
    stageFields(spec, tr.actionEn).forEach(function (f) { if (f.type === 'member' && f.auto) row2.values[f.key] = actor.id; });
    if (tr.sets && tr.sets.assignee) { if (tr.sets.assignee === 'actor') row2.assignee = actor.id; else if (tr.sets.assignee.indexOf('values.') === 0) row2.assignee = row2.values[tr.sets.assignee.slice(7)] || actor.id; }
    if (tr.to === initialState(spec)) row2.assignee = null;
    var from = row2.status; row2.status = tr.to; row2.version += 1; row2.updatedAt = r.clock;
    row2.history.push({ seq: row2.history.length + 1, actionEn: tr.actionEn, action: tr.action, by: actor.id, role: actor.title, atMin: r.clock, from: from, to: tr.to });
    r.log.push({ seq: r.log.length + 1, role: actor.title, by: actor.id, action: tr.action, id: id, at: fmtMin(r.clock), to: stateLabel(spec, tr.to) });
    r.clock += STEP_MIN;
    return { ok: true, rt: r, row: row2, tr: tr };
  }
  function advance(rt, hours) { var r = clone(rt); r.clock += Math.round(hours * 60); return r; }
  function query(spec, rt, actor, pageKey) {
    var p = find(spec.pages, function (x) { return x.key === pageKey; }), kind = p ? p.kind : pageKey;
    if (kind === 'mine' || kind === 'form' || kind === 'rate') return rt.rows.filter(function (r) { return r.createdBy.id === actor.id; });
    if (kind === 'list') return rt.rows.filter(function (r) { var can = spec.transitions.some(function (tr) { return tr.from === r.status && tr.by.indexOf(actor.slot) >= 0 && (tr.scope !== 'assignee' || !r.assignee || r.assignee === actor.id); }); return can || r.assignee === actor.id; });
    return rt.rows.slice();
  }
  function enteredAt(row, status) { for (var i = row.history.length - 1; i >= 0; i--) if (row.history[i].to === status) return row.history[i].atMin; return row.createdAt; }
  function acceptTransition(spec) { var init = initialState(spec); return find(spec.transitions, function (x) { return x.from === init && x.sla; }) || find(spec.transitions, function (x) { return x.from === init; }); }
  function stats(spec, rt, lib) {
    var init = initialState(spec), rows = rt.rows, clock = rt.clock, acc = acceptTransition(spec);
    var byStatus = spec.states.map(function (s) { return { key: s.key, label: s.label, n: rows.filter(function (r) { return r.status === s.key; }).length }; });
    var byA = {}; rows.forEach(function (r) { if (!r.assignee) return; byA[r.assignee] = byA[r.assignee] || { id: r.assignee, n: 0, done: 0, dur: 0, durN: 0 }; byA[r.assignee].n++; var s = find(spec.states, function (x) { return x.key === r.status; }); if (s && s.terminal) { byA[r.assignee].done++; var a = find(r.history, function (h) { return acc && h.actionEn === acc.actionEn; }); if (a) { byA[r.assignee].dur += r.updatedAt - a.atMin; byA[r.assignee].durN++; } } });
    var byAssignee = Object.keys(byA).sort().map(function (k) { var x = byA[k]; return { id: x.id, n: x.n, done: x.done, avgMin: x.durN ? Math.round(x.dur / x.durN) : null }; });
    var accMins = []; rows.forEach(function (r) { if (!acc) return; var h = find(r.history, function (x) { return x.actionEn === acc.actionEn; }); if (h) accMins.push(h.atMin - r.createdAt); });
    var avgAcceptMin = accMins.length ? Math.round(accMins.reduce(function (a, b) { return a + b; }, 0) / accMins.length) : null;
    var slaH = acc && acc.sla ? acc.sla : null, overdue = [];
    rows.forEach(function (r) { if (slaH != null && r.status === init && clock - r.createdAt > slaH * 60) overdue.push({ id: r.id, kind: 'sla', waited: clock - r.createdAt, text: '超时 ' + fmtDur(clock - r.createdAt - slaH * 60) }); });
    var dueF = find(spec.fields, function (f) { return f.due; });
    if (dueF && spec.tail) rows.forEach(function (r) { if (r.status === 'lent' && r.values[dueF.key] && isoToMin(r.values[dueF.key]) != null && isoToMin(r.values[dueF.key]) < clock) overdue.push({ id: r.id, kind: 'due', waited: clock - isoToMin(r.values[dueF.key]), text: '超期 ' + fmtDur(clock - isoToMin(r.values[dueF.key])) }); });
    var flagged = [];
    spec.rules.filter(function (x) { return x.kind === 'overdueRemind'; }).forEach(function (rule) { rows.forEach(function (r) { if (r.status === rule.state && clock - enteredAt(r, rule.state) > rule.hours * 60) flagged.push({ id: r.id, rule: rule.id, role: rule.roleTitle, text: rule.listMark, waited: clock - enteredAt(r, rule.state) }); }); });
    var terminalKeys = spec.states.filter(function (s) { return s.terminal; }).map(function (s) { return s.key; });
    var todayNew = rows.filter(function (r) { return r.createdAt >= 0; }).length, todayDone = rows.filter(function (r) { return terminalKeys.indexOf(r.status) >= 0 && r.updatedAt >= 0; }).length;
    var groupBy = function (by) { var g = {}; rows.forEach(function (r) { var k = by === 'assignee' ? (r.assignee || '未分配') : by === 'createdBy' ? r.createdBy.id : by === 'status' ? stateLabel(spec, r.status) : (r.values[by] == null ? '未填' : String(r.values[by])); g[k] = g[k] || { key: k, n: 0, done: 0, rating: 0, ratingN: 0, dur: 0, durN: 0 }; g[k].n++; if (terminalKeys.indexOf(r.status) >= 0) g[k].done++; if (r.values.rating != null) { g[k].rating += Number(r.values.rating); g[k].ratingN++; } var a = acc && find(r.history, function (h) { return h.actionEn === acc.actionEn; }); if (a && terminalKeys.indexOf(r.status) >= 0) { g[k].dur += r.updatedAt - a.atMin; g[k].durN++; } }); return Object.keys(g).sort().map(function (k) { var x = g[k]; return { key: k, n: x.n, done: x.done, avgRating: x.ratingN ? Math.round(10 * x.rating / x.ratingN) / 10 : null, avgMin: x.durN ? Math.round(x.dur / x.durN) : null }; }); };
    var statGroups = spec.stats.map(function (s) { return { id: s.id, by: s.by, byLabel: s.byLabel, metric: s.metric, metricLabel: s.metricLabel, groups: groupBy(s.by) }; });
    return { total: rows.length, byStatus: byStatus, byAssignee: byAssignee, avgAcceptMin: avgAcceptMin, acceptLabel: acc ? acc.action : '', slaHours: slaH, overdue: overdue, overdueN: overdue.length, flagged: flagged, todayNew: todayNew, todayDone: todayDone,
      open: rows.filter(function (r) { return r.status === init; }).length, doing: rows.filter(function (r) { return r.status !== init && terminalKeys.indexOf(r.status) < 0; }).length, done: rows.filter(function (r) { return terminalKeys.indexOf(r.status) >= 0; }).length,
      clock: clock, clockText: fmtMin(clock, true), statGroups: statGroups, groupBy: groupBy };
  }

  // ---------- 走单脚本 ----------
  function presetFor(lib, arche, objectKey) { return find(presetsOf(lib, arche), function (p) { return p.key === objectKey; }); }
  function scriptSteps(spec, lib) {
    var tpl = tplOf(lib, spec.flow.key), raw = Array.isArray(tpl.script) ? tpl.script : tpl.script[spec.flow.mode] || tpl.script.accept;
    var preset = presetFor(lib, spec.arche, spec.objectKey), steps = [];
    raw.forEach(function (s) {
      if (s.optional && !spec.options[s.optional]) return;
      var actor = actorOf(spec, s.actor, false, lib), actions = (s.actions || []).filter(function (a) { return spec.transitions.some(function (x) { return x.actionEn === a; }); });
      if (s.kind === 'transition' && !actions.length) return;
      var label = s.kind === 'submit' ? '提交' : actions.map(function (a) { return find(spec.transitions, function (x) { return x.actionEn === a; }).action; }).join(' + ');
      var values = {};
      if (s.kind === 'submit') values = Object.assign(exampleValues(spec, formFields(spec), lib, 0), (preset && preset.script) || {});
      else actions.forEach(function (a) { Object.assign(values, exampleValues(spec, stageFields(spec, a).filter(function (f) { return !(f.type === 'member' && f.auto); }), lib, 0)); });
      if (s.kind !== 'submit' && preset) { if (actions.indexOf('assign') >= 0 && preset.assignValues) Object.assign(values, preset.assignValues); if (preset.completeValues) Object.keys(preset.completeValues).forEach(function (k) { if (find(spec.fields, function (f) { return f.key === k; })) values[k] = preset.completeValues[k]; }); }
      if (s.assignTo) { var af = assigneeField(spec), a2 = actorOf(spec, s.assignTo, false, lib); if (af && a2) values[af.key] = a2.id; }
      steps.push({ n: steps.length + 1, label: s.label === '提交' ? '提交' : label, kind: s.kind, actions: actions, actor: actor, actor2: s.actor2 ? actorOf(spec, s.actor2, false, lib) : null, values: values });
    });
    return steps;
  }
  function runScriptStep(spec, rt, step, rowId, lib) {
    if (step.kind === 'submit') return submit(spec, rt, step.actor, step.values, lib);
    var cur = rt, last = null, id = rowId;
    for (var i = 0; i < step.actions.length; i++) {
      var a = step.actions[i], row = find(cur.rows, function (x) { return x.id === id; }); if (!row) return { ok: false, code: 'E_NOTFOUND', error: errText(lib, 'E_NOTFOUND') };
      var trs = spec.transitions.filter(function (x) { return x.actionEn === a && x.from === row.status; }); if (!trs.length) continue;
      var actor = trs[0].by.indexOf(step.actor.slot) >= 0 ? step.actor : (step.actor2 && trs[0].by.indexOf(step.actor2.slot) >= 0 ? step.actor2 : actorOf(spec, trs[0].by[0], false, lib));
      last = transition(spec, cur, actor, id, a, step.values, null, lib); if (!last.ok) return last; cur = last.rt;
    }
    return last || { ok: false, code: 'E_STATE', error: errText(lib, 'E_STATE') };
  }

  // ---------- 用例枚举与执行 ----------
  function kindCfg(lib, key) { return find(lib.tests.kinds, function (k) { return k.key === key; }); }
  function pathTo(spec, target) {
    var init = initialState(spec), q = [[init, []]], seen = {}; seen[init] = 1;
    while (q.length) { var cur = q.shift(); if (cur[0] === target) return cur[1]; spec.transitions.forEach(function (tr) { if (tr.from === cur[0] && !seen[tr.to] && tr.to !== init && roleOfSlot(spec, tr.by[0])) { seen[tr.to] = 1; q.push([tr.to, cur[1].concat([tr.key])]); } }); }
    return null;
  }
  function reach(spec, rt, target, lib, submitOverride, exIndex, alt, thr) {
    exIndex = exIndex || 0;
    var init = initialState(spec), path = target === 'ok' ? [] : pathTo(spec, target); if (path == null) return { ok: false, code: 'E_STATE', error: '不可达 ' + target };
    var vals = exampleValues(spec, formFields(spec), lib, exIndex);
    if (submitOverride) Object.keys(submitOverride).forEach(function (k) { if ((spec.initialRule && k === spec.initialRule.field) || (spec.secondLevel && k === spec.secondLevel.field)) delete submitOverride[k]; });
    if (spec.initialRule) { var f0 = find(spec.fields, function (f) { return f.key === spec.initialRule.field; }); vals[spec.initialRule.field] = target === 'ok' ? 0 : Math.max(Number(vals[spec.initialRule.field]) || 0, spec.initialRule.gt + 1); if (f0 && f0.max != null) vals[spec.initialRule.field] = Math.min(vals[spec.initialRule.field], f0.max); }
    if (spec.secondLevel) { var sf = find(spec.fields, function (f) { return f.key === spec.secondLevel.field; }); var viaCond = path.some(function (k) { var tr = find(spec.transitions, function (x) { return x.key === k; }); return tr && tr.when === 'threshold'; }); if (sf) vals[spec.secondLevel.field] = viaCond ? Math.max(Number(vals[sf.key]) || 0, spec.secondLevel.gte) : Math.max(sf.min == null ? 0 : sf.min, Math.min(Number(vals[sf.key]) || 0, spec.secondLevel.gte - 1)); }
    Object.assign(vals, submitOverride || {});
    if (thr && spec.secondLevel) { var tf = find(spec.fields, function (f) { return f.key === spec.secondLevel.field; }); if (tf) vals[tf.key] = thr === 'above' ? Math.max(tf.min == null ? 0 : tf.min, spec.secondLevel.gte) : Math.max(tf.min == null ? 0 : tf.min, spec.secondLevel.gte - 1); }
    var res = submit(spec, rt, actorOf(spec, 'submitter', !!alt, lib), vals, lib); if (!res.ok) return res;
    var cur = res.rt, id = res.id;
    for (var i = 0; i < path.length; i++) {
      var tr = find(spec.transitions, function (x) { return x.key === path[i]; }), actor = actorOf(spec, tr.by[0], !!alt, lib);
      var sv = exampleValues(spec, stageFields(spec, tr.actionEn).filter(function (f) { return !(f.type === 'member' && f.auto); }), lib, exIndex);
      if (tr.sets && tr.sets.assignee && String(tr.sets.assignee).indexOf('values.') === 0) { var afk = tr.sets.assignee.slice(7), nxt = find(spec.transitions, function (x) { return x.from === tr.to; }), a3 = actorOf(spec, nxt ? nxt.by[0] : 'handler2', !!alt, lib); if (a3) sv[afk] = a3.id; }
      var r2 = transition(spec, cur, actor, id, tr.actionEn, sv, null, lib); if (!r2.ok) return r2; cur = r2.rt;
    }
    return { ok: true, rt: cur, id: id, row: find(cur.rows, function (x) { return x.id === id; }) };
  }
  function tests(spec, lib) {
    var list = [], K = lib.tests.kinds, perms = derivePermissions(spec, lib);
    var add = function (kind, name, expect, params) { var cfg = kindCfg(lib, kind); list.push({ id: 'TC-' + pad(list.length + 1), kind: kind, kindName: cfg.name, name: name, expect: expect, params: params }); };
    var init = initialState(spec), ff = formFields(spec);
    // 1 必填
    ff.filter(function (f) { return f.required; }).slice(0, kindCfg(lib, 'required').max).forEach(function (f) { add('required', t(kindCfg(lib, 'required').nameTpl, { field: f.label }), t(kindCfg(lib, 'required').expect, { field: f.label }), { field: f.key }); });
    // 2 边界
    var B = lib.tests.boundaryDesc, bd = [];
    var ft = find(ff, function (f) { return (f.type === 'text' || f.type === 'textarea') && f.len; }); if (ft) bd.push({ field: ft, code: 'E_LEN', desc: t(B.E_LEN, { n: ft.len + 1 }), value: new Array(ft.len + 2).join('字'), err: errText(lib, 'E_LEN', { field: ft.label, len: ft.len }) });
    var fn = find(ff, function (f) { return (f.type === 'number' || f.type === 'money') && f.min != null; }); if (fn) bd.push({ field: fn, code: 'E_RANGE', desc: t(B.E_RANGE_LOW, { v: fn.min }), value: fn.min - 1, err: errText(lib, 'E_RANGE', { field: fn.label, min: fn.min, max: fn.max == null ? '' : fn.max }) });
    var fx = find(ff, function (f) { return (f.type === 'number' || f.type === 'money') && f.max != null; }); if (fx) bd.push({ field: fx, code: 'E_RANGE', desc: t(B.E_RANGE_HIGH, { v: fx.max }), value: fx.max + 1, err: errText(lib, 'E_RANGE', { field: fx.label, min: fx.min == null ? '' : fx.min, max: fx.max }) });
    var fs = find(ff, function (f) { return f.type === 'select'; }); if (fs) bd.push({ field: fs, code: 'E_ENUM', desc: B.E_ENUM, value: '未知选项', err: errText(lib, 'E_ENUM', { field: fs.label }) });
    var fp = find(ff, function (f) { return f.type === 'photo'; }); if (fp) bd.push({ field: fp, code: 'E_PHOTO', desc: t(B.E_PHOTO, { n: fp.max }), value: fp.max + 1, err: errText(lib, 'E_PHOTO', { field: fp.label, max: fp.max }) });
    var fd = find(ff, function (f) { return f.after && (f.type === 'date' || f.type === 'datetime'); }); if (fd) { var other = find(spec.fields, function (x) { return x.key === fd.after; }); bd.push({ field: fd, code: 'E_DATE', desc: t(B.E_DATE, { other: other.label }), value: '2026-09-01 08:00', err: errText(lib, 'E_DATE', { field: fd.label, other: other.label }) }); }
    bd.slice(0, kindCfg(lib, 'boundary').max).forEach(function (b) { add('boundary', t(kindCfg(lib, 'boundary').nameTpl, { field: b.field.label, desc: b.desc }), t(kindCfg(lib, 'boundary').expect, { err: b.err }), { field: b.field.key, value: b.value, code: b.code }); });
    // 3 迁移正向
    var seenTr = {};
    var alwaysCond = !!(spec.secondLevel && (function () { var f = find(spec.fields, function (x) { return x.key === spec.secondLevel.field; }); return f && f.min != null && f.min >= spec.secondLevel.gte; })());
    var hasCondSibling = function (tr) { return spec.transitions.some(function (x) { return x !== tr && x.from === tr.from && x.actionEn === tr.actionEn && x.when === 'threshold'; }); };
    var skipTr = function (tr) { return alwaysCond && hasCondSibling(tr); };
    spec.transitions.forEach(function (tr) { if (tr.when === 'threshold' || seenTr[tr.key] || skipTr(tr) || !roleOfSlot(spec, tr.by[0])) return; seenTr[tr.key] = 1; if (pathTo(spec, tr.from) == null) return; add('transition', t(kindCfg(lib, 'transition').nameTpl, { from: stateLabel(spec, tr.from), to: stateLabel(spec, tr.to), role: roleTitle(spec, tr.by[0]), action: tr.action }), kindCfg(lib, 'transition').expect, { tr: tr.key, below: hasCondSibling(tr) }); });
    if (spec.secondLevel) { var c1 = find(spec.transitions, function (x) { return x.when === 'threshold'; }); if (c1) add('transition', t(kindCfg(lib, 'transition').nameTpl, { from: stateLabel(spec, c1.from), to: stateLabel(spec, c1.to), role: roleTitle(spec, c1.by[0]), action: c1.action + '（' + spec.secondLevel.text + '）' }), kindCfg(lib, 'transition').expect, { tr: c1.key, cond: true }); }
    // 4 越权
    var nRole = 0;
    spec.transitions.forEach(function (tr) { if (nRole >= kindCfg(lib, 'role').max || tr.when === 'threshold' || skipTr(tr) || !roleOfSlot(spec, tr.by[0]) || pathTo(spec, tr.from) == null) return; var wrong = find(SLOT_ORDER, function (s) { return tr.by.indexOf(s) < 0 && roleOfSlot(spec, s) && roleTitle(spec, s) !== roleTitle(spec, tr.by[0]); }); if (!wrong) return; nRole++; add('role', t(kindCfg(lib, 'role').nameTpl, { role: roleTitle(spec, wrong), action: tr.action }), kindCfg(lib, 'role').expect, { tr: tr.key, slot: wrong }); });
    // 5 非法迁移
    var illegal = find(spec.transitions, function (tr) { return tr.from !== init && !spec.transitions.some(function (x) { return x.from === init && x.actionEn === tr.actionEn; }); });
    if (illegal) add('state', t(kindCfg(lib, 'state').nameTpl, { from: stateLabel(spec, init), action: illegal.action }), kindCfg(lib, 'state').expect, { tr: illegal.key });
    // 6 重复接单（乐观锁）
    var acc = find(spec.transitions, function (tr) { return tr.from === init && tr.sets && tr.sets.assignee; });
    if (acc) { var r1 = roleOfSlot(spec, acc.by[0]); add('version', t(kindCfg(lib, 'version').nameTpl, { role: r1.title, emp2: r1.emp2 || r1.emp || '', action: acc.action }).replace(/\s{2,}/g, ' '), t(kindCfg(lib, 'version').expect, { emp: r1.emp || r1.title, action: acc.action }), { tr: acc.key }); }
    // 7 主数据校验
    var fr = find(ff, function (f) { return f.ref; });
    if (fr) { var tb = refTable(lib, spec.arche, fr.ref), ex = String(exampleOf(fr, lib, spec, 0)), bad = /\d/.test(ex) ? ex.replace(/\d+(?!.*\d)/, '99') : ex + '-99'; if (bad === ex) bad = ex + '-99'; add('ref', t(kindCfg(lib, 'ref').nameTpl, { field: fr.label, value: bad, source: tb ? tb.name : fr.ref }), t(kindCfg(lib, 'ref').expect, { field: fr.label }), { field: fr.key, value: bad }); }
    // 8 超时标记
    var acc2 = acceptTransition(spec);
    if (acc2 && acc2.sla) add('overdue', t(kindCfg(lib, 'overdue').nameTpl, { hours: acc2.sla + 1, state: stateLabel(spec, init) }), kindCfg(lib, 'overdue').expect, { hours: acc2.sla + 1 });
    // 9 权限开放
    spec.permOverrides.forEach(function (o) { var r = find(spec.roles, function (x) { return x.key === o.role; }), p = find(spec.pages, function (x) { return x.key === o.page; }); if (r && p) add('perm', t(kindCfg(lib, 'perm').nameTpl, { role: r.title, page: p.name }), kindCfg(lib, 'perm').expect, { role: o.role, page: o.page, op: o.op }); });
    // 10 看板统计
    spec.stats.forEach(function (s) { add('stat', t(kindCfg(lib, 'stat').nameTpl, { by: s.byLabel, metric: s.metricLabel }), '返回分组', { stat: s.id }); });
    // 11 提醒规则
    spec.rules.filter(function (r) { return r.kind === 'overdueRemind'; }).forEach(function (r) {
      add('rule', r.stateLabel + '未满 ' + r.n + ' ' + r.unit + '不提醒', '不标记', { rule: r.id, phase: 'before' });
      add('rule', r.stateLabel + '超过 ' + r.n + ' ' + r.unit + '标记并提醒', '标记 · 提醒' + r.roleTitle, { rule: r.id, phase: 'after' });
      add('rule', '提醒对象 ' + r.roleTitle + ' 在角色表内', '允许', { rule: r.id, phase: 'target' });
    });
    // 12 追加校验
    spec.validations.forEach(function (v) { var f = find(spec.fields, function (x) { return x.key === v.field; }); if (!f) return; if (v.kind === 'required') add('validation', f.label + '为空提交', t(kindCfg(lib, 'validation').expect, { err: errText(lib, 'E_REQUIRED', { field: f.label }) }), { field: f.key, kind: 'required' }); else { var code = f.type === 'photo' ? 'E_PHOTO' : 'E_RANGE'; add('validation', f.label + (v.kind === 'min' ? '低于 ' : '高于 ') + v.v, t(kindCfg(lib, 'validation').expect, { err: errText(lib, code, { field: f.label, min: f.min == null ? '' : f.min, max: f.max == null ? '' : f.max }) }), { field: f.key, kind: v.kind, v: v.v, code: code }); } });
    return list;
  }
  function runOne(spec, tc, seed, lib) {
    var p = tc.params, rt = newRuntime(spec, seed), res, sub = actorOf(spec, 'submitter', false, lib), vals;
    var reject = function (code) { return { pass: res && !res.ok && res.code === code, actual: res ? (res.ok ? '允许' : '拒绝「' + res.error + '」') : '未执行' }; };
    var fieldOf = function (k) { return find(spec.fields, function (f) { return f.key === k; }); };
    if (tc.kind === 'required' || (tc.kind === 'validation' && p.kind === 'required')) { vals = exampleValues(spec, formFields(spec), lib, 0); if (fieldOf(p.field) && fieldOf(p.field).at) { res = reach(spec, rt, find(spec.transitions, function (x) { return x.actionEn === fieldOf(p.field).at; }).from, lib); if (!res.ok) return reject('E_REQUIRED'); var tr0 = find(spec.transitions, function (x) { return x.actionEn === fieldOf(p.field).at; }), sv = exampleValues(spec, stageFields(spec, tr0.actionEn), lib, 0); sv[p.field] = ''; res = transition(spec, res.rt, actorOf(spec, tr0.by[0], false, lib), res.id, tr0.actionEn, sv, null, lib); return reject('E_REQUIRED'); } vals[p.field] = ''; res = submit(spec, rt, sub, vals, lib); return reject('E_REQUIRED'); }
    if (tc.kind === 'boundary') { vals = exampleValues(spec, formFields(spec), lib, 0); vals[p.field] = p.value; res = submit(spec, rt, sub, vals, lib); return reject(p.code); }
    if (tc.kind === 'validation') { var fv = fieldOf(p.field), bad = p.kind === 'min' ? fv.min - 1 : fv.max + 1, code = p.code || 'E_RANGE'; if (fv.at) { var trv = find(spec.transitions, function (x) { return x.actionEn === fv.at; }); if (!trv) return { pass: false, actual: '无对应阶段' }; res = reach(spec, rt, trv.from, lib); if (!res.ok) return { pass: false, actual: '前置失败：' + res.error }; var svv = exampleValues(spec, stageFields(spec, trv.actionEn).filter(function (f) { return !(f.type === 'member' && f.auto); }), lib, 0); svv[p.field] = bad; res = transition(spec, res.rt, actorOf(spec, trv.by[0], false, lib), res.id, trv.actionEn, svv, null, lib); return reject(code); } vals = exampleValues(spec, formFields(spec), lib, 0); vals[p.field] = bad; res = submit(spec, rt, sub, vals, lib); return reject(code); }
    if (tc.kind === 'transition' || tc.kind === 'role' || tc.kind === 'state') {
      var tr = find(spec.transitions, function (x) { return x.key === p.tr; });
      var from = tc.kind === 'state' ? initialState(spec) : tr.from;
      res = reach(spec, rt, from, lib, null, 0, false, p.cond ? 'above' : p.below ? 'below' : null); if (!res.ok) return { pass: false, actual: '前置失败：' + res.error };
      var actor = actorOf(spec, tc.kind === 'role' ? p.slot : tr.by[0], false, lib);
      var sv2 = exampleValues(spec, stageFields(spec, tr.actionEn).filter(function (f) { return !(f.type === 'member' && f.auto); }), lib, 0);
      res = transition(spec, res.rt, actor, res.id, tr.actionEn, sv2, null, lib);
      if (tc.kind === 'transition') return { pass: res.ok && res.row.status === tr.to, actual: res.ok ? '允许 → ' + stateLabel(spec, res.row.status) : '拒绝「' + res.error + '」' };
      return reject(tc.kind === 'role' ? 'E_ROLE' : 'E_STATE');
    }
    if (tc.kind === 'version') {
      var ta = find(spec.transitions, function (x) { return x.key === p.tr; });
      res = reach(spec, rt, ta.from, lib); if (!res.ok) return { pass: false, actual: '前置失败：' + res.error };
      var v0 = res.row.version, a1 = actorOf(spec, ta.by[0], false, lib), a2 = actorOf(spec, ta.by[0], true, lib);
      var sv3 = exampleValues(spec, stageFields(spec, ta.actionEn).filter(function (f) { return !(f.type === 'member' && f.auto); }), lib, 0);
      var r1 = transition(spec, res.rt, a1, res.id, ta.actionEn, sv3, v0, lib); if (!r1.ok) return { pass: false, actual: '首次' + ta.action + '失败：' + r1.error };
      res = transition(spec, r1.rt, a2, res.id, ta.actionEn, sv3, v0, lib);
      var out = reject('E_VERSION'); out.pass = out.pass && res.error.indexOf(a1.id) >= 0; return out;
    }
    if (tc.kind === 'ref') { vals = exampleValues(spec, formFields(spec), lib, 0); vals[p.field] = p.value; res = submit(spec, rt, sub, vals, lib); return reject('E_REF'); }
    if (tc.kind === 'overdue') { res = reach(spec, rt, initialState(spec), lib); if (!res.ok) return { pass: false, actual: res.error }; var st = stats(spec, advance(res.rt, p.hours), lib); var hit = find(st.overdue, function (o) { return o.id === res.id; }); return { pass: !!hit, actual: hit ? '标记超时 · ' + hit.text : '未标记' }; }
    if (tc.kind === 'perm') { var ok = can(derivePermissions(spec, lib), p.role, p.page, p.op || '查看'); return { pass: ok, actual: ok ? '允许' : '拒绝' }; }
    if (tc.kind === 'stat') { var g = find(stats(spec, rt, lib).statGroups, function (x) { return x.id === p.stat; }); return { pass: !!(g && g.groups.length), actual: g ? '返回 ' + g.groups.length + ' 组' : '无分组' }; }
    if (tc.kind === 'rule') {
      var rule = find(spec.rules, function (x) { return x.id === p.rule; });
      if (p.phase === 'target') { var has = spec.roles.some(function (r) { return r.title === rule.roleTitle; }); return { pass: has, actual: has ? '允许 · ' + rule.roleTitle : '角色不存在' }; }
      res = reach(spec, rt, rule.state, lib); if (!res.ok) return { pass: false, actual: res.error };
      var rt2 = p.phase === 'after' ? advance(res.rt, rule.hours + 1) : res.rt, fl = find(stats(spec, rt2, lib).flagged, function (x) { return x.id === res.id; });
      return p.phase === 'after' ? { pass: !!fl, actual: fl ? '标记 · 提醒' + fl.role : '未标记' } : { pass: !fl, actual: fl ? '误标记' : '不标记' };
    }
    return { pass: false, actual: '未知用例' };
  }
  function runTests(spec, seed, lib) {
    var list = tests(spec, lib), rows = list.map(function (tc) { var r = runOne(spec, tc, seed, lib); return { id: tc.id, kind: tc.kind, kindName: tc.kindName, name: tc.name, expect: tc.expect, actual: r.actual, pass: !!r.pass }; });
    var byKind = {}; rows.forEach(function (r) { byKind[r.kind] = byKind[r.kind] || { kind: r.kind, kindName: r.kindName, n: 0, passed: 0 }; byKind[r.kind].n++; if (r.pass) byKind[r.kind].passed++; });
    var warnings = []; var fp = find(spec.fields, function (f) { return f.type === 'photo'; }); if (fp) warnings.push({ id: lib.tests.warnings.photoSize.id, text: t(lib.tests.warnings.photoSize.text, { field: fp.label }) });
    var passed = rows.filter(function (r) { return r.pass; }).length;
    return { rows: rows, total: rows.length, passed: passed, failed: rows.length - passed, warnings: warnings, byKind: Object.keys(byKind).map(function (k) { return byKind[k]; }), roleBlocked: rows.filter(function (r) { return r.kind === 'role' && r.pass; }).length, passRate: rows.length ? Math.round(100 * passed / rows.length) : 0 };
  }

  // ---------- 追加需求：六种变更 ----------
  function fieldDef(spec, lib, key) { var obj = objOf(lib, spec.objectKey); return find(obj.optional, function (f) { return f.key === key; }) || lib.deltas.fieldLib[key] || null; }
  function parseDelta(spec, text, lib, opts) {
    opts = opts || {};
    var arche = spec.arche, fus = followUpsOf(lib, arche), original = text == null ? '' : String(text), mode = 'exact', preset = null;
    var build = function (txt) {
      var tk = tokenize(txt, lib, arche), tokens = tk.tokens, ops = [], used = {};
      var D = lib.deltas, hasT = function (type, key) { return tokens.some(function (x) { return x.type === type && (!key || x.key === key) && !x.neg; }); };
      var byClause = function (ci) { return tokens.filter(function (x) { return x.clause === ci; }); };
      var pushField = function (key, source) { var def = fieldDef(spec, lib, key); if (!def) return; if (find(spec.fields, function (f) { return f.key === key; })) { ops.push({ type: 'addField', field: def, exists: true }); return; } ops.push({ type: 'addField', field: def, source: source || '需求追加' }); };
      // 1 节点
      var st = D.stateTemplates;
      if (hasT('action', 'rate')) { var byTok = find(tokens, function (x) { return x.type === 'role' && spec.roles.some(function (r) { return r.title === x.canon && !r.admin; }); }); var slot = byTok ? (roleOfSlot(spec, 'submitter').title === byTok.canon ? 'submitter' : find(spec.roles, function (r) { return r.title === byTok.canon; }).slots[0]) : 'submitter'; ops.push({ type: 'addState', state: st.rated.state, transition: Object.assign({}, st.rated.transition, { by: [slot] }), fields: [], page: st.rated.page, exists: !!find(spec.states, function (s) { return s.key === 'rated'; }) }); st.rated.fields.forEach(function (k) { pushField(k); used[k] = 1; }); tokens.forEach(function (x) { if (x.type === 'action' && (x.key === 'rate' || x.key === 'complete')) x.used = true; }); }
      if (hasT('action', 'reject') || hasT('field', 'rejectReason')) { if (spec.flow.key === 'dispatch') ops.push({ type: 'addState', state: st.rejected.state, transition: st.rejected.transition, fields: [], page: null, exists: !!find(spec.states, function (s) { return s.key === 'rejected'; }) }); pushField('rejectReason'); used.rejectReason = 1; tokens.forEach(function (x) { if (x.type === 'action' && x.key === 'reject') x.used = true; }); }
      if (hasT('action', 'recheck') && hasT('delta', 'addState')) { var rSlot = roleOfSlot(spec, 'handler2') ? 'handler2' : 'handler'; ops.push({ type: 'addState', state: st.rechecked.state, transition: Object.assign({}, st.rechecked.transition, { by: [rSlot] }), fields: [], page: null, exists: !!find(spec.states, function (s) { return s.key === 'rechecked'; }) }); pushField('recheckNote'); used.recheckNote = 1; }
      // 2 统计
      var valClauses = {}; tokens.forEach(function (x) { if (x.type === 'delta' && x.key === 'addValidation') valClauses[x.clause] = 1; });
      var statToks = tokens.filter(function (x) { return x.type === 'stat' && !valClauses[x.clause]; });
      if (statToks.length || hasT('delta', 'addStat') || hasT('action', 'stat')) {
        var ci = (statToks[0] || find(tokens, function (x) { return x.type === 'action' && x.key === 'stat'; }) || tokens[0]).clause, same = byClause(ci).concat(tokens.filter(function (x) { return x.clause !== ci; }));
        var roleTok = find(same, function (x) { return x.type === 'role' && spec.roles.some(function (r) { return r.title === x.canon && r.slots.indexOf('lead') < 0 && !r.admin; }); });
        var extTok = find(same, function (x) { return x.type === 'role' && (x.key === 'role.customer' || x.key === 'role.store'); });
        var fieldTok = find(same, function (x) { return x.type === 'field' && D.statBy[x.key] && find(spec.fields, function (f) { return f.key === D.statBy[x.key]; }); });
        var custField = find(spec.fields, function (f) { return f.ref === 'customers' && !f.at; });
        var roleRole = roleTok ? find(spec.roles, function (r) { return r.title === roleTok.canon; }) : null;
        var by, byLabel;
        if (roleRole && roleRole.slots.indexOf('submitter') >= 0) { by = roleRole.external && custField ? custField.key : 'createdBy'; byLabel = roleRole.external && custField ? custField.label : roleTok.canon; }
        else if (roleTok) { by = 'assignee'; byLabel = roleTok.canon; }
        else if (extTok && custField) { by = custField.key; byLabel = custField.label; }
        else if (fieldTok) { by = D.statBy[fieldTok.key]; byLabel = find(spec.fields, function (f) { return f.key === by; }).label; }
        else { by = 'assignee'; byLabel = '处理人'; }
        if (fieldTok) fieldTok.used = true;
        var metrics = statToks.length ? uniq(statToks.map(function (x) { return x.key; })) : ['statCount'];
        metrics.forEach(function (m) { ops.push({ type: 'addStat', by: by, byLabel: byLabel, metric: m, metricLabel: D.statMetrics[m].label, unit: D.statMetrics[m].unit, exists: !!find(spec.stats, function (s) { return s.by === by && s.metric === m; }) }); });
      }
      // 3 规则
      var qty = find(tokens, function (x) { return x.type === 'qty'; });
      if ((hasT('action', 'remind') || hasT('delta', 'addRule')) && qty) {
        var timeTok = find(tokens, function (x) { return x.type === 'time'; }), stKey = timeTok ? D.timeStates[timeTok.key] : '@initial'; if (stKey === '@initial' || !find(spec.states, function (s) { return s.key === stKey; })) stKey = initialState(spec);
        var rTok = find(tokens, function (x) { return x.type === 'role' && x.pos > (find(tokens, function (y) { return y.type === 'action' && y.key === 'remind'; }) || { pos: -1 }).pos; }) || find(tokens, function (x) { return x.type === 'role'; });
        var roleT = rTok && spec.roles.some(function (r) { return r.title === rTok.canon; }) ? rTok.canon : roleTitle(spec, 'lead');
        var hours = qty.unit === '分钟' ? qty.n / 60 : qty.unit === '小时' ? qty.n : qty.unit === '天' ? qty.n * 24 : qty.n * 24;
        var rule = { n: qty.n, unit: qty.unit, hours: hours, state: stKey, stateLabel: stateLabel(spec, stKey), roleTitle: roleT, text: t(D.ruleTemplate.text, { n: qty.n, unit: qty.unit, stateLabel: '离开' + stateLabel(spec, stKey), role: roleT }).replace('未离开', '仍在'), listMark: t(D.ruleTemplate.listMark, { n: qty.n, unit: qty.unit }) };
        ops.push({ type: 'addRule', rule: rule, exists: !!find(spec.rules, function (x) { return x.kind === 'overdueRemind' && x.state === stKey && x.hours === hours; }) });
        qty.used = true;
      }
      // 4 校验
      tokens.filter(function (x) { return x.type === 'delta' && x.key === 'addValidation'; }).forEach(function (x) {
        var kind = /必|不能为空/.test(x.surface) ? 'required' : /最低|至少/.test(x.surface) ? 'min' : 'max';
        var ftk = find(byClause(x.clause).slice().reverse(), function (y) { return y.type === 'field' && y.pos < x.pos && find(spec.fields, function (f) { return f.key === y.key; }); }) || find(byClause(x.clause), function (y) { return y.type === 'field' && find(spec.fields, function (f) { return f.key === y.key; }); });
        var f = ftk ? find(spec.fields, function (z) { return z.key === ftk.key; }) : null;
        if (!f) { var lbTok = find(byClause(x.clause), function (y) { return (y.type === 'stat' || y.type === 'field') && y.pos < x.pos && spec.fields.some(function (z) { return !z.auto && z.label.indexOf(y.surface) >= 0; }); }); if (lbTok) { f = find(spec.fields, function (z) { return !z.auto && z.label.indexOf(lbTok.surface) >= 0; }); lbTok.used = true; } }
        if (!f) return; if (ftk) ftk.used = true;
        var q = find(byClause(x.clause), function (y) { return y.type === 'qty' && !y.used; }), v = q ? q.n : null;
        if (kind !== 'required' && v == null) return;
        var textV = t(D.validationKinds[kind].text, { field: f.label, v: v });
        ops.push({ type: 'addValidation', field: f.key, label: f.label, kind: kind, v: v, text: textV, exists: kind === 'required' ? !!f.required : (kind === 'min' ? f.min === v : f.max === v) });
      });
      // 5 字段
      tokens.filter(function (x) { return x.type === 'field' && !x.neg && !x.used && !used[x.key]; }).forEach(function (x) { var inClause = byClause(x.clause).some(function (y) { return y.type === 'delta' && y.key === 'addField'; }); if (!inClause && ops.length) return; if (!fieldDef(spec, lib, x.key)) return; pushField(x.key); used[x.key] = 1; });
      // 6 角色
      if (hasT('delta', 'addRole')) { var nr = find(tokens, function (x) { return x.type === 'role' && !spec.roles.some(function (r) { return r.title === x.canon; }); }); if (nr) ops.push({ type: 'addRole', title: nr.canon, slot: 'handler2', label: '协办人', exists: false }); }
      var hitC = {}; tokens.forEach(function (x) { hitC[x.clause] = 1; });
      return { ops: ops, evidence: tokens.map(function (x) { return { type: x.type, key: x.key, canon: x.canon, surface: x.surface, clause: x.clause, neg: !!x.neg }; }), hits: uniq(tokens.map(function (x) { return x.surface; })).length, unknown: tk.clauses.filter(function (c, i) { return !hitC[i]; }).length };
    };
    var r = build(original);
    if (!r.ops.length && !opts.noFallback && fus.length) { var nr2 = nearest(original, fus, function (f) { return f.text; }); preset = nr2.score >= 0.18 && nr2.index != null ? nr2.index : 0; mode = 'fallback'; r = build(fus[preset].text); }
    var effective = r.ops.filter(function (o) { return !o.exists; });
    return { text: original, mode: mode, preset: preset, ops: r.ops, effective: effective, noop: r.ops.length > 0 && !effective.length, evidence: r.evidence, hits: r.hits, unknown: r.unknown, types: uniq(r.ops.map(function (o) { return o.type; })), summary: r.ops.map(function (o) { return deltaText(o, lib); }) };
  }
  function deltaText(o, lib) { var name = find(lib.deltas.types, function (x) { return x.key === o.type; }).name; if (o.type === 'addField') return name + ' ' + o.field.label; if (o.type === 'addState') return name + ' ' + o.state.label; if (o.type === 'addStat') return name + ' 按' + o.byLabel + '统计' + o.metricLabel; if (o.type === 'addRule') return name + ' ' + o.rule.text; if (o.type === 'addValidation') return name + ' ' + o.text; if (o.type === 'addRole') return name + ' ' + o.title; return name; }
  function summarize(spec, lib) { var perms = derivePermissions(spec, lib); return { pages: spec.pages.length, fields: spec.fields.length, roles: spec.roles.filter(function (r) { return !r.admin; }).length, states: spec.states.length, transitions: spec.transitions.length, apis: apis(spec, lib, perms).length, tests: tests(spec, lib).length }; }
  function applyOps(spec, ops, lib) { var s = spec; ops.forEach(function (o) { if (o.exists) return; s = patch(s, o, lib); }); return s; }
  function diffSpec(a, b, lib) {
    var labels = function (arr, k) { return arr.map(function (x) { return x[k]; }); };
    var dd = function (xa, xb) { return { added: xb.filter(function (x) { return xa.indexOf(x) < 0; }), removed: xa.filter(function (x) { return xb.indexOf(x) < 0; }) }; };
    var sa = summarize(a, lib), sb = summarize(b, lib);
    return { before: sa, after: sb, fields: dd(labels(a.fields, 'label'), labels(b.fields, 'label')), states: dd(labels(a.states, 'label'), labels(b.states, 'label')), transitions: dd(labels(a.transitions, 'action'), labels(b.transitions, 'action')), pages: dd(labels(a.pages, 'name'), labels(b.pages, 'name')), apis: dd(labels(apis(a, lib), 'path'), labels(apis(b, lib), 'path')), tests: { before: sa.tests, after: sb.tests, added: sb.tests - sa.tests }, rules: dd(labels(a.rules, 'text'), labels(b.rules, 'text')), stats: dd(a.stats.map(function (s) { return s.byLabel + s.metricLabel; }), b.stats.map(function (s) { return s.byLabel + s.metricLabel; })) };
  }
  function previewDelta(spec, text, lib) { var d = parseDelta(spec, text, lib); var s2 = applyOps(spec, d.ops, lib); var diff = diffSpec(spec, s2, lib); return { delta: d, diff: diff, states: diff.states.added.length, fields: diff.fields.added.length, pages: diff.pages.added.length, apis: diff.apis.added.length, tests: diff.tests.added, rules: diff.rules.added.length, stats: diff.stats.added.length }; }

  // ---------- 发布 / 交付 / 报告 / KPI ----------
  function envName(lib, env) { return lib.components.texts.envNames[env] || env; }
  function publishNote(spec, lib) { var s = summarize(spec, lib); return t(lib.components.texts.publishNote, { title: spec.title, pages: s.pages, fields: s.fields, states: s.states, roles: s.roles }); }
  function qrText(state, base) { return (base || QR_BASE) + '?app=' + (state.spec ? state.spec.id : IDS.app) + '&v=' + (state.spec ? state.spec.version : 'V1.0.0'); }
  function pipeline(state, lib) { var P = lib.components.texts.pipeline, env = state.env; var idx = env === 'live' ? 5 : env === 'prod' ? 4 : env === 'smoke' ? 3 : env === 'staging' ? 2 : 1; return P.map(function (label, i) { return { key: i, label: label, state: i + 1 < idx ? 'done' : i + 1 === idx ? 'on' : 'todo' }; }); }
  function deliverables(state, R, lib) {
    var spec = state.spec; if (!spec) return [];
    var vers = uniq(state.releases.map(function (r) { return r.version; })).length;
    var list = [
      { key: 'req', name: '需求说明', no: spec.reqNo, count: R.parsed.hits + ' 词 · ' + (spec.status === 'confirmed' ? '已确认' : '已识别') },
      { key: 'pages', name: '页面清单', no: spec.specNo + ' ' + spec.specVer, count: spec.pages.length + ' 页' },
      { key: 'dict', name: '数据字典', no: spec.table, count: '1 表 ' + spec.fields.length + ' 字段' },
      { key: 'apis', name: '接口文档', no: 'API', count: R.apis.length + ' 个' },
      { key: 'tests', name: '测试报告', no: 'CS-' + pad3(state.testRuns || 1), count: R.testResult.passed + ' / ' + R.testResult.total + ' 通过' },
      { key: 'releases', name: '发布记录', no: state.releases.length ? state.releases[state.releases.length - 1].id : 'FB', count: vers + ' 版 · ' + state.releases.length + ' 次' },
      { key: 'perms', name: '权限矩阵', no: spec.specNo, count: spec.roles.length + ' 角色 × ' + spec.pages.length + ' 页' }
    ];
    if (state.changes.length) list.push({ key: 'changes', name: '变更清单', no: state.changes[state.changes.length - 1].id, count: state.changes.reduce(function (n, c) { return n + c.items.length; }, 0) + ' 项' });
    return list.map(function (x) { x.status = '已生成'; return x; });
  }
  function report(state, R, lib) {
    var spec = state.spec, T = lib.components.texts.report, last = state.releases[state.releases.length - 1];
    var recipients = uniq([roleTitle(spec, 'lead'), lib.roles.admin]).join(' · ');
    var vars = { company: spec.company || '', title: spec.title, version: spec.version, reqText: R.parsed.objectName + ' · ' + R.parsed.flowName + (R.parsed.flowModeName ? '（' + R.parsed.flowModeName + '）' : '') + ' · 识别 ' + R.parsed.hits + ' 词',
      pages: spec.pages.length, fields: spec.fields.length, roles: spec.roles.filter(function (r) { return !r.admin; }).length, states: spec.states.length, channels: spec.channels.map(function (c) { return c.name; }).join(' · '),
      testNo: 'CS-' + pad3(state.testRuns || 1), tests: R.testResult.total, passed: R.testResult.passed, roleBlocked: R.testResult.roleBlocked,
      releaseText: last ? last.version + ' ' + last.envName + ' ' + last.at + ' · 共 ' + state.releases.length + ' 次' : '待发布',
      changeText: state.changes.length ? state.changes.map(function (c) { return c.id + ' ' + c.from + ' → ' + c.to + '：' + c.items.map(function (i) { return i.content; }).join('；'); }).join('；') : T.noChange,
      refText: spec.integrations.map(function (i) { return i.name + ' ' + i.rows + ' ' + i.unit + '（' + i.system + '）'; }).join(' · '), recipients: recipients };
    return { title: t(T.title, vars), lines: T.lines.map(function (l) { return t(l, vars); }), text: [t(T.title, vars)].concat(T.lines.map(function (l) { return t(l, vars); })).join('\n'), recipients: recipients, no: IDS.report };
  }
  function kpi(state, R) {
    var spec = state.spec; if (!spec) return { pages: R.preview.pages, fields: R.preview.fields, roles: R.preview.roles, states: R.preview.states, apis: R.preview.apis, tests: R.preview.tests };
    return { pages: spec.pages.length, fields: spec.fields.length, roles: spec.roles.filter(function (r) { return !r.admin; }).length, states: spec.states.length, transitions: spec.transitions.length, apis: R.apis.length, tests: R.testResult.total, passed: R.testResult.passed, failed: R.testResult.failed, passRate: R.testResult.passRate, roleBlocked: R.testResult.roleBlocked, warnings: R.testResult.warnings.length,
      versions: uniq(state.releases.map(function (r) { return r.version; })).length, releases: state.releases.length, env: state.env, overdue: R.stats.overdueN, open: R.stats.open, avgAcceptMin: R.stats.avgAcceptMin, rows: R.stats.total, checklist: R.checklist.passed + ' / ' + R.checklist.total, changes: state.changes.length, specVer: spec.specVer, version: spec.version };
  }

  // ---------- 样本 / 一次算全 ----------
  function ensure(raw) {
    var d = clone(raw);
    d.state = Object.assign({ text: null, presetIndex: 0, parsed: null, spec: null, prevSpec: null, rt: null, releases: [], log: [], testRuns: 0, changes: [], script: { step: 0, id: null }, env: null, sent: false, lastResult: null, delta: null }, d.state || {});
    d.seed = d.seed || { byObject: {} };
    d.systems = d.systems || [];
    return d;
  }
  function ctxOf(d) { return { arche: d.archetype, company: d.company, systems: d.systems || [] }; }
  function seedRows(d, objectKey) { return (d.seed.byObject && d.seed.byObject[objectKey]) || []; }
  function run(d, lib) {
    var state = d.state, arche = d.archetype, ctx = ctxOf(d), presets = presetsOf(lib, arche), fus = followUpsOf(lib, arche);
    var text = state.text != null && state.text !== '' ? state.text : presets[state.presetIndex || 0].text;
    var parsed = state.spec ? state.parsed : parse(text, lib, arche);
    var R = { arche: arche, company: d.company, today: TODAY, text: text, parsed: parsed, presets: presets.map(function (p, i) { var pp = parse(p.text, lib, arche), ps = plan(pp, lib, ctx); return { index: i, key: p.key, text: p.text, objectName: pp.objectName, flowName: pp.flowName, summary: summarize(ps, lib), active: !state.spec && ((state.text == null || state.text === '') ? i === (state.presetIndex || 0) : state.text === p.text) }; }), followUps: [] };
    var refsMeta = {}; ['machines', 'employees', 'customers', 'products', 'lines', 'orders', 'materials'].forEach(function (s) { var tb = refTable(lib, arche, s); if (tb && tb.count) refsMeta[s] = { source: s, name: tb.name, system: tb.system, count: tb.count, unit: tb.unit, syncAt: tb.syncAt, sample: tb.rows.slice(0, 6).map(function (r) { return r.id; }), mode: tb.directIf.some(function (x) { return ctx.systems.indexOf(x) >= 0; }) ? 'direct' : 'import' }; }); R.refs = refsMeta;
    if (!state.spec) { var ps0 = plan(parsed, lib, ctx); R.preview = summarize(ps0, lib); R.previewSpec = ps0; R.spec = null; R.kpi = kpi(state, R); R.log = state.log; return R; }
    var spec = state.spec;
    R.spec = spec; R.perms = derivePermissions(spec, lib); R.pages = pages(spec, lib); R.schema = schema(spec, lib); R.apis = apis(spec, lib, R.perms); R.tests = tests(spec, lib);
    R.testResult = runTests(spec, seedRows(d, spec.objectKey), lib);
    R.rt = state.rt; R.stats = stats(spec, state.rt, lib); R.checklist = checklist(spec, lib, R.testResult, R.perms); R.script = scriptSteps(spec, lib); R.scriptStep = state.script.step; R.scriptId = state.script.id;
    R.recommended = objOf(lib, spec.objectKey).optional.filter(function (f) { return !find(spec.fields, function (x) { return x.key === f.key; }); }).slice(0, 4);
    R.suggestion = suggestion(spec, lib, R.perms);
    R.releases = state.releases; R.env = state.env; R.pipeline = pipeline(state, lib); R.qrText = qrText(state, lib.qrBase); R.prevSpec = state.prevSpec; R.diff = state.prevSpec ? diffSpec(state.prevSpec, spec, lib) : null; R.changes = state.changes;
    R.followUps = fus.map(function (f, i) { var pv = previewDelta(spec, f.text, lib); return { index: i, text: f.text, states: pv.states, fields: pv.fields, pages: pv.pages, apis: pv.apis, tests: pv.tests, rules: pv.rules, stats: pv.stats, types: pv.delta.types, applied: state.changes.some(function (c) { return c.text === f.text; }) }; });
    R.deliverables = deliverables(state, R, lib); R.report = report(state, R, lib); R.kpi = kpi(state, R); R.log = state.log; R.lastResult = state.lastResult;
    return R;
  }
  function suggestion(spec, lib, perms) {
    var board = find(spec.pages, function (p) { return p.kind === 'board'; }), handler = roleOfSlot(spec, 'handler');
    if (!board || !handler) return null;
    var done = can(perms, handler.key, board.key, '查看');
    var acc = acceptTransition(spec), accName = acc ? acc.action : '处理';
    return { role: handler.key, roleTitle: handler.title, page: board.key, pageName: board.name, op: '查看', done: done, text: handler.title + '默认看不到' + board.name + ' · 建议开放 查看', reason: '看板只对' + roleTitle(spec, 'lead') + '开放；' + handler.title + '需要看到本组排队与超时才好' + accName };
  }

  // ---------- 对话与文档摄入 ----------
  // screens / brief / suggest / ask / ingest 五个导出：纯函数，只认入参，不碰页面、宿主全局、时钟与随机数。
  // result 是 run(data, lib) 的结果，可选：传了就用，没传自己算一次。答不上返回 null，不编数。
  // 回答里的 blocks 是平台中立的纯数据（kv / table / tags / text），act 是声明式动作（goto / focus / open / apply / set）。
  // 选中态不在契约里：角色 / 手机页 / 记录的选中由平台按 act 自己回写，内核只认 data + step。
  var SCREENS = [['connect', '接入'], ['build', '生成应用'], ['try', '试用'], ['test', '测试与产物'], ['ship', '发布'], ['iterate', '迭代交付']];
  var DOC_LABEL = { word: 'Word', excel: 'Excel', ppt: 'PPT', pdf: 'PDF', eml: '邮件', text: '文本' };
  var WORD_LABEL = { object: '业务对象', role: '角色', action: '动作', channel: '渠道', field: '字段', qty: '时限', time: '时限', stat: '统计', delta: '变更' };
  var RULES = ['G-01 对象按词典正向长词优先匹配打分，并列取先出现的', 'G-02 字段来自对象库，需求句里命中的可选字段一并加入，否定词移除', 'G-03 模板由对象决定，动作序列与模板签名的公共子序列长度作证据', 'G-04 渠道固定 微信扫码 H5 · PC 后台', 'G-05 角色槽位按业态默认岗位填，句中角色词按其后的动作绑定槽位'];

  function screens() { return SCREENS.map(function (s) { return { key: s[0], label: s[1] }; }); }
  function resultOf(data, lib, result) { return (result && result.parsed && result.kpi && result.presets) ? result : run(ensure(data), lib); }
  function cut(x, n) { x = String(x == null ? '' : x); return x.length > n ? x.slice(0, n) + '…' : x; }
  function hasWord(q, list) { for (var i = 0; i < list.length; i++) if (q.indexOf(list[i]) >= 0) return true; return false; }
  function kvB(rows) { return { type: 'kv', rows: rows }; }
  function tableB(head, rows) { return { type: 'table', head: head, rows: rows.slice(0, 6) }; }
  function tagsB(items) { return { type: 'tags', items: items }; }
  function textB(s) { return { type: 'text', text: s }; }
  function rtRows(R) { return R.rt ? R.rt.rows : []; }
  function rowById(R, id) { return find(rtRows(R), function (r) { return r.id === id; }); }
  function waitOf(R, row) { return fmtDur(Math.max(0, R.rt.clock - row.createdAt)); }
  function rowTitle(spec, row) {
    var f = spec.fields.filter(function (x) { return !x.at && x.type !== 'member' && x.type !== 'photo'; });
    var a = f[0] ? row.values[f[0].key] : '', b = f[1] ? row.values[f[1].key] : '';
    return [a, b].filter(function (x) { return x != null && x !== ''; }).map(String).join(' · ');
  }
  function docLabel(kind) { return DOC_LABEL[kind] || '文件'; }

  // 开场发现：进这一屏先说一条从数据里算出来的话
  function brief(step, data, lib, result) {
    if (!step) step = SCREENS[0][0];                 /* 不传 step = 首屏（SPEC §10.2 / §10.3） */
    var R = resultOf(data, lib, result);
    if (!R.spec || step === 'connect') {
      var p = R.parsed, v = R.preview || R.kpi;
      return '这句话命中 ' + p.hits + ' 词、未识别 ' + p.unknown + '，落下来是 ' + p.objectName + ' ' + v.pages + ' 页 ' + v.fields + ' 字段 ' + v.roles + ' 角色 ' + v.states + ' 节点。';
    }
    var s = R.spec, k = R.kpi;
    if (step === 'build') {
      var ph = R.pages.filter(function (p) { return p.device === 'phone'; }).length;
      return s.id + ' ' + s.version + '：' + k.pages + ' 页里手机 ' + ph + ' 页、PC ' + (k.pages - ph) + ' 页，' + k.fields + ' 字段必填 ' + s.fields.filter(function (f) { return f.required; }).length + ' 个。';
    }
    if (step === 'try') {
      var st = R.stats, ov = st.overdue[0], row = ov ? rowById(R, ov.id) : null;
      if (ov) return ov.id + ' 已等 ' + (row ? waitOf(R, row) : '—') + '，' + ov.text + '，约定' + st.acceptLabel + ' ' + st.slaHours + ' 小时。';
      return '今日' + s.verb + ' ' + st.todayNew + ' 单，' + stateLabel(s, initialState(s)) + ' ' + st.open + ' 单，平均' + st.acceptLabel + ' ' + (st.avgAcceptMin == null ? '—' : st.avgAcceptMin + ' 分') + '。';
    }
    if (step === 'test') {
      var tr = R.testResult, sg = R.suggestion;
      return tr.passed + ' / ' + tr.total + ' 条用例通过、越权拦截 ' + tr.roleBlocked + ' 次' + (sg && !sg.done ? '；' + sg.roleTitle + '默认看不到' + sg.pageName + '。' : '。');
    }
    if (step === 'ship') {
      var ck = R.checklist;
      return '发布前检查 ' + ck.passed + ' / ' + ck.total + '，' + s.version + (R.env === 'live' ? ' 已上线，冒烟通过。' : ' 还在测试环境，可发正式。');
    }
    if (step === 'iterate') {
      var last = R.changes[R.changes.length - 1];
      if (last) return last.from + ' → ' + last.to + '：' + last.items.length + ' 项变更，旧用例 ' + last.oldPassed + ' / ' + last.oldTests + ' 仍通过，存量 ' + last.stock.rows + ' 条不动。';
      var fu = R.followUps.slice().sort(function (a, b) { return (b.pages + b.fields + b.states + b.tests) - (a.pages + a.fields + a.states + a.tests); })[0];
      if (fu) return '追加需求 ' + R.followUps.length + ' 条，改动大的一条「' + cut(fu.text, 14) + '」+' + fu.pages + ' 页 ' + fu.fields + ' 字段 ' + fu.tests + ' 用例。';
    }
    return null;
  }

  // 快捷问句：每屏三到四条，条条都能被 ask 答上
  function suggest(step, data, lib, result) {
    if (!step) step = SCREENS[0][0];                 /* 不传 step = 首屏（SPEC §10.2 / §10.3） */
    var R = resultOf(data, lib, result);
    if (!R.spec || step === 'connect') return ['哪些词命中了', '主数据从哪来', '能生成几页', '生成应用'];
    var s = R.spec;
    if (step === 'build') return ['手机上有哪几页', '哪些字段必填', R.recommended[0] ? '加一个' + R.recommended[0].label : '流程几个节点', '怎么生成的'];
    if (step === 'try') return ['哪一单超时了', stateLabel(s, initialState(s)) + '还有几单', '平均' + R.stats.acceptLabel + '多久', '走下一步'];
    if (step === 'test') return ['有没有失败的用例', '越权拦截了什么', R.suggestion && !R.suggestion.done ? '采纳这条建议' : '接口有几个', '数据字典多少列'];
    if (step === 'ship') return ['发布前检查过了吗', '二维码扫出来是什么', '发到正式环境'];
    if (step === 'iterate') return [bump(s.version, 'minor') + ' 会多什么', '存量数据怎么办', '生成 ' + bump(s.version, 'minor'), '交付清单有哪些'];
    return [];
  }

  // 问答：认得的问法逐条作答，答不上返回 null 交给平台兜底
  function ask(question, step, data, lib, result) {
    var R = resultOf(data, lib, result);
    var q = String(question == null ? '' : question), s = R.spec;

    if (hasWord(q, ['命中', '哪些词', '识别', '没认出', '未识别', '解析', '哪几个词'])) {
      var p0 = R.parsed;
      return { text: '命中 ' + p0.hits + ' 词、未识别 ' + p0.unknown + '。' + p0.evidence.slice(0, 4).map(function (e) { return e.surface + ' → ' + e.canon; }).join('；') + '。',
        blocks: [tableB(['识别词', '映射', '类型'], p0.evidence.slice(0, 6).map(function (e) { return [e.surface, e.canon, WORD_LABEL[e.type] || e.type]; }))],
        act: { type: 'open', panel: 'parse' } };
    }
    if (hasWord(q, ['主数据', '数据源', '来源', '哪来', '同步', '台账', '名册', '接入', '通了', '连上'])) {
      var keys = Object.keys(R.refs).slice(0, 3);
      return { text: keys.map(function (x) { var r = R.refs[x]; return r.name + ' ' + fmtN(r.count) + ' ' + r.unit + '（' + r.system + ' · ' + (r.mode === 'direct' ? '系统直连' : '表格导入') + '，同步 ' + r.syncAt + '）'; }).join('\n'),
        blocks: [tableB(['主数据', '条数', '方式'], keys.map(function (x) { var r = R.refs[x]; return [r.name, fmtN(r.count) + ' ' + r.unit, r.mode === 'direct' ? '直连' : '导入']; }))],
        act: { type: 'open', panel: 'source' } };
    }
    if (!s) {
      if (hasWord(q, ['几页', '多少页', '能生成', '多大'])) {
        var v0 = R.preview;
        return { text: R.parsed.objectName + ' ' + v0.pages + ' 页 · ' + v0.fields + ' 字段 · ' + v0.roles + ' 角色 · ' + v0.states + ' 节点，接口 ' + v0.apis + ' 个、用例 ' + v0.tests + ' 条。',
          act: { type: 'open', panel: 'preview' } };
      }
      if (hasWord(q, ['生成应用', '开始生成', '直接生成', '做出来'])) {
        return { text: '按这句话生成 ' + R.parsed.objectName + '，' + R.preview.pages + ' 页 ' + R.preview.fields + ' 字段，一次 ' + CREDITS + ' 积分。', act: { type: 'apply', action: 'generate' } };
      }
      return null;
    }

    var k = R.kpi, st = R.stats, tr = R.testResult;

    /* —— 点名某一条记录 / 用例 / 接口 —— */
    var idHit = null;
    rtRows(R).forEach(function (r) { if (q.indexOf(r.id) >= 0 || (r.id.length > 4 && q.indexOf(r.id.slice(-3)) >= 0)) idHit = r; });
    if (idHit) {
      var ovx = st.overdue.filter(function (o) { return o.id === idHit.id; })[0];
      return { text: idHit.id + ' ' + rowTitle(s, idHit) + '\n' + stateLabel(s, idHit.status) + ' · ' + (idHit.assignee ? '处理人 ' + idHit.assignee : '未接单') + ' · ' + fmtMin(idHit.createdAt) + ' 提交，已等 ' + waitOf(R, idHit) + (ovx ? '（' + ovx.text + '）' : '') + '。',
        blocks: [tableB(['动作', '角色', '时刻'], idHit.history.slice(0, 5).map(function (x) { return [x.action, x.role, fmtMin(x.atMin)]; }))],
        ref: idHit.id, act: { type: 'focus', ref: idHit.id } };
    }
    var mTc = /TC[-\s]?(\d{1,2})/i.exec(q);
    if (mTc) {
      var t1 = tr.rows.filter(function (x) { return x.id === 'TC-' + ('0' + mTc[1]).slice(-2); })[0];
      if (t1) return { text: t1.id + ' ' + t1.kindName + '：' + t1.name + '\n预期 ' + t1.expect + '\n实际 ' + t1.actual + '\n' + (t1.pass ? '通过' : '失败') + '。', ref: t1.id, act: { type: 'focus', ref: t1.id } };
    }
    var mApi = /API[-\s]?(\d{1,2})/i.exec(q);
    if (mApi) {
      var a1 = R.apis.filter(function (x) { return x.id === 'API-' + ('0' + mApi[1]).slice(-2); })[0];
      if (a1) return { text: a1.id + ' ' + a1.name + '：' + a1.method + ' ' + a1.path + '，需要角色 ' + a1.roles.join(' / ') + '。', ref: a1.id, act: { type: 'open', panel: 'api', ref: a1.id } };
    }

    /* —— 页面 / 字段 / 角色 / 流程 —— */
    if (hasWord(q, ['哪几页', '几页', '页面', '手机上', 'PC 上', '有哪些页'])) {
      var ph = R.pages.filter(function (p) { return p.device === 'phone'; });
      return { text: k.pages + ' 页：手机 ' + ph.length + ' 页（' + ph.map(function (p) { return p.name; }).join(' / ') + '），PC ' + (k.pages - ph.length) + ' 页（' + R.pages.filter(function (p) { return p.device === 'pc'; }).map(function (p) { return p.name; }).join(' / ') + '）。',
        blocks: [tableB(['页面', '端', '角色'], R.pages.map(function (p) { return [p.name, p.deviceName, p.roles.join('/')]; }))],
        act: { type: 'open', panel: 'pages' } };
    }
    if (hasWord(q, ['必填', '字段', '表单填什么'])) {
      var req = s.fields.filter(function (f) { return f.required; });
      return { text: k.fields + ' 个字段里必填 ' + req.length + ' 个：' + req.map(function (f) { return f.label; }).join('、') + '。\n非必填 ' + (k.fields - req.length) + ' 个，全部写进数据字典与用例。',
        blocks: [tagsB(req.map(function (f) { return f.label; }))],
        act: { type: 'open', panel: 'page', ref: 'form' } };
    }
    var recHit = null;
    R.recommended.forEach(function (f) { if (q.indexOf(f.label) >= 0 || q.indexOf(f.label.replace(/（.*/, '')) >= 0) recHit = f; });
    if (recHit && hasWord(q, ['加', '添', '要', '补'])) {
      return { text: '把「' + recHit.label + '」加进表单、数据字典与用例，规格升一版；存量记录这一格置空。',
        act: { type: 'apply', action: 'add-field', input: { key: recHit.key } } };
    }
    if (hasWord(q, ['角色', '谁能', '谁看', '权限', '矩阵', '看不到', '越权'])) {
      var pm = R.perms, sg0 = R.suggestion;
      if (hasWord(q, ['越权', '拦截'])) {
        var rb = tr.rows.filter(function (x) { return x.kind === 'role'; });
        return { text: '越权拦截 ' + tr.roleBlocked + ' 次：' + rb.map(function (x) { return x.name; }).join('；') + '，一律拒绝。',
          blocks: [tableB(['用例', '实际'], rb.map(function (x) { return [x.name, x.actual]; }))],
          ref: rb[0] ? rb[0].id : null, act: rb[0] ? { type: 'focus', ref: rb[0].id } : { type: 'goto', step: 'test' } };
      }
      return { text: pm.rows.map(function (r) { return r.title + '（' + r.scope + '）可进 ' + pm.pages.filter(function (p) { return (r.pages[p.key] || []).length; }).length + ' 页'; }).join('；') + '。' + (sg0 && !sg0.done ? '\n' + sg0.text + '：' + sg0.reason + '。' : ''),
        blocks: [tableB(['角色', '数据范围', '页数'], pm.rows.map(function (r) { return [r.title, r.scope, String(pm.pages.filter(function (p) { return (r.pages[p.key] || []).length; }).length)]; }))],
        act: { type: 'open', panel: 'matrix' } };
    }
    if (hasWord(q, ['采纳', '开放', '建议'])) {
      var sg = R.suggestion;
      if (!sg) return { text: '权限矩阵上没有待处理的建议。' };
      if (sg.done) return { text: sg.roleTitle + '已可查看' + sg.pageName + '，接口需要角色与用例同步更新。', act: { type: 'open', panel: 'sugg' } };
      return { text: '给' + sg.roleTitle + '开放' + sg.pageName + '的' + sg.op + '：' + sg.reason + '。\n开放后接口需要角色、手机页签与用例一起更新。',
        act: { type: 'apply', action: 'grant-permission', input: { role: sg.role, page: sg.page, op: sg.op } } };
    }
    if (hasWord(q, ['流程', '节点', '几步', '状态'])) {
      return { text: s.states.map(function (x) { return x.label; }).join(' → ') + '，' + s.transitions.length + ' 条流转。\n' + s.transitions.map(function (t2) { return roleTitle(s, t2.by[0]) + ' ' + t2.action + (t2.sla ? '（约定 ' + t2.sla + ' 小时）' : ''); }).join('；') + '。',
        act: { type: 'goto', step: 'build' } };
    }

    /* —— 试用与看板 —— */
    if (hasWord(q, ['超时', '等了', '最久', '拖了'])) {
      if (!st.overdue.length) return { text: '没有超时单，平均' + st.acceptLabel + ' ' + (st.avgAcceptMin == null ? '—' : st.avgAcceptMin + ' 分') + '，约定 ' + (st.slaHours || '—') + ' 小时。' };
      var o0 = st.overdue[0], r0 = rowById(R, o0.id);
      return { text: '超时 ' + st.overdueN + ' 单。' + o0.id + ' 已等 ' + (r0 ? waitOf(R, r0) : '—') + '，' + o0.text + '，约定' + st.acceptLabel + ' ' + st.slaHours + ' 小时。',
        blocks: [tableB(['编号', '状态', '已等'], st.overdue.map(function (o) { var r = rowById(R, o.id); return [o.id, r ? stateLabel(s, r.status) : '—', r ? waitOf(R, r) : '—']; }))],
        ref: o0.id, act: { type: 'focus', ref: o0.id } };
    }
    if (hasWord(q, ['几单', '多少单', '看板', '统计', '分布', '今日', '今天'])) {
      return { text: '今日' + s.verb + ' ' + st.todayNew + ' 单，记录 ' + st.total + ' 条：' + st.byStatus.map(function (x) { return x.label + ' ' + x.n; }).join('、') + '；平均' + st.acceptLabel + ' ' + (st.avgAcceptMin == null ? '—' : st.avgAcceptMin + ' 分') + '，超时 ' + st.overdueN + ' 单。',
        blocks: [tableB(['状态', '单数'], st.byStatus.map(function (x) { return [x.label, String(x.n)]; }))],
        act: { type: 'open', panel: 'board' } };
    }
    if (hasWord(q, ['平均', '多久', '时效'])) {
      return { text: '平均' + st.acceptLabel + ' ' + (st.avgAcceptMin == null ? '—' : st.avgAcceptMin + ' 分') + '，约定 ' + (st.slaHours || '—') + ' 小时；按处理人看 ' + st.byAssignee.map(function (x) { return x.id + ' ' + x.n + ' 单'; }).join('、') + '。',
        blocks: [tableB(['处理人', '单数', '完成'], st.byAssignee.map(function (x) { return [x.id, String(x.n), String(x.done)]; }))],
        act: { type: 'open', panel: 'perf' } };
    }
    if (hasWord(q, ['下一步', '走一步', '跑一单', '演一遍'])) {
      if (R.scriptStep >= R.script.length) return { text: '走单脚本已走完 ' + R.script.length + ' 步，' + (R.scriptId || '') + ' 已到 ' + stateLabel(s, (rowById(R, R.scriptId) || { status: s.states[s.states.length - 1].key }).status) + '。' };
      var nx = R.script[R.scriptStep];
      return { text: '下一步：' + nx.actor.title + (nx.actor.emp ? ' ' + nx.actor.emp : '') + ' ' + nx.label + '，沙箱时钟走 ' + STEP_MIN + ' 分。',
        act: { type: 'apply', action: 'next-script' } };
    }

    /* —— 用例 / 产物 —— */
    if (hasWord(q, ['用例', '测试', '通过', '失败', '跑一遍'])) {
      var bad = tr.rows.filter(function (x) { return !x.pass; });
      return { text: tr.total + ' 条用例，通过 ' + tr.passed + '、失败 ' + tr.failed + '（通过率 ' + tr.passRate + '%），越权拦截 ' + tr.roleBlocked + ' 次。'
        + (bad.length ? '\n失败：' + bad.map(function (x) { return x.id + ' ' + x.name; }).join('；') + '。' : '\n没有失败用例。')
        + (tr.warnings.length ? '\n警告 ' + tr.warnings.map(function (x) { return x.id + ' ' + x.text; }).join('；') + '。' : ''),
        blocks: [tableB(['分组', '条数', '通过'], tr.byKind.map(function (b) { return [b.kindName, String(b.n), String(b.passed)]; }))],
        act: { type: 'open', panel: 'tests' } };
    }
    if (hasWord(q, ['数据字典', '几列', '表结构', '索引', '数据表'])) {
      var sc = R.schema;
      return { text: sc.table + ' 一张表 ' + sc.columns.length + ' 列、' + sc.indexes.length + ' 个索引，来源逐列标注。',
        act: { type: 'open', panel: 'dict' } };
    }
    if (hasWord(q, ['接口', 'API', 'api', '几个接口'])) {
      return { text: R.apis.length + ' 个接口：' + R.apis.filter(function (a) { return a.method === 'POST'; }).length + ' 写、' + R.apis.filter(function (a) { return a.method === 'GET'; }).length + ' 读，每个都标了需要角色。',
        blocks: [tableB(['编号', '方法', '接口'], R.apis.slice(0, 6).map(function (a) { return [a.id, a.method, a.name]; }))],
        act: { type: 'open', panel: 'api' } };
    }

    /* —— 发布 —— */
    if (hasWord(q, ['二维码', '扫码', '扫出来', '链接'])) {
      return { text: '二维码内容 ' + R.qrText + '，' + s.channels.map(function (c) { return c.name; }).join(' · ') + '，当前' + (R.env === 'live' ? '正式环境' : '测试环境') + '。',
        act: { type: 'open', panel: 'entry' } };
    }
    if (hasWord(q, ['发布', '上线', '检查', '正式环境', '冒烟'])) {
      var ck = R.checklist;
      if (hasWord(q, ['发到', '发布到', '上线吧', '发正式'])) {
        if (R.env === 'live') return { text: s.version + ' 已在正式环境，冒烟 ' + (R.releases[R.releases.length - 1].smoke || '—') + '。' };
        if (!ck.all) return { text: '发布前检查 ' + ck.passed + ' / ' + ck.total + '，未过：' + ck.items.filter(function (i) { return !i.ok; }).map(function (i) { return i.label; }).join('、') + '，先补齐再发。' };
        return { text: '发布前检查 ' + ck.passed + ' / ' + ck.total + ' 全通过，走构建 → 测试环境 → 冒烟 → 正式环境 → 已上线。',
          act: { type: 'apply', action: 'publish' } };
      }
      return { text: '发布前检查 ' + ck.passed + ' / ' + ck.total + '：' + ck.items.map(function (i) { return (i.ok ? '✓ ' : '✗ ') + i.label + ' ' + i.detail; }).join('；') + '。',
        blocks: [tableB(['检查项', '结果'], ck.items.map(function (i) { return [i.label, i.ok ? '通过' : '未过']; }))],
        act: { type: 'open', panel: 'checks' } };
    }

    /* —— 迭代交付 —— */
    if (hasWord(q, ['存量', '旧数据', '老数据', '历史数据'])) {
      var lastC = R.changes[R.changes.length - 1];
      if (!lastC) return { text: '还没生成新版本。追加变更后存量记录不动，新字段置空，已完结的可补填。' };
      return { text: '存量 ' + lastC.stock.rows + ' 条不动，新字段置空；' + (lastC.stock.newFields.length ? lastC.stock.fillable + ' 条' + lastC.stock.terminalLabel + '的可补 ' + lastC.stock.newFields.join(' / ') : '本次无新字段') + '；旧用例 ' + lastC.oldPassed + ' / ' + lastC.oldTests + ' 仍通过。',
        act: { type: 'open', panel: 'stock' } };
    }
    if (hasWord(q, ['交付', '清单', '产物', '报告', '发微信', '收件'])) {
      return { text: R.deliverables.length + ' 项产物：' + R.deliverables.map(function (x) { return x.name + ' ' + x.no + '（' + x.count + '）'; }).join('；') + '。收件 ' + R.report.recipients + '。',
        blocks: [tableB(['产物', '编号', '数量'], R.deliverables.map(function (x) { return [x.name, x.no, x.count]; }))],
        act: { type: 'open', panel: 'report' } };
    }
    var nextV = bump(s.version, 'minor');
    if (hasWord(q, ['追加', '迭代', '新版本', '变更', nextV, '会多什么', '生成 '])) {
      var lastD = R.changes[R.changes.length - 1];
      if (hasWord(q, ['生成', '做出来', '就按'])) {
        var pick = null;
        R.followUps.forEach(function (f) { if (q.indexOf(cut(f.text, 6).replace('…', '')) >= 0) pick = f; });
        if (!pick) pick = R.followUps.filter(function (f) { return !f.applied; })[0];
        if (!pick) return { text: '追加需求都已生成，当前 ' + s.version + '。' };
        return { text: '按「' + pick.text + '」生成 ' + nextV + '：+' + pick.pages + ' 页 +' + pick.fields + ' 字段 +' + pick.states + ' 节点 +' + pick.tests + ' 用例，存量数据不动。',
          act: { type: 'apply', action: 'apply-delta', input: { text: pick.text } } };
      }
      if (lastD) return { text: lastD.from + ' → ' + lastD.to + '：' + lastD.items.map(function (i) { return i.content; }).join('；') + '。用例 ' + lastD.passed + ' / ' + lastD.tests + ' 通过。',
        blocks: [tableB(['类型', '内容', '用例'], lastD.items.map(function (i) { return [i.typeName, cut(String(i.content).replace(i.typeName + ' ', ''), 12), '+' + i.tests]; }))],
        act: { type: 'open', panel: 'change' } };
      return { text: R.followUps.length + ' 条追加需求：' + R.followUps.map(function (f) { return '「' + cut(f.text, 12) + '」+' + f.tests + ' 用例'; }).join('；') + '；只认 ' + lib.deltas.types.length + ' 种变更，存量数据不动。',
        blocks: [tableB(['追加需求', '页', '字段', '用例'], R.followUps.map(function (f) { return [cut(f.text, 10), '+' + f.pages, '+' + f.fields, '+' + f.tests]; }))],
        act: { type: 'open', panel: 'follow' } };
    }

    /* —— 为什么 / 怎么办 —— */
    if (hasWord(q, ['怎么生成', '为什么这么', '凭什么', '依据', '怎么判断'])) {
      return { text: '按五条规则落的：' + RULES.slice(0, 3).map(function (x) { return x; }).join('；') + '。',
        act: { type: 'open', panel: 'judge' } };
    }
    if (hasWord(q, ['为什么'])) {
      if (st.overdue.length) {
        var oW = st.overdue[0], rW = rowById(R, oW.id);
        return { text: oW.id + ' ' + oW.text + '：' + stateLabel(s, rW ? rW.status : '') + '，' + fmtMin(rW ? rW.createdAt : 0) + ' 提交到现在没人接，约定' + st.acceptLabel + ' ' + st.slaHours + ' 小时。', ref: oW.id, act: { type: 'focus', ref: oW.id } };
      }
      return { text: s.title + ' 按' + s.flow.name + '模板落的，' + s.states.map(function (x) { return x.label; }).join(' → ') + '；' + tr.passed + ' / ' + tr.total + ' 条用例通过。', act: { type: 'open', panel: 'judge' } };
    }
    if (hasWord(q, ['怎么办', '下一步做什么', '接下来', '先做什么'])) {
      var sgN = R.suggestion;
      if (sgN && !sgN.done) return { text: '先采纳权限建议：给' + sgN.roleTitle + '开放' + sgN.pageName + '的' + sgN.op + '，再发正式环境。', act: { type: 'apply', action: 'grant-permission', input: { role: sgN.role, page: sgN.page, op: sgN.op } } };
      if (R.env !== 'live' && R.checklist.all) return { text: '发布前检查 ' + R.checklist.passed + ' / ' + R.checklist.total + ' 全通过，可以发正式环境了。', act: { type: 'goto', step: 'ship' } };
      if (R.followUps.filter(function (f) { return !f.applied; }).length) return { text: '线上稳住了，下一步挑一条追加需求生成 ' + nextV + '。', act: { type: 'goto', step: 'iterate' } };
      return { text: '产物 ' + R.deliverables.length + ' 项都已生成，把交付报告发出去。', act: { type: 'open', panel: 'report' } };
    }
    return null;
  }

  /* ---------- 文档摄入：读出来的东西真写回业务数据 ---------- */
  function ctrlOf(lib, nm) {
    nm = String(nm || ''); var ty = 'text';
    if (/金额|余额|价|费|款|借方|贷方|收入/.test(nm)) ty = 'money';
    else if (/日期|时间/.test(nm)) ty = 'datetime';
    else if (/数量|个数|条数|次数|天数|工时|比例|率/.test(nm)) ty = 'number';
    else if (/说明|描述|备注|原因|内容|摘要/.test(nm)) ty = 'textarea';
    else if (/状态|类型|级别|等级|分类|科目名称/.test(nm)) ty = 'select';
    else if (/编码|编号|单号|代码/.test(nm)) ty = 'text';
    var c = lib.components.controls[ty];
    return (c && c.name) || ty;
  }
  function docClauses(txt) {
    txt = String(txt || ''); var out = [], m;
    m = txt.match(/(?:金额|价款|合计|总价|付款)[^0-9]{0,8}([\d,]+(?:\.\d+)?)\s*元/) || txt.match(/人民币\s*([\d,]+(?:\.\d+)?)\s*元/) || txt.match(/([\d,]+(?:\.\d+)?)\s*万元/);
    if (m) out.push(['金额', m[1] + (m[0].indexOf('万元') >= 0 ? ' 万元' : ' 元') + '（预计）']);
    m = txt.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/) || txt.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
    if (m) out.push(['日期', m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2)]);
    m = txt.match(/(?:质保|保修|服务|账)期?\s*(\d{1,3})\s*(个月|年|天)/);
    if (m) out.push(['时限', m[1] + ' ' + m[2]]);
    m = txt.match(/万分之\s*([\d.]+|[零一二三四五六七八九十]{1,3})/);
    if (m) out.push(['违约', '逾期 日万分之' + m[1]]);
    m = txt.match(/(\d{1,3})\s*(?:小时|工作日|天)内/);
    if (m) out.push(['时效', m[0]]);
    m = txt.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
    if (m) out.push(['比例', m[1] + '%']);
    return out;
  }
  /* 算不算认到：触发这条变更的那个词至少要两个汉字，单字「按」「的」不作数；同样硬的再比命中词多、未识别少 */
  function cjkLen(x) { var m = String(x == null ? '' : x).match(/[一-龥]/g); return m ? m.length : 0; }
  function opEvidence(op, ev) {
    var ty = op.type;
    return (ev || []).filter(function (e) {
      if (e.neg) return false;
      if (e.type === 'delta' && e.key === ty) return true;
      if (ty === 'addField') return e.type === 'field' && !!op.field && e.key === op.field.key;
      if (ty === 'addState') return e.type === 'action' && (e.key === 'rate' || e.key === 'reject' || e.key === 'recheck');
      if (ty === 'addStat') return e.type === 'stat' || (e.type === 'action' && e.key === 'stat');
      if (ty === 'addRule') return e.type === 'action' && e.key === 'remind';
      if (ty === 'addRole') return e.type === 'role';
      return false;
    });
  }
  function deltaStrength(dl) {
    var n = 0;
    if (!dl || !dl.effective || !dl.effective.length) return 0;
    dl.effective.forEach(function (op) { opEvidence(op, dl.evidence).forEach(function (e) { if (cjkLen(e.surface) >= 2) n++; }); });
    return n;
  }
  function parseStrength(pp) {
    var n = 0;
    ((pp && pp.evidence) || []).forEach(function (e) { if (!e.neg && e.type === 'object' && cjkLen(e.surface) >= 2) n++; });
    return n;
  }
  function docPick(R, lib, lines, forDelta) {
    var best = null;
    (lines || []).forEach(function (raw, i) {
      var txt = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
      if (txt.length < 6 || txt.length > 90) return;
      var exact = false, note = '', strong = 0, hits = 0, unk = 0, score;
      try {
        if (forDelta) {
          var pv = previewDelta(R.spec, txt, lib), dl = pv.delta;
          strong = deltaStrength(dl); hits = dl.hits; unk = dl.unknown;
          exact = dl.mode === 'exact' && strong > 0;
          note = dl.ops.map(function (o) { return deltaText(o, lib); }).join('、');
        } else {
          var pp = parse(txt, lib, R.arche);
          strong = parseStrength(pp); hits = pp.hits; unk = pp.unknown;
          exact = pp.mode === 'exact' && strong > 0;
          note = pp.objectName + ' · ' + pp.flowName + '，命中「' + pp.evidence.map(function (e) { return e.surface; }).slice(0, 3).join('」「') + '」';
        }
      } catch (e) { return; }
      score = exact ? 100 + strong * 5 + hits * 2 - unk * 3 - i * 0.01 : txt.length / 300;
      if (!best || score > best.score) best = { text: txt, exact: exact, note: note, score: score, i: i };
    });
    return best;
  }
  /* 读到的一句话落到哪：还没生成就写需求句，已生成就写追加需求框，两处都返回新副本 */
  function docApply(data, lib, R, sentence) {
    if (!R.spec) return { data: setText(data, lib, sentence), act: { type: 'set', path: 'state.text', value: sentence } };
    var nd = ensure(data); nd.state.delta = sentence;
    return { data: nd, act: { type: 'set', path: 'state.delta', value: sentence } };
  }
  function ingestSheet(doc, data, lib, R, L) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return { text: L + '《' + doc.name + '》读完，没有可用数据行。' };
    var head = s0.rows[0].filter(function (x) { return String(x).trim(); });
    var body = s0.rows.slice(1).filter(function (r) { return r.join('').trim(); });
    var draft = head.slice(0, 8).map(function (nm, i) { return { col: nm, ctrl: ctrlOf(lib, nm), sample: cut((body[0] || [])[i] || '', 12) }; });
    var hitF = null;
    (R.spec ? R.recommended : []).forEach(function (f) { var base = f.label.replace(/（.*/, ''); head.forEach(function (nm) { if (!hitF && base && (String(nm).indexOf(base) >= 0 || base.indexOf(String(nm)) >= 0)) hitF = f; }); });
    var lines = [L + '《' + doc.name + '》读完：' + doc.sheets.length + ' 张表，《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。'];
    lines.push('表头 ' + head.slice(0, 6).join(' / ') + '。');
    lines.push('按表头出字段草案 ' + draft.length + ' 个：' + draft.slice(0, 4).map(function (d) { return d.col + ' → ' + d.ctrl; }).join('；') + '。');
    if (hitF) lines.push('「' + hitF.label + '」在对象库里对得上，已加进表单、数据字典与用例。');
    else lines.push('这些列对不上' + (R.spec ? R.spec.short : '当前对象') + '的字段，规格不动数，草案放在抽屉里。');
    var res = { text: lines.join('\n'),
      blocks: [tableB(head.slice(0, 3).map(function (x) { return cut(x, 6); }), body.slice(0, 3).map(function (r) { return r.slice(0, 3).map(function (x) { return cut(x, 10); }); }))] };
    if (hitF && R.spec) { res.data = addField(data, lib, hitF.key); res.act = { type: 'apply', action: 'add-field', input: { key: hitF.key } }; }
    else res.act = { type: 'open', panel: 'doc', ref: doc.name, title: '字段草案 · 来自《' + doc.name + '》', sub: s0.name + ' · ' + body.length + ' 行 ' + head.length + ' 列 · 未写入规格',
      blocks: [tableB(['列名', '控件', '取值'], draft.map(function (d) { return [d.col, d.ctrl, d.sample]; })),
        kvB([['来源', doc.name + ' · ' + doc.sizeText], ['写入', '未写入 · 规格 ' + (R.spec ? R.spec.specNo + ' ' + R.spec.specVer : '待生成') + ' 不动数']])] };
    return res;
  }
  function ingestTextish(doc, data, lib, R, L, lines0, headLine) {
    var paras = lines0.filter(function (x) { return String(x).trim(); });
    var tbl = (doc.tables || [])[0] || null;
    var cls = docClauses(doc.text || paras.join('\n'));
    var forDelta = !!R.spec;
    var best = docPick(R, lib, paras, forDelta);
    var lines = [headLine];
    if (cls.length) lines.push('读到：' + cls.map(function (c) { return c[0] + ' ' + c[1]; }).join('；') + '。');
    if (tbl && tbl.length > 1) lines.push('附表 ' + tbl[0].slice(0, 4).join(' / ') + '，' + (tbl.length - 1) + ' 行。');
    var blocks = [];
    if (cls.length) blocks.push(kvB(cls));
    if (tbl && tbl.length > 1) blocks.push(tableB(tbl[0].slice(0, 3), tbl.slice(1, 4).map(function (r) { return r.slice(0, 3); })));
    if (best && best.exact) {
      lines.push('第 ' + (best.i + 1) + ' 段「' + cut(best.text, 22) + '」' + (forDelta ? '认到变更：' + best.note + '。' : '→ ' + best.note + '。'));
      lines.push(forDelta ? '已写进追加需求，点「生成 ' + bump(R.spec.version, 'minor') + '」就落版本。' : '已写进需求句，屏上回显命中词。');
      var w = docApply(data, lib, R, best.text);
      return { text: lines.join('\n'), blocks: blocks, data: w.data, act: w.act };
    }
    var fb = paras.slice().sort(function (a, b) { return String(b).length - String(a).length; })[0] || '';
    lines.push(forDelta ? ('全文没有认到' + lib.deltas.types.length + ' 种变更里的任何一种，规格不动数；已把条款多的一段放进追加需求框，可以改词再生成。')
      : '全文没有命中业务对象词典，已把条款多的一段放进需求句，屏上按相近的一条解析。');
    if (!fb) return { text: lines.join('\n'), blocks: blocks };
    var w2 = docApply(data, lib, R, cut(String(fb).replace(/\s+/g, ' ').trim(), 60));
    return { text: lines.join('\n'), blocks: blocks, data: w2.data, act: w2.act };
  }
  function ingest(doc, step, data, lib, result) {
    if (!doc || !doc.ok) return { text: '这份文件读不出来：' + ((doc && doc.note) || '格式不支持') + '。' };
    var R = resultOf(data, lib, result), L = docLabel(doc.kind), st = doc.stats || {};
    if (doc.kind === 'excel') return ingestSheet(doc, data, lib, R, L);
    if (doc.kind === 'ppt') {
      var ls = [];
      (doc.slides || []).forEach(function (sl) { if (sl.title) ls.push(sl.title); (sl.lines || []).forEach(function (x) { ls.push(x); }); });
      return ingestTextish(doc, data, lib, R, L, ls, L + '《' + doc.name + '》读完：' + (doc.slides || []).length + ' 页 · ' + ls.length + ' 行文本，首页「' + ((doc.slides || [])[0] || {}).title + '」。');
    }
    if (doc.kind === 'eml') {
      var m = doc.mail || {}, body = String(doc.text || '').split(/\n/).filter(function (x) { return x.trim(); });
      var ls2 = [m.subject || ''].concat(body);
      return ingestTextish(doc, data, lib, R, L, ls2, L + '《' + doc.name + '》读完：' + (m.from || '—') + ' 发来，主题「' + (m.subject || '—') + '」，' + (m.date || '') + '，正文 ' + body.length + ' 行' + ((m.attaches || []).length ? ' · 附件 ' + m.attaches.length + ' 个' : '') + '。');
    }
    var paras = (doc.paragraphs || []).filter(function (x) { return String(x).trim(); });
    if (!paras.length && doc.text) paras = String(doc.text).split(/[\n。；]/).filter(function (x) { return x.trim(); });
    return ingestTextish(doc, data, lib, R, L, paras, L + '《' + doc.name + '》读完：' + paras.length + ' 段' + ((doc.tables || []).length ? ' · ' + doc.tables.length + ' 张表' : '') + ' · ' + (st['字数'] || String(doc.text || '').replace(/\s/g, '').length) + ' 字。');
  }

  // ---------- 客户动作（全部返回新副本并写日志） ----------
  function setText(raw, lib, text) { var d = clone(raw); d.state.text = text == null ? null : String(text); d.state.lastResult = null; return d; }
  function pickPreset(raw, lib, index) { var d = clone(raw); var ps = presetsOf(lib, d.archetype); d.state.presetIndex = Math.max(0, Math.min(ps.length - 1, index | 0)); d.state.text = ps[d.state.presetIndex].text; return d; }
  function generate(raw, lib) {
    var d = clone(raw), s = d.state, ps = presetsOf(lib, d.archetype), text = s.text != null && s.text !== '' ? s.text : ps[s.presetIndex || 0].text;
    var parsed = parse(text, lib, d.archetype), spec = confirmSpec(plan(parsed, lib, ctxOf(d)));
    s.parsed = parsed; s.spec = spec; s.prevSpec = null; s.rt = newRuntime(spec, seedRows(d, spec.objectKey)); s.testRuns = 1; s.changes = []; s.script = { step: 0, id: null }; s.sent = false; s.lastResult = null;
    s.releases = [{ id: 'FB-001', version: spec.version, env: 'staging', envName: envName(lib, 'staging'), publisher: lib.roles.admin, at: fmtMin(s.rt.clock, true), note: publishNote(spec, lib), status: '已发布' }]; s.env = 'staging';
    pushLog(s, 'generate', spec.title + ' ' + spec.id + ' 已生成', spec.pages.length + ' 页 · ' + spec.fields.length + ' 字段 · ' + spec.roles.filter(function (r) { return !r.admin; }).length + ' 角色 · ' + spec.states.length + ' 节点 · ' + spec.reqNo + ' 已确认', s.rt.clock);
    return d;
  }
  function addField(raw, lib, key) { var d = clone(raw), s = d.state; if (!s.spec) return d; var def = fieldDef(s.spec, lib, key); if (!def) return d; var sp = patch(s.spec, { type: 'addField', field: def, source: '需求追加' }, lib); if (!sp._changed) return d; delete sp._changed; delete sp._note; s.spec = sp; s.lastResult = { ok: true, msg: sp.specNo + ' ' + sp.specVer + ' · 新增字段 ' + def.label }; pushLog(s, 'field', '新增字段 ' + def.label, sp.specNo + ' ' + sp.specVer + ' · 表单 / 数据字典 / 用例同步更新', s.rt.clock); return d; }
  function submitRow(raw, lib, slot, values) { var d = clone(raw), s = d.state; if (!s.spec) return d; var actor = actorOf(s.spec, slot, false, lib), res = submit(s.spec, s.rt, actor, values, lib); if (res.ok) { s.rt = res.rt; s.lastResult = { ok: true, id: res.id, msg: res.id + ' 已提交 · ' + stateLabel(s.spec, res.row.status) }; pushLog(s, 'submit', actor.title + ' 提交 ' + res.id, stateLabel(s.spec, res.row.status), res.rt.clock - STEP_MIN); } else s.lastResult = { ok: false, code: res.code, error: res.error, errors: res.errors || [] }; return d; }
  function doTransition(raw, lib, slot, id, actionEn, values, expectedVersion, alt) { var d = clone(raw), s = d.state; if (!s.spec) return d; var actor = actorOf(s.spec, slot, !!alt, lib), res = transition(s.spec, s.rt, actor, id, actionEn, values, expectedVersion, lib); if (res.ok) { s.rt = res.rt; s.lastResult = { ok: true, id: id, msg: id + ' ' + res.tr.action + ' · ' + stateLabel(s.spec, res.row.status) }; pushLog(s, 'transition', actor.title + ' ' + res.tr.action + ' ' + id, stateLabel(s.spec, res.row.status), res.rt.clock - STEP_MIN); } else s.lastResult = { ok: false, code: res.code, error: res.error, errors: res.errors || [] }; return d; }
  function nextScript(raw, lib) { var d = clone(raw), s = d.state; if (!s.spec) return d; var steps = scriptSteps(s.spec, lib), i = s.script.step; if (i >= steps.length) { s.lastResult = { ok: false, code: 'E_DONE', error: '脚本已走完' }; return d; } var step = steps[i], res = runScriptStep(s.spec, s.rt, step, s.script.id, lib); if (!res.ok) { s.lastResult = { ok: false, code: res.code, error: res.error }; return d; } s.rt = res.rt; var id = step.kind === 'submit' ? res.id : s.script.id; s.script = { step: i + 1, id: id }; var row = find(res.rt.rows, function (x) { return x.id === id; }); s.lastResult = { ok: true, id: id, step: i + 1, msg: id + ' ' + step.label + ' · ' + stateLabel(s.spec, row.status) }; pushLog(s, 'script', step.actor.title + ' ' + step.label + ' ' + id, stateLabel(s.spec, row.status), res.rt.clock - STEP_MIN); return d; }
  function runAllTests(raw, lib) { var d = clone(raw), s = d.state; if (!s.spec) return d; s.testRuns = (s.testRuns || 1) + 1; var tr = runTests(s.spec, seedRows(d, s.spec.objectKey), lib); s.lastResult = { ok: true, msg: 'CS-' + pad3(s.testRuns) + ' · ' + tr.total + ' 条 · 通过 ' + tr.passed + ' · 失败 ' + tr.failed }; pushLog(s, 'tests', '执行用例 CS-' + pad3(s.testRuns), tr.total + ' 条 · 通过 ' + tr.passed + ' · 失败 ' + tr.failed + ' · 警告 ' + tr.warnings.length, s.rt.clock); return d; }
  function grantPermission(raw, lib, roleKey, pageKey, op) { var d = clone(raw), s = d.state; if (!s.spec) return d; var sp = patch(s.spec, { type: 'grantPermission', role: roleKey, page: pageKey, op: op || '查看' }, lib); if (!sp._changed) return d; var note = sp._note; delete sp._changed; delete sp._note; s.spec = sp; s.lastResult = { ok: true, msg: '权限矩阵已更新 · ' + sp.specNo + ' ' + sp.specVer }; pushLog(s, 'perm', '开放权限 ' + note, sp.specNo + ' ' + sp.specVer + ' · 接口需要角色 / 用例 / 手机页签同步更新', s.rt.clock); return d; }
  function publish(raw, lib) {
    var d = clone(raw), s = d.state; if (!s.spec) return d;
    var perms = derivePermissions(s.spec, lib), tr = runTests(s.spec, seedRows(d, s.spec.objectKey), lib), ck = checklist(s.spec, lib, tr, perms);
    if (!ck.all) { s.lastResult = { ok: false, code: 'E_CHECK', error: '发布前检查 ' + ck.passed + ' / ' + ck.total + '，未通过项：' + ck.items.filter(function (i) { return !i.ok; }).map(function (i) { return i.label; }).join('、') }; return d; }
    if (s.env === 'prod' || s.env === 'live') { if (s.releases.some(function (r) { return r.version === s.spec.version && r.env === 'prod'; })) { s.lastResult = { ok: false, code: 'E_DONE', error: s.spec.version + ' 已在正式环境' }; return d; } }
    s.env = 'smoke'; if (tr.failed) { s.lastResult = { ok: false, code: 'E_SMOKE', error: '冒烟 ' + tr.passed + ' / ' + tr.total + '，停在测试环境' }; s.env = 'staging'; return d; }
    var at = s.rt.clock; s.env = 'live';
    s.releases.push({ id: 'FB-' + pad3(s.releases.length + 1), version: s.spec.version, env: 'prod', envName: envName(lib, 'prod'), publisher: lib.roles.admin, at: fmtMin(at, true), note: publishNote(s.spec, lib), status: '已发布', smoke: tr.passed + ' / ' + tr.total });
    s.lastResult = { ok: true, msg: s.spec.version + ' 已上线 · 冒烟 ' + tr.passed + ' / ' + tr.total };
    pushLog(s, 'publish', s.spec.version + ' 发布到' + envName(lib, 'prod'), '发布前检查 ' + ck.passed + ' / ' + ck.total + ' · 冒烟 ' + tr.passed + ' / ' + tr.total + ' · ' + lib.roles.admin, at);
    return d;
  }
  function applyDelta(raw, lib, text) {
    var d = clone(raw), s = d.state; if (!s.spec) return d;
    var dl = parseDelta(s.spec, text, lib);
    if (!dl.ops.length) { s.lastResult = { ok: false, code: 'E_PARSE', error: '未识别的变更' }; return d; }
    if (dl.noop) { s.lastResult = { ok: false, code: 'E_DONE', error: '这些变更已在当前版本里' }; return d; }
    var spec0 = s.spec, cur = spec0, items = [], testsBefore = tests(spec0, lib).length, apis0 = apis(spec0, lib).map(function (a) { return a.path; }), pages0 = spec0.pages.map(function (p) { return p.name; });
    dl.ops.forEach(function (o) {
      if (o.exists) return;
      var next = patch(cur, o, lib); if (!next._changed) return; var note = next._note; delete next._changed; delete next._note;
      var apis1 = apis(next, lib).map(function (a) { return a.path; }), pages1 = next.pages.map(function (p) { return p.name; }), tn = tests(next, lib).length;
      var touched = o.type === 'addField' ? next.pages.filter(function (p) { return p.kind === (o.field.at ? 'detail' : 'form') || (o.field.at === 'rate' && p.kind === 'rate'); }).map(function (p) { return p.name; }) : o.type === 'addStat' ? next.pages.filter(function (p) { return p.kind === 'board'; }).map(function (p) { return p.name; }) : o.type === 'addRule' ? next.pages.filter(function (p) { return p.kind === 'list' || p.kind === 'board'; }).map(function (p) { return p.name; }) : o.type === 'addValidation' ? next.pages.filter(function (p) { return p.kind === 'form'; }).map(function (p) { return p.name; }) : pages1.filter(function (p) { return pages0.indexOf(p) < 0; }).concat(o.type === 'addState' ? next.pages.filter(function (p) { return p.kind === 'detail' || p.kind === 'mine'; }).map(function (p) { return p.name; }) : []);
      items.push({ n: items.length + 1, type: o.type, typeName: find(lib.deltas.types, function (x) { return x.key === o.type; }).name, content: note, pages: uniq(touched), apis: apis1.filter(function (a) { return apis0.indexOf(a) < 0; }), tests: tn - testsBefore });
      testsBefore = tn; apis0 = apis1; pages0 = pages1; cur = next;
    });
    if (!items.length) { s.lastResult = { ok: false, code: 'E_DONE', error: '这些变更已在当前版本里' }; return d; }
    cur.version = bump(spec0.version, 'minor');
    var trBefore = runTests(spec0, seedRows(d, spec0.objectKey), lib), trAfter = runTests(cur, seedRows(d, cur.objectKey), lib);
    var terminalKeys = cur.states.filter(function (x) { return x.terminal; }).map(function (x) { return x.key; });
    var newFields = cur.fields.filter(function (f) { return !find(spec0.fields, function (x) { return x.key === f.key; }); }).map(function (f) { return f.label; });
    var change = { id: 'BG-' + pad3(s.changes.length + 1), text: text, from: spec0.version, to: cur.version, items: items, mode: dl.mode, preset: dl.preset, oldTests: trBefore.total, oldPassed: trAfter.rows.slice(0, trBefore.total).filter(function (r) { return r.pass; }).length, tests: trAfter.total, passed: trAfter.passed,
      stock: { rows: s.rt.rows.length, newFields: newFields, fillable: newFields.length ? s.rt.rows.filter(function (r) { return terminalKeys.indexOf(r.status) >= 0 || r.status === mainTerminal(spec0); }).length : 0, terminalLabel: stateLabel(spec0, mainTerminal(spec0)) } };
    s.prevSpec = spec0; s.spec = cur; s.changes.push(change); s.testRuns = (s.testRuns || 1) + 1; s.env = 'staging';
    s.releases.push({ id: 'FB-' + pad3(s.releases.length + 1), version: cur.version, env: 'staging', envName: envName(lib, 'staging'), publisher: lib.roles.admin, at: fmtMin(s.rt.clock, true), note: publishNote(cur, lib), status: '已发布' });
    s.lastResult = { ok: true, msg: cur.version + ' 已生成 · ' + items.length + ' 项变更 · 用例 ' + trAfter.passed + ' / ' + trAfter.total };
    pushLog(s, 'delta', '追加需求生成 ' + cur.version, items.map(function (i) { return i.content; }).join('；') + ' · 用例 ' + trAfter.passed + ' / ' + trAfter.total + ' · 存量 ' + s.rt.rows.length + ' 条新字段置空', s.rt.clock);
    return d;
  }
  function sendReport(raw, lib) { var d = clone(raw), s = d.state; if (!s.spec) return d; s.sent = true; s.lastResult = { ok: true, msg: '交付报告已发送' }; pushLog(s, 'send', '交付报告 ' + IDS.report + ' 已发送到微信', '收件：' + uniq([roleTitle(s.spec, 'lead'), lib.roles.admin]).join(' · '), s.rt.clock); return d; }

  return { VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, TODAY: TODAY, CLOCK0: CLOCK0, STEP_MIN: STEP_MIN, IDS: IDS, QR_BASE: QR_BASE, CHANNELS: CHANNELS, SLOT_ORDER: SLOT_ORDER, RULES: RULES,
    fmtMin: fmtMin, fmtDur: fmtDur, fmtN: fmtN, t: t, isoToMin: isoToMin, dateOfMin: dateOfMin, addDays: addDays, bump: bump, normalize: normalize, tokenize: tokenize, similar: similar, nearest: nearest, lcs: lcs,
    objOf: objOf, tplOf: tplOf, objectsFor: objectsFor, presetsOf: presetsOf, followUpsOf: followUpsOf, refTable: refTable, refIds: refIds, refLabels: refLabels, refKnown: refKnown, presetFor: presetFor,
    parse: parse, plan: plan, patch: patch, confirmSpec: confirmSpec, derivePermissions: derivePermissions, can: can, pages: pages, schema: schema, apis: apis, checklist: checklist, summarize: summarize,
    formFields: formFields, stageFields: stageFields, initialState: initialState, mainTerminal: mainTerminal, stateLabel: stateLabel, roleOfSlot: roleOfSlot, roleTitle: roleTitle, actorOf: actorOf, exampleOf: exampleOf, exampleValues: exampleValues, resolveRequire: resolveRequire,
    validateValues: validateValues, newRuntime: newRuntime, submit: submit, transition: transition, advance: advance, query: query, stats: stats, scriptSteps: scriptSteps, runScriptStep: runScriptStep, reach: reach, pathTo: pathTo,
    tests: tests, runTests: runTests, parseDelta: parseDelta, previewDelta: previewDelta, applyOps: applyOps, diffSpec: diffSpec, deltaText: deltaText, qrText: qrText, pipeline: pipeline, deliverables: deliverables, report: report, kpi: kpi, suggestion: suggestion,
    ensure: ensure, run: run, seedRows: seedRows,
    screens: screens, brief: brief, suggest: suggest, ask: ask, ingest: ingest,
    setText: setText, pickPreset: pickPreset, generate: generate, addField: addField, submitRow: submitRow, doTransition: doTransition, nextScript: nextScript, runAllTests: runAllTests, grantPermission: grantPermission, publish: publish, applyDelta: applyDelta, sendReport: sendReport };
});
