// =====================================================================
//  税擎 TaxPilot · 演示数据（XXX集团 · 2026年5月所属期）
//  说明：纯前端演示数据，所有数字为虚构样例；金额单位为「元」。
// =====================================================================
import { Entity, Filing, RiskItem, SavingItem, AgentStep, TaxKind } from "../types";

export const GROUP_NAME = "XXX集团";
export const PERIOD = "2026-05";
export const PERIOD_LABEL = "2026年5月";
export const DUE_DATE = "2026-06-15";
export const TODAY = "2026-06-03";

// ---------------------------------------------------------------------
//  格式化工具
// ---------------------------------------------------------------------
export function fmtCNY(n: number): string {
  return "¥" + Math.round(n).toLocaleString("zh-CN");
}
export function fmtWan(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + " 亿";
  if (abs >= 1e4) return (n / 1e4).toFixed(digits) + " 万";
  return Math.round(n).toLocaleString("zh-CN");
}
export function fmtCNYWan(n: number, digits = 1): string {
  return "¥ " + fmtWan(n, digits);
}
export function fmtPct(n: number, digits = 1): string {
  return n.toFixed(digits) + "%";
}
export function daysUntil(dateStr: string, from = TODAY): number {
  const d = (s: string) => new Date(s + "T00:00:00").getTime();
  return Math.round((d(dateStr) - d(from)) / 86400000);
}

export const taxKindColor: Record<string, string> = {
  增值税及附加: "#3358F4",
  企业所得税: "#6D5EF6",
  个人所得税: "#0FB5BA",
  印花税: "#E08600",
  房产税: "#E23D5B",
  城镇土地使用税: "#EB6F4A",
  其他: "#8A93A6",
};

// ---------------------------------------------------------------------
//  纳税主体
// ---------------------------------------------------------------------
export const entities: Entity[] = [
  { id: "e1", name: "XXX集团有限公司", shortName: "集团总部", taxId: "91310000XXXXXXXX1A", vatType: "一般纳税人", industry: "投资控股 / 智能制造", region: "上海", role: "母公司", badges: ["增值税一般纳税人", "合并报表主体"] },
  { id: "e2", name: "XXX科技（深圳）有限公司", shortName: "XXX科技", taxId: "91440300XXXXXXXX2B", vatType: "一般纳税人", industry: "软件与信息技术服务", region: "深圳", role: "子公司", badges: ["高新技术企业", "研发加计扣除"] },
  { id: "e3", name: "XXX销售有限公司", shortName: "XXX销售", taxId: "91310115XXXXXXXX3C", vatType: "一般纳税人", industry: "批发零售", region: "上海", role: "子公司", badges: ["增值税一般纳税人"] },
  { id: "e4", name: "XXX智能制造有限公司", shortName: "XXX智造", taxId: "91320500XXXXXXXX4D", vatType: "一般纳税人", industry: "通用设备制造", region: "苏州", role: "子公司", badges: ["增值税一般纳税人", "出口退税"] },
  { id: "e5", name: "XXX供应链物流有限公司", shortName: "XXX物流", taxId: "91310000XXXXXXXX5E", vatType: "一般纳税人", industry: "运输仓储", region: "上海", role: "子公司", badges: ["增值税一般纳税人"] },
  { id: "e6", name: "XXX供应链服务（海南）有限公司", shortName: "XXX海南", taxId: "91460000XXXXXXXX6F", vatType: "小规模纳税人", industry: "供应链管理", region: "海南", role: "子公司", badges: ["小型微利企业", "自贸港优惠"] },
];
export const entityById = (id: string): Entity =>
  entities.find((e) => e.id === id) || entities[0];

