import React, { useEffect, useState } from 'react';
import { Brain, Database, Loader2, Search, Clock, User } from 'lucide-react';
import type { MemoryStats, RecallHit } from '../types';
import { getMemory, recall } from '../services/mnemoApi';

const MemoryPanel: React.FC<{ refreshKey: number; session: string | null }> = ({ refreshKey, session }) => {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<RecallHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getMemory().then(setStats).catch((e) => setError(e.message));
  }, [refreshKey]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setHits(await recall(query, session));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  if (error) return <div className="p-4 text-sm text-red-500">加载失败：{error}</div>;
  if (!stats)
    return (
      <div className="p-6 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
      </div>
    );

  const m = stats.prompt_memory.memory;
  const u = stats.prompt_memory.user;

  return (
    <div className="p-3 space-y-4">
      {/* counters */}
      <div className="grid grid-cols-3 gap-2">
        <Counter label="会话" value={stats.sessions} icon={<Clock className="w-3.5 h-3.5" />} />
        <Counter label="消息" value={stats.messages} icon={<Database className="w-3.5 h-3.5" />} />
        <Counter label="记忆向量" value={stats.vectors} icon={<Brain className="w-3.5 h-3.5" />} />
      </div>

      {/* capped prompt memory bars */}
      <CapBar title="MEMORY.md（关于任务/世界）" icon={<Brain className="w-3.5 h-3.5" />} used={m.chars} cap={m.cap} count={m.bullets} />
      <CapBar title="USER.md（关于你）" icon={<User className="w-3.5 h-3.5" />} used={u.chars} cap={u.cap} count={u.bullets} />

      {/* bullets */}
      {stats.bullets.memory.length > 0 && (
        <Bullets title="它记住的事" items={stats.bullets.memory} />
      )}
      {stats.bullets.user.length > 0 && <Bullets title="关于你" items={stats.bullets.user} />}

      {/* semantic recall */}
      <div>
        <div className="text-xs font-medium text-slate-500 mb-1.5">语义检索</div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="搜记忆，如「咖啡」"
            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-corporate-900/10"
          />
          <button
            onClick={runSearch}
            disabled={searching}
            className="h-8 w-8 rounded-lg bg-corporate-900 text-white flex items-center justify-center disabled:opacity-40"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        {hits && (
          <div className="mt-2 space-y-1.5">
            {hits.length === 0 && <div className="text-xs text-slate-400">没找到相关记忆。</div>}
            {hits.map((h, i) => (
              <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700">
                <span className="text-[10px] text-slate-400 mr-1.5">
                  {h.kind} · {h.score.toFixed(2)}
                </span>
                {h.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Counter: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
    <div className="text-slate-400 flex justify-center mb-0.5">{icon}</div>
    <div className="text-lg font-semibold text-corporate-900 leading-none">{value}</div>
    <div className="text-[10px] text-slate-400 mt-1">{label}</div>
  </div>
);

const CapBar: React.FC<{ title: string; icon: React.ReactNode; used: number; cap: number; count: number }> = ({
  title,
  icon,
  used,
  cap,
  count,
}) => {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const color = pct > 85 ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span className="flex items-center gap-1.5 text-slate-600">
          {icon}
          {title}
        </span>
        <span className="text-slate-400">
          {count} 条 · {used}/{cap}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const Bullets: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div>
    <div className="text-xs font-medium text-slate-500 mb-1.5">{title}</div>
    <ul className="space-y-1">
      {items.map((b, i) => (
        <li key={i} className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
          {b}
        </li>
      ))}
    </ul>
  </div>
);

export default MemoryPanel;
