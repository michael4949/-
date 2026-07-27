/**
 * 自定义指标公式引擎（通达信 / 同花顺风格）
 *
 * ── 为什么自己写解析器，不用 eval ──
 * 用户公式是用户输入的字符串。`eval` 或 `new Function` 会把它当 JavaScript 执行，
 * 一句 `fetch(...)` 就能把页面上的东西发出去。所以这里从词法到求值全部自己实现：
 * 能被计算的只有下面 FUNCS 里列出的函数和 VARS 里列出的变量，别的一律解析报错。
 *
 * ── 不许穿越 ──
 * 所有函数都只能向左看（REF/HHV/LLV/SUM 取的都是 i 及之前的数据）。
 * test/formula.test.js 里有一条硬约束：把数据从右边截短再算一遍，
 * 前半段的每个值必须逐位相同。任何一个函数偷看了未来，那条测试立刻红。
 *
 * ── 返回值 ──
 * 每个表达式求值成一条与 bars 等长的 Float64Array。
 * 前若干根因为窗口不足而算不出来的位置是 NaN —— 用 0 填充会让均线从 0 开始爬，
 * 画出来是一条假的上升趋势。
 */

/* ══════════════ 词法 ══════════════ */
const NUM_RE = /^\d+(\.\d+)?/;
const NAME_RE = /^[A-Za-z_一-龥][A-Za-z0-9_一-龥]*/;

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    // 通达信用 { } 或 // 写注释
    if (ch === '{') { const j = src.indexOf('}', i); i = j < 0 ? src.length : j + 1; continue; }
    if (ch === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); i = j < 0 ? src.length : j; continue; }

    const rest = src.slice(i);
    let m = NUM_RE.exec(rest);
    if (m) { out.push({ t: 'num', v: parseFloat(m[0]), at: i }); i += m[0].length; continue; }
    m = NAME_RE.exec(rest);
    if (m) { out.push({ t: 'name', v: m[0].toUpperCase(), raw: m[0], at: i }); i += m[0].length; continue; }

    const two = src.slice(i, i + 2);
    if (['>=', '<=', '<>', '!=', '=='].includes(two)) { out.push({ t: 'op', v: two, at: i }); i += 2; continue; }
    if ('+-*/^><=(),:'.includes(ch)) { out.push({ t: 'op', v: ch, at: i }); i++; continue; }
    throw new FormulaError(`无法识别的字符 “${ch}”`, i);
  }
  out.push({ t: 'eof', at: src.length });
  return out;
}

export class FormulaError extends Error {
  constructor(msg, at = -1) { super(msg); this.name = 'FormulaError'; this.at = at; }
}

/* ══════════════ 语法 ══════════════
   优先级从低到高：OR < AND < 比较 < 加减 < 乘除 < 一元 < 幂 */
const BIN_PREC = {
  'OR': 1, 'AND': 2,
  '>': 3, '<': 3, '>=': 3, '<=': 3, '=': 3, '==': 3, '<>': 3, '!=': 3,
  '+': 4, '-': 4,
  '*': 5, '/': 5,
  '^': 7,
};

function parseExpr(ts, pos, minPrec = 0, extra = null) {
  let [node, p] = parseUnary(ts, pos, extra);
  for (;;) {
    const tk = ts[p];
    const opv = tk.t === 'op' ? tk.v : (tk.t === 'name' && (tk.v === 'AND' || tk.v === 'OR') ? tk.v : null);
    if (!opv) break;
    const prec = BIN_PREC[opv];
    if (prec == null || prec < minPrec) break;
    // ^ 右结合，其余左结合
    const nextMin = opv === '^' ? prec : prec + 1;
    const [rhs, p2] = parseExpr(ts, p + 1, nextMin, extra);
    node = { k: 'bin', op: opv, a: node, b: rhs };
    p = p2;
  }
  return [node, p];
}

function parseUnary(ts, pos, extra = null) {
  const tk = ts[pos];
  if (tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
    const [n, p] = parseUnary(ts, pos + 1, extra);
    return [tk.v === '-' ? { k: 'neg', a: n } : n, p];
  }
  if (tk.t === 'name' && tk.v === 'NOT') {
    const [n, p] = parseUnary(ts, pos + 1, extra);
    return [{ k: 'not', a: n }, p];
  }
  return parsePrimary(ts, pos, extra);
}

