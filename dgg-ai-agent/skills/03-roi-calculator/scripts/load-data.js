// 组装 compute() 需要的 data 包 —— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const m2 = path.join(here, '..', '02-scene-ranking');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  const pf = J(path.join(shared, 'profile-fields.json'));
  const dir = path.join(m2, 'data', 'sectors');
  const sectors = {};
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
    const s = J(path.join(dir, f));
    sectors[s.sector] = { sector: s.sector, scenes: s.scenes };
  });
  return {
    fields: pf.fields,
    industries: J(path.join(shared, 'industries.json')),
    sectors,
    constants: J(path.join(here, 'data', 'constants.json')),
    levers: J(path.join(here, 'data', 'levers.json')),
    sceneLevers: J(path.join(here, 'data', 'scene-levers.json')),
    benchmarks: J(path.join(here, 'data', 'benchmarks.json')),
    reportText: J(path.join(here, 'data', 'report-text.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json')),
    promptTemplate: fs.readFileSync(path.join(here, 'prompts', 'polish.md'), 'utf8')
  };
};
