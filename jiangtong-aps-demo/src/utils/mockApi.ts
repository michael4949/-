// §12 Mock AI API
//   - Agent 主流程：1500-2000ms 延迟（演示真实感）
//   - Agent #2 (scheme-explainer) Modal 单独 800ms（§6.2.2 原文）
import { AGENT_RESPONSES, buildSchemeExplanation } from '../mock/agentResponses';
import type { WorkOrder } from '../types/workOrder';

export interface MockInvokeReq {
  agentId: string;
  input: unknown;
  context?: unknown;
}

export async function mockAIInvoke(req: MockInvokeReq) {
  const delay =
    req.agentId === 'schedule.scheme-explainer' ? 800
    : 1500 + Math.random() * 500;          // 主流程 1500-2000ms
  await new Promise((r) => setTimeout(r, delay));

  // 个性化生成的 Agent
  if (req.agentId === 'schedule.scheme-explainer') {
    const ctx = req.context as { wo: WorkOrder; resourceName: string };
    return { output: buildSchemeExplanation(ctx), durationMs: delay };
  }

  const preset = (AGENT_RESPONSES as Record<string, unknown>)[req.agentId];
  if (typeof preset === 'function') {
    return { output: (preset as (i: unknown) => unknown)(req.input), durationMs: delay };
  }
  return { output: preset ?? { error: 'No preset for ' + req.agentId }, durationMs: delay };
}
