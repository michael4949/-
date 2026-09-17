/* 模块 3 · 企业AI投入ROI测算器
 * 屏 1 企业与场景 → 屏 2 投入方案 → 屏 3 收益端（按杠杆动态展开）→ 屏 4 测算台 → 屏 5 报告 28 页
 * 版式：账页标尺（竖脊 + 账行 + 金额栏对齐），暖墨 + 铜金
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, CH;
  var core = window.DGG.coreM3;
  var M = { step: 'input', form: null, plan: null, gain: null, result: null, pages: [], llmState: 'none', cutMul: 1, base: null, baseSnap: null };

  function levers() {
    var src = DATA.m3.levers;
    if (!M.cutMul || M.cutMul === 1) return src;
    return { note: src.note, items: src.items.map(function (x) {
      var y = {}; Object.keys(x).forEach(function (k) { y[k] = x[k]; });
      y.cut = Math.max(0.05, Math.min(0.95, Math.round(x.cut * M.cutMul * 1000) / 1000));
      return y;
    }) };
  }
  function bundle() {
    return { fields: DATA.fields, industries: DATA.industries, sectors: DATA.m3.sectors,
      constants: DATA.m3.constants, levers: levers(), sceneLevers: DATA.m3.sceneLevers,
      benchmarks: DATA.m3.benchmarks, reportText: DATA.m3.reportText,
      credits: DATA.credits, lintWords: DATA.lintWords, promptTemplate: DATA.m3.promptTemplate };
  }
  function RT() { return DATA.m3.reportText; }
  function C() { return DATA.m3.constants; }
  function LV() { return levers(); }
  function sectorOf(slug) { var r = null; DATA.industries.sectors.forEach(function (s) { s.industries.forEach(function (i) { if (i.slug === slug) r = s; }); }); return r; }
  function secScenes() { var s = sectorOf(M.form.industry); var k = s && DATA.m3.sectors[s.key] ? s.key : 'other'; return DATA.m3.sectors[k] ? DATA.m3.sectors[k].scenes : []; }
  function sceneById(id) { var r = null; secScenes().forEach(function (s) { if (s.id === id) r = s; }); return r; }
  function leversOf(id) { return (DATA.m3.sceneLevers.map[id] || ['hours']).slice(); }
  function leverDef(k) { var r = null; LV().items.forEach(function (x) { if (x.key === k) r = x; }); return r; }
  function emptyForm() { return { name: '', industry: sh.displayIndustryDefault() || 'mfg-machinery', size: null, revenue: null, province: '浙江', years: null, ownership: 'private', customers: null, systems: [], itStaff: null, branches: 'single', overseas: 'no', role: 'owner' }; }
  function fromProfile(p) { var f = emptyForm(); Object.keys(f).forEach(function (k) { if (p[k] != null) f[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; }); return f; }
  function emptyPlan() { return { sceneId: null, tier: 'adv', seats: 2, diagnosisDays: 0, customBudget: 0, dataState: 'excel', setupPeople: 1, setupSalary: 7500 }; }
  function fmt(n) { return (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function reportNo(r) { var d = r.meta && r.meta.date ? r.meta.date : '20260917'; return 'DGG-R-' + d + '-' + String(Math.abs(hashOf(r.profile.name)) % 100000).padStart(5, '0'); }
  function hashOf(s) { var x = 0; String(s).split('').forEach(function (c) { x = (x * 31 + c.charCodeAt(0)) | 0; }); return x; }

  // ---------- 生命周期 ----------
  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; CH = window.DGG.charts;
    if (!M.form) M.form = sh.getCompany() ? fromProfile(sh.getCompany()) : emptyForm();
    if (!M.plan) M.plan = emptyPlan();
    if (!M.gain) M.gain = {};
    M.step = step || (M.result ? 'report' : 'input');
    if ((M.step === 'report' || M.step === 'board') && !M.result) M.step = 'input';
    draw();
  }
  function unmount() { }
  function onCompany(c) { M.form = c ? fromProfile(c) : emptyForm(); M.result = null; M.base = null; M.baseSnap = null; if (M.step !== 'input') setStep('input'); else draw(); }
  function onIndustry(slug) { if (slug && M.form.industry !== slug) { M.form.industry = slug; M.plan.sceneId = null; M.result = null; M.base = null; M.baseSnap = null; if (M.step === 'input') draw(); else setStep('input'); } }
  function setStep(s) { M.step = s; sh.go('m3', s); }

  function recompute() {
    var out = core.compute({ profile: M.form, plan: M.plan, gain: M.gain }, bundle());
    if (out.ok) { out.meta.date = '20260917'; M.result = out; }
    return out;
  }

  // ================= 屏 1–3：输入 =================
  function steps(n) {
    var names = ['企业与场景', '投入方案', '收益端', '测算台'];
    return h('div', { class: 'm3-steps-bar' }, names.map(function (t, i) {
      return h('span', { class: 'st' + (i + 1 === n ? ' on' : (i + 1 < n ? ' done' : '')) }, [String(i + 1) + ' ' + t]);
    }));
  }
  function field(label, hint, node) {
    return h('label', { class: 'm3-f' }, [h('span', { class: 'lb' }, [label, hint ? h('i', {}, [hint]) : null]), node]);
  }
  function numRow(label, hint, val, unit, presets, on) {
    var inp = h('input', { class: 'm3-in', type: 'number', value: val == null ? '' : String(val),
      oninput: function () { on(this.value === '' ? null : Number(this.value)); } });
    return h('div', { class: 'm3-nrow' }, [
      h('div', { class: 'lb' }, [label, hint ? h('i', {}, [hint]) : null]),
      h('div', { class: 'ip' }, [inp, h('span', { class: 'u' }, [unit || ''])]),
      h('div', { class: 'pre' }, (presets || []).map(function (p) {
        return h('button', { class: 'pb' + (val === p ? ' on' : ''), onclick: function () { on(p); draw(); } }, [String(p)]);
      }))
    ]);
  }
  function opts(list, cur, on) {
    return h('div', { class: 'm3-opts' }, list.map(function (o) {
      return h('button', { class: 'ob' + (cur === o.v ? ' on' : ''), onclick: function () { on(o.v); draw(); } },
        [h('b', {}, [o.t]), o.s ? h('i', {}, [o.s]) : null]);
    }));
  }

  function screenInput() {
    var list = secScenes();
    var cur = M.plan.sceneId;
    $root.appendChild(h('div', { class: 'm3-pane' }, [
      steps(1),
      h('h2', { class: 'm3-h2' }, ['第一步　确认测算对象与场景']),
      h('p', { class: 'm3-p' }, ['企业信息与首选场景由前序模块带入；亦可在本页直接指定。测算以单一业务场景为单元，不同场景的效益杠杆与投入档位均不相同。']),
      h('div', { class: 'm3-co' }, [
        h('div', { class: 'nm' }, [M.form.name || '未填写企业名称']),
        h('div', { class: 'tg' }, [sh.industryNameOf(M.form.industry) || '—',
          M.form.size ? ' · ' + sh.optText('size', M.form.size) : '',
          M.form.revenue ? ' · 年营收 ' + sh.optText('revenue', M.form.revenue) : ''])
      ]),
      h('h3', { class: 'm3-h3' }, ['本行业场景库共 ' + list.length + ' 个条目，请指定测算场景']),
      h('div', { class: 'm3-scenes' }, list.map(function (s) {
        var lv = leversOf(s.id).map(function (k) { var d = leverDef(k); return d ? d.name : k; });
        return h('button', { class: 'sc' + (cur === s.id ? ' on' : ''), onclick: function () { M.plan.sceneId = s.id; M.gain = {}; draw(); } }, [
          h('div', { class: 'n' }, [s.name]),
          h('div', { class: 'm' }, [s.stage + ' · ' + s.module + ' · 上线约 ' + s.weeks + ' 周 · 投入 ' + s.cost + '档']),
          h('div', { class: 'l' }, lv.map(function (x) { return h('span', {}, [x]); }))
        ]);
      })),
      h('div', { class: 'm3-act' }, [
        h('button', { class: 'btn ghost', onclick: function () { M.plan.sceneId = null; M.gain = {}; setStep('plan'); } }, ['未定场景，按通用轻量口径测算']),
        h('button', { class: 'btn', disabled: !cur, onclick: function () { setStep('plan'); } }, ['下一步：投入方案'])
      ])
    ]));
  }

  function screenPlan() {
    var P = C().prices, sc = M.plan.sceneId ? sceneById(M.plan.sceneId) : null;
    $root.appendChild(h('div', { class: 'm3-pane' }, [
      steps(2),
      h('h2', { class: 'm3-h2' }, ['第二步　投入方案']),
      h('p', { class: 'm3-p' }, ['价格取自定稿产品资料，未作调整。另议项按预估金额填入即可，测算台会给出该项对回收期的影响幅度。']),
      field('订阅版本', '按套年计价', opts(P.subscription.map(function (t) {
        return { v: t.key, t: t.name, s: t.yearly ? t.yearly + ' 元 / 套年' : '0 元开通' };
      }), M.plan.tier, function (v) { M.plan.tier = v; })),
      numRow('订阅套数', '按实际开通账号数计列', M.plan.seats, '套', [1, 2, 3, 5], function (v) { M.plan.seats = v || 1; }),
      field('专家入企 AI 诊断', P.diagnosisPerDay + ' 元 / 天', opts([
        { v: 0, t: '暂不安排', s: '0 元' }, { v: 1, t: '1 天', s: P.diagnosisPerDay + ' 元' }, { v: 2, t: '2 天', s: P.diagnosisPerDay * 2 + ' 元' }
      ], M.plan.diagnosisDays, function (v) { M.plan.diagnosisDays = v; })),
      field('私域部署', '数据不出企业内网时选用', opts([{ v: null, t: '不需要', s: '—' }].concat(P.privateDeploy.map(function (x) {
        return { v: x.key, t: x.name, s: x.yearly + ' 元 / 套年' };
      })), M.plan.privateDeploy == null ? null : M.plan.privateDeploy, function (v) { if (v == null) delete M.plan.privateDeploy; else M.plan.privateDeploy = v; })),
      numRow('另议项预算', '系统对接 / 定制 / 陪跑', M.plan.customBudget, '元', [0, 20000, 60000, 150000], function (v) { M.plan.customBudget = v == null ? 0 : v; }),
      sc && sc.cost !== '零' && sc.cost !== '轻' && !M.plan.customBudget
        ? h('div', { class: 'm3-warn' }, ['本场景为「' + sc.cost + '」投入档，通常涉及系统对接。另议项计列为 0 将使回收期偏短，参数可信度相应扣减。'])
        : null,
      h('h3', { class: 'm3-h3' }, ['上线期的企业内部投入']),
      field('数据现状', '决定整理工作量', opts([
        { v: 'paper', t: '纸质为主', s: '倍率 1.6' }, { v: 'excel', t: '表格为主', s: '1.15' },
        { v: 'scattered', t: '散在多个系统', s: '1.3' }, { v: 'system', t: '系统里齐全', s: '1.0' }
      ], M.plan.dataState, function (v) { M.plan.dataState = v; })),
      numRow('推进人员数', '负责数据准备与配置对接', M.plan.setupPeople, '人', [1, 2, 3], function (v) { M.plan.setupPeople = v || 1; }),
      numRow('推进人员平均月薪', '用于工时的综合用工成本折算', M.plan.setupSalary, '元/月', [5500, 7500, 11000, 16000], function (v) { M.plan.setupSalary = v || 7500; }),
      h('div', { class: 'm3-act' }, [
        h('button', { class: 'btn ghost', onclick: function () { setStep('input'); } }, ['上一步']),
        h('button', { class: 'btn', onclick: function () { setStep('gain'); } }, ['下一步：收益端'])
      ])
    ]));
  }

  function screenGain() {
    var lv = M.plan.sceneId ? leversOf(M.plan.sceneId) : ['hours'];
    var sc = M.plan.sceneId ? sceneById(M.plan.sceneId) : null;
    var blocks = lv.map(function (k) {
      var d = leverDef(k); if (!d) return null;
      return h('div', { class: 'm3-lv' }, [
        h('div', { class: 'hd' }, [h('b', {}, [d.name]), h('i', {}, [d.money])]),
        h('div', { class: 'cut' }, [d.cutNote]),
        h('div', { class: 'fs' }, d.fields.map(function (f) {
          return numRow(f.label, f.hint || '', M.gain[f.key] == null ? null : M.gain[f.key], f.unit, f.presets, function (v) {
            if (v == null) delete M.gain[f.key]; else M.gain[f.key] = v;
          });
        })),
        d.cash ? null : h('div', { class: 'm3-hint' }, ['本项属非现金科目。除非释放工时被重新配置至产出性岗位，否则不构成可确认的现金流入，故不参与回收期测算，报告中单独列示。'])
      ]);
    }).filter(Boolean);
    $root.appendChild(h('div', { class: 'm3-pane' }, [
      steps(3),
      h('h2', { class: 'm3-h2' }, ['第三步　收益端参数']),
      h('p', { class: 'm3-p' }, [sc ? '「' + sc.name + '」的效益按「' + sc.roiBasis + '」折算，下列字段为该口径所需的全部参数。' : '未指定场景，按通用轻量口径测算，仅采集人工工时节约所需参数。']),
      h('div', {}, blocks),
      h('div', { class: 'm3-hint' }, ['无法提供的字段可留空。留空项不参与测算，报告在「数据缺口与补齐建议」一章逐项列示。本工具不对效益杠杆的核心参数设定默认值。']),
      h('div', { class: 'm3-act' }, [
        h('button', { class: 'btn ghost', onclick: function () { setStep('plan'); } }, ['上一步']),
        h('button', { class: 'btn', onclick: function () { var r = recompute(); if (r.ok) { sh.charge(r.meta.credits); sh.setQrReady(false); setStep('board'); } } }, ['进入测算台'])
      ])
    ]));
  }

  // ================= 屏 4：测算台 =================
  // 三栏控制台：左「参数台」实时调参，中「结论台」主口径与基线对照，右「推演台」情景 / 敏感度 / 护栏。
  // 全部控件都走内核 compute()，屏上任何一个数字都能在报告里找到同名同值的出处。
  function snapshot() {
    return JSON.stringify({ plan: M.plan, gain: M.gain, cutMul: M.cutMul });
  }
  function boardRecalc() {
    var o = core.compute({ profile: M.form, plan: M.plan, gain: M.gain }, bundle());
    if (o.ok) { o.meta.date = '20260917'; M.result = o; }
    return o.ok;
  }
  function refreshBoard() {
    var mid = document.getElementById('m3-cmain'), side = document.getElementById('m3-cside'),
      panel = document.getElementById('m3-cpanel'), bar = document.getElementById('m3-cbarrt');
    if (!mid) return;
    sh.clear(mid); fillMain(mid);
    sh.clear(side); fillSide(side);
    if (bar) { sh.clear(bar); fillBarRight(bar); }
    if (panel) panel.querySelectorAll('.srow[data-k]').forEach(function (row) {
      var k = row.getAttribute('data-k'), rd = row.querySelector('.v');
      if (rd && READ[k]) { rd.textContent = READ[k](); rd.classList.toggle('chg', CHANGED[k] ? CHANGED[k]() : false); }
    });
    sh.touch();
  }
  var READ = {}, CHANGED = {};

  function changedList() {
    var b = M.baseSnap ? JSON.parse(M.baseSnap) : null;
    if (!b) return [];
    var out = [];
    if (b.plan.tier !== M.plan.tier) out.push('订阅档位');
    if (b.plan.seats !== M.plan.seats) out.push('订阅套数');
    if (b.plan.diagnosisDays !== M.plan.diagnosisDays) out.push('诊断天数');
    if (b.plan.customBudget !== M.plan.customBudget) out.push('另议项预算');
    if (b.plan.dataState !== M.plan.dataState) out.push('数据现状');
    if (b.plan.setupPeople !== M.plan.setupPeople) out.push('推进人员数');
    if (b.plan.setupSalary !== M.plan.setupSalary) out.push('推进人员月薪');
    if (b.cutMul !== M.cutMul) out.push('折减系数');
    Object.keys(M.gain).forEach(function (k) { if (b.gain[k] !== M.gain[k]) out.push(fieldLabelMap()[k] || k); });
    return out;
  }

  function screenBoard() {
    var r = M.result; if (!r) { setStep('input'); return; }
    if (!M.base) { M.base = JSON.parse(JSON.stringify(r)); M.baseSnap = snapshot(); }
    var wrap = h('div', { class: 'm3-console' });
    var bar = h('div', { class: 'cbar' }, [
      h('div', { class: 'no' }, ['04']),
      h('div', {}, [h('div', { class: 't' }, ['测算台']), h('div', { class: 'en' }, ['CALCULATION CONSOLE'])]),
      h('div', { class: 'rt', id: 'm3-cbarrt' }, [])
    ]);
    fillBarRight(bar.querySelector('#m3-cbarrt'));
    wrap.appendChild(bar);
    var grid = h('div', { class: 'cgrid' });
    var panel = h('div', { id: 'm3-cpanel' }), main = h('div', { id: 'm3-cmain' }), side = h('div', { id: 'm3-cside' });
    fillPanel(panel); fillMain(main); fillSide(side);
    grid.appendChild(panel); grid.appendChild(main); grid.appendChild(side);
    wrap.appendChild(grid);
    wrap.appendChild(h('div', { class: 'm3-act' }, [
      h('button', { class: 'btn ghost', onclick: function () { setStep('gain'); } }, ['返回收益端']),
      h('button', { class: 'btn', onclick: function () { sh.setQrReady(true); setStep('report'); } }, ['出具完整报告'])
    ]));
    $root.appendChild(wrap);
  }

  function fillBarRight(box) {
    var n = changedList().length;
    box.appendChild(h('span', { class: 'pill' }, ['参数即时重算']));
    box.appendChild(h('span', { class: 'pill' + (n ? ' gold' : '') }, [n ? '已调整 ' + n + ' 项' : '与基线一致']));
    box.appendChild(h('button', { class: 'lnk', onclick: function () { M.base = JSON.parse(JSON.stringify(M.result)); M.baseSnap = snapshot(); refreshBoard(); } }, ['设为基线']));
  }

  // ---------- 左栏：参数台 ----------
  function seg(list, cur, on) {
    return h('div', { class: 'seg' }, list.map(function (o) {
      return h('button', { class: cur === o.v ? 'on' : '', onclick: function () { on(o.v); if (boardRecalc()) refreshBoard(); } }, [o.t]);
    }));
  }
  function slider(key, name, hint, min, max, step, get, set, read, changed) {
    READ[key] = read; CHANGED[key] = changed;
    var row = h('div', { class: 'srow', 'data-k': key });
    row.appendChild(h('div', { class: 'top' }, [
      h('span', { class: 'n' }, [name, hint ? h('em', {}, [hint]) : null]),
      h('span', { class: 'v' + (changed() ? ' chg' : '') }, [read()])
    ]));
    var rg = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(get()) });
    rg.addEventListener('input', function () { set(Number(rg.value)); if (boardRecalc()) refreshBoard(); });
    row.appendChild(rg);
    return row;
  }
  function fillPanel(box) {
    var P = C().prices, b = M.baseSnap ? JSON.parse(M.baseSnap) : null;
    var inv = h('div', { class: 'card' }, [h('h4', {}, ['投入参数', h('span', {}, ['INVESTMENT'])])]);
    inv.appendChild(h('h5', {}, ['订阅档位']));
    inv.appendChild(seg(P.subscription.map(function (t) { return { v: t.key, t: t.name.replace('版', '') }; }), M.plan.tier,
      function (v) { M.plan.tier = v; }));
    inv.appendChild(h('div', { class: 'ghint' }, ['单套年费：' + P.subscription.map(function (t) { return t.name + ' ' + t.yearly + ' 元'; }).join('　')]));
    inv.appendChild(slider('seats', '订阅套数', null, 1, 20, 1,
      function () { return M.plan.seats; }, function (v) { M.plan.seats = v; },
      function () { return M.plan.seats + ' 套'; }, function () { return !!b && b.plan.seats !== M.plan.seats; }));
    inv.appendChild(slider('diag', '诊断天数', '1980 元 / 天', 0, 5, 1,
      function () { return M.plan.diagnosisDays; }, function (v) { M.plan.diagnosisDays = v; },
      function () { return M.plan.diagnosisDays + ' 天'; }, function () { return !!b && b.plan.diagnosisDays !== M.plan.diagnosisDays; }));
    inv.appendChild(slider('custom', '另议项预算', '对接 / 定制', 0, 200000, 2000,
      function () { return M.plan.customBudget; }, function (v) { M.plan.customBudget = v; },
      function () { return fmt(M.plan.customBudget) + ' 元'; }, function () { return !!b && b.plan.customBudget !== M.plan.customBudget; }));
    inv.appendChild(h('h5', {}, ['数据现状']));
    inv.appendChild(seg([{ v: 'paper', t: '纸质' }, { v: 'scattered', t: '分散' }, { v: 'excel', t: '表格' }, { v: 'system', t: '系统' }],
      M.plan.dataState, function (v) { M.plan.dataState = v; }));
    inv.appendChild(h('div', { class: 'ghint' }, ['倍率 1.6 / 1.3 / 1.15 / 1.0，作用于场景基准上线周期。']));
    inv.appendChild(slider('people', '推进人员数', null, 1, 8, 1,
      function () { return M.plan.setupPeople; }, function (v) { M.plan.setupPeople = v; },
      function () { return M.plan.setupPeople + ' 人'; }, function () { return !!b && b.plan.setupPeople !== M.plan.setupPeople; }));
    box.appendChild(inv);

    var lv = M.plan.sceneId ? leversOf(M.plan.sceneId) : ['hours'];
    var gain = h('div', { class: 'card' }, [h('h4', {}, ['收益参数', h('span', {}, ['BENEFIT'])])]);
    var any = false;
    lv.forEach(function (k) {
      var d = leverDef(k); if (!d) return;
      gain.appendChild(h('h5', {}, [d.name]));
      d.fields.forEach(function (f) {
        if (M.gain[f.key] == null) return;
        any = true;
        var lo = f.min != null ? f.min : 0, hi = f.max != null ? f.max : Math.max(1, M.gain[f.key] * 3);
        var st = f.type === 'int' ? 1 : (hi > 10000 ? 500 : (hi > 100 ? 1 : 0.05));
        gain.appendChild(slider('g_' + f.key, f.label, f.unit, lo, hi, st,
          function () { return M.gain[f.key]; }, function (v) { M.gain[f.key] = v; },
          function () { return (Math.round(M.gain[f.key] * 100) / 100) + ' ' + (f.unit || ''); },
          function () { return !!b && b.gain[f.key] !== M.gain[f.key]; }));
      });
    });
    if (!any) gain.appendChild(h('div', { class: 'ghint' }, ['收益端参数尚未填报，返回上一步补齐后方可在此调节。']));
    gain.appendChild(h('h5', {}, ['折减系数整体调节']));
    gain.appendChild(slider('cut', '折减系数', '× 基准值', 0.4, 1.6, 0.05,
      function () { return M.cutMul; }, function (v) { M.cutMul = Math.round(v * 100) / 100; },
      function () { return '× ' + M.cutMul.toFixed(2); }, function () { return !!b && b.cutMul !== M.cutMul; }));
    gain.appendChild(h('div', { class: 'ghint' }, ['折减系数反映工具可影响的部分占该事项全量的比例。下调即假定实际改善幅度低于基准取值，调整后报告同步按调整值出具。']));
    gain.appendChild(h('button', { class: 'reset', onclick: function () {
      if (!M.baseSnap) return;
      var s0 = JSON.parse(M.baseSnap);
      M.plan = JSON.parse(JSON.stringify(s0.plan)); M.gain = JSON.parse(JSON.stringify(s0.gain)); M.cutMul = s0.cutMul;
      if (boardRecalc()) { sh.clear($root); screenBoard(); }
    } }, ['恢复基线参数']));
    box.appendChild(gain);
  }

  // ---------- 中栏：结论台 ----------
  function dlt(k, v, dv, unit, better) {
    var cls = dv === 0 || dv == null ? '' : ((better === 'down' ? dv < 0 : dv > 0) ? ' up' : ' down');
    var txt2 = dv == null ? '基线缺口' : (dv === 0 ? '与基线一致' : (dv > 0 ? '+' : '−') + fmt(Math.abs(dv)) + (unit || ''));
    return h('div', { class: 'dl' }, [h('div', { class: 'k' }, [k]), h('div', { class: 'v' }, [v]), h('div', { class: 'd' + cls }, [txt2])]);
  }
  function fillMain(box) {
    var r = M.result, b = M.base, pm = payMonth(r), bpm = b ? payMonth(b) : null;
    box.appendChild(h('div', { class: 'verd' }, [
      h('div', { class: 'big' }, [
        h('div', { class: 'lb' }, ['累计净现金流转正期次']),
        h('div', { class: 'v' }, [pm == null ? '> ' + r.meta.horizon : '第 ' + pm, h('small', {}, ['期'])]),
        h('div', { class: 'bs' }, [payBasisLabel(r)])
      ]),
      h('div', { class: 'tx' }, [h('div', { class: 'hl' }, [r.verdict.headline]), h('div', { class: 'x' }, [r.verdict.text])])
    ]));
    box.appendChild(h('div', { class: 'deltas' }, [
      dlt('转正期次', pm == null ? '未转正' : '第 ' + pm + ' 期',
        (pm == null || bpm == null) ? null : pm - bpm, ' 期', 'down'),
      dlt('月度现金收益', fmt(r.benefit.cashMonthly) + ' 元', b ? r.benefit.cashMonthly - b.benefit.cashMonthly : null, ' 元', 'up'),
      dlt('首年现金支出', fmt(r.invest.cashYear1) + ' 元', b ? r.invest.cashYear1 - b.invest.cashYear1 : null, ' 元', 'down'),
      dlt('参数可信度', r.confidence.score + ' 分', b ? r.confidence.score - b.confidence.score : null, ' 分', 'up')
    ]));
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['累计净现金流', h('span', {}, ['CUMULATIVE NET CASH FLOW'])]),
      r.flow.length ? CH.paybackCurve(r.flow, r.payback, { baseline: b && b.flow.length ? b.flow : null })
        : h('div', { class: 'ghint' }, ['收益端参数补齐后方可出具本图。']),
      h('div', { class: 'cap' }, ['实线为当前参数下的累计净额，灰色虚线为基线。金色标记为转正期次。'])
    ]));
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['关键数字', h('span', {}, ['KEY FIGURES'])]),
      h('div', { class: 'kfigs' }, r.keyNumbers.slice(0, 4).map(function (k) {
        return h('div', { class: 'kf' + (k.wide ? ' wide' : '') }, [
          h('div', { class: 'k' }, [k.k]),
          h('div', { class: 'v' }, [k.v == null ? '—' : fmt(k.v), h('small', {}, [k.v == null ? '' : ' ' + k.unit])]),
          h('div', { class: 's' }, [k.s])
        ]);
      })),
      h('div', { class: 'kfigs', style: 'margin-top:9px' }, r.keyNumbers.slice(4).map(function (k) {
        return h('div', { class: 'kf' + (k.wide ? ' wide' : '') }, [
          h('div', { class: 'k' }, [k.k]),
          h('div', { class: 'v' }, [k.v == null ? '—' : fmt(k.v), h('small', {}, [k.v == null ? '' : ' ' + k.unit])]),
          h('div', { class: 's' }, [k.s])
        ]);
      }))
    ]));
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['24 期现金流', h('span', {}, ['CASH FLOW'])]),
      r.flow.length ? CH.cashflowBars(r.flow) : h('div', { class: 'ghint' }, ['参数补齐后出具。'])
    ]));
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['敏感度', h('span', {}, ['SENSITIVITY'])]),
      r.sensitivity.length ? CH.sensitivityRange(r.sensitivity, payMonth(r), r.meta.horizon)
        : h('div', { class: 'ghint' }, ['收益端参数补齐后方可出具敏感度分析。']),
      h('div', { class: 'cap' }, ['各项假设分别作上下 20% 的单因素扰动，按回收期变动幅度降序排列。杠铃两端为该项扰动后的转正期次，虚线为当前参数下的基准值。'])
    ]));
    var ch = changedList();
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['与基线的差异', h('span', {}, ['DIFF FROM BASELINE'])]),
      h('div', { class: 'chglist' }, ch.length
        ? ['已调整参数：', h('b', {}, [ch.join('、')]), '。上述差异全部体现在本页各项数字与右栏推演结果中，出具报告时按当前参数计列。']
        : [h('span', { class: 'none' }, ['当前参数与基线一致。调节左栏任一控件即可实时观察其对回收期的影响。'])])
    ]));
  }

  // ---------- 右栏：推演台 ----------
  function fillSide(box) {
    var r = M.result;
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['三档情景', h('span', {}, ['SCENARIOS'])]),
      CH.scenarioBand(r.scenarios, r.meta.horizon),
      h('div', { class: 'cap' }, ['保守档按收益 65%、投入 120% 计；积极档按收益 125%、投入 95% 计。决策建议以保守档为基准。'])
    ]));
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['收益护栏', h('span', {}, ['CAPS'])]),
      CH.capFunnel(r.benefit),
      h('div', { class: 'cap' }, [r.capped ? '合并收益已触及营收封顶线，超出部分未予确认。' : '合并收益未触及营收封顶线。'])
    ]));
    box.appendChild(h('div', { class: 'card' }, [
      h('h4', {}, ['投入结构', h('span', {}, ['COST STRUCTURE'])]),
      CH.investStack(r.invest.cashItems)
    ]));
    if (r.missing.length) box.appendChild(h('div', { class: 'm3-warn' }, [
      '待补齐参数 ' + r.missing.length + ' 项：' + r.missing.map(function (x) { return x.label; }).join('、') + '。补齐后回收期测算精度相应提升。'
    ]));
  }

  function draw() {
    sh.clear($root);
    if (M.step === 'input') screenInput();
    else if (M.step === 'plan') screenPlan();
    else if (M.step === 'gain') screenGain();
    else if (M.step === 'board') screenBoard();
    else screenReport();
  }

  window.DGG.registerModule('m3', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });

  // ================= 屏 5：报告 =================
  var CHAPTERS = [
    { no: '00', title: '阅读说明与口径声明', page: 2 }, { no: '01', title: '测算结论', page: 3 },
    { no: '02', title: '测算对象界定', page: 5 }, { no: '03', title: '投入测算', page: 6 },
    { no: '04', title: '收益测算', page: 8 }, { no: '05', title: '回收期测算', page: 12 },
    { no: '06', title: '情景分析', page: 15 }, { no: '07', title: '敏感度分析', page: 17 },
    { no: '08', title: '参数来源与可信度', page: 18 }, { no: '09', title: '数据缺口与补齐建议', page: 19 },
    { no: '10', title: '实施周期与效益释放', page: 20 }, { no: '11', title: '组织保障与职责分工', page: 21 },
    { no: '12', title: '服务与报价口径', page: 22 }, { no: '13', title: '测算复核触发条件', page: 23 },
    { no: 'A', title: '测算常量与公式', page: 24 }, { no: 'B', title: '方法与术语', page: 26 },
    { no: 'C', title: '场景基础数据', page: 27 }
  ];
  var CHC = {
    cover: ['#0A3A2E', '#11705A'], nav:  ['#123F2A', '#2A6B47'], quick: ['#0A3A2E', '#11705A'],
    prof:  ['#4A1F52', '#8E3D96'], cost: ['#6B1F1F', '#A83A3A'], gain:  ['#0A3F32', '#00875A'],
    pay:   ['#7A5B0C', '#C69A18'], scen: ['#4A1F52', '#8E3D96'], sens:  ['#6B1F1F', '#A83A3A'],
    conf:  ['#123F2A', '#2A6B47'], plan: ['#0A3C46', '#0E7A84'], app:   ['#1E2C26', '#3E5148']
  };
  function page3(chapter, r, key, cls) {
    var c = CHC[key] || CHC.nav;
    return h('section', { class: 'page m3 ' + (cls || ''), style: '--cc:' + c[0] + ';--cc2:' + c[1] });
  }
  function bar3(no, title, en, rv, rk, slim) {
    return h('div', { class: 'm3-bar' + (slim ? ' slim' : '') }, [
      h('div', { class: 'no' }, [no]),
      h('div', {}, [h('div', { class: 't' }, [title]), en ? h('div', { class: 'en' }, [en]) : null]),
      rv ? h('div', { class: 'rt' }, [h('div', { class: 'v' }, [rv]), rk ? h('div', { class: 'k' }, [rk]) : null]) : h('div', {})
    ]);
  }
  function wrapPage(p, r, chapter, no, title, en, rtv, rtk, nodes) {
    p.appendChild(h('div', { class: 'm3-head' }, [
      h('span', { class: 'ch' }, [h('i', {}), chapter]),
      h('span', { class: 'rt' }, [r.profile.name + '　·　' + reportNo(r)])
    ]));
    p.appendChild(bar3(no, title, en, rtv, rtk));
    (nodes || []).forEach(function (n) { if (n) p.appendChild(n); });
    p._w = p; return p;
  }
  // 口径行 / 图注 / 脚注 —— 专业报告的三件套
  function basis3(t) { return h('div', { class: 'm3-basis' }, [h('b', {}, ['测算依据　']), t]); }
  function cap3(t) { return h('div', { class: 'm3-cap' }, [t]); }
  function fn3(t) { return h('div', { class: 'm3-fn' }, [h('b', {}, ['注　']), t]); }
  function rows3(list) { return h('div', { class: 'm3-rows' }, list.filter(Boolean)); }
  function row3(k, v, o) {
    o = o || {};
    return h('div', { class: 'm3-row' + (o.sum ? ' sum' : '') + (o.sub ? ' sub' : '') }, [
      h('div', { class: 'k' }, [o.b ? h('b', {}, [k]) : k, o.i ? h('i', {}, [o.i]) : null]),
      h('div', { class: 'v' + (o.pos ? ' pos' : '') + (o.neg ? ' neg' : '') }, [v, o.u ? h('small', {}, [o.u]) : null])
    ]);
  }
  function figs3(list, n) {
    return h('div', { class: 'm3-figs f' + (n || list.length) }, list.map(function (f) {
      return h('div', { class: 'm3-fig' + (f.hl ? ' hl' : '') + (f.pos ? ' pos' : '') + (f.neg ? ' neg' : '') }, [
        h('div', { class: 'k' }, [f.k]),
        h('div', { class: 'v' }, [f.v, f.u ? h('small', {}, [f.u]) : null]),
        f.s ? h('div', { class: 's' }, [f.s]) : null
      ]);
    }));
  }
  function note3(lb, hl, x, warn) {
    return h('div', { class: 'm3-note' + (warn ? ' warn' : '') }, [
      h('div', { class: 'lb' }, [lb]), h('div', { class: 'hl' }, [hl]), x ? h('div', { class: 'x' }, [x]) : null
    ]);
  }
  function tbl3(head, body, cls) {
    return h('table', { class: 'm3-tbl ' + (cls || '') }, [
      h('thead', {}, [h('tr', {}, head.map(function (t) { return h('th', { class: t[1] || '' }, [t[0]]); }))]),
      h('tbody', {}, body.map(function (tr) { return h('tr', {}, tr.map(function (td) { return h('td', { class: td[1] || '' }, [td[0]]); })); }))
    ]);
  }
  function hh3(t, en) { return h('h3', { class: 'm3-h' }, [t, en ? h('span', { class: 'en' }, [en]) : null]); }
  function two3(a, b, cls) { return h('div', { class: 'm3-two ' + (cls || '') }, [h('div', {}, [a]), h('div', {}, [b])]); }
  function list3(items) { return h('ul', { class: 'm3-list' }, items.map(function (x) { return h('li', {}, [x]); })); }

  function screenReport() {
    var r = M.result; if (!r) { setStep('input'); return; }
    M.pages = [];
    $root.appendChild(h('div', { class: 'report-bar' }, [
      h('span', { id: 'm3-pages-count' }, ['']),
      h('button', { class: 'btn ghost', onclick: function () { sh.print(); } }, ['打印 / 导出 PDF']),
      h('button', { class: 'btn ghost', onclick: function () { sh.showWeChat(); } }, ['发到手机']),
      h('button', { class: 'btn ghost', onclick: function () { setStep('board'); } }, ['回测算台'])
    ]));
    var wrap = h('div', { class: 'report' }), toc = h('nav', { class: 'toc' }), pages = h('div', { class: 'pages' });
    var add = function (title, el2, o) { o = o || {}; M.pages.push({ title: title, sub: o.sub, one: o.one, el: el2, brief: !!o.brief }); };

    add('封面', pFront(r), { brief: true });
    add('阅读说明与口径声明', pNav(r), { one: '测算范围、科目划分、参数来源与结论适用边界' });
    add('01 测算结论', pQuick1(r), { brief: true, one: '投入、收益、回收期三项核心指标与总体结论' });
    add('', pQuick2(r), { brief: true, sub: '核心结论问答' });
    add('02 测算对象', pProfile(r), { one: '企业基本情况、场景界定与效益杠杆识别' });
    add('03 投入测算', pCost1(r), { brief: true, one: '现金支出逐项计列、结构分析与发生期次' });
    add('', pCost2(r), { sub: '人工工时投入与上线周期' });
    add('04 收益测算', pGain1(r), { one: '效益杠杆建模、合并口径与两道护栏' });
    add('', pGain2(r), { sub: '逐项测算过程' });
    add('', pGain3(r), { sub: '现金与非现金科目划分' });
    add('', pGain4(r), { sub: '同业场景横向对照' });
    add('05 回收期测算', pPay1(r), { brief: true, one: '累计净现金流、转正期次与双口径对照' });
    add('', pPay2(r), { sub: '24 期现金流分布' });
    add('', pPay3(r), { sub: '逐期明细' });
    add('06 情景分析', pScen(r), { brief: true, one: '保守、中性、积极三档的回收期与净额' });
    add('', pScen2(r), { sub: '三档逐期对照' });
    add('07 敏感度分析', pSens(r), { one: '五项关键假设的单因素扰动与影响排序' });
    add('08 参数来源与可信度', pConf(r), { one: '逐项参数来源、可信度评分与参考值影响' });
    add('09 数据缺口与补齐建议', pMissing(r), { one: '缺口清单、补齐路径与补齐后的测算变化' });
    add('10 实施周期与效益释放', pRamp(r), { one: '上线周期测算、过渡期爬坡与前置条件' });
    add('11 组织保障与职责分工', pRoles(r), { one: '三类角色的职责边界与时间投入' });
    add('12 服务与报价口径', pServices(r), { one: '已计列项目、可选服务与报价说明' });
    add('13 测算复核触发条件', pRetrigger(r), { one: '五种应重新测算的情形及其影响机理' });
    add('附录 A 测算常量与公式', pAppA(r), { one: '全部常量取值、七项效益杠杆公式与折减系数' });
    add('', pAppB(r), { sub: '24 期逐期明细' });
    add('附录 B 方法与术语', pAppC(r), { one: '测算方法说明、术语释义与口径声明' });
    add('附录 C 场景基础数据', pAppD(r), { one: '场景库所载原始字段，供口径追溯' });
    add('封底', pEnd(r), {});

    M.pages.forEach(function (pg, i) {
      pg.el.setAttribute('data-page', String(i + 1)); if (pg.brief) pg.el.classList.add('brief');
      if (i > 0 && i < M.pages.length - 1 && pg.el._w) pg.el._w.appendChild(h('div', { class: 'm3-foot' }, [
        h('div', { class: 'rule' }),
        h('div', { class: 'row' }, [h('span', {}, [r.profile.name + '　·　' + RT().reportTitle + '　·　' + RT().issuer]),
          h('span', {}, ['第 ' + (i + 1) + ' 页 / 共 ' + M.pages.length + ' 页'])])
      ]));
      pages.appendChild(pg.el);
    });
    toc.appendChild(h('h4', {}, ['目录']));
    M.pages.forEach(function (pg, i) {
      if (!pg.title && !pg.sub) return;
      toc.appendChild(h('button', { class: pg.sub ? 'sub' : '', onclick: function () { pg.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
        [h('span', {}, [trunc(pg.title || pg.sub, 14)]), h('span', { class: 'pn' }, [String(i + 1)])]));
    });
    wrap.appendChild(toc); wrap.appendChild(pages); $root.appendChild(wrap);
    var pc = document.getElementById('m3-pages-count'); if (pc) pc.textContent = '共 ' + M.pages.length + ' 页';
  }

  // ---------- 各页 ----------
  function money(n) { return n == null ? '—' : fmt(n); }
  function payBasisLabel(r) { return r.payback != null ? '现金口径' : (r.paybackAll != null ? '含工时口径' : '未转正'); }
  function payMonth(r) { return r.payback != null ? r.payback : r.paybackAll; }

  function pFront(r) {
    var p = h('section', { class: 'page m3-front' });
    var pm = payMonth(r), basis = payBasisLabel(r);
    p.appendChild(h('div', { class: 'hero' }, [
      CH.heroM3({ name: r.profile.name, title: RT().reportTitle, en: RT().reportTitleEn }),
      h('img', { class: 'logo', src: sh.CFG.logo, alt: '顶呱呱' })
    ]));
    p.appendChild(h('div', { class: 'body' }, [
      h('div', { class: 'lead' }, [
        h('div', { class: 'big' }, [
          h('div', { class: 'lb' }, ['累计净现金流转正期次']),
          h('div', { class: 'v' }, [pm == null ? '>24' : '第 ' + pm, h('small', {}, ['期'])]),
          h('div', { class: 'basis' }, [basis])
        ]),
        h('div', { class: 'txt' }, [
          h('div', { class: 'hl' }, [r.verdict.headline]),
          h('div', { class: 'x' }, [r.verdict.text])
        ])
      ]),
      figs3([
        { k: '首年现金支出', v: money(r.invest.cashYear1), u: '元', s: '含订阅与一次性支出', neg: true },
        { k: '月度现金收益', v: money(r.benefit.cashMonthly), u: '元', s: '效益释放满额后', pos: true },
        { k: '非现金效益', v: money(r.benefit.hoursMonthly), u: '元/月', s: '人工工时节约，不计入回收期' },
        { k: '参数可信度', v: String(r.confidence.score), u: '分', s: r.confidence.name, hl: true }
      ], 4),
      h('div', { class: 'm3-two wl', style: 'margin-top:14px' }, [
        h('div', {}, [
          h('div', { class: 'm3-cap', style: 'margin:0 0 4px' }, ['测算对象']),
          rows3([
            row3('企业名称', r.profile.name, { b: true }),
            row3('测算场景', r.scene.name, { b: true, i: r.scene.module }),
            row3('效益杠杆', r.benefit.levers.length ? r.benefit.levers.map(function (x) { return x.name; }).join(' · ') : '参数不足'),
            row3('测算期', r.meta.horizon + ' 期', { i: '自上线当月起计' })
          ])
        ]),
        h('div', {}, [r.flow.length ? CH.miniCurve(r.flow, r.payback) : null])
      ]),
      h('div', { class: 'scenstrip' }, r.scenarios.map(function (s) {
        return h('div', { class: 'it' + (s.key === 'mid' ? ' on' : '') }, [
          h('div', { class: 'n' }, [s.name + '档']),
          h('div', { class: 'v' }, [s.payback == null ? '> ' + r.meta.horizon + ' 期' : '第 ' + s.payback + ' 期']),
          h('div', { class: 's' }, ['首年净额 ' + fmt(s.cum12) + ' 元'])
        ]);
      })),
      h('div', { class: 'bot' }, [
        h('span', {}, [RT().issuer + '　·　' + RT().issuerSub]),
        h('span', {}, ['报告编号 ' + reportNo(r) + '　出具日期 2026-09-17'])
      ])
    ]));
    return p;
  }

  function pNav(r) {
    var p = page3(null, r, 'nav');
    return wrapPage(p, r, '阅读说明', '00', '阅读说明与口径声明', 'SCOPE AND BASIS', null, null, [
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [
          hh3('测算范围与科目划分', 'SCOPE'),
          h('div', { class: 'm3-cap', style: 'font-size:calc(10.5px * var(--scale));line-height:1.8;color:var(--body)' }, [RT().readingGuide.lead]),
          list3(RT().readingGuide.items)
        ]),
        h('div', {}, [
          hh3('本次测算要素', 'PARAMETERS'),
          rows3([
            row3('测算单元', '单一业务场景', { i: r.scene.name }),
            row3('测算期', r.meta.horizon + ' 期'),
            row3('计量单位', '人民币元', { i: '取整至元' }),
            row3('效益杠杆数', r.benefit.levers.length + ' 项', { i: '共七类' }),
            row3('参数总数', String(Object.keys(r.inputSource).length) + ' 项'),
            row3('其中参考值', String(Object.keys(r.inputSource).filter(function (k) { return r.inputSource[k] !== 'user'; }).length) + ' 项',
              { neg: Object.keys(r.inputSource).some(function (k) { return r.inputSource[k] !== 'user'; }) })
          ])
        ])
      ]),
      hh3('报告结构', 'STRUCTURE'),
      CH.chapterMap(CHAPTERS, { total: 28 }),
      cap3('正文十三章按投入、收益、回收期的顺序展开，附录三篇载常量、方法与场景原始数据，供口径追溯。'),
      hh3('口径声明', 'BASIS OF PREPARATION'),
      note3('重要提示', RT().honesty.lead, ''),
      list3(RT().honesty.items),
      fn3('本报告由「薯片AI智能体 · 企业AI投入ROI测算器」生成，测算过程离线运行，不依赖外部数据接口。全部常量取值见附录 A。')
    ]);
  }

  function pQuick1(r) {
    var p = page3(null, r, 'quick');
    var pm = payMonth(r);
    return wrapPage(p, r, '01 测算结论', '01', '测算结论', 'CONCLUSION',
      pm == null ? '>24' : '第 ' + pm, payBasisLabel(r) + ' · 期', [
      figs3([
        { k: '投入 · 首年现金支出', v: money(r.invest.cashYear1), u: '元',
          s: '一次性 ' + Math.round(r.invest.cashOnce / (r.invest.cashYear1 || 1) * 100) + '% · 续费 ' + money(r.invest.cashYearly) + ' 元/年', neg: true },
        { k: '收益 · 月度现金收益', v: money(r.benefit.cashMonthly), u: '元',
          s: r.benefit.levers.length + ' 项效益杠杆合并后', pos: true },
        { k: '回收期 · 转正期次', v: pm == null ? '>24 期' : '第 ' + pm + ' 期',
          s: payBasisLabel(r) + (r.scenarios[0].payback ? ' · 保守档第 ' + r.scenarios[0].payback + ' 期' : ''), hl: true }
      ], 3),
      note3('总体结论', r.verdict.headline, r.verdict.text, r.payback == null),
      hh3('累计净现金流曲线', 'CUMULATIVE NET CASH FLOW'),
      r.flow.length ? CH.paybackCurve(r.flow, r.payback) : h('div', { class: 'm3-cap' }, ['收益科目参数补齐后方可出具本图。']),
      cap3('纵轴为累计净现金流（元），横轴为期次。绿色区域表示累计净额为正。第 1、13 期的下探为年度订阅费用整额计列所致。'),
      r.flow.length ? h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('回收进度', 'RECOVERY PROGRESS'), CH.recoveryShare(r.flow, r.invest.cashYear1)]),
        h('div', {}, [hh3('关键数字', 'KEY FIGURES'), rows3(r.keyNumbers.slice(0, 4).map(function (k) {
          return row3(k.k, fmt(k.v) + ' ' + k.unit, { i: k.s });
        }))])
      ]) : null,
      basis3('回收期取累计净现金流首次由负转正的期次。' + C().rampNote + '　' + RT().method.timing)
    ]);
  }

  function pQuick2(r) {
    var p = page3(null, r, 'quick');
    return wrapPage(p, r, '01 测算结论', '01', '核心结论问答', 'KEY FINDINGS', null, null, [
      figs3(r.keyNumbers.slice(0, 4).map(function (k) {
        return { k: k.k, v: fmt(k.v), u: k.unit, s: k.s };
      }), 4),
      hh3('结论要项', 'KEY FINDINGS'),
      tbl3([['项目'], ['结论'], ['说明']], r.quickView.map(function (q) {
        return [[q.q, 'b'], [q.a, 'b'], [q.text]];
      })),
      hh3('收益科目构成', 'BENEFIT COMPOSITION'),
      h('div', { class: 'm3-two wl' }, [
        CH.cashVsHours(r.benefit.cashMonthly, r.benefit.hoursMonthly),
        h('div', {}, [
          r.roi && !r.roi.meaningful
            ? note3('关于投资回报率', '本次投入基数过小，回报率指标不具备参考意义', r.roi.note, true)
            : (r.roi && r.roi.roi12 != null
              ? note3('投资回报率', '首年 ' + r.roi.roi12 + '%，两年 ' + r.roi.roi24 + '%', '分母为累计现金投入 ' + money(r.roi.inv12) + ' 元。该指标未作折现处理。')
              : null)
        ])
      ]),
      hh3('结论的适用边界', 'SCOPE OF CONCLUSION'),
      list3([
        '本结论以单一业务场景为测算单元，不代表企业整体信息化投入的回报水平；同时实施多个场景时，效益不可简单相加。',
        '全部金额按当期价目与企业填报参数计列，未作折现处理，亦未计列通货膨胀与人力成本自然增长的影响。',
        '测算期为 ' + r.meta.horizon + ' 期。超出测算期的效益不在本报告的确认范围之内。',
        '结论建立在实施按期完成、角色按第 11 章到位的前提之上；前置条件未满足将同时延后效益释放与回收期。'
      ]),
      basis3('现金科目为实际发生的现金收支；非现金科目为人工工时节约，按综合用工成本折算后单独列示，不参与回收期测算。')
    ]);
  }

  function pProfile(r) {
    var p = page3(null, r, 'prof');
    var sc = r.scene;
    return wrapPage(p, r, '02 测算对象', '02', '测算对象界定', 'SUBJECT DEFINITION', null, null, [
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('企业基本情况', 'COMPANY PROFILE'), rows3([
          row3('企业名称', r.profile.name, { b: true }),
          row3('所属行业', sh.industryNameOf(r.profile.industry) || '—'),
          row3('人员规模', r.profile.size ? sh.optText('size', r.profile.size) : '—'),
          row3('营业收入区间', r.profile.revenue ? sh.optText('revenue', r.profile.revenue) : '—'),
          row3('客户结构', r.profile.customers ? sh.optText('customers', r.profile.customers) : '—'),
          row3('在用业务系统', (r.profile.systems || []).length ? r.profile.systems.map(function (x) { return sh.optText('systems', x); }).join('、') : '无')
        ])]),
        h('div', {}, [hh3('场景界定', 'SCENARIO'), rows3([
          row3('场景名称', sc.name, { b: true }),
          row3('所属环节', sc.stage || '—'),
          row3('使用角色', sc.user || '—'),
          row3('替代事项', sc.replaces || '—'),
          row3('对应产品模块', sc.module),
          row3('基准上线周期', sc.weeks + ' 周', { i: '场景库所载' }),
          row3('投入档位', sc.cost + ' 档', { i: '价值分级 ' + sc.value + '/5' })
        ])])
      ]),
      hh3('效益杠杆识别', 'BENEFIT LEVER IDENTIFICATION'),
      basis3('效益杠杆依据场景库所载折算口径「' + sc.roiBasis + '」识别。命中多项时，按各项测算金额降序排列，金额最高项全额计列，其余各项按 ' + Math.round(C().overlapDiscount * 100) + '% 计列。'),
      tbl3([['效益杠杆'], ['效益来源'], ['折减系数', 'c'], ['科目性质', 'c'], ['本次测算', 'n']], r.levers.map(function (k) {
        var d = leverDef(k); if (!d) return null;
        var used = r.benefit.levers.filter(function (x) { return x.key === k; })[0];
        return [[d.name, 'b'], [d.money], [Math.round(d.cut * 100) + '%', 'c'],
          [d.cash ? '现金' : '非现金', 'c ' + (d.cash ? 'pos' : '')],
          [used ? fmt(used.final) + ' 元/月' : '参数不足', 'n ' + (used ? 'b' : 'neg')]];
      }).filter(Boolean)),
      hh3('七项效益杠杆的命中情况', 'LEVER UNIVERSE'),
      CH.cutScale(LV().items, r.levers),
      cap3('深色条为本次场景命中的杠杆，浅色条为未命中项。条长为该杠杆的折减系数。'),
      sc.metric ? fn3('场景库所载预期指标为「' + sc.metric + '」。该指标为区间表述，仅作口径说明，未参与任何金额计算。') : null,
      r.sceneBasis === 'generic' ? note3('口径提示', '本次按通用轻量场景口径测算', '未指定具体场景，效益仅按沟通与查找环节的人工工时节约建模，参数可信度已扣减 15 分。', true) : null
    ]);
  }

  function pCost1(r) {
    var p = page3(null, r, 'cost');
    var iv = r.invest;
    var once = Math.round(iv.cashOnce / (iv.cashYear1 || 1) * 100);
    return wrapPage(p, r, '03 投入测算', '03', '投入测算', 'CAPITAL EXPENDITURE',
      money(iv.cashYear1), '元 · 首年现金支出', [
      figs3(iv.cashItems.slice(0, 3).map(function (x, i) {
        return { k: x.name, v: money(x.amount), u: '元', s: x.detail, au: i === 2 };
      }).concat([{ k: '次年起续费', v: money(iv.cashYearly), u: '元', s: '仅订阅类科目继续发生' }]), 4),
      hh3('投入科目逐项计列', 'COST BREAKDOWN'),
      tbl3([['科目'], ['计价口径'], ['发生期次', 'c'], ['金额', 'n'], ['占比', 'n']],
        iv.cashItems.map(function (x) {
          return [[x.name, 'b'], [x.detail], [x.yearly ? '第 1 / 13 期' : '第 1 期', 'c'],
            ['−' + fmt(x.amount), 'n neg'], [(x.amount / (iv.cashYear1 || 1) * 100).toFixed(1) + '%', 'n']];
        }).concat([[['首年合计', 'b'], ['—'], ['—', 'c'], ['−' + fmt(iv.cashYear1), 'n neg'], ['100.0%', 'n']]])),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('投入结构', 'STRUCTURE'), CH.investStack(iv.cashItems),
          cap3('一次性支出占首年现金支出的 ' + once + '%，其余为年度订阅类科目。')]),
        h('div', {}, [hh3('发生期次分布', 'TIMING'), CH.costTiming(iv.cashOnce, iv.cashYearly),
          cap3('年度订阅费用于第 1 期与第 13 期整额计列，未采用月度摊销口径。')])
      ]),
      hh3('首年与次年投入对照', 'YEAR ONE VERSUS YEAR TWO'),
      tbl3([['期间'], ['一次性支出', 'n'], ['订阅费用', 'n'], ['合计', 'n'], ['占两年投入', 'n']], [
        [['首年（第 1 至 12 期）', 'b'], ['−' + fmt(iv.cashOnce), 'n neg'], ['−' + fmt(iv.cashYearly), 'n neg'],
          ['−' + fmt(iv.cashYear1), 'n b neg'], [(iv.cashYear1 / (iv.cashYear1 + iv.cashYearly) * 100).toFixed(1) + '%', 'n']],
        [['次年（第 13 至 24 期）'], ['—', 'n'], ['−' + fmt(iv.cashYearly), 'n neg'],
          ['−' + fmt(iv.cashYearly), 'n b neg'], [(iv.cashYearly / (iv.cashYear1 + iv.cashYearly) * 100).toFixed(1) + '%', 'n']],
        [['两年合计', 'b'], ['−' + fmt(iv.cashOnce), 'n neg'], ['−' + fmt(iv.cashYearly * 2), 'n neg'],
          ['−' + fmt(iv.cashYear1 + iv.cashYearly), 'n b neg'], ['100.0%', 'n']]
      ]),
      cap3('一次性支出仅在首年发生，故次年起的现金支出降至 ' + fmt(iv.cashYearly) + ' 元，为首年的 ' + Math.round(iv.cashYearly / (iv.cashYear1 || 1) * 100) + '%。'),
      basis3(RT().method.timing),
      fn3('价格取自《薯片AI智能体》定稿产品资料，未作调整。另议项按企业填报预算计列，实际以方案报价为准。')
    ]);
  }

  function pCost2(r) {
    var p = page3(null, r, 'cost');
    var iv = r.invest, w = C().work;
    return wrapPage(p, r, '03 投入测算', '03', '人工工时投入', 'INTERNAL LABOUR', 
      money(iv.laborYear1), '元 · 首年折算', [
      note3('科目划分', '人工工时投入单独立项，不并入现金口径', '上线期与日常运维占用企业自有人力，构成实际成本，但不产生现金流出。与现金科目合并计列将同时扭曲投入端与回收期，故单独列示。'),
      hh3('工时投入测算', 'LABOUR INPUT'),
      tbl3([['项目'], ['投入口径'], ['工时', 'n'], ['折算金额', 'n']], iv.laborItems.map(function (x) {
        return [[x.name, 'b'], [x.detail], [x.hours + ' 小时', 'n'], [fmt(x.amount) + (x.monthly ? ' 元/月' : ' 元'), 'n b']];
      }).concat([[['首年合计', 'b'], ['上线期一次性 + 运维 12 期'], ['—', 'n'], [fmt(iv.laborYear1) + ' 元', 'n b']]])),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('综合用工成本折算', 'HOURLY RATE'), rows3([
          row3('推进人员月薪', fmt(r.plan.setupSalary) + ' 元'),
          row3('综合用工系数', '× ' + w.laborBurden, { i: w.laborBurdenNote }),
          row3('月度工时基数', w.daysPerMonth + ' 日 × ' + w.hoursPerDay + ' 小时'),
          row3('折算综合时薪', iv.setupHourly + ' 元/小时', { sum: true })
        ])]),
        h('div', {}, [hh3('上线周期测算', 'ROLLOUT PERIOD'), rows3([
          row3('场景基准周期', r.scene.weeks + ' 周', { i: '场景库所载' }),
          row3('数据现状系数', '× ' + iv.dataStateMult, { i: '按在用系统与数据组织形式' }),
          row3('测算上线周期', iv.setupWeeks + ' 周', { sum: true })
        ]), cap3('上线期按每人每工作日投入 2 小时估算。')])
      ]),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('工时投入的期次分布', 'TIMING'),
          CH.laborTiming(iv.laborItems[0].amount, iv.runLaborMonthly, iv.setupWeeks / 4.35),
          cap3('上线期工时集中发生于前 ' + Math.ceil(iv.setupWeeks / 4.35) + ' 期，运行期按月度持续计列。')]),
        h('div', {}, [hh3('与现金口径的关系', 'RELATION TO CASH'), list3([
          '内部工时不产生现金流出，故不进入回收期测算的支出侧。',
          '该科目的意义在于揭示实施的真实资源占用：首年折算 ' + fmt(iv.laborYear1) + ' 元，相当于现金支出的 ' + Math.round(iv.laborYear1 / (iv.cashYear1 || 1) * 100) + '%。',
          '角色到位情况直接影响该科目的实际发生额，职责分工见第 11 章。'
        ])])
      ]),
      basis3('综合用工系数取 ' + w.laborBurden + '，涵盖社会保险、住房公积金等工资外用工支出。月度工时基数取 ' + w.daysPerMonth + ' 日，系年工作日 250 日按 12 个月折算的常用口径。')
    ]);
  }

  function pGain1(r) {
    var p = page3(null, r, 'gain');
    return wrapPage(p, r, '04 收益测算', '04', '收益测算', 'BENEFIT MODELLING',
      money(r.benefit.cashMonthly), '元/月 · 现金口径', [
      r.benefit.levers.length ? h('div', {}, [
        hh3('效益杠杆合并', 'LEVER AGGREGATION'),
        CH.benefitBridge(r.benefit.levers, r.benefit.fullMonthly),
        cap3('横轴为累计月度效益金额。金额最高项全额计列，其余各项按 ' + Math.round(C().overlapDiscount * 100) + '% 计列；斜纹填充表示非现金科目。')
      ]) : note3('参数不足', '收益科目关键参数未填报', '本次仅出具投入侧测算，缺口清单见第 09 章。', true),
      hh3('合并口径与两道护栏', 'AGGREGATION AND CAPS'),
      h('div', { class: 'm3-two' }, [
        rows3([
          row3('逐项合并（已计折扣）', fmt(r.benefit.rawMonthly) + ' 元/月'),
          row3('价值系数折算', '× ' + r.benefit.valueFactor, { i: '场景价值分级 ' + r.scene.value + '/5' }),
          row3('折算后', fmt(r.benefit.afterValue) + ' 元/月'),
          r.benefit.capMonthly != null
            ? row3('营收封顶线', fmt(r.benefit.capMonthly) + ' 元/月', { i: '年营收 6% 折月，' + (r.capped ? '本次已触顶' : '本次未触及') })
            : row3('营收封顶', '未启用', { i: '企业营业收入区间未知' }),
          row3('计列月度收益', fmt(r.benefit.fullMonthly) + ' 元/月', { sum: true, pos: true })
        ]),
        h('div', {}, [CH.capFunnel(r.benefit), cap3('两道护栏依次作用于合并后的月度收益。')])
      ]),
      r.benefit.levers.length ? h('div', {}, [
        hh3('折减前后对照', 'BEFORE AND AFTER DISCOUNT'),
        CH.leverBars(r.benefit.levers),
        cap3('上条为按企业填报参数直接测算的金额，下条为乘以折减系数后的计列金额。')
      ]) : null,
      basis3(RT().method.overlap),
      r.capped ? note3('封顶提示', '合并收益已触及营收封顶线，超出部分未予确认', '该护栏用于规避输入参数偏大时产生失真的测算结果。', true) : null
    ]);
  }

  function pGain2(r) {
    var p = page3(null, r, 'gain');
    return wrapPage(p, r, '04 收益测算', '04', '逐项测算过程', 'ITEM-LEVEL CALCULATION', null, null, [
      r.benefit.levers.length ? tbl3([['序'], ['效益杠杆'], ['测算式'], ['测算值', 'n'], ['合并权重', 'c'], ['计列值', 'n']],
        r.benefit.levers.map(function (lv) {
          return [[String(lv.rank), 'c'], [lv.name + (lv.cash ? '' : '（非现金）'), 'b'], [lv.basis],
            [fmt(lv.monthly), 'n'], [lv.discounted ? '35%' : '100%', 'c'],
            [fmt(lv.final), 'n b ' + (lv.cash ? 'pos' : '')]];
        })) : h('div', { class: 'm3-cap' }, ['本次无可测算的效益杠杆。']),
      r.benefit.levers.length ? h('div', {}, [
        hh3('测算式数值代入', 'WORKED CALCULATION'),
        CH.formulaFlow(r.benefit.levers),
        cap3('方块为代入的参数值，右端为该项的月度测算金额，末行标注科目性质与合并权重。')
      ]) : null,
      hh3('折减系数取值依据', 'DISCOUNT FACTORS'),
      r.benefit.levers.length ? h('div', {}, r.benefit.levers.map(function (lv) {
        return h('div', { class: 'm3-basis', style: 'margin-top:7px' }, [h('b', {}, [lv.name + '　']), lv.cutNote]);
      })) : null,
      hh3('参数取值与来源', 'PARAMETER VALUES'),
      tbl3([['参数项'], ['所属杠杆'], ['取值', 'n'], ['单位', 'c'], ['来源', 'c']],
        (function () {
          var out = [], seen = {};
          r.benefit.levers.forEach(function (lv) {
            var d = leverDef(lv.key); if (!d) return;
            d.fields.forEach(function (f) {
              if (seen[f.key]) return; seen[f.key] = 1;
              var v = M.gain[f.key];
              if (v == null) v = f.key === 'grossMargin' ? '按参考值' : '—';
              out.push([[f.label, 'b'], [d.name], [String(v), 'n'], [f.unit || '—', 'c'],
                [SRCNAME[r.inputSource[f.key]] || '参考值', 'c' + (r.inputSource[f.key] === 'user' ? ' pos' : '')]]);
            });
          });
          return out.length ? out : [[['—'], ['—'], ['—', 'n'], ['—', 'c'], ['—', 'c']]];
        })()),
      basis3('折减系数反映工具可影响的部分占该事项全量的比例，非效率提升幅度。各系数取值见附录 A 常量表。'),
      fn3('测算式中的参数值均为企业填报或按行业规模赋值的参考值，参考值逐项标注见第 08 章。')
    ]);
  }

  function pGain3(r) {
    var p = page3(null, r, 'gain');
    var cash = r.benefit.levers.filter(function (x) { return x.cash; });
    var hrs = r.benefit.levers.filter(function (x) { return !x.cash; });
    return wrapPage(p, r, '04 收益测算', '04', '现金与非现金科目划分', 'CASH VS NON-CASH', null, null, [
      CH.cashVsHours(r.benefit.cashMonthly, r.benefit.hoursMonthly),
      cap3('实心部分为现金科目，参与回收期测算；斜纹部分为非现金科目，单独列示。'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('现金科目', 'CASH ITEMS'), cash.length ? tbl3([['杠杆'], ['月度金额', 'n']],
          cash.map(function (x) { return [[x.name, 'b'], [fmt(x.final) + ' 元', 'n pos']]; })
            .concat([[['小计', 'b'], [fmt(r.benefit.cashMonthly) + ' 元', 'n b']]])) : h('div', { class: 'm3-cap' }, ['本次无现金科目效益。'])]),
        h('div', {}, [hh3('非现金科目', 'NON-CASH ITEMS'), hrs.length ? tbl3([['杠杆'], ['月度金额', 'n']],
          hrs.map(function (x) { return [[x.name, 'b'], [fmt(x.final) + ' 元', 'n']]; })
            .concat([[['小计', 'b'], [fmt(r.benefit.hoursMonthly) + ' 元', 'n b']]])) : h('div', { class: 'm3-cap' }, ['本次无非现金科目效益。'])])
      ]),
      hh3('两种口径的累计净额对照', 'DUAL BASIS COMPARISON'),
      CH.dualCurve(r.flow, r.flowAll, r.payback, r.paybackAll),
      cap3('实线为现金口径，虚线为并计非现金科目后的口径；空心点为各自的转正期次。'),
      note3('划分依据', '人工工时节约不构成可确认的现金流入', '该部分转化为现金流入的前提是释放工时被重新配置至产出性岗位。在未发生人员结构调整的情形下，工时节约表现为人员负荷下降而非成本下降，故不参与回收期测算。若企业已明确释放工时的再配置安排，可参考含非现金口径的转正期次。'),
      basis3('两种口径的回收期差异见第 05 章。决策建议以现金口径为准。')
    ]);
  }
  // ---------- 情景逐期流的本地复算（与内核 flowFor 同式，测试断言其 cum12 / cum24 一致） ----------
  function scenFlow(r, sc) {
    var cst = C(), once = r.invest.cashOnce, yr = r.invest.cashYearly;
    var rows = [], cum = 0, pay = null;
    for (var m = 1; m <= cst.horizonMonths; m++) {
      var bi = m <= cst.rampMonths.length ? cst.rampMonths[m - 1] : 1;
      var ben = Math.round(r.benefit.cashMonthly * bi * sc.benefitMul);
      var out = m === 1 ? Math.round((once + yr) * sc.costMul) : (m === 13 ? Math.round(yr * sc.costMul) : 0);
      cum += ben - out;
      rows.push({ m: m, benefit: ben, cost: out, net: ben - out, cum: cum });
      if (cum > 0 && pay === null) pay = m;
    }
    return { name: sc.name, rows: rows, payback: pay, cum12: rows[11].cum, cum24: rows[23].cum };
  }
  function fieldLabelMap() {
    var map = { revenueAnnual: '年度营业收入', grossMargin: '毛利率' };
    LV().items.forEach(function (it) { it.fields.forEach(function (f) { map[f.key] = f.label; }); });
    return map;
  }
  var SRCNAME = { user: '企业填报', profile: '画像推定', benchmark: '参考值', none: '缺口' };

  function pGain4(r) {
    var p = page3(null, r, 'gain');
    var list = secScenes().slice(0, 9).map(function (s) {
      return { id: s.id, name: s.name, weeks: s.weeks, value: s.value, cost: s.cost, levers: leversOf(s.id) };
    });
    if (!list.some(function (x) { return x.id === r.scene.id; })) {
      list[list.length - 1] = { id: r.scene.id, name: r.scene.name, weeks: r.scene.weeks, value: r.scene.value, cost: r.scene.cost, levers: r.levers };
    }
    var avgW = Math.round(list.reduce(function (a, b) { return a + b.weeks; }, 0) / list.length * 10) / 10;
    var avgV = Math.round(list.reduce(function (a, b) { return a + b.value; }, 0) / list.length * 10) / 10;
    var rank = list.slice().sort(function (a, b) { return b.value - a.value || a.weeks - b.weeks; })
      .map(function (x) { return x.id; }).indexOf(r.scene.id) + 1;
    return wrapPage(p, r, '04 收益测算', '04', '同业场景横向对照', 'PEER SCENARIO BENCHMARK', null, null, [
      basis3('对照样本取自本行业大类场景库所载条目，横向比较上线周期、价值分级与投入档位三项字段。该对照用于判断本次场景在同业场景中所处的位置，不参与任何金额计算。'),
      CH.peerBars(list, r.scene.id),
      cap3('横条长度为场景库所载基准上线周期，右侧方块数为价值分级。'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('对照结论', 'FINDINGS'), rows3([
          row3('样本场景数', list.length + ' 个', { i: '同行业大类' }),
          row3('本场景价值分级', r.scene.value + ' / 5', { i: '样本均值 ' + avgV }),
          row3('本场景上线周期', r.scene.weeks + ' 周', { i: '样本均值 ' + avgW + ' 周' }),
          row3('本场景命中杠杆', r.levers.length + ' 项', { i: r.levers.map(function (k) { var d = leverDef(k); return d ? d.name : k; }).join('、') }),
          row3('价值—周期综合位次', '第 ' + rank + ' 位', { sum: true, pos: rank <= 3 })
        ])]),
        h('div', {}, [hh3('位次解读', 'INTERPRETATION'), list3([
          r.scene.value >= avgV ? '本场景价值分级不低于样本均值，单位投入可承载的效益空间处于同业中上水平。' : '本场景价值分级低于样本均值，价值系数折算后的收益上限相应受限，测算已计入该折算。',
          r.scene.weeks <= avgW ? '本场景基准上线周期短于样本均值，效益进入满额释放的期次相对靠前。' : '本场景基准上线周期长于样本均值，过渡期占用的期次较多，回收期相应后移。',
          '价值分级与上线周期为场景库所载固定字段，不随企业填报参数变化；本页对照结论对全部同行业企业一致。'
        ])])
      ]),
      hh3('样本明细', 'SAMPLE DETAIL'),
      tbl3([['场景'], ['上线周期', 'c'], ['价值分级', 'c'], ['投入档位', 'c'], ['效益杠杆']],
        list.map(function (x) {
          var on = x.id === r.scene.id;
          return [[x.name + (on ? '（本次测算）' : ''), on ? 'b' : ''], [x.weeks + ' 周', 'c'],
            [x.value + '/5', 'c'], [x.cost, 'c'],
            [x.levers.map(function (k) { var d = leverDef(k); return d ? d.name : k; }).join('、')]];
        })),
      fn3('场景库条目按行业大类归集，同一大类下的企业共用同一份场景清单。上线周期为不含数据现状系数的基准值。')
    ]);
  }

  function pPay1(r) {
    var p = page3(null, r, 'pay');
    var pm = payMonth(r), f12 = r.flow.length ? r.flow[11].cum : 0, f24 = r.flow.length ? r.flow[23].cum : 0;
    var neg = r.flow.filter(function (x) { return x.cum < 0; }).length;
    return wrapPage(p, r, '05 回收期测算', '05', '回收期测算', 'PAYBACK PERIOD',
      pm == null ? '> ' + r.meta.horizon : '第 ' + pm, pm == null ? '期 · 期内未转正' : '期 · ' + payBasisLabel(r), [
      figs3([
        { k: '现金口径转正期次', v: r.payback == null ? '未转正' : '第 ' + r.payback + ' 期', s: '仅计现金科目', hl: true },
        { k: '含非现金口径', v: r.paybackAll == null ? '未转正' : '第 ' + r.paybackAll + ' 期', s: '并计人工工时节约' },
        { k: '首年累计净额', v: money(f12), u: '元', s: '第 12 期末', pos: f12 >= 0, neg: f12 < 0 },
        { k: '两年累计净额', v: money(f24), u: '元', s: '第 24 期末', pos: f24 >= 0, neg: f24 < 0 }
      ], 4),
      CH.paybackCurve(r.flow, r.payback),
      cap3('纵轴为累计净现金流，零轴以上为已回收。曲线在第 1 期与第 13 期因投入计列而出现台阶。'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('双口径对照', 'DUAL BASIS'), tbl3([['口径'], ['月度收益', 'n'], ['转正期次', 'c']], [
          [['现金口径', 'b'], [fmt(r.benefit.cashMonthly) + ' 元', 'n'], [r.payback == null ? '未转正' : '第 ' + r.payback + ' 期', 'c b']],
          [['含非现金口径'], [fmt(r.benefit.cashMonthly + r.benefit.hoursMonthly) + ' 元', 'n'], [r.paybackAll == null ? '未转正' : '第 ' + r.paybackAll + ' 期', 'c']]
        ]), cap3('结论与决策建议一律以现金口径为准。')]),
        h('div', {}, [hh3('投报率', 'RETURN ON INVESTMENT'), CH.roiTrack(r.roi)])
      ]),
      hh3('回收期的判读', 'HOW TO READ THE PAYBACK'),
      tbl3([['判读维度'], ['本次结论'], ['含义']], [
        [['期次口径', 'b'], ['第 ' + (r.payback == null ? '—' : r.payback) + ' 期（现金口径）'], ['累计净现金流由负转正的期次，不含非现金科目']],
        [['决策基准', 'b'], [r.scenarios[0].payback == null ? '保守档期内未转正' : '保守档第 ' + r.scenarios[0].payback + ' 期'], ['投资决策与预算审批以保守档为准，中性档用于进度跟踪']],
        [['次年现金负担', 'b'], [fmt(r.invest.cashYearly) + ' 元 / 年'], ['一次性支出不再发生，次年起仅计列订阅续费']],
        [['测算期末净额', 'b'], [fmt(r.flow[23].cum) + ' 元'], ['第 ' + r.meta.horizon + ' 期末的累计净现金流，超出测算期的效益不予确认']]
      ]),
      basis3(RT().method.payback),
      r.reCross ? note3('二次转正', '第 13 期年度续费计列后累计净额再次转负', '累计净额于第 ' + r.reCross + ' 期二次转正。年度订阅按整额计列而非月度摊销，故续费期次出现台阶属正常现象。', true)
        : (pm == null ? note3('测算提示', '本次参数下 ' + r.meta.horizon + ' 期内累计净现金流未转正', '现金口径未转正的常见成因为效益集中于人工工时节约，或另议项预算偏高。建议先补齐现金类效益参数后复核，具体见第 09 章。', true)
          : fn3('回收期为累计净现金流首次由负转正的期次，本次测算期内共 ' + neg + ' 期处于未回收状态。'))
    ]);
  }

  function pPay2(r) {
    var p = page3(null, r, 'pay');
    var tot = r.flow.reduce(function (a, b) { return a + b.benefit; }, 0);
    var totc = r.flow.reduce(function (a, b) { return a + b.cost; }, 0);
    return wrapPage(p, r, '05 回收期测算', '05', '24 期现金流分布', 'CASH FLOW DISTRIBUTION', null, null, [
      CH.cashflowBars(r.flow),
      cap3('零轴以上为当期收益，以下为当期支出。第 1 期含全部一次性支出与首年订阅费，第 13 期含年度续费。'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('期次特征', 'PERIOD PROFILE'), rows3([
          row3('支出发生期次', '第 1 期、第 13 期', { i: '共 2 期，其余各期无现金支出' }),
          row3('收益爬坡期次', '第 1 至第 ' + C().rampMonths.length + ' 期', { i: '按 ' + C().rampMonths.map(function (x) { return Math.round(x * 100) + '%'; }).join(' / ') + ' 逐期释放' }),
          row3('满额释放起始', '第 ' + (C().rampMonths.length + 1) + ' 期', { i: fmt(r.benefit.cashMonthly) + ' 元/期' }),
          row3('24 期收益合计', fmt(tot) + ' 元', { pos: true }),
          row3('24 期支出合计', '−' + fmt(totc) + ' 元', { neg: true }),
          row3('24 期净额', fmt(tot - totc) + ' 元', { sum: true, pos: tot - totc >= 0, neg: tot - totc < 0 })
        ])]),
        h('div', {}, [hh3('释放节奏', 'RAMP'), CH.rampSteps(C().rampMonths, r.benefit.cashMonthly),
          cap3('过渡期的收益折算比例，反映使用习惯养成与数据积累所需时间。')])
      ]),
      hh3('累计净额台阶', 'CUMULATIVE LADDER'),
      CH.monthLadder(r.flow, r.payback),
      basis3(RT().method.ramp)
    ]);
  }

  function pPay3(r) {
    var p = page3(null, r, 'pay');
    var rows = r.flow.slice(0, 12);
    return wrapPage(p, r, '05 回收期测算', '05', '前 12 期逐期明细', 'PERIOD LEDGER', null, null, [
      basis3('下表为现金口径的逐期明细。当期收益按满额月度收益乘以该期释放比例计列；当期支出仅在第 1 期与第 13 期发生。累计净额为逐期净额的连续加总。'),
      tbl3([['期次', 'c'], ['释放比例', 'c'], ['当期收益', 'n'], ['当期支出', 'n'], ['当期净额', 'n'], ['累计净额', 'n'], ['状态', 'c']],
        rows.map(function (x) {
          var pos = x.cum > 0;
          return [['第 ' + x.m + ' 期', 'c'], [Math.round(x.ramp * 100) + '%', 'c'],
            [fmt(x.benefit), 'n pos'], [x.cost ? '−' + fmt(x.cost) : '—', 'n' + (x.cost ? ' neg' : '')],
            [fmt(x.net), 'n' + (x.net >= 0 ? '' : ' neg')], [fmt(x.cum), 'n b' + (pos ? ' pos' : ' neg')],
            [pos ? '已回收' : '未回收', 'c' + (pos ? ' pos' : '')]];
        })),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('首年小结', 'YEAR ONE'), rows3([
          row3('首年收益合计', fmt(rows.reduce(function (a, b) { return a + b.benefit; }, 0)) + ' 元', { pos: true }),
          row3('首年支出合计', '−' + fmt(rows.reduce(function (a, b) { return a + b.cost; }, 0)) + ' 元', { neg: true }),
          row3('第 12 期末累计净额', fmt(rows[11].cum) + ' 元', { sum: true, pos: rows[11].cum >= 0, neg: rows[11].cum < 0 })
        ])]),
        h('div', {}, [hh3('读表说明', 'NOTES'), list3([
          '当期支出为整额计列，未作跨期摊销，故第 1 期净额为全期最低值。',
          '第 1 至第 ' + C().rampMonths.length + ' 期的当期收益低于满额值，差额来自释放比例而非参数变化。',
          '第 13 至第 24 期明细见附录 A。'
        ])])
      ]),
      hh3('首年回收进度', 'YEAR-ONE RECOVERY'),
      CH.recoveryShare(rows, r.invest.cashYear1),
      cap3('柱高为累计收益对首年现金支出的覆盖率，越过金色虚线即累计收益已等于首年现金支出。'),
      fn3('全部金额取整至元，逐期加总与合计值之间可能存在不超过 1 元的进位差异。')
    ]);
  }

  function pScen(r) {
    var p = page3(null, r, 'scen');
    var cons = r.scenarios[0], mid = r.scenarios[1], opt = r.scenarios[2];
    var span = (cons.payback == null || opt.payback == null) ? null : cons.payback - opt.payback;
    return wrapPage(p, r, '06 情景分析', '06', '三档情景分析', 'SCENARIO ANALYSIS',
      cons.payback == null ? '> ' + r.meta.horizon : '第 ' + cons.payback, '期 · 保守档转正', [
      basis3(RT().method.scenario),
      CH.scenarioBand(r.scenarios, r.meta.horizon),
      cap3('中性档为按企业填报参数直接计算的结果；决策建议以保守档为基准。'),
      hh3('三档参数与结果对照', 'PARAMETER COMPARISON'),
      tbl3([['情景'], ['收益系数', 'c'], ['投入系数', 'c'], ['月度收益', 'n'], ['首年现金支出', 'n'], ['转正期次', 'c'], ['首年投报率', 'n']],
        r.scenarios.map(function (s) {
          return [[s.name + '档', 'b'], ['×' + s.benefitMul, 'c'], ['×' + s.costMul, 'c'],
            [fmt(s.monthlyBenefit) + ' 元', 'n'], ['−' + fmt(s.cashYear1) + ' 元', 'n neg'],
            [s.payback == null ? '未转正' : '第 ' + s.payback + ' 期', 'c b'],
            [s.roi12 == null ? '—' : s.roi12 + '%', 'n']];
        })),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('结论区间', 'RANGE'), rows3([
          row3('保守档转正期次', cons.payback == null ? '期内未转正' : '第 ' + cons.payback + ' 期', { b: true }),
          row3('中性档转正期次', mid.payback == null ? '期内未转正' : '第 ' + mid.payback + ' 期'),
          row3('积极档转正期次', opt.payback == null ? '期内未转正' : '第 ' + opt.payback + ' 期'),
          row3('三档跨度', span == null ? '含未转正档，不作跨度比较' : span + ' 期', { sum: true })
        ])]),
        h('div', {}, [hh3('档位适用说明', 'APPLICABILITY'), list3([
          '保守档用于投资决策与预算审批，对应效益释放不及预期、投入超出预算的情形。',
          '中性档用于进度跟踪与效益复盘，对应按填报参数如实兑现的情形。',
          '积极档用于测算上限判断，不作为任何承诺的依据。'
        ])])
      ]),
      (r.scenarios[0].payback != null
        ? note3('决策提示', '保守档在测算期内可于第 ' + r.scenarios[0].payback + ' 期转正',
          '在收益仅兑现 ' + Math.round(r.scenarios[0].benefitMul * 100) + '%、投入超出预算 ' + Math.round((r.scenarios[0].costMul - 1) * 100) + '% 的不利组合下，本次投入仍可在测算期内收回。该结论对系数设定不敏感，可作为投资判断的下限依据。')
        : note3('决策提示', '保守档在测算期内未转正',
          '在不利系数组合下本次投入无法于 ' + r.meta.horizon + ' 期内收回。建议先压缩另议项预算或改选投入档位更低的场景，再行复核。', true)),
      fn3('三档共用同一组输入参数，仅调整收益折减与投入系数，故三档之间的差异全部来自系数设定。')
    ]);
  }

  function pScen2(r) {
    var p = page3(null, r, 'scen');
    var sets = r.scenarios.map(function (s) { return scenFlow(r, s); });
    return wrapPage(p, r, '06 情景分析', '06', '三档逐期对照', 'SCENARIO LEDGER', null, null, [
      CH.scenarioLines(sets, r.meta.horizon),
      cap3('三条曲线为三档的累计净现金流；空心点为各档转正期次。'),
      hh3('关键期次对照', 'KEY PERIODS'),
      tbl3([['期次', 'c'], ['保守档', 'n'], ['中性档', 'n'], ['积极档', 'n'], ['保守与积极差额', 'n']],
        [1, 3, 6, 12, 18, 24].map(function (m) {
          var a = sets[0].rows[m - 1].cum, b = sets[1].rows[m - 1].cum, c = sets[2].rows[m - 1].cum;
          return [['第 ' + m + ' 期', 'c'], [fmt(a), 'n' + (a >= 0 ? ' pos' : ' neg')],
            [fmt(b), 'n b' + (b >= 0 ? ' pos' : ' neg')], [fmt(c), 'n' + (c >= 0 ? ' pos' : ' neg')],
            [fmt(c - a), 'n']];
        })),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('区间解读', 'INTERPRETATION'), list3([
          '第 24 期末三档累计净额的极差为 ' + fmt(sets[2].cum24 - sets[0].cum24) + ' 元，该幅度即系数设定所能解释的全部不确定性。',
          '三档曲线在第 1 期与第 13 期同步出现台阶，说明投入的期次结构不随情景变化。',
          '若保守档在测算期内可转正，则该场景的投资判断对系数设定不敏感。'
        ])]),
        h('div', {}, [hh3('与敏感度分析的分工', 'SCOPE'), list3([
          '情景分析调整的是收益与投入的整体系数，回答的是总体偏差下结论是否成立。',
          '敏感度分析逐项扰动单个假设，回答的是哪一项假设对结论影响最大，见第 07 章。'
        ])])
      ]),
      fn3('本页曲线按与主口径相同的期次模型复算，第 12 期与第 24 期累计净额与第 06 章表列值一致。')
    ]);
  }

  function pSens(r) {
    var p = page3(null, r, 'sens');
    var base = payMonth(r);
    var sorted = r.sensitivity.slice().sort(function (a, b) { return b.spread - a.spread; });
    var top = sorted[0];
    return wrapPage(p, r, '07 敏感度分析', '07', '单因素敏感度分析', 'SENSITIVITY ANALYSIS',
      top ? String(top.spread) : '0', '期 · 最大影响幅度', [
      basis3(RT().method.sensitivity),
      CH.sensitivityRange(r.sensitivity, base, r.meta.horizon),
      cap3('横轴为转正期次，杠铃两端为该项假设上下扰动 20% 后的结果，虚线为中性档基准。'),
      hh3('逐项影响与解读', 'ITEM ANALYSIS'),
      tbl3([['假设项'], ['口径说明'], ['不利方向', 'c'], ['有利方向', 'c'], ['影响幅度', 'c']],
        sorted.map(function (it) {
          var lo = Math.max(it.low, it.high), hi = Math.min(it.low, it.high);
          return [[it.label, 'b'], [it.note], ['第 ' + lo + ' 期', 'c'], ['第 ' + hi + ' 期', 'c'],
            [it.spread + ' 期', 'c b' + (it.spread >= 3 ? ' neg' : '')]];
        })),
      top && top.spread > 0
        ? note3('主要不确定来源', '「' + top.label + '」对回收期的影响幅度居首，达 ' + top.spread + ' 期',
          '该项在上下 20% 的扰动区间内使转正期次在第 ' + Math.min(top.low, top.high) + ' 至第 ' + Math.max(top.low, top.high) + ' 期之间变动。建议在方案确认阶段优先锁定该项口径，其余各项的影响幅度均不超过 ' + (sorted[1] ? sorted[1].spread : 0) + ' 期。')
        : note3('敏感度结论', '各项假设的单因素扰动均未改变转正期次', '本次测算结论对五项关键假设的 20% 扰动不敏感，说明结论主要由收益与投入的量级差决定，而非由单项参数取值决定。'),
      fn3('敏感度分析采用单因素法，一次仅扰动一项假设，其余各项保持中性档取值，故各项影响幅度不可直接相加。')
    ]);
  }

  function pConf(r) {
    var p = page3(null, r, 'conf');
    var labels = fieldLabelMap();
    var entries = Object.keys(r.inputSource).map(function (k) { return { key: k, label: labels[k] || k, src: r.inputSource[k] }; });
    var nUser = entries.filter(function (e) { return e.src === 'user'; }).length;
    var nRef = entries.length - nUser;
    return wrapPage(p, r, '08 参数来源与可信度', '08', '参数来源与可信度', 'INPUT PROVENANCE',
      String(r.confidence.score), '分 · ' + r.confidence.name, [
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('可信度评分', 'CONFIDENCE'), CH.confidenceBar(r.confidence.score),
          cap3(r.confidence.desc)]),
        h('div', {}, [hh3('来源结构', 'PROVENANCE'), rows3([
          row3('参与测算的参数项', entries.length + ' 项'),
          row3('企业填报', nUser + ' 项', { pos: true }),
          row3('画像推定与参考值', nRef + ' 项', { i: nRef ? '正文逐处标注' : '本次无' }),
          row3('可信度评分', r.confidence.score + ' 分', { sum: true })
        ])])
      ]),
      hh3('逐项参数来源', 'ITEM PROVENANCE'),
      CH.sourceGrid(entries),
      tbl3([['参数项'], ['来源', 'c'], ['对测算结论的作用'], ['复核建议']],
        entries.map(function (e) {
          var eff = e.key.indexOf('ops') === 0 ? '构成人工工时节约的测算基数'
            : e.key.indexOf('error') === 0 ? '构成差错与返工损失下降的测算基数'
              : e.key === 'revenueAnnual' ? '决定营收封顶线的取值'
                : e.key === 'grossMargin' ? '决定营收类效益的折算比例' : '构成对应效益杠杆的测算基数';
          return [[e.label, 'b'], [SRCNAME[e.src] || e.src, 'c' + (e.src === 'user' ? ' pos' : '')], [eff],
            [e.src === 'user' ? '无需复核' : '建议以企业实际数据替换后复核']];
        })),
      basis3('可信度评分自 100 分起算，按各项参数的来源逐项扣减：采用画像推定扣 ' + C().confidence.penalty.profile + ' 分，采用参考值或未填报扣 ' + C().confidence.penalty['default'] + ' 分，未填报另议项预算扣 ' + C().confidence.penalty.noCustomBudget + ' 分，未指定具体场景扣 ' + C().confidence.penalty.genericScene + ' 分。'),
      fn3('参考值取值全表见附录 C。参考值为按行业与企业规模赋值的常见区间，非统计调查数据。')
    ]);
  }

  function pMissing(r) {
    var p = page3(null, r, 'conf');
    var labels = fieldLabelMap();
    var items = (r.missing || []).map(function (m) {
      return { label: labels[m.field] || m.label || m.field, impact: m.impact || 'mid', fix: m.how || m.fix || '补齐后重新测算' };
    });
    return wrapPage(p, r, '09 数据缺口与补齐建议', '09', '数据缺口与补齐建议', 'DATA GAPS',
      String(items.length), '项 · 待补齐参数', [
      basis3('数据缺口指效益杠杆所需、但本次未取得企业实际数值的参数。核心效益参数不设默认值：缺失时在报告中明示测算受限，不代为赋值，以免测算结论建立在虚构基数之上。'),
      CH.gapImpact(items),
      items.length ? h('div', {}, [
        hh3('缺口清单与补齐路径', 'GAP LIST'),
        tbl3([['缺口参数'], ['所属效益杠杆'], ['影响程度', 'c'], ['补齐路径'], ['补齐后的测算变化']],
          items.map(function (x, i) {
            return [[x.label, 'b'], [(r.missing[i] && r.missing[i].lever) || '—'],
              [x.impact === 'high' ? '高' : x.impact === 'low' ? '低' : '中', 'c'],
              [x.fix], ['该杠杆由不可测算转为可测算，月度收益与回收期同步更新']];
          }))
      ]) : h('div', {}, [
        hh3('补齐状态', 'STATUS'),
        note3('缺口核查', '本次测算所需的效益参数均已取得', '全部效益杠杆的测算基数均由企业填报或按画像推定，无待补齐项。测算结论可直接用于投资决策讨论。'),
        hh3('后续复核要点', 'FOLLOW-UP'),
        list3([
          '另议项预算' + (r.plan.customBudget ? '已按 ' + fmt(r.plan.customBudget) + ' 元计列，方案报价确定后建议以实际金额复核。' : '本次未计列，如涉及系统对接或定制开发，需补充预算后复核。'),
          '试运行满三个月后，建议以实测效果替换折减系数，该项替换对测算精度的提升幅度最大。',
          '经营规模或业务结构发生较大变化时，收益基数随之变化，原测算基础不再成立。'
        ])
      ]),
      hh3('可信度的补齐路径', 'PATH TO FULL CONFIDENCE'),
      CH.readinessLadder([
        { name: '本次测算', score: r.confidence.score, note: r.confidence.name },
        { name: '参考值替换后', score: Math.min(100, r.confidence.score + (Object.keys(r.inputSource).filter(function (k) { return r.inputSource[k] !== 'user'; }).length * C().confidence.penalty.profile)), note: '以企业实际数据替换' },
        { name: '试运行三期后', score: 100, note: '以实测效果替换折减系数' }
      ]),
      cap3('评分为按参数来源加权的测算结果，第三级以实测效能数据替换折减系数后达成。'),
      r.insufficient ? note3('测算受限', '效益侧关键参数缺失，本次仅出具投入侧测算', '在缺口补齐前，报告不给出回收期结论。投入侧科目与金额不受影响，可直接用于预算编制。', true) : null,
      hh3('参数完整度核查', 'COMPLETENESS CHECK'),
      tbl3([['核查项'], ['状态', 'c'], ['说明']], [
        [['效益杠杆测算基数', 'b'], [r.insufficient ? '缺失' : '齐备', 'c ' + (r.insufficient ? 'neg' : 'pos')],
          [r.insufficient ? '效益侧关键参数未取得，回收期不予出具' : '全部命中杠杆的测算基数均已取得']],
        [['另议项预算', 'b'], [r.plan.customBudget ? '已计列' : '未计列', 'c ' + (r.plan.customBudget ? 'pos' : '')],
          [r.plan.customBudget ? '按 ' + fmt(r.plan.customBudget) + ' 元计列，方案报价确定后复核' : '如涉及系统对接或定制开发，需补充预算后复核']],
        [['营业收入区间', 'b'], [r.revenueAnnual ? '已取得' : '未取得', 'c ' + (r.revenueAnnual ? 'pos' : '')],
          [r.revenueAnnual ? '营收封顶线按年营收 6% 折月计列' : '营收封顶护栏本次未启用']],
        [['场景指定', 'b'], [r.sceneBasis === 'library' ? '已指定' : '通用口径', 'c ' + (r.sceneBasis === 'library' ? 'pos' : '')],
          [r.sceneBasis === 'library' ? '按场景库条目测算，效益杠杆由场景决定' : '未指定具体场景，按通用轻量口径测算']]
      ]),
      fn3('影响程度按该参数对回收期的期次变动幅度划分：高为 3 期以上，中为 1 至 3 期，低为 1 期以内。')
    ]);
  }

  function pRamp(r) {
    var p = page3(null, r, 'plan');
    var iv = r.invest, w = iv.setupWeeks;
    var phases = [
      { name: '诊断与确认', weeks: Math.round(w * 0.15 * 10) / 10, duty: '确认场景边界、业务规则与验收标准' },
      { name: '数据准备', weeks: Math.round(w * 0.30 * 10) / 10, duty: '导出基础数据、统一字段口径、完成必要的电子化整理' },
      { name: '配置上线', weeks: Math.round(w * 0.35 * 10) / 10, duty: '完成账号开通、规则配置、系统对接与使用培训' },
      { name: '试运行', weeks: Math.round(w * 0.20 * 10) / 10, duty: '并行运行、问题响应与效益数据采集' }
    ];
    var dsName = { paper: '纸质为主', scattered: '分散在各处', excel: '表格管理', system: '已有系统' };
    return wrapPage(p, r, '10 实施周期与效益释放', '10', '实施周期与效益释放', 'IMPLEMENTATION',
      w + '', '周 · 测算上线周期', [
      basis3('上线周期以场景库所载基准周期 ' + r.scene.weeks + ' 周为基数，乘以按数据现状取值的倍率 ' + iv.dataStateMult + '（当前为「' + (dsName[r.plan.dataState] || r.plan.dataState) + '」）得出，合计 ' + w + ' 周。阶段划分按四段式推进，各阶段占比为固定经验值。'),
      CH.weeksGantt(phases, w),
      cap3('阶段按顺序推进，不含企业内部审批与预算流程所需时间。'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('阶段职责', 'PHASE DUTIES'), tbl3([['阶段'], ['周期', 'c'], ['主要工作']],
          phases.map(function (x) { return [[x.name, 'b'], [x.weeks + ' 周', 'c'], [x.duty]]; }))]),
        h('div', {}, [hh3('效益释放节奏', 'BENEFIT RAMP'), CH.rampSteps(C().rampMonths, r.benefit.cashMonthly),
          cap3('释放比例自上线当月起计，与上线周期不重叠计算。')])
      ]),
      hh3('前置条件', 'PRECONDITIONS'),
      tbl3([['事项'], ['内容'], ['未满足的后果']], [
        [['数据依赖', 'b'], [(r.scene.dataDeps || []).length ? r.scene.dataDeps.map(function (x) { return sh.optText('systems', x) || x; }).join('、') : '无特定系统依赖'],
          ['需以人工方式补足数据来源，数据准备阶段延长']],
        [['第一步动作', 'b'], [r.scene.firstStep || '—'], ['缺少基线数据，效益无法在试运行期核验']],
        [['实施前置条件', 'b'], [r.scene.precondition || '无'], ['上线周期延长，效益释放相应后移']]
      ]),
      basis3(RT().method.ramp),
      fn3('数据现状倍率取值见附录 C。倍率作用于场景库所载基准周期，不作用于效益释放比例。')
    ]);
  }

  function pRoles(r) {
    var p = page3(null, r, 'plan');
    return wrapPage(p, r, '11 组织保障与职责分工', '11', '组织保障与职责分工', 'GOVERNANCE', null, null, [
      basis3(RT().roles.lead),
      CH.roleMatrix(r.roles),
      cap3('矩阵按实施阶段列示各角色的参与程度，右列为该角色的时间投入测算值。'),
      hh3('角色职责界定', 'ROLE DEFINITION'),
      tbl3([['角色'], ['建议人选'], ['职责边界'], ['时间投入', 'c']],
        r.roles.map(function (x) { return [[x.name, 'b'], [x.who], [x.duty], [x.time, 'c']]; })),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('时间投入测算', 'TIME BUDGET'), rows3([
          row3('上线期内部工时', r.invest.setupHours + ' 小时', { i: r.plan.setupPeople + ' 人 × ' + r.invest.setupWeeks + ' 周 × 每天 2 小时' }),
          row3('折合用工成本', fmt(r.invest.laborItems[0].amount) + ' 元', { i: '综合时薪 ' + r.invest.setupHourly + ' 元' }),
          row3('运行期月度工时成本', fmt(r.invest.runLaborMonthly) + ' 元/月'),
          row3('首年内部工时合计', fmt(r.invest.laborYear1) + ' 元', { sum: true })
        ]), cap3('内部工时单列为非现金科目，不计入回收期测算。')]),
        h('div', {}, [hh3('角色缺位的后果', 'RISK'), list3([
          '项目负责人缺位：预算与验收标准无人审定，实施推进缺乏跨部门协调，上线周期普遍延长。',
          '业务对接人缺位：业务规则与流程口径无法确认，配置结果与实际作业脱节，效益释放比例低于测算值。',
          '数据对接人缺位：基础数据导出与字段口径确认无人承接，数据准备阶段的周期将显著超出测算值。'
        ])])
      ]),
      fn3('时间投入为按本次场景与数据现状测算的参考值，实际投入随企业内部流程与人员熟练度变化。')
    ]);
  }

  function pServices(r) {
    var p = page3(null, r, 'plan');
    var pr = C().prices, iv = r.invest;
    var pd = pr.privateDeploy;
    return wrapPage(p, r, '12 服务与报价口径', '12', '服务与报价口径', 'PRICING', null, null, [
      basis3('全部价格取自《薯片AI智能体》定稿产品资料，未作调整。订阅类按套年计价，诊断类按日计价，另议项按方案报价。'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('订阅档位', 'SUBSCRIPTION TIERS'), CH.priceLadder(pr.subscription, r.plan.tier),
          cap3('本次按' + iv.tierName + ' ' + iv.seats + ' 套计列，首年订阅费 ' + fmt(iv.cashItems[0].amount) + ' 元。')]),
        h('div', {}, [hh3('本次计列项目', 'ITEMS INCLUDED'), tbl3([['项目'], ['计价口径'], ['金额', 'n']],
          iv.cashItems.map(function (x) { return [[x.name, 'b'], [x.detail], [fmt(x.amount) + ' 元', 'n']]; })
            .concat([[['首年合计', 'b'], ['—'], [fmt(iv.cashYear1) + ' 元', 'n b']]]))])
      ]),
      hh3('档位对照', 'TIER COMPARISON'),
      tbl3([['档位'], ['单套年费', 'n'], ['计价说明'], ['本次', 'c']],
        pr.subscription.map(function (t) {
          var on = t.key === r.plan.tier;
          return [[t.name, on ? 'b' : ''], [t.yearly ? fmt(t.yearly) + ' 元 / 套年' : '0 元', 'n'], [t.desc],
            [on ? '已计列' : '—', 'c' + (on ? ' pos' : '')]];
        })),
      hh3('可选服务', 'OPTIONAL SERVICES'),
      tbl3([['服务'], ['价格', 'c'], ['服务内容']],
        RT().services.map(function (s) { return [[s.name, 'b'], [s.price, 'c'], [s.desc]]; })),
      fn3('私域部署价格口径为「' + pd[0].yearly + ' 元起 / 套年」，区间 ' + pd[0].yearly + ' 至 ' + pd[1].yearly + ' 元 / 套年。本次测算' + (r.plan.privateDeploy ? '按该区间端点计列' : '未计列私域部署') + '。另议项以实际方案报价为准，本报告按企业填报预算计列。')
    ]);
  }

  function pRetrigger(r) {
    var p = page3(null, r, 'conf');
    return wrapPage(p, r, '13 测算复核触发条件', '13', '测算复核触发条件', 'RE-CALCULATION TRIGGERS',
      String(r.retrigger.length), '项 · 触发情形', [
      basis3(RT().retrigger.lead),
      CH.triggerMap(r.retrigger),
      cap3('左列为触发情形，右列为该情形对测算结论的作用方向。'),
      hh3('触发情形与影响机理', 'TRIGGER MECHANISM'),
      tbl3([['序', 'c'], ['触发情形'], ['影响机理']],
        r.retrigger.map(function (x, i) { return [[String(i + 1).padStart(2, '0'), 'c'], [x.when, 'b'], [x.why]]; })),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('复核成本', 'RE-RUN COST'), rows3([
          row3('单次复核用时', '约 10 分钟', { i: '仅需更新变动参数' }),
          row3('复核所需材料', '变动参数的实际数值'),
          row3('复核输出', '完整报告一份', { i: '含更新后的回收期与情景区间' }),
          row3('建议复核频次', '每季度一次或触发时', { sum: true })
        ])]),
        h('div', {}, [hh3('不需复核的情形', 'NO RE-RUN NEEDED'), list3([
          '订阅套数在同一档位内小幅调整：该项的敏感度影响幅度为' + (r.sensitivity.filter(function (x) { return x.key === 'seats'; })[0] || { spread: 0 }).spread + ' 期。',
          '上线时点推迟：期次自上线当月起计，推迟不改变各期的相对关系。',
          '人员轮岗但编制不变：人工工时节约的测算基数为人数与时长，与具体人选无关。'
        ])])
      ]),
      fn3('复核与本次测算共用同一套模型与常量，故复核结果与本次结论可直接比较。')
    ]);
  }

  function pAppA(r) {
    var p = page3(null, r, 'app');
    var w = C().work, cp = C().caps;
    return wrapPage(p, r, '附录 A 测算常量与公式', 'A', '测算常量与公式', 'CONSTANTS AND FORMULAE', null, null, [
      hh3('测算常量', 'CONSTANTS'),
      tbl3([['常量'], ['取值', 'c'], ['作用']], [
        [['月计薪天数', 'b'], [w.daysPerMonth + ' 天', 'c'], ['将月薪折算为日薪与时薪']],
        [['日工作小时', 'b'], [w.hoursPerDay + ' 小时', 'c'], ['将日薪折算为时薪']],
        [['综合用工系数', 'b'], ['×' + w.laborBurden, 'c'], [w.laborBurdenNote]],
        [['测算期', 'b'], [C().horizonMonths + ' 期', 'c'], ['自上线当月起计的月度序号上限']],
        [['效益释放比例', 'b'], [C().rampMonths.map(function (x) { return Math.round(x * 100) + '%'; }).join(' / '), 'c'], ['第 1 至第 3 期的收益折算比例，第 4 期起按满额计列']],
        [['重叠折减系数', 'b'], [Math.round(C().overlapDiscount * 100) + '%', 'c'], ['多杠杆命中时，金额最高项以外各项的计列比例']],
        [['营收封顶比例', 'b'], [Math.round(cp.revenueShare * 100) + '%', 'c'], ['单一场景年化收益上限占年度营业收入的比例']],
        [['价值系数', 'b'], [Object.keys(cp.valueFactor).map(function (k) { return k + '级 ' + cp.valueFactor[k]; }).join('　'), 'c'], ['按场景价值分级对合并收益折算一次']]
      ]),
      hh3('效益杠杆公式', 'LEVER FORMULAE'),
      tbl3([['效益杠杆'], ['折算公式'], ['折减系数', 'c'], ['科目', 'c']],
        LV().items.map(function (it) {
          return [[it.name, 'b'], [it.formula], [Math.round(it.cut * 100) + '%', 'c'],
            [it.cash ? '现金' : '非现金', 'c' + (it.cash ? ' pos' : '')]];
        })),
      hh3('复算校验', 'VERIFICATION'),
      rows3([
        row3('月度现金收益', fmt(r.benefit.cashMonthly) + ' 元', { i: '逐项合并 ' + fmt(r.benefit.rawMonthly) + ' × 价值系数 ' + r.benefit.valueFactor + ' 后取现金科目' }),
        row3('首年现金支出', fmt(r.invest.cashYear1) + ' 元', { i: '一次性 ' + fmt(r.invest.cashOnce) + ' + 年度订阅 ' + fmt(r.invest.cashYearly) }),
        row3('第 1 期净额', fmt(r.flow[0].net) + ' 元', { i: '收益 ' + fmt(r.flow[0].benefit) + ' − 支出 ' + fmt(r.flow[0].cost) }),
        row3('转正期次', r.payback == null ? '期内未转正' : '第 ' + r.payback + ' 期', { sum: true })
      ]),
      basis3('本报告全部测算结果均可由上述常量与公式，结合正文列示的输入参数复算得出。模型不含随机成分，同一组输入必然得到同一组输出。'),
      fn3('折减系数为工具可影响的部分占该事项全量的比例，非效率提升幅度。各系数的取值依据见第 04 章。')
    ]);
  }

  function pAppB(r) {
    var p = page3(null, r, 'app');
    var a = r.flow.slice(0, 12), b = r.flow.slice(12);
    var col = function (rows) {
      return tbl3([['期次', 'c'], ['收益', 'n'], ['支出', 'n'], ['净额', 'n'], ['累计', 'n']],
        rows.map(function (x) {
          return [[String(x.m), 'c'], [fmt(x.benefit), 'n'], [x.cost ? '−' + fmt(x.cost) : '—', 'n' + (x.cost ? ' neg' : '')],
            [fmt(x.net), 'n' + (x.net >= 0 ? '' : ' neg')], [fmt(x.cum), 'n b' + (x.cum > 0 ? ' pos' : ' neg')]];
        }), 'sm');
    };
    return wrapPage(p, r, '附录 A 测算常量与公式', 'A', '24 期逐期明细', 'FULL LEDGER', null, null, [
      basis3('下表为现金口径的完整逐期明细，单位为元。左表为第 1 至第 12 期，右表为第 13 至第 24 期。'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('第 1 至第 12 期', 'PERIOD 1–12'), col(a)]),
        h('div', {}, [hh3('第 13 至第 24 期', 'PERIOD 13–24'), col(b)])
      ]),
      rows3([
        row3('24 期收益合计', fmt(r.flow.reduce(function (x, y) { return x + y.benefit; }, 0)) + ' 元', { pos: true }),
        row3('24 期支出合计', '−' + fmt(r.flow.reduce(function (x, y) { return x + y.cost; }, 0)) + ' 元', { neg: true }),
        row3('第 24 期末累计净额', fmt(r.flow[23].cum) + ' 元', { sum: true, pos: r.flow[23].cum >= 0, neg: r.flow[23].cum < 0 })
      ]),
      hh3('含非现金口径的累计净额', 'INCLUDING NON-CASH'),
      CH.monthLadder(r.flowAll, r.paybackAll),
      cap3('该口径并计人工工时节约折算金额，仅作参照，不用于回收期结论。'),
      fn3('金额取整至元。第 13 期支出为年度订阅续费，其余各期无现金支出。')
    ]);
  }

  function pAppC(r) {
    var p = page3(null, r, 'app');
    var mk = RT().method;
    return wrapPage(p, r, '附录 B 方法与术语', 'B', '测算方法与术语', 'METHOD AND GLOSSARY', null, null, [
      hh3(mk.title, 'METHODOLOGY'),
      tbl3([['环节'], ['方法说明']], [
        [['模型结构', 'b'], [mk.model]],
        [['投入计列', 'b'], [mk.timing]],
        [['效益释放', 'b'], [mk.ramp]],
        [['回收期', 'b'], [mk.payback]],
        [['多杠杆合并', 'b'], [mk.overlap]],
        [['两道护栏', 'b'], [mk.cap]],
        [['情景分析', 'b'], [mk.scenario]],
        [['敏感度分析', 'b'], [mk.sensitivity]]
      ]),
      hh3('术语释义', 'GLOSSARY'),
      tbl3([['术语'], ['释义']], RT().glossary.map(function (g) { return [[g.t, 'b'], [g.d]]; })),
      basis3(RT().honesty.lead)
    ]);
  }

  function pAppD(r) {
    var p = page3(null, r, 'app');
    var sc = r.scene, bm = DATA.m3.benchmarks;
    var bmRows = [];
    ['opsSalary', 'grossMargin', 'setupWeeksBuffer'].forEach(function (k) {
      var b = bm[k]; if (!b) return;
      bmRows.push([[b.label, 'b'], [b.by], [Object.keys(b.values).map(function (x) { return x + '：' + b.values[x]; }).join('　')], [String(b.fallback), 'c']]);
    });
    return wrapPage(p, r, '附录 C 场景基础数据', 'C', '场景基础数据与参考值', 'SOURCE DATA', null, null, [
      basis3('本页列示场景库所载原始字段与参考值全表，供口径追溯与复核之用。场景库字段对同行业大类的全部企业一致，不随企业填报参数变化。'),
      hh3('场景库字段', 'SCENARIO RECORD'),
      tbl3([['字段'], ['取值']], [
        [['场景编号', 'b'], [sc.id]],
        [['场景名称', 'b'], [sc.name]],
        [['所属环节', 'b'], [sc.stage || '—']],
        [['使用角色', 'b'], [sc.user || '—']],
        [['替代事项', 'b'], [sc.replaces || '—']],
        [['对应产品模块', 'b'], [sc.module]],
        [['预期指标', 'b'], [(sc.metric || '—') + '（区间表述，未参与金额计算）']],
        [['折算口径', 'b'], [sc.roiBasis || '—']],
        [['基准上线周期', 'b'], [sc.weeks + ' 周']],
        [['投入档位', 'b'], [sc.cost + ' 档']],
        [['价值分级', 'b'], [sc.value + ' / 5']],
        [['数据依赖', 'b'], [(sc.dataDeps || []).length ? sc.dataDeps.join('、') : '无']],
        [['第一步动作', 'b'], [sc.firstStep || '—']],
        [['实施前置条件', 'b'], [sc.precondition || '—']]
      ]),
      hh3('参考值全表', 'REFERENCE VALUES'),
      tbl3([['参考值'], ['取值依据'], ['分档取值'], ['缺省值', 'c']], bmRows),
      fn3(bm.disclosure)
    ]);
  }

  function pEnd(r) {
    var p = h('section', { class: 'page m3-end' });
    var c = RT().contact;
    p.appendChild(h('img', { src: sh.CFG.logo, alt: '顶呱呱' }));
    p.appendChild(h('div', { class: 'slogan' }, [c.slogan]));
    p.appendChild(h('div', { class: 'contact' }, [c.company, h('br', {}), c.booth, h('br', {})].concat(
      c.lines.map(function (l) { return h('div', {}, [l]); }))));
    p.appendChild(h('div', { class: 'rule' }));
    p.appendChild(h('div', { class: 'disc' }, [RT().closing]));
    return p;
  }

  window.__M3_REPORT_PAGES = function () { return M.pages.length; };
  // 量高脚本专用：跳过输入流程直接进报告，只为验证版式分页
  window.__M3_INJECT = function (inp, out) {
    M.form = inp.profile; M.plan = inp.plan; M.gain = inp.gain || {}; M.result = out; setStep('report');
  };
})();
