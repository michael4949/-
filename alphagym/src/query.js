/**
 * 智能问数：自然语言 → 查询结构 → 在真实数据上执行。
 *
 * ── 架构立场（和报告层是同一套哲学）──
 *
 * 这里把「理解语言」和「计算答案」彻底分开：
 *
 *     自然语言 ──[语义解析]──▶ 查询结构 AST ──[确定性执行]──▶ 真实数据上的结果
 *
 * 本模块实现的是**后半段 + 一个覆盖受限语法的确定性前半段**。
 * 生产环境里前半段换成大模型：它只负责把话翻译成 AST，
 * 不参与取数、不参与计算、也无从编造结果 —— AST 会原样展示给用户核对。
 *
 * 这样做的好处和 report.js 完全一致：结果可审计、可复现、无幻觉空间。
 *
 * ── 一条硬规矩 ──
 *
 * **解析不出来就说解析不出来。** 绝不回退到某个「差不多的」预设答案。
 * 上一版原型的写法是 `Object.keys(DB).find(k => q.includes(k)) || '股灾'` ——
 * 于是你问「白马股」，它一本正经地返回 2015 年股灾跌幅榜。
 * 那不是能力不足，那是欺骗。
 */

/** 中文数字 → 阿拉伯数字（覆盖查询里会出现的量级） */
const CN_NUM = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function parseNum(s) {
  if (s == null) return NaN;
  const t = String(s).trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  if (CN_NUM[t] !== undefined) return CN_NUM[t];
  const m = /^十([一二三四五六七八九])$/.exec(t);
  if (m) return 10 + CN_NUM[m[1]];
  const m2 = /^([二三四五六七八九])十([一二三四五六七八九])?$/.exec(t);
  if (m2) return CN_NUM[m2[1]] * 10 + (m2[2] ? CN_NUM[m2[2]] : 0);
  return NaN;
}
const NUM = '(\\d+(?:\\.\\d+)?|[零一二两三四五六七八九十]+)';

/**
 * 可查询字段。每个字段声明中文别名、单位与计算方式，
 * 解析器与执行器共用这一份定义 —— 加字段只需改这里。
 */
export const FIELDS = {
  chg:      { label: '单日涨跌幅', unit: '%', pct: true,  aliases: ['涨幅', '跌幅', '涨跌幅', '日涨幅', '日跌幅', '单日涨幅', '单日跌幅'] },
  amp:      { label: '振幅',      unit: '%', pct: true,  aliases: ['振幅', '波幅'] },
  gap:      { label: '跳空幅度',  unit: '%', pct: true,  aliases: ['跳空', '高开', '低开', '跳空幅度'] },
  volRatio: { label: '量比',      unit: '倍', pct: false, aliases: ['量比', '放量', '成交量倍数', '倍量'] },
  drawdown: { label: '距最高点回撤', unit: '%', pct: true, aliases: ['回撤', '回落', '距高点'] },
  rv20:     { label: '20日年化波动率', unit: '%', pct: true, aliases: ['波动率', '年化波动率', '波动'] },
  streak:   { label: '连涨/连跌天数', unit: '天', pct: false, aliases: ['连涨', '连跌', '连续上涨', '连续下跌', '连阳', '连阴'] },
  maDist20: { label: '偏离20日均线', unit: '%', pct: true, aliases: ['偏离均线', '乖离', '偏离20日线', '距均线'] },
  close:    { label: '收盘价',    unit: '',  pct: false, aliases: ['收盘价', '收盘', '价格'] },
  volume:   { label: '成交量',    unit: '',  pct: false, aliases: ['成交量', '量能'] },
  fwd20:    { label: '后20根涨跌幅', unit: '%', pct: true, aliases: ['后续涨幅', '后续跌幅', '未来涨幅', '后20根', '之后走势'] },
};

const OPS = [
  { re: /(?:超过|大于|高于|多于|>=?|≥)/, op: '>=' },
  { re: /(?:低于|小于|少于|不足|<=?|≤)/, op: '<=' },
];

