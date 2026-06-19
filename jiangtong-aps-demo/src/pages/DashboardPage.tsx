// §8 工作台首页（Sprint 1 完整实现）
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import KPICard from '../components/kpi/KPICard';
import TodoList from '../components/dashboard/TodoList';
import AlertList from '../components/dashboard/AlertList';
import WorkshopStatus from '../components/dashboard/WorkshopStatus';
import { DASHBOARD_DATA } from '../mock/dashboardData';
import { useNavigate } from 'react-router-dom';
import { useCostStore } from '../store/useCostStore';

export default function DashboardPage() {
  const d = DASHBOARD_DATA;
  const nav = useNavigate();
  const setPendingDiag = useCostStore((s) => s.setPendingDiagnoseWoId);
  const [insights, setInsights] = useState(d.aiInsights);

  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      {/* 问候 + 上下文 */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-wide">
          早上好，{d.user.name}
        </h1>
        <span className="text-[12.5px] text-ink-faint">
          {d.context.date} {d.context.weekday} {d.context.time} · {d.context.workshop}在产 {d.context.activeMachines} 台机
        </span>
      </div>

      {/* 🤖 今日 AI 给您准备好了 */}
      <section className="card-base p-4">
        <div className="flex items-center mb-2.5">
          <span className="text-[12px] font-semibold tracking-wider text-ai uppercase">
            🤖 今日 AI 给您准备好了
          </span>
          <button className="ml-auto btn-ghost btn btn-sm" onClick={() => nav('/alerts')}>
            全部 <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-2.5">
          {insights.map((ins) => (
            <AIInsightCard
              key={ins.id}
              insight={ins}
              onDismiss={(id) => setInsights((arr) => arr.filter((x) => x.id !== id))}
              onAction={(i) => {
                if (i.agentSource === 'cost.loss-diagnostic') {
                  setPendingDiag('WO-2024-1234');
                }
                nav(i.primaryAction.route);
              }}
            />
          ))}
          {insights.length === 0 && (
            <div className="text-center text-[12.5px] text-ink-faint py-6">今日 AI 提示已全部处理 ✓</div>
          )}
        </div>
      </section>

      {/* KPI */}
      <section>
        <div className="text-[12px] font-semibold tracking-wider text-ink-dim uppercase mb-2.5">
          今日核心指标
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {d.kpis.map((k) => <KPICard key={k.id} kpi={k} />)}
        </div>
      </section>

      {/* 待办 + 异常预警 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-base p-4">
          <div className="flex items-center mb-3">
            <span className="text-[13px] font-semibold">待办</span>
            <span className="ml-auto text-[11px] text-ink-faint">点击进入对应模块</span>
          </div>
          <TodoList items={d.todos} />
        </div>
        <div className="card-base p-4">
          <div className="flex items-center mb-3">
            <span className="text-[13px] font-semibold">异常预警 · 24h</span>
            <span className="ml-auto text-[11px] text-ink-faint">实时</span>
          </div>
          <AlertList items={d.alerts} />
        </div>
      </section>

      {/* 产线实时状态 */}
      <section className="card-base p-4">
        <div className="flex items-center mb-3">
          <span className="text-[13px] font-semibold">产线实时状态</span>
          <span className="ml-auto text-[11px] text-ink-faint">在产数 / 总台数</span>
        </div>
        <WorkshopStatus items={d.workshopStatus} />
      </section>
    </div>
  );
}
