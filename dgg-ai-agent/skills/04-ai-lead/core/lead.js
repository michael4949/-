/*
 * AI获客 · 内核
 * 输入：一家企业的成交客户、线索池、销售团队、渠道投入 + 脚本段落块库 + 模块 2 的行业痛点库
 * 计算：画像反推（各维度分布与权重、三个典型细分）→ 线索评分与解释 → 脚本组合 → 分派 → 本周跟进计划 → 漏斗与渠道 → 成交预测 → 周报
 * 画像权重、脚本采用、分派、计划都写进同一份数据副本，各屏按副本重算。
 * 确定性、离线、无网络。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM4 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var MODULE_NAME = 'AI获客';
  var CREDITS = 30;
  var DAY = 86400000;
  var DIMS = ['sector', 'role', 'size', 'region'];
  var DIM_LABEL = { sector: '行业大类', role: '决策人', size: '企业规模', region: '区域' };
  var SIZE_LABEL = { '1_20': '1–20 人', '21_50': '21–50 人', '51_100': '51–100 人', '101_300': '101–300 人', '300_plus': '300 人以上' };
  var CHANNEL_NAME = { fair: '展会扫码', inquiry: '平台询盘', web: '官网留资', wechat: '公众号', referral: '老客户转介绍', list: '名录导入' };
  var STAGE_ORDER = ['lead', 'contact', 'opp', 'quote', 'won'];
  var ACTION = { first: '首触', follow: '二次跟进', quote: '报价后跟进', wake: '沉睡唤醒', done: '转交付' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r0(n) { return Math.round(n); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function fmtN(n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtW(n) { return Math.abs(n) >= 10000 ? r1(n / 10000) + ' 万元' : fmtN(n) + ' 元'; }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dateOf(base, d) { var t = new Date(ms(base) + d * DAY); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); }
  function short(s) { var p = s.split('-'); return (+p[1]) + '-' + (+p[2]); }
  function daysBetween(a, b) { return Math.round((ms(b) - ms(a)) / DAY); }
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  function weekday(s) { return WD[new Date(ms(s)).getUTCDay()]; }
  function sizeLabel(k) { return SIZE_LABEL[k] || k; }
  function stageIdx(k) { return STAGE_ORDER.indexOf(k); }

  function ensure(raw) {
    var d = clone(raw);
    d.focusSegment = d.focusSegment || null; d.weights = d.weights || {}; d.adopted = d.adopted || {}; d.planned = d.planned || []; d.log = d.log || [];
    d.leads.forEach(function (l) { l.signals = l.signals || []; l.dormant = !!l.dormant; });
    return d;
  }

  /* ---------------- 画像反推 ---------------- */
  function profile(d, lib) {
    var deals = d.deals;
    var total = sum(deals.map(function (x) { return x.amount * (x.repeat ? 1.5 : 1); }));
    var dist = {};
    DIMS.forEach(function (dim) {
      var m = {};
      deals.forEach(function (x) { var v = x[dim]; m[v] = m[v] || { value: v, count: 0, amount: 0, weighted: 0 }; m[v].count++; m[v].amount += x.amount; m[v].weighted += x.amount * (x.repeat ? 1.5 : 1); });
      var rows = Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.weighted - a.weighted; });
      rows.forEach(function (r) { r.share = r.weighted / total; r.label = dim === 'size' ? sizeLabel(r.value) : dim === 'sector' ? ((lib.pains[r.value] || {}).name || r.value) : r.value; });
      var hhi = sum(rows.map(function (r) { return r.share * r.share; }));
      dist[dim] = { rows: rows, hhi: hhi };
    });
    // 权重：分布越集中越有预测力（HHI 归一）× 用户调整系数
    var hhiSum = sum(DIMS.map(function (k) { return dist[k].hhi; }));
    var weights = {};
    DIMS.forEach(function (k) { weights[k] = Math.min(0.4, dist[k].hhi / hhiSum); });   // 单一维度封顶 40%，全员同区域这类维度不能一家独大
    var base = sum(DIMS.map(function (k) { return weights[k]; }));
    DIMS.forEach(function (k) { weights[k] = (weights[k] / base) * (d.weights[k] != null ? d.weights[k] : 1); });
    var wsum = sum(DIMS.map(function (k) { return weights[k]; }));
    DIMS.forEach(function (k) { weights[k] = weights[k] / wsum; });
    // 其余画像指标
    var avgCycle = r0(sum(deals.map(function (x) { return x.cycleDays; })) / deals.length);
    var avgAmount = r0(sum(deals.map(function (x) { return x.amount; })) / deals.length);
    var repeatRate = deals.filter(function (x) { return x.repeat; }).length / deals.length;
    var chan = {}; deals.forEach(function (x) { chan[x.channel] = (chan[x.channel] || 0) + 1; });
    // 细分：按（行业大类 × 决策人）分组，取加权价值前三
    var groups = {};
    deals.forEach(function (x) { var k = x.sector + '|' + x.role; (groups[k] = groups[k] || { sector: x.sector, role: x.role, deals: [] }).deals.push(x); });
    var segs = Object.keys(groups).map(function (k) { var g = groups[k]; g.weighted = sum(g.deals.map(function (x) { return x.amount * (x.repeat ? 1.5 : 1); })); return g; }).sort(function (a, b) { return b.weighted - a.weighted; }).slice(0, 3);
    var segments = segs.map(function (g, i) {
      var mode = function (key, lab) { var m = {}; g.deals.forEach(function (x) { m[x[key]] = (m[x[key]] || 0) + x.amount; }); var rows = Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }); return { top: rows[0], rows: rows, label: lab ? lab(rows[0]) : rows[0] }; };
      var ind = mode('industry'), size = mode('size', sizeLabel), region = mode('region');
      var tags = (d.segmentPainTags || {})[g.sector] || [];
      var lib2 = lib.pains[g.sector] ? lib.pains[g.sector].pains : [];
      var pains = tags.map(function (t) { return lib2.filter(function (p) { return p.tag === t; })[0]; }).filter(Boolean).slice(0, 4);
      if (pains.length < 2) pains = pains.concat(lib2.slice(0, 2 - pains.length));
      var offerKeys = (d.roleOffers || {})[g.role] || d.offers.slice(0, 2).map(function (o) { return o.key; });
      var offers = offerKeys.map(function (k) { return d.offers.filter(function (o) { return o.key === k; })[0]; }).filter(Boolean);
      var proof = d.proofs.filter(function (p) { return p.sector === g.sector; })[0] || d.proofs[0];
      var vals = {}; DIMS.forEach(function (dim) { var m = {}; g.deals.forEach(function (x) { m[x[dim]] = (m[x[dim]] || 0) + x.amount * (x.repeat ? 1.5 : 1); }); var t = sum(Object.keys(m).map(function (k) { return m[k]; })); vals[dim] = {}; Object.keys(m).forEach(function (k) { vals[dim][k] = m[k] / t; }); });
      return { id: 'S' + (i + 1), name: ind.label + (ind.rows.length > 1 ? '等' : '') + ' · ' + g.role, sector: g.sector, sectorName: (lib.pains[g.sector] || {}).name || g.sector, role: g.role, industry: ind.top, industries: ind.rows.slice(0, 3), size: size.top, sizeLabel: size.label, region: region.top,
        count: g.deals.length, amount: r0(sum(g.deals.map(function (x) { return x.amount; })) / g.deals.length), cycle: r0(sum(g.deals.map(function (x) { return x.cycleDays; })) / g.deals.length), repeat: g.deals.filter(function (x) { return x.repeat; }).length / g.deals.length,
        share: g.weighted / total, topDeals: g.deals.slice().sort(function (a, b) { return b.amount - a.amount; }).slice(0, 3), pains: pains, offers: offers, proof: proof, vals: vals };
    });
    var focus = d.focusSegment && segments.filter(function (s) { return s.id === d.focusSegment; })[0] ? d.focusSegment : segments[0].id;
    return { dist: dist, weights: weights, avgCycle: avgCycle, avgAmount: avgAmount, repeatRate: r1(repeatRate * 100) / 100, channels: chan, segments: segments, focus: focus, dealCount: deals.length, totalAmount: sum(deals.map(function (x) { return x.amount; })) };
  }

  /* ---------------- 线索评分 ---------------- */
  function signalScore(lead, d, lib) {
    var latest = {};
    lead.signals.forEach(function (s) { if (!latest[s.key] || ms(s.date) > ms(latest[s.key].date)) latest[s.key] = s; });
    var parts = [];
    Object.keys(latest).forEach(function (k) {
      var def = lib.signals.signals.filter(function (x) { return x.key === k; })[0]; if (!def) return;
      var age = daysBetween(latest[k].date, d.today);
      var v = def.score * Math.max(0, 1 - age / def.decayDays);
      parts.push({ key: k, name: def.name, date: latest[k].date, age: age, score: r1(v) });
    });
    parts.sort(function (a, b) { return b.score - a.score; });
    return { score: Math.min(100, r1(sum(parts.map(function (p) { return p.score; })))), parts: parts };
  }
  function scoreLead(lead, P, seg, d, lib) {
    var W = P.weights, parts = [];
    var match = 0;
    DIMS.forEach(function (dim) {
      var v = lead[dim], share = (seg.vals[dim] && seg.vals[dim][v]) || 0;
      var pts = W[dim] * share * 100;
      match += pts;
      parts.push({ dim: dim, label: DIM_LABEL[dim], value: dim === 'size' ? sizeLabel(v) : dim === 'sector' ? ((lib.pains[v] || {}).name || v) : v, share: r0(share * 100), weight: r0(W[dim] * 100), pts: r1(pts) });
    });
    var sig = signalScore(lead, d, lib);
    var wm = lib.stages.weights.match, ws = lib.stages.weights.signal;
    var total = r0(wm * match + ws * sig.score);
    var g = lib.stages.grades, grade = total >= g.A ? 'A' : total >= g.B ? 'B' : total >= g.C ? 'C' : 'D';
    var lastAge = lead.lastAction ? daysBetween(lead.lastAction.date, d.today) : daysBetween(lead.assignedAt || lead.createdAt, d.today);
    var dormant = lead.dormant || (stageIdx(lead.stage) <= 1 && lastAge >= lib.stages.dormantDays);
    var action = lead.stage === 'won' ? 'done' : dormant ? 'wake' : lead.stage === 'quote' ? 'quote' : lead.stage === 'lead' && !lead.lastAction ? 'first' : 'follow';
    var due = lib.stages.followUpDays[grade];
    var overdue = lead.stage !== 'won' && !dormant && lastAge > due;
    return { match: r0(match), signal: sig.score, signalParts: sig.parts, total: total, grade: grade, parts: parts, action: action, actionLabel: ACTION[action], dormant: dormant, lastAge: lastAge, overdue: overdue, dueDays: due };
  }
  function leadsScored(d, P, lib) {
    var seg = P.segments.filter(function (s) { return s.id === P.focus; })[0];
    var teams = {}; d.teams.forEach(function (t) { teams[t.id] = t; });
    var rows = d.leads.map(function (l) {
      var s = scoreLead(l, P, seg, d, lib);
      var o = clone(l); Object.keys(s).forEach(function (k) { o[k] = s[k]; });
      o.channelName = CHANNEL_NAME[l.channel] || l.channel; o.sizeLabel = sizeLabel(l.size); o.stageName = lib.stages.stages[stageIdx(l.stage)].name; o.stageIdx = stageIdx(l.stage);
      o.ownerName = l.owner && teams[l.owner] ? teams[l.owner].name : null; o.planned = d.planned.indexOf(l.id) >= 0;
      o.name = l.industry + ' · ' + l.region + ' · ' + sizeLabel(l.size);
      o.company = l.industry;
      return o;
    });
    rows.sort(function (a, b) { return b.total - a.total; });
    return rows;
  }
  function explain(lead, P, d, lib) {
    var seg = P.segments.filter(function (s) { return s.id === P.focus; })[0];
    var seen = ['来源 ' + lead.channelName + ' · 建档 ' + short(lead.createdAt) + ' · 阶段 ' + lead.stageName + (lead.ownerName ? ' · 负责 ' + lead.ownerName : ' · 未分派'),
      '字段：' + lead.parts.map(function (p) { return p.label + ' ' + p.value; }).join('、'),
      lead.signalParts.length ? '行为：' + lead.signalParts.map(function (p) { return p.name + ' ' + short(p.date) + '（' + p.age + ' 天前）'; }).join('、') : '行为：暂无信号',
      lead.lastAction ? '最近动作 ' + short(lead.lastAction.date) + ' ' + lead.lastAction.text : '尚无跟进记录'];
    var reasons = ['匹配画像「' + seg.name + '」' + lead.match + ' 分：' + lead.parts.filter(function (p) { return p.share >= 30; }).map(function (p) { return p.label + '一致（该细分 ' + p.share + '% 成交客户如此，权重 ' + p.weight + '%）'; }).join('，') + (lead.parts.filter(function (p) { return p.share < 30; }).length ? '；' + lead.parts.filter(function (p) { return p.share < 30; }).map(function (p) { return p.label + '偏离'; }).join('、') : ''),
      '行为信号 ' + lead.signal + ' 分' + (lead.signalParts.length ? '：' + lead.signalParts.slice(0, 3).map(function (p) { return p.name + ' ' + p.score; }).join('、') : ''),
      '综合 ' + lead.total + ' 分 → 意向 ' + lead.grade + '，' + (lead.dormant ? '已 ' + lead.lastAge + ' 天无动作，按沉睡处理' : lead.overdue ? '距上次动作 ' + lead.lastAge + ' 天，超过 ' + lead.grade + ' 级 ' + lead.dueDays + ' 天的跟进节奏' : '跟进节奏正常')];
    return { seen: seen, reasons: reasons, action: lead.action, actionLabel: lead.actionLabel };
  }

  /* ---------------- 脚本组合 ---------------- */
  function fill(t, ctx) { return String(t).replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; }); }
  function script(d, P, lib, opt) {
    var seg = P.segments.filter(function (s) { return s.id === opt.segId; })[0] || P.segments[0];
    var ch = opt.channel || 'phone', st = opt.stage || 'first', v = opt.variant || 0;
    var S = lib.scripts, pick = function (arr) { return arr[v % arr.length]; };
    var ctx = { co: d.co, ind: seg.industry, role: seg.role, prod: d.prod, v1: seg.offers[0] ? seg.offers[0].text : '', v2: seg.offers[1] ? seg.offers[1].text : '', p1: seg.pains[0] ? seg.pains[0].text : '', p2: seg.pains[1] ? seg.pains[1].text : '', proof: seg.proof.text, proofCo: seg.proof.customer };
    var painT = S.pain[seg.role] || S.pain['默认'];
    var sections = [
      { key: 'open', title: '开场', text: fill(pick(S.open[ch][st]), ctx) },
      { key: 'pain', title: '痛点', text: fill(pick(painT), ctx) },
      { key: 'value', title: '价值', text: fill(pick(S.value), ctx) },
      { key: 'proof', title: '案例', text: fill(pick(S.proof), ctx) },
      { key: 'cta', title: '行动', text: fill(pick(S.cta[st]), ctx) + (S.ctaChannel[ch] ? ' ' + S.ctaChannel[ch] : '') }
    ];
    var objs = (S.objections[seg.role] || S.objections['默认']).map(function (o) { return { q: o.q, a: fill(pick(o.a), ctx) }; });
    var words = sum(sections.map(function (s) { return s.text.length; }));
    var key = seg.id + '|' + ch + '|' + st;
    return { segId: seg.id, segName: seg.name, channel: ch, channelName: { phone: '电话', wechat: '微信首触', fair: '展会现场', mail: '邮件' }[ch], stage: st, stageName: { first: '首触', follow: '二次跟进', quote: '报价后', wake: '沉睡唤醒' }[st], variant: v, sections: sections, objections: objs, words: words, text: sections.map(function (s) { return s.text; }).join('\n') + '\n\n异议应答：\n' + objs.map(function (o) { return '「' + o.q + '」→ ' + o.a; }).join('\n'), adopted: d.adopted[key] != null && d.adopted[key] === v, key: key };
  }

  /* ---------------- 分派与计划 ---------------- */
  function teamLoad(d, rows) {
    var load = {}; d.teams.forEach(function (t) { load[t.id] = 0; });
    rows.forEach(function (l) { if (l.owner && l.stage !== 'won' && !l.dormant) load[l.owner] = (load[l.owner] || 0) + 1; });
    return d.teams.map(function (t) { return { id: t.id, name: t.name, sectors: t.sectors, cap: t.cap, load: load[t.id] || 0, free: t.cap - (load[t.id] || 0) }; });
  }
  function recommendTeam(lead, teams) {
    var cands = teams.filter(function (t) { return t.free > 0; });
    if (!cands.length) return null;
    cands.sort(function (a, b) { var fa = a.sectors.indexOf(lead.sector) >= 0 ? 1 : 0, fb = b.sectors.indexOf(lead.sector) >= 0 ? 1 : 0; return fb - fa || (a.load / a.cap) - (b.load / b.cap) || a.id.localeCompare(b.id); });
    return cands[0];
  }
  function assign(raw, leadId, teamId) {
    var d = ensure(raw), l = d.leads.filter(function (x) { return x.id === leadId; })[0]; if (!l) return d;
    var t = d.teams.filter(function (x) { return x.id === teamId; })[0]; if (!t) return d;
    l.owner = teamId; l.assignedAt = d.today;
    d.log.push({ seq: d.log.length + 1, kind: 'assign', label: '分派', detail: leadId + ' ' + l.industry + ' → ' + t.name });
    return d;
  }
  function assignAll(raw, lib) {
    var d = ensure(raw);
    var P = profile(d, lib), rows = leadsScored(d, P, lib), teams = teamLoad(d, rows);
    var n = 0, names = [];
    rows.filter(function (l) { return !l.owner && l.stage !== 'won' && !l.dormant; }).forEach(function (l) {
      var t = recommendTeam(l, teams); if (!t) return;
      var src = d.leads.filter(function (x) { return x.id === l.id; })[0]; src.owner = t.id; src.assignedAt = d.today; t.load++; t.free--; n++; names.push(l.id + ' → ' + t.name);
    });
    if (n) d.log.push({ seq: d.log.length + 1, kind: 'assign', label: '一键分派', detail: n + ' 条线索按行业熟悉度与负载分派：' + names.slice(0, 4).join('、') + (n > 4 ? ' 等' : '') });
    return d;
  }
  function addPlan(raw, leadId) { var d = ensure(raw); if (d.planned.indexOf(leadId) < 0) { d.planned.push(leadId); var l = d.leads.filter(function (x) { return x.id === leadId; })[0]; d.log.push({ seq: d.log.length + 1, kind: 'plan', label: '加入本周计划', detail: leadId + ' ' + (l ? l.industry : '') }); } return d; }
  function markDormant(raw, leadId) { var d = ensure(raw); var l = d.leads.filter(function (x) { return x.id === leadId; })[0]; if (l) { l.dormant = true; d.log.push({ seq: d.log.length + 1, kind: 'dormant', label: '标记沉睡', detail: leadId + ' ' + l.industry }); } return d; }
  function advance(raw, leadId, text) {
    var d = ensure(raw); var l = d.leads.filter(function (x) { return x.id === leadId; })[0]; if (!l || l.stage === 'won') return d;
    var i = stageIdx(l.stage); l.stage = STAGE_ORDER[Math.min(i + 1, 4)]; l.lastAction = { date: d.today, text: text || '推进到' + STAGE_ORDER[l.stage] }; l.dormant = false;
    if (l.stage === 'won') l.closedAt = d.today;
    d.log.push({ seq: d.log.length + 1, kind: 'advance', label: '推进阶段', detail: leadId + ' ' + l.industry + ' → ' + l.stage });
    return d;
  }
  function logAction(raw, leadId, text) { var d = ensure(raw); var l = d.leads.filter(function (x) { return x.id === leadId; })[0]; if (l) { l.lastAction = { date: d.today, text: text }; l.dormant = false; if (l.stage === 'lead') l.stage = 'contact'; d.log.push({ seq: d.log.length + 1, kind: 'action', label: '记录跟进', detail: leadId + ' ' + text }); } return d; }
  function setFocus(raw, segId) { var d = ensure(raw); d.focusSegment = segId; d.log.push({ seq: d.log.length + 1, kind: 'focus', label: '切换重点细分', detail: segId }); return d; }
  function setWeight(raw, dim, mul) { var d = ensure(raw); d.weights[dim] = mul; return d; }
  function adoptScript(raw, key, variant) { var d = ensure(raw); d.adopted[key] = variant; d.log.push({ seq: d.log.length + 1, kind: 'script', label: '采用脚本', detail: key.replace(/\|/g, ' · ') + ' 第 ' + (variant + 1) + ' 版' }); return d; }

  function plan(d, rows, lib) {
    // 本周计划：今天起 5 个工作日；已加入计划的优先，其次 A/B 级与逾期；每组每天最多 5 条
    var days = []; var t = 0; while (days.length < 5) { var ds = dateOf(d.today, t); if (weekday(ds) !== '日' && weekday(ds) !== '六') days.push({ date: ds, label: short(ds) + ' 周' + weekday(ds), items: [] }); t++; }
    var cand = rows.filter(function (l) { return l.owner && l.stage !== 'won' && !l.dormant && (l.planned || l.grade === 'A' || l.grade === 'B' || l.overdue); });
    cand.sort(function (a, b) { return (b.planned ? 1 : 0) - (a.planned ? 1 : 0) || (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || b.total - a.total; });
    var perDay = {}, seq = {};
    var items = [];
    cand.forEach(function (l) {
      // 各组按顺序摊到 5 天：每天先放 3 条，A 级与逾期排前面；满 5 条再往后推
      var n = seq[l.owner] || 0; seq[l.owner] = n + 1;
      var start = Math.min(4, Math.floor(n / 3)), placedDay = null;
      for (var i = start; i < days.length; i++) { var k = days[i].date + '|' + l.owner; if ((perDay[k] || 0) < 5) { perDay[k] = (perDay[k] || 0) + 1; placedDay = i; break; } }
      if (placedDay == null) return;
      var adoptedKey = Object.keys(d.adopted).filter(function (k) { return k.split('|')[2] === l.action; })[0];
      var CHN = { phone: '电话', wechat: '微信首触', fair: '展会现场', mail: '邮件' }, STN = { first: '首触', follow: '二次跟进', quote: '报价后', wake: '沉睡唤醒' };
      var ak = adoptedKey ? adoptedKey.split('|') : null;
      var it = { date: days[placedDay].date, leadId: l.id, name: l.name, owner: l.owner, ownerName: l.ownerName, grade: l.grade, action: l.action, actionLabel: l.actionLabel, overdue: l.overdue, planned: l.planned, amountEst: l.amountEst, script: ak ? ak[0] + ' · ' + CHN[ak[1]] + ' · ' + STN[ak[2]] + '脚本' : null };
      days[placedDay].items.push(it); items.push(it);
    });
    var overdueList = rows.filter(function (l) { return l.overdue && l.owner; }).sort(function (a, b) { return b.lastAge - a.lastAge; });
    var unassigned = rows.filter(function (l) { return !l.owner && l.stage !== 'won' && !l.dormant; });
    return { days: days, items: items, overdue: overdueList, unassigned: unassigned, byTeam: d.teams.map(function (tm) { return { id: tm.id, name: tm.name, count: items.filter(function (i) { return i.owner === tm.id; }).length }; }) };
  }

  /* ---------------- 漏斗、渠道、预测 ---------------- */
  function funnel(d, rows, lib) {
    var st = lib.stages.stages;
    var reach = st.map(function (s, i) { return rows.filter(function (l) { return l.stageIdx >= i; }).length; });
    var stages = st.map(function (s, i) { return { key: s.key, name: s.name, count: reach[i], rate: i ? (reach[i - 1] ? r0(100 * reach[i] / reach[i - 1]) : 0) : null, prob: s.prob }; });
    var chans = lib.channels.channels.map(function (c) {
      var ls = rows.filter(function (l) { return l.channel === c.id; });
      var ds = d.deals.filter(function (x) { return x.channel === c.id; });
      var cost = (d.channelCosts || {})[c.id]; if (cost == null) cost = c.costMonthly;
      var recent = ls.filter(function (l) { return daysBetween(l.createdAt, d.today) <= 30; }).length;
      return { id: c.id, name: c.name, kind: c.kind, leads: ls.length, recent: recent, gradeA: ls.filter(function (l) { return l.grade === 'A'; }).length, deals12: ds.length, dealAmount: sum(ds.map(function (x) { return x.amount; })), cost: cost, costPerLead: recent ? r0(cost / recent) : null, costPerDeal: ds.length ? r0(cost * 12 / ds.length) : null };
    }).sort(function (a, b) { return b.leads - a.leads; });
    return { stages: stages, channels: chans };
  }
  function forecast(d, rows, lib) {
    var st = {}; lib.stages.stages.forEach(function (s) { st[s.key] = s.prob; });
    var open = rows.filter(function (l) { return l.stage !== 'won' && !l.dormant; });
    var byTeam = d.teams.map(function (t) { var ls = open.filter(function (l) { return l.owner === t.id; }); return { id: t.id, name: t.name, count: ls.length, expected: r0(sum(ls.map(function (l) { return st[l.stage] * l.amountEst; }))), pipeline: sum(ls.map(function (l) { return l.amountEst; })) }; });
    var byStage = lib.stages.stages.slice(0, 4).map(function (s) { var ls = open.filter(function (l) { return l.stage === s.key; }); return { key: s.key, name: s.name, count: ls.length, pipeline: sum(ls.map(function (l) { return l.amountEst; })), expected: r0(sum(ls.map(function (l) { return s.prob * l.amountEst; }))) }; });
    return { expected: r0(sum(open.map(function (l) { return st[l.stage] * l.amountEst; }))), pipeline: sum(open.map(function (l) { return l.amountEst; })), count: open.length, byTeam: byTeam, byStage: byStage, expectedDeals: r1(sum(open.map(function (l) { return st[l.stage]; }))) };
  }
  function kpi(d, rows, P, fn, fc, lib) {
    var open = rows.filter(function (l) { return l.stage !== 'won'; });
    var newWeek = rows.filter(function (l) { return ms(l.createdAt) >= ms(d.weekStart); }).length;
    var wonMonth = rows.filter(function (l) { return l.stage === 'won' && l.closedAt && l.closedAt.slice(0, 7) === d.today.slice(0, 7); }).length;
    var dealsMonth = d.deals.filter(function (x) { return x.closedAt.slice(0, 7) === d.today.slice(0, 7); }).length;
    var recent30 = rows.filter(function (l) { return daysBetween(l.createdAt, d.today) <= 30; }).length;
    var costAll = sum(lib.channels.channels.map(function (c) { var v = (d.channelCosts || {})[c.id]; return v == null ? c.costMonthly : v; }));
    var deals90 = d.deals.filter(function (x) { return daysBetween(x.closedAt, d.today) <= 90; }).length;
    return { leads: open.length, newWeek: newWeek, gradeA: open.filter(function (l) { return l.grade === 'A'; }).length, gradeB: open.filter(function (l) { return l.grade === 'B'; }).length, following: open.filter(function (l) { return l.owner && l.stageIdx >= 1 && !l.dormant; }).length, unassigned: open.filter(function (l) { return !l.owner && !l.dormant; }).length, overdue: open.filter(function (l) { return l.overdue && l.owner; }).length, dormant: open.filter(function (l) { return l.dormant; }).length,
      wonMonth: wonMonth + dealsMonth, conversion: rows.length ? r1(100 * (rows.filter(function (l) { return l.stageIdx >= 2; }).length) / rows.length) : 0, avgCycle: P.avgCycle, costPerLead: recent30 ? r0(costAll / recent30) : 0, expected: fc.expected, pipeline: fc.pipeline, deals90: deals90 };
  }
  function report(d, rows, P, fn, fc, pl, k, lib) {
    var seg = P.segments.filter(function (s) { return s.id === P.focus; })[0];
    var lines = [];
    lines.push('【获客周报】' + short(d.weekStart) + ' 周 · ' + d.company);
    lines.push('线索 ' + k.leads + ' 条：本周新增 ' + k.newWeek + ' · A 级 ' + k.gradeA + ' · B 级 ' + k.gradeB + ' · 跟进中 ' + k.following + ' · 未分派 ' + k.unassigned + ' · 逾期 ' + k.overdue + ' · 沉睡 ' + k.dormant);
    lines.push('漏斗：' + fn.stages.map(function (s) { return s.name + ' ' + s.count; }).join(' → ') + '；商机转化率 ' + k.conversion + '%');
    lines.push('重点画像「' + seg.name + '」：' + seg.sizeLabel + ' · ' + seg.region + ' · 客单 ' + fmtW(seg.amount) + ' · 周期 ' + seg.cycle + ' 天 · 复购 ' + r0(seg.repeat * 100) + '%');
    lines.push('成交预测：在手 ' + fc.count + ' 条 · 管道 ' + fmtW(fc.pipeline) + ' · 按阶段加权 ' + fmtW(fc.expected) + '（约 ' + fc.expectedDeals + ' 单）');
    lines.push('渠道：' + fn.channels.slice(0, 4).map(function (c) { return c.name + ' ' + c.leads + ' 条' + (c.costPerLead != null ? '（' + fmtN(c.costPerLead) + ' 元/条）' : ''); }).join(' · '));
    lines.push('本周计划 ' + pl.items.length + ' 次跟进：' + pl.byTeam.filter(function (t) { return t.count; }).map(function (t) { return t.name + ' ' + t.count; }).join(' · ') + (pl.overdue.length ? '；逾期待补：' + pl.overdue.slice(0, 3).map(function (l) { return l.id + ' ' + l.industry; }).join('、') : ''));
    if (d.log.length) lines.push('本周动作：' + d.log.map(function (l) { return l.label; }).join('；'));
    var todo = [];
    pl.unassigned.slice(0, 3).forEach(function (l) { todo.push(l.id + ' ' + l.industry + '：待分派（' + l.grade + ' 级）'); });
    pl.overdue.slice(0, 3).forEach(function (l) { todo.push(l.id + ' ' + l.industry + '：' + l.actionLabel + '，已 ' + l.lastAge + ' 天'); });
    if (todo.length) lines.push('待办：' + todo.join('；'));
    return { lines: lines, text: lines.join('\n'), todo: todo };
  }

  function run(raw, lib) {
    var d = ensure(raw);
    var P = profile(d, lib);
    var rows = leadsScored(d, P, lib);
    var byId = {}; rows.forEach(function (l) { byId[l.id] = l; });
    var fn = funnel(d, rows, lib), fc = forecast(d, rows, lib), pl = plan(d, rows, lib), teams = teamLoad(d, rows);
    var k = kpi(d, rows, P, fn, fc, lib);
    var rep = report(d, rows, P, fn, fc, pl, k, lib);
    return { version: VERSION, data: d, profile: P, leads: rows, byId: byId, funnel: fn, forecast: fc, plan: pl, teams: teams, kpi: k, report: rep };
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, DIMS: DIMS, DIM_LABEL: DIM_LABEL, CHANNEL_NAME: CHANNEL_NAME, ACTION: ACTION, STAGE_ORDER: STAGE_ORDER,
    ensure: ensure, profile: profile, leadsScored: leadsScored, explain: explain, script: script, run: run,
    assign: assign, assignAll: assignAll, addPlan: addPlan, markDormant: markDormant, advance: advance, logAction: logAction, setFocus: setFocus, setWeight: setWeight, adoptScript: adoptScript,
    recommendTeam: recommendTeam, teamLoad: teamLoad, fmtN: fmtN, fmtW: fmtW, short: short, sizeLabel: sizeLabel, weekday: weekday, dateOf: dateOf
  };
});
