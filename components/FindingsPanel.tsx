import React from 'react';
import { IntelligenceReport } from '../types';
import { Lightbulb, AlertTriangle, TrendingUp, Eye, Zap, ArrowRight } from 'lucide-react';

interface FindingsPanelProps {
  report: IntelligenceReport;
}

const categoryConfig: Record<string, { icon: React.FC<{ className?: string }>; color: string; label: string; bg: string }> = {
  threat: {
    icon: AlertTriangle,
    color: 'text-red-600',
    label: '威胁',
    bg: 'bg-red-50 border-red-200',
  },
  opportunity: {
    icon: Zap,
    color: 'text-green-600',
    label: '机遇',
    bg: 'bg-green-50 border-green-200',
  },
  trend: {
    icon: TrendingUp,
    color: 'text-blue-600',
    label: '趋势',
    bg: 'bg-blue-50 border-blue-200',
  },
  insight: {
    icon: Eye,
    color: 'text-purple-600',
    label: '洞察',
    bg: 'bg-purple-50 border-purple-200',
  },
};

const priorityBadge: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const priorityLabel: Record<string, string> = {
  critical: '紧急',
  high: '重要',
  medium: '一般',
  low: '参考',
};

const urgencyConfig: Record<string, { label: string; color: string }> = {
  immediate: { label: '立即执行', color: 'bg-red-500' },
  short_term: { label: '短期', color: 'bg-orange-500' },
  medium_term: { label: '中期', color: 'bg-blue-500' },
  long_term: { label: '长期', color: 'bg-slate-500' },
};

const FindingsPanel: React.FC<FindingsPanelProps> = ({ report }) => {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-6">
        {/* Key Findings */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-8">
            <Lightbulb className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-bold text-slate-900">核心情报发现</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.keyFindings.map((finding, idx) => {
              const config = categoryConfig[finding.category] || categoryConfig.insight;
              const Icon = config.icon;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-5 ${config.bg} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${priorityBadge[finding.priority]}`}>
                      {priorityLabel[finding.priority]}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">{finding.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{finding.content}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-8">
            <ArrowRight className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-bold text-slate-900">行动建议</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.recommendations.map((rec, idx) => {
              const urg = urgencyConfig[rec.urgency] || urgencyConfig.medium_term;

              return (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${urg.color}`} />
                    <span className="text-xs text-slate-400 font-medium">{urg.label}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-500">{rec.category}</span>
                  </div>
                  <h4 className="font-bold text-base mb-3">{rec.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{rec.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FindingsPanel;
