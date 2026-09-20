/*
 * 通用包的真实浏览器验证
 * ------------------------------------------------------------
 * tests/conformance.js 用 new Function 模拟浏览器环境；这一步用真的 Chromium 把 dist/<id>.umd.js
 * 以 <script> 加载进 file:// 页面，跑同一批输入，与 Node 端结果逐字节比对。
 *
 *   NODE_PATH=$(npm root -g) node tools/verify-browser.js
 *   NODE_PATH=$(npm root -g) node tools/verify-browser.js ai-erp
 *
 * 退出码：0 全一致 · 1 有差异。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist-universal');
const only = process.argv[2];
const registry = JSON.parse(fs.readFileSync(path.join(DIST, 'skills.json'), 'utf8'));

function resolveEx(skill, v) {
  if (Array.isArray(v)) return v.map((x) => resolveEx(skill, x));
  if (v && typeof v === 'object') {
    if (v.$action) {
      const env = skill.invoke(v.$action, resolveEx(skill, v.input || {}));
      if (!env.ok) throw new Error('前置动作失败 ' + v.$action);
      return env.data;
    }
    const ks = Object.keys(v);
    if (ks.length === 1 && v.$file) return JSON.parse(fs.readFileSync(path.join(DIST, skill.manifest.id, v.$file), 'utf8'));
    const o = {}; ks.forEach((k) => { o[k] = resolveEx(skill, v[k]); }); return o;
  }
  return v;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  let fail = 0, total = 0;

  for (const s of registry.skills) {
    if (only && only !== s.id) continue;
    const dir = path.join(DIST, s.id);
    const skill = require(path.join(dir, 'index.js'));
    const cases = skill.manifest.actions.map((a) => ({ action: a.name, input: resolveEx(skill, a.example || {}) }));
    cases.unshift({ action: 'health', input: {} });

    const html = path.join(os.tmpdir(), 'dus-' + s.id + '.html');
    fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><title>' + s.id + '</title><script src="'
      + path.join(dir, 'dist', s.id + '.umd.js') + '"></script>');
    await page.goto('file://' + html);

    const loaded = await page.evaluate((id) => !!(window.DGG && window.DGG.skills && window.DGG.skills[id]), s.id);
    if (!loaded) { console.error('✘ ' + s.id + ' 浏览器里没挂上 DGG.skills'); fail++; total++; continue; }

    let bad = 0;
    for (const c of cases) {
      total++;
      const expected = JSON.stringify(skill.invoke(c.action, JSON.parse(JSON.stringify(c.input))));
      const actual = await page.evaluate(([id, action, input]) => JSON.stringify(window.DGG.skills[id].invoke(action, input)), [s.id, c.action, c.input]);
      if (expected !== actual) { bad++; fail++; console.error('  ✘ ' + s.id + ' · ' + c.action + ' 与 Node 不一致（浏览器 ' + actual.length + ' 字节 / Node ' + expected.length + ' 字节）'); }
    }
    console.log((bad ? '✘ ' : '✔ ') + s.id.padEnd(16) + (cases.length - bad) + '/' + cases.length + ' 个动作与 Node 端逐字节一致');
    fs.unlinkSync(html);
  }

  if (errs.length) console.error('页面报错：' + errs.slice(0, 5).join(' | '));
  await browser.close();
  console.log('\n' + (fail || errs.length ? '✘ ' : '✔ ') + (total - fail) + '/' + total + ' 项在真实浏览器里与 Node 一致');
  process.exit(fail || errs.length ? 1 : 0);
})();
