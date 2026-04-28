'use client';

import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  type: 'admin' | 'employee';
  organizationId?: string;
  organizationName?: string;
}

interface AppStore {
  user: User | null;
  setUser: (user: User | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
