import React from 'react';
import { IntelligenceReport } from '../types';
import { Clock, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface TimelinePanelProps {
  report: IntelligenceReport;
}

const importanceConfig: Record<string, { icon: React.FC<{ className?: string }>; dot: string; bg: string }> = {
  critical: {
    icon: AlertCircle,
    dot: 'bg-red-500 ring-red-100',
    bg: 'border-l-red-500',
  },
  high: {
    icon: AlertTriangle,
    dot: 'bg-orange-500 ring-orange-100',
    bg: 'border-l-orange-500',
  },
  medium: {
    icon: Info,
    dot: 'bg-blue-500 ring-blue-100',
    bg: 'border-l-blue-500',
  },
  low: {
    icon: CheckCircle,
    dot: 'bg-green-500 ring-green-100',
    bg: 'border-l-green-500',
  },
};

const TimelinePanel: React.FC<TimelinePanelProps> = ({ report }) => {
  return (
    <section className="py-12 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-2 mb-8">
          <Clock className="w-5 h-5 text-cyan-600" />
          <h2 className="text-xl font-bold text-slate-900">关键事件时间线</h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {report.timeline.map((event, idx) => {
                const config = importanceConfig[event.importance] || importanceConfig.medium;
                const Icon = config.icon;

                return (
                  <div key={idx} className="relative flex gap-5">
                    {/* Dot */}
                    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.dot} ring-4 flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>

                    {/* Content Card */}
                    <div className={`flex-1 bg-white rounded-xl border border-slate-200/80 border-l-4 ${config.bg} p-5 hover:shadow-md transition-shadow`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-800 text-sm">{event.title}</h4>
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-4">{event.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{event.description}</p>
                      <p className="text-xs text-slate-400 mt-2">来源: {event.source}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelinePanel;
