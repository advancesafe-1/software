import { useState } from 'react';
import { useToast } from '@/store/toast-store';
import { useAppStore } from '@/store/app-store';

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const result = await window.advancesafe?.admin?.login?.({ username: username.trim(), password });
      if (result?.success && result?.user) {
        setCurrentUser({
          id: result.user.id,
          username: result.user.username,
          name: result.user.fullName ?? result.user.username,
          role: result.user.role,
        });
        toast.success('Signed in');
        onSuccess();
      } else {
        setError(result?.error ?? 'Login failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] p-6">
      <div className="w-full max-w-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-lg">
        <div className="mb-6 flex justify-center">
          <div className="h-12 w-12 rounded-md bg-[var(--accent-cyan)]" />
        </div>
        <h1 className="text-center font-rajdhani text-2xl font-bold text-[var(--text-primary)]">
          ADVANCESAFE
        </h1>
        <p className="mt-1 text-center font-mono text-xs text-[var(--text-dim)]">
          Sign in to continue
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
              placeholder="Username"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--text-secondary)]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] pr-20"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--accent-cyan)]"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && (
            <p className="font-mono text-xs text-[var(--status-critical)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-[var(--accent-cyan)] py-2 font-mono text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
}
