// 生成流通 / 项目 / 服务三种业态的样本数据（制造业样本 mfg.json 为手写主样本，不在此生成）
// 同一套引擎：订单沿“环节/节点”在“作业区/班组/小组”日历上排，资源在对应环节领用
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'data', 'samples');
const W = (n, o) => fs.writeFileSync(path.join(out, n), JSON.stringify(o, null, 2) + '\n');

// ---------- 流通型：区域快消品批发 ----------
const flow = {
  archetype: 'flow', company: '宁波优选百货供应链有限公司', today: '2026-09-17', horizon: 21,
  workday: { restWeekdays: [0] }, labor: { hourly: 36, overtimeMul: 1.3 },
  sources: [
    { id: 'oms', name: '订单系统', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 12 },
    { id: 'wms', name: '仓储库存', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 12 },
    { id: 'tms', name: '车辆与线路', mode: 'import', lastSync: '2026-09-17 06:40', rows: 5 }
  ],
  lines: [
    { id: 'A1', name: '拣货区 A（常温）', capHoursPerDay: 16, crew: 6, ops: ['拣货'] },
    { id: 'A2', name: '拣货区 B（冷链）', capHoursPerDay: 8, crew: 3, ops: ['拣货'], eff: 0.9 },
    { id: 'C1', name: '复核台', capHoursPerDay: 16, crew: 4, ops: ['复核'] },
    { id: 'P1', name: '打包台', capHoursPerDay: 16, crew: 5, ops: ['打包'] },
    { id: 'D1', name: '发运月台', capHoursPerDay: 10, crew: 4, ops: ['装车发运'] }
  ],
  products: [
    { id: 'G01', name: '常温饮料组合箱', unit: '箱', route: [{ op: '拣货', line: 'A1', hoursPerUnit: 0.012, setupHours: 0.3 }, { op: '复核', line: 'C1', hoursPerUnit: 0.008, setupHours: 0.2 }, { op: '打包', line: 'P1', hoursPerUnit: 0.012, setupHours: 0.2 }, { op: '装车发运', line: 'D1', hoursPerUnit: 0.006, setupHours: 0.5 }],
      bom: [{ material: 'S01', qtyPer: 1 }, { material: 'S07', qtyPer: 1, op: '打包' }, { material: 'S08', qtyPer: 0.05, op: '装车发运' }] },
    { id: 'G02', name: '休闲食品组合箱', unit: '箱', route: [{ op: '拣货', line: 'A1', hoursPerUnit: 0.015, setupHours: 0.3 }, { op: '复核', line: 'C1', hoursPerUnit: 0.01, setupHours: 0.2 }, { op: '打包', line: 'P1', hoursPerUnit: 0.012, setupHours: 0.2 }, { op: '装车发运', line: 'D1', hoursPerUnit: 0.006, setupHours: 0.5 }],
      bom: [{ material: 'S02', qtyPer: 1 }, { material: 'S07', qtyPer: 1, op: '打包' }, { material: 'S08', qtyPer: 0.05, op: '装车发运' }] },
    { id: 'G03', name: '冷藏乳品组合箱', unit: '箱', route: [{ op: '拣货', line: 'A2', hoursPerUnit: 0.02, setupHours: 0.5 }, { op: '复核', line: 'C1', hoursPerUnit: 0.01, setupHours: 0.2 }, { op: '打包', line: 'P1', hoursPerUnit: 0.015, setupHours: 0.3 }, { op: '装车发运', line: 'D1', hoursPerUnit: 0.008, setupHours: 0.5 }],
      bom: [{ material: 'S03', qtyPer: 1 }, { material: 'S09', qtyPer: 1, op: '打包' }, { material: 'S08', qtyPer: 0.08, op: '装车发运' }] },
    { id: 'G04', name: '日化用品组合箱', unit: '箱', route: [{ op: '拣货', line: 'A1', hoursPerUnit: 0.01, setupHours: 0.3 }, { op: '复核', line: 'C1', hoursPerUnit: 0.008, setupHours: 0.2 }, { op: '打包', line: 'P1', hoursPerUnit: 0.01, setupHours: 0.2 }, { op: '装车发运', line: 'D1', hoursPerUnit: 0.005, setupHours: 0.5 }],
      bom: [{ material: 'S04', qtyPer: 1 }, { material: 'S07', qtyPer: 1, op: '打包' }, { material: 'S08', qtyPer: 0.04, op: '装车发运' }] }
  ],
  materials: [
    { id: 'S01', name: '常温饮料', spec: '整箱 24 罐', unit: '箱', stock: 2600, safety: 1500, onOrder: [{ po: 'PO-2609-118', qty: 2000, eta: '2026-09-22' }], leadDays: 5, moq: 500, pack: 100, unitCost: 48, supplier: '品牌区域经销商', avgDailyUse: 260 },
    { id: 'S02', name: '休闲食品', spec: '整箱 12 袋', unit: '箱', stock: 1900, safety: 1200, onOrder: [], leadDays: 6, moq: 500, pack: 100, unitCost: 62, supplier: '华东食品分销', avgDailyUse: 180 },
    { id: 'S03', name: '冷藏乳品', spec: '整箱 12 盒 · 2–6℃', unit: '箱', stock: 500, safety: 400, onOrder: [{ po: 'PO-2609-121', qty: 700, eta: '2026-09-21' }], leadDays: 3, moq: 300, pack: 50, unitCost: 86, supplier: '乳企直供', avgDailyUse: 150 },
    { id: 'S04', name: '日化用品', spec: '整箱 6 瓶', unit: '箱', stock: 1450, safety: 800, onOrder: [], leadDays: 7, moq: 400, pack: 100, unitCost: 95, supplier: '日化品牌总代', avgDailyUse: 90 },
    { id: 'S05', name: '进口零食', spec: '整箱 10 袋', unit: '箱', stock: 640, safety: 100, onOrder: [], leadDays: 30, moq: 200, pack: 50, unitCost: 128, supplier: '进口食品代理', avgDailyUse: 3 },
    { id: 'S06', name: '节庆礼盒', spec: '定制礼盒', unit: '箱', stock: 380, safety: 50, onOrder: [], leadDays: 20, moq: 200, pack: 50, unitCost: 160, supplier: '礼盒加工厂', avgDailyUse: 1.5 },
    { id: 'S07', name: '周转纸箱', spec: '600 × 400 × 400', unit: '个', stock: 5200, safety: 3000, onOrder: [], leadDays: 3, moq: 2000, pack: 500, unitCost: 4.2, supplier: '本地纸箱厂', avgDailyUse: 520 },
    { id: 'S08', name: '托盘与缠绕膜', spec: '按托计', unit: '托', stock: 260, safety: 120, onOrder: [], leadDays: 4, moq: 100, pack: 20, unitCost: 38, supplier: '本地包材', avgDailyUse: 28 },
    { id: 'S09', name: '保温箱 + 冰袋', spec: '冷链周转', unit: '套', stock: 180, safety: 200, onOrder: [{ po: 'PO-2609-119', qty: 400, eta: '2026-09-19' }], leadDays: 4, moq: 200, pack: 50, unitCost: 26, supplier: '冷链耗材', avgDailyUse: 60 }
  ],
  orders: [
    { id: 'SO-2609-0871', customer: 'K-102 · 连锁便利店总部', product: 'G01', qty: 900, due: '2026-09-19', priority: 1, received: '2026-09-12', progress: { 拣货: 0.6 } },
    { id: 'SO-2609-0868', customer: 'K-088 · 区域商超', product: 'G03', qty: 420, due: '2026-09-18', priority: 1, received: '2026-09-11', progress: {} },
    { id: 'SO-2609-0875', customer: 'K-117 · 社区团购平台', product: 'G02', qty: 1200, due: '2026-09-22', priority: 2, received: '2026-09-13', progress: {} },
    { id: 'SO-2609-0866', customer: 'K-063 · 学校食堂配送', product: 'G01', qty: 300, due: '2026-09-17', priority: 2, received: '2026-09-10', progress: { 拣货: 1, 复核: 1, 打包: 1, 装车发运: 1 } },
    { id: 'SO-2609-0878', customer: 'K-102 · 连锁便利店总部', product: 'G04', qty: 640, due: '2026-09-24', priority: 1, received: '2026-09-14', progress: {} },
    { id: 'SO-2609-0880', customer: 'K-131 · 餐饮连锁', product: 'G03', qty: 380, due: '2026-09-23', priority: 2, received: '2026-09-15', progress: {} },
    { id: 'SO-2609-0882', customer: 'K-088 · 区域商超', product: 'G02', qty: 800, due: '2026-09-26', priority: 2, received: '2026-09-15', progress: {} },
    { id: 'SO-2609-0884', customer: 'K-145 · 企业福利采购', product: 'G04', qty: 500, due: '2026-09-25', priority: 3, received: '2026-09-16', progress: {} },
    { id: 'SO-2609-0885', customer: 'K-117 · 社区团购平台', product: 'G01', qty: 1500, due: '2026-09-29', priority: 2, received: '2026-09-16', progress: {} },
    { id: 'SO-2609-0886', customer: 'K-063 · 学校食堂配送', product: 'G03', qty: 260, due: '2026-09-21', priority: 1, received: '2026-09-16', progress: {} }
  ],
  insertPresets: [{ customer: 'K-102 · 连锁便利店总部', product: 'G02', qty: 600, due: '2026-09-20', note: '门店促销临时补货' }],
  overtime: [], log: []
};

