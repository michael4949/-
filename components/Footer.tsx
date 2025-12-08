import React from 'react';
import { GroundingSource } from '../types';
import { ExternalLink, Quote } from 'lucide-react';

interface FooterProps {
  sources: GroundingSource[];
  companyName: string;
}

const Footer: React.FC<FooterProps> = ({ sources, companyName }) => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          
          <div className="md:w-2/3">
             <h4 className="flex items-center gap-2 font-bold text-corporate-900 mb-6">
              <Quote className="w-5 h-5 text-corporate-accent" />
              <span>数据来源与依据</span>
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sources.length > 0 ? (
                  sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-corporate-accent transition-colors p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{source.title}</span>
                    </a>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm italic">本分析基于内部知识库和方法论模型生成。</p>
                )}
             </div>
          </div>

          <div className="md:w-1/3 text-right">
             <div className="text-2xl font-serif font-bold text-corporate-900 mb-2">AI 战略顾问</div>
             <p className="text-slate-500 text-sm mb-4">赋能 {companyName} 通过 AI 创造价值。</p>
             <div className="text-xs text-slate-400">
               &copy; {new Date().getFullYear()} Generated Report. Confidential.
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;