export type Risk = 'red' | 'orange' | 'yellow' | 'green';
export interface Company {
  id: string; name: string; industry: string; district: string; owner: string;
  relation: string; exposure: number; deposit: number; settlement: number; risk: Risk; tags: string[]; note: string;
  x: number; y: number; // 地图相对坐标 0..1
}
export const COMPANIES: Company[] = [
  { id: 'ninggui', name: '宁桂精密机械', industry: '精密制造', district: '高新区', owner: 'wang', relation: '存量结算户 · 首次申请授信', exposure: 0, deposit: 860, settlement: 4200, risk: 'yellow', tags: ['新能源车企定点', '出口收汇 30%', '尽调中'], note: '获某新能源车企定点，SOP 后年供货约 1.2 亿；其他应收款突增 1,900 万待核实', x: 0.62, y: 0.32 },
  { id: 'shenghe', name: '晟禾食品集团', industry: '食品加工', district: '经开区', owner: 'zhou', relation: '贷款客户 · 集团', exposure: 2000, deposit: 3400, settlement: 18000, risk: 'orange', tags: ['集团 6 子公司', '2 家隐性关联', '3 家子公司未开户'], note: '集团营收 18 亿，全行业授信 4.5 亿，本行份额 4%', x: 0.42, y: 0.55 },
  { id: 'caisheng', name: '彩晟商贸', industry: '商贸流通', district: '城东区', owner: 'lin', relation: '结算户 · 晟禾经销商', exposure: 0, deposit: 120, settlement: 900, risk: 'red', tags: ['被执行 860 万', '结算量降 62%', '晟禾担保 500 万'], note: '晟禾对其应收 1,800 万并担保 500 万，风险向晟禾传导', x: 0.70, y: 0.60 },
  { id: 'beiling', name: '北岭铝材', industry: '有色加工', district: '临港区', owner: 'wang', relation: '贷款客户 · 宁桂上游', exposure: 800, deposit: 260, settlement: 2100, risk: 'orange', tags: ['票据逾期', '宁桂供应商'], note: '票据逾期 1 笔，关联宁桂精密供应链', x: 0.25, y: 0.70 },
  { id: 'c05', name: '桂澜跨境电商', industry: '跨境电商', district: '保税区', owner: 'lin', relation: '结算户', exposure: 0, deposit: 410, settlement: 3100, risk: 'green', tags: ['结汇需求'], note: '东盟出口收汇稳定', x: 0.80, y: 0.42 },
  { id: 'c06', name: '衡瑞医药流通', industry: '医药流通', district: '城北区', owner: 'wang', relation: '贷款客户', exposure: 1500, deposit: 900, settlement: 6800, risk: 'green', tags: ['续贷 60 天到期'], note: '授信 60 天后到期，启动续贷', x: 0.50, y: 0.22 },
  { id: 'c07', name: '澄宇建材贸易', industry: '建材贸易', district: '城东区', owner: 'lin', relation: '结算户', exposure: 0, deposit: 75, settlement: 640, risk: 'yellow', tags: ['结算量流失'], note: '结算量环比下降 35%', x: 0.74, y: 0.72 },
  { id: 'c08', name: '融岚软件', industry: '软件服务', district: '高新区', owner: 'wang', relation: '贷款客户', exposure: 500, deposit: 320, settlement: 1500, risk: 'green', tags: ['专精特新'], note: '知识产权质押', x: 0.58, y: 0.40 },
  { id: 'c09', name: '嘉禾连锁餐饮', industry: '连锁餐饮', district: '城南区', owner: 'lin', relation: '结算户', exposure: 0, deposit: 210, settlement: 2600, risk: 'green', tags: ['结算量上升'], note: '结算量环比上升 28%，存款机会', x: 0.48, y: 0.80 },
  { id: 'c10', name: '东岭新能源', industry: '新能源', district: '临港区', owner: 'zhou', relation: '贷款客户', exposure: 3000, deposit: 1800, settlement: 9800, risk: 'green', tags: ['固定资产贷款'], note: '光伏组件产线扩建', x: 0.18, y: 0.55 },
  { id: 'c11', name: '汇源物流', industry: '物流仓储', district: '临港区', owner: 'zhou', relation: '贷款客户', exposure: 1200, deposit: 640, settlement: 5200, risk: 'yellow', tags: ['运价下行'], note: '行业周期下行关注', x: 0.30, y: 0.42 },
  { id: 'c12', name: '青原农业科技', industry: '现代农业', district: '城南区', owner: 'lin', relation: '结算户', exposure: 0, deposit: 95, settlement: 880, risk: 'green', tags: ['涉农'], note: '涉农贷款需求', x: 0.36, y: 0.86 },
];
export const companyById = (id: string) => COMPANIES.find((c) => c.id === id)!;
