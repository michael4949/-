import React, { useState } from 'react';
import { IntelligenceReport, IntelSource, RefinementQuestion } from './types';
import { generateRefinementQuestions, generateIntelligenceReport } from './services/geminiService';
import QueryInput from './components/QueryInput';
import RefinementPanel from './components/RefinementPanel';
import DashboardHeader from './components/DashboardHeader';
import ThreatRadar from './components/ThreatRadar';
import TrendChart from './components/TrendChart';
import EntityNetwork from './components/EntityNetwork';
import TimelinePanel from './components/TimelinePanel';
import FindingsPanel from './components/FindingsPanel';
import SourcesFooter from './components/SourcesFooter';
import { Radar, RotateCcw } from 'lucide-react';

type Step = 'input' | 'refining' | 'dashboard';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('input');
  const [initialInput, setInitialInput] = useState('');
  const [refinementQuestions, setRefinementQuestions] = useState<RefinementQuestion[]>([]);
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [sources, setSources] = useState<IntelSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuerySubmit = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setInitialInput(query);

    try {
      const { questions } = await generateRefinementQuestions(query);
      setRefinementQuestions(questions);
      setStep('refining');
    } catch (err) {
      setError("情报需求分析失败，请检查网络连接后重试。");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefinementSubmit = async (answers: Record<string, string[]>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateIntelligenceReport(initialInput, answers);
      setReport(result.report);
      setSources(result.sources);
      setStep('dashboard');
    } catch (err) {
      setError("情报报告生成失败，请稍后重试。");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setReport(null);
    setSources([]);
    setRefinementQuestions([]);
    setInitialInput('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight">OSINT Analyzer</span>
              <span className="text-xs text-slate-500 ml-2 hidden md:inline">全网情报挖掘分析系统</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {step !== 'input' && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                新任务
              </button>
            )}
            <div className="text-xs text-slate-600 hidden md:block">
              AI-Powered OSINT Platform
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-16">
        {step === 'input' && (
          <div className="min-h-[90vh] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/30" />
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000" />
            <div className="absolute bottom-[-20%] left-[30%] w-[500px] h-[500px] bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000" />

            <QueryInput onSubmit={handleQuerySubmit} isLoading={isLoading} />

            {error && (
              <div className="relative z-10 mt-8 p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm max-w-md text-center">
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'refining' && (
          <div className="min-h-[90vh] bg-slate-50 py-12">
            <RefinementPanel
              questions={refinementQuestions}
              onSubmit={handleRefinementSubmit}
              isLoading={isLoading}
            />
            {error && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm z-50 shadow-xl">
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'dashboard' && report && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <DashboardHeader report={report} />
            <ThreatRadar report={report} />
            <TrendChart report={report} />
            <EntityNetwork report={report} />
            <TimelinePanel report={report} />
            <FindingsPanel report={report} />
            <SourcesFooter sources={sources} report={report} />

            <div className="fixed bottom-6 right-6 z-40">
              <button
                onClick={handleReset}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-5 py-3 rounded-full shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all font-medium flex items-center gap-2 text-sm"
              >
                <Radar className="w-4 h-4" />
                <span>新情报任务</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
