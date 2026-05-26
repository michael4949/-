"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  Home,
  Monitor,
  Landmark,
  Building2,
  Cpu,
  Settings,
  Wallet,
  ServerCog,
  BarChart3,
  Network,
  ShieldCheck,
  Store,
  HeartHandshake,
  Receipt,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";

interface Stats {
  enterprises: number;
  certified: number;
  activeEnterprises: number;
  totalToken: number;
  ytdSubsidy: number;
  yesterdayCalls: number;
  models: number;
  domesticModels: number;
  computeCenters: number;
  totalCards: number;
  tflops: number;
  avgUtil: number;
  pendingApps: number;
  vouchers: number;
  apps: number;
  matches: number;
  alerts: number;
  policies: number;
}

interface Slide {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  description: string;
  highlights: { label: string; value: string; icon?: React.ReactNode }[];
  visual: React.ReactNode;
  jumpTo?: { href: string; label: string };
}

export function TourClient({ stats, cityName }: { stats: Stats; cityName: string }) {
  const slides = useMemo<Slide[]>(
    () => [
      {
        title: `${cityName}城市级 AI Token 运营平台`,
        subtitle: "欢迎一键导览 · 60 秒看懂平台全貌",
        icon: <Sparkles className="w-12 h-12" />,
        color: "#3b82f6",
        bgGradient: "from-blue-900 via-indigo-900 to-purple-900",
        description: "以 Token 券 / 算力券 / 模型券 / 数据券 / 语料券 为核心载体，构建政府 · 企业 · 服务商 · 运营 四端协同的 AI 普惠新基建。",
        highlights: [
          { label: "覆盖企业", value: formatNumber(stats.enterprises) + " 家" },
          { label: "本年累计补贴", value: formatCurrency(stats.ytdSubsidy) },
          { label: "算力卡总数", value: formatNumber(stats.totalCards) + " 张" },
          { label: "接入大模型", value: stats.models + " 款" },
        ],
        visual: (
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: "政府", icon: <Landmark className="w-8 h-8" />, color: "#3b82f6" },
              { name: "企业", icon: <Building2 className="w-8 h-8" />, color: "#06b6d4" },
              { name: "服务商", icon: <Cpu className="w-8 h-8" />, color: "#a855f7" },
              { name: "运营", icon: <Settings className="w-8 h-8" />, color: "#10b981" },
            ].map((r) => (
              <div key={r.name} className="bg-white/10 backdrop-blur rounded-lg p-4 text-center border border-white/20">
                <div className="w-14 h-14 mx-auto rounded-lg flex items-center justify-center mb-2" style={{ background: r.color + "30", color: r.color }}>
                  {r.icon}
                </div>
                <div className="text-sm text-white/90 font-medium">{r.name}</div>
              </div>
            ))}
          </div>
        ),
      },
      {
        title: "城市运行大屏",
        subtitle: "全市 AI 运行驾驶舱",
        icon: <Monitor className="w-12 h-12" />,
        color: "#22d3ee",
        bgGradient: "from-cyan-900 via-blue-900 to-slate-900",
        description: "城市级 AI 一张图全景式呈现：算力地图、行业用量、区县活跃度、模型调用、调度日志、风险告警 — 一屏总览，秒级刷新。",
        highlights: [
          { label: "算力中心", value: stats.computeCenters + " 个" },
          { label: "峰值算力", value: stats.tflops + " PF" },
          { label: "平均利用率", value: formatPercent(stats.avgUtil) },
          { label: "今日调用", value: formatNumber(stats.yesterdayCalls) },
        ],
        visual: <ScreenMockup />,
        jumpTo: { href: "/screen", label: "进入大屏" },
      },
      {
        title: "政府端 · 券务中心",
        subtitle: "五券一体 · 政策精准滴灌",
        icon: <Wallet className="w-12 h-12" />,
        color: "#2563eb",
        bgGradient: "from-blue-900 via-indigo-900 to-slate-900",
        description: "Token / 算力 / 模型 / 数据 / 语料 五类券统一发放与核销，支持 申请审批 / 阶梯优惠 / 行业定向 三种组合模式，全流程留痕。",
        highlights: [
          { label: "已发放券", value: formatNumber(stats.vouchers) + " 张" },
          { label: "本年补贴", value: formatCurrency(stats.ytdSubsidy) },
          { label: "待审申请", value: stats.pendingApps + " 件" },
          { label: "生效政策", value: stats.policies + " 项" },
        ],
        visual: <VoucherMockup />,
        jumpTo: { href: "/gov/vouchers", label: "进入券务中心" },
      },
      {
        title: "政府端 · 算力一张图",
        subtitle: "多算力中心接入 · 智能调度",
        icon: <ServerCog className="w-12 h-12" />,
        color: "#a855f7",
        bgGradient: "from-purple-900 via-fuchsia-900 to-slate-900",
        description: "智算 · 超算 · 通算三类中心统一接入，国产 NVIDIA / 昇腾 / 寒武纪 / 海光多芯片纳管，算力一张图 + 智能调度 + 调度日志全可视化。",
        highlights: [
          { label: "算力中心", value: stats.computeCenters + " 个" },
          { label: "算力卡", value: formatNumber(stats.totalCards) },
          { label: "国产化", value: "44.2%" },
          { label: "节能 PUE", value: "1.23" },
        ],
        visual: <ComputeMockup />,
        jumpTo: { href: "/gov/compute", label: "进入算力一张图" },
      },
      {
        title: "政府端 · BI 分析中心",
        subtitle: "完整 BI · 多维下钻 · 趋势预测",
        icon: <BarChart3 className="w-12 h-12" />,
        color: "#0891b2",
        bgGradient: "from-cyan-900 via-teal-900 to-slate-900",
        description: "按行业 / 区县 / 模型 / 时间 / 规模 多维下钻，支持趋势预测、异常告警、AI 决策建议，月度报表一键导出。",
        highlights: [
          { label: "分析维度", value: "12 维" },
          { label: "时序长度", value: "365 天" },
          { label: "AI 洞察", value: "实时" },
          { label: "支持导出", value: "PDF/CSV/Excel" },
        ],
        visual: <AnalyticsMockup />,
        jumpTo: { href: "/gov/analytics", label: "进入 BI 中心" },
      },
      {
        title: "企业端 · 申请用券",
        subtitle: "一站式申领 · 自动政策匹配",
        icon: <Building2 className="w-12 h-12" />,
        color: "#06b6d4",
        bgGradient: "from-cyan-900 via-blue-900 to-indigo-900",
        description: "企业信息自动带入 · 智能推荐匹配政策 · 附件在线上传 · 平均 1.4 工作日完成审批，全过程线上化。",
        highlights: [
          { label: "可申券种", value: "5 类" },
          { label: "通过率", value: "87.5%" },
          { label: "审批时长", value: "1.4 天" },
          { label: "已认证企业", value: formatNumber(stats.certified) },
        ],
        visual: <ApplyMockup />,
        jumpTo: { href: "/enterprise/apply", label: "进入申请页" },
      },
      {
        title: "企业端 · Model Hub",
        subtitle: "多模型统一接入 · 一行代码切换",
        icon: <Network className="w-12 h-12" />,
        color: "#a855f7",
        bgGradient: "from-purple-900 via-pink-900 to-rose-900",
        description: "DeepSeek / 阿里通义 / 智谱 GLM / 豆包 / 月之暗面 等主流大模型统一 API、统一计费、统一观测，券自动抵扣。",
        highlights: [
          { label: "接入模型", value: stats.models + " 款" },
          { label: "国产模型", value: stats.domesticModels + " 款" },
          { label: "应用场景", value: "12+" },
          { label: "试用门槛", value: "0" },
        ],
        visual: <ModelHubMockup />,
        jumpTo: { href: "/enterprise/models", label: "进入 Model Hub" },
      },
      {
        title: "企业端 · 用量与账单",
        subtitle: "明细可追溯 · 券自动扣减",
        icon: <Receipt className="w-12 h-12" />,
        color: "#10b981",
        bgGradient: "from-emerald-900 via-teal-900 to-cyan-900",
        description: "每一次调用都可追溯，券实时扣减，月度账单清晰透明，PDF 一键下载，财务对账无忧。",
        highlights: [
          { label: "明细追溯", value: "100%" },
          { label: "实时扣减", value: "秒级" },
          { label: "自动开票", value: "支持" },
          { label: "导出格式", value: "PDF/Excel" },
        ],
        visual: <BillingMockup />,
        jumpTo: { href: "/enterprise/usage", label: "查看账单" },
      },
      {
        title: "服务商端 · 模型上架与计费",
        subtitle: "降低接入门槛 · 标准化结算",
        icon: <Cpu className="w-12 h-12" />,
        color: "#ec4899",
        bgGradient: "from-pink-900 via-rose-900 to-slate-900",
        description: "模型一站式接入、合规审核、计费观测、月度结算 — 服务商专注产品，市场推广由平台兜底。",
        highlights: [
          { label: "接入时长", value: "≤ 3 天" },
          { label: "结算周期", value: "T+8" },
          { label: "服务商数", value: "84+" },
          { label: "回款周期", value: "6.4 天" },
        ],
        visual: <ProviderMockup />,
        jumpTo: { href: "/provider/models", label: "进入服务商端" },
      },
      {
        title: "服务商端 · 算力提供",
        subtitle: "算力提供商接入 · 价格 / 利用率自治",
        icon: <ServerCog className="w-12 h-12" />,
        color: "#f59e0b",
        bgGradient: "from-amber-900 via-orange-900 to-red-900",
        description: "算力提供商可将自有数据中心接入城市算力池，统一定价、统一调度、统一结算，提升利用率与营收。",
        highlights: [
          { label: "接入中心", value: stats.computeCenters + " 个" },
          { label: "支持芯片", value: "8 种" },
          { label: "调度策略", value: "10+" },
          { label: "结算自动化", value: "100%" },
        ],
        visual: <ComputeProviderMockup />,
        jumpTo: { href: "/provider/compute", label: "进入算力管理" },
      },
      {
        title: "运营端 · 审核与撮合",
        subtitle: "前置过滤 · 智能匹配",
        icon: <HeartHandshake className="w-12 h-12" />,
        color: "#10b981",
        bgGradient: "from-emerald-900 via-teal-900 to-blue-900",
        description: "平台运营负责前置审核（资质 + 风险）、需求撮合（企业 ↔ 服务商）、活动运营、告警处置。",
        highlights: [
          { label: "审核效率", value: "6.2 h" },
          { label: "撮合成功率", value: "68.4%" },
          { label: "进行中活动", value: "4 场" },
          { label: "活跃需求", value: stats.matches + " 条" },
        ],
        visual: <OperatorMockup />,
        jumpTo: { href: "/operator", label: "进入运营端" },
      },
      {
        title: "导览完成",
        subtitle: "请选择您要进入的工作台",
        icon: <CheckCircle2 className="w-12 h-12" />,
        color: "#10b981",
        bgGradient: "from-emerald-900 via-teal-900 to-cyan-900",
        description: "您已完成全平台导览。点击下方任一角色端进入对应工作台，或直达城市运行大屏。",
        highlights: [],
        visual: (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
            <FinalRoleCard href="/screen" title="城市运行大屏" desc="一屏总览" color="from-cyan-500 to-blue-600" icon={<Monitor className="w-6 h-6" />} />
            <FinalRoleCard href="/gov" title="政府监管端" desc="发券 · 监管 · 政策" color="from-blue-500 to-indigo-700" icon={<Landmark className="w-6 h-6" />} />
            <FinalRoleCard href="/enterprise" title="企业用户端" desc="领券 · 调模型" color="from-cyan-500 to-blue-500" icon={<Building2 className="w-6 h-6" />} />
            <FinalRoleCard href="/provider" title="AI 服务商端" desc="入驻 · 结算" color="from-purple-500 to-pink-500" icon={<Cpu className="w-6 h-6" />} />
            <FinalRoleCard href="/operator" title="平台运营端" desc="审核 · 撮合" color="from-emerald-500 to-teal-600" icon={<Settings className="w-6 h-6" />} />
            <FinalRoleCard href="/" title="返回首页" desc="重新选择" color="from-slate-500 to-slate-600" icon={<Home className="w-6 h-6" />} />
          </div>
        ),
      },
    ],
    [stats, cityName],
  );

  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setCurrent((c) => (c < slides.length - 1 ? c + 1 : c));
    }, 6500);
    return () => clearInterval(t);
  }, [playing, slides.length]);

  const slide = slides[current];

  return (
    <div className={`min-h-screen relative overflow-hidden transition-all duration-700 bg-gradient-to-br ${slide.bgGradient}`}>
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none transition-all duration-700" style={{ background: slide.color + "30" }} />

      {/* 顶栏 */}
      <header className="relative h-14 px-6 flex items-center justify-between text-white border-b border-white/10 backdrop-blur-sm bg-black/20">
        <Link href="/" className="flex items-center gap-2 text-sm hover:text-cyan-300">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>城市级 AI Token 运营平台 · 一键导览</span>
        </div>
        <button onClick={() => setPlaying(!playing)} className="text-sm hover:text-cyan-300 flex items-center gap-1.5">
          {playing ? <><Pause className="w-3.5 h-3.5" /> 暂停自动播放</> : <><Play className="w-3.5 h-3.5" /> 自动播放</>}
        </button>
      </header>

      {/* 进度条 */}
      <div className="relative h-1 bg-white/10">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-700" style={{ width: `${((current + 1) / slides.length) * 100}%` }} />
      </div>

      {/* 主体 */}
      <main className="relative max-w-7xl mx-auto px-8 py-10 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[calc(100vh-200px)]">
          {/* 左侧：文字 */}
          <div className="lg:col-span-5 space-y-6 animate-fade-in" key={current}>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>步骤 {current + 1} / {slides.length}</span>
            </div>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: slide.color + "30", color: slide.color }}>
              {slide.icon}
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight leading-tight">{slide.title}</h1>
              <p className="text-lg text-white/70 mt-2">{slide.subtitle}</p>
            </div>
            <p className="text-base text-white/85 leading-relaxed">{slide.description}</p>
            {slide.highlights.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {slide.highlights.map((h) => (
                  <div key={h.label} className="bg-white/8 backdrop-blur rounded-lg border border-white/10 px-4 py-2.5">
                    <div className="text-xs text-white/55">{h.label}</div>
                    <div className="text-xl font-semibold digital mt-0.5" style={{ color: slide.color }}>
                      {h.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {slide.jumpTo && (
              <div className="pt-3">
                <Link href={slide.jumpTo.href} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-md font-medium hover:bg-white/90 transition shadow-lg">
                  {slide.jumpTo.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* 右侧：视觉 */}
          <div className="lg:col-span-7 relative animate-fade-in" key={`v-${current}`}>
            <div className="bg-white/5 backdrop-blur-lg border border-white/15 rounded-xl overflow-hidden shadow-2xl">
              {slide.visual}
            </div>
          </div>
        </div>

        {/* 底部控制 */}
        <div className="flex items-center justify-between mt-8">
          <button
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-md font-medium flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            上一步
          </button>

          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "w-8 bg-white" : "bg-white/30 hover:bg-white/50"}`}
              />
            ))}
          </div>

          <button
            disabled={current === slides.length - 1}
            onClick={() => setCurrent(current + 1)}
            className="px-4 py-2 bg-white text-slate-900 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed rounded-md font-medium flex items-center gap-1.5 text-sm"
          >
            下一步
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

// ===== 各页面 Mockup =====
function ScreenMockup() {
  return (
    <div className="p-4 grid grid-cols-3 gap-2 h-[380px]">
      <div className="space-y-2">
        <div className="bg-cyan-500/10 rounded p-2 border border-cyan-500/30">
          <div className="text-xs text-cyan-300 mb-1">算力中心</div>
          <div className="text-2xl digital font-semibold text-cyan-200">26</div>
        </div>
        <div className="bg-blue-500/10 rounded p-2 border border-blue-500/30">
          <div className="text-xs text-blue-300 mb-1">算力卡</div>
          <div className="text-xl digital font-semibold text-blue-200">68,402</div>
        </div>
        <div className="bg-purple-500/10 rounded p-2 border border-purple-500/30 flex-1">
          <div className="text-xs text-purple-300 mb-1">调度日志</div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-[10px] text-white/60 truncate">● 滨海智造... 已完成</div>
          ))}
        </div>
      </div>
      <div className="col-span-1 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded border border-cyan-500/30 p-3 relative">
        <div className="text-xs text-cyan-300 mb-1">算力一张图</div>
        <svg viewBox="0 0 200 240" className="w-full h-full">
          <circle cx="100" cy="120" r="80" fill="rgba(34, 211, 238, 0.05)" stroke="rgba(34, 211, 238, 0.3)" />
          {[{cx: 60, cy: 80}, {cx: 140, cy: 90}, {cx: 80, cy: 160}, {cx: 130, cy: 170}, {cx: 100, cy: 120}].map((p, i) => (
            <g key={i}>
              <circle cx={p.cx} cy={p.cy} r="10" fill="#22d3ee" opacity="0.2">
                <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={p.cx} cy={p.cy} r="4" fill="#22d3ee" />
            </g>
          ))}
        </svg>
      </div>
      <div className="space-y-2">
        <div className="bg-emerald-500/10 rounded p-2 border border-emerald-500/30">
          <div className="text-xs text-emerald-300 mb-1">今日 Token</div>
          <div className="text-xl digital font-semibold text-emerald-200">3.42 亿</div>
        </div>
        <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30">
          <div className="text-xs text-amber-300 mb-1">利用率</div>
          <div className="text-xl digital font-semibold text-amber-200">78.4%</div>
        </div>
        <div className="bg-rose-500/10 rounded p-2 border border-rose-500/30">
          <div className="text-xs text-rose-300 mb-1">告警</div>
          <div className="text-xl digital font-semibold text-rose-200">12</div>
        </div>
      </div>
    </div>
  );
}

function VoucherMockup() {
  const types = [
    { name: "Token 券", color: "#3b82f6", val: "1.2 亿" },
    { name: "算力券", color: "#a855f7", val: "8800 卡时" },
    { name: "模型券", color: "#22d3ee", val: "42 万次" },
    { name: "数据券", color: "#10b981", val: "1.8 万次" },
    { name: "语料券", color: "#f59e0b", val: "320 GB" },
  ];
  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {types.map((t) => (
          <div key={t.name} className="bg-white/10 rounded p-2 border border-white/20 text-center">
            <div className="w-8 h-8 mx-auto rounded mb-1 flex items-center justify-center" style={{ background: t.color + "30", color: t.color }}>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-[10px] text-white/70">{t.name}</div>
            <div className="text-xs digital font-semibold mt-0.5" style={{ color: t.color }}>{t.val}</div>
          </div>
        ))}
      </div>
      <div className="bg-white/5 rounded p-3">
        <div className="text-xs text-white/70 mb-2">最近发放</div>
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white/80 truncate flex-1">滨海智造科技有限公司 - Token 券 - 100万</span>
              <span className="text-white/40">{i + 1} 小时前</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComputeMockup() {
  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-cyan-500/15 rounded p-3 border border-cyan-500/30">
          <div className="text-xs text-cyan-200">智算中心</div>
          <div className="text-2xl digital font-semibold text-cyan-300 mt-1">14</div>
          <div className="text-[10px] text-cyan-300/60 mt-1">42,800 卡 · GPU+NPU</div>
        </div>
        <div className="bg-purple-500/15 rounded p-3 border border-purple-500/30">
          <div className="text-xs text-purple-200">超算中心</div>
          <div className="text-2xl digital font-semibold text-purple-300 mt-1">5</div>
          <div className="text-[10px] text-purple-300/60 mt-1">18,200 卡 · 训练为主</div>
        </div>
        <div className="bg-emerald-500/15 rounded p-3 border border-emerald-500/30">
          <div className="text-xs text-emerald-200">通算中心</div>
          <div className="text-2xl digital font-semibold text-emerald-300 mt-1">7</div>
          <div className="text-[10px] text-emerald-300/60 mt-1">7,400 卡 · 推理为主</div>
        </div>
      </div>
      <div className="bg-white/5 rounded p-3">
        <div className="text-xs text-white/70 mb-2">芯片构成</div>
        {[
          { name: "NVIDIA H800", domestic: false, share: 0.32 },
          { name: "昇腾 910B", domestic: true, share: 0.28 },
          { name: "NVIDIA H20", domestic: false, share: 0.18 },
          { name: "寒武纪 590", domestic: true, share: 0.12 },
          { name: "海光 DCU", domestic: true, share: 0.10 },
        ].map((c, i) => (
          <div key={c.name} className="flex items-center gap-2 py-1 text-xs">
            <span className={`w-2 h-2 rounded-full ${c.domestic ? "bg-amber-400" : "bg-cyan-400"}`} />
            <span className="text-white/80 flex-1">{c.name}{c.domestic && <span className="ml-1 text-amber-300">[国产]</span>}</span>
            <div className="w-32 h-1.5 bg-white/10 rounded overflow-hidden">
              <div className="h-full" style={{ width: `${c.share * 100}%`, background: c.domestic ? "#f59e0b" : "#22d3ee" }} />
            </div>
            <span className="digital text-white/70 w-8 text-right">{(c.share * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  return (
    <div className="p-6 space-y-4">
      <div className="bg-white/5 rounded p-3">
        <div className="text-xs text-white/70 mb-2 flex items-center justify-between">
          <span>90 天 Token 趋势</span>
          <span className="text-cyan-300">↑ 38.2%</span>
        </div>
        <svg viewBox="0 0 400 80" className="w-full h-20">
          <defs>
            <linearGradient id="tourTrend" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0 60 L 40 55 L 80 50 L 120 48 L 160 42 L 200 38 L 240 30 L 280 28 L 320 22 L 360 18 L 400 12 L 400 80 L 0 80 Z" fill="url(#tourTrend)" />
          <path d="M 0 60 L 40 55 L 80 50 L 120 48 L 160 42 L 200 38 L 240 30 L 280 28 L 320 22 L 360 18 L 400 12" stroke="#22d3ee" fill="none" strokeWidth="2" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded p-3">
          <div className="text-xs text-white/70 mb-2">行业 TOP 5</div>
          {["智能制造", "金融服务", "商贸零售", "医疗健康", "教育科研"].map((n, i) => (
            <div key={n} className="flex items-center gap-2 py-1 text-xs">
              <span className="text-white/40">{i + 1}.</span>
              <span className="text-white/85 flex-1">{n}</span>
              <span className="digital text-cyan-300">{(45 - i * 8).toFixed(1)}M</span>
            </div>
          ))}
        </div>
        <div className="bg-white/5 rounded p-3">
          <div className="text-xs text-white/70 mb-2">AI 决策建议</div>
          <div className="space-y-2 text-xs">
            <div className="bg-rose-500/15 rounded p-2 border border-rose-500/30 text-rose-200">⬆ 加大金融业 Token 投放</div>
            <div className="bg-amber-500/15 rounded p-2 border border-amber-500/30 text-amber-200">⚠ 国产芯片算力扩容预警</div>
            <div className="bg-blue-500/15 rounded p-2 border border-blue-500/30 text-blue-200">→ 关注物流业活跃度下降</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplyMockup() {
  return (
    <div className="p-6 space-y-3">
      <div className="bg-cyan-500/15 border border-cyan-500/30 rounded p-3 text-xs">
        <div className="text-cyan-300 mb-1">企业信息（已自动带入）</div>
        <div className="text-white/90 font-medium">滨海智造科技股份有限公司</div>
        <div className="text-white/55 text-[10px]">智能制造 · 高新区 · 中型企业 · 已认证 · 高新企业</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded p-3">
          <div className="text-[10px] text-white/55">申请券种</div>
          <div className="text-white/95 text-sm mt-1">Token 券</div>
        </div>
        <div className="bg-white/5 rounded p-3">
          <div className="text-[10px] text-white/55">申请额度</div>
          <div className="text-white/95 text-sm mt-1 digital">500 万 Token</div>
        </div>
      </div>
      <div className="bg-white/5 rounded p-3">
        <div className="text-[10px] text-white/55 mb-1">应用场景</div>
        <div className="text-white/95 text-sm">工业 AI 质检</div>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
        <div className="text-[10px] text-blue-300 mb-1">智能匹配政策（自动）</div>
        <div className="text-white/95 text-sm">智能制造大模型应用专项支持办法</div>
        <div className="text-[10px] text-blue-300/60 mt-1">滨发 〔2025〕46 号 · 配套预算 ¥3200 万</div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button className="px-3 py-1.5 bg-white/10 rounded text-xs text-white/80">保存草稿</button>
        <button className="px-3 py-1.5 bg-white text-slate-900 rounded text-xs font-medium">提交申请</button>
      </div>
    </div>
  );
}

function ModelHubMockup() {
  const models = [
    { name: "DeepSeek-V3", v: "深度求索", color: "#3b82f6" },
    { name: "Qwen-Max", v: "阿里通义", color: "#22d3ee" },
    { name: "GLM-4-Plus", v: "智谱AI", color: "#a855f7" },
    { name: "Doubao-Pro", v: "字节跳动", color: "#ec4899" },
    { name: "Moonshot-128k", v: "月之暗面", color: "#10b981" },
    { name: "Yi-Large", v: "零一万物", color: "#f59e0b" },
  ];
  return (
    <div className="p-5 grid grid-cols-2 gap-2">
      {models.map((m) => (
        <div key={m.name} className="bg-white/8 rounded p-3 border border-white/15">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded flex items-center justify-center text-white font-semibold" style={{ background: m.color }}>
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">{m.name}</div>
              <div className="text-[10px] text-white/55">{m.v}</div>
            </div>
            <button className="text-[10px] px-2 py-0.5 bg-cyan-500/30 text-cyan-300 rounded">试用</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BillingMockup() {
  return (
    <div className="p-5 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-500/15 rounded p-2.5 border border-emerald-500/30">
          <div className="text-[10px] text-emerald-300">本月 Token</div>
          <div className="text-lg digital font-semibold text-emerald-200">4.2 M</div>
        </div>
        <div className="bg-cyan-500/15 rounded p-2.5 border border-cyan-500/30">
          <div className="text-[10px] text-cyan-300">券抵扣</div>
          <div className="text-lg digital font-semibold text-cyan-200">¥ 5.6 万</div>
        </div>
        <div className="bg-rose-500/15 rounded p-2.5 border border-rose-500/30">
          <div className="text-[10px] text-rose-300">实付</div>
          <div className="text-lg digital font-semibold text-rose-200">¥ 8400</div>
        </div>
      </div>
      <div className="bg-white/5 rounded p-3">
        <div className="text-xs text-white/70 mb-2">调用明细（部分）</div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
            <span className="font-mono text-white/40">REQ-{`${i + 1}`.padStart(8, "0")}</span>
            <span className="text-white/80 flex-1">DeepSeek-V3 · 智能客服</span>
            <span className="digital text-white/70">¥ {(Math.random() * 0.5 + 0.1).toFixed(3)}</span>
            <span className="text-emerald-400 text-[10px]">券抵扣</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderMockup() {
  return (
    <div className="p-5 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-purple-500/15 rounded p-3 border border-purple-500/30 text-center">
          <Cpu className="w-5 h-5 mx-auto text-purple-300" />
          <div className="text-xs text-purple-200 mt-1">已接入</div>
          <div className="text-xl digital font-semibold text-purple-300 mt-0.5">8 款</div>
        </div>
        <div className="bg-pink-500/15 rounded p-3 border border-pink-500/30 text-center">
          <Receipt className="w-5 h-5 mx-auto text-pink-300" />
          <div className="text-xs text-pink-200 mt-1">本月营收</div>
          <div className="text-xl digital font-semibold text-pink-300 mt-0.5">¥ 28.4 万</div>
        </div>
        <div className="bg-rose-500/15 rounded p-3 border border-rose-500/30 text-center">
          <ArrowRight className="w-5 h-5 mx-auto text-rose-300" />
          <div className="text-xs text-rose-200 mt-1">回款</div>
          <div className="text-xl digital font-semibold text-rose-300 mt-0.5">T+8</div>
        </div>
      </div>
      <div className="bg-white/5 rounded p-3 space-y-1.5">
        <div className="text-xs text-white/70 mb-1">月度账单</div>
        {["2026-05", "2026-04", "2026-03"].map((m, i) => (
          <div key={m} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-white/70">{m}</span>
            <span className="digital text-white/85 flex-1">¥ {(28.4 + i).toFixed(1)} 万</span>
            <span className={i === 0 ? "text-amber-300" : "text-emerald-300"}>{i === 0 ? "待结算" : "已结算"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComputeProviderMockup() {
  return (
    <div className="p-5 grid grid-cols-2 gap-2">
      {[
        { name: "滨海·一号智算中心", chip: "昇腾 910B × 2048", util: 84, color: "#f59e0b" },
        { name: "云栖·超算节点", chip: "H800 × 1024", util: 92, color: "#ef4444" },
        { name: "高新·新区数据中心", chip: "DCU × 512", util: 67, color: "#3b82f6" },
        { name: "九州·二号智算", chip: "H100 × 768", util: 78, color: "#10b981" },
      ].map((c) => (
        <div key={c.name} className="bg-white/8 rounded p-3 border border-white/15">
          <div className="text-sm text-white font-medium truncate">{c.name}</div>
          <div className="text-[10px] text-white/55 mt-0.5">{c.chip}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden">
              <div className="h-full" style={{ width: `${c.util}%`, background: c.color }} />
            </div>
            <span className="text-xs digital" style={{ color: c.color }}>{c.util}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OperatorMockup() {
  return (
    <div className="p-5 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-500/15 rounded p-3 border border-emerald-500/30 text-center">
          <div className="text-xs text-emerald-200">待审申请</div>
          <div className="text-2xl digital font-semibold text-emerald-300 mt-1">86</div>
        </div>
        <div className="bg-cyan-500/15 rounded p-3 border border-cyan-500/30 text-center">
          <div className="text-xs text-cyan-200">撮合中</div>
          <div className="text-2xl digital font-semibold text-cyan-300 mt-1">28</div>
        </div>
        <div className="bg-rose-500/15 rounded p-3 border border-rose-500/30 text-center">
          <div className="text-xs text-rose-200">待告警</div>
          <div className="text-2xl digital font-semibold text-rose-300 mt-1">12</div>
        </div>
      </div>
      <div className="bg-white/5 rounded p-3">
        <div className="text-xs text-white/70 mb-2">智能撮合推荐</div>
        {[
          { ent: "滨海智造", svc: "智云科技", score: 96 },
          { ent: "金海医疗", svc: "中科云脑", score: 92 },
          { ent: "潮阳教育", svc: "百川数智", score: 88 },
        ].map((m) => (
          <div key={m.ent} className="flex items-center gap-2 py-1 text-xs">
            <span className="text-white/85">{m.ent}</span>
            <ArrowRight className="w-3 h-3 text-white/40" />
            <span className="text-white/85 flex-1">{m.svc}</span>
            <span className="digital text-emerald-300 font-medium">{m.score}% 匹配</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalRoleCard({ href, title, desc, color, icon }: { href: string; title: string; desc: string; color: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="bg-white/10 hover:bg-white/15 backdrop-blur border border-white/20 rounded-lg p-4 transition-all">
      <div className={`w-12 h-12 rounded bg-gradient-to-br ${color} text-white flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <div className="text-xs text-white/65 mt-0.5">{desc}</div>
    </Link>
  );
}
