/* 模块 1 · 企业AI成熟度评估 v2 —— 三屏：企业画像（13 项）→ 36 题 → 完整报告（30 页）
 * 全部数字与文案来自 DGG.maturity.compute()（与 skill 同一份内核）；本文件只负责呈现与交互。
 */
(function () {
  'use strict';
  var core = DGG.maturity, CH = DGG.charts;
  var sh, h, DATA, $root;
  var M = { step: 'input', form: null, answers: [], q: 0, result: null, llmState: 'none', pages: [], toc: [] };
  var STATUS_CLS = { low: 'risk', mid: 'warn', high: 'ok' };
  var STATUS_COLOR = { low: 'var(--risk)', mid: 'var(--warn)', high: 'var(--ok)' };

  function bundle() {
    return { fields: DATA.fields, provinces: DATA.provinces, industries: DATA.industries, dimensions: DATA.m1.dimensions, questions: DATA.m1.questions, levels: DATA.m1.levels,
      diagnostics: DATA.m1.diagnostics, benchmark: DATA.m1.benchmark, actions: DATA.m1.actions, scenes: DATA.m1.scenes, risks: DATA.m1.risks, reportText: DATA.m1.reportText, promptTemplate: DATA.m1.promptTemplate };
  }
  function field(key) { return DATA.fields.filter(function (f) { return f.key === key; })[0]; }
  function optText(key, v) { var f = field(key); var o = f && f.options ? f.options.filter(function (x) { return x.v === v; })[0] : null; return o ? o.t : (v || ''); }
  function sectorOf(slug) { var r = null; DATA.industries.sectors.forEach(function (s) { s.industries.forEach(function (i) { if (i.slug === slug) r = s; }); }); return r; }
  function emptyForm() {
    return { name: '', industry: sh.displayIndustryDefault() || 'mfg-machinery', size: null, revenue: null, province: '浙江', years: null, ownership: 'private', customers: null, systems: [], itStaff: null, branches: 'single', overseas: 'no', role: 'owner' };
  }
  function fromProfile(p) { var f = emptyForm(); Object.keys(f).forEach(function (k) { if (p[k] != null) f[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; }); return f; }
  function formReady() {
    return DATA.fields.every(function (f) { if (!f.required) return true; var v = M.form[f.key]; return f.type === 'multi' ? (Array.isArray(v) && v.length > 0) : !!v; });
  }
  function requiredCount() { var t = 0, d = 0; DATA.fields.forEach(function (f) { if (!f.required) return; t++; var v = M.form[f.key]; if (f.type === 'multi' ? (v && v.length) : v) d++; }); return [d, t]; }

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
      if (fd.type === 'text') {
        var inp = h('input', { type: 'text', value: f.name, placeholder: fd.placeholder || '', maxlength: '40', oninput: function () { f.name = inp.value; } }); ctrl = inp;
      } else if (fd.type === 'industry') {
        cls = 'span2';
        var sec = sectorOf(f.industry) || DATA.industries.sectors[0];
        var box = h('div');
        box.appendChild(h('div', { class: 'chips sm sector-row' }, DATA.industries.sectors.map(function (s) {
          return h('button', { class: 'chip' + (s.key === sec.key ? ' on' : ''), onclick: function () { f.industry = s.industries[0].slug; draw(); } }, [s.name]);
        })));
        box.appendChild(h('div', { class: 'chips' }, sec.industries.map(function (i) {
          return h('button', { class: 'chip' + (i.slug === f.industry ? ' on' : ''), onclick: function () { f.industry = i.slug; draw(); } }, [i.name]);
        })));
        ctrl = box;
      } else if (fd.type === 'select') {
        var sel = h('select', { onchange: function () { f.province = sel.value; } });
        DATA.provinces.forEach(function (p) { sel.appendChild(h('option', { value: p, selected: p === f.province }, [p])); }); ctrl = sel;
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
      grid.appendChild(h('div', { class: 'field ' + cls }, [h('label', {}, [fd.label, fd.required ? h('span', { class: 'req' }, ['*']) : null, fd.hint ? h('span', { class: 'hint' }, [fd.hint]) : null]), ctrl]));
    });
    $root.appendChild(grid);
    var rc = requiredCount();
    $root.appendChild(h('div', { class: 'actions-bar form-status' }, [
      h('button', { class: 'btn primary big', disabled: !formReady(), onclick: function () {
        sh.setCompany(JSON.parse(JSON.stringify(f)));
        M.answers = []; M.q = 0; M.result = null; M.llmState = 'none'; sh.setQrReady(false);
        setStep('quiz');
      } }, ['开始评估']),
      h('span', { class: 'cnt' }, ['必填 ', h('b', { class: 'num' }, [rc[0] + ' / ' + rc[1]]), ' 项 · 36 题约 5 分钟'])
    ]));
  }

  // ---------- 屏 2 · 36 题 ----------
  function drawQuiz() {
    var qs = DATA.m1.questions, i = M.q, q = qs[i];
    var dim = DATA.m1.dimensions.filter(function (d) { return d.key === q.dimension; })[0];
    var sub = dim.subdims.filter(function (s) { return s.key === q.sub; })[0];
    var box = h('div', { class: 'quiz' });
    var seg = h('div', { class: 'seg-progress' });
    DATA.m1.dimensions.forEach(function (d) {
      var s = h('div', { class: 'seg', style: '--seg-color:' + d.color });
      qs.forEach(function (x, k) { if (x.dimension === d.key) s.appendChild(h('i', { class: M.answers[k] != null ? 'on' : '' })); });
      seg.appendChild(s);
    });
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
    var last = M.q === DATA.m1.questions.length - 1;
    var btns = $root.querySelectorAll('.opt'); btns.forEach(function (b) { b.classList.remove('on'); }); btns[k].classList.add('on');
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
      var merged = core.mergePolish(r, res.text, sh.lint.hit);
      var changed = merged.actions.some(function (a) { return a.source === 'llm'; });
      M.llmState = changed ? 'ok' : 'failed'; if (changed) M.result = merged;
      if (M.step === 'result') draw();
    });
  }

  // ---------- 屏 3 · 报告 ----------
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function reportNo(r) { var s = 0; for (var i = 0; i < r.profile.name.length; i++) s = (s * 31 + r.profile.name.charCodeAt(i)) % 100000; return 'DGG-' + today().replace(/-/g, '') + '-' + ('00000' + s).slice(-5); }
  function dimOf(key) { return M.result.dimensions.filter(function (d) { return d.key === key; })[0]; }
  function subOf(key) { return M.result.subdims.filter(function (s) { return s.key === key; })[0]; }
  function tag(text, cls, style) { return h('span', { class: 'tag ' + (cls || ''), style: style || '' }, [text]); }
  function printBrief() { document.body.classList.add('print-brief'); var off = function () { document.body.classList.remove('print-brief'); window.removeEventListener('afterprint', off); }; window.addEventListener('afterprint', off); sh.print(); }

  function drawReport() {
    var r = M.result;
    M.pages = []; M.toc = [];
    $root.appendChild(h('div', { class: 'report-bar' }, [
      h('button', { class: 'btn primary big', onclick: printBrief }, ['打印速览']),
      h('button', { class: 'btn big', onclick: sh.print }, ['打印完整报告']),
      h('button', { class: 'btn big', onclick: sh.showWeChat }, ['发送到微信']),
      h('span', { class: 'spacer' }),
      h('span', { class: 'pages-count', id: 'pages-count' }),
      h('button', { class: 'btn ghost', onclick: function () { M.answers = []; M.q = 0; M.result = null; sh.setQrReady(false); setStep('input'); } }, [sh.station() === '1' ? '下一位' : '重新评估'])
    ]));
    var wrap = h('div', { class: 'report' }), toc = h('nav', { class: 'toc' }), pages = h('div', { class: 'pages' });
    // ---- 组页 ----
    add('封面', pCover(r), { brief: true, chapter: '' });
    add('目录', pToc(r), { chapter: '目录' });
    add('1 执行摘要', pSummary1(r), { brief: true, chapter: '1 执行摘要' });
    add('', pSummary2(r), { brief: true, chapter: '1 执行摘要', sub: '结论与三件事' });
    add('2 企业画像', pProfile(r), { chapter: '2 企业画像' });
    add('3 评估方法', pMethod(r), { chapter: '3 评估方法' });
    add('4 总体成熟度', pOverall1(r), { chapter: '4 总体成熟度' });
    add('', pOverall2(r), { chapter: '4 总体成熟度', sub: '六维对比' });
    r.dimensions.forEach(function (d, i) {
      add('5.' + (i + 1) + ' ' + d.name + '维度', pDimA(r, d, i), { chapter: '5.' + (i + 1) + ' ' + d.name + '维度' });
      add('', pDimB(r, d, i), { chapter: '5.' + (i + 1) + ' ' + d.name + '维度', sub: '作答明细与建议' });
    });
    add('6 优势与短板', pRanked(r), { chapter: '6 优势与短板' });
    add('7 升级路线图', pRoadmap1(r), { brief: true, chapter: '7 升级路线图' });
    add('', pRoadmap2(r), { chapter: '7 升级路线图', sub: '第 1–6 个月行动' });
    add('', pRoadmap3(r), { chapter: '7 升级路线图', sub: '第 7–12 个月行动' });
    add('8 场景推荐', pScenes(r), { chapter: '8 场景推荐' });
    add('9 投入与回报', pInvestment(r), { chapter: '9 投入与回报框架' });
    add('10 风险与合规', pRisks(r), { chapter: '10 风险与合规提示' });
    add('11 90 天行动清单', pChecklist(r), { chapter: '11 90 天行动清单' });
    add('附录 A 评分明细', pAppendixA(r), { chapter: '附录 A 评分明细' });
    add('附录 B 术语与服务', pAppendixB(r), { chapter: '附录 B 术语与服务' });
    add('封底', pBack(r), { chapter: '' });
    // ---- 编号与目录 ----
    M.pages.forEach(function (pg, i) {
      pg.el.setAttribute('data-page', String(i + 1)); if (pg.brief) pg.el.classList.add('brief');
      if (i > 0 && i < M.pages.length - 1) pg.el.appendChild(h('div', { class: 'page-foot' }, [h('span', {}, [r.profile.name + ' · ' + DATA.m1.reportText.reportTitle]), h('span', { class: 'num' }, ['第 ' + (i + 1) + ' 页 / 共 ' + M.pages.length + ' 页'])]));
      pages.appendChild(pg.el);
    });
    toc.appendChild(h('h4', {}, ['目录']));
    M.pages.forEach(function (pg, i) {
      if (!pg.title && !pg.sub) return;
      toc.appendChild(h('button', { class: pg.sub ? 'sub' : '', onclick: function () { pg.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); toc.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); }); } }, [h('span', {}, [pg.title || pg.sub]), h('span', { class: 'pn num' }, [String(i + 1)])]));
    });
    wrap.appendChild(toc); wrap.appendChild(pages); $root.appendChild(wrap);
    document.getElementById('pages-count').textContent = '共 ' + M.pages.length + ' 页';
    function add(title, el, o) { M.pages.push({ title: title, sub: o.sub, el: el, brief: !!o.brief }); }
  }
  function page(chapter, r, cls) {
    var p = h('section', { class: 'page ' + (cls || '') });
    if (chapter) p.appendChild(h('div', { class: 'page-head' }, [h('span', { class: 'ch' }, [chapter]), h('span', { class: 'rt' }, [DATA.m1.reportText.reportTitle + ' · ' + r.profile.name])]));
    var body = h('div', { class: 'page-body' }); p.appendChild(body); p._body = body; return p;
  }

  // ---- 封面 ----
  function pCover(r) {
    var p = page('', r, 'cover');
    p._body.appendChild(h('div', { class: 'top' }, [h('img', { src: sh.CFG.logo, alt: '顶呱呱' }), h('span', { class: 'iss' }, [DATA.m1.reportText.issuer])]));
    p._body.appendChild(h('div', { class: 'mid' }, [
      h('div', { class: 'rep-title' }, [DATA.m1.reportText.reportTitle]),
      h('div', { class: 'co' }, [r.profile.name]),
      h('div', {}, r.profile.tags.map(function (t) { return tag(t); })),
      h('div', { class: 'lv' }, [
        h('div', { class: 'badge' }, [h('div', { class: 'code' }, [r.level.code]), h('div', { class: 'lname' }, [r.level.name])]),
        h('div', { class: 'txt' }, [h('div', { class: 'big num' }, [r.pct + '%', h('small', {}, [' 综合得分 ' + r.total + ' / ' + r.max])]), h('div', {}, [r.level.verdict]), r.percentile != null ? h('div', { class: 'muted' }, ['同行位置：超过 ' + r.percentile + '% 的' + r.profile.industryName + '同规模企业']) : null])
      ])
    ]));
    p._body.appendChild(h('div', { class: 'bot' }, [h('span', {}, ['评估编号 ' + reportNo(r)]), h('span', { class: 'num' }, ['评估日期 ' + today()]), h('span', {}, ['共 36 题 · 六维十八项'])]));
    return p;
  }
  // ---- 目录 ----
  function pToc(r) {
    var p = page('目录', r);
    var ul = h('ul', { class: 'toc-list', id: 'toc-list' });
    p._body.appendChild(h('h2', {}, ['目录']));
    p._body.appendChild(ul);
    setTimeout(function () {
      M.pages.forEach(function (pg, i) { if (!pg.title && !pg.sub) return; ul.appendChild(h('li', { class: pg.sub ? 'sub' : '' }, [h('span', { class: 't' }, [pg.title || pg.sub]), h('span', { class: 'dots' }), h('span', { class: 'pn' }, [String(i + 1)])])); });
    }, 0);
    p._body.appendChild(h('div', { class: 'guide' }, [h('b', {}, ['阅读说明']), h('ol', {}, DATA.m1.reportText.readingGuide.map(function (g) { return h('li', {}, [g]); }))]));
    return p;
  }
  // ---- 执行摘要 ----
  function pSummary1(r) {
    var p = page('1 执行摘要', r);
    p._body.appendChild(h('h2', {}, ['执行摘要']));
    p._body.appendChild(h('div', { class: 'tiles' }, r.keyNumbers.map(function (k) { return h('div', { class: 'tile' }, [h('div', { class: 'k' }, [k.k]), h('div', { class: 'v num' }, [k.v]), h('div', { class: 's' }, [k.sub])]); })));
    var radar = CH.radar(r.dimensions.map(function (d) { return { name: d.name, pct: d.pct, band: d.band, color: d.color }; }));
    p._body.appendChild(h('div', { class: 'two' }, [
      h('div', {}, [h('h3', {}, ['六维成熟度']), radar, h('div', { class: 'legend' }, [h('span', {}, [h('i', { class: 's1' }), r.profile.name]), r.benchmark.basis !== 'none' ? h('span', {}, [h('i', { class: 's2' }), '同行参考带']) : null])]),
      h('div', { class: 'level-card' }, [h('h3', {}, ['成熟度等级']),
        h('div', { class: 'badge' }, [h('div', { class: 'code' }, [r.level.code]), h('div', { class: 'lname' }, [r.level.name])]),
        h('div', { class: 'total num' }, [r.pct + '%', h('small', {}, [' · ' + r.total + ' / ' + r.max])]),
        h('div', { class: 'verdict' }, [r.level.verdict]),
        r.nextLevel ? h('div', { class: 'next' }, ['距 ', h('b', {}, [r.nextLevel.code + ' ' + r.nextLevel.name]), ' 还差 ', h('b', { class: 'num' }, [String(r.nextLevel.gapPts)]), ' 分 · 阶段重点：' + r.nextLevel.focus]) : h('div', { class: 'next' }, ['已处于最高等级']),
        h('p', { class: 'muted', style: 'margin-top:10px;text-align:left' }, [r.level.desc])])
    ]));
    return p;
  }
  function pSummary2(r) {
    var p = page('1 执行摘要 · 结论与三件事', r);
    p._body.appendChild(h('h3', {}, ['总体判断']));
    p._body.appendChild(h('p', { class: 'lead' }, [r.summary.position]));
    p._body.appendChild(h('p', {}, [r.summary.dims]));
    p._body.appendChild(h('p', {}, [r.summary.subs]));
    p._body.appendChild(h('p', {}, [r.summary.next]));
    p._body.appendChild(h('div', { class: 'sw' }, [
      h('div', { class: 'col' }, [h('h3', {}, ['已建立的优势']), h('div', {}, r.strengths.map(function (k) { var s = subOf(k); return h('div', { class: 'item', style: 'border-color:' + STATUS_COLOR.high }, [h('div', { class: 'n' }, [s.name, h('span', {}, [s.dimensionName + ' · ' + s.score + '/' + s.max])]), h('div', { class: 'd' }, [s.diagnosis])]); }))]),
      h('div', { class: 'col' }, [h('h3', {}, ['需要优先加强']), h('div', {}, r.weaknesses.map(function (k) { var s = subOf(k); return h('div', { class: 'item', style: 'border-color:' + STATUS_COLOR.low }, [h('div', { class: 'n' }, [s.name, h('span', {}, [s.dimensionName + ' · ' + s.score + '/' + s.max])]), h('div', { class: 'd' }, [s.diagnosis])]); }))])
    ]));
    p._body.appendChild(h('h3', {}, ['未来三个月的三件事']));
    p._body.appendChild(h('div', { class: 'acts-mini' }, r.actions.slice(0, 3).map(function (a) { return actCard(a, true); })));
    return p;
  }
  function actCard(a, mini) {
    return h('div', { class: 'act-card' }, [
      h('div', { class: 'hd' }, [h('span', { class: 'n num', style: 'background:' + a.color }, [String(a.order)]), h('span', { class: 't' }, [a.title]), M.llmState === 'failed' && a.order <= 3 ? tag('初稿', 'warn') : null]),
      h('div', { class: 'why' }, [tag(a.dimensionName, 'dim', 'background:' + a.color), a.why]),
      mini ? null : h('ol', {}, a.steps.map(function (s) { return h('li', {}, [s]); })),
      h('div', { class: 'meta' }, [h('span', {}, ['负责人 ', h('b', {}, [a.owner])]), h('span', {}, ['周期 ', h('b', { class: 'num' }, [a.weeks + ' 周'])]), h('span', {}, ['投入 ', h('b', {}, [a.cost])]), mini ? null : h('span', {}, ['交付物 ', h('b', {}, [a.deliverable])]), mini ? null : h('span', {}, ['验收 ', h('b', {}, [a.kpi])])]),
      h('div', { class: 'foot' }, ['对应服务 ', h('b', {}, [a.service]), '　可先试 ', h('b', {}, [a.module])])
    ]);
  }
  // ---- 企业画像 ----
  function pProfile(r) {
    var p = page('2 企业画像', r), pf = r.profile;
    p._body.appendChild(h('h2', {}, ['企业画像']));
    p._body.appendChild(h('p', { class: 'lead' }, [pf.portrait]));
    p._body.appendChild(h('div', {}, pf.tags.map(function (t) { return tag(t); })));
    var rows = [['企业名称', pf.name], ['所属行业', pf.sectorName + ' · ' + pf.industryName], ['人员规模', pf.sizeName], ['上年营收', pf.revenueName], ['所在地', pf.province], ['成立年限', pf.yearsName], ['企业性质', pf.ownershipName], ['主要客户', pf.customersName], ['现有系统', pf.systemsName.join('、')], ['数字化专职', pf.itStaffName], ['分支机构', pf.branchesName || '—'], ['海外业务', pf.overseasName], ['填表人', pf.roleName || '—']];
    var t = h('table', { class: 'tbl' }); var half = Math.ceil(rows.length / 2);
    for (var i = 0; i < half; i++) { var a = rows[i], b = rows[i + half]; t.appendChild(h('tr', {}, [h('td', { style: 'color:var(--text-sub);width:14%' }, [a[0]]), h('td', { style: 'width:36%;font-weight:600' }, [a[1]]), h('td', { style: 'color:var(--text-sub);width:14%' }, [b ? b[0] : '']), h('td', { style: 'font-weight:600' }, [b ? b[1] : ''])])); }
    p._body.appendChild(h('h3', {}, ['基本信息'])); p._body.appendChild(t);
    p._body.appendChild(h('h3', {}, ['行业视角 · ' + r.sectorInsight.name]));
    p._body.appendChild(h('p', {}, [r.sectorInsight.insight]));
    p._body.appendChild(h('div', {}, [h('span', { class: 'muted' }, ['该行业常见切入点：'])].concat(r.sectorInsight.aiFocus.map(function (t) { return tag(t); }))));
    return p;
  }
  // ---- 评估方法 ----
  function pMethod(r) {
    var p = page('3 评估方法', r), rt = DATA.m1.reportText.method;
    p._body.appendChild(h('h2', {}, ['评估方法']));
    p._body.appendChild(h('p', {}, [rt.model]));
    p._body.appendChild(h('div', { class: 'model' }, DATA.m1.dimensions.map(function (d) { return h('div', { class: 'col' }, [h('div', { class: 'h', style: 'background:' + d.color }, [d.name])].concat(d.subdims.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s.name]), s.desc]); }))); })));
    p._body.appendChild(h('h3', {}, ['评分规则'])); p._body.appendChild(h('p', {}, [rt.scoring]));
    p._body.appendChild(h('h3', {}, ['等级定义'])); p._body.appendChild(h('p', {}, [rt.levels]));
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['等级']), h('th', {}, ['得分区间']), h('th', {}, ['一句判断']), h('th', {}, ['阶段重点'])])]);
    DATA.m1.levels.forEach(function (l, i) { var nx = DATA.m1.levels[i + 1]; t.appendChild(h('tr', { style: l.code === r.level.code ? 'background:rgba(73,116,246,.08);font-weight:700' : '' }, [h('td', {}, [l.code + ' ' + l.name]), h('td', { class: 'num' }, [l.minPct + '% – ' + (nx ? (nx.minPct - 0.1).toFixed(1) : '100') + '%']), h('td', {}, [l.verdict]), h('td', {}, [l.focus])])); });
    p._body.appendChild(t);
    p._body.appendChild(h('h3', {}, ['同行参考带'])); p._body.appendChild(h('p', {}, [rt.benchmark]));
    p._body.appendChild(h('h3', {}, ['升级行动'])); p._body.appendChild(h('p', {}, [rt.actions]));
    return p;
  }
  // ---- 总体成熟度 ----
  function pOverall1(r) {
    var p = page('4 总体成熟度', r);
    p._body.appendChild(h('h2', {}, ['总体成熟度']));
    p._body.appendChild(h('h3', {}, ['等级刻度'])); p._body.appendChild(CH.levelScale(r.levels, r.pct, r.level.code));
    p._body.appendChild(h('p', {}, [r.level.desc]));
    p._body.appendChild(h('div', {}, [h('span', { class: 'muted' }, ['本级典型特征：'])].concat(r.level.traits.map(function (t) { return tag(t); }))));
    p._body.appendChild(h('h3', {}, ['总分分解'])); p._body.appendChild(CH.stackBar(r.dimensions.map(function (d) { return { name: d.name, v: d.score, max: d.max, color: d.color }; })));
    if (r.distribution) {
      p._body.appendChild(h('h3', {}, ['同行分布'])); p._body.appendChild(CH.bell(r.distribution.mean, r.distribution.sd, r.pct, r.percentile));
      p._body.appendChild(h('p', { class: 'chart-note' }, ['同行分布按' + r.profile.industryName + '、' + r.profile.sizeName + '企业的参考带估算；曲线下阴影为得分低于本企业的同行比例。']));
    }
    return p;
  }
  function pOverall2(r) {
    var p = page('4 总体成熟度 · 六维对比', r);
    p._body.appendChild(h('h3', {}, ['六维得分与同行参考带中值']));
    p._body.appendChild(CH.hbars(r.dimensions.map(function (d) { return { name: d.name, color: d.color, values: [{ label: '本企业', v: d.pct }, { label: '同行参考带中值', v: d.bandMid != null ? d.bandMid : 0 }] }; })));
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['维度']), h('th', { class: 'r' }, ['得分']), h('th', { class: 'r' }, ['百分比']), h('th', {}, ['同行参考带']), h('th', {}, ['位置']), h('th', {}, ['维度等级']), h('th', {}, ['最需要补'])])]);
    r.dimensions.forEach(function (d) { t.appendChild(h('tr', {}, [h('td', {}, [h('i', { class: 'dot', style: 'background:' + d.color }), d.name]), h('td', { class: 'r num' }, [d.score + ' / ' + d.max]), h('td', { class: 'r num' }, [d.pct + '%']), h('td', { class: 'num' }, [d.band ? d.band[0] + '% – ' + d.band[1] + '%' : '—']), h('td', { class: 'pos-' + d.position }, [d.positionName || '—']), h('td', {}, [d.level.code + ' ' + d.level.name]), h('td', {}, [subOf(d.weakest).name])])); });
    p._body.appendChild(h('h3', {}, ['六维位置表'])); p._body.appendChild(t);
    var dist = r.answerDistribution, colors = [STATUS_COLOR.low, STATUS_COLOR.mid, '#8FA8F0', STATUS_COLOR.high];
    p._body.appendChild(h('h3', {}, ['作答分布']));
    p._body.appendChild(h('div', { class: 'two' }, [
      CH.donut(dist.map(function (v, i) { return { name: i + ' 分', v: v, color: colors[i] }; }), String(r.total), '总分'),
      h('div', {}, [h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['选项得分']), h('th', { class: 'r' }, ['题数']), h('th', {}, ['含义'])])].concat(dist.map(function (v, i) { return h('tr', {}, [h('td', {}, [h('i', { class: 'dot', style: 'background:' + colors[i] }), i + ' 分']), h('td', { class: 'r num' }, [String(v)]), h('td', {}, [['该项尚未开始', '有零散做法', '基本建立', '已制度化并执行'][i]])]); }))), h('p', { class: 'chart-note' }, ['0 分题是最直接的改进清单，共 ' + dist[0] + ' 题；3 分题代表已经制度化的能力，共 ' + dist[3] + ' 题。'])])
    ]));
    return p;
  }
  // ---- 维度详解 ----
  function pDimA(r, d, i) {
    var p = page('5.' + (i + 1) + ' ' + d.name + '维度', r);
    p._body.appendChild(h('div', { class: 'dim-hd' }, [CH.ring(d.pct, d.color, d.score + ' / ' + d.max), h('div', {}, [
      h('div', { class: 'nm' }, [d.name + '维度', h('small', {}, [d.level.code + ' ' + d.level.name])]),
      h('div', { class: 'facts' }, [tag(d.positionName || '无参考带', d.position === 'above' ? 'ok' : d.position === 'below' ? 'risk' : ''), d.band ? tag('同行参考带 ' + d.band[0] + '%–' + d.band[1] + '%') : null, tag('最强 ' + subOf(d.strongest).name, 'ok'), tag('最弱 ' + subOf(d.weakest).name, 'risk')]),
      h('p', { class: 'muted' }, [d.desc])])]));
    p._body.appendChild(h('h3', {}, ['三个子维度'])); p._body.appendChild(CH.subdimBars(d.subdims, d.color));
    p._body.appendChild(h('h3', {}, ['诊断结论']));
    p._body.appendChild(h('p', { class: 'lead' }, [d.summary]));
    p._body.appendChild(h('div', { class: 'diag' }, d.subdims.map(function (s) { return h('div', { class: 'dcard', style: 'border-color:' + STATUS_COLOR[s.band] }, [h('div', { class: 'nm' }, [s.name, h('span', { class: 'sc num', style: 'color:' + STATUS_COLOR[s.band] }, [s.score + '/' + s.max + ' ' + s.bandName])]), h('p', {}, [s.diagnosis])]); })));
    return p;
  }
  function pDimB(r, d, i) {
    var p = page('5.' + (i + 1) + ' ' + d.name + '维度 · 作答明细与建议', r);
    p._body.appendChild(h('h3', {}, ['作答明细']));
    var t = h('table', { class: 'tbl compact' }, [h('tr', {}, [h('th', {}, ['子维度']), h('th', {}, ['题目']), h('th', {}, ['所选']), h('th', { class: 'c' }, ['得分']), h('th', {}, ['为什么看这个'])])]);
    r.answers.filter(function (a) { return a.dimension === d.key; }).forEach(function (a) { var s = subOf(a.sub); t.appendChild(h('tr', {}, [h('td', {}, [s.name]), h('td', {}, [a.text]), h('td', { style: 'font-weight:600' }, [a.optionText]), h('td', { class: 'c num', style: 'color:' + [STATUS_COLOR.low, STATUS_COLOR.mid, 'var(--brand)', STATUS_COLOR.high][a.score] + ';font-weight:800' }, [a.score + ' / 3']), h('td', { class: 'muted' }, [a.explain])])); });
    p._body.appendChild(t);
    var acts = d.recommendations.map(function (t) { var ra = r.actions.filter(function (a) { return a.id === t.id; })[0]; return ra || Object.assign({ order: '备', phase: '', color: d.color, dimensionName: d.name, source: 'template' }, t); });
    p._body.appendChild(h('h3', {}, [d.name + '维度的升级建议（按 ' + d.level.code + ' ' + d.level.name + ' 级匹配）']));
    p._body.appendChild(h('div', { class: acts.length > 1 ? 'acts-grid' : '' }, acts.map(function (a) { return actCard(a, false); })));
    return p;
  }
  // ---- 优势与短板 ----
  function pRanked(r) {
    var p = page('6 优势与短板', r);
    p._body.appendChild(h('h2', {}, ['十八项子维度排序']));
    var items = r.subdims.slice().sort(function (a, b) { return b.pct - a.pct; }).map(function (s) { return { name: s.name, dimName: s.dimensionName, color: dimOf(s.dimension).color, pct: s.pct, band: s.band, score: s.score, max: s.max }; });
    p._body.appendChild(CH.rankedBars(items));
    p._body.appendChild(h('p', { class: 'chart-note' }, ['圆点颜色表示该项状态：', h('i', { class: 'dot', style: 'background:' + STATUS_COLOR.high }), '已建立（5–6 分）　', h('i', { class: 'dot', style: 'background:' + STATUS_COLOR.mid }), '基本具备（3–4 分）　', h('i', { class: 'dot', style: 'background:' + STATUS_COLOR.low }), '待加强（0–2 分）']));
    return p;
  }
  // ---- 路线图 ----
  function pRoadmap1(r) {
    var p = page('7 升级路线图', r);
    p._body.appendChild(h('h2', {}, ['12 个月升级路线图']));
    p._body.appendChild(h('p', {}, ['从 ' + r.level.code + ' ' + r.level.name + ' 级' + (r.nextLevel ? '升到 ' + r.nextLevel.code + ' ' + r.nextLevel.name + ' 级' : '持续巩固') + '：前六个月集中补三个短板维度（' + r.weakDims.map(function (k) { return dimOf(k).name; }).join('、') + '），后六个月扩展优势维度（' + r.strongDims.map(function (k) { return dimOf(k).name; }).join('、') + '）。每项行动按该维度自身的等级匹配，附负责人、周期与验收指标。']));
    p._body.appendChild(CH.timeline(core.PHASES, r.actions));
    p._body.appendChild(h('div', { class: 'phase-cards' }, r.roadmap.map(function (ph) { return h('div', { class: 'phase-card' }, [h('div', { class: 'pn' }, [ph.name]), h('div', { class: 'pt' }, [ph.title]), h('ul', {}, ph.actions.map(function (n) { var a = r.actions[n - 1]; return h('li', {}, [a.order + '. ' + a.title, h('span', { class: 'muted' }, ['　' + a.dimensionName])]); })), h('div', { class: 'ms' }, ['里程碑：' + ph.milestone])]); })));
    return p;
  }
  function pRoadmap2(r) {
    var p = page('7 升级路线图 · 第 1–6 个月行动', r);
    p._body.appendChild(h('div', { class: 'acts-grid' }, r.actions.filter(function (a) { return a.phase !== 'p3'; }).map(function (a) { return actCard(a, false); })));
    return p;
  }
  function pRoadmap3(r) {
    var p = page('7 升级路线图 · 第 7–12 个月行动', r);
    p._body.appendChild(h('div', { class: 'acts-grid' }, r.actions.filter(function (a) { return a.phase === 'p3'; }).map(function (a) { return actCard(a, false); })));
    p._body.appendChild(h('h3', {}, ['12 个月后的状态']));
    p._body.appendChild(h('p', {}, [r.roadmap[2].milestone + '。' + (r.nextLevel ? '届时建议重新评估，确认是否已达到 ' + r.nextLevel.code + ' ' + r.nextLevel.name + ' 级（' + r.nextLevel.minPct + '% 以上），并按新等级更新路线图。' : '建议每年重新评估一次，保持 L4 经营级的量化收益复盘。')]));
    return p;
  }
  // ---- 场景 ----
  function pScenes(r) {
    var p = page('8 场景推荐', r);
    p._body.appendChild(h('h2', {}, ['适合本企业的 AI 场景']));
    p._body.appendChild(h('p', {}, ['按业务价值、实施难度、现有系统的数据条件，以及对短板维度的拉动作用综合排序。前五个场景为推荐起点，其中排名第一的场景可作为首个立项对象。']));
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', { class: 'c' }, ['排名']), h('th', {}, ['场景']), h('th', {}, ['环节']), h('th', { class: 'c' }, ['价值']), h('th', { class: 'c' }, ['难度']), h('th', {}, ['数据条件']), h('th', {}, ['可先试'])])]);
    r.scenes.slice(0, 5).forEach(function (s) { t.appendChild(h('tr', { class: 'scene-row' }, [h('td', { class: 'c num', style: 'font-weight:800;color:var(--brand)' }, [String(s.rank)]), h('td', {}, [h('div', { class: 'nm' }, [s.name]), h('div', { class: 'why' }, [s.desc]), h('div', { class: 'why' }, ['第一步：' + s.firstStep])]), h('td', {}, [s.stage]), h('td', { class: 'c num' }, [String(s.value)]), h('td', { class: 'c num' }, [String(s.difficulty)]), h('td', {}, [s.dataNote]), h('td', {}, [s.module])])); });
    p._body.appendChild(CH.matrix(r.scenes)); p._body.appendChild(h('h3', {}, ['推荐场景 Top 5'])); p._body.appendChild(t);
    return p;
  }
  // ---- 投入 ----
  function pInvestment(r) {
    var p = page('9 投入与回报框架', r), inv = r.investment;
    p._body.appendChild(h('h2', {}, ['投入与回报框架']));
    p._body.appendChild(h('p', { class: 'lead' }, [inv.rationale]));
    p._body.appendChild(h('div', { class: 'tiers' }, inv.tiers.map(function (t) { return h('div', { class: 'tier' + (t.key === inv.tier ? ' cur' : '') }, [h('div', { class: 'nm' }, [t.name, t.key === inv.tier ? tag('本企业', '', 'margin-left:8px') : null]), h('div', { class: 'rg num' }, [t.range]), h('p', {}, [t.desc]), h('div', { class: 'fit' }, ['适合：' + t.fit])]); })));
    p._body.appendChild(h('h3', {}, ['回报怎么算']));
    p._body.appendChild(h('p', {}, ['本报告的三件事与推荐场景，对应的回报按三笔账测算：管效账（释放工时折算增收）、增收账（客户数 × 增值服务渗透率 × 客单价）、留客账（流失率下降 × 年均客单价）。' + inv.note]));
    p._body.appendChild(h('h3', {}, ['与本报告相关的服务']));
    var svc = DATA.m1.reportText.services, used = {}; r.actions.forEach(function (a) { used[a.service] = true; });
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['服务']), h('th', {}, ['内容']), h('th', { class: 'r' }, ['价格'])])]);
    svc.filter(function (s) { return used[s.name] || /诊断|轻享版/.test(s.name); }).forEach(function (s) { t.appendChild(h('tr', {}, [h('td', { style: 'font-weight:700' }, [s.name]), h('td', {}, [s.desc]), h('td', { class: 'r num' }, [s.price])])); });
    p._body.appendChild(t);
    return p;
  }
  // ---- 风险 ----
  function pRisks(r) {
    var p = page('10 风险与合规提示', r);
    p._body.appendChild(h('h2', {}, ['风险与合规提示']));
    p._body.appendChild(h('p', {}, ['以下提示由合规维度作答与企业画像触发，按优先级排列。高优先级项建议在首个 AI 场景上线前完成。']));
    var cls = { '高': 'risk', '中': 'warn', '提示': '' }, col = { '高': STATUS_COLOR.low, '中': STATUS_COLOR.mid, '提示': 'var(--brand)' };
    if (!r.risks.length) p._body.appendChild(h('p', { class: 'lead' }, ['合规维度各项均已基本建立，当前无需特别提示。']));
    r.risks.forEach(function (k) { p._body.appendChild(h('div', { class: 'risk', style: 'border-color:' + col[k.level] }, [h('div', { class: 't' }, [tag(k.level, cls[k.level]), k.title]), h('p', {}, [k.text])])); });
    return p;
  }
  // ---- 90 天清单 ----
  function pChecklist(r) {
    var p = page('11 90 天行动清单', r);
    p._body.appendChild(h('h2', {}, ['90 天行动清单']));
    p._body.appendChild(h('p', {}, ['由前三件事拆解为可勾选的执行项，按周次排列。建议打印后由负责人逐项签认。']));
    var t = h('table', { class: 'tbl checklist' }, [h('tr', {}, [h('th', {}, ['周次']), h('th', {}, ['维度']), h('th', {}, ['执行项']), h('th', {}, ['负责人']), h('th', { class: 'c' }, ['完成'])])]);
    r.checklist.forEach(function (c) { t.appendChild(h('tr', {}, [h('td', {}, [c.week]), h('td', {}, [tag(c.dimensionName, 'dim', 'background:' + c.color + ';margin:0')]), h('td', {}, [c.action + '-' + (c.weekIndex + 1) + '　' + c.item]), h('td', {}, [c.owner]), h('td', { class: 'c' }, [h('span', { class: 'box' })])])); });
    p._body.appendChild(t);
    p._body.appendChild(h('h3', {}, ['三件事的验收指标']));
    p._body.appendChild(h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['行动']), h('th', {}, ['交付物']), h('th', {}, ['验收指标'])])].concat(r.actions.slice(0, 3).map(function (a) { return h('tr', {}, [h('td', { style: 'font-weight:700' }, [a.order + '. ' + a.title]), h('td', {}, [a.deliverable]), h('td', {}, [a.kpi])]); }))));
    return p;
  }
  // ---- 附录 ----
  function pAppendixA(r) {
    var p = page('附录 A 评分明细', r);
    p._body.appendChild(h('h2', {}, ['评分明细（36 题）']));
    var t = h('table', { class: 'tbl compact' }, [h('tr', {}, [h('th', {}, ['#']), h('th', {}, ['维度']), h('th', {}, ['子维度']), h('th', {}, ['题目']), h('th', {}, ['所选']), h('th', { class: 'c' }, ['分'])])]);
    r.answers.forEach(function (a, i) { var d = dimOf(a.dimension); t.appendChild(h('tr', {}, [h('td', { class: 'num' }, [String(i + 1)]), h('td', {}, [h('i', { class: 'dot', style: 'background:' + d.color }), d.name]), h('td', {}, [subOf(a.sub).name]), h('td', {}, [a.text]), h('td', {}, [a.optionText]), h('td', { class: 'c num', style: 'font-weight:700' }, [String(a.score)])])); });
    p._body.appendChild(t);
    return p;
  }
  function pAppendixB(r) {
    var p = page('附录 B 术语与服务', r), rt = DATA.m1.reportText;
    p._body.appendChild(h('h2', {}, ['术语']));
    p._body.appendChild(h('table', { class: 'tbl compact' }, rt.glossary.map(function (g) { return h('tr', {}, [h('td', { style: 'font-weight:700;width:22%' }, [g.term]), h('td', {}, [g.desc])]); })));
    p._body.appendChild(h('h2', { style: 'margin-top:18px' }, ['顶呱呱服务清单']));
    p._body.appendChild(h('table', { class: 'tbl compact' }, [h('tr', {}, [h('th', {}, ['服务']), h('th', {}, ['内容']), h('th', { class: 'r' }, ['价格'])])].concat(rt.services.map(function (s) { return h('tr', {}, [h('td', { style: 'font-weight:700' }, [s.name]), h('td', {}, [s.desc]), h('td', { class: 'r num' }, [s.price])]); }))));
    return p;
  }
  function pBack(r) {
    var p = page('', r, 'back'), c = DATA.m1.reportText.contact;
    var qr = h('div', { html: (function () { try { var q = qrcode(0, 'M'); q.addData(sh.CFG.wechatUrl); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace('<svg', '<svg class="qr"'); } catch (e) { return ''; } })() });
    p._body.appendChild(h('img', { src: sh.CFG.logo, alt: '顶呱呱' }));
    p._body.appendChild(h('div', { class: 'slogan' }, [c.slogan]));
    p._body.appendChild(h('p', { class: 'lead' }, [DATA.m1.reportText.closing]));
    p._body.appendChild(qr);
    p._body.appendChild(h('div', { class: 'contact' }, [c.company, h('br'), c.address, h('br'), '联系电话 ' + c.phone + ' · ' + c.platform, h('br'), c.cities]));
    return p;
  }

  DGG.registerModule('m1', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