// ---------------------------------------------------------------------
//  申报事项（2026年5月所属期，含少量企业所得税历史/未来项）
// ---------------------------------------------------------------------
export const filings: Filing[] = [
  // ===== e1 集团总部 =====
  {
    id: "f-e1-vat", entityId: "e1", taxKind: "增值税及附加", period: "2026-05",
    formName: "增值税及附加税费申报表（一般纳税人）", payable: 5779200,
    status: "待审批", dueDate: DUE_DATE, completeness: 100, risk: "low",
    preparedBy: "AI智能体", updatedAt: "2026-06-03 09:12",
    lines: [
      { label: "销项税额", value: 8640000, source: "数电发票平台 · 销项 8,421 份", kind: "out" },
      { label: "进项税额（已认证可抵扣）", value: 3600000, source: "数电发票平台 · 进项 6,105 份已认证勾选", kind: "in" },
      { label: "上期留抵税额", value: 0, source: "电子税务局 · 增值税预缴台账", kind: "in" },
      { label: "进项税额转出（异常发票）", value: 120000, source: "风险引擎 · 12 份异常进项", kind: "out", note: "来自异常注销纳税人，已建议转出" },
      { label: "应纳增值税额", value: 5160000, kind: "calc", note: "销项 8,640,000 −（进项 3,600,000 − 转出 120,000）" },
      { label: "城市维护建设税（7%）", value: 361200, source: "按应纳增值税计提", kind: "sub" },
      { label: "教育费附加（3%）", value: 154800, kind: "sub" },
      { label: "地方教育附加（2%）", value: 103200, kind: "sub" },
      { label: "本期应补（退）税额合计", value: 5779200, kind: "result" },
    ],
    audit: [
      { at: "2026-06-03 09:12", who: "AI智能体", action: "自动归集发票/账务并生成申报表，表间勾稽校验通过" },
      { at: "2026-06-03 10:48", who: "李静（税务专员）", action: "复核通过，提交审批" },
    ],
  },
  {
    id: "f-e1-iit", entityId: "e1", taxKind: "个人所得税", period: "2026-05",
    formName: "个人所得税扣缴申报表", payable: 1240000,
    status: "待审批", dueDate: DUE_DATE, completeness: 100, risk: "none",
    preparedBy: "AI智能体", updatedAt: "2026-06-03 09:14",
    lines: [
      { label: "本期工资薪金所得", value: 38400000, source: "薪酬系统 / 银行代发 · 在职 1,280 人", kind: "out" },
      { label: "累计减除费用（5000元/人·月）", value: 19200000, kind: "in" },
      { label: "专项扣除（三险一金）", value: 6420000, source: "社保公积金系统", kind: "in" },
      { label: "专项附加扣除", value: 4860000, source: "个税 App 采集 · 1,108 人填报", kind: "in" },
      { label: "应纳税所得额", value: 7920000, kind: "calc" },
      { label: "本期应扣缴个人所得税", value: 1240000, kind: "result", note: "累计预扣预缴法，已减累计已缴" },
    ],
    audit: [{ at: "2026-06-03 09:14", who: "AI智能体", action: "自动归集薪酬/社保数据并生成扣缴申报表" }, { at: "2026-06-03 10:50", who: "李静（税务专员）", action: "复核通过，提交审批" }],
  },
  {
    id: "f-e1-stamp", entityId: "e1", taxKind: "印花税", period: "2026-05",
    formName: "印花税纳税申报表", payable: 186000,
    status: "待复核", dueDate: DUE_DATE, completeness: 96, risk: "none",
    preparedBy: "AI智能体", updatedAt: "2026-06-03 09:15",
    lines: [
      { label: "购销合同计税金额", value: 420000000, source: "合同台账 · 76 份购销合同", kind: "out" },
      { label: "借款合同计税金额", value: 180000000, source: "合同台账 · 银行借款", kind: "out" },
      { label: "应纳印花税", value: 186000, kind: "result", note: "购销 0.03% + 借款 0.005%" },
    ],
    audit: [{ at: "2026-06-03 09:15", who: "AI智能体", action: "自动汇总合同台账并按税目计算" }],
  },
  {
    id: "f-e1-cit-y", entityId: "e1", taxKind: "企业所得税", period: "2025年度汇缴",
    formName: "企业所得税年度纳税申报表（A类）", payable: 1250000,
    status: "已缴款", dueDate: "2026-05-31", completeness: 100, risk: "none",
    preparedBy: "AI智能体", updatedAt: "2026-05-28 16:20",
    lines: [
      { label: "利润总额", value: 86000000, source: "合并报表 · 母公司口径", kind: "out" },
      { label: "纳税调整增加额", value: 3800000, source: "业务招待费/罚款等超限调增", kind: "out" },
      { label: "纳税调整减少额", value: 5200000, source: "研发加计/免税收入调减", kind: "in" },
      { label: "应纳税所得额", value: 84600000, kind: "calc" },
      { label: "应纳所得税额（25%）", value: 21150000, kind: "sub" },
      { label: "已预缴税额", value: 19900000, kind: "in" },
      { label: "汇算清缴应补税额", value: 1250000, kind: "result" },
    ],
    audit: [{ at: "2026-05-28 16:20", who: "AI智能体", action: "生成 A 类年度申报表全套附表" }, { at: "2026-05-30 11:00", who: "王浩（税务经理）", action: "审批通过并申报" }, { at: "2026-05-31 09:30", who: "电子税务局", action: "扣款成功，缴款完成" }],
  },
  {
    id: "f-e1-cit-q2", entityId: "e1", taxKind: "企业所得税", period: "2026-Q2",
    formName: "企业所得税月（季）度预缴纳税申报表（A类）", payable: 0,
    status: "待采集", dueDate: "2026-07-15", completeness: 32, risk: "none",
    preparedBy: "AI智能体", updatedAt: "2026-06-03 08:00",
    lines: [{ label: "二季度数据采集中", value: 0, kind: "result", note: "将于季度结账后自动测算" }],
    audit: [{ at: "2026-06-03 08:00", who: "AI智能体", action: "已建档，等待二季度账务结账" }],
  },

  // ===== e2 XXX科技（高新）=====
  {
    id: "f-e2-vat", entityId: "e2", taxKind: "增值税及附加", period: "2026-05",
    formName: "增值税及附加税费申报表（一般纳税人）", payable: 1820000,
    status: "待复核", dueDate: DUE_DATE, completeness: 100, risk: "low",
    preparedBy: "AI智能体", updatedAt: "2026-06-03 09:18",
    lines: [
      { label: "销项税额（软件/技术服务 6%）", value: 3120000, source: "数电发票平台 · 销项", kind: "out" },
      { label: "进项税额（已认证）", value: 1300000, source: "数电发票平台 · 进项", kind: "in" },
      { label: "应纳增值税额", value: 1820000, kind: "calc" },
      { label: "附加税费（12%）", value: 218400, kind: "sub", note: "已享受小微附加减半，按实计列" },
      { label: "本期应补（退）税额合计", value: 1820000, kind: "result" },
    ],
    audit: [{ at: "2026-06-03 09:18", who: "AI智能体", action: "自动归集并生成申报表，留抵退税另行评估" }],
  },
  {
    id: "f-e2-iit", entityId: "e2", taxKind: "个人所得税", period: "2026-05",
    formName: "个人所得税扣缴申报表", payable: 968000,
    status: "AI已生成", dueDate: DUE_DATE, completeness: 100, risk: "none",
    preparedBy: "AI智能体", updatedAt: "2026-06-03 09:19",
    lines: [
      { label: "本期工资薪金所得", value: 24800000, source: "薪酬系统 · 研发团队 760 人", kind: "out" },
      { label: "各项扣除合计", value: 16900000, kind: "in" },
      { label: "应纳税所得额", value: 7900000, kind: "calc" },
      { label: "本期应扣缴个人所得税", value: 968000, kind: "result" },
    ],
    audit: [{ at: "2026-06-03 09:19", who: "AI智能体", action: "自动生成扣缴申报表，待人工复核" }],
  },

  // ===== e3 XXX销售（税负率偏低 · 高风险）=====
  {
    id: "f-e3-vat", entityId: "e3", taxKind: "增值税及附加", period: "2026-05",
    formName: "增值税及附加税费申报表（一般纳税人）", payable: 539400,
    status: "待审批", dueDate: DUE_DATE, completeness: 100, risk: "high",
    preparedBy: "AI智能体", updatedAt: "2026-06-03 09:21",
    lines: [
      { label: "销项税额（销售额约 3,830 万）", value: 4980000, source: "数电发票平台 · 销项", kind: "out" },
      { label: "进项税额（已认证）", value: 4498400, source: "数电发票平台 · 进项", kind: "in" },
      { label: "应纳增值税额", value: 481600, kind: "calc" },
      { label: "附加税费（12%）", value: 57792, kind: "sub" },
      { label: "本期应补（退）税额合计", value: 539400, kind: "result", note: "⚠ 增值税税负率约 1.3%，低于商贸行业预警线 3.5%" },
    ],
    audit: [{ at: "2026-06-03 09:21", who: "AI智能体", action: "生成申报表并触发税负率预警，已提交风险中心" }],
  },
  {
    id: "f-e3-iit", entityId: "e3", taxKind: "个人所得税", period: "2026-05",
    formName: "个人所得税扣缴申报表", payable: 524000, status: "已申报",
    dueDate: DUE_DATE, completeness: 100, risk: "none", preparedBy: "AI智能体", updatedAt: "2026-06-02 15:40",
    lines: [
      { label: "本期工资薪金所得", value: 14200000, source: "薪酬系统 · 420 人", kind: "out" },
      { label: "各项扣除合计", value: 9800000, kind: "in" },
      { label: "应纳税所得额", value: 4400000, kind: "calc" },
      { label: "本期应扣缴个人所得税", value: 524000, kind: "result" },
    ],
    audit: [{ at: "2026-06-02 15:40", who: "王浩（税务经理）", action: "审批通过并申报至电子税务局" }],
  },

  // ===== e4 XXX智造 =====
  {
    id: "f-e4-vat", entityId: "e4", taxKind: "增值税及附加", period: "2026-05",
    formName: "增值税及附加税费申报表（一般纳税人）", payable: 2480000, status: "可申报",
    dueDate: DUE_DATE, completeness: 100, risk: "low", preparedBy: "AI智能体", updatedAt: "2026-06-03 09:24",
    lines: [
      { label: "销项税额（13%）", value: 5600000, source: "数电发票平台 · 销项", kind: "out" },
      { label: "进项税额（已认证）", value: 3120000, source: "数电发票平台 · 进项", kind: "in" },
      { label: "应纳增值税额", value: 2480000, kind: "calc", note: "出口部分免抵退另行测算" },
      { label: "本期应补（退）税额合计", value: 2480000, kind: "result" },
    ],
    audit: [{ at: "2026-06-03 09:24", who: "AI智能体", action: "生成申报表" }, { at: "2026-06-03 11:05", who: "李静（税务专员）", action: "复核通过" }, { at: "2026-06-03 11:30", who: "王浩（税务经理）", action: "审批通过，待申报" }],
  },
  {
    id: "f-e4-iit", entityId: "e4", taxKind: "个人所得税", period: "2026-05",
    formName: "个人所得税扣缴申报表", payable: 415000, status: "可申报",
    dueDate: DUE_DATE, completeness: 100, risk: "none", preparedBy: "AI智能体", updatedAt: "2026-06-03 09:25",
    lines: [
      { label: "本期工资薪金所得", value: 11600000, source: "薪酬系统 · 1,020 人", kind: "out" },
      { label: "各项扣除合计", value: 8200000, kind: "in" },
      { label: "本期应扣缴个人所得税", value: 415000, kind: "result" },
    ],
    audit: [{ at: "2026-06-03 11:30", who: "王浩（税务经理）", action: "审批通过，待申报" }],
  },
  {
    id: "f-e4-stamp", entityId: "e4", taxKind: "印花税", period: "2026-05",
    formName: "印花税纳税申报表", payable: 96000, status: "可申报",
    dueDate: DUE_DATE, completeness: 100, risk: "none", preparedBy: "AI智能体", updatedAt: "2026-06-03 09:26",
    lines: [
      { label: "购销合同计税金额", value: 320000000, source: "合同台账", kind: "out" },
      { label: "应纳印花税", value: 96000, kind: "result", note: "购销 0.03%" },
    ],
    audit: [{ at: "2026-06-03 11:30", who: "王浩（税务经理）", action: "审批通过，待申报" }],
  },

  // ===== e5 XXX物流 =====
  {
    id: "f-e5-vat", entityId: "e5", taxKind: "增值税及附加", period: "2026-05",
    formName: "增值税及附加税费申报表（一般纳税人）", payable: 762000, status: "AI已生成",
    dueDate: DUE_DATE, completeness: 98, risk: "low", preparedBy: "AI智能体", updatedAt: "2026-06-03 09:28",
    lines: [
      { label: "销项税额（运输 9%）", value: 1620000, source: "数电发票平台 · 销项", kind: "out" },
      { label: "进项税额（已认证）", value: 858000, source: "数电发票平台 · 进项（油费/通行费）", kind: "in" },
      { label: "应纳增值税额", value: 762000, kind: "calc" },
      { label: "本期应补（退）税额合计", value: 762000, kind: "result" },
    ],
    audit: [{ at: "2026-06-03 09:28", who: "AI智能体", action: "自动生成申报表，待人工复核" }],
  },
  {
    id: "f-e5-iit", entityId: "e5", taxKind: "个人所得税", period: "2026-05",
    formName: "个人所得税扣缴申报表", payable: 183000, status: "已申报",
    dueDate: DUE_DATE, completeness: 100, risk: "none", preparedBy: "AI智能体", updatedAt: "2026-06-02 14:10",
    lines: [
      { label: "本期工资薪金所得", value: 6800000, source: "薪酬系统 · 340 人", kind: "out" },
      { label: "本期应扣缴个人所得税", value: 183000, kind: "result" },
    ],
    audit: [{ at: "2026-06-02 14:10", who: "王浩（税务经理）", action: "审批通过并申报" }],
  },

  // ===== e6 XXX海南（小规模 · 小微）=====
  {
    id: "f-e6-vat", entityId: "e6", taxKind: "增值税及附加", period: "2026-05",
    formName: "增值税及附加税费申报表（小规模纳税人）", payable: 96800, status: "可申报",
    dueDate: DUE_DATE, completeness: 100, risk: "none", preparedBy: "AI智能体", updatedAt: "2026-06-03 09:30",
    lines: [
      { label: "应税销售额（季）", value: 3226000, source: "数电发票平台 · 季度合并", kind: "out" },
      { label: "应纳增值税（1%征收率）", value: 96800, kind: "result", note: "季销售额未超 30 万部分免税，超部分按 1%" },
    ],
    audit: [{ at: "2026-06-03 09:30", who: "AI智能体", action: "自动生成小规模申报表，待申报" }],
  },
  {
    id: "f-e6-iit", entityId: "e6", taxKind: "个人所得税", period: "2026-05",
    formName: "个人所得税扣缴申报表", payable: 42000, status: "已缴款",
    dueDate: DUE_DATE, completeness: 100, risk: "none", preparedBy: "AI智能体", updatedAt: "2026-06-01 10:00",
    lines: [{ label: "本期应扣缴个人所得税", value: 42000, kind: "result" }],
    audit: [{ at: "2026-06-01 10:00", who: "王浩（税务经理）", action: "审批通过并申报，扣款完成" }],
  },
];

