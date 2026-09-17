/* 模块 3 · 企业AI投入ROI测算器
 * 屏 1 企业与场景 → 屏 2 投入方案 → 屏 3 收益端（按杠杆动态展开）→ 屏 4 测算台 → 屏 5 报告 28 页
 * 版式：账页标尺（竖脊 + 账行 + 金额栏对齐），暖墨 + 铜金
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, CH;
  var core = window.DGG.coreM3;
  var M = { step: 'input', form: null, plan: null, picks: [], result: null, pages: [], llmState: 'none', cutMul: 1, base: null, baseSnap: null };

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
      benchmarks: DATA.m3.benchmarks, investmentProfile: DATA.m3.investmentProfile, reportText: DATA.m3.reportText,
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
  function emptyForm() {
    return { name: '', industry: sh.displayIndustryDefault() || 'mfg-machinery', size: null, revenue: null,
             province: '浙江', years: null, ownership: 'private', customers: null, systems: [],
             itStaff: null, branches: 'single', overseas: 'no', role: 'owner' };
  }
  function fromProfile(p) { var f = emptyForm(); Object.keys(f).forEach(function (k) { if (p[k] != null) f[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; }); return f; }
  function emptyPlan() { return { tier: 'adv', dataState: 'excel', setupPeople: 2, setupSalary: 7500 }; }
  function fmt(n) { return (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function reportNo(r) { var d = r.meta && r.meta.date ? r.meta.date : '20260917'; return 'DGG-R-' + d + '-' + String(Math.abs(hashOf(r.profile.name)) % 100000).padStart(5, '0'); }
  function hashOf(s) { var x = 0; String(s).split('').forEach(function (c) { x = (x * 31 + c.charCodeAt(0)) | 0; }); return x; }

  // ---------- 生命周期 ----------
  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; CH = window.DGG.charts;
    if (!M.form) M.form = sh.getCompany() ? fromProfile(sh.getCompany()) : emptyForm();
    if (!M.plan) M.plan = emptyPlan();
    if (!M.picks) M.picks = [];
    M.step = step || (M.result ? 'report' : 'input');
    if ((M.step === 'report' || M.step === 'board') && !M.result) M.step = 'input';
    if ((M.step === 'gain' || M.step === 'plan') && !M.picks.length) M.step = 'scenes';
    if (M.step === 'scenes' && profileGaps().length) M.step = 'input';
    draw();
  }
  function unmount() { }
  function onCompany(c) {
    // 本模块自己把画像写回外壳时会回调到这里，此时内容与当前状态一致，不应把用户弹回第一屏
    if (c && M.form && JSON.stringify(fromProfile(c)) === JSON.stringify(M.form)) return;
    M.form = c ? fromProfile(c) : emptyForm();
    M.result = null; M.base = null; M.baseSnap = null; M.picks = [];
    if (M.step !== 'input') setStep('input'); else draw();
  }
  function onIndustry(slug) {
    // 外壳顶部的行业选择器只在第一屏生效：用户已经往下走了就不要把他弹回来重选
    if (!slug || M.form.industry === slug) return;
    if (M.step !== 'input') return;
    M.form.industry = slug; M.picks = []; M.result = null; M.base = null; M.baseSnap = null;
    draw();
  }
  function setStep(s) { M.step = s; sh.go('m3', s); }

  // ---------- 选中的场景组合 ----------
  function picked() { return M.picks; }
  function isPicked(id) { return M.picks.some(function (x) { return x.sceneId === id; }); }
  function pickOf(id) { return M.picks.filter(function (x) { return x.sceneId === id; })[0]; }
  function togglePick(id) {
    if (isPicked(id)) M.picks = M.picks.filter(function (x) { return x.sceneId !== id; });
    else if (M.picks.length < 12) M.picks.push({ sceneId: id, gain: {} });
  }
  function inputOf() {
    return { profile: M.form,
             scenes: M.picks.filter(function (x) { return !x.off; }).map(function (x) { return { sceneId: x.sceneId, gain: x.gain }; }),
             plan: M.plan };
  }

  // ---------- 缺口与就绪状态：按钮为什么不能点，必须写在屏幕上 ----------
  function profileGaps() {
    var need = DATA.fields.filter(function (f) { return f.required; });
    return need.filter(function (f) {
      var v = M.form[f.key];
      return f.type === 'multi' ? !(Array.isArray(v) && v.length) : !v;
    }).map(function (f) { return f.label; });
  }
  function gainGapsOf(x) {
    var out = [];
    leversOf(x.sceneId).forEach(function (k) {
      var d = leverDef(k); if (!d) return;
      d.fields.forEach(function (f) { if (!(x.gain[f.key] != null && x.gain[f.key] !== '')) out.push({ lever: d.name, label: f.label, key: f.key }); });
    });
    return out;
  }
  function gainGaps() {
    var n = 0; M.picks.forEach(function (x) { n += gainGapsOf(x).length; });
    return n;
  }
  // 预估：场景还没填收益参数时也要能给出组合规模，让客户看得见选择的后果
  function preview() {
    if (!M.picks.length) return null;
    try {
      var o = core.compute(inputOf(), bundle());
      return o.ok ? o : null;
    } catch (e) { return null; }
  }

  function recompute() {
    var out = core.compute(inputOf(), bundle());
    if (out.ok) { out.meta.date = '20260917'; M.result = out; }
    return out;
  }

  // ---------- 通用件 ----------
  function steps(n) {
    var names = ['企业画像', '场景组合', '收益参数', '投入方案', '测算台'];
    return h('div', { class: 'm3-steps-bar' }, names.map(function (t, i) {
      return h('button', {
        class: 'st' + (i + 1 === n ? ' on' : (i + 1 < n ? ' done' : '')),
        onclick: function () { if (i + 1 < n) setStep(['input', 'scenes', 'gain', 'plan', 'board'][i]); }
      }, [String(i + 1) + ' ' + t]);
    }));
  }
  function blocked(list, label) {
    if (!list.length) return null;
    return h('div', { class: 'm3-block' }, [
      h('b', {}, [label]),
      h('span', {}, [list.slice(0, 6).join('、') + (list.length > 6 ? ' 等 ' + list.length + ' 项' : '')])
    ]);
  }

  // ================= 屏 1：企业画像（可编辑） =================
  function screenInput() {
    var f = M.form, gaps = profileGaps();
    var pane = h('div', { class: 'm3-pane' });
    pane.appendChild(steps(1));
    pane.appendChild(h('h2', { class: 'm3-h2' }, ['第一步　企业画像']));
    pane.appendChild(h('p', { class: 'm3-p' }, [
      '本测算的对象是贵司在 AI 方面的整体投入与回报，不是单个场景。企业画像决定场景库的取用范围、'
      + '订阅账号数与另议项的规模推导，以及收益侧营收封顶的口径——下面每一项都会进入测算。'
    ]));
    var grid = h('div', { class: 'm3-form' });
    DATA.fields.forEach(function (fd) {
      var ctrl, cls = '';
      if (fd.type === 'text') {
        var inp = h('input', { class: 'm3-txt', type: 'text', value: f.name || '', placeholder: fd.placeholder || '请输入企业全称', maxlength: '40' });
        inp.addEventListener('input', function () { f.name = inp.value; var b = document.getElementById('m3-next1'); if (b) b.disabled = profileGaps().length > 0; var g = document.getElementById('m3-gap1'); if (g) { sh.clear(g); var gg = profileGaps(); var nb = blocked(gg, gg.length ? '还需填写：' : ''); if (nb) g.appendChild(nb); } });
        ctrl = inp;
      } else if (fd.type === 'industry') {
        cls = 'span2';
        var sec = sectorOf(f.industry) || DATA.industries.sectors[0], box = h('div');
        box.appendChild(h('div', { class: 'm3-chips sm' }, DATA.industries.sectors.map(function (s) {
          return h('button', { class: 'ch' + (s.key === sec.key ? ' on' : ''), onclick: function () { f.industry = s.industries[0].slug; M.picks = []; draw(); } }, [s.name]);
        })));
        box.appendChild(h('div', { class: 'm3-chips' }, sec.industries.map(function (i) {
          return h('button', { class: 'ch' + (i.slug === f.industry ? ' on' : ''), onclick: function () { f.industry = i.slug; M.picks = []; draw(); } }, [i.name]);
        })));
        ctrl = box;
      } else if (fd.type === 'select') {
        var sel = h('select', { class: 'm3-sel', onchange: function () { f.province = sel.value; } });
        (DATA.provinces || ['浙江']).forEach(function (pv) { sel.appendChild(h('option', { value: pv, selected: pv === f.province }, [pv])); });
        ctrl = sel;
      } else if (fd.type === 'multi') {
        cls = 'span2';
        ctrl = h('div', { class: 'm3-chips' }, fd.options.map(function (o) {
          var on = (f.systems || []).indexOf(o.v) >= 0;
          return h('button', { class: 'ch' + (on ? ' on' : ''), onclick: function () {
            if (o.exclusive) f.systems = on ? [] : [o.v];
            else { f.systems = (f.systems || []).filter(function (x) { return x !== 'none' && x !== o.v; }); if (!on) f.systems.push(o.v); }
            draw();
          } }, [o.t]);
        }));
      } else {
        ctrl = h('div', { class: 'm3-chips' }, fd.options.map(function (o) {
          return h('button', { class: 'ch' + (f[fd.key] === o.v ? ' on' : ''), onclick: function () { f[fd.key] = o.v; draw(); } }, [o.t]);
        }));
      }
      grid.appendChild(h('div', { class: 'm3-field ' + cls }, [
        h('label', {}, [fd.label, fd.required ? h('i', { class: 'req' }, ['必填']) : null,
          fd.key === 'revenue' ? h('i', { class: 'why' }, ['决定收益封顶与投入合理性核验']) : null,
          fd.key === 'systems' ? h('i', { class: 'why' }, ['决定系统对接科目的计列范围']) : null,
          fd.key === 'size' ? h('i', { class: 'why' }, ['决定订阅账号数与另议项的规模推导']) : null]),
        ctrl
      ]));
    });
    pane.appendChild(grid);
    pane.appendChild(h('div', { id: 'm3-gap1' }, [blocked(gaps, '还需填写：')].filter(Boolean)));
    pane.appendChild(h('div', { class: 'm3-act' }, [
      h('span', { class: 'm3-cnt' }, ['必填 ', h('b', {}, [(DATA.fields.filter(function (x) { return x.required; }).length - gaps.length) + ' / ' + DATA.fields.filter(function (x) { return x.required; }).length]), ' 项']),
      h('button', { class: 'btn', id: 'm3-next1', disabled: gaps.length > 0, onclick: function () {
        sh.setCompany(JSON.parse(JSON.stringify(M.form)));
        setStep('scenes');
      } }, ['下一步：选场景组合'])
    ]));
    $root.appendChild(pane);
  }

  // ================= 屏 2：场景组合（多选） =================
  function screenScenes() {
    var list = secScenes();
    var byStage = [];
    list.forEach(function (s) {
      var g = byStage.filter(function (x) { return x.stage === s.stage; })[0];
      if (!g) { g = { stage: s.stage, items: [] }; byStage.push(g); }
      g.items.push(s);
    });
    var pv = preview();
    var pane = h('div', { class: 'm3-pane wide' });
    pane.appendChild(steps(2));
    pane.appendChild(h('h2', { class: 'm3-h2' }, ['第二步　选定拟实施的场景组合']));
    pane.appendChild(h('p', { class: 'm3-p' }, [
      '企业级测算不是把单场景的账相加。多个场景同批实施时，账号可跨场景复用、同一个业务系统只对接一次、'
      + '配置能力可复用，同类效益也会在不同场景之间重复计算——这四处都会在测算中逐项归集。'
      + '本行业场景库共 ' + list.length + ' 个条目，按业务环节分组，勾选贵司本次拟立项的范围。'
    ]));

    // 组合摘要：选择的后果实时可见
    var sum = h('div', { class: 'm3-picksum' }, [
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['已选场景']), h('div', { class: 'v' }, [String(M.picks.length), h('small', {}, [' / 12'])])]),
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['实施批次']), h('div', { class: 'v' }, [pv ? String(pv.portfolio.waves.length) : '—', h('small', {}, [' 批'])])]),
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['总工期']), h('div', { class: 'v' }, [pv ? String(pv.portfolio.totalWeeks) : '—', h('small', {}, [' 周'])])]),
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['预估账号数']), h('div', { class: 'v' }, [pv ? String(pv.invest.seats) : '—', h('small', {}, [' 套'])])]),
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['命中效益杠杆']), h('div', { class: 'v' }, [
        String((function () { var s = {}; M.picks.forEach(function (x) { leversOf(x.sceneId).forEach(function (k) { s[k] = 1; }); }); return Object.keys(s).length; })()),
        h('small', {}, [' / 7 类'])])])
    ]);
    pane.appendChild(sum);

    pane.appendChild(h('div', { class: 'm3-quickpick' }, [
      h('span', {}, ['快速选择']),
      h('button', { class: 'qp', onclick: function () {
        M.picks = list.slice().sort(function (a, b) { return (b.value - a.value) || (a.weeks - b.weeks); }).slice(0, 4)
          .map(function (s) { return { sceneId: s.id, gain: (pickOf(s.id) || {}).gain || {} }; });
        draw();
      } }, ['价值最高的 4 个']),
      h('button', { class: 'qp', onclick: function () {
        M.picks = list.slice().filter(function (s) { return s.cost === '零' || s.cost === '轻'; })
          .sort(function (a, b) { return (b.value - a.value) || (a.weeks - b.weeks); }).slice(0, 4)
          .map(function (s) { return { sceneId: s.id, gain: (pickOf(s.id) || {}).gain || {} }; });
        draw();
      } }, ['先做轻投入的 4 个']),
      h('button', { class: 'qp', onclick: function () { M.picks = []; draw(); } }, ['清空'])
    ]));

    byStage.forEach(function (g) {
      pane.appendChild(h('h3', { class: 'm3-h3' }, [g.stage, h('span', { class: 'n' }, [g.items.length + ' 个场景'])]));
      pane.appendChild(h('div', { class: 'm3-scenes' }, g.items.map(function (s) {
        var on = isPicked(s.id);
        var lv = leversOf(s.id).map(function (k) { var d = leverDef(k); return d ? d.name : k; });
        return h('button', { class: 'sc' + (on ? ' on' : ''), onclick: function () { togglePick(s.id); draw(); } }, [
          h('div', { class: 'tick' }, [on ? '✓' : '']),
          h('div', { class: 'n' }, [s.name]),
          h('div', { class: 'm' }, [(s.user || '业务岗') + '　·　替代「' + trunc(s.replaces || '手工处理', 14) + '」']),
          h('div', { class: 'meta' }, [
            h('span', {}, ['上线 ' + s.weeks + ' 周']),
            h('span', {}, ['投入 ' + s.cost + ' 档']),
            h('span', { class: 'val' }, ['价值 ' + s.value + '/5'])
          ]),
          h('div', { class: 'l' }, lv.map(function (x) { return h('span', {}, [x]); }))
        ]);
      })));
    });

    pane.appendChild(h('div', { class: 'm3-act' }, [
      h('button', { class: 'btn ghost', onclick: function () { setStep('input'); } }, ['上一步']),
      M.picks.length ? null : h('span', { class: 'm3-cnt warn' }, ['请至少勾选 1 个场景']),
      h('button', { class: 'btn', disabled: !M.picks.length, onclick: function () { setStep('gain'); } },
        ['下一步：填收益参数' + (M.picks.length ? '（' + M.picks.length + ' 个场景）' : '')])
    ].filter(Boolean)));
    $root.appendChild(pane);
  }

  // ================= 屏 3：逐场景收益参数 =================
  function screenGain() {
    var pane = h('div', { class: 'm3-pane' });
    pane.appendChild(steps(3));
    var gap = gainGaps();
    pane.appendChild(h('h2', { class: 'm3-h2' }, ['第三步　逐场景填写收益参数']));
    pane.appendChild(h('p', { class: 'm3-p' }, [
      '每个场景各自命中的效益杠杆不同，所需参数也不同，下面只问用得上的那几个数。'
      + '本工具不对收益侧的核心参数设定默认值：留空的场景不参与收益测算，报告会逐项写明缺什么、缺在哪个场景。'
    ]));
    M.picks.forEach(function (x, idx) {
      var sc = sceneById(x.sceneId); if (!sc) return;
      var lv = leversOf(x.sceneId);
      var g = gainGapsOf(x);
      var card = h('div', { class: 'm3-lv' + (g.length ? '' : ' done') });
      card.appendChild(h('div', { class: 'hd' }, [
        h('span', { class: 'ix' }, [String(idx + 1)]),
        h('b', {}, [sc.name]),
        h('i', {}, [sc.stage + '　·　' + sc.roiBasis]),
        h('span', { class: 'st' + (g.length ? '' : ' ok') }, [g.length ? '还缺 ' + g.length + ' 项' : '已填齐'])
      ]));
      lv.forEach(function (k) {
        var d = leverDef(k); if (!d) return;
        card.appendChild(h('div', { class: 'cut' }, [h('b', {}, [d.name + '　']), d.cutNote]));
        d.fields.forEach(function (f) {
          card.appendChild(numRow(f.label, f.hint || '', x.gain[f.key] == null ? null : x.gain[f.key], f.unit, f.presets, function (v) {
            if (v == null) delete x.gain[f.key]; else x.gain[f.key] = v;
          }));
        });
        if (!d.cash) card.appendChild(h('div', { class: 'm3-hint' }, ['本项属非现金科目：除非释放工时被重新配置至产出性岗位，否则不构成可确认的现金流入，故不参与回收期测算，报告中单独列示。']));
      });
      pane.appendChild(card);
    });
    pane.appendChild(h('div', { class: 'm3-act' }, [
      h('button', { class: 'btn ghost', onclick: function () { setStep('scenes'); } }, ['上一步']),
      h('span', { class: 'm3-cnt' + (gap ? ' warn' : '') }, [gap ? '尚有 ' + gap + ' 项未填，留空的场景不计入收益' : '全部参数已填齐']),
      h('button', { class: 'btn', onclick: function () { setStep('plan'); } }, ['下一步：投入方案'])
    ]));
    $root.appendChild(pane);
  }

  // ================= 屏 4：投入方案 =================
  function screenPlan() {
    var P = C().prices;
    var pv = preview();
    var refCustom = pv ? pv.invest.customRefTotal : null;
    var pane = h('div', { class: 'm3-pane' });
    pane.appendChild(steps(4));
    pane.appendChild(h('h2', { class: 'm3-h2' }, ['第四步　投入方案']));
    pane.appendChild(h('p', { class: 'm3-p' }, [
      '价格取自定稿产品资料，未作调整。下列各项留空时按企业规模与本次场景组合推导参考值，'
      + '参考值在报告里逐处标注，企业填报值一律优先。'
    ]));
    if (pv) pane.appendChild(h('div', { class: 'm3-picksum' }, [
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['场景组合']), h('div', { class: 'v' }, [String(pv.portfolio.count), h('small', {}, [' 个'])])]),
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['首年现金支出']), h('div', { class: 'v' }, [fmt(pv.invest.cashYear1), h('small', {}, [' 元'])])]),
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['占营业收入']), h('div', { class: 'v' }, [pv.invest.revenueShare == null ? '—' : String(pv.invest.revenueShare), h('small', {}, [' %'])])]),
      h('div', { class: 'it' }, [h('div', { class: 'k' }, ['核验']), h('div', { class: 'v sm ' + (pv.invest.shareVerdict === 'in' ? 'ok' : 'warn') }, [
        pv.invest.shareVerdict === 'in' ? '与体量匹配' : (pv.invest.shareVerdict === 'low' ? '偏低' : (pv.invest.shareVerdict === 'high' ? '偏高' : '未启用'))])])
    ]));
    pane.appendChild(field('订阅版本', '按套年计价，全部场景共用账号', opts(P.subscription.map(function (t) {
      return { v: t.key, t: t.name, s: t.yearly ? t.yearly + ' 元 / 套年' : '0 元开通' };
    }), M.plan.tier, function (v) { M.plan.tier = v; })));
    pane.appendChild(numRow('订阅账号数',
      pv && M.plan.seats == null ? '留空则按规模与组合推导 ' + pv.invest.seats + ' 套（各场景人数按 ' + pv.portfolio.seatOverlap + ' 复用系数归并）' : '按实际开通账号数计列',
      M.plan.seats == null ? null : M.plan.seats, '套', [5, 12, 20, 30],
      function (v) { if (v == null) delete M.plan.seats; else M.plan.seats = v; }));
    pane.appendChild(field('专家入企 AI 诊断',
      pv && M.plan.diagnosisDays == null ? P.diagnosisPerDay + ' 元 / 天　留空则按 ' + pv.portfolio.count + ' 个场景建议 ' + pv.invest.diagnosisDays + ' 天' : P.diagnosisPerDay + ' 元 / 天',
      opts([{ v: null, t: '按建议计列', s: pv ? pv.invest.diagnosisDays + ' 天' : '—' },
            { v: 0, t: '暂不安排', s: '0 元' }, { v: 1, t: '1 天', s: P.diagnosisPerDay + ' 元' },
            { v: 2, t: '2 天', s: P.diagnosisPerDay * 2 + ' 元' }, { v: 3, t: '3 天', s: P.diagnosisPerDay * 3 + ' 元' }],
        M.plan.diagnosisDays == null ? null : M.plan.diagnosisDays,
        function (v) { if (v == null) delete M.plan.diagnosisDays; else M.plan.diagnosisDays = v; })));
    pane.appendChild(field('私域部署', '数据不出企业内网时选用，按一套部署计，不随账号数增加', opts(
      [{ v: null, t: '不需要', s: '—' }].concat(P.privateDeploy.map(function (x) { return { v: x.key, t: x.name, s: x.yearly + ' 元 / 套年' }; })),
      M.plan.privateDeploy == null ? null : M.plan.privateDeploy,
      function (v) { if (v == null) delete M.plan.privateDeploy; else M.plan.privateDeploy = v; })));
    pane.appendChild(numRow('另议项预算',
      refCustom != null && M.plan.customBudget == null
        ? '系统对接 / 定制开发 / 落地陪跑 / 数据整理　留空则按四科目推导 ' + fmt(refCustom) + ' 元'
        : '系统对接 / 定制开发 / 落地陪跑 / 历史数据整理',
      M.plan.customBudget == null ? null : M.plan.customBudget, '元',
      refCustom ? [0, Math.round(refCustom * 0.6 / 1000) * 1000, refCustom, Math.round(refCustom * 1.5 / 1000) * 1000] : [0, 50000, 150000, 300000],
      function (v) { if (v == null) delete M.plan.customBudget; else M.plan.customBudget = v; }));
    if (refCustom != null && M.plan.customBudget == null && pv) {
      pane.appendChild(h('div', { class: 'm3-hint' }, ['另议项按四个科目分别推导：'
        + pv.invest.customItems.map(function (x) { return x.name + ' ' + fmt(x.amount) + ' 元'; }).join('、')
        + '。多场景的协同已计入——系统接口去重、定制开发按 ' + pv.portfolio.devPerScene.map(function (x) { return x.factor; }).join(' / ') + ' 递减、数据整理只做一次。']));
    }
    pane.appendChild(h('h3', { class: 'm3-h3' }, ['实施节奏与内部投入']));
    pane.appendChild(field('数据现状', '决定上线周期倍率与历史数据整理工作量', opts([
      { v: 'paper', t: '纸质为主', s: '倍率 1.6' }, { v: 'scattered', t: '分散在多个系统', s: '1.3' },
      { v: 'excel', t: '表格管理', s: '1.15' }, { v: 'system', t: '系统内齐全', s: '1.0' }
    ], M.plan.dataState, function (v) { M.plan.dataState = v; })));
    pane.appendChild(field('每批同时上线的场景数',
      pv ? '当前 ' + pv.portfolio.count + ' 个场景将分 ' + pv.portfolio.waves.length + ' 批推进，总工期 ' + pv.portfolio.totalWeeks + ' 周' : '同批工期取该批最长者，批与批之间串行',
      opts([{ v: null, t: '按建议', s: '每批 2 个' }, { v: 1, t: '每批 1 个', s: '最稳' },
            { v: 2, t: '每批 2 个', s: '常规' }, { v: 3, t: '每批 3 个', s: '较快' }, { v: 4, t: '每批 4 个', s: '最快' }],
        M.plan.waveSize == null ? null : M.plan.waveSize,
        function (v) { if (v == null) delete M.plan.waveSize; else M.plan.waveSize = v; })));
    pane.appendChild(numRow('推进人员数', '负责数据准备与配置对接', M.plan.setupPeople, '人', [1, 2, 3, 5],
      function (v) { M.plan.setupPeople = v || 1; }));
    pane.appendChild(numRow('推进人员平均月薪', '用于工时的综合用工成本折算', M.plan.setupSalary, '元/月', [5500, 7500, 11000, 16000],
      function (v) { M.plan.setupSalary = v || 7500; }));

    var chk = core.compute(inputOf(), bundle());
    var errs = chk.ok ? [] : chk.errors.map(function (e) { return e.msg; });
    pane.appendChild(h('div', {}, [blocked(errs, '参数有误，无法进入测算台：')].filter(Boolean)));
    pane.appendChild(h('div', { class: 'm3-act' }, [
      h('button', { class: 'btn ghost', onclick: function () { setStep('gain'); } }, ['上一步']),
      h('button', { class: 'btn', disabled: !chk.ok, onclick: function () {
        var r = recompute();
        if (!r.ok) return;
        sh.charge(r.meta.credits); sh.setQrReady(false);
        M.base = null; M.baseSnap = null;
        setStep('board');
      } }, ['进入测算台'])
    ]));
    $root.appendChild(pane);
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


  // ================= 屏 4：测算台 =================
  // 三栏控制台：左「参数台」实时调参，中「结论台」主口径与基线对照，右「推演台」情景 / 敏感度 / 护栏。
  // 全部控件都走内核 compute()，屏上任何一个数字都能在报告里找到同名同值的出处。
  function snapshot() {
    return JSON.stringify({ plan: M.plan, picks: M.picks, cutMul: M.cutMul });
  }
  function boardRecalc() {
    var o = core.compute(inputOf(), bundle());
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
    if (b.plan.waveSize !== M.plan.waveSize) out.push('每批场景数');
    if ((b.picks || []).length !== M.picks.length) out.push('场景组合');
    var lab = fieldLabelMap();
    M.picks.forEach(function (x, i) {
      var b0 = (b.picks || [])[i];
      if (!b0 || b0.sceneId !== x.sceneId) { if (out.indexOf('场景组合') < 0) out.push('场景组合'); return; }
      Object.keys(x.gain).forEach(function (k) { if ((b0.gain || {})[k] !== x.gain[k]) out.push(lab[k] || k); });
    });
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
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
      h('button', { class: 'btn ghost', onclick: function () { setStep('plan'); } }, ['返回投入方案']),
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
    var iv0 = M.result.invest;
    var curSeats = function () { return M.plan.seats == null ? M.result.invest.seats : M.plan.seats; };
    var curDiag = function () { return M.plan.diagnosisDays == null ? M.result.invest.diagnosisDays : M.plan.diagnosisDays; };
    var curCustom = function () {
      if (M.plan.customBudget != null) return M.plan.customBudget;
      var line = M.result.invest.cashItems.filter(function (x) { return x.key === 'custom'; })[0];
      return line ? line.amount : 0;
    };
    var refTag = function (k) { return M.plan[k] == null ? '参考值' : null; };
    inv.appendChild(slider('seats', '订阅套数', refTag('seats'), 1, 40, 1,
      curSeats, function (v) { M.plan.seats = v; },
      function () { return curSeats() + ' 套'; }, function () { return !!b && b.plan.seats !== M.plan.seats; }));
    inv.appendChild(slider('diag', '诊断天数', refTag('diagnosisDays') || '1980 元 / 天', 0, 5, 1,
      curDiag, function (v) { M.plan.diagnosisDays = v; },
      function () { return curDiag() + ' 天'; }, function () { return !!b && b.plan.diagnosisDays !== M.plan.diagnosisDays; }));
    inv.appendChild(slider('custom', '另议项预算', refTag('customBudget') || '四科目合计',
      0, Math.max(200000, Math.round(curCustom() * 2.5 / 1000) * 1000), 2000,
      curCustom, function (v) { M.plan.customBudget = v; },
      function () { return fmt(curCustom()) + ' 元'; }, function () { return !!b && b.plan.customBudget !== M.plan.customBudget; }));
    inv.appendChild(h('h5', {}, ['数据现状']));
    inv.appendChild(seg([{ v: 'paper', t: '纸质' }, { v: 'scattered', t: '分散' }, { v: 'excel', t: '表格' }, { v: 'system', t: '系统' }],
      M.plan.dataState, function (v) { M.plan.dataState = v; }));
    inv.appendChild(h('div', { class: 'ghint' }, ['倍率 1.6 / 1.3 / 1.15 / 1.0，作用于场景基准上线周期。']));
    inv.appendChild(h('div', { class: 'ghint', style: 'margin-top:8px;border-top:1px solid var(--line2);padding-top:7px' }, [
      iv0.revenueShare == null ? '企业营业收入区间未知，投入合理性核验未启用。'
        : '首年现金支出占营业收入 ' + iv0.revenueShare + '%，常见区间 ' + iv0.shareBandLow + '–' + iv0.shareBandHigh + '%（'
          + (iv0.shareVerdict === 'in' ? '匹配' : (iv0.shareVerdict === 'low' ? '偏低，可能有科目未计列' : '偏高，建议分期实施')) + '）。'
    ]));
    inv.appendChild(slider('people', '推进人员数', null, 1, 8, 1,
      function () { return M.plan.setupPeople; }, function (v) { M.plan.setupPeople = v; },
      function () { return M.plan.setupPeople + ' 人'; }, function () { return !!b && b.plan.setupPeople !== M.plan.setupPeople; }));
    box.appendChild(inv);

    var gain = h('div', { class: 'card' }, [h('h4', {}, ['收益参数', h('span', {}, ['BENEFIT'])])]);
    gain.appendChild(h('h5', {}, ['场景开关']));
    gain.appendChild(h('div', { class: 'm3-toggles' }, M.picks.map(function (x) {
      var sc0 = sceneById(x.sceneId);
      return h('button', { class: 'tg' + (x.off ? '' : ' on'), onclick: function () {
        x.off = !x.off;
        var keep = M.picks.filter(function (y) { return !y.off; });
        if (!keep.length) { x.off = false; return; }
        if (boardRecalc()) refreshBoard();
      } }, [(x.off ? '○ ' : '● ') + trunc(sc0 ? sc0.name : x.sceneId, 9)]);
    })));
    gain.appendChild(h('div', { class: 'ghint' }, ['关掉某个场景即可看到它对组合回收期的实际贡献。至少保留一个场景。']));
    var anyG = false;
    M.picks.filter(function (x) { return !x.off; }).forEach(function (x) {
      var sc1 = sceneById(x.sceneId); if (!sc1) return;
      gain.appendChild(h('h5', {}, [sc1.name]));
      leversOf(x.sceneId).forEach(function (k) {
        var d = leverDef(k); if (!d) return;
        d.fields.forEach(function (f) {
          if (x.gain[f.key] == null) return;
          anyG = true;
          var lo = f.min != null ? f.min : 0, hi = f.max != null ? f.max : Math.max(1, x.gain[f.key] * 3);
          var st = f.type === 'int' ? 1 : (hi > 10000 ? 500 : (hi > 100 ? 1 : 0.05));
          gain.appendChild(slider('g_' + x.sceneId + '_' + f.key, f.label, f.unit, lo, hi, st,
            function () { return x.gain[f.key]; }, function (v) { x.gain[f.key] = v; },
            function () { return (Math.round(x.gain[f.key] * 100) / 100) + ' ' + (f.unit || ''); },
            function () {
              if (!b) return false;
              var b0 = (b.picks || []).filter(function (y) { return y.sceneId === x.sceneId; })[0];
              return !!b0 && (b0.gain || {})[f.key] !== x.gain[f.key];
            }));
        });
      });
    });
    if (!anyG) gain.appendChild(h('div', { class: 'ghint' }, ['收益端参数尚未填报，返回上一步补齐后方可在此调节。']));
    gain.appendChild(h('h5', {}, ['折减系数整体调节']));
    gain.appendChild(slider('cut', '折减系数', '× 基准值', 0.4, 1.6, 0.05,
      function () { return M.cutMul; }, function (v) { M.cutMul = Math.round(v * 100) / 100; },
      function () { return '× ' + M.cutMul.toFixed(2); }, function () { return !!b && b.cutMul !== M.cutMul; }));
    gain.appendChild(h('div', { class: 'ghint' }, ['折减系数反映工具可影响的部分占该事项全量的比例。下调即假定实际改善幅度低于基准取值，调整后报告同步按调整值出具。']));
    gain.appendChild(h('button', { class: 'reset', onclick: function () {
      if (!M.baseSnap) return;
      var s0 = JSON.parse(M.baseSnap);
      M.plan = JSON.parse(JSON.stringify(s0.plan)); M.picks = JSON.parse(JSON.stringify(s0.picks || [])); M.cutMul = s0.cutMul;
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
    else if (M.step === 'scenes') screenScenes();
    else if (M.step === 'gain') screenGain();
    else if (M.step === 'plan') screenPlan();
    else if (M.step === 'board') screenBoard();
    else if (M.step === 'report') screenReport();
    else { M.step = 'input'; screenInput(); }
  }

  window.DGG.registerModule('m3', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });

  // ================= 屏 5：报告 =================
  var CHAPTERS = [
    { no: '00', title: '阅读说明与口径声明', page: 2 }, { no: '01', title: '测算结论', page: 3 },
    { no: '02', title: '测算对象界定', page: 5 }, { no: '03', title: '投入测算', page: 7 },
    { no: '04', title: '收益测算', page: 11 }, { no: '05', title: '回收期测算', page: 15 },
    { no: '06', title: '情景分析', page: 18 }, { no: '07', title: '敏感度分析', page: 20 },
    { no: '08', title: '参数来源与可信度', page: 22 }, { no: '09', title: '数据缺口与补齐建议', page: 23 },
    { no: '10', title: '实施周期与效益释放', page: 24 }, { no: '11', title: '组织保障与职责分工', page: 25 },
    { no: '12', title: '服务与报价口径', page: 26 }, { no: '13', title: '测算复核触发条件', page: 27 },
    { no: 'A', title: '测算常量与公式', page: 28 }, { no: 'B', title: '方法与术语', page: 30 },
    { no: 'C', title: '场景基础数据', page: 31 }
  ];

  var CHC = {
    cover: ['#0A3A2E', '#11705A'], nav:  ['#123F2A', '#2A6B47'], quick: ['#0A3A2E', '#11705A'],
    prof:  ['#4A1F52', '#8E3D96'], cost: ['#6B1F1F', '#A83A3A'], gain:  ['#0A3F32', '#00875A'],
    pay:   ['#7A5B0C', '#C69A18'], scen: ['#4A1F52', '#8E3D96'], sens:  ['#6B1F1F', '#A83A3A'],
    conf:  ['#123F2A', '#2A6B47'], plan: ['#0A3C46', '#0E7A84'], app:   ['#1E2C26', '#3E5148']
  };
  function page3(chapter, r, key, cls) {
    var c = CHC[key] || CHC.nav;
    exEnter(chapter);
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
    add('02 测算对象', pProfile(r), { one: '企业基本情况、场景组合与测算单元' });
    add('', pWaves(r), { sub: '实施波次与上线顺序' });
    add('', pLevers(r), { sub: '效益杠杆识别' });
    add('03 投入测算', pCost1(r), { brief: true, one: '现金支出逐项计列、结构分析与发生期次' });
    add('', pCustom(r), { sub: '另议项逐项拆解' });
    add('', pSanity(r), { sub: '投入合理性核验' });
    add('', pCost2(r), { sub: '人工工时投入与上线周期' });
    add('04 收益测算', pGain1(r), { one: '效益杠杆建模、合并口径与两道护栏' });
    add('', pGain2(r), { sub: '逐项测算过程' });
    add('', pGain3(r), { sub: '逐场景贡献与组合结构' });
    add('', pGain4(r), { sub: '两种口径的累计净额对照' });
    add('05 回收期测算', pPay1(r), { brief: true, one: '累计净现金流、转正期次与双口径对照' });
    add('', pPay2(r), { sub: '24 期现金流分布' });
    add('', pPay3(r), { sub: '前 12 期逐期明细' });
    add('06 情景分析', pScen(r), { brief: true, one: '保守、中性、积极三档的回收期与净额' });
    add('', pScen2(r), { sub: '三档逐期对照' });
    add('07 敏感度分析', pSens(r), { one: '五项关键假设的单因素扰动与影响排序' });
    add('', pSens2(r), { sub: '敏感度的决策含义' });
    add('08 参数来源与可信度', pConf(r), { one: '逐项参数来源、可信度评分与复核建议' });
    add('09 数据缺口与补齐建议', pMissing(r), { one: '缺口清单、补齐路径与参数完整度核查' });
    add('10 实施周期与效益释放', pRamp(r), { one: '上线周期测算、过渡期爬坡与前置条件' });
    add('11 组织保障与职责分工', pRoles(r), { one: '三类角色的职责边界与时间投入' });
    add('12 服务与报价口径', pServices(r), { one: '已计列项目、可选服务与报价说明' });
    add('13 测算复核触发条件', pRetrigger(r), { one: '五种应重新测算的情形及其影响机理' });
    add('附录 A 测算常量与公式', pAppA(r), { one: '全部常量取值、七项效益杠杆公式与复算校验' });
    add('', pAppB(r), { sub: '24 期逐期明细' });
    add('附录 B 方法与术语', pAppC(r), { one: '测算方法说明、术语释义与口径声明' });
    add('附录 C 场景基础数据', pAppD(r), { one: '场景库字段与收益侧参考值，供口径追溯' });
    add('', pAppE(r), { sub: '投入侧规模推导表' });
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
  function payBasisLabel(r) { return r.payback != null ? '现金口径' : (r.paybackAll != null ? '含非现金口径' : '未转正'); }
  function payMonth(r) { return r.payback != null ? r.payback : r.paybackAll; }
  function pctOf(a, b) { return b ? (a / b * 100).toFixed(1) : '0.0'; }

  // 情景逐期流的本地复算（与内核 flowFor 同式，测试断言其 cum12 / cum24 与内核一致）
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
    var map = { revenueAnnual: '年度营业收入', grossMargin: '毛利率',
      seats: '订阅套数', diagnosisDays: '入企诊断天数', customBudget: '另议项预算', dataState: '数据现状' };
    LV().items.forEach(function (it) { it.fields.forEach(function (f) { map[f.key] = f.label; }); });
    return map;
  }
  var SRCNAME = { user: '企业填报', profile: '画像推定', benchmark: '参考值', none: '缺口', 'default': '内置缺省' };

  // ---------- 编号展品：图 N-M / 表 N-M ----------
  // 正式报告的图与表都有编号、图题和单位说明，正文可以直接写「见图 3-2」。
  // 编号按章重置，由 page3() 在每页开头登记本章号。
  var EX = { ch: '0', fig: 0, tbl: 0, last: null };
  function exEnter(no) {
    if (no == null) return;
    if (no !== EX.last) { EX.last = no; EX.fig = 0; EX.tbl = 0; }
    EX.ch = /^\d+$/.test(no) ? String(Number(no)) : no;   // 图表编号里的章号去掉前导零：03 → 3
  }
  function exHead(no, title, unit) {
    return h('div', { class: 'hd' }, [
      h('span', { class: 'no' }, [no]),
      h('span', { class: 't' }, [title]),
      unit ? h('span', { class: 'u' }, [unit]) : null
    ]);
  }
  function fig3(title, node, foot, unit) {
    EX.fig++;
    return h('div', { class: 'm3-ex' }, [
      exHead('图 ' + EX.ch + '-' + EX.fig, title, unit),
      h('div', { class: 'bd' }, [node]),
      foot ? h('div', { class: 'ft' }, [foot]) : null
    ]);
  }
  function tab3(title, node, foot, unit) {
    EX.tbl++;
    return h('div', { class: 'm3-ex tbl' }, [
      exHead('表 ' + EX.ch + '-' + EX.tbl, title, unit),
      h('div', { class: 'bd' }, [node]),
      foot ? h('div', { class: 'ft' }, [foot]) : null
    ]);
  }

  function pFront(r) {
    var p = h('section', { class: 'page m3-front' });
    var pm = payMonth(r), basis = payBasisLabel(r), iv = r.invest;
    p.appendChild(h('div', { class: 'hero' }, [
      CH.heroM3({ title: RT().reportTitle, en: RT().reportTitleEn }),
      h('img', { class: 'logo', src: sh.CFG.logo, alt: '顶呱呱' })
    ]));
    p.appendChild(h('div', { class: 'body' }, [
      h('div', { class: 'lead' }, [
        h('div', { class: 'big' }, [
          h('div', { class: 'lb' }, ['累计净现金流转正期次']),
          h('div', { class: 'v' }, [pm == null ? '>' + r.meta.horizon : '第 ' + pm, h('small', {}, ['期'])]),
          h('div', { class: 'basis' }, [basis])
        ]),
        h('div', { class: 'txt' }, [
          h('div', { class: 'hl' }, [r.verdict.headline]),
          h('div', { class: 'x' }, [r.verdict.text])
        ])
      ]),
      figs3([
        { k: '首年现金支出', v: money(iv.cashYear1), u: '元', s: '占营业收入 ' + (iv.revenueShare == null ? '—' : iv.revenueShare + '%'), neg: true },
        { k: '月度现金收益', v: money(r.benefit.cashMonthly), u: '元', s: '效益释放满额后', pos: true },
        { k: '非现金效益', v: money(r.benefit.hoursMonthly), u: '元/月', s: '人工工时节约，不计入回收期' },
        { k: '参数可信度', v: String(r.confidence.score), u: '分', s: r.confidence.name, hl: true }
      ], 4),
      h('div', { class: 'm3-two wl', style: 'margin-top:14px' }, [
        h('div', {}, [
          h('div', { class: 'm3-cap', style: 'margin:0 0 4px' }, ['测算对象']),
          rows3([
            row3('企业名称', r.profile.name, { b: true }),
            row3('场景组合', r.portfolio.count + ' 个场景', { b: true, i: trunc(r.portfolio.scenes.map(function (s) { return s.name; }).join('、'), 26) }),
            row3('实施安排', r.portfolio.waves.length + ' 批 · ' + r.portfolio.totalWeeks + ' 周', { i: iv.tierName + ' ' + iv.seats + ' 套' }),
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
    var p = page3('00', r, 'nav');
    var nUser = Object.keys(r.inputSource).filter(function (k) { return r.inputSource[k] === 'user'; }).length;
    var nRef = Object.keys(r.inputSource).length - nUser;
    return wrapPage(p, r, '阅读说明', '00', '阅读说明与口径声明', 'SCOPE AND BASIS', null, null, [
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [
          hh3('测算范围与科目划分', 'SCOPE'),
          h('div', { class: 'm3-lead' }, [RT().readingGuide.lead]),
          list3(RT().readingGuide.items)
        ]),
        h('div', {}, [
          hh3('本次测算要素', 'PARAMETERS'),
          rows3([
            row3('测算单元', '一次立项的场景组合', { i: r.portfolio.count + ' 个场景，分 ' + r.portfolio.waves.length + ' 批' }),
            row3('测算期', r.meta.horizon + ' 期'),
            row3('计量单位', '人民币元', { i: '取整至元' }),
            row3('命中效益杠杆', r.benefit.groups.length + ' 类', { i: '共七类' }),
            row3('参数总数', String(Object.keys(r.inputSource).length) + ' 项'),
            row3('企业填报 / 参考值', nUser + ' / ' + nRef + ' 项', { sum: true, neg: nRef > 0, pos: nRef === 0 })
          ])
        ])
      ]),
      fig3('报告结构与章节页次', CH.chapterMap(CHAPTERS, { total: 33 }),
        '正文十三章按投入、收益、回收期的顺序展开；附录三篇载常量、方法与场景原始数据，供口径追溯。', '共 33 页'),
      hh3('口径声明', 'BASIS OF PREPARATION'),
      list3(RT().honesty.items),
      fn3('本报告为基于企业当场填报参数的测算结果，不构成对实际经营成果的承诺或保证。报告由「薯片AI智能体 · 企业AI投入ROI测算器」生成，测算过程离线运行，不依赖外部数据接口。全部常量取值见附录 A。')
    ]);
  }

  function pQuick1(r) {
    var p = page3('01', r, 'quick');
    var pm = payMonth(r), iv = r.invest;
    return wrapPage(p, r, '01 测算结论', '01', '测算结论', 'CONCLUSION',
      pm == null ? '>' + r.meta.horizon : '第 ' + pm, payBasisLabel(r) + ' · 期', [
      figs3([
        { k: '投入 · 首年现金支出', v: money(iv.cashYear1), u: '元',
          s: '一次性 ' + pctOf(iv.cashOnce, iv.cashYear1) + '% · 次年续费 ' + money(iv.cashYearly) + ' 元', neg: true },
        { k: '收益 · 月度现金收益', v: money(r.benefit.cashMonthly), u: '元',
          s: r.portfolio.count + ' 个场景、' + r.benefit.groups.length + ' 类杠杆去重后', pos: true },
        { k: '回收期 · 转正期次', v: pm == null ? '>' + r.meta.horizon + ' 期' : '第 ' + pm + ' 期',
          s: payBasisLabel(r) + (r.scenarios[0].payback ? ' · 保守档第 ' + r.scenarios[0].payback + ' 期' : ' · 保守档期内未转正'), hl: true }
      ], 3),
      note3('总体结论', r.verdict.headline, r.verdict.text, r.payback == null),
      r.flow.length ? fig3('累计净现金流与转正期次', CH.paybackCurve(r.flow, r.payback),
        '纵轴为累计净现金流，零轴以上为已回收。第 1 期与第 13 期的下探为年度订阅费整额计列所致，未作月度摊销。', '元') : null,
      r.flow.length && r.benefit.cashMonthly > 0 ? h('div', { class: 'm3-two wl' }, [
        h('div', {}, [fig3('累计收益对首年现金支出的覆盖率', CH.recoveryShare(r.flow, iv.cashYear1),
          '越过金色虚线即累计收益已等于首年现金支出。', '%')]),
        h('div', {}, [tab3('核心指标', rows3(r.keyNumbers.slice(0, 3).map(function (k) {
          return row3(k.k, fmt(k.v) + ' ' + k.unit, { i: k.s });
        })))])
      ]) : tab3('核心指标', rows3(r.keyNumbers.slice(0, 4).map(function (k) {
        return row3(k.k, fmt(k.v) + ' ' + k.unit, { i: k.s });
      }))),
      basis3('回收期取累计净现金流首次由负转正的期次。' + C().rampNote)
    ]);
  }

  function pQuick2(r) {
    var p = page3('01', r, 'quick');
    return wrapPage(p, r, '01 测算结论', '01', '核心结论问答', 'KEY FINDINGS', null, null, [
      figs3(r.keyNumbers.slice(0, 4).map(function (k) {
        return { k: k.k, v: fmt(k.v), u: k.unit, s: k.s };
      }), 4),
      tab3('结论要项', tbl3([['项目'], ['结论'], ['说明']], r.quickView.map(function (q) {
        return [[q.q, 'b'], [q.a, 'b'], [q.text]];
      }))),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [fig3('收益科目构成', CH.cashVsHours(r.benefit.cashMonthly, r.benefit.hoursMonthly),
          '实心部分为现金科目，参与回收期测算；斜纹部分为非现金科目，单独列示。', '元 / 月')]),
        h('div', {}, [
          r.roi && !r.roi.meaningful
            ? note3('关于投报率', '本次比率指标不具备参考意义', r.roi.note, true)
            : (r.roi && r.roi.roi12 != null
              ? note3('投报率', '首年 ' + r.roi.roi12 + '%，两年 ' + r.roi.roi24 + '%',
                '分母为同期累计现金投入 ' + money(r.roi.inv12) + ' 元。该指标未作折现处理，仅作横向比较之用。')
              : null)
        ])
      ]),
      hh3('结论的适用边界', 'SCOPE OF CONCLUSION'),
      list3([
        '本结论以单一业务场景为测算单元，不代表企业整体信息化投入的回报水平；同时实施多个场景时，效益不可简单相加。',
        '全部金额按当期价目与企业填报参数计列，未作折现处理，亦未计列通货膨胀与人力成本自然增长的影响。',
        '测算期为 ' + r.meta.horizon + ' 期，超出测算期的效益不在本报告的确认范围之内。',
        '结论建立在实施按期完成、第 11 章所列三类角色按时到位的前提之上；前置条件未满足将同时延后效益释放与回收期。'
      ]),
      basis3('现金科目为实际发生的现金收支；非现金科目为人工工时节约，按综合用工成本折算后单独列示，不参与回收期测算。')
    ]);
  }

  function pProfile(r) {
    var p = page3('02', r, 'prof');
    var pf = r.portfolio;
    return wrapPage(p, r, '02 测算对象', '02', '测算对象与场景组合', 'SUBJECT AND PORTFOLIO',
      String(pf.count), '个 · 拟实施场景', [
      basis3('本报告的测算单元是企业一次立项的整批场景，不是单个场景。'
        + '组合与把单场景的账相加有五处不同：订阅账号跨场景复用、同一业务系统只对接一次、'
        + '配置能力可跨场景复用、入企诊断与历史数据整理只做一次、同类效益杠杆在场景之间去重。'
        + '这五处在第 03 与第 04 章逐项列示。'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [tab3('企业基本情况', rows3([
          row3('企业名称', r.profile.name, { b: true }),
          row3('所属行业', sh.industryNameOf(r.profile.industry) || '—'),
          row3('人员规模', r.profile.size ? sh.optText('size', r.profile.size) : '—'),
          row3('营业收入区间', r.profile.revenue ? sh.optText('revenue', r.profile.revenue) : '—'),
          row3('客户结构', r.profile.customers ? sh.optText('customers', r.profile.customers) : '—'),
          row3('在用业务系统', (r.profile.systems || []).length ? r.profile.systems.map(function (x) { return sh.optText('systems', x) || x; }).join('、') : '无')
        ]))]),
        h('div', {}, [tab3('组合概览', rows3([
          row3('场景数', pf.count + ' 个', { b: true }),
          row3('覆盖业务环节', (function () { var s = {}; pf.scenes.forEach(function (x) { s[x.stage] = 1; }); return Object.keys(s).length; })() + ' 个',
            { i: (function () { var s = []; pf.scenes.forEach(function (x) { if (s.indexOf(x.stage) < 0) s.push(x.stage); }); return s.join('、'); })() }),
          row3('命中效益杠杆', r.benefit.groups.length + ' 类', { i: '共七类' }),
          row3('实施批次', pf.waves.length + ' 批', { i: '每批 ' + pf.waveSize + ' 个' }),
          row3('总工期', pf.totalWeeks + ' 周', { i: '含数据现状系数 ' + r.invest.dataStateMult }),
          row3('订阅账号数', r.invest.seats + ' 套', { sum: true, i: r.invest.seatsSource === 'benchmark' ? '规模参考值' : '企业填报' })
        ]))])
      ]),
      tab3('场景清单',
        tbl3([['序', 'c'], ['场景'], ['业务环节'], ['使用角色'], ['上线周期', 'c'], ['投入档', 'c'], ['价值分级', 'c'], ['效益杠杆']],
          pf.scenes.map(function (x, i) {
            return [[String(i + 1), 'c'], [x.name, 'b'], [x.stage || '—'], [x.user || '—'],
              [x.weeks + ' 周', 'c'], [x.cost, 'c'], [x.value + '/5', 'c'],
              [x.levers.map(function (k) { var d = leverDef(k); return d ? d.name : k; }).join('、')]];
          })),
        '清单按价值分级降序、上线周期升序排列，该顺序同时决定实施批次与各场景的上线期次。'),
      pf.generic ? note3('口径提示', '本次按通用轻量场景口径测算', '未指定具体场景，效益仅按沟通与查找环节的人工工时节约建模，参数可信度已扣减 ' + C().confidence.penalty.genericScene + ' 分。', true) : null,
      fn3('场景库字段对同行业大类的全部企业一致，不随企业填报参数变化，全部字段见附录 C。')
    ]);
  }

  function pWaves(r) {
    var p = page3('02', r, 'prof');
    var pf = r.portfolio;
    var phases = pf.waves.map(function (w) {
      return { name: '第 ' + w.no + ' 批', weeks: w.weeks, duty: w.sceneNames.join('、') };
    });
    return wrapPage(p, r, '02 测算对象', '02', '实施波次与上线顺序', 'IMPLEMENTATION WAVES',
      String(pf.totalWeeks), '周 · 总工期', [
      basis3('场景按价值分级降序、上线周期升序排序，每批同时推进 ' + pf.waveSize + ' 个；同批工期取该批最长者，批与批之间串行。'
        + '效益因此不是同时开始释放，而是随各批上线逐步叠加。'),
      fig3('实施批次与工期分配', CH.weeksGantt(phases, pf.totalWeeks),
        '每批的工期取该批最长场景的上线周期乘以数据现状系数 ' + r.invest.dataStateMult + '，批与批之间串行推进。', '周'),
      tab3('各批场景与上线期次',
        tbl3([['批次', 'c'], ['场景'], ['本批工期', 'c'], ['起止周', 'c'], ['效益起算期次', 'c']],
          pf.waves.map(function (w) {
            return [['第 ' + w.no + ' 批', 'b c'], [trunc(w.sceneNames.join('、'), 24)], [w.weeks + ' 周', 'c'],
              ['第 ' + w.startWeek + ' – ' + w.endWeek + ' 周', 'c'], ['第 ' + w.startMonth + ' 期', 'c b']];
          })),
        '效益起算期次为该批完成后的当期，各场景自该期起按 ' + C().rampMonths.map(function (x) { return Math.round(x * 100) + '%'; }).join(' / ') + ' 逐期释放。'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('分批的代价与收益', 'TRADE-OFF'), list3([
          '首批从第 ' + pf.waves[0].startMonth + ' 期起产生效益，末批从第 ' + pf.waves[pf.waves.length - 1].startMonth + ' 期起，相差 '
            + (pf.waves[pf.waves.length - 1].startMonth - pf.waves[0].startMonth) + ' 期——这是回收期被拉长的主要原因，也是分批的直接代价。',
          '与之相对，分批降低了同期的资源占用：推进人员不必同时对接 ' + pf.count + ' 个场景的业务规则与数据口径。每批场景数可在测算台现场调整。'
        ])]),
        h('div', {}, [tab3('上线顺序的依据', rows3(pf.scenes.slice(0, 4).map(function (x, i) {
          return row3((i + 1) + '　' + trunc(x.name, 8), '第 ' + x.startMonth + ' 期起',
            { i: '价值 ' + x.value + '/5' });
        })), pf.scenes.length > 4 ? '其余 ' + (pf.scenes.length - 4) + ' 个场景的顺序见上表。' : null)])
      ])
    ]);
  }

  function pLevers(r) {
    var p = page3('02', r, 'prof');
    var used = [];
    r.portfolio.scenes.forEach(function (x) { x.levers.forEach(function (k) { if (used.indexOf(k) < 0) used.push(k); }); });
    return wrapPage(p, r, '02 测算对象', '02', '效益杠杆识别', 'LEVER IDENTIFICATION', null, null, [
      basis3('效益杠杆依据各场景库所载的折算口径逐个识别。同一类杠杆被多个场景命中时，'
        + '在第 04 章按测算金额降序去重：金额最高的场景全额计列，其余各场景按 '
        + Math.round(C().overlapDiscount * 100) + '% 计列——同一批人的同一段时间、同一笔返工成本不能算两遍。'),
      fig3('七项效益杠杆的命中情况与折减系数', CH.cutScale(LV().items, used),
        '深色条为本次组合命中的杠杆，浅色条为未命中项。条长为折减系数，即工具可影响的部分占该事项全量的比例。', '%'),
      tab3('杠杆与场景的对应关系',
        tbl3([['效益杠杆'], ['效益来源'], ['折减系数', 'c'], ['科目', 'c'], ['命中场景'], ['命中数', 'c']],
          LV().items.filter(function (d) { return used.indexOf(d.key) >= 0; }).map(function (d) {
            var hit = r.portfolio.scenes.filter(function (x) { return x.levers.indexOf(d.key) >= 0; });
            return [[d.name, 'b'], [d.money], [Math.round(d.cut * 100) + '%', 'c'],
              [d.cash ? '现金' : '非现金', 'c ' + (d.cash ? 'pos' : '')],
              [hit.map(function (x) { return x.name; }).join('、')], [String(hit.length), 'c b']];
          })),
        '命中数大于 1 的杠杆会在第 04 章触发跨场景去重。'),
      hh3('未命中杠杆的说明', 'LEVERS NOT APPLICABLE'),
      h('div', { class: 'm3-lead' }, ['未命中的杠杆不表示本企业不存在该项损失，而是本次组合内的场景作用路径不经过该项。'
        + '后续新增场景时可能命中不同的杠杆组合，届时需按新的组合重新测算，不可沿用本报告结论。']),
      list3(LV().items.filter(function (x) { return used.indexOf(x.key) < 0; }).slice(0, 4).map(function (x) {
        return x.name + '：' + x.money + '。本次组合不经过该路径，故不予计列。';
      }))
    ]);
  }
  function pCost1(r) {
    var p = page3('03', r, 'cost');
    var iv = r.invest;
    return wrapPage(p, r, '03 投入测算', '03', '投入测算', 'CAPITAL EXPENDITURE',
      money(iv.cashYear1), '元 · 首年现金支出', [
      figs3([
        { k: '订阅费用', v: money(iv.cashItems[0].amount), u: '元', s: iv.tierName + ' ' + iv.seats + ' 套 / 年' },
        { k: '一次性支出', v: money(iv.cashOnce), u: '元', s: '占首年 ' + pctOf(iv.cashOnce, iv.cashYear1) + '%', neg: true },
        { k: '次年起续费', v: money(iv.cashYearly), u: '元', s: '仅订阅类科目继续发生' },
        { k: '占营业收入', v: iv.revenueShare == null ? '—' : String(iv.revenueShare), u: '%',
          s: '常见区间 ' + iv.shareBandLow + '–' + iv.shareBandHigh + '%', hl: true }
      ], 4),
      tab3('投入科目逐项计列',
        tbl3([['科目'], ['计价口径'], ['发生期次', 'c'], ['金额', 'n'], ['占比', 'n']],
          iv.cashItems.map(function (x) {
            return [[x.name, 'b'], [x.detail], [x.yearly ? '第 1 / 13 期' : '第 1 期', 'c'],
              ['−' + fmt(x.amount), 'n neg'], [pctOf(x.amount, iv.cashYear1) + '%', 'n']];
          }).concat([[['首年合计', 'b'], ['—'], ['—', 'c'], ['−' + fmt(iv.cashYear1), 'n b neg'], ['100.0%', 'n b']]])),
        '订阅类科目在第 1 期与第 13 期整额计列，未采用月度摊销口径；摊销会使累计净额提前转正，与合同实际付款节奏不符。', '元'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [fig3('投入结构', CH.investStack(iv.cashItems),
          '一次性支出占首年现金支出的 ' + pctOf(iv.cashOnce, iv.cashYear1) + '%。', '元')]),
        h('div', {}, [fig3('发生期次分布', CH.costTiming(iv.cashOnce, iv.cashYearly),
          '第 1 期计列全部一次性支出与首年订阅，第 13 期计列续费，其余各期无现金支出。', '元')])
      ]),
      tab3('首年与次年投入对照',
        tbl3([['期间'], ['一次性支出', 'n'], ['订阅费用', 'n'], ['合计', 'n'], ['占两年投入', 'n']], [
          [['首年（第 1 至 12 期）', 'b'], ['−' + fmt(iv.cashOnce), 'n neg'], ['−' + fmt(iv.cashYearly), 'n neg'],
            ['−' + fmt(iv.cashYear1), 'n b neg'], [pctOf(iv.cashYear1, iv.cashYear1 + iv.cashYearly) + '%', 'n']],
          [['次年（第 13 至 24 期）'], ['—', 'n'], ['−' + fmt(iv.cashYearly), 'n neg'],
            ['−' + fmt(iv.cashYearly), 'n b neg'], [pctOf(iv.cashYearly, iv.cashYear1 + iv.cashYearly) + '%', 'n']],
          [['两年合计', 'b'], ['−' + fmt(iv.cashOnce), 'n neg'], ['−' + fmt(iv.cashYearly * 2), 'n neg'],
            ['−' + fmt(iv.cashYear1 + iv.cashYearly), 'n b neg'], ['100.0%', 'n b']]
        ]),
        '一次性支出仅在首年发生，次年起的现金支出降至 ' + fmt(iv.cashYearly) + ' 元，为首年的 '
          + pctOf(iv.cashYearly, iv.cashYear1) + '%。', '元'),
      iv.seatsSource === 'benchmark'
        ? fn3('订阅套数 ' + iv.seats + ' 套为参考值，按企业人员规模「' + (r.profile.size ? sh.optText('size', r.profile.size) : '未知')
          + '」与各场景投入档取值后，按复用系数 ' + r.portfolio.seatOverlap + ' 归并——一个账号可使用全部已开通场景。诊断天数按场景数量分档。企业填报值优先，取值全表见附录 C。')
        : fn3('订阅套数与诊断天数均由企业填报。价格取自《薯片AI智能体》定稿产品资料，未作调整。')
    ]);
  }

  function pCustom(r) {
    var p = page3('03', r, 'cost');
    var iv = r.invest, items = iv.customItems || [];
    var custom = items.reduce(function (a, b) { return a + b.amount; }, 0);
    return wrapPage(p, r, '03 投入测算', '03', '另议项逐项拆解', 'NEGOTIATED ITEMS',
      money(custom), '元 · 另议项合计', [
      basis3('另议项是投入侧金额最大、也最容易被整体带过的一栏。本报告不把它作为一个总额列示，而是拆成四个各有推导依据的科目：'
        + '每一项都由已知字段算出——在用系统数量、场景投入档、上线周期、数据现状——从而可以逐项复核，也可以逐项谈价。'),
      items.length ? tab3('另议项科目明细',
        tbl3([['科目'], ['推导依据'], ['计算口径'], ['金额', 'n'], ['占另议项', 'n']],
          items.map(function (x) {
            return [[x.name, 'b'], [x.basis], [x.detail], ['−' + fmt(x.amount), 'n neg'], [pctOf(x.amount, custom) + '%', 'n']];
          }).concat([[['另议项合计', 'b'], ['—'], ['—'], ['−' + fmt(custom), 'n b neg'], ['100.0%', 'n b']]])),
        iv.customOverridden
          ? '企业填报另议项总额 ' + fmt(custom) + ' 元，与规模推导参考值 ' + fmt(iv.customRefTotal) + ' 元相差 '
            + fmt(Math.abs(custom - iv.customRefTotal)) + ' 元；上表四个科目按参考构成等比缩放，明细与合计始终一致。'
          : '本次另议项未由企业填报，四个科目均按规模推导表取参考值，合计 ' + fmt(iv.customRefTotal) + ' 元。实际以方案报价为准。', '元')
        : h('div', { class: 'm3-lead' }, ['本场景无系统依赖、投入档为零档且数据已在系统内，四个另议科目的推导金额均为 0，故本次未计列另议项。']),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('逐项推导说明', 'DERIVATION'), list3([
          '系统对接取全部 ' + r.portfolio.count + ' 个场景的数据依赖并集，再与企业在用系统求交集。本组合依赖 '
            + ((r.portfolio.depUnion || []).length ? r.portfolio.depUnion.map(function (x) { return sh.optText('systems', x) || x; }).join('、') : '无特定系统')
            + '，命中 ' + (iv.hitSystems || []).length + ' 个接口。多个场景依赖同一系统时该接口只计列一次，这是同批实施最主要的成本节约来源。',
          '定制开发与配置按各场景投入档取基数、按企业规模调整，再按测算金额降序乘以复用递减系数 ' + (r.portfolio.devPerScene || []).map(function (x) { return x.factor; }).join(' / ') + '——业务规则引擎、表单与报表框架、权限模型可跨场景复用。',
          '落地陪跑按分批上线的总工期 ' + iv.setupWeeks + ' 周逐周计列，含配置陪同、使用培训、试运行期问题响应与效益数据复盘。',
          '历史数据整理按企业规模取基数、按数据现状系数 ' + iv.dataPrepFactor + ' 调整，为全企业一次性投入，不随场景数量增加。'
        ])]),
        h('div', {}, [hh3('为什么要拆开', 'WHY ITEMISED'), h('div', { class: 'm3-lead' }, [
          '另议项计列为 0 或凭印象填一个整数，是投入侧最常见的两种失真。前者使回收期系统性偏短，'
          + '后者使结论无法复核。拆成四个有推导依据的科目之后，谈判桌上可以逐项核对范围，实施阶段也可以逐项验收。'
        ]), items.length ? rows3(items.map(function (x) {
          return row3(x.name, fmt(x.amount) + ' 元',
            iv.customOverridden ? { i: '参考 ' + fmt(x.refAmount) } : null);
        })) : null])
      ]),
      fn3('另议项金额以实际方案报价为准。本页金额用于测算，不构成报价。')
    ]);
  }

  function pSanity(r) {
    var p = page3('03', r, 'cost');
    var iv = r.invest;
    var vd = iv.shareVerdict;
    var bandRows = [
      ['明显偏低', '< ' + iv.shareBandLow + '%', '通常意味着系统对接或落地陪跑未计列，回收期会系统性偏短'],
      ['常见区间', iv.shareBandLow + '% – ' + iv.shareBandHigh + '%', '投入总额与企业体量匹配，测算结论可直接用于决策讨论'],
      ['明显偏高', '> ' + iv.shareBandHigh + '%', '需复核场景范围是否过大，或按阶段拆分实施']
    ];
    return wrapPage(p, r, '03 投入测算', '03', '投入合理性核验', 'SANITY CHECK',
      iv.revenueShare == null ? '—' : String(iv.revenueShare), '% · 占营业收入', [
      basis3('一份投入测算最容易出错的地方不是单价，而是漏项。本页用一个与单价无关的口径做交叉核验：'
        + '首年现金支出占企业年度营业收入的比重。该比重若明显低于同类项目的常见区间，通常说明有科目没有计列，'
        + '而不是说明这笔投入特别划算。'),
      iv.revenueShare == null
        ? note3('核验未启用', '企业营业收入区间未知', '营业收入是本项核验的分母。补充该字段后可启用本页核验，同时可启用第 04 章的营收封顶护栏。', true)
        : fig3('首年现金支出占营业收入的位置', CH.shareGauge(iv.revenueShare, iv.shareBandLow, iv.shareBandHigh),
          iv.shareText, '%'),
      tab3('核验区间与含义', tbl3([['区间'], ['占营业收入', 'c'], ['含义'], ['本次', 'c']],
        bandRows.map(function (x, i) {
          var on = (i === 0 && vd === 'low') || (i === 1 && vd === 'in') || (i === 2 && vd === 'high');
          return [[x[0], on ? 'b' : ''], [x[1], 'c'], [x[2]],
            [on ? '本次落于此' : '—', 'c' + (on ? (i === 1 ? ' pos' : ' neg') : '')]];
        }))),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('核验口径', 'BASIS OF THE CHECK'), list3([
          '分子为首年现金支出 ' + fmt(iv.cashYear1) + ' 元，不含内部人工工时投入——工时不产生现金流出，计入会高估投入规模。',
          '分母为按企业营业收入区间取中值的年度营业收入 ' + (r.revenueAnnual ? fmt(r.revenueAnnual) + ' 元' : '未知') + '。区间取中值会带来偏差，故本项只作量级核验，不作精确判断。',
          '区间按单一场景计。同时实施多个场景时，应按各场景分别核验，而不是把总投入与总营收相除。',
          '本项核验不替代第 07 章的敏感度分析：前者判断投入总额的量级是否成立，后者判断单项假设的变动对结论的影响。'
        ])]),
        h('div', {}, [hh3('核验结论', 'FINDING'),
          note3(vd === 'in' ? '通过' : (vd === 'low' ? '需补齐' : '需复核'),
            vd === 'in' ? '投入总额与企业体量匹配'
              : (vd === 'low' ? '投入总额低于同类项目常见区间' : '投入总额高于同类项目常见区间'),
            iv.shareText, vd !== 'in')])
      ]),
      fn3('常见区间取自顶呱呱在政企服务中接触到的项目分布，非统计调查数据，仅用于量级核验。')
    ]);
  }

  function pCost2(r) {
    var p = page3('03', r, 'cost');
    var iv = r.invest, w = C().work;
    return wrapPage(p, r, '03 投入测算', '03', '人工工时投入', 'INTERNAL LABOUR',
      money(iv.laborYear1), '元 · 首年折算', [
      note3('科目划分', '人工工时投入单独立项，不并入现金口径', '上线期与日常运维占用企业自有人力，构成实际资源占用，但不产生现金流出。与现金科目合并计列将同时扭曲投入端与回收期，故单独列示。'),
      tab3('工时投入测算', tbl3([['项目'], ['投入口径'], ['工时', 'n'], ['折算金额', 'n']], iv.laborItems.map(function (x) {
        return [[x.name, 'b'], [x.detail], [x.hours + ' 小时', 'n'], [fmt(x.amount) + (x.monthly ? ' 元/月' : ' 元'), 'n b']];
      }).concat([[['首年合计', 'b'], ['上线期一次性 + 运维 12 期'], ['—', 'n'], [fmt(iv.laborYear1) + ' 元', 'n b']]]))),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [tab3('综合用工成本折算', rows3([
          row3('推进人员月薪', fmt(r.plan.setupSalary) + ' 元'),
          row3('综合用工系数', '× ' + w.laborBurden, { i: w.laborBurdenNote }),
          row3('月度工时基数', w.daysPerMonth + ' 日 × ' + w.hoursPerDay + ' 小时'),
          row3('折算综合时薪', iv.setupHourly + ' 元/小时', { sum: true })
        ]))]),
        h('div', {}, [tab3('上线周期测算', rows3([
          row3('场景批次', r.portfolio.waves.length + ' 批', { i: '每批 ' + r.portfolio.waveSize + ' 个场景' }),
          row3('各批基准周期合计', r.portfolio.waves.map(function (x) { return Math.round(x.weeks / iv.dataStateMult * 10) / 10; }).join(' + ') + ' 周', { i: '取各批最长场景' }),
          row3('数据现状系数', '× ' + iv.dataStateMult, { i: '按在用系统与数据组织形式' }),
          row3('测算总工期', iv.setupWeeks + ' 周', { sum: true })
        ]))])
      ]),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [fig3('工时投入的期次分布',
          CH.laborTiming(iv.laborItems[0].amount, iv.runLaborMonthly, iv.setupWeeks / 4.35),
          '上线期工时集中发生于前 ' + Math.ceil(iv.setupWeeks / 4.35) + ' 期，运行期按月度持续计列。', '元')]),
        h('div', {}, [hh3('与现金口径的关系', 'RELATION TO CASH'), list3([
          '内部工时不产生现金流出，故不进入回收期测算的支出侧。',
          '该科目揭示实施的真实资源占用：首年折算 ' + fmt(iv.laborYear1) + ' 元，相当于现金支出的 ' + pctOf(iv.laborYear1, iv.cashYear1) + '%。',
          '角色到位情况直接影响该科目的实际发生额，职责分工见第 11 章。'
        ])])
      ]),
      basis3('综合用工系数取 ' + w.laborBurden + '，涵盖社会保险、住房公积金等工资外用工支出。月度工时基数取 ' + w.daysPerMonth + ' 日，系年工作日 250 日按 12 个月折算的常用口径。')
    ]);
  }

  function pGain1(r) {
    var p = page3('04', r, 'gain');
    var b = r.benefit;
    return wrapPage(p, r, '04 收益测算', '04', '收益测算', 'BENEFIT MODELLING',
      money(b.cashMonthly), '元/月 · 现金口径', [
      basis3('收益按两层折减合并，缺一层都会把企业级收益算高。'
        + '场景内：同一场景命中多条杠杆时，不同路径往往指向同一笔损失，按测算金额降序，最高全额、其余按 '
        + Math.round(C().overlapDiscount * 100) + '% 计列。'
        + '跨场景：同一类杠杆在多个场景命中时，节约的是同一批人的同一段时间，同样按金额降序去重。'
        + '本次跨场景去重共扣减 ' + fmt(b.crossDiscount) + ' 元/月。'),
      b.groups.length ? tab3('按效益杠杆归组的跨场景去重',
        tbl3([['效益杠杆'], ['命中场景数', 'c'], ['科目', 'c'], ['去重前', 'n'], ['去重扣减', 'n'], ['计列值', 'n']],
          b.groups.map(function (g) {
            return [[g.name, 'b'], [String(g.scenes), 'c'], [g.cash ? '现金' : '非现金', 'c ' + (g.cash ? 'pos' : '')],
              [fmt(g.gross), 'n'], [g.gross - g.counted ? '−' + fmt(g.gross - g.counted) : '—', 'n' + (g.gross - g.counted ? ' neg' : '')],
              [fmt(g.counted), 'n b']];
          }).concat([[['合计', 'b'], [String(r.portfolio.count), 'c'], ['—', 'c'],
            [fmt(b.rawMonthly), 'n b'], ['−' + fmt(b.crossDiscount), 'n b neg'], [fmt(b.afterCross), 'n b']]])),
        '去重前为各场景内合并并经价值系数折算后的金额；命中场景数为 1 的杠杆不发生跨场景去重。', '元 / 月')
        : note3('参数不足', '收益科目关键参数未填报', '本次仅出具投入侧测算，缺口清单见第 09 章。', true),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [tab3('合并口径与营收封顶', rows3([
          row3('各场景合并（含场景内折减与价值系数）', fmt(b.rawMonthly) + ' 元/月'),
          row3('跨场景同类杠杆去重', '−' + fmt(b.crossDiscount) + ' 元/月', { neg: true }),
          row3('去重后合并', fmt(b.afterCross) + ' 元/月'),
          b.capMonthly != null
            ? row3('营收封顶线', fmt(b.capMonthly) + ' 元/月', { i: '年营收 ' + Math.round(C().caps.revenueShare * 100) + '% 折月，' + (r.capped ? '本次已触顶' : '本次未触及') })
            : row3('营收封顶', '未启用', { i: '企业营业收入区间未知' }),
          row3('计列月度收益', fmt(b.fullMonthly) + ' 元/月', { sum: true, pos: true })
        ]))]),
        h('div', {}, [fig3('收益科目构成', CH.cashVsHours(b.cashMonthly, b.hoursMonthly),
          '实心部分为现金科目，参与回收期测算；斜纹部分为非现金科目，单独列示。', '元 / 月')])
      ]),
      basis3(RT().method.overlap),
      r.capped ? note3('封顶提示', '合并收益已触及营收封顶线，超出部分未予确认', '营收封顶按企业年度营业收入的 ' + Math.round(C().caps.revenueShare * 100) + '% 折月计列，作用于全部场景合计，用于规避输入参数偏大时产生失真的测算结果。', true) : null
    ]);
  }

  function pGain2(r) {
    var p = page3('04', r, 'gain');
    var its = r.benefit.items;
    return wrapPage(p, r, '04 收益测算', '04', '逐场景逐项测算过程', 'ITEM-LEVEL CALCULATION', null, null, [
      its.length ? tab3('逐（场景 × 杠杆）测算明细',
        tbl3([['场景'], ['效益杠杆'], ['测算式'], ['测算值', 'n'], ['场景内', 'c'], ['价值系数', 'c'], ['跨场景', 'c'], ['计列值', 'n']],
          its.map(function (x) {
            return [[trunc(x.sceneName, 8), 'b'], [x.name + (x.cash ? '' : '（非现金）')], [x.basis],
              [fmt(x.monthly), 'n'], [x.inSceneWeight === 1 ? '全额' : Math.round(x.inSceneWeight * 100) + '%', 'c'],
              ['×' + x.valueFactor, 'c'],
              [x.crossWeight === 1 ? '全额' : Math.round(x.crossWeight * 100) + '%', 'c'],
              [fmt(x.final), 'n b ' + (x.cash ? 'pos' : '')]];
          })),
        '测算值为按企业填报参数直接算出的月度金额；计列值为依次经场景内折减、场景价值系数、跨场景去重与营收封顶后的结果。', '元 / 月')
        : h('div', { class: 'm3-lead' }, ['本次无可测算的效益杠杆。']),
      its.length ? fig3('测算式的数值代入', CH.formulaFlow(its.slice().sort(function (a, b) { return b.monthly - a.monthly; }).slice(0, 3)),
        '方块为代入的参数值，右端为该项的月度测算金额。仅列示金额最高的前 ' + Math.min(3, its.length) + ' 项，其余各项的测算式见上表。') : null,
      hh3('折减系数取值依据', 'DISCOUNT FACTORS'),
      (function () {
        var seen = {}, out = [];
        its.forEach(function (x) { if (seen[x.key]) return; seen[x.key] = 1; out.push(x); });
        return h('div', {}, out.slice(0, 3).map(function (x) {
          return h('div', { class: 'm3-basis', style: 'margin-top:7px' }, [h('b', {}, [x.name + '　']), x.cutNote]);
        }));
      })(),
      fn3('折减系数反映工具可影响的部分占该事项全量的比例，非效率提升幅度。各系数取值见附录 A 常量表。')
    ]);
  }

  function pGain3(r) {
    var p = page3('04', r, 'gain');
    var pf = r.portfolio;
    return wrapPage(p, r, '04 收益测算', '04', '逐场景贡献与组合结构', 'SCENE CONTRIBUTION', null, null, [
      basis3('下表把组合的月度现金收益拆回到各个场景。份额高的场景决定回收期，'
        + '份额低且上线周期长的场景则在拉长总工期的同时贡献有限——这类场景适合放到第二批或下一次立项。'),
      fig3('各场景的现金收益贡献', CH.contribBars(pf.scenes),
        '条长为该场景计列的月度现金收益，灰色段为其非现金部分；右侧为占组合现金收益的份额。', '元 / 月'),
      tab3('逐场景贡献明细',
        tbl3([['场景'], ['批次', 'c'], ['上线期次', 'c'], ['价值系数', 'c'], ['现金收益', 'n'], ['非现金', 'n'], ['占组合', 'n']],
          pf.scenes.map(function (x) {
            return [[x.name, 'b'], ['第 ' + x.wave + ' 批', 'c'], ['第 ' + x.startMonth + ' 期', 'c'],
              ['×' + x.valueFactor, 'c'], [fmt(x.cashMonthly), 'n pos'], [fmt(x.hoursMonthly), 'n'],
              [x.share + '%', 'n b']];
          }).concat([[['合计', 'b'], ['—', 'c'], ['—', 'c'], ['—', 'c'],
            [fmt(r.benefit.cashMonthly), 'n b pos'], [fmt(r.benefit.hoursMonthly), 'n b'], ['100%', 'n b']]])),
        '各场景现金收益之和等于组合月度现金收益，取整误差不超过场景数。', '元 / 月'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('组合结构判读', 'READING'), list3((function () {
          var top = pf.scenes.slice().sort(function (a, b) { return b.cashMonthly - a.cashMonthly; })[0];
          var tail = pf.scenes.slice().sort(function (a, b) { return a.cashMonthly - b.cashMonthly; })[0];
          var out = [];
          if (top) out.push('「' + top.name + '」贡献 ' + top.share + '% 的现金收益，为本组合的主要回收来源；该场景的参数口径应优先锁定。');
          if (tail && pf.scenes.length > 1 && tail.share < 10) out.push('「' + tail.name + '」占比仅 ' + tail.share + '%，上线周期 ' + tail.weeks + ' 周。若需压缩总工期，可优先考虑将其移出首批。');
          out.push('组合中有 ' + pf.scenes.filter(function (x) { return x.cashMonthly === 0; }).length + ' 个场景不产生现金收益，其价值体现在非现金科目，由其余场景承担投入的回收。');
          return out;
        })())]),
        h('div', {}, [tab3('现金与非现金划分', tbl3([['科目'], ['月度金额', 'n'], ['是否参与回收期', 'c']], [
          [['现金科目', 'b'], [fmt(r.benefit.cashMonthly) + ' 元', 'n pos'], ['参与', 'c pos']],
          [['非现金科目', 'b'], [fmt(r.benefit.hoursMonthly) + ' 元', 'n'], ['不参与', 'c']],
          [['合计', 'b'], [fmt(r.benefit.cashMonthly + r.benefit.hoursMonthly) + ' 元', 'n b'], ['—', 'c']]
        ]), '人工工时节约除非被重新配置至产出性岗位，否则不构成可确认的现金流入。')])
      ])
    ]);
  }

  function pGain4(r) {
    var p = page3('04', r, 'gain');
    return wrapPage(p, r, '04 收益测算', '04', '两种口径的累计净额对照', 'DUAL BASIS', null, null, [
      basis3('现金口径只确认实际发生的现金收支；含非现金口径把人工工时节约按综合用工成本折算后一并计入。'
        + '两者的差值即本组合非现金效益的规模，' + fmt(r.benefit.hoursMonthly) + ' 元/月。'),
      r.flow.length ? fig3('两种口径的累计净现金流', CH.dualCurve(r.flow, r.flowAll, r.payback, r.paybackAll),
        '实线为现金口径，虚线为并计非现金科目后的口径；空心点为各自的转正期次。', '元') : null,
      tab3('双口径对照', tbl3([['口径'], ['月度收益', 'n'], ['转正期次', 'c'], ['24 期末累计净额', 'n'], ['用途']], [
        [['现金口径', 'b'], [fmt(r.benefit.cashMonthly) + ' 元', 'n'],
          [r.payback == null ? '未转正' : '第 ' + r.payback + ' 期', 'c b'],
          [r.flow.length ? fmt(r.flow[23].cum) + ' 元' : '—', 'n'], ['投资决策与预算审批的唯一依据']],
        [['含非现金口径'], [fmt(r.benefit.cashMonthly + r.benefit.hoursMonthly) + ' 元', 'n'],
          [r.paybackAll == null ? '未转正' : '第 ' + r.paybackAll + ' 期', 'c'],
          [r.flowAll.length ? fmt(r.flowAll[23].cum) + ' 元' : '—', 'n'], ['仅在已明确释放工时再配置安排时参考']]
      ])),
      note3('划分依据', '人工工时节约不构成可确认的现金流入',
        '该部分转化为现金流入的前提是释放工时被重新配置至产出性岗位。在未发生人员结构调整的情形下，'
        + '工时节约表现为人员负荷下降而非成本下降，故不参与回收期测算。'
        + '本组合中命中人工工时节约的场景共 ' + r.portfolio.scenes.filter(function (x) { return x.hoursMonthly > 0; }).length + ' 个。'),
      basis3('结论与决策建议一律以现金口径为准。')
    ]);
  }
  function pPay1(r) {
    var p = page3('05', r, 'pay');
    var pm = payMonth(r), f12 = r.flow.length ? r.flow[11].cum : 0, f24 = r.flow.length ? r.flow[23].cum : 0;
    var neg = r.flow.filter(function (x) { return x.cum < 0; }).length;
    return wrapPage(p, r, '05 回收期测算', '05', '回收期测算', 'PAYBACK PERIOD',
      pm == null ? '>' + r.meta.horizon : '第 ' + pm, pm == null ? '期 · 期内未转正' : '期 · ' + payBasisLabel(r), [
      figs3([
        { k: '现金口径转正期次', v: r.payback == null ? '未转正' : '第 ' + r.payback + ' 期', s: '仅计现金科目', hl: true },
        { k: '含非现金口径', v: r.paybackAll == null ? '未转正' : '第 ' + r.paybackAll + ' 期', s: '并计人工工时节约' },
        { k: '首年累计净额', v: money(f12), u: '元', s: '第 12 期末', pos: f12 >= 0, neg: f12 < 0 },
        { k: '两年累计净额', v: money(f24), u: '元', s: '第 24 期末', pos: f24 >= 0, neg: f24 < 0 }
      ], 4),
      r.flow.length ? fig3('累计净现金流与转正期次', CH.paybackCurve(r.flow, r.payback),
        '纵轴为累计净现金流，零轴以上为已回收。曲线在第 1 期与第 13 期因投入整额计列而出现台阶。', '元') : null,
      h('div', { class: 'm3-two' }, [
        h('div', {}, [tab3('双口径对照', tbl3([['口径'], ['月度收益', 'n'], ['转正期次', 'c']], [
          [['现金口径', 'b'], [fmt(r.benefit.cashMonthly) + ' 元', 'n'], [r.payback == null ? '未转正' : '第 ' + r.payback + ' 期', 'c b']],
          [['含非现金口径'], [fmt(r.benefit.cashMonthly + r.benefit.hoursMonthly) + ' 元', 'n'], [r.paybackAll == null ? '未转正' : '第 ' + r.paybackAll + ' 期', 'c']]
        ]), '结论与决策建议一律以现金口径为准。')]),
        h('div', {}, [fig3('投报率对照', CH.roiTrack(r.roi), '累计净收益除以同期累计投入，未作折现处理。', '%')])
      ]),
      tab3('回收期的判读', tbl3([['判读维度'], ['本次结论'], ['含义']], [
        [['期次口径', 'b'], ['第 ' + (r.payback == null ? '—' : r.payback) + ' 期（现金口径）'], ['累计净现金流由负转正的期次，不含非现金科目']],
        [['决策基准', 'b'], [r.scenarios[0].payback == null ? '保守档期内未转正' : '保守档第 ' + r.scenarios[0].payback + ' 期'], ['投资决策与预算审批以保守档为准，中性档用于进度跟踪']],
        [['次年现金负担', 'b'], [fmt(r.invest.cashYearly) + ' 元 / 年'], ['一次性支出不再发生，次年起仅计列订阅续费']],
        [['测算期末净额', 'b'], [fmt(r.flow.length ? r.flow[23].cum : 0) + ' 元'], ['第 ' + r.meta.horizon + ' 期末的累计净现金流，超出测算期的效益不予确认']]
      ])),
      basis3(RT().method.payback),
      r.reCross ? note3('二次转正', '第 13 期年度续费计列后累计净额再次转负', '累计净额于第 ' + r.reCross + ' 期二次转正。年度订阅按整额计列而非月度摊销，故续费期次出现台阶属正常现象。', true)
        : (pm == null ? null : fn3('回收期为累计净现金流首次由负转正的期次，本次测算期内共 ' + neg + ' 期处于未回收状态。'))
    ]);
  }

  function pPay2(r) {
    var p = page3('05', r, 'pay');
    var tot = r.flow.reduce(function (a, b) { return a + b.benefit; }, 0);
    var totc = r.flow.reduce(function (a, b) { return a + b.cost; }, 0);
    return wrapPage(p, r, '05 回收期测算', '05', '24 期现金流分布', 'CASH FLOW DISTRIBUTION', null, null, [
      fig3('24 期收支分布', CH.cashflowBars(r.flow),
        '零轴以上为当期收益，以下为当期支出。第 1 期含全部一次性支出与首年订阅费，第 13 期含年度续费。', '元'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [tab3('期次特征', rows3([
          row3('支出发生期次', '第 1 期、第 13 期', { i: '共 2 期，其余各期无现金支出' }),
          row3('收益爬坡期次', '第 1 至第 ' + C().rampMonths.length + ' 期', { i: '按 ' + C().rampMonths.map(function (x) { return Math.round(x * 100) + '%'; }).join(' / ') + ' 逐期释放' }),
          row3('满额释放起始', '第 ' + (C().rampMonths.length + 1) + ' 期', { i: fmt(r.benefit.cashMonthly) + ' 元/期' }),
          row3('24 期收益合计', fmt(tot) + ' 元', { pos: true }),
          row3('24 期支出合计', '−' + fmt(totc) + ' 元', { neg: true }),
          row3('24 期净额', fmt(tot - totc) + ' 元', { sum: true, pos: tot - totc >= 0, neg: tot - totc < 0 })
        ]))]),
        h('div', {}, [fig3('过渡期的效益释放比例', CH.rampSteps(C().rampMonths, r.benefit.cashMonthly),
          '释放比例反映使用习惯养成与数据积累所需时间，自上线当月起计。', '%')])
      ]),
      fig3('累计净额台阶', CH.monthLadder(r.flow, r.payback),
        '柱高为各期末的累计净额；红色为尚未回收，绿色为已转正。', '元'),
      basis3(RT().method.ramp)
    ]);
  }

  function pPay3(r) {
    var p = page3('05', r, 'pay');
    var rows = r.flow.slice(0, 12);
    return wrapPage(p, r, '05 回收期测算', '05', '前 12 期逐期明细', 'PERIOD LEDGER', null, null, [
      basis3('下表为现金口径的逐期明细。当期收益按满额月度收益乘以该期释放比例计列；当期支出仅在第 1 期与第 13 期发生。累计净额为逐期净额的连续加总。'),
      tab3('第 1 至第 12 期逐期明细',
        tbl3([['期次', 'c'], ['释放比例', 'c'], ['当期收益', 'n'], ['当期支出', 'n'], ['当期净额', 'n'], ['累计净额', 'n'], ['状态', 'c']],
          rows.map(function (x) {
            var pos = x.cum > 0;
            return [['第 ' + x.m + ' 期', 'c'], [Math.round(x.ramp * 100) + '%', 'c'],
              [fmt(x.benefit), 'n pos'], [x.cost ? '−' + fmt(x.cost) : '—', 'n' + (x.cost ? ' neg' : '')],
              [fmt(x.net), 'n' + (x.net >= 0 ? '' : ' neg')], [fmt(x.cum), 'n b' + (pos ? ' pos' : ' neg')],
              [pos ? '已回收' : '未回收', 'c' + (pos ? ' pos' : '')]];
          })), null, '元'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [fig3('首年回收进度', CH.recoveryShare(rows, r.invest.cashYear1),
          '柱高为累计收益对首年现金支出的覆盖率，越过金色虚线即累计收益已等于首年现金支出。', '%')]),
        h('div', {}, [tab3('首年小结', rows3([
          row3('首年收益合计', fmt(rows.reduce(function (a, b) { return a + b.benefit; }, 0)) + ' 元', { pos: true }),
          row3('首年支出合计', '−' + fmt(rows.reduce(function (a, b) { return a + b.cost; }, 0)) + ' 元', { neg: true }),
          row3('第 12 期末累计净额', fmt(rows[11].cum) + ' 元', { sum: true, pos: rows[11].cum >= 0, neg: rows[11].cum < 0 })
        ]), '第 13 至第 24 期明细见附录 A。')])
      ]),
      fn3('全部金额取整至元，逐期加总与合计值之间可能存在不超过 1 元的进位差异。')
    ]);
  }

  function pScen(r) {
    var p = page3('06', r, 'scen');
    var cons = r.scenarios[0], mid = r.scenarios[1], opt = r.scenarios[2];
    var span = (cons.payback == null || opt.payback == null) ? null : cons.payback - opt.payback;
    return wrapPage(p, r, '06 情景分析', '06', '三档情景分析', 'SCENARIO ANALYSIS',
      cons.payback == null ? '>' + r.meta.horizon : '第 ' + cons.payback, '期 · 保守档转正', [
      basis3(RT().method.scenario),
      fig3('三档情景的回收期与累计净额', CH.scenarioBand(r.scenarios, r.meta.horizon),
        '中性档为按企业填报参数直接计算的结果；决策建议以保守档为基准。'),
      tab3('三档参数与结果对照',
        tbl3([['情景'], ['收益系数', 'c'], ['投入系数', 'c'], ['月度收益', 'n'], ['首年现金支出', 'n'], ['转正期次', 'c'], ['首年投报率', 'n']],
          r.scenarios.map(function (s) {
            return [[s.name + '档', 'b'], ['×' + s.benefitMul, 'c'], ['×' + s.costMul, 'c'],
              [fmt(s.monthlyBenefit) + ' 元', 'n'], ['−' + fmt(s.cashYear1) + ' 元', 'n neg'],
              [s.payback == null ? '未转正' : '第 ' + s.payback + ' 期', 'c b'],
              [s.roi12 == null ? '—' : s.roi12 + '%', 'n']];
          })), '三档共用同一组输入参数，仅调整收益折减与投入系数，故三档之间的差异全部来自系数设定。'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [hh3('档位适用说明', 'APPLICABILITY'), list3([
          '保守档用于投资决策与预算审批，对应效益释放不及预期、投入超出预算的情形。',
          '中性档用于进度跟踪与效益复盘，对应按填报参数如实兑现的情形。',
          '积极档用于测算上限判断，不作为任何承诺的依据。'
        ])]),
        h('div', {}, [tab3('结论区间', rows3([
          row3('保守档', cons.payback == null ? '期内未转正' : '第 ' + cons.payback + ' 期', { b: true }),
          row3('中性档', mid.payback == null ? '期内未转正' : '第 ' + mid.payback + ' 期'),
          row3('积极档', opt.payback == null ? '期内未转正' : '第 ' + opt.payback + ' 期'),
          row3('三档跨度', span == null ? '含未转正档' : span + ' 期', { sum: true })
        ]))])
      ]),
      (cons.payback != null
        ? note3('决策提示', '保守档在测算期内可于第 ' + cons.payback + ' 期转正',
          '在收益仅兑现 ' + Math.round(cons.benefitMul * 100) + '%、投入超出预算 ' + Math.round((cons.costMul - 1) * 100)
          + '% 的不利组合下，本次投入仍可在测算期内收回。该结论对系数设定不敏感，可作为投资判断的下限依据。')
        : note3('决策提示', '保守档在测算期内未转正',
          '在不利系数组合下本次投入无法于 ' + r.meta.horizon + ' 期内收回。建议先压缩另议项范围，或改选投入档位更低、现金效益更明确的场景先行实施。', true))
    ]);
  }

  function pScen2(r) {
    var p = page3('06', r, 'scen');
    var sets = r.scenarios.map(function (s) { return scenFlow(r, s); });
    return wrapPage(p, r, '06 情景分析', '06', '三档逐期对照', 'SCENARIO LEDGER', null, null, [
      fig3('三档累计净现金流曲线', CH.scenarioLines(sets, r.meta.horizon),
        '三条曲线为三档的累计净现金流；空心点为各档的转正期次。', '元'),
      tab3('关键期次对照',
        tbl3([['期次', 'c'], ['保守档', 'n'], ['中性档', 'n'], ['积极档', 'n'], ['保守与积极差额', 'n']],
          [1, 3, 6, 12, 18, 24].map(function (m) {
            var a = sets[0].rows[m - 1].cum, b = sets[1].rows[m - 1].cum, c = sets[2].rows[m - 1].cum;
            return [['第 ' + m + ' 期', 'c'], [fmt(a), 'n' + (a >= 0 ? ' pos' : ' neg')],
              [fmt(b), 'n b' + (b >= 0 ? ' pos' : ' neg')], [fmt(c), 'n' + (c >= 0 ? ' pos' : ' neg')],
              [fmt(c - a), 'n']];
          })), '本页曲线按与主口径相同的期次模型复算，第 12 与第 24 期的累计净额与上一页表列值一致。', '元'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('区间解读', 'INTERPRETATION'), list3([
          '第 24 期末三档累计净额的极差为 ' + fmt(sets[2].cum24 - sets[0].cum24) + ' 元，该幅度即系数设定所能解释的全部不确定性。',
          '三档曲线在第 1 期与第 13 期同步出现台阶，说明投入的期次结构不随情景变化。',
          '若保守档在测算期内可转正，则该场景的投资判断对系数设定不敏感。'
        ])]),
        h('div', {}, [hh3('与敏感度分析的分工', 'SCOPE'), list3([
          '情景分析调整的是收益与投入的整体系数，回答的是总体偏差之下结论是否仍然成立。',
          '敏感度分析逐项扰动单个假设，回答的是哪一项假设对结论影响最大，见第 07 章。',
          '两者结论不可相互替代：情景分析给结论的区间，敏感度分析给需要优先锁定的口径。'
        ])])
      ])
    ]);
  }

  function pSens(r) {
    var p = page3('07', r, 'sens');
    var base = payMonth(r);
    var sorted = r.sensitivity.slice().sort(function (a, b) { return b.spread - a.spread; });
    var top = sorted[0];
    return wrapPage(p, r, '07 敏感度分析', '07', '单因素敏感度分析', 'SENSITIVITY ANALYSIS',
      top ? String(top.spread) : '0', '期 · 最大影响幅度', [
      basis3(RT().method.sensitivity),
      fig3('五项关键假设的扰动区间', CH.sensitivityRange(r.sensitivity, base, r.meta.horizon),
        '横轴为转正期次，杠铃两端为该项假设上下扰动 20% 后的结果，虚线为中性档基准。', '期'),
      tab3('逐项影响与口径说明',
        tbl3([['假设项'], ['口径说明'], ['不利方向', 'c'], ['有利方向', 'c'], ['影响幅度', 'c']],
          sorted.map(function (it) {
            var lo = Math.max(it.low, it.high), hi = Math.min(it.low, it.high);
            return [[it.label, 'b'], [it.note], ['第 ' + lo + ' 期', 'c'], ['第 ' + hi + ' 期', 'c'],
              [it.spread + ' 期', 'c b' + (it.spread >= 3 ? ' neg' : '')]];
          })), '单因素法：一次仅扰动一项假设，其余各项保持中性档取值，故各项影响幅度不可直接相加。'),
      top && top.spread > 0
        ? note3('主要不确定来源', '「' + top.label + '」对回收期的影响幅度居首，达 ' + top.spread + ' 期',
          '该项在上下 20% 的扰动区间内使转正期次在第 ' + Math.min(top.low, top.high) + ' 至第 ' + Math.max(top.low, top.high)
          + ' 期之间变动。建议在方案确认阶段优先锁定该项口径，其余各项的影响幅度均不超过 ' + (sorted[1] ? sorted[1].spread : 0) + ' 期。')
        : note3('敏感度结论', '各项假设的单因素扰动均未改变转正期次',
          '本次测算结论对五项关键假设的 20% 扰动不敏感，说明结论主要由收益与投入的量级差决定，而非由单项参数取值决定。')
    ]);
  }

  function pSens2(r) {
    var p = page3('07', r, 'sens');
    var sorted = r.sensitivity.slice().sort(function (a, b) { return b.spread - a.spread; });
    var ACT = {
      benefitCut: ['在试运行期采集实际效能数据', '试运行满三个月后以实测效果替换折减系数，是提升测算精度幅度最大的一步'],
      customBudget: ['在方案确认阶段锁定另议项范围', '按第 03 章的四个科目逐项确认范围与报价，而不是谈一个总额'],
      setupCost: ['在合同中明确一次性支出的边界', '诊断天数与配置范围写入方案，避免实施阶段追加'],
      seats: ['按实际使用人数开通账号', '账号数可随使用情况分批开通，不必一次开满'],
      rampSpeed: ['压缩过渡期', '数据准备与培训提前到配置阶段并行，可使满额释放提前一到两期']
    };
    return wrapPage(p, r, '07 敏感度分析', '07', '敏感度的决策含义', 'WHAT TO LOCK DOWN', null, null, [
      basis3('敏感度分析的价值不在于列出五个数，而在于指出哪几项口径必须在合同或方案里写死、哪几项可以留待实施中调整。'
        + '下表按影响幅度排序，给出每一项对应的动作与承担方。'),
      fig3('各项假设的锁定优先级', CH.priorityBars(sorted),
        '影响 2 期及以上的口径建议在方案或合同中锁定，其余可留待实施中调整。', '期'),
      tab3('按影响幅度排序的锁定清单',
        tbl3([['序', 'c'], ['假设项'], ['影响幅度', 'c'], ['建议动作'], ['落实方式']],
          sorted.map(function (it, i) {
            var a = ACT[it.key] || ['在方案中明确该项口径', '写入实施方案并在验收时核对'];
            return [[String(i + 1), 'c'], [it.label, 'b'], [it.spread + ' 期', 'c' + (it.spread >= 3 ? ' neg b' : '')],
              [a[0]], [a[1]]];
          }))),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [hh3('必须锁定的口径', 'MUST LOCK'), list3(
          sorted.filter(function (x) { return x.spread >= 2; }).map(function (x) {
            return '「' + x.label + '」：影响 ' + x.spread + ' 期。' + (ACT[x.key] ? ACT[x.key][1] + '。' : '');
          }).concat(sorted.filter(function (x) { return x.spread >= 2; }).length ? []
            : ['本次各项假设的影响幅度均小于 2 期，无必须在合同中锁定的口径。'])
        )]),
        h('div', {}, [hh3('可留待实施中调整', 'CAN FLEX'), list3(
          sorted.filter(function (x) { return x.spread < 2; }).map(function (x) {
            return '「' + x.label + '」：影响 ' + x.spread + ' 期，落在测算误差范围之内，可按实施进展调整。';
          }).concat(sorted.filter(function (x) { return x.spread < 2; }).length ? []
            : ['本次各项假设的影响幅度均不小于 2 期，建议逐项在方案中明确。'])
        )])
      ]),
      fn3('影响幅度为该项上下扰动 20% 所引起的转正期次变动，期数越大说明结论对该项取值越依赖。')
    ]);
  }

  function pConf(r) {
    var p = page3('08', r, 'conf');
    var labels = fieldLabelMap();
    var entries = Object.keys(r.inputSource).map(function (k) { return { key: k, label: labels[k] || k, src: r.inputSource[k] }; });
    var nUser = entries.filter(function (e) { return e.src === 'user'; }).length;
    var nRef = entries.length - nUser;
    return wrapPage(p, r, '08 参数来源与可信度', '08', '参数来源与可信度', 'INPUT PROVENANCE',
      String(r.confidence.score), '分 · ' + r.confidence.name, [
      h('div', { class: 'm3-two' }, [
        h('div', {}, [fig3('可信度评分', CH.confidenceBar(r.confidence.score), r.confidence.desc, '分')]),
        h('div', {}, [tab3('来源结构', rows3([
          row3('参与测算的参数项', entries.length + ' 项'),
          row3('企业填报', nUser + ' 项', { pos: true }),
          row3('画像推定与参考值', nRef + ' 项', { i: nRef ? '正文逐处标注' : '本次无' }),
          row3('可信度评分', r.confidence.score + ' 分', { sum: true })
        ]))])
      ]),
      fig3('逐项参数的来源分布', CH.sourceGrid(entries),
        '企业填报项可直接用于决策讨论；参考值项需在复核时以企业实际数据替换。'),
      tab3('逐项参数来源与复核建议',
        tbl3([['参数项'], ['来源', 'c'], ['对测算结论的作用'], ['复核建议']],
          entries.slice(0, 7).map(function (e) {
            var eff = e.key.indexOf('ops') === 0 ? '构成人工工时节约的测算基数'
              : e.key.indexOf('error') === 0 ? '构成差错与返工损失下降的测算基数'
                : e.key === 'revenueAnnual' ? '决定营收封顶线与投入合理性核验的分母'
                  : e.key === 'grossMargin' ? '决定营收类效益的折算比例'
                    : e.key === 'seats' ? '决定订阅费用与首年现金支出'
                      : e.key === 'customBudget' ? '决定另议项计列金额，对回收期影响幅度居前'
                        : e.key === 'diagnosisDays' ? '决定入企诊断费用'
                          : '构成对应效益杠杆的测算基数';
            return [[e.label, 'b'], [SRCNAME[e.src] || e.src, 'c' + (e.src === 'user' ? ' pos' : '')], [eff],
              [e.src === 'user' ? '无需复核' : '建议以企业实际数据替换后复核']];
          })),
        entries.length > 7 ? '上表列示前 7 项，其余 ' + (entries.length - 7) + ' 项的来源见上方分布图。' : null),
      basis3('可信度评分自 100 分起算，按各项参数的来源逐项扣减：采用画像推定扣 ' + C().confidence.penalty.profile
        + ' 分，采用参考值或未填报扣 ' + C().confidence.penalty['default'] + ' 分，未填报另议项预算扣 '
        + C().confidence.penalty.noCustomBudget + ' 分，未指定具体场景扣 ' + C().confidence.penalty.genericScene + ' 分。'),
      fn3('参考值取值全表见附录 C。参考值为按行业与企业规模赋值的常见区间，非统计调查数据。')
    ]);
  }

  function pMissing(r) {
    var p = page3('09', r, 'conf');
    var items = (r.missing || []);
    var nRef = Object.keys(r.inputSource).filter(function (k) { return r.inputSource[k] !== 'user'; }).length;
    return wrapPage(p, r, '09 数据缺口与补齐建议', '09', '数据缺口与补齐建议', 'DATA GAPS',
      String(items.length), '项 · 待补齐参数', [
      basis3('数据缺口指效益杠杆所需、但本次未取得企业实际数值的参数，按场景逐项列示。'
        + '核心效益参数不设默认值：缺失时在报告中明示该场景测算受限，不代为赋值，'
        + '以免整个组合的结论建立在虚构基数之上。'),
      fig3('缺口影响程度与补齐路径', CH.gapImpact(items.map(function (x) {
        return { label: trunc(x.sceneName + '·' + x.label, 14), impact: x.impact, fix: x.how };
      })), '影响程度按该参数对回收期的期次变动幅度划分：高为 3 期以上，中为 1 至 3 期，低为 1 期以内。'),
      items.length ? tab3('缺口清单',
        tbl3([['场景'], ['缺口参数'], ['所属杠杆'], ['影响', 'c'], ['补齐路径']],
          items.map(function (x) {
            return [[x.sceneName, 'b'], [x.label], [x.lever],
              [x.impact === 'high' ? '高' : x.impact === 'low' ? '低' : '中', 'c'], [x.how]];
          })),
        '同一字段在不同场景各自独立填报：同一类损失在不同环节的发生频次与金额并不相同。')
        : note3('缺口核查', '本次组合所需的效益参数均已取得', '全部场景的效益杠杆测算基数均由企业填报或按画像推定，无待补齐项。测算结论可直接用于投资决策讨论。'),
      fig3('参数可信度的补齐路径', CH.readinessLadder([
        { name: '本次测算', score: r.confidence.score, note: r.confidence.name },
        { name: '参考值替换后', score: Math.min(100, r.confidence.score + nRef * C().confidence.penalty.profile), note: '以企业实际数据替换' },
        { name: '试运行三期后', score: 100, note: '以实测效果替换折减系数' }
      ]), '第三级以实测效能数据替换折减系数后达成，该替换对测算精度的提升幅度最大。', '分'),
      tab3('参数完整度核查', tbl3([['核查项'], ['状态', 'c'], ['说明']], [
        [['效益杠杆测算基数', 'b'], [r.insufficient ? '缺失' : '齐备', 'c ' + (r.insufficient ? 'neg' : 'pos')],
          [r.insufficient ? '效益侧关键参数未取得，回收期不予出具' : '已取得 ' + r.portfolio.scenes.filter(function (x) { return !x.noData; }).length + ' / ' + r.portfolio.count + ' 个场景的测算基数']],
        [['另议项预算', 'b'], [r.inputSource.customBudget === 'user' ? '企业填报' : '按参考值', 'c ' + (r.inputSource.customBudget === 'user' ? 'pos' : '')],
          [r.inputSource.customBudget === 'user' ? '按企业填报金额计列' : '按四科目推导计列，方案报价确定后应以实际金额替换']],
        [['订阅账号数', 'b'], [r.invest.seatsSource === 'user' ? '企业填报' : '按参考值', 'c ' + (r.invest.seatsSource === 'user' ? 'pos' : '')],
          [r.invest.seatsSource === 'user' ? '按企业填报套数计列' : '按各场景覆盖人数与复用系数 ' + r.portfolio.seatOverlap + ' 归并取值']],
        [['营业收入区间', 'b'], [r.revenueAnnual ? '已取得' : '未取得', 'c ' + (r.revenueAnnual ? 'pos' : '')],
          [r.revenueAnnual ? '营收封顶线与投入合理性核验均已启用' : '营收封顶护栏与投入合理性核验本次未启用']]
      ])),
      r.insufficient ? note3('测算受限', '效益侧关键参数缺失，本次仅出具投入侧测算', '在缺口补齐前，报告不给出回收期结论。投入侧科目与金额不受影响，可直接用于预算编制。', true) : null
    ]);
  }
  function pRamp(r) {
    var p = page3('10', r, 'plan');
    var iv = r.invest, pf = r.portfolio;
    var dsName = { paper: '纸质为主', scattered: '分散在多个系统', excel: '表格管理', system: '系统内齐全' };
    var pre = [];
    pf.scenes.forEach(function (x) { if (x.precondition) pre.push({ name: x.name, t: x.precondition }); });
    return wrapPage(p, r, '10 实施周期与效益释放', '10', '实施周期与效益释放', 'IMPLEMENTATION',
      String(pf.totalWeeks), '周 · 总工期', [
      basis3('总工期由各批工期串行累加得出：每批取该批最长场景的基准周期，乘以按数据现状取值的倍率 '
        + iv.dataStateMult + '（当前为「' + (dsName[r.plan.dataState] || r.plan.dataState) + '」）。'
        + '共 ' + pf.waves.length + ' 批，合计 ' + pf.totalWeeks + ' 周。'),
      fig3('各批工期与效益起算期次',
        CH.weeksGantt(pf.waves.map(function (w) { return { name: '第 ' + w.no + ' 批', weeks: w.weeks, duty: w.sceneNames.join('、') }; }), pf.totalWeeks),
        '批与批之间串行推进，不含企业内部审批与预算流程所需时间。', '周'),
      h('div', { class: 'm3-two wl' }, [
        h('div', {}, [tab3('各批场景与起算期次',
          tbl3([['批次', 'c'], ['场景'], ['工期', 'c'], ['效益起算', 'c']],
            pf.waves.map(function (w) {
              return [['第 ' + w.no + ' 批', 'c b'], [w.sceneNames.join('、')], [w.weeks + ' 周', 'c'], ['第 ' + w.startMonth + ' 期', 'c b']];
            })))]),
        h('div', {}, [fig3('单场景的效益释放比例', CH.rampSteps(C().rampMonths, r.benefit.cashMonthly / Math.max(1, pf.count)),
          '每个场景自其起算期次起按该比例逐期释放，第 ' + (C().rampMonths.length + 1) + ' 期起满额。', '%')])
      ]),
      tab3('前置条件', tbl3([['事项'], ['内容'], ['未满足的后果']], [
        [['数据依赖', 'b'], [(pf.depUnion || []).length ? pf.depUnion.map(function (x) { return sh.optText('systems', x) || x; }).join('、') : '无特定系统依赖'],
          ['需以人工方式补足数据来源，数据准备阶段延长']],
        [['已在用系统', 'b'], [(iv.hitSystems || []).length ? iv.hitSystems.map(function (x) { return sh.optText('systems', x) || x; }).join('、') + '（已计列对接费用）' : '无'],
          ['未在用的依赖系统需先行建设，否则相关场景无法上线']],
        [['场景前置条件', 'b'], [pre.length ? pre.map(function (x) { return x.name + '：' + x.t; }).join('；') : '无'],
          ['对应场景的上线周期延长，效益释放相应后移']]
      ])),
      basis3(RT().method.ramp),
      fn3('数据现状倍率取值见附录 C。倍率作用于场景库所载基准周期，不作用于效益释放比例。')
    ]);
  }

  function pRoles(r) {
    var p = page3('11', r, 'plan');
    return wrapPage(p, r, '11 组织保障与职责分工', '11', '组织保障与职责分工', 'GOVERNANCE', null, null, [
      basis3(RT().roles.lead),
      fig3('角色在各实施阶段的参与程度', CH.roleMatrix(r.roles),
        '主责为该阶段的第一责任人，参与为配合提供口径与数据，知会为结果周知；右列为该角色的时间投入测算值。'),
      tab3('角色职责界定', tbl3([['角色'], ['建议人选'], ['职责边界'], ['时间投入', 'c']],
        r.roles.map(function (x) { return [[x.name, 'b'], [x.who], [x.duty], [x.time, 'c']]; }))),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [tab3('时间投入测算', rows3([
          row3('上线期内部工时', r.invest.setupHours + ' 小时', { i: r.plan.setupPeople + ' 人 × ' + r.invest.setupWeeks + ' 周 × 每天 2 小时' }),
          row3('折合用工成本', fmt(r.invest.laborItems[0].amount) + ' 元', { i: '综合时薪 ' + r.invest.setupHourly + ' 元' }),
          row3('运行期月度工时成本', fmt(r.invest.runLaborMonthly) + ' 元/月'),
          row3('首年内部工时合计', fmt(r.invest.laborYear1) + ' 元', { sum: true })
        ]), '内部工时单列为非现金科目，不计入回收期测算。')]),
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
    var p = page3('12', r, 'plan');
    var pr = C().prices, iv = r.invest, pd = pr.privateDeploy;
    return wrapPage(p, r, '12 服务与报价口径', '12', '服务与报价口径', 'PRICING', null, null, [
      basis3('全部价格取自《薯片AI智能体》定稿产品资料，未作调整。订阅类按套年计价，诊断类按日计价，另议项按方案报价。'),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [fig3('订阅档位与单套年费', CH.priceLadder(pr.subscription, r.plan.tier),
          '本次按' + iv.tierName + ' ' + iv.seats + ' 套计列，首年订阅费 ' + fmt(iv.cashItems[0].amount) + ' 元。', '元 / 套年')]),
        h('div', {}, [tab3('本次计列项目', tbl3([['项目'], ['计价口径'], ['金额', 'n']],
          iv.cashItems.map(function (x) { return [[x.name, 'b'], [x.detail], [fmt(x.amount) + ' 元', 'n']]; })
            .concat([[['首年合计', 'b'], ['—'], [fmt(iv.cashYear1) + ' 元', 'n b']]])))])
      ]),
      tab3('档位对照', tbl3([['档位'], ['单套年费', 'n'], ['计价说明'], ['本次', 'c']],
        pr.subscription.map(function (t) {
          var on = t.key === r.plan.tier;
          return [[t.name, on ? 'b' : ''], [t.yearly ? fmt(t.yearly) + ' 元 / 套年' : '0 元', 'n'], [t.desc],
            [on ? '已计列' : '—', 'c' + (on ? ' pos' : '')]];
        }))),
      tab3('可选服务', tbl3([['服务'], ['价格', 'c'], ['服务内容']],
        RT().services.map(function (s) { return [[s.name, 'b'], [s.price, 'c'], [s.desc]]; }))),
      fn3('私域部署价格口径为「' + pd[0].yearly + ' 元起 / 套年」，区间 ' + pd[0].yearly + ' 至 ' + pd[1].yearly
        + ' 元 / 套年，按一套部署计列，不随账号数增加。本次测算' + (r.plan.privateDeploy ? '按该区间' + (r.plan.privateDeploy === 'base' ? '下限' : '上限') + '计列' : '未计列私域部署')
        + '。另议项以实际方案报价为准，本报告按第 03 章的四个科目计列。')
    ]);
  }

  function pRetrigger(r) {
    var p = page3('13', r, 'conf');
    return wrapPage(p, r, '13 测算复核触发条件', '13', '测算复核触发条件', 'RE-CALCULATION TRIGGERS',
      String(r.retrigger.length), '项 · 触发情形', [
      basis3(RT().retrigger.lead),
      fig3('触发情形与对结论的作用方向', CH.triggerMap(r.retrigger),
        '左列为触发情形，右列为该情形对测算结论的作用方向。'),
      tab3('触发情形与影响机理', tbl3([['序', 'c'], ['触发情形'], ['影响机理']],
        r.retrigger.map(function (x, i) { return [[String(i + 1).padStart(2, '0'), 'c'], [x.when, 'b'], [x.why]]; }))),
      h('div', { class: 'm3-two' }, [
        h('div', {}, [tab3('复核成本', rows3([
          row3('单次复核用时', '约 10 分钟', { i: '仅需更新变动参数' }),
          row3('复核所需材料', '变动参数的实际数值'),
          row3('复核输出', '完整报告一份', { i: '含更新后的回收期与情景区间' }),
          row3('建议复核频次', '每季度一次或触发时', { sum: true })
        ]))]),
        h('div', {}, [hh3('不需复核的情形', 'NO RE-RUN NEEDED'), list3([
          '订阅套数在同一档位内小幅调整：该项的敏感度影响幅度为 ' + (r.sensitivity.filter(function (x) { return x.key === 'seats'; })[0] || { spread: 0 }).spread + ' 期。',
          '上线时点推迟：期次自上线当月起计，推迟不改变各期的相对关系。',
          '人员轮岗但编制不变：人工工时节约的测算基数为人数与时长，与具体人选无关。'
        ])])
      ]),
      fn3('复核与本次测算共用同一套模型与常量，故复核结果与本次结论可直接比较。')
    ]);
  }

  function pAppA(r) {
    var p = page3('A', r, 'app');
    var w = C().work, cp = C().caps;
    return wrapPage(p, r, '附录 A 测算常量与公式', 'A', '测算常量与公式', 'CONSTANTS AND FORMULAE', null, null, [
      tab3('测算常量', tbl3([['常量'], ['取值', 'c'], ['作用']], [
        [['月计薪天数', 'b'], [w.daysPerMonth + ' 天', 'c'], ['将月薪折算为日薪与时薪']],
        [['日工作小时', 'b'], [w.hoursPerDay + ' 小时', 'c'], ['将日薪折算为时薪']],
        [['综合用工系数', 'b'], ['×' + w.laborBurden, 'c'], [w.laborBurdenNote]],
        [['测算期', 'b'], [C().horizonMonths + ' 期', 'c'], ['自上线当月起计的月度序号上限']],
        [['效益释放比例', 'b'], [C().rampMonths.map(function (x) { return Math.round(x * 100) + '%'; }).join(' / '), 'c'], ['第 1 至第 3 期的收益折算比例，第 4 期起按满额计列']],
        [['重叠折减系数', 'b'], [Math.round(C().overlapDiscount * 100) + '%', 'c'], ['多杠杆命中时，金额最高项以外各项的计列比例']],
        [['营收封顶比例', 'b'], [Math.round(cp.revenueShare * 100) + '%', 'c'], ['单一场景年化收益上限占年度营业收入的比例']],
        [['价值系数', 'b'], [Object.keys(cp.valueFactor).map(function (k) { return k + '级 ' + cp.valueFactor[k]; }).join('　'), 'c'], ['按场景价值分级对合并收益折算一次']]
      ])),
      tab3('效益杠杆公式', tbl3([['效益杠杆'], ['折算公式'], ['折减系数', 'c'], ['科目', 'c']],
        LV().items.map(function (it) {
          return [[it.name, 'b'], [it.formula], [Math.round(it.cut * 100) + '%', 'c'],
            [it.cash ? '现金' : '非现金', 'c' + (it.cash ? ' pos' : '')]];
        }))),
      tab3('复算校验', rows3([
        row3('月度现金收益', fmt(r.benefit.cashMonthly) + ' 元', { i: '逐项合并 ' + fmt(r.benefit.rawMonthly) + ' × 价值系数 ' + r.benefit.valueFactor + ' 后取现金科目' }),
        row3('首年现金支出', fmt(r.invest.cashYear1) + ' 元', { i: '一次性 ' + fmt(r.invest.cashOnce) + ' + 年度订阅 ' + fmt(r.invest.cashYearly) }),
        row3('转正期次', r.payback == null ? '期内未转正' : '第 ' + r.payback + ' 期', { sum: true })
      ])),
      basis3('本报告全部测算结果均可由上述常量与公式，结合正文列示的输入参数复算得出。模型不含随机成分，同一组输入必然得到同一组输出。'),
      fn3('折减系数为工具可影响的部分占该事项全量的比例，非效率提升幅度。各系数的取值依据见第 04 章。')
    ]);
  }

  function pAppB(r) {
    var p = page3('A', r, 'app');
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
        h('div', {}, [tab3('第 1 至第 12 期', col(a), null, '元')]),
        h('div', {}, [tab3('第 13 至第 24 期', col(b), null, '元')])
      ]),
      tab3('全期合计', rows3([
        row3('24 期收益合计', fmt(r.flow.reduce(function (x, y) { return x + y.benefit; }, 0)) + ' 元', { pos: true }),
        row3('24 期支出合计', '−' + fmt(r.flow.reduce(function (x, y) { return x + y.cost; }, 0)) + ' 元', { neg: true }),
        row3('第 24 期末累计净额', fmt(r.flow.length ? r.flow[23].cum : 0) + ' 元', { sum: true, pos: r.flow.length && r.flow[23].cum >= 0, neg: r.flow.length && r.flow[23].cum < 0 })
      ])),
      fig3('含非现金口径的累计净额', CH.monthLadder(r.flowAll, r.paybackAll),
        '该口径并计人工工时节约折算金额，仅作参照，不用于回收期结论。', '元'),
      fn3('金额取整至元。第 13 期支出为年度订阅续费，其余各期无现金支出。')
    ]);
  }

  function pAppC(r) {
    var p = page3('B', r, 'app');
    var mk = RT().method;
    return wrapPage(p, r, '附录 B 方法与术语', 'B', '测算方法与术语', 'METHOD AND GLOSSARY', null, null, [
      tab3(mk.title, tbl3([['环节'], ['方法说明']], [
        [['模型结构', 'b'], [mk.model]],
        [['投入计列', 'b'], [mk.timing]],
        [['效益释放', 'b'], [mk.ramp]],
        [['回收期', 'b'], [mk.payback]],
        [['多杠杆合并', 'b'], [mk.overlap]],
        [['两道护栏', 'b'], [mk.cap]],
        [['情景分析', 'b'], [mk.scenario]],
        [['敏感度分析', 'b'], [mk.sensitivity]]
      ])),
      tab3('术语释义', tbl3([['术语'], ['释义']], RT().glossary.map(function (g) { return [[g.t, 'b'], [g.d]]; }))),
      basis3(RT().honesty.lead)
    ]);
  }

  function pAppD(r) {
    var p = page3('C', r, 'app');
    var bm = DATA.m3.benchmarks, pf = r.portfolio;
    var bmRows = [];
    ['opsSalary', 'grossMargin', 'setupWeeksBuffer'].forEach(function (k) {
      var b = bm[k]; if (!b) return;
      bmRows.push([[b.label, 'b'], [b.by], [Object.keys(b.values).map(function (x) { return x + '：' + b.values[x]; }).join('　')], [String(b.fallback), 'c']]);
    });
    return wrapPage(p, r, '附录 C 场景基础数据', 'C', '场景库字段与收益侧参考值', 'SOURCE DATA', null, null, [
      basis3('本页列示本次组合内各场景的场景库原始字段与收益侧参考值表，供口径追溯与复核之用。'
        + '场景库字段对同行业大类的全部企业一致，不随企业填报参数变化。'),
      tab3('场景库字段（逐场景）',
        tbl3([['场景'], ['编号', 'c'], ['环节'], ['使用角色'], ['替代事项'], ['产品模块'], ['周期', 'c'], ['档', 'c'], ['价值', 'c']],
          pf.scenes.map(function (x) {
            return [[x.name, 'b'], [x.id || '—', 'c'], [x.stage || '—'], [x.user || '—'],
              [trunc(x.replaces || '—', 16)], [x.module || '—'], [x.weeks + ' 周', 'c'], [x.cost, 'c'], [x.value + '/5', 'c']];
          }))),
      tab3('折算口径与预期指标',
        tbl3([['场景'], ['效益折算口径'], ['预期指标']],
          pf.scenes.map(function (x) {
            return [[x.name, 'b'], [x.roiBasis || '—'], [(x.metric || '—') + '（区间表述，未参与金额计算）']];
          })),
        '折算口径决定各场景命中哪几项效益杠杆；预期指标仅作口径说明。'),
      tab3('收益侧参考值表', tbl3([['参考值'], ['取值依据'], ['分档取值'], ['缺省值', 'c']], bmRows), bm.disclosure),
      fn3('收益杠杆的核心参数（人数、次数、单量、金额、占用资金）一律不设参考值，缺失时在第 09 章逐场景明示测算受限。')
    ]);
  }

  function pAppE(r) {
    var p = page3('C', r, 'app');
    var ip = DATA.m3.investmentProfile, pr = C().prices;
    var seatRows = Object.keys(ip.seats.values).map(function (k) {
      var row = ip.seats.values[k];
      return [[sh.optText('size', k) || k, 'b'], [String(row['零']), 'c'], [String(row['轻']), 'c'],
        [String(row['中']), 'c'], [String(row['重']), 'c'],
        [k === r.profile.size ? '本次' : '—', 'c' + (k === r.profile.size ? ' pos' : '')]];
    });
    var costRows = [
      [['系统对接', 'b'], [ip.integration.by], [Object.keys(ip.integration.values).map(function (k) { return (sh.optText('size', k) || k) + ' ' + ip.integration.values[k]; }).join('　')], ['元 / 接口', 'c']],
      [['定制开发与配置', 'b'], [ip.customDev.by], ['档位基数 ' + Object.keys(ip.customDev.base).map(function (k) { return k + ' ' + ip.customDev.base[k]; }).join('　') + '；规模系数 ' + Object.keys(ip.customDev.sizeFactor).map(function (k) { return (sh.optText('size', k) || k) + ' ×' + ip.customDev.sizeFactor[k]; }).join('　')], ['元', 'c']],
      [['落地陪跑', 'b'], [ip.coaching.by], [Object.keys(ip.coaching.values).map(function (k) { return (sh.optText('size', k) || k) + ' ' + ip.coaching.values[k]; }).join('　')], ['元 / 周', 'c']],
      [['历史数据整理', 'b'], [ip.dataPrep.by], ['规模基数 ' + Object.keys(ip.dataPrep.base).map(function (k) { return (sh.optText('size', k) || k) + ' ' + ip.dataPrep.base[k]; }).join('　') + '；现状系数 ' + Object.keys(ip.dataPrep.stateFactor).map(function (k) { return k + ' ×' + ip.dataPrep.stateFactor[k]; }).join('　')], ['元', 'c']]
    ];
    return wrapPage(p, r, '附录 C 场景基础数据', 'C', '投入侧规模推导表', 'INVESTMENT REFERENCE', null, null, [
      basis3(ip.note),
      tab3('订阅套数参考值', tbl3([['企业规模'], ['零档', 'c'], ['轻档', 'c'], ['中档', 'c'], ['重档', 'c'], ['本次', 'c']], seatRows),
        '列为场景投入档位，行为企业人员规模。本次取 ' + r.invest.seats + ' 套（' + (r.invest.seatsSource === 'user' ? '企业填报' : '参考值') + '）。', '套'),
      tab3('另议项四科目的推导口径', tbl3([['科目'], ['取值依据'], ['分档取值'], ['单位', 'c']], costRows),
        '四个科目之和即另议项的参考合计；企业填报总额时，四个科目按此构成等比缩放。'),
      tab3('其他参考值', tbl3([['项目'], ['取值'], ['说明']], [
        [['入企诊断天数建议', 'b'], [Object.keys(ip.diagnosisDays.values).map(function (k) { return k + '档 ' + ip.diagnosisDays.values[k] + ' 天'; }).join('　')], ['按场景投入档取建议值，企业填报值优先']],
        [['投入占营收常见区间', 'b'], [(ip.revenueShare.low * 100) + '% 至 ' + (ip.revenueShare.high * 100) + '%'], [ip.revenueShare.note]],
        [['私域部署价格区间', 'b'], [pr.privateDeploy[0].yearly + ' 至 ' + pr.privateDeploy[1].yearly + ' 元 / 套年'], ['按一套部署计列，不随账号数增加；测算只取区间两个端点']]
      ])),
      fn3(ip.disclosure)
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

  window.__M3_STATE = function () { return { step: M.step, picks: M.picks.length, gaps: profileGaps(), name: M.form && M.form.name }; };
  window.__M3_REPORT_PAGES = function () { return M.pages.length; };
  // 量高脚本专用：跳过输入流程直接进报告，只为验证版式分页
  window.__M3_INJECT = function (inp, out) {
    M.form = inp.profile; M.plan = inp.plan;
    M.picks = (inp.scenes || []).map(function (x) { return { sceneId: x.sceneId, gain: x.gain || {} }; });
    M.result = out; setStep('report');
  };
})();
