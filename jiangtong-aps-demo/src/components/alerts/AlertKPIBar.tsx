// 异常预警中心顶部 KPI 条
//   ★ v2.2.2：KPI 跟随 AI 噪声过滤实时变化
import { ALERT_EVENTS, ALERT_KPI } from '../../mock/alerts';
import { useAlertOpsStore } from '../../store/useAlertOpsStore';

export default function AlertKPIBar() {
  const downgradedKeys = useAlertOpsStore((s) => s.downgradedKeys);
  const dismissedIds = useAlertOpsStore((s) => s.dismissedIds);

  // 重算实时 KPI（应用过滤后）
  const filtered = ALERT_EVENTS.filter((a) => !dismissedIds.has(a.id) && !downgradedKeys.has(`${a.type}:${a.level}`));
  const unhandled = filtered.filter((a) => a.status === 'unhandled');
  const urgent = unhandled.filter((a) => a.level === 'urgent').length;
  const important = unhandled.filter((a) => a.level === 'important').length;
  const info = unhandled.filter((a) => a.level === 'info').length;
  const noiseHandled = ALERT_KPI.unhandled - unhandled.length;

  const items = [
    { label: '未处理',      value: unhandled.length,        tone: 'ink'    as const, delta: noiseHandled > 0 ? `↓ ${noiseHandled}` : '' },
    { label: '紧急',        value: urgent,                  tone: 'danger' as const, delta: '' },
    { label: '重要',        value: important,               tone: 'warn'   as const, delta: '' },
    { label: '提示',        value: info,                    tone: 'info'   as const, delta: '' },
    { label: '本周已处理',  value: ALERT_KPI.resolvedWeek + noiseHandled, tone: 'ok' as const, delta: noiseHandled > 0 ? `↑ ${noiseHandled}` : '' },
  ];
  const toneCls = {
    ink: 'text-ink',
    danger: 'text-danger',
    warn: 'text-warn',
    info: 'text-info',
    ok: 'text-ok',
  };
  return (
    <div className="card-base p-3 grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-2">
          <span className="text-[11.5px] text-ink-faint">{it.label}</span>
          <span className={`ml-auto text-[18px] font-bold tabular-nums ${toneCls[it.tone]}`}>{it.value}</span>
          {it.delta && <span className="text-[10.5px] text-ok font-semibold tabular-nums">{it.delta}</span>}
        </div>
      ))}
    </div>
  );
}
