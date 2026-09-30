// 生成三套样本：产线 / 工序 / 路线 / 标准工时来自 AI ERP 样本，约束与加班事实来自 AI决策样本，生产部 E-编号来自 AI人力官花名册（只取 id / job / overtimeH）。
// 本周报工、12 周工时统计、时间损失、设备、排班、技能矩阵、今日批次、周指标由固定种子生成，所有数字都能被内核复算。
const fs = require('fs');
const path = require('path');
const here = path.join(__dirname, '..');
const skills = path.join(here, '..');
const erpLib = require(path.join(skills, '10-ai-erp', 'scripts', 'load-data.js'))();
const ERP = require(path.join(skills, '10-ai-erp', 'core', 'sim.js'));
const hrLib = require(path.join(skills, '05-ai-hr', 'scripts', 'load-data.js'))();
const decLib = require(path.join(skills, '09-ai-decision', 'scripts', 'load-data.js'))();

function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r0 = (x) => Math.round(x), r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100, r4 = (x) => Math.round(x * 10000) / 10000, r6 = (x) => Math.round(x * 1e6) / 1e6;
const pad = (n) => (n < 10 ? '0' : '') + n;
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function weekday(iso) { return new Date(iso + 'T00:00:00Z').getUTCDay(); }
const TODAY = '2026-09-17', WEEK_START = '2026-09-14';

