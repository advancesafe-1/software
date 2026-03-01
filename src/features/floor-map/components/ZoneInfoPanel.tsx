import { useNavigate } from 'react-router-dom';
import type { MapZone } from '../floor-map-types';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface ZoneInfoPanelProps {
  zone: MapZone | null;
}

function statusColor(status: MapZone['status']): string {
  switch (status) {
    case 'safe': return 'var(--status-safe)';
    case 'warning': return 'var(--status-warning)';
    case 'danger': return 'var(--status-danger)';
    case 'critical': return 'var(--status-critical)';
    default: return 'var(--text-secondary)';
  }
}

export function ZoneInfoPanel({ zone }: ZoneInfoPanelProps) {
  const navigate = useNavigate();
  if (!zone) return null;
  return (
    <div className="flex w-[300px] shrink-0 flex-col gap-3 border-l border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
      <div>
        <h3 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">{zone.name}</h3>
        <p className="font-mono text-xs text-[var(--text-secondary)]">{zone.zoneType} · {zone.riskLevel}</p>
      </div>
      <div>
        <p className="font-mono text-xs uppercase text-[var(--text-secondary)]">Score</p>
        <p className="font-mono text-3xl font-bold" style={{ color: statusColor(zone.status) }}>
          {zone.score.toFixed(0)}
        </p>
        <StatusBadge status={zone.status} />
      </div>
      <div>
        <p className="font-mono text-xs uppercase text-[var(--text-secondary)]">Sensors</p>
        <ul className="mt-1 space-y-1">
          {zone.sensors.length === 0 ? (
            <li className="text-xs text-[var(--text-muted)]">No sensors</li>
          ) : (
            zone.sensors.slice(0, 6).map((s) => (
              <li key={s.id} className="flex justify-between font-mono text-xs">
                <span className="text-[var(--text-primary)]">{s.name}</span>
                <span className="text-[var(--text-mono)]">
                  {s.value} {s.unit}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      {zone.activeAlerts > 0 && (
        <p className="font-mono text-xs text-[var(--status-critical)]">
          {zone.activeAlerts} active alert(s)
        </p>
      )}
      <button
        type="button"
        onClick={() => navigate('/incidents', { state: { zoneId: zone.id } })}
        className="rounded bg-[var(--accent-cyan)] px-3 py-2 font-mono text-xs font-medium text-[var(--bg-primary)] hover:opacity-90"
      >
        VIEW INCIDENTS
      </button>
    </div>
  );
}
