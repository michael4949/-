/* 生成 demo-docs/README.md：每份文档 → 传哪个模块、在哪一屏、内核会答什么。
   内容不是手写的，是 tools/demo-docs-facts.js 把每份文件真跑一遍
   docparse + ingest 取回来的，所以这张表和现场看到的结果一致。 */
const fs = require('fs');
const path = require('path');
const rows = require('./demo-docs-facts.js').facts();
const ORDER = require('./demo-docs-facts.js').ORDER;

let out = '# 展台演示用文档\n\n';
out += '两家虚拟企业：宁波东立机电有限公司、苏州华创精密制造有限公司（另有台州瑞驰汽配、无锡精锻传动件作为来函方）。\n';
out += '八个场景各两份，共 ' + rows.length + ' 份。\n\n';
out += '## 怎么用\n\n';
out += '1. 首页点进对应场景，右侧对话坞点回形针，选这个场景的文件。\n';
out += '2. 传完等两三秒，AI 会把读到的内容说出来，并顺手改一处屏上的数或跳一屏。\n';
out += '3. 「传哪一屏」写着「进模块第一屏」的，进去就能传；其余屏也能传，回答会换成那一屏的口径。\n\n';

ORDER.forEach((id) => {
  const mine = rows.filter((r) => r.id === id);
  if (!mine.length) return;
  out += '## ' + mine[0].module + '\n\n';
  mine.forEach((r) => {
    out += '**' + r.file + '**　' + r.kind + ' · ' + r.sizeKB + ' KB\n\n';
    out += '- 传哪一屏：' + r.at + (r.at === '进模块第一屏' ? '，直接传' : '（进模块后先点一次屏底「下一步」）') + '\n';
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

fs.writeFileSync(path.join(__dirname, '..', 'demo-docs', 'README.md'), out);
console.log('写出 demo-docs/README.md，' + rows.length + ' 份');
