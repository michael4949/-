import React, { useEffect, useState } from 'react';
import { BookOpen, Tag, Loader2, X } from 'lucide-react';
import type { SkillMeta } from '../types';
import { getSkill, getSkills } from '../services/mnemoApi';

const SkillsPanel: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [skills, setSkills] = useState<SkillMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    getSkills().then(setSkills).catch((e) => setError(e.message));
  }, [refreshKey]);

  if (error) return <div className="p-4 text-sm text-red-500">加载失败：{error}</div>;
  if (skills === null)
    return (
      <div className="p-6 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
      </div>
    );

  if (skills.length === 0)
    return (
      <div className="p-6 text-center text-sm text-slate-400">
        <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        还没有技能。<br />
        让它完成一个多步骤任务，它会自己写一个 <code className="text-slate-500">SKILL.md</code>。
      </div>
    );

  return (
    <div className="p-3 space-y-2">
      {skills.map((s) => (
        <button
          key={s.name}
          onClick={() => setViewing(s.name)}
          className="w-full text-left rounded-xl border border-slate-200 hover:border-corporate-900/30 hover:shadow-sm transition-all p-3 bg-white group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-corporate-900 text-sm truncate group-hover:text-corporate-900">
              {s.name}
            </span>
            <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 shrink-0">
              {s.category}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
          {s.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {s.tags.slice(0, 4).map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                  <Tag className="w-2.5 h-2.5" />
                  {t}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
      {viewing && <SkillViewer name={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

const SkillViewer: React.FC<{ name: string; onClose: () => void }> = ({ name, onClose }) => {
  const [md, setMd] = useState<string | null>(null);
  useEffect(() => {
    getSkill(name).then((r) => setMd(r.markdown)).catch((e) => setMd(`加载失败：${e.message}`));
  }, [name]);
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-corporate-accent" />
            <span className="font-semibold text-corporate-900">{name} · SKILL.md</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {md === null ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
            </div>
          ) : (
            <pre className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono">{md}</pre>
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-slate-200 text-[11px] text-slate-400">
          这是它从经验里自己写出来的。纯文本文件，可在 Git 里 diff / 审查 —— 学习全程可观测。
        </div>
      </div>
    </div>
  );
};

export default SkillsPanel;
