// 构建期禁忌词扫描：题库、等级判断、升级模板、提示词
const fs = require('fs');
const path = require('path');
const makeLint = require('../../_shared/lint.js');
const data = require('./load-data.js')();
const lint = makeLint(data.lintWords);
let hard = 0, review = 0;
function check(where, text) {
  const h = lint.hard(text), r = lint.review(text);
  if (h.length) { hard++; console.log(`  [硬] ${where}: ${h.join('、')}  ← ${text}`); }
  if (r.length) { review++; console.log(`  [审] ${where}: ${r.join('、')}  ← ${text}`); }
}
data.questions.forEach((q) => { check(q.id, q.text); q.options.forEach((o, i) => check(`${q.id}.${i}`, o)); });
data.levels.forEach((l) => check(l.code, l.verdict));
data.actions.forEach((a) => { check(`${a.dimension}/${a.level} title`, a.title); check(`${a.dimension}/${a.level} action`, a.action); });
console.log(`lint: 硬命中 ${hard}，待审 ${review}`);
process.exitCode = hard ? 1 : 0;
