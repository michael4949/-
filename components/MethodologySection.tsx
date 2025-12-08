import React from 'react';
import { Methodology } from '../types';
import { Target, Puzzle, BarChart3, GitMerge } from 'lucide-react';

interface MethodologySectionProps {
  methodologies: Methodology[];
}

const iconMap: Record<string, React.ReactNode> = {
  chart: <BarChart3 className="w-8 h-8" />,
  process: <GitMerge className="w-8 h-8" />,
  target: <Target className="w-8 h-8" />,
  puzzle: <Puzzle className="w-8 h-8" />,
};

const MethodologySection: React.FC<MethodologySectionProps> = ({ methodologies }) => {
  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h3 className="text-corporate-accent font-bold tracking-widest uppercase text-sm mb-2">我们的方法</h3>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-corporate-900">核心方法论框架</h2>
          <div className="w-24 h-1 bg-corporate-accent mx-auto mt-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {methodologies.map((method, index) => (
            <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-t-4 border-corporate-accent group">
              <div className="mb-6 text-corporate-900 group-hover:text-corporate-accent transition-colors bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center">
                {iconMap[method.iconType] || <Target className="w-8 h-8" />}
              </div>
              <h4 className="text-xl font-bold text-corporate-900 mb-3">{method.title}</h4>
              <p className="text-slate-600 leading-relaxed text-sm">
                {method.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MethodologySection;