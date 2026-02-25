import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { IntelligenceReport } from '../types';
import { Shield, AlertTriangle } from 'lucide-react';

interface ThreatRadarProps {
  report: IntelligenceReport;
}

const levelColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const levelLabels: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

const ThreatRadar: React.FC<ThreatRadarProps> = ({ report }) => {
  const radarData = report.radarAnalysis.dimensions.map(d => ({
    dimension: d.dimension,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-2 mb-8">
          <Shield className="w-5 h-5 text-cyan-600" />
          <h2 className="text-xl font-bold text-slate-900">多维态势雷达</h2>
          <span className="text-sm text-slate-400 ml-2">{report.radarAnalysis.description}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Radar Chart */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{report.radarAnalysis.title}</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Radar
                  name="态势评分"
                  dataKey="score"
                  stroke="#0891b2"
                  fill="#06b6d4"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Threat List */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-slate-700">已识别威胁/风险</h3>
            </div>
            <div className="space-y-3">
              {report.threats.map((threat, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${levelColors[threat.level]}`}>
                        {levelLabels[threat.level]}
                      </span>
                      <span className="font-semibold text-slate-800 text-sm">{threat.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{threat.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          threat.score >= 80 ? 'bg-red-500' : threat.score >= 60 ? 'bg-orange-500' : threat.score >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${threat.score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right">{threat.score}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{threat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ThreatRadar;
