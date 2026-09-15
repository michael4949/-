// 组装 compute() 需要的 data 包 —— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  return {
    dimensions: J(path.join(here, 'data', 'dimensions.json')),
    questions: J(path.join(here, 'data', 'questions.json')),
    levels: J(path.join(here, 'data', 'levels.json')),
    labels: J(path.join(here, 'data', 'labels.json')),
    benchmark: J(path.join(here, 'data', 'benchmark.json')),
    actions: J(path.join(here, 'data', 'upgrade-actions.json')).items,
    industryMap: J(path.join(shared, 'industry-map.json')),
    lintWords: J(path.join(shared, 'lint-words.json')),
    promptTemplate: fs.readFileSync(path.join(here, 'prompts', 'polish.md'), 'utf8')
  };
};
