// 跑四套样例 → examples/*.output.json（改内核或数据后先跑），并打印摘要
const fs = require('fs');
const path = require('path');
const core = require('../core/compute.js');
const data = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
const m2ex = path.join(__dirname, '..', '..', '02-scene-ranking', 'examples');
const P = (n) => JSON.parse(fs.readFileSync(path.join(m2ex, n + '.input.json'), 'utf8')).profile;

// 四套覆盖不同的收益杠杆与投入档，确保报告与 golden 有代表性
const CASES = {
  S1: { profile: P('S1'),
        plan: { sceneId: 'mfg-s01', tier: 'adv', seats: 3, diagnosisDays: 1, customBudget: 20000,
                dataState: 'excel', setupPeople: 2, setupSalary: 7500 },
        gain: { errorFreqMonthly: 4.3, errorCostPerCase: 5000, opsPeople: 2, opsHoursPerDay: 1, opsSalary: 7000 } },
  S2: { profile: P('S2'),
        plan: { sceneId: 'trade-s01', tier: 'std', seats: 2, diagnosisDays: 0, customBudget: 0,
                dataState: 'excel', setupPeople: 1, setupSalary: 6500 },
        gain: { dealsMonthly: 60, dealValue: 8000, grossMargin: 0.15, opsPeople: 2, opsHoursPerDay: 2, opsSalary: 6000 } },
  S3: { profile: P('S3'),
        plan: { sceneId: 'life-s06', tier: 'std', seats: 2, diagnosisDays: 0, customBudget: 8000,
                dataState: 'paper', setupPeople: 1, setupSalary: 5500 },
        gain: { opsPeople: 3, opsHoursPerDay: 1.5, opsSalary: 5500 } },
  S4: { profile: P('S4'),
        plan: { sceneId: 'trade-s05', tier: 'flag', seats: 5, diagnosisDays: 1, privateDeploy: 'base',
                customBudget: 60000, dataState: 'system', setupPeople: 3, setupSalary: 11000 },
        gain: { errorFreqMonthly: 11, errorCostPerCase: 3000, tiedCapital: 4000000,
                opsPeople: 4, opsHoursPerDay: 2, opsSalary: 8000 } }
};

fs.mkdirSync(dir, { recursive: true });
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).replace(/[一-龥]/g, 'xx').length));
Object.keys(CASES).sort().forEach((k) => {
  const input = CASES[k];
  fs.writeFileSync(path.join(dir, k + '.input.json'), JSON.stringify(input, null, 2) + '\n');
  const out = core.compute(input, data);
  if (!out.ok) { console.error(k, '校验失败', out.errors); process.exitCode = 1; return; }
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`${k}  ${pad(out.profile.name, 26)} ${pad(out.scene.name, 20)} 杠杆 ${pad(out.levers.join('+'), 18)}`);
  console.log(`    现金支出 ${pad(out.invest.cashYear1 + ' 元', 12)} 现金收益 ${pad(out.benefit.cashMonthly + ' 元/月', 14)} 工时 ${pad(out.benefit.hoursMonthly + ' 元/月', 12)}`);
  console.log(`    回本：现金 ${pad(out.payback || '>24', 5)} 含工时 ${pad(out.paybackAll || '>24', 5)} 月 · ROI12 ${pad((out.roi && out.roi.roi12) + '%', 9)} 置信 ${out.confidence.score} ${out.confidence.name}`);
  console.log(`    ${out.verdict.headline}`);
});
