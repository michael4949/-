// §18 产能负荷分析完整页
//   顶部：AI 提示（#14 瓶颈预测）→ KPI → 热力图 → 瓶颈识别列表
//   AI 触点：#14 Insight Card · #15 缓解方案生成
import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import MitigationGeneratorModal from '../components/ai/MitigationGeneratorModal';
import CapacityKPIBar from '../components/capacity/CapacityKPIBar';
import CapacityHeatmap from '../components/capacity/CapacityHeatmap';
import BottleneckList from '../components/capacity/BottleneckList';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import type { MitigationGeneratorOutput, MitigationPlan } from '../mock/agentResponses.sprint5';
import type { Bottleneck } from '../mock/capacityData';
import { BOTTLENECK_PREDICTOR } from '../mock/agentResponses.sprint5';

export default function CapacityPage() {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<MitigationGeneratorOutput | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);

  async function onGenerate(bn: Bottleneck) {
    setModalOpen(true);
    setModalLoading(true);
    setOutput(null);
    setAppliedId(null);
    const { output: r } = await mockAIInvoke({
      agentId: 'capacity.mitigation-generator',
      input: { resourceId: bn.resourceId },
    });
    setOutput(r as MitigationGeneratorOutput);
    setModalLoading(false);
  }

  function onApply(plan: MitigationPlan) {
    if (!output) return;
    setAppliedId(plan.id);
    pushMessage({
      id: 'sys-mitigation-' + Date.now(),
      role: 'assistant',
      content: `**缓解方案已应用** · ${output.resourceName} · ${plan.label}\n\n关键变化：${plan.metrics.map((m) => `${m.key} ${m.before} → ${m.after}`).join('；')}。代价：${plan.cost}`,
      attachments: [{ type: 'mitigation-plan', data: output }],
      timestamp: new Date(),
    });
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
