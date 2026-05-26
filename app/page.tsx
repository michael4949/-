import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { CITY_NAME } from "@/lib/constants";
import { formatNumber, formatToken } from "@/lib/utils";
import {
  Building2,
  Landmark,
  Cpu,
  Settings,
  Monitor,
  Sparkles,
  ArrowRight,
  Wallet,
  ServerCog,
  Globe2,
  ShieldCheck,
  Network,
  BarChart3,
} from "lucide-react";

export default function Home() {
  const store = getStore();
  const { kpi, computeCenters, models } = store;
  const totalCards = computeCenters.reduce((s, c) => s + c.totalCards, 0);

  const roles = [
    {
      key: "gov",
      title: "政府监管端",
      subtitle: "Government Console",
      desc: "发券 · 监管 · 政策 · 大盘 · 算力调度 · 产业洞察",
      icon: <Landmark className="w-7 h-7" />,
      color: "from-blue-600 to-indigo-700",
      accent: "#1e40af",
      stats: [
        { label: "在管企业", value: formatNumber(kpi.totalEnterprises) },
        { label: "认证企业", value: formatNumber(kpi.certifiedEnterprises) },
        { label: "本年发放", value: "¥ " + formatNumber(kpi.ytdSubsidy) },
      ],
      href: "/gov",
    },
    {
      key: "enterprise",
      title: "企业用户端",
      subtitle: "Enterprise Workspace",
      desc: "领券 · 调模型 · 看用量 · 应用市场 · 政策匹配",
      icon: <Building2 className="w-7 h-7" />,
      color: "from-cyan-600 to-blue-600",
      accent: "#0891b2",
      stats: [
        { label: "可申领券种", value: "5 类" },
        { label: "可调模型", value: `${models.length} 款` },
        { label: "应用市场", value: `${store.apps.length} 应用` },
      ],
      href: "/enterprise",
    },
    {
      key: "provider",
      title: "AI 服务商端",
      subtitle: "Provider Portal",
      desc: "模型入驻 · 调用统计 · 算力对接 · 结算对账",
      icon: <Cpu className="w-7 h-7" />,
      color: "from-purple-600 to-pink-600",
      accent: "#7e22ce",
      stats: [
        { label: "已接入模型", value: `${models.length} 款` },
        { label: "算力中心", value: `${computeCenters.length} 个` },
        { label: "月均调用", value: formatNumber(kpi.yesterdayCalls * 30) },
      ],
      href: "/provider",
    },
    {
      key: "operator",
      title: "平台运营端",
      subtitle: "Operator Backstage",
      desc: "审核 · 撮合 · 活动 · 告警 · 模型上架审核",
      icon: <Settings className="w-7 h-7" />,
      color: "from-emerald-600 to-teal-700",
      accent: "#047857",
      stats: [
        { label: "待审申请", value: formatNumber(store.voucherApps.filter((a) => a.status === "PENDING").length) },
        { label: "活跃需求", value: formatNumber(store.matches.filter((m) => m.status === "OPEN").length) },
        { label: "活跃告警", value: formatNumber(store.alerts.filter((a) => !a.acked).length) },
      ],
      href: "/operator",
    },
  ];

  const features = [
    { icon: <Wallet className="w-5 h-5" />, t: "五券一体", d: "Token / 算力 / 模型 / 数据 / 语料券统一编排" },
    { icon: <ServerCog className="w-5 h-5" />, t: "算力一张图", d: "26 个智算 / 超算 / 通算中心一体化调度" },
    { icon: <Network className="w-5 h-5" />, t: "多模型聚合", d: "14+ 主流大模型统一接入与计费" },
    { icon: <Globe2 className="w-5 h-5" />, t: "万级企业服务", d: "覆盖 8 大行业 12 区县" },
    { icon: <ShieldCheck className="w-5 h-5" />, t: "全程合规审计", d: "申请 · 发券 · 调用 · 结算全链路留痕" },
    { icon: <BarChart3 className="w-5 h-5" />, t: "完整 BI 能力", d: "多维下钻 · 趋势预测 · 异常告警 · 报表导出" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-br from-blue-200/30 via-cyan-100/20 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-[1400px] mx-auto px-8 py-10">
        {/* 顶部导航 */}
        <nav className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-base leading-tight">{CITY_NAME} · 城市级 AI Token 运营平台</div>
              <div className="text-xs text-slate-500 mt-0.5">CityAI · Token · Compute · Model 一体化</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/screen"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-blue-700 hover:bg-white rounded-md transition-colors ring-1 ring-inset ring-slate-200"
            >
              <Monitor className="w-4 h-4" />
              城市运行大屏
            </Link>
            <Link
              href="/tour"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 rounded-md hover:opacity-95 shadow-md shadow-blue-500/30 transition"
            >
              <Sparkles className="w-4 h-4" />
              一键导览
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/60 text-blue-700 text-xs font-medium mb-5 ring-1 ring-inset ring-blue-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            平台运行中 · 数据实时刷新
          </div>
          <h1 className="text-5xl font-semibold text-slate-900 tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
              {CITY_NAME}
            </span>
            <span className="ml-3">城市级 AI Token 运营平台</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            以"Token 券 · 算力券 · 模型券"为核心载体，构建政府主导、企业受益、服务商协同、运营赋能的 AI 普惠新基建。
          </p>

          {/* 全局指标条 */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-3 max-w-5xl mx-auto">
            <SummaryStat label="在管企业" value={formatNumber(kpi.totalEnterprises)} />
            <SummaryStat label="本年累计 Token" value={formatToken(kpi.totalTokenConsumed)} />
            <SummaryStat label="算力中心" value={`${computeCenters.length} 个`} />
            <SummaryStat label="算力卡总数" value={formatNumber(totalCards)} />
            <SummaryStat label="入驻模型" value={`${models.length} 款`} />
            <SummaryStat label="本年补贴金额" value={"¥ " + formatNumber(kpi.ytdSubsidy)} />
          </div>
        </div>

        {/* 四角色 */}
        <div className="mb-8">
          <div className="text-sm text-slate-500 mb-4 font-medium tracking-wider uppercase">选择您的工作台</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((r) => (
              <Link
                key={r.key}
                href={r.href}
                className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all hover:-translate-y-1"
              >
                <div className={`h-1.5 bg-gradient-to-r ${r.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center text-white shadow-md`}
                    >
                      {r.icon}
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg">{r.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{r.subtitle}</p>
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">{r.desc}</p>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                    {r.stats.map((s) => (
                      <div key={s.label}>
                        <div className="text-[10px] text-slate-400">{s.label}</div>
                        <div className="text-sm font-semibold text-slate-800 mt-0.5 digital">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 平台能力 */}
        <div className="mt-12">
          <div className="text-sm text-slate-500 mb-4 font-medium tracking-wider uppercase">平台核心能力</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((f) => (
              <div
                key={f.t}
                className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-slate-200/60"
              >
                <div className="w-9 h-9 rounded bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <div className="font-medium text-slate-900 text-sm">{f.t}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className="mt-16 pt-8 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 {CITY_NAME}人民政府数据局 · {CITY_NAME}人工智能产业发展中心 共建
          </div>
          <div className="flex items-center gap-4">
            <span>政务网备 浙ICP备 2026-{Math.floor(Math.random() * 90000 + 10000)} 号</span>
            <span className="text-emerald-600">● 数据每 5 秒刷新</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-lg border border-slate-200/60 px-3 py-2">
      <div className="text-[10px] text-slate-500 font-medium">{label}</div>
      <div className="text-base font-semibold text-slate-900 mt-0.5 digital">{value}</div>
    </div>
  );
}
