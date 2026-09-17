// 组装内核需要的数据包：规则表 + 参考带 + 政策库 + 三套账套样本 —— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  const dir = path.join(here, 'data', 'samples');
  const samples = {};
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => { const s = J(path.join(dir, f)); samples[s.archetype] = s; });
  return {
    rules: J(path.join(here, 'data', 'rules.json')),
    riskRules: J(path.join(here, 'data', 'risk-rules.json')),
    benchmarks: J(path.join(here, 'data', 'benchmarks.json')),
    policies: J(path.join(here, 'data', 'policies.json')),
    samples,
    industries: J(path.join(shared, 'industries.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json'))
  };
};
