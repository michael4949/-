import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { ReportData } from '../types';

interface ChartsSectionProps {
  data: ReportData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-lg">
        <p className="font-bold text-corporate-900">{label}</p>
        {payload.map((p: any, idx: number) => (
          <p key={idx} className="text-sm" style={{ color: p.color }}>
            {p.name === 'impact' ? '业务价值' : p.name === 'feasibility' ? '技术可行性' : p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ChartsSection: React.FC<ChartsSectionProps> = ({ data }) => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        
        {/* Maturity Model - Radar Chart */}
        <div className="flex flex-col lg:flex-row items-center gap-12 mb-24">
          <div className="lg:w-1/3">
            <h3 className="text-2xl font-serif font-bold text-corporate-900 mb-4 flex items-center gap-3">
              <span className="bg-corporate-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              {data.maturityModel.title}
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {data.maturityModel.description}
            </p>
            <div className="space-y-4">
              {data.maturityModel.data.map((item, idx) => (
                <div key={idx} className="border-l-2 border-slate-200 pl-4">
                  <span className="font-bold text-slate-800 block">{item.dimension}</span>
                  <span className="text-sm text-slate-500">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-2/3 w-full h-[400px] bg-slate-50 rounded-2xl p-6 border border-slate-100">
             <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.maturityModel.data}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#475569', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar
                  name="当前成熟度"
                  dataKey="score"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fill="#0f172a"
                  fillOpacity={0.6}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="w-full h-px bg-slate-200 my-12"></div>

        {/* High Value Scenarios - Bar Chart */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
          <div className="lg:w-1/3">
             <h3 className="text-2xl font-serif font-bold text-corporate-900 mb-4 flex items-center gap-3">
              <span className="bg-corporate-accent text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              {data.highValueScenarios.title}
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              {data.highValueScenarios.description}
            </p>
             <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="font-semibold text-corporate-900 mb-4">关键洞察</h4>
                <ul className="space-y-3">
                  {data.highValueScenarios.data.slice(0, 3).map((scenario, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-corporate-accent mt-1.5 shrink-0"></div>
                      {scenario.description}
                    </li>
                  ))}
                </ul>
             </div>
          </div>
          
          <div className="lg:w-2/3 w-full h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.highValueScenarios.data}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={120} tick={{fill: '#334155', fontSize: 12, fontWeight: 500}} />
                <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="impact" name="业务价值" fill="#ca8a04" barSize={12} radius={[0, 4, 4, 0]} />
                <Bar dataKey="feasibility" name="技术可行性" fill="#94a3b8" barSize={12} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ChartsSection;