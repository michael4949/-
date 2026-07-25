#!/usr/bin/env node
/**
 * 把引擎源码、真实行情数据、图表库内联成一个自包含的 HTML。
 *
 * 为什么要自包含：这个 demo 的全部意义在于「跑的是真的」。
 * 一旦依赖 CDN 或本地服务，别人打开时可能什么都看不到，
 * 那就又回到了「演示」而不是「验证」。
 *
 * 用法: node webdemo/build.js
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/** 依赖顺序内联；fixture.js 依赖 node:fs，浏览器里用不上，排除 */
const MODULES = [
  'rng.js', 'stats.js', 'bars.js', 'trades.js', 'nulls.js',
  'benchmarks.js', 'behavior.js', 'engine.js', 'report.js',
  'matching.js', 'replay.js', 'simulate.js',
];

/** 去掉 import 语句与 export 关键字，让各模块能在同一个作用域里拼接 */
function stripModuleSyntax(src, name) {
  const lines = src.split('\n');
  const out = [];
  let inImport = false;
  for (const line of lines) {
    if (inImport) {
      if (/from\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) inImport = false;
      continue;
    }
    if (/^\s*import\s/.test(line)) {
      // 单行 import 直接丢弃；多行 import 进入吞噬状态
      if (!/from\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) inImport = true;
      continue;
    }
    if (/^\s*export\s*\{[^}]*\}\s*;?\s*$/.test(line)) continue;   // export { a, b };
    out.push(line.replace(/^(\s*)export\s+(?=(const|let|var|function|class|async))/, '$1'));
  }
  return `\n/* ══════ src/${name} ══════ */\n` + out.join('\n');
}

function loadFixture(file, limit) {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', file), 'utf8'));
  const rows = limit ? raw.rows.slice(-limit) : raw.rows;
  return { symbol: raw.symbol, timeframe: raw.timeframe, source: raw.source, count: rows.length, rows };
}

function main() {
  const engine = MODULES
    .map(m => stripModuleSyntax(readFileSync(join(ROOT, 'src', m), 'utf8'), m))
    .join('\n');

  // 图表库：优先用本地安装的 UMD 压缩包
  const kcCandidates = [
    join(ROOT, 'node_modules/klinecharts/dist/umd/klinecharts.min.js'),
    join(ROOT, 'vendor/klinecharts.min.js'),
    '/tmp/claude-0/-home-user--/d5fa7034-3252-542e-b2af-69f9a84cc142/scratchpad/kc/node_modules/klinecharts/dist/umd/klinecharts.min.js',
  ];
  const kcPath = kcCandidates.find(p => existsSync(p));
  if (!kcPath) {
    console.error('找不到 klinecharts UMD 包。请先 npm install klinecharts@9');
    process.exit(1);
  }
  const kc = readFileSync(kcPath, 'utf8');

  const datasets = {
    goog: loadFixture('goog_daily.json'),
    eurusd: loadFixture('eurusd_h1.json', 2200),
  };

  let html = readFileSync(join(HERE, 'app.html'), 'utf8');
  html = html
    .replace('/*__KLINECHARTS__*/', () => kc)
    .replace('/*__ENGINE__*/', () => engine)
    .replace('/*__DATA__*/', () => `const DATASETS = ${JSON.stringify(datasets)};`);

  const outDir = join(HERE, 'dist');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'alphagym-demo.html');
  writeFileSync(outFile, html);

  // Artifact 变体：宿主自带 <!doctype>/<head>/<body> 骨架，这里只交页面内容。
  // 保留 <title>（宿主用它命名标签页），其余外层文档标签一律剥掉。
  const fragment = html
    .replace(/<!DOCTYPE html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*$/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
  writeFileSync(join(outDir, 'alphagym-artifact.html'), fragment);

  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`已生成 ${outFile}`);
  console.log(`  图表库 ${kb(kc.length)} · 引擎 ${kb(engine.length)} · `
    + `数据 ${datasets.goog.count}+${datasets.eurusd.count} 根 · 总计 ${kb(html.length)}`);
}

main();