function parsePrimary(ts, pos, extra = null) {
  const tk = ts[pos];
  if (tk.t === 'num') return [{ k: 'num', v: tk.v }, pos + 1];

  if (tk.t === 'op' && tk.v === '(') {
    const [n, p] = parseExpr(ts, pos + 1, 0, extra);
    expect(ts, p, ')');
    return [n, p + 1];
  }

  if (tk.t === 'name') {
    // 函数调用
    if (ts[pos + 1]?.t === 'op' && ts[pos + 1].v === '(') {
      const args = [];
      let p = pos + 2;
      if (!(ts[p].t === 'op' && ts[p].v === ')')) {
        for (;;) {
          const [a, np] = parseExpr(ts, p, 0, extra);
          args.push(a);
          p = np;
          if (ts[p]?.t === 'op' && ts[p].v === ',') { p++; continue; }
          break;
        }
      }
      expect(ts, p, ')');
      if (!FUNCS[tk.v]) throw new FormulaError(`不认识的函数 ${tk.raw}()`, tk.at);
      const spec = FUNCS[tk.v];
      if (args.length < spec.min || args.length > spec.max) {
        throw new FormulaError(
          `${tk.v}() 需要 ${spec.min === spec.max ? spec.min : `${spec.min}~${spec.max}`} 个参数，实际给了 ${args.length} 个`, tk.at);
      }
      return [{ k: 'call', fn: tk.v, args }, p + 1];
    }
    // extra 是多行脚本里前面几行定义出来的名字
    if (extra && extra.has(tk.v)) return [{ k: 'ref', name: tk.v }, pos + 1];
    if (!VARS[tk.v]) throw new FormulaError(`不认识的变量 ${tk.raw}`, tk.at);
    return [{ k: 'var', name: tk.v }, pos + 1];
  }

  throw new FormulaError('表达式不完整', tk.at);
}

function expect(ts, p, ch) {
  if (!(ts[p]?.t === 'op' && ts[p].v === ch)) {
    throw new FormulaError(`这里缺一个 “${ch}”`, ts[p]?.at ?? -1);
  }
}

/* ══════════════ 变量 ══════════════ */
export const VARS = {
  CLOSE: b => b.c, C: b => b.c,
  OPEN: b => b.o, O: b => b.o,
  HIGH: b => b.h, H: b => b.h,
  LOW: b => b.l, L: b => b.l,
  VOL: b => b.v, V: b => b.v, VOLUME: b => b.v,
  AMOUNT: b => b.v * b.c,
};

/* ══════════════ 函数 ══════════════
   一律「只向左看」。参数里的周期允许是序列（取第 i 位并四舍五入），
   这样 MA(CLOSE, N) 里的 N 也能是另一个表达式。 */
const NA = NaN;

function per(x, i) {                       // 取周期参数在第 i 根上的整数值
  const v = Array.isArray(x) || ArrayBuffer.isView(x) ? x[i] : x;
  return Number.isFinite(v) ? Math.round(v) : NaN;
}

export const FUNCS = {
  MA:   { min: 2, max: 2, doc: 'MA(X,N) N 日简单移动平均' },
  EMA:  { min: 2, max: 2, doc: 'EMA(X,N) N 日指数移动平均' },
  SMA:  { min: 3, max: 3, doc: 'SMA(X,N,M) 带权重的移动平均，KDJ 常用' },
  SUM:  { min: 2, max: 2, doc: 'SUM(X,N) N 日累加，N=0 表示从头累加' },
  REF:  { min: 2, max: 2, doc: 'REF(X,N) N 根之前的值' },
  HHV:  { min: 2, max: 2, doc: 'HHV(X,N) N 日内最高' },
  LLV:  { min: 2, max: 2, doc: 'LLV(X,N) N 日内最低' },
  STD:  { min: 2, max: 2, doc: 'STD(X,N) N 日样本标准差' },
  MAX:  { min: 2, max: 2, doc: 'MAX(A,B) 逐根取大' },
  MIN:  { min: 2, max: 2, doc: 'MIN(A,B) 逐根取小' },
  ABS:  { min: 1, max: 1, doc: 'ABS(X) 绝对值' },
  SQRT: { min: 1, max: 1, doc: 'SQRT(X) 平方根' },
  LOG:  { min: 1, max: 1, doc: 'LOG(X) 自然对数' },
  IF:   { min: 3, max: 3, doc: 'IF(条件,A,B) 条件成立取 A，否则取 B' },
  CROSS:{ min: 2, max: 2, doc: 'CROSS(A,B) A 上穿 B 的那一根为 1' },
  COUNT:{ min: 2, max: 2, doc: 'COUNT(条件,N) N 日内条件成立的次数' },
  EVERY:{ min: 2, max: 2, doc: 'EVERY(条件,N) N 日内条件一直成立' },
  EXIST:{ min: 2, max: 2, doc: 'EXIST(条件,N) N 日内条件出现过' },
  BARSLAST: { min: 1, max: 1, doc: 'BARSLAST(条件) 距上次条件成立过了几根' },
  ROUND:{ min: 1, max: 1, doc: 'ROUND(X) 四舍五入' },
};

