/* 录屏：按 plan.json 的时间轴驱动页面，CDP screencast 抓 2 倍分辨率帧，记录光标、点击、镜头和红框事件
   2 倍分辨率下截帧只有 10 fps 左右，所以页面放慢 SLOW 倍录（计时器、时钟、requestAnimationFrame、CSS 动画一起放慢），
   帧时间和事件时间再按页面时间记，合成时就是正常速度、约 25 fps。
   用法：node record.cjs [runId…]   输出 frames/<run>/NNNNN.jpg + index.json + events.json
   试跑：DRY=1 SLOW=1 FROM=s21 TO=s27 node record.cjs banzu（只跑这几段、稀疏存帧到 frames/<run>_dry） */
const { chromium } = require('/home/user/-/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan.json'), 'utf8'));
const APP = 'file://' + path.resolve(ROOT, '..', 'banzu', 'dist', '高效班组管理助手_班组长_高保真原型.html');
const W = 1440, H = 810, DSF = 2, TAIL = 0.8, SLOW = +(process.env.SLOW || 2.5);
const only = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
const psleep = sec => sleep(sec * 1000 * SLOW);   // 按页面时间睡
function SHIM(S) {   // 页面内时间放慢 S 倍
  if (S === 1) return;
  const pn = performance.now.bind(performance), p0 = pn();
  performance.now = () => p0 + (pn() - p0) / S;
  const dn = Date.now, d0 = dn(); Date.now = () => Math.round(d0 + (dn() - d0) / S);
  const st = window.setTimeout, si = window.setInterval;
  window.setTimeout = function (f, d, ...a) { return st(f, (+d || 0) * S, ...a); };
  window.setInterval = function (f, d, ...a) { return si(f, (+d || 0) * S, ...a); };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(ts => cb(p0 + (ts - p0) / S));
}

