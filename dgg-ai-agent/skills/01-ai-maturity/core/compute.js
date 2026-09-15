/*
 * 企业AI成熟度评估 · 能力内核
 * ------------------------------------------------------------
 * 纯函数：无 DOM、无网络、无时间、无随机。
 * Node（AI OS skill 代码节点 / 测试）与浏览器（高保真原型）共用同一份文件。
 *
 *   compute(input, data)            → Result（模板版，可直接上屏）
 *   buildPrompt(result, data)       → string（喂给 LLM 的润色提示词）
 *   mergePolish(result, llmText, lint) → Result（LLM 成功则原地替换三件事，失败原样返回）
 *
 * input:
 *   { company: { name?, industry, size, province, years }, answers: [0–3 × 12] }
 * data:
 *   { dimensions, questions, levels, labels, benchmark, actions, industryMap, promptTemplate }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.maturity = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var MODULE_NAME = '企业AI成熟度评估';
  var CREDITS = 20;
  var ACTION_COUNT = 3;

  // ---------- 校验 ----------
  function validate(input, data) {
    var errs = [];
    if (!input || typeof input !== 'object') return ['input 缺失'];
    var c = input.company || {};
    ['industry', 'size', 'province', 'years'].forEach(function (k) {
      if (!c[k]) errs.push('company.' + k + ' 缺失');
    });
    var n = data.questions.length;
    var a = input.answers;
    if (!Array.isArray(a) || a.length !== n) errs.push('answers 需为 ' + n + ' 项');
    else a.forEach(function (v, i) {
      if (!(v === 0 || v === 1 || v === 2 || v === 3)) errs.push('answers[' + i + '] 需为 0–3');
    });
    return errs;
  }

  // ---------- 查表 ----------
  function industryName(slug, industryMap) {
    var hit = (industryMap && industryMap.internal || []).filter(function (x) { return x.slug === slug; })[0];
    return hit ? hit.name : slug;
  }

  function levelOf(total, levels) {
    for (var i = 0; i < levels.length; i++) {
      if (total >= levels[i].range[0] && total <= levels[i].range[1]) return levels[i];
    }
    return levels[levels.length - 1];
  }

  // 同行参考带：精确格 → 同行业相邻规模格（插值规则）→ 无
  function findBand(benchmark, industry, size, sizeOrder) {
    var key = industry + '-' + size;
    if (benchmark[key]) return { band: benchmark[key], key: key, basis: 'exact' };
    var idx = sizeOrder.indexOf(size);
    for (var d = 1; d < sizeOrder.length; d++) {
      var cands = [idx - d, idx + d];
      for (var j = 0; j < cands.length; j++) {
        var k = cands[j];
        if (k < 0 || k >= sizeOrder.length) continue;
        var k2 = industry + '-' + sizeOrder[k];
        if (benchmark[k2]) return { band: benchmark[k2], key: k2, basis: 'nearest-size' };
      }
    }
    return { band: null, key: key, basis: 'none' };
  }

  function pickTemplate(actions, dimKey, levelCode) {
    var exact = actions.filter(function (t) { return t.dimension === dimKey && t.level === levelCode; })[0];
    if (exact) return exact;
    return actions.filter(function (t) { return t.dimension === dimKey; })[0] || null;
  }

  // ---------- 主计算 ----------
  function compute(input, data) {
    var errors = validate(input, data);
    if (errors.length) return { ok: false, errors: errors };

    var c = input.company;
    var a = input.answers;
    var labels = data.labels;
    var companyName = (c.name && String(c.name).trim()) || '本企业';

    // 六维得分（每维 2 题 × 0–3 = 0–6）
    var dims = data.dimensions.map(function (d) {
      var s = 0, max = 0;
      data.questions.forEach(function (q, i) {
        if (q.dimension === d.key) { s += a[i]; max += 3; }
      });
      return { key: d.key, name: d.name, score: s, max: max };
    });
    var total = dims.reduce(function (t, d) { return t + d.score; }, 0);
    var max = dims.reduce(function (t, d) { return t + d.max; }, 0);

    // 等级
    var level = levelOf(total, data.levels);
    var li = data.levels.indexOf(level);
    var next = li < data.levels.length - 1 ? data.levels[li + 1] : null;
    var gap = next ? next.range[0] - total : 0;

    // 同行参考带与位置
    var bm = findBand(data.benchmark, c.industry, c.size, labels.sizeOrder);
    dims.forEach(function (d) {
      var b = bm.band ? bm.band[d.key] : null;
      d.band = b ? [b[0], b[1]] : null;
      d.position = !b ? 'unknown' : (d.score < b[0] ? 'below' : (d.score > b[1] ? 'above' : 'within'));
    });
    var pos = { above: 0, within: 0, below: 0, unknown: 0 };
    dims.forEach(function (d) { pos[d.position]++; });

    // 升级三件事：取最弱三维
    // 排序键：相对参考带下限的差距 → 绝对得分 → 维度顺序
    var ranked = dims.map(function (d, i) {
      return { d: d, i: i, rel: d.band ? d.score - d.band[0] : d.score };
    }).sort(function (x, y) {
      return (x.rel - y.rel) || (x.d.score - y.d.score) || (x.i - y.i);
    });
    var actions = ranked.slice(0, ACTION_COUNT).map(function (p, n) {
      var tpl = pickTemplate(data.actions, p.d.key, level.code) || {};
      return {
        order: n + 1,
        dimension: p.d.key,
        dimensionName: p.d.name,
        score: p.d.score,
        band: p.d.band,
        title: tpl.title || '',
        text: tpl.action || '',
        service: tpl.service || '',
        module: tpl.module || '',
        source: 'template'
      };
    });

    // 一句话摘要（真实系统文案，可直接上屏与打印）
    var summary = companyName + '处于 ' + level.code + ' ' + level.name + ' 级，' + level.verdict + '。'
      + (bm.band
          ? '六维中 ' + pos.above + ' 维高于同行参考带，' + pos.within + ' 维在参考带内，' + pos.below + ' 维低于参考带。'
          : '')
      + (next ? '距 ' + next.code + ' ' + next.name + ' 级还差 ' + gap + ' 分。' : '已处于最高等级。');

    return {
      ok: true,
      meta: { module: MODULE_NAME, credits: CREDITS, version: VERSION },
      company: {
        name: companyName,
        industry: c.industry, industryName: industryName(c.industry, data.industryMap),
        size: c.size, sizeName: labels.size[c.size] || c.size,
        province: c.province,
        years: c.years, yearsName: labels.years[c.years] || c.years
      },
      answers: a.slice(),
      dimensions: dims,
      total: total,
      max: max,
      level: { code: level.code, name: level.name, range: level.range.slice(), verdict: level.verdict },
      nextLevel: next ? { code: next.code, name: next.name, range: next.range.slice(), gap: gap } : null,
      positions: pos,
      benchmark: { key: bm.key, basis: bm.basis },
      actions: actions,
      summary: summary,
      render: [
        { type: 'radar', title: '六维成熟度', source: 'dimensions', band: !!bm.band, bandLabel: '同行参考带' },
        { type: 'level-badge', source: 'level' },
        { type: 'action-list', title: next ? '升到 ' + next.code + ' ' + next.name + ' 的三件事' : '保持 L4 的三件事', source: 'actions' }
      ]
    };
  }

  // ---------- LLM 润色（可选、≤1 处、8 秒、失败即模板）----------
  function buildPrompt(result, data) {
    var tpl = data.promptTemplate || '';
    var dimsLine = result.dimensions.map(function (d) {
      return d.name + ' ' + d.score + '/' + d.max + (d.band ? '（同行 ' + d.band[0] + '–' + d.band[1] + '）' : '');
    }).join('，');
    var actionsBlock = result.actions.map(function (x) {
      return x.order + '. [' + x.dimensionName + '] ' + x.title + '：' + x.text + '（对应服务：' + x.service + '；可先试：' + x.module + '）';
    }).join('\n');
    var map = {
      'company.name': result.company.name,
      'company.industryName': result.company.industryName,
      'company.sizeName': result.company.sizeName,
      'company.yearsName': result.company.yearsName,
      'level.code': result.level.code,
      'level.name': result.level.name,
      'total': String(result.total),
      'max': String(result.max),
      'dimensionsLine': dimsLine,
      'nextLevel.code': result.nextLevel ? result.nextLevel.code : result.level.code,
      'nextLevel.name': result.nextLevel ? result.nextLevel.name : result.level.name,
      'nextLevel.gap': result.nextLevel ? String(result.nextLevel.gap) : '0',
      'actionsBlock': actionsBlock
    };
    return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (_, k) { return map[k] != null ? map[k] : ''; });
  }

  function stripFence(text) {
    return String(text || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  }

  // lint: function(text) → true 表示命中禁忌
  function mergePolish(result, llmText, lint) {
    var out = JSON.parse(JSON.stringify(result));
    var parsed;
    try { parsed = JSON.parse(stripFence(llmText)); } catch (e) { return out; }
    var list = parsed && Array.isArray(parsed.actions) ? parsed.actions : null;
    if (!list || list.length !== out.actions.length) return out;
    var ok = list.every(function (p, i) {
      var t = String(p.title || '').trim(), x = String(p.text || '').trim();
      if (!t || !x || t.length > 14 || x.length > 60) return false;
      if (lint && (lint(t) || lint(x))) return false;
      return true;
    });
    if (!ok) return out;
    list.forEach(function (p, i) {
      out.actions[i].title = String(p.title).trim();
      out.actions[i].text = String(p.text).trim();
      out.actions[i].source = 'llm';
    });
    return out;
  }

  return {
    VERSION: VERSION,
    MODULE_NAME: MODULE_NAME,
    CREDITS: CREDITS,
    validate: validate,
    compute: compute,
    buildPrompt: buildPrompt,
    mergePolish: mergePolish,
    _findBand: findBand
  };
});
