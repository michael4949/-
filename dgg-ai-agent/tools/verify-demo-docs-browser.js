/* 演示文档的端到端验收：真在浏览器里把 demo-docs/ 逐份传进对话坞，读 AI 真正答了什么。
   跑法：cd 到仓库根，NODE_PATH=<playwright 所在目录> node tools/verify-demo-docs-browser.js
   （tools/verify-demo-docs.js 只走 Node 侧的解析 + 内核，这份连页面一起验。）

   浏览器侧真实上传验证：每份文档从展板点进模块，塞进对话坞的文件输入框，读 AI 真正答了什么。
   两个坑，都踩过：
   1) Playwright 的 setInputFiles 对带中文的路径会静默不生效（change 事件根本不触发），
      所以这里在页内用 DataTransfer 造一个同名 File 再派发 change —— 文件名要保持中文，
      因为内核的回答里会引用文件名。
   2) 回答不是最后一条 AI 气泡：takeFile() 先 record('me', 文件名) 再 record('ai', 回答)，
      而回答带的 goto 会换屏、换屏后新屏的开场白会排在最后。
      所以要找「含文件名的 me 气泡」之后的第一条 ai。消息容器是 .ms，不是 .msgs。 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'demo-docs');
/* 有的文档要先把屏推到位才认得出：m11 的两份要等「生成应用」出了规格，
   对象库才有字段可比对。值 = 上传前先点几次屏底「下一步」。 */
const AT = {
  'm11-备件申领台账-苏州华创精密.xlsx': 1,
  'm11-需求说明书-备件申领.docx': 1
};
const MISS = ['没有识别到','没有抽到','没抽到','读不出','格式不支持','没有可读','没法回填','里面没有',
              '进不了','认不出','没有对应','暂不支持','没读到','这边不动数','规格不动数','正文没有',
              '对不上','这张表里没有','没有可对应','没有入池','没有生产订单'];

function feed(a) {                                   /* 页内：造 File → 塞进输入框 → 派发 change */
  var bin = atob(a.b64), u = new Uint8Array(bin.length), i;
  for (i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  var input = document.querySelector('input.hidden-file');
  if (!input) return 'no-input';
  var dt = new DataTransfer();
  dt.items.add(new File([u], a.name));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return 'sent';
}
function pick(fname) {                               /* 页内：取「文件名 me 气泡」之后的第一条 ai */
  var rows = document.querySelectorAll('.pd-chat .ms .m'), i, j, hitAt = -1;
  for (i = rows.length - 1; i >= 0; i--)
    if (rows[i].classList.contains('me') && (rows[i].innerText || '').indexOf(fname) >= 0) { hitAt = i; break; }
  if (hitAt < 0) return { found: false, text: '', dots: false, svg: 0 };
  for (j = hitAt + 1; j < rows.length; j++) {
    if (!rows[j].classList.contains('ai')) continue;
    return { found: true, text: rows[j].innerText || '', dots: !!rows[j].querySelector('.dots'),
             svg: rows[j].querySelectorAll('svg').length };
  }
  return { found: true, text: '', dots: false, svg: 0 };
}

(async () => {
  const b = await chromium.launch();
  const errs = [], rows = [];
  const files = fs.readdirSync(DIR).filter((f) => /\.(xlsx|docx|eml|pdf|pptx|csv|txt|json)$/i.test(f)).sort();   /* 放过 README.md */
  let ok = 0, bad = 0;
  for (const f of files.sort((a, c) => (+((a.match(/^m(\d+)/)||[])[1]) - +((c.match(/^m(\d+)/)||[])[1])) || a.localeCompare(c))) {
    const id = (f.match(/^(m\d+)-/) || [])[1];
    if (!id) { console.log('✘ ' + f + ' 文件名要以 m4- … m11- 开头'); bad++; continue; }
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    p.on('pageerror', (e) => errs.push(f + ' PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(f + ' console: ' + m.text()); });
    await p.goto('file://' + path.join(__dirname, '..', 'prototype/dist/index.html') + '?station=3');
    await p.waitForSelector('.boardbox .bg');
    await p.click('.card[data-id="' + id + '"]');
    await p.waitForSelector('.pd-chat');
    await p.waitForTimeout(1500);                                  /* 让本屏开场白先说完 */
    for (let k = 0; k < (AT[f] || 0); k++) {                       /* 推到该传的那一屏 */
      const btns = await p.$$('.pd-body button');
      if (btns.length) await btns[btns.length - 1].click();
      await p.waitForTimeout(1600);
    }
    const at = await p.evaluate(() => {
      const t = document.querySelector('.pd-tabs .on, .tabs .on');
      return t ? (t.innerText || '').split('\n')[1] || (t.innerText || '').trim() : '';
    });
    const sent = await p.evaluate(feed, { name: f, b64: fs.readFileSync(path.join(DIR, f)).toString('base64') });
    let got = { found: false, text: '', dots: true, svg: 0 }, prev = null;
    for (let i = 0; i < 40; i++) {
      await p.waitForTimeout(400);
      got = await p.evaluate(pick, f);
      if (got.found && got.text && !got.dots && got.text === prev) break;
      prev = got.text;
    }
    const txt = (got.text || '').replace(/\n/g, ' ⏎ ').trim();
    const good = sent === 'sent' && got.found && txt.length > 24 && !MISS.some((w) => txt.indexOf(w) >= 0);
    rows.push({ id, f, good, svg: got.svg, txt });
    console.log((good ? '✔' : '✘') + ' ' + f + '　屏：' + at + (got.svg ? '　[含图 ' + got.svg + ' 个]' : ''));
    console.log('    ' + (txt || '（没答）').slice(0, 170));
    good ? ok++ : bad++;
    await p.close();
  }
  console.log('\n──── 浏览器实传：' + ok + ' / ' + (ok + bad) + ' 份识别并给出结果 ────');
  console.log('页面错误：', errs.length ? errs.slice(0, 5) : '无');
  const g = {}; rows.forEach((r) => { (g[r.id] = g[r.id] || []).push(r.txt); });
  Object.keys(g).forEach((k) => {
    if (g[k].length > 1 && new Set(g[k]).size !== g[k].length) console.log('⚠ ' + k + ' 同模块两份回答雷同，可能仍读到开场白');
  });
  await b.close();
  process.exit(bad ? 1 : 0);
})();
