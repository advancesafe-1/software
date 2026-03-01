import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  performed_at: string;
  new_value_json: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'var(--status-safe)',
  UPDATE: 'var(--accent-cyan)',
  DELETE: 'var(--status-critical)',
  LOGIN: '#3b82f6',
  user_login: '#3b82f6',
  ALERT: 'var(--status-warning)',
};

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 100;

  const load = useCallback(async () => {
    const list = (await window.advancesafe?.admin?.auditLog?.get?.({ limit, offset: page * limit })) ?? [];
    setEntries(list as AuditEntry[]);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading && entries.length === 0) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">AUDIT LOG</h2>
      <p className="mt-1 font-mono text-xs text-[var(--text-dim)]">Recent actions</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-dim)]">
              <th className="py-2 pr-2">Timestamp</th>
              <th className="py-2 pr-2">Action</th>
              <th className="py-2 pr-2">Entity</th>
              <th className="py-2 pr-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-[var(--border-default)]">
                <td className="py-1.5 pr-2 text-[var(--text-dim)]">{new Date(e.performed_at).toLocaleString()}</td>
                <td className="py-1.5 pr-2">
                  <span style={{ color: ACTION_COLORS[e.action] ?? 'var(--text-secondary)' }}>{e.action}</span>
                </td>
                <td className="py-1.5 pr-2 text-[var(--text-secondary)]">{e.entity_type ?? '—'} {e.entity_id ? `(${String(e.entity_id).slice(0, 8)})` : ''}</td>
                <td className="max-w-[200px] truncate py-1.5 pr-2 text-[var(--text-dim)]">{e.new_value_json ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center gap-2 font-mono text-xs text-[var(--text-dim)]">
        <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded border border-[var(--border-default)] px-2 py-1 disabled:opacity-50">Previous</button>
        <span>Page {page + 1}</span>
        <button type="button" onClick={() => setPage((p) => p + 1)} className="rounded border border-[var(--border-default)] px-2 py-1">Next</button>
      </div>
    </Card>
  );
}
