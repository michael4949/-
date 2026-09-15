/*
 * 表述禁忌校验 · 11 个模块共用
 * 构建期：扫描静态文案与模板文件。运行期：逐字段扫描 LLM 返回，命中 hard 项即回落模板。
 *   makeLint(lintWords) → { hard(text) → [hits], review(text) → [hits], hit(text) → boolean }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.makeLint = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return function makeLint(words) {
    var hardPat = (words.hard.patterns || []).map(function (p) { return new RegExp(p); });
    var hardWords = words.hard.words || [];
    var reviewWords = (words.review && words.review.words) || [];
    function scan(text, pats, ws) {
      var s = String(text || ''), hits = [];
      pats.forEach(function (re) { var m = s.match(re); if (m) hits.push(m[0]); });
      ws.forEach(function (w) { if (s.indexOf(w) >= 0) hits.push(w); });
      return hits;
    }
    return {
      hard: function (t) { return scan(t, hardPat, hardWords); },
      review: function (t) { return scan(t, [], reviewWords); },
      hit: function (t) { return scan(t, hardPat, hardWords).length > 0; }
    };
  };
});
