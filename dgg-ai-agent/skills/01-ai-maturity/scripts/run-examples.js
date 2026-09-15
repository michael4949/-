// 用四套样例企业跑一遍内核，写出 golden 输出，并打印摘要。
// 原型加载同一份样例时，屏幕上的数字必须与这里逐字一致。
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
  console.log(`\n【${r.company.name}】${r.company.industryName} · ${r.company.sizeName} · 参考格 ${r.benchmark.key}（${r.benchmark.basis}）`);
  console.log(`  ${r.level.code} ${r.level.name}  ${r.total}/${r.max}   ` + r.dimensions.map((d) => `${d.name}${d.score}${d.band ? `[${d.band[0]}-${d.band[1]}]` : ''}${{ above: '↑', within: '·', below: '↓', unknown: '?' }[d.position]}`).join('  '));
  console.log('  ' + r.summary);
  r.actions.forEach((x) => console.log(`  ${x.order}. [${x.dimensionName}] ${x.title} —— ${x.text}（${x.service} / 可先试 ${x.module}）`));
}