// ---------- 三套配置 ----------
const CFG = {
  make: {
    file: 'mfg', erp: 'make', hr: 'make', dec: 'make', depts: ['prod'], constraint: 'L4', spare: 'L8', releaseLine: 'L1',
    spareCapPerPerson: 4, spareEffTo: 0.9, spareSupport: 2, lunchH: 1.0, firstPieceMinPerSetup: 8,
    jobProducts: ['P01', 'P04', 'P02', 'P01', 'P04', 'P02', 'P01', 'P04'],
    fixtures: { P01: { fixture: 'F-12', program: 'T-01' }, P02: { fixture: 'F-12', program: 'T-02' }, P03: { fixture: 'F-03', program: 'S-01' }, P04: { fixture: 'F-07', program: 'M-04' }, P05: { fixture: 'F-09', program: 'T-03' }, P06: { fixture: 'F-03', program: 'S-02' } },
    setupMatrix: { sameProduct: 10, sameFixture: 25, diffFixture: 45 },
    setupSteps: [{ name: '程序调用与校验', min: 6, internal: true }, { name: '工装拆装', min: 14, internal: true }, { name: '找正与首件', min: 8, internal: true }, { name: '下批工装与程序准备', min: 10, internal: false }, { name: '物料与量具就位', min: 6, internal: false }],
    firstPieceItems: ['关键尺寸', '表面质量', '程序号与工装号核对', '量具校验记录', '首件签字'],
    stdDev: { 'P04|铣削': 0.175, 'P01|车削': 0.16, 'P05|车削': -0.13, 'P02|车削': 0.04, 'P03|冲压': 0.03, 'P06|冲压': -0.02 },
    jobToLine: { leader: null, 'cut-op': 'L1', 'stamp-op': 'L2', cnc: 'L4', 'heat-op': 'L5', 'plating-op': 'L6', assembler: 'L7' },
    machines: [['CT-01', 'L1'], ['PA-01', 'L2'], ['PA-02', 'L2'], ['PB-01', 'L3'], ['CNC-01', 'L4'], ['CNC-02', 'L4'], ['CNC-03', 'L4'], ['CNC-04', 'L4'], ['CNC-05', 'L8'], ['CNC-06', 'L8'], ['HT-01', 'L5'], ['PL-01', 'L6'], ['AS-01', 'L7']],
    dueMachine: 'CNC-02', spcMachine: 'CNC-03', downReason: '液压',
    // 约束线每日损失（小时）：换型 / 停机 / 等料 / 等前道 / 等检 / 等工装 / 速度 / 返工
    lossBottleneck: { setup: 2.6, down: 0.9, wait: [0.7, 0.05, 0.9, 0.1], speed: 0.3, rework: 0.3 },
    lossOther: { setup: 0.6, down: 0.3, wait: [0.3, 0.5, 0.2, 0.1], speed: 0.4, rework: 0.2 },
    weekly0: { flowDays: 9.4, effUtil: 62, wipDays: 2.9, fpy: 96.6, otHours: 62, output: 33200, planHit: 82 },
    weekly11: { flowDays: 8.6, effUtil: 68, wipDays: 2.5, fpy: 96.1, otHours: 96, output: 36700, planHit: 88 },
    wipUnits0: 6000, batchN: 800
  },
  flow: {
    file: 'trade', erp: 'flow', hr: 'flow', dec: 'flow', depts: ['wh'], constraint: 'P1', spare: 'P1', releaseLine: 'A1',
    spareCapPerPerson: 2, spareEffTo: 1, spareSupport: 1, lunchH: 1.0, firstPieceMinPerSetup: 5,
    jobProducts: ['G01', 'G03', 'G02', 'G01', 'G04', 'G03', 'G02', 'G01'],
    fixtures: { G01: { fixture: '常温线路', program: '纸箱 A' }, G02: { fixture: '常温线路', program: '纸箱 B' }, G03: { fixture: '冷链线路', program: '保温箱' }, G04: { fixture: '常温线路', program: '纸箱 A' } },
    setupMatrix: { sameProduct: 5, sameFixture: 15, diffFixture: 30 },
    setupSteps: [{ name: '波次单切换与复核', min: 4, internal: true }, { name: '包材更换', min: 8, internal: true }, { name: '首箱复核', min: 5, internal: true }, { name: '下波次包材备料', min: 8, internal: false }, { name: '面单与标签预打印', min: 5, internal: false }],
    firstPieceItems: ['商品与数量核对', '包材与温区核对', '面单信息', '封箱与加固', '首箱签字'],
    stdDev: { 'G03|打包': 0.16, 'G01|拣货': 0.12, 'G02|复核': -0.1, 'G04|打包': 0.03, 'G01|打包': 0.05 },
    jobToLine: { picker: ['A1', 'A1', 'C1', 'A2'], delivery: ['P1', 'D1'] },
    machines: [['CV-01', 'A1'], ['CV-02', 'A2'], ['SC-01', 'C1'], ['PK-01', 'P1'], ['PK-02', 'P1'], ['DK-01', 'D1']],
    dueMachine: 'PK-01', spcMachine: 'PK-02', downReason: '打包机',
    lossBottleneck: { setup: 1.6, down: 0.6, wait: [0.6, 0.8, 0.5, 0.4], speed: 0.4, rework: 0.3 },
    lossOther: { setup: 0.4, down: 0.2, wait: [0.4, 0.4, 0.2, 0.1], speed: 0.4, rework: 0.2 },
    weekly0: { flowDays: 3.6, effUtil: 66, wipDays: 1.6, fpy: 97.2, otHours: 30, output: 5900, planHit: 84 },
    weekly11: { flowDays: 3.1, effUtil: 71, wipDays: 1.3, fpy: 96.8, otHours: 44, output: 6600, planHit: 89 },
    wipUnits0: 900, batchN: 120
  },
  service: {
    file: 'prof', erp: 'service', hr: 'service', dec: 'service', depts: ['acct', 'tax', 'client'], constraint: 'G2', spare: 'G2', releaseLine: 'G1',
    spareCapPerPerson: 1.6, spareEffTo: 1, spareSupport: 2, lunchH: 0.5, firstPieceMinPerSetup: 6,
    jobProducts: ['V02', 'V01', 'V02', 'V03', 'V02', 'V01', 'V02', 'V01'],
    fixtures: { V01: { fixture: '小规模模板', program: '资料包 S' }, V02: { fixture: '一般纳税人模板', program: '资料包 G' }, V03: { fixture: '一般纳税人模板', program: '资料包 Y' } },
    setupMatrix: { sameProduct: 5, sameFixture: 15, diffFixture: 30 },
    setupSteps: [{ name: '账套切换与核对', min: 4, internal: true }, { name: '模板加载', min: 6, internal: true }, { name: '首户复核', min: 6, internal: true }, { name: '下户资料包预整理', min: 8, internal: false }, { name: '常用科目与模板预设', min: 5, internal: false }],
    firstPieceItems: ['资料包完整', '模板版本核对', '首户复核', '异常科目标记', '首户签字'],
    stdDev: { 'V02|账务处理': 0.18, 'V02|凭证录入': 0.15, 'V01|凭证录入': -0.12, 'V03|账务处理': 0.06, 'V01|账务处理': 0.04 },
    jobToLine: { 'acct-agent': ['G2', 'G3'], 'tax-consult': 'G4', 'cust-mgr': 'G1' },
    machines: [['SYS-01', 'G1'], ['SYS-02', 'G2'], ['SYS-03', 'G3'], ['SYS-04', 'G4']],
    dueMachine: 'SYS-02', spcMachine: 'SYS-02', downReason: '系统',
    lossBottleneck: { setup: 0.9, down: 0.3, wait: [0.8, 0.2, 0.5, 0.2], speed: 0.3, rework: 0.4 },
    lossOther: { setup: 0.3, down: 0.1, wait: [0.4, 0.3, 0.2, 0.1], speed: 0.3, rework: 0.2 },
    weekly0: { flowDays: 6.8, effUtil: 60, wipDays: 2.4, fpy: 95.5, otHours: 70, output: 268, planHit: 80 },
    weekly11: { flowDays: 6.1, effUtil: 66, wipDays: 2.0, fpy: 95.2, otHours: 108, output: 296, planHit: 86 },
    wipUnits0: 120, batchN: 20
  }
};

