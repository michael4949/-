// 组装 compute() 需要的 data 包 —— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  const pf = J(path.join(shared, 'profile-fields.json'));
  const dir = path.join(here, 'data', 'sectors');
  const sectors = {};
  let libTotal = 0;
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
    const s = J(path.join(dir, f));
    sectors[s.sector] = s;
    libTotal += s.scenes.length;
  });
  return {
    fields: pf.fields,
    provinces: pf.provinces,
    industries: J(path.join(shared, 'industries.json')),
    sectors,
    libTotal,
    axes: J(path.join(here, 'data', 'axes.json')),
    conditions: J(path.join(here, 'data', 'conditions.json')),
    reportText: J(path.join(here, 'data', 'report-text.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json')),
    promptTemplate: fs.readFileSync(path.join(here, 'prompts', 'polish.md'), 'utf8')
  };
};
