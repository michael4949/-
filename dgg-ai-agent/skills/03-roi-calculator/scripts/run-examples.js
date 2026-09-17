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
  // S1 制造业整体立项：生产计划 + 销售前端 + 质量管理 + 成本核算，四个场景一次上线
  //    套数、诊断天数、另议项都不填，由 investment-profile.json 按规模与组合推导
  S1: { profile: P('S1'),
        scenes: [
          { sceneId: 'mfg-s01', gain: { errorFreqMonthly: 6, errorCostPerCase: 8000, opsPeople: 3, opsHoursPerDay: 2, opsSalary: 7500 } },
          { sceneId: 'mfg-s03', gain: { dealsMonthly: 28, dealValue: 62000, grossMargin: 0.22 } },
          { sceneId: 'mfg-s05', gain: { errorFreqMonthly: 9, errorCostPerCase: 4200, opsPeople: 4, opsHoursPerDay: 1.5, opsSalary: 6800 } },
          { sceneId: 'mfg-s08', gain: { relatedRevenueMonthly: 4200000 } }
        ],
        plan: { tier: 'adv', dataState: 'excel', setupPeople: 2, setupSalary: 7500 } },
  // S2 小微批发：两个轻量场景，企业自报账号数与另议项，演示填报值覆盖参考值
  S2: { profile: P('S2'),
        scenes: [
          { sceneId: 'trade-s01', gain: { dealsMonthly: 60, dealValue: 8000, grossMargin: 0.15 } },
          { sceneId: 'trade-s03', gain: { dealsMonthly: 18, dealValue: 26000, grossMargin: 0.15 } }
        ],
        plan: { tier: 'std', seats: 5, diagnosisDays: 1, customBudget: 26000,
                dataState: 'excel', setupPeople: 1, setupSalary: 6500 } },
  // S3 连锁餐饮：三个场景全部只命中人工工时节约，现金口径不可能转正——刻意保留的反例
  S3: { profile: P('S3'),
        scenes: [
          { sceneId: 'life-s06', gain: { opsPeople: 5, opsHoursPerDay: 2, opsSalary: 5500 } },
          { sceneId: 'life-s08', gain: { opsPeople: 4, opsHoursPerDay: 1, opsSalary: 5200 } }
        ],
        plan: { tier: 'std', dataState: 'paper', setupPeople: 1, setupSalary: 5500 } },
  // S4 中型电商：五个场景跨销售、仓储、库存、客户经营，企业自报较大预算并选私域部署
  S4: { profile: P('S4'),
        scenes: [
          { sceneId: 'trade-s05', gain: { errorFreqMonthly: 14, errorCostPerCase: 4500, tiedCapital: 6000000 } },
          { sceneId: 'trade-s06', gain: { errorFreqMonthly: 22, errorCostPerCase: 1800 } },
          { sceneId: 'trade-s02', gain: { dealsMonthly: 900, dealValue: 480, grossMargin: 0.35 } },
          { sceneId: 'trade-s04', gain: { dealsMonthly: 1400, dealValue: 390, grossMargin: 0.35 } },
          { sceneId: 'trade-s08', gain: { errorFreqMonthly: 16, errorCostPerCase: 2200, opsPeople: 5, opsHoursPerDay: 2.5, opsSalary: 8500 } }
        ],
        plan: { tier: 'flag', seats: 24, diagnosisDays: 2, privateDeploy: 'top',
                customBudget: 420000, dataState: 'system', setupPeople: 3, setupSalary: 11000 } }
};

fs.mkdirSync(dir, { recursive: true });
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).replace(/[一-龥]/g, 'xx').length));
Object.keys(CASES).sort().forEach((k) => {
  const input = CASES[k];
  fs.writeFileSync(path.join(dir, k + '.input.json'), JSON.stringify(input, null, 2) + '\n');
  const out = core.compute(input, data);
  if (!out.ok) { console.error(k, '校验失败', out.errors); process.exitCode = 1; return; }
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`${k}  ${pad(out.profile.name, 26)} ${out.portfolio.count} 个场景 ${pad(out.portfolio.scenes.map((s) => s.name).join('、'), 46)}`);
  console.log(`    现金支出 ${pad(out.invest.cashYear1 + ' 元', 12)} 现金收益 ${pad(out.benefit.cashMonthly + ' 元/月', 14)} 工时 ${pad(out.benefit.hoursMonthly + ' 元/月', 12)}`);
  console.log(`    回本：现金 ${pad(out.payback || '>24', 5)} 含工时 ${pad(out.paybackAll || '>24', 5)} 月 · ROI12 ${pad((out.roi && out.roi.roi12) + '%', 9)} 置信 ${out.confidence.score} ${out.confidence.name}`);
  console.log(`    ${out.verdict.headline}`);
});
