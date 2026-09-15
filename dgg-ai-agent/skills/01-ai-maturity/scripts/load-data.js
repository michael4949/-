// 组装 compute() 需要的 data 包 —— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  const pf = J(path.join(shared, 'profile-fields.json'));
  return {
    fields: pf.fields,
    provinces: pf.provinces,
    industries: J(path.join(shared, 'industries.json')),
    dimensions: J(path.join(here, 'data', 'dimensions.json')),
    questions: J(path.join(here, 'data', 'questions.json')),
    levels: J(path.join(here, 'data', 'levels.json')),
    diagnostics: J(path.join(here, 'data', 'diagnostics.json')),
    benchmark: J(path.join(here, 'data', 'benchmark.json')),
    actions: J(path.join(here, 'data', 'actions.json')).items,
    scenes: J(path.join(here, 'data', 'scenes.json')).items,
    risks: J(path.join(here, 'data', 'risks.json')).items,
    reportText: J(path.join(here, 'data', 'report-text.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json')),
    promptTemplate: fs.readFileSync(path.join(here, 'prompts', 'polish.md'), 'utf8')
  };
};
