/* 交付物条 + 预约专家交流
 * deliver(host, opts)：每个场景最后一屏底部的一条——左边是海报上写的交付物名，右边是「扫码领取 · 专家咨询」二维码与「预约专家交流」按钮。
 * leadForm()：预约表单（企业、行业、规模、交流方式、期望时间、重点场景、手机），本机 localStorage 保存，可导出 CSV；展台断网可用。
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
        h('button', { class: 'dl-btn', onclick: function () { leadForm({ scene: o.scene || '' }); } }, ['预约专家交流'])
      ])
    ]);
    host.appendChild(bar);
    return bar;
  }

  var SCENES = ['AI获客', 'AI现金流与经营预警', 'AI工序级排程', 'AI人岗匹配与用工合规', 'AI报工核验', 'AI经营指标分析'];
  var SIZES = ['50 人以下', '50–100 人', '101–300 人', '301–1000 人', '1000 人以上'];
  var MODES = [{ v: '入企交流', s: '专家到厂调研，看现场、对数据' }, { v: '线上交流', s: '视频会议，先聊方向与场景' }];
  var WHEN = ['展后一周内', '展后两周内', '一个月内'];
  function leadForm(pre) {
    var api = window.DGG.shell, h = api.h;
    pre = pre || {};
    api.holdIdle(true);
    var bg = h('div', { class: 'modal-bg', onclick: function (e) { if (e.target === bg) close(); } });
    var fields = {};
    function fld(label, key, el) { fields[key] = el; return h('label', { class: 'lf-f' }, [h('span', {}, [label]), el]); }
    var ind = h('select', {}); api.mfgIndustries().forEach(function (i) { ind.appendChild(h('option', { value: i.name, selected: i.slug === api.industrySlug() }, [i.name])); });
    var size = h('select', {}); SIZES.forEach(function (s) { size.appendChild(h('option', { value: s }, [s])); }); size.value = SIZES[2];
    var scene = h('select', {}); SCENES.forEach(function (s) { scene.appendChild(h('option', { value: s }, [s])); }); /* 重点场景默认取当前所在的场景 */
    var cur = pre.scene || (function () { var id = (location.hash.replace(/^#\/?/, '').split('/')[0]) || ''; var n = api.moduleName ? api.moduleName(id === 'm7' ? 'm5' : id) : ''; return SCENES.indexOf(n) >= 0 ? n : ''; })();
    if (cur) scene.value = cur;
    /* 交流方式：两张大卡二选一；期望时间：三档胶囊 */
    var mode = MODES[0].v, when = WHEN[0];
    var modeBox = h('div', { class: 'lf-mode' }), whenBox = h('div', { class: 'lf-when' });
    function drawPick() {
      api.clear(modeBox); api.clear(whenBox);
      MODES.forEach(function (m) { modeBox.appendChild(h('button', { type: 'button', class: 'opt' + (m.v === mode ? ' on' : ''), onclick: function () { mode = m.v; drawPick(); } }, [h('b', {}, [m.v]), h('span', {}, [m.s])])); });
      WHEN.forEach(function (w) { whenBox.appendChild(h('button', { type: 'button', class: 'pill' + (w === when ? ' on' : ''), onclick: function () { when = w; drawPick(); } }, [w])); });
    }
    drawPick();
    var msg = h('div', { class: 'lf-msg' });
    var form = h('form', { class: 'lf', onsubmit: function (e) {
      e.preventDefault();
      var rec = { t: new Date().toISOString(), company: fields.company.value.trim(), industry: ind.value, size: size.value, scene: scene.value, mode: mode, when: when, phone: fields.phone.value.trim(), station: api.station(), channel: 'CIIF2026-演示屏' };
      if (!rec.company) { msg.textContent = '请填写企业名称'; return; }
      if (!/^1\d{10}$/.test(rec.phone)) { msg.textContent = '请填写 11 位手机号'; return; }
      if (!fields.agree.checked) { msg.textContent = '请勾选同意'; return; }
      all().push(rec); save(all());
      var cnt = document.querySelector('.rail .lead-cnt b'); if (cnt) cnt.textContent = String(all().length);
      api.clear(box); box.appendChild(h('div', { class: 'lf-done' }, [h('b', {}, ['预约已提交']), h('p', {}, ['专属顾问将在 2 个工作日内与您确认' + rec.mode + '的时间（' + rec.when + '）。也可现在扫码添加企业微信，直接沟通。']), h('div', { html: api.qrSvg(api.CFG.wechatUrl, 5) }), h('button', { class: 'btn', onclick: close }, ['完成'])]));
    } }, [
      h('h3', {}, ['预约 AI 落地专家交流']),
      h('p', { class: 'lf-sub' }, ['入企调研或线上会议，由专属顾问对接贵司的具体业务与数据']),
      h('div', { class: 'lf-f' }, [h('span', {}, ['交流方式']), modeBox]),
      h('div', { class: 'lf-f' }, [h('span', {}, ['期望时间']), whenBox]),
      fld('企业名称', 'company', h('input', { type: 'text', placeholder: '公司全称', autocomplete: 'off' })),
      h('div', { class: 'lf-row' }, [fld('细分行业', 'industry', ind), fld('人员规模', 'size', size)]),
      fld('希望重点交流的场景', 'scene', scene),
      fld('手机号', 'phone', h('input', { type: 'tel', placeholder: '11 位手机号', inputmode: 'numeric' })),
      h('label', { class: 'lf-agree' }, [(fields.agree = h('input', { type: 'checkbox' })), h('span', {}, ['信息仅用于本次展会后联系，本机离线保存'])]),
      msg,
      h('div', { class: 'lf-acts' }, [h('button', { type: 'button', class: 'btn ghost', onclick: close }, ['取消']), h('button', { type: 'submit', class: 'btn' }, ['提交预约'])])
    ]);
    var box = h('div', { class: 'modal lf-box' }, [form]);
    bg.appendChild(box); document.body.appendChild(bg);
    setTimeout(function () { fields.company.focus(); }, 50);
    function close() { if (bg.parentNode) bg.parentNode.removeChild(bg); api.holdIdle(false); }
  }

  function exportCsv() {
    var rows = [['时间', '企业', '行业', '规模', '交流方式', '期望时间', '重点场景', '手机', '站位', '渠道']].concat(all().map(function (r) { return [r.t, r.company, r.industry, r.size, r.mode || '', r.when || '', r.scene, r.phone, r.station, r.channel]; }));
    var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'ciif2026-leads.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  window.DGG.lead = { deliver: deliver, leadForm: leadForm, exportCsv: exportCsv, count: function () { return all().length; } };
})();
