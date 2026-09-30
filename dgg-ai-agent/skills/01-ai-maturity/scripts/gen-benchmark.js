// 同行参考带 v0（估算版）：54 个行业细分 × 5 规模 = 270 格
// 每格：六维得分区间（百分制）+ 同行分布参数（均值、标准差，用于百分位估算）
// 业务侧抽样到位后整体替换 data/benchmark.json；_meta.basis 会从 estimated 改为 sampled。
const fs = require('fs');
const path = require('path');
const industries = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '_shared', 'industries.json'), 'utf8'));

// 大类中心值（百分制）：战略 数据 流程 人员 预算 合规
const sectorPrior = {
  mfg:    [40, 48, 50, 34, 42, 40],
  trade:  [36, 42, 36, 36, 36, 34],
  life:   [34, 40, 42, 36, 34, 28],
  prof:   [42, 50, 50, 44, 42, 52],
  build:  [28, 34, 42, 26, 34, 42],
  med:    [40, 48, 50, 34, 42, 58],
  edu:    [40, 42, 36, 44, 34, 36],
  logi:   [40, 50, 50, 34, 42, 40],
  tech:   [58, 64, 52, 66, 58, 50],
  agri:   [26, 32, 34, 26, 26, 32],
  energy: [42, 52, 50, 36, 46, 48],
  fin:    [46, 54, 56, 44, 48, 64],
  media:  [44, 40, 36, 52, 38, 34],
  other:  [36, 40, 40, 36, 36, 36]
};
// 细分微调（相对大类，百分点）
const adj = {
  'mfg-electronics': [4, 6, 2, 6, 4, 2], 'mfg-auto': [4, 6, 6, 2, 4, 4], 'mfg-process': [0, 6, 6, -2, 2, 6],
  'mfg-textile': [-4, -6, -4, -2, -4, -4], 'mfg-furniture': [-2, -4, -2, 0, -2, -4], 'mfg-equipment': [6, 6, 4, 6, 6, 2], 'mfg-packaging': [-2, -2, 0, -2, -2, -2],
  'trade-retail': [2, 4, 4, 2, 2, 2], 'trade-ecom': [10, 12, 6, 12, 8, 4], 'trade-import': [0, 2, 4, 2, 2, 6],
  'life-hotel': [2, 4, 4, 2, 2, 2], 'life-beauty': [0, -2, -2, 2, 0, 0], 'life-property': [-4, -4, 0, -6, -4, 0], 'life-autocare': [-2, -2, 0, -2, -2, -2],
  'prof-legal': [-2, -4, 0, 0, -2, 8], 'prof-consulting': [4, 0, -2, 8, 2, 0], 'prof-marketing': [4, -2, -6, 10, 2, -8], 'prof-design': [2, -6, -6, 8, -2, -8], 'prof-ip': [0, 2, 4, 0, 0, 8],
  'build-design': [4, 6, 2, 8, 2, 0], 'build-decoration': [-4, -6, -6, -4, -4, -6], 'build-realestate': [2, 4, 0, 2, 4, 2], 'build-landscape': [-4, -4, -2, -4, -4, -2],
  'med-pharma': [2, 4, 6, 2, 4, 6], 'med-device': [4, 4, 6, 6, 6, 6], 'med-wellness': [-6, -10, -8, -6, -8, -12],
  'edu-k12': [-4, -6, -2, -4, -6, 4], 'edu-tech': [12, 14, 8, 16, 12, 6],
  'logi-warehouse': [0, 2, 2, -2, 0, 0], 'logi-scm': [4, 4, 4, 6, 4, 6],
  'tech-internet': [4, 6, 2, 6, 4, 2], 'tech-hardware': [-4, -4, 2, -6, -2, 0], 'tech-integration': [-2, -2, 0, 0, -2, 2],
  'agri-food': [4, 6, 8, 4, 6, 8], 'agri-distribute': [2, 4, 2, 2, 2, 0],
  'energy-env': [-2, -4, -2, -2, -2, 0],
  'fin-invest': [4, 2, -2, 6, 6, 2], 'fin-insurance': [-4, -4, -2, -2, -4, -2],
  'media-publishing': [-2, 2, 4, -4, 0, 6], 'media-event': [-4, -6, -2, -4, -4, -4]
};
const sizeShift = { '1_20': -8, '21_50': -4, '51_100': 0, '101_300': 6, '300_plus': 12 };
const dims = ['strategy', 'data', 'process', 'people', 'budget', 'compliance'];
const clamp = (n) => Math.max(4, Math.min(96, Math.round(n)));
const out = { _meta: { basis: 'estimated', version: '0.2', scale: 'pct', note: '开发侧估算，业务侧抽样到位后替换；缺失格由 core 按相邻规模插值' } };
let n = 0;
for (const sec of industries.sectors) {
  for (const ind of sec.industries) {
    const a = adj[ind.slug] || [0, 0, 0, 0, 0, 0];
    for (const sz of Object.keys(sizeShift)) {
      const cell = { bands: {}, mean: 0, sd: 14 };
      let sum = 0;
      dims.forEach((d, i) => {
        const c = sectorPrior[sec.key][i] + a[i] + sizeShift[sz];
        cell.bands[d] = [clamp(c - 10), clamp(c + 10)];
        sum += c;
      });
      cell.mean = Math.round(sum / dims.length);
      out[`${ind.slug}-${sz}`] = cell; n++;
    }
  }
}
fs.writeFileSync(path.join(__dirname, '..', 'data', 'benchmark.json'), JSON.stringify(out, null, 1));
console.log('benchmark.json: ' + n + ' 格');
