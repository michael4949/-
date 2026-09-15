/* 模块 1 · 企业AI成熟度评估 —— 三屏：通用输入 → 12 题 → 结果
 * 全部数字来自 DGG.maturity.compute()（与 skill 同一份内核）；本文件只负责呈现与交互。
 */
(function () {
  'use strict';
  var core = DGG.maturity;
  var sh, h, DATA, $root;
  var M = { step: 'input', form: null, answers: [], q: 0, result: null, llmState: 'none' }; // llmState: none | ok | failed

  function dataBundle() {
    return {
      dimensions: DATA.m1.dimensions, questions: DATA.m1.questions, levels: DATA.m1.levels, labels: DATA.labels,
      benchmark: DATA.m1.benchmark, actions: DATA.m1.actions, industryMap: DATA.industryMap, promptTemplate: DATA.m1.promptTemplate
    };
  }
  function emptyForm() {
    return { name: '', industry: sh.displayIndustryDefault() || 'mfg-discrete', size: null, province: '浙江', years: null };
  }

  // ---------- 挂载 ----------
  function mount(root, step, shell) {
    sh = shell; h = sh.h; DATA = sh.DATA; $root = root;
    sh.recommend('diag');
    var c = sh.getCompany();
    if (!M.form) M.form = c ? fromCompany(c) : emptyForm();
    if (step === 'result' && !M.result) step = 'input';
    if (step === 'quiz' && !formReady()) step = 'input';
    M.step = step || 'input';
    draw();
  }
  function unmount() { }
  function onCompany(c) {
    M.form = c ? fromCompany(c) : emptyForm();
    if (M.step === 'input') draw();
  }
  function onIndustry(slug) {
    if (M.step === 'input' && slug) { M.form.industry = slug; draw(); }
  }
  function fromCompany(c) { return { name: c.name || '', industry: c.industry, size: c.size, province: c.province, years: c.years }; }
  function formReady() { var f = M.form; return !!(f.industry && f.size && f.province && f.years); }

  function draw() {
    sh.clear($root);
    if (M.step === 'input') drawInput();
    else if (M.step === 'quiz') drawQuiz();
    else drawResult();
    sh.touch();
  }
  function setStep(s) { M.step = s; sh.go('m1', s); }

  // ---------- 屏 1 · 通用输入 ----------
  function drawInput() {
    var f = M.form;
    $root.appendChild(h('div', { class: 'mod-head' }, [
      h('div', { class: 'crumb' }, [h('button', { onclick: function () { sh.go('home'); } }, ['首页']), ' / ']),
      h('h1', {}, ['企业AI成熟度评估'])
    ]));
    var wrap = h('div', { class: 'form-wrap' });
    wrap.appendChild(field('行业', true, chips(DATA.industryMap.internal.map(function (x) { return { v: x.slug, t: x.name }; }), f.industry, function (v) { f.industry = v; draw(); })));
    wrap.appendChild(field('规模', true, chips(DATA.labels.sizeOrder.map(function (k) { return { v: k, t: DATA.labels.size[k] }; }), f.size, function (v) { f.size = v; draw(); })));
    var sel = h('select', { onchange: function () { f.province = sel.value; } });
    DATA.labels.provinces.forEach(function (p) { sel.appendChild(h('option', { value: p, selected: p === f.province }, [p])); });
    wrap.appendChild(field('所在地', true, sel));
    wrap.appendChild(field('成立年限', true, chips(DATA.labels.yearsOrder.map(function (k) { return { v: k, t: DATA.labels.years[k] }; }), f.years, function (v) { f.years = v; draw(); })));
    var inp = h('input', { type: 'text', value: f.name, placeholder: '选填', maxlength: '40', oninput: function () { f.name = inp.value; } });
    wrap.appendChild(field('企业名称', false, inp));
    wrap.appendChild(h('div', { class: 'actions-bar' }, [
      h('button', { class: 'btn primary big', disabled: !formReady(), onclick: function () {
        sh.setCompany({ name: f.name.trim(), industry: f.industry, size: f.size, province: f.province, years: f.years });
        M.answers = []; M.q = 0; M.result = null; M.llmState = 'none'; sh.setQrReady(false);
        setStep('quiz');
      } }, ['开始评估'])
    ]));
    $root.appendChild(wrap);
  }
  function field(label, req, control) {
    return h('div', { class: 'field' }, [h('label', {}, [label, req ? h('span', { class: 'req' }, ['*']) : null]), control]);
  }
  function chips(items, cur, onPick) {
    var box = h('div', { class: 'chips' });
    items.forEach(function (it) {
      box.appendChild(h('button', { class: 'chip' + (it.v === cur ? ' on' : ''), onclick: function () { onPick(it.v); } }, [it.t]));
    });
    return box;
  }

  // ---------- 屏 2 · 12 题 ----------
  function drawQuiz() {
    var qs = DATA.m1.questions, i = M.q, q = qs[i];
    var dimName = DATA.m1.dimensions.filter(function (d) { return d.key === q.dimension; })[0].name;
    var nthInDim = qs.slice(0, i + 1).filter(function (x) { return x.dimension === q.dimension; }).length;
    var box = h('div', { class: 'quiz' });
    var answered = M.answers.filter(function (a) { return a != null; }).length;
    box.appendChild(h('div', { class: 'progress' }, [h('i', { style: 'width:' + Math.round(answered / qs.length * 100) + '%' })]));
    box.appendChild(h('div', { class: 'progress-text' }, [h('span', {}, ['第 ' + (i + 1) + ' / ' + qs.length + ' 题']), h('span', {}, ['已答 ' + answered + ' 题'])]));
    box.appendChild(h('span', { class: 'dim-tag' }, [dimName + ' · ' + nthInDim]));
    box.appendChild(h('div', { class: 'q-text' }, [q.text]));
    var opts = h('div', { class: 'options' });
    q.options.forEach(function (o, k) {
      opts.appendChild(h('button', { class: 'opt' + (M.answers[i] === k ? ' on' : ''), onclick: function () { pick(k); } }, [
        h('span', { class: 'idx' }, [String.fromCharCode(65 + k)]), o
      ]));
    });
    box.appendChild(opts);
    box.appendChild(h('div', { class: 'quiz-nav' }, [
      h('button', { class: 'btn ghost', onclick: function () { if (i === 0) setStep('input'); else { M.q = i - 1; draw(); } } }, [i === 0 ? '返回' : '上一题']),
      h('span', { class: 'no-print', style: 'color:var(--text-sub);align-self:center' }, [M.answers[i] != null ? '' : ''])
    ]));
    $root.appendChild(box);
  }
  function pick(k) {
    M.answers[M.q] = k;
    var last = M.q === DATA.m1.questions.length - 1;
    // 点选即答：高亮 160ms 后进入下一题
    var btns = $root.querySelectorAll('.opt'); btns.forEach(function (b) { b.classList.remove('on'); }); btns[k].classList.add('on');
    setTimeout(function () {
      if (last) finish(); else { M.q++; draw(); }
    }, 160);
  }

  // ---------- 计算 ----------
  function finish() {
    var f = M.form;
    var input = { company: { name: f.name.trim(), industry: f.industry, size: f.size, province: f.province, years: f.years }, answers: M.answers.slice() };
    var r = core.compute(input, dataBundle());
    if (!r.ok) { M.q = 0; draw(); return; }
    M.result = r; M.llmState = 'none';
    sh.charge(r.meta.credits);
    sh.setQrReady(true);
    setStep('result');
    // 可选润色：LLM 到了原地替换，超时保持模板
    sh.llm(core.buildPrompt(r, dataBundle()), 8000).then(function (res) {
      if (res.skipped) return;
      if (res.failed) { M.llmState = 'failed'; if (M.step === 'result') draw(); return; }
      var merged = core.mergePolish(r, res.text, sh.lint.hit);
      var changed = merged.actions.some(function (a) { return a.source === 'llm'; });
      M.llmState = changed ? 'ok' : 'failed';
      if (changed) M.result = merged;
      if (M.step === 'result') draw();
    });
  }

  // ---------- 屏 3 · 结果 ----------
  function drawResult() {
    var r = M.result, c = r.company;
    $root.appendChild(h('div', { class: 'print-head' }, [
      h('div', {}, [h('img', { src: sh.CFG.logo, alt: '顶呱呱' })]),
      h('div', { class: 'pt' }, ['薯片AI智能体 · 企业AI成熟度评估']),
      h('div', { class: 'num', style: 'color:var(--text-sub);font-size:12px' }, [today()])
    ]));
    $root.appendChild(h('div', { class: 'result-head' }, [
      h('h1', {}, [c.name + ' · 企业AI成熟度']),
      h('span', { class: 'meta' }, [[c.industryName, c.sizeName, c.province, c.yearsName].join(' · ')])
    ]));
    var grid = h('div', { class: 'result' });
    // 左：六维雷达 + 同行参考带
    var radarPanel = h('div', { class: 'panel' }, [h('h3', {}, ['六维成熟度'])]);
    var rw = h('div', { class: 'radar-wrap' });
    rw.appendChild(radarSvg(r));
    rw.appendChild(h('div', { class: 'legend' }, [
      h('span', {}, [h('i', { class: 's1' }), c.name]),
      r.benchmark.basis !== 'none' ? h('span', {}, [h('i', { class: 's2' }), '同行参考带']) : null
    ]));
    radarPanel.appendChild(rw);
    var tbl = h('table', { class: 'dim-table' });
    r.dimensions.forEach(function (d) {
      var posText = { above: '高于参考带', within: '参考带内', below: '低于参考带', unknown: '' }[d.position];
      tbl.appendChild(h('tr', {}, [
        h('td', {}, [d.name]),
        h('td', { class: 'r num' }, [d.score + ' / ' + d.max]),
        h('td', { class: 'r num', style: 'color:var(--text-sub)' }, [d.band ? '同行 ' + d.band[0] + '–' + d.band[1] : '']),
        h('td', { class: 'r pos-' + d.position }, [posText])
      ]));
    });
    radarPanel.appendChild(tbl);
    grid.appendChild(radarPanel);
    // 中：等级
    var pos = r.positions;
    grid.appendChild(h('div', { class: 'panel level' }, [
      h('h3', {}, ['成熟度等级']),
      h('div', { class: 'badge' }, [h('div', { class: 'code' }, [r.level.code]), h('div', { class: 'lname' }, [r.level.name])]),
      h('div', { class: 'total num' }, [String(r.total), h('small', {}, [' / ' + r.max])]),
      h('div', { class: 'verdict' }, [r.level.verdict]),
      r.nextLevel
        ? h('div', { class: 'next' }, ['距 ', h('b', {}, [r.nextLevel.code + ' ' + r.nextLevel.name]), ' 还差 ', h('b', { class: 'num' }, [String(r.nextLevel.gap)]), ' 分'])
        : h('div', { class: 'next' }, ['已处于最高等级']),
      r.benchmark.basis !== 'none' ? h('div', { class: 'pos' }, [
        h('span', { class: 'pos-above' }, ['高于同行 ' + pos.above]),
        h('span', { class: 'pos-within' }, ['参考带内 ' + pos.within]),
        h('span', { class: 'pos-below' }, ['低于同行 ' + pos.below])
      ]) : null
    ]));
    // 右：升级三件事
    var actsPanel = h('div', { class: 'panel' }, [h('h3', {}, [r.render[2].title])]);
    var acts = h('div', { class: 'acts' });
    r.actions.forEach(function (a) {
      acts.appendChild(h('div', { class: 'act' }, [
        h('div', { class: 'n num' }, [String(a.order)]),
        h('div', {}, [
          h('div', { class: 't' }, [h('span', { class: 'dim' }, [a.dimensionName]), a.title, M.llmState === 'failed' ? h('span', { class: 'draft' }, ['初稿']) : null]),
          h('div', { class: 'x' }, [a.text]),
          h('div', { class: 'f' }, [h('span', {}, ['对应服务 ', h('b', {}, [a.service])]), h('span', {}, ['可先试 ', h('b', {}, [a.module])])])
        ])
      ]));
    });
    actsPanel.appendChild(acts);
    grid.appendChild(actsPanel);
    $root.appendChild(grid);
    $root.appendChild(h('div', { class: 'actions-bar' }, [
      h('button', { class: 'btn primary big', onclick: sh.print }, ['打印']),
      h('button', { class: 'btn big', onclick: sh.showWeChat }, ['发送到微信']),
      h('button', { class: 'btn ghost', onclick: function () { M.answers = []; M.q = 0; M.result = null; sh.setQrReady(false); setStep('input'); } }, [sh.station() === '1' ? '下一位' : '重新评估'])
    ]));
    $root.appendChild(h('div', { class: 'print-foot' }, [
      '完整评估报告与改进路线 · 专家入企 AI 诊断 · 1980 元 / 1 天　　顶呱呱集团 · 政企一站式服务专家 · 13735822136 · platform.dgg.cn'
    ]));
  }
  function today() {
    var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // ---------- 六维雷达（内联 SVG）----------
  function radarSvg(r) {
    var W = 420, cx = 210, cy = 205, R = 138, N = r.dimensions.length, MAX = 6;
    var s = sh.svgEl;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + (W - 10), role: 'img', 'aria-label': '六维成熟度雷达图' });
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / N; var rr = R * v / MAX; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; }
    function poly(vals) { return vals.map(function (v, i) { return pt(i, v).join(','); }).join(' '); }
    // 网格环（2/4/6）与轴线：弱化
    [2, 4, 6].forEach(function (g) {
      svg.appendChild(s('polygon', { points: poly(r.dimensions.map(function () { return g; })), fill: 'none', stroke: 'var(--chart-grid)', 'stroke-width': g === 6 ? 1.5 : 1 }));
    });
    r.dimensions.forEach(function (_, i) {
      var p = pt(i, MAX); svg.appendChild(s('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--chart-grid)', 'stroke-width': 1 }));
    });
    // 同行参考带：外多边形 high，内多边形 low，evenodd 成环
    var hasBand = r.dimensions.every(function (d) { return d.band; });
    if (hasBand) {
      var outer = poly(r.dimensions.map(function (d) { return d.band[1]; }));
      var inner = poly(r.dimensions.map(function (d) { return d.band[0]; }));
      var path = s('path', { d: 'M' + outer.replace(/ /g, ' L') + ' Z M' + inner.replace(/ /g, ' L') + ' Z', fill: 'var(--chart-band-fill)', 'fill-rule': 'evenodd', stroke: 'var(--chart-band-stroke)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' });
      svg.appendChild(path);
    }
    // 企业多边形
    var vals = r.dimensions.map(function (d) { return d.score; });
    svg.appendChild(s('polygon', { points: poly(vals), fill: 'rgba(73,116,246,.22)', stroke: 'var(--chart-primary)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    r.dimensions.forEach(function (d, i) {
      var p = pt(i, d.score);
      var ring = s('circle', { cx: p[0], cy: p[1], r: 6, fill: '#fff' }); svg.appendChild(ring);
      var dot = s('circle', { cx: p[0], cy: p[1], r: 4, fill: 'var(--chart-primary)' });
      var t = s('title'); t.textContent = d.name + ' ' + d.score + ' / ' + d.max + (d.band ? '，同行 ' + d.band[0] + '–' + d.band[1] : ''); dot.appendChild(t);
      svg.appendChild(dot);
    });
    // 轴标签 + 直接标注得分
    r.dimensions.forEach(function (d, i) {
      var p = pt(i, MAX + 1.15);
      var anchor = Math.abs(p[0] - cx) < 8 ? 'middle' : (p[0] < cx ? 'end' : 'start');
      var g = s('g', { 'text-anchor': anchor, 'font-family': 'inherit' });
      var t1 = s('text', { x: p[0], y: p[1] - 4, 'font-size': 14, 'font-weight': 700, fill: 'var(--text)' }); t1.textContent = d.name;
      var t2 = s('text', { x: p[0], y: p[1] + 14, 'font-size': 13, fill: 'var(--brand)', 'font-weight': 700, style: 'font-variant-numeric:tabular-nums' }); t2.textContent = String(d.score);
      g.appendChild(t1); g.appendChild(t2); svg.appendChild(g);
    });
    return svg;
  }

  DGG.registerModule('m1', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
