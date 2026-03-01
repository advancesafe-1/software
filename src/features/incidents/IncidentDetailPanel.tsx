import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import type { IncidentRow } from './incidents-types';

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface IncidentDetailPanelProps {
  incident: IncidentRow | null;
  onClose: () => void;
}

export function IncidentDetailPanel({ incident, onClose }: IncidentDetailPanelProps) {
  const [detail, setDetail] = useState<IncidentRow | null>(incident);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentUser = useAppStore((s) => s.currentUser);
  const userId = currentUser?.id ?? 'system';

  useEffect(() => {
    if (!incident) {
      setDetail(null);
      return;
    }
    setDetail(incident);
    const api = window.advancesafe?.features?.incidents;
    if (!api) return;
    api.getById(incident.id).then((row: unknown) => {
      if (row) setDetail(row as IncidentRow);
    });
  }, [incident?.id]);

  const handleAddNote = async () => {
    if (!detail || !note.trim()) return;
    setSubmitting(true);
    try {
      await window.advancesafe?.features?.incidents?.addNote(detail.id, note.trim(), userId);
      const api = window.advancesafe?.features?.incidents;
      const updated = await api?.getById(detail.id);
      if (updated) setDetail(updated as IncidentRow);
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) return null;

  const severityColor =
    detail.severity === 'critical'
      ? 'var(--status-critical)'
      : detail.severity === 'danger'
        ? 'var(--status-danger)'
        : 'var(--status-warning)';

  return (
    <div className="flex h-full w-[350px] shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] p-3">
        <h3 className="font-rajdhani text-sm font-semibold text-[var(--text-primary)]">Incident details</h3>
        <button type="button" onClick={onClose} className="rounded p-1 font-mono text-xs text-[var(--text-dim)] hover:bg-[var(--bg-tertiary)]">
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          <p className="font-rajdhani font-semibold text-[var(--text-primary)]">{detail.title}</p>
          <p className="font-mono text-xs font-medium uppercase" style={{ color: severityColor }}>{detail.severity}</p>
          <p className="font-mono text-xs text-[var(--text-secondary)]">{detail.description ?? '—'}</p>
          <p className="font-mono text-[10px] text-[var(--text-dim)]">Zone: {detail.zone_name ?? '—'} · Floor: {detail.floor_name ?? '—'}</p>
          {detail.sensor_name != null && (
            <p className="font-mono text-[10px] text-[var(--text-dim)]">Sensor: {detail.sensor_name} ({detail.sensor_type ?? '—'})</p>
          )}
          <div className="border-t border-[var(--border-default)] pt-3">
            <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Timeline</h4>
            <ul className="space-y-1 font-mono text-[10px] text-[var(--text-secondary)]">
              <li>Triggered at {formatTime(detail.triggered_at)}</li>
              {detail.acknowledged_at != null && <li>Acknowledged at {formatTime(detail.acknowledged_at)}</li>}
              {detail.resolved_at != null && <li>Resolved at {formatTime(detail.resolved_at)}</li>}
            </ul>
          </div>
          {detail.resolution_notes != null && detail.resolution_notes.trim() !== '' && (
            <div className="border-t border-[var(--border-default)] pt-3">
              <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Notes</h4>
              <pre className="whitespace-pre-wrap break-words font-mono text-[10px] text-[var(--text-secondary)]">{detail.resolution_notes}</pre>
            </div>
          )}
          <div className="border-t border-[var(--border-default)] pt-3">
            <h4 className="mb-2 font-mono text-xs font-semibold text-[var(--text-primary)]">Add note</h4>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution or follow-up note" maxLength={500} className="mb-2 min-h-[80px] w-full resize-y rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)]" />
            <button type="button" disabled={submitting || !note.trim()} onClick={handleAddNote} className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-1 font-mono text-xs text-[var(--accent-cyan)] disabled:opacity-50">
              {submitting ? 'Saving' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
