import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IntelligenceReport, SentimentData } from '../types';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar } from 'recharts';

interface TrendChartProps {
  report: IntelligenceReport;
}

const TrendChart: React.FC<TrendChartProps> = ({ report }) => {
  return (
    <section className="py-12 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trend Area Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
              <h3 className="text-lg font-bold text-slate-900">趋势走向分析</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={report.trendData}>
                <defs>
                  <linearGradient id="colorHeat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="热度" stroke="#06b6d4" fill="url(#colorHeat)" strokeWidth={2} />
                <Area type="monotone" dataKey="正面" stroke="#22c55e" fill="url(#colorPositive)" strokeWidth={2} />
                <Area type="monotone" dataKey="负面" stroke="#ef4444" fill="url(#colorNegative)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Breakdown Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-cyan-600" />
              <h3 className="text-lg font-bold text-slate-900">多维情感分析</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.sentimentBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={80}
                  tick={{ fill: '#64748b', fontSize: 11 }}
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
                <Legend />
                <Bar dataKey="positive" name="正面" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="neutral" name="中性" stackId="a" fill="#94a3b8" />
                <Bar dataKey="negative" name="负面" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrendChart;
