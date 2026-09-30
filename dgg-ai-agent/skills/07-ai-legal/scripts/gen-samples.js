// 生成三套样本（制造主样本沿用杭州锐合：合同相对方就是 ERP / CFO / 获客里的那批；贸易、服务为变体）
// 合同为结构化条款：每条带类型标签与参数，审查规则对参数做算式；每份合同刻意埋 1–5 处问题
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'data', 'samples');
const W = (n, o) => fs.writeFileSync(path.join(out, n), JSON.stringify(o, null, 2) + '\n');
const C = (type, title, text, params) => ({ type, title, text, params: params || {} });
function contract(o) { o.clauses = o.clauses.map((c, i) => Object.assign({ no: String(i + 1) }, c)); return o; }

// 常用条款文本
const T = {
  subject: (t) => C('subject', '标的', t),
  quality: (std) => C('quality', '质量标准', `产品质量以${std}为准；无约定的按国家标准或行业标准执行。`, { standard: std }),
  delivery: (t, latePenalty) => C('delivery', '交付', t, { latePenalty }),
  payment: (t, p) => C('payment', '付款方式', t, p),
  acceptance: (days) => C('acceptance', '验收与异议期', `需方应在到货后 7 日内验收；数量与外观异议当场提出，质量异议在 ${days} 日内书面提出，逾期视为验收合格。`, { objectionDays: days, standard: '技术协议与封样' }),
  liability: (cap) => C('liability', '违约责任', cap == null ? '任何一方违约给对方造成损失的，应赔偿对方因此遭受的全部损失，包括直接损失与可得利益损失。' : `任何一方违约给对方造成损失的，应予赔偿；赔偿总额以本合同总价款的 ${cap} 倍为限，但因故意或重大过失造成的损失除外。`, { capMultiple: cap }),
  penalty: (rate) => C('penalty', '违约金', `一方逾期履行的，应按合同总价款的 ${Math.round(rate * 100)}% 向对方支付违约金。`, { rate }),
  dispute: (venue) => C('dispute', '争议解决', venue === 'counterparty' ? '因本合同引起的争议，双方协商解决；协商不成的，向乙方所在地人民法院提起诉讼。' : venue === 'arbitration' ? '因本合同引起的争议，双方协商解决；协商不成的，提交合同签订地仲裁委员会仲裁。' : '因本合同引起的争议，双方协商解决；协商不成的，向合同签订地即我方住所地人民法院提起诉讼。', { venue }),
  force: () => C('force', '不可抗力', '因不可抗力不能履行合同的，根据不可抗力的影响部分或全部免除责任，受影响方应在 7 日内书面通知对方并提供证明。'),
  term: (t, p) => C('term', '期限', t, p),
  notice: () => C('notice', '通知与送达', '双方确认合同载明的地址、电子邮箱为有效送达地址，变更应提前 5 日书面通知。')
};

