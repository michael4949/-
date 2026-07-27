import test from 'node:test';
import assert from 'node:assert/strict';
import { SP500 } from '../src/fixture.js';
import { compile, evaluate, evaluateScript, FormulaError, FORMULA_PRESETS } from '../src/formula.js';

const BARS = SP500().bars.slice(0, 400);

const closeArr = BARS.map(b => b.c);
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));

test('基础算术与变量', () => {
  const r = evaluate('CLOSE - OPEN', BARS);
  assert.equal(r.length, BARS.length);
  for (let i = 0; i < BARS.length; i++) assert.ok(approx(r[i], BARS[i].c - BARS[i].o));
});

test('运算符优先级与结合性', () => {
  assert.ok(approx(evaluate('2+3*4', BARS)[0], 14));
  assert.ok(approx(evaluate('(2+3)*4', BARS)[0], 20));
  assert.ok(approx(evaluate('2^3^2', BARS)[0], 512));   // 右结合
  assert.ok(approx(evaluate('10-3-2', BARS)[0], 5));    // 左结合
  assert.ok(approx(evaluate('-3+5', BARS)[0], 2));
});

test('MA 与手算一致', () => {
  const r = evaluate('MA(CLOSE,20)', BARS);
  for (let i = 0; i < 19; i++) assert.ok(Number.isNaN(r[i]), `第 ${i} 根窗口不足，应为 NaN`);
  for (let i = 19; i < BARS.length; i++) {
    let s = 0;
    for (let k = i - 19; k <= i; k++) s += closeArr[k];
    assert.ok(approx(r[i], s / 20), `MA 在第 ${i} 根对不上`);
  }
});

test('窗口不足时是 NaN，不是 0', () => {
  // 用 0 填充会让均线从 0 起步，画出一条根本不存在的上升趋势
  const r = evaluate('MA(CLOSE,60)', BARS);
  assert.ok(Number.isNaN(r[0]));
  assert.ok(Number.isNaN(r[58]));
  assert.ok(Number.isFinite(r[59]));
});

test('REF / HHV / LLV / SUM / STD', () => {
  const ref = evaluate('REF(CLOSE,3)', BARS);
  for (let i = 3; i < BARS.length; i++) assert.ok(approx(ref[i], closeArr[i - 3]));
  assert.ok(Number.isNaN(ref[2]));

  const hhv = evaluate('HHV(HIGH,10)', BARS);
  for (let i = 9; i < BARS.length; i++) {
    let m = -Infinity;
    for (let k = i - 9; k <= i; k++) m = Math.max(m, BARS[k].h);
    assert.ok(approx(hhv[i], m));
  }

  const sum = evaluate('SUM(VOL,5)', BARS);
  for (let i = 4; i < BARS.length; i++) {
    let s = 0;
    for (let k = i - 4; k <= i; k++) s += BARS[k].v;
    assert.ok(approx(sum[i], s));
  }

  const std = evaluate('STD(CLOSE,20)', BARS);
  const i = 100;
  let s = 0;
  for (let k = i - 19; k <= i; k++) s += closeArr[k];
  const m = s / 20;
  let q = 0;
  for (let k = i - 19; k <= i; k++) q += (closeArr[k] - m) ** 2;
  assert.ok(approx(std[i], Math.sqrt(q / 19)));
});

test('CROSS 只在穿越那一根为 1', () => {
  const r = evaluate('CROSS(MA(CLOSE,5),MA(CLOSE,20))', BARS);
  const fast = evaluate('MA(CLOSE,5)', BARS);
  const slow = evaluate('MA(CLOSE,20)', BARS);
  let crosses = 0;
  for (let i = 1; i < BARS.length; i++) {
    if (!Number.isFinite(fast[i]) || !Number.isFinite(slow[i])
      || !Number.isFinite(fast[i - 1]) || !Number.isFinite(slow[i - 1])) continue;
    const want = (fast[i - 1] <= slow[i - 1] && fast[i] > slow[i]) ? 1 : 0;
    assert.equal(r[i], want, `CROSS 在第 ${i} 根判错`);
    crosses += want;
  }
  assert.ok(crosses > 0, '这段行情里应该出现过金叉');
});

test('IF / 比较 / 逻辑运算', () => {
  const r = evaluate('IF(CLOSE>OPEN,1,-1)', BARS);
  for (let i = 0; i < BARS.length; i++) {
    assert.equal(r[i], BARS[i].c > BARS[i].o ? 1 : -1);
  }
  const both = evaluate('(CLOSE>OPEN) AND (VOL>0)', BARS);
  for (let i = 0; i < BARS.length; i++) {
    assert.equal(both[i], (BARS[i].c > BARS[i].o && BARS[i].v > 0) ? 1 : 0);
  }
  assert.equal(evaluate('NOT(1)', BARS)[0], 0);
  assert.equal(evaluate('NOT(0)', BARS)[0], 1);
});

