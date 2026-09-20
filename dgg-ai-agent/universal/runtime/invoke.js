/*
 * DUS-1 · 通用 Skill 运行时（11 个包共用同一份）
 * ------------------------------------------------------------
 * UMD：Node 下 require，浏览器下挂 DGG.createSkill。ES5，无第三方依赖。
 *
 *   createSkill({ manifest, kernel, data, datasets, helpers, modules }) → Skill
 *   Skill = { manifest, listActions(), describe(), health(), invoke(action, input, ctx) }
 *
 * 契约见 universal/SPEC.md：invoke 同步返回信封，永不抛异常。
 *
 * 1.1 增补（SPEC §9 / §14.1），一律「只增不改」，老包不写新字段时行为与 1.0 一字不差：
 *   · 信封与 health 增 specVersion；spec 仍是 'dus-1'（协议族标识，不是版本号，见 §9.1）
 *   · 动作按 a.on 选宿主：kernel（默认）/ modules.docparse —— 机制不限宿主名字，1.1 实际只装了 docparse 一个
 *     （对话五件与业务算法共用大量内部函数，直接写在各自的主内核里，没有 core/chat.js，见 SPEC §14.2 第 2 条）
 *   · meta 与 listActions 增 family / mutatesPath
 *   · 内置 screens 兜底：skill 没声明同名动作时直接回 manifest.screens
 *   · ingest 家族的 ok:false 原样透传（解析失败是业务事实，不是调用失败，见 §11.3）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.createSkill = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SPEC = 'dus-1';                                  // 协议族标识，1.1 一个字不动（SPEC §9.1）
  var SPEC_VERSION = '1.1';                            // 版本单列，只自述、不参与任何判定的否决
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
    var modules = opts.modules || {};                 // 1.1：按 a.on 选宿主的模块表（1.1 只有 { docparse }；要加别的宿主直接往里塞）
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
        offline: !!(manifest.capabilities && manifest.capabilities.offline),
        family: a.family || 'core',                   // 1.1：core（默认）/ conversation / ingest
        mutatesPath: a.mutatesPath || null            // 1.1：新业务数据在返回值的这个点号路径上；没有 = §4 原语义
      };
      if (extraMeta) for (var k in extraMeta) if (Object.prototype.hasOwnProperty.call(extraMeta, k)) meta[k] = extraMeta[k];
      return { ok: !!ok, spec: SPEC, specVersion: SPEC_VERSION, skill: skillRef, action: action, data: ok ? payload : null, errors: errors || [], meta: meta };
    }
    function fail(action, code, message, path) {
      var e = { code: code, message: message };
      if (path) e.path = path;
      return envelope(action, false, null, [e]);
    }

    // ---------- 数据集 ----------
    function datasetOf(key) { return Object.prototype.hasOwnProperty.call(datasets, key) ? clone(datasets[key]) : undefined; }
    function datasetKeys() { var out = []; for (var k in datasets) if (Object.prototype.hasOwnProperty.call(datasets, k)) out.push(k); return out.sort(); }

    // ---------- 动作宿主（SPEC §9.2：on = kernel 默认 / docparse） ----------
    /* 只报真的装上了的模块，免得 health 里看着有、调用时却是空的 */
    function moduleKeys() {
      var out = [];
      for (var k in modules) if (Object.prototype.hasOwnProperty.call(modules, k) && modules[k]) out.push(k);
      return out.sort();
    }
    function hostOf(on) { return on === 'kernel' ? kernel : modules[on]; }

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
    /* 1.1 不新增 from 动词：对话与摄入动作照用 $data:ensure / $lib / $input / $lint / $helper: / $ctx 这一套（SPEC §14.1 第 8 条）。
     * ensure 永远取内核上的那一个 —— 它是业务数据的补全函数，与动作挂在哪个宿主上无关。 */
    function buildArgs(a, input, ctx, bag) {
      var args = [];
      for (var i = 0; i < (a.args || []).length; i++) {
        var spec = a.args[i], from = spec.from, v;
        if (from === '$lib') v = data;
        else if (from.indexOf('$lib.') === 0) v = get(data, from.slice(5));   // 数据包的子字段，如 $lib.promptTemplate
        else if (from === '$ctx') v = ctx || {};
        else if (from.indexOf('$helper:') === 0) v = helpers[from.slice(8)];
        else if (from === '$lint') v = (ctx && ctx.lint) || helpers.lint;
        else if (from === '$data' || from === '$data:ensure') {
          v = bag.business;
          /* 有些内核的单个动作要求传 ensure 后的副本（run 内部会自己 ensure，单独调用时不会） */
          if (v !== undefined && from === '$data:ensure' && typeof kernel.ensure === 'function') {
            try { v = kernel.ensure(v, data); } catch (e) { return { error: fail(a.name, 'E_RUNTIME', '数据补全失败：' + (e && e.message ? e.message : String(e))) }; }
          }
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
      /* 下划线开头的是内核自己在数据包上挂的内部缓存（如 AI软件开发 的词典索引），不算对外字段 */
      var keys = []; for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k) && k.charAt(0) !== '_') keys.push(k);
      return {
        id: manifest.id, name: manifest.name, version: manifest.version,
        kernelVersion: kernel && kernel.VERSION, kernelName: kernel && kernel.MODULE_NAME,
        actions: (manifest.actions || []).length, dataKeys: keys.sort(), datasets: datasetKeys(),
        helpers: Object.keys(helpers).sort(),
        versionMatch: !!(kernel && kernel.VERSION === manifest.version),
        capabilities: manifest.capabilities,
        /* 1.1 新增（老字段一个不少、值不变）：一眼看出新能力有没有装上 */
        specVersion: SPEC_VERSION,
        features: manifest.features || null,
        screens: (manifest.screens || []).length,
        modules: moduleKeys()
      };
    }

    function invoke(action, input, ctx) {
      input = isObj(input) ? input : {};
      if (!action || typeof action !== 'string') return fail(String(action), 'E_ACTION', '缺少动作名；可用动作：' + Object.keys(byName).join(' / '));
      if (action === 'describe') return envelope('describe', true, manifest);
      if (action === 'health') return envelope('health', true, health());
      /* 1.1：skill 没声明 screens 动作时的内置兜底。清单与动作两条路结果必须一致（SPEC §10.1），
       * 所以直接回 manifest.screens；回副本，免得平台改了返回值把清单带坏。
       * byName['screens'] 是空的，meta 要自带一份，否则会写成默认的 compute / core（§14.1 第 10 条）。 */
      if (action === 'screens' && !byName['screens']) {
        return envelope('screens', true, clone(manifest.screens || []), [], { kind: 'query', mutates: false, family: 'conversation' });
      }
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

      /* 1.1：函数到哪个宿主上去找，由 a.on 决定；1.0 的动作不写 on，照旧从内核取 */
      var on = a.on || 'kernel';
      var host = hostOf(on);
      if (!host) return fail(action, 'E_RUNTIME', '没有装上 on=' + on + ' 指的宿主模块；已装上的模块：' + (moduleKeys().join(' / ') || '无') + '（kernel 始终可用）');
      var fn = host[a.fn];
      if (typeof fn !== 'function') return fail(action, 'E_RUNTIME', '宿主 on=' + on + ' 上缺少函数 ' + a.fn);

      var out;
      try { out = fn.apply(host, built.args); }
      catch (e) { return fail(action, 'E_RUNTIME', '内核执行出错：' + (e && e.message ? e.message : String(e))); }

      /* 内核自带的 ok:false 原样翻成错误信封；ingest 家族除外 —— Doc 把 ok 挂在自己身上，
       * 解析失败与超限是业务事实不是调用失败，信封仍是 ok:true、note 照样传出去（SPEC §11.3 / §14.1 第 9 条）。
       * family 不写默认 core，所以 1.0 的动作一个字不变。 */
      var rawResult = a.family === 'ingest' || a.rawResult === true;
      if (!rawResult && isObj(out) && out.ok === false) {
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
        return {
          name: a.name, title: a.title, kind: a.kind, mutates: !!a.mutates, description: a.description, input: a.input, returns: a.returns,
          /* 1.1：适配器按家族过滤（如 ask 不进函数调用表），按 on 知道函数挂在哪 */
          on: a.on || 'kernel', family: a.family || 'core', mutatesPath: a.mutatesPath || null
        };
      });
    }

    return {
      spec: SPEC,
      specVersion: SPEC_VERSION,
      manifest: manifest,
      kernel: kernel,
      modules: modules,
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
