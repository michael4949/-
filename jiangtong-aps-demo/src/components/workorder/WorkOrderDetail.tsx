// 右侧详情：选中工单后展示客户/产品/数量/交期/资源/AI 推荐区（占位）
import { useScheduleStore } from '../../store/useScheduleStore';
import { fmtDate, fmtDateTime } from '../../utils/format';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../types/workOrder';
import { RESOURCES } from '../../mock/productLines';
import { Sparkles } from 'lucide-react';

export default function WorkOrderDetail() {
  const selectedId = useScheduleStore((s) => s.selectedId);
  const pending = useScheduleStore((s) => s.pending);
  const scheduled = useScheduleStore((s) => s.scheduled);
  const unschedule = useScheduleStore((s) => s.unschedule);

  const wo = scheduled.find((w) => w.id === selectedId) ?? pending.find((w) => w.id === selectedId);
  const res = wo?.scheduledResourceId ? RESOURCES.find((r) => r.id === wo.scheduledResourceId) : undefined;

  if (!wo) {
    return (
      <div className="bg-card border border-line rounded-xl p-6 text-center text-[12.5px] text-ink-faint h-full flex items-center justify-center">
        从甘特图或待排池<br />选择工单查看详情
      </div>
    );
  }

  const prioColor = wo.priority === 'urgent' ? 'text-danger' : wo.priority === 'important' ? 'text-warn' : 'text-info';

  return (
    <div className="bg-card border border-line rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-panel2">
        <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">选中工单</div>
        <div className="text-[14px] font-bold font-mono mt-0.5">{wo.id}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[12.5px]">
        <Field label="客户" value={wo.customer} />
        <Field label="产品" value={wo.productName} />
        <Field label="数量" value={`${wo.quantity} kg`} />
        <Field label="交期" value={fmtDate(wo.dueDate)} />
        <Field label="优先级" value={<span className={`font-semibold ${prioColor}`}>{PRIORITY_LABEL[wo.priority]}</span>} />
        <Field label="状态"   value={STATUS_LABEL[wo.status]} />
        {wo.scheduledStart && (
          <>
            <hr className="border-line" />
            <Field label="排到" value={res?.name ?? wo.scheduledResourceId} />
            <Field label="计划开工" value={fmtDateTime(wo.scheduledStart)} />
            <Field label="计划完工" value={wo.scheduledEnd ? fmtDateTime(wo.scheduledEnd) : '-'} />
          </>
        )}
      </div>
      <div className="border-t border-line p-3 bg-panel2 space-y-2">
        <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">AI 推荐</div>
        <button
          disabled
          className="btn btn-ai w-full opacity-60 cursor-not-allowed"
          title="将在 Sprint 2 启用（schedule.scheme-explainer）"
        >
          <Sparkles size={12} />
          解释为何这样排
        </button>
        {wo.scheduledResourceId && (
          <button
            onClick={() => unschedule(wo.id)}
            className="btn w-full text-ink-dim"
          >
            ↺ 退回待排池
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="w-16 flex-none text-[11.5px] text-ink-faint">{label}</div>
      <div className="flex-1 text-ink font-medium">{value}</div>
    </div>
  );
}
