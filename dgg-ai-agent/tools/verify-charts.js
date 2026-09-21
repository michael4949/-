/* 对话覆盖自测：8 个产品 skill × 每一屏，逐条跑 brief / suggest→ask，
   统计「回答里有没有图」与「回答带不带 act」。配图规则用 skills/_shared/chartspec.js，
   与展台里跑的是同一份，避免自测和现场两套判断。
   用法：node tools/verify-charts.js [--list] */
const path = require('path');
const CS = require(path.join(__dirname, '..', 'skills', '_shared', 'chartspec.js'));
const CHART_TYPES = ['column', 'bar', 'stack', 'line', 'area', 'donut', 'pie', 'funnel', 'gauge', 'radar', 'waterfall', 'progress', 'heat', 'scatter'];
const MODS = [
  ['m4', '04-ai-lead', 'lead.js', 'make'], ['m5', '05-ai-hr', 'hr.js', 'make'],
  ['m6', '06-ai-cfo', 'fin.js', 'make'], ['m7', '07-ai-legal', 'legal.js', 'make'],
  ['m8', '08-ai-process', 'flow.js', 'make'], ['m9', '09-ai-decision', 'decide.js', 'make'],
  ['m10', '10-ai-erp', 'sim.js', 'make'], ['m11', '11-ai-dev', 'build.js', 'make']
];
const show = process.argv.includes('--list');
let tot = 0, withChart = 0, withAct = 0, briefs = 0, briefCharts = 0;
const gaps = [], bad = [], kinds = {};

function blocksOf(a) { return a && typeof a === 'object' && Array.isArray(a.blocks) ? a.blocks : []; }
function chartOf(a) {
  const bl = CS.promote(blocksOf(a));
  const c = bl.filter((b) => b && b.type === 'chart')[0];
  return c || null;
}
function checkBlocks(where, a) {
  blocksOf(a).forEach((b, i) => {
    if (b == null) bad.push(where + ' blocks[' + i + '] 是 null');
    else if (!b.type) bad.push(where + ' blocks[' + i + '] 没有 type');
    else if (b.type === 'chart' && CHART_TYPES.indexOf(b.chart) < 0) bad.push(where + ' 图型不认识：' + b.chart);
  });
  if (blocksOf(a).length > 3) bad.push(where + ' 一条回答超过 3 块');
}

MODS.forEach(([id, dir, file, sample]) => {
  const core = require(path.join(__dirname, '..', 'skills', dir, 'core', file));
  const lib = require(path.join(__dirname, '..', 'skills', dir, 'scripts', 'load-data.js'))();
  /* 工序流的排产要借 AI ERP 的引擎；JSON 装不下函数，由宿主注入（原型里也是这么接的） */
  if (id === 'm8' && !lib.erp) lib.erp = require(path.join(__dirname, '..', 'skills', '10-ai-erp', 'core', 'sim.js'));
  const raw = lib.samples[sample] || lib.samples[Object.keys(lib.samples)[0]];
  /* AI ERP 的入口是 normalize + schedule，不是 run；其余八个都是 run */
  const R = core.run ? core.run(raw, lib) : core.schedule(core.normalize(raw, lib));
  core.screens().forEach((sc) => {
    const b = core.brief(sc.key, R.data, lib, R);
    briefs++;
    checkBlocks(id + '/' + sc.key + ' brief', b);
    const bc = chartOf(b);
    if (bc) { briefCharts++; kinds[bc.chart] = (kinds[bc.chart] || 0) + 1; }
    else gaps.push(id + '/' + sc.key + ' · brief 没有图');
    const qs = core.suggest(sc.key, R.data, lib, R) || [];
    qs.forEach((q) => {
      const a = core.ask(q, sc.key, R.data, lib, R);
      tot++;
      checkBlocks(id + '/' + sc.key + ' 「' + q + '」', a);
      const c = chartOf(a);
      if (c) { withChart++; kinds[c.chart] = (kinds[c.chart] || 0) + 1; }
      else gaps.push(id + '/' + sc.key + ' 「' + q + '」' + (a ? '' : '（没接住）'));
      if (a && a.act) withAct++;
    });
  });
});
const pc = (a, b) => b ? (a * 100 / b).toFixed(0) + '%' : '—';
console.log('开场白  ' + briefCharts + '/' + briefs + ' 带图 ' + pc(briefCharts, briefs));
console.log('建议问句 ' + withChart + '/' + tot + ' 带图 ' + pc(withChart, tot) + '；' + withAct + '/' + tot + ' 带动作 ' + pc(withAct, tot));
console.log('图型分布 ' + Object.keys(kinds).sort().map((k) => k + ' ' + kinds[k]).join(' · '));
if (bad.length) { console.log('\n块结构问题 ' + bad.length + ' 处：'); bad.slice(0, 30).forEach((x) => console.log('  ' + x)); }
if (show && gaps.length) { console.log('\n没有图的 ' + gaps.length + ' 条：'); gaps.forEach((x) => console.log('  ' + x)); }
else if (gaps.length) console.log('\n没有图的 ' + gaps.length + ' 条（--list 看明细）');
process.exit(bad.length ? 1 : 0);
