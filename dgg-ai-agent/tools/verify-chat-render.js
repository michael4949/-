/*
 * 对话出图自测（浏览器侧）
 * ------------------------------------------------------------
 * 拿内核在每一屏给的回答，走 chartspec → chatChart → renderBlock 这条真实链路，
 * 数每条回答画出来几个 svg。不点不等，排掉打字与跳屏的干扰，专测「画得出来吗」。
 * 与 tools/verify-charts.js 是一对：那个在 Node 里测内核给不给图，这个在浏览器里测画不画得出来。
 *
 *   node tools/verify-chat-render.js        （需要 prototype/dist/index.html 已构建）
 *
 * AI软件开发 的接入屏是「还没生成」的状态，单独按那个状态跑一遍。
 */
const { chromium } = require('playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '..', 'prototype', 'dist', 'index.html');
const MODS = ['m4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(500);
  const out = [];
  for (const id of MODS) {
    await p.evaluate((x) => window.DGG.shell.go(x), id);
    await p.waitForTimeout(900);
    const r = await p.evaluate((id) => {
      const N = id.slice(1), K = window.DGG['coreM' + N];
      const br = window.DGG.chat.brains[id];
      if (!K || !br || !br.ctx) return { id, err: '没有大脑' };
      const c = br.ctx();
      let data = c.data, lib = c.lib, res = c.result;
      if (id === 'm11' && K.generate && !(res && res.spec)) { data = K.generate(K.ensure(data), lib); res = K.run(data, lib); }
      const rows = [];
      /* AI软件开发 的接入屏是「还没生成」的状态，按那个状态单独问一遍 */
      const pre = (id === 'm11' && K.run) ? { data: c.data, res: K.run(K.ensure(c.data), lib) } : null;
      K.screens().forEach((sc) => {
        const pack = (a) => {
          if (!a) return { svg: -1, blocks: 0 };
          const bs = (typeof a === 'string') ? [] : (a.blocks || []);
          const nodes = window.DGG.chat.blocks(bs);
          let svg = 0; nodes.forEach((n) => { svg += n.querySelectorAll ? n.querySelectorAll('svg').length : 0; });
          return { svg, blocks: nodes.length };
        };
        const D = (pre && sc.key === 'connect') ? pre.data : data;
        const S = (pre && sc.key === 'connect') ? pre.res : res;
        rows.push({ screen: sc.key, q: '（开场白）', ...pack(K.brief(sc.key, D, lib, S)) });
        (K.suggest(sc.key, D, lib, S) || []).forEach((q) => {
          rows.push({ screen: sc.key, q, ...pack(K.ask(q, sc.key, D, lib, S)) });
        });
      });
      return { id, rows };
    }, id);
    out.push(r);
  }
  const all = out.flatMap((m) => (m.rows || []).map((r) => ({ id: m.id, ...r })));
  const briefs = all.filter((r) => r.q === '（开场白）');
  const asks = all.filter((r) => r.q !== '（开场白）');
  console.log('开场白 ' + briefs.filter((r) => r.svg > 0).length + ' / ' + briefs.length + ' 画出图');
  console.log('建议问句 ' + asks.filter((r) => r.svg > 0).length + ' / ' + asks.length + ' 画出图');
  const bad = all.filter((r) => r.svg <= 0);
  if (bad.length) { console.log('\n没画出图的：'); bad.forEach((r) => console.log('  ' + r.id + '/' + r.screen + ' 「' + r.q + '」 ' + (r.svg < 0 ? '（没接住）' : '块 ' + r.blocks + ' 个、svg 0'))); }
  console.log('\n错误 ' + (errs.length ? errs.slice(0, 6).join(' | ') : '无'));
  await b.close();
  if (errs.length) process.exitCode = 1;
})();
