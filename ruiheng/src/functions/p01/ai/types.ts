/** 智慧获客 · AI 工作过程可见化的共用类型：证据、约束、推理链、追问对话。 */
export type EvSource = '工商变更' | '招投标公告' | '年报' | '舆情' | '行内合作记录' | '上传材料';
export const EV_SOURCES: EvSource[] = ['工商变更', '招投标公告', '年报', '舆情', '行内合作记录', '上传材料'];

export interface Evidence {
  id: string; source: EvSource; title: string; time: string; excerpt: string;
  /** 与当前目标 / 约束的相关度 0..100 */
  relevance: number; tags: string[]; entity?: string; detail?: string;
}

export type CGroup = '目标' | '约束' | '关键人' | '资源' | '时间' | '范围';
export interface Constraint { key: string; label: string; group: CGroup; from: string; on: boolean; value?: number | string }

/** 推理链：证据 → 判断 → 建议，附置信度与反例 / 风险 */
export interface Chain { evidence: string[]; judgement: string; suggestion: string; confidence: number; counter: string }

export interface ApplyAction { id: string; label: string; payload?: string }
export interface Answer { text: string; evidence?: string[]; apply?: ApplyAction }
export interface ChatMsg { role: 'user' | 'ai'; text: string; evidence?: string[]; apply?: ApplyAction; applied?: boolean }

export type Phase = 'idle' | 'retrieving' | 'done';
export type Version = 'A' | 'B';
export const VERSION_LABEL: Record<Version, string> = { A: '稳健型', B: '进取型' };

/** 简单字符串哈希，用于把用户输入映射为确定性种子 */
export const hashStr = (s: string) => { let h = 17; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
