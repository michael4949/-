import React from 'react';
import { IntelligenceReport } from '../types';
import { Network, User, Building2, MapPin, Zap, Cpu, ScrollText, Link2 } from 'lucide-react';

interface EntityNetworkProps {
  report: IntelligenceReport;
}

const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  person: User,
  organization: Building2,
  location: MapPin,
  event: Zap,
  technology: Cpu,
  policy: ScrollText,
};

const typeLabels: Record<string, string> = {
  person: '人物',
  organization: '组织',
  location: '地点',
  event: '事件',
  technology: '技术',
  policy: '政策',
};

const typeColors: Record<string, string> = {
  person: 'from-blue-500 to-blue-600',
  organization: 'from-purple-500 to-purple-600',
  location: 'from-green-500 to-green-600',
  event: 'from-orange-500 to-orange-600',
  technology: 'from-cyan-500 to-cyan-600',
  policy: 'from-red-500 to-red-600',
};

const typeBorderColors: Record<string, string> = {
  person: 'border-blue-200 hover:border-blue-300',
  organization: 'border-purple-200 hover:border-purple-300',
  location: 'border-green-200 hover:border-green-300',
  event: 'border-orange-200 hover:border-orange-300',
  technology: 'border-cyan-200 hover:border-cyan-300',
  policy: 'border-red-200 hover:border-red-300',
};

const EntityNetwork: React.FC<EntityNetworkProps> = ({ report }) => {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-2 mb-8">
          <Network className="w-5 h-5 text-cyan-600" />
          <h2 className="text-xl font-bold text-slate-900">关键实体图谱</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.entities.map((entity, idx) => {
            const Icon = typeIcons[entity.type] || Zap;
            const bgColor = typeColors[entity.type] || 'from-slate-500 to-slate-600';
            const borderColor = typeBorderColors[entity.type] || 'border-slate-200';

            return (
              <div
                key={idx}
                className={`bg-white border ${borderColor} rounded-xl p-5 transition-all duration-200 hover:shadow-lg`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{entity.name}</h4>
                      <span className="text-xs text-slate-400 flex-shrink-0">{typeLabels[entity.type]}</span>
                    </div>
                    {/* Relevance Bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${bgColor} rounded-full`}
                          style={{ width: `${entity.relevance}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{entity.relevance}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{entity.description}</p>
                {entity.connections.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Link2 className="w-3 h-3 text-slate-400" />
                    {entity.connections.slice(0, 3).map((conn, ci) => (
                      <span key={ci} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                        {conn}
                      </span>
                    ))}
                    {entity.connections.length > 3 && (
                      <span className="text-xs text-slate-400">+{entity.connections.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EntityNetwork;
