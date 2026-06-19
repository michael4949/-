// Sprint 2/3 使用，Sprint 1 仅留 stub
import { AGENT_RESPONSES } from '../mock/agentResponses';

export async function mockAIInvoke(req: { agentId: string; input: unknown; context?: unknown }) {
  const delay = 800 + Math.random() * 1200;
  await new Promise((r) => setTimeout(r, delay));
  const preset = (AGENT_RESPONSES as Record<string, unknown>)[req.agentId];
  return { output: preset ?? { error: 'No preset' }, durationMs: delay };
}
