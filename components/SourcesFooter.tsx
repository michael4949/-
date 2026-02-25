import React from 'react';
import { IntelSource, IntelligenceReport } from '../types';
import { ExternalLink, Radar, FileText } from 'lucide-react';

interface SourcesFooterProps {
  sources: IntelSource[];
  report: IntelligenceReport;
}

const SourcesFooter: React.FC<SourcesFooterProps> = ({ sources, report }) => {
  return (
    <>
      {/* Conclusion */}
      <section className="py-16 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <FileText className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-6">综合研判结论</h3>
          <p className="text-lg text-slate-300 leading-relaxed">{report.conclusion}</p>
        </div>
      </section>

      {/* Sources */}
      <section className="py-12 bg-slate-900">
        <div className="container mx-auto px-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            情报来源 ({sources.length})
          </h3>
          {sources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                  <span className="text-sm text-slate-400 group-hover:text-slate-200 truncate transition-colors">
                    {source.title}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">暂无关联来源信息</p>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radar className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-slate-400 font-medium">全网情报挖掘分析系统</span>
            </div>
            <p className="text-xs text-slate-600">
              Powered by AI · OSINT Analysis Platform
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default SourcesFooter;
