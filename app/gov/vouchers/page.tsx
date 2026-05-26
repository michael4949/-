import { getStore } from "@/lib/data/store";
import { VOUCHER_TYPES, INDUSTRIES } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent, formatDate, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovDonut } from "@/components/charts/GovDonut";
import { GovLine } from "@/components/charts/GovLine";
import Link from "next/link";
import { Plus, Download, Filter, ListPlus, Wallet, Coins, Database, BookOpen, Cpu, ChevronRight } from "lucide-react";

const VT_COLORS: Record<string, string> = {
  TOKEN: "#3b82f6",
  COMPUTE: "#a855f7",
  MODEL: "#22d3ee",
  DATA: "#10b981",
  CORPUS: "#f59e0b",
};

const VT_ICONS: Record<string, React.ReactNode> = {
  TOKEN: <Wallet className="w-4 h-4" />,
  COMPUTE: <Cpu className="w-4 h-4" />,
  MODEL: <Coins className="w-4 h-4" />,
  DATA: <Database className="w-4 h-4" />,
  CORPUS: <BookOpen className="w-4 h-4" />,
};

export default function GovVouchersPage() {
  const s = getStore();
  const { vouchers, cityDaily } = s;

  // 按类型聚合
  const byType = VOUCHER_TYPES.map((vt) => {
    const filtered = vouchers.filter((v) => v.type === vt.code);
    const granted = filtered.reduce((s, v) => s + v.amount, 0);
    const used = filtered.reduce((s, v) => s + v.amountUsed, 0);
    const remaining = granted - used;
    const active = filtered.filter((v) => v.status === "ACTIVE").length;
    return { ...vt, count: filtered.length, granted, used, remaining, active, useRate: used / Math.max(1, granted), color: VT_COLORS[vt.code] };
  });

  const totalGranted = byType.reduce((s, t) => s + t.granted, 0);
  const totalUsed = byType.reduce((s, t) => s + t.used, 0);
  const activeCount = vouchers.filter((v) => v.status === "ACTIVE").length;
  const expiringSoon = vouchers.filter((v) => {
    const days = (new Date(v.expireAt).getTime() - Date.now()) / 86400000;
    return v.status === "ACTIVE" && days > 0 && days < 30;
  }).length;

  // 近 30 天发放/消耗
  const last30 = cityDaily.slice(-30).map((p) => ({
    date: p.date.slice(5),
    granted: Math.floor(p.tokens * 1.2 / 1e4),
    used: Math.floor(p.tokens / 1e4),
  }));

  const recent = vouchers.slice().sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 12);

  const ruleColor: Record<string, "blue" | "green" | "purple"> = { PUBLIC: "green", APPLY: "blue", INDUSTRY: "purple" };
  const statusColor: Record<string, "green" | "amber" | "slate" | "red"> = {
    ACTIVE: "green",
    EXPIRED: "slate",
    EXHAUSTED: "amber",
    FROZEN: "red",
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">券务中心</h1>
          <p className="text-sm text-slate-500 mt-1">Token / 算力 / 模型 / 数据 / 语料券 发放 · 核销 · 结算</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Download className="w-4 h-4" />导出</button>
          <button className="btn-secondary"><ListPlus className="w-4 h-4" />批量发券</button>
          <button className="btn-primary"><Plus className="w-4 h-4" />新建券批次</button>
        </div>
      </div>

      {/* 顶部 KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="累计发放" value={formatCurrency(totalGranted)} trend={0.183} trendLabel="本月" accent="#2563eb" icon={<Wallet className="w-4 h-4" />} />
        <KpiCard label="累计使用" value={formatCurrency(totalUsed)} trend={0.246} trendLabel="本月" accent="#0891b2" icon={<Coins className="w-4 h-4" />} />
        <KpiCard label="使用率" value={formatPercent(totalUsed / totalGranted)} trend={0.054} trendLabel="月增" accent="#7e22ce" />
        <KpiCard label="生效中券" value={formatNumber(activeCount)} accent="#047857" />
        <KpiCard label="30 日内到期" value={formatNumber(expiringSoon)} accent="#ea580c" />
      </div>

      {/* 五券一体卡片 */}
      <div>
        <div className="text-xs text-slate-500 mb-3 font-medium tracking-wider uppercase">五券一体</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {byType.map((t) => (
            <div key={t.code} className="gov-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: t.color + "20", color: t.color }}>
                    {VT_ICONS[t.code]}
                  </div>
                  <Tag color={t.code === "TOKEN" ? "blue" : t.code === "COMPUTE" ? "purple" : t.code === "MODEL" ? "cyan" : t.code === "DATA" ? "green" : "amber"}>
                    {t.count} 张
                  </Tag>
                </div>
                <div className="text-sm font-semibold text-slate-800">{t.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">{t.desc}</div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-baseline justify-between text-[10px] text-slate-500 mb-1">
                    <span>已发放</span>
                    <span className="text-slate-700 digital font-medium">{t.code === "TOKEN" ? formatToken(t.granted) : formatNumber(t.granted)}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[10px] text-slate-500 mb-1">
                    <span>已使用</span>
                    <span className="text-slate-700 digital font-medium">{t.code === "TOKEN" ? formatToken(t.used) : formatNumber(t.used)}</span>
                  </div>
                  <div className="progress-bar mt-2">
                    <div className="progress-bar-fill" style={{ width: `${t.useRate * 100}%`, background: t.color }} />
                  </div>
                  <div className="text-right text-[10px] text-slate-500 mt-1 digital">使用率 {formatPercent(t.useRate)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 走势 + 结构 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">近 30 天 Token 券发放与使用</h2>
              <p className="text-xs text-slate-500 mt-0.5">单位：万 Token</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Tag color="blue">Token 券</Tag>
              <Tag color="purple">算力券</Tag>
            </div>
          </div>
          <div className="gov-card-body">
            <GovLine
              data={last30}
              xKey="date"
              series={[
                { key: "granted", name: "发放量", color: "#2563eb", type: "area" },
                { key: "used", name: "核销量", color: "#0891b2", type: "area" },
              ]}
              formatType="number"
              height={260}
            />
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header">
            <h2 className="font-semibold text-slate-900">发放规则分布</h2>
            <p className="text-xs text-slate-500 mt-0.5">普惠 / 申请 / 行业定向</p>
          </div>
          <div className="gov-card-body">
            <GovDonut
              data={["PUBLIC", "APPLY", "INDUSTRY"].map((r) => ({
                name: r === "PUBLIC" ? "普惠发放" : r === "APPLY" ? "申请审批" : "行业定向",
                value: vouchers.filter((v) => v.rule === r).reduce((s, v) => s + v.amount, 0),
                color: r === "PUBLIC" ? "#10b981" : r === "APPLY" ? "#2563eb" : "#a855f7",
              }))}
              height={250}
              formatType="number"
            />
          </div>
        </div>
      </div>

      {/* 券列表 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">最近发放</h2>
            <p className="text-xs text-slate-500 mt-0.5">显示最近 12 张券，全量 {formatNumber(vouchers.length)} 张</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100">
              <Filter className="w-3.5 h-3.5" />
              筛选
            </button>
            <Link href="/gov/applications" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              全部券务 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>券号</th>
                <th>类型</th>
                <th>批次</th>
                <th>企业</th>
                <th>金额 / 配额</th>
                <th>使用</th>
                <th>规则</th>
                <th>状态</th>
                <th>发放时间</th>
                <th>到期</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((v) => {
                const vt = VOUCHER_TYPES.find((x) => x.code === v.type)!;
                return (
                  <tr key={v.id}>
                    <td className="font-mono text-xs text-slate-500">{v.id}</td>
                    <td><Tag color={v.type === "TOKEN" ? "blue" : v.type === "COMPUTE" ? "purple" : v.type === "MODEL" ? "cyan" : v.type === "DATA" ? "green" : "amber"}>{vt.name}</Tag></td>
                    <td className="font-mono text-xs">{v.batchCode}</td>
                    <td className="max-w-[200px] truncate font-medium text-slate-800">{v.enterpriseName}</td>
                    <td className="digital">{v.type === "TOKEN" ? formatToken(v.amount) : formatNumber(v.amount)} {v.unit}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 progress-bar"><div className="progress-bar-fill" style={{ width: `${(v.amountUsed / v.amount) * 100}%`, background: VT_COLORS[v.type] }} /></div>
                        <span className="digital text-xs text-slate-500 w-10 text-right">{formatPercent(v.amountUsed / v.amount, 0)}</span>
                      </div>
                    </td>
                    <td><Tag color={ruleColor[v.rule]}>{v.rule === "PUBLIC" ? "普惠" : v.rule === "APPLY" ? "申请" : "行业"}</Tag></td>
                    <td><Tag color={statusColor[v.status]} dot>{v.status === "ACTIVE" ? "生效" : v.status === "EXPIRED" ? "已过期" : v.status === "EXHAUSTED" ? "已耗尽" : "已冻结"}</Tag></td>
                    <td className="text-slate-500 text-xs">{formatDate(v.issuedAt)}</td>
                    <td className="text-slate-500 text-xs">{formatDate(v.expireAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
