// 组装内核需要的数据包：岗位库 / JD 段落块 / 面试题库 / 合规规则 / 成本参数 + 三套样本 —— skill 与原型构建脚本共用
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
    jobs: J(path.join(here, 'data', 'jobs.json')),
    jdBlocks: J(path.join(here, 'data', 'jd-blocks.json')),
    questions: J(path.join(here, 'data', 'questions.json')),
    complianceRules: J(path.join(here, 'data', 'compliance-rules.json')),
    costParams: J(path.join(here, 'data', 'cost-params.json')),
    samples,
    industries: J(path.join(shared, 'industries.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json'))
  };
};
