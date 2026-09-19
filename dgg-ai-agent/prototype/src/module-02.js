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
  /* 公式随当前权重实时改写（默认权重时与数据表中的公式文本一致） */
  function formulaText() {
    var w = (M.result && M.result.weights) || M.weights || {};
    return '总分 = ' + AX().items.map(function (a) { var v = w[a.key] != null ? w[a.key] : a.weight; return (a.invert ? '(6 − ' + a.name + ')' : a.name) + ' × ' + Number(v).toFixed(2); }).join(' + ');
  }
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
    var wf = left.querySelector('.wformula'); if (wf) wf.textContent = formulaText();
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
    wbox.appendChild(h('div', { class: 'wformula', style: 'font-size:12px;color:var(--text-sub);border-top:1px solid var(--line);padding-top:8px;margin-top:2px;line-height:1.5' }, [formulaText()]));
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

  // ---------- 屏 5 · 报告（28 页 · 3D 凸浮标题栏版式） ----------
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function reportNo(r) { var x = 0, n = r.profile.name; for (var i = 0; i < n.length; i++) x = (x * 31 + n.charCodeAt(i)) % 100000; return 'DGG-S-' + today().replace(/-/g, '') + '-' + ('00000' + x).slice(-5); }
  function printBrief() { document.body.classList.add('print-brief'); var off = function () { document.body.classList.remove('print-brief'); window.removeEventListener('afterprint', off); }; window.addEventListener('afterprint', off); sh.print(); }

  // 章节配色：每章一对渐变端点，全部取自已过色觉校验的色板
  var CH_COLOR = {
    nav: ['#0A2A5E', '#1157B5'], quick: ['#1157B5', '#00C2F0'], profile: ['#0FA3C7', '#0E9F6E'],
    pain: ['#8A54DC', '#C4457E'], method: ['#C9A227', '#FF8A3D'], rank: ['#0A2A5E', '#1157B5'],
    matrix: ['#0E9F6E', '#0FA3C7'], scene: ['#1157B5', '#8A54DC'], ready: ['#0FA3C7', '#1157B5'],
    plan: ['#0E9F6E', '#C9A227'], invest: ['#C9A227', '#E0635C'], risk: ['#E0635C', '#C4457E'],
    check: ['#1157B5', '#00C2F0'], out: ['#6B7A99', '#919FB7'], app: ['#0A2A5E', '#57708F']
  };

  // ---- 版式构件 ----
  function page2(chapter, r, key, cls) {
    var c = CH_COLOR[key] || CH_COLOR.nav;
    var p = h('section', { class: 'page m2 ' + (cls || ''), style: '--mc:' + c[0] + ';--mc2:' + c[1] });
    if (chapter !== null) p.appendChild(h('div', { class: 'm2-head' }, [
      h('span', { class: 'ch' }, [h('i', {}), chapter || RT().reportTitle]),
      h('span', { class: 'rt' }, [r.profile.name + '　·　' + reportNo(r)])
    ]));
    var body = h('div', { class: 'page-body' }); p.appendChild(body); p._body = body; p._c = c; return p;
  }
  function bar(no, title, en, rv, rk, slim) {
    return h('div', { class: 'm2-bar' + (slim ? ' slim' : '') }, [
      h('div', { class: 'no' }, [no]),
      h('div', {}, [h('div', { class: 't' }, [title]), en ? h('div', { class: 'en' }, [en]) : null]),
      rv ? h('div', { class: 'rt' }, [h('div', { class: 'v num' }, [rv]), rk ? h('div', { class: 'k' }, [rk]) : null]) : h('div', {})
    ]);
  }
  function barZh(no, title, zh, rv, rk) {
    return h('div', { class: 'm2-bar' }, [
      h('div', { class: 'no' }, [no]),
      h('div', {}, [h('div', { class: 't' }, [title]), zh ? h('div', { class: 'en zh' }, [zh]) : null]),
      rv ? h('div', { class: 'rt' }, [h('div', { class: 'v num' }, [rv]), rk ? h('div', { class: 'k' }, [rk]) : null]) : h('div', {})
    ]);
  }
  function hh(title, en) { return h('h3', { class: 'm2-h' }, [title, en ? h('span', { class: 'en' }, [en]) : null]); }
  function card(title, sub, body, note, c1, c2) {
    var k = h('div', { class: 'm2-card', style: c1 ? '--cc:' + c1 + ';--cc2:' + (c2 || c1) : '' });
    if (title) k.appendChild(h('div', { class: 'ct' }, [title]));
    if (sub) k.appendChild(h('div', { class: 'cs' }, [sub]));
    (Array.isArray(body) ? body : [body]).forEach(function (b) { if (b) k.appendChild(b); });
    if (note) k.appendChild(h('div', { class: 'cn' }, [note]));
    return k;
  }
  function block(lb, val, text, color, items) {
    return h('div', { class: 'm2-block', style: '--bc:' + color }, [
      h('div', { class: 'bt' }, [lb]), h('div', { class: 'bv' }, [val]),
      text ? h('div', { class: 'bx' }, [text]) : null,
      items && items.length ? h('ul', {}, items.map(function (x) { return h('li', {}, [x]); })) : null
    ]);
  }
  function stats(items, n, c) {
    return h('div', { class: 'm2-stats s' + (n || items.length) }, items.map(function (x) {
      return h('div', { class: 'm2-stat', style: x.c ? '--sc:' + x.c + ';--sc2:' + (x.c2 || x.c) : (c ? '--sc:' + c[0] + ';--sc2:' + c[1] : '') }, [
        h('div', { class: 'k' }, [x.k]),
        h('div', { class: 'v num' }, [x.v, x.u ? h('small', {}, [x.u]) : null]),
        h('div', { class: 's' }, [x.s])
      ]);
    }));
  }
  function note2(lb, hl, x) { return h('div', { class: 'm2-note' }, [h('div', { class: 'lb' }, [lb]), hl ? h('div', { class: 'hl' }, [hl]) : null, x ? h('div', { class: 'x' }, [x]) : null]); }
  function pill(t, cls) { return h('span', { class: 'm2-pill ' + (cls || 'dim') }, [t]); }
  function mtbl(headers, rows) {
    var t = h('table', { class: 'm2-tbl' });
    t.appendChild(h('thead', {}, [h('tr', {}, headers.map(function (x) { return h('th', { class: x[1] || '' }, [x[0]]); }))]));
    var tb = h('tbody');
    rows.forEach(function (row) { tb.appendChild(h('tr', {}, row.map(function (c) { return h('td', { class: (c && c.cls) || '' }, [c && c.el ? c.el : (c && c.t != null ? c.t : c)]); }))); });
    t.appendChild(tb); return t;
  }
  function mlist(items) { return h('ul', { class: 'm2-list' }, items.map(function (x) { return h('li', {}, Array.isArray(x) ? [h('b', {}, [x[0]]), x[1]] : [x]); })); }
  function msteps(items) { return h('ol', { class: 'm2-steps' }, items.map(function (x) { return h('li', {}, Array.isArray(x) ? [h('b', {}, [x[0]]), x[1]] : [x]); })); }
  function two(a, b, cls) { return h('div', { class: 'm2-two ' + (cls || '') }, [a, b]); }
  function wbar(r) {
    var b = h('div', { style: 'display:flex;height:24px;border-radius:6px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 3px 8px -3px rgba(16,42,86,.3)' });
    r.axes.forEach(function (a2) { b.appendChild(h('i', { style: 'display:block;height:100%;width:' + (a2.weight * 100) + '%;background:linear-gradient(180deg,' + a2.color + ',color-mix(in srgb,' + a2.color + ' 78%,#0A2A5E))' })); });
    var lg = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:7px' });
    r.axes.forEach(function (a2) {
      lg.appendChild(h('span', { style: 'font-size:10.5px;color:var(--r-sub);display:flex;align-items:center;gap:5px' }, [
        h('i', { style: 'width:10px;height:10px;border-radius:2px;background:' + a2.color }), a2.name + ' ' + Math.round(a2.weight * 100) + '%'
      ]));
    });
    return h('div', {}, [b, lg]);
  }

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
    var add = function (title, el2, o) { o = o || {}; M.pages.push({ title: title, sub: o.sub, one: o.one, el: el2, brief: !!o.brief }); };

    add('封面', pFront(r), { brief: true });
    add('本报告导航', pNav(r), { one: '阅读指引、章节索引与本次评分口径' });
    add('01 排序结论速览', pQuick1(r), { brief: true, one: '六个问题、六句回答与总体判断' });
    add('', pQuick2(r), { brief: true, sub: '三步走与前三个场景' });
    add('02 企业画像与现状', pProfile(r), { one: '基本情况、现状条件、行业视角与场景库覆盖' });
    add('03 痛点画像', pPain1(r), { one: '所选痛点的分布、严重度与对应场景' });
    add('', pPain2(r), { sub: '痛点与场景对应、行业痛点库全表' });
    add('04 评分方法', pMethod(r), { one: '四维定义、权重与 1–5 分含义' });
    add('', pFunnel(r), { sub: '从场景库到排序表' });
    add('05 场景排序总表', pRank1(r), { brief: true, one: '前 8 个场景的四维得分、排名与理由' });
    add('', pRank2(r), { sub: '得分构成与全部候选评分' });
    add('06 价值与门槛', pMatrix(r), { one: '四象限定位与前三个场景四维对比' });
    r.ranked.slice(0, 5).forEach(function (sc, i) {
      var no = ('0' + (7 + i)).slice(-2);
      add(no + ' 第 ' + (i + 1) + ' 场景 · ' + sc.name, pScene(r, sc, i), i === 0 ? { brief: true, one: '前五个场景逐个展开：做法、数据、指标与前置条件' } : {});
    });
    add('12 数据就绪度', pReady1(r), { one: '场景与数据源的对应关系与缺口' });
    add('', pReady2(r), { sub: '补齐清单与解锁关系' });
    add('13 12 个月排期', pPlan(r), { brief: true, one: '三批次排期、里程碑与交付物' });
    add('14 投入与回报', pInvest1(r), { one: '投入档位、逐场景区间与收益折算口径' });
    add('', pInvest2(r), { sub: '三档推进情景与相关服务' });
    add('15 风险与前置条件', pRisks(r), { one: '风险提示、前置条件与角色分工' });
    add('16 90 天启动清单', pChecklist(r), { one: '可勾选执行项、负责人与验收' });
    add('17 未入选与复盘', pExcluded(r), { one: '本轮暂不启动的场景与何时重跑' });
    add('附录 A 评分明细', pAppA(r), { one: '全部候选场景四维原始分与加权贡献' });
    add('附录 B 方法与来源', pAppB(r), { one: '术语、计分口径、信息来源与置信度' });
    add('封底', pEnd(r), {});

    M.pages.forEach(function (pg, i) {
      pg.el.setAttribute('data-page', String(i + 1)); if (pg.brief) pg.el.classList.add('brief');
      if (i > 0 && i < M.pages.length - 1) pg.el.appendChild(h('div', { class: 'm2-foot' }, [
        h('div', { class: 'rule' }),
        h('div', { class: 'row' }, [h('span', {}, [r.profile.name + '　·　' + RT().reportTitle + '　·　' + RT().issuer]), h('span', { class: 'num' }, ['第 ' + (i + 1) + ' 页 / 共 ' + M.pages.length + ' 页'])])
      ]));
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
    if (nav) M.pages.forEach(function (pg, i) {
      if (!pg.title || !pg.one) return;
      nav.appendChild(h('tr', {}, [h('td', { class: 'b' }, [pg.title.split(' ')[0]]), h('td', {}, [pg.title.replace(/^\S+\s/, '')]), h('td', {}, [pg.one]), h('td', { class: 'r num' }, [String(i + 1)])]));
    });
  }

  // ==== 1 封面 ====
  function pFront(r) {
    var p = page2(null, r, 'quick', 'm2-front');
    var t1 = r.ranked[0];
    var hero = h('div', { class: 'hero' });
    hero.appendChild(CH.heroM2(r, r.scenes.length * 13 + r.pains.length));
    hero.appendChild(h('img', { class: 'logo', src: sh.CFG.logo, alt: '顶呱呱' }));
    hero.appendChild(h('div', { class: 'ov' }, [
      h('div', { class: 'co' }, [r.profile.name]),
      h('div', { class: 'rt' }, [RT().reportTitle]),
      h('div', { class: 'en' }, [RT().reportTitleEn])
    ]));
    p._body.appendChild(hero);
    var body = h('div', { class: 'body' });
    body.appendChild(h('div', { class: 'split' }, [
      h('div', { class: 'pick' }, [
        h('div', { class: 'lb' }, ['先做这一个 · START HERE']),
        h('div', { class: 'nm' }, [t1.name]),
        h('div', { class: 'mt' }, [t1.stage + ' 环节 · 给' + t1.user + '用 · 替代' + t1.replaces + '。预期' + t1.metric + '。']),
        h('div', { class: 'chips' }, [h('span', {}, [t1.module]), h('span', {}, [t1.weeks + ' 周上线']), h('span', {}, [t1.cost + '投入 · ' + RT().investment.tiers.filter(function (x) { return x.key === t1.cost; })[0].range]), h('span', {}, ['综合 ' + t1.score.toFixed(1) + ' 分'])])
      ]),
      CH.dial(t1.score, '首选场景得分', '共 ' + r.meta.sceneCount + ' 个候选')
    ]));
    body.appendChild(stats([
      { k: '候选场景', v: String(r.meta.sceneCount), u: '个', s: r.profile.sectorName + '场景库', c: '#1157B5', c2: '#00C2F0' },
      { k: '所选痛点', v: String(r.pains.length), u: '项', s: '严重度合计 ' + r.painProfile.severityTotal, c: '#8A54DC', c2: '#C4457E' },
      { k: '数据就绪', v: r.readiness.pct + '%', s: r.readiness.level, c: '#0FA3C7', c2: '#0E9F6E' },
      { k: '起步投入', v: r.investment.range, s: r.investment.name, c: '#C9A227', c2: '#FF8A3D' },
      { k: '首批见效', v: t1.weeks + ' 周', s: '上线周期', c: '#0E9F6E', c2: '#0FA3C7' }
    ], 5));
    body.appendChild(h('div', { class: 'bot' }, [
      h('span', {}, [RT().issuer + '　·　' + RT().product]),
      h('span', {}, ['报告编号 ' + reportNo(r) + '　出具日期 ' + today()])
    ]));
    p._body.appendChild(body);
    return p;
  }

  // ==== 2 导航 ====
  function pNav(r) {
    var p = page2('本报告导航', r, 'nav');
    p._body.appendChild(bar('00', '本报告导航', 'HOW TO READ', '28', '页'));
    p._body.appendChild(two(
      h('div', {}, [hh('阅读指引', 'READING GUIDE'), mlist(RT().readingGuide.map(function (t) { var i = t.indexOf('。'); return [t.slice(0, i + 1), t.slice(i + 1)]; }))]),
      h('div', {}, [
        hh('本次评分口径', 'SCORING BASIS'),
        card('四维权重 · ' + r.weights.presetName, AX().formula, [wbar(r)], '实施门槛计分时取（6 − 门槛），门槛越低得分越高。', r.axes[0].color, r.axes[3].color),
        stats([
          { k: '场景库全量', v: String(DATA.m2.libTotal), u: '个', s: DATA.industries.sectors.length + ' 个行业大类' },
          { k: '本行业候选', v: String(r.meta.sceneCount), u: '个', s: r.profile.sectorName },
          { k: '进入排序表', v: String(r.ranked.length), u: '个', s: '按四维总分' }
        ], 3, CH_COLOR.nav)
      ]), 'wl'));
    p._body.appendChild(hh('章节索引', 'CONTENTS'));
    var t = h('table', { class: 'm2-tbl' });
    t.appendChild(h('thead', {}, [h('tr', {}, [h('th', {}, ['章']), h('th', {}, ['标题']), h('th', {}, ['一句话内容']), h('th', { class: 'r' }, ['页'])])]));
    t.appendChild(h('tbody', { id: 'm2-nav-tbl' }));
    p._body.appendChild(t);
    return p;
  }

  // ==== 3-4 结论速览 ====
  function pQuick1(r) {
    var p = page2('01 排序结论速览', r, 'quick');
    p._body.appendChild(bar('01', '排序结论速览', 'EXECUTIVE SUMMARY', r.ranked[0].score.toFixed(1), '首选场景综合得分'));
    var TONE = { cyan: ['#0FA3C7', '#00C2F0'], purple: ['#8A54DC', '#C4457E'], orange: ['#FF8A3D', '#C9A227'], blue: ['#1157B5', '#0FA3C7'], green: ['#0E9F6E', '#0FA3C7'], navy: ['#0A2A5E', '#1157B5'] };
    var g = h('div', { class: 'm2-cards c3' });
    r.quickView.forEach(function (q) {
      var c = TONE[q.tone] || TONE.blue;
      g.appendChild(card(q.q, null, [
        h('div', { style: 'font-size:15px;font-weight:900;color:' + c[0] + ';line-height:1.3;margin:2px 0 6px' }, [q.a]),
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.68' }, [q.text])
      ], null, c[0], c[1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(h('div', { style: 'margin-top:16px' }, [block('总体判断 · VERDICT', r.verdict.headline, r.verdict.text, '#0A2A5E')]));
    p._body.appendChild(stats([
      { k: '候选场景', v: String(r.meta.sceneCount), u: '个', s: r.profile.sectorName + '场景库', c: '#1157B5', c2: '#00C2F0' },
      { k: '命中所选痛点', v: String(r.funnel[2].count), u: '个', s: '与 ' + r.pains.length + ' 项痛点有交集', c: '#8A54DC', c2: '#C4457E' },
      { k: '数据条件具备', v: String(r.funnel[3].count), u: '个', s: '关键数据源现在可取', c: '#0FA3C7', c2: '#0E9F6E' },
      { k: '首批启动', v: String(r.combo[0].scenes.length), u: '个', s: '第 1–3 个月', c: '#0E9F6E', c2: '#C9A227' },
      { k: '12 个月覆盖', v: String(r.combo.reduce(function (t, c) { return t + c.scenes.length; }, 0)), u: '个', s: '三批次合计', c: '#C9A227', c2: '#FF8A3D' }
    ], 5));
    return p;
  }
  function pQuick2(r) {
    var p = page2('01 排序结论速览', r, 'quick');
    p._body.appendChild(bar('01', '三步走与前三个场景', 'ROADMAP AT A GLANCE', String(r.combo.reduce(function (t, c) { return t + c.scenes.length; }, 0)), '个场景 · 12 个月', true));
    p._body.appendChild(CH.ladder(r.combo));
    p._body.appendChild(hh('前三个场景', 'TOP 3 SCENARIOS'));
    var g = h('div', { class: 'm2-cards c3' });
    var CS = [['#1157B5', '#00C2F0'], ['#0E9F6E', '#0FA3C7'], ['#8A54DC', '#C4457E']];
    r.ranked.slice(0, 3).forEach(function (sc, i) {
      g.appendChild(card('No.' + sc.rank + '　' + sc.name, sc.stage + ' · ' + sc.user, [
        mtbl([['项目'], ['内容']], [
          [{ t: '替代', cls: 'k' }, trunc(sc.replaces, 16)],
          [{ t: '预期', cls: 'k' }, sc.metric],
          [{ t: '第一步', cls: 'k' }, sc.firstStep],
          [{ t: '模块', cls: 'k' }, { el: h('span', {}, [pill(sc.module, 'mod'), ' ' + sc.weeks + ' 周 · ' + sc.cost + '投入']) }]
        ])
      ], '综合 ' + sc.score.toFixed(1) + ' 分（痛 ' + sc.axis.pain + ' 数 ' + sc.axis.data + ' 效 ' + sc.axis.cycle + ' 槛 ' + sc.axis.barrier + '）', CS[i][0], CS[i][1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(note2('下一步 · NEXT', '第一步就是这一件事', r.summary.next));
    return p;
  }

  // ==== 5 企业画像 ====
  function pProfile(r) {
    var p = page2('02 企业画像与现状', r, 'profile');
    p._body.appendChild(bar('02', '企业画像与现状', 'COMPANY PROFILE', String(r.profile.tags.length), '项画像标签'));
    p._body.appendChild(h('p', { style: 'font-size:12.5px;color:var(--r-text);line-height:1.8;margin:0' }, [r.profile.portrait]));
    var chips = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px' });
    r.profile.tags.forEach(function (t) { chips.appendChild(pill(t, 'dim')); });
    p._body.appendChild(chips);
    p._body.appendChild(two(
      h('div', {}, [
        hh('现状与目标', 'CURRENT STATE'),
        mtbl([['问题'], ['本次作答'], ['对排序的影响']], CD().fields.map(function (f) {
          var v = r.conditions[f.key], o = f.options.filter(function (x) { return x.v === v; })[0] || {};
          var eff = f.key === 'dataState' ? (o.adj ? '数据可得分调整 ' + o.adj + ' 分' : '数据可得分不调整')
            : f.key === 'objective' ? '同分场景优先排与该目标相关的'
            : f.key === 'window' ? (o.fast > 0 ? '见效慢的场景下调 ' + o.fast + ' 分' : o.fast < 0 ? '长周期场景回调 ' + (-o.fast) + ' 分' : '见效周期分不调整')
            : (o.adj ? '实施门槛分调整 ' + (o.adj > 0 ? '+' : '') + o.adj + ' 分' : '实施门槛分不调整');
          return [{ t: f.label, cls: 'k' }, { t: r.conditions[f.key + 'Name'], cls: 'b' }, eff];
        }))
      ]),
      h('div', {}, [
        hh('现有业务系统', 'SYSTEMS IN PLACE'),
        h('div', { class: 'm2-cards c2', style: 'gap:10px;margin-top:10px' }, r.readiness.systems.map(function (sy) {
          return card(null, null, [
            h('div', { style: 'font-size:12px;font-weight:800;color:var(--r-navy)' }, [sy.name, ' ', pill(sy.has ? '已有' : '暂无', sy.has ? 'ok' : 'warn')]),
            h('div', { style: 'font-size:10px;color:var(--r-sub);margin-top:3px' }, [sy.need ? '本行业 ' + sy.need + ' 个场景需要' : '本行业场景暂不依赖'])
          ], null, sy.has ? '#0E9F6E' : '#C9A227', sy.has ? '#0FA3C7' : '#FF8A3D');
        }))
      ]), 'wl'));
    p._body.appendChild(two(
      h('div', {}, [hh('行业视角 · ' + r.sectorInsight.name, 'SECTOR VIEW'), h('p', { style: 'font-size:11.5px;color:var(--r-body);line-height:1.75;margin:0' }, [r.sectorInsight.insight])]),
      h('div', {}, [hh('本行业常见的三个切入点', 'ENTRY POINTS'), mlist(r.sectorInsight.aiFocus.map(function (t, i) { return ['切入点 ' + (i + 1) + '　', t]; }))]), 'wr'));
    p._body.appendChild(note2('数据现状 · DATA STATE', r.conditions.dataStateName, r.conditions.dataStateNote + '　本行业 ' + r.meta.sceneCount + ' 个候选场景中，' + r.readiness.zeroDep + ' 个无需接入业务系统。'));
    return p;
  }

  // ==== 6-7 痛点画像 ====
  function pPain1(r) {
    var p = page2('03 痛点画像', r, 'pain');
    p._body.appendChild(bar('03', '痛点画像', 'PAIN PROFILE', String(r.pains.length), '项 / 共 ' + r.meta.painCount + ' 项候选'));
    p._body.appendChild(two(
      card('痛点集中在「' + r.painProfile.groups.filter(function (g) { return g.key === r.painProfile.focus; })[0].name + '」', '四个经营面的严重度合计与占比', [CH.painBars(r.painProfile.groups)], '严重度 1–5 分，由填表人按当前困扰程度给出。', '#8A54DC', '#C4457E'),
      card('所选痛点与严重度', '圆圈越大表示当前越困扰', [CH.painBubbles(r.pains)], null, '#C4457E', '#FF8A3D')));
    p._body.appendChild(note2('读法 · HOW TO READ', r.painProfile.focusText.split('。')[0] + '。', r.painProfile.focusText.split('。').slice(1).join('。')));
    p._body.appendChild(hh('痛点与场景的逐项对应', 'PAIN TO SCENARIO'));
    p._body.appendChild(mtbl([['所选痛点'], ['严重度', 'c'], ['对应场景'], ['最高排名', 'c']], r.pains.map(function (x) {
      var hit = r.scenes.filter(function (sc) { return sc.hitTags.indexOf(x.tag) >= 0; }).sort(function (a, b) { return a.rank - b.rank; });
      return [
        { el: h('span', {}, [h('b', { style: 'color:' + x.color }, [x.tag]), '　', h('span', { style: 'color:var(--r-sub)' }, [trunc(x.text, 22)])]) },
        { t: String(x.severity), cls: 'c num b' },
        hit.length ? hit.map(function (sc) { return sc.name; }).join('、') : { el: h('span', { style: 'color:var(--r-sub)' }, ['本行业场景库暂无直接对应，已并入相邻场景考虑']) },
        { t: hit.length ? '第 ' + hit[0].rank + ' 名' : '—', cls: 'c' }
      ];
    })));
    return p;
  }
  function pPain2(r) {
    var p = page2('03 痛点画像', r, 'pain');
    p._body.appendChild(bar('03', '痛点与场景的对应', 'PAIN TO SCENARIO', String(r.meta.painCount), '项候选痛点', true));
    p._body.appendChild(card('痛点如何变成场景', '左：勾选的痛点分组　中：匹配到的场景与得分　右：对应的薯片AI智能体模块', [CH.sankey(r.sankey)], '连线粗细表示该场景的综合得分；一个场景可同时对应多个痛点分组。', '#8A54DC', '#0FA3C7'));
    p._body.appendChild(hh('本行业候选痛点全表', r.profile.sectorName + ' · ' + r.meta.painCount + ' ITEMS'));
    var g = h('div', { class: 'm2-two' });
    [0, 1].forEach(function (col) {
      var box = h('div', {});
      CD().groups.slice(col * 2, col * 2 + 2).forEach(function (grp) {
        box.appendChild(mtbl([[grp.name], ['本次', 'c']], r.painLibrary.filter(function (x) { return x.group === grp.key; }).map(function (x) {
          return [{ el: h('span', {}, [h('b', { style: 'color:' + grp.color }, [x.tag]), '　', trunc(x.text, 18)]) },
            { el: x.picked ? pill('严重度 ' + x.severity, 'ok') : h('span', { style: 'color:var(--r-sub)' }, ['—']), cls: 'c' }];
        })));
      });
      g.appendChild(box);
    });
    p._body.appendChild(g);
    return p;
  }

  // ==== 8-9 评分方法 ====
  function pMethod(r) {
    var p = page2('04 评分方法', r, 'method');
    p._body.appendChild(bar('04', '评分方法', 'SCORING METHOD', r.weights.presetName, '本次权重'));
    p._body.appendChild(card('总分 = 四维加权，换算为百分制', AX().formula, [wbar(r)], '权重可在排序台现场调整，调整后按和为 1 归一化并立即重排。', r.axes[0].color, r.axes[3].color));
    var g = h('div', { class: 'm2-cards c4' });
    r.axes.forEach(function (a) {
      g.appendChild(card(a.name + '　' + Math.round(a.weight * 100) + '%', a.desc, [
        h('div', { style: 'font-size:10.5px;color:var(--r-body);line-height:1.65' }, [a.how])
      ], null, a.color, a.color));
    });
    p._body.appendChild(g);
    p._body.appendChild(hh('1–5 分的含义', 'SCALE DEFINITION'));
    p._body.appendChild(mtbl([['维度', 'nw'], ['1 分'], ['2 分'], ['3 分'], ['4 分'], ['5 分']], r.axes.map(function (a) {
      var sc = AX().items.filter(function (x) { return x.key === a.key; })[0].scale;
      return [{ el: h('b', { style: 'color:' + a.color }, [a.name]), cls: 'nw' }].concat(sc.map(function (t) { return t; }));
    })));
    p._body.appendChild(note2('口径说明 · CONFIDENCE', '两维来自本次作答，两维为经验估算', RT().method.confidence));
    return p;
  }
  function pFunnel(r) {
    var p = page2('04 评分方法', r, 'method');
    p._body.appendChild(bar('04', '从场景库到排序表', 'SELECTION FUNNEL', String(DATA.m2.libTotal), '个场景全量', true));
    p._body.appendChild(two(
      card('从 ' + DATA.m2.libTotal + ' 个场景到 1 个起步动作', '每一层的筛选依据写在右侧', [CH.funnel(r.funnel)], null, '#C9A227', '#FF8A3D'),
      h('div', {}, [
        hh('本次筛选的关键动作', 'KEY FILTERS'),
        mlist([
          ['按行业大类取库，', '贵司属' + r.profile.sectorName + '，取该大类 ' + r.meta.sceneCount + ' 个场景作为候选，不跨行业混排。'],
          ['按勾选痛点计强度，', r.funnel[2].count + ' 个场景与所选痛点有交集，其余按 1 分计入，仍参与排序。'],
          ['按现有系统计数据可得，', r.funnel[3].count + ' 个场景的关键数据源现在就能拿到，其余计 1 分。'],
          ['按四维总分取前 ' + r.ranked.length + ' 个，', '再从中挑出数据条件具备、门槛可控的一个作为首批启动。']
        ]),
        block('差异化 · WHY IT CHANGES', '换一组现有系统，排序就会变', '数据可得占 ' + Math.round(r.weights.data * 100) + '% 权重，关键数据源缺失直接计 1 分。补齐一个数据源，相关场景排名会明显上移。', '#C9A227')
      ]), 'wr'));
    return p;
  }

  // ==== 10-11 排序总表 ====
  function pRank1(r) {
    var p = page2('05 场景排序总表', r, 'rank');
    p._body.appendChild(bar('05', '场景排序总表', 'RANKING', String(r.ranked.length), '个进入排序 / 共 ' + r.meta.sceneCount + ' 个'));
    p._body.appendChild(mtbl([['排名', 'c'], ['场景'], ['痛点', 'c'], ['数据', 'c'], ['见效', 'c'], ['门槛', 'c'], ['总分', 'r'], ['对应模块']],
      r.ranked.map(function (sc) {
        return [
          { el: h('b', { style: 'color:' + (sc.rank <= 3 ? '#1157B5' : 'var(--r-sub)') + ';font-size:13px' }, [String(sc.rank)]), cls: 'c' },
          { el: h('span', {}, [h('b', { style: 'color:var(--r-navy)' }, [sc.name]), h('div', { style: 'color:var(--r-sub);font-size:10px' }, [sc.stage + ' · ' + sc.user])]) },
          { t: String(sc.axis.pain), cls: 'c num' }, { t: String(sc.axis.data), cls: 'c num' },
          { t: String(sc.axis.cycle), cls: 'c num' }, { t: String(sc.axis.barrier), cls: 'c num' },
          { el: h('b', { class: 'num', style: 'color:var(--r-navy);font-size:14px' }, [sc.score.toFixed(1)]), cls: 'r' },
          { el: h('span', {}, [pill(sc.module, 'mod'), sc.blocked ? h('span', {}, [' ', pill('需补数据', 'warn')]) : null]) }
        ];
      })));
    p._body.appendChild(hh('为什么排这里', 'RATIONALE'));
    p._body.appendChild(msteps(r.ranked.slice(0, 5).map(function (sc) { return [sc.name + '（' + sc.score.toFixed(1) + ' 分）', sc.reason]; })));
    return p;
  }
  function pRank2(r) {
    var p = page2('05 场景排序总表', r, 'rank');
    p._body.appendChild(bar('05', '得分构成与全部候选', 'SCORE COMPOSITION', String(r.meta.sceneCount), '个候选场景', true));
    p._body.appendChild(two(
      card('总分由四维加权构成', '每段长度 = 该维得分 × 权重', [CH.axisStack(r.ranked, r.axes, 100)], null, '#0A2A5E', '#1157B5'),
      card('首选场景的得分构成', r.ranked[0].name, [CH.waterfall(r.ranked[0].contrib, r.axes, r.ranked[0].score)], null, '#1157B5', '#00C2F0')));
    p._body.appendChild(hh('全部 ' + r.meta.sceneCount + ' 个候选场景', 'ALL CANDIDATES'));
    p._body.appendChild(mtbl([['排名', 'c'], ['场景'], ['环节'], ['痛', 'c'], ['数', 'c'], ['效', 'c'], ['槛', 'c'], ['总分', 'r'], ['状态', 'c']],
      r.scenes.map(function (sc) {
        return [{ t: String(sc.rank), cls: 'c num' }, { el: h('b', {}, [sc.name]) }, sc.stage,
          { t: String(sc.axis.pain), cls: 'c num' }, { t: String(sc.axis.data), cls: 'c num' },
          { t: String(sc.axis.cycle), cls: 'c num' }, { t: String(sc.axis.barrier), cls: 'c num' },
          { el: h('b', { class: 'num' }, [sc.score.toFixed(1)]), cls: 'r' },
          { el: sc.blocked ? pill('需补数据', 'warn') : sc.rank <= r.ranked.length ? pill('进入排序', 'ok') : pill('本轮暂缓', 'dim'), cls: 'c' }];
      })));
    return p;
  }

  // ==== 12 价值与门槛 ====
  function pMatrix(r) {
    var p = page2('06 价值与门槛', r, 'matrix');
    p._body.appendChild(bar('06', '价值与门槛', 'VALUE VS BARRIER', String(r.ranked.filter(function (s) { return s.value >= 4 && s.axis.barrier <= 3 && !s.blocked; }).length), '个落在先做区'));
    p._body.appendChild(two(
      card('四象限定位', '横轴实施门槛，纵轴业务价值，气泡大小为投入档', [CH.bubbleMatrix(r.ranked)], '虚线圈表示关键数据源缺失，补齐后再看位置。', '#0E9F6E', '#0FA3C7'),
      h('div', {}, [
        hh('四象限怎么读', 'HOW TO READ'),
        mlist([
          ['左上「先做」：', '价值高、门槛低，是首批启动的来源。'],
          ['右上「规划」：', '价值高但要改流程或系统，适合在首批跑通后启动。'],
          ['左下「顺带」：', '门槛低、见效快，可在主线推进的同时让更多岗位先用起来。'],
          ['右下「暂缓」：', '本轮不投入精力，等条件变化后重新评估。']
        ]),
        card('前三个场景四维对比', '四角越靠外越有利（门槛已取反）', [CH.radarCompare(r.ranked.slice(0, 3), r.axes)], null, '#1157B5', '#8A54DC')
      ]), 'wr'));
    p._body.appendChild(mtbl([['场景'], ['强在哪'], ['弱在哪'], ['总分', 'r']], r.ranked.slice(0, 3).map(function (sc) {
      var vals = r.axes.map(function (a) { return { a: a, v: a.invert ? 6 - sc.axis[a.key] : sc.axis[a.key] }; }).sort(function (x, y) { return y.v - x.v; });
      return [{ el: h('b', {}, [sc.rank + '. ' + sc.name]) },
        { el: h('span', {}, [h('b', { style: 'color:' + vals[0].a.color }, [vals[0].a.name]), '　' + first(sc.why[vals[0].a.key])]) },
        { el: h('span', {}, [h('b', { style: 'color:' + vals[3].a.color }, [vals[3].a.name]), '　' + first(sc.why[vals[3].a.key])]) },
        { el: h('b', { class: 'num' }, [sc.score.toFixed(1)]), cls: 'r' }];
    })));
    return p;
  }

  // ==== 13-17 五个场景一页纸 ====
  function pScene(r, sc, i) {
    var p = page2(('0' + (7 + i)).slice(-2) + ' 第 ' + (i + 1) + ' 场景 · ' + sc.name, r, 'scene');
    var tier = RT().investment.tiers.filter(function (t) { return t.key === sc.cost; })[0];
    p._body.appendChild(barZh(String(sc.rank), sc.name, sc.stage + ' · ' + sc.user, sc.score.toFixed(1), '综合得分 · 排名第 ' + sc.rank));
    p._body.appendChild(stats([
      { k: '对应模块', v: sc.module, s: '轻享版可开通', c: '#1157B5', c2: '#00C2F0' },
      { k: '上线周期', v: String(sc.weeks), u: '周', s: '含数据整理与试运行', c: '#0E9F6E', c2: '#0FA3C7' },
      { k: '投入档', v: sc.cost, s: tier.range, c: '#C9A227', c2: '#FF8A3D' },
      { k: '数据条件', v: sc.blocked ? '需补齐' : sc.dataDeps.length ? '已具备' : '零依赖', s: sc.blocked ? sc.missingSystemsName.join('、') : sc.dataDeps.length ? sc.presentSystems.join('、') : '无需接入业务系统', c: sc.blocked ? '#E0635C' : '#0E9F6E', c2: sc.blocked ? '#C4457E' : '#0FA3C7' }
    ], 4));
    p._body.appendChild(two(
      h('div', {}, [
        hh('这件事具体是什么', 'WHAT IT DOES'),
        mtbl([['项目'], ['内容']], [
          [{ t: '替代什么', cls: 'k' }, { el: h('b', {}, [sc.replaces]) }],
          [{ t: '给谁用', cls: 'k' }, sc.user],
          [{ t: '预期指标', cls: 'k' }, { el: h('b', { style: 'color:var(--r-green)' }, [sc.metric]) }],
          [{ t: '收益折算', cls: 'k' }, sc.roiBasis],
          [{ t: '前置条件', cls: 'k' }, sc.precondition]
        ]),
        hh('落地三步', 'THREE STEPS'),
        msteps([
          ['第一步　' + sc.firstStep, ''],
          ['补齐前置　' + sc.precondition, ''],
          ['在 ' + sc.module + ' 中配置并试运行两周', '由' + sc.user + '使用，记录使用前后的对比：' + sc.metric + '。']
        ])
      ]),
      h('div', {}, [
        hh('四维逐项依据', 'SCORE BREAKDOWN'),
        mtbl([['维度', 'nw'], ['得分', 'c'], ['依据']], r.axes.map(function (a) {
          return [{ el: h('b', { style: 'color:' + a.color }, [a.name]), cls: 'nw' }, { t: String(sc.axis[a.key]), cls: 'c num b' }, { el: h('span', { style: 'font-size:10px' }, [sc.why[a.key]]) }];
        })),
        hh('所需数据清单', 'DATA REQUIRED'),
        mtbl([['#', 'c'], ['数据'], ['来源', 'c']], sc.dataList.map(function (d, k) {
          return [{ t: String(k + 1), cls: 'c num' }, d, { el: sc.dataDeps.length ? pill(sc.dataDeps.map(function (x) { return sh.optText('systems', x); }).join('/'), r.profile.systems.indexOf(sc.dataDeps[0]) >= 0 ? 'ok' : 'warn') : pill('现有资料', 'ok'), cls: 'c' }];
        }))
      ]), 'wl'));
    p._body.appendChild(note2('为什么排在第 ' + sc.rank + ' 位 · RATIONALE', null, sc.reason));
    return p;
  }

  // ==== 18-19 数据就绪度 ====
  function pReady1(r) {
    var p = page2('12 数据就绪度', r, 'ready');
    p._body.appendChild(bar('12', '数据就绪度', 'DATA READINESS', r.readiness.pct + '%', r.readiness.level));
    p._body.appendChild(card('场景与数据源的对应关系', '绿色为需要且已具备，橙色为需要但缺失', [CH.heatmap(r.readiness.matrix, r.readiness.systems)], '一行一个场景，一列一个业务系统。整行无色块表示该场景无需接入任何系统。', '#0FA3C7', '#1157B5'));
    p._body.appendChild(two(
      note2('读法 · HOW TO READ', r.readiness.text.split('。')[0] + '。', r.readiness.text.split('。').slice(1).join('。')),
      h('div', {}, [
        hh('无需接入系统即可起步', 'ZERO DEPENDENCY'),
        mtbl([['排名', 'c'], ['场景'], ['上线', 'c']], r.scenes.filter(function (sc) { return !sc.dataDeps.length; }).map(function (sc) {
          return [{ t: String(sc.rank), cls: 'c num' }, { el: h('b', {}, [sc.name]) }, { t: sc.weeks + ' 周', cls: 'c' }];
        }))
      ]), 'wr'));
    return p;
  }
  function pReady2(r) {
    var p = page2('12 数据就绪度', r, 'ready');
    p._body.appendChild(bar('12', '补齐清单与解锁关系', 'GAPS & UNLOCKS', String(r.readiness.missing.length), '项数据源待补齐', true));
    if (r.readiness.missing.length) {
      p._body.appendChild(two(
        card('补齐哪一个数据源最划算', '按解锁场景数排序', [CH.depArc(r.readiness.missing, r.blocked)], '解锁指该场景的数据可得分从 1 分回到可评估区间。', '#C9A227', '#FF8A3D'),
        h('div', {}, [
          hh('补齐清单', 'GAP LIST'),
          mtbl([['缺失数据源'], ['解锁', 'c'], ['最高排名', 'c']], r.readiness.missing.map(function (m) {
            return [{ el: h('b', {}, [m.name]) }, { t: m.unlock + ' 个', cls: 'c b' }, { t: '第 ' + m.bestRank + ' 名', cls: 'c' }];
          })),
          block('测算 · IMPACT', '补齐「' + r.readiness.missing[0].name + '」', '该数据源关系到 ' + r.readiness.missing[0].unlock + ' 个场景，其中排名最高的是第 ' + r.readiness.missing[0].bestRank + ' 名。补齐后建议重新跑一次排序。', '#C9A227')
        ]), 'wl'));
      p._body.appendChild(hh('受影响的场景', 'BLOCKED SCENARIOS'));
      p._body.appendChild(mtbl([['排名', 'c'], ['场景'], ['缺什么'], ['对应模块']], r.blocked.map(function (b) {
        return [{ t: String(b.rank), cls: 'c num' }, { el: h('b', {}, [b.name]) }, { el: pill(b.missing.join('、'), 'warn') }, { el: pill(b.module, 'mod') }];
      })));
    } else {
      p._body.appendChild(block('数据条件 · READY', '所需数据源均已具备', '本行业候选场景所需的业务系统贵司都已具备，可直接按排序推进，无需先做数据补齐。', '#0E9F6E'));
      p._body.appendChild(hh('各场景数据来源', 'DATA SOURCES'));
      p._body.appendChild(mtbl([['排名', 'c'], ['场景'], ['数据来源']], r.ranked.map(function (sc) {
        return [{ t: String(sc.rank), cls: 'c num' }, { el: h('b', {}, [sc.name]) }, sc.dataDeps.length ? sc.presentSystems.join('、') : '无需接入业务系统'];
      })));
    }
    return p;
  }

  // ==== 20 排期 ====
  function pPlan(r) {
    var p = page2('13 12 个月排期', r, 'plan');
    p._body.appendChild(bar('13', '12 个月排期', 'ROADMAP', String(r.combo.reduce(function (t, c) { return t + c.scenes.length; }, 0)), '个场景 · 三批次'));
    p._body.appendChild(card('三批次排期', '横条长度为该场景的上线周期，虚线框为数据补齐后再启动', [CH.gantt(r.roadmap)], '批次之间可衔接推进；同一批次内的场景建议错开一到两周启动。', '#0E9F6E', '#C9A227'));
    var g = h('div', { class: 'm2-cards c3' });
    var PC = { p1: ['#0E9F6E', '#0FA3C7'], p2: ['#1157B5', '#00C2F0'], p3: ['#8A54DC', '#C4457E'] };
    r.combo.forEach(function (c) {
      g.appendChild(card(c.name + ' · ' + c.title, c.desc, [
        mtbl([['场景'], ['周期', 'c']], c.scenes.map(function (sc) {
          return [{ el: h('span', {}, [h('b', {}, ['No.' + sc.rank + ' ' + sc.name]), h('div', { style: 'font-size:10px;color:var(--r-sub)' }, [sc.firstStep])]) }, { t: sc.weeks + ' 周', cls: 'c' }];
        }))
      ], '里程碑：' + c.milestone, PC[c.key][0], PC[c.key][1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(note2('推进节奏 · CAPACITY', r.conditions.capacityName, r.conditions.capacityNote));
    return p;
  }

  // ==== 21-22 投入与回报 ====
  function pInvest1(r) {
    var p = page2('14 投入与回报', r, 'invest');
    p._body.appendChild(bar('14', '投入与回报', 'INVESTMENT', r.investment.range, r.investment.name));
    var g = h('div', { class: 'm2-cards c4' });
    var TC = [['#919FB7', '#6B7A99'], ['#0E9F6E', '#0FA3C7'], ['#1157B5', '#00C2F0'], ['#8A54DC', '#C4457E']];
    r.investment.tiers.forEach(function (t, i) {
      g.appendChild(card(t.name + (t.key === r.investment.tier ? '　★' : ''), t.range, [
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.65' }, [t.desc]),
        h('div', { style: 'font-size:10px;color:var(--r-sub);margin-top:6px' }, ['适合：' + t.fit])
      ], t.key === r.investment.tier ? '本次建议' : null, TC[i][0], TC[i][1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(note2('为什么是这一档 · RATIONALE', r.investment.name + ' · ' + r.investment.range, r.investment.rationale));
    p._body.appendChild(hh('逐场景投入与收益口径', 'BY SCENARIO'));
    p._body.appendChild(mtbl([['排名', 'c'], ['场景'], ['投入档', 'c'], ['区间'], ['上线', 'c'], ['收益折算口径']], r.investment.byScene.map(function (x, i) {
      return [{ t: String(i + 1), cls: 'c num' }, { el: h('b', {}, [x.name]) }, { t: x.cost, cls: 'c' }, x.range, { t: x.weeks + ' 周', cls: 'c' }, x.roiBasis];
    })));
    return p;
  }
  function pInvest2(r) {
    var p = page2('14 投入与回报', r, 'invest');
    p._body.appendChild(bar('14', '三档推进情景', 'THREE SCENARIOS', '3', '档可选', true));
    var g = h('div', { class: 'm2-cards c3' });
    var SC = [['#919FB7', '#6B7A99'], ['#1157B5', '#00C2F0'], ['#E0635C', '#C4457E']];
    r.scenarios.forEach(function (x, i) {
      g.appendChild(card(x.name, x.sub, [
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.65;margin-bottom:8px' }, [x.desc]),
        mtbl([['项目'], ['内容']], [
          [{ t: '范围', cls: 'k' }, { el: h('b', {}, [x.scope]) }],
          [{ t: '场景', cls: 'k' }, x.scenes.join('、')],
          [{ t: '投入', cls: 'k' }, x.cost + ' 档 · ' + x.range],
          [{ t: '人力', cls: 'k' }, x.effort],
          [{ t: '预期', cls: 'k' }, x.expect],
          [{ t: '注意', cls: 'k' }, x.risk]
        ])
      ], null, SC[i][0], SC[i][1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(note2('金额口径 · SCOPE', '本报告给出推进范围与投入区间', r.scenarioNote));
    p._body.appendChild(hh('相关服务', 'SERVICES'));
    p._body.appendChild(mtbl([['服务'], ['价格'], ['说明']], RT().services.map(function (sv) {
      return [{ el: h('b', {}, [sv.name]) }, { el: h('b', { class: 'num', style: 'color:var(--r-blue)' }, [sv.price]) }, sv.desc];
    })));
    return p;
  }

  // ==== 23 风险与前置 ====
  function pRisks(r) {
    var p = page2('15 风险与前置条件', r, 'risk');
    p._body.appendChild(bar('15', '风险与前置条件', 'RISK & PREREQUISITES', String(r.risks.length), '条提示'));
    var g = h('div', { class: 'm2-cards c2' });
    var LC = { '高': ['#E0635C', '#C4457E'], '中': ['#C9A227', '#FF8A3D'], '提示': ['#919FB7', '#6B7A99'] };
    r.risks.forEach(function (x) {
      g.appendChild(card(x.title, null, [
        h('div', { style: 'margin-bottom:6px' }, [pill(x.level + '级', x.level === '高' ? 'risk' : x.level === '中' ? 'warn' : 'dim')]),
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.68' }, [x.text])
      ], null, LC[x.level][0], LC[x.level][1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(two(
      h('div', {}, [hh('前置条件汇总', 'PREREQUISITES'), mtbl([['场景'], ['前置条件']], r.ranked.slice(0, 5).map(function (sc) {
        return [{ el: h('b', {}, [sc.rank + '. ' + sc.name]) }, sc.precondition];
      }))]),
      h('div', {}, [hh('角色分工', 'WHO DOES WHAT'), mtbl([['角色'], ['由谁担任'], ['投入', 'c']], r.roles.map(function (x) {
        return [{ el: h('span', {}, [h('b', {}, [x.name]), h('div', { style: 'font-size:10px;color:var(--r-sub)' }, [x.duty])]) }, x.who, { t: x.time, cls: 'c' }];
      }))]), 'wl'));
    return p;
  }

  // ==== 24 90 天清单 ====
  function pChecklist(r) {
    var p = page2('16 90 天启动清单', r, 'check');
    p._body.appendChild(bar('16', '90 天启动清单', 'FIRST 90 DAYS', String(r.checklist.length), '项执行动作'));
    p._body.appendChild(mtbl([['✓', 'c'], ['时间'], ['要做的事'], ['类型', 'c'], ['负责人'], ['对应场景']], r.checklist.map(function (c) {
      return [{ el: h('span', { style: 'display:inline-block;width:13px;height:13px;border:1.5px solid var(--r-line);border-radius:3px' }), cls: 'c' },
        { t: c.week, cls: 'k' }, { el: h('b', {}, [c.item]) }, { el: pill(c.kind, 'mod'), cls: 'c' }, c.owner, c.scene];
    })));
    p._body.appendChild(two(
      block('验收 · ACCEPTANCE', r.ranked[0].name, r.ranked[0].metric + '。试运行两周后对比使用前后的数据，确认后再推第二批。', '#1157B5'),
      h('div', {}, [hh('推进节奏建议', 'CADENCE'), mlist([
        ['每周固定半天，', '由' + r.roles[1].name + '牵头推进，避免被日常事务挤掉。'],
        ['每月一次复盘，', r.roles[0].name + '看一次进展与指标变化，决定是否进入下一批。'],
        ['同时只推一个场景，', '首批跑通之后再并行，避免进度都停在半途。']
      ])]), 'wl'));
    return p;
  }

  // ==== 25 未入选与复盘 ====
  function pExcluded(r) {
    var p = page2('17 未入选与复盘', r, 'out');
    p._body.appendChild(bar('17', '未入选与复盘', 'NOT THIS ROUND', String(r.excluded.length), '个场景本轮暂缓'));
    p._body.appendChild(mtbl([['排名', 'c'], ['场景'], ['总分', 'r'], ['对应模块'], ['未入选原因']], r.excluded.map(function (x) {
      return [{ t: String(x.rank), cls: 'c num' }, { el: h('b', {}, [x.name]) }, { t: x.score.toFixed(1), cls: 'r num' }, { el: pill(x.module, 'mod') }, x.reason];
    })));
    p._body.appendChild(hh('什么时候值得重新跑一次排序', 'WHEN TO RE-RUN'));
    var g = h('div', { class: 'm2-cards c2' });
    r.retrigger.forEach(function (x) {
      g.appendChild(card(x.when, null, [
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.68' }, [x.why]),
        x.extra ? h('div', { style: 'font-size:10.5px;color:var(--r-navy);font-weight:700;margin-top:6px' }, [x.extra]) : null
      ], null, '#6B7A99', '#919FB7'));
    });
    p._body.appendChild(g);
    return p;
  }

  // ==== 26-27 附录 ====
  function pAppA(r) {
    var p = page2('附录 A 评分明细', r, 'app');
    p._body.appendChild(bar('A', '全部场景评分明细', 'SCORING DETAIL', String(r.meta.sceneCount), '个候选场景', true));
    p._body.appendChild(mtbl([['排名', 'c'], ['场景'], ['环节'], ['痛', 'c'], ['数', 'c'], ['效', 'c'], ['槛', 'c'], ['加权贡献'], ['总分', 'r'], ['模块']],
      r.scenes.map(function (sc) {
        return [{ t: String(sc.rank), cls: 'c num' }, { el: h('b', {}, [sc.name]) }, sc.stage,
          { t: String(sc.axis.pain), cls: 'c num' }, { t: String(sc.axis.data), cls: 'c num' },
          { t: String(sc.axis.cycle), cls: 'c num' }, { t: String(sc.axis.barrier), cls: 'c num' },
          { el: h('span', { style: 'color:var(--r-sub);font-size:10px' }, [r.axes.map(function (a) { return sc.contrib[a.key].toFixed(1); }).join(' + ')]) },
          { el: h('b', { class: 'num' }, [sc.score.toFixed(1)]), cls: 'r' },
          { el: pill(sc.module, 'mod') }];
      })));
    p._body.appendChild(h('div', { style: 'font-size:10px;color:var(--r-sub);margin-top:8px' }, ['加权贡献顺序：' + r.axes.map(function (a) { return a.name; }).join(' + ') + '；门槛项按（6 − 门槛）× 权重计。']));
    return p;
  }
  function pAppB(r) {
    var p = page2('附录 B 方法与来源', r, 'app');
    p._body.appendChild(bar('B', '方法、术语与信息来源', 'METHOD & SOURCES', '', '', true));
    p._body.appendChild(two(
      h('div', {}, [hh('术语', 'GLOSSARY'), mtbl([['术语'], ['说明']], RT().glossary.map(function (g) { return [{ el: h('b', {}, [g.term]) }, g.desc]; }))]),
      h('div', {}, [hh('信息来源与置信度', 'SOURCE & CONFIDENCE'), mtbl([['内容'], ['来源'], ['置信度', 'c']], [
        ['企业画像 13 项', '本次填写', { el: pill('填报', 'ok'), cls: 'c' }],
        ['痛点与严重度', '本次勾选与打分', { el: pill('填报', 'ok'), cls: 'c' }],
        ['现有业务系统', '本次填写', { el: pill('填报', 'ok'), cls: 'c' }],
        ['见效速度与实施门槛', '场景库预设值', { el: pill('经验估算', 'warn'), cls: 'c' }],
        ['预期指标区间', '同类企业落地经验', { el: pill('经验估算', 'warn'), cls: 'c' }],
        ['投入区间', '同类项目常见报价', { el: pill('经验估算', 'warn'), cls: 'c' }],
        ['四维得分与排序', '按公式计算', { el: pill('可复算', 'ok'), cls: 'c' }]
      ])]), 'wl'));
    p._body.appendChild(hh('计分口径与适用边界', 'SCOPE'));
    p._body.appendChild(mlist([
      ['评分公式：', RT().method.formula],
      ['痛点强度：', RT().method.pain],
      ['数据可得：', RT().method.data],
      ['场景库来源：', RT().method.source],
      ['适用边界：', RT().method.scope]
    ]));
    p._body.appendChild(note2('复算方式 · REPRODUCIBLE', '同样的输入会得到同样的排序', '四维得分与总分为确定性计算，调整权重、补充系统或修改痛点严重度后重新提交，即可看到排序变化。'));
    return p;
  }

  // ==== 28 封底 ====
  function pEnd(r) {
    var p = page2(null, r, 'app', 'm2-end');
    p._body.appendChild(h('img', { src: sh.CFG.logo, alt: '顶呱呱' }));
    p._body.appendChild(h('div', { class: 'slogan' }, [RT().contact.tagline]));
    p._body.appendChild(h('div', { class: 'contact' }, [
      h('div', {}, [RT().contact.company + '　·　' + RT().product]),
      h('div', {}, ['平台 ' + RT().contact.platform + '　展位号 ' + RT().contact.booth]),
      h('div', {}, [RT().contact.address]),
      h('div', {}, ['联系电话 ' + RT().contact.phone]),
      h('div', {}, ['服务城市 ' + RT().contact.cities])
    ]));
    p._body.appendChild(h('div', { class: 'rule' }));
    p._body.appendChild(h('div', { class: 'disc' }, [RT().closing]));
    return p;
  }

  window.DGG.registerModule('m2', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