/** 时间范围解析：支持「2008年」「2008年到2010年」「2015年6月」「最近3年」 */
function parseTimeRange(q) {
  let m = /(\d{4})\s*年\s*(?:到|至|-|~)\s*(\d{4})\s*年/.exec(q);
  if (m) return { from: Date.UTC(+m[1], 0, 1), to: Date.UTC(+m[2] + 1, 0, 1), label: `${m[1]}–${m[2]} 年` };

  m = /(\d{4})\s*年\s*(\d{1,2})\s*月/.exec(q);
  if (m) {
    const y = +m[1], mo = +m[2] - 1;
    return { from: Date.UTC(y, mo, 1), to: Date.UTC(y, mo + 1, 1), label: `${m[1]} 年 ${m[2]} 月` };
  }
  m = /(\d{4})\s*年/.exec(q);
  if (m) return { from: Date.UTC(+m[1], 0, 1), to: Date.UTC(+m[1] + 1, 0, 1), label: `${m[1]} 年` };

  m = new RegExp(`(?:最近|近|过去)\\s*${NUM}\\s*(年|个月|月|天|日)`).exec(q);
  if (m) {
    const n = parseNum(m[1]);
    const days = m[2] === '年' ? n * 365 : (m[2] === '天' || m[2] === '日') ? n : n * 30;
    return { relativeDays: days, label: `最近 ${n}${m[2]}` };
  }
  return null;
}

/** 品种解析：中英文名与代码 */
function parseSymbols(q, catalog) {
  const hit = [];
  for (const [sym, info] of Object.entries(catalog)) {
    const names = [sym, info.display, ...(info.aliases || [])];
    if (names.some(n => n && q.includes(n))) hit.push(sym);
  }
  return hit;
}

/**
 * 把一句中文解析成查询结构。
 * @returns {{ok:true, ast:Object} | {ok:false, reason:string, hints:string[]}}
 */
export function parse(q, catalog) {
  const raw = String(q || '').trim();
  if (!raw) return fail('空查询');
  const text = raw.replace(/\s+/g, '');

  const ast = {
    from: parseSymbols(text, catalog),
    time: parseTimeRange(text),
    where: [],
    orderBy: null,
    limit: null,
    select: 'bars',
    raw,
  };

  // ── 条件：字段 + 比较符 + 阈值 ────────────────────────────────────
  for (const [key, def] of Object.entries(FIELDS)) {
    for (const alias of def.aliases) {
      if (!text.includes(alias)) continue;
      for (const { re, op } of OPS) {
        const pattern = new RegExp(`${alias}[^0-9零一二两三四五六七八九十]{0,4}?${re.source}[^0-9零一二两三四五六七八九十]{0,3}?${NUM}`);
        const m = pattern.exec(text);
        if (m) {
          let v = parseNum(m[1]);
          if (Number.isNaN(v)) continue;
          // 「跌幅超过5%」在数据里是 -5%，方向由别名本身决定
          const negative = /跌|回撤|回落|低开|连跌|连阴|下跌/.test(alias);
          if (def.pct) v = v / 100;
          let realOp = op, realVal = v;
          if (negative) {
            // 「跌幅/回撤/连跌超过 X」在数据里都是**更负**，所以阈值取负、比较符翻转。
            // 早期版本把 drawdown 和 streak 排除在外，结果「回撤超过40%」变成
            // drawdown ≥ +0.4 —— 而回撤恒为负，永远零命中，还不报错。
            realVal = -v;
            realOp = op === '>=' ? '<=' : '>=';
          }
          ast.where.push({ field: key, op: realOp, value: realVal, alias, srcText: m[0] });
          break;
        }
      }
      // 「连涨5天」这类不带比较符的写法
      if (key === 'streak') {
        const m = new RegExp(`(连涨|连跌|连阳|连阴|连续上涨|连续下跌)${NUM}(?:天|日|根)`).exec(text);
        if (m && !ast.where.some(w => w.field === 'streak')) {
          const n = parseNum(m[2]);
          const down = /跌|阴/.test(m[1]);
          ast.where.push({ field: 'streak', op: down ? '<=' : '>=', value: down ? -n : n, alias: m[1], srcText: m[0] });
        }
      }
    }
  }

  // ── 排序与取前 N ─────────────────────────────────────────────────
  const topM = new RegExp(`(?:前|头|top)\\s*${NUM}|${NUM}\\s*(?:个|只|天|条|根)(?:最|排名)`).exec(text);
  if (topM) ast.limit = parseNum(topM[1] || topM[2]);

  // 「最大单日振幅」「最大的振幅」「振幅最大」都要认 ——
  // 超级词和字段名之间常夹着「单日/的/历史」这类修饰词，
  // 早期版本要求两者紧贴，于是「最大单日振幅」直接解析失败。
  const FILLER = '[^0-9零一二两三四五六七八九十]{0,4}?';
  for (const [key, def] of Object.entries(FIELDS)) {
    for (const alias of def.aliases) {
      if (new RegExp(`(?:最大|最高|最强|最深)${FILLER}${alias}|${alias}${FILLER}(?:最大|最高|最强|最深)`).test(text)) {
        ast.orderBy = { field: key, dir: 'desc' }; ast.limit = ast.limit || 1;
      }
      if (new RegExp(`(?:最小|最低|最弱)${FILLER}${alias}|${alias}${FILLER}(?:最小|最低|最弱)`).test(text)) {
        ast.orderBy = { field: key, dir: 'asc' }; ast.limit = ast.limit || 1;
      }
    }
  }
  // 「最大跌幅」「最深回撤」问的是最负的那个，方向要反过来
  if (ast.orderBy && /(?:最大|最深|最高)[^0-9]{0,4}?(?:跌幅|回撤|回落)/.test(text)) {
    ast.orderBy.dir = 'asc';
  }
  if (!ast.orderBy && ast.where.length) {
    const w = ast.where[0];
    ast.orderBy = { field: w.field, dir: w.op === '>=' ? 'desc' : 'asc' };
  }

  // ── 聚合意图 ─────────────────────────────────────────────────────
  if (/(共|一共|多少|几)(天|次|个|根)/.test(text)) ast.select = 'count';
  if (/(平均|均值)/.test(text)) ast.select = 'avg';

  if (ast.where.length === 0 && !ast.orderBy) {
    return fail('这句话里没有识别到可计算的条件', hintsFor(catalog));
  }
  if (ast.from.length === 0) ast.from = Object.keys(catalog);   // 未指定品种就全查
  if (!ast.limit) ast.limit = 20;
  return { ok: true, ast };
}

