// 四套样例企业跑内核，写 golden 输出并打印摘要。原型加载同一份样例时，屏上数字必须与这里逐字一致。
const fs = require('fs');
const path = require('path');
const core = require('../core/compute.js');
const data = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.input.json')).sort()) {
  const input = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const r = core.compute(input, data);
  if (!r.ok) { console.error(f, r.errors); process.exitCode = 1; continue; }
  fs.writeFileSync(path.join(dir, f.replace('.input.', '.output.')), JSON.stringify(r, null, 2));
  console.log(`\n【${r.profile.name}】${r.profile.sectorName} · ${r.profile.industryName} · ${r.profile.sizeName} · 权重 ${r.weights.presetName}`);
  console.log(`  痛点 ${r.pains.length} 项（集中在${r.painProfile.groups.filter((g) => g.key === r.painProfile.focus)[0].name}）· 数据就绪 ${r.readiness.pct}% · 投入档 ${r.investment.name}`);
  r.ranked.slice(0, 5).forEach((s) => console.log(`  ${String(s.rank).padStart(2)}. ${s.score.toFixed(1).padStart(5)}  ${s.name}  [痛${s.axis.pain} 数${s.axis.data} 效${s.axis.cycle} 槛${s.axis.barrier}]  ${s.module}${s.blocked ? ' ⚠需补数据' : ''}`));
  console.log('  三步走: ' + r.combo.map((c) => `${c.name}=${c.scenes.map((s) => s.name).join('/')}`).join('  '));
  console.log('  补齐: ' + (r.readiness.missing.map((m) => `${m.name}(${m.unlock})`).join('、') || '无') + ' | 风险: ' + r.risks.map((x) => x.level + x.title).join('；'));
}
