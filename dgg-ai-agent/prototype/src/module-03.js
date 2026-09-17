/* 模块 3 · 企业AI投入ROI测算器
 * 屏 1 企业与场景 → 屏 2 投入方案 → 屏 3 收益端（按杠杆动态展开）→ 屏 4 测算台 → 屏 5 报告 28 页
 * 版式：账页标尺（竖脊 + 账行 + 金额栏对齐），暖墨 + 铜金
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, CH;
  var core = window.DGG.coreM3;
  var M = { step: 'input', form: null, plan: null, gain: null, result: null, pages: [], llmState: 'none' };

  function bundle() {
    return { fields: DATA.fields, industries: DATA.industries, sectors: DATA.m3.sectors,
      constants: DATA.m3.constants, levers: DATA.m3.levers, sceneLevers: DATA.m3.sceneLevers,
      benchmarks: DATA.m3.benchmarks, reportText: DATA.m3.reportText,
      credits: DATA.credits, lintWords: DATA.lintWords, promptTemplate: DATA.m3.promptTemplate };
  }
  function RT() { return DATA.m3.reportText; }
  function C() { return DATA.m3.constants; }
  function LV() { return DATA.m3.levers; }
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
  function onCompany(c) { M.form = c ? fromProfile(c) : emptyForm(); M.result = null; if (M.step !== 'input') setStep('input'); else draw(); }
  function onIndustry(slug) { if (slug && M.form.industry !== slug) { M.form.industry = slug; M.plan.sceneId = null; M.result = null; if (M.step === 'input') draw(); else setStep('input'); } }
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
      h('h2', { class: 'm3-h2' }, ['先确认是哪家公司、算哪个场景']),
      h('p', { class: 'm3-p' }, ['企业信息与首选场景通常由前两个模块带过来。没有也可以在这里直接挑一个。']),
      h('div', { class: 'm3-co' }, [
        h('div', { class: 'nm' }, [M.form.name || '未填写企业名称']),
        h('div', { class: 'tg' }, [sh.industryNameOf(M.form.industry) || '—',
          M.form.size ? ' · ' + sh.optText('size', M.form.size) : '',
          M.form.revenue ? ' · 年营收 ' + sh.optText('revenue', M.form.revenue) : ''])
      ]),
      h('h3', { class: 'm3-h3' }, ['本行业的 ' + list.length + ' 个场景，挑一个来算']),
      h('div', { class: 'm3-scenes' }, list.map(function (s) {
        var lv = leversOf(s.id).map(function (k) { var d = leverDef(k); return d ? d.name : k; });
        return h('button', { class: 'sc' + (cur === s.id ? ' on' : ''), onclick: function () { M.plan.sceneId = s.id; M.gain = {}; draw(); } }, [
          h('div', { class: 'n' }, [s.name]),
          h('div', { class: 'm' }, [s.stage + ' · ' + s.module + ' · 上线约 ' + s.weeks + ' 周 · 投入 ' + s.cost + '档']),
          h('div', { class: 'l' }, lv.map(function (x) { return h('span', {}, [x]); }))
        ]);
      })),
      h('div', { class: 'm3-act' }, [
        h('button', { class: 'btn ghost', onclick: function () { M.plan.sceneId = null; M.gain = {}; setStep('plan'); } }, ['说不准，按通用口径算']),
        h('button', { class: 'btn', disabled: !cur, onclick: function () { setStep('plan'); } }, ['下一步：投入方案'])
      ])
    ]));
  }

  function screenPlan() {
    var P = C().prices, sc = M.plan.sceneId ? sceneById(M.plan.sceneId) : null;
    $root.appendChild(h('div', { class: 'm3-pane' }, [
      steps(2),
      h('h2', { class: 'm3-h2' }, ['第一笔账：要投多少']),
      h('p', { class: 'm3-p' }, ['价格按定稿宣传单直接列，不估不猜。另议项填个大概就行，后面能看到它对回本期的影响。']),
      field('订阅版本', '按套年计价', opts(P.subscription.map(function (t) {
        return { v: t.key, t: t.name, s: t.yearly ? t.yearly + ' 元 / 套年' : '0 元开通' };
      }), M.plan.tier, function (v) { M.plan.tier = v; })),
      numRow('几个人要用', '按套算', M.plan.seats, '套', [1, 2, 3, 5], function (v) { M.plan.seats = v || 1; }),
      field('专家入企 AI 诊断', P.diagnosisPerDay + ' 元 / 天', opts([
        { v: 0, t: '暂不安排', s: '0 元' }, { v: 1, t: '1 天', s: P.diagnosisPerDay + ' 元' }, { v: 2, t: '2 天', s: P.diagnosisPerDay * 2 + ' 元' }
      ], M.plan.diagnosisDays, function (v) { M.plan.diagnosisDays = v; })),
      field('私域部署', '数据不出域时才需要', opts([{ v: null, t: '不需要', s: '—' }].concat(P.privateDeploy.map(function (x) {
        return { v: x.key, t: x.name, s: x.yearly + ' 元 / 套年' };
      })), M.plan.privateDeploy == null ? null : M.plan.privateDeploy, function (v) { if (v == null) delete M.plan.privateDeploy; else M.plan.privateDeploy = v; })),
      numRow('另议项预算', '系统对接 / 定制 / 陪跑', M.plan.customBudget, '元', [0, 20000, 60000, 150000], function (v) { M.plan.customBudget = v == null ? 0 : v; }),
      sc && sc.cost !== '零' && sc.cost !== '轻' && !M.plan.customBudget
        ? h('div', { class: 'm3-warn' }, ['这个场景是「' + sc.cost + '」投入档，多半要做系统对接。另议项留 0 会让回本期显得偏短，测算里会扣可信度。'])
        : null,
      h('h3', { class: 'm3-h3' }, ['上线期公司这边的投入']),
      field('数据现状', '决定整理工作量', opts([
        { v: 'paper', t: '纸质为主', s: '倍率 1.6' }, { v: 'excel', t: '表格为主', s: '1.15' },
        { v: 'scattered', t: '散在多个系统', s: '1.3' }, { v: 'system', t: '系统里齐全', s: '1.0' }
      ], M.plan.dataState, function (v) { M.plan.dataState = v; })),
      numRow('几个人跟这件事', '', M.plan.setupPeople, '人', [1, 2, 3], function (v) { M.plan.setupPeople = v || 1; }),
      numRow('他们平均月薪', '折算工时用', M.plan.setupSalary, '元/月', [5500, 7500, 11000, 16000], function (v) { M.plan.setupSalary = v || 7500; }),
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
          return numRow(f.label, '', M.gain[f.key] == null ? null : M.gain[f.key], f.unit, f.presets, function (v) {
            if (v == null) delete M.gain[f.key]; else M.gain[f.key] = v;
          });
        })),
        d.cash ? null : h('div', { class: 'm3-hint' }, ['这一条省的是时间不是现金。报告里会单列一栏，不计入现金口径的回收期。'])
      ]);
    }).filter(Boolean);
    $root.appendChild(h('div', { class: 'm3-pane' }, [
      steps(3),
      h('h2', { class: 'm3-h2' }, ['第二笔账：能收回多少']),
      h('p', { class: 'm3-p' }, [sc ? '「' + sc.name + '」的收益按 ' + sc.roiBasis + '。下面只问用得上的那几个数。' : '按通用轻量场景口径，只问省下的工时。']),
      h('div', {}, blocks),
      h('div', { class: 'm3-hint' }, ['填不上的可以空着——空着的那一条不会被算进去，报告里会写明缺什么。这里不会替你填一个数。']),
      h('div', { class: 'm3-act' }, [
        h('button', { class: 'btn ghost', onclick: function () { setStep('plan'); } }, ['上一步']),
        h('button', { class: 'btn', onclick: function () { var r = recompute(); if (r.ok) { sh.charge('企业AI投入ROI测算器'); setStep('board'); } } }, ['算这笔账'])
      ])
    ]));
  }

  // ================= 屏 4：测算台 =================
  function screenBoard() {
    var r = M.result; if (!r) { setStep('input'); return; }
    var kn = r.keyNumbers;
    var live = function () { var o = recompute(); if (o.ok) { M.result = o; draw(); } };
    $root.appendChild(h('div', { class: 'm3-board' }, [
      h('div', { class: 'bhead' }, [
        h('div', {}, [h('div', { class: 'vt' }, [r.verdict.headline]), h('div', { class: 'vx' }, [r.verdict.text])]),
        h('div', { class: 'conf' }, [h('b', {}, [String(r.confidence.score)]), h('i', {}, ['分 · ' + r.confidence.name])])
      ]),
      h('div', { class: 'bfigs' }, kn.map(function (k) {
        return h('div', { class: 'bf' + (k.wide ? ' wide' : '') }, [
          h('div', { class: 'k' }, [k.k]),
          h('div', { class: 'v' }, [k.v == null ? '—' : fmt(k.v), h('small', {}, [k.v == null ? '' : ' ' + k.unit])]),
          h('div', { class: 's' }, [k.s])
        ]);
      })),
      h('div', { class: 'bsplit' }, [
        h('div', { class: 'bcol' }, [
          h('h4', {}, ['现金流与回本']),
          CH.paybackCurve(r.flow.length ? r.flow : [{ m: 1, cum: 0 }], r.payback),
          CH.cashflowBars(r.flow.length ? r.flow : [{ m: 1, benefit: 0, cost: 0 }])
        ]),
        h('div', { class: 'bcol' }, [
          h('h4', {}, ['调一调，看回本怎么变']),
          numRow('另议项预算', '系统对接 / 定制', M.plan.customBudget, '元', [0, 20000, 60000, 150000], function (v) { M.plan.customBudget = v == null ? 0 : v; live(); }),
          numRow('订阅套数', '', M.plan.seats, '套', [1, 2, 3, 5], function (v) { M.plan.seats = v || 1; live(); }),
          h('h4', {}, ['三档情景']),
          CH.scenarioBand(r.scenarios, r.meta.horizon),
          h('h4', {}, ['最怕哪个数变']),
          r.sensitivity.length ? CH.sensitivityRange(r.sensitivity, r.payback || r.paybackAll, r.meta.horizon) : h('div', { class: 'm3-hint' }, ['收益端补齐后才能算敏感度。'])
        ])
      ]),
      r.missing.length ? h('div', { class: 'm3-warn' }, ['还缺 ' + r.missing.length + ' 项：' + r.missing.map(function (x) { return x.label; }).join('、') + '。补齐后回收期会更准。']) : null,
      h('div', { class: 'm3-act' }, [
        h('button', { class: 'btn ghost', onclick: function () { setStep('gain'); } }, ['改数字']),
        h('button', { class: 'btn', onclick: function () { sh.setQrReady(true); setStep('report'); } }, ['出具完整报告'])
      ])
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
  var CHC = {
    cover: ['#BC6A15', '#8A4E10'], nav: ['#3E382F', '#24211C'], quick: ['#BC6A15', '#8A4E10'],
    prof: ['#8A4FA2', '#5F3573'], cost: ['#A8382E', '#7A2A22'], gain: ['#028F72', '#016450'],
    pay: ['#BC6A15', '#8A4E10'], scen: ['#8A4FA2', '#5F3573'], sens: ['#A8382E', '#7A2A22'],
    conf: ['#3E382F', '#24211C'], plan: ['#028F72', '#016450'], app: ['#4A443A', '#24211C']
  };
  function page3(chapter, r, key, cls) {
    var c = CHC[key] || CHC.nav;
    var p = h('section', { class: 'page m3 ' + (cls || ''), style: '--cc:' + c[0] + ';--cc2:' + c[1] });
    return p;
  }
  function spine(no, en) {
    return h('div', { class: 'm3-spine' }, [
      h('div', { class: 'no' }, [no, h('i', {}, ['CH'])]),
      h('div', { class: 'vt' }, [en || ''])
    ]);
  }
  function wrapPage(p, r, chapter, no, title, en, rtv, rtk, nodes) {
    p.appendChild(spine(no, en));
    var w = h('div', { class: 'm3-wrap' });
    w.appendChild(h('div', { class: 'm3-head' }, [
      h('span', { class: 'ch' }, [chapter]),
      h('span', { class: 'rt' }, [r.profile.name + '　·　' + reportNo(r)])
    ]));
    w.appendChild(h('div', { class: 'm3-hd' }, [
      rtv ? h('div', { class: 'rt' }, [h('b', {}, [rtv]), rtk || '']) : null,
      h('div', { class: 't' }, [title]),
      h('div', { class: 'en' }, [en || ''])
    ]));
    (nodes || []).forEach(function (n) { if (n) w.appendChild(n); });
    p.appendChild(w); p._w = w; return p;
  }
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
    add('本报告导航', pNav(r), { one: '三笔账的读法、口径声明与章节索引' });
    add('01 三笔账速览', pQuick1(r), { brief: true, one: '投入、收益、回收期三个数字与总体判断' });
    add('', pQuick2(r), { brief: true, sub: '六问六答' });
    add('02 企业与场景', pProfile(r), { one: '基本情况、所算场景与收益从哪来' });
    add('03 第一笔账 · 投入', pCost1(r), { brief: true, one: '现金支出逐项、构成与工时投入' });
    add('', pCost2(r), { sub: '内部工时与上线节奏' });
    add('04 第二笔账 · 收益', pGain1(r), { one: '收益杠杆桥、逐条算式与合并口径' });
    add('', pGain2(r), { sub: '逐条算式明细' });
    add('', pGain3(r), { sub: '现金与工时之分' });
    add('', pGain4(r), { sub: '换个场景会怎样' });
    add('05 第三笔账 · 回收期', pPay1(r), { brief: true, one: '回本曲线、转正月份与两种口径' });
    add('', pPay2(r), { sub: '24 个月现金流' });
    add('', pPay3(r), { sub: '逐月台账明细' });
    add('06 三档情景', pScen(r), { brief: true, one: '保守 / 中性 / 积极三档的回本与净收益' });
    add('', pScen2(r), { sub: '三档逐月对照' });
    add('07 最怕哪个数变', pSens(r), { one: '五个假设各上下 20% 对回本月的影响' });
    add('08 口径与可信度', pConf(r), { one: '每个数字是谁给的、可信度怎么算的' });
    add('09 还缺什么数', pMissing(r), { one: '补齐清单与补齐之后会怎样' });
    add('10 上线节奏', pRamp(r), { one: '上线周期、收益爬坡与第一步做什么' });
    add('11 谁来推', pRoles(r), { one: '三个角色、各自的职责与要花的时间' });
    add('12 相关服务', pServices(r), { one: '报价口径与可选服务' });
    add('13 什么时候重算', pRetrigger(r), { one: '五种情况下这笔账会变' });
    add('附录 A 常量与公式', pAppA(r), { one: '全部测算常量、七条杠杆公式与折减比例' });
    add('', pAppB(r), { sub: '24 个月逐月明细' });
    add('附录 B 方法与术语', pAppC(r), { one: '测算方法、术语表与口径声明' });
    add('附录 C 场景原文', pAppD(r), { one: '场景库里这个场景的原始字段' });
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
      CH.heroM3({}),
      h('div', { class: 'ov' }, [
        h('div', { class: 'co' }, [r.profile.name]),
        h('div', { class: 'rt' }, [RT().reportTitle]),
        h('div', { class: 'en' }, [RT().reportTitleEn])
      ]),
      h('img', { class: 'logo', src: sh.CFG.logo, alt: '顶呱呱' })
    ]));
    p.appendChild(h('div', { class: 'body' }, [
      h('div', { class: 'lead' }, [
        h('div', { class: 'big' }, [
          h('div', { class: 'lb' }, ['累计净额转正']),
          h('div', { class: 'v' }, [pm == null ? '>24' : '第 ' + pm, h('small', {}, ['个月'])]),
          h('div', { class: 'basis' }, [basis])
        ]),
        h('div', { class: 'txt' }, [
          h('div', { class: 'hl' }, [r.verdict.headline]),
          h('div', { class: 'x' }, [r.verdict.text])
        ])
      ]),
      figs3([
        { k: '现金支出（首年）', v: money(r.invest.cashYear1), u: '元', neg: true },
        { k: '现金收益', v: money(r.benefit.cashMonthly), u: '元/月', pos: true },
        { k: '省下的工时', v: money(r.benefit.hoursMonthly), u: '元/月', s: '单列，不计入现金口径' },
        { k: '口径可信度', v: String(r.confidence.score), u: '分', s: r.confidence.name, hl: true }
      ], 4),
      h('div', { class: 'bot' }, [
        h('span', {}, [RT().issuer + '　·　' + RT().issuerSub]),
        h('span', {}, ['报告编号 ' + reportNo(r) + '　出具日期 2026-09-17'])
      ])
    ]));
    return p;
  }

  function pNav(r) {
    var p = page3(null, r, 'nav');
    return wrapPage(p, r, '本报告导航', '00', '这份报告怎么看', 'HOW TO READ', null, null, [
      h('div', { class: 'm3-p2' }, [RT().readingGuide.title]),
      list3(RT().readingGuide.items),
      note3('口径声明', '这是估算，不是承诺', RT().honesty.items.join(' '), false),
      hh3('章节索引', 'CONTENTS'),
      tbl3([['章', 'k'], ['讲什么'], ['页', 'n']], M.pages.filter(function (x) { return x.title && x.one; }).map(function (x, i) {
        return [[x.title, 'b'], [x.one], [String(M.pages.indexOf(x) + 1), 'n']];
      }))
    ]);
  }

  function pQuick1(r) {
    var p = page3(null, r, 'quick');
    var pm = payMonth(r);
    return wrapPage(p, r, '01 三笔账速览', '01', '三笔账', 'THE THREE ACCOUNTS',
      pm == null ? '>24' : '第 ' + pm + ' 月', payBasisLabel(r), [
      figs3([
        { k: '第一笔 · 投入', v: money(r.invest.cashYear1), u: '元', s: '首年现金支出', neg: true },
        { k: '第二笔 · 收益', v: money(r.benefit.cashMonthly), u: '元/月', s: '现金口径，满额后', pos: true },
        { k: '第三笔 · 回收期', v: pm == null ? '>24' : '第 ' + pm + ' 月', s: payBasisLabel(r), hl: true }
      ], 3),
      note3('总体判断', r.verdict.headline, r.verdict.text, r.payback == null),
      hh3('回本曲线', 'PAYBACK CURVE'),
      r.flow.length ? CH.paybackCurve(r.flow, r.payback) : h('div', { class: 'm3-hint' }, ['收益端数字补齐后才能画回本曲线。']),
      r.benefit.hoursMonthly > 0 ? note3('两种口径', '现金口径 ' + (r.payback == null ? '24 个月内不转正' : '第 ' + r.payback + ' 个月转正') + '，含工时口径' + (r.paybackAll == null ? '也不转正' : '第 ' + r.paybackAll + ' 个月转正'),
        '省下来的工时按 ' + money(r.benefit.hoursMonthly) + ' 元/月折算。这笔账成立的前提是省下来的时间真的换成了别的产出，所以主数字用现金口径。') : null
    ]);
  }

  function pQuick2(r) {
    var p = page3(null, r, 'quick');
    return wrapPage(p, r, '01 三笔账速览', '01', '六个问题，六句回答', 'SIX QUESTIONS', null, null, [
      rows3(r.quickView.map(function (q) { return row3(q.q, q.a, { b: true, i: q.text }); })),
      hh3('收益构成', 'CASH VS HOURS'),
      CH.cashVsHours(r.benefit.cashMonthly, r.benefit.hoursMonthly),
      r.roi && !r.roi.meaningful ? note3('关于回报率', '这次的回报率数字不必当真', r.roi.note, true)
        : (r.roi && r.roi.roi12 != null ? note3('回报率', '首年 ' + r.roi.roi12 + '%，两年 ' + r.roi.roi24 + '%', '分母是累计现金投入 ' + money(r.roi.inv12) + ' 元。') : null)
    ]);
  }

  function pProfile(r) {
    var p = page3(null, r, 'prof');
    var sc = r.scene;
    return wrapPage(p, r, '02 企业与场景', '02', '算的是哪家公司、哪个场景', 'SUBJECT', null, null, [
      two3(
        h('div', {}, [hh3('企业', 'COMPANY'), rows3([
          row3('企业名称', r.profile.name, { b: true }),
          row3('行业', sh.industryNameOf(r.profile.industry) || '—'),
          row3('规模', r.profile.size ? sh.optText('size', r.profile.size) : '—'),
          row3('年营收档', r.profile.revenue ? sh.optText('revenue', r.profile.revenue) : '—'),
          row3('客户类型', r.profile.customers ? sh.optText('customers', r.profile.customers) : '—'),
          row3('已有系统', (r.profile.systems || []).length ? r.profile.systems.map(function (x) { return sh.optText('systems', x); }).join('、') : '—')
        ])]),
        h('div', {}, [hh3('场景', 'SCENARIO'), rows3([
          row3('场景名称', sc.name, { b: true }),
          row3('所在环节', sc.stage || '—'),
          row3('谁在用', sc.user || '—'),
          row3('替代什么', sc.replaces || '—'),
          row3('对应模块', sc.module),
          row3('上线周期', sc.weeks + ' 周', { i: '数据现状倍率 ' + r.invest.dataStateMult }),
          row3('投入档', sc.cost + ' 档')
        ])]), 'wl'),
      hh3('收益从哪来', 'WHERE THE MONEY COMES FROM'),
      note3('折算口径', sc.roiBasis, sc.metric ? '场景库给的预期指标是「' + sc.metric + '」。这一句只作参考展示，没有参与任何一次计算——区间值无法直接折成钱。' : ''),
      rows3(r.levers.map(function (k) {
        var d = leverDef(k); if (!d) return null;
        var used = r.benefit.levers.filter(function (x) { return x.key === k; })[0];
        return row3(d.name, used ? fmt(used.final) + ' 元/月' : '未算', { b: true, i: d.money, pos: !!used, neg: !used });
      })),
      r.sceneBasis === 'generic' ? note3('口径提示', '本次按通用轻量场景口径测算', '没有指定具体场景，收益只按沟通与查找工时下降折算，可信度已扣 15 分。', true) : null
    ]);
  }

  function pCost1(r) {
    var p = page3(null, r, 'cost');
    var iv = r.invest;
    return wrapPage(p, r, '03 第一笔账 · 投入', '03', '第一笔账：投入', 'COST SIDE',
      money(iv.cashYear1), '元 · 首年现金', [
      hh3('现金支出', 'CASH OUT　按定稿价目逐项列'),
      rows3(iv.cashItems.map(function (x) {
        return row3(x.name, '−' + fmt(x.amount), { i: x.detail, neg: true });
      }).concat([row3('首年现金支出合计', '−' + fmt(iv.cashYear1), { sum: true, neg: true })])),
      two3(
        h('div', {}, [hh3('构成', 'BREAKDOWN'), CH.investStack(iv.cashItems)]),
        h('div', {}, [hh3('第二年起', 'YEAR 2 ONWARD'), rows3([
          row3('续费部分', '−' + fmt(iv.cashYearly), { i: '订阅与私域按年续', neg: true }),
          row3('一次性部分', '0', { i: '诊断与另议项不再发生' }),
          row3('第二年现金支出', '−' + fmt(iv.cashYearly), { sum: true, neg: true })
        ]), note3('付款节奏', '年费在第 1 个月与第 13 个月整付', '测算没有把年费按月摊——真实付款就是整付，摊开会让回本期显得比实际早。')]), 'wl')
    ]);
  }

  function pCost2(r) {
    var p = page3(null, r, 'cost');
    var iv = r.invest;
    return wrapPage(p, r, '03 第一笔账 · 投入', '03', '内部工时：单列的一栏', 'INTERNAL HOURS', null, null, [
      note3('为什么单列', '内部工时不计入回收期', '上线期与日常维护要占用自己人的时间，这是真实成本，但它不是从账上付出去的钱。把它和现金混在一起算回本，两头都会失真。'),
      rows3(iv.laborItems.map(function (x) {
        return row3(x.name, fmt(x.amount) + (x.monthly ? ' 元/月' : ' 元'), { i: x.detail + '　约 ' + x.hours + ' 小时' });
      }).concat([row3('首年工时折算合计', fmt(iv.laborYear1) + ' 元', { sum: true })])),
      hh3('时薪口径', 'HOURLY RATE'),
      rows3([
        row3('推进人月薪', fmt(r.plan.setupSalary) + ' 元/月'),
        row3('综合用工系数', '× ' + C().work.laborBurden, { i: '工资之外的社保公积金等' }),
        row3('月工作小时', String(C().work.daysPerMonth) + ' 天 × ' + C().work.hoursPerDay + ' 小时'),
        row3('折算时薪', iv.setupHourly + ' 元/小时', { sum: true })
      ]),
      hh3('上线节奏', 'RAMP'),
      CH.rampSteps(C().rampMonths, r.benefit.cashMonthly)
    ]);
  }

  function pGain1(r) {
    var p = page3(null, r, 'gain');
    return wrapPage(p, r, '04 第二笔账 · 收益', '04', '第二笔账：收益', 'RETURN SIDE',
      money(r.benefit.cashMonthly), '元/月 · 现金口径', [
      r.benefit.levers.length ? h('div', {}, [
        hh3('收益杠杆桥', 'BENEFIT BRIDGE　金额最大的一条全额计入，其余按 35%'),
        CH.benefitBridge(r.benefit.levers, r.benefit.fullMonthly)
      ]) : note3('算不出来', '收益端关键数字没填齐', '本次只给投入侧。缺哪几项见第 ' + (M.pages.length ? '09' : '09') + ' 章。', true),
      hh3('合并与封顶', 'MERGE & CAP'),
      rows3([
        row3('逐条相加（已打折）', fmt(r.benefit.rawMonthly) + ' 元/月'),
        row3('按场景价值折', '× ' + r.benefit.valueFactor, { i: '场景价值 ' + r.scene.value + ' / 5' }),
        row3('折后', fmt(r.benefit.afterValue) + ' 元/月'),
        r.benefit.capMonthly != null ? row3('年营收 6% 封顶线', fmt(r.benefit.capMonthly) + ' 元/月', { i: r.capped ? '本次已触顶' : '本次未触顶' }) : row3('营收封顶', '未启用', { i: '企业年营收未知' }),
        row3('计入月收益', fmt(r.benefit.fullMonthly) + ' 元/月', { sum: true, pos: true })
      ]),
      r.capped ? note3('已封顶', '算出来的收益超过了年营收的 6%，超出部分没有计入', '这条护栏是为了避免输入的数字偏大时算出不切实际的收益。') : null
    ]);
  }

  function pGain2(r) {
    var p = page3(null, r, 'gain');
    return wrapPage(p, r, '04 第二笔账 · 收益', '04', '每一条是怎么算出来的', 'THE ARITHMETIC', null, null, [
      r.benefit.levers.length ? h('div', {}, r.benefit.levers.map(function (lv) {
        return h('div', { class: 'm3-lvbox' }, [
          hh3('#' + lv.rank + '　' + lv.name + (lv.cash ? '' : '（工时）'), lv.en || ''),
          rows3([
            row3('算式', lv.basis, { i: '' }),
            row3('算出', fmt(lv.monthly) + ' 元/月'),
            row3('合并权重', lv.discounted ? '× 35%' : '全额', { i: lv.discounted ? '不是金额最大的一条，按 35% 计入，避免同一笔钱算两遍' : '金额最大的一条' }),
            row3('计入', fmt(lv.final) + ' 元/月', { sum: true, pos: lv.cash, neg: !lv.cash })
          ]),
          h('div', { class: 'm3-cut' }, ['折减比例 ' + Math.round(lv.cut * 100) + '%：' + lv.cutNote])
        ]);
      })) : note3('本次没有可算的杠杆', '收益端一条都没填齐', '见「还缺什么数」一章。', true)
    ]);
  }

  function pGain3(r) {
    var p = page3(null, r, 'gain');
    var cash = r.benefit.levers.filter(function (x) { return x.cash; });
    var hrs = r.benefit.levers.filter(function (x) { return !x.cash; });
    return wrapPage(p, r, '04 第二笔账 · 收益', '04', '现金与工时，分开看', 'CASH VS HOURS', null, null, [
      CH.cashVsHours(r.benefit.cashMonthly, r.benefit.hoursMonthly),
      two3(
        h('div', {}, [hh3('算进回收期的', 'COUNTED'), cash.length ? rows3(cash.map(function (x) {
          return row3(x.name, fmt(x.final) + ' 元/月', { pos: true, i: x.money });
        })) : h('div', { class: 'm3-hint' }, ['本次没有现金口径的收益。'])]),
        h('div', {}, [hh3('单列不算的', 'LISTED ONLY'), hrs.length ? rows3(hrs.map(function (x) {
          return row3(x.name, fmt(x.final) + ' 元/月', { i: x.money });
        })) : h('div', { class: 'm3-hint' }, ['本次没有工时类收益。'])])),
      note3('这条线怎么划', '省下的时间只有换成别的产出才算钱', '中小企业不会因为省了两小时就少发一份工资。所以工时折算单列一栏，回收期的主数字只用现金。如果贵司确实打算把省下的人手调去做别的事，可以看「含工时」那一行。')
    ]);
  }

  function pGain4(r) {
    var p = page3(null, r, 'gain');
    var list = secScenes().filter(function (x) { return x.id !== r.scene.id; }).slice(0, 10);
    return wrapPage(p, r, '04 第二笔账 · 收益', '04', '换个场景会怎样', 'OTHER SCENARIOS', null, null, [
      h('div', { class: 'm3-hint' }, ['本行业场景库里还有这些。收益杠杆不同，要问的数字和回本形态也不同——想比一比可以回测算台换一个重算。']),
      tbl3([['场景'], ['收益从哪来'], ['投入档', 'c'], ['上线', 'n'], ['价值', 'c']], list.map(function (x) {
        var lv = leversOf(x.id).map(function (k) { var d = leverDef(k); return d ? d.name : k; });
        return [[x.name, 'b'], [lv.join(' + ')], [x.cost, 'c'], [x.weeks + ' 周', 'n'], [x.value + '/5', 'c']];
      })),
      note3('为什么场景不同账就不同', '收益杠杆决定了这笔账的形状',
        '以省工时为主的场景，现金口径往往不回本，但上手快、投入轻；以少差错或多成单为主的场景，现金收益直接，回本快，但通常要接系统、投入重。选哪个取决于贵司眼下最想解决什么。')
    ]);
  }

  function pScen2(r) {
    var p = page3(null, r, 'scen');
    var marks = [3, 6, 9, 12, 18, 24].filter(function (m) { return m <= r.meta.horizon; });
    return wrapPage(p, r, '06 三档情景', '06', '三档逐月对照', 'MONTH BY MONTH', null, null, [
      r.flow.length ? tbl3([['月'], ['保守 · 累计', 'n'], ['中性 · 累计', 'n'], ['积极 · 累计', 'n']],
        marks.map(function (m) {
          var row = ['第 ' + m + ' 月'];
          var cells = r.scenarios.map(function (sc) {
            var per = r.benefit.cashMonthly * sc.benefitMul, cum = 0;
            for (var i = 1; i <= m; i++) {
              var bi = i <= C().rampMonths.length ? C().rampMonths[i - 1] : 1;
              var out = i === 1 ? Math.round((r.invest.cashOnce + r.invest.cashYearly) * sc.costMul)
                : (i === 13 ? Math.round(r.invest.cashYearly * sc.costMul) : 0);
              cum += Math.round(per * bi) - out;
            }
            return [fmt(cum), 'n ' + (cum >= 0 ? 'pos' : 'neg')];
          });
          return [[row[0], 'b']].concat(cells);
        })) : h('div', { class: 'm3-hint' }, ['收益端补齐后才有逐月数字。']),
      hh3('三档差在哪', 'WHAT DIFFERS'),
      rows3(r.scenarios.map(function (sc) {
        return row3(sc.name, sc.payback == null ? '超过 ' + r.meta.horizon + ' 个月' : '第 ' + sc.payback + ' 个月转正',
          { b: true, i: sc.desc, pos: sc.payback != null, neg: sc.payback == null });
      })),
      note3('这三档不是三种预测', '是同一组输入在不同松紧度下的样子',
        '保守档不代表「差的情况」，它代表「把话说满之前该留的余量」。如果保守档也能接受，这件事就值得往下推。')
    ]);
  }

  function pPay1(r) {
    var p = page3(null, r, 'pay');
    var pm = payMonth(r);
    return wrapPage(p, r, '05 第三笔账 · 回收期', '05', '第三笔账：什么时候回本', 'PAYBACK',
      pm == null ? '>24' : '第 ' + pm + ' 月', payBasisLabel(r), [
      r.flow.length ? CH.paybackCurve(r.flow, r.payback) : h('div', { class: 'm3-hint' }, ['收益端补齐后才能画。']),
      figs3([
        { k: '现金口径转正', v: r.payback == null ? '>24 个月' : '第 ' + r.payback + ' 个月', hl: r.payback != null },
        { k: '含工时口径转正', v: r.paybackAll == null ? '>24 个月' : '第 ' + r.paybackAll + ' 个月' },
        { k: '首年累计净额', v: r.flow.length ? money(r.flow[11].cum) : '—', u: '元', pos: r.flow.length && r.flow[11].cum > 0, neg: r.flow.length && r.flow[11].cum < 0 },
        { k: '两年累计净额', v: r.flow.length ? money(r.flow[23].cum) : '—', u: '元', pos: r.flow.length && r.flow[23].cum > 0, neg: r.flow.length && r.flow[23].cum < 0 }
      ], 4),
      r.reCross ? note3('注意', '第 13 个月年费入账后累计净额再次转负', '二次转正在第 ' + r.reCross + ' 个月。续费是每年都会发生的，做预算时要留出这一笔。', true) : null,
      note3('回本月是怎么定的', '累计净额第一次由负转正的那个月', C().rampNote + ' ' + RT().method.payback)
    ]);
  }

  function pPay2(r) {
    var p = page3(null, r, 'pay');
    return wrapPage(p, r, '05 第三笔账 · 回收期', '05', '24 个月现金流', 'MONTHLY CASH FLOW', null, null, [
      r.flow.length ? CH.cashflowBars(r.flow) : h('div', { class: 'm3-hint' }, ['收益端补齐后才能画。']),
      hh3('关键月份', 'KEY MONTHS'),
      r.flow.length ? tbl3([['月'], ['收益', 'n'], ['支出', 'n'], ['当月净额', 'n'], ['累计净额', 'n']],
        [1, 2, 3, 4, 6, 12, 13, 18, 24].filter(function (m) { return m <= r.flow.length; }).map(function (m) {
          var x = r.flow[m - 1];
          return [['第 ' + m + ' 月', 'b'], [fmt(x.benefit), 'n'], [x.cost ? '−' + fmt(x.cost) : '0', 'n' + (x.cost ? ' neg' : '')],
            [fmt(x.net), 'n ' + (x.net >= 0 ? 'pos' : 'neg')], [fmt(x.cum), 'n ' + (x.cum >= 0 ? 'pos' : 'neg')]];
        })) : null,
      r.flow.length ? CH.monthLadder(r.flow, r.payback) : null
    ]);
  }

  function pPay3(r) {
    var p = page3(null, r, 'pay');
    var half = Math.ceil(r.flow.length / 2);
    var mk = function (a, b) {
      return tbl3([['月'], ['收益', 'n'], ['支出', 'n'], ['累计', 'n']], r.flow.slice(a, b).map(function (x) {
        return [[String(x.m)], [fmt(x.benefit), 'n'], [x.cost ? '−' + fmt(x.cost) : '', 'n neg'], [fmt(x.cum), 'n ' + (x.cum >= 0 ? 'pos' : 'neg')]];
      }));
    };
    return wrapPage(p, r, '05 第三笔账 · 回收期', '05', '逐月台账', 'MONTH BY MONTH', null, null, [
      r.flow.length ? two3(mk(0, half), mk(half, r.flow.length)) : h('div', { class: 'm3-hint' }, ['收益端补齐后才有逐月数字。']),
      note3('读法', '累计那一列由负转正的第一行就是回本月', '爬坡期前三个月的收益分别按 35% / 70% / 100% 计。')
    ]);
  }

  function pScen(r) {
    var p = page3(null, r, 'scen');
    return wrapPage(p, r, '06 三档情景', '06', '同一组数字的三种活法', 'THREE SCENARIOS', null, null, [
      CH.scenarioBand(r.scenarios, r.meta.horizon),
      tbl3([['情景'], ['口径'], ['月收益', 'n'], ['首年现金支出', 'n'], ['回本月', 'n'], ['首年净额', 'n']],
        r.scenarios.map(function (s) {
          return [[s.name, 'b'], [s.desc], [fmt(s.monthlyBenefit), 'n'], ['−' + fmt(s.cashYear1), 'n neg'],
            [s.payback == null ? '>24' : '第 ' + s.payback + ' 月', 'n ' + (s.payback ? 'pos' : 'neg')],
            [fmt(s.cum12), 'n ' + (s.cum12 >= 0 ? 'pos' : 'neg')]];
        })),
      note3('做决定时看哪一档', '看保守档', '保守档把收益按 65% 计、投入按 1.2 倍计。如果保守档也能接受，这件事的下行风险就是可控的。')
    ]);
  }

  function pSens(r) {
    var p = page3(null, r, 'sens');
    return wrapPage(p, r, '07 最怕哪个数变', '07', '最怕哪个数变', 'SENSITIVITY', null, null, [
      r.sensitivity.length ? CH.sensitivityRange(r.sensitivity, r.payback || r.paybackAll, r.meta.horizon)
        : h('div', { class: 'm3-hint' }, ['收益端补齐后才能算敏感度。']),
      r.sensitivity.length ? tbl3([['假设'], ['是什么'], ['调低 20%', 'n'], ['调高 20%', 'n'], ['影响', 'n']],
        r.sensitivity.map(function (s) {
          return [[s.label, 'b'], [s.note], [s.lowText || '—', 'n'], [s.highText || '—', 'n'], [s.spread ? '±' + s.spread + ' 月' : '不变', 'n b']];
        })) : null,
      r.sensitivity.length ? note3('第一名是什么意思', '排在最前面的那个假设，动一动对回本月的影响最大',
        '「' + r.sensitivity[0].label + '」排第一。' + (r.sensitivity[0].key === 'benefitCut'
          ? '它是本工具自己设的折减比例——也就是说，这笔账里最大的不确定来自模型的假设，而不是贵司填的数字。试运行三个月后用实际效果替换它，测算会准得多。'
          : '建议优先把这一项的真实数字确认下来。')) : null
    ]);
  }

  function pConf(r) {
    var p = page3(null, r, 'conf');
    var FL = { opsPeople: '做这件事的人数', opsHoursPerDay: '每人每天小时数', opsSalary: '平均月薪',
      errorFreqMonthly: '问题发生频次', errorCostPerCase: '单次损失', dealsMonthly: '月成单数',
      dealValue: '单均金额', grossMargin: '毛利率', relatedRevenueMonthly: '这块业务月营业额',
      tiedCapital: '占用资金', spendAnnual: '这项年开支', lostOutputMonthly: '每月耽误的产值',
      revenueAnnual: '年营收', customBudget: '另议项预算', dataState: '数据现状' };
    var ents = Object.keys(r.inputSource).map(function (k) { return { label: FL[k] || k, src: r.inputSource[k] }; });
    return wrapPage(p, r, '08 口径与可信度', '08', '每个数字是谁给的', 'DATA PROVENANCE',
      String(r.confidence.score), '分 · ' + r.confidence.name, [
      CH.confidenceBar(r.confidence.score, C().confidence.bands),
      hh3('逐项来源', 'SOURCE OF EACH INPUT'),
      CH.sourceGrid(ents),
      hh3('参考值用在了哪', 'REFERENCE VALUES'),
      ents.filter(function (e) { return e.src !== 'user'; }).length
        ? rows3(ents.filter(function (e) { return e.src !== 'user'; }).map(function (e) {
            return row3(e.label, e.src === 'profile' ? '按画像推的参考值' : e.src === 'default' ? '未填，按 0 计' : '场景库', { neg: e.src === 'default' });
          }))
        : note3('全部来自贵司', '这次没有用到任何参考值', '所有数字都是现场填的，测算可以直接用于决策讨论。'),
      note3('参考值是什么', DATA.m3.benchmarks.disclosure, '把参考值换成贵司的真实数据，结论可能变化。')
    ]);
  }

  function pMissing(r) {
    var p = page3(null, r, 'conf');
    return wrapPage(p, r, '09 还缺什么数', '09', '还缺什么数', 'WHAT IS MISSING', null, null, [
      r.missing.length ? h('div', {}, [
        note3('本次的缺口', '还有 ' + r.missing.length + ' 项没填', '这些项对应的收益杠杆本次没有计入。补齐后可以当场重算。', true),
        tbl3([['缺什么'], ['属于哪条杠杆'], ['为什么要它']], r.missing.map(function (m) {
          return [[m.label, 'b'], [m.leverName], [m.why]];
        }))
      ]) : note3('没有缺口', '收益端该填的都填了', '本次测算的每一条杠杆都有完整输入。'),
      hh3('补齐之后会怎样', 'WHAT CHANGES'),
      list3([
        '缺的那几条杠杆会进入收益合计，月收益上升，回本月提前。',
        '口径可信度会回到 100 分附近，报告里不再出现「参考值」标记。',
        '敏感度里「折减比例」的权重会下降——真实数字越多，模型假设的影响越小。'
      ]),
      r.insufficient ? note3('本次只出了投入侧', '回收期没有计算', '收益端一条杠杆都没算出来。本报告的第一笔账（投入）是完整的，可以直接用于报价讨论；第三笔账需要补齐后再算。', true) : null
    ]);
  }

  function pRamp(r) {
    var p = page3(null, r, 'plan');
    var sc = r.scene;
    return wrapPage(p, r, '10 上线节奏', '10', '上线要多久，什么时候见效', 'ROLLOUT', 
      String(r.invest.setupWeeks), '周 · 上线期', [
      rows3([
        row3('场景基准周期', sc.weeks + ' 周', { i: '场景库给的' }),
        row3('数据现状倍率', '× ' + r.invest.dataStateMult, { i: '数据' + (r.plan.dataState === 'paper' ? '以纸质为主' : r.plan.dataState === 'scattered' ? '散在多个系统' : r.plan.dataState === 'system' ? '在系统里齐全' : '以表格为主') }),
        row3('实际上线期', r.invest.setupWeeks + ' 周', { sum: true })
      ]),
      hh3('收益爬坡', 'RAMP UP'),
      CH.rampSteps(C().rampMonths, r.benefit.cashMonthly),
      h('div', { class: 'm3-hint' }, [C().rampNote]),
      hh3('第一步做什么', 'FIRST STEP'),
      note3('起步动作', sc.firstStep || '把这件事目前的做法写下来，标出最花时间的一步', sc.precondition ? '前置条件：' + sc.precondition : ''),
      sc.dataDeps && sc.dataDeps.length ? h('div', {}, [hh3('需要接的数据', 'DATA NEEDED'),
        rows3(sc.dataDeps.map(function (d) {
          var got = (r.profile.systems || []).indexOf(d) >= 0;
          return row3(sh.optText('systems', d) || d, got ? '已有' : '待补', { pos: got, neg: !got });
        }))]) : null
    ]);
  }

  function pRoles(r) {
    var p = page3(null, r, 'plan');
    return wrapPage(p, r, '11 谁来推', '11', '这件事需要谁来推', 'WHO DRIVES IT', null, null, [
      tbl3([['角色'], ['谁来担'], ['做什么'], ['要花多少时间']], r.roles.map(function (x) {
        return [[x.name, 'b'], [x.who], [x.duty], [x.time, 'k']];
      })),
      hh3('这部分时间的折算', 'TIME AS COST'),
      rows3(r.invest.laborItems.map(function (x) {
        return row3(x.name, fmt(x.amount) + (x.monthly ? ' 元/月' : ' 元'), { i: x.detail });
      })),
      note3('提醒', '这三个角色不到位，测算里的上线周期就不成立', '上线期是按 ' + r.plan.setupPeople + ' 人每天投入 2 小时估的。人手不到位，周期会拉长，回本月跟着后移。')
    ]);
  }

  function pServices(r) {
    var p = page3(null, r, 'plan');
    return wrapPage(p, r, '12 相关服务', '12', '报价口径与可选服务', 'SERVICES', null, null, [
      tbl3([['服务'], ['价格', 'n'], ['内容']], RT().services.map(function (s) {
        return [[s.name, 'b'], [s.price, 'n'], [s.desc]];
      })),
      hh3('本次已计入的', 'INCLUDED THIS TIME'),
      rows3(r.invest.cashItems.map(function (x) { return row3(x.name, fmt(x.amount) + ' 元', { i: x.detail, neg: true }); })),
      note3('关于另议项', r.plan.customBudget ? '本次按 ' + fmt(r.plan.customBudget) + ' 元计入' : '本次按 0 元计入',
        r.plan.customBudget ? '系统对接与定制的实际报价要在流程走完之后才能确定。报价下来后重算一次，回本月会变。'
          : '没有填另议项预算。如果这个场景需要系统对接，真实报价会让回本月后移——敏感度那一章可以看到影响有多大。', !r.plan.customBudget),
      note3('私域部署的口径', 'DM 写的是「12800 元起 / 套年」，区间 12800–33800',
        '测算只用这个区间的两个端点，不取中间值——单子上没有的价不往上报。')
    ]);
  }

  function pRetrigger(r) {
    var p = page3(null, r, 'conf');
    return wrapPage(p, r, '13 什么时候重算', '13', '什么情况下这笔账会变', 'WHEN TO RECALCULATE', null, null, [
      tbl3([['什么时候'], ['为什么会变']], r.retrigger.map(function (x) { return [[x.when, 'b'], [x.why]]; })),
      note3('重算成本', '在展台或手机上重新填一遍即可', '本工具离线可用，不依赖网络。改任何一个数字都会当场重算，不需要重新排队。')
    ]);
  }

  function pAppA(r) {
    var p = page3(null, r, 'app');
    var w = C().work;
    return wrapPage(p, r, '附录 A 常量与公式', 'A', '全部常量与公式', 'CONSTANTS & FORMULAS', null, null, [
      hh3('工时与资金口径', 'BASIS'),
      rows3([
        row3('月工作日', String(w.daysPerMonth) + ' 天', { i: '250 天 / 12 的常用取整口径' }),
        row3('每日工时', String(w.hoursPerDay) + ' 小时'),
        row3('综合用工系数', '× ' + w.laborBurden, { i: w.laborBurdenNote }),
        row3('测算期', C().horizonMonths + ' 个月'),
        row3('收益爬坡', C().rampMonths.map(function (x) { return Math.round(x * 100) + '%'; }).join(' / ')),
        row3('多杠杆合并折扣', '× ' + C().overlapDiscount, { i: '除金额最大的一条外' }),
        row3('年营收封顶', Math.round(C().caps.revenueShare * 100) + '%', { i: '单个场景的年化收益上限' })
      ]),
      hh3('七条收益杠杆', 'SEVEN LEVERS'),
      tbl3([['杠杆'], ['钱从哪来'], ['折减', 'n'], ['现金', 'c']], LV().items.map(function (x) {
        return [[x.name, 'b'], [x.money], [Math.round(x.cut * 100) + '%', 'n'], [x.cash ? '是' : '否', 'c ' + (x.cash ? 'pos' : '')]];
      })),
      hh3('DM 价目', 'PRICE LIST'),
      rows3(C().prices.subscription.map(function (t) { return row3(t.name, t.yearly ? fmt(t.yearly) + ' 元 / 套年' : '0 元'); })
        .concat([row3(C().prices.diagnosisName, fmt(C().prices.diagnosisPerDay) + ' 元 / 天', { i: C().prices.diagnosisDesc })])
        .concat(C().prices.privateDeploy.map(function (x) { return row3(x.name, fmt(x.yearly) + ' 元 / 套年'); })))
    ]);
  }

  function pAppB(r) {
    var p = page3(null, r, 'app');
    var third = Math.ceil(r.flow.length / 3) || 1;
    var mk = function (a, b) {
      return tbl3([['月'], ['收益', 'n'], ['支出', 'n'], ['净额', 'n'], ['累计', 'n']], r.flow.slice(a, b).map(function (x) {
        return [[String(x.m)], [fmt(x.benefit), 'n'], [x.cost ? '−' + fmt(x.cost) : '', 'n neg'],
          [fmt(x.net), 'n'], [fmt(x.cum), 'n ' + (x.cum >= 0 ? 'pos' : 'neg')]];
      }));
    };
    return wrapPage(p, r, '附录 A 常量与公式', 'A', '24 个月逐月明细', 'MONTHLY DETAIL', null, null, [
      r.flow.length ? h('div', { class: 'm3-three' }, [mk(0, third), mk(third, third * 2), mk(third * 2, r.flow.length)])
        : h('div', { class: 'm3-hint' }, ['收益端补齐后才有逐月数字。'])
    ]);
  }

  function pAppC(r) {
    var p = page3(null, r, 'app');
    var m = RT().method;
    return wrapPage(p, r, '附录 B 方法与术语', 'B', '测算方法与术语', 'METHOD & GLOSSARY', null, null, [
      rows3([
        row3('模型', m.model), row3('付款节奏', m.timing), row3('回本月', m.payback),
        row3('多杠杆合并', m.overlap), row3('三档情景', m.scenario), row3('敏感度', m.sensitivity)
      ]),
      hh3('术语', 'GLOSSARY'),
      tbl3([['词'], ['意思']], RT().glossary.map(function (g) { return [[g.t, 'b'], [g.d]]; })),
      note3('口径声明', '这是估算，不是承诺', RT().honesty.items.join(' '))
    ]);
  }

  function pAppD(r) {
    var p = page3(null, r, 'app');
    var sc = r.scene;
    return wrapPage(p, r, '附录 C 场景原文', 'C', '场景库里的原始字段', 'SOURCE RECORD', null, null, [
      rows3([
        row3('场景 id', sc.id || '（通用口径，无 id）'),
        row3('名称', sc.name, { b: true }), row3('环节', sc.stage || '—'), row3('使用者', sc.user || '—'),
        row3('替代什么', sc.replaces || '—'), row3('对应模块', sc.module),
        row3('预期指标', sc.metric || '—'), row3('收益折算口径', sc.roiBasis),
        row3('上线周数', sc.weeks + ' 周'), row3('投入档', sc.cost), row3('价值', sc.value + ' / 5'),
        row3('数据依赖', (sc.dataDeps || []).length ? sc.dataDeps.map(function (d) { return sh.optText('systems', d) || d; }).join('、') : '无'),
        row3('第一步', sc.firstStep || '—'), row3('前置条件', sc.precondition || '—')
      ]),
      note3('为什么把原文列出来', '让口径可以被追溯', '本次测算用的每一条收益杠杆，都是从上面这几个字段推出来的。原文列在这里，方便贵司核对我们是不是理解对了这个场景。')
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
