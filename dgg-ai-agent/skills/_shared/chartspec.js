/* ==========================================================================
   chartspec.js · 「表 → 图」的自动配图规则（平台中立，纯函数，Node 与浏览器同一份）
   ------------------------------------------------------------------
   DUS-1.1 的 Answer 里，blocks 允许出现 {type:'chart', …}（SPEC §10.6）。
   内核会给关键回答显式配图；没显式给的，这里按一条保守规则替它配一张：
     · 只认「整列同一单位、全是非负数」的那一列，任何一格读不出数就不配图，宁可不画；
     · 数字必须在格子的开头（「12,480 万元」认，「共 12 单」不认），避免把编号、日期当成量；
     · 3–8 行才配（2 行不值当，9 行以上一张小图放不下）；
     · 单位是 % 且几行加起来接近 100 的配环图；否则看标签：都在 4 个字以内配竖柱，有长标签配横条。
   规则写在这里而不是写在渲染层，是为了 Node 侧的自测与浏览器侧的展示走同一套判断。

   对外（UMD）：{ VERSION, numOf, specOf, fromTable, fromKv, promote }
     promote(blocks) → 新的 blocks 数组：原数组里已经有 chart 就原样返回，
                       否则在第一个能配图的 table / kv 前面插一张图。原数组不改。
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.chartspec = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = '1.1.0';

  /* 「12,480 万元」「+3.2%」「38 天」→ {v, unit}；读不出来返回 null */
  function numOf(x) {
    if (typeof x === 'number') return isFinite(x) ? { v: x, unit: '' } : null;
    var s = String(x == null ? '' : x).trim();
    if (!s) return null;
    var m = s.match(/^([+-]?)\s*[¥￥$]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*([^\s0-9].*)?$/);
    if (!m) return null;
    var v = parseFloat(m[2].replace(/,/g, ''));
    if (!isFinite(v)) return null;
    return { v: m[1] === '-' ? -v : v, unit: (m[3] || '').replace(/\s+/g, '') };
  }

  function specOf(labels, data, unit, title) {
    var i, t = 0, pos = false;
    for (i = 0; i < data.length; i++) { t += data[i]; if (data[i] > 0) pos = true; }
    if (!pos) return null;
    if (unit === '%' && data.length >= 3 && data.length <= 6 && t > 96 && t < 104) {
      return { type: 'chart', chart: 'donut', title: title || '', unit: '%', total: 100, labels: labels, series: [{ name: title || '', data: data }] };
    }
    var short = true;
    for (i = 0; i < labels.length; i++) if (String(labels[i]).length > 4) { short = false; break; }
    /* 标签短就竖着排（更紧凑），长了才横排（横排才放得下中文词组） */
    return { type: 'chart', chart: (short && labels.length <= 7) ? 'column' : 'bar', title: title || '', unit: unit || '',
      labels: labels, series: [{ name: title || '', data: data }] };
  }

  function fromKv(b) {
    var rows = (b && b.rows) || [], labels = [], data = [], unit = null, i, p;
    if (rows.length < 3 || rows.length > 8) return null;
    for (i = 0; i < rows.length; i++) {
      p = numOf((rows[i] || [])[1]);
      if (!p || p.v < 0) return null;
      if (unit === null) unit = p.unit; else if (unit !== p.unit) return null;
      labels.push(String((rows[i] || [])[0] == null ? '' : rows[i][0]));
      data.push(p.v);
    }
    return specOf(labels, data, unit, b.title || '');
  }

  function fromTable(b) {
    var head = (b && b.head) || (b && b.cols) || [], rows = (b && b.rows) || [];
    var i, j, cols = (rows[0] || []).length;
    if (rows.length < 3 || rows.length > 8 || cols < 2) return null;
    for (j = 1; j < cols; j++) {
      var ok = true, u = null, vals = [], p;
      for (i = 0; i < rows.length; i++) {
        p = numOf((rows[i] || [])[j]);
        if (!p || p.v < 0) { ok = false; break; }
        if (u === null) u = p.unit; else if (u !== p.unit) { ok = false; break; }
        vals.push(p.v);
      }
      if (!ok) continue;
      var labels = [];
      for (i = 0; i < rows.length; i++) labels.push(String((rows[i] || [])[0] == null ? '' : rows[i][0]));
      return specOf(labels, vals, u, String(head[j] == null ? '' : head[j]));
    }
    return null;
  }

  function promote(list) {
    var out = [], i, b, sp, had = false;
    list = list || [];
    for (i = 0; i < list.length; i++) { b = list[i]; if (b && b.type === 'chart') had = true; }
    for (i = 0; i < list.length; i++) {
      b = list[i];
      if (!had && b && !b.nodeType && (b.type === 'table' || b.type === 'kv')) {
        sp = b.type === 'table' ? fromTable(b) : fromKv(b);
        if (sp) { out.push(sp); had = true; }
      }
      out.push(b);
    }
    return out;
  }

  return { VERSION: VERSION, numOf: numOf, specOf: specOf, fromTable: fromTable, fromKv: fromKv, promote: promote };
}));
