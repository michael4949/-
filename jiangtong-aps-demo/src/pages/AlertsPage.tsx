// §19 异常预警中心完整页
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import AlertKPIBar from '../components/alerts/AlertKPIBar';
import AlertEventTable from '../components/alerts/AlertEventTable';
import AlertCauseExplainModal from '../components/ai/AlertCauseExplainModal';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import type { AlertCauseExplainOutput } from '../mock/agentResponses.sprint6';
import type { AlertEvent } from '../mock/alerts';

export default function AlertsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<AlertCauseExplainOutput | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);

  async function onExplain(event: AlertEvent) {
    setModalOpen(true);
    setModalLoading(true);
    setOutput(null);
    const { output: r } = await mockAIInvoke({
      agentId: 'alert.cause-explainer',
      input: { alertId: event.id },
    });
    const o = r as AlertCauseExplainOutput;
    setOutput(o);
    setModalLoading(false);
    pushMessage({
      id: 'sys-alert-cause-' + Date.now(),
      role: 'assistant',
      content: `**${o.alertId} 预警归因报告**\n\n类型：${o.alertType}\n${o.causes.length} 个根因因素 · 过去 30 天同类预警 ${o.recurrence.past30days} 次。详见 Modal。`,
      attachments: [{ type: 'alert-cause', data: o }],
      timestamp: new Date(),
    });
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide flex items-center gap-2">
          <AlertTriangle size={20} className="text-warn" />
          异常预警中心
        </h1>
        <span className="text-[12.5px] text-ink-faint ml-2">实时事件 · 每分钟刷新</span>
      </div>

      <AICapabilityBanner
        capabilities={[
          { num: 19, name: '预警归因 Agent',   touchpoint: '每条预警右侧 ✨ AI 归因 按钮 → 根因报告 Modal',         type: 'modal' },
          { num: 20, name: '预警噪声过滤',     touchpoint: '系统设置 → AI 治理 Tab → 预警优化建议子页',             type: 'observer' },
        ]}
      />

      <AlertKPIBar />

      <div className="flex-1 min-h-0">
        <AlertEventTable onExplain={onExplain} />
      </div>

      <AlertCauseExplainModal
        open={modalOpen}
        loading={modalLoading}
        output={output}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
