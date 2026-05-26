export type RoleKey = "gov" | "enterprise" | "provider" | "operator";

export interface Enterprise {
  id: string;
  uscc: string; // 统一社会信用代码（虚构）
  name: string;
  industryCode: string;
  districtCode: string;
  scale: string; // MICRO / SMALL / MED / LARGE
  employees: number;
  registeredAt: string;
  isHighTech: boolean;
  isSpecialized: boolean; // 专精特新
  certified: boolean;
  certifiedAt?: string;
  contact: string;
  phone: string;
  voucherBalance: number; // 当前 Token 券余额
  totalGranted: number;
  totalConsumed: number;
  monthlyTokens: number;
  yearlyTokens: number;
  yearlyCost: number;
  rating: number; // 1-5 star
}

export interface Voucher {
  id: string;
  type: string; // TOKEN / COMPUTE / MODEL / DATA / CORPUS
  batchCode: string;
  amount: number;
  amountUsed: number;
  amountRemaining: number;
  unit: string;
  rule: "PUBLIC" | "APPLY" | "INDUSTRY"; // 普惠 / 申请审批 / 行业定向
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "FROZEN";
  enterpriseId: string;
  enterpriseName: string;
  industryCode?: string;
  issuedAt: string;
  expireAt: string;
  policyId?: string;
}

export interface VoucherApplication {
  id: string;
  applicationCode: string;
  enterpriseId: string;
  enterpriseName: string;
  industryCode: string;
  districtCode: string;
  scale: string;
  voucherType: string;
  requestedAmount: number;
  unit: string;
  scenario: string;
  reason: string;
  attachments: string[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION";
  submittedAt: string;
  reviewedAt?: string;
  reviewer?: string;
  comments?: string;
  approvedAmount?: number;
  policyId?: string;
}

export interface Model {
  code: string;
  name: string;
  vendor: string;
  type: string;
  priceIn: number;
  priceOut: number;
  ctx: number;
  isDomestic: boolean;
  status: "LIVE" | "BETA" | "DEPRECATED";
  rps: number; // 实时 QPS
  latency: number; // ms
  availability: number; // 0-1
  rating: number;
  totalCalls: number;
  totalTokens: number;
  totalRevenue: number;
  monthCalls: number;
  monthTokens: number;
  enrolledAt: string;
}

export interface ComputeCenter {
  id: string;
  name: string;
  type: string; // INTEL / SUPER / GENER
  vendor: string;
  districtCode: string;
  address: string;
  lat: number;
  lng: number;
  chips: { code: string; count: number }[]; // 不同芯片数量
  totalCards: number;
  totalTflops: number;
  utilization: number; // 0-1
  power: number; // kW
  pue: number;
  greenRatio: number;
  priceUnit: number; // 元/卡时
  status: "ONLINE" | "MAINTENANCE" | "DEGRADED" | "OFFLINE";
  online: boolean;
  enrolledAt: string;
  contact: string;
}

export interface ScheduleLog {
  id: string;
  ts: string;
  taskCode: string;
  enterpriseId: string;
  enterpriseName: string;
  modelCode?: string;
  scenario: string;
  cardsRequested: number;
  cardsAllocated: number;
  chipPref: string;
  fromCenter: string;
  routed: boolean;
  reason: string;
  durationMin: number;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "PREEMPTED";
}

export interface Policy {
  id: string;
  code: string;
  title: string;
  issuer: string;
  level: "市" | "区" | "国家";
  category: string;
  tags: string[];
  summary: string;
  content: string;
  publishedAt: string;
  expiresAt?: string;
  status: "ACTIVE" | "EXPIRED" | "DRAFT";
  views: number;
  industryTargets: string[];
  budget: number; // 配套预算（元）
  voucherBatch?: string; // 关联券批次
}

export interface MarketApp {
  id: string;
  name: string;
  vendor: string;
  category: string;
  industries: string[];
  description: string;
  tags: string[];
  rating: number;
  reviews: number;
  installs: number;
  priceType: "FREE" | "TRIAL" | "PAID" | "VOUCHER";
  price?: number;
  cover: string;
  publishedAt: string;
  status: "LIVE" | "PENDING" | "DRAFT";
}

export interface Match { // 需求撮合
  id: string;
  enterpriseId: string;
  enterpriseName: string;
  industryCode: string;
  title: string;
  description: string;
  budget: number;
  status: "OPEN" | "MATCHED" | "CLOSED";
  postedAt: string;
  offers: number;
}

export interface AlertItem {
  id: string;
  ts: string;
  level: "INFO" | "WARN" | "CRITICAL";
  category: "USAGE" | "COMPUTE" | "VOUCHER" | "SECURITY" | "POLICY";
  title: string;
  detail: string;
  related?: string;
  acked: boolean;
}

export interface CityKPI {
  totalEnterprises: number;
  certifiedEnterprises: number;
  monthlyActiveEnterprises: number;
  totalTokenIssued: number;
  totalTokenConsumed: number;
  yesterdayTokens: number;
  yesterdayCost: number;
  totalCalls: number;
  yesterdayCalls: number;
  totalComputeCards: number;
  computeUtilization: number;
  totalModels: number;
  totalSubsidy: number;
  ytdSubsidy: number;
  industryGrowth: number;
  totalApps: number;
  matchedDemands: number;
}

export interface TimeSeriesPoint {
  date: string;
  tokens: number;
  calls: number;
  cost: number;
  active: number;
}

export interface IndustryUsage {
  industryCode: string;
  industryName: string;
  enterprises: number;
  tokens: number;
  cost: number;
  growth: number;
  color: string;
}

export interface ModelUsage {
  modelCode: string;
  modelName: string;
  vendor: string;
  tokens: number;
  calls: number;
  share: number;
}

export interface DistrictUsage {
  districtCode: string;
  districtName: string;
  enterprises: number;
  tokens: number;
  cost: number;
  level: string;
  lat: number;
  lng: number;
}