// ---------- 项目型：商业空间装饰工程 ----------
const project = {
  archetype: 'project', company: '苏州筑合空间装饰工程有限公司', today: '2026-09-17', horizon: 21,
  workday: { restWeekdays: [0] }, labor: { hourly: 45, overtimeMul: 1.3 },
  sources: [
    { id: 'pm', name: '项目台账', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 9 },
    { id: 'crew', name: '班组考勤', mode: 'import', lastSync: '2026-09-17 06:30', rows: 5 },
    { id: 'mat', name: '材料与分包', mode: 'import', lastSync: '2026-09-16 18:00', rows: 8 }
  ],
  lines: [
    { id: 'T1', name: '拆除班组', capHoursPerDay: 8, crew: 6, ops: ['拆除'] },
    { id: 'T2', name: '水电班组', capHoursPerDay: 8, crew: 5, ops: ['水电'] },
    { id: 'T3', name: '泥木班组 A', capHoursPerDay: 8, crew: 8, ops: ['泥木'] },
    { id: 'T4', name: '泥木班组 B', capHoursPerDay: 8, crew: 5, ops: ['泥木'], eff: 0.85 },
    { id: 'T5', name: '油漆班组', capHoursPerDay: 8, crew: 4, ops: ['油漆'] },
    { id: 'T6', name: '安装收尾组', capHoursPerDay: 8, crew: 6, ops: ['安装', '验收'] }
  ],
  products: [
    { id: 'J01', name: '连锁餐饮门店', unit: '人天', route: [{ op: '拆除', line: 'T1', hoursPerUnit: 0.25, setupHours: 2 }, { op: '水电', line: 'T2', hoursPerUnit: 0.5, setupHours: 2 }, { op: '泥木', line: 'T3', hoursPerUnit: 0.8, setupHours: 2 }, { op: '油漆', line: 'T5', hoursPerUnit: 0.35, setupHours: 1 }, { op: '安装', line: 'T6', hoursPerUnit: 0.3, setupHours: 1 }, { op: '验收', line: 'T6', hoursPerUnit: 0.05, setupHours: 0 }],
      bom: [{ material: 'R01', qtyPer: 0.6, op: '水电' }, { material: 'R02', qtyPer: 1.8, op: '泥木' }, { material: 'R03', qtyPer: 0.9, op: '泥木' }, { material: 'R04', qtyPer: 0.4, op: '油漆' }, { material: 'R05', qtyPer: 0.5, op: '安装' }] },
    { id: 'J02', name: '零售专柜', unit: '人天', route: [{ op: '拆除', line: 'T1', hoursPerUnit: 0.2, setupHours: 1 }, { op: '水电', line: 'T2', hoursPerUnit: 0.4, setupHours: 1 }, { op: '泥木', line: 'T3', hoursPerUnit: 0.7, setupHours: 1 }, { op: '油漆', line: 'T5', hoursPerUnit: 0.3, setupHours: 1 }, { op: '安装', line: 'T6', hoursPerUnit: 0.6, setupHours: 1 }, { op: '验收', line: 'T6', hoursPerUnit: 0.05, setupHours: 0 }],
      bom: [{ material: 'R01', qtyPer: 0.4, op: '水电' }, { material: 'R02', qtyPer: 1.2, op: '泥木' }, { material: 'R04', qtyPer: 0.3, op: '油漆' }, { material: 'R06', qtyPer: 0.8, op: '安装' }] },
    { id: 'J03', name: '办公空间', unit: '人天', route: [{ op: '拆除', line: 'T1', hoursPerUnit: 0.2, setupHours: 2 }, { op: '水电', line: 'T2', hoursPerUnit: 0.6, setupHours: 2 }, { op: '泥木', line: 'T3', hoursPerUnit: 0.7, setupHours: 2 }, { op: '油漆', line: 'T5', hoursPerUnit: 0.4, setupHours: 1 }, { op: '安装', line: 'T6', hoursPerUnit: 0.3, setupHours: 1 }, { op: '验收', line: 'T6', hoursPerUnit: 0.05, setupHours: 0 }],
      bom: [{ material: 'R01', qtyPer: 0.8, op: '水电' }, { material: 'R02', qtyPer: 1.5, op: '泥木' }, { material: 'R03', qtyPer: 0.6, op: '泥木' }, { material: 'R04', qtyPer: 0.5, op: '油漆' }, { material: 'R05', qtyPer: 0.3, op: '安装' }] }
  ],
  materials: [
    { id: 'R01', name: '电缆与线管', spec: '按项目折算', unit: '标准包', stock: 42, safety: 20, onOrder: [], leadDays: 4, moq: 20, pack: 5, unitCost: 1850, supplier: '电料供应商', avgDailyUse: 3 },
    { id: 'R02', name: '轻钢龙骨与板材', spec: '按项目折算', unit: '标准包', stock: 60, safety: 40, onOrder: [{ po: 'PO-2609-071', qty: 80, eta: '2026-09-24' }], leadDays: 6, moq: 40, pack: 10, unitCost: 2400, supplier: '板材供应商', avgDailyUse: 9 },
    { id: 'R03', name: '地砖与墙砖', spec: '按项目折算', unit: '标准包', stock: 36, safety: 15, onOrder: [], leadDays: 10, moq: 20, pack: 5, unitCost: 3200, supplier: '瓷砖品牌', avgDailyUse: 2.5 },
    { id: 'R04', name: '涂料与辅料', spec: '按项目折算', unit: '标准包', stock: 25, safety: 10, onOrder: [], leadDays: 3, moq: 10, pack: 5, unitCost: 980, supplier: '涂料经销商', avgDailyUse: 1.8 },
    { id: 'R05', name: '定制家具', spec: '按项目定制', unit: '标准包', stock: 6, safety: 4, onOrder: [{ po: 'PO-2609-074', qty: 12, eta: '2026-09-22' }], leadDays: 15, moq: 5, pack: 1, unitCost: 8600, supplier: '家具加工厂', avgDailyUse: 1.2 },
    { id: 'R06', name: '道具与灯具', spec: '按项目定制', unit: '标准包', stock: 14, safety: 6, onOrder: [], leadDays: 12, moq: 5, pack: 1, unitCost: 5200, supplier: '道具加工厂', avgDailyUse: 0.9 },
    { id: 'R07', name: '临时围挡', spec: '通用', unit: '套', stock: 22, safety: 4, onOrder: [], leadDays: 5, moq: 4, pack: 2, unitCost: 1200, supplier: '本地租赁', avgDailyUse: 0.05 },
    { id: 'R08', name: '旧展柜拆回件', spec: '待处理', unit: '套', stock: 31, safety: 0, onOrder: [], leadDays: 0, moq: 1, pack: 1, unitCost: 600, supplier: '', avgDailyUse: 0.1 }
  ],
  orders: [
    { id: 'PJ-2609-031', customer: '业主 · 连锁火锅品牌（园区店）', product: 'J01', qty: 26, due: '2026-09-26', priority: 1, received: '2026-08-30', progress: { 拆除: 1, 水电: 1, 泥木: 0.45 } },
    { id: 'PJ-2609-034', customer: '业主 · 运动品牌（商场专柜）', product: 'J02', qty: 12, due: '2026-09-22', priority: 1, received: '2026-09-04', progress: { 拆除: 1, 水电: 0.7 } },
    { id: 'PJ-2609-029', customer: '业主 · 咖啡连锁（街边店）', product: 'J01', qty: 18, due: '2026-09-19', priority: 2, received: '2026-08-26', progress: { 拆除: 1, 水电: 1, 泥木: 1, 油漆: 0.5 } },
    { id: 'PJ-2609-036', customer: '业主 · 科技公司（办公楼层）', product: 'J03', qty: 40, due: '2026-10-06', priority: 2, received: '2026-09-08', progress: { 拆除: 0.5 } },
    { id: 'PJ-2609-038', customer: '业主 · 美妆品牌（商场专柜）', product: 'J02', qty: 10, due: '2026-09-28', priority: 2, received: '2026-09-10', progress: {} },
    { id: 'PJ-2609-027', customer: '业主 · 烘焙连锁（社区店）', product: 'J01', qty: 14, due: '2026-09-17', priority: 2, received: '2026-08-20', progress: { 拆除: 1, 水电: 1, 泥木: 1, 油漆: 1, 安装: 1, 验收: 1 } },
    { id: 'PJ-2609-040', customer: '业主 · 律师事务所（办公）', product: 'J03', qty: 22, due: '2026-10-03', priority: 3, received: '2026-09-12', progress: {} },
    { id: 'PJ-2609-041', customer: '业主 · 茶饮品牌（园区店）', product: 'J01', qty: 16, due: '2026-10-01', priority: 2, received: '2026-09-14', progress: {} },
    { id: 'PJ-2609-042', customer: '业主 · 眼镜连锁（商场专柜）', product: 'J02', qty: 9, due: '2026-09-30', priority: 3, received: '2026-09-15', progress: {} }
  ],
  insertPresets: [{ customer: '业主 · 运动品牌（新开专柜）', product: 'J02', qty: 11, due: '2026-09-27', note: '商场开业节点' }],
  overtime: [], log: []
};

