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
  // S1 借它演示规模推导：套数、诊断天数、另议项都不填，由 investment-profile.json 按规模与场景投入档取参考值
  S1: { profile: P('S1'),
        plan: { sceneId: 'mfg-s01', tier: 'adv', dataState: 'excel', setupPeople: 2, setupSalary: 7500 },
        gain: { errorFreqMonthly: 6, errorCostPerCase: 8000, opsPeople: 3, opsHoursPerDay: 2, opsSalary: 7500 } },
  // S2 企业自报套数与另议项，演示填报值覆盖参考值
  S2: { profile: P('S2'),
        plan: { sceneId: 'trade-s01', tier: 'std', seats: 4, diagnosisDays: 1, customBudget: 12000,
                dataState: 'excel', setupPeople: 1, setupSalary: 6500 },
        gain: { dealsMonthly: 60, dealValue: 8000, grossMargin: 0.15, opsPeople: 2, opsHoursPerDay: 2, opsSalary: 6000 } },
  // S3 纸质台账的连锁餐饮，历史数据整理占另议项的大头；收益以非现金工时为主
  S3: { profile: P('S3'),
        plan: { sceneId: 'life-s06', tier: 'std', dataState: 'paper', setupPeople: 1, setupSalary: 5500 },
        gain: { opsPeople: 5, opsHoursPerDay: 2, opsSalary: 5500 } },
  // S4 1–5 亿营收电商，IT 有编制，企业自报较大预算并选私域部署
  S4: { profile: P('S4'),
        plan: { sceneId: 'trade-s05', tier: 'flag', seats: 12, diagnosisDays: 1, privateDeploy: 'top',
                customBudget: 180000, dataState: 'system', setupPeople: 3, setupSalary: 11000 },
        gain: { errorFreqMonthly: 14, errorCostPerCase: 4500, tiedCapital: 6000000,
                opsPeople: 5, opsHoursPerDay: 2.5, opsSalary: 8500 } }
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
