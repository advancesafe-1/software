import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  confirmLabel = 'CONFIRM',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const canConfirm = !confirmText || typed === confirmText;

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-xl">
        <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">{message}</p>
        {confirmText && (
          <div className="mt-3">
            <label className="font-mono text-xs text-[var(--text-secondary)]">
              Type {confirmText} to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]"
              placeholder={confirmText}
            />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`rounded px-3 py-1.5 font-mono text-sm font-medium disabled:opacity-50 ${
              destructive
                ? 'bg-[var(--status-critical)] text-white hover:opacity-90'
                : 'bg-[var(--accent-cyan)] text-[var(--bg-primary)] hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
