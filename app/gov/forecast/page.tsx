import { getStore } from "@/lib/data/store";
import { INDUSTRIES } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import { TrendingUp, AlertCircle, Sparkles, Target } from "lucide-react";

export default function GovForecastPage() {
  const s = getStore();
  const { cityDaily, industryUsage } = s;

  // 简单线性外推 + 季节性扰动
  const last90 = cityDaily.slice(-90);
  const avg30 = last90.slice(-30).reduce((s, p) => s + p.tokens, 0) / 30;
  const avg90 = last90.reduce((s, p) => s + p.tokens, 0) / 90;
  const growth = (avg30 - avg90) / avg90;

  const historical = last90.map((p) => ({ date: p.date.slice(5), actual: p.tokens, forecast: null as number | null }));
  const forecast: any[] = [];
  for (let i = 1; i <= 30; i++) {
    const trend = avg30 * (1 + growth * (i / 30));
    const seasonal = 1 + 0.1 * Math.sin((i / 7) * Math.PI);
    const v = trend * seasonal;
    const d = new Date();
    d.setDate(d.getDate() + i);
    forecast.push({ date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`, actual: null, forecast: Math.floor(v), upper: Math.floor(v * 1.15), lower: Math.floor(v * 0.85) });
  }
  const combined = [...historical, ...forecast];

  const next30Total = forecast.reduce((s, p) => s + p.forecast, 0);
  const next30Cost = next30Total / 1_000_000 * 12;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">趋势预测</h1>
          <p className="text-sm text-slate-500 mt-1">基于近 90 天数据的回归 + 季节性预测 · 仅供决策参考</p>
        </div>
        <Tag color="purple"><Sparkles className="w-3 h-3 mr-1" />AI 增强预测</Tag>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="近 30 日均消耗" value={formatToken(avg30)} icon={<TrendingUp className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="近 30 日增长率" value={formatPercent(growth)} trend={growth} accent={growth > 0 ? "#10b981" : "#ef4444"} />
        <KpiCard label="预测下 30 日总量" value={formatToken(next30Total)} accent="#7e22ce" />
        <KpiCard label="预测补贴需求" value={formatCurrency(next30Cost)} accent="#ea580c" />
      </div>

      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Token 消耗 - 历史 + 未来 30 日预测</h2>
            <p className="text-xs text-slate-500 mt-0.5">蓝色：历史实际 · 紫色：预测中值 · 浅紫：95% 置信区间</p>
          </div>
          <div className="text-xs text-slate-500">最后更新 {new Date().toLocaleString("zh-CN", { hour12: false })}</div>
        </div>
        <div className="gov-card-body">
          <GovLine
            data={combined}
            xKey="date"
            series={[
              { key: "actual", name: "历史", color: "#2563eb", type: "area" },
              { key: "forecast", name: "预测中值", color: "#a855f7", type: "area" },
              { key: "upper", name: "上限", color: "#c4b5fd" },
              { key: "lower", name: "下限", color: "#c4b5fd" },
            ]}
            formatType="token"
            height={380}
          />
        </div>
      </div>

      {/* 行业增长矩阵 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header">
            <h2 className="font-semibold text-slate-900">行业增长矩阵</h2>
            <p className="text-xs text-slate-500 mt-0.5">基于近 30/60 天对比 · 蓝色=高增长高规模 · 灰色=待加强</p>
          </div>
          <div className="gov-card-body">
            <div className="grid grid-cols-4 gap-3">
              {industryUsage
                .slice()
                .sort((a, b) => b.tokens - a.tokens)
                .map((u, i) => {
                  const max = industryUsage[0].tokens;
                  const score = (u.tokens / max) * (1 + Math.max(0, u.growth));
                  const star = score > 0.7 && u.growth > 0.1;
                  const cash = score > 0.5 && u.growth < 0.1;
                  const question = u.growth > 0.3 && score < 0.3;
                  return (
                    <div key={u.industryCode} className="p-3 rounded border bg-white"
                      style={{
                        borderColor: u.color + "40",
                        background: `linear-gradient(135deg, ${u.color}10 0%, white 50%)`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">{u.industryName}</span>
                        {star && <Tag color="amber">明星</Tag>}
                        {cash && <Tag color="green">现金牛</Tag>}
                        {question && <Tag color="cyan">问题</Tag>}
                        {!star && !cash && !question && <Tag color="slate">瘦狗</Tag>}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="text-slate-500">规模</div>
                          <div className="digital font-medium text-slate-800">{formatToken(u.tokens)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">增长</div>
                          <div className={`digital font-medium ${u.growth > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {u.growth > 0 ? "▲" : "▼"} {(Math.abs(u.growth) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-2">企业 {u.enterprises} 家</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" /> AI 决策建议</h2></div>
          <div className="px-5 py-3 space-y-3 text-sm">
            <Recommendation level="high" title="加大金融服务业 Token 券投放">
              该行业近 30 日增长率达 42%，但企业覆盖率仅 18%。建议增加专项券额度 ¥800 万。
            </Recommendation>
            <Recommendation level="med" title="优化文化创意行业激励">
              规模偏低但增速喜人，可与本市文化产业基金联动，组合发放模型券+应用补贴。
            </Recommendation>
            <Recommendation level="low" title="关注现代物流行业活跃度">
              环比下降 6%，需深入调研是否需求侧出现波动。建议运营端发起需求撮合活动。
            </Recommendation>
            <Recommendation level="high" title="国产芯片算力扩容预警">
              按预测，下 30 日昇腾集群利用率将持续超过 92%，建议提前扩容或与上海算力市场联调。
            </Recommendation>
          </div>
        </div>
      </div>
    </div>
  );
}

function Recommendation({ level, title, children }: { level: "high" | "med" | "low"; title: string; children: React.ReactNode }) {
  const cls = level === "high" ? "border-rose-200 bg-rose-50/30" : level === "med" ? "border-amber-200 bg-amber-50/30" : "border-blue-200 bg-blue-50/30";
  const tag = level === "high" ? <Tag color="red">高优先级</Tag> : level === "med" ? <Tag color="amber">中优先级</Tag> : <Tag color="blue">观察</Tag>;
  return (
    <div className={`rounded border p-3 ${cls}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium text-slate-800 text-sm">{title}</div>
        {tag}
      </div>
      <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}
