import {
  mulberry32,
  pick,
  pickWeighted,
  randInt,
  randFloat,
  randNormal,
  type RNG,
} from "../rng";
import {
  CITY_NAME,
  DISTRICTS,
  INDUSTRIES,
  ENTERPRISE_SCALES,
  MODELS,
  COMPUTE_CENTER_TYPES,
  CHIPS,
  VOUCHER_TYPES,
  POLICY_TAGS,
  APP_SCENARIOS,
  ENT_PREFIXES,
  ENT_CORES,
  ENT_SUFFIXES,
} from "../constants";
import type {
  Enterprise,
  Voucher,
  VoucherApplication,
  Model,
  ComputeCenter,
  ScheduleLog,
  Policy,
  MarketApp,
  Match,
  AlertItem,
  CityKPI,
  TimeSeriesPoint,
  IndustryUsage,
  ModelUsage,
  DistrictUsage,
} from "../types";

// ===== 配置 =====
const SEED = 20260526;
const NUM_ENTERPRISES = 10500; // 万级企业
const NUM_COMPUTE_CENTERS = 26;
const NUM_VOUCHER_APPLICATIONS_PENDING = 86;
const NUM_VOUCHER_APPLICATIONS_HISTORY = 320;
const NUM_POLICIES = 28;
const NUM_APPS = 86;
const NUM_MATCHES = 42;
const NUM_ALERTS = 36;
const DAYS = 365;

// ===== 工具 =====
const todayISO = () => new Date().toISOString().slice(0, 10);

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function dateNDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function pad(n: number, w = 4) {
  return String(n).padStart(w, "0");
}

function genUSCC(rng: RNG): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRTUWXY";
  let s = "91" + String(randInt(rng, 110000, 659999));
  for (let i = 0; i < 10; i++) s += chars[Math.floor(rng() * chars.length)];
  s += String(randInt(rng, 0, 9));
  return s.slice(0, 18);
}

function genCompanyName(rng: RNG, industryCode: string): string {
  const prefix = pick(rng, ENT_PREFIXES);
  const cores = ENT_CORES[industryCode as keyof typeof ENT_CORES] || ENT_CORES.MFG;
  const core = pick(rng, cores);
  const tail = pickWeighted(rng, [
    { item: "科技", weight: 6 },
    { item: "数智", weight: 3 },
    { item: "信息", weight: 2 },
    { item: "网络", weight: 2 },
    { item: "智能", weight: 4 },
    { item: "云", weight: 1 },
    { item: "", weight: 4 },
  ]);
  const suffix = pickWeighted(rng, [
    { item: "有限公司", weight: 7 },
    { item: "股份有限公司", weight: 1 },
    { item: "科技有限公司", weight: 5 },
    { item: "集团有限公司", weight: 1 },
  ]);
  return prefix + core + tail + suffix;
}

function genPhone(rng: RNG): string {
  const prefixes = ["138", "139", "150", "151", "157", "186", "188", "139", "189", "176", "133"];
  let s = pick(rng, prefixes);
  for (let i = 0; i < 8; i++) s += randInt(rng, 0, 9);
  return s;
}

function genContact(rng: RNG): string {
  const surnames = ["张", "王", "李", "刘", "陈", "杨", "黄", "赵", "周", "吴", "徐", "孙", "胡", "朱", "高", "林"];
  const names = ["伟", "芳", "敏", "静", "丽", "强", "磊", "军", "洋", "勇", "艳", "杰", "娟", "涛", "明", "超", "秀", "霞", "平"];
  return pick(rng, surnames) + pick(rng, names);
}

