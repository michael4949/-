import React, { useState } from 'react';
import { ReportData, GroundingSource, RefinementQuestion } from './types';
import { generateReport, generateRefinementQuestions } from './services/geminiService';
import InputSection from './components/InputSection';
import HeroSection from './components/HeroSection';
import MethodologySection from './components/MethodologySection';
import ChartsSection from './components/ChartsSection';
import RoadmapSection from './components/RoadmapSection';
import Footer from './components/Footer';
import RefinementForm from './components/RefinementForm';

type Step = 'input' | 'refining' | 'report';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('input');
  const [initialInput, setInitialInput] = useState('');
  const [refinementQuestions, setRefinementQuestions] = useState<RefinementQuestion[]>([]);
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Handle initial input and fetch refinement questions
  const handleInitialSubmit = async (input: string) => {
    setIsLoading(true);
    setError(null);
    setInitialInput(input);
    
    try {
      const { questions } = await generateRefinementQuestions(input);
      setRefinementQuestions(questions);
      setStep('refining');
    } catch (err) {
      setError("无法分析该指令，请稍后重试。");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle refinement answers and generate final report
  const handleRefinementSubmit = async (answers: Record<string, string[]>) => {
    setIsLoading(true);
    setError(null);

    // Map answer values back to labels for better context if needed, 
    // but passing raw values is fine if they are descriptive.
    // For now we pass the answers object directly to the service.

    try {
      const { report, sources } = await generateReport(initialInput, answers);
      setReportData(report);
      setSources(sources);
      setStep('report');
    } catch (err) {
      setError("报告生成失败。请检查您的 API 密钥并重试。");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setReportData(null);
    setRefinementQuestions([]);
    setInitialInput('');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header / Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 bg-corporate-900 rounded-lg flex items-center justify-center">
               <span className="text-white font-serif font-bold text-xl">A</span>
            </div>
            <span className="font-semibold text-corporate-900 tracking-tight">AI Consultant Pro</span>
          </div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-widest hidden md:block">
            企业专业版
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pt-20">
        {step === 'input' && (
          <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden animate-in fade-in duration-500">
             {/* Abstract Background Shapes */}
             <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
             <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
             <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
             
             <InputSection onGenerate={handleInitialSubmit} isLoading={isLoading} />
             
             {error && (
               <div className="mt-8 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm max-w-md text-center z-10">
                 {error}
               </div>
             )}
          </div>
        )}

        {step === 'refining' && (
          <div className="min-h-[80vh] bg-slate-50 py-12">
             <RefinementForm 
               questions={refinementQuestions} 
               onSubmit={handleRefinementSubmit}
               isLoading={isLoading}
             />
             {error && (
               <div className="fixed bottom-10 left-1/2 -translate-x-1/2 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm z-50 shadow-xl">
                 {error}
               </div>
             )}
          </div>
        )}

        {step === 'report' && reportData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <HeroSection data={reportData} />
            <MethodologySection methodologies={reportData.methodologies} />
            <ChartsSection data={reportData} />
            <RoadmapSection roadmap={reportData.roadmap} />
            <section className="bg-slate-50 py-20">
               <div className="container mx-auto px-6 text-center max-w-3xl">
                  <h3 className="text-2xl font-serif font-bold text-corporate-900 mb-6">总结结论</h3>
                  <p className="text-lg text-slate-600 leading-relaxed italic">"{reportData.conclusion}"</p>
               </div>
            </section>
            <Footer sources={sources} companyName={reportData.companyName} />
            
            {/* Sticky "New Report" button for better UX */}
            <div className="fixed bottom-6 right-6 z-40">
              <button 
                onClick={handleReset}
                className="bg-corporate-900 text-white px-6 py-3 rounded-full shadow-2xl hover:bg-corporate-800 transition-colors font-medium flex items-center gap-2"
              >
                <span>新分析</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