const mfg = {
  archetype: 'make', sector: 'mfg', company: '杭州锐合精密五金有限公司', co: '锐合', today: '2026-09-17', weekStart: '2026-09-14',
  profile: { industry: 'mfg-machinery', size: '101_300', province: '浙江', founded: '2012-05-18', legalRep: '法定代表人', capital: 10000000 },
  sources: [
    { id: 'oa', name: 'OA · 合同审批与用印', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 64 },
    { id: 'contracts', name: '合同台账', mode: 'import', lastSync: '2026-09-16 18:00', rows: 12 },
    { id: 'licenses', name: '证照清单', mode: 'import', lastSync: '2026-09-15 18:00', rows: 6 },
    { id: 'ip', name: '知产清单 · 商标专利软著', mode: 'import', lastSync: '2026-09-15 18:00', rows: 11 },
    { id: 'erp', name: 'ERP · 客户与供应商', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 42 }
  ],
  contracts: [
    contract({ id: 'HT-2609-018', type: 'sale', role: 'supply', title: '精密五金件年度供货合同', party: 'K-017 · 汽配一级供应商', amount: 4200000, signed: '2026-01-15', start: '2026-01-15', end: '2026-12-31', status: '履行中', milestones: [{ date: '2026-10-10', text: '第三季度对账' }, { date: '2026-12-15', text: '年度价格复核' }], clauses: [
      T.subject('供方向需方供应精密五金件 Ø12×45、Ø8×30 等，具体型号、数量以需方月度订单为准。'), T.quality('双方确认的技术协议与封样'),
      T.delivery('供方按需方订单约定日期交付至需方指定仓库，运费由供方承担。', true),
      T.payment('需方于每批货物验收合格后 120 日内支付该批货款。', { termDays: 120, advanceRatio: 0 }),
      T.acceptance(15), T.liability(null), T.penalty(0.5), T.dispute('counterparty'), T.force(), T.notice()
    ] }),
    contract({ id: 'HT-2609-021', type: 'purchase', role: 'buy', title: '不锈钢棒材采购合同', party: '无锡不锈钢材料', amount: 1860000, signed: '2026-08-20', start: '2026-08-20', end: '2027-02-28', status: '审查中', milestones: [{ date: '2026-09-22', text: '合同签署截止' }, { date: '2026-09-28', text: '首批到货' }], clauses: [
      T.subject('需方向供方采购 304 不锈钢棒 Ø14 × 3000，数量 60 吨，分批交付。'),
      T.delivery('供方于 2026 年 9 月 28 日前交付首批 20 吨，其余按需方通知分批交付。', false),
      T.payment('合同签订后 5 日内需方支付 50% 预付款，每批到货后 10 日内支付该批余款。', { termDays: 10, advanceRatio: 0.5 }),
      C('warranty', '质量保证', '供方对材料提供自到货之日起 12 个月的质量保证。', { months: 12 }),
      T.liability(1), T.dispute('ours'), T.force(), T.notice()
    ] }),
    contract({ id: 'HT-2608-009', type: 'framework', role: 'buy', title: '冷轧钢带年度框架供货协议', party: '宁波钢材贸易', amount: 2400000, signed: '2026-03-01', start: '2026-03-01', end: '2027-02-28', status: '履行中', milestones: [{ date: '2026-09-15', text: '8 月对账单确认' }, { date: '2026-11-15', text: '下年度价格谈判' }], clauses: [
      T.subject('供方向需方供应冷轧钢带 SPCC 1.0mm × 120mm，年度预计 400 吨，按月度订单执行。'),
      C('price', '价格', '价格按附件价格表执行；市场价格变动时，供方有权调整价格并于调价后通知需方。', { adjust: 'unilateral' }),
      T.delivery('供方在收到订单后 7 日内交付。', true),
      T.payment('月结 45 天，需方于次月 15 日前支付上月货款。', { termDays: 45, advanceRatio: 0 }),
      T.term('本协议有效期 1 年，期满自动续期 1 年。', { autoRenew: true, exitNotice: false }),
      T.dispute('counterparty'), T.force()
    ] }),
    contract({ id: 'HT-2601-003', type: 'loan', role: 'borrower', title: '流动资金借款合同', party: '城商行', amount: 1800000, signed: '2025-11-20', start: '2025-11-20', end: '2026-11-20', status: '履行中', milestones: [{ date: '2026-10-20', text: '付息日' }, { date: '2026-11-20', text: '本金到期' }], clauses: [
      T.subject('贷款人向借款人发放流动资金贷款 180 万元，用于购买原材料。'),
      C('interest', '利率', '年利率 5.0%，按月于每月 20 日结息。', { rate: 0.05 }),
      C('repayment', '还款', '借款期限 12 个月，到期一次性归还本金。', {}),
      C('prepay', '提前还款', '借款人提前还款的，应按提前还款金额的 1% 支付违约金。', { penalty: true }),
      C('crossdefault', '交叉违约', '借款人在其他合同项下发生任何违约的，贷款人有权宣布本合同借款提前到期。', { enabled: true, threshold: null, cureDays: null }),
      T.liability(1), T.dispute('counterparty')
    ] }),
    contract({ id: 'HT-2412-031', type: 'lease', role: 'lessee', title: '厂房租赁合同', party: '园区物业', amount: 540000, signed: '2024-12-20', start: '2025-01-01', end: '2027-12-31', status: '履行中', milestones: [{ date: '2026-10-01', text: '第四季度租金' }], clauses: [
      T.subject('出租人将园区 3 号厂房 4,200 ㎡出租给承租人用于生产经营。'),
      T.term('租赁期 3 年，自 2025 年 1 月 1 日至 2027 年 12 月 31 日。', { autoRenew: false, exitNotice: true }),
      C('rent', '租金', '月租金 45,000 元，按季度预付，每季度首月 1 日前支付。', {}),
      C('renewal', '续租', '租赁期满，双方另行协商续租事宜。', { priority: false }),
      C('improvements', '装修与附属设施', '承租人装修改造须经出租人同意，租赁期满装修归出租人所有。', { owner: 'lessor', compensated: false }),
      C('termination', '提前解约', '承租人提前解除合同的，应支付 3 个月租金作为违约金。', { earlyExitMonths: 3 }),
      T.dispute('counterparty')
    ] }),
    contract({ id: 'HT-2603-012', type: 'processing', role: 'orderer', title: '密封件加工承揽合同', party: '宁波橡塑', amount: 380000, signed: '2026-03-10', start: '2026-03-10', end: '2027-03-09', status: '履行中', milestones: [{ date: '2026-09-24', text: '新模具首件验收' }], clauses: [
      T.subject('定作方委托承揽方按图纸加工密封圈 Ø22，年度预计 30 万件。'), T.quality('定作方图纸与封样'),
      C('material', '材料', '主要材料由定作方提供，承揽方负责保管。', { lossRate: null }),
      T.delivery('承揽方在收到定作方通知后 10 日内交付。', true),
      T.payment('月结 30 天。', { termDays: 30, advanceRatio: 0 }),
      C('ip', '知识产权', '本合同项下加工形成的模具、工艺改进及相关技术资料归承揽方所有。', { owner: 'counterparty' }),
      T.liability(null), T.dispute('counterparty')
    ] }),
    contract({ id: 'HT-2606-015', type: 'nda', role: 'disclosing', title: '技术资料保密协议', party: 'K-022 · 电动工具制造商', amount: 0, signed: '2026-06-05', start: '2026-06-05', end: '2027-06-04', status: '履行中', milestones: [], clauses: [
      C('scope', '保密范围', '披露方提供的图纸、工艺参数、报价及合作信息均属保密信息。', {}),
      C('confidentiality', '保密义务与期限', '接收方对保密信息负有保密义务，保密期限自协议终止后 1 年。', { years: 1, penalty: false }),
      T.term('本协议有效期 1 年。', { autoRenew: false, exitNotice: true }),
      T.dispute('ours')
    ] }),
    contract({ id: 'HT-2607-019', type: 'sale', role: 'supply', title: '冲压支架供货合同', party: 'K-003 · 家电整机厂', amount: 3600000, signed: '2026-07-01', start: '2026-07-01', end: '2027-06-30', status: '履行中', milestones: [{ date: '2026-10-08', text: '第三季度对账' }], clauses: [
      T.subject('供方向需方供应冲压支架 ZJ-210，年度预计 15 万件。'), T.quality('双方确认的技术协议与封样'),
      T.delivery('按需方月度订单交付。', true), T.payment('月结 60 天。', { termDays: 60, advanceRatio: 0 }),
      T.acceptance(45), T.liability(1), T.penalty(0.1), T.dispute('ours'), T.force(), T.notice()
    ] }),
    contract({ id: 'HT-2605-011', type: 'labor', role: 'employer', title: '劳动合同（技术岗模板）', party: '员工 · 技术岗', amount: 0, signed: '2026-05-01', start: '2026-05-01', end: '2029-04-30', status: '履行中', milestones: [], clauses: [
      T.subject('用人单位聘用员工担任工艺工程师岗位。'),
      T.term('劳动合同期限 3 年。', { autoRenew: false, exitNotice: true, years: 3 }),
      C('probation', '试用期', '试用期 6 个月。', { months: 6, allowedMonths: 6 }),
      C('wage', '劳动报酬', '月工资由基本工资与绩效工资构成，每月 10 日发放上月工资。', {}),
      C('worktime', '工作时间', '标准工时制，每周工作 5 天、每天 8 小时。', {}),
      C('noncompete', '竞业限制', '员工离职后 12 个月内不得到与本单位有竞争关系的单位任职。', { compensation: false, months: 12 }),
      C('serviceterm', '服务期', '本单位出资培训的，约定服务期 3 年，提前离职支付违约金 5 万元。', { penalty: 50000, trainingCost: 18000 }),
      C('termination', '解除与终止', '双方依法解除或终止劳动合同。', {})
    ] }),
    contract({ id: 'HT-2604-008', type: 'equipment', role: 'buy', title: 'CNC 车铣中心采购合同', party: '设备商', amount: 620000, signed: '2026-04-10', start: '2026-04-10', end: '2027-04-09', status: '履行中', milestones: [{ date: '2026-10-30', text: '设备尾款' }], clauses: [
      T.subject('需方向供方采购 CNC 车铣中心 1 台，含安装调试与培训。'),
      T.delivery('供方于合同签订后 45 日内交付并完成安装调试。', true),
      T.payment('签订后 30%，到货后 60%，验收合格 12 个月后支付 10% 尾款。', { termDays: 10, advanceRatio: 0.3 }),
      T.acceptance(15), C('warranty', '质量保证', '整机质保 10 个月。', { months: 10 }), T.liability(1), T.dispute('ours'), T.force()
    ] }),
    contract({ id: 'HT-2609-024', type: 'agency', role: 'principal', title: '海外市场代理协议', party: 'K-031 · 出口贸易公司', amount: 0, signed: '2026-09-01', start: '2026-09-01', end: '2029-08-31', status: '审查中', milestones: [{ date: '2026-09-25', text: '代理协议签署截止' }], clauses: [
      T.subject('委托方授权代理方在东南亚市场代理销售委托方的精密五金件。'),
      C('exclusivity', '独家代理', '代理方在代理区域内享有独家代理权。', { exclusive: true, minVolume: null }),
      T.term('本协议有效期 3 年，期满自动续期 3 年。', { autoRenew: true, exitNotice: false }),
      T.payment('代理方按订单金额预付 30%，发货前付清余款。', { termDays: 0, advanceRatio: 0 }),
      C('termination', '终止', '任何一方严重违约的，对方可书面通知解除本协议。', {}),
      T.dispute('counterparty')
    ] }),
    contract({ id: 'HT-2602-006', type: 'software', role: 'client', title: '生产管理软件服务合同', party: '软件服务商', amount: 96000, signed: '2026-02-01', start: '2026-02-01', end: '2027-01-31', status: '履行中', milestones: [{ date: '2026-11-30', text: '续约评估' }], clauses: [
      T.subject('服务方向客户方提供生产管理软件的订阅服务，含 30 个账号。'),
      C('sla', '服务水平', '服务方保证系统月度可用率不低于 99.5%。', { penalty: false }),
      C('data', '数据', '客户方在服务过程中产生的业务数据归客户方所有，服务方不得用于其他用途。', { owner: 'client' }),
      T.payment('年费 96,000 元，签订后 10 日内一次性支付。', { termDays: 10, advanceRatio: 1 }),
      C('ip', '知识产权', '软件著作权归服务方所有，客户方享有合同期内的使用权。', { owner: 'provider' }),
      T.dispute('ours')
    ] })
  ],
  licenses: [
    { id: 'ZZ-01', name: '营业执照', no: '9133********01', issuer: '市场监督管理局', expiry: null, status: '长期' },
    { id: 'ZZ-02', name: '排污许可证', no: '9133********01001P', issuer: '生态环境局', expiry: '2026-11-30', status: '有效' },
    { id: 'ZZ-03', name: '特种设备使用登记（叉车 3 台）', no: '叉浙 C****', issuer: '市场监督管理局', expiry: '2026-10-15', status: '有效' },
    { id: 'ZZ-04', name: '安全生产标准化三级', no: '浙 AQB ****', issuer: '应急管理局', expiry: '2027-03-20', status: '有效' },
    { id: 'ZZ-05', name: 'ISO 9001 质量管理体系认证', no: 'CN ****-Q', issuer: '认证机构', expiry: '2027-05-12', status: '有效' },
    { id: 'ZZ-06', name: '消防验收备案', no: '杭消备 ****', issuer: '消防救援机构', expiry: null, status: '长期' }
  ],
  ip: {
    trademarks: [
      { id: 'TM-01', name: '锐合', regNo: '第 2306**** 号', classes: ['06'], regDate: '2017-03-14', status: '已注册' },
      { id: 'TM-02', name: '锐合', regNo: '第 2306**** 号', classes: ['07'], regDate: '2017-03-14', status: '已注册' },
      { id: 'TM-03', name: '锐合', regNo: '第 4187**** 号', classes: ['40'], regDate: '2020-08-21', status: '已注册' },
      { id: 'TM-04', name: '锐合精工', regNo: '第 5522**** 号', classes: ['07'], regDate: '2021-11-07', status: '已注册' }
    ],
    patents: [
      { id: 'ZL-01', title: '一种精密五金件多工位冷镦成型方法', kind: 'invention', appDate: '2019-11-20', grantDate: '2022-04-06', status: '有效' },
      { id: 'ZL-02', title: '一种薄壁铝合金外壳压铸工艺', kind: 'invention', appDate: '2023-06-08', grantDate: '2025-09-15', status: '有效' },
      { id: 'ZL-03', title: '一种冲压支架自动上料装置', kind: 'utility', appDate: '2022-11-02', grantDate: '2023-06-20', status: '有效' },
      { id: 'ZL-04', title: '一种密封圈装配检测治具', kind: 'utility', appDate: '2023-10-08', grantDate: '2024-04-12', status: '有效' },
      { id: 'ZL-05', title: '一种电镀挂具快换结构', kind: 'utility', appDate: '2024-01-15', grantDate: '2024-08-30', status: '有效' }
    ],
    software: [{ id: 'RZ-01', title: '锐合生产报工系统 V1.0', regDate: '2024-03-18' }, { id: 'RZ-02', title: '锐合质检数据采集软件 V2.0', regDate: '2025-07-22' }],
    domains: [{ name: 'ruihe-****.com', expiry: '2026-12-01' }],
    similarMarks: [
      { name: '锐合五金', classes: ['07'], holder: '同行 · 华南', similarity: 0.82, status: '初审公告中', deadline: '2026-10-05', note: '公告期内可提异议' },
      { name: '睿合', classes: ['06'], holder: '贸易商 · 华东', similarity: 0.61, status: '已注册', deadline: null, note: '可评估无效宣告' }
    ],
    infringementLeads: [
      { where: '电商平台店铺', product: '精密五金件 Ø12×45 同款', note: '商品标题使用「锐合」字样，月销 300+', similarity: 0.9, found: '2026-09-10' },
      { where: '行业展会', product: '冲压支架', note: '展品外观与 ZL-03 装置相近', similarity: 0.7, found: '2026-09-12' }
    ]
  },
  setup: { type: 'subsidiary', name: '锐合精密五金（华南）有限公司', region: '广东 · 东莞', capital: 5000000, shares: [{ holder: '杭州锐合精密五金有限公司', pct: 70 }, { holder: '华南业务团队持股平台', pct: 30, platform: true }], scope: ['精密五金件与冲压件销售', '金属材料加工'], licenses: ['排污许可'], confirmed: false, startDate: '2026-10-08', reason: 'K-048、K-074 等华南客户年采购额已超 500 万元，就近仓储与加工可缩短交期' },
  renewList: [], applyList: [], log: []
};

