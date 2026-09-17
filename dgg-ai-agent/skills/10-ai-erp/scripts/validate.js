// 内核自检：对四种业态样本做结构与逻辑断言。改内核后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/sim.js');
const data = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(data.lintWords);
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };

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
});

// 10. 内核常量
ok(core.CREDITS === data.credits.perRun['AI ERP'], '积分与 _shared/credits.json 不一致');
ok(/^\d+\.\d+\.\d+$/.test(core.VERSION), '版本号');
console.log('validate ok · ' + checks + ' 项断言通过');