/** 把标量或序列统一成「可按下标取值」的读取器 */
function reader(x) {
  return (Array.isArray(x) || ArrayBuffer.isView(x)) ? (i => x[i]) : (() => x);
}

function evalCall(fn, args, n) {
  const out = new Float64Array(n).fill(NA);
  const A = reader(args[0]), B = args.length > 1 ? reader(args[1]) : null;

  switch (fn) {
    case 'ABS':   for (let i = 0; i < n; i++) out[i] = Math.abs(A(i)); return out;
    case 'SQRT':  for (let i = 0; i < n; i++) out[i] = Math.sqrt(A(i)); return out;
    case 'LOG':   for (let i = 0; i < n; i++) out[i] = Math.log(A(i)); return out;
    case 'ROUND': for (let i = 0; i < n; i++) out[i] = Math.round(A(i)); return out;

    case 'MAX': for (let i = 0; i < n; i++) out[i] = Math.max(A(i), B(i)); return out;
    case 'MIN': for (let i = 0; i < n; i++) out[i] = Math.min(A(i), B(i)); return out;

    case 'IF': {
      const C = reader(args[1]), D = reader(args[2]);
      for (let i = 0; i < n; i++) out[i] = truthy(A(i)) ? C(i) : D(i);
      return out;
    }

    case 'REF': {
      for (let i = 0; i < n; i++) {
        const k = per(args[1], i);
        if (!Number.isFinite(k) || i - k < 0) continue;
        out[i] = A(i - k);
      }
      return out;
    }

    case 'MA': {
      for (let i = 0; i < n; i++) {
        const N = per(args[1], i);
        if (!(N >= 1) || i + 1 < N) continue;
        let s = 0, ok = true;
        for (let k = i - N + 1; k <= i; k++) { const v = A(k); if (!Number.isFinite(v)) { ok = false; break; } s += v; }
        if (ok) out[i] = s / N;
      }
      return out;
    }

    case 'EMA': {
      // 递推型指标必须从头顺序推，且首个有效值用简单均值起步
      let prev = NA;
      for (let i = 0; i < n; i++) {
        const N = per(args[1], i);
        const v = A(i);
        if (!(N >= 1) || !Number.isFinite(v)) { out[i] = prev; continue; }
        const a = 2 / (N + 1);
        prev = Number.isFinite(prev) ? a * v + (1 - a) * prev : v;
        out[i] = prev;
      }
      return out;
    }

    case 'SMA': {
      let prev = NA;
      for (let i = 0; i < n; i++) {
        const N = per(args[1], i), M = per(args[2], i);
        const v = A(i);
        if (!(N >= 1) || !(M >= 1) || !Number.isFinite(v)) { out[i] = prev; continue; }
        prev = Number.isFinite(prev) ? (M * v + (N - M) * prev) / N : v;
        out[i] = prev;
      }
      return out;
    }

    case 'SUM': {
      for (let i = 0; i < n; i++) {
        const N = per(args[1], i);
        if (!Number.isFinite(N)) continue;
        const from = N === 0 ? 0 : i - N + 1;       // N=0 约定为从头累加
        if (from < 0) continue;
        let s = 0, ok = true;
        for (let k = from; k <= i; k++) { const v = A(k); if (!Number.isFinite(v)) { ok = false; break; } s += v; }
        if (ok) out[i] = s;
      }
      return out;
    }

    case 'HHV': case 'LLV': {
      const hi = fn === 'HHV';
      for (let i = 0; i < n; i++) {
        const N = per(args[1], i);
        if (!(N >= 1) || i + 1 < N) continue;
        let best = hi ? -Infinity : Infinity, ok = false;
        for (let k = i - N + 1; k <= i; k++) {
          const v = A(k); if (!Number.isFinite(v)) continue;
          best = hi ? Math.max(best, v) : Math.min(best, v); ok = true;
        }
        if (ok) out[i] = best;
      }
      return out;
    }

    case 'STD': {
      for (let i = 0; i < n; i++) {
        const N = per(args[1], i);
        if (!(N >= 2) || i + 1 < N) continue;
        let s = 0, ok = true;
        for (let k = i - N + 1; k <= i; k++) { const v = A(k); if (!Number.isFinite(v)) { ok = false; break; } s += v; }
        if (!ok) continue;
        const m = s / N;
        let q = 0;
        for (let k = i - N + 1; k <= i; k++) q += (A(k) - m) ** 2;
        out[i] = Math.sqrt(q / (N - 1));
      }
      return out;
    }

    case 'CROSS': {
      for (let i = 1; i < n; i++) {
        const a0 = A(i - 1), a1 = A(i), b0 = B(i - 1), b1 = B(i);
        if (![a0, a1, b0, b1].every(Number.isFinite)) continue;
        out[i] = (a0 <= b0 && a1 > b1) ? 1 : 0;
      }
      if (n > 0) out[0] = 0;
      return out;
    }

    case 'COUNT': case 'EVERY': case 'EXIST': {
      for (let i = 0; i < n; i++) {
        const N = per(args[1], i);
        if (!(N >= 1) || i + 1 < N) continue;
        let cnt = 0;
        for (let k = i - N + 1; k <= i; k++) if (truthy(A(k))) cnt++;
        out[i] = fn === 'COUNT' ? cnt : fn === 'EVERY' ? (cnt === N ? 1 : 0) : (cnt > 0 ? 1 : 0);
      }
      return out;
    }

    case 'BARSLAST': {
      let last = -1;
      for (let i = 0; i < n; i++) {
        if (truthy(A(i))) last = i;
        out[i] = last < 0 ? NA : i - last;
      }
      return out;
    }
  }
  throw new FormulaError(`函数 ${fn}() 还没有实现`);
}

