import { useEffect, useState } from 'react';
import { Bell, Cloud, Settings } from 'lucide-react';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useAppStore } from '@/store/app-store';

export function TopBar() {
  const clock = useLiveClock();
  const organization = useAppStore((s) => s.organization);
  const currentUser = useAppStore((s) => s.currentUser);
  const isOnline = useAppStore((s) => s.isOnline);
  const activeIncidents = useAppStore((s) => s.activeIncidents);
  const incidentCount = activeIncidents.length;
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number>(0);

  useEffect(() => {
    window.advancesafe?.sync?.getStats().then((s: { isOnline?: boolean; firebaseConfigured?: boolean } | undefined) => {
      if (s) {
        setIsCloudConnected(Boolean(s.isOnline));
        setFirebaseConfigured(Boolean(s.firebaseConfigured));
      }
    });
    const unsubOnline = window.advancesafe?.sync?.onOnline?.(() => setIsCloudConnected(true));
    const unsubOffline = window.advancesafe?.sync?.onOffline?.(() => setIsCloudConnected(false));
    return () => {
      unsubOnline?.();
      unsubOffline?.();
    };
  }, []);

  useEffect(() => {
    const unsubAvail = window.advancesafe?.updater?.onUpdateAvailable?.((info: { version?: string }) => {
      setUpdateAvailable(info?.version ?? null);
    });
    const unsubDown = window.advancesafe?.updater?.onUpdateDownloaded?.((info: { version?: string }) => {
      setUpdateDownloaded(info?.version ?? null);
      setDownloadPercent(100);
    });
    const unsubProg = window.advancesafe?.updater?.onDownloadProgress?.((info: { percent?: number }) => {
      setDownloadPercent(info?.percent ?? 0);
    });
    return () => {
      unsubAvail?.();
      unsubDown?.();
      unsubProg?.();
    };
  }, []);

  const handleRestartToUpdate = () => {
    if (confirm('Restart AdvanceSafe to install the update now?')) {
      window.advancesafe?.updater?.installUpdate?.();
    }
  };

  const orgName = organization?.name ?? '—';

  return (
    <div className="flex shrink-0 flex-col">
    <header
      className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-4"
      style={{ height: '52px' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-6 shrink-0 rounded-sm"
            style={{ backgroundColor: 'var(--accent-cyan)' }}
          />
          <span className="font-rajdhani text-lg font-bold tracking-wide text-[var(--text-primary)]">
            ADVANCESAFE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 font-mono text-sm">
        <span style={{ color: 'var(--text-secondary)' }}>
          ACTIVE SYSTEM:
        </span>
        <span style={{ color: 'var(--text-mono)' }}>{orgName}</span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: isOnline ? 'var(--status-safe)' : 'var(--status-critical)',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </span>
        {firebaseConfigured && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px]" style={{ color: isCloudConnected ? 'var(--accent-cyan)' : 'var(--status-warning)' }}>
            <Cloud size={12} />
            {isCloudConnected ? 'CLOUD SYNC' : 'LOCAL ONLY'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {currentUser && (
          <>
            <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
              {currentUser.name}
            </span>
            <span
              className="rounded px-2 py-0.5 font-mono text-[10px] uppercase"
              style={{
                backgroundColor: 'var(--accent-cyan-dim)',
                color: 'var(--accent-cyan)',
              }}
            >
              {currentUser.role}
            </span>
          </>
        )}
        {(updateDownloaded || updateAvailable) && (
          <button
            type="button"
            onClick={updateDownloaded ? handleRestartToUpdate : undefined}
            className="rounded px-2 py-0.5 font-mono text-[10px]"
            style={{
              backgroundColor: updateDownloaded ? 'var(--accent-cyan)' : 'var(--status-warning)',
              color: updateDownloaded ? 'var(--bg-primary)' : 'black',
            }}
          >
            {updateDownloaded ? `RESTART TO UPDATE v${updateDownloaded}` : `UPDATE AVAILABLE v${updateAvailable}`}
          </button>
        )}
        <span
          className="font-mono text-sm tabular-nums"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {clock}
        </span>
        <button
          type="button"
          className="relative rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Alerts"
        >
          <Bell size={18} />
          {incidentCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-medium"
              style={{
                backgroundColor: 'var(--status-critical)',
                color: 'var(--bg-primary)',
              }}
            >
              {incidentCount > 99 ? '99+' : incidentCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
        <div
          className="h-8 w-8 rounded-full"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
          }}
        />
      </div>
    </header>
    {downloadPercent > 0 && downloadPercent < 100 && (
      <div className="h-0.5 w-full bg-[var(--bg-tertiary)]">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${downloadPercent}%`, backgroundColor: 'var(--accent-cyan)' }}
        />
      </div>
    )}
    </div>
  );
}