// ---------------------------------------------------------------------
//  风险项（金税四期 / 税负率 / 发票）
// ---------------------------------------------------------------------
export const risks: RiskItem[] = [
  {
    id: "r1", level: "high", entityId: "e3", taxKind: "增值税及附加",
    title: "增值税税负率显著低于行业预警线",
    detail: "XXX销售本期增值税税负率约 1.3%，低于批发零售行业预警线 3.5%，连续 2 个月低位，存在被金税系统预警并要求自查的风险。",
    rule: "金税四期 · 税负率预警指标（行业对比）", amount: 0,
    suggestion: "核查是否存在多抵进项 / 少计销项；补充毛利率说明与进销项合理性举证资料，必要时主动调整。", status: "待处理",
  },
  {
    id: "r2", level: "high", entityId: "e1", taxKind: "增值税及附加",
    title: "取得 12 份异常注销纳税人开具的进项发票",
    detail: "系统比对发现 12 份进项发票的开票方已被列为「异常注销 / 走逃失联」状态，价税合计约 ¥ 92.3 万，存在虚开与进项不得抵扣风险。",
    rule: "金税四期 · 异常凭证比对", amount: 120000,
    suggestion: "对应进项税额 ¥ 120,000 作进项转出（已在申报表中预置）；留存交易合同、付款凭证、物流单据备查。", status: "待处理",
  },
  {
    id: "r3", level: "mid", entityId: "e1", taxKind: "企业所得税",
    title: "业务招待费预计超扣除限额",
    detail: "母公司本年累计业务招待费约 ¥ 226 万，按「发生额 60% 与营收 0.5% 孰低」预计超限约 ¥ 38 万，年度汇缴需纳税调增。",
    rule: "企业所得税 · 税前扣除限额", amount: 380000,
    suggestion: "提前在季度预缴中预留调整，规范招待费与会议费、差旅费的列支边界。", status: "待处理",
  },
  {
    id: "r4", level: "mid", entityId: "e2", taxKind: "企业所得税",
    title: "关联交易定价缺少同期资料",
    detail: "XXX科技向集团内提供研发服务的关联交易金额较大，尚未准备转让定价同期资料，存在特别纳税调整风险。",
    rule: "特别纳税调整 · 同期资料", amount: 0,
    suggestion: "按可比非受控价格法补充定价依据，准备本地文档与主体文档。", status: "待处理",
  },
  {
    id: "r5", level: "mid", entityId: "e1", taxKind: "个人所得税",
    title: "高管全年一次性奖金接近税率临界点",
    detail: "3 名高管年终奖金额落在临界点「多发 1 元、多缴上千元」的盲区，存在多缴个税情形。",
    rule: "个人所得税 · 全年一次性奖金计税", amount: 86000,
    suggestion: "在合规前提下优化奖金发放结构，避开临界点区间，预计可为员工减负约 ¥ 8.6 万。", status: "待处理",
  },
];

