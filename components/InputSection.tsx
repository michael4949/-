import React, { useState } from 'react';
import { Mic, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface InputSectionProps {
  onGenerate: (input: string) => void;
  isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onGenerate, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onGenerate(input);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto text-center relative z-10 px-4">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-corporate-900 mb-4">
          企业 AI 战略 <span className="text-corporate-accent">构建器</span>
        </h1>
        <p className="text-slate-500 text-lg">
          将简单的一句口语指令，转化为全面的、基于专业方法论的深度调研报告。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-corporate-accent to-indigo-500 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-white rounded-full shadow-2xl flex items-center p-2 border border-slate-200">
          <div className="pl-4 pr-2 text-slate-400">
            <Mic className="w-6 h-6" />
          </div>
          <input
            type="text"
            className="flex-grow bg-transparent p-3 text-lg text-slate-800 focus:outline-none placeholder-slate-400"
            placeholder="例如：'为贵州茅台制定一份基于供应链优化的 AI 战略报告'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`
              rounded-full p-3 px-6 font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap
              ${isLoading 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-corporate-900 text-white hover:bg-corporate-800 shadow-lg hover:shadow-xl translate-y-0 hover:-translate-y-0.5'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>分析需求</span>
              </>
            ) : (
              <>
                <span>开始诊断</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Sample prompts */}
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm text-slate-500">
        <span>试一试:</span>
        <button onClick={() => setInput("为星巴克制定专注于个性化客户体验的 AI 路线图")} className="hover:text-corporate-accent underline decoration-dotted">
          "星巴克客户体验 AI 战略"
        </button>
        <span>或</span>
        <button onClick={() => setInput("分析特斯拉在制造效率方面的 AI 潜力")} className="hover:text-corporate-accent underline decoration-dotted">
          "特斯拉制造效率 AI 分析"
        </button>
      </div>
    </div>
  );
};

export default InputSection;
