interface UnsavedChangesDialogProps {
  open: boolean;
  onLeave: () => void;
  onStay: () => void;
}

export function UnsavedChangesDialog({ open, onLeave, onStay }: UnsavedChangesDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-xl">
        <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">Unsaved changes</h2>
        <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">
          You have unsaved changes. Leave anyway?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onStay}
            className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            Stay and save
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded bg-[var(--status-critical)]/80 px-3 py-1.5 font-mono text-sm font-medium text-white hover:opacity-90"
          >
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  );
}
