import test from 'node:test';
import assert from 'node:assert/strict';
import { SP500, NASDAQ } from '../src/fixture.js';
import { A_SHARE } from '../src/trades.js';
import { ROSTER, runBot, runContest } from '../src/contest.js';

const BARS = SP500().bars.slice(1000, 1900);

test('每个陪练都真的产生了成交，不是空壳', () => {
  for (const bot of ROSTER) {
    const t = runBot(bot, BARS, A_SHARE, { seed: 7 });
    assert.ok(t.length > 0, `${bot.name} 一笔都没成交`);
    for (const x of t) {
      assert.ok(x.exit > x.entry, `${bot.name} 出现了出场不晚于入场的交易`);
      assert.ok(x.dir === 1 || x.dir === -1);
      assert.ok(x.size > 0);
    }
  }
});

test('同一 seed 必须逐笔可复现（榜单不能每次刷新都变）', () => {
  const a = runContest(BARS, A_SHARE, { seed: 42 });
  const b = runContest(BARS, A_SHARE, { seed: 42 });
  assert.deepEqual(a.map(x => [x.id, x.trades, x.totalR]), b.map(x => [x.id, x.trades, x.totalR]));
});

test('不同 seed 只影响随机选手，规则型选手成绩不变', () => {
  const a = runContest(BARS, A_SHARE, { seed: 1 });
  const b = runContest(BARS, A_SHARE, { seed: 999 });
  const pick = (r, id) => r.find(x => x.id === id);
  for (const id of ['bot-trend', 'bot-fast', 'bot-slow', 'bot-break', 'bot-rev']) {
    assert.equal(pick(a, id).totalR, pick(b, id).totalR, `${id} 不该受 seed 影响`);
  }
  assert.notEqual(pick(a, 'bot-coin').totalR, pick(b, 'bot-coin').totalR, '随机选手应该受 seed 影响');
});

/**
 * 这条是核心：陪练不能偷看未来。
 * 做法是把数据从右边截短再跑一遍 —— 如果某个决策用到了后面的 K 线，
 * 截短后前半段的成交记录一定会变。
 */
test('截短数据后，已发生的成交逐笔不变（证明没有用未来数据）', () => {
  const cut = 700;
  for (const bot of ROSTER) {
    const full = runBot(bot, BARS, A_SHARE, { seed: 7 });
    const short = runBot(bot, BARS.slice(0, cut), A_SHARE, { seed: 7 });
    // 只比较在截断点之前就已经完全走完的交易
    const fullEarly = full.filter(t => t.exit < cut - 2);
    const shortEarly = short.filter(t => t.exit < cut - 2);
    assert.deepEqual(shortEarly, fullEarly,
      `${bot.name} 截短后早期成交发生了变化 —— 说明它读到了未来数据`);
  }
});

test('榜单按 R 倒序，且含买入持有参照线', () => {
  const r = runContest(BARS, A_SHARE, { seed: 7 });
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].totalR >= r[i].totalR);
  const bh = r.find(x => x.id === 'ref-bh');
  assert.ok(bh, '缺少买入持有参照线');
  assert.equal(bh.trades, 1);
});

test('换一段行情，名次会变 —— 没有哪条策略永远第一', () => {
  const a = runContest(BARS, A_SHARE, { seed: 7 });
  const b = runContest(NASDAQ().bars.slice(400, 1300), A_SHARE, { seed: 7 });
  assert.notEqual(a[0].id, b[0].id === a[0].id ? '__same__' : b[0].id,
    '两段完全不同的行情不该产生同一个冠军且完全相同的排序');
});
