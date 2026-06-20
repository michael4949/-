// §17 库存锁定完整页
//   顶部：AI 提示（#13 锁定健康度监测）→ KPI → 左锁定记录 + 右冲突看板
//   AI 触点：#13 Insight Card · #12 抢料冲突调解
//   ★ v2.2.3：#13 改交互式 — Insight 主操作触发批量释放超期锁定
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
import { useInventoryOpsStore } from '../store/useInventoryOpsStore';
import { LOCK_RECORDS } from '../mock/lockRecords';
import type { ConflictMediationOutput } from '../mock/agentResponses.sprint5';
import type { InventoryConflict } from '../mock/inventoryConflicts';
import { HEALTH_MONITOR } from '../mock/agentResponses.sprint5';

export default function InventoryLockPage() {
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<ConflictMediationOutput | null>(null);
  const resolvedConflicts = useInventoryOpsStore((s) => s.resolvedConflicts);
  const applyMediation = useInventoryOpsStore((s) => s.applyMediation);
  const batchUnlockOverdue = useInventoryOpsStore((s) => s.batchUnlockOverdue);
  const batchRefreshFlapping = useInventoryOpsStore((s) => s.batchRefreshFlapping);
  const unlockedOverdueIds = useInventoryOpsStore((s) => s.unlockedOverdueIds);
  const refreshedFlappingIds = useInventoryOpsStore((s) => s.refreshedFlappingIds);
  const pushMessage = useCopilotStore((s) => s.pushMessage);

  // ★ v2.2.3 批量释放超期锁定（#13 Insight 主操作）
  function onBatchUnlockOverdue() {
    const overdueIds = LOCK_RECORDS.filter((r) => r.health === 'overdue' && !unlockedOverdueIds.has(r.id)).map((r) => r.id);
    if (overdueIds.length === 0) return;
    batchUnlockOverdue(overdueIds);
    pushMessage({
      id: 'sys-health-' + Date.now(),
      role: 'assistant',
      content: `**Agent #13 锁定健康度监测 · 批量释放完成**\n\n已为 ${overdueIds.length} 笔超期未开工锁定执行 AI 自动释放：\n• 锁定记录状态由「超期」→「AI 已释放」\n• KPI「超期未开工」-${overdueIds.length}、「锁定笔数」相应下降\n• 释放的物料返回主原料库可用池\n• 关联工单将进入下次排产计算`,
      timestamp: new Date(),
    });
  }
  function onBatchRefreshFlapping() {
    const flappingIds = LOCK_RECORDS.filter((r) => r.health === 'flapping' && !refreshedFlappingIds.has(r.id)).map((r) => r.id);
    if (flappingIds.length === 0) return;
    batchRefreshFlapping(flappingIds);
    pushMessage({
      id: 'sys-flapping-' + Date.now(),
      role: 'assistant',
      content: `**Agent #13 · 批量稳定完成**\n\n已为 ${flappingIds.length} 笔频繁解锁记录应用 AI 锁定锚定策略：\n• 记录状态由「频繁解锁」→「AI 已稳定」\n• 后续 7 天内禁止该工单再次解锁，避免反复抢料`,
      timestamp: new Date(),
    });
  }

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
    // ★ v2.2.2：真正系统联动 — 冲突卡消失 + 锁定记录被影响行打标 + KPI "冲突待处理" -1
    const releasedWoIds = output.allocations.filter((a) => a.altBatch).map((a) => a.workOrderId);
    applyMediation(output.conflictId, releasedWoIds);
    pushMessage({
      id: 'sys-conflict-' + Date.now(),
      role: 'assistant',
      content: `**抢料冲突已调解** · ${output.conflictId} · ${output.conflict.materialSpec}\n\n${output.allocations.length} 张工单已分配，${output.allocations.filter((a) => a.altBatch).length} 张切换替代批次。\n\n👉 系统响应：① 冲突看板中该卡变绿打勾；② 锁定记录中相关 WO 状态改为「已调解」；③ 顶部 KPI「冲突待处理」-1`,
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

      {/* ★ v2.2.3 #13 锁定健康度监测 改交互式 — 双按钮 Insight Card */}
      {!insightDismissed && (() => {
        const overdueRemain = HEALTH_MONITOR.groups[0].count - unlockedOverdueIds.size;
        const flappingRemain = HEALTH_MONITOR.groups[1].count - refreshedFlappingIds.size;
        if (overdueRemain <= 0 && flappingRemain <= 0) {
          return (
            <AIInsightCard
              insight={{
                id: 'inv-health-done',
                severity: 'success',
                agentSource: 'inventory.health-monitor',
                message: `✅ 全部锁定健康问题已 AI 处置完毕（释放 ${unlockedOverdueIds.size} + 稳定 ${refreshedFlappingIds.size}）· Agent #13 进入待机`,
                primaryAction: { label: '关闭', route: '/inventory-lock' },
                dismissible: true,
                generatedAt: new Date(),
              }}
              onDismiss={() => setInsightDismissed(true)}
            />
          );
        }
        return (
          <div className="card-base border-l-4 border-ai bg-ai-bg/40 p-3 flex items-center gap-3">
            <div className="flex-1 text-[12.5px] text-ink leading-relaxed">
              🤖 {HEALTH_MONITOR.summary}（{overdueRemain} 笔超期未开工 / {flappingRemain} 笔频繁解锁重锁） · {HEALTH_MONITOR.runAt}
            </div>
            {overdueRemain > 0 && (
              <button onClick={onBatchUnlockOverdue} className="btn btn-ai btn-sm">
                ✨ 批量释放 {overdueRemain} 笔超期
              </button>
            )}
            {flappingRemain > 0 && (
              <button onClick={onBatchRefreshFlapping} className="btn btn-ai btn-sm">
                ✨ 批量稳定 {flappingRemain} 笔频繁解锁
              </button>
            )}
            <button onClick={() => setInsightDismissed(true)} className="text-ink-faint hover:text-ai w-6 h-6 flex items-center justify-center" title="忽略">✕</button>
          </div>
        );
      })()}

      <InventoryKPIBar />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3 flex-1 min-h-0">
        <LockRecordList />
        <ConflictBoard onMediate={onMediate} resolvedIds={[...resolvedConflicts]} />
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
