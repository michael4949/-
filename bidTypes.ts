// =====================================================================
//  标书智能工厂（招标文件 → 500-1000 页投标文件）相关类型
// =====================================================================

/** 排版板式：国标公文式（GB/T 9704）或通用标书式（小四宋体） */
export type LayoutId = "gbGov" | "general";

export interface BidOptions {
  targetPages: number;            // 目标页数（300-1200，常规 500-1000）
  layout: LayoutId;
  smartModel: boolean;            // 极致档：撰写阶段也用最高思考力度（effort=high，更强更贵）
  concurrency: number;            // 撰写并发路数（2-4）
  includeDeviationTables: boolean;// 自动编制商务/技术偏差（响应）表
}

/** 评分办法中的一条 */
export interface ScoreItem {
  item: string;        // 评分项
  score: string;       // 分值
  requirement: string; // 评分标准/要求
}

/** 从招标文件中结构化抽取的关键信息 */
export interface TenderProfile {
  projectName: string;
  tenderNo: string;          // 招标编号
  purchaser: string;         // 招标人/采购人
  agent: string;             // 招标代理机构
  budget: string;            // 预算金额/最高限价
  duration: string;          // 工期/交货期/服务期
  location: string;          // 项目地点
  industry: string;          // 项目类型（工程/货物/服务及行业）
  overview: string;          // 项目概况与建设内容
  techRequirements: string[];// 技术需求/采购需求要点
  scoring: ScoreItem[];      // 评分办法
  mandatory: string[];       // 实质性（★）条款 / 否决（废标）条款
  formatRules: string[];     // 投标文件编制与格式要求
  docRequirements: string[]; // 要求提供的证明材料清单
}

/** 投标人（公司）事实表——所有生成内容必须与此一致，缺失项不得编造 */
export interface CompanyProfile {
  name: string;        // 公司全称
  creditCode: string;  // 统一社会信用代码
  regCapital: string;  // 注册资本
  founded: string;     // 成立时间
  address: string;     // 注册地址
  legalPerson: string; // 法定代表人
  contact: string;     // 联系人及电话
  qualifications: string; // 资质证书（每行一条）
  achievements: string;   // 类似项目业绩（每行一条）
  keyStaff: string;       // 拟投入主要人员（每行一条）
  honors: string;         // 获奖/信用情况
  financial: string;      // 财务概况
  extra: string;          // 其他补充说明
}

/** 大纲节点内容形态：正文为主 / 表格为主 / 函件·表单 */
export type NodeKind = "prose" | "table" | "form";

export interface OutlineNode {
  id: string;          // 路径编号，如 "3" / "3.2" / "3.2.1"
  title: string;
  brief: string;       // 写作要点（覆盖哪些评分点/要求）
  level: number;       // 0=章，1/2/3 为节
  kind: NodeKind;
  targetChars: number; // 叶子节点的目标字数（非叶子为 0）
  children: OutlineNode[];
}

export type SectionStatus = "pending" | "writing" | "done" | "error";

export interface SectionDraft {
  id: string;
  status: SectionStatus;
  content: string; // Markdown-lite：段落 / | 表格 | / - 列表
  chars: number;
  rounds: number;  // 已用生成轮数（含续写）
  error?: string;
}

export interface ReviewIssue {
  sectionId: string; // 空串表示全局问题
  type: "placeholder" | "short" | "uncovered" | "manual";
  detail: string;
  fixed?: boolean;
}

export type BidStageId = "parse" | "outline" | "write" | "review" | "render";

export interface BidStage {
  id: BidStageId;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
}

export interface WriteProgress {
  totalLeaves: number;
  doneLeaves: number;
  totalChars: number;
  targetChars: number;
  estPages: number;
  targetPages: number;
  activeTitles: string[]; // 正在撰写的小节
  calls: number;          // 已发起的模型调用次数
}

/** 一次完整任务的可恢复状态（存 IndexedDB，刷新后可断点续跑） */
export interface BidRunState {
  id: string;
  createdAt: number;
  updatedAt: number;
  stage: BidStageId | "outline-review" | "done";
  options: BidOptions;
  tenderText: string; // 招标文件原文（超长时截断保存）
  tender?: TenderProfile;
  company?: CompanyProfile;
  outline?: OutlineNode[];
  sections: Record<string, SectionDraft>;
  issues?: ReviewIssue[];
  stats?: { chars: number; estPages: number; calls: number; ms: number };
}
