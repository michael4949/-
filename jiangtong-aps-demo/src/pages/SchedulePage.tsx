// §9 智能排产工作台（Sprint 1：甘特 + 待排池 + 详情 + 算法面板，无 AI）
import { useScheduleStore } from '../store/useScheduleStore';
import { WORKSHOP_LABEL, type Workshop, type GanttView } from '../types/schedule';
import GanttChart from '../components/gantt/GanttChart';
import PendingList from '../components/workorder/PendingList';
import WorkOrderDetail from '../components/workorder/WorkOrderDetail';
import AlgorithmPanel from '../components/schedule/AlgorithmPanel';
import { RefreshCw, Play, Send, BarChart3, Download } from 'lucide-react';
import { useState } from 'react';

const WORKSHOP_OPTIONS: Workshop[] = ['enameling', 'drawing', 'stranding'];
const VIEW_OPTIONS: { v: GanttView; label: string }[] = [
  { v: 'week', label: '周视图' },
  { v: 'day',  label: '日视图' },
];

export default function SchedulePage() {
  const workshop = useScheduleStore((s) => s.workshop);
  const setWorkshop = useScheduleStore((s) => s.setWorkshop);
  const view = useScheduleStore((s) => s.view);
  const setView = useScheduleStore((s) => s.setView);
  const [openMenu, setOpenMenu] = useState<'workshop' | 'view' | null>(null);

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide">📅 智能排产</h1>
        <span className="text-ink-faint">·</span>

        {/* 车间下拉 */}
        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === 'workshop' ? null : 'workshop')}
                  className="btn">
            {WORKSHOP_LABEL[workshop]} ▼
          </button>
          {openMenu === 'workshop' && (
            <div className="absolute left-0 mt-1 w-32 bg-card border border-line rounded-md shadow-card py-1 z-30">
              {WORKSHOP_OPTIONS.map((w) => (
                <button key={w}
                        onClick={() => { setWorkshop(w); setOpenMenu(null); }}
                        className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg
                                   ${w === workshop ? 'text-brand font-semibold' : ''}`}>
                  {WORKSHOP_LABEL[w]}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[12.5px] text-ink-faint">2026-07-15 ~ 07-22</span>

        {/* 视图切换 */}
        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
                  className="btn">
            {VIEW_OPTIONS.find((v) => v.v === view)?.label} ▼
          </button>
          {openMenu === 'view' && (
            <div className="absolute left-0 mt-1 w-28 bg-card border border-line rounded-md shadow-card py-1 z-30">
              {VIEW_OPTIONS.map((v) => (
                <button key={v.v}
                        onClick={() => { setView(v.v); setOpenMenu(null); }}
                        className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg
                                    ${v.v === view ? 'text-brand font-semibold' : ''}`}>
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-ink-faint">·</span>
        <span className="text-[12.5px] text-ink-dim">设备维度</span>

        {/* 右侧按钮组 */}
        <div className="ml-auto flex items-center gap-2">
          <button className="btn"><RefreshCw size={13} />重新排产</button>
          <button className="btn"><Play size={13} />排产模拟</button>
          <button className="btn btn-primary"><Send size={13} />下发计划</button>
          <button className="btn"><BarChart3 size={13} />KPI 对比</button>
          <button className="btn"><Download size={13} />导出</button>
        </div>
      </div>

      {/* 主区：左 待排池 / 中 甘特 / 右 详情 */}
      <div className="flex-1 grid grid-cols-[240px_1fr_300px] gap-3 min-h-0">
        <PendingList />
        <div className="min-w-0 overflow-hidden">
          <GanttChart />
        </div>
        <WorkOrderDetail />
      </div>

      {/* 算法决策面板 */}
      <div className="flex-none">
        <AlgorithmPanel />
      </div>
    </div>
  );
}
