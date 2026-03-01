import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IncidentRow } from '@/features/incidents/incidents-types';

const severityColor: Record<string, string> = {
  critical: 'var(--status-critical)',
  danger: 'var(--status-danger)',
  warning: 'var(--status-warning)',
};

export function RecentIncidentLogs() {
  const [items, setItems] = useState<IncidentRow[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const api = window.advancesafe?.features?.incidents;
    if (!api) return;
    api.getAll({ limit: 10, offset: 0 }).then((rows: unknown) => {
      setItems(Array.isArray(rows) ? (rows as IncidentRow[]) : []);
    });
  }, []);

  const formatTs = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="space-y-2">
      {items.map((inc) => (
        <div
          key={inc.id}
          className="flex items-center gap-2 rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-2"
          style={{ borderLeftWidth: '4px', borderLeftColor: severityColor[inc.severity] ?? 'var(--text-dim)' }}
        >
          <span className="min-w-0 flex-1 font-mono text-xs text-[var(--text-primary)]">{inc.title}</span>
          <span className="shrink-0 font-mono text-[10px] text-[var(--text-dim)]">{inc.zone_name ?? '—'}</span>
          <span className="shrink-0 font-mono text-[10px] text-[var(--text-dim)]">{formatTs(inc.triggered_at)}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => navigate('/incidents')}
        className="w-full rounded border border-[var(--accent-cyan)]/50 bg-transparent py-1.5 font-mono text-xs text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
      >
        VIEW ALL LOGS
      </button>
    </div>
  );
}
