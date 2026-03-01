import { useState, useEffect } from 'react';

interface StatsRow {
  channel: string;
  status: string;
  count: number;
}

interface QueueStatus {
  pending: number;
  sending: number;
  failed: number;
}

function aggregateByChannel(rows: StatsRow[]): Record<string, { delivered: number; failed: number; pending: number }> {
  const byChannel: Record<string, { delivered: number; failed: number; pending: number }> = {};
  for (const r of rows) {
    if (!byChannel[r.channel]) byChannel[r.channel] = { delivered: 0, failed: 0, pending: 0 };
    if (r.status === 'delivered') byChannel[r.channel].delivered += r.count;
    else if (r.status === 'failed') byChannel[r.channel].failed += r.count;
    else if (r.status === 'pending' || r.status === 'sending') byChannel[r.channel].pending += r.count;
  }
  return byChannel;
}

export function DeliveryMonitor() {
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending: 0, sending: 0, failed: 0 });
  const [retrying, setRetrying] = useState(false);

  const refresh = () => {
    window.advancesafe?.settings?.getDeliveryStats(24).then((d: unknown) => setStats(Array.isArray(d) ? (d as StatsRow[]) : []));
    window.advancesafe?.settings?.getQueueStatus().then((q: unknown) => setQueueStatus((q as QueueStatus) ?? { pending: 0, sending: 0, failed: 0 }));
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      await window.advancesafe?.settings?.retryFailed();
      refresh();
    } finally {
      setRetrying(false);
    }
  };

  const byChannel = aggregateByChannel(stats);
  const channels = ['SMS', 'WhatsApp', 'Push', 'Desktop'].map((c) => (c === 'WhatsApp' ? 'whatsapp' : c === 'Push' ? 'push' : c === 'Desktop' ? 'desktop' : 'sms'));

  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] text-[var(--text-dim)]">Last 24 hours</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr>
              <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2 text-left text-[var(--text-secondary)]">Channel</th>
              <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2 text-right text-[var(--text-secondary)]">Delivered</th>
              <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2 text-right text-[var(--text-secondary)]">Failed</th>
              <th className="border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-2 text-right text-[var(--text-secondary)]">Pending</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((ch) => {
              const row = byChannel[ch] ?? { delivered: 0, failed: 0, pending: 0 };
              return (
                <tr key={ch}>
                  <td className="border border-[var(--border-default)] p-2 text-[var(--text-primary)]">{ch}</td>
                  <td className="border border-[var(--border-default)] p-2 text-right text-[var(--status-safe)]">{row.delivered}</td>
                  <td className="border border-[var(--border-default)] p-2 text-right text-[var(--status-critical)]">{row.failed}</td>
                  <td className="border border-[var(--border-default)] p-2 text-right text-[var(--text-secondary)]">{row.pending}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 font-mono text-[10px] text-[var(--text-dim)]">
        <span>Queue: {queueStatus.pending} pending, {queueStatus.sending} sending, {queueStatus.failed} failed</span>
        <button type="button" onClick={handleRetryFailed} disabled={retrying || queueStatus.failed === 0} className="rounded border border-[var(--accent-cyan)]/50 px-2 py-1 text-[var(--accent-cyan)] disabled:opacity-50">RETRY FAILED</button>
      </div>
    </div>
  );
}
