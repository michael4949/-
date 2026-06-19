// §10 成本核算页 Sprint 3 完整实现
//   Sprint 6 嵌入：#23 cost.cost-predictor ✨ AI 成本预测（工具栏按钮）
import { useEffect, useState } from 'react';
import { COST_DATA } from '../mock/costData';
import { useCostStore } from '../store/useCostStore';
import { useExplainStore } from '../store/useExplainStore';
import { useCopilotStore } from '../store/useCopilotStore';
import { mockAIInvoke } from '../utils/mockApi';
import CostKPICards from '../components/cost/CostKPICards';
import CopperFlowDiagram from '../components/cost/CopperFlowDiagram';
import WorkOrderLedger from '../components/cost/WorkOrderLedger';
import LossDiagnosticReport from '../components/ai/LossDiagnosticReport';
import AIButton from '../components/ai/AIButton';
import CostPredictorModal from '../components/ai/CostPredictorModal';
import { Send, Download, RefreshCw } from 'lucide-react';
import type { LossDiagnosticOutput, WorkOrderCostRow } from '../types/cost';
import type { CostPredictorOutput } from '../mock/agentResponses.sprint6';

export default function CostPage() {
  const d = COST_DATA;
  const showLoading = useExplainStore((s) => s.showLoading);
  const show = useExplainStore((s) => s.show);
  const injectQuestion = useCopilotStore((s) => s.injectQuestion);
  const pendingDiagId = useCostStore((s) => s.pendingDiagnoseWoId);
  const setPendingDiag = useCostStore((s) => s.setPendingDiagnoseWoId);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [predictOpen, setPredictOpen] = useState(false);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictOutput, setPredictOutput] = useState<CostPredictorOutput | null>(null);

  async function onPredictCost(woId?: string) {
    setPredictOpen(true);
    setPredictLoading(true);
    setPredictOutput(null);
    const target = woId || d.workOrderLedger[0]?.workOrderId || 'WO-2026-1234';
    const { output } = await mockAIInvoke({
      agentId: 'cost.cost-predictor',
      input: { workOrderId: target },
    });
    setPredictOutput(output as CostPredictorOutput);
    setPredictLoading(false);
  }

  // §10.2 场景 4 起点：从工作台 Insight Card "WO-1234 损耗超均值" 跳过来 → 自动启动诊断
  useEffect(() => {
    if (pendingDiagId) {
      const row = d.workOrderLedger.find((r) => r.workOrderId === pendingDiagId)
                ?? d.workOrderLedger[0];
      setHighlightId(row.workOrderId);
      setTimeout(() => onDiagnose(row), 400);
      setPendingDiag(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDiagId]);

  async function onDiagnose(row: WorkOrderCostRow) {
    setHighlightId(row.workOrderId);
    showLoading('损耗异常诊断 · 多源数据归集与分析中…');
    const { output } = await mockAIInvoke({
      agentId: 'cost.loss-diagnostic',
      input: { workOrderId: row.workOrderId },
    });
    const r = output as LossDiagnosticOutput;
    // 用真实工单数据覆盖产品名/客户（如果不是演示标的 WO-2024-1234）
    if (row.workOrderId !== 'WO-2024-1234') {
      r.customer = row.customer;
      r.productName = row.productName;
      r.actualLoss = row.lossRate;
      r.baseline = row.baselineLossRate;
      r.deviation = +(row.lossRate - row.baselineLossRate).toFixed(2);
    }
    show({
      title: `${r.workOrder} · 损耗诊断`,
      content: (
        <LossDiagnosticReport
          data={r}
          onAskCopilot={(q) => injectQuestion(q)}
        />
      ),
    });
  }

  return (
    <div className="p-5 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-wide">💰 成本核算</h1>
        <span className="text-ink-faint">·</span>
        <span className="text-[12.5px] text-ink-dim">{d.period.label}（{d.period.from} ~ {d.period.to}）</span>
        <span className="text-ink-faint">·</span>
        <span className="text-[12.5px] text-ink-dim">全部车间</span>
        <div className="ml-auto flex items-center gap-2">
          <AIButton label="AI 成本预测" onClick={() => onPredictCost()} size="sm" />
          <button className="btn"><RefreshCw size={13} />刷新</button>
          <button className="btn btn-primary"><Send size={13} />推送至鼎捷 ERP</button>
          <button className="btn"><Download size={13} />导出报表</button>
        </div>
      </div>

      <section>
        <div className="text-[12px] font-semibold tracking-wider text-ink-dim uppercase mb-2.5">
          本月核心指标
        </div>
        <CostKPICards kpi={d.kpi} />
      </section>

      <section>
        <CopperFlowDiagram data={d.copperFlow} />
      </section>

      <section>
        <WorkOrderLedger rows={d.workOrderLedger} onDiagnose={onDiagnose} highlightId={highlightId} />
      </section>

      {/* ★ Sprint 6 #23 成本预测 Modal */}
      <CostPredictorModal
        open={predictOpen}
        loading={predictLoading}
        output={predictOutput}
        onClose={() => setPredictOpen(false)}
      />
    </div>
  );
}
