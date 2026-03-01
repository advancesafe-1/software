import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAlertActions } from '@/hooks/useAlertActions';
import { formatIncidentTime } from './formatIncidentTime';
import type { IncidentRow } from './incidents-types';

const severityBorder: Record<string, string> = {
  critical: 'var(--status-critical)',
  danger: 'var(--status-danger)',
  warning: 'var(--status-warning)',
};

interface IncidentCardProps {
  incident: IncidentRow;
  onSelect: (incident: IncidentRow) => void;
  isSelected: boolean;
}

export function IncidentCard({ incident, onSelect, isSelected }: IncidentCardProps) {
  const { acknowledgeAlert, resolveIncident } = useAlertActions();
  const [ackLoading, setAckLoading] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  const borderColor = severityBorder[incident.severity] ?? 'var(--status-warning)';
  const isActive = incident.resolved_at == null && incident.acknowledged_at == null;
  const isAcknowledged = incident.acknowledged_at != null && incident.resolved_at == null;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onSelect(incident);
  };

  const handleAck = async () => {
    setAckLoading(true);
    try {
      await acknowledgeAlert(incident.id);
    } finally {
      setAckLoading(false);
    }
  };

  const handleResolveConfirm = async () => {
    setResolveLoading(true);
    try {
      await resolveIncident(incident.id, resolveNotes.slice(0, 500));
      setShowResolve(false);
      setResolveNotes('');
    } finally {
      setResolveLoading(false);
    }
  };

  const location = [incident.floor_name, incident.zone_name].filter(Boolean).join(' > ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e as unknown as React.MouseEvent)}
      className={
        'cursor-pointer rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-3 transition hover:border-[var(--accent-cyan)]/50 ' +
        (isSelected ? 'ring-1 ring-[var(--accent-cyan)]' : '')
      }
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-rajdhani font-semibold text-[var(--text-primary)]">
            <span
              className="uppercase"
              style={{ color: borderColor }}
            >
              {incident.severity}
            </span>
            <span>{incident.zone_name ?? 'Unknown zone'}</span>
            <span className="font-mono text-xs text-[var(--text-dim)]">
              {formatIncidentTime(incident.triggered_at)}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-[var(--text-secondary)]">{incident.title}</p>
          {incident.sensor_name != null && (
            <p className="mt-0.5 font-mono text-xs text-[var(--text-dim)]">
              {incident.sensor_name} — {incident.description ?? 'Threshold breach'}
            </p>
          )}
          {incident.sensor_type != null && incident.description != null && (
            <p className="font-mono text-xs text-[var(--text-dim)]">{incident.description}</p>
          )}
          <p className="mt-1 font-mono text-[10px] text-[var(--text-dim)]">{location}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isActive && (
            <button
              type="button"
              disabled={ackLoading}
              onClick={(e) => {
                e.stopPropagation();
                handleAck();
              }}
              className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-1 font-mono text-xs text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/20 disabled:opacity-50"
            >
              {ackLoading ? '…' : 'ACKNOWLEDGE'}
            </button>
          )}
          {(isActive || isAcknowledged) && !showResolve && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowResolve(true);
              }}
              className="rounded border border-[var(--status-warning)] bg-[var(--status-warning)]/10 px-2 py-1 font-mono text-xs text-[var(--status-warning)] hover:bg-[var(--status-warning)]/20"
            >
              RESOLVE
            </button>
          )}
          {showResolve && (
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Resolution notes"
                maxLength={500}
                className="min-h-[60px] w-48 resize-y rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={resolveLoading}
                  onClick={handleResolveConfirm}
                  className="rounded bg-[var(--status-safe)]/20 px-2 py-1 font-mono text-xs text-[var(--status-safe)]"
                >
                  {resolveLoading ? '…' : 'CONFIRM RESOLVE'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResolve(false)}
                  className="rounded border border-[var(--border-default)] px-2 py-1 font-mono text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(incident);
            }}
            className="rounded p-1 text-[var(--text-dim)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Open detail"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