function truthy(v) { return Number.isFinite(v) && v !== 0; }

/* ══════════════ 求值 ══════════════ */
function evalNode(node, bars, n, env = null) {
  switch (node.k) {
    case 'num': return node.v;

    case 'ref': {
      const v = env && env[node.name];
      if (!v) throw new FormulaError(`引用了还没定义的名字 ${node.name}`);
      return v;
    }

    case 'var': {
      const get = VARS[node.name];
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = get(bars[i]);
      return out;
    }

    case 'neg': {
      const a = evalNode(node.a, bars, n, env);
      if (typeof a === 'number') return -a;
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = -a[i];
      return out;
    }

    case 'not': {
      const a = reader(evalNode(node.a, bars, n, env));
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = truthy(a(i)) ? 0 : 1;
      return out;
    }

    case 'call': {
      const args = node.args.map(x => evalNode(x, bars, n, env));
      return evalCall(node.fn, args, n);
    }

    case 'bin': {
      const a = evalNode(node.a, bars, n, env), b = evalNode(node.b, bars, n, env);
      // 两边都是常数就直接算，省得铺成整条序列
      if (typeof a === 'number' && typeof b === 'number') return binOp(node.op, a, b);
      const A = reader(a), B = reader(b);
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = binOp(node.op, A(i), B(i));
      return out;
    }
  }
  throw new FormulaError('无法求值的节点');
}

