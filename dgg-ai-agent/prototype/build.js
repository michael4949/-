// 构建：把外壳、内核、数据、图标、二维码库全部内联进一个 dist/index.html（file:// 双击即开，零外部请求）
const fs = require('fs');
const path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const skills = path.join(__dirname, '..', 'skills');
const loadM1 = require(path.join(skills, '01-ai-maturity', 'scripts', 'load-data.js'));
const m1 = loadM1();
const examples = fs.readdirSync(path.join(skills, '01-ai-maturity', 'examples'))
  .filter((f) => f.endsWith('.input.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(skills, '01-ai-maturity', 'examples', f), 'utf8')));
const data = {
  labels: m1.labels,
  industryMap: m1.industryMap,
  credits: JSON.parse(R('../skills/_shared/credits.json')),
  lintWords: m1.lintWords,
  companies: examples.map((e) => ({ company: e.company })),
  m1: { dimensions: m1.dimensions, questions: m1.questions, levels: m1.levels, benchmark: m1.benchmark, actions: m1.actions, promptTemplate: m1.promptTemplate }
};
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'assets', 'dgg-logo.png')).toString('base64');
// split/join：替换文本里的 $& $' $` 等不会被当作模式解释
const put = (html, marker, content) => {
  if (!html.includes(marker)) throw new Error('marker missing: ' + marker);
  return html.split(marker).join(content);
};
let html = R('src/index.template.html');
html = put(html, '/*__TOKENS_CSS__*/', R('src/tokens.css'));
html = put(html, '/*__SHELL_CSS__*/', R('src/shell.css'));
html = put(html, '/*__DATA_JSON__*/', JSON.stringify(data).replace(/<\/script/gi, '<\\/script'));
html = put(html, '/*__QRCODE_JS__*/', R('vendor/qrcode.js'));
html = put(html, '/*__LINT_JS__*/', R('../skills/_shared/lint.js'));
html = put(html, '/*__CORE_M1_JS__*/', R('../skills/01-ai-maturity/core/compute.js'));
html = put(html, '/*__LOGO_DATA_URI__*/', logo);
html = put(html, '/*__SHELL_JS__*/', R('src/shell.js'));
html = put(html, '/*__MODULE_01_JS__*/', R('src/module-01.js'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
