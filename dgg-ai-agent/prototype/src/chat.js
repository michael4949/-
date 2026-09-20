/* ==========================================================================
   chat.js · 产品页常驻对话坞（m4–m11 每一屏都有）
   ------------------------------------------------------------------
   · 右侧常驻一栏：消息流 + 快捷问句 + 输入框 + 附件按钮，可折叠；竖屏时变底部抽屉。
   · 回答分三层：模块自己的大脑（DGG.chatBrain 登记）→ 页面通用问答（读当前屏的 KPI 与表格）
     → 兜底把本屏能回答的几件事列出来。全部预制，断网可用，不发任何网络请求。
   · 附件：调 DGG.docparse 在本机解析 Word / Excel / PPT / PDF / 邮件，解析结果交给模块大脑，
     模块可据此改页面（新增一行、打开抽屉、改参数…）。
   · 消息按模块留存在内存里（切屏不丢），不使用任何存储 API。

   对外：
     DGG.chatBrain(id, brain)            登记模块大脑
     DGG.chat.dock({ id, name, step, … }) 造一个对话坞（product-ui 的 frame 会调）
     brain = {
       opener(step, api)   → 字符串或 {text, blocks}   进入这一屏时 AI 主动说的一句「发现」
       suggest(step, api)  → [问句…]                   快捷问句
       answer(q, step, api)→ 同上 / null               命中就回答，null 交给通用问答
       onDoc(doc, step, api)→ 同上 / null              上传文档后的回应；doc 见 docparse 的结果
     }
     api = { say, saying, blocks…, go(step), highlight(sel), toast(msg), work() }
   ========================================================================== */