function build(key) {
  const cfg = CFG[key], R = rng(key === 'make' ? 8081 : key === 'flow' ? 8082 : 8083);
  const erp = JSON.parse(JSON.stringify(erpLib.samples[cfg.erp]));
  const hr = hrLib.samples[cfg.hr], dec = decLib.samples[cfg.dec];
  const S = ERP.schedule(erp);
  const lines = erp.lines, byLine = {}; lines.forEach((l) => { byLine[l.id] = l; });
  const products = erp.products, byProd = {}; products.forEach((p) => { byProd[p.id] = p; });
  const restDays = erp.workday.restWeekdays || [0];
  const isRest = (iso) => restDays.indexOf(weekday(iso)) >= 0;
  const workdaysPerWeek = 7 - restDays.length;
  const shiftsOf = (l) => (key === 'make' && l.capHoursPerDay >= 12 ? ['A', 'B'] : ['A']);
  const opsOf = (l) => l.ops;
  const routeOf = (pid, op) => byProd[pid].route.filter((r) => r.op === op)[0];
  const stdOf = (pid, op) => { const r = routeOf(pid, op); return r ? r.hoursPerUnit : null; };
  const devOf = (pid, op) => { const k = pid + '|' + op; if (cfg.stdDev[k] != null) return cfg.stdDev[k]; return r2((R() - 0.5) * 0.08); };

  // 生产部员工（只留 id / job / overtimeH）与技能矩阵
  const emps = hr.employees.filter((e) => cfg.depts.indexOf(e.dept) >= 0 && e.status !== 'left').map((e) => ({ id: e.id, job: e.job, overtimeH: e.overtimeH }));
  const opsAll = []; lines.forEach((l) => l.ops.forEach((o) => { if (opsAll.indexOf(o) < 0) opsAll.push(o); }));
  const homeOf = (e) => cfg.jobToLine[e.job] || null;
  // 岗位 → 主线；同一岗位的人在同工序的几条线之间轮流分（冲压 A/B、CNC A/B）
  const linesForOp = {}; lines.forEach((l) => l.ops.forEach((o) => { (linesForOp[o] = linesForOp[o] || []).push(l.id); }));
  const skills = [], counters = {};
  emps.forEach((e) => {
    let home = homeOf(e);
    if (Array.isArray(home)) { const arr = home, ck = e.job; counters[ck] = (counters[ck] || 0); home = arr[counters[ck] % arr.length]; counters[ck]++; }
    else if (home) { const o = byLine[home].ops[0]; const cands = linesForOp[o] || [home]; counters[o] = (counters[o] || 0); home = cands[counters[o] % cands.length]; counters[o]++; }
    const levels = {}; opsAll.forEach((o) => { levels[o] = 0; });
    if (home) byLine[home].ops.forEach((o, oi) => { const u = R(); levels[o] = oi === 0 ? (key === 'flow' ? (u < 0.6 ? 3 : 2) : (u < 0.55 ? 3 : u < 0.9 ? 2 : 1)) : (u < 0.35 ? 3 : u < 0.6 ? 2 : u < 0.8 ? 1 : 0); });
    if (e.job === 'leader' || e.job === 'mgr') { const l = lines[emps.indexOf(e) % lines.length]; l.ops.forEach((o) => { levels[o] = 2; }); }
    skills.push({ emp: e.id, home: home, levels: levels });
  });
  // 仓配：拣货与复核互为多能工
  if (key === 'flow') skills.forEach((s) => { if (['A1', 'A2'].indexOf(s.home) >= 0 && R() < 0.6) s.levels['复核'] = Math.max(s.levels['复核'] || 0, 2); if (s.home === 'C1' && R() < 0.6) s.levels['拣货'] = Math.max(s.levels['拣货'] || 0, 2); });
  // 多能工：约束线以外、负荷最低的线里挑 4 人给约束工序 2 级（其中 2 人加班最少，是支援候选）
  const constraintOps = byLine[cfg.constraint].ops;
  const lowLines = S.lines.filter((l) => l.id !== cfg.constraint && l.id !== cfg.spare && l.load7 < 60).sort((a, b) => a.load7 - b.load7).map((l) => l.id);
  const donors = skills.filter((s) => s.home && lowLines.indexOf(s.home) >= 0).map((s) => ({ s, e: emps.filter((x) => x.id === s.emp)[0] })).sort((a, b) => lowLines.indexOf(a.s.home) - lowLines.indexOf(b.s.home) || a.e.overtimeH - b.e.overtimeH).slice(0, 4);
  donors.forEach((d) => { constraintOps.forEach((o) => { d.s.levels[o] = 2; }); });
  const supportIds = donors.slice(0, 2).map((d) => d.s.emp);
  // 约束线里一名 1 级操作者（技能根因用）
  const constraintEmps = skills.filter((s) => s.home === cfg.constraint);
  if (constraintEmps.length > 2) constraintOps.forEach((o) => { constraintEmps[constraintEmps.length - 1].levels[o] = 1; });
  // empStats 与技能等级一致：level 3 → n≥15, eff≥0.95；2 → n≥5, eff≥0.8；1 → n<5
  const empStats = [];
  skills.forEach((s) => opsAll.forEach((o) => { const lv = s.levels[o]; if (!lv) return; const n = lv === 3 ? 15 + Math.floor(R() * 20) : lv === 2 ? 5 + Math.floor(R() * 9) : 1 + Math.floor(R() * 3); const eff = lv === 3 ? r2(0.95 + R() * 0.08) : lv === 2 ? r2(0.8 + R() * 0.14) : r2(0.6 + R() * 0.18); empStats.push({ emp: s.emp, op: o, n, effMed: eff }); }));

  // 排班：本周（含明日）× 线 × 班；每班 crew 人（够则轮换，不够则少排）
  const dates = []; for (let i = 0; i < 5; i++) dates.push(addDays(WEEK_START, i));
  const roster = [], leaders = emps.filter((e) => e.job === 'leader' || e.job === 'mgr');
  const pool = {}; lines.forEach((l) => { pool[l.id] = skills.filter((s) => s.home === l.id).map((s) => s.emp); });
  lines.forEach((l, li) => {
    const shifts = shiftsOf(l);
    dates.forEach((dt, di) => {
      if (isRest(dt)) return;
      const loadTomorrow = S.lines.filter((x) => x.id === l.id)[0];
      if (loadTomorrow && loadTomorrow.load7 === 0) return; // 未来无负荷的线不排班（如冲压线 B）
      shifts.forEach((sh, si) => {
        const p = pool[l.id]; if (!p.length) return;
        const take = Math.min(l.crew, p.length);
        const start = (di * shifts.length + si) * take;
        const list = []; for (let i = 0; i < take; i++) list.push(p[(start + i) % p.length]);
        roster.push({ date: dt, shift: sh, line: l.id, leader: leaders.length ? leaders[(li + si) % leaders.length].id : null, emps: list, planned: true });
      });
    });
  });

  // 12 周按产品 × 工序的工时统计（中位数围绕标准工时按 stdDev 偏离；换型中位数）
  const stdStats = [];
  products.forEach((p) => p.route.forEach((r) => {
    const dev = devOf(p.id, r.op), stable = Math.abs(dev) >= 0.1 ? true : R() < 0.8;
    const n = stable ? 8 + Math.floor(R() * 20) : 3 + Math.floor(R() * 4);
    const med = r6(r.hoursPerUnit * (1 + dev)), half = stable ? 0.06 + R() * 0.05 : 0.14 + R() * 0.1;
    stdStats.push({ product: p.id, op: r.op, line: r.line, std: r.hoursPerUnit, n, median: med, p25: r6(med * (1 - half)), p75: r6(med * (1 + half)), setupN: n, setupMedian: r0(r.setupHours * 60 * (0.55 + R() * 0.2)) });
  }));

  // 本周报工：每线每班 1–2 批；批量按一个班的工时反推；异常 4 条
  const machines = cfg.machines.map(([id, line]) => ({ id, line }));
  const machOf = (line) => machines.filter((m) => m.line === line);
  const wr = cfg.wr || ['等料', '等前道', '等检', '等工装'];
  const waitReasons = (key === 'make' ? ['等料', '等前道', '等检', '等工装'] : key === 'flow' ? ['等货', '等前道', '等复核', '等包材'] : ['等资料', '等前道', '等复核', '等模板']);
  const openOrders = S.orders.filter((o) => o.status !== 'done');
  const reports = []; let rid = 0; const machCount = {};
  const nextRid = () => 'RP-' + TODAY.slice(5).replace('-', '') + '-' + pad(++rid);
  const reportDates = dates.slice(0, 4); // 周一到周四（今日只有白班）
  const spcHits = [];
  lines.forEach((l) => {
    const shifts = shiftsOf(l);
    const ordersOnLine = openOrders.filter((o) => o.ops.some((p) => p.line === l.id));
    if (!ordersOnLine.length) return;
    let k = 0;
    reportDates.forEach((dt, di) => {
      if (isRest(dt)) return;
      shifts.forEach((sh) => {
        if (dt === TODAY && sh === 'B') return;
        const slots = roster.filter((x) => x.date === dt && x.shift === sh && x.line === l.id)[0];
        if (!slots) return;
        const nb = l.id === cfg.constraint ? 2 : (R() < 0.35 ? 2 : 1);
        for (let b = 0; b < nb; b++) {
          const o = ordersOnLine[k++ % ordersOnLine.length];
          const opx = o.ops.filter((p) => p.line === l.id)[0];
          const std = stdOf(o.product, opx.op); if (!std) continue;
          const hoursShare = (l.capHoursPerDay / shifts.length) / nb * (0.75 + R() * 0.2);
          const qty = Math.max(1, r0(hoursShare / std / (nb === 2 ? 1 : 1)));
          const dev = devOf(o.product, opx.op);
          const runMin = r0(qty * std * 60 * (1 + dev) * (0.96 + R() * 0.08));
          const setupMin = b === 0 || R() < 0.5 ? r0((routeOf(o.product, opx.op).setupHours * 60) * (0.5 + R() * 0.3)) : 0;
          const wi = R() < 0.3 ? Math.floor(R() * 4) : -1;
          const waitMin = wi >= 0 ? r0(20 + R() * 90) : 0;
          const m = machOf(l.id); machCount[l.id] = (machCount[l.id] || 0); const mach = m.length ? m[machCount[l.id]++ % m.length].id : null;
          const emp = slots.emps[(k + b) % slots.emps.length];
          const rw = Math.max(0, r0(qty * (0.01 + R() * 0.025)));
          const startMin = (sh === 'A' ? 8 * 60 : 16 * 60) + b * r0((l.capHoursPerDay / shifts.length) * 60 / nb);
          reports.push({ id: nextRid(), date: dt, shift: sh, line: l.id, machine: mach, op: opx.op, order: o.id, product: o.product, emp, qtyGood: qty - rw, qtyRework: rw, runMin, setupMin, waitMin, waitReason: wi >= 0 ? waitReasons[wi] : null, firstPieceOk: true, startMin, endMin: startMin + runMin + setupMin + waitMin, source: R() < 0.85 ? 'scan' : 'manual', verified: true, std });
        }
      });
    });
  });
  // 异常 2：漏报 —— 排班已有、线上有工单的一个班次整班移出（内核按 线/日/班 无报工判定）
  const missSlot = roster.filter((x) => x.date === reportDates[2] && x.line === cfg.releaseLine)[0];
  let missing = null;
  if (missSlot) { for (let i = reports.length - 1; i >= 0; i--) { const r = reports[i]; if (r.date === missSlot.date && r.shift === missSlot.shift && r.line === missSlot.line) { const x = reports.splice(i, 1)[0]; if (!missing) missing = x; } } }
  // 异常 1：偏离 —— 一条 runMin 放大 1.45
  const a1 = reports.filter((r) => r.line !== cfg.constraint).slice(2)[0];
  a1.runMin = r0(a1.runMin * 1.45); a1.endMin = a1.startMin + a1.runMin + a1.setupMin + a1.waitMin; a1.verified = false;
  // 异常 3：重复 —— 复制一条（同 order / op / shift / qty）
  const dup = reports.filter((r) => r.line === cfg.releaseLine && r.verified)[0];
  const dupRow = Object.assign({}, dup, { id: nextRid(), verified: false, source: 'manual' }); reports.push(dupRow);
  // 数量守恒：同一批次的下道工序本周累计不超过前道本周累计（前道本周有报工才约束）
  S.orders.forEach((o) => {
    const ops = o.ops.map((p) => p.op);
    for (let i = 1; i < ops.length; i++) {
      const prev = reports.filter((q) => q.order === o.id && q.op === ops[i - 1]), cur = reports.filter((q) => q.order === o.id && q.op === ops[i]);
      if (!prev.length || !cur.length) continue;
      const prevQ = prev.reduce((a, q) => a + q.qtyGood + q.qtyRework, 0), curQ = cur.reduce((a, q) => a + q.qtyGood + q.qtyRework, 0);
      if (curQ > prevQ) { const f = Math.max(0.05, prevQ / curQ) * 0.97; cur.forEach((q) => { const tot = q.qtyGood + q.qtyRework; const nt = Math.max(1, Math.floor(tot * f)); q.qtyRework = Math.min(q.qtyRework, Math.floor(nt * 0.03)); q.qtyGood = nt - q.qtyRework; q.runMin = Math.max(10, r0(q.runMin * nt / tot)); q.endMin = q.startMin + q.runMin + q.setupMin + q.waitMin; }); }
    }
  });
  // 异常 4：数量守恒 —— 一条下道工序本周累计报工超过前道累计完工
  const consv = reports.filter((r) => { const o = S.orders.filter((x) => x.id === r.order)[0]; const i = o.ops.findIndex((p) => p.op === r.op); return i > 0 && r.id !== a1.id && r.id !== dupRow.id && reports.some((q) => q.order === r.order && q.op === o.ops[i - 1].op); })[0];
  if (consv) { const o = S.orders.filter((x) => x.id === consv.order)[0]; const i = o.ops.findIndex((p) => p.op === consv.op); const prevQty = reports.filter((q) => q.order === consv.order && q.op === o.ops[i - 1].op).reduce((a, q) => a + q.qtyGood + q.qtyRework, 0); const tot = consv.qtyGood + consv.qtyRework; if (tot <= prevQty) { const add = prevQty - tot + Math.max(1, r0(prevQty * 0.12)); consv.qtyGood += add; consv.runMin = r0(consv.runMin * (consv.qtyGood + consv.qtyRework) / tot); } consv.verified = false; }
  reports.sort((a, b) => (a.date + a.shift + pad(a.startMin / 60 | 0)).localeCompare(b.date + b.shift + pad(b.startMin / 60 | 0)));
  // SPC：约束线一台设备最近三批一次合格率跌破 12 周均值的 3σ 下限，且都在换型后、首件未确认（按内核口径算下限）
  const spcAll = reports.filter((r) => r.machine === cfg.spcMachine);
  const spcRows = spcAll.slice(-3), pbar = cfg.weekly11.fpy / 100;
  const avgN = spcAll.length ? spcAll.reduce((a, r) => a + r.qtyGood + r.qtyRework, 0) / spcAll.length : cfg.batchN;
  const lcl = pbar - 3 * Math.sqrt(pbar * (1 - pbar) / Math.max(1, avgN));
  spcHits.length = 0;
  spcRows.forEach((r, i) => { const old = r.qtyGood + r.qtyRework; const tot = Math.max(old, key === 'service' ? 40 : 200); if (tot !== old) { r.runMin = r0(r.runMin * tot / old); r.endMin = r.startMin + r.runMin + r.setupMin + r.waitMin; } const rate = Math.max(0.5, lcl - 0.02 - 0.005 * i); r.qtyRework = Math.ceil(tot * (1 - rate)); r.qtyGood = tot - r.qtyRework; r.firstPieceOk = false; r.setupMin = r.setupMin || 30; spcHits.push(r.id); });
  // 单件工时判异：约束线那名 1 级操作者的一条已核验报工超过 12 周中位 + 3σ（但不到 30% 偏离）
  const lv1 = constraintEmps.length > 2 ? constraintEmps[constraintEmps.length - 1].emp : null;
  if (lv1) {
    // 挑一条 12 周中位数接近标准的产品 × 工序，把它的四分位距收紧，再让这条报工超过中位 + 3.5σ（仍在 30% 偏离阈值之内）
    const cands = reports.filter((r) => r.line === cfg.constraint && r.verified && spcHits.indexOf(r.id) < 0 && r.waitMin === 0).map((r) => ({ r, ss: stdStats.filter((x) => x.product === r.product && x.op === r.op)[0] })).filter((x) => x.ss && Math.abs(x.ss.median - x.ss.std) / x.ss.std < 0.06).sort((a, b) => Math.abs(a.ss.median - a.ss.std) - Math.abs(b.ss.median - b.ss.std));
    if (cands.length) { const slow = cands[0].r, ss = cands[0].ss; ss.p25 = r6(ss.median * 0.96); ss.p75 = r6(ss.median * 1.04); ss.n = Math.max(ss.n, 10); const sig = (ss.p75 - ss.p25) / 1.35; slow.emp = lv1; const n = slow.qtyGood + slow.qtyRework; slow.runMin = r0(n * (ss.median + 3.5 * sig) * 60); slow.endMin = slow.startMin + slow.runMin + slow.setupMin + slow.waitMin; }
  }
  // 等待超时：优先挑前道负荷低于 60% 的线（根因 = 前道派工不足），否则用等检（根因 = 首件检查前移）
  const stageOrder = (() => { const pos = {}; products.forEach((p) => p.route.forEach((r, i) => { pos[r.line] = (pos[r.line] || 0) + i; })); return lines.map((l) => l.id).sort((a, b) => (pos[a] || 0) - (pos[b] || 0)); })();
  const loadOf = (id) => (S.lines.filter((x) => x.id === id)[0] || { load7: 100 }).load7;
  let wl = null;
  for (const lid of stageOrder) { const idx = stageOrder.indexOf(lid); if (lid === cfg.constraint || lid === cfg.releaseLine || idx === 0) continue; if (loadOf(stageOrder[idx - 1]) < 60) { wl = reports.filter((r) => r.line === lid && r.verified && spcHits.indexOf(r.id) < 0).slice(-1)[0]; if (wl) break; } }
  let wlReason = waitReasons[1];
  if (!wl) { wl = reports.filter((r) => r.line !== cfg.constraint && r.line !== cfg.releaseLine && r.verified && spcHits.indexOf(r.id) < 0).slice(-1)[0]; wlReason = waitReasons[2]; }
  if (wl) { wl.waitMin = 252; wl.waitReason = wlReason; wl.endMin = wl.startMin + wl.runMin + wl.setupMin + wl.waitMin; }

  // 今日约束线批次（8 个）：来自约束线上未完工的订单，产品按 cfg 顺序交错
  const lotsOrders = openOrders.filter((o) => o.ops.some((p) => p.line === cfg.constraint && !p.done));
  const jobsToday = [];
  cfg.jobProducts.forEach((pid, i) => {
    const o = lotsOrders.filter((x) => x.product === pid)[i % Math.max(1, lotsOrders.filter((x) => x.product === pid).length)] || lotsOrders[i % lotsOrders.length];
    const opx = o.ops.filter((p) => p.line === cfg.constraint)[0];
    const qty = Math.max(1, r0(o.qty * (0.2 + R() * 0.2)));
    jobsToday.push({ id: 'B-' + TODAY.slice(5).replace('-', '') + '-' + pad(i + 1), order: o.id, product: o.product, op: opx.op, qty, dueDay: Math.max(0, o.dueDay), fixture: cfg.fixtures[o.product].fixture, program: cfg.fixtures[o.product].program });
  });
  // 保证前两个批次里有交期紧的（dueDay ≤ 1）
  jobsToday[1].dueDay = Math.min(jobsToday[1].dueDay, 1);

  // 12 周时间损失（按线）与本周逐日
  const weeks = []; for (let w = 11; w >= 0; w--) weeks.push(addDays(WEEK_START, -7 * w));
  const lossWeekly = [], lossToday = [];
  const wrKeys = waitReasons;
  lines.forEach((l) => {
    const isB = l.id === cfg.constraint, prof = isB ? cfg.lossBottleneck : cfg.lossOther;
    const scale = l.capHoursPerDay / 16;
    weeks.forEach((wk, wi) => {
      const trend = isB ? 1.12 - 0.012 * wi : 1.0; // 约束线换型逐周略降
      const row = { week: wk, line: l.id, plannedMin: l.capHoursPerDay * 60 * workdaysPerWeek, setupMin: r0(prof.setup * 60 * workdaysPerWeek * trend * scale * (0.95 + R() * 0.1)), downMin: r0(prof.down * 60 * workdaysPerWeek * scale * (0.7 + R() * 0.6)), waitMin: {}, speedMin: r0(prof.speed * 60 * workdaysPerWeek * scale * (0.8 + R() * 0.4)), reworkMin: r0(prof.rework * 60 * workdaysPerWeek * scale * (0.8 + R() * 0.4)) };
      wrKeys.forEach((k2, i) => { row.waitMin[k2] = r0(prof.wait[i] * 60 * workdaysPerWeek * scale * (0.8 + R() * 0.4)); });
      lossWeekly.push(row);
    });
    reportDates.forEach((dt) => {
      if (isRest(dt)) return;
      const frac = dt === TODAY ? 0.5 : 1;
      const row = { date: dt, line: l.id, plannedMin: r0(l.capHoursPerDay * 60 * frac), setupMin: r0(prof.setup * 60 * scale * frac * (0.9 + R() * 0.2)), downMin: r0(prof.down * 60 * scale * frac * (0.6 + R() * 0.8)), waitMin: {}, speedMin: r0(prof.speed * 60 * scale * frac * (0.8 + R() * 0.4)), reworkMin: r0(prof.rework * 60 * scale * frac * (0.8 + R() * 0.4)) };
      wrKeys.forEach((k2, i) => { row.waitMin[k2] = r0(prof.wait[i] * 60 * scale * frac * (0.8 + R() * 0.4)); });
      lossToday.push(row);
    });
  });

  // 设备：运行时长、保养周期、工装寿命、本周停机事件、12 周停机次数
  const machinesOut = machines.map((m, i) => {
    const isDue = m.id === cfg.dueMachine;
    const row = { id: m.id, line: m.line, cumRunH: isDue ? 486 : 120 + Math.floor(R() * 300), pmIntervalH: 500, pmMinutes: key === 'service' ? 60 : 120, tooling: key === 'make' && m.line === cfg.constraint ? { id: cfg.fixtures[cfg.jobProducts[0]].fixture, usedUnits: isDue ? 46000 : 12000 + Math.floor(R() * 20000), lifeUnits: 50000 } : null, downEvents: [], stops12w: [] };
    for (let w = 0; w < 12; w++) row.stops12w.push(Math.floor(R() * 2) + (isDue && w >= 10 ? 2 : 0));
    if (isDue) row.downEvents = [{ date: reportDates[2], fromMin: 9 * 60 + 40, toMin: 10 * 60 + 25, reason: cfg.downReason }, { date: reportDates[3], fromMin: 8 * 60 + 15, toMin: 8 * 60 + 47, reason: cfg.downReason }, { date: reportDates[3], fromMin: 10 * 60 + 50, toMin: 11 * 60 + 30, reason: cfg.downReason }];
    else if (R() < 0.3) row.downEvents = [{ date: reportDates[Math.floor(R() * 3)], fromMin: 13 * 60, toMin: 13 * 60 + 20 + Math.floor(R() * 30), reason: (key === 'make' ? ['程序', '工装', '电气'] : key === 'flow' ? ['输送线', '扫描枪', '电气'] : ['模板', '网络', '账号'])[Math.floor(R() * 3)] }];
    return row;
  });

  // 今日小时节拍达成（白班）：每线计划与逐小时累计实际
  const planHit = [];
  lines.forEach((l) => {
    const Sl = S.lines.filter((x) => x.id === l.id)[0]; if (!Sl || Sl.load7 === 0) return;
    const used = Sl.days[0].used; if (!used) return;
    const hpu = (() => { const rs = []; products.forEach((p) => p.route.forEach((r) => { if (r.line === l.id) rs.push(r.hoursPerUnit); })); return rs.reduce((a, b) => a + b, 0) / rs.length; })();
    const planUnits = r0(Math.min(used, l.capHoursPerDay / shiftsOf(l).length) * (l.eff || 1) / hpu);
    const hourly = []; let cum = 0; const behind = l.id === cfg.spare;
    for (let hh = 1; hh <= 4; hh++) { const ratio = behind && hh === 1 ? 0.45 : behind && hh === 2 ? 0.55 : 0.85 + R() * 0.25; cum += planUnits / 8 * ratio; hourly.push(r0(cum)); }
    planHit.push({ line: l.id, shift: 'A', plan: planUnits, hours: hourly, elapsedH: 4 });
  });

  // 12 周周指标
  const weekly = weeks.map((wk, i) => {
    const t = i / 11, w0 = cfg.weekly0, w1 = cfg.weekly11, mix = (a, b, jit) => r1(a + (b - a) * t + (R() - 0.5) * jit);
    const lw = lossWeekly.filter((x) => x.week === wk);
    const setupH = r1(lw.reduce((a, x) => a + x.setupMin, 0) / 60), waitH = r1(lw.reduce((a, x) => a + Object.values(x.waitMin).reduce((s, v) => s + v, 0), 0) / 60), downH = r1(lw.reduce((a, x) => a + x.downMin, 0) / 60);
    return { week: wk, flowDays: mix(w0.flowDays, w1.flowDays, 0.3), balanceRate: r0(56 + 6 * t + (R() - 0.5) * 4), effUtil: mix(w0.effUtil, w1.effUtil, 1.5), wipDays: mix(w0.wipDays, w1.wipDays, 0.2), fpy: mix(w0.fpy, w1.fpy, 0.3), otHours: r0(w0.otHours + (w1.otHours - w0.otHours) * t + (R() - 0.5) * 10), setupH, waitH, downH, output: r0(w0.output + (w1.output - w0.output) * t + (R() - 0.5) * w0.output * 0.04), planHit: r0(w0.planHit + (w1.planHit - w0.planHit) * t + (R() - 0.5) * 4) };
  });
  const wipHistory = weeks.map((wk, i) => ({ week: wk, units: r0(cfg.wipUnits0 * (1.1 - 0.02 * i) * (0.95 + R() * 0.1)) }));

  const V = JSON.parse(fs.readFileSync(path.join(here, 'data', 'vocab.json'), 'utf8'))[key];
  return {
    archetype: key, company: erp.company, dept: V.dept, today: TODAY, weekStart: WEEK_START, erpKey: cfg.erp,
    sources: [
      { id: 'route', name: '工艺路线与标准工时', mode: 'direct', lastSync: TODAY + ' 07:30', rows: products.reduce((a, p) => a + p.route.length, 0) },
      { id: 'report', name: V.reports, mode: 'direct', lastSync: TODAY + ' 12:00', rows: reports.length },
      { id: 'machine', name: V.machine + '运行记录', mode: 'import', lastSync: TODAY + ' 07:00', rows: machinesOut.length },
      { id: 'roster', name: '班组排班', mode: 'import', lastSync: addDays(TODAY, -1) + ' 18:00', rows: roster.length }
    ],
    constraintExpected: cfg.constraint, spareLine: cfg.spare, releaseLine: cfg.releaseLine, supportIds, spcMachine: cfg.spcMachine, dueMachine: cfg.dueMachine,
    shiftHours: 8, otCap: { month: 36, day: 3 }, buffers: { [cfg.constraint]: { capDays: 1.5 } },
    fixtures: cfg.fixtures, setupMatrix: cfg.setupMatrix, setupSteps: cfg.setupSteps, firstPieceItems: cfg.firstPieceItems,
    spare: { line: cfg.spare, capPerPerson: cfg.spareCapPerPerson, effTo: cfg.spareEffTo, defaultSupport: cfg.spareSupport }, lunchH: cfg.lunchH, firstPieceMinPerSetup: cfg.firstPieceMinPerSetup,
    employees: emps, skills, empStats, roster, reports, missingSlot: missing ? { date: missing.date, shift: missing.shift, line: missing.line, order: missing.order, op: missing.op, product: missing.product, suggestQty: missing.qtyGood + missing.qtyRework, suggestRunMin: missing.runMin } : null,
    stdStats, lossWeekly, lossToday, machines: machinesOut, planHit, jobsToday, weekly, wipHistory,
    facts: { bottleneck: dec.facts.bottleneck, overtimeOver: dec.facts.cncOvertime },
    // 内存态写回（原型刷新即重置）
    focus: null, focusLoss: null, verified: {}, adopted: {}, releasePlan: null, jobSeq: null, projects: [], ledger: [], exceptions: {}, dispatch: null, maintenance: [], training: [], log: []
  };
}

['make', 'flow', 'service'].forEach((k) => {
  const s = build(k);
  const out = path.join(here, 'data', 'samples', CFG[k].file + '.json');
  fs.writeFileSync(out, JSON.stringify(s, null, 1));
  console.log(k, '→', path.relative(here, out), 'reports', s.reports.length, 'emps', s.employees.length, 'roster', s.roster.length, 'jobs', s.jobsToday.length, 'support', s.supportIds.join('/'), 'missing', !!s.missingSlot);
});