// ---------------------------------------------------------------------
//  节税 / 退税机会
// ---------------------------------------------------------------------
export const savings: SavingItem[] = [
  {
    id: "s1", entityId: "e2", title: "研发费用加计扣除（100%）", category: "加计扣除",
    detail: "XXX科技本年度可归集研发费用约 ¥ 6,800 万，符合加计扣除条件，可在企业所得税前按 100% 加计扣除。",
    policy: "财政部 税务总局公告 · 研发费用税前加计扣除", estSaving: 17000000, confidence: 92, status: "可申请",
  },
  {
    id: "s2", entityId: "e2", title: "增值税期末留抵退税", category: "留抵退税",
    detail: "XXX科技期末留抵税额约 ¥ 2,400 万，符合存量+增量留抵退税条件，可申请一次性退还。",
    policy: "增值税期末留抵税额退税政策", estSaving: 24000000, confidence: 88, status: "可申请",
  },
  {
    id: "s3", entityId: "e2", title: "高新技术企业 15% 优惠税率", category: "税率优惠",
    detail: "XXX科技持有高新技术企业资质，企业所得税适用 15% 优惠税率，较法定 25% 全年预计节省约 ¥ 1,020 万。",
    policy: "高新技术企业所得税优惠", estSaving: 10200000, confidence: 96, status: "已采纳",
  },
  {
    id: "s4", entityId: "e6", title: "小型微利企业所得税优惠", category: "税率优惠",
    detail: "XXX海南符合小型微利企业标准，应纳税所得额可享受优惠税率，预计减税约 ¥ 48 万。",
    policy: "小型微利企业所得税优惠", estSaving: 480000, confidence: 90, status: "可申请",
  },
  {
    id: "s5", entityId: "e6", title: "海南自贸港鼓励类产业财政奖补", category: "财政奖补",
    detail: "XXX海南主营业务属自贸港鼓励类产业目录，可申请地方财政奖补与企业所得税 15% 优惠，预计收益约 ¥ 160 万。",
    policy: "海南自由贸易港税收优惠", estSaving: 1600000, confidence: 74, status: "待评估",
  },
];

