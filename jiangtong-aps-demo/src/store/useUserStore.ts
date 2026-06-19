import { create } from 'zustand';

export type Role = '计划员' | '车间主任' | '生产经理' | '财务';

export interface UserState {
  name: string;
  role: Role;
  setRole: (r: Role) => void;
}

// §4.3 Demo 默认 "计划员 张工"
export const useUserStore = create<UserState>((set) => ({
  name: '张工',
  role: '计划员',
  setRole: (role) => set({ role }),
}));

export const ROLES: Role[] = ['计划员', '车间主任', '生产经理', '财务'];
