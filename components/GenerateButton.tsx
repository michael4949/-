import React, { useState } from 'react';
import { useStore, store } from '../state/store';
import { COUNTRIES } from '../data/countries';
import { generateMyths, canUseGemini } from '../services/geminiMyths';

export const GenerateButton: React.FC = () => {
  const generating = useStore(s => s.generating);
  const generationError = useStore(s => s.generationError);
  const selectedCountry = useStore(s => s.selectedCountry);
  const lang = useStore(s => s.language);
  const [picker, setPicker] = useState(false);

  const handleGenerate = async (countryIso: string) => {
    setPicker(false);
    store.setGenerating(true);
    store.setGenerationError(null);
    try {
      const fresh = await generateMyths(countryIso, 5);
      store.appendStories(fresh);
    } catch (e: any) {
      store.setGenerationError(e?.message ?? String(e));
    } finally {
      store.setGenerating(false);
    }
  };

  const usable = canUseGemini();

  return (
    <div className="absolute bottom-32 right-4 z-30 flex flex-col items-end gap-2 animate-float-in">
      {generationError && (
        <div className="glass-strong rounded-lg px-3 py-2 text-[11px] text-ember-400 max-w-[260px]">
          {generationError}
        </div>
      )}
      {picker && (
        <div className="glass-strong rounded-2xl p-2 max-h-[280px] overflow-y-auto scroll-fade w-[220px] shadow-2xl shadow-black/40">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-widest text-parchment-200/40 font-display">
            {lang === 'zh' ? '选择文化' : 'Pick a culture'}
          </div>
          {COUNTRIES.map(c => (
            <button
              key={c.iso}
              onClick={() => handleGenerate(c.iso)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-parchment-50/5"
            >
              <span>{c.flag}</span>
              <span className="text-[12px] text-parchment-100 flex-1 truncate">
                {lang === 'zh' ? c.zh : c.en}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {selectedCountry && (
          <button
            disabled={generating || !usable}
            onClick={() => handleGenerate(selectedCountry)}
            className={`glass-strong rounded-full px-4 py-2 text-[11px] tracking-widest font-display transition-colors flex items-center gap-2 ${
              generating
                ? 'text-parchment-200/40 cursor-wait'
                : 'text-parchment-50 hover:bg-parchment-50/10'
            }`}
            style={{ boxShadow: '0 0 14px rgba(139, 92, 246, 0.25)' }}
            title={usable ? '' : 'GEMINI_API_KEY missing'}
          >
            <span className={generating ? 'animate-pulse-soft' : ''}>✨</span>
            {generating
              ? (lang === 'zh' ? '正在召唤神话…' : 'Summoning…')
              : (lang === 'zh' ? '生成 +5 故事' : 'Generate +5')}
          </button>
        )}
        <button
          disabled={generating || !usable}
          onClick={() => setPicker(p => !p)}
          className={`glass-strong rounded-full px-4 py-2 text-[11px] tracking-widest font-display transition-colors flex items-center gap-2 ${
            !usable ? 'text-parchment-200/30 cursor-not-allowed' : 'text-parchment-100 hover:bg-parchment-50/10'
          }`}
          title={usable ? '' : 'GEMINI_API_KEY missing'}
        >
          🔮 {lang === 'zh' ? '召唤神话' : 'Summon Myths'}
        </button>
      </div>
    </div>
  );
};