async function recordRun(br, run) {
  const dir = path.join(ROOT, 'frames', run.id + (process.env.DRY ? '_dry' : ''));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  const pg = await ctx.newPage();
  await pg.addInitScript(SHIM, SLOW);
  const cdp = await ctx.newCDPSession(pg);
  const slowCSS = async () => { await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW }); };
  pg.on('dialog', d => d.accept());
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const banzu = run.scene === 'banzu';
  if (banzu) {
    await pg.addInitScript(() => { window.__XW_SPEED = 0.45; });
    await pg.goto(APP); await psleep(0.8);
    await pg.evaluate(() => localStorage.clear());
    await pg.goto(APP + '#team'); await slowCSS(); await psleep(0.6);
    await pg.addStyleTag({ content: '.stagebtn,.stage{display:none!important}' });
    await psleep(3.5);   // 晨间简报等初始动画走完
  }
  const index = [], events = [];
  let n = 0, t0 = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const f = String(n++).padStart(5, '0') + '.jpg';
    if (!process.env.DRY || n % 20 === 1) fs.writeFileSync(path.join(dir, f), Buffer.from(data, 'base64'));
    index.push({ f, t: +((metadata.timestamp - t0) / SLOW).toFixed(3) });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch (e) {}
  });
  const now = () => (Date.now() / 1000 - t0) / SLOW;   // 页面时间
  const log = e => { e.t = +now().toFixed(3); events.push(e); };
  t0 = Date.now() / 1000;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
  if (banzu) await pg.evaluate(() => { const m = document.querySelector('#main'); m.style.transform = 'translateZ(0)'; requestAnimationFrame(() => { m.style.transform = ''; }); });
  else { await pg.goto('file://' + path.join(ROOT, 'slides', run.scene + '.html')); await slowCSS(); }   // 幻灯片的入场动画从 t≈0 开始

  /* ---- 页面工具 ---- */
  const rectOf = sel => pg.evaluate(sel => {
    const e = typeof sel === 'string' ? document.querySelector(sel) : null; if (!e) return null;
    const r = e.getBoundingClientRect(); if (!r.width && !r.height) return null;
    return [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10);
  }, sel);
  let cur = [720, 470];
  log({ type: 'cursor', at: cur, show: banzu });
  async function moveTo(x, y, dur = 0.6) {
    log({ type: 'move', from: cur, to: [x, y], dur });
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      await pg.mouse.move(cur[0] + (x - cur[0]) * e, cur[1] + (y - cur[1]) * e);
      await sleep(dur * 1000 * SLOW / steps - 4);
    }
    cur = [x, y];
  }
  async function smoothScroll(target, y) {   // #main 滚到让 target 顶部落在视口 y 处；target 为数字时直接给 scrollTop
    return pg.evaluate(([target, y]) => new Promise(res => {
      const m = document.querySelector('#main');
      let to;
      if (typeof target === 'number') to = target;
      else { const e = document.querySelector(target); if (!e) return res('miss'); to = m.scrollTop + e.getBoundingClientRect().top - y; }
      to = Math.max(0, Math.min(to, m.scrollHeight - m.clientHeight));
      const from = m.scrollTop, d = Math.min(1100, 420 + Math.abs(to - from) * 0.6), s = performance.now();
      if (Math.abs(to - from) < 2) return res('ok');
      (function f() { const k = Math.min(1, (performance.now() - s) / d), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; m.scrollTop = from + (to - from) * e; if (k < 1) requestAnimationFrame(f); else res('ok'); })();
    }), [target, y]);
  }
  async function ensureVisible(sel) {
    const r = await rectOf(sel); if (!r) return null;
    const inMain = await pg.evaluate(sel => !!document.querySelector('#main') && document.querySelector('#main').contains(document.querySelector(sel)), sel);
    if (inMain && (r[1] < 60 || r[1] + Math.min(r[3], 60) > H - 30)) { await smoothScroll(sel, Math.max(120, H / 2 - r[3] / 2)); await psleep(0.12); return rectOf(sel); }
    return r;
  }
  async function waitFor(sel, max) {   // 小瓦特的回答流式输出时，按钮要等它写完才出现
    const t = now();
    while (now() - t < max) { if (await rectOf(sel)) { if (now() - t > 0.3) console.log(`  waited ${(now() - t).toFixed(1)}s`, sel); return true; } await sleep(150); }
    return false;
  }
  async function stableRect(sel) {   // 弹层、展开动画还在走时量出来的框不准：等两次测量一致
    let r = await rectOf(sel); if (!r) return null;
    for (let i = 0; i < 8; i++) { await psleep(0.1); const q = await rectOf(sel); if (!q) return r; if (q.every((v, k) => Math.abs(v - r[k]) < 1)) return q; r = q; }
    return r;
  }
  async function click(sel) {
    await waitFor(sel, 9);
    const r = await ensureVisible(sel);
    if (!r) { console.log('  !! click miss', sel); return false; }
    const x = r[0] + r[2] / 2, y = r[1] + Math.min(r[3] / 2, 40);
    await moveTo(x, y, 0.55);
    await psleep(0.09);
    log({ type: 'click', at: [x, y] });
    const ok = await pg.evaluate(([sel, x, y]) => { const e = document.querySelector(sel), hit = document.elementFromPoint(x, y); return !!(e && hit && (e === hit || e.contains(hit))); }, [sel, x, y]);
    if (ok) await pg.mouse.click(x, y); else { console.log('  .. dispatch', sel); await pg.evaluate(sel => document.querySelector(sel).click(), sel); }
    return true;
  }
  const boxes = {};   // 活动红框：id → {sel, until, rect}
  let boxN = 0;
  async function trackBoxes() {
    for (const [id, b] of Object.entries(boxes)) {
      if (now() > b.until) { delete boxes[id]; continue; }
      const r = await rectOf(b.sel);
      if (!r && b.rect) { log({ type: 'boxoff', id }); delete boxes[id]; continue; }
      if (r && (!b.rect || r.some((v, i) => Math.abs(v - b.rect[i]) > 1.5))) { b.rect = r; log({ type: 'boxmove', id, rect: r }); }
    }
  }
  let tracking = true;
  (async () => { while (tracking) { try { await trackBoxes(); } catch (e) {} await sleep(90); } })();

  async function step(st) {
    const [at, type, a, b] = st;
    switch (type) {
      case 'js': await pg.evaluate(a); break;
      case 'nav': await click(`#sb a[data-to="${a}"]`); break;
      case 'role': await click(`.rsw button[data-r="${a}"]`); break;
      case 'hash': {
        const [pgk, sub] = a.slice(1).split('/');
        const cur = await pg.evaluate(() => location.hash.slice(1).split('/')[0]);
        if (cur !== pgk && await rectOf(`#sb a[data-to="${pgk}"]`)) { await click(`#sb a[data-to="${pgk}"]`); await psleep(0.5); }
        if (sub) {
          const tab = `#main .tabs button[data-sub="${sub}"]`;
          if (await rectOf(tab)) await click(tab); else await pg.evaluate(h => { location.hash = h; }, a);
        } else if (cur === pgk || !(await pg.evaluate(k => location.hash.startsWith('#' + k), pgk))) await pg.evaluate(h => { location.hash = h; }, a);
        break;
      }
      case 'click': await click(a); break;
      case 'move': { const r = await ensureVisible(a); if (r) await moveTo(r[0] + r[2] / 2, r[1] + r[3] / 2, 0.6); else console.log('  !! move miss', a); break; }
      case 'scroll': { if (typeof a === 'string') await waitFor(a, 9); const res = await smoothScroll(a, b == null ? 110 : b); if (res === 'miss') console.log('  !! scroll miss', a); break; }
      case 'cam': {
        if (a == null) { log({ type: 'cam', rect: null }); break; }
        if (Array.isArray(a)) { log({ type: 'cam', rect: a, z: b || 1.4 }); break; }   // 直接给视口坐标
        await waitFor(a, 6);
        const r = await stableRect(a);
        if (!r) { console.log('  !! cam miss', a); break; }
        log({ type: 'cam', rect: r, z: b || 1.4 }); break;
      }
      case 'box': {
        if (Array.isArray(a)) { const id = 'b' + (boxN++); log({ type: 'box', id, rect: a, until: +(now() + (b || 3)).toFixed(3) }); break; }
        await waitFor(a, 6);
        const r = await stableRect(a);
        if (!r) { console.log('  !! box miss', a); break; }
        const id = 'b' + (boxN++); boxes[id] = { sel: a, until: now() + (b || 3), rect: r };
        log({ type: 'box', id, rect: r, until: +(now() + (b || 3)).toFixed(3) }); break;
      }
      default: console.log('  ?? step', type);
    }
  }

  let segs = plan.segments.filter(s => run.segs.includes(s.id)), base = run.start;
  if (process.env.FROM) { const a = segs.findIndex(s => s.id === process.env.FROM), b = segs.findIndex(s => s.id === (process.env.TO || process.env.FROM)); segs = segs.slice(a, b + 1); base = segs[0].start - 1; run = { ...run, end: segs[segs.length - 1].end - segs[0].start + 1 + run.start }; }
  const steps = segs.flatMap(s => s.steps.map(st => [st[0] - base, ...st.slice(1), s.id]));
  steps.sort((x, y) => x[0] - y[0]);
  let lastSeg = '';
  for (const st of steps) {
    const sid = st[st.length - 1];
    if (sid !== lastSeg) { lastSeg = sid; console.log(`${run.id} ${sid} @${now().toFixed(1)}s`); }
    const wait = st[0] - now();
    if (wait > 0) await psleep(wait); else if (wait < -0.3) console.log(`  late ${(-wait).toFixed(2)}s`, st[1], st[2] || '');
    try { await step(st.slice(0, -1)); } catch (e) { console.log('  !! step error', st[1], st[2], e.message.split('\n')[0]); }
  }
  const endT = run.end - run.start + TAIL;
  await psleep(endT - now());
  tracking = false;
  await cdp.send('Page.stopScreencast');
  await sleep(300);
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index));
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(events, null, 0));
  console.log(`${run.id} done: ${index.length} frames, ${events.length} events, ${(endT).toFixed(1)}s, errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await ctx.close();
}

(async () => {
  const br = await chromium.launch({ args: ['--force-device-scale-factor=' + DSF] });
  for (const run of plan.runs) if (!only.length || only.includes(run.id) || only.includes(run.scene)) await recordRun(br, run);
  await br.close();
})();
