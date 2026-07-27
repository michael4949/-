/* ══════════════════════════════════════════════════════════════════
   多模拟账户 · 交易记录导入导出

   tradingexer 的「多模拟账户独立记账」在这里的对应物：
   每个账户是一条独立的轮次流水，练不同风格（比如「日内」和「波段」）
   互不污染统计。落在 localStorage，刷新不丢。

   导出用的是标准 CSV，字段和智能助手能解析的格式一致 ——
   导出的文件可以原样拖回来重新评估，这是闭环，不是摆设。
   ══════════════════════════════════════════════════════════════════ */

const ACCT_KEY = 'ag-accounts';
const ACCT = { list: [], cur: null };

function acctLoad() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(ACCT_KEY) || 'null'); } catch (e) {}
  ACCT.list = Array.isArray(raw?.list) && raw.list.length ? raw.list : [
    { id: 'a1', name: '主账户', rounds: [] },
  ];
  ACCT.cur = ACCT.list.find(a => a.id === raw?.cur)?.id || ACCT.list[0].id;
}
function acctSave() {
  try { localStorage.setItem(ACCT_KEY, JSON.stringify({ list: ACCT.list, cur: ACCT.cur })); } catch (e) {}
}
function acctCurrent() { return ACCT.list.find(a => a.id === ACCT.cur) || ACCT.list[0]; }

function acctRender() {
  const sel = $('#acctSel'); if (!sel) return;
  sel.innerHTML = ACCT.list.map(a =>
    `<option value="${a.id}">${a.name} · ${a.rounds.length} 轮</option>`).join('')
    + '<option value="__new">＋ 新建账户…</option>';
  sel.value = ACCT.cur;
}

function acctSwitch(v) {
  if (v === '__new') {
    const name = prompt('新账户名称', `账户 ${ACCT.list.length + 1}`);
    acctRender();
    if (!name) return;
    const id = 'a' + Date.now().toString(36);
    ACCT.list.push({ id, name: name.slice(0, 20), rounds: [] });
    ACCT.cur = id;
  } else {
    ACCT.cur = v;
  }
  acctSave();
  acctRender();
  toast(`已切换到「${acctCurrent().name}」`);
}

/** 一轮结束时把结果记进当前账户 */
function saveRoundToAccount(trades) {
  const a = acctCurrent(); if (!a) return;
  const ctx = makeContext(S.lastBars, S.lastIns, { refSize: medianSize(trades) });
  const ev = evalTrades(ctx, trades);
  a.rounds.push({
    at: Date.now(),
    symbol: S.ds,
    label: S.lastLabel,
    trades: trades.length,
    decisions: S.decisions,
    hints: (typeof COACH !== 'undefined' ? COACH.hints : 0),
    totalR: ev.totalR,
    net: ev.net,
    winRate: ev.rows.length ? ev.rows.filter(r => r.net > 0).length / ev.rows.length : 0,
  });
  if (a.rounds.length > 200) a.rounds.splice(0, a.rounds.length - 200);
  acctSave();
  acctRender();
}

/* ── 导出 ───────────────────────────────────────────────────────── */
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportTradesCsv() {
  const e = S.session?.engine;
  const ct = e?.closedTrades || [];
  if (!ct.length) { toast('本轮还没有已平仓的交易'); return; }
  const D = dec(S.ds);
  const ctx = makeContext(S.segBars, S.ins, { refSize: medianSize(ct) });
  const ev = evalTrades(ctx, ct.map(t => ({ entry: t.entry, exit: t.exit, dir: t.dir, size: t.size })));

  const head = ['入场时间', '出场时间', '品种', '方向', '手数', '入场价', '出场价', '净盈亏', 'R倍数', 'MAE(R)', 'MFE(R)', '持仓根数'];
  const lines = [head.join(',')];
  ev.rows.forEach((r) => {
    lines.push([
      ymd(S.segBars[r.entry].t), ymd(S.segBars[r.exit].t), S.ds,
      r.dir > 0 ? '多' : '空', r.size,
      fx(S.segBars[r.entry + 1]?.o ?? S.segBars[r.entry].c, D),
      fx(S.segBars[r.exit + 1]?.o ?? S.segBars[r.exit].c, D),
      r.net.toFixed(2), r.r.toFixed(3), r.mae.toFixed(3), r.mfe.toFixed(3), r.holdBars,
    ].map(csvEscape).join(','));
  });

  // ﻿ 是 BOM：不加的话 Excel 打开中文表头是乱码
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alphagym-${S.ds}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`已导出 ${ev.rows.length} 笔交易 · 可以拖回助手重新评估`);
}
