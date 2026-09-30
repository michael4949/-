// 工博会版冒烟：首页 / 数据接入 / 六场景 / m2 m3 / 待机(tv) / pad 逐个打开，收集报错并截图
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const out = path.join(__dirname, 'shots-ciif'); fs.mkdirSync(out, { recursive: true });
  const file = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
  const routes = ['home', 'connect', 'connect/mes', 'm2', 'm3', 'm4', 'm6', 'm10', 'm5', 'm8', 'm9', 'm7'];
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  for (const r of routes) {
    const n = errs.length;
    await p.goto(file + '#/' + r); await p.waitForTimeout(900);
    const info = await p.evaluate(() => ({ mod: document.body.getAttribute('data-module'), rail: !!document.querySelector('.rail') && getComputedStyle(document.querySelector('.rail')).display, booth: (document.querySelector('.booth') || {}).textContent, credits: document.body.innerText.includes('积分'), old: /锐合|6A-B034|AI CFO|AI人力官|AI流程提效|AI决策\b|AI ERP/.test(document.body.innerText) }));
    console.log(r.padEnd(12), JSON.stringify(info), errs.length > n ? ' ERR:' + errs.slice(n).join(' | ').slice(0, 300) : '');
    await p.screenshot({ path: path.join(out, r.replace('/', '-') + '.png') });
  }
  await p.close();
  for (const st of ['tv', 'pad']) {
    const q = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await q.goto(file + '?station=' + st); await q.waitForTimeout(1200);
    console.log('station', st, await q.evaluate(() => ({ route: location.hash, idle: !document.getElementById('idle').classList.contains('hidden'), station: document.body.getAttribute('data-station') })));
    await q.screenshot({ path: path.join(out, 'station-' + st + '.png') }); await q.close();
  }
  console.log('TOTAL ERRORS', errs.length); await b.close();
})();
