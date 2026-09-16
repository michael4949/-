/* 模块 1 · 企业AI成熟度评估 v3 —— 三屏：企业画像（13 项）→ 36 题 → 咨询报告（33 页，信息图风格）
 * 全部数字与文案来自 DGG.maturity.compute()（与 skill 同一份内核）；本文件只负责呈现与交互。
 */
(function () {
  'use strict';
  var core = DGG.maturity, CH = DGG.charts;
  var sh, h, DATA, $root;
  var M = { step: 'input', form: null, answers: [], q: 0, result: null, llmState: 'none', pages: [] };
  var SC = { low: 'var(--r-orange)', mid: 'var(--r-blue)', high: 'var(--r-green)' };
  var SCLS = { low: 'warn', mid: '', high: 'ok' };
  var PHASE_TONE = ['tone-cyan', 'tone-blue', 'tone-purple'];
  var TAG_TONE = { '优先': 'tone-green', '次批': 'tone-blue', '保持': 'tone-gray' };

  function bundle() {
    return { fields: DATA.fields, provinces: DATA.provinces, industries: DATA.industries, dimensions: DATA.m1.dimensions, questions: DATA.m1.questions, levels: DATA.m1.levels,
      diagnostics: DATA.m1.diagnostics, benchmark: DATA.m1.benchmark, actions: DATA.m1.actions, scenes: DATA.m1.scenes, risks: DATA.m1.risks, reportText: DATA.m1.reportText, promptTemplate: DATA.m1.promptTemplate };
  }
  function field(key) { return DATA.fields.filter(function (f) { return f.key === key; })[0]; }
  function sectorOf(slug) { var r = null; DATA.industries.sectors.forEach(function (s) { s.industries.forEach(function (i) { if (i.slug === slug) r = s; }); }); return r; }
  function emptyForm() { return { name: '', industry: sh.displayIndustryDefault() || 'mfg-machinery', size: null, revenue: null, province: '浙江', years: null, ownership: 'private', customers: null, systems: [], itStaff: null, branches: 'single', overseas: 'no', role: 'owner' }; }
  function fromProfile(p) { var f = emptyForm(); Object.keys(f).forEach(function (k) { if (p[k] != null) f[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; }); return f; }
  function formReady() { return DATA.fields.every(function (f) { if (!f.required) return true; var v = M.form[f.key]; return f.type === 'multi' ? (Array.isArray(v) && v.length > 0) : !!v; }); }
  function requiredCount() { var t = 0, d = 0; DATA.fields.forEach(function (f) { if (!f.required) return; t++; var v = M.form[f.key]; if (f.type === 'multi' ? (v && v.length) : v) d++; }); return [d, t]; }
  function first(t) { return String(t || '').split('。')[0] + '。'; }
  function rest(t) { var i = String(t || '').indexOf('。'); return i >= 0 ? String(t).slice(i + 1) : ''; }

  // ---------- 挂载 ----------
  function mount(root, step, shell) {
    sh = shell; h = sh.h; DATA = sh.DATA; $root = root;
    sh.recommend('diag');
    var c = sh.getCompany();
    if (!M.form) M.form = c ? fromProfile(c) : emptyForm();
    if (step === 'result' && !M.result) step = 'input';
    if (step === 'quiz' && !formReady()) step = 'input';
    M.step = step || 'input';
    draw();
  }
  function unmount() { }
  function onCompany(c) { M.form = c ? fromProfile(c) : emptyForm(); if (M.step === 'input') draw(); }
  function onIndustry(slug) { if (M.step === 'input' && slug) { M.form.industry = slug; draw(); } }
  function draw() { sh.clear($root); if (M.step === 'input') drawInput(); else if (M.step === 'quiz') drawQuiz(); else drawReport(); sh.touch(); }
  function setStep(s) { M.step = s; sh.go('m1', s); }

  // ---------- 屏 1 · 企业画像 ----------
  function drawInput() {
    var f = M.form;
    $root.appendChild(h('div', { class: 'mod-head' }, [h('div', { class: 'crumb' }, [h('button', { onclick: function () { sh.go('home'); } }, ['首页']), ' / ']), h('h1', {}, ['企业AI成熟度评估'])]));
    var grid = h('div', { class: 'form-grid' });
    DATA.fields.forEach(function (fd) {
      var ctrl, cls = '';
      if (fd.type === 'text') { var inp = h('input', { type: 'text', value: f.name, placeholder: fd.placeholder || '', maxlength: '40', oninput: function () { f.name = inp.value; } }); ctrl = inp; }
      else if (fd.type === 'industry') {
        cls = 'span2';
        var sec = sectorOf(f.industry) || DATA.industries.sectors[0], box = h('div');
        box.appendChild(h('div', { class: 'chips sm sector-row' }, DATA.industries.sectors.map(function (s) { return h('button', { class: 'chip' + (s.key === sec.key ? ' on' : ''), onclick: function () { f.industry = s.industries[0].slug; draw(); } }, [s.name]); })));
        box.appendChild(h('div', { class: 'chips' }, sec.industries.map(function (i) { return h('button', { class: 'chip' + (i.slug === f.industry ? ' on' : ''), onclick: function () { f.industry = i.slug; draw(); } }, [i.name]); })));
        ctrl = box;
      } else if (fd.type === 'select') { var sel = h('select', { onchange: function () { f.province = sel.value; } }); DATA.provinces.forEach(function (p) { sel.appendChild(h('option', { value: p, selected: p === f.province }, [p])); }); ctrl = sel; }
      else if (fd.type === 'multi') {
        cls = 'span2';
        ctrl = h('div', { class: 'chips' }, fd.options.map(function (o) {
          var on = f.systems.indexOf(o.v) >= 0;
          return h('button', { class: 'chip' + (on ? ' on' : ''), onclick: function () { if (o.exclusive) f.systems = on ? [] : [o.v]; else { f.systems = f.systems.filter(function (x) { return x !== 'none' && x !== o.v; }); if (!on) f.systems.push(o.v); } draw(); } }, [o.t]);
        }));
      } else { ctrl = h('div', { class: 'chips' }, fd.options.map(function (o) { return h('button', { class: 'chip' + (f[fd.key] === o.v ? ' on' : ''), onclick: function () { f[fd.key] = o.v; draw(); } }, [o.t]); })); }
      grid.appendChild(h('div', { class: 'field ' + cls }, [h('label', {}, [fd.label, fd.required ? h('span', { class: 'req' }, ['*']) : null, fd.hint ? h('span', { class: 'hint' }, [fd.hint]) : null]), ctrl]));
    });
    $root.appendChild(grid);
    var rc = requiredCount();
    $root.appendChild(h('div', { class: 'actions-bar form-status' }, [
      h('button', { class: 'btn primary big', disabled: !formReady(), onclick: function () { sh.setCompany(JSON.parse(JSON.stringify(f))); M.answers = []; M.q = 0; M.result = null; M.llmState = 'none'; sh.setQrReady(false); setStep('quiz'); } }, ['开始评估']),
      h('span', { class: 'cnt' }, ['必填 ', h('b', { class: 'num' }, [rc[0] + ' / ' + rc[1]]), ' 项 · 36 题约 5 分钟'])
    ]));
  }

  // ---------- 屏 2 · 36 题 ----------
  function drawQuiz() {
    var qs = DATA.m1.questions, i = M.q, q = qs[i];
    var dim = DATA.m1.dimensions.filter(function (d) { return d.key === q.dimension; })[0], sub = dim.subdims.filter(function (s) { return s.key === q.sub; })[0];
    var box = h('div', { class: 'quiz' }), seg = h('div', { class: 'seg-progress' });
    DATA.m1.dimensions.forEach(function (d) { var s = h('div', { class: 'seg', style: '--seg-color:' + d.color }); qs.forEach(function (x, k) { if (x.dimension === d.key) s.appendChild(h('i', { class: M.answers[k] != null ? 'on' : '' })); }); seg.appendChild(s); });
    box.appendChild(seg);
    box.appendChild(h('div', { class: 'seg-legend' }, DATA.m1.dimensions.map(function (d) { return h('span', { class: d.key === q.dimension ? 'cur' : '' }, [d.name]); })));
    box.appendChild(h('div', { class: 'progress-text' }, [h('span', {}, ['第 ' + (i + 1) + ' / ' + qs.length + ' 题']), h('span', {}, ['已答 ' + M.answers.filter(function (a) { return a != null; }).length + ' 题'])]));
    box.appendChild(h('span', { class: 'dim-tag', style: 'background:' + dim.color + '22;color:' + dim.color }, [dim.name + ' · ' + sub.name]));
    box.appendChild(h('div', { class: 'q-text' }, [q.text]));
    var opts = h('div', { class: 'options' });
    q.options.forEach(function (o, k) { opts.appendChild(h('button', { class: 'opt' + (M.answers[i] === k ? ' on' : ''), onclick: function () { pick(k); } }, [h('span', { class: 'idx' }, [String.fromCharCode(65 + k)]), o])); });
    box.appendChild(opts);
    box.appendChild(h('div', { class: 'quiz-nav' }, [h('button', { class: 'btn ghost', onclick: function () { if (i === 0) setStep('input'); else { M.q = i - 1; draw(); } } }, [i === 0 ? '返回' : '上一题'])]));
    $root.appendChild(box);
  }
  function pick(k) {
    M.answers[M.q] = k;
    var last = M.q === DATA.m1.questions.length - 1, btns = $root.querySelectorAll('.opt');
    btns.forEach(function (b) { b.classList.remove('on'); }); btns[k].classList.add('on');
    setTimeout(function () { if (last) finish(); else { M.q++; draw(); } }, 160);
  }

  // ---------- 计算 ----------
  function finish() {
    var r = core.compute({ profile: JSON.parse(JSON.stringify(M.form)), answers: M.answers.slice() }, bundle());
    if (!r.ok) { M.q = 0; draw(); return; }
    M.result = r; M.llmState = 'none';
    sh.charge(r.meta.credits); sh.setQrReady(true);
    setStep('result');
    sh.llm(core.buildPrompt(r, bundle()), 8000).then(function (res) {
      if (res.skipped) return;
      if (res.failed) { M.llmState = 'failed'; if (M.step === 'result') draw(); return; }
      var merged = core.mergePolish(r, res.text, sh.lint.hit), changed = merged.actions.some(function (a) { return a.source === 'llm'; });
      M.llmState = changed ? 'ok' : 'failed'; if (changed) M.result = merged;
      if (M.step === 'result') draw();
    });
  }

  // ---------- 屏 3 · 报告（28 页 · 3D 凸浮标题栏版式） ----------
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function reportNo(r) { var x = 0, n = r.profile.name; for (var i = 0; i < n.length; i++) x = (x * 31 + n.charCodeAt(i)) % 100000; return 'DGG-M-' + today().replace(/-/g, '') + '-' + ('00000' + x).slice(-5); }
  function printBrief() { document.body.classList.add('print-brief'); var off = function () { document.body.classList.remove('print-brief'); window.removeEventListener('afterprint', off); }; window.addEventListener('afterprint', off); sh.print(); }
  function RT() { return DATA.m1.reportText; }
  function trunc(t, n) { t = String(t); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  function dimOf(key) { return M.result.dimensions.filter(function (d) { return d.key === key; })[0]; }
  function subOf(key) { return M.result.subdims.filter(function (x) { return x.key === key; })[0]; }

  var M1C = {
    nav: ['#0A2A5E', '#1157B5'], quick: ['#1157B5', '#0FA3C7'], profile: ['#0FA3C7', '#0E9F6E'],
    overall: ['#0A2A5E', '#0FA3C7'], dim: ['#1157B5', '#8A54DC'], strength: ['#0E9F6E', '#0FA3C7'],
    dir: ['#8A54DC', '#1157B5'], gap: ['#C9A227', '#E0635C'], scene: ['#0FA3C7', '#1157B5'],
    plan: ['#0E9F6E', '#C9A227'], invest: ['#C9A227', '#FF8A3D'], risk: ['#E0635C', '#8A54DC'],
    check: ['#1157B5', '#0FA3C7'], again: ['#6B7A99', '#919FB7'], app: ['#0A2A5E', '#57708F']
  };

  function page1(chapter, r, key, cls) {
    var c = M1C[key] || M1C.nav;
    var p = h('section', { class: 'page m1 ' + (cls || ''), style: '--mc:' + c[0] + ';--mc2:' + c[1] });
    if (chapter !== null) p.appendChild(h('div', { class: 'm1-head' }, [
      h('span', { class: 'ch' }, [h('i', {}), chapter || RT().reportTitle]),
      h('span', { class: 'rt' }, [r.profile.name + '　·　' + reportNo(r)])
    ]));
    var body = h('div', { class: 'page-body' }); p.appendChild(body); p._body = body; p._c = c; return p;
  }
  function bar1(no, title, en, rv, rk, slim) {
    return h('div', { class: 'm1-bar' + (slim ? ' slim' : '') }, [
      h('div', { class: 'no' }, [no]),
      h('div', {}, [h('div', { class: 't' }, [title]), en ? h('div', { class: 'en' }, [en]) : null]),
      rv ? h('div', { class: 'rt' }, [h('div', { class: 'v num' }, [rv]), rk ? h('div', { class: 'k' }, [rk]) : null]) : h('div', {})
    ]);
  }
  function hh1(title, en) { return h('h3', { class: 'm1-h' }, [title, en ? h('span', { class: 'en' }, [en]) : null]); }
  function card1(title, sub, body, note, c1, c2) {
    var k = h('div', { class: 'm1-card', style: c1 ? '--cc:' + c1 + ';--cc2:' + (c2 || c1) : '' });
    if (title) k.appendChild(h('div', { class: 'ct' }, [title]));
    if (sub) k.appendChild(h('div', { class: 'cs' }, [sub]));
    (Array.isArray(body) ? body : [body]).forEach(function (b) { if (b) k.appendChild(b); });
    if (note) k.appendChild(h('div', { class: 'cn' }, [note]));
    return k;
  }
  function block1(lb, val, text, color, items) {
    return h('div', { class: 'm1-block', style: '--bc:' + color }, [
      h('div', { class: 'bt' }, [lb]), h('div', { class: 'bv' }, [val]),
      text ? h('div', { class: 'bx' }, [text]) : null,
      items && items.length ? h('ul', {}, items.map(function (x) { return h('li', {}, [x]); })) : null
    ]);
  }
  function stats1(items, n, c) {
    return h('div', { class: 'm1-stats s' + (n || items.length) }, items.map(function (x) {
      return h('div', { class: 'm1-stat', style: x.c ? '--sc:' + x.c + ';--sc2:' + (x.c2 || x.c) : (c ? '--sc:' + c[0] + ';--sc2:' + c[1] : '') }, [
        h('div', { class: 'k' }, [x.k]),
        h('div', { class: 'v num' }, [x.v, x.u ? h('small', {}, [x.u]) : null]),
        h('div', { class: 's' }, [x.s])
      ]);
    }));
  }
  function note1(lb, hl, x) { return h('div', { class: 'm1-note' }, [h('div', { class: 'lb' }, [lb]), hl ? h('div', { class: 'hl' }, [hl]) : null, x ? h('div', { class: 'x' }, [x]) : null]); }
  function pill1(t, cls) { return h('span', { class: 'm1-pill ' + (cls || 'dim') }, [t]); }
  function tbl1(headers, rows) {
    var t = h('table', { class: 'm1-tbl' });
    t.appendChild(h('thead', {}, [h('tr', {}, headers.map(function (x) { return h('th', { class: x[1] || '' }, [x[0]]); }))]));
    var tb = h('tbody');
    rows.forEach(function (row) { tb.appendChild(h('tr', {}, row.map(function (c) { return h('td', { class: (c && c.cls) || '' }, [c && c.el ? c.el : (c && c.t != null ? c.t : c)]); }))); });
    t.appendChild(tb); return t;
  }
  function list1(items) { return h('ul', { class: 'm1-list' }, items.map(function (x) { return h('li', {}, Array.isArray(x) ? [h('b', {}, [x[0]]), x[1]] : [x]); })); }
  function steps1(items) { return h('ol', { class: 'm1-steps' }, items.map(function (x) { return h('li', {}, Array.isArray(x) ? [h('b', {}, [x[0]]), x[1]] : [x]); })); }
  function two1(a, b, cls) { return h('div', { class: 'm1-two ' + (cls || '') }, [a, b]); }
  function posPill(d) {
    return d.position === 'above' ? pill1('高于参考带', 'ok') : d.position === 'below' ? pill1('低于参考带', 'warn') : d.position === 'within' ? pill1('参考带内', 'dim') : pill1('参考带待补', 'dim');
  }

  function drawReport() {
    var r = M.result; M.pages = [];
    $root.appendChild(h('div', { class: 'report-bar' }, [
      h('button', { class: 'btn primary big', onclick: printBrief }, ['打印速览']),
      h('button', { class: 'btn big', onclick: sh.print }, ['打印完整报告']),
      h('button', { class: 'btn big', onclick: sh.showWeChat }, ['发送到微信']),
      h('span', { class: 'spacer' }), h('span', { class: 'pages-count', id: 'pages-count' }),
      h('button', { class: 'btn ghost', onclick: function () { M.answers = []; M.q = 0; M.result = null; sh.setQrReady(false); setStep('input'); } }, [sh.station() === '1' ? '下一位' : '重新评估'])
    ]));
    var wrap = h('div', { class: 'report' }), toc = h('nav', { class: 'toc' }), pages = h('div', { class: 'pages' });
    var add = function (title, el2, o) { o = o || {}; M.pages.push({ title: title, sub: o.sub, one: o.one, el: el2, brief: !!o.brief }); };

    add('封面', pFront(r), { brief: true });
    add('本报告导航', pNav(r), { one: '阅读指引、章节索引与评估口径' });
    add('01 诊断结论速览', pQuick1(r), { brief: true, one: '六个问题、六句回答与总体判断' });
    add('', pQuick2(r), { brief: true, sub: '三件事与优先方向' });
    add('02 企业画像', pProfile(r), { one: '基本情况、现有系统、行业视角与评估方法' });
    add('03 总体成熟度', pOverall1(r), { brief: true, one: '综合得分、等级刻度与六维形状' });
    add('', pOverall2(r), { sub: '六维雷达与同行参考带' });
    add('', pOverall3(r), { sub: '同行分布与作答分布' });
    r.dimensions.forEach(function (d, i) {
      add('04.' + (i + 1) + ' ' + d.name + '维度', pDim(r, d, i), i === 0 ? { one: '六个维度逐一诊断：子维度得分、作答明细与两条建议' } : {});
    });
    add('05 优势与短板', pStrength(r), { one: '十八项子维度排序与三强三弱' });
    add('06 AI 优先方向', pDir(r), { one: '六个维度相对同行的偏离与先后次序' });
    add('07 距下一级的差距', pGap(r), { brief: true, one: '进入下一级还差多少，分摊到哪几维' });
    add('08 推荐场景', pScenes(r), { one: '价值与难度矩阵、五个推荐场景' });
    add('09 升级路线图', pPlan1(r), { brief: true, one: '12 个月三阶段九项行动' });
    add('', pPlan2(r), { sub: '九项行动明细与交付物' });
    add('10 投入与回报', pInvest(r), { one: '投入档位、本次建议与相关服务' });
    add('11 风险与合规', pRisks(r), { one: '由作答与画像触发的提示与角色分工' });
    add('12 90 天行动清单', pChecklist(r), { one: '可勾选执行项、负责人与验收' });
    add('13 何时重评', pAgain(r), { one: '什么情况下值得重新评一次' });
    add('附录 A 评分明细', pAppA(r, 0), { one: '36 题作答、得分与释义' });
    add('', pAppA(r, 1), { sub: '评分明细（续）' });
    add('附录 B 方法与来源', pAppB(r), { one: '术语、计分口径、信息来源与置信度' });
    add('封底', pEnd(r), {});

    M.pages.forEach(function (pg, i) {
      pg.el.setAttribute('data-page', String(i + 1)); if (pg.brief) pg.el.classList.add('brief');
      if (i > 0 && i < M.pages.length - 1) pg.el.appendChild(h('div', { class: 'm1-foot' }, [
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
    document.getElementById('pages-count').textContent = '共 ' + M.pages.length + ' 页';
    var nav = document.getElementById('m1-nav-tbl');
    if (nav) M.pages.forEach(function (pg, i) {
      if (!pg.title || !pg.one) return;
      nav.appendChild(h('tr', {}, [h('td', { class: 'b' }, [pg.title.split(' ')[0]]), h('td', {}, [pg.title.replace(/^\S+\s/, '')]), h('td', {}, [pg.one]), h('td', { class: 'r num' }, [String(i + 1)])]));
    });
  }

  // ==== 1 封面 ====
  function pFront(r) {
    var p = page1(null, r, 'overall', 'm1-front');
    var hero = h('div', { class: 'hero' });
    hero.appendChild(CH.heroM1(r, r.total * 7 + r.pct));
    hero.appendChild(h('img', { class: 'logo', src: sh.CFG.logo, alt: '顶呱呱' }));
    hero.appendChild(h('div', { class: 'ov' }, [
      h('div', { class: 'co' }, [r.profile.name]),
      h('div', { class: 'rt' }, [RT().reportTitle]),
      h('div', { class: 'en' }, [RT().reportTitleEn || 'AI MATURITY ASSESSMENT REPORT'])
    ]));
    p._body.appendChild(hero);
    var body = h('div', { class: 'body' });
    body.appendChild(h('div', { class: 'split' }, [
      h('div', { class: 'lvcard' }, [
        h('div', { class: 'lb' }, ['成熟度等级 · MATURITY LEVEL']),
        h('div', { class: 'lv' }, [h('span', { class: 'code' }, [r.level.code]), h('span', { class: 'lname' }, [r.level.name + ' 级'])]),
        h('div', { class: 'vd' }, [r.level.verdict]),
        h('div', { class: 'mt' }, [r.summary.position]),
        h('div', { class: 'chips' }, [
          h('span', {}, [r.total + ' / ' + r.max + ' 分']),
          h('span', {}, [r.percentile != null ? '超过 ' + r.percentile + '% 同行' : '参考带待补']),
          h('span', {}, [r.nextLevel ? '距 ' + r.nextLevel.code + ' 级 ' + r.nextLevel.gapPts + ' 分' : '已处最高级']),
          h('span', {}, [r.investment.name])
        ])
      ]),
      CH.scoreArc(r.pct, r.level, r.nextLevel)
    ]));
    body.appendChild(stats1([
      { k: '综合得分', v: r.pct + '%', s: r.total + ' / ' + r.max + ' 分', c: '#1157B5', c2: '#0FA3C7' },
      { k: '同行位置', v: r.percentile != null ? '超 ' + r.percentile + '%' : '—', s: '同行业同规模', c: '#8A54DC', c2: '#C4457E' },
      { k: '高于参考带', v: String(r.positions.above), u: '维', s: '共六个维度', c: '#0E9F6E', c2: '#0FA3C7' },
      { k: '低于参考带', v: String(r.positions.below), u: '维', s: '需优先补齐', c: '#E0635C', c2: '#C9A227' },
      { k: '待加强子维度', v: String(r.subdims.filter(function (x) { return x.band === 'low'; }).length), u: '项', s: '共 18 项', c: '#C9A227', c2: '#FF8A3D' }
    ], 5));
    body.appendChild(h('div', { class: 'bot' }, [
      h('span', {}, [RT().issuer]),
      h('span', {}, ['报告编号 ' + reportNo(r) + '　出具日期 ' + today()])
    ]));
    p._body.appendChild(body);
    return p;
  }

  // ==== 2 导航 ====
  function pNav(r) {
    var p = page1('本报告导航', r, 'nav');
    p._body.appendChild(bar1('00', '本报告导航', 'HOW TO READ', '28', '页'));
    p._body.appendChild(two1(
      h('div', {}, [hh1('阅读指引', 'READING GUIDE'), list1(RT().readingGuide.map(function (t) { var i = t.indexOf('。'); return [t.slice(0, i + 1), t.slice(i + 1)]; }))]),
      h('div', {}, [
        hh1('本次评估口径', 'SCORING BASIS'),
        card1('六维十八项 · 36 题 · 总分 108', '每题四选项对应 0–3 分，子维度 0–6 分，维度 0–18 分', [
          tbl1([['项目'], ['口径']], [
            [{ t: '等级判定', cls: 'k' }, r.levels.map(function (l) { return l.code + ' ' + l.name + ' ≥ ' + l.minPct + '%'; }).join('　')],
            [{ t: '同行参考带', cls: 'k' }, '按「细分行业 × 人员规模」分格，本次取 ' + r.benchmark.key + '（' + (r.benchmark.basis === 'exact' ? '精确匹配' : r.benchmark.basis === 'nearest-size' ? '取同行业最近规模格' : '无参考带') + '）'],
            [{ t: '同行百分位', cls: 'k' }, r.percentile != null ? '按参考格均值 ' + r.distribution.mean + '% 与标准差 ' + r.distribution.sd + ' 估算' : '参考带待补，本次不给百分位']
          ])
        ], RT().method.benchmark || '参考带在业务侧抽样到位前为估算值，对外一律表述为「同行参考带」。', '#1157B5', '#0FA3C7')
      ]), 'wl'));
    p._body.appendChild(hh1('章节索引', 'CONTENTS'));
    var t = h('table', { class: 'm1-tbl' });
    t.appendChild(h('thead', {}, [h('tr', {}, [h('th', {}, ['章']), h('th', {}, ['标题']), h('th', {}, ['一句话内容']), h('th', { class: 'r' }, ['页'])])]));
    t.appendChild(h('tbody', { id: 'm1-nav-tbl' }));
    p._body.appendChild(t);
    return p;
  }

  // ==== 3-4 结论速览 ====
  function pQuick1(r) {
    var p = page1('01 诊断结论速览', r, 'quick');
    p._body.appendChild(bar1('01', '诊断结论速览', 'EXECUTIVE SUMMARY', r.pct + '%', r.level.code + ' ' + r.level.name + ' 级'));
    var TONE = { cyan: ['#0FA3C7', '#00C2F0'], purple: ['#8A54DC', '#C4457E'], orange: ['#FF8A3D', '#C9A227'], blue: ['#1157B5', '#0FA3C7'], green: ['#0E9F6E', '#0FA3C7'], navy: ['#0A2A5E', '#1157B5'] };
    var g = h('div', { class: 'm1-cards c3' });
    r.quickView.forEach(function (q) {
      var c = TONE[q.tone] || TONE.blue;
      g.appendChild(card1(q.q, null, [
        h('div', { style: 'font-size:15px;font-weight:900;color:' + c[0] + ';line-height:1.3;margin:2px 0 6px' }, [q.a]),
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.68' }, [q.text])
      ], null, c[0], c[1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(h('div', { style: 'margin-top:14px' }, [block1('总体判断 · VERDICT', r.verdict.headline, r.verdict.text, '#0A2A5E')]));
    p._body.appendChild(stats1([
      { k: '六维最强', v: r.dimensions.filter(function (d) { return d.key === r.strongDims[r.strongDims.length - 1]; })[0].name, s: dimOf(r.strongDims[r.strongDims.length - 1]).pct + '%', c: '#0E9F6E', c2: '#0FA3C7' },
      { k: '六维最弱', v: dimOf(r.weakDims[0]).name, s: dimOf(r.weakDims[0]).pct + '%', c: '#E0635C', c2: '#C9A227' },
      { k: '已建立子维度', v: String(r.subdims.filter(function (x) { return x.band === 'high'; }).length), u: '项', s: '共 18 项', c: '#1157B5', c2: '#0FA3C7' },
      { k: '待加强子维度', v: String(r.subdims.filter(function (x) { return x.band === 'low'; }).length), u: '项', s: '优先补齐', c: '#C9A227', c2: '#FF8A3D' },
      { k: '起步投入', v: r.investment.range, s: r.investment.name, c: '#8A54DC', c2: '#C4457E' }
    ], 5));
    return p;
  }
  function pQuick2(r) {
    var p = page1('01 诊断结论速览', r, 'quick');
    p._body.appendChild(bar1('01', '未来三个月先做三件事', 'FIRST THREE ACTIONS', String(r.actions.filter(function (a) { return a.phase === 'p1'; }).length), '项打基础动作', true));
    var g = h('div', { class: 'm1-cards c3' });
    r.actions.slice(0, 3).forEach(function (a) {
      g.appendChild(card1(a.title, a.dimensionName + '维度 · ' + a.owner, [
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.66;margin-bottom:7px' }, [a.why]),
        tbl1([['项目'], ['内容']], [
          [{ t: '交付物', cls: 'k' }, a.deliverable],
          [{ t: '周期', cls: 'k' }, a.weeks + ' 周 · ' + a.cost + '投入'],
          [{ t: '验收', cls: 'k' }, a.kpi],
          [{ t: '对应服务', cls: 'k' }, a.service]
        ])
      ], '可先试：' + a.module, a.color, a.color));
    });
    p._body.appendChild(g);
    p._body.appendChild(hh1('六个维度的先后次序', 'PRIORITY ORDER'));
    p._body.appendChild(tbl1([['次序', 'c'], ['维度'], ['得分', 'c'], ['位置', 'c'], ['依据']], r.directions.map(function (d) {
      return [{ el: pill1(d.tag, d.tag === '优先' ? 'risk' : d.tag === '次批' ? 'warn' : 'ok'), cls: 'c' },
        { el: h('b', { style: 'color:' + d.color }, [d.name]) },
        { t: d.pct + '%', cls: 'c num' },
        { el: posPill({ position: d.position }), cls: 'c' },
        { el: h('span', { style: 'font-size:10.5px' }, [d.reason]) }];
    })));
    p._body.appendChild(note1('下一步 · NEXT', '第一件事就是这个', r.summary.next));
    return p;
  }

  // ==== 5 企业画像 ====
  function pProfile(r) {
    var p = page1('02 企业画像', r, 'profile');
    p._body.appendChild(bar1('02', '企业画像', 'COMPANY PROFILE', String(r.profile.tags.length), '项画像标签'));
    p._body.appendChild(h('p', { style: 'font-size:12.5px;color:var(--r-text);line-height:1.8;margin:0' }, [r.profile.portrait]));
    var chips = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px' });
    r.profile.tags.forEach(function (t) { chips.appendChild(pill1(t, 'dim')); });
    p._body.appendChild(chips);
    p._body.appendChild(two1(
      h('div', {}, [
        hh1('行业视角 · ' + r.sectorInsight.name, 'SECTOR VIEW'),
        h('p', { style: 'font-size:11.5px;color:var(--r-body);line-height:1.75;margin:0' }, [r.sectorInsight.insight]),
        hh1('本行业常见的三个 AI 切入点', 'ENTRY POINTS'),
        list1(r.sectorInsight.aiFocus.map(function (t, i) { return ['切入点 ' + (i + 1) + '　', t]; }))
      ]),
      h('div', {}, [
        hh1('评估方法', 'METHOD'),
        tbl1([['项目'], ['说明']], [
          [{ t: '题目', cls: 'k' }, '36 题，六维各 6 题，每维 3 个子维度各 2 题'],
          [{ t: '计分', cls: 'k' }, '每题四选项对应 0–3 分，子维度 0–6，维度 0–18，总分 0–108'],
          [{ t: '等级', cls: 'k' }, '总分换算百分比后按门槛取等级'],
          [{ t: '参考带', cls: 'k' }, r.benchmark.key + '（' + (r.benchmark.basis === 'exact' ? '精确匹配' : r.benchmark.basis === 'nearest-size' ? '最近规模格' : '无') + '）']
        ]),
        stats1([
          { k: '人员规模', v: r.profile.sizeName, s: r.profile.revenueName },
          { k: '现有系统', v: String(r.profile.systems.filter(function (x) { return x !== 'none'; }).length), u: '个', s: r.profile.systems.indexOf('none') >= 0 ? '暂无业务系统' : r.profile.systemsName.join(' / ') },
          { k: '数字化专职', v: r.profile.itStaffName, s: '推进能力基础' }
        ], 3, M1C.profile)
      ]), 'wl'));
    p._body.appendChild(note1('等级含义 · LEVEL', r.level.code + ' ' + r.level.name + ' 级：' + r.level.verdict, r.level.desc));
    return p;
  }

  // ==== 6-8 总体成熟度 ====
  function pOverall1(r) {
    var p = page1('03 总体成熟度', r, 'overall');
    p._body.appendChild(bar1('03', '总体成熟度', 'OVERALL MATURITY', r.pct + '%', r.total + ' / ' + r.max + ' 分'));
    p._body.appendChild(two1(
      card1('综合得分与下一级门槛', r.nextLevel ? '距 ' + r.nextLevel.code + ' ' + r.nextLevel.name + ' 级还差 ' + r.nextLevel.gapPts + ' 分' : '已处于最高等级', [CH.scoreArc(r.pct, r.level, r.nextLevel)], null, '#1157B5', '#0FA3C7'),
      h('div', {}, [
        hh1('本级特征', 'LEVEL TRAITS'),
        list1(r.level.traits),
        card1('典型企业', r.level.typical, [h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.66' }, ['本级重点：' + r.level.focus])], null, '#0FA3C7', '#0E9F6E')
      ]), 'wr'));
    p._body.appendChild(hh1('五级刻度与本企业位置', 'MATURITY LADDER'));
    p._body.appendChild(CH.levelLadder(r.levels, r.pct, r.level.code, r.nextLevel));
    p._body.appendChild(note1('读法 · HOW TO READ', r.summary.position.split('。')[0] + '。', r.summary.position.split('。').slice(1).join('。')));
    return p;
  }
  function pOverall2(r) {
    var p = page1('03 总体成熟度', r, 'overall');
    p._body.appendChild(bar1('03', '六维形状与同行参考带', 'RADAR & BENCHMARK', String(r.positions.above), '维高于参考带', true));
    p._body.appendChild(two1(
      card1('六维成熟度雷达', '灰色虚线区为同行参考带', [CH.radarPro(r.dimensions)], '参考带按「' + r.profile.industryName + ' × ' + r.profile.sizeName + '」分格，为估算值。', '#1157B5', '#8A54DC'),
      card1('六维得分与参考带对照', '横条为本企业，灰带为同行参考带，竖线为参考带中值', [CH.dimBullet(r.dimensions)], null, '#0FA3C7', '#0E9F6E')));
    p._body.appendChild(note1('六维结论 · DIMENSIONS', r.summary.dims.split('。')[0] + '。', r.summary.dims.split('。').slice(1).join('。')));
    return p;
  }
  function pOverall3(r) {
    var p = page1('03 总体成熟度', r, 'overall');
    p._body.appendChild(bar1('03', '同行位置与作答分布', 'DISTRIBUTION', r.percentile != null ? '超 ' + r.percentile + '%' : '—', '同行业同规模', true));
    if (r.distribution) {
      p._body.appendChild(card1('同行分布：超过 ' + r.percentile + '% 的' + r.profile.industryName + '同规模企业', '同行均值 ' + r.distribution.mean + '%，本企业 ' + r.pct + '%',
        [CH.distCurve(r.distribution.mean, r.distribution.sd, r.pct, r.percentile, r.profile.industryName)], '同行分布按参考带估算。', '#8A54DC', '#1157B5'));
    } else {
      p._body.appendChild(block1('同行位置 · BENCHMARK', '本行业参考带待补', '本次不给同行百分位。六维位置按绝对得分呈现，参考带补齐后可重新评估。', '#6B7A99'));
    }
    p._body.appendChild(two1(
      card1('六维得分仪表', '外圈灰弧为同行参考带区间', [CH.gauge6(r.dimensions)], null, '#0E9F6E', '#0FA3C7'),
      card1('36 题作答分布', '按维度分行，数字为该题得分', [CH.answerGrid(r.answers, r.dimensions)], '选 0 分的题共 ' + r.answerDistribution[0] + ' 道，选 3 分的共 ' + r.answerDistribution[3] + ' 道。', '#C9A227', '#FF8A3D')));
    return p;
  }

  // ==== 9-14 六维详解 ====
  function pDim(r, d, i) {
    var p = page1('04.' + (i + 1) + ' ' + d.name + '维度', r, 'dim');
    p._body.appendChild(h('div', { class: 'm1-bar', style: '--mc:' + d.color + ';--mc2:' + d.color }, [
      h('div', { class: 'no' }, ['0' + (4)]),
      h('div', {}, [h('div', { class: 't' }, [d.name + '维度']), h('div', { class: 'en' }, [d.desc])]),
      h('div', { class: 'rt' }, [h('div', { class: 'v num' }, [d.pct + '%']), h('div', { class: 'k' }, [d.score + ' / ' + d.max + ' 分 · ' + d.level.code + ' ' + d.level.name + ' · ' + (d.positionName || '参考带待补')])])
    ]));
    p._body.appendChild(stats1(d.subdims.map(function (sd) {
      return { k: sd.name, v: sd.score + '', u: '/ ' + sd.max, s: sd.bandName + ' · ' + sd.pct + '%', c: sd.band === 'high' ? '#0E9F6E' : sd.band === 'mid' ? '#1157B5' : '#E8A33D', c2: sd.band === 'high' ? '#0FA3C7' : sd.band === 'mid' ? '#0FA3C7' : '#FF8A3D' };
    }), 3));
    p._body.appendChild(two1(
      h('div', {}, [
        hh1('三个子维度的诊断', 'SUB-DIMENSIONS'),
        h('div', {}, d.subdims.map(function (sd) {
          return card1(sd.name + '　' + sd.score + ' / ' + sd.max, sd.desc, [
            h('div', { style: 'margin-bottom:5px' }, [pill1(sd.bandName, sd.band === 'high' ? 'ok' : sd.band === 'mid' ? 'mod' : 'warn')]),
            h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.68' }, [sd.diagnosis])
          ], null, sd.band === 'high' ? '#0E9F6E' : sd.band === 'mid' ? '#1157B5' : '#E8A33D');
        }))
      ]),
      h('div', {}, [
        hh1('本维度作答明细', 'ANSWERS'),
        tbl1([['题'], ['作答'], ['得分', 'c']], r.answers.filter(function (a) { return a.dimension === d.key; }).map(function (a) {
          return [{ el: h('span', { style: 'font-size:10.5px' }, [a.text]) }, { el: h('span', { style: 'font-size:10.5px;color:var(--r-navy);font-weight:700' }, [a.optionText]) }, { t: String(a.score), cls: 'c num b' }];
        })),
        hh1('本维度的两条建议', 'ACTIONS'),
        h('div', {}, d.recommendations.map(function (a) {
          return card1(a.title, a.owner + ' · ' + a.weeks + ' 周 · ' + a.cost + '投入', [
            h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.66' }, [a.why]),
            h('div', { style: 'font-size:10.5px;color:var(--r-sub);margin-top:5px' }, ['交付物：' + a.deliverable + '　验收：' + a.kpi])
          ], '对应服务 ' + a.service + '　可先试 ' + a.module, d.color, d.color);
        }))
      ]), 'wr'));
    p._body.appendChild(note1('本维度小结 · SUMMARY', null, d.summary));
    return p;
  }

  // ==== 15 优势与短板 ====
  function pStrength(r) {
    var p = page1('05 优势与短板', r, 'strength');
    p._body.appendChild(bar1('05', '优势与短板', 'STRENGTHS & GAPS', String(r.subdims.filter(function (x) { return x.band === 'low'; }).length), '项待加强 / 共 18 项'));
    p._body.appendChild(card1('十八项子维度分档', '每行一个维度，每维三项；色条长度为该项得分', [CH.subHeat(r.dimensions)], null, '#0E9F6E', '#0FA3C7'));
    p._body.appendChild(two1(
      h('div', {}, [hh1('已经建立的三项', 'TOP 3'), tbl1([['子维度'], ['维度'], ['得分', 'c']], r.strengths.map(function (k) {
        var sd = subOf(k); return [{ el: h('b', {}, [sd.name]) }, sd.dimensionName, { t: sd.score + ' / ' + sd.max, cls: 'c num b' }];
      }))]),
      h('div', {}, [hh1('需要优先加强的三项', 'BOTTOM 3'), tbl1([['子维度'], ['维度'], ['得分', 'c']], r.weaknesses.map(function (k) {
        var sd = subOf(k); return [{ el: h('b', {}, [sd.name]) }, sd.dimensionName, { t: sd.score + ' / ' + sd.max, cls: 'c num b' }];
      }))])));
    p._body.appendChild(note1('子维度结论 · SUB-DIMENSIONS', r.summary.subs.split('；')[0] + '。', r.summary.subs.split('；').slice(1).join('；')));
    return p;
  }

  // ==== 16 优先方向 ====
  function pDir(r) {
    var p = page1('06 AI 优先方向', r, 'dir');
    p._body.appendChild(bar1('06', 'AI 优先方向', 'PRIORITY DIRECTIONS', String(r.directions.filter(function (d) { return d.tag === '优先'; }).length), '维需优先补齐'));
    p._body.appendChild(card1('六维相对同行参考带中值的偏离', '向右为高于中值，向左为低于中值', [CH.dimDiverge(r.dimensions)], '偏离按百分点计；参考带缺失的维度按 0 处理。', '#8A54DC', '#1157B5'));
    var g = h('div', { class: 'm1-cards c3' });
    r.directions.forEach(function (d) {
      g.appendChild(card1(d.name, d.pct + '% · ' + d.positionName, [
        h('div', { style: 'margin-bottom:5px' }, [pill1(d.tag, d.tag === '优先' ? 'risk' : d.tag === '次批' ? 'warn' : 'ok')]),
        h('div', { style: 'font-size:10.5px;color:var(--r-body);line-height:1.66' }, [d.reason])
      ], null, d.color, d.color));
    });
    p._body.appendChild(g);
    return p;
  }

  // ==== 17 距下一级 ====
  function pGap(r) {
    var p = page1('07 距下一级的差距', r, 'gap');
    if (!r.gapPlan) {
      p._body.appendChild(bar1('07', '已处于最高等级', 'TOP LEVEL REACHED', r.pct + '%', r.level.code + ' ' + r.level.name));
      p._body.appendChild(block1('结论 · VERDICT', '六维均已达到经营级水平', r.level.desc, '#0E9F6E'));
      p._body.appendChild(hh1('保持与巩固', 'KEEP GOING'));
      p._body.appendChild(list1(r.directions.map(function (d) { return [d.name + '　', d.reason]; })));
      return p;
    }
    var gp = r.gapPlan;
    p._body.appendChild(bar1('07', '距 ' + gp.code + ' ' + gp.name + ' 级的差距', 'GAP TO NEXT LEVEL', '+' + gp.needPts, '分'));
    p._body.appendChild(stats1([
      { k: '当前总分', v: String(r.total), u: '/ ' + r.max, s: r.pct + '%', c: '#1157B5', c2: '#0FA3C7' },
      { k: '下一级门槛', v: gp.items[0].targetPct + '%', s: gp.code + ' ' + gp.name + ' 级', c: '#C9A227', c2: '#FF8A3D' },
      { k: '还差', v: '+' + gp.needPts, u: '分', s: '约 ' + gp.needPct + ' 个百分点', c: '#E0635C', c2: '#C4457E' },
      { k: '下一级重点', v: gp.focus, s: '升级方向', c: '#8A54DC', c2: '#C4457E' }
    ], 4));
    p._body.appendChild(card1('缺口分摊到六个维度', '橙色段为距门槛的差距，右侧为建议在本维再拿的分数', [CH.gapBars(gp)], gp.text, '#C9A227', '#E0635C'));
    p._body.appendChild(tbl1([['维度'], ['当前', 'c'], ['门槛', 'c'], ['差距', 'c'], ['建议补分', 'c'], ['说明']], gp.items.map(function (it) {
      return [{ el: h('b', { style: 'color:' + it.color }, [it.name]) },
        { t: it.pct + '%', cls: 'c num' }, { t: it.targetPct + '%', cls: 'c num' },
        { t: it.reached ? '—' : it.gapPct + ' pt', cls: 'c num' },
        { el: it.reached ? pill1('已达标', 'ok') : h('b', { class: 'num' }, ['+' + it.alloc]), cls: 'c' },
        { el: h('span', { style: 'font-size:10.5px' }, [it.note]) }];
    })));
    return p;
  }

  // ==== 18 推荐场景 ====
  function pScenes(r) {
    var p = page1('08 推荐场景', r, 'scene');
    p._body.appendChild(bar1('08', '推荐场景', 'RECOMMENDED SCENARIOS', String(r.scenes.length), '个场景'));
    p._body.appendChild(two1(
      card1('价值与难度矩阵', '越靠左上越该先做', [CH.matrix(r.scenes.map(function (s2) { return { name: s2.name, value: s2.value, difficulty: s2.difficulty, rank: s2.rank }; }))], null, '#0FA3C7', '#1157B5'),
      h('div', {}, [
        hh1('三个首选场景', 'TOP 3'),
        h('div', {}, r.scenes.slice(0, 3).map(function (s2) {
          return card1('No.' + s2.rank + '　' + s2.name, s2.stage + ' · ' + s2.module, [
            h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.66' }, [s2.desc]),
            h('div', { style: 'font-size:10.5px;color:var(--r-sub);margin-top:5px' }, ['第一步：' + s2.firstStep]),
            h('div', { style: 'font-size:10.5px;margin-top:4px' }, [pill1(s2.dataNote, s2.dataNote.indexOf('需先补齐') === 0 ? 'warn' : 'ok')])
          ], null, '#0FA3C7', '#1157B5');
        }))
      ]), 'wl'));
    p._body.appendChild(tbl1([['排名', 'c'], ['场景'], ['环节'], ['价值', 'c'], ['难度', 'c'], ['数据条件'], ['对应模块']], r.scenes.map(function (s2) {
      return [{ t: String(s2.rank), cls: 'c num' }, { el: h('b', {}, [s2.name]) }, s2.stage,
        { t: String(s2.value), cls: 'c num' }, { t: String(s2.difficulty), cls: 'c num' },
        { el: pill1(s2.dataNote, s2.dataNote.indexOf('需先补齐') === 0 ? 'warn' : 'ok') },
        { el: pill1(s2.module, 'mod') }];
    })));
    return p;
  }

  // ==== 19-20 路线图 ====
  function pPlan1(r) {
    var p = page1('09 升级路线图', r, 'plan');
    p._body.appendChild(bar1('09', '升级路线图', '12-MONTH ROADMAP', String(r.actions.length), '项行动 · 三阶段'));
    p._body.appendChild(card1('三阶段九项行动', '每阶段的行动按维度分色，卡内为负责人、周期与投入', [CH.actionFlow(r.roadmap, r.actions)], null, '#0E9F6E', '#C9A227'));
    var g = h('div', { class: 'm1-cards c3' });
    var PC = [['#0E9F6E', '#0FA3C7'], ['#1157B5', '#00C2F0'], ['#8A54DC', '#C4457E']];
    r.roadmap.forEach(function (ph, i) {
      g.appendChild(card1(ph.name + ' · ' + ph.title, '第 ' + ph.months[0] + '–' + ph.months[1] + ' 个月', [
        tbl1([['行动'], ['维度', 'c nw']], r.actions.filter(function (a) { return a.phase === ph.key; }).map(function (a) {
          return [{ el: h('b', {}, [a.order + '. ' + a.title]) }, { el: h('span', { style: 'color:' + a.color + ';font-weight:700' }, [a.dimensionName]), cls: 'c nw' }];
        }))
      ], '里程碑：' + ph.milestone, PC[i][0], PC[i][1]));
    });
    p._body.appendChild(g);
    return p;
  }
  function pPlan2(r) {
    var p = page1('09 升级路线图', r, 'plan');
    p._body.appendChild(bar1('09', '九项行动明细', 'ACTION DETAIL', String(r.actions.length), '项', true));
    p._body.appendChild(tbl1([['#', 'c'], ['阶段'], ['维度', 'c'], ['行动'], ['负责人'], ['交付物'], ['周期', 'c'], ['验收']], r.actions.map(function (a) {
      return [{ t: String(a.order), cls: 'c num' }, { t: a.phaseName, cls: 'k' },
        { el: h('span', { style: 'color:' + a.color + ';font-weight:800' }, [a.dimensionName]), cls: 'c' },
        { el: h('span', {}, [h('b', {}, [a.title]), h('div', { style: 'font-size:10px;color:var(--r-sub)' }, [a.why])]) },
        a.owner, a.deliverable, { t: a.weeks + ' 周', cls: 'c' }, a.kpi];
    })));
    return p;
  }

  // ==== 21 投入 ====
  function pInvest(r) {
    var p = page1('10 投入与回报', r, 'invest');
    p._body.appendChild(bar1('10', '投入与回报', 'INVESTMENT', r.investment.range, r.investment.name));
    var g = h('div', { class: 'm1-cards c4' });
    var TC = [['#919FB7', '#6B7A99'], ['#0E9F6E', '#0FA3C7'], ['#1157B5', '#00C2F0'], ['#8A54DC', '#C4457E']];
    r.investment.tiers.forEach(function (t, i) {
      g.appendChild(card1(t.name + (t.key === r.investment.tier ? '　★' : ''), t.range, [
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.65' }, [t.desc]),
        h('div', { style: 'font-size:10px;color:var(--r-sub);margin-top:6px' }, ['适合：' + t.fit])
      ], t.key === r.investment.tier ? '本次建议' : null, TC[i][0], TC[i][1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(note1('为什么是这一档 · RATIONALE', r.investment.name + ' · ' + r.investment.range, r.investment.rationale));
    p._body.appendChild(hh1('相关服务', 'SERVICES'));
    p._body.appendChild(tbl1([['服务'], ['价格'], ['说明']], RT().services.map(function (sv) {
      return [{ el: h('b', {}, [sv.name]) }, { el: h('b', { class: 'num', style: 'color:var(--r-blue)' }, [sv.price]) }, sv.desc];
    })));
    p._body.appendChild(h('div', { style: 'font-size:10px;color:var(--r-sub);margin-top:8px' }, [r.investment.note]));
    return p;
  }

  // ==== 22 风险 ====
  function pRisks(r) {
    var p = page1('11 风险与合规', r, 'risk');
    p._body.appendChild(bar1('11', '风险与合规', 'RISK & COMPLIANCE', String(r.risks.length), '条提示'));
    var g = h('div', { class: 'm1-cards c2' });
    var LC = { '高': ['#E0635C', '#C4457E'], '中': ['#C9A227', '#FF8A3D'], '提示': ['#919FB7', '#6B7A99'] };
    r.risks.forEach(function (x) {
      g.appendChild(card1(x.title, null, [
        h('div', { style: 'margin-bottom:6px' }, [pill1(x.level + '级', x.level === '高' ? 'risk' : x.level === '中' ? 'warn' : 'dim')]),
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.68' }, [x.text])
      ], null, LC[x.level][0], LC[x.level][1]));
    });
    p._body.appendChild(g);
    p._body.appendChild(hh1('角色分工', 'WHO DOES WHAT'));
    p._body.appendChild(tbl1([['角色'], ['由谁担任'], ['职责'], ['投入', 'c']], (r.roles || []).map(function (x) {
      return [{ el: h('b', {}, [x.name]) }, x.who, x.duty, { t: x.time, cls: 'c' }];
    })));
    return p;
  }

  // ==== 23 90 天清单 ====
  function pChecklist(r) {
    var p = page1('12 90 天行动清单', r, 'check');
    p._body.appendChild(bar1('12', '90 天行动清单', 'FIRST 90 DAYS', String(r.checklist.length), '项执行动作'));
    p._body.appendChild(tbl1([['✓', 'c'], ['时间'], ['要做的事'], ['维度', 'c'], ['负责人']], r.checklist.map(function (c) {
      return [{ el: h('span', { style: 'display:inline-block;width:13px;height:13px;border:1.5px solid var(--r-line);border-radius:3px' }), cls: 'c' },
        { t: c.week, cls: 'k' }, { el: h('b', {}, [c.item]) },
        { el: h('span', { style: 'color:' + c.color + ';font-weight:700' }, [c.dimensionName]), cls: 'c' }, c.owner];
    })));
    p._body.appendChild(two1(
      block1('验收 · ACCEPTANCE', r.actions[0].title, r.actions[0].kpi + '。完成后对比使用前后的数据，确认后再推第二阶段。', '#1157B5'),
      h('div', {}, [hh1('推进节奏建议', 'CADENCE'), list1([
        ['每周固定半天，', '由业务对接人牵头推进，避免被日常事务挤掉。'],
        ['每月一次复盘，', '牵头人看一次进展与指标变化，决定是否进入下一阶段。'],
        ['同时只推一件事，', '第一件跑通之后再并行，避免进度都停在半途。']
      ])]), 'wl'));
    return p;
  }

  // ==== 24 何时重评 ====
  function pAgain(r) {
    var p = page1('13 何时重评', r, 'again');
    p._body.appendChild(bar1('13', '何时重新评一次', 'WHEN TO RE-ASSESS', String((r.retrigger || []).length), '种情况'));
    var g = h('div', { class: 'm1-cards c2' });
    (r.retrigger || []).forEach(function (x) {
      g.appendChild(card1(x.when, null, [
        h('div', { style: 'font-size:11px;color:var(--r-body);line-height:1.68' }, [x.why]),
        x.extra ? h('div', { style: 'font-size:10.5px;color:var(--r-navy);font-weight:700;margin-top:6px' }, [x.extra]) : null
      ], null, '#6B7A99', '#919FB7'));
    });
    p._body.appendChild(g);
    p._body.appendChild(note1('复盘用法 · HOW TO REVIEW', '同样的 36 题，同样的口径', '重新作答后与本次逐维对比，能看出哪几维真的动了、哪几维还停在原地。评分为确定性计算，同样的输入会得到同样的结果。'));
    return p;
  }

  // ==== 25-26 附录 A ====
  function pAppA(r, part) {
    var p = page1('附录 A 评分明细', r, 'app');
    if (!part) p._body.appendChild(bar1('A', '36 题作答与得分', 'ANSWER DETAIL', String(r.total), '/ ' + r.max + ' 分', true));
    else p._body.appendChild(bar1('A', '36 题作答与得分（续）', 'ANSWER DETAIL', '', '', true));
    var half = Math.ceil(r.answers.length / 2);
    var list = part ? r.answers.slice(half) : r.answers.slice(0, half);
    p._body.appendChild(tbl1([['#', 'c'], ['维度', 'c'], ['子维度'], ['题目'], ['作答'], ['得分', 'c']], list.map(function (a) {
      var dm = dimOf(a.dimension), sd = subOf(a.sub);
      return [{ t: a.id.replace('q', ''), cls: 'c num' },
        { el: h('span', { style: 'color:' + dm.color + ';font-weight:800' }, [dm.name]), cls: 'c' },
        { t: sd.name, cls: 'k' },
        { el: h('span', { style: 'font-size:10.5px' }, [a.text]) },
        { el: h('span', { style: 'font-size:10.5px;color:var(--r-navy);font-weight:700' }, [a.optionText]) },
        { t: String(a.score), cls: 'c num b' }];
    })));
    return p;
  }
  function pAppB(r) {
    var p = page1('附录 B 方法与来源', r, 'app');
    p._body.appendChild(bar1('B', '方法、术语与信息来源', 'METHOD & SOURCES', '', '', true));
    p._body.appendChild(two1(
      h('div', {}, [hh1('术语', 'GLOSSARY'), tbl1([['术语'], ['说明']], RT().glossary.map(function (g) { return [{ el: h('b', {}, [g.term]) }, g.desc]; }))]),
      h('div', {}, [hh1('信息来源与置信度', 'SOURCE & CONFIDENCE'), tbl1([['内容'], ['来源'], ['置信度', 'c']], [
        ['企业画像 13 项', '本次填写', { el: pill1('填报', 'ok'), cls: 'c' }],
        ['36 题作答', '本次作答', { el: pill1('填报', 'ok'), cls: 'c' }],
        ['等级与子维度诊断', '按题库口径计算', { el: pill1('可复算', 'ok'), cls: 'c' }],
        ['同行参考带与百分位', '按行业规模分格估算', { el: pill1('经验估算', 'warn'), cls: 'c' }],
        ['行动建议与交付物', '行动库预设值', { el: pill1('经验估算', 'warn'), cls: 'c' }],
        ['投入区间', '同类项目常见报价', { el: pill1('经验估算', 'warn'), cls: 'c' }]
      ])]), 'wl'));
    p._body.appendChild(hh1('计分口径', 'SCORING'));
    p._body.appendChild(list1(Object.keys(RT().method).map(function (k) { return RT().method[k]; }).filter(Boolean).map(function (t) { var i = t.indexOf('。'); return i > 0 ? [t.slice(0, i + 1), t.slice(i + 1)] : [t, '']; })));
    p._body.appendChild(note1('复算方式 · REPRODUCIBLE', '同样的作答会得到同样的结论', '六维得分、等级与建议均为确定性计算。补齐数据、完成改进动作后重新作答，即可看到等级与六维形状的变化。'));
    return p;
  }

  // ==== 28 封底 ====
  function pEnd(r) {
    var p = page1(null, r, 'app', 'm1-end');
    p._body.appendChild(h('img', { src: sh.CFG.logo, alt: '顶呱呱' }));
    p._body.appendChild(h('div', { class: 'slogan' }, [RT().contact.tagline]));
    p._body.appendChild(h('div', { class: 'contact' }, [
      h('div', {}, [RT().contact.company + '　·　薯片AI智能体']),
      h('div', {}, ['平台 ' + RT().contact.platform + '　展位号 ' + RT().contact.booth]),
      h('div', {}, [RT().contact.address]),
      h('div', {}, ['联系电话 ' + RT().contact.phone]),
      h('div', {}, ['服务城市 ' + RT().contact.cities])
    ]));
    p._body.appendChild(h('div', { class: 'rule' }));
    p._body.appendChild(h('div', { class: 'disc' }, [RT().closing]));
    return p;
  }

  DGG.registerModule('m1', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
