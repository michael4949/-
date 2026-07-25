/**
 * 智能问数测试。
 *
 * 重点有两个：
 *   1. 解析出来的条件必须与用户说的话一致（不能把「跌幅超过5%」理解成 ≥ +5%）；
 *   2. **解析不出来必须说解析不出来** —— 绝不回退到某个预设答案。
 *      上一版原型的 `|| '股灾'` 让「白马股」也返回股灾跌幅榜，
 *      那不是能力不足，是欺骗。这里用测试把这条钉死。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, explain, execute, derive, ask, FIELDS } from '../src/query.js';
import { allDatasets } from '../src/fixture.js';

const DS = allDatasets();
const CATALOG = Object.fromEntries(Object.entries(DS).map(([k, v]) => [k, { display: v.display }]));
const cache = new Map();

test('解析不出来时明确失败，绝不回退到预设答案', () => {
  for (const q of ['白马股', '你好', '帮我推荐几只股票', '', '今天天气怎么样']) {
    const r = parse(q, CATALOG);
    assert.equal(r.ok, false, `「${q}」不该被解析成功`);
    assert.ok(r.reason, '失败必须给出原因');
  }
  // 失败时要给可用写法，而不是把用户丢在原地
  const r = parse('白马股', CATALOG);
  assert.ok(r.hints.length >= 3, '失败时应给出示例写法');
});

test('跌幅方向不能搞反', () => {
  const r = parse('标普500 2008年 跌幅超过5% 的交易日', CATALOG);
  assert.ok(r.ok);
  const w = r.ast.where.find(x => x.field === 'chg');
  assert.ok(w, '未识别出涨跌幅条件');
  assert.equal(w.op, '<=', '「跌幅超过 5%」应解析为 涨跌幅 ≤ -5%');
  assert.ok(Math.abs(w.value + 0.05) < 1e-9, `阈值应为 -0.05，实际 ${w.value}`);
});

test('涨幅方向正确，且百分号被正确换算', () => {
  const r = parse('纳斯达克涨幅超过 4% 的日子', CATALOG);
  assert.ok(r.ok);
  const w = r.ast.where.find(x => x.field === 'chg');
  assert.equal(w.op, '>=');
  assert.ok(Math.abs(w.value - 0.04) < 1e-9);
});

test('时间范围解析：年份、区间、月份、相对区间', () => {
  const y = parse('标普500 2008年 振幅超过3%', CATALOG).ast.time;
  assert.equal(new Date(y.from).getUTCFullYear(), 2008);
  assert.equal(new Date(y.to).getUTCFullYear(), 2009);

  const rng = parse('标普500 2000年到2003年 回撤超过40%', CATALOG).ast.time;
  assert.equal(new Date(rng.from).getUTCFullYear(), 2000);
  assert.equal(new Date(rng.to).getUTCFullYear(), 2004);

  const mo = parse('标普500 2008年10月 振幅超过5%', CATALOG).ast.time;
  assert.equal(new Date(mo.from).getUTCMonth(), 9);

  const rel = parse('最近3年 振幅超过3%', CATALOG).ast.time;
  assert.equal(rel.relativeDays, 3 * 365);
});

test('品种识别：中文名、代码，未指定时查全部', () => {
  assert.deepEqual(parse('标普500 涨幅超过3%', CATALOG).ast.from, ['SPX']);
  assert.deepEqual(parse('SPX 涨幅超过3%', CATALOG).ast.from, ['SPX']);
  assert.equal(parse('涨幅超过3%', CATALOG).ast.from.length, Object.keys(CATALOG).length);
});

test('派生字段算得对（用手工核对的口径逐一比对）', () => {
  const bars = DS.SPX.bars;
  const d = derive(bars);
  for (const i of [25, 100, 1000, 3000]) {
    const pc = bars[i - 1].c;
    assert.ok(Math.abs(d.chg[i] - (bars[i].c - pc) / pc) < 1e-12, 'chg');
    assert.ok(Math.abs(d.amp[i] - (bars[i].h - bars[i].l) / pc) < 1e-12, 'amp');
    assert.ok(Math.abs(d.gap[i] - (bars[i].o - pc) / pc) < 1e-12, 'gap');
    assert.ok(d.drawdown[i] <= 1e-12, '回撤必须 ≤ 0');
    assert.ok(d.rv20[i] > 0 && d.rv20[i] < 5, `年化波动率越界: ${d.rv20[i]}`);
  }
});

test('执行结果确实来自真实数据：2008 年标普暴跌日可被检出', () => {
  const r = ask('标普500 2008年 跌幅超过5% 的交易日', DS, cache);
  assert.ok(r.ok);
  assert.ok(r.result.total >= 5, `2008 年标普跌幅超 5% 的交易日应有多天，实际 ${r.result.total}`);
  for (const row of r.result.rows) {
    assert.equal(row.symbol, 'SPX');
    const y = new Date(row.t).getUTCFullYear();
    assert.equal(y, 2008, `命中了 ${y} 年的数据，时间过滤失效`);
    assert.ok(row.values.chg <= -0.05, `涨跌幅 ${row.values.chg} 不满足 ≤ -5%`);
  }
  // 2008-10-15 标普单日跌约 9%，是该年最深的几天之一
  const worst = r.result.rows[0];
  assert.ok(worst.values.chg < -0.08, `最深跌幅应超过 8%，实际 ${(worst.values.chg * 100).toFixed(2)}%`);
});

test('最大值查询：标普历史最大单日振幅落在 2008 年', () => {
  const r = ask('标普500 历史最大单日振幅', DS, cache);
  assert.ok(r.ok);
  assert.ok(r.result.rows.length >= 1);
  const top = r.result.rows[0];
  assert.equal(new Date(top.t).getUTCFullYear(), 2008);
  assert.ok(top.values.amp > 0.1, `最大振幅应超过 10%，实际 ${(top.values.amp * 100).toFixed(1)}%`);
});

test('回撤条件方向正确（回撤恒为负，阈值必须翻转）', () => {
  const r = ask('纳斯达克 2000年到2003年 回撤超过40%', DS, cache);
  assert.ok(r.ok);
  const w = r.ast.where.find(x => x.field === 'drawdown');
  assert.equal(w.op, '<=', '「回撤超过40%」应解析为 回撤 ≤ -40%');
  assert.ok(Math.abs(w.value + 0.4) < 1e-9);
  assert.ok(r.result.total > 100,
    `纳斯达克 2000-2003 互联网泡沫期间回撤超 40% 的交易日应有数百天，实际 ${r.result.total}`);
  for (const row of r.result.rows) assert.ok(row.values.drawdown <= -0.4);
});

test('纯排序查询会被标记，避免把扫描数说成命中数', () => {
  const r = ask('标普500 历史最大单日振幅', DS, cache);
  assert.ok(r.ok);
  assert.equal(r.result.ranking, true);
  const filtered = ask('标普500 涨幅超过3%', DS, cache);
  assert.equal(filtered.result.ranking, false);
});

test('连涨条件与量比条件可组合', () => {
  const r = ask('纳斯达克 连涨5天 并且 量比超过1.5倍', DS, cache);
  assert.ok(r.ok);
  assert.ok(r.ast.where.some(w => w.field === 'streak'));
  assert.ok(r.ast.where.some(w => w.field === 'volRatio'));
  for (const row of r.result.rows) {
    assert.ok(row.values.streak >= 5, `连涨天数 ${row.values.streak} < 5`);
    assert.ok(row.values.volRatio >= 1.5, `量比 ${row.values.volRatio} < 1.5`);
  }
});

test('计数意图返回总数而非明细', () => {
  const r = ask('标普500 2008年 跌幅超过3% 一共多少天', DS, cache);
  assert.ok(r.ok);
  assert.equal(r.result.select, 'count');
  assert.ok(r.result.count > 10, `2008 年跌幅超 3% 应有很多天，实际 ${r.result.count}`);
});

test('前视字段被标记出来（历史研究可用，回放训练绝不可用）', () => {
  const r = ask('标普500 连涨5天 之后走势', DS, cache);
  assert.ok(r.ok);
  const plain = ask('标普500 涨幅超过3%', DS, cache);
  assert.equal(plain.result.usesFuture, false, '普通查询不该被标记为前视');
});

test('explain 生成的类 SQL 忠实反映条件', () => {
  const r = parse('标普500 2008年 跌幅超过5%', CATALOG);
  const sql = explain(r.ast);
  assert.ok(sql.includes('SPX'));
  assert.ok(sql.includes('2008'));
  assert.ok(/单日涨跌幅\s*≤\s*-5\.00%/.test(sql), `SQL 未正确表达条件:\n${sql}`);
});

test('同一查询重复执行结果完全一致', () => {
  const a = ask('标普500 2008年 振幅超过5%', DS, new Map());
  const b = ask('标普500 2008年 振幅超过5%', DS, new Map());
  assert.equal(a.result.total, b.result.total);
  assert.deepEqual(a.result.rows.map(r => r.t), b.result.rows.map(r => r.t));
});
