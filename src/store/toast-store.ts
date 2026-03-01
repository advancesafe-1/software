import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  add: (type, message) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    const toasts = [...get().toasts, { id, type, message, createdAt: Date.now() }].slice(-MAX_TOASTS);
    set({ toasts });
    setTimeout(() => get().remove(id), AUTO_DISMISS_MS);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast(): {
  toast: { success: (m: string) => void; error: (m: string) => void; warning: (m: string) => void; info: (m: string) => void };
} {
  const add = useToastStore((s) => s.add);
  return {
    toast: {
      success: (m: string) => add('success', m),
      error: (m: string) => add('error', m),
      warning: (m: string) => add('warning', m),
      info: (m: string) => add('info', m),
    },
  };
}
