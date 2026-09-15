// 同行参考带 v0（估算版）：12 行业 × 5 规模 = 60 格 × 六维 [low, high]
// 业务侧抽样到位后整体替换 data/benchmark.json；_meta.basis 会从 estimated 改为 sampled。
const fs = require('fs');
const path = require('path');
// 六维顺序：战略 数据 流程 人员 预算 合规 —— 每行业一组中心值（0–6 分制）
const prior = {
  'mfg-discrete': [2.5, 3.0, 3.0, 2.0, 2.5, 2.5],
  'mfg-process':  [2.5, 3.5, 3.5, 2.0, 2.5, 3.0],
  'trade':        [2.0, 2.5, 2.0, 2.0, 2.0, 2.0],
  'ecom':         [3.0, 3.5, 2.5, 3.0, 3.0, 2.5],
  'frs':          [2.0, 2.5, 2.5, 2.0, 2.0, 1.5],
  'prof':         [2.5, 3.0, 3.0, 2.5, 2.5, 3.0],
  'build':        [1.5, 2.0, 2.5, 1.5, 2.0, 2.5],
  'med':          [2.5, 3.0, 3.0, 2.0, 2.5, 3.5],
  'edu':          [2.5, 2.5, 2.0, 2.5, 2.0, 2.0],
  'logi':         [2.5, 3.0, 3.0, 2.0, 2.5, 2.5],
  'tech':         [3.5, 4.0, 3.0, 4.0, 3.5, 3.0],
  'agri':         [1.5, 2.0, 2.0, 1.5, 1.5, 2.0]
};
const sizeShift = { '1_20': -0.5, '21_50': -0.25, '51_100': 0, '101_300': 0.5, '300_plus': 1.0 };
const dims = ['strategy', 'data', 'process', 'people', 'budget', 'compliance'];
const clamp = (n) => Math.max(0, Math.min(6, n));
const out = { _meta: { basis: 'estimated', version: '0.1', note: '开发侧估算，业务侧抽样到位后替换；缺失格由 core 按相邻规模插值' } };
for (const ind of Object.keys(prior)) {
  for (const sz of Object.keys(sizeShift)) {
    const cell = {};
    dims.forEach((d, i) => {
      const c = prior[ind][i] + sizeShift[sz];
      cell[d] = [clamp(Math.round(c - 0.9)), clamp(Math.round(c + 1.1))];
    });
    out[`${ind}-${sz}`] = cell;
  }
}
// 规格文档 docs/03 给出的示例格，按原文锁定
out['mfg-discrete-51_100'] = { strategy: [2, 4], data: [3, 5], process: [2, 4], people: [1, 3], budget: [2, 4], compliance: [2, 3] };
fs.writeFileSync(path.join(__dirname, '..', 'data', 'benchmark.json'), JSON.stringify(out, null, 2));
console.log('benchmark.json: ' + (Object.keys(out).length - 1) + ' 格');
