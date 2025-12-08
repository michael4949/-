import React, { useState } from 'react';
import { RefinementQuestion } from '../types';
import { CheckCircle2, Circle, ArrowRight, Loader2 } from 'lucide-react';

interface RefinementFormProps {
  questions: RefinementQuestion[];
  onSubmit: (answers: Record<string, string[]>) => void;
  isLoading: boolean;
}

const RefinementForm: React.FC<RefinementFormProps> = ({ questions, onSubmit, isLoading }) => {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const toggleOption = (questionId: string, value: string, allowMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      
      if (allowMultiple) {
        if (current.includes(value)) {
          return { ...prev, [questionId]: current.filter(v => v !== value) };
        } else {
          return { ...prev, [questionId]: [...current, value] };
        }
      } else {
        return { ...prev, [questionId]: [value] };
      }
    });
  };

  const isFormValid = questions.every(q => (answers[q.id] && answers[q.id].length > 0));

  const handleSubmit = () => {
    if (isFormValid) {
      onSubmit(answers);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif font-bold text-corporate-900 mb-3">战略细化与诊断</h2>
        <p className="text-slate-500">为了生成更具针对性的高价值报告，请补充以下关键信息</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {questions.map((q) => (
          <div key={q.id} className="bg-white p-6 rounded-xl shadow-md border border-slate-100 hover:border-corporate-accent/30 transition-colors">
            <h3 className="font-bold text-corporate-900 mb-4 text-lg">{q.question}</h3>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id]?.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleOption(q.id, opt.value, q.allowMultiple)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group
                      ${isSelected 
                        ? 'bg-corporate-900 text-white border-corporate-900 shadow-lg' 
                        : 'bg-slate-50 text-slate-600 border-transparent hover:bg-white hover:border-slate-200'
                      }
                    `}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-corporate-accent" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 group-hover:text-corporate-accent transition-colors" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
          className={`
            px-10 py-4 rounded-full font-bold text-lg flex items-center gap-3 shadow-xl transition-all
            ${!isFormValid || isLoading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-corporate-accent text-white hover:bg-yellow-600 hover:-translate-y-1'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>正在生成最终报告...</span>
            </>
          ) : (
            <>
              <span>确认并生成全景报告</span>
              <ArrowRight className="w-6 h-6" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RefinementForm;
