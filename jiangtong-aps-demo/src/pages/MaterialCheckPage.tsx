// §16 物料齐套完整页
//   顶部：AI 提示（#11 齐套风险预测）→ KPI → 左缺料 + 右批次 → 齐套时间轴
//   AI 触点：#11 Insight Card · #10 缺料根因分析
import { useState } from 'react';
import { Boxes } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import ShortageRootCauseModal from '../components/ai/ShortageRootCauseModal';
import MaterialKPIBar from '../components/material/MaterialKPIBar';
import ShortageList from '../components/material/ShortageList';
import MaterialBatchPanel from '../components/material/MaterialBatchPanel';
import KittingTimeline from '../components/material/KittingTimeline';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import type { ShortageRootCauseOutput } from '../mock/agentResponses.sprint4';
import type { ShortageItem } from '../mock/shortageList';
import { SHORTAGE_PREDICTOR } from '../mock/agentResponses.sprint4';

export default function MaterialCheckPage() {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<ShortageRootCauseOutput | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const setCopOpen = useCopilotStore((s) => s.setOpen);

  async function onAnalyze(item: ShortageItem) {
    setModalOpen(true);
    setModalLoading(true);
    setOutput(null);
    const { output: r } = await mockAIInvoke({
      agentId: 'material.shortage-root-cause',
      input: { workOrderId: item.workOrderId },
    });
    setOutput(r as ShortageRootCauseOutput);
    setModalLoading(false);
  }

  function onAskAI() {
    if (!output) return;
    pushMessage({
      id: 'sys-shortage-' + Date.now(),
      role: 'assistant',
      content: `**缺料根因报告** · ${output.workOrderId} · ${output.customer}\n\n缺料：${output.missingMaterial}\n\n${output.factors.length} 个根因因素 · 下游 ${output.downstreamImpact.length} 张工单受影响。可在此追问"延期影响哪些下游工单？"或"如何调整安全库存？"`,
      attachments: [{ type: 'shortage-root-cause', data: output }],
      timestamp: new Date(),
    });
    setModalOpen(false);
    setCopOpen(true);
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      {/* 顶部 */}
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide flex items-center gap-2">
          <Boxes size={20} className="text-brand" />
          物料齐套
        </h1>
        <span className="text-[12.5px] text-ink-faint ml-2">时间窗：未来 7 天 · 2026-07-15 ~ 07-21</span>
      </div>

      <AICapabilityBanner
        capabilities={[
          { num: 10, name: '缺料根因分析',   touchpoint: '左侧每张缺料工单卡片下方 ✨ AI 根因分析 按钮 → 报告 Modal + Copilot 追问', type: 'modal' },
          { num: 11, name: '齐套风险预测',   touchpoint: '顶部紫色提示卡 + 齐套时间轴热度颜色（红/黄/绿）',                            type: 'observer' },
        ]}
      />

      {/* AI 提示 · #11 齐套风险预测 */}
      {!insightDismissed && (
        <AIInsightCard
          insight={{
            id: 'mat-predict',
            severity: 'warning',
            agentSource: 'material.shortage-predictor',
            message: `🤖 ${SHORTAGE_PREDICTOR.summary}（其中 ${SHORTAGE_PREDICTOR.risks.filter((r) => r.riskLevel === 'high').length} 张高风险） · ${SHORTAGE_PREDICTOR.runAt}`,
            primaryAction: { label: '查看清单', route: '/material-check' },
            dismissible: true,
            generatedAt: new Date(),
          }}
          onDismiss={() => setInsightDismissed(true)}
          onAction={() => { /* 滚动至缺料清单 */ document.getElementById('shortage-anchor')?.scrollIntoView({ behavior: 'smooth' }); }}
        />
      )}

      {/* KPI */}
      <MaterialKPIBar />

      {/* 左右并排 */}
      <div id="shortage-anchor" className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 flex-1 min-h-0">
        <ShortageList onAnalyze={onAnalyze} />
        <MaterialBatchPanel />
      </div>

      {/* 齐套时间轴 */}
      <KittingTimeline />

      {/* 根因 Modal */}
      <ShortageRootCauseModal
        open={modalOpen}
        loading={modalLoading}
        output={output}
        onClose={() => setModalOpen(false)}
        onAskAI={onAskAI}
      />
    </div>
  );
}
