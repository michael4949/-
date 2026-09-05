export interface Persona { id: string; name: string; title: string; org: string; years: string; customers: number; avatar: string; focus: string }
export const PERSONAS: Persona[] = [
  { id: 'lin', name: '林小雨', title: '企金客户经理', org: '远山银行（演示）· 城东支行', years: '入行 8 个月', customers: 23, avatar: '林', focus: '存量结算户开发、贷后检查' },
  { id: 'wang', name: '王志远', title: '企金客户经理', org: '远山银行（演示）· 城东支行', years: '5 年', customers: 46, avatar: '王', focus: '中型制造业授信、续贷与交叉销售' },
  { id: 'zhou', name: '周慧敏', title: '集团客户团队负责人', org: '远山银行（演示）· 分行公司业务部', years: '14 年', customers: 62, avatar: '周', focus: '集团客户综合方案、跨境与供应链' },
  { id: 'huang', name: '黄建国', title: '支行行长', org: '远山银行（演示）· 城东支行', years: '22 年', customers: 0, avatar: '黄', focus: '团队产能与组合风险' },
];
