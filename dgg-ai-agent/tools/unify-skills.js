/*
 * 11 个 skill 统一更新
 * ------------------------------------------------------------
 * 1) SKILL.md 前言统一成同一套字段、同一个顺序，计数据实改写（data_files / datasets / actions）
 * 2) 内核 VERSION 常量与前言 version 对齐，按发布口径统一 +1 个 minor
 * 3) 打印改动清单；随后需重跑 scripts/run-examples.js 刷新 golden，再跑校验脚本
 *
 *   node tools/unify-skills.js --dry     只看会改什么
 *   node tools/unify-skills.js           实际改写
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'skills');
const SUITE = '薯片AI智能体 2026.09';
const UPDATED = '2026-09-20';
const DRY = process.argv.indexOf('--dry') >= 0;

const MAP_PATH = path.join(__dirname, 'skills.map.json');
const MAP = fs.existsSync(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')) : [];
const byDir = {};
MAP.forEach((m) => { byDir[m.dir] = m; });

/* 前言字段顺序（11 个包一致；带 when 的按条件出现） */
const ORDER = [
  'name', 'id', 'kind', 'credits', 'version', 'suite', 'updated',
  'triggers', 'inputs', 'data_files', 'datasets', 'actions',
  'llm_calls', 'llm_timeout_ms', 'offline', 'deterministic',
  'delivers', 'report_pages', 'brief_pages', 'universal'
];

function bumpMinor(v) {
  const p = String(v).split('.').map(Number);
  if (p.length !== 3 || p.some(isNaN)) return v;
  return p[0] + '.' + (p[1] + 1) + '.0';
}
function countJSON(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countJSON(path.join(dir, e.name));
    else if (e.name.endsWith('.json')) n++;
  }
  return n;
}
function parseFM(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('缺少前言');
  const fm = {}, order = [];
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    fm[k] = line.slice(i + 1).trim();
    order.push(k);
  }
  return { fm, order, raw: m[0], body: md.slice(m[0].length) };
}
function renderFM(fm) {
  const lines = ORDER.filter((k) => fm[k] !== undefined && fm[k] !== null && fm[k] !== '').map((k) => k + ': ' + fm[k]);
  return '---\n' + lines.join('\n') + '\n---\n';
}

const report = [];
for (const dir of fs.readdirSync(SRC).filter((d) => /^\d\d-/.test(d)).sort()) {
  const skillDir = path.join(SRC, dir);
  const mdPath = path.join(skillDir, 'SKILL.md');
  const md = fs.readFileSync(mdPath, 'utf8');
  const { fm, body } = parseFM(md);
  const m = byDir[dir];
  const before = JSON.stringify(fm);

  const oldVer = fm.version;
  const newVer = bumpMinor(oldVer);
  const changes = [];

  // 统一字段
  fm.version = newVer;
  fm.suite = SUITE;
  fm.updated = UPDATED;
  fm.offline = 'true';
  fm.deterministic = 'true';
  fm.universal = 'dus-1';

  const dataN = countJSON(path.join(skillDir, 'data'));
  if (String(fm.data_files) !== String(dataN)) changes.push('data_files ' + (fm.data_files === undefined ? '（缺）' : fm.data_files) + ' → ' + dataN);
  fm.data_files = String(dataN);

  if (m) {
    if (String(fm.datasets) !== String(m.datasets.length)) changes.push('datasets → ' + m.datasets.length);
    fm.datasets = String(m.datasets.length);
    if (String(fm.actions) !== String(m.actions.length)) changes.push('actions → ' + m.actions.length);
    fm.actions = String(m.actions.length);
  }
  if (Number(fm.llm_calls) === 0) delete fm.llm_timeout_ms;
  if (fm.kind !== '计算') delete fm.brief_pages;

  const out = renderFM(fm) + body;

  // 内核 VERSION 常量
  const kernelFile = fs.readdirSync(path.join(skillDir, 'core'))[0];
  const kPath = path.join(skillDir, 'core', kernelFile);
  let kSrc = fs.readFileSync(kPath, 'utf8');
  const kRe = new RegExp("VERSION = '" + oldVer.replace(/\./g, '\\.') + "'");
  const kHit = kRe.test(kSrc);
  if (kHit) kSrc = kSrc.replace(kRe, "VERSION = '" + newVer + "'");

  changes.unshift('version ' + oldVer + ' → ' + newVer + (kHit ? '（内核同步）' : '（内核未命中，需手查）'));
  report.push({ dir, id: fm.id, changes });

  if (!DRY) {
    fs.writeFileSync(mdPath, out);
    if (kHit) fs.writeFileSync(kPath, kSrc);
  }
  if (before === JSON.stringify(fm) && !kHit) report[report.length - 1].changes.push('（无变化）');
}

console.log((DRY ? '【预演】' : '【已改写】') + ' 11 个 skill 统一更新 · 套件 ' + SUITE + '\n');
report.forEach((r) => {
  console.log(r.dir.padEnd(20) + r.id);
  r.changes.forEach((c) => console.log('    · ' + c));
});
console.log('\n下一步：逐个重跑 scripts/run-examples.js 刷新 golden，再跑 validate / validate-schema。');
