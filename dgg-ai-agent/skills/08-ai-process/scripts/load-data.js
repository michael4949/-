// 组装内核需要的数据包：词表 / 规则 / 方案库 + 三套样本 + AI ERP 的样本（工序流的产线与路线从那里来）—— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  const dir = path.join(here, 'data', 'samples');
  const samples = {};
  if (fs.existsSync(dir)) fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => { const s = J(path.join(dir, f)); samples[s.archetype] = s; });
  const erp = require(path.join(here, '..', '10-ai-erp', 'scripts', 'load-data.js'))();
  return {
    vocab: J(path.join(here, 'data', 'vocab.json')),
    rules: J(path.join(here, 'data', 'rules.json')),
    improveLib: J(path.join(here, 'data', 'improve-lib.json')),
    samples,
    erpSamples: erp.samples,
    industries: J(path.join(shared, 'industries.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json'))
  };
};
