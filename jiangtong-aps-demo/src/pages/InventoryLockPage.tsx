// §17 库存锁定完整页
//   顶部：AI 提示（#13 锁定健康度监测）→ KPI → 左锁定记录 + 右冲突看板
//   AI 触点：#13 Insight Card · #12 抢料冲突调解
import { useState } from 'react';
import { Lock } from 'lucide-react';
import AIInsightCard from '../components/ai/AIInsightCard';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import ConflictMediatorModal from '../components/ai/ConflictMediatorModal';
import InventoryKPIBar from '../components/inventory/InventoryKPIBar';
import LockRecordList from '../components/inventory/LockRecordList';
import ConflictBoard from '../components/inventory/ConflictBoard';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import type { ConflictMediationOutput } from '../mock/agentResponses.sprint5';
import type { InventoryConflict } from '../mock/inventoryConflicts';
import { HEALTH_MONITOR } from '../mock/agentResponses.sprint5';

export default function InventoryLockPage() {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<ConflictMediationOutput | null>(null);
  const [resolved, setResolved] = useState<string[]>([]);
  const pushMessage = useCopilotStore((s) => s.pushMessage);

  async function onMediate(c: InventoryConflict) {
    setModalOpen(true);
    setModalLoading(true);
    setOutput(null);
    const { output: r } = await mockAIInvoke({
      agentId: 'inventory.conflict-mediator',
      input: { conflictId: c.id },
    });
    setOutput(r as ConflictMediationOutput);
    setModalLoading(false);
  }

  function onApply() {
    if (!output) return;
    setResolved((arr) => arr.includes(output.conflictId) ? arr : [...arr, output.conflictId]);
    pushMessage({
      id: 'sys-conflict-' + Date.now(),
      role: 'assistant',
      content: `**抢料冲突已调解** · ${output.conflictId} · ${output.conflict.materialSpec}\n\n${output.allocations.length} 张工单已分配，${output.allocations.filter((a) => a.altBatch).length} 张切换替代批次。${output.benefit}`,
      attachments: [{ type: 'conflict-mediation', data: output }],
      timestamp: new Date(),
    });
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide flex items-center gap-2">
          <Lock size={20} className="text-brand" />
          库存锁定
        </h1>
        <span className="text-[12.5px] text-ink-faint ml-2">物料类型：全部 · 状态：全部</span>
      </div>

      <AICapabilityBanner
        capabilities={[
          { num: 12, name: '抢料冲突调解',     touchpoint: '右侧每条冲突卡 ✨ AI 调解 按钮 → 多目标分配 Modal',  type: 'modal' },
          { num: 13, name: '锁定健康度监测',   touchpoint: '顶部紫色提示卡 + 左侧锁定记录状态列分类（超期/频繁）', type: 'observer' },
        ]}
      />

      {/* AI 提示 · #13 锁定健康度监测 */}
      {!insightDismissed && (
        <AIInsightCard
          insight={{
            id: 'inv-health',
            severity: 'warning',
            agentSource: 'inventory.health-monitor',
            message: `🤖 ${HEALTH_MONITOR.summary}（${HEALTH_MONITOR.groups[0].count} 笔超期未开工 / ${HEALTH_MONITOR.groups[1].count} 笔频繁解锁重锁） · ${HEALTH_MONITOR.runAt}`,
            primaryAction: { label: '查看明细', route: '/inventory-lock' },
            dismissible: true,
            generatedAt: new Date(),
          }}
          onDismiss={() => setInsightDismissed(true)}
        />
      )}

      <InventoryKPIBar />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3 flex-1 min-h-0">
        <LockRecordList />
        <ConflictBoard onMediate={onMediate} resolvedIds={resolved} />
      </div>

      <ConflictMediatorModal
        open={modalOpen}
        loading={modalLoading}
        output={output}
        onClose={() => setModalOpen(false)}
        onApply={onApply}
      />
    </div>
  );
}
