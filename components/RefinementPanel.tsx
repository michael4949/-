import React, { useState } from 'react';
import { RefinementQuestion } from '../types';
import { Settings, CheckCircle2, Circle, ArrowRight, Loader2 } from 'lucide-react';

interface RefinementPanelProps {
  questions: RefinementQuestion[];
  onSubmit: (answers: Record<string, string[]>) => void;
  isLoading: boolean;
}

const RefinementPanel: React.FC<RefinementPanelProps> = ({ questions, onSubmit, isLoading }) => {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const handleOptionToggle = (questionId: string, value: string, allowMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (allowMultiple) {
        if (current.includes(value)) {
          return { ...prev, [questionId]: current.filter(v => v !== value) };
        }
        return { ...prev, [questionId]: [...current, value] };
      }
      return { ...prev, [questionId]: [value] };
    });
  };

  const isSelected = (questionId: string, value: string) => {
    return (answers[questionId] || []).includes(value);
  };

  const allAnswered = questions.every(q => (answers[q.id] || []).length > 0);

  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-full text-sm font-medium mb-4">
          <Settings className="w-4 h-4" />
          情报需求细化
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">精确定义分析范围</h2>
        <p className="text-slate-500">请回答以下问题，以便系统进行更精准的情报采集与深度分析</p>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-white rounded-xl border border-slate-200/80 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm leading-relaxed">{q.question}</h3>
                {q.allowMultiple && (
                  <span className="text-xs text-slate-400 mt-1 block">可多选</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const selected = isSelected(q.id, opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleOptionToggle(q.id, opt.value, q.allowMultiple)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${
                      selected
                        ? 'bg-cyan-50 border-cyan-300 text-cyan-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {selected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 opacity-40" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={() => onSubmit(answers)}
          disabled={!allAnswered || isLoading}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-40 hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              正在挖掘全网情报...
            </>
          ) : (
            <>
              <ArrowRight className="w-5 h-5" />
              启动情报分析
            </>
          )}
        </button>
        {!allAnswered && (
          <p className="text-sm text-slate-400 mt-3">请完成所有问题后继续</p>
        )}
      </div>
    </div>
  );
};

export default RefinementPanel;