// ---------------------------------------------------------------------
//  发票中心统计
// ---------------------------------------------------------------------
export const invoiceStats = {
  outputCount: 8421,
  outputAmount: 218400000,
  outputTax: 25090000,
  outputRedInk: 36,
  inputCount: 6233,
  inputAmount: 142600000,
  inputTax: 16380000,
  inputCertified: 6105,
  inputPending: 116,
  inputAbnormal: 12,
  digitalRatio: 97.2,
  matchRate: 98.6,
  pendingAmount: 3720000,
};

// ---------------------------------------------------------------------
//  近 6 个月趋势（单位：万元）+ 集团综合税负率
// ---------------------------------------------------------------------
export const taxTrend = [
  { month: "2025-12", 增值税: 612, 企业所得税: 0, 个人所得税: 118, 附加及其他: 96, 税负率: 8.1 },
  { month: "2026-01", 增值税: 588, 企业所得税: 0, 个人所得税: 121, 附加及其他: 92, 税负率: 7.9 },
  { month: "2026-02", 增值税: 470, 企业所得税: 0, 个人所得税: 110, 附加及其他: 80, 税负率: 7.6 },
  { month: "2026-03", 增值税: 705, 企业所得税: 0, 个人所得税: 124, 附加及其他: 112, 税负率: 8.3 },
  { month: "2026-04", 增值税: 660, 企业所得税: 940, 个人所得税: 122, 附加及其他: 104, 税负率: 9.2 },
  { month: "2026-05", 增值税: 548, 企业所得税: 125, 个人所得税: 139, 附加及其他: 96, 税负率: 8.6 },
];

