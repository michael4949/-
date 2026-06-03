// =====================================================================
//  税擎 TaxPilot · AI 税务自动申报智能体 — 领域类型
// =====================================================================

/** 纳税主体（集团下的法人 / 分支机构） */
export interface Entity {
  id: string;
  name: string;
  shortName: string;
  taxId: string;                 // 统一社会信用代码
  vatType: "一般纳税人" | "小规模纳税人";
  industry: string;
  region: string;
  badges?: string[];             // 高新技术企业 / 小型微利 / 出口退税 等
  role?: string;                 // 母公司 / 子公司 / 分支机构
}

export type TaxKind =
  | "增值税及附加"
  | "企业所得税"
  | "个人所得税"
  | "印花税"
  | "房产税"
  | "城镇土地使用税"
  | "消费税"
  | "环境保护税";

export type FilingStatus =
  | "待采集"        // 数据采集中
  | "AI已生成"      // 智能体已生成草表，待人工介入
  | "待复核"        // 制单完成，待复核
  | "待审批"        // 复核通过，待税务经理审批
  | "可申报"        // 审批通过，可一键申报
  | "已申报"        // 已申报，待缴款
  | "已缴款";       // 申报并扣款完成

export interface FilingLine {
  label: string;
  value: number;
  source?: string;       // 数据溯源（来自哪张表 / 哪个系统）
  kind?: "in" | "out" | "calc" | "result" | "sub";
  note?: string;
}

export interface AuditEvent {
  at: string;            // 时间
  who: string;           // 操作人（AI / 姓名）
  action: string;        // 动作
}

export interface Filing {
  id: string;
  entityId: string;
  taxKind: TaxKind;
  period: string;            // 所属期，如 2026-05
  formName: string;         // 申报表全称
  payable: number;          // 本期应纳税额（元）
  status: FilingStatus;
  dueDate: string;          // 申报截止
  completeness: number;     // 数据完整度 0-100
  risk: "none" | "low" | "mid" | "high";
  lines: FilingLine[];
  preparedBy: string;       // 制单：AI智能体 / 姓名
  updatedAt: string;
  audit: AuditEvent[];
}

export interface RiskItem {
  id: string;
  level: "high" | "mid" | "low";
  entityId: string;
  taxKind?: TaxKind;
  title: string;
  detail: string;
  rule: string;             // 触发指标 / 金税四期规则
  suggestion: string;
  amount?: number;          // 涉及金额
  status: "待处理" | "已采纳" | "已忽略";
}

export interface SavingItem {
  id: string;
  entityId: string;
  title: string;
  category: "加计扣除" | "留抵退税" | "税率优惠" | "财政奖补" | "税收筹划";
  detail: string;
  policy: string;           // 政策依据
  estSaving: number;        // 预计可节省 / 可退（元）
  confidence: number;       // 把握度 0-100
  status: "待评估" | "可申请" | "已采纳";
}

export interface AgentStep {
  id: string;
  icon: string;             // 映射到 lucide 图标名
  title: string;
  desc: string;
  detail: string[];         // 推理 / 动作明细（可展开）
  metrics?: { label: string; value: string }[];
  durationMs: number;
  status: "pending" | "active" | "done";
}

export type ViewId =
  | "dashboard"
  | "agent"
  | "filings"
  | "risk"
  | "saving"
  | "invoice";

export interface ChatMessage {
  role: "user" | "bot";
  text: string;
  rich?: { label: string; value: string }[];   // 可选的结构化数据块
}
