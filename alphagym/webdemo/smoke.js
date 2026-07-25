#!/usr/bin/env node
/**
 * 浏览器冒烟测试：真的把 demo 打开、真的点一遍、真的截图。
 *
 * 一个「我跑过了」的 demo 和一个「应该能跑」的 demo，差别就在这个文件。
 * 任何 console error / pageerror 都算失败。
 *
 * 用法: node webdemo/smoke.js [--headed]
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = pathToFileURL(join(HERE, 'dist', 'alphagym-demo.html')).href;
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });

const errors = [];
let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`);
  else { console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); failures++; }
}

const run = async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 980 }, deviceScaleFactor: 2 });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  console.log('\n▌打开页面');
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  check('标题正确', (await page.title()).includes('AlphaGym'));
  check('图表已挂载', await page.locator('#chart canvas').first().isVisible());

  // ── 训练场：手动下单 ──
  console.log('\n▌训练场 · 手动下单');
  const eq0 = await page.locator('#tEquity').textContent();
  await page.fill('#oQty', '30');
  await page.click('#submitBtn');
  await page.waitForTimeout(200);
  check('挂单已记录', (await page.locator('#sPending').textContent()) !== '0');

  await page.click('#stepBtn');   // 下一根成交
  await page.waitForTimeout(300);
  const posTxt = await page.locator('#tPos').textContent();
  check('下一根开盘成交并建仓', posTxt.includes('多'), `持仓=${posTxt}`);

  for (let i = 0; i < 12; i++) { await page.click('#stepBtn'); }
  await page.waitForTimeout(300);
  const floatTxt = await page.locator('#tFloat').textContent();
  check('浮动盈亏随行情变动', floatTxt !== '—', `浮盈=${floatTxt}`);
  await page.screenshot({ path: join(SHOTS, '1-train-position.png') });

  await page.click('#flatBtn');
  await page.click('#stepBtn');
  await page.waitForTimeout(300);
  check('平仓后回到空仓', (await page.locator('#tPos').textContent()).includes('空仓'));
  check('成交记录已生成', !(await page.locator('#fills').textContent()).includes('还没有成交'));

  // ── 训练场：自动跑一轮 ──
  console.log('\n▌训练场 · 自动跑一轮（双均线）');
  await page.click('#autoBtn');
  await page.waitForTimeout(2500);
  const fillCount = await page.locator('#fillCount').textContent();
  check('机械策略产生了成交', parseInt(fillCount) > 5, fillCount);
  check('回放已推进到底', (await page.locator('#tProg').textContent()).startsWith('100'));
  await page.screenshot({ path: join(SHOTS, '2-train-auto.png') });

  // ── 评估报告 ──
  console.log('\n▌评估报告');
  await page.click('#endBtn');
  await page.waitForTimeout(4500);
  const verdict = await page.locator('.verdict p').first().textContent();
  check('生成了结论', verdict.length > 10, verdict.slice(0, 60) + '…');
  const pv = /p=([0-9.]+)/.exec(verdict);
  check('p 值在合法区间', pv && +pv[1] > 0 && +pv[1] <= 1, pv ? `p=${pv[1]}` : '未找到');
  const dimRows = await page.locator('table.dt tbody tr').count();
  check('四个维度都有输出', dimRows >= 4, `${dimRows} 行`);
  const cav = await page.locator('ol.cav li').count();
  check('局限声明随报告下发', cav >= 3, `${cav} 条`);
  await page.screenshot({ path: join(SHOTS, '3-report-top.png') });
  await page.locator('#repBody .panel').last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  await page.click('#togglePayload');
  await page.waitForTimeout(400);
  const payload = await page.locator('#payloadBox pre.json').first().textContent();
  check('LLM payload 不含任何 K 线数据',
    !payload.includes('"open"') && !payload.includes('"high"') && !payload.includes('rows'),
    `${payload.length} 字符`);
  check('payload 含校正后 p 值', payload.includes('pValueAdjusted'));
  await page.screenshot({ path: join(SHOTS, '4-report-payload.png'), fullPage: false });

  // ── 双盲 ──
  console.log('\n▌双盲测试');
  await page.click('#tabs button[data-v="blind"]');
  await page.waitForTimeout(1000);
  const mask = await page.locator('#bMask').textContent();
  check('品种与日期已打码', mask.includes('██'), mask);
  await page.screenshot({ path: join(SHOTS, '5-blind-question.png') });

  // 揭晓文案只在自动切题（1400ms）之前可读，所以要在 600ms 时抓。
  //
  // 这里断言的不是「有对有错」（8 题全对完全可能，靠碰运气的断言本身就不可靠），
  // 而是**逐题验证判定与真实涨跌幅严格一致** —— 这才是「结果由数据算出而非随机数」
  // 的直接证据。上一版原型这里是 Math.random()>0.45，用这个断言一测就露馅。
  let sawDate = false, lastReveal = '';
  const outcomes = [];
  let consistent = 0, checked = 0;
  for (let i = 0; i < 8; i++) {
    const ansDir = i % 3 === 2 ? -1 : 1;
    await page.click(`.ans button[data-a="${ansDir}"]`);
    await page.waitForTimeout(600);
    lastReveal = (await page.locator('#bReveal').textContent()).replace(/\s+/g, ' ');
    if (/\d{4}-\d{2}-\d{2}/.test(lastReveal)) sawDate = true;

    const m = /实际\s*([+-][\d.]+)%/.exec(lastReveal);
    const ok = /正确\s*✓/.test(lastReveal);
    const bad = /错误\s*✗/.test(lastReveal);
    if (m && (ok || bad)) {
      checked++;
      const actual = parseFloat(m[1]);
      const expectOk = Math.sign(actual) === ansDir;
      if (expectOk === ok) consistent++;
      outcomes.push(ok ? '✓' : '✗');
    }
    if (i === 0) await page.screenshot({ path: join(SHOTS, '6-blind-revealed.png') });
    await page.waitForTimeout(1000);
  }
  check('揭晓了真实品种与日期', sawDate, lastReveal.slice(0, 70) + '…');
  check('每一题的判定都与真实涨跌幅严格一致（非随机数）',
    checked >= 6 && consistent === checked, `${consistent}/${checked} 一致 · ${outcomes.join('')}`);
  const rate = await page.locator('#bRate').textContent();
  check('命中率已统计', rate !== '—', rate);
  await page.click('#bEval');
  await page.waitForTimeout(4500);
  check('双盲答题也能进评估引擎', await page.locator('.verdict').isVisible());
  await page.screenshot({ path: join(SHOTS, '7-blind-report.png') });

  // ── 关于页 + 深色 ──
  console.log('\n▌关于页与主题');
  await page.click('#tabs button[data-v="about"]');
  await page.waitForTimeout(500);
  check('关于页渲染了校准表', (await page.locator('#aboutCal tr').count()) === 5);
  await page.click('#themeBtn');
  await page.waitForTimeout(400);
  check('深色主题生效', (await page.locator('html').getAttribute('data-theme')) === 'dark');
  await page.screenshot({ path: join(SHOTS, '8-about-dark.png'), fullPage: true });

  await page.click('#tabs button[data-v="train"]');
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(SHOTS, '9-train-dark.png') });

  await browser.close();

  console.log('\n' + '─'.repeat(60));
  if (errors.length) {
    console.log(`❌ 捕获 ${errors.length} 条页面错误：`);
    [...new Set(errors)].slice(0, 12).forEach(e => console.log('   ' + e.slice(0, 200)));
    failures += errors.length;
  } else {
    console.log('✅ 无 console error / pageerror');
  }
  console.log(failures === 0 ? '✅ 冒烟测试全部通过' : `❌ ${failures} 项失败`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch(e => { console.error('测试崩溃:', e); process.exit(1); });
