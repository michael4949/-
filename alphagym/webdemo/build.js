#!/usr/bin/env node
/**
 * 把引擎源码、真实行情数据、图表库和 UI 层内联成一个自包含 HTML。
 *
 * 为什么要自包含：这个 demo 的意义在于「跑的是真的」。一旦依赖 CDN 或本地服务，
 * 别人打开时可能什么都看不到，那就又回到了「演示」而不是「验证」。
 *
 * 用法: node webdemo/build.js
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/** 引擎模块，按依赖顺序；fixture.js 依赖 node:fs，浏览器用不上，排除 */
const ENGINE = [
  'rng.js', 'stats.js', 'bars.js', 'trades.js', 'nulls.js', 'benchmarks.js',
  'behavior.js', 'engine.js', 'report.js', 'matching.js', 'replay.js',
  'simulate.js', 'query.js', 'similar.js', 'fileparse.js',
];
/** UI 层，按加载顺序（共享同一 IIFE 作用域） */
const UI = ['core.js', 'site.js', 'trade.js', 'ai.js', 'chat.js', 'boot.js'];

/** 每个品种保留的最大 K 线数（控制单文件体积） */
const CAPS = { EURUSD: 2500 };

/** 去掉 import 语句与 export 关键字，让各模块能在同一作用域里拼接 */
function stripModule(src, name) {
  const out = [];
  let inImport = false;
  for (const line of src.split('\n')) {
    if (inImport) {
      if (/from\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) inImport = false;
      continue;
    }
    if (/^\s*import\s/.test(line)) {
      if (!/from\s+['"][^'"]+['"]\s*;?\s*$/.test(line)) inImport = true;
      continue;
    }
    if (/^\s*export\s*\{[^}]*\}\s*;?\s*$/.test(line)) continue;
    out.push(line.replace(/^(\s*)export\s+(?=(const|let|var|function|class|async))/, '$1'));
  }
  return `\n/* ══════ ${name} ══════ */\n` + out.join('\n');
}

function loadData() {
  const files = ['sp500_daily.json', 'nasdaq_daily.json', 'goog_daily.json', 'eurusd_h1.json'];
  const out = {};
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
    const cap = CAPS[raw.symbol];
    const rows = cap ? raw.rows.slice(-cap) : raw.rows;
    out[raw.symbol] = {
      symbol: raw.symbol, display: raw.display || raw.symbol,
      timeframe: raw.timeframe, source: raw.source, count: rows.length, rows,
    };
  }
  return out;
}

function findKlineCharts() {
  const cands = [
    join(ROOT, 'node_modules/klinecharts/dist/umd/klinecharts.min.js'),
    join(ROOT, 'vendor/klinecharts.min.js'),
    '/tmp/claude-0/-home-user--/d5fa7034-3252-542e-b2af-69f9a84cc142/scratchpad/kc/node_modules/klinecharts/dist/umd/klinecharts.min.js',
  ];
  const p = cands.find(x => existsSync(x));
  if (!p) { console.error('找不到 klinecharts UMD 包，请先 npm install klinecharts@9'); process.exit(1); }
  return readFileSync(p, 'utf8');
}

function main() {
  const css = readFileSync(join(HERE, 'ui', 'styles.css'), 'utf8');
  const markup = readFileSync(join(HERE, 'ui', 'markup.html'), 'utf8');
  const engine = ENGINE.map(m => stripModule(readFileSync(join(ROOT, 'src', m), 'utf8'), 'src/' + m)).join('\n');
  const ui = UI.map(m => readFileSync(join(HERE, 'ui', m), 'utf8')).join('\n');
  const kc = findKlineCharts();
  const data = loadData();

  const head = `<title>练盘 AlphaGym — 交易练习与能力评估</title>
<meta name="description" content="回放二十年真实历史行情反复练习，并用统计方法客观评估交易能力：技能与运气的分离、四维决策归因、相似形态检索与智能问数。">
<style>\n${css}\n</style>`;

  const scripts = `
<script>${kc}</script>
<script>const DATASETS = ${JSON.stringify(data)};</script>
<script type="module">
${engine}

/* ══════════════════════════════════════════════════════════════════
   以上是原封不动的引擎源码 —— 与 Node 端跑测试、跑统计校准的是同一份代码，
   build.js 只去掉了 import / export 把模块拼进同一作用域。

   以下 UI 层整体包在 IIFE 里与引擎作用域隔离：引擎里已有 sgn / pct
   这类短名字，UI 再定义同名常量会直接把整个脚本打挂。
   ══════════════════════════════════════════════════════════════════ */
(() => {
${ui}
})();
</script>`;

  const full = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
</head>
<body>
${markup}
${scripts}
</body>
</html>
`;
  const fragment = `${head}\n${markup}\n${scripts}\n`;

  const outDir = join(HERE, 'dist');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'alphagym-demo.html'), full);
  // Artifact 变体：宿主自带 <!doctype>/<head>/<body> 骨架，只交页面内容
  writeFileSync(join(outDir, 'alphagym-artifact.html'), fragment);

  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  const bars = Object.values(data).reduce((a, d) => a + d.count, 0);
  console.log(`已生成 ${join(outDir, 'alphagym-demo.html')}`);
  console.log(`  图表库 ${kb(kc.length)} · 引擎 ${kb(engine.length)} · UI ${kb(css.length + markup.length + ui.length)}`);
  console.log(`  数据 ${Object.keys(data).length} 品种 / ${bars.toLocaleString()} 根 · 总计 ${kb(full.length)}`);
}

main();
