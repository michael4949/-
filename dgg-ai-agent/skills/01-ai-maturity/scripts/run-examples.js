// 用四套样例企业跑一遍内核，写出 golden 输出，并打印摘要。
// 原型加载同一份样例时，屏幕上的数字必须与这里逐字一致。
const fs = require('fs');
const path = require('path');
const core = require('../core/compute.js');
const data = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
const P = { above: '↑', within: '·', below: '↓', unknown: '?' };
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.input.json')).sort()) {
  const input = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const r = core.compute(input, data);
  if (!r.ok) { console.error(f, r.errors); process.exitCode = 1; continue; }
  fs.writeFileSync(path.join(dir, f.replace('.input.', '.output.')), JSON.stringify(r, null, 2));
  console.log(`\n【${r.profile.name}】${r.profile.sectorName} · ${r.profile.industryName} · ${r.profile.sizeName} · 参考格 ${r.benchmark.key}（${r.benchmark.basis}）`);
  console.log(`  ${r.level.code} ${r.level.name}  ${r.total}/${r.max} = ${r.pct}%  同行百分位 ${r.percentile}  ` + r.dimensions.map((d) => `${d.name}${d.pct}%${d.band ? `[${d.band[0]}-${d.band[1]}]` : ''}${P[d.position]}`).join('  '));
  console.log('  短板维度: ' + r.weakDims.join(' > ') + ' | 最弱子维度: ' + r.weaknesses.join(', ') + ' | 最强: ' + r.strengths.join(', '));
  r.actions.filter((x) => x.phase === 'p1').forEach((x) => console.log(`  P1 ${x.order}. [${x.dimensionName}·${x.id}] ${x.title} —— ${x.owner} / ${x.weeks} 周 / ${x.cost} / ${x.service}`));
  console.log('  场景 Top3: ' + r.scenes.slice(0, 3).map((s) => `${s.name}(${s.score})`).join(', ') + ' | 投入档: ' + r.investment.name + ' | 风险: ' + r.risks.map((x) => x.level + x.title).join('; '));
}