const trade = {
  archetype: 'flow', sector: 'trade', company: '义乌恒益日用品有限公司', co: '恒益', today: '2026-09-17', weekStart: '2026-09-14',
  profile: { industry: 'trade-wholesale', size: '21_50', province: '浙江', founded: '2019-03-06', capital: 5000000 },
  sources: [
    { id: 'contracts', name: '合同台账', mode: 'import', lastSync: '2026-09-16 18:00', rows: 8 },
    { id: 'licenses', name: '证照清单', mode: 'import', lastSync: '2026-09-15 18:00', rows: 5 },
    { id: 'ip', name: '知产清单', mode: 'import', lastSync: '2026-09-15 18:00', rows: 5 },
    { id: 'oms', name: '订单系统 · 客户与供应商', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 60 }
  ],
  contracts: [
    contract({ id: 'HT-2609-102', type: 'distribution', role: 'supplier', title: '连锁便利店年度供货协议', party: 'K-102 · 连锁便利店总部', amount: 5600000, signed: '2026-01-10', start: '2026-01-10', end: '2026-12-31', status: '履行中', milestones: [{ date: '2026-10-15', text: '第三季度返利结算' }, { date: '2026-11-20', text: '下年度协议谈判' }], clauses: [
      T.subject('供方向需方 86 家门店供应常温饮料、休闲食品等品类，按门店订单配送。'), C('price', '价格', '供货价按附件价格表执行，需方有权根据市场情况单方调整供货价。', { adjust: 'unilateral' }),
      T.payment('月结 90 天，需方于次月末支付上月货款，另扣 3% 返利。', { termDays: 90, advanceRatio: 0 }), T.term('本协议有效期 1 年，期满自动续期。', { autoRenew: true, exitNotice: false }),
      T.liability(null), T.dispute('counterparty'), T.notice()
    ] }),
    contract({ id: 'HT-2606-088', type: 'platform', role: 'merchant', title: '社区团购平台入驻协议', party: 'K-117 · 社区团购平台', amount: 0, signed: '2026-06-01', start: '2026-06-01', end: '2027-05-31', status: '履行中', milestones: [{ date: '2026-09-30', text: '月度结算' }], clauses: [
      T.subject('入驻方在平台开设店铺销售日用百货与快消品。'), C('fee', '费用与费率', '平台按成交额收取 8% 服务费，平台有权调整费率并公示。', { adjust: 'unilateral' }),
      C('settlement', '结算', '平台按月结算，于次月 45 日内支付。', { days: 45 }), C('termination', '终止', '平台可提前 15 日通知终止本协议。', {}), T.dispute('counterparty')
    ] }),
    contract({ id: 'HT-2604-071', type: 'purchase', role: 'buy', title: '品牌饮料区域经销采购合同', party: '品牌区域经销商', amount: 2600000, signed: '2026-04-01', start: '2026-04-01', end: '2027-03-31', status: '履行中', milestones: [], clauses: [
      T.subject('需方向供方采购常温饮料，年度预计 2,600 万元。'), T.quality('国家食品安全标准与产品标签'), T.delivery('供方在收到订单后 3 日内送达需方仓库。', false),
      T.payment('先款后货，需方下单时支付全款。', { termDays: 0, advanceRatio: 1 }), T.acceptance(7), C('warranty', '保质', '供方保证到货时剩余保质期不少于三分之二。', { months: 12 }), T.liability(1), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2512-044', type: 'lease', role: 'lessee', title: '仓库租赁合同', party: '物流园区', amount: 384000, signed: '2025-12-15', start: '2026-01-01', end: '2027-12-31', status: '履行中', milestones: [{ date: '2026-10-01', text: '第四季度租金' }], clauses: [
      T.subject('出租人将物流园 B 区 2,800 ㎡仓库出租给承租人。'), T.term('租赁期 2 年。', { autoRenew: false, exitNotice: true }), C('rent', '租金', '月租金 32,000 元，季付。', {}),
      C('renewal', '续租', '租赁期满承租人享有优先承租权，应提前 2 个月书面通知。', { priority: true }), C('improvements', '装修', '冷库改造经出租人同意，期满按未折旧价值补偿。', { owner: 'lessor', compensated: true }), C('termination', '提前解约', '承租人提前解约支付 1 个月租金。', { earlyExitMonths: 1 }), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2603-058', type: 'labor', role: 'employer', title: '劳动合同（配送岗模板）', party: '员工 · 配送岗', amount: 0, signed: '2026-03-01', start: '2026-03-01', end: '2027-02-28', status: '履行中', milestones: [], clauses: [
      T.subject('用人单位聘用员工担任配送司机岗位。'), T.term('劳动合同期限 1 年。', { autoRenew: false, exitNotice: true, years: 1 }), C('probation', '试用期', '试用期 3 个月。', { months: 3, allowedMonths: 2 }),
      C('wage', '劳动报酬', '月工资由基本工资与计件工资构成。', {}), C('worktime', '工作时间', '综合计算工时制。', {}), C('termination', '解除与终止', '双方依法解除或终止劳动合同。', {})
    ] }),
    contract({ id: 'HT-2608-096', type: 'service', role: 'client', title: '冷链运输服务合同', party: '物流公司', amount: 420000, signed: '2026-08-01', start: '2026-08-01', end: '2027-07-31', status: '审查中', milestones: [], clauses: [
      T.subject('服务方为客户方提供冷链配送服务，覆盖华东 6 市。'), C('sla', '服务水平', '次日达率不低于 97%。', { penalty: false }), T.payment('月结 30 天。', { termDays: 30, advanceRatio: 0 }),
      C('confidentiality', '保密', '双方对门店清单与价格信息保密，期限至合同终止后 1 年。', { years: 1, penalty: false }), T.liability(1), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2607-090', type: 'nda', role: 'disclosing', title: '选品与定价信息保密协议', party: 'K-088 · 区域商超', amount: 0, signed: '2026-07-10', start: '2026-07-10', end: '2027-07-09', status: '履行中', milestones: [], clauses: [
      C('scope', '保密范围', '选品清单、供货价与促销方案。', {}), C('confidentiality', '保密义务', '保密期限自协议终止后 3 年；违约支付违约金 10 万元。', { years: 3, penalty: true }), T.term('有效期 1 年。', { autoRenew: false, exitNotice: true }), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2602-052', type: 'software', role: 'client', title: '订单与仓储系统订阅合同', party: '软件服务商', amount: 48000, signed: '2026-02-15', start: '2026-02-15', end: '2027-02-14', status: '履行中', milestones: [{ date: '2026-12-15', text: '续约评估' }], clauses: [
      T.subject('订单与仓储系统订阅，20 个账号。'), C('sla', '服务水平', '月度可用率 99.5%，未达标按 10% 减免。', { penalty: true }), C('data', '数据', '客户数据归客户方所有。', { owner: 'client' }), T.payment('年付。', { termDays: 10, advanceRatio: 1 }), C('ip', '知识产权', '软件著作权归服务方。', { owner: 'provider' }), T.dispute('ours')
    ] })
  ],
  licenses: [
    { id: 'ZZ-01', name: '营业执照', no: '9133********02', issuer: '市场监督管理局', expiry: null, status: '长期' },
    { id: 'ZZ-02', name: '食品经营许可证', no: 'JY1330********', issuer: '市场监督管理局', expiry: '2026-11-08', status: '有效' },
    { id: 'ZZ-03', name: '道路运输经营许可证', no: '浙交运管许可 ****', issuer: '交通运输局', expiry: '2027-06-30', status: '有效' },
    { id: 'ZZ-04', name: '冷库特种设备使用登记', no: '****', issuer: '市场监督管理局', expiry: '2026-10-20', status: '有效' },
    { id: 'ZZ-05', name: '进出口经营权备案', no: '****', issuer: '商务局', expiry: null, status: '长期' }
  ],
  ip: {
    trademarks: [{ id: 'TM-01', name: '恒益优选', regNo: '第 3812**** 号', classes: ['35'], regDate: '2019-10-21', status: '已注册' }, { id: 'TM-02', name: '恒益优选', regNo: '第 3812**** 号', classes: ['30'], regDate: '2019-10-21', status: '已注册' }],
    patents: [{ id: 'ZL-01', title: '一种可折叠周转箱', kind: 'design', appDate: '2023-05-12', grantDate: '2023-11-02', status: '有效' }],
    software: [{ id: 'RZ-01', title: '恒益门店订货小程序 V1.0', regDate: '2024-06-10' }],
    domains: [{ name: 'hengyi-****.cn', expiry: '2026-10-28' }],
    similarMarks: [{ name: '恒亿优选', classes: ['35'], holder: '同行 · 华东', similarity: 0.85, status: '初审公告中', deadline: '2026-10-12', note: '公告期内可提异议' }],
    infringementLeads: [{ where: '社区团购店铺', product: '恒益优选同款礼盒', note: '包装使用「恒益优选」字样', similarity: 0.88, found: '2026-09-08' }]
  },
  setup: { type: 'branch', name: '义乌恒益日用品有限公司华南分公司', region: '广东 · 广州', capital: 0, shares: [{ holder: '义乌恒益日用品有限公司', pct: 100 }], scope: ['日用百货批发', '食品销售'], licenses: ['食品经营许可'], confirmed: false, startDate: '2026-10-12', reason: 'K-154 华南连锁便利店总部已签年度协议，需就近仓配' },
  renewList: [], applyList: [], log: []
};