// ---------- 服务型：财税代理记账机构 ----------
const service = {
  archetype: 'service', company: '成都启元财税服务有限公司', today: '2026-09-17', horizon: 21,
  workday: { restWeekdays: [0, 6] }, labor: { hourly: 40, overtimeMul: 1.3 },
  sources: [
    { id: 'crm', name: '客户与服务单', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 11 },
    { id: 'tax', name: '申报日历', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 4 },
    { id: 'hr', name: '小组排班', mode: 'import', lastSync: '2026-09-16 18:00', rows: 4 }
  ],
  lines: [
    { id: 'G1', name: '资料组', capHoursPerDay: 8, crew: 3, ops: ['资料收集'] },
    { id: 'G2', name: '账务一组', capHoursPerDay: 8, crew: 5, ops: ['凭证录入', '账务处理'] },
    { id: 'G3', name: '账务二组', capHoursPerDay: 8, crew: 4, ops: ['凭证录入', '账务处理'], eff: 0.9 },
    { id: 'G4', name: '税务组', capHoursPerDay: 8, crew: 3, ops: ['申报', '归档'] }
  ],
  products: [
    { id: 'V01', name: '小规模纳税人月度账务', unit: '工时', route: [{ op: '资料收集', line: 'G1', hoursPerUnit: 0.15, setupHours: 0.2 }, { op: '凭证录入', line: 'G3', hoursPerUnit: 0.35, setupHours: 0.2 }, { op: '账务处理', line: 'G3', hoursPerUnit: 0.3, setupHours: 0.2 }, { op: '申报', line: 'G4', hoursPerUnit: 0.15, setupHours: 0.2 }, { op: '归档', line: 'G4', hoursPerUnit: 0.05, setupHours: 0 }],
      bom: [{ material: 'Q01', qtyPer: 1, per: 'order' }, { material: 'Q02', qtyPer: 1, per: 'order', op: '申报' }] },
    { id: 'V02', name: '一般纳税人月度账务', unit: '工时', route: [{ op: '资料收集', line: 'G1', hoursPerUnit: 0.2, setupHours: 0.2 }, { op: '凭证录入', line: 'G2', hoursPerUnit: 0.35, setupHours: 0.3 }, { op: '账务处理', line: 'G2', hoursPerUnit: 0.3, setupHours: 0.3 }, { op: '申报', line: 'G4', hoursPerUnit: 0.1, setupHours: 0.2 }, { op: '归档', line: 'G4', hoursPerUnit: 0.05, setupHours: 0 }],
      bom: [{ material: 'Q01', qtyPer: 1, per: 'order' }, { material: 'Q02', qtyPer: 1, per: 'order', op: '申报' }, { material: 'Q03', qtyPer: 0.05, op: '账务处理' }] },
    { id: 'V03', name: '年度汇算清缴', unit: '工时', route: [{ op: '资料收集', line: 'G1', hoursPerUnit: 0.2, setupHours: 0.5 }, { op: '账务处理', line: 'G2', hoursPerUnit: 0.6, setupHours: 0.5 }, { op: '申报', line: 'G4', hoursPerUnit: 0.15, setupHours: 0.3 }, { op: '归档', line: 'G4', hoursPerUnit: 0.05, setupHours: 0 }],
      bom: [{ material: 'Q01', qtyPer: 1, per: 'order' }, { material: 'Q02', qtyPer: 1, per: 'order', op: '申报' }, { material: 'Q04', qtyPer: 1, per: 'order', op: '账务处理' }] }
  ],
  materials: [
    { id: 'Q01', name: '客户原始票据（已交齐）', spec: '按服务单计', unit: '份', stock: 5, safety: 0, onOrder: [{ po: 'CL-2609-044', qty: 2, eta: '2026-09-21' }], leadDays: 3, moq: 1, pack: 1, unitCost: 0, supplier: '客户对接', avgDailyUse: 1 },
    { id: 'Q02', name: '申报授权与 CA 证书', spec: '有效期内', unit: '份', stock: 10, safety: 0, onOrder: [], leadDays: 2, moq: 1, pack: 1, unitCost: 0, supplier: '客户对接', avgDailyUse: 1 },
    { id: 'Q03', name: '外聘审核工时', spec: '注册会计师', unit: '人天', stock: 4, safety: 1, onOrder: [], leadDays: 5, moq: 1, pack: 1, unitCost: 1800, supplier: '合作事务所', avgDailyUse: 0.2 },
    { id: 'Q04', name: '汇算底稿模板包', spec: '当年版本', unit: '套', stock: 3, safety: 1, onOrder: [], leadDays: 1, moq: 1, pack: 1, unitCost: 0, supplier: '内部', avgDailyUse: 0.1 },
    { id: 'Q05', name: '财务软件账套授权', spec: '年度授权', unit: '套', stock: 40, safety: 5, onOrder: [], leadDays: 1, moq: 10, pack: 10, unitCost: 680, supplier: '软件服务商', avgDailyUse: 0.2 }
  ],
  orders: [
    { id: 'SV-2609-0210', customer: 'K-311 · 餐饮管理公司', product: 'V02', qty: 24, due: '2026-09-19', priority: 1, received: '2026-09-03', progress: { 资料收集: 1, 凭证录入: 0.5 } },
    { id: 'SV-2609-0206', customer: 'K-287 · 贸易公司', product: 'V02', qty: 20, due: '2026-09-18', priority: 1, received: '2026-09-02', progress: { 资料收集: 1, 凭证录入: 1, 账务处理: 0.6 } },
    { id: 'SV-2609-0214', customer: 'K-330 · 设计工作室', product: 'V01', qty: 8, due: '2026-09-23', priority: 2, received: '2026-09-08', progress: {} },
    { id: 'SV-2609-0201', customer: 'K-256 · 建材经销商', product: 'V01', qty: 10, due: '2026-09-17', priority: 2, received: '2026-09-01', progress: { 资料收集: 1, 凭证录入: 1, 账务处理: 1, 申报: 1, 归档: 1 } },
    { id: 'SV-2609-0218', customer: 'K-342 · 电商公司', product: 'V02', qty: 30, due: '2026-09-25', priority: 1, received: '2026-09-10', progress: {} },
    { id: 'SV-2609-0219', customer: 'K-298 · 培训机构', product: 'V03', qty: 36, due: '2026-09-30', priority: 2, received: '2026-09-11', progress: {} },
    { id: 'SV-2609-0221', customer: 'K-351 · 咨询公司', product: 'V01', qty: 6, due: '2026-09-24', priority: 3, received: '2026-09-12', progress: {} },
    { id: 'SV-2609-0223', customer: 'K-311 · 餐饮管理公司', product: 'V03', qty: 40, due: '2026-10-08', priority: 2, received: '2026-09-14', progress: {} },
    { id: 'SV-2609-0224', customer: 'K-360 · 物流公司', product: 'V02', qty: 26, due: '2026-09-28', priority: 2, received: '2026-09-15', progress: {} },
    { id: 'SV-2609-0225', customer: 'K-372 · 医疗器械公司', product: 'V01', qty: 9, due: '2026-09-26', priority: 3, received: '2026-09-16', progress: {} }
  ],
  insertPresets: [{ customer: 'K-380 · 新客户 · 软件公司', product: 'V02', qty: 22, due: '2026-09-24', note: '上家机构交接，本月申报在即' }],
  overtime: [], log: []
};

W('flow.json', flow); W('project.json', project); W('service.json', service);
console.log('samples written: flow / project / service');