// ===== 主生成器 =====
export function generateAll() {
  const rng = mulberry32(SEED);

  // 1. 企业
  const enterprises: Enterprise[] = [];
  for (let i = 0; i < NUM_ENTERPRISES; i++) {
    const industry = pickWeighted(
      rng,
      INDUSTRIES.map((x, idx) => ({ item: x, weight: [1.6, 1.3, 1.0, 0.9, 1.1, 0.7, 0.4, 0.7][idx] || 1 })),
    );
    const district = pickWeighted(
      rng,
      DISTRICTS.map((d) => ({ item: d, weight: d.weight })),
    );
    const scale = pickWeighted(
      rng,
      ENTERPRISE_SCALES.map((s) => ({ item: s, weight: s.weight })),
    );
    const employees = randInt(rng, scale.employees[0], scale.employees[1]);
    const registeredYears = Math.floor(Math.abs(randNormal(rng, 6, 4))) + 1;
    const regDate = new Date();
    regDate.setFullYear(regDate.getFullYear() - registeredYears);
    regDate.setMonth(randInt(rng, 0, 11));
    regDate.setDate(randInt(rng, 1, 28));
    const isHighTech = rng() < 0.18;
    const isSpecialized = rng() < 0.09;
    const certified = rng() < 0.72;
    const certifiedAt = certified ? dateNDaysAgo(randInt(rng, 10, 380)) : undefined;

    const baseUsage = Math.pow(10, randNormal(rng, 6.4 - (scale.code === "MICRO" ? 1.5 : scale.code === "SMALL" ? 0.8 : scale.code === "MED" ? 0 : -0.4), 0.7));
    const yearlyTokens = Math.max(50_000, Math.floor(baseUsage * randFloat(rng, 0.5, 1.8)));
    const monthlyTokens = Math.floor(yearlyTokens / 12 * randFloat(rng, 0.7, 1.3));
    const yearlyCost = Math.floor(yearlyTokens / 1_000_000 * randFloat(rng, 6, 28));
    const totalGranted = Math.floor(yearlyCost * randFloat(rng, 0.25, 1.4));
    const totalConsumed = Math.floor(totalGranted * randFloat(rng, 0.2, 0.95));
    const voucherBalance = Math.max(0, totalGranted - totalConsumed);
    const rating = Math.min(5, Math.max(1, Math.round(randNormal(rng, 4.0, 0.7) * 10) / 10));

    enterprises.push({
      id: "ENT" + pad(i + 1, 6),
      uscc: genUSCC(rng),
      name: genCompanyName(rng, industry.code),
      industryCode: industry.code,
      districtCode: district.code,
      scale: scale.code,
      employees,
      registeredAt: regDate.toISOString().slice(0, 10),
      isHighTech,
      isSpecialized,
      certified,
      certifiedAt,
      contact: genContact(rng),
      phone: genPhone(rng),
      voucherBalance,
      totalGranted,
      totalConsumed,
      monthlyTokens,
      yearlyTokens,
      yearlyCost,
      rating,
    });
  }

  // 2. 模型
  const models: Model[] = MODELS.map((m, idx) => {
    const popularity = [1.5, 2.0, 1.4, 1.6, 1.1, 1.3, 0.9, 0.95, 0.85, 0.7, 0.6, 0.5, 0.6, 0.5][idx] || 0.7;
    const totalCalls = Math.floor(popularity * randFloat(rng, 2_400_000, 8_800_000));
    const totalTokens = totalCalls * randInt(rng, 800, 4500);
    const totalRevenue = Math.floor(totalTokens / 1_000_000 * (m.priceIn * 0.6 + m.priceOut * 0.4));
    return {
      ...m,
      status: idx < 12 ? "LIVE" : "BETA",
      rps: Math.round(popularity * randFloat(rng, 18, 120)),
      latency: Math.round(randFloat(rng, 320, 1400)),
      availability: 0.96 + rng() * 0.039,
      rating: Math.round(randFloat(rng, 4.2, 4.95) * 100) / 100,
      totalCalls,
      totalTokens,
      totalRevenue,
      monthCalls: Math.floor(totalCalls * randFloat(rng, 0.08, 0.14)),
      monthTokens: Math.floor(totalTokens * randFloat(rng, 0.08, 0.14)),
      enrolledAt: dateNDaysAgo(randInt(rng, 30, 720)),
    };
  });

  // 3. 算力中心
  const computeCenters: ComputeCenter[] = [];
  for (let i = 0; i < NUM_COMPUTE_CENTERS; i++) {
    const type = pickWeighted(rng, [
      { item: COMPUTE_CENTER_TYPES[0], weight: 4 }, // 智算
      { item: COMPUTE_CENTER_TYPES[1], weight: 1 }, // 超算
      { item: COMPUTE_CENTER_TYPES[2], weight: 2 }, // 通算
    ]);
    const district = pickWeighted(rng, DISTRICTS.map((d) => ({ item: d, weight: d.weight })));
    const chipMix: { code: string; count: number }[] = [];
    let totalCards = 0;
    let totalTflops = 0;
    if (type.code === "INTEL") {
      // 智算中心：GPU + NPU 混合
      const major = pickWeighted(rng, [
        { item: "h100", weight: 1 },
        { item: "h800", weight: 2 },
        { item: "h20", weight: 3 },
        { item: "910b", weight: 4 },
        { item: "910c", weight: 2 },
      ]);
      const majorChip = CHIPS.find((c) => c.code === major)!;
      const majorCount = randInt(rng, 256, 4096);
      chipMix.push({ code: major, count: majorCount });
      totalCards += majorCount;
      totalTflops += majorCount * majorChip.peakTflops;
      // 次要
      if (rng() > 0.3) {
        const second = pick(rng, ["a100", "mlu590", "dcu-z100"]);
        const secondChip = CHIPS.find((c) => c.code === second)!;
        const cnt = randInt(rng, 128, 1024);
        chipMix.push({ code: second, count: cnt });
        totalCards += cnt;
        totalTflops += cnt * secondChip.peakTflops;
      }
    } else if (type.code === "SUPER") {
      const major = pick(rng, ["h100", "h800", "910c"]);
      const majorChip = CHIPS.find((c) => c.code === major)!;
      const cnt = randInt(rng, 1024, 8192);
      chipMix.push({ code: major, count: cnt });
      totalCards += cnt;
      totalTflops += cnt * majorChip.peakTflops;
    } else {
      // 通算
      const major = pick(rng, ["dcu-z100", "910b", "a100"]);
      const majorChip = CHIPS.find((c) => c.code === major)!;
      const cnt = randInt(rng, 128, 1024);
      chipMix.push({ code: major, count: cnt });
      totalCards += cnt;
      totalTflops += cnt * majorChip.peakTflops;
    }

    const utilization = type.code === "INTEL" ? randFloat(rng, 0.62, 0.92) : type.code === "SUPER" ? randFloat(rng, 0.55, 0.85) : randFloat(rng, 0.45, 0.78);
    const power = Math.floor(totalCards * randFloat(rng, 0.5, 0.8));
    const pue = Math.round((1.15 + rng() * 0.35) * 100) / 100;
    const greenRatio = Math.round((0.35 + rng() * 0.55) * 100) / 100;
    const status = rng() < 0.88 ? "ONLINE" : rng() < 0.5 ? "DEGRADED" : "MAINTENANCE";

    const vendors = ["华为云", "阿里云", "腾讯云", "字节火山", "中国电信", "中国移动", "中科曙光", "浪潮", "百度智能云", "商汤大装置"];
    const namePrefix = pick(rng, ["滨海", "东海", "南海", "北辰", "云栖", "星河", "九州", "瀚海", "鲲鹏", "天工"]);
    const nameMid = type.code === "INTEL" ? "智算中心" : type.code === "SUPER" ? "超算中心" : "数据中心";

    computeCenters.push({
      id: "DC" + pad(i + 1, 3),
      name: namePrefix + (i % 3 === 0 ? "" : "·") + (i % 3 === 0 ? "" : pick(rng, ["一号", "二号", "三号", "新区"])) + nameMid,
      type: type.code,
      vendor: pick(rng, vendors),
      districtCode: district.code,
      address: `${CITY_NAME}${district.name}${pick(rng, ["科技园路", "高新大道", "环湾路", "创新大道", "云谷路"])}${randInt(rng, 1, 999)}号`,
      lat: district.lat + randFloat(rng, -0.05, 0.05),
      lng: district.lng + randFloat(rng, -0.05, 0.05),
      chips: chipMix,
      totalCards,
      totalTflops: Math.floor(totalTflops),
      utilization,
      power,
      pue,
      greenRatio,
      priceUnit: Math.round(randFloat(rng, 6.8, 28) * 10) / 10,
      status,
      online: status === "ONLINE",
      enrolledAt: dateNDaysAgo(randInt(rng, 60, 1100)),
      contact: pick(rng, vendors) + " " + genContact(rng) + " · " + genPhone(rng),
    });
  }

  // 4. 调度日志
  const scheduleLogs: ScheduleLog[] = [];
  const scenarios = ["模型预训练", "模型微调", "在线推理", "批量推理", "Embedding 计算", "RAG 检索", "视觉处理", "代码生成"];
  for (let i = 0; i < 280; i++) {
    const ent = pick(rng, enterprises);
    const center = pick(rng, computeCenters);
    const requested = randInt(rng, 4, 256);
    const allocated = rng() < 0.92 ? requested : Math.floor(requested * randFloat(rng, 0.5, 0.85));
    const tsDate = new Date();
    tsDate.setMinutes(tsDate.getMinutes() - randInt(rng, 0, 60 * 24 * 3));
    const status = pickWeighted(rng, [
      { item: "DONE", weight: 5 },
      { item: "RUNNING", weight: 2 },
      { item: "QUEUED", weight: 1 },
      { item: "FAILED", weight: 0.4 },
      { item: "PREEMPTED", weight: 0.2 },
    ]) as ScheduleLog["status"];
    scheduleLogs.push({
      id: "SCH" + pad(i + 1, 5),
      ts: tsDate.toISOString(),
      taskCode: "T-" + tsDate.getTime().toString().slice(-8),
      enterpriseId: ent.id,
      enterpriseName: ent.name,
      modelCode: rng() > 0.4 ? pick(rng, models).code : undefined,
      scenario: pick(rng, scenarios),
      cardsRequested: requested,
      cardsAllocated: allocated,
      chipPref: pick(rng, center.chips).code,
      fromCenter: center.id,
      routed: allocated === requested,
      reason: allocated === requested ? "同区域优先匹配" : pick(rng, ["跨中心调度均衡", "本地资源紧张", "国产芯片优先策略", "成本最优匹配", "性能最优匹配"]),
      durationMin: randInt(rng, 5, 720),
      status,
    });
  }
  scheduleLogs.sort((a, b) => b.ts.localeCompare(a.ts));

  // 5. 政策
  const policyTitles = [
    "关于支持中小企业用上大模型的若干措施",
    "滨海市人工智能产业发展三年行动计划",
    "智能制造大模型应用专项支持办法",
    "金融行业大模型审慎应用指引",
    "教育领域 AI 助教试点工作方案",
    "智算中心建设与算力券协同使用细则",
    "国产化大模型与芯片采购补贴办法",
    "AI 创新应用首试首用奖励办法",
    "专精特新企业 Token 券倾斜方案",
    "数据要素与语料券联动激励政策",
    "医疗 AI 应用安全合规备案要求",
    "AI 模型备案与上架管理办法",
    "全市 12345 政务热线 AI 升级实施方案",
    "AI 产业园区入驻奖励政策（修订版）",
    "重点产业链 AI 转型补贴清单",
    "高校与企业 AI 联合研发券",
    "数字员工试点企业认定办法",
    "AI 算力跨城调度协同协议",
    "AI 安全审计与红队测试要求",
    "AI 应用市场入驻服务规范",
    "RAG 与知识库共建支持政策",
    "县域产业 AI 普惠计划",
    "AI 创业团队孵化资助办法",
    "大模型评测中心运行管理办法",
    "智能客服替代率试点考核办法",
    "AI 算力价格指数发布机制",
    "AI 应用反诈骗联防联控方案",
    "AI 与碳达峰双控融合行动计划",
  ];
  const policies: Policy[] = [];
  for (let i = 0; i < NUM_POLICIES; i++) {
    const tags = Array.from(new Set([pick(rng, POLICY_TAGS), pick(rng, POLICY_TAGS), pick(rng, POLICY_TAGS)])).slice(0, randInt(rng, 1, 3));
    const industryTargets = Array.from({ length: randInt(rng, 1, 4) }, () => pick(rng, INDUSTRIES).code);
    const publishedDays = randInt(rng, 5, 400);
    policies.push({
      id: "POL" + pad(i + 1, 3),
      code: `滨发〔${2025 - Math.floor(publishedDays / 365)}〕${randInt(rng, 1, 99)}号`,
      title: policyTitles[i % policyTitles.length],
      issuer: pick(rng, [
        `${CITY_NAME}人民政府办公厅`,
        `${CITY_NAME}经济和信息化委员会`,
        `${CITY_NAME}科学技术委员会`,
        `${CITY_NAME}数据局`,
        `${CITY_NAME}发展和改革委员会`,
      ]),
      level: pickWeighted(rng, [
        { item: "市", weight: 6 },
        { item: "区", weight: 3 },
        { item: "国家", weight: 0.5 },
      ]) as Policy["level"],
      category: pick(rng, ["资金支持", "试点示范", "标准规范", "园区建设", "人才扶持", "技术攻关"]),
      tags,
      summary: "通过 Token 券、算力券、模型券等政策工具组合，精准滴灌符合产业方向的优质企业，鼓励大模型在重点行业的规模化、合规化、可持续应用。",
      content: "（政策正文详见附件 PDF）",
      publishedAt: dateNDaysAgo(publishedDays),
      expiresAt: publishedDays < 200 ? dateNDaysFromNow(randInt(rng, 60, 730)) : undefined,
      status: publishedDays > 365 ? "EXPIRED" : "ACTIVE",
      views: randInt(rng, 320, 28000),
      industryTargets,
      budget: Math.floor(randFloat(rng, 50, 5000)) * 10_000,
      voucherBatch: rng() > 0.5 ? "BATCH-" + pad(randInt(rng, 1, 99), 3) : undefined,
    });
  }
  policies.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // 6. 券（每家企业 0-6 张）
  const vouchers: Voucher[] = [];
  let vid = 1;
  for (const ent of enterprises) {
    if (!ent.certified) continue;
    const n = ent.scale === "LARGE" ? randInt(rng, 3, 8) : ent.scale === "MED" ? randInt(rng, 2, 5) : ent.scale === "SMALL" ? randInt(rng, 1, 3) : randInt(rng, 0, 2);
    for (let j = 0; j < n; j++) {
      const vt = pickWeighted(rng, [
        { item: VOUCHER_TYPES[0], weight: 5 }, // Token
        { item: VOUCHER_TYPES[1], weight: 2 }, // 算力
        { item: VOUCHER_TYPES[2], weight: 2 }, // 模型
        { item: VOUCHER_TYPES[3], weight: 0.7 }, // 数据
        { item: VOUCHER_TYPES[4], weight: 0.5 }, // 语料
      ]);
      const amount = vt.code === "TOKEN" ? randInt(rng, 1, 100) * 10000 : vt.code === "COMPUTE" ? randInt(rng, 10, 800) : randInt(rng, 1000, 50000);
      const used = Math.floor(amount * randFloat(rng, 0.1, 0.95));
      const rule = pickWeighted(rng, [
        { item: "PUBLIC", weight: 3 },
        { item: "APPLY", weight: 5 },
        { item: "INDUSTRY", weight: 3 },
      ]) as Voucher["rule"];
      const issued = randInt(rng, 5, 320);
      const expireDays = randInt(rng, 60, 540) - issued;
      const status: Voucher["status"] = expireDays < 0 ? "EXPIRED" : amount - used < 1 ? "EXHAUSTED" : "ACTIVE";
      vouchers.push({
        id: "VCH" + pad(vid++, 7),
        type: vt.code,
        batchCode: "BATCH-" + pad(randInt(rng, 1, 99), 3),
        amount,
        amountUsed: used,
        amountRemaining: amount - used,
        unit: vt.unit,
        rule,
        status,
        enterpriseId: ent.id,
        enterpriseName: ent.name,
        industryCode: rule === "INDUSTRY" ? ent.industryCode : undefined,
        issuedAt: dateNDaysAgo(issued),
        expireAt: expireDays > 0 ? dateNDaysFromNow(expireDays) : dateNDaysAgo(-expireDays),
        policyId: rng() > 0.3 ? pick(rng, policies).id : undefined,
      });
    }
  }

  // 7. 券申请（pending + 历史）
  const voucherApps: VoucherApplication[] = [];
  let appId = 1;
  function genApp(status: VoucherApplication["status"]): VoucherApplication {
    const ent = pick(rng, enterprises);
    const vt = pickWeighted(rng, [
      { item: VOUCHER_TYPES[0], weight: 5 },
      { item: VOUCHER_TYPES[1], weight: 2 },
      { item: VOUCHER_TYPES[2], weight: 2 },
      { item: VOUCHER_TYPES[3], weight: 0.7 },
      { item: VOUCHER_TYPES[4], weight: 0.4 },
    ]);
    const requested = vt.code === "TOKEN" ? randInt(rng, 5, 200) * 10000 : vt.code === "COMPUTE" ? randInt(rng, 50, 1500) : randInt(rng, 2000, 80000);
    const submittedDaysAgo = status === "PENDING" ? randInt(rng, 0, 14) : randInt(rng, 5, 300);
    const reviewedDaysAgo = status === "PENDING" ? undefined : Math.max(0, submittedDaysAgo - randInt(rng, 1, 12));
    const scenario = pick(rng, ["智能客服升级", "AI 知识库建设", "工业 AI 质检", "教育 AI 助教", "医疗 AI 影像分析", "金融文档智能", "营销文案生成", "代码智能补全", "智能调度优化"]);
    const reasonTpl = [
      `${ent.name}计划在${scenario}场景中规模化引入大模型能力，预计可带动${randInt(rng, 5, 50)}人效率提升，本次申请用于支撑前期试点与小规模上线。`,
      `公司在${INDUSTRIES.find((i) => i.code === ent.industryCode)!.name}领域多年深耕，本次拟基于大模型升级核心业务流，预计可降低 ${randInt(rng, 8, 35)}% 的人工成本。`,
      `结合本市${pick(rng, policies).title}政策导向，申请相应支持以推动 AI 创新应用落地。`,
    ];
    return {
      id: "APP" + pad(appId++, 6),
      applicationCode: `${CITY_NAME[0]}AI-${dateNDaysAgo(submittedDaysAgo).replace(/-/g, "")}-${pad(appId, 4)}`,
      enterpriseId: ent.id,
      enterpriseName: ent.name,
      industryCode: ent.industryCode,
      districtCode: ent.districtCode,
      scale: ent.scale,
      voucherType: vt.code,
      requestedAmount: requested,
      unit: vt.unit,
      scenario,
      reason: pick(rng, reasonTpl),
      attachments: ["营业执照.pdf", "项目方案.pdf", ...(rng() > 0.5 ? ["专精特新证书.pdf"] : [])],
      status,
      submittedAt: dateNDaysAgo(submittedDaysAgo),
      reviewedAt: reviewedDaysAgo !== undefined ? dateNDaysAgo(reviewedDaysAgo) : undefined,
      reviewer: reviewedDaysAgo !== undefined ? pick(rng, ["王评审", "李审核", "陈主任", "刘科长", "周专家"]) : undefined,
      comments: status === "REJECTED" ? "申请材料中场景描述不够具体，请补充预期 ROI 指标。" : status === "REVISION" ? "请补充企业近一年纳税证明。" : undefined,
      approvedAmount: status === "APPROVED" ? Math.floor(requested * randFloat(rng, 0.5, 1.0)) : undefined,
      policyId: rng() > 0.3 ? pick(rng, policies).id : undefined,
    };
  }
  for (let i = 0; i < NUM_VOUCHER_APPLICATIONS_PENDING; i++) voucherApps.push(genApp("PENDING"));
  for (let i = 0; i < NUM_VOUCHER_APPLICATIONS_HISTORY; i++) {
    voucherApps.push(genApp(pickWeighted(rng, [
      { item: "APPROVED", weight: 6 },
      { item: "REJECTED", weight: 1.2 },
      { item: "REVISION", weight: 1 },
    ]) as VoucherApplication["status"]));
  }
  voucherApps.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  // 8. 应用市场
  const appNames = [
    "智链客服", "知见问答", "鲲鹏文档", "鹰眼质检", "妙笔生花", "代码灵感",
    "医脉影像", "学海助教", "丰收眼", "调度大师", "风险哨兵", "千帆营销",
    "工厂大脑", "供应链智控", "金牌律师", "智能调研", "AI 教练", "数字员工",
    "智会纪要", "AI 招聘官", "Code Copilot+", "AI 财税", "Brand Studio",
    "InsightBI", "PromptStudio", "AgentForge",
  ];
  const apps: MarketApp[] = [];
  for (let i = 0; i < NUM_APPS; i++) {
    const sc = pick(rng, APP_SCENARIOS);
    const industries = sc.industries;
    const vendor = pick(rng, ["智云科技", "九州 AI", "蓝海智能", "百川数智", "中科云脑", "海创智链", "鼎信 AI", "锐新数智", "未来科技", "卓越智能"]);
    const priceType = pickWeighted(rng, [
      { item: "FREE", weight: 1.5 },
      { item: "TRIAL", weight: 2 },
      { item: "PAID", weight: 3 },
      { item: "VOUCHER", weight: 3 },
    ]) as MarketApp["priceType"];
    apps.push({
      id: "APP" + pad(i + 1, 4),
      name: appNames[i % appNames.length] + (i >= appNames.length ? " Pro" : ""),
      vendor,
      category: sc.name,
      industries,
      description: `面向${industries.map((c) => INDUSTRIES.find((x) => x.code === c)!.name).join("、")}行业的${sc.name}解决方案，基于多模型混合编排，开箱即用。`,
      tags: [sc.name, pick(rng, ["开箱即用", "支持私有化", "已通过等保", "支持微调"]), pick(rng, ["RAG", "Agent", "多模态", "工作流"])],
      rating: Math.round(randFloat(rng, 4.2, 4.95) * 10) / 10,
      reviews: randInt(rng, 12, 2400),
      installs: randInt(rng, 80, 18000),
      priceType,
      price: priceType === "PAID" || priceType === "TRIAL" ? randInt(rng, 99, 9999) : undefined,
      cover: ["#3b82f6", "#22d3ee", "#a855f7", "#10b981", "#f59e0b", "#ec4899"][i % 6],
      publishedAt: dateNDaysAgo(randInt(rng, 10, 540)),
      status: pickWeighted(rng, [{ item: "LIVE", weight: 8 }, { item: "PENDING", weight: 1 }, { item: "DRAFT", weight: 1 }]) as MarketApp["status"],
    });
  }

  // 9. 需求撮合
  const matches: Match[] = [];
  for (let i = 0; i < NUM_MATCHES; i++) {
    const ent = pick(rng, enterprises);
    matches.push({
      id: "MAT" + pad(i + 1, 4),
      enterpriseId: ent.id,
      enterpriseName: ent.name,
      industryCode: ent.industryCode,
      title: pick(rng, [
        "需要一套" + pick(rng, APP_SCENARIOS).name + "解决方案",
        "寻求大模型微调服务",
        "招募" + pick(rng, ["RAG", "Agent", "多模态"]) + "技术合作伙伴",
        "需要 AI 数字人定制开发",
        "寻求行业大模型联合训练",
      ]),
      description: `预算${randInt(rng, 5, 200)}万，希望 ${randInt(rng, 2, 6)} 周内启动，可使用 Token 券与算力券。`,
      budget: randInt(rng, 5, 200) * 10000,
      status: pickWeighted(rng, [{ item: "OPEN", weight: 5 }, { item: "MATCHED", weight: 3 }, { item: "CLOSED", weight: 1 }]) as Match["status"],
      postedAt: dateNDaysAgo(randInt(rng, 0, 90)),
      offers: randInt(rng, 0, 18),
    });
  }
  matches.sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  // 10. 告警
  const alertTpls = [
    { level: "WARN", cat: "USAGE", t: "企业月度 Token 用量异常", d: (ent: Enterprise) => `${ent.name} 本月 Token 用量较上月增长 ${randInt(rng, 280, 800)}%，请关注。` },
    { level: "CRITICAL", cat: "COMPUTE", t: "算力中心负载过高", d: (ent: Enterprise) => `智算中心利用率持续 30 分钟超过 95%，请考虑跨中心调度。` },
    { level: "WARN", cat: "VOUCHER", t: "券即将到期", d: (ent: Enterprise) => `${ent.name} 持有的 Token 券 (余额 ${formatInt(randInt(rng, 1, 50) * 10000)}) 将于 7 天后到期。` },
    { level: "CRITICAL", cat: "SECURITY", t: "异常调用模式", d: (ent: Enterprise) => `检测到 ${ent.name} 调用 IP 在短时间内来自 ${randInt(rng, 3, 12)} 个国家，建议立即介入。` },
    { level: "INFO", cat: "POLICY", t: "新政策待发布", d: (_: Enterprise) => `配套政策已审核通过，预计 ${randInt(rng, 1, 5)} 个工作日后正式发布。` },
    { level: "WARN", cat: "USAGE", t: "重点企业活跃度下降", d: (ent: Enterprise) => `${ent.name} 连续 ${randInt(rng, 10, 30)} 天 Token 调用量低于阈值。` },
    { level: "CRITICAL", cat: "COMPUTE", t: "国产芯片集群异常", d: (_: Enterprise) => `昇腾 910B 集群出现 ${randInt(rng, 1, 6)} 节点掉线，自动迁移已触发。` },
  ];
  function formatInt(n: number) {
    return n.toLocaleString("zh-CN");
  }
  const alerts: AlertItem[] = [];
  for (let i = 0; i < NUM_ALERTS; i++) {
    const tpl = pick(rng, alertTpls);
    const ent = pick(rng, enterprises);
    const ts = new Date();
    ts.setMinutes(ts.getMinutes() - randInt(rng, 1, 60 * 24 * 7));
    alerts.push({
      id: "ALT" + pad(i + 1, 4),
      ts: ts.toISOString(),
      level: tpl.level as AlertItem["level"],
      category: tpl.cat as AlertItem["category"],
      title: tpl.t,
      detail: tpl.d(ent),
      related: ent.name,
      acked: rng() > 0.65,
    });
  }
  alerts.sort((a, b) => b.ts.localeCompare(a.ts));

  // 11. 时序聚合 - 城市级日度（365 天）
  const cityDaily: TimeSeriesPoint[] = [];
  const industryDaily: Record<string, number[]> = {};
  const districtDaily: Record<string, number[]> = {};
  const modelDaily: Record<string, number[]> = {};

  INDUSTRIES.forEach((i) => (industryDaily[i.code] = []));
  DISTRICTS.forEach((d) => (districtDaily[d.code] = []));
  models.forEach((m) => (modelDaily[m.code] = []));

  // 每个企业的"基线 Token/天"
  const dailyBaseline = enterprises.map((e) => e.yearlyTokens / 365);

  for (let day = DAYS - 1; day >= 0; day--) {
    const date = dateNDaysAgo(day);
    const dayOfWeek = new Date(date).getDay();
    const dayProgress = (DAYS - 1 - day) / DAYS;
    // 趋势：年初到年末整体增长 1.4x
    const trend = 1 + dayProgress * 1.4;
    // 周末折减
    const weekly = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    // 月初/月末有小波峰（结算）
    const dayInMonth = new Date(date).getDate();
    const monthly = dayInMonth <= 5 || dayInMonth >= 25 ? 1.15 : 1;
    // 节假日随机扰动
    const noise = 0.85 + (Math.sin(day * 1.37) + Math.cos(day * 2.13)) * 0.05 + rng() * 0.18;
    const factor = trend * weekly * monthly * noise;

    let dayTokens = 0;
    let dayCalls = 0;
    let dayCost = 0;
    let active = 0;
    const indTokens: Record<string, number> = {};
    const disTokens: Record<string, number> = {};
    const mdlTokens: Record<string, number> = {};
    INDUSTRIES.forEach((i) => (indTokens[i.code] = 0));
    DISTRICTS.forEach((d) => (disTokens[d.code] = 0));
    models.forEach((m) => (mdlTokens[m.code] = 0));

    for (let i = 0; i < enterprises.length; i++) {
      const ent = enterprises[i];
      // 不是每个企业每天都活跃
      const activeProb = ent.scale === "LARGE" ? 0.95 : ent.scale === "MED" ? 0.7 : ent.scale === "SMALL" ? 0.4 : 0.2;
      if (rng() > activeProb) continue;
      active++;
      const t = dailyBaseline[i] * factor * (0.5 + rng() * 1.4);
      dayTokens += t;
      indTokens[ent.industryCode] += t;
      disTokens[ent.districtCode] += t;
      // 分配到模型
      const m = pickWeighted(
        rng,
        models.map((mm, idx) => ({ item: mm.code, weight: Math.max(0.2, [4, 5, 2.5, 3, 2, 2.5, 1.5, 1.6, 1.2, 0.8, 0.6, 0.5, 0.6, 0.4][idx] || 0.5) })),
      );
      mdlTokens[m] += t;
    }

    dayCalls = Math.floor(dayTokens / 2000);
    dayCost = Math.floor(dayTokens / 1_000_000 * 12);

    cityDaily.push({
      date,
      tokens: Math.floor(dayTokens),
      calls: dayCalls,
      cost: dayCost,
      active,
    });
    INDUSTRIES.forEach((i) => industryDaily[i.code].push(Math.floor(indTokens[i.code])));
    DISTRICTS.forEach((d) => districtDaily[d.code].push(Math.floor(disTokens[d.code])));
    models.forEach((m) => modelDaily[m.code].push(Math.floor(mdlTokens[m.code])));
  }

  // 12. 今日 24 小时
  const hourly: { hour: number; tokens: number; calls: number; rps: number }[] = [];
  const todayTotal = cityDaily[cityDaily.length - 1]?.tokens || 1e8;
  for (let h = 0; h < 24; h++) {
    const peak = 14;
    const dist = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
    const f = 0.35 + 0.7 * Math.cos((dist / 12) * Math.PI) ** 2 + rng() * 0.06;
    const t = Math.floor((todayTotal / 24) * f * 1.8);
    hourly.push({
      hour: h,
      tokens: t,
      calls: Math.floor(t / 2000),
      rps: Math.floor((t / 2000 / 3600) * (1 + rng() * 0.6)),
    });
  }

  // 13. KPI 汇总
  const totalGranted = vouchers.reduce((s, v) => s + v.amount, 0);
  const totalConsumed = vouchers.reduce((s, v) => s + v.amountUsed, 0);
  const totalCards = computeCenters.reduce((s, c) => s + c.totalCards, 0);
  const avgUtil = computeCenters.reduce((s, c) => s + c.utilization * c.totalCards, 0) / Math.max(1, totalCards);
  const yesterdayTokens = cityDaily[cityDaily.length - 1].tokens;
  const yesterdayCost = cityDaily[cityDaily.length - 1].cost;
  const yesterdayCalls = cityDaily[cityDaily.length - 1].calls;
  const totalCalls = cityDaily.reduce((s, p) => s + p.calls, 0);
  const ytdSubsidy = vouchers.filter((v) => new Date(v.issuedAt).getFullYear() === new Date().getFullYear()).reduce((s, v) => s + v.amount, 0);
  const certified = enterprises.filter((e) => e.certified).length;
  const monthActive = enterprises.filter((e) => e.monthlyTokens > 100_000).length;

  const kpi: CityKPI = {
    totalEnterprises: enterprises.length,
    certifiedEnterprises: certified,
    monthlyActiveEnterprises: monthActive,
    totalTokenIssued: totalGranted,
    totalTokenConsumed: totalConsumed,
    yesterdayTokens,
    yesterdayCost,
    totalCalls,
    yesterdayCalls,
    totalComputeCards: totalCards,
    computeUtilization: avgUtil,
    totalModels: models.length,
    totalSubsidy: vouchers.reduce((s, v) => s + v.amount, 0),
    ytdSubsidy,
    industryGrowth: 0.382,
    totalApps: apps.length,
    matchedDemands: matches.filter((m) => m.status === "MATCHED").length,
  };

  // 14. 行业用量聚合
  const industryUsage: IndustryUsage[] = INDUSTRIES.map((ind) => {
    const ents = enterprises.filter((e) => e.industryCode === ind.code);
    const tokens = industryDaily[ind.code].reduce((s, v) => s + v, 0);
    const cost = Math.floor(tokens / 1_000_000 * 12);
    const recent30 = industryDaily[ind.code].slice(-30).reduce((s, v) => s + v, 0);
    const prev30 = industryDaily[ind.code].slice(-60, -30).reduce((s, v) => s + v, 0);
    const growth = prev30 > 0 ? (recent30 - prev30) / prev30 : 0;
    return {
      industryCode: ind.code,
      industryName: ind.name,
      enterprises: ents.length,
      tokens,
      cost,
      growth,
      color: ind.color,
    };
  });

  // 15. 模型用量聚合
  const modelUsage: ModelUsage[] = models.map((m) => {
    const tokens = modelDaily[m.code].reduce((s, v) => s + v, 0);
    return {
      modelCode: m.code,
      modelName: m.name,
      vendor: m.vendor,
      tokens,
      calls: Math.floor(tokens / 2200),
      share: 0, // 后面计算
    };
  });
  const modelTotal = modelUsage.reduce((s, x) => s + x.tokens, 0);
  modelUsage.forEach((x) => (x.share = x.tokens / modelTotal));
  modelUsage.sort((a, b) => b.tokens - a.tokens);

  // 16. 区县用量聚合
  const districtUsage: DistrictUsage[] = DISTRICTS.map((d) => {
    const ents = enterprises.filter((e) => e.districtCode === d.code);
    const tokens = districtDaily[d.code].reduce((s, v) => s + v, 0);
    const cost = Math.floor(tokens / 1_000_000 * 12);
    return {
      districtCode: d.code,
      districtName: d.name,
      enterprises: ents.length,
      tokens,
      cost,
      level: d.level,
      lat: d.lat,
      lng: d.lng,
    };
  });

  return {
    enterprises,
    models,
    computeCenters,
    scheduleLogs,
    policies,
    vouchers,
    voucherApps,
    apps,
    matches,
    alerts,
    cityDaily,
    industryDaily,
    districtDaily,
    modelDaily,
    hourly,
    kpi,
    industryUsage,
    modelUsage,
    districtUsage,
  };
}

export type DataStore = ReturnType<typeof generateAll>;
