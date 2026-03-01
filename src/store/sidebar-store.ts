import { create } from 'zustand';

interface SidebarStore {
  expanded: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  expanded: true,
  toggle: () => set((s) => ({ expanded: !s.expanded })),
}));
