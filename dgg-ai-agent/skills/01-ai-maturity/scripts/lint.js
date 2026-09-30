// 构建期禁忌词扫描：题库、等级、维度、诊断、行动库、场景库、风险、报告文案、行业洞察
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
data.questions.forEach((q) => { check(q.id, q.text); check(q.id + '.explain', q.explain); q.options.forEach((o, i) => check(`${q.id}.${i}`, o)); });
data.levels.forEach((l) => { check(l.code, l.verdict); check(l.code + '.desc', l.desc); (l.traits || []).forEach((t, i) => check(`${l.code}.trait${i}`, t)); });
data.dimensions.forEach((d) => { check(d.key, d.desc); d.subdims.forEach((s) => check(s.key, s.desc)); });
Object.keys(data.diagnostics.items).forEach((k) => Object.keys(data.diagnostics.items[k]).forEach((b) => check(`diag.${k}.${b}`, data.diagnostics.items[k][b])));
data.actions.forEach((a) => { ['title', 'why', 'deliverable', 'kpi', 'owner'].forEach((f) => check(`${a.id}.${f}`, a[f])); a.steps.forEach((s, i) => check(`${a.id}.step${i}`, s)); });
data.scenes.forEach((s) => { check(s.id, s.name); check(s.id + '.desc', s.desc); check(s.id + '.first', s.firstStep); });
data.risks.forEach((r) => { check(r.id, r.title); check(r.id + '.text', r.text); });
data.industries.sectors.forEach((s) => { check(s.key + '.insight', s.insight); (s.aiFocus || []).forEach((t, i) => check(`${s.key}.focus${i}`, t)); });
const rt = data.reportText;
rt.readingGuide.forEach((t, i) => check('guide' + i, t));
Object.keys(rt.method).forEach((k) => check('method.' + k, rt.method[k]));
rt.investment.tiers.forEach((t) => { check('tier.' + t.key, t.desc); check('tier.' + t.key + '.fit', t.fit); });
rt.glossary.forEach((g) => check('glossary.' + g.term, g.desc));
check('closing', rt.closing);
console.log(`lint: 扫描 ${scanned} 段，硬命中 ${hard}，待审 ${review}（加 --verbose 查看待审项）`);
process.exitCode = hard ? 1 : 0;
