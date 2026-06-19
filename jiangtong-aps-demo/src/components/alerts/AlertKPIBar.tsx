// 异常预警中心顶部 KPI 条
import { ALERT_KPI } from '../../mock/alerts';

export default function AlertKPIBar() {
  const items = [
    { label: '未处理',      value: ALERT_KPI.unhandled,    tone: 'ink' as const },
    { label: '紧急',        value: ALERT_KPI.urgent,       tone: 'danger' as const },
    { label: '重要',        value: ALERT_KPI.important,    tone: 'warn' as const },
    { label: '提示',        value: ALERT_KPI.info,         tone: 'info' as const },
    { label: '本周已处理',  value: ALERT_KPI.resolvedWeek, tone: 'ok' as const },
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
        </div>
      ))}
    </div>
  );
}
