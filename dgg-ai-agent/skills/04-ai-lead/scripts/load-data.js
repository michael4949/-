// 组装内核需要的数据包：渠道 / 信号 / 阶段 / 脚本块 + 三套样本 + 模块 2 的行业痛点库 —— skill 与原型构建脚本共用
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const shared = path.join(here, '..', '_shared');
const m2dir = path.join(here, '..', '02-scene-ranking', 'data', 'sectors');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
module.exports = function loadData() {
  const dir = path.join(here, 'data', 'samples');
  const samples = {};
  fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => { const s = J(path.join(dir, f)); samples[s.archetype] = s; });
  const pains = {};
  fs.readdirSync(m2dir).filter((f) => f.endsWith('.json')).forEach((f) => { const s = J(path.join(m2dir, f)); pains[s.sector] = { name: s.sectorName, pains: s.pains }; });
  return {
    channels: J(path.join(here, 'data', 'channels.json')),
    signals: J(path.join(here, 'data', 'signals.json')),
    stages: J(path.join(here, 'data', 'stages.json')),
    scripts: J(path.join(here, 'data', 'scripts.json')),
    pains,
    samples,
    industries: J(path.join(shared, 'industries.json')),
    credits: J(path.join(shared, 'credits.json')),
    lintWords: J(path.join(shared, 'lint-words.json'))
  };
};
