// §8 工作台首页（Sprint 1 完整实现）
//   ★ v2.2.4：所有 6 个 Insight Card 全部改为「可交互」——「一键应用」直接改变系统状态
//             点击后 ops store 写入对应改动，Insight 变绿"✓ 已应用 N 项"
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import ActionableInsightCard from '../components/ai/ActionableInsightCard';
import KPICard from '../components/kpi/KPICard';
import TodoList from '../components/dashboard/TodoList';
import AlertList from '../components/dashboard/AlertList';
import WorkshopStatus from '../components/dashboard/WorkshopStatus';
import { DASHBOARD_DATA } from '../mock/dashboardData';
import { useNavigate } from 'react-router-dom';
import { useCostStore } from '../store/useCostStore';
import { useScheduleStore } from '../store/useScheduleStore';
import { useWorkOrderOpsStore } from '../store/useWorkOrderOpsStore';
import { useMaterialOpsStore } from '../store/useMaterialOpsStore';
import { useCapacityOpsStore } from '../store/useCapacityOpsStore';
import { ANOMALY_OPT } from '../mock/agentResponses';
import { WORK_ORDER_ANOMALIES } from '../mock/workOrderAnomalies';
import { SHORTAGE_LIST } from '../mock/shortageList';
import { BOTTLENECKS } from '../mock/capacityData';

