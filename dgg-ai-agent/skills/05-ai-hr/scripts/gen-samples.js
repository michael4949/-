// 生成三套样本（制造主样本沿用杭州锐合：人数、工资总额、社保基数与 AI CFO 账套一致；在招岗位呼应 ERP 的 CNC 瓶颈、法务的华南子公司、获客的华南客户）
// 员工为逐人记录（工号 + 岗位，不出现姓名），由固定种子生成；合规问题刻意埋在少数人身上
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'data', 'samples');
const JOBS = require('../data/jobs.json').jobs;
const cfoDir = path.join(__dirname, '..', '..', '06-ai-cfo', 'data', 'samples');
const cfo = (k) => JSON.parse(fs.readFileSync(path.join(cfoDir, k + '.json'), 'utf8'));
const W = (n, o) => fs.writeFileSync(path.join(out, n), JSON.stringify(o, null, 2) + '\n');
function rng(seed) { let a = seed >>> 0; return function () { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DAY = 86400000;
const ms = (s) => { const p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
const iso = (t) => { const d = new Date(t); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };
const addD = (s, n) => iso(ms(s) + n * DAY);
const addY = (s, y) => { const p = s.split('-'); return (+p[0] + y) + '-' + p[1] + '-' + p[2]; };
const TODAY = '2026-09-17';

function buildEmployees(seed, depts, opts) {
  const R = rng(seed); const emps = []; let n = 0;
  depts.forEach((dp) => {
    dp.jobs.forEach(([job, count]) => {
      for (let i = 0; i < count; i++) {
        n++; const id = 'E-' + String(n).padStart(3, '0'); const J = JOBS[job];
        // 入职年份：偏向近年，少量老员工
        const r = R(); const yearsAgo = r < 0.28 ? R() * 1 : r < 0.55 ? 1 + R() * 2 : r < 0.8 ? 3 + R() * 3 : 6 + R() * 8;
        const hire = addD(TODAY, -Math.round(yearsAgo * 365.25 + R() * 20));
        const tenureY = (ms(TODAY) - ms(hire)) / DAY / 365.25;
        const wageBase = J.band[0] + (J.band[1] - J.band[0]) * Math.min(1, 0.15 + tenureY * 0.09 + R() * 0.35);
        const contractYears = J.family === 'ops' ? (R() < 0.75 ? 3 : 1) : 3;
        // 合同周期：从入职起按期续签，取当前这一期
        let cStart = hire; while (ms(addY(cStart, contractYears)) < ms(TODAY)) cStart = addY(cStart, contractYears);
        const e = { id, dept: dp.id, job, family: J.family, hireDate: hire, gender: R() < (J.family === 'ops' ? 0.72 : 0.5) ? 'M' : 'F', birthYear: 2026 - Math.round(22 + tenureY + R() * 22), edu: J.family === 'tech' || J.family === 'func' ? (R() < 0.6 ? 'college' : 'bachelor') : (R() < 0.7 ? 'secondary' : 'college'),
          wage: Math.round(wageBase / 100) * 100, contract: { type: 'fixed', years: contractYears, start: cStart, end: addY(cStart, contractYears), probationMonths: contractYears >= 3 ? (J.family === 'ops' ? 2 : 3) : 1, signed: true, noncompete: false, noncompeteComp: false }, socialBase: 0, injuryInsured: true, overtimeH: J.family === 'ops' ? Math.round(12 + R() * 22) : Math.round(R() * 10), annualDue: tenureY >= 1 ? (tenureY < 10 ? 5 : tenureY < 20 ? 10 : 15) : 0, annualUsed: 0, status: 'active', dispatch: false, disabled: false, leaveEnd: null };
        e.annualUsed = e.annualDue ? Math.round(e.annualDue * (J.family === 'ops' ? R() * 0.6 : 0.3 + R() * 0.6)) : 0;
        if (J.family === 'tech' && opts.noncompeteJobs.indexOf(job) >= 0) { e.contract.noncompete = true; e.contract.noncompeteComp = false; }
        emps.push(e);
      }
    });
  });
  return emps;
}
function finish(emps, opts, seed) {
  const R = rng(seed + 7);
  // 工资总额、社保基数总额对齐 CFO 账套；基数落在 [min(工资, 地区下限), 工资] 之间
  const gross = emps.reduce((t, e) => t + e.wage, 0);
  const k = opts.gross / gross; emps.forEach((e) => { e.wage = Math.round(e.wage * k / 10) * 10; });
  let diff = opts.gross - emps.reduce((t, e) => t + e.wage, 0); emps[0].wage += diff;
  const r = emps.map(() => 0.3 + R() * 0.7);
  // 下限取地区下限与「目标 ÷ 人数 × 0.95」的较小者，保证总额可达（账套里的基数总额低于下限 × 人数时按后者）
  const floor = Math.min(opts.baseFloor, Math.floor(opts.socialBase / emps.length * 0.95 / 10) * 10);
  const lo = emps.map((e) => Math.min(e.wage, floor)), span = emps.map((e, i) => e.wage - lo[i]);
  const t = (opts.socialBase - lo.reduce((a, b) => a + b, 0)) / span.reduce((a, x, i) => a + x * r[i], 0);
  emps.forEach((e, i) => { e.socialBase = Math.round((lo[i] + span[i] * Math.min(1, Math.max(0, r[i] * t))) / 10) * 10; });
  diff = opts.socialBase - emps.reduce((t2, e) => t2 + e.socialBase, 0);
  for (let i = 0; diff !== 0 && i < emps.length; i++) { const step = diff > 0 ? Math.min(emps[i].wage - emps[i].socialBase, diff) : Math.max(lo[i] - emps[i].socialBase, diff); emps[i].socialBase += step; diff -= step; }
  return { emps, wageIndex: Math.round(k * 100) / 100 };
}
function leavers(seed, depts, count, months) {
  const R = rng(seed + 3); const list = []; const reasons = ['薪酬', '发展空间', '家庭 / 异地', '管理与班次', '其他'];
  for (let i = 0; i < count; i++) {
    const dp = depts[Math.min(depts.length - 1, Math.floor(Math.pow(R(), 1.6) * depts.length))]; const job = dp.jobs[Math.floor(R() * dp.jobs.length)][0];
    const m = months[Math.floor(R() * months.length)]; const day = 1 + Math.floor(R() * 27);
    list.push({ id: 'L-' + String(i + 1).padStart(3, '0'), dept: dp.id, job, date: m + '-' + String(day).padStart(2, '0'), reason: reasons[Math.floor(Math.pow(R(), 1.3) * reasons.length)], tenureMonths: Math.round(2 + Math.pow(R(), 1.5) * 60) });
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
const MONTHS12 = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
function scaleExpected(cands, k) { cands.forEach((c) => { c.expected = Math.round(c.expected * k / 100) * 100; }); return cands; }
function cand(id, needId, o) { return Object.assign({ id, needId, stage: 'new', source: 'site', certs: [], industries: [], scores: null, interviewDate: null, offer: null }, o); }

/* ---------------- 制造 · 杭州锐合 ---------------- */
(function () {
  const C = cfo('mfg'), P = C.external.payroll;
  const depts = [
    { id: 'prod', name: '生产部', budget: 94, jobs: [['leader', 8], ['cut-op', 6], ['stamp-op', 24], ['cnc', 14], ['heat-op', 4], ['plating-op', 10], ['assembler', 24]] },
    { id: 'qc', name: '品质部', budget: 12, jobs: [['qc', 12]] },
    { id: 'tech', name: '技术工艺部', budget: 20, jobs: [['process-eng', 8], ['rd-eng', 6], ['mold', 5]] },
    { id: 'maint', name: '设备部', budget: 6, jobs: [['maint', 6]] },
    { id: 'wh', name: '仓储物流', budget: 8, jobs: [['store', 8]] },
    { id: 'buy', name: '采购部', budget: 5, jobs: [['buyer', 5]] },
    { id: 'sales', name: '销售部', budget: 18, jobs: [['sales-rep', 12], ['sales-key', 4]] },
    { id: 'cs', name: '客服跟单', budget: 4, jobs: [['cs', 4]] },
    { id: 'fin', name: '财务部', budget: 4, jobs: [['acct', 4]] },
    { id: 'hr', name: '行政人事', budget: 4, jobs: [['hr-admin', 4]] }
  ];
  let emps = buildEmployees(2026, depts, { noncompeteJobs: ['process-eng', 'rd-eng'] });
  // 刻意埋的合规问题
  const byJob = (job) => emps.filter((e) => e.job === job);
  const late = byJob('assembler').slice(0, 3); late.forEach((e, i) => { e.hireDate = ['2026-08-03', '2026-08-05', '2026-08-10'][i]; e.contract = { type: 'fixed', years: 3, start: e.hireDate, end: addY(e.hireDate, 3), probationMonths: 2, signed: false, noncompete: false, noncompeteComp: false }; e.injuryInsured = false; e.annualDue = 0; e.annualUsed = 0; e.wage = 5400; });   // H01 / H11
  const prob = byJob('stamp-op').slice(0, 2); prob.forEach((e, i) => { e.hireDate = ['2026-07-06', '2026-07-20'][i]; e.contract = { type: 'fixed', years: 1, start: e.hireDate, end: addY(e.hireDate, 1), probationMonths: 3, signed: true, noncompete: false, noncompeteComp: false }; e.annualDue = 0; e.annualUsed = 0; e.wage = 5800; });   // H03
  const ends = [45, 12, 28, 55, 20]; byJob('stamp-op').slice(4, 9).forEach((e, i) => { e.contract.end = addD(TODAY, ends[i]); e.contract.start = addY(e.contract.end, -e.contract.years); });   // H02
  const cncs = byJob('cnc'); cncs.forEach((e, i) => { e.overtimeH = i < 8 ? 38 + i * 2 : 20 + i; });   // H06：CNC 缺员，8 人超 36 小时
  byJob('stamp-op').slice(10, 13).forEach((e, i) => { e.overtimeH = 40 + i * 3; });
  byJob('assembler').slice(8, 20).forEach((e) => { e.dispatch = true; e.contract.type = 'dispatch'; });   // 派遣 12 人 = 7.1%，未超
  const mat = byJob('qc')[3]; mat.gender = 'F'; mat.status = 'maternity'; mat.leaveEnd = '2027-05-20'; mat.contract.end = '2026-11-10'; mat.contract.start = addY('2026-11-10', -3);   // H10
  byJob('store')[1].disabled = true;   // H09：1 人，按 1.5% 应 2.52
  const fin = finish(emps, { gross: P.gross[P.gross.length - 1], socialBase: P.socialBase[P.socialBase.length - 1], baseFloor: 4462 }, 2026); emps = fin.emps;
  const needs = [
    { id: 'R-2609-01', job: 'cnc', dept: 'prod', count: 4, dueDate: '2026-10-20', reason: 'CNC 车铣中心负荷长期超 90%，两班加班超限，排产延期单集中在该工序', status: 'open', publishedVariant: null, publishedAt: null },
    { id: 'R-2609-02', job: 'process-eng', dept: 'tech', count: 1, dueDate: '2026-11-15', reason: '新品试制与工艺文件积压，老师傅经验需要沉淀成作业指导书', status: 'open', publishedVariant: null, publishedAt: null },
    { id: 'R-2609-03', job: 'sales-south', dept: 'sales', count: 2, dueDate: '2026-11-30', reason: '华南客户年采购额已超 500 万元，华南子公司十月启动，需要驻地销售', status: 'open', publishedVariant: null, publishedAt: null }
  ];
  const cands = [
    // CNC 14 人
    cand('C-2609-001', 'R-2609-01', { edu: 'secondary', years: 6, skills: ['cnc-op', 'measure', 'fanuc', 'gcode'], industries: ['mfg'], lastTenureMonths: 38, jobs5y: 2, expected: 8500, availableDays: 7, distanceKm: 6, age: 31, source: 'referral', stage: 'interview', interviewDate: '2026-09-19' }),
    cand('C-2609-002', 'R-2609-01', { edu: 'secondary', years: 4, skills: ['cnc-op', 'measure', 'siemens'], industries: ['mfg'], lastTenureMonths: 26, jobs5y: 2, expected: 7800, availableDays: 14, distanceKm: 12, age: 28, source: 'site', stage: 'done', interviewDate: '2026-09-15', scores: { pro: 4, coop: 4, stable: 3, value: 4 } }),
    cand('C-2609-003', 'R-2609-01', { edu: 'secondary', years: 8, skills: ['cnc-op', 'measure', 'fanuc', 'cam', 'cad'], industries: ['mfg', 'auto'], lastTenureMonths: 60, jobs5y: 1, expected: 9500, availableDays: 30, distanceKm: 9, age: 35, source: 'site', stage: 'interview', interviewDate: '2026-09-22' }),
    cand('C-2609-004', 'R-2609-01', { edu: 'secondary', years: 1, skills: ['cnc-op'], industries: ['mfg'], lastTenureMonths: 8, jobs5y: 3, expected: 7000, availableDays: 3, distanceKm: 4, age: 23, source: 'school' }),
    cand('C-2609-005', 'R-2609-01', { edu: 'college', years: 3, skills: ['cnc-op', 'measure', 'gcode'], industries: ['mfg'], lastTenureMonths: 20, jobs5y: 2, expected: 8000, availableDays: 10, distanceKm: 18, age: 27, source: 'site' }),
    cand('C-2609-006', 'R-2609-01', { edu: 'secondary', years: 5, skills: ['cnc-op', 'measure'], industries: ['mfg'], lastTenureMonths: 14, jobs5y: 4, expected: 8200, availableDays: 7, distanceKm: 8, age: 30, source: 'site' }),
    cand('C-2609-007', 'R-2609-01', { edu: 'secondary', years: 3, skills: ['cnc-op', 'fanuc'], industries: ['mfg'], lastTenureMonths: 30, jobs5y: 1, expected: 7600, availableDays: 45, distanceKm: 10, age: 26, source: 'site' }),
    cand('C-2609-008', 'R-2609-01', { edu: 'secondary', years: 10, skills: ['cnc-op', 'measure', 'fanuc', 'siemens', 'gcode'], industries: ['mfg'], lastTenureMonths: 84, jobs5y: 1, expected: 10500, availableDays: 20, distanceKm: 25, age: 39, source: 'headhunter' }),
    cand('C-2609-009', 'R-2609-01', { edu: 'secondary', years: 2, skills: ['cnc-op', 'measure'], industries: ['mfg'], lastTenureMonths: 24, jobs5y: 1, expected: 7000, availableDays: 7, distanceKm: 5, age: 24, source: 'referral' }),
    cand('C-2609-010', 'R-2609-01', { edu: 'secondary', years: 4, skills: ['cnc-op', 'measure', 'fanuc'], industries: ['mfg'], lastTenureMonths: 36, jobs5y: 1, expected: 8300, availableDays: 7, distanceKm: 7, age: 29, source: 'return' }),
    cand('C-2609-011', 'R-2609-01', { edu: 'secondary', years: 7, skills: ['cnc-op', 'gcode'], industries: ['other'], lastTenureMonths: 18, jobs5y: 3, expected: 9000, availableDays: 15, distanceKm: 30, age: 33, source: 'site' }),
    cand('C-2609-012', 'R-2609-01', { edu: 'secondary', years: 0, skills: ['measure'], industries: [], lastTenureMonths: 0, jobs5y: 0, expected: 6000, availableDays: 1, distanceKm: 3, age: 20, source: 'school' }),
    cand('C-2609-013', 'R-2609-01', { edu: 'college', years: 5, skills: ['cnc-op', 'measure', 'cam', 'cad'], industries: ['mfg'], lastTenureMonths: 40, jobs5y: 1, expected: 8800, availableDays: 14, distanceKm: 11, age: 30, source: 'site' }),
    cand('C-2609-014', 'R-2609-01', { edu: 'secondary', years: 3, skills: ['cnc-op', 'measure'], industries: ['mfg'], lastTenureMonths: 10, jobs5y: 3, expected: 7500, availableDays: 5, distanceKm: 14, age: 27, source: 'site' }),
    // 工艺工程师 7 人
    cand('C-2609-015', 'R-2609-02', { edu: 'bachelor', years: 6, skills: ['process-doc', 'cad', 'stamping', 'lean', 'trial'], industries: ['mfg', 'auto'], lastTenureMonths: 48, jobs5y: 1, expected: 13000, availableDays: 30, distanceKm: 15, age: 32, source: 'headhunter', stage: 'interview', interviewDate: '2026-09-24' }),
    cand('C-2609-016', 'R-2609-02', { edu: 'college', years: 4, skills: ['process-doc', 'cad', 'cam'], industries: ['mfg'], lastTenureMonths: 30, jobs5y: 2, expected: 11000, availableDays: 14, distanceKm: 8, age: 29, source: 'site' }),
    cand('C-2609-017', 'R-2609-02', { edu: 'bachelor', years: 2, skills: ['process-doc', 'cad'], industries: ['mfg'], lastTenureMonths: 24, jobs5y: 1, expected: 10000, availableDays: 7, distanceKm: 20, age: 26, source: 'school' }),
    cand('C-2609-018', 'R-2609-02', { edu: 'college', years: 9, skills: ['process-doc', 'stamping', 'mold', 'trial'], industries: ['mfg'], lastTenureMonths: 72, jobs5y: 1, expected: 14500, availableDays: 45, distanceKm: 12, age: 36, source: 'site' }),
    cand('C-2609-019', 'R-2609-02', { edu: 'bachelor', years: 5, skills: ['cad', 'lean'], industries: ['other'], lastTenureMonths: 16, jobs5y: 3, expected: 12000, availableDays: 14, distanceKm: 9, age: 31, source: 'site' }),
    cand('C-2609-020', 'R-2609-02', { edu: 'college', years: 3, skills: ['process-doc', 'cad', 'stamping'], industries: ['mfg'], lastTenureMonths: 36, jobs5y: 1, expected: 10500, availableDays: 10, distanceKm: 6, age: 28, source: 'referral' }),
    cand('C-2609-021', 'R-2609-02', { edu: 'master', years: 1, skills: ['cad', 'cam', 'trial'], industries: ['mfg'], lastTenureMonths: 12, jobs5y: 1, expected: 12500, availableDays: 30, distanceKm: 22, age: 27, source: 'school' }),
    // 华南销售 9 人
    cand('C-2609-022', 'R-2609-03', { edu: 'college', years: 6, skills: ['b2b', 'quote', 'south', 'auto-cust', 'crm'], industries: ['mfg', 'auto'], lastTenureMonths: 42, jobs5y: 1, expected: 12000, availableDays: 30, distanceKm: 0, age: 33, source: 'headhunter', stage: 'done', interviewDate: '2026-09-12', scores: { pro: 5, coop: 4, stable: 4, value: 4 } }),
    cand('C-2609-023', 'R-2609-03', { edu: 'college', years: 4, skills: ['b2b', 'quote', 'energy-cust'], industries: ['mfg', 'energy'], lastTenureMonths: 28, jobs5y: 2, expected: 11000, availableDays: 14, distanceKm: 0, age: 30, source: 'site' }),
    cand('C-2609-024', 'R-2609-03', { edu: 'bachelor', years: 3, skills: ['b2b', 'crm'], industries: ['trade'], lastTenureMonths: 20, jobs5y: 2, expected: 10000, availableDays: 7, distanceKm: 0, age: 28, source: 'site' }),
    cand('C-2609-025', 'R-2609-03', { edu: 'college', years: 8, skills: ['b2b', 'quote', 'south', 'crm'], industries: ['mfg'], lastTenureMonths: 12, jobs5y: 4, expected: 14000, availableDays: 7, distanceKm: 0, age: 36, source: 'site' }),
    cand('C-2609-026', 'R-2609-03', { edu: 'secondary', years: 5, skills: ['b2b', 'south'], industries: ['mfg'], lastTenureMonths: 36, jobs5y: 1, expected: 9000, availableDays: 14, distanceKm: 0, age: 32, source: 'referral' }),
    cand('C-2609-027', 'R-2609-03', { edu: 'college', years: 3, skills: ['b2b', 'quote', 'export'], industries: ['mfg'], lastTenureMonths: 34, jobs5y: 1, expected: 9500, availableDays: 20, distanceKm: 0, age: 27, source: 'site' }),
    cand('C-2609-028', 'R-2609-03', { edu: 'bachelor', years: 2, skills: ['crm', 'quote'], industries: ['tech'], lastTenureMonths: 18, jobs5y: 1, expected: 9000, availableDays: 10, distanceKm: 0, age: 25, source: 'school' }),
    cand('C-2609-029', 'R-2609-03', { edu: 'college', years: 7, skills: ['b2b', 'quote', 'south', 'auto-cust', 'energy-cust'], industries: ['mfg', 'auto', 'energy'], lastTenureMonths: 55, jobs5y: 1, expected: 15500, availableDays: 60, distanceKm: 0, age: 35, source: 'headhunter' }),
    cand('C-2609-030', 'R-2609-03', { edu: 'college', years: 4, skills: ['b2b', 'quote', 'crm'], industries: ['mfg'], lastTenureMonths: 24, jobs5y: 2, expected: 10500, availableDays: 14, distanceKm: 0, age: 29, source: 'return' })
  ];
  W('mfg.json', {
    archetype: 'make', sector: 'mfg', company: C.company, co: '锐合', today: TODAY, weekStart: '2026-09-14', overtimeMonth: '2026-08',
    profile: { industry: 'mfg-machinery', size: '101_300', province: '浙江', city: '杭州', founded: 2012, revenue12: C.ledger.pl.rev.reduce((a, b) => a + b, 0), product: '精密五金件与冲压件', lines: '八条产线：下料、冲压 A / B、CNC 车铣、热处理、电镀、装配包装', customers: '汽配、家电、储能设备', region: '华南', hotAllowancePaid: true, hotJobsDepts: ['prod', 'maint'], wageIndex: fin.wageIndex },
    sources: [
      { id: 'hr', name: '人事系统 · 花名册与合同', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 168 },
      { id: 'payroll', name: '工资表 · 8 月', mode: 'import', lastSync: '2026-09-10 18:00', rows: 168 },
      { id: 'attendance', name: '考勤 · 8 月工时与加班', mode: 'import', lastSync: '2026-09-05 18:00', rows: 168 },
      { id: 'recruit', name: '招聘渠道导入 · 简历', mode: 'import', lastSync: '2026-09-16 18:00', rows: 30 },
      { id: 'social', name: '社保公积金申报表', mode: 'import', lastSync: '2026-09-08 18:00', rows: 168 }
    ],
    departments: depts.map((d) => ({ id: d.id, name: d.name, budget: d.budget })),
    employees: emps, leavers: leavers(2026, depts, 28, MONTHS12.slice(0, 11)),
    needs, candidates: scaleExpected(cands, fin.wageIndex), resolved: {}, plan: null, log: []
  });
})();

/* ---------------- 贸易 · 义乌恒益 ---------------- */
(function () {
  const C = cfo('trade'), P = C.external.payroll;
  const depts = [
    { id: 'ops', name: '运营部', budget: 16, jobs: [['ecom-op', 10], ['live-host', 4]] },
    { id: 'wh', name: '仓储配送', budget: 27, jobs: [['picker', 14], ['delivery', 10]] },
    { id: 'buy', name: '采购部', budget: 7, jobs: [['merchandiser', 6]] },
    { id: 'cs', name: '客服部', budget: 8, jobs: [['cs-trade', 8]] },
    { id: 'fin', name: '财务部', budget: 3, jobs: [['acct', 3]] },
    { id: 'hr', name: '行政人事', budget: 3, jobs: [['hr-admin', 3]] },
    { id: 'mgmt', name: '管理层', budget: 4, jobs: [['mgr', 4]] }
  ];
  let emps = buildEmployees(1993, depts, { noncompeteJobs: [] });
  const byJob = (job) => emps.filter((e) => e.job === job);
  byJob('delivery').slice(0, 7).forEach((e) => { e.dispatch = true; e.contract.type = 'dispatch'; });   // H08：7 / 62 = 11.3%
  byJob('delivery').slice(7, 10).forEach((e, i) => { e.hireDate = ['2026-06-08', '2026-07-01', '2026-08-15'][i]; e.contract = { type: 'fixed', years: 1, start: e.hireDate, end: addY(e.hireDate, 1), probationMonths: 3, signed: i < 2, noncompete: false, noncompeteComp: false }; e.injuryInsured = i < 2; e.annualDue = 0; e.annualUsed = 0; });   // H03 ×3、H01 / H11 ×1
  byJob('picker').slice(0, 4).forEach((e, i) => { e.contract.end = addD(TODAY, [9, 30, 41, 58][i]); e.contract.start = addY(e.contract.end, -e.contract.years); });   // H02
  byJob('picker').slice(4, 10).forEach((e, i) => { e.overtimeH = 37 + i * 2; });   // H06：大促备货
  byJob('delivery').forEach((e) => { e.overtimeH = Math.max(e.overtimeH, 30); });
  const fin = finish(emps, { gross: P.gross[P.gross.length - 1], socialBase: P.socialBase[P.socialBase.length - 1], baseFloor: 4462 }, 1993); emps = fin.emps;
  const needs = [
    { id: 'R-2609-01', job: 'ecom-op', dept: 'ops', count: 2, dueDate: '2026-10-15', reason: '四季度大促与新平台开店，运营人手不足', status: 'open', publishedVariant: null, publishedAt: null },
    { id: 'R-2609-02', job: 'delivery', dept: 'wh', count: 3, dueDate: '2026-10-10', reason: '华南分公司十月启动，门店配送线路增加；派遣比例已超 10%，改直签', status: 'open', publishedVariant: null, publishedAt: null },
    { id: 'R-2609-03', job: 'merchandiser', dept: 'buy', count: 1, dueDate: '2026-11-10', reason: '进口日化线增加供应商，跟单积压', status: 'open', publishedVariant: null, publishedAt: null }
  ];
  const cands = [
    cand('C-2609-001', 'R-2609-01', { edu: 'college', years: 4, skills: ['ecom', 'data', 'ads', 'live'], industries: ['trade'], lastTenureMonths: 30, jobs5y: 2, expected: 9000, availableDays: 14, distanceKm: 5, age: 28, source: 'site', stage: 'done', interviewDate: '2026-09-14', scores: { pro: 4, coop: 5, stable: 4, value: 4 } }),
    cand('C-2609-002', 'R-2609-01', { edu: 'college', years: 2, skills: ['ecom', 'data'], industries: ['trade'], lastTenureMonths: 22, jobs5y: 1, expected: 7500, availableDays: 7, distanceKm: 8, age: 25, source: 'referral', stage: 'interview', interviewDate: '2026-09-20' }),
    cand('C-2609-003', 'R-2609-01', { edu: 'bachelor', years: 6, skills: ['ecom', 'ads', 'data'], industries: ['trade', 'tech'], lastTenureMonths: 14, jobs5y: 3, expected: 12000, availableDays: 30, distanceKm: 20, age: 31, source: 'site' }),
    cand('C-2609-004', 'R-2609-01', { edu: 'secondary', years: 3, skills: ['ecom', 'live'], industries: ['trade'], lastTenureMonths: 18, jobs5y: 2, expected: 7000, availableDays: 3, distanceKm: 6, age: 26, source: 'site' }),
    cand('C-2609-005', 'R-2609-01', { edu: 'college', years: 1, skills: ['ecom'], industries: ['other'], lastTenureMonths: 10, jobs5y: 1, expected: 6500, availableDays: 7, distanceKm: 12, age: 23, source: 'school' }),
    cand('C-2609-006', 'R-2609-01', { edu: 'college', years: 5, skills: ['ecom', 'data', 'ads'], industries: ['trade'], lastTenureMonths: 40, jobs5y: 1, expected: 9800, availableDays: 20, distanceKm: 9, age: 30, source: 'return' }),
    cand('C-2609-007', 'R-2609-02', { edu: 'secondary', years: 3, skills: ['driving', 'coldchain'], certs: ['driving'], industries: ['trade', 'logi'], lastTenureMonths: 26, jobs5y: 2, expected: 6500, availableDays: 5, distanceKm: 10, age: 34, source: 'site', stage: 'interview', interviewDate: '2026-09-19' }),
    cand('C-2609-008', 'R-2609-02', { edu: 'secondary', years: 5, skills: ['driving', 'wms'], certs: ['driving'], industries: ['logi'], lastTenureMonths: 44, jobs5y: 1, expected: 6800, availableDays: 7, distanceKm: 15, age: 38, source: 'referral' }),
    cand('C-2609-009', 'R-2609-02', { edu: 'secondary', years: 1, skills: ['driving'], certs: ['driving'], industries: ['other'], lastTenureMonths: 6, jobs5y: 3, expected: 6000, availableDays: 1, distanceKm: 4, age: 24, source: 'site' }),
    cand('C-2609-010', 'R-2609-02', { edu: 'secondary', years: 2, skills: [], certs: [], industries: ['trade'], lastTenureMonths: 20, jobs5y: 1, expected: 5500, availableDays: 3, distanceKm: 7, age: 27, source: 'site' }),
    cand('C-2609-011', 'R-2609-02', { edu: 'secondary', years: 8, skills: ['driving', 'coldchain', 'forklift'], certs: ['driving', 'forklift'], industries: ['logi', 'trade'], lastTenureMonths: 60, jobs5y: 1, expected: 7200, availableDays: 14, distanceKm: 18, age: 41, source: 'site' }),
    cand('C-2609-012', 'R-2609-02', { edu: 'secondary', years: 2, skills: ['driving'], certs: ['driving'], industries: ['trade'], lastTenureMonths: 15, jobs5y: 2, expected: 6200, availableDays: 7, distanceKm: 6, age: 29, source: 'referral' }),
    cand('C-2609-013', 'R-2609-02', { edu: 'secondary', years: 4, skills: ['driving', 'wms'], certs: ['driving'], industries: ['logi'], lastTenureMonths: 33, jobs5y: 1, expected: 6600, availableDays: 10, distanceKm: 22, age: 36, source: 'site' }),
    cand('C-2609-014', 'R-2609-03', { edu: 'college', years: 3, skills: ['purchase', 'office', 'supplier'], industries: ['trade'], lastTenureMonths: 28, jobs5y: 2, expected: 7500, availableDays: 14, distanceKm: 8, age: 28, source: 'site' }),
    cand('C-2609-015', 'R-2609-03', { edu: 'college', years: 5, skills: ['purchase', 'office', 'export', 'data'], industries: ['trade'], lastTenureMonths: 45, jobs5y: 1, expected: 8500, availableDays: 30, distanceKm: 11, age: 31, source: 'headhunter' }),
    cand('C-2609-016', 'R-2609-03', { edu: 'secondary', years: 6, skills: ['purchase', 'supplier'], industries: ['trade'], lastTenureMonths: 24, jobs5y: 2, expected: 7000, availableDays: 7, distanceKm: 5, age: 33, source: 'referral' }),
    cand('C-2609-017', 'R-2609-03', { edu: 'college', years: 1, skills: ['office'], industries: ['other'], lastTenureMonths: 9, jobs5y: 1, expected: 6000, availableDays: 3, distanceKm: 9, age: 24, source: 'school' }),
    cand('C-2609-018', 'R-2609-03', { edu: 'bachelor', years: 4, skills: ['purchase', 'office', 'data'], industries: ['trade', 'mfg'], lastTenureMonths: 36, jobs5y: 1, expected: 8200, availableDays: 14, distanceKm: 14, age: 29, source: 'site' })
  ];
  W('trade.json', {
    archetype: 'flow', sector: 'trade', company: C.company, co: '恒益', today: TODAY, weekStart: '2026-09-14', overtimeMonth: '2026-08',
    profile: { industry: 'trade-wholesale', size: '51_100', province: '浙江', city: '义乌', founded: 2019, revenue12: C.ledger.pl.rev.reduce((a, b) => a + b, 0), product: '日用百货与进口日化的批发与电商零售', lines: '三个平台店铺、两个直播间、一个 3,000 ㎡ 中心仓', customers: '连锁便利店、社区团购、平台消费者', region: '华南', hotAllowancePaid: false, hotJobsDepts: ['wh'], wageIndex: fin.wageIndex },
    sources: [
      { id: 'hr', name: '人事系统 · 花名册与合同', mode: 'import', lastSync: '2026-09-15 18:00', rows: 62 },
      { id: 'payroll', name: '工资表 · 8 月', mode: 'import', lastSync: '2026-09-10 18:00', rows: 62 },
      { id: 'attendance', name: '考勤 · 8 月工时与加班', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 62 },
      { id: 'recruit', name: '招聘渠道导入 · 简历', mode: 'import', lastSync: '2026-09-16 18:00', rows: 18 }
    ],
    departments: depts.map((d) => ({ id: d.id, name: d.name, budget: d.budget })),
    employees: emps, leavers: leavers(1993, depts, 16, MONTHS12.slice(0, 11)),
    needs, candidates: scaleExpected(cands, fin.wageIndex), resolved: {}, plan: null, log: []
  });
})();

/* ---------------- 服务 · 成都启元 ---------------- */
(function () {
  const C = cfo('prof'), P = C.external.payroll;
  const depts = [
    { id: 'acct', name: '代账部', budget: 27, jobs: [['acct-agent', 24]] },
    { id: 'tax', name: '税务咨询', budget: 6, jobs: [['tax-consult', 5]] },
    { id: 'client', name: '客户部', budget: 8, jobs: [['cust-mgr', 7]] },
    { id: 'audit', name: '审计部', budget: 4, jobs: [['audit-asst', 4]] },
    { id: 'hr', name: '行政人事', budget: 3, jobs: [['hr-admin', 3]] },
    { id: 'fin', name: '财务', budget: 1, jobs: [['acct', 1]] },
    { id: 'mgmt', name: '管理层', budget: 2, jobs: [['mgr', 2]] }
  ];
  let emps = buildEmployees(2016, depts, { noncompeteJobs: ['tax-consult'] });
  const byJob = (job) => emps.filter((e) => e.job === job);
  byJob('acct-agent').slice(0, 10).forEach((e, i) => { e.overtimeH = 36 + i * 3; });   // H06：申报期
  byJob('acct-agent').slice(10, 13).forEach((e, i) => { e.contract.end = addD(TODAY, [15, 33, 50][i]); e.contract.start = addY(e.contract.end, -e.contract.years); });   // H02
  const nu = byJob('acct-agent')[13]; nu.hireDate = '2026-08-01'; nu.contract = { type: 'fixed', years: 3, start: nu.hireDate, end: addY(nu.hireDate, 3), probationMonths: 3, signed: false, noncompete: false, noncompeteComp: false }; nu.injuryInsured = false; nu.annualDue = 0; nu.annualUsed = 0;   // H01 / H11
  const mat = byJob('cust-mgr')[2]; mat.gender = 'F'; mat.status = 'maternity'; mat.leaveEnd = '2027-03-30'; mat.contract.end = '2026-12-20'; mat.contract.start = addY('2026-12-20', -3);   // H10
  const fin = finish(emps, { gross: P.gross[P.gross.length - 1], socialBase: P.socialBase[P.socialBase.length - 1], baseFloor: 4071 }, 2016); emps = fin.emps;
  const needs = [
    { id: 'R-2609-01', job: 'acct-agent', dept: 'acct', count: 3, dueDate: '2026-10-25', reason: '客户数已超 1,100 户，人均 50 户以上，申报期加班超限；高新分公司十月启动', status: 'open', publishedVariant: null, publishedAt: null },
    { id: 'R-2609-02', job: 'tax-consult', dept: 'tax', count: 1, dueDate: '2026-11-20', reason: '高价值客户咨询需求增加，顾问带教代账团队', status: 'open', publishedVariant: null, publishedAt: null },
    { id: 'R-2609-03', job: 'cust-mgr', dept: 'client', count: 1, dueDate: '2026-11-05', reason: '客户经理三期休假，续费季需要补位', status: 'open', publishedVariant: null, publishedAt: null }
  ];
  const cands = [
    cand('C-2609-001', 'R-2609-01', { edu: 'college', years: 3, skills: ['bookkeeping', 'tax-filing', 'erp-fin'], certs: ['junior-acct'], industries: ['prof'], lastTenureMonths: 30, jobs5y: 1, expected: 6800, availableDays: 14, distanceKm: 8, age: 27, source: 'site', stage: 'done', interviewDate: '2026-09-15', scores: { pro: 4, coop: 4, stable: 4, value: 5 } }),
    cand('C-2609-002', 'R-2609-01', { edu: 'college', years: 1, skills: ['bookkeeping', 'tax-filing'], certs: ['junior-acct'], industries: ['prof'], lastTenureMonths: 12, jobs5y: 1, expected: 5800, availableDays: 7, distanceKm: 5, age: 24, source: 'school', stage: 'interview', interviewDate: '2026-09-21' }),
    cand('C-2609-003', 'R-2609-01', { edu: 'college', years: 5, skills: ['bookkeeping', 'tax-filing', 'client', 'erp-fin'], certs: ['junior-acct'], industries: ['prof'], lastTenureMonths: 20, jobs5y: 3, expected: 7800, availableDays: 10, distanceKm: 12, age: 31, source: 'site' }),
    cand('C-2609-004', 'R-2609-01', { edu: 'secondary', years: 4, skills: ['bookkeeping'], certs: [], industries: ['prof'], lastTenureMonths: 40, jobs5y: 1, expected: 6000, availableDays: 3, distanceKm: 6, age: 30, source: 'referral' }),
    cand('C-2609-005', 'R-2609-01', { edu: 'bachelor', years: 2, skills: ['bookkeeping', 'tax-filing', 'office'], certs: ['junior-acct'], industries: ['other'], lastTenureMonths: 24, jobs5y: 1, expected: 6500, availableDays: 14, distanceKm: 18, age: 26, source: 'site' }),
    cand('C-2609-006', 'R-2609-01', { edu: 'college', years: 6, skills: ['bookkeeping', 'tax-filing', 'erp-fin', 'client'], certs: ['junior-acct'], industries: ['prof'], lastTenureMonths: 55, jobs5y: 1, expected: 7500, availableDays: 30, distanceKm: 9, age: 33, source: 'return' }),
    cand('C-2609-007', 'R-2609-01', { edu: 'college', years: 0, skills: ['office'], certs: [], industries: [], lastTenureMonths: 0, jobs5y: 0, expected: 5000, availableDays: 1, distanceKm: 4, age: 22, source: 'school' }),
    cand('C-2609-008', 'R-2609-01', { edu: 'college', years: 3, skills: ['bookkeeping', 'tax-filing'], certs: ['junior-acct'], industries: ['prof'], lastTenureMonths: 8, jobs5y: 4, expected: 7200, availableDays: 5, distanceKm: 7, age: 29, source: 'site' }),
    cand('C-2609-009', 'R-2609-01', { edu: 'college', years: 2, skills: ['bookkeeping', 'tax-filing', 'erp-fin'], certs: ['junior-acct'], industries: ['prof'], lastTenureMonths: 26, jobs5y: 1, expected: 6300, availableDays: 14, distanceKm: 10, age: 25, source: 'referral' }),
    cand('C-2609-010', 'R-2609-02', { edu: 'bachelor', years: 7, skills: ['tax-plan', 'tax-filing', 'audit', 'client'], certs: ['tax-agent'], industries: ['prof'], lastTenureMonths: 50, jobs5y: 1, expected: 13500, availableDays: 30, distanceKm: 14, age: 34, source: 'headhunter', stage: 'interview', interviewDate: '2026-09-23' }),
    cand('C-2609-011', 'R-2609-02', { edu: 'bachelor', years: 4, skills: ['tax-plan', 'tax-filing'], certs: [], industries: ['prof'], lastTenureMonths: 30, jobs5y: 2, expected: 11000, availableDays: 14, distanceKm: 8, age: 30, source: 'site' }),
    cand('C-2609-012', 'R-2609-02', { edu: 'master', years: 5, skills: ['tax-plan', 'tax-filing', 'audit', 'erp-fin'], certs: ['tax-agent', 'cpa'], industries: ['prof', 'fin'], lastTenureMonths: 36, jobs5y: 1, expected: 16000, availableDays: 45, distanceKm: 20, age: 32, source: 'headhunter' }),
    cand('C-2609-013', 'R-2609-02', { edu: 'college', years: 9, skills: ['tax-filing', 'bookkeeping', 'client'], certs: ['junior-acct'], industries: ['prof'], lastTenureMonths: 60, jobs5y: 1, expected: 10000, availableDays: 14, distanceKm: 6, age: 37, source: 'referral' }),
    cand('C-2609-014', 'R-2609-03', { edu: 'college', years: 3, skills: ['client', 'office', 'crm'], industries: ['prof'], lastTenureMonths: 28, jobs5y: 2, expected: 7500, availableDays: 7, distanceKm: 5, age: 27, source: 'site' }),
    cand('C-2609-015', 'R-2609-03', { edu: 'college', years: 5, skills: ['client', 'office', 'bookkeeping', 'data'], industries: ['prof', 'fin'], lastTenureMonths: 44, jobs5y: 1, expected: 9000, availableDays: 14, distanceKm: 11, age: 31, source: 'referral' }),
    cand('C-2609-016', 'R-2609-03', { edu: 'bachelor', years: 1, skills: ['office'], industries: ['other'], lastTenureMonths: 10, jobs5y: 1, expected: 6500, availableDays: 3, distanceKm: 8, age: 24, source: 'school' })
  ];
  W('prof.json', {
    archetype: 'service', sector: 'prof', company: C.company, co: '启元', today: TODAY, weekStart: '2026-09-14', overtimeMonth: '2026-08',
    profile: { industry: 'prof-accounting', size: '21_50', province: '四川', city: '成都', founded: 2016, revenue12: C.ledger.pl.rev.reduce((a, b) => a + b, 0), product: '代理记账、税务咨询与审计服务', lines: '代账流水线 4 个班组，服务 1,100 余户客户', customers: '小微企业、个体工商户、园区企业', region: '成都高新区', hotAllowancePaid: true, hotJobsDepts: [], wageIndex: fin.wageIndex },
    sources: [
      { id: 'hr', name: '人事系统 · 花名册与合同', mode: 'import', lastSync: '2026-09-15 18:00', rows: 46 },
      { id: 'payroll', name: '工资表 · 8 月', mode: 'import', lastSync: '2026-09-10 18:00', rows: 46 },
      { id: 'attendance', name: '考勤 · 8 月工时与加班', mode: 'import', lastSync: '2026-09-05 18:00', rows: 46 },
      { id: 'recruit', name: '招聘渠道导入 · 简历', mode: 'import', lastSync: '2026-09-16 18:00', rows: 16 }
    ],
    departments: depts.map((d) => ({ id: d.id, name: d.name, budget: d.budget })),
    employees: emps, leavers: leavers(2016, depts, 11, MONTHS12.slice(0, 11)),
    needs, candidates: scaleExpected(cands, fin.wageIndex), resolved: {}, plan: null, log: []
  });
})();
console.log('samples written: mfg / trade / prof');