(function () {
  'use strict';
  window.DGG = window.DGG || {};
  var BRAINS = {};
  var LOGS = {};                       /* { 模块 id: [ {who, text, blocks} … ] } */
  var OPENED = {};                     /* { 模块 id + 屏: 1 } 已说过开场发现的屏 */

  function h(tag, attrs, kids) {
    var el = document.createElement(tag), k;
    attrs = attrs || {};
    for (k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el[k] = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c == null) return; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  var ICON = {
    clip: '<path d="M20 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.4 3.4 0 014.8 4.8L10 17a1.8 1.8 0 01-2.5-2.5l7.5-7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    send: '<path d="M4.2 19.6L20.5 12 4.2 4.4l2 7.6-2 7.6z" fill="currentColor"/><path d="M6.2 12h9" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>',
    fold: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    chat: '<path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9" cy="10" r="1.1" fill="currentColor"/><circle cx="12" cy="10" r="1.1" fill="currentColor"/><circle cx="15" cy="10" r="1.1" fill="currentColor"/>',
    word: '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 9l1.6 6 1.9-4.4 1.9 4.4L16.5 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    excel: '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 9l8 6M16 9l-8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    ppt: '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 16V8h3.2a2.4 2.4 0 010 4.8H9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    pdf: '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 16V8h2.6a2.2 2.2 0 010 4.4H8M14 16V8h1.8c1.6 0 2.4 1.4 2.4 4s-.8 4-2.4 4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    eml: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.6 6.4L12 13l8.4-6.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    text: '<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  };
  function svg(name) { return '<svg viewBox="0 0 24 24">' + (ICON[name] || ICON.text) + '</svg>'; }

  /* ---------- 通用问答：直接读当前屏的 KPI 与表格作答 ---------- */
  function scanScreen(work) {
    var kpis = [], rows = [], i;
    if (!work) return { kpis: kpis, rows: rows };
    Array.prototype.forEach.call(work.querySelectorAll('.pd-kpi'), function (el) {
      var k = el.querySelector('.k'), v = el.querySelector('.v'), d = el.querySelector('.d');
      if (k && v) kpis.push({ k: k.textContent.trim(), v: v.textContent.trim(), d: d ? d.textContent.trim() : '' });
    });
    Array.prototype.forEach.call(work.querySelectorAll('.pd-table'), function (tb) {
      var head = Array.prototype.map.call(tb.querySelectorAll('thead th'), function (x) { return x.textContent.trim(); });
      var trs = tb.querySelectorAll('tbody tr');
      for (i = 0; i < Math.min(trs.length, 60); i++) {
        rows.push({ head: head, cells: Array.prototype.map.call(trs[i].children, function (x) { return x.textContent.trim(); }), el: trs[i] });
      }
    });
    return { kpis: kpis, rows: rows };
  }
  function genericAnswer(q, work) {
    var s = scanScreen(work), i, hit;
    q = String(q || '').trim();
    if (!q) return null;
    /* 问到某个 KPI 的名字 */
    for (i = 0; i < s.kpis.length; i++) {
      var name = s.kpis[i].k.replace(/[（(].*$/, '');
      if (name && q.indexOf(name) >= 0) {
        return { text: s.kpis[i].k + '：' + s.kpis[i].v + (s.kpis[i].d ? '，' + s.kpis[i].d : '') + '。' };
      }
    }
    /* 问到表里某一行 */
    for (i = 0; i < s.rows.length; i++) {
      var first = s.rows[i].cells[0] || '';
      if (first.length >= 2 && q.indexOf(first) >= 0) { hit = s.rows[i]; break; }
    }
    if (hit) {
      var pairs = [];
      for (i = 0; i < hit.cells.length; i++) if (hit.cells[i]) pairs.push((hit.head[i] ? hit.head[i] + ' ' : '') + hit.cells[i]);
      return { text: pairs.join(' · '), focus: hit.el };
    }
    /* 卡片里的「标签 → 值」对（接入屏这类没有 KPI 的页面靠它作答） */
    var fields = work ? work.querySelectorAll('.pd-field, .pd-row, .pd-kv > div') : [];
    for (i = 0; i < fields.length; i++) {
      var lab = fields[i].querySelector('label, .k, b'), val = lab && lab.nextElementSibling;
      if (!lab || !val) continue;
      var lt = lab.textContent.trim();
      if (lt.length >= 2 && q.indexOf(lt) >= 0) {
        return { text: lt + '：' + (val.value != null && val.tagName === 'INPUT' ? val.value : val.textContent.trim()), focus: fields[i] };
      }
    }
    /* 关键词落在屏上某一块文字里：把那一块念出来并高亮 */
    var words = q.replace(/[多少几何吗呢的了是有在哪个什么怎么样请问一下？?。，,、\s]/g, '');
    if (words.length >= 2 && work) {
      var pool = work.querySelectorAll('.pd-card .bd li, .pd-card .bd p, .pd-list .it, .pd-kpi, .pd-table tbody tr, .pd-field');
      for (i = 0; i < pool.length; i++) {
        var txt = pool[i].textContent.replace(/\s+/g, ' ').trim();
        if (!txt || txt.length > 90) continue;
        var j, hitN = 0;
        for (j = 0; j + 1 < words.length; j++) if (txt.indexOf(words.substr(j, 2)) >= 0) hitN++;
        if (hitN >= Math.max(1, Math.floor((words.length - 1) * .6))) return { text: txt, focus: pool[i] };
      }
    }
    /* 概览类 */
    if (s.kpis.length) {
      return { text: s.kpis.slice(0, 4).map(function (x) { return x.k + ' ' + x.v; }).join('；') + '。' };
    }
    return null;
  }
  function fallback(work) {
    var s = scanScreen(work);
    if (s.kpis.length) return { text: '这一屏能答：' + s.kpis.slice(0, 4).map(function (x) { return x.k; }).join(' / ') + '。' };
    if (s.rows.length) return { text: '这一屏有 ' + s.rows.length + ' 行明细，可以点名某一行问它的字段。' };
    return { text: '换个问法，或把文档拖进来一起看。' };
  }

  /* ---------- 文档通用回应（模块大脑没接手时） ---------- */
  function docSummary(doc) {
    var L = window.DGG.docparse.label(doc.kind), lines = [];
    if (!doc.ok) return { text: L + '《' + doc.name + '》读不出来：' + doc.note };
    var st = doc.stats || {}, kv = [];
    for (var k in st) if (Object.prototype.hasOwnProperty.call(st, k)) kv.push(k + ' ' + num(st[k]));
    lines.push(L + '《' + doc.name + '》已读完：' + kv.join(' · ') + '。');
    if (doc.note) lines.push(doc.note + '。');
    if (doc.kind === 'excel' && doc.sheets.length) {
      var s0 = doc.sheets[0];
      lines.push('首表《' + s0.name + '》表头：' + (s0.rows[0] || []).slice(0, 8).join(' / ') + '。');
    } else if (doc.kind === 'eml' && doc.mail) {
      lines.push('发件 ' + (doc.mail.from || '—') + '；主题「' + (doc.mail.subject || '—') + '」；' + (doc.mail.date || ''));
    } else if (doc.kind === 'ppt' && doc.slides.length) {
      lines.push('第 1 页标题「' + (doc.slides[0].title || '—') + '」，共 ' + doc.slides.length + ' 页。');
    } else if (doc.paragraphs && doc.paragraphs.length) {
      lines.push('开头：' + doc.paragraphs[0].slice(0, 40) + (doc.paragraphs[0].length > 40 ? '…' : ''));
    }
    return { text: lines.join('\n') };
  }

  /* ---------- 对话坞 ---------- */
  function dock(o) {
    var id = o.id, brain = BRAINS[id] || {}, api = null;
    var log = LOGS[id] || (LOGS[id] = []);
    var msgs = h('div', { class: 'ms' });
    var sug = h('div', { class: 'sug' });
    var input = h('input', { class: 'tx', type: 'text', placeholder: '输入问题', autocomplete: 'off',
      onkeydown: function (e) { if (e.key === 'Enter') { submit(); } } });
    var file = h('input', { type: 'file', class: 'hidden-file', accept: (window.DGG.docparse && window.DGG.docparse.ACCEPT) || '', onchange: function (e) { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) takeFile(f); } });
    var clip = h('button', { class: 'clip', 'aria-label': '上传文档', title: 'Word / Excel / PPT / PDF / 邮件', onclick: function () { file.click(); } }, [h('span', { html: svg('clip') })]);
    var send = h('button', { class: 'send', 'aria-label': '发送', onclick: submit }, [h('span', { html: svg('send') })]);
    var body = h('div', { class: 'bd' }, [msgs, sug, h('div', { class: 'ip' }, [clip, input, send, file])]);
    var fold = h('button', { class: 'fold', 'aria-label': '收起', onclick: function () { root.classList.toggle('off'); } }, [h('span', { html: svg('fold') })]);
    var head = h('div', { class: 'hd' }, [h('span', { class: 'live' }), h('b', {}, [o.name || 'AI']), h('span', { class: 'sp' }), fold]);
    var tab = h('button', { class: 'tab', 'aria-label': '展开', onclick: function () { root.classList.remove('off'); } }, [h('span', { html: svg('chat') })]);
    var root = h('aside', { class: 'pd-chat' }, [tab, head, body]);

    function scroll() { msgs.scrollTop = msgs.scrollHeight; }
    function bubble(who) {
      var bb = h('div', { class: 'bb' });
      var row = h('div', { class: 'm ' + who }, who === 'ai' ? [h('div', { class: 'av' }, [h('span', { html: svg('chat') })]), bb] : [bb]);
      msgs.appendChild(row); scroll();
      return bb;
    }
    function putBlocks(bb, blocks) {
      (blocks || []).forEach(function (b) { if (b) bb.appendChild(b); });
      scroll();
    }
    /* 逐字显示：AI 的回答一个字一个字出来，是这个展台最该有的动效 */
    function type(bb, text, done) {
      var i = 0, span = h('span', { class: 'tw' });
      bb.appendChild(span);
      var t0 = 0;
      function step(t) {
        if (!t0) t0 = t;
        var want = Math.min(text.length, Math.round((t - t0) / 1000 * 46) + 1);   /* 约 46 字 / 秒 */
        if (want > i) { i = want; span.innerHTML = esc(text.slice(0, i)).replace(/\n/g, '<br>'); scroll(); }
        if (i < text.length) requestAnimationFrame(step); else if (done) done();
      }
      requestAnimationFrame(step);
    }
    function thinking() {
      var bb = bubble('ai');
      bb.appendChild(h('span', { class: 'dots', html: '<i></i><i></i><i></i>' }));
      return bb;
    }
    function record(who, text, blocks) { log.push({ who: who, text: text, blocks: blocks || null }); if (log.length > 120) log.shift(); }

    function say(text, blocks, opt) {
      opt = opt || {};
      var bb = opt.into || thinking();
      var delay = opt.now ? 0 : 260 + Math.min(420, String(text || '').length * 6);
      setTimeout(function () {
        bb.innerHTML = '';
        type(bb, String(text || ''), function () { putBlocks(bb, blocks); if (opt.after) opt.after(); });
        record('ai', text, null);
      }, delay);
      return bb;
    }
    function mine(text) { var bb = bubble('me'); bb.textContent = text; record('me', text); scroll(); }

    function apply(res, bb) {
      if (!res) return;
      if (typeof res === 'string') res = { text: res };
      say(res.text, res.blocks, { into: bb, after: function () {
        if (res.focus) focus(res.focus);
        if (typeof res.act === 'function') { try { res.act(api); } catch (e) { /* 忽略 */ } }
      } });
    }
    function focus(el) {
      if (!el || !el.classList) return;
      el.classList.add('chat-focus');
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* 忽略 */ }
      setTimeout(function () { el.classList.remove('chat-focus'); }, 2600);
    }

    function ask(q) {
      q = String(q || '').trim();
      if (!q) return;
      mine(q);
      var bb = thinking();
      setTimeout(function () {
        var res = null;
        try { res = brain.answer ? brain.answer(q, o.step, api) : null; } catch (e) { res = null; }
        if (!res) res = genericAnswer(q, o.work && o.work());
        if (!res) res = fallback(o.work && o.work());
        apply(res, bb);
      }, 120);
    }
    function submit() { var v = input.value; input.value = ''; ask(v); }

    function takeFile(f) {
      var kind = window.DGG.docparse.kindOf(f.name);
      var card = h('div', { class: 'doc ' + kind }, [
        h('span', { class: 'ic', html: svg(kind) }),
        h('div', { class: 'tt' }, [h('b', {}, [f.name]), h('span', {}, [window.DGG.docparse.label(kind) + ' · ' + window.DGG.docparse.sizeText(f.size)])]),
        h('span', { class: 'bar' }, [h('i', {})])
      ]);
      var bb = bubble('me'); bb.appendChild(card); scroll();
      record('me', f.name);
      var wait = thinking();
      window.DGG.docparse.parse(f).then(function (doc) {
        card.classList.add('done');
        var res = null;
        try { res = brain.onDoc ? brain.onDoc(doc, o.step, api) : null; } catch (e) { res = null; }
        if (!res) res = docSummary(doc);
        apply(res, wait);
      });
    }

    function setSuggest(list) {
      sug.innerHTML = '';
      (list || []).slice(0, 4).forEach(function (q) {
        sug.appendChild(h('button', { onclick: function () { ask(q); } }, [q]));
      });
      sug.style.display = (list && list.length) ? '' : 'none';
    }

    api = {
      say: function (t, b) { return say(t, b); },
      ask: ask,
      focus: focus,
      work: function () { return o.work && o.work(); },
      go: function (step) { if (o.onGo) o.onGo(step); },
      suggest: setSuggest,
      el: root
    };

    /* 回放本模块之前的消息（切屏不丢） */
    log.forEach(function (m) {
      var bb = bubble(m.who);
      bb.innerHTML = esc(m.text || '').replace(/\n/g, '<br>');
    });

    /* 进入这一屏时，AI 主动说一条「发现」（每屏只说一次） */
    var key = id + '/' + (o.step || '');
    if (!OPENED[key]) {
      OPENED[key] = 1;
      setTimeout(function () {
        var res = null;
        try { res = brain.opener ? brain.opener(o.step, api) : null; } catch (e) { res = null; }
        if (res) apply(res, thinking());
      }, 520);
    }
    setTimeout(function () {
      var list = null;
      try { list = brain.suggest ? brain.suggest(o.step, api) : null; } catch (e) { list = null; }
      setSuggest(list || []);
      scroll();
    }, 0);

    return root;
  }

  window.DGG.chatBrain = function (id, brain) { BRAINS[id] = brain; };
  window.DGG.chat = { dock: dock, brains: BRAINS, reset: function (id) { if (id) { delete LOGS[id]; } else { LOGS = {}; } } };
})();
