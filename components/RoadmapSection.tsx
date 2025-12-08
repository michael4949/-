import React from 'react';
import { RoadmapPhase } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface RoadmapSectionProps {
  roadmap: RoadmapPhase[];
}

const RoadmapSection: React.FC<RoadmapSectionProps> = ({ roadmap }) => {
  return (
    <section className="py-20 bg-corporate-900 text-white">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
           <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">战略实施路线图</h2>
           <p className="text-slate-400 max-w-2xl mx-auto">分阶段的 AI 实施方法，确保可持续的价值创造和风险控制。</p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute left-0 right-0 top-12 h-1 bg-slate-700/50"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {roadmap.map((phase, index) => (
              <div key={index} className="relative group">
                {/* Dot */}
                <div className="hidden md:flex absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-8 bg-corporate-900 border-4 border-corporate-accent rounded-full items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(202,138,4,0.5)]">
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-xl hover:bg-slate-800 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-corporate-accent font-bold tracking-widest text-sm uppercase">{phase.phase}</span>
                    <span className="text-slate-400 text-xs bg-slate-900 px-2 py-1 rounded">{phase.timeframe}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{phase.title}</h3>
                  <ul className="space-y-3">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-corporate-accent shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;