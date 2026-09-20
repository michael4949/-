/*
 * DUS-1 · 通用 Skill 运行时（11 个包共用同一份）
 * ------------------------------------------------------------
 * UMD：Node 下 require，浏览器下挂 DGG.createSkill。ES5，无第三方依赖。
 *
 *   createSkill({ manifest, kernel, data, datasets }) → Skill
 *   Skill = { manifest, listActions(), describe(), health(), invoke(action, input, ctx) }
 *
 * 契约见 universal/SPEC.md：invoke 同步返回信封，永不抛异常。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.createSkill = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CONTROL_KEYS = { data: 1, dataset: 1 };          // 输入里的控制字段，不下传给内核

  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function isObj(o) { return o != null && typeof o === 'object' && !Array.isArray(o); }
  function get(obj, path) {
    if (!path) return undefined;
    var parts = String(path).split('.'), cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function typeOf(v) { return Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v); }
  function stripControl(input) {
    var out = {};
    for (var k in input) if (Object.prototype.hasOwnProperty.call(input, k) && !CONTROL_KEYS[k]) out[k] = input[k];
    return out;
  }

  function createSkill(opts) {
    var manifest = opts.manifest, kernel = opts.kernel, data = opts.data || {}, datasets = opts.datasets || {};
    var helpers = opts.helpers || {};                 // 无法用 JSON 传递的实参（如禁忌词判定函数 lint）
    var byName = {};
    (manifest.actions || []).forEach(function (a) { byName[a.name] = a; });

    var skillRef = { id: manifest.id, name: manifest.name, version: manifest.version };

    function envelope(action, ok, payload, errors, extraMeta) {
      var a = byName[action] || {};
      var meta = {
        credits: manifest.credits,
        kind: a.kind || 'compute',
        mutates: !!a.mutates,
        deterministic: !!(manifest.capabilities && manifest.capabilities.deterministic),
        offline: !!(manifest.capabilities && manifest.capabilities.offline)
      };
      if (extraMeta) for (var k in extraMeta) if (Object.prototype.hasOwnProperty.call(extraMeta, k)) meta[k] = extraMeta[k];
      return { ok: !!ok, spec: 'dus-1', skill: skillRef, action: action, data: ok ? payload : null, errors: errors || [], meta: meta };
    }
    function fail(action, code, message, path) {
      var e = { code: code, message: message };
      if (path) e.path = path;
      return envelope(action, false, null, [e]);
    }

    // ---------- 数据集 ----------
    function datasetOf(key) { return Object.prototype.hasOwnProperty.call(datasets, key) ? clone(datasets[key]) : undefined; }
    function datasetKeys() { var out = []; for (var k in datasets) if (Object.prototype.hasOwnProperty.call(datasets, k)) out.push(k); return out.sort(); }

    // ---------- 输入校验（只查必填与基本类型，深校验交给内核与 schema/） ----------
    function checkInput(a, input) {
      var errs = [];
      (a.inputProps || []).forEach(function (p) {
        var v = get(input, p.name);
        if (v === undefined || v === null || v === '') {
          if (p.required) errs.push({ code: 'E_INPUT', message: '缺少必填字段 ' + p.name + (p.description ? '（' + p.description + '）' : ''), path: p.name });
          return;
        }
        var t = typeOf(v);
        if (p.type && t !== p.type && !(p.type === 'number' && t === 'string' && v !== '' && !isNaN(Number(v)))) {
          errs.push({ code: 'E_INPUT', message: '字段 ' + p.name + ' 应为 ' + p.type + '，收到 ' + t, path: p.name });
        }
      });
      return errs;
    }

    // ---------- 实参装配 ----------
    function buildArgs(a, input, ctx, bag) {
      var args = [];
      for (var i = 0; i < (a.args || []).length; i++) {
        var spec = a.args[i], from = spec.from, v;
        if (from === '$lib') v = data;
        else if (from.indexOf('$lib.') === 0) v = get(data, from.slice(5));   // 数据包的子字段，如 $lib.promptTemplate
        else if (from === '$ctx') v = ctx || {};
        else if (from.indexOf('$helper:') === 0) v = helpers[from.slice(8)];
        else if (from === '$lint') v = (ctx && ctx.lint) || helpers.lint;
        else if (from === '$data') {
          v = bag.business;
          if (v === undefined) return { error: fail(a.name, 'E_INPUT', '缺少业务数据：请传 data（上一步返回的副本），或传 dataset 指定预置数据集（可选 ' + datasetKeys().join(' / ') + '）', 'data') };
        } else if (from === '$input') {
          v = bag.payload();
        } else {
          v = get(input, from);
          if ((v === undefined || v === null) && spec.required) return { error: fail(a.name, 'E_INPUT', '缺少必填字段 ' + from + (spec.note ? '（' + spec.note + '）' : ''), from) };
        }
        args.push(v);
      }
      return { args: args };
    }

    // ---------- 内置动作 ----------
    function health() {
      var keys = []; for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) keys.push(k);
      return {
        id: manifest.id, name: manifest.name, version: manifest.version,
        kernelVersion: kernel && kernel.VERSION, kernelName: kernel && kernel.MODULE_NAME,
        actions: (manifest.actions || []).length, dataKeys: keys.sort(), datasets: datasetKeys(),
        helpers: Object.keys(helpers).sort(),
        versionMatch: !!(kernel && kernel.VERSION === manifest.version),
        capabilities: manifest.capabilities
      };
    }

    function invoke(action, input, ctx) {
      input = isObj(input) ? input : {};
      if (!action || typeof action !== 'string') return fail(String(action), 'E_ACTION', '缺少动作名；可用动作：' + Object.keys(byName).join(' / '));
      if (action === 'describe') return envelope('describe', true, manifest);
      if (action === 'health') return envelope('health', true, health());
      var a = byName[action];
      if (!a) return fail(action, 'E_ACTION', '没有这个动作：' + action + '；可用动作：' + Object.keys(byName).join(' / '));

      // 业务数据与载荷
      var bag = { business: undefined, payload: null };
      if (isObj(input.data)) bag.business = input.data;
      else if (input.dataset != null) {
        var ds = datasetOf(String(input.dataset));
        if (ds === undefined) return fail(action, 'E_DATASET', '没有这个数据集：' + input.dataset + '；可选 ' + datasetKeys().join(' / '), 'dataset');
        bag.business = ds;
      }
      /* $input 懒装配：只有动作真的要整包输入时才合并，产品类不必每次深拷样本 */
      bag.payload = function () {
        var payload = stripControl(input);
        if (bag.business === undefined) return payload;
        if (!Object.keys(payload).length) return bag.business;
        var merged = clone(bag.business) || {};
        for (var k2 in payload) if (Object.prototype.hasOwnProperty.call(payload, k2)) merged[k2] = payload[k2];
        return merged;
      };

      var errs = checkInput(a, input);
      if (errs.length) return envelope(action, false, null, errs);

      var built = buildArgs(a, input, ctx, bag);
      if (built.error) return built.error;

      var fn = kernel && kernel[a.fn];
      if (typeof fn !== 'function') return fail(action, 'E_RUNTIME', '内核缺少函数 ' + a.fn);

      var out;
      try { out = fn.apply(kernel, built.args); }
      catch (e) { return fail(action, 'E_RUNTIME', '内核执行出错：' + (e && e.message ? e.message : String(e))); }

      // 内核自带的 ok:false 原样透传
      if (isObj(out) && out.ok === false) {
        var kerr = (out.errors || []).map(function (x) {
          if (typeof x === 'string') return { code: 'E_KERNEL', message: x };
          return { code: x.code || 'E_KERNEL', message: x.message || x.msg || JSON.stringify(x), path: x.path || x.field };
        });
        if (!kerr.length) kerr.push({ code: 'E_KERNEL', message: '内核判定输入不合法' });
        return envelope(action, false, null, kerr);
      }
      return envelope(action, true, out);
    }

    function listActions() {
      return (manifest.actions || []).map(function (a) {
        return { name: a.name, title: a.title, kind: a.kind, mutates: !!a.mutates, description: a.description, input: a.input, returns: a.returns };
      });
    }

    return {
      spec: 'dus-1',
      manifest: manifest,
      kernel: kernel,
      data: data,
      datasets: datasets,
      helpers: helpers,
      listActions: listActions,
      describe: function () { return manifest; },
      health: health,
      invoke: invoke
    };
  }

  return createSkill;
});