test('COUNT / EVERY / EXIST / BARSLAST', () => {
  const cnt = evaluate('COUNT(CLOSE>OPEN,10)', BARS);
  for (let i = 9; i < 60; i++) {
    let c = 0;
    for (let k = i - 9; k <= i; k++) if (BARS[k].c > BARS[k].o) c++;
    assert.equal(cnt[i], c);
  }
  const every = evaluate('EVERY(VOL>0,5)', BARS);
  const exist = evaluate('EXIST(CLOSE>OPEN,5)', BARS);
  for (let i = 4; i < 60; i++) {
    assert.ok(every[i] === 0 || every[i] === 1);
    assert.ok(exist[i] === 0 || exist[i] === 1);
  }
  const bl = evaluate('BARSLAST(CLOSE>OPEN)', BARS);
  for (let i = 1; i < 60; i++) {
    if (BARS[i].c > BARS[i].o) assert.equal(bl[i], 0);
  }
});

test('除以零给 NaN，而不是 Infinity', () => {
  const r = evaluate('CLOSE/(CLOSE-CLOSE)', BARS);
  assert.ok(r.every(Number.isNaN));
});

/**
 * 整个引擎最重要的一条约束。
 * 把数据从右边截短再算一遍，前半段每一个值都必须逐位相同 ——
 * 只要有任何一个函数偷看了未来，这条立刻失败。
 */
test('不许穿越：截短数据后，前面的值逐位不变', () => {
  const exprs = [
    'MA(CLOSE,20)', 'EMA(CLOSE,12)', 'SMA(CLOSE,14,1)', 'SUM(VOL,5)',
    'REF(CLOSE,3)', 'HHV(HIGH,20)', 'LLV(LOW,20)', 'STD(CLOSE,20)',
    'CROSS(MA(CLOSE,5),MA(CLOSE,20))', 'COUNT(CLOSE>OPEN,10)',
    'BARSLAST(CLOSE=HHV(CLOSE,60))', 'MA(CLOSE,5)-MA(CLOSE,20)',
    '(CLOSE-MA(CLOSE,20))/STD(CLOSE,20)',
  ];
  const cut = 250;
  const shortBars = BARS.slice(0, cut);
  for (const e of exprs) {
    const full = evaluate(e, BARS);
    const part = evaluate(e, shortBars);
    for (let i = 0; i < cut; i++) {
      const a = full[i], b = part[i];
      if (Number.isNaN(a) && Number.isNaN(b)) continue;
      assert.ok(approx(a, b, 1e-12),
        `${e} 在第 ${i} 根上，截短前后不一致（${a} vs ${b}）—— 说明它读到了未来数据`);
    }
  }
});

test('多行脚本：后面的行可以引用前面的名字', () => {
  const { names, env } = evaluateScript(
    'DIF: EMA(CLOSE,12)-EMA(CLOSE,26)\nDEA: EMA(DIF,9)\nMACD: (DIF-DEA)*2', BARS);
  assert.deepEqual(names, ['DIF', 'DEA', 'MACD']);
  const dif = env.DIF, dea = env.DEA, macd = env.MACD;
  for (let i = 30; i < BARS.length; i++) {
    assert.ok(approx(macd[i], (dif[i] - dea[i]) * 2), `MACD 在第 ${i} 根对不上`);
  }
});

test('每个内置示例都能跑通并产出有限值', () => {
  for (const p of FORMULA_PRESETS) {
    const { series } = evaluateScript(p.src, BARS);
    const last = series[series.length - 1];
    const finite = [...last].filter(Number.isFinite).length;
    assert.ok(finite > BARS.length * 0.5, `示例「${p.name}」有效值太少（${finite}）`);
  }
});

/* ── 安全性：这是自己写解析器而不是用 eval 的全部理由 ── */
test('拒绝执行任意 JavaScript', () => {
  const attacks = [
    'fetch("http://x")',
    'window.location',
    'constructor.constructor("return 1")()',
    'CLOSE.constructor',
    'process.exit(1)',
    'eval("1")',
    '[].map(x=>x)',
  ];
  for (const a of attacks) {
    assert.throws(() => evaluate(a, BARS), FormulaError, `“${a}” 本该被拒绝`);
  }
});

test('语法错误给出可读信息而不是崩溃', () => {
  const bad = [
    ['MA(CLOSE', '这里缺一个'],
    ['MA(CLOSE,20))', '多余'],
    ['FOO(CLOSE)', '不认识的函数'],
    ['ABCXYZ', '不认识的变量'],
    ['MA(CLOSE)', '需要'],
    ['', '空的'],
    ['CLOSE +', '表达式不完整'],
    ['CLOSE @ 3', '无法识别的字符'],
  ];
  for (const [src, frag] of bad) {
    try {
      evaluate(src, BARS);
      assert.fail(`“${src}” 本该报错`);
    } catch (e) {
      assert.ok(e instanceof FormulaError, `“${src}” 抛的不是 FormulaError：${e}`);
      assert.ok(e.message.includes(frag), `“${src}” 的错误信息是「${e.message}」，期望包含「${frag}」`);
    }
  }
});

test('compile 只解析不求值，可用于输入时实时校验', () => {
  assert.ok(compile('MA(CLOSE,20)'));
  assert.throws(() => compile('MA(CLOSE,'), FormulaError);
});

test('注释不影响求值', () => {
  const a = evaluate('MA(CLOSE,20) {二十日均线}', BARS);
  const b = evaluate('MA(CLOSE,20)', BARS);
  for (let i = 0; i < BARS.length; i++) {
    if (Number.isNaN(a[i]) && Number.isNaN(b[i])) continue;
    assert.ok(approx(a[i], b[i]));
  }
});
