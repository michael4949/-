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

  var VERSION = '1.2.0';
  var MODULE_NAME = 'AI获客';
  var CREDITS = 30;
  var DAY = 86400000;
  var DIMS = ['sector', 'role', 'size', 'region'];
  var DIM_LABEL = { sector: '行业大类', role: '决策人', size: '企业规模', region: '区域' };
  var SIZE_LABEL = { '1_20': '1–20 人', '21_50': '21–50 人', '51_100': '51–100 人', '101_300': '101–300 人', '300_plus': '300 人以上' };
  var CHANNEL_NAME = { fair: '展会扫码', inquiry: '平台询盘', web: '官网留资', wechat: '公众号', referral: '老客户转介绍', list: '名录导入' };
  var CHAN_ORDER = ['fair', 'inquiry', 'web', 'wechat', 'referral', 'list'];
  var STAGE_ORDER = ['lead', 'contact', 'opp', 'quote', 'won'];
  var ACTION = { first: '首触', follow: '二次跟进', quote: '报价后跟进', wake: '沉睡唤醒', done: '转交付' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r0(n) { return Math.round(n); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function fmtN(n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtW(n) { return Math.abs(n) >= 10000 ? r1(n / 10000) + ' 万元' : fmtN(n) + ' 元'; }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  /* 纯算术的公历换算：不碰系统时钟，日期一律从数据里的 today 起算 */
  function civil(z) {
    z += 719468;
    var era = Math.floor(z / 146097), doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var y = yoe + era * 400, doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153), dd = doy - Math.floor((153 * mp + 2) / 5) + 1;
    var mm = mp + (mp < 10 ? 3 : -9);
    return [y + (mm <= 2 ? 1 : 0), mm, dd];
  }
  function dateOf(base, d) { var c = civil(Math.round(ms(base) / DAY) + d); return c[0] + '-' + String(c[1]).padStart(2, '0') + '-' + String(c[2]).padStart(2, '0'); }
  function short(s) { var p = s.split('-'); return (+p[1]) + '-' + (+p[2]); }
  function daysBetween(a, b) { return Math.round((ms(b) - ms(a)) / DAY); }
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  function weekday(s) { return WD[((Math.round(ms(s) / DAY) % 7) + 11) % 7]; }
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

  /* ---------------- 对话：六屏登记、开场、快捷问句、问答、文档摄入 ---------------- */
  var SCREENS = [{ key: 'connect', label: '接入' }, { key: 'board', label: '获客驾驶舱' }, { key: 'profile', label: '客户画像' },
    { key: 'script', label: '话术脚本' }, { key: 'leads', label: '线索池' }, { key: 'plan', label: '跟进与周报' }];
  var CHN = { phone: '电话', wechat: '微信首触', fair: '展会现场', mail: '邮件' };
  var STN = { first: '首触', follow: '二次跟进', quote: '报价后', wake: '沉睡唤醒' };
  var COLMAP = [
    { key: 'industry', words: ['企业', '公司', '客户', '厂商', '单位'] },
    { key: 'sector', words: ['行业'] },
    { key: 'region', words: ['区域', '地区', '省份', '城市'] },
    { key: 'size', words: ['规模', '人数'] },
    { key: 'role', words: ['职务', '岗位', '角色', '决策人'] },
    { key: 'channel', words: ['来源', '渠道'] },
    { key: 'amountEst', words: ['金额', '预算', '预计', '年采购'] }
  ];

  function screens() { return clone(SCREENS); }
  function got(data, lib, result) { return result && result.leads && result.profile && result.kpi ? result : run(data, lib); }
  function segOf(P) { return P.segments.filter(function (s) { return s.id === P.focus; })[0]; }
  function openOf(R) { return R.leads.filter(function (l) { return l.stage !== 'won' && !l.dormant; }); }
  function hit(q, words) { for (var i = 0; i < words.length; i++) if (q.indexOf(words[i]) >= 0) return true; return false; }
  function bTable(head, rows) { return { type: 'table', head: head, rows: rows }; }
  function bKv(rows) { return { type: 'kv', rows: rows }; }
  function bTags(items) { return { type: 'tags', items: items }; }
  function bList(items) { return { type: 'list', items: items }; }
  /* 图（SPEC §10.6）：纯数据的图表规格，平台自己决定怎么画，画不了就当没看见 */
  function bChart(o) { return { type: 'chart', chart: o.chart, title: o.title || '', unit: o.unit || '', labels: o.labels || [], series: o.series || [], total: o.total, target: o.target, max: o.max, value: o.value, xLabel: o.xLabel, yLabel: o.yLabel, note: o.note }; }
  function ser(name, data) { return [{ name: name || '', data: data }]; }
  function cut(s2, n) { s2 = String(s2 == null ? '' : s2); return s2.length > n ? s2.slice(0, n) : s2; }
  function chanRank(R) { return R.funnel.channels.filter(function (c) { return c.costPerLead != null && c.costPerLead > 0; }).slice().sort(function (a, b) { return a.costPerLead - b.costPerLead; }); }
  function staleSource(d) {
    var best = null;
    (d.sources || []).forEach(function (s) { var a = daysBetween(String(s.lastSync).slice(0, 10), d.today); if (!best || a > best.age) best = { id: s.id, name: s.name, sync: s.lastSync, age: a }; });
    return best;
  }
  /* 今天没刷过的源，按落后天数倒序；判断只看日期部分，时分秒不参与 */
  function staleList(d) {
    var out = [];
    (d.sources || []).forEach(function (s) {
      var day = String(s.lastSync).slice(0, 10);
      if (day === d.today) return;
      out.push({ id: s.id, name: s.name, sync: s.lastSync, age: daysBetween(day, d.today) });
    });
    return out.sort(function (a, b) { return b.age - a.age || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
  }
  /* 同步情况一句话：最落后的那个说清楚，其余没刷过的据实点名，最后才说今天刷过几个 */
  function syncSay(d, full) {
    var all = d.sources || [], sl = staleList(d), fresh = all.length - sl.length;
    if (!all.length) return null;
    if (!sl.length) return all.length + ' 个源今天都同步过。';
    var st = sl[0], rest = sl.slice(1);
    var t = st.name + ' 停在 ' + (full ? st.sync : st.sync.slice(5, 10)) + '，已 ' + st.age + ' 天没同步';
    if (rest.length === 1) t += '；另有 ' + rest[0].name + ' 停在 ' + rest[0].sync.slice(5, 10);
    else if (rest.length > 1) t += '；另有 ' + rest.length + ' 个源也没在今天同步，最早的 ' + rest[0].name + ' 停在 ' + rest[0].sync.slice(5, 10);
    if (fresh > 0) t += '，其余 ' + fresh + ' 个源今天刷过';
    return t + '。';
  }
  /* 脚本屏与线索池的当前视角：宿主把它写进数据副本，内核只读，不读也能给默认值 */
  function scriptView(d, P) {
    var v = d.scriptView || {};
    return { segId: v.segId || P.focus, channel: v.channel || 'phone', stage: v.stage || 'first', variant: v.variant || 0 };
  }
  function leadInView(R, d, q) {
    var m = q ? String(q).match(/L-\d{4}-\d{4}/) : null;
    if (m && R.byId[m[0]]) return R.byId[m[0]];
    if (d.focusLead && R.byId[d.focusLead]) return R.byId[d.focusLead];
    return R.leads.filter(function (l) { return l.stage !== 'won'; })[0] || R.leads[0];
  }

  function brief(step, data, lib, result) {
    if (!step) step = SCREENS[0].key;                 /* 不传 step = 首屏（SPEC §10.2 / §10.3） */
    var R = got(data, lib, result), d = R.data, k = R.kpi, P = R.profile, seg = segOf(P);
    if (step === 'connect') {
      var sy = syncSay(d, false);
      if (!sy) return null;
      return { text: sy, blocks: [bChart({ chart: 'bar', title: '各源归集条数', unit: ' 条',
        labels: (d.sources || []).map(function (x) { return cut(x.name.split(' · ')[0], 6); }),
        series: ser('条数', (d.sources || []).map(function (x) { return x.rows; })) })] };
    }
    if (step === 'board') {
      var r = chanRank(R);
      if (!r.length) return '在手 ' + k.leads + ' 条，A 级 ' + k.gradeA + ' 条，未分派 ' + k.unassigned + ' 条。';
      var lo = r[0], hi = r[r.length - 1];
      return {
        text: hi.name + ' ' + fmtN(hi.costPerLead) + ' 元一条，' + lo.name + ' ' + fmtN(lo.costPerLead) + ' 元一条，差 ' + (hi.costPerLead / lo.costPerLead).toFixed(1) + ' 倍。',
        blocks: [bChart({ chart: 'funnel', title: '线索转化', unit: ' 个',
          labels: R.funnel.stages.map(function (x) { return x.name; }),
          series: ser('条数', R.funnel.stages.map(function (x) { return x.count; })) })]
      };
    }
    if (step === 'profile') {
      var sgs = P.segments.slice(0, 5), shown = 0;
      var lb = sgs.map(function (x) { shown += r0(x.share * 100); return x.id; });
      var dv = sgs.map(function (x) { return r0(x.share * 100); });
      if (shown < 99) { lb.push('其他'); dv.push(100 - shown); }
      return {
        text: seg.id + ' ' + seg.name + ' 只有 ' + seg.count + ' 家，却占成交价值 ' + r0(seg.share * 100) + '%，客单 ' + fmtW(seg.amount) + '。',
        blocks: [bChart({ chart: 'donut', title: '成交价值占比', unit: '%', total: 100, labels: lb, series: ser('占比', dv) })]
      };
    }
    if (step === 'script') {
      var sc = script(d, P, lib, scriptView(d, P));
      var lg = sc.sections.slice().sort(function (a, b) { return b.text.length - a.text.length; })[0];
      return {
        text: '这版 ' + sc.words + ' 字，口播约 ' + r0(sc.words / 5) + ' 秒；' + lg.title + '段 ' + lg.text.length + ' 字，占 ' + r0(100 * lg.text.length / sc.words) + '%。',
        blocks: [bChart({ chart: 'bar', title: '各段字数', unit: ' 字',
          labels: sc.sections.map(function (x) { return x.title; }),
          series: ser('字数', sc.sections.map(function (x) { return x.text.length; })) })]
      };
    }
    if (step === 'leads') {
      var top = R.leads.filter(function (l) { return l.stage !== 'won'; })[0];
      if (!top) return null;
      var sp = (top.signalParts || []).slice(0, 5);
      var bl = sp.length ? [bChart({ chart: 'bar', title: top.id + ' 行为分构成', unit: ' 分',
        labels: sp.map(function (p) { return p.name; }), series: ser('得分', sp.map(function (p) { return p.score; })) })]
        : [bChart({ chart: 'donut', title: '线索分级', unit: ' 条', total: R.leads.length, labels: ['A 级', 'B 级', 'C 级'],
          series: ser('条数', ['A', 'B', 'C'].map(function (g) { return R.leads.filter(function (l) { return l.grade === g; }).length; })) })];
      return {
        text: top.id + ' ' + top.total + ' 分排在前面：' + (top.signalParts.slice(0, 2).map(function (p) { return p.name + ' ' + p.score + ' 分'; }).join('、') || '暂无行为信号') + '，' + top.grade + ' 级。',
        blocks: bl, ref: top.id
      };
    }
    if (step === 'plan') {
      var pl = R.plan;
      var busy = pl.days.slice().sort(function (a, b) { return b.items.length - a.items.length; })[0];
      return {
        text: '本周排了 ' + pl.items.length + ' 次跟进，' + busy.label + ' 一天 ' + busy.items.length + ' 次；逾期 ' + pl.overdue.length + ' 条还没补。',
        blocks: [bChart({ chart: 'column', title: '每天跟进次数', unit: ' 次',
          labels: pl.days.map(function (x) { return String(x.label).split(' ')[1] || x.label; }),
          series: ser('次数', pl.days.map(function (x) { return x.items.length; })) })]
      };
    }
    return null;
  }

  function suggest(step, data, lib, result) {
    if (!step) step = SCREENS[0].key;                 /* 不传 step = 首屏（SPEC §10.2 / §10.3） */
    var R = got(data, lib, result), k = R.kpi;
    if (step === 'connect') return ['哪个源同步落后', '一共归集了多少条', '直连和导入各几个', '线索里有几条 A 级'];
    if (step === 'board') return ['哪个渠道单条便宜', '未分派的 ' + k.unassigned + ' 条怎么办', '成交预测怎么算的', '逾期为什么有 ' + k.overdue + ' 条'];
    if (step === 'profile') return ['行业权重为什么高', 'S2 和 S1 差在哪', '把区域权重调低', '匹配这个画像的线索'];
    if (step === 'script') return ['换成微信怎么说', '报价后那版给我', '异议怎么答', '这版多少字'];
    if (step === 'leads') return ['为什么它分这么高', '未分派的有哪几条', '逾期的是哪几条', '这条分派给谁'];
    return ['逾期的是哪几条', '哪个组排得满', '成交预测多少', '周报里写了什么'];
  }

  function ask(question, step, data, lib, result) {
    var R = got(data, lib, result), d = R.data, k = R.kpi, P = R.profile, seg = segOf(P);
    var s = String(question || '').trim();
    if (!s) return null;

    /* ---- 数据源 / 接入 ---- */
    if (hit(s, ['同步', '落后', '几天没', '数据源', '源'])) {
      var say = syncSay(d, true);
      if (!say) return null;
      var st = staleList(d)[0] || staleSource(d);
      return {
        text: say,
        blocks: [bTable(['源', '同步', '条数'], d.sources.map(function (x) { return [x.name, x.lastSync.slice(5, 10), fmtN(x.rows)]; }))],
        act: { type: 'focus', ref: st.id }
      };
    }
    if (hit(s, ['归集', '多少条', '总共', '一共'])) {
      var tot = (d.sources || []).reduce(function (t, x) { return t + x.rows; }, 0);
      return {
        text: (d.sources || []).length + ' 个源共 ' + fmtN(tot) + ' 条，归集后在手线索 ' + k.leads + ' 条，A 级 ' + k.gradeA + ' 条。',
        blocks: [bChart({ chart: 'funnel', title: '归集到在手', unit: ' 条', labels: ['各源记录', '在手线索', 'A 级'], series: ser('条数', [tot, k.leads, k.gradeA]) })]
      };
    }
    if (hit(s, ['直连', '导入'])) {
      var dir = (d.sources || []).filter(function (x) { return x.mode === 'direct'; });
      var imp = (d.sources || []).length - dir.length;
      return {
        text: '系统直连 ' + dir.length + ' 个，表格导入 ' + imp + ' 个。',
        blocks: [
          bChart({ chart: 'donut', title: '接入方式', unit: ' 个', total: (d.sources || []).length, labels: ['系统直连', '表格导入'], series: ser('个数', [dir.length, imp]) }),
          bTags((d.sources || []).map(function (x) { return x.name.split(' · ')[0] + (x.mode === 'direct' ? ' 直连' : ' 导入'); }))
        ]
      };
    }

    /* ---- 渠道成本 ---- */
    if (hit(s, ['渠道', '便宜', '划算', '成本', '元一条', '元/条'])) {
      var rc = chanRank(R);
      if (!rc.length) return null;
      var clo = rc[0], chi = rc[rc.length - 1];
      return {
        text: clo.name + ' ' + fmtN(clo.costPerLead) + ' 元一条，' + chi.name + ' ' + fmtN(chi.costPerLead) + ' 元一条。'
          + chi.name + ' 贵，但近 12 月带来 ' + chi.deals12 + ' 单 ' + fmtW(chi.dealAmount) + '，单均成交成本 ' + fmtN(chi.costPerDeal) + ' 元。',
        blocks: [bTable(['渠道', '元/条', '元/单'], rc.map(function (c) { return [c.name, fmtN(c.costPerLead), c.costPerDeal != null ? fmtN(c.costPerDeal) : '—']; }))],
        act: { type: 'focus', ref: clo.id }
      };
    }

    /* ---- 未分派 → 切到线索池并筛出未分派 ---- */
    if (hit(s, ['未分派', '没分派', '待分派'])) {
      var un = openOf(R).filter(function (l) { return !l.owner; });
      return {
        text: '未分派 ' + un.length + ' 条，A 级 ' + un.filter(function (l) { return l.grade === 'A'; }).length
          + ' 条、B 级 ' + un.filter(function (l) { return l.grade === 'B'; }).length + ' 条。各组还空 '
          + R.teams.reduce(function (t, x) { return t + x.free; }, 0) + ' 个位，按行业熟悉度可一次分完。已切到线索池并筛出未分派。',
        blocks: [bChart({ chart: 'bar', title: '各组空位', unit: ' 个',
          labels: R.teams.map(function (t) { return t.name; }), series: ser('空位', R.teams.map(function (t) { return t.free; })) })],
        act: { type: 'goto', step: 'leads', filter: 'unassigned' }
      };
    }

    /* ---- 逾期 → 切到线索池并筛出逾期 ---- */
    if (hit(s, ['逾期', '超时', '没跟进'])) {
      var ov = R.plan.overdue;
      return {
        text: '逾期 ' + ov.length + ' 条：' + ov.slice(0, 3).map(function (l) { return l.id + ' 已 ' + l.lastAge + ' 天'; }).join('、')
          + '。按等级节奏 A 级 ' + lib.stages.followUpDays.A + ' 天、B 级 ' + lib.stages.followUpDays.B + ' 天，超过就算逾期。已切到线索池并筛出逾期。',
        blocks: [bTable(['代号', '天数', '负责'], ov.slice(0, 5).map(function (l) { return [l.id, l.lastAge + ' 天', l.ownerName || '—']; }))],
        act: { type: 'goto', step: 'leads', filter: 'overdue' }
      };
    }

    /* ---- 等级分布 ---- */
    if (hit(s, ['A 级', 'A级', '几条 A', '等级', '级分布'])) {
      var pool2 = R.leads.filter(function (l) { return l.stage !== 'won'; });
      var byGrade = function (g) { return pool2.filter(function (l) { return l.grade === g; }); };
      var unA = byGrade('A').filter(function (l) { return !l.owner; }).length;
      return {
        text: '在手 ' + pool2.length + ' 条里 A 级 ' + byGrade('A').length + ' 条、B 级 ' + byGrade('B').length + ' 条、C 级 '
          + byGrade('C').length + ' 条、D 级 ' + byGrade('D').length + ' 条。A 级按 ' + lib.stages.followUpDays.A + ' 天节奏跟，'
          + (unA ? '其中 ' + unA + ' 条还没分派。' : '已全部分派。'),
        blocks: [
          bChart({ chart: 'heat', title: '渠道 × 等级（条）',
            labels: ['A', 'B', 'C', 'D'],
            rows: CHAN_ORDER.filter(function (c) { return pool2.filter(function (l) { return l.channel === c; }).length; }).map(function (c) { return CHANNEL_NAME[c] || c; }),
            matrix: CHAN_ORDER.filter(function (c) { return pool2.filter(function (l) { return l.channel === c; }).length; }).map(function (c) {
              return ['A', 'B', 'C', 'D'].map(function (g) { return pool2.filter(function (l) { return l.channel === c && l.grade === g; }).length; });
            }) }),
          bTable(['意向', '条数', '预计金额'], ['A', 'B', 'C', 'D'].map(function (g) {
            var ls = byGrade(g);
            return [g + ' 级', ls.length + ' 条', fmtW(ls.reduce(function (t, l) { return t + l.amountEst; }, 0))];
          }))
        ]
      };
    }

    /* ---- 成交预测 ---- */
    if (hit(s, ['预测', '管道', '能成多少', '预计成交'])) {
      return {
        text: '在手 ' + R.forecast.count + ' 条、管道 ' + fmtW(R.forecast.pipeline) + '，按阶段概率加权 ' + fmtW(R.forecast.expected) + '，约 ' + R.forecast.expectedDeals + ' 单。',
        blocks: [bTable(['阶段', '条数', '加权'], R.forecast.byStage.map(function (x) { return [x.name, x.count, fmtW(x.expected)]; }))]
      };
    }

    /* ---- 改权重并重算：要排在「解释权重」前面，否则被它先接走 ---- */
    if (hit(s, ['调低', '调高', '降权', '加权', '提高']) || (hit(s, ['区域', '行业大类', '规模', '决策人']) && hit(s, ['调', '改']))) {
      var dim2 = 'region';
      DIMS.forEach(function (x) { if (s.indexOf(DIM_LABEL[x]) >= 0) dim2 = x; });
      if (s.indexOf('行业') >= 0) dim2 = 'sector';
      var mul = hit(s, ['调高', '加权', '提高']) ? 1.5 : 0.5;
      return {
        text: DIM_LABEL[dim2] + '按 ×' + mul + ' 重算：权重从 ' + r0(P.weights[dim2] * 100) + '% 起变，'
          + openOf(R).length + ' 条在手商机的匹配分跟着动，A 级条数可能变。正在重算。',
        blocks: [bChart({ chart: 'radar', title: '改之前的四维权重', unit: '%',
          labels: DIMS.map(function (x) { return DIM_LABEL[x]; }), series: ser('权重', DIMS.map(function (x) { return r0(P.weights[x] * 100); })) })],
        act: { type: 'set', path: 'params.weights.' + dim2, value: mul }
      };
    }

    /* ---- 画像权重 ---- */
    if (hit(s, ['权重', '为什么高', '怎么定的'])) {
      var dim = null;
      DIMS.forEach(function (x) { if (s.indexOf(DIM_LABEL[x]) >= 0 || (x === 'sector' && s.indexOf('行业') >= 0) || (x === 'region' && s.indexOf('区域') >= 0)) dim = x; });
      if (!dim) dim = DIMS.slice().sort(function (a, b) { return P.weights[b] - P.weights[a]; })[0];
      var drows = P.dist[dim].rows;
      return {
        text: DIM_LABEL[dim] + '权重 ' + r0(P.weights[dim] * 100) + '%：' + drows[0].label + ' 一家占 ' + r0(drows[0].share * 100)
          + '%，分布越集中越能预测成交，所以权重给得高。' + (drows[1] ? '第二是 ' + drows[1].label + ' ' + r0(drows[1].share * 100) + '%。' : ''),
        blocks: [
          bChart({ chart: 'radar', title: '四维权重', unit: '%',
            labels: DIMS.map(function (x) { return DIM_LABEL[x]; }), series: ser('权重', DIMS.map(function (x) { return r0(P.weights[x] * 100); })) }),
          bTable([DIM_LABEL[dim], '占成交价值'], drows.slice(0, 4).map(function (x) { return [x.label, r0(x.share * 100) + '%']; }))
        ],
        act: { type: 'focus', ref: 'dim-' + dim }
      };
    }

    /* ---- 匹配画像的线索 → 切到线索池筛 A 级 ---- */
    if (hit(s, ['匹配', '像这个画像', '哪些线索'])) {
      var msx = R.leads.filter(function (l) { return l.grade === 'A' && l.stage !== 'won'; });
      var inSeg = function (l) { return l.sector === seg.sector && l.role === seg.role; };
      var hitSeg = msx.filter(inSeg);
      var more = function (n) { return n > 3 ? ' 等' : ''; };
      if (!msx.length) return { text: '在手线索里现在没有 A 级：综合分要到 ' + lib.stages.grades.A + ' 分。重点细分是 ' + seg.id + ' ' + seg.name + '。', act: { type: 'goto', step: 'leads', filter: 'A' } };
      return {
        text: 'A 级在手 ' + msx.length + ' 条：' + msx.slice(0, 3).map(function (l) { return l.id + ' ' + l.total + ' 分'; }).join('、') + more(msx.length)
          + '。其中行业大类与决策人都落在 ' + seg.id + ' ' + seg.name + ' 的有 ' + hitSeg.length + ' 条'
          + (hitSeg.length && hitSeg.length < msx.length ? '：' + hitSeg.slice(0, 3).map(function (l) { return l.id; }).join('、') + more(hitSeg.length) : '') + '。已切到线索池筛 A 级。',
        blocks: [bChart({ chart: 'bar', title: 'A 级综合分', unit: ' 分',
          labels: msx.slice(0, 6).map(function (l) { return l.id.slice(-4); }), series: ser('综合分', msx.slice(0, 6).map(function (l) { return l.total; })) })],
        act: { type: 'goto', step: 'leads', filter: 'A' }
      };
    }

    /* ---- 细分对比 ---- */
    if (/S[123]/.test(s) || hit(s, ['细分', '画像'])) {
      var ids = (s.match(/S[123]/g) || []).slice(0, 2);
      if (ids.length >= 2) {
        var x1 = P.segments.filter(function (z) { return z.id === ids[0]; })[0], x2 = P.segments.filter(function (z) { return z.id === ids[1]; })[0];
        if (x1 && x2) return {
          text: x1.id + ' 客单 ' + fmtW(x1.amount) + '、周期 ' + x1.cycle + ' 天、复购 ' + r0(x1.repeat * 100) + '%；'
            + x2.id + ' 客单 ' + fmtW(x2.amount) + '、周期 ' + x2.cycle + ' 天、复购 ' + r0(x2.repeat * 100) + '%。'
            + (x1.amount > x2.amount ? x1.id : x2.id) + ' 客单更高，' + (x1.cycle < x2.cycle ? x1.id : x2.id) + ' 成得更快。',
          blocks: [
            bChart({ chart: 'column', title: '各细分客单', unit: ' 万元',
              labels: P.segments.map(function (z) { return z.id; }), series: ser('客单', P.segments.map(function (z) { return r0(z.amount / 10000); })) }),
            bTable(['', x1.id, x2.id], [['家数', x1.count, x2.count], ['客单', fmtW(x1.amount), fmtW(x2.amount)], ['周期', x1.cycle + ' 天', x2.cycle + ' 天'], ['占价值', r0(x1.share * 100) + '%', r0(x2.share * 100) + '%']])
          ]
        };
      }
      var sg = ids.length ? P.segments.filter(function (z) { return z.id === ids[0]; })[0] : seg;
      if (sg) return {
        text: sg.id + ' ' + sg.name + '：' + sg.count + ' 家，占成交价值 ' + r0(sg.share * 100) + '%，客单 ' + fmtW(sg.amount) + '，周期 ' + sg.cycle + ' 天，复购 ' + r0(sg.repeat * 100) + '%。',
        blocks: [
          bChart({ chart: 'column', title: '各细分家数', unit: ' 家',
            labels: P.segments.map(function (z) { return z.id; }), series: ser('家数', P.segments.map(function (z) { return z.count; })) }),
          bTags(sg.pains.map(function (p) { return p.tag; }))
        ]
      };
    }

    /* ---- 脚本：换渠道 / 换阶段 ---- */
    var V = scriptView(d, P);
    if (hit(s, ['微信', '电话', '展会现场', '邮件']) && (step === 'script' || hit(s, ['脚本', '话术', '怎么说']))) {
      var ch = s.indexOf('微信') >= 0 ? 'wechat' : s.indexOf('展会') >= 0 ? 'fair' : s.indexOf('邮件') >= 0 ? 'mail' : 'phone';
      var sc2 = script(d, P, lib, { segId: V.segId, channel: ch, stage: V.stage, variant: V.variant });
      return {
        text: CHN[ch] + '版开场：' + sc2.sections[0].text + '\n全篇 ' + sc2.words + ' 字。已把脚本屏切到 ' + CHN[ch] + '。',
        blocks: [bChart({ chart: 'bar', title: CHN[ch] + '版各段字数', unit: ' 字',
          labels: sc2.sections.map(function (x) { return x.title; }), series: ser('字数', sc2.sections.map(function (x) { return x.text.length; })) })],
        act: { type: 'set', path: 'params.script.channel', value: ch }
      };
    }
    if (hit(s, ['报价后', '二次跟进', '首触', '沉睡'])) {
      var stg = s.indexOf('报价') >= 0 ? 'quote' : s.indexOf('二次') >= 0 ? 'follow' : s.indexOf('沉睡') >= 0 ? 'wake' : 'first';
      var sc3 = script(d, P, lib, { segId: V.segId, channel: V.channel, stage: stg, variant: V.variant });
      return {
        text: STN[stg] + '版：' + sc3.sections[0].text + '\n行动段：' + sc3.sections[4].text,
        blocks: [bChart({ chart: 'bar', title: STN[stg] + '版各段字数', unit: ' 字',
          labels: sc3.sections.map(function (x) { return x.title; }), series: ser('字数', sc3.sections.map(function (x) { return x.text.length; })) })],
        act: { type: 'set', path: 'params.script.stage', value: stg }
      };
    }
    if (hit(s, ['异议', '嫌贵', '怎么答', '回绝'])) {
      var sc4 = script(d, P, lib, V);
      return {
        text: sc4.objections.slice(0, 2).map(function (o) { return '「' + o.q + '」→ ' + o.a; }).join('\n'),
        blocks: [bList(sc4.objections.map(function (o) { return o.q; }))]
      };
    }
    if (hit(s, ['多少字', '几个字', '口播', '念多久'])) {
      var sc5 = script(d, P, lib, V);
      return {
        text: '全篇 ' + sc5.words + ' 字，口播约 ' + r0(sc5.words / 5) + ' 秒。',
        blocks: [bTable(['段', '字数'], sc5.sections.map(function (x) { return [x.title, x.text.length]; }))]
      };
    }

    /* ---- 单条线索 ---- */
    var idm = s.match(/L-\d{4}-\d{4}/);
    if (idm && R.byId[idm[0]]) {
      var L2 = R.byId[idm[0]];
      return {
        text: L2.id + ' 综合 ' + L2.total + ' 分 = 匹配 ' + L2.match + ' × ' + r0(lib.stages.weights.match * 100) + '% + 信号 ' + L2.signal + ' × ' + r0(lib.stages.weights.signal * 100) + '%，'
          + L2.grade + ' 级 · ' + L2.stageName + ' · ' + (L2.ownerName || '未分派') + '。',
        blocks: [bKv([['行业', L2.industry], ['区域', L2.region], ['规模', L2.sizeLabel], ['职务', L2.role], ['预计金额', fmtW(L2.amountEst)], ['上次动作', L2.lastAction ? short(L2.lastAction.date) : '无']])],
        act: { type: 'focus', ref: L2.id }
      };
    }
    if (hit(s, ['为什么', '凭什么', '怎么打的分', '分这么高', '分高'])) {
      var L3 = leadInView(R, d, s);
      var ok3 = L3.parts.filter(function (p) { return p.share >= 30; });
      return {
        text: L3.id + ' 综合 ' + L3.total + ' 分 = 匹配 ' + L3.match + ' × ' + r0(lib.stages.weights.match * 100)
          + '% + 信号 ' + L3.signal + ' × ' + r0(lib.stages.weights.signal * 100) + '%。\n匹配高在 '
          + (ok3.length ? ok3.map(function (p) { return p.label + ' ' + p.value; }).join('、') + ' 都落在重点细分里' : '没有维度落在重点细分里')
          + '；信号来自 ' + (L3.signalParts.slice(0, 2).map(function (p) { return p.name + ' ' + p.score + ' 分'; }).join('、') || '无'),
        blocks: [bTable(['维度', '该细分占比', '权重'], L3.parts.map(function (p) { return [p.label, p.share + '%', p.weight + '%']; }))],
        act: { type: 'focus', ref: L3.id }
      };
    }
    if (hit(s, ['分派给谁', '给谁', '谁来跟', '推荐'])) {
      var L4 = leadInView(R, d, s);
      var rec2 = recommendTeam(L4, R.teams);
      if (!rec2) return { text: '各组都满了，先把沉睡线索清一清再分。' };
      var loadTbl = bTable(['小组', '在手', '上限'], R.teams.map(function (t) { return [t.name, t.load, t.cap]; }));
      var own4 = R.teams.filter(function (t) { return t.id === L4.owner; })[0];
      if (own4) return {
        text: L4.id + ' 已经在 ' + own4.name + ' 手上，负载 ' + own4.load + '/' + own4.cap + '。要转的话 ' + rec2.name
          + ' 合适：' + (rec2.sectors.indexOf(L4.sector) >= 0 ? '熟悉该行业' : '有空位') + '，负载 ' + rec2.load + '/' + rec2.cap + '。',
        blocks: [loadTbl], act: { type: 'focus', ref: L4.id }
      };
      return {
        text: L4.id + ' 建议给 ' + rec2.name + '：' + (rec2.sectors.indexOf(L4.sector) >= 0 ? '熟悉该行业' : '有空位') + '，当前负载 ' + rec2.load + '/' + rec2.cap + '。',
        blocks: [loadTbl], act: { type: 'focus', ref: L4.id }
      };
    }

    /* ---- 计划 / 负载 / 周报 / 动作 ---- */
    if (hit(s, ['排得满', '负载', '哪个组', '忙'])) {
      var t2 = R.teams.slice().sort(function (a, b) { return (b.load / b.cap) - (a.load / a.cap); })[0];
      return {
        text: t2.name + ' 在手 ' + t2.load + '/' + t2.cap + '，占用 ' + r0(100 * t2.load / t2.cap) + '%。本周跟进 '
          + (R.plan.byTeam.filter(function (x) { return x.id === t2.id; })[0] || {}).count + ' 次。',
        blocks: [bTable(['小组', '在手/上限', '本周', '加权预测'], R.teams.map(function (x) {
          var fc2 = R.forecast.byTeam.filter(function (y) { return y.id === x.id; })[0] || {};
          return [x.name, x.load + '/' + x.cap, (R.plan.byTeam.filter(function (y) { return y.id === x.id; })[0] || {}).count || 0, fmtW(fc2.expected || 0)];
        }))]
      };
    }
    if (hit(s, ['跟进中', '在跟', '本月成交', '成交了几单', '近 90 天', '近90天'])) {
      return {
        text: '跟进中 ' + k.following + ' 条（已分派且已联系）；本月成交 ' + k.wonMonth + ' 单，近 90 天 ' + k.deals90
          + ' 单；商机转化率 ' + k.conversion + '%，平均成交周期 ' + k.avgCycle + ' 天。'
      };
    }
    if (hit(s, ['周报', '发给谁', '写了什么'])) {
      return {
        text: R.report.lines.slice(0, 3).join('\n') + '\n全文已打开。',
        blocks: [bChart({ chart: 'stack', title: '在手线索构成', unit: ' 条', labels: ['本周'],
          series: [{ name: '跟进中', data: [k.following] }, { name: '未分派', data: [k.unassigned] }, { name: '沉睡', data: [k.dormant] }] })],
        act: { type: 'open', panel: 'report' }
      };
    }
    if (hit(s, ['动作', '做了什么', '日志'])) {
      if (!d.log.length) return { text: '本周还没有动作记录。分派、加入计划、记录跟进都会写进这里。' };
      return { text: '本周 ' + d.log.length + ' 条动作：' + d.log.slice(-3).map(function (l) { return l.label; }).join('、') + '。已打开全部。', act: { type: 'open', panel: 'log' } };
    }
    return null;
  }

  /* ---------------- 文档摄入 ---------------- */
  function moneyList(text) {
    /* 认两种写法：后缀「元 / 万元」，或前缀 CNY / RMB / ¥ / 人民币（合同正文常见）。前后缀同时出现只算一次 */
    var out = [], m, re = /(?:(CNY|RMB|¥|￥|人民币)\s*)?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(万元|元)?/gi;
    while ((m = re.exec(text))) {
      if (!m[1] && !m[3]) continue;
      var v = parseFloat(m[2].replace(/,/g, ''));
      if (isNaN(v)) continue;
      out.push(m[3] === '万元' ? v * 10000 : v);
    }
    return out.sort(function (a, b) { return b - a; });
  }
  function dateIn(text) {
    var m = /(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(text);
    if (m) return m[1] + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[3]).padStart(2, '0');
    m = /(20\d{2})-(\d{1,2})-(\d{1,2})/.exec(text);
    return m ? m[1] + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[3]).padStart(2, '0') : null;
  }
  function nearest(R, amount) {
    var best = null;
    openOf(R).forEach(function (l) { var gap = Math.abs(l.amountEst - amount); if (!best || gap < best.gap) best = { l: l, gap: gap }; });
    return best;
  }
  /* 合同 / 报价单：金额回填到最接近的在手线索，并记一次跟进 */
  function docContract(doc, R, d) {
    var text = doc.text || '';
    var money = moneyList(text), amount = money[0] || null;
    var due = dateIn(text);
    var warr = (/质保期?\s*(\d+)\s*个月/.exec(text) || [])[1];
    var mine = text.indexOf(d.company) >= 0 || (d.co && text.indexOf(d.co) >= 0);
    var rows = [];
    if (amount) rows.push(['合同金额', fmtW(amount)]);
    if (due) rows.push(['交付期限', due]);
    if (warr) rows.push(['质保', warr + ' 个月']);
    if (doc.tables.length) rows.push(['付款期次', (doc.tables[0].length - 1) + ' 期']);
    rows.push(['条款', doc.paragraphs.length + ' 段']);
    if (!amount) {
      return {
        text: doc.name + ' 读完 ' + doc.paragraphs.length + ' 段、' + doc.tables.length + ' 张表，没有抽到金额，没法回填。开头是「' + (doc.paragraphs[0] || '').slice(0, 24) + '」。',
        blocks: [bKv(rows)]
      };
    }
    var pool = openOf(R), best = nearest(R, amount);
    var t0 = doc.tables[0] || null;
    var blocks = [bKv(rows)];
    if (t0 && t0.length > 1) blocks.push(bTable(t0[0].slice(0, 3), t0.slice(1, 4).map(function (r) { return r.slice(0, 3); })));
    if (!best) return { text: doc.name + '：合同金额 ' + fmtW(amount) + (due ? '、交付期限 ' + due : '') + '。在手线索里没有可对应的条目。', blocks: blocks };
    var l = best.l;
    var nd = logAction(d, l.id, '合同金额 ' + fmtN(amount) + ' 元回填' + (due ? ' · 交付 ' + due : ''));
    var row = nd.leads.filter(function (x) { return x.id === l.id; })[0];
    if (row) { row.amountEst = amount; if (due) row.note = '交付期限 ' + due; }
    return {
      text: doc.name + '：合同金额 ' + fmtN(amount) + ' 元' + (due ? '、交付期限 ' + due : '') + (warr ? '、质保 ' + warr + ' 个月' : '')
        + (mine ? '，甲方就是本企业' : '') + '。\n在手 ' + pool.length + ' 条里 ' + l.id + '（' + l.industry + '）预计 ' + fmtW(l.amountEst) + ' 与它差 ' + fmtW(best.gap)
        + '，已按合同金额回填并记一次跟进。',
      blocks: blocks, data: nd, ref: l.id, act: { type: 'focus', ref: l.id, step: 'leads' }
    };
  }
  /* 表格：认线索字段，够用就能入池；认不出就把全表打开 */
  function docSheet(doc, R, d) {
    var sheet = (doc.sheets || [])[0];
    if (!sheet || !sheet.rows.length) return { text: doc.name + ' 里没有可读的工作表。' };
    var head = sheet.rows[0].map(function (x) { return String(x == null ? '' : x).trim(); });
    var body = sheet.rows.slice(1).filter(function (r) { return r.join('').trim().length; });
    var map = {};
    COLMAP.forEach(function (c) {
      head.forEach(function (hd, i) { if (map[c.key] == null && c.words.some(function (w) { return hd.indexOf(w) >= 0; })) map[c.key] = i; });
    });
    var keys = Object.keys(map);
    var open = { type: 'open', panel: 'sheet', ref: sheet.name, input: { head: head, rows: body.slice(0, 20) } };
    if (map.industry == null && map.sector == null) {
      return {
        text: doc.name + '《' + sheet.name + '》' + body.length + ' 行 × ' + head.length + ' 列，列名是：' + head.join(' / ')
          + '。里面没有企业、行业、区域这类线索字段，没有入池。全表已打开。',
        blocks: [bKv([['工作表', sheet.name], ['行', body.length], ['列', head.length]]),
          bTable(head.slice(0, 4), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (c) { return c == null ? '' : String(c); }); }))],
        act: open
      };
    }
    var made = body.slice(0, 8).map(function (r) {
      return {
        name: String(r[map.industry != null ? map.industry : map.sector] || '').trim(),
        region: map.region != null ? String(r[map.region] || '') : '',
        role: map.role != null ? String(r[map.role] || '') : '',
        amount: map.amountEst != null ? parseFloat(String(r[map.amountEst]).replace(/[^0-9.]/g, '')) || 0 : 0
      };
    }).filter(function (x) { return x.name; });
    return {
      text: doc.name + '《' + sheet.name + '》' + body.length + ' 行，认出 ' + keys.length + ' 个线索字段（' + keys.map(function (x) { return head[map[x]]; }).join('、')
        + '），前 ' + made.length + ' 行可以入池。全表已打开。',
      blocks: [bTable(['企业', '区域', '预计金额'], made.slice(0, 4).map(function (x) { return [x.name, x.region || '—', x.amount ? fmtN(x.amount) : '—']; }))],
      act: open
    };
  }
  /* 来函：抽金额与期限，记一次来函跟进 */
  function docMail(doc, R, d) {
    var m = doc.mail || {};
    var money = moneyList(doc.text || ''), due = dateIn(doc.text || '');
    var from = String(m.from || '').replace(/<[^>]*>/g, '').trim() || '来函方';
    var rows = [['发件', from], ['主题', m.subject || '—'], ['日期', (m.date || '').slice(0, 24)]];
    if (money[0]) rows.push(['正文金额', fmtW(money[0])]);
    if (due) rows.push(['期限', due]);
    var best = money[0] ? nearest(R, money[0]) : null;
    var txt = '来函《' + (m.subject || doc.name) + '》，发件 ' + from + '，' + (m.date || '').slice(0, 16) + '。'
      + (money[0] ? '正文里抽到 ' + fmtW(money[0]) + (money[1] ? '、' + fmtW(money[1]) : '') : '正文没有金额')
      + (due ? '，期限 ' + due : '') + '。';
    if (!best) return { text: txt, blocks: [bKv(rows)] };
    var nd = logAction(d, best.l.id, '来函「' + (m.subject || doc.name) + '」' + (money[0] ? ' · ' + fmtN(money[0]) + ' 元' : ''));
    return {
      text: txt + '\n在手线索里 ' + best.l.id + '（' + best.l.industry + '）预计 ' + fmtW(best.l.amountEst) + ' 与它接近，已记一次来函跟进。',
      blocks: [bKv(rows)], data: nd, ref: best.l.id, act: { type: 'focus', ref: best.l.id, step: 'leads' }
    };
  }
  /* 幻灯片：把里面的数字与本模块口径并排 */
  function docSlides(doc, R) {
    var lines = [];
    (doc.slides || []).forEach(function (s) { var ls = s.lines || []; lines = lines.concat(ls); if (s.title && ls.indexOf(s.title) < 0) lines.push(s.title); });
    var nums = lines.filter(function (x) { return /\d/.test(x); }).slice(0, 5);
    var k = R.kpi;
    var deal = lines.filter(function (x) { return x.indexOf('成交') >= 0 || x.indexOf('新客') >= 0; })[0];
    return {
      text: doc.name + ' 共 ' + doc.slides.length + ' 页，第 1 页「' + ((doc.slides[0] || {}).title || '—') + '」。'
        + (deal ? '里面写着「' + deal + '」；' : '') + '本模块口径：近 90 天成交 ' + k.deals90 + ' 单，本月 ' + k.wonMonth + ' 单，在手 ' + k.leads + ' 条。',
      blocks: [bTable(['幻灯片里的数'], nums.map(function (x) { return [x]; }))]
    };
  }
  function docPlain(doc) {
    var lines = (doc.text || '').split(/\r?\n/).filter(function (x) { return x.trim(); });
    return {
      text: doc.name + ' 共 ' + lines.length + ' 行。开头是「' + (lines[0] || '').slice(0, 30) + '」。没有识别到线索字段，没有入池。',
      blocks: [bTable(['前几行'], lines.slice(0, 3).map(function (x) { return [x.slice(0, 26)]; }))]
    };
  }
  function ingest(doc, step, data, lib, result) {
    if (!doc) return null;
    var R = got(data, lib, result), d = R.data;
    if (!doc.ok) return { text: doc.name + ' 没读出内容：' + (doc.note || '格式不支持') };
    if (doc.kind === 'word' || doc.kind === 'pdf') return docContract(doc, R, d);
    if (doc.kind === 'excel') return docSheet(doc, R, d);
    if (doc.kind === 'eml') return docMail(doc, R, d);
    if (doc.kind === 'ppt') return docSlides(doc, R);
    return docPlain(doc);
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, DIMS: DIMS, DIM_LABEL: DIM_LABEL, CHANNEL_NAME: CHANNEL_NAME, ACTION: ACTION, STAGE_ORDER: STAGE_ORDER,
    ensure: ensure, profile: profile, leadsScored: leadsScored, explain: explain, script: script, run: run,
    assign: assign, assignAll: assignAll, addPlan: addPlan, markDormant: markDormant, advance: advance, logAction: logAction, setFocus: setFocus, setWeight: setWeight, adoptScript: adoptScript,
    screens: screens, brief: brief, suggest: suggest, ask: ask, ingest: ingest,
    recommendTeam: recommendTeam, teamLoad: teamLoad, fmtN: fmtN, fmtW: fmtW, short: short, sizeLabel: sizeLabel, weekday: weekday, dateOf: dateOf
  };
});
