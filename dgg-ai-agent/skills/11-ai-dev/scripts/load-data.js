// 组装内核需要的数据包：词典 / 对象库 / 流程模板 / 岗位 / 组件 / 预置句 / 用例文案 / 变更类型 / 主数据来源 + 三套样本 + 三个兄弟模块的样本（主数据只解析不复制）—— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const skills = path.join(here, '..');
const shared = path.join(skills, '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  const dir = path.join(here, 'data', 'samples');
  const samples = {};
  if (fs.existsSync(dir)) fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => { const s = J(path.join(dir, f)); samples[s.archetype] = s; });
  const erp = require(path.join(skills, '10-ai-erp', 'scripts', 'load-data.js'))();
  const proc = require(path.join(skills, '08-ai-process', 'scripts', 'load-data.js'))();
  const hr = require(path.join(skills, '05-ai-hr', 'scripts', 'load-data.js'))();
  const d = (n) => J(path.join(here, 'data', n + '.json'));
  return {
    lexicon: d('lexicon'), objects: fs.existsSync(path.join(here, 'data', 'objects.json')) ? d('objects') : { objects: [] }, flows: d('flows'), roles: d('roles'), components: d('components'),
    presets: d('presets'), tests: d('tests'), deltas: d('deltas'), integrations: d('integrations'),
    samples,
    erpSamples: erp.samples, procSamples: proc.samples, hrSamples: hr.samples,
    industries: J(path.join(shared, 'industries.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json'))
  };
};
