// 生成 data/objects.json（30 个对象，来自 objects.js 的紧凑 DSL）与三套样本 data/samples/{mfg,trade,prof}.json。
// 预埋记录由内核运行时真实走出来（提交 → 各节点），再按固定偏移改写时间；主数据（设备 / 员工 / 客户 / 商品）只引用兄弟模块样本里存在的编号。
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const OBJECTS = require('./objects.js');
fs.writeFileSync(path.join(here, 'data', 'objects.json'), JSON.stringify({ _note: '30 个业务对象（通用 9 · 制造 8 · 贸易 6 · 服务 7），由 scripts/objects.js 的 DSL 生成；字段 example 以 @ 开头的按主数据 / 角色在运行时解析。', objects: OBJECTS }, null, 1) + '\n');
const K = require('../core/build.js');
const lib = require('./load-data.js')();
const CFG = {
  make: { file: 'mfg', erp: 'make' },
  flow: { file: 'trade', erp: 'flow' },
  service: { file: 'prof', erp: 'service' }
};
const D = 1440, C0 = K.CLOCK0;
// 目标状态与创建时间（相对今日 00:00 的分钟）；overdue 由约定时效反推
function planRows(spec, n) {
  const init = K.initialState(spec), acc = spec.transitions.filter((t) => t.from === init && t.sla)[0], slaMin = acc ? acc.sla * 60 : 120;
  const overdueAt = C0 - slaMin - 40, fk = spec.flow.key, has = (k) => spec.states.some((s) => s.key === k);
  if (fk === 'dispatch') return n >= 8
    ? [['done', -2 * D + 550], ['done', -D + 620], ['done', -D + 940], ['doing', 470], ['accepted', 490], ['accepted', 510], [init, overdueAt], [init, 515]]
    : [['done', -D + 620], ['doing', 470], ['accepted', 490], [init, overdueAt]];
  if (fk === 'approve') {
    const tail = spec.tail, rows = n >= 8
      ? [['approved', -2 * D + 560], ['approved', -D + 600], ['rejected', -D + 660], [has('pending2') ? 'pending2' : 'approved', -D + 900], [init, overdueAt], [init, 500], tail ? ['lent', -2 * D + 610] : ['approved', -3 * D + 600], tail && has('returned') ? ['returned', -3 * D + 590] : [init, 520]]
      : [['approved', -D + 600], tail ? ['lent', -D + 660] : ['rejected', -D + 660], [init, overdueAt], [init, 500]];
    return rows;
  }
  const fixSla = (spec.transitions.filter((t) => t.actionEn === 'fix')[0] || {}).sla || 72, od = C0 - fixSla * 60 - 40;
  return n >= 8
    ? [['closed', -2 * D + 540], ['closed', -D + 600], [has('ok') ? 'ok' : 'closed', -D + 700], ['recheck', -D + 800], ['fixing', -D + 900], ['fixing', 460], [init, od], [init, 495]]
    : [['closed', -D + 600], ['fixing', -D + 900], [init, od], [init, 495]];
}
const GAPS = [[35, 90, 260], [42, 60, 180], [28, 120, 300], [51, 75, 200], [30, 100, 240], [44, 80, 220], [38, 65, 190], [33, 95, 275]];
const samples = {};
Object.keys(CFG).forEach((arche) => {
  const cfg = CFG[arche], erp = lib.erpSamples[cfg.erp], company = erp.company;
  const ctx = { arche, company, systems: [] };
  const presets = K.presetsOf(lib, arche), presetKeys = presets.map((p) => p.key);
  const byObject = {}, expect = {};
  K.objectsFor(lib, arche).forEach((obj) => {
    const preset = presets.filter((p) => p.key === obj.key)[0];
    const parsed = K.parse(preset ? preset.text : obj.name, lib, arche);
    if (parsed.object !== obj.key) throw new Error(arche + ' ' + obj.key + ' 解析成了 ' + parsed.object);
    const spec = K.plan(parsed, lib, ctx);
    const n = presetKeys.indexOf(obj.key) >= 0 ? 8 : 4;
    const plan = planRows(spec, n).map((r, i) => ({ target: r[0], at: r[1], i })).sort((a, b) => a.at - b.at || a.i - b.i);
    let rt = K.newRuntime(spec, []);
    const rows = [];
    plan.forEach((p, i) => {
      rt.clock = p.at;
      const res = K.reach(spec, rt, p.target, lib, null, i, i % 2 === 1 && p.target !== K.initialState(spec));
      if (!res.ok) throw new Error(arche + ' ' + obj.key + ' → ' + p.target + ' 失败：' + res.error);
      rt = res.rt;
      const row = rt.rows[rt.rows.length - 1];
      // 时间改写：提交 = 创建时间，后续节点按固定间隔
      const g = GAPS[i % GAPS.length];
      row.history.forEach((h, k) => { h.atMin = k === 0 ? p.at : p.at + g.slice(0, k).reduce((a, b) => a + b, 0); });
      row.createdAt = p.at; row.updatedAt = row.history[row.history.length - 1].atMin;
      rows.push(row);
    });
    byObject[obj.key] = rows;
    if (preset) { const s = K.summarize(spec, lib); expect[obj.key] = { object: obj.key, flow: spec.flow.key, mode: spec.flow.mode, pages: s.pages, fields: s.fields, roles: s.roles, states: s.states, apis: s.apis, testsMin: s.tests, rows: rows.length }; }
  });
  const sample = { archetype: arche, company, today: K.TODAY, clockMin: C0, systems: [], seed: { byObject }, expect, state: {} };
  samples[arche] = sample;
  fs.writeFileSync(path.join(here, 'data', 'samples', cfg.file + '.json'), JSON.stringify(sample, null, 1) + '\n');
  const nRows = Object.keys(byObject).reduce((n, k) => n + byObject[k].length, 0);
  console.log(`${arche.padEnd(7)} ${company}  对象 ${Object.keys(byObject).length} · 预埋 ${nRows} 条 · 预置 ${presetKeys.join(' / ')}`);
});