function fail(reason, hints = []) { return { ok: false, reason, hints }; }

function hintsFor(catalog) {
  const s = Object.values(catalog)[0]?.display || '标普500';
  return [
    `${s} 2008 年跌幅超过 5% 的交易日`,
    `${s} 历史最大单日振幅`,
    `${s} 连涨 5 天之后的走势`,
    `量比超过 3 倍且涨幅超过 2% 的日子`,
    `2000 年到 2003 年回撤超过 40% 的时间段`,
  ];
}

/** 把 AST 渲染成类 SQL，给用户核对「机器到底听懂了什么」 */
export function explain(ast) {
  const cols = ['日期', '品种', '收盘', ...new Set(ast.where.map(w => FIELDS[w.field].label))];
  const where = [];
  if (ast.time?.label) where.push(`日期 IN (${ast.time.label})`);
  for (const w of ast.where) {
    const d = FIELDS[w.field];
    const v = d.pct ? `${(w.value * 100).toFixed(2)}%` : w.value;
    where.push(`${d.label} ${w.op === '>=' ? '≥' : '≤'} ${v}`);
  }
  return [
    `SELECT ${cols.join(', ')}`,
    `FROM ${ast.from.join(', ')}`,
    where.length ? `WHERE ${where.join('\n  AND ')}` : null,
    ast.orderBy ? `ORDER BY ${FIELDS[ast.orderBy.field].label} ${ast.orderBy.dir.toUpperCase()}` : null,
    ast.select === 'bars' && ast.limit ? `LIMIT ${ast.limit}` : null,
  ].filter(Boolean).join('\n');
}

/**
 * 为一个品种预计算全部派生字段。O(n)，结果可缓存。
 *
 * ⚠️ fwd20（后 20 根涨跌幅）是**前视字段**。用于历史研究与统计是正当的，
 * 但绝不可出现在回放训练的任何路径上。执行器会在结果里标注它。
 */
export function derive(bars) {
  const n = bars.length;
  const out = {
    chg: new Float64Array(n), amp: new Float64Array(n), gap: new Float64Array(n),
    volRatio: new Float64Array(n), drawdown: new Float64Array(n), rv20: new Float64Array(n),
    streak: new Float64Array(n), maDist20: new Float64Array(n), fwd20: new Float64Array(n),
  };
  let peak = -Infinity, run = 0;
  const logret = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const b = bars[i], p = i > 0 ? bars[i - 1] : null;
    const pc = p ? p.c : b.o;
    out.chg[i] = pc > 0 ? (b.c - pc) / pc : 0;
    out.amp[i] = pc > 0 ? (b.h - b.l) / pc : 0;
    out.gap[i] = pc > 0 ? (b.o - pc) / pc : 0;
    logret[i] = pc > 0 && b.c > 0 ? Math.log(b.c / pc) : 0;

    peak = Math.max(peak, b.c);
    out.drawdown[i] = peak > 0 ? (b.c - peak) / peak : 0;

    if (i > 0) {
      const up = b.c > bars[i - 1].c;
      run = up ? (run > 0 ? run + 1 : 1) : (b.c < bars[i - 1].c ? (run < 0 ? run - 1 : -1) : 0);
    }
    out.streak[i] = run;

    if (i >= 19) {
      let sv = 0, sc = 0, s2 = 0;
      for (let k = i - 19; k <= i; k++) { sv += bars[k].v; sc += bars[k].c; }
      const mv = sv / 20, ma = sc / 20;
      out.volRatio[i] = mv > 0 ? bars[i].v / mv : 0;
      out.maDist20[i] = ma > 0 ? (b.c - ma) / ma : 0;
      const mean = (() => { let s = 0; for (let k = i - 19; k <= i; k++) s += logret[k]; return s / 20; })();
      for (let k = i - 19; k <= i; k++) { const d = logret[k] - mean; s2 += d * d; }
      out.rv20[i] = Math.sqrt(s2 / 19) * Math.sqrt(252);
    }
    if (i + 20 < n) out.fwd20[i] = b.c > 0 ? (bars[i + 20].c - b.c) / b.c : 0;
  }
  return out;
}