const prof = {
  archetype: 'service', sector: 'prof', company: '成都启元财税服务有限公司', co: '启元', today: '2026-09-17', weekStart: '2026-09-14',
  profile: { industry: 'prof-accounting', size: '21_50', province: '四川', founded: '2016-08-22', capital: 2000000 },
  sources: [
    { id: 'contracts', name: '合同台账', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 8 },
    { id: 'licenses', name: '证照与资质清单', mode: 'import', lastSync: '2026-09-15 18:00', rows: 4 },
    { id: 'ip', name: '知产清单', mode: 'import', lastSync: '2026-09-15 18:00', rows: 4 },
    { id: 'crm', name: 'CRM · 客户合同', mode: 'direct', lastSync: '2026-09-17 07:30', rows: 46 }
  ],
  contracts: [
    contract({ id: 'HT-2609-211', type: 'service', role: 'provider', title: '代理记账服务合同', party: 'K-311 · 餐饮管理公司', amount: 216000, signed: '2026-01-05', start: '2026-01-05', end: '2026-12-31', status: '履行中', milestones: [{ date: '2026-11-15', text: '续约谈判' }], clauses: [
      T.subject('服务方为客户方 12 家门店提供代理记账与纳税申报服务。'), C('sla', '服务水平', '每月 10 日前完成上月账务处理并出具报表。', { penalty: true }), T.payment('季度预付。', { termDays: 0, advanceRatio: 0.25 }),
      C('confidentiality', '保密', '服务方对客户方财务信息保密，期限至合同终止后 1 年。', { years: 1, penalty: false }), T.liability(null), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2608-205', type: 'service', role: 'provider', title: '年度汇算清缴与审计协作合同', party: 'K-298 · 培训机构', amount: 86000, signed: '2026-08-10', start: '2026-08-10', end: '2027-06-30', status: '审查中', milestones: [{ date: '2026-09-30', text: '资料交接' }], clauses: [
      T.subject('服务方为客户方提供年度汇算清缴与审计协作服务。'), C('sla', '服务水平', '按税务机关时限完成申报。', { penalty: false }), T.payment('签订后付 50%，完成后付 50%。', { termDays: 10, advanceRatio: 0.5 }),
      C('confidentiality', '保密', '保密期限至合同终止后 3 年，违约支付违约金 5 万元。', { years: 3, penalty: true }), T.liability(1), T.dispute('counterparty')
    ] }),
    contract({ id: 'HT-2605-188', type: 'labor', role: 'employer', title: '劳动合同（会计岗模板）', party: '员工 · 会计岗', amount: 0, signed: '2026-05-01', start: '2026-05-01', end: '2028-04-30', status: '履行中', milestones: [], clauses: [
      T.subject('用人单位聘用员工担任主办会计。'), T.term('劳动合同期限 2 年。', { autoRenew: false, exitNotice: true, years: 2 }), C('probation', '试用期', '试用期 2 个月。', { months: 2, allowedMonths: 2 }), C('wage', '劳动报酬', '月薪制。', {}), C('worktime', '工作时间', '标准工时制。', {}),
      C('noncompete', '竞业限制', '离职后 12 个月内不得到同城代账机构任职。', { compensation: false, months: 12 }), C('termination', '解除与终止', '双方依法解除或终止。', {})
    ] }),
    contract({ id: 'HT-2512-160', type: 'lease', role: 'lessee', title: '写字楼租赁合同', party: '写字楼物业', amount: 336000, signed: '2025-12-01', start: '2026-01-01', end: '2027-12-31', status: '履行中', milestones: [{ date: '2026-10-01', text: '第四季度租金' }], clauses: [
      T.subject('出租人将 12 层 1206–1208 室共 420 ㎡出租给承租人办公。'), T.term('租赁期 2 年。', { autoRenew: false, exitNotice: true }), C('rent', '租金', '月租金 28,000 元，季付。', {}), C('renewal', '续租', '期满另行协商。', { priority: false }),
      C('improvements', '装修', '装修归出租人所有。', { owner: 'lessor', compensated: false }), C('termination', '提前解约', '承租人提前解约支付 2 个月租金。', { earlyExitMonths: 2 }), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2607-196', type: 'nda', role: 'disclosing', title: '客户资料保密协议（外聘审核）', party: '合作事务所', amount: 0, signed: '2026-07-01', start: '2026-07-01', end: '2027-06-30', status: '履行中', milestones: [], clauses: [
      C('scope', '保密范围', '客户名单、账套数据与申报资料。', {}), C('confidentiality', '保密义务', '保密期限至协议终止后 2 年。', { years: 2, penalty: false }), T.term('有效期 1 年。', { autoRenew: false, exitNotice: true }), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2603-172', type: 'software', role: 'client', title: '财务软件账套授权合同', party: '软件服务商', amount: 27200, signed: '2026-03-01', start: '2026-03-01', end: '2027-02-28', status: '履行中', milestones: [{ date: '2026-12-01', text: '账套续费评估' }], clauses: [
      T.subject('40 套账套年度授权。'), C('sla', '服务水平', '月度可用率 99.5%。', { penalty: false }), C('data', '数据', '账套数据存储于服务方云端，服务方可用于产品优化。', { owner: 'provider' }), T.payment('年付。', { termDays: 10, advanceRatio: 1 }), C('ip', '知识产权', '软件著作权归服务方。', { owner: 'provider' }), T.dispute('counterparty')
    ] }),
    contract({ id: 'HT-2609-214', type: 'service', role: 'provider', title: '财税顾问服务合同', party: 'K-342 · 电商公司', amount: 144000, signed: '2026-09-05', start: '2026-09-05', end: '2027-09-04', status: '审查中', milestones: [], clauses: [
      T.subject('服务方为客户方提供多平台账单核对与财税顾问服务。'), C('sla', '服务水平', '每月 5 日前完成上月核对。', { penalty: true }), T.payment('月结。', { termDays: 30, advanceRatio: 0 }), C('confidentiality', '保密', '保密期限至合同终止后 3 年，违约支付违约金 5 万元。', { years: 3, penalty: true }), T.liability(1), T.dispute('ours')
    ] }),
    contract({ id: 'HT-2604-180', type: 'agency', role: 'principal', title: '客户推荐合作协议', party: '银行支行', amount: 0, signed: '2026-04-15', start: '2026-04-15', end: '2027-04-14', status: '履行中', milestones: [], clauses: [
      T.subject('合作方向委托方推荐小微企业客户，委托方按签约客户支付推荐费。'), C('exclusivity', '排他', '合作方在辖区内独家推荐。', { exclusive: true, minVolume: null }), T.term('有效期 1 年，期满自动续期。', { autoRenew: true, exitNotice: false }), T.payment('按季结算推荐费。', { termDays: 30, advanceRatio: 0 }), C('termination', '终止', '任何一方提前 30 日通知可终止。', {}), T.dispute('ours')
    ] })
  ],
  licenses: [
    { id: 'ZZ-01', name: '营业执照', no: '9151********03', issuer: '市场监督管理局', expiry: null, status: '长期' },
    { id: 'ZZ-02', name: '代理记账许可证书', no: '川财会代 ****', issuer: '财政局', expiry: '2026-12-31', status: '有效' },
    { id: 'ZZ-03', name: '税务师事务所行政登记', no: '****', issuer: '税务局', expiry: '2027-08-30', status: '有效' },
    { id: 'ZZ-04', name: '专职会计从业人员备案（12 人）', no: '****', issuer: '财政局', expiry: '2026-10-31', status: '有效' }
  ],
  ip: {
    trademarks: [{ id: 'TM-01', name: '启元财税', regNo: '第 3120**** 号', classes: ['35'], regDate: '2016-11-28', status: '已注册' }],
    patents: [],
    software: [{ id: 'RZ-01', title: '启元票据识别与凭证初录系统 V1.0', regDate: '2025-02-14' }, { id: 'RZ-02', title: '启元客户经营月报生成工具 V1.0', regDate: '2026-01-20' }],
    domains: [{ name: 'qiyuan-****.com', expiry: '2027-02-10' }],
    similarMarks: [{ name: '启源财税', classes: ['35'], holder: '同行 · 西南', similarity: 0.79, status: '已注册', deadline: null, note: '可评估无效宣告' }],
    infringementLeads: [{ where: '本地生活平台', product: '代理记账服务', note: '店铺名使用「启元」字样', similarity: 0.86, found: '2026-09-11' }]
  },
  setup: { type: 'branch', name: '成都启元财税服务有限公司高新分公司', region: '四川 · 成都高新区', capital: 0, shares: [{ holder: '成都启元财税服务有限公司', pct: 100 }], scope: ['财务咨询', '代理记账'], licenses: ['代理记账许可'], confirmed: false, startDate: '2026-10-09', reason: '高新区科技类客户占新签 40%，就近服务并申请园区扶持' },
  renewList: [], applyList: [], log: []
};

[mfg, trade, prof].forEach((p) => W(p.sector + '.json', p));
console.log('samples written: mfg / trade / prof');
