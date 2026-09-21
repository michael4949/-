// 构建：把外壳、内核、数据、图表库、图标、二维码库全部内联进一个 dist/index.html（file:// 双击即开，零外部请求）
const fs = require('fs');
const path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const skills = path.join(__dirname, '..', 'skills');
const m1 = require(path.join(skills, '01-ai-maturity', 'scripts', 'load-data.js'))();
const m2 = require(path.join(skills, '02-scene-ranking', 'scripts', 'load-data.js'))();
const m3 = require(path.join(skills, '03-roi-calculator', 'scripts', 'load-data.js'))();
const m10 = require(path.join(skills, '10-ai-erp', 'scripts', 'load-data.js'))();
const m6 = require(path.join(skills, '06-ai-cfo', 'scripts', 'load-data.js'))();
const m4 = require(path.join(skills, '04-ai-lead', 'scripts', 'load-data.js'))();
const m7 = require(path.join(skills, '07-ai-legal', 'scripts', 'load-data.js'))();
const m5 = require(path.join(skills, '05-ai-hr', 'scripts', 'load-data.js'))();
const m9 = require(path.join(skills, '09-ai-decision', 'scripts', 'load-data.js'))();
const m8 = require(path.join(skills, '08-ai-process', 'scripts', 'load-data.js'))();
const m11 = require(path.join(skills, '11-ai-dev', 'scripts', 'load-data.js'))();
const exDir = path.join(skills, '01-ai-maturity', 'examples');
const examples = fs.readdirSync(exDir).filter((f) => f.endsWith('.input.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8')));
const data = {
  fields: m1.fields, provinces: m1.provinces, industries: m1.industries, credits: m1.credits, lintWords: m1.lintWords,
  companies: examples.map((e) => ({ profile: e.profile })),
  m1: { dimensions: m1.dimensions, questions: m1.questions, levels: m1.levels, diagnostics: m1.diagnostics, benchmark: m1.benchmark,
        actions: m1.actions, scenes: m1.scenes, risks: m1.risks, reportText: m1.reportText, promptTemplate: m1.promptTemplate },
  m2: { sectors: m2.sectors, libTotal: m2.libTotal, axes: m2.axes, conditions: m2.conditions, reportText: m2.reportText, promptTemplate: m2.promptTemplate },
  m3: { sectors: m3.sectors, constants: m3.constants, levers: m3.levers, sceneLevers: m3.sceneLevers, benchmarks: m3.benchmarks, investmentProfile: m3.investmentProfile, reportText: m3.reportText, promptTemplate: m3.promptTemplate },
  m10: { archetypes: m10.archetypes, samples: m10.samples },
  m6: { rules: m6.rules, riskRules: m6.riskRules, benchmarks: m6.benchmarks, policies: m6.policies, samples: m6.samples },
  m4: { channels: m4.channels, signals: m4.signals, stages: m4.stages, scripts: m4.scripts, pains: m4.pains, samples: m4.samples },
  m7: { contractRules: m7.contractRules, setupRules: m7.setupRules, ipClasses: m7.ipClasses, samples: m7.samples },
  m5: { jobs: m5.jobs, jdBlocks: m5.jdBlocks, questions: m5.questions, complianceRules: m5.complianceRules, costParams: m5.costParams, samples: m5.samples },
  m9: { metricTree: m9.metricTree, evidence: m9.evidence, playbooks: m9.playbooks, approvalRules: m9.approvalRules, samples: m9.samples },
  m8: { vocab: m8.vocab, rules: m8.rules, improveLib: m8.improveLib, samples: m8.samples },
  m11: { lexicon: m11.lexicon, objects: m11.objects, flows: m11.flows, roles: m11.roles, components: m11.components, presets: m11.presets, tests: m11.tests, deltas: m11.deltas, integrations: m11.integrations, samples: m11.samples }
};
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'assets', 'dgg-logo.png')).toString('base64');
// split/join：替换文本里的 $& $' $` 等不会被当作模式解释
const put = (html, marker, content) => { if (!html.includes(marker)) throw new Error('marker missing: ' + marker); return html.split(marker).join(content); };
let html = R('src/index.template.html');
html = put(html, '/*__TOKENS_CSS__*/', R('src/tokens.css'));
html = put(html, '/*__SHELL_CSS__*/', R('src/shell.css'));
html = put(html, '/*__REPORT_CSS__*/', R('src/report.css'));
html = put(html, '/*__MODULE_02_CSS__*/', R('src/module-02.css'));
html = put(html, '/*__REPORT_M1_CSS__*/', R('src/report-m1.css'));
html = put(html, '/*__REPORT_M2_CSS__*/', R('src/report-m2.css'));
html = put(html, '/*__MODULE_03_CSS__*/', R('src/module-03.css'));
html = put(html, '/*__REPORT_M3_CSS__*/', R('src/report-m3.css'));
html = put(html, '/*__PRODUCT_CSS__*/', R('src/product.css'));
html = put(html, '/*__MODULE_10_CSS__*/', R('src/module-10.css'));
html = put(html, '/*__MODULE_06_CSS__*/', R('src/module-06.css'));
html = put(html, '/*__MODULE_04_CSS__*/', R('src/module-04.css'));
html = put(html, '/*__MODULE_07_CSS__*/', R('src/module-07.css'));
html = put(html, '/*__MODULE_05_CSS__*/', R('src/module-05.css'));
html = put(html, '/*__MODULE_09_CSS__*/', R('src/module-09.css'));
html = put(html, '/*__MODULE_08_CSS__*/', R('src/module-08.css'));
html = put(html, '/*__MODULE_11_CSS__*/', R('src/module-11.css'));
html = put(html, '/*__THEME_SHELL_CSS__*/', R('src/theme-shell.css'));
html = put(html, '/*__THEME_PRODUCT_CSS__*/', R('src/theme-product.css'));
html = put(html, '/*__ANIM_CSS__*/', R('src/anim.css'));
html = put(html, '/*__CHAT_CSS__*/', R('src/chat.css'));
html = put(html, '/*__GUIDE_CSS__*/', R('src/guide.css'));
html = put(html, '/*__THEME_HOME_CSS__*/', R('src/theme-home.css'));
html = put(html, '/*__DATA_JSON__*/', JSON.stringify(data).replace(/<\/script/gi, '<\\/script'));
html = put(html, '/*__QRCODE_JS__*/', R('vendor/qrcode.js'));
html = put(html, '/*__LINT_JS__*/', R('../skills/_shared/lint.js'));
html = put(html, '/*__CORE_M1_JS__*/', R('../skills/01-ai-maturity/core/compute.js'));
html = put(html, '/*__CORE_M2_JS__*/', R('../skills/02-scene-ranking/core/compute.js'));
html = put(html, '/*__CORE_M3_JS__*/', R('../skills/03-roi-calculator/core/compute.js'));
html = put(html, '/*__CORE_M10_JS__*/', R('../skills/10-ai-erp/core/sim.js'));
html = put(html, '/*__CORE_M6_JS__*/', R('../skills/06-ai-cfo/core/fin.js'));
html = put(html, '/*__CORE_M4_JS__*/', R('../skills/04-ai-lead/core/lead.js'));
html = put(html, '/*__CORE_M7_JS__*/', R('../skills/07-ai-legal/core/legal.js'));
html = put(html, '/*__CORE_M5_JS__*/', R('../skills/05-ai-hr/core/hr.js'));
html = put(html, '/*__CORE_M9_JS__*/', R('../skills/09-ai-decision/core/decide.js'));
html = put(html, '/*__CORE_M8_JS__*/', R('../skills/08-ai-process/core/flow.js'));
html = put(html, '/*__CORE_M11_JS__*/', R('../skills/11-ai-dev/core/build.js'));
html = put(html, '/*__LOGO_DATA_URI__*/', logo);
html = put(html, '/*__SHELL_JS__*/', R('src/shell.js'));
html = put(html, '/*__FX_JS__*/', R('src/fx.js'));
html = put(html, '/*__CHARTS_JS__*/', R('src/charts.js'));
html = put(html, '/*__MODULE_01_JS__*/', R('src/module-01.js'));
html = put(html, '/*__CHARTS_M1_JS__*/', R('src/charts-m1.js'));
html = put(html, '/*__CHARTS_M2_JS__*/', R('src/charts-m2.js'));
html = put(html, '/*__MODULE_02_JS__*/', R('src/module-02.js'));
html = put(html, '/*__CHARTS_M3_JS__*/', R('src/charts-m3.js'));
html = put(html, '/*__MODULE_03_JS__*/', R('src/module-03.js'));
html = put(html, '/*__ANIM_JS__*/', R('src/anim.js'));
html = put(html, '/*__DOCPARSE_JS__*/', R('../skills/_shared/docparse.js') + '\n' + R('src/docparse.js'));  /* 解析内核下沉到 skills/_shared，原型只留 FileReader 薄包装 */
html = put(html, '/*__CHAT_JS__*/', R('src/chat.js'));
html = put(html, '/*__GUIDE_JS__*/', R('src/guide.js'));
html = put(html, '/*__PRODUCT_UI_JS__*/', R('src/product-ui.js'));
html = put(html, '/*__MODULE_10_JS__*/', R('src/module-10.js'));
html = put(html, '/*__MODULE_06_JS__*/', R('src/module-06.js'));
html = put(html, '/*__MODULE_04_JS__*/', R('src/module-04.js'));
html = put(html, '/*__MODULE_07_JS__*/', R('src/module-07.js'));
html = put(html, '/*__MODULE_05_JS__*/', R('src/module-05.js'));
html = put(html, '/*__MODULE_09_JS__*/', R('src/module-09.js'));
html = put(html, '/*__MODULE_08_JS__*/', R('src/module-08.js'));
html = put(html, '/*__MODULE_11_JS__*/', R('src/module-11.js'));
/* 并行改模块时，各自用 node build.js <自己的输出路径> 构建，不去抢公共的 dist/index.html */
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'dist', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(path.relative(__dirname, out), (html.length / 1024).toFixed(0) + ' KB');
