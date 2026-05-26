import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { INDUSTRIES, DISTRICTS, ENTERPRISE_SCALES, VOUCHER_TYPES } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent, formatDate, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import Link from "next/link";
import {
  Wallet,
  Activity,
  Coins,
  TrendingUp,
  Cpu,
  PlusCircle,
  ChevronRight,
  Sparkles,
  Star,
  BadgeCheck,
  ShieldCheck,
  Store,
  FileText,
  HeartHandshake,
  AlertCircle,
  Calendar,
} from "lucide-react";

export default function EnterpriseHomePage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const ind = INDUSTRIES.find((i) => i.code === me.industryCode);
  const dis = DISTRICTS.find((d) => d.code === me.districtCode);
  const scale = ENTERPRISE_SCALES.find((sc) => sc.code === me.scale);

  const myVouchers = s.vouchers.filter((v) => v.enterpriseId === me.id);
  const activeVouchers = myVouchers.filter((v) => v.status === "ACTIVE");
  const myApps = s.voucherApps.filter((a) => a.enterpriseId === me.id);

  // 生成近 30 天个人用量
  const dailyTokens = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`,
      tokens: Math.floor(me.monthlyTokens / 30 * (0.6 + Math.random() * 0.8) * (d.getDay() === 0 || d.getDay() === 6 ? 0.55 : 1)),
      cost: 0,
    };
  });
  dailyTokens.forEach((d) => (d.cost = Math.floor(d.tokens / 1_000_000 * 15)));

  const matchingPolicies = s.policies.filter((p) => p.industryTargets.includes(me.industryCode)).slice(0, 4);
  const recommendApps = s.apps.filter((a) => a.industries.includes(me.industryCode)).slice(0, 5);

  return (
    <div className="p-6 space-y-5">
      {/* 顶部欢迎条 */}
      <div className="bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-3 text-sm text-cyan-100/80 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>欢迎回来，{me.contact}</span>
          </div>
          <h1 className="text-2xl font-semibold">{me.name}</h1>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Tag color="cyan">
              <span style={{ color: ind?.color }}>● </span>
              {ind?.name}
            </Tag>
            <Tag color="cyan">{dis?.name}</Tag>
            <Tag color="cyan">{scale?.name}企业</Tag>
            {me.certified && <Tag color="green"><BadgeCheck className="w-3 h-3 mr-0.5" />已认证</Tag>}
            {me.isHighTech && <Tag color="amber"><ShieldCheck className="w-3 h-3 mr-0.5" />高新企业</Tag>}
            {me.isSpecialized && <Tag color="purple">专精特新</Tag>}
            <div className="ml-auto text-xs text-cyan-100/70">
              统一信用代码 <span className="font-mono">{me.uscc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="可用券余额（Token）" value={formatToken(activeVouchers.filter((v) => v.type === "TOKEN").reduce((s, v) => s + v.amountRemaining, 0))} trend={0.18} trendLabel="本月新增" accent="#0891b2" icon={<Wallet className="w-4 h-4" />} />
        <KpiCard label="本年累计调用" value={formatToken(me.yearlyTokens)} trend={0.243} trendLabel="同比" accent="#7e22ce" icon={<Activity className="w-4 h-4" />} />
        <KpiCard label="本月预计支出" value={formatCurrency(Math.floor(me.yearlyCost / 12))} trend={0.082} trendLabel="环比" accent="#dc2626" icon={<Coins className="w-4 h-4" />} />
        <KpiCard label="可申领券种" value={`${VOUCHER_TYPES.length} 类`} accent="#047857" icon={<PlusCircle className="w-4 h-4" />} />
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickEntry href="/enterprise/apply" icon={<PlusCircle className="w-5 h-5" />} title="申请用券" desc="Token / 算力 / 模型 / 数据 / 语料券" color="from-blue-500 to-cyan-500" />
        <QuickEntry href="/enterprise/models" icon={<Cpu className="w-5 h-5" />} title="调用大模型" desc={`${s.models.length} 款主流大模型 · 统一 API`} color="from-purple-500 to-pink-500" />
        <QuickEntry href="/enterprise/market" icon={<Store className="w-5 h-5" />} title="应用市场" desc={`${recommendApps.length} 个匹配本行业应用`} color="from-amber-500 to-orange-500" />
        <QuickEntry href="/enterprise/matching" icon={<HeartHandshake className="w-5 h-5" />} title="发布需求" desc="服务商响应 · 24 小时撮合" color="from-emerald-500 to-teal-500" />
      </div>

      {/* 用量曲线 + 我的券包 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">近 30 日 Token 用量</h2>
              <p className="text-xs text-slate-500 mt-0.5">实际消耗 + 抵扣金额</p>
            </div>
            <Link href="/enterprise/usage" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">详细账单 <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="gov-card-body">
            <GovLine
              data={dailyTokens}
              xKey="date"
              series={[
                { key: "tokens", name: "Token 用量", color: "#2563eb", type: "area" },
                { key: "cost", name: "抵扣金额 (元)", color: "#0891b2" },
              ]}
              formatType="number"
              height={280}
            />
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">我的券包</h2>
            <Link href="/enterprise/vouchers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">全部 <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {activeVouchers.slice(0, 5).map((v) => {
              const vt = VOUCHER_TYPES.find((t) => t.code === v.type);
              return (
                <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${v.type === "TOKEN" ? "bg-blue-100 text-blue-600" : v.type === "COMPUTE" ? "bg-purple-100 text-purple-600" : "bg-emerald-100 text-emerald-600"}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                      {vt?.name}
                      <Tag color={v.rule === "PUBLIC" ? "green" : v.rule === "APPLY" ? "blue" : "purple"}>{v.rule === "PUBLIC" ? "普惠" : v.rule === "APPLY" ? "申请" : "行业"}</Tag>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 digital">
                      余 {v.type === "TOKEN" ? formatToken(v.amountRemaining) : formatNumber(v.amountRemaining)} / {v.type === "TOKEN" ? formatToken(v.amount) : formatNumber(v.amount)} {v.unit}
                    </div>
                    <div className="progress-bar mt-1.5"><div className="progress-bar-fill" style={{ width: `${(v.amountUsed / v.amount) * 100}%`, background: v.type === "TOKEN" ? "#2563eb" : v.type === "COMPUTE" ? "#a855f7" : "#10b981" }} /></div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    <div>{formatDate(v.expireAt)}</div>
                    <div>到期</div>
                  </div>
                </div>
              );
            })}
            {activeVouchers.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                暂无生效中的券<br />
                <Link href="/enterprise/apply" className="text-blue-600 hover:underline text-xs">立即申请</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 政策匹配 + 推荐应用 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">为您匹配的政策</h2>
              <p className="text-xs text-slate-500 mt-0.5">基于您所在行业、规模和资质</p>
            </div>
            <Link href="/enterprise/policies" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">查看全部 <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {matchingPolicies.map((p) => (
              <div key={p.id} className="px-5 py-3 hover:bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 text-sm">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{p.issuer}</span>
                      <span>·</span>
                      <span>预算 {formatCurrency(p.budget)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {p.tags.slice(0, 3).map((t) => (
                        <Tag key={t} color="cyan">{t}</Tag>
                      ))}
                    </div>
                  </div>
                  <button className="text-xs text-blue-600 hover:underline whitespace-nowrap">立即申请</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">推荐应用</h2>
              <p className="text-xs text-slate-500 mt-0.5">您所在行业最受欢迎</p>
            </div>
            <Link href="/enterprise/market" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">应用市场 <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="px-5 py-3 grid grid-cols-1 gap-2">
            {recommendApps.map((app) => (
              <div key={app.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                <div className="w-10 h-10 rounded flex items-center justify-center font-semibold text-white" style={{ background: app.cover }}>
                  {app.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{app.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{app.vendor} · {app.category}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-0.5 justify-end">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-xs digital">{app.rating}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{formatNumber(app.installs)} 安装</div>
                </div>
                <Tag color={app.priceType === "FREE" ? "green" : app.priceType === "VOUCHER" ? "purple" : "blue"}>
                  {app.priceType === "FREE" ? "免费" : app.priceType === "VOUCHER" ? "可用券" : app.priceType === "TRIAL" ? "试用" : "付费"}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 通知 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-900">最新通知</h2>
          </div>
          <span className="text-xs text-slate-400">系统消息 / 政策推送 / 券到期提醒</span>
        </div>
        <div className="divide-y divide-slate-100">
          <NoticeRow color="amber" tag="券到期" time="2 小时前">
            您有 1 张「Token 券」将于 7 天后到期（余额 80 万 Token），建议尽快使用。
          </NoticeRow>
          <NoticeRow color="blue" tag="政策" time="昨天">
            新政策《滨海市人工智能产业发展三年行动计划》匹配您的企业画像，<a className="text-blue-600 hover:underline">查看详情</a>
          </NoticeRow>
          <NoticeRow color="green" tag="审批" time="3 天前">
            您于 5 月 21 日提交的「算力券」申请已通过，已发放至券包。
          </NoticeRow>
          <NoticeRow color="purple" tag="服务商" time="5 天前">
            您发布的 AI 智能客服解决方案需求收到 4 家服务商响应，<a className="text-blue-600 hover:underline">立即查看</a>
          </NoticeRow>
        </div>
      </div>
    </div>
  );
}

function QuickEntry({ href, icon, title, desc, color }: { href: string; icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <Link href={href} className="group bg-white rounded-lg border border-slate-200 p-4 hover:border-cyan-300 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 group-hover:text-cyan-700">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">{desc}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition" />
      </div>
    </Link>
  );
}

function NoticeRow({ color, tag, time, children }: { color: "amber" | "blue" | "green" | "purple"; tag: string; time: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/40">
      <Tag color={color}>{tag}</Tag>
      <div className="flex-1 text-sm text-slate-700">{children}</div>
      <span className="text-xs text-slate-400 whitespace-nowrap">{time}</span>
    </div>
  );
}
