import React, { useState } from 'react';
import { Search, Radar, Shield, Globe, TrendingUp } from 'lucide-react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

const sampleQueries = [
  "中美芯片战争最新态势与影响分析",
  "OpenAI 与 Google AI 竞争格局深度研判",
  "2025年全球网络安全威胁趋势分析",
  "新能源汽车行业竞争情报全景扫描",
];

const QueryInput: React.FC<QueryInputProps> = ({ onSubmit, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  return (
    <div className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center">
      {/* Title Section */}
      <div className="mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Radar className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
          全网情报挖掘分析系统
        </h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto">
          基于 AI 驱动的开源情报 (OSINT) 分析平台，全维度态势感知与智能研判
        </p>
      </div>

      {/* Feature Tags */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {[
          { icon: Globe, text: '全网采集' },
          { icon: Shield, text: '威胁预警' },
          { icon: TrendingUp, text: '趋势分析' },
          { icon: Search, text: '实体识别' },
        ].map(({ icon: Icon, text }) => (
          <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/5 text-slate-600 rounded-full text-xs font-medium">
            <Icon className="w-3.5 h-3.5" />
            {text}
          </span>
        ))}
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative mb-8">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-300" />
          <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-200/60">
            <Search className="w-5 h-5 text-slate-400 ml-5 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入情报主题，例如：中美科技竞争态势分析..."
              className="flex-1 px-4 py-5 text-base text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="mr-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>分析中</span>
                </>
              ) : (
                <>
                  <Radar className="w-4 h-4" />
                  <span>开始挖掘</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Sample Queries */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">示例情报任务</p>
        <div className="flex flex-wrap justify-center gap-2">
          {sampleQueries.map((sq) => (
            <button
              key={sq}
              onClick={() => { setQuery(sq); }}
              className="px-4 py-2 bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg text-sm border border-slate-200/60 hover:border-slate-300 transition-all duration-200 hover:shadow-sm"
              disabled={isLoading}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QueryInput;
