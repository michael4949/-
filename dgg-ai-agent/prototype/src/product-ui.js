/* 产品 UI 组件库：八个产品模块共用的一套语言
 * frame（左导航 + 面包屑 + 页签 + 工作区）· kpi · chip · table（可排序）· bar · heat · gantt（SVG）· drawer · compare · judge · action · spark · toast
 * 依赖外壳的 h()；不用任何存储 API；无外部资源
 */
(function () {
  'use strict';
  var sh = null, h = null;
  function init(shell) { sh = shell; h = sh.h; }
  function svg(tag, attrs, kids) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function fmtN(n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function node(x) { return typeof x === 'string' || typeof x === 'number' ? document.createTextNode(String(x)) : x; }

  // 八个产品模块（左导航用）：与外壳首页宫格一致的图标
  var ICONS = {
    m4:  '<circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c.8-4 3.9-6 7.5-6s6.7 2 7.5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    m5:  '<path d="M12 3l2.2 2.4 3.2-.5.6 3.2 2.9 1.5-1.4 2.9 1.4 2.9-2.9 1.5-.6 3.2-3.2-.5L12 21l-2.2-2.4-3.2.5-.6-3.2-2.9-1.5 1.4-2.9-1.4-2.9 2.9-1.5.6-3.2 3.2.5z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    m6:  '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 9.5h6M9 12h6M12 7v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    m7:  '<path d="M12 4v16M5 20h14M4 9l8-3 8 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 9l-2.5 6h5zM20 9l-2.5 6h5z" fill="currentColor" opacity=".3"/>',
    m8:  '<rect x="3" y="4" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="15" y="4" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="9" y="15" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 9v3h12V9M12 12v3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    m9:  '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" opacity=".35" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    m10: '<path d="M3 20V9l5 3V9l5 3V9l5 3v8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M17 12V5h3v7" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7" y="15" width="3" height="3" fill="currentColor" opacity=".35"/><rect x="13" y="15" width="3" height="3" fill="currentColor" opacity=".35"/>',
    m11: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 5l-3 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };
  var MODULES = [
    { id: 'm4', name: 'AI获客' }, { id: 'm5', name: 'AI人力官' }, { id: 'm6', name: 'AI CFO' }, { id: 'm7', name: 'AI法务' },
    { id: 'm8', name: 'AI流程提效' }, { id: 'm9', name: 'AI决策' }, { id: 'm10', name: 'AI ERP' }, { id: 'm11', name: 'AI软件开发' }
  ];
  function navModules(activeId) {
    return MODULES.map(function (m) { return { id: m.id, name: m.name, icon: ICONS[m.id], on: m.id === activeId, disabled: !(sh.isBuilt && sh.isBuilt(m.id)), onClick: function () { if (m.id !== activeId) sh.go(m.id); } }; });
  }

  var STATUS = { ok: '正常', risk: '风险', late: '延期', handled: '已处置', done: '已完工', watch: '跟踪', short: '缺口', safety: '低于安全库存', accent: '' };

  /* ---------- 框架 ---------- */
  function frame(o) {
    var root = h('div', { class: 'pd-app ' + (o.cls || ''), style: o.accent ? '--pa:' + o.accent.pa + ';--pa-soft:' + o.accent.soft + ';--pa-ink:' + o.accent.ink : '' });
    var nav = h('nav', { class: 'pd-nav' }, [h('div', { class: 'mark' }, [o.mark || 'AI'])]);
    (o.modules || []).forEach(function (m) {
      nav.appendChild(h('button', { class: 'item' + (m.on ? ' on' : ''), disabled: !!m.disabled, onclick: function () { if (!m.disabled && m.onClick) m.onClick(m); } }, [
        h('span', { html: '<svg viewBox="0 0 24 24">' + m.icon + '</svg>' }), h('span', { class: 'tip' }, [m.name + (m.disabled ? ' · 待上线' : '')])
      ]));
    });
    nav.appendChild(h('div', { class: 'spacer' }));
    if (o.stamp) nav.appendChild(h('div', { class: 'stamp' }, [o.stamp]));
    var crumb = h('div', { class: 'crumb' });
    (o.crumbs || []).forEach(function (c, i) { if (i) crumb.appendChild(h('span', { class: 'sep' }, ['›'])); crumb.appendChild(i === o.crumbs.length - 1 ? h('b', {}, [c]) : h('span', {}, [c])); });
    var co = h('div', { class: 'co' }, [h('span', { class: 'dot' }), h('span', {}, [o.company ? o.company.name : '']), o.company && o.company.meta ? h('span', { class: 'meta' }, [o.company.meta]) : null]);
    var tabs = h('div', { class: 'pd-tabs' });
    var tabEls = {};
    (o.tabs || []).forEach(function (t, i) {
      var b = h('button', { class: 'tab' + (t.key === o.active ? ' on' : ''), disabled: !!t.disabled, onclick: function () { if (!t.disabled && o.onTab) o.onTab(t.key); } }, [
        h('span', { class: 'n' }, [String(i + 1)]), h('span', {}, [t.label]), t.badge ? h('span', { class: 'badge' }, [String(t.badge)]) : null
      ]);
      tabEls[t.key] = b; tabs.appendChild(b);
    });
    var top = h('div', { class: 'pd-top' }, [h('div', { class: 'row' }, [crumb, co]), tabs]);
    var work = h('div', { class: 'pd-work' });
    var body = h('div', { class: 'pd-body' }, [top, work]);
    root.appendChild(nav); root.appendChild(body);
    return { root: root, work: work, body: body, tabs: tabEls };
  }

  /* ---------- 基础件 ---------- */
  function kpi(o) {
    var el = h(o.onClick ? 'button' : 'div', { class: 'pd-kpi' + (o.tone ? ' ' + o.tone : '') + (o.onClick ? ' click' : '') + (o.active ? ' on' : ''), onclick: o.onClick }, [
      h('div', { class: 'k' }, [o.label]),
      h('div', { class: 'v num' }, [node(o.value), o.unit ? h('span', { class: 'u' }, [o.unit]) : null]),
      o.sub ? h('div', { class: 'd' }, [node(o.sub)]) : null
    ]);
    return el;
  }
  function kpis(list) { var g = h('div', { class: 'pd-kpis' }); list.forEach(function (x) { g.appendChild(kpi(x)); }); return g; }
  function chip(tone, text, plain) { return h('span', { class: 'pd-chip ' + tone + (plain ? ' plain' : '') }, [text != null ? text : STATUS[tone] || tone]); }
  function bar(pct, tone, label) {
    var p = Math.max(0, Math.min(100, pct));
    return h('span', { class: 'pd-bar' + (tone ? ' ' + tone : '') }, [h('span', { class: 'trk' }, [h('i', { style: 'width:' + p + '%' })]), h('span', { class: 'n num' }, [label != null ? label : pct + '%'])]);
  }
  function card(o) {
    var hd = o.title != null ? h('div', { class: 'hd' }, [h('span', { class: 't' }, [o.title]), o.sub ? h('span', { class: 's' }, [o.sub]) : null, o.extra ? h('div', { class: 'x' }, [].concat(o.extra)) : null]) : null;
    var bd = h('div', { class: 'bd' + (o.tight ? ' tight' : '') }, [].concat(o.body || []).map(node));
    var el = h('div', { class: 'pd-card' + (o.cls ? ' ' + o.cls : '') + (o.accent ? ' accent' : ''), style: o.style }, [hd, bd, o.foot ? h('div', { class: 'ft' }, [].concat(o.foot).map(node)) : null]);
    el.body = bd; return el;
  }
  function btn(text, o) { o = o || {}; return h('button', { class: 'pd-btn' + (o.cls ? ' ' + o.cls : ''), disabled: !!o.disabled, onclick: o.onClick, title: o.title }, [].concat(text).map(node)); }
  function kv(pairs) { var g = h('div', { class: 'pd-kv' }); pairs.forEach(function (p) { if (p[1] == null || p[1] === '') return; g.appendChild(h('span', { class: 'k' }, [p[0]])); g.appendChild(h('span', { class: 'v' }, [node(p[1])])); }); return g; }
  function empty(text) { return h('div', { class: 'pd-empty' }, [text]); }
  function item(o) {
    return h(o.onClick ? 'button' : 'div', { class: 'pd-item' + (o.onClick ? ' click' : ''), onclick: o.onClick }, [
      h('span', { class: 'ic ' + (o.tone || 'accent') }, [o.icon || '']),
      h('span', { class: 'm' }, [h('span', { class: 't' }, [node(o.title)]), o.sub ? h('span', { class: 's' }, [node(o.sub)]) : null]),
      h('span', { class: 'r num' }, [node(o.right || ''), o.rightSub ? h('span', { class: 's' }, [node(o.rightSub)]) : null])
    ]);
  }

  /* ---------- 可排序表 ---------- */
  function table(o) {
    var state = { key: o.sortKey || null, dir: o.sortDir || 'asc', rows: o.rows || [] };
    var tbl = h('table', { class: 'pd-table' + (o.compact ? ' compact' : '') });
    var thead = h('thead'), tbody = h('tbody');
    tbl.appendChild(thead); tbl.appendChild(tbody);
    function head() {
      clear(thead);
      var tr = h('tr');
      o.cols.forEach(function (c) {
        var th = h('th', { class: (c.align || '') + (c.sort ? ' sortable' : ''), style: c.w ? 'width:' + c.w : null, onclick: c.sort ? function () { if (state.key === c.key) state.dir = state.dir === 'asc' ? 'desc' : 'asc'; else { state.key = c.key; state.dir = c.sortDesc ? 'desc' : 'asc'; } head(); body(); } : null }, [c.label, state.key === c.key ? h('span', { class: 'arr' }, [state.dir === 'asc' ? '▲' : '▼']) : null]);
        tr.appendChild(th);
      });
      thead.appendChild(tr);
    }
    function sorted() {
      var rows = state.rows.slice();
      if (!state.key) return rows;
      var col = o.cols.filter(function (c) { return c.key === state.key; })[0];
      var get = col && typeof col.sort === 'function' ? col.sort : function (r) { return r[state.key]; };
      rows.sort(function (a, b) { var x = get(a), y = get(b); if (x == null) x = ''; if (y == null) y = ''; var r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'zh'); return state.dir === 'asc' ? r : -r; });
      return rows;
    }
    function body() {
      clear(tbody);
      var rows = sorted();
      if (!rows.length) { tbody.appendChild(h('tr', {}, [h('td', { colspan: String(o.cols.length) }, [empty(o.empty || '暂无数据')])])); return; }
      rows.forEach(function (r) {
        var key = o.rowKey ? o.rowKey(r) : null;
        var tr = h('tr', { class: (o.onRow ? 'click ' : '') + (o.activeKey != null && key === o.activeKey ? 'on ' : '') + (o.rowClass ? o.rowClass(r) || '' : ''), onclick: o.onRow ? function () { o.onRow(r); } : null });
        o.cols.forEach(function (c) {
          var v = c.render ? c.render(r) : r[c.key];
          tr.appendChild(h('td', { class: (c.align || '') + (c.cls ? ' ' + c.cls : ''), title: typeof v === 'string' ? v : null }, [v == null ? '' : node(v)]));
        });
        tbody.appendChild(tr);
      });
    }
    head(); body();
    tbl.update = function (rows) { state.rows = rows; body(); };
    return tbl;
  }

  /* ---------- 负荷热力 ---------- */
  function heat(o) {
    var days = o.days;
    var g = h('div', { class: 'pd-heat', style: 'grid-template-columns:' + (o.labelW || '150px') + ' repeat(' + days.length + ', minmax(0,1fr))' });
    g.appendChild(h('div'));
    days.forEach(function (d) { g.appendChild(h('div', { class: 'head' + (d.rest ? ' rest' : '') }, [d.label + (o.wd ? ' ' + d.wd : '')])); });
    o.rows.forEach(function (r) {
      g.appendChild(h('div', { class: 'lbl', title: r.label }, [r.label]));
      r.cells.forEach(function (c) {
        var lv = c.rest ? 'rest' : c.pct <= 0 ? 'l0' : c.pct < 50 ? 'l1' : c.pct < 85 ? 'l2' : c.pct < 100 ? 'l3' : 'l4';
        g.appendChild(h('div', { class: 'cell ' + lv + (c.ot ? ' ot' : ''), title: c.title || '' }, [c.rest ? '休' : c.pct + '']));
      });
    });
    return g;
  }

  /* ---------- 甘特（SVG） ---------- */
  var TONES = {
    done: { fill: '#D5DAE6', text: '#1A2233', dark: true },
    prog: { fill: 'var(--pa-ink)', text: '#fff' },
    plan: { fill: 'var(--pa)', text: '#fff' },
    late: { fill: '#D9483B', text: '#fff' },
    ok: { fill: '#22A06B', text: '#fff' },
    hand: { fill: '#4974F6', text: '#fff' },
    waitmat: { fill: '#FDF3E1', stroke: '#E8A33D', text: '#A8690F', dark: true, dash: true },
    waitcap: { fill: '#EEF1F6', stroke: '#98A2B8', text: '#5A6478', dark: true, dash: true },
    ghost: { fill: '#F6F8FD', stroke: '#C9D4F0', text: '#98A2B8', dark: true, dash: true },
    partB: { fill: '#F0A05A', text: '#fff' }
  };
  function gantt(o) {
    var days = o.days, labelW = o.labelW || 170, dayW = o.dayW || 42, rowH = o.rowH || 38, headH = 34;
    var W = labelW + days.length * dayW, H = headH + o.rows.length * rowH + 6;
    var s = svg('svg', { class: 'pd-gantt', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMinYMin meet' });
    // 休息日底色 + 日期轴
    var ax = svg('g', { class: 'ax' });
    days.forEach(function (d, i) {
      var x = labelW + i * dayW;
      if (d.rest) ax.appendChild(svg('rect', { x: x, y: headH, width: dayW, height: H - headH, fill: '#F3F5FA' }));
      ax.appendChild(svg('line', { x1: x, y1: headH, x2: x, y2: H, stroke: '#EEF1F7' }));
      var t = svg('text', { x: x + dayW / 2, y: 14, 'text-anchor': 'middle', class: d.rest ? 'rest' : '' }, [d.label]);
      ax.appendChild(t);
      if (d.wd) ax.appendChild(svg('text', { x: x + dayW / 2, y: 27, 'text-anchor': 'middle', class: d.rest ? 'rest' : '', style: 'font-size:10px' }, ['周' + d.wd]));
    });
    ax.appendChild(svg('line', { x1: 0, y1: headH, x2: W, y2: headH, stroke: '#DFE5F1' }));
    s.appendChild(ax);
    o.rows.forEach(function (r, i) {
      var y = headH + i * rowH;
      s.appendChild(svg('line', { x1: 0, y1: y + rowH, x2: W, y2: y + rowH, stroke: '#EEF1F7' }));
      s.appendChild(svg('text', { x: 10, y: y + (r.sub ? 16 : rowH / 2 + 4), class: 'row-lbl' }, [r.label]));
      if (r.sub) s.appendChild(svg('text', { x: 10, y: y + 29, class: 'row-sub' }, [r.sub]));
      (r.bars || []).forEach(function (b) {
        if (b.s == null || b.e == null) return;
        var x0 = labelW + Math.max(0, b.s) * dayW, x1 = labelW + Math.min(days.length, b.e) * dayW;
        if (b.e > days.length && b.s < days.length) x1 = W - 2;
        if (b.s >= days.length) return;
        var w = Math.max(3, x1 - x0), tn = TONES[b.tone] || TONES.plan;
        var rect = svg('rect', { x: x0, y: y + 8, width: w, height: rowH - 16, rx: 4, fill: tn.fill, stroke: tn.stroke || 'none', 'stroke-dasharray': tn.dash ? '3 2' : null });
        if (b.title) rect.appendChild(svg('title', {}, [b.title]));
        s.appendChild(rect);
        if (b.label && w > 30) s.appendChild(svg('text', { x: x0 + 6, y: y + rowH / 2 + 4, class: 'bar-lbl' + (tn.dark ? ' dark' : ''), fill: tn.text }, [b.label]));
        if (b.e > days.length) s.appendChild(svg('text', { x: W - 4, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'bar-lbl', fill: tn.text }, ['→']));
      });
      if (r.note) s.appendChild(svg('text', { x: labelW + 6, y: y + rowH / 2 + 4, class: 'note' }, [r.note]));
      if (r.due != null && r.due + 1 <= days.length) {
        var dx = labelW + (r.due + 1) * dayW;
        s.appendChild(svg('line', { x1: dx, y1: y + 4, x2: dx, y2: y + rowH - 4, stroke: '#D9483B', 'stroke-width': 2, 'stroke-dasharray': '4 2' }));
        if (r.dueLabel) s.appendChild(svg('text', { x: dx + 3, y: y + 12, class: 'today-lbl' }, [r.dueLabel]));
      }
    });
    // 今天线
    var tx = labelW + (o.todayIdx || 0) * dayW;
    s.appendChild(svg('line', { x1: tx, y1: headH - 4, x2: tx, y2: H, stroke: '#D9483B', 'stroke-width': 1.5 }));
    s.appendChild(svg('text', { x: tx + 3, y: headH - 6, class: 'today-lbl' }, ['今天']));
    if (o.marks) o.marks.forEach(function (m) {
      var mx = labelW + (m.d + 1) * dayW;
      s.appendChild(svg('line', { x1: mx, y1: headH, x2: mx, y2: H, stroke: m.color || '#D9483B', 'stroke-width': 2, 'stroke-dasharray': '4 2' }));
      s.appendChild(svg('text', { x: mx + 3, y: headH + 12, class: 'today-lbl', style: 'fill:' + (m.color || '#D9483B') }, [m.label]));
    });
    return s;
  }

  /* ---------- 抽屉 ---------- */
  function drawer(container, o) {
    var bg = h('div', { class: 'pd-drawer-bg', onclick: function (e) { if (e.target === bg) close(); } });
    var box = h('div', { class: 'pd-drawer' }, [
      h('div', { class: 'hd' }, [h('div', {}, [h('div', { class: 't' }, [node(o.title)]), o.sub ? h('div', { class: 's' }, [node(o.sub)]) : null]), h('button', { class: 'close', onclick: close }, ['×'])]),
      h('div', { class: 'bd' }, [].concat(o.body || []).map(node)),
      o.actions && o.actions.length ? h('div', { class: 'ft' }, o.actions) : null
    ]);
    bg.appendChild(box); container.appendChild(bg);
    function close() { if (bg.parentNode) bg.parentNode.removeChild(bg); if (o.onClose) o.onClose(); }
    return { close: close, el: bg };
  }

  /* ---------- 方案对比 ---------- */
  function compare(o) {
    var g = h('div', { class: 'pd-compare' });
    o.options.forEach(function (op) {
      var rows = h('div', { class: 'rows' });
      (op.rows || []).forEach(function (r) { rows.appendChild(h('div', { class: 'r' }, [h('span', {}, [r.k]), h('b', { class: r.tone || '' }, [node(r.v)])])); });
      g.appendChild(h('button', { class: 'pd-option' + (op.key === o.active ? ' on' : ''), onclick: function () { if (o.onPick) o.onPick(op.key); } }, [
        op.recommended ? h('span', { class: 'rec' }, ['AI 推荐']) : null,
        h('div', { style: 'display:flex;gap:10px;align-items:center' }, [h('span', { class: 'key' }, [op.key]), h('span', { class: 'name' }, [op.name])]),
        h('div', { class: 'head' }, [h('span', { class: 'big num ' + (op.headline.tone || '') }, [op.headline.big]), h('span', { style: 'color:var(--pd-sub);font-weight:600' }, [op.headline.sub || ''])]),
        rows,
        op.notes ? h('div', { class: 'notes' }, [op.notes]) : null
      ]));
    });
    return g;
  }

  /* ---------- AI 判断 ---------- */
  function judge(o) {
    var el = h('div', { class: 'pd-judge' });
    if (o.verdict) el.appendChild(h('div', { class: 'verdict ' + (o.verdict.tone || '') }, [chip(o.verdict.tone || 'accent', o.verdict.chip || o.verdict.text), h('span', {}, [o.verdict.text])]));
    function sec(n, title, list) {
      var ul = h('ul'); list.forEach(function (t) { ul.appendChild(h('li', {}, [node(t)])); });
      return h('div', { class: 'sec' }, [h('div', { class: 'h' }, [h('span', { class: 'i' }, [n]), title]), ul]);
    }
    if (o.seen && o.seen.length) el.appendChild(sec('1', '看了哪些数据', o.seen));
    if (o.reasons && o.reasons.length) el.appendChild(sec('2', '判断依据', o.reasons));
    if (o.actionsEl) el.appendChild(h('div', { class: 'sec' }, [h('div', { class: 'h' }, [h('span', { class: 'i' }, ['3']), o.actionsTitle || '建议动作']), h('div', { style: 'padding:10px 12px' }, [o.actionsEl])]));
    return el;
  }
  function action(o) {
    var e = o.effect;
    var eff = e ? h('div', { class: 'e' }, [
      h('span', {}, ['完工 ', h('b', {}, [e.finishBefore]), ' → ', h('b', { class: e.meetsDue ? 'good' : e.gain > 0 ? '' : 'bad' }, [e.finishAfter])]),
      h('span', {}, [e.meetsDue ? h('b', { class: 'good' }, ['赶上交期']) : e.gain > 0 ? h('b', {}, ['提前 ' + e.gain + ' 天，仍晚 ' + e.lateAfter + ' 天']) : e.gain < 0 ? h('b', { class: 'bad' }, ['反而晚 ' + (-e.gain) + ' 天']) : h('b', {}, ['无改善'])]),
      h('span', {}, ['拖累 ', h('b', { class: e.newlyLate ? 'bad' : '' }, [e.affected + ' 单']), e.newlyLate ? h('b', { class: 'bad' }, ['，' + e.newlyLate + ' 单转延期']) : null]),
      h('span', {}, ['费用 ', h('b', {}, [o.cost ? fmtN(o.cost) + ' 元' : '0 元'])])
    ]) : null;
    return h('div', { class: 'pd-action' + (o.best ? ' best' : '') }, [
      h('div', { class: 't' }, [h('span', { class: 'rank' }, [String(o.rank || '')]), o.label, o.target ? h('span', { style: 'color:var(--pd-sub);font-weight:500' }, ['· ' + o.target]) : null]),
      o.done ? h('span', { class: 'done' }, ['已执行']) : btn(o.runText || '执行', { cls: o.best ? 'primary sm' : 'sm', onClick: o.onRun, disabled: o.disabled }),
      h('div', { class: 'd' }, [o.desc, o.costNote ? '（' + o.costNote + '）' : '']),
      eff
    ]);
  }

  /* ---------- 库存走势 ---------- */
  function spark(o) {
    var W = o.width || 460, H = o.height || 120, padL = 36, padR = 8, padT = 10, padB = 20;
    var pts = o.curve, n = pts.length;
    var max = Math.max(o.safety || 0, 1, Math.max.apply(null, pts.map(function (p) { return p.level; })));
    var min = Math.min(0, Math.min.apply(null, pts.map(function (p) { return p.level; })));
    var sx = function (i) { return padL + i * (W - padL - padR) / Math.max(1, n - 1); };
    var sy = function (v) { return padT + (max - v) * (H - padT - padB) / (max - min || 1); };
    var s = svg('svg', { class: 'pd-spark', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(p.level).toFixed(1); }).join(' ');
    s.appendChild(svg('path', { class: 'area', d: d + ' L' + sx(n - 1).toFixed(1) + ' ' + sy(0).toFixed(1) + ' L' + sx(0).toFixed(1) + ' ' + sy(0).toFixed(1) + ' Z' }));
    s.appendChild(svg('line', { class: 'zero', x1: padL, y1: sy(0), x2: W - padR, y2: sy(0) }));
    if (o.safety) { s.appendChild(svg('line', { class: 'safe', x1: padL, y1: sy(o.safety), x2: W - padR, y2: sy(o.safety) })); s.appendChild(svg('text', { x: W - padR, y: sy(o.safety) - 3, 'text-anchor': 'end' }, ['安全库存 ' + fmtN(o.safety)])); }
    s.appendChild(svg('path', { class: 'ln', d: d }));
    [0, Math.floor(n / 2), n - 1].forEach(function (i) { if (o.days && o.days[i]) s.appendChild(svg('text', { x: sx(i), y: H - 6, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }, [o.days[i].label])); });
    s.appendChild(svg('text', { x: 2, y: sy(max) + 4 }, [fmtN(max)]));
    s.appendChild(svg('text', { x: 2, y: sy(0) + 4 }, ['0']));
    return s;
  }

  /* ---------- 风险矩阵（概率 × 影响） ---------- */
  function matrix(o) {
    var W = o.width || 520, H = o.height || 300, padL = 44, padR = 16, padT = 14, padB = 34;
    var s = svg('svg', { class: 'pd-matrix', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMinYMin meet' });
    var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    var maxI = Math.max(1, Math.max.apply(null, o.points.map(function (p) { return p.impact; })));
    s.appendChild(svg('rect', { x: mx, y: y0, width: x1 - mx, height: my - y0, fill: '#FCE9E7' }));
    s.appendChild(svg('rect', { x: x0, y: y0, width: mx - x0, height: my - y0, fill: '#FDF3E1' }));
    s.appendChild(svg('rect', { x: mx, y: my, width: x1 - mx, height: y1 - my, fill: '#FDF3E1' }));
    s.appendChild(svg('rect', { x: x0, y: my, width: mx - x0, height: y1 - my, fill: '#EEF1F6' }));
    s.appendChild(svg('text', { x: x1 - 6, y: y0 + 14, 'text-anchor': 'end', class: 'q' }, ['高：概率高 · 影响大']));
    s.appendChild(svg('text', { x: x0 + 6, y: y1 - 6, class: 'q' }, ['低']));
    s.appendChild(svg('text', { x: x0 + 6, y: y0 + 14, class: 'q' }, ['影响大 · 概率低']));
    s.appendChild(svg('text', { x: x1 - 6, y: y1 - 6, 'text-anchor': 'end', class: 'q' }, ['概率高 · 影响小']));
    s.appendChild(svg('text', { x: (x0 + x1) / 2, y: H - 8, 'text-anchor': 'middle', class: 'ax' }, ['发生概率 →']));
    s.appendChild(svg('text', { x: 12, y: (y0 + y1) / 2, 'text-anchor': 'middle', class: 'ax', transform: 'rotate(-90 12 ' + (y0 + y1) / 2 + ')' }, ['影响金额 →']));
    var sx = function (p) { return x0 + p * (x1 - x0); }, sy = function (v) { return y1 - Math.sqrt(v / maxI) * (y1 - y0); };
    // 标签避让：默认放右侧；靠右边缘的放左侧；与已放标签重叠的挪到圆点下方
    var placed = [];
    var pts = o.points.map(function (p) { return { p: p, cx: sx(p.prob), cy: sy(p.impact) }; }).sort(function (a, b) { return a.cy - b.cy || a.cx - b.cx; });
    pts.forEach(function (q) {
      var p = q.p, cx = q.cx, cy = q.cy, tone = p.level === 'high' ? '#D9483B' : p.level === 'mid' ? '#E8A33D' : '#7C8799';
      var g = svg('g', { class: 'pt' + (p.onClick ? ' click' : ''), style: p.onClick ? 'cursor:pointer' : '' });
      g.appendChild(svg('circle', { cx: cx, cy: cy, r: p.handled ? 9 : 11, fill: p.handled ? '#fff' : tone, stroke: tone, 'stroke-width': 2 }));
      g.appendChild(svg('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'id', fill: p.handled ? tone : '#fff' }, [p.short || p.id]));
      var w = p.label.length * 12.5, left = cx + 14 > x1 - w;
      var lx = left ? cx - 14 : cx + 14, ly = cy + 4, anchor = left ? 'end' : 'start';
      var box = function (x, y) { return { x0: anchor === 'end' ? x - w : x, x1: anchor === 'end' ? x : x + w, y0: y - 11, y1: y + 3 }; };
      var hit = function (b) { return placed.some(function (q2) { return b.x0 < q2.x1 && b.x1 > q2.x0 && b.y0 < q2.y1 && b.y1 > q2.y0; }); };
      var b = box(lx, ly);
      if (hit(b)) { ly = cy + 22; lx = cx; anchor = 'middle'; b = { x0: cx - w / 2, x1: cx + w / 2, y0: ly - 11, y1: ly + 3 }; }
      if (hit(b)) { ly = cy - 16; b = { x0: cx - w / 2, x1: cx + w / 2, y0: ly - 11, y1: ly + 3 }; }
      placed.push(b);
      g.appendChild(svg('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'lbl' }, [p.label]));
      g.appendChild(svg('title', {}, [p.label + ' · 概率 ' + Math.round(p.prob * 100) + '% · 影响 ' + fmtN(p.impact) + ' 元']));
      if (p.onClick) g.addEventListener('click', p.onClick);
      s.appendChild(g);
    });
    return s;
  }

  /* ---------- 周粒度现金曲线 ---------- */
  function cashChart(o) {
    var W = o.width || 960, H = o.height || 260, padL = 64, padR = 16, padT = 16, padB = 34;
    var weeks = o.weeks, n = weeks.length;
    var vals = [o.opening].concat(weeks.map(function (w) { return w.ending; }));
    var max = Math.max.apply(null, vals.concat(weeks.map(function (w) { return w.inflow; }), weeks.map(function (w) { return w.outflow; }), [o.safety || 0]));
    var min = Math.min(0, Math.min.apply(null, vals));
    var s = svg('svg', { class: 'pd-cash', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMinYMin meet' });
    var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB, colW = (x1 - x0) / n;
    var sy = function (v) { return y1 - (v - min) * (y1 - y0) / (max - min || 1); };
    var ticks = 4; for (var t = 0; t <= ticks; t++) { var v = min + (max - min) * t / ticks; s.appendChild(svg('line', { x1: x0, y1: sy(v), x2: x1, y2: sy(v), stroke: '#EEF1F7' })); s.appendChild(svg('text', { x: x0 - 6, y: sy(v) + 4, 'text-anchor': 'end', class: 'ax' }, [(v / 10000).toFixed(0) + '万'])); }
    // 缺口周底色
    weeks.forEach(function (w, i) { if (w.ending < (o.safety || 0)) s.appendChild(svg('rect', { x: x0 + i * colW, y: y0, width: colW, height: y1 - y0, fill: '#FCE9E7' })); });
    if (o.safety) { s.appendChild(svg('line', { x1: x0, y1: sy(o.safety), x2: x1, y2: sy(o.safety), stroke: '#E8A33D', 'stroke-dasharray': '5 3', 'stroke-width': 1.5 })); s.appendChild(svg('text', { x: x1 - 4, y: sy(o.safety) - 4, 'text-anchor': 'end', class: 'ax', fill: '#A8690F' }, ['安全线 ' + fmtN(o.safety / 10000) + ' 万'])); }
    s.appendChild(svg('line', { x1: x0, y1: sy(0), x2: x1, y2: sy(0), stroke: '#98A2B8' }));
    weeks.forEach(function (w, i) {
      var cx = x0 + i * colW, bw = colW * 0.3;
      s.appendChild(svg('rect', { x: cx + colW * 0.15, y: sy(w.inflow), width: bw, height: Math.max(0, sy(0) - sy(w.inflow)), fill: '#22A06B', opacity: 0.55 }));
      s.appendChild(svg('rect', { x: cx + colW * 0.55, y: sy(w.outflow), width: bw, height: Math.max(0, sy(0) - sy(w.outflow)), fill: '#D9483B', opacity: 0.45 }));
      s.appendChild(svg('text', { x: cx + colW / 2, y: H - 18, 'text-anchor': 'middle', class: 'ax' + (o.active === i ? ' on' : '') }, ['第' + (i + 1) + '周']));
      s.appendChild(svg('text', { x: cx + colW / 2, y: H - 6, 'text-anchor': 'middle', class: 'ax sub' }, [w.label]));
      if (o.onWeek) { var hit = svg('rect', { x: cx, y: y0, width: colW, height: y1 - y0, fill: 'transparent', style: 'cursor:pointer' }); hit.addEventListener('click', function () { o.onWeek(i); }); s.appendChild(hit); }
      if (o.active === i) s.appendChild(svg('rect', { x: cx, y: y0, width: colW, height: y1 - y0, fill: 'none', stroke: 'var(--pa)', 'stroke-width': 2 }));
    });
    var pts = vals.map(function (v, i) { return [i === 0 ? x0 : x0 + (i - 1) * colW + colW / 2, sy(v)]; });
    s.appendChild(svg('path', { d: pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '), fill: 'none', stroke: 'var(--pa)', 'stroke-width': 2.5 }));
    pts.forEach(function (p, i) { if (i) { var w = weeks[i - 1]; s.appendChild(svg('circle', { cx: p[0], cy: p[1], r: 4, fill: w.ending < (o.safety || 0) ? '#D9483B' : 'var(--pa)' })); if (i === o.minWeek + 1) s.appendChild(svg('text', { x: p[0], y: p[1] - 10, 'text-anchor': 'middle', class: 'ax', fill: w.ending < (o.safety || 0) ? '#D9483B' : '#1A2233', style: 'font-weight:700' }, ['最低 ' + (w.ending / 10000).toFixed(1) + ' 万'])); } });
    if (o.compare) { var pts2 = [o.opening].concat(o.compare.map(function (w) { return w.ending; })).map(function (v, i) { return [i === 0 ? x0 : x0 + (i - 1) * colW + colW / 2, sy(v)]; }); s.appendChild(svg('path', { d: pts2.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '), fill: 'none', stroke: '#4974F6', 'stroke-width': 2, 'stroke-dasharray': '6 4' })); }
    return s;
  }

  /* ---------- 多序列趋势线（12 期） ---------- */
  function lineChart(o) {
    var W = o.width || 560, H = o.height || 200, padL = 48, padR = o.right ? 48 : 12, padT = 14, padB = 26;
    var labels = o.labels, n = labels.length;
    var s = svg('svg', { class: 'pd-line', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMinYMin meet' });
    var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    var sx = function (i) { return x0 + i * (x1 - x0) / Math.max(1, n - 1); };
    function scale(series) { var all = [].concat.apply([], series.map(function (q) { return q.values; })); var max = Math.max.apply(null, all), min = Math.min(0, Math.min.apply(null, all)); return function (v) { return y1 - (v - min) * (y1 - y0) / (max - min || 1); }; }
    var left = o.series.filter(function (q) { return !q.right; }), right = o.series.filter(function (q) { return q.right; });
    var syL = scale(left), syR = right.length ? scale(right) : null;
    for (var t = 0; t <= 3; t++) { var yy = y0 + (y1 - y0) * t / 3; s.appendChild(svg('line', { x1: x0, y1: yy, x2: x1, y2: yy, stroke: '#EEF1F7' })); }
    labels.forEach(function (l, i) { if (i % (o.every || 1) === 0) s.appendChild(svg('text', { x: sx(i), y: H - 8, 'text-anchor': 'middle', class: 'ax' }, [l])); });
    o.series.forEach(function (q) {
      var sy = q.right ? syR : syL;
      if (q.bar) { q.values.forEach(function (v, i) { var bw = (x1 - x0) / n * 0.5; s.appendChild(svg('rect', { x: sx(i) - bw / 2, y: sy(v), width: bw, height: Math.max(0, sy(0) - sy(v)), fill: q.color, opacity: 0.35 })); }); return; }
      s.appendChild(svg('path', { d: q.values.map(function (v, i) { return (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); }).join(' '), fill: 'none', stroke: q.color, 'stroke-width': 2.2 }));
      q.values.forEach(function (v, i) { s.appendChild(svg('circle', { cx: sx(i), cy: sy(v), r: 3, fill: q.color })); });
      var lastV = q.values[n - 1];
      s.appendChild(svg('text', { x: x1 + 4, y: sy(lastV) + 4, class: 'ax', fill: q.color, style: 'font-weight:700' }, [q.fmt ? q.fmt(lastV) : String(lastV)]));
    });
    return s;
  }

  /* ---------- 提示 ---------- */
  function toast(container, msg, ms) {
    var old = container.querySelector('.pd-toast'); if (old) old.parentNode.removeChild(old);
    var t = h('div', { class: 'pd-toast' }, [h('span', { class: 'ok' }, ['✓']), h('span', {}, [node(msg)])]);
    container.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 2600);
  }

  window.DGG = window.DGG || {};
  window.DGG.pui = { init: init, navModules: navModules, ICONS: ICONS, MODULES: MODULES, svg: svg, fmtN: fmtN, clear: clear, frame: frame, kpi: kpi, kpis: kpis, chip: chip, bar: bar, card: card, btn: btn, kv: kv, empty: empty, item: item, table: table, heat: heat, gantt: gantt, drawer: drawer, compare: compare, judge: judge, action: action, spark: spark, matrix: matrix, cashChart: cashChart, lineChart: lineChart, toast: toast, STATUS: STATUS };
})();
