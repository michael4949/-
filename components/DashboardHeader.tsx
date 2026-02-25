import React from 'react';
import { IntelligenceReport } from '../types';
import { Shield, Activity, Users, Clock, BarChart3, AlertTriangle } from 'lucide-react';

interface DashboardHeaderProps {
  report: IntelligenceReport;
}

const threatColorMap: Record<string, string> = {
  '严重': 'from-red-500 to-red-600',
  '高': 'from-orange-500 to-orange-600',
  '中': 'from-yellow-500 to-yellow-600',
  '低': 'from-green-500 to-green-600',
};

const threatBgMap: Record<string, string> = {
  '严重': 'bg-red-50 text-red-700 border-red-200',
  '高': 'bg-orange-50 text-orange-700 border-orange-200',
  '中': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  '低': 'bg-green-50 text-green-700 border-green-200',
};

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ report }) => {
  const stats = report.overviewStats;
  const sentimentLabel = stats.sentimentScore > 30 ? '正面' : stats.sentimentScore > -30 ? '中性' : '负面';
  const sentimentColor = stats.sentimentScore > 30 ? 'text-green-600' : stats.sentimentScore > -30 ? 'text-yellow-600' : 'text-red-600';

  const statCards = [
    {
      icon: BarChart3,
      label: '信息源',
      value: stats.totalSources.toString(),
      sub: '采集来源',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: AlertTriangle,
      label: '威胁等级',
      value: stats.threatLevel,
      sub: '综合评估',
      color: threatColorMap[stats.threatLevel] || 'from-slate-500 to-slate-600',
    },
    {
      icon: Activity,
      label: '舆情指数',
      value: `${stats.sentimentScore > 0 ? '+' : ''}${stats.sentimentScore}`,
      sub: sentimentLabel,
      color: stats.sentimentScore > 30 ? 'from-green-500 to-green-600' : stats.sentimentScore > -30 ? 'from-yellow-500 to-yellow-600' : 'from-red-500 to-red-600',
    },
    {
      icon: Users,
      label: '关键实体',
      value: stats.keyEntities.toString(),
      sub: '已识别',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Clock,
      label: '时间跨度',
      value: stats.timeSpan,
      sub: '覆盖范围',
      color: 'from-cyan-500 to-cyan-600',
    },
  ];

  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl" />
        </div>
        <div className="container mx-auto px-6 py-12 relative">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4 ${threatBgMap[stats.threatLevel] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                <Shield className="w-3.5 h-3.5" />
                威胁等级: {stats.threatLevel}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{report.reportTitle}</h1>
              <p className="text-slate-400 text-base max-w-2xl leading-relaxed">{report.executiveSummary}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>生成时间</p>
              <p className="text-slate-300 font-medium">{report.generatedAt}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 bg-gradient-to-br ${card.color} rounded-lg flex items-center justify-center`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-slate-400">{card.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-slate-500">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardHeader;
