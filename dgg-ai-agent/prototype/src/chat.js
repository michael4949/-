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
     brain 有两种写法，推荐第一种：
       一、交给内核（与 skill 同一份实现，原型与通用包永远一致）
         { kernel, ctx, act }
           kernel  skill 内核对象，需实现 screens / brief / suggest / ask / ingest
           ctx()   → { data, lib, result }  当前业务数据、固定数据包、run() 结果
           act(a, api) → true 表示这条声明式动作已被模块处理；返回 false / 不实现则走通用兜底
       二、自己实现（旧写法，仍然支持）
         { opener(step, api), suggest(step, api), answer(q, step, api), onDoc(doc, step, api) }

     内核侧签名（平台中立，通用包按同一套暴露成动作）：
       screens()                                → [{key,label}]
       brief(step, data, lib, result?)          → 字符串 / {text, blocks?, act?, ref?} / null
       suggest(step, data, lib, result?)        → [问句…]
       ask(question, step, data, lib, result?)  → {text, blocks?, act?, ref?} / null
       ingest(doc, step, data, lib, result?)    → {text, blocks?, act?, data?} / null
     回答里的 blocks 是平台中立的纯数据，不是 DOM：
       {type:'kv',    rows:[[键,值]…]}
       {type:'table', head:[…], rows:[[…]…]}
       {type:'tags',  items:[…]}
       {type:'text',  text:'…'}
       {type:'chart', chart:'column|bar|stack|line|area|donut|funnel|gauge|radar|waterfall|progress|heat|scatter',
                      title, unit, labels[], series:[{name,data[]}], total / target / max / value / rows / matrix …}
     内核没给 chart 时，DGG.chartspec 会替「整列同一单位」的 table / kv 自动配一张图（智能问数的效果）；
     图由 DGG.chatChart 画成 2.5D 的 SVG。换平台时这两步都可以不做，块本身仍然是纯数据。
     act 是声明式动作，平台可以只实现子集，未知 type 一律忽略且不报错：
       {type:'goto',  step}                切到某一屏
       {type:'focus', ref}                 高亮某条业务记录（页面上用 data-ref 标出）
       {type:'open',  panel, ref}          打开下钻 / 抽屉
       {type:'apply', action, input}       调用本 skill 的某个动作（通常是写回类）
       {type:'set',   path, value}         改一个参数后重算
       {type:'click', aim}                 替客户点这一屏该点的按钮（按钮文字前缀匹配）
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

  /* ---------- 图表：块 → 2.5D SVG ---------- */
  /* 当前模块主色：读 body 上的 --m-pa（换屏重建对话坞时 .pd-app 还没挂进文档，读它会拿到上一屏的色） */
  function accentNow() {
    var c = '';
    if (window.getComputedStyle) {
      c = (window.getComputedStyle(document.body).getPropertyValue('--m-pa') || '').trim();
      if (!c) { var app = document.querySelector('.pd-app'); if (app) c = (window.getComputedStyle(app).getPropertyValue('--pa') || '').trim(); }
    }
    return c || '#2a78d6';
  }
  /* 自动配图的规则在 skills/_shared/chartspec.js（Node 与浏览器同一份，自测与展示同一套判断） */
  function enrich(list) {
    var C = window.DGG.chartspec;
    return C ? C.promote(list || []) : (list || []);
  }

  /* ---------- 平台中立的块 → DOM（气泡里的小表 / 键值 / 标签） ---------- */
  function renderBlock(b) {
    if (!b) return null;
    if (b.nodeType === 1) return b;                     /* 已经是 DOM，直接用 */
    if (!b.type) return null;
    if (b.type === 'text') return h('div', { class: 'tx' }, [String(b.text == null ? '' : b.text)]);
    if (b.type === 'kv') {
      var kv = h('div', { class: 'kv' });
      (b.rows || []).forEach(function (r) {
        kv.appendChild(h('span', {}, [String(r[0] == null ? '' : r[0])]));
        kv.appendChild(h('span', {}, [String(r[1] == null ? '' : r[1])]));
      });
      return kv;
    }
    if (b.type === 'table') {
      var t = h('table', { class: 'mini' });
      if (b.head && b.head.length) {
        var tr = h('tr', {});
        b.head.forEach(function (x) { tr.appendChild(h('th', {}, [String(x == null ? '' : x)])); });
        t.appendChild(h('thead', {}, [tr]));
      }
      var tb = h('tbody', {});
      (b.rows || []).forEach(function (r) {
        var line = h('tr', {});
        (r || []).forEach(function (x) { line.appendChild(h('td', {}, [String(x == null ? '' : x)])); });
        tb.appendChild(line);
      });
      t.appendChild(tb);
      return t;
    }
    if (b.type === 'chart') {
      if (!window.DGG.chatChart) return null;
      var node = window.DGG.chatChart.render(b, { width: 286, accent: accentNow() });
      if (!node) return null;
      return h('div', { class: 'cc' }, [node]);
    }
    if (b.type === 'list') {
      var ul = h(b.ordered === false ? 'ul' : 'ol', { class: 'li' });
      (b.items || []).forEach(function (x) { ul.appendChild(h('li', {}, [String(x == null ? '' : x)])); });
      return ul;
    }
    if (b.type === 'metric') {
      var mt = h('div', { class: 'mt' });
      (b.items || []).slice(0, 4).forEach(function (x) {
        mt.appendChild(h('div', { class: 'it' + (x.tone ? ' ' + x.tone : '') }, [
          h('span', { class: 'k' }, [String(x.label == null ? '' : x.label)]),
          h('b', {}, [String(x.value == null ? '' : x.value) + (x.unit || '')]),
          x.sub ? h('span', { class: 'd' }, [String(x.sub)]) : null
        ]));
      });
      return mt;
    }
    if (b.type === 'tags') {
      var g = h('div', { class: 'tags' });
      (b.items || []).forEach(function (x) { g.appendChild(h('span', {}, [String(x == null ? '' : x)])); });
      return g;
    }
    return null;                                         /* 不认识的块型静默忽略 */
  }
  function renderBlocks(list) {
    var out = [];
    enrich(list).forEach(function (b) { var n = renderBlock(b); if (n) out.push(n); });
    return out;
  }

  /* ---------- 把内核大脑接成对话坞大脑 ---------- */
  function derive(brain) {
    if (!brain || !brain.kernel || typeof brain.ctx !== 'function') return brain || {};
    var K = brain.kernel;
    function c() { var x = brain.ctx() || {}; return [x.data, x.lib, x.result]; }
    return {
      kernel: K, ctx: brain.ctx, act: brain.act,
      opener: brain.opener || function (step) { var a = c(); return K.brief ? K.brief(step, a[0], a[1], a[2]) : null; },
      suggest: brain.suggest || function (step) { var a = c(); return K.suggest ? K.suggest(step, a[0], a[1], a[2]) : null; },
      answer: brain.answer || function (q, step) { var a = c(); return K.ask ? K.ask(q, step, a[0], a[1], a[2]) : null; },
      onDoc: brain.onDoc || function (doc, step) { var a = c(); return K.ingest ? K.ingest(doc, step, a[0], a[1], a[2]) : null; }
    };
  }

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
    var id = o.id, brain = derive(BRAINS[id]), api = null;
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
      renderBlocks(blocks).forEach(function (b) {
        if (b.className === 'cc') bb.classList.add('wide');      /* 带图的回答给更宽的版面 */
        bb.appendChild(b);
      });
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
    /* 留存时把块一起留下（只留纯数据的，DOM 节点不能跨次渲染搬） */
    function record(who, text, blocks) {
      var keep = null;
      if (blocks && blocks.length) { keep = blocks.filter(function (b) { return b && !b.nodeType; }); if (!keep.length) keep = null; }
      log.push({ who: who, text: text, blocks: keep });
      if (log.length > 120) log.shift();
    }

    function say(text, blocks, opt) {
      opt = opt || {};
      var bb = opt.into || thinking();
      var delay = opt.now ? 0 : 260 + Math.min(420, String(text || '').length * 6);
      setTimeout(function () {
        bb.innerHTML = '';
        type(bb, String(text || ''), function () { putBlocks(bb, blocks); if (opt.after) opt.after(); });
        record('ai', text, blocks);
      }, delay);
      return bb;
    }
    function mine(text) { var bb = bubble('me'); bb.textContent = text; record('me', text); scroll(); }

    /* ---------- 替客户操作这一屏 ---------- */
    function labelOf(el2) { return ((el2 && el2.textContent) || '').replace(/\s+/g, ' ').trim(); }
    function findBtn(aim) {
      var w = o.work && o.work();
      if (!w || !aim) return null;
      var list = w.querySelectorAll('button:not([disabled]), a[role="button"]'), i, el2, t;
      var s2 = String(aim).replace(/\s+/g, '');
      for (i = 0; i < list.length; i++) {
        el2 = list[i];
        if (el2.offsetParent === null) continue;
        t = labelOf(el2).replace(/\s+/g, '');
        if (t && t.indexOf(s2) === 0) return el2;
      }
      for (i = 0; i < list.length; i++) {                        /* 退一步：包含也算 */
        el2 = list[i];
        if (el2.offsetParent === null) continue;
        t = labelOf(el2).replace(/\s+/g, '');
        if (t && s2.length >= 2 && t.indexOf(s2) >= 0) return el2;
      }
      return null;
    }
    /* 先把按钮亮出来给客户看清楚，再替他按下去 —— 展台上要让人看见「AI 动了哪一下」 */
    function press(el2) {
      if (!el2) return false;
      focus(el2);
      setTimeout(function () { try { el2.click(); } catch (e) { /* 忽略 */ } }, 560);
      return true;
    }
    /* 这一屏该点哪：跟引导箭头指的是同一个按钮，两处说法永远一致 */
    function aimBtn() {
      var t = null;
      try { t = window.DGG.guide && window.DGG.guide.target ? window.DGG.guide.target() : null; } catch (e) { t = null; }
      if (t && t.offsetParent !== null) return t;
      var w = o.work && o.work();
      if (!w) return null;
      var m = w.querySelector('[data-guide]:not([disabled])');
      if (m && m.offsetParent !== null) return m;
      var p = w.querySelector('.pd-btn.primary:not([disabled])');
      return p && p.offsetParent !== null ? p : null;
    }
    /* 流程类问句在任何一屏都能答，也都能替客户点下去 */
    function flowIntent(q) {
      var s2 = String(q || '').replace(/[\s。.!！?？]/g, ''), m, t;
      if (!s2) return null;
      m = s2.match(/^(?:帮我|请|麻烦|你)?(?:点一下|点击一下|点击|点|按一下|按|执行|运行|触发|去)(.{2,12})$/);
      if (m) {
        t = findBtn(m[1]);
        if (t) return { text: '这就点「' + labelOf(t) + '」。', act: { type: 'click', aim: labelOf(t) } };
      }
      if (/^(下一步|继续|接下来|然后呢|再然后|走下去|往下走)/.test(s2) || /(该点哪|点哪里|点哪儿|怎么操作|下一步做什么|接下来做什么|现在做什么|下一步点什么)/.test(s2)) {
        t = aimBtn();
        if (t) return { text: '这一屏点「' + labelOf(t) + '」，我替你点。', act: { type: 'click', aim: labelOf(t) } };
        return { text: '这一屏看完了，走屏底那条「下一步」。', act: { type: 'click', aim: '下一步' } };
      }
      return null;
    }

    function findRef(ref) {
      var w = o.work && o.work();
      if (!w || ref == null) return null;
      var list = w.querySelectorAll('[data-ref]'), i, s2 = String(ref);
      for (i = 0; i < list.length; i++) if (list[i].getAttribute('data-ref') === s2) return list[i];
      return null;
    }
    /* 声明式动作派发：先给模块自己处理，模块不接的给通用兜底，不认识的静默忽略 */
    function applyAct(a) {
      if (!a || !a.type) return;
      if (brain.act) { try { if (brain.act(a, api) !== false) return; } catch (e) { /* 落到兜底 */ } }
      if (a.type === 'click') { press(findBtn(a.aim || a.text) || (a.ref != null ? findRef(a.ref) : null)); return; }
      if (a.type === 'goto' && a.step) { api.go(a.step); return; }
      if ((a.type === 'focus' || a.type === 'open') && a.ref != null) { var el = findRef(a.ref); if (el) focus(el); }
    }
    function apply(res, bb) {
      if (!res) return;
      if (typeof res === 'string') res = { text: res };
      say(res.text, res.blocks, { into: bb, after: function () {
        if (res.focus && res.focus.nodeType === 1) focus(res.focus);
        else if (res.ref != null) { var el = findRef(res.ref); if (el) focus(el); }
        if (typeof res.act === 'function') { try { res.act(api); } catch (e) { /* 忽略 */ } }
        else if (res.act) applyAct(res.act);
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
        try { res = flowIntent(q); } catch (e) { res = null; }        /* 「下一步」「点一下 XX」在任何一屏都先按操作处理 */
        if (!res) { try { res = brain.answer ? brain.answer(q, o.step, api) : null; } catch (e2) { res = null; } }
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
      list = (list || []).slice(0, 4);
      list.push('下一步点哪');                                    /* 哪一屏都多留一条，问完直接替客户点下去 */
      list.forEach(function (q) {
        sug.appendChild(h('button', { onclick: function () { ask(q); } }, [q]));
      });
      sug.style.display = '';
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

    /* 回放本模块之前的消息（切屏不丢）：文字与图都要回来，不然一换屏图就没了 */
    log.forEach(function (m) {
      var bb = bubble(m.who);
      bb.innerHTML = esc(m.text || '').replace(/\n/g, '<br>');
      if (m.blocks && m.blocks.length) putBlocks(bb, m.blocks);
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
  window.DGG.chat = { dock: dock, brains: BRAINS, blocks: renderBlocks, block: renderBlock, reset: function (id) { if (id) { delete LOGS[id]; } else { LOGS = {}; } } };
})();