// 各主体增值税税负率 vs 行业预警线
export const entityTaxBurden = [
  { name: "集团总部", rate: 8.9, warn: 8.0 },
  { name: "XXX科技", rate: 6.2, warn: 5.5 },
  { name: "XXX销售", rate: 1.3, warn: 3.5 },
  { name: "XXX智造", rate: 7.8, warn: 8.0 },
  { name: "XXX物流", rate: 5.4, warn: 5.0 },
  { name: "XXX海南", rate: 3.1, warn: 3.0 },
];

// ---------------------------------------------------------------------
//  智能体自动申报流程（模板，status 全部 pending）
// ---------------------------------------------------------------------
export const agentStepsTemplate: AgentStep[] = [
  {
    id: "connect", icon: "PlugZap", title: "连接数据源", desc: "接入 ERP、数电发票平台、电子税务局、银行流水",
    detail: [
      "✓ 用友 U9 ERP — 凭证 / 总账已联通",
      "✓ 全国数电发票服务平台 — 进项 / 销项已联通",
      "✓ 电子税务局（沪 / 深 / 苏 / 琼）— 授权令牌有效",
      "✓ 企业网银（招行 / 工行）— 银行流水已对账",
    ],
    metrics: [{ label: "数据源", value: "4 / 4 已连接" }], durationMs: 1100, status: "pending",
  },
  {
    id: "gather", icon: "DatabaseZap", title: "归集本期数据", desc: "拉取 2026年5月 全集团凭证、发票与薪酬",
    detail: [
      "凭证 14,233 条，发生额合计 ¥ 6.82 亿",
      "进项发票 6,233 份 / 销项发票 8,421 份",
      "薪酬代发 3,820 人，合计 ¥ 1.12 亿",
      "固定资产、合同台账、社保公积金已同步",
    ],
    metrics: [{ label: "凭证", value: "14,233 条" }, { label: "发票", value: "14,654 份" }], durationMs: 1400, status: "pending",
  },
  {
    id: "invoice", icon: "ScanLine", title: "发票验真与进销项匹配", desc: "逐票验真、查重，匹配业务并勾选认证抵扣",
    detail: [
      "验真通过 14,642 份，异常 12 份",
      "12 份来自异常注销纳税人的进项 → 建议转出 ¥ 120,000",
      "进销项匹配率 98.6%，待认证进项 ¥ 372 万已勾选",
      "数电发票占比 97.2%",
    ],
    metrics: [{ label: "异常发票", value: "12 份" }, { label: "匹配率", value: "98.6%" }], durationMs: 1500, status: "pending",
  },
  {
    id: "compute", icon: "Calculator", title: "分税种自动测算", desc: "按主体、按税种逐项计算应纳税额",
    detail: [
      "增值税及附加：销项 − 进项 − 留抵 → 6 家主体",
      "个人所得税：累计预扣预缴法，3,820 人",
      "印花税：购销 / 借款合同按税目计算",
      "附加税费：按增值税额计提城建 / 教育 / 地方教育",
    ],
    metrics: [{ label: "测算主体", value: "6 家" }], durationMs: 1500, status: "pending",
  },
  {
    id: "adjust", icon: "Scale", title: "纳税调整与优惠适用", desc: "识别税会差异、加计扣除与税率优惠",
    detail: [
      "业务招待费超限 → 调增应纳税所得额 ¥ 38 万",
      "研发费用 ¥ 6,800 万 → 加计扣除 100%（XXX科技）",
      "高新技术企业 15% 优惠税率已适用",
      "小型微利、自贸港优惠已适用（XXX海南）",
    ],
    metrics: [{ label: "纳税调整", value: "7 项" }], durationMs: 1400, status: "pending",
  },
  {
    id: "forms", icon: "FileSpreadsheet", title: "生成申报表", desc: "自动填列国标申报表并交叉勾稽",
    detail: [
      "增值税及附加税费申报表（主表 + 附列资料）",
      "个人所得税扣缴申报表",
      "印花税纳税申报表",
      "表内 / 表间勾稽校验全部通过",
    ],
    metrics: [{ label: "生成税表", value: "23 张" }, { label: "勾稽校验", value: "通过" }], durationMs: 1300, status: "pending",
  },
  {
    id: "risk", icon: "ShieldAlert", title: "金税四期风险体检", desc: "比对预警指标、扫描异常",
    detail: [
      "XXX销售 增值税税负率 1.3% < 行业预警线 → 高风险",
      "12 份异常进项发票虚开风险 → 高风险",
      "业务招待费、关联交易等 3 项 → 中风险",
      "集团总体合规度 86 分",
    ],
    metrics: [{ label: "风险项", value: "5 项（2 高 3 中）" }], durationMs: 1300, status: "pending",
  },
  {
    id: "saving", icon: "Sparkles", title: "节税与退税机会扫描", desc: "匹配最新政策，量化潜在收益",
    detail: [
      "研发费加计扣除 → 预计减税 ¥ 1,700 万",
      "增值税期末留抵 ¥ 2,400 万 → 符合留抵退税",
      "高新优惠税率 → 较 25% 节省 ¥ 1,020 万",
      "小微 + 自贸港奖补 → ¥ 208 万",
    ],
    metrics: [{ label: "可优化", value: "¥ 5,300 万" }], durationMs: 1300, status: "pending",
  },
  {
    id: "review", icon: "BadgeCheck", title: "生成审批单，等待人工确认", desc: "进入人在环路审批，全程留痕",
    detail: [
      "23 张税表已生成，待税务经理审批",
      "2 项高风险已置顶提示，建议先行处置",
      "一键生成审批单与申报数据包",
      "审批通过后可一键申报至电子税务局",
    ],
    metrics: [{ label: "待审批", value: "23 张" }], durationMs: 1100, status: "pending",
  },
];

// ---------------------------------------------------------------------
//  派生 KPI（从上面的数据实时计算，保证内部一致）
// ---------------------------------------------------------------------
export function currentFilings(): Filing[] {
  return filings.filter((f) => f.period === PERIOD);
}
export function kpis() {
  const cur = currentFilings();
  const payableTotal = cur.reduce((s, f) => s + f.payable, 0);
  const total = cur.length;
  const pending = cur.filter((f) => f.status !== "已申报" && f.status !== "已缴款").length;
  const filed = total - pending;
  const savingTotal = savings.reduce((s, v) => s + v.estSaving, 0);
  const riskHigh = risks.filter((r) => r.level === "high").length;
  const byKind: Record<string, number> = {};
  for (const f of cur) byKind[f.taxKind] = (byKind[f.taxKind] || 0) + f.payable;
  return {
    payableTotal, total, pending, filed,
    savingTotal, riskCount: risks.length, riskHigh,
    overallBurden: taxTrend[taxTrend.length - 1].税负率,
    automation: 96,
    byKind,
  };
}
