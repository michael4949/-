#!/usr/bin/env node
/**
 * 浏览器冒烟测试：真的把 demo 打开、真的点一遍、真的截图。
 * 任何 console error / pageerror 都算失败。
 *
 * 用法: node webdemo/smoke.js
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = pathToFileURL(join(HERE, 'dist', 'alphagym-demo.html')).href;
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });

const errors = [];
let fails = 0, passes = 0;
function check(name, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`); passes++; }
  else { console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); fails++; }
}
const shot = (p, n, opt = {}) => p.screenshot({ path: join(SHOTS, n + '.png'), ...opt });

const run = async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 980 }, deviceScaleFactor: 2 });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  /* ── 营销站 ── */
  console.log('\n▌营销站（对照 tradingexer.com 复刻）');
  check('首页标题正确', (await page.title()).includes('AlphaGym'));
  check('首页图表用真实数据渲染', await page.locator('#heroChart canvas').first().isVisible());
  check('四大核心能力卡片齐全', (await page.locator('#site .g4 .card').count()) === 4);
  // KLineCharts 每张图用多层 canvas，所以按容器数而非 canvas 数来断言
  const featCharts = await page.evaluate(() =>
    [...document.querySelectorAll('#site [id^=featChart]')]
      .filter(e => e.querySelector('canvas') && e.offsetWidth > 0).length);
  check('三个独创功能都渲染了图表', featCharts === 3, `${featCharts} 张`);
  check('AI 能力区块齐全', (await page.locator('#site .aicard').count()) === 6);
  check('页脚含风险提示', (await page.locator('.foot .legal').textContent()).includes('不提供投资建议'));
  await shot(page, '01-home');

  for (const [hash, sel, label] of [
    ['features', '#site .card', '功能全景'],
    ['data', '#site table.dt tbody tr', '数据说明'],
    ['pricing', '#site .price', '版本与价格'],
    ['mobile', '#site .card', '手机版'],
    ['contest', '#site .card', '选拔赛'],
    ['faq', '#site .faq details', '常见问题'],
  ]) {
    await page.goto(FILE + '#' + hash);
    await page.waitForTimeout(500);
    check(`${label}页有内容`, (await page.locator(sel).count()) > 0,
      `${await page.locator(sel).count()} 项`);
  }
  await page.goto(FILE + '#pricing'); await page.waitForTimeout(400);
  await shot(page, '02-pricing');
  await page.goto(FILE + '#data'); await page.waitForTimeout(400);
  const dataRows = await page.locator('#site table.dt tbody tr').count();
  check('数据说明列出全部品种', dataRows === 4, `${dataRows} 个品种`);
  await shot(page, '03-data');

  /* ── 行情回放 ── */
  console.log('\n▌行情回放 · 模拟交易');
  await page.goto(FILE + '#app/replay');
  await page.waitForTimeout(1200);
  check('K 线图已挂载', await page.locator('#chart canvas').first().isVisible());
  await page.fill('#oQty', '30');
  await page.click('#submitBtn');
  await page.waitForTimeout(200);
  check('挂单已记录', (await page.locator('#sPend').textContent()) !== '0');
  await page.click('#stepBtn');
  await page.waitForTimeout(300);
  check('下一根开盘成交并建仓', (await page.locator('#tPos').textContent()).includes('多'),
    await page.locator('#tPos').textContent());
  for (let i = 0; i < 10; i++) await page.click('#stepBtn');
  await page.waitForTimeout(250);
  check('浮动盈亏随行情变动', (await page.locator('#tFlt').textContent()) !== '—',
    await page.locator('#tFlt').textContent());
  await shot(page, '04-replay');

  await page.click('#flatBtn'); await page.click('#stepBtn');
  await page.waitForTimeout(300);
  check('平仓后回到空仓', (await page.locator('#tPos').textContent()).includes('空仓'));

  await page.click('#autoBtn');
  await page.waitForTimeout(3000);
  const fillCount = await page.locator('#fillCount').textContent();
  check('机械策略产生足够样本', parseInt(fillCount) >= 20, fillCount);
  check('回放推进到底', (await page.locator('#tPrg').textContent()).startsWith('100'));

  /* ── 交易分析 ── */
  console.log('\n▌交易分析');
  await page.click('#endBtn');
  await page.waitForTimeout(900);
  check('结束本轮后进入交易分析', page.url().includes('app/analysis'));
  check('权益曲线已渲染', await page.locator('#v-analysis svg polyline').first().isVisible());
  const bd = await page.locator('#v-analysis .brow').count();
  check('多空/时段/持仓时长归因都有输出', bd >= 5, `${bd} 行`);
  check('账户评级已给出', (await page.locator('#v-analysis .tile').nth(3).textContent()).includes('账户评级'));
  await shot(page, '05-analysis');

  /* ── 能力评估 ── */
  console.log('\n▌能力评估');
  await page.click('.rail a[data-v="eval"]');
  await page.waitForTimeout(5000);
  const verdict = await page.locator('.verdict p').first().textContent();
  check('生成了结论', verdict.length > 10, verdict.slice(0, 52) + '…');
  const pv = /p=([0-9.]+)/.exec(verdict);
  check('p 值在合法区间', pv && +pv[1] > 0 && +pv[1] <= 1, pv ? `p=${pv[1]}` : '未找到');
  check('四个维度都有输出', (await page.locator('#evalBody table.dt tbody tr').count()) >= 4);
  check('局限声明随报告下发', (await page.locator('#evalBody ol.cav li').count()) >= 3);
  check('参照标尺含后见之明上界',
    (await page.locator('#evalBody .bench').first().textContent()).includes('后见之明'));
  await shot(page, '06-eval');

  /* ── 双盲 ── */
  console.log('\n▌双盲测试');
  await page.click('.rail a[data-v="blind"]');
  await page.waitForTimeout(1200);
  check('品种与日期已打码', (await page.locator('#bMask').textContent()).includes('██'));
  let sawDate = false, consistent = 0, checked = 0;
  const outcomes = [];
  for (let i = 0; i < 8; i++) {
    await page.click(`.ans button[data-a="${i % 3 === 2 ? -1 : 1}"]`);
    await page.waitForTimeout(650);
    const rv = (await page.locator('#bReveal').textContent()).replace(/\s+/g, ' ');
    if (/\d{4}-\d{2}-\d{2}/.test(rv)) sawDate = true;
    const m = /实际\s*([+-][\d.]+)%/.exec(rv);
    const ok = /正确\s*✓/.test(rv), bad = /错误\s*✗/.test(rv);
    if (m && (ok || bad)) {
      checked++;
      if ((Math.sign(parseFloat(m[1])) === (i % 3 === 2 ? -1 : 1)) === ok) consistent++;
      outcomes.push(ok ? '✓' : '✗');
    }
    if (i === 0) await shot(page, '07-blind');
    await page.waitForTimeout(1000);
  }
  check('揭晓真实品种与日期', sawDate);
  check('每题判定与真实涨跌幅严格一致（非随机数）',
    checked >= 6 && consistent === checked, `${consistent}/${checked} · ${outcomes.join('')}`);

  /* ── 相似行情 ── */
  console.log('\n▌相似行情');
  await page.click('.rail a[data-v="similar"]');
  await page.waitForTimeout(1200);
  check('查询形态已渲染', await page.locator('#simChart canvas').first().isVisible());
  await page.click('#simGo');
  await page.waitForTimeout(4000);
  const simCards = await page.locator('.simcard').count();
  check('返回了相似片段', simCards >= 8, `${simCards} 个`);
  const simText = await page.locator('#simOut').textContent();
  check('输出的是条件分布而非方向结论',
    simText.includes('上涨占比') && simText.includes('5% 分位') && !/建议(买|卖)|后市看/.test(simText));
  const crossSym = await page.evaluate(() =>
    new Set([...document.querySelectorAll('.simcard')].map(e => e.dataset.sym)).size);
  check('检索跨品种（说明匹配的是形态不是价位）', crossSym >= 2, `${crossSym} 个品种`);
  await shot(page, '08-similar');

  /* ── 智能助手 ── */
  console.log('\n▌智能助手');
  await page.click('.rail a[data-v="assistant"]');
  await page.waitForTimeout(700);
  check('欢迎语与建议问题已渲染', (await page.locator('#chatBody .sug').count()) >= 4);
  check('语音按钮存在', await page.locator('#micBtn').isVisible());
  check('文件按钮存在', await page.locator('#fileBtn').isVisible());

  await page.fill('#chatText', '标普500 2008年 跌幅超过5% 的交易日');
  await page.click('#sendBtn');
  await page.waitForTimeout(1200);
  let last = await page.locator('#chatBody .msg.ai .bubble').last().textContent();
  check('智能问数返回了查询结构', last.includes('SELECT') && last.includes('SPX'));
  const rows = await page.locator('#chatBody .msg.ai').last().locator('table.dt tbody tr').count();
  check('返回真实数据行', rows > 0, `${rows} 行`);
  check('结果日期落在 2008 年',
    (await page.locator('#chatBody .msg.ai').last().locator('table.dt tbody tr td').first().textContent()).startsWith('2008'));
  await shot(page, '09-assistant');

  await page.fill('#chatText', '帮我推荐几只能涨的股票');
  await page.click('#sendBtn');
  await page.waitForTimeout(900);
  last = await page.locator('#chatBody .msg.ai .bubble').last().textContent();
  check('无法解析时诚实拒答，不硬凑结果',
    last.includes('没能翻译') && !last.includes('SELECT'), last.slice(0, 44) + '…');

  await page.fill('#chatText', '解读一下我的能力评估');
  await page.click('#sendBtn');
  await page.waitForTimeout(4500);
  last = await page.locator('#chatBody .msg.ai .bubble').last().textContent();
  check('助手能解读评估报告', /运气|分位|样本/.test(last), last.slice(0, 44) + '…');

  // CSV 上传 → 交易记录 → 评估
  const csv = ['entry,exit,dir,size',
    ...Array.from({ length: 26 }, (_, i) => `${300 + i * 40},${300 + i * 40 + 18},${i % 3 ? 1 : -1},${1 + (i % 3)}`)].join('\n');
  const csvPath = join(SHOTS, 'trades.csv');
  writeFileSync(csvPath, csv);
  await page.setInputFiles('#fileInput', csvPath);
  await page.waitForTimeout(700);
  check('CSV 已识别为附件', (await page.locator('#atts .att').count()) === 1);
  await page.click('#sendBtn');
  await page.waitForTimeout(6000);
  const chatAll = await page.locator('#chatBody').textContent();
  check('CSV 交易记录被解析并进入评估引擎',
    /解析出\s*26\s*笔交易/.test(chatAll.replace(/\s+/g, ' ')) || chatAll.includes('解析出'),
    /解析出[^，。]*/.exec(chatAll.replace(/\s+/g, ' '))?.[0] || '未匹配');
  await shot(page, '10-assistant-csv');

  /* ── 主题 ── */
  console.log('\n▌主题与响应式');
  await page.click('#themeBtn');
  await page.waitForTimeout(500);
  check('深色主题生效', (await page.locator('html').getAttribute('data-theme')) === 'dark');
  await page.goto(FILE + '#home');
  await page.waitForTimeout(900);
  await shot(page, '11-home-dark', { fullPage: false });
  await page.goto(FILE + '#app/replay');
  await page.waitForTimeout(1200);
  await shot(page, '12-replay-dark');

  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto(FILE + '#home');
  await page.waitForTimeout(900);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('移动端无横向溢出', overflow <= 2, `溢出 ${overflow}px`);
  await shot(page, '13-mobile');

  await browser.close();

  console.log('\n' + '─'.repeat(62));
  if (errors.length) {
    console.log(`❌ 捕获 ${errors.length} 条页面错误：`);
    [...new Set(errors)].slice(0, 10).forEach(e => console.log('   ' + e.slice(0, 190)));
    fails += errors.length;
  } else console.log('✅ 无 console error / pageerror');
  console.log(fails === 0 ? `✅ 冒烟测试全部通过（${passes} 项）` : `❌ ${fails} 项失败 / ${passes} 项通过`);
  process.exit(fails === 0 ? 0 : 1);
};

run().catch(e => { console.error('测试崩溃:', e); process.exit(1); });
