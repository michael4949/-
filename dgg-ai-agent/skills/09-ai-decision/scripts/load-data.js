// 组装内核需要的数据包：指标树 / 证据库 / 方案库 / 会签规则 + 三套样本 —— skill 与原型构建脚本共用
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
    metricTree: J(path.join(here, 'data', 'metric-tree.json')),
    evidence: J(path.join(here, 'data', 'evidence.json')),
    playbooks: J(path.join(here, 'data', 'playbooks.json')),
    approvalRules: J(path.join(here, 'data', 'approval-rules.json')),
    samples,
    industries: J(path.join(shared, 'industries.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json'))
  };
};
