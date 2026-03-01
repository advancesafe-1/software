import { useState } from 'react';

interface PasswordConfirmDialogProps {
  open: boolean;
  title: string;
  userId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PasswordConfirmDialog({
  open,
  title,
  userId,
  onConfirm,
  onCancel,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Enter your password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await window.advancesafe?.admin?.users?.verifyPassword?.({ userId, password });
      if (result?.valid) {
        onConfirm();
        setPassword('');
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-xl">
        <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">Enter your password to continue</p>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          className="mt-3 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]"
          placeholder="Password"
          autoComplete="current-password"
        />
        {error && <p className="mt-1 font-mono text-xs text-[var(--status-critical)]">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-sm text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded bg-[var(--accent-cyan)] px-3 py-1.5 font-mono text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
