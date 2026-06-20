// §16 物料齐套完整页
//   顶部：AI 提示（#11 齐套风险预测）→ KPI → 左缺料 + 右批次 → 齐套时间轴
//   AI 触点：#11 Insight Card · #10 缺料根因分析
//   ★ v2.2.3：#11 从观察式 → 交互式
//     · Insight Card 主操作改"AI 一键批量准备 N 张高风险" → 一键解决所有高风险
//     · 批量准备 progress 实时刷新缺料数、齐套率
import { useState } from 'react';
import { Boxes, Wand2, Loader2 } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import ShortageRootCauseModal from '../components/ai/ShortageRootCauseModal';
import MaterialKPIBar from '../components/material/MaterialKPIBar';
import ShortageList from '../components/material/ShortageList';
import MaterialBatchPanel from '../components/material/MaterialBatchPanel';
import KittingTimeline from '../components/material/KittingTimeline';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import { useMaterialOpsStore } from '../store/useMaterialOpsStore';
import type { ShortageRootCauseOutput } from '../mock/agentResponses.sprint4';
import type { ShortageItem } from '../mock/shortageList';
import { SHORTAGE_PREDICTOR } from '../mock/agentResponses.sprint4';
import { SHORTAGE_LIST } from '../mock/shortageList';

export default function MaterialCheckPage() {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<ShortageRootCauseOutput | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const setCopOpen = useCopilotStore((s) => s.setOpen);
  const prepareItem = useMaterialOpsStore((s) => s.prepareItem);
  const preparedIds = useMaterialOpsStore((s) => s.preparedIds);
  /** ★ v2.2.3：批量准备状态 — 用 progress 让用户看到 AI 逐张处理 */
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  function onPrepare(item: ShortageItem) {
    prepareItem(item.workOrderId);   // ★ 系统状态变：左侧卡变绿打勾 + 顶部 KPI 齐套率上升 + 缺料数下降
    pushMessage({
      id: 'sys-shortage-prepared-' + Date.now(),
      role: 'assistant',
      content: `**${item.workOrderId} · ${item.customer}** 已应用 AI 一键准备：\n\n• 自动协调替代批次（${item.missingMaterials[0].spec}）\n• 触发紧急采购单 PO-2026-${Math.floor(Math.random() * 900) + 100}\n• 该工单从风险列表移除，齐套率 KPI +1pp`,
      timestamp: new Date(),
    });
  }

  /** ★ v2.2.3 高风险工单批量 AI 准备 — Insight Card 主操作触发 */
  async function onBatchPrepareHighRisk() {
    // 取所有 high 风险且未准备的工单
    const highRiskItems = SHORTAGE_LIST.filter((s) => s.severity === 'high' && !preparedIds.has(s.workOrderId));
    if (highRiskItems.length === 0) return;
    setBatchProgress({ current: 0, total: highRiskItems.length });
    // 逐张处理，每张 400ms（模拟 AI 协调）
    for (let i = 0; i < highRiskItems.length; i++) {
      await new Promise((r) => setTimeout(r, 400));
      prepareItem(highRiskItems[i].workOrderId);
      setBatchProgress({ current: i + 1, total: highRiskItems.length });
    }
    setTimeout(() => setBatchProgress(null), 1500);
    pushMessage({
      id: 'sys-batch-prepare-' + Date.now(),
      role: 'assistant',
      content: `**Agent #11 齐套风险预测 · 批量处置完成**\n\n已为 ${highRiskItems.length} 张高风险工单逐一应用 AI 准备方案：\n• 自动匹配替代批次 / 触发紧急采购 / 调整安全库存参数\n• 齐套率 KPI 由 87.3% 上升至 ${(87.3 + highRiskItems.length).toFixed(1)}%（实时刷新）\n• 风险工单数从 ${SHORTAGE_LIST.length} → ${SHORTAGE_LIST.length - highRiskItems.length - preparedIds.size}`,
      timestamp: new Date(),
    });
  }

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

      {/* ★ v2.2.3 #11 齐套风险预测 改为交互式 — Insight 主操作触发批量准备 */}
      {!insightDismissed && (() => {
        const highCount = SHORTAGE_LIST.filter((s) => s.severity === 'high' && !preparedIds.has(s.workOrderId)).length;
        const totalHigh = SHORTAGE_LIST.filter((s) => s.severity === 'high').length;
        if (highCount === 0 && preparedIds.size >= totalHigh) {
          return (
            <AIInsightCard
              insight={{
                id: 'mat-predict-done',
                severity: 'success',
                agentSource: 'material.shortage-predictor',
                message: `✅ ${totalHigh} 张高风险工单已全部 AI 准备完毕 · 齐套率上升 ${preparedIds.size.toFixed(1)}pp · Agent #11 进入待机`,
                primaryAction: { label: '关闭', route: '/material-check' },
                dismissible: true,
                generatedAt: new Date(),
              }}
              onDismiss={() => setInsightDismissed(true)}
            />
          );
        }
        return (
          <AIInsightCard
            insight={{
              id: 'mat-predict',
              severity: 'warning',
              agentSource: 'material.shortage-predictor',
              message: batchProgress
                ? `🤖 AI 批量准备进行中… (${batchProgress.current}/${batchProgress.total}) · 实时为高风险工单匹配替代批次 / 触发紧急采购`
                : `🤖 ${SHORTAGE_PREDICTOR.summary}（${highCount} 张高风险待处理） · 一键交给 AI 协调批次/采购`,
              primaryAction: { label: batchProgress ? '处理中…' : `✨ AI 一键准备 ${highCount} 张高风险`, route: '/material-check' },
              dismissible: true,
              generatedAt: new Date(),
            }}
            onDismiss={() => setInsightDismissed(true)}
            onAction={onBatchPrepareHighRisk}
          />
        );
      })()}

      {/* KPI */}
      <MaterialKPIBar />

      {/* 左右并排 */}
      <div id="shortage-anchor" className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 flex-1 min-h-0">
        <ShortageList onAnalyze={onAnalyze} onPrepare={onPrepare} />
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
