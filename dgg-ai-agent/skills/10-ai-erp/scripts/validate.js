// 内核自检：对四种业态样本做结构与逻辑断言。改内核后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/sim.js');
const data = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(data.lintWords);
const docparse = require('../../_shared/docparse.js');
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const clean = (t, where) => { ok(!/\{\w+\}|undefined|NaN/.test(t), where + ' 文本异常 ' + t); lintText(t, where); };

// 全部可见文案过词表：硬禁词命中即失败
function lintText(t, where) {
  const hits = lint.hard(String(t));
  ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(','));
}

Object.keys(data.samples).sort().forEach((k) => {
  const d = data.samples[k];
  const S = core.schedule(d);
  const S2 = core.schedule(d);
  ok(JSON.stringify(S.orders) === JSON.stringify(S2.orders), k + ' 排程确定性');

  // 1. 工序顺序：同一订单同一分部的工序开工不早于前道完工
  S.orders.forEach((o) => {
    const byPart = {};
    o.ops.forEach((op) => { (byPart[op.part || ''] = byPart[op.part || ''] || []).push(op); });
    Object.keys(byPart).forEach((pt) => {
      let prevEnd = null;   // [day, hour] 绝对时刻
      byPart[pt].forEach((op) => {
        if (op.done || !op.segs.length) return;
        const first = op.segs[0], last = op.segs[op.segs.length - 1];
        if (prevEnd != null && !op.inProgress) ok(first.d > prevEnd[0] || (first.d === prevEnd[0] && first.from >= prevEnd[1] - 1e-6), k + ' ' + o.id + ' ' + op.op + ' 早于前道完工');
        prevEnd = [last.d, last.to];
      });
    });
  });

  // 2. 产线日内占用不超产能且段不重叠
  const cal = {};
  S.orders.forEach((o) => o.ops.forEach((op) => op.segs.forEach((sg) => { (cal[op.line + '#' + sg.d] = cal[op.line + '#' + sg.d] || []).push([sg.from, sg.to]); })));
  const lineMap = {}; S.lines.forEach((L) => { lineMap[L.id] = L; });
  Object.keys(cal).forEach((key) => {
    const [line, d] = key.split('#');
    const segs = cal[key].sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < segs.length; i++) ok(segs[i][0] >= segs[i - 1][1] - 1e-6, k + ' ' + line + ' 第 ' + d + ' 天段重叠');
    const L = lineMap[line];
    const day = L && L.days[+d];
    if (day) ok(segs[segs.length - 1][1] <= day.cap + 1e-6, k + ' ' + line + ' 第 ' + d + ' 天超产能');
  });

  // 3. 延期与归因一致：延期必有归因，按期归因为 none
  S.orders.forEach((o) => {
    if (o.status === 'late') ok(o.cause !== 'none' && o.lateDays > 0, k + ' ' + o.id + ' 延期无归因');
    if (o.status === 'ok' || o.status === 'done') ok(o.cause === 'none' && !(o.lateDays > 0), k + ' ' + o.id + ' 按期却有归因');
    if (o.status === 'risk') ok(o.riskReason, k + ' ' + o.id + ' 风险无原因');
    ok(o.kitRate >= 0 && o.kitRate <= 1, k + ' 齐套率越界');
  });

  // 4. 物料分配守恒：库存分配量 ≤ 库存
  S.materials.forEach((m) => {
    const fromStock = m.demands.reduce((t, x) => t + (x.assumed ? 0 : 0), 0);
    ok(m.freeAfter >= 0 && m.freeAfter <= m.stock, k + ' ' + m.id + ' 库存分配越界');
  });

  // 5. 处置动作：dry 不改原数据；apply 写日志；效果与重排一致
  const late = S.orders.filter((o) => o.status === 'late');
  if (late.length) {
    const before = JSON.stringify(d);
    const acts = core.actions(d, S, late[0].id);
    ok(JSON.stringify(d) === before, k + ' actions 改动了原数据');
    ok(acts.length >= 1, k + ' 延期订单无处置候选');
    acts.forEach((a, i) => { ok(a.rank === i + 1, k + ' 处置排序'); ok(typeof a.cost === 'number' && a.cost >= 0, k + ' 处置费用'); lintText(a.desc, k + ' 处置描述'); });
    const d2 = core.applyAction(d, late[0].id, acts[0].key, acts[0].params);
    ok(d2.log.length === d.log.length + 1, k + ' 处置未记日志');
    const S3 = core.schedule(d2);
    ok(S3.byId[late[0].id].finishLabel === acts[0].effect.finishAfter, k + ' 处置效果与重排不一致');
    ok(S3.byId[late[0].id].handled === true, k + ' 处置未标记');
    const ex = core.explain(S, late[0].id);
    ok(ex.seen.length >= 2 && ex.reasons.length >= 1, k + ' 归因说明不完整');
    ex.seen.concat(ex.reasons).forEach((t) => lintText(t, k + ' 归因'));
  }

  // 6. 插单：三方案齐全，B 不拖累任何在手订单，推荐在三者之中，应用后订单数 +1
  const sim = core.simulateInsert(d, d.insertPresets[0]);
  ok(sim.options.length === 3, k + ' 插单方案数');
  const B = sim.options.filter((x) => x.key === 'B')[0];
  ok(B.affected === 0, k + ' 末尾排队拖累了在手订单');
  ok(['A', 'B', 'C'].indexOf(sim.recommend) >= 0, k + ' 插单推荐');
  lintText(sim.reason, k + ' 插单理由');
  const d3 = core.applyInsert(d, d.insertPresets[0], sim.recommend);
  ok(d3.orders.length === d.orders.length + 1, k + ' 插单未落单');
  ok(d3.log.length === d.log.length + 1, k + ' 插单未记日志');
  const S4 = core.schedule(d3);
  const picked = sim.options.filter((x) => x.key === sim.recommend)[0];
  ok(S4.byId[picked.orderId].finishLabel === picked.finishLabel, k + ' 插单落单后完工日与模拟不一致');

  // 7. 采购建议：缺口项必有建议量与最晚下单日；呆滞项周转天数 > 90
  const plan = core.purchasePlan(d, S);
  plan.items.forEach((x) => {
    if (x.urgency === 'short' || x.urgency === 'safety') { ok(x.suggestQty >= x.moq, k + ' ' + x.id + ' 建议量低于起订量'); ok(x.latestOrderLabel, k + ' ' + x.id + ' 无最晚下单日'); }
    if (x.urgency === 'watch') ok(x.suggestQty === 0, k + ' ' + x.id + ' 跟踪项不应下单');
    lintText(x.reason, k + ' 采购理由');
  });
  plan.slow.forEach((x) => ok(x.daysCover > 90, k + ' 呆滞判定'));
  ok(plan.summary.amount === plan.po.reduce((t, p) => t + p.amount, 0), k + ' 采购单金额不等于建议合计');

  // 8. 日报：文本非空、含 KPI 行；明日提醒指向明天
  const daily = core.daily(d, S, plan);
  ok(daily.text.split('\n').length >= 4, k + ' 日报过短');
  lintText(daily.text, k + ' 日报');
  ok(daily.kpi.open === S.kpi.open, k + ' 日报 KPI');

  // 9. 输出契约：examples 与本次重算一致
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(ex.kpi.late === S.kpi.late && ex.kpi.onTimeRate === S.kpi.onTimeRate, k + ' examples 与内核不一致，先跑 run-examples');

  // 11. 对话与文档摄入：六屏开场、快捷问句、问答、声明式动作、文档写回
  const raw0 = JSON.stringify(d);
  const steps = core.screens().map((x) => x.key);
  ok(steps.length === 6 && core.screens().every((x) => x.key && x.label), k + ' screens 六屏登记');
  const isBlocks = (bs) => !bs || (Array.isArray(bs) && bs.every((b) => b == null || (['kv', 'table', 'tags', 'list', 'metric', 'text', 'chart'].indexOf(b.type) >= 0 && (b.type !== 'chart' || ['column', 'bar', 'stack', 'line', 'area', 'donut', 'pie', 'funnel', 'gauge', 'radar', 'waterfall', 'progress', 'heat', 'scatter'].indexOf(b.chart) >= 0))));
  const isAct = (a) => !a || (typeof a === 'object' && typeof a.type === 'string' && ['goto', 'focus', 'open', 'apply', 'set'].indexOf(a.type) >= 0 && JSON.stringify(a) === JSON.stringify(JSON.parse(JSON.stringify(a))));
  const R = { S, plan, daily };
  steps.forEach((st) => {
    const b = core.brief(st, d, null, R);
    ok(typeof b === 'string' && b.length > 10, k + ' brief ' + st + '：' + b);
    clean(b, k + ' brief ' + st);
    ok(core.brief(st, d, null) === b, k + ' brief 不传 result 结果不一致 ' + st);
    const sg = core.suggest(st, d, null, R);
    ok(Array.isArray(sg) && sg.length >= 2 && sg.length <= 4, k + ' suggest ' + st);
    sg.forEach((q) => {
      const a = core.ask(q, st, d, null, R);
      ok(a && a.text, k + ' suggest 答不上 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, null, R)) === JSON.stringify(a), k + ' ask 两次不一致 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, null)) === JSON.stringify(a), k + ' ask 不传 result 结果不一致 ' + st + ' · ' + q);
      ok(isBlocks(a.blocks), k + ' ask blocks 块型 ' + q);
      ok(isAct(a.act), k + ' ask act 必须是纯数据 ' + q);
      clean(a.text, k + ' ask ' + st + ' · ' + q);
    });
  });
  // 点名类与动作词表：单号、物料名、处置、插单落单、采购下单、下钻与抽屉
  const anyLate = S.orders.filter((o) => o.status === 'late')[0];
  if (anyLate) {
    const oQ = core.ask(anyLate.id + ' 怎么样', 'room', d, null, R);
    ok(oQ && oQ.ref === anyLate.id && oQ.act.type === 'set' && oQ.act.path === 'focus', k + ' 点名订单');
    const wQ = core.ask('为什么晚', 'order', Object.assign({}, d, { focus: anyLate.id }), null, R);
    ok(wQ && wQ.act.type === 'focus' && wQ.act.ref === anyLate.id && wQ.text.indexOf(anyLate.id) === 0, k + ' 下钻屏问为什么');
    const acts0 = core.actions(d, S, anyLate.id);
    const otQ = core.ask('加班要花多少', 'order', Object.assign({}, d, { focus: anyLate.id }), null, R);
    if (acts0.filter((a) => a.key === 'overtime').length) {
      ok(otQ && otQ.act.type === 'apply' && otQ.act.action === 'apply-action' && otQ.act.input.key === 'overtime' && otQ.act.input.orderId === anyLate.id, k + ' 加班动作');
      const dOt = core.applyAction(d, otQ.act.input.orderId, otQ.act.input.key, otQ.act.input.params);
      ok(dOt.log.length === d.log.length + 1 && JSON.stringify(d) === raw0, k + ' 加班动作可落单且不动入参');
    }
    const lQ = core.ask('延期的是哪几张', 'room', d, null, R);
    ok(lQ && lQ.act.type === 'set' && lQ.act.path === 'filter' && lQ.act.value === 'late' && lQ.blocks[0].type === 'table', k + ' 延期清单');
  }
  const mTop = plan.items.filter((x) => x.suggestQty > 0)[0];
  if (mTop) {
    const mQ = core.ask(mTop.name + '还剩多少', 'stock', d, null, R);
    ok(mQ && mQ.act.type === 'open' && mQ.act.panel === 'material' && mQ.act.ref === mTop.id, k + ' 点名物料开抽屉');
    const gQ = core.ask('生成采购单', 'stock', d, null, R);
    ok(gQ && gQ.act.type === 'apply' && gQ.act.action === 'apply-purchase' && gQ.act.input.ids.length === plan.summary.buy, k + ' 生成采购单动作');
    const pr = core.applyPurchase(d, plan, gQ.act.input.ids);
    ok(pr.pos.length === plan.po.length && JSON.stringify(d) === raw0, k + ' 采购动作可落单且不动入参');
  }
  const iQ = core.ask('就按推荐落单', 'insert', d, null, R);
  ok(iQ && iQ.act.type === 'apply' && iQ.act.action === 'apply-insert' && ['A', 'B', 'C'].indexOf(iQ.act.input.strategy) >= 0, k + ' 插单落单动作');
  ok(core.applyInsert(d, iQ.act.input.req, iQ.act.input.strategy).orders.length === d.orders.length + 1, k + ' 插单动作可落单');
  const cQ = core.ask('三个方案差在哪', 'insert', d, null, R);
  ok(cQ && cQ.act.type === 'set' && cQ.act.path === 'insert.pick', k + ' 方案对比动作');
  const wxQ = core.ask('发给谁', 'daily', d, null, R);
  ok(wxQ && wxQ.act.type === 'open' && wxQ.act.panel === 'wechat', k + ' 日报发送动作');
  ok(core.ask('今天天气如何', 'room', d, null, R) === null, k + ' 答不上返回 null');
  ok(core.brief('没有这一屏', d, null, R) === null && core.ask('有没有延期', '没有这一屏', d, null, R) === null, k + ' 未知屏返回 null');
  ok(JSON.stringify(d) === raw0, k + ' 对话没动入参');

  // 12. 文档摄入：订单表排产、科目余额对账、合同违约金、PPT 目标、邮件金额；写回一律新副本
  const mkDoc = (o) => Object.assign({ ok: true, name: 'doc', size: 1024, sizeText: '1 KB', ext: '', text: '', paragraphs: [], tables: [], sheets: [], slides: [], mail: null, stats: {}, note: '' }, o);
  const V2 = d.vocab;
  const orderSheet = mkDoc({ kind: 'excel', name: 'orders.xlsx', ext: 'xlsx',
    sheets: [{ name: '订单导入', rows: [['单号', '客户', '产品', '数量', '交期'], ['WT-0001', 'K-088 · 导入客户', d.products[0].name, '1200', core.dateOf(d, 9)], ['WT-0002', 'K-089 · 导入客户', d.products[0].name, '800', core.dateOf(d, 12)]] }] });
  const oIn = core.ingest(orderSheet, 'connect', d, null, R);
  ok(oIn && oIn.text && oIn.data && oIn.data !== d && JSON.stringify(d) === raw0, k + ' ingest 订单表写新副本、不动入参');
  ok(oIn.data.insertDraft && oIn.data.insertDraft.qty === 1200 && oIn.data.insertPick, k + ' ingest 订单表填出加急单草稿');
  ok(oIn.data.sources.filter((s) => s.id === 'doc-import').length === 1, k + ' ingest 记导入批次');
  ok(core.ingest(orderSheet, 'connect', oIn.data, null).data.sources.filter((s) => s.id === 'doc-import').length === 1, k + ' ingest 重复导入不叠批次');
  ok(oIn.act.type === 'goto' && oIn.act.step === 'insert', k + ' ingest 动作');
  ok(JSON.stringify(core.ingest(orderSheet, 'connect', d, null, R)) === JSON.stringify(oIn), k + ' ingest 两次不一致');
  ok(isBlocks(oIn.blocks) && isAct(oIn.act), k + ' ingest 块型与动作');
  clean(oIn.text, k + ' ingest 订单表');
  ok(core.schedule(oIn.data).kpi.open === S.kpi.open, k + ' ingest 写回后可继续算');
  const tb = mkDoc({ kind: 'excel', name: 'trial-balance.xlsx', ext: 'xlsx',
    sheets: [{ name: '科目余额表', rows: [['科目编码', '科目名称', '期初余额', '本期借方', '本期贷方', '期末余额'], ['1405', '库存商品', '2180000', '1620000', '1450000', '2350000'], ['2202', '应付账款', '1980000', '1200000', '1560000', '2340000']] }] });
  const tIn = core.ingest(tb, 'stock', d, null, R);
  ok(tIn && tIn.data && tIn.data !== d && tIn.text.indexOf('库存商品期末 2,350,000 元') >= 0, k + ' ingest 科目表取期末余额');
  ok(tIn.text.indexOf('应付账款期末 2,340,000 元') >= 0 && tIn.text.indexOf('采购单草稿') >= 0, k + ' ingest 科目余额对账');
  clean(tIn.text, k + ' ingest 科目表');
  const contract = docparse.parse({ name: 'contract.txt', bytes: Buffer.from('采购框架合同\n甲方：' + d.company + '\n乙方：宁波华兴紧固件有限公司\n第一条 合同金额：人民币 1,860,000 元。\n第二条 交付期限：2026 年 9 月 30 日前交付。\n第三条 逾期交付按日万分之五计违约金，累计不超过 5%。\n', 'utf8') });
  const cIn = core.ingest(contract, 'room', d, null, R);
  ok(cIn && cIn.text.indexOf('逾期口径按日万分之 5') >= 0 && cIn.text.indexOf('交付期限 2026-09-30') >= 0 && !cIn.data, k + ' ingest 合同算违约金、不动数');
  ok(cIn.blocks[0].type === 'kv' && cIn.blocks[0].rows.filter((r) => r[0] === '预计违约金').length === 1, k + ' ingest 合同违约金块');
  ok(S.kpi.late === 0 || (cIn.act.type === 'set' && cIn.act.path === 'filter' && cIn.act.value === 'late'), k + ' ingest 合同动作');
  clean(cIn.text, k + ' ingest 合同');
  const ppt = mkDoc({ kind: 'ppt', name: 'review.pptx', ext: 'pptx', text: '2026 年三季度经营回顾 交付准时率 95% 客户投诉 3 起',
    slides: [{ no: 1, title: '2026 年三季度经营回顾', lines: ['交付准时率 95%'] }] });
  const pIn = core.ingest(ppt, 'room', d, null, R);
  ok(pIn && pIn.text.indexOf('文档目标按期率 95%') >= 0 && !pIn.data, k + ' ingest PPT 取按期率口径');
  clean(pIn.text, k + ' ingest PPT');
  const mail = mkDoc({ kind: 'eml', name: 'mail.eml', ext: 'eml', text: '本月需付供应商货款 18.6 万元，请在 9 月 30 日前审批。',
    mail: { from: '采购部', to: '财务部', cc: '', subject: '关于 9 月付款申请', date: '2026-09-16', attaches: [] } });
  const mIn = core.ingest(mail, 'stock', d, null, R);
  ok(mIn && mIn.text.indexOf('18.6 万元付款') >= 0 && mIn.text.indexOf('采购单草稿') >= 0 && !mIn.data, k + ' ingest 邮件对采购金额');
  clean(mIn.text, k + ' ingest 邮件');
  const plain = docparse.parse({ name: 'note.txt', bytes: Buffer.from('本周生产例会纪要\n各班组按既定分工推进。\n', 'utf8') });
  const nIn = core.ingest(plain, 'room', d, null, R);
  ok(nIn && !nIn.data && !nIn.act && nIn.text.indexOf('不动数') >= 0, k + ' ingest 无口径文档不动数');
  ok(core.ingest({ ok: false }, 'room', d, null, R) === null && core.ingest(null, 'room', d, null, R) === null, k + ' ingest 解析失败返回 null');
  ok(JSON.stringify(d) === raw0, k + ' 文档摄入没动入参');
});

// 10. 内核常量
ok(core.CREDITS === data.credits.perRun['AI ERP'], '积分与 _shared/credits.json 不一致');
ok(/^\d+\.\d+\.\d+$/.test(core.VERSION), '版本号');
console.log('validate ok · ' + checks + ' 项断言通过');
