import { useState, useEffect } from 'react';
import { useToast } from '@/store/toast-store';

interface SyncStats {
  totalPending: number;
  totalSynced: number;
  totalFailed: number;
  lastSyncAt: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  firebaseConfigured: boolean;
}

export function CloudSyncSettings() {
  const [projectId, setProjectId] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [forceSyncing, setForceSyncing] = useState(false);
  const { toast } = useToast();

  const refreshStats = () => {
    window.advancesafe?.sync?.getStats().then((s: SyncStats | undefined) => setStats(s ?? null));
  };

  useEffect(() => {
    refreshStats();
    const t = setInterval(refreshStats, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.advancesafe?.sync?.updateConfig({
        projectId: projectId.trim(),
        serviceAccountJson: serviceAccountJson.trim(),
      });
      if (result?.success) {
        toast.success('Firebase config saved');
        refreshStats();
      } else {
        toast.error(result?.error ?? 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      await window.advancesafe?.sync?.retryFailed();
      toast.success('Failed items requeued');
      refreshStats();
    } finally {
      setRetrying(false);
    }
  };

  const handleForceFullSync = async () => {
    setForceSyncing(true);
    try {
      await window.advancesafe?.sync?.forceFullSync();
      toast.success('Full sync triggered');
      refreshStats();
    } finally {
      setForceSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 p-3">
        <p className="mb-1 font-mono text-xs font-semibold text-[var(--text-primary)]">WHERE IS MY DATA STORED?</p>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          All data is stored locally on this PC (SQLite database). Firebase is optional — when configured, a copy is synced to the cloud for remote monitoring. If you don&apos;t set up Firebase, your data stays only on this computer.
        </p>
      </div>
      <div className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)]/30 p-3">
        <p className="mb-3 font-mono text-xs font-semibold text-[var(--text-primary)]">FIREBASE CLOUD SYNC (OPTIONAL)</p>
        <div className="grid gap-2 font-mono text-xs">
          <label className="block">
            <span className="text-[var(--text-secondary)]">Firebase Project ID</span>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="ml-2 w-64 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[var(--text-primary)]"
            />
          </label>
          <label className="block">
            <span className="text-[var(--text-secondary)]">Service Account JSON</span>
            <textarea
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 font-mono text-[10px] text-[var(--text-primary)]"
              placeholder="Paste JSON key from Firebase Console"
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-3 py-1.5 font-mono text-xs text-[var(--accent-cyan)] disabled:opacity-50"
          >
            SAVE & CONNECT
          </button>
        </div>
        <div className="mt-2 font-mono text-[10px]">
          {stats?.firebaseConfigured && stats?.isOnline ? (
            <span className="text-[var(--status-safe)]">CONNECTED TO FIREBASE</span>
          ) : stats?.firebaseConfigured ? (
            <span className="text-[var(--status-warning)]">NOT CONNECTED — check network</span>
          ) : (
            <span className="text-[var(--text-dim)]">Set up Firebase to enable remote monitoring from any browser</span>
          )}
        </div>
      </div>

      {stats && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2 text-left text-[var(--text-secondary)]">Status</th>
                <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2 text-right text-[var(--text-secondary)]">Count</th>
                <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2 text-right text-[var(--text-secondary)]">Last</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-[var(--border-default)] p-2 text-[var(--text-primary)]">Pending</td>
                <td className="border border-[var(--border-default)] p-2 text-right">{stats.totalPending}</td>
                <td className="border border-[var(--border-default)] p-2 text-right">—</td>
              </tr>
              <tr>
                <td className="border border-[var(--border-default)] p-2 text-[var(--status-safe)]">Synced</td>
                <td className="border border-[var(--border-default)] p-2 text-right">{stats.totalSynced}</td>
                <td className="border border-[var(--border-default)] p-2 text-right">{stats.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleTimeString() : '—'}</td>
              </tr>
              <tr>
                <td className="border border-[var(--border-default)] p-2 text-[var(--status-critical)]">Failed</td>
                <td className="border border-[var(--border-default)] p-2 text-right">{stats.totalFailed}</td>
                <td className="border border-[var(--border-default)] p-2 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRetryFailed}
          disabled={retrying || (stats?.totalFailed ?? 0) === 0}
          className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)] disabled:opacity-50"
        >
          RETRY FAILED
        </button>
        <button
          type="button"
          onClick={handleForceFullSync}
          disabled={forceSyncing}
          className="rounded border border-[var(--accent-cyan)]/50 px-3 py-1.5 font-mono text-xs text-[var(--accent-cyan)] disabled:opacity-50"
        >
          FORCE FULL SYNC
        </button>
      </div>
    </div>
  );
}
