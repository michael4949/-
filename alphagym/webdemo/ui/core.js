/* ══════════════════════════════════════════════════════════════════
   UI 公共层：工具、主题、路由、图表、数据目录

   本文件及后续 ui/*.js 由 build.js 包进同一个 IIFE，与上方的引擎源码
   共享模块作用域但不污染它 —— 引擎里已有 sgn / pct 这类短名字，
   UI 层再定义同名常量会直接把整个脚本打挂。
   ══════════════════════════════════════════════════════════════════ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fx = (v, d = 2) => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
const sg = (v, d = 2) => (v >= 0 ? '+' : '') + fx(v, d);
const pc1 = (v) => (v * 100).toFixed(1) + '%';
const pc2 = (v) => (v * 100).toFixed(2) + '%';
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 引擎文案里用 **粗体** 标重点（Node 终端渲染需要），到 HTML 得转成标签 */
const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.style.opacity = 1; t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = 0; t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2600);
}

/* ── 主题 ───────────────────────────────────────────────────────── */
const themeNow = () => document.documentElement.getAttribute('data-theme') || 'light';
function setTheme(t, persist = true) {
  document.documentElement.setAttribute('data-theme', t);
  if (persist) { try { localStorage.setItem('ag-theme', t); } catch (e) {} }
  restyleCharts();
}
const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ── 图表 ───────────────────────────────────────────────────────── */
const charts = {};
function chartStyles() {
  const up = cssv('--up'), dn = cssv('--dn'), line = cssv('--line'),
    mut = cssv('--mut'), ink = cssv('--ink'), panel = cssv('--panel');
  return {
    grid: { horizontal: { color: line }, vertical: { color: line } },
    candle: {
      bar: {
        upColor: up, downColor: dn, noChangeColor: mut,
        upBorderColor: up, downBorderColor: dn, noChangeBorderColor: mut,
        upWickColor: up, downWickColor: dn, noChangeWickColor: mut,
      },
      priceMark: {
        last: { upColor: up, downColor: dn, noChangeColor: mut, text: { color: '#fff' } },
        high: { color: mut }, low: { color: mut },
      },
      tooltip: { text: { color: ink }, rect: { color: panel, borderColor: line } },
    },
    indicator: { tooltip: { text: { color: mut } },
      bars: [{ upColor: up + '90', downColor: dn + '90', noChangeColor: mut }] },
    xAxis: { axisLine: { color: line }, tickLine: { color: line }, tickText: { color: mut } },
    yAxis: { axisLine: { color: line }, tickLine: { color: line }, tickText: { color: mut } },
    crosshair: {
      horizontal: { line: { color: mut }, text: { backgroundColor: cssv('--brand') } },
      vertical: { line: { color: mut }, text: { backgroundColor: cssv('--brand') } },
    },
    separator: { color: line },
  };
}
function restyleCharts() {
  const st = chartStyles();
  for (const c of Object.values(charts)) { try { c?.setStyles(st); } catch (e) {} }
  // 展示型图表关掉了 tooltip，而 setStyles 会把它恢复成默认——重绘一次补回去
  if (typeof drawHeroChart === 'function' && $('#heroChart')) { drawHeroChart(); drawFeatCharts(); }
}
function getChart(id, opts = {}) {
  if (!charts[id]) {
    charts[id] = klinecharts.init(id, { styles: chartStyles() });
    if (opts.ma !== false) charts[id].createIndicator('MA', false, { id: 'candle_pane' });
    if (opts.vol) charts[id].createIndicator('VOL');
  }
  return charts[id];
}
const toK = (b) => ({ timestamp: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v });
function resizeCharts() { for (const c of Object.values(charts)) { try { c?.resize(); } catch (e) {} } }

/* ── 数据目录 ───────────────────────────────────────────────────── */
const INSTRUMENTS = {
  SPX:    { symbol: 'SPX',    multiplier: 10,   tickSize: 0.05,   feeRate: 0.00005, feePerUnit: 0, slippageTicks: 1 },
  IXIC:   { symbol: 'IXIC',   multiplier: 10,   tickSize: 0.05,   feeRate: 0.00005, feePerUnit: 0, slippageTicks: 1 },
  GOOG:   { symbol: 'GOOG',   multiplier: 1,    tickSize: 0.01,   feeRate: 0.0003,  feePerUnit: 0, slippageTicks: 1 },
  EURUSD: { symbol: 'EURUSD', multiplier: 1000, tickSize: 0.0001, feeRate: 0.00008, feePerUnit: 0, slippageTicks: 1 },
};
const TF_LABEL = { '1d': '日线', '1h': '小时线' };
const DECIMALS = { EURUSD: 5 };
const dec = (sym) => DECIMALS[sym] ?? 2;

/** 把打包进来的原始行数组转成引擎用的 bar 对象，并缓存 */
const barsCache = {};
function barsOf(sym) {
  if (!barsCache[sym]) {
    barsCache[sym] = DATASETS[sym].rows.map(([t, o, h, l, c, v]) => ({ t, o, h, l, c, v }));
  }
  return barsCache[sym];
}
/** query.js / similar.js 需要的 { symbol: {bars, display} } 形态 */
let allDs = null;
function datasetsAll() {
  if (!allDs) {
    allDs = {};
    for (const [sym, d] of Object.entries(DATASETS)) {
      allDs[sym] = { bars: barsOf(sym), display: d.display, timeframe: d.timeframe, source: d.source };
    }
  }
  return allDs;
}

/* ── 全局状态 ───────────────────────────────────────────────────── */
const S = {
  view: 'home',
  ds: 'SPX',
  session: null, ins: null, segBars: null,
  playing: false, speed: 3, timer: null, dir: 1,
  lastTrades: null, lastBars: null, lastIns: null, lastLabel: '',
  report: null, reportPending: false,
  blind: null,
  simIndex: null, simQuery: null,
  chatMsgs: [], atts: [], recog: null, queryCache: new Map(),
};

/* ── 路由 ───────────────────────────────────────────────────────── */
const APP_META = {
  replay:    ['行情回放', '/ 训练 / 行情回放'],
  blind:     ['双盲测试', '/ 训练 / 双盲测试'],
  analysis:  ['交易分析', '/ 分析 / 交易分析'],
  eval:      ['能力评估', '/ 分析 / 能力评估'],
  similar:   ['相似行情', '/ 智能工具 / 相似行情'],
  assistant: ['智能助手', '/ 智能工具 / 智能助手'],
};

function route() {
  const hash = location.hash.slice(1) || 'home';
  const isApp = hash.startsWith('app/');
  $('#site').style.display = isApp ? 'none' : '';
  $('#app').classList.toggle('on', isApp);
  $('#nav').classList.remove('open');

  if (isApp) {
    const key = hash.split('/')[1] || 'replay';
    S.view = key;
    $$('.view').forEach(v => v.classList.toggle('hide', v.id !== 'v-' + key));
    $$('.rail a[data-v]').forEach(a => a.classList.toggle('on', a.dataset.v === key));
    const m = APP_META[key] || APP_META.replay;
    $('#vTitle').textContent = m[0];
    $('#vCrumb').textContent = m[1];
    // 进了应用就把官网导航的高亮清掉，否则会一直停留在上一个官网页上
    $$('#nav a').forEach(a => a.classList.remove('on'));
    window.scrollTo(0, 0);
    onEnterView(key);
  } else {
    S.view = hash;
    renderSite(hash);
    $$('#nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + hash));
    window.scrollTo(0, 0);
  }
  requestAnimationFrame(() => setTimeout(resizeCharts, 40));
}
