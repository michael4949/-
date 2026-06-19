// AIExplainModal 全局控制（Agent #2 / #3 共用）
import { create } from 'zustand';
import type { ReactNode } from 'react';

interface ExplainState {
  open: boolean;
  loading: boolean;
  title: string;
  content: ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  show: (cfg: { title: string; content: ReactNode; primaryAction?: { label: string; onClick: () => void } }) => void;
  showLoading: (title: string) => void;
  close: () => void;
}

export const useExplainStore = create<ExplainState>((set) => ({
  open: false,
  loading: false,
  title: '',
  content: null,
  show: (cfg) => set({ open: true, loading: false, ...cfg }),
  showLoading: (title) => set({ open: true, loading: true, title, content: null, primaryAction: undefined }),
  close: () => set({ open: false }),
}));
