// 组装内核需要的数据包：审查规则 / 设立规则 / 知产类别 + 三套样本 —— skill 与原型构建脚本共用
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
    contractRules: J(path.join(here, 'data', 'contract-rules.json')),
    setupRules: J(path.join(here, 'data', 'setup-rules.json')),
    ipClasses: J(path.join(here, 'data', 'ip-classes.json')),
    samples,
    industries: J(path.join(shared, 'industries.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json'))
  };
};