export default function DashboardPage() {
  const d = DASHBOARD_DATA;
  const nav = useNavigate();
  const setPendingDiag = useCostStore((s) => s.setPendingDiagnoseWoId);
  const applyAnomalyMerge = useScheduleStore((s) => s.applyAnomalyMerge);
  const applyMatrixCorrection = useScheduleStore((s) => s.applyMatrixCorrection);
  const batchMarkAnalyzed = useWorkOrderOpsStore((s) => s.batchMarkAnalyzed);
  const prepareItem = useMaterialOpsStore((s) => s.prepareItem);
  const batchApplyAllBottlenecks = useCapacityOpsStore((s) => s.batchApplyAllBottlenecks);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismiss = (id: string) => setDismissedIds((s) => { const n = new Set(s); n.add(id); return n; });

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
            🤖 今日 AI 给您准备好了 · 点「一键应用」立即生效
          </span>
          <button className="ml-auto btn-ghost btn btn-sm" onClick={() => nav('/alerts')}>
            全部 <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-2.5">
          {/* #3 异常排产识别 · 一键合并 */}
          {!dismissedIds.has('ins-anomaly') && (
            <ActionableInsightCard
              id="ins-anomaly"
              agentNumber={3}
              agentName="异常排产识别"
              message="✨ 漆包车间 #3 闲置 30%，可优化。AI 已识别 3 张同规格 QA-0.3mm 工单可合并连续生产，预计节省 2.5 小时换型"
              primaryAction={{
                label: '一键合并',
                apply: async () => {
                  await new Promise((r) => setTimeout(r, 800));
                  applyAnomalyMerge(ANOMALY_OPT);
                  return `✓ 已合并 3 张同规格工单至漆包机 #3 · 换型损失 12.6% → 10.4% · 利用率 70% → 88%`;
                },
              }}
              secondaryAction={{ label: '查看排产', route: '/schedule' }}
              onDismiss={() => dismiss('ins-anomaly')}
            />
          )}

          {/* #9 工单异常识别 · 一键批量处置 */}
          {!dismissedIds.has('ins-wo-anomaly') && (
            <ActionableInsightCard
              id="ins-wo-anomaly"
              agentNumber={9}
              agentName="异常工单识别"
              message={`🤖 检测到 ${WORK_ORDER_ANOMALIES.length} 张工单状态异常（8 张频繁变更 / 4 张长期未开工），AI 建议批量进入处置流程`}
              primaryAction={{
                label: `一键批量处置 ${WORK_ORDER_ANOMALIES.length} 张`,
                apply: async () => {
                  await new Promise((r) => setTimeout(r, 800));
                  batchMarkAnalyzed(WORK_ORDER_ANOMALIES.map((a) => a.workOrderId));
                  return `✓ 已批量进入处置流程：${WORK_ORDER_ANOMALIES.length} 张异常工单全部生成 AI 处置建议 · 待计划员复核`;
                },
              }}
              secondaryAction={{ label: '查看工单', route: '/work-orders' }}
              onDismiss={() => dismiss('ins-wo-anomaly')}
            />
          )}

          {/* #11 齐套风险预测 · 一键准备 */}
          {!dismissedIds.has('ins-shortage-predict') && (() => {
            const highRisk = SHORTAGE_LIST.filter((s) => s.severity === 'high');
            return (
              <ActionableInsightCard
                id="ins-shortage-predict"
                agentNumber={11}
                agentName="齐套风险预测"
                message={`📦 未来 3 天预计 ${highRisk.length} 张高风险工单存在齐套风险，AI 可自动协调替代批次/触发紧急采购`}
                primaryAction={{
                  label: `一键准备 ${highRisk.length} 张`,
                  apply: async () => {
                    for (const s of highRisk) {
                      await new Promise((r) => setTimeout(r, 200));
                      prepareItem(s.workOrderId);
                    }
                    return `✓ 已批量协调 ${highRisk.length} 张高风险工单的物料：自动匹配替代批次 + 触发紧急采购 PO · 齐套率 +${highRisk.length}pp`;
                  },
                }}
                secondaryAction={{ label: '查看清单', route: '/material-check' }}
                onDismiss={() => dismiss('ins-shortage-predict')}
              />
            );
          })()}

          {/* #6 矩阵历史复盘 · 一键应用矩阵 */}
          {!dismissedIds.has('ins-matrix-history') && (
            <ActionableInsightCard
              id="ins-matrix-history"
              agentNumber={6}
              agentName="矩阵历史复盘"
              message="🔁 本周发现 5 处换型时间偏差超 20%（QA→QZ 90→112 分钟等），AI 建议立即修正换型矩阵"
              primaryAction={{
                label: '一键应用建议矩阵',
                apply: async () => {
                  const r = await applyMatrixCorrection();
                  return `✓ 矩阵已修正 5 处偏差 · 触发 ${r.corrected} 张工单微调 · 换型损失 ${r.coLossBefore}% → ${r.coLossAfter}% · OTD +0.4pp`;
                },
              }}
              secondaryAction={{ label: '查看排产', route: '/schedule' }}
              onDismiss={() => dismiss('ins-matrix-history')}
            />
          )}

          {/* #14 瓶颈预测 · 一键应用全部缓解方案 */}
          {!dismissedIds.has('ins-bottleneck') && (
            <ActionableInsightCard
              id="ins-bottleneck"
              agentNumber={14}
              agentName="瓶颈预测"
              message={`⚡ 未来 7 天预测 ${BOTTLENECKS.length} 处瓶颈（漆包机 #8 + 中拉机 #12，影响共 ${BOTTLENECKS.reduce((s, b) => s + b.affectedOrders, 0)} 张工单），AI 推荐方案 A`}
              primaryAction={{
                label: `一键应用方案 A 缓解全部 ${BOTTLENECKS.length} 处`,
                apply: async () => {
                  await new Promise((r) => setTimeout(r, 1000));
                  batchApplyAllBottlenecks(BOTTLENECKS.map((b) => b.resourceId));
                  return `✓ 已对 ${BOTTLENECKS.length} 处瓶颈应用 AI 推荐方案 A · 热力图自动降级 -18pp · 影响工单数下降 67%`;
                },
              }}
              secondaryAction={{ label: '查看负荷', route: '/capacity' }}
              onDismiss={() => dismiss('ins-bottleneck')}
            />
          )}

          {/* #21 损耗诊断 · 启动诊断（保留原行为，已交互） */}
          {!dismissedIds.has('ins-loss') && (
            <AIInsightCard
              insight={{
                id: 'ins-loss',
                severity: 'warning',
                agentSource: 'cost.loss-diagnostic',
                message: '💰  工单 WO-2024-1234 实际损耗超 30 天均值 0.3%，AI 已准备好诊断报告',
                primaryAction: { label: '启动 AI 诊断', route: '/cost' },
                dismissible: true,
                generatedAt: new Date(),
              }}
              onDismiss={() => dismiss('ins-loss')}
              onAction={() => {
                setPendingDiag('WO-2024-1234');
                nav('/cost');
              }}
            />
          )}

          {dismissedIds.size === 6 && (
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
