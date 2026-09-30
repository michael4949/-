/* 交付物条 + 线索登记
 * deliver(host, opts)：每个场景最后一屏底部的一条——左边是海报上写的交付物名，右边是「扫码领取 · 专家咨询」二维码与「登记 · 预约演示」按钮。
 * leadForm()：五项表单（企业、行业、规模、关注场景、手机），本机 localStorage 保存，可导出 CSV；展台断网可用。
 * 对外：window.DGG.lead = { deliver, leadForm, exportCsv, count }
 */
(function () {
  'use strict';
  window.DGG = window.DGG || {};
  var KEY = 'dgg.ciif2026.leads';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* 无存储时只在内存里 */ } }
  var mem = null;
  function all() { if (!mem) mem = load(); return mem; }

  function deliver(host, o) {
    var api = window.DGG.shell, h = api.h;
    var bar = h('div', { class: 'dl-bar' }, [
      h('div', { class: 'dl-items' }, [h('span', { class: 'k' }, ['交付物'])].concat((o.items || []).map(function (t) { return h('span', { class: 'it' }, [t]); }))),
      h('div', { class: 'dl-right' }, [
        h('div', { class: 'dl-qr', html: api.qrSvg(api.CFG.wechatUrl, 3) }),
        h('div', { class: 'dl-cap' }, [h('b', {}, ['扫码领取本报告']), h('span', {}, ['专家咨询 · 企业微信'])]),
        h('button', { class: 'dl-btn', onclick: function () { leadForm({ scene: o.scene || '' }); } }, ['登记 · 预约演示'])
      ])
    ]);
    host.appendChild(bar);
    return bar;
  }

  var SCENES = ['AI获客', 'AI现金流与经营预警', 'AI工序级排程', 'AI人岗匹配与用工合规', 'AI报工核验', 'AI经营指标分析'];
  var SIZES = ['50 人以下', '50–100 人', '101–300 人', '301–1000 人', '1000 人以上'];
  function leadForm(pre) {
    var api = window.DGG.shell, h = api.h;
    pre = pre || {};
    api.holdIdle(true);
    var bg = h('div', { class: 'modal-bg', onclick: function (e) { if (e.target === bg) close(); } });
    var fields = {};
    function fld(label, key, el) { fields[key] = el; return h('label', { class: 'lf-f' }, [h('span', {}, [label]), el]); }
    var ind = h('select', {}); api.mfgIndustries().forEach(function (i) { ind.appendChild(h('option', { value: i.name, selected: i.slug === api.industrySlug() }, [i.name])); });
    var size = h('select', {}); SIZES.forEach(function (s) { size.appendChild(h('option', { value: s }, [s])); }); size.value = SIZES[2];
    var scene = h('select', {}); SCENES.forEach(function (s) { scene.appendChild(h('option', { value: s }, [s])); }); if (pre.scene) scene.value = pre.scene;
    var msg = h('div', { class: 'lf-msg' });
    var form = h('form', { class: 'lf', onsubmit: function (e) {
      e.preventDefault();
      var rec = { t: new Date().toISOString(), company: fields.company.value.trim(), industry: ind.value, size: size.value, scene: scene.value, phone: fields.phone.value.trim(), station: api.station(), channel: 'CIIF2026-演示屏' };
      if (!rec.company) { msg.textContent = '请填写企业名称'; return; }
      if (!/^1\d{10}$/.test(rec.phone)) { msg.textContent = '请填写 11 位手机号'; return; }
      if (!fields.agree.checked) { msg.textContent = '请勾选同意'; return; }
      all().push(rec); save(all());
      api.clear(box); box.appendChild(h('div', { class: 'lf-done' }, [h('b', {}, ['已登记']), h('p', {}, ['顾问会在展后 2 个工作日内联系您；也可现在扫码添加企业微信。']), h('div', { html: api.qrSvg(api.CFG.wechatUrl, 5) }), h('button', { class: 'btn', onclick: close }, ['完成'])]));
    } }, [
      h('h3', {}, ['登记 · 预约 15 分钟演示']),
      fld('企业名称', 'company', h('input', { type: 'text', placeholder: '公司全称', autocomplete: 'off' })),
      h('div', { class: 'lf-row' }, [fld('细分行业', 'industry', ind), fld('人员规模', 'size', size)]),
      fld('最关注的场景', 'scene', scene),
      fld('手机号', 'phone', h('input', { type: 'tel', placeholder: '11 位手机号', inputmode: 'numeric' })),
      h('label', { class: 'lf-agree' }, [(fields.agree = h('input', { type: 'checkbox' })), h('span', {}, ['信息仅用于本次展会后联系，本机离线保存'])]),
      msg,
      h('div', { class: 'lf-acts' }, [h('button', { type: 'button', class: 'btn ghost', onclick: close }, ['取消']), h('button', { type: 'submit', class: 'btn' }, ['提交登记'])])
    ]);
    var box = h('div', { class: 'modal lf-box' }, [form]);
    bg.appendChild(box); document.body.appendChild(bg);
    setTimeout(function () { fields.company.focus(); }, 50);
    function close() { if (bg.parentNode) bg.parentNode.removeChild(bg); api.holdIdle(false); }
  }

  function exportCsv() {
    var rows = [['时间', '企业', '行业', '规模', '关注场景', '手机', '站位', '渠道']].concat(all().map(function (r) { return [r.t, r.company, r.industry, r.size, r.scene, r.phone, r.station, r.channel]; }));
    var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'ciif2026-leads.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  window.DGG.lead = { deliver: deliver, leadForm: leadForm, exportCsv: exportCsv, count: function () { return all().length; } };
})();
