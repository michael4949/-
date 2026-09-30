// 构建期禁忌词扫描：场景库、痛点库、四维、条件、报告文案
const makeLint = require('../../_shared/lint.js');
const data = require('./load-data.js')();
const lint = makeLint(data.lintWords);
let hard = 0, review = 0, scanned = 0;
function check(where, text) {
  if (!text) return; scanned++;
  const h = lint.hard(text), r = lint.review(text);
  if (h.length) { hard++; console.log(`  [硬] ${where}: ${h.join('、')}  ← ${text}`); }
  if (r.length) { review++; if (process.argv.includes('--verbose')) console.log(`  [审] ${where}: ${r.join('、')}  ← ${text}`); }
}
Object.keys(data.sectors).forEach((k) => {
  const s = data.sectors[k];
  s.pains.forEach((p) => { check(p.id, p.text); check(p.id + '.hint', p.hint); });
  s.scenes.forEach((x) => {
    ['name', 'stage', 'user', 'replaces', 'metric', 'firstStep', 'precondition', 'roiBasis'].forEach((f) => check(`${x.id}.${f}`, x[f]));
    x.dataList.forEach((d, i) => check(`${x.id}.data${i}`, d));
  });
});
data.axes.items.forEach((a) => { check(a.key + '.desc', a.desc); check(a.key + '.how', a.how); (a.scale || []).forEach((t, i) => check(`${a.key}.scale${i}`, t)); });
data.axes.presets.forEach((p) => check('preset.' + p.key, p.desc));
data.conditions.groups.forEach((g) => check('group.' + g.key, g.desc));
data.conditions.fields.forEach((f) => f.options.forEach((o) => { check(`${f.key}.${o.v}`, o.t); check(`${f.key}.${o.v}.note`, o.note); }));
const rt = data.reportText;
rt.readingGuide.forEach((t, i) => check('guide' + i, t));
Object.keys(rt.method).forEach((k) => check('method.' + k, rt.method[k]));
Object.keys(rt.comboText).forEach((k) => check('combo.' + k, rt.comboText[k].desc));
rt.investment.tiers.forEach((t) => { check('tier.' + t.key, t.desc); check('tier.' + t.key + '.fit', t.fit); });
rt.services.forEach((s) => check('svc.' + s.name, s.desc));
rt.glossary.forEach((g) => check('glossary.' + g.term, g.desc));
check('closing', rt.closing);
console.log(`lint: 扫描 ${scanned} 段，硬命中 ${hard}，待审 ${review}（加 --verbose 查看待审项）`);
process.exitCode = hard ? 1 : 0;
