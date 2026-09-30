/*
 * 通用 Skill 打包
 * ------------------------------------------------------------
 * 把 dist-universal/ 下的 11 个包分别打成 zip，另出一个整套 zip（含套件索引与 Python 客户端）。
 *
 *   node tools/pack-universal.js
 *
 * 产物落在 dist-skills/（与既有交付目录一致，已 gitignore）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-universal');
const OUT = path.join(ROOT, 'dist-skills');
const registry = JSON.parse(fs.readFileSync(path.join(DIST, 'skills.json'), 'utf8'));
const SUITE = registry.suite;

const NAME_CN = {
  'ai-maturity': '模块1-企业AI成熟度评估', 'scene-ranking': '模块2-企业AI高价值场景排序', 'roi-calculator': '模块3-企业AI投入ROI测算器',
  'ai-lead': '模块4-AI获客', 'ai-hr': '模块5-AI人力官', 'ai-cfo': '模块6-AI CFO', 'ai-legal': '模块7-AI法务',
  'ai-process': '模块8-AI流程提效', 'ai-decision': '模块9-AI决策', 'ai-erp': '模块10-AI ERP', 'ai-dev': '模块11-AI软件开发'
};

fs.mkdirSync(OUT, { recursive: true });
const made = [];

for (const s of registry.skills) {
  const zip = path.join(OUT, SUITE.name + '-' + (NAME_CN[s.id] || s.id) + '-通用skill-v' + s.version + '.zip');
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-rq', zip, s.id, '-x', '*/.DS_Store'], { cwd: DIST });
  const kb = Math.round(fs.statSync(zip).size / 1024);
  made.push({ zip, kb });
  console.log('✔ ' + path.basename(zip).padEnd(58) + kb + ' KB');
}

/* 整套：11 个包 + 套件索引 + 规范 + Python 客户端 */
const allZip = path.join(OUT, SUITE.name + '-通用skill全套-' + SUITE.version + '.zip');
fs.rmSync(allZip, { force: true });
const staging = path.join(DIST, '_pack');
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
execFileSync('cp', ['-r', path.join(ROOT, 'universal', 'SPEC.md'), path.join(ROOT, 'universal', 'README.md'), staging]);
execFileSync('cp', ['-r', path.join(ROOT, 'universal', 'clients'), staging]);
execFileSync('zip', ['-rq', allZip, '.', '-x', '_pack/*', '*/.DS_Store'], { cwd: DIST });
execFileSync('zip', ['-rqj', allZip, path.join(staging, 'SPEC.md'), path.join(staging, 'README.md')]);
execFileSync('zip', ['-rq', allZip, 'clients'], { cwd: staging });
fs.rmSync(staging, { recursive: true, force: true });
const allKb = Math.round(fs.statSync(allZip).size / 1024);
console.log('✔ ' + path.basename(allZip).padEnd(58) + allKb + ' KB');
console.log('\n共 ' + (made.length + 1) + ' 个 zip → dist-skills/');
