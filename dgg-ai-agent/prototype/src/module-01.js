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

  // ---------- 屏 3 · 报告 ----------
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function reportNo(r) { var s = 0; for (var i = 0; i < r.profile.name.length; i++) s = (s * 31 + r.profile.name.charCodeAt(i)) % 100000; return 'DGG-' + today().replace(/-/g, '') + '-' + ('00000' + s).slice(-5); }
  function dimOf(key) { return M.result.dimensions.filter(function (d) { return d.key === key; })[0]; }
  function subOf(key) { return M.result.subdims.filter(function (s) { return s.key === key; })[0]; }
  function tag(text, cls, style) { return h('span', { class: 'tag ' + (cls || ''), style: style || '' }, [text]); }
  function printBrief() { document.body.classList.add('print-brief'); var off = function () { document.body.classList.remove('print-brief'); window.removeEventListener('afterprint', off); }; window.addEventListener('afterprint', off); sh.print(); }
  function RT() { return DATA.m1.reportText; }

  // 通用组件
  function banner(no, title, sub, right) { return h('div', { class: 'ch-banner' }, [h('div', { class: 'no' }, [no]), h('div', {}, [h('div', { class: 't' }, [title]), h('div', { class: 'st' }, [sub])]), right ? h('div', { class: 'rt' }, [right]) : null]); }
  function fig(title, sub, body, note) { var f = h('div', { class: 'fig' }, [h('div', { class: 'ft' }, [title]), sub ? h('div', { class: 'fs' }, [sub]) : null]); (Array.isArray(body) ? body : [body]).forEach(function (b) { if (b) f.appendChild(b); }); if (note) f.appendChild(h('div', { class: 'fnote' }, [note])); return f; }
  function cap(t) { return h('div', { class: 'fig-cap' }, [t]); }
  function callout(label, headline, text, cls) { return h('div', { class: 'callout ' + (cls || '') }, [h('div', { class: 'lb' }, [label]), h('div', {}, [headline ? h('div', { class: 'hl' }, [headline]) : null, text ? h('div', { class: 'x' }, [text]) : null])]); }
  function findings(items) { return h('ul', { class: 'findings' }, items.map(function (it) { return h('li', {}, [h('b', {}, [it[0]]), it[1]]); })); }
  function verdictBar(v, slim) { return h('div', { class: 'verdict' + (slim ? ' slim' : '') }, [h('div', {}, [h('div', { class: 'lb' }, [v.label]), h('div', { class: 'hl' }, [v.headline])]), v.score != null ? h('div', { class: 'sc' }, [h('div', { class: 'k' }, [v.scoreLabel]), h('div', { class: 'v num' }, [v.score + '%'])]) : null]); }
  function actCard(a, mini) {
    return h('div', { class: 'act-card', style: '--ac:' + a.color }, [
      h('div', { class: 'hd' }, [h('span', { class: 'n num' }, [String(a.order)]), h('span', { class: 't' }, [a.title]), M.llmState === 'failed' && a.order <= 3 ? tag('初稿', 'warn') : null]),
      h('div', { class: 'why' }, [tag(a.dimensionName, 'dim', 'background:' + a.color), a.why]),
      mini ? null : h('ol', {}, a.steps.map(function (s) { return h('li', {}, [s]); })),
      h('div', { class: 'meta' }, [h('span', {}, ['负责人 ', h('b', {}, [a.owner])]), h('span', {}, ['周期 ', h('b', { class: 'num' }, [a.weeks + ' 周'])]), h('span', {}, ['投入 ', h('b', {}, [a.cost])]), mini ? null : h('span', {}, ['交付物 ', h('b', {}, [a.deliverable])]), mini ? null : h('span', {}, ['验收 ', h('b', {}, [a.kpi])])]),
      h('div', { class: 'foot' }, ['对应服务 ', h('b', {}, [a.service]), '　可先试 ', h('b', {}, [a.module])])
    ]);
  }
  function page(chapter, r, cls) {
    var p = h('section', { class: 'page ' + (cls || '') });
    if (chapter) p.appendChild(h('div', { class: 'page-head' }, [h('span', { class: 'ch' }, [chapter]), h('span', { class: 'rt' }, [RT().reportTitle + ' · ' + r.profile.name])]));
    var body = h('div', { class: 'page-body' }); p.appendChild(body); p._body = body; return p;
  }

  function drawReport() {
    var r = M.result;
    M.pages = [];
    $root.appendChild(h('div', { class: 'report-bar' }, [
      h('button', { class: 'btn primary big', onclick: printBrief }, ['打印速览']),
      h('button', { class: 'btn big', onclick: sh.print }, ['打印完整报告']),
      h('button', { class: 'btn big', onclick: sh.showWeChat }, ['发送到微信']),
      h('span', { class: 'spacer' }), h('span', { class: 'pages-count', id: 'pages-count' }),
      h('button', { class: 'btn ghost', onclick: function () { M.answers = []; M.q = 0; M.result = null; sh.setQrReady(false); setStep('input'); } }, [sh.station() === '1' ? '下一位' : '重新评估'])
    ]));
    var wrap = h('div', { class: 'report' }), toc = h('nav', { class: 'toc' }), pages = h('div', { class: 'pages' });
    var add = function (title, el, o) { o = o || {}; M.pages.push({ title: title, sub: o.sub, one: o.one, el: el, brief: !!o.brief }); };
    add('封面', pCover(r), { brief: true });
    add('本报告导航', pNav(r), { one: '章节与一句话内容' });
    add('01 诊断结论速览', pQuick1(r), { brief: true, one: '六个问题、六句回答，以及总体判断' });
    add('', pQuick2(r), { brief: true, sub: '六个判断与三件事' });
    add('02 企业画像', pProfile(r), { one: '基本情况、行业视角与评估方法' });
    add('03 总体成熟度', pOverall1(r), { brief: true, one: '六维就绪度、等级刻度与同行位置' });
    add('', pOverall2(r), { sub: '等级刻度与同行分布' });
    add('', pOverall3(r), { sub: '六维得分与作答分布' });
    r.dimensions.forEach(function (d, i) {
      add('04.' + (i + 1) + ' ' + d.name + '维度', pDimA(r, d, i), i === 0 ? { one: '六个维度逐一诊断：子维度得分、作答明细与建议' } : {});
      add('', pDimB(r, d, i), { sub: '作答明细与建议' });
    });
    add('05 优势与短板', pRanked(r), { one: '十八项子维度排序' });
    add('06 AI 优先方向', pDirections(r), { one: '六个维度该先补哪一个' });
    add('07 推荐场景', pScenes1(r), { one: '价值与难度矩阵、五个推荐场景' });
    add('', pScenes2(r), { sub: '三个首选场景' });
    add('08 升级路线图', pRoadmap1(r), { brief: true, one: '12 个月三阶段九项行动' });
    add('', pRoadmap2(r), { sub: '第 1–6 个月行动' });
    add('', pRoadmap3(r), { sub: '第 7–12 个月行动' });
    add('09 投入与回报', pInvestment(r), { one: '投入档位、回报口径与相关服务' });
    add('10 风险与合规', pRisks(r), { one: '由作答与画像触发的提示' });
    add('11 90 天行动清单', pChecklist(r), { one: '可勾选执行项与验收指标' });
    add('附录 A 评分明细', pAppendixA(r), { one: '36 题作答与得分' });
    add('附录 B 信息来源', pAppendixB(r), { one: '置信度、术语与服务边界' });
    add('封底', pBack(r), {});
    M.pages.forEach(function (pg, i) {
      pg.el.setAttribute('data-page', String(i + 1)); if (pg.brief) pg.el.classList.add('brief');
      if (i > 0 && i < M.pages.length - 1) pg.el.appendChild(h('div', { class: 'page-foot' }, [h('span', {}, [r.profile.name + ' · ' + RT().reportTitle + ' · ' + RT().issuer]), h('span', { class: 'num' }, ['第 ' + (i + 1) + ' 页 / 共 ' + M.pages.length + ' 页'])]));
      pages.appendChild(pg.el);
    });
    toc.appendChild(h('h4', {}, ['目录']));
    M.pages.forEach(function (pg, i) { if (!pg.title && !pg.sub) return; toc.appendChild(h('button', { class: pg.sub ? 'sub' : '', onclick: function () { pg.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, [h('span', {}, [pg.title || pg.sub]), h('span', { class: 'pn num' }, [String(i + 1)])])); });
    wrap.appendChild(toc); wrap.appendChild(pages); $root.appendChild(wrap);
    document.getElementById('pages-count').textContent = '共 ' + M.pages.length + ' 页';
    var nav = document.getElementById('nav-tbl');
    if (nav) M.pages.forEach(function (pg, i) { if (!pg.title || !pg.one) return; nav.appendChild(h('tr', {}, [h('td', {}, [pg.title.split(' ')[0]]), h('td', {}, [pg.title.replace(/^\S+\s/, '')]), h('td', {}, [pg.one]), h('td', { class: 'num' }, [String(i + 1)])])); });
  }

  // ---- 封面 ----
  function pCover(r) {
    var p = page('', r, 'cover');
    var hero = h('div', { class: 'hero' });
    hero.appendChild(CH.hero(r.dimensions, r.total));
    hero.appendChild(h('div', { class: 'ov' }, [h('div', { class: 'en' }, ['AI MATURITY ASSESSMENT REPORT']), h('div', { class: 'co' }, [r.profile.name]), h('div', { class: 'rt' }, [RT().reportTitle])]));
    hero.appendChild(h('img', { class: 'logo', src: sh.CFG.logo, alt: '顶呱呱' }));
    p._body.appendChild(hero);
    var low = h('div', { class: 'low' });
    low.appendChild(h('div', { class: 'lv' }, [
      h('div', { class: 'badge' }, [h('div', { class: 'code' }, [r.level.code]), h('div', { class: 'lname' }, [r.level.name])]),
      h('div', {}, [h('div', { class: 'big num' }, [r.pct + '%', h('small', {}, [' 综合得分 ' + r.total + ' / ' + r.max + (r.percentile != null ? ' · 超过 ' + r.percentile + '% 同行' : '')])]), h('div', { class: 'vd' }, [r.level.verdict]), h('div', {}, r.profile.tags.slice(0, 6).map(function (t) { return tag(t); }))])
    ]));
    low.appendChild(h('div', { class: 'qrow' }, r.quickView.map(function (q) { return h('div', {}, [q.q, h('i', {}, [q.a])]); })));
    low.appendChild(h('div', { class: 'bot' }, [h('span', {}, ['评估编号 ' + reportNo(r)]), h('span', { class: 'num' }, ['评估日期 ' + today()]), h('span', {}, [RT().issuer + ' · 六维十八项 · 36 题'])]));
    p._body.appendChild(low);
    return p;
  }
  // ---- 导航 ----
  function pNav(r) {
    var p = page('本报告导航', r);
    p._body.appendChild(h('h2', {}, ['本报告导航']));
    p._body.appendChild(h('p', { class: 'muted' }, ['企业 AI 升级，先不急着买系统：先看清楚处在什么阶段、同行里在哪、短板在哪、先做什么、投多少。']));
    p._body.appendChild(h('table', { class: 'tbl nav-tbl', id: 'nav-tbl' }, [h('tr', {}, [h('th', {}, ['章节']), h('th', {}, ['名称']), h('th', {}, ['一句话内容']), h('th', { class: 'r' }, ['页码'])])]));
    p._body.appendChild(h('div', { class: 'guide' }, [h('b', {}, ['阅读说明']), h('ol', {}, RT().readingGuide.map(function (g) { return h('li', {}, [g]); }))]));
    return p;
  }
  // ---- 01 结论速览 ----
  function pQuick1(r) {
    var p = page('01 诊断结论速览', r);
    p._body.appendChild(banner('01', '诊断结论速览', '先看结论：六个问题，六句回答', r.level.code + ' ' + r.level.name + ' 级 · ' + r.pct + '%'));
    var cards = h('div', { class: 'qcards' }, r.quickView.map(function (q) { return h('div', { class: 'qcard tone-' + q.tone }, [h('div', { class: 'hd' }, [h('div', { class: 'n num' }, [String(q.n)]), h('div', { class: 'q' }, [q.q])]), h('div', { class: 'bd' }, [h('div', { class: 'a' }, [q.a]), h('div', { class: 'x' }, [q.text])])]); }));
    p._body.appendChild(fig('诊断结论速览：六个问题，六句回答', '企业 AI 升级，先看清楚这六件事', [verdictBar(r.verdict), cards], '结论依据：企业画像 13 项、36 题作答、同行参考带与顶呱呱行动库。'));
    p._body.appendChild(cap('图 1-1  诊断结论速览'));
    return p;
  }
  function pQuick2(r) {
    var p = page('01 诊断结论速览 · 六个判断与三件事', r);
    p._body.appendChild(h('h3', {}, ['1.1  决策层需要判断的六个问题']));
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', { style: 'width:26%' }, ['决策层需要判断的问题']), h('th', {}, ['本次评估的结论'])])]);
    r.quickView.forEach(function (q) { t.appendChild(h('tr', {}, [h('td', { class: 'b' }, [q.q]), h('td', {}, [h('b', { style: 'color:var(--r-blue)' }, [q.a + '。']), q.text])])); });
    p._body.appendChild(t);
    p._body.appendChild(callout('总体判断', r.verdict.headline, r.verdict.text));
    p._body.appendChild(h('h3', {}, ['1.2  未来三个月先做的三件事']));
    p._body.appendChild(h('div', { class: 'acts-mini' }, r.actions.slice(0, 3).map(function (a) { return actCard(a, true); })));
    return p;
  }
  // ---- 02 企业画像 ----
  function pProfile(r) {
    var p = page('02 企业画像', r), pf = r.profile;
    p._body.appendChild(banner('02', '企业画像', '调研对象：基本情况、行业视角与评估方法'));
    p._body.appendChild(h('h3', {}, ['2.1  企业基本情况']));
    p._body.appendChild(h('p', { class: 'lead' }, [pf.portrait]));
    var rows = [['企业名称', pf.name], ['所属行业', pf.sectorName + ' · ' + pf.industryName], ['人员规模', pf.sizeName], ['上年营收', pf.revenueName], ['所在地', pf.province], ['成立年限', pf.yearsName], ['企业性质', pf.ownershipName], ['主要客户', pf.customersName], ['现有系统', pf.systemsName.join('、')], ['数字化专职', pf.itStaffName], ['分支机构', pf.branchesName || '—'], ['海外业务', pf.overseasName]];
    var t = h('table', { class: 'tbl plain' }), half = Math.ceil(rows.length / 2);
    for (var i = 0; i < half; i++) { var a = rows[i], b = rows[i + half]; t.appendChild(h('tr', {}, [h('td', { class: 'k' }, [a[0]]), h('td', { class: 'b', style: 'width:34%' }, [a[1]]), h('td', { class: 'k' }, [b ? b[0] : '']), h('td', { class: 'b' }, [b ? b[1] : ''])])); }
    p._body.appendChild(t);
    p._body.appendChild(h('h3', {}, ['2.2  行业视角 · ' + r.sectorInsight.name]));
    p._body.appendChild(h('p', {}, [r.sectorInsight.insight]));
    p._body.appendChild(h('div', {}, [h('span', { class: 'muted' }, ['该行业常见的 AI 切入点：'])].concat(r.sectorInsight.aiFocus.map(function (t) { return tag(t); }))));
    p._body.appendChild(h('h3', {}, ['2.3  评估方法：六维十八项']));
    p._body.appendChild(h('div', { class: 'model' }, DATA.m1.dimensions.map(function (d) { return h('div', { class: 'col' }, [h('div', { class: 'h', style: 'background:' + d.color }, [d.name])].concat(d.subdims.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s.name]), s.desc]); }))); })));
    p._body.appendChild(h('p', { class: 'muted', style: 'margin-top:8px' }, [RT().method.scoring + ' ' + RT().method.levels + ' ' + RT().method.benchmark]));
    return p;
  }
  // ---- 03 总体成熟度 ----
  function readyItems(r) {
    return r.dimensions.map(function (d) { var w = subOf(d.weakest); return { name: d.name, value: d.pct, valueText: d.pct + '%', band: d.position === 'above' ? 'high' : (d.position === 'below' ? 'low' : 'mid'), explain: (d.positionName || '') + '；最弱「' + w.name + '」' + first(w.diagnosis) }; });
  }
  function pOverall1(r) {
    var p = page('03 总体成熟度', r);
    p._body.appendChild(banner('03', '总体成熟度', '六个维度综合 ' + r.pct + '%，' + r.level.code + ' ' + r.level.name + ' 级'));
    var radar = CH.radar(r.dimensions.map(function (d) { return { name: d.name, pct: d.pct, band: d.band, color: d.color }; }));
    var body = h('div', { class: 'ready' }, [radar, CH.gradBars(readyItems(r), { width: 540, labelW: 60, explainLen: 36 })]);
    var scaleNote = DATA.m1.levels.map(function (l) { return l.minPct + '% ' + l.code + ' ' + l.name; }).join('　·　');
    p._body.appendChild(fig('AI 成熟度评估：六个维度，综合 ' + r.pct + '%', scaleNote, [body, h('div', { style: 'margin-top:12px' }, [verdictBar({ label: '综合判断', headline: '综合 ' + r.pct + '% —— ' + r.level.verdict + '；' + (r.nextLevel ? '距 ' + r.nextLevel.code + ' ' + r.nextLevel.name + ' 级还差 ' + r.nextLevel.gapPts + ' 分' : '已处于最高等级') }, true)])], '橙色虚线为同行参考带（' + r.profile.industryName + ' · ' + r.profile.sizeName + '）；条形颜色：绿 = 高于参考带，蓝 = 参考带内，橙 = 低于参考带。'));
    p._body.appendChild(cap('图 3-1  六维成熟度雷达与各维度得分'));
    return p;
  }
  function pOverall2(r) {
    var p = page('03 总体成熟度 · 等级刻度与同行分布', r);
    p._body.appendChild(fig('成熟度等级：' + r.level.code + ' ' + r.level.name + '，' + r.level.focus, '五级刻度上的位置与本级典型特征', [CH.levelScale(r.levels, r.pct, r.level.code), h('div', { style: 'margin-top:6px' }, r.level.traits.map(function (t) { return tag(t); }))]));
    p._body.appendChild(cap('图 3-2  成熟度等级刻度'));
    if (r.distribution) {
      p._body.appendChild(fig('同行分布：超过 ' + r.percentile + '% 的' + r.profile.industryName + '同规模企业', '同行均值 ' + r.distribution.mean + '%，本企业 ' + r.pct + '%', CH.bell(r.distribution.mean, r.distribution.sd, r.pct, r.percentile), '同行分布按参考带估算；曲线下阴影为得分低于本企业的同行比例。'));
      p._body.appendChild(cap('图 3-3  同行分布与本企业位置'));
    }
    p._body.appendChild(h('h3', {}, ['3.1  诊断发现']));
    var strongest = dimOf(r.strongDims[r.strongDims.length - 1]), weakest = dimOf(r.weakDims[0]);
    p._body.appendChild(findings([
      ['整体处于 ' + r.level.code + ' ' + r.level.name + ' 级。', r.level.desc],
      ['六维分化明显。', '最强「' + strongest.name + '」' + strongest.pct + '%，最弱「' + weakest.name + '」' + weakest.pct + '%，相差 ' + Math.round((strongest.pct - weakest.pct) * 10) / 10 + ' 个百分点；' + r.positions.above + ' 个维度高于同行参考带，' + r.positions.below + ' 个低于。'],
      ['零分题共 ' + r.answerDistribution[0] + ' 题。', '这些是最直接的改进清单，集中在' + r.weaknesses.map(function (k) { return '「' + subOf(k).name + '」'; }).join('') + '等子维度。'],
      ['下一级的门槛是 ' + (r.nextLevel ? r.nextLevel.minPct + '%。' : '已达顶级。'), r.nextLevel ? '还差 ' + r.nextLevel.gapPts + ' 分，阶段重点：' + r.nextLevel.focus + '。' : '建议每年复评一次。']
    ]));
    p._body.appendChild(callout('本章结论', r.summary.dims, r.summary.next));
    return p;
  }
  function pOverall3(r) {
    var p = page('03 总体成熟度 · 六维得分与作答分布', r);
    p._body.appendChild(fig('六维得分与同行参考带区间', '柱为本企业得分；虚线框为同行参考带；红柱表示低于参考带', CH.vbars(r.dimensions.map(function (d) { return { name: d.name, value: d.pct, band: d.band, color: d.color, position: d.position, sub: d.positionName || '' }; }))));
    p._body.appendChild(cap('图 3-4  六维得分与参考带'));
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['维度']), h('th', { class: 'r' }, ['得分']), h('th', { class: 'r' }, ['百分比']), h('th', {}, ['同行参考带']), h('th', {}, ['位置']), h('th', {}, ['维度等级']), h('th', {}, ['最需要补'])])]);
    r.dimensions.forEach(function (d) { t.appendChild(h('tr', {}, [h('td', { class: 'b' }, [h('i', { class: 'dot', style: 'background:' + d.color }), d.name]), h('td', { class: 'r num' }, [d.score + ' / ' + d.max]), h('td', { class: 'r num' }, [d.pct + '%']), h('td', { class: 'num' }, [d.band ? d.band[0] + '% – ' + d.band[1] + '%' : '—']), h('td', { class: 'pos-' + d.position }, [d.positionName || '—']), h('td', {}, [d.level.code + ' ' + d.level.name]), h('td', {}, [subOf(d.weakest).name])])); });
    p._body.appendChild(t);
    var dist = r.answerDistribution, colors = ['var(--r-orange)', 'var(--r-gray)', 'var(--r-blue2)', 'var(--r-green)'];
    p._body.appendChild(h('h3', {}, ['3.2  作答分布']));
    p._body.appendChild(h('div', { class: 'two wide-l' }, [
      h('div', {}, [h('table', { class: 'tbl plain' }, [h('tr', {}, [h('th', {}, ['选项得分']), h('th', { class: 'r' }, ['题数']), h('th', {}, ['含义'])])].concat(dist.map(function (v, i) { return h('tr', {}, [h('td', { class: 'b' }, [h('i', { class: 'dot', style: 'background:' + colors[i] }), i + ' 分']), h('td', { class: 'r num' }, [String(v)]), h('td', {}, [['该项尚未开始', '有零散做法', '基本建立', '已制度化并执行'][i]])]); }))), h('p', { class: 'muted', style: 'margin-top:6px' }, ['0 分题是最直接的改进清单，共 ' + dist[0] + ' 题；3 分题代表已经制度化的能力，共 ' + dist[3] + ' 题。'])]),
      CH.donut(dist.map(function (v, i) { return { name: i + ' 分', v: v, color: colors[i] }; }), String(r.total), '总分 / ' + r.max)
    ]));
    return p;
  }
  // ---- 04 维度详解 ----
  function pDimA(r, d, i) {
    var p = page('04.' + (i + 1) + ' ' + d.name + '维度', r);
    p._body.appendChild(banner('04.' + (i + 1), d.name + '维度诊断', d.desc, d.pct + '% · ' + (d.positionName || '') + ' · ' + d.level.code + ' ' + d.level.name));
    var items = d.subdims.map(function (s) { return { name: s.name, value: s.pct, valueText: s.score + ' / ' + s.max, band: s.band, explain: first(s.diagnosis) }; });
    p._body.appendChild(fig(d.name + '维度：' + d.score + ' / ' + d.max + '（' + d.pct + '%），最需要补「' + subOf(d.weakest).name + '」', '三个子维度得分与状态：绿 = 已建立 · 蓝 = 基本具备 · 橙 = 待加强', h('div', { class: 'two wide-l' }, [CH.gradBars(items, { width: 560, labelW: 104, explainLen: 40 }), h('div', { class: 'level-card' }, [CH.ring(d.pct, d.color, d.score + ' / ' + d.max), h('div', { class: 'verdict-t' }, [d.level.code + ' ' + d.level.name + ' 级']), h('div', { class: 'next' }, [d.band ? '同行参考带 ' + d.band[0] + '%–' + d.band[1] + '%' : '']), h('div', { style: 'margin-top:6px' }, [tag('最强 ' + subOf(d.strongest).name, 'ok'), tag('最弱 ' + subOf(d.weakest).name, 'warn')])])])));
    p._body.appendChild(cap('图 4-' + (i + 1) + '  ' + d.name + '维度子维度得分'));
    p._body.appendChild(h('h3', {}, ['4.' + (i + 1) + '.1  诊断发现']));
    p._body.appendChild(findings(d.subdims.map(function (s) { return [s.name + '：' + s.bandName + '（' + s.score + '/' + s.max + '）。', s.diagnosis]; })));
    p._body.appendChild(callout('本维度结论', d.name + '维度' + (d.positionName || '') + '，' + d.level.code + ' ' + d.level.name + ' 级', d.summary));
    return p;
  }
  function pDimB(r, d, i) {
    var p = page('04.' + (i + 1) + ' ' + d.name + '维度 · 作答明细与建议', r);
    p._body.appendChild(h('h3', {}, ['4.' + (i + 1) + '.2  作答明细']));
    var t = h('table', { class: 'tbl compact' }, [h('tr', {}, [h('th', {}, ['子维度']), h('th', {}, ['题目']), h('th', {}, ['所选']), h('th', { class: 'c' }, ['得分']), h('th', {}, ['为什么看这个'])])]);
    r.answers.filter(function (a) { return a.dimension === d.key; }).forEach(function (a) { t.appendChild(h('tr', {}, [h('td', {}, [subOf(a.sub).name]), h('td', {}, [a.text]), h('td', { class: 'b' }, [a.optionText]), h('td', { class: 'c num', style: 'font-weight:800;color:' + [SC.low, 'var(--r-gray)', SC.mid, SC.high][a.score] }, [a.score + ' / 3']), h('td', { class: 'muted' }, [a.explain])])); });
    p._body.appendChild(t);
    var acts = d.recommendations.map(function (tp) { var ra = r.actions.filter(function (a) { return a.id === tp.id; })[0]; return ra || Object.assign({ order: '备', phase: '', color: d.color, dimensionName: d.name, source: 'template' }, tp); });
    p._body.appendChild(h('h3', {}, ['4.' + (i + 1) + '.3  升级建议（按 ' + d.level.code + ' ' + d.level.name + ' 级匹配）']));
    p._body.appendChild(h('div', { class: 'acts-grid' }, acts.map(function (a) { return actCard(a, false); })));
    return p;
  }
  // ---- 05 优势与短板 ----
  function pRanked(r) {
    var p = page('05 优势与短板', r);
    p._body.appendChild(banner('05', '优势与短板', '十八项子维度从高到低排序'));
    var items = r.subdims.slice().sort(function (a, b) { return b.pct - a.pct; }).map(function (s) { return { name: s.name, dimName: s.dimensionName, color: dimOf(s.dimension).color, pct: s.pct, band: s.band, score: s.score, max: s.max }; });
    p._body.appendChild(fig('十八项子维度排序：' + r.strengths.length + ' 项优势，' + r.weaknesses.length + ' 项短板', '圆点：绿 = 已建立（5–6 分）· 蓝 = 基本具备（3–4 分）· 橙 = 待加强（0–2 分）', CH.rankedBars(items)));
    p._body.appendChild(cap('图 5-1  十八项子维度排序'));
    p._body.appendChild(h('div', { class: 'sw' }, [
      h('div', {}, [h('h3', {}, ['已建立的优势']), h('div', {}, r.strengths.map(function (k) { var s = subOf(k); return h('div', { class: 'item', style: 'border-color:' + SC.high }, [h('div', { class: 'n' }, [s.name, h('span', {}, [s.dimensionName + ' · ' + s.score + '/' + s.max])]), h('div', { class: 'd' }, [s.diagnosis])]); }))]),
      h('div', {}, [h('h3', {}, ['需要优先加强']), h('div', {}, r.weaknesses.map(function (k) { var s = subOf(k); return h('div', { class: 'item', style: 'border-color:' + SC.low }, [h('div', { class: 'n' }, [s.name, h('span', {}, [s.dimensionName + ' · ' + s.score + '/' + s.max])]), h('div', { class: 'd' }, [s.diagnosis])]); }))])
    ]));
    return p;
  }
  // ---- 06 优先方向 ----
  function pDirections(r) {
    var p = page('06 AI 优先方向', r);
    p._body.appendChild(banner('06', 'AI 优先方向建议', '六个维度，该先补哪一条'));
    var cards = h('div', { class: 'dir-cards' }, r.directions.map(function (d) { return h('div', { class: 'dir-card ' + TAG_TONE[d.tag] }, [h('div', { class: 'hd' }, [d.name, h('span', { class: 'tg' }, [d.tag])]), h('div', { class: 'bd' }, [h('span', { class: 'n num' }, [String(d.order)]), h('span', {}, [d.reason])])]); }));
    p._body.appendChild(fig('六个维度的优先级：' + r.weakDims.map(function (k) { return dimOf(k).name; }).slice(0, 2).join('与') + '先行', '方向不在多，同时铺开等于没有优先级', cards, '标号含义：1 = 前六个月优先推进　2 = 一期见效后展开　3 = 已高于或接近参考带，保持并复用'));
    p._body.appendChild(cap('图 6-1  六个维度的优先级判断'));
    var w = r.weakDims.map(function (k) { return dimOf(k).name; });
    p._body.appendChild(callout('方向结论', '优先方向：' + w[0] + ' + ' + w[1] + '，双线并行；' + w[2] + '在第二阶段跟进。', '前两个维度分别对应第 1、2 项行动，各有独立负责人；第 7–12 个月把已高于参考带的维度（' + r.strongDims.map(function (k) { return dimOf(k).name; }).join('、') + '）的做法复制到新场景。'));
    return p;
  }
  // ---- 07 场景 ----
  function pScenes1(r) {
    var p = page('07 推荐场景', r);
    p._body.appendChild(banner('07', '推荐优先关注的场景', '按价值、难度、数据条件与短板拉动综合排序'));
    p._body.appendChild(fig('场景价值与难度矩阵：优先做「' + r.scenes[0].name + '」', '横轴实施难度、纵轴业务价值；编号为综合排序', CH.matrix(r.scenes)));
    p._body.appendChild(cap('图 7-1  场景价值与难度矩阵'));
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', { class: 'c' }, ['排名']), h('th', {}, ['场景']), h('th', { class: 'nw' }, ['环节']), h('th', { class: 'c' }, ['价值']), h('th', { class: 'c' }, ['难度']), h('th', {}, ['数据条件']), h('th', { class: 'nw' }, ['可先试'])])]);
    r.scenes.slice(0, 5).forEach(function (s) { t.appendChild(h('tr', { class: 'scene-row' }, [h('td', { class: 'c num', style: 'font-weight:900;color:var(--r-blue)' }, [String(s.rank)]), h('td', {}, [h('div', { class: 'b' }, [s.name]), h('div', { class: 'muted' }, [s.desc])]), h('td', {}, [s.stage]), h('td', { class: 'c num' }, [String(s.value)]), h('td', { class: 'c num' }, [String(s.difficulty)]), h('td', {}, [s.dataNote]), h('td', {}, [s.module])])); });
    p._body.appendChild(t);
    return p;
  }
  function pScenes2(r) {
    var p = page('07 推荐场景 · 三个首选场景', r), tones = ['tone-green', 'tone-blue', 'tone-purple'];
    p._body.appendChild(h('h3', {}, ['7.1  三个首选场景']));
    p._body.appendChild(h('div', { class: 'scene-cards' }, r.scenes.slice(0, 3).map(function (s, i) { return h('div', { class: 'scene-card ' + tones[i] }, [h('div', { class: 'hd' }, [s.name, h('span', { class: 'rk num' }, [String(s.rank)])]), h('div', { class: 'bd' }, [h('div', { class: 'row' }, [h('span', {}, ['做什么']), h('span', {}, [s.desc])]), h('div', { class: 'row' }, [h('span', {}, ['为什么']), h('span', {}, [s.why])]), h('div', { class: 'row' }, [h('span', {}, ['数据条件']), h('span', {}, [s.dataNote])]), h('div', { class: 'row' }, [h('span', {}, ['第一步']), h('span', {}, [s.firstStep])]), h('div', { class: 'row' }, [h('span', {}, ['可先试']), h('span', { class: 'b' }, [s.module])])])]); })));
    p._body.appendChild(h('h3', {}, ['7.2  场景值不值：一个可以自己算的口径']));
    p._body.appendChild(h('p', {}, ['本报告推荐的场景，回报按三笔账测算：管效账（释放工时折算增收）、增收账（客户数 × 增值服务渗透率 × 客单价）、留客账（流失率下降 × 年均客单价）。' + RT().investment.note]));
    p._body.appendChild(callout('需要说明', '以上为价值判断，不是收益承诺。', '真正可承诺的是过程指标 —— 处理时长、差错率、响应时长。首个场景上线 3 个月后按这些过程指标验收，再决定是否扩展。', 'warn'));
    return p;
  }
  // ---- 08 路线图 ----
  function pRoadmap1(r) {
    var p = page('08 升级路线图', r);
    p._body.appendChild(banner('08', '12 个月升级路线图', '从 ' + r.level.code + ' ' + r.level.name + ' 级' + (r.nextLevel ? '升到 ' + r.nextLevel.code + ' ' + r.nextLevel.name + ' 级' : '持续巩固') + '：三个阶段，九项行动'));
    p._body.appendChild(fig('前六个月补短板，后六个月扩优势', '前六个月：' + r.weakDims.map(function (k) { return dimOf(k).name; }).join('、') + '　·　后六个月：' + r.strongDims.map(function (k) { return dimOf(k).name; }).join('、'), CH.timeline(core.PHASES, r.actions), '每项行动按该维度自身的等级匹配，附负责人、周期与验收指标（见后两页）。'));
    p._body.appendChild(cap('图 8-1  12 个月路线图'));
    p._body.appendChild(h('div', { class: 'phase-cards' }, r.roadmap.map(function (ph, i) { return h('div', { class: 'phase-card ' + PHASE_TONE[i] }, [h('div', { class: 'hd' }, [h('div', { class: 'pn' }, [ph.name]), h('div', { class: 'pt' }, [ph.title])]), h('ul', {}, ph.actions.map(function (n) { var a = r.actions[n - 1]; return h('li', {}, [a.order + '. ' + a.title, h('span', { class: 'muted' }, ['　' + a.dimensionName])]); })), h('div', { class: 'ms' }, ['里程碑：' + ph.milestone])]); })));
    return p;
  }
  function pRoadmap2(r) {
    var p = page('08 升级路线图 · 第 1–6 个月行动', r);
    p._body.appendChild(h('div', { class: 'acts-grid' }, r.actions.filter(function (a) { return a.phase !== 'p3'; }).map(function (a) { return actCard(a, false); })));
    return p;
  }
  function pRoadmap3(r) {
    var p = page('08 升级路线图 · 第 7–12 个月行动', r);
    p._body.appendChild(h('div', { class: 'acts-grid' }, r.actions.filter(function (a) { return a.phase === 'p3'; }).map(function (a) { return actCard(a, false); })));
    p._body.appendChild(callout('12 个月后的状态', r.roadmap[2].milestone + '。', r.nextLevel ? '届时建议重新评估，确认是否已达到 ' + r.nextLevel.code + ' ' + r.nextLevel.name + ' 级（' + r.nextLevel.minPct + '% 以上），并按新等级更新路线图。' : '建议每年重新评估一次，保持经营级的量化收益复盘。', 'ok'));
    return p;
  }
  // ---- 09 投入 ----
  function pInvestment(r) {
    var p = page('09 投入与回报框架', r), inv = r.investment;
    p._body.appendChild(banner('09', '投入与回报框架', '按可接受投入与当前等级判断的起步档位'));
    p._body.appendChild(callout('起步档位', inv.name + ' · ' + inv.range, inv.rationale));
    p._body.appendChild(h('div', { class: 'tiers' }, inv.tiers.map(function (t) { return h('div', { class: 'tier' + (t.key === inv.tier ? ' cur' : '') }, [h('div', { class: 'nm' }, [t.name, t.key === inv.tier ? tag('本企业', 'ok', 'margin-left:8px') : null]), h('div', { class: 'rg num' }, [t.range]), h('p', {}, [t.desc]), h('div', { class: 'fit' }, ['适合：' + t.fit])]); })));
    p._body.appendChild(h('h3', {}, ['9.1  回报怎么算']));
    p._body.appendChild(h('p', {}, ['本报告的三件事与推荐场景，对应的回报按三笔账测算：管效账（释放工时折算增收）、增收账（客户数 × 增值服务渗透率 × 客单价）、留客账（流失率下降 × 年均客单价）。' + inv.note]));
    p._body.appendChild(h('h3', {}, ['9.2  与本报告相关的服务']));
    var used = {}; r.actions.forEach(function (a) { used[a.service] = true; });
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['服务']), h('th', {}, ['内容']), h('th', { class: 'r' }, ['价格'])])]);
    RT().services.filter(function (s) { return used[s.name] || /诊断|轻享版/.test(s.name); }).forEach(function (s) { t.appendChild(h('tr', {}, [h('td', { class: 'b' }, [s.name]), h('td', {}, [s.desc]), h('td', { class: 'r num' }, [s.price])])); });
    p._body.appendChild(t);
    return p;
  }
  // ---- 10 风险 ----
  function pRisks(r) {
    var p = page('10 风险与合规提示', r), cls = { '高': 'risk', '中': 'warn', '提示': '' }, col = { '高': 'var(--r-red)', '中': 'var(--r-orange)', '提示': 'var(--r-blue)' };
    p._body.appendChild(banner('10', '风险与合规提示', '由合规维度作答与企业画像触发，按优先级排列'));
    if (!r.risks.length) p._body.appendChild(callout('结论', '合规维度各项均已基本建立', '当前无需特别提示。', 'ok'));
    r.risks.forEach(function (k) { p._body.appendChild(h('div', { class: 'risk', style: 'border-color:' + col[k.level] }, [h('div', { class: 't' }, [tag(k.level, cls[k.level]), k.title]), h('p', {}, [k.text])])); });
    p._body.appendChild(callout('处理顺序', '高优先级项在首个 AI 场景上线前完成', '中优先级项纳入前六个月行动；提示类项在场景选型时对照。', 'warn'));
    return p;
  }
  // ---- 11 清单 ----
  function pChecklist(r) {
    var p = page('11 90 天行动清单', r);
    p._body.appendChild(banner('11', '90 天行动清单', '由前三件事拆解为可勾选的执行项，按周次排列'));
    var t = h('table', { class: 'tbl checklist' }, [h('tr', {}, [h('th', {}, ['周次']), h('th', {}, ['维度']), h('th', {}, ['执行项']), h('th', {}, ['负责人']), h('th', { class: 'c' }, ['完成'])])]);
    r.checklist.forEach(function (c) { t.appendChild(h('tr', {}, [h('td', {}, [c.week]), h('td', {}, [tag(c.dimensionName, 'dim', 'background:' + c.color + ';margin:0')]), h('td', {}, [c.action + '-' + (c.weekIndex + 1) + '　' + c.item]), h('td', {}, [c.owner]), h('td', { class: 'c' }, [h('span', { class: 'box' })])])); });
    p._body.appendChild(t);
    p._body.appendChild(h('h3', {}, ['11.1  三件事的验收指标']));
    p._body.appendChild(h('table', { class: 'tbl plain' }, [h('tr', {}, [h('th', {}, ['行动']), h('th', {}, ['交付物']), h('th', {}, ['验收指标'])])].concat(r.actions.slice(0, 3).map(function (a) { return h('tr', {}, [h('td', { class: 'b' }, [a.order + '. ' + a.title]), h('td', {}, [a.deliverable]), h('td', {}, [a.kpi])]); }))));
    p._body.appendChild(callout('建议参与复盘的人员', '企业负责人 · 三件事的三位负责人 · 数字化对接人', '90 天后按验收指标逐项复盘，决定是否进入第 4–6 个月行动。', 'ok'));
    return p;
  }
  // ---- 附录 ----
  function pAppendixA(r) {
    var p = page('附录 A 评分明细', r);
    p._body.appendChild(banner('附录 A', '评分明细', '36 题作答与得分，供复核'));
    var t = h('table', { class: 'tbl compact' }, [h('tr', {}, [h('th', {}, ['#']), h('th', {}, ['维度']), h('th', {}, ['子维度']), h('th', {}, ['题目']), h('th', {}, ['所选']), h('th', { class: 'c' }, ['分'])])]);
    r.answers.forEach(function (a, i) { var d = dimOf(a.dimension); t.appendChild(h('tr', {}, [h('td', { class: 'num' }, [String(i + 1)]), h('td', {}, [h('i', { class: 'dot', style: 'background:' + d.color }), d.name]), h('td', {}, [subOf(a.sub).name]), h('td', {}, [a.text]), h('td', {}, [a.optionText]), h('td', { class: 'c num', style: 'font-weight:800' }, [String(a.score)])])); });
    p._body.appendChild(t);
    return p;
  }
  function pAppendixB(r) {
    var p = page('附录 B 信息来源与置信度', r), rt = RT();
    p._body.appendChild(banner('附录 B', '信息来源与置信度', '每类结论的出处与可信度分级'));
    var t = h('table', { class: 'tbl' }, [h('tr', {}, [h('th', {}, ['信息类别']), h('th', {}, ['来源']), h('th', {}, ['置信度'])])]);
    [['企业画像 13 项', '现场填报', '高 · 企业自述'], ['36 题作答与六维得分', '现场作答，按固定规则计分', '高 · 可复核'], ['等级判定', '总分百分比映射五级（' + rt.method.levels + '）', '高 · 规则透明'], ['同行参考带与百分位', '行业细分 × 规模的参考区间（' + r.benchmark.key + '）', '中 · 参考估算，业务侧抽样后更新'], ['子维度诊断与升级行动', '顶呱呱行动库，按维度自身等级匹配', '中 · 通用模板，需结合入企诊断细化'], ['场景推荐', '行业场景库 + 现有系统数据条件', '中 · 方向性判断'], ['风险与合规提示', '合规作答与画像触发的规则', '中 · 提示性质，非法律意见']].forEach(function (row) { t.appendChild(h('tr', {}, [h('td', { class: 'b' }, [row[0]]), h('td', {}, [row[1]]), h('td', {}, [row[2]])])); });
    p._body.appendChild(t);
    p._body.appendChild(h('h3', {}, ['术语']));
    p._body.appendChild(h('table', { class: 'tbl compact plain' }, rt.glossary.map(function (g) { return h('tr', {}, [h('td', { class: 'b', style: 'width:22%' }, [g.term]), h('td', {}, [g.desc])]); })));
    p._body.appendChild(h('h3', {}, ['本次评估的边界']));
    p._body.appendChild(h('p', {}, ['本报告是一次面向决策层的方向判断与共识形成，基于企业自述作答生成；系统开发、数据清洗、完整解决方案设计、政策项目正式申报均不在本次范围内。' + rt.closing]));
    return p;
  }
  function pBack(r) {
    var p = page('', r, 'back'), c = RT().contact;
    var qr = h('div', { html: (function () { try { var q = qrcode(0, 'M'); q.addData(sh.CFG.wechatUrl); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace('<svg', '<svg class="qr"'); } catch (e) { return ''; } })() });
    p._body.appendChild(h('img', { src: sh.CFG.logo, alt: '顶呱呱' }));
    p._body.appendChild(h('div', { class: 'slogan' }, [c.slogan]));
    p._body.appendChild(h('p', { class: 'lead' }, [RT().closing]));
    p._body.appendChild(qr);
    p._body.appendChild(h('div', { class: 'contact' }, [c.company, h('br'), c.address, h('br'), '联系电话 ' + c.phone + ' · ' + c.platform, h('br'), c.cities]));
    p._body.appendChild(h('div', { class: 'disc' }, ['本文件为顶呱呱集团为 ' + r.profile.name + ' 编制的评估成果，含企业作答信息，未经书面许可不得复制、转发或用于其他用途。']));
    return p;
  }

  DGG.registerModule('m1', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
