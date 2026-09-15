/* 模块 2 · 企业AI高价值场景排序
 * 屏 1 企业画像 → 屏 2 痛点矩阵（16 选 3–8，带严重度）→ 屏 3 现状与目标 → 屏 4 排序台（权重可调，实时重排）→ 屏 5 报告 42 页
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, CH;
  var core = window.DGG.coreM2;
  var M = { step: 'input', form: null, picks: [], cond: null, weights: null, result: null, sel: null, showAll: false, llmState: 'none', pages: [] };

  function bundle() {
    return { fields: DATA.fields, provinces: DATA.provinces, industries: DATA.industries, sectors: DATA.m2.sectors, libTotal: DATA.m2.libTotal,
      axes: DATA.m2.axes, conditions: DATA.m2.conditions, reportText: DATA.m2.reportText, credits: DATA.credits, lintWords: DATA.lintWords, promptTemplate: DATA.m2.promptTemplate };
  }
  function sectorOf(slug) { var r = null; DATA.industries.sectors.forEach(function (s) { s.industries.forEach(function (i) { if (i.slug === slug) r = s; }); }); return r; }
  function secData() { var s = sectorOf(M.form.industry); return s ? DATA.m2.sectors[s.key] : null; }
  function emptyForm() { return { name: '', industry: sh.displayIndustryDefault() || 'mfg-machinery', size: null, revenue: null, province: '浙江', years: null, ownership: 'private', customers: null, systems: [], itStaff: null, branches: 'single', overseas: 'no', role: 'owner' }; }
  function fromProfile(p) { var f = emptyForm(); Object.keys(f).forEach(function (k) { if (p[k] != null) f[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; }); return f; }
  function formReady() { return DATA.fields.every(function (f) { if (!f.required) return true; var v = M.form[f.key]; return f.type === 'multi' ? (Array.isArray(v) && v.length > 0) : !!v; }); }
  function requiredCount() { var t = 0, d = 0; DATA.fields.forEach(function (f) { if (!f.required) return; t++; var v = M.form[f.key]; if (f.type === 'multi' ? (v && v.length) : v) d++; }); return [d, t]; }
  function RT() { return DATA.m2.reportText; }
  function CD() { return DATA.m2.conditions; }
  function AX() { return DATA.m2.axes; }
  function groupOf(k) { return CD().groups.filter(function (g) { return g.key === k; })[0]; }
  function pickOf(id) { return M.picks.filter(function (x) { return x.id === id; })[0]; }
  function defaultWeights() { var w = {}; AX().items.forEach(function (a) { w[a.key] = a.weight; }); return w; }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function first(t) { return String(t || '').split('。')[0] + '。'; }

  // ---------- 生命周期 ----------
  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; CH = window.DGG.charts;
    if (!M.form) M.form = sh.getCompany() ? fromProfile(sh.getCompany()) : emptyForm();
    if (!M.weights) M.weights = defaultWeights();
    if (!M.cond) M.cond = { dataState: null, objective: null, window: null, capacity: null };
    M.step = step || (M.result ? 'report' : 'input');
    if (M.step === 'report' && !M.result) M.step = 'input';
    if ((M.step === 'board') && !M.result) M.step = 'input';
    draw();
  }
  function unmount() { }
  function onCompany(c) { M.form = c ? fromProfile(c) : emptyForm(); M.picks = []; M.result = null; if (M.step !== 'input') setStep('input'); else draw(); }
  function onIndustry(slug) { if (slug && M.form.industry !== slug) { M.form.industry = slug; M.picks = []; M.result = null; if (M.step === 'input') draw(); else setStep('input'); } }
  function setStep(s) { M.step = s; sh.go('m2', s); }
  function draw() {
    sh.clear($root);
    if (M.step === 'input') drawInput();
    else if (M.step === 'pains') drawPains();
    else if (M.step === 'cond') drawCond();
    else if (M.step === 'board') drawBoard();
    else drawReport();
    sh.touch();
  }
  function head(title) {
    $root.appendChild(h('div', { class: 'mod-head' }, [
      h('div', { class: 'crumb' }, [h('button', { onclick: function () { sh.go('home'); } }, ['首页']), ' / ']),
      h('h1', {}, [title || '企业AI高价值场景排序'])
    ]));
  }
  var STEPS = [['input', '企业画像'], ['pains', '选痛点'], ['cond', '现状与目标'], ['board', '场景排序']];
  function stepbar() {
    var cur = STEPS.map(function (x) { return x[0]; }).indexOf(M.step === 'report' ? 'board' : M.step);
    var box = h('div', { class: 'steps' });
    STEPS.forEach(function (s, i) {
      if (i) box.appendChild(h('span', { class: 'ln' }));
      box.appendChild(h('button', {
        class: 'st' + (i === cur ? ' on' : i < cur ? ' done' : ''),
        onclick: function () { if (i < cur) setStep(s[0]); }
      }, [h('b', {}, [i < cur ? '✓' : String(i + 1)]), s[1]]));
    });
    return box;
  }

  // ---------- 屏 1 · 企业画像 ----------
  function drawInput() {
    head(); $root.appendChild(stepbar());
    var f = M.form, grid = h('div', { class: 'form-grid' });
    DATA.fields.forEach(function (fd) {
      var ctrl, cls = '';
      if (fd.type === 'text') { var inp = h('input', { type: 'text', value: f.name, placeholder: fd.placeholder || '', maxlength: '40', oninput: function () { f.name = inp.value; } }); ctrl = inp; }
      else if (fd.type === 'industry') {
        cls = 'span2';
        var sec = sectorOf(f.industry) || DATA.industries.sectors[0], box = h('div');
        box.appendChild(h('div', { class: 'chips sm sector-row' }, DATA.industries.sectors.map(function (s) {
          return h('button', { class: 'chip' + (s.key === sec.key ? ' on' : ''), onclick: function () { f.industry = s.industries[0].slug; M.picks = []; draw(); } }, [s.name]);
        })));
        box.appendChild(h('div', { class: 'chips' }, sec.industries.map(function (i) {
          return h('button', { class: 'chip' + (i.slug === f.industry ? ' on' : ''), onclick: function () { f.industry = i.slug; draw(); } }, [i.name]);
        })));
        ctrl = box;
      } else if (fd.type === 'select') {
        var sel = h('select', { onchange: function () { f.province = sel.value; } });
        DATA.provinces.forEach(function (p) { sel.appendChild(h('option', { value: p, selected: p === f.province }, [p])); });
        ctrl = sel;
      } else if (fd.type === 'multi') {
        cls = 'span2';
        ctrl = h('div', { class: 'chips' }, fd.options.map(function (o) {
          var on = f.systems.indexOf(o.v) >= 0;
          return h('button', { class: 'chip' + (on ? ' on' : ''), onclick: function () {
            if (o.exclusive) f.systems = on ? [] : [o.v];
            else { f.systems = f.systems.filter(function (x) { return x !== 'none' && x !== o.v; }); if (!on) f.systems.push(o.v); }
            draw();
          } }, [o.t]);
        }));
      } else {
        ctrl = h('div', { class: 'chips' }, fd.options.map(function (o) {
          return h('button', { class: 'chip' + (f[fd.key] === o.v ? ' on' : ''), onclick: function () { f[fd.key] = o.v; draw(); } }, [o.t]);
        }));
      }
      grid.appendChild(h('div', { class: 'field ' + cls }, [
        h('label', {}, [fd.label, fd.required ? h('span', { class: 'req' }, ['*']) : null, fd.hint ? h('span', { class: 'hint' }, [fd.hint]) : null]), ctrl
      ]));
    });
    $root.appendChild(grid);
    var rc = requiredCount(), sd = secData();
    $root.appendChild(h('div', { class: 'actions-bar form-status' }, [
      h('button', { class: 'btn primary big', disabled: !formReady() || !sd, onclick: function () { sh.setCompany(JSON.parse(JSON.stringify(f))); sh.setQrReady(false); setStep('pains'); } }, ['下一步：选痛点']),
      h('span', { class: 'cnt' }, ['必填 ', h('b', { class: 'num' }, [rc[0] + ' / ' + rc[1]]), ' 项 · ' + (sd ? sd.sectorName + '场景库 ' + sd.scenes.length + ' 个场景' : '')])
    ]));
  }

  // ---------- 屏 2 · 痛点矩阵 ----------
  function drawPains() {
    head(); $root.appendChild(stepbar());
    var sd = secData(), rng = CD().painRange;
    var wrap = h('div', { class: 'pain-wrap' });
    var groups = h('div', { class: 'pain-groups' });
    CD().groups.forEach(function (g) {
      var box = h('div', { class: 'pgroup' });
      var list = sd.pains.filter(function (p) { return p.group === g.key; });
      var picked = list.filter(function (p) { return pickOf(p.id); }).length;
      box.appendChild(h('div', { class: 'hd', style: 'background:' + g.color }, [h('span', {}, [g.name]), h('span', { class: 'n' }, [picked ? '已选 ' + picked : g.desc])]));
      var ul = h('div', { class: 'list' });
      list.forEach(function (p) {
        var pk = pickOf(p.id);
        var item = h('div', { class: 'pitem' + (pk ? ' on' : ''), 'data-id': p.id, style: '--pc:' + g.color });
        item.appendChild(h('div', { class: 't', onclick: function () { toggle(p); } }, [h('i', {}, [pk ? '✓' : '']), p.text]));
        item.appendChild(h('div', { class: 'h', onclick: function () { toggle(p); } }, [p.hint]));
        if (pk) {
          var dots = h('div', { class: 'dots' });
          [1, 2, 3, 4, 5].forEach(function (n) {
            dots.appendChild(h('button', { 'data-sev': String(n), class: pk.severity >= n ? 'on' : '', onclick: function () { pk.severity = n; draw(); } }, [String(n)]));
          });
          item.appendChild(h('div', { class: 'sev' }, [h('span', { class: 'lb' }, ['严重度']), dots, h('span', { class: 'nm' }, [rng.severityNames[pk.severity]])]));
        }
        ul.appendChild(item);
      });
      box.appendChild(ul);
      groups.appendChild(box);
    });
    wrap.appendChild(groups);

    var side = h('div', { class: 'pain-side' });
    var ok = M.picks.length >= rng.min && M.picks.length <= rng.max;
    var cntBox = h('div', { class: 'box' }, [
      h('h4', {}, ['已选痛点']),
      h('div', { class: 'cnt' }, [String(M.picks.length), h('small', {}, ['/ ' + rng.min + '–' + rng.max + ' 项'])])
    ]);
    var picked = h('div', { class: 'picked' });
    M.picks.slice().sort(function (a, b) { return b.severity - a.severity; }).forEach(function (x) {
      var p = sd.pains.filter(function (y) { return y.id === x.id; })[0], g = groupOf(p.group);
      picked.appendChild(h('div', { class: 'row' }, [h('i', { style: 'background:' + g.color }), h('span', {}, [p.text]), h('b', {}, ['严重度 ' + x.severity])]));
    });
    if (M.picks.length) cntBox.appendChild(picked);
    else cntBox.appendChild(h('div', { class: 'picked' }, [h('div', { class: 'row' }, [h('span', { style: 'color:var(--text-sub)' }, ['勾选左侧与贵司相符的经营现象'])])]));
    side.appendChild(cntBox);
    side.appendChild(h('div', { class: 'box' }, [
      h('h4', {}, ['接下来']),
      h('div', { style: 'font-size:12px;color:var(--text-sub);line-height:1.7' }, ['勾选的痛点与场景标签匹配后，按严重度加权算出痛点强度，占总分 ' + Math.round(AX().items[0].weight * 100) + '%。'])
    ]));
    wrap.appendChild(side);
    $root.appendChild(wrap);
    $root.appendChild(h('div', { class: 'actions-bar form-status' }, [
      h('button', { class: 'btn ghost', onclick: function () { setStep('input'); } }, ['上一步']),
      h('button', { class: 'btn primary big', disabled: !ok, onclick: function () { setStep('cond'); } }, ['下一步：现状与目标']),
      h('span', { class: 'cnt' }, [sd.sectorName + ' · 共 ', h('b', { class: 'num' }, [String(sd.pains.length)]), ' 项候选，选 ' + rng.min + '–' + rng.max + ' 项'])
    ]));
  }
  function toggle(p) {
    var i = M.picks.map(function (x) { return x.id; }).indexOf(p.id);
    if (i >= 0) M.picks.splice(i, 1);
    else if (M.picks.length < CD().painRange.max) M.picks.push({ id: p.id, severity: CD().painRange.severityDefault });
    draw();
  }

  // ---------- 屏 3 · 现状与目标 ----------
  function drawCond() {
    head(); $root.appendChild(stepbar());
    var grid = h('div', { class: 'cond-grid' });
    CD().fields.forEach(function (fd) {
      var opts = h('div', { class: 'opts' });
      fd.options.forEach(function (o) {
        opts.appendChild(h('button', { class: M.cond[fd.key] === o.v ? 'on' : '', 'data-k': fd.key, 'data-v': o.v, onclick: function () { M.cond[fd.key] = o.v; draw(); } },
          [o.t, o.note ? h('span', { class: 'nt' }, [o.note]) : null]));
      });
      grid.appendChild(h('div', { class: 'cond' }, [h('label', {}, [fd.label]), opts]));
    });
    $root.appendChild(grid);
    var ok = CD().fields.every(function (f) { return !f.required || M.cond[f.key]; });
    $root.appendChild(h('div', { class: 'actions-bar form-status' }, [
      h('button', { class: 'btn ghost', onclick: function () { setStep('pains'); } }, ['上一步']),
      h('button', { class: 'btn primary big', disabled: !ok, onclick: run }, ['生成场景排序']),
      h('span', { class: 'cnt' }, ['四项现状会改变数据可得、见效周期与实施门槛的得分'])
    ]));
  }

  // ---------- 计算 ----------
  function inputOf() {
    return { profile: JSON.parse(JSON.stringify(M.form)), pains: M.picks.map(function (x) { return { id: x.id, severity: x.severity }; }),
      conditions: JSON.parse(JSON.stringify(M.cond)), weights: JSON.parse(JSON.stringify(M.weights)) };
  }
  function run() {
    var r = core.compute(inputOf(), bundle());
    if (!r.ok) { setStep('pains'); return; }
    M.result = r; M.sel = r.ranked[0].id; M.llmState = 'none';
    sh.charge(r.meta.credits); sh.setQrReady(true); sh.recommend('lite');
    setStep('board');
    sh.llm(core.buildPrompt(r, bundle()), 8000).then(function (res) {
      if (res.skipped) return;
      if (res.failed) { M.llmState = 'failed'; return; }
      var merged = core.mergePolish(r, res.text, sh.lint.hit);
      var changed = merged.ranked.some(function (s) { return s.source === 'llm'; });
      M.llmState = changed ? 'ok' : 'failed';
      if (changed) { M.result = merged; if (M.step === 'board' || M.step === 'report') draw(); }
    });
  }
  function recompute() {
    var r = core.compute(inputOf(), bundle());
    if (r.ok) { M.result = r; if (!r.scenes.some(function (s) { return s.id === M.sel; })) M.sel = r.ranked[0].id; }
    return r.ok;
  }
  function selScene() { return M.result.scenes.filter(function (s) { return s.id === M.sel; })[0] || M.result.ranked[0]; }

  // ---------- 屏 4 · 排序台 ----------
  function drawBoard() {
    head(); $root.appendChild(stepbar());
    var board = h('div', { class: 'board' });
    var left = h('div', { class: 'col', id: 'm2-left' }), mid = h('div', { class: 'col', id: 'm2-mid' }), right = h('div', { class: 'col', id: 'm2-right' });
    board.appendChild(left); board.appendChild(mid); board.appendChild(right);
    $root.appendChild(board);
    fillLeft(left); fillMid(mid); fillRight(right);
  }
  function refresh() {
    var mid = document.getElementById('m2-mid'), right = document.getElementById('m2-right'), left = document.getElementById('m2-left');
    if (!mid) return;
    sh.clear(mid); fillMid(mid);
    sh.clear(right); fillRight(right);
    var fn = left.querySelector('.funnel-slot');
    if (fn) { sh.clear(fn); fn.appendChild(miniFunnel(M.result.funnel)); }
    left.querySelectorAll('.wrow').forEach(function (row) {
      var k = row.getAttribute('data-k');
      row.querySelector('.v').textContent = Math.round(M.result.weights[k] * 100) + '%';
    });
    left.querySelectorAll('.presets button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-p') === M.result.weights.preset); });
    sh.touch();
  }
  function fillLeft(left) {
    var wbox = h('div', { class: 'bcard' });
    wbox.appendChild(h('h4', {}, ['评分权重', h('span', { class: 'sub' }, ['可现场调整'])]));
    var pre = h('div', { class: 'presets' });
    AX().presets.forEach(function (ps) {
      pre.appendChild(h('button', { 'data-p': ps.key, class: M.result.weights.preset === ps.key ? 'on' : '', title: ps.desc,
        onclick: function () { M.weights = JSON.parse(JSON.stringify(ps.weights)); if (recompute()) refresh(); } }, [ps.name]));
    });
    wbox.appendChild(pre);
    AX().items.forEach(function (a) {
      var row = h('div', { class: 'wrow', 'data-k': a.key, style: '--wc:' + a.color });
      row.appendChild(h('div', { class: 'top' }, [h('span', { class: 'n' }, [a.name]), h('span', { class: 'v', style: 'color:' + a.color }, [Math.round(M.result.weights[a.key] * 100) + '%'])]));
      var rg = h('input', { type: 'range', min: '0', max: '60', step: '1', value: String(Math.round(M.weights[a.key] * 100)) });
      rg.addEventListener('input', function () {
        M.weights[a.key] = Math.max(0.01, Number(rg.value) / 100);
        if (recompute()) refresh();
      });
      row.appendChild(rg);
      row.appendChild(h('div', { class: 'hint' }, [a.desc]));
      wbox.appendChild(row);
    });
    wbox.appendChild(h('div', { style: 'font-size:10px;color:var(--text-sub);border-top:1px solid var(--line);padding-top:8px;margin-top:2px;line-height:1.5' }, [AX().formula]));
    left.appendChild(wbox);
    var fbox = h('div', { class: 'bcard' });
    fbox.appendChild(h('h4', {}, ['筛选过程']));
    var slot = h('div', { class: 'funnel-slot' }); slot.appendChild(miniFunnel(M.result.funnel));
    fbox.appendChild(slot);
    left.appendChild(fbox);
  }
  function miniFunnel(steps) {
    var box = h('div', { class: 'funnel-mini' });
    var max = Math.max.apply(null, steps.map(function (x) { return x.count; })) || 1;
    steps.forEach(function (st, i) {
      var k = i / Math.max(1, steps.length - 1);
      var a = Math.round(28 + k * 34), b = Math.round(70 - k * 26);
      box.appendChild(h('div', { class: 'fr' }, [
        h('div', { class: 'bar', style: 'width:' + Math.max(38, Math.round(st.count / max * 100)) + '%;background:linear-gradient(90deg,hsl(213,62%,' + b + '%),hsl(213,72%,' + a + '%))' }, [st.label]),
        h('span', { class: 'cnt' }, [String(st.count)])
      ]));
      box.appendChild(h('div', { class: 'nt' }, [st.note]));
    });
    return box;
  }
  function fillMid(mid) {
    var r = M.result, t1 = r.ranked[0];
    var vb = h('div', { class: 'bcard', style: 'background:linear-gradient(135deg,var(--brand-navy),#16347F);border:0;color:#fff;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center' }, [
      h('div', {}, [
        h('div', { style: 'font-size:11px;letter-spacing:2px;opacity:.75' }, [r.verdict.label]),
        h('div', { style: 'font-size:19px;font-weight:800;line-height:1.35;margin:4px 0 6px' }, [r.verdict.headline]),
        h('div', { style: 'font-size:12px;opacity:.85;line-height:1.6' }, [r.verdict.text])
      ]),
      h('div', { style: 'text-align:right' }, [
        h('div', { style: 'font-size:34px;font-weight:800;color:var(--brand-cyan);line-height:1' }, [String(r.verdict.score)]),
        h('div', { style: 'font-size:11px;opacity:.8;margin-top:4px' }, [r.verdict.scoreLabel])
      ])
    ]);
    mid.appendChild(vb);

    var list = M.showAll ? r.scenes : r.ranked;
    var box = h('div', { class: 'bcard' });
    box.appendChild(h('h4', {}, [
      '场景排序' + (M.showAll ? '（全部 ' + r.scenes.length + ' 个）' : '（前 ' + r.ranked.length + ' 个）'),
      h('button', { class: 'btn ghost', style: 'padding:4px 10px;font-size:12px', onclick: function () { M.showAll = !M.showAll; refresh(); } }, [M.showAll ? '只看前 8 个' : '看全部 ' + r.scenes.length + ' 个'])
    ]));
    var tbl = h('table', { class: 'rank-tbl' });
    tbl.appendChild(h('thead', {}, [h('tr', {}, [
      h('th', { class: 'c' }, ['排名']), h('th', {}, ['场景']), h('th', {}, ['四维得分']), h('th', { class: 'r' }, ['总分']), h('th', {}, ['对应模块'])
    ])]));
    var tb = h('tbody');
    list.forEach(function (s) {
      var ax = h('div', { class: 'ax' });
      r.axes.forEach(function (a) {
        var v = a.invert ? 6 - s.axis[a.key] : s.axis[a.key];
        ax.appendChild(h('i', { style: 'height:' + (5 + v * 4.6) + 'px;background:' + a.color, title: a.name + ' ' + s.axis[a.key] }));
      });
      var tr = h('tr', { 'data-id': s.id, class: (s.rank <= 3 ? 'top ' : '') + (s.id === M.sel ? 'on' : ''), onclick: function () { M.sel = s.id; refresh(); } }, [
        h('td', { class: 'c' }, [h('span', { class: 'rk' }, [String(s.rank)])]),
        h('td', {}, [h('div', { class: 'nm' }, [s.name]), h('div', { class: 'st' }, [s.stage + ' · ' + s.user])]),
        h('td', {}, [ax]),
        h('td', { class: 'r' }, [h('span', { class: 'sc' }, [s.score.toFixed(1)])]),
        h('td', {}, [h('span', { class: 'mod' }, [s.module]), s.blocked ? h('span', { class: 'warn', style: 'margin-left:6px' }, ['需补数据']) : null])
      ]);
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    box.appendChild(tbl);
    var lg = h('div', { class: 'axis-legend' });
    r.axes.forEach(function (a) { lg.appendChild(h('span', {}, [h('i', { style: 'background:' + a.color }), a.name + ' ' + Math.round(a.weight * 100) + '%'])); });
    box.appendChild(lg);
    mid.appendChild(box);

    var lb = h('div', { class: 'bcard' });
    lb.appendChild(h('h4', {}, ['三步走', h('span', { class: 'sub' }, ['12 个月']) ]));
    lb.appendChild(CH.ladder(r.combo));
    mid.appendChild(lb);

    mid.appendChild(h('div', { class: 'board-foot' }, [
      h('button', { class: 'btn primary big', onclick: function () { setStep('report'); } }, ['出具完整报告']),
      h('button', { class: 'btn', onclick: sh.showWeChat }, ['结果发送到微信']),
      h('button', { class: 'btn ghost', onclick: function () { setStep('cond'); } }, ['改条件']),
      h('span', { class: 'sp' }),
      h('span', { class: 'note' }, ['本次消耗 ' + r.meta.credits + ' 积分 · ' + r.profile.sectorName + '场景库 ' + r.meta.sceneCount + ' 个场景'])
    ]));
  }
  function fillRight(right) {
    var r = M.result;
    var mbox = h('div', { class: 'bcard' });
    mbox.appendChild(h('h4', {}, ['价值与门槛', h('span', { class: 'sub' }, ['序号对应左表排名'])]));
    mbox.appendChild(CH.bubbleMatrix(M.showAll ? r.scenes : r.ranked, true));
    right.appendChild(mbox);
    var s = selScene();
    var d = h('div', { class: 'bcard detail' });
    d.appendChild(h('div', { class: 'hd' }, [
      h('div', { class: 'rk' }, [String(s.rank)]),
      h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, [s.stage + ' · ' + s.module + ' · ' + s.weeks + ' 周 · ' + s.cost + '投入'])])
    ]));
    var dl = h('dl');
    [['给谁用', s.user], ['替代什么', s.replaces], ['预期指标', s.metric], ['为什么排这里', s.reason]].forEach(function (kv) {
      dl.appendChild(h('dt', {}, [kv[0]])); dl.appendChild(h('dd', {}, [kv[1]]));
    });
    d.appendChild(dl);
    d.appendChild(h('div', { style: 'font-size:12px;font-weight:700;color:var(--text);margin:12px 0 4px' }, ['所需数据']));
    var ol = h('ol'); s.dataList.forEach(function (x) { ol.appendChild(h('li', {}, [x])); }); d.appendChild(ol);
    d.appendChild(h('div', { style: 'font-size:12px;font-weight:700;color:var(--text);margin:12px 0 4px' }, ['第一步']));
    d.appendChild(h('div', { style: 'font-size:12px;color:var(--text);line-height:1.6' }, [s.firstStep]));
    if (s.blocked) d.appendChild(h('div', { style: 'margin-top:10px;padding:9px 11px;border-radius:8px;background:#FDF1E0;color:#7A4E0B;font-size:12px;line-height:1.6' }, ['关键数据源缺失：' + s.missingSystemsName.join('、') + '。补齐后重新评估即可进入候选。']));
    right.appendChild(d);
  }

  // ---------- 屏 5 · 报告 ----------
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function reportNo(r) { var s = 0, n = r.profile.name; for (var i = 0; i < n.length; i++) s = (s * 31 + n.charCodeAt(i)) % 100000; return 'DGG-S-' + today().replace(/-/g, '') + '-' + ('00000' + s).slice(-5); }
  function tag(text, cls, style) { return h('span', { class: 'tag ' + (cls || ''), style: style || '' }, [text]); }
  function banner(no, title, sub, right) { return h('div', { class: 'ch-banner' }, [h('div', { class: 'no' }, [no]), h('div', {}, [h('div', { class: 't' }, [title]), h('div', { class: 'st' }, [sub])]), right ? h('div', { class: 'rt' }, [right]) : null]); }
  function fig(title, sub, body, note) { var f = h('div', { class: 'fig' }, [h('div', { class: 'ft' }, [title]), sub ? h('div', { class: 'fs' }, [sub]) : null]); (Array.isArray(body) ? body : [body]).forEach(function (b) { if (b) f.appendChild(b); }); if (note) f.appendChild(h('div', { class: 'fnote' }, [note])); return f; }
  function callout(label, headline, text, cls) { return h('div', { class: 'callout ' + (cls || '') }, [h('div', { class: 'lb' }, [label]), h('div', {}, [headline ? h('div', { class: 'hl' }, [headline]) : null, text ? h('div', { class: 'x' }, [text]) : null])]); }
  function findings(items) { return h('ul', { class: 'findings' }, items.map(function (it) { return h('li', {}, [h('b', {}, [it[0]]), it[1]]); })); }
  function verdictBar(v, slim) { return h('div', { class: 'verdict' + (slim ? ' slim' : '') }, [h('div', {}, [h('div', { class: 'lb' }, [v.label]), h('div', { class: 'hl' }, [v.headline])]), v.score != null ? h('div', { class: 'sc' }, [h('div', { class: 'k' }, [v.scoreLabel]), h('div', { class: 'v num' }, [String(v.score)])]) : null]); }
  function kv(pairs) { var dl = h('dl', { class: 'kv' }); pairs.forEach(function (x) { if (!x[1]) return; dl.appendChild(h('dt', {}, [x[0]])); dl.appendChild(h('dd', {}, [x[1]])); }); return dl; }
  function tbl(headers, rows, cls) {
    var t = h('table', { class: 'tbl ' + (cls || '') });
    t.appendChild(h('thead', {}, [h('tr', {}, headers.map(function (x) { return h('th', { class: x[1] || '' }, [x[0]]); }))]));
    var tb = h('tbody');
    rows.forEach(function (r) { tb.appendChild(h('tr', {}, r.map(function (c) { return h('td', { class: (c && c.cls) || '' }, [c && c.el ? c.el : (c && c.t != null ? c.t : c)]); }))); });
    t.appendChild(tb); return t;
  }
  function wbar(r) {
    var b = h('div', { class: 'wbar' });
    r.axes.forEach(function (a) { b.appendChild(h('i', { style: 'width:' + (a.weight * 100) + '%;background:' + a.color })); });
    var lg = h('div', { class: 'wbar-lg' });
    r.axes.forEach(function (a) { lg.appendChild(h('span', {}, [h('i', { style: 'background:' + a.color }), a.name + ' ' + Math.round(a.weight * 100) + '%'])); });
    return h('div', {}, [b, lg]);
  }
  function scHead(s) {
    return h('div', { class: 'sc-hd' }, [
      h('div', { class: 'rk' }, [String(s.rank)]),
      h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, [s.stage + ' 环节 · 给' + s.user + '用 · 对应' + s.module])]),
      h('div', { class: 'sc' }, [h('div', { class: 'v num' }, [s.score.toFixed(1)]), h('div', { class: 'k' }, ['综合得分 · 排名第 ' + s.rank])])
    ]);
  }
  function page(chapter, r, cls) {
    var p = h('section', { class: 'page ' + (cls || '') });
    if (chapter) p.appendChild(h('div', { class: 'page-head' }, [h('span', { class: 'ch' }, [chapter]), h('span', { class: 'rt' }, [RT().reportTitle + ' · ' + r.profile.name])]));
    var body = h('div', { class: 'page-body' }); p.appendChild(body); p._body = body; return p;
  }
  function printBrief() { document.body.classList.add('print-brief'); var off = function () { document.body.classList.remove('print-brief'); window.removeEventListener('afterprint', off); }; window.addEventListener('afterprint', off); sh.print(); }

  function drawReport() {
    var r = M.result; M.pages = [];
    $root.appendChild(h('div', { class: 'report-bar' }, [
      h('button', { class: 'btn primary big', onclick: printBrief }, ['打印速览']),
      h('button', { class: 'btn big', onclick: sh.print }, ['打印完整报告']),
      h('button', { class: 'btn big', onclick: sh.showWeChat }, ['发送到微信']),
      h('button', { class: 'btn ghost', onclick: function () { setStep('board'); } }, ['回排序台']),
      h('span', { class: 'spacer' }), h('span', { class: 'pages-count', id: 'm2-pages-count' }),
      h('button', { class: 'btn ghost', onclick: function () { M.picks = []; M.result = null; M.cond = { dataState: null, objective: null, window: null, capacity: null }; M.weights = defaultWeights(); sh.setQrReady(false); setStep('input'); } }, [sh.station() === '1' ? '下一位' : '重新排序'])
    ]));
    var wrap = h('div', { class: 'report' }), toc = h('nav', { class: 'toc' }), pages = h('div', { class: 'pages' });
    var add = function (title, el, o) { o = o || {}; M.pages.push({ title: title, sub: o.sub, one: o.one, el: el, brief: !!o.brief }); };
    var top5 = r.ranked.slice(0, 5);

    add('封面', pCover(r), { brief: true });
    add('本报告导航', pNav(r), { one: '章节与一句话内容' });
    add('01 排序结论速览', pQuick1(r), { brief: true, one: '六个问题、六句回答，以及排序结论' });
    add('', pQuick2(r), { brief: true, sub: '三步走与前三个场景' });
    add('02 企业画像', pProfile(r), { one: '基本情况、现状条件与行业视角' });
    add('', pSectorView(r), { sub: '行业视角与场景库覆盖' });
    add('03 痛点画像', pPain1(r), { one: '勾选的痛点分布与严重度' });
    add('', pPain2(r), { sub: '痛点与场景的对应关系' });
    add('04 评分方法', pMethod(r), { one: '四维定义、权重与计分口径' });
    add('', pFunnel(r), { sub: '从场景库到排序表' });
    add('05 场景排序总表', pRank1(r), { brief: true, one: '前 8 个场景的四维得分与排名' });
    add('', pRank2(r), { sub: '四维得分构成' });
    add('', pRank3(r), { sub: '全部候选场景评分' });
    add('06 价值与门槛', pMatrix(r), { one: '四象限定位与前三对比' });
    add('', pRadar(r), { sub: '前三个场景四维对比' });
    top5.forEach(function (s, i) {
      var no = ('0' + (7 + i)).slice(-2);
      add(no + ' 第 ' + (i + 1) + ' 场景 · ' + s.name, pScene1(r, s), i === 0 ? { brief: true, one: '前五个场景逐个展开：做法、数据、指标与前置条件' } : { });
      add('', pScene2(r, s), { sub: s.name + ' · 做法与验收' });
    });
    add('12 数据就绪度', pReady1(r), { one: '场景与数据源的对应与缺口' });
    add('', pReady2(r), { sub: '补齐清单与解锁关系' });
    add('13 12 个月排期', pPlan1(r), { brief: true, one: '三批次排期与里程碑' });
    add('', pPlan2(r), { sub: '三批次交付物与验收' });
    add('14 投入与回报', pInvest1(r), { one: '投入档位、区间与折算口径' });
    add('', pInvest2(r), { sub: '逐场景投入与收益口径' });
    add('15 风险与前置条件', pRisks(r), { one: '由现状条件触发的提示' });
    add('16 90 天启动清单', pChecklist(r), { one: '可勾选执行项与负责人' });
    add('17 未入选场景', pExcluded(r), { one: '本轮暂不启动的场景与原因' });
    add('附录 A 全部场景评分', pAppA(r, 0), { one: '候选场景四维得分明细' });
    add('', pAppA(r, 1), { sub: '评分明细（续）' });
    add('附录 B 行业痛点库', pAppB(r), { one: '本行业 16 项候选痛点' });
    add('附录 C 场景与模块', pAppC(r), { one: '场景对应的薯片AI智能体模块' });
    add('附录 D 术语与方法', pAppD(r), { one: '四维定义与计分说明' });
    add('附录 E 信息来源', pAppE(r), { one: '数据来源、置信度与边界' });
    add('相关服务', pServices(r), { one: '入企诊断与落地服务' });
    add('封底', pBack(r), {});

    M.pages.forEach(function (pg, i) {
      pg.el.setAttribute('data-page', String(i + 1)); if (pg.brief) pg.el.classList.add('brief');
      if (i > 0 && i < M.pages.length - 1) pg.el.appendChild(h('div', { class: 'page-foot' }, [h('span', {}, [r.profile.name + ' · ' + RT().reportTitle + ' · ' + RT().issuer]), h('span', { class: 'num' }, ['第 ' + (i + 1) + ' 页 / 共 ' + M.pages.length + ' 页'])]));
      pages.appendChild(pg.el);
    });
    toc.appendChild(h('h4', {}, ['目录']));
    M.pages.forEach(function (pg, i) {
      if (!pg.title && !pg.sub) return;
      toc.appendChild(h('button', { class: pg.sub ? 'sub' : '', onclick: function () { pg.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, [h('span', {}, [trunc(pg.title || pg.sub, 14)]), h('span', { class: 'pn num' }, [String(i + 1)])]));
    });
    wrap.appendChild(toc); wrap.appendChild(pages); $root.appendChild(wrap);
    document.getElementById('m2-pages-count').textContent = '共 ' + M.pages.length + ' 页';
    var nav = document.getElementById('m2-nav-tbl');
    if (nav) M.pages.forEach(function (pg, i) { if (!pg.title || !pg.one) return; nav.appendChild(h('tr', {}, [h('td', {}, [pg.title.split(' ')[0]]), h('td', {}, [pg.title.replace(/^\S+\s/, '')]), h('td', {}, [pg.one]), h('td', { class: 'num' }, [String(i + 1)])])); });
  }

  // ---- 1 封面 ----
  function pCover(r) {
    var p = page('', r, 'cover m2-cover');
    var hero = h('div', { class: 'hero' });
    hero.appendChild(CH.cover2(r.scenes, r.scenes.length * 13 + r.pains.length));
    hero.appendChild(h('img', { class: 'logo', src: sh.CFG.logo, alt: '顶呱呱' }));
    hero.appendChild(h('div', { class: 'ov' }, [
      h('div', { class: 'co' }, [r.profile.name]),
      h('div', { class: 'rt' }, [RT().reportTitle]),
      h('div', { class: 'en' }, [RT().reportTitleEn])
    ]));
    p._body.appendChild(hero);
    var t1 = r.ranked[0];
    p._body.appendChild(h('div', { class: 'low' }, [
      h('div', { class: 'pick' }, [
        h('div', { class: 'lb' }, ['先做这一个']),
        h('div', { class: 'nm' }, [t1.name]),
        h('div', { class: 'mt' }, [t1.stage + ' 环节 · 给' + t1.user + '用 · 替代' + t1.replaces]),
        h('div', { class: 'chips' }, [
          h('span', {}, [t1.module]), h('span', {}, [t1.weeks + ' 周上线']), h('span', {}, [t1.cost + '投入']),
          h('span', {}, ['综合 ' + t1.score.toFixed(1) + ' 分'])
        ])
      ]),
      CH.dial(t1.score, '首选场景得分', '共 ' + r.meta.sceneCount + ' 个候选')
    ]));
    var q = h('div', { class: 'qrow' });
    r.keyNumbers.slice(0, 6).forEach(function (k) { if (k.wide) return; q.appendChild(h('div', {}, [h('i', {}, [k.v]), k.k])); });
    p._body.appendChild(q);
    p._body.appendChild(h('div', { class: 'bot' }, [
      h('span', {}, [RT().issuer + ' · ' + RT().product]),
      h('span', {}, ['报告编号 ' + reportNo(r) + '　出具日期 ' + today()])
    ]));
    return p;
  }

  // ---- 2 导航 ----
  function pNav(r) {
    var p = page('本报告导航', r);
    p._body.appendChild(banner('00', '本报告导航', '共 ' + M.pages.length + ' 页（生成后回填），按「结论 → 依据 → 方案 → 条件」四段组织'));
    p._body.appendChild(h('div', { class: 'guide' }, [h('ol', {}, RT().readingGuide.map(function (t) { return h('li', {}, [t]); }))]));
    var t = h('table', { class: 'tbl nav-tbl compact' });
    t.appendChild(h('thead', {}, [h('tr', {}, [h('th', {}, ['章']), h('th', {}, ['标题']), h('th', {}, ['一句话内容']), h('th', { class: 'r' }, ['页'])])]));
    t.appendChild(h('tbody', { id: 'm2-nav-tbl' }));
    p._body.appendChild(t);
    p._body.appendChild(callout('本次口径', '四维权重为「' + r.weights.presetName + '」', AX().formula + '　权重：' + r.axes.map(function (a) { return a.name + ' ' + Math.round(a.weight * 100) + '%'; }).join('、') + '。'));
    return p;
  }

  // ---- 3 结论速览 ----
  function pQuick1(r) {
    var p = page('01 排序结论速览', r);
    p._body.appendChild(banner('01', '排序结论速览', '六个问题、六句回答', r.profile.sectorName + ' · ' + r.meta.sceneCount + ' 个候选场景'));
    var g = h('div', { class: 'qcards' });
    r.quickView.forEach(function (q) {
      g.appendChild(h('div', { class: 'qcard tone-' + q.tone }, [
        h('div', { class: 'hd' }, [h('span', { class: 'n' }, [String(q.n)]), h('span', { class: 'q' }, [q.q])]),
        h('div', { class: 'bd' }, [h('div', { class: 'a' }, [q.a]), h('div', { class: 'x' }, [q.text])])
      ]));
    });
    p._body.appendChild(g);
    p._body.appendChild(verdictBar(r.verdict));
    return p;
  }
  function pQuick2(r) {
    var p = page('01 排序结论速览', r);
    p._body.appendChild(fig('三步走：先做一个，再做两个，储备两个', '按四维总分与数据条件分批，合计 12 个月', CH.ladder(r.combo), '批次内的场景可并行；储备批次在数据补齐后重新评估。'));
    var g = h('div', { class: 'three' });
    r.ranked.slice(0, 3).forEach(function (s) {
      g.appendChild(h('div', { class: 'scene-card' }, [
        h('div', { class: 'hd' }, [h('span', { class: 'rk' }, [String(s.rank)]), h('span', {}, [s.name]), h('span', { class: 'num' }, [s.score.toFixed(1)])]),
        h('div', { class: 'bd' }, [
          h('div', { class: 'row' }, [h('span', {}, ['环节']), s.stage]),
          h('div', { class: 'row' }, [h('span', {}, ['给谁用']), s.user]),
          h('div', { class: 'row' }, [h('span', {}, ['替代']), trunc(s.replaces, 18)]),
          h('div', { class: 'row' }, [h('span', {}, ['预期']), s.metric]),
          h('div', { class: 'row' }, [h('span', {}, ['第一步']), s.firstStep]),
          h('div', { class: 'row' }, [h('span', {}, ['模块']), s.module + ' · ' + s.weeks + ' 周 · ' + s.cost + '投入'])
        ])
      ]));
    });
    p._body.appendChild(g);
    p._body.appendChild(callout('下一步', '第一步就是这一件事', r.summary.next, 'ok'));
    return p;
  }

  // ---- 5 企业画像 ----
  function pProfile(r) {
    var p = page('02 企业画像', r);
    p._body.appendChild(banner('02', '企业画像', '基本情况与现状条件', reportNo(r)));
    p._body.appendChild(h('p', { class: 'lead' }, [r.profile.portrait]));
    var chips = h('div', { class: 'chips sm' });
    r.profile.tags.forEach(function (t) { chips.appendChild(h('span', { class: 'chip' }, [t])); });
    p._body.appendChild(chips);
    p._body.appendChild(h('h3', {}, ['现状与目标']));
    var cd = CD().fields;
    p._body.appendChild(tbl([['问题'], ['本次作答'], ['对排序的影响']], cd.map(function (f) {
      var v = r.conditions[f.key], nm = r.conditions[f.key + 'Name'];
      var o = f.options.filter(function (x) { return x.v === v; })[0] || {};
      var eff = f.key === 'dataState' ? (o.adj ? '依赖业务系统的场景数据可得分调整 ' + o.adj + ' 分' : '数据可得分不做调整')
        : f.key === 'objective' ? '同分场景中优先排与该目标相关的'
        : f.key === 'window' ? (o.fast > 0 ? '见效慢的场景下调 ' + o.fast + ' 分' : o.fast < 0 ? '长周期场景回调 ' + (-o.fast) + ' 分' : '见效周期分不做调整')
        : (o.adj ? '实施门槛分调整 ' + (o.adj > 0 ? '+' : '') + o.adj + ' 分' : '实施门槛分不做调整');
      return [{ t: f.label, cls: 'k' }, { t: nm, cls: 'b' }, eff];
    }), 'compact'));
    p._body.appendChild(h('h3', {}, ['现有业务系统']));
    var sys = h('div', { class: 'mods' });
    r.readiness.systems.forEach(function (s) {
      sys.appendChild(h('div', { class: 'm', style: s.has ? 'border-color:#BFE3D4;background:#F3FBF7' : '' }, [
        h('div', { class: 'n' }, [s.name, ' ', tag(s.has ? '已有' : '暂无', s.has ? 'ok' : 'dim')]),
        h('div', { class: 'x' }, [s.need ? '本行业 ' + s.need + ' 个场景需要它' : '本行业场景暂不依赖'])
      ]));
    });
    p._body.appendChild(sys);
    p._body.appendChild(callout('数据现状', r.conditions.dataStateName, r.conditions.dataStateNote));
    return p;
  }
  function pSectorView(r) {
    var p = page('02 企业画像', r);
    p._body.appendChild(h('h3', {}, ['行业视角 · ' + r.sectorInsight.name]));
    p._body.appendChild(h('p', {}, [r.sectorInsight.insight]));
    p._body.appendChild(fig('本行业最常见的三个 AI 切入点', '按服务同类企业的落地顺序排列',
      h('div', { class: 'three' }, r.sectorInsight.aiFocus.map(function (t, i) {
        return h('div', { class: 'tile', style: '--tc:' + r.axes[i % r.axes.length].color }, [h('div', { class: 'k' }, ['切入点 ' + (i + 1)]), h('div', { class: 'v', style: 'font-size:15px;line-height:1.4' }, [t])]);
      })), '来源：行业场景库的落地经验归纳。'));
    p._body.appendChild(h('h3', {}, ['场景库覆盖']));
    p._body.appendChild(findings([
      ['场景库共 ' + DATA.m2.libTotal + ' 个场景，', '按 ' + DATA.industries.sectors.length + ' 个行业大类整理，每个大类 ' + r.meta.sceneCount + ' 个，覆盖该大类下的各细分行业。'],
      ['本次匹配到' + r.sectorInsight.name + '的 ' + r.meta.sceneCount + ' 个场景，', '逐个按四维打分，再按贵司勾选的痛点与现有系统重排。'],
      ['其中 ' + r.readiness.zeroDep + ' 个场景无需接入业务系统，', '整理现有资料即可起步；' + r.blocked.length + ' 个场景因关键数据源缺失本轮暂缓。']
    ]));
    p._body.appendChild(tbl([['行业大类'], ['候选场景数', 'r'], ['本次是否匹配', 'c']], DATA.industries.sectors.map(function (s) {
      var sd = DATA.m2.sectors[s.key];
      return [s.name, { t: String(sd ? sd.scenes.length : 0), cls: 'r num' }, { el: s.key === r.profile.sector ? tag('本次匹配', 'ok') : h('span', { class: 'muted' }, ['—']), cls: 'c' }];
    }), 'compact'));
    return p;
  }

  // ---- 7-8 痛点画像 ----
  function pPain1(r) {
    var p = page('03 痛点画像', r);
    p._body.appendChild(banner('03', '痛点画像', '本次勾选 ' + r.pains.length + ' 项，严重度合计 ' + r.painProfile.severityTotal, '候选 ' + r.meta.painCount + ' 项'));
    p._body.appendChild(fig('痛点集中在「' + r.painProfile.groups.filter(function (g) { return g.key === r.painProfile.focus; })[0].name + '」',
      '四个经营面的严重度合计与占比', CH.painBars(r.painProfile.groups), '严重度为 1–5 分，由填表人按当前困扰程度给出。'));
    p._body.appendChild(fig('所选痛点与严重度', '圆圈越大表示当前越困扰', CH.painBubbles(r.pains)));
    p._body.appendChild(callout('读法', r.painProfile.focusText.split('。')[0] + '。', r.painProfile.focusText.split('。').slice(1).join('。')));
    return p;
  }
  function pPain2(r) {
    var p = page('03 痛点画像', r);
    p._body.appendChild(fig('痛点如何变成场景', '左：勾选的痛点分组　中：匹配到的场景与得分　右：对应的薯片AI智能体模块',
      CH.sankey(r.sankey), '连线粗细表示该场景的综合得分；一个场景可同时对应多个痛点分组。'));
    p._body.appendChild(h('h3', {}, ['逐项对应']));
    p._body.appendChild(tbl([['所选痛点'], ['严重度', 'c'], ['对应场景'], ['排名', 'c']], r.pains.map(function (x) {
      var hit = r.scenes.filter(function (s) { return s.hitTags.indexOf(x.tag) >= 0; }).sort(function (a, b) { return a.rank - b.rank; });
      return [
        { el: h('span', {}, [h('b', {}, [x.tag]), '　', h('span', { class: 'muted' }, [trunc(x.text, 20)])]) },
        { t: String(x.severity), cls: 'c num' },
        hit.length ? hit.map(function (s) { return s.name; }).join('、') : { el: h('span', { class: 'muted' }, ['本行业场景库暂无直接对应，已并入相邻场景考虑']) },
        { t: hit.length ? '第 ' + hit[0].rank + ' 名' : '—', cls: 'c' }
      ];
    }), 'compact'));
    return p;
  }

  // ---- 9-10 评分方法 ----
  function pMethod(r) {
    var p = page('04 评分方法', r);
    p._body.appendChild(banner('04', '评分方法', '四维各 1–5 分，加权后换算为百分制', r.weights.presetName));
    p._body.appendChild(fig('四维权重：' + r.axes.map(function (a) { return a.name + ' ' + Math.round(a.weight * 100) + '%'; }).join(' · '), AX().formula, wbar(r),
      '实施门槛在计分时取（6 − 门槛），门槛越低得分越高。'));
    var g = h('div', { class: 'two' });
    r.axes.forEach(function (a) {
      g.appendChild(h('div', { class: 'dir-card', style: '--dc:' + a.color }, [
        h('div', { class: 'hd' }, [h('span', {}, [a.name]), h('span', { class: 'tg', style: 'background:' + a.color }, [Math.round(a.weight * 100) + '%'])]),
        h('div', { class: 'bd' }, [h('div', { class: 'n' }, [a.desc]), h('div', {}, [a.how])])
      ]));
    });
    p._body.appendChild(g);
    p._body.appendChild(h('h3', {}, ['1–5 分的含义']));
    p._body.appendChild(tbl([['维度'], ['1 分'], ['3 分'], ['5 分']], r.axes.map(function (a) {
      var sc = AX().items.filter(function (x) { return x.key === a.key; })[0].scale;
      return [{ el: h('span', {}, [h('b', { style: 'color:' + a.color }, [a.name])]) }, sc[0], sc[2], sc[4]];
    }), 'compact'));
    p._body.appendChild(callout('口径说明', '痛点强度与数据可得来自本次作答', RT().method.confidence));
    return p;
  }
  function pFunnel(r) {
    var p = page('04 评分方法', r);
    p._body.appendChild(fig('从 ' + DATA.m2.libTotal + ' 个场景到 1 个起步动作', '每一层的筛选依据都写在右侧', CH.funnel(r.funnel),
      '数据条件具备 = 该场景所需的业务系统现在就能取到数；关键数据源缺失的场景计 1 分，自动排到后面。'));
    p._body.appendChild(h('h3', {}, ['本次筛选的关键动作']));
    p._body.appendChild(findings([
      ['按行业大类取库，', '贵司属' + r.profile.sectorName + '，取该大类 ' + r.meta.sceneCount + ' 个场景作为候选，不跨行业混排。'],
      ['按勾选痛点计强度，', r.funnel[2].count + ' 个场景与所选痛点有交集，其余按 1 分计入，仍参与排序。'],
      ['按现有系统计数据可得，', r.funnel[3].count + ' 个场景的关键数据源现在就能拿到；' + (r.meta.sceneCount - r.funnel[3].count) + ' 个场景缺关键数据源，计 1 分。'],
      ['按四维总分排序取前 ' + r.ranked.length + ' 个，', '再从中挑出数据条件具备、门槛可控的一个作为首批启动。']
    ]));
    p._body.appendChild(callout('这份排序是为贵司算的', '换一组现有系统，排序就会变', '数据可得占 ' + Math.round(r.weights.data * 100) + '% 权重，关键数据源缺失直接计 1 分。补齐一个数据源，相关场景的排名会明显上移。'));
    return p;
  }

  // ---- 11-13 排序总表 ----
  function pRank1(r) {
    var p = page('05 场景排序总表', r);
    p._body.appendChild(banner('05', '场景排序总表', '前 ' + r.ranked.length + ' 个场景的四维得分与排名', '满分 100'));
    p._body.appendChild(tbl([['排名', 'c'], ['场景'], ['痛点', 'c'], ['数据', 'c'], ['见效', 'c'], ['门槛', 'c'], ['总分', 'r'], ['对应模块']],
      r.ranked.map(function (s) {
        return [
          { el: h('span', { class: 'dot', style: 'background:' + (s.rank <= 3 ? 'var(--r-blue)' : 'var(--r-gray)') + ';color:#fff' }, [String(s.rank)]), cls: 'c' },
          { el: h('span', {}, [h('b', {}, [s.name]), h('div', { class: 'muted' }, [s.stage + ' · ' + s.user])]) },
          { t: String(s.axis.pain), cls: 'c num' }, { t: String(s.axis.data), cls: 'c num' },
          { t: String(s.axis.cycle), cls: 'c num' }, { t: String(s.axis.barrier), cls: 'c num' },
          { el: h('b', { class: 'num', style: 'color:var(--r-navy);font-size:14px' }, [s.score.toFixed(1)]), cls: 'r' },
          { el: h('span', {}, [s.module, s.blocked ? tag('需补数据', 'warn') : null]) }
        ];
      }), 'compact'));
    p._body.appendChild(h('div', { class: 'fig-cap' }, ['门槛一列为原始分，分数越高表示落地要动的流程与系统越多，计分时取（6 − 门槛）。']));
    p._body.appendChild(h('h3', {}, ['为什么排这里']));
    var ol = h('ol', { style: 'margin:0;padding-left:20px;font-size:12px;line-height:1.75;color:var(--r-body)' });
    r.ranked.slice(0, 5).forEach(function (s) { ol.appendChild(h('li', {}, [h('b', {}, [s.name + '：']), s.reason])); });
    p._body.appendChild(ol);
    return p;
  }
  function pRank2(r) {
    var p = page('05 场景排序总表', r);
    p._body.appendChild(fig('总分由四维加权构成', '每段长度 = 该维得分 × 权重，四段之和即综合得分', CH.axisStack(r.ranked, r.axes, 100),
      '权重为「' + r.weights.presetName + '」：' + r.axes.map(function (a) { return a.name + ' ' + Math.round(a.weight * 100) + '%'; }).join('、') + '。'));
    p._body.appendChild(fig('首选场景的得分构成', r.ranked[0].name + ' 的四维贡献与合计', CH.waterfall(r.ranked[0].contrib, r.axes, r.ranked[0].score)));
    return p;
  }
  function pRank3(r) {
    var p = page('05 场景排序总表', r);
    p._body.appendChild(h('h3', {}, ['全部 ' + r.meta.sceneCount + ' 个候选场景']));
    p._body.appendChild(tbl([['排名', 'c'], ['场景'], ['环节'], ['痛点', 'c'], ['数据', 'c'], ['见效', 'c'], ['门槛', 'c'], ['总分', 'r'], ['状态', 'c']],
      r.scenes.map(function (s) {
        return [
          { t: String(s.rank), cls: 'c num' },
          { el: h('b', {}, [s.name]) }, s.stage,
          { t: String(s.axis.pain), cls: 'c num' }, { t: String(s.axis.data), cls: 'c num' },
          { t: String(s.axis.cycle), cls: 'c num' }, { t: String(s.axis.barrier), cls: 'c num' },
          { el: h('b', { class: 'num' }, [s.score.toFixed(1)]), cls: 'r' },
          { el: s.blocked ? tag('需补数据', 'warn') : s.rank <= r.ranked.length ? tag('进入排序', 'ok') : tag('本轮暂缓', 'dim'), cls: 'c' }
        ];
      }), 'compact'));
    return p;
  }

  // ---- 14-15 价值与门槛 ----
  function pMatrix(r) {
    var p = page('06 价值与门槛', r);
    p._body.appendChild(banner('06', '价值与门槛', '四象限定位，先做左上角', '气泡大小 = 投入档'));
    p._body.appendChild(fig('前 ' + r.ranked.length + ' 个场景的价值与门槛定位', '横轴为实施门槛，纵轴为业务价值，越靠左上越该先做',
      CH.bubbleMatrix(r.ranked), '虚线圈表示关键数据源缺失，补齐后再看位置。'));
    p._body.appendChild(findings([
      ['左上角是先做的，', '价值高、门槛低，' + (r.ranked.filter(function (s) { return s.value >= 3.5 && s.axis.barrier <= 3 && !s.blocked; }).length || 0) + ' 个场景落在这一区。'],
      ['右上角要规划，', '价值高但要改流程或系统，适合在第一个场景跑通、团队有经验之后启动。'],
      ['左下角可顺带做，', '门槛低、见效快，适合在主线场景推进的同时让更多岗位先用起来。']
    ]));
    return p;
  }
  function pRadar(r) {
    var p = page('06 价值与门槛', r);
    p._body.appendChild(fig('前三个场景的四维对比', '四角越靠外越有利（门槛已取反）', CH.radarCompare(r.ranked.slice(0, 3), r.axes)));
    p._body.appendChild(tbl([['场景'], ['强在哪'], ['弱在哪'], ['总分', 'r']], r.ranked.slice(0, 3).map(function (s) {
      var vals = r.axes.map(function (a) { return { a: a, v: a.invert ? 6 - s.axis[a.key] : s.axis[a.key] }; }).sort(function (x, y) { return y.v - x.v; });
      return [{ el: h('b', {}, [s.rank + '. ' + s.name]) },
        { el: h('span', {}, [h('b', { style: 'color:' + vals[0].a.color }, [vals[0].a.name]), '　' + first(s.why[vals[0].a.key])]) },
        { el: h('span', {}, [h('b', { style: 'color:' + vals[3].a.color }, [vals[3].a.name]), '　' + first(s.why[vals[3].a.key])]) },
        { el: h('b', { class: 'num' }, [s.score.toFixed(1)]), cls: 'r' }];
    }), 'compact'));
    return p;
  }

  // ---- 16-23 场景一页纸 ----
  function pScene1(r, s) {
    var i = r.ranked.indexOf(s);
    var p = page(('0' + (7 + i)).slice(-2) + ' 第 ' + (i + 1) + ' 场景 · ' + s.name, r);
    p._body.appendChild(scHead(s));
    p._body.appendChild(h('div', { class: 'two wide-l' }, [
      h('div', {}, [
        kv([['替代什么', s.replaces], ['给谁用', s.user], ['所在环节', s.stage], ['预期指标', s.metric], ['对应模块', s.module], ['上线周期', s.weeks + ' 周'], ['投入档', s.cost + '（' + RT().investment.tiers.filter(function (t) { return t.key === s.cost; })[0].range + '）']]),
        h('h3', {}, ['为什么排在第 ' + s.rank + ' 位']),
        h('p', {}, [s.reason])
      ]),
      CH.waterfall(s.contrib, r.axes, s.score)
    ]));
    p._body.appendChild(h('h3', {}, ['四维逐项依据']));
    p._body.appendChild(tbl([['维度'], ['得分', 'c'], ['依据']], r.axes.map(function (a) {
      return [{ el: h('b', { style: 'color:' + a.color }, [a.name]) }, { t: String(s.axis[a.key]), cls: 'c num' }, s.why[a.key]];
    }), 'compact'));
    return p;
  }
  function pScene2(r, s) {
    var i = r.ranked.indexOf(s);
    var p = page(('0' + (7 + i)).slice(-2) + ' 第 ' + (i + 1) + ' 场景 · ' + s.name, r);
    p._body.appendChild(h('h3', {}, [s.name + ' · 落地做法']));
    p._body.appendChild(h('div', { class: 'two' }, [
      h('div', {}, [
        h('div', { class: 'stepbox' }, [
          h('div', { class: 's' }, [h('i', {}, ['1']), h('div', {}, [h('b', {}, ['第一步']), h('p', {}, [s.firstStep])])]),
          h('div', { class: 's' }, [h('i', {}, ['2']), h('div', {}, [h('b', {}, ['补齐前置条件']), h('p', {}, [s.precondition])])]),
          h('div', { class: 's' }, [h('i', {}, ['3']), h('div', {}, [h('b', {}, ['在 ' + s.module + ' 中配置并试运行']), h('p', {}, ['由' + s.user + '使用两周，记录使用前后的对比。'])])])
        ])
      ]),
      h('div', {}, [
        h('div', { style: 'font-weight:800;color:var(--r-navy);font-size:13px;margin-bottom:8px' }, ['所需数据清单']),
        h('ol', { style: 'margin:0;padding-left:20px;font-size:12px;line-height:1.8;color:var(--r-body)' }, s.dataList.map(function (x) { return h('li', {}, [x]); })),
        h('div', { style: 'margin-top:12px' }, [
          s.dataDeps.length
            ? tbl([['数据源'], ['状态', 'c']], s.dataDeps.map(function (d) {
                var nm = sh.optText('systems', d), ok = r.profile.systems.indexOf(d) >= 0;
                return [nm, { el: ok ? tag('已具备', 'ok') : tag('需补齐', 'warn'), cls: 'c' }];
              }), 'compact')
            : callout('数据条件', '无需接入业务系统', '整理现有资料即可起步，这也是它排名靠前的原因之一。', 'ok')
        ])
      ])
    ]));
    p._body.appendChild(h('h3', {}, ['验收与收益口径']));
    p._body.appendChild(tbl([['项目'], ['内容']], [
      [{ t: '验收指标', cls: 'k' }, { el: h('b', {}, [s.metric]) }],
      [{ t: '收益折算', cls: 'k' }, s.roiBasis],
      [{ t: '投入区间', cls: 'k' }, s.cost + ' 档 · ' + RT().investment.tiers.filter(function (t) { return t.key === s.cost; })[0].range + '，上线约 ' + s.weeks + ' 周'],
      [{ t: '前置条件', cls: 'k' }, s.precondition]
    ], 'compact'));
    p._body.appendChild(callout('金额口径', '本报告给出投入区间与折算口径', RT().investment.roiNote));
    return p;
  }

  // ---- 数据就绪度 ----
  function pReady1(r) {
    var p = page('12 数据就绪度', r);
    p._body.appendChild(banner('12', '数据就绪度', r.readiness.level + ' · ' + r.readiness.pct + '%', r.readiness.zeroDep + ' 个场景无需接入系统'));
    p._body.appendChild(fig('场景与数据源的对应关系', '绿色为需要且已具备，橙色为需要但缺失', CH.heatmap(r.readiness.matrix, r.readiness.systems),
      '一行一个场景，一列一个业务系统。整行无色块表示该场景无需接入任何系统。'));
    p._body.appendChild(callout('读法', r.readiness.text.split('。')[0] + '。', r.readiness.text.split('。').slice(1).join('。')));
    return p;
  }
  function pReady2(r) {
    var p = page('12 数据就绪度', r);
    if (r.readiness.missing.length) {
      p._body.appendChild(fig('补齐哪一个数据源最划算', '按解锁场景数排序', CH.depArc(r.readiness.missing, r.blocked),
        '解锁指该场景的数据可得分从 1 分回到可评估区间，并非直接进入前三。'));
      p._body.appendChild(tbl([['缺失数据源'], ['解锁场景数', 'c'], ['受影响的场景'], ['最高排名', 'c']], r.readiness.missing.map(function (m) {
        return [{ el: h('b', {}, [m.name]) }, { t: String(m.unlock), cls: 'c num' }, m.scenes.join('、'), { t: '第 ' + m.bestRank + ' 名', cls: 'c' }];
      }), 'compact'));
    } else {
      p._body.appendChild(callout('数据条件', '所需数据源均已具备', '本行业候选场景所需的业务系统贵司都已具备，可直接按排序推进。', 'ok'));
    }
    p._body.appendChild(h('h3', {}, ['无需接入系统即可起步的场景']));
    var zero = r.scenes.filter(function (s) { return !s.dataDeps.length; });
    p._body.appendChild(tbl([['排名', 'c'], ['场景'], ['所需资料'], ['上线', 'c']], zero.map(function (s) {
      return [{ t: String(s.rank), cls: 'c num' }, { el: h('b', {}, [s.name]) }, s.dataList.join('、'), { t: s.weeks + ' 周', cls: 'c' }];
    }), 'compact'));
    return p;
  }

  // ---- 排期 ----
  function pPlan1(r) {
    var p = page('13 12 个月排期', r);
    p._body.appendChild(banner('13', '12 个月排期', '三批次，先做一个、再做两个、储备两个', r.combo.reduce(function (t, c) { return t + c.scenes.length; }, 0) + ' 个场景'));
    p._body.appendChild(fig('三批次排期', '横条长度为该场景的上线周期，虚线框为数据补齐后再启动', CH.gantt(r.roadmap),
      '批次之间可衔接推进；同一批次内的场景建议错开一到两周启动。'));
    p._body.appendChild(callout('推进节奏', r.conditions.capacityName, r.conditions.capacityNote));
    return p;
  }
  function pPlan2(r) {
    var p = page('13 12 个月排期', r);
    var g = h('div', { class: 'phase-cards' });
    var PC = { p1: '#0E9F6E', p2: '#1157B5', p3: '#8A54DC' };
    r.combo.forEach(function (c) {
      var ul = h('ul');
      c.scenes.forEach(function (s) {
        var full = r.scenes.filter(function (x) { return x.id === s.id; })[0];
        ul.appendChild(h('li', {}, [h('b', {}, [s.name]), '　' + s.module + ' · ' + s.weeks + ' 周 · ' + s.cost + '投入', h('div', { class: 'muted' }, ['第一步：' + s.firstStep]), h('div', { class: 'muted' }, ['验收：' + (full ? full.metric : s.metric)])]));
      });
      g.appendChild(h('div', { class: 'phase-card', style: '--pc:' + PC[c.key] }, [
        h('div', { class: 'hd' }, [h('span', { class: 'pn' }, [c.name]), h('span', { class: 'pt' }, [c.title])]),
        h('div', { class: 'muted', style: 'margin-bottom:6px' }, [c.desc]),
        ul,
        h('div', { class: 'ms' }, ['里程碑：' + c.milestone])
      ]));
    });
    p._body.appendChild(g);
    return p;
  }

  // ---- 投入 ----
  function pInvest1(r) {
    var p = page('14 投入与回报', r);
    p._body.appendChild(banner('14', '投入与回报', '建议以「' + r.investment.name + '」档规划第一年', r.investment.range));
    var t = h('div', { class: 'tiers' });
    r.investment.tiers.forEach(function (x) {
      t.appendChild(h('div', { class: 'tier' + (x.key === r.investment.tier ? ' cur' : '') }, [
        h('div', { class: 'nm' }, [x.name, x.key === r.investment.tier ? tag('本次建议', 'ok') : null]),
        h('div', { class: 'rg num' }, [x.range]), h('p', {}, [x.desc]), h('div', { class: 'fit' }, ['适合：' + x.fit])
      ]));
    });
    p._body.appendChild(t);
    p._body.appendChild(callout('为什么是这一档', r.investment.name + ' · ' + r.investment.range, r.investment.rationale));
    p._body.appendChild(h('div', { class: 'fig-cap' }, [r.investment.note]));
    return p;
  }
  function pInvest2(r) {
    var p = page('14 投入与回报', r);
    p._body.appendChild(h('h3', {}, ['逐场景投入与收益口径']));
    p._body.appendChild(tbl([['排名', 'c'], ['场景'], ['投入档', 'c'], ['区间'], ['上线', 'c'], ['收益折算口径']], r.investment.byScene.map(function (x, i) {
      return [{ t: String(i + 1), cls: 'c num' }, { el: h('b', {}, [x.name]) }, { t: x.cost, cls: 'c' }, x.range, { t: x.weeks + ' 周', cls: 'c' }, x.roiBasis];
    }), 'compact'));
    p._body.appendChild(callout('下一步算账', '具体金额与回收期在「企业AI投入ROI测算器」中测算', RT().investment.roiNote));
    p._body.appendChild(h('h3', {}, ['相关服务']));
    p._body.appendChild(tbl([['服务'], ['价格'], ['说明']], RT().services.map(function (s) {
      return [{ el: h('b', {}, [s.name]) }, { el: h('b', { class: 'num', style: 'color:var(--r-blue)' }, [s.price]) }, s.desc];
    }), 'compact'));
    return p;
  }

  // ---- 风险 / 清单 / 未入选 ----
  function pRisks(r) {
    var p = page('15 风险与前置条件', r);
    p._body.appendChild(banner('15', '风险与前置条件', '由本次现状条件与数据缺口触发', r.risks.length + ' 条'));
    r.risks.forEach(function (x) {
      p._body.appendChild(h('div', { class: 'risk' }, [
        h('div', { class: 't' }, [tag(x.level, x.level === '高' ? 'risk' : x.level === '中' ? 'warn' : 'dim'), x.title]),
        h('p', {}, [x.text])
      ]));
    });
    p._body.appendChild(h('h3', {}, ['前置条件汇总']));
    p._body.appendChild(tbl([['场景'], ['前置条件']], r.ranked.slice(0, 5).map(function (s) {
      return [{ el: h('b', {}, [s.rank + '. ' + s.name]) }, s.precondition];
    }), 'compact'));
    return p;
  }
  function pChecklist(r) {
    var p = page('16 90 天启动清单', r);
    p._body.appendChild(banner('16', '90 天启动清单', '把首选场景推到试运行', r.checklist.length + ' 项'));
    var t = h('table', { class: 'tbl checklist chk-tbl compact' });
    t.appendChild(h('thead', {}, [h('tr', {}, [h('th', { class: 'c' }, ['✓']), h('th', {}, ['时间']), h('th', {}, ['要做的事']), h('th', {}, ['类型']), h('th', {}, ['负责人']), h('th', {}, ['对应场景'])])]));
    var tb = h('tbody');
    r.checklist.forEach(function (c) {
      tb.appendChild(h('tr', {}, [
        h('td', { class: 'c' }, [h('span', { class: 'box' })]),
        h('td', {}, [c.week]), h('td', {}, [h('b', {}, [c.item])]),
        h('td', {}, [h('span', { class: 'kind' }, [c.kind])]),
        h('td', {}, [c.owner]), h('td', {}, [c.scene])
      ]));
    });
    t.appendChild(tb); p._body.appendChild(t);
    p._body.appendChild(callout('验收', r.ranked[0].name + ' 的验收指标', r.ranked[0].metric + '。试运行两周后对比使用前后的数据，确认后再推第二批。', 'ok'));
    return p;
  }
  function pExcluded(r) {
    var p = page('17 未入选场景', r);
    p._body.appendChild(banner('17', '未入选场景', '本轮暂不启动的场景与原因', r.excluded.length + ' 个'));
    p._body.appendChild(tbl([['排名', 'c'], ['场景'], ['总分', 'r'], ['对应模块'], ['未入选原因']], r.excluded.map(function (x) {
      return [{ t: String(x.rank), cls: 'c num' }, { el: h('b', {}, [x.name]) }, { t: x.score.toFixed(1), cls: 'r num' }, x.module, { el: h('span', { class: 'exc-why' }, [x.reason]) }];
    }), 'compact exc'));
    p._body.appendChild(callout('复盘用法', '未入选不等于没有价值', '前两批场景跑通、数据沉淀之后，这些场景的数据可得与实施门槛都会改善，届时重新跑一次排序即可。'));
    return p;
  }

  // ---- 附录 ----
  function pAppA(r, part) {
    var p = page('附录 A 全部场景评分', r);
    if (!part) p._body.appendChild(banner('A', '全部场景评分明细', '四维原始分、加权贡献与总分', r.meta.sceneCount + ' 个场景'));
    var half = Math.ceil(r.scenes.length / 2);
    var list = part ? r.scenes.slice(half) : r.scenes.slice(0, half);
    p._body.appendChild(tbl([['排名', 'c'], ['场景'], ['痛点', 'c'], ['数据', 'c'], ['见效', 'c'], ['门槛', 'c'], ['加权贡献'], ['总分', 'r']],
      list.map(function (s) {
        return [{ t: String(s.rank), cls: 'c num' }, { el: h('b', {}, [s.name]) },
          { t: String(s.axis.pain), cls: 'c num' }, { t: String(s.axis.data), cls: 'c num' },
          { t: String(s.axis.cycle), cls: 'c num' }, { t: String(s.axis.barrier), cls: 'c num' },
          { el: h('span', { class: 'muted' }, [r.axes.map(function (a) { return s.contrib[a.key].toFixed(1); }).join(' + ')]) },
          { el: h('b', { class: 'num' }, [s.score.toFixed(1)]), cls: 'r' }];
      }), 'compact'));
    if (part) p._body.appendChild(h('div', { class: 'fig-cap' }, ['加权贡献顺序：' + r.axes.map(function (a) { return a.name; }).join(' + ') + '；门槛项按（6 − 门槛）× 权重计。']));
    return p;
  }
  function pAppB(r) {
    var p = page('附录 B 行业痛点库', r);
    p._body.appendChild(banner('B', '本行业候选痛点', r.profile.sectorName + ' · ' + r.meta.painCount + ' 项', '本次勾选 ' + r.pains.length + ' 项'));
    var sd = DATA.m2.sectors[r.profile.sector];
    CD().groups.forEach(function (g) {
      p._body.appendChild(h('h3', { style: '--gc:' + g.color }, [g.name]));
      p._body.appendChild(tbl([['标签'], ['现象'], ['本次', 'c']], sd.pains.filter(function (x) { return x.group === g.key; }).map(function (x) {
        var pk = r.pains.filter(function (y) { return y.id === x.id; })[0];
        return [{ el: h('b', { style: 'color:' + g.color }, [x.tag]) }, x.text, { el: pk ? tag('严重度 ' + pk.severity, 'ok') : h('span', { class: 'muted' }, ['—']), cls: 'c' }];
      }), 'compact'));
    });
    return p;
  }
  function pAppC(r) {
    var p = page('附录 C 场景与模块', r);
    p._body.appendChild(banner('C', '场景对应的模块', '薯片AI智能体 11 个模块中，本次涉及的部分', ''));
    var byMod = {};
    r.scenes.forEach(function (s) { (byMod[s.module] = byMod[s.module] || []).push(s); });
    p._body.appendChild(tbl([['模块'], ['本行业场景数', 'c'], ['涉及场景'], ['最高排名', 'c']], Object.keys(byMod).sort(function (a, b) {
      return Math.min.apply(null, byMod[a].map(function (s) { return s.rank; })) - Math.min.apply(null, byMod[b].map(function (s) { return s.rank; }));
    }).map(function (m) {
      var list = byMod[m].sort(function (a, b) { return a.rank - b.rank; });
      return [{ el: h('b', {}, [m]) }, { t: String(list.length), cls: 'c num' }, list.map(function (s) { return s.name; }).join('、'), { t: '第 ' + list[0].rank + ' 名', cls: 'c' }];
    }), 'compact'));
    p._body.appendChild(callout('开通方式', '轻享版 0 元 / 套年，赠 10000 积分', '首选场景对应的是「' + r.ranked[0].module + '」，在轻享版里就能开通试用。'));
    return p;
  }
  function pAppD(r) {
    var p = page('附录 D 术语与方法', r);
    p._body.appendChild(banner('D', '术语与方法说明', '本报告用到的口径', ''));
    p._body.appendChild(tbl([['术语'], ['说明']], RT().glossary.map(function (g) { return [{ el: h('b', {}, [g.term]) }, g.desc]; }), 'compact'));
    p._body.appendChild(h('h3', {}, ['计分口径']));
    p._body.appendChild(findings([['评分公式：', RT().method.formula], ['痛点强度：', RT().method.pain], ['数据可得：', RT().method.data]]));
    return p;
  }
  function pAppE(r) {
    var p = page('附录 E 信息来源', r);
    p._body.appendChild(banner('E', '信息来源与置信度', '每一项结论的来源与可信程度', ''));
    p._body.appendChild(tbl([['内容'], ['来源'], ['置信度', 'c']], [
      ['企业画像 13 项', '本次填写', { el: tag('填报', 'ok'), cls: 'c' }],
      ['痛点与严重度', '本次勾选与打分', { el: tag('填报', 'ok'), cls: 'c' }],
      ['现有业务系统', '本次填写', { el: tag('填报', 'ok'), cls: 'c' }],
      ['场景的见效速度与实施门槛', '场景库预设值，由同类企业落地经验归纳', { el: tag('经验估算', 'warn'), cls: 'c' }],
      ['预期指标区间', '同类企业落地后的常见改善幅度', { el: tag('经验估算', 'warn'), cls: 'c' }],
      ['投入区间', '同类项目的常见报价范围', { el: tag('经验估算', 'warn'), cls: 'c' }],
      ['四维得分与排序', '按本页公式由上述输入计算', { el: tag('可复算', 'ok'), cls: 'c' }]
    ], 'compact'));
    p._body.appendChild(h('h3', {}, ['适用边界']));
    p._body.appendChild(h('p', {}, [RT().method.scope]));
    p._body.appendChild(h('p', {}, [RT().method.source]));
    p._body.appendChild(callout('复算方式', '同样的输入会得到同样的排序', '四维得分与总分为确定性计算，调整权重、补充系统或修改痛点严重度后重新提交，即可看到排序变化。'));
    return p;
  }
  function pServices(r) {
    var p = page('相关服务', r);
    p._body.appendChild(banner('', '把排序变成落地', '顶呱呱四维一体交付', RT().contact.company));
    p._body.appendChild(h('div', { class: 'two' }, RT().services.map(function (s) {
      return h('div', { class: 'tier' }, [h('div', { class: 'nm' }, [s.name]), h('div', { class: 'rg num' }, [s.price]), h('p', {}, [s.desc])]);
    })));
    p._body.appendChild(callout('现在就能开始', '第一步：' + r.ranked[0].firstStep, '这件事不需要采购、不需要开发，今天就能安排下去。', 'ok'));
    p._body.appendChild(h('div', { class: 'fig-cap' }, [RT().investment.note]));
    return p;
  }
  function pBack(r) {
    var p = page('', r, 'back');
    p._body.appendChild(h('img', { src: sh.CFG.logo, alt: '顶呱呱' }));
    p._body.appendChild(h('div', { class: 'slogan' }, [RT().contact.tagline]));
    p._body.appendChild(h('div', { class: 'contact' }, [
      h('div', {}, [RT().contact.company + ' · ' + RT().product]),
      h('div', {}, ['平台 ' + RT().contact.platform + '　展位号 ' + RT().contact.booth]),
      h('div', {}, [RT().contact.address]),
      h('div', {}, ['联系电话 ' + RT().contact.phone]),
      h('div', {}, ['服务城市 ' + RT().contact.cities])
    ]));
    p._body.appendChild(h('div', { class: 'disc' }, [RT().closing]));
    return p;
  }

  window.DGG.registerModule('m2', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
