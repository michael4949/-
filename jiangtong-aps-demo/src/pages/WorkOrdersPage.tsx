// §15 工单管理完整页
//   顶部：AI 提示（#9 异常工单识别）→ KPI 条 → 列表表格 → 抽屉
//   AI 触点：#9 Insight Card · #8 BOM 生成（仅样品工单）
import { useState } from 'react';
import { ClipboardList, Sparkles, FileDown, Upload, Plus, X } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import BOMSuggestionModal from '../components/ai/BOMSuggestionModal';
import WorkOrderKPIBar from '../components/workorder/WorkOrderKPIBar';
import WorkOrderListTable from '../components/workorder/WorkOrderListTable';
import WorkOrderDrawer from '../components/workorder/WorkOrderDrawer';
import { ANOMALY_STATS } from '../mock/workOrderAnomalies';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import type { BOMSuggestionOutput } from '../mock/agentResponses.sprint4';

export default function WorkOrdersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightAnomalies, setHighlight] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomOutput, setBomOutput] = useState<BOMSuggestionOutput | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const setCopOpen = useCopilotStore((s) => s.setOpen);

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
    pushMessage({
      id: 'sys-bom-' + Date.now(),
      role: 'assistant',
      content: `**BOM 草稿已保存** · ${bomOutput.workOrderId} · ${bomOutput.productName}\n\n共 ${bomOutput.bom.length} 项物料，${bomOutput.route.length} 步工艺。建议工艺部门复核后下达正式 BOM。`,
      attachments: [{ type: 'bom-draft', data: bomOutput }],
      timestamp: new Date(),
    });
    setBomOpen(false);
    setCopOpen(true);
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
          { num: 8, name: '样品工单 BOM 生成', touchpoint: '选中样品工单 → 右侧抽屉 ✨ AI 推荐 BOM 按钮',     type: 'modal' },
          { num: 9, name: '异常工单识别',     touchpoint: '顶部紫色提示卡 + 表格异常行高亮 + 标记列⚠图标', type: 'observer' },
        ]}
      />

      {/* AI 提示 · #9 异常工单识别 */}
      {!insightDismissed && (
        <AIInsightCard
          insight={{
            id: 'wo-anomaly',
            severity: 'warning',
            agentSource: 'workorder.anomaly-detector',
            message: `🤖 检测到 ${ANOMALY_STATS.total} 张工单状态异常（${ANOMALY_STATS.frequentChange} 张频繁变更超 5 次 / ${ANOMALY_STATS.longIdle} 张超 30 天未开工）`,
            primaryAction: { label: '查看', route: '/work-orders' },
            dismissible: true,
            generatedAt: new Date(),
          }}
          onDismiss={() => setInsightDismissed(true)}
          onAction={() => setHighlight(true)}
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
    </div>
  );
}
