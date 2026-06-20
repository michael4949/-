// §18 产能负荷分析完整页
//   顶部：AI 提示（#14 瓶颈预测）→ KPI → 热力图 → 瓶颈识别列表
//   AI 触点：#14 Insight Card · #15 缓解方案生成
import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import ActionableInsightCard from '../components/ai/ActionableInsightCard';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import MitigationGeneratorModal from '../components/ai/MitigationGeneratorModal';
import CapacityKPIBar from '../components/capacity/CapacityKPIBar';
import CapacityHeatmap from '../components/capacity/CapacityHeatmap';
import BottleneckList from '../components/capacity/BottleneckList';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import { useCapacityOpsStore } from '../store/useCapacityOpsStore';
import type { MitigationGeneratorOutput, MitigationPlan } from '../mock/agentResponses.sprint5';
import type { Bottleneck } from '../mock/capacityData';
import { BOTTLENECK_PREDICTOR } from '../mock/agentResponses.sprint5';
import { BOTTLENECKS } from '../mock/capacityData';

export default function CapacityPage() {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<MitigationGeneratorOutput | null>(null);
  const [currentBottleneckId, setCurrentBottleneckId] = useState<string | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const applyMitigation = useCapacityOpsStore((s) => s.applyMitigation);
  const appliedMitigations = useCapacityOpsStore((s) => s.appliedMitigations);
  const resolvedBottlenecks = useCapacityOpsStore((s) => s.resolvedBottlenecks);
  const batchApplyAllBottlenecks = useCapacityOpsStore((s) => s.batchApplyAllBottlenecks);
  const appliedId = currentBottleneckId ? appliedMitigations.get(currentBottleneckId) ?? null : null;

  async function onGenerate(bn: Bottleneck) {
    setModalOpen(true);
    setModalLoading(true);
    setOutput(null);
    setCurrentBottleneckId(bn.resourceId);
    const { output: r } = await mockAIInvoke({
      agentId: 'capacity.mitigation-generator',
      input: { resourceId: bn.resourceId },
    });
    setOutput(r as MitigationGeneratorOutput);
    setModalLoading(false);
  }

  function onApply(plan: MitigationPlan) {
    if (!output || !currentBottleneckId) return;
    // ★ v2.2.2：真正系统联动 — 瓶颈列表中该行变绿"已解除" + 热力图相应行所有日期 utilization 降 18pp + KPI -1
    applyMitigation(currentBottleneckId, plan.id);
    pushMessage({
      id: 'sys-mitigation-' + Date.now(),
      role: 'assistant',
      content: `**缓解方案已应用** · ${output.resourceName} · ${plan.label}\n\n关键变化：${plan.metrics.map((m) => `${m.key} ${m.before} → ${m.after}`).join('；')}。\n\n👉 系统响应：① 瓶颈列表该行变绿「✓ 方案 ${plan.id} 已应用」；② 热力图 ${output.resourceName} 行所有日期 utilization 降低 18pp；③ KPI「瓶颈数」-1`,
      attachments: [{ type: 'mitigation-plan', data: output }],
      timestamp: new Date(),
    });
    // 自动关闭 Modal
    setTimeout(() => setModalOpen(false), 1200);
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide flex items-center gap-2">
          <BarChart3 size={20} className="text-brand" />
          产能负荷分析
        </h1>
        <span className="text-[12.5px] text-ink-faint ml-2">时间窗：未来 14 天 · 2026-07-15 ~ 07-28</span>
      </div>

      <AICapabilityBanner
        capabilities={[
          { num: 14, name: '瓶颈预测',         touchpoint: '顶部紫色提示卡 + 瓶颈识别列表行（按严重度排序）',         type: 'observer' },
          { num: 15, name: '缓解建议生成',     touchpoint: '瓶颈列表每行 ✨ 生成缓解方案 按钮 → 3 方案对比 Modal',  type: 'modal' },
        ]}
      />

      {/* ★ v2.2.4 #14 瓶颈预测 改交互式 — 一键应用全部 AI 推荐方案 */}
      {!insightDismissed && (() => {
        const remain = BOTTLENECKS.filter((b) => !resolvedBottlenecks.has(b.resourceId));
        if (remain.length === 0) {
          return (
            <AIInsightCard
              insight={{
                id: 'cap-done',
                severity: 'success',
                agentSource: 'capacity.bottleneck-predictor',
                message: `✅ 全部 ${BOTTLENECKS.length} 处瓶颈已应用 AI 缓解方案 · 热力图全面降级 · Agent #14 进入待机`,
                primaryAction: { label: '关闭', route: '/capacity' },
                dismissible: true,
                generatedAt: new Date(),
              }}
              onDismiss={() => setInsightDismissed(true)}
            />
          );
        }
        return (
          <ActionableInsightCard
            id="cap-bottleneck"
            agentNumber={14}
            agentName="瓶颈预测"
            message={`⚡ ${BOTTLENECK_PREDICTOR.summary}（${remain.map((b) => b.resourceName).join(' + ')}），AI 已对各瓶颈生成推荐方案 A`}
            primaryAction={{
              label: `一键应用方案 A · 解除 ${remain.length} 处瓶颈`,
              apply: async () => {
                await new Promise((r) => setTimeout(r, 1000));
                batchApplyAllBottlenecks(remain.map((b) => b.resourceId));
                return `✓ 已对 ${remain.length} 处瓶颈应用 AI 推荐方案 A · 热力图相应行 utilization 全部 -18pp · 影响工单数下降 67%`;
              },
            }}
            secondaryAction={{ label: '查看明细', route: '/capacity' }}
            onDismiss={() => setInsightDismissed(true)}
          />
        );
      })()}

      <CapacityKPIBar />

      <div className="flex-1 min-h-0">
        <CapacityHeatmap />
      </div>

      <div className="flex-none">
        <BottleneckList onGenerate={onGenerate} />
      </div>

      <MitigationGeneratorModal
        open={modalOpen}
        loading={modalLoading}
        output={output}
        onClose={() => setModalOpen(false)}
        onApply={onApply}
        appliedId={appliedId}
      />
    </div>
  );
}
