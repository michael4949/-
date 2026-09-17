// 构建期禁忌词扫描：本包的数据文案 + 四套样例输出里所有会出现在屏幕上的字
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const makeLint = require(path.join(here, '..', '_shared', 'lint.js'));
const data = require('./load-data.js')();
const lint = makeLint(data.lintWords);
const verbose = process.argv.indexOf('--verbose') >= 0;

let n = 0, hard = 0, soft = 0;
const hits = [];
function walk(node, at) {
  if (node == null) return;
  if (typeof node === 'string') {
    n++;
    const h = lint.hard(node), rv = lint.review(node);
    if (h.length) { hard++; hits.push(['硬', at, node.slice(0, 60), h.join('、')]); }
    else if (rv.length) { soft++; if (verbose) hits.push(['待审', at, node.slice(0, 60), rv.join('、')]); }
    return;
  }
  if (Array.isArray(node)) { node.forEach((x, i) => walk(x, at + '[' + i + ']')); return; }
  if (typeof node === 'object') { Object.keys(node).forEach((k) => walk(node[k], at + '.' + k)); }
}

walk(data.constants, 'constants');
walk(data.levers, 'levers');
walk(data.benchmarks, 'benchmarks');
walk(data.reportText, 'reportText');
['S1', 'S2', 'S3', 'S4'].forEach((k) => {
  const f = path.join(here, 'examples', k + '.output.json');
  if (fs.existsSync(f)) walk(JSON.parse(fs.readFileSync(f, 'utf8')), k);
});

hits.forEach((h) => console.log(`  [${h[0]}] ${h[1]}  「${h[2]}」  ← ${h[3]}`));
console.log(`lint: 扫描 ${n} 段，硬命中 ${hard}，待审 ${soft}` + (verbose ? '' : '（加 --verbose 查看待审项）'));
process.exit(hard ? 1 : 0);