function binOp(op, x, y) {
  switch (op) {
    case '+': return x + y;
    case '-': return x - y;
    case '*': return x * y;
    case '/': return y === 0 ? NA : x / y;      // 除零给 NaN，不给 Infinity
    case '^': return Math.pow(x, y);
    case '>': return x > y ? 1 : 0;
    case '<': return x < y ? 1 : 0;
    case '>=': return x >= y ? 1 : 0;
    case '<=': return x <= y ? 1 : 0;
    case '=': case '==': return x === y ? 1 : 0;
    case '<>': case '!=': return x !== y ? 1 : 0;
    case 'AND': return (truthy(x) && truthy(y)) ? 1 : 0;
    case 'OR': return (truthy(x) || truthy(y)) ? 1 : 0;
  }
  throw new FormulaError(`不认识的运算符 ${op}`);
}

/* ══════════════ 对外接口 ══════════════ */

/**
 * 只解析不求值：用于输入框实时校验。
 * extra 传入一组已在前面几行定义过的名字，让它们也算合法变量。
 */
export function compile(src, extra = null) {
  const ts = tokenize(String(src || ''));
  if (ts.length === 1) throw new FormulaError('公式是空的');
  const [node, p] = parseExpr(ts, 0, 0, extra);
  if (ts[p].t !== 'eof') throw new FormulaError('表达式后面还有多余的内容', ts[p].at);
  return node;
}

/**
 * 计算一条公式。
 * @returns {Float64Array} 与 bars 等长；窗口不足处为 NaN
 */
export function evaluate(src, bars) {
  const node = compile(src);
  const n = bars.length;
  const r = evalNode(node, bars, n);
  if (typeof r === 'number') return new Float64Array(n).fill(r);
  return r;
}

/**
 * 多行公式：`名字: 表达式` 每行一条，返回 { 名字 -> 序列 }。
 * 这是通达信写指标的常见形态，比如：
 *   DIF: EMA(CLOSE,12)-EMA(CLOSE,26)
 *   DEA: EMA(DIF,9)
 * 后面的行可以引用前面行的名字。
 */
export function evaluateScript(src, bars) {
  const lines = String(src || '').split(/[\n;]/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) throw new FormulaError('公式是空的');
  const n = bars.length;
  const env = Object.create(null);
  const defined = new Set();
  const order = [];

  for (const line of lines) {
    const m = /^([A-Za-z_一-龥][A-Za-z0-9_一-龥]*)\s*:(?!=)\s*(.+)$/.exec(line);
    const name = m ? m[1] : `输出${order.length + 1}`;
    const expr = m ? m[2] : line;
    const key = name.toUpperCase();

    // 解析时把前面几行的名字当作合法变量；求值时从 env 里取
    const node = compile(expr, defined);
    const val = evalNode(node, bars, n, env);
    env[key] = (typeof val === 'number') ? new Float64Array(n).fill(val) : val;
    defined.add(key);
    order.push(name);
  }
  return { names: order, series: order.map(nm => env[nm.toUpperCase()]), env };
}

/** 内置示例，同时也是给用户的语法教材 */
export const FORMULA_PRESETS = [
  { name: '双均线差', src: 'MA(CLOSE,5)-MA(CLOSE,20)',
    desc: '快线减慢线。大于 0 是多头排列。' },
  { name: 'MACD', src: 'DIF: EMA(CLOSE,12)-EMA(CLOSE,26)\nDEA: EMA(DIF,9)\nMACD: (DIF-DEA)*2',
    desc: '三行写法：后面的行可以直接引用前面行的名字。' },
  { name: 'RSI', src: 'LC: REF(CLOSE,1)\nRSI: SMA(MAX(CLOSE-LC,0),14,1)/SMA(ABS(CLOSE-LC),14,1)*100',
    desc: '相对强弱。SMA(X,N,M) 是通达信的加权均值。' },
  { name: 'BOLL 上轨', src: 'MA(CLOSE,20)+2*STD(CLOSE,20)',
    desc: '布林上轨 = 20 日均线 + 2 倍标准差。' },
  { name: '量比异动', src: 'VOL/MA(VOL,5)',
    desc: '当日成交量相对 5 日均量的倍数。' },
  { name: '金叉信号', src: 'CROSS(MA(CLOSE,5),MA(CLOSE,20))',
    desc: '5 日线上穿 20 日线那一根为 1，其余为 0。可直接当筛选条件。' },
  { name: '距离新高', src: 'BARSLAST(CLOSE=HHV(CLOSE,60))',
    desc: '距离上一次创 60 日新高过了多少根。' },
];
