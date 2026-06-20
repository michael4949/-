// §15 工单管理完整页
//   顶部：AI 提示（#9 异常工单识别）→ KPI 条 → 列表表格 → 抽屉
//   AI 触点：#9 Insight Card · #8 BOM 生成（仅样品工单）
import { useState } from 'react';
import { ClipboardList, Sparkles, FileDown, Upload, Plus, X } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import ActionableInsightCard from '../components/ai/ActionableInsightCard';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import BOMSuggestionModal from '../components/ai/BOMSuggestionModal';
import AnomalyAnalysisModal from '../components/ai/AnomalyAnalysisModal';
import WorkOrderKPIBar from '../components/workorder/WorkOrderKPIBar';
import WorkOrderListTable from '../components/workorder/WorkOrderListTable';
import WorkOrderDrawer from '../components/workorder/WorkOrderDrawer';
import { ANOMALY_STATS, WORK_ORDER_ANOMALIES } from '../mock/workOrderAnomalies';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import { useWorkOrderOpsStore } from '../store/useWorkOrderOpsStore';
import type { BOMSuggestionOutput } from '../mock/agentResponses.sprint4';

export default function WorkOrdersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightAnomalies, setHighlight] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomOutput, setBomOutput] = useState<BOMSuggestionOutput | null>(null);
  const [anomalyOpen, setAnomalyOpen] = useState(false);
  const [anomalyWoId, setAnomalyWoId] = useState<string | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const setCopOpen = useCopilotStore((s) => s.setOpen);
  const markAnalyzed = useWorkOrderOpsStore((s) => s.markAnalyzed);
  const markedAnalyzed = useWorkOrderOpsStore((s) => s.markedAnalyzed);
  const setBOMGenerated = useWorkOrderOpsStore((s) => s.setBOMGenerated);
  const batchMarkAnalyzed = useWorkOrderOpsStore((s) => s.batchMarkAnalyzed);
  // 异常 KPI 已减去已处置数
  const remainAnomalies = Math.max(0, ANOMALY_STATS.total - markedAnalyzed.size);

  async function onRequestBOM(woId: string) {
    setBomOpen(true);
    setBomLoading(true);
    setBomOutput(null);
    const { output } = await mockAIInvoke({
      agentId: 'workorder.bom-generator',
      input: { workOrderId: woId },
    });
    setBomOutput(output as BOMSuggestionOutput);
    setBomLoading(false);
  }

  function onSaveBOM() {
    if (!bomOutput) return;
    setBOMGenerated(bomOutput.workOrderId);  // ★ v2.2.2：列表中该工单状态变化（标记✓BOM）
    pushMessage({
      id: 'sys-bom-' + Date.now(),
      role: 'assistant',
      content: `**BOM 草稿已保存** · ${bomOutput.workOrderId} · ${bomOutput.productName}\n\n共 ${bomOutput.bom.length} 项物料，${bomOutput.route.length} 步工艺。建议工艺部门复核后下达正式 BOM。\n\n👉 列表中该样品工单已标记「✓BOM」，"生成 BOM"按钮已隐藏。`,
      attachments: [{ type: 'bom-draft', data: bomOutput }],
      timestamp: new Date(),
    });
    setBomOpen(false);
    setCopOpen(true);
  }

  function onAnalyzeAnomaly(woId: string) {
    setAnomalyWoId(woId);
    setAnomalyOpen(true);
  }
  function onApplyAnalysis(woId: string) {
    markAnalyzed(woId);                        // ★ v2.2.2：标记已处置 → 异常 KPI -1 + 行内标签从「异常」变成「✓已处置」
    setAnomalyOpen(false);
    pushMessage({
      id: 'sys-anomaly-' + Date.now(),
      role: 'assistant',
      content: `**${woId} 已标记为已处置** · 异常工单 KPI 由 ${ANOMALY_STATS.total - markedAnalyzed.size} → ${ANOMALY_STATS.total - markedAnalyzed.size - 1}\n\n该工单从异常列表移除，行内标记由「⚠ 异常」变为「✓ 已处置」。`,
      timestamp: new Date(),
    });
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      {/* 顶部标题与操作 */}
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide flex items-center gap-2">
          <ClipboardList size={20} className="text-brand" />
          工单管理
        </h1>
        {highlightAnomalies && (
          <span className="ai-chip">
            <Sparkles size={11} /> 仅看异常 ({ANOMALY_STATS.total})
            <button onClick={() => setHighlight(false)} className="ml-1 hover:text-ink"><X size={10} /></button>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button className="btn"><Plus size={13} />新建工单</button>
          <button className="btn"><Sparkles size={13} className="text-ai" />新建样品工单</button>
          <button className="btn"><Upload size={13} />导入</button>
          <button className="btn"><FileDown size={13} />导出</button>
        </div>
      </div>

      {/* ★ v2.2.1 AI 能力 banner（不可关闭，告诉用户本页接入了哪些 Agent） */}
      <AICapabilityBanner
        capabilities={[
          { num: 8, name: '样品工单 BOM 生成', touchpoint: '选中样品工单 → 右侧抽屉 ✨ AI 推荐 BOM 按钮',                  type: 'modal' },
          { num: 9, name: '异常工单识别',     touchpoint: '顶部 Insight ✨ 一键批量处置 + 行末 ✨ AI 分析（应用后变 ✓ 已处置）', type: 'generator' },
        ]}
      />

      {/* ★ v2.2.4 #9 异常工单识别 改交互式 — 一键批量处置 */}
      {!insightDismissed && remainAnomalies > 0 && (
        <ActionableInsightCard
          id="wo-anomaly"
          agentNumber={9}
          agentName="异常工单识别"
          message={`🤖 检测到 ${remainAnomalies} 张工单状态异常（已处置 ${markedAnalyzed.size}/${ANOMALY_STATS.total}），AI 可一键批量进入处置流程`}
          primaryAction={{
            label: `一键批量处置 ${remainAnomalies} 张`,
            apply: async () => {
              await new Promise((r) => setTimeout(r, 800));
              const remainIds = WORK_ORDER_ANOMALIES
                .filter((a) => !markedAnalyzed.has(a.workOrderId))
                .map((a) => a.workOrderId);
              batchMarkAnalyzed(remainIds);
              return `✓ 已对 ${remainIds.length} 张异常工单完成 AI 批量分析 · 行内标"⚠ 异常"全部变为"✓ 已处置" · 异常 KPI 实时清零`;
            },
          }}
          secondaryAction={{ label: '查看明细', route: '/work-orders' }}
          onDismiss={() => setInsightDismissed(true)}
        />
      )}
      {!insightDismissed && remainAnomalies === 0 && (
        <AIInsightCard
          insight={{
            id: 'wo-anomaly-clean',
            severity: 'success',
            agentSource: 'workorder.anomaly-detector',
            message: `✅ 全部 ${ANOMALY_STATS.total} 张异常工单已处置完毕 · 异常工单识别 Agent 进入待机`,
            primaryAction: { label: '关闭', route: '/work-orders' },
            dismissible: true,
            generatedAt: new Date(),
          }}
          onDismiss={() => setInsightDismissed(true)}
        />
      )}

      {/* KPI 条 */}
      <WorkOrderKPIBar />

      {/* 列表 */}
      <div className="flex-1 min-h-0">
        <WorkOrderListTable
          highlightAnomalies={highlightAnomalies}
          onSelect={setSelectedId}
          selectedId={selectedId}
          onAnalyze={onAnalyzeAnomaly}
          onRequestBOM={onRequestBOM}
        />
      </div>

      {/* 详情抽屉 */}
      <WorkOrderDrawer
        workOrderId={selectedId}
        onClose={() => setSelectedId(null)}
        onRequestBOM={onRequestBOM}
      />

      {/* BOM Modal */}
      <BOMSuggestionModal
        open={bomOpen}
        loading={bomLoading}
        output={bomOutput}
        onClose={() => setBomOpen(false)}
        onSave={onSaveBOM}
      />

      {/* ★ v2.2.2 异常分析 Modal */}
      <AnomalyAnalysisModal
        open={anomalyOpen}
        workOrderId={anomalyWoId}
        onClose={() => setAnomalyOpen(false)}
        onApply={onApplyAnalysis}
      />
    </div>
  );
}
