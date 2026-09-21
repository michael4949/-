/* demo-docs/ 每份文档的事实：走一遍真实链路（skills/_shared/docparse.js 解析 →
   对应模块内核的 ingest），把内核真正吐出来的回答取回来。
   两处在用：tools/make-demo-index.js 出 demo-docs/README.md，
            docs/make-script.js 出销售话术稿里的演示文档一节。
   两边引同一份，稿子就不会和现场看到的对不上。 */
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
const ORDER = ['m4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11'];
/* 兜底话术：回答里出现这些，就说明这一屏没认出来，得换一屏 */
const MISS = ['没有识别到', '没有抽到', '没抽到', '读不出', '格式不支持', '没有可读', '没法回填',
              '里面没有', '进不了', '认不出', '没有对应', '暂不支持', '没读到',
              '这边不动数', '对不上', '这张表里没有', '没有可对应', '规格不动数',
              '正文没有', '没有入池', '没有生产订单'];
/* 上传位置：绝大多数进模块第一屏就能传；m11 的两份要等「生成应用」出了规格，
   对象库里才有字段可比对 —— 这两条是 tools/verify-demo-docs-browser.js 在真页面上跑出来的。 */
const AT = {
  'm11-备件申领台账-苏州华创精密.xlsx': '第 2 屏「生成应用」',
  'm11-需求说明书-备件申领.docx': '第 2 屏「生成应用」'
};
const DOC = /\.(xlsx|docx|eml|pdf|pptx|csv|txt|json)$/i;

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

function facts() {
  const dir = path.join(ROOT, 'demo-docs');
  const files = fs.readdirSync(dir).filter((f) => DOC.test(f));
  files.sort((a, b) => {
    const ia = ORDER.indexOf((a.match(/^(m\d+)-/) || [])[1]);
    const ib = ORDER.indexOf((b.match(/^(m\d+)-/) || [])[1]);
    return ia - ib || a.localeCompare(b, 'zh');
  });
  const out = [];
  files.forEach((f) => {
    const id = (f.match(/^(m\d+)-/) || [])[1];
    if (!id || !MOD[id]) return;
    const bytes = fs.readFileSync(path.join(dir, f));
    const doc = DP.parse({ name: f, bytes: bytes });
    const { core, lib, d, R } = kernelOf(id);
    let best = null;
    for (const s of core.screens()) {
      let r = null;
      try { r = core.ingest(doc, s.key, d, lib, R); } catch (e) { r = null; }
      if (!r || !r.text) continue;
      if (!MISS.some((w) => r.text.indexOf(w) >= 0)) { best = r; break; }
      if (!best) best = r;
    }
    const text = String((best && best.text) || '');
    out.push({
      id: id, module: MOD[id][2], file: f, kind: DP.label(doc.kind),
      sizeKB: Math.round(bytes.length / 1024),
      at: AT[f] || '进模块第一屏',
      say: text.split('\n').filter((x) => x.trim()),
      text: text,
      blocks: best && best.blocks ? best.blocks.map((b) => b.type).join(' / ') : '—',
      act: best && best.act ? best.act.type : '—'
    });
  });
  return out;
}

module.exports = { facts: facts, MOD: MOD, ORDER: ORDER, MISS: MISS, AT: AT, DOC: DOC };
