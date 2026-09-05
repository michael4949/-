export type Tone = 'red' | 'gold' | 'green' | 'blue' | 'purple';
export interface Product {
  id: string;        // P01..P14
  name: string;      // 产品名
  en: string;        // 英文副题
  tagline: string;   // 一句话
  tone: Tone;
  icon: string;      // lucide icon name
  route: string;     // hash route
}
export const PRODUCTS: Product[] = [
  { id: 'P01', name: '智慧获客引擎', en: 'Prospecting Engine', tagline: '目标客户筛选、商机预测与拜访计划', tone: 'red', icon: 'Radar', route: '/p/P01' },
  { id: 'P02', name: '客户全景洞察', en: 'Customer 360', tagline: '画像、需求预测、分层与价值评估', tone: 'gold', icon: 'ScanSearch', route: '/p/P02' },
  { id: 'P03', name: '财务智能诊断', en: 'Financial Diagnosis', tagline: '三表解读、指标复算、现金流预测', tone: 'green', icon: 'Calculator', route: '/p/P03' },
  { id: 'P04', name: '行业与宏观研判', en: 'Industry & Macro', tagline: '行业周期、区域与产业链风险图谱', tone: 'blue', icon: 'Globe2', route: '/p/P04' },
  { id: 'P05', name: '方案设计与智能定价', en: 'Solution & Pricing', tagline: '产品组合、融资结构、LPR 加点定价', tone: 'gold', icon: 'Layers', route: '/p/P05' },
  { id: 'P06', name: '授信智能工作台', en: 'Credit Workbench', tagline: '尽调、授信报告、担保评估、合同审核', tone: 'red', icon: 'FileCheck2', route: '/p/P06' },
  { id: 'P07', name: '贷后风险哨兵', en: 'Post-loan Sentinel', tagline: '预警、传导、舆情、处置建议', tone: 'red', icon: 'ShieldAlert', route: '/p/P07' },
  { id: 'P08', name: '集团客户作战室', en: 'Group War Room', tagline: '关系图谱、价值链、联动策略', tone: 'purple', icon: 'Network', route: '/p/P08' },
  { id: 'P09', name: '智能陪练底座', en: 'AI Sparring Base', tagline: '真实工作场景对练与多维评估', tone: 'green', icon: 'MessagesSquare', route: '/p/P09' },
  { id: 'P10', name: '沟通与话术助手', en: 'Talk Assistant', tagline: '话术、异议、礼仪卡、专业名片', tone: 'gold', icon: 'Sparkles', route: '/p/P10' },
  { id: 'P11', name: '合规与政策中枢', en: 'Compliance Hub', tagline: '制度问答、流程导航、合规检查', tone: 'blue', icon: 'Scale', route: '/p/P11' },
  { id: 'P12', name: '智能办公协作', en: 'Smart Office', tagline: '文档、纪要、报表、计划、项目', tone: 'purple', icon: 'Briefcase', route: '/p/P12' },
  { id: 'P13', name: '增值方案工坊', en: 'Value-add Studio', tagline: '为客户出具战略与数字化建议书', tone: 'green', icon: 'Lightbulb', route: '/p/P13' },
  { id: 'P14', name: '能力画像与成长', en: 'Capability Profile', tagline: '多维雷达、丰富标签、成长路径', tone: 'gold', icon: 'UserRoundCheck', route: '/p/P14' },
];
export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);
