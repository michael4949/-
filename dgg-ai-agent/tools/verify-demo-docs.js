/* 演示文档自测：把 demo-docs/ 里的每份文件走一遍真实链路
   （skills/_shared/docparse.js 解析 → 对应模块内核的 ingest），
   打印内核真正吐出来的回答，并判定是不是「认出来了」。
   判据不是「没报错」，而是回答里不能出现「没有识别到 / 没抽到 / 读不出」这类兜底话术。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DP = require(path.join(ROOT, 'skills/_shared/docparse.js'));

const MOD = {
  m4:  ['04-ai-lead', 'lead.js', 'AI获客'],
  m5:  ['05-ai-hr', 'hr.js', 'AI人力官'],
  m6:  ['06-ai-cfo', 'fin.js', 'AI CFO'],
  m7:  ['07-ai-legal', 'legal.js', 'AI法务'],
  m8:  ['08-ai-process', 'flow.js', 'AI流程提效'],
  m9:  ['09-ai-decision', 'decide.js', 'AI决策'],
  m10: ['10-ai-erp', 'sim.js', 'AI ERP'],
  m11: ['11-ai-dev', 'build.js', 'AI软件开发']
};
/* 兜底话术：出现这些就说明没认出来，现场会很难看 */
const MISS = ['没有识别到', '没有抽到', '没抽到', '读不出', '格式不支持', '没有可读', '没法回填',
              '里面没有', '进不了', '认不出', '没有对应', '暂不支持', '没读到',
              /* 下面这些不是报错，是「读进来了但没派上用场」——现场同样难看，一并当没认出 */
              '这边不动数', '对不上', '这张表里没有', '没有可对应', '规格不动数',
              '正文没有', '没有入池', '没有生产订单'];

function kernelOf(id) {
  const [dir, file] = MOD[id];
  const core = require(path.join(ROOT, 'skills', dir, 'core', file));
  const lib = require(path.join(ROOT, 'skills', dir, 'scripts', 'load-data.js'))();
  if (id === 'm8' && !lib.erp) lib.erp = require(path.join(ROOT, 'skills/10-ai-erp/core/sim.js'));
  let d, R;
  const raw = lib.samples.make;
  if (id === 'm11') { d = core.generate(core.ensure(raw), lib); R = core.run(d, lib); }
  else if (id === 'm10') { d = core.normalize(raw, lib); R = core.schedule(d, lib); }
  else { d = raw; R = core.run(raw, lib); }
  return { core, lib, d, R };
}

const only = process.argv[2] || '';
/* 只认文档，放过 README.md 这类说明文件 */
const DOC = /\.(xlsx|docx|eml|pdf|pptx|csv|txt|json)$/i;
const files = fs.readdirSync(path.join(ROOT, 'demo-docs')).filter((f) => DOC.test(f)).sort();
let pass = 0, fail = 0;
const report = [];
for (const f of files) {
  const id = (f.match(/^(m\d+)-/) || [])[1];
  if (!id || !MOD[id]) { console.log('✘ ' + f + ' —— 文件名要以 m4- … m11- 开头'); fail++; continue; }
  if (only && id !== only) continue;
  const bytes = fs.readFileSync(path.join(ROOT, 'demo-docs', f));
  const doc = DP.parse({ name: f, bytes: bytes });
  const { core, lib, d, R } = kernelOf(id);
  const screens = core.screens();
  /* 每一屏都试，取第一个答得上的；现场销售在哪一屏传都应该有反应 */
  let best = null, bestStep = null;
  for (const s of screens) {
    let r = null;
    try { r = core.ingest(doc, s.key, d, lib, R); } catch (e) { r = { text: 'ingest 抛错：' + e.message }; }
    if (!r || !r.text) continue;
    const miss = MISS.some((w) => r.text.indexOf(w) >= 0);
    if (!miss) { best = r; bestStep = s.label; break; }
    if (!best) { best = r; bestStep = s.label; }
  }
  const ok = best && best.text && !MISS.some((w) => best.text.indexOf(w) >= 0);
  const kind = DP.label(doc.kind);
  const line = (ok ? '✔' : '✘') + ' ' + f.padEnd(46) + ' [' + MOD[id][2] + ' / ' + kind + ']';
  console.log(line);
  console.log('   解析：' + (doc.ok ? 'ok' : '失败 ' + doc.note) +
    '  段 ' + (doc.paragraphs || []).length + ' 表 ' + (doc.tables || []).length +
    ' 表格页 ' + ((doc.sheets || []).length) + ' 幻灯 ' + ((doc.slides || []).length));
  console.log('   屏：' + bestStep);
  console.log('   答：' + String((best && best.text) || '（空）').replace(/\n/g, ' ⏎ ').slice(0, 260));
  if (best && best.blocks) console.log('   块：' + best.blocks.map((b) => b.type).join(' / '));
  if (best && best.act) console.log('   动作：' + best.act.type + (best.act.ref ? ' → ' + best.act.ref : '') + (best.act.panel ? ' → ' + best.act.panel : ''));
  console.log('');
  ok ? pass++ : fail++;
  report.push({ f, id, ok });
}
console.log('──────── ' + pass + ' 认出 / ' + (pass + fail) + ' 份 ────────');
if (fail) { console.log('没认出的：' + report.filter((x) => !x.ok).map((x) => x.f).join(', ')); process.exit(1); }
