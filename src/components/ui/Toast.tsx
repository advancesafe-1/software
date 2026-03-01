import { useToastStore, type ToastItem, type ToastType } from '@/store/toast-store';
import { X } from 'lucide-react';

const typeStyles: Record<ToastType, string> = {
  success: 'border-[var(--status-safe)] bg-[var(--status-safe)]/10 text-[var(--status-safe)]',
  error: 'border-[var(--status-critical)] bg-[var(--status-critical)]/10 text-[var(--status-critical)]',
  warning: 'border-[var(--status-warning)] bg-[var(--status-warning)]/10 text-[var(--status-warning)]',
  info: 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]',
};

function ToastItemComponent({ item }: { item: ToastItem }) {
  const remove = useToastStore((s) => s.remove);
  return (
    <div
      className={'flex items-center gap-2 rounded border px-3 py-2 shadow-lg font-mono text-sm ' + typeStyles[item.type]}
      style={{ animation: 'toastSlideIn 0.25s ease-out' }}
      role="alert"
    >
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={() => remove(item.id)}
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 focus:outline-none"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2" aria-live="polite">
      {toasts.map((item) => (
        <ToastItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}
