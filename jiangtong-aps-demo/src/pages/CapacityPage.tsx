// §18 产能负荷分析完整页
//   顶部：AI 提示（#14 瓶颈预测）→ KPI → 热力图 → 瓶颈识别列表
//   AI 触点：#14 Insight Card · #15 缓解方案生成
import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
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

export default function CapacityPage() {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<MitigationGeneratorOutput | null>(null);
  const [currentBottleneckId, setCurrentBottleneckId] = useState<string | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const applyMitigation = useCapacityOpsStore((s) => s.applyMitigation);
  const appliedMitigations = useCapacityOpsStore((s) => s.appliedMitigations);
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

      {/* AI 提示 · #14 瓶颈预测 */}
      {!insightDismissed && (
        <AIInsightCard
          insight={{
            id: 'cap-bottleneck',
            severity: 'warning',
            agentSource: 'capacity.bottleneck-predictor',
            message: `🤖 ${BOTTLENECK_PREDICTOR.summary}（最严重：${BOTTLENECK_PREDICTOR.bottlenecks[0].resourceName}，连续 ${BOTTLENECK_PREDICTOR.bottlenecks[0].durationDays} 天） · ${BOTTLENECK_PREDICTOR.runAt}`,
            primaryAction: { label: '查看瓶颈', route: '/capacity' },
            dismissible: true,
            generatedAt: new Date(),
          }}
          onDismiss={() => setInsightDismissed(true)}
        />
      )}

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
