// 构建：把外壳、内核、数据、图表库、图标、二维码库全部内联进一个 dist/index.html（file:// 双击即开，零外部请求）
const fs = require('fs');
const path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const skills = path.join(__dirname, '..', 'skills');
const m1 = require(path.join(skills, '01-ai-maturity', 'scripts', 'load-data.js'))();
const m2 = require(path.join(skills, '02-scene-ranking', 'scripts', 'load-data.js'))();
const exDir = path.join(skills, '01-ai-maturity', 'examples');
const examples = fs.readdirSync(exDir).filter((f) => f.endsWith('.input.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8')));
const data = {
  fields: m1.fields, provinces: m1.provinces, industries: m1.industries, credits: m1.credits, lintWords: m1.lintWords,
  companies: examples.map((e) => ({ profile: e.profile })),
  m1: { dimensions: m1.dimensions, questions: m1.questions, levels: m1.levels, diagnostics: m1.diagnostics, benchmark: m1.benchmark,
        actions: m1.actions, scenes: m1.scenes, risks: m1.risks, reportText: m1.reportText, promptTemplate: m1.promptTemplate },
  m2: { sectors: m2.sectors, libTotal: m2.libTotal, axes: m2.axes, conditions: m2.conditions, reportText: m2.reportText, promptTemplate: m2.promptTemplate }
};
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'assets', 'dgg-logo.png')).toString('base64');
// split/join：替换文本里的 $& $' $` 等不会被当作模式解释
const put = (html, marker, content) => { if (!html.includes(marker)) throw new Error('marker missing: ' + marker); return html.split(marker).join(content); };
let html = R('src/index.template.html');
html = put(html, '/*__TOKENS_CSS__*/', R('src/tokens.css'));
html = put(html, '/*__SHELL_CSS__*/', R('src/shell.css'));
html = put(html, '/*__REPORT_CSS__*/', R('src/report.css'));
html = put(html, '/*__MODULE_02_CSS__*/', R('src/module-02.css'));
html = put(html, '/*__REPORT_M2_CSS__*/', R('src/report-m2.css'));
html = put(html, '/*__DATA_JSON__*/', JSON.stringify(data).replace(/<\/script/gi, '<\\/script'));
html = put(html, '/*__QRCODE_JS__*/', R('vendor/qrcode.js'));
html = put(html, '/*__LINT_JS__*/', R('../skills/_shared/lint.js'));
html = put(html, '/*__CORE_M1_JS__*/', R('../skills/01-ai-maturity/core/compute.js'));
html = put(html, '/*__CORE_M2_JS__*/', R('../skills/02-scene-ranking/core/compute.js'));
html = put(html, '/*__LOGO_DATA_URI__*/', logo);
html = put(html, '/*__SHELL_JS__*/', R('src/shell.js'));
html = put(html, '/*__CHARTS_JS__*/', R('src/charts.js'));
html = put(html, '/*__MODULE_01_JS__*/', R('src/module-01.js'));
html = put(html, '/*__CHARTS_M2_JS__*/', R('src/charts-m2.js'));
html = put(html, '/*__MODULE_02_JS__*/', R('src/module-02.js'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
