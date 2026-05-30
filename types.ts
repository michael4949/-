// Types for the Mnemo console (talks to the `mnemo serve` JSON API).

export type EventType =
  | 'assistant'
  | 'tool_call'
  | 'tool_result'
  | 'skill'
  | 'memory'
  | 'compacted'
  | 'final'
  | 'error';

export interface AgentEvent {
  type: EventType;
  text: string;
  data: Record<string, any>;
  created_at: number;
}

export interface ChatResponse {
  session: string | null;
  answer: string;
  events: AgentEvent[];
}

export interface Health {
  ok: boolean;
  profile?: string;
  provider?: string;
  model?: string;
  claude_configured?: boolean;
}

export interface SkillMeta {
  name: string;
  description: string;
  category: string;
  version: string;
  tags: string[];
  path: string;
}

export interface PromptMemoryScope {
  chars: number;
  cap: number;
  bullets: number;
}

export interface MemoryStats {
  profile: string;
  sessions: number;
  messages: number;
  vectors: number;
  prompt_memory: {
    memory: PromptMemoryScope;
    user: PromptMemoryScope;
  };
  bullets: {
    memory: string[];
    user: string[];
  };
}

export interface SessionRow {
  id: string;
  title: string;
  summary: string;
  channel: string;
  created_at: number;
  updated_at: number;
}

export interface RecallHit {
  text: string;
  score: number;
  kind: string;
  ref_id: string;
}

// One rendered turn in the chat transcript.
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  events?: AgentEvent[];
  pending?: boolean;
}
