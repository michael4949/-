/* 生成 demo-docs/README.md：每份文档 → 传哪个模块、在哪一屏、内核会答什么。
   内容不是手写的，是把 demo-docs/ 每份文件真跑一遍 docparse + ingest 取回来的，
   所以这张表和现场看到的结果一致。 */
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
/* 上传位置：绝大多数进模块第一屏就能传；m11 的两份要等「生成应用」出了规格，
   对象库里才有字段可比对 —— 这两条是 tools/verify-demo-docs-browser.js 在真页面上跑出来的。 */
const AT = {
  'm11-备件申领台账-苏州华创精密.xlsx': '第 2 屏「生成应用」（进模块后先点一次屏底「下一步」）',
  'm11-需求说明书-备件申领.docx': '第 2 屏「生成应用」（进模块后先点一次屏底「下一步」）'
};
const MISS = ['没有识别到', '没有抽到', '没抽到', '读不出', '格式不支持', '没有可读', '没法回填',
              '里面没有', '进不了', '认不出', '没有对应', '暂不支持', '没读到',
              '这边不动数', '对不上', '这张表里没有', '没有可对应', '规格不动数',
              '正文没有', '没有入池', '没有生产订单'];

const CACHE = {};
function kernelOf(id) {
  if (CACHE[id]) return CACHE[id];
  const [dir, file] = MOD[id];
  const core = require(path.join(ROOT, 'skills', dir, 'core', file));
  const lib = require(path.join(ROOT, 'skills', dir, 'scripts', 'load-data.js'))();
  if (id === 'm8' && !lib.erp) lib.erp = require(path.join(ROOT, 'skills/10-ai-erp/core/sim.js'));
  let d, R;
  const raw = lib.samples.make;
  if (id === 'm11') { d = core.generate(core.ensure(raw), lib); R = core.run(d, lib); }
  else if (id === 'm10') { d = core.normalize(raw, lib); R = core.schedule(d, lib); }
  else { d = raw; R = core.run(raw, lib); }
  return (CACHE[id] = { core, lib, d, R });
}

const files = fs.readdirSync(path.join(ROOT, 'demo-docs'))
  .filter((f) => /\.(xlsx|docx|eml|pdf|pptx|csv|txt|md|json)$/i.test(f)).sort();
const rows = [];
for (const f of files) {
  const id = (f.match(/^(m\d+)-/) || [])[1];
  if (!id || !MOD[id]) continue;
  const bytes = fs.readFileSync(path.join(ROOT, 'demo-docs', f));
  const doc = DP.parse({ name: f, bytes: bytes });
  const { core, lib, d, R } = kernelOf(id);
  let best = null, step = null;
  for (const s of core.screens()) {
    let r = null;
    try { r = core.ingest(doc, s.key, d, lib, R); } catch (e) { r = null; }
    if (!r || !r.text) continue;
    if (!MISS.some((w) => r.text.indexOf(w) >= 0)) { best = r; step = s.label; break; }
    if (!best) { best = r; step = s.label; }
  }
  const blocks = best && best.blocks ? best.blocks.map((b) => b.type).join(' / ') : '—';
  const act = best && best.act ? best.act.type : '—';
  const say = String((best && best.text) || '').split('\n').filter((x) => x.trim());
  rows.push({ id, f, kind: DP.label(doc.kind), step: AT[f] || '进模块第一屏，直接传', say, blocks, act,
              size: Math.round(bytes.length / 1024) + ' KB' });
}

const NAME = { m4: 'AI获客', m5: 'AI人力官', m6: 'AI CFO', m7: 'AI法务',
               m8: 'AI流程提效', m9: 'AI决策', m10: 'AI ERP', m11: 'AI软件开发' };
const order = ['m4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11'];
let out = '# 展台演示用文档\n\n';
out += '两家虚拟企业：宁波东立机电有限公司、苏州华创精密制造有限公司（另有台州瑞驰汽配、无锡精锻传动件作为来函方）。\n';
out += '八个场景各两份，共 ' + rows.length + ' 份。\n\n';
out += '## 怎么用\n\n';
out += '1. 首页点进对应场景，右侧对话坞点回形针，选这个场景的文件。\n';
out += '2. 传完等两三秒，AI 会把读到的内容说出来，并顺手改一处屏上的数或跳一屏。\n';
out += '3. 「传哪一屏」写着「直接传」的，进模块就能传；其余屏也能传，回答会换成那一屏的口径。\n\n';
order.forEach((id) => {
  const mine = rows.filter((r) => r.id === id);
  if (!mine.length) return;
  out += '## ' + NAME[id] + '\n\n';
  mine.forEach((r) => {
    out += '**' + r.f + '**　' + r.kind + ' · ' + r.size + '\n\n';
    out += '- 传哪一屏：' + r.step + '\n';
    out += '- 随答给出：' + r.blocks + ' 块，动作 ' + r.act + '\n';
    out += '- 会答：\n\n';
    r.say.forEach((x) => { out += '  > ' + x + '\n'; });
    out += '\n';
  });
});
out += '---\n\n';
out += '上面每条「会答」都是内核真吐出来的原话，不是写的。核验与重出：\n\n';
out += '- `node tools/verify-demo-docs.js` —— 走 Node 侧的解析 + 内核摄入\n';
out += '- `NODE_PATH=<playwright 所在目录> node tools/verify-demo-docs-browser.js` —— 真在浏览器里逐份上传，读页面上的回答\n';
out += '- `node tools/make-demo-index.js` —— 重出本表\n';
fs.writeFileSync(path.join(ROOT, 'demo-docs', 'README.md'), out);
console.log('写出 demo-docs/README.md，' + rows.length + ' 份');
