import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { MODELS } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import { GovDonut } from "@/components/charts/GovDonut";
import { Download, Activity, Wallet, Receipt, Calendar } from "lucide-react";

export default function UsagePage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const { models } = s;

  // 模拟个人 30 天用量
  const daily = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const baseT = me.monthlyTokens / 30;
    const tokens = Math.floor(baseT * (0.6 + Math.random() * 0.9) * (d.getDay() === 0 || d.getDay() === 6 ? 0.55 : 1));
    return {
      date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`,
      tokens,
      cost: Math.floor(tokens / 1_000_000 * 15),
      calls: Math.floor(tokens / 2200),
    };
  });

  const totalT = daily.reduce((s, d) => s + d.tokens, 0);
  const totalC = daily.reduce((s, d) => s + d.cost, 0);
  const totalCalls = daily.reduce((s, d) => s + d.calls, 0);

  // 模型使用分布（按本企业使用）
  const myModels = models.map((m) => ({
    name: m.name,
    value: Math.floor(totalT * (Math.random() * 0.2 + 0.05)),
    color: "#3b82f6",
  })).sort((a, b) => b.value - a.value).slice(0, 6).map((x, i) => ({ ...x, color: ["#3b82f6", "#22d3ee", "#a855f7", "#10b981", "#f59e0b", "#ec4899"][i] }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">用量与账单</h1>
          <p className="text-sm text-slate-500 mt-1">2026 年 05 月账单 · 自动按调用扣减 Token 券，无需主动充值</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Calendar className="w-4 h-4" />切换月份</button>
          <button className="btn-primary"><Download className="w-4 h-4" />导出 PDF 账单</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="本月调用次数" value={formatNumber(totalCalls)} trend={0.123} trendLabel="月增" accent="#0891b2" icon={<Activity className="w-4 h-4" />} />
        <KpiCard label="本月 Token 消耗" value={formatToken(totalT)} trend={0.183} trendLabel="月增" accent="#7e22ce" />
        <KpiCard label="券抵扣金额" value={formatCurrency(totalC)} accent="#10b981" icon={<Wallet className="w-4 h-4" />} />
        <KpiCard label="实付金额" value={formatCurrency(Math.floor(totalC * 0.15))} unit="（自付 15%）" accent="#dc2626" icon={<Receipt className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header">
            <h2 className="font-semibold text-slate-900">近 30 日用量走势</h2>
            <p className="text-xs text-slate-500 mt-0.5">每日调用次数 + Token 消耗 + 抵扣金额</p>
          </div>
          <div className="gov-card-body">
            <GovLine
              data={daily}
              xKey="date"
              series={[
                { key: "tokens", name: "Token 消耗", color: "#2563eb", type: "area" },
                { key: "calls", name: "调用次数", color: "#a855f7" },
                { key: "cost", name: "抵扣金额", color: "#10b981" },
              ]}
              formatType="number"
              height={300}
            />
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">本月模型使用分布</h2></div>
          <div className="gov-card-body"><GovDonut data={myModels} height={310} formatType="token" /></div>
        </div>
      </div>

      {/* 明细 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">调用明细（最近 50 条）</h2>
            <p className="text-xs text-slate-500 mt-0.5">每一次大模型调用都可追溯 · 自动绑定项目 · 透明扣减</p>
          </div>
          <div className="text-xs text-slate-500">点击行查看 Prompt / Response 详情</div>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>调用 ID</th>
                <th>时间</th>
                <th>模型</th>
                <th>场景</th>
                <th>输入 Token</th>
                <th>输出 Token</th>
                <th>延迟</th>
                <th>费用</th>
                <th>支付方式</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }).map((_, i) => {
                const m = MODELS[i % MODELS.length];
                const tIn = Math.floor(Math.random() * 5000 + 500);
                const tOut = Math.floor(Math.random() * 8000 + 200);
                const cost = (tIn / 1_000_000 * m.priceIn) + (tOut / 1_000_000 * m.priceOut);
                const ts = new Date();
                ts.setSeconds(ts.getSeconds() - i * 142);
                return (
                  <tr key={i}>
                    <td className="font-mono text-[10px] text-slate-500">REQ-{ts.getTime().toString().slice(-10)}</td>
                    <td className="text-xs text-slate-500 digital">{ts.toLocaleString("zh-CN", { hour12: false }).slice(5)}</td>
                    <td className="font-medium text-slate-800">{m.name}</td>
                    <td className="text-sm text-slate-600">{["智能客服", "文档抽取", "代码生成", "知识问答", "工业 QA", "营销文案"][i % 6]}</td>
                    <td className="digital text-slate-700">{formatNumber(tIn)}</td>
                    <td className="digital text-slate-700">{formatNumber(tOut)}</td>
                    <td className="digital text-xs text-slate-600">{Math.floor(Math.random() * 600 + 400)} ms</td>
                    <td className="digital text-slate-800 font-medium">¥ {cost.toFixed(3)}</td>
                    <td><Tag color="green">券抵扣</Tag></td>
                    <td><Tag color="green" dot>成功</Tag></td>
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
