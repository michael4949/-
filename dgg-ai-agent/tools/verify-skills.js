/*
 * 11 个 skill 一键校验
 * ------------------------------------------------------------
 * 各模块历史上脚本名不一（validate.js / validate-schema.js / lint.js），这里统一成一条命令：
 *
 *   node tools/verify-skills.js            跑每个包的全部校验脚本
 *   node tools/verify-skills.js --golden   先重跑 run-examples.js 刷新 golden，再校验
 *   node tools/verify-skills.js ai-erp     只跑一个
 *
 * 退出码：0 全通过 · 1 有失败。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'skills');
const args = process.argv.slice(2);
const GOLDEN = args.indexOf('--golden') >= 0;
const only = args.filter((a) => a.indexOf('--') !== 0)[0];

const dirs = fs.readdirSync(SRC).filter((d) => /^\d\d-/.test(d)).sort();
const rows = [];
let failed = 0;

for (const dir of dirs) {
  const skillDir = path.join(SRC, dir);
  const id = (fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8').match(/^id: (.+)$/m) || [])[1] || dir;
  if (only && only !== id && only !== dir) continue;
  const scripts = fs.existsSync(path.join(skillDir, 'scripts')) ? fs.readdirSync(path.join(skillDir, 'scripts')) : [];
  const toRun = [];
  if (GOLDEN && scripts.indexOf('run-examples.js') >= 0) toRun.push('run-examples.js');
  scripts.filter((s) => /^(validate|validate-schema|lint)\.js$/.test(s)).sort().forEach((s) => toRun.push(s));

  const results = [];
  for (const s of toRun) {
    const r = spawnSync(process.execPath, [path.join(skillDir, 'scripts', s)], { encoding: 'utf8', cwd: skillDir, timeout: 300000 });
    const ok = r.status === 0;
    if (!ok) failed++;
    const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').filter(Boolean).slice(-1)[0] || '';
    results.push({ s, ok, tail: tail.slice(0, 120) });
  }
  rows.push({ dir, id, results });
}

console.log('薯片AI智能体 · skill 校验' + (GOLDEN ? '（含刷新 golden）' : '') + '\n');
rows.forEach((r) => {
  console.log(r.dir.padEnd(20) + r.id);
  if (!r.results.length) { console.log('    · 没有校验脚本'); return; }
  r.results.forEach((x) => console.log('    ' + (x.ok ? '✔' : '✘') + ' ' + x.s.padEnd(20) + x.tail));
});
const total = rows.reduce((n, r) => n + r.results.length, 0);
console.log('\n' + (failed ? '✘ ' : '✔ ') + (total - failed) + '/' + total + ' 个脚本通过');
process.exit(failed ? 1 : 0);
