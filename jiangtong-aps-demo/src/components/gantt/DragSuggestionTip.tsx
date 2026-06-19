// Agent #17 拖拽建议
//   监听 document 级 dragstart/dragover/dragend 事件
//   仅响应来自待排池（application/x-pending-wo）的拖拽，500ms 延迟调用 mockAIInvoke
//   返回轻量建议，跟随鼠标显示紫色悬浮提示
//   零修改 GanttChart.tsx
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { mockAIInvoke } from '../../utils/mockApi';
import type { DragSuggestionOutput } from '../../mock/agentResponses.sprint5';

interface State {
  workOrderId: string;
  mouseX: number;
  mouseY: number;
  suggestion: DragSuggestionOutput | null;
  loading: boolean;
}

export default function DragSuggestionTip() {
  const [state, setState] = useState<State | null>(null);
  const timerRef = useRef<number | null>(null);
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    function clear() {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      requestedRef.current = null;
      setState(null);
    }

    function onDragStart(e: DragEvent) {
      if (!e.dataTransfer || !e.dataTransfer.types.includes('application/x-pending-wo')) return;
      const woId = e.dataTransfer.getData('application/x-pending-wo');
      if (!woId || requestedRef.current === woId) return;

      setState({ workOrderId: woId, mouseX: e.clientX, mouseY: e.clientY, suggestion: null, loading: true });

      // 500ms 延迟后请求建议
      timerRef.current = window.setTimeout(async () => {
        requestedRef.current = woId;
        const { output } = await mockAIInvoke({
          agentId: 'gantt.drag-suggestion',
          input: { workOrderId: woId },
        });
        setState((prev) => prev && prev.workOrderId === woId
          ? { ...prev, suggestion: output as DragSuggestionOutput, loading: false }
          : prev
        );
      }, 500);
    }

    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer || !e.dataTransfer.types.includes('application/x-pending-wo')) return;
      setState((prev) => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : prev);
    }

    function onDragEnd() {
      clear();
    }

    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragend', onDragEnd);
    document.addEventListener('drop', onDragEnd);
    return () => {
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragend', onDragEnd);
      document.removeEventListener('drop', onDragEnd);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!state) return null;

  // 显示位置：鼠标右下偏移
  const left = Math.min(state.mouseX + 14, window.innerWidth - 320);
  const top = Math.min(state.mouseY + 14, window.innerHeight - 80);

  return (
    <div
      className="fixed z-[9998] pointer-events-none animate-modal-in"
      style={{ left, top }}
    >
      <div className="bg-card border border-ai shadow-card rounded-md px-3 py-2 max-w-[300px] flex items-start gap-2">
        {state.loading ? (
          <>
            <Loader2 size={14} className="text-ai animate-spin flex-none mt-0.5" />
            <span className="text-[11.5px] text-ink-dim">AI 正在分析拖拽建议…</span>
          </>
        ) : state.suggestion ? (
          <>
            <Sparkles size={14} className="text-ai flex-none mt-0.5" />
            <div className="text-[11.5px] leading-relaxed">
              <div className="text-ai font-semibold mb-0.5">💡 推荐：{state.suggestion.recommendedResource.name}</div>
              <div className="text-ink-dim">{state.suggestion.recommendedResource.reason}</div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
