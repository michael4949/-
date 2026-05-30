// Thin client for the Mnemo JSON API.
//
// In dev, Vite proxies `/api` → http://127.0.0.1:8765 (see vite.config.ts), so we
// use a relative base and there is no CORS to worry about. Override with
// VITE_MNEMO_API when hosting the API elsewhere.

import type { ChatResponse, Health, MemoryStats, RecallHit, SessionRow, SkillMeta } from '../types';

const BASE =
  (typeof process !== 'undefined' && (process as any).env && (process as any).env.MNEMO_API) || '';

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<Health> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    if (!r.ok) return { ok: false };
    return (await r.json()) as Health;
  } catch {
    return { ok: false };
  }
}

export const getSkills = () => getJSON<SkillMeta[]>('/api/skills');

export const getSkill = (name: string) =>
  getJSON<{ markdown: string }>(`/api/skills/${encodeURIComponent(name)}`);

export const getMemory = () => getJSON<MemoryStats>('/api/memory');

export const getSessions = () => getJSON<SessionRow[]>('/api/sessions');

export async function chat(message: string, session: string | null): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session }),
  });
  if (!res.ok) throw new Error(`chat failed: ${res.status}`);
  return res.json() as Promise<ChatResponse>;
}

// Semantic recall is exposed through chat in the core; for the console we add a
// dedicated helper that asks the agent to recall, returning the raw note text.
export async function recall(query: string, session: string | null): Promise<RecallHit[]> {
  const resp = await chat(`回忆一下：${query}`, session);
  const hit = resp.events.find((e) => e.type === 'tool_result' && e.data?.tool === 'recall');
  if (!hit) return [];
  // The recall tool returns lines like "[note · 0.58] text"; parse them.
  return hit.text
    .split('\n')
    .map((line) => {
      const m = line.match(/^\[(\w+)\s·\s([\d.]+)\]\s(.*)$/);
      if (!m) return null;
      return { kind: m[1], score: parseFloat(m[2]), text: m[3], ref_id: '' } as RecallHit;
    })
    .filter(Boolean) as RecallHit[];
}