const FUTURE_FIELDS = new Set(['fwd20']);

/**
 * 在真实数据上执行 AST。
 * @param {Object} ast
 * @param {Object} datasets  { symbol: { bars, display, ... } }
 * @param {Map} [cache] derive() 结果缓存
 */
export function execute(ast, datasets, cache = new Map()) {
  const hits = [];
  let scanned = 0;

  for (const sym of ast.from) {
    const ds = datasets[sym];
    if (!ds) continue;
    if (!cache.has(sym)) cache.set(sym, derive(ds.bars));
    const d = cache.get(sym);
    const bars = ds.bars;

    let from = 0, to = bars.length - 1;
    if (ast.time) {
      if (ast.time.relativeDays != null) {
        const cut = bars[bars.length - 1].t - ast.time.relativeDays * 86400000;
        while (from < bars.length && bars[from].t < cut) from++;
      } else {
        while (from < bars.length && bars[from].t < ast.time.from) from++;
        to = from;
        while (to + 1 < bars.length && bars[to + 1].t < ast.time.to) to++;
      }
    }

    for (let i = Math.max(from, 20); i <= to; i++) {
      scanned++;
      let pass = true;
      for (const w of ast.where) {
        const v = w.field === 'close' ? bars[i].c : w.field === 'volume' ? bars[i].v : d[w.field][i];
        if (w.op === '>=' ? !(v >= w.value) : !(v <= w.value)) { pass = false; break; }
      }
      if (!pass) continue;
      hits.push({
        symbol: sym, display: ds.display || sym, index: i, t: bars[i].t,
        close: bars[i].c,
        values: Object.fromEntries(Object.keys(FIELDS).map(k =>
          [k, k === 'close' ? bars[i].c : k === 'volume' ? bars[i].v : d[k][i]])),
      });
    }
  }

  if (ast.orderBy) {
    const f = ast.orderBy.field, dir = ast.orderBy.dir === 'desc' ? -1 : 1;
    hits.sort((a, b) => dir * ((a.values[f] ?? 0) - (b.values[f] ?? 0)));
  }

  const usesFuture = ast.where.some(w => FUTURE_FIELDS.has(w.field))
    || (ast.orderBy && FUTURE_FIELDS.has(ast.orderBy.field));

  const shown = ast.select === 'bars' ? hits.slice(0, ast.limit) : hits;
  const cols = ['日期', '品种', '收盘', ...new Set(ast.where.map(w => FIELDS[w.field].label))];
  const fields = [...new Set(ast.where.map(w => w.field))];

  return {
    total: hits.length,
    // 纯排序查询（如「历史最大振幅」）没有筛选条件，命中数等于扫描数，
    // 直接显示「命中 5011 条」会误导。标出来让 UI 换个说法。
    ranking: ast.where.length === 0,
    scanned,
    rows: shown,
    columns: cols,
    fields,
    select: ast.select,
    count: hits.length,
    averages: Object.fromEntries(fields.map(f => {
      const vals = hits.map(h => h.values[f]).filter(Number.isFinite);
      return [f, vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN];
    })),
    usesFuture,
  };
}

/** 一步到位：解析 + 执行 */
export function ask(q, datasets, cache) {
  const catalog = Object.fromEntries(Object.entries(datasets)
    .map(([k, v]) => [k, { display: v.display, aliases: v.aliases }]));
  const p = parse(q, catalog);
  if (!p.ok) return p;
  return { ok: true, ast: p.ast, sql: explain(p.ast), result: execute(p.ast, datasets, cache) };
}
